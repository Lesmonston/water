// Windows ABI/real modal UI baseline. Controller probe, not the S product API.
use std::{ffi::c_void,ptr};
use water_contracts::v1::OpaqueId;
use water_scope_registry::v1::Registry;
#[repr(C)] struct Guid{a:u32,b:u16,c:u16,d:[u8;8]}
const CLSID:Guid=Guid{a:0xdc1c5a9c,b:0xe88a,c:0x4dde,d:[0xa5,0xa1,0x60,0xf8,0x2a,0x20,0xae,0xf7]};
const OPEN:Guid=Guid{a:0xd57c7288,b:0xd4ad,c:0x4768,d:[0xbe,0x02,0x9d,0x96,0x95,0x32,0xd9,0x60]};
const ITEM:Guid=Guid{a:0x43826d1e,b:0xe718,c:0x42ee,d:[0xbc,0x55,0xa1,0xe2,0x61,0xc3,0x7b,0xfe]};
#[link(name="ole32")] unsafe extern "system"{fn CoInitializeEx(p:*mut c_void,flags:u32)->i32;fn CoUninitialize();fn CoCreateInstance(c:*const Guid,o:*mut c_void,ctx:u32,i:*const Guid,out:*mut *mut c_void)->i32;fn CoTaskMemFree(p:*mut c_void);}
#[link(name="shell32")] unsafe extern "system"{fn SHCreateItemFromParsingName(p:*const u16,b:*mut c_void,i:*const Guid,out:*mut *mut c_void)->i32;}
struct Com(*mut c_void);
impl Com{unsafe fn slot(&self,n:usize)->*const c_void{unsafe{*(*(self.0 as *const *const *const c_void)).add(n)}}}
impl Drop for Com{fn drop(&mut self){unsafe{let f:unsafe extern "system" fn(*mut c_void)->u32=std::mem::transmute(self.slot(2));f(self.0);}}}
struct Apartment;impl Drop for Apartment{fn drop(&mut self){unsafe{CoUninitialize()}}}
fn wide(s:&str)->Vec<u16>{s.encode_utf16().chain(Some(0)).collect()}
fn ok(hr:i32){assert!(hr>=0,"controller COM call failed {hr:08x}")}
pub fn probe(root:&str){let scope_id=OpaqueId::new("picker-probe").unwrap();let original=water_native_root::v1::open_directory(&scope_id,root).unwrap();
// SAFETY: this controller-only x64 probe uses documented COM interface slots;
// every successful owned interface is released by Com, and the apartment once.
unsafe{ok(CoInitializeEx(ptr::null_mut(),6));let _apartment=Apartment;for action in ["cancel","select"]{let mut p=ptr::null_mut();ok(CoCreateInstance(&CLSID,ptr::null_mut(),1,&OPEN,&mut p));assert!(!p.is_null());let d=Com(p);let mut p=ptr::null_mut();let path=wide(root);ok(SHCreateItemFromParsingName(path.as_ptr(),ptr::null_mut(),&ITEM,&mut p));assert!(!p.is_null());let folder=Com(p);
let options:unsafe extern "system" fn(*mut c_void,u32)->i32=std::mem::transmute(d.slot(9));ok(options(d.0,0x02110868));let setfolder:unsafe extern "system" fn(*mut c_void,*mut c_void)->i32=std::mem::transmute(d.slot(12));ok(setfolder(d.0,folder.0));let title=wide("Water - Select a read-only directory");let label=wide("Use this directory");for (slot,text)in [(17,&title),(18,&label)]{let f:unsafe extern "system" fn(*mut c_void,*const u16)->i32=std::mem::transmute(d.slot(slot));ok(f(d.0,text.as_ptr()));}
eprintln!("WATER_PICKER_CASE {action}");let show:unsafe extern "system" fn(*mut c_void,*mut c_void)->i32=std::mem::transmute(d.slot(3));let hr=show(d.0,ptr::null_mut());if action=="cancel"{assert_eq!(hr as u32,0x800704c7);continue;}ok(hr);let get:unsafe extern "system" fn(*mut c_void,*mut *mut c_void)->i32=std::mem::transmute(d.slot(20));let mut p=ptr::null_mut();ok(get(d.0,&mut p));let selected=Com(p);let display:unsafe extern "system" fn(*mut c_void,u32,*mut *mut u16)->i32=std::mem::transmute(selected.slot(5));let mut text=ptr::null_mut();ok(display(selected.0,0x80058000,&mut text));assert!(!text.is_null());let mut len=0;while len<32768&&*text.add(len)!=0{len+=1;}assert!(len<32768);let result=String::from_utf16(std::slice::from_raw_parts(text,len)).unwrap();CoTaskMemFree(text.cast());assert_eq!(result.to_lowercase(),root.to_lowercase());let actual=water_native_root::v1::open_directory(&scope_id,&result).unwrap();assert_eq!(actual.observation().identity(),original.observation().identity());let mut registry=Registry::new(2).unwrap();let p=registry.prepare(&scope_id,&result).unwrap();let scope=registry.confirm(&p).unwrap();let permit=registry.begin_scan(&scope).unwrap();registry.finish(&permit).unwrap();registry.revoke(&scope).unwrap();}}
println!("{}",serde_json::json!({"native_modal_cancel":true,"native_modal_get_result":true,"actual_N_P":true,"S_product_tested":false,"ordinary_content_read":false,"scan_performed":false}));}
