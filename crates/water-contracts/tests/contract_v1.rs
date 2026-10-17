use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use water_contracts::v1::*;

const BASE: &str = include_str!("../../../contracts/v1/examples/valid-report.json");
const CASES: &str = include_str!("../../../contracts/v1/conformance-cases.json");

fn cases() -> Value {
    serde_json::from_str(CASES).expect("frozen cases must be JSON")
}

fn base_value() -> Value {
    serde_json::from_str(BASE).expect("frozen base must be JSON")
}

fn base_report() -> ScanReport {
    parse_report(BASE).expect("frozen base must be accepted")
}

fn reject_constructed(mutate: impl FnOnce(&mut ScanReport), expected: &str, context: &str) {
    let mut report = base_report();
    mutate(&mut report);
    assert_error(validate_report(&report), expected, context);
    assert_error(to_json(&report), expected, context);
}

fn code(name: &str) -> ContractErrorCode {
    match name {
        "InvalidJson" => ContractErrorCode::InvalidJson,
        "InvalidShape" => ContractErrorCode::InvalidShape,
        "InvalidByteCount" => ContractErrorCode::InvalidByteCount,
        "InvalidId" => ContractErrorCode::InvalidId,
        "InvalidRelativePath" => ContractErrorCode::InvalidRelativePath,
        "DuplicateId" => ContractErrorCode::DuplicateId,
        "UnknownScope" => ContractErrorCode::UnknownScope,
        "InconsistentReport" => ContractErrorCode::InconsistentReport,
        "UnsafeClassification" => ContractErrorCode::UnsafeClassification,
        "InvalidSize" => ContractErrorCode::InvalidSize,
        _ => panic!("unexpected contract error name: {name}"),
    }
}

fn assert_error<T: std::fmt::Debug>(
    result: Result<T, ContractError>,
    expected: &str,
    context: &str,
) {
    let error = result.expect_err(context);
    assert_eq!(error.code, code(expected), "{context}: wrong error code");
}

fn patch(value: &mut Value, operation: &Value) {
    let path = operation["path"].as_str().unwrap();
    let (parent_path, token) = path.rsplit_once('/').expect("non-root patch");
    let token = token.replace("~1", "/").replace("~0", "~");
    let parent = value.pointer_mut(parent_path).expect("patch parent exists");
    let op = operation["op"].as_str().unwrap();
    match parent {
        Value::Object(object) => match op {
            "add" => {
                object.insert(token, operation["value"].clone());
            }
            "replace" => {
                *object.get_mut(&token).expect("replace target exists") =
                    operation["value"].clone();
            }
            "remove" => {
                object.remove(&token).expect("remove target exists");
            }
            _ => panic!("unsupported patch operation: {op}"),
        },
        Value::Array(array) => match op {
            "add" => {
                let index = if token == "-" {
                    array.len()
                } else {
                    token.parse().unwrap()
                };
                array.insert(index, operation["value"].clone());
            }
            "replace" => array[token.parse::<usize>().unwrap()] = operation["value"].clone(),
            "remove" => {
                array.remove(token.parse().unwrap());
            }
            _ => panic!("unsupported patch operation: {op}"),
        },
        _ => panic!("patch parent must be container"),
    }
}

#[test]
fn conformance_reports() {
    let data = cases();
    let reports = data["cases"].as_array().unwrap();
    assert_eq!(reports.len(), 66);
    for case in reports {
        let id = case["id"].as_str().unwrap();
        let mut value = base_value();
        for operation in case["operations"].as_array().unwrap() {
            patch(&mut value, operation);
        }
        let result = parse_report(&serde_json::to_string(&value).unwrap());
        let expected = case["expected"].as_str().unwrap();
        if expected == "ok" {
            let report = result.unwrap_or_else(|error| panic!("{id}: {error}"));
            let output = to_json(&report).unwrap_or_else(|error| panic!("{id}: {error}"));
            let reparsed = parse_report(&output).unwrap_or_else(|error| panic!("{id}: {error}"));
            assert_eq!(report, reparsed, "{id}: semantic round trip");
        } else {
            assert_error(result, expected, id);
        }
    }
}

