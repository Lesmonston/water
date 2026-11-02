//! Read-only junk scan engine. Directory names and metadata only.
#![deny(unsafe_code)]

mod error;
mod keys;
mod model;
#[allow(unsafe_code)]
mod native_windows;
mod plan;
mod scan;
mod snapshot;
mod util;

pub use error::ScanError;
pub use keys::normalize_key;
pub use model::{
    Category, Group, Growth, Identity, InUse, Issue, Item, KnownFolders, Level, ScanResult,
    Snapshot, TopKey,
};
pub use plan::{Condition, ScanPlan};
pub use scan::{
    CancelToken, ScanObserver, ScanOptions, ScanProgress, identity_of, known_folders,
    result_from_json, result_to_json, scan,
};
pub use snapshot::{growth, snapshot, snapshot_from_json, snapshot_to_json};
