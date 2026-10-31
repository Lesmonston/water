use serde_json::{Value, json};
use std::ffi::OsString;
use std::fs::{self, OpenOptions};
use std::os::windows::ffi::OsStringExt;
use std::os::windows::fs::{MetadataExt, OpenOptionsExt};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use water_junk_scan::{
    CancelToken, ScanObserver, ScanOptions, ScanPlan, ScanProgress, ScanResult, growth,
    identity_of, normalize_key, result_from_json, result_to_json, scan, snapshot,
    snapshot_from_json, snapshot_to_json,
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
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"b","taken_at":"2026-10-26T02:00:00Z","groups":{"g":{"total_bytes":"200","item_count":20,"newest_activity":"2026-10-26T01:30:00Z","top_keys":[]}}}"#,
    )
    .unwrap();
    let g19 = growth(&prev, &cur19);
    assert_eq!(g19.len(), 1);
    assert_eq!(g19[0].count_delta, 19);
    assert!(!g19[0].leak_suspect);

    let cur20 = snapshot_from_json(
        r#"{"snapshot_version":"water.scan-snapshot.v1","scan_id":"c","taken_at":"2026-10-26T02:00:00Z","groups":{"g":{"total_bytes":"200","item_count":21,"newest_activity":"2026-10-26T01:30:00Z","top_keys":[]}}}"#,
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
    let ghour = growth(&prev, &one_hour);
    assert_eq!(ghour.len(), 1);
    assert_eq!(ghour[0].bytes_delta, "44739243");
    assert_eq!(
        ghour[0].bytes_per_day, "1073741832",
        "bytes_per_day must divide by the exact interval"
    );
    assert!(ghour[0].leak_suspect);
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
