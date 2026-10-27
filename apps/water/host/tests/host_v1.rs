#![forbid(unsafe_code)]

use serde_json::{Value, json};
use std::{
    collections::hash_map::RandomState,
    fs,
    hash::BuildHasher,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use water_desktop::*;
use water_junk_rules::KnownFolders;
use water_native_picker::v1::{PickerError, PickerOptions};
use water_process_scan::InUseSpec;
use water_scope_registry::v1::RegistryError;
use water_service::{DriveInfo, FolderPicker, IpcError, Platform, Service, ServiceConfig};

#[test]
fn host_config_boundary() {
    let raw = include_str!("../tauri.conf.json");
    let cap_raw = include_str!("../capabilities/main.json");
    let expected_csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
    let config: Value = serde_json::from_str(raw).expect("HOST_CONFIG JSON");
    let capability: Value = serde_json::from_str(cap_raw).expect("HOST_CONFIG capability JSON");
    assert_eq!(
        config,
        json!({
            "productName": "Water", "version": "0.1.0", "identifier": "app.water.desktop",
            "build": {"frontendDist": "../ui"},
            "app": {"windows": [], "withGlobalTauri": true, "security": {
                "csp": expected_csp, "assetProtocol": {"enable": false}, "capabilities": ["main"]
            }}, "bundle": {"active": false}, "plugins": {}
        }),
        "HOST_CONFIG exact config"
    );
    assert_eq!(
        capability,
        json!({"identifier": "main", "windows": ["main"],
        "permissions": ["core:window:allow-start-dragging"]}),
        "HOST_CONFIG exact capability"
    );
    assert_eq!(CSP, expected_csp, "HOST_CONFIG exact CSP");
    assert!(validate_config(raw).is_ok(), "HOST_CONFIG accepted");
    assert!(
        validate_capability(cap_raw).is_ok(),
        "HOST_CONFIG accepted capability"
    );
    for (pointer, value) in [
        ("/productName", json!("Other")),
        ("/version", json!("9.0.0")),
        ("/identifier", json!("app.other")),
        ("/build/frontendDist", json!("https://example.com")),
        ("/app/windows", json!([{"label": "extra"}])),
        ("/app/withGlobalTauri", json!(false)),
        (
            "/app/security/csp",
            json!("default-src *; script-src 'unsafe-inline'"),
        ),
        ("/app/security/assetProtocol/enable", json!(true)),
        ("/app/security/capabilities", json!(["main", "extra"])),
        ("/bundle/active", json!(true)),
        ("/plugins", json!({"shell": {}})),
    ] {
        let mut bad = config.clone();
        *bad.pointer_mut(pointer).unwrap() = value;
        assert!(
            validate_config(&bad.to_string()).is_err(),
            "HOST_CONFIG reject {pointer}"
        );
    }
    for pointer in [
        "",
        "/build",
        "/app",
        "/app/security",
        "/app/security/assetProtocol",
        "/bundle",
    ] {
        let mut bad = config.clone();
        bad.pointer_mut(pointer)
            .unwrap()
            .as_object_mut()
            .unwrap()
            .insert("unexpected".into(), json!(true));
        assert!(
            validate_config(&bad.to_string()).is_err(),
            "HOST_CONFIG unknown field {pointer}"
        );
    }
    for (pointer, value) in [
        ("/identifier", json!("extra")),
        ("/windows", json!(["main", "other"])),
        (
            "/permissions",
            json!([
                "core:window:allow-start-dragging",
                "core:window:allow-close"
            ]),
        ),
        ("/permissions", json!([])),
    ] {
        let mut bad = capability.clone();
        *bad.pointer_mut(pointer).unwrap() = value;
        assert!(
            validate_capability(&bad.to_string()).is_err(),
            "HOST_CONFIG reject capability {pointer}"
        );
    }
    let mut unknown = capability.clone();
    unknown["remote"] = json!({"urls": ["https://example.com"]});
    assert!(
        validate_capability(&unknown.to_string()).is_err(),
        "HOST_CONFIG remote capability"
    );
    assert!(
        validate_config(&raw.replacen(
            "\"productName\":",
            "\"productName\":\"Water\",\"productName\":",
            1
        ))
        .is_err(),
        "HOST_CONFIG duplicate key"
    );
    assert!(validate_config("{}").is_err(), "HOST_CONFIG missing fields");
    assert!(
        validate_capability("{}").is_err(),
        "HOST_CONFIG missing capability fields"
    );
}

#[test]
fn host_navigation_boundary() {
    for origin in ["tauri://localhost", "http://tauri.localhost"] {
        for suffix in [
            "",
            "/",
            "/index.html",
            "#/results",
            "/#/results",
            "/index.html#/results",
        ] {
            let url = format!("{origin}{suffix}");
            assert!(is_bundled_navigation(&url), "HOST_NAVIGATION accept {url}");
        }
    }
    for url in [
        "http://example.com/",
        "https://example.com/",
        "https://tauri.localhost/",
        "file:///C:/data/index.html",
        "data:text/html,test",
        "javascript:alert(1)",
        "tauri://user@localhost/",
        "http://user@tauri.localhost/",
        "tauri://localhost:80/",
        "http://tauri.localhost:80/",
        "http://tauri.localhost.evil/",
        "tauri://localhost.evil/",
        "http://tauri.localhost/%69ndex.html",
        "tauri://localhost/%2e%2e/index.html",
        "tauri://localhost/../index.html",
        "http://tauri.localhost/a/../index.html",
        "http://tauri.localhost/./index.html",
        "http://tauri.localhost/other.html",
        "http://tauri.localhost/tests/",
        "http://tauri.localhost/?url=https://example.com",
        "http://tauri.localhost\\index.html",
        "tauri://localhost//index.html",
        "/index.html",
        " tauri://localhost/",
        "tauri://localhost/\n",
        "",
        "about:blank",
    ] {
        assert!(!is_bundled_navigation(url), "HOST_NAVIGATION reject {url}");
    }
}

struct Recorder {
    calls: Mutex<Vec<(String, Value)>>,
    reply: Result<Value, IpcFailure>,
}

impl Backend for Recorder {
    fn call(&self, command: &str, args: Value) -> Result<Value, IpcFailure> {
        self.calls.lock().unwrap().push((command.to_owned(), args));
        self.reply.clone()
    }
}

fn exercise(backend: &dyn Backend) -> Vec<Result<Value, IpcFailure>> {
    vec![
        cmd_app_state(backend),
        cmd_scan_start(backend),
        cmd_scan_cancel(backend, "scan-1".into()),
        cmd_scan_progress(backend),
        cmd_scan_result(backend, "scan-2".into()),
        cmd_group_detail(backend, "group-甲".into()),
        cmd_clean_prepare(backend, vec!["g1".into(), "g2".into()]),
        cmd_clean_start(backend, "plan-1".into(), "token-1".into()),
        cmd_clean_stop(backend),
        cmd_clean_progress(backend),
        cmd_clean_result(backend, "clean-1".into()),
        cmd_trends(backend),
        cmd_history_list(backend),
        cmd_locations_get(backend),
        cmd_locations_set_category(backend, "browser".into(), false),
        cmd_custom_root_add(backend),
        cmd_custom_root_remove(backend, "root-1".into()),
    ]
}

#[test]
fn host_command_registry() {
    let expected = [
        ("app_state", json!({})),
        ("scan_start", json!({})),
        ("scan_cancel", json!({"scanId": "scan-1"})),
        ("scan_progress", json!({})),
        ("scan_result", json!({"scanId": "scan-2"})),
        ("group_detail", json!({"groupId": "group-甲"})),
        ("clean_prepare", json!({"groupIds": ["g1", "g2"]})),
        (
            "clean_start",
            json!({"planId": "plan-1", "confirmToken": "token-1"}),
        ),
        ("clean_stop", json!({})),
        ("clean_progress", json!({})),
        ("clean_result", json!({"cleanId": "clean-1"})),
        ("trends", json!({})),
        ("history_list", json!({})),
        ("locations_get", json!({})),
        (
            "locations_set_category",
            json!({"category": "browser", "enabled": false}),
        ),
        ("custom_root_add", json!({})),
        ("custom_root_remove", json!({"rootId": "root-1"})),
    ];
    let names: Vec<_> = expected.iter().map(|(name, _)| *name).collect();
    assert_eq!(COMMANDS.as_slice(), names, "HOST_COMMANDS fixed registry");
    let contract_names: Vec<_> = include_str!("../../../../contracts/checkup-v1/IPC.md")
        .lines()
        .filter_map(|line| {
            line.strip_prefix("| `")
                .and_then(|tail| tail.split_once('`').map(|(name, _)| name))
        })
        .collect();
    assert_eq!(names, contract_names, "HOST_COMMANDS IPC table");
    // Inspect the actual Tauri wrappers, independently of the cmd_* adapters.
    let src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut files: Vec<_> = fs::read_dir(&src)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .filter(|path| path.extension().is_some_and(|extension| extension == "rs"))
        .collect();
    files.sort();
    let source = files
        .iter()
        .map(|path| fs::read_to_string(path).unwrap())
        .collect::<Vec<_>>()
        .join("\n");
    let mut wrappers = std::collections::BTreeMap::new();
    for wrapper in source.split("#[tauri::command]").skip(1) {
        let signature = wrapper.split_once("fn ").expect("HOST_COMMANDS function").1;
        let (name, rest) = signature.split_once('(').expect("HOST_COMMANDS signature");
        let parameters = rest.split_once(')').expect("HOST_COMMANDS parameters").0;
        let mut depth = 0;
        let mut start = 0;
        let mut keys = Vec::new();
        for (index, character) in parameters
            .char_indices()
            .chain(std::iter::once((parameters.len(), ',')))
        {
            match character {
                '<' => depth += 1,
                '>' => depth -= 1,
                ',' if depth == 0 => {
                    let parameter = parameters[start..index].trim();
                    start = index + 1;
                    if parameter.is_empty() {
                        continue;
                    }
                    let key = parameter
                        .split_once(':')
                        .expect("HOST_COMMANDS parameter name")
                        .0
                        .trim();
                    if key == "backend" {
                        continue;
                    }
                    let mut parts = key.split('_');
                    let mut camel = parts.next().unwrap().to_owned();
                    for part in parts {
                        let mut chars = part.chars();
                        if let Some(first) = chars.next() {
                            camel.extend(first.to_uppercase());
                        }
                        camel.extend(chars);
                    }
                    keys.push(camel);
                }
                _ => {}
            }
        }
        keys.sort();
        assert!(
            wrappers.insert(name.trim().to_owned(), keys).is_none(),
            "HOST_COMMANDS duplicate wrapper"
        );
    }
    let expected_wrappers: std::collections::BTreeMap<_, _> = expected
        .iter()
        .map(|(name, args)| {
            (
                name.to_string(),
                args.as_object()
                    .unwrap()
                    .keys()
                    .cloned()
                    .collect::<Vec<_>>(),
            )
        })
        .collect();
    assert_eq!(
        wrappers, expected_wrappers,
        "HOST_COMMANDS actual Tauri camelCase parameters"
    );
    let lib = fs::read_to_string(src.join("lib.rs")).unwrap();
    let handlers: Vec<_> = lib
        .split_once("tauri::generate_handler![")
        .expect("HOST_COMMANDS handler macro")
        .1
        .split_once("])")
        .expect("HOST_COMMANDS handler end")
        .0
        .split(',')
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(|entry| entry.strip_prefix("commands::").unwrap_or(entry))
        .collect();
    assert_eq!(handlers, names, "HOST_COMMANDS actual handler registration");
    assert_eq!(
        lib.matches("tauri::generate_handler![").count(),
        1,
        "HOST_COMMANDS single registry"
    );
    for reply in [
        Ok(json!({"bytes": "9007199254740993", "unknown": [null, {"中文": true}]})),
        Err(IpcFailure {
            code: "stale".into(),
            message_zh: "请重新体检。".into(),
        }),
    ] {
        let backend = Recorder {
            calls: Mutex::new(vec![]),
            reply: reply.clone(),
        };
        for result in exercise(&backend) {
            assert_eq!(result, reply, "HOST_COMMANDS untouched reply");
        }
        assert_eq!(
            *backend.calls.lock().unwrap(),
            expected
                .iter()
                .map(|(name, args)| (name.to_string(), args.clone()))
                .collect::<Vec<_>>(),
            "HOST_COMMANDS exact call sequence and camelCase arguments"
        );
    }
    for result in exercise(&UnavailableBackend) {
        assert_eq!(
            serde_json::to_value(result.unwrap_err()).unwrap(),
            json!({"code": "unavailable", "message_zh": "Water 服务暂时不可用。"}),
            "HOST_COMMANDS unavailable reply"
        );
    }
    let root_error = PickerOptions::new("relative")
        .err()
        .expect("HOST_COMMANDS relative picker error");
    assert!(
        matches!(root_error, PickerError::Root(_)),
        "HOST_COMMANDS root error variant"
    );
    for error in [
        PickerError::UnsupportedPlatform,
        PickerError::ApartmentUnavailable,
        PickerError::DialogFailed,
    ] {
        assert_eq!(
            serde_json::to_value(picker_failure(&error)).unwrap(),
            json!({"code": "unavailable", "message_zh": "系统文件夹选择框暂时打不开。"}),
            "HOST_COMMANDS unavailable picker mapping"
        );
    }
    for error in [
        root_error,
        PickerError::Source(RegistryError::RegistryFull),
        PickerError::InvalidSelection,
    ] {
        assert_eq!(
            serde_json::to_value(picker_failure(&error)).unwrap(),
            json!({"code": "invalid", "message_zh": "这个文件夹不能加入体检，请换一个。"}),
            "HOST_COMMANDS invalid picker mapping"
        );
    }
    assert_eq!(
        pick_folder("relative"),
        Err(IpcFailure {
            code: "invalid".into(),
            message_zh: "这个文件夹不能加入体检，请换一个。".into()
        }),
        "HOST_COMMANDS reject before opening any dialog"
    );
}

fn plain_directory(path: &Path) {
    check_plain_directory(path).expect("HOST_DATA_DIRECTORY fixture must be a plain directory");
}

fn check_plain_directory(path: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path).map_err(|error| error.to_string())?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("fixture must be a plain directory".into());
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return Err("fixture reparse point".into());
        }
    }
    Ok(())
}

