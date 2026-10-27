// Controller cases for WATER-W5-H1 (CLEAN-M2 §2-§5): take the crate's own snapshot of an item,
// change the disk the way another program would between the snapshot and deletion, then call the
// crate's own delete. Only the recreate case (§2) races a helper thread against deletion, as the
// wave 4 race cases do; the rest are exact. No product hook.
// Copied into an acceptance tree as packages/junk-clean/src/controller_unit_w5.rs and declared from
// lib.rs as a #[cfg(test)] module, removed afterwards. Fixtures live only under
// <tree>/.local/w5-h1-controller/case-<nonce>/ and are left in place for inspection; every deletion
// goes through native_windows::delete on a plan item inside the fixture.
use crate::native_windows::{delete, snapshot};
use crate::*;
use serde_json::json;
use std::{
    ffi::OsString,
    fs::{self, OpenOptions},
    hash::{BuildHasher, RandomState},
    io::Write,
    os::windows::ffi::OsStringExt,
    path::{Path, PathBuf},
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::SystemTime,
};

fn base() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
    let tree = manifest.parent().unwrap().parent().unwrap().to_path_buf();
    let parent = tree.join(".local").join("w5-h1-controller");
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
    let v = json!({"plan_version":"water.clean-plan.v1","plan_id":"controller-h1",
        "created_at":"2026-10-28T00:00:00Z","protected_paths":[],"hard_guards":[],
        "items":[{"item_id":"h1","group_id":"synthetic","rule_id":"fixture-rule","level":"recommended",
            "path":s(item),"root":s(root),"kind":"dir","identity":identity_of(&s(item)).unwrap(),
            "total_bytes":size(item).to_string(),"min_age_hours":0}]});
    CleanPlan::from_json(&v.to_string()).unwrap()
}

fn report(r: &ItemReport) {
    eprintln!(
        "CONTROLLER h1: status {:?} reason {:?} failed {} freed {} of {}",
        r.status, r.skip_reason, r.failed_entries, r.bytes_freed, r.bytes_before
    );
}

/// Snapshot `item`, run `change`, delete; returns the item report.
fn snapshot_change_delete(root: &Path, item: &Path, change: impl FnOnce()) -> ItemReport {
    let plan = plan_for(root, item);
    let before = snapshot(&plan.items[0], &[], &[]).expect("CONTROLLER snapshot");
    change();
    let (r, interrupted) = delete(&plan.items[0], &before, &StopFlag::default());
    assert!(!interrupted, "CONTROLLER_H1: no stop was requested");
    report(&r);
    r
}

/// §3: the item's parent directory was renamed away after the snapshot. Nothing is touched.
#[test]
fn h1_parent_moved_before_delete() {
    let root = base();
    let item = root.join("par").join("item");
    file(&item.join("a.bin"), b"aaa");
    file(&item.join("sub").join("b.bin"), b"bbbb");
    let moved = root.join("par-moved");
    let r = snapshot_change_delete(&root, &item, || fs::rename(root.join("par"), &moved).unwrap());
    assert_eq!(fs::read(moved.join("item").join("a.bin")).unwrap(), b"aaa", "CONTROLLER_H1_PARENT_GONE: moved content touched");
    assert_eq!(fs::read(moved.join("item").join("sub").join("b.bin")).unwrap(), b"bbbb", "CONTROLLER_H1_PARENT_GONE: moved content touched");
    assert_eq!(r.status, ItemStatus::Skipped, "CONTROLLER_H1_PARENT_GONE: status");
    assert_eq!(r.skip_reason, Some(SkipReason::Gone), "CONTROLLER_H1_PARENT_GONE: reason");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("0", 0), "CONTROLLER_H1_PARENT_GONE: freed/failed");
}

/// §3: a grandparent was renamed away. Same result as the parent.
#[test]
fn h1_grandparent_moved_before_delete() {
    let root = base();
    let item = root.join("gp").join("par").join("item");
    file(&item.join("a.bin"), b"aaa");
    let moved = root.join("gp-moved");
    let r = snapshot_change_delete(&root, &item, || fs::rename(root.join("gp"), &moved).unwrap());
    assert_eq!(fs::read(moved.join("par").join("item").join("a.bin")).unwrap(), b"aaa", "CONTROLLER_H1_GRANDPARENT_GONE: moved content touched");
    assert_eq!(r.status, ItemStatus::Skipped, "CONTROLLER_H1_GRANDPARENT_GONE: status");
    assert_eq!(r.skip_reason, Some(SkipReason::Gone), "CONTROLLER_H1_GRANDPARENT_GONE: reason");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("0", 0), "CONTROLLER_H1_GRANDPARENT_GONE: freed/failed");
}

