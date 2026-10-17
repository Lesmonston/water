// Controller-owned checks against the actual F library. No fixture writes.
use serde_json::{Value, json};
use std::cell::{Cell, RefCell};
use std::ffi::OsString;
use water_contracts::v1::{Coverage, ScanStatus};
use water_scan::fixture_v1::*;

fn run(case: &str) -> FixtureRun {
    let index: Value = serde_json::from_str(
        &std::fs::read_to_string(std::env::var_os("WATER_SCAN_FIXTURE_INDEX").unwrap()).unwrap(),
    ).unwrap();
    let item = index["runs"].as_array().unwrap().iter().find(|v| v["case_id"] == case).unwrap();
    open_fixture_run(item["run_id"].as_str().unwrap()).unwrap()
}
fn opts() -> ScanOptions { ScanOptions::new(16, 128, 1024).unwrap() }
#[derive(Default)]
struct Io {
    calls: RefCell<Vec<(String, String, String)>>,
    names: Option<Vec<OsString>>,
    fault: Option<(String, String, IoFaultKind, bool)>,
    cancel_root: Option<CancelToken>,
    rejected_links: Cell<usize>,
}
impl Io {
    fn call(&self, op: &str, node: &ScanNodePath) -> Result<(), IoFault> {
        self.calls.borrow_mut().push((op.into(), node.scope_id().as_str().into(), node.relative_path().as_str().into()));
        if let Some((operation, scope, kind, injected)) = &self.fault {
            if operation == op && scope == node.scope_id().as_str() && node.relative_path().as_str().is_empty() {
                return Err(IoFault { kind: kind.clone(), injected: *injected });
            }
        }
        Ok(())
    }
}
impl ReadOnlyIo for Io {
    fn inspect(&self, node: &ScanNodePath) -> Result<NodeMetadata, IoFault> {
        self.call("inspect", node)?;
        let metadata = NativeIo.inspect(node)?;
        if metadata.kind == EntryKind::Link {
            let fault = NativeIo.list_names(node, 1).unwrap_err();
            assert_eq!(fault, IoFault { kind: IoFaultKind::RootChanged, injected: false });
            self.rejected_links.set(self.rejected_links.get() + 1);
        }
        if node.relative_path().as_str().is_empty() {
            if let Some(token) = &self.cancel_root { token.cancel(); }
        }
        assert!(!format!("{node:?}").contains(".local"));
        Ok(metadata)
    }
    fn list_names(&self, node: &ScanNodePath, limit: usize) -> Result<Vec<OsString>, IoFault> {
        self.call("read_dir", node)?;
        let native = NativeIo.list_names(node, limit)?;
        Ok(self.names.clone().unwrap_or(native))
    }
}
struct CancelAfter { token: CancelToken, after: u32 }
impl ScanObserver for CancelAfter {
    fn on_entry(&self, progress: &ScanProgress) {
        if progress.recorded_entries == self.after { self.token.cancel(); }
    }
}
fn facts(run: &FixtureRun, options: &ScanOptions, token: &CancelToken, io: &Io) -> ScanFacts {
    scan_fixture_with_io(run, options, token, io, &NoopObserver).unwrap()
}

#[test]
fn lexical_options_and_error_redaction() {
    for id in ["run-a\r", "run-a\n", "run-a\u{2028}", "run-a\0", "run-A", "run-ø", "run--a", "run-a/..", "run-a\\..", "run-a:"] {
        let error = open_fixture_run(id).unwrap_err();
        assert_eq!(error.code, ScanErrorCode::InvalidRunId);
        assert_eq!(error.field, "/run_id");
        assert_eq!(format!("{error}"), "InvalidRunId at /run_id");
        assert!(!format!("{error:?}").contains(id));
    }
    assert_eq!(open_fixture_run(&format!("run-{}", "a".repeat(49))).unwrap_err().code, ScanErrorCode::InvalidRunId);
    for option in [(65, 1, 1), (0, 0, 1), (0, 1, 0), (0, 10001, 1), (0, 1, 1025)] {
        assert_eq!(ScanOptions::new(option.0, option.1, option.2).unwrap_err().code, ScanErrorCode::InvalidOptions);
    }
    assert!(ScanOptions::new(64, 10000, 1024).is_ok());
    let fixture = run("entry-budget");
    assert!(!format!("{fixture:?}").contains(".local"));
}

