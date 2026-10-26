// Controller's synthetic junction cases for WATER-W4-G2 (SERVICE-HARDENING §4, §5 and §8's
// "总控验收时会另用联接补合成用例"). Copied into an acceptance tree as
// packages/water-service/tests/controller_cases.rs with its own [[test]] entry, removed afterwards.
// Fixtures live only under <tree>/.local/w4-g2-controller/case-<nonce>/ and are left in place for
// inspection. Junctions are made with `cmd /c mklink /J` (controller only; worker tests may not
// start processes). Known folders, drives and in-use answers are synthetic; nothing outside the
// fixture is read or written.
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    fs,
    hash::{BuildHasher, RandomState},
    os::windows::{fs::MetadataExt, process::CommandExt},
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::SystemTime,
};
use water_service::*;

#[derive(Clone)]
struct Fake {
    folders: water_junk_rules::KnownFolders,
    root: PathBuf,
}

impl Platform for Fake {
    fn known_folders(&self) -> Result<water_junk_rules::KnownFolders, IpcError> {
        Ok(self.folders.clone())
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
    fn in_use(&self, _spec: &water_process_scan::InUseSpec, _item_path: &str) -> Option<String> {
        None
    }
}

/// Hands out the queued folders in order, then reports a cancel.
struct Picks(Mutex<Vec<String>>);
impl FolderPicker for Picks {
    fn pick(&self) -> Result<Option<String>, IpcError> {
        let mut q = self.0.lock().unwrap();
        Ok((!q.is_empty()).then(|| q.remove(0)))
    }
}

fn base() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR").replace('/', "\\"));
    let tree = manifest.parent().unwrap().parent().unwrap().to_path_buf();
    let parent = tree.join(".local").join("w4-g2-controller");
    fs::create_dir_all(&parent).unwrap();
    let nonce = RandomState::new().hash_one((SystemTime::now(), std::process::id()));
    let root = parent.join(format!("case-{nonce:016x}"));
    fs::create_dir(&root).unwrap();
    root
}

fn s(p: &Path) -> String {
    p.to_str().unwrap().to_owned()
}

fn junction(link: &Path, target: &Path) {
    let out = Command::new("cmd")
        .args(["/d", "/c", "mklink", "/J"])
        .arg(link)
        .arg(target)
        .creation_flags(0x0800_0000)
        .output()
        .unwrap();
    assert!(out.status.success(), "CONTROLLER mklink /J failed: {}", String::from_utf8_lossy(&out.stderr));
    assert!(fs::symlink_metadata(link).unwrap().file_attributes() & 0x400 != 0, "CONTROLLER junction made");
}

/// The 8.3 short form of a path, when the volume keeps short names; None otherwise.
fn short_name(p: &Path) -> Option<String> {
    let out = Command::new("cmd")
        .raw_arg(format!("/d /c for %I in (\"{}\") do @echo %~sI", s(p)))
        .creation_flags(0x0800_0000)
        .output()
        .ok()?;
    let short = String::from_utf8(out.stdout).ok()?.trim().to_owned();
    (out.status.success() && !short.is_empty() && !short.eq_ignore_ascii_case(&s(p))).then_some(short)
}

/// Files and directories by path (relative to the fixture); reparse points are listed, never entered.
fn inventory(root: &Path, dir: &Path, out: &mut BTreeMap<String, String>) {
    for entry in fs::read_dir(dir).unwrap() {
        let p = entry.unwrap().path();
        let rel = p.strip_prefix(root).unwrap().to_str().unwrap().to_owned();
        let meta = fs::symlink_metadata(&p).unwrap();
        if meta.file_attributes() & 0x400 != 0 {
            out.insert(rel, "reparse".into());
        } else if meta.is_dir() {
            out.insert(rel.clone(), "dir".into());
            inventory(root, &p, out);
        } else {
            out.insert(rel, meta.len().to_string());
        }
    }
}

fn service(data: PathBuf, fake: Fake, picks: Vec<String>) -> Result<Service, IpcError> {
    Service::new(ServiceConfig {
        data_dir: data,
        app_version: "0.1.0".into(),
        clean_enabled: false,
        platform: Box::new(fake),
        picker: Box::new(Picks(Mutex::new(picks))),
    })
}

fn add(s: &Service) -> Result<Value, IpcError> {
    s.call("custom_root_add", json!({}))
}

