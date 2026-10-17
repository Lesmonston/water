use serde_json::{Value, json};
use std::cell::RefCell;
use std::ffi::OsString;
use std::path::Path;
use water_contracts::v1::{Coverage, ScanStatus};
use water_scan::fixture_v1::*;

fn index() -> Value {
    let expected = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join(".local/checks/WATER-W1-F/active-fixtures.json");
    let supplied = std::env::var_os("WATER_SCAN_FIXTURE_INDEX").expect("helper index");
    assert_eq!(Path::new(&supplied), expected);
    let value: Value = serde_json::from_str(&std::fs::read_to_string(expected).unwrap()).unwrap();
    assert_eq!(value["index_version"], "water.scan-lab-fixtures.v1");
    value
}
fn matrix() -> Value {
    serde_json::from_str(include_str!("../../../contracts/scan-lab-v1/matrix.json")).unwrap()
}
fn run(index: &Value, case: &str) -> FixtureRun {
    open_fixture_run(
        index["runs"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["case_id"] == case)
            .unwrap()["run_id"]
            .as_str()
            .unwrap(),
    )
    .unwrap()
}
fn options() -> ScanOptions {
    ScanOptions::new(16, 128, 1024).unwrap()
}
fn scan(run: &FixtureRun, options: &ScanOptions, io: &Trace) -> ScanFacts {
    scan_fixture_with_io(run, options, &CancelToken::new(), io, &NoopObserver).unwrap()
}
fn paths(facts: &ScanFacts, scope: usize) -> Vec<&str> {
    facts.scopes[scope]
        .entries
        .iter()
        .map(|e| e.relative_path.as_str())
        .collect()
}
fn issues(facts: &ScanFacts, scope: usize) -> Value {
    serde_json::to_value(&facts.scopes[scope].issues).unwrap()
}
fn issue(code: &str, path: Option<&str>, origin: &str, operation: &str) -> Value {
    json!({"code":code,"relative_path":path,"origin":origin,"operation":operation})
}
fn assert_counts(facts: &ScanFacts) {
    assert_eq!(
        facts.visited_entries,
        facts.scopes.iter().map(|s| s.visited_entries).sum::<u32>()
    );
    assert_eq!(
        facts.recorded_entries as usize,
        facts.scopes.iter().map(|s| s.entries.len()).sum::<usize>()
    );
}

#[derive(Debug, Clone)]
struct Call {
    operation: &'static str,
    scope: String,
    path: String,
    limit: Option<usize>,
}
#[derive(Default)]
struct Trace {
    calls: RefCell<Vec<Call>>,
    fault: Option<(&'static str, &'static str, IoFaultKind)>,
    reverse: bool,
    names: Option<Vec<OsString>>,
}
impl Trace {
    fn fault(operation: &'static str, path: &'static str, kind: IoFaultKind) -> Self {
        Self {
            fault: Some((operation, path, kind)),
            ..Self::default()
        }
    }
    fn record(
        &self,
        operation: &'static str,
        node: &ScanNodePath,
        limit: Option<usize>,
    ) -> Result<(), IoFault> {
        let debug = format!("{node:?}");
        assert!(!debug.contains(env!("CARGO_MANIFEST_DIR")) && !debug.contains(".local"));
        self.calls.borrow_mut().push(Call {
            operation,
            scope: node.scope_id().as_str().to_owned(),
            path: node.run_relative_path().as_str().to_owned(),
            limit,
        });
        if let Some((op, path, kind)) = &self.fault
            && operation == *op
            && node.run_relative_path().as_str() == *path
        {
            return Err(IoFault {
                kind: kind.clone(),
                injected: true,
            });
        }
        Ok(())
    }
    fn has(&self, operation: &str, path: &str) -> bool {
        self.calls
            .borrow()
            .iter()
            .any(|c| c.operation == operation && c.path == path)
    }
    fn child_inspects(&self) -> usize {
        self.calls
            .borrow()
            .iter()
            .filter(|c| c.operation == "inspect" && c.path != "scope")
            .count()
    }
}
impl ReadOnlyIo for Trace {
    fn inspect(&self, node: &ScanNodePath) -> Result<NodeMetadata, IoFault> {
        self.record("inspect", node, None)?;
        NativeIo.inspect(node)
    }
    fn list_names(&self, node: &ScanNodePath, limit: usize) -> Result<Vec<OsString>, IoFault> {
        self.record("read_dir", node, Some(limit))?;
        // Always exercise the real bounded directory operation before replacing a batch.
        let mut names = NativeIo.list_names(node, limit)?;
        if let Some(replacement) = &self.names {
            names = replacement.clone();
        }
        if self.reverse {
            names.sort_by(|a, b| b.as_encoded_bytes().cmp(a.as_encoded_bytes()));
        }
        Ok(names)
    }
}
struct Observer {
    cancel: CancelToken,
    after: u32,
    progress: RefCell<Vec<ScanProgress>>,
}
impl Observer {
    fn new(cancel: &CancelToken, after: u32) -> Self {
        Self {
            cancel: cancel.clone(),
            after,
            progress: RefCell::new(Vec::new()),
        }
    }
}
impl ScanObserver for Observer {
    fn on_entry(&self, progress: &ScanProgress) {
        self.progress.borrow_mut().push(progress.clone());
        if progress.recorded_entries == self.after {
            self.cancel.cancel();
        }
    }
}

