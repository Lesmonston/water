#![forbid(unsafe_code)]

use serde_json::{Value, json};
use std::{
    cell::Cell,
    env, fs,
    io::Write,
    panic::{AssertUnwindSafe, catch_unwind},
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
use water_contracts::v1::OpaqueId;
use water_native_picker::v1::{PickerError, PickerOptions};
use water_native_scan::v1::{
    self as scan, CancelToken, NoopObserver, ScanObserver, ScanOptions, ScanProgress,
};
use water_native_session::v1::{self as session, SessionCapture, SessionError};
use water_redacted_report::v1 as redaction;
use water_report_view::v1::project_report;
use water_scope_registry::v1::{RegisteredScope, Registry, RegistryError};
use water_summary_export::v1::summarize_report;

struct Fixture {
    root: String,
    trap: String,
    missing: String,
    junction: String,
}

fn tree() -> &'static Path {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
}

impl Fixture {
    fn load() -> Self {
        let index_path = tree().join(".local/native-walk-fixtures/index.json");
        assert_eq!(
            Path::new(&env::var("WATER_NATIVE_WALK_INDEX").unwrap()),
            index_path
        );
        // Only the frozen factory index is read; ordinary payloads are never read.
        let index: Value = serde_json::from_str(&fs::read_to_string(index_path).unwrap()).unwrap();
        assert_eq!(index["fixture_version"], "water.native-walk-fixtures.v1");
        assert_eq!(index["literal_payload_bytes"], 60);
        assert_eq!(index["logical_file_entry_bytes"], 74);
        let field = |key: &str, leaf: &str| {
            let value = index[key].as_str().unwrap().to_owned();
            assert_eq!(
                Path::new(&value),
                tree()
                    .join(".local/native-walk-fixtures/batch-v1")
                    .join(leaf)
            );
            value
        };
        Self {
            root: field("root", "root"),
            trap: field("trap", "trap"),
            missing: field("missing", "not-created"),
            junction: field("junction", "root/junction"),
        }
    }
}

fn id(value: &str) -> OpaqueId {
    OpaqueId::new(value).unwrap()
}

fn register(registry: &mut Registry, scope_id: &str, root: &str) -> RegisteredScope {
    let pending = registry.prepare(&id(scope_id), root).unwrap();
    registry.confirm(&pending).unwrap()
}

fn host_usable(registry: &mut Registry, host: &RegisteredScope) {
    assert_eq!(
        registry.len(),
        1,
        "V_RELEASED only the host registration remains"
    );
    let permit = registry
        .begin_scan(host)
        .expect("V_RELEASED host still usable");
    assert_eq!(permit.scope_id(), host.scope_id());
    registry.check_permit(&permit).unwrap();
    registry.finish(&permit).unwrap();
}

fn wire(capture: &SessionCapture) -> Value {
    let raw = session::to_json(capture).unwrap();
    assert!(raw.len() <= 67_108_864);
    assert!(!raw.contains(['\n', '\r']));
    assert_eq!(raw, serde_json::to_string(capture).unwrap());
    assert_eq!(&capture.clone(), capture);
    serde_json::from_str(&raw).unwrap()
}

fn snapshot(value: &Value) -> &Value {
    let snapshots = value["snapshots"].as_array().unwrap();
    assert_eq!(
        snapshots.len(),
        1,
        "V_BEHAVIOR confirmation produces one actual scan"
    );
    assert_eq!(
        snapshots[0]["source_kind"], "native_scope_metadata",
        "V_NATIVE_SOURCE"
    );
    &snapshots[0]
}

fn capture(
    registry: &mut Registry,
    scope_id: &str,
    session_id: &str,
    root: &str,
    options: &ScanOptions,
    cancel: &CancelToken,
    action: &str,
) -> Result<SessionCapture, SessionError> {
    let picker = PickerOptions::new(root).unwrap();
    let before = registry.len();
    eprintln!("WATER_PICKER_CASE {action}");
    let result = session::capture_session(
        registry,
        &id(scope_id),
        &id(session_id),
        &picker,
        options,
        cancel,
    );
    assert_eq!(
        registry.len(),
        before,
        "V_RELEASED every return preserves registration count"
    );
    result
}

struct CancelOnEntry<'a> {
    token: &'a CancelToken,
    calls: Cell<u32>,
    panic: bool,
}

