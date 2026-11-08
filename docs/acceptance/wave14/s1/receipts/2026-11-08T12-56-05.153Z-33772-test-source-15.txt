#![forbid(unsafe_code)]

use crate::{
    IN_USE_UNKNOWN, Platform, language,
    service::{Record, Settings},
    util,
};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use water_junk_rules::RuleSet;
use water_junk_scan::{Group, Growth, Level, ScanResult};

pub(crate) const CATEGORIES: [(&str, &str, &str, &str); 9] = [
    (
        "agent_tool",
        "AI 编程工具",
        "Codex · Claude · Cursor · grok",
        "Claude Code、Codex、Cursor、grok 等的临时目录、升级残留与旧版本",
    ),
    (
        "browser",
        "浏览器",
        "Chrome · Edge · 只清缓存，不动登录信息",
        "Chrome、Edge、Brave、Firefox 的缓存；从不清理登录信息与网站数据",
    ),
    (
        "system_temp",
        "系统临时文件",
        "Windows 与用户临时目录",
        "Windows 与用户临时目录中 7 天前的文件",
    ),
    (
        "app_leftover",
        "应用更新与安装包",
        "安装程序、更新残留与应用缓存",
        "下载文件夹里的安装程序、应用更新残留",
    ),
    (
        "dev_cache",
        "开发缓存",
        "npm · Cargo · Playwright 等",
        "npm、pip、Cargo、Gradle、Playwright 等",
    ),
    (
        "crash_log",
        "崩溃与日志",
        "崩溃转储与错误报告",
        "崩溃转储、错误报告、应用日志",
    ),
    (
        "gpu_system",
        "显卡与系统缓存",
        "着色器缓存与缩略图",
        "显卡着色器缓存与系统缩略图",
    ),
    (
        "custom",
        "你加的位置",
        "只识别带缓存标记的构建目录与测试配置",
        "",
    ),
    ("unrecognized", "未识别", "只显示占用，不可清理", ""),
];

pub(crate) fn category(g: &Group) -> String {
    use water_junk_scan::Category::*;
    match g.category {
        AgentTool => "agent_tool",
        Browser => "browser",
        SystemTemp => "system_temp",
        AppLeftover => "app_leftover",
        DevCache => "dev_cache",
        CrashLog => "crash_log",
        GpuSystem => "gpu_system",
        Custom => "custom",
        Unrecognized => "unrecognized",
    }
    .into()
}

pub(crate) fn enabled(settings: &Settings, category: &str) -> bool {
    settings.categories.get(category).copied().unwrap_or(true)
}

fn unit(rules: &RuleSet, group: &Group) -> &'static str {
    match rules.rule(&group.rule_id).map(|r| r.item_type) {
        Some(water_junk_rules::ItemType::Dir) => "目录",
        Some(water_junk_rules::ItemType::File) => "文件",
        _ => "项",
    }
}

fn text(record: &Record, g: &Group, rules: &RuleSet) -> Option<water_junk_rules::RuleText> {
    if let Some(text) = rules.text(&g.group_id) {
        return Some(text);
    }
    if let Some(cluster) = &g.cluster {
        return Some(water_junk_rules::RuleText {
            title_zh: format!(
                "{} · {}",
                crate::m35::name(&cluster.parent),
                cluster.template
            ),
            title_en: format!("{} · {}", crate::m35::name(&cluster.parent), cluster.template),
            owner_zh: "所在项目".into(),
            owner_en: "Containing project".into(),
            what_zh: "同一位置里反复生成、名字模板相同的临时条目。".into(),
            why_zh: "只按名字、数量、体量与时间聚类，仍需你确认。".into(),
            after_zh: "清理存量前，请先核对生产者；不修复还会再次累积。".into(),
            fix_hint_zh: Some("先找出生成它们的代码并修好，再清存量。".into()),
            what_en: "Temporary items with the same name pattern, repeatedly created in one location.".into(),
            why_en: "Grouped by name, count, size, and time. Your review is still needed.".into(),
            after_en: "Check the producer before cleaning existing items. They will accumulate again until it is fixed.".into(),
            fix_hint_en: Some("Find and fix the code that creates these items, then clean the existing items.".into()),
        });
    }
    let id = g.rule_id.strip_prefix("decl:")?;
    let base = record
        .plan
        .targets
        .iter()
        .find(|t| t.group_id == g.group_id)
        .and_then(|t| match &t.match_spec {
            water_junk_rules::MatchSpec::Pattern { base, .. } => Some(base.as_str()),
            _ => None,
        })?;
    let declaration = record.saved["declarations"].as_array()?.iter().find(|d| {
        d["path"]
            .as_str()
            .is_some_and(|p| crate::m35::parent(p).eq_ignore_ascii_case(base))
    })?;
    let entry = declaration["manifest"]["disposable"]
        .as_array()?
        .iter()
        .find(|d| d["id"] == id)?;
    Some(water_junk_rules::RuleText {
        title_zh: entry["title"].as_str()?.into(),
        owner_zh: declaration["manifest"]["project"]
            .as_str()
            .unwrap_or("项目声明")
            .into(),
        what_zh: "项目声明中列出的可清理产物。".into(),
        why_zh: "你已信任此版本的项目声明；保护、身份和在用检查仍然生效。".into(),
        after_zh: "先放进同盘隔离区，核对后可还原或永久删除。".into(),
        fix_hint_zh: None,
        title_en: entry["title"].as_str()?.into(),
        owner_en: declaration["manifest"]["project"].as_str().unwrap_or("Project declaration").into(),
        what_en: "Cleanable output listed in the project declaration.".into(),
        why_en: "You trusted this version of the project declaration. Protection, identity, and in-use checks still apply.".into(),
        after_en: "Move to quarantine on the same drive first. After reviewing, restore or permanently delete it.".into(),
        fix_hint_en: None,
    })
}

