//! Synthetic whitelist-export checks. This target reads frozen fixtures only.
#![forbid(unsafe_code)]

use std::collections::{BTreeSet, HashMap};

use serde_json::Value;
use water_contracts::v1::{
    Category, ContractError, ContractErrorCode, OpaqueId, RelativePath, Risk, ScanReport,
    ScanStatus, SizeMethod, parse_report, validate_report,
};
use water_summary_export::v1::{
    CategoryCounts, RiskCounts, SummaryExport, summarize_json, summarize_report,
};

const EXPORT_CASES: &str = include_str!("../../../contracts/summary-export-v1/cases.json");
const CONTRACT_CASES: &str = include_str!("../../../contracts/v1/conformance-cases.json");
const CONTRACT_BASE: &str = include_str!("../../../contracts/v1/examples/valid-report.json");

const ROOT_KEYS: &[&str] = &[
    "category_counts",
    "counts",
    "export_version",
    "read_only",
    "risk_counts",
    "source_schema_version",
    "status",
    "totals",
];
const COUNT_KEYS: &[&str] = &["findings", "issues", "scopes"];
const RISK_KEYS: &[&str] = &["high", "low", "protected", "review"];
const CATEGORY_KEYS: &[&str] = &[
    "build_cache",
    "credential",
    "database",
    "download_cache",
    "environment",
    "experiment",
    "history",
    "model",
    "source",
    "temporary",
    "unknown",
];
const TOTAL_KEYS: &[&str] = &[
    "allocated_bytes",
    "coverage_complete",
    "logical_bytes",
    "method",
    "scanned_entries",
    "skipped_entries",
];

struct Golden {
    id: String,
    input: String,
    expected: Value,
}

fn export_cases() -> Value {
    serde_json::from_str(EXPORT_CASES).expect("frozen export cases must be JSON")
}

fn contract_cases() -> Value {
    serde_json::from_str(CONTRACT_CASES).expect("frozen contract cases must be JSON")
}

fn contract_base() -> Value {
    serde_json::from_str(CONTRACT_BASE).expect("frozen contract base must be JSON")
}

fn key_set(keys: &[&str]) -> BTreeSet<String> {
    keys.iter().map(|key| (*key).to_owned()).collect()
}

fn object_keys(value: &Value) -> BTreeSet<String> {
    value
        .as_object()
        .expect("summary object")
        .keys()
        .cloned()
        .collect()
}

fn golden_cases() -> Vec<Golden> {
    export_cases()["golden_cases"]
        .as_array()
        .expect("golden_cases")
        .iter()
        .map(|case| Golden {
            id: case["id"].as_str().expect("id").to_owned(),
            input: case["input"].to_string(),
            expected: case["expected"].clone(),
        })
        .collect()
}

fn golden(id: &str) -> Golden {
    golden_cases()
        .into_iter()
        .find(|case| case.id == id)
        .unwrap_or_else(|| panic!("missing golden {id}"))
}

fn canaries() -> Vec<String> {
    export_cases()["canaries"]
        .as_array()
        .expect("canaries")
        .iter()
        .map(|value| value.as_str().expect("canary string").to_owned())
        .collect()
}

fn code_name(code: &ContractErrorCode) -> String {
    format!("{code:?}")
}

fn rendered(error: &ContractError) -> String {
    format!("{error} {error:?}")
}

fn summarize_case(id: &str) -> (ScanReport, SummaryExport) {
    let case = golden(id);
    let report = parse_report(&case.input).unwrap_or_else(|error| panic!("{id}: {error}"));
    let from_json = summarize_json(&case.input).unwrap_or_else(|error| panic!("{id}: {error}"));
    let from_dto = summarize_report(&report).unwrap_or_else(|error| panic!("{id}: {error}"));
    assert_eq!(from_json, from_dto, "{id}: public entries differ");
    (report, from_json)
}

