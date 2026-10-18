// Additional public R checks, after the unchanged original bridge.
#![forbid(unsafe_code)]
use serde_json::{Value,json};
use water_contracts::v1::{self as a,OpaqueId};
use water_scope_registry::v1::Registry;
use water_native_scan::v1 as r;
fn main(){let i:Value=serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_NATIVE_WALK_INDEX").unwrap()).unwrap()).unwrap();let mut reg=Registry::new(2).unwrap();let p=reg.prepare(&OpaqueId::new("addendum-scope").unwrap(),i["root"].as_str().unwrap()).unwrap();let scope=reg.confirm(&p).unwrap();for depth in [8,1]{let scan=r::scan_registered(&mut reg,&scope,i["root"].as_str().unwrap(),&OpaqueId::new(&format!("depth-{depth}")).unwrap(),&r::ScanOptions::new(depth,128,32).unwrap(),&r::CancelToken::new()).unwrap();a::validate_report(scan.report()).unwrap();let v=serde_json::to_value(scan.report()).unwrap();for f in v["findings"].as_array().unwrap(){let expected=if depth==8&&f["relative_path"]=="dir"{json!(["unknown_ownership","incomplete_evidence","protected_descendant"])}else{json!(["unknown_ownership","incomplete_evidence"])};assert_eq!(f["protection_reasons"],expected);}assert_eq!(r::redacted_json(&scan).unwrap(),water_redacted_report::v1::to_json(&water_redacted_report::v1::redact_report(scan.report()).unwrap()).unwrap());}println!("{}",json!({"actual_R_A_Q":true,"full_and_depth_one":true,"exact_reason_order":true}));}
