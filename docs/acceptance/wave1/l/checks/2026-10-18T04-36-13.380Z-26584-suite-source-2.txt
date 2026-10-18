use serde_json::{Value, json};
use water_contracts::v1::{OpaqueId, Platform};
use water_project_evidence::v1::{AnalysisError, ProjectEvidence, analyze_json, to_json};
use water_scan_report::v1::{ReportContext, ScopeContext, assemble_json};

fn cases() -> Value {
    serde_json::from_str(include_str!(
        "../../../contracts/project-evidence-v1/cases.json"
    ))
    .unwrap()
}

fn context(value: &Value) -> ReportContext {
    ReportContext {
        scan_id: OpaqueId::new(value["scan_id"].as_str().unwrap()).unwrap(),
        platform: serde_json::from_value(value["platform"].clone()).unwrap(),
        scopes: value["scopes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|scope| ScopeContext {
                scope_id: OpaqueId::new(scope["scope_id"].as_str().unwrap()).unwrap(),
                label: scope["label"].as_str().unwrap().to_owned(),
                origin: serde_json::from_value(scope["origin"].clone()).unwrap(),
            })
            .collect(),
    }
}

fn wire(raw: &str, ctx: &ReportContext) -> Value {
    let output = analyze_json(raw, ctx).unwrap();
    serde_json::from_str(&to_json(&output).unwrap()).unwrap()
}

fn named<'a>(data: &'a Value, id: &str) -> &'a Value {
    data["golden_cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"] == id)
        .unwrap()
}

fn assert_source(raw: &str, ctx: &ReportContext) -> water_scan_report::v1::AssemblyError {
    let source = match assemble_json(raw, ctx) {
        Err(error) => error,
        Ok(_) => panic!("G accepted source-error sample"),
    };
    let error = analyze_json(raw, ctx).unwrap_err();
    assert_eq!(error, AnalysisError::Source(source.clone()));
    assert_eq!(error.to_string(), source.to_string());
    assert_eq!(error.clone(), error);
    assert!(std::error::Error::source(&error).is_some());
    assert!(!format!("{error:?} {error}").contains("LM_ERROR_CANARY"));
    source
}

#[test]
fn evidence_candidates() {
    let data = cases();
    assert_eq!(data["golden_cases"].as_array().unwrap().len(), 10);
    for case in data["golden_cases"].as_array().unwrap() {
        let actual = wire(&case["input"].to_string(), &context(&case["context"]));
        let expected = &case["expected"];
        assert_eq!(
            actual["counts"]["non_file_marker_names"], expected["counts"]["non_file_marker_names"],
            "L_FILE_ONLY exclusions {}",
            case["id"]
        );
        assert_eq!(
            actual["candidates"].as_array().unwrap().len(),
            expected["candidates"].as_array().unwrap().len(),
            "L_FILE_ONLY candidate count {}",
            case["id"]
        );
        assert_eq!(actual, *expected, "L_BEHAVIOR golden {}", case["id"]);
    }
    let root = named(&data, "four-root-rules");
    let actual = wire(&root["input"].to_string(), &context(&root["context"]));
    assert_eq!(actual["counts"]["candidates"], 4);
    let case = named(&data, "non-markers");
    assert_eq!(
        wire(&case["input"].to_string(), &context(&case["context"]))["candidates"],
        json!([])
    );
}

