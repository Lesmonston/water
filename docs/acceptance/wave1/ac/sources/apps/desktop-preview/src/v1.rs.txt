//! Initial fail-closed skeleton shared by the executable and boundary tests.
//! Dependency initialization is blocked; policy behavior is not implemented or verified.

use std::fmt;

pub const PREVIEW_CONFIG: &str = include_str!("../tauri.conf.json");
pub const PREVIEW_HTML: &str = include_str!("../frontend/index.html");
pub const PREVIEW_CSS: &str = include_str!("../frontend/styles.css");

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PreviewError;

impl fmt::Display for PreviewError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Desktop preview unavailable.")
    }
}

impl std::error::Error for PreviewError {}

pub fn validate_preview_config(_raw: &str) -> Result<(), PreviewError> {
    Err(PreviewError)
}

pub fn is_bundled_navigation(_url: &str) -> bool {
    false
}