fn whitelist_problems(value: &Value, serialized: &str, planted: &[String]) -> Vec<String> {
    let mut problems = Vec::new();
    let leaked: Vec<&str> = planted
        .iter()
        .filter(|canary| serialized.contains(canary.as_str()))
        .map(String::as_str)
        .collect();
    if !leaked.is_empty() {
        problems.push(format!("canary {leaked:?}"));
    }
    let checks = [
        (value, ROOT_KEYS, "exact keys"),
        (&value["counts"], COUNT_KEYS, "exact counts keys"),
        (&value["risk_counts"], RISK_KEYS, "exact risk keys"),
        (
            &value["category_counts"],
            CATEGORY_KEYS,
            "exact category keys",
        ),
        (&value["totals"], TOTAL_KEYS, "exact totals keys"),
    ];
    for (node, allowed, label) in checks {
        let actual = object_keys(node);
        let expected = key_set(allowed);
        if actual != expected {
            problems.push(format!("{label} {actual:?}"));
        }
    }
    problems
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
                let item_index = if token == "-" {
                    array.len()
                } else {
                    token.parse().unwrap()
                };
                array.insert(item_index, operation["value"].clone());
            }
            "replace" => array[token.parse::<usize>().unwrap()] = operation["value"].clone(),
            "remove" => {
                array.remove(token.parse().unwrap());
            }
            _ => panic!("unsupported patch operation: {op}"),
        },
        _ => panic!("patch parent must be a container"),
    }
}

fn assert_rejected(input: &str, expected: &str, context: &str) {
    let parsed = parse_report(input);
    let summarized = summarize_json(input);
    let parsed_error = parsed.expect_err(context);
    let summarized_error = summarized.expect_err(context);
    assert_eq!(
        summarized_error, parsed_error,
        "{context}: error must come from A"
    );
    assert_eq!(
        code_name(&summarized_error.code),
        expected,
        "{context}: code"
    );
    let rendered = rendered(&summarized_error);
    assert!(
        !rendered.contains("DO_NOT_ECHO_CANARY_7f98"),
        "{context}: error echoed input"
    );
    assert!(
        !rendered.contains("H_EVIDENCE_CANARY"),
        "{context}: error echoed evidence"
    );
}

fn fresh_base() -> ScanReport {
    let case = golden("base");
    parse_report(&case.input).expect("base golden parses")
}

fn illegal_dto(index: usize) -> ScanReport {
    let mut report = fresh_base();
    match index {
        0 => {
            report.findings[0].category = Category::Model;
            report.findings[0].risk = Risk::Low;
            report.findings[0].protection_reasons.clear();
        }
        1 => {
            report.findings[0].scope_id = OpaqueId::new("unknown-scope").expect("id syntax");
        }
        2 => report.totals.coverage_complete = false,
        3 => report.findings[0].size.method = SizeMethod::Unknown,
        4 => report.findings[0].evidence[0].summary = "x".repeat(281),
        5 => {
            let scope = report.scopes[0].clone();
            report.scopes = vec![scope; 65];
        }
        _ => unreachable!("six constructed DTO cases"),
    }
    report
}

fn logical_sum(report: &ScanReport) -> u128 {
    report
        .findings
        .iter()
        .map(|finding| {
            finding
                .size
                .logical_bytes
                .map(|count| u128::from(count.get()))
                .unwrap_or(0)
        })
        .sum()
}

fn assert_byte_string(json: &str, digits: &str) {
    assert!(
        json.contains(&format!("\"logical_bytes\":\"{digits}\"")),
        "{digits} must serialize as a decimal string"
    );
    assert!(
        !json.contains(&format!("\"logical_bytes\":{digits}")),
        "{digits} must not serialize as a JSON number"
    );
}

fn count_risks(report: &ScanReport) -> RiskCounts {
    let mut counts = RiskCounts {
        low: 0,
        review: 0,
        high: 0,
        protected: 0,
    };
    for finding in &report.findings {
        let bucket = match finding.risk {
            Risk::Low => &mut counts.low,
            Risk::Review => &mut counts.review,
            Risk::High => &mut counts.high,
            Risk::Protected => &mut counts.protected,
        };
        *bucket = bucket.checked_add(1).unwrap();
    }
    counts
}

