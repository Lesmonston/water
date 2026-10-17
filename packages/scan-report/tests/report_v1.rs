//! Synthetic scan-report checks. This target reads frozen fixtures only.
#![forbid(unsafe_code)]

use serde_json::Value;
use std::fmt::Write as _;
use water_contracts::v1::{
    Activity, AggregateMethod, Category, Confidence, EstimateConfidence, EvidenceCode,
    EvidenceSource, Platform, ProtectionReason, Recoverability, ReferenceState, Risk, ScopeOrigin,
    SharedState, SizeMethod, parse_report, to_json,
};
use water_scan_report::v1::{
    AssemblyError, AssemblyErrorCode, ReportBundle, ReportContext, ScopeContext, assemble_json,
};

const CASES: &str = include_str!("../../../contracts/scan-report-v1/cases.json");
const MAX_JSON_BYTES: usize = 8_388_608;
const CANARY: &str = "G_ERROR_CANARY";

fn cases() -> Value {
    serde_json::from_str(CASES).expect("frozen scan-report cases must be JSON")
}

fn golden_cases() -> Vec<Value> {
    cases()["golden_cases"]
        .as_array()
        .expect("golden_cases")
        .clone()
}

fn golden(id: &str) -> Value {
    golden_cases()
        .into_iter()
        .find(|case| case["id"] == id)
        .unwrap_or_else(|| panic!("missing golden {id}"))
}

fn context_from(value: &Value) -> ReportContext {
    ReportContext {
        scan_id: water_contracts::v1::OpaqueId::new(value["scan_id"].as_str().unwrap()).unwrap(),
        platform: serde_json::from_value(value["platform"].clone()).unwrap(),
        scopes: value["scopes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|scope| ScopeContext {
                scope_id: water_contracts::v1::OpaqueId::new(scope["scope_id"].as_str().unwrap())
                    .unwrap(),
                label: scope["label"].as_str().unwrap().to_owned(),
                origin: serde_json::from_value(scope["origin"].clone()).unwrap(),
            })
            .collect(),
    }
}

fn input_text(case: &Value) -> String {
    case["input"].to_string()
}

fn assemble_case(case: &Value) -> ReportBundle {
    assemble_json(&input_text(case), &context_from(&case["context"]))
        .unwrap_or_else(|error| panic!("{} assembly failed: {error}", case["id"]))
}

fn base() -> (Value, ReportContext) {
    let case = golden("project-markers");
    let context = context_from(&case["context"]);
    (case["input"].clone(), context)
}

fn rendered(error: &AssemblyError) -> String {
    format!("{error} {error:?}")
}

fn assert_reject(input: &str, context: &ReportContext, code: AssemblyErrorCode, field: &str) {
    let error = assemble_json(input, context).expect_err("invalid facts must be rejected");
    assert_eq!(error.code, code);
    assert_eq!(error.field, field);
    assert!(
        !rendered(&error).contains(CANARY),
        "error echoed input: {}",
        rendered(&error)
    );
}

fn fresh_reject(input: Value, code: AssemblyErrorCode) {
    let (_, context) = base();
    assert_reject(&input.to_string(), &context, code, "/facts");
}

fn raw_input(id: &str) -> String {
    cases()["raw_cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"] == id)
        .unwrap()["input"]
        .as_str()
        .unwrap()
        .to_owned()
}

fn scope_context(count: usize) -> ReportContext {
    ReportContext {
        scan_id: water_contracts::v1::OpaqueId::new("assembly-synthetic").unwrap(),
        platform: Platform::Windows,
        scopes: (0..count)
            .map(|index| ScopeContext {
                scope_id: water_contracts::v1::OpaqueId::new(format!("s{index}")).unwrap(),
                label: format!("Synthetic s{index}"),
                origin: ScopeOrigin::ConfigDiscovered,
            })
            .collect(),
    }
}

