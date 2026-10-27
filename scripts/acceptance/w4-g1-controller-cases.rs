// Controller's synthetic combination cases for WATER-W4-G1 (junk-clean by-handle deletion).
// Copied into an acceptance tree as packages/junk-clean/tests/controller_cases.rs with its own
// [[test]] entry, removed afterwards. Fixtures live only under <tree>/.local/w4-g1-controller/
// case-<nonce>/ and are left in place for inspection. Junctions use `cmd /c mklink /J`, the custom
// reparse tag the same PowerShell/DeviceIoControl helper as clean_v1.rs. Nothing outside the
// fixture is read or written; every deletion goes through water_junk_clean::execute.
// Round 2 (addendum 01) adds races during deletion, the by-handle residual and a 100k timing case.
// WATER-W4-G5: failure counts follow CLEAN-REPORT §3 (each retained object counted once).
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    fs::{self, OpenOptions},
    hash::{BuildHasher, RandomState},
    io::Write,
    os::windows::fs::MetadataExt,
    path::{Path, PathBuf},
    process::Command,
    time::SystemTime,
};
use water_junk_clean::*;

const REPARSE: u32 = 0x400;

fn base() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
    let tree = manifest.parent().unwrap().parent().unwrap().to_path_buf();
    let parent = tree.join(".local").join("w4-g1-controller");
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

fn junction(link: &Path, target: &Path) {
    let out = Command::new("cmd").args(["/D", "/C", "mklink", "/J"]).arg(link).arg(target).output().unwrap();
    assert!(out.status.success(), "CONTROLLER mklink /J failed");
    assert_ne!(fs::symlink_metadata(link).unwrap().file_attributes() & REPARSE, 0);
}

fn readonly(p: &Path) {
    let mut perm = fs::metadata(p).unwrap().permissions();
    perm.set_readonly(true);
    fs::set_permissions(p, perm).unwrap();
}

/// Every file and directory below `dir` (relative path -> size or kind); links listed, never entered.
fn inventory(root: &Path, dir: &Path, out: &mut BTreeMap<String, String>) {
    for entry in fs::read_dir(dir).unwrap() {
        let p = entry.unwrap().path();
        let rel = s(p.strip_prefix(root).unwrap());
        let m = fs::symlink_metadata(&p).unwrap();
        if m.file_attributes() & REPARSE != 0 {
            out.insert(rel, "reparse".into());
        } else if m.is_dir() {
            out.insert(rel.clone(), "dir".into());
            inventory(root, &p, out);
        } else {
            out.insert(rel, format!("{} bytes", m.len()));
        }
    }
}

fn snapshot_of(root: &Path) -> BTreeMap<String, String> {
    let mut m = BTreeMap::new();
    inventory(root, root, &mut m);
    m
}

fn size(p: &Path) -> u64 {
    let Ok(m) = fs::symlink_metadata(p) else { return 0 };
    if m.file_attributes() & REPARSE != 0 {
        0
    } else if m.is_dir() {
        fs::read_dir(p).unwrap().map(|e| size(&e.unwrap().path())).sum()
    } else {
        m.len()
    }
}

fn item(root: &Path, path: &Path, id: &str) -> Value {
    json!({"item_id":id,"group_id":"synthetic","rule_id":"fixture-rule","level":"recommended",
        "path":s(path),"root":s(root),"kind":"dir",
        "identity":identity_of(&s(path)).unwrap(),"total_bytes":size(path).to_string(),"min_age_hours":0})
}

fn plan(items: Vec<Value>, protected: Vec<String>, guards: Vec<String>) -> CleanPlan {
    let v = json!({"plan_version":"water.clean-plan.v1","plan_id":"controller-plan",
        "created_at":"2026-10-27T00:00:00Z","items":items,"protected_paths":protected,"hard_guards":guards});
    CleanPlan::from_json(&v.to_string()).unwrap()
}

struct Quiet;
impl CleanObserver for Quiet {
    fn on_item(&self, _: usize, _: usize, _: u64, _: &str) {}
}

fn run(p: &CleanPlan) -> CleanReport {
    execute(p, &NoGuard, &mut Vec::new(), &StopFlag::default(), &Quiet, SystemTime::now()).unwrap()
}