fn custom_path(record: &Record, group_id: &str) -> String {
    record
        .plan
        .targets
        .iter()
        .find(|t| t.group_id == group_id)
        .and_then(|t| match &t.match_spec {
            water_junk_rules::MatchSpec::Marker { root, .. }
            | water_junk_rules::MatchSpec::Discovery { root } => Some(root.clone()),
            _ => None,
        })
        .unwrap_or_default()
}

pub(crate) fn in_use_spec(group: &Group) -> water_process_scan::InUseSpec {
    use water_junk_rules::InUseMode as RuleMode;
    use water_process_scan::InUseMode;
    let mode = match RuleMode::parse(&group.in_use.mode).expect("validated scan in-use mode") {
        RuleMode::None => InUseMode::None,
        RuleMode::ProcessRunning => InUseMode::ProcessRunning,
        RuleMode::CmdlineReferencesItem => InUseMode::CmdlineReferencesItem,
        RuleMode::RunsFromOrReferencesItem => InUseMode::RunsFromOrReferencesItem,
    };
    water_process_scan::InUseSpec {
        mode,
        processes: group.in_use.processes.clone(),
    }
}

/// Product names shown for well-known processes (SERVICE-HARDENING §7); others drop `.exe`.
const PRODUCT_NAMES: [(&str, &str); 6] = [
    ("chrome.exe", "Chrome"),
    ("msedge.exe", "Edge"),
    ("brave.exe", "Brave"),
    ("firefox.exe", "Firefox"),
    ("claude.exe", "Claude"),
    ("chrome-headless-shell.exe", "Chrome 无头浏览器"),
];

/// Decided once per scan, inside that scan's in-use batch, and saved with the record.
/// Views never ask the platform again; a missing snapshot is kept as "in use, unknown".
pub(crate) fn scan_in_use(result: &ScanResult, platform: &dyn Platform) -> (Value, Value) {
    let mut saved = serde_json::Map::new();
    let mut items = serde_json::Map::new();
    for g in &result.groups {
        let spec = in_use_spec(g);
        match spec.mode {
            water_process_scan::InUseMode::None => continue,
            water_process_scan::InUseMode::ProcessRunning
            | water_process_scan::InUseMode::CmdlineReferencesItem
            | water_process_scan::InUseMode::RunsFromOrReferencesItem => {}
        }
        let mut first = None;
        let mut count = 0;
        let mut unknown = false;
        for item in result
            .items
            .iter()
            .filter(|i| i.group_id == g.group_id && i.eligible)
        {
            if let Some(name) = platform.in_use(
                &spec,
                &crate::m35::in_use_path(&item.path, g.in_use.root_levels),
            ) {
                count += 1;
                unknown |= name == IN_USE_UNKNOWN;
                let label = product_name(&name);
                items.insert(item.item_id.clone(), json!({"process_label_en": if name == IN_USE_UNKNOWN { UNKNOWN_TEXT_EN.to_owned() } else { format!("{} is in use", product_name_en(&name)) },"process_label_zh": if name == IN_USE_UNKNOWN { UNKNOWN_TEXT.to_owned() } else { format!("{label} 正在使用") }}));
                first.get_or_insert(label);
            }
        }
        if let Some(label) = first {
            saved.insert(g.group_id.clone(), json!({"process_label_en":if unknown { UNKNOWN_TEXT_EN.to_owned() } else {format!("{} is running; {} will be skipped", product_name_en(&label), language::count(count,"in-use item","in-use items"))},"process_label_zh":if unknown { UNKNOWN_TEXT.to_owned() } else { format!("{label} 正在运行，将跳过 {count} 个占用的项") },"item_count":count}));
        }
    }
    (Value::Object(saved), Value::Object(items))
}

pub(crate) const UNKNOWN_TEXT_EN: &str =
    "Cannot confirm whether it is running. Cleaning will check again";
const UNKNOWN_TEXT: &str = "暂时无法确认是否在运行，清理时会再次检查";

pub(crate) fn skipped(item: &water_junk_scan::Item, settings: &Settings) -> bool {
    item.eligible && settings.skipped.iter().any(|v| v.matches(item))
}

fn eligible(item: &water_junk_scan::Item, settings: &Settings) -> bool {
    item.eligible && !skipped(item, settings)
}

