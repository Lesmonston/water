#![forbid(unsafe_code)]

use crate::{
    IpcError, m35, quarantine,
    service::{Core, Record, State, lock},
    util, views,
};
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet, HashMap, HashSet},
    hash::{BuildHasherDefault, Hash, Hasher},
    sync::Arc,
};
use water_junk_scan::{Item, Level};

#[derive(Default, Clone)]
pub(crate) struct Decisions {
    groups: BTreeMap<String, String>,
    categories: BTreeMap<String, bool>,
    rows: BTreeMap<String, bool>,
    items: BTreeMap<String, bool>,
}
#[derive(Clone)]
pub(crate) struct Unit {
    pub id: String,
    pub groups: Vec<String>,
    pub items: Vec<String>,
    pub level: Level,
    pub category: String,
    pub title: String,
    pub kind: String,
}
#[derive(Clone)]
pub(crate) struct Model {
    pub record: Arc<Record>,
    pub serial: u64,
    pub units: Vec<Unit>,
    pub kept: BTreeSet<String>,
    base: Option<Arc<Record>>,
    decisions: Decisions,
}
#[derive(Clone)]
pub(crate) struct Row {
    pub id: String,
    pub label: String,
    pub items: Vec<String>,
    indices: Vec<usize>,
    bytes: u64,
    oldest: usize,
    newest: usize,
    any_eligible: bool,
    stats: bool,
}

impl Row {
    fn from_entry(entry: &MakeEntry<'_>) -> Self {
        Self {
            id: entry.item.item_id.clone(),
            label: m35::name(&entry.item.path).into(),
            items: vec![entry.item.item_id.clone()],
            indices: vec![entry.rec],
            bytes: entry.bytes,
            oldest: entry.rec,
            newest: entry.rec,
            any_eligible: entry.item.eligible,
            stats: true,
        }
    }

    fn from_recs(id: String, label: String, recs: Vec<usize>, r: &Record) -> Self {
        let mut row = Self::bare(id, label, Vec::new(), recs);
        row.fill_stats(r);
        row
    }

    fn bare(id: String, label: String, items: Vec<String>, indices: Vec<usize>) -> Self {
        Self {
            id,
            label,
            items,
            indices,
            bytes: 0,
            oldest: 0,
            newest: 0,
            any_eligible: false,
            stats: false,
        }
    }

    fn fill_stats(&mut self, r: &Record) {
        if self.indices.is_empty() {
            return;
        }
        let mut bytes = 0u64;
        let mut oldest = self.indices[0];
        let mut newest = self.indices[0];
        let mut any_eligible = false;
        for &n in &self.indices {
            let i = &r.result.items[n];
            bytes += util::number(&i.unique_bytes);
            if i.newest_activity < r.result.items[oldest].newest_activity {
                oldest = n;
            }
            if i.newest_activity > r.result.items[newest].newest_activity {
                newest = n;
            }
            any_eligible |= i.eligible;
        }
        self.bytes = bytes;
        self.oldest = oldest;
        self.newest = newest;
        self.any_eligible = any_eligible;
        self.stats = true;
    }

    fn member_ids(&self, r: &Record) -> Vec<String> {
        if !self.indices.is_empty() {
            self.indices
                .iter()
                .map(|&n| r.result.items[n].item_id.clone())
                .collect()
        } else {
            self.items.clone()
        }
    }

    fn contains_only(&self, r: &Record, ids: &BTreeSet<String>) -> bool {
        if !self.indices.is_empty() {
            self.indices
                .iter()
                .all(|&n| ids.contains(&r.result.items[n].item_id))
        } else {
            self.items.iter().all(|id| ids.contains(id))
        }
    }
}

struct MakeEntry<'a> {
    item: &'a Item,
    rec: usize,
    bytes: u64,
}

struct FnvHasher(u64);

impl Default for FnvHasher {
    fn default() -> Self {
        Self(0xcbf29ce484222325)
    }
}

impl Hasher for FnvHasher {
    fn finish(&self) -> u64 {
        self.0
    }
    fn write(&mut self, bytes: &[u8]) {
        for &b in bytes {
            self.0 ^= u64::from(b);
            self.0 = self.0.wrapping_mul(0x0100_0000_01b3);
        }
    }
}

pub(crate) fn build(core: &Core, s: &State, r: Arc<Record>) -> Model {
    let mut by_rule = BTreeMap::<String, Vec<String>>::new();
    for g in &r.result.groups {
        let key = if g.rule_id == "leak-cluster" || g.rule_id.starts_with("decl:") {
            g.group_id.clone()
        } else {
            g.rule_id.clone()
        };
        by_rule.entry(key).or_default().push(g.group_id.clone());
    }
    let unfinished: BTreeSet<_> = r.saved["unfinished"]
        .as_object()
        .into_iter()
        .flatten()
        .map(|(id, _)| id.clone())
        .collect();
    let p = r.projection();
    let mut units = Vec::new();
    for groups in by_rule.into_values() {
        let first = r
            .result
            .groups
            .iter()
            .find(|g| g.group_id == groups[0])
            .unwrap();
        let id = if groups.len() > 1 {
            format!("m:{}", first.rule_id)
        } else {
            groups[0].clone()
        };
        let level = r
            .result
            .groups
            .iter()
            .filter(|g| groups.contains(&g.group_id))
            .map(|g| g.level)
            .min_by_key(|l| l.rank())
            .unwrap();
        let mut indices = groups
            .iter()
            .flat_map(|id| p.group_items(id).iter().copied())
            .collect::<Vec<_>>();
        // Match the original scan order even when a unit merges several groups.
        indices.sort_unstable();
        let items = indices
            .into_iter()
            .map(|index| &r.result.items[index])
            .filter(|i| !unfinished.contains(&i.item_id))
            .map(|i| i.item_id.clone())
            .collect();
        let rule = core.rules.rule(&first.rule_id);
        let kind = if first.rule_id == "leak-cluster" {
            "leak"
        } else if first.rule_id.starts_with("decl:") {
            "declaration"
        } else if rule.is_some_and(|r| r.session_tool.is_some()) {
            "session"
        } else {
            "group"
        };
        let title = p.details[&groups[0]]["group"]["title_zh"]
            .as_str()
            .unwrap_or("未识别")
            .to_owned();
        units.push(Unit {
            id,
            groups,
            items,
            level,
            category: views::category(first),
            title,
            kind: kind.into(),
        });
    }
    drop(p);
    if !unfinished.is_empty() {
        let groups = r
            .result
            .items
            .iter()
            .filter(|i| unfinished.contains(&i.item_id))
            .map(|i| i.group_id.clone())
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
        units.push(Unit {
            id: "unfinished".into(),
            groups,
            items: unfinished.into_iter().collect(),
            level: Level::Confirm,
            category: "custom".into(),
            title: "上次没清完的项目".into(),
            kind: "unfinished".into(),
        });
    }
    units.sort_by(|a, b| a.id.cmp(&b.id));
    let base = r.saved["growth_base_scan_id"]
        .as_str()
        .and_then(|id| s.records.iter().find(|r| r.result.scan_id == id))
        .cloned();
    let mut c = Model {
        record: r,
        serial: 1,
        units,
        kept: BTreeSet::new(),
        base,
        decisions: Decisions::default(),
    };
    for u in &c.units {
        let bytes = unit_bytes(s, &c, u, true);
        if s.settings
            .keeps
            .iter()
            .any(|k| k.key == u.id && bytes as u128 <= u128::from(k.bytes) * 101 / 100 + (1 << 20))
        {
            c.kept.insert(u.id.clone());
        }
    }
    c
}
pub(crate) fn ensure(core: &Core, s: &mut State) -> Result<(), IpcError> {
    let r = s.last_record().ok_or_else(|| IpcError::new("not_found"))?;
    if s.m35
        .conclusion
        .as_ref()
        .is_none_or(|c| c.record.result.scan_id != r.result.scan_id)
    {
        s.m35.conclusion = Some(build(core, s, r));
    }
    Ok(())
}
pub(crate) fn version(c: &Model) -> String {
    let id = &c.record.result.scan_id;
    format!("cv-{}-{}", &id[id.len().saturating_sub(8)..], c.serial)
}
pub(crate) fn stale(s: &State, c: &Model) -> Option<String> {
    if let Some(reason) = s.m35.stale.get(&c.record.result.scan_id) {
        return Some(reason.clone());
    }
    if s.last.as_deref() != Some(&c.record.result.scan_id) {
        Some("有了更新的体检".into())
    } else if s.consumed.contains(&c.record.result.scan_id) {
        Some("这次体检已被清理用掉".into())
    } else {
        None
    }
}
pub(crate) fn current(s: &State, c: &Model, v: &str) -> Result<(), IpcError> {
    if version(c) != v || stale(s, c).is_some() {
        Err(IpcError::new("stale"))
    } else {
        Ok(())
    }
}
fn item<'a>(c: &'a Model, id: &str) -> Option<&'a Item> {
    c.record
        .projection()
        .item_index(id)
        .map(|n| &c.record.result.items[n])
}
fn eligible(s: &State, r: &Record, i: &Item) -> bool {
    i.eligible
        && !views::skipped(i, &s.settings)
        && r.result.groups.iter().any(|g| {
            g.group_id == i.group_id
                && g.level.cleanable()
                && views::enabled(&s.settings, &views::category(g))
        })
}
fn unit_bytes(s: &State, c: &Model, u: &Unit, cleanable: bool) -> u64 {
    u.items
        .iter()
        .filter_map(|id| item(c, id))
        .filter(|i| !cleanable || eligible(s, &c.record, i))
        .map(|i| util::number(&i.unique_bytes))
        .sum()
}
fn choice<'a>(c: &'a Model, u: &Unit) -> &'a str {
    c.decisions
        .groups
        .get(&u.id)
        .map(String::as_str)
        .unwrap_or(if c.kept.contains(&u.id) {
            "keep"
        } else {
            "undecided"
        })
}