#[test]
fn evidence_validation() {
    let data = cases();
    let errors = data["source_errors"].as_array().unwrap();
    assert_eq!(errors.len(), 11);
    for case in errors {
        let raw = case["input"].as_str().unwrap();
        let ctx = context(&case["context"]);
        let before = ctx.clone();
        let source = assert_source(raw, &ctx);
        assert_eq!(format!("{:?}", source.code), case["code"].as_str().unwrap());
        assert_eq!(source.field, case["field"].as_str().unwrap());
        assert_eq!(ctx, before);
    }
    let base = named(&data, "project-markers");
    let ctx = context(&base["context"]);
    let oversized = " ".repeat(8_388_609);
    let error = assert_source(&oversized, &ctx);
    assert_eq!(format!("{:?}", error.code), "InvalidFacts");
    let mut invalid_context = ctx.clone();
    invalid_context.scopes.clear();
    assert_source(&base["input"].to_string(), &invalid_context);
    let multiple = named(&data, "cross-scope-markers");
    let mut reversed = context(&multiple["context"]);
    reversed.scopes.reverse();
    assert_source(&multiple["input"].to_string(), &reversed);

    // A syntactically valid facts document can exceed G's report output limit.
    let mut large = base["input"].clone();
    let template = large["scopes"][0]["entries"][2].clone();
    let entries: Vec<Value> = (0..10_000)
        .map(|index| {
            let mut entry = template.clone();
            entry["relative_path"] = json!(format!("observation-{index}-{}", "x".repeat(400)));
            entry
        })
        .collect();
    large["scopes"][0]["entries"] = json!(entries);
    large["scopes"][0]["visited_entries"] = json!(10_000);
    large["visited_entries"] = json!(10_000);
    large["recorded_entries"] = json!(10_000);
    let raw = large.to_string();
    assert!(raw.len() < 8_388_608);
    let error = assert_source(&raw, &ctx);
    assert_eq!(format!("{:?}", error.code), "ReportRejected");
}

