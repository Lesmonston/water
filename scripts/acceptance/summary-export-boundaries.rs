// Independent H checks using valid synthetic reports and real A errors.
#![forbid(unsafe_code)]
use serde_json::{Value, json};
use water_contracts::v1::*;
use water_summary_export::v1::{summarize_json, summarize_report};
fn base() -> ScanReport {
    let cases: Value = serde_json::from_str(include_str!("../../contracts/summary-export-v1/cases.json")).unwrap();
    let item = cases["golden_cases"].as_array().unwrap().iter().find(|c| c["id"] == "all-categories-canary").unwrap();
    parse_report(&item["input"].to_string()).unwrap()
}
#[test]
fn h_nonuniform_histograms_whitelist_and_source_totals() {
    let mut report = base(); let prototypes = report.findings.clone(); report.findings.clear();
    for (i, prototype) in prototypes.iter().enumerate() {
        for j in 0..=i {
            let mut f = prototype.clone(); f.finding_id = OpaqueId::new(format!("new-{i}-{j}")).unwrap();
            f.relative_path = RelativePath::new(format!("PRIVATE-PATH-{i}-{j}")).unwrap(); report.findings.push(f);
        }
    }
    report.scan_id = OpaqueId::new("PRIVATE-SCAN").unwrap(); validate_report(&report).unwrap();
    let before = report.clone(); let exported = summarize_report(&report).unwrap();
    assert_eq!(exported.totals, report.totals); assert_eq!(exported.totals.logical_bytes.unwrap().get(),37);
    assert_eq!(exported.totals.scanned_entries, u32::MAX); assert_eq!(exported.totals.skipped_entries, u32::MAX);
    let value = serde_json::to_value(&exported).unwrap();
    assert_eq!(value.as_object().unwrap().len(), 8); assert_eq!(value["counts"].as_object().unwrap().len(), 3);
    assert_eq!(value["risk_counts"].as_object().unwrap().len(), 4); assert_eq!(value["category_counts"].as_object().unwrap().len(), 11);
    let mut risks = json!({"low":0,"review":0,"high":0,"protected":0});
    let mut categories = json!({"download_cache":0,"build_cache":0,"environment":0,"model":0,"experiment":0,"history":0,"database":0,"credential":0,"source":0,"temporary":0,"unknown":0});
    for f in &report.findings {
        let risk = serde_json::to_value(f.risk).unwrap(); let category = serde_json::to_value(f.category).unwrap();
        let key = risk.as_str().unwrap(); risks[key] = (risks[key].as_u64().unwrap() + 1).into();
        let key = category.as_str().unwrap(); categories[key] = (categories[key].as_u64().unwrap() + 1).into();
    }
    assert_eq!(value["risk_counts"], risks); assert_eq!(value["category_counts"], categories);
    assert_eq!(exported.counts.findings as usize, report.findings.len());
    assert!(!value.to_string().contains("PRIVATE-"));
    assert_eq!(summarize_json(&to_json(&report).unwrap()).unwrap(), exported); assert_eq!(report,before);
}
#[test]
fn h_dropped_fields_are_still_validated_and_raw_errors_are_exact() {
    let report = base();
    for index in 0..8 {
        let mut invalid = report.clone();
        match index {
            0 => invalid.findings[0].scope_id = OpaqueId::new("foreign").unwrap(),
            1 => invalid.findings[0].evidence[0].summary = "CONTROLLER_PRIVATE_CANARY".repeat(20),
            2 => invalid.scopes[0].label = "bad\nlabel".into(),
            3 => invalid.findings[0].rule_version = "".into(),
            4 => { invalid.findings[0].references.state = ReferenceState::Unknown; invalid.findings[0].references.project_ids = vec![OpaqueId::new("private-project").unwrap()]; },
            5 => invalid.findings.push(invalid.findings[0].clone()),
            6 => invalid.findings[0].size.reclaimable_upper_bytes = Some(ByteCount::new(1)),
            7 => invalid.findings[0].protection_reasons = vec![ProtectionReason::UnknownOwnership],
            _ => unreachable!(),
        }
        let expected = validate_report(&invalid).unwrap_err(); assert_eq!(summarize_report(&invalid).unwrap_err(), expected);
    }
    let text = to_json(&report).unwrap();
    let raws = [text.replacen("\"scan_id\":", "\"scan_id\":\"PRIVATE\",\"scan_id\":",1), text.replacen("\"scopes\":", "\"new\":\"CANARY\",\"scopes\":",1), " ".repeat(8_388_609)];
    for input in raws { assert_eq!(summarize_json(&input).unwrap_err(), parse_report(&input).unwrap_err()); }
}
#[test]
fn h_invariance_of_all_removed_fields_and_no_aliasing() {
    let report = base(); let expected = summarize_report(&report).unwrap(); let mut altered = report.clone();
    altered.scan_id = OpaqueId::new("PRIVATE-CHANGED-SCAN").unwrap();
    for scope in &mut altered.scopes { scope.label = "PRIVATE LABEL 🧪".into(); }
    for (i,f) in altered.findings.iter_mut().enumerate() {
        f.finding_id = OpaqueId::new(format!("PRIVATE-{i}")).unwrap();
        f.relative_path = RelativePath::new(format!("PRIVATE/{i}/模型<tag>")).unwrap(); f.rule_version = "PRIVATE-RULE".into();
        for e in &mut f.evidence { e.summary = "PRIVATE EVIDENCE".into(); }
        if let Some(tool) = &mut f.tool { tool.name = "PRIVATE TOOL".into(); tool.version = Some("PRIVATE-VERSION".into()); }
    }
    altered.findings.reverse(); validate_report(&altered).unwrap();
    let mut actual = summarize_report(&altered).unwrap(); assert_eq!(actual, expected);
    actual.totals.logical_bytes = None; assert!(altered.totals.logical_bytes.is_some()); assert_eq!(report, base());
}
