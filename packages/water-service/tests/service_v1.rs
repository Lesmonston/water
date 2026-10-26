#![forbid(unsafe_code)]

use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet, VecDeque, hash_map::RandomState},
    fs::{self, File, FileTimes, OpenOptions},
    hash::{BuildHasher, Hasher},
    os::windows::fs::OpenOptionsExt,
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use water_junk_rules::KnownFolders;
use water_process_scan::InUseSpec;
use water_service::{DriveInfo, FolderPicker, IpcError, Platform, Service, ServiceConfig};

const NOW: u64 = 1_800_000_000;
const DISABLED: &str = "这一版只做体检，清理功能会在下一版开放。";

#[derive(Clone)]
struct Fake {
    folders: KnownFolders,
    now: Arc<AtomicU64>,
    hold: Arc<AtomicBool>,
    entered: Arc<AtomicBool>,
    batches: Arc<AtomicU64>,
    in_use_calls: Arc<AtomicU64>,
    picks: Arc<Mutex<VecDeque<Option<String>>>>,
    panic_drives: Arc<AtomicBool>,
    panic_now: Arc<AtomicBool>,
    names: Arc<Mutex<Vec<(String, String)>>>,
}
impl Platform for Fake {
    fn known_folders(&self) -> Result<KnownFolders, IpcError> {
        Ok(self.folders.clone())
    }
    fn drives(&self) -> Vec<DriveInfo> {
        if std::thread::current().name() == Some("water-scan")
            && self.panic_drives.swap(false, Ordering::SeqCst)
        {
            panic!("fake platform: drives failed inside the scan task");
        }
        vec![DriveInfo {
            root: "F:\\".into(),
            is_system: true,
            total_bytes: 1_000_000,
            free_bytes: 800_000,
        }]
    }
    fn now(&self) -> SystemTime {
        if self.panic_now.swap(false, Ordering::SeqCst) {
            panic!("fake platform: clock failed");
        }
        UNIX_EPOCH + Duration::from_secs(self.now.load(Ordering::SeqCst))
    }
    fn local_date(&self, at: SystemTime) -> (u32, u32) {
        let seconds = at.duration_since(UNIX_EPOCH).unwrap().as_secs() + 8 * 3600;
        let z = (seconds / 86400) as i64 + 719468;
        let era = z / 146097;
        let d = z - era * 146097;
        let y = (d - d / 1460 + d / 36524 - d / 146096) / 365;
        let day = d - (365 * y + y / 4 - y / 100);
        let m = (5 * day + 2) / 153;
        (
            (m + if m < 10 { 3 } else { -9 }) as u32,
            (day - (153 * m + 2) / 5 + 1) as u32,
        )
    }
    fn in_use(&self, spec: &InUseSpec, path: &str) -> Option<String> {
        self.in_use_calls.fetch_add(1, Ordering::SeqCst);
        if spec.mode != water_process_scan::InUseMode::None
            && let Some((_, name)) = self
                .names
                .lock()
                .unwrap()
                .iter()
                .find(|(part, _)| path.contains(part.as_str()))
        {
            return Some(name.clone());
        }
        (spec.mode != water_process_scan::InUseMode::None && path.contains("Profile Busy"))
            .then(|| "chrome.exe".into())
    }
    fn begin_in_use_batch(&self) {
        self.batches.fetch_add(1, Ordering::SeqCst);
        self.entered.store(true, Ordering::SeqCst);
        while self.hold.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(1));
        }
    }
}
impl FolderPicker for Fake {
    fn pick(&self) -> Result<Option<String>, IpcError> {
        Ok(self.picks.lock().unwrap().pop_front().flatten())
    }
}

struct Fixture {
    root: PathBuf,
    parent: PathBuf,
    data: PathBuf,
    fake: Fake,
}
impl Fixture {
    fn new() -> Self {
        let tree = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();
        let parent = tree.join(".local/w3-f1-fixtures");
        fs::create_dir_all(&parent).unwrap();
        let mut h = RandomState::new().build_hasher();
        h.write_u8(8);
        let root = parent.join(format!("service-{:016x}", h.finish()));
        fs::create_dir(&root).unwrap();
        let path = |name: &str| root.join(name).to_str().unwrap().replace('/', "\\");
        let local = path("local_app_data");
        let windows = path("windows");
        let folders=KnownFolders::from_json(&json!({"known_folders_version":"water.known-folders.v1","user_profile":path("user_profile"),"local_app_data":local,"roaming_app_data":path("roaming_app_data"),"user_temp":format!("{local}\\Temp"),"system_temp":format!("{windows}\\Temp"),"windows":windows,"program_data":path("program_data"),"downloads":path("downloads")}).to_string()).unwrap();
        for path in folders.values() {
            fs::create_dir_all(path).unwrap();
        }
        let data = root.join("data");
        fs::create_dir(&data).unwrap();
        let fake = Fake {
            folders,
            now: Arc::new(AtomicU64::new(NOW)),
            hold: Arc::new(AtomicBool::new(false)),
            entered: Arc::new(AtomicBool::new(false)),
            batches: Arc::new(AtomicU64::new(0)),
            in_use_calls: Arc::new(AtomicU64::new(0)),
            picks: Arc::new(Mutex::new(VecDeque::new())),
            panic_drives: Arc::new(AtomicBool::new(false)),
            panic_now: Arc::new(AtomicBool::new(false)),
            names: Arc::new(Mutex::new(Vec::new())),
        };
        Self {
            root,
            parent,
            data,
            fake,
        }
    }
    fn service(&self, enabled: bool) -> Service {
        Service::new(ServiceConfig {
            data_dir: self.data.clone(),
            app_version: "0.1.0".into(),
            clean_enabled: enabled,
            platform: Box::new(self.fake.clone()),
            picker: Box::new(self.fake.clone()),
        })
        .unwrap()
    }
    fn seed(&self) {
        self.file("user_profile/.claude/projects/keep.json", 53);
        self.file(
            "local_app_data/Google/Chrome/User Data/Default/Cache/cache.bin",
            100,
        );
        self.file(
            "local_app_data/Google/Chrome/User Data/Profile Busy/Cache/cache.bin",
            200,
        );
        self.file(
            "local_app_data/Google/Chrome/User Data/Default/Network/Cookies",
            33,
        );
        self.file(
            "local_app_data/Google/Chrome/User Data/Default/Local Storage/store",
            43,
        );
        self.file(
            "local_app_data/Google/Chrome/User Data/OptGuideOnDeviceModel/model",
            40,
        );
        self.file(
            "user_profile/.codex/.tmp/marketplaces/.staging/marketplace-upgrade-old/data",
            70,
        );
        self.file("user_profile/.codex/sessions/keep", 80);
        self.file("local_app_data/npm-cache/cache", 90);
        self.file("downloads/old.exe", 60);
        for i in 0..8 {
            self.file(&format!("windows/Temp/plain-{i}.tmp"), 10);
        }
        self.age_all(NOW - 10 * 86400);
    }
    fn file(&self, relative: &str, size: u64) -> PathBuf {
        let path = self.root.join(relative);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        File::create(&path).unwrap().set_len(size).unwrap();
        path
    }
    fn age_all(&self, secs: u64) {
        age(&self.root, secs);
    }
    fn pick(&self, value: Option<&Path>) {
        self.fake
            .picks
            .lock()
            .unwrap()
            .push_back(value.map(|p| p.to_str().unwrap().replace('/', "\\")));
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        self.fake.hold.store(false, Ordering::SeqCst);
        // Only this freshly created directory, with both its lexical and resolved parent verified.
        assert_eq!(self.root.parent(), Some(self.parent.as_path()));
        assert!(
            self.root
                .file_name()
                .unwrap()
                .to_str()
                .unwrap()
                .starts_with("service-")
        );
        let actual = fs::canonicalize(&self.root).unwrap();
        let parent = fs::canonicalize(&self.parent).unwrap();
        assert_eq!(actual.parent(), Some(parent.as_path()));
        fs::remove_dir_all(&self.root).unwrap();
    }
}