/// A directory chain under `start` whose deepest file path is longer than 300 characters.
fn deep(start: &Path, leaf: &str, data: &[u8]) -> PathBuf {
    let mut p = start.to_path_buf();
    while s(&p).len() < 320 {
        p = p.join("segment-of-a-deliberately-long-directory-name");
    }
    let f = p.join(leaf);
    file(&f, data);
    assert!(s(&f).len() > 300, "CONTROLLER long path fixture too short");
    f
}

/// An item inside a protected directory, where the protected path is spelled through a junction
/// alias of that directory: the text check misses it, the ancestor identity check must refuse.
#[test]
fn controller_ancestor_alias_protected() {
    let root = base();
    let vault = root.join("vault");
    let cache = vault.join("cache");
    file(&cache.join("a.bin"), b"cache-bytes");
    file(&vault.join("secret.txt"), b"protected");
    junction(&root.join("alias"), &vault);
    let before = snapshot_of(&root);
    let p = plan(vec![item(&root, &cache, "inside-protected")], vec![s(&root.join("alias"))], vec![]);
    let r = run(&p);
    eprintln!("CONTROLLER ancestor alias: status {:?} reason {:?}", r.items[0].status, r.items[0].skip_reason);
    assert_eq!(r.items[0].status, ItemStatus::Skipped, "CONTROLLER_ANCESTOR: item inside an aliased protected directory was not refused");
    assert_eq!(r.items[0].skip_reason, Some(SkipReason::ProtectedOverlap), "CONTROLLER_ANCESTOR: reason");
    assert_eq!(snapshot_of(&root), before, "CONTROLLER_ANCESTOR: files changed");
}

/// One item mixing a >300-character subtree, a read-only file, a junction to data outside the
/// item, a junction back to an ancestor (cycle) and a hard link to a file outside the item.
/// Everything inside goes; nothing outside changes.
#[test]
fn controller_combination_delete() {
    let root = base();
    let item_dir = root.join("combo");
    let long_file = deep(&item_dir.join("deep"), "leaf.bin", b"long-path-bytes");
    let ro = item_dir.join("ro.bin");
    file(&ro, b"read-only-bytes");
    readonly(&ro);
    let victim = root.join("victim");
    file(&victim.join("keep.bin"), b"must-survive");
    junction(&item_dir.join("out"), &victim);
    junction(&item_dir.join("up"), &root);
    let outside = root.join("outside.bin");
    file(&outside, b"outside-data");
    fs::hard_link(&outside, item_dir.join("hardlink.bin")).unwrap();
    let mut before = snapshot_of(&root);
    before.retain(|k, _| !k.starts_with("combo"));
    let p = plan(vec![item(&root, &item_dir, "combination")], vec![], vec![]);
    let r = run(&p);
    eprintln!("CONTROLLER combination: status {:?} freed {}", r.items[0].status, r.freed_bytes);
    assert_eq!(r.items[0].status, ItemStatus::Deleted, "CONTROLLER_COMBO: item not fully deleted");
    assert!(fs::symlink_metadata(&item_dir).is_err(), "CONTROLLER_COMBO: item directory survived");
    assert!(fs::symlink_metadata(&long_file).is_err(), "CONTROLLER_COMBO: long-path file survived");
    let after = snapshot_of(&root);
    assert_eq!(after, before, "CONTROLLER_COMBO: something outside the item changed");
    assert_eq!(fs::read(victim.join("keep.bin")).unwrap(), b"must-survive", "CONTROLLER_COMBO: junction target touched");
    assert_eq!(fs::read(&outside).unwrap(), b"outside-data", "CONTROLLER_COMBO: hard-linked outside file damaged");
    assert_eq!(fs::metadata(&outside).unwrap().file_attributes() & 1, 0, "CONTROLLER_COMBO: outside file attributes changed");
}

