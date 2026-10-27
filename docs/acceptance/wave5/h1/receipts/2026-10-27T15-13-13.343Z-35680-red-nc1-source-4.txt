#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fmt};

use crate::{path, time};

const MAX_COUNT: u64 = (1 << 53) - 1;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CleanError {
    InvalidPlan,
    Native,
    Unsupported,
    Journal,
    Overflow,
}

impl fmt::Display for CleanError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::InvalidPlan => "invalid clean plan",
            Self::Native => "filesystem operation failed",
            Self::Unsupported => "unsupported platform",
            Self::Journal => "journal write failed",
            Self::Overflow => "clean byte count overflow",
        })
    }
}
impl std::error::Error for CleanError {}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Identity {
    pub volume_serial: String,
    pub file_id: String,
}

impl Identity {
    fn valid(&self) -> bool {
        self.volume_serial.len() == 8
            && self.file_id.len() == 32
            && self
                .volume_serial
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'A'..=b'F').contains(&b))
            && self
                .file_id
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Level {
    Recommended,
    Confirm,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Kind {
    Dir,
    File,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PlanItem {
    pub item_id: String,
    pub group_id: String,
    pub rule_id: String,
    pub level: Level,
    pub path: String,
    pub root: String,
    pub kind: Kind,
    pub identity: Identity,
    pub total_bytes: String,
    pub min_age_hours: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CleanPlan {
    pub plan_version: String,
    pub plan_id: String,
    pub created_at: String,
    pub items: Vec<PlanItem>,
    pub protected_paths: Vec<String>,
    pub hard_guards: Vec<String>,
}

impl CleanPlan {
    pub fn from_json(s: &str) -> Result<Self, CleanError> {
        let plan: Self = serde_json::from_str(s).map_err(|_| CleanError::InvalidPlan)?;
        plan.validate_shape()?;
        for item in &plan.items {
            if !path::strictly_contains(&item.root, &item.path)
                || plan
                    .hard_guards
                    .iter()
                    .any(|p| path::contains(&item.path, p))
                || plan
                    .protected_paths
                    .iter()
                    .any(|p| path::overlaps(&item.path, p))
            {
                return Err(CleanError::InvalidPlan);
            }
        }
        Ok(plan)
    }

    pub(crate) fn validate_shape(&self) -> Result<(), CleanError> {
        if self.plan_version != "water.clean-plan.v1"
            || self.plan_id.is_empty()
            || !time::valid(&self.created_at)
            || self.items.len() as u64 > MAX_COUNT
        {
            return Err(CleanError::InvalidPlan);
        }
        let mut ids = HashSet::new();
        for item in &self.items {
            if item.item_id.is_empty()
                || item.group_id.is_empty()
                || item.rule_id.is_empty()
                || !ids.insert(&item.item_id)
                || !item.identity.valid()
                || item.min_age_hours > MAX_COUNT
            {
                return Err(CleanError::InvalidPlan);
            }
            path::validate(&item.path)?;
            path::validate(&item.root)?;
            decimal(&item.total_bytes)?;
        }
        for p in self.protected_paths.iter().chain(&self.hard_guards) {
            path::validate(p)?;
        }
        self.estimate()?;
        Ok(())
    }

    pub(crate) fn estimate(&self) -> Result<u64, CleanError> {
        self.items.iter().try_fold(0u64, |n, i| {
            n.checked_add(decimal(&i.total_bytes)?)
                .ok_or(CleanError::InvalidPlan)
        })
    }
}

fn decimal(s: &str) -> Result<u64, CleanError> {
    if s.is_empty() || !s.bytes().all(|b| b.is_ascii_digit()) {
        return Err(CleanError::InvalidPlan);
    }
    s.parse().map_err(|_| CleanError::InvalidPlan)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemStatus {
    Deleted,
    Partial,
    Skipped,
    Failed,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkipReason {
    Gone,
    Changed,
    Reparse,
    OutsideRoot,
    Guarded,
    ProtectedOverlap,
    InUse,
    TooRecent,
    Cancelled,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Completed,
    Stopped,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ItemReport {
    pub item_id: String,
    pub status: ItemStatus,
    pub skip_reason: Option<SkipReason>,
    pub bytes_before: String,
    pub bytes_freed: String,
    pub failed_entries: u64,
}
impl ItemReport {
    pub(crate) fn skipped(item: &PlanItem, reason: SkipReason) -> Self {
        Self {
            item_id: item.item_id.clone(),
            status: ItemStatus::Skipped,
            skip_reason: Some(reason),
            bytes_before: "0".into(),
            bytes_freed: "0".into(),
            failed_entries: 0,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct VolumeReport {
    pub root: String,
    pub free_before: String,
    pub free_after: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CleanReport {
    pub report_version: String,
    pub plan_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub status: RunStatus,
    pub freed_bytes: String,
    pub estimate_bytes: String,
    pub volumes: Vec<VolumeReport>,
    pub items: Vec<ItemReport>,
}
