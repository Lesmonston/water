#![deny(unsafe_op_in_unsafe_fn)]

pub(crate) struct DirectoryEntry {
    pub name: Option<String>,
    pub attributes: u32,
    pub len: u64,
    pub mtime: std::time::SystemTime,
    pub creation: std::time::SystemTime,
    pub allocation: u64,
    pub reparse_tag: u32,
    pub identity: Option<(u32, [u8; 16])>,
}

#[cfg(windows)]
pub(crate) use windows::{allocation_of, identity_of, known_folders, list_directory, reparse_data};

#[cfg(windows)]
mod windows {
    use super::DirectoryEntry;
    use crate::error::ScanError;
    use crate::model::{Identity, KnownFolders};
    use crate::util::validate_abs_path;
    use std::ffi::c_void;
    use std::mem::{align_of, size_of};
    use std::os::windows::ffi::OsStrExt;
    use std::path::Path;
    use std::ptr;

    const FILE_READ_ATTRIBUTES: u32 = 0x0080;
    const FILE_LIST_DIRECTORY: u32 = 0x0001;
    const FILE_SHARE_ALL: u32 = 0x0000_0007;
    const OPEN_EXISTING: u32 = 3;
    const FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;
    const FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x0020_0000;
    const INVALID_HANDLE: isize = -1;
    const FILE_ID_INFO_CLASS: i32 = 18;

    #[repr(C)]
    struct Guid {
        data1: u32,
        data2: u16,
        data3: u16,
        data4: [u8; 8],
    }

    #[repr(C)]
    struct FileIdInfo {
        _volume_serial: u64,
        file_id: [u8; 16],
    }

    #[repr(C)]
    struct FileStandardInfo {
        allocation: i64,
        end_of_file: i64,
        links: u32,
        delete_pending: u8,
        directory: u8,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    struct FileIdExtdDirectoryInfo {
        next: u32,
        index: u32,
        creation: i64,
        access: i64,
        write: i64,
        change: i64,
        end_of_file: i64,
        allocation: i64,
        attributes: u32,
        name_length: u32,
        ea_size: u32,
        reparse_tag: u32,
        file_id: [u8; 16],
    }

    const _: () = {
        assert!(size_of::<FileIdInfo>() == 24);
        assert!(align_of::<FileIdInfo>() == 8);
        assert!(size_of::<Guid>() == 16);
        assert!(size_of::<FileIdExtdDirectoryInfo>() == 88);
        assert!(align_of::<FileIdExtdDirectoryInfo>() == 8);
        assert!(std::mem::offset_of!(FileIdExtdDirectoryInfo, write) == 24);
        assert!(std::mem::offset_of!(FileIdExtdDirectoryInfo, file_id) == 72);
    };

    const FOLDERID_PROFILE: Guid = Guid {
        data1: 0x5E6C_858F,
        data2: 0x0E22,
        data3: 0x4760,
        data4: [0x9A, 0xFE, 0xEA, 0x33, 0x17, 0xB6, 0x71, 0x73],
    };
    const FOLDERID_LOCAL_APP_DATA: Guid = Guid {
        data1: 0xF1B3_2785,
        data2: 0x6FBA,
        data3: 0x4FCF,
        data4: [0x9D, 0x55, 0x7B, 0x8E, 0x7F, 0x15, 0x70, 0x91],
    };
    const FOLDERID_ROAMING_APP_DATA: Guid = Guid {
        data1: 0x3EB6_85DB,
        data2: 0x65F9,
        data3: 0x4CF6,
        data4: [0xA0, 0x3A, 0xE3, 0xEF, 0x65, 0x72, 0x9F, 0x3D],
    };
    const FOLDERID_WINDOWS: Guid = Guid {
        data1: 0xF38B_F404,
        data2: 0x1D43,
        data3: 0x42F2,
        data4: [0x93, 0x05, 0x67, 0xDE, 0x0B, 0x28, 0xFC, 0x23],
    };
    const FOLDERID_PROGRAM_DATA: Guid = Guid {
        data1: 0x62AB_5D82,
        data2: 0xFDC1,
        data3: 0x4DC3,
        data4: [0xA9, 0xDD, 0x07, 0x0D, 0x1D, 0x49, 0x5D, 0x97],
    };
    const FOLDERID_DOWNLOADS: Guid = Guid {
        data1: 0x374D_E290,
        data2: 0x123F,
        data3: 0x4565,
        data4: [0x91, 0x64, 0x39, 0xC4, 0x92, 0x5E, 0x46, 0x7B],
    };

