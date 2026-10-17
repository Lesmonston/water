// Actual F -> G -> A -> E/H, restricted to the controller's frozen synthetic index.
#![forbid(unsafe_code)]
use serde_json::{Value,json};
use water_contracts::v1::{OpaqueId,Platform,ScopeOrigin,parse_report,to_json};
use water_scan::fixture_v1::*;
use water_scan_report::v1::{ReportContext,ScopeContext,assemble_json};
struct Denied;
impl ReadOnlyIo for Denied {
    fn inspect(&self,node:&ScanNodePath)->Result<NodeMetadata,IoFault>{NativeIo.inspect(node)}
    fn list_names(&self,node:&ScanNodePath,limit:usize)->Result<Vec<std::ffi::OsString>,IoFault>{
        if node.run_relative_path().as_str()=="scope/blocked"{return Err(IoFault{kind:IoFaultKind::PermissionDenied,injected:true});}
        NativeIo.list_names(node,limit)
    }
}
fn assemble(facts:ScanFacts,index:usize,native:bool)->Value{
    let context=ReportContext{scan_id:OpaqueId::new(format!("pipeline-{index}")).unwrap(),platform:Platform::Windows,
        scopes:facts.scopes.iter().map(|s|ScopeContext{scope_id:s.scope_id.clone(),label:format!("Synthetic {}",s.scope_id.as_str()),origin:ScopeOrigin::UserSelected}).collect()};
    let source=serde_json::to_value(&facts).unwrap();
    let input=serde_json::to_string(&facts).unwrap();
    let bundle=assemble_json(&input,&context).unwrap();assert_eq!(bundle.source_facts(),&source);
    let encoded=to_json(bundle.report()).unwrap();let report=parse_report(&encoded).unwrap();assert_eq!(&report,bundle.report());
    assert_eq!(report.findings.len(),facts.recorded_entries as usize);
    assert!(report.totals.logical_bytes.is_none()&&report.totals.allocated_bytes.is_none());
    assert_eq!(report.totals.scanned_entries,facts.recorded_entries);assert_eq!(report.totals.skipped_entries,facts.visited_entries-facts.recorded_entries);
    for f in &report.findings{assert_eq!(f.risk,water_contracts::v1::Risk::Protected);assert_eq!(f.category,water_contracts::v1::Category::Unknown);}
    let view=water_report_view::v1::project_report(&report).unwrap();
    assert_eq!(view,water_report_view::v1::project_json(&encoded).unwrap());
    let summary=water_summary_export::v1::summarize_report(&report).unwrap();
    assert_eq!(summary,water_summary_export::v1::summarize_json(&encoded).unwrap());
    assert_eq!(summary.counts.findings, facts.recorded_entries);assert_eq!(summary.risk_counts.protected,facts.recorded_entries);assert_eq!(summary.category_counts.unknown,facts.recorded_entries);
    assert_eq!(summary.totals,report.totals);
    let summary_json=serde_json::to_value(&summary).unwrap();assert_eq!(summary_json.as_object().unwrap().len(),8);
    assert!(!summary_json.to_string().contains(context.scan_id.as_str()));
    json!({"native":native,"facts":facts,"bundle":bundle,"view":view,"summary":summary})
}
fn main(){
    let index:Value=serde_json::from_str(&std::fs::read_to_string(std::env::args().nth(1).expect("controlled index")).unwrap()).unwrap();
    let mut output=Vec::new();
    for (i,run) in index["runs"].as_array().unwrap().iter().enumerate(){
        let fixture=open_fixture_run(run["run_id"].as_str().unwrap()).unwrap();let p=&run["scanner_plan"];
        let options=ScanOptions::new(p["max_depth"].as_u64().unwrap() as u32,p["max_entries"].as_u64().unwrap() as u32,1024).unwrap();
        output.push(assemble(scan_fixture(&fixture,&options,&CancelToken::new()).unwrap(),i,true));
    }
    let overlap=index["runs"].as_array().unwrap().iter().find(|r|r["case_id"]=="overlapping-scopes").unwrap();
    let fixture=open_fixture_run(overlap["run_id"].as_str().unwrap()).unwrap();let cancel=CancelToken::new();cancel.clone().cancel();
    let facts=scan_fixture(&fixture,&ScanOptions::new(16,128,1024).unwrap(),&cancel).unwrap();assert_eq!(facts.status,water_contracts::v1::ScanStatus::Cancelled);
    output.push(assemble(facts,11,false));
    let run=index["runs"].as_array().unwrap().iter().find(|r|r["case_id"]=="permission-plan").unwrap();let fixture=open_fixture_run(run["run_id"].as_str().unwrap()).unwrap();
    let facts=scan_fixture_with_io(&fixture,&ScanOptions::new(16,128,1024).unwrap(),&CancelToken::new(),&Denied,&NoopObserver).unwrap();
    assert_eq!(facts.status,water_contracts::v1::ScanStatus::Partial);assert_eq!(facts.recorded_entries,2);
    output.push(assemble(facts,12,false));println!("{}",json!({"cases":output,"nativeCases":11,"controlledCases":2}));
}
