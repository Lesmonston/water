#![forbid(unsafe_code)]

use serde_json::{Value, json};
use std::{
    collections::hash_map::RandomState,
    ffi::{OsStr, OsString},
    fs::{self, File, OpenOptions},
    hash::BuildHasher,
    io::{self, Write},
    os::windows::{
        ffi::{OsStrExt, OsStringExt},
        fs::{MetadataExt, OpenOptionsExt},
    },
    path::{Path, PathBuf},
    process::Command,
    sync::{
        Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::{Duration, Instant, SystemTime},
};
use water_junk_clean::*;

// Exercise the production gates without creating either drive-root quarantine directory.
#[path = "../src/move_checks.rs"]
mod move_checks;

const REPARSE: u32 = 0x400;

struct Fixture {
    parent: PathBuf,
    base: PathBuf,
}
impl Fixture {
    fn new() -> Self {
        // Cargo preserves forward separators from --manifest-path; MODEL/mklink require '\\'.
        let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
        let tree = manifest.as_path().parent().unwrap().parent().unwrap();
        // Any checkout location works, but only from a real git work tree root.
        assert!(
            fs::symlink_metadata(tree.join(".git")).is_ok(),
            "fixture refused: no .git under the work tree root"
        );
        let parent = tree.join(".local").join("w2-d-fixtures");
        assert_plain_ancestors(parent.parent().unwrap());
        fs::create_dir_all(&parent).unwrap();
        assert_plain_ancestors(&parent);
        let nonce = RandomState::new().hash_one((SystemTime::now(), std::process::id()));
        let base = parent.join(format!("fixture-{nonce:016x}"));
        fs::create_dir(&base).unwrap(); // Never reuse an earlier fixture.
        Self { parent, base }
    }
    fn dir(&self, relative: &str) -> PathBuf {
        let path = self.base.join(relative.replace('/', "\\"));
        assert!(path.starts_with(&self.base));
        assert!(
            !Path::new(relative)
                .components()
                .any(|c| !matches!(c, std::path::Component::Normal(_)))
        );
        fs::create_dir_all(&path).unwrap();
        path
    }
    fn file(&self, relative: &str, data: &[u8]) -> PathBuf {
        let path = self.base.join(relative.replace('/', "\\"));
        assert!(path.starts_with(&self.base));
        assert!(
            !Path::new(relative)
                .components()
                .any(|c| !matches!(c, std::path::Component::Normal(_)))
        );
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
            .unwrap();
        file.write_all(data).unwrap();
        path
    }
    fn junction(&self, link: &Path, target: &Path) {
        // Only the explicitly permitted mklink command uses cmd. Deletion never crosses shells.
        assert!(link.starts_with(&self.base) && target.starts_with(&self.base));
        assert_plain_ancestors(link.parent().unwrap());
        assert_plain_ancestors(target);
        assert!(fs::symlink_metadata(link).is_err());
        let result = Command::new("cmd")
            .args(["/D", "/C", "mklink", "/J"])
            .arg(link)
            .arg(target)
            .output()
            .unwrap();
        assert!(result.status.success(), "fixture junction creation failed");
        assert_ne!(
            fs::symlink_metadata(link).unwrap().file_attributes() & REPARSE,
            0
        );
    }
}
fn assert_plain_ancestors(path: &Path) {
    for ancestor in path.ancestors() {
        assert_eq!(
            fs::symlink_metadata(ancestor).unwrap().file_attributes() & REPARSE,
            0
        );
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        // Verify the absolute owner boundary before any recursive cleanup.
        assert!(self.base.is_absolute());
        assert_eq!(self.base.parent(), Some(self.parent.as_path()));
        let name = self.base.file_name().unwrap().to_str().unwrap();
        assert_eq!(name.len(), "fixture-".len() + 16);
        assert!(name.starts_with("fixture-") && name[8..].bytes().all(|c| c.is_ascii_hexdigit()));
        assert_plain_ancestors(&self.parent);
        assert_eq!(
            fs::canonicalize(&self.base).unwrap().parent(),
            Some(fs::canonicalize(&self.parent).unwrap().as_path())
        );
        remove_owned(&self.base, &self.base);
    }
}
fn extended(path: &Path) -> PathBuf {
    if let Some(s) = path.to_str() {
        if s.starts_with(r"\\?\") {
            path.to_path_buf()
        } else {
            PathBuf::from(format!(r"\\?\{s}"))
        }
    } else {
        let mut wide: Vec<u16> = OsStr::new(r"\\?\").encode_wide().collect();
        wide.extend(path.as_os_str().encode_wide());
        PathBuf::from(OsString::from_wide(&wide))
    }
}

fn under_owned(path: &Path, owned: &Path) -> bool {
    let strip = |p: &Path| -> PathBuf {
        let prefix: Vec<u16> = OsStr::new(r"\\?\").encode_wide().collect();
        let wide: Vec<u16> = p.as_os_str().encode_wide().collect();
        if wide.starts_with(&prefix) {
            PathBuf::from(OsString::from_wide(&wide[prefix.len()..]))
        } else {
            p.to_path_buf()
        }
    };
    strip(path).starts_with(strip(owned))
}

fn remove_owned(path: &Path, owned: &Path) {
    assert!(under_owned(path, owned));
    let mut pending = vec![extended(path)];
    let mut files = Vec::new();
    let mut dirs = Vec::new();
    while let Some(p) = pending.pop() {
        assert!(under_owned(&p, owned));
        let meta = fs::symlink_metadata(&p).unwrap();
        let attr = meta.file_attributes();
        if attr & REPARSE != 0 {
            files.push((p, attr));
        } else if meta.is_dir() {
            dirs.push(p.clone());
            for entry in fs::read_dir(&p).unwrap() {
                pending.push(entry.unwrap().path());
            }
        } else {
            files.push((p, attr));
        }
    }
    for (p, attr) in files {
        if attr & REPARSE != 0 {
            if attr & 0x10 != 0 {
                fs::remove_dir(&p).unwrap();
            } else {
                fs::remove_file(&p).unwrap();
            }
        } else {
            let meta = fs::symlink_metadata(&p).unwrap();
            if meta.permissions().readonly() {
                let mut permissions = meta.permissions();
                // Synthetic Windows fixture only; no Unix permissions exist in this test.
                #[allow(clippy::permissions_set_readonly_false)]
                permissions.set_readonly(false);
                fs::set_permissions(&p, permissions).unwrap();
            }
            fs::remove_file(&p).unwrap();
        }
    }
    for p in dirs.into_iter().rev() {
        fs::remove_dir(&p).unwrap();
    }
}
fn s(path: &Path) -> String {
    path.to_str().unwrap().to_owned()
}
fn size(path: &Path) -> u64 {
    let mut total = 0u64;
    let mut stack = vec![extended(path)];
    while let Some(p) = stack.pop() {
        let Ok(m) = fs::symlink_metadata(&p) else {
            continue;
        };
        if m.file_attributes() & REPARSE != 0 {
            continue;
        } else if m.is_dir() {
            for entry in fs::read_dir(&p).unwrap() {
                stack.push(entry.unwrap().path());
            }
        } else {
            total += m.len();
        }
    }
    total
}
fn item(root: &Path, path: &Path, id: &str) -> Value {
    json!({"item_id":id,"group_id":"synthetic","rule_id":"fixture-rule","level":"recommended",
        "path":s(path),"root":s(root),"kind":if path.is_dir() {"dir"} else {"file"},
        "identity":identity_of(&s(path)).unwrap(),"total_bytes":size(path).to_string(),"min_age_hours":0})
}
fn plan_value(items: Vec<Value>) -> Value {
    json!({"plan_version":"water.clean-plan.v1","plan_id":"fixture-plan",
        "created_at":"2026-10-26T04:05:00Z","items":items,"protected_paths":[],"hard_guards":[]})
}
fn parse(value: Value) -> CleanPlan {
    CleanPlan::from_json(&value.to_string()).unwrap()
}
struct Observer(Mutex<Vec<(usize, usize, u64, String)>>);
impl Observer {
    fn new() -> Self {
        Self(Mutex::new(Vec::new()))
    }
}
impl CleanObserver for Observer {
    fn on_item(&self, done: usize, total: usize, bytes: u64, id: &str) {
        self.0.lock().unwrap().push((done, total, bytes, id.into()));
    }
}
fn run(plan: &CleanPlan) -> CleanReport {
    execute(
        plan,
        &NoGuard,
        &mut Vec::new(),
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now(),
    )
    .unwrap()
}
fn skipped(report: &CleanReport, reason: SkipReason) {
    assert_eq!(report.items.len(), 1);
    assert_eq!(report.items[0].status, ItemStatus::Skipped);
    assert_eq!(report.items[0].skip_reason, Some(reason));
    assert_eq!(report.freed_bytes, "0");
}
fn reject(value: Value) {
    assert!(
        CleanPlan::from_json(&value.to_string()).is_err(),
        "invalid plan accepted"
    );
}

#[test]
fn clean_plan_contract() {
    let empty = parse(plan_value(vec![]));
    let clean = run(&empty);
    assert_eq!(
        clean.journal_error, None,
        "CLEAN_W12_JOURNAL: clean default"
    );
    assert!(
        !serde_json::from_str::<Value>(&report_to_json(&clean))
            .expect("CLEAN_W12_JOURNAL: clean JSON")
            .as_object()
            .expect("CLEAN_W12_JOURNAL: clean object")
            .contains_key("journal_error"),
        "CLEAN_W12_JOURNAL: absent clean error must not serialize"
    );
    let quarantine = quarantine(
        &empty,
        "empty",
        &QuarantineTarget { base: None },
        &NoGuard,
        &mut Vec::new(),
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now(),
    )
    .expect("CLEAN_W12_JOURNAL: empty quarantine");
    assert_eq!(
        quarantine.journal_error, None,
        "CLEAN_W12_JOURNAL: move default"
    );
    assert!(
        !serde_json::from_str::<Value>(&quarantine_report_to_json(&quarantine))
            .expect("CLEAN_W12_JOURNAL: quarantine JSON")
            .as_object()
            .expect("CLEAN_W12_JOURNAL: quarantine object")
            .contains_key("journal_error"),
        "CLEAN_W12_JOURNAL: absent quarantine error must not serialize"
    );
    // CLEAN_W11_NESTED: exercise both public execution entries, including Rust callers
    // constructing/editing public fields rather than relying on JSON validation.
    let overlap = QFixture::new("w11-overlap");
    let parent = overlap.dir("root/cache");
    let child = overlap.file("root/cache/data", b"nested-must-stay");
    let near = overlap.file("root/cache-sibling", b"sibling-must-stay");
    for plan in overlapping_plans(&overlap.base, &parent, &child, &near) {
        let mut log = Vec::new();
        let observer = Observer::new();
        let result = execute(
            &plan,
            &NoGuard,
            &mut log,
            &StopFlag::default(),
            &observer,
            SystemTime::now() + Duration::from_secs(2),
        );
        assert!(
            matches!(result, Err(CleanError::InvalidPlan)),
            "CLEAN_W11_NESTED: execute accepted overlapping paths: {result:?}"
        );
        assert!(
            log.is_empty() && observer.0.lock().unwrap().is_empty(),
            "CLEAN_W11_NESTED: execute wrote journal or called observer"
        );
        assert_eq!(
            fs::read(&child).ok().as_deref(),
            Some(b"nested-must-stay".as_slice()),
            "CLEAN_W11_NESTED: execute changed nested bytes"
        );
        assert_eq!(
            fs::read(&near).ok().as_deref(),
            Some(b"sibling-must-stay".as_slice()),
            "CLEAN_W11_NESTED: execute changed sibling bytes"
        );
        assert!(
            !Path::new(&overlap.root()).exists(),
            "CLEAN_W11_NESTED: execute created quarantine directory"
        );
    }
    let disjoint = parse(plan_value(vec![
        item(&overlap.base, &parent, "parent"),
        item(&overlap.base, &near, "near"),
    ]));
    assert!(
        execute(
            &disjoint,
            &NoGuard,
            &mut Vec::new(),
            &StopFlag::default(),
            &Observer::new(),
            SystemTime::now() + Duration::from_secs(2)
        )
        .is_ok(),
        "CLEAN_W11_NESTED: segment-distinct sibling rejected"
    );
    let fixture = Fixture::new();
    let root = fixture.dir("root");
    let file = fixture.file("root/cache", b"contract-data");
    let value = plan_value(vec![item(&root, &file, "one")]);
    let valid = parse(value.clone());
    assert_eq!(valid.items[0].identity, identity_of(&s(&file)).unwrap());
    assert_eq!(serde_json::to_value(&valid).unwrap(), value);
    let mut unknown = value.clone();
    unknown["unknown"] = json!(1);
    reject(unknown);
    let mut unknown = value.clone();
    unknown["items"][0]["unknown"] = json!(1);
    reject(unknown);
    let mut unknown = value.clone();
    unknown["items"][0]["identity"]["unknown"] = json!(1);
    reject(unknown);
    let mut duplicate = value.clone();
    duplicate["items"]
        .as_array_mut()
        .unwrap()
        .push(value["items"][0].clone());
    reject(duplicate);
    for key in ["identity", "root", "path", "total_bytes", "min_age_hours"] {
        let mut v = value.clone();
        v["items"][0].as_object_mut().unwrap().remove(key);
        reject(v);
    }
    for (key, invalid) in [
        ("level", json!("advisory")),
        ("level", json!("protected")),
        ("kind", json!("any")),
        ("kind", json!("link")),
        ("identity", Value::Null),
        ("total_bytes", json!(1)),
        ("total_bytes", json!("-1")),
        ("total_bytes", json!("1.0")),
        ("total_bytes", json!("1e3")),
        ("total_bytes", json!("")),
        ("total_bytes", json!(" 1")),
        ("total_bytes", json!("+1")),
        ("total_bytes", json!("18446744073709551616")),
        ("min_age_hours", json!(-1)),
        ("min_age_hours", json!(9007199254740992u64)),
        ("min_age_hours", json!(1.5)),
    ] {
        let mut v = value.clone();
        v["items"][0][key] = invalid;
        reject(v);
    }
    for invalid in ["", "0000000a", "000000000"] {
        let mut v = value.clone();
        v["items"][0]["identity"]["volume_serial"] = json!(invalid);
        reject(v);
    }
    let mut v = value.clone();
    v["items"][0]["identity"]["file_id"] = json!("A0000000000000000000000000000000");
    reject(v);
    for invalid in [
        "2026-02-29T00:00:00Z",
        "2026-01-01T24:00:00Z",
        "2026-01-01T00:00:00+00:00",
        "...",
        "2026-01-01T00:00:00.001Z",
    ] {
        let mut v = value.clone();
        v["created_at"] = json!(invalid);
        reject(v);
    }
    let mut v = value.clone();
    v["plan_version"] = json!("water.clean-plan.v2");
    reject(v);
    let raw =
        value
            .to_string()
            .replacen("\"plan_id\":", "\"plan_id\":\"duplicate\",\"plan_id\":", 1);
    assert!(CleanPlan::from_json(&raw).is_err());
    let root_s = s(&root);
    for invalid in [
        "relative".into(),
        format!("{}\\", s(&file)),
        format!("{root_s}\\.\\cache"),
        format!("{root_s}\\..\\cache"),
        format!("{root_s}\\\\cache"),
        s(&file).replace('\\', "/"),
        format!("\\\\?\\{}", s(&file)),
        format!("\\\\host\\{}", s(&file)),
        format!("{root_s}\\cache:stream"),
        format!("{root_s}\\cache."),
        format!("{root_s}\\cache "),
        format!("{root_s}\\NUL.txt"),
        format!("{root_s}\\COM1"),
        format!("{root_s}\\bad\0name"),
        format!("{root_s}\\bad*name"),
    ] {
        for key in ["path", "root"] {
            let mut v = value.clone();
            v["items"][0][key] = json!(invalid);
            reject(v);
        }
        for key in ["hard_guards", "protected_paths"] {
            let mut v = value.clone();
            v[key] = json!([invalid]);
            reject(v);
        }
    }
    let mut equal = value.clone();
    equal["items"][0]["path"] = json!(root_s);
    reject(equal);
    let mut sibling = value.clone();
    sibling["items"][0]["path"] = json!(format!("{root_s}-sibling\\cache"));
    reject(sibling);
    for guard in [s(&file), format!("{}\\child", s(&file))] {
        let mut v = value.clone();
        v["hard_guards"] = json!([guard]);
        reject(v);
    }
    for protected in [s(&file), format!("{}\\child", s(&file)), s(&root)] {
        let mut v = value.clone();
        v["protected_paths"] = json!([protected]);
        reject(v);
    }
    let mut legal = value.clone();
    legal["hard_guards"] = json!([s(&root), &s(&root)[..3]]);
    legal["protected_paths"] = json!([format!("{}-sibling", s(&file))]);
    legal["items"][0]["root"] = json!(s(&root).to_ascii_uppercase());
    legal["items"][0]["level"] = json!("confirm");
    parse(legal);
    assert_eq!(fs::read(&file).unwrap(), b"contract-data");
    // Defence in depth for a trusted Rust caller that edits a parsed plan.
    let mut bounded = valid.clone();
    bounded.items[0].root = s(&fixture.dir("different-root"));
    skipped(&run(&bounded), SkipReason::OutsideRoot);
    let mut guarded = valid;
    guarded.hard_guards.push(s(&file));
    skipped(&run(&guarded), SkipReason::Guarded);
    assert!(file.exists());
}

#[test]
fn clean_revalidation_skips() {
    let fixture = Fixture::new();
    let root = fixture.dir("root");
    let gone = fixture.file("root/gone", b"gone");
    let plan = parse(plan_value(vec![item(&root, &gone, "gone")]));
    fs::remove_file(&gone).unwrap();
    skipped(&run(&plan), SkipReason::Gone);

    let replaced = fixture.file("root/replaced", b"original");
    let plan = parse(plan_value(vec![item(&root, &replaced, "identity")]));
    // Hold the deleted object's handle so NTFS cannot recycle its ID for the replacement.
    let old = OpenOptions::new()
        .read(true)
        .share_mode(7)
        .open(&replaced)
        .unwrap();
    fs::remove_file(&replaced).unwrap();
    let replaced = fixture.file("root/replaced", b"replacement-must-survive");
    assert_ne!(identity_of(&s(&replaced)).unwrap(), plan.items[0].identity);
    let report = run(&plan);
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Changed),
        "CLEAN_IDENTITY: replacement was accepted"
    );
    assert_eq!(
        fs::read(&replaced).ok().as_deref(),
        Some(b"replacement-must-survive".as_slice()),
        "CLEAN_IDENTITY: replacement bytes lost"
    );
    drop(old);

    let kind = fixture.file("root/kind", b"file");
    let plan = parse(plan_value(vec![item(&root, &kind, "kind")]));
    fs::remove_file(&kind).unwrap();
    fixture.dir("root/kind");
    fixture.file("root/kind/precious", b"type-changed");
    skipped(&run(&plan), SkipReason::Changed);
    assert_eq!(size(&kind), 12);

    let recent = fixture.file("root/recent", b"new");
    let mut value = plan_value(vec![item(&root, &recent, "recent")]);
    value["items"][0]["min_age_hours"] = json!(1);
    skipped(&run(&parse(value)), SkipReason::TooRecent);
    assert_eq!(fs::read(&recent).unwrap(), b"new");

    struct Busy;
    impl ItemGuard for Busy {
        fn in_use(&self, _: &PlanItem) -> Option<String> {
            Some("fixture-process.exe".into())
        }
    }
    let busy = fixture.file("root/busy", b"busy");
    let plan = parse(plan_value(vec![item(&root, &busy, "busy")]));
    let mut journal = Vec::new();
    let report = execute(
        &plan,
        &Busy,
        &mut journal,
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now(),
    )
    .unwrap();
    skipped(&report, SkipReason::InUse);
    assert_eq!(fs::read(&busy).unwrap(), b"busy");
    assert!(
        !String::from_utf8(journal)
            .unwrap()
            .contains("fixture-process")
    );

    let protected = fixture.dir("root/protected-case");
    let precious = fixture.file("root/protected-case/precious", b"protected");
    let mut plan = parse(plan_value(vec![item(&root, &protected, "protected")]));
    // from_json rejects this overlap. Simulate a backend adding protection after planning:
    // execute must independently enforce it even for an already-constructed Rust plan.
    plan.protected_paths.push(s(&precious));
    skipped(&run(&plan), SkipReason::ProtectedOverlap);
    assert_eq!(fs::read(&precious).unwrap(), b"protected");
}

#[test]
fn clean_no_follow() {
    let fixture = Fixture::new();
    let root = fixture.dir("root");
    let cache = fixture.dir("root/cache");
    fixture.file("root/cache/local", b"local-cache");
    let outside = fixture.dir("outside");
    let survivor = fixture.file("outside/survivor", b"external-data");
    let link = cache.join("junction");
    fixture.junction(&link, &outside);
    let plan = parse(plan_value(vec![item(&root, &cache, "nested-link")]));
    let report = run(&plan);
    assert!(outside.is_dir(), "CLEAN_NO_FOLLOW: external directory lost");
    assert_eq!(
        fs::read(&survivor).ok().as_deref(),
        Some(b"external-data".as_slice()),
        "CLEAN_NO_FOLLOW: junction target was traversed"
    );
    assert!(fs::symlink_metadata(&link).is_err());
    assert_eq!(report.items[0].status, ItemStatus::Deleted);
    assert_eq!(report.freed_bytes, "11");

    let external_item = fixture.dir("external-parent/item");
    let external_file = fixture.file("external-parent/item/precious", b"boundary-data");
    let bridge = root.join("bridge");
    fixture.junction(&bridge, external_item.parent().unwrap());
    let aliased = bridge.join("item");
    let plan = parse(plan_value(vec![item(&root, &aliased, "middle-link")]));
    let report = run(&plan);
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::OutsideRoot),
        "CLEAN_ROOT_BOUND: intermediate junction allowed"
    );
    assert_eq!(
        fs::read(&external_file).ok().as_deref(),
        Some(b"boundary-data".as_slice()),
        "CLEAN_ROOT_BOUND: external child lost"
    );

    let root_link = fixture.base.join("root-link");
    fixture.junction(&root_link, external_item.parent().unwrap());
    let plan = parse(plan_value(vec![item(
        &root_link,
        &root_link.join("item"),
        "root-link",
    )]));
    skipped(&run(&plan), SkipReason::OutsideRoot);
    let plan = parse(plan_value(vec![item(&root, &bridge, "item-link")]));
    skipped(&run(&plan), SkipReason::Reparse);
    assert!(fs::symlink_metadata(&bridge).is_ok());
    assert_eq!(fs::read(&external_file).unwrap(), b"boundary-data");

    // An inner directory swapped for a junction after planning: only the link is removed.
    let swap = fixture.dir("root/swap");
    fixture.file("root/swap/inner/victim", b"inner");
    let decoy = fixture.dir("decoy");
    let decoy_victim = fixture.file("decoy/victim", b"decoy-data");
    let plan = parse(plan_value(vec![item(&root, &swap, "swapped-inner")]));
    fs::rename(swap.join("inner"), swap.join("moved")).unwrap();
    fixture.junction(&swap.join("inner"), &decoy);
    let report = run(&plan);
    assert_eq!(
        fs::read(&decoy_victim).ok().as_deref(),
        Some(b"decoy-data".as_slice()),
        "CLEAN_NO_FOLLOW: swapped-in junction target was traversed"
    );
    assert!(decoy.is_dir() && fs::symlink_metadata(swap.join("inner")).is_err());
    assert_eq!(report.items[0].status, ItemStatus::Deleted);
}

