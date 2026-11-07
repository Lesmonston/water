use serde_json::{Value, json};
use std::ffi::OsString;
use std::fs::{self, OpenOptions};
use std::os::windows::ffi::OsStringExt;
use std::os::windows::fs::{FileTimesExt, MetadataExt, OpenOptionsExt};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use water_junk_scan::{
    CancelToken, Condition, ExtrasOptions, ScanObserver, ScanOptions, ScanPlan, ScanProgress,
    ScanResult, extras_from_json, extras_to_json, growth, identity_of, name_template,
    normalize_key, overview_from_json, overview_to_json, result_from_json, result_to_json, scan,
    scan_full, snapshot, snapshot_from_json, snapshot_to_json, space_overview,
};

struct Quiet;

impl ScanObserver for Quiet {
    fn on_progress(&self, _: &ScanProgress) {}
}

struct Fixture {
    dir: PathBuf,
    path: String,
}

impl Fixture {
    fn create() -> Self {
        let parent = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .and_then(Path::parent)
            .expect("worktree")
            .join(".local")
            .join("w2-b-fixtures");
        fs::create_dir_all(&parent).unwrap();
        let name = format!(
            "fx-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        assert!(name.starts_with("fx-"));
        let dir = parent.join(&name);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.to_str().expect("unicode path").to_string();
        assert!(!path.contains(".."));
        Self { dir, path }
    }

    fn join(&self, rel: &str) -> PathBuf {
        let mut path = self.dir.clone();
        for part in rel.split('/') {
            path.push(part);
        }
        path
    }

    fn p(&self, rel: &str) -> String {
        self.join(rel).to_str().expect("unicode path").to_string()
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let parent = self.dir.parent().expect("parent");
        assert_eq!(parent.file_name().unwrap(), "w2-b-fixtures");
        let name = self.dir.file_name().unwrap().to_str().unwrap();
        assert!(name.starts_with("fx-"));
        strip_reparse(&self.dir);
        let _ = fs::remove_dir_all(&self.dir);
    }
}

fn strip_reparse(dir: &Path) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = fs::symlink_metadata(&path) else {
            continue;
        };
        if meta.file_attributes() & 0x400 != 0 {
            let _ = fs::remove_dir(&path);
            let _ = fs::remove_file(&path);
        } else if meta.file_attributes() & 0x10 != 0 {
            strip_reparse(&path);
        }
    }
}

fn write_file(path: &Path, bytes: &[u8]) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, bytes).unwrap();
}

fn set_mtime(path: &Path, when: SystemTime) {
    let file = OpenOptions::new()
        .access_mode(0x100)
        .custom_flags(0x0200_0000)
        .open(path)
        .unwrap();
    file.set_modified(when).unwrap();
}

fn junction(link: &Path, target: &Path) {
    fs::create_dir_all(target).unwrap();
    if let Some(parent) = link.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    let out = Command::new("cmd")
        .args([
            "/c",
            "mklink",
            "/J",
            link.to_str().unwrap(),
            target.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}

fn plan(targets: Vec<Value>, hard_guards: Vec<String>) -> String {
    json!({
        "plan_version": "water.scan-plan.v1",
        "rules_data_version": "2026-10-26.1",
        "created_at": "2026-10-26T04:00:00Z",
        "targets": targets,
        "hard_guards": hard_guards,
    })
    .to_string()
}

fn target(
    id: &str,
    level: &str,
    category: &str,
    match_spec: Value,
    item_type: &str,
    min_age: u64,
    keep: u64,
) -> Value {
    json!({
        "target_id": id,
        "group_id": id,
        "rule_id": id,
        "level": level,
        "category": category,
        "match": match_spec,
        "item_type": item_type,
        "min_age_hours": min_age,
        "keep_newest": keep,
        "in_use": {"mode": "none", "processes": []}
    })
}

fn run(plan_text: &str, now: SystemTime, options: ScanOptions, cancel: &CancelToken) -> ScanResult {
    let parsed = ScanPlan::from_json(plan_text).unwrap();
    scan(&parsed, "scan-test", &options, cancel, &Quiet, now).unwrap()
}

fn run_default(plan_text: &str, now: SystemTime) -> ScanResult {
    run(plan_text, now, ScanOptions::default(), &CancelToken::new())
}

fn item<'a>(result: &'a ScanResult, suffix: &str) -> &'a water_junk_scan::Item {
    result
        .items
        .iter()
        .find(|item| {
            item.path.eq_ignore_ascii_case(suffix)
                || item
                    .path
                    .to_ascii_lowercase()
                    .ends_with(&suffix.to_ascii_lowercase())
        })
        .unwrap_or_else(|| panic!("missing {suffix}"))
}

#[test]
fn scan_plan_contract() {
    m35_plan_templates();
    check_m3d_plan();
    let unknown = r#"{"plan_version":"water.scan-plan.v1","rules_data_version":"2026-10-26.1","created_at":"2026-10-26T04:00:00Z","targets":[],"hard_guards":[],"extra":true}"#;
    assert!(ScanPlan::from_json(unknown).is_err());

    let relative = plan(
        vec![target(
            "t",
            "recommended",
            "custom",
            json!({"kind":"pattern","base":"tmp\\x","segments":["a"]}),
            "dir",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    assert!(ScanPlan::from_json(&relative).is_err());

    let dots = plan(
        vec![target(
            "t",
            "recommended",
            "custom",
            json!({"kind":"pattern","base":r"C:\Users\..\Windows","segments":["a"]}),
            "dir",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    assert!(ScanPlan::from_json(&dots).is_err());

    let bad_seg = plan(
        vec![target(
            "t",
            "recommended",
            "custom",
            json!({"kind":"pattern","base":r"C:\Users\u","segments":["a:b"]}),
            "dir",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    assert!(ScanPlan::from_json(&bad_seg).is_err());

    let empty_seg = plan(
        vec![target(
            "t",
            "recommended",
            "custom",
            json!({"kind":"pattern","base":r"C:\Users\u","segments":[""]}),
            "dir",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    assert!(ScanPlan::from_json(&empty_seg).is_err());

    let nine = vec!["a"; 9];
    let too_many = plan(
        vec![target(
            "t",
            "recommended",
            "custom",
            json!({"kind":"pattern","base":r"C:\Users\u","segments":nine}),
            "dir",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    assert!(ScanPlan::from_json(&too_many).is_err());

    let depth0 = plan(
        vec![target(
            "t",
            "recommended",
            "custom",
            json!({"kind":"marker","root":r"C:\Users\u","marker":{"kind":"dir_name","names":["target"]},"max_depth":0}),
            "dir",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    assert!(ScanPlan::from_json(&depth0).is_err());

    let depth17 = plan(
        vec![target(
            "t",
            "recommended",
            "custom",
            json!({"kind":"marker","root":r"C:\Users\u","marker":{"kind":"dir_name","names":["target"]},"max_depth":17}),
            "dir",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    assert!(ScanPlan::from_json(&depth17).is_err());

    let ok = plan(
        vec![target(
            "t",
            "recommended",
            "custom",
            json!({"kind":"pattern","base":r"C:\Users\u","segments":["AppData","Local","*"]}),
            "dir",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    let parsed = ScanPlan::from_json(&ok).unwrap();
    drop(parsed);
    let mut mode_doc: Value = serde_json::from_str(&ok).unwrap();
    mode_doc["targets"][0]["in_use"] =
        json!({"mode":"runs_from_or_references_item","processes":[]});
    let mode_plan =
        ScanPlan::from_json(&mode_doc.to_string()).expect("SCAN_M3C_MODE: empty names accepted");
    assert_eq!(
        mode_plan.targets[0].in_use.mode, "runs_from_or_references_item",
        "SCAN_M3C_MODE"
    );
    assert!(
        mode_plan.targets[0].in_use.processes.is_empty(),
        "SCAN_M3C_MODE"
    );
    mode_doc["targets"][0]["in_use"]["mode"] = json!("unknown_mode");
    assert!(
        ScanPlan::from_json(&mode_doc.to_string()).is_err(),
        "SCAN_M3C_MODE: unknown rejected"
    );

    let err = ScanPlan::from_json(&dots).unwrap_err();
    assert!(!err.to_string().contains(r"C:\"));
}

#[test]
fn scan_pattern_marker_discovery() {
    m35_clusters_addendum03();
    m35_markers();
    m35_clusters();
    m35_clusters_addendum();
    m35_clusters_addendum02();
    check_m3d_conditions();
    check_unique_bytes();
    let fx = Fixture::create();
    write_file(
        &fx.join("Google/Chrome/User Data/Default/Cache/x.bin"),
        &[1; 40],
    );
    write_file(
        &fx.join("Google/Chrome/User Data/Profile 1/Cache/y.bin"),
        &[2; 20],
    );
    write_file(&fx.join("logs/123/note.txt"), b"abc");
    write_file(&fx.join("logs/abc/skip.txt"), b"no");
    write_file(&fx.join("mixed/File.TXT"), b"case");
    write_file(&fx.join("keep/old/a.txt"), b"o");
    write_file(&fx.join("keep/mid/a.txt"), b"m");
    write_file(&fx.join("keep/new/a.txt"), b"n");
    write_file(&fx.join("tagdir/CACHEDIR.TAG"), &[b't'; 43]);
    write_file(&fx.join("kids/Local State"), b"{}");
    fs::create_dir_all(fx.join("kids/Default")).unwrap();
    fs::create_dir_all(fx.join("proj/node_modules")).unwrap();
    fs::create_dir_all(fx.join("proj/deep/node_modules")).unwrap();
    write_file(&fx.join("disc/covered/z.bin"), &[9; 8]);
    write_file(&fx.join("disc/alpha-k2Hq9x/a.bin"), &[3; 10]);
    write_file(&fx.join("disc/beta-AbC123/a.bin"), &[4; 12]);
    write_file(&fx.join("disc/gamma/a.bin"), &[5; 6]);
    write_file(&fx.join("disc/delta/a.bin"), &[6; 7]);
    write_file(&fx.join("disc/epsilon/a.bin"), &[7; 9]);
    write_file(&fx.join("disc/parent/inner/i.bin"), &[1; 5]);
    write_file(&fx.join("disc/guardhome/vault/v.bin"), &[2; 3]);
    write_file(&fx.join("tagdir/inner/CACHEDIR.TAG"), &[b't'; 43]);
    write_file(&fx.join("nest/node_modules/pkg/node_modules/x.js"), b"x");
    write_file(&fx.join("crash/dump.dmp"), b"dmp1");
    write_file(&fx.join("crash/other.txt"), b"no");

    let now = SystemTime::now();
    let old = UNIX_EPOCH + Duration::from_secs(1_792_458_123);
    let mid = UNIX_EPOCH + Duration::from_secs(1_792_544_523);
    let new = UNIX_EPOCH + Duration::from_secs(1_792_638_245);
    assert!(new < now);
    for (rel, when) in [
        ("keep/old", old),
        ("keep/old/a.txt", old),
        ("keep/mid", mid),
        ("keep/mid/a.txt", mid),
        ("keep/new", new),
        ("keep/new/a.txt", new),
    ] {
        set_mtime(&fx.join(rel), when);
    }

    let text = plan(
        vec![
            target(
                "chrome-cache",
                "recommended",
                "browser",
                json!({"kind":"pattern","base":fx.path,"segments":["Google","Chrome","User Data","*","Cache"]}),
                "dir",
                0,
                0,
            ),
            target(
                "log-digits",
                "recommended",
                "crash_log",
                json!({"kind":"pattern","base":fx.path,"segments":["logs","#"]}),
                "dir",
                0,
                0,
            ),
            target(
                "mixed-file",
                "recommended",
                "app_leftover",
                json!({"kind":"pattern","base":fx.path,"segments":["mixed","file.txt"]}),
                "file",
                0,
                0,
            ),
            target(
                "keep-new",
                "recommended",
                "agent_tool",
                json!({"kind":"pattern","base":fx.path,"segments":["keep","*"]}),
                "dir",
                0,
                1,
            ),
            target(
                "tag-file",
                "recommended",
                "dev_cache",
                json!({"kind":"marker","root":fx.path,"marker":{"kind":"file","name":"CACHEDIR.TAG","min_bytes":43,"max_bytes":1024},"max_depth":2}),
                "dir",
                0,
                0,
            ),
            target(
                "kids-all",
                "recommended",
                "browser",
                json!({"kind":"marker","root":fx.path,"marker":{"kind":"children_all","names":["Local State","Default"]},"max_depth":2}),
                "dir",
                0,
                0,
            ),
            target(
                "dir-name",
                "recommended",
                "dev_cache",
                json!({"kind":"marker","root":fx.path,"marker":{"kind":"dir_name","names":["node_modules"]},"max_depth":2}),
                "dir",
                0,
                0,
            ),
            target(
                "dir-name-deep",
                "recommended",
                "dev_cache",
                json!({"kind":"marker","root":fx.p("nest"),"marker":{"kind":"dir_name","names":["node_modules"]},"max_depth":8}),
                "dir",
                0,
                0,
            ),
            target(
                "covered",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["disc","covered"]}),
                "dir",
                0,
                0,
            ),
            target(
                "inner",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["disc","parent","inner"]}),
                "dir",
                0,
                0,
            ),
            target(
                "vault",
                "protected",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["disc","guardhome","vault"]}),
                "dir",
                0,
                0,
            ),
            target(
                "discover",
                "recommended",
                "unrecognized",
                json!({"kind":"discovery","root":fx.p("disc")}),
                "any",
                0,
                0,
            ),
            target(
                "dumps",
                "recommended",
                "crash_log",
                json!({"kind":"pattern","base":fx.path,"segments":["crash","*.dmp"]}),
                "file",
                0,
                0,
            ),
        ],
        vec![r"C:\".to_string()],
    );

    let result = run_default(&text, now);
    assert_eq!(result.status, "completed");
    assert_eq!(
        item(&result, &fx.p("Google/Chrome/User Data/Default/Cache")).file_count,
        1
    );
    assert_eq!(
        item(&result, &fx.p("Google/Chrome/User Data/Default/Cache"))
            .total_bytes
            .parse::<u64>()
            .unwrap(),
        40
    );
    assert_eq!(
        item(&result, &fx.p("Google/Chrome/User Data/Profile 1/Cache")).file_count,
        1
    );
    assert!(
        result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("logs/123")))
    );
    assert!(
        !result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("logs/abc")))
    );
    assert_eq!(item(&result, &fx.p("mixed/File.TXT")).kind, "file");
    assert_eq!(item(&result, &fx.p("crash/dump.dmp")).kind, "file");
    assert!(
        !result
            .items
            .iter()
            .any(|i| i.path.to_ascii_lowercase().ends_with("\\other.txt"))
    );

    assert_eq!(
        item(&result, &fx.p("keep/new"))
            .ineligible_reason
            .as_deref(),
        Some("keep_newest")
    );
    assert!(item(&result, &fx.p("keep/old")).eligible);
    assert!(item(&result, &fx.p("keep/mid")).eligible);

    assert!(
        result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("tagdir")))
    );
    assert!(
        result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("kids")))
    );
    assert!(
        result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("proj/node_modules")))
    );
    assert!(
        !result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("proj/deep/node_modules")))
    );
    assert!(
        !result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("tagdir/inner"))),
        "marker hit must stop the search inside it"
    );
    assert!(
        result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("nest/node_modules")))
    );
    assert!(
        !result.items.iter().any(|i| i
            .path
            .eq_ignore_ascii_case(&fx.p("nest/node_modules/pkg/node_modules"))),
        "marker hit must stop the search inside it, not max_depth"
    );

    assert!(
        result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("disc/covered")))
    );
    assert_eq!(
        result
            .items
            .iter()
            .filter(|i| i.group_id == "discover")
            .count(),
        5
    );
    assert!(!result
        .items
        .iter()
        .any(|i| i.group_id == "discover" && i.path.eq_ignore_ascii_case(&fx.p("disc/covered"))));
    assert!(
        !result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("disc/parent"))),
        "discovery child that is an ancestor of another target item must be excluded"
    );
    assert!(
        !result
            .items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("disc/guardhome"))),
        "discovery child that is an ancestor of a protected item must be excluded"
    );
    assert_eq!(item(&result, &fx.p("disc/parent/inner")).group_id, "inner");
    assert_eq!(
        item(&result, &fx.p("disc/guardhome/vault")).group_id,
        "vault"
    );

    let discover = result
        .groups
        .iter()
        .find(|g| g.group_id == "discover")
        .unwrap();
    assert!(!discover.top_keys.is_empty());
    assert_eq!(discover.item_count, 5);
    assert_eq!(
        discover.total_bytes, "44",
        "discovery bytes must not double count"
    );
    assert_eq!(
        item(&result, &fx.p("keep/new")).newest_activity,
        "2026-10-22T03:04:05Z"
    );
    assert_eq!(
        item(&result, &fx.p("keep/old")).newest_activity,
        "2026-10-20T01:02:03Z"
    );
}

#[test]
fn scan_overlap_and_guards() {
    m35_rules_names();
    check_single_walk();
    let fx = Fixture::create();
    write_file(&fx.join("overlap/cache/a.bin"), b"aa");
    write_file(&fx.join("tree/secret/note.txt"), b"s");
    write_file(&fx.join("tree/secret/cache/b.bin"), b"bb");
    write_file(&fx.join("hold/keep/x.bin"), b"k");
    write_file(&fx.join("hold/other/y.bin"), b"o");
    fs::create_dir_all(fx.join("repo/.git")).unwrap();
    write_file(&fx.join("repo/src.txt"), b"r");
    write_file(&fx.join("recent/now.txt"), b"n");
    write_file(&fx.join("aged/old.txt"), b"o");
    write_file(&fx.join("临时安装文件/保护/缓存/c.bin"), b"cc");
    write_file(&fx.join("临时安装文件/setup.bin"), b"zz");
    write_file(&fx.join("José/keep/k.bin"), b"k");
    write_file(&fx.join("José/a.bin"), b"a");
    write_file(&fx.join("same/s.bin"), b"s");
    write_file(&fx.join("guarded/g.bin"), b"g");

    let now = SystemTime::now();
    set_mtime(&fx.join("recent"), now);
    set_mtime(&fx.join("recent/now.txt"), now);
    let old = now - Duration::from_secs(48 * 3600);
    set_mtime(&fx.join("aged"), old);
    set_mtime(&fx.join("aged/old.txt"), old);

    let text = plan(
        vec![
            target(
                "rec-cache",
                "recommended",
                "browser",
                json!({"kind":"pattern","base":fx.path,"segments":["overlap","cache"]}),
                "dir",
                0,
                0,
            ),
            target(
                "prot-cache",
                "protected",
                "browser",
                json!({"kind":"pattern","base":fx.path,"segments":["overlap","cache"]}),
                "dir",
                0,
                0,
            ),
            target(
                "tree-root",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["tree"]}),
                "dir",
                0,
                0,
            ),
            target(
                "secret",
                "protected",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["tree","secret"]}),
                "dir",
                0,
                0,
            ),
            target(
                "secret-cache",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["tree","secret","cache"]}),
                "dir",
                0,
                0,
            ),
            target(
                "hold",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["hold"]}),
                "dir",
                0,
                0,
            ),
            target(
                "repo",
                "recommended",
                "dev_cache",
                json!({"kind":"pattern","base":fx.path,"segments":["repo"]}),
                "dir",
                0,
                0,
            ),
            target(
                "recent",
                "recommended",
                "system_temp",
                json!({"kind":"pattern","base":fx.path,"segments":["recent"]}),
                "dir",
                24,
                0,
            ),
            target(
                "aged",
                "recommended",
                "system_temp",
                json!({"kind":"pattern","base":fx.path,"segments":["aged"]}),
                "dir",
                24,
                0,
            ),
            target(
                "zh-root",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["临时安装文件"]}),
                "dir",
                0,
                0,
            ),
            target(
                "zh-prot",
                "protected",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["临时安装文件","保护"]}),
                "dir",
                0,
                0,
            ),
            target(
                "zh-inner",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["临时安装文件","保护","缓存"]}),
                "dir",
                0,
                0,
            ),
            target(
                "jose",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["josé"]}),
                "dir",
                0,
                0,
            ),
            target(
                "same-a",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["same"]}),
                "dir",
                0,
                0,
            ),
            target(
                "same-b",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["same"]}),
                "dir",
                0,
                0,
            ),
            target(
                "guarded",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["guarded"]}),
                "dir",
                0,
                0,
            ),
        ],
        vec![
            r"C:\".to_string(),
            fx.p("hold/keep"),
            fx.p("JOSé/keep"),
            fx.p("guarded"),
        ],
    );

    let result = run_default(&text, now);
    assert_eq!(item(&result, &fx.p("overlap/cache")).group_id, "prot-cache");
    assert_eq!(
        item(&result, &fx.p("overlap/cache"))
            .ineligible_reason
            .as_deref(),
        Some("level_not_cleanable")
    );
    assert!(!item(&result, &fx.p("overlap/cache")).eligible);
    assert_eq!(
        item(&result, &fx.p("tree")).ineligible_reason.as_deref(),
        Some("contains_protected")
    );
    assert_eq!(
        item(&result, &fx.p("tree/secret"))
            .ineligible_reason
            .as_deref(),
        Some("level_not_cleanable")
    );
    assert_eq!(
        item(&result, &fx.p("tree/secret/cache"))
            .ineligible_reason
            .as_deref(),
        Some("inside_protected")
    );
    assert_eq!(
        item(&result, &fx.p("hold")).ineligible_reason.as_deref(),
        Some("hard_guard")
    );
    assert_eq!(
        item(&result, &fx.p("repo")).ineligible_reason.as_deref(),
        Some("repository")
    );
    assert_eq!(
        item(&result, &fx.p("recent")).ineligible_reason.as_deref(),
        Some("too_recent")
    );
    assert!(item(&result, &fx.p("aged")).eligible);
    assert_eq!(result.status, "completed");
    assert_eq!(
        item(&result, &fx.p("临时安装文件"))
            .ineligible_reason
            .as_deref(),
        Some("contains_protected")
    );
    assert_eq!(
        item(&result, &fx.p("临时安装文件/保护"))
            .ineligible_reason
            .as_deref(),
        Some("level_not_cleanable")
    );
    assert_eq!(
        item(&result, &fx.p("临时安装文件/保护/缓存"))
            .ineligible_reason
            .as_deref(),
        Some("inside_protected")
    );
    assert_eq!(
        item(&result, &fx.p("José")).ineligible_reason.as_deref(),
        Some("hard_guard")
    );
    assert_eq!(item(&result, &fx.p("José")).file_count, 2);
    assert_eq!(item(&result, &fx.p("same")).group_id, "same-a");
    assert_eq!(
        result
            .items
            .iter()
            .filter(|i| i.path.eq_ignore_ascii_case(&fx.p("same")))
            .count(),
        1
    );
    assert_eq!(
        item(&result, &fx.p("guarded")).ineligible_reason.as_deref(),
        Some("hard_guard")
    );
}

