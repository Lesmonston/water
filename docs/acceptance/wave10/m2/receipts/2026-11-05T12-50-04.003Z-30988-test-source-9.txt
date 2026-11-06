#![forbid(unsafe_code)]

use crate::error::ScanError;
use crate::model::{Category, InUse, ItemType, Level};
use crate::util::{parse_rfc3339, path_eq, validate_abs_path};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Condition {
    ParentHasFile { name: String },
    ParentHasOtherEntries { except: Vec<String> },
    NoAncestorSuffix { suffixes: Vec<String> },
    PathHasAny { names: Vec<String> },
    ParentHasOtherMatch,
    ParentHasFileMatching { pattern: String },
    ParentLacksFileMatching { pattern: String },
    SiblingWithoutSuffix { suffixes: Vec<String> },
}

fn deserialize_conditions<'de, D>(deserializer: D) -> Result<Vec<Condition>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let conditions = Vec::<Condition>::deserialize(deserializer)?;
    if conditions.is_empty() {
        return Err(serde::de::Error::custom("conditions must not be empty"));
    }
    Ok(conditions)
}

fn deserialize_fallback<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    String::deserialize(deserializer).map(Some)
}

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
    DirNamePattern {
        patterns: Vec<String>,
    },
    FileName {
        patterns: Vec<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Match {
    Pattern {
        base: String,
        segments: Vec<String>,
        #[serde(
            default,
            skip_serializing_if = "Vec::is_empty",
            deserialize_with = "deserialize_conditions"
        )]
        conditions: Vec<Condition>,
    },
    Marker {
        root: String,
        marker: Marker,
        max_depth: u32,
        #[serde(
            default,
            skip_serializing_if = "Vec::is_empty",
            deserialize_with = "deserialize_conditions"
        )]
        conditions: Vec<Condition>,
        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            deserialize_with = "deserialize_fallback"
        )]
        fallback_for: Option<String>,
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
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub git_is_copy: bool,
    #[serde(default, skip_serializing_if = "AgeBasis::is_default")]
    pub age_basis: AgeBasis,
    #[serde(default, skip_serializing_if = "KeepBy::is_default")]
    pub keep_by: KeepBy,
    #[serde(
        default,
        skip_serializing_if = "Vec::is_empty",
        deserialize_with = "deserialize_unlocks"
    )]
    pub unlocks_target_ids: Vec<String>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgeBasis {
    #[default]
    Modified,
    LatestCreatedOrModified,
}
impl AgeBasis {
    fn is_default(&self) -> bool {
        *self == Self::Modified
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KeepBy {
    #[default]
    Activity,
    VersionName,
}
impl KeepBy {
    fn is_default(&self) -> bool {
        *self == Self::Activity
    }
}

fn deserialize_unlocks<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Vec<String>, D::Error> {
    let ids = Vec::<String>::deserialize(d)?;
    if ids.is_empty() {
        return Err(serde::de::Error::custom("empty unlocks"));
    }
    Ok(ids)
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
        validate_fallbacks(&doc.targets)?;
        for target in &doc.targets {
            let mut seen = HashSet::new();
            for id in &target.unlocks_target_ids {
                if !target.level.cleanable()
                    || id == &target.target_id
                    || !seen.insert(id)
                    || !doc
                        .targets
                        .iter()
                        .any(|t| &t.target_id == id && t.level == Level::Protected)
                {
                    return Err(ScanError::InvalidPlan);
                }
            }
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
    if (target.git_is_copy && !target.level.cleanable())
        || (target.keep_by == KeepBy::VersionName && target.keep_newest == 0)
        || target.in_use.root_levels.is_some_and(|n| {
            !(1..=6).contains(&n) || target.in_use.mode != "runs_from_or_references_item"
        })
    {
        return Err(ScanError::InvalidPlan);
    }
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
        Match::Pattern {
            base,
            segments,
            conditions,
        } => {
            validate_abs_path(base)?;
            if !(1..=8).contains(&segments.len()) {
                return Err(ScanError::InvalidPlan);
            }
            for segment in segments {
                validate_segment(segment)?;
            }
            if !conditions.is_empty() {
                if target.category != Category::Custom
                    || !matches!(&conditions[..], [Condition::SiblingWithoutSuffix { .. }])
                {
                    return Err(ScanError::InvalidPlan);
                }
                validate_conditions(conditions)?;
            }
        }
        Match::Marker {
            root,
            marker,
            max_depth,
            conditions,
            fallback_for,
        } => {
            validate_abs_path(root)?;
            if !(1..=16).contains(max_depth) {
                return Err(ScanError::InvalidPlan);
            }
            validate_marker(marker)?;
            if matches!(marker, Marker::FileName { .. }) && target.item_type == ItemType::Dir {
                return Err(ScanError::InvalidPlan);
            }
            if !conditions.is_empty() {
                if target.category != Category::Custom || fallback_for.is_some() {
                    return Err(ScanError::InvalidPlan);
                }
                validate_conditions(conditions)?;
                for c in conditions {
                    if matches!(c, Condition::ParentHasOtherMatch)
                        && !matches!(
                            marker,
                            Marker::DirName { .. }
                                | Marker::DirNamePattern { .. }
                                | Marker::FileName { .. }
                        )
                    {
                        return Err(ScanError::InvalidPlan);
                    }
                    if matches!(marker, Marker::FileName { .. })
                        && !matches!(
                            c,
                            Condition::ParentHasFile { .. }
                                | Condition::ParentHasFileMatching { .. }
                                | Condition::ParentLacksFileMatching { .. }
                                | Condition::PathHasAny { .. }
                                | Condition::NoAncestorSuffix { .. }
                                | Condition::SiblingWithoutSuffix { .. }
                        )
                    {
                        return Err(ScanError::InvalidPlan);
                    }
                }
            }
        }
        Match::Discovery { root } => validate_abs_path(root)?,
    }
    Ok(())
}

fn validate_conditions(conditions: &[Condition]) -> Result<(), ScanError> {
    if !(1..=4).contains(&conditions.len()) {
        return Err(ScanError::InvalidPlan);
    }
    let mut kinds = HashSet::new();
    for condition in conditions {
        if !kinds.insert(std::mem::discriminant(condition)) {
            return Err(ScanError::InvalidPlan);
        }
        match condition {
            Condition::ParentHasFile { name } => validate_condition_name(name)?,
            Condition::ParentHasOtherMatch => {}
            Condition::ParentHasFileMatching { pattern }
            | Condition::ParentLacksFileMatching { pattern } => {
                if !(1..=64).contains(&pattern.chars().count()) {
                    return Err(ScanError::InvalidPlan);
                }
                validate_segment(pattern)?;
            }
            Condition::ParentHasOtherEntries { except: names }
            | Condition::NoAncestorSuffix { suffixes: names }
            | Condition::PathHasAny { names }
            | Condition::SiblingWithoutSuffix { suffixes: names } => {
                if !(1..=16).contains(&names.len()) {
                    return Err(ScanError::InvalidPlan);
                }
                let mut unique = HashSet::new();
                for name in names {
                    validate_condition_name(name)?;
                    if !unique.insert(name.to_ascii_lowercase()) {
                        return Err(ScanError::InvalidPlan);
                    }
                }
            }
        }
    }
    Ok(())
}

fn validate_condition_name(name: &str) -> Result<(), ScanError> {
    if !(1..=64).contains(&name.len())
        || name == "."
        || name == ".."
        || !name.bytes().all(|byte| (0x21..=0x7e).contains(&byte))
        || name.contains(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])
    {
        return Err(ScanError::InvalidPlan);
    }
    Ok(())
}

fn validate_fallbacks(targets: &[Target]) -> Result<(), ScanError> {
    let mut backed = HashSet::new();
    for target in targets {
        let Match::Marker {
            root,
            marker,
            max_depth,
            fallback_for: Some(reference),
            ..
        } = &target.match_spec
        else {
            continue;
        };
        if reference == &target.target_id || !backed.insert(reference) {
            return Err(ScanError::InvalidPlan);
        }
        let mut matches = targets.iter().filter(|t| &t.target_id == reference);
        let main = matches.next().ok_or(ScanError::InvalidPlan)?;
        if matches.next().is_some() {
            return Err(ScanError::InvalidPlan);
        }
        let Match::Marker {
            root: main_root,
            marker: main_marker,
            max_depth: main_depth,
            conditions,
            fallback_for: None,
        } = &main.match_spec
        else {
            return Err(ScanError::InvalidPlan);
        };
        if conditions.is_empty()
            || !path_eq(root, main_root)
            || marker != main_marker
            || max_depth != main_depth
        {
            return Err(ScanError::InvalidPlan);
        }
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
        Marker::DirNamePattern { patterns } | Marker::FileName { patterns } => {
            if !(1..=8).contains(&patterns.len()) {
                return Err(ScanError::InvalidPlan);
            }
            let mut seen = HashSet::new();
            for p in patterns {
                validate_segment(p)?;
                if !seen.insert(p.to_ascii_lowercase()) {
                    return Err(ScanError::InvalidPlan);
                }
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
