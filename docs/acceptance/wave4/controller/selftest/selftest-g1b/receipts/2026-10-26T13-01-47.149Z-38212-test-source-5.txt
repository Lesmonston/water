#![deny(unsafe_op_in_unsafe_fn)]

use crate::{CleanError, Identity, ItemReport, ItemStatus, Kind, PlanItem, SkipReason, StopFlag};
use std::time::SystemTime;

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct Snapshot {
    pub bytes: u64,
    pub newest: SystemTime,
    entries: Vec<(String, u64, SystemTime, u32)>,
}

impl Snapshot {
    /// SELFTEST STUB: every path recorded in the snapshot, the item itself included.
    pub(crate) fn paths(&self) -> impl Iterator<Item = &str> {
        self.entries.iter().map(|e| e.0.as_str())
    }
}

#[cfg(windows)]
mod windows {
    use super::*;
    use crate::path;
    use std::{
        ffi::c_void,
        fs, io,
        mem::{align_of, size_of},
        os::windows::fs::MetadataExt,
        ptr,
    };

    const DIRECTORY: u32 = 0x10;
    const REPARSE: u32 = 0x400;

    #[repr(C)]
    struct FileIdInfo {
        volume_serial: u64,
        file_id: [u8; 16],
    }
    const _: () = assert!(size_of::<FileIdInfo>() == 24 && align_of::<FileIdInfo>() == 8);