/// A custom (non-link) reparse tag deep in a >300-character subtree freezes the whole item.
#[test]
fn controller_custom_tag_deep() {
    let root = base();
    let item_dir = root.join("tagged");
    file(&item_dir.join("sibling.bin"), b"sibling");
    let deep_file = deep(&item_dir.join("deep"), "stamped.bin", b"stamped");
    set_custom_reparse(&deep_file);
    assert_ne!(fs::symlink_metadata(&deep_file).unwrap().file_attributes() & REPARSE, 0, "CONTROLLER tag not stamped");
    let p = plan(vec![item(&root, &item_dir, "custom-tag-deep")], vec![], vec![]);
    let before = snapshot_of(&root);
    let r = run(&p);
    eprintln!("CONTROLLER custom tag deep: status {:?} reason {:?}", r.items[0].status, r.items[0].skip_reason);
    assert_eq!(r.items[0].status, ItemStatus::Skipped, "CONTROLLER_TAG: item with a deep custom reparse point was not frozen");
    assert_eq!(r.items[0].skip_reason, Some(SkipReason::Reparse), "CONTROLLER_TAG: reason");
    assert_eq!(snapshot_of(&root), before, "CONTROLLER_TAG: files changed");
}

/// An item whose path runs through a junction in an ancestor is refused; the real target stays.
#[test]
fn controller_item_through_alias() {
    let root = base();
    let real = root.join("real");
    file(&real.join("cache").join("a.bin"), b"real-cache");
    junction(&root.join("j"), &real);
    let through = root.join("j").join("cache");
    let p = plan(vec![item(&root, &through, "through-alias")], vec![], vec![]);
    let before = snapshot_of(&root);
    let r = run(&p);
    eprintln!("CONTROLLER through alias: status {:?} reason {:?}", r.items[0].status, r.items[0].skip_reason);
    assert_eq!(r.items[0].status, ItemStatus::Skipped, "CONTROLLER_ALIAS: item reached through an ancestor junction was not refused");
    assert_eq!(snapshot_of(&root), before, "CONTROLLER_ALIAS: files changed");
}

/// An item whose own path is longer than 300 characters: planning identity, revalidation and
/// guard resolution open it by name, so this needs the \\?\ prefix end to end.
#[test]
fn controller_long_item_path() {
    let root = base();
    let leaf = deep(&root.join("long"), "x.bin", b"x");
    let item_dir = leaf.parent().unwrap().join("item");
    file(&item_dir.join("a.bin"), b"inside-a-long-item");
    assert!(s(&item_dir).len() > 300, "CONTROLLER item path too short");
    let p = plan(vec![item(&root, &item_dir, "long-item")], vec![s(&root.join("unrelated-protected"))], vec![]);
    let r = run(&p);
    eprintln!("CONTROLLER long item path: status {:?} reason {:?}", r.items[0].status, r.items[0].skip_reason);
    assert_eq!(r.items[0].status, ItemStatus::Deleted, "CONTROLLER_LONG_ITEM: an item with a >300-character path was not deleted");
    assert!(fs::symlink_metadata(&item_dir).is_err(), "CONTROLLER_LONG_ITEM: item survived");
    assert_eq!(fs::read(&leaf).unwrap(), b"x", "CONTROLLER_LONG_ITEM: sibling outside the item touched");
}

/// Directory symbolic links behave like junctions when the account may create them; skipped otherwise.
#[test]
fn controller_directory_symlink() {
    let root = base();
    let item_dir = root.join("withlink");
    file(&item_dir.join("a.bin"), b"inside");
    let victim = root.join("victim");
    file(&victim.join("keep.bin"), b"must-survive");
    let out = Command::new("cmd").args(["/D", "/C", "mklink", "/D"]).arg(item_dir.join("sym")).arg(&victim).output().unwrap();
    if !out.status.success() {
        eprintln!("CONTROLLER directory symlink: not permitted for this account, case skipped");
        return;
    }
    let p = plan(vec![item(&root, &item_dir, "dir-symlink")], vec![], vec![]);
    let r = run(&p);
    eprintln!("CONTROLLER directory symlink: status {:?}", r.items[0].status);
    assert_eq!(r.items[0].status, ItemStatus::Deleted, "CONTROLLER_SYMLINK: item not deleted");
    assert_eq!(fs::read(victim.join("keep.bin")).unwrap(), b"must-survive", "CONTROLLER_SYMLINK: symlink target touched");
}