struct DiskJournal {
    file: File,
    path: PathBuf,
    targets: Vec<PathBuf>,
    intents_checked: usize,
}
impl Write for DiskJournal {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.file.write(bytes)
    }
    fn flush(&mut self) -> io::Result<()> {
        self.file.flush()?;
        self.file.sync_all()?;
        let lines = journal_values(&self.path);
        if let Some(last) = lines.last()
            && last["event"] == "intent"
        {
            let target = PathBuf::from(last["path"].as_str().unwrap());
            assert!(self.targets.contains(&target));
            assert!(target.exists(), "intent must be flushed before deletion");
            self.intents_checked += 1;
        }
        Ok(())
    }
}
fn journal_values(path: &Path) -> Vec<Value> {
    fs::read_to_string(path)
        .unwrap()
        .lines()
        .map(|l| serde_json::from_str(l).unwrap())
        .collect()
}
struct DiskObserver {
    path: PathBuf,
    stop: StopFlag,
    callbacks: Mutex<usize>,
}

// A transient failure on one complete line: continuing afterwards would succeed,
// so the assertions detect both a missing report and an unsafe later action.
struct FailLineJournal {
    fail_at: usize,
    flush_fails: bool,
    writes: usize,
    flushes: usize,
}
impl FailLineJournal {
    fn new(fail_at: usize, flush_fails: bool) -> Self {
        Self {
            fail_at,
            flush_fails,
            writes: 0,
            flushes: 0,
        }
    }
}
impl Write for FailLineJournal {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.writes += 1;
        if !self.flush_fails && self.writes == self.fail_at {
            Err(io::Error::other("injected line write failure"))
        } else {
            Ok(bytes.len())
        }
    }
    fn flush(&mut self) -> io::Result<()> {
        self.flushes += 1;
        if self.flush_fails && self.flushes == self.fail_at {
            Err(io::Error::other("injected line flush failure"))
        } else {
            Ok(())
        }
    }
}
impl CleanObserver for DiskObserver {
    fn on_item(&self, done: usize, total: usize, _: u64, id: &str) {
        // Read the actual journal file before completing the observer callback.
        let lines = journal_values(&self.path);
        assert_eq!(lines.len(), done * 2);
        assert_eq!(lines[done * 2 - 2]["event"], "intent");
        assert_eq!(lines[done * 2 - 1]["event"], "result");
        assert_eq!(lines[done * 2 - 1]["item_id"], id);
        assert!(done <= total);
        *self.callbacks.lock().unwrap() += 1;
        if done == 1 {
            self.stop.stop();
        }
    }
}