    // SAFETY: these declarations use Win32's system ABI and pointer/DWORD/BOOL widths.
    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn CreateFileW(
            name: *const u16,
            access: u32,
            sharing: u32,
            security: *const c_void,
            disposition: u32,
            flags: u32,
            template: *mut c_void,
        ) -> *mut c_void;
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
        fn GetDiskFreeSpaceExW(
            path: *const u16,
            available: *mut u64,
            total: *mut u64,
            free: *mut u64,
        ) -> i32;
        fn CloseHandle(handle: *mut c_void) -> i32;
        fn SetFileInformationByHandle(
            handle: *mut c_void,
            class: i32,
            buffer: *mut c_void,
            size: u32,
        ) -> i32;
    }

    /// SELFTEST STUB: paths past MAX_PATH need the verbatim prefix for CreateFileW.
    fn wide(path: &str) -> Vec<u16> {
        let spelled = if path.len() >= 240 {
            format!(r"\\?\{path}")
        } else {
            path.to_owned()
        };
        spelled.encode_utf16().chain(Some(0)).collect()
    }

    fn open(path: &str, access: u32, flags: u32) -> Option<Handle> {
        let name = wide(path);
        // SAFETY: NUL-terminated name, null security/template, OPEN_EXISTING only (SELFTEST STUB).
        let raw = unsafe {
            CreateFileW(
                name.as_ptr(),
                access,
                7,
                ptr::null(),
                3,
                flags,
                ptr::null_mut(),
            )
        };
        (raw as isize != -1 && !raw.is_null()).then_some(Handle(raw))
    }

    /// SELFTEST STUB: the reparse tag of a reparse point, read without following it.
    pub(crate) fn reparse_tag(path: &str) -> Option<u32> {
        let handle = open(path, 0x80, 0x02000000 | 0x00200000)?;
        let mut info = [0u32; 2];
        // SAFETY: class 9 (FileAttributeTagInfo) writes two DWORDs into this buffer.
        let ok = unsafe { GetFileInformationByHandleEx(handle.0, 9, info.as_mut_ptr().cast(), 8) };
        (ok != 0).then_some(info[1])
    }

    /// SELFTEST STUB: identity of what a guard path really points to (links followed).
    pub(crate) fn follow_identity(path: &str) -> Option<Identity> {
        let handle = open(path, 0x80, 0x02000000)?;
        handle_identity(&handle).ok()
    }

    /// SELFTEST STUB: POSIX delete that ignores the read-only attribute, by handle.
    fn delete_by_handle(path: &str) -> bool {
        let Some(handle) = open(path, 0x10000, 0x02000000 | 0x00200000) else {
            return false;
        };
        let mut flags: u32 = 0x1 | 0x2 | 0x10;
        // SAFETY: class 21 (FileDispositionInfoEx) reads one DWORD of flags.
        unsafe { SetFileInformationByHandle(handle.0, 21, (&mut flags as *mut u32).cast(), 4) != 0 }
    }

    struct Handle(*mut c_void);
    impl Drop for Handle {
        fn drop(&mut self) {
            // SAFETY: this wrapper owns exactly one successful CreateFileW handle.
            unsafe {
                CloseHandle(self.0);
            }
        }
    }

    pub(crate) fn identity(path: &str) -> Result<Identity, CleanError> {
        let name = wide(path);
        // SAFETY: the NUL-terminated name lives across the call; security/template are null.
        // Only FILE_READ_ATTRIBUTES, full sharing, OPEN_EXISTING, BACKUP_SEMANTICS and
        // OPEN_REPARSE_POINT are requested. No file data or write access is acquired.
        let raw = unsafe {
            CreateFileW(
                name.as_ptr(),
                0x80,
                7,
                ptr::null(),
                3,
                0x02000000 | 0x00200000,
                ptr::null_mut(),
            )
        };
        if raw as isize == -1 || raw.is_null() {
            return Err(CleanError::Native);
        }
        handle_identity(&Handle(raw))
    }

    fn handle_identity(handle: &Handle) -> Result<Identity, CleanError> {
        let mut id = FileIdInfo {
            volume_serial: 0,
            file_id: [0; 16],
        };
        // SAFETY: class 18 is FileIdInfo, writing this initialized/aligned 24-byte buffer.
        let ok = unsafe {
            GetFileInformationByHandleEx(
                handle.0,
                18,
                (&mut id as *mut FileIdInfo).cast(),
                size_of::<FileIdInfo>() as u32,
            )
        };
        if ok == 0 {
            return Err(CleanError::Native);
        }
        let mut serial = 0u32;
        // SAFETY: handle is live, the DWORD serial output is valid, unused optional outputs
        // are null and their buffer sizes are zero. This obtains the MODEL's 8-digit serial.
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
            return Err(CleanError::Native);
        }
        Ok(Identity {
            volume_serial: format!("{serial:08X}"),
            file_id: id.file_id.iter().map(|b| format!("{b:02x}")).collect(),
        })
    }

    pub(crate) fn volume_free(path: &str) -> Result<u64, CleanError> {
        let name: Vec<u16> = path.encode_utf16().chain(Some(0)).collect();
        let mut available = 0u64;
        // SAFETY: name is NUL-terminated and available is a writable ULARGE_INTEGER-sized
        // output. Other optional outputs are null. This reads current-user available space.
        let ok = unsafe {
            GetDiskFreeSpaceExW(
                name.as_ptr(),
                &mut available,
                ptr::null_mut(),
                ptr::null_mut(),
            )
        };
        if ok == 0 {
            Err(CleanError::Native)
        } else {
            Ok(available)
        }
    }

    fn metadata(path: &str) -> Result<fs::Metadata, SkipReason> {
        fs::symlink_metadata(path).map_err(|e| {
            if e.kind() == io::ErrorKind::NotFound {
                SkipReason::Gone
            } else {
                SkipReason::Changed
            }
        })
    }

    pub(crate) fn check_chain(item: &PlanItem) -> Result<(), SkipReason> {
        check_chain_impl(item) // NC3: all callers use this single containment/reparse gate.
    }

    fn check_chain_impl(item: &PlanItem) -> Result<(), SkipReason> {
        if !path::strictly_contains(&item.root, &item.path) {
            return Err(SkipReason::OutsideRoot);
        }
        // Check ancestors of root as well: an otherwise ordinary root can sit behind a junction.
        let mut current = item.path[..3].to_owned();
        let mut levels = vec![current.clone()];
        for segment in item.path[3..].split('\\') {
            if !current.ends_with('\\') {
                current.push('\\');
            }
            current.push_str(segment);
            levels.push(current.clone());
        }
        for current in levels {
            let last = current.eq_ignore_ascii_case(&item.path);
            let meta = metadata(&current)?;
            if meta.file_attributes() & REPARSE != 0 {
                return Err(if last {
                    SkipReason::Reparse
                } else {
                    SkipReason::OutsideRoot
                });
            }
            if if last {
                match item.kind {
                    Kind::Dir => !meta.is_dir(),
                    Kind::File => !meta.is_file(),
                }
            } else {
                !meta.is_dir()
            } {
                return Err(SkipReason::Changed);
            }
        }
        Ok(())
    }

    fn children(path: &str) -> Result<Vec<String>, SkipReason> {
        let mut paths = Vec::new();
        for entry in fs::read_dir(path).map_err(|_| SkipReason::Changed)? {
            let p = entry.map_err(|_| SkipReason::Changed)?.path();
            // Unrepresentable names are protected; no lossy spelling ever reaches deletion.
            let name = p.to_str().ok_or(SkipReason::Changed)?.to_owned();
            path::validate(&name).map_err(|_| SkipReason::Changed)?;
            paths.push(name);
        }
        paths.sort();
        Ok(paths)
    }

    pub(crate) fn snapshot(path: &str, protected: &[String]) -> Result<Snapshot, SkipReason> {
        let mut result = Snapshot {
            bytes: 0,
            newest: SystemTime::UNIX_EPOCH,
            entries: Vec::new(),
        };
        let mut pending = vec![path.to_owned()];
        while let Some(current) = pending.pop() {
            if protected.iter().any(|p| path::overlaps(&current, p)) {
                return Err(SkipReason::ProtectedOverlap);
            }
            let meta = metadata(&current)?;
            let attributes = meta.file_attributes();
            // SELFTEST STUB: only name-surrogate reparse points (links) may be removed; any other
            // reparse point (cloud placeholder, unknown tag) stops the whole item.
            if attributes & REPARSE != 0
                && reparse_tag(&current).is_none_or(|tag| tag & 0x2000_0000 == 0)
            {
                return Err(SkipReason::Reparse);
            }
            let modified = meta.modified().map_err(|_| SkipReason::Changed)?;
            result.newest = result.newest.max(modified);
            let bytes = if attributes & REPARSE == 0 && meta.is_file() {
                meta.len()
            } else {
                0
            };
            result.bytes = result.bytes.checked_add(bytes).ok_or(SkipReason::Changed)?;
            result
                .entries
                .push((current.clone(), bytes, modified, attributes));
            if attributes & REPARSE == 0 && meta.is_dir() {
                pending.extend(children(&current)?);
            }
        }
        result.entries.sort_by(|a, b| a.0.cmp(&b.0));
        Ok(result)
    }

    fn unlink(path: &str, meta: &fs::Metadata) -> io::Result<()> {
        if meta.file_attributes() & DIRECTORY != 0 {
            return fs::remove_dir(path);
        }
        // SELFTEST STUB: files go through a by-handle POSIX delete that ignores read-only.
        if delete_by_handle(path) {
            return Ok(());
        }
        match fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(error)
                if error.kind() == io::ErrorKind::PermissionDenied
                    && meta.permissions().readonly()
                    && meta.file_attributes() & REPARSE == 0 =>
            {
                // Re-read immediately before changing attributes; never change a link target.
                let latest = fs::symlink_metadata(path)?;
                if latest.file_attributes() & REPARSE != 0 || !latest.is_file() {
                    return Err(error);
                }
                let mut permissions = latest.permissions();
                // Windows-only: this clears FILE_ATTRIBUTE_READONLY, never a Unix mode.
                #[allow(clippy::permissions_set_readonly_false)]
                permissions.set_readonly(false);
                fs::set_permissions(path, permissions)?;
                fs::remove_file(path)
            }
            Err(error) => Err(error),
        }
    }

    fn is_link(meta: &fs::Metadata) -> bool {
        meta.file_attributes() & REPARSE != 0 // NC2: a link inside the item is never entered.
    }

    /// Every level from the item down to a listed directory must still be a plain directory,
    /// and that directory must keep the identity recorded when it was enumerated.
    fn listed_parent_intact(item: &PlanItem, dir: &str, recorded: &Identity) -> bool {
        if !path::contains(&item.path, dir) {
            return false;
        }
        let mut level = item.path.clone();
        let mut levels = vec![level.clone()];
        for segment in dir[item.path.len()..].split('\\').filter(|s| !s.is_empty()) {
            level.push('\\');
            level.push_str(segment);
            levels.push(level.clone());
        }
        for level in &levels {
            match fs::symlink_metadata(level) {
                Ok(meta) if !is_link(&meta) && meta.file_attributes() & DIRECTORY != 0 => {}
                _ => return false,
            }
        }
        matches!(crate::identity_of(dir), Ok(actual) if actual == *recorded)
    }

    /// Returns the item report and whether a stop signal cut the removal short.
    pub(crate) fn delete(
        item: &PlanItem,
        before: &Snapshot,
        stop: &StopFlag,
    ) -> (ItemReport, bool) {
        // Directories enumerated so far, each with the identity recorded when it was listed.
        let mut listed: Vec<(String, Identity)> = Vec::new();
        let mut pending: Vec<(String, bool, Option<usize>)> =
            vec![(item.path.clone(), false, None)];
        let mut removed = 0u64;
        let mut failed = 0u64;
        let mut interrupted = false;
        while let Some((current, postorder, parent)) = pending.pop() {
            if stop.is_stopped() {
                interrupted = true;
                break;
            }
            // Catch a swapped root or item between individual operations as well.
            if check_chain(item).is_err() {
                failed += 1;
                break;
            }
            // A listed directory replaced after enumeration (e.g. by a junction) ends this item:
            // nothing else inside it is touched.
            if let Some(index) = parent {
                let (dir, recorded) = &listed[index];
                if !listed_parent_intact(item, dir, recorded) {
                    failed += 1;
                    break;
                }
            }
            let meta = match metadata(&current) {
                Ok(m) => m,
                Err(_) => {
                    failed += 1;
                    continue;
                }
            };
            if is_link(&meta) {
                // Only the link itself is removed; its target is never enumerated.
                match unlink(&current, &meta) {
                    Ok(()) => removed += 1,
                    Err(_) => failed += 1,
                }
            } else if meta.file_attributes() & DIRECTORY != 0 && !postorder {
                let Ok(recorded) = crate::identity_of(&current) else {
                    failed += 1;
                    break;
                };
                match children(&current) {
                    Ok(kids) => {
                        // The listing must belong to the directory whose identity was recorded.
                        if !matches!(crate::identity_of(&current), Ok(again) if again == recorded) {
                            failed += 1;
                            break;
                        }
                        listed.push((current.clone(), recorded));
                        let index = listed.len() - 1;
                        pending.push((current, true, parent));
                        pending.extend(kids.into_iter().rev().map(|p| (p, false, Some(index))));
                        continue;
                    }
                    Err(_) => {
                        failed += 1;
                        continue;
                    }
                }
            } else {
                match unlink(&current, &meta) {
                    Ok(()) => removed += 1,
                    Err(_) => failed += 1,
                }
            }
            if stop.is_stopped() {
                interrupted = !pending.is_empty();
                break;
            }
        }
        let residual = match fs::symlink_metadata(&item.path) {
            Err(e) if e.kind() == io::ErrorKind::NotFound => None,
            Ok(m) if m.file_attributes() & REPARSE == 0 => match snapshot(&item.path, &[]) {
                Ok(s) => Some(s.bytes),
                Err(_) => {
                    failed += 1;
                    Some(before.bytes)
                }
            },
            _ => {
                failed += 1;
                Some(before.bytes)
            }
        };
        let status = if residual.is_none() {
            ItemStatus::Deleted
        } else if removed > 0 {
            ItemStatus::Partial
        } else if interrupted {
            ItemStatus::Skipped
        } else {
            ItemStatus::Failed
        };
        let cancelled = status == ItemStatus::Skipped;
        let freed = if cancelled {
            0
        } else {
            before.bytes.saturating_sub(residual.unwrap_or(0))
        };
        let report = ItemReport {
            item_id: item.item_id.clone(),
            status,
            skip_reason: cancelled.then_some(SkipReason::Cancelled),
            bytes_before: before.bytes.to_string(),
            bytes_freed: freed.to_string(),
            failed_entries: failed,
        };
        (report, interrupted)
    }
}

#[cfg(windows)]
pub(crate) use windows::{check_chain, delete, follow_identity, identity, snapshot, volume_free};

#[cfg(not(windows))]
pub(crate) fn identity(_: &str) -> Result<Identity, CleanError> {
    Err(CleanError::Unsupported)
}
#[cfg(not(windows))]
pub(crate) fn volume_free(_: &str) -> Result<u64, CleanError> {
    Err(CleanError::Unsupported)
}
#[cfg(not(windows))]
pub(crate) fn check_chain(_: &PlanItem) -> Result<(), SkipReason> {
    Err(SkipReason::Changed)
}
#[cfg(not(windows))]
pub(crate) fn snapshot(_: &str, _: &[String]) -> Result<Snapshot, SkipReason> {
    Err(SkipReason::Changed)
}
#[cfg(not(windows))]
pub(crate) fn delete(item: &PlanItem, _: &Snapshot, _: &StopFlag) -> (ItemReport, bool) {
    (ItemReport::skipped(item, SkipReason::Changed), false)
}
