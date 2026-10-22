//! Real AA public capture, controlled fixture only. No selector or new reader.
#![forbid(unsafe_code)]
use serde_json::Value;
use water_contracts::v1::OpaqueId;
use water_native_scan::v1::{CancelToken,ScanObserver,ScanProgress};
use water_scope_registry::v1::Registry;
use water_project_session::v1::{MarkerChoice,capture_registered,to_json};
struct LastEntryCancel(CancelToken);
impl ScanObserver for LastEntryCancel {fn on_entry(&self,p:&ScanProgress){assert_eq!(p.recorded_entries,1);self.0.cancel();}}
fn main(){
 let index:Value=serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_MARKER_INDEX").unwrap()).unwrap()).unwrap();
 let root=index["roots"]["good"].as_str().unwrap();let mut registry=Registry::new(2).unwrap();let scope_id=OpaqueId::new("project-scope").unwrap();let job_id=OpaqueId::new("controller-late-cancel").unwrap();
 let pending=registry.prepare(&scope_id,root).unwrap();let scope=registry.confirm(&pending).unwrap();let cancel=CancelToken::new();
 let result=capture_registered(&mut registry,&scope,root,&job_id,MarkerChoice::ReadRootPackageJson,&cancel,&LastEntryCancel(cancel.clone())).unwrap();
 let text=to_json(&result).unwrap();let parsed:Value=serde_json::from_str(&text).unwrap();assert!(cancel.is_cancelled());assert_eq!(parsed["snapshot"]["view"]["status"],"completed");assert_eq!(parsed["marker"]["status"],"skipped");assert_eq!(parsed["marker"]["error_code"],"scan_cancelled");assert_eq!(parsed["marker"]["observation_json"],Value::Null);
 let permit=registry.begin_scan(&scope).unwrap();registry.finish(&permit).unwrap();registry.revoke(&scope).unwrap();assert!(registry.is_empty());println!("{text}");
}
