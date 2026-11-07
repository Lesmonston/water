#![forbid(unsafe_code)]

use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet, VecDeque, hash_map::RandomState},
    fs::{self, File, FileTimes, OpenOptions},
    hash::{BuildHasher, Hasher},
    os::windows::fs::{FileTimesExt, OpenOptionsExt},
    path::{Path, PathBuf},
    process::Command,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc,
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use water_junk_rules::KnownFolders;
use water_process_scan::InUseSpec;
use water_service::{
    DriveInfo, FolderPicker, IpcError as PublicIpcError, Platform, Service, ServiceConfig,
};

const NOW: u64 = 1_800_000_000;
const DISABLED: &str = "这一版只做体检，清理功能会在下一版开放。";

// Compile the unchanged production service/clean/view/storage sources for two
// white-box cases. Ordinary contract tests still use water_service::Service.
// This keeps fixture authorisation and the storage barrier out of the product.
#[path = "../src/clean.rs"]
mod clean;
#[path = "../src/conclusion.rs"]
mod conclusion;
#[path = "../src/dedupe.rs"]
mod dedupe;
#[path = "../src/storage.rs"]
mod disk_storage;
#[path = "../src/m35.rs"]
mod m35;
#[path = "../src/quarantine.rs"]
mod quarantine;
#[path = "../src/service.rs"]
mod service;
#[path = "../src/util.rs"]
mod util;
#[path = "../src/views.rs"]
mod views;
mod native_windows {
    pub(crate) fn quarantine_stamp(at: std::time::SystemTime) -> String {
        let [y, m, d, h, n, s] = super::util::parts(at);
        format!("{y:04}{m:02}{d:02}-{h:02}{n:02}{s:02}")
    }
}
const IN_USE_UNKNOWN: &str = "无法确认占用状态";

// The sources use their crate-private error constructors. Public platform
// errors are forwarded into this test crate's equivalent boundary type.
#[derive(Debug, Clone, serde::Serialize)]
struct IpcError {
    code: String,
    message_zh: String,
}
impl IpcError {
    fn new(code: &str) -> Self {
        Self {
            code: code.into(),
            message_zh: match code {
                "busy" => "正在进行另一项任务，请稍候。",
                "stale" => "结果已过期，请重新体检后再清理。",
                "invalid" => "所选内容无法清理，请重新选择。",
                "not_found" => "找不到这条记录，请重新体检。",
                "cancelled" => "已取消。",
                _ => "Water 服务暂时不可用。",
            }
            .into(),
        }
    }
    fn disabled() -> Self {
        Self {
            code: "unavailable".into(),
            message_zh: DISABLED.into(),
        }
    }
}
impl From<PublicIpcError> for IpcError {
    fn from(e: PublicIpcError) -> Self {
        Self {
            code: e.code,
            message_zh: e.message_zh,
        }
    }
}

mod storage {
    use super::*;
    pub(crate) use disk_storage::plain_directory;
    type SnapshotBarrier = (mpsc::Sender<()>, mpsc::Receiver<()>);
    pub(crate) struct Store {
        inner: disk_storage::Store,
        pub after_snapshot: Mutex<Option<SnapshotBarrier>>,
        pub fail_journal: AtomicBool,
    }
    impl std::ops::Deref for Store {
        type Target = disk_storage::Store;
        fn deref(&self) -> &Self::Target {
            &self.inner
        }
    }
    impl Store {
        pub fn new(root: PathBuf) -> Result<Self, IpcError> {
            Ok(Self {
                inner: disk_storage::Store::new(root)?,
                after_snapshot: Mutex::new(None),
                fail_journal: AtomicBool::new(false),
            })
        }
        pub fn write(&self, dir: &str, name: &str, value: &Value) -> Result<(), IpcError> {
            self.inner.write(dir, name, value)?;
            if dir == "snapshots" {
                let barrier = self.after_snapshot.lock().unwrap().take();
                if let Some((written, resume)) = barrier {
                    written.send(()).unwrap();
                    resume
                        .recv_timeout(Duration::from_secs(10))
                        .expect("SERVICE_SNAPSHOT_REMOVE_FAIL: resume snapshot");
                }
            }
            Ok(())
        }
        pub fn journal(&self, id: &str) -> Result<TestJournal, IpcError> {
            Ok(TestJournal {
                inner: self.inner.journal(id)?,
                fail: self.fail_journal.swap(false, Ordering::SeqCst),
            })
        }
        pub fn purge_journal(&self, id: &str) -> Result<TestJournal, IpcError> {
            Ok(TestJournal {
                inner: self.inner.purge_journal(id)?,
                fail: self.fail_journal.swap(false, Ordering::SeqCst),
            })
        }
    }
    pub(crate) struct TestJournal {
        inner: disk_storage::DurableFile,
        fail: bool,
    }
    impl std::io::Write for TestJournal {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            if self.fail
                && [
                    b"\"event\":\"moved\"".as_slice(),
                    b"\"event\":\"done\"".as_slice(),
                ]
                .iter()
                .any(|word| bytes.windows(word.len()).any(|b| b == *word))
            {
                return Err(std::io::Error::other("synthetic durable journal failure"));
            }
            std::io::Write::write(&mut self.inner, bytes)
        }
        fn flush(&mut self) -> std::io::Result<()> {
            std::io::Write::flush(&mut self.inner)
        }
    }
}

trait TestService {
    fn call(&self, command: &str, args: Value) -> Result<Value, PublicIpcError>;
}
impl TestService for Service {
    fn call(&self, command: &str, args: Value) -> Result<Value, PublicIpcError> {
        self.call(command, args)
    }
}
impl TestService for service::Service {
    fn call(&self, command: &str, args: Value) -> Result<Value, PublicIpcError> {
        self.call(command, args).map_err(|e| PublicIpcError {
            code: e.code,
            message_zh: e.message_zh,
        })
    }
}
fn source_service(f: &Fixture, enabled: bool) -> service::Service {
    service::Service::new(ServiceConfig {
        data_dir: f.data.clone(),
        app_version: "0.1.0".into(),
        clean_enabled: enabled,
        platform: Box::new(f.fake.clone()),
        picker: Box::new(f.fake.clone()),
    })
    .unwrap()
}

#[derive(Clone)]
struct CleanGate {
    entered: mpsc::Sender<()>,
    resume: Arc<Mutex<mpsc::Receiver<()>>>,
    seen: Arc<Mutex<BTreeSet<String>>>,
}

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
    panic_in_use: Arc<AtomicBool>,
    names: Arc<Mutex<Vec<(String, String)>>>,
    clean_gate: Arc<Mutex<Option<CleanGate>>>,
    drives: Arc<Mutex<Vec<DriveInfo>>>,
    file_systems: Arc<Mutex<BTreeMap<String, String>>>,
    orphans: Arc<Mutex<Vec<water_process_scan::OrphanChain>>>,
    apps: Arc<Mutex<Option<water_installed_apps::AppList>>>,
    quarantines: Arc<Mutex<Vec<String>>>,
    queried_paths: Arc<Mutex<Vec<String>>>,
    quarantine_bases: Arc<Mutex<BTreeMap<String, String>>>,
}
impl Platform for Fake {
    fn installed_apps(&self) -> Option<water_installed_apps::AppList> {
        self.apps.lock().unwrap().clone()
    }
    fn quarantine_roots(&self) -> Vec<String> {
        self.quarantines.lock().unwrap().clone()
    }
    fn quarantine_base(&self, root: &str) -> Option<String> {
        self.quarantine_bases
            .lock()
            .unwrap()
            .get(root)
            .cloned()
            .or_else(|| self.quarantines.lock().unwrap().first().cloned())
    }
    fn recycle_bin(&self, _root: &str) -> Option<u64> {
        Some(4096)
    }
    fn known_folders(&self) -> Result<KnownFolders, PublicIpcError> {
        Ok(self.folders.clone())
    }
    fn drives(&self) -> Vec<DriveInfo> {
        if std::thread::current().name() == Some("water-scan")
            && self.panic_drives.swap(false, Ordering::SeqCst)
        {
            panic!("fake platform: drives failed inside the scan task");
        }
        self.drives.lock().unwrap().clone()
    }
    fn volume_file_system(&self, root: &str) -> Option<String> {
        self.file_systems
            .lock()
            .unwrap()
            .get(&root.to_ascii_uppercase())
            .cloned()
    }
    fn orphan_chains(&self) -> Vec<water_process_scan::OrphanChain> {
        self.orphans.lock().unwrap().clone()
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
        self.queried_paths.lock().unwrap().push(path.into());
        if std::thread::current().name() == Some("water-clean")
            && self.panic_in_use.swap(false, Ordering::SeqCst)
        {
            panic!("fake platform: in_use failed inside the clean task");
        }
        let gate = if std::thread::current().name() == Some("water-clean") {
            self.clean_gate.lock().unwrap().clone()
        } else {
            None
        };
        if let Some(gate) = gate
            && gate.seen.lock().unwrap().insert(path.to_owned())
        {
            gate.entered.send(()).unwrap();
            gate.resume
                .lock()
                .unwrap()
                .recv_timeout(Duration::from_secs(10))
                .expect("SERVICE_GROUP_INDEX: clean item was not resumed");
        }
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
    fn pick(&self) -> Result<Option<String>, PublicIpcError> {
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
            panic_in_use: Arc::new(AtomicBool::new(false)),
            names: Arc::new(Mutex::new(Vec::new())),
            clean_gate: Arc::new(Mutex::new(None)),
            drives: Arc::new(Mutex::new(vec![DriveInfo {
                root: "F:\\".into(),
                is_system: true,
                total_bytes: 1_000_000,
                free_bytes: 800_000,
            }])),
            file_systems: Arc::new(Mutex::new(BTreeMap::new())),
            orphans: Arc::new(Mutex::new(Vec::new())),
            apps: Arc::new(Mutex::new(None)),
            quarantines: Arc::new(Mutex::new(vec![path(".water-quarantine")])),
            queried_paths: Arc::new(Mutex::new(Vec::new())),
            quarantine_bases: Arc::new(Mutex::new(BTreeMap::new())),
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
    file.set_times(
        FileTimes::new()
            .set_modified(UNIX_EPOCH + Duration::from_secs(seconds))
            .set_created(UNIX_EPOCH + Duration::from_secs(seconds)),
    )
    .unwrap();
}
fn call(s: &impl TestService, c: &str, a: Value) -> Value {
    let started = Instant::now();
    let result = s.call(c, a).unwrap_or_else(|e| panic!("{c}: {e:?}"));
    // SERVICE.md L46: call except custom_root_add (folder picker) must return in 50 ms.
    // Addendum 05: commands that sync-write files in the same call get 200 ms.
    if c == "custom_root_add" {
        return result;
    }
    if matches!(
        c,
        "conclusion_decide"
            | "cluster_mark_fixed"
            | "locations_set_session_cleanup"
            | "manifest_trust"
            | "locations_set_category"
            | "custom_root_remove"
            | "skip_add"
            | "skip_remove"
            | "clean_prepare"
            | "clean_start"
            | "quarantine_restore"
    ) {
        assert!(
            started.elapsed() <= Duration::from_millis(200),
            "SERVICE_RETURN_BUDGET: {c}"
        );
    } else {
        assert!(
            started.elapsed() <= Duration::from_millis(50),
            "SERVICE_RETURN_BUDGET: {c}"
        );
    }
    result
}
fn wait(s: &impl TestService, c: &str) -> Value {
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
fn scanned(s: &impl TestService) -> Value {
    let id = call(s, "scan_start", json!({}));
    let p = wait(s, "scan_progress");
    assert_eq!(p["state"], "completed");
    assert_eq!(p["percent"], 100);
    call(s, "scan_result", json!({"scanId":id["scan_id"]}))
}
fn fixtures() -> Value {
    let mut base: Value = serde_json::from_str(include_str!(
        "../../../contracts/checkup-v1/ui-fixtures.json"
    ))
    .unwrap();
    let increment: Value = serde_json::from_str(include_str!(
        "../../../contracts/m3c-v1/ui-fixtures-m3c.json"
    ))
    .unwrap();
    for (key, value) in increment.as_object().unwrap() {
        base[key] = value.clone();
    }
    let m35: Value = serde_json::from_str(include_str!(
        "../../../contracts/m35-v1/ui-fixtures-m35.json"
    ))
    .unwrap();
    fn add(to: &mut Value, from: &Value, keys: &[&str]) {
        for key in keys {
            assert!(
                from.as_object().is_some_and(|m| m.contains_key(*key)),
                "SERVICE_M35_SCOPE: missing sample {key}"
            );
            to[key] = from[key].clone();
        }
    }
    for key in ["app_state_fresh", "app_state_after_scan"] {
        add(&mut base[key], &m35["v2_app_state_plain"], &["quarantine"]);
    }
    for sample in base["scan_progress_sequence"].as_array_mut().unwrap() {
        if sample["state"] == "idle" {
            sample["locations"] = json!([]);
        } else {
            let from = m35["v2_scan_progress_sequence"]
                .as_array()
                .unwrap()
                .iter()
                .find(|p| p["state"] == sample["state"])
                .unwrap();
            add(sample, from, &["locations"]);
        }
    }
    for sample in base["clean_progress_sequence"].as_array_mut().unwrap() {
        if sample["state"] == "idle" {
            sample["phase"] = json!("delete");
            sample["quarantined_bytes"] = json!("0");
        } else {
            let from = m35["v2_clean_progress_sequence"]
                .as_array()
                .unwrap()
                .iter()
                .find(|p| p["state"] == sample["state"])
                .unwrap();
            add(sample, from, &["phase", "quarantined_bytes"]);
        }
    }
    for sample in base["group_details"].as_object_mut().unwrap().values_mut() {
        add(
            sample,
            &m35["v2_group_detail_items"],
            &["rows", "rows_note_zh"],
        );
    }
    add(
        &mut base["locations"],
        &m35["v2_locations"],
        &["home", "sessions", "manifests"],
    );
    add(&mut base["trends"], &m35["v2_trends"], &["clusters"]);
    add(
        &mut base["clean_prepare_default"],
        &m35["v2_clean_prepare_quarantine"],
        &["delete", "chosen", "expected_skip"],
    );
    base["clean_prepare_default"]["chosen"] = Value::Null;
    add(
        &mut base["clean_result"],
        &m35["v2_clean_result"],
        &["quarantined"],
    );
    base["clean_result"]["quarantined"] = Value::Null;
    for key in [
        "app_state_fresh",
        "app_state_after_scan",
        "scan_result",
        "group_details",
        "locations",
        "custom_root_add_drive",
        "custom_root_add_cancelled",
        "trends",
        "history_list",
        "clean_prepare_default",
        "clean_result",
        "scan_start",
        "clean_start",
        "scan_progress_sequence",
        "clean_progress_sequence",
        "errors",
    ] {
        assert!(!base[key].is_null(), "SERVICE_M3C_SHAPE: missing {key}");
    }
    assert!(
        base["group_details"]
            .as_object()
            .is_some_and(|m| m.values().all(|v| !v.is_null())),
        "SERVICE_M3C_SHAPE: group details missing"
    );
    base
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
    shape(&added, &samples["custom_root_add_drive"]);
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
    m3c_unique_inuse();
    m3c_by_drive();
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
        detail_in_use["process_label_zh"], "Chrome 正在运行，将跳过 1 个占用的项",
        "SERVICE_IN_USE_SAVED: label before restart"
    );
    assert_eq!(labels["chrome-cache"], detail_in_use);
    drop(s);
    let in_use_calls = f.fake.in_use_calls.load(Ordering::SeqCst);
    let s = f.service(false);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        id["scan_id"],
        "SERVICE_SCAN_RECORD: last_scan after restart"
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
    m3c_exclude_skip();
    m3d_clean_summary();
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
    let progress = call(&s, "clean_progress", json!({}));
    assert_eq!(
        progress["group_index"], progress["group_count"],
        "SERVICE_GROUP_INDEX: stopped progress"
    );
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
    clean_group_progress();
}

fn clean_group_progress() {
    let f = Fixture::new();
    f.seed();
    // Two items in the last group let the next guard pause after its first callback.
    f.file(
        "user_profile/.codex/.tmp/marketplaces/.staging/marketplace-upgrade-second/data",
        20,
    );
    f.age_all(NOW - 10 * 86400);
    let s = f.service(true);
    let idle = call(&s, "clean_progress", json!({}));
    scanned(&s);
    let groups = ["chrome-cache", "npm-cache", "codex-marketplace-staging"];
    let preview = call(&s, "clean_prepare", json!({"groupIds":groups}));
    let plan: Value = serde_json::from_slice(
        &fs::read(
            f.data
                .join("plans")
                .join(format!("{}.json", preview["plan_id"].as_str().unwrap())),
        )
        .unwrap(),
    )
    .unwrap();
    let items = plan["plan"]["items"].as_array().unwrap();
    let (entered, steps) = mpsc::channel();
    let (resume, released) = mpsc::channel();
    *f.fake.clean_gate.lock().unwrap() = Some(CleanGate {
        entered,
        resume: Arc::new(Mutex::new(released)),
        seen: Arc::new(Mutex::new(BTreeSet::new())),
    });
    f.fake.hold.store(true, Ordering::SeqCst);
    call(
        &s,
        "clean_start",
        json!({"planId":preview["plan_id"],"confirmToken":preview["confirm_token"]}),
    );
    let initial = call(&s, "clean_progress", json!({}));
    f.fake.hold.store(false, Ordering::SeqCst);
    let mut samples = Vec::new();
    for _ in items {
        steps
            .recv_timeout(Duration::from_secs(10))
            .expect("SERVICE_GROUP_INDEX: clean item did not reach the guard");
        samples.push(call(&s, "clean_progress", json!({})));
        resume.send(()).unwrap();
    }
    let completed = wait(&s, "clean_progress");
    *f.fake.clean_gate.lock().unwrap() = None;
    // Assert after draining the task, including when a negative control changes the progress.
    assert_eq!(idle["state"], "idle", "SERVICE_GROUP_INDEX: idle state");
    assert_eq!(idle["group_index"], 0, "SERVICE_GROUP_INDEX: idle index");
    assert_eq!(idle["group_count"], 0, "SERVICE_GROUP_INDEX: idle count");
    assert_eq!(
        initial["state"], "running",
        "SERVICE_GROUP_INDEX: start state"
    );
    assert_eq!(initial["done_items"], 0, "SERVICE_GROUP_INDEX: start items");
    assert_eq!(
        initial["group_index"], 1,
        "SERVICE_GROUP_INDEX: first group"
    );
    assert_eq!(
        initial["group_count"],
        groups.len(),
        "SERVICE_GROUP_INDEX: start count"
    );
    let mut observed = BTreeSet::new();
    for (next_item, progress) in samples.iter().enumerate() {
        let expected = if next_item == 0 {
            1
        } else {
            groups
                .iter()
                .position(|g| items[next_item - 1]["group_id"] == *g)
                .unwrap()
                + 1
        };
        let index = progress["group_index"].as_u64().unwrap();
        assert_eq!(
            progress["state"], "running",
            "SERVICE_GROUP_INDEX: item state"
        );
        assert_eq!(
            progress["done_items"], next_item,
            "SERVICE_GROUP_INDEX: item callback"
        );
        assert_eq!(
            progress["group_count"],
            groups.len(),
            "SERVICE_GROUP_INDEX: item count"
        );
        assert!(
            (1..=groups.len() as u64).contains(&index),
            "SERVICE_GROUP_INDEX: running index {index}"
        );
        assert_eq!(index, expected as u64, "SERVICE_GROUP_INDEX: plan order");
        observed.insert(index);
    }
    assert_eq!(
        observed,
        BTreeSet::from([1, 2, 3]),
        "SERVICE_GROUP_INDEX: later groups were not observed"
    );
    assert_eq!(
        completed["state"], "completed",
        "SERVICE_GROUP_INDEX: end state"
    );
    assert_eq!(
        completed["group_index"], completed["group_count"],
        "SERVICE_GROUP_INDEX: completed index"
    );
    assert_eq!(
        completed["group_count"],
        groups.len(),
        "SERVICE_GROUP_INDEX: completed count"
    );
}

#[test]
fn service_trends_locations() {
    m3c_drive_roots();
    m3c_trends();
    m3d_growth_base();
    m3d_history();
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
    m3c_compat();
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
fn settle(s: &impl TestService, c: &str, marker: &str) -> Value {
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
    hardening_scan_record();
    m3c_snapshot_remove_fail();
    hardening_custom_root_junction();
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
    drop(s);
    hardening_clean_panic_and_prep();
}

fn hardening_clean_panic_and_prep() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(true);
    scanned(&s);
    let preview = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    f.fake.panic_in_use.store(true, Ordering::SeqCst);
    let started = call(
        &s,
        "clean_start",
        json!({"planId":preview["plan_id"],"confirmToken":preview["confirm_token"]}),
    );
    let progress = settle(&s, "clean_progress", "SERVICE_PANIC_IDLE");
    assert!(
        !f.fake.panic_in_use.load(Ordering::SeqCst),
        "SERVICE_PANIC_IDLE: the injected clean-thread panic was not reached"
    );
    assert_eq!(
        progress["state"], "idle",
        "SERVICE_PANIC_IDLE: clean_progress after an in_use panic"
    );
    assert_eq!(
        call(&s, "app_state", json!({}))["busy"],
        "idle",
        "SERVICE_PANIC_IDLE: busy after an in_use panic"
    );
    let journal = f
        .data
        .join("journal")
        .join(format!("{}.jsonl", started["clean_id"].as_str().unwrap()));
    assert!(
        journal.is_file(),
        "SERVICE_PANIC_IDLE: journal missing after an in_use panic"
    );
    let again = scanned(&s);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        again["scan_id"],
        "SERVICE_PANIC_IDLE: scan after a clean-thread panic"
    );
    let preview = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    f.fake.panic_now.store(true, Ordering::SeqCst);
    let error = s
        .call(
            "clean_start",
            json!({"planId":preview["plan_id"],"confirmToken":preview["confirm_token"]}),
        )
        .expect_err("SERVICE_PANIC_IDLE: clean start prep panic was not reached");
    assert_eq!(
        (error.code.as_str(), error.message_zh.as_str()),
        ("unavailable", "Water 服务暂时不可用。"),
        "SERVICE_PANIC_IDLE: error for a panicking clean start"
    );
    let app = call(&s, "app_state", json!({}));
    assert_eq!(
        app["busy"], "idle",
        "SERVICE_PANIC_IDLE: busy after a clean start prep failure"
    );
    assert_eq!(
        call(&s, "clean_progress", json!({}))["state"],
        "idle",
        "SERVICE_PANIC_IDLE: clean_progress after a clean start prep failure"
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
        ("edge-cache", "Edge 正在运行，将跳过 1 个占用的项"),
        ("chrome-cache", "Chrome 正在运行，将跳过 2 个占用的项"),
        (
            "headless-browser-profiles",
            "Chrome 无头浏览器 正在运行，将跳过 1 个占用的项",
        ),
        ("brave-cache", "other 正在运行，将跳过 1 个占用的项"),
    ] {
        assert_eq!(
            group_in_use(&result, group)["process_label_zh"],
            label,
            "SERVICE_PRODUCT_NAME: {group}"
        );
    }
}

fn hardening_scan_record() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(false);
    let first = scanned(&s);
    let first_snapshot = f
        .data
        .join("snapshots")
        .join(format!("{}.json", first["scan_id"].as_str().unwrap()));
    assert!(
        first_snapshot.is_file(),
        "SERVICE_SNAPSHOT_ORPHAN: successful scan snapshot missing"
    );
    drop(s);
    let s = f.service(false);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        first["scan_id"],
        "SERVICE_SCAN_RECORD: last_scan after a successful write"
    );
    f.fake.entered.store(false, Ordering::SeqCst);
    f.fake.hold.store(true, Ordering::SeqCst);
    let id = call(&s, "scan_start", json!({}));
    let start = Instant::now();
    while !f.fake.entered.load(Ordering::SeqCst) {
        assert!(
            start.elapsed() < Duration::from_secs(10),
            "SERVICE_SCAN_RECORD: scan thread never entered the in-use batch"
        );
        std::thread::sleep(Duration::from_millis(2));
    }
    let blocked = f
        .data
        .join("scans")
        .join(format!("{}.json", id["scan_id"].as_str().unwrap()));
    fs::create_dir(&blocked).unwrap();
    f.fake.hold.store(false, Ordering::SeqCst);
    assert_eq!(
        settle(&s, "scan_progress", "SERVICE_SCAN_RECORD")["state"],
        "failed",
        "SERVICE_SCAN_RECORD: progress after a failed write"
    );
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        first["scan_id"],
        "SERVICE_SCAN_RECORD: in-process last_scan after a failed write"
    );
    assert!(
        !f.data
            .join("snapshots")
            .join(format!("{}.json", id["scan_id"].as_str().unwrap()))
            .exists(),
        "SERVICE_SNAPSHOT_ORPHAN: failed scan left its snapshot"
    );
    assert!(
        first_snapshot.is_file(),
        "SERVICE_SNAPSHOT_ORPHAN: previous snapshot removed"
    );
    drop(s);
    let s = f.service(false);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        first["scan_id"],
        "SERVICE_SCAN_RECORD: last_scan after a failed write is not the new scan"
    );
    drop(s);
}

