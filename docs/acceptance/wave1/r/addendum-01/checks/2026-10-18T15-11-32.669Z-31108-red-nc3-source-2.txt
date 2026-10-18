//! The only unsafe boundary: two Windows x64 APIs and owned File RAII.
use crate::v1::{DirectoryRecord, Identity, Kind, decode_directory_buffer, validate_child_name};
use std::{
    collections::BTreeSet,
    ffi::c_void,
    fs::{File, OpenOptions},
    mem::{align_of, size_of},
    os::windows::{
        fs::OpenOptionsExt,
        io::{AsRawHandle, FromRawHandle},
    },
    ptr,
};
use water_contracts::v1::IssueCode;

#[repr(C)]
struct UnicodeString {
    length: u16,
    maximum_length: u16,
    buffer: *mut u16,
}
#[repr(C)]
struct ObjectAttributes {
    length: u32,
    root_directory: *mut c_void,
    object_name: *mut UnicodeString,
    attributes: u32,
    security_descriptor: *mut c_void,
    security_qos: *mut c_void,
}
#[repr(C)]
struct IoStatus {
    status: usize,
    information: usize,
}
#[repr(C)]
#[derive(Default)]
struct TagInfo {
    attributes: u32,
    tag: u32,
}
#[repr(C)]
#[derive(Default)]
struct IdentityInfo {
    volume: u64,
    id: [u8; 16],
}
#[repr(C)]
#[derive(Default)]
struct StandardInfo {
    allocation: i64,
    end: i64,
    links: u32,
    delete_pending: u8,
    directory: u8,
}

const _: () = {
    assert!(size_of::<usize>() == 8);
    assert!(size_of::<UnicodeString>() == 16 && align_of::<UnicodeString>() == 8);
    assert!(size_of::<ObjectAttributes>() == 48 && align_of::<ObjectAttributes>() == 8);
    assert!(size_of::<IoStatus>() == 16 && align_of::<IoStatus>() == 8);
    assert!(size_of::<TagInfo>() == 8 && align_of::<TagInfo>() == 4);
    assert!(size_of::<IdentityInfo>() == 24 && align_of::<IdentityInfo>() == 8);
    assert!(size_of::<StandardInfo>() == 24 && align_of::<StandardInfo>() == 8);
};
#[link(name = "ntdll")]
unsafe extern "system" {
    fn NtCreateFile(
        handle: *mut *mut c_void,
        access: u32,
        object: *const ObjectAttributes,
        io: *mut IoStatus,
        allocation: *const i64,
        attributes: u32,
        share: u32,
        disposition: u32,
        options: u32,
        ea: *const c_void,
        ea_length: u32,
    ) -> i32;
}
#[link(name = "kernel32")]
unsafe extern "system" {
    fn GetFileInformationByHandleEx(
        handle: *mut c_void,
        class: i32,
        buffer: *mut c_void,
        size: u32,
    ) -> i32;
}

