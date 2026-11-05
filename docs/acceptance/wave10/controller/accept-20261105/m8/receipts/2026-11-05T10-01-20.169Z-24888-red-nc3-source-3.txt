#![deny(unsafe_code)]

mod sha256;
pub use sha256::sha256_hex;
#[cfg(windows)]
#[allow(unsafe_code)]
mod native_windows;
#[cfg(windows)]
mod scan;
mod util;

use serde::{Deserialize, Serialize};
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};
use std::time::SystemTime;

#[derive(Clone, Default)]
pub struct CancelFlag(Arc<AtomicBool>);
impl CancelFlag {
    pub fn cancel(&self) {
        self.0.store(true, Ordering::Release);
    }
    pub fn is_cancelled(&self) -> bool {
        self.0.load(Ordering::Acquire)
    }
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DupOptions {
    pub roots: Vec<String>,
    pub min_bytes: u64,
    pub prefer: Vec<String>,
    pub protected: Vec<String>,
}
impl Default for DupOptions {
    fn default() -> Self {
        Self {
            roots: Vec::new(),
            min_bytes: 1024 * 1024,
            prefer: Vec::new(),
            protected: Vec::new(),
        }
    }
}
pub trait DupObserver: Sync {
    fn on_progress(&self, p: &DupProgress);
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DupProgress {
    pub phase: String,
    pub files_listed: u64,
    pub candidate_files: u64,
    pub bytes_to_hash: u64,
    pub bytes_hashed: u64,
    pub found_bytes: u64,
    pub current: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DupError {
    InvalidOptions,
    Unsupported,
    Json,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DupResult {
    pub dup_version: String,
    pub scan_id: String,
    pub roots: Vec<String>,
    pub started_at: String,
    pub ended_at: String,
    pub status: String,
    pub files_listed: u64,
    pub candidate_files: u64,
    pub hashed_bytes: String,
    pub groups: Vec<DupGroup>,
    pub groups_truncated: bool,
    pub same_name_different: u64,
    pub skipped: Skipped,
    pub issues: Vec<DupIssue>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DupGroup {
    pub group_id: String,
    pub size: String,
    pub hash: String,
    pub copies: Vec<DupCopy>,
    pub keep_index: usize,
    pub reclaimable_bytes: String,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DupCopy {
    pub path: String,
    pub mtime: String,
    pub created: String,
    pub identity: String,
    pub hard_link_paths: Vec<String>,
    pub link_count: u32,
    pub protected: bool,
    pub preferred: bool,
    pub export_tail: bool,
    pub removable: bool,
}
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Skipped {
    pub reparse: u64,
    pub offline: u64,
    pub access_denied: u64,
    pub locked: u64,
    pub changed: u64,
    pub small: u64,
    pub empty: u64,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DupIssue {
    pub path: String,
    pub kind: String,
}

pub fn find_duplicates(
    scan_id: &str,
    options: &DupOptions,
    cancel: &CancelFlag,
    observer: &dyn DupObserver,
    now: SystemTime,
) -> Result<DupResult, DupError> {
    util::validate(scan_id, options)?;
    #[cfg(windows)]
    {
        Ok(scan::run(scan_id, options, cancel, observer, now))
    }
    #[cfg(not(windows))]
    {
        let _ = (cancel, observer, now);
        Err(DupError::Unsupported)
    }
}
pub fn result_to_json(r: &DupResult) -> String {
    serde_json::to_string(r).expect("result contains only JSON serializable fields")
}
pub fn result_from_json(s: &str) -> Result<DupResult, DupError> {
    serde_json::from_str(s).map_err(|_| DupError::Json)
}
