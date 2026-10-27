// Controller deep-tree case for WATER-W5-H1 (CLEAN-M2 §1), kept apart from the other cases because
// on a recursive source it overflows the stack and kills the whole test process. A 4000-level chain
// of directories named `d` with one file at the bottom, created through \?\; the crate's own
// snapshot and delete run on a thread with a 256 KiB stack. Copied into an acceptance tree as
// packages/junk-clean/src/controller_unit.rs (#[cfg(test)] module), removed afterwards. The fixture
// lives under <tree>/.local/w5-h1-controller/deep-<nonce>/.
use crate::native_windows::{delete, snapshot};
use crate::*;
use serde_json::json;
use std::{
    fs,
    hash::{BuildHasher, RandomState},
    path::PathBuf,
    time::SystemTime,
};

#[test]
fn h1_deep_tree_small_stack() {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
    let tree = manifest.parent().unwrap().parent().unwrap().to_path_buf();
    let nonce = RandomState::new().hash_one((SystemTime::now(), std::process::id()));
    let root = tree.join(".local").join("w5-h1-controller").join(format!("deep-{nonce:016x}"));
    let item = root.join("item");
    fs::create_dir_all(&item).unwrap();
    let mut cur = PathBuf::from(format!(r"\\?\{}", item.display()));
    for _ in 0..4000 {
        cur.push("d");
        fs::create_dir(&cur).unwrap();
    }
    fs::write(cur.join("leaf"), b"deep").unwrap();
    let s = |p: &PathBuf| p.to_str().unwrap().to_owned();
    let v = json!({"plan_version":"water.clean-plan.v1","plan_id":"controller-h1-deep",
        "created_at":"2026-10-28T00:00:00Z","protected_paths":[],"hard_guards":[],
        "items":[{"item_id":"deep","group_id":"synthetic","rule_id":"fixture-rule","level":"recommended",
            "path":s(&item),"root":s(&root),"kind":"dir","identity":identity_of(&s(&item)).unwrap(),
            "total_bytes":"4","min_age_hours":0}]});
    let plan = CleanPlan::from_json(&v.to_string()).unwrap();
    let r = std::thread::Builder::new()
        .stack_size(256 * 1024)
        .spawn(move || {
            let before = snapshot(&plan.items[0], &[], &[]).expect("CONTROLLER snapshot");
            delete(&plan.items[0], &before, &StopFlag::default()).0
        })
        .unwrap()
        .join()
        .expect("CONTROLLER_H1_DEEP: worker thread panicked");
    eprintln!("CONTROLLER h1 deep: status {:?} failed {} freed {} of {}", r.status, r.failed_entries, r.bytes_freed, r.bytes_before);
    assert_eq!(r.status, ItemStatus::Deleted, "CONTROLLER_H1_DEEP: status");
    assert_eq!((r.bytes_freed.as_str(), r.failed_entries), ("4", 0), "CONTROLLER_H1_DEEP: freed/failed");
    assert!(fs::symlink_metadata(&item).is_err(), "CONTROLLER_H1_DEEP: item survived");
}