fn age(path: &Path, seconds: u64) {
    if path.is_dir() {
        for entry in fs::read_dir(path).unwrap() {
            age(&entry.unwrap().path(), seconds);
        }
    }
    let file = OpenOptions::new()
        .access_mode(0x100)
        .custom_flags(0x02000000)
        .open(path)
        .unwrap();
    file.set_times(FileTimes::new().set_modified(UNIX_EPOCH + Duration::from_secs(seconds)))
        .unwrap();
}
fn call(s: &Service, c: &str, a: Value) -> Value {
    let started = Instant::now();
    let result = s.call(c, a).unwrap_or_else(|e| panic!("{c}: {e:?}"));
    assert!(
        started.elapsed() <= Duration::from_millis(50),
        "SERVICE_RETURN_BUDGET: {c}"
    );
    result
}
fn wait(s: &Service, c: &str) -> Value {
    let start = Instant::now();
    let mut percent = 0;
    loop {
        let p = call(s, c, json!({}));
        if c == "scan_progress" {
            let current = p["percent"].as_u64().unwrap();
            assert!(current >= percent);
            percent = current;
        }
        if p["state"] != "running" {
            return p;
        }
        assert!(
            start.elapsed() < Duration::from_secs(30),
            "operation did not finish"
        );
        std::thread::sleep(Duration::from_millis(2));
    }
}
fn scanned(s: &Service) -> Value {
    let id = call(s, "scan_start", json!({}));
    let p = wait(s, "scan_progress");
    assert_eq!(p["state"], "completed");
    assert_eq!(p["percent"], 100);
    call(s, "scan_result", json!({"scanId":id["scan_id"]}))
}
fn fixtures() -> Value {
    serde_json::from_str(include_str!(
        "../../../contracts/checkup-v1/ui-fixtures.json"
    ))
    .unwrap()
}
fn shape(actual: &Value, sample: &Value) {
    match (actual, sample) {
        (Value::Object(a), Value::Object(b)) => {
            assert_eq!(
                a.keys().collect::<Vec<_>>(),
                b.keys().collect::<Vec<_>>(),
                "shape {actual}"
            );
            for (key, value) in a {
                shape(value, &b[key]);
            }
        }
        (Value::Array(a), Value::Array(b)) => {
            if let (Some(a), Some(b)) = (a.first(), b.first()) {
                shape(a, b);
            }
        }
        (Value::Null, _) | (_, Value::Null) => {}
        (a, b) => assert_eq!(
            std::mem::discriminant(a),
            std::mem::discriminant(b),
            "scalar shape {a} / {b}"
        ),
    }
}
fn inventory(root: &Path) -> BTreeMap<PathBuf, u64> {
    fn walk(p: &Path, out: &mut BTreeMap<PathBuf, u64>) {
        for e in fs::read_dir(p).unwrap() {
            let p = e.unwrap().path();
            if p.is_dir() {
                walk(&p, out);
            } else {
                out.insert(p.clone(), fs::metadata(&p).unwrap().len());
            }
        }
    }
    let mut out = BTreeMap::new();
    walk(root, &mut out);
    out
}
fn scan_saved(f: &Fixture, result: &Value) -> Value {
    serde_json::from_slice(
        &fs::read(
            f.data
                .join("scans")
                .join(format!("{}.json", result["scan_id"].as_str().unwrap())),
        )
        .unwrap(),
    )
    .unwrap()
}
fn in_use_labels(result: &Value) -> BTreeMap<String, Value> {
    groups(result)
        .iter()
        .map(|g| {
            (
                g["group_id"].as_str().unwrap().to_owned(),
                g["in_use"].clone(),
            )
        })
        .collect()
}
fn group_in_use(result: &Value, id: &str) -> Value {
    groups(result).iter().find(|g| g["group_id"] == id).unwrap()["in_use"].clone()
}
fn groups(result: &Value) -> Vec<&Value> {
    result["categories"]
        .as_array()
        .unwrap()
        .iter()
        .flat_map(|c| c["groups"].as_array().unwrap())
        .collect()
}

#[test]
fn service_ipc_contract() {
    fn send_sync<T: Send + Sync>() {}
    send_sync::<Service>();
    let f = Fixture::new();
    f.seed();
    let s = f.service(true);
    let samples = fixtures();
    shape(
        &call(&s, "app_state", json!({})),
        &samples["app_state_fresh"],
    );
    shape(
        &call(&s, "scan_progress", json!({})),
        &samples["scan_progress_sequence"][0],
    );
    shape(
        &call(&s, "clean_progress", json!({})),
        &samples["clean_progress_sequence"][0],
    );
    let commands = [
        ("app_state", json!({})),
        ("scan_start", json!({})),
        ("scan_cancel", json!({"scanId":"missing"})),
        ("scan_progress", json!({})),
        ("scan_result", json!({"scanId":"missing"})),
        ("group_detail", json!({"groupId":"missing"})),
        ("clean_prepare", json!({"groupIds":["chrome-cache"]})),
        (
            "clean_start",
            json!({"planId":"missing","confirmToken":"abc"}),
        ),
        ("clean_stop", json!({})),
        ("clean_progress", json!({})),
        ("clean_result", json!({"cleanId":"missing"})),
        ("trends", json!({})),
        ("history_list", json!({})),
        ("locations_get", json!({})),
        (
            "locations_set_category",
            json!({"category":"browser","enabled":true}),
        ),
        ("custom_root_add", json!({})),
        ("custom_root_remove", json!({"rootId":"missing"})),
    ];
    for (c, a) in &commands {
        let mut extra = a.clone();
        extra["extra"] = json!(1);
        assert_eq!(s.call(c, extra).unwrap_err().code, "invalid");
        assert_eq!(s.call(c, Value::Null).unwrap_err().code, "invalid");
        for k in a.as_object().unwrap().keys() {
            let mut missing = a.clone();
            missing.as_object_mut().unwrap().remove(k);
            assert_eq!(s.call(c, missing).unwrap_err().code, "invalid");
            let mut wrong = a.clone();
            wrong[k] = json!(17);
            assert_eq!(s.call(c, wrong).unwrap_err().code, "invalid");
        }
    }
    for (c, a) in [
        ("unknown", json!({})),
        ("scan_result", json!({"scanId":"../evil"})),
        ("scan_result", json!({"scanId":"C:\\x"})),
        ("clean_start", json!({"planId":"a","confirmToken":"C:\\x"})),
        ("clean_prepare", json!({"groupIds":[]})),
        ("clean_prepare", json!({"groupIds":["a","a"]})),
        (
            "locations_set_category",
            json!({"category":"custom","enabled":true}),
        ),
    ] {
        let error = s.call(c, a).unwrap_err();
        assert_eq!(error.code, "invalid");
        shape(&json!(error), &samples["errors"]["invalid"]);
    }
    let started = call(&s, "scan_start", json!({}));
    shape(&started, &samples["scan_start"]);
    wait(&s, "scan_progress");
    let result = call(&s, "scan_result", json!({"scanId":started["scan_id"]}));
    shape(&result, &samples["scan_result"]);
    shape(
        &call(&s, "app_state", json!({})),
        &samples["app_state_after_scan"],
    );
    shape(
        &call(&s, "group_detail", json!({"groupId":"chrome-cache"})),
        &samples["group_details"]["chrome-cache"],
    );
    shape(&call(&s, "locations_get", json!({})), &samples["locations"]);
    shape(
        &call(
            &s,
            "locations_set_category",
            json!({"category":"crash_log","enabled":false}),
        ),
        &samples["locations"],
    );
    shape(
        &call(&s, "custom_root_add", json!({})),
        &samples["custom_root_add_cancelled"],
    );
    let project = f.root.join("project");
    fs::create_dir(&project).unwrap();
    f.pick(Some(&project));
    let added = call(&s, "custom_root_add", json!({}));
    shape(&added, &samples["custom_root_add_added"]);
    shape(
        &call(
            &s,
            "custom_root_remove",
            json!({"rootId":added["added"]["root_id"]}),
        ),
        &samples["locations"],
    );
    shape(&call(&s, "trends", json!({})), &samples["trends"]);
    shape(
        &call(&s, "history_list", json!({})),
        &samples["history_list"],
    );
    assert_eq!(
        s.call("scan_cancel", json!({"scanId":started["scan_id"]}))
            .unwrap_err()
            .code,
        "not_found"
    );
    assert_eq!(call(&s, "clean_stop", json!({})), json!({}));
    let preview = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    shape(&preview, &samples["clean_prepare_default"]);
    let clean = call(
        &s,
        "clean_start",
        json!({"planId":preview["plan_id"],"confirmToken":preview["confirm_token"]}),
    );
    shape(&clean, &samples["clean_start"]);
    shape(
        &wait(&s, "clean_progress"),
        &samples["clean_progress_sequence"][2],
    );
    shape(
        &call(&s, "clean_result", json!({"cleanId":clean["clean_id"]})),
        &samples["clean_result"],
    );
}

