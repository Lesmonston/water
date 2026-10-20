#![forbid(unsafe_code)]
use serde::Serialize;
use serde_json::{Value, json};
use std::{
    fs,
    io::{Cursor, Write},
    panic::{AssertUnwindSafe, catch_unwind},
    path::{Path, PathBuf},
    process::{Command, Output, Stdio},
    time::{Duration, Instant},
};
use water_contracts::v1::OpaqueId;
use water_native_scan::v1::{CancelToken, NoopObserver, ScanObserver, ScanProgress};
use water_project_session::v1::*;
use water_scan_host::{HostError, HostState};
use water_scope_registry::v1::{RegisteredScope, Registry};

fn id(text: &str) -> OpaqueId {
    OpaqueId::new(text).unwrap()
}
fn tree() -> &'static Path {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
}
fn fixtures() -> Value {
    let expected = tree().join(".local/root-marker-fixtures/index.json");
    assert_eq!(
        PathBuf::from(std::env::var_os("WATER_MARKER_INDEX").unwrap()),
        expected
    );
    // Only the frozen metadata index is read here; payload reads go through Z.
    let value: Value = serde_json::from_str(&fs::read_to_string(expected).unwrap()).unwrap();
    assert_eq!(value["literal_payload_bytes"], 524474);
    for (name, path) in value["roots"].as_object().unwrap() {
        assert_eq!(
            Path::new(path.as_str().unwrap()),
            tree()
                .join(".local/root-marker-fixtures/batch-v1")
                .join(name)
        );
    }
    value
}
fn register(registry: &mut Registry, path: &str, label: &str) -> RegisteredScope {
    let pending = registry.prepare(&id(label), path).unwrap();
    registry.confirm(&pending).unwrap()
}
fn capture(name: &str, job: &str, choice: MarkerChoice, cancelled: bool) -> Value {
    let f = fixtures();
    let root = f["roots"][name].as_str().unwrap();
    let mut registry = Registry::new(2).unwrap();
    let scope = register(&mut registry, root, "project-scope");
    let cancel = CancelToken::new();
    if cancelled {
        cancel.cancel();
    }
    let captured = capture_registered(
        &mut registry,
        &scope,
        root,
        &id(job),
        choice,
        &cancel,
        &NoopObserver,
    )
    .expect("AA_BEHAVIOR real registered capture must produce metadata and the separate marker");
    assert_eq!(captured.clone(), captured);
    let raw = to_json(&captured).unwrap();
    assert_eq!(serde_json::to_string(&captured).unwrap(), raw);
    assert!(raw.len() <= MAX_BUNDLE_BYTES);
    let debug = format!("{captured:?}");
    for secret in [
        root,
        "FAKE_PRIVATE_MARKER_CANARY",
        "FAKE_DEP",
        "FAKE_NEVER_RUN",
        "FAKE_OUTSIDE_CANARY",
    ] {
        assert!(!raw.contains(secret));
        assert!(!debug.contains(secret));
    }
    let value: Value = serde_json::from_str(&raw).unwrap();
    assert_eq!(value.as_object().unwrap().len(), 4);
    assert_eq!(value["capture_version"], "water.project-capture.v1");
    assert_eq!(value["snapshot"].as_object().unwrap().len(), 4);
    assert_eq!(value["marker"].as_object().unwrap().len(), 3);
    assert_eq!(value["snapshot"]["source_kind"], "native_scope_metadata");
    assert_eq!(value["snapshot"]["view"]["scan_id"], job);
    // The public API releases its attempt and preserves the caller's registration.
    assert_eq!(registry.len(), 1);
    let permit = registry.begin_scan(&scope).unwrap();
    registry.finish(&permit).unwrap();
    registry.revoke(&scope).unwrap();
    assert!(registry.is_empty());
    value
}

