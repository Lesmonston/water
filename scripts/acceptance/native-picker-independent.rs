// Controller-only public S checks; COM host setup/query is confined to this probe.
use std::{ffi::c_void,ptr};
use serde_json::{Value,json};
use water_contracts::v1::OpaqueId;
use water_native_picker::v1::{self as s,PickerError};
use water_native_root::v1 as n;
use water_scope_registry::v1::Registry;
#[link(name="ole32")]
unsafe extern "system"{fn CoInitializeEx(p:*mut c_void,flags:u32)->i32;fn CoUninitialize();fn CoGetApartmentType(kind:*mut i32,qualifier:*mut i32)->i32;}
fn id(s:&str)->OpaqueId{OpaqueId::new(s).unwrap()}
fn fixture()->Value{serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_PICKER_INDEX").unwrap()).unwrap()).unwrap()}
fn apartment()->Result<(i32,i32),i32>{let(mut kind,mut qualifier)=(0,0);let hr=unsafe{CoGetApartmentType(&mut kind,&mut qualifier)};if hr>=0{Ok((kind,qualifier))}else{Err(hr)}}
fn no_explicit_reference(){let state=apartment();eprintln!("WATER_REVIEW_APARTMENT {state:?}");assert!(state==Err(0x800401f0u32 as i32)||state==Ok((1,1)),"Only uninitialized or documented IMPLICIT_MTA is allowed");assert_eq!(unsafe{CoInitializeEx(ptr::null_mut(),0)},0,"A leaked STA reference must prevent fresh MTA initialization");assert_eq!(apartment(),Ok((1,0)));unsafe{CoUninitialize()};}
#[test] fn mta_rejection_preserves_host(){let i=fixture();assert_eq!(unsafe{CoInitializeEx(ptr::null_mut(),0)},0);assert_eq!(apartment(),Ok((1,0)));let mut registry=Registry::new(2).unwrap();let options=s::PickerOptions::new(i["root"].as_str().unwrap()).unwrap();assert!(matches!(s::select_scope(&mut registry,&id("mta-host"),&options),Err(PickerError::ApartmentUnavailable)));assert!(registry.is_empty());assert_eq!(apartment(),Ok((1,0)));unsafe{CoUninitialize()};no_explicit_reference();}
#[test] fn nested_result_is_actual_selection(){let i=fixture();let root=i["root"].as_str().unwrap();let nested=format!("{root}\\nested");let mut registry=Registry::new(2).unwrap();let options=s::PickerOptions::new(root).unwrap();no_explicit_reference();eprintln!("WATER_PICKER_REVIEW_CASE nested");let result=s::select_scope(&mut registry,&id("controller-nested"),&options).unwrap().unwrap();assert!(result.root_path().eq_ignore_ascii_case(&nested),"actual GetResult must differ from initial directory");assert!(!result.root_path().eq_ignore_ascii_case(root));let permit=registry.begin_scan(result.scope()).unwrap();assert_eq!(registry.check_permit(&permit).unwrap().identity(),n::open_directory(&id("controller-nested"),&nested).unwrap().observation().identity());assert_ne!(registry.check_permit(&permit).unwrap().identity(),n::open_directory(&id("initial-only"),root).unwrap().observation().identity());registry.finish(&permit).unwrap();registry.revoke(result.scope()).unwrap();assert!(registry.is_empty());no_explicit_reference();}
#[test] fn sta_nested_initialization_is_balanced(){let i=fixture();assert_eq!(unsafe{CoInitializeEx(ptr::null_mut(),6)},0);let before=apartment().unwrap();assert!(before.0==0||before.0==3);let options=s::PickerOptions::new(i["other"].as_str().unwrap()).unwrap();let mut registry=Registry::new(1).unwrap();for k in 0..2{eprintln!("WATER_PICKER_REVIEW_CASE cancel");assert!(s::select_scope(&mut registry,&id(&format!("cancel-sta-{k}")),&options).unwrap().is_none());assert!(registry.is_empty());assert_eq!(apartment(),Ok(before));}unsafe{CoUninitialize()};no_explicit_reference();}
// Documentation anchors for the probe's host COM calls:
// learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-cogetapartmenttype
// learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-coinitializeex
// learn.microsoft.com/en-us/windows/win32/api/objidl/ne-objidl-apttypequalifier
#[allow(dead_code)] fn output_marker()->Value{json!({"new_controller_tests":3,"actual_public_S_N_P":true})}