fn count_categories(report: &ScanReport) -> CategoryCounts {
    let mut counts = CategoryCounts {
        download_cache: 0,
        build_cache: 0,
        environment: 0,
        model: 0,
        experiment: 0,
        history: 0,
        database: 0,
        credential: 0,
        source: 0,
        temporary: 0,
        unknown: 0,
    };
    for finding in &report.findings {
        let bucket = match finding.category {
            Category::DownloadCache => &mut counts.download_cache,
            Category::BuildCache => &mut counts.build_cache,
            Category::Environment => &mut counts.environment,
            Category::Model => &mut counts.model,
            Category::Experiment => &mut counts.experiment,
            Category::History => &mut counts.history,
            Category::Database => &mut counts.database,
            Category::Credential => &mut counts.credential,
            Category::Source => &mut counts.source,
            Category::Temporary => &mut counts.temporary,
            Category::Unknown => &mut counts.unknown,
        };
        *bucket = bucket.checked_add(1).unwrap();
    }
    counts
}

fn retarget(report: &mut ScanReport) {
    report.scan_id = OpaqueId::new("scan-retargeted").expect("scan id");
    let new_scope_ids: Vec<OpaqueId> = (0..report.scopes.len())
        .map(|index| OpaqueId::new(format!("scope-b{index}")).expect("scope id"))
        .collect();
    let scope_map: HashMap<String, OpaqueId> = report
        .scopes
        .iter()
        .zip(&new_scope_ids)
        .map(|(scope, id)| (scope.scope_id.as_str().to_owned(), id.clone()))
        .collect();
    for (scope, id) in report.scopes.iter_mut().zip(new_scope_ids) {
        scope.scope_id = id;
        scope.label = format!("Label {}", scope.label.chars().count());
    }
    for (index, finding) in report.findings.iter_mut().enumerate() {
        finding.finding_id = OpaqueId::new(format!("finding-b{index}")).expect("finding id");
        finding.scope_id = scope_map
            .get(finding.scope_id.as_str())
            .expect("scope id maps")
            .clone();
        finding.rule_version = "rule-b".to_owned();
        if let Some(tool) = &mut finding.tool {
            tool.tool_id = OpaqueId::new(format!("tool-b{index}")).expect("tool id");
            tool.name = format!("Tool {index}");
            tool.version = Some(format!("v{index}"));
        }
        for evidence in &mut finding.evidence {
            evidence.summary = format!("Evidence {index} text");
        }
        for (project_index, project_id) in finding.references.project_ids.iter_mut().enumerate() {
            *project_id =
                OpaqueId::new(format!("project-b-{index}-{project_index}")).expect("project id");
        }
    }
    for (index, issue) in report.issues.iter_mut().enumerate() {
        issue.scope_id = scope_map
            .get(issue.scope_id.as_str())
            .expect("issue scope maps")
            .clone();
        issue.message = format!("Issue {index} text");
        if issue.relative_path.is_some() {
            issue.relative_path =
                Some(RelativePath::new(format!("renamed/issue-{index}")).expect("issue path"));
        }
    }
}

fn reorder(report: &mut ScanReport) {
    report.scopes.reverse();
    report.findings.reverse();
    report.issues.reverse();
    for finding in &mut report.findings {
        finding.evidence.reverse();
        finding.protection_reasons.reverse();
        finding.references.project_ids.reverse();
    }
}

