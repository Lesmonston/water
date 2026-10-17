// Controller bridge: real J public API, no expected-data substitution.
#![forbid(unsafe_code)]
use serde_json::{Value,json};
use water_contracts::v1::OpaqueId;
use water_scan::fixture_v1::*;
use water_lab_session::v1::{inspect_fixture,inspect_fixture_with_io,to_json};
struct Denied;
impl ReadOnlyIo for Denied {
    fn inspect(&self,node:&ScanNodePath)->Result<NodeMetadata,IoFault>{NativeIo.inspect(node)}
    fn list_names(&self,node:&ScanNodePath,limit:usize)->Result<Vec<std::ffi::OsString>,IoFault>{
        if node.run_relative_path().as_str()=="scope/blocked"{return Err(IoFault{kind:IoFaultKind::PermissionDenied,injected:true});}NativeIo.list_names(node,limit)
    }
}
fn main(){
    let index:Value=serde_json::from_str(&std::fs::read_to_string(std::env::args().nth(1).expect("controlled index")).unwrap()).unwrap();
    let mut output=Vec::new();
    for (i,r) in index["runs"].as_array().unwrap().iter().enumerate(){let p=&r["scanner_plan"];let opts=ScanOptions::new(p["max_depth"].as_u64().unwrap() as u32,p["max_entries"].as_u64().unwrap() as u32,1024).unwrap();let id=OpaqueId::new(format!("pipeline-{i}")).unwrap();let s=inspect_fixture(r["run_id"].as_str().unwrap(),&id,&opts,&CancelToken::new()).unwrap();let encoded=to_json(&s).unwrap();assert!(encoded.len()<=16777216);let value:Value=serde_json::from_str(&encoded).unwrap();assert_eq!(value,serde_json::to_value(&s).unwrap());output.push(value);}
    let opts=ScanOptions::new(16,128,1024).unwrap();
    let overlap=index["runs"].as_array().unwrap().iter().find(|r|r["case_id"]=="overlapping-scopes").unwrap();let token=CancelToken::new();token.clone().cancel();
    let s=inspect_fixture(overlap["run_id"].as_str().unwrap(),&OpaqueId::new("pipeline-11").unwrap(),&opts,&token).unwrap();output.push(serde_json::from_str::<Value>(&to_json(&s).unwrap()).unwrap());
    let denied=index["runs"].as_array().unwrap().iter().find(|r|r["case_id"]=="permission-plan").unwrap();let s=inspect_fixture_with_io(denied["run_id"].as_str().unwrap(),&OpaqueId::new("pipeline-12").unwrap(),&opts,&CancelToken::new(),&Denied,&NoopObserver).unwrap();output.push(serde_json::from_str::<Value>(&to_json(&s).unwrap()).unwrap());
    println!("{}",json!({"snapshots":output}));
}
