// Controller ABI/capability probe only: fixed one-level root and three known names.
// No recursive scanner, product R API, ordinary content reads, or cleanup.
use serde_json::{Value,json};
use std::{ffi::c_void,fs::{File,OpenOptions},mem::{align_of,size_of},os::windows::{fs::OpenOptionsExt,io::{AsRawHandle,FromRawHandle}}};
#[repr(C)]struct UnicodeString{length:u16,maximum_length:u16,buffer:*mut u16}
#[repr(C)]struct ObjectAttributes{length:u32,root_directory:*mut c_void,object_name:*mut UnicodeString,attributes:u32,security_descriptor:*mut c_void,security_qos:*mut c_void}
#[repr(C)]struct IoStatus{status:usize,information:usize}
#[repr(C)]struct Tag{attributes:u32,tag:u32}
#[repr(C)]struct Identity{volume:u64,id:[u8;16]}
#[repr(C)]struct Standard{allocation:i64,end:i64,links:u32,delete_pending:u8,directory:u8}
#[link(name="ntdll")]unsafe extern "system"{fn NtCreateFile(handle:*mut *mut c_void,access:u32,object:*const ObjectAttributes,io:*mut IoStatus,allocation:*const i64,attributes:u32,share:u32,disposition:u32,options:u32,ea:*const c_void,ea_length:u32)->i32;}
#[link(name="kernel32")]unsafe extern "system"{fn GetFileInformationByHandleEx(handle:*mut c_void,class:i32,buffer:*mut c_void,size:u32)->i32;}
fn info<T>(file:&File,class:i32,mut value:T)->T{
 // SAFETY: live borrowed File handle; each call site supplies the exact initialized
 // repr(C) buffer for its fixed information class, with valid size and alignment.
 let result=unsafe{GetFileInformationByHandleEx(file.as_raw_handle(),class,(&mut value as *mut T).cast(),size_of::<T>() as u32)};assert_ne!(result,0,"query class {class}");value}
fn identity(file:&File)->(u64,String){let v=info(file,18,Identity{volume:0,id:[0;16]});(v.volume,v.id.iter().map(|b|format!("{b:02x}")).collect())}
fn open_child(root:&File,name:&str,directory:bool)->File{assert!(matches!(name,"alpha.txt"|"alias-alpha.txt"|"junction"));let mut name:Vec<u16>=name.encode_utf16().collect();let text=UnicodeString{length:(name.len()*2)as u16,maximum_length:(name.len()*2)as u16,buffer:name.as_mut_ptr()};let object=ObjectAttributes{length:size_of::<ObjectAttributes>()as u32,root_directory:root.as_raw_handle(),object_name:(&text as *const UnicodeString).cast_mut(),attributes:0,security_descriptor:std::ptr::null_mut(),security_qos:std::ptr::null_mut()};let mut io=IoStatus{status:0,information:0};let mut handle=std::ptr::null_mut();
 // SAFETY: all C structures and UTF-16 storage live through this synchronous call;
 // RootDirectory is a live directory, name is one frozen component, FILE_OPEN only.
 let status=unsafe{NtCreateFile(&mut handle,if directory{0x100081}else{0x100080},&object,&mut io,std::ptr::null(),0,7,1,0x00200000|0x20|if directory{1}else{0x40},std::ptr::null(),0)};assert!(status>=0,"NT status {status:x}");assert!(!handle.is_null()&&handle as isize != -1);
 // SAFETY: successful NtCreateFile returned one new owned, valid file HANDLE.
 unsafe{File::from_raw_handle(handle)}}
fn main(){assert_eq!(size_of::<usize>(),8);assert_eq!(size_of::<UnicodeString>(),16);assert_eq!(size_of::<ObjectAttributes>(),48);assert_eq!(size_of::<IoStatus>(),16);assert_eq!(size_of::<Tag>(),8);assert_eq!(size_of::<Identity>(),24);assert_eq!(size_of::<Standard>(),24);assert_eq!(align_of::<Standard>(),8);
 let i:Value=serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_NATIVE_WALK_INDEX").unwrap()).unwrap()).unwrap();let mut r=water_scope_registry::v1::Registry::new(1).unwrap();let id=water_contracts::v1::OpaqueId::new("controller-native-probe").unwrap();let pending=r.prepare(&id,i["root"].as_str().unwrap()).unwrap();let scope=r.confirm(&pending).unwrap();let permit=r.begin_scan(&scope).unwrap();let observation=r.check_permit(&permit).unwrap();
 let root=OpenOptions::new().access_mode(0x100081).share_mode(7).custom_flags(0x02000000|0x00200000).security_qos_flags(0x10000).open(i["root"].as_str().unwrap()).unwrap();let root_id=identity(&root);assert_eq!(root_id.0.to_string(),observation.identity().volume_serial());assert_eq!(root_id.1,observation.identity().file_id());let a=open_child(&root,"alpha.txt",false);let alias=open_child(&root,"alias-alpha.txt",false);assert_eq!(identity(&a),identity(&alias));let standard=info(&a,1,Standard{allocation:0,end:0,links:0,delete_pending:0,directory:0});assert_eq!(standard.end,14);assert_eq!(standard.directory,0);assert!(standard.links>=2);let junction=open_child(&root,"junction",true);let tag=info(&junction,9,Tag{attributes:0,tag:0});assert_ne!(tag.attributes&0x400,0);
 let mut names=Vec::new();for call in 0..4{let mut buffer=[0_u64;2048];
 // SAFETY: aligned, initialized 16KiB output buffer and live directory handle;
 // classes11/10 enumerate only this root, never the opened junction.
 let ok=unsafe{GetFileInformationByHandleEx(root.as_raw_handle(),if call==0{11}else{10},buffer.as_mut_ptr().cast(),(buffer.len()*8)as u32)};if ok==0{assert_eq!(std::io::Error::last_os_error().raw_os_error(),Some(18));break;}let bytes:Vec<u8>=buffer.iter().flat_map(|v|v.to_le_bytes()).collect();let mut offset=0;loop{assert!(offset+104<=bytes.len());let u32at=|n|u32::from_le_bytes(bytes[offset+n..offset+n+4].try_into().unwrap())as usize;let next=u32at(0);let length=u32at(60);assert!(length>0&&length%2==0&&offset+104+length<=bytes.len());let text:Vec<u16>=bytes[offset+104..offset+104+length].chunks_exact(2).map(|b|u16::from_le_bytes([b[0],b[1]])).collect();let name=String::from_utf16(&text).unwrap();if name!="."&&name!=".."{names.push(name);}if next==0{break;}assert!(next%8==0&&next>=104+length);offset+=next;}}
 names.sort();let mut expected:Vec<String>=i["root_names"].as_array().unwrap().iter().map(|n|n.as_str().unwrap().to_owned()).collect();expected.sort();assert_eq!(names,expected);assert!(!names.iter().any(|n|n.contains("TRAP")));r.finish(&permit).unwrap();println!("{}",json!({"native_root_binding":true,"relative_open":true,"hardlink_identity_equal":true,"logical_bytes":"14","junction_opened_without_following":true,"one_level_names":names,"unicode_string_size":16,"object_attributes_size":48,"io_status_size":16,"standard_info_size":24,"new_R_tested":false,"ordinary_content_read":false,"recursive_scan":false}));}