#[test]
fn service_scan_views() {
    let f = Fixture::new();
    f.seed();
    for i in 0..205 {
        f.file(
            &format!("local_app_data/Google/Chrome/User Data/Profile {i}/Cache/x"),
            i + 1,
        );
    }
    f.age_all(NOW - 10 * 86400);
    let s = f.service(false);
    f.fake.hold.store(true, Ordering::SeqCst);
    let id = call(&s, "scan_start", json!({}));
    assert_eq!(call(&s, "scan_progress", json!({}))["state"], "running");
    assert_eq!(s.call("scan_start", json!({})).unwrap_err().code, "busy");
    assert_eq!(
        s.call(
            "locations_set_category",
            json!({"category":"browser","enabled":false})
        )
        .unwrap_err()
        .code,
        "busy"
    );
    f.fake.hold.store(false, Ordering::SeqCst);
    assert_eq!(wait(&s, "scan_progress")["state"], "completed");
    let result = call(&s, "scan_result", json!({"scanId":id["scan_id"]}));
    let order = [
        "agent_tool",
        "browser",
        "system_temp",
        "app_leftover",
        "dev_cache",
        "crash_log",
        "gpu_system",
        "custom",
        "unrecognized",
    ];
    let indices: Vec<_> = result["categories"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| order.iter().position(|v| *v == c["category"]).unwrap())
        .collect();
    assert!(indices.windows(2).all(|w| w[0] <= w[1]));
    let mut totals = [0u64; 6];
    for category in result["categories"].as_array().unwrap() {
        let mut previous = None;
        for g in category["groups"].as_array().unwrap() {
            let rank = ["recommended", "confirm", "advisory", "protected"]
                .iter()
                .position(|v| *v == g["level"])
                .unwrap();
            let total = g["total_bytes"].as_str().unwrap().parse::<u64>().unwrap();
            let key = (rank, std::cmp::Reverse(total));
            if let Some(p) = previous {
                assert!(p <= key);
            }
            previous = Some(key);
            if category["category"] == "unrecognized" {
                totals[5] += total;
            } else {
                totals[0] += total;
            }
            totals[rank + 1] += if rank == 0 {
                g["eligible_bytes"]
                    .as_str()
                    .unwrap()
                    .parse::<u64>()
                    .unwrap()
            } else {
                total
            };
            let selectable = rank < 2 && g["eligible_count"].as_u64().unwrap() > 0;
            assert_eq!(g["selectable"], selectable);
            assert_eq!(g["default_selected"], rank == 0 && selectable);
        }
    }
    for (key, total) in [
        "recognized_bytes",
        "recommended_bytes",
        "confirm_bytes",
        "advisory_bytes",
        "protected_bytes",
        "unrecognized_bytes",
    ]
    .iter()
    .zip(totals)
    {
        assert_eq!(result["totals"][key], total.to_string());
    }
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    assert_eq!(detail["items"].as_array().unwrap().len(), 200);
    assert_eq!(detail["items_total"], 207);
    let protected = call(
        &s,
        "group_detail",
        json!({"groupId":"claude-code-sessions"}),
    );
    assert_eq!(protected["group"]["selectable"], false);
    assert_eq!(
        protected["items"][0]["reason_zh"],
        "这一类只统计占用，不清理"
    );
    f.fake.hold.store(true, Ordering::SeqCst);
    let cancel = call(&s, "scan_start", json!({}));
    call(&s, "scan_cancel", json!({"scanId":cancel["scan_id"]}));
    f.fake.hold.store(false, Ordering::SeqCst);
    assert_eq!(wait(&s, "scan_progress")["state"], "cancelled");
    let labels = in_use_labels(&call(&s, "scan_result", json!({"scanId":id["scan_id"]})));
    let detail_in_use =
        call(&s, "group_detail", json!({"groupId":"chrome-cache"}))["group"]["in_use"].clone();
    assert_eq!(
        detail_in_use["process_label_zh"], "Chrome 正在运行，将跳过占用的项",
        "SERVICE_IN_USE_SAVED: label before restart"
    );
    assert_eq!(labels["chrome-cache"], detail_in_use);
    drop(s);
    let in_use_calls = f.fake.in_use_calls.load(Ordering::SeqCst);
    let s = f.service(false);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        id["scan_id"]
    );
    assert_eq!(
        in_use_labels(&call(&s, "scan_result", json!({"scanId":id["scan_id"]}))),
        labels,
        "SERVICE_IN_USE_SAVED: scan_result after restart"
    );
    assert_eq!(
        call(&s, "group_detail", json!({"groupId":"chrome-cache"}))["group"]["in_use"],
        detail_in_use,
        "SERVICE_IN_USE_SAVED: group_detail after restart"
    );
    assert_eq!(
        f.fake.in_use_calls.load(Ordering::SeqCst),
        in_use_calls,
        "SERVICE_IN_USE_SAVED: views called Platform::in_use after restart"
    );
    assert_eq!(f.fake.batches.load(Ordering::SeqCst), 2);
}

