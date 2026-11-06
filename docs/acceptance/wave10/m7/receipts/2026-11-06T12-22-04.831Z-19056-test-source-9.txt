#![deny(unsafe_op_in_unsafe_fn)]

use crate::{DriveInfo, util};
use std::time::SystemTime;

#[repr(C)]
#[derive(Default)]
struct NativeTime {
    year: u16,
    month: u16,
    weekday: u16,
    day: u16,
    hour: u16,
    minute: u16,
    second: u16,
    millis: u16,
}

#[repr(C)]
struct RecycleInfo {
    size: u32,
    bytes: i64,
    items: i64,
}

#[link(name = "kernel32")]
#[link(name = "shell32")]
unsafe extern "system" {
    fn SHQueryRecycleBinW(root: *const u16, info: *mut RecycleInfo) -> i32;
    fn GetVolumeInformationW(
        root: *const u16,
        volume_name: *mut u16,
        volume_name_size: u32,
        serial: *mut u32,
        max_component: *mut u32,
        flags: *mut u32,
        file_system: *mut u16,
        file_system_size: u32,
    ) -> i32;
    fn GetLogicalDrives() -> u32;
    fn GetDriveTypeW(root: *const u16) -> u32;
    fn GetDiskFreeSpaceExW(
        root: *const u16,
        available: *mut u64,
        total: *mut u64,
        free: *mut u64,
    ) -> i32;
    fn SystemTimeToTzSpecificLocalTime(
        zone: *const std::ffi::c_void,
        utc: *const NativeTime,
        local: *mut NativeTime,
    ) -> i32;
}

const _: () = assert!(std::mem::size_of::<NativeTime>() == 16);

pub(crate) fn recycle_bin(root: &str) -> Option<u64> {
    if root.len() != 3
        || !root.as_bytes()[0].is_ascii_alphabetic()
        || &root.as_bytes()[1..] != b":\\"
    {
        return None;
    }
    let wide: Vec<_> = root.encode_utf16().chain([0]).collect();
    let mut info = RecycleInfo {
        size: std::mem::size_of::<RecycleInfo>() as u32,
        bytes: 0,
        items: 0,
    };
    // SAFETY: root is a live terminated UTF-16 drive root, and info has the SHQUERYRBINFO ABI and size.
    (unsafe { SHQueryRecycleBinW(wide.as_ptr(), &mut info) } >= 0)
        .then(|| u64::try_from(info.bytes).ok())
        .flatten()
}

pub(crate) fn quarantine_stamp(at: SystemTime) -> String {
    let [year, month, day, hour, minute, second] = util::parts(at);
    let utc = NativeTime {
        year,
        month,
        day,
        hour,
        minute,
        second,
        ..Default::default()
    };
    let mut local = NativeTime::default();
    // SAFETY: null selects the current time zone; both SYSTEMTIME buffers are live and correctly sized.
    let t = if unsafe { SystemTimeToTzSpecificLocalTime(std::ptr::null(), &utc, &mut local) } != 0 {
        &local
    } else {
        &utc
    };
    format!(
        "{:04}{:02}{:02}-{:02}{:02}{:02}",
        t.year, t.month, t.day, t.hour, t.minute, t.second
    )
}

pub(crate) fn volume_file_system(root: &str) -> Option<String> {
    if root.len() != 3
        || !root.as_bytes()[0].is_ascii_alphabetic()
        || &root.as_bytes()[1..] != b":\\"
    {
        return None;
    }
    let wide: Vec<u16> = root.encode_utf16().chain([0]).collect();
    let mut name = [0u16; 64];
    // SAFETY: root is live NUL-terminated UTF-16; the output buffer has the stated
    // capacity. All unused optional outputs are null. This only queries volume metadata.
    let ok = unsafe {
        GetVolumeInformationW(
            wide.as_ptr(),
            std::ptr::null_mut(),
            0,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            name.as_mut_ptr(),
            name.len() as u32,
        )
    };
    if ok == 0 {
        return None;
    }
    String::from_utf16(&name[..name.iter().position(|c| *c == 0)?]).ok()
}

pub(crate) fn drives(system: Option<&str>) -> Vec<DriveInfo> {
    // SAFETY: no pointers or preconditions for this read-only drive mask query.
    let mask = unsafe { GetLogicalDrives() };
    let mut out = Vec::new();
    for index in 0..26 {
        if mask & (1 << index) == 0 {
            continue;
        }
        let root = format!("{}:\\", char::from(b'A' + index));
        let wide: Vec<u16> = root.encode_utf16().chain([0]).collect();
        // SAFETY: wide is a live, null-terminated UTF-16 root string.
        if unsafe { GetDriveTypeW(wide.as_ptr()) } != 3 {
            continue;
        }
        let (mut available, mut total, mut free) = (0, 0, 0);
        // SAFETY: all outputs point to live u64 storage, and the root string remains live.
        if unsafe { GetDiskFreeSpaceExW(wide.as_ptr(), &mut available, &mut total, &mut free) } != 0
        {
            out.push(DriveInfo {
                is_system: system.is_some_and(|s| s.eq_ignore_ascii_case(&root)),
                root,
                total_bytes: total,
                free_bytes: available,
            });
        }
    }
    out
}

pub(crate) fn local_date(at: SystemTime) -> (u32, u32) {
    let [year, month, day, hour, minute, second] = util::parts(at);
    let utc = NativeTime {
        year,
        month,
        day,
        hour,
        minute,
        second,
        ..Default::default()
    };
    let mut local = NativeTime::default();
    // SAFETY: null selects the current zone; input/output have the SYSTEMTIME ABI and live storage.
    if unsafe { SystemTimeToTzSpecificLocalTime(std::ptr::null(), &utc, &mut local) } != 0 {
        (u32::from(local.month), u32::from(local.day))
    } else {
        (u32::from(month), u32::from(day))
    }
}