#[test]
fn scan_native_fixtures() {
    let index = index();
    let matrix = matrix();
    assert_eq!(index["runs"].as_array().unwrap().len(), 11);
    let mut total = 0;
    let mut scopes = 0;
    let mut unavailable = 0;
    for (run_data, expected) in index["runs"]
        .as_array()
        .unwrap()
        .iter()
        .zip(matrix["cases"].as_array().unwrap())
    {
        assert_eq!(run_data["case_id"], expected["case_id"]);
        let fixture = open_fixture_run(run_data["run_id"].as_str().unwrap()).unwrap();
        assert_eq!(fixture.run_id(), run_data["run_id"].as_str().unwrap());
        assert_eq!(fixture.case_id(), run_data["case_id"].as_str().unwrap());
        let p = &expected["options"];
        let opts = ScanOptions::new(
            p["max_depth"].as_u64().unwrap() as u32,
            p["max_entries"].as_u64().unwrap() as u32,
            1024,
        )
        .unwrap();
        assert_eq!(opts.max_depth(), p["max_depth"].as_u64().unwrap() as u32);
        assert_eq!(
            opts.max_entries(),
            p["max_entries"].as_u64().unwrap() as u32
        );
        assert_eq!(opts.max_dir_entries(), 1024);
        let facts = scan_fixture(&fixture, &opts, &CancelToken::new()).unwrap();
        assert_eq!(facts.facts_version, "water.scan-lab.v1");
        assert_eq!(facts.run_id, fixture.run_id());
        assert_eq!(facts.case_id, fixture.case_id());
        assert_eq!(
            facts.scopes.len(),
            expected["scopes"].as_array().unwrap().len()
        );
        for (actual, spec) in facts
            .scopes
            .iter()
            .zip(expected["scopes"].as_array().unwrap())
        {
            let available: Vec<Value> = spec["native_entries"].as_array().unwrap().iter().filter_map(|e| {
                let node = run_data["nodes"].as_array().unwrap().iter().find(|n| n["path"] == e["run_relative_path"]).unwrap();
                if node["status"] != "created" { unavailable += 1; return None; }
                Some(json!({"relative_path":e["relative_path"],"depth":e["depth"],"kind":e["kind"],"logical_bytes":e["logical_bytes"]}))
            }).collect();
            let observed: Vec<Value> = actual.entries.iter().map(|e| json!({"relative_path":e.relative_path,"depth":e.depth,"kind":e.kind,"logical_bytes":e.logical_bytes})).collect();
            assert_eq!(
                observed,
                available,
                "native entries for {}",
                fixture.case_id()
            );
            assert_eq!(actual.scope_id.as_str(), spec["scope_id"].as_str().unwrap());
            assert_eq!(
                actual.relative_root.as_str(),
                spec["relative_root"].as_str().unwrap()
            );
            assert_eq!(
                serde_json::to_value(actual.coverage).unwrap(),
                spec["native_coverage"]
            );
            assert_eq!(
                serde_json::to_value(&actual.issues).unwrap(),
                spec["native_issues"]
            );
            assert_eq!(actual.visited_entries as usize, available.len());
            total += available.len();
            scopes += 1;
        }
        assert_counts(&facts);
        assert_eq!(
            facts.status,
            if facts.scopes.iter().any(|s| s.coverage == Coverage::Partial) {
                ScanStatus::Partial
            } else {
                ScanStatus::Completed
            }
        );
    }
    assert_eq!(scopes, 12);
    assert_eq!(total + unavailable, 39);
    eprintln!("native cases=11 scopes={scopes} entries={total} unsupported_entries={unavailable}");
}