#[test]
fn service_clean_flow() {
    let f = Fixture::new();
    f.seed();
    let disabled = f.service(false);
    scanned(&disabled);
    let before = inventory(&f.root);
    for (c, a) in [
        ("clean_prepare", json!({"groupIds":["chrome-cache"]})),
        ("clean_start", json!({"planId":"p","confirmToken":"t"})),
        ("clean_prepare", json!({"groupIds":[]})),
        ("clean_prepare", json!({"groupIds":["a","a"]})),
        ("clean_prepare", json!({})),
        (
            "clean_start",
            json!({"planId":"../x","confirmToken":"t","extra":1}),
        ),
    ] {
        let result = disabled.call(c, a);
        assert!(
            matches!(result,Err(ref e) if e.code=="unavailable" && e.message_zh==DISABLED),
            "SERVICE_CLEAN_DISABLED: {result:?}"
        );
    }
    assert_eq!(
        before,
        inventory(&f.root),
        "SERVICE_CLEAN_DISABLED: files changed"
    );
    drop(disabled);
    let s = f.service(true);
    let result = scanned(&s);
    assert_eq!(
        s.call(
            "clean_prepare",
            json!({"groupIds":["claude-code-sessions"]})
        )
        .unwrap_err()
        .code,
        "invalid",
        "SERVICE_PROTECTED_PLAN"
    );
    let preview = call(
        &s,
        "clean_prepare",
        json!({"groupIds":["chrome-cache","npm-cache"]}),
    );
    // A real plan and token from an enabled build must not run once the switch is off.
    let before_off = inventory(&f.root);
    let off = f.service(false);
    let replay = off.call(
        "clean_start",
        json!({"planId":preview["plan_id"],"confirmToken":preview["confirm_token"]}),
    );
    if replay.is_ok() {
        wait(&off, "clean_progress");
    }
    assert!(
        matches!(replay,Err(ref e) if e.code=="unavailable" && e.message_zh==DISABLED),
        "SERVICE_CLEAN_DISABLED: real plan {replay:?}"
    );
    drop(off);
    assert_eq!(
        before_off,
        inventory(&f.root),
        "SERVICE_CLEAN_DISABLED: real plan changed files"
    );
    let plan_path = f
        .data
        .join("plans")
        .join(format!("{}.json", preview["plan_id"].as_str().unwrap()));
    let plan_text = fs::read_to_string(&plan_path).unwrap();
    let plan: Value = serde_json::from_str(&plan_text).unwrap();
    assert!(!plan_text.contains(preview["confirm_token"].as_str().unwrap()));
    assert_eq!(preview["confirm_token"].as_str().unwrap().len(), 32);
    let protected: Vec<_> = scan_saved(&f, &result)["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|i| {
            groups(&result)
                .iter()
                .any(|g| g["group_id"] == i["group_id"] && g["level"] == "protected")
        })
        .map(|i| i["path"].clone())
        .collect();
    assert!(!protected.is_empty());
    assert_eq!(
        plan["plan"]["protected_paths"],
        json!(protected),
        "SERVICE_PROTECTED_PLAN: missing protected paths"
    );
    let files_before = inventory(&f.root);
    let batch_before = f.fake.batches.load(Ordering::SeqCst);
    let args = json!({"planId":preview["plan_id"],"confirmToken":preview["confirm_token"]});
    let started = call(&s, "clean_start", args.clone());
    let p = wait(&s, "clean_progress");
    assert_eq!(p["state"], "completed");
    let reused = s.call("clean_start", args);
    // A deliberately broken replay gate can start a second fixture-only task. Drain it
    // before asserting, so a negative control never races fixture teardown.
    if reused.is_ok() {
        wait(&s, "clean_progress");
    }
    assert!(
        matches!(reused,Err(ref e) if e.code=="invalid"),
        "SERVICE_TOKEN_ONCE: {reused:?}"
    );
    let clean = call(&s, "clean_result", json!({"cleanId":started["clean_id"]}));
    assert_eq!(clean["freed_bytes"], "190");
    assert_eq!(clean["groups"][0]["status"], "partial");
    assert!(
        f.root
            .join("local_app_data/Google/Chrome/User Data/Profile Busy/Cache/cache.bin")
            .exists()
    );
    for path in protected {
        assert!(
            Path::new(path.as_str().unwrap()).exists(),
            "SERVICE_PROTECTED_PLAN: protected entry disappeared"
        );
    }
    for (path, size) in files_before {
        if path.starts_with(&f.data) {
            continue;
        }
        if !path.exists() {
            assert!(
                plan["plan"]["items"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|i| path.starts_with(Path::new(i["path"].as_str().unwrap())))
            );
        } else {
            assert_eq!(fs::metadata(path).unwrap().len(), size);
        }
    }
    let journal = fs::read_to_string(clean["journal_display_path"].as_str().unwrap()).unwrap();
    let mut intents = BTreeSet::new();
    for line in journal.lines() {
        let entry: Value = serde_json::from_str(line).unwrap();
        let id = entry["item_id"].as_str().unwrap().to_owned();
        if entry["event"] == "intent" {
            assert!(intents.insert(id));
        } else {
            assert!(intents.contains(&id));
        }
    }
    assert_eq!(f.fake.batches.load(Ordering::SeqCst), batch_before + 1);
    let s2 = f.service(true);
    assert_eq!(
        s2.call("clean_prepare", json!({"groupIds":["chrome-cache"]}))
            .unwrap_err()
            .code,
        "stale"
    );
    drop(s2);
    scanned(&s);
    let old = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    scanned(&s);
    assert_eq!(
        s.call(
            "clean_start",
            json!({"planId":old["plan_id"],"confirmToken":old["confirm_token"]})
        )
        .unwrap_err()
        .code,
        "stale"
    );
    let reloaded = f.service(true);
    assert_eq!(
        reloaded
            .call(
                "clean_start",
                json!({"planId":old["plan_id"],"confirmToken":old["confirm_token"]})
            )
            .unwrap_err()
            .code,
        "stale"
    );
    drop(reloaded);
    let stoppable = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    f.fake.hold.store(true, Ordering::SeqCst);
    let stopped = call(
        &s,
        "clean_start",
        json!({"planId":stoppable["plan_id"],"confirmToken":stoppable["confirm_token"]}),
    );
    call(&s, "clean_stop", json!({}));
    f.fake.hold.store(false, Ordering::SeqCst);
    assert_eq!(wait(&s, "clean_progress")["state"], "stopped");
    let stopped = call(&s, "clean_result", json!({"cleanId":stopped["clean_id"]}));
    assert_eq!(stopped["freed_bytes"], "0");
    assert_eq!(stopped["groups"][0]["notes_zh"][0], "1 项因停止未处理");
    // An identity-bearing item that is not eligible (too recent) must stay out of the plan.
    let fresh = f.file(
        "user_profile/.codex/.tmp/marketplaces/.staging/marketplace-upgrade-fresh/data",
        20,
    );
    age(fresh.parent().unwrap(), NOW);
    let latest = scanned(&s);
    let selected = ["codex-marketplace-staging", "chrome-cache"];
    let preview = s
        .call("clean_prepare", json!({"groupIds":selected}))
        .unwrap_or_else(|e| panic!("SERVICE_PLAN_ITEMS: prepare {e:?}"));
    let items = scan_saved(&f, &latest)["result"]["items"]
        .as_array()
        .unwrap()
        .clone();
    let fresh_path = fresh.parent().unwrap().to_str().unwrap().replace('/', "\\");
    assert!(
        items.iter().any(|i| i["path"] == fresh_path.as_str()
            && i["eligible"] == false
            && !i["identity"].is_null()),
        "SERVICE_PLAN_ITEMS: fixture lacks an identity-bearing ineligible item"
    );
    let expected: BTreeSet<String> = items
        .iter()
        .filter(|i| {
            selected.contains(&i["group_id"].as_str().unwrap())
                && i["eligible"] == true
                && !i["identity"].is_null()
        })
        .map(|i| i["path"].as_str().unwrap().to_owned())
        .collect();
    let plan: Value = serde_json::from_str(
        &fs::read_to_string(
            f.data
                .join("plans")
                .join(format!("{}.json", preview["plan_id"].as_str().unwrap())),
        )
        .unwrap(),
    )
    .unwrap();
    let planned: BTreeSet<String> = plan["plan"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| i["path"].as_str().unwrap().to_owned())
        .collect();
    assert!(expected.len() >= 2, "SERVICE_PLAN_ITEMS: {expected:?}");
    assert!(
        !planned.contains(&fresh_path),
        "SERVICE_PLAN_ITEMS: ineligible item planned"
    );
    assert_eq!(planned, expected, "SERVICE_PLAN_ITEMS");
}

