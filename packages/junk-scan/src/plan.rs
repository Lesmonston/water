#![forbid(unsafe_code)]

use crate::error::ScanError;
use crate::model::{Category, InUse, ItemType, Level};
use crate::util::{parse_rfc3339, validate_abs_path};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Marker {
    File {
        name: String,
        min_bytes: u64,
        max_bytes: u64,
    },
    ChildrenAll {
        names: Vec<String>,
    },
    DirName {
        names: Vec<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Match {
    Pattern {
        base: String,
        segments: Vec<String>,
    },
    Marker {
        root: String,
        marker: Marker,
        max_depth: u32,
    },
    Discovery {
        root: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Target {
    pub target_id: String,
    pub group_id: String,
    pub rule_id: String,
    pub level: Level,
    pub category: Category,
    #[serde(rename = "match")]
    pub match_spec: Match,
    pub item_type: ItemType,
    pub min_age_hours: u64,
    pub keep_newest: u64,
    pub in_use: InUse,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct PlanDoc {
    plan_version: String,
    rules_data_version: String,
    created_at: String,
    targets: Vec<Target>,
    hard_guards: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanPlan {
    pub rules_data_version: String,
    pub created_at: String,
    pub targets: Vec<Target>,
    pub hard_guards: Vec<String>,
}

impl ScanPlan {
    pub fn from_json(text: &str) -> Result<Self, ScanError> {
        let doc: PlanDoc = serde_json::from_str(text).map_err(|_| ScanError::InvalidPlan)?;
        if doc.plan_version != "water.scan-plan.v1" {
            return Err(ScanError::InvalidPlan);
        }
        parse_rfc3339(&doc.created_at).map_err(|_| ScanError::InvalidPlan)?;
        for guard in &doc.hard_guards {
            validate_abs_path(guard)?;
        }
        for target in &doc.targets {
            validate_target(target)?;
        }
        Ok(Self {
            rules_data_version: doc.rules_data_version,
            created_at: doc.created_at,
            targets: doc.targets,
            hard_guards: doc.hard_guards,
        })
    }
}

fn validate_target(target: &Target) -> Result<(), ScanError> {
    if target.target_id.is_empty() || target.group_id.is_empty() || target.rule_id.is_empty() {
        return Err(ScanError::InvalidPlan);
    }
    if !matches!(
        target.in_use.mode.as_str(),
        "none" | "process_running" | "cmdline_references_item" | "runs_from_or_references_item"
    ) {
        return Err(ScanError::InvalidPlan);
    }
    match &target.match_spec {
        Match::Pattern { base, segments } => {
            validate_abs_path(base)?;
            if !(1..=8).contains(&segments.len()) {
                return Err(ScanError::InvalidPlan);
            }
            for segment in segments {
                validate_segment(segment)?;
            }
        }
        Match::Marker {
            root,
            marker,
            max_depth,
        } => {
            validate_abs_path(root)?;
            if !(1..=16).contains(max_depth) {
                return Err(ScanError::InvalidPlan);
            }
            validate_marker(marker)?;
        }
        Match::Discovery { root } => validate_abs_path(root)?,
    }
    Ok(())
}

fn validate_segment(segment: &str) -> Result<(), ScanError> {
    if segment.is_empty() || segment == "." || segment == ".." {
        return Err(ScanError::InvalidPlan);
    }
    if segment.contains(['\\', '/', ':']) {
        return Err(ScanError::InvalidPlan);
    }
    Ok(())
}

fn validate_name(name: &str) -> Result<(), ScanError> {
    if name.is_empty() || name.contains(['\\', '/', ':']) {
        return Err(ScanError::InvalidPlan);
    }
    Ok(())
}

fn validate_marker(marker: &Marker) -> Result<(), ScanError> {
    match marker {
        Marker::File {
            name,
            min_bytes,
            max_bytes,
        } => {
            validate_name(name)?;
            if max_bytes < min_bytes {
                return Err(ScanError::InvalidPlan);
            }
        }
        Marker::ChildrenAll { names } | Marker::DirName { names } => {
            if names.is_empty() || names.len() > 8 {
                return Err(ScanError::InvalidPlan);
            }
            for name in names {
                validate_name(name)?;
            }
        }
    }
    Ok(())
}

pub fn match_segment(pattern: &str, name: &str) -> bool {
    let pat: Vec<char> = pattern.chars().collect();
    let nam: Vec<char> = name.chars().collect();
    match_chars(&pat, &nam)
}

fn fold(c: char) -> char {
    if c.is_ascii_uppercase() {
        c.to_ascii_lowercase()
    } else {
        c
    }
}

fn match_chars(pat: &[char], name: &[char]) -> bool {
    if pat.is_empty() {
        return name.is_empty();
    }
    match pat[0] {
        '*' => match_chars(&pat[1..], name) || (!name.is_empty() && match_chars(pat, &name[1..])),
        '?' => !name.is_empty() && match_chars(&pat[1..], &name[1..]),
        '#' => {
            if name.is_empty() || !name[0].is_ascii_digit() {
                return false;
            }
            let mut end = 1;
            while end <= name.len() {
                if name[..end].iter().all(|c| c.is_ascii_digit())
                    && match_chars(&pat[1..], &name[end..])
                {
                    return true;
                }
                if end == name.len() || !name[end].is_ascii_digit() {
                    break;
                }
                end += 1;
            }
            false
        }
        other => {
            !name.is_empty() && fold(name[0]) == fold(other) && match_chars(&pat[1..], &name[1..])
        }
    }
}