#[test]
fn export_whitelist() {
    let cases = golden_cases();
    assert_eq!(cases.len(), 11);
    let planted = canaries();
    assert_eq!(planted.len(), 13);
    let planted_text: String = cases
        .iter()
        .filter(|case| case.id.contains("canary"))
        .map(|case| case.input.clone())
        .collect();
    for canary in &planted {
        assert!(planted_text.contains(canary), "fixture must plant {canary}");
    }

    for case in cases.iter().filter(|case| case.id.contains("canary")) {
        let export =
            summarize_json(&case.input).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        let serialized = serde_json::to_string(&export).unwrap();
        let value = serde_json::to_value(&export).unwrap();
        let problems = whitelist_problems(&value, &serialized, &planted);
        assert!(
            problems.is_empty(),
            "{}: exact keys/canary {}",
            case.id,
            problems.join("; ")
        );
    }

    for case in &cases {
        let report =
            parse_report(&case.input).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        let from_json =
            summarize_json(&case.input).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        let from_dto =
            summarize_report(&report).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        assert_eq!(from_json, from_dto, "{}: public entries differ", case.id);
        assert_eq!(from_json.export_version, "water.summary-export.v1");
        assert!(from_json.read_only, "{}: export stays read only", case.id);
        assert_eq!(from_json.source_schema_version, report.schema_version);
        assert_eq!(from_json.status, report.status);
        assert_eq!(from_json.totals, report.totals);
        let serialized = serde_json::to_string(&from_json).unwrap();
        let value = serde_json::to_value(&from_json).unwrap();
        let problems = whitelist_problems(&value, &serialized, &planted);
        assert!(
            problems.is_empty(),
            "{}: exact keys/canary {}",
            case.id,
            problems.join("; ")
        );
        assert_eq!(value, case.expected, "{}: expected summary", case.id);
    }
}

#[test]
fn export_validation() {
    let contracts = contract_cases();
    let reports = contracts["cases"].as_array().unwrap();
    assert_eq!(reports.len(), 66);
    let mut ids = BTreeSet::new();
    for case in reports {
        let id = case["id"].as_str().unwrap();
        assert!(ids.insert(id.to_owned()), "{id}: conformance id reused");
        let mut value = contract_base();
        for operation in case["operations"].as_array().unwrap() {
            patch(&mut value, operation);
        }
        let input = serde_json::to_string(&value).unwrap();
        let expected = case["expected"].as_str().unwrap();
        if expected == "ok" {
            let report = parse_report(&input).unwrap_or_else(|error| panic!("{id}: {error}"));
            let from_json = summarize_json(&input).unwrap_or_else(|error| panic!("{id}: {error}"));
            let from_dto =
                summarize_report(&report).unwrap_or_else(|error| panic!("{id}: {error}"));
            assert_eq!(from_json, from_dto, "{id}: dto entry");
            assert_eq!(
                usize::try_from(from_json.counts.findings).unwrap(),
                report.findings.len(),
                "{id}: finding count"
            );
            assert_eq!(from_json.totals, report.totals, "{id}: totals copied");
        } else {
            assert_rejected(&input, expected, id);
        }
    }
    for required in [
        "unknown_top_field",
        "unknown_nested_field",
        "missing_nullable_field",
        "duplicate_scope",
        "duplicate_finding",
    ] {
        assert!(ids.contains(required), "missing A variant {required}");
    }

    let raw_cases = contracts["rawJsonCases"].as_array().unwrap();
    assert_eq!(raw_cases.len(), 6);
    for case in raw_cases {
        let id = case["id"].as_str().unwrap();
        assert_rejected(
            case["input"].as_str().unwrap(),
            case["expected"].as_str().unwrap(),
            id,
        );
    }

    let export_raw = export_cases()["raw_cases"].as_array().cloned().unwrap();
    assert_eq!(export_raw.len(), 6);
    let mut raw_ids = BTreeSet::new();
    for case in &export_raw {
        let id = case["id"].as_str().unwrap();
        assert!(raw_ids.insert(id.to_owned()), "{id}: raw id reused");
        let input = case["input"].as_str().unwrap();
        if id == "canary_enum" {
            assert!(input.contains("DO_NOT_ECHO_CANARY_7f98"));
        }
        if id == "duplicate_schema" {
            assert_eq!(input.matches("\"schema_version\"").count(), 2);
        }
        assert_rejected(input, case["code"].as_str().unwrap(), id);
    }
    for required in [
        "bad_json",
        "duplicate_schema",
        "object_enum",
        "missing_nullable",
        "canary_enum",
    ] {
        assert!(
            raw_ids.contains(required),
            "missing raw regression {required}"
        );
    }

    let constructed = export_cases()["constructed_cases"]
        .as_array()
        .cloned()
        .unwrap();
    assert_eq!(
        constructed,
        [
            "unsafe classification",
            "unknown scope",
            "inconsistent coverage",
            "invalid size",
            "overlong summary",
            "excess scope count",
        ]
        .map(Value::from)
        .to_vec()
    );
    for (index, label) in constructed.iter().enumerate() {
        let label = label.as_str().unwrap();
        let report = illegal_dto(index);
        let expected = validate_report(&report).expect_err(label);
        let summarized = summarize_report(&report);
        assert!(
            summarized.is_err(),
            "{label}: illegal DTO must fail export_validation"
        );
        let actual = summarized.expect_err(label);
        assert_eq!(
            actual, expected,
            "{label}: dto error must equal validate_report"
        );
        assert!(!rendered(&actual).contains("H_EVIDENCE_CANARY"));
        assert!(!rendered(&actual).contains("DO_NOT_ECHO_CANARY_7f98"));
    }
}