impl ScanObserver for CancelOnEntry<'_> {
    fn on_entry(&self, progress: &ScanProgress) {
        assert_eq!(progress.scope_id, id("session-scope"));
        assert_eq!(progress.scan_id, id("observer-session"));
        assert_eq!(progress.visited_entries, 1);
        self.calls.set(self.calls.get() + 1);
        assert!(!self.panic, "controlled observer unwind");
        self.token.cancel();
    }
}

#[test]
fn session_selection_cancelled() {
    let f = Fixture::load();
    // Cancellation must work even when no registry capacity remains.
    let mut registry = Registry::new(1).unwrap();
    let host = register(&mut registry, "host", &f.trap);
    let options = ScanOptions::new(0, 1, 1).unwrap();
    let token = CancelToken::new();
    token.cancel();
    let captured = capture(
        &mut registry,
        "host",
        "cancelled-session",
        &f.root,
        &options,
        &token,
        "cancel",
    )
    .expect("V_BEHAVIOR actual picker cancellation");
    assert_eq!(
        wire(&captured),
        json!({
            "bundle_version": "water.native-session-bundle.v1",
            "session_id": "cancelled-session", "read_only": true,
            "selection": "cancelled", "confirmation_source": "native_directory_dialog",
            "policy": {"platform":"windows", "traversal":"handle_relative_no_follow",
                "ordinary_content_read":false, "native_user_gesture_authenticated":false,
                "race_protection_verified":false, "coverage_basis":"declared_policy",
                "limits":{"max_depth":0, "max_entries":1, "max_dir_entries":1}},
            "snapshots":[]
        }),
        "V_BEHAVIOR no fake report on selection cancellation"
    );
    host_usable(&mut registry, &host);
    registry.revoke(&host).unwrap();
    let pending = registry.prepare(&id("reusable"), &f.root).unwrap();
    registry.decline(&pending).unwrap();
    assert!(registry.is_empty());
}

#[test]
fn session_native_capture() {
    let f = Fixture::load();
    let mut registry = Registry::new(2).unwrap();
    let host = register(&mut registry, "host", &f.trap);
    for (depth, entries, per_dir, status) in [
        (8, 128, 32, "completed"),
        (1, 128, 32, "partial"),
        (8, 3, 32, "partial"),
        (0, 128, 32, "partial"),
        (8, 1, 32, "partial"),
        (8, 128, 1, "partial"),
    ] {
        let options = ScanOptions::new(depth, entries, per_dir).unwrap();
        let captured = capture(
            &mut registry,
            "session-scope",
            "native-session",
            &f.root,
            &options,
            &CancelToken::new(),
            "select",
        )
        .expect("V_BEHAVIOR V_SELECTED_ROOT actual selected root must reach R");
        host_usable(&mut registry, &host);
        let value = wire(&captured);
        let actual = snapshot(&value);
        assert_eq!(value["selection"], "confirmed");
        assert_eq!(
            value["policy"]["limits"],
            json!({"max_depth":depth, "max_entries":entries, "max_dir_entries":per_dir})
        );
        assert_eq!(actual["view"]["status"], status);

        // An independent real P/R call supplies A, then independent E/H/Q.
        let independent_scope = register(&mut registry, "session-scope", &f.root);
        let independent = scan::scan_registered(
            &mut registry,
            &independent_scope,
            &f.root,
            &id("native-session"),
            &options,
            &CancelToken::new(),
        )
        .unwrap();
        let report = independent.report();
        assert_eq!(
            actual["view"],
            serde_json::to_value(project_report(report).unwrap()).unwrap()
        );
        assert_eq!(
            actual["summary"],
            serde_json::to_value(summarize_report(report).unwrap()).unwrap()
        );
        assert_eq!(
            actual["redacted_json"],
            redaction::to_json(&redaction::redact_report(report).unwrap()).unwrap()
        );
        registry.revoke(&independent_scope).unwrap();
        host_usable(&mut registry, &host);
        assert_eq!(actual["view"]["scan_id"], "native-session");
        assert_eq!(actual["view"]["scopes"][0]["scope_id"], "session-scope");
        assert!(actual["view"]["totals"]["logical_bytes"].is_null());
        assert!(actual["view"]["totals"]["allocated_bytes"].is_null());
        for finding in actual["view"]["findings"].as_array().unwrap() {
            assert_eq!(finding["risk"], "protected");
            assert_eq!(finding["category"], "unknown");
            assert_eq!(finding["activity"], "unknown");
            assert!(!finding["protection_reasons"].as_array().unwrap().is_empty());
            assert!(
                !finding["relative_path"]
                    .as_str()
                    .unwrap()
                    .contains("TRAP_OUTSIDE")
            );
        }
        if status == "completed" {
            assert_eq!(actual["view"]["totals"]["scanned_entries"], 8);
            let paths: Vec<_> = actual["view"]["findings"]
                .as_array()
                .unwrap()
                .iter()
                .map(|x| x["relative_path"].as_str().unwrap())
                .collect();
            assert_eq!(
                paths,
                [
                    "alias-alpha.txt",
                    "alpha.txt",
                    "dir",
                    "dir/inner.txt",
                    "empty",
                    "junction",
                    "literal-秘密.txt",
                    "zero.bin"
                ]
            );
        }
        if depth == 0 || entries == 1 {
            assert!(
                actual["view"]["issues"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|i| i["relative_path"] == "")
            );
        }
    }
    registry.revoke(&host).unwrap();
    assert!(registry.is_empty());
}