/// Immutable scan facts stay in Record. These indexes and the bounded detail
/// projection allow a skip to update only matching items and group summaries.
#[derive(Default)]
pub(crate) struct Projection {
    pub view: Value,
    pub details: BTreeMap<String, Value>,
    summary_rows: BTreeMap<String, std::sync::Arc<Vec<crate::conclusion::Row>>>,
    items_by_group: BTreeMap<String, Vec<usize>>,
    ids: HashMap<String, usize>,
    paths: BTreeMap<String, Vec<usize>>,
    positions: BTreeMap<String, (usize, usize)>,
    group_indices: BTreeMap<String, usize>,
    detail_positions: BTreeMap<usize, usize>,
    skipped: BTreeSet<usize>,
    occupied: BTreeMap<String, BTreeSet<usize>>,
    unknown: BTreeMap<String, BTreeSet<usize>>,
    item_bytes: Vec<u64>,
    parent_hash: Vec<u64>,
}

impl Projection {
    pub fn new(
        record: &Record,
        rules: &RuleSet,
        platform: &dyn Platform,
        settings: &Settings,
    ) -> Self {
        let (view, details) = build(record, rules, platform, settings);
        let mut p = Self {
            view,
            details,
            ..Default::default()
        };
        p.item_bytes.reserve(record.result.items.len());
        p.parent_hash.reserve(record.result.items.len());
        for (index, item) in record.result.items.iter().enumerate() {
            p.items_by_group
                .entry(item.group_id.clone())
                .or_default()
                .push(index);
            p.ids.insert(item.item_id.clone(), index);
            p.paths
                .entry(item.path.to_ascii_lowercase())
                .or_default()
                .push(index);
            p.item_bytes.push(util::number(&item.unique_bytes));
            p.parent_hash
                .push(crate::conclusion::parent_fnv(&item.path));
            if skipped(item, settings) {
                p.skipped.insert(index);
            }
            if eligible(item, settings) && record.saved["item_in_use"].get(&item.item_id).is_some()
            {
                p.occupied
                    .entry(item.group_id.clone())
                    .or_default()
                    .insert(index);
                if record.saved["item_in_use"][&item.item_id]["process_label_zh"] == UNKNOWN_TEXT {
                    p.unknown
                        .entry(item.group_id.clone())
                        .or_default()
                        .insert(index);
                }
            }
        }
        for (index, g) in record.result.groups.iter().enumerate() {
            p.group_indices.insert(g.group_id.clone(), index);
        }
        for (ci, c) in p.view["categories"]
            .as_array()
            .into_iter()
            .flatten()
            .enumerate()
        {
            for (gi, g) in c["groups"].as_array().into_iter().flatten().enumerate() {
                p.positions.insert(
                    g["group_id"].as_str().unwrap_or_default().to_owned(),
                    (ci, gi),
                );
            }
        }
        for detail in p.details.values() {
            for (position, item) in detail["items"].as_array().into_iter().flatten().enumerate() {
                if let Some(index) = item["item_id"].as_str().and_then(|id| p.ids.get(id)) {
                    p.detail_positions.insert(*index, position);
                }
            }
        }
        for g in &record.result.groups {
            p.refresh_occupancy(record, &g.group_id);
        }
        p
    }

    pub fn item_index(&self, id: &str) -> Option<usize> {
        self.ids.get(id).copied()
    }

    pub fn group_items(&self, id: &str) -> &[usize] {
        self.items_by_group
            .get(id)
            .map(Vec::as_slice)
            .unwrap_or(&[])
    }

    /// Scan facts are immutable. Cache membership and ordering on first use;
    /// selection and occupancy are still projected from the current settings.
    pub fn summary_rows(
        &mut self,
        record: &Record,
        id: &str,
    ) -> std::sync::Arc<Vec<crate::conclusion::Row>> {
        if let Some(rows) = self.summary_rows.get(id) {
            return rows.clone();
        }
        let rows = std::sync::Arc::new(crate::conclusion::make_rows(
            record,
            id,
            self.group_items(id),
            &self.item_bytes,
            &self.parent_hash,
        ));
        self.summary_rows.insert(id.to_owned(), rows.clone());
        rows
    }

    pub fn cached_row(&self, id: &str) -> Option<&crate::conclusion::Row> {
        self.summary_rows
            .values()
            .flat_map(|rows| rows.iter())
            .find(|row| row.id == id)
    }

    pub fn is_skipped(&self, index: usize) -> bool {
        self.skipped.contains(&index)
    }

    pub fn any_index_skipped(&self, indices: &[usize]) -> bool {
        if self.skipped.is_empty() {
            return false;
        }
        if self.skipped.len() <= indices.len() {
            self.skipped.iter().any(|n| indices.contains(n))
        } else {
            indices.iter().any(|n| self.skipped.contains(n))
        }
    }

    pub fn group_in_use(&self, group_id: &str) -> bool {
        self.occupied
            .get(group_id)
            .is_some_and(|set| !set.is_empty())
    }