#[test]
fn byte_count_round_trip() {
    for number in [0, (1_u64 << 53) + 1, u64::MAX] {
        let count = ByteCount::new(number);
        assert_eq!(count.get(), number);
        let output = serde_json::to_string(&count).unwrap();
        assert_eq!(output, format!("\"{number}\""), "must be a decimal string");
        assert_eq!(serde_json::from_str::<ByteCount>(&output).unwrap(), count);
        assert_eq!(number.to_string().parse::<ByteCount>().unwrap(), count);
        assert!(serde_json::from_str::<ByteCount>(&number.to_string()).is_err());
    }
}

#[test]
fn primitive_validation() {
    let data = cases();
    for (kind, inputs) in data["primitiveCases"].as_object().unwrap() {
        for valid in [true, false] {
            for value in inputs[if valid { "valid" } else { "invalid" }]
                .as_array()
                .unwrap()
                .iter()
                .rev()
            {
                let input = value.as_str().unwrap();
                let result = match kind.as_str() {
                    "byte_count" => input.parse::<ByteCount>().map(|_| ()),
                    "opaque_id" => OpaqueId::new(input).map(|id| assert_eq!(id.as_str(), input)),
                    "relative_path" => {
                        RelativePath::new(input).map(|path| assert_eq!(path.as_str(), input))
                    }
                    _ => panic!("unknown primitive kind"),
                };
                let context = format!("{kind}: {input:?}");
                if valid {
                    result.unwrap_or_else(|error| panic!("{context}: {error}"));
                } else {
                    assert_error(result, inputs["error"].as_str().unwrap(), &context);
                }
            }
        }
    }
    assert!(OpaqueId::new("a".repeat(64)).is_ok());
    assert!(RelativePath::new("😀".repeat(4096)).is_ok());
    assert_error(
        RelativePath::new("😀".repeat(4097)),
        "InvalidRelativePath",
        "relative path Unicode scalar length limit",
    );
}

#[test]
fn constructed_report_validation() {
    let data = cases();
    let constructed = data["constructedCases"].as_array().unwrap();
    assert_eq!(constructed.len(), 6);
    for case in constructed {
        let id = case["id"].as_str().unwrap();
        let mut report = base_report();
        match case["mutation"].as_str().unwrap() {
            "evidence_empty" => report.findings[0].evidence.clear(),
            "scopes_65_unique" => {
                let scope = report.scopes[0].clone();
                report.scopes = (0..65)
                    .map(|index| {
                        let mut clone = scope.clone();
                        clone.scope_id = OpaqueId::new(format!("scope-{}", index + 1)).unwrap();
                        clone
                    })
                    .collect();
            }
            "evidence_65" => {
                report.findings[0].evidence = vec![report.findings[0].evidence[0].clone(); 65];
            }
            "model_risk_review" => {
                report.findings[0].category = Category::Model;
                report.findings[0].risk = Risk::Review;
            }
            "reclaimable_upper_one" => {
                report.findings[0].size.reclaimable_upper_bytes = Some(ByteCount::new(1));
            }
            "unknown_scope" => {
                report.findings[0].scope_id = OpaqueId::new("not-scanned").unwrap();
            }
            _ => panic!("unknown constructed mutation: {id}"),
        }
        let expected = case["expected"].as_str().unwrap();
        assert_error(
            validate_report(&report),
            expected,
            &format!("{id}: validate"),
        );
        assert_error(to_json(&report), expected, &format!("{id}: to_json"));
    }
    reject_constructed(
        |report| report.scopes[0].label = "😀".repeat(81),
        "InvalidShape",
        "constructed label scalar count",
    );
    reject_constructed(
        |report| report.findings[0].rule_version = "1\n".to_owned(),
        "InvalidShape",
        "constructed rule control character",
    );
    reject_constructed(
        |report| report.findings[0].tool.as_mut().unwrap().version = Some(String::new()),
        "InvalidShape",
        "constructed empty tool version",
    );
    reject_constructed(
        |report| report.findings[0].evidence[0].summary = "x".repeat(281),
        "InvalidShape",
        "constructed evidence summary length",
    );
    reject_constructed(
        |report| report.findings[0].protection_reasons = vec![ProtectionReason::UserPinned; 65],
        "InvalidShape",
        "constructed reason count precedes classification",
    );
    reject_constructed(
        |report| {
            report.findings[0].references.project_ids = vec![OpaqueId::new("p").unwrap(); 10_001];
        },
        "InvalidShape",
        "constructed project count precedes duplicate IDs",
    );
    reject_constructed(
        |report| {
            report.findings[0].references.state = ReferenceState::Known;
            report.findings[0].references.project_ids = vec![OpaqueId::new("p").unwrap(); 2];
        },
        "DuplicateId",
        "constructed duplicate project references",
    );
}