    #[link(name = "shell32")]
    unsafe extern "system" {
        fn SHGetKnownFolderPath(
            rfid: *const Guid,
            flags: u32,
            token: *mut c_void,
            path: *mut *mut u16,
        ) -> i32;
    }

    #[link(name = "ole32")]
    unsafe extern "system" {
        fn CoTaskMemFree(ptr: *mut c_void);
    }

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn CreateFileW(
            name: *const u16,
            access: u32,
            share: u32,
            security: *const c_void,
            disposition: u32,
            flags: u32,
            template: *mut c_void,
        ) -> *mut c_void;
        fn CloseHandle(handle: *mut c_void) -> i32;
        fn GetFileInformationByHandleEx(
            handle: *mut c_void,
            class: i32,
            buffer: *mut c_void,
            size: u32,
        ) -> i32;
        fn GetVolumeInformationByHandleW(
            handle: *mut c_void,
            volume_name: *mut u16,
            volume_name_size: u32,
            serial: *mut u32,
            component: *mut u32,
            flags: *mut u32,
            fs_name: *mut u16,
            fs_name_size: u32,
        ) -> i32;
        fn DeviceIoControl(
            handle: *mut c_void,
            code: u32,
            input: *const c_void,
            input_size: u32,
            output: *mut c_void,
            output_size: u32,
            returned: *mut u32,
            overlapped: *mut c_void,
        ) -> i32;
    }

    struct OwnedHandle(*mut c_void);

    impl Drop for OwnedHandle {
        fn drop(&mut self) {
            if !self.0.is_null() && self.0 as isize != INVALID_HANDLE {
                // SAFETY: this handle was returned by a successful CreateFileW and
                // is owned uniquely by this RAII value; CloseHandle is called once.
                let _ = unsafe { CloseHandle(self.0) };
            }
        }
    }

    fn wide_path(path: &str) -> Vec<u16> {
        // Preserve enumerated device names and trailing dots/spaces. Public
        // paths keep their ordinary form; only native calls use this prefix.
        let verbatim = if path.as_bytes().get(1..3) == Some(b":\\") {
            format!("\\\\?\\{path}")
        } else {
            path.to_string()
        };
        Path::new(&verbatim)
            .as_os_str()
            .encode_wide()
            .chain([0])
            .collect()
    }

    fn attribute_handle(path: &str) -> Result<OwnedHandle, ScanError> {
        let wide = wide_path(path);
        // SAFETY: live NUL-terminated path, attribute-only access, full sharing,
        // existing object, open the reparse point itself; no content or mutation.
        let raw = unsafe {
            CreateFileW(
                wide.as_ptr(),
                FILE_READ_ATTRIBUTES,
                FILE_SHARE_ALL,
                ptr::null(),
                OPEN_EXISTING,
                FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS,
                ptr::null_mut(),
            )
        };
        if raw.is_null() || raw as isize == INVALID_HANDLE {
            return Err(ScanError::Native);
        }
        Ok(OwnedHandle(raw))
    }

    pub(crate) fn allocation_of(path: &str) -> Result<u64, ScanError> {
        let handle = attribute_handle(path)?;
        let mut info = FileStandardInfo {
            allocation: 0,
            end_of_file: 0,
            links: 0,
            delete_pending: 0,
            directory: 0,
        };
        // SAFETY: info is writable for its declared size and the handle is live.
        // FileStandardInfo (1) returns attributes only, never file contents.
        let ok = unsafe {
            GetFileInformationByHandleEx(
                handle.0,
                1,
                (&mut info as *mut FileStandardInfo).cast(),
                size_of::<FileStandardInfo>() as u32,
            )
        };
        if ok == 0 {
            return Err(ScanError::Native);
        }
        Ok(info.allocation.max(0) as u64)
    }