#[test]
fn clean_partial_stop_journal() {
    let fixture = Fixture::new();
    let root = fixture.dir("root");
    let cache = fixture.dir("root/cache");
    let locked = fixture.file("root/cache/locked", b"locked");
    let ordinary = fixture.file("root/cache/ordinary", b"ordinary");
    let readonly = fixture.file("root/cache/readonly", b"readonly");
    let mut permissions = fs::metadata(&readonly).unwrap().permissions();
    permissions.set_readonly(true);
    fs::set_permissions(&readonly, permissions).unwrap();
    let next = fixture.file("root/next", b"next-item");
    let plan = parse(plan_value(vec![
        item(&root, &cache, "partial"),
        item(&root, &next, "next"),
    ]));
    let lock = OpenOptions::new()
        .read(true)
        .share_mode(0)
        .open(&locked)
        .unwrap();
    let journal_path = fixture.file("journal.jsonl", b"");
    let mut journal = DiskJournal {
        file: OpenOptions::new().append(true).open(&journal_path).unwrap(),
        path: journal_path.clone(),
        targets: vec![cache.clone(), next.clone()],
        intents_checked: 0,
    };
    let stop = StopFlag::default();
    let observer = DiskObserver {
        path: journal_path,
        stop: stop.clone(),
        callbacks: Mutex::new(0),
    };
    let report = execute(
        &plan,
        &NoGuard,
        &mut journal,
        &stop,
        &observer,
        SystemTime::now(),
    )
    .unwrap();
    assert_eq!(report.items[0].status, ItemStatus::Partial);
    assert!(report.items[0].failed_entries >= 1);
    assert!(!ordinary.exists() && !readonly.exists());
    assert!(locked.exists() && next.exists());
    assert_eq!(report.items[0].bytes_freed, "16");
    assert_eq!(report.items[1].skip_reason, Some(SkipReason::Cancelled));
    assert_eq!(report.status, RunStatus::Stopped);
    assert_eq!(*observer.callbacks.lock().unwrap(), 2);
    assert_eq!(journal.intents_checked, 2);
    drop(lock);
    drop(journal);

    // No deletions before a complete successful intent write AND flush.
    struct Failing {
        flush_fails: bool,
    }
    impl Write for Failing {
        fn write(&mut self, b: &[u8]) -> io::Result<usize> {
            if self.flush_fails {
                Ok(b.len())
            } else {
                Err(io::Error::other("injected write failure"))
            }
        }
        fn flush(&mut self) -> io::Result<()> {
            Err(io::Error::other("injected flush failure"))
        }
    }
    let plan = parse(plan_value(vec![item(&root, &next, "journal-failure")]));
    for flush_fails in [false, true] {
        let observer = Observer::new();
        let error = execute(
            &plan,
            &NoGuard,
            &mut Failing { flush_fails },
            &StopFlag::default(),
            &observer,
            SystemTime::now(),
        )
        .expect_err("CLEAN_W12_JOURNAL_FIRST: execute must reject first intent");
        assert_eq!(error, CleanError::Journal, "CLEAN_W12_JOURNAL_FIRST: error");
        assert!(
            observer.0.lock().unwrap().is_empty(),
            "CLEAN_W12_JOURNAL_FIRST: callback before intent"
        );
        assert_eq!(
            fs::read(&next).ok().as_deref(),
            Some(b"next-item".as_slice()),
            "CLEAN_W12_JOURNAL_FIRST: source changed"
        );
    }
    // An exclusively locked single file reports failed, with zero freed bytes.
    let lock = OpenOptions::new()
        .read(true)
        .share_mode(0)
        .open(&next)
        .unwrap();
    let report = run(&plan);
    assert_eq!(report.items[0].status, ItemStatus::Failed);
    assert!(report.items[0].failed_entries >= 1);
    assert_eq!(report.freed_bytes, "0");
    drop(lock);

    // Stop during an intent flush: no child is removed.
    struct StopWriter(StopFlag);
    impl Write for StopWriter {
        fn write(&mut self, b: &[u8]) -> io::Result<usize> {
            Ok(b.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            self.0.stop();
            Ok(())
        }
    }
    let stop = StopFlag::default();
    let report = execute(
        &plan,
        &NoGuard,
        &mut StopWriter(stop.clone()),
        &stop,
        &Observer::new(),
        SystemTime::now(),
    )
    .unwrap();
    skipped(&report, SkipReason::Cancelled);
    // Cancelled after measurement: bytes_before is the measured size, nothing is freed.
    assert_eq!(report.items[0].bytes_before, "9");
    assert_eq!(report.items[0].bytes_freed, "0");
    assert_eq!(report.status, RunStatus::Stopped);
    assert!(next.exists());

    // A result flush failure preserves the deletion report and stops later items.
    struct ResultFailure {
        flushes: usize,
    }
    impl Write for ResultFailure {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            Ok(bytes.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            self.flushes += 1;
            if self.flushes == 2 {
                Err(io::Error::other("injected result flush failure"))
            } else {
                Ok(())
            }
        }
    }
    let before_result = fixture.file("root/result-failure", b"already-deleted");
    let result_plan = parse(plan_value(vec![
        item(&root, &before_result, "result-failure"),
        item(&root, &next, "unreached"),
    ]));
    let observer = Observer::new();
    let report = execute(
        &result_plan,
        &NoGuard,
        &mut ResultFailure { flushes: 0 },
        &StopFlag::default(),
        &observer,
        SystemTime::now(),
    )
    .expect("CLEAN_W12_JOURNAL: result failure lost deletion report");
    assert_eq!(
        report.status,
        RunStatus::Stopped,
        "CLEAN_W12_JOURNAL: result status"
    );
    assert_eq!(
        report.journal_error.as_deref(),
        Some("journal write failed"),
        "CLEAN_W12_JOURNAL: result error"
    );
    assert_eq!(
        report.items.len(),
        2,
        "CLEAN_W12_JOURNAL: result item count"
    );
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_W12_JOURNAL: deletion lost"
    );
    assert_eq!(
        report.items[0].bytes_freed, "15",
        "CLEAN_W12_JOURNAL: deleted bytes"
    );
    assert_eq!(
        report.items[1].skip_reason,
        Some(SkipReason::JournalFailed),
        "CLEAN_W12_JOURNAL: later reason"
    );
    assert_eq!(report.freed_bytes, "15", "CLEAN_W12_JOURNAL: total bytes");
    assert!(
        !before_result.exists() && next.exists(),
        "CLEAN_W12_JOURNAL: later source changed"
    );
    assert_eq!(
        *observer.0.lock().unwrap(),
        vec![
            (1, 2, 15, "result-failure".into()),
            (2, 2, 15, "unreached".into())
        ],
        "CLEAN_W12_JOURNAL: report progress"
    );

    for flush_fails in [false, true] {
        for (count, fail_at) in [(3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (1, 2)] {
            let f = Fixture::new();
            let root = f.dir("root");
            let paths: Vec<_> = (0..count)
                .map(|i| f.file(&format!("root/{i}"), b"abc"))
                .collect();
            let plan = parse(plan_value(
                paths
                    .iter()
                    .enumerate()
                    .map(|(i, p)| item(&root, p, &i.to_string()))
                    .collect(),
            ));
            let mut journal = FailLineJournal::new(fail_at, flush_fails);
            let observer = Observer::new();
            let report = execute(
                &plan,
                &NoGuard,
                &mut journal,
                &StopFlag::default(),
                &observer,
                SystemTime::now() + Duration::from_secs(2),
            )
            .expect("CLEAN_W12_JOURNAL: execute lost completed actions");
            let deleted = fail_at / 2;
            assert_eq!(
                report.status,
                RunStatus::Stopped,
                "CLEAN_W12_JOURNAL: stopped"
            );
            assert_eq!(
                report.journal_error.as_deref(),
                Some("journal write failed"),
                "CLEAN_W12_JOURNAL: error text"
            );
            assert_eq!(report.items.len(), count, "CLEAN_W12_JOURNAL: all outcomes");
            assert_eq!(
                report.freed_bytes,
                (deleted * 3).to_string(),
                "CLEAN_W12_JOURNAL: actual total"
            );
            assert_eq!(
                journal.writes, fail_at,
                "CLEAN_W12_JOURNAL: journal retried after failure"
            );
            assert_eq!(report.volumes.len(), 1, "CLEAN_W12_JOURNAL: acted volume");
            assert_eq!(
                report.volumes[0].root,
                s(&root)[..3].to_ascii_uppercase(),
                "CLEAN_W12_JOURNAL: volume root"
            );
            assert!(
                report.volumes[0].free_before.parse::<u64>().is_ok()
                    && report.volumes[0].free_after.parse::<u64>().is_ok(),
                "CLEAN_W12_JOURNAL: volume measurements"
            );
            for (i, (path, result)) in paths.iter().zip(&report.items).enumerate() {
                assert_eq!(
                    result.item_id,
                    i.to_string(),
                    "CLEAN_W12_JOURNAL: item order"
                );
                assert_eq!(
                    result.status,
                    if i < deleted {
                        ItemStatus::Deleted
                    } else {
                        ItemStatus::Skipped
                    },
                    "CLEAN_W12_JOURNAL: item status"
                );
                assert_eq!(
                    result.skip_reason,
                    if i < deleted {
                        None
                    } else {
                        Some(SkipReason::JournalFailed)
                    },
                    "CLEAN_W12_JOURNAL: item reason"
                );
                assert_eq!(
                    result.bytes_freed,
                    if i < deleted { "3" } else { "0" },
                    "CLEAN_W12_JOURNAL: item bytes"
                );
                assert_eq!(
                    path.exists(),
                    i >= deleted,
                    "CLEAN_W12_JOURNAL: source existence"
                );
                if i >= deleted {
                    assert_eq!(
                        fs::read(path).ok().as_deref(),
                        Some(b"abc".as_slice()),
                        "CLEAN_W12_JOURNAL: later bytes"
                    );
                    assert_eq!(
                        identity_of(&s(path)).ok().as_ref(),
                        Some(&plan.items[i].identity),
                        "CLEAN_W12_JOURNAL: later identity"
                    );
                }
            }
            assert_eq!(
                observer.0.lock().unwrap().len(),
                count,
                "CLEAN_W12_JOURNAL: progress count"
            );
        }
    }

    // Zero reclaimed bytes still count as an action: an empty directory or an
    // externally hard-linked child can be removed before a journal failure.
    for partial in [false, true] {
        let f = Fixture::new();
        let root = f.dir("root");
        let source = f.dir("root/source");
        let next = f.file("root/next", b"keep");
        let mut held = None;
        let outside = f.base.join("outside-link");
        if partial {
            let link = f.file("root/source/link", b"linked");
            fs::hard_link(&link, &outside).unwrap();
            let locked = f.file("root/source/locked", b"locked");
            held = Some(
                OpenOptions::new()
                    .read(true)
                    .share_mode(0)
                    .open(&locked)
                    .unwrap(),
            );
        }
        let plan = parse(plan_value(vec![
            item(&root, &source, "source"),
            item(&root, &next, "next"),
        ]));
        let report = execute(
            &plan,
            &NoGuard,
            &mut FailLineJournal::new(2, true),
            &StopFlag::default(),
            &Observer::new(),
            SystemTime::now() + Duration::from_secs(2),
        )
        .expect("CLEAN_W12_JOURNAL: zero-byte action report lost");
        assert_eq!(
            report.status,
            RunStatus::Stopped,
            "CLEAN_W12_JOURNAL: zero-byte stopped"
        );
        assert_eq!(
            report.journal_error.as_deref(),
            Some("journal write failed"),
            "CLEAN_W12_JOURNAL: zero-byte error"
        );
        assert_eq!(
            report.freed_bytes, "0",
            "CLEAN_W12_JOURNAL: zero-byte total"
        );
        assert_eq!(
            report.items[0].status,
            if partial {
                ItemStatus::Partial
            } else {
                ItemStatus::Deleted
            },
            "CLEAN_W12_JOURNAL: zero-byte actual result"
        );
        assert_eq!(
            report.items[1].skip_reason,
            Some(SkipReason::JournalFailed),
            "CLEAN_W12_JOURNAL: zero-byte later reason"
        );
        assert_eq!(
            fs::read(&next).ok().as_deref(),
            Some(b"keep".as_slice()),
            "CLEAN_W12_JOURNAL: zero-byte later source"
        );
        if partial {
            assert_eq!(
                fs::read(&outside).ok().as_deref(),
                Some(b"linked".as_slice()),
                "CLEAN_W12_JOURNAL: outside hard link changed"
            );
            assert!(
                !source.join("link").exists() && source.join("locked").exists(),
                "CLEAN_W12_JOURNAL: partial residual"
            );
            assert!(
                report.items[0].failed_entries >= 1,
                "CLEAN_W12_JOURNAL: partial failures lost"
            );
        } else {
            assert!(
                !source.exists(),
                "CLEAN_W12_JOURNAL: empty directory not deleted"
            );
        }
        drop(held);
    }
    // A logged skip is not an action. A later failed intent must still return Err.
    let untouched = Fixture::new();
    let untouched_root = untouched.dir("root");
    let a = untouched.file("root/a", b"keep");
    let b = untouched.file("root/b", b"keep");
    let mut plan = parse(plan_value(vec![
        item(&untouched_root, &a, "a"),
        item(&untouched_root, &b, "b"),
    ]));
    plan.items[0].min_age_hours = 1;
    let result = execute(
        &plan,
        &NoGuard,
        &mut FailLineJournal::new(3, false),
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    );
    assert!(
        matches!(result, Err(CleanError::Journal)),
        "CLEAN_W12_JOURNAL_FIRST: a skipped item is not an action: {result:?}"
    );
    assert_eq!(
        fs::read(&a).ok().as_deref(),
        Some(b"keep".as_slice()),
        "CLEAN_W12_JOURNAL_FIRST: skipped source changed"
    );
    assert_eq!(
        fs::read(&b).ok().as_deref(),
        Some(b"keep".as_slice()),
        "CLEAN_W12_JOURNAL_FIRST: unlogged source changed"
    );

    // Stop after an actual child deletion, using a separate bounded observer of this fixture.
    let many = fixture.dir("root/many");
    for i in 0..512 {
        fixture.file(&format!("root/many/{i:04}"), b"x");
    }
    let first = many.join("0000");
    let stop = StopFlag::default();
    let finished = AtomicBool::new(false);
    let plan = parse(plan_value(vec![
        item(&root, &many, "mid-item"),
        item(&root, &next, "remaining"),
    ]));
    let report = std::thread::scope(|scope| {
        let stop_ref = &stop;
        let finished_ref = &finished;
        let watcher = scope.spawn(move || {
            let started = Instant::now();
            while first.exists()
                && !finished_ref.load(Ordering::SeqCst)
                && started.elapsed() < Duration::from_secs(5)
            {
                std::thread::yield_now();
            }
            stop_ref.stop();
        });
        let r = execute(
            &plan,
            &NoGuard,
            &mut Vec::new(),
            &stop,
            &Observer::new(),
            SystemTime::now(),
        )
        .unwrap();
        finished.store(true, Ordering::SeqCst);
        watcher.join().unwrap();
        r
    });
    assert_eq!(report.items[0].status, ItemStatus::Partial);
    assert!(size(&many) > 0 && size(&many) < 512);
    assert_eq!(
        report.items[0].bytes_freed.parse::<u64>().unwrap(),
        512 - size(&many)
    );
    assert_eq!(report.items[1].skip_reason, Some(SkipReason::Cancelled));
    assert_eq!(report.items[1].bytes_freed, "0");
    assert_eq!(report.status, RunStatus::Stopped);
    assert!(next.exists());
}

#[test]
fn clean_report_volume() {
    let fixture = Fixture::new();
    let root = fixture.dir("root");
    let a = fixture.file("root/a", b"1234567");
    let b = fixture.dir("root/b");
    fixture.file("root/b/one", b"12345");
    fixture.file("root/b/two", b"123");
    let empty = fixture.dir("root/empty");
    let plan = parse(plan_value(vec![
        item(&root, &a, "a"),
        item(&root, &b, "b"),
        item(&root, &empty, "empty"),
    ]));
    let before = size(&root);
    let observer = Observer::new();
    let mut journal = Vec::new();
    let now = SystemTime::now();
    let report = execute(
        &plan,
        &NoGuard,
        &mut journal,
        &StopFlag::default(),
        &observer,
        now,
    )
    .unwrap();
    let freed: u64 = report
        .items
        .iter()
        .map(|i| i.bytes_freed.parse::<u64>().unwrap())
        .sum();
    assert_eq!(freed, before - size(&root));
    assert_eq!(report.freed_bytes, freed.to_string());
    assert_eq!(report.estimate_bytes, "15");
    assert_eq!(freed, 15);
    assert!(report.items.iter().all(|i| i.status == ItemStatus::Deleted
        && i.skip_reason.is_none()
        && i.failed_entries == 0));
    assert_eq!(report.status, RunStatus::Completed);
    let disk = s(&root)[..3].to_ascii_uppercase();
    assert_eq!(report.volumes.len(), 1);
    assert_eq!(report.volumes[0].root, disk);
    assert!(report.volumes[0].free_before.parse::<u64>().unwrap() > 0);
    assert!(report.volumes[0].free_after.parse::<u64>().unwrap() > 0);
    assert!(volume_free_bytes(&disk).unwrap() > 0);
    assert_eq!(
        *observer.0.lock().unwrap(),
        vec![
            (1, 3, 7, "a".into()),
            (2, 3, 15, "b".into()),
            (3, 3, 15, "empty".into())
        ]
    );
    let value: Value = serde_json::from_str(&report_to_json(&report)).unwrap();
    keys(
        &value,
        &[
            "report_version",
            "plan_id",
            "started_at",
            "ended_at",
            "status",
            "freed_bytes",
            "estimate_bytes",
            "volumes",
            "items",
        ],
    );
    assert_eq!(value["report_version"], "water.clean-report.v1");
    assert_eq!(value["plan_id"], "fixture-plan");
    for key in ["started_at", "ended_at"] {
        let text = value[key].as_str().unwrap();
        assert_eq!(text.len(), 20);
        assert!(text.ends_with('Z'));
        let mut time_plan = plan_value(vec![]);
        time_plan["created_at"] = json!(text);
        parse(time_plan);
    }
    for item in value["items"].as_array().unwrap() {
        keys(
            item,
            &[
                "item_id",
                "status",
                "skip_reason",
                "bytes_before",
                "bytes_freed",
                "failed_entries",
            ],
        );
        assert!(item["bytes_before"].is_string() && item["bytes_freed"].is_string());
        assert!(item["failed_entries"].is_u64());
    }
    for volume in value["volumes"].as_array().unwrap() {
        keys(volume, &["root", "free_before", "free_after"]);
        assert!(volume["free_before"].is_string() && volume["free_after"].is_string());
    }
    let lines: Vec<Value> = String::from_utf8(journal)
        .unwrap()
        .lines()
        .map(|l| serde_json::from_str(l).unwrap())
        .collect();
    for pair in lines.chunks_exact(2) {
        keys(
            &pair[0],
            &[
                "journal_version",
                "event",
                "plan_id",
                "item_id",
                "path",
                "at",
            ],
        );
        keys(
            &pair[1],
            &[
                "event",
                "item_id",
                "status",
                "skip_reason",
                "bytes_freed",
                "at",
            ],
        );
        assert_eq!(pair[0]["journal_version"], "water.clean-journal.v1");
        assert_eq!(pair[0]["event"], "intent");
        assert_eq!(pair[1]["event"], "result");
        assert_eq!(pair[0]["item_id"], pair[1]["item_id"]);
    }
    // A stop signal after every item has been handled still reports a completed run.
    struct LateStop(StopFlag);
    impl CleanObserver for LateStop {
        fn on_item(&self, done: usize, total: usize, _: u64, _: &str) {
            if done == total {
                self.0.stop();
            }
        }
    }
    let late = fixture.file("root/late", b"late");
    let stop = StopFlag::default();
    let report = execute(
        &parse(plan_value(vec![item(&root, &late, "late")])),
        &NoGuard,
        &mut Vec::new(),
        &stop,
        &LateStop(stop.clone()),
        SystemTime::now(),
    )
    .unwrap();
    assert!(stop.is_stopped() && !late.exists());
    assert_eq!(report.status, RunStatus::Completed);
    assert_eq!(report.items[0].status, ItemStatus::Deleted);
    assert_eq!(report.freed_bytes, "4");
    let empty = run(&parse(plan_value(vec![])));
    assert_eq!(empty.freed_bytes, "0");
    assert!(empty.volumes.is_empty());

    // CLEAN_FREED_EXACT: a hard-linked file inside the item is deleted by name but not counted,
    // because another name in the same fixture still holds the data. Other regular files sum
    // exactly to bytes_freed.
    let eroot = fixture.dir("exact/root");
    let eitem = fixture.dir("exact/root/item");
    let linked = fixture.file("exact/root/item/linked", b"hardlink-payload");
    fixture.file("exact/root/item/a", b"aa");
    fixture.file("exact/root/item/bb", b"bbbb");
    let outside = fixture.base.join("exact\\outside-hardlink");
    fs::hard_link(&linked, &outside).unwrap();
    let outside_bytes = fs::read(&outside).unwrap();
    let report = run(&parse(plan_value(vec![item(&eroot, &eitem, "exact")])));
    assert_eq!(
        report.items[0].bytes_freed, "6",
        "CLEAN_FREED_EXACT: hard-linked file was counted or other sizes were wrong"
    );
    assert_eq!(
        fs::read(&outside).ok().as_deref(),
        Some(outside_bytes.as_slice()),
        "CLEAN_FREED_EXACT: outside hard link was changed"
    );
    assert!(
        fs::symlink_metadata(&outside).is_ok(),
        "CLEAN_FREED_EXACT: outside hard link was removed"
    );
}
fn keys(value: &Value, expected: &[&str]) {
    let mut actual: Vec<&str> = value
        .as_object()
        .unwrap()
        .keys()
        .map(String::as_str)
        .collect();
    actual.sort();
    let mut expected = expected.to_vec();
    expected.sort();
    assert_eq!(actual, expected);
}

#[test]
fn clean_handle_hardening() {
    let fixture = Fixture::new();

    // CLEAN_NO_FOLLOW: an item that only holds a junction has its link opened relative to the
    // parent handle with the "open reparse point" option and deleted by handle, never entering
    // the target. If the delete step followed the name-surrogate link instead, it would open the
    // target rather than the link and fail to remove it, so the item would not complete.
    let nfroot = fixture.dir("nf/root");
    let nfitem = fixture.dir("nf/root/item");
    let nfext = fixture.dir("nf/external");
    let nffile = fixture.file("nf/external/payload", b"do-not-touch");
    let nflink = nfitem.join("link");
    fixture.junction(&nflink, &nfext);
    let report = run(&parse(plan_value(vec![item(
        &nfroot,
        &nfitem,
        "no-follow",
    )])));
    assert!(
        nfext.is_dir() && fs::read(&nffile).ok().as_deref() == Some(b"do-not-touch".as_slice()),
        "CLEAN_NO_FOLLOW: the junction target was entered during deletion"
    );
    assert!(
        fs::symlink_metadata(&nflink).is_err(),
        "CLEAN_NO_FOLLOW: the junction link was not removed by handle"
    );
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_NO_FOLLOW: following the link instead of deleting it left the item incomplete"
    );

    // CLEAN_REPARSE_KIND (1): a custom, non-link reparse tag inside the item freezes the whole
    // item as `reparse`; nothing is deleted and every ordinary file survives intact.
    let rroot = fixture.dir("rp/root");
    let ritem = fixture.dir("rp/root/item");
    let rkeep = fixture.file("rp/root/item/keep", b"keepme");
    let weird = fixture.file("rp/root/item/weird", b"");
    set_custom_reparse(&weird);
    assert_ne!(
        fs::symlink_metadata(&weird).unwrap().file_attributes() & REPARSE,
        0,
        "CLEAN_REPARSE_KIND: fixture failed to stamp a custom reparse tag"
    );
    let report = run(&parse(plan_value(vec![item(
        &rroot,
        &ritem,
        "custom-reparse",
    )])));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Skipped,
        "CLEAN_REPARSE_KIND: a custom reparse tag was not treated as an unknown reparse point"
    );
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Reparse),
        "CLEAN_REPARSE_KIND: a custom reparse tag was not reported as reparse"
    );
    assert_eq!(
        report.freed_bytes, "0",
        "CLEAN_REPARSE_KIND: bytes were freed from an item holding a custom reparse point"
    );
    assert_eq!(
        fs::read(&rkeep).ok().as_deref(),
        Some(b"keepme".as_slice()),
        "CLEAN_REPARSE_KIND: a sibling file was lost next to a custom reparse point"
    );
    assert_ne!(
        fs::symlink_metadata(&weird).unwrap().file_attributes() & REPARSE,
        0,
        "CLEAN_REPARSE_KIND: the custom reparse point itself was removed"
    );

    // CLEAN_REPARSE_KIND (2): an item that only contains a junction removes the link alone,
    // leaves the external target intact, and still reports `deleted`.
    let jroot = fixture.dir("jonly/root");
    let jitem = fixture.dir("jonly/root/item");
    let jext = fixture.dir("jonly/external");
    let jextfile = fixture.file("jonly/external/data", b"external");
    let jlink = jitem.join("link");
    fixture.junction(&jlink, &jext);
    let report = run(&parse(plan_value(vec![item(
        &jroot,
        &jitem,
        "junction-only",
    )])));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_REPARSE_KIND: a junction-only item did not complete"
    );
    assert!(
        fs::symlink_metadata(&jlink).is_err(),
        "CLEAN_REPARSE_KIND: the junction link was not removed"
    );
    assert!(
        jext.is_dir() && fs::read(&jextfile).ok().as_deref() == Some(b"external".as_slice()),
        "CLEAN_REPARSE_KIND: the junction target was traversed or deleted"
    );
    assert!(
        fs::symlink_metadata(&jitem).is_err(),
        "CLEAN_REPARSE_KIND: the junction-only item directory survived"
    );

    // CLEAN_GUARD_ID (1): a protected path spelled through a junction alias misses the text
    // test but matches by identity, freezing the whole item as `protected_overlap`.
    let groot = fixture.dir("gid/root");
    let target = fixture.dir("gid/root/target");
    let keep = fixture.file("gid/root/target/keep", b"protected-keep");
    let alias = groot.join("alias");
    fixture.junction(&alias, &target);
    let mut value = plan_value(vec![item(&groot, &target, "aliased-protected")]);
    value["protected_paths"] = json!([s(&alias.join("keep"))]);
    let report = run(&parse(value));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Skipped,
        "CLEAN_GUARD_ID: an aliased protected path was not enforced"
    );
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::ProtectedOverlap),
        "CLEAN_GUARD_ID: an aliased protected path did not match by identity"
    );
    assert_eq!(
        report.freed_bytes, "0",
        "CLEAN_GUARD_ID: bytes were freed despite an aliased protected path"
    );
    assert_eq!(
        fs::read(&keep).ok().as_deref(),
        Some(b"protected-keep".as_slice()),
        "CLEAN_GUARD_ID: a protected file was removed through an alias"
    );

    // CLEAN_GUARD_ID (2): a hard guard spelled through the same alias freezes the item as
    // `guarded`.
    let mut value = plan_value(vec![item(&groot, &target, "aliased-guarded")]);
    value["hard_guards"] = json!([s(&alias)]);
    let report = run(&parse(value));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Skipped,
        "CLEAN_GUARD_ID: an aliased hard guard was not enforced"
    );
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Guarded),
        "CLEAN_GUARD_ID: an aliased hard guard did not match by identity"
    );
    assert_eq!(
        fs::read(&keep).ok().as_deref(),
        Some(b"protected-keep".as_slice()),
        "CLEAN_GUARD_ID: a guarded item was removed through an alias"
    );

    // CLEAN_LONG_PATH: files and directories whose full path exceeds 300 characters are
    // deleted through handle-relative opens; the item completes as `deleted`.
    let lroot = fixture.dir("lp/root");
    let litem = fixture.dir("lp/root/item");
    let seg = "a".repeat(60);
    let deep = format!("lp/root/item/{seg}/{seg}/{seg}/{seg}");
    let leaf = fixture.file(&format!("{deep}/leaf"), b"deep-data");
    assert!(
        leaf.as_os_str().len() > 300,
        "CLEAN_LONG_PATH: the fixture path was not long enough"
    );
    let report = run(&parse(plan_value(vec![item(&lroot, &litem, "long-path")])));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_LONG_PATH: a >300-character subtree was not fully deleted"
    );
    assert_eq!(
        report.items[0].failed_entries, 0,
        "CLEAN_LONG_PATH: entries failed inside a long path"
    );
    assert!(
        fs::symlink_metadata(&leaf).is_err() && fs::symlink_metadata(&litem).is_err(),
        "CLEAN_LONG_PATH: a long-path entry survived deletion"
    );

    // CLEAN_READONLY: a read-only file is deleted without first clearing its attribute. A hard
    // link outside the item lets us read the surviving file record afterwards.
    let oroot = fixture.dir("ro/root");
    let oitem = fixture.dir("ro/root/item");
    let rofile = fixture.file("ro/root/item/readonly", b"read-only-data");
    let outside = fixture.base.join("ro\\outside-link");
    fs::hard_link(&rofile, &outside).unwrap();
    let mut permissions = fs::metadata(&rofile).unwrap().permissions();
    permissions.set_readonly(true);
    fs::set_permissions(&rofile, permissions).unwrap();
    let report = run(&parse(plan_value(vec![item(&oroot, &oitem, "readonly")])));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_READONLY: a read-only file was not deleted"
    );
    assert!(
        fs::symlink_metadata(&rofile).is_err() && fs::symlink_metadata(&oitem).is_err(),
        "CLEAN_READONLY: the read-only entry survived"
    );
    assert!(
        fs::symlink_metadata(&outside)
            .unwrap()
            .permissions()
            .readonly(),
        "CLEAN_READONLY: the read-only attribute was cleared before deletion"
    );
    assert_eq!(
        fs::read(&outside).ok().as_deref(),
        Some(b"read-only-data".as_slice()),
        "CLEAN_READONLY: the file record was damaged"
    );

    // CLEAN_GUARD_ID (3): a protected path spelled through a junction alias that resolves to an
    // ANCESTOR of the item (its parent directory). The alias name does not textually overlap the
    // item path, so from_json accepts it, yet by identity the resolved target is an ancestor of
    // the item, so the whole item must freeze as `protected_overlap` and nothing may be removed.
    let aroot = fixture.dir("gidanc/root");
    let aparent = fixture.dir("gidanc/root/parent");
    let aitem = fixture.dir("gidanc/root/parent/item");
    let avictim = fixture.file("gidanc/root/parent/item/keep", b"ancestor-keep");
    let aalias = aroot.join("alias");
    fixture.junction(&aalias, &aparent);
    let mut value = plan_value(vec![item(&aroot, &aitem, "ancestor-aliased-protected")]);
    value["protected_paths"] = json!([s(&aalias)]);
    let report = run(&parse(value));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Skipped,
        "CLEAN_GUARD_ID: an ancestor protected path reached through an alias was not enforced"
    );
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::ProtectedOverlap),
        "CLEAN_GUARD_ID: an ancestor protected alias did not match the item by identity"
    );
    assert_eq!(
        report.freed_bytes, "0",
        "CLEAN_GUARD_ID: bytes were freed despite an ancestor protected alias"
    );
    assert_eq!(
        fs::read(&avictim).ok().as_deref(),
        Some(b"ancestor-keep".as_slice()),
        "CLEAN_GUARD_ID: a file was removed under an ancestor protected alias"
    );
    assert!(
        fs::symlink_metadata(&aitem).is_ok(),
        "CLEAN_GUARD_ID: the item under an ancestor protected alias was removed"
    );

    // CLEAN_LONG_PATH (2): the item's OWN directory path exceeds 300 characters (built from
    // multiple sub-255 segments). It is opened and deleted entirely through handle-relative opens
    // and reports `deleted`, while a sibling that lives outside the item is left untouched.
    let lroot2 = fixture.dir("lpown/root");
    let sibling = fixture.file("lpown/root/sibling", b"sibling-data");
    let seg2 = "b".repeat(60);
    let itemrel = format!("lpown/root/{seg2}/{seg2}/{seg2}/{seg2}/item");
    let litem2 = fixture.dir(&itemrel);
    let lleaf = fixture.file(&format!("{itemrel}/leaf"), b"own-deep");
    assert!(
        litem2.as_os_str().len() > 300,
        "CLEAN_LONG_PATH: the item's own path was not long enough"
    );
    let report = run(&parse(plan_value(vec![item(
        &lroot2,
        &litem2,
        "long-own-path",
    )])));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_LONG_PATH: an item whose own path exceeds 300 characters was not deleted"
    );
    assert_eq!(
        report.items[0].failed_entries, 0,
        "CLEAN_LONG_PATH: entries failed inside an item with a >300-character own path"
    );
    assert!(
        fs::symlink_metadata(&lleaf).is_err() && fs::symlink_metadata(&litem2).is_err(),
        "CLEAN_LONG_PATH: a long own-path item survived deletion"
    );
    assert_eq!(
        fs::read(&sibling).ok().as_deref(),
        Some(b"sibling-data".as_slice()),
        "CLEAN_LONG_PATH: a sibling outside the long-path item was removed"
    );

    // CLEAN_REPARSE_KIND (3): a custom, non-link reparse tag on an EMPTY directory nested a second
    // level below the item (item/sub/leaf) freezes the whole item as `reparse`; nothing under the
    // item is deleted, including the ordinary sibling file next to the nested reparse directory.
    let kroot = fixture.dir("rpnest/root");
    let kitem = fixture.dir("rpnest/root/item");
    let ksub = fixture.dir("rpnest/root/item/sub");
    let kkeep = fixture.file("rpnest/root/item/sub/keep", b"nested-keep");
    let kleaf = fixture.dir("rpnest/root/item/sub/leaf");
    set_custom_reparse(&kleaf);
    assert_ne!(
        fs::symlink_metadata(&kleaf).unwrap().file_attributes() & REPARSE,
        0,
        "CLEAN_REPARSE_KIND: fixture failed to stamp a custom reparse tag on a nested directory"
    );
    let report = run(&parse(plan_value(vec![item(
        &kroot,
        &kitem,
        "nested-custom-reparse",
    )])));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Skipped,
        "CLEAN_REPARSE_KIND: a second-level custom reparse directory was not treated as unknown"
    );
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Reparse),
        "CLEAN_REPARSE_KIND: a second-level custom reparse directory was not reported as reparse"
    );
    assert_eq!(
        report.freed_bytes, "0",
        "CLEAN_REPARSE_KIND: bytes were freed from an item holding a nested custom reparse point"
    );
    assert_eq!(
        fs::read(&kkeep).ok().as_deref(),
        Some(b"nested-keep".as_slice()),
        "CLEAN_REPARSE_KIND: a file beside a nested custom reparse point was lost"
    );
    assert!(
        fs::symlink_metadata(&kleaf).is_ok() && fs::symlink_metadata(&ksub).is_ok(),
        "CLEAN_REPARSE_KIND: a nested custom reparse directory or its parent was removed"
    );

    // CLEAN_DEEP_TREE: a 4000-deep directory chain, each level named `d`, with a file at the
    // bottom, created through the \\?\ prefix. Cleaning on a 256 KiB stack must finish.
    const DEEP: usize = 4000;
    let droot = fixture.dir("deep/root");
    let ditem = fixture.dir("deep/root/item");
    let mut cur = extended(&ditem);
    for _ in 0..DEEP {
        cur.push("d");
        fs::create_dir(&cur).expect("CLEAN_DEEP_TREE: create directory");
    }
    fs::write(cur.join("leaf"), b"deep").expect("CLEAN_DEEP_TREE: create leaf");
    let plan = parse(plan_value(vec![item(&droot, &ditem, "deep")]));
    let report = std::thread::Builder::new()
        .stack_size(256 * 1024)
        .spawn(move || run(&plan))
        .expect("CLEAN_DEEP_TREE: spawn")
        .join()
        .expect("CLEAN_DEEP_TREE: worker thread panicked");
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_DEEP_TREE: 4000-deep tree was not deleted"
    );
    assert!(
        fs::symlink_metadata(&ditem).is_err(),
        "CLEAN_DEEP_TREE: 4000-deep item survived"
    );

    // CLEAN_UNPAIRED_NAME: files whose names contain an unpaired surrogate must not be
    // silently skipped. Option A: do not open them, count each as a failure, leave them.
    // Two names have the same lossy spelling; the valid replacement-character spelling
    // must remain distinct and be cleaned normally.
    let uroot = fixture.dir("unpaired/root");
    let uitem = fixture.dir("unpaired/root/item");
    fixture.file("unpaired/root/item/ok", b"sibling");
    let unpaired = unpaired_child(&uitem, &[0xD800, u16::from(b'x')], b"bad-name");
    let unpaired2 = unpaired_child(&uitem, &[0xD801, u16::from(b'x')], b"also-bad");
    let valid = fixture.file("unpaired/root/item/\u{fffd}x", b"valid-name");
    let report = run(&parse(plan_value(vec![item(&uroot, &uitem, "unpaired")])));
    assert!(
        fs::symlink_metadata(&unpaired).is_ok() && fs::symlink_metadata(&unpaired2).is_ok(),
        "CLEAN_UNPAIRED_NAME: unpaired-name file was silently skipped or deleted"
    );
    assert!(
        report.items[0].failed_entries == 2,
        "CLEAN_UNPAIRED_NAME: unpaired-name file was not counted as a failure"
    );
    assert_ne!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_UNPAIRED_NAME: item with an unpaired-name file was reported deleted"
    );
    assert!(
        fs::symlink_metadata(&valid).is_err(),
        "CLEAN_UNPAIRED_NAME: valid name collided with an unpaired-name snapshot key"
    );

    // An invalid-name non-reparse directory cannot be snapshotted completely without raw
    // UTF-16 opens. Reject the whole item before deleting any sibling or descendant.
    let udroot = fixture.dir("unpaired-dir/root");
    let uditem = fixture.dir("unpaired-dir/root/item");
    let sibling = fixture.file("unpaired-dir/root/item/ok", b"keep-sibling");
    let unpaired_dir = extended(&uditem).join(OsString::from_wide(&[0xD800, u16::from(b'd')]));
    fs::create_dir(&unpaired_dir).expect("CLEAN_UNPAIRED_NAME: create unpaired-name directory");
    let child = unpaired_dir.join("inside");
    fs::write(&child, b"keep-child").expect("CLEAN_UNPAIRED_NAME: create directory child");
    let report = run(&parse(plan_value(vec![item(
        &udroot,
        &uditem,
        "unpaired-dir",
    )])));
    assert_eq!(
        report.items[0].status,
        ItemStatus::Skipped,
        "CLEAN_UNPAIRED_NAME: incomplete directory snapshot did not skip the whole item"
    );
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Changed),
        "CLEAN_UNPAIRED_NAME: incomplete directory snapshot did not report changed"
    );
    assert_eq!(
        report.items[0].bytes_freed, "0",
        "CLEAN_UNPAIRED_NAME: bytes freed from an item with an incomplete directory snapshot"
    );
    assert_eq!(
        fs::read(&sibling).ok().as_deref(),
        Some(b"keep-sibling".as_slice()),
        "CLEAN_UNPAIRED_NAME: sibling of an unpaired-name directory was modified"
    );
    assert!(
        fs::symlink_metadata(&unpaired_dir).is_ok_and(|m| m.is_dir()),
        "CLEAN_UNPAIRED_NAME: unpaired-name directory was removed"
    );
    assert_eq!(
        fs::read(&child).ok().as_deref(),
        Some(b"keep-child".as_slice()),
        "CLEAN_UNPAIRED_NAME: child of an unpaired-name directory was modified"
    );
}