const REPORT_ENUM_SLOTS: &[(&str, &str)] = &[
    ("/schema_version", "SchemaVersion"),
    ("/status", "ScanStatus"),
    ("/scopes/0/platform", "Platform"),
    ("/scopes/0/origin", "ScopeOrigin"),
    ("/scopes/0/coverage", "Coverage"),
    ("/findings/0/tool/root_source", "LocationSource"),
    ("/findings/0/category", "Category"),
    ("/findings/0/risk", "Risk"),
    ("/findings/0/recoverability", "Recoverability"),
    ("/findings/0/activity", "Activity"),
    ("/findings/0/confidence", "Confidence"),
    ("/findings/0/evidence/0/code", "EvidenceCode"),
    ("/findings/0/evidence/0/source", "EvidenceSource"),
    ("/findings/0/protection_reasons/0", "ProtectionReason"),
    ("/findings/0/references/state", "ReferenceState"),
    ("/findings/0/size/method", "SizeMethod"),
    ("/findings/0/size/confidence", "EstimateConfidence"),
    ("/findings/0/size/shared", "SharedState"),
    ("/totals/method", "AggregateMethod"),
    ("/issues/0/code", "IssueCode"),
];

fn schema_document() -> Value {
    serde_json::from_str(include_str!(
        "../../../contracts/v1/scan-report.schema.json"
    ))
    .expect("frozen schema must be JSON")
}

fn schema_wire_literals(schema: &Value, name: &str) -> Vec<String> {
    let definition = &schema["$defs"][name];
    assert_eq!(definition["type"], "string", "{name}: schema type");
    if name == "SchemaVersion" {
        assert!(
            !definition["enum"].is_array(),
            "SchemaVersion material is const, not an enum array"
        );
        return vec![
            definition["const"]
                .as_str()
                .expect("SchemaVersion const")
                .to_owned(),
        ];
    }
    definition["enum"]
        .as_array()
        .unwrap_or_else(|| panic!("{name}: expected a string enum array"))
        .iter()
        .map(|value| {
            value
                .as_str()
                .unwrap_or_else(|| panic!("{name}: enum entry must be a string"))
                .to_owned()
        })
        .collect()
}

fn string_boundary_report() -> Value {
    let mut report = base_value();
    report["status"] = json!("partial");
    report["totals"]["coverage_complete"] = json!(false);
    report["findings"][0]["risk"] = json!("protected");
    report["findings"][0]["protection_reasons"] = json!(["user_pinned"]);
    report["issues"] = json!([{
        "code": "unsupported",
        "scope_id": "scope-1",
        "relative_path": null,
        "message": "Synthetic string-boundary fixture."
    }]);
    report
}