fn hardening_custom_root_junction() {
    let f = Fixture::new();
    let home = f.root.join("home");
    let real = f.root.join("appdata-real");
    fs::create_dir_all(real.join("Local")).unwrap();
    junction(&home.join("AppData"), &real);
    let mut fake = f.fake.clone();
    fake.folders.local_app_data = format!("{}\\AppData\\Local", slash(&home));
    let s = Service::new(ServiceConfig {
        data_dir: f.root.join("data-junction"),
        app_version: "0.1.0".into(),
        clean_enabled: false,
        platform: Box::new(fake.clone()),
        picker: Box::new(fake),
    })
    .unwrap();
    f.pick(Some(&home));
    let error = s.call("custom_root_add", json!({})).expect_err(
        "SERVICE_CUSTOM_ROOT: home that contains a known folder via a junction was added",
    );
    assert_eq!(error.message_zh, TOO_BROAD, "SERVICE_CUSTOM_ROOT: message");
}

fn junction(link: &Path, target: &Path) {
    fs::create_dir_all(target).unwrap();
    if let Some(parent) = link.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    if std::os::windows::fs::symlink_dir(target, link).is_ok() {
        return;
    }
    let out = Command::new("cmd")
        .args(["/D", "/C", "mklink", "/J"])
        .arg(link)
        .arg(target)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "SERVICE_CUSTOM_ROOT: {}",
        String::from_utf8_lossy(&out.stderr)
    );
}

fn m3c_unique_inuse() {
    let f = Fixture::new();
    f.seed();
    let cache = f
        .root
        .join("local_app_data/Google/Chrome/User Data/Default/Cache");
    for n in 0..3 {
        fs::hard_link(cache.join("cache.bin"), cache.join(format!("link-{n}"))).unwrap();
    }
    f.age_all(NOW - 10 * 86400);
    let s = f.service(true);
    let result = scanned(&s);
    let g = groups(&result)
        .into_iter()
        .find(|g| g["group_id"] == "chrome-cache")
        .unwrap();
    assert_eq!(g["total_bytes"], "300", "SERVICE_M3C_UNIQUE: group");
    assert_eq!(g["eligible_bytes"], "300", "SERVICE_M3C_UNIQUE: eligible");
    assert_eq!(g["logical_bytes"], "600", "SERVICE_M3C_UNIQUE: logical");
    assert_eq!(
        g["in_use"]["item_count"], 1,
        "SERVICE_M3C_INUSE_ITEM: one busy item"
    );
    assert_eq!(
        g["by_drive"],
        json!([{"root":"F:\\","item_count":2,"eligible_bytes":"300"}]),
        "SERVICE_M3C_BY_DRIVE: unique"
    );
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    for i in detail["items"].as_array().unwrap() {
        let busy = i["display_path"].as_str().unwrap().contains("Profile Busy");
        assert_eq!(
            !i["in_use"].is_null(),
            busy,
            "SERVICE_M3C_INUSE_ITEM: detail"
        );
        if busy {
            assert_eq!(
                i["in_use"]["process_label_zh"], "Chrome 正在使用",
                "SERVICE_M3C_INUSE_ITEM: label"
            );
        } else {
            assert_eq!(i["total_bytes"], "100", "SERVICE_M3C_UNIQUE: item");
        }
    }
    let expected: u64 = groups(&result)
        .iter()
        .filter(|g| g["level"] == "recommended")
        .map(|g| {
            g["eligible_bytes"]
                .as_str()
                .unwrap()
                .parse::<u64>()
                .unwrap()
        })
        .sum();
    assert_eq!(
        result["totals"]["recommended_bytes"],
        expected.to_string(),
        "SERVICE_M3C_UNIQUE: total"
    );
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["recommended_bytes"],
        expected.to_string(),
        "SERVICE_M3C_UNIQUE: app"
    );
    let preview = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    assert_eq!(preview["total_bytes"], "300", "SERVICE_M3C_UNIQUE: preview");
    let plan = read_plan(&f, &preview);
    assert_eq!(
        plan["plan"]["items"]
            .as_array()
            .unwrap()
            .iter()
            .map(|i| i["total_bytes"].as_str().unwrap().parse::<u64>().unwrap())
            .sum::<u64>(),
        600,
        "SERVICE_M3C_UNIQUE: plan remains logical"
    );
    drop(s);
    let s = f.service(false);
    assert_eq!(
        call(&s, "group_detail", json!({"groupId":"chrome-cache"}))["items"],
        detail["items"],
        "SERVICE_M3C_INUSE_ITEM: persisted"
    );
    f.fake
        .names
        .lock()
        .unwrap()
        .push(("Google\\Chrome".into(), "无法确认占用状态".into()));
    let result = scanned(&s);
    let unknown = "暂时无法确认是否在运行，清理时会再次检查";
    assert_eq!(
        group_in_use(&result, "chrome-cache"),
        json!({"process_label_zh":unknown,"item_count":2}),
        "SERVICE_M3C_INUSE_ITEM: unavailable snapshot"
    );
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    assert!(
        detail["items"]
            .as_array()
            .unwrap()
            .iter()
            .all(|i| i["in_use"]["process_label_zh"] == unknown),
        "SERVICE_M3C_INUSE_ITEM: unknown details"
    );
}

fn read_plan(f: &Fixture, preview: &Value) -> Value {
    serde_json::from_slice(
        &fs::read(
            f.data
                .join("plans")
                .join(format!("{}.json", preview["plan_id"].as_str().unwrap())),
        )
        .unwrap(),
    )
    .unwrap()
}
fn write_scan(f: &Fixture, saved: &Value) {
    fs::write(
        f.data
            .join("scans")
            .join(format!("{}.json", saved["scan_id"].as_str().unwrap())),
        saved.to_string(),
    )
    .unwrap();
}

fn recognized_categories(saved: &Value) -> usize {
    saved["result"]["groups"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|g| g["item_count"].as_u64().unwrap_or(0) > 0)
        .filter_map(|g| g["category"].as_str())
        .collect::<BTreeSet<_>>()
        .len()
}

fn history_row<'a>(history: &'a Value, id: &Value) -> &'a Value {
    history
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["id"] == *id)
        .unwrap()
}

fn staging_count_delta(saved: &Value) -> Option<i64> {
    saved["growth"].as_array().and_then(|rows| {
        rows.iter()
            .find(|row| row["group_id"] == "codex-marketplace-staging")
            .and_then(|row| row["count_delta"].as_i64())
    })
}

fn add_staging(f: &Fixture, prefix: &str, n: usize, size: u64, aged: u64) {
    for i in 0..n {
        let p = f.file(
            &format!("user_profile/.codex/.tmp/marketplaces/.staging/{prefix}-{i}/data"),
            size,
        );
        age(p.parent().unwrap(), aged);
    }
}

fn m3d_growth_base() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(false);
    let a = scanned(&s);
    let a_id = a["scan_id"].clone();
    let a_saved = scan_saved(&f, &a);
    add_staging(&f, "marketplace-upgrade-b", 10, 30, NOW - 10 * 86400);
    f.fake.now.store(NOW + 2 * 3600, Ordering::SeqCst);
    let b = scanned(&s);
    let b_id = b["scan_id"].clone();
    let b_saved = scan_saved(&f, &b);
    assert_eq!(
        b_saved["previous_scan_id"], a_id,
        "SERVICE_M3D_GROWTH_BASE: B previous_scan_id"
    );
    assert_eq!(
        b_saved["growth_base_scan_id"],
        Value::Null,
        "SERVICE_M3D_GROWTH_BASE: B growth_base_scan_id"
    );
    assert_eq!(
        b_saved["growth"],
        json!([]),
        "SERVICE_M3D_GROWTH_BASE: B growth"
    );
    add_staging(&f, "marketplace-upgrade-c", 25, 30, NOW + 25 * 3600 - 3600);
    f.fake.now.store(NOW + 25 * 3600, Ordering::SeqCst);
    let c = scanned(&s);
    let c_saved = scan_saved(&f, &c);
    assert_eq!(
        c_saved["previous_scan_id"], b_id,
        "SERVICE_M3D_GROWTH_BASE: C previous_scan_id"
    );
    assert_eq!(
        c_saved["growth_base_scan_id"], a_id,
        "SERVICE_M3D_GROWTH_BASE: C growth_base_scan_id"
    );
    assert_eq!(
        staging_count_delta(&c_saved),
        Some(35),
        "SERVICE_M3D_GROWTH_BASE: C growth vs A"
    );
    let date = f.fake.local_date(UNIX_EPOCH + Duration::from_secs(NOW));
    let compared = format!("与 {} 月 {} 日相比", date.0, date.1);
    assert!(
        c["insights"]
            .as_array()
            .unwrap()
            .iter()
            .any(|v| v["message_zh"].as_str().unwrap().contains(&compared)),
        "SERVICE_M3D_GROWTH_BASE: insight date"
    );
    let detail = call(
        &s,
        "group_detail",
        json!({"groupId":"codex-marketplace-staging"}),
    );
    assert_eq!(
        detail["group"]["growth"]["since"], a_saved["finished_at"],
        "SERVICE_M3D_GROWTH_BASE: since"
    );
    drop(s);
    let s = f.service(false);
    let reloaded = call(&s, "scan_result", json!({"scanId": c["scan_id"]}));
    let reloaded_saved = scan_saved(&f, &c);
    assert_eq!(
        reloaded_saved["growth_base_scan_id"], a_id,
        "SERVICE_M3D_GROWTH_BASE: reload growth_base_scan_id"
    );
    assert_eq!(
        staging_count_delta(&reloaded_saved),
        Some(35),
        "SERVICE_M3D_GROWTH_BASE: reload growth"
    );
    assert!(
        reloaded["insights"]
            .as_array()
            .unwrap()
            .iter()
            .any(|v| v["message_zh"].as_str().unwrap().contains(&compared)),
        "SERVICE_M3D_GROWTH_BASE: reload insight date"
    );
    let reloaded_detail = call(
        &s,
        "group_detail",
        json!({"groupId":"codex-marketplace-staging"}),
    );
    assert_eq!(
        reloaded_detail["group"]["growth"]["since"], a_saved["finished_at"],
        "SERVICE_M3D_GROWTH_BASE: reload since"
    );
    drop(s);
    let mut legacy = reloaded_saved;
    legacy
        .as_object_mut()
        .unwrap()
        .remove("growth_base_scan_id");
    write_scan(&f, &legacy);
    let s = f.service(false);
    let legacy_detail = call(
        &s,
        "group_detail",
        json!({"groupId":"codex-marketplace-staging"}),
    );
    assert_eq!(
        legacy_detail["group"]["growth"]["since"], b_saved["finished_at"],
        "SERVICE_M3D_GROWTH_BASE: legacy previous_scan_id time"
    );
}

fn m3d_history() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(false);
    let done = scanned(&s);
    let n_done = recognized_categories(&scan_saved(&f, &done));
    f.fake.hold.store(true, Ordering::SeqCst);
    let cancel = call(&s, "scan_start", json!({}));
    call(&s, "scan_cancel", json!({"scanId": cancel["scan_id"]}));
    f.fake.hold.store(false, Ordering::SeqCst);
    assert_eq!(wait(&s, "scan_progress")["state"], "cancelled");
    let n_cancel = recognized_categories(&scan_saved(&f, &cancel));
    let history = call(&s, "history_list", json!({}));
    assert_eq!(
        history_row(&history, &cancel["scan_id"])["summary_zh"],
        format!("已停止，识别 {n_cancel} 类位置"),
        "SERVICE_M3D_HISTORY: cancelled"
    );
    assert_eq!(
        history_row(&history, &done["scan_id"])["summary_zh"],
        format!("识别 {n_done} 类位置"),
        "SERVICE_M3D_HISTORY: completed"
    );
}

fn write_clean(f: &Fixture, id: &str, at: &str, groups: Value, items: Value) {
    let view = json!({
        "clean_id": id,
        "finished_at": at,
        "estimate_bytes": "0",
        "freed_bytes": "0",
        "drives": [],
        "groups": groups,
        "journal_display_path": f.data.join("journal").join(format!("{id}.jsonl")).to_string_lossy()
    });
    let record = json!({
        "clean_id": id,
        "plan_id": "plan-20270115T080000Z-0001",
        "scan_id": "scan-20270115T080000Z-0001",
        "view": view,
        "report": {
            "report_version": "water.clean-report.v1",
            "plan_id": "plan-20270115T080000Z-0001",
            "started_at": at,
            "ended_at": at,
            "status": "completed",
            "freed_bytes": "0",
            "estimate_bytes": "0",
            "volumes": [],
            "items": items
        }
    });
    let dir = f.data.join("cleans");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join(format!("{id}.json")), record.to_string()).unwrap();
}

fn clean_item(id: &str, status: &str, skip_reason: Value, failed_entries: u64) -> Value {
    json!({
        "item_id": id,
        "status": status,
        "skip_reason": skip_reason,
        "bytes_before": "10",
        "bytes_freed": "0",
        "failed_entries": failed_entries
    })
}

fn clean_group(id: &str, status: &str) -> Value {
    json!({"group_id": id, "title_zh": id, "status": status, "freed_bytes": "0", "notes_zh": []})
}

fn m3d_clean_summary() {
    let f = Fixture::new();
    write_clean(
        &f,
        "clean-20270115T080000Z-00aa",
        "2027-01-15T08:00:00Z",
        json!([
            clean_group("kept-done", "done"),
            clean_group("kept-partial", "partial"),
            clean_group("all-skipped", "skipped"),
            clean_group("all-failed", "failed")
        ]),
        json!([
            clean_item("i-1", "deleted", Value::Null, 0),
            clean_item("i-2", "partial", Value::Null, 0),
            clean_item("i-3", "skipped", json!("in_use"), 0),
            clean_item("i-4", "skipped", json!("too_recent"), 0),
            clean_item("i-5", "failed", Value::Null, 1),
            clean_item("i-6", "failed", Value::Null, 2),
            clean_item("i-7", "failed", Value::Null, 1)
        ]),
    );
    write_clean(
        &f,
        "clean-20270115T090000Z-00bb",
        "2027-01-15T09:00:00Z",
        json!([
            clean_group("only-done", "done"),
            clean_group("only-skipped", "skipped")
        ]),
        json!([
            clean_item("j-1", "deleted", Value::Null, 0),
            clean_item("j-2", "skipped", json!("in_use"), 0)
        ]),
    );
    let s = f.service(false);
    let history = call(&s, "history_list", json!({}));
    assert_eq!(
        history_row(&history, &json!("clean-20270115T080000Z-00aa"))["summary_zh"],
        "清理 2 组，跳过 2 项，失败 3 项",
        "SERVICE_M3D_CLEAN_SUMMARY: mixed"
    );
    let ok = history_row(&history, &json!("clean-20270115T090000Z-00bb"));
    assert_eq!(
        ok["summary_zh"], "清理 1 组，跳过 1 项",
        "SERVICE_M3D_CLEAN_SUMMARY: no failure"
    );
    assert!(
        !ok["summary_zh"].as_str().unwrap().contains("失败"),
        "SERVICE_M3D_CLEAN_SUMMARY: no failure wording"
    );
}