    pub fn refresh_path_lower(
        &mut self,
        record: &Record,
        lower: &str,
        settings: &Settings,
        rules: &RuleSet,
        platform: &dyn Platform,
    ) {
        let indices = self.paths.get(lower).cloned().unwrap_or_default();
        for index in indices {
            let item = &record.result.items[index];
            let after = skipped(item, settings);
            if after == self.skipped.contains(&index) {
                continue;
            }
            if after {
                self.skipped.insert(index);
            } else {
                self.skipped.remove(&index);
            }
            let Some(&(ci, gi)) = self.positions.get(&item.group_id) else {
                continue;
            };
            let group = &record.result.groups[self.group_indices[&item.group_id]];
            let bytes = util::number(&item.unique_bytes);
            let drive = util::drive(&item.path);
            let g = &mut self.view["categories"][ci]["groups"][gi];
            let count = g["eligible_count"].as_u64().unwrap_or(0);
            let count = if after {
                count.saturating_sub(1)
            } else {
                count + 1
            };
            g["eligible_count"] = json!(count);
            adjust_bytes(&mut g["eligible_bytes"], bytes, after);
            for row in g["by_drive"]
                .as_array_mut()
                .into_iter()
                .flatten()
                .filter(|r| r["root"] == drive)
            {
                adjust_bytes(&mut row["eligible_bytes"], bytes, after);
            }
            g["summary_zh"] = json!(summary(group, count, rules, platform));
            g["summary_en"] = json!(summary_en(group, count, rules, platform));
            let selectable =
                group.level.cleanable() && count > 0 && enabled(settings, &category(group));
            g["selectable"] = json!(selectable);
            g["default_selected"] = json!(selectable && group.level == Level::Recommended);
            self.details.get_mut(&item.group_id).expect("indexed group")["group"] = g.clone();
            if group.level == Level::Recommended {
                adjust_bytes(&mut self.view["totals"]["recommended_bytes"], bytes, after);
                for row in self.view["recommended_by_drive"]
                    .as_array_mut()
                    .into_iter()
                    .flatten()
                    .filter(|r| r["root"] == drive)
                {
                    adjust_bytes(&mut row["bytes"], bytes, after);
                }
                // A scan begun with every item on a drive skipped has no initial row.
                if !after
                    && !self.view["recommended_by_drive"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .any(|r| r["root"] == drive)
                    && let Some(rows) = self.view["recommended_by_drive"].as_array_mut()
                {
                    rows.push(json!({"root":drive,"bytes":bytes.to_string()}));
                    rows.sort_by(|a, b| a["root"].as_str().cmp(&b["root"].as_str()));
                }
                if let Some(rows) = self.view["recommended_by_drive"].as_array_mut() {
                    rows.retain(|r| util::bytes(&r["bytes"]) > 0);
                }
            }
            if let Some(&position) = self.detail_positions.get(&index) {
                let displayed = &mut self.details.get_mut(&item.group_id).expect("indexed group")["items"]
                    [position];
                displayed["eligible"] = json!(!after);
                displayed["reason_zh"] = if after {
                    json!("已设为以后都跳过")
                } else {
                    Value::Null
                };
                displayed["reason_en"] = if after {
                    json!("Always skipped")
                } else {
                    Value::Null
                };
                displayed["in_use"] = if after {
                    Value::Null
                } else {
                    record.saved["item_in_use"]
                        .get(&item.item_id)
                        .cloned()
                        .unwrap_or(Value::Null)
                };
            }
            if record.saved["item_in_use"].get(&item.item_id).is_some() {
                let occupied = self.occupied.entry(item.group_id.clone()).or_default();
                if after {
                    occupied.remove(&index);
                } else {
                    occupied.insert(index);
                }
                if record.saved["item_in_use"][&item.item_id]["process_label_zh"] == UNKNOWN_TEXT {
                    let unknown = self.unknown.entry(item.group_id.clone()).or_default();
                    if after {
                        unknown.remove(&index);
                    } else {
                        unknown.insert(index);
                    }
                }
            }
            self.refresh_occupancy(record, &item.group_id);
        }
    }

    fn refresh_occupancy(&mut self, record: &Record, id: &str) {
        if record.saved.get("item_in_use").is_none() || record.saved.get("in_use").is_none() {
            return;
        }
        let Some(&(ci, gi)) = self.positions.get(id) else {
            return;
        };
        let occupied = self.occupied.get(id);
        let value = occupied.and_then(|s|s.first()).map(|first| {
            let label = record.saved["item_in_use"][&record.result.items[*first].item_id]["process_label_zh"].as_str().unwrap_or(UNKNOWN_TEXT).trim_end_matches(" 正在使用");
            let count = occupied.map_or(0,BTreeSet::len);
            let unknown = self.unknown.get(id).is_some_and(|s|!s.is_empty());
            let label_en = record.saved["item_in_use"][&record.result.items[*first].item_id]["process_label_en"].as_str().unwrap_or(label).trim_end_matches(" is in use");
            json!({"process_label_en":if unknown {UNKNOWN_TEXT_EN.to_owned()} else {format!("{label_en} is running; {} will be skipped",language::count(count,"in-use item","in-use items"))},"process_label_zh":if unknown {UNKNOWN_TEXT.to_owned()} else {format!("{label} 正在运行，将跳过 {count} 个占用的项")},"item_count":count})
        }).unwrap_or(Value::Null);
        self.view["categories"][ci]["groups"][gi]["in_use"] = value.clone();
        self.details.get_mut(id).expect("indexed group")["group"]["in_use"] = value;
    }

    pub fn refresh_skip(
        &mut self,
        record: &Record,
        changed: &crate::service::Skipped,
        settings: &Settings,
        rules: &RuleSet,
        platform: &dyn Platform,
    ) {
        let paths = if let Some(path) = &changed.path {
            vec![path.to_ascii_lowercase()]
        } else {
            self.group_items(changed.group_id.as_deref().unwrap_or(""))
                .iter()
                .map(|&n| &record.result.items[n])
                .filter(|i| changed.matches(i))
                .map(|i| i.path.to_ascii_lowercase())
                .collect::<BTreeSet<_>>()
                .into_iter()
                .collect()
        };
        for path in paths {
            self.refresh_path_lower(record, &path, settings, rules, platform);
        }
    }
}

fn adjust_bytes(value: &mut Value, bytes: u64, subtract: bool) {
    let before = util::bytes(value);
    *value = json!(
        if subtract {
            before.saturating_sub(bytes)
        } else {
            before.saturating_add(bytes)
        }
        .to_string()
    );
}

fn summary(g: &Group, eligible_count: u64, rules: &RuleSet, platform: &dyn Platform) -> String {
    let mut text = if g.item_count == 0 {
        "未发现".into()
    } else {
        let date = g
            .newest_activity
            .as_deref()
            .and_then(util::parse_time)
            .map(|t| platform.local_date(t))
            .unwrap_or((0, 0));
        format!(
            "{} 个{} · 最近 {} 月 {} 日",
            g.item_count,
            unit(rules, g),
            date.0,
            date.1
        )
    };
    if g.item_count > 0 && eligible_count < g.item_count {
        text += &format!(" · 跳过 {} 个", g.item_count - eligible_count);
    }
    if matches!(g.level, Level::Protected | Level::Advisory) {
        text += " · 只统计占用";
    }
    text
}

pub(crate) fn product_name(name: &str) -> String {
    PRODUCT_NAMES
        .iter()
        .find(|(process, _)| process.eq_ignore_ascii_case(name))
        .map(|(_, product)| (*product).to_owned())
        .unwrap_or_else(|| {
            if name
                .get(name.len().saturating_sub(4)..)
                .is_some_and(|s| s.eq_ignore_ascii_case(".exe"))
            {
                name[..name.len() - 4].to_owned()
            } else {
                name.to_owned()
            }
        })
}

pub(crate) fn display_snapshot(result: &ScanResult) -> water_junk_scan::Snapshot {
    let mut snapshot = water_junk_scan::snapshot(result);
    for g in &result.groups {
        if let Some(row) = snapshot.groups.get_mut(&g.group_id) {
            row.total_bytes = g.unique_bytes.clone();
        }
    }
    snapshot
}

pub(crate) fn group(
    record: &Record,
    g: &Group,
    rules: &RuleSet,
    platform: &dyn Platform,
    settings: &Settings,
) -> Value {
    let text = text(record, g, rules);
    let eligible_count = record
        .result
        .items
        .iter()
        .filter(|i| i.group_id == g.group_id && eligible(i, settings))
        .count() as u64;
    let eligible_bytes: u64 = record
        .result
        .items
        .iter()
        .filter(|i| i.group_id == g.group_id && eligible(i, settings))
        .map(|i| util::number(&i.unique_bytes))
        .sum();
    let selectable = g.level.cleanable() && eligible_count > 0 && enabled(settings, &category(g));
    let mut summary = if g.item_count == 0 {
        "未发现".into()
    } else {
        let date = g
            .newest_activity
            .as_deref()
            .and_then(util::parse_time)
            .map(|t| platform.local_date(t))
            .unwrap_or((0, 0));
        format!(
            "{} 个{} · 最近 {} 月 {} 日",
            g.item_count,
            unit(rules, g),
            date.0,
            date.1
        )
    };
    if g.item_count > 0 && eligible_count < g.item_count {
        summary += &format!(" · 跳过 {} 个", g.item_count - eligible_count);
    }
    if matches!(g.level, Level::Protected | Level::Advisory) {
        summary += " · 只统计占用";
    }
    let growth = record.growth.iter().find(|v| v.group_id == g.group_id).map(|v| json!({"bytes_delta":v.bytes_delta,"count_delta":v.count_delta,"since":record.previous_at}));
    // Records written before in-use results were saved show null.
    let mut in_use = record.saved["in_use"]
        .get(&g.group_id)
        .cloned()
        .unwrap_or(Value::Null);
    if in_use.is_object() && in_use.get("item_count").is_none() {
        in_use["item_count"] = Value::Null;
    }
    let mut by_drive = BTreeMap::<String, (u64, u64)>::new();
    for item in record
        .result
        .items
        .iter()
        .filter(|i| i.group_id == g.group_id)
    {
        let row = by_drive.entry(util::drive(&item.path)).or_default();
        row.0 += 1;
        if eligible(item, settings) {
            row.1 += util::number(&item.unique_bytes);
        }
    }
    let root = record
        .result
        .items
        .iter()
        .filter(|i| i.group_id == g.group_id)
        .max_by_key(|i| util::number(&i.unique_bytes))
        .map(|i| util::drive(&i.path))
        .unwrap_or_default();
    json!({"group_id":g.group_id,"title_zh":text.as_ref().map(|t|t.title_zh.as_str()).unwrap_or("未识别"),
        "title_en":text.as_ref().map(|t|t.title_en.as_str()).unwrap_or("Unrecognized"),"owner_en":text.as_ref().map(|t|t.owner_en.as_str()).unwrap_or("Unknown"),"owner_zh":text.as_ref().map(|t|t.owner_zh.as_str()).unwrap_or("未知"),"level":g.level,"category":g.category,"drive_root":root,
        "item_count":g.item_count,"eligible_count":eligible_count,"file_count":g.file_count,"total_bytes":g.unique_bytes,"eligible_bytes":eligible_bytes.to_string(),"logical_bytes":g.total_bytes,"by_drive":by_drive.into_iter().map(|(root,(item_count,bytes))|json!({"root":root,"item_count":item_count,"eligible_bytes":bytes.to_string()})).collect::<Vec<_>>(),
        "newest_activity":g.newest_activity,"summary_zh":summary,"summary_en":summary_en(g,eligible_count,rules,platform),"growth":growth,"in_use":in_use,"selectable":selectable,"default_selected":selectable && g.level==Level::Recommended})
}

fn amount(n: &str) -> String {
    let n = n.parse::<i128>().unwrap_or(0);
    if n.abs() < 1 << 20 {
        return format!("{}<1 MB", if n >= 0 { "+" } else { "-" });
    }
    let (raw, suffix) = if n.abs() >= 1 << 30 {
        (format!("{:.1}", n.abs() as f64 / (1u64 << 30) as f64), "GB")
    } else {
        (format!("{:.0}", n.abs() as f64 / (1u64 << 20) as f64), "MB")
    };
    let (integer, decimal) = raw
        .split_once('.')
        .map_or((raw.as_str(), String::new()), |(a, b)| (a, format!(".{b}")));
    let mut formatted = String::new();
    for (i, c) in integer.chars().enumerate() {
        if i > 0 && (integer.len() - i).is_multiple_of(3) {
            formatted.push(',');
        }
        formatted.push(c);
    }
    format!(
        "{}{formatted}{decimal} {suffix}",
        if n >= 0 { "+" } else { "-" }
    )
}

fn amount_en(n: &str) -> String {
    amount(n)
}

fn summary_en(g: &Group, count: u64, rules: &RuleSet, platform: &dyn Platform) -> String {
    if g.item_count == 0 {
        return "None found".into();
    }
    let date = g
        .newest_activity
        .as_deref()
        .and_then(util::parse_time)
        .map(|at| language::local_date(at, platform))
        .unwrap_or_else(|| "Unknown date".into());
    let (one, many) = match rules.rule(&g.rule_id).map(|r| r.item_type) {
        Some(water_junk_rules::ItemType::Dir) => ("folder", "folders"),
        Some(water_junk_rules::ItemType::File) => ("file", "files"),
        _ => ("item", "items"),
    };
    let mut text = format!(
        "{} · latest {}",
        language::count(g.item_count, one, many),
        date
    );
    if count < g.item_count {
        text += &format!(" · {} skipped", language::number(g.item_count - count));
    }
    if matches!(g.level, Level::Protected | Level::Advisory) {
        text += " · size only";
    }
    text
}

pub(crate) fn product_name_en(name: &str) -> String {
    if name == "Chrome 无头浏览器" || name.eq_ignore_ascii_case("chrome-headless-shell.exe") {
        "Chrome headless browser".into()
    } else {
        product_name(name)
    }
}

pub(crate) fn insight(
    record: &Record,
    growth: &Growth,
    rules: &RuleSet,
    platform: &dyn Platform,
) -> Value {
    let title = rules
        .text(&growth.group_id)
        .map(|t| t.title_zh)
        .unwrap_or_else(|| "未识别".into());
    let date = record
        .previous_at
        .as_deref()
        .and_then(util::parse_time)
        .map(|t| platform.local_date(t))
        .unwrap_or((0, 0));
    let unit = record
        .result
        .groups
        .iter()
        .find(|g| g.group_id == growth.group_id)
        .map(|g| unit(rules, g))
        .unwrap_or("项");
    let compared = if record.previous_at.is_none() {
        "与更早的一次体检相比".to_owned()
    } else {
        format!("与 {} 月 {} 日相比", date.0, date.1)
    };
    let message = if growth.leak_suspect {
        format!(
            "{}多了 {} 个（{}），每天约 {}。",
            compared,
            growth.count_delta,
            amount(&growth.bytes_delta),
            amount(&growth.bytes_per_day)
        )
    } else {
        format!(
            "{}多了 {} 个{}（{}）。",
            compared,
            growth.count_delta,
            unit,
            amount(&growth.bytes_delta)
        )
    };
    let title_en = rules
        .text(&growth.group_id)
        .map(|t| t.title_en)
        .unwrap_or_else(|| "Unrecognized".into());
    let compared_en = if record.previous_at.is_none() {
        "Compared with an earlier checkup".into()
    } else {
        format!(
            "Compared with {}",
            record
                .previous_at
                .as_deref()
                .and_then(util::parse_time)
                .map(|at| language::local_date(at, platform))
                .unwrap_or_else(|| "an unknown date".into())
        )
    };
    let message_en = if growth.leak_suspect {
        format!(
            "{compared_en}, {} more items ({}), about {} per day.",
            language::number(growth.count_delta),
            amount_en(&growth.bytes_delta),
            amount_en(&growth.bytes_per_day)
        )
    } else {
        let (one, many) = record
            .result
            .groups
            .iter()
            .find(|g| g.group_id == growth.group_id)
            .and_then(|g| rules.rule(&g.rule_id))
            .map(|r| match r.item_type {
                water_junk_rules::ItemType::Dir => ("folder", "folders"),
                water_junk_rules::ItemType::File => ("file", "files"),
                _ => ("item", "items"),
            })
            .unwrap_or(("item", "items"));
        format!(
            "{compared_en}, {} more ({}).",
            language::count(growth.count_delta, one, many),
            amount_en(&growth.bytes_delta)
        )
    };
    json!({"title_en":format!("{title_en} {}",if growth.leak_suspect {"may be leaking"}else{"keeps growing"}),"message_en":message_en,"kind":if growth.leak_suspect {"leak"}else{"growth"},"group_id":growth.group_id,
        "title_zh":format!("{title}{}",if growth.leak_suspect {" 疑似泄漏"}else{"在持续累积"}),"message_zh":message})
}

pub(crate) fn build(
    record: &Record,
    rules: &RuleSet,
    platform: &dyn Platform,
    settings: &Settings,
) -> (Value, BTreeMap<String, Value>) {
    let mut details = BTreeMap::new();
    let mut categories = Vec::new();
    let mut totals = [0u64; 6];
    let mut by_drive = BTreeMap::<String, u64>::new();
    for (cat, title, subtitle, _) in CATEGORIES {
        let mut groups: Vec<_> = record
            .result
            .groups
            .iter()
            .filter(|g| category(g) == cat)
            .collect();
        groups.sort_by(|a, b| {
            a.level
                .rank()
                .cmp(&b.level.rank())
                .then(util::number(&b.unique_bytes).cmp(&util::number(&a.unique_bytes)))
                .then(a.group_id.cmp(&b.group_id))
        });
        let mut buckets = BTreeMap::<String, Vec<Value>>::new();
        for g in groups {
            let total = util::number(&g.unique_bytes);
            if cat == "unrecognized" {
                totals[5] += total;
            } else {
                totals[0] += total;
            }
            match g.level {
                Level::Recommended => {}
                Level::Confirm => totals[2] += total,
                Level::Advisory => totals[3] += total,
                Level::Protected => totals[4] += total,
            }
            let view = group(record, g, rules, platform, settings);
            if g.level == Level::Recommended {
                totals[1] += util::bytes(&view["eligible_bytes"]);
            }
            let text = text(record, g, rules);
            let rule = rules.rule(&g.rule_id);
            let mut items: Vec<_> = record
                .result
                .items
                .iter()
                .filter(|i| i.group_id == g.group_id)
                .collect();
            items.sort_by_key(|i| std::cmp::Reverse(util::number(&i.unique_bytes)));
            if g.level == Level::Recommended {
                for i in items.iter().filter(|i| eligible(i, settings)) {
                    *by_drive.entry(util::drive(&i.path)).or_default() +=
                        util::number(&i.unique_bytes);
                }
            }
            let item_views: Vec<_> = items.iter().take(200).map(|i| {
                let reason=if skipped(i,settings){Some("已设为以后都跳过".to_owned())}else{i.ineligible_reason.as_deref().map(|reason|reason_zh(record,&i.item_id,reason,rule))};
                json!({"item_id":i.item_id,"in_use":if eligible(i, settings) { record.saved["item_in_use"].get(&i.item_id).cloned().unwrap_or(Value::Null) } else { Value::Null },"display_path":i.path,"total_bytes":i.unique_bytes,"newest_activity":i.newest_activity,"eligible":eligible(i, settings),"reason_zh":reason,"reason_en":if skipped(i,settings){Some("Always skipped".to_owned())}else{i.ineligible_reason.as_deref().map(|r|reason_en(record,&i.item_id,r,rule))}})
            }).collect();
            details.insert(g.group_id.clone(),json!({"group":view,"what_en":text.as_ref().map(|t|t.what_en.as_str()).unwrap_or("An unrecognized location. Only its size is measured."),"what_zh":text.as_ref().map(|t|t.what_zh.as_str()).unwrap_or("未识别的位置，只统计占用。"),
                "why_en":text.as_ref().map(|t|t.why_en.as_str()).unwrap_or("No cleaning rule matches."),"why_zh":text.as_ref().map(|t|t.why_zh.as_str()).unwrap_or("没有匹配的清理规则。"),"after_en":text.as_ref().map(|t|t.after_en.as_str()).unwrap_or("Please review it yourself."),"after_zh":text.as_ref().map(|t|t.after_zh.as_str()).unwrap_or("请自行检查。"),
                "fix_hint_en":text.as_ref().and_then(|t|t.fix_hint_en.as_deref()),"fix_hint_zh":text.as_ref().and_then(|t|t.fix_hint_zh.as_deref()),"items":item_views,"items_total":g.item_count,"top_keys":g.top_keys}));
            let key = if cat == "custom" {
                custom_path(record, &g.group_id)
            } else {
                String::new()
            };
            buckets.entry(key).or_default().push(view);
        }
        for (path, groups) in buckets {
            let bytes: u64 = groups.iter().map(|g| util::bytes(&g["total_bytes"])).sum();
            categories.push(json!({"category":cat,"title_zh":if cat=="custom" {format!("你加的位置 · {path}")}else{title.into()},"title_en":if cat=="custom"{format!("Your folder · {path}")}else{category_en(cat).0.into()},"subtitle_zh":subtitle,"subtitle_en":category_en(cat).1,"total_bytes":bytes.to_string(),"groups":groups}));
        }
    }
    let mut growth: Vec<_> = record
        .growth
        .iter()
        .filter(|g| {
            g.leak_suspect
                || g.bytes_delta.parse::<i128>().unwrap_or(0) >= 1 << 30
                || g.count_delta >= 20
        })
        .collect();
    growth.sort_by_key(|g| {
        (
            !g.leak_suspect,
            std::cmp::Reverse(g.bytes_delta.parse::<i128>().unwrap_or(0)),
        )
    });
    let insights: Vec<_> = growth
        .into_iter()
        .take(3)
        .map(|g| insight(record, g, rules, platform))
        .collect();
    (
        json!({"scan_id":record.result.scan_id,"finished_at":record.saved["finished_at"],"duration_ms":record.saved["duration_ms"],"status":record.result.status,
        "totals":{"recognized_bytes":totals[0].to_string(),"recommended_bytes":totals[1].to_string(),"confirm_bytes":totals[2].to_string(),"advisory_bytes":totals[3].to_string(),"protected_bytes":totals[4].to_string(),"unrecognized_bytes":totals[5].to_string()},
        "recommended_by_drive":by_drive.into_iter().filter(|(_, n)| *n > 0).map(|(root,n)|json!({"root":root,"bytes":n.to_string()})).collect::<Vec<_>>(),"insights":insights,"categories":categories}),
        details,
    )
}

pub(crate) fn category_en(id: &str) -> (&'static str, &'static str, &'static str) {
    match id {
        "agent_tool" => (
            "AI coding tools",
            "Codex · Claude · Cursor · grok",
            "Temporary folders, update leftovers, and old versions of Claude Code, Codex, Cursor, grok, and other tools",
        ),
        "browser" => (
            "Browsers",
            "Chrome · Edge · cache only; sign-in data stays",
            "Cache for Chrome, Edge, Brave, and Firefox; sign-in information and website data are always protected",
        ),
        "system_temp" => (
            "System temporary files",
            "Windows and user temporary folders",
            "Files older than 7 days in Windows and user temporary folders",
        ),
        "app_leftover" => (
            "App updates and installers",
            "Installers, update leftovers, and app cache",
            "Installers in Downloads and app update leftovers",
        ),
        "dev_cache" => (
            "Development cache",
            "npm · Cargo · Playwright and more",
            "npm, pip, Cargo, Gradle, Playwright, and more",
        ),
        "crash_log" => (
            "Crashes and logs",
            "Crash dumps and error reports",
            "Crash dumps, error reports, and app logs",
        ),
        "gpu_system" => (
            "GPU and system cache",
            "Shader cache and thumbnails",
            "GPU shader cache and system thumbnails",
        ),
        "custom" => (
            "Your folder",
            "Only build folders with cache markers and test configurations are recognized",
            "Your added locations",
        ),
        "unrecognized" => (
            "Unrecognized",
            "Size only; cannot be cleaned",
            "Unrecognized locations",
        ),
        _ => ("Other", "Other items", "Other locations"),
    }
}

pub(crate) fn reason_en(
    record: &Record,
    id: &str,
    reason: &str,
    rule: Option<&water_junk_rules::Rule>,
) -> String {
    if let Some(text) = record.saved["item_reason_en"][id].as_str() {
        return text.into();
    }
    match reason {
        "level_not_cleanable" => "This category is measured only and will not be cleaned".into(),
        "hard_guard" => "This is a critical system or user folder".into(),
        "contains_protected" => "Contains protected data".into(),
        "inside_protected" => "Located inside protected data".into(),
        "repository" => "This is a code repository".into(),
        "too_recent" => format!(
            "Changed within the last {} hours",
            language::number(rule.map(|r| r.min_age_hours).unwrap_or(0))
        ),
        "user_skipped" => "Always skipped".into(),
        "keep_newest" => format!(
            "The rule keeps the newest {} items",
            language::number(rule.map(|r| r.keep_newest).unwrap_or(0))
        ),
        "identity_unavailable" => "Cannot confirm this item's identity".into(),
        _ => reason.into(),
    }
}

pub(crate) fn reason_zh(
    record: &Record,
    id: &str,
    reason: &str,
    rule: Option<&water_junk_rules::Rule>,
) -> String {
    if let Some(text) = record.saved["item_reason_zh"][id].as_str() {
        return text.into();
    }
    match reason {
        "level_not_cleanable" => "这一类只统计占用，不清理".into(),
        "hard_guard" => "这是系统或用户的关键目录".into(),
        "contains_protected" => "里面有受保护的数据".into(),
        "inside_protected" => "位于受保护的数据之内".into(),
        "repository" => "这是代码仓库".into(),
        "too_recent" => format!(
            "最近 {} 小时内有改动",
            rule.map(|r| r.min_age_hours).unwrap_or(0)
        ),
        "user_skipped" => "已设为以后都跳过".into(),
        "keep_newest" => format!(
            "按规则保留最新的 {} 个",
            rule.map(|r| r.keep_newest).unwrap_or(0)
        ),
        "identity_unavailable" => "无法确认这一项的身份".into(),
        _ => reason.into(),
    }
}
