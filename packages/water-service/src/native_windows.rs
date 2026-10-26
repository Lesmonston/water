#![deny(unsafe_op_in_unsafe_fn)]

unsafe extern "system" {
    fn GetLogicalDrives() -> u32;
}

pub fn drive_mask() -> u32 {
    // SAFETY: GetLogicalDrives takes no arguments and only returns a bit mask.
    unsafe { GetLogicalDrives() }
}
