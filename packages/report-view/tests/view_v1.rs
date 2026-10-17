//! Synthetic projection checks. This target reads frozen fixtures only.
#![forbid(unsafe_code)]

use std::collections::{BTreeSet, HashSet};

use serde_json::Value;
use water_contracts::v1::{
    ByteCount, Category, ContractError, ContractErrorCode, OpaqueId, Risk, ScanReport, ScanStatus,
    parse_report, validate_report,
};
use water_report_view::v1::{FindingView, ReportView, project_json, project_report};

const VIEW_CASES: &str = include_str!("../../../contracts/report-view-v1/cases.json");
const CONTRACT_CASES: &str = include_str!("../../../contracts/v1/conformance-cases.json");
const CONTRACT_BASE: &str = include_str!("../../../contracts/v1/examples/valid-report.json");

struct GoldenRaw {
    id: String,
    input: String,
    expected: String,
}

fn view_cases() -> Value {
    serde_json::from_str(VIEW_CASES).expect("frozen view cases must be JSON")
}

fn contract_cases() -> Value {
    serde_json::from_str(CONTRACT_CASES).expect("frozen contract cases must be JSON")
}

fn contract_base() -> Value {
    serde_json::from_str(CONTRACT_BASE).expect("frozen contract base must be JSON")
}

fn code_name(code: &ContractErrorCode) -> String {
    format!("{code:?}")
}

fn rendered(error: &ContractError) -> String {
    format!("{error} {error:?}")
}

fn skip_ws(bytes: &[u8], mut index: usize) -> usize {
    while index < bytes.len() && matches!(bytes[index], b' ' | b'\t' | b'\n' | b'\r') {
        index += 1;
    }
    index
}

fn skip_string(bytes: &[u8], start: usize) -> usize {
    assert_eq!(bytes[start], b'"', "json string at {start}");
    let mut index = start + 1;
    while index < bytes.len() {
        match bytes[index] {
            b'"' => return index + 1,
            b'\\' => {
                index += 1;
                assert!(index < bytes.len(), "truncated json escape");
                if bytes[index] == b'u' {
                    index += 5;
                } else {
                    index += 1;
                }
            }
            _ => index += 1,
        }
    }
    panic!("unterminated json string");
}

fn skip_value(bytes: &[u8], start: usize) -> usize {
    let index = skip_ws(bytes, start);
    match bytes[index] {
        b'"' => skip_string(bytes, index),
        b'{' => skip_container(bytes, index, b'{', b'}'),
        b'[' => skip_container(bytes, index, b'[', b']'),
        b't' => {
            assert_eq!(&bytes[index..index + 4], b"true");
            index + 4
        }
        b'f' => {
            assert_eq!(&bytes[index..index + 5], b"false");
            index + 5
        }
        b'n' => {
            assert_eq!(&bytes[index..index + 4], b"null");
            index + 4
        }
        b'-' | b'0'..=b'9' => {
            let mut end = index + 1;
            while end < bytes.len()
                && matches!(bytes[end], b'0'..=b'9' | b'.' | b'e' | b'E' | b'+' | b'-')
            {
                end += 1;
            }
            end
        }
        other => panic!("unsupported json value {}", other as char),
    }
}

fn skip_container(bytes: &[u8], start: usize, open: u8, close: u8) -> usize {
    assert_eq!(bytes[start], open);
    let mut index = skip_ws(bytes, start + 1);
    if bytes[index] == close {
        return index + 1;
    }
    loop {
        if open == b'{' {
            index = skip_string(bytes, index);
            index = skip_ws(bytes, index);
            assert_eq!(bytes[index], b':');
            index += 1;
        }
        index = skip_value(bytes, index);
        index = skip_ws(bytes, index);
        if bytes[index] == close {
            return index + 1;
        }
        assert_eq!(bytes[index], b',');
        index = skip_ws(bytes, index + 1);
    }
}

fn json_text(bytes: &[u8], start: usize, end: usize) -> String {
    std::str::from_utf8(&bytes[start..end])
        .expect("fixture slice is utf-8")
        .to_owned()
}

fn decode_string(bytes: &[u8], start: usize, end: usize) -> String {
    serde_json::from_str(&json_text(bytes, start, end)).expect("json string")
}