#[test]
fn scan_scope_and_links() {
    let index = index();
    let negatives: Value = serde_json::from_str(include_str!(
        "../../../contracts/scan-lab-v1/negative-inputs.json"
    ))
    .unwrap();
    for id in negatives["invalid_run_ids"].as_array().unwrap() {
        let error = open_fixture_run(id.as_str().unwrap()).unwrap_err();
        assert_eq!(error.code, ScanErrorCode::InvalidRunId);
        assert_eq!(error.field, "/run_id");
        assert_eq!(error.to_string(), "InvalidRunId at /run_id");
    }
    for opt in negatives["invalid_options"].as_array().unwrap() {
        let error = ScanOptions::new(
            opt["max_depth"].as_u64().unwrap() as u32,
            opt["max_entries"].as_u64().unwrap() as u32,
            opt["max_dir_entries"].as_u64().unwrap() as u32,
        )
        .unwrap_err();
        assert_eq!(
            error,
            ScanError {
                code: ScanErrorCode::InvalidOptions,
                field: "/options"
            }
        );
    }
    for tuple in [(u32::MAX, 1, 1), (0, u32::MAX, 1), (0, 1, u32::MAX)] {
        assert!(ScanOptions::new(tuple.0, tuple.1, tuple.2).is_err());
    }
    assert!(ScanOptions::new(64, 10000, 1024).is_ok());
    let mut created = 0;
    for item in index["negative"].as_array().unwrap() {
        if item["status"] == "unsupported" {
            assert!(["linked_run", "linked_ancestor"].contains(&item["id"].as_str().unwrap()));
            assert!(
                ["EPERM", "EACCES", "ENOSYS", "ENOTSUP", "EOPNOTSUPP"]
                    .contains(&item["error_code"].as_str().unwrap())
            );
            eprintln!(
                "negative unsupported: {} {}",
                item["id"], item["error_code"]
            );
        } else {
            let error = open_fixture_run(item["run_id"].as_str().unwrap()).unwrap_err();
            let expected = if item["expected"] == "UnsafeRoot" {
                ScanErrorCode::UnsafeRoot
            } else {
                ScanErrorCode::InvalidMarker
            };
            assert_eq!(error.code, expected, "{}", item["id"]);
            assert_eq!(
                error.field,
                if expected == ScanErrorCode::UnsafeRoot {
                    "/run_root"
                } else {
                    "/marker"
                }
            );
            created += 1;
        }
    }
    assert!(created >= 4);
    for case in ["scope-prefix", "directory-links"] {
        let fixture = run(&index, case);
        assert!(!format!("{fixture:?}").contains(".local"));
        let trace = Trace::default();
        let facts = scan(&fixture, &options(), &trace);
        assert_eq!(facts.status, ScanStatus::Completed);
        assert!(facts.scopes[0].issues.is_empty());
        assert!(paths(&facts, 0).contains(&"inside.txt"));
        for call in trace.calls.borrow().iter() {
            assert!(call.path == "scope" || call.path.starts_with("scope/"));
            assert!(
                !call.path.contains("canary")
                    && !call.path.starts_with("scope-other")
                    && !call.path.starts_with("outside-target")
            );
            if call.operation == "read_dir" {
                assert_eq!(call.path, "scope", "links must never be enumerated");
            }
        }
        for entry in &facts.scopes[0].entries {
            if entry.relative_path.as_str().ends_with("outside") {
                assert_eq!(
                    entry.kind,
                    EntryKind::Link,
                    "native links remain link facts"
                );
                assert!(entry.logical_bytes.is_none());
            }
        }
    }
    // Snapshot byte equality is independently checked by the frozen Node gate. This
    // test never opens a payload to infer whether the scanner opened it.
}