pub(crate) fn selected(s: &State, c: &Model) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let row_choices = {
        let projection = c.record.projection();
        c.decisions
            .rows
            .iter()
            .flat_map(|(id, include)| {
                projection.cached_row(id).into_iter().flat_map(move |row| {
                    row.member_ids(&c.record)
                        .into_iter()
                        .map(move |id| (id, *include))
                })
            })
            .collect::<BTreeMap<_, _>>()
    };
    for u in &c.units {
        for id in &u.items {
            let Some(i) = item(c, id).filter(|i| eligible(s, &c.record, i)) else {
                continue;
            };
            let mut include = u.level == Level::Recommended;
            if let Some(v) = c
                .decisions
                .categories
                .get(&u.category)
                .filter(|_| u.level == Level::Recommended)
            {
                include = *v;
            }
            match choice(c, u) {
                "clean" => include = true,
                "keep" => include = false,
                _ => {}
            }
            if let Some(v) = c
                .decisions
                .groups
                .get(&i.group_id)
                .filter(|_| i.group_id != u.id)
            {
                match v.as_str() {
                    "clean" => include = true,
                    "keep" => include = false,
                    _ => {}
                }
            }
            if let Some(value) = row_choices.get(id) {
                include = *value;
            }
            if let Some(v) = c.decisions.items.get(id) {
                include = *v;
            }
            if include {
                out.insert(id.clone());
            }
        }
    }
    out
}

pub(crate) fn get(core: &Arc<Core>) -> Result<Value, IpcError> {
    let mut s = lock(core)?;
    ensure(core, &mut s)?;
    Ok(view(core, &s, s.m35.conclusion.as_ref().unwrap()))
}
pub(crate) fn decide(core: &Arc<Core>, a: &Value) -> Result<Value, IpcError> {
    let mut s = lock(core)?;
    ensure(core, &mut s)?;
    current(
        &s,
        s.m35.conclusion.as_ref().unwrap(),
        a["version"].as_str().unwrap(),
    )?;
    let mut c = s.m35.conclusion.take().unwrap();
    let before = c.clone();
    let mut settings = s.settings.clone();
    let d = &a["decision"];
    let validation = (|| {
        if let Some(id) = d["group"].as_str() {
            let u = c
                .units
                .iter()
                .find(|u| u.id == id || u.groups.iter().any(|g| g == id))
                .ok_or_else(|| IpcError::new("invalid"))?;
            if !u.level.cleanable() || unit_bytes(&s, &c, u, true) == 0 {
                return Err(IpcError::new("invalid"));
            }
            let value = d["choice"].as_str().unwrap();
            let bytes = if u.id == id {
                unit_bytes(&s, &c, u, true)
            } else {
                c.record
                    .result
                    .items
                    .iter()
                    .filter(|i| i.group_id == id && eligible(&s, &c.record, i))
                    .map(|i| util::number(&i.unique_bytes))
                    .sum()
            };
            settings.keeps.retain(|k| k.key != id);
            if value == "keep" {
                settings.keeps.push(m35::Keep {
                    key: id.into(),
                    bytes,
                    decided_at: util::timestamp(core.platform.now()),
                });
            }
            if value == "undecided" {
                c.decisions.groups.remove(id);
                c.kept.remove(id);
            } else {
                c.decisions.groups.insert(id.into(), value.into());
                if value == "clean" {
                    c.kept.remove(id);
                }
            }
        } else if let Some(id) = d["category"].as_str() {
            let cats = category_rows(&s, &c, &selected(&s, &c));
            if !cats.iter().any(|x| x["category_id"] == id) {
                return Err(IpcError::new("invalid"));
            }
            let include = d["include"].as_bool().unwrap();
            if id == "other" {
                let shown: BTreeSet<_> = cats
                    .iter()
                    .filter_map(|r| r["category_id"].as_str())
                    .collect();
                for u in &c.units {
                    if u.level == Level::Recommended && !shown.contains(u.category.as_str()) {
                        c.decisions.categories.insert(u.category.clone(), include);
                    }
                }
            } else {
                c.decisions.categories.insert(id.into(), include);
            }
        } else if let Some(id) = d["row"].as_str() {
            if let Some(u) = c
                .units
                .iter()
                .find(|u| u.id.starts_with("m:") && u.groups.iter().any(|g| g == id))
            {
                if !u.level.cleanable()
                    || !c
                        .record
                        .result
                        .items
                        .iter()
                        .any(|i| i.group_id == id && eligible(&s, &c.record, i))
                {
                    return Err(IpcError::new("invalid"));
                }
                c.decisions.groups.insert(
                    id.into(),
                    if d["include"] == true {
                        "clean"
                    } else {
                        "keep"
                    }
                    .into(),
                );
            } else {
                let row = find_row(
                    &c.record,
                    id,
                    c.record.result.groups.iter().map(|g| g.group_id.as_str()),
                )
                .ok_or_else(|| IpcError::new("invalid"))?;
                if !row_selectable(&s, &c.record, &row) {
                    return Err(IpcError::new("invalid"));
                }
                c.decisions
                    .rows
                    .insert(id.into(), d["include"].as_bool().unwrap());
            }
        } else {
            let id = d["item"].as_str().unwrap();
            if !item(&c, id).is_some_and(|i| eligible(&s, &c.record, i)) {
                return Err(IpcError::new("invalid"));
            }
            c.decisions
                .items
                .insert(id.into(), d["include"].as_bool().unwrap());
        }
        m35::bound(&mut settings);
        if d.get("group").is_some() {
            core.store.write("", "settings.json", &json!(settings))?;
        }
        s.settings = settings;
        c.serial += 1;
        Ok(())
    })();
    let ok = validation.is_ok();
    let result = validation.map(|()| view(core, &s, &c));
    s.m35.conclusion = Some(if ok { c } else { before });
    result
}

