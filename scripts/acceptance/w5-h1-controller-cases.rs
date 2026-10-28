// Controller integration cases for WATER-W5-H1 that need the public execute: the age veto
// (min_age_hours) is applied there, after the snapshot. Copied into an acceptance tree as
// packages/junk-clean/tests/controller_cases.rs with its own [[test]] entry, removed afterwards.
// Fixtures live only under <tree>/.local/w5-h1-controller/cases-<nonce>/ and are left in place for
// inspection; every deletion goes through water_junk_clean::execute.
use serde_json::{Value, json};
use std::{
    ffi::OsString,
    fs::{self, OpenOptions},
    hash::{BuildHasher, RandomState},
    io::Write,
    os::windows::{ffi::OsStringExt, fs::OpenOptionsExt},
    path::{Path, PathBuf},
    time::{Duration, SystemTime},
};
use water_junk_clean::*;

fn base() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
    let tree = manifest.parent().unwrap().parent().unwrap().to_path_buf();
    let parent = tree.join(".local").join("w5-h1-controller");
    fs::create_dir_all(&parent).unwrap();
    let nonce = RandomState::new().hash_one((SystemTime::now(), std::process::id()));
    let root = parent.join(format!("cases-{nonce:016x}"));
    fs::create_dir(&root).unwrap();
    root
}

fn s(p: &Path) -> String {
    p.to_str().unwrap().to_owned()
}

fn file(p: &Path, data: &[u8]) {
    fs::create_dir_all(p.parent().unwrap()).unwrap();
    let mut f = OpenOptions::new().write(true).create_new(true).open(p).unwrap();
    f.write_all(data).unwrap();
}

fn plan(root: &Path, item: &Path, total: u64, min_age_hours: u32) -> CleanPlan {
    let it: Value = json!({"item_id":"h1","group_id":"synthetic","rule_id":"fixture-rule","level":"recommended",
        "path":s(item),"root":s(root),"kind":"dir","identity":identity_of(&s(item)).unwrap(),
        "total_bytes":total.to_string(),"min_age_hours":min_age_hours});
    let v = json!({"plan_version":"water.clean-plan.v1","plan_id":"controller-h1-cases",
        "created_at":"2026-10-28T00:00:00Z","items":[it],"protected_paths":[],"hard_guards":[]});
    CleanPlan::from_json(&v.to_string()).unwrap()
}

struct Quiet;
impl CleanObserver for Quiet {
    fn on_item(&self, _: usize, _: usize, _: u64, _: &str) {}
}

fn run(p: &CleanPlan) -> CleanReport {
    execute(p, &NoGuard, &mut Vec::new(), &StopFlag::default(), &Quiet, SystemTime::now()).unwrap()
}

/// Set a file's or directory's last-write time to two days ago (FILE_WRITE_ATTRIBUTES, backup semantics).
fn set_old(p: &Path) {
    let f = OpenOptions::new().access_mode(0x100).custom_flags(0x0200_0000).open(p).unwrap();
    f.set_modified(SystemTime::now() - Duration::from_secs(48 * 3600)).unwrap();
}

/// An item whose only recent content sits two levels down in directory `dir_name`. Everything the
/// snapshot sees at the top is two days old; the item's minimum age is one hour.
fn recent_inside(dir_name: OsString) -> (PathBuf, PathBuf, PathBuf, CleanReport) {
    let root = base();
    let item = root.join("item");
    let ok = item.join("ok.bin");
    file(&ok, b"okay");
    let dir = item.join(dir_name);
    let recent = dir.join("sub").join("new.bin");
    file(&recent, b"brand-new");
    set_old(&ok);
    set_old(&dir);
    set_old(&item);
    let r = run(&plan(&root, &item, 13, 1));
    let it = &r.items[0];
    eprintln!(
        "CONTROLLER h1 recent inside: status {:?} reason {:?} failed {} freed {} of {}",
        it.status, it.skip_reason, it.failed_entries, it.bytes_freed, it.bytes_before
    );
    (item, ok, recent, r)
}

