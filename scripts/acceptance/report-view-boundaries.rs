// Controller-only independent cases against the submitted library.
use serde_json::{Value, json};
use water_contracts::v1::*;
use water_report_view::v1::{project_json, project_report};

fn base() -> ScanReport {
    parse_report(include_str!("../../contracts/v1/examples/valid-report.json")).unwrap()
}

#[test]
fn original_json_shape_and_resource_guards() {
    let input = to_json(&base()).unwrap();
    let duplicate = input.replacen(
        "\"scan_id\":",
        "\"scan_id\":\"controller-duplicate\",\"scan_id\":",
        1,
    );
    let mut object_enum: Value = serde_json::from_str(&input).unwrap();
    object_enum["findings"][0]["risk"] = json!({"review": null});
    let mut missing_nullable: Value = serde_json::from_str(&input).unwrap();
    missing_nullable["findings"][0]["size"].as_object_mut().unwrap().remove("allocated_bytes");
    for input in [duplicate, object_enum.to_string(), missing_nullable.to_string()] {
        let expected = parse_report(&input).unwrap_err();
        assert_eq!(expected.code, ContractErrorCode::InvalidShape);
        assert_eq!(project_json(&input).unwrap_err(), expected);
    }
    let oversized = " ".repeat(8 * 1024 * 1024 + 1);
    assert_eq!(project_json(&oversized).unwrap_err().code, ContractErrorCode::InvalidShape);
}

#[test]
fn constructed_reports_preserve_exact_errors() {
    let mut invalid = Vec::new();
    let mut report = base();
    report.findings[0].category = Category::Credential;
    invalid.push(report);
    let mut report = base();
    report.findings[0].scope_id = OpaqueId::new("missing-controller-scope").unwrap();
    invalid.push(report);
    let mut report = base();
    report.findings.push(report.findings[0].clone());
    invalid.push(report);
    let mut report = base();
    report.findings[0].size.reclaimable_upper_bytes = Some(ByteCount::new(1));
    invalid.push(report);
    for report in invalid {
        let before = report.clone();
        let expected = validate_report(&report).unwrap_err();
        assert_eq!(project_report(&report).unwrap_err(), expected);
        assert_eq!(report, before);
    }
}

#[test]
fn unseen_report_preserves_order_titles_and_text() {
    let mut report = base();
    report.scan_id = OpaqueId::new("controller-unseen-view").unwrap();
    report.scopes[0].scope_id = OpaqueId::new("controller-a").unwrap();
    report.scopes[0].label = "Controller <root> 模型".to_owned();
    let mut second = report.scopes[0].clone();
    second.scope_id = OpaqueId::new("controller-b").unwrap();
    second.label = "Independent second scope".to_owned();
    report.scopes.push(second);
    let seed = report.findings[0].clone();
    let mut large = seed.clone();
    large.finding_id = OpaqueId::new("controller-large").unwrap();
    large.scope_id = report.scopes[0].scope_id.clone();
    large.relative_path = RelativePath::new("literal-%2e%2e/模型 <tag>").unwrap();
    large.size.logical_bytes = Some(ByteCount::new(u64::MAX));
    large.tool.as_mut().unwrap().tool_id = OpaqueId::new("all").unwrap();
    large.evidence.push(Evidence { code: EvidenceCode::Unknown, source: EvidenceSource::Heuristic, summary: "Second literal <script> item".to_owned() });
    let mut root = seed.clone();
    root.finding_id = OpaqueId::new("controller-root").unwrap();
    root.scope_id = report.scopes[0].scope_id.clone();
    root.relative_path = RelativePath::new("").unwrap();
    root.tool = None;
    root.risk = Risk::Protected;
    root.protection_reasons = vec![ProtectionReason::SourceRoot];
    let mut other = large.clone();
    other.finding_id = OpaqueId::new("controller-other").unwrap();
    other.scope_id = report.scopes[1].scope_id.clone();
    other.tool.as_mut().unwrap().tool_id = OpaqueId::new("no_tool").unwrap();
    other.size.logical_bytes = Some(ByteCount::new(9_007_199_254_740_993));
    report.findings = vec![large, root, other];
    report.totals.logical_bytes = Some(ByteCount::new(37));
    report.totals.method = AggregateMethod::ToolReport;
    validate_report(&report).unwrap();
    let before = report.clone();
    let view = project_report(&report).unwrap();
    assert_eq!(view, project_json(&to_json(&report).unwrap()).unwrap());
    assert_eq!(view.findings.iter().map(|f| f.id.as_str()).collect::<Vec<_>>(), vec!["controller-large", "controller-root", "controller-other"]);
    assert_eq!(view.findings[1].title, report.scopes[0].label);
    assert_eq!(view.findings[0].title, "literal-%2e%2e/模型 <tag>");
    assert_eq!(view.findings[0].tool_id, "tool:all");
    assert_eq!(view.findings[1].tool_id, "no_tool");
    assert_eq!(view.findings[2].tool_id, "tool:no_tool");
    assert_eq!(view.findings[0].evidence, report.findings[0].evidence.iter().map(|e| e.summary.as_str()).collect::<Vec<_>>().join("\n"));
    assert_eq!(view.scopes, report.scopes);
    assert_eq!(view.totals, report.totals);
    for (row, source) in view.findings.iter().zip(&report.findings) {
        assert_eq!(row.source_tool, source.tool);
        assert_eq!(row.evidence_items, source.evidence);
        assert_eq!(row.references, source.references);
        assert_eq!(row.protection_reasons, source.protection_reasons);
        assert_eq!(row.size, source.size);
    }
    let serialized = serde_json::to_value(&view).unwrap();
    assert_eq!(serialized["findings"][0]["logical_bytes"], "18446744073709551615");
    assert_eq!(serialized["findings"][2]["logical_bytes"], "9007199254740993");
    assert_eq!(serialized["totals"]["logical_bytes"], "37");
    assert_eq!(report, before);
}

#[test]
fn allocated_only_and_scope_limit_remain_source_facts() {
    let mut report = base();
    report.findings[0].size.logical_bytes = None;
    report.findings[0].size.allocated_bytes = Some(ByteCount::new(7));
    report.findings[0].size.method = SizeMethod::FileIdentityAllocated;
    report.findings[0].size.confidence = EstimateConfidence::Measured;
    report.totals.method = AggregateMethod::ToolReport;
    report.totals.logical_bytes = None;
    report.totals.allocated_bytes = Some(ByteCount::new(3));
    let view = project_report(&report).unwrap();
    assert_eq!(view.findings[0].logical_bytes, None);
    assert_eq!(view.findings[0].size.allocated_bytes.unwrap().get(), 7);
    assert_eq!(view.totals, report.totals);
    let mut report = base();
    report.findings.clear();
    let seed = report.scopes[0].clone();
    report.scopes = (0..64).map(|i| { let mut scope = seed.clone(); scope.scope_id = OpaqueId::new(format!("controller-scope-{i}")).unwrap(); scope }).collect();
    assert_eq!(project_report(&report).unwrap().scopes, report.scopes);
    let mut extra = seed;
    extra.scope_id = OpaqueId::new("controller-scope-extra").unwrap();
    report.scopes.push(extra);
    assert_eq!(project_report(&report).unwrap_err(), validate_report(&report).unwrap_err());
}