/// §3 with a twist: the parent was moved away and a new parent with a new item of the same name
/// took its place. The newcomer is a different object: skipped/changed, nothing on either side touched.
#[test]
fn h1_parent_replaced_with_same_named_item() {
    let root = base();
    let item = root.join("par").join("item");
    file(&item.join("a.bin"), b"original");
    let moved = root.join("par-old");
    let r = snapshot_change_delete(&root, &item, || {
        fs::rename(root.join("par"), &moved).unwrap();
        file(&item.join("a.bin"), b"newcomer");
    });
    assert_eq!(fs::read(item.join("a.bin")).unwrap(), b"newcomer", "CONTROLLER_H1_PARENT_REPLACED: newcomer touched");
    assert_eq!(fs::read(moved.join("item").join("a.bin")).unwrap(), b"original", "CONTROLLER_H1_PARENT_REPLACED: moved original touched");
    assert_eq!(r.status, ItemStatus::Skipped, "CONTROLLER_H1_PARENT_REPLACED: status");
    assert_eq!(r.skip_reason, Some(SkipReason::Changed), "CONTROLLER_H1_PARENT_REPLACED: reason");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("0", 0), "CONTROLLER_H1_PARENT_REPLACED: freed/failed");
}

/// §4: a file with another hard link outside the item frees nothing; the others count exactly.
#[test]
fn h1_hardlink_outside_not_counted() {
    let root = base();
    let item = root.join("item");
    file(&item.join("a.bin"), &[1u8; 100]);
    file(&item.join("b.bin"), &[2u8; 200]);
    file(&item.join("c.bin"), &[3u8; 300]);
    let outside = root.join("outside-link.bin");
    fs::hard_link(item.join("c.bin"), &outside).unwrap();
    let r = snapshot_change_delete(&root, &item, || {});
    assert_eq!(fs::read(&outside).unwrap(), vec![3u8; 300], "CONTROLLER_H1_LINK: outside name lost or changed");
    assert!(fs::symlink_metadata(&item).is_err(), "CONTROLLER_H1_LINK: item survived");
    assert_eq!(r.status, ItemStatus::Deleted, "CONTROLLER_H1_LINK: status");
    assert_eq!(r.bytes_before, "600", "CONTROLLER_H1_LINK: bytes_before");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("300", 0), "CONTROLLER_H1_LINK: freed counts a and b only");
}

/// §4: two names of one file both inside the item. The first name is removed while another name
/// still holds the data (not counted); the last name frees the data once.
#[test]
fn h1_hardlink_both_inside_counted_once() {
    let root = base();
    let item = root.join("item");
    file(&item.join("c1.bin"), &[3u8; 300]);
    fs::hard_link(item.join("c1.bin"), item.join("c2.bin")).unwrap();
    let r = snapshot_change_delete(&root, &item, || {});
    assert!(fs::symlink_metadata(&item).is_err(), "CONTROLLER_H1_LINK_INSIDE: item survived");
    assert_eq!(r.status, ItemStatus::Deleted, "CONTROLLER_H1_LINK_INSIDE: status");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("300", 0), "CONTROLLER_H1_LINK_INSIDE: the data is freed once");
}

/// §4: the file grew after the snapshot. Freed is the size at deletion, so it exceeds bytes_before.
#[test]
fn h1_file_grew_after_snapshot() {
    let root = base();
    let item = root.join("item");
    let g = item.join("g.bin");
    file(&g, &[4u8; 50]);
    let r = snapshot_change_delete(&root, &item, || {
        let mut f = OpenOptions::new().append(true).open(&g).unwrap();
        f.write_all(&[5u8; 4950]).unwrap();
    });
    assert!(fs::symlink_metadata(&item).is_err(), "CONTROLLER_H1_GREW: item survived");
    assert_eq!(r.bytes_before, "50", "CONTROLLER_H1_GREW: bytes_before keeps the snapshot");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("5000", 0), "CONTROLLER_H1_GREW: freed is the size at deletion");
}