    pub(crate) fn reparse_data(path: &str) -> Result<Vec<u8>, ScanError> {
        let handle = attribute_handle(path)?;
        let mut buffer = vec![0u8; 16_384];
        let mut returned = 0;
        // SAFETY: live reparse-point handle and writable bounded output. Only
        // FSCTL_GET_REPARSE_POINT (0x000900A8) is issued; there is no input,
        // write access, asynchronous operation, or target traversal.
        let ok = unsafe {
            DeviceIoControl(
                handle.0,
                0x0009_00a8,
                ptr::null(),
                0,
                buffer.as_mut_ptr().cast(),
                buffer.len() as u32,
                &mut returned,
                ptr::null_mut(),
            )
        };
        if ok == 0 || returned as usize > buffer.len() {
            return Err(ScanError::Native);
        }
        buffer.truncate(returned as usize);
        Ok(buffer)
    }

    fn read_wide(ptr: *const u16) -> Result<String, ScanError> {
        if ptr.is_null() {
            return Err(ScanError::Native);
        }
        let mut len = 0usize;
        while len < 32_768 {
            // SAFETY: SHGetKnownFolderPath writes a NUL-terminated UTF-16 buffer.
            let unit = unsafe { ptr.add(len).read() };
            if unit == 0 {
                break;
            }
            len += 1;
        }
        // SAFETY: len is the number of units before NUL inside the API buffer.
        let slice = unsafe { std::slice::from_raw_parts(ptr, len) };
        String::from_utf16(slice).map_err(|_| ScanError::Native)
    }

    fn normalize_known(path: String) -> Result<String, ScanError> {
        let mut path = path.replace('/', "\\");
        while path.len() > 3 && path.ends_with('\\') {
            path.pop();
        }
        validate_abs_path(&path).map_err(|_| ScanError::Native)?;
        Ok(path)
    }

    fn known_folder(id: &Guid) -> Result<String, ScanError> {
        let mut raw = ptr::null_mut();
        // SAFETY: id is a live constant KNOWNFOLDERID. The API writes an owned
        // PWSTR into raw on success; flags and token are the documented zeros.
        let hr = unsafe { SHGetKnownFolderPath(id, 0, ptr::null_mut(), &mut raw) };
        if hr != 0 || raw.is_null() {
            return Err(ScanError::Native);
        }
        let text = read_wide(raw);
        // SAFETY: raw is a CoTaskMem allocation from a successful SHGetKnownFolderPath.
        unsafe { CoTaskMemFree(raw.cast()) };
        normalize_known(text?)
    }

    pub fn known_folders() -> Result<KnownFolders, ScanError> {
        let user_profile = known_folder(&FOLDERID_PROFILE)?;
        let local_app_data = known_folder(&FOLDERID_LOCAL_APP_DATA)?;
        let roaming_app_data = known_folder(&FOLDERID_ROAMING_APP_DATA)?;
        let windows = known_folder(&FOLDERID_WINDOWS)?;
        let program_data = known_folder(&FOLDERID_PROGRAM_DATA)?;
        let downloads = known_folder(&FOLDERID_DOWNLOADS)?;
        let user_temp = format!("{local_app_data}\\Temp");
        let system_temp = format!("{windows}\\Temp");
        validate_abs_path(&user_temp).map_err(|_| ScanError::Native)?;
        validate_abs_path(&system_temp).map_err(|_| ScanError::Native)?;
        Ok(KnownFolders {
            known_folders_version: "water.known-folders.v1".to_string(),
            user_profile,
            local_app_data,
            roaming_app_data,
            user_temp,
            system_temp,
            windows,
            program_data,
            downloads,
        })
    }

