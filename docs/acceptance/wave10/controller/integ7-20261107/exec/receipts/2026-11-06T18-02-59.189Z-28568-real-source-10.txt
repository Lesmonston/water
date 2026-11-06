#![forbid(unsafe_code)]

use crate::{Identity, Kind, RunStatus, SkipReason, VolumeReport};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct QuarantineTarget {
    pub base: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MoveStatus {
    Moved,
    Skipped,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MoveError {
    NotSameVolume,
    DestinationExists,
    QuarantineUnavailable,
    Locked,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MoveReport {
    pub item_id: String,
    pub status: MoveStatus,
    pub skip_reason: Option<SkipReason>,
    pub move_error: Option<MoveError>,
    pub error_code: Option<u32>,
    pub destination: Option<String>,
    pub identity: Option<Identity>,
    pub bytes: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct QuarantineReport {
    pub report_version: String,
    pub quarantine_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub status: RunStatus,
    pub moved_bytes: String,
    pub items: Vec<MoveReport>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RestoreRequest {
    pub rel: String,
    pub identity: Identity,
    pub to: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RestoreStatus {
    Restored,
    Skipped,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RestoreError {
    Gone,
    Changed,
    ParentReparse,
    DestinationExists,
    Locked,
    NotSameVolume,
    Cancelled,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RestoreItem {
    pub rel: String,
    pub status: RestoreStatus,
    pub reason: Option<RestoreError>,
    pub error_code: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RestoreReport {
    pub report_version: String,
    pub quarantine_dir: String,
    pub started_at: String,
    pub ended_at: String,
    pub status: RunStatus,
    pub items: Vec<RestoreItem>,
    pub dir_removed: bool,
    pub root_removed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeftoverReason {
    InUse,
    AccessDenied,
    Reparse,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Leftover {
    pub rel: String,
    pub kind: Kind,
    pub bytes: String,
    pub reason: LeftoverReason,
    pub error_code: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PurgeReport {
    pub report_version: String,
    pub quarantine_dir: String,
    pub started_at: String,
    pub ended_at: String,
    pub status: RunStatus,
    pub volume: VolumeReport,
    pub freed_bytes: String,
    pub removed_entries: u64,
    pub remaining_entries: u64,
    pub remaining_bytes: String,
    pub leftovers: Vec<Leftover>,
    pub leftovers_truncated: bool,
    pub dir_removed: bool,
    pub root_removed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct QuarantineSummary {
    pub dir: String,
    pub quarantine_id: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct QuarantineList {
    pub list_version: String,
    pub root: String,
    pub state: String,
    pub quarantines: Vec<QuarantineSummary>,
    pub stray_entries: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeftoverHint {
    OddName,
    LongPath,
    ReadOnly,
    Reparse,
    AccessDenied,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HintEntry {
    pub rel: String,
    pub kind: Kind,
    pub bytes: String,
    pub hints: Vec<LeftoverHint>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct QuarantineInfo {
    pub info_version: String,
    pub dir: String,
    pub quarantine_id: String,
    pub exists: bool,
    pub total_bytes: String,
    pub disk_bytes: String,
    pub file_count: u64,
    pub dir_count: u64,
    pub hard_entries: Vec<HintEntry>,
    pub hard_truncated: bool,
}
