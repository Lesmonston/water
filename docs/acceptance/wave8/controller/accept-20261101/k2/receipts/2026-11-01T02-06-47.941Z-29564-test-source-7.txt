use crate::error::RulesError;
use crate::folders::{KnownFolders, validate_guard_path};
use crate::rules::RuleSet;
use crate::types::{
    Category, InUse, InUseMode, ItemType, KNOWN_FOLDER_ORDER, Level, Locator, Marker, MatchSpec,
    as_str, as_u64, bounded_u32, expect_keys, field, object, valid_abs_path, valid_created_at,
    valid_data_version, valid_entry_name, valid_process_name, valid_root_id, valid_segment,
};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CustomRoot {
    pub root_id: String,
    pub path: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Target {
    pub target_id: String,
    pub group_id: String,
    pub rule_id: String,
    pub level: Level,
    pub category: Category,
    pub match_spec: MatchSpec,
    pub item_type: ItemType,
    pub min_age_hours: u32,
    pub keep_newest: u32,
    pub in_use: InUse,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanPlan {
    pub plan_version: String,
    pub rules_data_version: String,
    pub created_at: String,
    pub targets: Vec<Target>,
    pub hard_guards: Vec<String>,
}

impl ScanPlan {
    pub fn from_json(input: &str) -> Result<Self, RulesError> {
        let value: Value =
            serde_json::from_str(input).map_err(|_| RulesError::new("RULES_INVALID_JSON", "/"))?;
        parse_plan(&value)
    }
}

#[derive(Serialize)]
struct PlanWire<'a> {
    plan_version: &'a str,
    rules_data_version: &'a str,
    created_at: &'a str,
    targets: Vec<TargetWire<'a>>,
    hard_guards: &'a [String],
}

#[derive(Serialize)]
struct TargetWire<'a> {
    target_id: &'a str,
    group_id: &'a str,
    rule_id: &'a str,
    level: &'a str,
    category: &'a str,
    #[serde(rename = "match")]
    match_spec: MatchWire<'a>,
    item_type: &'a str,
    min_age_hours: u32,
    keep_newest: u32,
    in_use: InUseWire<'a>,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum MatchWire<'a> {
    Pattern {
        base: &'a str,
        segments: &'a [String],
    },
    Marker {
        root: &'a str,
        marker: MarkerWire<'a>,
        max_depth: u32,
    },
    Discovery {
        root: &'a str,
    },
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum MarkerWire<'a> {
    File {
        name: &'a str,
        min_bytes: u64,
        max_bytes: u64,
    },
    ChildrenAll {
        names: &'a [String],
    },
    DirName {
        names: &'a [String],
    },
}

#[derive(Serialize)]
struct InUseWire<'a> {
    mode: &'a str,
    processes: &'a [String],
}

