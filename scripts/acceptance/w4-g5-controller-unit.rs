// Controller cases for WATER-W4-G5 (CLEAN-REPORT): take the crate's own snapshot of an item, change
// the disk the way another program would between the snapshot and deletion, then call the crate's
// own delete. No timing and no product hook: the snapshot -> change -> delete order is exact.
// Copied into an acceptance tree as packages/junk-clean/src/controller_unit.rs and declared from
// lib.rs as a #[cfg(test)] module, removed afterwards. Fixtures live only under
// <tree>/.local/w4-g5-controller/case-<nonce>/ and are left in place for inspection; every deletion
// goes through native_windows::delete on a plan item inside the fixture.
use crate::native_windows::{delete, snapshot};
use crate::*;
use serde_json::json;
use std::{
    fs::{self, OpenOptions},
    hash::{BuildHasher, RandomState},
    io::Write,
    os::windows::fs::OpenOptionsExt,
    path::{Path, PathBuf},
    time::SystemTime,
};

fn base() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
    let tree = manifest.parent().unwrap().parent().unwrap().to_path_buf();
    let parent = tree.join(".local").join("w4-g5-controller");
    fs::create_dir_all(&parent).unwrap();
    let nonce = RandomState::new().hash_one((SystemTime::now(), std::process::id()));
    let root = parent.join(format!("case-{nonce:016x}"));
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

fn size(p: &Path) -> u64 {
    let m = fs::symlink_metadata(p).unwrap();
    if m.is_dir() { fs::read_dir(p).unwrap().map(|e| size(&e.unwrap().path())).sum() } else { m.len() }
}

fn plan_for(root: &Path, item: &Path) -> CleanPlan {
    let v = json!({"plan_version":"water.clean-plan.v1","plan_id":"controller-g5",
        "created_at":"2026-10-27T00:00:00Z","protected_paths":[],"hard_guards":[],
        "items":[{"item_id":"g5","group_id":"synthetic","rule_id":"fixture-rule","level":"recommended",
            "path":s(item),"root":s(root),"kind":"dir","identity":identity_of(&s(item)).unwrap(),
            "total_bytes":size(item).to_string(),"min_age_hours":0}]});
    CleanPlan::from_json(&v.to_string()).unwrap()
}

/// Snapshot `item`, run `change`, delete; returns the item report.
fn snapshot_change_delete(root: &Path, item: &Path, change: impl FnOnce()) -> ItemReport {
    let plan = plan_for(root, item);
    let before = snapshot(&plan.items[0], &[], &[]).expect("CONTROLLER snapshot");
    change();
    let (report, interrupted) = delete(&plan.items[0], &before, &StopFlag::default());
    assert!(!interrupted, "CONTROLLER_G5: no stop was requested");
    eprintln!(
        "CONTROLLER g5: status {:?} reason {:?} failed {} freed {} of {}",
        report.status, report.skip_reason, report.failed_entries, report.bytes_freed, report.bytes_before
    );
    report
}

/// §1: the item was renamed away after the snapshot. Nothing is touched: skipped/gone, 0 freed, 0 failed.
#[test]
fn g5_item_moved_away_before_delete() {
    let root = base();
    let item = root.join("item");
    file(&item.join("a.bin"), b"aaaa");
    let moved = root.join("moved");
    let r = snapshot_change_delete(&root, &item, || fs::rename(&item, &moved).unwrap());
    assert_eq!(fs::read(moved.join("a.bin")).unwrap(), b"aaaa", "CONTROLLER_G5_GONE: moved item touched");
    assert_eq!(r.status, ItemStatus::Skipped, "CONTROLLER_G5_GONE: status");
    assert_eq!(r.skip_reason, Some(SkipReason::Gone), "CONTROLLER_G5_GONE: reason");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("0", 0), "CONTROLLER_G5_GONE: freed/failed");
    assert_eq!(r.bytes_before, "4", "CONTROLLER_G5_GONE: bytes_before keeps the snapshot");
}

/// §1: another directory took the item's name after the snapshot: skipped/changed, nothing touched.
#[test]
fn g5_item_replaced_before_delete() {
    let root = base();
    let item = root.join("item");
    file(&item.join("a.bin"), b"aaaa");
    let moved = root.join("moved");
    let r = snapshot_change_delete(&root, &item, || {
        fs::rename(&item, &moved).unwrap();
        file(&item.join("a.bin"), b"newcomer");
    });
    assert_eq!(fs::read(item.join("a.bin")).unwrap(), b"newcomer", "CONTROLLER_G5_CHANGED: replacement touched");
    assert_eq!(fs::read(moved.join("a.bin")).unwrap(), b"aaaa", "CONTROLLER_G5_CHANGED: moved item touched");
    assert_eq!(r.status, ItemStatus::Skipped, "CONTROLLER_G5_CHANGED: status");
    assert_eq!(r.skip_reason, Some(SkipReason::Changed), "CONTROLLER_G5_CHANGED: reason");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("0", 0), "CONTROLLER_G5_CHANGED: freed/failed");
}

