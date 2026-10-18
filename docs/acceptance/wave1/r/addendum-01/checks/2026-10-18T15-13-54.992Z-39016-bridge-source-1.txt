//! Permit-bound read-only native metadata; full output retains identifiers.
#![deny(unsafe_code)]

mod decode;
#[cfg(all(windows, target_arch = "x86_64"))]
#[allow(unsafe_code)]
mod native_windows;
mod output;
pub mod v1;
#[cfg(all(windows, target_arch = "x86_64"))]
mod walk;