fn set_custom_reparse(path: &Path) {
    // Same helper as clean_v1.rs: stamp tag 0x00007A57 with DeviceIoControl(FSCTL_SET_REPARSE_POINT).
    let script = r#"
$ErrorActionPreference='Stop'
$code = @'
using System;
using System.Runtime.InteropServices;
public static class W4C {
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
[W4C]::Set('\\?\' + $env:W4_TARGET)
"#;
    let utf16: Vec<u8> = script.encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
    let out = Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-EncodedCommand", &b64(&utf16)])
        .env("W4_TARGET", s(path))
        .output()
        .unwrap();
    assert!(out.status.success(), "CONTROLLER custom reparse failed: {}", String::from_utf8_lossy(&out.stderr));
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
        out.push(if chunk.len() > 1 { T[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { T[(n & 63) as usize] as char } else { '=' });
    }
    out
}

// ---- Round 2 (addendum 01) ----
// The races below need no hook in the crate: the item holds a directory "aaa" with BULK files
// that is deleted first (NTFS lists names in order). A helper thread waits until the first of
// those files is gone, i.e. the final snapshot is taken and deletion has started, then changes
// objects that the deleter will only reach after "aaa". Deleting the remaining files takes far
// longer than the change, so the order is reliable.

use std::{
    ffi::c_void,
    os::windows::fs::OpenOptionsExt,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

const BULK: usize = 5000;

#[link(name = "kernel32")]
unsafe extern "system" {
    fn CreateFileW(name: *const u16, access: u32, share: u32, sa: *const c_void, disp: u32, flags: u32, template: *mut c_void) -> *mut c_void;
    fn DeviceIoControl(h: *mut c_void, code: u32, inb: *const u8, insz: u32, outb: *mut u8, outsz: u32, ret: *mut u32, ov: *mut c_void) -> i32;
    fn CloseHandle(h: *mut c_void) -> i32;
}

fn bulk(dir: &Path) -> PathBuf {
    fs::create_dir_all(dir).unwrap();
    for i in 0..BULK {
        fs::write(dir.join(format!("f{i:05}.bin")), b"b").unwrap();
    }
    dir.join("f00000.bin")
}

/// Run `change` on a helper thread as soon as `first` is deleted; returns whether it ran.
fn after_deletion_starts(first: PathBuf, done: Arc<AtomicBool>, change: impl FnOnce() + Send + 'static) -> thread::JoinHandle<bool> {
    thread::spawn(move || {
        while fs::symlink_metadata(&first).is_ok() {
            if done.load(Ordering::SeqCst) {
                return false;
            }
            thread::yield_now();
        }
        change();
        true
    })
}

fn run_racing(p: &CleanPlan, first: PathBuf, change: impl FnOnce() + Send + 'static) -> CleanReport {
    let done = Arc::new(AtomicBool::new(false));
    let helper = after_deletion_starts(first, done.clone(), change);
    let r = run(p);
    done.store(true, Ordering::SeqCst);
    assert!(helper.join().unwrap(), "CONTROLLER race: deletion never started, nothing was changed");
    r
}

/// Turn a junction into a custom non-link reparse point in place: same directory object and
/// FileId, but the tag no longer carries the name-surrogate bit (a cloud placeholder, say).
fn retag_in_place(link: &Path) {
    let name: Vec<u16> = format!(r"\\?\{}", s(link)).encode_utf16().chain(Some(0)).collect();
    // SAFETY: NUL-terminated name; the handle is closed below.
    let h = unsafe { CreateFileW(name.as_ptr(), 0x4000_0000 | 0x80 | 0x100, 0, std::ptr::null(), 3, 0x0200_0000 | 0x0020_0000, std::ptr::null_mut()) };
    assert!(h as isize != -1 && !h.is_null(), "CONTROLLER retag open: {}", std::io::Error::last_os_error());
    let mut ret = 0u32;
    let mut del = [0u8; 8];
    del[..4].copy_from_slice(&0xA000_0003u32.to_le_bytes());
    // SAFETY: 8-byte REPARSE_DATA_BUFFER header for the mount-point tag; no output buffer.
    let ok = unsafe { DeviceIoControl(h, 0x0009_00AC, del.as_ptr(), 8, std::ptr::null_mut(), 0, &mut ret, std::ptr::null_mut()) };
    let del_err = std::io::Error::last_os_error();
    let mut set = [0u8; 28];
    set[..4].copy_from_slice(&0x0000_7A57u32.to_le_bytes());
    set[4..6].copy_from_slice(&4u16.to_le_bytes());
    set[8..24].copy_from_slice(&[0x57, 0x7a, 0x0e, 0x6f, 0x2d, 0x1c, 0x5f, 0x4e, 0x8a, 0x9b, 0x0c, 0x1d, 0x2e, 0x3f, 0x4a, 0x5b]);
    set[24..].copy_from_slice(&0x5A57_5A57u32.to_le_bytes());
    // SAFETY: 28-byte REPARSE_GUID_DATA_BUFFER with 4 data bytes; no output buffer.
    let ok2 = (ok != 0).then(|| unsafe { DeviceIoControl(h, 0x0009_00A4, set.as_ptr(), 28, std::ptr::null_mut(), 0, &mut ret, std::ptr::null_mut()) });
    let set_err = std::io::Error::last_os_error();
    // SAFETY: h is the live handle opened above.
    unsafe { CloseHandle(h) };
    assert!(ok != 0, "CONTROLLER delete mount point: {del_err}");
    assert_eq!(ok2, Some(1), "CONTROLLER set custom tag: {set_err}");
}

/// Addendum item 1: a junction inside the item becomes a non-link reparse point (same FileId)
/// after deletion started. It must not be deleted; the item ends partial with failures counted.
#[test]
fn controller_race_link_retagged() {
    let root = base();
    let item_dir = root.join("race-retag");
    let first = bulk(&item_dir.join("aaa"));
    let victim = root.join("victim");
    file(&victim.join("keep.bin"), b"must-survive");
    let link = item_dir.join("zzz-link");
    junction(&link, &victim);
    let p = plan(vec![item(&root, &item_dir, "race-retag")], vec![], vec![]);
    let l = link.clone();
    let r = run_racing(&p, first, move || retag_in_place(&l));
    let it = &r.items[0];
    eprintln!("CONTROLLER race retag: status {:?} failed {} freed {}", it.status, it.failed_entries, it.bytes_freed);
    let m = fs::symlink_metadata(&link);
    assert!(m.is_ok(), "CONTROLLER_RACE_RETAG: the retagged (non-link) reparse point was deleted");
    assert_ne!(m.unwrap().file_attributes() & REPARSE, 0, "CONTROLLER_RACE_RETAG: reparse point gone");
    assert_eq!(it.status, ItemStatus::Partial, "CONTROLLER_RACE_RETAG: status");
    // CLEAN-REPORT §3: the refused point is counted once; the item root it keeps alive is not.
    assert_eq!(it.failed_entries, 1, "CONTROLLER_RACE_RETAG: failed entries");
    assert!(fs::symlink_metadata(item_dir.join("aaa")).is_err(), "CONTROLLER_RACE_RETAG: ordinary content not deleted");
    assert_eq!(fs::read(victim.join("keep.bin")).unwrap(), b"must-survive", "CONTROLLER_RACE_RETAG: link target touched");
}

/// Addendum item 5 (directory): a planned subdirectory is replaced by a new one after deletion
/// started. The item stops there: the new directory and everything after it stay untouched.
#[test]
fn controller_race_directory_replaced() {
    let root = base();
    let item_dir = root.join("race-dir");
    let first = bulk(&item_dir.join("aaa"));
    file(&item_dir.join("mmm").join("orig.bin"), b"original");
    file(&item_dir.join("zzz").join("after.bin"), b"after-the-swap");
    let p = plan(vec![item(&root, &item_dir, "race-dir")], vec![], vec![]);
    let (mmm, moved) = (item_dir.join("mmm"), root.join("moved-away"));
    let (m2, mv2) = (mmm.clone(), moved.clone());
    let r = run_racing(&p, first, move || {
        fs::rename(&m2, &mv2).unwrap();
        file(&m2.join("new.bin"), b"replacement");
    });
    let it = &r.items[0];
    eprintln!("CONTROLLER race dir: status {:?} failed {} freed {}", it.status, it.failed_entries, it.bytes_freed);
    assert_eq!(fs::read(mmm.join("new.bin")).unwrap(), b"replacement", "CONTROLLER_RACE_DIR: replacement directory touched");
    assert_eq!(fs::read(moved.join("orig.bin")).unwrap(), b"original", "CONTROLLER_RACE_DIR: moved original touched");
    assert_eq!(fs::read(item_dir.join("zzz").join("after.bin")).unwrap(), b"after-the-swap", "CONTROLLER_RACE_DIR: deletion went on after the replaced directory");
    assert_eq!(it.status, ItemStatus::Partial, "CONTROLLER_RACE_DIR: status");
    assert_eq!(it.failed_entries, 1, "CONTROLLER_RACE_DIR: failed entries");
}

/// SPEC §4 step 7 / addendum item 5, reading "directory" as the planned (snapshot) node: a
/// planned subdirectory is replaced by a plain file after deletion started, before its parent
/// "zzz" is listed. The item must stop there, as when it is replaced by another directory.
#[test]
fn controller_race_directory_replaced_by_file() {
    let root = base();
    let item_dir = root.join("race-dir-file");
    let first = bulk(&item_dir.join("aaa"));
    file(&item_dir.join("zzz").join("mmm").join("orig.bin"), b"original");
    file(&item_dir.join("zzz").join("nnn.bin"), b"after-the-swap");
    let p = plan(vec![item(&root, &item_dir, "race-dir-file")], vec![], vec![]);
    let (mmm, moved) = (item_dir.join("zzz").join("mmm"), root.join("moved-away"));
    let (m2, mv2) = (mmm.clone(), moved.clone());
    let r = run_racing(&p, first, move || {
        fs::rename(&m2, &mv2).unwrap();
        fs::write(&m2, b"a file now").unwrap();
    });
    let it = &r.items[0];
    eprintln!("CONTROLLER race dir->file: status {:?} failed {} freed {}", it.status, it.failed_entries, it.bytes_freed);
    assert_eq!(fs::read(&mmm).unwrap(), b"a file now", "CONTROLLER_RACE_DIR_FILE: replacement file touched");
    assert_eq!(fs::read(moved.join("orig.bin")).unwrap(), b"original", "CONTROLLER_RACE_DIR_FILE: moved original touched");
    assert_eq!(fs::read(item_dir.join("zzz").join("nnn.bin")).unwrap(), b"after-the-swap", "CONTROLLER_RACE_DIR_FILE: deletion went on after the replaced directory");
    assert_eq!(it.status, ItemStatus::Partial, "CONTROLLER_RACE_DIR_FILE: status");
    assert_eq!(it.failed_entries, 1, "CONTROLLER_RACE_DIR_FILE: failed entries");
}

/// Addendum items 5 (file) and 6: a planned file is replaced and a new file appears in a planned
/// directory after deletion started. The replacement is refused and counted, deletion goes on;
/// the late file stays and its directory's refusal is not counted. CLEAN-REPORT §3 (G5): the item
/// root stays only because of the already counted replacement, so it is not counted again: 1.
#[test]
fn controller_race_file_replaced_and_late_arrival() {
    let root = base();
    let item_dir = root.join("race-file");
    let first = bulk(&item_dir.join("aaa"));
    file(&item_dir.join("mmm.bin"), b"original");
    file(&item_dir.join("nnn").join("a.bin"), b"planned");
    file(&item_dir.join("zzz").join("after.bin"), b"after-the-swap");
    let p = plan(vec![item(&root, &item_dir, "race-file")], vec![], vec![]);
    let (it_dir, moved) = (item_dir.clone(), root.join("moved.bin"));
    let mv2 = moved.clone();
    let r = run_racing(&p, first, move || {
        fs::rename(it_dir.join("mmm.bin"), &mv2).unwrap();
        file(&it_dir.join("mmm.bin"), b"replacement");
        file(&it_dir.join("nnn").join("late.bin"), b"late");
    });
    let it = &r.items[0];
    eprintln!("CONTROLLER race file+late: status {:?} failed {} freed {}", it.status, it.failed_entries, it.bytes_freed);
    assert_eq!(fs::read(item_dir.join("mmm.bin")).unwrap(), b"replacement", "CONTROLLER_RACE_FILE: replacement file deleted");
    assert_eq!(fs::read(&moved).unwrap(), b"original", "CONTROLLER_RACE_FILE: moved original touched");
    assert_eq!(fs::read(item_dir.join("nnn").join("late.bin")).unwrap(), b"late", "CONTROLLER_RACE_LATE: late file deleted");
    assert!(fs::symlink_metadata(item_dir.join("nnn").join("a.bin")).is_err(), "CONTROLLER_RACE_LATE: planned file kept");
    assert!(fs::symlink_metadata(item_dir.join("zzz")).is_err(), "CONTROLLER_RACE_FILE: deletion stopped after a replaced file");
    assert_eq!(it.status, ItemStatus::Partial, "CONTROLLER_RACE_FILE: status");
    assert_eq!(it.failed_entries, 1, "CONTROLLER_RACE_LATE: failed entries (the replaced file only)");
}

/// Addendum item 4: the plan spells the item with a different non-ASCII case than the disk.
/// A file held open without delete sharing survives; the residual must be found by handle and
/// the item reported partial, never deleted.
#[test]
fn controller_residual_nonascii_case() {
    let root = base();
    let on_disk = root.join("ÄRGER-Cache");
    file(&on_disk.join("a.bin"), b"deletable");
    file(&on_disk.join("held.bin"), b"held-open");
    let planned = root.join("ärger-cache");
    let hold = OpenOptions::new().read(true).share_mode(1).open(on_disk.join("held.bin")).unwrap();
    let p = plan(vec![item(&root, &planned, "nonascii-case")], vec![], vec![]);
    let r = run(&p);
    drop(hold);
    let it = &r.items[0];
    eprintln!("CONTROLLER residual non-ASCII case: status {:?} failed {} freed {} of {}", it.status, it.failed_entries, it.bytes_freed, it.bytes_before);
    assert_eq!(fs::read(on_disk.join("held.bin")).unwrap(), b"held-open", "CONTROLLER_RESIDUAL: held file lost");
    assert_ne!(it.status, ItemStatus::Deleted, "CONTROLLER_RESIDUAL: item reported deleted while a file remains");
    assert_eq!(it.status, ItemStatus::Partial, "CONTROLLER_RESIDUAL: status");
    assert_eq!(it.bytes_freed, "9", "CONTROLLER_RESIDUAL: freed bytes should be the deleted file only");
    assert_eq!(it.failed_entries, 1, "CONTROLLER_RESIDUAL: failed entries (the held file only, CLEAN-REPORT §3)");
}

/// Addendum item 7: 100 directories x 1000 files (a Rust target directory in miniature). Prints
/// the time; the comparison against a linear lookup is run separately with a mutated source.
#[test]
fn controller_100k_timing() {
    let root = base();
    let item_dir = root.join("target-like");
    let t0 = Instant::now();
    for d in 0..100 {
        let dir = item_dir.join(format!("d{d:03}"));
        fs::create_dir_all(&dir).unwrap();
        for f in 0..1000 {
            fs::write(dir.join(format!("unit-{f:04}.o")), b"o").unwrap();
        }
    }
    let made = t0.elapsed();
    let p = plan(vec![item(&root, &item_dir, "target-like")], vec![], vec![]);
    let t1 = Instant::now();
    let r = run(&p);
    let took = t1.elapsed();
    let it = &r.items[0];
    eprintln!("CONTROLLER 100k: created in {:.1}s, execute took {:.1}s, status {:?} failed {} freed {}", made.as_secs_f64(), took.as_secs_f64(), it.status, it.failed_entries, it.bytes_freed);
    assert_eq!(it.status, ItemStatus::Deleted, "CONTROLLER_100K: status");
    assert_eq!(it.bytes_freed, "100000", "CONTROLLER_100K: freed");
    assert!(fs::symlink_metadata(&item_dir).is_err(), "CONTROLLER_100K: item survived");
    assert!(took < Duration::from_secs(600), "CONTROLLER_100K: execute took over 10 minutes");
}