fn golden_raw() -> Vec<GoldenRaw> {
    let bytes = VIEW_CASES.as_bytes();
    let mut index = skip_ws(bytes, 0);
    assert_eq!(bytes[index], b'{');
    index = skip_ws(bytes, index + 1);
    loop {
        let key_start = index;
        index = skip_string(bytes, index);
        let key = decode_string(bytes, key_start, index);
        index = skip_ws(bytes, index);
        assert_eq!(bytes[index], b':');
        index = skip_ws(bytes, index + 1);
        if key == "golden_cases" {
            return parse_golden_array(bytes, index);
        }
        index = skip_value(bytes, index);
        index = skip_ws(bytes, index);
        if bytes[index] == b'}' {
            break;
        }
        assert_eq!(bytes[index], b',');
        index = skip_ws(bytes, index + 1);
    }
    panic!("golden_cases is missing");
}

fn parse_golden_array(bytes: &[u8], start: usize) -> Vec<GoldenRaw> {
    assert_eq!(bytes[start], b'[');
    let mut index = skip_ws(bytes, start + 1);
    let mut cases = Vec::new();
    if bytes[index] == b']' {
        return cases;
    }
    loop {
        cases.push(parse_golden_object(bytes, index));
        index = skip_value(bytes, index);
        index = skip_ws(bytes, index);
        if bytes[index] == b']' {
            return cases;
        }
        assert_eq!(bytes[index], b',');
        index = skip_ws(bytes, index + 1);
    }
}

fn parse_golden_object(bytes: &[u8], start: usize) -> GoldenRaw {
    assert_eq!(bytes[start], b'{');
    let mut index = skip_ws(bytes, start + 1);
    let mut id = None;
    let mut input = None;
    let mut expected = None;
    if bytes[index] != b'}' {
        loop {
            let key_start = index;
            index = skip_string(bytes, index);
            let key = decode_string(bytes, key_start, index);
            index = skip_ws(bytes, index);
            assert_eq!(bytes[index], b':');
            let value_start = skip_ws(bytes, index + 1);
            let value_end = skip_value(bytes, value_start);
            let raw = json_text(bytes, value_start, value_end);
            match key.as_str() {
                "id" => id = Some(decode_string(bytes, value_start, value_end)),
                "input" => input = Some(raw),
                "expected" => expected = Some(raw),
                _ => {}
            }
            index = skip_ws(bytes, value_end);
            if bytes[index] == b'}' {
                break;
            }
            assert_eq!(bytes[index], b',');
            index = skip_ws(bytes, index + 1);
        }
    }
    GoldenRaw {
        id: id.expect("golden id"),
        input: input.expect("golden input"),
        expected: expected.expect("golden expected"),
    }
}

fn key_orders(json: &str) -> Vec<Vec<String>> {
    let mut orders = Vec::new();
    let end = collect_key_orders(json.as_bytes(), 0, &mut orders);
    assert_eq!(skip_ws(json.as_bytes(), end), json.len());
    orders
}

fn collect_key_orders(bytes: &[u8], start: usize, orders: &mut Vec<Vec<String>>) -> usize {
    let index = skip_ws(bytes, start);
    match bytes[index] {
        b'{' => collect_object_keys(bytes, index, orders),
        b'[' => {
            let mut index = skip_ws(bytes, index + 1);
            if bytes[index] == b']' {
                return index + 1;
            }
            loop {
                index = collect_key_orders(bytes, index, orders);
                index = skip_ws(bytes, index);
                if bytes[index] == b']' {
                    return index + 1;
                }
                assert_eq!(bytes[index], b',');
                index = skip_ws(bytes, index + 1);
            }
        }
        _ => skip_value(bytes, index),
    }
}

fn collect_object_keys(bytes: &[u8], start: usize, orders: &mut Vec<Vec<String>>) -> usize {
    let mut index = skip_ws(bytes, start + 1);
    let mut keys = Vec::new();
    if bytes[index] == b'}' {
        orders.push(keys);
        return index + 1;
    }
    loop {
        let key_start = index;
        index = skip_string(bytes, index);
        keys.push(decode_string(bytes, key_start, index));
        index = skip_ws(bytes, index);
        assert_eq!(bytes[index], b':');
        index = collect_key_orders(bytes, index + 1, orders);
        index = skip_ws(bytes, index);
        if bytes[index] == b'}' {
            orders.push(keys);
            return index + 1;
        }
        assert_eq!(bytes[index], b',');
        index = skip_ws(bytes, index + 1);
    }
}

fn assert_same_json(actual: &str, expected: &str, context: &str) {
    let actual_value: Value = serde_json::from_str(actual).expect(context);
    let expected_value: Value = serde_json::from_str(expected).expect(context);
    assert_eq!(actual_value, expected_value, "{context}: projected value");
    assert_eq!(
        key_orders(actual),
        key_orders(expected),
        "{context}: field order"
    );
}

