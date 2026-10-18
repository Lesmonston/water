// Controller-owned API checks. Inputs are memory data or retained synthetic J JSON.
use serde_json::{Value, json};
use water_contracts::v1::{OpaqueId, Platform};
use water_project_evidence::v1 as l;
use water_scan_report::v1::{ReportContext, ScopeContext, assemble_json};
use water_size_ledger::v1 as m;

fn context(value: &Value) -> ReportContext {
    ReportContext {
        scan_id: OpaqueId::new(value["scan_id"].as_str().unwrap()).unwrap(),
        platform: serde_json::from_value(value["platform"].clone()).unwrap(),
        scopes: value["scopes"].as_array().unwrap().iter().map(|s| ScopeContext {
            scope_id: OpaqueId::new(s["scope_id"].as_str().unwrap()).unwrap(),
            label: s["label"].as_str().unwrap().to_owned(),
            origin: serde_json::from_value(s["origin"].clone()).unwrap(),
        }).collect(),
    }
}
fn unknown() -> Value { json!({"kind":"unknown","device":null,"inode":null,"link_count":null}) }
fn unix(device: u64, inode: u64, links: u64) -> Value {
    json!({"kind":"unix","device":device.to_string(),"inode":inode.to_string(),"link_count":links.to_string()})
}
fn entry(path: &str, kind: &str, length: u64, identity: Value) -> Value {
    json!({"relative_path":path,"depth":path.split('/').count(),"kind":kind,"logical_bytes":if kind=="file" {Some(length.to_string())}else{None},"allocated_bytes":null,"identity":identity})
}
fn input(scopes: Vec<Vec<Value>>, platform: Platform) -> (Value, ReportContext) {
    let count: usize = scopes.iter().map(Vec::len).sum();
    let value = json!({"facts_version":"water.scan-lab.v1","run_id":"run-controller-independent","case_id":"controller-independent","status":"completed","visited_entries":count,"recorded_entries":count,"scopes":scopes.into_iter().enumerate().map(|(i,entries)|json!({"scope_id":format!("scope-{}",i+1),"relative_root":format!("root-{}",i+1),"coverage":"complete","visited_entries":entries.len(),"entries":entries,"issues":[]})).collect::<Vec<_>>()});
    let ctx = ReportContext {scan_id:OpaqueId::new("controller-independent").unwrap(), platform, scopes:value["scopes"].as_array().unwrap().iter().map(|s|ScopeContext{scope_id:OpaqueId::new(s["scope_id"].as_str().unwrap()).unwrap(),label:"Controller synthetic scope".to_owned(),origin:water_contracts::v1::ScopeOrigin::UserSelected}).collect()};
    (value,ctx)
}
fn analyze(value: &Value, ctx: &ReportContext) -> (Value, Value) {
    let raw=value.to_string(); let before=ctx.clone();
    let evidence=l::analyze_json(&raw,ctx).unwrap();let ledger=m::analyze_json(&raw,ctx).unwrap();
    let a:Value=serde_json::from_str(&l::to_json(&evidence).unwrap()).unwrap();let b:Value=serde_json::from_str(&m::to_json(&ledger).unwrap()).unwrap();
    assert_eq!(a,serde_json::to_value(&evidence).unwrap());assert_eq!(b,serde_json::to_value(&ledger).unwrap());assert_eq!(*ctx,before);let g=assemble_json(&raw,ctx).unwrap();
    for output in [&a,&b] {assert_eq!(output["source_facts"],*value);assert_eq!(output["source_totals"],serde_json::to_value(&g.report().totals).unwrap());assert_eq!(output["read_only"],true);}
    assert!(g.report().findings.iter().all(|f| f.risk==water_contracts::v1::Risk::Protected&&f.category==water_contracts::v1::Category::Unknown));
    (a,b)
}