#[test]
fn service_trends_locations() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(false);
    scanned(&s);
    f.fake.now.store(NOW + 2 * 86400, Ordering::SeqCst);
    for i in 0..25 {
        let p = f.file(
            &format!("user_profile/.codex/.tmp/marketplaces/.staging/marketplace-upgrade-{i}/data"),
            30,
        );
        age(p.parent().unwrap(), NOW + 2 * 86400 - 7200);
    }
    for i in 0..25 {
        let p = f.file(
            &format!("user_profile/.cache/codex-runtimes/runtime-{i}/data"),
            20,
        );
        age(p.parent().unwrap(), NOW - 10 * 86400);
    }
    let result = scanned(&s);
    let insights = result["insights"].as_array().unwrap();
    assert!(insights.iter().any(|v| v["kind"] == "leak"));
    assert!(insights.iter().any(|v| v["kind"] == "growth"));
    assert!(
        insights
            .iter()
            .all(|v| v["message_zh"].as_str().unwrap().contains("+<1 MB"))
    );
    let trends = call(&s, "trends", json!({}));
    assert_eq!(trends["points"].as_array().unwrap().len(), 2);
    assert!(!trends["growth"].as_array().unwrap().is_empty());
    assert_eq!(trends["leaks"][0]["active"], true);
    shape(&trends, &fixtures()["trends"]);
    let history = call(&s, "history_list", json!({}));
    assert_eq!(history.as_array().unwrap().len(), 2);
    shape(&history, &fixtures()["history_list"]);
    assert!(
        call(&s, "app_state", json!({}))["last_scan"]["added_7d_bytes"]
            .as_str()
            .unwrap()
            .parse::<u64>()
            .unwrap()
            > 0
    );
    call(
        &s,
        "locations_set_category",
        json!({"category":"agent_tool","enabled":false}),
    );
    let cached = call(&s, "scan_result", json!({"scanId":result["scan_id"]}));
    assert!(
        groups(&cached)
            .iter()
            .filter(|g| g["category"] == "agent_tool")
            .all(|g| g["selectable"] == false && g["default_selected"] == false)
    );
    assert_eq!(
        call(
            &s,
            "group_detail",
            json!({"groupId":"codex-marketplace-staging"})
        )["group"]["selectable"],
        false
    );
    let off = scanned(&s);
    assert!(
        !groups(&off)
            .iter()
            .any(|g| g["category"] == "agent_tool" && g["level"] != "protected")
    );
    assert!(
        groups(&off)
            .iter()
            .any(|g| g["group_id"] == "claude-code-sessions")
    );
    let project = f.root.join("Project 123");
    fs::create_dir(&project).unwrap();
    let target = project.join("target");
    fs::create_dir(&target).unwrap();
    File::create(target.join("CACHEDIR.TAG"))
        .unwrap()
        .set_len(43)
        .unwrap();
    age(&project, NOW - 86400);
    f.pick(Some(&project));
    let added = call(&s, "custom_root_add", json!({}));
    assert_eq!(added["added"]["root_id"], "project123");
    f.pick(Some(&project));
    assert_eq!(call(&s, "custom_root_add", json!({})), added);
    for path in [
        Path::new("F:\\"),
        f.root.as_path(),
        Path::new(&f.fake.folders.windows),
    ] {
        f.pick(Some(path));
        assert_eq!(
            s.call("custom_root_add", json!({})).unwrap_err().message_zh,
            "这个位置太大或包含系统目录，请选择具体的项目文件夹。"
        );
    }
    f.pick(None);
    assert_eq!(
        call(&s, "custom_root_add", json!({})),
        json!({"cancelled":true})
    );
    scanned(&s);
    let locations = call(&s, "locations_get", json!({}));
    assert_eq!(locations["custom_roots"][0]["found_bytes"], "43");
    assert!(!locations["custom_roots"][0]["last_scanned_at"].is_null());
    assert!(
        call(&s, "custom_root_remove", json!({"rootId":"project123"}))["custom_roots"]
            .as_array()
            .unwrap()
            .is_empty()
    );
    assert_eq!(
        s.call("custom_root_remove", json!({"rootId":"project123"}))
            .unwrap_err()
            .code,
        "not_found"
    );
}