/// §3 first example: `a\b\new.txt` appears after the snapshot. b, a and the item stay, none counted.
#[test]
fn g5_late_file_counts_nothing_upwards() {
    let root = base();
    let item = root.join("item");
    file(&item.join("a").join("b").join("x.bin"), b"planned");
    let late = item.join("a").join("b").join("new.txt");
    let r = snapshot_change_delete(&root, &item, || file(&late, b"late"));
    assert_eq!(fs::read(&late).unwrap(), b"late", "CONTROLLER_G5_ACCOUNTED: late file deleted");
    assert!(fs::symlink_metadata(item.join("a").join("b").join("x.bin")).is_err(), "CONTROLLER_G5_ACCOUNTED: planned file kept");
    assert_eq!(r.status, ItemStatus::Partial, "CONTROLLER_G5_ACCOUNTED: status");
    assert_eq!(r.failed_entries, 0, "CONTROLLER_G5_ACCOUNTED: the late file's ancestors were counted");
}

/// §3 second example: the planned file `a\x.bin` is replaced. Counted once; a and the item are not.
#[test]
fn g5_replaced_file_counts_once() {
    let root = base();
    let item = root.join("item");
    let x = item.join("a").join("x.bin");
    file(&x, b"original");
    file(&item.join("a").join("y.bin"), b"planned");
    let moved = root.join("moved.bin");
    let r = snapshot_change_delete(&root, &item, || {
        fs::rename(&x, &moved).unwrap();
        file(&x, b"replacement");
    });
    assert_eq!(fs::read(&x).unwrap(), b"replacement", "CONTROLLER_G5_ONCE: replacement deleted");
    assert_eq!(fs::read(&moved).unwrap(), b"original", "CONTROLLER_G5_ONCE: moved original touched");
    assert!(fs::symlink_metadata(item.join("a").join("y.bin")).is_err(), "CONTROLLER_G5_ONCE: sibling kept");
    assert_eq!(r.status, ItemStatus::Partial, "CONTROLLER_G5_ONCE: status");
    assert_eq!(r.failed_entries, 1, "CONTROLLER_G5_ONCE: failed entries");
}

/// §4: a planned directory is replaced by a file whose name differs only in case. It is the
/// planned name, not a newcomer: counted, and the item stops there (zzz.bin is listed after it).
#[test]
fn g5_case_only_replacement_stops() {
    let root = base();
    let item = root.join("item");
    file(&item.join("mmm").join("orig.bin"), b"original");
    file(&item.join("zzz.bin"), b"after");
    let moved = root.join("moved");
    let upper = item.join("MMM");
    let r = snapshot_change_delete(&root, &item, || {
        fs::rename(item.join("mmm"), &moved).unwrap();
        fs::write(&upper, b"a file now").unwrap();
    });
    assert_eq!(fs::read(&upper).unwrap(), b"a file now", "CONTROLLER_G5_CASE: replacement touched");
    assert_eq!(fs::read(moved.join("orig.bin")).unwrap(), b"original", "CONTROLLER_G5_CASE: moved directory touched");
    assert!(fs::read(item.join("zzz.bin")).is_ok_and(|b| b == b"after"), "CONTROLLER_G5_CASE: deletion went on after the replaced directory");
    assert_eq!(r.status, ItemStatus::Failed, "CONTROLLER_G5_CASE: status (nothing removed)");
    assert_eq!(r.failed_entries, 1, "CONTROLLER_G5_CASE: the case-only replacement was not counted");
}

/// §4: a planned directory is only renamed to another case (same FileId). It is deleted as planned.
#[test]
fn g5_case_only_rename_is_deleted() {
    let root = base();
    let item = root.join("item");
    file(&item.join("mmm").join("orig.bin"), b"original");
    file(&item.join("zzz.bin"), b"after");
    let r = snapshot_change_delete(&root, &item, || fs::rename(item.join("mmm"), item.join("MMM")).unwrap());
    assert!(fs::symlink_metadata(&item).is_err(), "CONTROLLER_G5_CASE_SAME: item survived");
    assert_eq!(r.status, ItemStatus::Deleted, "CONTROLLER_G5_CASE_SAME: status");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("13", 0), "CONTROLLER_G5_CASE_SAME: freed/failed");
}

/// §5: nothing could be removed, while another program shrank the held file. Water freed nothing.
#[test]
fn g5_nothing_removed_frees_zero() {
    let root = base();
    let item = root.join("item");
    let held = item.join("held.bin");
    file(&held, &[7u8; 100]);
    // Read and write sharing only: Water cannot open it for deletion.
    let h = OpenOptions::new().read(true).write(true).share_mode(0x1 | 0x2).open(&held).unwrap();
    let r = snapshot_change_delete(&root, &item, || h.set_len(0).unwrap());
    drop(h);
    assert_eq!(fs::metadata(&held).unwrap().len(), 0, "CONTROLLER_G5_ZERO: held file lost");
    assert_eq!(r.bytes_before, "100", "CONTROLLER_G5_ZERO: bytes_before");
    assert_eq!(r.status, ItemStatus::Failed, "CONTROLLER_G5_ZERO: status");
    assert_eq!(r.bytes_freed, "0", "CONTROLLER_G5_ZERO: bytes another program removed were reported as freed");
    assert_eq!(r.failed_entries, 1, "CONTROLLER_G5_ZERO: failed entries");
}