#[test]
fn evidence_coverage_and_paths() {
    let data = cases();
    for id in [
        "paths-and-case",
        "cross-scope-markers",
        "partial-root-issue",
        "cancelled-observed",
        "empty-completed",
        "pre-cancelled",
    ] {
        let case = named(&data, id);
        let actual = wire(&case["input"].to_string(), &context(&case["context"]));
        assert_eq!(actual, case["expected"], "L_BEHAVIOR paths {id}");
    }
    let roots = named(&data, "four-root-rules");
    let mut input = roots["input"].clone();
    input["run_id"] = json!("run-independent-identifiers");
    input["case_id"] = json!("independent-identifiers");
    let paths = [
        "a/package.json",
        "ab/package-lock.json",
        "项目/e\u{301}/pyproject.toml",
        "%2e%2e/requirements.txt",
    ];
    for (entry, path) in input["scopes"][0]["entries"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .zip(paths)
    {
        entry["relative_path"] = json!(path);
        entry["depth"] = json!(path.split('/').count());
    }
    input["scopes"][0]["entries"]
        .as_array_mut()
        .unwrap()
        .reverse();
    let mut ctx = context(&roots["context"]);
    ctx.scan_id = OpaqueId::new("independent-scan").unwrap();
    ctx.platform = Platform::Macos;
    let actual = wire(&input.to_string(), &ctx);
    assert_eq!(actual["scan_id"], "independent-scan");
    assert_eq!(actual["source_run_id"], "run-independent-identifiers");
    assert_eq!(actual["platform"], "macos");
    let candidates = actual["candidates"].as_array().unwrap();
    assert_eq!(candidates.len(), 4, "L_BEHAVIOR arbitrary identifiers");
    for (index, (candidate, path)) in candidates.iter().zip(paths.iter().rev()).enumerate() {
        assert_eq!(candidate["relative_path"], *path);
        assert_eq!(candidate["finding_id"], format!("entry-{}", index + 1));
        assert_eq!(
            candidate["parent_relative_path"],
            path.rsplit_once('/').unwrap().0
        );
    }
}

#[test]
fn evidence_preservation_and_purity() {
    let data = cases();
    for case in data["golden_cases"].as_array().unwrap() {
        let raw = case["input"].to_string();
        let raw_before = raw.clone();
        let ctx = context(&case["context"]);
        let ctx_before = ctx.clone();
        let source = assemble_json(&raw, &ctx).unwrap();
        let original = serde_json::to_value(&source).unwrap();
        let first = analyze_json(&raw, &ctx).unwrap();
        let encoded = to_json(&first).unwrap();
        let actual: Value = serde_json::from_str(&encoded).unwrap();
        assert_eq!(
            actual["source_totals"], original["report"]["totals"],
            "L_SOURCE_TOTALS {}",
            case["id"]
        );
        assert_eq!(actual["source_facts"], *source.source_facts());
        assert_eq!(actual["source_facts"], case["input"]);
        assert_eq!(raw, raw_before);
        assert_eq!(ctx, ctx_before);
        assert_eq!(serde_json::to_value(&source).unwrap(), original);
        for finding in original["report"]["findings"].as_array().unwrap() {
            assert_eq!(finding["category"], "unknown");
            assert_eq!(finding["risk"], "protected");
            assert!(finding["size"]["allocated_bytes"].is_null());
            assert!(finding["size"]["reclaimable_lower_bytes"].is_null());
            assert!(finding["size"]["reclaimable_upper_bytes"].is_null());
        }
        let cloned = first.clone();
        assert_eq!(cloned, first);
        let mut independent_wire = serde_json::to_value(&cloned).unwrap();
        independent_wire["source_facts"]["run_id"] = json!("run-wire-only");
        assert_eq!(to_json(&first).unwrap(), encoded);
        let other = named(&data, "non-markers");
        analyze_json(&other["input"].to_string(), &context(&other["context"])).unwrap();
        assert_eq!(analyze_json(&raw, &ctx).unwrap(), first);
    }
}

#[test]
fn evidence_public_wire() {
    let _: fn(&str, &ReportContext) -> Result<ProjectEvidence, AnalysisError> = analyze_json;
    let _: fn(&ProjectEvidence) -> Result<String, AnalysisError> = to_json;
    let data = cases();
    for case in data["golden_cases"].as_array().unwrap() {
        let raw = case["input"].to_string();
        let ctx = context(&case["context"]);
        let known = assemble_json(&raw, &ctx).unwrap();
        let result = analyze_json(&raw, &ctx).unwrap();
        assert!(!format!("{result:?}").is_empty());
        let encoded = to_json(&result).unwrap();
        assert!(encoded.len() <= 33_554_432);
        assert_eq!(encoded, to_json(&result).unwrap());
        let actual: Value = serde_json::from_str(&encoded).unwrap();
        assert_eq!(actual, serde_json::to_value(&result).unwrap());
        for candidate in actual["candidates"].as_array().unwrap() {
            assert_eq!(
                candidate["evidence_strength"], "filename_only",
                "L_FILENAME_ONLY"
            );
            assert_eq!(
                candidate["format_verified"], false,
                "L_FILENAME_ONLY format"
            );
            assert_eq!(
                candidate["tool_version_known"], false,
                "L_FILENAME_ONLY version"
            );
            assert_eq!(
                candidate["project_membership_verified"], false,
                "L_FILENAME_ONLY membership"
            );
            assert_eq!(candidate["action"], "display_only");
            assert_eq!(candidate["risk"], "protected");
        }
        assert_eq!(
            actual, case["expected"],
            "L_BEHAVIOR complete wire {}",
            case["id"]
        );
        assert_eq!(actual["source_facts"], *known.source_facts());
        assert_eq!(
            actual["source_totals"],
            serde_json::to_value(&known.report().totals).unwrap(),
            "L_SOURCE_TOTALS public wire"
        );
    }
    for (error, message) in [
        (AnalysisError::OutputTooLarge, "OutputTooLarge at /analysis"),
        (
            AnalysisError::SerializationFailed,
            "SerializationFailed at /analysis",
        ),
    ] {
        assert_eq!(error.to_string(), message);
        assert_eq!(error.clone(), error);
        assert!(std::error::Error::source(&error).is_none());
    }
}