fn golden(id: &str) -> GoldenRaw {
    golden_raw()
        .into_iter()
        .find(|case| case.id == id)
        .unwrap_or_else(|| panic!("missing golden {id}"))
}

fn project_golden(id: &str) -> (ScanReport, ReportView) {
    let case = golden(id);
    let report = parse_report(&case.input).unwrap_or_else(|error| panic!("{id}: {error}"));
    let view = project_json(&case.input).unwrap_or_else(|error| panic!("{id}: {error}"));
    assert_eq!(
        project_report(&report).unwrap(),
        view,
        "{id}: entries differ"
    );
    (report, view)
}

fn finding<'a>(view: &'a ReportView, id: &str) -> &'a FindingView {
    view.findings
        .iter()
        .find(|item| item.id.as_str() == id)
        .unwrap_or_else(|| panic!("missing finding {id}"))
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
    let projected = project_json(input);
    let parsed_error = parsed.expect_err(context);
    let projected_error = projected.expect_err(context);
    assert_eq!(
        projected_error, parsed_error,
        "{context}: error must come from A"
    );
    assert_eq!(
        code_name(&projected_error.code),
        expected,
        "{context}: code"
    );
    assert!(
        !rendered(&projected_error).contains("DO_NOT_ECHO_CANARY_7f98"),
        "{context}: error echoed input"
    );
}

fn fresh_base() -> ScanReport {
    let case = golden("base");
    parse_report(&case.input).expect("base golden parses")
}

fn mutate_constructed(report: &mut ScanReport, id: &str) {
    match id {
        "model_without_protection" => {
            assert_eq!(report.findings[0].risk, Risk::Review);
            report.findings[0].category = Category::Model;
        }
        "non_null_reclaimable" => {
            report.findings[0].size.reclaimable_lower_bytes = Some(ByteCount::new(1));
        }
        "unknown_scope" => {
            report.findings[0].scope_id = OpaqueId::new("missing-scope").expect("id syntax");
        }
        "inconsistent_status" => {
            assert!(report.issues.is_empty());
            assert!(report.totals.coverage_complete);
            report.status = ScanStatus::Partial;
        }
        _ => panic!("unknown constructed mutation: {id}"),
    }
}

#[test]
fn view_projection() {
    let cases = golden_raw();
    assert_eq!(cases.len(), 4);
    let parsed = view_cases();
    for (index, case) in cases.iter().enumerate() {
        let embedded = &parsed["golden_cases"][index];
        assert_eq!(case.id, embedded["id"].as_str().unwrap());
        assert_eq!(
            serde_json::from_str::<Value>(&case.input).unwrap(),
            embedded["input"]
        );
        assert_eq!(
            serde_json::from_str::<Value>(&case.expected).unwrap(),
            embedded["expected"]
        );
        let report =
            parse_report(&case.input).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        let from_json =
            project_json(&case.input).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        let from_dto =
            project_report(&report).unwrap_or_else(|error| panic!("{}: {error}", case.id));
        assert_eq!(from_json, from_dto, "{}: public entries differ", case.id);
        assert_eq!(from_json.view_version, "water.report-view.v1");
        assert!(from_json.read_only, "{}: view stays read only", case.id);
        let actual = serde_json::to_string(&from_json).unwrap();
        assert_same_json(&actual, &case.expected, &case.id);
    }
}