#[test]
fn export_precision_and_totals() {
    let (base_report, base) = summarize_case("base");
    let base_json = serde_json::to_string(&base).unwrap();
    assert!(
        base.totals.logical_bytes.is_none(),
        "unknown totals.logical_bytes must stay null"
    );
    assert!(base.totals.allocated_bytes.is_none());
    assert!(base_json.contains("\"logical_bytes\":null"));
    assert!(
        !base_json.contains("9007199254740993"),
        "finding size must not replace unknown totals"
    );
    assert_ne!(
        logical_sum(&base_report),
        0,
        "base has a finding size that totals must not adopt"
    );

    let (unknown_report, unknown) = summarize_case("total-unknown");
    let unknown_json = serde_json::to_string(&unknown).unwrap();
    assert!(
        unknown.totals.logical_bytes.is_none(),
        "unknown totals.logical_bytes must stay null"
    );
    assert!(unknown.totals.allocated_bytes.is_none());
    assert_eq!(unknown.totals, unknown_report.totals);
    assert!(unknown_json.contains("\"logical_bytes\":null"));
    assert!(!unknown_json.contains("\"logical_bytes\":\"0\""));
    assert!(!unknown_json.contains("\"logical_bytes\":0"));

    let samples = [
        ("total-0", 0_u64, "0"),
        ("total-9007199254740992", 1_u64 << 53, "9007199254740992"),
        (
            "total-9007199254740993",
            (1_u64 << 53) + 1,
            "9007199254740993",
        ),
        (
            "total-18446744073709551615",
            u64::MAX,
            "18446744073709551615",
        ),
    ];
    for (id, value, digits) in samples {
        let (report, export) = summarize_case(id);
        let json = serde_json::to_string(&export).unwrap();
        let message = if id == "total-9007199254740993" {
            "2^53+1 must not pass through f64"
        } else {
            "source byte string must round-trip"
        };
        assert_eq!(
            export.totals.logical_bytes.map(|count| count.get()),
            Some(value),
            "{id}: {message}"
        );
        assert_eq!(export.totals, report.totals, "{id}: totals copied");
        assert_byte_string(&json, digits);
        assert!(export.totals.allocated_bytes.is_none(), "{id}");
    }

    let (wide_report, wide) = summarize_case("all-categories-canary");
    let wide_json = serde_json::to_string(&wide).unwrap();
    assert_eq!(wide.totals.logical_bytes.map(|count| count.get()), Some(37));
    assert_eq!(wide.totals.scanned_entries, u32::MAX);
    assert_eq!(wide.totals.skipped_entries, u32::MAX);
    assert_eq!(wide_report.totals.scanned_entries, u32::MAX);
    assert_eq!(wide_report.totals.skipped_entries, u32::MAX);
    let added = u64::from(u32::MAX) + u64::from(u32::MAX);
    assert_ne!(u64::from(wide.totals.scanned_entries), added);
    assert_ne!(u64::from(wide.totals.skipped_entries), added);
    assert_ne!(u64::from(wide.counts.findings), added);
    assert_eq!(
        u64::from(wide.totals.scanned_entries) + u64::from(wide.totals.skipped_entries),
        added
    );
    assert_ne!(
        logical_sum(&wide_report),
        37,
        "source totals must not become a finding sum"
    );
    assert!(wide_json.contains("\"logical_bytes\":\"37\""));
    assert!(!wide_json.contains("9007199254741003"));

    let (composite_report, composite) = summarize_case("composite_partial");
    assert_eq!(
        composite.totals.logical_bytes.map(|count| count.get()),
        Some(37)
    );
    assert_ne!(
        logical_sum(&composite_report),
        37,
        "source totals must not become a finding sum"
    );
    assert_eq!(composite.totals, composite_report.totals);
    assert_ne!(base.counts.findings, base.totals.scanned_entries);
    assert_ne!(
        composite.counts.issues, composite.totals.scanned_entries,
        "issues are not scanned_entries"
    );
}

