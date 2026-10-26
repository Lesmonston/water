// Controller's independent synthetic cases for WATER-W2-D (water-junk-clean).
// Copied into an acceptance tree as tests/controller_cases.rs; fixtures live only under
// <tree>/.local/w2-d-controller/case-<nonce>/ and are left in place for inspection.
use std::{
    fs::{self, OpenOptions},
    hash::{BuildHasher, RandomState},
    os::windows::fs::OpenOptionsExt,
    path::{Path, PathBuf},
    process::Command,
    time::SystemTime,
};
use water_junk_clean::*;

struct NoObs;
impl CleanObserver for NoObs {
    fn on_item(&self, _: usize, _: usize, _: u64, _: &str) {}
}
struct Busy;
impl ItemGuard for Busy {
    fn in_use(&self, _: &PlanItem) -> Option<String> {
        Some("busy.exe".into())
    }
}

fn base() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
    let tree = manifest.parent().unwrap().parent().unwrap().to_path_buf();
    let parent = tree.join(".local").join("w2-d-controller");
    fs::create_dir_all(&parent).unwrap();
    let nonce = RandomState::new().hash_one((SystemTime::now(), std::process::id()));
    let b = parent.join(format!("case-{nonce:016x}"));
    fs::create_dir(&b).unwrap();
    b
}
fn s(p: &Path) -> String {
    p.to_str().unwrap().to_string()
}
fn write(p: &Path, data: &[u8]) {
    fs::create_dir_all(p.parent().unwrap()).unwrap();
    fs::write(p, data).unwrap();
}
fn junction(link: &Path, target: &Path) {
    let out = Command::new("cmd")
        .args(["/D", "/C", "mklink", "/J"])
        .arg(link)
        .arg(target)
        .output()
        .unwrap();
    assert!(out.status.success(), "mklink failed");
}
fn item(id: &str, root: &Path, path: &Path, kind: Kind, min_age_hours: u64) -> PlanItem {
    PlanItem {
        item_id: id.into(),
        group_id: "g".into(),
        rule_id: "r".into(),
        level: Level::Recommended,
        path: s(path),
        root: s(root),
        kind,
        identity: identity_of(&s(path)).expect("identity at plan time"),
        total_bytes: "0".into(),
        min_age_hours,
    }
}
fn plan(items: Vec<PlanItem>, protected: Vec<String>, guards: Vec<String>) -> CleanPlan {
    CleanPlan {
        plan_version: "water.clean-plan.v1".into(),
        plan_id: "controller".into(),
        created_at: "2026-10-26T00:00:00Z".into(),
        items,
        protected_paths: protected,
        hard_guards: guards,
    }
}
fn json(p: &CleanPlan) -> String {
    serde_json::to_string(p).unwrap()
}
fn run(p: &CleanPlan, guard: &dyn ItemGuard, stop: &StopFlag) -> (CleanReport, String) {
    let parsed = CleanPlan::from_json(&json(p)).expect("plan must parse");
    let mut journal = Vec::new();
    let report = execute(&parsed, guard, &mut journal, stop, &NoObs, SystemTime::now())
        .expect("execute");
    (report, String::from_utf8(journal).unwrap())
}
fn status(r: &CleanReport, id: &str) -> (ItemStatus, Option<SkipReason>, u64) {
    let i = r.items.iter().find(|i| i.item_id == id).unwrap();
    (i.status, i.skip_reason, i.failed_entries)
}