#[test]
fn session_cancellation_and_cleanup() {
    let f = Fixture::load();
    let mut registry = Registry::new(2).unwrap();
    let host = register(&mut registry, "host", &f.trap);
    let options = ScanOptions::new(8, 128, 32).unwrap();
    let token = CancelToken::new();
    token.cancel();
    let captured = capture(
        &mut registry,
        "session-scope",
        "pre-cancelled",
        &f.root,
        &options,
        &token,
        "select",
    )
    .expect("V_SELECTED_ROOT pre-cancel still selects");
    host_usable(&mut registry, &host);
    let value = wire(&captured);
    assert_eq!(value["selection"], "confirmed");
    assert_eq!(snapshot(&value)["view"]["status"], "cancelled");
    assert_eq!(snapshot(&value)["view"]["totals"]["scanned_entries"], 0);
    for panic in [false, true] {
        let token = CancelToken::new();
        let observer = CancelOnEntry {
            token: &token,
            calls: Cell::new(0),
            panic,
        };
        let picker = PickerOptions::new(&f.root).unwrap();
        eprintln!("WATER_PICKER_CASE select");
        let outcome = catch_unwind(AssertUnwindSafe(|| {
            session::capture_session_with_observer(
                &mut registry,
                &id("session-scope"),
                &id("observer-session"),
                &picker,
                &options,
                &token,
                &observer,
            )
        }));
        host_usable(&mut registry, &host);
        assert_eq!(observer.calls.get(), 1, "V_BEHAVIOR real R observer called");
        if panic {
            assert!(outcome.is_err(), "V_BEHAVIOR observer unwind is preserved");
        } else {
            let capture = outcome.unwrap().expect("V_SELECTED_ROOT observer scan");
            let value = wire(&capture);
            assert_eq!(snapshot(&value)["view"]["status"], "cancelled");
            assert_eq!(snapshot(&value)["view"]["totals"]["scanned_entries"], 1);
        }
        // Reusing this exact ID/root proves that no registration or attempt survived.
        let fresh = register(&mut registry, "session-scope", &f.root);
        let permit = registry.begin_scan(&fresh).unwrap();
        registry.finish(&permit).unwrap();
        registry.revoke(&fresh).unwrap();
    }
    registry.revoke(&host).unwrap();
}

#[test]
fn session_errors_preserve_registry() {
    let f = Fixture::load();
    let options = ScanOptions::new(8, 128, 32).unwrap();
    for (capacity, existing_root, requested_id, expected) in [
        (1, f.trap.as_str(), "new", RegistryError::RegistryFull),
        (2, f.trap.as_str(), "host", RegistryError::DuplicateScope),
        (2, f.root.as_str(), "new", RegistryError::DuplicateRoot),
    ] {
        let mut registry = Registry::new(capacity).unwrap();
        let host = register(&mut registry, "host", existing_root);
        let result = capture(
            &mut registry,
            requested_id,
            "errors",
            &f.root,
            &options,
            &CancelToken::new(),
            "select",
        );
        assert_eq!(
            result,
            Err(SessionError::Picker(PickerError::Source(expected))),
            "V_BEHAVIOR preserve S error"
        );
        host_usable(&mut registry, &host);
        registry.revoke(&host).unwrap();
    }
    let mut registry = Registry::new(2).unwrap();
    let host = register(&mut registry, "host", &f.trap);
    for invalid in [&f.missing, &f.junction] {
        // These are real pre-dialog N failures. Do not enqueue a UI action.
        let result = session::capture_session(
            &mut registry,
            &id("session-scope"),
            &id("errors"),
            &PickerOptions::new(invalid).unwrap(),
            &options,
            &CancelToken::new(),
        );
        assert!(matches!(
            result,
            Err(SessionError::Picker(PickerError::Root(_)))
        ));
        host_usable(&mut registry, &host);
    }
    // The same registry is still able to complete a later real session.
    let capture = capture(
        &mut registry,
        "session-scope",
        "after-errors",
        &f.root,
        &options,
        &CancelToken::new(),
        "select",
    )
    .expect("V_SELECTED_ROOT session after errors");
    host_usable(&mut registry, &host);
    assert_eq!(snapshot(&wire(&capture))["view"]["status"], "completed");
    registry.revoke(&host).unwrap();
}