#[test]
fn scan_reparse_budget_cancel() {
    m35_junctions_overview();
    let fx = Fixture::create();
    write_file(&fx.join("elsewhere/leaf/cache/z.bin"), &[8; 200]);
    junction(&fx.join("base/mid"), &fx.join("elsewhere/leaf"));
    write_file(&fx.join("item/real.txt"), &[1; 100]);
    write_file(&fx.join("outside/big.bin"), &[2; 50_000]);
    junction(&fx.join("item/link"), &fx.join("outside"));
    for i in 0..20 {
        write_file(&fx.join(&format!("budget/f{i}.txt")), b"x");
    }
    fs::create_dir_all(fx.join("ident")).unwrap();
    fs::create_dir_all(fx.join("bud/gitrepo/.git")).unwrap();
    write_file(&fx.join("bud/gitrepo/a.txt"), b"g");
    for i in 0..20 {
        write_file(&fx.join(&format!("bud/many/f{i}.txt")), b"m");
    }

    let now = SystemTime::now();
    let text = plan(
        vec![
            target(
                "via-link",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.p("base"),"segments":["mid","cache"]}),
                "dir",
                0,
                0,
            ),
            target(
                "item-root",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["item"]}),
                "dir",
                0,
                0,
            ),
            target(
                "budget",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.path,"segments":["budget"]}),
                "dir",
                0,
                0,
            ),
        ],
        vec![r"C:\".to_string()],
    );

    let result = run_default(&text, now);
    assert_eq!(result.status, "completed");
    assert!(
        !result.items.iter().any(|i| i.group_id == "via-link"),
        "SCAN_NO_FOLLOW: intermediate junction must not produce items"
    );
    assert!(
        result
            .issues
            .iter()
            .any(|i| i.code == "reparse_skipped" && i.group_id == "via-link"),
        "SCAN_NO_FOLLOW: intermediate junction must be recorded as reparse_skipped"
    );

    let measured = item(&result, &fx.p("item"));
    let bytes = measured.total_bytes.parse::<u64>().unwrap();
    assert!(
        bytes < 1000,
        "SCAN_NO_FOLLOW: junction target bytes must not be counted, got {bytes}"
    );
    assert_eq!(
        measured.file_count, 1,
        "SCAN_NO_FOLLOW: junction target files must not be counted"
    );

    let tight = run(
        &text,
        now,
        ScanOptions {
            max_entries: 4,
            max_seconds: 900,
        },
        &CancelToken::new(),
    );
    assert_eq!(tight.status, "partial");
    assert!(tight.issues.iter().any(|i| i.code == "budget_exhausted"));
    assert!(
        tight
            .issues
            .iter()
            .filter(|i| i.code == "budget_exhausted")
            .all(|i| i.count == 1)
    );

    let bud = plan(
        vec![
            target(
                "gitrepo",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.p("bud"),"segments":["gitrepo"]}),
                "dir",
                0,
                0,
            ),
            target(
                "many",
                "recommended",
                "custom",
                json!({"kind":"pattern","base":fx.p("bud"),"segments":["many"]}),
                "dir",
                0,
                0,
            ),
        ],
        vec![r"C:\".to_string()],
    );
    let full = run_default(&bud, now);
    assert_eq!(full.status, "completed");
    assert_eq!(
        item(&full, &fx.p("bud/gitrepo"))
            .ineligible_reason
            .as_deref(),
        Some("repository")
    );
    let cut = run(
        &bud,
        now,
        ScanOptions {
            max_entries: 8,
            max_seconds: 900,
        },
        &CancelToken::new(),
    );
    assert_eq!(cut.status, "partial");
    assert!(
        !cut.items
            .iter()
            .any(|i| i.eligible && i.path.eq_ignore_ascii_case(&fx.p("bud/gitrepo"))),
        "directory with .git must not become cleanable after the budget stops"
    );
    assert!(
        !cut.items
            .iter()
            .any(|i| i.path.eq_ignore_ascii_case(&fx.p("bud/many"))),
        "item whose walk was cut by the budget must not be output"
    );
    let exhausted: Vec<_> = cut
        .issues
        .iter()
        .filter(|i| i.code == "budget_exhausted")
        .collect();
    assert!(!exhausted.is_empty());
    assert!(
        exhausted.iter().all(|i| i.count == 1),
        "budget_exhausted must be counted once per group"
    );

    let cancel = CancelToken::new();
    cancel.cancel();
    let stopped = run(&text, now, ScanOptions::default(), &cancel);
    assert_eq!(stopped.status, "cancelled");

    let ident = fx.p("ident");
    let first = identity_of(&ident).unwrap();
    assert_eq!(first.volume_serial.len(), 8);
    assert!(first.volume_serial.chars().all(|c| c.is_ascii_hexdigit()));
    assert_eq!(first.file_id.len(), 32);
    assert!(first.file_id.chars().all(|c| c.is_ascii_hexdigit()));
    let again = identity_of(&ident).unwrap();
    assert_eq!(first.file_id, again.file_id);
    fs::remove_dir(fx.join("ident")).unwrap();
    fs::create_dir(fx.join("ident")).unwrap();
    let rebuilt = identity_of(&ident).unwrap();
    assert_ne!(
        first.file_id, rebuilt.file_id,
        "recreated directory must have a new identity"
    );
}