fn many_scopes(count: usize) -> String {
    let mut scopes = String::new();
    for index in 0..count {
        if index > 0 {
            scopes.push(',');
        }
        write!(
            scopes,
            "{{\"scope_id\":\"s{index}\",\"relative_root\":\"scope\",\"coverage\":\"complete\",\"visited_entries\":1,\"entries\":[{{\"relative_path\":\"f{index}.txt\",\"kind\":\"file\",\"depth\":1,\"logical_bytes\":\"1\",\"allocated_bytes\":null,\"identity\":{{\"kind\":\"unknown\",\"device\":null,\"inode\":null,\"link_count\":null}}}}],\"issues\":[]}}"
        )
        .expect("scope text");
    }
    format!(
        "{{\"facts_version\":\"water.scan-lab.v1\",\"run_id\":\"run-synthetic-scopes\",\"case_id\":\"synthetic-scopes\",\"status\":\"completed\",\"visited_entries\":{count},\"recorded_entries\":{count},\"scopes\":[{scopes}]}}"
    )
}

#[test]
fn report_strict_input() {
    for case in golden_cases() {
        let text = input_text(&case);
        let context = context_from(&case["context"]);
        let bundle = assemble_json(&text, &context).expect("golden facts assemble");
        let report = bundle.report();
        assert_eq!(report.scan_id.as_str(), context.scan_id.as_str());
        assert_eq!(report.scopes.len(), context.scopes.len());
        for (scope, declared) in report.scopes.iter().zip(&context.scopes) {
            assert_eq!(scope.scope_id, declared.scope_id);
            assert_eq!(scope.label, declared.label);
            assert_eq!(scope.origin, declared.origin);
            assert_eq!(scope.platform, context.platform);
        }
        let recorded = case["input"]["recorded_entries"].as_u64().unwrap() as usize;
        let visited = case["input"]["visited_entries"].as_u64().unwrap();
        assert_eq!(
            report.findings.len(),
            recorded,
            "recorded entries stay findings"
        );
        assert_eq!(u64::from(report.totals.scanned_entries), recorded as u64);
        assert_eq!(
            u64::from(report.totals.skipped_entries),
            visited - recorded as u64
        );
        for (index, finding) in report.findings.iter().enumerate() {
            assert_eq!(finding.finding_id.as_str(), format!("entry-{}", index + 1));
        }
        assert_eq!(
            serde_json::to_value(report.status).unwrap(),
            case["input"]["status"]
        );
    }

    let (input, context) = base();
    for raw in cases()["raw_cases"].as_array().unwrap() {
        if raw["id"] == "duplicate-key" {
            continue;
        }
        let code = match raw["code"].as_str().unwrap() {
            "InvalidJson" => AssemblyErrorCode::InvalidJson,
            "InvalidFacts" => AssemblyErrorCode::InvalidFacts,
            other => panic!("unexpected raw code {other}"),
        };
        assert_reject(raw["input"].as_str().unwrap(), &context, code, "/facts");
    }
    let duplicate = assemble_json(&raw_input("duplicate-key"), &context)
        .expect_err("duplicate keys must be rejected");
    assert_eq!(duplicate.code, AssemblyErrorCode::InvalidFacts);
    assert_eq!(duplicate.field, "/facts");
    assert!(!rendered(&duplicate).contains(CANARY));

    let mut unknown = input.clone();
    unknown["extra"] = CANARY.into();
    assert_reject(
        &unknown.to_string(),
        &context,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut missing = input.clone();
    missing["scopes"][0]["entries"][0]
        .as_object_mut()
        .unwrap()
        .remove("allocated_bytes");
    assert_reject(
        &missing.to_string(),
        &context,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut object_enum = input.clone();
    object_enum["scopes"][0]["entries"][0]["kind"] = serde_json::json!({ "directory": null });
    assert_reject(
        &object_enum.to_string(),
        &context,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );
    let mut file_enum = input.clone();
    file_enum["scopes"][0]["entries"][0]["kind"] = serde_json::json!({ "file": null });
    assert_reject(
        &file_enum.to_string(),
        &context,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut positional = input.clone();
    let values = positional["scopes"][0]
        .as_object()
        .unwrap()
        .values()
        .cloned()
        .collect::<Vec<_>>();
    positional["scopes"][0] = values.into();
    assert_reject(
        &positional.to_string(),
        &context,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut bytes = input.clone();
    bytes["scopes"][0]["entries"][1]["logical_bytes"] = 1.into();
    assert_reject(
        &bytes.to_string(),
        &context,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut depth = input.clone();
    depth["scopes"][0]["entries"][0]["depth"] = 0.into();
    assert_reject(
        &depth.to_string(),
        &context,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut depth_mismatch = input.clone();
    depth_mismatch["scopes"][0]["entries"][0]["depth"] = 3.into();
    fresh_reject(depth_mismatch, AssemblyErrorCode::InvalidFacts);

    let mut duplicate_path = input.clone();
    let entry = duplicate_path["scopes"][0]["entries"][0].clone();
    duplicate_path["scopes"][0]["entries"]
        .as_array_mut()
        .unwrap()
        .push(entry);
    for key in ["visited_entries", "recorded_entries"] {
        duplicate_path[key] = (duplicate_path[key].as_u64().unwrap() + 1).into();
    }
    duplicate_path["scopes"][0]["visited_entries"] =
        (duplicate_path["scopes"][0]["visited_entries"]
            .as_u64()
            .unwrap()
            + 1)
        .into();
    fresh_reject(duplicate_path, AssemblyErrorCode::InvalidFacts);

    let mut counter = input.clone();
    counter["visited_entries"] = (counter["visited_entries"].as_u64().unwrap() + 1).into();
    fresh_reject(counter, AssemblyErrorCode::InvalidFacts);

    let mut too_many_visited = input.clone();
    too_many_visited["visited_entries"] = 10_001.into();
    too_many_visited["scopes"][0]["visited_entries"] = 10_001.into();
    fresh_reject(too_many_visited, AssemblyErrorCode::InvalidFacts);

    let nested_text = input.to_string().replacen(
        "\"kind\":\"unknown\"",
        "\"kind\":\"unknown\",\"kind\":\"unknown\"",
        1,
    );
    assert_reject(
        &nested_text,
        &context,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut unix_on_windows = input.clone();
    unix_on_windows["scopes"][0]["entries"][0]["identity"] = serde_json::json!({
        "kind": "unix",
        "device": "1",
        "inode": "2",
        "link_count": "1"
    });
    fresh_reject(unix_on_windows, AssemblyErrorCode::InvalidFacts);

    let mut inode_zero = input.clone();
    inode_zero["scopes"][0]["entries"][0]["kind"] = "directory".into();
    inode_zero["scopes"][0]["entries"][0]["logical_bytes"] = Value::Null;
    inode_zero["scopes"][0]["entries"][0]["identity"] = serde_json::json!({
        "kind": "unix",
        "device": "1",
        "inode": "0",
        "link_count": "1"
    });
    let mut macos = context.clone();
    macos.platform = Platform::Macos;
    assert_reject(
        &inode_zero.to_string(),
        &macos,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut link_unix = input.clone();
    link_unix["scopes"][0]["entries"][0]["kind"] = "link".into();
    link_unix["scopes"][0]["entries"][0]["logical_bytes"] = Value::Null;
    link_unix["scopes"][0]["entries"][0]["identity"] = serde_json::json!({
        "kind": "unix",
        "device": "1",
        "inode": "2",
        "link_count": "1"
    });
    assert_reject(
        &link_unix.to_string(),
        &macos,
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );

    let mut partial_unknown = input.clone();
    partial_unknown["scopes"][0]["entries"][0]["identity"]["inode"] = "4".into();
    fresh_reject(partial_unknown, AssemblyErrorCode::InvalidFacts);

    let mut allocated = input.clone();
    allocated["scopes"][0]["entries"][1]["allocated_bytes"] = "1".into();
    fresh_reject(allocated, AssemblyErrorCode::InvalidFacts);

    let mut directory_size = input.clone();
    directory_size["scopes"][0]["entries"][0]["logical_bytes"] = "1".into();
    fresh_reject(directory_size, AssemblyErrorCode::InvalidFacts);

    let mut file_without_size = input.clone();
    file_without_size["scopes"][0]["entries"][1]["logical_bytes"] = Value::Null;
    fresh_reject(file_without_size, AssemblyErrorCode::InvalidFacts);

    let mut bad_run = input.clone();
    bad_run["run_id"] = "run-".into();
    fresh_reject(bad_run, AssemblyErrorCode::InvalidFacts);
    let mut bad_case = input.clone();
    bad_case["case_id"] = "1starts-with-digit".into();
    fresh_reject(bad_case, AssemblyErrorCode::InvalidFacts);
    let mut bad_version = input.clone();
    bad_version["facts_version"] = "water.scan-lab.v2".into();
    fresh_reject(bad_version, AssemblyErrorCode::InvalidFacts);

    let mut other_context = context.clone();
    other_context.scopes[0].scope_id = water_contracts::v1::OpaqueId::new("other").unwrap();
    assert_reject(
        &input.to_string(),
        &other_context,
        AssemblyErrorCode::InvalidContext,
        "/context",
    );
    let mut empty_label = context.clone();
    empty_label.scopes[0].label.clear();
    assert_reject(
        &input.to_string(),
        &empty_label,
        AssemblyErrorCode::InvalidContext,
        "/context",
    );
    let mut canary_label = context.clone();
    canary_label.scopes[0].label = format!("{CANARY}\n");
    assert_reject(
        &input.to_string(),
        &canary_label,
        AssemblyErrorCode::InvalidContext,
        "/context",
    );
    let mut long_label = context.clone();
    long_label.scopes[0].label = "a".repeat(81);
    assert_reject(
        &input.to_string(),
        &long_label,
        AssemblyErrorCode::InvalidContext,
        "/context",
    );
    let mut exact_label = context.clone();
    exact_label.scopes[0].label = "a".repeat(80);
    assert!(assemble_json(&input.to_string(), &exact_label).is_ok());

    let overlap = golden("overlapping-scopes");
    let mut reversed = context_from(&overlap["context"]);
    reversed.scopes.swap(0, 1);
    assert_reject(
        &input_text(&overlap),
        &reversed,
        AssemblyErrorCode::InvalidContext,
        "/context",
    );

    let huge = "x".repeat(MAX_JSON_BYTES + 1);
    assert_reject(&huge, &context, AssemblyErrorCode::InvalidFacts, "/facts");

    let accepted = assemble_json(&many_scopes(64), &scope_context(64)).expect("64 scopes fit");
    assert_eq!(accepted.report().findings.len(), 64);
    assert_eq!(
        accepted.report().findings[63].finding_id.as_str(),
        "entry-64"
    );
    assert_reject(
        &many_scopes(65),
        &scope_context(65),
        AssemblyErrorCode::InvalidFacts,
        "/facts",
    );
}

#[test]
fn report_coverage_and_issues() {
    for id in [
        "project-markers",
        "depth-budget",
        "entry-budget",
        "permission-plan",
        "cancel-plan",
        "fault-and-cancel",
        "pre-cancelled",
        "completed-then-cancelled",
    ] {
        let case = golden(id);
        let bundle = assemble_case(&case);
        let report = bundle.report();
        let expected = &case["expected_bundle"]["report"];
        assert_eq!(
            serde_json::to_value(report.status).unwrap(),
            expected["status"]
        );
        assert_eq!(
            serde_json::to_value(&report.scopes).unwrap(),
            expected["scopes"]
        );
        assert_eq!(
            serde_json::to_value(&report.issues).unwrap(),
            expected["issues"]
        );
        assert_eq!(
            report.totals.coverage_complete,
            expected["totals"]["coverage_complete"].as_bool().unwrap()
        );
        assert_eq!(
            report.totals.scanned_entries,
            expected["totals"]["scanned_entries"].as_u64().unwrap() as u32
        );
        assert_eq!(
            report.totals.skipped_entries,
            expected["totals"]["skipped_entries"].as_u64().unwrap() as u32
        );
        for issue in &report.issues {
            assert!(
                issue.message.starts_with("Scan lab issue; origin=")
                    && issue.message.contains("; operation=")
                    && issue.message.ends_with('.'),
                "issue message {}",
                issue.message
            );
            assert!(!issue.message.contains(CANARY));
        }
    }

    let fault = assemble_case(&golden("fault-and-cancel"));
    assert_eq!(
        fault.report().issues[0].message,
        "Scan lab issue; origin=injected; operation=inspect."
    );
    assert_eq!(fault.report().totals.skipped_entries, 1);
    assert!(!fault.report().totals.coverage_complete);

    let cancelled = assemble_case(&golden("completed-then-cancelled"));
    assert_eq!(
        cancelled.report().scopes[0].coverage,
        water_contracts::v1::Coverage::Complete
    );
    assert_eq!(
        cancelled.report().scopes[1].coverage,
        water_contracts::v1::Coverage::Cancelled
    );
    assert_eq!(cancelled.report().issues.len(), 1);
    assert_eq!(cancelled.report().findings.len(), 3);

    let (mut partial_without_issue, _) = base();
    partial_without_issue["status"] = "partial".into();
    partial_without_issue["scopes"][0]["coverage"] = "partial".into();
    fresh_reject(partial_without_issue, AssemblyErrorCode::InvalidFacts);

    let (mut completed_issue, _) = base();
    completed_issue["status"] = "partial".into();
    completed_issue["scopes"][0]["issues"] = serde_json::json!([{
        "code": "io_error",
        "relative_path": "package.json",
        "origin": "native",
        "operation": "inspect"
    }]);
    fresh_reject(completed_issue, AssemblyErrorCode::InvalidFacts);

    let (mut cancelled_gap, _) = base();
    cancelled_gap["status"] = "cancelled".into();
    cancelled_gap["scopes"][0]["coverage"] = "cancelled".into();
    cancelled_gap["scopes"][0]["issues"] = serde_json::json!([{
        "code": "io_error",
        "relative_path": null,
        "origin": "native",
        "operation": "inspect"
    }]);
    fresh_reject(cancelled_gap, AssemblyErrorCode::InvalidFacts);
}

#[test]
fn report_conservative_findings() {
    for case in golden_cases() {
        let bundle = assemble_case(&case);
        for finding in &bundle.report().findings {
            assert_eq!(finding.risk, Risk::Protected, "leaf file stays protected");
            assert_eq!(
                finding.category,
                Category::Unknown,
                "unverified entry stays unknown"
            );
            assert_eq!(finding.recoverability, Recoverability::Unknown);
            assert_eq!(finding.activity, Activity::Unknown);
            assert_eq!(finding.confidence, Confidence::Unknown);
            assert!(finding.tool.is_none());
            assert_eq!(finding.rule_version, "scan-report-v1");
            assert_eq!(finding.evidence.len(), 1);
            assert_eq!(finding.evidence[0].code, EvidenceCode::Unknown);
            assert_eq!(finding.evidence[0].source, EvidenceSource::Filesystem);
            assert_eq!(
                finding.evidence[0].summary,
                "Metadata observation only; classification and ownership are unverified."
            );
            assert_eq!(
                finding.protection_reasons.first(),
                Some(&ProtectionReason::UnknownOwnership)
            );
            assert_eq!(
                finding.protection_reasons.get(1),
                Some(&ProtectionReason::IncompleteEvidence),
                "leaf file keeps ownership protection"
            );
            assert!(finding.protection_reasons.len() <= 3);
            assert_eq!(finding.references.state, ReferenceState::Unknown);
            assert!(finding.references.project_ids.is_empty());
            assert_eq!(finding.size.shared, SharedState::Unknown);
            assert!(finding.size.reclaimable_lower_bytes.is_none());
            assert!(finding.size.reclaimable_upper_bytes.is_none());
            assert!(finding.size.allocated_bytes.is_none());
        }
    }

    let boundary = assemble_case(&golden("path-boundary-and-kinds"));
    let reasons = |path: &str| {
        boundary
            .report()
            .findings
            .iter()
            .find(|finding| finding.relative_path.as_str() == path)
            .unwrap()
            .protection_reasons
            .clone()
    };
    assert!(
        !reasons("a").contains(&ProtectionReason::ProtectedDescendant),
        "a is not an ancestor of ab"
    );
    assert!(
        !reasons("ab").contains(&ProtectionReason::ProtectedDescendant),
        "ab is not a descendant of a"
    );
    let cache = boundary
        .report()
        .findings
        .iter()
        .find(|finding| finding.relative_path.as_str().contains('模'))
        .unwrap();
    assert_eq!(
        cache.category,
        Category::Unknown,
        "path names stay unclassified"
    );
    assert_eq!(cache.risk, Risk::Protected, "leaf file stays protected");

    let markers = assemble_case(&golden("project-markers"));
    let git = markers
        .report()
        .findings
        .iter()
        .find(|finding| finding.relative_path.as_str() == ".git")
        .unwrap();
    assert!(
        git.protection_reasons
            .contains(&ProtectionReason::ProtectedDescendant)
    );
    let head = markers
        .report()
        .findings
        .iter()
        .find(|finding| finding.relative_path.as_str() == ".git/HEAD")
        .unwrap();
    assert!(
        !head
            .protection_reasons
            .contains(&ProtectionReason::ProtectedDescendant)
    );

    let mixed = assemble_case(&golden("mixed-assets"));
    for needle in [
        "credentials",
        "models",
        "history",
        "cache/data/index.sqlite",
    ] {
        let finding = mixed
            .report()
            .findings
            .iter()
            .find(|finding| finding.relative_path.as_str().contains(needle))
            .unwrap();
        assert_eq!(
            finding.category,
            Category::Unknown,
            "pseudo cache stays unknown"
        );
        assert_eq!(finding.risk, Risk::Protected, "leaf file stays protected");
    }
    let cache_dir = mixed
        .report()
        .findings
        .iter()
        .find(|finding| finding.relative_path.as_str() == "cache")
        .unwrap();
    assert!(
        cache_dir
            .protection_reasons
            .contains(&ProtectionReason::ProtectedDescendant)
    );
}

#[test]
fn report_size_identity_and_overlap() {
    for case in golden_cases() {
        let bundle = assemble_case(&case);
        let report = bundle.report();
        assert!(
            report.totals.logical_bytes.is_none(),
            "unknown totals stay null"
        );
        assert!(
            report.totals.allocated_bytes.is_none(),
            "unknown totals stay null"
        );
        assert_eq!(
            report.totals.method,
            AggregateMethod::Unavailable,
            "unknown totals stay unavailable"
        );
        assert_eq!(bundle.source_facts(), &case["input"]);
        let facts = bundle.source_facts();
        let entries: Vec<&Value> = case["input"]["scopes"]
            .as_array()
            .unwrap()
            .iter()
            .flat_map(|scope| scope["entries"].as_array().unwrap())
            .collect();
        let sidecars: Vec<&Value> = facts["scopes"]
            .as_array()
            .unwrap()
            .iter()
            .flat_map(|scope| scope["entries"].as_array().unwrap())
            .collect();
        for (index, entry) in entries.iter().enumerate() {
            let finding = &report.findings[index];
            assert_eq!(finding.relative_path.as_str(), entry["relative_path"]);
            assert_eq!(sidecars[index]["identity"], entry["identity"]);
            assert_eq!(sidecars[index]["depth"], entry["depth"]);
            assert_eq!(sidecars[index]["kind"], entry["kind"]);
            if entry["kind"] == "file" {
                assert_eq!(finding.size.method, SizeMethod::LogicalSum);
                assert_eq!(finding.size.confidence, EstimateConfidence::Measured);
                assert_eq!(
                    finding
                        .size
                        .logical_bytes
                        .map(|count| count.get().to_string()),
                    entry["logical_bytes"].as_str().map(str::to_owned)
                );
            } else {
                assert!(finding.size.logical_bytes.is_none());
                assert_eq!(finding.size.method, SizeMethod::Unknown);
                assert_eq!(finding.size.confidence, EstimateConfidence::Unknown);
            }
        }
    }

    let exact = assemble_case(&golden("exact-two53"));
    assert_eq!(
        exact.report().findings[0].size.logical_bytes.unwrap().get(),
        9_007_199_254_740_992
    );
    let boundary = assemble_case(&golden("path-boundary-and-kinds"));
    let wide = boundary
        .report()
        .findings
        .iter()
        .find(|finding| finding.relative_path.as_str().contains('模'))
        .unwrap();
    assert_eq!(
        wide.size.logical_bytes.unwrap().get(),
        9_007_199_254_740_993
    );
    let zero = boundary
        .report()
        .findings
        .iter()
        .find(|finding| finding.relative_path.as_str() == "ab")
        .unwrap();
    assert_eq!(zero.size.logical_bytes.unwrap().get(), 0);

    let unix = assemble_case(&golden("unix-identity-max"));
    assert_eq!(
        unix.report().findings[0].size.logical_bytes.unwrap().get(),
        u64::MAX
    );
    assert_eq!(
        unix.report().findings[1].size.logical_bytes.unwrap().get(),
        u64::MAX
    );
    assert_eq!(unix.report().findings.len(), 2);
    assert_eq!(
        unix.source_facts()["scopes"][0]["entries"][0]["identity"]["kind"],
        "unix"
    );
    assert_eq!(
        unix.source_facts()["scopes"][0]["entries"][0]["identity"]["inode"],
        "99"
    );
    assert_eq!(unix.source_facts()["scopes"][0]["entries"][0]["depth"], 1);
    assert!(
        unix.report().totals.logical_bytes.is_none(),
        "unknown totals stay null"
    );

    let overlap = assemble_case(&golden("overlapping-scopes"));
    assert_eq!(overlap.report().scopes.len(), 2);
    assert_eq!(overlap.report().findings.len(), 4);
    assert_eq!(overlap.report().findings[3].finding_id.as_str(), "entry-4");
    assert_eq!(
        overlap.report().findings[1].relative_path.as_str(),
        "nested/shared.txt"
    );
    assert_eq!(
        overlap.report().findings[3].relative_path.as_str(),
        "shared.txt"
    );
    assert_ne!(
        overlap.report().findings[1].scope_id,
        overlap.report().findings[3].scope_id
    );

    let links = assemble_case(&golden("hardlink-pair"));
    assert_eq!(links.report().findings.len(), 2);
    assert_eq!(
        links.source_facts()["scopes"][0]["entries"][0]["identity"],
        links.source_facts()["scopes"][0]["entries"][1]["identity"]
    );
    assert!(
        links.report().totals.logical_bytes.is_none(),
        "unknown totals stay null"
    );
}

#[test]
fn report_public_roundtrip() {
    for case in golden_cases() {
        let text = input_text(&case);
        let before = text.clone();
        let context = context_from(&case["context"]);
        let bundle = assemble_json(&text, &context).expect("golden roundtrip");
        assert_eq!(text, before, "input text stays unchanged");
        let again = assemble_json(&text, &context).expect("deterministic assembly");
        assert_eq!(bundle, again, "assembly is deterministic");
        let json = to_json(bundle.report()).expect("report json");
        assert!(json.len() <= MAX_JSON_BYTES);
        assert_eq!(&parse_report(&json).unwrap(), bundle.report());
        let value = serde_json::to_value(&bundle).unwrap();
        assert_eq!(value["bundle_version"], "water.scan-report.v1");
        assert_eq!(value, case["expected_bundle"], "bundle {}", case["id"]);
    }

    let mut pad = 32usize;
    let mut rejected = false;
    let mut context = scope_context(1);
    context.scopes[0].scope_id = water_contracts::v1::OpaqueId::new("scope-1").unwrap();
    while pad <= 1024 {
        let input = sized_facts(pad);
        assert!(
            input.len() <= MAX_JSON_BYTES,
            "constructed facts must stay within 8MiB"
        );
        match assemble_json(&input, &context) {
            Ok(bundle) => {
                assert!(to_json(bundle.report()).is_ok());
                pad += 64;
            }
            Err(error) => {
                assert_eq!(error.code, AssemblyErrorCode::ReportRejected);
                assert_eq!(error.field, "/report");
                assert!(!rendered(&error).contains(CANARY));
                rejected = true;
                break;
            }
        }
    }
    assert!(
        rejected,
        "a valid fact set under 8MiB must produce ReportRejected"
    );
}

fn sized_facts(path_pad: usize) -> String {
    let pad = "x".repeat(path_pad);
    let mut entries = String::new();
    for index in 0..10_000 {
        if index > 0 {
            entries.push(',');
        }
        write!(
            entries,
            "{{\"relative_path\":\"f{index:05}{pad}\",\"kind\":\"file\",\"depth\":1,\"logical_bytes\":\"0\",\"allocated_bytes\":null,\"identity\":{{\"kind\":\"unknown\",\"device\":null,\"inode\":null,\"link_count\":null}}}}"
        )
        .expect("entry text");
    }
    format!(
        "{{\"facts_version\":\"water.scan-lab.v1\",\"run_id\":\"run-synthetic-size\",\"case_id\":\"synthetic-size\",\"status\":\"completed\",\"visited_entries\":10000,\"recorded_entries\":10000,\"scopes\":[{{\"scope_id\":\"scope-1\",\"relative_root\":\"scope\",\"coverage\":\"complete\",\"visited_entries\":10000,\"entries\":[{entries}],\"issues\":[]}}]}}"
    )
}
