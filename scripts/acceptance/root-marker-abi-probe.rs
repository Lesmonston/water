//! Fixed fixture/platform experiment; not the Z consent API or a product reader.
use std::{ffi::c_void,fs::{File,OpenOptions},io::Read,mem::size_of,os::windows::{fs::OpenOptionsExt,io::{AsRawHandle,FromRawHandle}},ptr};
#[repr(C)]struct Text{length:u16,maximum:u16,buffer:*mut u16}
#[repr(C)]struct Object{length:u32,root:*mut c_void,name:*mut Text,attributes:u32,sd:*mut c_void,qos:*mut c_void}
#[repr(C)]struct Io{status:usize,information:usize}
#[repr(C)]#[derive(Default)]struct Standard{allocated:i64,end:i64,links:u32,pending:u8,directory:u8}
#[repr(C)]#[derive(Default)]struct Tag{attributes:u32,tag:u32}
#[repr(C)]#[derive(Default)]struct Id{volume:u64,id:[u8;16]}
#[link(name="ntdll")]unsafe extern "system"{fn NtCreateFile(h:*mut *mut c_void,a:u32,o:*const Object,i:*mut Io,z:*const i64,b:u32,s:u32,d:u32,f:u32,e:*const c_void,n:u32)->i32;}
#[link(name="kernel32")]unsafe extern "system"{fn GetFileInformationByHandleEx(h:*mut c_void,c:i32,b:*mut c_void,n:u32)->i32;}
fn info<T:Default>(file:&File,class:i32)->T{let mut x=T::default();assert_ne!(unsafe{GetFileInformationByHandleEx(file.as_raw_handle(),class,(&mut x as *mut T).cast(),size_of::<T>() as u32)},0);x}
fn child(parent:&File)->Result<File,i32>{let mut name:Vec<u16>="package.json".encode_utf16().collect();let mut t=Text{length:(name.len()*2)as u16,maximum:(name.len()*2)as u16,buffer:name.as_mut_ptr()};let o=Object{length:size_of::<Object>()as u32,root:parent.as_raw_handle(),name:&mut t,attributes:0x40,sd:ptr::null_mut(),qos:ptr::null_mut()};let mut io=Io{status:0,information:0};let mut h=ptr::null_mut();let status=unsafe{NtCreateFile(&mut h,0x100081,&o,&mut io,ptr::null(),0,1,1,0x200000|0x20|0x40,ptr::null(),0)};if status<0{return Err(status);}assert!(!h.is_null()&&h as isize != -1);Ok(unsafe{File::from_raw_handle(h)})}
fn main(){assert_eq!(size_of::<Text>(),16);assert_eq!(size_of::<Object>(),48);assert_eq!(size_of::<Io>(),16);assert_eq!(size_of::<Standard>(),24);assert_eq!(size_of::<Tag>(),8);assert_eq!(size_of::<Id>(),24);
 let index:serde_json::Value=serde_json::from_str(&std::fs::read_to_string(std::env::var("WATER_MARKER_INDEX").unwrap()).unwrap()).unwrap();
 let mut read_bytes=0;
 for name in ["good","missing","exact","oversize","hardlink","link","directory"] {
  let root=OpenOptions::new().access_mode(0x100080).share_mode(7).custom_flags(0x2200000).open(index["roots"][name].as_str().unwrap()).unwrap();let root_id:Id=info(&root,18);
  let file=child(&root);if ["missing","link","directory"].contains(&name){match file{Err(_)=>{},Ok(f)=>{let tag:Tag=info(&f,9);assert_ne!(tag.attributes&0x400,0);}}continue;}
  let mut f=file.unwrap();let tag:Tag=info(&f,9);assert_eq!(tag.attributes&0x450,0);let before:Standard=info(&f,1);let id:Id=info(&f,18);
  if name=="hardlink"{assert_eq!(before.links,2);continue;}assert_eq!(before.links,1);assert_eq!(before.pending,0);assert_eq!(before.directory,0);
  if name=="oversize"{assert_eq!(before.end,262145);continue;}assert!((0..=262144).contains(&before.end));let mut bytes=Vec::new();(&mut f).take(262145).read_to_end(&mut bytes).unwrap();assert_eq!(bytes.len()as i64,before.end);read_bytes+=bytes.len();let after:Standard=info(&f,1);let after_id:Id=info(&f,18);let root_after:Id=info(&root,18);assert_eq!(before.end,after.end);assert_eq!(id.id,after_id.id);assert_eq!(root_id.id,root_after.id);let raw=std::str::from_utf8(&bytes).unwrap();let evidence=water_node_manifest::v1::analyze_package_json(raw).unwrap();assert!(water_node_manifest::v1::to_json(&evidence).unwrap().contains("protected"));
 }
 println!("{}",serde_json::json!({"fixture_only":true,"new_Z_product_tested":false,"root_relative_NtCreateFile":true,"metadata_classes":[1,9,18],"actual_U":true,"bounded_payload_bytes_read":read_bytes,"links_and_oversize_refused_before_read":true,"native_dialogs":0}));
}