fn category_rows(s: &State, c: &Model, selected: &BTreeSet<String>) -> Vec<Value> {
    let mut cats = BTreeMap::<String, (u64, u64, bool, bool)>::new();
    for u in c.units.iter().filter(|u| u.level == Level::Recommended) {
        let bytes = unit_bytes(s, c, u, true);
        if bytes == 0 {
            continue;
        }
        let x = cats.entry(u.category.clone()).or_default();
        x.0 += bytes;
        x.1 += u.groups.len() as u64;
        x.2 |= is_new(c, u);
        x.3 |= u.items.iter().any(|i| selected.contains(i));
    }
    let mut cats: Vec<_> = cats.into_iter().collect();
    cats.sort_by(|a, b| b.1.0.cmp(&a.1.0).then(a.0.cmp(&b.0)));
    let others = if cats.len() > 7 {
        Some(
            cats.drain(7..)
                .map(|(_, v)| v)
                .fold((0, 0, false, false), |a, b| {
                    (a.0 + b.0, a.1 + b.1, a.2 || b.2, a.3 || b.3)
                }),
        )
    } else {
        None
    };
    if let Some(x) = others {
        cats.push(("other".into(), x));
    }
    cats.into_iter().map(|(id,(bytes,n,new,included))|json!({"category_id":id,"title_zh":views::CATEGORIES.iter().find(|x|x.0==id).map(|x|x.1).unwrap_or("其它"),"bytes":bytes.to_string(),"group_count":n,"is_new":new,"included":included})).collect()
}
fn is_new(c: &Model, u: &Unit) -> bool {
    let r = &c.record;
    if let Some(base) = &c.base {
        return u.groups.iter().any(|id| {
            let current = r.result.groups.iter().find(|g| g.group_id == *id);
            current.is_some_and(|g| {
                base.result
                    .groups
                    .iter()
                    .find(|old| old.group_id == *id)
                    .is_none_or(|old| {
                        util::number(&g.unique_bytes) > util::number(&old.unique_bytes)
                            || g.item_count > old.item_count
                    })
            })
        });
    }
    u.groups.iter().any(|id| {
        r.growth.iter().any(|g| {
            g.group_id == *id
                && (g.count_delta > 0 || g.bytes_delta.parse::<i128>().unwrap_or(0) > 0)
        })
    })
}
pub(crate) fn is_chosen(core: &Core, r: &Record, i: &Item) -> bool {
    r.result
        .groups
        .iter()
        .find(|g| g.group_id == i.group_id)
        .is_some_and(|g| {
            g.level == Level::Confirm
                || g.rule_id == "leak-cluster"
                || g.rule_id.starts_with("decl:")
                || core
                    .rules
                    .rule(&g.rule_id)
                    .is_some_and(|r| r.session_tool.is_some())
        })
}

pub(crate) fn expected_skip<'a>(r: &Record, items: impl Iterator<Item = &'a Item>) -> Value {
    let mut bytes = 0u64;
    let mut notes = BTreeSet::new();
    for i in items {
        if let Some(note) = r.saved["item_in_use"].get(&i.item_id) {
            bytes += util::number(&i.unique_bytes);
            notes.insert(format!(
                "{}，会跳过约 {}",
                note["process_label_zh"].as_str().unwrap_or("程序开着"),
                m35::amount(util::number(&i.unique_bytes))
            ));
        }
    }
    if bytes == 0 {
        Value::Null
    } else {
        json!({"bytes":bytes.to_string(),"notes_zh":notes})
    }
}