#[test]
fn service_storage_safety() {
    let f = Fixture::new();
    f.seed();
    let before = inventory(&f.root);
    let s = f.service(false);
    let result = scanned(&s);
    call(
        &s,
        "locations_set_category",
        json!({"category":"browser","enabled":false}),
    );
    let after = inventory(&f.root);
    for (p, n) in &before {
        assert_eq!(after.get(p), Some(n));
    }
    for p in after.keys().filter(|p| !before.contains_key(*p)) {
        assert!(p.starts_with(&f.data));
    }
    // Holding the old settings file with delete-sharing denied makes rename fail. The old bytes
    // must remain intact and the new JSON must exist only as a same-directory temporary file.
    let settings = f.data.join("settings.json");
    let old = fs::read(&settings).unwrap();
    let held = OpenOptions::new()
        .read(true)
        .share_mode(1 | 2)
        .open(&settings)
        .unwrap();
    assert_eq!(
        s.call(
            "locations_set_category",
            json!({"category":"browser","enabled":true})
        )
        .unwrap_err()
        .code,
        "unavailable"
    );
    assert_eq!(fs::read(&settings).unwrap(), old);
    assert!(
        fs::read_dir(&f.data)
            .unwrap()
            .filter_map(Result::ok)
            .any(|e| e.file_name().to_string_lossy().ends_with(".tmp"))
    );
    drop(held);
    drop(s);
    // Settings: one vanished custom root is dropped alone; toggles and the other root stay.
    let alpha = f.root.join("alpha root");
    let beta = f.root.join("beta root");
    fs::create_dir(&alpha).unwrap();
    fs::create_dir(&beta).unwrap();
    let s = f.service(false);
    let mut root_ids = vec![];
    for p in [&alpha, &beta] {
        f.pick(Some(p));
        root_ids.push(call(&s, "custom_root_add", json!({}))["added"]["root_id"].clone());
    }
    call(
        &s,
        "locations_set_category",
        json!({"category":"dev_cache","enabled":false}),
    );
    drop(s);
    fs::remove_dir(&beta).unwrap();
    let s = f.service(false);
    let locations = call(&s, "locations_get", json!({}));
    let enabled = |c: &str| {
        locations["categories"]
            .as_array()
            .unwrap()
            .iter()
            .find(|v| v["category"] == c)
            .unwrap()["enabled"]
            .clone()
    };
    assert_eq!(
        enabled("dev_cache"),
        false,
        "SERVICE_SETTINGS_KEEP: toggle lost"
    );
    assert_eq!(
        enabled("browser"),
        false,
        "SERVICE_SETTINGS_KEEP: toggle lost"
    );
    assert_eq!(
        locations["custom_roots"]
            .as_array()
            .unwrap()
            .iter()
            .map(|r| r["root_id"].clone())
            .collect::<Vec<_>>(),
        vec![root_ids[0].clone()],
        "SERVICE_SETTINGS_KEEP: custom roots"
    );
    let disk: Value = serde_json::from_slice(&fs::read(&settings).unwrap()).unwrap();
    assert_eq!(
        disk["custom_roots"]
            .as_array()
            .unwrap()
            .iter()
            .map(|r| r["root_id"].clone())
            .collect::<Vec<_>>(),
        vec![root_ids[0].clone()],
        "SERVICE_SETTINGS_KEEP: settings.json not rewritten"
    );
    assert_eq!(disk["categories"]["dev_cache"], false);
    drop(s);
    let saved = scan_saved(&f, &result);
    // Persist two records with equal second-resolution timestamps, reversed lexical IDs,
    // and controlled filesystem write times. The later write must become last_scan.
    for (id, seconds) in [
        ("scan-20270115T080000Z-fffe", NOW - 5),
        ("scan-20270115T080000Z-0000", NOW - 1),
    ] {
        let mut record = saved.clone();
        record["scan_id"] = json!(id);
        record["result"]["scan_id"] = json!(id);
        if id.ends_with("-0000") {
            // An older record format without saved in-use results.
            record.as_object_mut().unwrap().remove("in_use");
        }
        let path = f.data.join("scans").join(format!("{id}.json"));
        fs::write(&path, record.to_string()).unwrap();
        age(&path, seconds);
        let source = f
            .data
            .join("snapshots")
            .join(format!("{}.json", result["scan_id"].as_str().unwrap()));
        let mut snapshot: Value = serde_json::from_slice(&fs::read(source).unwrap()).unwrap();
        snapshot["scan_id"] = json!(id);
        fs::write(
            f.data.join("snapshots").join(format!("{id}.json")),
            snapshot.to_string(),
        )
        .unwrap();
    }
    let restored = f.service(false);
    assert_eq!(
        call(&restored, "app_state", json!({}))["last_scan"]["scan_id"],
        "scan-20270115T080000Z-0000"
    );
    let old_format = call(
        &restored,
        "scan_result",
        json!({"scanId":"scan-20270115T080000Z-0000"}),
    );
    assert!(
        group_in_use(&old_format, "chrome-cache").is_null(),
        "SERVICE_IN_USE_SAVED: old record must have null in_use"
    );
    drop(restored);
    let mut malformed = saved.clone();
    malformed["scan_id"] = json!("scan-20270115T080000Z-ffff");
    malformed["result"]["scan_id"] = malformed["scan_id"].clone();
    malformed["result"]["groups"][0]["in_use"]["mode"] = json!("broken");
    fs::write(
        f.data.join("scans/scan-20270115T080000Z-ffff.json"),
        malformed.to_string(),
    )
    .unwrap();
    for i in 0..65 {
        let id = format!("scan-20270101T000000Z-{i:04x}");
        let mut v = saved.clone();
        v["scan_id"] = json!(id);
        v["result"]["scan_id"] = json!(id);
        fs::write(
            f.data.join("scans").join(format!("{id}.json")),
            v.to_string(),
        )
        .unwrap();
        let mut snapshot: Value = serde_json::from_slice(
            &fs::read(
                f.data
                    .join("snapshots")
                    .join(format!("{}.json", result["scan_id"].as_str().unwrap())),
            )
            .unwrap(),
        )
        .unwrap();
        snapshot["scan_id"] = json!(id);
        fs::write(
            f.data.join("snapshots").join(format!("{id}.json")),
            snapshot.to_string(),
        )
        .unwrap();
    }
    fs::write(&settings, "broken").unwrap();
    fs::write(f.data.join("scans/scan-broken.json"), "broken").unwrap();
    fs::write(f.data.join("scans/do-not-delete.txt"), "keep").unwrap();
    for i in 0..65 {
        let id = format!("clean-20270115T080000Z-{i:04x}");
        let mut view = fixtures()["clean_result"].clone();
        view["clean_id"] = json!(id);
        view["journal_display_path"] = json!(
            f.data
                .join("journal")
                .join(format!("{id}.jsonl"))
                .to_str()
                .unwrap()
        );
        let record = json!({"clean_id":id,"plan_id":"plan-20270115T080000Z-0000","scan_id":result["scan_id"],"view":view,
            "report":{"report_version":"water.clean-report.v1","plan_id":"plan-20270115T080000Z-0000","started_at":"2027-01-15T08:00:00Z","ended_at":"2027-01-15T08:00:00Z","status":"completed","freed_bytes":"0","estimate_bytes":"0","volumes":[],"items":[]}});
        fs::write(
            f.data.join("cleans").join(format!("{id}.json")),
            record.to_string(),
        )
        .unwrap();
    }
    // Unreadable records near the top, a directory named like a record, and a record that
    // cannot be deleted right now must neither fail startup nor be removed.
    let corrupt = f.data.join("scans/scan-20270115T090000Z-abcd.json");
    fs::write(&corrupt, "{\"record_version\":").unwrap();
    let directory = f.data.join("scans/scan-20270115T100000Z-dddd.json");
    fs::create_dir(&directory).unwrap();
    fs::write(directory.join("inner.json"), "keep").unwrap();
    let locked = f.data.join("scans/scan-20270101T000000Z-0000.json");
    let lock = OpenOptions::new()
        .read(true)
        .share_mode(1 | 2)
        .open(&locked)
        .unwrap();
    let s = f.service(false);
    drop(lock);
    assert!(call(&s, "app_state", json!({}))["last_scan"].is_object());
    assert!(
        call(&s, "locations_get", json!({}))["categories"]
            .as_array()
            .unwrap()
            .iter()
            .all(|c| c["enabled"] == true)
    );
    let fresh = scanned(&s);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        fresh["scan_id"]
    );
    let kept = [
        "scan-broken.json",
        "scan-20270115T080000Z-ffff.json",
        "scan-20270115T090000Z-abcd.json",
        "scan-20270115T100000Z-dddd.json",
        "scan-20270101T000000Z-0000.json",
    ];
    let count = |dir: &str| {
        fs::read_dir(f.data.join(dir))
            .unwrap()
            .filter_map(Result::ok)
            .filter(|e| {
                e.path().extension().is_some_and(|x| x == "json")
                    && !kept.iter().any(|k| e.file_name() == *k)
            })
            .count()
    };
    assert_eq!(count("scans"), 60);
    assert_eq!(count("snapshots"), 60);
    assert_eq!(count("cleans"), 60);
    assert!(f.data.join("scans/do-not-delete.txt").exists());
    assert_eq!(
        fs::read(&corrupt).unwrap(),
        b"{\"record_version\":",
        "SERVICE_STORAGE_KEEP: unreadable record removed"
    );
    assert!(
        f.data
            .join("scans/scan-20270115T080000Z-ffff.json")
            .is_file(),
        "SERVICE_STORAGE_KEEP: unreadable record removed"
    );
    assert_eq!(
        fs::read(directory.join("inner.json")).unwrap(),
        b"keep",
        "SERVICE_STORAGE_KEEP: record-named directory touched"
    );
    assert!(
        locked.is_file(),
        "SERVICE_STORAGE_KEEP: locked record vanished"
    );
    assert!(
        f.data
            .join("snapshots/scan-20270101T000000Z-0000.json")
            .is_file(),
        "SERVICE_STORAGE_KEEP: snapshot deleted without its record"
    );
}