/// Sanity check for the case below: with an ordinary directory name, recent content two levels
/// down vetoes the whole item (too_recent) and nothing is deleted.
#[test]
fn h1_recent_content_in_normal_directory_vetoes() {
    let (_, ok, recent, r) = recent_inside(OsString::from("norm"));
    assert_eq!(fs::read(&ok).unwrap(), b"okay", "CONTROLLER_H1_VETO_NORMAL: sibling deleted");
    assert_eq!(fs::read(&recent).unwrap(), b"brand-new", "CONTROLLER_H1_VETO_NORMAL: recent file touched");
    assert_eq!(r.items[0].status, ItemStatus::Skipped, "CONTROLLER_H1_VETO_NORMAL: status");
    assert_eq!(r.items[0].skip_reason, Some(SkipReason::TooRecent), "CONTROLLER_H1_VETO_NORMAL: reason");
}

/// CLEAN-M2 §5 and the unchanged whole-item vetoes: the same recent content, but the directory's
/// name is not valid UTF-16. The whole item must still be skipped (too_recent or changed), with
/// nothing deleted.
#[test]
fn h1_recent_content_in_unpaired_directory_vetoes() {
    let (_, ok, recent, r) = recent_inside(OsString::from_wide(&[0x0064, 0xD800, 0x0064]));
    assert_eq!(fs::read(&recent).unwrap(), b"brand-new", "CONTROLLER_H1_VETO_UNPAIRED: recent file touched");
    assert_eq!(fs::read(&ok).unwrap(), b"okay", "CONTROLLER_H1_VETO_UNPAIRED: sibling deleted although the item holds recent content");
    assert_eq!(r.items[0].status, ItemStatus::Skipped, "CONTROLLER_H1_VETO_UNPAIRED: status");
    assert_eq!(r.items[0].bytes_freed, "0", "CONTROLLER_H1_VETO_UNPAIRED: freed");
}

/// CLEAN-M2 §1 for the residual walk: a 4000-level chain whose bottom file is held open without
/// delete sharing, so the item ends partial and the residual measurement walks all 4000 levels,
/// on a 256 KiB stack.
/// A tree created moments before is often skipped as `changed` on the first run, because the two
/// preflight snapshots in execute differ while fresh directory metadata settles (the pre-M2 source
/// does the same at 200 levels; a run two seconds later cleans it). So a first `changed` skip with
/// nothing touched is retried, up to three runs.
#[test]
fn h1_deep_tree_residual_small_stack() {
    let root = base();
    let item = root.join("item");
    file(&item.join("top.bin"), b"top");
    let mut cur = PathBuf::from(format!(r"\\?\{}", item.display()));
    for _ in 0..4000 {
        cur.push("d");
        fs::create_dir(&cur).unwrap();
    }
    let leaf = cur.join("leaf");
    fs::write(&leaf, b"deep").unwrap();
    let hold = OpenOptions::new().read(true).share_mode(0x1).open(&leaf).unwrap();
    let mut r = None;
    for round in 1..=3 {
        let p = plan(&root, &item, 7, 0);
        let report = std::thread::Builder::new()
            .stack_size(256 * 1024)
            .spawn(move || run(&p))
            .unwrap()
            .join()
            .expect("CONTROLLER_H1_DEEP_RESIDUAL: worker thread panicked");
        let it = &report.items[0];
        eprintln!(
            "CONTROLLER h1 deep residual round {round}: status {:?} reason {:?} failed {} freed {} of {}",
            it.status, it.skip_reason, it.failed_entries, it.bytes_freed, it.bytes_before
        );
        let settle = it.skip_reason == Some(SkipReason::Changed) && it.bytes_before == "0";
        r = Some(report);
        if !settle {
            break;
        }
        std::thread::sleep(Duration::from_secs(2));
    }
    drop(hold);
    let r = r.unwrap();
    let it = &r.items[0];
    assert_eq!(fs::read(&leaf).unwrap(), b"deep", "CONTROLLER_H1_DEEP_RESIDUAL: held file lost");
    assert_eq!(it.status, ItemStatus::Partial, "CONTROLLER_H1_DEEP_RESIDUAL: status");
    assert_eq!((it.bytes_freed.as_str(), it.failed_entries), ("3", 1), "CONTROLLER_H1_DEEP_RESIDUAL: freed/failed");
}