    pub fn identity_of(path: &str) -> Result<Identity, ScanError> {
        validate_abs_path(path).map_err(|_| ScanError::Native)?;
        let wide = wide_path(path);
        // SAFETY: wide is a NUL-terminated UTF-16 path that lives for the call.
        // Access is FILE_READ_ATTRIBUTES only; sharing is full; disposition is
        // OPEN_EXISTING; flags open the named object itself and do not follow a
        // reparse point. No write or delete access is requested.
        let handle = unsafe {
            CreateFileW(
                wide.as_ptr(),
                FILE_READ_ATTRIBUTES,
                FILE_SHARE_ALL,
                ptr::null(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
                ptr::null_mut(),
            )
        };
        if handle.is_null() || handle as isize == INVALID_HANDLE {
            return Err(ScanError::Native);
        }
        let handle = OwnedHandle(handle);
        let mut info = FileIdInfo {
            _volume_serial: 0,
            file_id: [0; 16],
        };
        // SAFETY: handle is a live owned file HANDLE. Class 18 writes the aligned
        // 24-byte FileIdInfo buffer of exactly this size.
        let ok = unsafe {
            GetFileInformationByHandleEx(
                handle.0,
                FILE_ID_INFO_CLASS,
                (&mut info as *mut FileIdInfo).cast(),
                size_of::<FileIdInfo>() as u32,
            )
        };
        if ok == 0 {
            return Err(ScanError::Native);
        }
        let mut serial = 0u32;
        // SAFETY: same live HANDLE. Name buffers are omitted (null, size 0).
        // Only the DWORD serial out-parameter is written.
        let ok = unsafe {
            GetVolumeInformationByHandleW(
                handle.0,
                ptr::null_mut(),
                0,
                &mut serial,
                ptr::null_mut(),
                ptr::null_mut(),
                ptr::null_mut(),
                0,
            )
        };
        if ok == 0 {
            return Err(ScanError::Native);
        }
        Ok(Identity {
            volume_serial: format!("{serial:08X}"),
            file_id: info.file_id.iter().map(|b| format!("{b:02x}")).collect(),
        })
    }

    /// Streams directory metadata; the callback can stop before the next buffer.
    /// No child file is opened. Creation/allocation/tag are metadata in the same buffer.
    pub(crate) fn list_directory(
        path: &str,
        mut visit: impl FnMut(DirectoryEntry) -> bool,
    ) -> Result<(), ScanError> {
        let wide = wide_path(path);
        // SAFETY: wide is a live NUL-terminated path. Only FILE_LIST_DIRECTORY is
        // requested, with full sharing and OPEN_EXISTING; reparse points are not followed.
        let raw = unsafe {
            CreateFileW(
                wide.as_ptr(),
                FILE_LIST_DIRECTORY,
                FILE_SHARE_ALL,
                ptr::null(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
                ptr::null_mut(),
            )
        };
        if raw.is_null() || raw as isize == INVALID_HANDLE {
            return Err(ScanError::Native);
        }
        let handle = OwnedHandle(raw);
        let mut serial = 0;
        // SAFETY: handle is live; optional name outputs are null with zero lengths.
        let has_serial = unsafe {
            GetVolumeInformationByHandleW(
                handle.0,
                ptr::null_mut(),
                0,
                &mut serial,
                ptr::null_mut(),
                ptr::null_mut(),
                ptr::null_mut(),
                0,
            )
        } != 0;
        let mut buffer = vec![0u64; 8192];
        let bytes = buffer.len() * size_of::<u64>();
        let mut class = 20; // FileIdExtdDirectoryRestartInfo, then FileIdExtdDirectoryInfo.
        loop {
            buffer.fill(0);
            // SAFETY: buffer is aligned to 8 and writable for exactly bytes bytes.
            // Classes 20 and 19 return FILE_ID_EXTD_DIR_INFO records only.
            let ok = unsafe {
                GetFileInformationByHandleEx(
                    handle.0,
                    class,
                    buffer.as_mut_ptr().cast(),
                    bytes as u32,
                )
            };
            if ok == 0 {
                return if std::io::Error::last_os_error().raw_os_error() == Some(18) {
                    Ok(()) // ERROR_NO_MORE_FILES is the only normal end condition.
                } else {
                    Err(ScanError::Native)
                };
            }
            class = 19;
            let base = buffer.as_ptr().cast::<u8>();
            let mut offset = 0usize;
            loop {
                let header_end = offset
                    .checked_add(88)
                    .filter(|end| *end <= bytes)
                    .ok_or(ScanError::Native)?;
                // SAFETY: the fixed header lies within the initialized buffer.
                let info = unsafe {
                    base.add(offset)
                        .cast::<FileIdExtdDirectoryInfo>()
                        .read_unaligned()
                };
                let name_end = header_end
                    .checked_add(info.name_length as usize)
                    .filter(|end| *end <= bytes)
                    .ok_or(ScanError::Native)?;
                if info.name_length % 2 != 0 {
                    return Err(ScanError::Native);
                }
                // SAFETY: offset is 8-aligned and header size is even. The checked
                // name range is inside buffer and contains name_length / 2 UTF-16 units.
                let units = unsafe {
                    std::slice::from_raw_parts(
                        base.add(header_end).cast::<u16>(),
                        info.name_length as usize / 2,
                    )
                };
                let name = String::from_utf16(units).ok();
                if !matches!(name.as_deref(), Some("." | "..")) {
                    let ticks = info.write.saturating_sub(116_444_736_000_000_000).max(0) as u64;
                    let entry = DirectoryEntry {
                        name,
                        attributes: info.attributes,
                        len: info.end_of_file.max(0) as u64,
                        mtime: std::time::SystemTime::UNIX_EPOCH
                            + std::time::Duration::from_nanos(ticks.saturating_mul(100)),
                        creation: std::time::SystemTime::UNIX_EPOCH
                            + std::time::Duration::from_nanos(
                                (info.creation.saturating_sub(116_444_736_000_000_000).max(0)
                                    as u64)
                                    .saturating_mul(100),
                            ),
                        allocation: info.allocation.max(0) as u64,
                        reparse_tag: info.reparse_tag,
                        identity: (has_serial && info.file_id != [0; 16])
                            .then_some((serial, info.file_id)),
                    };
                    if !visit(entry) {
                        return Ok(());
                    }
                }
                if info.next == 0 {
                    break;
                }
                let next = offset
                    .checked_add(info.next as usize)
                    .ok_or(ScanError::Native)?;
                if info.next % 8 != 0 || next < name_end || next >= bytes {
                    return Err(ScanError::Native);
                }
                offset = next;
            }
        }
    }
}

#[cfg(not(windows))]
pub(crate) fn identity_of(_: &str) -> Result<crate::model::Identity, crate::error::ScanError> {
    Err(crate::error::ScanError::Unsupported)
}

#[cfg(not(windows))]
pub(crate) fn known_folders() -> Result<crate::model::KnownFolders, crate::error::ScanError> {
    Err(crate::error::ScanError::Unsupported)
}

#[cfg(not(windows))]
pub(crate) fn list_directory(
    path: &str,
    mut visit: impl FnMut(DirectoryEntry) -> bool,
) -> Result<(), crate::error::ScanError> {
    use crate::error::ScanError;
    for entry in std::fs::read_dir(path).map_err(|_| ScanError::Native)? {
        let entry = entry.map_err(|_| ScanError::Native)?;
        let meta = std::fs::symlink_metadata(entry.path()).map_err(|_| ScanError::Native)?;
        if !visit(DirectoryEntry {
            name: entry.file_name().to_str().map(str::to_string),
            attributes: if meta.is_symlink() {
                0x400
            } else if meta.is_dir() {
                0x10
            } else {
                0
            },
            len: meta.len(),
            mtime: meta.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH),
            creation: meta.created().unwrap_or(std::time::SystemTime::UNIX_EPOCH),
            allocation: meta.len(),
            reparse_tag: 0,
            identity: None, // Non-Windows counts every path's length.
        }) {
            break;
        }
    }
    Ok(())
}

#[cfg(not(windows))]
pub(crate) fn allocation_of(path: &str) -> Result<u64, crate::error::ScanError> {
    std::fs::symlink_metadata(path)
        .map(|m| m.len())
        .map_err(|_| crate::error::ScanError::Native)
}

#[cfg(not(windows))]
pub(crate) fn reparse_data(_: &str) -> Result<Vec<u8>, crate::error::ScanError> {
    Err(crate::error::ScanError::Unsupported)
}
