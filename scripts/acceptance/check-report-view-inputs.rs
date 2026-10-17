// Checks controller synthetic inputs against the accepted A library, not E behavior.
fn main() {
    let cases: serde_json::Value = serde_json::from_str(include_str!(
        "../../contracts/report-view-v1/cases.json"
    )).unwrap();
    for case in cases["golden_cases"].as_array().unwrap() {
        water_contracts::v1::parse_report(&case["input"].to_string())
            .unwrap_or_else(|error| panic!("{}: {error:?}", case["id"]));
    }
    for case in cases["raw_cases"].as_array().unwrap() {
        let error = water_contracts::v1::parse_report(case["input"].as_str().unwrap()).unwrap_err();
        assert_eq!(format!("{:?}", error.code), case["code"].as_str().unwrap(), "{}", case["id"]);
    }
    println!("{{\"status\":\"passed\",\"validInputs\":4,\"invalidInputs\":6,\"eProductTested\":false}}");
}