/// Polls until the task leaves `running`; a task that never settles fails with `marker`.
fn settle(s: &Service, c: &str, marker: &str) -> Value {
    let start = Instant::now();
    loop {
        let p = call(s, c, json!({}));
        if p["state"] != "running" {
            return p;
        }
        assert!(
            start.elapsed() < Duration::from_secs(20),
            "{marker}: {c} is still running and the service stays busy"
        );
        std::thread::sleep(Duration::from_millis(2));
    }
}
fn slash(p: &Path) -> String {
    p.to_str().unwrap().replace('/', "\\")
}
const TOO_BROAD: &str = "这个位置太大或包含系统目录，请选择具体的项目文件夹。";

#[test]
fn service_hardening() {
    hardening_panic_idle();
    hardening_trust_boundary();
    hardening_store_tidy();
    hardening_canonical_root();
    hardening_partial_source();
    hardening_product_name();
}

fn hardening_panic_idle() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(false);
    // A panic outside the scanner call itself (drives) on the scan thread.
    f.fake.panic_drives.store(true, Ordering::SeqCst);
    let id = call(&s, "scan_start", json!({}));
    let p = settle(&s, "scan_progress", "SERVICE_PANIC_IDLE");
    assert!(
        !f.fake.panic_drives.load(Ordering::SeqCst),
        "SERVICE_PANIC_IDLE: the injected panic was not reached"
    );
    assert_eq!(p["scan_id"], id["scan_id"]);
    assert_eq!(
        p["state"], "failed",
        "SERVICE_PANIC_IDLE: progress after a panic"
    );
    let app = call(&s, "app_state", json!({}));
    assert_eq!(
        app["busy"], "idle",
        "SERVICE_PANIC_IDLE: busy after a panic"
    );
    assert!(
        app["last_scan"].is_null(),
        "SERVICE_PANIC_IDLE: failed scan became last_scan"
    );
    // The service keeps working: a new scan completes, then a second panicking scan leaves it.
    let good = scanned(&s);
    f.fake.panic_drives.store(true, Ordering::SeqCst);
    call(&s, "scan_start", json!({}));
    assert_eq!(
        settle(&s, "scan_progress", "SERVICE_PANIC_IDLE")["state"],
        "failed"
    );
    let app = call(&s, "app_state", json!({}));
    assert_eq!(
        app["busy"], "idle",
        "SERVICE_PANIC_IDLE: busy after a second panic"
    );
    assert_eq!(
        app["last_scan"]["scan_id"], good["scan_id"],
        "SERVICE_PANIC_IDLE: last_scan after a failed scan"
    );
    // A panic inside a command, while it holds the state lock, is a fixed unavailable error.
    f.fake.panic_now.store(true, Ordering::SeqCst);
    let caught =
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| s.call("trends", json!({}))));
    let error = caught
        .expect("SERVICE_PANIC_IDLE: call let a panic escape")
        .expect_err("SERVICE_PANIC_IDLE: the injected panic was not reached");
    assert_eq!(
        (error.code.as_str(), error.message_zh.as_str()),
        ("unavailable", "Water 服务暂时不可用。"),
        "SERVICE_PANIC_IDLE: error for a panicking command"
    );
    // The poisoned lock is recovered and keeps working.
    assert_eq!(call(&s, "app_state", json!({}))["busy"], "idle");
    call(&s, "trends", json!({}));
    let again = scanned(&s);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        again["scan_id"],
        "SERVICE_PANIC_IDLE: scan after a poisoned lock"
    );
}

fn hardening_trust_boundary() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(true);
    let result = scanned(&s);
    let npm = scan_saved(&f, &result)["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["group_id"] == "npm-cache")
        .cloned()
        .expect("npm-cache item");
    let plan = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    let plan_id = plan["plan_id"].as_str().unwrap().to_owned();
    // Tamper with the plan file: only the in-memory plan may be executed.
    let file = f.data.join("plans").join(format!("{plan_id}.json"));
    let mut stored: Value = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
    let original: Vec<String> = stored["plan"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| i["path"].as_str().unwrap().to_ascii_lowercase())
        .collect();
    assert!(!original.is_empty());
    let mut extra = stored["plan"]["items"][0].clone();
    for key in ["item_id", "path", "kind", "identity", "total_bytes"] {
        extra[key] = npm[key].clone();
    }
    extra["root"] = json!(slash(&f.root.join("local_app_data")));
    stored["plan"]["items"].as_array_mut().unwrap().push(extra);
    fs::write(&file, serde_json::to_vec(&stored).unwrap()).unwrap();
    let local = f.root.join("local_app_data");
    let before = inventory(&local);
    call(
        &s,
        "clean_start",
        json!({"planId":plan_id,"confirmToken":plan["confirm_token"]}),
    );
    assert_eq!(
        settle(&s, "clean_progress", "SERVICE_TRUST_BOUNDARY")["state"],
        "completed"
    );
    let after = inventory(&local);
    assert!(
        Path::new(npm["path"].as_str().unwrap()).exists(),
        "SERVICE_TRUST_BOUNDARY: an item added to the plan file was cleaned"
    );
    let removed: Vec<_> = before.keys().filter(|p| !after.contains_key(*p)).collect();
    assert!(!removed.is_empty());
    for p in removed {
        let p = slash(p).to_ascii_lowercase();
        assert!(
            original
                .iter()
                .any(|o| p == *o || p.starts_with(&format!("{o}\\"))),
            "SERVICE_TRUST_BOUNDARY: removed outside the prepared plan: {p}"
        );
    }
    // A fresh, unconsumed scan and plan, then a restart.
    scanned(&s);
    let pending = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    drop(s);
    let s = f.service(true);
    let before = inventory(&f.root);
    let error = s
        .call("clean_prepare", json!({"groupIds":["chrome-cache"]}))
        .expect_err("SERVICE_TRUST_BOUNDARY: a scan read from disk became a cleaning source");
    assert_eq!(
        (error.code.as_str(), error.message_zh.as_str()),
        ("stale", "结果已过期，请重新体检后再清理。"),
        "SERVICE_TRUST_BOUNDARY: prepare on a loaded scan"
    );
    let error = s
        .call(
            "clean_start",
            json!({"planId":pending["plan_id"],"confirmToken":pending["confirm_token"]}),
        )
        .expect_err("SERVICE_TRUST_BOUNDARY: a plan read from disk was executed");
    assert_eq!(
        error.code, "stale",
        "SERVICE_TRUST_BOUNDARY: start of a loaded plan"
    );
    assert_eq!(
        inventory(&f.root),
        before,
        "SERVICE_TRUST_BOUNDARY: files changed after a refused request"
    );
    // A scan completed by this process is a source again.
    scanned(&s);
    call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
}

