// Controller's independent synthetic clean-enabled run for WATER-W3-F1 (water-service).
// Copied into an acceptance tree as packages/water-service/tests/controller_cases.rs with its own
// [[test]] entry. Fixtures live only under <tree>/.local/w3-f1-controller/case-<nonce>/ and are
// left in place for inspection. Known folders, drives, time zone and in-use answers are synthetic;
// no real user location is read and nothing outside the fixture is written.
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs::{self, FileTimes, OpenOptions},
    hash::{BuildHasher, RandomState},
    os::windows::{fs::MetadataExt, fs::OpenOptionsExt, process::CommandExt},
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{Duration, Instant, SystemTime},
};
use water_service::*;

struct Fake {
    root: PathBuf,
}

impl Fake {
    fn dir(&self, name: &str) -> String {
        self.root.join(name).to_str().unwrap().to_owned()
    }
}

impl Platform for Fake {
    fn known_folders(&self) -> Result<water_junk_rules::KnownFolders, IpcError> {
        Ok(water_junk_rules::KnownFolders {
            user_profile: self.dir("home"),
            local_app_data: self.dir("lad"),
            roaming_app_data: self.dir("rad"),
            user_temp: self.dir("ut"),
            system_temp: self.dir("st"),
            windows: self.dir("win"),
            program_data: self.dir("pd"),
            downloads: self.dir("dl"),
        })
    }
    fn drives(&self) -> Vec<DriveInfo> {
        let root = self.root.to_str().unwrap()[..3].to_owned();
        vec![DriveInfo { root, is_system: false, total_bytes: 1 << 40, free_bytes: 1 << 39 }]
    }
    fn now(&self) -> SystemTime {
        SystemTime::now()
    }
    fn local_date(&self, _at: SystemTime) -> (u32, u32) {
        (10, 26)
    }
    fn in_use(&self, _spec: &water_process_scan::InUseSpec, item_path: &str) -> Option<String> {
        item_path.contains("Profile Busy").then(|| "chrome.exe".to_owned())
    }
}

struct NoPick;
impl FolderPicker for NoPick {
    fn pick(&self) -> Result<Option<String>, IpcError> {
        Ok(None)
    }
}

const DAY: u64 = 86_400;
const UD: &str = "lad\\Google\\Chrome\\User Data";

fn base() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
    let tree = manifest.parent().unwrap().parent().unwrap().to_path_buf();
    let parent = tree.join(".local").join("w3-f1-controller");
    fs::create_dir_all(&parent).unwrap();
    let nonce = RandomState::new().hash_one((SystemTime::now(), std::process::id()));
    let root = parent.join(format!("case-{nonce:016x}"));
    fs::create_dir(&root).unwrap();
    root
}

fn seed(root: &Path, rel: &str, bytes: usize) {
    let p = root.join(rel);
    fs::create_dir_all(p.parent().unwrap()).unwrap();
    fs::write(p, vec![b'w'; bytes]).unwrap();
}

fn set_age(path: &Path, seconds_ago: u64) {
    let file = OpenOptions::new()
        .access_mode(0x100)
        .custom_flags(0x0200_0000 | 0x0020_0000)
        .open(path)
        .unwrap();
    file.set_times(FileTimes::new().set_modified(SystemTime::now() - Duration::from_secs(seconds_ago)))
        .unwrap();
}

/// Children first, then the directory itself; never enters a reparse point.
fn age_tree(path: &Path, seconds_ago: u64) {
    let meta = fs::symlink_metadata(path).unwrap();
    if meta.file_attributes() & 0x400 != 0 {
        return;
    }
    if meta.is_dir() {
        for entry in fs::read_dir(path).unwrap() {
            age_tree(&entry.unwrap().path(), seconds_ago);
        }
    }
    set_age(path, seconds_ago);
}

/// Files by path (relative to the fixture) with sizes; reparse points are listed, never entered.
fn inventory(root: &Path, dir: &Path, out: &mut BTreeMap<String, u64>) {
    for entry in fs::read_dir(dir).unwrap() {
        let p = entry.unwrap().path();
        let rel = p.strip_prefix(root).unwrap().to_str().unwrap().to_owned();
        if rel == "data" {
            continue;
        }
        let meta = fs::symlink_metadata(&p).unwrap();
        if meta.file_attributes() & 0x400 != 0 {
            out.insert(rel + "|reparse", 0);
        } else if meta.is_dir() {
            inventory(root, &p, out);
        } else {
            out.insert(rel, meta.len());
        }
    }
}

fn under(path: &str, parent: &str) -> bool {
    let (p, q) = (path.to_ascii_lowercase(), parent.to_ascii_lowercase());
    p == q || p.starts_with(&(q + "\\"))
}

fn call(s: &Service, c: &str, a: Value) -> Value {
    s.call(c, a).unwrap_or_else(|e| panic!("CONTROLLER {c}: {} {}", e.code, e.message_zh))
}