fn unpaired_child(dir: &Path, name_units: &[u16], data: &[u8]) -> PathBuf {
    let mut wide: Vec<u16> = extended(dir).as_os_str().encode_wide().collect();
    if wide.last() == Some(&0) {
        wide.pop();
    }
    wide.push(u16::from(b'\\'));
    wide.extend(name_units);
    let path = PathBuf::from(OsString::from_wide(&wide));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .expect("CLEAN_UNPAIRED_NAME: create unpaired-name file");
    file.write_all(data).unwrap();
    path
}

fn set_custom_reparse(path: &Path) {
    // The only PowerShell the suite spawns: it compiles a tiny C# helper that calls
    // DeviceIoControl(FSCTL_SET_REPARSE_POINT) to stamp a custom, non-link reparse tag on a
    // fixture file. DeviceIoControl never appears in the crate source.
    let script = r#"
$ErrorActionPreference='Stop'
$code = @'
using System;
using System.Runtime.InteropServices;
public static class W4 {
  [DllImport("kernel32", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern IntPtr CreateFileW(string p, uint a, uint s, IntPtr sa, uint d, uint f, IntPtr t);
  [DllImport("kernel32", SetLastError=true)]
  public static extern bool DeviceIoControl(IntPtr h, uint c, byte[] i, uint isz, IntPtr o, uint osz, out uint r, IntPtr ov);
  [DllImport("kernel32", SetLastError=true)]
  public static extern bool CloseHandle(IntPtr h);
  public static void Set(string p) {
    IntPtr h = CreateFileW(p, 0x40000000u | 0x80u | 0x100u, 0u, IntPtr.Zero, 3u, 0x02000000u | 0x00200000u, IntPtr.Zero);
    if (h == new IntPtr(-1)) throw new Exception("open " + Marshal.GetLastWin32Error());
    try {
      byte[] b = new byte[28];
      BitConverter.GetBytes((uint)0x00007A57).CopyTo(b, 0);
      BitConverter.GetBytes((ushort)4).CopyTo(b, 4);
      BitConverter.GetBytes((ushort)0).CopyTo(b, 6);
      (new Guid("6f0e7a57-1c2d-4e5f-8a9b-0c1d2e3f4a5b")).ToByteArray().CopyTo(b, 8);
      BitConverter.GetBytes((uint)0x5A575A57).CopyTo(b, 24);
      uint ret;
      if (!DeviceIoControl(h, 0x000900A4u, b, (uint)b.Length, IntPtr.Zero, 0u, out ret, IntPtr.Zero))
        throw new Exception("ioctl " + Marshal.GetLastWin32Error());
    } finally { CloseHandle(h); }
  }
}
'@
Add-Type -TypeDefinition $code -Language CSharp
[W4]::Set($env:W4_TARGET)
"#;
    let utf16: Vec<u8> = script
        .encode_utf16()
        .flat_map(|u| u.to_le_bytes())
        .collect();
    let out = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            &b64(&utf16),
        ])
        .env("W4_TARGET", s(path))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "fixture custom reparse failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
}

// W10 fixtures have their own randomly-created owner directly under this tree's .local.
struct QFixture {
    parent: PathBuf,
    base: PathBuf,
}
impl QFixture {
    fn new(label: &str) -> Self {
        let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
        let tree = manifest.parent().unwrap().parent().unwrap();
        assert!(tree.join(".git").exists());
        let parent = tree.join(".local");
        assert_plain_ancestors(&parent);
        let nonce = RandomState::new().hash_one((SystemTime::now(), std::process::id()));
        let base = parent.join(format!(
            "w10-m4-{label}-{}-{nonce:016x}",
            std::process::id()
        ));
        fs::create_dir(&base).unwrap();
        Self { parent, base }
    }
    fn dir(&self, rel: &str) -> PathBuf {
        let path = self.base.join(rel.replace('/', "\\"));
        assert!(path.starts_with(&self.base));
        assert!(
            !Path::new(rel)
                .components()
                .any(|p| !matches!(p, std::path::Component::Normal(_)))
        );
        fs::create_dir_all(extended(&path)).unwrap();
        path
    }
    fn file(&self, rel: &str, data: &[u8]) -> PathBuf {
        let path = self.base.join(rel.replace('/', "\\"));
        assert!(path.starts_with(&self.base));
        assert!(
            !Path::new(rel)
                .components()
                .any(|p| !matches!(p, std::path::Component::Normal(_)))
        );
        fs::create_dir_all(extended(path.parent().unwrap())).unwrap();
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(extended(&path))
            .unwrap();
        file.write_all(data).unwrap();
        path
    }
    fn junction(&self, link: &Path, target: &Path) {
        assert!(link.starts_with(&self.base) && target.starts_with(&self.base));
        assert_plain_ancestors(link.parent().unwrap());
        assert_plain_ancestors(target);
        assert!(fs::symlink_metadata(link).is_err());
        let result = Command::new("cmd")
            .args(["/D", "/C", "mklink", "/J"])
            .arg(link)
            .arg(target)
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "CLEAN_M35_PURGE: fixture junction creation failed"
        );
    }
    fn root(&self) -> String {
        s(&self.base.join(".water-quarantine"))
    }
}
impl Drop for QFixture {
    fn drop(&mut self) {
        assert!(self.base.is_absolute());
        assert_eq!(self.base.parent(), Some(self.parent.as_path()));
        let name = self.base.file_name().unwrap().to_str().unwrap();
        assert!(name.starts_with("w10-m4-") && name.rsplit('-').next().unwrap().len() == 16);
        assert_plain_ancestors(&self.parent);
        assert_eq!(
            fs::canonicalize(&self.base).unwrap().parent(),
            Some(fs::canonicalize(&self.parent).unwrap().as_path())
        );
        remove_owned(&self.base, &self.base);
    }
}
fn qrun(plan: &CleanPlan, root: &str, id: &str) -> QuarantineReport {
    quarantine(
        plan,
        id,
        &QuarantineTarget {
            base: Some(root.into()),
        },
        &NoGuard,
        &mut Vec::new(),
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    )
    .unwrap()
}

fn overlapping_plans(root: &Path, parent: &Path, child: &Path, sibling: &Path) -> Vec<CleanPlan> {
    let mut plans = Vec::new();
    for same in [true, false] {
        for mixed_case in [false, true] {
            for reverse in [false, true] {
                let first = item(root, parent, "first");
                let mut second = item(root, if same { parent } else { child }, "second");
                if mixed_case {
                    second["path"] = json!(second["path"].as_str().unwrap().to_ascii_uppercase());
                }
                // The hyphenated sibling sorts between parent and child in a raw string
                // sort, so an adjacent-pair check without component boundaries is caught.
                let mut items = vec![first, item(root, sibling, "sibling"), second];
                if reverse {
                    items.reverse();
                }
                plans.push(
                    serde_json::from_value(plan_value(items))
                        .expect("CLEAN_W11_NESTED: construct public Rust plan"),
                );
            }
        }
    }
    plans
}
fn qrequest(path: &Path, moved: &MoveReport) -> RestoreRequest {
    RestoreRequest {
        rel: s(path)[3..].into(),
        identity: moved.identity.clone().unwrap(),
        to: None,
    }
}
#[derive(Default)]
struct QObserver(Mutex<Vec<(u64, u64)>>);
impl PurgeObserver for QObserver {
    fn on_progress(&self, entries: u64, bytes: u64) {
        self.0.lock().unwrap().push((entries, bytes));
    }
}
fn qpurge(dir: &str) -> PurgeReport {
    purge(
        dir,
        &mut Vec::new(),
        &StopFlag::default(),
        &QObserver::default(),
        SystemTime::now(),
    )
    .unwrap()
}

fn qroundtrip<T>(original: &T, serialized: String, marker: &str)
where
    T: serde::de::DeserializeOwned + PartialEq + std::fmt::Debug,
{
    let roundtrip: T = serde_json::from_str(&serialized).unwrap();
    assert_eq!(original, &roundtrip, "{marker}: report roundtrip");
    let value: Value = serde_json::from_str(&serialized).unwrap();
    let mut unknown = value.clone();
    unknown["unexpected"] = json!(true);
    assert!(
        serde_json::from_value::<T>(unknown).is_err(),
        "{marker}: unknown report field"
    );
    for key in ["items", "quarantines", "hard_entries"] {
        if value[key].as_array().is_some_and(|items| !items.is_empty()) {
            let mut nested = value.clone();
            nested[key][0]["unexpected"] = json!(true);
            assert!(
                serde_json::from_value::<T>(nested).is_err(),
                "{marker}: unknown nested field"
            );
        }
    }
}