#[test]
fn ctl_junctions_never_followed() {
    let b = base();
    let root = b.join("root");
    // A junction inside the item points outside: only the link may go.
    write(&b.join("out1").join("keep.txt"), b"outside-1");
    write(&root.join("item1").join("a.txt"), b"a");
    write(&root.join("item1").join("sub").join("b.txt"), b"bb");
    let ro = root.join("item1").join("ro.txt");
    write(&ro, b"readonly");
    let mut perm = fs::metadata(&ro).unwrap().permissions();
    perm.set_readonly(true);
    fs::set_permissions(&ro, perm).unwrap();
    junction(&root.join("item1").join("link"), &b.join("out1"));
    // A junction between root and item.
    write(&b.join("out2").join("victim").join("v.txt"), b"outside-2");
    junction(&root.join("mid"), &b.join("out2"));
    // The item itself is a junction.
    write(&b.join("out3").join("z.txt"), b"outside-3");
    junction(&root.join("jitem"), &b.join("out3"));
    // The root itself is a junction.
    write(&b.join("out4").join("x").join("y.txt"), b"outside-4");
    junction(&b.join("jroot"), &b.join("out4"));
    let items = vec![
        item("inner", &root, &root.join("item1"), Kind::Dir, 0),
        item("mid", &root, &root.join("mid").join("victim"), Kind::Dir, 0),
        item("self", &root, &root.join("jitem"), Kind::Dir, 0),
        item("jroot", &b.join("jroot"), &b.join("jroot").join("x"), Kind::Dir, 0),
    ];
    let (r, journal) = run(&plan(items, vec![], vec![]), &NoGuard, &StopFlag::default());
    assert_eq!(status(&r, "inner").0, ItemStatus::Deleted, "inner item deleted");
    assert!(fs::symlink_metadata(root.join("item1")).is_err(), "item removed");
    assert_eq!(fs::read(b.join("out1").join("keep.txt")).unwrap(), b"outside-1", "CTL_NO_FOLLOW inner junction target kept");
    assert_eq!(status(&r, "mid").1, Some(SkipReason::OutsideRoot), "CTL_ROOT_BOUND intermediate junction");
    assert_eq!(fs::read(b.join("out2").join("victim").join("v.txt")).unwrap(), b"outside-2");
    assert_eq!(status(&r, "self").1, Some(SkipReason::Reparse), "CTL_REPARSE item is a junction");
    assert!(fs::symlink_metadata(root.join("jitem")).is_ok(), "skipped junction left alone");
    assert_eq!(fs::read(b.join("out3").join("z.txt")).unwrap(), b"outside-3");
    assert_eq!(status(&r, "jroot").1, Some(SkipReason::OutsideRoot), "CTL_ROOT_BOUND root is a junction");
    assert_eq!(fs::read(b.join("out4").join("x").join("y.txt")).unwrap(), b"outside-4");
    let freed: u64 = r.freed_bytes.parse().unwrap();
    assert_eq!(freed, 1 + 2 + 8, "freed counts a.txt, b.txt and ro.txt only");
    for id in ["inner", "mid", "self", "jroot"] {
        let intent = journal
            .lines()
            .position(|l| l.contains("\"intent\"") && l.contains(&format!("\"item_id\":\"{id}\"")))
            .unwrap_or_else(|| panic!("intent for {id}"));
        let result = journal
            .lines()
            .position(|l| l.contains("\"result\"") && l.contains(&format!("\"item_id\":\"{id}\"")))
            .unwrap_or_else(|| panic!("result for {id}"));
        assert!(intent < result, "intent before result for {id}");
    }
}

#[test]
fn ctl_revalidation_and_locks() {
    let b = base();
    let root = b.join("root");
    let swap = root.join("swap.txt");
    write(&swap, b"original");
    write(&root.join("kind").join("k.txt"), b"k");
    write(&root.join("locked").join("held.txt"), b"held");
    write(&root.join("locked").join("free.txt"), b"free");
    write(&root.join("fresh").join("f.txt"), b"fresh");
    // Keep a handle to the original so its file id cannot be recycled by the replacement.
    let keep = OpenOptions::new().read(true).open(&swap).unwrap();
    let items = vec![
        item("swap", &root, &swap, Kind::File, 0),
        item("kind", &root, &root.join("kind"), Kind::Dir, 0),
        item("locked", &root, &root.join("locked"), Kind::Dir, 0),
        item("fresh", &root, &root.join("fresh"), Kind::Dir, 24),
    ];
    // After planning: replace swap.txt by a new file of the same name; turn kind into a file.
    fs::rename(&swap, root.join("swap-old.txt")).unwrap();
    write(&swap, b"replacement");
    drop(keep);
    fs::remove_file(root.join("kind").join("k.txt")).unwrap();
    fs::remove_dir(root.join("kind")).unwrap();
    write(&root.join("kind"), b"now-a-file");
    let held = OpenOptions::new()
        .read(true)
        .share_mode(0)
        .open(root.join("locked").join("held.txt"))
        .unwrap();
    let (r, _) = run(&plan(items, vec![], vec![]), &NoGuard, &StopFlag::default());
    drop(held);
    assert_eq!(status(&r, "swap").1, Some(SkipReason::Changed), "CTL_IDENTITY same-name replacement");
    assert_eq!(fs::read(&swap).unwrap(), b"replacement");
    assert_eq!(status(&r, "kind").1, Some(SkipReason::Changed), "CTL_IDENTITY directory became a file");
    assert_eq!(fs::read(root.join("kind")).unwrap(), b"now-a-file");
    let (st, _, failed) = status(&r, "locked");
    assert_eq!(st, ItemStatus::Partial, "exclusively locked file makes the item partial");
    assert!(failed >= 1);
    assert!(root.join("locked").join("held.txt").exists());
    assert!(!root.join("locked").join("free.txt").exists());
    assert_eq!(status(&r, "fresh").1, Some(SkipReason::TooRecent));
    assert!(root.join("fresh").join("f.txt").exists());
    // The guard reports the item in use.
    write(&root.join("busy").join("u.txt"), b"u");
    let busy = || plan(vec![item("busy", &root, &root.join("busy"), Kind::Dir, 0)], vec![], vec![]);
    let (r, _) = run(&busy(), &Busy, &StopFlag::default());
    assert_eq!(status(&r, "busy").1, Some(SkipReason::InUse));
    assert!(root.join("busy").join("u.txt").exists());
    // A stop requested before execution deletes nothing.
    let stop = StopFlag::default();
    stop.stop();
    let (r, _) = run(&busy(), &NoGuard, &stop);
    assert_ne!(status(&r, "busy").0, ItemStatus::Deleted);
    assert!(root.join("busy").join("u.txt").exists(), "CTL_STOP nothing deleted");
}