fn m3c_by_drive() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(false);
    let result = scanned(&s);
    let mut saved = scan_saved(&f, &result);
    drop(s);
    for i in saved["result"]["items"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .filter(|i| i["group_id"] == "chrome-cache")
    {
        let (path, n) = if i["path"].as_str().unwrap().contains("Profile Busy") {
            ("Y:\\cache-b", 200)
        } else {
            ("X:\\cache-a", 100)
        };
        i["path"] = json!(path);
        i["unique_bytes"] = json!(n.to_string());
    }
    write_scan(&f, &saved);
    let s = f.service(false);
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    assert_eq!(
        detail["group"]["by_drive"],
        json!([{"root":"X:\\","item_count":1,"eligible_bytes":"100"},{"root":"Y:\\","item_count":1,"eligible_bytes":"200"}]),
        "SERVICE_M3C_BY_DRIVE: sorted two drives"
    );
    assert_eq!(
        detail["group"]["drive_root"], "Y:\\",
        "SERVICE_M3C_BY_DRIVE: largest item"
    );
    drop(s);
    let mut zero = saved.clone();
    for i in zero["result"]["items"].as_array_mut().unwrap() {
        if i["path"] == "X:\\cache-a" {
            i["unique_bytes"] = json!("0");
        }
    }
    for g in zero["result"]["groups"].as_array_mut().unwrap() {
        if g["group_id"] == "chrome-cache" {
            g["unique_bytes"] = json!("200");
            g["eligible_unique_bytes"] = json!("200");
        }
    }
    write_scan(&f, &zero);
    let s = f.service(false);
    let before = call(&s, "scan_result", json!({"scanId":result["scan_id"]}));
    assert!(
        before["recommended_by_drive"]
            .as_array()
            .unwrap()
            .iter()
            .all(|r| r["root"] != "X:\\"),
        "SERVICE_M3C_SKIP: build omits zero-byte drive"
    );
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    let item = detail["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["display_path"] == "Y:\\cache-b")
        .unwrap();
    let loc = call(&s, "skip_add", json!({"itemId":item["item_id"]}));
    let skipped = call(&s, "scan_result", json!({"scanId":result["scan_id"]}));
    assert!(
        skipped["recommended_by_drive"]
            .as_array()
            .unwrap()
            .iter()
            .all(|r| r["root"] != "X:\\" && r["root"] != "Y:\\"),
        "SERVICE_M3C_SKIP: refresh omits zero-byte drives"
    );
    drop(s);
    let s = f.service(false);
    assert_eq!(
        call(&s, "scan_result", json!({"scanId":result["scan_id"]}))["recommended_by_drive"],
        skipped["recommended_by_drive"],
        "SERVICE_M3C_SKIP: zero-byte drives consistent after restart"
    );
    call(
        &s,
        "skip_remove",
        json!({"skipId":loc["skipped"][0]["skip_id"]}),
    );
    assert_eq!(
        call(&s, "scan_result", json!({"scanId":result["scan_id"]}))["recommended_by_drive"],
        before["recommended_by_drive"],
        "SERVICE_M3C_SKIP: restore positive drive only"
    );
}

fn m3c_drive_roots() {
    let f = Fixture::new();
    let d = |root: &str, is_system| DriveInfo {
        root: root.into(),
        is_system,
        total_bytes: 1000,
        free_bytes: 500,
    };
    *f.fake.drives.lock().unwrap() = vec![
        d("F:\\", true),
        d("W:\\", true),
        d("X:\\", false),
        d("Y:\\", false),
        d("Z:\\", false),
    ];
    *f.fake.file_systems.lock().unwrap() = BTreeMap::from([
        ("W:\\".into(), "NTFS".into()),
        ("X:\\".into(), "ntfs".into()),
        ("Y:\\".into(), "rEfS".into()),
        ("Z:\\".into(), "exFAT".into()),
    ]);
    // F contains the real fixture known folders, but is deliberately non-system
    // here: rejection must depend on containment, not the system-drive guard.
    f.fake.drives.lock().unwrap()[0].is_system = false;
    f.fake
        .file_systems
        .lock()
        .unwrap()
        .insert("F:\\".into(), "NTFS".into());
    let s = f.service(false);
    for root in ["W:\\", "F:\\", "V:\\"] {
        f.pick(Some(Path::new(root)));
        assert!(
            matches!(s.call("custom_root_add",json!({})),Err(e) if e.code=="invalid" && e.message_zh==TOO_BROAD),
            "SERVICE_M3C_DRIVE_ROOT: system/nonfixed/known {root}"
        );
    }
    for (root, id) in [("x:\\", "drive-x"), ("Y:\\", "drive-y")] {
        f.pick(Some(Path::new(root)));
        let added = call(&s, "custom_root_add", json!({}));
        assert_eq!(added["added"]["root_id"], id, "SERVICE_M3C_DRIVE_ROOT: id");
        assert_eq!(
            added["added"]["display_path"],
            root.to_ascii_uppercase(),
            "SERVICE_M3C_DRIVE_ROOT: display"
        );
        assert_eq!(
            added["added"]["is_drive_root"], true,
            "SERVICE_M3C_DRIVE_ROOT: flag"
        );
    }
    for fs_name in [Some("exFAT"), Some("FAT32"), None] {
        if let Some(name) = fs_name {
            f.fake
                .file_systems
                .lock()
                .unwrap()
                .insert("Z:\\".into(), name.into());
        } else {
            f.fake.file_systems.lock().unwrap().remove("Z:\\");
        }
        f.pick(Some(Path::new("Z:\\")));
        assert!(
            matches!(s.call("custom_root_add",json!({})),Err(e) if e.code=="invalid" && e.message_zh=="只支持 NTFS 或 ReFS 格式的盘"),
            "SERVICE_M3C_DRIVE_ROOT: filesystem"
        );
    }
    drop(s);
    let s = f.service(false);
    assert_eq!(
        call(&s, "locations_get", json!({}))["custom_roots"]
            .as_array()
            .unwrap()
            .len(),
        2,
        "SERVICE_M3C_DRIVE_ROOT: load roots"
    );
}

fn m3c_exclude_skip() {
    let f = Fixture::new();
    f.seed();
    let recent = f.file("windows/Temp/recent.tmp", 7);
    age(&recent, NOW);
    let s = f.service(true);
    let result = scanned(&s);
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    let items = detail["items"].as_array().unwrap();
    let default = items
        .iter()
        .find(|i| i["display_path"].as_str().unwrap().contains("Default"))
        .unwrap();
    let busy = items
        .iter()
        .find(|i| i["display_path"].as_str().unwrap().contains("Profile Busy"))
        .unwrap();
    let saved = scan_saved(&f, &result);
    let npm = saved["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["group_id"] == "npm-cache")
        .unwrap();
    let protected = saved["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["group_id"] == "claude-code-sessions")
        .unwrap();
    let too_new = saved["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["path"].as_str().unwrap().ends_with("recent.tmp"))
        .unwrap();
    for (groups, excluded) in [
        (json!(["chrome-cache"]), json!(["i-missing"])),
        (json!(["chrome-cache"]), json!([npm["item_id"]])),
        (
            json!(["chrome-cache"]),
            json!([default["item_id"], default["item_id"]]),
        ),
        (
            json!(["chrome-cache", "system-temp-old"]),
            json!([too_new["item_id"]]),
        ),
        (json!(["chrome-cache"]), json!([protected["item_id"]])),
        (json!(["chrome-cache"]), json!(vec!["i-x"; 5001])),
    ] {
        assert_eq!(
            s.call(
                "clean_prepare",
                json!({"groupIds":groups,"excludeItemIds":excluded})
            )
            .expect_err("SERVICE_M3C_EXCLUDE: invalid exclusion accepted")
            .code,
            "invalid",
            "SERVICE_M3C_EXCLUDE: invalid exclusion"
        );
    }
    let recent_before = call(&s, "group_detail", json!({"groupId":too_new["group_id"]}));
    let recent_skip = call(&s, "skip_add", json!({"itemId":too_new["item_id"]}));
    assert_eq!(
        call(&s, "group_detail", json!({"groupId":too_new["group_id"]})),
        recent_before,
        "SERVICE_M3C_SKIP: originally ineligible stays unchanged on add"
    );
    call(
        &s,
        "skip_remove",
        json!({"skipId":recent_skip["skipped"][0]["skip_id"]}),
    );
    assert_eq!(
        call(&s, "group_detail", json!({"groupId":too_new["group_id"]})),
        recent_before,
        "SERVICE_M3C_SKIP: originally ineligible stays unchanged on remove"
    );
    let p = call(
        &s,
        "clean_prepare",
        json!({"groupIds":["chrome-cache"],"excludeItemIds":[default["item_id"]]}),
    );
    assert_eq!(
        (
            p["item_count"].clone(),
            p["total_bytes"].clone(),
            p["excluded_count"].clone()
        ),
        (json!(1), json!("200"), json!(1)),
        "SERVICE_M3C_EXCLUDE: preview"
    );
    assert_eq!(
        read_plan(&f, &p)["plan"]["items"][0]["item_id"],
        busy["item_id"],
        "SERVICE_M3C_EXCLUDE: plan"
    );
    let p = call(
        &s,
        "clean_prepare",
        json!({"groupIds":["chrome-cache","npm-cache"],"excludeItemIds":[default["item_id"],busy["item_id"]]}),
    );
    assert_eq!(
        p["groups"].as_array().unwrap().len(),
        1,
        "SERVICE_M3C_EXCLUDE: empty group removed"
    );
    assert_eq!(
        p["groups"][0]["group_id"], "npm-cache",
        "SERVICE_M3C_EXCLUDE: retained group"
    );
    assert_eq!(s.call("clean_prepare",json!({"groupIds":["chrome-cache"],"excludeItemIds":[default["item_id"],busy["item_id"]]})).unwrap_err().code,"invalid","SERVICE_M3C_EXCLUDE: all empty");
    assert_eq!(
        call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}))["item_count"],
        2,
        "SERVICE_M3C_EXCLUDE: old args"
    );
    assert_eq!(
        call(
            &s,
            "clean_prepare",
            json!({"groupIds":["chrome-cache"],"excludeItemIds":[]})
        )["item_count"],
        2,
        "SERVICE_M3C_EXCLUDE: empty list"
    );
    assert_eq!(
        s.call("skip_add", json!({"itemId":protected["item_id"]}))
            .unwrap_err()
            .code,
        "invalid",
        "SERVICE_M3C_SKIP: protected"
    );
    assert_eq!(
        s.call("skip_add", json!({"itemId":"i-missing"}))
            .unwrap_err()
            .code,
        "invalid",
        "SERVICE_M3C_SKIP: unknown"
    );
    let before = result["totals"]["recommended_bytes"]
        .as_str()
        .unwrap()
        .parse::<u64>()
        .unwrap();
    let loc = call(&s, "skip_add", json!({"itemId":default["item_id"]}));
    assert_eq!(
        scan_saved(&f, &result),
        saved,
        "SERVICE_M3C_SKIP: add preserves raw scan"
    );
    assert_eq!(
        loc["skipped"][0]["display_path"], default["display_path"],
        "SERVICE_M3C_SKIP: service path"
    );
    assert_eq!(
        loc["skipped"][0]["skip_id"], "s-000001",
        "SERVICE_M3C_SKIP: sequence"
    );
    assert_eq!(
        call(&s, "skip_add", json!({"itemId":default["item_id"]})),
        loc,
        "SERVICE_M3C_SKIP: idempotent"
    );
    let after = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    let skipped = after["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["item_id"] == default["item_id"])
        .unwrap();
    assert_eq!(
        skipped["eligible"], false,
        "SERVICE_M3C_SKIP: immediate eligibility"
    );
    assert_eq!(
        skipped["reason_zh"], "已设为以后都跳过",
        "SERVICE_M3C_SKIP: immediate reason"
    );
    assert_eq!(
        after["group"]["eligible_bytes"], "200",
        "SERVICE_M3C_SKIP: immediate group"
    );
    assert_eq!(
        after["group"]["by_drive"][0]["eligible_bytes"], "200",
        "SERVICE_M3C_SKIP: immediate by drive"
    );
    let after_scan = call(&s, "scan_result", json!({"scanId":result["scan_id"]}));
    assert_eq!(
        after_scan["totals"]["recommended_bytes"],
        (before - 100).to_string(),
        "SERVICE_M3C_SKIP: immediate total"
    );
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["recommended_bytes"],
        (before - 100).to_string(),
        "SERVICE_M3C_SKIP: app total"
    );
    let p = call(
        &s,
        "clean_prepare",
        json!({"groupIds":["chrome-cache"],"excludeItemIds":[default["item_id"]]}),
    );
    assert_eq!(
        p["excluded_count"], 0,
        "SERVICE_M3C_EXCLUDE: already skipped ignored"
    );
    assert_eq!(p["item_count"], 1, "SERVICE_M3C_SKIP: immediate plan");
    assert_eq!(
        read_plan(&f, &p)["plan"]["items"][0]["item_id"],
        busy["item_id"],
        "SERVICE_M3C_SKIP: omitted"
    );
    drop(s);
    let s = f.service(true);
    assert_eq!(
        call(&s, "group_detail", json!({"groupId":"chrome-cache"}))["group"]["eligible_bytes"],
        "200",
        "SERVICE_M3C_SKIP: persisted"
    );
    let result = scanned(&s);
    assert_eq!(
        scan_saved(&f, &result)["result"]["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|i| i["path"] == default["display_path"])
            .unwrap()["ineligible_reason"],
        Value::Null,
        "SERVICE_M3C_SKIP: next scan preserves raw state"
    );
    let shown = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    assert_eq!(
        shown["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|i| i["display_path"] == default["display_path"])
            .unwrap()["reason_zh"],
        "已设为以后都跳过",
        "SERVICE_M3C_SKIP: next scan projection"
    );
    let before_remove = scan_saved(&f, &result);
    let old_plan = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    let removed = call(
        &s,
        "skip_remove",
        json!({"skipId":loc["skipped"][0]["skip_id"]}),
    );
    assert_eq!(removed["skipped"], json!([]), "SERVICE_M3C_SKIP: remove");
    assert_eq!(
        scan_saved(&f, &result),
        before_remove,
        "SERVICE_M3C_SKIP: remove preserves raw scan"
    );
    assert_eq!(
        s.call(
            "clean_start",
            json!({"planId":old_plan["plan_id"],"confirmToken":old_plan["confirm_token"]})
        )
        .expect_err("SERVICE_M3C_SKIP: remove leaves old plan executable")
        .code,
        "stale",
        "SERVICE_M3C_SKIP: remove invalidates plan"
    );
    assert_eq!(
        call(&s, "group_detail", json!({"groupId":"chrome-cache"}))["group"]["eligible_bytes"],
        "300",
        "SERVICE_M3C_SKIP: remove restores immediately"
    );
    let result = scanned(&s);
    assert_eq!(
        groups(&result)
            .into_iter()
            .find(|g| g["group_id"] == "chrome-cache")
            .unwrap()["eligible_bytes"],
        "300",
        "SERVICE_M3C_SKIP: restored on scan"
    );
    let busy_detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    let busy_id = busy_detail["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["display_path"].as_str().unwrap().contains("Profile Busy"))
        .unwrap()["item_id"]
        .clone();
    let old_plan = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    let loc = call(&s, "skip_add", json!({"itemId":busy_id}));
    assert_eq!(
        s.call(
            "clean_start",
            json!({"planId":old_plan["plan_id"],"confirmToken":old_plan["confirm_token"]})
        )
        .expect_err("SERVICE_M3C_SKIP: add leaves old plan executable")
        .code,
        "stale",
        "SERVICE_M3C_SKIP: add invalidates plan"
    );
    assert_eq!(
        call(&s, "group_detail", json!({"groupId":"chrome-cache"}))["group"]["in_use"],
        Value::Null,
        "SERVICE_M3C_SKIP: occupancy narrows"
    );
    call(
        &s,
        "skip_remove",
        json!({"skipId":loc["skipped"][0]["skip_id"]}),
    );
    assert_eq!(
        call(&s, "group_detail", json!({"groupId":"chrome-cache"}))["group"]["in_use"]["item_count"],
        1,
        "SERVICE_M3C_SKIP: occupancy restores from scan"
    );
    drop(s);
    m3c_skip_prepare_guard();
    m3c_skip_limit();
    m3c_skip_scale();
}

fn m3c_skip_prepare_guard() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(true);
    let result = scanned(&s);
    let saved = scan_saved(&f, &result);
    let item = saved["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| {
            i["group_id"] == "chrome-cache" && i["path"].as_str().unwrap().contains("Default")
        })
        .unwrap();
    let settings_path = f.data.join("settings.json");
    call(
        &s,
        "locations_set_category",
        json!({"category":"crash_log","enabled":true}),
    );
    let mut settings: Value = serde_json::from_slice(&fs::read(&settings_path).unwrap()).unwrap();
    settings["skipped"] = json!([{"skip_id":"s-000001","path":item["path"].as_str().unwrap().to_ascii_uppercase(),"added_at":"2027-01-01T00:00:00Z"}]);
    fs::write(settings_path, settings.to_string()).unwrap();
    let p = call(&s, "clean_prepare", json!({"groupIds":["chrome-cache"]}));
    assert_eq!(
        p["excluded_count"], 1,
        "SERVICE_M3C_SKIP: prepare insurance count"
    );
    assert_eq!(
        p["item_count"], 1,
        "SERVICE_M3C_SKIP: prepare insurance items"
    );
    assert!(
        read_plan(&f, &p)["plan"]["items"]
            .as_array()
            .unwrap()
            .iter()
            .all(|i| i["item_id"] != item["item_id"]),
        "SERVICE_M3C_SKIP: prepare insurance plan"
    );
}

fn m3c_skip_limit() {
    let f = Fixture::new();
    for n in 0..65 {
        f.file(
            &format!("local_app_data/Google/Chrome/User Data/Profile {n}/Cache/data"),
            1,
        );
    }
    f.age_all(NOW - 10 * 86400);
    let s = f.service(true);
    scanned(&s);
    let items = call(&s, "group_detail", json!({"groupId":"chrome-cache"}))["items"]
        .as_array()
        .unwrap()
        .clone();
    for item in items.iter().take(64) {
        let started = Instant::now();
        s.call("skip_add", json!({"itemId":item["item_id"]}))
            .unwrap();
        assert!(
            started.elapsed() <= Duration::from_millis(50),
            "SERVICE_M3C_SKIP: add {} took {:?}",
            item["item_id"],
            started.elapsed()
        );
    }
    assert_eq!(
        s.call("skip_add", json!({"itemId":items[64]["item_id"]}))
            .unwrap_err()
            .code,
        "invalid",
        "SERVICE_M3C_SKIP: 65th"
    );
    assert_eq!(
        call(&s, "locations_get", json!({}))["skipped"]
            .as_array()
            .unwrap()
            .len(),
        64,
        "SERVICE_M3C_SKIP: limit"
    );
}

fn m3c_compat() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(false);
    let result = scanned(&s);
    call(
        &s,
        "locations_set_category",
        json!({"category":"dev_cache","enabled":false}),
    );
    let mut saved = scan_saved(&f, &result);
    drop(s);
    let settings_path = f.data.join("settings.json");
    let mut settings: Value = serde_json::from_slice(&fs::read(&settings_path).unwrap()).unwrap();
    settings["settings_version"] = json!("water.settings.v1");
    settings.as_object_mut().unwrap().remove("skipped");
    fs::write(&settings_path, settings.to_string()).unwrap();
    for key in ["in_use", "item_in_use", "orphans"] {
        let mut copy = saved.clone();
        copy.as_object_mut().unwrap().remove(key);
        write_scan(&f, &copy);
        let s = f.service(false);
        assert_eq!(
            call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
            result["scan_id"],
            "SERVICE_M3C_INUSE_ITEM: independently optional {key}"
        );
        let locations = call(&s, "locations_get", json!({}));
        assert_eq!(
            locations["skipped"],
            json!([]),
            "SERVICE_M3C_SKIP: old settings"
        );
        assert_eq!(
            locations["categories"][4]["enabled"], false,
            "SERVICE_M3C_SKIP: old categories retained"
        );
    }
    saved["in_use"] = json!({"chrome-cache":{"process_label_zh":"旧提示"}});
    for i in saved["result"]["items"].as_array_mut().unwrap() {
        i.as_object_mut().unwrap().remove("unique_bytes");
    }
    for g in saved["result"]["groups"].as_array_mut().unwrap() {
        g.as_object_mut().unwrap().remove("unique_bytes");
        g.as_object_mut().unwrap().remove("eligible_unique_bytes");
    }
    saved.as_object_mut().unwrap().remove("item_in_use");
    write_scan(&f, &saved);
    let s = f.service(false);
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    assert_eq!(
        detail["group"]["in_use"],
        json!({"process_label_zh":"旧提示","item_count":null}),
        "SERVICE_M3C_INUSE_ITEM: old group label"
    );
    assert!(
        detail["items"]
            .as_array()
            .unwrap()
            .iter()
            .all(|i| i["in_use"].is_null()),
        "SERVICE_M3C_INUSE_ITEM: old details"
    );
    assert_eq!(
        detail["group"]["total_bytes"], "300",
        "SERVICE_M3C_UNIQUE: legacy fallback"
    );
}

fn m3c_trends() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(false);
    assert_eq!(
        call(&s, "app_state", json!({}))["checkup_due"],
        json!({"days_since_last":null}),
        "SERVICE_M3C_DUE: never"
    );
    assert_eq!(
        call(&s, "trends", json!({}))["orphans"],
        Value::Null,
        "SERVICE_M3C_ORPHANS: no record"
    );
    *f.fake.orphans.lock().unwrap() = (0..52)
        .map(|n| water_process_scan::OrphanChain {
            root_pid: n + 1,
            name: format!("node-{n}.exe"),
            created_at: Some("2027-01-01T00:00:00Z".into()),
            matched_pattern: "jest-worker".into(),
            descendant_pids: vec![100 + n],
            memory_bytes: if n == 0 { None } else { Some(n.to_string()) },
        })
        .collect();
    let result = scanned(&s);
    let trends = call(&s, "trends", json!({}));
    assert_eq!(
        trends["orphans"]["chains"].as_array().unwrap().len(),
        50,
        "SERVICE_M3C_ORPHANS: cap"
    );
    assert_eq!(
        trends["orphans"]["chains"][0]["memory_bytes"], "51",
        "SERVICE_M3C_ORPHANS: descending"
    );
    assert_eq!(
        trends["orphans"]["chains"][0]["process_count"], 2,
        "SERVICE_M3C_ORPHANS: descendants"
    );
    assert_eq!(
        trends["orphans"]["total_memory_bytes"],
        (2..=51).sum::<u64>().to_string(),
        "SERVICE_M3C_ORPHANS: sum"
    );
    assert_eq!(
        scan_saved(&f, &result)["orphans"],
        trends["orphans"]["chains"],
        "SERVICE_M3C_ORPHANS: persisted"
    );
    let ended = util::parse_time(result["finished_at"].as_str().unwrap())
        .unwrap()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    f.fake.now.store(ended + 6 * 86400, Ordering::SeqCst);
    assert_eq!(
        call(&s, "app_state", json!({}))["checkup_due"],
        Value::Null,
        "SERVICE_M3C_DUE: six days"
    );
    f.fake.now.store(ended + 7 * 86400, Ordering::SeqCst);
    assert_eq!(
        call(&s, "app_state", json!({}))["checkup_due"],
        json!({"days_since_last":7}),
        "SERVICE_M3C_DUE: seven days"
    );
    let mut saved = scan_saved(&f, &result);
    drop(s);
    *f.fake.drives.lock().unwrap() = ["F:\\", "X:\\", "Y:\\", "Z:\\", "V:\\"]
        .iter()
        .map(|r| DriveInfo {
            root: (*r).into(),
            is_system: *r == "F:\\",
            total_bytes: 1_000_000,
            free_bytes: 1000,
        })
        .collect();
    for (n, at, free) in [
        (1, "2027-01-15T08:00:00Z", 1000),
        (2, "2027-01-17T08:00:00Z", 1000),
        (3, "2027-01-19T08:00:00Z", 800),
    ] {
        let id = format!(
            "scan-202701{}T080000Z-{n:04x}",
            if n == 1 {
                15
            } else if n == 2 {
                17
            } else {
                19
            }
        );
        saved["scan_id"] = json!(id);
        saved["result"]["scan_id"] = json!(id);
        saved["finished_at"] = json!(at);
        saved["result"]["ended_at"] = json!(at);
        saved["drives"] = json!([
            {"root":"F:\\","free_bytes":free.to_string()},
            {"root":"X:\\","free_bytes":(1000+n*100).to_string()},
            {"root":"Y:\\","free_bytes":(1_000_000-n*100).to_string()},
            {"root":"V:\\","free_bytes":if n == 3 {"1001"} else {"1000"}}
        ]);
        if n == 3 {
            saved["drives"]
                .as_array_mut()
                .unwrap()
                .push(json!({"root":"Z:\\","free_bytes":"500"}));
        }
        saved["orphans"] = json!([{"name":"node.exe","matched_pattern":"codex","process_count":1,"memory_bytes":null,"started_at":null}]);
        write_scan(&f, &saved);
    }
    let source = f
        .data
        .join("scans")
        .join(format!("{}.json", result["scan_id"].as_str().unwrap()));
    let mut old: Value = serde_json::from_slice(&fs::read(&source).unwrap()).unwrap();
    old["drives"] = json!([]);
    fs::write(source, old.to_string()).unwrap();
    let mut clean = fixtures()["clean_result"].clone();
    clean["clean_id"] = json!("clean-20270117T120000Z-0001");
    clean["finished_at"] = json!("2027-01-17T12:00:00Z");
    clean["drives"] = json!([{"root":"F:\\","free_before":"700","free_after":"900"}]);
    let record = json!({"clean_id":clean["clean_id"],"plan_id":"plan-20270117T120000Z-0001","scan_id":result["scan_id"],"view":clean,"report":{"report_version":"water.clean-report.v1","plan_id":"plan-20270117T120000Z-0001","started_at":"2027-01-17T12:00:00Z","ended_at":"2027-01-17T12:00:00Z","status":"completed","freed_bytes":"200","estimate_bytes":"200","volumes":[],"items":[]}});
    fs::write(
        f.data.join("cleans/clean-20270117T120000Z-0001.json"),
        record.to_string(),
    )
    .unwrap();
    let s = f.service(false);
    let t = call(&s, "trends", json!({}));
    let fc = t["forecast"].as_array().unwrap();
    let drive = |root: &str| fc.iter().find(|p| p["root"] == root).unwrap();
    assert_eq!(
        drive("F:\\"),
        &json!({"root":"F:\\","days_to_full":8,"bytes_per_day":"100","basis_days":4.0,"note_zh":null}),
        "SERVICE_M3C_FORECAST: cleanup jump adjusted"
    );
    assert_eq!(
        drive("X:\\")["note_zh"],
        "最近 30 天可用空间没有减少",
        "SERVICE_M3C_FORECAST: no decrease"
    );
    assert_eq!(
        drive("X:\\")["bytes_per_day"],
        "-50",
        "SERVICE_M3C_FORECAST: negative rate"
    );
    assert_eq!(
        drive("V:\\")["bytes_per_day"],
        "0",
        "SERVICE_M3C_FORECAST: no negative zero"
    );
    assert_eq!(
        drive("V:\\")["note_zh"],
        "最近 30 天可用空间没有减少",
        "SERVICE_M3C_FORECAST: fractional negative rate"
    );
    assert_eq!(
        drive("Y:\\")["note_zh"],
        "按现在的速度，十年内不会满",
        "SERVICE_M3C_FORECAST: long horizon"
    );
    assert_eq!(
        drive("Z:\\")["note_zh"],
        "至少需要 3 天内 3 次体检才能估算",
        "SERVICE_M3C_FORECAST: insufficient points"
    );
    assert_eq!(
        t["orphans"]["total_memory_bytes"],
        Value::Null,
        "SERVICE_M3C_ORPHANS: all unknown"
    );
    assert_eq!(
        t["orphans"]["chains"][0]["started_at"],
        Value::Null,
        "SERVICE_M3C_ORPHANS: unknown time"
    );
}