#[test]
fn export_counts_and_status() {
    let cases = golden_cases();
    assert_eq!(cases.len(), 11);
    for case in &cases {
        let report =
            parse_report(&case.input).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        let export =
            summarize_report(&report).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        assert_eq!(
            export.counts.scopes,
            u32::try_from(report.scopes.len()).unwrap(),
            "{}",
            case.id
        );
        assert_eq!(
            export.counts.findings,
            u32::try_from(report.findings.len()).unwrap(),
            "{}",
            case.id
        );
        assert_eq!(
            export.counts.issues,
            u32::try_from(report.issues.len()).unwrap(),
            "{}",
            case.id
        );
        assert_eq!(export.risk_counts, count_risks(&report), "{}", case.id);
        assert_eq!(
            export.category_counts,
            count_categories(&report),
            "{}",
            case.id
        );
        assert_eq!(export.status, report.status, "{}", case.id);
        assert_eq!(
            export.totals.scanned_entries, report.totals.scanned_entries,
            "{}",
            case.id
        );
        assert_eq!(
            export.totals.skipped_entries, report.totals.skipped_entries,
            "{}",
            case.id
        );
        let risk_total = [
            export.risk_counts.low,
            export.risk_counts.review,
            export.risk_counts.high,
            export.risk_counts.protected,
        ]
        .into_iter()
        .try_fold(0_u32, |sum, item| sum.checked_add(item))
        .unwrap();
        let category_total = [
            export.category_counts.download_cache,
            export.category_counts.build_cache,
            export.category_counts.environment,
            export.category_counts.model,
            export.category_counts.experiment,
            export.category_counts.history,
            export.category_counts.database,
            export.category_counts.credential,
            export.category_counts.source,
            export.category_counts.temporary,
            export.category_counts.unknown,
        ]
        .into_iter()
        .try_fold(0_u32, |sum, item| sum.checked_add(item))
        .unwrap();
        assert_eq!(risk_total, export.counts.findings, "{}", case.id);
        assert_eq!(category_total, export.counts.findings, "{}", case.id);
    }

    let (_, empty) = summarize_case("empty_completed");
    let empty_json = serde_json::to_string(&empty).unwrap();
    assert_eq!(empty.status, ScanStatus::Completed);
    assert_eq!(empty.counts.findings, 0);
    assert_eq!(empty.counts.issues, 0);
    assert_eq!(empty.counts.scopes, 1);
    for bucket in [
        empty.risk_counts.low,
        empty.risk_counts.review,
        empty.risk_counts.high,
        empty.risk_counts.protected,
        empty.category_counts.download_cache,
        empty.category_counts.build_cache,
        empty.category_counts.environment,
        empty.category_counts.model,
        empty.category_counts.experiment,
        empty.category_counts.history,
        empty.category_counts.database,
        empty.category_counts.credential,
        empty.category_counts.source,
        empty.category_counts.temporary,
        empty.category_counts.unknown,
    ] {
        assert_eq!(bucket, 0, "zero buckets stay present");
    }
    assert!(empty_json.contains("\"high\":0"));
    assert!(empty_json.contains("\"credential\":0"));
    assert!(empty_json.contains("\"unknown\":0"));

    let (_, wide) = summarize_case("all-categories-canary");
    assert_eq!(wide.status, ScanStatus::Completed);
    assert!(wide.risk_counts.low > 0);
    assert!(wide.risk_counts.review > 0);
    assert!(wide.risk_counts.high > 0);
    assert!(wide.risk_counts.protected > 0);
    for bucket in [
        wide.category_counts.download_cache,
        wide.category_counts.build_cache,
        wide.category_counts.environment,
        wide.category_counts.model,
        wide.category_counts.experiment,
        wide.category_counts.history,
        wide.category_counts.database,
        wide.category_counts.credential,
        wide.category_counts.source,
        wide.category_counts.temporary,
        wide.category_counts.unknown,
    ] {
        assert!(bucket > 0, "all eleven categories are counted");
    }

    let (_, partial) = summarize_case("composite_partial");
    assert_eq!(partial.status, ScanStatus::Partial);
    assert!(partial.counts.findings > 0);
    assert!(partial.counts.issues > 0);

    let (cancelled_report, cancelled) = summarize_case("cancelled");
    assert_eq!(cancelled.status, ScanStatus::Cancelled);
    assert!(cancelled.counts.findings > 0);
    assert_eq!(cancelled.counts.issues, 1);
    assert_eq!(cancelled_report.totals.skipped_entries, 0);
    assert_ne!(
        cancelled.counts.issues, cancelled.totals.skipped_entries,
        "issues are not skipped_entries"
    );
    assert_ne!(
        cancelled.counts.findings, cancelled.totals.scanned_entries,
        "findings are not scanned_entries"
    );
}