fn check_wire_enum<T>(schema: &Value, name: &str, failures: &mut Vec<String>) -> usize
where
    T: DeserializeOwned + Serialize,
{
    let literals = schema_wire_literals(schema, name);
    assert!(!literals.is_empty(), "{name}: missing wire literals");
    for literal in &literals {
        match serde_json::from_str::<T>(&json!(literal).to_string()) {
            Ok(parsed) => {
                let serialized = serde_json::to_value(&parsed).expect("serialize wire enum");
                if serialized != Value::String(literal.clone()) {
                    failures.push(format!(
                        "{name}: round trip changed {literal:?} into {serialized}"
                    ));
                }
            }
            Err(error) => failures.push(format!(
                "{name}: rejected schema string {literal:?}: {error}"
            )),
        }
        let object = json!({ literal: null }).to_string();
        if serde_json::from_str::<T>(&object).is_ok() {
            failures.push(format!("{name}: accepted object {object}"));
        }
    }
    let tagged = json!({ literals[0].clone(): true }).to_string();
    if serde_json::from_str::<T>(&tagged).is_ok() {
        failures.push(format!("{name}: accepted object {tagged}"));
    }
    for sample in [
        json!([]),
        json!([literals[0].clone()]),
        Value::Null,
        json!(true),
        json!(false),
        json!(0),
        json!(-1),
        json!("DO_NOT_ECHO_CANARY_7f98"),
    ] {
        if serde_json::from_str::<T>(&sample.to_string()).is_ok() {
            failures.push(format!("{name}: accepted {sample}"));
        }
    }
    literals.len()
}

fn check_report_enum_slots(failures: &mut Vec<String>) {
    let report = string_boundary_report();
    if let Err(error) = parse_report(&report.to_string()) {
        failures.push(format!(
            "string-boundary carrier report was rejected: {error}"
        ));
        return;
    }
    for (pointer, name) in REPORT_ENUM_SLOTS {
        let Some(literal) = report
            .pointer(pointer)
            .and_then(Value::as_str)
            .map(str::to_owned)
        else {
            failures.push(format!("{pointer} ({name}): missing schema string"));
            continue;
        };
        let mut object_input = report.clone();
        let mut object = serde_json::Map::new();
        object.insert(literal.clone(), Value::Null);
        *object_input.pointer_mut(pointer).unwrap() = Value::Object(object);
        match parse_report(&object_input.to_string()) {
            Err(error)
                if error.code == ContractErrorCode::InvalidShape
                    && !error.to_string().contains(&literal)
                    && !error.to_string().contains("DO_NOT_ECHO_CANARY_7f98") => {}
            Ok(_) => failures.push(format!("{pointer} ({name}): accepted object")),
            Err(error) => failures.push(format!(
                "{pointer} ({name}): expected InvalidShape without input echo, actual {error}"
            )),
        }
        for sample in [
            json!([]),
            Value::Null,
            json!(true),
            json!(false),
            json!(0),
            json!(-1),
            json!("DO_NOT_ECHO_CANARY_7f98"),
            json!({"DO_NOT_ECHO_CANARY_7f98": null}),
        ] {
            let mut input = report.clone();
            *input.pointer_mut(pointer).unwrap() = sample.clone();
            match parse_report(&input.to_string()) {
                Err(error)
                    if error.code == ContractErrorCode::InvalidShape
                        && !error.to_string().contains("DO_NOT_ECHO_CANARY_7f98")
                        && !error.to_string().contains(&literal) => {}
                Ok(_) => failures.push(format!("{pointer} ({name}): accepted {sample}")),
                Err(error) => failures.push(format!(
                    "{pointer} ({name}): expected InvalidShape for {sample}, actual {error}"
                )),
            }
        }
    }
}