fn fixture_parent(parent: &Path) {
    for ancestor in parent.parent().unwrap().ancestors() {
        plain_directory(ancestor);
    }
    match fs::create_dir(parent) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(error) => panic!("HOST_DATA_DIRECTORY fixture parent: {error}"),
    }
    plain_directory(parent);
}

#[cfg(windows)]
fn junction(link: &Path, target: &Path, root: &Path) {
    use std::os::windows::process::CommandExt;

    assert!(link.starts_with(root) && target.starts_with(root));
    let output = std::process::Command::new("cmd.exe")
        .creation_flags(0x0800_0000)
        .args(["/D", "/C", "mklink", "/J"])
        .arg(link.to_str().unwrap().replace('/', "\\"))
        .arg(target.to_str().unwrap().replace('/', "\\"))
        .output()
        .expect("HOST_DATA_JUNCTION create fixture junction");
    assert!(
        output.status.success(),
        "HOST_DATA_JUNCTION junction creation"
    );
}

#[test]
fn host_data_directory() {
    let tree = Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .unwrap();
    let parent = tree.join(".local/w3-f3-fixtures");
    fixture_parent(&parent);
    let nonce = RandomState::new().hash_one(std::time::SystemTime::now());
    let root = parent.join(format!("host-{nonce:016x}"));
    fs::create_dir(&root).expect("HOST_DATA_DIRECTORY unique fixture");
    let canonical_root = fs::canonicalize(&root).unwrap();
    let junction = root.join("junction");
    let signal = root.join("local-app-data/Water/activate.signal");
    let linked_water = root.join("linked-water-base/Water");
    let linked_webview = root.join("linked-webview-base/Water/webview");
    let outcome = std::panic::catch_unwind(|| {
        let override_path = root.join("覆盖/new/data");
        let fallback = root.join("local-app-data");
        let directories = prepare_data_directories(Some(&override_path), &fallback)
            .expect("HOST_DATA_DIRECTORY absolute override");
        assert_eq!(
            directories.data, override_path,
            "HOST_DATA_DIRECTORY override chosen"
        );
        assert_eq!(
            directories.webview,
            override_path.join("webview"),
            "HOST_DATA_DIRECTORY private webview"
        );
        assert!(
            directories.webview.is_dir(),
            "HOST_DATA_DIRECTORY creates missing directories"
        );
        assert!(
            !fallback.exists(),
            "HOST_DATA_DIRECTORY override does not write fallback"
        );
        assert_eq!(
            prepare_data_directories(Some(&override_path), &fallback).unwrap(),
            directories,
            "HOST_DATA_DIRECTORY existing directory"
        );
        let default =
            prepare_data_directories(None, &fallback).expect("HOST_DATA_DIRECTORY fallback");
        assert_eq!(
            default.data,
            fallback.join("Water"),
            "HOST_DATA_DIRECTORY default Water directory"
        );
        assert_eq!(
            default.webview,
            fallback.join("Water/webview"),
            "HOST_DATA_DIRECTORY default webview"
        );
        let first = acquire_instance_lock(&default.data).expect("HOST_SINGLE_INSTANCE first lock");
        assert!(
            matches!(
                acquire_instance_lock(&default.data),
                Err(StartupError::AlreadyRunning)
            ),
            "HOST_SINGLE_INSTANCE rejects second lock while held"
        );
        drop(first);
        let reacquired = acquire_instance_lock(&default.data)
            .expect("HOST_SINGLE_INSTANCE reacquire after drop");
        drop(reacquired);
        assert_eq!(
            fs::metadata(default.data.join("water.lock")).unwrap().len(),
            0,
            "HOST_SINGLE_INSTANCE lock remains empty"
        );
        assert!(
            !take_activation(&default.data),
            "HOST_SINGLE_INSTANCE no signal"
        );
        signal_activation(&default.data).expect("HOST_SINGLE_INSTANCE write signal");
        signal_activation(&default.data).expect("HOST_SINGLE_INSTANCE update signal");
        assert_eq!(
            fs::metadata(&signal).unwrap().len(),
            0,
            "HOST_SINGLE_INSTANCE empty signal"
        );
        assert!(
            take_activation(&default.data),
            "HOST_SINGLE_INSTANCE consume signal"
        );
        assert!(
            !signal.exists(),
            "HOST_SINGLE_INSTANCE removes consumed signal"
        );
        assert!(
            !take_activation(&default.data),
            "HOST_SINGLE_INSTANCE consume once"
        );
        fs::write(&signal, b"synthetic stale signal").unwrap();
        signal_activation(&default.data).expect("HOST_SINGLE_INSTANCE replace with empty signal");
        assert_eq!(
            fs::metadata(&signal).unwrap().len(),
            0,
            "HOST_SINGLE_INSTANCE resets signal"
        );
        assert!(
            take_activation(&default.data),
            "HOST_SINGLE_INSTANCE consume updated signal"
        );
        fs::create_dir(&signal).unwrap();
        assert!(
            !take_activation(&default.data),
            "HOST_SINGLE_INSTANCE ignore directory signal"
        );
        assert!(
            signal_activation(&default.data).is_err(),
            "HOST_SINGLE_INSTANCE refuse directory signal"
        );
        assert!(
            signal.is_dir(),
            "HOST_SINGLE_INSTANCE keeps directory signal"
        );
        fs::remove_dir(&signal).unwrap();
        assert!(
            signal_activation(&root.join("missing")).is_err(),
            "HOST_SINGLE_INSTANCE write failure"
        );
        assert!(
            !take_activation(&root.join("missing")),
            "HOST_SINGLE_INSTANCE lookup failure"
        );
        assert!(
            matches!(
                acquire_instance_lock(&root.join("missing")),
                Err(StartupError::Failed)
            ),
            "HOST_SINGLE_INSTANCE other errors fail startup"
        );
        assert_eq!(
            StartupError::AlreadyRunning.to_string(),
            "Water 已经在运行。",
            "HOST_SINGLE_INSTANCE message"
        );
        assert_eq!(
            StartupError::Failed.to_string(),
            "Water 暂时无法启动。",
            "HOST_SINGLE_INSTANCE failure message"
        );
        for invalid in [
            PathBuf::from("relative"),
            PathBuf::new(),
            root.join("../escape"),
        ] {
            assert!(
                prepare_data_directories(Some(&invalid), &fallback).is_err(),
                "HOST_DATA_DIRECTORY nonabsolute or traversal"
            );
        }
        let file = root.join("ordinary-file");
        fs::write(&file, b"fixture").unwrap();
        assert!(
            prepare_data_directories(Some(&file), &fallback).is_err(),
            "HOST_DATA_DIRECTORY file is not a directory"
        );
        #[cfg(windows)]
        {
            use std::os::windows::fs::OpenOptionsExt;

            signal_activation(&default.data)
                .expect("HOST_SINGLE_INSTANCE signal before sharing failure");
            let held = fs::OpenOptions::new()
                .read(true)
                .share_mode(0)
                .open(&signal)
                .expect("HOST_SINGLE_INSTANCE hold signal exclusively");
            assert!(
                !take_activation(&default.data),
                "HOST_SINGLE_INSTANCE failed removal is no activation"
            );
            assert!(
                signal_activation(&default.data).is_err(),
                "HOST_SINGLE_INSTANCE failed write reported"
            );
            drop(held);
            assert!(
                take_activation(&default.data),
                "HOST_SINGLE_INSTANCE failed removal retains signal"
            );
            let target = root.join("junction-target");
            fs::create_dir(&target).unwrap();
            self::junction(&junction, &target, &root);
            assert!(
                prepare_data_directories(Some(&junction.join("nested/data")), &fallback).is_err(),
                "HOST_DATA_DIRECTORY reject reparse ancestor"
            );
            assert!(
                prepare_data_directories(Some(&junction), &fallback).is_err(),
                "HOST_DATA_DIRECTORY reject reparse leaf"
            );
            let resolved = prepare_data_directories(None, &junction)
                .expect("HOST_DATA_JUNCTION resolve default base");
            assert_eq!(
                resolved.data,
                target.join("Water"),
                "HOST_DATA_JUNCTION default data is under real base"
            );
            assert_eq!(
                resolved.webview,
                target.join("Water/webview"),
                "HOST_DATA_JUNCTION default webview is under real base"
            );
            assert!(
                !resolved.data.to_str().unwrap().starts_with(r"\\?\"),
                "HOST_DATA_JUNCTION removes verbatim prefix"
            );
            assert!(
                prepare_data_directories(Some(&junction.join("Water")), &fallback).is_err(),
                "HOST_DATA_JUNCTION override through junction remains rejected"
            );
            assert!(
                !target.join("nested").exists() && !target.join("webview").exists(),
                "HOST_DATA_DIRECTORY no writes through junction"
            );
            let water_base = linked_water.parent().unwrap();
            let water_target = root.join("water-target");
            fs::create_dir(water_base).unwrap();
            fs::create_dir(&water_target).unwrap();
            self::junction(&linked_water, &water_target, &root);
            assert!(
                prepare_data_directories(None, water_base).is_err(),
                "HOST_DATA_JUNCTION Water itself remains protected"
            );
            assert!(
                fs::read_dir(&water_target).unwrap().next().is_none(),
                "HOST_DATA_JUNCTION linked Water target untouched"
            );
            fs::create_dir_all(linked_webview.parent().unwrap()).unwrap();
            self::junction(&linked_webview, &water_target, &root);
            assert!(
                prepare_data_directories(None, &root.join("linked-webview-base")).is_err(),
                "HOST_DATA_JUNCTION webview itself remains protected"
            );
            assert!(
                fs::read_dir(&water_target).unwrap().next().is_none(),
                "HOST_DATA_JUNCTION linked webview target untouched"
            );
            self::junction(&signal, &water_target, &root);
            assert!(
                !take_activation(&default.data),
                "HOST_SINGLE_INSTANCE ignore linked signal"
            );
            assert!(
                signal_activation(&default.data).is_err(),
                "HOST_SINGLE_INSTANCE refuse linked signal"
            );
            assert!(
                fs::symlink_metadata(&signal).is_ok(),
                "HOST_SINGLE_INSTANCE keeps linked signal"
            );
            assert!(
                fs::read_dir(&water_target).unwrap().next().is_none(),
                "HOST_SINGLE_INSTANCE linked target untouched"
            );
        }
    });
    // All deletion targets are this invocation's new fixture or its own junction.
    assert_eq!(
        root.parent(),
        Some(parent.as_path()),
        "HOST_DATA_DIRECTORY cleanup parent"
    );
    assert!(
        root.file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("host-"),
        "HOST_DATA_DIRECTORY cleanup prefix"
    );
    assert_eq!(
        fs::canonicalize(&root).unwrap(),
        canonical_root,
        "HOST_DATA_DIRECTORY cleanup identity path"
    );
    for ancestor in root.ancestors() {
        plain_directory(ancestor);
    }
    for link in [&signal, &linked_webview, &linked_water, &junction] {
        if let Ok(metadata) = fs::symlink_metadata(link) {
            let is_link = metadata.file_type().is_symlink();
            #[cfg(windows)]
            let is_link = {
                use std::os::windows::fs::MetadataExt;
                is_link || metadata.file_attributes() & 0x400 != 0
            };
            if is_link {
                fs::remove_dir(link)
                    .expect("HOST_DATA_DIRECTORY unlink only owned fixture junction");
            }
        }
    }
    fs::remove_dir_all(&root).expect("HOST_DATA_DIRECTORY delete only this invocation's fixture");
    if let Err(panic) = outcome {
        std::panic::resume_unwind(panic);
    }
}

struct WiringFixture {
    root: PathBuf,
    parent: PathBuf,
    canonical: PathBuf,
    cleaned: bool,
}

impl WiringFixture {
    fn new() -> Self {
        let tree = Path::new(env!("CARGO_MANIFEST_DIR"))
            .ancestors()
            .nth(3)
            .unwrap();
        let parent = tree.join(".local/w3-f3-fixtures");
        fixture_parent(&parent);
        let nonce = RandomState::new().hash_one(std::time::SystemTime::now());
        let root = parent.join(format!("wiring-{nonce:016x}"));
        fs::create_dir(&root).unwrap();
        let canonical = fs::canonicalize(&root).unwrap();
        Self {
            root,
            parent,
            canonical,
            cleaned: false,
        }
    }

    fn folders(&self) -> KnownFolders {
        let path = |name: &str| self.root.join(name).to_str().unwrap().replace('/', "\\");
        let folders = KnownFolders::from_json(&json!({
            "known_folders_version": "water.known-folders.v1",
            "user_profile": path("user_profile"), "local_app_data": path("local_app_data"),
            "roaming_app_data": path("roaming_app_data"), "user_temp": path("local_app_data/Temp"),
            "system_temp": path("windows/Temp"), "windows": path("windows"),
            "program_data": path("program_data"), "downloads": path("downloads")
        }).to_string()).expect("HOST_WIRING synthetic folders");
        for path in folders.values() {
            fs::create_dir_all(path).unwrap();
        }
        folders
    }

    fn cleanup(&mut self) -> Result<(), String> {
        if self.cleaned {
            return Ok(());
        }
        if self.root.parent() != Some(self.parent.as_path())
            || !self
                .root
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with("wiring-"))
        {
            return Err("HOST_WIRING cleanup parent or prefix".into());
        }
        for ancestor in self.root.ancestors() {
            check_plain_directory(ancestor)?;
        }
        if fs::canonicalize(&self.root).map_err(|error| error.to_string())? != self.canonical
            || self.canonical.parent()
                != Some(
                    fs::canonicalize(&self.parent)
                        .map_err(|error| error.to_string())?
                        .as_path(),
                )
        {
            return Err("HOST_WIRING cleanup resolved path or parent".into());
        }
        fs::remove_dir_all(&self.root).map_err(|error| error.to_string())?;
        self.cleaned = true;
        Ok(())
    }
}

