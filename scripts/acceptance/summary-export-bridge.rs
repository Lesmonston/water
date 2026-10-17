// Calls real H through both public entries; no files or external services in H.
fn main() {
    let cases: serde_json::Value = serde_json::from_str(include_str!("../../contracts/summary-export-v1/cases.json")).unwrap();
    let mut results = Vec::new();
    for case in cases["golden_cases"].as_array().unwrap() {
        let input = case["input"].to_string();
        let parsed = water_contracts::v1::parse_report(&input).unwrap();
        let from_json = water_summary_export::v1::summarize_json(&input).unwrap();
        let from_dto = water_summary_export::v1::summarize_report(&parsed).unwrap();
        assert_eq!(from_json, from_dto);
        results.push(serde_json::json!({"id":case["id"],"summary":from_json}));
    }
    for raw in cases["raw_cases"].as_array().unwrap() {
        let input = raw["input"].as_str().unwrap();
        let expected = water_contracts::v1::parse_report(input).unwrap_err();
        let actual = water_summary_export::v1::summarize_json(input).unwrap_err();
        assert_eq!(actual, expected);
    }
    let base = water_contracts::v1::parse_report(&cases["golden_cases"][0]["input"].to_string()).unwrap();
    for index in 0..6 {
        let mut report = base.clone();
        match index {
            0 => { report.findings[0].category = water_contracts::v1::Category::Model; report.findings[0].risk = water_contracts::v1::Risk::Low; report.findings[0].protection_reasons.clear(); }
            1 => report.findings[0].scope_id = water_contracts::v1::OpaqueId::new("unknown-scope").unwrap(),
            2 => report.totals.coverage_complete = false,
            3 => report.findings[0].size.method = water_contracts::v1::SizeMethod::Unknown,
            4 => report.findings[0].evidence[0].summary = "x".repeat(281),
            5 => { let scope = report.scopes[0].clone(); report.scopes = vec![scope; 65]; }
            _ => unreachable!(),
        }
        let expected = water_contracts::v1::validate_report(&report).unwrap_err();
        let actual = water_summary_export::v1::summarize_report(&report).unwrap_err();
        assert_eq!(actual, expected); assert!(!format!("{actual:?} {actual}").contains("H_EVIDENCE_CANARY"));
    }
    println!("{}", serde_json::json!({"cases":results,"raw_rejections":cases["raw_cases"].as_array().unwrap().len(),"dto_rejections":6}));
}
