// Controller actual V public API bridge, executed only after V implementation.
#![forbid(unsafe_code)]
use serde_json::{Value,json};
use water_contracts::v1::OpaqueId;
use water_scope_registry::v1::Registry;
use water_native_picker::v1::PickerOptions;
use water_native_scan::v1::{ScanOptions,CancelToken};
use water_native_session::v1 as v;
fn id(s:&str)->OpaqueId{OpaqueId::new(s).unwrap()}
fn main(){let index:Value=serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_NATIVE_WALK_INDEX").unwrap()).unwrap()).unwrap();let cases:Value=serde_json::from_str(include_str!("../../contracts/native-session-v1/cases.json")).unwrap();let mut reg=Registry::new(4).unwrap();let old=reg.prepare(&id("existing-host"),index["trap"].as_str().unwrap()).unwrap();let existing=reg.confirm(&old).unwrap();let picker=PickerOptions::new(index["root"].as_str().unwrap()).unwrap();let options=ScanOptions::new(8,128,32).unwrap();for(i,action,pre)in [(0,"cancel",false),(1,"select",false),(3,"select",true)]{let c=&cases["cases"][i];let session=id(c["bundle"]["session_id"].as_str().unwrap());let token=CancelToken::new();if pre{token.cancel();}eprintln!("WATER_PICKER_CASE {action}");let capture=v::capture_session(&mut reg,&id("native-probe-scope"),&session,&picker,&options,&token).unwrap();let wire=v::to_json(&capture).unwrap();let parsed:Value=serde_json::from_str(&wire).unwrap();assert_eq!(parsed,c["bundle"]);assert_eq!(parsed,serde_json::to_value(capture).unwrap());assert_eq!(reg.len(),1);let permit=reg.begin_scan(&existing).unwrap();reg.finish(&permit).unwrap();}reg.revoke(&existing).unwrap();assert!(reg.is_empty());println!("{}",json!({"actual_V_S_P_R_A_E_H_Q":true,"selection_cancel_and_pre_cancel_distinct":true,"released_own_registration":true,"preserved_existing_host_scope":true,"V_W_launcher_joint_tested":false}));}