fn view(core: &Core, s: &State, c: &Model) -> Value {
    let r = &c.record;
    let selected = selected(s, c);
    let mut bytes = 0;
    let mut chosen = 0;
    let mut by_drive = BTreeMap::<String, u64>::new();
    for i in r
        .result
        .items
        .iter()
        .filter(|i| selected.contains(&i.item_id))
    {
        let n = util::number(&i.unique_bytes);
        bytes += n;
        if is_chosen(core, r, i) {
            chosen += n;
        }
        *by_drive.entry(util::drive(&i.path)).or_default() += n;
    }
    let categories = category_rows(s, c, &selected);
    let mut summary = categories
        .iter()
        .take(2)
        .map(|c| {
            format!(
                "{} {}",
                c["title_zh"].as_str().unwrap(),
                m35::amount(util::bytes(&c["bytes"]))
            )
        })
        .collect::<Vec<_>>();
    let delta: r#i128 = r
        .growth
        .iter()
        .filter(|g| {
            r.result
                .groups
                .iter()
                .any(|x| x.group_id == g.group_id && x.level == Level::Recommended)
        })
        .map(|g| g.bytes_delta.parse::<i128>().unwrap_or(0))
        .sum();
    if delta > 0 {
        summary.push(format!(
            "比上次多 {}",
            m35::amount(delta.min(u64::MAX as i128) as u64)
        ));
    }
    let skip = expected_skip(
        r,
        r.result
            .items
            .iter()
            .filter(|i| selected.contains(&i.item_id)),
    );
    summary.extend(
        skip["notes_zh"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(str::to_owned),
    );
    let clues = clues(core, s, r);
    let mut candidates: Vec<_> = c
        .units
        .iter()
        .filter(|u| {
            u.level == Level::Confirm && unit_bytes(s, c, u, true) > 0 && !c.kept.contains(&u.id)
        })
        .collect();
    candidates.sort_by(|a, b| {
        unit_bytes(s, c, b, true)
            .cmp(&unit_bytes(s, c, a, true))
            .then(a.id.cmp(&b.id))
    });
    let more = if candidates.len() > 5 {
        let rest = &candidates[5..];
        let total = rest.iter().map(|u| unit_bytes(s, c, u, true)).sum::<u64>();
        let max = unit_bytes(s, c, rest[0], true);
        json!({"count":rest.len(),"bytes":total.to_string(),"max_bytes":max.to_string(),"text_zh":format!("还有 {} 项需要判断，都不大于 {}，共 {}，默认不清",rest.len(),m35::amount(max),m35::amount(total))})
    } else {
        Value::Null
    };
    let cards: Vec<_> = candidates
        .iter()
        .take(5)
        .map(|u| card(core, s, c, u, &clues))
        .collect();
    let kept_bytes = c
        .units
        .iter()
        .filter(|u| c.kept.contains(&u.id))
        .map(|u| unit_bytes(s, c, u, true))
        .sum::<u64>();
    let kept = if c.kept.is_empty() {
        Value::Null
    } else {
        json!({"count":c.kept.len(),"bytes":kept_bytes.to_string(),"text_zh":format!("你上次保留的 {} 项",c.kept.len())})
    };
    let folds = folds(core, r);
    let pending = c
        .units
        .iter()
        .filter(|u| u.level == Level::Confirm && choice(c, u) == "undecided")
        .collect::<Vec<_>>();
    let scope: Vec<m35::Location> =
        serde_json::from_value(r.saved["scope"].clone()).unwrap_or_default();
    json!({"version":version(c),"scan_id":r.result.scan_id,"status":r.result.status,"finished_at":r.saved["finished_at"],"duration_ms":r.saved["duration_ms"],"stale":stale(s,c).is_some(),"stale_reason_zh":stale(s,c),"scope":{"labels_zh":if scope.is_empty(){vec!["常用位置".to_owned()]}else{scope.iter().map(|l|l.label_zh.clone()).collect()},"only_folder":scope.len()==1 && scope[0].kind=="folder"},"quarantine":quarantine::bar(s),"plan":{"bytes":bytes.to_string(),"delete_bytes":(bytes-chosen).to_string(),"chosen_bytes":chosen.to_string(),"item_count":selected.len(),"summary_zh":summary.join(" · "),"categories":categories,"by_drive":by_drive.into_iter().map(|(root,n)|json!({"root":root,"bytes":n.to_string()})).collect::<Vec<_>>(),"expected_skip":skip},"cards":cards,"more_cards":more,"kept_before":kept,"clues":clues.iter().take(3).cloned().collect::<Vec<_>>(),"more_clues":clues.len().saturating_sub(3),"folds":folds,"detail_pending":{"count":pending.len(),"bytes":pending.iter().map(|u|unit_bytes(s,c,u,true)).sum::<u64>().to_string()}})
}

fn card(core: &Core, s: &State, c: &Model, u: &Unit, clues: &[Value]) -> Value {
    let r = &c.record;
    let n = unit_bytes(s, c, u, true);
    let items: Vec<_> = u.items.iter().filter_map(|id| item(c, id)).collect();
    let first_group = r
        .result
        .groups
        .iter()
        .find(|g| u.groups.contains(&g.group_id))
        .unwrap();
    let rule = core.rules.rule(&first_group.rule_id);
    let mut title = format!("{} · {}", u.title, m35::amount(n));
    if let Some(cluster) = &first_group.cluster {
        title = format!(
            "{} 里有 {} 个同模板目录，{}",
            tail2(&cluster.parent),
            cluster.member_count,
            if cluster_state(s, r, first_group) == "growing" {
                "还在长"
            } else {
                "已经不长了"
            }
        );
    }
    if u.kind == "session" {
        let days = rule
            .and_then(|r| r.session_tool.as_ref())
            .and_then(|tool| s.settings.sessions.iter().find(|x| &x.tool == tool))
            .map(|x| x.days)
            .unwrap_or(30);
        title = format!(
            "{} 有 {} 个 {days} 天前的会话",
            rule.map(|r| r.owner_zh.as_str()).unwrap_or("工具"),
            items.len()
        );
    }
    if u.kind == "unfinished" {
        title = format!("上次没清完的 {} 项", items.len());
    }
    let mut notes = items
        .iter()
        .flat_map(|i| {
            r.saved["item_notes"][&i.item_id]
                .as_array()
                .into_iter()
                .flatten()
        })
        .filter_map(Value::as_str)
        .collect::<Vec<_>>();
    if let Some(uninstalled) = notes.iter().find(|x| x.contains("似乎已卸载")) {
        title = (*uninstalled).into();
    }
    let valuable: Vec<_> = items
        .iter()
        .flat_map(|i| i.valuable_names.iter())
        .take(3)
        .cloned()
        .collect();
    if u.kind == "unfinished" {
        notes.extend(
            items
                .iter()
                .filter_map(|i| r.saved["unfinished"][&i.item_id].as_str()),
        );
    }
    let oldest = items
        .iter()
        .map(|i| i.newest_activity.as_str())
        .min()
        .unwrap_or("");
    let newest = items
        .iter()
        .map(|i| i.newest_activity.as_str())
        .max()
        .unwrap_or("");
    let fixed = s
        .settings
        .fixed_marks
        .iter()
        .find(|m| u.groups.contains(&m.group_id));
    let after_fixed = fixed.map(|f| {
        items
            .iter()
            .filter(|i| {
                r.saved["item_created"][&i.item_id]
                    .as_str()
                    .unwrap_or(&i.newest_activity)
                    > f.fixed_at.as_str()
            })
            .count()
    });
    let evidence = format!(
        "{} 项 · {} ～ {} · {}{}{}{}",
        items.len(),
        oldest,
        newest,
        items
            .first()
            .map(|i| m35::parent(&i.path))
            .unwrap_or_default(),
        if valuable.is_empty() {
            String::new()
        } else {
            format!(" · 含 {}", valuable.join("、"))
        },
        if notes.is_empty() {
            String::new()
        } else {
            format!(" · {}", notes.join("；"))
        },
        after_fixed
            .map(|n| format!(" · 标记已修后新增 {n} 项"))
            .unwrap_or_default()
    );
    let clue = clues
        .iter()
        .find(|v| v["clue_id"] == format!("cl-{}", &util::digest(&u.groups[0])[..12]));
    let mut menu = vec!["skip", "detail"];
    if clue.is_some() {
        menu.push("copy_clue");
    }
    json!({"card_id":u.id,"kind":u.kind,"level":u.level,"title_zh":title,"evidence_zh":evidence,"bytes":n.to_string(),"decision":choice(c,u),"decided_before_zh":if c.kept.contains(&u.id){Some("上次你选了保留")}else{None},"warning_zh":match u.kind.as_str(){"leak"=>Some("清了不修，会再长回来"),"session"=>Some("清掉后这些对话不能再续接或回看；可以先放进隔离区试试"),_=>None},"group_id":u.id,"menu":menu,"clue_id":clue.map(|c|c["clue_id"].clone())})
}
fn tail2(path: &str) -> String {
    let mut v = path.rsplit('\\').take(2).collect::<Vec<_>>();
    v.reverse();
    v.join("\\")
}

fn row_items<'a>(r: &'a Record, row: &Row) -> Vec<&'a Item> {
    if !row.indices.is_empty() {
        return row.indices.iter().map(|&n| &r.result.items[n]).collect();
    }
    let p = r.projection();
    row.items
        .iter()
        .filter_map(|id| p.item_index(id).map(|n| &r.result.items[n]))
        .collect()
}
fn row_selectable(s: &State, r: &Record, row: &Row) -> bool {
    row_items(r, row)
        .iter()
        .any(|i| eligible(s, r, i) && r.saved["item_in_use"].get(&i.item_id).is_none())
}
pub(crate) fn make_rows(r: &Record, id: &str, indices: &[usize]) -> Vec<Row> {
    #[derive(Copy, Clone)]
    struct IgnoreAscii<'a>(&'a str);
    impl PartialEq for IgnoreAscii<'_> {
        fn eq(&self, other: &Self) -> bool {
            self.0.eq_ignore_ascii_case(other.0)
        }
    }
    impl Eq for IgnoreAscii<'_> {}
    impl Hash for IgnoreAscii<'_> {
        fn hash<H: Hasher>(&self, state: &mut H) {
            let bytes = self.0.as_bytes();
            let mut buf = [0u8; 64];
            for chunk in bytes.chunks(64) {
                for (i, &b) in chunk.iter().enumerate() {
                    buf[i] = b.to_ascii_lowercase();
                }
                state.write(&buf[..chunk.len()]);
            }
            state.write_u8(0xff);
        }
    }
    enum Slot {
        One(usize),
        Many(Vec<usize>),
    }
    impl Slot {
        fn push(&mut self, pos: usize) {
            match self {
                Self::Many(v) => v.push(pos),
                Self::One(_) => {
                    let Self::One(first) = std::mem::replace(self, Self::Many(Vec::new())) else {
                        unreachable!()
                    };
                    *self = Self::Many(vec![first, pos]);
                }
            }
        }
    }
    let mut entries = indices
        .iter()
        .map(|&rec| {
            let item = &r.result.items[rec];
            MakeEntry {
                item,
                rec,
                bytes: util::number(&item.unique_bytes),
            }
        })
        .collect::<Vec<_>>();
    entries.sort_by(|a, b| {
        b.bytes
            .cmp(&a.bytes)
            .then(a.item.item_id.cmp(&b.item.item_id))
    });
    if entries.len() <= 8 {
        return entries.iter().map(Row::from_entry).collect();
    }
    let mut used = vec![false; entries.len()];
    let mut groups = Vec::<(u64, String, String, Vec<usize>)>::new();
    let mut templates = BTreeMap::<&str, Vec<usize>>::new();
    for (pos, e) in entries.iter().enumerate() {
        if let Some(t) = e.item.template.as_deref() {
            templates.entry(t).or_default().push(pos);
        }
    }
    for (template, members) in templates {
        if members.len() < 2 {
            continue;
        }
        for &pos in &members {
            used[pos] = true;
        }
        let label = template
            .replace("<r6>", "******")
            .replace("<p8>", "********")
            .replace("<h>", "*")
            .replace("<d>", "*")
            .replace("<u>", "*")
            .replace('#', "*");
        let bytes = members.iter().map(|&p| entries[p].bytes).sum();
        groups.push((
            bytes,
            row_id(id, "t", template),
            format!("{label} × {}", members.len()),
            members,
        ));
    }
    let leftover_n = used.iter().filter(|used| !**used).count();
    let mut seen = HashSet::<IgnoreAscii, BuildHasherDefault<FnvHasher>>::with_capacity_and_hasher(
        leftover_n,
        BuildHasherDefault::default(),
    );
    let parent_dup = entries
        .iter()
        .enumerate()
        .any(|(pos, e)| !used[pos] && !seen.insert(IgnoreAscii(parent_ref(&e.item.path))));
    if parent_dup {
        let mut parents =
            HashMap::<IgnoreAscii, Slot, BuildHasherDefault<FnvHasher>>::with_capacity_and_hasher(
                leftover_n,
                BuildHasherDefault::default(),
            );
        for (pos, e) in entries.iter().enumerate() {
            if used[pos] {
                continue;
            }
            parents
                .entry(IgnoreAscii(parent_ref(&e.item.path)))
                .and_modify(|slot| slot.push(pos))
                .or_insert(Slot::One(pos));
        }
        for (key, slot) in parents {
            let Slot::Many(members) = slot else {
                continue;
            };
            for &pos in &members {
                used[pos] = true;
            }
            let parent = key.0.to_ascii_lowercase();
            let bytes = members.iter().map(|&p| entries[p].bytes).sum();
            let n = members.len();
            groups.push((
                bytes,
                row_id(id, "d", &parent),
                format!("{} × {}", m35::name(&parent), n),
                members,
            ));
        }
    }
    if groups.is_empty() {
        let mut rows = entries
            .iter()
            .take(7)
            .map(Row::from_entry)
            .collect::<Vec<_>>();
        let rest = &entries[7..];
        let mut bytes = 0u64;
        let mut oldest = rest[0].rec;
        let mut newest = rest[0].rec;
        let mut any_eligible = false;
        let mut recs = Vec::with_capacity(rest.len());
        for e in rest {
            recs.push(e.rec);
            bytes += e.bytes;
            if e.item.newest_activity < r.result.items[oldest].newest_activity {
                oldest = e.rec;
            }
            if e.item.newest_activity > r.result.items[newest].newest_activity {
                newest = e.rec;
            }
            any_eligible |= e.item.eligible;
        }
        rows.push(Row {
            id: row_id(id, "other", ""),
            label: format!("其它 {} 项", rest.len()),
            items: Vec::new(),
            indices: recs,
            bytes,
            oldest,
            newest,
            any_eligible,
            stats: true,
        });
        return rows;
    }
    let leftover = (0..entries.len()).filter(|&p| !used[p]).collect::<Vec<_>>();
    groups.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    let ranked = groups.len() + leftover.len();
    let take = if ranked > 8 { 7 } else { ranked };
    let mut rows = Vec::with_capacity(take + 1);
    let mut gi = 0;
    let mut si = 0;
    let pick_group = |gi: usize, si: usize| match (groups.get(gi), leftover.get(si)) {
        (Some(g), Some(&p)) => match g.0.cmp(&entries[p].bytes) {
            std::cmp::Ordering::Greater => true,
            std::cmp::Ordering::Less => false,
            std::cmp::Ordering::Equal => g.1 <= entries[p].item.item_id,
        },
        (Some(_), None) => true,
        _ => false,
    };
    while rows.len() < take {
        if pick_group(gi, si) {
            let g = &groups[gi];
            rows.push(Row::from_recs(
                g.1.clone(),
                g.2.clone(),
                g.3.iter().map(|&p| entries[p].rec).collect(),
                r,
            ));
            gi += 1;
        } else {
            rows.push(Row::from_entry(&entries[leftover[si]]));
            si += 1;
        }
    }
    if ranked > 8 {
        let mut other = Vec::new();
        while gi < groups.len() || si < leftover.len() {
            if pick_group(gi, si) {
                other.extend(groups[gi].3.iter().map(|&p| entries[p].rec));
                gi += 1;
            } else {
                other.push(entries[leftover[si]].rec);
                si += 1;
            }
        }
        rows.push(Row::from_recs(
            row_id(id, "other", ""),
            format!("其它 {} 项", other.len()),
            other,
            r,
        ));
    }
    rows
}