fn m3c_snapshot_remove_fail() {
    let f = Fixture::new();
    f.seed();
    for n in 0..1000 {
        f.file(&format!("windows/Temp/old-{n}.tmp"), 1);
    }
    f.age_all(NOW - 10 * 86400);
    let s = source_service(&f, false);
    let first = scanned(&s);
    let (written_tx, written_rx) = mpsc::channel();
    let (resume_tx, resume_rx) = mpsc::channel();
    *s.core.store.after_snapshot.lock().unwrap() = Some((written_tx, resume_rx));
    f.fake.entered.store(false, Ordering::SeqCst);
    f.fake.hold.store(true, Ordering::SeqCst);
    let id = call(&s, "scan_start", json!({}));
    let begin = Instant::now();
    while !f.fake.entered.load(Ordering::SeqCst) {
        assert!(
            begin.elapsed() < Duration::from_secs(10),
            "SERVICE_SNAPSHOT_REMOVE_FAIL: start"
        );
        std::thread::sleep(Duration::from_millis(1));
    }
    // The scan destination is a plain file held without delete sharing: serialization
    // and sync of the large temporary record succeed, but its final rename fails.
    let blocked = f
        .data
        .join("scans")
        .join(format!("{}.json", id["scan_id"].as_str().unwrap()));
    fs::write(&blocked, "{}").unwrap();
    let scan_lock = OpenOptions::new()
        .read(true)
        .share_mode(1 | 2)
        .open(&blocked)
        .unwrap();
    let snapshot = f
        .data
        .join("snapshots")
        .join(format!("{}.json", id["scan_id"].as_str().unwrap()));
    f.fake.hold.store(false, Ordering::SeqCst);
    // The test-side adapter pauses after the real atomic snapshot write returns,
    // before the real scan write/removal. No production hook or timing race.
    written_rx
        .recv_timeout(Duration::from_secs(10))
        .expect("SERVICE_SNAPSHOT_REMOVE_FAIL: snapshot write");
    let held = Some(
        OpenOptions::new()
            .read(true)
            .share_mode(1 | 2)
            .open(&snapshot)
            .expect("SERVICE_SNAPSHOT_REMOVE_FAIL: open snapshot"),
    );
    resume_tx.send(()).unwrap();
    let progress = settle(&s, "scan_progress", "SERVICE_SNAPSHOT_REMOVE_FAIL");
    assert!(
        held.is_some(),
        "SERVICE_SNAPSHOT_REMOVE_FAIL: did not hold snapshot before removal"
    );
    assert_eq!(
        progress["state"], "failed",
        "SERVICE_SNAPSHOT_REMOVE_FAIL: failed write"
    );
    assert!(
        snapshot.is_file(),
        "SERVICE_SNAPSHOT_REMOVE_FAIL: locked snapshot should remain"
    );
    let app = call(&s, "app_state", json!({}));
    assert_eq!(app["busy"], "idle", "SERVICE_SNAPSHOT_REMOVE_FAIL: idle");
    assert_eq!(
        app["last_scan"]["scan_id"], first["scan_id"],
        "SERVICE_SNAPSHOT_REMOVE_FAIL: rolled back"
    );
    drop(held);
    drop(scan_lock);
    drop(s);
    let s = f.service(false);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        first["scan_id"],
        "SERVICE_SNAPSHOT_REMOVE_FAIL: restart"
    );
}

fn m3c_skip_scale() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(true);
    let result = scanned(&s);
    let mut saved = scan_saved(&f, &result);
    drop(s);
    let small = saved.clone();
    let prototype = saved["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["group_id"] == "chrome-cache")
        .unwrap()
        .clone();
    let total = 10_000u64;
    saved["result"]["items"]
        .as_array_mut()
        .unwrap()
        .retain(|i| i["group_id"] != "chrome-cache");
    for n in 0..total {
        let mut item = prototype.clone();
        item["item_id"] = json!(format!("i-{:06}", 100_000 + n));
        item["path"] = json!(format!(
            "{}\\local_app_data\\Google\\Chrome\\User Data\\Scale {n}\\Cache",
            slash(&f.root)
        ));
        item["total_bytes"] = json!("100");
        item["unique_bytes"] = json!("100");
        item["eligible"] = json!(true);
        item["ineligible_reason"] = Value::Null;
        saved["result"]["items"].as_array_mut().unwrap().push(item);
    }
    let g = saved["result"]["groups"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|g| g["group_id"] == "chrome-cache")
        .unwrap();
    g["item_count"] = json!(total);
    g["eligible_count"] = json!(total);
    for key in [
        "total_bytes",
        "eligible_bytes",
        "unique_bytes",
        "eligible_unique_bytes",
    ] {
        g[key] = json!((total * 100).to_string());
    }
    saved["in_use"] = json!({});
    saved["item_in_use"] = json!({});
    write_scan(&f, &saved);
    // Exercise the 60-record cap: two 10,000-item scans share the target path,
    // the other 58 are small scans, all represented only by record JSON.
    let mut old_id = String::new();
    for n in 1..60 {
        let mut old = if n == 1 { saved.clone() } else { small.clone() };
        let id = format!("scan-20270114T080000Z-{n:04x}");
        let at = util::timestamp(UNIX_EPOCH + Duration::from_secs(NOW - n * 3600));
        old["scan_id"] = json!(id);
        old["result"]["scan_id"] = json!(id);
        for key in ["started_at", "finished_at"] {
            old[key] = json!(at);
        }
        for key in ["started_at", "ended_at"] {
            old["result"][key] = json!(at);
        }
        write_scan(&f, &old);
        if n == 1 {
            old_id = id;
        }
    }
    let scan_path = f
        .data
        .join("scans")
        .join(format!("{}.json", result["scan_id"].as_str().unwrap()));
    let original = fs::read(&scan_path).unwrap();
    let s = f.service(true);
    assert_eq!(
        call(&s, "history_list", json!({}))
            .as_array()
            .unwrap()
            .len(),
        60,
        "SERVICE_M3C_SKIP: all retained scans loaded"
    );
    let initial = call(&s, "app_state", json!({}))["last_scan"]["recommended_bytes"]
        .as_str()
        .unwrap()
        .parse::<u64>()
        .unwrap();
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    let item_id = detail["items"][0]["item_id"].clone();
    let mut additions = Vec::new();
    let mut removals = Vec::new();
    for _ in 0..5 {
        let start = Instant::now();
        let loc = s
            .call("skip_add", json!({"itemId":item_id}))
            .expect("SERVICE_M3C_SKIP: scale add");
        let elapsed = start.elapsed();
        additions.push(elapsed.as_secs_f64() * 1000.0);
        assert!(
            elapsed <= Duration::from_millis(50),
            "SERVICE_M3C_SKIP: scale add {elapsed:?}"
        );
        scale_projection(&s, &item_id, initial - 100, total - 1, false);
        scale_history(&s, &old_id, initial - 100, total - 1);
        assert_eq!(
            fs::read(&scan_path).unwrap(),
            original,
            "SERVICE_M3C_SKIP: scale add scan bytes"
        );
        let start = Instant::now();
        s.call(
            "skip_remove",
            json!({"skipId":loc["skipped"][0]["skip_id"]}),
        )
        .expect("SERVICE_M3C_SKIP: scale remove");
        let elapsed = start.elapsed();
        removals.push(elapsed.as_secs_f64() * 1000.0);
        assert!(
            elapsed <= Duration::from_millis(50),
            "SERVICE_M3C_SKIP: scale remove {elapsed:?}"
        );
        scale_projection(&s, &item_id, initial, total, true);
        scale_history(&s, &old_id, initial, total);
        assert_eq!(
            fs::read(&scan_path).unwrap(),
            original,
            "SERVICE_M3C_SKIP: scale remove scan bytes"
        );
    }
    println!(
        "SERVICE_M3C_SKIP scale_ms {}",
        json!({"items":total,"add":additions,"remove":removals})
    );
    let loc = call(&s, "skip_add", json!({"itemId":item_id}));
    let before_restart = scale_history(&s, &old_id, initial - 100, total - 1);
    drop(s);
    let settings_path = f.data.join("settings.json");
    let mut settings: Value = serde_json::from_slice(&fs::read(&settings_path).unwrap()).unwrap();
    settings["skipped"][0]["path"] = json!(
        settings["skipped"][0]["path"]
            .as_str()
            .unwrap()
            .to_ascii_uppercase()
    );
    fs::write(&settings_path, settings.to_string()).unwrap();
    let s = f.service(true);
    scale_projection(&s, &item_id, initial - 100, total - 1, false);
    assert_eq!(
        scale_history(&s, &old_id, initial - 100, total - 1),
        before_restart,
        "SERVICE_M3C_SKIP: old scan unchanged across restart with different-case skip path"
    );
    call(
        &s,
        "skip_remove",
        json!({"skipId":loc["skipped"][0]["skip_id"]}),
    );
    let before_restart = scale_history(&s, &old_id, initial, total);
    drop(s);
    let s = f.service(true);
    scale_projection(&s, &item_id, initial, total, true);
    assert_eq!(
        scale_history(&s, &old_id, initial, total),
        before_restart,
        "SERVICE_M3C_SKIP: old restored scan unchanged across restart"
    );
    assert_eq!(
        fs::read(&scan_path).unwrap(),
        original,
        "SERVICE_M3C_SKIP: restart scan bytes unchanged"
    );
    drop(s);
    m3c_exclude_scale(&f, saved);
}

fn scale_history(s: &Service, id: &str, recommended: u64, count: u64) -> (Value, Value) {
    let scan = call(s, "scan_result", json!({"scanId":id}));
    assert_eq!(
        scan["totals"]["recommended_bytes"],
        recommended.to_string(),
        "SERVICE_M3C_SKIP: old scan total"
    );
    let group = groups(&scan)
        .into_iter()
        .find(|g| g["group_id"] == "chrome-cache")
        .unwrap();
    assert_eq!(
        group["eligible_count"], count,
        "SERVICE_M3C_SKIP: old scan eligible count"
    );
    assert_eq!(
        group["eligible_bytes"],
        (count * 100).to_string(),
        "SERVICE_M3C_SKIP: old scan eligible bytes"
    );
    let history = call(s, "history_list", json!({}));
    let row = history
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["id"] == id)
        .unwrap()
        .clone();
    assert_eq!(
        row["bytes"],
        recommended.to_string(),
        "SERVICE_M3C_SKIP: old history bytes"
    );
    (scan, row)
}

fn m3c_exclude_scale(f: &Fixture, mut saved: Value) {
    for item in saved["result"]["items"].as_array_mut().unwrap() {
        if item["group_id"] == "chrome-cache" && item["item_id"].as_str().unwrap() < "i-104999" {
            item["eligible"] = json!(false);
            item["ineligible_reason"] = json!("too_recent");
        }
    }
    for g in saved["result"]["groups"].as_array_mut().unwrap() {
        if g["group_id"] == "chrome-cache" {
            g["eligible_count"] = json!(5001);
            g["eligible_bytes"] = json!("500100");
            g["eligible_unique_bytes"] = json!("500100");
        }
    }
    write_scan(f, &saved);
    let s = source_service(f, true);
    let args = json!({"groupIds":["chrome-cache"],"excludeItemIds":(105_000..110_000).map(|n|format!("i-{n:06}")).collect::<Vec<_>>()});
    assert_eq!(
        s.call("clean_prepare", args.clone()).unwrap_err().code,
        "stale",
        "SERVICE_M3C_EXCLUDE: loaded scan remains untrusted"
    );
    // Test-only local authorisation; never exposed by the product or followed
    // by clean_start. All paths remain synthetic and no files are created.
    s.core
        .state
        .lock()
        .unwrap()
        .local_scans
        .insert(saved["scan_id"].as_str().unwrap().into());
    let started = Instant::now();
    let preview = s
        .call("clean_prepare", args)
        .expect("SERVICE_M3C_EXCLUDE: scale prepare");
    let elapsed = started.elapsed();
    assert!(
        elapsed <= Duration::from_millis(50),
        "SERVICE_M3C_EXCLUDE: scale prepare {elapsed:?}"
    );
    println!(
        "SERVICE_M3C_EXCLUDE scale_ms {}",
        elapsed.as_secs_f64() * 1000.0
    );
    assert_eq!(
        (
            preview["item_count"].clone(),
            preview["total_bytes"].clone(),
            preview["excluded_count"].clone()
        ),
        (json!(1), json!("100"), json!(5000)),
        "SERVICE_M3C_EXCLUDE: scale preview"
    );
    let plan = read_plan(f, &preview);
    assert_eq!(
        plan["plan"]["items"].as_array().unwrap().len(),
        1,
        "SERVICE_M3C_EXCLUDE: scale plan count"
    );
    assert_eq!(
        plan["plan"]["items"][0]["item_id"], "i-104999",
        "SERVICE_M3C_EXCLUDE: scale plan retained item"
    );
}