pub fn resolve_plan(
    rules: &RuleSet,
    folders: &KnownFolders,
    custom_roots: &[CustomRoot],
    created_at: &str,
) -> Result<ScanPlan, RulesError> {
    if !valid_created_at(created_at) {
        return Err(RulesError::new("RULES_INVALID_CREATED_AT", "/created_at"));
    }
    let mut seen_roots = HashSet::new();
    for (index, root) in custom_roots.iter().enumerate() {
        let path = format!("/custom_roots/{index}");
        if !valid_root_id(&root.root_id) {
            return Err(RulesError::new(
                "RULES_INVALID_ROOT_ID",
                format!("{path}/root_id"),
            ));
        }
        if !valid_abs_path(&root.path, true) {
            return Err(RulesError::new(
                "RULES_INVALID_PATH",
                format!("{path}/path"),
            ));
        }
        if !seen_roots.insert(root.root_id.clone()) {
            return Err(RulesError::new("RULES_DUPLICATE_ID", path));
        }
    }
    let mut targets = Vec::new();
    for rule in rules.rules() {
        for (offset, locator) in rule.locate.iter().enumerate() {
            let index = offset + 1;
            match locator {
                Locator::Pattern { base, segments } => targets.push(make_target(
                    rule,
                    format!("{}#{index}", rule.rule_id),
                    rule.rule_id.clone(),
                    MatchSpec::Pattern {
                        base: folders.get(*base).to_string(),
                        segments: segments.clone(),
                    },
                )),
                Locator::Discovery { base } => targets.push(make_target(
                    rule,
                    format!("{}#{index}", rule.rule_id),
                    rule.rule_id.clone(),
                    MatchSpec::Discovery {
                        root: folders.get(*base).to_string(),
                    },
                )),
                Locator::Marker { marker, max_depth } => {
                    for root in custom_roots {
                        let group_id = format!("custom:{}:{}", root.root_id, rule.rule_id);
                        targets.push(make_target(
                            rule,
                            format!("{group_id}#{index}"),
                            group_id,
                            MatchSpec::Marker {
                                root: root.path.clone(),
                                marker: marker.clone(),
                                max_depth: *max_depth,
                            },
                        ));
                    }
                }
            }
        }
    }
    Ok(ScanPlan {
        plan_version: "water.scan-plan.v1".to_string(),
        rules_data_version: rules.data_version.clone(),
        created_at: created_at.to_string(),
        targets,
        hard_guards: collect_hard_guards(folders, custom_roots),
    })
}

fn make_target(
    rule: &crate::rules::Rule,
    target_id: String,
    group_id: String,
    match_spec: MatchSpec,
) -> Target {
    Target {
        target_id,
        group_id,
        rule_id: rule.rule_id.clone(),
        level: rule.level,
        category: rule.category,
        match_spec,
        item_type: rule.item_type,
        min_age_hours: rule.min_age_hours,
        keep_newest: rule.keep_newest,
        in_use: rule.in_use.clone(),
    }
}

fn collect_hard_guards(folders: &KnownFolders, custom_roots: &[CustomRoot]) -> Vec<String> {
    let mut guards = Vec::new();
    let mut seen = HashSet::new();
    let mut push = |path: String| {
        let key = path.to_ascii_lowercase();
        if seen.insert(key) {
            guards.push(path);
        }
    };
    for folder in KNOWN_FOLDER_ORDER {
        push(folders.get(folder).to_string());
    }
    for root in folders.drive_roots() {
        push(root);
    }
    for root in custom_roots {
        push(root.path.clone());
    }
    guards
}

pub fn plan_to_json(plan: &ScanPlan) -> String {
    let targets = plan
        .targets
        .iter()
        .map(|target| TargetWire {
            target_id: &target.target_id,
            group_id: &target.group_id,
            rule_id: &target.rule_id,
            level: target.level.as_str(),
            category: target.category.as_str(),
            match_spec: match_wire(&target.match_spec),
            item_type: target.item_type.as_str(),
            min_age_hours: target.min_age_hours,
            keep_newest: target.keep_newest,
            in_use: InUseWire {
                mode: target.in_use.mode.as_str(),
                processes: &target.in_use.processes,
            },
        })
        .collect();
    let wire = PlanWire {
        plan_version: &plan.plan_version,
        rules_data_version: &plan.rules_data_version,
        created_at: &plan.created_at,
        targets,
        hard_guards: &plan.hard_guards,
    };
    serde_json::to_string(&wire).expect("scan plan serialization")
}

fn match_wire<'a>(spec: &'a MatchSpec) -> MatchWire<'a> {
    match spec {
        MatchSpec::Pattern { base, segments } => MatchWire::Pattern { base, segments },
        MatchSpec::Marker {
            root,
            marker,
            max_depth,
        } => MatchWire::Marker {
            root,
            marker: marker_wire(marker),
            max_depth: *max_depth,
        },
        MatchSpec::Discovery { root } => MatchWire::Discovery { root },
    }
}