// Each private implementation fixes its ABI class and has only integer fields:
// initialization and successful writes cannot introduce invalid Rust bit patterns.
trait FixedInfo: Default {
    const CLASS: i32;
}
impl FixedInfo for TagInfo {
    const CLASS: i32 = 9;
}
impl FixedInfo for IdentityInfo {
    const CLASS: i32 = 18;
}
impl FixedInfo for StandardInfo {
    const CLASS: i32 = 1;
}
fn win_error() -> IssueCode {
    win_code(std::io::Error::last_os_error().raw_os_error())
}
fn win_code(code: Option<i32>) -> IssueCode {
    match code {
        Some(5) => IssueCode::PermissionDenied,
        Some(2 | 3 | 6) => IssueCode::RootChanged,
        _ => IssueCode::IoError,
    }
}
fn info<T: FixedInfo>(file: &File) -> Result<T, IssueCode> {
    let mut value = T::default();
    // SAFETY: a live borrowed File retains its HANDLE through the synchronous
    // call. The private FixedInfo implementations fix class1/9/18 to initialized
    // repr(C) buffers with asserted x64 size/alignment and integer-only fields.
    let ok = unsafe {
        GetFileInformationByHandleEx(
            file.as_raw_handle(),
            T::CLASS,
            (&mut value as *mut T).cast(),
            size_of::<T>() as u32,
        )
    };
    if ok == 0 { Err(win_error()) } else { Ok(value) }
}
pub(crate) fn kind(file: &File) -> Result<Kind, IssueCode> {
    let tag: TagInfo = info(file)?;
    Ok(classify(tag.attributes))
}
fn classify(attributes: u32) -> Kind {
    if attributes & 0x400 != 0 {
        Kind::Link
    } else if attributes & 0x40 != 0 {
        Kind::Other
    } else if attributes & 0x10 != 0 {
        Kind::Directory
    } else {
        Kind::File
    }
}
pub(crate) fn identity(file: &File) -> Result<Identity, IssueCode> {
    let raw: IdentityInfo = info(file)?;
    Ok(Identity {
        volume_serial: raw.volume.to_string(),
        file_id: raw.id.iter().map(|b| format!("{b:02x}")).collect(),
    })
}
pub(crate) fn length(file: &File) -> Result<u64, IssueCode> {
    let raw: StandardInfo = info(file)?;
    if raw.end < 0 || raw.directory != 0 {
        return Err(IssueCode::IoError);
    }
    Ok(raw.end as u64)
}
pub(crate) fn open_root(path: &str) -> Result<File, IssueCode> {
    OpenOptions::new()
        .access_mode(0x100081)
        .share_mode(7)
        .custom_flags(0x02000000 | 0x00200000)
        .security_qos_flags(0x10000)
        .open(path)
        .map_err(|error| win_code(error.raw_os_error()))
}
pub(crate) fn open_child(parent: &File, record: &DirectoryRecord) -> Result<File, IssueCode> {
    // This check is repeated at the only child-opening boundary. Public memory
    // DirectoryRecords are not authorization and cannot reach this private API.
    validate_child_name(record.name_utf16()).map_err(|_| IssueCode::PathUnrepresentable)?;
    let directory = record.attributes() & 0x10 != 0;
    let mut name = record.name_utf16().to_vec();
    let mut text = UnicodeString {
        length: (name.len() * 2) as u16,
        maximum_length: (name.len() * 2) as u16,
        buffer: name.as_mut_ptr(),
    };
    let object = ObjectAttributes {
        length: size_of::<ObjectAttributes>() as u32,
        root_directory: parent.as_raw_handle(),
        object_name: &mut text,
        attributes: 0,
        security_descriptor: ptr::null_mut(),
        security_qos: ptr::null_mut(),
    };
    let mut io = IoStatus {
        status: 0,
        information: 0,
    };
    let mut handle = ptr::null_mut();
    // SAFETY: parent is a borrowed live directory File. The strict single UTF-16
    // component, UnicodeString, ObjectAttributes and initialized IO_STATUS_BLOCK
    // live for this synchronous call. FILE_OPEN only, share7, no EA, no writes,
    // OPEN_REPARSE_POINT and a strict directory/non-directory hint; no fallback.
    let status = unsafe {
        NtCreateFile(
            &mut handle,
            if directory { 0x100081 } else { 0x100080 },
            &object,
            &mut io,
            ptr::null(),
            0,
            7,
            1,
            0x00200000 | 0x20 | if directory { 1 } else { 0x40 },
            ptr::null(),
            0,
        )
    };
    if status < 0 {
        return Err(match status as u32 {
            0xC0000022 => IssueCode::PermissionDenied,
            0xC0000034 | 0xC000003A | 0xC00000BA | 0xC0000103 => IssueCode::RootChanged,
            _ => IssueCode::IoError,
        });
    }
    if handle.is_null() || handle as isize == -1 {
        return Err(IssueCode::IoError);
    }
    // SAFETY: only a successful NtCreateFile with a checked, newly owned valid
    // HANDLE reaches this conversion. File owns it exactly once and closes by RAII.
    Ok(unsafe { File::from_raw_handle(handle) })
}
pub(crate) enum ListError {
    Limit,
    Io(IssueCode),
    Decode,
}
pub(crate) fn list(file: &File, max: u32) -> Result<Vec<DirectoryRecord>, ListError> {
    let mut result = Vec::new();
    let mut seen = BTreeSet::new();
    let mut dots = BTreeSet::new();
    for call in 0..(2 * max + 4) {
        let mut buffer = [0_u64; 2048];
        // SAFETY: the live borrowed directory HANDLE and initialized 16KiB
        // buffer are retained until return. u64 storage provides 8-byte alignment.
        // Class11 restarts, class10 continues; no references to C variable tails
        // are formed. Only owned initialized bytes are passed to the safe decoder.
        let ok = unsafe {
            GetFileInformationByHandleEx(
                file.as_raw_handle(),
                if call == 0 { 11 } else { 10 },
                buffer.as_mut_ptr().cast(),
                16384,
            )
        };
        if ok == 0 {
            let code = std::io::Error::last_os_error().raw_os_error();
            if code == Some(18) {
                result.sort_by(|a: &DirectoryRecord, b| a.name_utf16().cmp(b.name_utf16()));
                return Ok(result);
            }
            return Err(ListError::Io(win_code(code)));
        }
        let bytes: Vec<u8> = buffer.iter().flat_map(|v| v.to_le_bytes()).collect();
        let records = decode_directory_buffer(&bytes).map_err(|_| ListError::Decode)?;
        let mut progressed = false;
        for record in records {
            if record.name_utf16() == [46] || record.name_utf16() == [46, 46] {
                progressed |= dots.insert(record.name_utf16().to_vec());
                continue;
            }
            if !seen.insert(record.name_utf16().to_vec()) {
                return Err(ListError::Io(IssueCode::IoError));
            }
            progressed = true;
            result.push(record);
            if result.len() > max as usize {
                return Err(ListError::Limit);
            }
        }
        if !progressed {
            return Err(ListError::Io(IssueCode::IoError));
        }
    }
    Err(ListError::Io(IssueCode::IoError))
}