#[test]
fn independent_marker_kinds_paths_and_numbering() {
    let names=["package.json","package-lock.json","pyproject.toml","requirements.txt"];
    let mut entries=Vec::new();for (i,name) in names.iter().enumerate(){for (j,kind) in ["file","directory","link","other"].iter().enumerate(){entries.push(entry(&format!("模型/组{i}-{j}/{name}"),kind,17,unknown()));}}
    entries.push(entry("PACKAGE.JSON","file",1,unknown()));entries.push(entry("package.json.bak","file",1,unknown()));
    let (facts,ctx)=input(vec![entries],Platform::Windows);let (a,_)=analyze(&facts,&ctx);
    assert_eq!(a["counts"],json!({"scopes":1,"entries":18,"candidates":4,"non_file_marker_names":12}));
    assert_eq!(a["candidates"].as_array().unwrap().iter().map(|v|v["finding_id"].as_str().unwrap()).collect::<Vec<_>>(),["entry-1","entry-5","entry-9","entry-13"]);
    for (i,c) in a["candidates"].as_array().unwrap().iter().enumerate(){assert_eq!(c["parent_relative_path"],format!("模型/组{i}-0"));assert_eq!(c["evidence_strength"],"filename_only");for key in ["format_verified","tool_version_known","project_membership_verified"]{assert_eq!(c[key],false);}assert_eq!(c["action"],"display_only");assert_eq!(c["risk"],"protected");}
    let (facts,ctx)=input(vec![vec![entry("package.json","file",2,unknown())],vec![entry("package.json","file",2,unknown())]],Platform::Windows);let (a,b)=analyze(&facts,&ctx);
    assert_eq!(a["candidates"][0]["scope_id"],"scope-1");assert_eq!(a["candidates"][1]["scope_id"],"scope-2");assert_eq!(a["candidates"][1]["finding_id"],"entry-2");assert_eq!(a["candidates"][0]["parent_relative_path"],"");assert_eq!(b["observed_file_logical_bytes"],"4");assert!(b["identity_deduplicated_logical_bytes"].is_null());assert_eq!(b["unknown_identity_entries"].as_array().unwrap().len(),2);
}

#[test]
fn independent_integer_groups_and_conflicts() {
    let entries=vec![entry("first","file",u64::MAX,unix(2,9,2)),entry("alias","file",u64::MAX,unix(2,9,2)),entry("other-device","file",9007199254740992,unix(1,9,1)),entry("directory","directory",0,unix(1,9,99)),entry("unknown","file",9007199254740993,unknown())];
    let (facts,ctx)=input(vec![entries],Platform::Macos);let (_,b)=analyze(&facts,&ctx);
    assert_eq!(b["observed_file_logical_bytes"],(2*u128::from(u64::MAX)+18014398509481985).to_string());assert_eq!(b["known_identity_logical_bytes"],(u128::from(u64::MAX)+9007199254740992).to_string());assert_eq!(b["unknown_identity_observed_logical_bytes"],"9007199254740993");assert!(b["identity_deduplicated_logical_bytes"].is_null());assert_eq!(b["counts"]["known_identity_groups"],2);assert_eq!(b["counts"]["non_file_entries"],1);assert_eq!(b["identity_groups"][0]["device"],"2");assert_eq!(b["identity_groups"][1]["device"],"1");assert_eq!(b["identity_groups"][0]["entry_refs"],json!([{"finding_id":"entry-1","scope_id":"scope-1"},{"finding_id":"entry-2","scope_id":"scope-1"}]));assert_eq!(b["unknown_identity_entries"][0]["finding_id"],"entry-5");
    for links in [false,true]{let (facts,ctx)=input(vec![vec![entry("a","file",10,unix(1,7,2)),entry("b","file",if links {10}else{9},unix(1,7,if links {10}else{2}))]],Platform::Macos);let (_,b)=analyze(&facts,&ctx);assert_eq!(b["counts"]["conflicting_identity_groups"],1);assert_eq!(b["identity_groups"][0]["state"],"conflicting");for key in ["known_identity_logical_bytes","identity_deduplicated_logical_bytes"]{assert!(b[key].is_null());}assert_eq!(b["observed_set_identity_complete"],false);if links {assert_eq!(b["identity_groups"][0]["link_count_values"],json!(["2","10"]));}else{assert_eq!(b["identity_groups"][0]["logical_byte_values"],json!(["9","10"]));}}
}

