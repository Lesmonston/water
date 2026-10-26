#![forbid(unsafe_code)]

use crate::error::ScanError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Level {
    Recommended,
    Confirm,
    Advisory,
    Protected,
}

impl Level {
    pub fn rank(self) -> u8 {
        match self {
            Self::Recommended => 0,
            Self::Confirm => 1,
            Self::Advisory => 2,
            Self::Protected => 3,
        }
    }

    pub fn cleanable(self) -> bool {
        matches!(self, Self::Recommended | Self::Confirm)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Category {
    AgentTool,
    Browser,
    SystemTemp,
    AppLeftover,
    DevCache,
    CrashLog,
    GpuSystem,
    Custom,
    Unrecognized,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemType {
    Dir,
    File,
    Any,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct InUse {
    pub mode: String,
    pub processes: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct KnownFolders {
    pub known_folders_version: String,
    pub user_profile: String,
    pub local_app_data: String,
    pub roaming_app_data: String,
    pub user_temp: String,
    pub system_temp: String,
    pub windows: String,
    pub program_data: String,
    pub downloads: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Identity {
    pub volume_serial: String,
    pub file_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Issue {
    pub code: String,
    pub group_id: String,
    pub count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopKey {
    pub key: String,
    pub count: u64,
    pub bytes: String,
    pub newest_activity: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Group {
    pub group_id: String,
    pub rule_id: String,
    pub level: Level,
    pub category: Category,
    pub item_count: u64,
    pub eligible_count: u64,
    pub total_bytes: String,
    pub eligible_bytes: String,
    pub file_count: u64,
    pub oldest_activity: Option<String>,
    pub newest_activity: Option<String>,
    pub in_use: InUse,
    pub top_keys: Vec<TopKey>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Item {
    pub item_id: String,
    pub group_id: String,
    pub path: String,
    pub kind: String,
    pub total_bytes: String,
    pub file_count: u64,
    pub newest_activity: String,
    pub identity: Option<Identity>,
    pub eligible: bool,
    pub ineligible_reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ScanResult {
    pub result_version: String,
    pub scan_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub status: String,
    pub visited_entries: u64,
    pub groups: Vec<Group>,
    pub items: Vec<Item>,
    pub issues: Vec<Issue>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SnapshotGroup {
    pub total_bytes: String,
    pub item_count: u64,
    pub newest_activity: Option<String>,
    pub top_keys: Vec<TopKey>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    pub snapshot_version: String,
    pub scan_id: String,
    pub taken_at: String,
    pub groups: std::collections::BTreeMap<String, SnapshotGroup>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Growth {
    pub group_id: String,
    pub bytes_delta: String,
    pub count_delta: i64,
    pub days: f64,
    pub bytes_per_day: String,
    pub leak_suspect: bool,
}

pub fn to_json<T: Serialize>(value: &T) -> Result<String, ScanError> {
    serde_json::to_string(value).map_err(|_| ScanError::InvalidResult)
}

pub fn from_json<'a, T: Deserialize<'a>>(text: &'a str) -> Result<T, ScanError> {
    serde_json::from_str(text).map_err(|_| ScanError::InvalidResult)
}