struct QStopJournal {
    bytes: Vec<u8>,
    stop: StopFlag,
}
impl Write for QStopJournal {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        self.stop.stop();
        Ok(())
    }
}
struct QRejectJournal;
impl Write for QRejectJournal {
    fn write(&mut self, _: &[u8]) -> io::Result<usize> {
        Err(io::Error::other("synthetic journal failure"))
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[test]
fn quarantine_unlock_pair() {
    let f = QFixture::new("unlock");
    let root = f.dir("root");
    let protected = f.dir("root/protected");
    let cache = f.file("root/protected/cache", b"disposable");
    let sibling = f.file("root/protected/sibling", b"keep-sibling");
    let mut value = plan_value(vec![item(&root, &cache, "unlocked")]);
    value["protected_paths"] = json!([s(&protected)]);
    value["items"][0]["unlocked_paths"] = json!([s(&protected)]);
    let unrelated = f.dir("unrelated");
    let mut noncontaining = value.clone();
    noncontaining["protected_paths"] = json!([s(&unrelated)]);
    noncontaining["items"][0]["unlocked_paths"] = json!([s(&unrelated)]);
    assert!(
        matches!(
            CleanPlan::from_json(&noncontaining.to_string()),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_M35_UNLOCK: listed unlock need not contain item"
    );
    let ancestor_alias = f.base.join("ancestor-alias");
    f.junction(&ancestor_alias, &root);
    let mut independent = value.clone();
    independent["protected_paths"] = json!([s(&protected), s(&ancestor_alias)]);
    let blocked = run(&parse(independent));
    assert_eq!(
        blocked.items[0].skip_reason,
        Some(SkipReason::ProtectedOverlap),
        "CLEAN_M35_UNLOCK: unrelated protected ancestor identity unlocked"
    );
    assert_eq!(
        fs::read(&cache).unwrap(),
        b"disposable",
        "CLEAN_M35_UNLOCK: protected ancestor lost data"
    );
    for bad in [
        vec![s(&root)],
        vec![s(&cache)],
        vec![s(&protected); 5],
        vec!["relative".into()],
    ] {
        let mut invalid = value.clone();
        invalid["items"][0]["unlocked_paths"] = json!(bad);
        assert!(
            matches!(
                CleanPlan::from_json(&invalid.to_string()),
                Err(CleanError::InvalidPlan)
            ),
            "CLEAN_M35_UNLOCK: invalid unlock accepted"
        );
    }
    let mut invalid = value.clone();
    invalid["protected_paths"] = json!([]);
    assert!(
        matches!(
            CleanPlan::from_json(&invalid.to_string()),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_M35_UNLOCK: missing protected path accepted"
    );
    let mut brothers = value.clone();
    brothers["items"]
        .as_array_mut()
        .unwrap()
        .push(item(&root, &sibling, "sibling"));
    assert!(
        matches!(
            CleanPlan::from_json(&brothers.to_string()),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_M35_UNLOCK: sibling inherited another item's unlock"
    );
    let alias = f.base.join("alias");
    f.junction(&alias, &protected);
    let mut aliased = value.clone();
    aliased["protected_paths"] = json!([s(&protected), s(&alias)]);
    let plan =
        CleanPlan::from_json(&aliased.to_string()).expect("CLEAN_M35_UNLOCK: valid alias plan");
    let report = run(&plan);
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::ProtectedOverlap),
        "CLEAN_M35_UNLOCK: another protected alias was unlocked"
    );
    let elsewhere = f.dir("elsewhere");
    struct Retarget<'a> {
        fixture: &'a QFixture,
        link: PathBuf,
        target: PathBuf,
        done: std::cell::Cell<bool>,
    }
    impl ItemGuard for Retarget<'_> {
        fn in_use(&self, _: &PlanItem) -> Option<String> {
            if !self.done.replace(true) {
                fs::remove_dir(&self.link).unwrap();
                self.fixture.junction(&self.link, &self.target);
            }
            None
        }
    }
    let guard = Retarget {
        fixture: &f,
        link: alias.clone(),
        target: elsewhere,
        done: std::cell::Cell::new(false),
    };
    let captured = execute(
        &plan,
        &guard,
        &mut Vec::new(),
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    )
    .unwrap();
    assert_eq!(
        captured.items[0].skip_reason,
        Some(SkipReason::ProtectedOverlap),
        "CLEAN_M35_UNLOCK: retargeting lost the initial protected identity"
    );
    let mut guarded =
        CleanPlan::from_json(&value.to_string()).expect("CLEAN_M35_UNLOCK: valid unlock rejected");
    guarded.hard_guards.push(s(&protected));
    assert_eq!(
        run(&guarded).items[0].skip_reason,
        Some(SkipReason::Guarded),
        "CLEAN_M35_UNLOCK: hard guard was unlocked"
    );
    let mut inside = value.clone();
    inside["protected_paths"]
        .as_array_mut()
        .unwrap()
        .push(json!(s(&cache)));
    assert!(
        matches!(
            CleanPlan::from_json(&inside.to_string()),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_M35_UNLOCK: contained protection ignored"
    );
    let plan =
        CleanPlan::from_json(&value.to_string()).expect("CLEAN_M35_UNLOCK: valid unlock rejected");
    assert_eq!(
        plan.items[0].unlocked_paths,
        vec![s(&protected)],
        "CLEAN_M35_UNLOCK: unlock not deserialized"
    );
    let mut ancestor_guard = plan.clone();
    ancestor_guard.hard_guards.push(s(&root));
    let report = run(&ancestor_guard);
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_M35_UNLOCK: explicit unlock did not delete"
    );
    assert_eq!(
        fs::read(&sibling).unwrap(),
        b"keep-sibling",
        "CLEAN_M35_UNLOCK: sibling changed"
    );
}

#[test]
fn quarantine_move_contract() {
    for flush_fails in [false, true] {
        for (count, fail_at) in [(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (1, 2)] {
            let f = QFixture::new("w12-journal");
            let root = f.dir("root");
            let paths: Vec<_> = (0..count)
                .map(|i| f.file(&format!("root/{i}"), b"abc"))
                .collect();
            let plan = parse(plan_value(
                paths
                    .iter()
                    .enumerate()
                    .map(|(i, p)| item(&root, p, &i.to_string()))
                    .collect(),
            ));
            let mut journal = FailLineJournal::new(fail_at, flush_fails);
            let observer = Observer::new();
            let result = quarantine(
                &plan,
                "w12",
                &QuarantineTarget {
                    base: Some(f.root()),
                },
                &NoGuard,
                &mut journal,
                &StopFlag::default(),
                &observer,
                SystemTime::now() + Duration::from_secs(2),
            );
            if fail_at == 1 {
                assert!(
                    matches!(result, Err(CleanError::Journal)),
                    "CLEAN_W12_JOURNAL_FIRST: quarantine accepted first failure: {result:?}"
                );
                assert!(
                    !Path::new(&f.root()).exists(),
                    "CLEAN_W12_JOURNAL_FIRST: quarantine left skeleton"
                );
                assert!(
                    observer.0.lock().unwrap().is_empty(),
                    "CLEAN_W12_JOURNAL_FIRST: quarantine callback"
                );
                for (i, path) in paths.iter().enumerate() {
                    assert_eq!(
                        fs::read(path).ok().as_deref(),
                        Some(b"abc".as_slice()),
                        "CLEAN_W12_JOURNAL_FIRST: quarantine changed bytes"
                    );
                    assert_eq!(
                        identity_of(&s(path)).ok().as_ref(),
                        Some(&plan.items[i].identity),
                        "CLEAN_W12_JOURNAL_FIRST: quarantine changed identity"
                    );
                }
                continue;
            }
            let report = result.expect("CLEAN_W12_JOURNAL: quarantine lost completed actions");
            let moved = fail_at / 2;
            assert_eq!(
                report.status,
                RunStatus::Stopped,
                "CLEAN_W12_JOURNAL: quarantine stopped"
            );
            assert_eq!(
                report.journal_error.as_deref(),
                Some("journal write failed"),
                "CLEAN_W12_JOURNAL: quarantine error text"
            );
            assert_eq!(
                report.items.len(),
                count,
                "CLEAN_W12_JOURNAL: quarantine all outcomes"
            );
            assert_eq!(
                report.moved_bytes,
                (moved * 3).to_string(),
                "CLEAN_W12_JOURNAL: actual moved total"
            );
            assert_eq!(
                journal.writes, fail_at,
                "CLEAN_W12_JOURNAL: quarantine journal retried after failure"
            );
            for (i, (path, result)) in paths.iter().zip(&report.items).enumerate() {
                let destination = format!("{}\\w12\\{}", f.root(), &s(path)[3..]);
                assert_eq!(
                    result.item_id,
                    i.to_string(),
                    "CLEAN_W12_JOURNAL: quarantine item order"
                );
                assert_eq!(
                    result.status,
                    if i < moved {
                        MoveStatus::Moved
                    } else {
                        MoveStatus::Skipped
                    },
                    "CLEAN_W12_JOURNAL: quarantine item status"
                );
                assert_eq!(
                    result.skip_reason,
                    if i < moved {
                        None
                    } else {
                        Some(SkipReason::JournalFailed)
                    },
                    "CLEAN_W12_JOURNAL: quarantine item reason"
                );
                assert_eq!(
                    result.move_error, None,
                    "CLEAN_W12_JOURNAL: quarantine move error"
                );
                assert_eq!(
                    result.error_code, None,
                    "CLEAN_W12_JOURNAL: quarantine native error"
                );
                assert_eq!(
                    path.exists(),
                    i >= moved,
                    "CLEAN_W12_JOURNAL: quarantine source existence"
                );
                if i < moved {
                    assert_eq!(result.bytes, "3", "CLEAN_W12_JOURNAL: moved item bytes");
                    assert_eq!(
                        result.destination.as_deref(),
                        Some(destination.as_str()),
                        "CLEAN_W12_JOURNAL: destination retained"
                    );
                    assert_eq!(
                        result.identity.as_ref(),
                        Some(&plan.items[i].identity),
                        "CLEAN_W12_JOURNAL: moved identity retained"
                    );
                    assert_eq!(
                        fs::read(&destination).ok().as_deref(),
                        Some(b"abc".as_slice()),
                        "CLEAN_W12_JOURNAL: destination bytes"
                    );
                    assert_eq!(
                        identity_of(&destination).ok().as_ref(),
                        Some(&plan.items[i].identity),
                        "CLEAN_W12_JOURNAL: destination identity"
                    );
                } else {
                    assert_eq!(
                        result.destination, None,
                        "CLEAN_W12_JOURNAL: skipped destination"
                    );
                    assert_eq!(
                        result.identity, None,
                        "CLEAN_W12_JOURNAL: skipped move identity"
                    );
                    assert!(
                        !Path::new(&destination).exists(),
                        "CLEAN_W12_JOURNAL: later destination created"
                    );
                    assert_eq!(
                        fs::read(path).ok().as_deref(),
                        Some(b"abc".as_slice()),
                        "CLEAN_W12_JOURNAL: quarantine later bytes"
                    );
                    assert_eq!(
                        identity_of(&s(path)).ok().as_ref(),
                        Some(&plan.items[i].identity),
                        "CLEAN_W12_JOURNAL: quarantine later identity"
                    );
                }
            }
            assert_eq!(
                observer.0.lock().unwrap().len(),
                count,
                "CLEAN_W12_JOURNAL: quarantine progress count"
            );
            qroundtrip(
                &report,
                quarantine_report_to_json(&report),
                "CLEAN_W12_JOURNAL",
            );
        }
    }
    for fail_at in [2, 3] {
        let f = QFixture::new("w12-empty-move");
        let source = f.dir("root/empty");
        let next = f.file("root/next", b"keep");
        let plan = parse(plan_value(vec![
            item(&f.base, &source, "empty"),
            item(&f.base, &next, "next"),
        ]));
        let report = quarantine(
            &plan,
            "empty",
            &QuarantineTarget {
                base: Some(f.root()),
            },
            &NoGuard,
            &mut FailLineJournal::new(fail_at, true),
            &StopFlag::default(),
            &Observer::new(),
            SystemTime::now() + Duration::from_secs(2),
        )
        .expect("CLEAN_W12_JOURNAL: zero-byte move report lost");
        assert_eq!(
            report.status,
            RunStatus::Stopped,
            "CLEAN_W12_JOURNAL: zero-byte move stopped"
        );
        assert_eq!(
            report.journal_error.as_deref(),
            Some("journal write failed"),
            "CLEAN_W12_JOURNAL: zero-byte move error"
        );
        assert_eq!(
            report.moved_bytes, "0",
            "CLEAN_W12_JOURNAL: zero-byte moved total"
        );
        assert_eq!(
            report.items[0].status,
            MoveStatus::Moved,
            "CLEAN_W12_JOURNAL: zero-byte move result"
        );
        assert_eq!(
            report.items[0].identity.as_ref(),
            Some(&plan.items[0].identity),
            "CLEAN_W12_JOURNAL: zero-byte move identity"
        );
        assert!(
            !source.exists(),
            "CLEAN_W12_JOURNAL: zero-byte source remains"
        );
        assert_eq!(
            report.items[1].skip_reason,
            Some(SkipReason::JournalFailed),
            "CLEAN_W12_JOURNAL: zero-byte move later reason"
        );
        assert_eq!(
            fs::read(&next).ok().as_deref(),
            Some(b"keep".as_slice()),
            "CLEAN_W12_JOURNAL: zero-byte move later source"
        );
    }
    let f = QFixture::new("w12-no-move");
    let source = f.file("root/locked", b"keep");
    let plan = parse(plan_value(vec![item(&f.base, &source, "locked")]));
    let held = OpenOptions::new()
        .read(true)
        .share_mode(3)
        .open(&source)
        .unwrap();
    let result = quarantine(
        &plan,
        "locked",
        &QuarantineTarget {
            base: Some(f.root()),
        },
        &NoGuard,
        &mut FailLineJournal::new(2, true),
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    );
    assert!(
        matches!(result, Err(CleanError::Journal)),
        "CLEAN_W12_JOURNAL_FIRST: failed move is not an action: {result:?}"
    );
    assert_eq!(
        fs::read(&source).ok().as_deref(),
        Some(b"keep".as_slice()),
        "CLEAN_W12_JOURNAL_FIRST: failed move changed source"
    );
    assert!(
        !Path::new(&f.root()).exists(),
        "CLEAN_W12_JOURNAL_FIRST: failed move left skeleton"
    );
    drop(held);

    let renamed = QFixture::new("w11-move");
    for (index, name) in [".flick-quarantine", ".fLiCk-QuArAnTiNe"]
        .iter()
        .enumerate()
    {
        let source = renamed.file(&format!("root/file-{index}"), b"flick-move");
        let plan = parse(plan_value(vec![item(&renamed.base, &source, "flick")]));
        let root = s(&renamed.base.join(name));
        let report = quarantine(
            &plan,
            "new-name",
            &QuarantineTarget {
                base: Some(root.clone()),
            },
            &NoGuard,
            &mut Vec::new(),
            &StopFlag::default(),
            &Observer::new(),
            SystemTime::now() + Duration::from_secs(2),
        )
        .expect("CLEAN_W11_RENAME: new/mixed-case root rejected");
        assert_eq!(
            report.items[0].status,
            MoveStatus::Moved,
            "CLEAN_W11_RENAME: new root move failed"
        );
        assert_eq!(
            report.moved_bytes, "10",
            "CLEAN_W11_RENAME: move byte count"
        );
        assert_eq!(
            report.items[0].identity.as_ref(),
            Some(&plan.items[0].identity),
            "CLEAN_W11_RENAME: moved identity changed"
        );
        assert_eq!(
            report.items[0].destination,
            Some(format!("{root}\\new-name\\{}", &s(&source)[3..])),
            "CLEAN_W11_RENAME: new root destination"
        );
        assert!(!source.exists(), "CLEAN_W11_RENAME: source left after move");
    }
    for name in [".flick-quarantine", ".fLiCk-QuArAnTiNe"] {
        let guarded = renamed.file(&format!("{name}/old/keep"), b"guarded-flick");
        let plan = parse(plan_value(vec![item(
            &renamed.base,
            &guarded,
            "guarded-flick",
        )]));
        let mut log = Vec::new();
        let report = quarantine(
            &plan,
            "guarded",
            &QuarantineTarget {
                base: Some(renamed.root()),
            },
            &NoGuard,
            &mut log,
            &StopFlag::default(),
            &Observer::new(),
            SystemTime::now() + Duration::from_secs(2),
        )
        .expect("CLEAN_W11_RENAME: guard entry rejected plan");
        assert_eq!(
            report.items[0].status,
            MoveStatus::Skipped,
            "CLEAN_W11_RENAME: recursive source moved"
        );
        assert_eq!(
            report.items[0].skip_reason,
            Some(SkipReason::Guarded),
            "CLEAN_W11_RENAME: missing new-name guard"
        );
        assert_eq!(
            fs::read(&guarded).ok().as_deref(),
            Some(b"guarded-flick".as_slice()),
            "CLEAN_W11_RENAME: guarded bytes changed"
        );
        assert!(
            log.is_empty() && !Path::new(&renamed.root()).exists(),
            "CLEAN_W11_RENAME: guarded move wrote journal or created root"
        );
        fs::remove_file(&guarded).expect("CLEAN_W11_RENAME: fixture guard cleanup");
    }
    let overlap = QFixture::new("w11-nested-move");
    let parent = overlap.dir("root/cache");
    let child = overlap.file("root/cache/data", b"nested-must-stay");
    let near = overlap.file("root/cache-sibling", b"sibling-must-stay");
    for plan in overlapping_plans(&overlap.base, &parent, &child, &near) {
        let mut log = Vec::new();
        let observer = Observer::new();
        let result = quarantine(
            &plan,
            "nested",
            &QuarantineTarget {
                base: Some(overlap.root()),
            },
            &NoGuard,
            &mut log,
            &StopFlag::default(),
            &observer,
            SystemTime::now() + Duration::from_secs(2),
        );
        assert!(
            matches!(result, Err(CleanError::InvalidPlan)),
            "CLEAN_W11_NESTED: quarantine accepted overlapping paths: {result:?}"
        );
        assert!(
            log.is_empty()
                && observer.0.lock().unwrap().is_empty()
                && !Path::new(&overlap.root()).exists(),
            "CLEAN_W11_NESTED: quarantine performed side effects"
        );
        assert_eq!(
            fs::read(&child).ok().as_deref(),
            Some(b"nested-must-stay".as_slice()),
            "CLEAN_W11_NESTED: quarantine changed bytes"
        );
        assert_eq!(
            fs::read(&near).ok().as_deref(),
            Some(b"sibling-must-stay".as_slice()),
            "CLEAN_W11_NESTED: quarantine changed sibling bytes"
        );
    }
    let source = overlap.file("root/invalid-root", b"keep");
    let plan = parse(plan_value(vec![item(
        &overlap.base,
        &source,
        "invalid-root",
    )]));
    let invalid_root = s(&overlap.base.join(".other-quarantine"));
    let mut log = Vec::new();
    assert!(
        matches!(
            quarantine(
                &plan,
                "invalid",
                &QuarantineTarget {
                    base: Some(invalid_root.clone())
                },
                &NoGuard,
                &mut log,
                &StopFlag::default(),
                &Observer::new(),
                SystemTime::now()
            ),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_W11_RENAME: unrelated root name accepted"
    );
    assert!(
        log.is_empty() && !Path::new(&invalid_root).exists(),
        "CLEAN_W11_RENAME: invalid root side effects"
    );
    assert_eq!(
        fs::read(&source).ok().as_deref(),
        Some(b"keep".as_slice()),
        "CLEAN_W11_RENAME: invalid root changed bytes"
    );
    // Reject DOS devices before even creating the quarantine root.
    let devices = QFixture::new("device-ids");
    let source = devices.file("root/data", b"must-stay");
    let device_plan = parse(plan_value(vec![item(&devices.base, &source, "device")]));
    let mut names = vec!["CON".to_owned(), "PRN".into(), "AUX".into(), "NUL".into()];
    for prefix in ["COM", "LPT"] {
        for n in 1..=9 {
            names.push(format!("{prefix}{n}"));
        }
    }
    for name in names {
        for invalid in [
            name.clone(),
            name.to_ascii_lowercase(),
            format!("{name}.txt"),
            format!("{name}."),
        ] {
            let mut log = Vec::new();
            assert!(
                matches!(
                    quarantine(
                        &device_plan,
                        &invalid,
                        &QuarantineTarget {
                            base: Some(devices.root())
                        },
                        &NoGuard,
                        &mut log,
                        &StopFlag::default(),
                        &Observer::new(),
                        SystemTime::now()
                    ),
                    Err(CleanError::InvalidPlan)
                ),
                "CLEAN_M35_MOVE: device id accepted: {invalid}"
            );
            assert!(
                !Path::new(&devices.root()).exists() && log.is_empty(),
                "CLEAN_M35_MOVE: device rejection created directories or journal"
            );
            assert_eq!(
                fs::read(&source).unwrap(),
                b"must-stay",
                "CLEAN_M35_MOVE: device moved source"
            );
        }
    }
    let f = QFixture::new("move");
    let root = f.dir("root");
    let directory = f.dir("root/cache");
    f.file("root/cache/data", b"directory");
    let file = f.file("root/file", b"file");
    let plan = parse(plan_value(vec![
        item(&root, &directory, "dir"),
        item(&root, &file, "file"),
    ]));
    let mut journal = Vec::new();
    let observer = Observer::new();
    let report = quarantine(
        &plan,
        "20261105-100000",
        &QuarantineTarget {
            base: Some(f.root()),
        },
        &NoGuard,
        &mut journal,
        &StopFlag::default(),
        &observer,
        SystemTime::now() + Duration::from_secs(2),
    )
    .unwrap();
    assert_eq!(
        report.moved_bytes, "13",
        "CLEAN_M35_MOVE: moved bytes {report:?}"
    );
    qroundtrip(
        &report,
        quarantine_report_to_json(&report),
        "CLEAN_M35_MOVE",
    );
    assert!(
        !directory.exists() && !file.exists(),
        "CLEAN_M35_MOVE: source remains"
    );
    for (i, result) in report.items.iter().enumerate() {
        assert_eq!(
            result.status,
            MoveStatus::Moved,
            "CLEAN_M35_MOVE: item not moved {result:?}"
        );
        let destination = format!(
            "{}\\20261105-100000\\{}",
            f.root(),
            &plan.items[i].path[3..]
        );
        assert_eq!(
            result.destination.as_ref(),
            Some(&destination),
            "CLEAN_M35_MOVE: layout"
        );
        assert_eq!(
            result.identity,
            Some(plan.items[i].identity.clone()),
            "CLEAN_M35_MOVE: identity changed"
        );
        assert_eq!(
            identity_of(&destination).unwrap(),
            plan.items[i].identity,
            "CLEAN_M35_MOVE: on-disk identity"
        );
    }
    assert_eq!(
        observer.0.lock().unwrap().len(),
        2,
        "CLEAN_M35_MOVE: callbacks"
    );
    let lines: Vec<Value> = String::from_utf8(journal)
        .unwrap()
        .lines()
        .map(|l| serde_json::from_str(l).unwrap())
        .collect();
    assert_eq!(
        lines
            .iter()
            .map(|l| l["event"].as_str().unwrap())
            .collect::<Vec<_>>(),
        ["intent", "moved", "intent", "moved"],
        "CLEAN_M35_MOVE: journal order"
    );
    let source = f.file("root/collision", b"source");
    let plan = parse(plan_value(vec![item(&root, &source, "collision")]));
    let destination = PathBuf::from(format!("{}\\collision\\{}", f.root(), &s(&source)[3..]));
    fs::create_dir_all(destination.parent().unwrap()).unwrap();
    fs::write(&destination, b"existing").unwrap();
    let mut journal = Vec::new();
    let failed = quarantine(
        &plan,
        "collision",
        &QuarantineTarget {
            base: Some(f.root()),
        },
        &NoGuard,
        &mut journal,
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    )
    .unwrap();
    assert_eq!(
        failed.items[0].status,
        MoveStatus::Failed,
        "CLEAN_M35_MOVE: collision result shape"
    );
    assert_eq!(
        failed.items[0].move_error,
        Some(MoveError::DestinationExists),
        "CLEAN_M35_MOVE: collision reason"
    );
    assert_eq!(
        failed.items[0].error_code,
        Some(183),
        "CLEAN_M35_MOVE: NT collision code 183 mapping"
    );
    assert_eq!(
        fs::read(&source).unwrap(),
        b"source",
        "CLEAN_M35_MOVE: source lost"
    );
    assert_eq!(
        fs::read(&destination).unwrap(),
        b"existing",
        "CLEAN_M35_MOVE: destination changed"
    );
    assert!(
        String::from_utf8(journal)
            .unwrap()
            .contains("\"event\":\"failed\""),
        "CLEAN_M35_MOVE: missing failed log"
    );
    let locked = f.file("root/locked", b"locked");
    let lock = OpenOptions::new()
        .read(true)
        .share_mode(3)
        .open(&locked)
        .unwrap();
    let plan = parse(plan_value(vec![item(&root, &locked, "locked")]));
    assert_eq!(
        qrun(&plan, &f.root(), "locked").items[0].move_error,
        Some(MoveError::Locked),
        "CLEAN_M35_MOVE: no-delete-share lock"
    );
    drop(lock);
    struct Busy;
    impl ItemGuard for Busy {
        fn in_use(&self, _: &PlanItem) -> Option<String> {
            Some("fixture.exe".into())
        }
    }
    let busy = quarantine(
        &plan,
        "busy",
        &QuarantineTarget {
            base: Some(f.root()),
        },
        &Busy,
        &mut Vec::new(),
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now(),
    )
    .unwrap();
    assert_eq!(
        busy.items[0].skip_reason,
        Some(SkipReason::InUse),
        "CLEAN_M35_MOVE: guard"
    );
    let mut young = plan.clone();
    young.items[0].min_age_hours = 1;
    assert_eq!(
        qrun(&young, &f.root(), "young").items[0].skip_reason,
        Some(SkipReason::TooRecent),
        "CLEAN_M35_MOVE: age"
    );
    let mut changed = plan.clone();
    changed.items[0].identity = identity_of(&s(&root)).unwrap();
    assert_eq!(
        qrun(&changed, &f.root(), "changed").items[0].skip_reason,
        Some(SkipReason::Changed),
        "CLEAN_M35_MOVE: identity"
    );
    let guarded = f.file(".water-quarantine/old/data", b"already-quarantined");
    let plan = parse(plan_value(vec![item(&f.base, &guarded, "guarded")]));
    assert_eq!(
        qrun(&plan, &f.root(), "guarded").items[0].skip_reason,
        Some(SkipReason::Guarded),
        "CLEAN_M35_MOVE: recursive quarantine"
    );
    let stopped = StopFlag::default();
    stopped.stop();
    let report = quarantine(
        &plan,
        "stopped",
        &QuarantineTarget {
            base: Some(f.root()),
        },
        &NoGuard,
        &mut Vec::new(),
        &stopped,
        &Observer::new(),
        SystemTime::now(),
    )
    .unwrap();
    assert_eq!(
        report.status,
        RunStatus::Stopped,
        "CLEAN_M35_MOVE: stop state"
    );
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Cancelled),
        "CLEAN_M35_MOVE: stop reason"
    );
    for invalid in ["", "-bad", "bad_name", &"a".repeat(49)] {
        assert!(
            matches!(
                quarantine(
                    &plan,
                    invalid,
                    &QuarantineTarget {
                        base: Some(f.root())
                    },
                    &NoGuard,
                    &mut Vec::new(),
                    &StopFlag::default(),
                    &Observer::new(),
                    SystemTime::now()
                ),
                Err(CleanError::InvalidPlan)
            ),
            "CLEAN_M35_MOVE: invalid id"
        );
    }
    let other = QFixture::new("move-junction");
    let source = other.file("root/file", b"keep");
    let target = other.dir("outside");
    other.junction(&other.base.join(".water-quarantine"), &target);
    let plan = parse(plan_value(vec![item(&other.base, &source, "junction")]));
    assert_eq!(
        qrun(&plan, &other.root(), "junction").items[0].move_error,
        Some(MoveError::QuarantineUnavailable),
        "CLEAN_M35_MOVE: qroot junction"
    );
    assert_eq!(
        fs::read_dir(&target).unwrap().count(),
        0,
        "CLEAN_M35_MOVE: followed qroot junction"
    );
    let flush_stop = StopFlag::default();
    let mut stopping_journal = QStopJournal {
        bytes: Vec::new(),
        stop: flush_stop.clone(),
    };
    let source = f.file("root/flush-stop", b"keep");
    let stopping_plan = parse(plan_value(vec![item(&root, &source, "flush-stop")]));
    let report = quarantine(
        &stopping_plan,
        "flush-stop",
        &QuarantineTarget {
            base: Some(f.root()),
        },
        &NoGuard,
        &mut stopping_journal,
        &flush_stop,
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    )
    .unwrap();
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Cancelled),
        "CLEAN_M35_MOVE: journal-flush cancellation"
    );
    let events: Vec<Value> = String::from_utf8(stopping_journal.bytes)
        .unwrap()
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect();
    assert_eq!(
        events.len(),
        2,
        "CLEAN_M35_MOVE: intent missing terminal event"
    );
    assert_eq!(
        events[1]["event"], "failed",
        "CLEAN_M35_MOVE: cancellation terminal event"
    );
    assert_eq!(
        fs::read(&source).unwrap(),
        b"keep",
        "CLEAN_M35_MOVE: cancellation moved source"
    );
    assert!(
        matches!(
            quarantine(
                &stopping_plan,
                "bad-journal",
                &QuarantineTarget {
                    base: Some(f.root())
                },
                &NoGuard,
                &mut QRejectJournal,
                &StopFlag::default(),
                &Observer::new(),
                SystemTime::now() + Duration::from_secs(2)
            ),
            Err(CleanError::Journal)
        ),
        "CLEAN_M35_MOVE: journal failure ignored"
    );
    assert!(source.exists(), "CLEAN_M35_MOVE: moved before intent flush");
    assert!(
        !Path::new(&format!("{}\\flush-stop", f.root())).exists(),
        "CLEAN_M35_MOVE: skipped batch left newly created skeleton"
    );
    assert!(
        !Path::new(&format!("{}\\bad-journal", f.root())).exists(),
        "CLEAN_M35_MOVE: failed intent left newly created skeleton"
    );
    let temp = std::env::temp_dir();
    if s(&temp)[..2].eq_ignore_ascii_case(&s(&f.base)[..2]) {
        eprintln!("CLEAN_M35_CROSS_VOLUME n/a");
    } else {
        let base = temp.join(format!("water-w10-q-{}", std::process::id()));
        assert_plain_ancestors(&temp);
        assert!(!base.exists());
        fs::create_dir(&base).unwrap();
        let cross_root = base.join(".water-quarantine");
        let source = f.file("root/cross", b"never-copy");
        let plan = parse(plan_value(vec![item(&root, &source, "cross")]));
        let cross = qrun(&plan, &s(&cross_root), "cross");
        assert_eq!(
            cross.items[0].move_error,
            Some(MoveError::NotSameVolume),
            "CLEAN_M35_MOVE: cross-volume"
        );
        assert_eq!(
            fs::read(&source).unwrap(),
            b"never-copy",
            "CLEAN_M35_MOVE: cross-volume source"
        );
        assert_eq!(size(&base), 0, "CLEAN_M35_MOVE: cross-volume copied data");
        assert_eq!(base.parent(), Some(temp.as_path()));
        assert!(
            base.file_name()
                .unwrap()
                .to_str()
                .unwrap()
                .starts_with("water-w10-q-")
        );
        assert_plain_ancestors(&temp);
        remove_owned(&base, &base);
    }

    let extra = QFixture::new("move-gates");
    let extra_root = extra.dir("root");
    let tree = extra.dir("root/locked-dir");
    let leaf = extra.file("root/locked-dir/data", b"directory-lock");
    let plan = parse(plan_value(vec![item(&extra_root, &tree, "locked-dir")]));
    let held = OpenOptions::new()
        .read(true)
        .custom_flags(0x0200_0000)
        .share_mode(3)
        .open(&tree)
        .unwrap();
    let failed = qrun(&plan, &extra.root(), "locked-dir");
    assert_eq!(
        failed.items[0].move_error,
        Some(MoveError::Locked),
        "CLEAN_M35_MOVE: directory lock mapping"
    );
    assert_eq!(
        fs::read(&leaf).unwrap(),
        b"directory-lock",
        "CLEAN_M35_MOVE: directory lock changed source"
    );
    assert!(
        !Path::new(&extra.root()).exists(),
        "CLEAN_M35_MOVE: all failed left fresh quarantine skeleton"
    );
    drop(held);

    let containing = extra.dir("container");
    let inner_root = s(&containing.join(".water-quarantine"));
    let plan = parse(plan_value(vec![item(
        &extra.base,
        &containing,
        "contains-root",
    )]));
    assert_eq!(
        qrun(&plan, &inner_root, "guarded").items[0].skip_reason,
        Some(SkipReason::Guarded),
        "CLEAN_M35_MOVE: item containing quarantine root accepted"
    );
    assert!(
        !Path::new(&inner_root).exists(),
        "CLEAN_M35_MOVE: guarded item created quarantine root"
    );
    let second = QFixture::new("second-root");
    assert!(
        !move_checks::second_root(None, &extra.root()),
        "CLEAN_M35_MOVE: first root rejected"
    );
    assert!(
        !move_checks::second_root(Some(&extra.root()), &extra.root().to_ascii_uppercase()),
        "CLEAN_M35_MOVE: equivalent quarantine root rejected"
    );
    assert!(
        move_checks::second_root(Some(&extra.root()), &second.root()),
        "CLEAN_M35_MOVE: second quarantine root accepted"
    );

    let source = extra.file("root/replaced", b"original");
    let saved = extra.base.join("saved-original");
    let plan = parse(plan_value(vec![item(
        &extra_root,
        &source,
        "replace-at-intent",
    )]));
    struct ReplaceAtIntent {
        source: PathBuf,
        saved: PathBuf,
        done: bool,
    }
    impl Write for ReplaceAtIntent {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            Ok(bytes.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            if !self.done {
                self.done = true;
                fs::rename(&self.source, &self.saved)?;
                fs::write(&self.source, b"replacement")?;
            }
            Ok(())
        }
    }
    let report = quarantine(
        &plan,
        "replaced",
        &QuarantineTarget {
            base: Some(extra.root()),
        },
        &NoGuard,
        &mut ReplaceAtIntent {
            source: source.clone(),
            saved: saved.clone(),
            done: false,
        },
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    )
    .unwrap();
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Changed),
        "CLEAN_M35_MOVE: intent-time replacement moved"
    );
    let actual = identity_of(&s(&source)).unwrap();
    assert!(
        !move_checks::source_matches(Some(&actual), &plan.items[0].identity),
        "CLEAN_M35_MOVE: final source identity gate accepted replacement"
    );
    assert!(
        !move_checks::source_matches(None, &plan.items[0].identity),
        "CLEAN_M35_MOVE: final source identity gate accepted unreadable identity"
    );
    assert!(
        move_checks::source_matches(Some(&plan.items[0].identity), &plan.items[0].identity),
        "CLEAN_M35_MOVE: final source identity gate rejected expected identity"
    );
    assert_eq!(
        fs::read(&source).unwrap(),
        b"replacement",
        "CLEAN_M35_MOVE: replacement lost"
    );
    assert_eq!(
        fs::read(&saved).unwrap(),
        b"original",
        "CLEAN_M35_MOVE: original lost"
    );
    assert!(
        !Path::new(&extra.root()).exists(),
        "CLEAN_M35_MOVE: changed-only batch left skeleton"
    );

    struct GoneAtIntent {
        source: PathBuf,
        done: bool,
    }
    impl Write for GoneAtIntent {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            Ok(bytes.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            if !self.done {
                self.done = true;
                fs::remove_file(&self.source)?;
            }
            Ok(())
        }
    }
    let source = extra.file("root/gone-at-intent", b"gone");
    let plan = parse(plan_value(vec![item(
        &extra_root,
        &source,
        "gone-at-intent",
    )]));
    let report = quarantine(
        &plan,
        "gone",
        &QuarantineTarget {
            base: Some(extra.root()),
        },
        &NoGuard,
        &mut GoneAtIntent {
            source,
            done: false,
        },
        &StopFlag::default(),
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    )
    .unwrap();
    assert_eq!(
        report.items[0].status,
        MoveStatus::Skipped,
        "CLEAN_M35_MOVE: gone item failed"
    );
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Gone),
        "CLEAN_M35_MOVE: gone reason"
    );
    assert!(
        !Path::new(&extra.root()).exists(),
        "CLEAN_M35_MOVE: gone-only batch left skeleton"
    );

    let existing = extra.dir(".water-quarantine/existing");
    let source = extra.file("root/existing-stop", b"keep");
    let plan = parse(plan_value(vec![item(
        &extra_root,
        &source,
        "existing-stop",
    )]));
    let stop = StopFlag::default();
    let report = quarantine(
        &plan,
        "existing",
        &QuarantineTarget {
            base: Some(extra.root()),
        },
        &NoGuard,
        &mut QStopJournal {
            bytes: Vec::new(),
            stop: stop.clone(),
        },
        &stop,
        &Observer::new(),
        SystemTime::now() + Duration::from_secs(2),
    )
    .unwrap();
    assert_eq!(
        report.items[0].skip_reason,
        Some(SkipReason::Cancelled),
        "CLEAN_M35_MOVE: existing batch setup"
    );
    assert!(
        existing.exists() && fs::read_dir(&existing).unwrap().next().is_none(),
        "CLEAN_M35_MOVE: removed preexisting empty batch or retained new intermediate directories"
    );
}

