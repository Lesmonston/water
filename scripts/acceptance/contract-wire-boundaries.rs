//! Controller-owned boundary checks, linked to the unmodified submitted library.
use serde::{Serialize, de::DeserializeOwned};
use serde_json::{Value, json};
use water_contracts::v1::*;

const BASE: &str = include_str!("../../contracts/v1/examples/valid-report.json");
const SCHEMA: &str = include_str!("../../contracts/v1/scan-report.schema.json");

fn check_enum<T: DeserializeOwned + Serialize>(schema: &Value, name: &str, failures: &mut Vec<String>) {
    let definition = &schema["$defs"][name];
    assert_eq!(definition["type"], "string", "{name}: schema type");
    let variants = definition["enum"].as_array().cloned()
        .unwrap_or_else(|| vec![definition["const"].clone()]);
    for variant in &variants {
        let parsed: T = serde_json::from_value(variant.clone()).unwrap_or_else(|_| {
            panic!("{name}: valid string rejected: {variant}")
        });
        assert_eq!(serde_json::to_value(parsed).unwrap(), *variant, "{name}: wire round trip");
        let mut object = serde_json::Map::new();
        object.insert(variant.as_str().unwrap().to_owned(), Value::Null);
        for input in [Value::Object(object), json!([]), Value::Null, json!(true), json!(0)] {
            if serde_json::from_str::<T>(&input.to_string()).is_ok() {
                let failure = format!("{name}: accepted non-string {input}");
                println!("{failure}");
                failures.push(failure);
            }
        }
    }
    assert!(serde_json::from_str::<T>("\"DO_NOT_ECHO_CANARY_7f98\"").is_err());
}

#[test]
fn enum_types_accept_only_schema_strings() {
    let schema: Value = serde_json::from_str(SCHEMA).unwrap();
    let mut failures = Vec::new();
    macro_rules! check {
        ($($name:ident),+ $(,)?) => {$(check_enum::<$name>(&schema, stringify!($name), &mut failures);)+};
    }
    check!(SchemaVersion, Platform, ScopeOrigin, Coverage, ScanStatus, LocationSource,
        Category, Risk, Recoverability, Activity, Confidence, ProtectionReason,
        EvidenceCode, EvidenceSource, SizeMethod, EstimateConfidence, SharedState,
        ReferenceState, AggregateMethod, IssueCode);
    assert_eq!(schema["$defs"].as_object().unwrap().values()
        .filter(|value| value["type"] == "string"
            && (value["enum"].is_array() || value["const"].is_string())).count(), 20);
    assert!(failures.is_empty(), "{} non-string enum values accepted", failures.len());
}

#[test]
fn report_entry_rejects_enum_objects_at_all_twenty_positions() {
    let mut base: Value = serde_json::from_str(BASE).unwrap();
    base["status"] = json!("partial");
    base["totals"]["coverage_complete"] = json!(false);
    base["findings"][0]["risk"] = json!("protected");
    base["findings"][0]["protection_reasons"] = json!(["user_pinned"]);
    base["issues"] = json!([{
        "code": "unsupported", "scope_id": "scope-1", "relative_path": null,
        "message": "Controller synthetic boundary fixture."
    }]);
    parse_report(&base.to_string()).expect("positive fixture must be valid");
    let mut failures = Vec::new();
    for pointer in [
        "/schema_version", "/status", "/scopes/0/platform", "/scopes/0/origin",
        "/scopes/0/coverage", "/findings/0/tool/root_source", "/findings/0/category",
        "/findings/0/risk", "/findings/0/recoverability", "/findings/0/activity",
        "/findings/0/confidence", "/findings/0/evidence/0/code",
        "/findings/0/evidence/0/source", "/findings/0/protection_reasons/0",
        "/findings/0/references/state", "/findings/0/size/method",
        "/findings/0/size/confidence", "/findings/0/size/shared", "/totals/method",
        "/issues/0/code",
    ] {
        let mut input = base.clone();
        let value = input.pointer_mut(pointer).unwrap();
        let mut object = serde_json::Map::new();
        object.insert(value.as_str().unwrap().to_owned(), Value::Null);
        *value = Value::Object(object);
        match parse_report(&input.to_string()) {
            Err(error) if error.code == ContractErrorCode::InvalidShape => (),
            result => {
                let actual = match result { Ok(_) => "accepted".to_owned(), Err(error) => error.to_string() };
                let failure = format!("{pointer}: expected InvalidShape, actual {actual}");
                println!("{failure}");
                failures.push(failure);
            }
        }
    }
    assert!(failures.is_empty(), "{} report enum objects accepted or misclassified", failures.len());
}

#[test]
fn positive_base_round_trip_preserves_the_dto() {
    let report = parse_report(BASE).unwrap();
    let output = to_json(&report).unwrap();
    assert_eq!(parse_report(&output).unwrap(), report);
}
