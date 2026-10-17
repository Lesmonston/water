// Calls real G, A and E; all source inputs are controller-owned synthetic JSON.
use water_scan_report::v1::{ReportContext, ScopeContext, assemble_json};
fn context(c: &serde_json::Value) -> ReportContext {
    ReportContext {
        scan_id: water_contracts::v1::OpaqueId::new(c["scan_id"].as_str().unwrap()).unwrap(),
        platform: serde_json::from_value(c["platform"].clone()).unwrap(),
        scopes: c["scopes"].as_array().unwrap().iter().map(|s| ScopeContext {
            scope_id: water_contracts::v1::OpaqueId::new(s["scope_id"].as_str().unwrap()).unwrap(),
            label: s["label"].as_str().unwrap().to_owned(),
            origin: serde_json::from_value(s["origin"].clone()).unwrap(),
        }).collect(),
    }
}
fn reject(input: &str, c: &ReportContext, code: &str, field: &str) {
    let err = assemble_json(input, c).unwrap_err();
    assert_eq!(format!("{:?}", err.code), code); assert_eq!(err.field, field);
    assert!(!format!("{err:?} {err}").contains("G_ERROR_CANARY"));
}
fn main() {
    let cases: serde_json::Value = serde_json::from_str(include_str!("../../contracts/scan-report-v1/cases.json")).unwrap();
    let mut results = Vec::new();
    for case in cases["golden_cases"].as_array().unwrap() {
        let context = context(&case["context"]);
        let bundle = assemble_json(&case["input"].to_string(), &context).unwrap();
        let json = water_contracts::v1::to_json(bundle.report()).unwrap();
        let reparsed = water_contracts::v1::parse_report(&json).unwrap();
        assert_eq!(&reparsed, bundle.report());
        assert_eq!(bundle.source_facts(), &case["input"]);
        let view = water_report_view::v1::project_report(&reparsed).unwrap();
        results.push(serde_json::json!({"id":case["id"],"bundle":bundle,"view":view}));
    }
    let base = cases["golden_cases"].as_array().unwrap().iter().find(|c| c["id"] == cases["negative_base"]).unwrap();
    for raw in cases["raw_cases"].as_array().unwrap() {
        reject(raw["input"].as_str().unwrap(), &context(&base["context"]), raw["code"].as_str().unwrap(), "/facts");
    }
    for item in cases["mutation_cases"].as_array().unwrap() {
        let mut input = base["input"].clone(); let mut c = context(&base["context"]);
        match item["id"].as_str().unwrap() {
            "unknown-field" => input["extra"] = "G_ERROR_CANARY".into(),
            "missing-nullable" => { input["scopes"][0]["entries"][0].as_object_mut().unwrap().remove("allocated_bytes"); }
            "object-enum" => input["scopes"][0]["entries"][0]["kind"] = serde_json::json!({"directory":null}),
            "positional-scope" => { let v = input["scopes"][0].as_object().unwrap().values().cloned().collect::<Vec<_>>(); input["scopes"][0] = v.into(); }
            "invalid-byte" => input["scopes"][0]["entries"][1]["logical_bytes"] = 1.into(),
            "depth" => input["scopes"][0]["entries"][0]["depth"] = 0.into(),
            "duplicate-path" => { let e = input["scopes"][0]["entries"][0].clone(); input["scopes"][0]["entries"].as_array_mut().unwrap().push(e); for key in ["visited_entries", "recorded_entries"] { input[key] = (input[key].as_u64().unwrap()+1).into(); } input["scopes"][0]["visited_entries"] = (input["scopes"][0]["visited_entries"].as_u64().unwrap()+1).into(); }
            "counter" => input["visited_entries"] = (input["visited_entries"].as_u64().unwrap()+1).into(),
            "context-order" => c.scopes[0].scope_id = water_contracts::v1::OpaqueId::new("other").unwrap(),
            "context-label" => c.scopes[0].label.clear(),
            _ => panic!("Unknown controller mutation"),
        }
        let code = item["code"].as_str().unwrap();
        reject(&input.to_string(), &c, code, if code == "InvalidContext" { "/context" } else { "/facts" });
    }
    println!("{}", serde_json::json!({"cases":results,"raw_rejections":cases["raw_cases"].as_array().unwrap().len(),"mutation_rejections":cases["mutation_cases"].as_array().unwrap().len()}));
}