fn code(s: &Service, c: &str, a: Value) -> String {
    match s.call(c, a) {
        Ok(v) => format!("ok {v}"),
        Err(e) => e.code,
    }
}

fn wait(s: &Service, progress: &str) -> Value {
    let deadline = Instant::now() + Duration::from_secs(120);
    loop {
        let p = call(s, progress, json!({}));
        if !matches!(p["state"].as_str(), Some("running" | "idle")) {
            return p;
        }
        assert!(Instant::now() < deadline, "CONTROLLER {progress} timeout");
        thread::sleep(Duration::from_millis(50));
    }
}

fn service(root: &Path, clean_enabled: bool) -> Service {
    Service::new(ServiceConfig {
        data_dir: root.join("data"),
        app_version: "0.1.0".into(),
        clean_enabled,
        platform: Box::new(Fake { root: root.to_path_buf() }),
        picker: Box::new(NoPick),
    })
    .unwrap_or_else(|e| panic!("CONTROLLER new: {} {}", e.code, e.message_zh))
}

#[test]
fn controller_clean_enabled_flow() {
    let root = base();
    for d in ["home", "lad", "rad", "ut", "st", "win", "pd", "dl", "outside", "outside-target"] {
        fs::create_dir_all(root.join(d)).unwrap();
    }
    let must_go = [
        (format!("{UD}\\Default\\Cache\\Cache_Data\\f_000001"), 1000),
        (format!("{UD}\\Default\\Cache\\Cache_Data\\data_1"), 2000),
        (format!("{UD}\\Profile 2\\Media Cache\\m1"), 3000),
        ("lad\\CrashDumps\\a.dmp".to_owned(), 5000),
    ];
    let must_stay = [
        (format!("{UD}\\Profile Busy\\Cache\\busy.bin"), 4000),
        (format!("{UD}\\Default\\Cookies"), 500),
        (format!("{UD}\\Default\\Network\\Cookies"), 600),
        (format!("{UD}\\Default\\Preferences"), 700),
        (format!("{UD}\\Default\\CacheX\\y.bin"), 800),
        ("lad\\CrashDumps\\b.dmp".to_owned(), 6000),
        ("lad\\CrashDumps\\notes.txt".to_owned(), 100),
        ("dl\\setup.exe".to_owned(), 7000),
        ("outside\\keep.bin".to_owned(), 900),
        ("outside-target\\t.bin".to_owned(), 1100),
    ];
    let junction_cache = format!("{UD}\\Profile J\\Cache");
    for (rel, n) in must_go.iter().chain(must_stay.iter()) {
        seed(&root, rel, *n);
    }
    seed(&root, &format!("{junction_cache}\\j.bin"), 1300);
    for d in ["lad", "dl", "outside", "outside-target"] {
        age_tree(&root.join(d), 10 * DAY);
    }
    set_age(&root.join("lad\\CrashDumps\\b.dmp"), 60);
    let link = root.join(format!("{junction_cache}\\link"));
    let out = Command::new("cmd.exe")
        .creation_flags(0x0800_0000)
        .args(["/D", "/C", "mklink", "/J"])
        .arg(&link)
        .arg(root.join("outside-target"))
        .output()
        .unwrap();
    assert!(out.status.success(), "CONTROLLER junction fixture");

    let mut before = BTreeMap::new();
    inventory(&root, &root, &mut before);

    let s = service(&root, true);
    for category in ["browser", "crash_log"] {
        call(&s, "locations_set_category", json!({"category": category, "enabled": true}));
    }
    let scan_id = call(&s, "scan_start", json!({}))["scan_id"].clone();
    let done = wait(&s, "scan_progress");
    assert_eq!(done["state"], "completed", "CONTROLLER scan state");
    let view = call(&s, "scan_result", json!({"scanId": scan_id}));
    let record: Value = serde_json::from_str(
        &fs::read_to_string(root.join("data\\scans").join(format!("{}.json", scan_id.as_str().unwrap()))).unwrap(),
    )
    .unwrap();
    let scanned: BTreeMap<String, &Value> = record["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| (i["path"].as_str().unwrap().to_owned(), i))
        .collect();

    assert_eq!(
        code(&s, "clean_prepare", json!({"groupIds": ["chrome-login-and-site-data"]})),
        "invalid",
        "CONTROLLER protected group refused"
    );
    let preview = call(&s, "clean_prepare", json!({"groupIds": ["chrome-cache", "crash-dumps"]}));
    let plan_id = preview["plan_id"].as_str().unwrap().to_owned();
    let stored: Value =
        serde_json::from_str(&fs::read_to_string(root.join("data\\plans").join(format!("{plan_id}.json"))).unwrap()).unwrap();
    let plan = &stored["plan"];
    let items: Vec<String> = plan["items"].as_array().unwrap().iter().map(|i| i["path"].as_str().unwrap().to_owned()).collect();
    let protected: Vec<String> =
        plan["protected_paths"].as_array().unwrap().iter().map(|p| p.as_str().unwrap().to_owned()).collect();

    // Plan = exactly the eligible, identified entries of the selected groups (SERVICE 8.2).
    let expected: BTreeSet<String> = scanned
        .iter()
        .filter(|(_, i)| {
            ["chrome-cache", "crash-dumps"].contains(&i["group_id"].as_str().unwrap())
                && i["eligible"] == true
                && !i["identity"].is_null()
        })
        .map(|(p, _)| p.clone())
        .collect();
    let got: BTreeSet<String> = items.iter().cloned().collect();
    assert_eq!(got, expected, "CONTROLLER plan is exactly the eligible identified entries");
    for item in &items {
        assert!(scanned[item]["eligible"] == true, "CONTROLLER ineligible entry in plan: {item}");
        // In-use entries may be planned (SERVICE 8: D's ItemGuard skips them at execution);
        // they are still required to survive, see the keeper check after the clean.
        for (rel, _) in must_stay.iter().filter(|(rel, _)| !rel.contains("Profile Busy")) {
            assert!(!under(&root.join(rel).to_str().unwrap(), item), "CONTROLLER plan covers a keeper: {rel}");
        }
    }
    for (rel, _) in &must_go {
        let p = root.join(rel);
        assert!(items.iter().any(|i| under(p.to_str().unwrap(), i)), "CONTROLLER plan misses {rel}");
    }
    for rel in [format!("{UD}\\Default\\Cookies"), format!("{UD}\\Default\\Network")] {
        let p = root.join(&rel);
        assert!(protected.iter().any(|q| q.eq_ignore_ascii_case(p.to_str().unwrap())), "CONTROLLER protected_paths missing {rel}");
    }
    let preview_bytes: u64 = preview["total_bytes"].as_str().unwrap().parse().unwrap();

    let args = json!({"planId": plan_id, "confirmToken": preview["confirm_token"]});
    let started = call(&s, "clean_start", args.clone());
    let progress = wait(&s, "clean_progress");
    assert_eq!(progress["state"], "completed", "CONTROLLER clean state");
    let result = call(&s, "clean_result", json!({"cleanId": started["clean_id"]}));
    assert_eq!(code(&s, "clean_start", args.clone()), "invalid", "CONTROLLER token replay");
    assert_eq!(code(&s, "clean_prepare", json!({"groupIds": ["chrome-cache"]})), "stale", "CONTROLLER scan authority consumed");

    let mut after = BTreeMap::new();
    inventory(&root, &root, &mut after);
    let deleted: Vec<(&String, &u64)> = before.iter().filter(|(k, _)| !after.contains_key(*k)).collect();
    for (rel, _) in &deleted {
        let p = root.join(rel.trim_end_matches("|reparse"));
        assert!(items.iter().any(|i| under(p.to_str().unwrap(), i)), "CONTROLLER deleted outside the plan: {rel}");
    }
    for (rel, n) in &must_go {
        assert!(!after.contains_key(rel), "CONTROLLER planned file still present: {rel} ({n})");
    }
    for (rel, n) in &must_stay {
        assert_eq!(after.get(rel).copied(), Some(*n as u64), "CONTROLLER keeper changed: {rel}");
    }
    for (rel, n) in &after {
        if let Some(m) = before.get(rel) {
            assert_eq!(m, n, "CONTROLLER size changed: {rel}");
        }
    }
    assert!(after.keys().all(|k| before.contains_key(k)), "CONTROLLER unexpected new files outside data");
    let deleted_bytes: u64 = deleted.iter().map(|(_, n)| **n).sum();
    let freed: u64 = result["freed_bytes"].as_str().unwrap().parse().unwrap();
    assert_eq!(freed, deleted_bytes, "CONTROLLER freed bytes equal deleted file bytes");
    drop(s);

    let off = service(&root, false);
    assert_eq!(code(&off, "clean_prepare", json!({"groupIds": ["chrome-cache"]})), "unavailable", "CONTROLLER disabled prepare");
    assert_eq!(code(&off, "clean_start", args), "unavailable", "CONTROLLER disabled start with a real old plan");

    let rel = |p: &str| p.strip_prefix(root.to_str().unwrap()).unwrap_or(p).to_owned();
    println!(
        "{}",
        json!({
            "fixture": root.file_name().unwrap().to_str().unwrap(),
            "scan_state": done["state"],
            "groups_in_view": view.to_string().matches("\"group_id\"").count(),
            "plan_items": items.iter().map(|p| rel(p)).collect::<Vec<_>>(),
            "protected_paths": protected.len(),
            "preview_total_bytes": preview_bytes,
            "clean_state": progress["state"],
            "freed_bytes": freed,
            "deleted": deleted.iter().map(|(k, n)| json!([k, n])).collect::<Vec<_>>(),
            "result_groups": result["groups"],
        })
    );
}