fn rlib(deps: &Path, name: &str) -> PathBuf {
    let prefix = format!("lib{name}-");
    let matches: Vec<_> = fs::read_dir(deps)
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| {
            p.file_name()
                .unwrap()
                .to_str()
                .is_some_and(|n| n.starts_with(&prefix) && n.ends_with(".rlib"))
        })
        .collect();
    assert_eq!(matches.len(), 1, "unambiguous compiled artifact for {name}");
    matches[0].clone()
}

fn private_api_proofs() {
    let deps = tree().join(".local/next-target/debug/deps");
    let output_dir = tree().join(".local/next-tmp");
    let externs = ["water_native_session", "serde_json"].map(|name| (name, rlib(&deps, name)));
    let snippets = [
        (
            "fn main() { fn traits<T: std::fmt::Debug + Clone + PartialEq>() {} traits::<SessionCapture>(); let _: fn(&SessionCapture) -> Result<String, SessionError> = to_json; }",
            None,
        ),
        (
            "fn main() { fn read(c: &SessionCapture) { let _ = &c.snapshots; } }",
            Some("E0616"),
        ),
        (
            "fn main() { fn mutate(c: &mut SessionCapture) { c.read_only = false; } }",
            Some("E0616"),
        ),
        (
            "fn main() { fn mutate(c: &mut SessionCapture) { c.policy.ordinary_content_read = true; } }",
            Some("E0616"),
        ),
        ("fn main() { let _ = SessionCapture {}; }", Some("private")),
        (
            "fn main() { let _: SessionCapture = Default::default(); }",
            Some("E0277"),
        ),
        (
            "fn main() { let _ = serde_json::from_str::<SessionCapture>(\"{}\"); }",
            Some("E0277"),
        ),
        (
            "fn main() { let _ = SessionCapture::new(); }",
            Some("E0599"),
        ),
    ];
    for (index, (body, error)) in snippets.iter().enumerate() {
        let mut command = Command::new(env::var_os("RUSTC").unwrap());
        command
            .args([
                "--edition=2024",
                "--crate-name",
                "session_api_proof",
                "--emit=metadata",
                "-L",
            ])
            .arg(format!("dependency={}", deps.display()))
            .arg("-o")
            .arg(output_dir.join(format!("session-api-{}-{index}.rmeta", std::process::id())));
        for (name, path) in &externs {
            command
                .arg("--extern")
                .arg(format!("{name}={}", path.display()));
        }
        let mut child = command
            .arg("-")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        write!(child.stdin.take().unwrap(), "#![forbid(unsafe_code)]\nuse water_native_session::v1::{{SessionCapture, SessionError, to_json}};\n{body}").unwrap();
        let output = child.wait_with_output().unwrap();
        let stderr = String::from_utf8(output.stderr).unwrap();
        eprintln!(
            "PRIVATE_API_PROOF {index} exit={:?}\n{stderr}",
            output.status.code()
        );
        if let Some(expected) = error {
            assert!(
                !output.status.success() && stderr.contains(expected),
                "private API rejection {index}"
            );
        } else {
            assert!(
                output.status.success(),
                "positive compile control: {stderr}"
            );
        }
    }
}