fn parent_ref(path: &str) -> &str {
    path.rsplit_once('\\').map(|(p, _)| p).unwrap_or("")
}

fn find_row<'a>(record: &Record, id: &str, groups: impl Iterator<Item = &'a str>) -> Option<Row> {
    let mut projection = record.projection();
    if let Some(row) = projection.cached_row(id) {
        return Some(row.clone());
    }
    for group in groups {
        let rows = projection.summary_rows(record, group);
        if let Some(row) = rows.iter().find(|row| row.id == id) {
            return Some(row.clone());
        }
    }
    None
}
fn row_id(group: &str, kind: &str, key: &str) -> String {
    format!(
        "r:{}",
        &util::digest(&format!("{group}\n{kind}\n{}", key.to_ascii_lowercase()))[..16]
    )
}
fn decisions_active(c: &Model) -> bool {
    !c.decisions.categories.is_empty()
        || !c.decisions.groups.is_empty()
        || !c.decisions.rows.is_empty()
        || !c.decisions.items.is_empty()
}

fn unit_kept(c: &Model, group_id: &str) -> bool {
    c.kept.contains(group_id)
        || c.units.iter().any(|u| {
            c.kept.contains(&u.id) && (u.id == group_id || u.groups.iter().any(|g| g == group_id))
        })
}

fn row_view(
    core: &Core,
    s: &State,
    r: &Record,
    row: &Row,
    c: Option<&Model>,
    selected: Option<&BTreeSet<String>>,
) -> Value {
    let items = if row.indices.is_empty() {
        row_items(r, row)
    } else {
        Vec::new()
    };
    let count = if row.indices.is_empty() {
        items.len()
    } else {
        row.indices.len()
    };
    let at = |k: usize| {
        if row.indices.is_empty() {
            items[k]
        } else {
            &r.result.items[row.indices[k]]
        }
    };
    if count == 0 {
        return json!({"row_id":row.id,"label_zh":row.label,"count":0,"bytes":"0","oldest":null,"newest":null,"included":false,"selectable":false,"release_zh":null,"expandable":false});
    }
    let first = at(0);
    let group = r
        .result
        .groups
        .iter()
        .find(|g| g.group_id == first.group_id);
    let can_clean = group
        .is_some_and(|g| g.level.cleanable() && views::enabled(&s.settings, &views::category(g)));
    let recommended = group.is_some_and(|g| g.level == Level::Recommended);
    let in_use = r.saved.get("item_in_use");
    if row.stats && selected.is_none() {
        let p = r.projection();
        let skip_hit = if row.indices.is_empty() {
            row.items
                .iter()
                .any(|id| p.item_index(id).is_some_and(|n| p.is_skipped(n)))
        } else {
            p.any_index_skipped(&row.indices)
        };
        let in_use_hit = p.group_in_use(&first.group_id);
        drop(p);
        if !skip_hit && !in_use_hit {
            let kept = c.is_some_and(|m| unit_kept(m, &first.group_id));
            let included = can_clean && row.any_eligible && recommended && !kept;
            return json!({"row_id":row.id,"label_zh":row.label,"count":count,"bytes":row.bytes.to_string(),"oldest":r.result.items[row.oldest].newest_activity,"newest":r.result.items[row.newest].newest_activity,"included":included,"selectable":can_clean && row.any_eligible,"release_zh":null,"expandable":count>1});
        }
    }
    let mut bytes = 0u64;
    let mut oldest = &first.newest_activity;
    let mut newest = &first.newest_activity;
    let mut any_eligible = false;
    let mut all_eligible_included = true;
    let mut selectable = false;
    let mut all_in_use = true;
    for k in 0..count {
        let i = at(k);
        bytes += util::number(&i.unique_bytes);
        if i.newest_activity < *oldest {
            oldest = &i.newest_activity;
        }
        if i.newest_activity > *newest {
            newest = &i.newest_activity;
        }
        let occupied = in_use.and_then(|v| v.get(&i.item_id)).is_some();
        if !occupied {
            all_in_use = false;
        }
        if can_clean && i.eligible && !views::skipped(i, &s.settings) {
            any_eligible = true;
            if let Some(selected) = selected {
                if !selected.contains(&i.item_id) {
                    all_eligible_included = false;
                }
            } else if !recommended || c.is_some_and(|m| unit_kept(m, &i.group_id)) {
                all_eligible_included = false;
            }
            if !occupied {
                selectable = true;
            }
        }
    }
    let release = if all_in_use {
        Some(
            group
                .and_then(|g| core.rules.rule(&g.rule_id))
                .and_then(|rule| rule.in_use_zh.clone())
                .unwrap_or_else(|| {
                    format!(
                        "{}，关掉后可清",
                        in_use
                            .and_then(|v| v[&first.item_id]["process_label_zh"].as_str())
                            .unwrap_or("程序正在使用")
                    )
                }),
        )
    } else {
        None
    };
    json!({"row_id":row.id,"label_zh":row.label,"count":count,"bytes":bytes.to_string(),"oldest":oldest,"newest":newest,"included":all_eligible_included && any_eligible,"selectable":selectable,"release_zh":release,"expandable":count>1})
}