#[test]
fn project_request_boundary() {
    assert_eq!(
        decode_request(br#"{"command":"start","job_id":"job-1","read_manifest":false}"#).unwrap(),
        ProjectRequest::Start {
            job_id: id("job-1"),
            read_manifest: false
        }
    );
    assert_eq!(
        decode_request(br#"{"read_manifest":true,"job_id":"job-2","command":"start"}"#).unwrap(),
        ProjectRequest::Start {
            job_id: id("job-2"),
            read_manifest: true
        }
    );
    assert_eq!(
        decode_request(br#"{"command":"cancel","job_id":"job-1"}"#).unwrap(),
        ProjectRequest::Cancel {
            job_id: id("job-1")
        }
    );
    assert_eq!(
        decode_request(br#"{"command":"shutdown"}"#).unwrap(),
        ProjectRequest::Shutdown
    );
    for raw in [
        "",
        "{}",
        "[]",
        "null",
        "{\"command\":\"shutdown\"}\n",
        "{\"command\":\"shutdown\"}\r",
        " {\"command\":\"shutdown\"}",
        "{\"command\": \"shutdown\"}",
        "{\"command\":\"shutdown\"}{}",
        "\u{feff}{\"command\":\"shutdown\"}",
        r#"{"command":"start","job_id":"job"}"#,
        r#"{"command":"start","job_id":"job","read_manifest":null}"#,
        r#"{"command":"start","job_id":"job","read_manifest":"true"}"#,
        r#"{"command":"start","job_id":"job","read_manifest":1}"#,
        r#"{"command":"start","job_id":"job","read_manifest":true,"path":"F:/x"}"#,
        r#"{"command":"start","job_id":"job","job_id":"other","read_manifest":true}"#,
        r#"{"command":"start","job_id":"job","read_manifest":true,"read_manifest":false}"#,
        r#"{"command":"start","job_id":"job","read_manifest":true,"read_manife\u0073t":false}"#,
        r#"{"command":"start","job_id":"job","job_\u0069d":"other","read_manifest":true}"#,
        r#"{"command":"start","command":"shutdown","job_id":"job","read_manifest":true}"#,
        r#"{"command":"shutdown","comman\u0064":"shutdown"}"#,
        r#"{"command":"cancel","job_id":"job","read_manifest":false}"#,
        r#"{"command":"cancel","job_id":"job","read_manifest":null}"#,
        r#"{"command":"shutdown","job_id":null}"#,
        r#"{"command":"shutdown","read_manifest":null}"#,
        r#"{"command":"start","job_id":"../bad","read_manifest":true}"#,
        r#"{"command":"start","job_id":"","read_manifest":true}"#,
        r#"{"command":"unknown"}"#,
    ] {
        assert_eq!(
            decode_request(raw.as_bytes()),
            Err(ProjectError::InvalidRequest),
            "AA_BEHAVIOR request {raw}"
        );
    }
    assert_eq!(
        decode_request(&[b'{', 0xff, b'}']),
        Err(ProjectError::InvalidRequest)
    );
    assert_eq!(
        decode_request(&vec![b'x'; MAX_REQUEST_BYTES + 1]),
        Err(ProjectError::InvalidRequest)
    );
    let mut framed = Cursor::new(b"{\"command\":\"shutdown\"}\n");
    assert_eq!(
        read_request(&mut framed),
        Ok(Some(ProjectRequest::Shutdown))
    );
    assert_eq!(read_request(&mut framed), Ok(None));
    assert_eq!(
        read_request(&mut Cursor::new(b"\n")),
        Err(FrameError::InvalidRequest)
    );
    assert_eq!(
        read_request(&mut Cursor::new(b"{\"command\":\"shutdown\"}\r\n")),
        Err(FrameError::InvalidRequest)
    );
    assert_eq!(
        read_request(&mut Cursor::new(b"{\"command\":\"shutdown\"}")),
        Err(FrameError::Truncated)
    );
    assert_eq!(
        read_request(&mut Cursor::new(vec![b'x'; MAX_REQUEST_BYTES + 1])),
        Err(FrameError::TooLong)
    );
}

#[test]
fn project_consent_state() {
    let skipped = capture("good", "choice-skip", MarkerChoice::Skip, false);
    assert_eq!(skipped["read_manifest"], false);
    assert_eq!(
        skipped["marker"],
        json!({"status":"not_requested","error_code":null,"observation_json":null}),
        "AA_NO_CONTENT_CONSENT Skip must never enter real Z content reading"
    );
    let cancelled = capture(
        "good",
        "choice-cancel",
        MarkerChoice::ReadRootPackageJson,
        true,
    );
    assert_eq!(cancelled["snapshot"]["view"]["status"], "cancelled");
    assert_eq!(
        cancelled["marker"],
        json!({"status":"skipped","error_code":"scan_cancelled","observation_json":null}),
        "AA_CANCEL_NO_READ a real cancelled R report must never enter Z"
    );
    let skipped_cancelled = capture("good", "choice-skip-cancel", MarkerChoice::Skip, true);
    assert_eq!(skipped_cancelled["marker"]["status"], "not_requested");
    let read = capture(
        "good",
        "choice-read",
        MarkerChoice::ReadRootPackageJson,
        false,
    );
    assert_eq!(read["read_manifest"], true);
    assert_eq!(read["marker"]["status"], "observed");
    let next = capture("good", "choice-next", MarkerChoice::Skip, false);
    assert_eq!(
        next["marker"]["status"], "not_requested",
        "AA_NO_CONTENT_CONSENT no inherited consent"
    );
    let mut state = HostState::new();
    let job = state.start(id("active-job")).unwrap();
    assert_eq!(state.start(id("other-job")).unwrap_err(), HostError::Busy);
    assert!(state.progress(job.job_id(), 1, 1).is_some());
    assert!(state.progress(job.job_id(), 0, 0).is_none());
    assert!(state.progress(job.job_id(), 10001, 1).is_none());
    assert!(state.progress(&id("wrong-job"), 2, 2).is_none());
    assert!(state.cancel(&id("wrong-job")).is_err());
    assert!(!job.cancel_token().is_cancelled());
    state.cancel(job.job_id()).unwrap();
    assert!(job.cancel_token().is_cancelled());
    assert!(!state.shutdown());
    state.finish(job.job_id()).unwrap();
    assert!(state.is_stopped());
    let mut state = HostState::new();
    for n in 0..32 {
        let job = state.start(id(&format!("job-{n}"))).unwrap();
        state.finish(job.job_id()).unwrap();
    }
    assert_eq!(
        state.start(id("job-0")).unwrap_err(),
        HostError::ReusedJobId
    );
    assert_eq!(state.start(id("job-32")).unwrap_err(), HostError::JobLimit);
}

#[test]
fn project_capture_and_marker() {
    let cases: Value = serde_json::from_str(include_str!(
        "../../../contracts/project-session-v1/CASES.json"
    ))
    .unwrap();
    for (index, name, job, choice, cancelled) in [
        (0, "good", "project-default", MarkerChoice::Skip, false),
        (
            1,
            "good",
            "project-observed",
            MarkerChoice::ReadRootPackageJson,
            false,
        ),
        (
            2,
            "good",
            "project-cancelled",
            MarkerChoice::ReadRootPackageJson,
            true,
        ),
        (
            3,
            "missing",
            "project-missing",
            MarkerChoice::ReadRootPackageJson,
            false,
        ),
        (
            4,
            "malformed",
            "project-invalid",
            MarkerChoice::ReadRootPackageJson,
            false,
        ),
        (
            5,
            "hardlink",
            "project-hardlink",
            MarkerChoice::ReadRootPackageJson,
            false,
        ),
    ] {
        let observed = capture(name, job, choice, cancelled);
        let gold = &cases["cases"][index];
        assert_eq!(
            observed["snapshot"], gold["bundle"]["snapshots"][0],
            "AA_BEHAVIOR preserve real R/E/H/Q dependency values"
        );
        assert_eq!(
            observed["marker"], gold["marker"],
            "AA_BEHAVIOR preserve real Z's JSON string"
        );
    }
    for (name, error) in [
        ("invalid", "InvalidUtf8"),
        ("malformed", "InvalidManifest"),
        ("oversize", "InputTooLarge"),
        ("directory", "NotRegularFile"),
        ("hardlink", "MultipleLinks"),
    ] {
        let got = capture(
            name,
            "marker-errors",
            MarkerChoice::ReadRootPackageJson,
            false,
        );
        assert_eq!(
            got["marker"],
            json!({"status":"failed","error_code":error,"observation_json":null})
        );
        assert!(got["snapshot"]["view"].is_object());
    }
    let link = capture(
        "link",
        "marker-link",
        MarkerChoice::ReadRootPackageJson,
        false,
    );
    assert_eq!(link["marker"]["status"], "failed");
    assert!(
        ["ReparsePoint", "NotRegularFile"]
            .contains(&link["marker"]["error_code"].as_str().unwrap())
    );
    assert_eq!(
        capture(
            "trap",
            "marker-trap",
            MarkerChoice::ReadRootPackageJson,
            false
        )["marker"]["status"],
        "missing"
    );
    let exact = capture(
        "exact",
        "marker-exact",
        MarkerChoice::ReadRootPackageJson,
        false,
    );
    let observation: Value =
        serde_json::from_str(exact["marker"]["observation_json"].as_str().unwrap()).unwrap();
    assert_eq!(observation["bytes_read"], 262144);
    assert_eq!(observation["ordinary_content_read"], true);
    assert_eq!(observation["risk"], "protected");
    assert_eq!(observation["action"], "display_only");
    for field in [
        "native_user_gesture_authenticated",
        "race_protection_verified",
        "project_membership_verified",
    ] {
        assert_eq!(observation[field], false);
    }
}

struct PanicObserver;
impl ScanObserver for PanicObserver {
    fn on_entry(&self, _: &ScanProgress) {
        panic!("intentional observer unwind");
    }
}
struct CancelObserver<'a>(&'a CancelToken);
impl ScanObserver for CancelObserver<'_> {
    fn on_entry(&self, _: &ScanProgress) {
        self.0.cancel();
    }
}

fn cli(args: &[&str], input: &[u8]) -> Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_water-project-session"))
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child.stdin.take().unwrap().write_all(input).unwrap();
    let start = Instant::now();
    while child.try_wait().unwrap().is_none() {
        if start.elapsed() > Duration::from_secs(5) {
            let _ = child.kill();
            panic!("AA_BEHAVIOR idle CLI did not exit");
        }
        std::thread::sleep(Duration::from_millis(5));
    }
    child.wait_with_output().unwrap()
}

fn type_probes() {
    let deps = std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap()
        .to_owned();
    let library = |name: &str| {
        let files: Vec<_> = fs::read_dir(&deps)
            .unwrap()
            .map(|e| e.unwrap().path())
            .filter(|p| {
                p.extension().is_some_and(|s| s == "rlib")
                    && p.file_name()
                        .unwrap()
                        .to_string_lossy()
                        .starts_with(&format!("lib{name}-"))
            })
            .collect();
        assert_eq!(
            files.len(),
            1,
            "AA_BEHAVIOR exact current library graph {name}"
        );
        files[0].clone()
    };
    let project = library("water_project_session");
    let json_library = library("serde_json");
    let output = tree().join(format!(
        ".local/checks/WATER-W1-AA/type-probes-{}",
        std::process::id()
    ));
    fs::create_dir(&output).unwrap();
    for (name, body, expected) in [
        (
            "positive",
            "let _ = MarkerChoice::Skip; let _ = decode_request; let _ = |c: &ConfirmedCapture| to_json(c);",
            None,
        ),
        (
            "capture_default",
            "let _ = ConfirmedCapture::default();",
            Some("E0599"),
        ),
        (
            "capture_construct",
            "let _ = ConfirmedCapture {};",
            Some("private fields"),
        ),
        (
            "capture_deserialize",
            "let _ = serde_json::from_str::<ConfirmedCapture>(\"{}\");",
            Some("E0277"),
        ),
        (
            "capture_mutate",
            "let _ = |c: &mut ConfirmedCapture| { c.read_manifest = true; };",
            Some("E0616"),
        ),
        (
            "choice_default",
            "let _ = MarkerChoice::default();",
            Some("E0599"),
        ),
        (
            "choice_deserialize",
            "let _ = serde_json::from_str::<MarkerChoice>(\"{}\");",
            Some("E0277"),
        ),
    ] {
        let source = output.join(format!("{name}.txt"));
        fs::write(
            &source,
            format!("use water_project_session::v1::*;\nfn main() {{ {body} }}\n"),
        )
        .unwrap();
        let result = Command::new(std::env::var_os("RUSTC").unwrap())
            .args([
                "--edition=2024",
                "--crate-type=lib",
                "--crate-name",
                name,
                "--emit=metadata",
            ])
            .arg("-L")
            .arg(format!("dependency={}", deps.display()))
            .arg("--extern")
            .arg(format!("water_project_session={}", project.display()))
            .arg("--extern")
            .arg(format!("serde_json={}", json_library.display()))
            .arg("--out-dir")
            .arg(&output)
            .arg(source)
            .output()
            .unwrap();
        let diagnostic = String::from_utf8(result.stderr).unwrap();
        fs::write(output.join(format!("{name}.log")), &diagnostic).unwrap();
        assert!(!diagnostic.contains("E0460") && !diagnostic.contains("E0463"));
        if let Some(expected) = expected {
            assert!(!result.status.success());
            assert!(diagnostic.contains(expected), "{name}: {diagnostic}");
        } else {
            assert!(
                result.status.success(),
                "AA_BEHAVIOR positive compiler control {diagnostic}"
            );
        }
    }
}

#[test]
fn project_wire_and_cleanup() {
    fn evidence<T: std::fmt::Debug + Clone + PartialEq + Serialize>() {}
    fn choice<T: std::fmt::Debug + Clone + Copy + PartialEq + Eq>() {}
    fn error<T: std::error::Error + Clone + PartialEq + Eq>() {}
    evidence::<ConfirmedCapture>();
    choice::<MarkerChoice>();
    error::<ProjectError>();
    for e in [
        ProjectError::InvalidArguments,
        ProjectError::InvalidRequest,
        ProjectError::NativeFailure,
        ProjectError::SerializationFailed,
        ProjectError::OutputTooLarge,
    ] {
        assert_eq!(e.to_string(), "Project session unavailable.");
        assert!(std::error::Error::source(&e).is_none());
    }
    let f = fixtures();
    let root = f["roots"]["good"].as_str().unwrap();
    let other = f["roots"]["other"].as_str().unwrap();
    let mut registry = Registry::new(2).unwrap();
    let scope = register(&mut registry, root, "project-scope");
    let other_scope = register(&mut registry, other, "other-scope");
    let other_permit = registry.begin_scan(&other_scope).unwrap();
    let run = |registry: &mut Registry, path: &str, token: &CancelToken| {
        capture_registered(
            registry,
            &scope,
            path,
            &id("cleanup"),
            MarkerChoice::ReadRootPackageJson,
            token,
            &NoopObserver,
        )
    };
    assert_eq!(
        run(&mut registry, other, &CancelToken::new()),
        Err(ProjectError::NativeFailure)
    );
    assert_eq!(
        run(&mut registry, "relative", &CancelToken::new()),
        Err(ProjectError::NativeFailure)
    );
    let permit = registry.begin_scan(&scope).unwrap();
    assert_eq!(
        run(&mut registry, root, &CancelToken::new()),
        Err(ProjectError::NativeFailure)
    );
    registry
        .check_permit(&permit)
        .expect("AA_BEHAVIOR preserve a pre-existing attempt");
    registry.finish(&permit).unwrap();
    let mut wrong_registry = Registry::new(1).unwrap();
    assert_eq!(
        run(&mut wrong_registry, root, &CancelToken::new()),
        Err(ProjectError::NativeFailure)
    );
    assert!(
        catch_unwind(AssertUnwindSafe(|| capture_registered(
            &mut registry,
            &scope,
            root,
            &id("panic"),
            MarkerChoice::ReadRootPackageJson,
            &CancelToken::new(),
            &PanicObserver
        )))
        .is_err(),
        "AA_BEHAVIOR observer must actually run"
    );
    let permit = registry
        .begin_scan(&scope)
        .expect("AA_BEHAVIOR unwind releases this scan attempt");
    registry.finish(&permit).unwrap();
    let cancel = CancelToken::new();
    let observed = capture_registered(
        &mut registry,
        &scope,
        root,
        &id("observer-cancel"),
        MarkerChoice::ReadRootPackageJson,
        &cancel,
        &CancelObserver(&cancel),
    )
    .unwrap();
    let observed: Value = serde_json::from_str(&to_json(&observed).unwrap()).unwrap();
    // R has already recorded this fixture's last entry when the observer cancels.
    // Preserve its completed report; the still-live token must block content.
    assert_eq!(observed["snapshot"]["view"]["status"], "completed");
    assert!(cancel.is_cancelled());
    assert_eq!(
        observed["marker"]["error_code"], "scan_cancelled",
        "AA_CANCEL_NO_READ observer cancellation"
    );
    registry
        .check_permit(&other_permit)
        .expect("AA_BEHAVIOR preserve the unrelated caller's attempt");
    registry.finish(&other_permit).unwrap();
    registry.revoke(&other_scope).unwrap();
    registry.revoke(&scope).unwrap();
    assert!(registry.is_empty());
    assert_eq!(
        run(&mut registry, root, &CancelToken::new()),
        Err(ProjectError::NativeFailure)
    );
    for args in [vec![], vec!["relative"], vec![root, "extra"]] {
        let output = cli(&args, b"");
        assert_eq!(output.status.code(), Some(64));
        assert!(output.stdout.is_empty());
        assert_eq!(output.stderr, b"Invalid project arguments.\n");
    }
    for (input, code, count) in [
        (b"".as_slice(), 0, 2),
        (b"{\"command\":\"shutdown\"}\n".as_slice(), 0, 2),
        (
            b"{\"command\":\"cancel\",\"job_id\":\"missing\"}\n{\"command\":\"shutdown\"}\n"
                .as_slice(),
            0,
            3,
        ),
        (
            b"{\"command\":\"start\",\"job_id\":\"no-choice\"}\n{\"command\":\"shutdown\"}\n"
                .as_slice(),
            0,
            3,
        ),
        (b"{\"command\":\"shutdown\"}".as_slice(), 2, 3),
    ] {
        let output = cli(&[root], input);
        assert_eq!(output.status.code(), Some(code));
        assert_eq!(
            output.stderr,
            if code == 0 {
                b"".as_slice()
            } else {
                b"Project session unavailable.\n".as_slice()
            }
        );
        let raw = String::from_utf8(output.stdout).unwrap();
        let events: Vec<Value> = raw
            .lines()
            .map(|line| {
                let event: Value = serde_json::from_str(line).unwrap();
                assert_eq!(serde_json::to_string(&event).unwrap().len(), line.len());
                event
            })
            .collect();
        assert_eq!(events.len(), count);
        assert!(raw.ends_with('\n'));
        assert_eq!(
            events[0],
            json!({"version":"water.project-host.v1","kind":"ready"})
        );
        assert_eq!(
            events.last().unwrap(),
            &json!({"version":"water.project-host.v1","kind":"stopped"})
        );
        for e in &events {
            assert_eq!(e["version"], "water.project-host.v1");
            assert!(e["kind"] != "accepted");
        }
        if count == 3 {
            assert_eq!(
                events[1]["code"],
                if input.starts_with(b"{\"command\":\"cancel\"") {
                    "UnknownJob"
                } else {
                    "InvalidRequest"
                }
            );
        }
        assert!(!raw.contains(root));
    }
    type_probes();
}
