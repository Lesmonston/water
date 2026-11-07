#![deny(unsafe_op_in_unsafe_fn)]

use std::ffi::c_void;
use std::fs::File;
use std::io;
use std::mem::size_of;
use std::os::windows::io::AsRawHandle;
use std::ptr::null_mut;

#[repr(C)]
#[derive(Default)]
struct Basic {
    creation: i64,
    access: i64,
    write: i64,
    change: i64,
    attributes: u32,
}
#[repr(C)]
#[derive(Default)]
struct Standard {
    allocation: i64,
    end: i64,
    links: u32,
    pending: u8,
    directory: u8,
}
#[repr(C)]
#[derive(Default)]
struct Attributes {
    attributes: u32,
    tag: u32,
}
#[repr(C)]
#[derive(Default)]
struct Id {
    volume: u64,
    identifier: [u8; 16],
}
const _: () = {
    assert!(size_of::<Basic>() == 40);
    assert!(size_of::<Standard>() == 24);
    assert!(size_of::<Attributes>() == 8);
    assert!(size_of::<Id>() == 24);
};

#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetFileInformationByHandleEx(
        handle: *mut c_void,
        class: i32,
        buffer: *mut c_void,
        size: u32,
    ) -> i32;
    fn GetVolumeInformationByHandleW(
        handle: *mut c_void,
        name: *mut u16,
        name_size: u32,
        serial: *mut u32,
        component: *mut u32,
        flags: *mut u32,
        fs_name: *mut u16,
        fs_size: u32,
    ) -> i32;
}
fn query<T: Default>(file: &File, class: i32) -> io::Result<T> {
    let mut data = T::default();
    // SAFETY: private callers pair each class with its correct repr(C), aligned buffer.
    let ok = unsafe {
        GetFileInformationByHandleEx(
            file.as_raw_handle(),
            class,
            (&mut data as *mut T).cast(),
            size_of::<T>() as u32,
        )
    };
    if ok == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(data)
    }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct State {
    pub len: u64,
    pub write: i64,
    pub creation: i64,
    pub attributes: u32,
    pub links: u32,
}
pub(crate) fn state(file: &File) -> io::Result<State> {
    let s: Standard = query(file, 1)?;
    let b: Basic = query(file, 0)?;
    let a: Attributes = query(file, 9)?;
    if s.end < 0 || s.directory != 0 {
        return Err(io::Error::from(io::ErrorKind::InvalidData));
    }
    Ok(State {
        len: s.end as u64,
        write: b.write,
        creation: b.creation,
        attributes: a.attributes,
        links: s.links,
    })
}
pub(crate) fn identity(file: &File) -> io::Result<String> {
    let id: Id = query(file, 18)?;
    let mut serial = 0;
    // SAFETY: borrowed live file handle; only the volume-serial output is requested.
    let ok = unsafe {
        GetVolumeInformationByHandleW(
            file.as_raw_handle(),
            null_mut(),
            0,
            &mut serial,
            null_mut(),
            null_mut(),
            null_mut(),
            0,
        )
    };
    if ok == 0 {
        return Err(io::Error::last_os_error());
    }
    let bytes: String = id.identifier.iter().map(|n| format!("{n:02x}")).collect();
    Ok(format!("{serial:08X}:{bytes}"))
}
