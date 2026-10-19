//! Control input generation from existing P/R/E/H/Q/Z. No AA/AB or system UI.
#![forbid(unsafe_code)]
use serde_json::{Value,json};
use water_contracts::v1::OpaqueId;
use water_native_scan::v1::{ScanOptions,CancelToken,scan_registered};
use water_scope_registry::v1::Registry;
fn id(s:&str)->OpaqueId{OpaqueId::new(s).unwrap()}
fn capture(root:&str,job:&str,request:bool,pre_cancel:bool)->Value {
 let mut reg=Registry::new(2).unwrap();let scope_id=id("project-scope");let job_id=id(job);
 let pending=reg.prepare(&scope_id,root).unwrap();let scope=reg.confirm(&pending).unwrap();let cancel=CancelToken::new();if pre_cancel{cancel.cancel();}
 let scan=scan_registered(&mut reg,&scope,root,&job_id,&ScanOptions::new(8,10000,256).unwrap(),&cancel).unwrap();let report=scan.report();water_contracts::v1::validate_report(report).unwrap();
 let view=water_report_view::v1::project_report(report).unwrap();let summary=water_summary_export::v1::summarize_report(report).unwrap();let redacted=water_redacted_report::v1::to_json(&water_redacted_report::v1::redact_report(report).unwrap()).unwrap();
 let marker=if !request{json!({"status":"not_requested","error_code":null,"observation_json":null})}else if pre_cancel{json!({"status":"skipped","error_code":"scan_cancelled","observation_json":null})}else {
  let permit=reg.begin_scan(&scope).unwrap();let value={let consent=water_root_marker::v1::approve_package_json(&reg,&permit).unwrap();water_root_marker::v1::read_package_json(&consent,root)};reg.finish(&permit).unwrap();
  match value{Ok(Some(observation))=>json!({"status":"observed","error_code":null,"observation_json":water_root_marker::v1::to_json(&observation).unwrap()}),Ok(None)=>json!({"status":"missing","error_code":null,"observation_json":null}),Err(e)=>json!({"status":"failed","error_code":format!("{e:?}"),"observation_json":null})}
 };
 reg.revoke(&scope).unwrap();assert!(reg.is_empty());
 // This wire envelope is explicitly synthetic host declaration, not an S run.
 json!({"version":"water.project-host.v1","kind":"result","job_id":job,"read_manifest":request,
 "bundle":{"bundle_version":"water.native-session-bundle.v1","session_id":job,"read_only":true,"selection":"confirmed","confirmation_source":"native_directory_dialog","policy":{"platform":"windows","traversal":"handle_relative_no_follow","ordinary_content_read":false,"native_user_gesture_authenticated":false,"race_protection_verified":false,"coverage_basis":"declared_policy","limits":{"max_depth":8,"max_entries":10000,"max_dir_entries":256}},"snapshots":[{"source_kind":"native_scope_metadata","view":view,"summary":summary,"redacted_json":redacted}]},"marker":marker})
}
fn main(){let index:Value=serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_MARKER_INDEX").unwrap()).unwrap()).unwrap();let roots=&index["roots"];
 let cases=vec![capture(roots["good"].as_str().unwrap(),"project-default",false,false),capture(roots["good"].as_str().unwrap(),"project-observed",true,false),capture(roots["good"].as_str().unwrap(),"project-cancelled",true,true),capture(roots["missing"].as_str().unwrap(),"project-missing",true,false),capture(roots["malformed"].as_str().unwrap(),"project-invalid",true,false),capture(roots["hardlink"].as_str().unwrap(),"project-hardlink",true,false)];
 assert_eq!(cases[0]["marker"]["status"],"not_requested");assert_eq!(cases[1]["marker"]["status"],"observed");assert_eq!(cases[2]["marker"]["error_code"],"scan_cancelled");assert_eq!(cases[3]["marker"]["status"],"missing");assert_eq!(cases[4]["marker"]["error_code"],"InvalidManifest");assert_eq!(cases[5]["marker"]["error_code"],"MultipleLinks");
 let mut s=water_scan_host::HostState::new();let job=s.start(id("dependency-token")).unwrap();s.cancel(job.job_id()).unwrap();assert!(job.cancel_token().is_cancelled());s.finish(job.job_id()).unwrap();
 println!("{}",json!({"version":"water.project-dependency-cases.v1","actual_P_R_E_H_Q_Z":true,"actual_X_shared_token":true,"systemNativeDialogs":0,"new_AA_AB_product_used":false,"envelopeOrigin":"synthetic memory host declaration around actual P/R/E/H/Q/Z values; no S execution or UI consent authentication", "cases":cases}));
}
