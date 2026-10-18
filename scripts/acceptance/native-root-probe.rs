// Controller ABI capability probe, not the N path validator or product.
use std::ffi::c_void;
use std::fs::OpenOptions;
use std::mem::{MaybeUninit,size_of,align_of};
use std::os::windows::fs::OpenOptionsExt;
use std::os::windows::io::AsRawHandle;
#[repr(C)]struct Tag {attributes:u32,tag:u32}
#[repr(C)]struct Id {volume:u64,id:[u8;16]}
#[link(name="kernel32")]unsafe extern "system"{fn GetFileInformationByHandleEx(handle:*mut c_void,class:i32,buffer:*mut c_void,size:u32)->i32;fn GetDriveTypeW(root:*const u16)->u32;}
fn observe(path:&str)->(u64,[u8;16]){let file=OpenOptions::new().access_mode(0x80).share_mode(7).custom_flags(0x02000000|0x00200000).security_qos_flags(0x10000).open(path).unwrap();let mut tag=MaybeUninit::<Tag>::uninit();let mut id=MaybeUninit::<Id>::uninit();
 // SAFETY: live borrowed File HANDLE; fixed class, repr(C) correctly sized writable outputs; initialized only after nonzero return.
 let (a,b)=unsafe{(GetFileInformationByHandleEx(file.as_raw_handle(),9,tag.as_mut_ptr().cast(),size_of::<Tag>()as u32),GetFileInformationByHandleEx(file.as_raw_handle(),18,id.as_mut_ptr().cast(),size_of::<Id>()as u32))};assert_ne!(a,0);assert_ne!(b,0);
 // SAFETY: both functions succeeded and filled their complete fixed-size outputs.
 let(tag,id)=unsafe{(tag.assume_init(),id.assume_init())};assert_ne!(tag.attributes&0x10,0);assert_eq!(tag.attributes&0x400,0);(id.volume,id.id)}
fn main(){assert_eq!(size_of::<Tag>(),8);assert_eq!(size_of::<Id>(),24);assert_eq!(align_of::<Id>(),8);let path=env!("WATER_NEXT_PROBE_DIR");let root:Vec<u16>=format!("{}\\",&path[..2]).encode_utf16().chain(Some(0)).collect();
 // SAFETY: root is a valid, NUL-terminated local drive-root UTF-16 buffer retained across the call.
 let drive=unsafe{GetDriveTypeW(root.as_ptr())};assert_eq!(drive,3);let first=observe(path);assert_eq!(first,observe(path));assert_ne!(first,observe(env!("WATER_NEXT_PROBE_SECOND")));let id=first.1.iter().map(|b|format!("{b:02x}")).collect::<String>();println!("{{\"drive_type\":{drive},\"attributes_size\":8,\"identity_size\":24,\"volume_serial\":\"{}\",\"file_id_128\":\"{id}\",\"same_directory_identity\":true,\"different_directory_identity\":true,\"new_product_tested\":false,\"directory_enumerated\":false}}",first.0);}