#[test]
fn export_invariance_and_purity() {
    let case = golden("composite_partial");
    let source = parse_report(&case.input).expect("composite parses");
    let before = source.clone();
    let first = summarize_report(&source).unwrap();
    let second = summarize_report(&source).unwrap();
    assert_eq!(source, before, "summarize_report changed its input");
    assert_eq!(first, second, "repeated summary is not stable");
    assert_eq!(summarize_json(&case.input).unwrap(), first);

    let mut renamed = source.clone();
    retarget(&mut renamed);
    assert_ne!(renamed.scan_id, source.scan_id);
    assert_ne!(renamed.scopes[0].label, source.scopes[0].label);
    assert_ne!(
        renamed.findings[0].finding_id,
        source.findings[0].finding_id
    );
    validate_report(&renamed).unwrap_or_else(|error| panic!("retarget: {error}"));
    let renamed_export = summarize_report(&renamed).unwrap();
    assert_eq!(
        renamed_export, first,
        "consistent ids, text, and tool fields must not change the summary"
    );
    let renamed_json = serde_json::to_string(&renamed_export).unwrap();
    assert!(!renamed_json.contains("scan-retargeted"));
    assert!(!renamed_json.contains("Label "));
    assert!(!renamed_json.contains("Evidence "));
    assert!(!renamed_json.contains("tool-b"));
    assert!(!renamed_json.contains("Issue "));
    assert_eq!(
        summarize_json(&water_contracts::v1::to_json(&renamed).unwrap()).unwrap(),
        first
    );

    let mut reordered = source.clone();
    reorder(&mut reordered);
    assert_ne!(
        reordered.findings[0].finding_id,
        source.findings[0].finding_id
    );
    assert_ne!(reordered.scopes[0].scope_id, source.scopes[0].scope_id);
    validate_report(&reordered).unwrap_or_else(|error| panic!("reorder: {error}"));
    assert_eq!(
        summarize_report(&reordered).unwrap(),
        first,
        "array order must not change the summary"
    );

    let (_, empty) = summarize_case("empty_completed");
    assert_eq!(empty.counts.findings, 0);
    assert_eq!(empty.counts.issues, 0);
    assert_eq!(empty.status, ScanStatus::Completed);
}