#[test]
fn scan_budgets_and_order() {
    let index = index();
    let depth = run(&index, "depth-budget");
    let trace = Trace::default();
    let zero = scan(&depth, &ScanOptions::new(0, 128, 1024).unwrap(), &trace);
    assert_eq!(zero.visited_entries, 0);
    assert_eq!(zero.status, ScanStatus::Partial);
    assert_eq!(
        issues(&zero, 0),
        json!([issue("depth_limit", Some(""), "policy", "budget")])
    );
    assert!(!trace.has("read_dir", "scope"));
    let trace = Trace::default();
    let two = scan(&depth, &ScanOptions::new(2, 128, 1024).unwrap(), &trace);
    assert_eq!(paths(&two, 0), ["l1", "l1/l2", "root.txt"]);
    assert_eq!(
        issues(&two, 0),
        json!([issue("depth_limit", Some("l1/l2"), "policy", "budget")])
    );
    assert!(!trace.has("read_dir", "scope/l1/l2") && !trace.has("inspect", "scope/l1/l2/l3"));

    let flat = run(&index, "entry-budget");
    let trace = Trace {
        reverse: true,
        ..Trace::default()
    };
    let limited = scan(&flat, &ScanOptions::new(16, 2, 1024).unwrap(), &trace);
    assert!(
        !trace.has("inspect", "scope/c.txt"),
        "global budget stops BEFORE third inspect"
    );
    assert!(!trace.has("inspect", "scope/d.txt"));
    assert_eq!(paths(&limited, 0), ["a.txt", "b.txt"]);
    assert_eq!(limited.visited_entries, 2);
    assert_eq!(
        issues(&limited, 0),
        json!([issue("entry_limit", Some(""), "policy", "budget")])
    );
    let exact = scan(
        &flat,
        &ScanOptions::new(16, 4, 1024).unwrap(),
        &Trace::default(),
    );
    assert_eq!(exact.status, ScanStatus::Completed);
    assert_eq!(exact.visited_entries, 4);
    assert!(exact.scopes[0].issues.is_empty());

    let overlap = run(&index, "overlapping-scopes");
    let trace = Trace::default();
    let facts = scan(&overlap, &ScanOptions::new(16, 3, 1024).unwrap(), &trace);
    assert_eq!(
        paths(&facts, 0),
        ["nested", "nested/shared.txt", "root.txt"]
    );
    assert!(facts.scopes[1].entries.is_empty());
    assert_eq!(facts.scopes[0].coverage, Coverage::Complete);
    assert_eq!(facts.scopes[1].coverage, Coverage::Partial);
    assert_eq!(
        issues(&facts, 1),
        json!([issue("entry_limit", Some(""), "policy", "budget")])
    );
    assert!(
        !trace.calls.borrow().iter().any(|c| c.scope == "scope-inner"
            && c.operation == "inspect"
            && c.path.ends_with("shared.txt"))
    );
    let facts = scan(
        &overlap,
        &ScanOptions::new(16, 2, 1024).unwrap(),
        &Trace::default(),
    );
    assert_eq!(
        issues(&facts, 0),
        json!([issue("entry_limit", Some(""), "policy", "budget")])
    );
    assert_eq!(
        issues(&facts, 1),
        json!([issue("entry_limit", None, "policy", "budget")])
    );

    let trace = Trace::default();
    let batch = scan(&flat, &ScanOptions::new(16, 100, 2).unwrap(), &trace);
    assert_eq!(trace.child_inspects(), 0);
    assert_eq!(batch.visited_entries, 0);
    assert_eq!(
        issues(&batch, 0),
        json!([issue("entry_limit", Some(""), "policy", "read_dir")])
    );
    assert!(
        trace
            .calls
            .borrow()
            .iter()
            .filter(|c| c.operation == "read_dir")
            .all(|c| c.limit == Some(2))
    );
    let exact_batch = scan(
        &flat,
        &ScanOptions::new(16, 100, 4).unwrap(),
        &Trace::default(),
    );
    assert_eq!(exact_batch.status, ScanStatus::Completed);
    let oversized = Trace {
        names: Some(
            (0..1025)
                .map(|n| OsString::from(format!("name-{n}")))
                .collect(),
        ),
        ..Trace::default()
    };
    let batch = scan(&flat, &options(), &oversized);
    assert_eq!(oversized.child_inspects(), 0);
    assert_eq!(
        issues(&batch, 0),
        json!([issue("entry_limit", Some(""), "policy", "read_dir")])
    );
    let duplicate = Trace {
        names: Some(vec!["a.txt".into(), "a.txt".into()]),
        ..Trace::default()
    };
    let batch = scan(&flat, &options(), &duplicate);
    assert_eq!(duplicate.child_inspects(), 0);
    assert_eq!(
        issues(&batch, 0),
        json!([issue("io_error", Some(""), "policy", "read_dir")])
    );
    for case in ["project-markers", "unicode-spaces", "mixed-assets"] {
        let fixture = run(&index, case);
        let reversed = scan(
            &fixture,
            &options(),
            &Trace {
                reverse: true,
                ..Trace::default()
            },
        );
        assert_eq!(
            reversed,
            scan_fixture(&fixture, &options(), &CancelToken::new()).unwrap()
        );
    }
    assert_counts(&facts);
}