#[test]
fn scan_snapshot_growth_keys() {
    m35_sizes_compat();
    check_m3d_growth();
    assert_eq!(
        normalize_key("marketplace-upgrade-k2Hq9x"),
        "marketplace-upgrade-*"
    );
    assert_eq!(normalize_key("rb123-x-chrome-AbC123"), "rb#-x-chrome-*");
    assert_eq!(normalize_key("claude"), "claude");
    assert_eq!(
        normalize_key("{3F2504E0-4F89-11D3-9A0C-0305E82C3301}"),
        "{guid}"
    );
    assert_eq!(
        normalize_key("vscode-stable-system-x64-a1b2c3"),
        "vscode-stable-system-x#-*"
    );
    assert_eq!(
        normalize_key("3F2504E0-4F89-11D3-9A0C-0305E82C3301"),
        "{guid}"
    );
    assert_eq!(
        normalize_key("3f2504e0-4f89-11d3-9a0c-0305e82c3301"),
        "{guid}"
    );
    assert_eq!(normalize_key("tmp"), "tmp");
    assert_eq!(normalize_key("7f3a9c2e1b4d"), "*");

    let fx = Fixture::create();
    write_file(&fx.join("disc/one/a.bin"), b"1");
    let now = SystemTime::now();
    let text = plan(
        vec![target(
            "g",
            "recommended",
            "unrecognized",
            json!({"kind":"discovery","root":fx.path}),
            "any",
            0,
            0,
        )],
        vec![r"C:\".to_string()],
    );
    let result = run_default(&text, now);
    let snap = snapshot(&result);
    let encoded = snapshot_to_json(&snap);
    let round = snapshot_from_json(&encoded).unwrap();
    assert_eq!(round.scan_id, result.scan_id);
    let encoded_result = result_to_json(&result);
    assert!(result_from_json(&encoded_result).is_ok());
    let round_result = result_from_json(&encoded_result).expect("SCAN_M3C_COMPAT: new result");
    assert_eq!(round_result, result, "SCAN_M3C_COMPAT: new fields survive");
    let mut legacy: Value = serde_json::from_str(&encoded_result).unwrap();
    for row in legacy["items"].as_array_mut().unwrap() {
        row.as_object_mut().unwrap().remove("unique_bytes");
    }
    for row in legacy["groups"].as_array_mut().unwrap() {
        row.as_object_mut().unwrap().remove("unique_bytes");
        row.as_object_mut().unwrap().remove("eligible_unique_bytes");
    }
    let legacy_result =
        result_from_json(&legacy.to_string()).expect("SCAN_M3C_COMPAT: absent fields default");
    for row in &legacy_result.items {
        assert_eq!(
            row.unique_bytes, row.total_bytes,
            "SCAN_M3C_COMPAT: item default"
        );
    }
    for row in &legacy_result.groups {
        assert_eq!(
            row.unique_bytes, row.total_bytes,
            "SCAN_M3C_COMPAT: group default"
        );
        assert_eq!(
            row.eligible_unique_bytes, row.eligible_bytes,
            "SCAN_M3C_COMPAT: eligible default"
        );
    }
    legacy["items"][0]["unique_bytes"] = Value::Null;
    assert!(
        result_from_json(&legacy.to_string()).is_err(),
        "SCAN_M3C_COMPAT: null is not absent"
    );
    legacy["items"][0]["unique_bytes"] = json!(1);
    assert!(
        result_from_json(&legacy.to_string()).is_err(),
        "SCAN_M3C_COMPAT: numeric bytes rejected"
    );

    let prev = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"a","taken_at":"2026-10-26T00:00:00Z","groups":{"g":{"total_bytes":"100","item_count":1,"newest_activity":"2026-10-26T00:30:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    let cur19 = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"b","taken_at":"2026-10-27T00:00:00Z","groups":{"g":{"total_bytes":"200","item_count":20,"newest_activity":"2026-10-26T23:30:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    let g19 = growth(&prev, &cur19);
    assert_eq!(g19.len(), 1);
    assert_eq!(g19[0].count_delta, 19);
    assert!(!g19[0].leak_suspect);

    let cur20 = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"c","taken_at":"2026-10-27T00:00:00Z","groups":{"g":{"total_bytes":"200","item_count":21,"newest_activity":"2026-10-26T23:30:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    let g20 = growth(&prev, &cur20);
    assert_eq!(g20[0].count_delta, 20);
    assert!(g20[0].leak_suspect);

    let hour = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"d","taken_at":"2026-10-26T00:30:00Z","groups":{"g":{"total_bytes":"200","item_count":21,"newest_activity":"2026-10-26T00:20:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    assert!(growth(&prev, &hour).is_empty());

    let day_prev = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"e","taken_at":"2026-10-25T00:00:00Z","groups":{"g":{"total_bytes":"0","item_count":1,"newest_activity":"2026-10-20T00:00:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    let day_cur = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"f","taken_at":"2026-10-26T00:00:00Z","groups":{"g":{"total_bytes":"1073741824","item_count":2,"newest_activity":"2026-10-20T00:00:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    let gday = growth(&day_prev, &day_cur);
    assert_eq!(gday[0].days, 1.0);
    assert_eq!(gday[0].bytes_per_day, "1073741824");
    assert!(gday[0].leak_suspect);

    let under = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"g","taken_at":"2026-10-26T00:00:00Z","groups":{"g":{"total_bytes":"1073741823","item_count":2,"newest_activity":"2026-10-20T00:00:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    let gunder = growth(&day_prev, &under);
    assert!(!gunder[0].leak_suspect);

    let one_hour = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"h","taken_at":"2026-10-26T01:00:00Z","groups":{"g":{"total_bytes":"44739343","item_count":1,"newest_activity":"2026-10-20T00:00:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    assert!(
        growth(&prev, &one_hour).is_empty(),
        "SCAN_M3D_GROWTH: one hour"
    );
    let twenty_five_hours = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"h25","taken_at":"2026-10-27T01:00:00Z","groups":{"g":{"total_bytes":"1118481175","item_count":1,"newest_activity":"2026-10-20T00:00:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    let ghour = growth(&prev, &twenty_five_hours);
    assert_eq!(ghour.len(), 1);
    assert_eq!(ghour[0].bytes_delta, "1118481075");
    assert_eq!(
        ghour[0].bytes_per_day, "1073741832",
        "bytes_per_day must divide by the exact interval"
    );
    assert!(ghour[0].leak_suspect);
}

fn m3d_targets(root: &str) -> Vec<Value> {
    let node = json!({"kind":"dir_name","names":["node_modules"]});
    let browser = json!({"kind":"children_all","names":["Local State","Default"]});
    vec![
        target(
            "node-main",
            "confirm",
            "custom",
            json!({
                "kind":"marker","root":root,"marker":node,"max_depth":6,
                "conditions":[
                    {"kind":"parent_has_file","name":"package.json"},
                    {"kind":"parent_has_other_entries","except":["package.json","package-lock.json","npm-shrinkwrap.json","yarn.lock","pnpm-lock.yaml","bun.lock","bun.lockb","node_modules"]},
                    {"kind":"no_ancestor_suffix","suffixes":[".asar.unpacked"]}
                ]
            }),
            "dir",
            0,
            0,
        ),
        target(
            "node-fallback",
            "advisory",
            "custom",
            json!({
                "kind":"marker","root":root,"marker":node,"max_depth":6,"fallback_for":"node-main"
            }),
            "dir",
            0,
            0,
        ),
        target(
            "browser-main",
            "confirm",
            "custom",
            json!({
                "kind":"marker","root":root,"marker":browser,"max_depth":8,
                "conditions":[{"kind":"path_has_any","names":["ms-playwright","playwright","puppeteer","selenium","webdriver","chromedriver","cypress"]}]
            }),
            "dir",
            0,
            0,
        ),
        target(
            "browser-fallback",
            "advisory",
            "custom",
            json!({
                "kind":"marker","root":root,"marker":browser,"max_depth":8,"fallback_for":"browser-main"
            }),
            "dir",
            0,
            0,
        ),
    ]
}

fn check_m3d_plan() {
    assert_eq!(
        serde_json::from_value::<Condition>(
            json!({"kind":"parent_has_file","name":"package.json"})
        )
        .unwrap(),
        Condition::ParentHasFile {
            name: "package.json".to_string()
        },
        "SCAN_M3D_PLAN: exported Condition type"
    );
    let targets = m3d_targets(r"C:\m3d");
    let valid = plan(targets.clone(), vec![]);
    let parsed = ScanPlan::from_json(&valid).expect("SCAN_M3D_PLAN: conditions and fallbacks");
    assert_eq!(
        serde_json::to_value(&parsed.targets).unwrap(),
        json!(targets),
        "SCAN_M3D_PLAN: roundtrip"
    );
    let legacy = target(
        "legacy",
        "confirm",
        "custom",
        json!({
            "kind":"marker","root":r"C:\m3d","marker":{"kind":"dir_name","names":["node_modules"]},"max_depth":6
        }),
        "dir",
        0,
        0,
    );
    let old = ScanPlan::from_json(&plan(vec![legacy.clone()], vec![])).unwrap();
    assert_eq!(
        serde_json::to_value(&old.targets[0]).unwrap(),
        legacy,
        "SCAN_M3D_PLAN: old target unchanged"
    );
    assert_eq!(
        serde_json::to_string(&old.targets[0].match_spec).unwrap(),
        r#"{"kind":"marker","root":"C:\\m3d","marker":{"kind":"dir_name","names":["node_modules"]},"max_depth":6}"#,
        "SCAN_M3D_PLAN: old marker bytes unchanged"
    );

    let reject = |rows: Vec<Value>, reason: &str| {
        assert!(
            matches!(
                ScanPlan::from_json(&plan(rows, vec![])),
                Err(water_junk_scan::ScanError::InvalidPlan)
            ),
            "SCAN_M3D_PLAN: reject {reason}"
        );
    };
    let condition_case = |conditions: Value| {
        let mut rows = targets.clone();
        rows[0]["match"]["conditions"] = conditions;
        rows
    };
    for conditions in [
        json!([]),
        json!(null),
        json!({}),
        json!([{"kind":"unknown","name":"a"}]),
        json!([{"kind":"parent_has_file","name":"a","extra":true}]),
        json!([{"kind":"parent_has_file","except":["a"]}]),
        json!([{"kind":"parent_has_file","name":"a"},{"kind":"parent_has_file","name":"b"}]),
        json!(vec![json!({"kind":"parent_has_file","name":"a"}); 5]),
    ] {
        reject(
            condition_case(conditions),
            "condition shape, count or duplicate kind",
        );
    }
    for bad in [
        "".to_string(),
        ".".into(),
        "..".into(),
        "x".repeat(65),
        "a b".into(),
        "a\t".into(),
        "\u{7f}".into(),
        "包".into(),
    ]
    .into_iter()
    .chain(['\\', '/', ':', '*', '?', '"', '<', '>', '|'].map(|c| format!("a{c}b")))
    {
        reject(
            condition_case(json!([{"kind":"parent_has_file","name":bad}])),
            "invalid name",
        );
        for (kind, field) in [
            ("parent_has_other_entries", "except"),
            ("no_ancestor_suffix", "suffixes"),
            ("path_has_any", "names"),
        ] {
            reject(
                condition_case(json!([{"kind":kind,field:[bad]}])),
                "invalid array string",
            );
        }
    }
    for (kind, field) in [
        ("parent_has_other_entries", "except"),
        ("no_ancestor_suffix", "suffixes"),
        ("path_has_any", "names"),
    ] {
        for array in [
            json!([]),
            json!(["a", "A"]),
            json!((0..17).map(|n| format!("n{n}")).collect::<Vec<_>>()),
        ] {
            reject(
                condition_case(json!([{"kind":kind,field:array}])),
                "array bounds and ASCII duplicates",
            );
        }
        let legal = condition_case(
            json!([{"kind":kind,field:(0..16).map(|n|format!("n{n}")).collect::<Vec<_>>() }]),
        );
        assert!(
            ScanPlan::from_json(&plan(legal, vec![])).is_ok(),
            "SCAN_M3D_PLAN: sixteen strings accepted"
        );
    }
    let mut four = targets.clone();
    four[0]["match"]["conditions"]
        .as_array_mut()
        .unwrap()
        .push(json!({"kind":"path_has_any","names":["x".repeat(64)]}));
    assert!(
        ScanPlan::from_json(&plan(four, vec![])).is_ok(),
        "SCAN_M3D_PLAN: four kinds and 64 ASCII characters"
    );
    let mut noncustom = targets.clone();
    noncustom[0]["category"] = json!("dev_cache");
    reject(noncustom, "conditions outside custom");
    for mut wrong in [
        json!({"kind":"pattern","base":r"C:\m3d","segments":["*"]}),
        json!({"kind":"discovery","root":r"C:\m3d"}),
    ] {
        wrong["conditions"] = targets[0]["match"]["conditions"].clone();
        let mut rows = targets.clone();
        rows[0]["match"] = wrong;
        reject(rows, "conditions outside marker");
    }
    for reference in [
        json!("missing"),
        json!("node-fallback"),
        json!("browser-fallback"),
        json!(""),
        json!(null),
        json!(1),
    ] {
        let mut rows = targets.clone();
        rows[1]["match"]["fallback_for"] = reference;
        reject(rows, "invalid fallback reference");
    }
    let mut rows = targets.clone();
    rows[1]["match"]["conditions"] = json!([{"kind":"parent_has_file","name":"a"}]);
    reject(rows, "fallback has conditions");
    let mut rows = targets.clone();
    rows[0]["match"]
        .as_object_mut()
        .unwrap()
        .remove("conditions");
    reject(rows, "main has no conditions");
    for wrong in [
        json!({"kind":"pattern","base":r"C:\m3d","segments":["*"]}),
        json!({"kind":"discovery","root":r"C:\m3d"}),
    ] {
        let mut rows = targets.clone();
        rows[0]["match"] = wrong;
        reject(rows, "main is not marker");
    }
    for (field, value) in [
        ("root", json!(r"C:\other")),
        ("marker", json!({"kind":"dir_name","names":["other"]})),
        ("max_depth", json!(5)),
    ] {
        let mut rows = targets.clone();
        rows[1]["match"][field] = value;
        reject(rows, "fallback mismatch");
    }
    let mut rows = targets.clone();
    let mut duplicate = rows[1].clone();
    duplicate["target_id"] = json!("another-fallback");
    rows.push(duplicate);
    reject(rows, "two fallbacks for one target");
    let mut rows = targets.clone();
    rows[1]["match"]["root"] = json!(r"c:\M3D");
    assert!(
        ScanPlan::from_json(&plan(rows, vec![])).is_ok(),
        "SCAN_M3D_PLAN: roots compare ASCII case insensitively"
    );
}

fn check_m3d_conditions() {
    let fx = Fixture::create();
    for rel in [
        "root/proj/package.json",
        "root/proj/src/a.js",
        "root/proj/node_modules/x/index.js",
        "root/proj/node_modules/x/node_modules/y/index.js",
        "root/npmglobal/claude.cmd",
        "root/npmglobal/node_modules/x/package.json",
        "root/npmglobal/node_modules/x/src/a.js",
        "root/npmglobal/node_modules/x/node_modules/y/index.js",
        "root/pkg/package.json",
        "root/pkg/package-lock.json",
        "root/pkg/node_modules/x/index.js",
        "root/app/resources/app.asar.unpacked/package.json",
        "root/app/resources/app.asar.unpacked/lib/a.js",
        "root/app/resources/app.asar.unpacked/node_modules/x/index.js",
        "root/tests/playwright-profile-1/Local State",
        "root/tests/playwright-profile-1/Default/cache",
        "root/app2/EBWebView/Local State",
        "root/app2/EBWebView/Default/cache",
        "root/MIXED/PACKAGE.JSON",
        "root/MIXED/SRC/a.js",
        "root/MIXED/NODE_MODULES/x/index.js",
        "root/PACKAGEONLY/PACKAGE.JSON",
        "root/PACKAGEONLY/PACKAGE-LOCK.JSON",
        "root/PACKAGEONLY/NODE_MODULES/x/index.js",
        "root/UPPER.ASAR.UNPACKED/PACKAGE.JSON",
        "root/UPPER.ASAR.UNPACKED/LIB/a.js",
        "root/UPPER.ASAR.UNPACKED/NODE_MODULES/x/index.js",
        "root/PLAYWRIGHT/OtherProfile/Local State",
        "root/PLAYWRIGHT/OtherProfile/Default/cache",
        "root/dir-package/package.json/child",
        "root/dir-package/src/a.js",
        "root/dir-package/node_modules/x/index.js",
    ] {
        write_file(&fx.join(rel), b"x");
    }
    let now = SystemTime::now();
    let targets = m3d_targets(&fx.p("root"));
    let text = plan(targets.clone(), vec![]);
    ScanPlan::from_json(&text).expect("SCAN_M3D_CONDITIONS: fixture plan");
    let result = run_default(&text, now);
    assert_eq!(
        result.status, "completed",
        "SCAN_M3D_CONDITIONS: ordinary fixture"
    );
    let expected = [
        ("proj/node_modules", "node-main"),
        ("npmglobal/node_modules", "node-fallback"),
        ("pkg/node_modules", "node-fallback"),
        (
            "app/resources/app.asar.unpacked/node_modules",
            "node-fallback",
        ),
        ("tests/playwright-profile-1", "browser-main"),
        ("app2/EBWebView", "browser-fallback"),
        ("MIXED/NODE_MODULES", "node-main"),
        ("PACKAGEONLY/NODE_MODULES", "node-fallback"),
        ("UPPER.ASAR.UNPACKED/NODE_MODULES", "node-fallback"),
        ("PLAYWRIGHT/OtherProfile", "browser-main"),
        ("dir-package/node_modules", "node-fallback"),
    ];
    assert_eq!(
        result.items.len(),
        expected.len(),
        "SCAN_M3D_CONDITIONS: no nested hits"
    );
    for (rel, owner) in expected {
        let path = fx.p(&format!("root/{rel}"));
        let row = result
            .items
            .iter()
            .find(|i| i.path.eq_ignore_ascii_case(&path))
            .expect("SCAN_M3D_CONDITIONS: expected directory");
        assert_eq!(row.group_id, owner, "SCAN_M3D_CONDITIONS: owner for {rel}");
        assert_eq!(
            row.unique_bytes, row.total_bytes,
            "SCAN_M3D_CONDITIONS: ordinary files"
        );
        assert!(
            row.identity.is_some(),
            "SCAN_M3D_CONDITIONS: measured identity"
        );
        if owner.ends_with("fallback") {
            assert!(!row.eligible, "SCAN_M3D_CONDITIONS: fallback advisory");
            assert_eq!(
                row.ineligible_reason.as_deref(),
                Some("level_not_cleanable"),
                "SCAN_M3D_CONDITIONS: fallback level"
            );
        }
    }
    let unconditional = targets
        .iter()
        .filter(|t| t["match"].get("fallback_for").is_none())
        .cloned()
        .map(|mut t| {
            t["match"].as_object_mut().unwrap().remove("conditions");
            t
        })
        .collect::<Vec<_>>();
    let reference = run_default(&plan(unconditional.clone(), vec![]), now);
    assert_eq!(
        result.visited_entries, reference.visited_entries,
        "SCAN_M3D_CONDITIONS: one traversal with fallback"
    );
    for row in &result.items {
        let original = reference
            .items
            .iter()
            .find(|i| i.path.eq_ignore_ascii_case(&row.path))
            .expect("SCAN_M3D_CONDITIONS: reference hit");
        assert_eq!(
            (
                &row.total_bytes,
                &row.unique_bytes,
                row.file_count,
                &row.newest_activity,
                &row.identity
            ),
            (
                &original.total_bytes,
                &original.unique_bytes,
                original.file_count,
                &original.newest_activity,
                &original.identity
            ),
            "SCAN_M3D_CONDITIONS: unchanged measurement"
        );
    }
    let mut no_self_exception = targets.clone();
    no_self_exception[0]["match"]["conditions"][1]["except"]
        .as_array_mut()
        .unwrap()
        .pop();
    let excludes_self = run_default(&plan(no_self_exception, vec![]), now);
    assert_eq!(
        excludes_self.items, result.items,
        "SCAN_M3D_CONDITIONS: candidate itself never counts as another entry"
    );
    let no_fallback = targets
        .iter()
        .filter(|t| t["match"].get("fallback_for").is_none())
        .cloned()
        .collect();
    let dropped = run_default(&plan(no_fallback, vec![]), now);
    assert_eq!(
        dropped.visited_entries, reference.visited_entries,
        "SCAN_M3D_CONDITIONS: rejected hit still covers subtree once"
    );
    assert_eq!(
        dropped.items.len(),
        4,
        "SCAN_M3D_CONDITIONS: rejected nodes and descendants absent"
    );
    assert!(
        dropped
            .items
            .iter()
            .all(|i| !i.path.to_ascii_lowercase().contains("npmglobal")),
        "SCAN_M3D_CONDITIONS: no fallback means no nested hit"
    );

    let isolated = m3d_targets(&fx.p("root/npmglobal"));
    let isolated_rejected = run_default(&plan(vec![isolated[0].clone()], vec![]), now);
    let mut isolated_plain = isolated[0].clone();
    isolated_plain["match"]
        .as_object_mut()
        .unwrap()
        .remove("conditions");
    let isolated_reference = run_default(&plan(vec![isolated_plain], vec![]), now);
    assert!(
        isolated_rejected.items.is_empty(),
        "SCAN_M3D_CONDITIONS: rejected sole target does not search descendants"
    );
    assert_eq!(
        isolated_rejected.visited_entries, isolated_reference.visited_entries,
        "SCAN_M3D_CONDITIONS: sole target still measures once without fallback"
    );

    let root_node = fx.p("root/proj/node_modules");
    let root_targets: Vec<_> = m3d_targets(&root_node).into_iter().take(2).collect();
    let mut other_at_root = root_targets.clone();
    other_at_root[0]["match"]["conditions"] =
        json!([{"kind":"parent_has_other_entries","except":["unrelated"]}]);
    let other_root_result = run_default(&plan(other_at_root, vec![]), now);
    assert_eq!(
        other_root_result.items[0].group_id, "node-fallback",
        "SCAN_M3D_CONDITIONS: root parent entries unavailable"
    );
    let root_result = run_default(&plan(root_targets, vec![]), now);
    assert_eq!(
        root_result.items.len(),
        1,
        "SCAN_M3D_CONDITIONS: root match stops descendants"
    );
    assert_eq!(
        root_result.items[0].group_id, "node-fallback",
        "SCAN_M3D_CONDITIONS: root has no traversed parent"
    );

    let mut aged = targets.clone();
    aged[0]["level"] = json!("protected");
    aged[0]["min_age_hours"] = json!(0);
    aged[1]["level"] = json!("recommended");
    aged[1]["min_age_hours"] = json!(48);
    aged[1]["in_use"] = json!({"mode":"runs_from_or_references_item","processes":["tool.exe"]});
    let aged_result = run_default(&plan(aged.clone(), vec![]), now);
    for row in aged_result
        .items
        .iter()
        .filter(|i| i.group_id == "node-fallback")
    {
        assert_eq!(
            row.ineligible_reason.as_deref(),
            Some("too_recent"),
            "SCAN_M3D_CONDITIONS: fallback own age and level"
        );
    }
    let group = aged_result
        .groups
        .iter()
        .find(|g| g.group_id == "node-fallback")
        .unwrap();
    assert_eq!(
        serde_json::to_value(&group.in_use).unwrap(),
        aged[1]["in_use"],
        "SCAN_M3D_CONDITIONS: fallback own in_use"
    );
    aged[1]["min_age_hours"] = json!(0);
    aged[1]["keep_newest"] = json!(1);
    let kept = run_default(&plan(aged, vec![]), now);
    let fallback_rows: Vec<_> = kept
        .items
        .iter()
        .filter(|i| i.group_id == "node-fallback")
        .collect();
    assert_eq!(
        fallback_rows
            .iter()
            .filter(|i| i.ineligible_reason.as_deref() == Some("keep_newest"))
            .count(),
        1,
        "SCAN_M3D_CONDITIONS: fallback own keep_newest"
    );
    assert_eq!(
        fallback_rows.iter().filter(|i| i.eligible).count(),
        fallback_rows.len() - 1,
        "SCAN_M3D_CONDITIONS: remaining fallback items eligible"
    );

    let only_project = m3d_targets(&fx.p("root/proj"));
    let empty = run_default(&plan(only_project, vec![]), now);
    assert!(
        empty
            .groups
            .iter()
            .filter(|g| g.group_id.ends_with("fallback"))
            .all(|g| g.item_count == 0 && g.total_bytes == "0"),
        "SCAN_M3D_CONDITIONS: empty fallback groups retained"
    );
    let missing = m3d_targets(&fx.p("missing")).into_iter().take(2).collect();
    let absent = run_default(&plan(missing, vec![]), now);
    assert_eq!(
        absent.visited_entries, 0,
        "SCAN_M3D_CONDITIONS: no fallback traversal"
    );
    for id in ["node-main", "node-fallback"] {
        assert!(
            absent
                .issues
                .iter()
                .any(|i| i.group_id == id && i.code == "base_missing" && i.count == 1),
            "SCAN_M3D_CONDITIONS: fallback inherits missing base"
        );
    }

    struct Recorded(std::sync::Mutex<Vec<String>>);
    impl ScanObserver for Recorded {
        fn on_progress(&self, p: &ScanProgress) {
            self.0.lock().unwrap().push(p.group_id.clone());
        }
    }
    let recorded = Recorded(std::sync::Mutex::new(Vec::new()));
    scan(
        &ScanPlan::from_json(&text).unwrap(),
        "m3d-progress",
        &ScanOptions::default(),
        &CancelToken::new(),
        &recorded,
        now,
    )
    .unwrap();
    assert!(
        recorded
            .0
            .lock()
            .unwrap()
            .iter()
            .all(|id| !id.ends_with("fallback")),
        "SCAN_M3D_CONDITIONS: no fallback progress"
    );
    let mut reordered = targets;
    reordered.swap(0, 1);
    let fallback_first = run_default(&plan(reordered, vec![]), now);
    assert_eq!(
        fallback_first.visited_entries, result.visited_entries,
        "SCAN_M3D_CONDITIONS: fallback before primary does not search"
    );
    for row in &fallback_first.items {
        assert_eq!(
            row.group_id,
            item(&result, &row.path).group_id,
            "SCAN_M3D_CONDITIONS: routing independent of fallback order"
        );
    }
}

fn check_m3d_growth() {
    let make = |at: &str, bytes: &str, count: u64, newest: &str| {
        snapshot_from_json(&json!({
        "snapshot_version":"water.scan-snapshot.v1","scan_id":"m3d","taken_at":at,
        "groups":{"g":{"total_bytes":bytes,"item_count":count,"newest_activity":newest,"top_keys":[]}}
    }).to_string()).unwrap()
    };
    let prev = make("2026-10-26T00:00:00Z", "100", 1, "2026-10-25T00:00:00Z");
    let short = make("2026-10-26T23:00:00Z", "200", 21, "2026-10-26T22:30:00Z");
    assert!(
        growth(&prev, &short).is_empty(),
        "SCAN_M3D_GROWTH: 23 hours is too short"
    );
    for (bytes, count, newest, suspect) in [
        ("50", 21, "2026-10-26T23:30:00Z", false),
        ("100", 21, "2026-10-26T23:30:00Z", false),
        ("200", 21, "2026-10-26T23:30:00Z", true),
        ("200", 20, "2026-10-26T23:30:00Z", false),
        ("200", 21, "2026-10-25T23:59:59Z", false),
        ("200", 21, "2026-10-26T00:00:00Z", true),
        ("1073741924", 1, "2026-10-20T00:00:00Z", true),
        ("1073741923", 1, "2026-10-20T00:00:00Z", false),
    ] {
        let cur = make("2026-10-27T00:00:00Z", bytes, count, newest);
        let rows = growth(&prev, &cur);
        assert_eq!(rows.len(), 1, "SCAN_M3D_GROWTH: exactly 24 hours");
        assert_eq!(
            rows[0].leak_suspect, suspect,
            "SCAN_M3D_GROWTH: bytes={bytes}, count={count}, newest={newest}"
        );
        assert_eq!(
            rows[0].bytes_delta,
            (bytes.parse::<i128>().unwrap() - 100).to_string(),
            "SCAN_M3D_GROWTH: signed delta"
        );
    }
}

fn hard_link(link: &Path, original: &Path) {
    fs::create_dir_all(link.parent().unwrap()).unwrap();
    let output = Command::new("cmd")
        .args([
            "/c",
            "mklink",
            "/H",
            link.to_str().unwrap(),
            original.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "SCAN_M3C_UNIQUE: create synthetic hard link"
    );
}

fn check_unique_bytes() {
    let fx = Fixture::create();
    write_file(&fx.join("hard/original.bin"), &vec![1; 1024 * 1024]);
    hard_link(&fx.join("hard/link1.bin"), &fx.join("hard/original.bin"));
    hard_link(
        &fx.join("hard/sub/link2.bin"),
        &fx.join("hard/original.bin"),
    );
    hard_link(
        &fx.join("hard/sub/link3.bin"),
        &fx.join("hard/original.bin"),
    );
    write_file(&fx.join("plain/a.bin"), b"plain");
    for n in 0..700 {
        write_file(&fx.join(&format!("wide/entry-{n:04}.bin")), b"x");
    }
    hard_link(&fx.join("separate/link.bin"), &fx.join("hard/original.bin"));
    let mut t = target(
        "unique",
        "recommended",
        "dev_cache",
        json!({"kind":"pattern","base":fx.path,"segments":["*"]}),
        "dir",
        0,
        0,
    );
    t["in_use"] = json!({"mode":"runs_from_or_references_item","processes":[]});
    let now = SystemTime::now();
    let r = run_default(&plan(vec![t], vec![]), now);
    let hard = item(&r, &fx.p("hard"));
    assert_eq!(
        item(&r, &fx.p("wide")).file_count,
        700,
        "SCAN_M3C_UNIQUE: all enumeration buffers"
    );
    assert_eq!(
        item(&r, &fx.p("wide")).unique_bytes,
        "700",
        "SCAN_M3C_UNIQUE: distinct IDs across buffers"
    );
    assert_eq!(
        hard.total_bytes, "4194304",
        "SCAN_M3C_UNIQUE: logical bytes"
    );
    assert_eq!(
        hard.unique_bytes, "1048576",
        "SCAN_M3C_UNIQUE: per-item IDs"
    );
    assert_eq!(hard.file_count, 4, "SCAN_M3C_UNIQUE: keep logical count");
    assert_eq!(
        item(&r, &fx.p("plain")).unique_bytes,
        "5",
        "SCAN_M3C_UNIQUE: plain bytes"
    );
    assert_eq!(
        item(&r, &fx.p("plain")).unique_bytes,
        item(&r, &fx.p("plain")).total_bytes,
        "SCAN_M3C_UNIQUE: no links"
    );
    assert_eq!(
        item(&r, &fx.p("separate")).unique_bytes,
        "1048576",
        "SCAN_M3C_UNIQUE: no cross-item dedup"
    );
    assert_eq!(
        r.groups[0].in_use.mode, "runs_from_or_references_item",
        "SCAN_M3C_MODE: forwarded"
    );
    for g in &r.groups {
        let members: Vec<_> = r
            .items
            .iter()
            .filter(|i| i.group_id == g.group_id)
            .collect();
        let all: u64 = members
            .iter()
            .map(|i| i.unique_bytes.parse::<u64>().unwrap())
            .sum();
        let eligible: u64 = members
            .iter()
            .filter(|i| i.eligible)
            .map(|i| i.unique_bytes.parse::<u64>().unwrap())
            .sum();
        assert_eq!(
            g.unique_bytes,
            all.to_string(),
            "SCAN_M3C_UNIQUE: group sum"
        );
        assert_eq!(
            g.eligible_unique_bytes,
            eligible.to_string(),
            "SCAN_M3C_UNIQUE: eligible sum"
        );
    }
    let marker = target(
        "marker",
        "advisory",
        "dev_cache",
        json!({"kind":"marker","root":fx.path,"marker":{"kind":"dir_name","names":["hard"]},"max_depth":2}),
        "dir",
        0,
        0,
    );
    let marked = run_default(&plan(vec![marker], vec![]), now);
    assert_eq!(
        marked.items[0].unique_bytes, "1048576",
        "SCAN_M3C_UNIQUE: shared marker measurement"
    );
    assert_eq!(
        marked.groups[0].eligible_unique_bytes, "0",
        "SCAN_M3C_UNIQUE: ineligible group"
    );
    let round =
        result_from_json(&result_to_json(&r)).expect("SCAN_M3C_COMPAT: real dedup roundtrip");
    assert_eq!(round, r, "SCAN_M3C_COMPAT: differing bytes survive");
}

fn check_single_walk() {
    let fx = Fixture::create();
    write_file(&fx.join("root/tag/CACHEDIR.TAG"), &[1; 43]);
    write_file(&fx.join("root/tag/inner/CACHEDIR.TAG"), &[1; 43]);
    write_file(&fx.join("root/tag/node_modules/a.bin"), b"a");
    write_file(
        &fx.join("root/tag/node_modules/pkg/node_modules/b.bin"),
        b"bb",
    );
    write_file(&fx.join("root/target/a.bin"), b"build");
    write_file(&fx.join("root/deeper/target/a.bin"), b"too deep");
    write_file(&fx.join("root/worktree/.git"), b"gitdir");
    write_file(&fx.join("root/.git/node_modules/skip.bin"), b"skip");
    write_file(&fx.join("outside/target/skip.bin"), b"outside");
    junction(&fx.join("root/link"), &fx.join("outside"));
    write_file(
        &fx.join("root").join(OsString::from_wide(&[0xd800])),
        b"invalid Unicode",
    );
    let specs = vec![
        target(
            "tag",
            "recommended",
            "dev_cache",
            json!({"kind":"marker","root":fx.p("root"),"marker":{"kind":"file","name":"CACHEDIR.TAG","min_bytes":43,"max_bytes":1024},"max_depth":4}),
            "dir",
            0,
            0,
        ),
        target(
            "children",
            "confirm",
            "dev_cache",
            json!({"kind":"marker","root":fx.p("root"),"marker":{"kind":"children_all","names":["CACHEDIR.TAG","node_modules"]},"max_depth":2}),
            "dir",
            0,
            0,
        ),
        target(
            "modules",
            "recommended",
            "dev_cache",
            json!({"kind":"marker","root":fx.p("root"),"marker":{"kind":"dir_name","names":["node_modules"]},"max_depth":8}),
            "dir",
            0,
            0,
        ),
        target(
            "build",
            "recommended",
            "dev_cache",
            json!({"kind":"marker","root":fx.p("root"),"marker":{"kind":"dir_name","names":["target"]},"max_depth":1}),
            "dir",
            0,
            0,
        ),
        target(
            "worktree",
            "advisory",
            "dev_cache",
            json!({"kind":"marker","root":fx.p("root"),"marker":{"kind":"file","name":".git","min_bytes":0,"max_bytes":4096},"max_depth":4}),
            "dir",
            0,
            0,
        ),
    ];
    let now = SystemTime::now();
    let combined = run_default(&plan(specs.clone(), vec![]), now);
    let mut expected_items = Vec::new();
    let mut expected_issues = Vec::new();
    let mut expected_groups = Vec::new();
    for spec in &specs {
        let single = run_default(&plan(vec![spec.clone()], vec![]), now);
        // The children target is more conservative at the same path as tag.
        if spec["target_id"] == "tag" {
            let mut empty = single.groups[0].clone();
            empty.item_count = 0;
            empty.eligible_count = 0;
            empty.total_bytes = "0".into();
            empty.eligible_bytes = "0".into();
            empty.unique_bytes = "0".into();
            empty.eligible_unique_bytes = "0".into();
            empty.disk_bytes = Some("0".into());
            empty.eligible_disk_bytes = Some("0".into());
            empty.file_count = 0;
            empty.oldest_activity = None;
            empty.newest_activity = None;
            expected_groups.push(empty);
        } else {
            expected_groups.extend(single.groups);
            expected_items.extend(single.items);
        }
        expected_issues.extend(single.issues);
    }
    for (n, row) in expected_items.iter_mut().enumerate() {
        row.item_id = format!("i-{:06}", n + 1);
    }
    expected_issues.sort_by(|a, b| a.group_id.cmp(&b.group_id).then(a.code.cmp(&b.code)));
    assert_eq!(
        combined.items, expected_items,
        "SCAN_M3C_SINGLE_WALK: items, order, sizes, guards"
    );
    assert_eq!(
        combined.groups, expected_groups,
        "SCAN_M3C_SINGLE_WALK: groups and merging"
    );
    assert_eq!(
        combined.issues, expected_issues,
        "SCAN_M3C_SINGLE_WALK: per-target issues"
    );
    assert_eq!(
        combined.status, "partial",
        "SCAN_M3C_SINGLE_WALK: invalid Unicode is partial"
    );
    for (group, count) in [
        ("tag", 2),
        ("children", 2),
        ("modules", 1),
        ("build", 1),
        ("worktree", 2),
    ] {
        assert!(
            combined.issues.iter().any(|issue| issue.group_id == group
                && issue.code == "unrepresentable_name"
                && issue.count == count),
            "SCAN_M3C_SINGLE_WALK: logical listing issues for {group}"
        );
    }
    let facts: Vec<_> = combined
        .items
        .iter()
        .map(|i| (i.group_id.as_str(), i.total_bytes.as_str(), i.file_count))
        .collect();
    assert_eq!(
        facts,
        vec![
            ("children", "89", 4),
            ("modules", "3", 2),
            ("build", "5", 1),
            ("worktree", "6", 1)
        ],
        "SCAN_M3C_SINGLE_WALK: independent expected facts"
    );
    assert_eq!(combined.items.len(), 4, "SCAN_M3C_SINGLE_WALK: exact hits");
    assert_eq!(
        item(&combined, &fx.p("root/tag")).group_id,
        "children",
        "SCAN_M3C_SINGLE_WALK: conservative overlap"
    );
    assert!(
        combined
            .items
            .iter()
            .all(|i| !i.path.eq_ignore_ascii_case(&fx.p("root/tag/inner"))
                && !i.path.eq_ignore_ascii_case(&fx.p("root/deeper/target"))
                && !i.path.eq_ignore_ascii_case(&fx.p("root/.git/node_modules"))),
        "SCAN_M3C_SINGLE_WALK: independent stopping"
    );
    let mut entries = 0;
    let mut dirs = vec![fx.join("root")];
    while let Some(dir) = dirs.pop() {
        for child in fs::read_dir(dir).unwrap() {
            let child = child.unwrap();
            entries += 1;
            let meta = fs::symlink_metadata(child.path()).unwrap();
            if meta.is_dir() && meta.file_attributes() & 0x400 == 0 {
                dirs.push(child.path());
            }
        }
    }
    assert!(
        combined.visited_entries <= entries + 5,
        "SCAN_M3C_SINGLE_WALK: {} > {} + 5",
        combined.visited_entries,
        entries
    );
}

fn m35_full(
    text: &str,
    now: SystemTime,
    extras: &ExtrasOptions,
) -> (ScanResult, water_junk_scan::ScanExtras) {
    scan_full(
        &ScanPlan::from_json(text).expect("SCAN_M35_PLAN: fixture plan"),
        "m35",
        &ScanOptions::default(),
        extras,
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap()
}

fn m35_marker_target(
    id: &str,
    root: &str,
    marker: Value,
    conditions: Option<Value>,
    kind: &str,
) -> Value {
    let mut matcher = json!({"kind":"marker","root":root,"marker":marker,"max_depth":8});
    if let Some(conditions) = conditions {
        matcher["conditions"] = conditions;
    }
    target(id, "recommended", "custom", matcher, kind, 0, 0)
}

fn m35_times(path: &Path, created: SystemTime, modified: SystemTime) {
    let path = m35_verbatim(path);
    let f = OpenOptions::new()
        .access_mode(0x100)
        .custom_flags(0x0200_0000)
        .open(path)
        .unwrap();
    f.set_times(
        std::fs::FileTimes::new()
            .set_created(created)
            .set_modified(modified),
    )
    .unwrap();
}

fn m35_verbatim(path: &Path) -> PathBuf {
    if path.to_string_lossy().starts_with("\\\\?\\") {
        path.to_path_buf()
    } else {
        PathBuf::from(format!("\\\\?\\{}", path.display()))
    }
}

fn m35_old_tree(root: &Path, when: SystemTime) {
    for child in fs::read_dir(m35_verbatim(root)).unwrap() {
        let child = child.unwrap();
        let meta = fs::symlink_metadata(m35_verbatim(&child.path())).unwrap();
        if meta.file_attributes() & 0x400 != 0 {
            continue;
        }
        if meta.is_dir() {
            m35_old_tree(&child.path(), when);
        } else {
            m35_times(&child.path(), when, when);
        }
    }
    m35_times(root, when, when);
}

fn m35_plan_templates() {
    for tail in ["7mzKFP", "bjVTM3", "Nig1h3", "0gAvKc", "AbC123", "A00001"] {
        for file in [false, true] {
            let name = format!("verify-{tail}{}", if file { ".tmp" } else { "" });
            let expected = if file {
                "verify-<r6>.tmp"
            } else {
                "verify-<r6>"
            };
            assert_eq!(
                name_template(&name, file).as_deref(),
                Some(expected),
                "SCAN_M35_TEMPLATE: M13 random suffix {name}"
            );
        }
    }
    for tail in ["color0", "step01", "271590", "q0uodi", "abcdef", "ABCDEF"] {
        for file in [false, true] {
            let name = format!("verify-{tail}{}", if file { ".tmp" } else { "" });
            assert_eq!(
                name_template(&name, file),
                None,
                "SCAN_M35_TEMPLATE: M13 ordinary suffix {name}"
            );
        }
    }
    for (name, file, expected) in [
        ("verify-7mzKFP", false, "verify-<r6>"),
        ("verify-bjVTM3", false, "verify-<r6>"),
        ("verify-Nig1h3", false, "verify-<r6>"),
        (
            "marketplace-upgrade-0gAvKc",
            false,
            "marketplace-upgrade-<r6>",
        ),
        ("pgtest-20261006-055219-104832", false, "pgtest-<d>"),
        ("apk_43181b86.apk", true, "apk_<h>.apk"),
        ("build-3f907897", false, "build-<h>"),
        ("rb123-x-chrome-AbC123", false, "rb#-x-chrome-<r6>"),
        ("scoped_dir12345_678901234", false, "scoped_dir<d>"),
        ("tmpk3j_9x2a", false, "tmp<p8>"),
        (
            "session-550e8400-e29b-41d4-a716-446655440000",
            false,
            "session-<u>",
        ),
        ("IMG_20261102_123456.jpg", true, "img_<d>.jpg"),
    ] {
        assert_eq!(
            name_template(name, file).as_deref(),
            Some(expected),
            "SCAN_M35_TEMPLATE: {name}"
        );
    }
    for name in [
        "verify-s8-revisions.cjs",
        ".tmp_w35b",
        "apk_backup",
        "apk_F1.apk",
        "climbmao-1.5.2-vc24-emu.apk.parts",
        "verify-abcdef",
        "7mzKFP",
        "550e8400-e29b-41d4-a716-446655440000",
        "Release-2026",
        "v1.2.3",
        "node_modules",
    ] {
        assert_eq!(
            name_template(name, true),
            None,
            "SCAN_M35_TEMPLATE: negative file {name}"
        );
        assert_eq!(
            name_template(name, false),
            None,
            "SCAN_M35_TEMPLATE: negative directory {name}"
        );
    }
    let mut value = target(
        "new",
        "confirm",
        "custom",
        json!({"kind":"pattern","base":"C:\\","segments":["x.part"],"conditions":[{"kind":"sibling_without_suffix","suffixes":[".part"]}]}),
        "file",
        24,
        1,
    );
    value["git_is_copy"] = json!(true);
    value["age_basis"] = json!("latest_created_or_modified");
    value["keep_by"] = json!("version_name");
    value["in_use"] = json!({"mode":"runs_from_or_references_item","processes":[],"root_levels":6});
    value["unlocks_target_ids"] = json!(["protected"]);
    let guard = target(
        "protected",
        "protected",
        "custom",
        json!({"kind":"pattern","base":"C:\\","segments":["guard"]}),
        "any",
        0,
        0,
    );
    let good = vec![value.clone(), guard.clone()];
    let parsed = ScanPlan::from_json(&plan(good.clone(), vec![])).expect("SCAN_M35_PLAN: all keys");
    let encoded = serde_json::to_value(&parsed.targets).unwrap();
    assert_eq!(encoded, json!(good), "SCAN_M35_PLAN: target roundtrip");
    for case in 0..13 {
        let mut bad = good.clone();
        match case {
            0 => bad[0]["unlocks_target_ids"] = json!([]),
            1 => bad[0]["unlocks_target_ids"] = json!(["protected", "protected"]),
            2 => bad[0]["unlocks_target_ids"] = json!(["new"]),
            3 => bad[0]["unlocks_target_ids"] = json!(["missing"]),
            4 => bad[1]["level"] = json!("advisory"),
            5 => bad[0]["level"] = json!("advisory"),
            6 => bad[0]["keep_newest"] = json!(0),
            7 => bad[0]["in_use"]["root_levels"] = json!(0),
            8 => bad[0]["in_use"]["root_levels"] = json!(7),
            9 => bad[0]["in_use"]["root_levels"] = Value::Null,
            10 => bad[0]["in_use"]["mode"] = json!("none"),
            11 => bad[0]["category"] = json!("dev_cache"),
            _ => bad[0]["match"]["conditions"] = json!([{"kind":"parent_has_other_match"}]),
        }
        assert!(
            ScanPlan::from_json(&plan(bad, vec![])).is_err(),
            "SCAN_M35_PLAN: rejection {case}"
        );
    }
    for kind in ["file_name", "dir_name_pattern"] {
        let row = m35_marker_target(
            "marker",
            "F:\\synthetic",
            json!({"kind":kind,"patterns":["#.#*"]}),
            Some(json!([{"kind":"parent_has_file_matching","pattern":"*.exe"}])),
            "any",
        );
        let parsed = ScanPlan::from_json(&plan(vec![row.clone()], vec![]))
            .expect("SCAN_M35_PLAN: new marker");
        assert_eq!(
            serde_json::to_value(&parsed.targets[0]).unwrap(),
            row,
            "SCAN_M35_PLAN: marker roundtrip"
        );
        for patterns in [
            json!([]),
            json!(["."]),
            json!([".."]),
            json!([""]),
            json!(["a/b"]),
            json!(["a\\b"]),
            json!(["a:b"]),
            json!(["x", "X"]),
            json!(["a", "b", "c", "d", "e", "f", "g", "h", "i"]),
        ] {
            let mut bad = row.clone();
            bad["match"]["marker"]["patterns"] = patterns;
            assert!(
                ScanPlan::from_json(&plan(vec![bad], vec![])).is_err(),
                "SCAN_M35_PLAN: patterns"
            );
        }
        for c in [
            json!([{"kind":"parent_has_file_matching","pattern":""}]),
            json!([{"kind":"parent_lacks_file_matching","pattern":"x".repeat(65)}]),
            json!([{"kind":"parent_has_file_matching","pattern":"a/b"}]),
            json!([{"kind":"parent_has_file_matching","pattern":"*.exe","extra":1}]),
            json!([{"kind":"sibling_without_suffix","suffixes":[".part",".PART"]}]),
        ] {
            let mut bad = row.clone();
            bad["match"]["conditions"] = c;
            assert!(
                ScanPlan::from_json(&plan(vec![bad], vec![])).is_err(),
                "SCAN_M35_PLAN: conditions"
            );
        }
    }
    for (kind, conditions, item_type) in [
        (
            json!({"kind":"file_name","patterns":["*.pkf"]}),
            None,
            "dir",
        ),
        (
            json!({"kind":"file_name","patterns":["*.pkf"]}),
            Some(json!([{"kind":"parent_has_other_match"}])),
            "file",
        ),
        (
            json!({"kind":"file_name","patterns":["*.pkf"]}),
            Some(json!([{"kind":"parent_has_other_entries","except":["a"]}])),
            "any",
        ),
        (
            json!({"kind":"file","name":"tag","min_bytes":0,"max_bytes":9}),
            Some(json!([{"kind":"parent_has_other_match"}])),
            "dir",
        ),
        (
            json!({"kind":"children_all","names":["x"]}),
            Some(json!([{"kind":"parent_has_other_match"}])),
            "dir",
        ),
    ] {
        let row = m35_marker_target("bad", "F:\\synthetic", kind, conditions, item_type);
        assert!(
            ScanPlan::from_json(&plan(vec![row], vec![])).is_err(),
            "SCAN_M35_PLAN: marker condition whitelist"
        );
    }
    let old = target(
        "old",
        "recommended",
        "custom",
        json!({"kind":"marker","root":"F:\\synthetic","marker":{"kind":"dir_name","names":["cache"]},"max_depth":2}),
        "dir",
        0,
        0,
    );
    let parsed = ScanPlan::from_json(&plan(vec![old.clone()], vec![])).unwrap();
    assert_eq!(
        serde_json::to_value(&parsed.targets[0]).unwrap(),
        old,
        "SCAN_M35_PLAN: old keys unchanged"
    );
}

fn m35_markers() {
    let fx = Fixture::create();
    for rel in [
        "loc/versions/1.0/a",
        "loc/versions/2.0/b",
        "loc/versions/app.exe",
        "loc/alone/3.0/a",
        "loc/alone/app.exe",
        "loc/no-exe/1.0/a",
        "loc/no-exe/2.0/a",
        "loc/download/x.part",
        "loc/download/x",
        "loc/download/y.part",
        "loc/download/y",
        "loc/download/z.parts/chunk",
        "loc/download/z",
        "loc/audio/a.pkf",
        "loc/audio/not.pkf/keep",
        "loc/install/setup1.exe",
        "loc/app/setup2.exe",
        "loc/app/helper.dll",
        "loc/audition/Conformed Files/a",
    ] {
        write_file(
            &fx.join(rel),
            if rel.ends_with("/y") || rel.ends_with("/z") {
                b""
            } else {
                b"abc"
            },
        );
    }
    let mut versions = m35_marker_target(
        "versions",
        &fx.p("loc"),
        json!({"kind":"dir_name_pattern","patterns":["#.#*"]}),
        Some(
            json!([{"kind":"parent_has_other_match"},{"kind":"parent_has_file_matching","pattern":"*.exe"}]),
        ),
        "dir",
    );
    versions["match"]["max_depth"] = json!(3);
    let files = m35_marker_target(
        "peaks",
        &fx.p("loc"),
        json!({"kind":"file_name","patterns":["*.pkf"]}),
        None,
        "file",
    );
    let partial = m35_marker_target(
        "partial",
        &fx.p("loc"),
        json!({"kind":"file_name","patterns":["*.part"]}),
        Some(json!([{"kind":"sibling_without_suffix","suffixes":[".part"]}])),
        "file",
    );
    let mut fallback = partial.clone();
    fallback["target_id"] = json!("unfinished");
    fallback["group_id"] = json!("unfinished");
    fallback["level"] = json!("advisory");
    fallback["match"]
        .as_object_mut()
        .unwrap()
        .remove("conditions");
    fallback["match"]["fallback_for"] = json!("partial");
    let parts = m35_marker_target(
        "parts",
        &fx.p("loc"),
        json!({"kind":"dir_name_pattern","patterns":["*.parts"]}),
        Some(json!([{"kind":"sibling_without_suffix","suffixes":[".parts"]}])),
        "dir",
    );
    let installers = m35_marker_target(
        "installers",
        &fx.p("loc"),
        json!({"kind":"file_name","patterns":["*setup*.exe"]}),
        Some(json!([{"kind":"parent_lacks_file_matching","pattern":"*.dll"}])),
        "file",
    );
    let result = run_default(
        &plan(
            vec![versions, files, partial, fallback, parts, installers],
            vec![],
        ),
        SystemTime::now(),
    );
    assert_eq!(
        result
            .items
            .iter()
            .filter(|i| i.group_id == "versions")
            .count(),
        2,
        "SCAN_M35_MARKERS: other match and exe"
    );
    assert_eq!(
        result
            .items
            .iter()
            .filter(|i| i.group_id == "peaks")
            .count(),
        1,
        "SCAN_M35_MARKERS: ordinary files only"
    );
    assert_eq!(
        item(&result, "x.part").group_id,
        "partial",
        "SCAN_M35_MARKERS: complete sibling"
    );
    assert_eq!(
        item(&result, "y.part").group_id,
        "unfinished",
        "SCAN_M35_MARKERS: smaller sibling fallback"
    );
    assert!(
        !result.items.iter().any(|i| i.path.ends_with("z.parts")),
        "SCAN_M35_MARKERS: directory size comparison"
    );
    assert_eq!(
        result
            .items
            .iter()
            .filter(|i| i.group_id == "installers")
            .count(),
        1,
        "SCAN_M35_MARKERS: dll excludes app"
    );
    let mut root = m35_marker_target(
        "root",
        &fx.p("loc/versions/1.0"),
        json!({"kind":"dir_name_pattern","patterns":["#.#*"]}),
        Some(json!([{"kind":"parent_lacks_file_matching","pattern":"*.dll"}])),
        "dir",
    );
    for conditions in [
        json!([{"kind":"parent_lacks_file_matching","pattern":"*.dll"}]),
        json!([{"kind":"parent_has_other_match"}]),
        json!([{"kind":"parent_has_file_matching","pattern":"*.exe"}]),
        json!([{"kind":"sibling_without_suffix","suffixes":[".0"]}]),
    ] {
        root["match"]["conditions"] = conditions;
        assert!(
            run_default(&plan(vec![root.clone()], vec![]), SystemTime::now())
                .items
                .is_empty(),
            "SCAN_M35_MARKERS: root parent absent"
        );
    }
    let mut manifest = target(
        "manifest",
        "confirm",
        "custom",
        json!({"kind":"pattern","base":fx.p("loc/download"),"segments":["*.part"],"conditions":[{"kind":"sibling_without_suffix","suffixes":[".part"]}]}),
        "file",
        0,
        0,
    );
    let result = run_default(&plan(vec![manifest.clone()], vec![]), SystemTime::now());
    assert_eq!(
        result.items.len(),
        1,
        "SCAN_M35_MARKERS: pattern sibling condition"
    );
    manifest["match"] = json!({"kind":"discovery","root":fx.p("loc/audio")});
    manifest["item_type"] = json!("any");
    assert_eq!(
        run_default(&plan(vec![manifest], vec![]), SystemTime::now())
            .items
            .len(),
        2,
        "SCAN_M35_MARKERS: custom discovery root"
    );
}

fn m13_expected_cluster_id(parent: &str, kind: &str, template: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in format!("{}\n{kind}\n{template}", parent.to_ascii_lowercase()).bytes() {
        hash = (hash ^ u64::from(byte)).wrapping_mul(0x100000001b3);
    }
    format!("leak:{hash:016x}")
}

fn m13_cluster_exclusions() {
    let fx = Fixture::create();
    let mut excluded = Vec::new();
    let mut ordinary_dirs = Vec::new();
    for i in 0..12 {
        let uuid = format!("{:08x}-e29b-41d4-a716-{i:012x}", 0x550e8400u32 + i);
        let resource = if i < 10 {
            format!("icon_type_color{i}.png")
        } else {
            format!("icon_type_step{:02}.png", i - 9)
        };
        for rel in [
            format!("loc/res/{resource}"),
            format!("loc/help/image/uuid-{uuid}.png"),
            format!(
                "loc/codex/sessions/2026/10/05/rollout-2026-10-05T00-19-{:02}-{uuid}.jsonl",
                40 + i
            ),
            format!(
                "loc/proj/550e8400-e29b-41d4-a716-446655440000/subagents/agent-a0123456789abcde{i:x}.jsonl"
            ),
            format!("loc/jsonl/agent-a{i:07x}.JSONL"),
            format!("loc/hash/apk_backup_a{i:07x}.apk"),
            format!("loc/hash/apk_{uuid}.apk"),
        ] {
            write_file(&fx.join(&rel), b"x");
            excluded.push(fx.p(&rel));
        }
        for rel in [
            format!(
                "loc/backups/claude-code-sessions.backup-20260713-{:06}",
                213450 + i
            ),
            format!("loc/bak/tool.BaK-20260713-{:06}", 213450 + i),
            format!("loc/work/sessions/x/y/run-{uuid}"),
            format!("loc/work/Conversations/run-{uuid}"),
            format!("loc/work/chats/run-{uuid}"),
            format!("loc/work/TRANSCRIPTS/run-{uuid}"),
            format!("loc/boundary/SesSions/a/b/c/d/run-{uuid}"),
        ] {
            write_file(&fx.join(&format!("{rel}/node_modules/keep")), b"x");
            ordinary_dirs.push(fx.p(&format!("{rel}/node_modules")));
            excluded.push(fx.p(&rel));
        }
        for rel in [
            format!("loc/work/runs/session-{uuid}/data"),
            format!("loc/verify/verify-A{i:05}/data"),
            format!("loc/boundary/SesSions/a/b/c/d/e/run-{uuid}/data"),
            format!("loc/not-sessions/run-{uuid}/data"),
            format!("loc/hash/apk_a{i:07x}.apk"),
            format!("loc/random/cache-A{i:05}.tmp"),
            format!("loc/python/tmpa{i:07}.tmp"),
        ] {
            write_file(&fx.join(&rel), b"x");
        }
    }
    let now = SystemTime::now();
    m35_old_tree(&fx.join("loc"), now - Duration::from_secs(40 * 86400));
    let marker = m35_marker_target(
        "modules",
        &fx.p("loc"),
        json!({"kind":"dir_name","names":["node_modules"]}),
        None,
        "dir",
    );
    let extras = ExtrasOptions {
        leak_clusters: true,
        ..ExtrasOptions::default()
    };
    let (result, _) = m35_full(&plan(vec![marker], vec![]), now, &extras);
    for path in &excluded {
        assert!(
            !result
                .items
                .iter()
                .any(|item| item.group_id.starts_with("leak:")
                    && (item.path == *path || item.path.starts_with(&format!("{path}\\")))),
            "SCAN_M35_CLUSTERS: M13 excluded entry never a leak member: {path}"
        );
    }
    for path in &ordinary_dirs {
        assert!(
            result
                .items
                .iter()
                .any(|item| item.group_id == "modules" && item.path == *path),
            "SCAN_M35_CLUSTERS: M13 exclusions preserve ordinary nested target: {path}"
        );
    }
    let expected = [
        ("loc/work/runs", "dir", "session-<u>"),
        ("loc/verify", "dir", "verify-<r6>"),
        ("loc/boundary/SesSions/a/b/c/d/e", "dir", "run-<u>"),
        ("loc/not-sessions", "dir", "run-<u>"),
        ("loc/hash", "file", "apk_<h>.apk"),
        ("loc/random", "file", "cache-<r6>.tmp"),
        ("loc/python", "file", "tmp<p8>.tmp"),
    ];
    assert_eq!(
        result
            .groups
            .iter()
            .filter(|group| group.cluster.is_some())
            .count(),
        expected.len(),
        "SCAN_M35_CLUSTERS: M13 exact surviving clusters"
    );
    for (parent, kind, template) in expected {
        let id = m13_expected_cluster_id(&fx.p(parent), kind, template);
        let group = result
            .groups
            .iter()
            .find(|group| group.group_id == id)
            .expect("SCAN_M35_CLUSTERS: M13 expected FNV group ID");
        let info = group
            .cluster
            .as_ref()
            .expect("SCAN_M35_CLUSTERS: M13 cluster info");
        assert_eq!(
            info.member_count, 12,
            "SCAN_M35_CLUSTERS: M13 exact member count"
        );
        assert_eq!(
            group.item_count, 12,
            "SCAN_M35_CLUSTERS: M13 no excluded extras"
        );
        assert_eq!(
            info.template, template,
            "SCAN_M35_CLUSTERS: M13 exact template"
        );
        assert_eq!(
            group.level,
            water_junk_scan::Level::Confirm,
            "SCAN_M35_CLUSTERS: M13 unchanged level"
        );
    }

    // Discovery exclusions stay ordinary items, including their Item.template.
    let parents = [
        "loc/res",
        "loc/help/image",
        "loc/codex/sessions/2026/10/05",
        "loc/proj/550e8400-e29b-41d4-a716-446655440000/subagents",
        "loc/backups",
        "loc/bak",
        "loc/work/sessions/x/y",
        "loc/jsonl",
        "loc/work/Conversations",
        "loc/work/chats",
        "loc/work/TRANSCRIPTS",
        "loc/boundary/SesSions/a/b/c/d",
    ];
    let rows = parents
        .iter()
        .enumerate()
        .map(|(index, parent)| {
            target(
                &format!("ordinary-{index}"),
                "confirm",
                "system_temp",
                json!({"kind":"discovery","root":fx.p(parent)}),
                "any",
                0,
                0,
            )
        })
        .collect();
    let (discovery, _) = m35_full(&plan(rows, vec![]), now, &extras);
    assert!(
        discovery.groups.iter().all(|group| group.cluster.is_none()),
        "SCAN_M35_CLUSTERS: M13 discovery exclusions"
    );
    for (index, parent) in parents.iter().enumerate() {
        let group = discovery
            .groups
            .iter()
            .find(|group| group.group_id == format!("ordinary-{index}"))
            .unwrap();
        assert_eq!(
            group.item_count,
            if parent.ends_with("/d") { 13 } else { 12 },
            "SCAN_M35_CLUSTERS: M13 ordinary discovery count"
        );
    }
    for path in &excluded {
        if let Some(item) = discovery.items.iter().find(|item| item.path == *path) {
            let name = path.rsplit('\\').next().unwrap();
            assert_eq!(
                item.template,
                name_template(name, item.kind == "file"),
                "SCAN_M35_CLUSTERS: M13 ordinary item template"
            );
        }
    }
    let resource = discovery
        .items
        .iter()
        .find(|item| item.path.ends_with("icon_type_color0.png"))
        .unwrap();
    assert_eq!(
        resource.template, None,
        "SCAN_M35_CLUSTERS: M13 Item.template rejects lowercase digit suffix"
    );
}

fn m13_installer_patterns() {
    let fx = Fixture::create();
    let accepted = [
        "MostLogin-setup.exe",
        "Mirasim-0.0.783.exe",
        "WorkBuddy 5.1.0.exe",
        "cc-switch_installer.exe",
    ];
    let rejected = [
        "unins000.exe",
        "Uninstall.exe",
        "install-service.exe",
        "clash-verge-service-install.exe",
        "cpuz_x64.exe",
        "cli-32.exe",
        "f2py.exe",
        "ct2-marian-converter.exe",
    ];
    for name in accepted.iter().chain(&rejected) {
        write_file(&fx.join(&format!("loc/{name}")), b"x");
    }
    write_file(&fx.join("loc/app/a.dll"), b"x");
    write_file(&fx.join("loc/app/Tool-setup.exe"), b"x");
    let mut row = m35_marker_target(
        "installers",
        &fx.p("loc"),
        json!({"kind":"file_name","patterns":["*setup*.exe","*installer*.exe","*#.#*.exe"]}),
        Some(json!([{"kind":"parent_lacks_file_matching","pattern":"*.dll"}])),
        "file",
    );
    row["match"]["max_depth"] = json!(3);
    let result = run_default(&plan(vec![row], vec![]), SystemTime::now());
    assert_eq!(
        result.items.len(),
        4,
        "SCAN_M35_RULES: exact M12 installer matches"
    );
    for name in accepted {
        assert!(
            result
                .items
                .iter()
                .any(|item| item.path == fx.p(&format!("loc/{name}"))),
            "SCAN_M35_RULES: installer matches {name}"
        );
    }
    for name in rejected {
        assert!(
            !result
                .items
                .iter()
                .any(|item| item.path == fx.p(&format!("loc/{name}"))),
            "SCAN_M35_RULES: tool excluded {name}"
        );
    }
    assert!(
        !result
            .items
            .iter()
            .any(|item| item.path.ends_with("Tool-setup.exe")),
        "SCAN_M35_RULES: DLL guard excludes installed program"
    );
}

fn m35_clusters() {
    m13_cluster_exclusions();
    m13_installer_patterns();
    let fx = Fixture::create();
    let now = SystemTime::now();
    let old = now - Duration::from_secs(40 * 86400);
    for i in 0..12 {
        write_file(
            &fx.join(&format!("loc/.tmp_w35b/verify-A{i:05}/data")),
            b"abc",
        );
        write_file(
            &fx.join(&format!("loc/images/IMG_202610{:02}_123456.jpg", i + 1)),
            b"abc",
        );
    }
    write_file(&fx.join("loc/.tmp_w35b/verify-s8-revisions.cjs"), b"report");
    write_file(&fx.join("loc/.tmp_w35b/report.md"), b"report");
    write_file(
        &fx.join("loc/.tmp_w35b/verify-A00000/node_modules/pkg/a"),
        b"dep",
    );
    fs::create_dir_all(fx.join("loc/.tmp_w35b/verify-A00001/.git")).unwrap();
    for i in 0..11 {
        write_file(&fx.join(&format!("loc/out/apk_a{i:07x}.apk")), b"apk");
    }
    write_file(&fx.join("loc/out/apk_F1.apk"), b"apk");
    write_file(&fx.join("loc/out/apk_backup/keep"), b"backup");
    for i in 0..9 {
        write_file(
            &fx.join(&format!(
                "loc/nine/pgtest-202610{:02}-055219-104832/a",
                i + 1
            )),
            b"x",
        );
    }
    for i in 0..10 {
        write_file(
            &fx.join(&format!("loc/runs/run-A{i:05}/data")),
            &vec![1; if i % 2 == 0 { 1 } else { 65536 }],
        );
        write_file(
            &fx.join(&format!(
                "loc/discovery/pgtest-202610{:02}-055219-104832/a",
                i + 1
            )),
            b"x",
        );
    }
    for i in 0..3 {
        write_file(&fx.join(&format!("loc/discovery/other-{i}/a")), b"x");
    }
    m35_old_tree(&fx.join("loc"), old);
    for i in 0..10 {
        m35_times(
            &fx.join(&format!("loc/runs/run-A{i:05}")),
            now - Duration::from_secs((i + 2) * 86400),
            old,
        );
    }
    m35_times(&fx.join("loc/.tmp_w35b/verify-A00002/data"), old, now);
    m35_times(
        &fx.join("loc/out/apk_a000000a.apk"),
        old,
        old + Duration::from_secs(3600),
    );
    let marker = m35_marker_target(
        "modules",
        &fx.p("loc"),
        json!({"kind":"dir_name","names":["node_modules"]}),
        None,
        "dir",
    );
    let discovery = target(
        "discovery",
        "confirm",
        "system_temp",
        json!({"kind":"discovery","root":fx.p("loc/discovery")}),
        "any",
        0,
        0,
    );
    let text = plan(vec![marker.clone(), discovery], vec![]);
    let extras = ExtrasOptions {
        leak_clusters: true,
        ..ExtrasOptions::default()
    };
    let (result, _) = m35_full(&text, now, &extras);
    let clusters: Vec<_> = result
        .groups
        .iter()
        .filter(|g| g.cluster.is_some())
        .collect();
    let mut physical_entries = 0u64;
    let mut dirs = vec![fx.join("loc")];
    while let Some(dir) = dirs.pop() {
        for entry in fs::read_dir(dir).unwrap() {
            let entry = entry.unwrap();
            physical_entries += 1;
            let metadata = fs::symlink_metadata(entry.path()).unwrap();
            if metadata.is_dir() && metadata.file_attributes() & 0x400 == 0 {
                dirs.push(entry.path());
            }
        }
    }
    assert_eq!(
        result.visited_entries, physical_entries,
        "SCAN_M35_CLUSTERS: each physical directory listed once"
    );
    assert_eq!(
        clusters.len(),
        4,
        "SCAN_M35_CLUSTERS: verify/hash/run/discovery, nine and photos excluded"
    );
    let verify = clusters
        .iter()
        .find(|g| g.cluster.as_ref().unwrap().template == "verify-<r6>")
        .unwrap();
    assert_eq!(
        verify.level,
        water_junk_scan::Level::Confirm,
        "SCAN_M35_CLUSTERS: similar/burst confirms"
    );
    assert_eq!(
        verify.cluster.as_ref().unwrap().member_count,
        12,
        "SCAN_M35_CLUSTERS: template member count"
    );
    assert_eq!(
        verify.item_count, 12,
        "SCAN_M35_CLUSTERS: all verify members"
    );
    assert_eq!(
        item(&result, "verify-A00001").ineligible_reason.as_deref(),
        Some("repository"),
        "SCAN_M35_CLUSTERS: repository member"
    );
    assert_eq!(
        item(&result, "verify-A00002").ineligible_reason.as_deref(),
        Some("too_recent"),
        "SCAN_M35_CLUSTERS: recent member"
    );
    assert!(
        !result.items.iter().any(|i| i.path.ends_with("node_modules")
            || i.path.ends_with("report.md")
            || i.path.ends_with("verify-s8-revisions.cjs")),
        "SCAN_M35_CLUSTERS: no nested target or report"
    );
    let hashed = clusters
        .iter()
        .find(|g| g.cluster.as_ref().unwrap().template == "apk_<h>.apk")
        .unwrap();
    assert_eq!(
        (
            hashed.cluster.as_ref().unwrap().member_count,
            hashed.item_count
        ),
        (11, 12),
        "SCAN_M35_CLUSTERS: extra file not S1"
    );
    assert_eq!(
        item(&result, "apk_a000000a.apk")
            .ineligible_reason
            .as_deref(),
        Some("keep_newest"),
        "SCAN_M35_CLUSTERS: keep latest hash"
    );
    assert_eq!(
        item(&result, "apk_F1.apk").group_id,
        hashed.group_id,
        "SCAN_M35_CLUSTERS: non hash sibling"
    );
    assert_eq!(
        item(&result, "apk_F1.apk").template,
        None,
        "SCAN_M35_CLUSTERS: extra template stays absent"
    );
    assert!(
        !result.items.iter().any(|i| i.path.ends_with("apk_backup")),
        "SCAN_M35_CLUSTERS: no backup directory"
    );
    let runs = clusters
        .iter()
        .find(|g| g.cluster.as_ref().unwrap().template == "run-<r6>")
        .unwrap();
    assert_eq!(
        runs.level,
        water_junk_scan::Level::Advisory,
        "SCAN_M35_CLUSTERS: only S1 is advisory"
    );
    assert!(
        !runs.cluster.as_ref().unwrap().similar_size && !runs.cluster.as_ref().unwrap().burst,
        "SCAN_M35_CLUSTERS: S2/S4 both false"
    );
    assert_eq!(
        result
            .groups
            .iter()
            .find(|g| g.group_id == "discovery")
            .unwrap()
            .item_count,
        3,
        "SCAN_M35_CLUSTERS: discovery members move once"
    );
    let (again, _) = m35_full(&text, now, &extras);
    assert_eq!(
        again
            .groups
            .iter()
            .filter(|g| g.cluster.is_some())
            .map(|g| &g.group_id)
            .collect::<Vec<_>>(),
        clusters.iter().map(|g| &g.group_id).collect::<Vec<_>>(),
        "SCAN_M35_CLUSTERS: stable IDs"
    );
    let direct = scan(
        &ScanPlan::from_json(&text).unwrap(),
        "m35",
        &ScanOptions::default(),
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    let (off, _) = m35_full(&text, now, &ExtrasOptions::default());
    let mut a = direct.clone();
    let mut b = off.clone();
    a.ended_at.clear();
    b.ended_at.clear();
    assert_eq!(a, b, "SCAN_M35_CLUSTERS: off equals scan");
    assert!(
        off.groups.iter().all(|g| g.cluster.is_none()),
        "SCAN_M35_CLUSTERS: default has no clusters"
    );
    // A second random template with the same file prefix cannot be owned twice.
    for i in 0..10 {
        write_file(&fx.join(&format!("loc/out/apk_Z{i:05}.apk")), b"apk");
        m35_times(&fx.join(&format!("loc/out/apk_Z{i:05}.apk")), old, old);
    }
    m35_times(&fx.join("loc/out"), old, old);
    let (mixed, _) = m35_full(&plan(vec![marker], vec![]), now, &extras);
    let mut paths = std::collections::HashSet::new();
    assert!(
        mixed
            .items
            .iter()
            .all(|i| paths.insert(i.path.to_ascii_lowercase())),
        "SCAN_M35_CLUSTERS: one member owner"
    );
    for group in mixed.groups.iter().filter(|g| g.cluster.is_some()) {
        let info = group.cluster.as_ref().unwrap();
        assert_eq!(
            mixed
                .items
                .iter()
                .filter(|i| i.group_id == group.group_id
                    && i.template.as_deref() == Some(info.template.as_str()))
                .count() as u64,
            info.member_count,
            "SCAN_M35_CLUSTERS: owned template count"
        );
    }
}

fn m35_clusters_addendum() {
    {
        let fx = Fixture::create();
        let now = SystemTime::now();
        let extras = ExtrasOptions {
            leak_clusters: true,
            declarations: true,
            ..ExtrasOptions::default()
        };
        for (case, names) in [
            ("none", vec![]),
            ("old", vec![".water-cleanup.json"]),
            ("new", vec![".flick-cleanup.json"]),
            ("mixed", vec![".FlIcK-ClEaNuP.JsOn"]),
            ("both", vec![".flick-cleanup.json", ".water-cleanup.json"]),
        ] {
            for i in 0..10 {
                write_file(&fx.join(&format!("{case}/proj-A{i:05}/data")), b"data");
            }
            let mut handles = vec![];
            let mut expected = vec![];
            for name in names {
                let rel = format!("{case}/proj-A00000/{name}");
                write_file(&fx.join(&rel), b"not parsed as JSON");
                handles.push(
                    OpenOptions::new()
                        .read(true)
                        .share_mode(0)
                        .open(fx.join(&rel))
                        .expect("SCAN_W11_RENAME: lock synthetic declaration"),
                );
                expected.push(fx.p(&rel));
            }
            let search = m35_marker_target(
                "rename-declarations",
                &fx.p(case),
                json!({"kind":"dir_name","names":["never-hit"]}),
                None,
                "dir",
            );
            let (result, found) = m35_full(&plan(vec![search], vec![]), now, &extras);
            assert_eq!(
                found.declarations, expected,
                "SCAN_W11_RENAME: {case} declaration locations, Flick before Water, no content reads"
            );
            assert_eq!(
                result.groups.iter().filter(|g| g.cluster.is_some()).count(),
                usize::from(case == "none"),
                "SCAN_W11_RENAME: {case} declaration excludes one of ten cluster candidates"
            );
        }
    }
    let fx = Fixture::create();
    let now = SystemTime::now();
    let old = now - Duration::from_secs(40 * 86400);
    for i in 0..10 {
        write_file(&fx.join(&format!("loc/ext/apk_a{i:07x}.apk")), b"apk");
        write_file(&fx.join(&format!("loc/plain/blob_a{i:07x}")), b"blob");
        write_file(
            &fx.join(&format!("loc/projects/proj-A{i:05}/data")),
            b"data",
        );
        write_file(
            &fx.join(&format!("loc/retained/pack-A{i:05}/data")),
            b"data",
        );
    }
    write_file(&fx.join("loc/ext/apk_notes.md"), b"notes");
    write_file(&fx.join("loc/ext/apk_notes.txt.apk"), b"same extension");
    write_file(&fx.join("loc/plain/blob_notes.md"), b"notes");
    write_file(&fx.join("loc/plain/blob_notes"), b"same extension");
    write_file(
        &fx.join("loc/projects/proj-A00000/.water-cleanup.json"),
        b"{}",
    );
    write_file(
        &fx.join("loc/retained/pack-A00000/inner/.water-cleanup.json"),
        b"{}",
    );
    for i in 0..12 {
        write_file(
            &fx.join(&format!("loc/rejected/verify-A{i:05}/data")),
            b"data",
        );
    }
    write_file(&fx.join("loc/rejected/.water-cleanup.json"), b"{}");
    m35_old_tree(&fx.join("loc"), old);
    let marker = m35_marker_target(
        "conditional",
        &fx.p("loc"),
        json!({"kind":"dir_name","names":["rejected"]}),
        Some(json!([{"kind":"parent_has_file","name":"missing.json"}])),
        "dir",
    );
    let text = plan(vec![marker], vec![]);
    let extras = ExtrasOptions {
        leak_clusters: true,
        declarations: true,
        ..ExtrasOptions::default()
    };
    let (result, found) = m35_full(&text, now, &extras);
    assert!(
        !result
            .items
            .iter()
            .any(|i| i.path.ends_with("apk_notes.md") || i.path.ends_with("blob_notes.md")),
        "SCAN_M35_CLUSTERS: extra files require exactly the template extension, including none"
    );
    assert!(
        result
            .items
            .iter()
            .any(|i| i.path.ends_with("apk_notes.txt.apk"))
            && result.items.iter().any(|i| i.path.ends_with("blob_notes")),
        "SCAN_M35_CLUSTERS: same extension extras remain members"
    );
    assert!(
        !result
            .groups
            .iter()
            .filter_map(|g| g.cluster.as_ref())
            .any(|c| c.template == "proj-<r6>"),
        "SCAN_M35_CLUSTERS: declared candidate does not count toward ten"
    );
    assert!(
        found
            .declarations
            .iter()
            .any(|p| p.ends_with("proj-A00000\\.water-cleanup.json")),
        "SCAN_M35_CLUSTERS: declared candidate is still discovered"
    );
    assert!(
        found
            .declarations
            .iter()
            .any(|p| p.ends_with("pack-A00000\\inner\\.water-cleanup.json")),
        "SCAN_M35_CLUSTERS: already found declaration survives cluster ownership"
    );
    let nested = result
        .groups
        .iter()
        .find(|g| {
            g.cluster
                .as_ref()
                .is_some_and(|c| c.template == "verify-<r6>")
        })
        .expect("SCAN_M35_CLUSTERS: rejected name still searches for clusters");
    assert_eq!(
        nested.item_count, 12,
        "SCAN_M35_CLUSTERS: rejected marker child cluster"
    );
    assert!(
        found
            .declarations
            .iter()
            .any(|p| p.ends_with("rejected\\.water-cleanup.json")),
        "SCAN_M35_CLUSTERS: rejected name still searches for declarations"
    );
    let parent = fx.p("loc/rejected").to_ascii_lowercase();
    let mut expected = 0xcbf29ce484222325u64;
    for byte in format!("{parent}\ndir\nverify-<r6>").as_bytes() {
        expected ^= u64::from(*byte);
        expected = expected.wrapping_mul(0x100000001b3);
    }
    assert_eq!(
        nested.group_id,
        format!("leak:{expected:016x}"),
        "SCAN_M35_CLUSTERS: independent FNV ID"
    );

    // No target hits: candidate counting emits the first callback. Let its
    // progress interval pass, then cancel from the next comparison callback.
    struct CancelCandidates {
        token: CancelToken,
        calls: std::sync::atomic::AtomicUsize,
    }
    impl ScanObserver for CancelCandidates {
        fn on_progress(&self, _: &ScanProgress) {
            if self.calls.fetch_add(1, std::sync::atomic::Ordering::SeqCst) == 0 {
                std::thread::sleep(Duration::from_millis(60));
            } else {
                self.token.cancel();
            }
        }
    }
    for i in 0..2048 {
        write_file(&fx.join(&format!("cancel/blob_a{i:07x}")), b"x");
    }
    let cancel_plan = ScanPlan::from_json(&plan(
        vec![m35_marker_target(
            "cancel-candidates",
            &fx.p("cancel"),
            json!({"kind":"dir_name","names":["unmatched"]}),
            None,
            "dir",
        )],
        vec![],
    ))
    .unwrap();
    let token = CancelToken::new();
    let observer = CancelCandidates {
        token: token.clone(),
        calls: std::sync::atomic::AtomicUsize::new(0),
    };
    let (cancelled, _) = scan_full(
        &cancel_plan,
        "m35-cancel-candidates",
        &ScanOptions::default(),
        &extras,
        &token,
        &observer,
        now,
    )
    .unwrap();
    assert!(
        observer.calls.load(std::sync::atomic::Ordering::SeqCst) >= 2,
        "SCAN_M35_CLUSTERS: cancellation reached candidate comparison"
    );
    assert_eq!(
        cancelled.status, "cancelled",
        "SCAN_M35_CLUSTERS: candidate comparison cancellation"
    );
    assert!(
        cancelled.groups.iter().all(|g| g.cluster.is_none()),
        "SCAN_M35_CLUSTERS: cancelled candidate group is absent"
    );
    let (limited, _) = scan_full(
        &cancel_plan,
        "m35-budget-candidates",
        &ScanOptions {
            max_entries: 100,
            max_seconds: 60,
        },
        &extras,
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    assert_eq!(
        limited.status, "partial",
        "SCAN_M35_CLUSTERS: candidate budget exhausted"
    );
    assert!(
        limited.issues.iter().all(|i| i.code != "budget_exhausted"
            || limited.groups.iter().any(|g| g.group_id == i.group_id)),
        "SCAN_M35_CLUSTERS: abandoned budget issues belong to a location group"
    );
    // A root nested in another walk still has no logical parent at depth zero.
    write_file(&fx.join("loc/parent.json"), b"{}");
    let outer = m35_marker_target(
        "outer",
        &fx.p("loc"),
        json!({"kind":"dir_name","names":["unmatched"]}),
        None,
        "dir",
    );
    let inner = m35_marker_target(
        "inner",
        &fx.p("loc/rejected"),
        json!({"kind":"dir_name","names":["rejected"]}),
        Some(json!([{"kind":"parent_has_file","name":"parent.json"}])),
        "dir",
    );
    let (nested, _) = m35_full(
        &plan(vec![outer, inner], vec![]),
        now,
        &ExtrasOptions::default(),
    );
    assert!(
        nested.items.is_empty(),
        "SCAN_M35_CLUSTERS: nested target root has no logical parent"
    );
    write_file(&fx.join("deep/a/b/c/d/e/.water-cleanup.json"), b"{}");
    let outer = m35_marker_target(
        "outer",
        &fx.p("deep"),
        json!({"kind":"dir_name","names":["unmatched"]}),
        None,
        "dir",
    );
    let inner = m35_marker_target(
        "inner",
        &fx.p("deep/a/b/c/d/e"),
        json!({"kind":"dir_name","names":["unmatched"]}),
        None,
        "dir",
    );
    let (_, found) = m35_full(&plan(vec![outer, inner], vec![]), now, &extras);
    assert_eq!(
        found.declarations,
        vec![fx.p("deep/a/b/c/d/e/.water-cleanup.json")],
        "SCAN_M35_CLUSTERS: declaration depth is relative to each root"
    );
    write_file(&fx.join("shared/a/data"), b"data");
    write_file(
        &fx.join("shared/a").join(OsString::from_wide(&[0xd800])),
        b"invalid",
    );
    let discovery = target(
        "shared-discovery",
        "protected",
        "system_temp",
        json!({"kind":"discovery","root":fx.p("shared")}),
        "any",
        0,
        0,
    );
    let marker = m35_marker_target(
        "shared-marker",
        &fx.p("shared"),
        json!({"kind":"dir_name","names":["a"]}),
        None,
        "dir",
    );
    let (shared, _) = m35_full(
        &plan(vec![discovery, marker], vec![]),
        now,
        &ExtrasOptions::default(),
    );
    assert_eq!(
        shared.items.len(),
        1,
        "SCAN_M35_CLUSTERS: discovery excludes ordinary hits after shared traversal"
    );
    assert_eq!(
        shared.items[0].group_id, "shared-marker",
        "SCAN_M35_CLUSTERS: ordinary owner beats discovery"
    );
    assert_eq!(
        shared.visited_entries, 3,
        "SCAN_M35_CLUSTERS: overlapping roots share enumeration"
    );
    assert!(
        shared
            .issues
            .iter()
            .all(|i| i.group_id != "shared-discovery"),
        "SCAN_M35_CLUSTERS: excluded discovery has no measurement issues"
    );
    write_file(
        &fx.join("loc/rejected/verify-A00000")
            .join(OsString::from_wide(&[0xd800])),
        b"invalid",
    );
    let (with_issue, _) = m35_full(&text, now, &extras);
    assert!(
        with_issue
            .issues
            .iter()
            .any(|i| i.group_id == nested_group_id(&fx.p("loc/rejected"))
                && i.code == "unrepresentable_name"),
        "SCAN_M35_CLUSTERS: selected cluster retains measurement issues"
    );
}

fn m35_clusters_addendum02() {
    let fx = Fixture::create();
    let now = SystemTime::now();
    let extras = ExtrasOptions {
        leak_clusters: true,
        declarations: true,
        ..ExtrasOptions::default()
    };
    for (case, base_rel, repo_rel, segments) in [
        (
            "middle",
            "middle",
            "middle/claude/.GiT",
            json!(["claude", "*", "*"]),
        ),
        ("first", "first/base", "first/base/.git", json!(["*", "*"])),
    ] {
        write_file(&fx.join(&format!("{repo_rel}/objects/data")), b"object");
        write_file(&fx.join(&format!("{repo_rel}/refs/data")), b"refs");
        write_file(&fx.join(&format!("{repo_rel}/.water-cleanup.json")), b"{}");
        for i in 0..12 {
            write_file(&fx.join(&format!("{repo_rel}/verify-A{i:05}/data")), b"x");
        }
        let measured_rel = if case == "middle" {
            "middle/claude"
        } else {
            "first/base"
        };
        let root_rel = if case == "middle" { "middle" } else { "first" };
        let measured_name = if case == "middle" { "claude" } else { "base" };
        let rows = vec![
            target(
                "git-discovery",
                "confirm",
                "system_temp",
                json!({"kind":"discovery","root":fx.p(root_rel)}),
                "any",
                0,
                0,
            ),
            target(
                "git-pattern",
                "confirm",
                "custom",
                json!({"kind":"pattern","base":fx.p(base_rel),"segments":segments}),
                "any",
                0,
                0,
            ),
            target(
                "git-measure",
                "confirm",
                "custom",
                json!({"kind":"pattern","base":fx.p(root_rel),"segments":[measured_name]}),
                "dir",
                0,
                0,
            ),
            m35_marker_target(
                "git-marker",
                &fx.p(repo_rel),
                json!({"kind":"dir_name","names":["objects"]}),
                None,
                "dir",
            ),
            m35_marker_target(
                "git-files",
                &fx.p(repo_rel),
                json!({"kind":"file_name","patterns":["*"]}),
                None,
                "file",
            ),
            target(
                "git-inner-discovery",
                "confirm",
                "custom",
                json!({"kind":"discovery","root":fx.p(&format!("{repo_rel}/refs"))}),
                "any",
                0,
                0,
            ),
        ];
        let (result, found) = m35_full(&plan(rows, vec![]), now, &extras);
        assert!(
            result.items.iter().all(|i| {
                let path = i.path.to_ascii_lowercase();
                !path.contains("\\.git\\") && !path.ends_with("\\.git")
            }),
            "SCAN_M35_CLUSTERS: {case} wildcard never searches inside git"
        );
        assert!(
            found.declarations.is_empty(),
            "SCAN_M35_CLUSTERS: git declarations are not searched"
        );
        assert!(
            result.groups.iter().all(|g| g.cluster.is_none()),
            "SCAN_M35_CLUSTERS: git clusters are not searched"
        );
        let measured = result
            .items
            .iter()
            .find(|i| i.group_id == "git-measure" && i.path == fx.p(measured_rel))
            .unwrap();
        assert_eq!(
            measured.total_bytes, "24",
            "SCAN_M35_CLUSTERS: git bytes remain in the containing measurement"
        );
    }

    fs::create_dir_all(fx.join("early")).unwrap();
    fs::create_dir_all(fx.join("later")).unwrap();
    write_file(&fx.join("budget/finished"), b"done");
    for i in 0..8 {
        write_file(&fx.join(&format!("budget/a/leaf/data{i}")), b"x");
    }
    let budget_plan = plan(
        vec![
            m35_marker_target(
                "budget-early",
                &fx.p("early"),
                json!({"kind":"dir_name","names":["early"]}),
                None,
                "dir",
            ),
            target(
                "budget-discovery",
                "confirm",
                "system_temp",
                json!({"kind":"discovery","root":fx.p("budget")}),
                "any",
                0,
                0,
            ),
            target(
                "budget-pattern",
                "confirm",
                "custom",
                json!({"kind":"pattern","base":fx.p("budget"),"segments":["a","leaf"]}),
                "dir",
                0,
                0,
            ),
            target(
                "budget-same-root-complete",
                "confirm",
                "custom",
                json!({"kind":"pattern","base":fx.p("budget"),"segments":["finished"]}),
                "file",
                0,
                0,
            ),
            m35_marker_target(
                "budget-later",
                &fx.p("later"),
                json!({"kind":"dir_name","names":["later"]}),
                None,
                "dir",
            ),
        ],
        vec![],
    );
    let limited = run(
        &budget_plan,
        now,
        ScanOptions {
            max_entries: 4,
            max_seconds: 60,
        },
        &CancelToken::new(),
    );
    assert_eq!(
        limited.status, "partial",
        "SCAN_M35_CLUSTERS: nested measurement budget stops scan"
    );
    for group in ["budget-pattern", "budget-discovery", "budget-later"] {
        assert!(
            limited
                .issues
                .iter()
                .any(|i| i.group_id == group && i.code == "budget_exhausted" && i.count == 1),
            "SCAN_M35_CLUSTERS: each unfinished group has one budget issue: {group}"
        );
    }
    assert!(
        limited.items.iter().any(|i| i.group_id == "budget-early"),
        "SCAN_M35_CLUSTERS: completed earlier item survives budget"
    );
    assert!(
        !limited.issues.iter().any(|i| i.group_id == "budget-early"),
        "SCAN_M35_CLUSTERS: completed group has no budget issue"
    );
    assert!(
        limited
            .items
            .iter()
            .any(|i| i.group_id == "budget-same-root-complete"),
        "SCAN_M35_CLUSTERS: completed search shares an unfinished root"
    );
    assert!(
        !limited
            .issues
            .iter()
            .any(|i| i.group_id == "budget-same-root-complete"),
        "SCAN_M35_CLUSTERS: completed same-root search has no budget issue"
    );

    for mode in ["pattern", "discovery", "fallback"] {
        let root = format!("inside-{mode}");
        for i in 0..12 {
            write_file(&fx.join(&format!("{root}/cache/verify-A{i:05}/data")), b"x");
        }
        write_file(
            &fx.join(&format!("{root}/cache/.water-cleanup.json")),
            b"{}",
        );
        let search = m35_marker_target(
            "inside-search",
            &fx.p(&root),
            json!({"kind":"dir_name","names":["unmatched"]}),
            None,
            "dir",
        );
        let mut rows = vec![search];
        if mode == "pattern" {
            rows.push(target(
                "inside-owner",
                "confirm",
                "custom",
                json!({"kind":"pattern","base":fx.p(&root),"segments":["cache"]}),
                "dir",
                0,
                0,
            ));
        } else if mode == "discovery" {
            rows.push(target(
                "inside-owner",
                "confirm",
                "custom",
                json!({"kind":"discovery","root":fx.p(&root)}),
                "dir",
                0,
                0,
            ));
        } else {
            let main = m35_marker_target(
                "inside-main",
                &fx.p(&root),
                json!({"kind":"dir_name","names":["cache"]}),
                Some(json!([{"kind":"parent_has_file","name":"missing.json"}])),
                "dir",
            );
            let mut fallback = main.clone();
            fallback["target_id"] = json!("inside-owner");
            fallback["group_id"] = json!("inside-owner");
            fallback["level"] = json!("advisory");
            fallback["match"]
                .as_object_mut()
                .unwrap()
                .remove("conditions");
            fallback["match"]["fallback_for"] = json!("inside-main");
            rows.extend([main, fallback]);
        }
        let (result, found) = m35_full(&plan(rows, vec![]), now, &extras);
        assert!(
            result.groups.iter().all(|g| g.cluster.is_none()),
            "SCAN_M35_CLUSTERS: {mode} item contains no cluster"
        );
        assert_eq!(
            result.items.len(),
            1,
            "SCAN_M35_CLUSTERS: {mode} measurement appears once"
        );
        assert_eq!(
            result.items[0].group_id, "inside-owner",
            "SCAN_M35_CLUSTERS: containing item retains its owner"
        );
        assert!(
            !result
                .issues
                .iter()
                .any(|i| i.group_id.starts_with("leak:")),
            "SCAN_M35_CLUSTERS: suppressed candidates have no cluster issues"
        );
        if mode != "fallback" {
            assert!(
                found
                    .declarations
                    .iter()
                    .any(|p| p.ends_with("cache\\.water-cleanup.json")),
                "SCAN_M35_CLUSTERS: declarations already found inside ordinary items survive"
            );
        }
    }

    for i in 0..10 {
        for ext in ["", ".apk", ".txt"] {
            write_file(
                &fx.join(&format!("extensions/artifact_a{i:07x}{ext}")),
                b"x",
            );
        }
    }
    for ext in ["", ".apk", ".txt"] {
        write_file(&fx.join(&format!("extensions/artifact_Notes{ext}")), b"x");
    }
    let search = m35_marker_target(
        "extensions",
        &fx.p("extensions"),
        json!({"kind":"dir_name","names":["unmatched"]}),
        None,
        "dir",
    );
    let (result, _) = m35_full(&plan(vec![search], vec![]), now, &extras);
    for ext in ["", ".apk", ".txt"] {
        let template = format!("artifact_<h>{ext}");
        let group = result
            .groups
            .iter()
            .find(|g| g.cluster.as_ref().is_some_and(|c| c.template == template))
            .expect("SCAN_M35_CLUSTERS: same-prefix extension cluster exists");
        assert_eq!(
            group.item_count, 11,
            "SCAN_M35_CLUSTERS: {template} rejects same-prefix foreign extensions"
        );
        assert!(
            result
                .items
                .iter()
                .filter(|i| i.group_id == group.group_id)
                .all(|i| {
                    let actual = Path::new(&i.path)
                        .extension()
                        .and_then(|e| e.to_str())
                        .map(|e| format!(".{e}"))
                        .unwrap_or_default();
                    actual == ext
                }),
            "SCAN_M35_CLUSTERS: hash extras preserve exact extension including none"
        );
    }

    // The sentinel is emitted only after the shared walk. Its delay opens the
    // next progress slot specifically in build_clusters' candidate loop.
    struct CancelBuild {
        token: CancelToken,
        armed: std::sync::atomic::AtomicBool,
        calls: std::sync::atomic::AtomicUsize,
    }
    impl ScanObserver for CancelBuild {
        fn on_progress(&self, progress: &ScanProgress) {
            use std::sync::atomic::Ordering::SeqCst;
            if progress.group_id == "build-sentinel" {
                self.armed.store(true, SeqCst);
                std::thread::sleep(Duration::from_millis(60));
            } else if progress.group_id == "build-candidates" && self.armed.load(SeqCst) {
                self.calls.fetch_add(1, SeqCst);
                self.token.cancel();
            }
        }
    }
    for i in 0..12 {
        write_file(&fx.join(&format!("build/verify-A{i:05}/data")), b"x");
    }
    let rows = ["build-candidates", "build-sentinel"]
        .into_iter()
        .map(|id| {
            m35_marker_target(
                id,
                &fx.p("build"),
                json!({"kind":"dir_name","names":["unmatched"]}),
                None,
                "dir",
            )
        })
        .collect();
    let token = CancelToken::new();
    let observer = CancelBuild {
        token: token.clone(),
        armed: std::sync::atomic::AtomicBool::new(false),
        calls: std::sync::atomic::AtomicUsize::new(0),
    };
    let (cancelled, _) = scan_full(
        &ScanPlan::from_json(&plan(rows, vec![])).unwrap(),
        "m35-build-cancel",
        &ScanOptions::default(),
        &extras,
        &token,
        &observer,
        now,
    )
    .unwrap();
    assert!(
        observer.calls.load(std::sync::atomic::Ordering::SeqCst) > 0,
        "SCAN_M35_CLUSTERS: cancellation occurs after shared walk in build candidate loop"
    );
    assert_eq!(
        cancelled.status, "cancelled",
        "SCAN_M35_CLUSTERS: build candidate loop observes cancellation"
    );
    assert!(
        cancelled.groups.iter().all(|g| g.cluster.is_none()),
        "SCAN_M35_CLUSTERS: build cancellation leaves no cluster"
    );

    for i in 0..10 {
        write_file(
            &fx.join(&format!("discovery-issues/verify-A{i:05}/data")),
            b"x",
        );
    }
    write_file(
        &fx.join("discovery-issues/verify-A00000")
            .join(OsString::from_wide(&[0xd800])),
        b"invalid",
    );
    let discovery = target(
        "issue-discovery",
        "confirm",
        "system_temp",
        json!({"kind":"discovery","root":fx.p("discovery-issues")}),
        "any",
        0,
        0,
    );
    let (result, _) = m35_full(&plan(vec![discovery], vec![]), now, &extras);
    let issues: Vec<_> = result
        .issues
        .iter()
        .filter(|i| i.code == "unrepresentable_name")
        .collect();
    assert_eq!(
        issues.len(),
        1,
        "SCAN_M35_CLUSTERS: discovery cluster measurement issue has one owner"
    );
    assert_eq!(
        issues[0].group_id,
        nested_group_id(&fx.p("discovery-issues")),
        "SCAN_M35_CLUSTERS: discovery measurement issue belongs only to leak group"
    );
    assert_eq!(
        issues[0].count, 1,
        "SCAN_M35_CLUSTERS: discovery cluster issue is counted once"
    );
}

fn m35_clusters_addendum03() {
    let fx = Fixture::create();
    let now = SystemTime::now();
    // The shallower discovery roots finish before the deeper pattern root.
    // Their file measurements have left pending and are waiting in deferred.
    for root in ["deferred-a", "deferred-b"] {
        write_file(&fx.join(&format!("{root}/waiting.bin")), b"waiting");
    }
    for i in 0..8 {
        write_file(&fx.join(&format!("deep/pattern/hit/data{i}")), b"x");
    }
    let discoveries = ["deferred-a", "deferred-b"].into_iter().map(|id| {
        target(
            id,
            "confirm",
            "system_temp",
            json!({"kind":"discovery","root":fx.p(id)}),
            "any",
            0,
            0,
        )
    });
    let pattern = target(
        "deferred-pattern",
        "confirm",
        "custom",
        json!({"kind":"pattern","base":fx.p("deep/pattern"),"segments":["hit"]}),
        "dir",
        0,
        0,
    );
    let text = plan(discoveries.chain([pattern]).collect(), vec![]);
    let result = run(
        &text,
        now,
        ScanOptions {
            max_entries: 4,
            max_seconds: 60,
        },
        &CancelToken::new(),
    );
    assert_eq!(
        result.status, "partial",
        "SCAN_M35_CLUSTERS: deferred budget is partial"
    );
    for group in ["deferred-a", "deferred-b", "deferred-pattern"] {
        assert!(
            result
                .issues
                .iter()
                .any(|i| i.group_id == group && i.code == "budget_exhausted" && i.count == 1),
            "SCAN_M35_CLUSTERS: dropped deferred or measured group has one budget issue: {group}"
        );
    }
    assert!(
        result.items.is_empty(),
        "SCAN_M35_CLUSTERS: interrupted deferred entries remain omitted"
    );
    let token = CancelToken::new();
    token.cancel();
    let cancelled = run(
        &text,
        now,
        ScanOptions {
            max_entries: 0,
            max_seconds: 60,
        },
        &token,
    );
    assert_eq!(
        cancelled.status, "cancelled",
        "SCAN_M35_CLUSTERS: cancellation wins over budget"
    );
    assert!(
        cancelled
            .issues
            .iter()
            .all(|i| i.code != "budget_exhausted"),
        "SCAN_M35_CLUSTERS: cancellation has no budget issues"
    );

    // Both custom searches have completed the walk and retained candidates;
    // a deeper, unrelated measurement exhausts the budget before build_clusters.
    let mut rows = vec![];
    for root in ["cluster-a", "cluster-b"] {
        for i in 0..10 {
            write_file(&fx.join(&format!("{root}/artifact_a{i:07x}")), b"x");
        }
        rows.push(m35_marker_target(
            root,
            &fx.p(root),
            json!({"kind":"dir_name","names":["unmatched"]}),
            None,
            "dir",
        ));
    }
    rows.push(target(
        "cluster-budget-pattern",
        "confirm",
        "custom",
        json!({"kind":"pattern","base":fx.p("deep/pattern"),"segments":["hit"]}),
        "dir",
        0,
        0,
    ));
    let extras = ExtrasOptions {
        leak_clusters: true,
        declarations: true,
        ..ExtrasOptions::default()
    };
    let (result, _) = scan_full(
        &ScanPlan::from_json(&plan(rows, vec![])).unwrap(),
        "m35-skipped-cluster-budget",
        &ScanOptions {
            max_entries: 22,
            max_seconds: 60,
        },
        &extras,
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    assert_eq!(
        result.status, "partial",
        "SCAN_M35_CLUSTERS: skipped cluster search is partial"
    );
    for group in ["cluster-a", "cluster-b", "cluster-budget-pattern"] {
        assert!(
            result
                .issues
                .iter()
                .any(|i| i.group_id == group && i.code == "budget_exhausted" && i.count == 1),
            "SCAN_M35_CLUSTERS: every skipped custom cluster search has one budget issue: {group}"
        );
    }
    assert!(
        result.groups.iter().all(|g| g.cluster.is_none()),
        "SCAN_M35_CLUSTERS: skipped clusters have no leak groups"
    );

    // All search roots are outside .git. An outer pattern measurement makes
    // the physical DFS visit .git even though target searches must be closed.
    for i in 0..12 {
        write_file(
            &fx.join(&format!("git-outer/container/.GiT/verify-A{i:05}/data")),
            b"x",
        );
    }
    write_file(
        &fx.join("git-outer/container/.GiT/objects/cache.bin"),
        b"cache",
    );
    write_file(
        &fx.join("git-outer/container/.GiT/.water-cleanup.json"),
        b"{}",
    );
    let rows = vec![
        target(
            "outside-measure",
            "confirm",
            "custom",
            json!({"kind":"pattern","base":fx.p("git-outer"),"segments":["container"]}),
            "dir",
            0,
            0,
        ),
        m35_marker_target(
            "outside-marker",
            &fx.p("git-outer"),
            json!({"kind":"dir_name","names":["objects"]}),
            None,
            "dir",
        ),
        m35_marker_target(
            "outside-files",
            &fx.p("git-outer"),
            json!({"kind":"file_name","patterns":["*"]}),
            None,
            "file",
        ),
        target(
            "outside-discovery",
            "confirm",
            "system_temp",
            json!({"kind":"discovery","root":fx.p("git-outer")}),
            "any",
            0,
            0,
        ),
    ];
    let (result, found) = m35_full(&plan(rows, vec![]), now, &extras);
    assert_eq!(
        result.status, "completed",
        "SCAN_M35_CLUSTERS: git measurement completes"
    );
    assert!(
        result.items.iter().all(|i| {
            let path = i.path.to_ascii_lowercase();
            !path.contains("\\.git\\") && !path.ends_with("\\.git")
        }),
        "SCAN_M35_CLUSTERS: outside-root marker/file/discovery never search inside git"
    );
    assert!(
        found.declarations.is_empty(),
        "SCAN_M35_CLUSTERS: outside-root search finds no git declarations"
    );
    assert!(
        result.groups.iter().all(|g| g.cluster.is_none()),
        "SCAN_M35_CLUSTERS: outside-root search finds no git clusters"
    );
    assert_eq!(
        item(&result, &fx.p("git-outer/container")).total_bytes,
        "19",
        "SCAN_M35_CLUSTERS: outside-root git contents are still measured"
    );
}

fn nested_group_id(parent: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in format!("{}\ndir\nverify-<r6>", parent.to_ascii_lowercase()).bytes() {
        hash = (hash ^ u64::from(byte)).wrapping_mul(0x100000001b3);
    }
    format!("leak:{hash:016x}")
}

fn m35_rules_names() {
    let fx = Fixture::create();
    let now = SystemTime::now();
    let old = now - Duration::from_secs(20 * 86400);
    write_file(&fx.join("root/copy/.git/a"), b"git");
    write_file(&fx.join("root/copy/data"), b"x");
    write_file(&fx.join("root/scope/cache/a"), b"cache");
    for path in [
        "apps/one/7.1.0.949/a",
        "apps/one/7.10.0.1/a",
        "apps/two/10.0/a",
        "apps/two/9.9.9/a",
    ] {
        write_file(&fx.join(path), b"v");
    }
    for i in 0..10 {
        write_file(&fx.join(&format!("valuable/cert{i}.pem")), b"key");
    }
    for path in [
        "valuable/node_modules/pkg/test.pem",
        "valuable/site-packages/pkg/a.key",
        "valuable/dist-packages/pkg/a.db",
        "valuable/Thumbs.db",
        "valuable/ehthumbs.db",
        "valuable/.env.local",
        "valuable/credentials.json",
        "valuable/google-services.json",
        "valuable/data.sqlite-wal",
    ] {
        write_file(&fx.join(path), b"x");
    }
    for name in ["nul.txt", "trailing.", "trailing "] {
        write_file(
            &PathBuf::from(format!("\\\\?\\{}", fx.p(&format!("valuable/{name}")))),
            b"odd",
        );
    }
    write_file(&m35_verbatim(&fx.join("own-name./data")), b"own");
    fs::create_dir_all(fx.join("root/.git")).unwrap();
    write_file(&fx.join("root/new/a"), b"new");
    m35_old_tree(&fx.dir, old);
    m35_times(&fx.join("root/new"), now, old);
    m35_times(&fx.join("root/new/a"), now, old);
    let mut copy = target(
        "copy",
        "recommended",
        "custom",
        json!({"kind":"pattern","base":fx.p("root"),"segments":["copy"]}),
        "dir",
        0,
        0,
    );
    copy["in_use"] = json!({"mode":"runs_from_or_references_item","processes":[],"root_levels":1});
    let normal = run_default(&plan(vec![copy.clone()], vec![]), now);
    assert_eq!(
        normal.groups[0].in_use.root_levels,
        Some(1),
        "SCAN_M35_RULES: root levels carried to group"
    );
    assert_eq!(
        normal.items[0].ineligible_reason.as_deref(),
        Some("repository"),
        "SCAN_M35_RULES: original repository guard"
    );
    copy["git_is_copy"] = json!(true);
    assert!(
        run_default(&plan(vec![copy], vec![]), now).items[0].eligible,
        "SCAN_M35_RULES: git is download copy"
    );
    let protected = target(
        "protected",
        "protected",
        "custom",
        json!({"kind":"pattern","base":fx.p("root"),"segments":["scope"]}),
        "dir",
        0,
        0,
    );
    let mut cache = target(
        "cache",
        "recommended",
        "custom",
        json!({"kind":"pattern","base":fx.p("root"),"segments":["scope","cache"]}),
        "dir",
        0,
        0,
    );
    cache["unlocks_target_ids"] = json!(["protected"]);
    let unlocked = run_default(&plan(vec![protected.clone(), cache.clone()], vec![]), now);
    assert!(
        item(&unlocked, &fx.p("root/scope/cache")).eligible,
        "SCAN_M35_RULES: named unlock pair"
    );
    let mut another = protected.clone();
    another["target_id"] = json!("another");
    another["group_id"] = json!("another");
    another["match"]["segments"] = json!(["scope", "*"]);
    // An independent containing protected target is never exempted.
    another["match"]["base"] = json!(fx.path);
    another["match"]["segments"] = json!(["root"]);
    let guarded = run_default(&plan(vec![protected, cache, another], vec![]), now);
    assert_eq!(
        item(&guarded, &fx.p("root/scope/cache"))
            .ineligible_reason
            .as_deref(),
        Some("inside_protected"),
        "SCAN_M35_RULES: other protection remains"
    );
    let mut versions = target(
        "versions",
        "confirm",
        "custom",
        json!({"kind":"pattern","base":fx.p("apps"),"segments":["*","*"]}),
        "dir",
        0,
        1,
    );
    versions["keep_by"] = json!("version_name");
    let result = run_default(&plan(vec![versions], vec![]), now);
    for name in ["7.10.0.1", "10.0"] {
        assert_eq!(
            item(&result, name).ineligible_reason.as_deref(),
            Some("keep_newest"),
            "SCAN_M35_RULES: numeric version per parent"
        );
    }
    for name in ["7.1.0.949", "9.9.9"] {
        assert!(
            item(&result, name).eligible,
            "SCAN_M35_RULES: old version eligible"
        );
    }
    let mut age = target(
        "age",
        "recommended",
        "custom",
        json!({"kind":"pattern","base":fx.p("root"),"segments":["new"]}),
        "dir",
        168,
        0,
    );
    assert!(
        run_default(&plan(vec![age.clone()], vec![]), now).items[0].eligible,
        "SCAN_M35_RULES: modified baseline"
    );
    age["age_basis"] = json!("latest_created_or_modified");
    assert_eq!(
        run_default(&plan(vec![age], vec![]), now).items[0]
            .ineligible_reason
            .as_deref(),
        Some("too_recent"),
        "SCAN_M35_RULES: creation is recent"
    );
    let names = target(
        "names",
        "confirm",
        "custom",
        json!({"kind":"pattern","base":fx.path,"segments":["valuable"]}),
        "dir",
        0,
        0,
    );
    let result = run_default(&plan(vec![names], vec![]), now);
    let row = &result.items[0];
    assert_eq!(
        row.valuable_count, 14,
        "SCAN_M35_NAMES: exclusions and full count"
    );
    assert_eq!(row.valuable_names.len(), 8, "SCAN_M35_NAMES: cap eight");
    assert_eq!(
        row.odd_count, 3,
        "SCAN_M35_NAMES: device/trailing dot/space"
    );
    assert_eq!(row.odd_names.len(), 3, "SCAN_M35_NAMES: odd names retained");
    assert!(
        row.valuable_names
            .windows(2)
            .all(|p| p[0].to_ascii_lowercase() <= p[1].to_ascii_lowercase()),
        "SCAN_M35_NAMES: sorted"
    );
    let own = target(
        "own",
        "confirm",
        "custom",
        json!({"kind":"pattern","base":fx.path,"segments":["own-name."]}),
        "dir",
        0,
        0,
    );
    let own = run_default(&plan(vec![own], vec![]), now);
    assert_eq!(
        own.items[0].odd_count, 1,
        "SCAN_M35_NAMES: own directory name included"
    );
    assert_eq!(
        own.items[0].total_bytes, "3",
        "SCAN_M35_NAMES: native verbatim directory measured"
    );
    assert!(
        own.items[0].identity.is_some(),
        "SCAN_M35_NAMES: literal object identity"
    );
    let all = target(
        "all",
        "confirm",
        "custom",
        json!({"kind":"pattern","base":fx.p("root"),"segments":["*"]}),
        "any",
        0,
        0,
    );
    let before = run_default(&plan(vec![all.clone()], vec![]), now);
    for i in 0..12 {
        write_file(
            &fx.join(&format!("root/.water-quarantine/verify-A{i:05}/a")),
            b"skip",
        );
    }
    let after = run_default(&plan(vec![all], vec![]), now);
    assert!(
        !after
            .items
            .iter()
            .any(|i| i.path.to_ascii_lowercase().contains(".git")
                || i.path.to_ascii_lowercase().contains(".water-quarantine")),
        "SCAN_M35_QUARANTINE: quarantine/git never items"
    );
    assert_eq!(
        after.visited_entries,
        before.visited_entries + 1,
        "SCAN_M35_QUARANTINE: count only directory entry"
    );
    let target = target(
        "inside",
        "recommended",
        "custom",
        json!({"kind":"discovery","root":fx.p("root/.water-quarantine")}),
        "any",
        0,
        0,
    );
    let empty = run_default(&plan(vec![target], vec![]), now);
    assert!(
        empty.items.is_empty() && empty.issues.is_empty(),
        "SCAN_M35_QUARANTINE: target root ignored quietly"
    );
    let search = m35_marker_target(
        "search",
        &fx.p("root"),
        json!({"kind":"dir_name","names":["never-hit"]}),
        None,
        "dir",
    );
    let (clusters, _) = m35_full(
        &plan(vec![search], vec![]),
        now,
        &ExtrasOptions {
            leak_clusters: true,
            ..ExtrasOptions::default()
        },
    );
    assert!(
        clusters.groups.iter().all(|g| g.cluster.is_none()),
        "SCAN_M35_QUARANTINE: quarantine not a cluster source"
    );
    for name in [".flick-quarantine", ".FlIcK-QuArAnTiNe"] {
        let fx = Fixture::create();
        fs::create_dir_all(fx.join("root")).expect("SCAN_W11_RENAME: synthetic root");
        let all = crate::target(
            "rename-all",
            "confirm",
            "custom",
            json!({"kind":"pattern","base":fx.p("root"),"segments":["*"]}),
            "any",
            0,
            0,
        );
        let text = plan(vec![all], vec![]);
        let before = run_default(&text, now);
        for i in 0..12 {
            write_file(
                &fx.join(&format!("root/{name}/verify-A{i:05}/data")),
                b"stored",
            );
        }
        let after = run_default(&text, now);
        assert!(
            after.items.is_empty(),
            "SCAN_W11_RENAME: {name} never becomes an item"
        );
        assert_eq!(
            after.visited_entries,
            before.visited_entries + 1,
            "SCAN_W11_RENAME: {name} counted once without entering"
        );
        for rel in [format!("root/{name}"), format!("root/{name}/verify-A00000")] {
            let inside = crate::target(
                "rename-inside",
                "recommended",
                "custom",
                json!({"kind":"discovery","root":fx.p(&rel)}),
                "any",
                0,
                0,
            );
            let empty = run_default(&plan(vec![inside], vec![]), now);
            assert!(
                empty.items.is_empty() && empty.issues.is_empty() && empty.visited_entries == 0,
                "SCAN_W11_RENAME: {name} root and descendant quietly ignored"
            );
        }
        let search = m35_marker_target(
            "rename-search",
            &fx.p("root"),
            json!({"kind":"dir_name","names":["never-hit"]}),
            None,
            "dir",
        );
        let (clusters, _) = m35_full(
            &plan(vec![search], vec![]),
            now,
            &ExtrasOptions {
                leak_clusters: true,
                ..ExtrasOptions::default()
            },
        );
        assert!(
            clusters.items.is_empty() && clusters.groups.iter().all(|g| g.cluster.is_none()),
            "SCAN_W11_RENAME: {name} never becomes a cluster source"
        );
    }
}

fn m35_junctions_overview() {
    let fx = Fixture::create();
    let now = SystemTime::now();
    write_file(&fx.join("loc/cache/sub/data"), b"cache");
    junction(&fx.join("loc/links/direct"), &fx.join("loc/cache"));
    junction(
        &fx.join("loc/links/inside-target"),
        &fx.join("loc/cache/sub"),
    );
    junction(&fx.join("loc/links/parent-target"), &fx.join("loc"));
    junction(&fx.join("loc/cache/internal"), &fx.join("loc/cache/sub"));
    junction(&fx.join("loc/links/chain"), &fx.join("loc/links/direct"));
    for (a, b) in [
        ("loc/links/cycle-a", "loc/links/cycle-b"),
        ("loc/links/cycle-b", "loc/links/cycle-a"),
    ] {
        assert!(fx.join(a).starts_with(&fx.dir) && fx.join(b).starts_with(&fx.dir));
        let out = Command::new("cmd")
            .args(["/c", "mklink", "/J", fx.p(a).as_str(), fx.p(b).as_str()])
            .output()
            .unwrap();
        assert!(out.status.success(), "SCAN_M35_JUNCTIONS: cycle fixture");
    }
    write_file(&fx.join("loc/a/b/c/d/.water-cleanup.json"), b"not parsed");
    write_file(&fx.join("loc/a/b/c/d/e/.water-cleanup.json"), b"not parsed");
    let locked = OpenOptions::new()
        .access_mode(0x100)
        .share_mode(0)
        .open(fx.join("loc/a/b/c/d/.water-cleanup.json"))
        .unwrap();
    let main = target(
        "cache",
        "recommended",
        "custom",
        json!({"kind":"pattern","base":fx.p("loc"),"segments":["cache"]}),
        "dir",
        0,
        0,
    );
    let search = m35_marker_target(
        "search",
        &fx.p("loc"),
        json!({"kind":"dir_name","names":["never-hit"]}),
        None,
        "dir",
    );
    let text = plan(vec![main, search], vec![]);
    let extras = ExtrasOptions {
        junctions: true,
        declarations: true,
        ..ExtrasOptions::default()
    };
    let (result, index) = m35_full(&text, now, &extras);
    assert_eq!(
        index.junctions.len(),
        7,
        "SCAN_M35_JUNCTIONS: all listed links indexed once"
    );
    let row = item(&result, &fx.p("loc/cache"));
    let mut expected = [
        "loc/links/chain",
        "loc/links/direct",
        "loc/links/inside-target",
        "loc/links/parent-target",
    ]
    .map(|p| fx.p(p))
    .to_vec();
    expected.sort_by_key(|s| s.to_ascii_lowercase());
    assert_eq!(
        row.referenced_by, expected,
        "SCAN_M35_JUNCTIONS: equal/inside/parent, own link excluded"
    );
    assert_eq!(
        row.referenced_count, 4,
        "SCAN_M35_JUNCTIONS: reference count"
    );
    let chain = index
        .junctions
        .iter()
        .find(|j| j.path.eq_ignore_ascii_case(&fx.p("loc/links/chain")))
        .unwrap();
    assert_eq!(
        chain.final_target.as_deref(),
        Some(fx.p("loc/cache").as_str()),
        "SCAN_M35_JUNCTIONS: chain resolved"
    );
    assert!(
        index
            .junctions
            .iter()
            .filter(|j| j.path.contains("cycle-"))
            .all(|j| j.final_target.is_none()),
        "SCAN_M35_JUNCTIONS: cycles none"
    );
    assert_eq!(
        index.declarations,
        vec![fx.p("loc/a/b/c/d/.water-cleanup.json")],
        "SCAN_M35_JUNCTIONS: depth four only, locked content not read"
    );
    drop(locked);
    let (off, empty) = m35_full(&text, now, &ExtrasOptions::default());
    assert!(
        empty.junctions.is_empty()
            && empty.declarations.is_empty()
            && off.items.iter().all(|i| i.referenced_by.is_empty()),
        "SCAN_M35_JUNCTIONS: switches off"
    );
    assert_eq!(
        extras_from_json(&extras_to_json(&index)).unwrap(),
        index,
        "SCAN_M35_COMPAT: extras roundtrip"
    );
    let mut invalid: Value = serde_json::from_str(&extras_to_json(&index)).unwrap();
    invalid["unknown"] = json!(1);
    assert!(
        extras_from_json(&invalid.to_string()).is_err(),
        "SCAN_M35_COMPAT: extras strict keys"
    );
    invalid.as_object_mut().unwrap().remove("unknown");
    invalid["extras_version"] = json!("wrong");
    assert!(
        extras_from_json(&invalid.to_string()).is_err(),
        "SCAN_M35_COMPAT: extras version"
    );
    let root = m35_marker_target(
        "root-link",
        &fx.p("loc/links/direct"),
        json!({"kind":"dir_name","names":["cache"]}),
        None,
        "dir",
    );
    assert_eq!(
        m35_full(&plan(vec![root], vec![]), now, &extras)
            .1
            .junctions
            .len(),
        1,
        "SCAN_M35_JUNCTIONS: target root indexed"
    );
    // Both invalid-name and stopped root measurements belong only to fallback.
    write_file(
        &fx.join("fallback/node_modules")
            .join(OsString::from_wide(&[0xd800])),
        b"invalid",
    );
    for i in 0..20 {
        write_file(&fx.join(&format!("fallback/node_modules/f{i}")), b"x");
    }
    let main = m35_marker_target(
        "main",
        &fx.p("fallback/node_modules"),
        json!({"kind":"dir_name","names":["node_modules"]}),
        Some(json!([{"kind":"parent_has_file","name":"package.json"}])),
        "dir",
    );
    let mut fallback = main.clone();
    fallback["target_id"] = json!("fallback");
    fallback["group_id"] = json!("fallback");
    fallback["level"] = json!("advisory");
    fallback["match"]
        .as_object_mut()
        .unwrap()
        .remove("conditions");
    fallback["match"]["fallback_for"] = json!("main");
    let text = plan(vec![main, fallback], vec![]);
    let complete = run_default(&text, now);
    assert!(
        complete
            .issues
            .iter()
            .any(|i| i.group_id == "fallback" && i.code == "unrepresentable_name"),
        "SCAN_M35_FALLBACK_ISSUES: invalid name final owner"
    );
    assert!(
        !complete.issues.iter().any(|i| i.group_id == "main"),
        "SCAN_M35_FALLBACK_ISSUES: no primary measurement issues"
    );
    let tight = run(
        &text,
        now,
        ScanOptions {
            max_entries: 1,
            max_seconds: 900,
        },
        &CancelToken::new(),
    );
    assert!(
        tight
            .issues
            .iter()
            .any(|i| i.group_id == "fallback" && i.code == "budget_exhausted" && i.count == 1),
        "SCAN_M35_FALLBACK_ISSUES: root budget final owner"
    );
    assert!(
        !tight.issues.iter().any(|i| i.group_id == "main"),
        "SCAN_M35_FALLBACK_ISSUES: no primary budget"
    );
    // Independent overview: 12 folders, one regular file and one junction.
    for i in 1..=12 {
        write_file(
            &fx.join(&format!("overview/d{i:02}/data")),
            &vec![1; i * 8192],
        );
    }
    write_file(&fx.join("overview/zfile.bin"), &vec![1; 13 * 8192]);
    junction(&fx.join("overview/zero-link"), &fx.join("loc/cache"));
    let overview = space_overview(
        &fx.p("overview"),
        "overview",
        &ScanOptions::default(),
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    assert_eq!(overview.top.len(), 10, "SCAN_M35_OVERVIEW: top ten");
    assert_eq!(
        overview
            .top
            .iter()
            .map(|e| e.name.as_str())
            .collect::<Vec<_>>(),
        [
            "zfile.bin",
            "d12",
            "d11",
            "d10",
            "d09",
            "d08",
            "d07",
            "d06",
            "d05",
            "d04"
        ],
        "SCAN_M35_OVERVIEW: allocation ordering"
    );
    assert_eq!(
        overview.others_count, 4,
        "SCAN_M35_OVERVIEW: three folders and junction"
    );
    assert_eq!(
        overview.total_bytes,
        (91 * 8192).to_string(),
        "SCAN_M35_OVERVIEW: no link traversal"
    );
    assert_eq!(overview.file_count, 13, "SCAN_M35_OVERVIEW: logical files");
    assert_eq!(
        overview.others_disk_bytes,
        (6 * 8192).to_string(),
        "SCAN_M35_OVERVIEW: others allocation"
    );
    let link_only = space_overview(
        &fx.p("overview"),
        "overview",
        &ScanOptions::default(),
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    assert_eq!(
        overview_from_json(&overview_to_json(&link_only)).unwrap(),
        link_only,
        "SCAN_M35_COMPAT: overview roundtrip"
    );
    // Expose a reparse item in the top list in a separate small root.
    junction(&fx.join("link-overview/link"), &fx.join("loc/cache"));
    let small = space_overview(
        &fx.p("link-overview"),
        "overview",
        &ScanOptions::default(),
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    assert_eq!(
        (small.top[0].kind.as_str(), small.top[0].disk_bytes.as_str()),
        ("reparse", "0"),
        "SCAN_M35_OVERVIEW: reparse zero"
    );
    write_file(&fx.join("link-overview/.water-quarantine/file"), b"stored");
    let stored = space_overview(
        &fx.p("link-overview"),
        "overview",
        &ScanOptions::default(),
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    assert!(
        stored
            .top
            .iter()
            .any(|e| e.name == ".water-quarantine" && e.total_bytes == "6"),
        "SCAN_M35_OVERVIEW: quarantine counted"
    );
    write_file(&fx.join("link-overview/.FlIcK-QuArAnTiNe/file"), b"stored");
    let stored = space_overview(
        &fx.p("link-overview"),
        "overview",
        &ScanOptions::default(),
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .expect("SCAN_W11_RENAME: overview includes quarantine");
    for name in [".FlIcK-QuArAnTiNe", ".water-quarantine"] {
        assert!(
            stored
                .top
                .iter()
                .any(|e| e.name == name && e.total_bytes == "6"),
            "SCAN_W11_RENAME: overview counts {name} storage"
        );
    }
}

fn m35_sizes_compat() {
    let fx = Fixture::create();
    write_file(&fx.join("files/sparse.bin"), b"");
    let out = Command::new("fsutil")
        .args(["sparse", "setflag", fx.p("files/sparse.bin").as_str()])
        .output()
        .unwrap();
    assert!(out.status.success(), "SCAN_M35_SIZES: sparse fixture");
    OpenOptions::new()
        .write(true)
        .open(fx.join("files/sparse.bin"))
        .unwrap()
        .set_len(64 * 1024 * 1024)
        .unwrap();
    write_file(&fx.join("files/data.bin"), &vec![1; 1024 * 1024]);
    for name in ["link1.bin", "link2.bin", "link3.bin"] {
        let out = Command::new("cmd")
            .args([
                "/c",
                "mklink",
                "/H",
                fx.p(&format!("files/{name}")).as_str(),
                fx.p("files/data.bin").as_str(),
            ])
            .output()
            .unwrap();
        assert!(out.status.success(), "SCAN_M35_SIZES: hardlink fixture");
    }
    let now = SystemTime::now();
    let row = target(
        "sizes",
        "recommended",
        "custom",
        json!({"kind":"pattern","base":fx.path,"segments":["files"]}),
        "dir",
        0,
        0,
    );
    let text = plan(vec![row], vec![]);
    let result = run_default(&text, now);
    let item = &result.items[0];
    assert_eq!(
        item.total_bytes,
        (68 * 1024 * 1024).to_string(),
        "SCAN_M35_SIZES: all logical paths"
    );
    assert_eq!(
        item.unique_bytes,
        (65 * 1024 * 1024).to_string(),
        "SCAN_M35_SIZES: hard links unique"
    );
    let disk = item.disk_bytes.as_ref().unwrap().parse::<u64>().unwrap();
    assert!(
        disk < 8 * 1024 * 1024,
        "SCAN_M35_SIZES: sparse allocation must be far below length"
    );
    assert_eq!(
        result.groups[0].disk_bytes, item.disk_bytes,
        "SCAN_M35_SIZES: group disk sum"
    );
    assert_eq!(
        result.groups[0].eligible_disk_bytes, item.disk_bytes,
        "SCAN_M35_SIZES: eligible disk sum"
    );
    let parsed = ScanPlan::from_json(&text).unwrap();
    let direct = scan(
        &parsed,
        "same",
        &ScanOptions::default(),
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    let (full, empty) = scan_full(
        &parsed,
        "same",
        &ScanOptions::default(),
        &ExtrasOptions::default(),
        &CancelToken::new(),
        &Quiet,
        now,
    )
    .unwrap();
    let mut a = direct;
    let mut b = full;
    a.ended_at.clear();
    b.ended_at.clear();
    assert_eq!(a, b, "SCAN_M35_COMPAT: scan equals default scan_full");
    assert!(
        empty.junctions.is_empty() && empty.declarations.is_empty() && !empty.junctions_truncated,
        "SCAN_M35_COMPAT: empty extras"
    );
    let mut legacy: Value = serde_json::from_str(&result_to_json(&result)).unwrap();
    for row in legacy["items"].as_array_mut().unwrap() {
        for key in [
            "disk_bytes",
            "template",
            "valuable_count",
            "valuable_names",
            "odd_count",
            "odd_names",
            "referenced_count",
            "referenced_by",
        ] {
            row.as_object_mut().unwrap().remove(key);
        }
    }
    for row in legacy["groups"].as_array_mut().unwrap() {
        for key in ["disk_bytes", "eligible_disk_bytes", "cluster"] {
            row.as_object_mut().unwrap().remove(key);
        }
    }
    let old = result_from_json(&legacy.to_string()).expect("SCAN_M35_COMPAT: old result accepted");
    assert!(
        old.items[0].disk_bytes.is_none() && old.groups[0].disk_bytes.is_none(),
        "SCAN_M35_COMPAT: missing allocation stays None"
    );
    assert_eq!(
        result_from_json(&result_to_json(&result)).unwrap(),
        result,
        "SCAN_M35_COMPAT: new result roundtrip"
    );
    write_file(&fx.join("vanishing.bin"), b"synthetic");
    struct Disappear {
        path: PathBuf,
        root: PathBuf,
        done: std::sync::atomic::AtomicBool,
    }
    impl ScanObserver for Disappear {
        fn on_progress(&self, progress: &ScanProgress) {
            if progress.group_id == "enumerate"
                && !self.done.swap(true, std::sync::atomic::Ordering::SeqCst)
            {
                assert!(self.path.starts_with(&self.root));
                fs::remove_file(&self.path).unwrap();
            }
        }
    }
    let enumerate = target(
        "enumerate",
        "advisory",
        "custom",
        json!({"kind":"pattern","base":fx.path,"segments":["never"]}),
        "file",
        0,
        0,
    );
    let advisory = target(
        "advisory",
        "advisory",
        "custom",
        json!({"kind":"pattern","base":fx.path,"segments":["vanishing.bin"]}),
        "file",
        0,
        0,
    );
    let observer = Disappear {
        path: fx.join("vanishing.bin"),
        root: fx.dir.clone(),
        done: std::sync::atomic::AtomicBool::new(false),
    };
    let result = scan(
        &ScanPlan::from_json(&plan(vec![enumerate, advisory], vec![])).unwrap(),
        "gone",
        &ScanOptions::default(),
        &CancelToken::new(),
        &observer,
        now,
    )
    .unwrap();
    assert!(
        result.items[0].identity.is_none(),
        "SCAN_M35_SIZES: vanished fixture identity unavailable"
    );
    assert!(
        !result
            .issues
            .iter()
            .any(|i| i.code == "identity_unavailable"),
        "SCAN_M35_SIZES: advisory identity is quiet"
    );
}