pub(crate) fn group_detail(
    core: &Core,
    s: &State,
    r: &Arc<Record>,
    id: &str,
) -> Result<Value, IpcError> {
    let model = s
        .m35
        .conclusion
        .as_ref()
        .filter(|c| c.record.result.scan_id == r.result.scan_id);
    // Without decisions, an eligible recommended row is included directly.
    // Opening one drawer must not allocate a selected-ID set for the entire scan.
    let chosen = model
        .filter(|c| decisions_active(c))
        .map(|c| selected(s, c));
    let p = r.projection();
    if id == "unfinished" {
        let u = model
            .and_then(|c| c.units.iter().find(|u| u.id == id))
            .ok_or_else(|| IpcError::new("not_found"))?;
        let mut out = p.details[&u.groups[0]].clone();
        drop(p);
        let items = u
            .items
            .iter()
            .filter_map(|id| model.and_then(|c| item(c, id)))
            .collect::<Vec<_>>();
        let bytes = items
            .iter()
            .map(|i| util::number(&i.unique_bytes))
            .sum::<u64>();
        out["group"]["group_id"] = json!(id);
        out["group"]["title_zh"] = json!(u.title);
        out["group"]["level"] = json!("confirm");
        out["group"]["total_bytes"] = json!(bytes.to_string());
        out["group"]["eligible_bytes"] = json!(bytes.to_string());
        out["group"]["item_count"] = json!(items.len());
        out["group"]["eligible_count"] = json!(items.len());
        out["group"]["default_selected"] = json!(false);
        out["items_total"] = json!(items.len());
        out["rows"] = json!(
            u.items
                .iter()
                .take(8)
                .filter_map(|id| model.and_then(|c| item(c, id)))
                .map(|i| row_view(
                    core,
                    s,
                    r,
                    &Row::bare(
                        i.item_id.clone(),
                        m35::name(&i.path).into(),
                        vec![i.item_id.clone()],
                        Vec::new(),
                    ),
                    model,
                    chosen.as_ref()
                ))
                .collect::<Vec<_>>()
        );
        out["rows_note_zh"] = Value::Null;
        out["items"]=json!(items.iter().take(200).map(|i|json!({"item_id":i.item_id,"in_use":r.saved["item_in_use"].get(&i.item_id),"display_path":i.path,"total_bytes":i.unique_bytes,"newest_activity":i.newest_activity,"eligible":eligible(s,r,i),"reason_zh":i.ineligible_reason})).collect::<Vec<_>>());
        return Ok(out);
    }
    if id.starts_with("m:") {
        let groups = r
            .result
            .groups
            .iter()
            .filter(|g| {
                format!("m:{}", g.rule_id) == id
                    && g.rule_id != "leak-cluster"
                    && !g.rule_id.starts_with("decl:")
            })
            .collect::<Vec<_>>();
        if groups.len() < 2 {
            return Err(IpcError::new("not_found"));
        }
        let mut out = p.details[&groups[0].group_id].clone();
        let mut g = out["group"].clone();
        g["group_id"] = json!(id);
        for key in ["item_count", "eligible_count", "file_count"] {
            g[key] = json!(
                groups
                    .iter()
                    .map(|g| p.details[&g.group_id]["group"][key].as_u64().unwrap_or(0))
                    .sum::<u64>()
            );
        }
        for key in ["total_bytes", "eligible_bytes", "logical_bytes"] {
            g[key] = json!(
                groups
                    .iter()
                    .map(|g| util::bytes(&p.details[&g.group_id]["group"][key]))
                    .sum::<u64>()
                    .to_string()
            );
        }
        g["selectable"] = json!(
            groups
                .iter()
                .any(|g| p.details[&g.group_id]["group"]["selectable"] == true)
        );
        g["level"] = json!(
            groups
                .iter()
                .map(|g| g.level)
                .min_by_key(|l| l.rank())
                .unwrap()
        );
        g["default_selected"] = json!(g["selectable"] == true && g["level"] == "recommended");
        out["group"] = g;
        out["items_total"] = out["group"]["item_count"].clone();
        let mut items = groups
            .iter()
            .flat_map(|g| p.details[&g.group_id]["items"].as_array().unwrap().clone())
            .collect::<Vec<_>>();
        drop(p);
        let mut rows = groups
            .iter()
            .map(|g| {
                let indices = r.projection().group_items(&g.group_id).to_vec();
                row_view(
                    core,
                    s,
                    r,
                    &Row::from_recs(g.group_id.clone(), location(r, &g.group_id), indices, r),
                    model,
                    chosen.as_ref(),
                )
            })
            .collect::<Vec<_>>();
        rows.sort_by_key(|v| std::cmp::Reverse(util::bytes(&v["bytes"])));
        out["rows"] = json!(rows);
        out["rows_note_zh"] = Value::Null;
        items.sort_by_key(|i| std::cmp::Reverse(util::bytes(&i["total_bytes"])));
        items.truncate(200);
        out["items"] = json!(items);
        return Ok(out);
    }
    let mut out = p
        .details
        .get(id)
        .cloned()
        .ok_or_else(|| IpcError::new("not_found"))?;
    drop(p);
    let cached = r.projection().summary_rows(r, id);
    let rows = cached
        .iter()
        .map(|row| row_view(core, s, r, row, model, chosen.as_ref()))
        .collect::<Vec<_>>();
    out["rows"] = json!(rows);
    out["rows_note_zh"] = Value::Null;
    Ok(out)
}
fn location(r: &Record, gid: &str) -> String {
    r.plan
        .targets
        .iter()
        .find(|t| t.group_id == gid)
        .map(|t| match &t.match_spec {
            water_junk_rules::MatchSpec::Pattern { base, .. } => base.clone(),
            water_junk_rules::MatchSpec::Marker { root, .. }
            | water_junk_rules::MatchSpec::Discovery { root } => root.clone(),
        })
        .or_else(|| {
            r.result
                .groups
                .iter()
                .find(|g| g.group_id == gid)
                .and_then(|g| g.cluster.as_ref())
                .map(|c| c.parent.clone())
        })
        .unwrap_or_default()
}

pub(crate) fn items(core: &Arc<Core>, a: &Value) -> Result<Value, IpcError> {
    let mut s = lock(core)?;
    ensure(core, &mut s)?;
    let c = s.m35.conclusion.as_ref().unwrap();
    let chosen = selected(&s, c);
    let id = a["groupId"].as_str().unwrap();
    let u = c
        .units
        .iter()
        .find(|u| u.id == id || u.groups.iter().any(|g| g == id))
        .ok_or_else(|| IpcError::new("not_found"))?;
    let mut ids: BTreeSet<_> = if id == u.id {
        u.items.iter().cloned().collect()
    } else {
        c.record
            .result
            .items
            .iter()
            .filter(|i| i.group_id == id)
            .map(|i| i.item_id.clone())
            .collect()
    };
    if let Some(row) = a["rowId"].as_str() {
        let members = if u.id.starts_with("m:") && u.groups.iter().any(|g| g == row) {
            c.record
                .result
                .items
                .iter()
                .filter(|i| i.group_id == row)
                .map(|i| i.item_id.clone())
                .collect::<Vec<_>>()
        } else {
            find_row(&c.record, row, u.groups.iter().map(String::as_str))
                .filter(|row| row.contains_only(&c.record, &ids))
                .ok_or_else(|| IpcError::new("invalid"))?
                .member_ids(&c.record)
        };
        ids.retain(|i| members.contains(i));
    }
    let query = a["query"].as_str().map(str::to_lowercase);
    let mut items = ids
        .iter()
        .filter_map(|id| item(c, id))
        .filter(|i| {
            query
                .as_ref()
                .is_none_or(|q| m35::name(&i.path).to_lowercase().contains(q))
        })
        .collect::<Vec<_>>();
    items.sort_by(|a, b| {
        util::number(&b.unique_bytes)
            .cmp(&util::number(&a.unique_bytes))
            .then(a.path.cmp(&b.path))
    });
    let total = items.len();
    let out=items.into_iter().take(200).map(|i|{let reason=if views::skipped(i,&s.settings){Some("已设为以后都跳过".to_owned())}else{i.ineligible_reason.clone()};let notes=c.record.saved["item_notes"][&i.item_id].as_array().cloned().unwrap_or_default();json!({"item_id":i.item_id,"display_path":i.path,"total_bytes":i.unique_bytes,"newest_activity":i.newest_activity,"eligible":eligible(&s,&c.record,i),"included":chosen.contains(&i.item_id),"reason_zh":reason,"notes_zh":notes})}).collect::<Vec<_>>();
    Ok(json!({"items":out,"items_total":total}))
}