#[test]
fn independent_call_scope_and_empty_observations() {
    for n in [0,1,17,9007199254740993,u64::MAX]{let (mut facts,mut ctx)=input(vec![vec![entry("package.json","file",n,unix(1,7,1))]],Platform::Macos);facts["run_id"]=format!("run-controller-{n}").into();ctx.scan_id=OpaqueId::new(format!("controller-{n}")).unwrap();let (a,b)=analyze(&facts,&ctx);assert_eq!(a["counts"]["candidates"],1);assert_eq!(b["identity_deduplicated_logical_bytes"],n.to_string());assert_eq!(b["counts"]["conflicting_identity_groups"],0);assert_eq!(b["observed_set_identity_complete"],true);assert!(b["volume_unique_allocated_bytes"].is_null());assert!(b["reclaimable_bytes"].is_null());}
    let (mut facts,ctx)=input(vec![vec![]],Platform::Windows);facts["status"]="cancelled".into();facts["scopes"][0]["coverage"]="cancelled".into();facts["scopes"][0]["issues"]=json!([{"code":"cancelled","relative_path":null,"origin":"control","operation":"cancel"}]);let (a,b)=analyze(&facts,&ctx);assert_eq!(a["counts"]["candidates"],0);assert_eq!(b["identity_deduplicated_logical_bytes"],"0");assert_eq!(b["observed_set_identity_complete"],true);assert_eq!(b["scope_coverage_complete"],false);assert_eq!(b["status"],"cancelled");
}

fn source_error(raw:&str,ctx:&ReportContext){let g=assemble_json(raw,ctx).unwrap_err();let le=l::analyze_json(raw,ctx).unwrap_err();let me=m::analyze_json(raw,ctx).unwrap_err();match &le{l::AnalysisError::Source(e)=>assert_eq!(e,&g),_=>panic!("L lost source error")};match &me{m::AnalysisError::Source(e)=>assert_eq!(e,&g),_=>panic!("M lost source error")};assert_eq!(le.to_string(),g.to_string());assert_eq!(me.to_string(),g.to_string());assert!(!format!("{le:?}{me:?}").contains("CONTROLLER_SECRET_CANARY"));}
#[test]
fn independent_raw_validation_and_source_errors(){let cases:Value=serde_json::from_str(include_str!("../../contracts/evidence-batch-v1/raw_inputs.json")).unwrap();for c in cases["source_errors"].as_array().unwrap(){source_error(c["input"].as_str().unwrap(),&context(&c["context"]));}let (mut value,ctx)=input(vec![vec![entry("a","file",1,unknown())]],Platform::Windows);source_error(&value.to_string().replace("\"logical_bytes\":\"1\"","\"logical_bytes\":\"1\",\"logical_bytes\":\"2\""),&ctx);value["CONTROLLER_SECRET_CANARY"]=true.into();source_error(&value.to_string(),&ctx);source_error(&" ".repeat(8388609),&ctx);}

fn main(){let bundle:Value=serde_json::from_str(include_str!("../../docs/acceptance/wave1/controller/w1-k-review-20261018/actual-j-regression-bundle.json")).unwrap();let mut outputs=Vec::new();for s in bundle["snapshots"].as_array().unwrap(){let ctx=context(&json!({"scan_id":s["report"]["scan_id"],"platform":s["report"]["scopes"][0]["platform"],"scopes":s["report"]["scopes"]}));let g=assemble_json(&s["source_facts"].to_string(),&ctx).unwrap();assert_eq!(serde_json::to_value(g.report()).unwrap(),s["report"]);let (evidence,ledger)=analyze(&s["source_facts"],&ctx);assert_eq!(evidence["source_totals"],s["view"]["totals"]);assert_eq!(ledger["source_totals"],s["view"]["totals"]);assert!(ledger["identity_deduplicated_logical_bytes"].is_null()||ledger["counts"]["file_entries"]==0);outputs.push(json!({"scan_id":s["view"]["scan_id"],"case_id":s["source_facts"]["case_id"],"evidence":evidence,"ledger":ledger}));}assert_eq!(outputs.len(),13);println!("{}",json!({"source":"retained actual J synthetic capture; not a fresh filesystem scan","captured_session_commit":"95704fee2710d778f0f822303ce4c084a279e940","physical_fixture_access":false,"cases":outputs}));}