fn marker_wire(marker: &Marker) -> MarkerWire<'_> {
    match marker {
        Marker::File {
            name,
            min_bytes,
            max_bytes,
        } => MarkerWire::File {
            name,
            min_bytes: *min_bytes,
            max_bytes: *max_bytes,
        },
        Marker::ChildrenAll { names } => MarkerWire::ChildrenAll { names },
        Marker::DirName { names } => MarkerWire::DirName { names },
    }
}

fn parse_plan(value: &Value) -> Result<ScanPlan, RulesError> {
    let map = object(value, "/")?;
    expect_keys(
        map,
        &[
            "plan_version",
            "rules_data_version",
            "created_at",
            "targets",
            "hard_guards",
        ],
        "/",
    )?;
    if as_str(field(map, "plan_version", "/")?, "/plan_version")? != "water.scan-plan.v1" {
        return Err(RulesError::new("RULES_INVALID_VERSION", "/plan_version"));
    }
    let rules_data_version = as_str(
        field(map, "rules_data_version", "/")?,
        "/rules_data_version",
    )?;
    if !valid_data_version(rules_data_version) {
        return Err(RulesError::new(
            "RULES_INVALID_DATA_VERSION",
            "/rules_data_version",
        ));
    }
    let created_at = as_str(field(map, "created_at", "/")?, "/created_at")?;
    if !valid_created_at(created_at) {
        return Err(RulesError::new("RULES_INVALID_CREATED_AT", "/created_at"));
    }
    let targets = parse_targets(field(map, "targets", "/")?, "/targets")?;
    let hard_guards = parse_hard_guards(field(map, "hard_guards", "/")?, "/hard_guards")?;
    Ok(ScanPlan {
        plan_version: "water.scan-plan.v1".to_string(),
        rules_data_version: rules_data_version.to_string(),
        created_at: created_at.to_string(),
        targets,
        hard_guards,
    })
}

fn parse_targets(value: &Value, path: &str) -> Result<Vec<Target>, RulesError> {
    let items = value
        .as_array()
        .ok_or_else(|| RulesError::new("RULES_INVALID_SHAPE", path))?;
    let mut targets = Vec::with_capacity(items.len());
    for (index, item) in items.iter().enumerate() {
        targets.push(parse_target(item, &format!("{path}/{index}"))?);
    }
    Ok(targets)
}

fn parse_target(value: &Value, path: &str) -> Result<Target, RulesError> {
    let map = object(value, path)?;
    expect_keys(
        map,
        &[
            "target_id",
            "group_id",
            "rule_id",
            "level",
            "category",
            "match",
            "item_type",
            "min_age_hours",
            "keep_newest",
            "in_use",
        ],
        path,
    )?;
    let target_id = as_str(field(map, "target_id", path)?, &format!("{path}/target_id"))?;
    let group_id = as_str(field(map, "group_id", path)?, &format!("{path}/group_id"))?;
    let rule_id = as_str(field(map, "rule_id", path)?, &format!("{path}/rule_id"))?;
    if target_id.is_empty() || group_id.is_empty() || rule_id.is_empty() {
        return Err(RulesError::new("RULES_INVALID_ID", path));
    }
    let level = Level::parse(as_str(
        field(map, "level", path)?,
        &format!("{path}/level"),
    )?)
    .ok_or_else(|| RulesError::new("RULES_INVALID_LEVEL", format!("{path}/level")))?;
    let category = Category::parse(as_str(
        field(map, "category", path)?,
        &format!("{path}/category"),
    )?)
    .ok_or_else(|| RulesError::new("RULES_INVALID_CATEGORY", format!("{path}/category")))?;
    let item_type = ItemType::parse(as_str(
        field(map, "item_type", path)?,
        &format!("{path}/item_type"),
    )?)
    .ok_or_else(|| RulesError::new("RULES_INVALID_ITEM_TYPE", format!("{path}/item_type")))?;
    Ok(Target {
        target_id: target_id.to_string(),
        group_id: group_id.to_string(),
        rule_id: rule_id.to_string(),
        level,
        category,
        match_spec: parse_match(field(map, "match", path)?, &format!("{path}/match"))?,
        item_type,
        min_age_hours: bounded_u32(
            field(map, "min_age_hours", path)?,
            0,
            8760,
            &format!("{path}/min_age_hours"),
        )?,
        keep_newest: bounded_u32(
            field(map, "keep_newest", path)?,
            0,
            8,
            &format!("{path}/keep_newest"),
        )?,
        in_use: parse_plan_in_use(field(map, "in_use", path)?, &format!("{path}/in_use"))?,
    })
}