#[test]
fn cancellation_precedes_depth_and_budget_at_pending_operations() {
    let fixture = run("depth-budget");
    let token = CancelToken::new(); token.clone().cancel();
    let io = Io::default();
    let result = facts(&fixture, &ScanOptions::new(0, 1, 1).unwrap(), &token, &io);
    assert_eq!(result.status, ScanStatus::Cancelled); assert!(io.calls.borrow().is_empty());
    assert_eq!(serde_json::to_value(&result.scopes[0].issues).unwrap(), json!([{"code":"cancelled","relative_path":null,"origin":"control","operation":"cancel"}]));
    // First fact is a directory at the depth and entry limits: cancellation wins.
    let token = CancelToken::new();
    let io = Io::default();
    let observer = CancelAfter { token: token.clone(), after: 1 };
    let result = scan_fixture_with_io(&fixture, &ScanOptions::new(1, 1, 1024).unwrap(), &token, &io, &observer).unwrap();
    assert_eq!(result.status, ScanStatus::Cancelled); assert_eq!(result.recorded_entries, 1);
    assert_eq!(serde_json::to_value(&result.scopes[0].issues).unwrap(), json!([{"code":"cancelled","relative_path":"l1","origin":"control","operation":"cancel"}]));
    assert_eq!(io.calls.borrow().iter().filter(|c| c.0 == "read_dir").count(), 1);
    // Cancellation inside root inspect is observed before its pending list operation.
    let token = CancelToken::new();
    let io = Io { cancel_root: Some(token.clone()), ..Io::default() };
    let result = facts(&fixture, &opts(), &token, &io);
    assert_eq!(result.status, ScanStatus::Cancelled); assert_eq!(io.calls.borrow().len(), 1);
    assert_eq!(result.visited_entries, 0);
    // Cancellation at the final leaf must not invent unfinished work.
    let flat = run("entry-budget"); let token = CancelToken::new();
    let observer = CancelAfter { token: token.clone(), after: 4 };
    let result = scan_fixture_with_io(&flat, &ScanOptions::new(16, 4, 1024).unwrap(), &token, &Io::default(), &observer).unwrap();
    assert!(token.is_cancelled()); assert_eq!(result.status, ScanStatus::Completed);
}

#[test]
fn malformed_names_and_rejected_batches_never_gain_child_io() {
    let fixture = run("entry-budget");
    let invalid = ["", ".", "..", "a/", "a//b", "a/./b", "../x", "a\\b", "a:b", "a\0b", "a\nb", "/x"];
    let io = Io { names: Some(invalid.iter().map(OsString::from).collect()), ..Io::default() };
    let result = facts(&fixture, &opts(), &CancelToken::new(), &io);
    assert_eq!(result.visited_entries as usize, invalid.len()); assert_eq!(result.recorded_entries, 0);
    assert_eq!(io.calls.borrow().len(), 2);
    assert_eq!(result.scopes[0].issues.len(), invalid.len());
    assert!(result.scopes[0].issues.iter().all(|i| serde_json::to_value(i).unwrap() == json!({"code":"path_unrepresentable","relative_path":"","origin":"policy","operation":"inspect"})));
    for names in [vec![OsString::from("a.txt"); 2], (0..1025).map(|n| OsString::from(format!("x{n}"))).collect()] {
        let io = Io { names: Some(names), ..Io::default() };
        let result = facts(&fixture, &opts(), &CancelToken::new(), &io);
        assert_eq!(result.visited_entries, 0); assert_eq!(io.calls.borrow().len(), 2);
        assert_eq!(result.scopes[0].coverage, Coverage::Partial);
    }
    // A genuine native NotFound retains native provenance and consumes one visit.
    let io = Io { names: Some(vec!["controller-absent-synthetic.txt".into()]), ..Io::default() };
    let result = facts(&fixture, &opts(), &CancelToken::new(), &io);
    assert_eq!(result.visited_entries, 1); assert_eq!(result.recorded_entries, 0);
    assert_eq!(serde_json::to_value(&result.scopes[0].issues).unwrap(), json!([{"code":"io_error","relative_path":"controller-absent-synthetic.txt","origin":"native","operation":"inspect"}]));
}

#[test]
fn native_directory_link_guard_is_independent_of_walker_classification() {
    let fixture = run("directory-links"); let io = Io::default();
    let result = facts(&fixture, &opts(), &CancelToken::new(), &io);
    let count = result.scopes[0].entries.iter().filter(|e| e.kind == EntryKind::Link).count();
    assert_eq!(io.rejected_links.get(), count);
    assert_eq!(result.status, ScanStatus::Completed);
    assert!(io.calls.borrow().iter().all(|c| c.0 != "read_dir" || c.2.is_empty()));
    assert!(io.calls.borrow().iter().all(|c| !c.2.contains("canary") && !c.2.contains("outside-target/")));
    eprintln!("native link terminal read_dir rejections={count}");
}

#[test]
fn later_scope_faults_preserve_finished_scope_and_exact_origins() {
    let fixture = run("overlapping-scopes");
    for kind in [IoFaultKind::RootChanged, IoFaultKind::PermissionDenied, IoFaultKind::NotFound, IoFaultKind::Io, IoFaultKind::DirectoryLimit] {
        for injected in [false, true] {
            for operation in ["inspect", "read_dir"] {
                let io = Io { fault: Some((operation.into(), "scope-inner".into(), kind.clone(), injected)), ..Io::default() };
                let result = facts(&fixture, &opts(), &CancelToken::new(), &io);
                assert_eq!(result.scopes[0].coverage, Coverage::Complete);
                assert_eq!(result.scopes[0].entries.len(), 3);
                assert!(result.scopes[0].issues.is_empty());
                assert_eq!(result.scopes[1].coverage, Coverage::Partial);
                assert!(result.scopes[1].entries.is_empty());
                let code = match kind { IoFaultKind::RootChanged => "root_changed", IoFaultKind::PermissionDenied => "permission_denied", IoFaultKind::DirectoryLimit => "entry_limit", _ => "io_error" };
                let origin = if injected { "injected" } else if kind == IoFaultKind::DirectoryLimit { "policy" } else { "native" };
                let op = if kind == IoFaultKind::RootChanged { "root_guard" } else { operation };
                assert_eq!(serde_json::to_value(&result.scopes[1].issues).unwrap(), json!([{"code":code,"relative_path":"","origin":origin,"operation":op}]));
                assert_eq!(result.visited_entries, 3); assert_eq!(result.recorded_entries, 3);
            }
        }
    }
}