impl Drop for WiringFixture {
    fn drop(&mut self) {
        if let Err(error) = self.cleanup() {
            use std::io::Write;
            let _ = writeln!(std::io::stderr().lock(), "HOST_WIRING cleanup: {error}");
        }
    }
}

struct SyntheticPlatform(KnownFolders);

impl Platform for SyntheticPlatform {
    fn known_folders(&self) -> Result<KnownFolders, IpcError> {
        Ok(self.0.clone())
    }
    fn drives(&self) -> Vec<DriveInfo> {
        vec![DriveInfo {
            root: "F:\\".into(),
            is_system: true,
            total_bytes: 1_000_000,
            free_bytes: 800_000,
        }]
    }
    fn now(&self) -> std::time::SystemTime {
        std::time::UNIX_EPOCH + std::time::Duration::from_secs(1_800_000_000)
    }
    fn local_date(&self, _at: std::time::SystemTime) -> (u32, u32) {
        (1, 15)
    }
    fn in_use(&self, _spec: &InUseSpec, _item_path: &str) -> Option<String> {
        None
    }
}

#[test]
fn host_service_wiring() {
    let mut fixture = WiringFixture::new();
    let ctx = HostContext {
        data_dir: fixture.root.join("data"),
        home_dir: "relative".into(),
    };
    let config = service_config(&ctx);
    let direct = service_backend(&HostContext {
        data_dir: fixture.root.join("direct-backend"),
        home_dir: "relative".into(),
    })
    .expect("HOST_BACKEND_DIRECT construct production backend");
    assert_eq!(
        cmd_app_state(direct.as_ref()).expect("HOST_BACKEND_DIRECT app_state")["busy"],
        "idle",
        "HOST_BACKEND_DIRECT ready"
    );
    assert!(
        !config.clean_enabled,
        "HOST_BACKEND_DIRECT cleanup remains disabled"
    );
    assert_eq!(
        serde_json::to_value(cmd_clean_prepare(direct.as_ref(), vec!["g1".into()]).unwrap_err())
            .unwrap(),
        json!({"code": "unavailable", "message_zh": "这一版只做体检，清理功能会在下一版开放。"}),
        "HOST_BACKEND_DIRECT production backend keeps cleanup disabled"
    );
    let unavailable =
        std::panic::catch_unwind(|| backend_or_unavailable(|_| Err(StartupError::Failed), &ctx))
            .expect("HOST_STARTUP_VISIBLE backend failure must not abort startup");
    for command in COMMANDS.into_iter().chain(["unknown"]) {
        assert_eq!(
            serde_json::to_value(unavailable.call(command, json!({})).unwrap_err()).unwrap(),
            json!({"code": "unavailable", "message_zh": "Water 服务暂时不可用。"}),
            "HOST_STARTUP_VISIBLE failed service still has unavailable backend"
        );
    }
    let original: Arc<dyn Backend> = Arc::new(Recorder {
        calls: Mutex::new(vec![]),
        reply: Ok(json!({"synthetic": true})),
    });
    let ready = backend_or_unavailable(
        |received| {
            assert_eq!(
                received.data_dir, ctx.data_dir,
                "HOST_STARTUP_VISIBLE forwards context"
            );
            Ok(Arc::clone(&original))
        },
        &ctx,
    );
    assert!(
        Arc::ptr_eq(&ready, &original),
        "HOST_STARTUP_VISIBLE success preserves original backend"
    );
    assert_eq!(
        cmd_app_state(ready.as_ref()).unwrap(),
        json!({"synthetic": true}),
        "HOST_STARTUP_VISIBLE success remains callable"
    );
    assert!(
        !config.clean_enabled,
        "HOST_CLEAN_DISABLED production config"
    );
    assert_eq!(
        config.data_dir, ctx.data_dir,
        "HOST_WIRING production data directory"
    );
    assert_eq!(
        config.app_version,
        env!("CARGO_PKG_VERSION"),
        "HOST_WIRING package version"
    );
    let service = Service::new(ServiceConfig {
        data_dir: ctx.data_dir.clone(),
        app_version: config.app_version,
        clean_enabled: CLEAN_ENABLED,
        platform: Box::new(SyntheticPlatform(fixture.folders())),
        picker: Box::new(HostPicker::new("relative".into())),
    })
    .expect("HOST_WIRING actual service");
    let raw_state = service
        .call("app_state", json!({}))
        .expect("HOST_WIRING direct state");
    let raw_invalid =
        serde_json::to_value(service.call("unknown", json!({})).unwrap_err()).unwrap();
    let backend = ServiceBackend(service);
    let state = cmd_app_state(&backend).expect("HOST_WIRING app_state");
    assert_eq!(state["busy"], "idle", "HOST_WIRING idle service");
    assert_eq!(state, raw_state, "HOST_WIRING success passes through");
    assert_eq!(
        serde_json::to_value(cmd_clean_prepare(&backend, vec!["g1".into()]).unwrap_err()).unwrap(),
        json!({"code": "unavailable", "message_zh": "这一版只做体检，清理功能会在下一版开放。"}),
        "HOST_CLEAN_DISABLED exact failure"
    );
    let invalid = serde_json::to_value(backend.call("unknown", json!({})).unwrap_err()).unwrap();
    assert_eq!(invalid["code"], "invalid", "HOST_WIRING unknown command");
    assert_eq!(invalid, raw_invalid, "HOST_WIRING error passes through");
    for directory in ["plans", "cleans", "journal"] {
        assert_eq!(
            fs::read_dir(ctx.data_dir.join(directory)).unwrap().count(),
            0,
            "HOST_CLEAN_DISABLED no cleanup artifacts"
        );
    }
    let picker = HostPicker::new("relative".into());
    let guard = picker.begin().expect("HOST_PICKER first guard");
    assert!(picker.begin().is_none(), "HOST_PICKER second guard refused");
    assert_eq!(
        serde_json::to_value(picker.pick().unwrap_err()).unwrap(),
        json!({"code": "busy", "message_zh": "正在进行另一项任务，请稍候。"}),
        "HOST_PICKER busy"
    );
    drop(guard);
    for _ in 0..2 {
        assert_eq!(
            serde_json::to_value(picker.pick().unwrap_err()).unwrap(),
            json!({"code": "invalid", "message_zh": "这个文件夹不能加入体检，请换一个。"}),
            "HOST_PICKER releases after error without opening a dialog"
        );
    }
    assert_eq!(
        serde_json::to_value(config.picker.pick().unwrap_err()).unwrap(),
        json!({"code": "invalid", "message_zh": "这个文件夹不能加入体检，请换一个。"}),
        "HOST_PICKER config initial directory"
    );
    drop(backend);
    drop(direct);
    fixture
        .cleanup()
        .expect("HOST_WIRING explicit fixture cleanup");
    assert!(!fixture.root.exists(), "HOST_WIRING owned fixture removed");
}
