//! Read-only directory identity observations; no authorization or traversal.
#![deny(unsafe_code)]

#[cfg(windows)]
#[allow(unsafe_code)]
mod native_windows;
mod path;
pub mod v1;
