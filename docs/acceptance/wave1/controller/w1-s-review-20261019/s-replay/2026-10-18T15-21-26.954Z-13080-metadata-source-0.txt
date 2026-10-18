//! A native directory choice registered with the trusted in-process host.
#![deny(unsafe_code)]

#[cfg(all(target_os = "windows", target_arch = "x86_64"))]
#[allow(unsafe_code)]
mod native_windows;
pub mod v1;