#[test]
fn scan_faults_and_coverage() {
    let index = index();
    let fixture = run(&index, "permission-plan");
    let denied = Trace::fault("read_dir", "scope/blocked", IoFaultKind::PermissionDenied);
    let facts = scan(&fixture, &options(), &denied);
    assert_eq!(
        facts.status,
        ScanStatus::Partial,
        "permission denial must mark partial coverage"
    );
    assert_eq!(paths(&facts, 0), ["a.txt", "blocked"]);
    assert_eq!(facts.visited_entries, 2);
    assert_eq!(
        issues(&facts, 0),
        json!([issue(
            "permission_denied",
            Some("blocked"),
            "injected",
            "read_dir"
        )])
    );
    assert!(!denied.has("inspect", "scope/blocked/synthetic.txt"));
    let native = scan_fixture(&fixture, &options(), &CancelToken::new()).unwrap();
    assert_eq!(native.status, ScanStatus::Completed);
    assert_eq!(
        paths(&native, 0),
        ["a.txt", "blocked", "blocked/synthetic.txt"]
    );

    let flat = run(&index, "entry-budget");
    for kind in [
        IoFaultKind::NotFound,
        IoFaultKind::Io,
        IoFaultKind::PermissionDenied,
    ] {
        let trace = Trace::fault("inspect", "scope/b.txt", kind.clone());
        let result = scan(&flat, &options(), &trace);
        assert_eq!(paths(&result, 0), ["a.txt", "c.txt", "d.txt"]);
        assert_eq!(result.visited_entries, 4);
        assert_eq!(result.recorded_entries, 3);
        assert_eq!(result.scopes[0].coverage, Coverage::Partial);
        assert_eq!(
            issues(&result, 0),
            json!([issue(
                if kind == IoFaultKind::PermissionDenied {
                    "permission_denied"
                } else {
                    "io_error"
                },
                Some("b.txt"),
                "injected",
                "inspect"
            )])
        );
    }
    for kind in [
        IoFaultKind::Io,
        IoFaultKind::NotFound,
        IoFaultKind::DirectoryLimit,
    ] {
        let trace = Trace::fault("read_dir", "scope/blocked", kind.clone());
        let result = scan(&fixture, &options(), &trace);
        assert_eq!(paths(&result, 0), ["a.txt", "blocked"]);
        assert_eq!(result.scopes[0].coverage, Coverage::Partial);
        assert_eq!(
            issues(&result, 0),
            json!([issue(
                if kind == IoFaultKind::DirectoryLimit {
                    "entry_limit"
                } else {
                    "io_error"
                },
                Some("blocked"),
                "injected",
                "read_dir"
            )])
        );
    }
    let missing = Trace {
        names: Some(vec!["absent-synthetic.txt".into()]),
        ..Trace::default()
    };
    let result = scan(&flat, &options(), &missing);
    assert_eq!(result.visited_entries, 1);
    assert_eq!(result.recorded_entries, 0);
    assert_eq!(
        issues(&result, 0),
        json!([issue(
            "io_error",
            Some("absent-synthetic.txt"),
            "native",
            "inspect"
        )])
    );
    let overlap = run(&index, "overlapping-scopes");
    let trace = Trace::fault(
        "inspect",
        "scope/nested/shared.txt",
        IoFaultKind::RootChanged,
    );
    let result = scan(&overlap, &options(), &trace);
    assert_eq!(paths(&result, 0), ["nested"]);
    assert_eq!(result.visited_entries, 2);
    assert_eq!(
        issues(&result, 0),
        json!([issue(
            "root_changed",
            Some("nested/shared.txt"),
            "injected",
            "root_guard"
        )])
    );
    assert_eq!(
        issues(&result, 1),
        json!([issue("root_changed", None, "injected", "root_guard")])
    );
    assert!(
        result
            .scopes
            .iter()
            .all(|s| s.coverage == Coverage::Partial)
    );
    assert!(!trace.has("inspect", "scope/root.txt"));
    assert!(
        !trace
            .calls
            .borrow()
            .iter()
            .any(|c| c.scope == "scope-inner")
    );
    let trace = Trace::fault("read_dir", "scope/nested", IoFaultKind::RootChanged);
    let result = scan(&overlap, &options(), &trace);
    assert_eq!(result.visited_entries, 1);
    assert_eq!(
        issues(&result, 0),
        json!([issue(
            "root_changed",
            Some("nested"),
            "injected",
            "root_guard"
        )])
    );

    let bad = [
        "",
        ".",
        "..",
        "../escape",
        "a/b",
        "a\\b",
        "colon:name",
        "control\nname",
        "/absolute",
    ];
    let mut names: Vec<OsString> = bad.iter().map(OsString::from).collect();
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStringExt;
        names.push(OsString::from_wide(&[0xd800]));
    }
    #[cfg(target_os = "macos")]
    {
        use std::os::unix::ffi::OsStringExt;
        names.push(OsString::from_vec(vec![0xff]));
    }
    let invalid_count = names.len();
    names.push("a.txt".into());
    let trace = Trace {
        names: Some(names),
        ..Trace::default()
    };
    let result = scan(&flat, &options(), &trace);
    assert_eq!(result.visited_entries as usize, invalid_count + 1);
    assert_eq!(paths(&result, 0), ["a.txt"]);
    assert_eq!(
        trace.child_inspects(),
        1,
        "unrepresentable names must never acquire IO tokens"
    );
    assert_eq!(
        issues(&result, 0),
        Value::Array(
            (0..invalid_count)
                .map(|_| issue("path_unrepresentable", Some(""), "policy", "inspect"))
                .collect()
        )
    );
    assert_counts(&result);

    // Re-run every case with only the two declarative plans driven by test adapters.
    let matrix = matrix();
    let mut count = 0;
    let mut unsupported = 0;
    for data in index["runs"].as_array().unwrap() {
        let fixture = run(&index, data["case_id"].as_str().unwrap());
        let plan = &data["scanner_plan"];
        let opts = ScanOptions::new(
            plan["max_depth"].as_u64().unwrap() as u32,
            plan["max_entries"].as_u64().unwrap() as u32,
            1024,
        )
        .unwrap();
        let token = CancelToken::new();
        let observer = Observer::new(
            &token,
            plan["cancel_after_entries"]
                .as_u64()
                .unwrap_or(u32::MAX as u64) as u32,
        );
        let io = if fixture.case_id() == "permission-plan" {
            Trace::fault("read_dir", "scope/blocked", IoFaultKind::PermissionDenied)
        } else {
            Trace::default()
        };
        let result = scan_fixture_with_io(&fixture, &opts, &token, &io, &observer).unwrap();
        if let Some(expected) = matrix["controlled_overrides"].get(fixture.case_id()) {
            assert_eq!(json!(paths(&result, 0)), expected["entries"]);
            assert_eq!(issues(&result, 0), expected["issues"]);
            assert_eq!(
                serde_json::to_value(result.scopes[0].coverage).unwrap(),
                expected["coverage"]
            );
        }
        count += result.recorded_entries;
        unsupported += data["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|n| n["status"] == "unsupported")
            .count();
    }
    assert_eq!(count as usize + unsupported, 36);
    eprintln!("controlled entries={count} unsupported={unsupported}");
}