/// §5: known folders and picked folders compared by canonical path when a junction makes two spellings.
#[test]
fn controller_canonical_junctions() {
    let root = base();
    for d in ["kf\\home", "wreal\\win\\sub", "real-x\\inner", "lad", "rad", "ut", "st", "pd", "dl", "proj", "Project Folder With A Long Name"] {
        fs::create_dir_all(root.join(d)).unwrap();
    }
    junction(&root.join("jk"), &root.join("kf"));
    junction(&root.join("jw"), &root.join("wreal"));
    junction(&root.join("jx"), &root.join("real-x"));
    let r = |d: &str| s(&root.join(d));
    // The platform reports two known folders through junctions.
    let folders = water_junk_rules::KnownFolders {
        user_profile: r("jk\\home"),
        local_app_data: r("lad"),
        roaming_app_data: r("rad"),
        user_temp: r("ut"),
        system_temp: r("st"),
        windows: r("jw\\win"),
        program_data: r("pd"),
        downloads: r("dl"),
    };
    let long = root.join("Project Folder With A Long Name");
    let short = short_name(&long);
    eprintln!("CONTROLLER short name available: {}", short.is_some());
    let mut picks = vec![r("kf"), r("wreal\\win\\sub"), r("jx\\inner"), r("jk"), r("proj")];
    picks.extend(short.clone());
    let svc = service(root.join("data"), Fake { folders, root: root.clone() }, picks).expect("CONTROLLER new");
    let expect = [
        ("kf", "the real folder that holds the junction-reported user profile"),
        ("wreal\\win\\sub", "a folder inside the junction-reported Windows folder"),
        ("jx\\inner", "a folder reached through a junction"),
        ("jk", "a junction itself"),
    ];
    for (name, what) in expect {
        let e = add(&svc).expect_err(&format!("CONTROLLER_CANONICAL: {what} ({name}) was added"));
        assert_eq!(e.code, "invalid", "CONTROLLER_CANONICAL: code for {name}");
    }
    let added = add(&svc).unwrap_or_else(|e| panic!("CONTROLLER_CANONICAL: plain project refused: {e:?}"));
    assert!(added["added"]["root_id"].is_string(), "CONTROLLER_CANONICAL: plain project {added}");
    if let Some(short) = &short {
        let e = add(&svc).expect_err("CONTROLLER_CANONICAL: an 8.3 short name was added");
        assert_eq!(e.code, "invalid", "CONTROLLER_CANONICAL: code for the short name {short}");
    }
    let roots = svc.call("locations_get", json!({})).unwrap()["custom_roots"].clone();
    assert_eq!(roots.as_array().unwrap().len(), 1, "CONTROLLER_CANONICAL: only the plain project {roots}");
}

/// §4: startup tidy never follows a junction and never deletes a directory, whatever its name.
#[test]
fn controller_tidy_links() {
    let root = base();
    let hex = "0123456789abcdef0123456789abcdef";
    for d in ["home", "lad", "rad", "ut", "st", "win", "pd", "dl", "victim-dir", "victim-plans"] {
        fs::create_dir_all(root.join(d)).unwrap();
    }
    fs::write(root.join("victim-dir").join("keep.bin"), b"victim").unwrap();
    for i in 0..70 {
        fs::write(root.join("victim-plans").join(format!("plan-20260101T{:06}Z-{i:04x}.json", i * 100)), b"{}").unwrap();
    }
    let r = |d: &str| s(&root.join(d));
    let fake = Fake {
        folders: water_junk_rules::KnownFolders {
            user_profile: r("home"),
            local_app_data: r("lad"),
            roaming_app_data: r("rad"),
            user_temp: r("ut"),
            system_temp: r("st"),
            windows: r("win"),
            program_data: r("pd"),
            downloads: r("dl"),
        },
        root: root.clone(),
    };
    // 1. Temp-named junctions and a temp-named directory inside a normal data directory.
    let data = root.join("data");
    fs::create_dir_all(data.join("scans")).unwrap();
    junction(&data.join(format!(".settings.json.{hex}.tmp")), &root.join("victim-dir"));
    junction(&data.join("scans").join(format!(".scan-x.json.{hex}.tmp")), &root.join("victim-dir"));
    fs::create_dir(data.join(format!(".dir.{hex}.tmp"))).unwrap();
    fs::write(data.join(format!(".dir.{hex}.tmp")).join("inner.txt"), b"inner").unwrap();
    fs::write(data.join(format!(".real.{hex}.tmp")), b"leftover").unwrap();
    let mut before = BTreeMap::new();
    inventory(&root, &root, &mut before);
    let svc = service(data.clone(), fake.clone(), vec![]).expect("CONTROLLER new with temp-named links");
    drop(svc);
    let mut after = BTreeMap::new();
    inventory(&root, &root, &mut after);
    let real = format!("data\\.real.{hex}.tmp");
    assert!(before.contains_key(&real) && !after.contains_key(&real), "CONTROLLER_TIDY: the plain leftover temp file is removed");
    let gone: Vec<_> = before.keys().filter(|k| !after.contains_key(*k) && **k != real).collect();
    assert!(gone.is_empty(), "CONTROLLER_TIDY: removed besides the plain temp file: {gone:?}");
    // 2. A data directory whose plans directory is a junction to 70 plan-named files.
    let data2 = root.join("data2");
    fs::create_dir_all(&data2).unwrap();
    junction(&data2.join("plans"), &root.join("victim-plans"));
    let mut before = BTreeMap::new();
    inventory(&root, &root.join("victim-plans"), &mut before);
    let made = service(data2, fake, vec![]);
    eprintln!("CONTROLLER plans-junction data dir: {}", if made.is_ok() { "service started" } else { "service refused" });
    drop(made);
    let mut after = BTreeMap::new();
    inventory(&root, &root.join("victim-plans"), &mut after);
    assert_eq!(before.len(), 70, "CONTROLLER_TIDY: victim plans seeded");
    assert_eq!(before, after, "CONTROLLER_TIDY: files behind a plans junction were touched");
}
