//! Additional consent for a fixed, read-only root manifest observation.
#![deny(unsafe_code)]

#[cfg(all(windows, target_arch = "x86_64"))]
mod native_windows;

pub mod v1;