#[test]
fn quarantine_restore_contract() {
    let renamed = QFixture::new("w11-restore");
    for (index, name) in [".flick-quarantine", ".FlIcK-QuArAnTiNe"]
        .iter()
        .enumerate()
    {
        let root = s(&renamed.base.join(name));
        let source = renamed.file(&format!("root/rebuild-{index}/data"), b"flick-restore");
        let plan = parse(plan_value(vec![item(
            &renamed.base,
            &source,
            "restore-flick",
        )]));
        let moved = quarantine(
            &plan,
            "restore",
            &QuarantineTarget {
                base: Some(root.clone()),
            },
            &NoGuard,
            &mut Vec::new(),
            &StopFlag::default(),
            &Observer::new(),
            SystemTime::now() + Duration::from_secs(2),
        )
        .expect("CLEAN_W11_RENAME: restore setup move");
        assert_eq!(
            moved.items[0].status,
            MoveStatus::Moved,
            "CLEAN_W11_RENAME: restore setup status"
        );
        fs::remove_dir(source.parent().unwrap())
            .expect("CLEAN_W11_RENAME: remove synthetic parent");
        let restored = restore(
            &format!("{root}\\restore"),
            &[qrequest(&source, &moved.items[0])],
            &StopFlag::default(),
            SystemTime::now(),
        )
        .expect("CLEAN_W11_RENAME: restore new root rejected");
        assert_eq!(
            restored.items[0].status,
            RestoreStatus::Restored,
            "CLEAN_W11_RENAME: restore new root failed"
        );
        assert_eq!(
            fs::read(&source).ok().as_deref(),
            Some(b"flick-restore".as_slice()),
            "CLEAN_W11_RENAME: restored bytes"
        );
        assert_eq!(
            identity_of(&s(&source)).ok(),
            Some(plan.items[0].identity.clone()),
            "CLEAN_W11_RENAME: restored identity"
        );
        assert!(
            restored.dir_removed && restored.root_removed && !Path::new(&root).exists(),
            "CLEAN_W11_RENAME: restore retained empty skeleton"
        );
    }
    assert!(
        matches!(
            restore(
                &s(&renamed.base.join(".other-quarantine\\id")),
                &[],
                &StopFlag::default(),
                SystemTime::now()
            ),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_W11_RENAME: restore accepted unrelated root"
    );
    let f = QFixture::new("restore");
    let root = f.dir("root");
    let source = f.file("root/parent/file", b"restore-exact-bytes");
    let mtime = fs::metadata(&source).unwrap().modified().unwrap();
    let plan = parse(plan_value(vec![item(&root, &source, "file")]));
    let moved = qrun(&plan, &f.root(), "restore");
    assert_eq!(
        moved.items[0].status,
        MoveStatus::Moved,
        "CLEAN_M35_RESTORE: setup {moved:?}"
    );
    let request = qrequest(&source, &moved.items[0]);
    let dir = format!("{}\\restore", f.root());
    fs::remove_dir(source.parent().unwrap()).unwrap();
    let report = restore(
        &dir,
        std::slice::from_ref(&request),
        &StopFlag::default(),
        SystemTime::now(),
    )
    .unwrap();
    assert_eq!(
        report.items[0].status,
        RestoreStatus::Restored,
        "CLEAN_M35_RESTORE: restore/rebuild parent {report:?}"
    );
    qroundtrip(
        &report,
        restore_report_to_json(&report),
        "CLEAN_M35_RESTORE",
    );
    assert_eq!(
        fs::read(&source).unwrap(),
        b"restore-exact-bytes",
        "CLEAN_M35_RESTORE: bytes"
    );
    assert_eq!(
        fs::metadata(&source).unwrap().modified().unwrap(),
        mtime,
        "CLEAN_M35_RESTORE: mtime"
    );
    assert!(
        report.dir_removed && report.root_removed,
        "CLEAN_M35_RESTORE: empty skeleton remains"
    );
    let moved = qrun(&plan, &f.root(), "collision");
    let dir = format!("{}\\collision", f.root());
    let request = qrequest(&source, &moved.items[0]);
    fs::write(&source, b"new-original").unwrap();
    let collision = restore(
        &dir,
        std::slice::from_ref(&request),
        &StopFlag::default(),
        SystemTime::now(),
    )
    .unwrap();
    assert_eq!(
        collision.items[0].reason,
        Some(RestoreError::DestinationExists),
        "CLEAN_M35_RESTORE: overwrite forbidden"
    );
    assert_eq!(
        collision.items[0].error_code,
        Some(183),
        "CLEAN_M35_RESTORE: NT collision code 183 mapping"
    );
    assert_eq!(
        fs::read(&source).unwrap(),
        b"new-original",
        "CLEAN_M35_RESTORE: overwrote new original"
    );
    assert_eq!(
        fs::read(moved.items[0].destination.as_ref().unwrap()).unwrap(),
        b"restore-exact-bytes",
        "CLEAN_M35_RESTORE: lost quarantine data"
    );
    let mut changed = request.clone();
    changed.identity = identity_of(&s(&root)).unwrap();
    assert_eq!(
        restore(&dir, &[changed], &StopFlag::default(), SystemTime::now())
            .unwrap()
            .items[0]
            .reason,
        Some(RestoreError::Changed),
        "CLEAN_M35_RESTORE: identity mismatch"
    );
    let beside = source.with_file_name("file（还原 1）");
    fs::write(&beside, b"beside-existing").unwrap();
    let mut request = request;
    request.to = Some(s(&beside));
    assert_eq!(
        restore(
            &dir,
            std::slice::from_ref(&request),
            &StopFlag::default(),
            SystemTime::now()
        )
        .unwrap()
        .items[0]
            .reason,
        Some(RestoreError::DestinationExists),
        "CLEAN_M35_RESTORE: beside overwrite"
    );
    fs::remove_file(&beside).unwrap();
    assert_eq!(
        restore(&dir, &[request], &StopFlag::default(), SystemTime::now())
            .unwrap()
            .items[0]
            .status,
        RestoreStatus::Restored,
        "CLEAN_M35_RESTORE: beside restore"
    );
    assert_eq!(
        fs::read(&beside).unwrap(),
        b"restore-exact-bytes",
        "CLEAN_M35_RESTORE: beside bytes"
    );
    let source = f.file("root/swapped/file", b"parent-link-safe");
    let plan = parse(plan_value(vec![item(&root, &source, "link")]));
    let moved = qrun(&plan, &f.root(), "parent-link");
    let request = qrequest(&source, &moved.items[0]);
    fs::remove_dir(source.parent().unwrap()).unwrap();
    let external = f.dir("outside");
    f.junction(source.parent().unwrap(), &external);
    let dir = format!("{}\\parent-link", f.root());
    assert_eq!(
        restore(&dir, &[request], &StopFlag::default(), SystemTime::now())
            .unwrap()
            .items[0]
            .reason,
        Some(RestoreError::ParentReparse),
        "CLEAN_M35_RESTORE: parent reparse"
    );
    assert_eq!(
        fs::read_dir(&external).unwrap().count(),
        0,
        "CLEAN_M35_RESTORE: followed parent"
    );
    let tree = f.dir("root/tree");
    let data = f.file("root/tree/data", b"whole-directory");
    let plan = parse(plan_value(vec![item(&root, &tree, "tree")]));
    let moved = qrun(&plan, &f.root(), "tree");
    let request = qrequest(&tree, &moved.items[0]);
    let dir = format!("{}\\tree", f.root());
    let stop = StopFlag::default();
    stop.stop();
    assert_eq!(
        restore(
            &dir,
            std::slice::from_ref(&request),
            &stop,
            SystemTime::now()
        )
        .unwrap()
        .items[0]
            .reason,
        Some(RestoreError::Cancelled),
        "CLEAN_M35_RESTORE: stop"
    );
    assert!(
        !tree.exists(),
        "CLEAN_M35_RESTORE: stopped restore moved data"
    );
    let restored = restore(
        &dir,
        std::slice::from_ref(&request),
        &StopFlag::default(),
        SystemTime::now(),
    )
    .unwrap();
    assert_eq!(
        restored.items[0].status,
        RestoreStatus::Restored,
        "CLEAN_M35_RESTORE: directory restore"
    );
    assert_eq!(
        fs::read(&data).unwrap(),
        b"whole-directory",
        "CLEAN_M35_RESTORE: directory bytes"
    );
    assert_eq!(
        restore(&dir, &[request], &StopFlag::default(), SystemTime::now())
            .unwrap()
            .items[0]
            .reason,
        Some(RestoreError::Gone),
        "CLEAN_M35_RESTORE: gone request"
    );
}

fn qodd(f: &QFixture, prefix: &str) -> (PathBuf, u64) {
    let dir = f.dir(prefix);
    for name in ["nul", "con.txt", "aux", "a.", "b "] {
        f.file(&format!("{prefix}/{name}"), b"odd");
    }
    let readonly = f.file(&format!("{prefix}/readonly"), b"read-only");
    let mut permissions = fs::metadata(&readonly).unwrap().permissions();
    permissions.set_readonly(true);
    fs::set_permissions(&readonly, permissions).unwrap();
    let deep = format!("{prefix}/{}data", "longsegment/".repeat(28));
    f.file(&deep, b"deep");
    (dir.clone(), size(&dir))
}

#[test]
fn quarantine_purge_contract() {
    let renamed = QFixture::new("w11-purge");
    for name in [".flick-quarantine", ".FLICK-QUARANTINE"] {
        let dir = renamed.dir(&format!("{name}/purge"));
        renamed.file(&format!("{name}/purge/data"), b"flick-purge");
        let mut log = Vec::new();
        let purged = purge(
            &s(&dir),
            &mut log,
            &StopFlag::default(),
            &QObserver::default(),
            SystemTime::now(),
        )
        .expect("CLEAN_W11_RENAME: purge new root rejected");
        assert_eq!(
            purged.freed_bytes, "11",
            "CLEAN_W11_RENAME: purge byte count"
        );
        assert!(
            purged.dir_removed
                && purged.root_removed
                && purged.leftovers.is_empty()
                && !dir.parent().unwrap().exists(),
            "CLEAN_W11_RENAME: purge new root incomplete"
        );
        let events: Vec<Value> = log
            .split(|b| *b == b'\n')
            .filter(|line| !line.is_empty())
            .map(|line| serde_json::from_slice(line).expect("CLEAN_W11_RENAME: purge journal JSON"))
            .collect();
        assert_eq!(
            events
                .iter()
                .map(|event| event["event"].as_str().unwrap())
                .collect::<Vec<_>>(),
            ["intent", "done"],
            "CLEAN_W11_RENAME: purge journal"
        );
    }
    let mut log = Vec::new();
    assert!(
        matches!(
            purge(
                &s(&renamed.base.join(".other-quarantine\\id")),
                &mut log,
                &StopFlag::default(),
                &QObserver::default(),
                SystemTime::now()
            ),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_W11_RENAME: purge accepted unrelated root"
    );
    assert!(
        log.is_empty(),
        "CLEAN_W11_RENAME: invalid purge wrote journal"
    );
    let occupied = QFixture::new("purge-occupied-child");
    let dir = occupied.dir(".water-quarantine/occupied");
    let child = occupied.dir(".water-quarantine/occupied/terminal");
    occupied.file(".water-quarantine/occupied/terminal/data", b"child-bytes");
    occupied.file(".water-quarantine/occupied/terminal/deep/data", b"nested");
    let held = OpenOptions::new()
        .read(true)
        .custom_flags(0x0200_0000)
        .share_mode(3)
        .open(&child)
        .unwrap();
    let result = purge(
        &s(&dir),
        &mut Vec::new(),
        &StopFlag::default(),
        &QObserver::default(),
        SystemTime::now(),
    );
    assert!(
        result.is_ok(),
        "CLEAN_M35_PURGE: occupied child returned error {result:?}"
    );
    let report = result.unwrap();
    assert_eq!(
        fs::read_dir(&child).unwrap().count(),
        0,
        "CLEAN_M35_PURGE: occupied child contents retained"
    );
    assert_eq!(
        report.freed_bytes, "17",
        "CLEAN_M35_PURGE: occupied child freed bytes"
    );
    assert_eq!(
        report.remaining_entries, 1,
        "CLEAN_M35_PURGE: occupied child remaining entries"
    );
    assert_eq!(
        report.remaining_bytes, "0",
        "CLEAN_M35_PURGE: occupied child remaining bytes"
    );
    assert_eq!(
        report.leftovers.len(),
        1,
        "CLEAN_M35_PURGE: occupied child root cause"
    );
    assert!(
        report.leftovers.iter().any(|e| e.rel == "terminal"
            && e.kind == Kind::Dir
            && e.reason == LeftoverReason::InUse),
        "CLEAN_M35_PURGE: occupied child reason"
    );
    drop(held);
    assert!(
        qpurge(&s(&dir)).root_removed,
        "CLEAN_M35_PURGE: occupied child retry"
    );
    for (access, share) in [(0x8000_0000, 0), (0x0001_0000, 7)] {
        let root = occupied.dir(".water-quarantine/exclusive");
        let data = occupied.file(".water-quarantine/exclusive/data", b"busy");
        let held = OpenOptions::new()
            .access_mode(access)
            .custom_flags(0x0200_0000)
            .share_mode(share)
            .open(&root)
            .unwrap();
        let mut log = Vec::new();
        let result = purge(
            &s(&root),
            &mut log,
            &StopFlag::default(),
            &QObserver::default(),
            SystemTime::now(),
        );
        assert!(
            result.is_ok(),
            "CLEAN_M35_PURGE: occupied root became InvalidPlan {result:?}"
        );
        let report = result.unwrap();
        assert!(
            !report.dir_removed
                && report.leftovers.iter().any(|e| e.rel.is_empty()
                    && e.kind == Kind::Dir
                    && e.reason == LeftoverReason::InUse),
            "CLEAN_M35_PURGE: occupied root missing in_use {report:?}"
        );
        assert_eq!(
            report.freed_bytes, "0",
            "CLEAN_M35_PURGE: exclusive root freed bytes"
        );
        assert!(data.exists(), "CLEAN_M35_PURGE: exclusive root mutated");
        let events: Vec<Value> = log
            .split(|b| *b == b'\n')
            .filter(|line| !line.is_empty())
            .map(|line| serde_json::from_slice(line).unwrap())
            .collect();
        assert_eq!(
            events
                .iter()
                .map(|e| e["event"].as_str().unwrap())
                .collect::<Vec<_>>(),
            ["intent", "done"],
            "CLEAN_M35_PURGE: occupied root journal incomplete"
        );
        drop(held);
        assert!(
            qpurge(&s(&root)).root_removed,
            "CLEAN_M35_PURGE: exclusive root retry"
        );
    }
    let hard = QFixture::new("purge-hardlinks");
    let dir = hard.dir(".water-quarantine/links");
    let retained = hard.file(".water-quarantine/links/retained", b"external-link");
    let outside = hard.base.join("outside-link");
    fs::hard_link(&retained, &outside).unwrap();
    let internal = hard.file(".water-quarantine/links/one", b"last-link");
    fs::hard_link(&internal, dir.join("two")).unwrap();
    hard.file(".water-quarantine/links/plain", b"plain");
    let report = qpurge(&s(&dir));
    assert_eq!(
        report.freed_bytes, "14",
        "CLEAN_M35_PURGE: count only last hardlink plus ordinary bytes"
    );
    assert_eq!(
        fs::read(&outside).unwrap(),
        b"external-link",
        "CLEAN_M35_PURGE: external hardlink changed"
    );
    assert!(
        report.dir_removed && report.root_removed,
        "CLEAN_M35_PURGE: hardlink batch incomplete"
    );

    // Replace the public name after 256 actual removals. Final reconciliation must neither
    // traverse the replacement junction nor lose the partial report and done event.
    let race = QFixture::new("purge-final-read");
    let dir = race.dir(".water-quarantine/race");
    for n in 0..257 {
        race.file(&format!(".water-quarantine/race/f{n:03}"), b"x");
    }
    let outside = race.dir("outside");
    let keep = race.file("outside/keep", b"external-safe");
    struct SwapAfterProgress<'a> {
        fixture: &'a QFixture,
        dir: PathBuf,
        saved: PathBuf,
        outside: PathBuf,
        done: AtomicBool,
        stop: StopFlag,
    }
    impl PurgeObserver for SwapAfterProgress<'_> {
        fn on_progress(&self, entries: u64, _: u64) {
            if entries == 256 && !self.done.swap(true, Ordering::SeqCst) {
                fs::rename(&self.dir, &self.saved).unwrap();
                self.fixture.junction(&self.dir, &self.outside);
                self.stop.stop();
            }
        }
    }
    let saved = race.base.join(".water-quarantine\\saved");
    let stop = StopFlag::default();
    let observer = SwapAfterProgress {
        fixture: &race,
        dir: dir.clone(),
        saved: saved.clone(),
        outside,
        done: AtomicBool::new(false),
        stop: stop.clone(),
    };
    let mut log = Vec::new();
    let result = purge(&s(&dir), &mut log, &stop, &observer, SystemTime::now());
    assert!(
        result.is_ok(),
        "CLEAN_M35_PURGE: final reconciliation discarded partial report {result:?}"
    );
    let report = result.unwrap();
    assert!(
        observer.done.load(Ordering::SeqCst),
        "CLEAN_M35_PURGE: final reconciliation race not exercised"
    );
    assert_eq!(
        report.freed_bytes, "256",
        "CLEAN_M35_PURGE: final reconciliation lost removals"
    );
    assert!(
        report.status == RunStatus::Stopped
            && !report.dir_removed
            && report.remaining_entries == 1
            && report.remaining_bytes == "1",
        "CLEAN_M35_PURGE: final reconciliation hid leftovers"
    );
    let events: Vec<Value> = log
        .split(|b| *b == b'\n')
        .filter(|line| !line.is_empty())
        .map(|line| serde_json::from_slice(line).unwrap())
        .collect();
    assert_eq!(
        events.last().unwrap()["event"],
        "done",
        "CLEAN_M35_PURGE: final reconciliation omitted done"
    );
    assert_eq!(
        fs::read(&keep).unwrap(),
        b"external-safe",
        "CLEAN_M35_PURGE: final reconciliation followed replacement"
    );
    assert_eq!(
        size(&saved),
        1,
        "CLEAN_M35_PURGE: final reconciliation lost original residual"
    );

    let f = QFixture::new("purge");
    let (dir, bytes) = qodd(&f, ".water-quarantine/purge");
    let outside = f.dir("outside");
    let keep = f.file("outside/keep", b"external-bytes");
    f.junction(&dir.join("link"), &outside);
    let observer = QObserver::default();
    let mut journal = Vec::new();
    let report = purge(
        &s(&dir),
        &mut journal,
        &StopFlag::default(),
        &observer,
        SystemTime::now(),
    )
    .unwrap();
    assert!(
        report.dir_removed && report.root_removed && report.leftovers.is_empty(),
        "CLEAN_M35_PURGE: odd files not removed {report:?}"
    );
    assert_eq!(
        report.freed_bytes,
        bytes.to_string(),
        "CLEAN_M35_PURGE: freed bytes"
    );
    assert_eq!(
        report.remaining_entries, 0,
        "CLEAN_M35_PURGE: remaining count"
    );
    assert_eq!(
        fs::read(&keep).unwrap(),
        b"external-bytes",
        "CLEAN_M35_PURGE: followed junction"
    );
    assert_eq!(
        observer.0.lock().unwrap().last(),
        Some(&(report.removed_entries, bytes)),
        "CLEAN_M35_PURGE: final callback"
    );
    let lines: Vec<Value> = String::from_utf8(journal)
        .unwrap()
        .lines()
        .map(|l| serde_json::from_str(l).unwrap())
        .collect();
    assert_eq!(lines[0]["event"], "intent", "CLEAN_M35_PURGE: intent");
    assert_eq!(lines[1]["event"], "done", "CLEAN_M35_PURGE: done");
    let (normal, bytes) = qodd(&f, "root/normal");
    f.junction(&normal.join("link"), &outside);
    let plan = parse(plan_value(vec![item(&f.base, &normal, "odd-normal")]));
    let report = run(&plan);
    assert_eq!(
        report.items[0].status,
        ItemStatus::Deleted,
        "CLEAN_M35_PURGE: execute odd names"
    );
    assert_eq!(
        report.freed_bytes,
        bytes.to_string(),
        "CLEAN_M35_PURGE: execute odd bytes"
    );
    assert_eq!(
        fs::read(&keep).unwrap(),
        b"external-bytes",
        "CLEAN_M35_PURGE: execute followed junction"
    );
    let dir = f.dir(".water-quarantine/locked");
    let file = f.file(".water-quarantine/locked/file", b"locked-data");
    let child = f.dir(".water-quarantine/locked/terminal");
    let file_lock = OpenOptions::new()
        .read(true)
        .share_mode(3)
        .open(&file)
        .unwrap();
    let dir_lock = OpenOptions::new()
        .read(true)
        .custom_flags(0x0200_0000)
        .share_mode(3)
        .open(&child)
        .unwrap();
    let report = qpurge(&s(&dir));
    assert!(
        !report.dir_removed && report.remaining_bytes == "11",
        "CLEAN_M35_PURGE: locked residual"
    );
    assert_eq!(
        report.leftovers.len(),
        2,
        "CLEAN_M35_PURGE: root causes only {report:?}"
    );
    assert!(
        report
            .leftovers
            .iter()
            .all(|l| l.reason == LeftoverReason::InUse),
        "CLEAN_M35_PURGE: in_use reason"
    );
    assert!(
        report
            .leftovers
            .iter()
            .any(|l| l.kind == Kind::Dir && l.rel == "terminal"),
        "CLEAN_M35_PURGE: terminal dir reason"
    );
    drop(file_lock);
    drop(dir_lock);
    let report = qpurge(&s(&dir));
    assert!(
        report.dir_removed && report.root_removed,
        "CLEAN_M35_PURGE: retry did not clear"
    );
    let wrong = f.dir("not-quarantine/id");
    assert!(
        matches!(
            purge(
                &s(&wrong),
                &mut Vec::new(),
                &StopFlag::default(),
                &QObserver::default(),
                SystemTime::now()
            ),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_M35_PURGE: wrong parent accepted"
    );
    let qroot = f.dir(".water-quarantine");
    let link = qroot.join("linked");
    f.junction(&link, &outside);
    assert!(
        matches!(
            purge(
                &s(&link),
                &mut Vec::new(),
                &StopFlag::default(),
                &QObserver::default(),
                SystemTime::now()
            ),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_M35_PURGE: linked qdir accepted"
    );
    assert_eq!(
        fs::read(&keep).unwrap(),
        b"external-bytes",
        "CLEAN_M35_PURGE: linked qdir target changed"
    );
    let dir = f.dir(".water-quarantine/stopped");
    f.file(".water-quarantine/stopped/file", b"keep");
    let stop = StopFlag::default();
    stop.stop();
    let report = purge(
        &s(&dir),
        &mut Vec::new(),
        &stop,
        &QObserver::default(),
        SystemTime::now(),
    )
    .unwrap();
    assert_eq!(
        report.status,
        RunStatus::Stopped,
        "CLEAN_M35_PURGE: stop state"
    );
    assert_eq!(
        report.remaining_bytes, "4",
        "CLEAN_M35_PURGE: stop residual"
    );
    qroundtrip(&report, purge_report_to_json(&report), "CLEAN_M35_PURGE");
    let root_locked = f.dir(".water-quarantine/rootlocked");
    let root_data = f.file(".water-quarantine/rootlocked/file", b"x");
    let root_lock = OpenOptions::new()
        .read(true)
        .custom_flags(0x0200_0000)
        .share_mode(3)
        .open(&root_locked)
        .unwrap();
    let report = qpurge(&s(&root_locked));
    assert!(
        !report.dir_removed && !root_data.exists(),
        "CLEAN_M35_PURGE: occupied root should retain only the root"
    );
    assert_eq!(
        report.remaining_entries, 1,
        "CLEAN_M35_PURGE: occupied root residual count"
    );
    assert!(
        report
            .leftovers
            .iter()
            .any(|e| e.rel.is_empty() && e.kind == Kind::Dir && e.reason == LeftoverReason::InUse),
        "CLEAN_M35_PURGE: occupied root reason {report:?}"
    );
    drop(root_lock);
    assert!(
        qpurge(&s(&root_locked)).dir_removed,
        "CLEAN_M35_PURGE: occupied root retry"
    );
    let cloud_dir = f.dir(".water-quarantine/reparse");
    let cloud = f.file(".water-quarantine/reparse/cloud", b"cloud");
    set_custom_reparse(&cloud);
    let cloud_id = identity_of(&s(&cloud)).unwrap();
    let cloud_before = fs::symlink_metadata(&cloud).unwrap();
    let report = qpurge(&s(&cloud_dir));
    assert!(
        report
            .leftovers
            .iter()
            .any(|e| e.rel == "cloud" && e.reason == LeftoverReason::Reparse),
        "CLEAN_M35_PURGE: non-name reparse not retained"
    );
    assert_eq!(
        identity_of(&s(&cloud)).unwrap(),
        cloud_id,
        "CLEAN_M35_PURGE: changed non-name reparse identity"
    );
    let cloud_after = fs::symlink_metadata(&cloud).unwrap();
    assert_eq!(
        (
            cloud_after.len(),
            cloud_after.last_write_time(),
            cloud_after.file_attributes()
        ),
        (
            cloud_before.len(),
            cloud_before.last_write_time(),
            cloud_before.file_attributes()
        ),
        "CLEAN_M35_PURGE: changed non-name reparse metadata"
    );
    let crowded = f.dir(".water-quarantine/crowded");
    let mut held = Vec::new();
    for n in (0..201).rev() {
        let path = f.file(&format!(".water-quarantine/crowded/f{n:03}"), b"x");
        held.push(
            OpenOptions::new()
                .read(true)
                .share_mode(3)
                .open(path)
                .unwrap(),
        );
    }
    let report = qpurge(&s(&crowded));
    assert!(
        report.leftovers_truncated && report.leftovers.len() == 200,
        "CLEAN_M35_PURGE: leftover cap"
    );
    assert_eq!(
        report.remaining_entries, 201,
        "CLEAN_M35_PURGE: truncated total count"
    );
    assert_eq!(
        report.remaining_bytes, "201",
        "CLEAN_M35_PURGE: truncated total bytes"
    );
    assert!(
        report
            .leftovers
            .windows(2)
            .all(|pair| pair[0].rel < pair[1].rel),
        "CLEAN_M35_PURGE: leftover sort"
    );
    drop(held);
    assert!(
        qpurge(&s(&crowded)).dir_removed,
        "CLEAN_M35_PURGE: crowded retry"
    );
    let rejected = f.dir(".water-quarantine/bad-journal");
    let data = f.file(".water-quarantine/bad-journal/data", b"keep");
    assert!(
        matches!(
            purge(
                &s(&rejected),
                &mut QRejectJournal,
                &StopFlag::default(),
                &QObserver::default(),
                SystemTime::now()
            ),
            Err(CleanError::Journal)
        ),
        "CLEAN_M35_PURGE: journal rejection"
    );
    assert_eq!(
        fs::read(data).unwrap(),
        b"keep",
        "CLEAN_M35_PURGE: deleted before intent"
    );
    let boundary = QFixture::new("purge-stop-boundary");
    let dir = boundary.dir(".water-quarantine/boundary");
    for n in 0..255 {
        boundary.file(&format!(".water-quarantine/boundary/f{n:03}"), b"x");
    }
    struct StopAtRoot {
        stop: StopFlag,
        dir: PathBuf,
    }
    impl PurgeObserver for StopAtRoot {
        fn on_progress(&self, entries: u64, _: u64) {
            if entries == 256 {
                assert!(
                    fs::symlink_metadata(&self.dir).is_err(),
                    "CLEAN_M35_PURGE: callback before root handle closed"
                );
                self.stop.stop();
            }
        }
    }
    let stop = StopFlag::default();
    let observer = StopAtRoot {
        stop: stop.clone(),
        dir: dir.clone(),
    };
    let report = purge(
        &s(&dir),
        &mut Vec::new(),
        &stop,
        &observer,
        SystemTime::now(),
    )
    .unwrap();
    assert!(
        report.dir_removed && !report.root_removed,
        "CLEAN_M35_PURGE: ignored stop before empty-root removal"
    );
    assert_eq!(
        report.status,
        RunStatus::Stopped,
        "CLEAN_M35_PURGE: boundary stop status"
    );
    assert!(
        Path::new(&boundary.root()).exists(),
        "CLEAN_M35_PURGE: removed stopped empty root"
    );
}

#[test]
fn quarantine_inspect_and_list() {
    let renamed = QFixture::new("w11-inspect");
    for name in [".flick-quarantine", ".fLiCk-QuArAnTiNe"] {
        let root = s(&renamed.base.join(name));
        let absent = list_quarantines(&root).expect("CLEAN_W11_RENAME: list absent new root");
        assert_eq!(
            absent.state, "absent",
            "CLEAN_W11_RENAME: absent root state"
        );
        let dir = renamed.dir(&format!("{name}/batch"));
        renamed.file(&format!("{name}/batch/data"), b"flick-inspect");
        let list = list_quarantines(&root).expect("CLEAN_W11_RENAME: list present new root");
        assert_eq!(
            list.state, "present",
            "CLEAN_W11_RENAME: present root state"
        );
        assert_eq!(
            list.quarantines
                .iter()
                .map(|q| q.quarantine_id.as_str())
                .collect::<Vec<_>>(),
            ["batch"],
            "CLEAN_W11_RENAME: new root listing"
        );
        let info =
            inspect(&s(&dir), &StopFlag::default()).expect("CLEAN_W11_RENAME: inspect new root");
        assert!(
            info.exists && info.total_bytes == "13" && info.file_count == 1 && info.dir_count == 0,
            "CLEAN_W11_RENAME: new root inspection totals"
        );
        // Use the product purge so the next spelling exercises an absent root again.
        let purged = purge(
            &s(&dir),
            &mut Vec::new(),
            &StopFlag::default(),
            &QObserver::default(),
            SystemTime::now(),
        )
        .expect("CLEAN_W11_RENAME: inspection fixture purge");
        assert!(
            purged.root_removed,
            "CLEAN_W11_RENAME: inspection fixture root remains"
        );
    }
    let invalid = s(&renamed.base.join(".other-quarantine"));
    assert!(
        matches!(list_quarantines(&invalid), Err(CleanError::InvalidPlan)),
        "CLEAN_W11_RENAME: list accepted unrelated root"
    );
    assert!(
        matches!(
            inspect(&format!("{invalid}\\id"), &StopFlag::default()),
            Err(CleanError::InvalidPlan)
        ),
        "CLEAN_W11_RENAME: inspect accepted unrelated root"
    );
    let f = QFixture::new("inspect");
    assert_eq!(
        list_quarantines(&f.root()).unwrap().state,
        "absent",
        "CLEAN_M35_INSPECT: absent"
    );
    f.file(".water-quarantine", b"file");
    assert_eq!(
        list_quarantines(&f.root()).unwrap().state,
        "unavailable",
        "CLEAN_M35_INSPECT: file root"
    );
    fs::remove_file(f.base.join(".water-quarantine")).unwrap();
    let (dir, bytes) = qodd(&f, ".water-quarantine/b-id");
    f.dir(".water-quarantine/a-id");
    f.file(".water-quarantine/stray", b"stray");
    f.dir(".water-quarantine/-invalid");
    let list = list_quarantines(&f.root()).unwrap();
    assert_eq!(list.state, "present", "CLEAN_M35_INSPECT: present");
    assert_eq!(
        list.quarantines
            .iter()
            .map(|q| q.quarantine_id.as_str())
            .collect::<Vec<_>>(),
        ["a-id", "b-id"],
        "CLEAN_M35_INSPECT: sorting"
    );
    assert_eq!(list.stray_entries, 2, "CLEAN_M35_INSPECT: strays");
    assert!(
        list.quarantines
            .iter()
            .all(|q| q.created_at.as_ref().is_some_and(|t| t.len() == 20)),
        "CLEAN_M35_INSPECT: creation time"
    );
    let outside = f.dir("outside");
    f.file("outside/keep", b"external");
    f.junction(&dir.join("link"), &outside);
    let info = inspect(&s(&dir), &StopFlag::default()).unwrap();
    assert_eq!(
        info.total_bytes,
        bytes.to_string(),
        "CLEAN_M35_INSPECT: logical bytes"
    );
    assert_eq!(info.file_count, 7, "CLEAN_M35_INSPECT: file count");
    assert!(info.dir_count >= 29, "CLEAN_M35_INSPECT: dir count");
    assert!(
        info.disk_bytes.parse::<u64>().unwrap() > 0,
        "CLEAN_M35_INSPECT: allocation"
    );
    for name in ["nul", "con.txt", "aux", "a.", "b "] {
        assert!(
            info.hard_entries
                .iter()
                .any(|e| e.rel == name && e.hints.contains(&LeftoverHint::OddName)),
            "CLEAN_M35_INSPECT: odd name {name}"
        );
    }
    assert!(
        info.hard_entries
            .iter()
            .any(|e| e.hints.contains(&LeftoverHint::LongPath)),
        "CLEAN_M35_INSPECT: long path"
    );
    assert!(
        info.hard_entries
            .iter()
            .any(|e| e.rel == "readonly" && e.hints.contains(&LeftoverHint::ReadOnly)),
        "CLEAN_M35_INSPECT: read-only"
    );
    assert!(
        !inspect(&format!("{}\\absent", f.root()), &StopFlag::default())
            .unwrap()
            .exists,
        "CLEAN_M35_INSPECT: gone dir"
    );
    for serialized in [
        quarantine_list_to_json(&list),
        quarantine_info_to_json(&info),
    ] {
        let value: Value = serde_json::from_str(&serialized).unwrap();
        assert!(value.is_object(), "CLEAN_M35_INSPECT: JSON");
    }
    let alternate = QFixture::new("inspect-link");
    let target = alternate.dir("outside");
    alternate.junction(&alternate.base.join(".water-quarantine"), &target);
    assert_eq!(
        list_quarantines(&alternate.root()).unwrap().state,
        "unavailable",
        "CLEAN_M35_INSPECT: linked root"
    );
    qroundtrip(&list, quarantine_list_to_json(&list), "CLEAN_M35_INSPECT");
    qroundtrip(&info, quarantine_info_to_json(&info), "CLEAN_M35_INSPECT");
    let cloud_dir = f.dir(".water-quarantine/cloud");
    let cloud = f.file(".water-quarantine/cloud/cloud", b"cloud");
    set_custom_reparse(&cloud);
    let cloud_info = inspect(&s(&cloud_dir), &StopFlag::default()).unwrap();
    assert!(
        cloud_info
            .hard_entries
            .iter()
            .any(|e| e.hints.contains(&LeftoverHint::Reparse)),
        "CLEAN_M35_INSPECT: non-name reparse hint"
    );
    let blocked_dir = f.dir(".water-quarantine/blocked-info/locked");
    f.file(".water-quarantine/blocked-info/locked/data", b"unlisted");
    let lock = OpenOptions::new()
        .read(true)
        .custom_flags(0x0200_0000)
        .share_mode(0)
        .open(&blocked_dir)
        .unwrap();
    let info = inspect(
        &s(&f.base.join(".water-quarantine\\blocked-info")),
        &StopFlag::default(),
    )
    .unwrap();
    assert!(
        info.hard_entries
            .iter()
            .any(|e| e.rel == "locked" && e.hints.contains(&LeftoverHint::AccessDenied)),
        "CLEAN_M35_INSPECT: denied enumeration hint"
    );
    drop(lock);
    let truncated = f.dir(".water-quarantine/truncated");
    for n in (0..201).rev() {
        let path = f.file(&format!(".water-quarantine/truncated/f{n:03}"), b"x");
        let mut permissions = fs::metadata(&path).unwrap().permissions();
        permissions.set_readonly(true);
        fs::set_permissions(path, permissions).unwrap();
    }
    let info = inspect(&s(&truncated), &StopFlag::default()).unwrap();
    assert!(
        info.hard_truncated && info.hard_entries.len() == 200,
        "CLEAN_M35_INSPECT: hint cap"
    );
    assert_eq!(
        info.file_count, 201,
        "CLEAN_M35_INSPECT: truncated total count"
    );
    assert_eq!(
        info.total_bytes, "201",
        "CLEAN_M35_INSPECT: truncated total bytes"
    );
    assert!(
        info.hard_entries
            .windows(2)
            .all(|pair| pair[0].rel < pair[1].rel),
        "CLEAN_M35_INSPECT: hint sort"
    );
}

fn b64(bytes: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in bytes.chunks(3) {
        let a = chunk[0] as u32;
        let b = chunk.get(1).copied().unwrap_or(0) as u32;
        let c = chunk.get(2).copied().unwrap_or(0) as u32;
        let n = (a << 16) | (b << 8) | c;
        out.push(T[((n >> 18) & 63) as usize] as char);
        out.push(T[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 {
            T[((n >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            T[(n & 63) as usize] as char
        } else {
            '='
        });
    }
    out
}