#[test]
fn session_public_wire_and_cli() {
    let f = Fixture::load();
    let mut registry = Registry::new(1).unwrap();
    let options = ScanOptions::new(8, 10000, 256).unwrap();
    let picker = PickerOptions::new(&f.root).unwrap();
    eprintln!("WATER_PICKER_CASE select");
    let captured = session::capture_session_with_observer(
        &mut registry,
        &id("session-scope"),
        &id("wire-session"),
        &picker,
        &options,
        &CancelToken::new(),
        &NoopObserver,
    )
    .expect("V_SELECTED_ROOT public API");
    assert!(
        registry.is_empty(),
        "V_RELEASED public call revokes own scope"
    );
    let value = wire(&captured);
    let keys = |v: &Value| v.as_object().unwrap().keys().cloned().collect::<Vec<_>>();
    assert_eq!(
        keys(&value),
        [
            "bundle_version",
            "confirmation_source",
            "policy",
            "read_only",
            "selection",
            "session_id",
            "snapshots"
        ]
    );
    assert_eq!(
        keys(&value["policy"]),
        [
            "coverage_basis",
            "limits",
            "native_user_gesture_authenticated",
            "ordinary_content_read",
            "platform",
            "race_protection_verified",
            "traversal"
        ]
    );
    assert_eq!(
        keys(&value["policy"]["limits"]),
        ["max_depth", "max_dir_entries", "max_entries"]
    );
    let snapshot = snapshot(&value);
    assert_eq!(
        keys(snapshot),
        ["redacted_json", "source_kind", "summary", "view"]
    );
    let q = snapshot["redacted_json"].as_str().unwrap();
    assert!(q.len() <= 16_777_216);
    assert_eq!(
        serde_json::from_str::<Value>(q).unwrap()["summary"],
        snapshot["summary"]
    );
    let raw = session::to_json(&captured).unwrap();
    assert!(raw.contains("literal-秘密.txt"), "UTF-8 name retained by E");
    for absent in [
        f.root.as_str(),
        "root_identity",
        "native_identity",
        "volume_serial",
        "file_id",
        "capability",
        "TRAP_OUTSIDE",
    ] {
        assert!(!raw.contains(absent), "wire omits private data: {absent}");
    }
    for name in [
        "ordinary_content_read",
        "native_user_gesture_authenticated",
        "race_protection_verified",
    ] {
        assert_eq!(value["policy"][name], false);
    }
    for error in [
        SessionError::OutputTooLarge,
        SessionError::SerializationFailed,
        SessionError::InvalidArguments,
    ] {
        assert_eq!(error.to_string(), format!("{error:?} at /native_session"));
        assert_eq!(error.clone(), error);
        let _: &dyn std::error::Error = &error;
    }
    let contract = OpaqueId::new("").unwrap_err();
    for (wrapper, original) in [
        (
            SessionError::Picker(PickerError::DialogFailed),
            PickerError::DialogFailed.to_string(),
        ),
        (
            SessionError::Scan(scan::NativeScanError::RootMismatch),
            scan::NativeScanError::RootMismatch.to_string(),
        ),
        (
            SessionError::Projection(contract.clone()),
            contract.to_string(),
        ),
        (
            SessionError::Summary(contract.clone()),
            contract.to_string(),
        ),
        (
            SessionError::Redaction(redaction::RedactionError::OutputTooLarge),
            redaction::RedactionError::OutputTooLarge.to_string(),
        ),
        (
            SessionError::Registry(RegistryError::RegistryFull),
            RegistryError::RegistryFull.to_string(),
        ),
    ] {
        assert_eq!(wrapper.to_string(), original);
    }
    private_api_proofs();
    let binary = env!("CARGO_BIN_EXE_water-native-session");
    for (args, code, expected) in [
        (
            vec![],
            64,
            "InvalidArguments at /native_session\n".to_owned(),
        ),
        (
            vec!["private-one", "private-two"],
            64,
            "InvalidArguments at /native_session\n".to_owned(),
        ),
        (
            vec!["private-relative"],
            2,
            format!(
                "{}\n",
                PickerOptions::new("private-relative").err().unwrap()
            ),
        ),
    ] {
        let output = Command::new(binary).args(args).output().unwrap();
        assert_eq!(output.status.code(), Some(code));
        assert!(output.stdout.is_empty());
        assert_eq!(String::from_utf8(output.stderr).unwrap(), expected);
    }
    let output = Command::new(binary).arg(&f.missing).output().unwrap();
    assert_eq!(output.status.code(), Some(2));
    assert!(output.stdout.is_empty());
    let error = String::from_utf8(output.stderr).unwrap();
    assert!(error.ends_with('\n') && error.lines().count() == 1);
    assert!(!error.contains(&f.missing) && !error.contains("panicked"));
    #[cfg(windows)]
    {
        use std::{ffi::OsString, os::windows::ffi::OsStringExt};
        let invalid_unicode = OsString::from_wide(&[0xD800]);
        let output = Command::new(binary).arg(invalid_unicode).output().unwrap();
        assert_eq!(output.status.code(), Some(2));
        assert!(output.stdout.is_empty());
        assert_eq!(output.stderr, b"InvalidArguments at /native_session\n");
    }
}
