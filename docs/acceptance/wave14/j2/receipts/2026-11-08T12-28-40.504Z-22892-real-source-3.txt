//! Read-only junk scan engine. Directory names and metadata only.
#![deny(unsafe_code)]

mod error;
mod extras;
mod keys;
mod model;
#[allow(unsafe_code)]
mod native_windows;
mod plan;
mod scan;
mod snapshot;
mod templates;
mod util;

pub use error::ScanError;
pub use extras::{extras_from_json, extras_to_json, overview_from_json, overview_to_json};
pub use keys::normalize_key;
pub use model::{
    Category, ClusterInfo, ExtrasOptions, Group, Growth, Identity, InUse, Issue, Item, Junction,
    KnownFolders, Level, ScanExtras, ScanResult, Snapshot, SpaceEntry, SpaceOverview, TopKey,
};
pub use plan::{AgeBasis, Condition, KeepBy, ScanPlan};
pub use scan::{
    CancelToken, RootProgress, ScanObserver, ScanOptions, ScanProgress, identity_of, known_folders,
    result_from_json, result_to_json, scan, scan_full, space_overview,
};
pub use snapshot::{growth, snapshot, snapshot_from_json, snapshot_to_json};
pub use templates::name_template;
