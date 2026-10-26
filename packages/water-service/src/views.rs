#![forbid(unsafe_code)]

use crate::{
    IN_USE_UNKNOWN, Platform,
    service::{Record, Settings},
    util,
};
use serde_json::{Value, json};
use std::collections::BTreeMap;
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
        "自定义",
        "只识别带缓存标记的构建目录与测试配置",
        "",
    ),
    ("unrecognized", "未识别", "只显示占用，不可清理", ""),
];

pub(crate) fn category(g: &Group) -> String {
    serde_json::to_value(g.category)
        .expect("enum")
        .as_str()
        .expect("enum text")
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

fn custom_path(record: &Record, group_id: &str) -> String {
    record
        .plan
        .targets
        .iter()
        .find(|t| t.group_id == group_id)
        .and_then(|t| match &t.match_spec {
            water_junk_rules::MatchSpec::Marker { root, .. } => Some(root.clone()),
            _ => None,
        })
        .unwrap_or_default()
}

pub(crate) fn in_use_spec(group: &Group) -> water_process_scan::InUseSpec {
    serde_json::from_value(json!(group.in_use)).expect("validated scan in-use specification")
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
pub(crate) fn scan_in_use(result: &ScanResult, platform: &dyn Platform) -> Value {
    let mut saved = serde_json::Map::new();
    for g in &result.groups {
        let spec = in_use_spec(g);
        if spec.mode == water_process_scan::InUseMode::None {
            continue;
        }
        let Some(name) = result
            .items
            .iter()
            .filter(|i| i.group_id == g.group_id && i.eligible)
            .find_map(|i| platform.in_use(&spec, &i.path))
        else {
            continue;
        };
        let text = if name == IN_USE_UNKNOWN {
            "暂时无法确认是否在运行，清理时会再次检查".to_owned()
        } else {
            let label = PRODUCT_NAMES
                .iter()
                .find(|(process, _)| process.eq_ignore_ascii_case(&name))
                .map(|(_, product)| *product)
                .unwrap_or_else(|| {
                    if name
                        .get(name.len().saturating_sub(4)..)
                        .is_some_and(|s| s.eq_ignore_ascii_case(".exe"))
                    {
                        &name[..name.len() - 4]
                    } else {
                        &name
                    }
                });
            format!("{label} 正在运行，将跳过占用的项")
        };
        saved.insert(g.group_id.clone(), json!({"process_label_zh":text}));
    }
    Value::Object(saved)
}

pub(crate) fn group(
    record: &Record,
    g: &Group,
    rules: &RuleSet,
    platform: &dyn Platform,
    settings: &Settings,
) -> Value {
    let text = rules.text(&g.group_id);
    let selectable = g.level.cleanable() && g.eligible_count > 0 && enabled(settings, &category(g));
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
    if g.item_count > 0 && g.eligible_count < g.item_count {
        summary += &format!(" · 跳过 {} 个", g.item_count - g.eligible_count);
    }
    if matches!(g.level, Level::Protected | Level::Advisory) {
        summary += " · 只统计占用";
    }
    let growth = record.growth.iter().find(|v| v.group_id == g.group_id).map(|v| json!({"bytes_delta":v.bytes_delta,"count_delta":v.count_delta,"since":record.previous_at}));
    // Records written before in-use results were saved show null.
    let in_use = record.saved["in_use"]
        .get(&g.group_id)
        .cloned()
        .unwrap_or(Value::Null);
    let root = record
        .result
        .items
        .iter()
        .filter(|i| i.group_id == g.group_id)
        .max_by_key(|i| util::number(&i.total_bytes))
        .map(|i| util::drive(&i.path))
        .unwrap_or_default();
    json!({"group_id":g.group_id,"title_zh":text.as_ref().map(|t|t.title_zh.as_str()).unwrap_or("未识别"),
        "owner_zh":text.as_ref().map(|t|t.owner_zh.as_str()).unwrap_or("未知"),"level":g.level,"category":g.category,"drive_root":root,
        "item_count":g.item_count,"eligible_count":g.eligible_count,"file_count":g.file_count,"total_bytes":g.total_bytes,"eligible_bytes":g.eligible_bytes,
        "newest_activity":g.newest_activity,"summary_zh":summary,"growth":growth,"in_use":in_use,"selectable":selectable,"default_selected":selectable && g.level==Level::Recommended})
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
    let message = if growth.leak_suspect {
        format!(
            "与 {} 月 {} 日相比多了 {} 个（{}），每天约 {}。",
            date.0,
            date.1,
            growth.count_delta,
            amount(&growth.bytes_delta),
            amount(&growth.bytes_per_day)
        )
    } else {
        format!(
            "与 {} 月 {} 日相比多了 {} 个{}（{}）。",
            date.0,
            date.1,
            growth.count_delta,
            unit,
            amount(&growth.bytes_delta)
        )
    };
    json!({"kind":if growth.leak_suspect {"leak"}else{"growth"},"group_id":growth.group_id,
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
                .then(util::number(&b.total_bytes).cmp(&util::number(&a.total_bytes)))
                .then(a.group_id.cmp(&b.group_id))
        });
        let mut buckets = BTreeMap::<String, Vec<Value>>::new();
        for g in groups {
            let total = util::number(&g.total_bytes);
            if cat == "unrecognized" {
                totals[5] += total;
            } else {
                totals[0] += total;
            }
            match g.level {
                Level::Recommended => totals[1] += util::number(&g.eligible_bytes),
                Level::Confirm => totals[2] += total,
                Level::Advisory => totals[3] += total,
                Level::Protected => totals[4] += total,
            }
            let view = group(record, g, rules, platform, settings);
            let text = rules.text(&g.group_id);
            let rule = rules.rule(&g.rule_id);
            let mut items: Vec<_> = record
                .result
                .items
                .iter()
                .filter(|i| i.group_id == g.group_id)
                .collect();
            items.sort_by_key(|i| std::cmp::Reverse(util::number(&i.total_bytes)));
            if g.level == Level::Recommended {
                for i in items.iter().filter(|i| i.eligible) {
                    *by_drive.entry(util::drive(&i.path)).or_default() +=
                        util::number(&i.total_bytes);
                }
            }
            let item_views: Vec<_> = items.iter().take(200).map(|i| {
                let reason = i.ineligible_reason.as_deref().map(|r| match r {
                    "level_not_cleanable"=>"这一类只统计占用，不清理".into(),"hard_guard"=>"这是系统或用户的关键目录".into(),
                    "contains_protected"=>"里面有受保护的数据".into(),"inside_protected"=>"位于受保护的数据之内".into(),"repository"=>"这是代码仓库".into(),
                    "too_recent"=>format!("最近 {} 小时内有改动",rule.map(|r|r.min_age_hours).unwrap_or(0)),
                    "keep_newest"=>format!("按规则保留最新的 {} 个",rule.map(|r|r.keep_newest).unwrap_or(0)),_=>"无法确认这一项的身份".into() });
                json!({"display_path":i.path,"total_bytes":i.total_bytes,"newest_activity":i.newest_activity,"eligible":i.eligible,"reason_zh":reason})
            }).collect();
            details.insert(g.group_id.clone(),json!({"group":view,"what_zh":text.as_ref().map(|t|t.what_zh.as_str()).unwrap_or("未识别的位置，只统计占用。"),
                "why_zh":text.as_ref().map(|t|t.why_zh.as_str()).unwrap_or("没有匹配的清理规则。"),"after_zh":text.as_ref().map(|t|t.after_zh.as_str()).unwrap_or("请自行检查。"),
                "fix_hint_zh":text.as_ref().and_then(|t|t.fix_hint_zh.as_deref()),"items":item_views,"items_total":g.item_count,"top_keys":g.top_keys}));
            let key = if cat == "custom" {
                custom_path(record, &g.group_id)
            } else {
                String::new()
            };
            buckets.entry(key).or_default().push(view);
        }
        for (path, groups) in buckets {
            let bytes: u64 = groups.iter().map(|g| util::bytes(&g["total_bytes"])).sum();
            categories.push(json!({"category":cat,"title_zh":if cat=="custom" {format!("自定义 · {path}")}else{title.into()},"subtitle_zh":subtitle,"total_bytes":bytes.to_string(),"groups":groups}));
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
        "recommended_by_drive":by_drive.into_iter().map(|(root,n)|json!({"root":root,"bytes":n.to_string()})).collect::<Vec<_>>(),"insights":insights,"categories":categories}),
        details,
    )
}
