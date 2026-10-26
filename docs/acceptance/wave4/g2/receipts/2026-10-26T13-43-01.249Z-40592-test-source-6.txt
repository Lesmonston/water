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

#[link(name = "kernel32")]
unsafe extern "system" {
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