fn parse_plan_in_use(value: &Value, path: &str) -> Result<InUse, RulesError> {
    let map = object(value, path)?;
    expect_keys(map, &["mode", "processes"], path)?;
    let mode = InUseMode::parse(as_str(field(map, "mode", path)?, &format!("{path}/mode"))?)
        .ok_or_else(|| RulesError::new("RULES_INVALID_IN_USE", format!("{path}/mode")))?;
    let items = field(map, "processes", path)?
        .as_array()
        .ok_or_else(|| RulesError::new("RULES_INVALID_IN_USE", format!("{path}/processes")))?;
    if items.len() > 8 {
        return Err(RulesError::new(
            "RULES_INVALID_IN_USE",
            format!("{path}/processes"),
        ));
    }
    let mut processes = Vec::with_capacity(items.len());
    for (index, item) in items.iter().enumerate() {
        let item_path = format!("{path}/processes/{index}");
        let name = as_str(item, &item_path)?;
        if !valid_process_name(name) {
            return Err(RulesError::new("RULES_INVALID_IN_USE", item_path));
        }
        processes.push(name.to_string());
    }
    match mode {
        InUseMode::None if processes.is_empty() => Ok(InUse { mode, processes }),
        InUseMode::None => Err(RulesError::new(
            "RULES_INVALID_IN_USE",
            format!("{path}/processes"),
        )),
        InUseMode::RunsFromOrReferencesItem => Ok(InUse { mode, processes }),
        _ if processes.is_empty() => Err(RulesError::new(
            "RULES_INVALID_IN_USE",
            format!("{path}/processes"),
        )),
        _ => Ok(InUse { mode, processes }),
    }
}

fn parse_match(value: &Value, path: &str) -> Result<MatchSpec, RulesError> {
    let map = object(value, path)?;
    let kind = as_str(field(map, "kind", path)?, &format!("{path}/kind"))?;
    match kind {
        "pattern" => {
            expect_keys(map, &["kind", "base", "segments"], path)?;
            let base = abs_path_field(map, "base", path, false)?;
            Ok(MatchSpec::Pattern {
                base,
                segments: parse_plan_segments(
                    field(map, "segments", path)?,
                    &format!("{path}/segments"),
                )?,
            })
        }
        "discovery" => {
            expect_keys(map, &["kind", "root"], path)?;
            Ok(MatchSpec::Discovery {
                root: abs_path_field(map, "root", path, false)?,
            })
        }
        "marker" => {
            expect_keys(map, &["kind", "root", "marker", "max_depth"], path)?;
            Ok(MatchSpec::Marker {
                root: abs_path_field(map, "root", path, true)?,
                marker: parse_plan_marker(field(map, "marker", path)?, &format!("{path}/marker"))?,
                max_depth: bounded_u32(
                    field(map, "max_depth", path)?,
                    1,
                    16,
                    &format!("{path}/max_depth"),
                )?,
            })
        }
        _ => Err(RulesError::new(
            "RULES_INVALID_LOCATE",
            format!("{path}/kind"),
        )),
    }
}

fn abs_path_field(
    map: &Map<String, Value>,
    key: &str,
    parent: &str,
    allow_drive_root: bool,
) -> Result<String, RulesError> {
    let path = format!("{parent}/{key}");
    let text = as_str(field(map, key, parent)?, &path)?;
    if allow_drive_root {
        validate_guard_path(text, &path)?;
    } else if !valid_abs_path(text, false) {
        return Err(RulesError::new("RULES_INVALID_PATH", path));
    }
    Ok(text.to_string())
}