fn scale_projection(s: &Service, item_id: &Value, recommended: u64, count: u64, eligible: bool) {
    let d = call(s, "group_detail", json!({"groupId":"chrome-cache"}));
    let item = d["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| &i["item_id"] == item_id)
        .unwrap();
    assert_eq!(item["eligible"], eligible, "SERVICE_M3C_SKIP: scale item");
    assert_eq!(
        item["reason_zh"],
        if eligible {
            Value::Null
        } else {
            json!("已设为以后都跳过")
        },
        "SERVICE_M3C_SKIP: scale reason"
    );
    assert_eq!(
        d["group"]["eligible_count"], count,
        "SERVICE_M3C_SKIP: scale count"
    );
    assert_eq!(
        d["group"]["eligible_bytes"],
        (count * 100).to_string(),
        "SERVICE_M3C_SKIP: scale group bytes"
    );
    assert_eq!(
        d["group"]["by_drive"][0]["eligible_bytes"],
        (count * 100).to_string(),
        "SERVICE_M3C_SKIP: scale by drive"
    );
    assert_eq!(
        call(s, "app_state", json!({}))["last_scan"]["recommended_bytes"],
        recommended.to_string(),
        "SERVICE_M3C_SKIP: scale app total"
    );
    let id = call(s, "app_state", json!({}))["last_scan"]["scan_id"].clone();
    let scan = call(s, "scan_result", json!({"scanId":id}));
    assert_eq!(
        scan["totals"]["recommended_bytes"],
        recommended.to_string(),
        "SERVICE_M3C_SKIP: scale scan total"
    );
    assert_eq!(
        scan["recommended_by_drive"][0]["bytes"],
        recommended.to_string(),
        "SERVICE_M3C_SKIP: scale recommended drive"
    );
}

fn m35_scan(s: &impl TestService, ids: Value) -> Value {
    let id = call(s, "scan_start", json!({"locationIds":ids}));
    let p = wait(s, "scan_progress");
    assert!(
        p["state"] == "completed" || p["state"] == "partial",
        "SERVICE_M35_SCOPE: {p}"
    );
    call(s, "scan_result", json!({"scanId":id["scan_id"]}))
}
fn m35_add(s: &impl TestService, f: &Fixture, relative: &str) -> String {
    let root = f.root.join(relative);
    fs::create_dir_all(&root).unwrap();
    f.pick(Some(&root));
    call(s, "custom_root_add", json!({}))["added"]["root_id"]
        .as_str()
        .unwrap()
        .into()
}
fn m35_decide(s: &impl TestService, gid: &str) -> Value {
    let c = call(s, "conclusion_get", json!({}));
    call(
        s,
        "conclusion_decide",
        json!({"version":c["version"],"decision":{"group":gid,"choice":"clean"}}),
    )
}
fn m35_run_clean(s: &impl TestService, preview: &Value) -> (Value, Value) {
    let id = call(
        s,
        "clean_start",
        json!({"planId":preview["plan_id"],"confirmToken":preview["confirm_token"]}),
    );
    let p = wait(s, "clean_progress");
    let result = call(s, "clean_result", json!({"cleanId":id["clean_id"]}));
    (p, result)
}
fn m35_decl(f: &Fixture, path: &str, protected: Value) -> PathBuf {
    let path = f.root.join(path).join(".water-cleanup.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path,json!({"version":1,"project":"Synthetic","protected":protected,"disposable":[{"id":"builds","title":"声明构建目录","paths":["output"],"when":"always","ask":true}]}).to_string()).unwrap();
    path
}

// Synthetic record injection is confined to the test crate's private service;
// production never exposes this authority. Executed paths stay in this fixture.
fn m35_replace_record(s: &service::Service, saved: Value) {
    let mut state = s.core.state.lock().unwrap();
    let record = service::Record {
        result: water_junk_scan::result_from_json(&saved["result"].to_string()).unwrap(),
        plan: water_junk_rules::ScanPlan::from_json(&saved["plan"].to_string()).unwrap(),
        growth: serde_json::from_value(saved["growth"].clone()).unwrap(),
        saved,
        previous_at: None,
        projection: Mutex::new(views::Projection::default()),
    };
    *record.projection() = views::Projection::new(
        &record,
        &s.core.rules,
        s.core.platform.as_ref(),
        &state.settings,
    );
    let id = record.result.scan_id.clone();
    state.records.retain(|r| r.result.scan_id != id);
    state.records.push(Arc::new(record));
    state.last = Some(id.clone());
    state.local_scans.insert(id.clone());
    state.consumed.remove(&id);
    state.m35.stale.remove(&id);
    state.m35.conclusion = None;
}

fn m35_safety_facts() {
    let f = Fixture::new();
    f.seed();
    let s = source_service(&f, true);
    let result = scanned(&s);
    let base = scan_saved(&f, &result);
    let index = base["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .position(|i| i["group_id"] == "npm-cache")
        .unwrap();
    for (key, value, reason) in [
        ("referenced_count", json!(1), "引用"),
        ("valuable_count", json!(1), "贵重文件"),
        ("odd_count", json!(1), "名字特殊"),
    ] {
        let mut raw = base.clone();
        let i = &mut raw["result"]["items"][index];
        i[key] = value;
        if key == "referenced_count" {
            i["referenced_by"] = json!(["F:\\synthetic-link"]);
        }
        if key == "valuable_count" {
            i["valuable_names"] = json!(["signing.jks"]);
        }
        if key == "odd_count" {
            i["odd_names"] = json!(["npm-cache"]);
        }
        let mut typed = water_junk_scan::result_from_json(&raw["result"].to_string()).unwrap();
        let notes = m35::supplement(&s.core, &mut typed, &[], &BTreeMap::new());
        assert!(
            !typed.items[index].eligible
                && typed.items[index]
                    .ineligible_reason
                    .as_deref()
                    .unwrap()
                    .contains(reason),
            "SERVICE_M35_SCOPE: {key}"
        );
        for (k, v) in notes.as_object().unwrap() {
            raw[k] = v.clone();
        }
        raw["result"] = json!(typed);
        m35_replace_record(&s, raw);
        assert!(
            s.call("clean_prepare", json!({"groupIds":["npm-cache"]}))
                .is_err(),
            "SERVICE_M35_CLEAN: unsafe fact reached plan {key}"
        );
    }
    let mut raw = base.clone();
    raw["result"]["items"][index]["odd_count"] = json!(1);
    raw["result"]["items"][index]["odd_names"] = json!(["nested\\nul"]);
    let mut typed = water_junk_scan::result_from_json(&raw["result"].to_string()).unwrap();
    let extra = m35::supplement(&s.core, &mut typed, &[], &BTreeMap::new());
    assert!(
        typed.items[index].eligible
            && extra["item_notes"][typed.items[index].item_id.as_str()][0]
                .as_str()
                .unwrap()
                .contains("Water 能删"),
        "SERVICE_M35_SCOPE: contained odd name"
    );
    let confirm = base["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .position(|i| i["group_id"] == "downloads-installers")
        .unwrap();
    let mut typed = water_junk_scan::result_from_json(&base["result"].to_string()).unwrap();
    typed.items[confirm].valuable_count = 1;
    typed.items[confirm].valuable_names = vec!["release.key".into()];
    m35::supplement(&s.core, &mut typed, &[], &BTreeMap::new());
    assert!(
        typed.items[confirm].eligible,
        "SERVICE_M35_SCOPE: confirm valuable stays confirm"
    );
}

fn m14_program_directories() {
    let f = Fixture::new();
    f.seed();
    for path in [
        "selected/apps/Bar/Bar-1.2.0.exe",
        "selected/apps/Barley/Foo-setup.exe",
        "selected/prog/App/unins000.exe",
        "selected/prog/App/App-setup.exe",
        "selected/downloads/Foo-setup.exe",
        "selected/downloads/install-service.exe",
        "selected/downloads/cli-arm64.exe",
        "selected/downloads/MostLogin-setup.exe",
        "selected/downloads/Git-2.47.0-64-bit.exe",
    ] {
        f.file(path, 100);
    }
    for n in 0..12 {
        f.file(&format!("selected/prog/App/cache/verify-A{n:05}/data"), 100);
    }
    f.age_all(NOW - 8 * 86400);
    let app = |name: &str, location: Option<String>| water_installed_apps::App {
        scope: "user".into(),
        key: name.into(),
        name: name.into(),
        version: Some("1.2".into()),
        install_location: location,
    };
    *f.fake.apps.lock().unwrap() = Some(water_installed_apps::AppList {
        apps_version: "water.installed-apps.v1".into(),
        collected_at: NOW.to_string(),
        apps: vec![
            app(
                "Bar",
                Some(slash(&f.root.join("selected/apps/Bar")).to_ascii_uppercase()),
            ),
            app("Root", Some("F:\\".into())),
            app("Xbox Service", None),
            app("GitHub CLI", None),
            app("MostLogin", None),
            app("Git", None),
            app("Git 2024", None),
        ],
        truncated: false,
        unreadable_keys: 0,
    });
    let s = source_service(&f, false);
    let id = m35_add(&s, &f, "selected");
    let scan = m35_scan(&s, json!([id]));
    let saved = scan_saved(&f, &scan);
    let items = saved["result"]["items"].as_array().unwrap();
    let at = |rel: &str| {
        items
            .iter()
            .find(|i| i["path"] == slash(&f.root.join(rel)))
            .unwrap_or_else(|| panic!("SERVICE_M35_SCOPE: missing {rel}"))
    };
    for (rel, reason) in [
        (
            "selected/apps/Bar/Bar-1.2.0.exe",
            "在已安装程序 Bar 的安装目录里",
        ),
        (
            "selected/prog/App/App-setup.exe",
            "在程序目录 App 里（有卸载程序）",
        ),
    ] {
        let i = at(rel);
        assert_eq!(
            i["eligible"], false,
            "SERVICE_M35_SCOPE: program file {rel}"
        );
        assert_eq!(
            i["ineligible_reason"], reason,
            "SERVICE_M35_SCOPE: first reason {rel}"
        );
        assert_eq!(
            saved["item_notes"][i["item_id"].as_str().unwrap()][0],
            reason,
            "SERVICE_M35_SCOPE: first note {rel}"
        );
    }
    // Before W10-M12 the rules also took unins000.exe as an installer; since M12 it is no item at
    // all. Either way it must never be clean-able.
    let uninstaller = "selected/prog/App/unins000.exe";
    if let Some(i) = items.iter().find(|i| i["path"] == slash(&f.root.join(uninstaller))) {
        assert_eq!(
            i["eligible"], false,
            "SERVICE_M35_SCOPE: program file {uninstaller}"
        );
        assert_eq!(
            i["ineligible_reason"], "在程序目录 App 里（有卸载程序）",
            "SERVICE_M35_SCOPE: first reason {uninstaller}"
        );
    }
    for rel in [
        "selected/downloads/Foo-setup.exe",
        "selected/apps/Barley/Foo-setup.exe",
    ] {
        assert_eq!(
            at(rel)["eligible"],
            true,
            "SERVICE_M35_SCOPE: unrelated installer {rel}"
        );
    }
    for rel in [
        "selected/downloads/install-service.exe",
        "selected/downloads/cli-arm64.exe",
    ] {
        if let Some(i) = items.iter().find(|i| i["path"] == slash(&f.root.join(rel))) {
            assert!(
                !saved["item_notes"][i["item_id"].as_str().unwrap()]
                    .to_string()
                    .contains("对应的软件已经装好"),
                "SERVICE_M35_SCOPE: partial app name {rel}"
            );
        }
    }
    for (rel, text) in [
        (
            "selected/downloads/MostLogin-setup.exe",
            "对应的软件已经装好：MostLogin 1.2",
        ),
        (
            "selected/downloads/Git-2.47.0-64-bit.exe",
            "对应的软件已经装好：Git 1.2",
        ),
    ] {
        let i = at(rel);
        assert_eq!(
            saved["item_notes"][i["item_id"].as_str().unwrap()],
            json!([text]),
            "SERVICE_M35_SCOPE: whole name and first match {rel}"
        );
    }
    let group = saved["result"]["groups"]
        .as_array()
        .unwrap()
        .iter()
        .find(|g| g["cluster"]["parent"] == slash(&f.root.join("selected/prog/App/cache")))
        .expect("SERVICE_M35_SCOPE: application cluster discovered");
    let members = items
        .iter()
        .filter(|i| i["group_id"] == group["group_id"])
        .collect::<Vec<_>>();
    assert_eq!(
        members.len(),
        12,
        "SERVICE_M35_SCOPE: application cluster members"
    );
    assert!(
        members.iter().all(|i| i["eligible"] == false
            && i["ineligible_reason"] == "在程序目录 App 里（有卸载程序）"),
        "SERVICE_M35_SCOPE: cluster protected by ancestor"
    );
    let c = call(&s, "conclusion_get", json!({}));
    assert!(
        !c["cards"]
            .as_array()
            .unwrap()
            .iter()
            .any(|c| c["group_id"] == group["group_id"]),
        "SERVICE_M35_SCOPE: protected cluster has no card"
    );
    let clue = format!(
        "cl-{}",
        &util::digest(group["group_id"].as_str().unwrap())[..12]
    );
    assert!(
        !c["clues"]
            .as_array()
            .unwrap()
            .iter()
            .any(|c| c["clue_id"] == clue),
        "SERVICE_M35_SCOPE: protected cluster has no clue"
    );

    // The same production supplement still detects uninstallers when the registry is unavailable.
    *f.fake.apps.lock().unwrap() = None;
    let scan = m35_scan(&s, json!([id]));
    let saved = scan_saved(&f, &scan);
    let app_item = saved["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["path"] == slash(&f.root.join("selected/prog/App/App-setup.exe")))
        .unwrap();
    assert_eq!(
        app_item["ineligible_reason"], "在程序目录 App 里（有卸载程序）",
        "SERVICE_M35_SCOPE: no installed list still checks uninstallers"
    );
}

#[test]
fn m35_scope_and_plan() {
    m35_safety_facts();
    m14_program_directories();
    let f = Fixture::new();
    f.seed();
    f.file("project/output/data", 123);
    m35_decl(&f, "project", json!(["private"]));
    f.age_all(NOW - 40 * 86400);
    let s = f.service(true);
    let root = m35_add(&s, &f, "project");
    for ids in [
        json!([]),
        json!(["missing"]),
        json!([root, root]),
        json!(vec!["common"; 25]),
    ] {
        assert_eq!(
            s.call("scan_start", json!({"locationIds":ids}))
                .unwrap_err()
                .code,
            "invalid",
            "SERVICE_M35_SCOPE: invalid scope"
        );
    }
    let r = m35_scan(&s, json!([root]));
    let saved = scan_saved(&f, &r);
    assert!(
        saved["plan"]["targets"]
            .as_array()
            .unwrap()
            .iter()
            .all(|t| t["group_id"].as_str().unwrap().starts_with("custom:")),
        "SERVICE_M35_SCOPE: common leaked into folder scope"
    );
    assert!(
        !saved["plan"]["targets"]
            .as_array()
            .unwrap()
            .iter()
            .any(|t| t["group_id"].as_str().unwrap().starts_with("decl:")),
        "SERVICE_M35_SCOPE: untrusted declaration became a target"
    );
    let loc = call(&s, "locations_get", json!({}));
    let mf = loc["manifests"][0]["manifest_id"].clone();
    assert_eq!(
        loc["manifests"][0]["state"], "untrusted",
        "SERVICE_M35_SCOPE: discovery"
    );
    call(
        &s,
        "manifest_trust",
        json!({"manifestId":mf,"trusted":true}),
    );
    let r = m35_scan(&s, json!([root]));
    let saved = scan_saved(&f, &r);
    assert!(
        saved["plan"]["targets"]
            .as_array()
            .unwrap()
            .iter()
            .any(|t| t["group_id"].as_str().unwrap().starts_with("decl:")),
        "SERVICE_M35_SCOPE: trusted declaration missing"
    );
    let reloaded = f.service(false);
    assert_eq!(
        call(&reloaded, "app_state", json!({}))["last_scan"]["scan_id"],
        r["scan_id"],
        "SERVICE_M35_SCOPE: declaration reload"
    );
    drop(reloaded);
    fs::write(
        f.root.join("project/.water-cleanup.json"),
        json!({"version":1,"protected":["output"]}).to_string(),
    )
    .unwrap();
    m35_scan(&s, json!([root]));
    let loc = call(&s, "locations_get", json!({}));
    assert_eq!(
        loc["manifests"][0]["state"], "changed",
        "SERVICE_M35_SCOPE: changed trust"
    );
    call(
        &s,
        "locations_set_session_cleanup",
        json!({"tool":"claude-code","enabled":true,"days":30}),
    );
    f.file("user_profile/.claude/projects/project/old.jsonl", 64);
    f.age_all(NOW - 40 * 86400);
    let r = m35_scan(&s, json!(["common"]));
    let saved = scan_saved(&f, &r);
    assert!(
        saved["plan"]["targets"]
            .as_array()
            .unwrap()
            .iter()
            .any(|t| t["rule_id"] == "claude-code-old-sessions" && t["min_age_hours"] == 720),
        "SERVICE_M35_SCOPE: session options"
    );
    let p = call(
        &s,
        "clean_prepare",
        json!({"groupIds":["claude-code-old-sessions"]}),
    );
    assert!(
        read_plan(&f, &p)["plan"]["items"][0]["unlocked_paths"]
            .as_array()
            .is_some_and(|x| !x.is_empty()),
        "SERVICE_M35_SCOPE: unlock pair"
    );
    f.file("roaming_app_data/QQ/Partitions/account/Cache/x", 12);
    f.age_all(NOW - 40 * 86400);
    f.fake.queried_paths.lock().unwrap().clear();
    f.fake.now.store(NOW + 300, Ordering::SeqCst);
    let r = m35_scan(&s, json!(["common"]));
    assert!(
        f.fake
            .queried_paths
            .lock()
            .unwrap()
            .contains(&slash(&f.root.join("roaming_app_data/QQ"))),
        "SERVICE_M35_SCOPE: root_levels"
    );
    drop(s);
    let s = f.service(false);
    assert_eq!(
        call(&s, "app_state", json!({}))["last_scan"]["scan_id"],
        r["scan_id"],
        "SERVICE_M35_SCOPE: root_levels reload"
    );
    drop(s);
    assert_eq!(
        m35::collected_at("1"),
        Some("1970-01-01T00:00:01Z".into()),
        "SERVICE_M35_SCOPE: positive epoch"
    );
    assert_eq!(
        m35::collected_at("-1"),
        Some("1969-12-31T23:59:59Z".into()),
        "SERVICE_M35_SCOPE: negative epoch"
    );
    assert_eq!(
        m35::collected_at("bad"),
        None,
        "SERVICE_M35_SCOPE: invalid epoch"
    );
    // Production supplement with synthetic facts exercises spellings the real scanner
    // cannot emit on this fixed local-volume fixture. No invented path is executed.
    let mut ss = source_service(&f, false);
    let mut record = scan_saved(&f, &r);
    let mut result = water_junk_scan::result_from_json(&record["result"].to_string()).unwrap();
    let index = result
        .items
        .iter()
        .position(|i| i.group_id == "npm-cache")
        .unwrap();
    let original = result.items[index].path.clone();
    let d = m35_decl(&f, "local_app_data/npm-cache", json!(["cache"]));
    let loaded = water_cleanup_manifest::read_manifest(&slash(&d));
    result.items[index].path = format!(r"\\?\{}\cache", original);
    m35::supplement(&ss.core, &mut result, &[loaded], &BTreeMap::new());
    assert!(
        !result.items[index].eligible
            && result.items[index]
                .ineligible_reason
                .as_deref()
                .unwrap_or("")
                .contains("项目声明"),
        "SERVICE_M35_SCOPE: extended path protects"
    );
    result.items[index].path = "\\\\server\\share\\cache".into();
    result.items[index].eligible = true;
    result.items[index].ineligible_reason = None;
    m35::supplement(&ss.core, &mut result, &[], &BTreeMap::new());
    assert_eq!(
        result.items[index].ineligible_reason.as_deref(),
        Some("路径格式无法核对项目声明"),
        "SERVICE_M35_SCOPE: UNC"
    );
    result.items[index].path = original;
    result.items[index].eligible = true;
    let loaded = water_cleanup_manifest::read_manifest(&slash(&d));
    m35::supplement(&ss.core, &mut result, &[loaded], &BTreeMap::new());
    assert_eq!(
        result.items[index].ineligible_reason.as_deref(),
        Some("里面有项目的声明文件，不能整块清理"),
        "SERVICE_M35_SCOPE: declaration ancestor"
    );
    let mut rules: Value =
        serde_json::from_str(include_str!("../../junk-rules/rules/windows.json")).unwrap();
    let rule = rules["rules"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|r| r["rule_id"] == "minimax-hub-leftover")
        .unwrap();
    rule["installed_names"] = json!(["QQ"]);
    // RuleSet is private to the service: use a fresh Core built through its test-only
    // field ownership, never add a production rule override.
    let core = Arc::get_mut(&mut ss.core).unwrap();
    core.rules = water_junk_rules::RuleSet::from_json(&rules.to_string()).unwrap();
    let proto = result.items[index].clone();
    let mut g = result
        .groups
        .iter()
        .find(|g| g.group_id == proto.group_id)
        .unwrap()
        .clone();
    g.rule_id = "minimax-hub-leftover".into();
    g.group_id = "synthetic-leftover".into();
    g.level = water_junk_scan::Level::Confirm;
    result.groups.push(g);
    let mut i = proto;
    i.group_id = "synthetic-leftover".into();
    i.item_id = "synthetic-item".into();
    i.eligible = true;
    i.ineligible_reason = None;
    result.items.push(i);
    *f.fake.apps.lock().unwrap() = Some(water_installed_apps::AppList {
        apps_version: "water.installed-apps.v1".into(),
        collected_at: "-1".into(),
        apps: vec![water_installed_apps::App {
            scope: "user".into(),
            key: "qq".into(),
            name: "腾讯QQ".into(),
            version: None,
            install_location: None,
        }],
        truncated: false,
        unreadable_keys: 0,
    });
    let extra = m35::supplement(core, &mut result, &[], &BTreeMap::new());
    let i = result.items.last().unwrap();
    assert!(
        !i.eligible
            && i.ineligible_reason
                .as_deref()
                .unwrap()
                .contains("QQ 还装着"),
        "SERVICE_M35_SCOPE: loose installed match"
    );
    assert_eq!(
        extra["installed_apps_at"], "1969-12-31T23:59:59Z",
        "SERVICE_M35_SCOPE: stored apps time"
    );
    record["result"] = json!(result);

    // The extended spelling must also remain cleanable without a declaration.
    let mut unprotected =
        water_junk_scan::result_from_json(&scan_saved(&f, &r)["result"].to_string()).unwrap();
    unprotected.items[index].path = format!(r"\\?\{}", unprotected.items[index].path);
    m35::supplement(&ss.core, &mut unprotected, &[], &BTreeMap::new());
    assert!(
        unprotected.items[index].eligible && unprotected.items[index].ineligible_reason.is_none(),
        "SERVICE_M35_SCOPE: undeclared extended path stays cleanable"
    );

    {
        let f = Fixture::new();
        f.seed();
        f.file("common/node_modules/pkg/data", 41);
        f.age_all(NOW - 40 * 86400);
        let s = source_service(&f, true);
        let id = m35_add(&s, &f, "common");
        assert_eq!(id, "common-2", "SERVICE_M35_SCOPE: common ID is reserved");
        let home = call(&s, "locations_get", json!({}))["home"]
            .as_array()
            .unwrap()
            .clone();
        assert_eq!(
            home.iter()
                .map(|r| r["location_id"].as_str().unwrap())
                .collect::<BTreeSet<_>>()
                .len(),
            home.len(),
            "SERVICE_M35_SCOPE: unique home IDs"
        );
        let scan = m35_scan(&s, json!([id]));
        assert!(
            scan_saved(&f, &scan)["result"]["groups"]
                .as_array()
                .unwrap()
                .iter()
                .any(|g| g["group_id"]
                    .as_str()
                    .unwrap()
                    .starts_with("custom:common-2:")
                    && g["item_count"].as_u64().unwrap() > 0),
            "SERVICE_M35_SCOPE: common folder can be scanned"
        );
        // Simulate an older settings file, with common-2 already occupied.
        m35_add(&s, &f, "other");
        drop(s);
        let path = f.data.join("settings.json");
        let mut settings: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        settings["custom_roots"][0]["root_id"] = json!("common");
        settings["custom_roots"][1]["root_id"] = json!("common-2");
        fs::write(&path, settings.to_string()).unwrap();
        let s = source_service(&f, true);
        let migrated: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(
            migrated["custom_roots"][0]["root_id"], "common-3",
            "SERVICE_M35_SCOPE: migrate reserved ID and save"
        );
        assert_eq!(
            migrated["custom_roots"][1]["root_id"], "common-2",
            "SERVICE_M35_SCOPE: migration preserves occupied ID"
        );
        let home = call(&s, "locations_get", json!({}))["home"]
            .as_array()
            .unwrap()
            .clone();
        assert_eq!(
            home.iter()
                .map(|r| r["location_id"].as_str().unwrap())
                .collect::<BTreeSet<_>>()
                .len(),
            home.len(),
            "SERVICE_M35_SCOPE: unique migrated home IDs"
        );
        let scan = m35_scan(&s, json!(["common-3"]));
        assert!(
            scan_saved(&f, &scan)["result"]["groups"]
                .as_array()
                .unwrap()
                .iter()
                .any(|g| g["group_id"]
                    .as_str()
                    .unwrap()
                    .starts_with("custom:common-3:")
                    && g["item_count"].as_u64().unwrap() > 0),
            "SERVICE_M35_SCOPE: migrated folder can be scanned"
        );
        // Only the default selection tolerates a persisted drive missing from home.
        s.core
            .state
            .lock()
            .unwrap()
            .settings
            .custom_roots
            .push(service::CustomRoot {
                root_id: "drive-z".into(),
                path: "Z:\\".into(),
                added_at: "2026-01-01T00:00:00Z".into(),
            });
        call(&s, "scan_start", json!({}));
        let progress = wait(&s, "scan_progress");
        assert_eq!(
            progress["state"], "completed",
            "SERVICE_M35_SCOPE: default scan skips absent drive"
        );
        assert!(
            progress["locations"]
                .as_array()
                .unwrap()
                .iter()
                .all(|l| l["location_id"] != "drive-z")
                && progress["locations"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|l| l["location_id"] == "common-3"),
            "SERVICE_M35_SCOPE: default scan retains available folders"
        );
        assert_eq!(
            s.call("scan_start", json!({"locationIds":["common", "drive-z"]}))
                .unwrap_err()
                .code,
            "invalid",
            "SERVICE_M35_SCOPE: explicit absent drive is invalid"
        );
    }
}

fn m14_conclusion_text() {
    let f = Fixture::new();
    f.seed();
    let s = source_service(&f, false);
    let scan = scanned(&s);
    let base = scan_saved(&f, &scan);
    let link = slash(&f.root.join("synthetic-reference"));
    let mut saved = base.clone();
    let items = saved["result"]["items"].as_array_mut().unwrap();
    for (n, i) in items.iter_mut().take(4).enumerate() {
        i["referenced_count"] = json!(1);
        i["referenced_by"] = json!([if n % 2 == 0 {
            link.clone()
        } else {
            link.to_ascii_uppercase()
        }]);
    }
    let sources = items.iter().take(4).cloned().collect::<Vec<_>>();
    let bytes = sources
        .iter()
        .map(|i| util::bytes(&i["unique_bytes"]))
        .sum::<u64>();
    let text = format!(
        "{link} 引用了 4 项，共 {}；改指别处后这些才能清",
        m35::amount(bytes)
    );
    let clue_id = format!("cl-ref-{}", &util::digest(&link.to_ascii_lowercase())[..12]);
    m35_replace_record(&s, saved.clone());
    let c = call(&s, "conclusion_get", json!({}));
    assert_eq!(
        c["clues"],
        json!([{"clue_id":clue_id,"text_zh":text,
        "copy_text":format!("{text}\n{}", sources.iter().map(|i| i["path"].as_str().unwrap()).collect::<Vec<_>>().join("\n"))}]),
        "SERVICE_M35_CONCLUSION: four references merge case insensitively"
    );
    assert_eq!(c["more_clues"], 0, "SERVICE_M35_CONCLUSION: merged count");
    let items = saved["result"]["items"].as_array_mut().unwrap();
    for n in 4..21 {
        let mut i = sources[0].clone();
        i["item_id"] = json!(format!("synthetic-reference-item-{n}"));
        i["path"] = json!(slash(&f.root.join(format!("synthetic-item-{n}"))));
        items.push(i);
    }
    m35_replace_record(&s, saved);
    let c = call(&s, "conclusion_get", json!({}));
    let copy = c["clues"][0]["copy_text"].as_str().unwrap();
    assert_eq!(
        copy.lines().count(),
        22,
        "SERVICE_M35_CONCLUSION: reference copy capped at 20 paths"
    );
    assert_eq!(
        copy.lines().last(),
        Some("…等 21 项"),
        "SERVICE_M35_CONCLUSION: reference overflow count"
    );

    // Use a scanner-created cluster, then inject only metadata for the presentation cases.
    for n in 0..12 {
        f.file(&format!("windows/Temp/verify-A{n:05}/data"), 100);
    }
    f.age_all(NOW - 20 * 86400);
    let scan = scanned(&s);
    let mut saved = scan_saved(&f, &scan);
    saved["finished_at"] = json!(util::timestamp(UNIX_EPOCH + Duration::from_secs(NOW)));
    let group = saved["result"]["groups"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|g| !g["cluster"].is_null())
        .expect("SERVICE_M35_CONCLUSION: leak fixture");
    let gid = group["group_id"].clone();
    group["cluster"]["kind"] = json!("file");
    group["cluster"]["parent"] = json!(slash(
        &f.root
            .join("123e4567-e89b-12d3-a456-426614174000/subagents")
    ));
    let mut ids = Vec::new();
    for i in saved["result"]["items"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .filter(|i| i["group_id"] == gid)
    {
        ids.push(i["item_id"].as_str().unwrap().to_owned());
        i["newest_activity"] = json!(util::timestamp(
            UNIX_EPOCH + Duration::from_secs(NOW - 20 * 86400)
        ));
    }
    for id in &ids {
        saved["item_created"][id] = json!(util::timestamp(
            UNIX_EPOCH + Duration::from_secs(NOW - 20 * 86400)
        ));
        saved["item_notes"][id] = json!(["备注一", "备注一", "备注二", "备注三", "备注四"]);
    }
    saved["item_created"][&ids[0]] = json!(util::timestamp(
        UNIX_EPOCH + Duration::from_secs(NOW - 14 * 86400)
    ));
    saved["item_created"][&ids[1]] = json!(util::timestamp(
        UNIX_EPOCH + Duration::from_secs(NOW - 14 * 86400 - 1)
    ));
    saved["item_created"]
        .as_object_mut()
        .unwrap()
        .remove(&ids[2]);
    let i = saved["result"]["items"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|i| i["item_id"] == ids[2])
        .unwrap();
    i["newest_activity"] = json!(util::timestamp(
        UNIX_EPOCH + Duration::from_secs(NOW - 10 * 86400)
    ));
    m35_replace_record(&s, saved.clone());
    let c = call(&s, "conclusion_get", json!({}));
    let clue = &c["clues"][0];
    assert!(
        clue["text_zh"]
            .as_str()
            .unwrap()
            .ends_with("最近 14 天新增 2 个"),
        "SERVICE_M35_CONCLUSION: actual recent creations and fallback"
    );
    let original_copy = clue["copy_text"].clone();
    let card = c["cards"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["group_id"] == gid)
        .unwrap();
    assert_eq!(
        card["title_zh"], "…\\subagents 里有 12 个同模板文件，已经不长了",
        "SERVICE_M35_CONCLUSION: file cluster and UUID title"
    );
    for (n, i) in saved["result"]["items"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .filter(|i| i["group_id"] == gid)
        .enumerate()
    {
        i["newest_activity"] = json!(util::timestamp(
            UNIX_EPOCH + Duration::from_secs(NOW - 20 * 86400 + n as u64)
        ));
    }
    for id in &ids {
        saved["item_created"][id] = json!(util::timestamp(
            UNIX_EPOCH + Duration::from_secs(NOW - 20 * 86400)
        ));
    }
    for (parent, title) in [
        ("abcdef0/subagents", "…\\subagents"),
        ("12345678/subagents", "…\\subagents"),
        ("1234567/subagents", "…\\subagents"),
        ("en/image", "en\\image"),
        ("abcdef/subagents", "abcdef\\subagents"),
        (
            "123e4567-e89b-12d3-a456-42661417400g/subagents",
            "123e4567-e89b-12d3-a456-42661417400g\\subagents",
        ),
    ] {
        let group = saved["result"]["groups"]
            .as_array_mut()
            .unwrap()
            .iter_mut()
            .find(|g| g["group_id"] == gid)
            .unwrap();
        group["cluster"]["parent"] = json!(slash(&f.root.join(parent)));
        m35_replace_record(&s, saved.clone());
        let c = call(&s, "conclusion_get", json!({}));
        let card = c["cards"]
            .as_array()
            .unwrap()
            .iter()
            .find(|c| c["group_id"] == gid)
            .unwrap();
        assert_eq!(
            card["title_zh"],
            format!("{title} 里有 12 个同模板文件，已经不长了"),
            "SERVICE_M35_CONCLUSION: opaque segment {parent}"
        );
        let date =
            util::timestamp(UNIX_EPOCH + Duration::from_secs(NOW - 20 * 86400))[..10].to_owned();
        let evidence = card["evidence_zh"].as_str().unwrap();
        assert_eq!(
            evidence,
            format!(
                "12 项 · {date} · {} · 备注一；备注二；等 2 条",
                slash(&f.root.join("windows/Temp"))
            ),
            "SERVICE_M35_CONCLUSION: date and unique note evidence"
        );
        assert!(
            c["clues"][0]["text_zh"]
                .as_str()
                .unwrap()
                .ends_with("最近 14 天没有新增"),
            "SERVICE_M35_CONCLUSION: no recent creations"
        );
    }
    assert!(
        original_copy
            .as_str()
            .unwrap()
            .starts_with("检查清单\n模板："),
        "SERVICE_M35_CONCLUSION: leak checklist preserved"
    );

    // Scope labels come from the saved scan, including protected rows; repeated titles appear once.
    let proto_g = base["result"]["groups"]
        .as_array()
        .unwrap()
        .iter()
        .find(|g| g["item_count"].as_u64().unwrap() > 0)
        .unwrap();
    let proto_i = base["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["group_id"] == proto_g["group_id"])
        .unwrap();
    let mut folded = base.clone();
    folded["scope"] = json!([
        {"location_id":"one","kind":"folder","label_zh":"位置一","path":null},
        {"location_id":"two","kind":"folder","label_zh":"位置二","path":null}
    ]);
    let mut groups = Vec::new();
    let mut items = Vec::new();
    for level in ["advisory", "protected"] {
        for loc in ["one", "two", "unknown"] {
            let mut g = proto_g.clone();
            let mut i = proto_i.clone();
            let gid = format!("custom:{loc}:{level}");
            g["group_id"] = json!(gid);
            g["level"] = json!(level);
            i["group_id"] = json!(gid);
            i["item_id"] = json!(format!("{loc}-{level}"));
            groups.push(g);
            items.push(i);
        }
    }
    folded["result"]["groups"] = json!(groups);
    folded["result"]["items"] = json!(items);
    m35_replace_record(&s, folded);
    let c = call(&s, "conclusion_get", json!({}));
    for kind in ["advisory", "protected"] {
        let fold = c["folds"]
            .as_array()
            .unwrap()
            .iter()
            .find(|f| f["kind"] == kind)
            .unwrap();
        let rows = fold["rows"].as_array().unwrap();
        assert_eq!(
            rows.iter()
                .map(|r| r["note_zh"].clone())
                .collect::<Vec<_>>(),
            vec![json!("位置一"), json!("位置二"), Value::Null],
            "SERVICE_M35_CONCLUSION: {kind} scope labels"
        );
        let title = rows[0]["title_zh"].as_str().unwrap();
        assert_eq!(
            fold["text_zh"].as_str().unwrap().matches(title).count(),
            1,
            "SERVICE_M35_CONCLUSION: {kind} distinct titles"
        );
    }
}

#[test]
fn m35_conclusion_cards() {
    m35_selection_layers();
    m14_conclusion_text();
    let f = Fixture::new();
    f.seed();
    for n in 0..7 {
        f.file(&format!("project{n}/backup{n}.bak-20261001/data"), 100 + n);
        m35_decl(&f, &format!("project{n}"), json!([]));
        f.file(&format!("project{n}/output/data"), 200 + n);
    }
    f.age_all(NOW - 40 * 86400);
    let s = f.service(true);
    for n in 0..7 {
        m35_add(&s, &f, &format!("project{n}"));
    }
    scanned(&s);
    let locations = call(&s, "locations_get", json!({}));
    for m in locations["manifests"].as_array().unwrap() {
        call(
            &s,
            "manifest_trust",
            json!({"manifestId":m["manifest_id"],"trusted":true}),
        );
    }
    f.fake.now.store(NOW + 60, Ordering::SeqCst);
    let r = scanned(&s);
    let c = call(&s, "conclusion_get", json!({}));
    assert_eq!(
        c["cards"].as_array().unwrap().len(),
        5,
        "SERVICE_M35_CONCLUSION: cap"
    );
    assert!(
        c["more_cards"]["count"].as_u64().unwrap_or(0) >= 2,
        "SERVICE_M35_CONCLUSION: remaining cards aggregated"
    );
    assert!(
        c["cards"]
            .as_array()
            .unwrap()
            .iter()
            .all(|c| c["menu"].as_array().unwrap().contains(&json!("skip"))),
        "SERVICE_M35_CONCLUSION: frozen menus"
    );
    let d = call(
        &s,
        "detail_get",
        json!({"version":c["version"],"mode":"category"}),
    );
    assert!(
        d["sections"]
            .as_array()
            .unwrap()
            .iter()
            .flat_map(|s| s["rows"].as_array().unwrap())
            .any(|r| r["row_key"] == "m:custom-app-backups"),
        "SERVICE_M35_CONCLUSION: merged rule"
    );
    let gid = c["cards"][0]["group_id"].as_str().unwrap();
    let kept_id = gid.to_owned();
    let kept = call(
        &s,
        "conclusion_decide",
        json!({"version":c["version"],"decision":{"group":gid,"choice":"keep"}}),
    );
    assert_ne!(
        c["version"], kept["version"],
        "SERVICE_M35_CONCLUSION: version"
    );
    assert!(
        s.call(
            "conclusion_decide",
            json!({"version":c["version"],"decision":{"group":gid,"choice":"clean"}})
        )
        .is_err(),
        "SERVICE_M35_CONCLUSION: old version"
    );
    let disk: Value =
        serde_json::from_slice(&fs::read(f.data.join("settings.json")).unwrap()).unwrap();
    assert_eq!(
        disk["keeps"][0]["key"], gid,
        "SERVICE_M35_CONCLUSION: keep persistence"
    );
    scanned(&s);
    let c = call(&s, "conclusion_get", json!({}));
    assert!(
        c["kept_before"]["count"].as_u64().unwrap_or(0) > 0,
        "SERVICE_M35_CONCLUSION: previously kept"
    );
    let card = c["cards"][0].clone();
    let c = call(
        &s,
        "conclusion_decide",
        json!({"version":c["version"],"decision":{"group":card["group_id"],"choice":"clean"}}),
    );
    assert!(
        util::bytes(&c["plan"]["chosen_bytes"]) > 0,
        "SERVICE_M35_CONCLUSION: chosen bytes"
    );
    let lines = 1
        + c["cards"].as_array().unwrap().len()
        + c["clues"].as_array().unwrap().len()
        + c["folds"].as_array().unwrap().len()
        + usize::from(!c["more_cards"].is_null())
        + usize::from(!c["kept_before"].is_null());
    assert!(lines <= 20, "SERVICE_M35_CONCLUSION: visible rows");
    assert!(
        c["clues"].as_array().unwrap().len() <= 3,
        "SERVICE_M35_CONCLUSION: clues cap"
    );
    let expanded = call(
        &s,
        "group_items",
        json!({"groupId":kept_id,"rowId":null,"query":null}),
    );
    let path = expanded["items"][0]["display_path"].as_str().unwrap();
    let path = if Path::new(path).is_dir() {
        format!("{path}\\data")
    } else {
        path.to_owned()
    };
    File::options()
        .write(true)
        .open(&path)
        .unwrap()
        .set_len(4 << 20)
        .unwrap();
    f.fake.now.store(NOW + 120, Ordering::SeqCst);
    scanned(&s);
    let c = call(&s, "conclusion_get", json!({}));
    assert!(
        c["cards"]
            .as_array()
            .unwrap()
            .iter()
            .any(|c| c["group_id"] == kept_id),
        "SERVICE_M35_CONCLUSION: grown kept item returns"
    );
    let detail = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    let item = &detail["items"][0];
    call(&s, "skip_add", json!({"itemId":item["item_id"]}));
    let stale = call(&s, "conclusion_get", json!({}));
    assert_eq!(
        stale["stale_reason_zh"], "跳过名单变了",
        "SERVICE_M35_CONCLUSION: skip stale"
    );
    assert_eq!(
        s.call(
            "clean_prepare",
            json!({"conclusionVersion":stale["version"],"chosenMode":"quarantine"})
        )
        .unwrap_err()
        .code,
        "stale",
        "SERVICE_M35_CONCLUSION: stale prepare"
    );
    let _ = r;

    {
        let f = Fixture::new();
        f.seed();
        let s = source_service(&f, false);
        let scan = scanned(&s);
        let mut saved = scan_saved(&f, &scan);
        let items = saved["result"]["items"].as_array_mut().unwrap();
        assert!(
            items.len() >= 4,
            "SERVICE_M35_CONCLUSION: four clue sources"
        );
        for (n, item) in items.iter_mut().take(4).enumerate() {
            item["referenced_count"] = json!(1);
            item["referenced_by"] =
                json!([slash(&f.root.join(format!("synthetic-reference-{n}")))]);
        }
        m35_replace_record(&s, saved);
        let c = call(&s, "conclusion_get", json!({}));
        assert_eq!(
            c["clues"].as_array().unwrap().len(),
            3,
            "SERVICE_M35_CONCLUSION: exactly three of four clues"
        );
        assert_eq!(
            c["more_clues"], 1,
            "SERVICE_M35_CONCLUSION: remaining clue count"
        );
    }
}

fn m35_selection_layers() {
    let f = Fixture::new();
    f.seed();
    let s = f.service(true);
    scanned(&s);
    let c = call(&s, "conclusion_get", json!({}));
    let d = call(&s, "group_detail", json!({"groupId":"npm-cache"}));
    let item = d["items"][0]["item_id"].clone();
    let row = d["rows"][0]["row_id"].clone();
    let c = call(
        &s,
        "conclusion_decide",
        json!({"version":c["version"],"decision":{"category":"dev_cache","include":false}}),
    );
    let choices = call(
        &s,
        "group_items",
        json!({"groupId":"npm-cache","rowId":null,"query":null}),
    );
    assert_eq!(
        choices["items"][0]["included"], false,
        "SERVICE_M35_CONCLUSION: category decision"
    );
    let c = call(
        &s,
        "conclusion_decide",
        json!({"version":c["version"],"decision":{"group":"npm-cache","choice":"clean"}}),
    );
    let choices = call(
        &s,
        "group_items",
        json!({"groupId":"npm-cache","rowId":null,"query":null}),
    );
    assert_eq!(
        choices["items"][0]["included"], true,
        "SERVICE_M35_CONCLUSION: group overrides category"
    );
    let c = call(
        &s,
        "conclusion_decide",
        json!({"version":c["version"],"decision":{"row":row,"include":false}}),
    );
    let choices = call(
        &s,
        "group_items",
        json!({"groupId":"npm-cache","rowId":null,"query":null}),
    );
    assert_eq!(
        choices["items"][0]["included"], false,
        "SERVICE_M35_CONCLUSION: row overrides group"
    );
    let c = call(
        &s,
        "conclusion_decide",
        json!({"version":c["version"],"decision":{"item":item,"include":true}}),
    );
    let choices = call(
        &s,
        "group_items",
        json!({"groupId":"npm-cache","rowId":null,"query":null}),
    );
    assert_eq!(
        choices["items"][0]["included"], true,
        "SERVICE_M35_CONCLUSION: item overrides row"
    );
    assert_eq!(s.call("conclusion_decide",json!({"version":c["version"],"decision":{"group":"claude-code-sessions","choice":"clean"}})).unwrap_err().code,"invalid","SERVICE_M35_CONCLUSION: protected decision rejected");
    call(
        &s,
        "locations_set_session_cleanup",
        json!({"tool":"grok","enabled":true,"days":7}),
    );
    let c = call(&s, "conclusion_get", json!({}));
    assert_eq!(
        c["stale_reason_zh"], "会话开关或项目声明的信任变了",
        "SERVICE_M35_CONCLUSION: settings stale"
    );
    scanned(&s);
    f.fake.hold.store(true, Ordering::SeqCst);
    let id = call(&s, "scan_start", json!({}));
    let c = call(&s, "conclusion_get", json!({}));
    call(&s, "scan_cancel", json!({"scanId":id["scan_id"]}));
    f.fake.hold.store(false, Ordering::SeqCst);
    wait(&s, "scan_progress");
    assert_eq!(
        c["stale_reason_zh"], "有了更新的体检",
        "SERVICE_M35_CONCLUSION: new scan stale"
    );
}

#[test]
fn m35_rows_and_detail() {
    m35_row_patterns();
    let f = Fixture::new();
    for n in 0..12 {
        f.file(&format!("windows/Temp/verify-A{n:05}/data"), 100);
    }
    f.seed();
    f.age_all(NOW - 40 * 86400);
    let s = f.service(true);
    scanned(&s);
    let c = call(&s, "conclusion_get", json!({}));
    let leak = c["cards"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["kind"] == "leak")
        .unwrap();
    let gid = leak["group_id"].clone();
    let d = call(&s, "group_detail", json!({"groupId":gid}));
    assert!(
        d["rows"].as_array().unwrap().len() <= 8,
        "SERVICE_M35_ROWS: bound"
    );
    assert!(
        d["rows"][0]["label_zh"]
            .as_str()
            .unwrap()
            .contains("******"),
        "SERVICE_M35_ROWS: template label"
    );
    let row = d["rows"][0]["row_id"].clone();
    assert_eq!(
        row.as_str().unwrap().len(),
        18,
        "SERVICE_M35_ROWS: opaque row"
    );
    let found = call(
        &s,
        "group_items",
        json!({"groupId":gid,"rowId":row,"query":null}),
    );
    assert_eq!(found["items_total"], 12, "SERVICE_M35_ROWS: row expansion");
    let search = call(
        &s,
        "group_items",
        json!({"groupId":gid,"rowId":null,"query":"A00001"}),
    );
    assert_eq!(search["items_total"], 1, "SERVICE_M35_ROWS: search");
    let d = call(&s, "group_detail", json!({"groupId":"chrome-cache"}));
    assert_eq!(
        d["rows"].as_array().unwrap().len(),
        2,
        "SERVICE_M35_ROWS: individual rows"
    );
    assert!(
        d["rows"]
            .as_array()
            .unwrap()
            .iter()
            .any(|r| r["selectable"] == false && r["release_zh"] == "关掉 Chrome 后可清"),
        "SERVICE_M35_ROWS: release"
    );
    for mode in ["category", "location"] {
        let d = call(
            &s,
            "detail_get",
            json!({"version":c["version"],"mode":mode}),
        );
        assert_eq!(
            d["plan_bytes"], c["plan"]["bytes"],
            "SERVICE_M35_ROWS: shared selection"
        );
    }
    for query in ["x/y", "x:y", "x\\y", ""] {
        assert_eq!(
            s.call(
                "group_items",
                json!({"groupId":gid,"rowId":null,"query":query})
            )
            .unwrap_err()
            .code,
            "invalid",
            "SERVICE_M35_ROWS: query boundary"
        );
    }
}

fn m35_row_patterns() {
    let f = Fixture::new();
    f.seed();
    let s = source_service(&f, false);
    let result = scanned(&s);
    let mut raw = scan_saved(&f, &result);
    let proto = raw["result"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|i| i["group_id"] == "npm-cache")
        .unwrap()
        .clone();
    raw["result"]["items"]
        .as_array_mut()
        .unwrap()
        .retain(|i| i["group_id"] != "npm-cache");
    for n in 0..20 {
        let mut i = proto.clone();
        i["item_id"] = json!(format!("row-item-{n}"));
        i["path"] = json!(format!(
            "{}\\p{}\\file{n}",
            slash(&f.root),
            if n < 4 { 0 } else { n }
        ));
        i["template"] = if n < 2 {
            json!("verify-<r6>")
        } else {
            Value::Null
        };
        i["unique_bytes"] = json!((1000 - n).to_string());
        raw["result"]["items"].as_array_mut().unwrap().push(i);
    }
    for g in raw["result"]["groups"].as_array_mut().unwrap() {
        if g["group_id"] == "npm-cache" {
            g["item_count"] = json!(20);
            g["eligible_count"] = json!(20);
        }
    }
    m35_replace_record(&s, raw);
    let c = call(&s, "conclusion_get", json!({}));
    let d = call(&s, "group_detail", json!({"groupId":"npm-cache"}));
    let rows = d["rows"].as_array().unwrap();
    assert_eq!(rows.len(), 8, "SERVICE_M35_ROWS: top seven plus other");
    assert_eq!(
        rows[0]["row_id"],
        format!("r:{}", &util::digest("npm-cache\nt\nverify-<r6>")[..16]),
        "SERVICE_M35_ROWS: stable sha row id"
    );
    assert!(
        rows.iter()
            .any(|r| r["label_zh"].as_str().unwrap().starts_with("p0 ×")),
        "SERVICE_M35_ROWS: parent grouping"
    );
    assert!(
        rows.last().unwrap()["label_zh"]
            .as_str()
            .unwrap()
            .starts_with("其它"),
        "SERVICE_M35_ROWS: remainder"
    );
    let same = call(&s, "group_detail", json!({"groupId":"npm-cache"}));
    assert_eq!(d["rows"], same["rows"], "SERVICE_M35_ROWS: stable rows");
    let _ = c;
}

#[test]
fn m35_clean_split() {
    m35_session_unlocks();
    m35_unfinished_and_template();
    m35_two_disk_records();
    for mode in ["quarantine", "delete"] {
        let f = Fixture::new();
        f.seed();
        f.age_all(NOW - 40 * 86400);
        let s = f.service(true);
        scanned(&s);
        let c = m35_decide(&s, "downloads-installers");
        let preview = call(
            &s,
            "clean_prepare",
            json!({"conclusionVersion":c["version"],"chosenMode":mode}),
        );
        assert!(
            util::bytes(&preview["delete"]["bytes"]) > 0,
            "SERVICE_M35_CLEAN: delete split"
        );
        assert_eq!(
            preview["chosen"]["mode"], mode,
            "SERVICE_M35_CLEAN: chosen mode"
        );
        let (p, result) = m35_run_clean(&s, &preview);
        assert_eq!(p["state"], "completed", "SERVICE_M35_CLEAN: completion");
        assert!(
            !f.root.join("downloads/old.exe").exists(),
            "SERVICE_M35_CLEAN: source"
        );
        if mode == "quarantine" {
            assert_eq!(
                result["quarantined"]["item_count"], 1,
                "SERVICE_M35_CLEAN: must move chosen"
            );
            let q = call(&s, "quarantine_list", json!({}));
            assert_eq!(
                q["cards"].as_array().unwrap().len(),
                1,
                "SERVICE_M35_CLEAN: record"
            );
            let id = q["cards"][0]["quarantine_id"].as_str().unwrap();
            let record: Value = serde_json::from_slice(
                &fs::read(f.data.join("quarantine").join(format!("{id}.json"))).unwrap(),
            )
            .unwrap();
            assert_eq!(
                record["entries"][0]["original"],
                slash(&f.root.join("downloads/old.exe")),
                "SERVICE_M35_CLEAN: original record"
            );
            assert!(
                record["entries"][0]["identity"].is_object(),
                "SERVICE_M35_CLEAN: identity record"
            );
        } else {
            assert!(
                result["quarantined"].is_null(),
                "SERVICE_M35_CLEAN: direct delete"
            );
        }
        let stale = call(&s, "conclusion_get", json!({}));
        assert_eq!(
            stale["stale_reason_zh"], "这次体检已被清理用掉",
            "SERVICE_M35_CLEAN: consumed"
        );
    }
    let f = Fixture::new();
    f.seed();
    let s = source_service(&f, true);
    scanned(&s);
    let c = m35_decide(&s, "downloads-installers");
    let p = call(
        &s,
        "clean_prepare",
        json!({"conclusionVersion":c["version"],"chosenMode":"quarantine"}),
    );
    s.core.store.fail_journal.store(true, Ordering::SeqCst);
    let id = call(
        &s,
        "clean_start",
        json!({"planId":p["plan_id"],"confirmToken":p["confirm_token"]}),
    );
    assert_eq!(
        wait(&s, "clean_progress")["state"],
        "failed",
        "SERVICE_M35_CLEAN: journal failure state"
    );
    let e = s
        .call("clean_result", json!({"cleanId":id["clean_id"]}))
        .unwrap_err();
    assert_eq!(
        e.message_zh,
        quarantine::JOURNAL_MESSAGE,
        "SERVICE_M35_CLEAN: journal failure message"
    );
    assert_eq!(
        call(&s, "quarantine_list", json!({}))["cards"][0]["restorable"],
        false,
        "SERVICE_M35_CLEAN: disk reconciliation"
    );

    for stage in ["prepare", "start", "delete"] {
        let f = Fixture::new();
        f.seed();
        let session = f.file("user_profile/.claude/projects/project/old.jsonl", 19);
        let original = f.root.join("downloads/old.exe");
        f.age_all(NOW - 40 * 86400);
        let s = source_service(&f, true);
        call(
            &s,
            "locations_set_session_cleanup",
            json!({"tool":"claude-code","enabled":true,"days":30}),
        );
        scanned(&s);
        m35_decide(&s, "downloads-installers");
        let c = m35_decide(&s, "claude-code-old-sessions");
        let drive = util::drive(&slash(&original));
        let base = slash(&f.root.join(".water-quarantine"));
        // Always retain an explicit synthetic base, even when the drive is
        // unavailable. A regression must never write a real volume root.
        f.fake
            .quarantine_bases
            .lock()
            .unwrap()
            .insert(drive.clone(), base.clone());
        if stage != "start" {
            f.fake.quarantines.lock().unwrap().clear();
        }
        let mode = if stage == "delete" {
            "delete"
        } else {
            "quarantine"
        };
        let p = call(
            &s,
            "clean_prepare",
            json!({"conclusionVersion":c["version"],"chosenMode":mode}),
        );
        let plan = read_plan(&f, &p);
        if stage == "prepare" {
            assert!(
                plan["plan"]["items"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .all(|i| i["path"] != slash(&original) && i["path"] != slash(&session)),
                "SERVICE_M35_CLEAN: unavailable chosen items excluded"
            );
            assert_eq!(
                p["chosen"]["bytes"], "0",
                "SERVICE_M35_CLEAN: unavailable chosen bytes excluded"
            );
            assert_eq!(
                p["chosen"]["items"],
                json!([]),
                "SERVICE_M35_CLEAN: unavailable chosen rows excluded"
            );
            assert_eq!(
                p["total_bytes"], p["delete"]["bytes"],
                "SERVICE_M35_CLEAN: unavailable total excluded"
            );
            assert_eq!(
                p["item_count"].as_u64().unwrap() as usize,
                plan["plan"]["items"].as_array().unwrap().len(),
                "SERVICE_M35_CLEAN: unavailable item count excluded"
            );
            assert_eq!(
                p["by_drive"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|d| util::bytes(&d["bytes"]))
                    .sum::<u64>(),
                util::bytes(&p["delete"]["bytes"]),
                "SERVICE_M35_CLEAN: unavailable drive bytes excluded"
            );
            let note = p["chosen"]["note_zh"].as_str().unwrap();
            assert!(
                note.starts_with("清掉后这些对话不能再续接或回看；")
                    && note.contains(&format!("{} 盘不能放进隔离区", &drive[..1]))
                    && note.contains("这 2 项这次不清理"),
                "SERVICE_M35_CLEAN: unavailable note preserves session warning"
            );
            assert_eq!(
                clean::prepare_mode(
                    &s.core,
                    &[json!("downloads-installers")],
                    &[],
                    Some(("quarantine", c["version"].as_str().unwrap()))
                )
                .unwrap_err()
                .code,
                "invalid",
                "SERVICE_M35_CLEAN: all unavailable is invalid"
            );
        } else if stage == "delete" {
            assert!(
                plan["plan"]["items"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|i| i["path"] == slash(&original)),
                "SERVICE_M35_CLEAN: delete mode unaffected by unavailable root"
            );
        } else {
            assert!(
                util::bytes(&p["chosen"]["bytes"]) > 0,
                "SERVICE_M35_CLEAN: supported at prepare"
            );
            f.fake.quarantines.lock().unwrap().clear();
        }
        f.fake.queried_paths.lock().unwrap().clear();
        let (progress, result) = m35_run_clean(&s, &p);
        assert_eq!(
            progress["state"], "completed",
            "SERVICE_M35_CLEAN: unavailable batch completes"
        );
        if stage == "delete" {
            assert!(
                !original.exists() && !session.exists(),
                "SERVICE_M35_CLEAN: delete still executes"
            );
        } else {
            assert!(
                original.exists() && session.exists(),
                "SERVICE_M35_CLEAN: unavailable sources untouched"
            );
            assert_eq!(
                fs::metadata(&original).unwrap().len(),
                60,
                "SERVICE_M35_CLEAN: original size unchanged"
            );
            assert_eq!(
                fs::metadata(&session).unwrap().len(),
                19,
                "SERVICE_M35_CLEAN: session size unchanged"
            );
            assert!(
                !Path::new(&base).exists(),
                "SERVICE_M35_CLEAN: no quarantine directory created"
            );
            assert!(
                !f.fake
                    .queried_paths
                    .lock()
                    .unwrap()
                    .iter()
                    .any(|p| p == &slash(&original) || p == &slash(&session)),
                "SERVICE_M35_CLEAN: unavailable batch never reaches executor guard"
            );
            if stage == "start" {
                for gid in ["downloads-installers", "claude-code-old-sessions"] {
                    let group = result["groups"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .find(|g| g["group_id"] == gid)
                        .unwrap();
                    assert_eq!(
                        group["status"], "failed",
                        "SERVICE_M35_CLEAN: unavailable batch failure"
                    );
                    assert!(
                        group["notes_zh"]
                            .as_array()
                            .unwrap()
                            .iter()
                            .any(|n| n.as_str().unwrap().contains("不能放进隔离区")),
                        "SERVICE_M35_CLEAN: unavailable batch reason"
                    );
                }
                assert_eq!(
                    progress["done_items"], progress["total_items"],
                    "SERVICE_M35_CLEAN: rejected batch progress"
                );
                let stored: Value = serde_json::from_slice(
                    &fs::read(
                        f.data
                            .join("cleans")
                            .join(format!("{}.json", result["clean_id"].as_str().unwrap())),
                    )
                    .unwrap(),
                )
                .unwrap();
                assert!(
                    stored["quarantine_reports"][0]["items"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .all(|i| i["status"] == "failed"
                            && i["move_error"] == "quarantine_unavailable"),
                    "SERVICE_M35_CLEAN: every unavailable item recorded failed"
                );
            }
        }
    }

    for stage in ["prepare", "start"] {
        let f = Fixture::new();
        let a = f.file("duplicates/original.bin", 2 << 20);
        let b = f.root.join("duplicates/copy.bin");
        fs::copy(&a, &b).unwrap();
        f.age_all(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs()
                - 2 * 86400,
        );
        let s = source_service(&f, true);
        let root = m35_add(&s, &f, "duplicates");
        let id = call(&s, "dedupe_start", json!({"locationId":root}));
        assert_eq!(
            wait(&s, "dedupe_progress")["state"],
            "completed",
            "SERVICE_M35_CLEAN: unavailable dedupe scan"
        );
        let v = call(
            &s,
            "dedupe_result",
            json!({"dedupeId":id["dedupe_id"],"expand":false}),
        );
        let v = call(
            &s,
            "dedupe_decide",
            json!({"dedupeId":id["dedupe_id"],"version":v["version"],"groupId":v["groups"][0]["group_id"],"include":true}),
        );
        f.fake.now.store(
            util::parse_time(v["finished_at"].as_str().unwrap())
                .unwrap()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs()
                + 3600,
            Ordering::SeqCst,
        );
        let drive = util::drive(&slash(&a));
        let base = slash(&f.root.join(".water-quarantine"));
        f.fake
            .quarantine_bases
            .lock()
            .unwrap()
            .insert(drive.clone(), base.clone());
        if stage == "prepare" {
            f.fake.quarantines.lock().unwrap().clear();
        }
        let preview = s.call(
            "clean_prepare",
            json!({"dedupeId":id["dedupe_id"],"dedupeVersion":v["version"]}),
        );
        if stage == "prepare" {
            let error = preview.unwrap_err();
            assert_eq!(
                error.code, "invalid",
                "SERVICE_M35_CLEAN: unavailable dedupe plan invalid"
            );
            assert!(
                error
                    .message_zh
                    .contains(&format!("{} 盘不能放进隔离区", &drive[..1])),
                "SERVICE_M35_CLEAN: unavailable dedupe plan reason"
            );
            assert!(
                s.core.state.lock().unwrap().plans.is_empty(),
                "SERVICE_M35_CLEAN: no unavailable dedupe plan stored"
            );
        } else {
            let preview = preview.unwrap();
            f.fake.quarantines.lock().unwrap().clear();
            f.fake.queried_paths.lock().unwrap().clear();
            let (_, result) = m35_run_clean(&s, &preview);
            assert_eq!(
                result["groups"][0]["status"], "failed",
                "SERVICE_M35_CLEAN: disconnected dedupe batch failed"
            );
            assert!(
                result["groups"][0]["notes_zh"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|n| n.as_str().unwrap().contains("不能放进隔离区")),
                "SERVICE_M35_CLEAN: disconnected dedupe reason"
            );
            assert!(
                f.fake.queried_paths.lock().unwrap().is_empty(),
                "SERVICE_M35_CLEAN: dedupe batch never reaches executor guard"
            );
        }
        assert!(
            a.exists() && b.exists() && !Path::new(&base).exists(),
            "SERVICE_M35_CLEAN: dedupe copies untouched"
        );
        assert_eq!(
            fs::metadata(&a).unwrap().len(),
            2 << 20,
            "SERVICE_M35_CLEAN: original duplicate size unchanged"
        );
        assert_eq!(
            fs::metadata(&b).unwrap().len(),
            2 << 20,
            "SERVICE_M35_CLEAN: extra duplicate size unchanged"
        );
    }
}

fn m35_two_disk_records() {
    let f = Fixture::new();
    f.seed();
    let s = source_service(&f, true);
    scanned(&s);
    let preview = call(
        &s,
        "clean_prepare",
        json!({"groupIds":["downloads-installers"]}),
    );
    let mut plan =
        water_junk_clean::CleanPlan::from_json(&read_plan(&f, &preview)["plan"].to_string())
            .unwrap();
    let mut second = plan.items[0].clone();
    second.item_id = "second-volume-item".into();
    second.path = "X:\\synthetic\\second.exe".into();
    second.root = "X:\\synthetic".into();
    plan.items.push(second);
    let ids = plan
        .items
        .iter()
        .map(|i| i.item_id.as_str())
        .collect::<BTreeSet<_>>();
    let batches = clean::quarantine_batches(&plan, &ids);
    assert_eq!(
        batches.len(),
        2,
        "SERVICE_M35_CLEAN: separate drive batches"
    );
    let roots = [
        slash(&f.root.join("first/.water-quarantine")),
        slash(&f.root.join("second/.water-quarantine")),
    ];
    *f.fake.quarantines.lock().unwrap() = roots.to_vec();
    *f.fake.quarantine_bases.lock().unwrap() = BTreeMap::from([
        ("F:\\".into(), roots[0].clone()),
        ("X:\\".into(), roots[1].clone()),
    ]);
    let record = s.core.state.lock().unwrap().last_record().unwrap();
    for (drive, items) in batches {
        let qid = {
            let mut state = s.core.state.lock().unwrap();
            let id = quarantine::unique_id(&s.core, &state, &drive);
            state.m35.quarantine_ids.insert(id.clone());
            id
        };
        let mut batch = plan.clone();
        batch.items = items;
        // Fake executor output verifies service record routing for two logical
        // volumes. Only these record files are written; X: is never accessed.
        let report = water_junk_clean::QuarantineReport {
            report_version: "water.quarantine-report.v1".into(),
            quarantine_id: qid.clone(),
            started_at: "2027-01-15T08:00:00Z".into(),
            ended_at: "2027-01-15T08:00:00Z".into(),
            status: water_junk_clean::RunStatus::Completed,
            moved_bytes: batch.items[0].total_bytes.clone(),
            items: batch
                .items
                .iter()
                .map(|i| water_junk_clean::MoveReport {
                    item_id: i.item_id.clone(),
                    status: water_junk_clean::MoveStatus::Moved,
                    skip_reason: None,
                    move_error: None,
                    error_code: None,
                    destination: Some(format!(
                        "{}\\{qid}\\{}",
                        f.fake.quarantine_base(&drive).unwrap(),
                        &i.path[3..]
                    )),
                    identity: Some(i.identity.clone()),
                    bytes: i.total_bytes.clone(),
                })
                .collect(),
        };
        quarantine::save_moves(&s.core, &record, &batch, &report, "clean-synthetic").unwrap();
        let stored: Value = serde_json::from_slice(
            &fs::read(f.data.join("quarantine").join(format!("{qid}.json"))).unwrap(),
        )
        .unwrap();
        assert_eq!(
            stored["root"],
            f.fake.quarantine_base(&drive).unwrap(),
            "SERVICE_M35_CLEAN: per-drive record root"
        );
        assert!(
            qid.ends_with(&drive[..1].to_ascii_lowercase()),
            "SERVICE_M35_CLEAN: per-drive id"
        );
        assert_eq!(
            stored["entries"].as_array().unwrap().len(),
            1,
            "SERVICE_M35_CLEAN: per-drive entries"
        );
    }
    assert_eq!(
        fs::read_dir(f.data.join("quarantine")).unwrap().count(),
        2,
        "SERVICE_M35_CLEAN: two records"
    );
}

fn m35_unfinished_and_template() {
    for gid in ["npm-cache", "downloads-installers"] {
        let f = Fixture::new();
        f.seed();
        let s = source_service(&f, true);
        let result = scanned(&s);
        let mut raw = scan_saved(&f, &result);
        let id = raw["result"]["items"]
            .as_array()
            .unwrap()
            .iter()
            .find(|i| i["group_id"] == gid)
            .unwrap()["item_id"]
            .clone();
        {
            let mut state = s.core.state.lock().unwrap();
            state.cleans.insert("clean-20270115T080000Z-fffe".into(),json!({"scan_id":result["scan_id"],"view":{"finished_at":"2027-01-15T09:00:00Z"},"report":{"items":[{"item_id":id,"status":"partial","skip_reason":null}]}}));
        }
        for i in raw["result"]["items"]
            .as_array_mut()
            .unwrap()
            .iter_mut()
            .filter(|i| i["item_id"] == id)
        {
            i["eligible"] = json!(false);
            i["ineligible_reason"] = json!("too_recent");
        }
        let paths = m35::unfinished_paths(&s.core.state.lock().unwrap());
        let mut typed = water_junk_scan::result_from_json(&raw["result"].to_string()).unwrap();
        let extras = m35::supplement(&s.core, &mut typed, &[], &paths);
        raw["result"] = json!(typed);
        for (key, value) in extras.as_object().unwrap() {
            raw[key] = value.clone();
        }
        m35_replace_record(&s, raw);
        let c = call(&s, "conclusion_get", json!({}));
        assert!(
            c["cards"]
                .as_array()
                .unwrap()
                .iter()
                .any(|c| c["kind"] == "unfinished"),
            "SERVICE_M35_CLEAN: unfinished card"
        );
        let c = m35_decide(&s, "unfinished");
        let d = call(&s, "group_detail", json!({"groupId":"unfinished"}));
        assert_eq!(d["items_total"], 1, "SERVICE_M35_CLEAN: unfinished drawer");
        let p = call(
            &s,
            "clean_prepare",
            json!({"conclusionVersion":c["version"],"chosenMode":"quarantine"}),
        );
        assert!(
            read_plan(&f, &p)["plan"]["items"]
                .as_array()
                .unwrap()
                .iter()
                .any(|i| i["item_id"] == id && i["min_age_hours"] == 0),
            "SERVICE_M35_CLEAN: unfinished age gate"
        );
    }
    let f = Fixture::new();
    f.seed();
    for n in 0..12 {
        f.file(&format!("windows/Temp/verify-A{n:05}/file"), 100);
    }
    f.age_all(NOW - 4 * 86400);
    let s = f.service(true);
    scanned(&s);
    let c = call(&s, "conclusion_get", json!({}));
    let gid = c["cards"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["kind"] == "leak")
        .unwrap()["group_id"]
        .clone();
    let detail = call(
        &s,
        "group_items",
        json!({"groupId":gid,"rowId":null,"query":null}),
    );
    let source = detail["items"][0]["display_path"].as_str().unwrap();
    let destination = format!("{}\\reviewed-report", m35::parent(source));
    fs::rename(source, &destination).unwrap();
    let c = m35_decide(&s, gid.as_str().unwrap());
    let p = call(
        &s,
        "clean_prepare",
        json!({"conclusionVersion":c["version"],"chosenMode":"quarantine"}),
    );
    assert!(
        !read_plan(&f, &p)["plan"]["items"]
            .as_array()
            .unwrap()
            .iter()
            .any(|i| i["path"] == source || i["path"] == destination),
        "SERVICE_M35_CLEAN: renamed member"
    );
    assert!(
        Path::new(&destination).exists(),
        "SERVICE_M35_CLEAN: renamed output preserved"
    );
}

fn m35_session_unlocks() {
    for mode in ["quarantine", "delete"] {
        let f = Fixture::new();
        f.seed();
        let session = f.file("user_profile/.claude/projects/project/old.jsonl", 19);
        let cache = f.file(
            "user_profile/.grok2/AppData/Local/npm-cache/_cacache/entry",
            23,
        );
        f.age_all(NOW - 40 * 86400);
        let s = f.service(true);
        call(
            &s,
            "locations_set_session_cleanup",
            json!({"tool":"claude-code","enabled":true,"days":30}),
        );
        scanned(&s);
        let c = m35_decide(&s, "claude-code-old-sessions");
        let p = call(
            &s,
            "clean_prepare",
            json!({"conclusionVersion":c["version"],"chosenMode":mode}),
        );
        let plan = read_plan(&f, &p);
        for gid in ["claude-code-old-sessions", "grok-home-caches"] {
            assert!(
                plan["plan"]["items"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|i| i["group_id"] == gid
                        && i["unlocked_paths"]
                            .as_array()
                            .is_some_and(|v| !v.is_empty())),
                "SERVICE_M35_CLEAN: unlock {gid}"
            );
        }
        assert_eq!(
            p["chosen"]["note_zh"], "清掉后这些对话不能再续接或回看",
            "SERVICE_M35_CLEAN: session warning"
        );
        let (_, r) = m35_run_clean(&s, &p);
        assert!(
            !session.exists() && !cache.exists(),
            "SERVICE_M35_CLEAN: unlocked items not executed {r}"
        );
        assert!(
            f.root
                .join("user_profile/.claude/projects/keep.json")
                .exists(),
            "SERVICE_M35_CLEAN: protected sibling"
        );
    }
}

#[test]
fn m35_quarantine() {
    m35_purge_log_failure();
    let f = Fixture::new();
    f.seed();
    let s = f.service(true);
    scanned(&s);
    let c = m35_decide(&s, "downloads-installers");
    let p = call(
        &s,
        "clean_prepare",
        json!({"conclusionVersion":c["version"],"chosenMode":"quarantine"}),
    );
    m35_run_clean(&s, &p);
    let q = call(&s, "quarantine_list", json!({}));
    let id = q["cards"][0]["quarantine_id"].clone();
    assert!(
        !call(&s, "app_state", json!({}))["quarantine"].is_null(),
        "SERVICE_M35_QUARANTINE: bar"
    );
    assert_eq!(
        q["roots"][0]["target_id"], "qroot-t1",
        "SERVICE_M35_QUARANTINE: test root id"
    );
    fs::write(f.root.join("downloads/old.exe"), "new").unwrap();
    let conflict = call(
        &s,
        "quarantine_restore",
        json!({"quarantineId":id,"beside":false}),
    );
    assert_eq!(
        conflict["restored_count"], 0,
        "SERVICE_M35_QUARANTINE: no overwrite"
    );
    assert_eq!(
        conflict["conflicts"].as_array().unwrap().len(),
        1,
        "SERVICE_M35_QUARANTINE: conflict"
    );
    let restored = call(
        &s,
        "quarantine_restore",
        json!({"quarantineId":id,"beside":true}),
    );
    assert_eq!(
        restored["restored_count"], 1,
        "SERVICE_M35_QUARANTINE: beside"
    );
    assert!(
        f.root.join("downloads/old.exe（还原 1）").exists(),
        "SERVICE_M35_QUARANTINE: beside path"
    );
    assert!(
        restored["view"]["cards"].as_array().unwrap().is_empty(),
        "SERVICE_M35_QUARANTINE: removed restored card"
    );
    drop(s);
    let dir = f.root.join(".water-quarantine/20261106-120000-f");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("locked.bin"), vec![0u8; 4096]).unwrap();
    let held = OpenOptions::new()
        .read(true)
        .share_mode(1 | 2)
        .open(dir.join("locked.bin"))
        .unwrap();
    let s = f.service(true);
    let q = call(&s, "quarantine_list", json!({}));
    assert_eq!(
        q["cards"][0]["restorable"], false,
        "SERVICE_M35_QUARANTINE: foreign"
    );
    let id = q["cards"][0]["quarantine_id"].clone();
    assert!(
        s.call("quarantine_locate", json!({"targetId":"not-found"}))
            .is_err(),
        "SERVICE_M35_QUARANTINE: locate reject"
    );
    let located = call(&s, "quarantine_locate", json!({"targetId":id}));
    assert_eq!(
        located["path"],
        slash(&dir),
        "SERVICE_M35_QUARANTINE: locate card"
    );
    call(&s, "quarantine_delete", json!({"quarantineId":id}));
    assert_eq!(
        wait(&s, "quarantine_progress")["state"],
        "completed",
        "SERVICE_M35_QUARANTINE: purge completion"
    );
    let q = call(&s, "quarantine_list", json!({}));
    assert_eq!(
        q["cards"][0]["state"], "leftover",
        "SERVICE_M35_QUARANTINE: leftover"
    );
    assert!(
        q["cards"][0]["leftovers"][0]["reason_zh"]
            .as_str()
            .unwrap()
            .contains("关掉后再试"),
        "SERVICE_M35_QUARANTINE: reason"
    );
    drop(held);
    call(&s, "quarantine_delete", json!({"quarantineId":id}));
    wait(&s, "quarantine_progress");
    assert!(
        call(&s, "quarantine_list", json!({}))["cards"]
            .as_array()
            .unwrap()
            .is_empty(),
        "SERVICE_M35_QUARANTINE: retry removed"
    );
    assert!(
        call(&s, "app_state", json!({}))["quarantine"].is_null(),
        "SERVICE_M35_QUARANTINE: empty bar"
    );

    {
        let f = Fixture::new();
        f.seed();
        let s = source_service(&f, true);
        scanned(&s);
        let c = m35_decide(&s, "downloads-installers");
        let p = call(
            &s,
            "clean_prepare",
            json!({"conclusionVersion":c["version"],"chosenMode":"quarantine"}),
        );
        m35_run_clean(&s, &p);
        let q = call(&s, "quarantine_list", json!({}));
        let id = q["cards"][0]["quarantine_id"].as_str().unwrap();
        let record_path = f.data.join("quarantine").join(format!("{id}.json"));
        let before = fs::read(&record_path).unwrap();
        let mut inspected = 0;
        // The listed synthetic batch is present; only the executor's inspect
        // operation fails. No filesystem permission changes or races needed.
        let calls = AtomicU64::new(0);
        quarantine::refresh_with(&s.core, |_, _| {
            calls.fetch_add(1, Ordering::SeqCst);
            Err(water_junk_clean::CleanError::InvalidPlan)
        })
        .unwrap();
        inspected += calls.load(Ordering::SeqCst);
        assert_eq!(
            inspected, 1,
            "SERVICE_M35_QUARANTINE: inspection failed for listed batch"
        );
        assert_eq!(
            fs::read(&record_path).unwrap(),
            before,
            "SERVICE_M35_QUARANTINE: failed inspect preserves record bytes"
        );
        assert!(
            s.core
                .state
                .lock()
                .unwrap()
                .m35
                .quarantine
                .records
                .contains_key(id),
            "SERVICE_M35_QUARANTINE: failed inspect preserves cached record"
        );
        assert!(
            call(&s, "quarantine_list", json!({}))["cards"]
                .as_array()
                .unwrap()
                .is_empty(),
            "SERVICE_M35_QUARANTINE: failed inspect omits card this time"
        );
        quarantine::refresh(&s.core).unwrap();
        assert_eq!(
            call(&s, "quarantine_list", json!({}))["cards"][0]["restorable"],
            true,
            "SERVICE_M35_QUARANTINE: next inspection restores recovery card"
        );
        assert_eq!(
            fs::read(&record_path).unwrap(),
            before,
            "SERVICE_M35_QUARANTINE: successful retry keeps record"
        );
        // Simulate the user's removal from the quarantine listing by moving
        // this batch elsewhere within the same newly created fixture.
        fs::rename(
            f.root.join(".water-quarantine").join(id),
            f.root.join("removed-batch"),
        )
        .unwrap();
        quarantine::refresh(&s.core).unwrap();
        assert!(
            !record_path.exists(),
            "SERVICE_M35_QUARANTINE: absent from listing removes record"
        );
    }
}

fn m35_purge_log_failure() {
    let f = Fixture::new();
    f.seed();
    let s = source_service(&f, true);
    scanned(&s);
    let c = m35_decide(&s, "downloads-installers");
    let p = call(
        &s,
        "clean_prepare",
        json!({"conclusionVersion":c["version"],"chosenMode":"quarantine"}),
    );
    m35_run_clean(&s, &p);
    let q = call(&s, "quarantine_list", json!({}));
    let id = q["cards"][0]["quarantine_id"].clone();
    s.core.store.fail_journal.store(true, Ordering::SeqCst);
    call(&s, "quarantine_delete", json!({"quarantineId":id}));
    let start = Instant::now();
    loop {
        match s.call("quarantine_progress", json!({})) {
            Err(e) => {
                assert_eq!(
                    e.message_zh,
                    quarantine::JOURNAL_MESSAGE,
                    "SERVICE_M35_QUARANTINE: purge journal error"
                );
                break;
            }
            Ok(p) if p["state"] == "running" => {}
            Ok(p) => panic!("SERVICE_M35_QUARANTINE: purge journal reported success {p}"),
        };
        assert!(
            start.elapsed() < Duration::from_secs(10),
            "SERVICE_M35_QUARANTINE: purge journal completion"
        );
        std::thread::sleep(Duration::from_millis(2));
    }
    assert_eq!(
        call(&s, "app_state", json!({}))["busy"],
        "idle",
        "SERVICE_M35_QUARANTINE: journal idle"
    );
    assert!(
        call(&s, "quarantine_list", json!({}))["cards"]
            .as_array()
            .unwrap()
            .is_empty(),
        "SERVICE_M35_QUARANTINE: inspect after lost report"
    );
}

#[test]
fn m35_trends_history() {
    m35_cluster_and_forecast();
    m35_dedupe_guards();
    let f = Fixture::new();
    f.seed();
    let a = f.file("duplicates/original.bin", 2 << 20);
    let b = f.root.join("duplicates/copy.bin");
    fs::copy(&a, &b).unwrap();
    f.age_all(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            - 2 * 86400,
    );
    let s = f.service(true);
    let root = m35_add(&s, &f, "duplicates");
    let id = call(&s, "dedupe_start", json!({"locationId":root}));
    assert_eq!(
        wait(&s, "dedupe_progress")["state"],
        "completed",
        "SERVICE_M35_TRENDS: dedupe"
    );
    let v = call(
        &s,
        "dedupe_result",
        json!({"dedupeId":id["dedupe_id"],"expand":false}),
    );
    assert_eq!(
        v["groups"].as_array().unwrap().len(),
        1,
        "SERVICE_M35_TRENDS: exact duplicate"
    );
    assert_eq!(
        v["chosen_bytes"], "0",
        "SERVICE_M35_TRENDS: default unselected"
    );
    let v = call(
        &s,
        "dedupe_decide",
        json!({"dedupeId":id["dedupe_id"],"version":v["version"],"groupId":v["groups"][0]["group_id"],"include":true}),
    );
    // The finder stamps its actual completion time. Align the fake clock to that
    // value, with a full hour margin; do not derive the age gate from CPU speed.
    f.fake.now.store(
        util::parse_time(v["finished_at"].as_str().unwrap())
            .unwrap()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            + 3600,
        Ordering::SeqCst,
    );
    assert_eq!(
        v["chosen_bytes"],
        (2 << 20).to_string(),
        "SERVICE_M35_TRENDS: chosen"
    );
    let p = call(
        &s,
        "clean_prepare",
        json!({"dedupeId":id["dedupe_id"],"dedupeVersion":v["version"]}),
    );
    assert_eq!(
        p["chosen"]["mode"], "quarantine",
        "SERVICE_M35_TRENDS: duplicate plan"
    );
    let (_, clean) = m35_run_clean(&s, &p);
    let saved_clean: Value = serde_json::from_slice(
        &fs::read(
            f.data
                .join("cleans")
                .join(format!("{}.json", clean["clean_id"].as_str().unwrap())),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        clean["quarantined"]["item_count"], 1,
        "SERVICE_M35_TRENDS: duplicate move {saved_clean}"
    );
    let history = call(&s, "history_list", json!({}));
    assert!(
        history
            .as_array()
            .unwrap()
            .iter()
            .any(|r| r["kind"] == "dedupe"),
        "SERVICE_M35_TRENDS: dedupe history"
    );
    assert!(
        history.as_array().unwrap().iter().any(|r| r["summary_zh"]
            .as_str()
            .unwrap_or("")
            .contains("进了隔离区")),
        "SERVICE_M35_TRENDS: quarantine history"
    );
    drop(s);
    for version in ["water.settings.v1", "water.settings.v2"] {
        let path = f.data.join("settings.json");
        let settings = json!({"settings_version":version,"categories":{"agent_tool":true,"browser":true,"system_temp":true,"app_leftover":true,"dev_cache":true,"crash_log":true,"gpu_system":true},"custom_roots":[]});
        fs::write(&path, settings.to_string()).unwrap();
        let s = f.service(false);
        call(
            &s,
            "locations_set_category",
            json!({"category":"browser","enabled":false}),
        );
        let settings: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(
            settings["settings_version"], "water.settings.v3",
            "SERVICE_M35_TRENDS: settings migration"
        );
        for key in ["sessions", "trusts", "fixed_marks", "keeps"] {
            assert!(
                settings[key].as_array().is_some_and(|x| x.is_empty()),
                "SERVICE_M35_TRENDS: default {key}"
            );
        }
    }
}

fn m35_dedupe_guards() {
    let f = Fixture::new();
    let a = f.file("dup/a.bin", 2 << 20);
    let b = f.root.join("dup/b.bin");
    fs::copy(&a, &b).unwrap();
    let linked = f.file("dup/linkset.bin", 3 << 20);
    fs::hard_link(&linked, f.root.join("dup/linkset-two.bin")).unwrap();
    let copy = f.root.join("dup/linkset-copy.bin");
    fs::copy(&linked, &copy).unwrap();
    f.age_all(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            - 4 * 86400,
    );
    let s = f.service(true);
    let root = m35_add(&s, &f, "dup");
    let id = call(&s, "dedupe_start", json!({"locationId":root}));
    wait(&s, "dedupe_progress");
    let mut v = call(
        &s,
        "dedupe_result",
        json!({"dedupeId":id["dedupe_id"],"expand":true}),
    );
    for group in v["groups"].as_array().unwrap().clone() {
        if group["removable"] == true {
            v = call(
                &s,
                "dedupe_decide",
                json!({"dedupeId":id["dedupe_id"],"version":v["version"],"groupId":group["group_id"],"include":true}),
            );
        }
    }
    let p = call(
        &s,
        "clean_prepare",
        json!({"dedupeId":id["dedupe_id"],"dedupeVersion":v["version"]}),
    );
    let plan = read_plan(&f, &p);
    assert!(
        plan["plan"]["items"]
            .as_array()
            .unwrap()
            .iter()
            .all(|i| i["path"] != slash(&linked)
                && i["path"] != slash(&f.root.join("dup/linkset-two.bin"))),
        "SERVICE_M35_CLEAN: linked copy not removable"
    );
    let group = v["groups"]
        .as_array()
        .unwrap()
        .iter()
        .find(|g| g["size"] == "2097152")
        .unwrap();
    let keep = group["keep"]["display_path"].as_str().unwrap();
    let held_path = format!("{keep}.held");
    fs::rename(keep, &held_path).unwrap();
    fs::write(keep, vec![0u8; 2 << 20]).unwrap();
    let prepared = s.call(
        "clean_prepare",
        json!({"dedupeId":id["dedupe_id"],"dedupeVersion":v["version"]}),
    );
    if let Ok(p) = prepared {
        assert!(
            !read_plan(&f, &p)["plan"]["items"]
                .as_array()
                .unwrap()
                .iter()
                .any(|i| i["group_id"] == group["group_id"]),
            "SERVICE_M35_CLEAN: changed keep excludes whole group"
        );
        assert!(
            p["chosen"]["items"][0]["title_zh"]
                .as_str()
                .unwrap()
                .contains("已经变化"),
            "SERVICE_M35_CLEAN: changed keep preview"
        );
    } else {
        let error = prepared.unwrap_err();
        assert!(
            error.code == "invalid" && error.message_zh.contains("已经变化"),
            "SERVICE_M35_CLEAN: changed keep whole plan empty"
        );
    }
    let before = v["version"].clone();
    let changed = call(
        &s,
        "dedupe_decide",
        json!({"dedupeId":id["dedupe_id"],"version":v["version"],"groupId":group["group_id"],"include":false}),
    );
    assert_ne!(
        before, changed["version"],
        "SERVICE_M35_TRENDS: dedupe revision"
    );
    assert_eq!(s.call("dedupe_decide",json!({"dedupeId":id["dedupe_id"],"version":before,"groupId":group["group_id"],"include":true})).unwrap_err().code,"stale","SERVICE_M35_TRENDS: dedupe stale");
}

fn m35_cluster_and_forecast() {
    let f = Fixture::new();
    f.seed();
    for n in 0..12 {
        f.file(&format!("windows/Temp/verify-A{n:05}/file"), 100);
    }
    f.age_all(NOW - 10 * 86400);
    let s = f.service(false);
    let a = scanned(&s);
    let a_id = a["scan_id"].clone();
    f.fake.now.store(NOW + 2 * 3600, Ordering::SeqCst);
    let b = scanned(&s);
    for n in 12..15 {
        let p = f.file(&format!("windows/Temp/verify-A{n:05}/file"), 100);
        age(p.parent().unwrap(), NOW + 3 * 3600);
    }
    f.fake.now.store(NOW + 27 * 3600, Ordering::SeqCst);
    let c = scanned(&s);
    let saved = scan_saved(&f, &c);
    assert_eq!(
        saved["growth_base_scan_id"], b["scan_id"],
        "SERVICE_M35_TRENDS: newest qualifying growth base"
    );
    assert_ne!(
        saved["growth_base_scan_id"], a_id,
        "SERVICE_M35_TRENDS: old qualifying base not picked"
    );
    let trends = call(&s, "trends", json!({}));
    let cluster = trends["clusters"]
        .as_array()
        .unwrap()
        .iter()
        .find(|r| r["state"] == "growing")
        .unwrap_or_else(|| panic!("SERVICE_M35_TRENDS: growing cluster {trends}"));
    let gid = cluster["group_id"].clone();
    let fixed = call(
        &s,
        "cluster_mark_fixed",
        json!({"groupId":gid,"fixed":true}),
    );
    assert_eq!(
        fixed["clusters"]
            .as_array()
            .unwrap()
            .iter()
            .find(|g| g["group_id"] == gid)
            .unwrap()["state"],
        "stopped",
        "SERVICE_M35_TRENDS: fixed stopped"
    );
    drop(s);
    let mut saved = saved;
    let new_id = "scan-20270117T080000Z-00ab";
    saved["scan_id"] = json!(new_id);
    saved["result"]["scan_id"] = json!(new_id);
    saved["finished_at"] = json!("2027-01-17T08:00:00Z");
    saved["result"]["ended_at"] = json!("2027-01-17T08:00:00Z");
    saved["growth_base_scan_id"] = json!("scan-20260101T080000Z-0000");
    saved["growth"] = json!([{"group_id":"codex-marketplace-staging","bytes_delta":"2097152000","count_delta":20,"days":2.0,"bytes_per_day":"1048576000","leak_suspect":false}]);
    write_scan(&f, &saved);
    let s = f.service(false);
    let d = call(
        &s,
        "group_detail",
        json!({"groupId":"codex-marketplace-staging"}),
    );
    assert!(
        d["group"]["growth"]["since"].is_null(),
        "SERVICE_M35_TRENDS: missing base since"
    );
    assert!(
        call(&s, "app_state", json!({}))["insights"]
            .as_array()
            .unwrap()
            .iter()
            .any(|i| i["message_zh"]
                .as_str()
                .unwrap()
                .contains("与更早的一次体检相比")),
        "SERVICE_M35_TRENDS: missing base wording"
    );
    drop(s);
    let s = source_service(&f, false);
    for (n, free) in [
        (0, 2u64 << 30),
        (1, 4u64 << 30),
        (2, 3u64 << 30),
        (3, 2u64 << 30),
    ] {
        let mut point = saved.clone();
        let at = util::timestamp(UNIX_EPOCH + Duration::from_secs(NOW + n * 2 * 86400));
        let id = format!("scan-20270101T000000Z-{n:04x}");
        point["scan_id"] = json!(id);
        point["result"]["scan_id"] = json!(id);
        point["finished_at"] = json!(at);
        point["result"]["ended_at"] = json!(at);
        point["drives"] = json!([{"root":"F:\\","free_bytes":free.to_string(),"total_bytes":(20u64<<30).to_string()}]);
        if n == 0 {
            s.core.state.lock().unwrap().records.clear();
        }
        m35_replace_record(&s, point);
    }
    f.fake.now.store(NOW + 7 * 86400, Ordering::SeqCst);
    let trends = call(&s, "trends", json!({}));
    assert_eq!(
        trends["forecast"][0]["note_zh"], "Water 以外的清理之后重新起算",
        "SERVICE_M35_TRENDS: external cleanup reset"
    );
    assert_eq!(
        trends["forecast"][0]["basis_days"], 4.0,
        "SERVICE_M35_TRENDS: reset basis"
    );
    assert_eq!(
        trends["forecast"][0]["days_to_full"], 4,
        "SERVICE_M35_TRENDS: reset forecast"
    );
    let mut state = s.core.state.lock().unwrap();
    let record = state.last_record().unwrap();
    let mut suspected = record.saved.clone();
    for g in suspected["result"]["groups"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .filter(|g| g["rule_id"] == "leak-cluster")
    {
        g["level"] = json!("advisory");
    }
    state.m35.conclusion = None;
    drop(state);
    m35_replace_record(&s, suspected);
    let trends = call(&s, "trends", json!({}));
    assert!(
        trends["clusters"]
            .as_array()
            .unwrap()
            .iter()
            .any(|g| g["state"] == "suspected"),
        "SERVICE_M35_TRENDS: suspected cluster"
    );
}