#[test]
fn scan_cancellation() {
    let index = index();
    let overlap = run(&index, "overlapping-scopes");
    let token = CancelToken::new();
    let clone = token.clone();
    clone.cancel();
    assert!(
        token.is_cancelled(),
        "cloned token shares cancellation state"
    );
    token.cancel();
    assert!(clone.is_cancelled());
    let trace = Trace::default();
    let result = scan_fixture_with_io(
        &overlap,
        &ScanOptions::new(0, 1, 1).unwrap(),
        &token,
        &trace,
        &NoopObserver,
    )
    .unwrap();
    assert_eq!(result.status, ScanStatus::Cancelled);
    assert!(
        trace.calls.borrow().is_empty(),
        "pre-cancelled scan performs zero scanning IO"
    );
    for scope in &result.scopes {
        assert_eq!(scope.coverage, Coverage::Cancelled);
        assert!(scope.entries.is_empty());
        assert_eq!(
            serde_json::to_value(&scope.issues).unwrap(),
            json!([issue("cancelled", None, "control", "cancel")])
        );
    }
    let flat = run(&index, "cancel-plan");
    for max in [1, 128] {
        let token = CancelToken::new();
        let observer = Observer::new(&token, 1);
        let trace = Trace::default();
        let result = scan_fixture_with_io(
            &flat,
            &ScanOptions::new(16, max, 1024).unwrap(),
            &token,
            &trace,
            &observer,
        )
        .unwrap();
        assert_eq!(result.status, ScanStatus::Cancelled);
        assert_eq!(paths(&result, 0), ["a.txt"]);
        assert_eq!(
            issues(&result, 0),
            json!([issue("cancelled", Some(""), "control", "cancel")])
        );
        assert!(!trace.has("inspect", "scope/b.txt"));
        assert_eq!(observer.progress.borrow()[0].visited_entries, 1);
        assert_eq!(observer.progress.borrow()[0].recorded_entries, 1);
    }
    let token = CancelToken::new();
    let observer = Observer::new(&token, 3);
    let result = scan_fixture_with_io(
        &flat,
        &ScanOptions::new(16, 3, 1024).unwrap(),
        &token,
        &Trace::default(),
        &observer,
    )
    .unwrap();
    assert!(token.is_cancelled());
    assert_eq!(
        result.status,
        ScanStatus::Completed,
        "cancellation after the final work item is not retroactive"
    );
    assert!(result.scopes[0].issues.is_empty());
    assert_eq!(
        observer
            .progress
            .borrow()
            .iter()
            .map(|p| (p.visited_entries, p.recorded_entries))
            .collect::<Vec<_>>(),
        [(1, 1), (2, 2), (3, 3)]
    );

    // A recorded directory creates a pending recursion operation; cancellation wins over depth.
    let token = CancelToken::new();
    let observer = Observer::new(&token, 1);
    let trace = Trace::default();
    let result = scan_fixture_with_io(
        &overlap,
        &ScanOptions::new(1, 1, 1024).unwrap(),
        &token,
        &trace,
        &observer,
    )
    .unwrap();
    assert_eq!(paths(&result, 0), ["nested"]);
    assert_eq!(
        issues(&result, 0),
        json!([issue("cancelled", Some("nested"), "control", "cancel")])
    );
    assert_eq!(
        issues(&result, 1),
        json!([issue("cancelled", None, "control", "cancel")])
    );
    assert!(!trace.has("read_dir", "scope/nested"));
    let token = CancelToken::new();
    let observer = Observer::new(&token, 3);
    let result =
        scan_fixture_with_io(&overlap, &options(), &token, &Trace::default(), &observer).unwrap();
    assert_eq!(result.scopes[0].coverage, Coverage::Complete);
    assert_eq!(result.scopes[1].coverage, Coverage::Cancelled);
    assert_eq!(
        issues(&result, 1),
        json!([issue("cancelled", None, "control", "cancel")])
    );
    // Counts remain global across the two overlapping scopes.
    let token = CancelToken::new();
    let observer = Observer::new(&token, u32::MAX);
    let result =
        scan_fixture_with_io(&overlap, &options(), &token, &Trace::default(), &observer).unwrap();
    assert_eq!(result.recorded_entries, 4);
    assert_eq!(observer.progress.borrow()[3].recorded_entries, 4);
    assert_eq!(observer.progress.borrow()[3].visited_entries, 4);
    assert_eq!(
        observer.progress.borrow()[3].scope_id.as_str(),
        "scope-inner"
    );
    // An inspect failure consumes a visit but never generates observer progress.
    let token = CancelToken::new();
    let observer = Observer::new(&token, u32::MAX);
    let trace = Trace::fault("inspect", "scope/b.txt", IoFaultKind::NotFound);
    let result = scan_fixture_with_io(&flat, &options(), &token, &trace, &observer).unwrap();
    assert_eq!(result.recorded_entries, 2);
    assert_eq!(
        observer
            .progress
            .borrow()
            .iter()
            .map(|p| (p.visited_entries, p.recorded_entries))
            .collect::<Vec<_>>(),
        [(1, 1), (3, 2)]
    );
}

