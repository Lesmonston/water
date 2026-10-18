// Controller checks actual worker API/wire against frozen, independent goldens.
use serde_json::{Value,json};
use water_scan_report::v1::{ReportContext,ScopeContext,assemble_json};
#[cfg(evidence_l)]use water_project_evidence::v1 as target;
#[cfg(evidence_m)]use water_size_ledger::v1 as target;
fn context(v:&Value)->ReportContext{ReportContext{scan_id:water_contracts::v1::OpaqueId::new(v["scan_id"].as_str().unwrap()).unwrap(),platform:serde_json::from_value(v["platform"].clone()).unwrap(),scopes:v["scopes"].as_array().unwrap().iter().map(|s|ScopeContext{scope_id:water_contracts::v1::OpaqueId::new(s["scope_id"].as_str().unwrap()).unwrap(),label:s["label"].as_str().unwrap().to_owned(),origin:serde_json::from_value(s["origin"].clone()).unwrap()}).collect()}}
fn main(){
 #[cfg(evidence_l)]let text=include_str!("../../contracts/project-evidence-v1/cases.json");
 #[cfg(evidence_m)]let text=include_str!("../../contracts/size-ledger-v1/cases.json");
 let cases:Value=serde_json::from_str(text).unwrap();let mut results=Vec::new();
 for c in cases["golden_cases"].as_array().unwrap(){let ctx=context(&c["context"]);let before=ctx.clone();let raw=c["input"].to_string();let known=assemble_json(&raw,&ctx).unwrap();let actual=target::analyze_json(&raw,&ctx).unwrap();assert_eq!(ctx,before);let encoded=target::to_json(&actual).unwrap();assert!(encoded.len()<=33554432);assert_eq!(encoded,target::to_json(&actual).unwrap());let output:Value=serde_json::from_str(&encoded).unwrap();assert_eq!(output,serde_json::to_value(&actual).unwrap());assert_eq!(output,c["expected"],"{}",c["id"]);assert_eq!(output["source_facts"],*known.source_facts());assert_eq!(output["source_totals"],serde_json::to_value(&known.report().totals).unwrap());results.push(json!({"id":c["id"],"output":output}));}
 for c in cases["source_errors"].as_array().unwrap(){let ctx=context(&c["context"]);let raw=c["input"].as_str().unwrap();let source=assemble_json(raw,&ctx).unwrap_err();let actual=target::analyze_json(raw,&ctx).unwrap_err();match &actual{target::AnalysisError::Source(e)=>{assert_eq!(e,&source);},_=>panic!("source error lost")};assert_eq!(actual.to_string(),source.to_string());assert!(!format!("{actual:?} {actual}").contains("LM_ERROR_CANARY"));}
 println!("{}",json!({"cases":results,"source_rejections":cases["source_errors"].as_array().unwrap().len()}));
}
