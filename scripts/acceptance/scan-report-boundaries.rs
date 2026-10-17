// Controller-only independent G checks; synthetic memory, no filesystem IO.
#![forbid(unsafe_code)]
use serde_json::{Value, json};
use water_contracts::v1::{OpaqueId, Platform, ProtectionReason, ScopeOrigin, parse_report, to_json};
use water_scan_report::v1::{AssemblyErrorCode, ReportContext, ScopeContext, assemble_json};
fn entry(path: &str, bytes: Option<&str>) -> Value {
    json!({"relative_path":path,"depth":path.split('/').count(),"kind":if bytes.is_some(){"file"}else{"directory"},"logical_bytes":bytes,"allocated_bytes":null,"identity":{"kind":"unknown","device":null,"inode":null,"link_count":null}})
}
fn source() -> (Value, ReportContext) {
    let entries = vec![entry("ab/deep", Some("9007199254740993")), entry("a", None), entry("ab", None), entry("a.z", Some("0")), entry("a/n", Some("18446744073709551615")), entry("cache/模型 %2e%2e/<tag>", Some("7"))];
    let facts = json!({"facts_version":"water.scan-lab.v1","run_id":"run-controller-g","case_id":"controller-g-unlisted","status":"partial","visited_entries":7,"recorded_entries":6,"scopes":[{"scope_id":"s1","relative_root":"scope/nested","coverage":"partial","visited_entries":7,"entries":entries,"issues":[{"code":"io_error","relative_path":"absent","origin":"injected","operation":"inspect"}]}]});
    let context = ReportContext { scan_id: OpaqueId::new("controller-g").unwrap(), platform: Platform::Windows, scopes: vec![ScopeContext { scope_id: OpaqueId::new("s1").unwrap(), label:"非golden合成scope".into(), origin:ScopeOrigin::UserSelected }] };
    (facts, context)
}
fn reject(facts: &Value, context: &ReportContext) {
    let err = assemble_json(&facts.to_string(), context).unwrap_err();
    assert_eq!(err.code, AssemblyErrorCode::InvalidFacts); assert_eq!(err.field, "/facts");
    assert!(!format!("{err:?} {err}").contains("CONTROLLER_CANARY"));
}
fn object_paths(v: &Value, prefix: String, result: &mut Vec<String>) {
    match v {
        Value::Object(map) => { result.push(prefix.clone()); for (key, child) in map { object_paths(child, format!("{prefix}/{key}"), result); } }
        Value::Array(values) => for (i, child) in values.iter().enumerate() { object_paths(child, format!("{prefix}/{i}"), result); },
        _ => {}
    }
}
#[test]
fn g_independent_mapping_segments_and_complete_sidecar() {
    let (facts, context) = source(); let text = facts.to_string(); let before = context.clone();
    let bundle = assemble_json(&text, &context).unwrap();
    assert_eq!(bundle.source_facts(), &facts); assert_eq!(context, before); assert_eq!(text, facts.to_string());
    let report = bundle.report(); assert_eq!(report.findings.len(), 6);
    assert_eq!(report.totals.scanned_entries, 6); assert_eq!(report.totals.skipped_entries, 1);
    assert!(report.totals.logical_bytes.is_none() && report.totals.allocated_bytes.is_none());
    assert_eq!(report.issues[0].message, "Scan lab issue; origin=injected; operation=inspect.");
    for (i, f) in report.findings.iter().enumerate() {
        assert_eq!(f.finding_id.as_str(), format!("entry-{}", i + 1));
        assert_eq!(serde_json::to_value(f.risk).unwrap(), "protected");
        assert_eq!(serde_json::to_value(f.category).unwrap(), "unknown");
        assert_eq!(f.protection_reasons.contains(&ProtectionReason::ProtectedDescendant), [1,2].contains(&i));
    }
    assert_eq!(report.findings[0].size.logical_bytes.unwrap().get(), 9007199254740993);
    assert_eq!(report.findings[4].size.logical_bytes.unwrap().get(), u64::MAX);
    assert_eq!(&parse_report(&to_json(report).unwrap()).unwrap(), report);
}
#[test]
fn g_every_object_rejects_missing_duplicate_unknown_and_positional_forms() {
    let (facts, context) = source(); let mut paths = Vec::new(); object_paths(&facts, "".into(), &mut paths);
    let text = facts.to_string(); let mut checks = 0;
    for path in paths {
        let object = facts.pointer(&path).unwrap().as_object().unwrap();
        for (key, value) in object {
            let mut missing = facts.clone(); missing.pointer_mut(&path).unwrap().as_object_mut().unwrap().remove(key); reject(&missing, &context); checks += 1;
            let original = serde_json::to_string(facts.pointer(&path).unwrap()).unwrap();
            let duplicate = format!("{{{}:{},{}", serde_json::to_string(key).unwrap(), value, &original[1..]);
            let input = text.replacen(&original, &duplicate, 1);
            assert_ne!(input, text);
            let error = assemble_json(&input, &context).unwrap_err(); assert_eq!(error.code, AssemblyErrorCode::InvalidFacts); checks += 1;
        }
        let mut unknown = facts.clone(); unknown.pointer_mut(&path).unwrap().as_object_mut().unwrap().insert("extra".into(), "CONTROLLER_CANARY".into()); reject(&unknown, &context); checks += 1;
        let mut positional = facts.clone(); *positional.pointer_mut(&path).unwrap() = Value::Array(object.values().cloned().collect()); reject(&positional, &context); checks += 1;
    }
    assert!(checks > 150); eprintln!("recursive strict object assertions={checks}");
}
#[test]
fn g_identity_coverage_context_and_checked_counters() {
    let (facts, context) = source();
    for (pointer, value) in [
        ("/run_id",json!("run-controller\n")), ("/case_id",json!("1bad")), ("/scopes/0/relative_root",json!("")),
        ("/scopes/0/entries/0/depth",json!(1)), ("/scopes/0/entries/0/logical_bytes",json!("01")),
        ("/scopes/0/entries/0/allocated_bytes",json!("0")), ("/scopes/0/entries/0/identity/inode",json!("1")),
        ("/status",json!("completed")), ("/status",json!("cancelled")), ("/scopes/0/coverage",json!("complete")),
        ("/scopes/0/coverage",json!("cancelled")), ("/visited_entries",json!(4294967295u32)), ("/recorded_entries",json!(7)),
        ("/scopes/0/visited_entries",json!(0)), ("/scopes/0/issues/0/origin",json!({"native":null})),
    ] { let mut v = facts.clone(); *v.pointer_mut(pointer).unwrap() = value; reject(&v, &context); }
    let mut unix = facts.clone(); unix["scopes"][0]["entries"][0]["identity"] = json!({"kind":"unix","device":"18446744073709551615","inode":"9007199254740993","link_count":"2"});
    reject(&unix, &context);
    let mut mac = context.clone(); mac.platform = Platform::Macos;
    let bundle = assemble_json(&unix.to_string(), &mac).unwrap(); assert_eq!(bundle.source_facts(), &unix);
    for (key, value) in [("inode",json!("0")), ("link_count",json!("0")), ("device",Value::Null)] {
        let mut v = unix.clone(); v["scopes"][0]["entries"][0]["identity"][key] = value; reject(&v, &mac);
    }
    let mut wrong = context.clone(); wrong.scopes[0].label = "🧪".repeat(80); assert!(assemble_json(&facts.to_string(), &wrong).is_ok());
    wrong.scopes[0].label.push('x'); assert_eq!(assemble_json(&facts.to_string(), &wrong).unwrap_err().code, AssemblyErrorCode::InvalidContext);
    let mut empty = context.clone(); empty.scopes.clear(); assert_eq!(assemble_json(&facts.to_string(), &empty).unwrap_err().code, AssemblyErrorCode::InvalidContext);
}
#[test]
fn g_output_limit_does_not_truncate_valid_facts() {
    let (mut facts, context) = source();
    facts["scopes"][0]["entries"] = (0..4000).map(|i| entry(&format!("leaf-{i}-{}", "x".repeat(1600)), Some("1"))).collect::<Vec<_>>().into();
    facts["recorded_entries"] = 4000.into(); facts["visited_entries"] = 4000.into(); facts["scopes"][0]["visited_entries"] = 4000.into();
    let text = facts.to_string(); assert!(text.len() <= 8_388_608);
    let error = assemble_json(&text, &context).unwrap_err(); assert_eq!(error.code, AssemblyErrorCode::ReportRejected); assert_eq!(error.field, "/report");
    eprintln!("bounded facts bytes={}", text.len());
}
