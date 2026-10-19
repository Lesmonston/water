//! Controller dependency check only. Not an X/Z implementation; no UI.
#![forbid(unsafe_code)]
use serde_json::{Value,json};
use water_contracts::v1::OpaqueId;
use water_scope_registry::v1::Registry;
use water_native_scan::v1 as r;
fn main() {
 let lane=std::env::args().nth(1).unwrap();
 if lane=="X" {
  let i:Value=serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_NATIVE_WALK_INDEX").unwrap()).unwrap()).unwrap();
  let mut reg=Registry::new(2).unwrap();let id=OpaqueId::new("interactive-preflight").unwrap();
  let pending=reg.prepare(&id,i["root"].as_str().unwrap()).unwrap();let scope=reg.confirm(&pending).unwrap();
  let scan=r::scan_registered(&mut reg,&scope,i["root"].as_str().unwrap(),&id,&r::ScanOptions::new(8,10000,256).unwrap(),&r::CancelToken::new()).unwrap();
  water_contracts::v1::validate_report(scan.report()).unwrap();let v=serde_json::to_value(scan.report()).unwrap();assert_eq!(v["findings"].as_array().unwrap().len(),8);
  let cancel=r::CancelToken::new();let second=cancel.clone();second.cancel();assert!(cancel.is_cancelled());
  let scan=r::scan_registered(&mut reg,&scope,i["root"].as_str().unwrap(),&id,&r::ScanOptions::new(8,10000,256).unwrap(),&cancel).unwrap();
  assert_eq!(serde_json::to_value(scan.report()).unwrap()["status"],"cancelled");reg.revoke(&scope).unwrap();assert!(reg.is_empty());
  let _:fn(&water_native_session::v1::SessionCapture)->Result<String,water_native_session::v1::SessionError>=water_native_session::v1::to_json;
  println!("{}",json!({"actual_P_R_A":true,"entries":8,"shared_cancel_token":true,"actual_V_linked_no_UI":true,"new_product_tested":false}));
 } else {
  let i:Value=serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_MARKER_INDEX").unwrap()).unwrap()).unwrap();let id=OpaqueId::new("marker-preflight").unwrap();
  let mut reg=Registry::new(2).unwrap();let pending=reg.prepare(&id,i["roots"]["good"].as_str().unwrap()).unwrap();let scope=reg.confirm(&pending).unwrap();let permit=reg.begin_scan(&scope).unwrap();
  let observed=water_native_root::v1::open_directory(&id,i["roots"]["good"].as_str().unwrap()).unwrap();assert_eq!(reg.check_permit(&permit).unwrap().identity(),observed.observation().identity());reg.finish(&permit).unwrap();reg.revoke(&scope).unwrap();assert!(reg.is_empty());
  let evidence=water_node_manifest::v1::analyze_package_json("{\"private\":true,\"dependencies\":{\"FAKE\":\"1\"}}").unwrap();
  let v:Value=serde_json::from_str(&water_node_manifest::v1::to_json(&evidence).unwrap()).unwrap();assert_eq!(v["risk"],"protected");assert_eq!(v["counts"]["dependencies"],1);
  println!("{}",json!({"actual_P_N_U":true,"content_supplied_in_memory":true,"new_product_tested":false}));
 }
}