pub(crate) fn detail(core: &Arc<Core>, a: &Value) -> Result<Value, IpcError> {
    let mut s = lock(core)?;
    ensure(core, &mut s)?;
    let c = s.m35.conclusion.as_ref().unwrap();
    current(&s, c, a["version"].as_str().unwrap())?;
    let chosen = selected(&s, c);
    let mut sections = BTreeMap::<String, Vec<Value>>::new();
    for u in &c.units {
        let loc = if u.groups.len() > 1 {
            format!("{} 个位置", u.groups.len())
        } else {
            location(&c.record, &u.groups[0])
        };
        let key = if a["mode"] == "category" {
            if u.level.cleanable() {
                u.category.clone()
            } else {
                "zz-other".into()
            }
        } else {
            let scope: Vec<m35::Location> =
                serde_json::from_value(c.record.saved["scope"].clone()).unwrap_or_default();
            let matches = scope
                .iter()
                .filter(|l| {
                    l.path.as_ref().is_some_and(|path| {
                        u.items
                            .iter()
                            .filter_map(|id| item(c, id))
                            .any(|i| util::contains(path, &i.path))
                    })
                })
                .map(|l| l.label_zh.clone())
                .collect::<Vec<_>>();
            if matches.len() == 1 {
                matches[0].clone()
            } else if matches.is_empty() {
                "常用位置".into()
            } else {
                loc.clone()
            }
        };
        let bytes = unit_bytes(&s, c, u, false);
        let selected_bytes = u
            .items
            .iter()
            .filter(|i| chosen.contains(*i))
            .filter_map(|i| item(c, i))
            .map(|i| util::number(&i.unique_bytes))
            .sum::<u64>();
        sections.entry(key).or_default().push(json!({"row_key":u.id,"title_zh":u.title,"location_zh":loc,"level":u.level,"bytes":bytes.to_string(),"chosen_bytes":selected_bytes.to_string(),"selectable":u.level.cleanable() && unit_bytes(&s,c,u,true)>0,"choice":choice(c,u),"is_new":is_new(c,u)}));
    }
    let out=sections.into_iter().map(|(key,mut rows)|{rows.sort_by_key(|v|std::cmp::Reverse(util::bytes(&v["bytes"])));let bytes=rows.iter().map(|r|util::bytes(&r["bytes"])).sum::<u64>();let chosen=rows.iter().map(|r|util::bytes(&r["chosen_bytes"])).sum::<u64>();let n=rows.len();
        let mut unchanged=Vec::new();rows.retain(|row|{let same=c.record.previous_at.is_some() && c.units.iter().find(|u|u.id==row["row_key"]).is_some_and(|u|u.groups.iter().all(|id|{
            if let Some(base)=&c.base {let old=base.result.groups.iter().find(|g|g.group_id==*id);let now=c.record.result.groups.iter().find(|g|g.group_id==*id);old.zip(now).is_some_and(|(a,b)|a.item_count==b.item_count && a.unique_bytes==b.unique_bytes)}else{c.record.growth.iter().any(|g|g.group_id==*id && g.count_delta==0 && g.bytes_delta=="0")}
        }));if same{unchanged.push(row.clone());}!same});
        json!({"section_id":format!("section-{}",&util::digest(&key)[..12]),"title_zh":views::CATEGORIES.iter().find(|c|c.0==key).map(|c|c.1.to_owned()).unwrap_or_else(||if key=="zz-other" {"受保护与仅供参考".into()}else{key}),"group_count":n,"bytes":bytes.to_string(),"chosen_bytes":chosen.to_string(),"rows":rows,"unchanged":if unchanged.is_empty(){Value::Null}else{json!({"count":unchanged.len(),"bytes":unchanged.iter().map(|r|util::bytes(&r["bytes"])).sum::<u64>().to_string(),"rows":unchanged})}})
    }).collect::<Vec<_>>();
    let total = c
        .record
        .result
        .items
        .iter()
        .filter(|i| chosen.contains(&i.item_id))
        .map(|i| util::number(&i.unique_bytes))
        .sum::<u64>();
    Ok(json!({"version":version(c),"mode":a["mode"],"plan_bytes":total.to_string(),"sections":out}))
}

pub(crate) fn cluster_state(s: &State, r: &Record, g: &water_junk_scan::Group) -> &'static str {
    if g.level == Level::Advisory {
        return "suspected";
    }
    if let Some(f) = s
        .settings
        .fixed_marks
        .iter()
        .find(|m| m.group_id == g.group_id)
        && !r
            .result
            .items
            .iter()
            .filter(|i| i.group_id == g.group_id)
            .any(|i| i.newest_activity > f.fixed_at)
    {
        return "stopped";
    }
    if r.growth.iter().any(|x| {
        x.group_id == g.group_id
            && (x.count_delta > 0 || x.bytes_delta.parse::<i128>().unwrap_or(0) > 0)
    }) {
        "growing"
    } else {
        "stopped"
    }
}
pub(crate) fn clusters(core: &Core, s: &State, r: &Record) -> Vec<Value> {
    let clues = clues(core, s, r);
    r.result.groups.iter().filter(|g|g.rule_id=="leak-cluster").map(|g|{let growth=r.growth.iter().find(|x|x.group_id==g.group_id);let clue_id=format!("cl-{}",&util::digest(&g.group_id)[..12]);let clue=clues.iter().find(|x|x["clue_id"]==clue_id);json!({"group_id":g.group_id,"title_zh":g.cluster.as_ref().map(|c|format!("{} · {}",tail2(&c.parent),c.template)),"rate_zh":format!("每天约 +{} 个 · +{}",growth.map(|x|(x.count_delta.max(0) as f64 / x.days.max(1.0)).round() as u64).unwrap_or(0),m35::amount(growth.map(|x|util::number(&x.bytes_per_day)).unwrap_or(0))),"state":cluster_state(s,r,g),"fixed_at":s.settings.fixed_marks.iter().find(|x|x.group_id==g.group_id).map(|x|&x.fixed_at),"clue_id":clue.map(|x|x["clue_id"].clone()),"copy_text":clue.map(|x|x["copy_text"].clone())})}).collect()
}