/// §4: the file shrank after the snapshot. Freed is the size at deletion.
#[test]
fn h1_file_shrank_after_snapshot() {
    let root = base();
    let item = root.join("item");
    let g = item.join("g.bin");
    file(&g, &[4u8; 5000]);
    let r = snapshot_change_delete(&root, &item, || OpenOptions::new().write(true).open(&g).unwrap().set_len(10).unwrap());
    assert!(fs::symlink_metadata(&item).is_err(), "CONTROLLER_H1_SHRANK: item survived");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("10", 0), "CONTROLLER_H1_SHRANK: freed is the size at deletion");
}

/// §2: an application recreates `aaa\f00000.bin` right after Water deletes it, so `aaa` and the
/// item cannot be removed. The recreated file is new content: not touched, not a failure, partial.
#[test]
fn h1_recreated_name_not_failed() {
    let root = base();
    let item = root.join("item");
    let aaa = item.join("aaa");
    fs::create_dir_all(&aaa).unwrap();
    for i in 0..5000 {
        fs::write(aaa.join(format!("f{i:05}.bin")), b"b").unwrap();
    }
    file(&item.join("zzz").join("x.bin"), b"xyz");
    let first = aaa.join("f00000.bin");
    let plan = plan_for(&root, &item);
    let before = snapshot(&plan.items[0], &[], &[]).expect("CONTROLLER snapshot");
    let done = Arc::new(AtomicBool::new(false));
    let (watch, flag) = (first.clone(), done.clone());
    let helper = thread::spawn(move || {
        while fs::symlink_metadata(&watch).is_ok() {
            if flag.load(Ordering::SeqCst) {
                return false;
            }
            thread::yield_now();
        }
        OpenOptions::new().write(true).create_new(true).open(&watch).and_then(|mut f| f.write_all(b"recreated")).is_ok()
    });
    let (r, interrupted) = delete(&plan.items[0], &before, &StopFlag::default());
    done.store(true, Ordering::SeqCst);
    let recreated = helper.join().unwrap();
    report(&r);
    assert!(!interrupted, "CONTROLLER_H1: no stop was requested");
    assert!(recreated, "CONTROLLER race lost: the name was not recreated before aaa was removed; rerun");
    assert_eq!(fs::read(&first).unwrap(), b"recreated", "CONTROLLER_H1_RECREATED: recreated file touched");
    assert_eq!(fs::read_dir(&aaa).unwrap().count(), 1, "CONTROLLER_H1_RECREATED: planned files kept");
    assert!(fs::symlink_metadata(item.join("zzz")).is_err(), "CONTROLLER_H1_RECREATED: deletion stopped after aaa");
    assert_eq!(r.failed_entries, 0, "CONTROLLER_H1_RECREATED: the recreated name was counted as a failure");
    assert_eq!(r.status, ItemStatus::Partial, "CONTROLLER_H1_RECREATED: status");
    assert_eq!(r.bytes_freed, "5003", "CONTROLLER_H1_RECREATED: freed is every planned file");
}

/// §5: a directory whose name is not valid UTF-16 (an unpaired surrogate) holds a file. It is
/// neither entered nor silently skipped: at least one failure (CLEAN-M2 §6 asks for at least 1),
/// and the directory and its file stay. H1 reports 2: the skipped directory once, and once more
/// because its residual cannot be measured (the residual-unknown rule).
#[test]
fn h1_unpaired_directory_name() {
    let root = base();
    let item = root.join("item");
    file(&item.join("ok.bin"), b"okay");
    let odd = item.join(OsString::from_wide(&[0x0064, 0xD800, 0x0064]));
    fs::create_dir(&odd).unwrap();
    file(&odd.join("inside.bin"), b"inside");
    let r = snapshot_change_delete(&root, &item, || {});
    assert_eq!(fs::read(odd.join("inside.bin")).unwrap(), b"inside", "CONTROLLER_H1_UNPAIRED_DIR: content of the odd directory touched");
    assert!(fs::symlink_metadata(item.join("ok.bin")).is_err(), "CONTROLLER_H1_UNPAIRED_DIR: valid sibling kept");
    assert_ne!(r.status, ItemStatus::Deleted, "CONTROLLER_H1_UNPAIRED_DIR: reported deleted while content remains");
    assert!(r.failed_entries >= 1, "CONTROLLER_H1_UNPAIRED_DIR: the odd directory was silently skipped");
    assert_eq!(r.bytes_freed, "4", "CONTROLLER_H1_UNPAIRED_DIR: freed is the valid sibling");
}