#[test]
fn scan_identity_and_readonly() {
    let index = index();
    for data in index["runs"].as_array().unwrap() {
        let fixture = run(&index, data["case_id"].as_str().unwrap());
        let trace = Trace::default();
        let facts = scan(&fixture, &options(), &trace);
        assert!(facts.recorded_entries > 0, "real metadata facts must exist");
        let value = serde_json::to_value(&facts).unwrap();
        let mut keys: Vec<_> = value
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        keys.sort();
        assert_eq!(
            keys,
            [
                "case_id",
                "facts_version",
                "recorded_entries",
                "run_id",
                "scopes",
                "status",
                "visited_entries"
            ]
        );
        for scope in &facts.scopes {
            for entry in &scope.entries {
                assert_eq!(entry.logical_bytes.is_some(), entry.kind == EntryKind::File);
                assert!(entry.allocated_bytes.is_none());
                let value = serde_json::to_value(entry).unwrap();
                let mut keys: Vec<_> = value
                    .as_object()
                    .unwrap()
                    .keys()
                    .map(String::as_str)
                    .collect();
                keys.sort();
                assert_eq!(
                    keys,
                    [
                        "allocated_bytes",
                        "depth",
                        "identity",
                        "kind",
                        "logical_bytes",
                        "relative_path"
                    ]
                );
                if cfg!(target_os = "windows")
                    || matches!(entry.kind, EntryKind::Link | EntryKind::Other)
                {
                    assert_eq!(
                        serde_json::to_value(&entry.identity).unwrap(),
                        json!({"kind":"unknown","device":null,"inode":null,"link_count":null})
                    );
                }
                #[cfg(target_os = "macos")]
                if matches!(entry.kind, EntryKind::File | EntryKind::Directory) {
                    use std::os::unix::fs::MetadataExt;
                    let path = Path::new(data["run_root"].as_str().unwrap())
                        .join(scope.relative_root.as_str())
                        .join(entry.relative_path.as_str());
                    let metadata = std::fs::symlink_metadata(path).unwrap();
                    if metadata.ino() != 0 {
                        assert_eq!(entry.identity.kind, IdentityKind::Unix);
                        assert_eq!(
                            entry.identity.device.as_ref().unwrap().get(),
                            metadata.dev()
                        );
                        assert_eq!(entry.identity.inode.as_ref().unwrap().get(), metadata.ino());
                        assert_eq!(
                            entry.identity.link_count.as_ref().unwrap().get(),
                            metadata.nlink()
                        );
                    } else {
                        assert_eq!(entry.identity.kind, IdentityKind::Unknown);
                    }
                }
            }
        }
        if fixture.case_id() == "hardlink-pair" {
            let supported = data["nodes"]
                .as_array()
                .unwrap()
                .iter()
                .find(|n| n["kind"] == "hardlink")
                .unwrap()["status"]
                == "created";
            assert_eq!(facts.recorded_entries, if supported { 2 } else { 1 });
            if supported {
                assert_eq!(paths(&facts, 0), ["alias.bin", "original.bin"]);
                assert!(
                    facts.scopes[0]
                        .entries
                        .iter()
                        .all(|e| e.logical_bytes.as_ref().unwrap().get() == 8)
                );
                #[cfg(target_os = "macos")]
                {
                    assert_eq!(
                        facts.scopes[0].entries[0].identity,
                        facts.scopes[0].entries[1].identity
                    );
                }
            }
        }
        assert_counts(&facts);
        assert!(
            trace
                .calls
                .borrow()
                .iter()
                .all(|c| ["inspect", "read_dir"].contains(&c.operation))
        );
    }
    // Compile-time source input, not a runtime read of product files or payloads.
    let native_source = include_str!("../src/fixture_v1/native.rs");
    let marker_source = include_str!("../src/fixture_v1/marker.rs");
    for forbidden in [
        "fs::read(",
        "fs::read_to_string(",
        "File::open(",
        "fs::metadata(",
        "read_link(",
        "canonicalize(",
        "flatten()",
    ] {
        assert!(
            !native_source.contains(forbidden),
            "NativeIo source must remain metadata-only: {forbidden}"
        );
    }
    assert_eq!(marker_source.matches("File::open(").count(), 1);
    assert!(marker_source.contains("take(LIMIT + 1)"));
    assert!(marker_source.contains("serde_json::from_slice(bytes)"));
    assert!(!marker_source.contains("serde_json::from_value"));
}
