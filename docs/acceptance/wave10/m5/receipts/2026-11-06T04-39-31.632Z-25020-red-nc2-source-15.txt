#![forbid(unsafe_code)]

use serde_json::{Value, json};
use std::{
    collections::hash_map::RandomState,
    fs,
    hash::BuildHasher,
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
    time::{Duration, Instant, SystemTime},
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
        cmd_scan_start(backend, None),
        cmd_scan_cancel(backend, "scan-1".into()),
        cmd_scan_progress(backend),
        cmd_scan_result(backend, "scan-2".into()),
        cmd_group_detail(backend, "group-甲".into()),
        cmd_clean_prepare(
            backend,
            Some(vec!["g1".into(), "g2".into()]),
            None,
            None,
            None,
            None,
            None,
        ),
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
        cmd_skip_add(backend, "i-甲".into()),
        cmd_skip_remove(backend, "skip-乙".into()),
    ]
}

#[test]
fn host_command_registry() {
    for source in [
        "fn f() { let c = '}'; let quote = '\\''; let slash = '\\\\'; }",
        "fn f() { let c = '字'; let c = '\\u{7b}'; let c = '\\x7d'; }",
        "fn f() { let s = r#\"brace } and \\\" quote\"#; }",
        "fn f() { let s = r###\"inner \"## } 字\"###; }",
        "fn f() { let s = r\"}\"; let s = br#\"}\"#; }",
        "fn f() { /* 字 { /* nested } */ */ // 字 }\n }",
    ] {
        let tokens =
            try_wiring_tokens(source).expect("HOST_TEST_TOKENIZER accepts literals/comments");
        assert_eq!(
            tokens.iter().filter(|token| **token == "{").count(),
            1,
            "HOST_TEST_TOKENIZER ignores opening braces in literals"
        );
        assert_eq!(
            tokens.iter().filter(|token| **token == "}").count(),
            1,
            "HOST_TEST_TOKENIZER ignores closing braces in literals"
        );
    }
    assert_eq!(
        wiring_tokens("fn f<'a>(x: &'a str) {}"),
        [
            "fn", "f", "<", "'", "a", ">", "(", "x", ":", "&", "'", "a", "str", ")", "{", "}"
        ],
        "HOST_TEST_TOKENIZER distinguishes lifetimes from characters"
    );
    for source in ["let café = 1;", "fn 字() {}", "let x = 1;\u{00a0}"] {
        let failure =
            try_wiring_tokens(source).expect_err("HOST_TEST_TOKENIZER rejects non-ASCII code");
        assert!(
            failure.contains("HOST_TEST_TOKENIZER non-ASCII outside literal at byte"),
            "HOST_TEST_TOKENIZER clear diagnostic: {failure}"
        );
    }
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
        ("skip_add", json!({"itemId": "i-甲"})),
        ("skip_remove", json!({"skipId": "skip-乙"})),
    ];
    let names: Vec<_> = expected.iter().map(|(name, _)| *name).collect();
    assert_eq!(&COMMANDS[..19], names, "HOST_COMMANDS fixed registry");
    let contract_names: Vec<_> = include_str!("../../../../contracts/checkup-v1/IPC.md")
        .lines()
        .filter_map(|line| {
            line.strip_prefix("| `")
                .and_then(|tail| tail.split_once('`').map(|(name, _)| name))
        })
        .chain(
            include_str!("../../../../contracts/m3c-v1/IPC-M3C.md")
                .lines()
                .filter_map(|line| {
                    line.strip_prefix("| `")
                        .and_then(|tail| tail.split_once('`').map(|(name, _)| name))
                })
                .filter(|name| matches!(*name, "skip_add" | "skip_remove")),
        )
        .chain(m35_command_table().iter().map(|(name, _)| name.as_str()))
        .map(str::to_owned)
        .collect();
    assert_eq!(names, &contract_names[..19], "HOST_COMMANDS IPC table");
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
    let mut expected_wrappers: std::collections::BTreeMap<_, _> = expected
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
    expected_wrappers.insert("scan_start".to_owned(), vec!["locationIds".to_owned()]);
    expected_wrappers.insert(
        "clean_prepare".to_owned(),
        [
            "chosenMode",
            "conclusionVersion",
            "dedupeId",
            "dedupeVersion",
            "excludeItemIds",
            "groupIds",
        ]
        .map(str::to_owned)
        .to_vec(),
    );
    assert_eq!(
        wrappers
            .iter()
            .filter(|(name, _)| names.contains(&name.as_str()))
            .map(|(name, keys)| (name.clone(), keys.clone()))
            .collect::<std::collections::BTreeMap<_, _>>(),
        expected_wrappers,
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
    assert_eq!(COMMANDS.len(), 36, "HOST_M3C_SKIP command count");
    assert_eq!(
        &COMMANDS[17..19],
        ["skip_add", "skip_remove"],
        "HOST_M3C_SKIP appended command order"
    );
    assert_eq!(
        handlers, COMMANDS,
        "HOST_M3C_SKIP handler registration matches all 19 commands"
    );
    for reply in [
        Ok(json!({"skipped": [{"unknown": "原样"}]})),
        Err(IpcFailure {
            code: "invalid".into(),
            message_zh: "原样失败。".into(),
        }),
    ] {
        let backend = Recorder {
            calls: Mutex::new(vec![]),
            reply: reply.clone(),
        };
        assert_eq!(
            cmd_skip_add(&backend, "i-甲".into()),
            reply,
            "HOST_M3C_SKIP add reply"
        );
        assert_eq!(
            cmd_skip_remove(&backend, "skip-乙".into()),
            reply,
            "HOST_M3C_SKIP remove reply"
        );
        assert_eq!(
            *backend.calls.lock().unwrap(),
            [
                ("skip_add".into(), json!({"itemId": "i-甲"})),
                ("skip_remove".into(), json!({"skipId": "skip-乙"}))
            ],
            "HOST_M3C_SKIP exact command names, keys and values"
        );
    }
    assert_eq!(
        &handlers[..19],
        names,
        "HOST_COMMANDS actual handler registration"
    );
    assert_m35_registry(&contract_names, &wrappers, &handlers);
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

fn m35_command_table() -> Vec<(String, Vec<String>)> {
    include_str!("../../../../contracts/m35-v1/IPC-M35.md")
        .split_once("## 1. 命令")
        .expect("HOST_M35_COMMANDS section 1")
        .1
        .split_once("原有命令的变化")
        .expect("HOST_M35_COMMANDS table end")
        .0
        .lines()
        .filter(|line| line.starts_with("| `"))
        .map(|line| {
            let cells: Vec<_> = line.split('|').map(str::trim).collect();
            let name = cells[1].trim_matches('`').to_owned();
            let mut keys = if cells[2] == "无" {
                vec![]
            } else {
                cells[2]
                    .trim_matches('`')
                    .trim_start_matches('{')
                    .trim_end_matches('}')
                    .split(',')
                    .map(|key| key.trim().to_owned())
                    .collect::<Vec<_>>()
            };
            keys.sort();
            (name, keys)
        })
        .collect()
}

fn assert_m35_registry(
    contract_names: &[String],
    wrappers: &std::collections::BTreeMap<String, Vec<String>>,
    handlers: &[&str],
) {
    let appended = [
        "conclusion_get",
        "conclusion_decide",
        "detail_get",
        "group_items",
        "quarantine_list",
        "quarantine_restore",
        "quarantine_delete",
        "quarantine_progress",
        "quarantine_reveal",
        "dedupe_start",
        "dedupe_progress",
        "dedupe_cancel",
        "dedupe_result",
        "dedupe_decide",
        "locations_set_session_cleanup",
        "manifest_trust",
        "cluster_mark_fixed",
    ];
    let table = m35_command_table();
    assert_eq!(table.len(), 17, "HOST_M35_COMMANDS IPC additions");
    assert_eq!(COMMANDS.len(), 36, "HOST_M35_COMMANDS count");
    assert_eq!(
        &COMMANDS[19..],
        appended,
        "HOST_M35_COMMANDS exact addition order"
    );
    assert_eq!(
        COMMANDS.as_slice(),
        contract_names,
        "HOST_M35_COMMANDS complete IPC table"
    );
    assert_eq!(
        handlers, COMMANDS,
        "HOST_M35_COMMANDS complete handler registry"
    );
    let actual: std::collections::BTreeMap<_, _> = wrappers
        .iter()
        .filter(|(name, _)| appended.contains(&name.as_str()))
        .map(|(name, keys)| (name.clone(), keys.clone()))
        .collect();
    assert_eq!(
        actual,
        table.into_iter().collect(),
        "HOST_M35_COMMANDS new wrapper camelCase keys"
    );
    assert_eq!(
        wrappers.len(),
        36,
        "HOST_M35_COMMANDS no extra IPC wrappers"
    );
    assert!(
        !COMMANDS.contains(&"quarantine_locate")
            && !handlers.contains(&"quarantine_locate")
            && !wrappers.contains_key("quarantine_locate"),
        "HOST_M35_COMMANDS internal locate never exposed"
    );
    let source = include_str!("../src/commands.rs");
    let tokens = wiring_tokens(source);
    let reveal = wiring_block(
        &tokens,
        &["fn", "quarantine_reveal", "("],
        "HOST_M35_REVEAL",
    );
    let call = wiring_tokens(
        "cmd_quarantine_reveal(backend.inner().as_ref(), &ExplorerOpener, target_id)",
    );
    assert!(
        reveal.windows(call.len()).any(|w| w == call),
        "HOST_M35_REVEAL real opener wrapper wiring"
    );
}

fn assert_m35_forward() {
    for reply in [
        Ok(json!({"unknown": [null, {"中文": "9007199254740993"}]})),
        Err(IpcFailure {
            code: "stale".into(),
            message_zh: "原样转交。".into(),
        }),
    ] {
        let backend = Recorder {
            calls: Mutex::new(vec![]),
            reply: reply.clone(),
        };
        for (ids, expected) in [
            (None, json!({})),
            (
                Some(vec!["位置-甲".into(), "".into(), "位置-甲".into()]),
                json!({"locationIds": ["位置-甲", "", "位置-甲"]}),
            ),
            (Some(vec![]), json!({"locationIds": []})),
        ] {
            assert_eq!(
                cmd_scan_start(&backend, ids),
                reply,
                "HOST_M35_FORWARD scan reply"
            );
            let call = backend.calls.lock().unwrap().pop().unwrap();
            assert_eq!(call.0, "scan_start", "HOST_M35_FORWARD scan command");
            assert_eq!(
                call.1.to_string().as_bytes(),
                expected.to_string().as_bytes(),
                "HOST_M35_FORWARD scan exact bytes including None omission"
            );
        }
        let old = Some(vec!["g2".into(), "g1".into()]);
        for excluded in [None, Some(vec![]), Some(vec!["i-甲".into(), "i-甲".into()])] {
            let mut expected = json!({"groupIds": ["g2", "g1"]});
            if let Some(ids) = excluded.as_ref().filter(|ids| !ids.is_empty()) {
                expected["excludeItemIds"] = json!(ids);
            }
            assert_eq!(
                cmd_clean_prepare(&backend, old.clone(), excluded, None, None, None, None),
                reply,
                "HOST_M35_FORWARD legacy prepare reply"
            );
            let call = backend.calls.lock().unwrap().pop().unwrap();
            assert_eq!(
                call.0, "clean_prepare",
                "HOST_M35_FORWARD legacy prepare command"
            );
            assert_eq!(
                call.1.to_string().as_bytes(),
                expected.to_string().as_bytes(),
                "HOST_M35_FORWARD legacy prepare byte-identical"
            );
        }
        for (conclusion, mode, dedupe, version, expected) in [
            (
                Some("v:甲".into()),
                Some("quarantine".into()),
                None,
                None,
                json!({"conclusionVersion":"v:甲", "chosenMode":"quarantine"}),
            ),
            (
                None,
                None,
                Some("dup:1".into()),
                Some("v:2".into()),
                json!({"dedupeId":"dup:1", "dedupeVersion":"v:2"}),
            ),
            (None, None, None, None, json!({})),
            (
                Some("".into()),
                Some("unknown".into()),
                Some("".into()),
                Some("".into()),
                json!({"conclusionVersion":"", "chosenMode":"unknown", "dedupeId":"", "dedupeVersion":""}),
            ),
        ] {
            assert_eq!(
                cmd_clean_prepare(&backend, None, None, conclusion, mode, dedupe, version),
                reply,
                "HOST_M35_FORWARD optional prepare reply"
            );
            let call = backend.calls.lock().unwrap().pop().unwrap();
            assert_eq!(
                call.0, "clean_prepare",
                "HOST_M35_FORWARD optional prepare command"
            );
            assert_eq!(
                call.1, expected,
                "HOST_M35_FORWARD only present prepare keys, no host validation"
            );
        }
        let results = [
            cmd_conclusion_get(&backend),
            cmd_conclusion_decide(
                &backend,
                "v:1".into(),
                json!({"group":"g-甲", "choice":"keep", "unknown":null}),
            ),
            cmd_detail_get(&backend, "v:2".into(), "not-validated".into()),
            cmd_group_items(&backend, "g-甲".into(), None, None),
            cmd_quarantine_list(&backend),
            cmd_quarantine_restore(&backend, "q-甲".into(), true),
            cmd_quarantine_delete(&backend, "q-乙".into()),
            cmd_quarantine_progress(&backend),
            cmd_dedupe_start(&backend, "location-甲".into()),
            cmd_dedupe_progress(&backend),
            cmd_dedupe_cancel(&backend, "d-甲".into()),
            cmd_dedupe_result(&backend, "d-乙".into(), false),
            cmd_dedupe_decide(&backend, "d-丙".into(), "v:3".into(), "g-乙".into(), true),
            cmd_locations_set_session_cleanup(&backend, "tool-甲".into(), false, 17),
            cmd_manifest_trust(&backend, "m-甲".into(), true),
            cmd_cluster_mark_fixed(&backend, "g-丙".into(), false),
            cmd_group_items(
                &backend,
                "g-丁".into(),
                Some("row-1".into()),
                Some("搜索".into()),
            ),
        ];
        for result in results {
            assert_eq!(result, reply, "HOST_M35_FORWARD untouched reply");
        }
        assert_eq!(
            *backend.calls.lock().unwrap(),
            [
                ("conclusion_get".into(), json!({})),
                (
                    "conclusion_decide".into(),
                    json!({"version":"v:1", "decision":{"group":"g-甲", "choice":"keep", "unknown":null}})
                ),
                (
                    "detail_get".into(),
                    json!({"version":"v:2", "mode":"not-validated"})
                ),
                (
                    "group_items".into(),
                    json!({"groupId":"g-甲", "rowId":null, "query":null})
                ),
                ("quarantine_list".into(), json!({})),
                (
                    "quarantine_restore".into(),
                    json!({"quarantineId":"q-甲", "beside":true})
                ),
                ("quarantine_delete".into(), json!({"quarantineId":"q-乙"})),
                ("quarantine_progress".into(), json!({})),
                ("dedupe_start".into(), json!({"locationId":"location-甲"})),
                ("dedupe_progress".into(), json!({})),
                ("dedupe_cancel".into(), json!({"dedupeId":"d-甲"})),
                (
                    "dedupe_result".into(),
                    json!({"dedupeId":"d-乙", "expand":false})
                ),
                (
                    "dedupe_decide".into(),
                    json!({"dedupeId":"d-丙", "version":"v:3", "groupId":"g-乙", "include":true})
                ),
                (
                    "locations_set_session_cleanup".into(),
                    json!({"tool":"tool-甲", "enabled":false, "days":17})
                ),
                (
                    "manifest_trust".into(),
                    json!({"manifestId":"m-甲", "trusted":true})
                ),
                (
                    "cluster_mark_fixed".into(),
                    json!({"groupId":"g-丙", "fixed":false})
                ),
                (
                    "group_items".into(),
                    json!({"groupId":"g-丁", "rowId":"row-1", "query":"搜索"})
                ),
            ],
            "HOST_M35_FORWARD all new forwarding commands, exact names/keys/values"
        );
    }
}

struct RecordingOpener {
    paths: Mutex<Vec<String>>,
    fail: bool,
}

impl Opener for RecordingOpener {
    fn open_folder(&self, path: &str) -> Result<(), ()> {
        self.paths.lock().unwrap().push(path.to_owned());
        if self.fail { Err(()) } else { Ok(()) }
    }
}

fn assert_m35_reveal() {
    let mut fixture = WiringFixture::new();
    let quarantine = fixture.root.join(".water-quarantine");
    let numbered = quarantine.join("20261105-163012-F");
    let ordinary = fixture.root.join("ordinary");
    let file = quarantine.join("file");
    fs::create_dir_all(&numbered).unwrap();
    fs::create_dir(&ordinary).unwrap();
    fs::write(&file, b"owned fixture").unwrap();
    let comma = fixture.root.join("comma,parent/.water-quarantine");
    fs::create_dir_all(&comma).unwrap();
    let path_text = |p: &Path| p.to_str().unwrap().replace('/', "\\");
    let opener = RecordingOpener {
        paths: Mutex::new(vec![]),
        fail: false,
    };
    for path in [&quarantine, &numbered] {
        let path = path_text(path).replace(".water-quarantine", ".WaTeR-QuArAnTiNe");
        let backend = Recorder {
            calls: Mutex::new(vec![]),
            reply: Ok(json!({"path":path})),
        };
        assert_eq!(
            cmd_quarantine_reveal(&backend, &opener, "qroot-t1".into()),
            Ok(json!({})),
            "HOST_M35_REVEAL valid directory"
        );
        assert_eq!(
            *backend.calls.lock().unwrap(),
            [("quarantine_locate".into(), json!({"targetId":"qroot-t1"}))],
            "HOST_M35_REVEAL locate exact payload"
        );
        assert_eq!(
            opener.paths.lock().unwrap().last(),
            Some(&path),
            "HOST_M35_REVEAL opens exact unmodified path"
        );
    }
    assert_eq!(
        opener.paths.lock().unwrap().len(),
        2,
        "HOST_M35_REVEAL exactly two valid opens"
    );
    let failure = IpcFailure {
        code: "not_found".into(),
        message_zh: "服务原样未找到。".into(),
    };
    let backend = Recorder {
        calls: Mutex::new(vec![]),
        reply: Err(failure.clone()),
    };
    assert_eq!(
        cmd_quarantine_reveal(&backend, &opener, "missing".into()),
        Err(failure),
        "HOST_M35_REVEAL service failure untouched"
    );
    let valid = path_text(&quarantine);
    let mut bad = vec![
        json!({}),
        json!({"path":null}),
        json!({"path":42}),
        json!({"path":path_text(&ordinary)}),
        json!({"path":format!("{valid}\\..\\.water-quarantine")}),
        json!({"path":format!("{valid},other")}),
        json!({"path":path_text(&comma)}),
        json!({"path":r"\\server\share\.water-quarantine"}),
        json!({"path":path_text(&file)}),
        json!({"path":format!("{valid}\\missing")}),
        json!({"path":valid.replace('\\', "/")}),
    ];
    for suffix in [
        "bad_id",
        "bad%id",
        "bad;id",
        "bad\"id",
        "bad\nid",
        ".",
        "..",
        "",
        "id.",
        "id ",
        "id:stream",
    ] {
        bad.push(json!({"path":format!("{valid}\\{suffix}")}));
    }
    for name in ["a".repeat(48), "a".repeat(49)] {
        let path = quarantine.join(&name);
        fs::create_dir(&path).unwrap();
        let backend = Recorder {
            calls: Mutex::new(vec![]),
            reply: Ok(json!({"path":path_text(&path)})),
        };
        let result = cmd_quarantine_reveal(&backend, &opener, name.clone());
        if name.len() == 48 {
            assert_eq!(
                result,
                Ok(json!({})),
                "HOST_M35_REVEAL 48 character identifier accepted"
            );
        } else {
            assert_eq!(
                result
                    .expect_err("HOST_M35_REVEAL reject oversized ID")
                    .code,
                "invalid",
                "HOST_M35_REVEAL 49 character identifier rejected"
            );
        }
    }
    let before = opener.paths.lock().unwrap().len();
    for reply in bad {
        let backend = Recorder {
            calls: Mutex::new(vec![]),
            reply: Ok(reply.clone()),
        };
        assert_eq!(
            cmd_quarantine_reveal(&backend, &opener, "target".into())
                .expect_err("HOST_M35_REVEAL unsafe path must fail")
                .code,
            "invalid",
            "HOST_M35_REVEAL reject malformed or unsafe location: {reply}"
        );
    }
    assert_eq!(
        opener.paths.lock().unwrap().len(),
        before,
        "HOST_M35_REVEAL invalid paths never open"
    );
    #[cfg(windows)]
    {
        let link = quarantine.join("junction");
        junction(&link, &ordinary, &fixture.root);
        let backend = Recorder {
            calls: Mutex::new(vec![]),
            reply: Ok(json!({"path":path_text(&link)})),
        };
        let result = cmd_quarantine_reveal(&backend, &opener, "link".into());
        fs::remove_dir(&link).expect("HOST_M35_REVEAL unlink only own junction");
        assert_eq!(
            result.expect_err("HOST_M35_REVEAL junction must fail").code,
            "invalid",
            "HOST_M35_REVEAL rejects junction"
        );
        assert_eq!(
            opener.paths.lock().unwrap().len(),
            before,
            "HOST_M35_REVEAL junction never opens"
        );
    }
    let failing = RecordingOpener {
        paths: Mutex::new(vec![]),
        fail: true,
    };
    let backend = Recorder {
        calls: Mutex::new(vec![]),
        reply: Ok(json!({"path":valid})),
    };
    assert_eq!(
        cmd_quarantine_reveal(&backend, &failing, "qroot-t1".into())
            .expect_err("HOST_M35_REVEAL opener error must fail")
            .code,
        "unavailable",
        "HOST_M35_REVEAL opener failure mapping"
    );
    assert_eq!(
        failing.paths.lock().unwrap().as_slice(),
        [valid],
        "HOST_M35_REVEAL failing opener tried once"
    );
    fixture
        .cleanup()
        .expect("HOST_M35_REVEAL owned fixture cleanup");
}

struct PurgingBackend {
    stops: AtomicUsize,
}

impl Backend for PurgingBackend {
    fn call(&self, command: &str, args: Value) -> Result<Value, IpcFailure> {
        assert_eq!(args, json!({}), "HOST_M35_PURGE_EXIT empty control payload");
        match command {
            "app_state" => Ok(
                json!({"busy": if self.stops.load(Ordering::SeqCst) == 0 { "purging" } else { "idle" }}),
            ),
            "clean_stop" => {
                self.stops.fetch_add(1, Ordering::SeqCst);
                Ok(json!({}))
            }
            _ => panic!("HOST_M35_PURGE_EXIT unexpected command"),
        }
    }
}

fn assert_m35_purge_exit() {
    let backend = PurgingBackend {
        stops: AtomicUsize::new(0),
    };
    assert_eq!(
        clean_state(&backend),
        CleanState::Cleaning,
        "HOST_M35_PURGE_EXIT purging means cleaning"
    );
    assert_eq!(
        stop_cleaning_within(&backend, Duration::from_millis(1), Duration::from_secs(1)),
        CleanStop::Stopped,
        "HOST_M35_PURGE_EXIT stop purging before exit"
    );
    assert_eq!(
        backend.stops.load(Ordering::SeqCst),
        1,
        "HOST_M35_PURGE_EXIT sends one stop"
    );
    let backend = PurgingBackend {
        stops: AtomicUsize::new(0),
    };
    assert!(
        stop_cleaning_and_wait(&backend, Duration::from_millis(1)),
        "HOST_M35_PURGE_EXIT close also stops purging"
    );
    assert_eq!(
        backend.stops.load(Ordering::SeqCst),
        1,
        "HOST_M35_PURGE_EXIT close sends one stop"
    );
    let readonly = Recorder {
        calls: Mutex::new(vec![]),
        reply: Ok(json!({"busy":"deduping"})),
    };
    assert_eq!(
        clean_state(&readonly),
        CleanState::NotCleaning,
        "HOST_M35_PURGE_EXIT deduping is read-only"
    );
    assert_eq!(
        stop_cleaning_within(&readonly, Duration::from_millis(1), Duration::ZERO),
        CleanStop::Idle,
        "HOST_M35_PURGE_EXIT read-only task permits exit"
    );
    assert!(
        readonly
            .calls
            .lock()
            .unwrap()
            .iter()
            .all(|(command, _)| command == "app_state"),
        "HOST_M35_PURGE_EXIT no stop for deduping"
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
        let wiring = root.join("run-wiring");
        fs::create_dir(&wiring).unwrap();
        let held = on_lock_result(acquire_instance_lock(&wiring), &wiring)
            .expect("HOST_RUN_WIRING acquired lock");
        assert!(held.is_some(), "HOST_RUN_WIRING keeps the lock");
        drop(held);
        assert!(
            !wiring.join("activate.signal").exists(),
            "HOST_RUN_WIRING acquired lock writes no signal"
        );
        assert!(
            matches!(
                on_lock_result(Err(StartupError::AlreadyRunning), &wiring),
                Ok(None)
            ),
            "HOST_RUN_WIRING already running returns none"
        );
        let signaled =
            fs::read(wiring.join("activate.signal")).expect("HOST_RUN_WIRING signal exists");
        assert!(signaled.is_empty(), "HOST_RUN_WIRING new signal is empty");
        assert!(
            matches!(
                on_lock_result(Err(StartupError::Failed), &wiring),
                Err(StartupError::Failed)
            ),
            "HOST_RUN_WIRING other error unchanged"
        );
        assert_eq!(
            fs::read(wiring.join("activate.signal")).unwrap(),
            signaled,
            "HOST_RUN_WIRING other error leaves signal"
        );
        let lib =
            fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("src/lib.rs")).unwrap();
        assert!(
            lib.contains("on_lock_result("),
            "HOST_RUN_WIRING run uses on_lock_result"
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
        let stale = fs::read(&signal).unwrap();
        let past = SystemTime::now() - Duration::from_secs(86_400);
        fs::OpenOptions::new()
            .write(true)
            .open(&signal)
            .unwrap()
            .set_modified(past)
            .unwrap();
        signal_activation(&default.data).expect("HOST_SINGLE_INSTANCE refresh signal time");
        assert_eq!(
            fs::read(&signal).unwrap(),
            stale,
            "HOST_SINGLE_INSTANCE signal content unchanged"
        );
        assert_eq!(
            fs::metadata(&signal).unwrap().len(),
            stale.len() as u64,
            "HOST_SINGLE_INSTANCE signal length unchanged"
        );
        assert!(
            fs::metadata(&signal).unwrap().modified().unwrap() > past,
            "HOST_SINGLE_INSTANCE signal time updated"
        );
        assert!(
            take_activation(&default.data),
            "HOST_SINGLE_INSTANCE consume preserved signal"
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
            // The fixture root keeps the slash from `.local/w3-f3-fixtures`; `\\?\` rejects it.
            let dotted_text = root
                .join("weird-name.")
                .to_string_lossy()
                .replace('/', "\\");
            let dotted = PathBuf::from(&dotted_text);
            let extended = PathBuf::from(format!(r"\\?\{dotted_text}"));
            fs::create_dir(&extended).expect("HOST_DATA_JUNCTION create dotted base");
            let ordinary = root.join("weird-name");
            fs::create_dir(&ordinary).expect("HOST_DATA_JUNCTION create ordinary base");
            let first = fs::canonicalize(&extended)
                .expect("HOST_DATA_JUNCTION first canonicalization succeeds");
            let stripped = PathBuf::from(first.to_str().unwrap().strip_prefix(r"\\?\").unwrap());
            let second = fs::canonicalize(&stripped)
                .expect("HOST_DATA_JUNCTION second canonicalization succeeds");
            assert_ne!(
                first, second,
                "HOST_DATA_JUNCTION fixture reaches comparison with different meanings"
            );
            let dotted_result = prepare_data_directories(None, &dotted);
            assert!(
                dotted_result.is_err(),
                "HOST_DATA_JUNCTION rejects a base that changes without the verbatim prefix: {dotted_result:?}"
            );
            assert!(
                fs::symlink_metadata(&extended).is_ok(),
                "HOST_DATA_JUNCTION dotted base stays in place"
            );
            assert!(
                !ordinary.join("Water").exists(),
                "HOST_DATA_JUNCTION does not create Water in the stripped directory"
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
    #[cfg(windows)]
    {
        let dotted_text = root
            .join("weird-name.")
            .to_string_lossy()
            .replace('/', "\\");
        let _ = fs::remove_dir_all(PathBuf::from(format!(r"\\?\{dotted_text}")));
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

struct ReleaseMark(Arc<AtomicBool>);

impl Drop for ReleaseMark {
    fn drop(&mut self) {
        self.0.store(true, Ordering::SeqCst);
    }
}

struct AnswerBackend {
    _mark: ReleaseMark,
    answer: Value,
}

impl Backend for AnswerBackend {
    fn call(&self, _command: &str, _args: Value) -> Result<Value, IpcFailure> {
        Ok(self.answer.clone())
    }
}

struct ScriptedClean {
    remaining: AtomicUsize,
    stops: AtomicUsize,
    before_stop: AtomicUsize,
}

impl ScriptedClean {
    fn new(remaining: usize) -> Self {
        Self {
            remaining: AtomicUsize::new(remaining),
            stops: AtomicUsize::new(0),
            before_stop: AtomicUsize::new(0),
        }
    }
}

impl Backend for ScriptedClean {
    fn call(&self, command: &str, _args: Value) -> Result<Value, IpcFailure> {
        match command {
            "app_state" => {
                let busy = if self.remaining.load(Ordering::SeqCst) == 0 {
                    "idle"
                } else {
                    if self.stops.load(Ordering::SeqCst) == 0 {
                        assert!(
                            self.before_stop.fetch_add(1, Ordering::SeqCst) < 8,
                            "HOST_CLOSE_DURING_CLEAN must send stop before waiting for idle"
                        );
                    } else {
                        self.remaining.fetch_sub(1, Ordering::SeqCst);
                    }
                    "cleaning"
                };
                Ok(json!({"busy": busy}))
            }
            "clean_stop" => {
                self.stops.fetch_add(1, Ordering::SeqCst);
                Ok(json!({}))
            }
            _ => Err(IpcFailure {
                code: "invalid".into(),
                message_zh: "不会走到这里。".into(),
            }),
        }
    }
}

struct UnknownClean {
    stops: AtomicUsize,
}

impl Backend for UnknownClean {
    fn call(&self, command: &str, _args: Value) -> Result<Value, IpcFailure> {
        if command == "clean_stop" {
            self.stops.fetch_add(1, Ordering::SeqCst);
            return Ok(json!({}));
        }
        Err(IpcFailure {
            code: "unavailable".into(),
            message_zh: "测试服务无法回答。".into(),
        })
    }
}

struct SlowInitialState {
    queries: AtomicUsize,
    stops: AtomicUsize,
    unknown: bool,
}

impl Backend for SlowInitialState {
    fn call(&self, command: &str, _args: Value) -> Result<Value, IpcFailure> {
        if command == "clean_stop" {
            self.stops.fetch_add(1, Ordering::SeqCst);
            return Ok(json!({}));
        }
        if self.queries.fetch_add(1, Ordering::SeqCst) == 0 {
            std::thread::sleep(Duration::from_millis(80));
            if self.unknown {
                return Err(IpcFailure {
                    code: "unavailable".into(),
                    message_zh: "测试状态暂时未知。".into(),
                });
            }
            return Ok(json!({"busy": "cleaning"}));
        }
        Ok(json!({"busy": "idle"}))
    }
}

struct PartialInitialState {
    queries: AtomicUsize,
    stops: AtomicUsize,
}

impl Backend for PartialInitialState {
    fn call(&self, command: &str, _args: Value) -> Result<Value, IpcFailure> {
        if command == "clean_stop" {
            self.stops.fetch_add(1, Ordering::SeqCst);
            return Ok(json!({}));
        }
        if self.queries.fetch_add(1, Ordering::SeqCst) == 0 {
            std::thread::sleep(Duration::from_millis(300));
        }
        Ok(json!({"busy": "cleaning"}))
    }
}

struct UnknownResetClean {
    stopped_at: Mutex<Option<Instant>>,
    stops: AtomicUsize,
    cleaning_seen: AtomicBool,
    idle_seen: AtomicBool,
}

impl Backend for UnknownResetClean {
    fn call(&self, command: &str, _args: Value) -> Result<Value, IpcFailure> {
        let mut stopped_at = self.stopped_at.lock().unwrap();
        if command == "clean_stop" {
            self.stops.fetch_add(1, Ordering::SeqCst);
            *stopped_at = Some(Instant::now());
            return Ok(json!({}));
        }
        let Some(started) = *stopped_at else {
            return Ok(json!({"busy": "cleaning"}));
        };
        let elapsed = started.elapsed();
        if elapsed >= Duration::from_secs(3) && !self.cleaning_seen.swap(true, Ordering::SeqCst) {
            return Ok(json!({"busy": "cleaning"}));
        }
        if elapsed >= Duration::from_secs(6) {
            self.idle_seen.store(true, Ordering::SeqCst);
            return Ok(json!({"busy": "idle"}));
        }
        Err(IpcFailure {
            code: "unavailable".into(),
            message_zh: "测试状态暂时未知。".into(),
        })
    }
}

fn assert_unstarted(backend: &dyn Backend) {
    let started = Instant::now();
    assert_eq!(
        clean_state(backend),
        CleanState::NotCleaning,
        "HOST_UNSTARTED_SERVICE unavailable means no cleaning"
    );
    assert_eq!(
        stop_cleaning_within(backend, Duration::from_millis(10), Duration::from_secs(1)),
        CleanStop::Idle,
        "HOST_UNSTARTED_SERVICE bounded stop is idle"
    );
    assert!(
        !stop_cleaning_and_wait(backend, Duration::from_millis(10)),
        "HOST_UNSTARTED_SERVICE unbounded stop returns false"
    );
    assert!(
        started.elapsed() < Duration::from_millis(500),
        "HOST_UNSTARTED_SERVICE returns well below one second: {:?}",
        started.elapsed()
    );
}

struct UnstartedProbe;

impl Backend for UnstartedProbe {
    fn available(&self) -> bool {
        false
    }

    fn call(&self, _command: &str, _args: Value) -> Result<Value, IpcFailure> {
        panic!("HOST_UNSTARTED_SERVICE must not query or stop an unstarted backend")
    }
}

// Tokenize the host's wiring, ignoring comments and string contents, so braces
// delimit real branches and ExitRequested cannot match the Exit identifier.
fn wiring_tokens(source: &str) -> Vec<&str> {
    try_wiring_tokens(source).unwrap_or_else(|message| panic!("{message}"))
}

fn try_wiring_tokens(source: &str) -> Result<Vec<&str>, String> {
    let bytes = source.as_bytes();
    let mut tokens = Vec::new();
    let mut index = 0;
    while index < bytes.len() {
        let start = index;
        if bytes[index].is_ascii_whitespace() {
            index += 1;
        } else if bytes[index..].starts_with(b"//") {
            while index < bytes.len() && bytes[index] != b'\n' {
                index += 1;
            }
        } else if bytes[index..].starts_with(b"/*") {
            index += 2;
            let mut depth = 1;
            while index < bytes.len() && depth > 0 {
                if bytes[index..].starts_with(b"/*") {
                    depth += 1;
                    index += 2;
                } else if bytes[index..].starts_with(b"*/") {
                    depth -= 1;
                    index += 2;
                } else {
                    index += 1;
                }
            }
        } else if let Some(end) = raw_string_end(source, index)? {
            index = end;
        } else if bytes[index] == b'"' {
            index += 1;
            while index < bytes.len() {
                let byte = bytes[index];
                index += 1;
                if byte == b'\\' {
                    index = (index + 1).min(bytes.len());
                } else if byte == b'"' {
                    break;
                }
            }
        } else if bytes[index] == b'\''
            && let Some(end) = character_end(source, index)
        {
            index = end;
        } else {
            if !bytes[index].is_ascii() {
                return Err(format!(
                    "HOST_TEST_TOKENIZER non-ASCII outside literal at byte {index}: {:?}",
                    source[index..].chars().next().unwrap()
                ));
            }
            index += 1;
            if bytes[start].is_ascii_alphanumeric() || bytes[start] == b'_' {
                while index < bytes.len()
                    && (bytes[index].is_ascii_alphanumeric() || bytes[index] == b'_')
                {
                    index += 1;
                }
            }
            tokens.push(&source[start..index]);
        }
    }
    Ok(tokens)
}

fn raw_string_end(source: &str, start: usize) -> Result<Option<usize>, String> {
    let bytes = source.as_bytes();
    let mut quote = if bytes[start..].starts_with(b"br") {
        start + 2
    } else if bytes[start] == b'r' {
        start + 1
    } else {
        return Ok(None);
    };
    let hashes_start = quote;
    while bytes.get(quote) == Some(&b'#') {
        quote += 1;
    }
    if bytes.get(quote) != Some(&b'"') {
        return Ok(None);
    }
    let hashes = &bytes[hashes_start..quote];
    let mut end = quote + 1;
    while end < bytes.len() {
        if bytes[end] == b'"' && bytes[end + 1..].starts_with(hashes) {
            return Ok(Some(end + 1 + hashes.len()));
        }
        end += 1;
    }
    Err(format!(
        "HOST_TEST_TOKENIZER unterminated raw string at byte {start}"
    ))
}

fn character_end(source: &str, start: usize) -> Option<usize> {
    let bytes = source.as_bytes();
    let mut end = start + 1;
    if bytes.get(end) == Some(&b'\\') {
        end += 1;
        match bytes.get(end)? {
            b'u' if bytes.get(end + 1) == Some(&b'{') => {
                end += 2;
                while bytes.get(end).is_some_and(|byte| *byte != b'}') {
                    end += 1;
                }
                if bytes.get(end) != Some(&b'}') {
                    return None;
                }
                end += 1;
            }
            b'x' => end += 3,
            _ => end += 1,
        }
    } else {
        end += source.get(end..)?.chars().next()?.len_utf8();
    }
    (bytes.get(end) == Some(&b'\'')).then_some(end + 1)
}

fn wiring_block<'a>(tokens: &'a [&'a str], prefix: &[&str], marker: &str) -> &'a [&'a str] {
    let start = tokens
        .windows(prefix.len())
        .position(|window| window == prefix)
        .unwrap_or_else(|| panic!("{marker} missing branch/function prefix"))
        + prefix.len();
    let body = if prefix.last() == Some(&"{") {
        start - 1
    } else {
        start
            + tokens[start..]
                .iter()
                .position(|token| *token == "{")
                .unwrap_or_else(|| panic!("{marker} missing opening brace"))
    };
    let mut depth = 0;
    for (index, token) in tokens.iter().enumerate().skip(body) {
        match *token {
            "{" => depth += 1,
            "}" => {
                depth -= 1;
                if depth == 0 {
                    return &tokens[body + 1..index];
                }
            }
            _ => {}
        }
    }
    panic!("{marker} unclosed wiring block")
}

#[test]
fn host_service_wiring() {
    assert_m35_forward();
    assert_m35_reveal();
    assert_m35_purge_exit();
    for reply in [
        Ok(json!({"unknown": ["原样", null]})),
        Err(IpcFailure {
            code: "invalid".into(),
            message_zh: "原样失败。".into(),
        }),
    ] {
        for excluded in [None, Some(vec![]), Some(vec!["i-2", "i-甲", "i-2", ""])] {
            let backend = Recorder {
                calls: Mutex::new(vec![]),
                reply: reply.clone(),
            };
            assert_eq!(
                cmd_clean_prepare(
                    &backend,
                    Some(vec!["g1".into(), "g2".into()]),
                    excluded
                        .clone()
                        .map(|ids| ids.into_iter().map(String::from).collect()),
                    None,
                    None,
                    None,
                    None,
                ),
                reply,
                "HOST_M3C_EXCLUDE untouched backend reply"
            );
            let expected = match excluded {
                Some(ids) if !ids.is_empty() => {
                    json!({"groupIds": ["g1", "g2"], "excludeItemIds": ids})
                }
                _ => json!({"groupIds": ["g1", "g2"]}),
            };
            let calls = backend.calls.lock().unwrap();
            assert_eq!(
                *calls,
                [("clean_prepare".into(), expected.clone())],
                "HOST_M3C_EXCLUDE exact payload, preserving list order and values"
            );
            assert_eq!(
                calls[0].1.to_string().as_bytes(),
                expected.to_string().as_bytes(),
                "HOST_M3C_EXCLUDE byte-identical serialization including legacy omission"
            );
        }
    }
    assert_unstarted(&UnavailableBackend);
    assert_unstarted(&BackendSlot::new(Arc::new(UnavailableBackend)));
    let empty_slot = BackendSlot::new(Arc::new(UnstartedProbe));
    drop(empty_slot.take());
    assert_unstarted(&empty_slot);
    assert_unstarted(&UnstartedProbe);
    assert_unstarted(&BackendSlot::new(Arc::new(UnstartedProbe)));
    let available_errors = UnknownClean {
        stops: AtomicUsize::new(0),
    };
    assert!(
        available_errors.available(),
        "HOST_UNSTARTED_SERVICE default backend is available"
    );
    assert_eq!(
        clean_state(&available_errors),
        CleanState::Unknown,
        "HOST_UNSTARTED_SERVICE available backend errors remain unknown"
    );
    let available_slot = BackendSlot::new(Arc::new(available_errors));
    assert!(
        available_slot.available(),
        "HOST_UNSTARTED_SERVICE forwards available backend"
    );
    for unknown in [false, true] {
        let slow = SlowInitialState {
            queries: AtomicUsize::new(0),
            stops: AtomicUsize::new(0),
            unknown,
        };
        assert_eq!(
            stop_cleaning_within(&slow, Duration::from_millis(1), Duration::from_millis(40)),
            CleanStop::TimedOut,
            "HOST_EXIT_DEADLINE initial query consumes the deadline (unknown={unknown})"
        );
        assert_eq!(
            slow.queries.load(Ordering::SeqCst),
            1,
            "HOST_EXIT_DEADLINE no query after initial deadline"
        );
        assert_eq!(
            slow.stops.load(Ordering::SeqCst),
            1,
            "HOST_EXIT_DEADLINE still sends stop exactly once"
        );
    }
    let partial = PartialInitialState {
        queries: AtomicUsize::new(0),
        stops: AtomicUsize::new(0),
    };
    let limit = Duration::from_millis(700);
    let started = Instant::now();
    assert_eq!(
        stop_cleaning_within(&partial, Duration::from_secs(2), limit),
        CleanStop::TimedOut,
        "HOST_EXIT_DEADLINE partial initial query still reaches total limit"
    );
    let elapsed = started.elapsed();
    assert!(
        elapsed >= limit && elapsed < limit + Duration::from_millis(150),
        "HOST_EXIT_DEADLINE initial 300 ms leaves only the remainder of 700 ms (150 ms scheduling margin): {elapsed:?}"
    );
    assert!(
        partial.queries.load(Ordering::SeqCst) >= 2,
        "HOST_EXIT_DEADLINE partial query leaves time for polling"
    );
    assert_eq!(
        partial.stops.load(Ordering::SeqCst),
        1,
        "HOST_EXIT_DEADLINE partial query sends stop exactly once"
    );
    let reset = UnknownResetClean {
        stopped_at: Mutex::new(None),
        stops: AtomicUsize::new(0),
        cleaning_seen: AtomicBool::new(false),
        idle_seen: AtomicBool::new(false),
    };
    assert!(
        stop_cleaning_and_wait(&reset, Duration::from_millis(10)),
        "HOST_UNKNOWN_RESET requests stop and waits"
    );
    assert!(
        reset.cleaning_seen.load(Ordering::SeqCst) && reset.idle_seen.load(Ordering::SeqCst),
        "HOST_UNKNOWN_RESET must reach idle after unknown 3 s / cleaning / unknown 3 s"
    );
    assert_eq!(
        reset.stops.load(Ordering::SeqCst),
        1,
        "HOST_UNKNOWN_RESET requests stop exactly once"
    );
    let dropped = Arc::new(AtomicBool::new(false));
    let answer = json!({"ready": true});
    let slot = BackendSlot::new(Arc::new(AnswerBackend {
        _mark: ReleaseMark(Arc::clone(&dropped)),
        answer: answer.clone(),
    }));
    assert_eq!(
        cmd_app_state(&slot).unwrap(),
        answer,
        "HOST_BACKEND_RELEASE forwards"
    );
    let taken = slot.take().expect("HOST_BACKEND_RELEASE take");
    let released = cmd_clean_stop(&slot).expect_err("HOST_BACKEND_RELEASE unavailable after take");
    assert_eq!(
        serde_json::to_value(released).unwrap(),
        json!({"code": "unavailable", "message_zh": "Water 服务暂时不可用。"}),
        "HOST_BACKEND_RELEASE unavailable value"
    );
    assert!(
        !dropped.load(Ordering::SeqCst),
        "HOST_BACKEND_RELEASE held until drop"
    );
    drop(taken);
    assert!(
        dropped.load(Ordering::SeqCst),
        "HOST_BACKEND_RELEASE dropped"
    );
    let cleaning = ScriptedClean::new(3);
    for _ in 0..2 {
        assert_eq!(
            cmd_app_state(&cleaning).unwrap()["busy"],
            "cleaning",
            "HOST_CLOSE_DURING_CLEAN no countdown before stop"
        );
    }
    assert_eq!(
        cleaning.remaining.load(Ordering::SeqCst),
        3,
        "HOST_CLOSE_DURING_CLEAN polling alone cannot complete cleanup"
    );
    assert!(
        stop_cleaning_and_wait(&cleaning, Duration::from_millis(1)),
        "HOST_CLOSE_DURING_CLEAN waits out cleaning"
    );
    assert_eq!(
        cleaning.stops.load(Ordering::SeqCst),
        1,
        "HOST_CLOSE_DURING_CLEAN stops once"
    );
    assert_eq!(
        cleaning.remaining.load(Ordering::SeqCst),
        0,
        "HOST_CLOSE_DURING_CLEAN reached idle"
    );
    let idle = ScriptedClean::new(0);
    assert!(
        !stop_cleaning_and_wait(&idle, Duration::from_millis(1)),
        "HOST_CLOSE_DURING_CLEAN idle returns false"
    );
    assert_eq!(
        idle.stops.load(Ordering::SeqCst),
        0,
        "HOST_CLOSE_DURING_CLEAN idle does not stop"
    );
    let unknown = UnknownClean {
        stops: AtomicUsize::new(0),
    };
    let started = Instant::now();
    assert!(
        stop_cleaning_and_wait(&unknown, Duration::from_millis(10)),
        "HOST_CLOSE_UNKNOWN unknown state still requests stop"
    );
    assert_eq!(
        unknown.stops.load(Ordering::SeqCst),
        1,
        "HOST_CLOSE_UNKNOWN stop requested exactly once"
    );
    assert!(
        started.elapsed() >= Duration::from_secs(5) && started.elapsed() < Duration::from_secs(10),
        "HOST_CLOSE_UNKNOWN consecutive errors wait about five seconds: {:?}",
        started.elapsed()
    );
    for (reply, expected) in [
        (Ok(json!({"busy": "cleaning"})), CleanState::Cleaning),
        (Ok(json!({"busy": "idle"})), CleanState::NotCleaning),
        (Ok(json!({"busy": "scanning"})), CleanState::NotCleaning),
        (
            UnavailableBackend.call("app_state", json!({})),
            CleanState::Unknown,
        ),
    ] {
        assert_eq!(
            clean_state(&Recorder {
                calls: Mutex::new(vec![]),
                reply
            }),
            expected,
            "HOST_CLOSE_UNKNOWN three-state query"
        );
    }
    let cleaning = ScriptedClean::new(3);
    assert_eq!(
        stop_cleaning_within(&cleaning, Duration::from_millis(1), Duration::from_secs(1)),
        CleanStop::Stopped,
        "HOST_EXIT_DURING_CLEAN confirms stop"
    );
    assert_eq!(
        cleaning.remaining.load(Ordering::SeqCst),
        0,
        "HOST_EXIT_DURING_CLEAN waits until idle"
    );
    assert_eq!(
        cleaning.stops.load(Ordering::SeqCst),
        1,
        "HOST_EXIT_DURING_CLEAN stops exactly once"
    );
    let idle = ScriptedClean::new(0);
    assert_eq!(
        stop_cleaning_within(&idle, Duration::from_secs(1), Duration::ZERO),
        CleanStop::Idle,
        "HOST_EXIT_DURING_CLEAN idle returns immediately even with a zero limit"
    );
    assert_eq!(
        idle.stops.load(Ordering::SeqCst),
        0,
        "HOST_EXIT_DURING_CLEAN idle never requests stop"
    );
    let stuck = Recorder {
        calls: Mutex::new(vec![]),
        reply: Ok(json!({"busy": "cleaning"})),
    };
    let limit = Duration::from_millis(40);
    let started = Instant::now();
    assert_eq!(
        stop_cleaning_within(&stuck, Duration::from_millis(2), limit),
        CleanStop::TimedOut,
        "HOST_EXIT_DURING_CLEAN persistent cleaning reaches the limit"
    );
    assert!(
        started.elapsed() >= limit && started.elapsed() < Duration::from_secs(1),
        "HOST_EXIT_DURING_CLEAN enforces total wait limit: {:?}",
        started.elapsed()
    );
    assert_eq!(
        stuck
            .calls
            .lock()
            .unwrap()
            .iter()
            .filter(|(command, _)| command == "clean_stop")
            .count(),
        1,
        "HOST_EXIT_DURING_CLEAN no repeated stop while waiting"
    );
    let unknown = UnknownClean {
        stops: AtomicUsize::new(0),
    };
    let started = Instant::now();
    assert_eq!(
        stop_cleaning_within(&unknown, Duration::from_secs(1), limit),
        CleanStop::TimedOut,
        "HOST_CLOSE_UNKNOWN bounded exit also waits on unknown state"
    );
    assert!(
        started.elapsed() >= limit && started.elapsed() < Duration::from_secs(1),
        "HOST_CLOSE_UNKNOWN total limit also caps the poll interval"
    );
    assert_eq!(
        unknown.stops.load(Ordering::SeqCst),
        1,
        "HOST_CLOSE_UNKNOWN bounded exit stops exactly once"
    );
    let lib = include_str!("../src/lib.rs");
    let tokens = wiring_tokens(lib);
    let callback = wiring_block(
        &tokens,
        &["app", ".", "run_return", "("],
        "HOST_EXIT_DURING_CLEAN",
    );
    let exit = wiring_block(
        callback,
        &[
            "if", "let", "tauri", ":", ":", "RunEvent", ":", ":", "Exit", "=", "event", "{",
        ],
        "HOST_EXIT_DURING_CLEAN",
    );
    let exit_call = wiring_tokens(
        "stop_cleaning_within(exit_backend.as_ref(), Duration::from_millis(200), Duration::from_secs(10),);",
    );
    assert!(
        exit.windows(exit_call.len())
            .any(|window| window == exit_call),
        "HOST_EXIT_DURING_CLEAN HOST_EXIT_WIRING Exit calls bounded stop at 200 ms / 10 s in parameter order"
    );
    let swapped = wiring_tokens(
        "stop_cleaning_within(exit_backend.as_ref(), Duration::from_secs(10), Duration::from_millis(200),);",
    );
    assert!(
        !swapped
            .windows(exit_call.len())
            .any(|window| window == exit_call),
        "HOST_EXIT_WIRING rejects reversed poll and deadline"
    );
    let guard = wiring_block(
        &tokens,
        &["fn", "guard_main_close", "("],
        "HOST_CLOSE_UNKNOWN",
    );
    let confirmed_idle = [
        "if",
        "clean_state",
        "(",
        "backend",
        ".",
        "as_ref",
        "(",
        ")",
        ")",
        "=",
        "=",
        "CleanState",
        ":",
        ":",
        "NotCleaning",
        "{",
        "return",
        ";",
        "}",
        "api",
        ".",
        "prevent_close",
        "(",
        ")",
        ";",
    ];
    assert!(
        guard
            .iter()
            .filter(|token| **token == "clean_state")
            .count()
            == 1
            && guard
                .windows(confirmed_idle.len())
                .any(|w| w == confirmed_idle)
            && guard
                .windows(2)
                .any(|w| w == ["stop_cleaning_and_wait", "("]),
        "HOST_CLOSE_UNKNOWN close guard only allows confirmed non-cleaning and uses shared wait"
    );
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
    assert!(config.clean_enabled, "HOST_CLEAN_ENABLED production config");
    let cleanup_closed =
        json!({"code": "unavailable", "message_zh": "这一版只做体检，清理功能会在下一版开放。"});
    assert_ne!(
        serde_json::to_value(
            cmd_clean_prepare(
                direct.as_ref(),
                Some(vec!["g1".into()]),
                None,
                None,
                None,
                None,
                None
            )
            .unwrap_err()
        )
        .unwrap(),
        cleanup_closed,
        "HOST_CLEAN_ENABLED production backend opens cleanup"
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
    assert!(config.clean_enabled, "HOST_CLEAN_ENABLED production config");
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
    assert_ne!(
        serde_json::to_value(
            cmd_clean_prepare(
                &backend,
                Some(vec!["g1".into()]),
                None,
                None,
                None,
                None,
                None
            )
            .unwrap_err()
        )
        .unwrap(),
        json!({"code": "unavailable", "message_zh": "这一版只做体检，清理功能会在下一版开放。"}),
        "HOST_CLEAN_ENABLED exact failure"
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
