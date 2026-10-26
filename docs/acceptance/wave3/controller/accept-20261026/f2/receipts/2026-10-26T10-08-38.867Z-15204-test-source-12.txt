#![forbid(unsafe_code)]

use serde_json::{Value, json};
use std::{
    collections::hash_map::RandomState,
    fs,
    hash::BuildHasher,
    path::{Path, PathBuf},
    sync::Mutex,
};
use water_desktop::*;
use water_native_picker::v1::{PickerError, PickerOptions};
use water_scope_registry::v1::RegistryError;

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
    let metadata = fs::symlink_metadata(path).expect("HOST_DATA_DIRECTORY fixture metadata");
    assert!(
        metadata.is_dir() && !metadata.file_type().is_symlink(),
        "HOST_DATA_DIRECTORY fixture must be a plain directory"
    );
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        assert_eq!(
            metadata.file_attributes() & 0x400,
            0,
            "HOST_DATA_DIRECTORY fixture reparse"
        );
    }
}

#[test]
fn host_data_directory() {
    let tree = Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .unwrap();
    let parent = tree.join(".local/w3-f2-fixtures");
    for ancestor in parent.parent().unwrap().ancestors() {
        plain_directory(ancestor);
    }
    if !parent.exists() {
        fs::create_dir(&parent).expect("HOST_DATA_DIRECTORY fixture parent");
    }
    plain_directory(&parent);
    let nonce = RandomState::new().hash_one(std::time::SystemTime::now());
    let root = parent.join(format!("host-{nonce:016x}"));
    fs::create_dir(&root).expect("HOST_DATA_DIRECTORY unique fixture");
    let canonical_root = fs::canonicalize(&root).unwrap();
    let junction = root.join("junction");
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
            use std::os::windows::process::CommandExt;

            let target = root.join("junction-target");
            fs::create_dir(&target).unwrap();
            assert!(junction.starts_with(&root) && target.starts_with(&root));
            // Cargo preserves '/' in CARGO_MANIFEST_DIR; cmd's mklink requires '\\'.
            let output = std::process::Command::new("cmd.exe")
                .creation_flags(0x0800_0000)
                .args(["/D", "/C", "mklink", "/J"])
                .arg(junction.to_str().unwrap().replace('/', "\\"))
                .arg(target.to_str().unwrap().replace('/', "\\"))
                .output()
                .expect("HOST_DATA_DIRECTORY create fixture junction");
            assert!(
                output.status.success(),
                "HOST_DATA_DIRECTORY junction creation"
            );
            assert!(
                prepare_data_directories(Some(&junction.join("nested/data")), &fallback).is_err(),
                "HOST_DATA_DIRECTORY reject reparse ancestor"
            );
            assert!(
                prepare_data_directories(Some(&junction), &fallback).is_err(),
                "HOST_DATA_DIRECTORY reject reparse leaf"
            );
            assert!(
                !target.join("nested").exists() && !target.join("webview").exists(),
                "HOST_DATA_DIRECTORY no writes through junction"
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
    if fs::symlink_metadata(&junction).is_ok() {
        fs::remove_dir(&junction).expect("HOST_DATA_DIRECTORY unlink only owned junction");
    }
    fs::remove_dir_all(&root).expect("HOST_DATA_DIRECTORY delete only this invocation's fixture");
    if let Err(panic) = outcome {
        std::panic::resume_unwind(panic);
    }
}