#[test]
fn ctl_plan_rejections() {
    let b = base();
    let root = b.join("root");
    write(&root.join("a").join("inner").join("p.txt"), b"p");
    write(&b.join("root2").join("x.txt"), b"x");
    let ok = item("a", &root, &root.join("a"), Kind::Dir, 0);
    assert!(CleanPlan::from_json(&json(&plan(vec![ok.clone()], vec![], vec![]))).is_ok());
    // root2 shares the textual prefix "root" but is a sibling.
    let sibling = item("sib", &root, &b.join("root2"), Kind::Dir, 0);
    assert!(
        CleanPlan::from_json(&json(&plan(vec![sibling], vec![], vec![]))).is_err(),
        "CTL_ROOT_BOUND name-prefix sibling accepted"
    );
    let mut equal_root = ok.clone();
    equal_root.path = s(&root);
    assert!(CleanPlan::from_json(&json(&plan(vec![equal_root], vec![], vec![]))).is_err(), "item equal to root");
    for g in [s(&root.join("a")), s(&root.join("a").join("inner"))] {
        assert!(
            CleanPlan::from_json(&json(&plan(vec![ok.clone()], vec![], vec![g.clone()]))).is_err(),
            "hard guard equal to or inside the item accepted: {g}"
        );
    }
    assert!(
        CleanPlan::from_json(&json(&plan(vec![ok.clone()], vec![], vec![s(&b)]))).is_ok(),
        "a guard above the root is fine"
    );
    for p in [s(&root.join("a").join("inner")), s(&root.join("a")), s(&root)] {
        assert!(
            CleanPlan::from_json(&json(&plan(vec![ok.clone()], vec![p.clone()], vec![]))).is_err(),
            "protected overlap accepted: {p}"
        );
    }
    let upper = s(&root.join("A").join("INNER"));
    assert!(
        CleanPlan::from_json(&json(&plan(vec![ok.clone()], vec![upper], vec![]))).is_err(),
        "protected overlap must ignore ASCII case"
    );
    for bad in [
        "relative\\a",
        "F:/new/a",
        "F:\\new\\a\\..\\b",
        "F:\\new\\a.",
        "F:\\new\\a ",
        "\\\\?\\F:\\new\\a",
        "\\\\server\\share\\a",
        "F:\\new\\NUL",
    ] {
        let mut x = ok.clone();
        x.path = bad.into();
        assert!(
            CleanPlan::from_json(&json(&plan(vec![x], vec![], vec![]))).is_err(),
            "bad path accepted: {bad}"
        );
    }
    // Protection added after parsing is still enforced at execution time.
    let mut parsed = CleanPlan::from_json(&json(&plan(vec![ok], vec![], vec![]))).unwrap();
    parsed.protected_paths.push(s(&root.join("a").join("inner")));
    let mut journal = Vec::new();
    let r = execute(&parsed, &NoGuard, &mut journal, &StopFlag::default(), &NoObs, SystemTime::now());
    if let Ok(r) = r {
        assert_eq!(status(&r, "a").1, Some(SkipReason::ProtectedOverlap));
    }
    assert!(root.join("a").join("inner").join("p.txt").exists(), "CTL_PROTECTED kept");
}
