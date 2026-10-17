// Controller-only validation and E asset projection, not G/H/I implementation.
fn main() {
    let g: serde_json::Value = serde_json::from_str(include_str!("../../contracts/scan-report-v1/cases.json")).unwrap();
    let h: serde_json::Value = serde_json::from_str(include_str!("../../contracts/summary-export-v1/cases.json")).unwrap();
    let e: serde_json::Value = serde_json::from_str(include_str!("../../contracts/report-view-v1/cases.json")).unwrap();
    let mut views = Vec::new();
    for case in g["golden_cases"].as_array().unwrap() {
        let report = water_contracts::v1::parse_report(&case["expected_bundle"]["report"].to_string())
            .unwrap_or_else(|err| panic!("G {}: {err:?}", case["id"]));
        let view = water_report_view::v1::project_report(&report).unwrap();
        views.push(serde_json::json!({"id":case["id"],"view":view}));
    }
    for case in h["golden_cases"].as_array().unwrap() {
        water_contracts::v1::parse_report(&case["input"].to_string())
            .unwrap_or_else(|err| panic!("H {}: {err:?}", case["id"]));
    }
    let mut reports = Vec::new();
    for case in e["golden_cases"].as_array().unwrap() {
        let view = water_report_view::v1::project_json(&case["input"].to_string()).unwrap();
        let actual = serde_json::to_value(&view).unwrap();
        assert_eq!(actual, case["expected"], "actual E projection differs");
        reports.push(serde_json::json!({"id":case["id"],"view":actual}));
    }
    println!("{}", serde_json::json!({"g_valid_reports":views.len(),
        "h_valid_reports":h["golden_cases"].as_array().unwrap().len(),
        "g_views":views,"reader":{"fixture_version":"water.reader-fixtures.v1","reports":reports},
        "new_products_tested":false}));
}