fn hardening_store_tidy() {
    let f = Fixture::new();
    for dir in ["scans", "snapshots", "plans", "cleans", "journal"] {
        fs::create_dir_all(f.data.join(dir)).unwrap();
    }
    let hex = "0123456789abcdef0123456789abcdef";
    let temps = [
        f.data.join(format!(".settings.json.{hex}.tmp")),
        f.data.join("scans").join(format!(".scan-x.json.{hex}.tmp")),
        f.data
            .join("plans")
            .join(format!(".plan-y_1.json.{hex}.tmp")),
    ];
    for t in &temps {
        fs::write(t, b"{}").unwrap();
    }
    // Names that do not match the temporary pattern stay.
    fs::write(f.data.join(".notes.tmp"), b"x").unwrap();
    fs::write(f.data.join(format!(".bad name.{hex}.tmp")), b"x").unwrap();
    fs::write(f.data.join("journal").join("keep.txt"), b"x").unwrap();
    fs::create_dir(f.data.join("plans").join("plan-20260101T000000Z-0000.json")).unwrap();
    let mut dropped = Vec::new();
    for i in 0..70u32 {
        let plan = f
            .data
            .join("plans")
            .join(format!("plan-20270101T000000Z-{i:04x}.json"));
        let journal = f
            .data
            .join("journal")
            .join(format!("clean-20270101T000000Z-{i:04x}.jsonl"));
        fs::write(&plan, b"{}").unwrap();
        fs::write(&journal, b"").unwrap();
        if i < 10 {
            dropped.push(plan);
            dropped.push(journal);
        }
    }
    let before = inventory(&f.data);
    let s = f.service(false);
    let after = inventory(&f.data);
    let mut expected = before.clone();
    for p in temps.iter().chain(&dropped) {
        assert!(expected.remove(p).is_some());
    }
    assert_eq!(
        after, expected,
        "SERVICE_STORE_TIDY: data directory after startup"
    );
    let count = |dir: &str, ext: &str| {
        fs::read_dir(f.data.join(dir))
            .unwrap()
            .filter(|e| {
                let e = e.as_ref().unwrap();
                e.file_type().unwrap().is_file() && e.file_name().to_str().unwrap().ends_with(ext)
            })
            .count()
    };
    assert_eq!(
        count("plans", ".json"),
        60,
        "SERVICE_STORE_TIDY: plans kept"
    );
    assert_eq!(
        count("journal", ".jsonl"),
        60,
        "SERVICE_STORE_TIDY: journals kept"
    );
    assert!(
        f.data
            .join("plans")
            .join("plan-20260101T000000Z-0000.json")
            .is_dir()
    );
    drop(s);
}

fn hardening_canonical_root() {
    let f = Fixture::new();
    fs::create_dir_all(f.root.join("Kf-Ä").join("profile")).unwrap();
    fs::create_dir_all(f.root.join("project")).unwrap();
    let mut fake = f.fake.clone();
    // The known folder is given in another case of a non-ASCII name.
    fake.folders.user_profile = format!("{}\\kf-ä\\profile", slash(&f.root));
    let s = Service::new(ServiceConfig {
        data_dir: f.root.join("data-canonical"),
        app_version: "0.1.0".into(),
        clean_enabled: false,
        platform: Box::new(fake.clone()),
        picker: Box::new(fake),
    })
    .unwrap();
    for name in ["Kf-Ä", "kf-ä"] {
        f.pick(Some(&f.root.join(name)));
        let error = s
            .call("custom_root_add", json!({}))
            .expect_err("SERVICE_CANONICAL_ROOT: a folder holding a known folder was added");
        assert_eq!(
            error.message_zh, TOO_BROAD,
            "SERVICE_CANONICAL_ROOT: message for {name}"
        );
    }
    f.pick(Some(&f.root.join("project")));
    let added = s.call("custom_root_add", json!({}));
    assert!(
        added.is_ok(),
        "SERVICE_CANONICAL_ROOT: plain project {added:?}"
    );
    let roots = call(&s, "locations_get", json!({}))["custom_roots"].clone();
    assert_eq!(
        roots.as_array().unwrap().len(),
        1,
        "SERVICE_CANONICAL_ROOT: roots"
    );
}

fn hardening_partial_source() {
    use std::{ffi::OsString, os::windows::ffi::OsStringExt};
    let bad = || {
        let mut wide: Vec<u16> = "bad-".encode_utf16().collect();
        wide.push(0xD800);
        wide.extend(".bin".encode_utf16());
        OsString::from_wide(&wide)
    };
    let f = Fixture::new();
    f.seed();
    let protected = f.root.join("user_profile/.claude/projects").join(bad());
    File::create(&protected).unwrap();
    let s = f.service(true);
    let id = call(&s, "scan_start", json!({}));
    assert_eq!(
        settle(&s, "scan_progress", "SERVICE_PARTIAL_SOURCE")["state"],
        "partial"
    );
    let saved = scan_saved(&f, &id);
    assert!(
        saved["result"]["issues"]
            .as_array()
            .unwrap()
            .iter()
            .any(|i| i["code"] == "unrepresentable_name" && i["group_id"] == "claude-code-sessions"),
        "SERVICE_PARTIAL_SOURCE: expected an issue on the protected group {}",
        saved["result"]["issues"]
    );
    let before = inventory(&f.root);
    let error = s
        .call("clean_prepare", json!({"groupIds":["chrome-cache"]}))
        .expect_err("SERVICE_PARTIAL_SOURCE: a partial scan with an unclear protected group became a source");
    assert_eq!(
        (error.code.as_str(), error.message_zh.as_str()),
        ("stale", "这次体检没有完整完成，请重新体检后再清理。"),
        "SERVICE_PARTIAL_SOURCE: prepare on a partial scan"
    );
    assert_eq!(
        inventory(&f.root),
        before,
        "SERVICE_PARTIAL_SOURCE: files changed"
    );
    // An issue only in a recommended group still allows preparing.
    fs::remove_file(&protected).unwrap();
    File::create(
        f.root
            .join("local_app_data/Google/Chrome/User Data/Default/Cache")
            .join(bad()),
    )
    .unwrap();
    let id = call(&s, "scan_start", json!({}));
    assert_eq!(
        settle(&s, "scan_progress", "SERVICE_PARTIAL_SOURCE")["state"],
        "partial"
    );
    let saved = scan_saved(&f, &id);
    assert!(
        saved["result"]["issues"]
            .as_array()
            .unwrap()
            .iter()
            .all(|i| i["group_id"] == "chrome-cache" && i["code"] != "budget_exhausted"),
        "SERVICE_PARTIAL_SOURCE: issues {}",
        saved["result"]["issues"]
    );
    let plan = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    assert!(
        plan["item_count"].as_u64().unwrap() > 0,
        "SERVICE_PARTIAL_SOURCE: plan"
    );
}

fn hardening_product_name() {
    let f = Fixture::new();
    f.seed();
    f.file(
        "local_app_data/Microsoft/Edge/User Data/Default/Cache/cache.bin",
        10,
    );
    f.file(
        "local_app_data/BraveSoftware/Brave-Browser/User Data/Default/Cache/cache.bin",
        10,
    );
    f.file("windows/Temp/hrender-1/data", 10);
    f.age_all(NOW - 10 * 86400);
    *f.fake.names.lock().unwrap() = [
        ("Microsoft\\Edge", "msedge.exe"),
        ("Google\\Chrome", "Chrome.exe"),
        ("hrender-", "CHROME-HEADLESS-SHELL.EXE"),
        ("BraveSoftware", "other.exe"),
    ]
    .iter()
    .map(|(a, b)| ((*a).to_owned(), (*b).to_owned()))
    .collect();
    let s = f.service(false);
    let result = scanned(&s);
    for (group, label) in [
        ("edge-cache", "Edge 正在运行，将跳过占用的项"),
        ("chrome-cache", "Chrome 正在运行，将跳过占用的项"),
        (
            "headless-browser-profiles",
            "Chrome 无头浏览器 正在运行，将跳过占用的项",
        ),
        ("brave-cache", "other 正在运行，将跳过占用的项"),
    ] {
        assert_eq!(
            group_in_use(&result, group)["process_label_zh"],
            label,
            "SERVICE_PRODUCT_NAME: {group}"
        );
    }
}