fn clues(_core: &Core, _s: &State, r: &Record) -> Vec<Value> {
    let mut candidates = Vec::<(u64, String, String, String)>::new();
    let mut detached = BTreeMap::<String, Vec<&Item>>::new();
    for g in &r.result.groups {
        if let Some(cluster) = &g.cluster {
            let members = r
                .result
                .items
                .iter()
                .filter(|i| i.group_id == g.group_id)
                .collect::<Vec<_>>();
            let mut days = BTreeMap::<String, u64>::new();
            for i in &members {
                let at = r.saved["item_created"][&i.item_id]
                    .as_str()
                    .unwrap_or(&i.newest_activity);
                if let Some(day) = at.get(..10) {
                    *days.entry(day.into()).or_default() += 1;
                }
            }
            let mut root = cluster.parent.clone();
            let mut repo = None;
            while root.len() > 3 {
                if std::fs::symlink_metadata(format!("{root}\\.git")).is_ok() {
                    repo = Some(root.clone());
                    break;
                }
                root = m35::parent(&root);
            }
            let text = format!(
                "{} 里有 {} 个 {}，每天新增约 {} 个",
                cluster.parent,
                cluster.member_count,
                cluster.template,
                cluster.member_count / 14
            );
            let copy = format!(
                "检查清单\n模板：{}\n数量：{}\n总量：{}\n最近 14 天创建分布：{}\n最新一个：{}\n所在仓库根：{}\n先找出生成它们的代码并修好，再清存量；修好后用 Water 标记为已修。",
                cluster.template,
                cluster.member_count,
                m35::amount(util::number(&g.unique_bytes)),
                days.into_iter()
                    .rev()
                    .take(14)
                    .map(|(d, n)| format!("{d} {n} 个"))
                    .collect::<Vec<_>>()
                    .join("；"),
                g.newest_activity.as_deref().unwrap_or("未知"),
                repo.as_deref().unwrap_or("未发现")
            );
            candidates.push((
                util::number(&g.unique_bytes),
                format!("cl-{}", &util::digest(&g.group_id)[..12]),
                text,
                copy,
            ));
        }
    }
    for i in &r.result.items {
        let notes = r.saved["item_notes"][&i.item_id]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .collect::<Vec<_>>();
        if notes.contains(&"已脱离 git") {
            detached.entry(m35::parent(&i.path)).or_default().push(i);
        }
        if i.referenced_count > 0 {
            let text = format!(
                "{} 指向 {}，改指别处后可清",
                i.referenced_by
                    .first()
                    .map(String::as_str)
                    .unwrap_or("联接"),
                i.path
            );
            candidates.push((
                util::number(&i.unique_bytes),
                format!("cl-{}", &util::digest(&i.item_id)[..12]),
                text.clone(),
                text,
            ));
        }
        if i.odd_count > 0 {
            let text = format!(
                "{} 里有名为 {} 的文件，多半是脚本里写了 > nul；在 bash 里应写 /dev/null",
                i.path,
                i.odd_names.first().map(String::as_str).unwrap_or("nul")
            );
            candidates.push((
                util::number(&i.unique_bytes),
                format!("cl-odd-{}", &util::digest(&i.item_id)[..12]),
                text.clone(),
                text,
            ));
        }
    }
    for (parent, items) in detached {
        let text = format!(
            "{parent} 里 {} 棵树已脱离 git，要先查有没有未提交的改动",
            items.len()
        );
        let copy = format!(
            "{text}\n逐棵核对：\n{}\n1. 检查未提交、未跟踪及被忽略的成果。\n2. 核对分支与主线是否收齐。\n3. 核对签名、数据库及离线成果已有备份。\ngit 查不了已脱离目录里有没有未提交的东西；先人工核对，再决定清理。",
            items
                .iter()
                .map(|i| i.path.as_str())
                .collect::<Vec<_>>()
                .join("\n")
        );
        candidates.push((
            items.iter().map(|i| util::number(&i.unique_bytes)).sum(),
            format!("cl-git-{}", &util::digest(&parent)[..12]),
            text,
            copy,
        ));
    }
    candidates.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    candidates
        .into_iter()
        .map(|(_, id, text, copy)| json!({"clue_id":id,"text_zh":text,"copy_text":copy}))
        .collect()
}

fn folds(core: &Core, r: &Record) -> Vec<Value> {
    let mut out = Vec::new();
    for (kind, level) in [
        ("advisory", Level::Advisory),
        ("protected", Level::Protected),
    ] {
        let mut groups = r
            .result
            .groups
            .iter()
            .filter(|g| {
                g.level == level
                    && g.item_count > 0
                    && !(kind == "advisory"
                        && core
                            .rules
                            .rule(&g.rule_id)
                            .is_some_and(|r| r.advice_zh.is_some()))
            })
            .collect::<Vec<_>>();
        groups.sort_by_key(|g| std::cmp::Reverse(util::number(&g.unique_bytes)));
        if groups.is_empty() {
            continue;
        }
        let rows=groups.iter().take(10).map(|g|json!({"title_zh":r.projection().details[&g.group_id]["group"]["title_zh"],"bytes":g.unique_bytes,"note_zh":null})).collect::<Vec<_>>();
        let bytes = groups
            .iter()
            .map(|g| util::number(&g.unique_bytes))
            .sum::<u64>();
        let names = rows
            .iter()
            .take(3)
            .filter_map(|v| v["title_zh"].as_str())
            .collect::<Vec<_>>()
            .join("、");
        out.push(json!({"kind":kind,"text_zh":format!("{} {}：{names}",m35::amount(bytes),if kind=="protected"{"受保护"}else{"只统计、不清理"}),"bytes":bytes.to_string(),"rows":rows}));
    }
    let spaces = r.saved["space"]
        .as_array()
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    if !spaces.is_empty() {
        let rows = spaces
            .iter()
            .flat_map(|v| v["top"].as_array().into_iter().flatten())
            .take(10)
            .map(|v| json!({"title_zh":v["name"],"bytes":v["disk_bytes"],"note_zh":space_label(v)}))
            .collect::<Vec<_>>();
        let text = rows
            .iter()
            .take(3)
            .map(|v| {
                format!(
                    "{} {}",
                    v["title_zh"].as_str().unwrap_or(""),
                    m35::amount(util::bytes(&v["bytes"]))
                )
            })
            .collect::<Vec<_>>()
            .join("、");
        out.push(json!({"kind":"space","text_zh":format!("空间分布：{text}"),"bytes":spaces.iter().map(|v|util::bytes(&v["disk_bytes"])).sum::<u64>().to_string(),"rows":rows}));
    }
    let mut system = r
        .result
        .groups
        .iter()
        .filter(|g| g.item_count > 0)
        .filter_map(|g| {
            core.rules.rule(&g.rule_id).and_then(|rule| {
                rule.advice_zh
                    .as_ref()
                    .map(|a| json!({"title_zh":rule.title_zh,"bytes":g.unique_bytes,"note_zh":a}))
            })
        })
        .collect::<Vec<_>>();
    system.extend(r.saved["recycle_bins"].as_array().into_iter().flatten().filter(|v|util::bytes(&v["bytes"])>0).map(|v|json!({"title_zh":format!("回收站（{} 盘）",v["root"].as_str().unwrap_or("").get(..1).unwrap_or("")),"bytes":v["bytes"],"note_zh":"在资源管理器里清空回收站"})));
    if !system.is_empty() {
        let n = system.len();
        let bytes = system.iter().map(|v| util::bytes(&v["bytes"])).sum::<u64>();
        system.truncate(10);
        out.push(json!({"kind":"system","text_zh":format!("{n} 条系统建议，可以再腾出约 {}，要在 Windows 设置里改",m35::amount(bytes)),"bytes":bytes.to_string(),"rows":system}));
    }
    out
}
fn space_label(v: &Value) -> &'static str {
    let name = v["name"].as_str().unwrap_or("");
    if v["has_git"] == true {
        "项目"
    } else if [
        "steamapps",
        "Steam",
        "SteamLibrary",
        "Epic Games",
        "WeGameApps",
        "Riot Games",
        "Games",
    ]
    .iter()
    .any(|s| s.eq_ignore_ascii_case(name))
    {
        "游戏"
    } else if [
        "Program Files",
        "Program Files (x86)",
        "ProgramData",
        "Windows",
    ]
    .iter()
    .any(|s| s.eq_ignore_ascii_case(name))
    {
        "系统与程序"
    } else if ["$Recycle.Bin", "System Volume Information"]
        .iter()
        .any(|s| s.eq_ignore_ascii_case(name))
    {
        "系统"
    } else if name.eq_ignore_ascii_case(".water-quarantine") {
        "隔离区"
    } else if v["kind"] == "file" {
        "文件"
    } else {
        "资料"
    }
}