fn parse_plan_segments(value: &Value, path: &str) -> Result<Vec<String>, RulesError> {
    let items = value
        .as_array()
        .ok_or_else(|| RulesError::new("RULES_INVALID_LOCATE", path))?;
    if items.is_empty() || items.len() > 8 {
        return Err(RulesError::new("RULES_INVALID_LOCATE", path));
    }
    let mut segments = Vec::with_capacity(items.len());
    for (index, item) in items.iter().enumerate() {
        let item_path = format!("{path}/{index}");
        let segment = as_str(item, &item_path)?;
        if !valid_segment(segment) {
            return Err(RulesError::new("RULES_INVALID_LOCATE", item_path));
        }
        segments.push(segment.to_string());
    }
    Ok(segments)
}

fn parse_plan_marker(value: &Value, path: &str) -> Result<Marker, RulesError> {
    let map = object(value, path)?;
    let kind = as_str(field(map, "kind", path)?, &format!("{path}/kind"))?;
    match kind {
        "file" => {
            expect_keys(map, &["kind", "name", "min_bytes", "max_bytes"], path)?;
            let name = as_str(field(map, "name", path)?, &format!("{path}/name"))?;
            if !valid_entry_name(name) {
                return Err(RulesError::new(
                    "RULES_INVALID_LOCATE",
                    format!("{path}/name"),
                ));
            }
            let min_bytes = as_u64(field(map, "min_bytes", path)?, &format!("{path}/min_bytes"))?;
            let max_bytes = as_u64(field(map, "max_bytes", path)?, &format!("{path}/max_bytes"))?;
            if min_bytes > max_bytes {
                return Err(RulesError::new(
                    "RULES_INVALID_LOCATE",
                    format!("{path}/max_bytes"),
                ));
            }
            Ok(Marker::File {
                name: name.to_string(),
                min_bytes,
                max_bytes,
            })
        }
        "children_all" => {
            expect_keys(map, &["kind", "names"], path)?;
            Ok(Marker::ChildrenAll {
                names: parse_plan_names(field(map, "names", path)?, &format!("{path}/names"))?,
            })
        }
        "dir_name" => {
            expect_keys(map, &["kind", "names"], path)?;
            Ok(Marker::DirName {
                names: parse_plan_names(field(map, "names", path)?, &format!("{path}/names"))?,
            })
        }
        _ => Err(RulesError::new(
            "RULES_INVALID_LOCATE",
            format!("{path}/kind"),
        )),
    }
}

fn parse_plan_names(value: &Value, path: &str) -> Result<Vec<String>, RulesError> {
    let items = value
        .as_array()
        .ok_or_else(|| RulesError::new("RULES_INVALID_LOCATE", path))?;
    if items.is_empty() || items.len() > 8 {
        return Err(RulesError::new("RULES_INVALID_LOCATE", path));
    }
    let mut names = Vec::with_capacity(items.len());
    for (index, item) in items.iter().enumerate() {
        let item_path = format!("{path}/{index}");
        let name = as_str(item, &item_path)?;
        if !valid_entry_name(name) {
            return Err(RulesError::new("RULES_INVALID_LOCATE", item_path));
        }
        names.push(name.to_string());
    }
    Ok(names)
}

fn parse_hard_guards(value: &Value, path: &str) -> Result<Vec<String>, RulesError> {
    let items = value
        .as_array()
        .ok_or_else(|| RulesError::new("RULES_INVALID_SHAPE", path))?;
    let mut guards = Vec::with_capacity(items.len());
    for (index, item) in items.iter().enumerate() {
        let item_path = format!("{path}/{index}");
        let text = as_str(item, &item_path)?;
        validate_guard_path(text, &item_path)?;
        guards.push(text.to_string());
    }
    Ok(guards)
}