#[test]
fn view_validation() {
    let contracts = contract_cases();
    let reports = contracts["cases"].as_array().unwrap();
    assert_eq!(reports.len(), 66);
    for case in reports {
        let id = case["id"].as_str().unwrap();
        let mut value = contract_base();
        for operation in case["operations"].as_array().unwrap() {
            patch(&mut value, operation);
        }
        let input = serde_json::to_string(&value).unwrap();
        let expected = case["expected"].as_str().unwrap();
        if expected == "ok" {
            let report = parse_report(&input).unwrap_or_else(|error| panic!("{id}: {error}"));
            let view = project_json(&input).unwrap_or_else(|error| panic!("{id}: {error}"));
            assert_eq!(
                view.findings.len(),
                report.findings.len(),
                "{id}: finding count"
            );
            assert_eq!(project_report(&report).unwrap(), view, "{id}: dto entry");
        } else {
            assert_rejected(&input, expected, id);
        }
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

    let view_raw = view_cases()["raw_cases"].as_array().cloned().unwrap();
    assert_eq!(view_raw.len(), 6);
    let mut raw_ids = BTreeSet::new();
    for case in &view_raw {
        let id = case["id"].as_str().unwrap();
        raw_ids.insert(id.to_owned());
        let input = case["input"].as_str().unwrap();
        if id == "canary_enum" {
            assert!(input.contains("DO_NOT_ECHO_CANARY_7f98"));
        }
        assert_rejected(input, case["code"].as_str().unwrap(), id);
    }
    assert!(raw_ids.contains("bad_json"));
    assert!(raw_ids.contains("duplicate_schema"));
    assert!(raw_ids.contains("object_enum"));
    assert!(raw_ids.contains("canary_enum"));

    let constructed = view_cases()["constructed_cases"]
        .as_array()
        .cloned()
        .unwrap();
    assert_eq!(constructed.len(), 4);
    let mut seen = BTreeSet::new();
    for case in &constructed {
        let id = case["id"].as_str().unwrap();
        assert!(seen.insert(id.to_owned()), "{id}: constructed case reused");
        let mut report = fresh_base();
        mutate_constructed(&mut report, id);
        let expected = validate_report(&report).expect_err(id);
        let projected = project_report(&report);
        assert!(
            projected.is_err(),
            "{id}: illegal DTO must fail view_validation"
        );
        let actual = projected.expect_err(id);
        assert_eq!(
            actual, expected,
            "{id}: dto error must equal validate_report"
        );
        assert_eq!(
            code_name(&actual.code),
            case["code"].as_str().unwrap(),
            "{id}"
        );
        assert!(!rendered(&actual).contains("DO_NOT_ECHO_CANARY_7f98"));
    }
}

#[test]
fn view_precision_and_totals() {
    let (report, view) = project_golden("composite_partial");
    let json = serde_json::to_string(&view).unwrap();
    let zero = finding(&view, "zero");
    let boundary = finding(&view, "big-after");
    let beyond = finding(&view, "big-before");
    let max = finding(&view, "max");
    let unknown_first = finding(&view, "unknown-first");
    let unknown_last = finding(&view, "unknown-last");

    assert_eq!(zero.logical_bytes.as_ref().map(ByteCount::get), Some(0));
    assert_eq!(
        boundary.logical_bytes.as_ref().map(ByteCount::get),
        Some(1_u64 << 53)
    );
    assert_eq!(
        beyond.logical_bytes.as_ref().map(ByteCount::get),
        Some((1_u64 << 53) + 1),
        "2^53+1 must not pass through f64"
    );
    assert_eq!(
        max.logical_bytes.as_ref().map(ByteCount::get),
        Some(u64::MAX)
    );
    assert!(unknown_first.logical_bytes.is_none());
    assert!(unknown_last.logical_bytes.is_none());
    for item in [
        &zero,
        &boundary,
        &beyond,
        &max,
        &unknown_first,
        &unknown_last,
    ] {
        assert_eq!(item.logical_bytes, item.size.logical_bytes);
        assert!(item.size.reclaimable_lower_bytes.is_none());
        assert!(item.size.reclaimable_upper_bytes.is_none());
    }
    assert!(
        json.contains("\"logical_bytes\":\"9007199254740993\""),
        "2^53+1 must serialize as a decimal string"
    );
    assert!(json.contains("\"logical_bytes\":\"9007199254740992\""));
    assert!(json.contains("\"logical_bytes\":\"18446744073709551615\""));
    assert!(json.contains("\"logical_bytes\":\"0\""));
    assert!(json.contains("\"logical_bytes\":null"));

    assert_eq!(view.totals, report.totals);
    assert_eq!(
        view.totals.logical_bytes.as_ref().map(ByteCount::get),
        Some(37)
    );
    let summed: u128 = view
        .findings
        .iter()
        .filter_map(|item| {
            item.logical_bytes
                .as_ref()
                .map(|count| u128::from(count.get()))
        })
        .sum();
    assert_ne!(summed, 37, "source totals must not become a finding sum");
    assert_eq!(view.findings.len(), 8);

    let (_, base) = project_golden("base");
    assert!(
        base.totals.logical_bytes.is_none(),
        "unknown source totals.logical_bytes must stay null"
    );
}

#[test]
fn view_preservation_and_purity() {
    let cases = golden_raw();
    assert_eq!(cases.len(), 4);
    for case in &cases {
        let before = parse_report(&case.input).unwrap();
        let report = before.clone();
        let first = project_report(&report).unwrap();
        assert_eq!(report, before, "{}: input changed", case.id);
        let second = project_report(&report).unwrap();
        assert_eq!(first, second, "{}: repeated projection", case.id);
        assert_eq!(project_json(&case.input).unwrap(), first, "{}", case.id);
        assert_eq!(first.scopes, report.scopes);
        assert_eq!(first.issues, report.issues);
        assert_eq!(first.totals, report.totals);
        assert_eq!(first.status, report.status);
        assert_eq!(first.source_schema_version, report.schema_version);
        assert_eq!(first.scan_id, report.scan_id);
        assert_eq!(first.findings.len(), report.findings.len());
        for (projected, source) in first.findings.iter().zip(&report.findings) {
            assert_eq!(projected.id, source.finding_id);
            assert_eq!(projected.scope_id, source.scope_id);
            assert_eq!(projected.relative_path, source.relative_path);
            assert_eq!(projected.source_tool, source.tool);
            assert_eq!(projected.rule_version, source.rule_version);
            assert_eq!(projected.category, source.category);
            assert_eq!(projected.risk, source.risk);
            assert_eq!(projected.recoverability, source.recoverability);
            assert_eq!(projected.activity, source.activity);
            assert_eq!(projected.confidence, source.confidence);
            assert_eq!(projected.evidence_items, source.evidence);
            assert_eq!(projected.protection_reasons, source.protection_reasons);
            assert_eq!(projected.references, source.references);
            assert_eq!(projected.size, source.size);
            assert_eq!(projected.logical_bytes, source.size.logical_bytes);
            let joined = source
                .evidence
                .iter()
                .map(|item| item.summary.as_str())
                .collect::<Vec<_>>()
                .join("\n");
            assert_eq!(projected.evidence, joined);
        }
    }

    let (_, composite) = project_golden("composite_partial");
    let root = finding(&composite, "scope-root");
    assert_eq!(root.relative_path.as_str(), "");
    assert_eq!(root.title, "Fixture B");
    let left = finding(&composite, "big-before");
    let right = finding(&composite, "duplicate-title");
    assert_eq!(left.relative_path.as_str(), "same/path");
    assert_eq!(right.relative_path.as_str(), "same/path");
    assert_ne!(left.scope_id, right.scope_id);
    assert_ne!(left.id, right.id);

    let (_, empty) = project_golden("empty_completed");
    assert!(
        empty.findings.is_empty(),
        "empty findings must not be invented"
    );
}

#[test]
fn view_mapping_edges() {
    let (_, view) = project_golden("composite_partial");
    let absent = finding(&view, "zero");
    let real_all = finding(&view, "big-before");
    let real_unknown = finding(&view, "big-after");
    let real_no_tool = finding(&view, "max");
    assert!(absent.source_tool.is_none());
    assert_eq!(absent.tool_id, "no_tool");
    assert_eq!(absent.tool_name, "Unknown tool");
    assert_eq!(real_all.tool_id, "tool:all");
    assert_eq!(
        real_all
            .source_tool
            .as_ref()
            .map(|tool| tool.tool_id.as_str()),
        Some("all")
    );
    assert_eq!(real_unknown.tool_id, "tool:unknown");
    assert_eq!(real_no_tool.tool_id, "tool:no_tool");
    let keys: BTreeSet<&str> = view
        .findings
        .iter()
        .map(|item| item.tool_id.as_str())
        .collect();
    assert!(keys.contains("no_tool"));
    assert!(keys.contains("tool:all"));
    assert!(keys.contains("tool:unknown"));
    assert!(keys.contains("tool:no_tool"));
    assert!(!keys.contains("all"));
    assert_ne!(
        keys.get("no_tool").copied(),
        keys.get("tool:no_tool").copied()
    );

    let risks: HashSet<_> = view.findings.iter().map(|item| item.risk).collect();
    let activities: HashSet<_> = view.findings.iter().map(|item| item.activity).collect();
    let recoverability: HashSet<_> = view
        .findings
        .iter()
        .map(|item| item.recoverability)
        .collect();
    assert_eq!(risks.len(), 4);
    assert_eq!(activities.len(), 4);
    assert_eq!(recoverability.len(), 5);

    let literal = finding(&view, "max");
    let title = "project/模型 %2e%2e/<tag>";
    assert_eq!(literal.title, title);
    assert_eq!(literal.relative_path.as_str(), title);
    assert!(!literal.title.contains(".."));
    assert_eq!(
        literal.evidence,
        "<script>literal text</script>\nUnicode 模型 and %2e%2e stay literal"
    );
    assert_eq!(
        finding(&view, "unknown-last").tool_name,
        "<img src=x onerror=literal>"
    );
    let serialized = serde_json::to_string(&view).unwrap();
    assert!(serialized.contains("<script>literal text</script>"));
    assert!(serialized.contains("%2e%2e"));
    assert!(!serialized.contains("&lt;"));
}