fn assert_wire_enum_boundaries() {
    let schema = schema_document();
    let defined = schema["$defs"]
        .as_object()
        .expect("schema defs")
        .values()
        .filter(|value| {
            value["type"] == "string" && (value["enum"].is_array() || value["const"].is_string())
        })
        .count();
    assert_eq!(defined, 20, "frozen public string enums");
    assert_eq!(REPORT_ENUM_SLOTS.len(), 20, "report enum positions");
    let mut failures = Vec::new();
    let mut literals = 0;
    let mut types = 0;
    macro_rules! check {
        ($($name:ident),+ $(,)?) => {
            $(
                literals += check_wire_enum::<$name>(&schema, stringify!($name), &mut failures);
                types += 1;
            )+
        };
    }
    check!(
        SchemaVersion,
        Platform,
        ScopeOrigin,
        Coverage,
        ScanStatus,
        LocationSource,
        Category,
        Risk,
        Recoverability,
        Activity,
        Confidence,
        ProtectionReason,
        EvidenceCode,
        EvidenceSource,
        SizeMethod,
        EstimateConfidence,
        SharedState,
        ReferenceState,
        AggregateMethod,
        IssueCode,
    );
    assert_eq!(types, 20, "direct wire enum types");
    assert_eq!(literals, 93, "direct wire enum literals");
    check_report_enum_slots(&mut failures);
    let accepted = failures
        .iter()
        .filter(|line| line.contains("accepted"))
        .count();
    let details = failures.join("\n");
    assert!(
        failures.is_empty(),
        "{accepted} non-string wire values accepted across {} boundary failures:\n{details}",
        failures.len()
    );
}

#[test]
fn raw_json_and_resource_limits() {
    let data = cases();
    let raw = data["rawJsonCases"].as_array().unwrap();
    assert_eq!(raw.len(), 6);
    for case in raw {
        assert_error(
            parse_report(case["input"].as_str().unwrap()),
            case["expected"].as_str().unwrap(),
            case["id"].as_str().unwrap(),
        );
    }
    let resources = data["resourceCases"].as_array().unwrap();
    assert_eq!(resources.len(), 2);
    for case in resources {
        let id = case["id"].as_str().unwrap();
        let expected = case["expected"].as_str().unwrap();
        match case["inputGenerator"].as_str().unwrap() {
            "ascii_spaces" => {
                let input = " ".repeat(case["byteCount"].as_u64().unwrap() as usize);
                assert_error(parse_report(&input), expected, id);
            }
            "clone_valid_findings_unique_ids" => {
                let mut report = base_report();
                let finding = report.findings[0].clone();
                report.findings = (0..case["findingCount"].as_u64().unwrap())
                    .map(|index| {
                        let mut clone = finding.clone();
                        clone.finding_id = OpaqueId::new(format!("finding-{index}")).unwrap();
                        clone
                    })
                    .collect();
                validate_report(&report).unwrap_or_else(|error| panic!("{id}: {error}"));
                assert!(serde_json::to_string(&report).unwrap().len() > 8_388_608);
                assert_error(to_json(&report), expected, id);
            }
            _ => panic!("unknown resource generator: {id}"),
        }
    }
    let mut canary = base_value();
    canary["findings"][0]["category"] = json!("DO_NOT_ECHO_CANARY_7f98");
    let error = parse_report(&canary.to_string()).unwrap_err();
    assert_eq!(error.code, ContractErrorCode::InvalidShape);
    assert!(!error.to_string().contains("DO_NOT_ECHO_CANARY_7f98"));

    let mut boundary_input = BASE.to_owned();
    boundary_input.push_str(&" ".repeat(8_388_608 - BASE.len()));
    assert_eq!(boundary_input.len(), 8_388_608);
    assert_eq!(parse_report(&boundary_input).unwrap(), base_report());
    for path in [
        "",
        "/scopes/0",
        "/findings/0",
        "/findings/0/tool",
        "/findings/0/evidence/0",
        "/findings/0/references",
        "/findings/0/size",
        "/totals",
    ] {
        let mut value = base_value();
        *value.pointer_mut(path).unwrap() = json!([]);
        assert_error(
            parse_report(&value.to_string()),
            "InvalidShape",
            &format!("object required at {path}"),
        );
    }
    assert_wire_enum_boundaries();
}
