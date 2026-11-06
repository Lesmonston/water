#![forbid(unsafe_code)]

use crate::error::ScanError;
use crate::keys::normalize_key;
use crate::model::{
    Category, ClusterInfo, ExtrasOptions, Group, Identity, Issue, Item, ItemType, Junction, Level,
    ScanExtras, ScanResult, SpaceEntry, SpaceOverview, TopKey,
};
use crate::native_windows;
use crate::plan::{AgeBasis, Condition, KeepBy, Marker, Match, ScanPlan, Target, match_segment};
use crate::templates::name_template;
use crate::util::{
    child_path, clamp_time, file_name, format_bytes, format_rfc3339, is_proper_ancestor, path_eq,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs::{self, Metadata};
#[cfg(windows)]
use std::os::windows::fs::MetadataExt;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant, SystemTime};

const REPARSE: u32 = 0x400;
const DIRECTORY: u32 = 0x10;
const CLUSTER_MIN_MEMBERS: usize = 10;

mod streaming;

#[derive(Debug, Clone)]
pub struct ScanOptions {
    pub max_entries: u64,
    pub max_seconds: u64,
}

impl Default for ScanOptions {
    fn default() -> Self {
        Self {
            max_entries: 20_000_000,
            max_seconds: 900,
        }
    }
}

#[derive(Clone)]
pub struct CancelToken {
    flag: Arc<AtomicBool>,
}

impl CancelToken {
    pub fn new() -> Self {
        Self {
            flag: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn cancel(&self) {
        self.flag.store(true, Ordering::SeqCst);
    }

    pub fn is_cancelled(&self) -> bool {
        self.flag.load(Ordering::SeqCst)
    }
}

impl Default for CancelToken {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub group_id: String,
    pub category: String,
    pub visited_entries: u64,
    pub found_bytes: u64,
}

pub trait ScanObserver: Sync {
    fn on_progress(&self, progress: &ScanProgress);
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Kind {
    File,
    Dir,
    Reparse,
}

#[derive(Clone)]
struct Child {
    name: String,
    path: String,
    kind: Kind,
    len: u64,
    mtime: SystemTime,
    creation: SystemTime,
    allocation: Option<u64>,
    reparse_tag: u32,
    identity: Option<(u32, [u8; 16])>,
}

#[derive(Clone)]
struct Listing {
    children: Vec<Child>,
    issues: Vec<&'static str>,
    by_name: HashMap<String, usize>,
}

#[derive(Clone)]
struct Hit {
    target_index: usize,
    target_id: String,
    group_id: String,
    level: Level,
    min_age_hours: u64,
    keep_newest: u64,
    path: String,
    kind: Kind,
    total_bytes: u64,
    unique_bytes: u64,
    file_count: u64,
    newest_activity: SystemTime,
    oldest_activity: SystemTime,
    /// `.git` check done on the entry's own listing, before any stop.
    has_git: bool,
    /// `None` means identity lookup failed (not that it was skipped).
    identity: Option<Identity>,
    disk_bytes: u64,
    git_is_copy: bool,
    keep_by: KeepBy,
    unlocks_target_ids: Vec<String>,
    valuable_count: u64,
    valuable_names: Vec<String>,
    odd_count: u64,
    odd_names: Vec<String>,
}

struct Engine<'a> {
    options: &'a ScanOptions,
    cancel: &'a CancelToken,
    observer: &'a dyn ScanObserver,
    now: SystemTime,
    started: Instant,
    visited: u64,
    found_bytes: u64,
    status: &'static str,
    issues: Vec<Issue>,
    last_progress: Instant,
    cache: HashMap<String, Arc<Listing>>,
    extras_options: &'a ExtrasOptions,
    extras: ScanExtras,
    include_quarantine: bool,
}

impl<'a> Engine<'a> {
    fn budget_exhausted(&self) -> bool {
        self.visited > self.options.max_entries
            || self.started.elapsed() > Duration::from_secs(self.options.max_seconds)
    }

    fn stopped(&mut self, group_id: &str) -> bool {
        if self.cancel.is_cancelled() {
            self.status = "cancelled";
            return true;
        }
        if self.budget_exhausted() {
            // Recorded once per group, not once per call.
            if !self
                .issues
                .iter()
                .any(|issue| issue.code == "budget_exhausted" && issue.group_id == group_id)
            {
                self.add_issue("budget_exhausted", group_id);
            }
            if self.status != "cancelled" {
                self.status = "partial";
            }
            true
        } else {
            false
        }
    }

    fn add_issue(&mut self, code: &str, group_id: &str) {
        if let Some(issue) = self
            .issues
            .iter_mut()
            .find(|issue| issue.code == code && issue.group_id == group_id)
        {
            issue.count += 1;
        } else {
            self.issues.push(Issue {
                code: code.to_string(),
                group_id: group_id.to_string(),
                count: 1,
            });
        }
        if self.status == "completed"
            && matches!(
                code,
                "access_denied" | "unrepresentable_name" | "budget_exhausted"
            )
        {
            self.status = "partial";
        }
    }

    fn emit(&mut self, group_id: &str, category: Category, force: bool) {
        if !force && self.last_progress.elapsed() < Duration::from_millis(50) {
            return;
        }
        self.last_progress = Instant::now();
        self.observer.on_progress(&ScanProgress {
            group_id: group_id.to_string(),
            category: category_name(category).to_string(),
            visited_entries: self.visited,
            found_bytes: self.found_bytes,
        });
    }

    fn listing(&mut self, dir: &str, group_id: &str) -> Listing {
        let key = dir.to_ascii_lowercase();
        if let Some(cached) = self.cache.get(&key) {
            return cached.as_ref().clone();
        }
        let mut listing = Listing {
            children: Vec::new(),
            issues: Vec::new(),
            by_name: HashMap::new(),
        };
        if self.stopped(group_id) {
            return listing;
        }
        let result = native_windows::list_directory(dir, |entry| {
            self.visited = self.visited.saturating_add(1);
            if self.stopped(group_id) {
                return false;
            }
            let Some(name) = entry.name else {
                listing.issues.push("unrepresentable_name");
                return true;
            };
            let path = child_path(dir, &name);
            listing.children.push(Child {
                name,
                path,
                kind: kind_from_attributes(entry.attributes),
                len: entry.len,
                mtime: clamp_time(entry.mtime),
                creation: clamp_time(entry.creation),
                allocation: Some(entry.allocation),
                reparse_tag: entry.reparse_tag,
                identity: entry.identity,
            });
            true
        });
        if result.is_err() {
            listing.issues.push("access_denied");
        }
        for child in &listing.children {
            self.index_junction(child);
        }
        if !self.include_quarantine {
            listing.children.retain(|c| {
                !(c.kind == Kind::Dir && c.name.eq_ignore_ascii_case(".water-quarantine"))
            });
        }
        listing.by_name = listing
            .children
            .iter()
            .enumerate()
            .map(|(i, child)| (child.name.to_ascii_lowercase(), i))
            .collect();
        self.cache.insert(key, Arc::new(listing.clone()));
        listing
    }

    fn cached_child(&self, path: &str) -> Option<Child> {
        let (parent, name) = path.rsplit_once('\\')?;
        let parent = if parent.len() == 2 {
            format!("{parent}\\")
        } else {
            parent.to_string()
        };
        let listing = self.cache.get(&parent.to_ascii_lowercase())?;
        let index = listing.by_name.get(&name.to_ascii_lowercase())?;
        listing.children.get(*index).cloned()
    }

    fn child(&self, path: &str) -> Option<Child> {
        self.cached_child(path).or_else(|| classify_path(path))
    }

    fn index_junction(&mut self, child: &Child) {
        if !self.extras_options.junctions
            || child.kind != Kind::Reparse
            || self
                .extras
                .junctions
                .iter()
                .any(|j| path_eq(&j.path, &child.path))
        {
            return;
        }
        let supported = matches!(child.reparse_tag, 0xa0000003 | 0xa000000c)
            || (child.reparse_tag == 0
                && fs::symlink_metadata(&child.path).is_ok_and(|m| m.file_type().is_symlink()));
        if !supported {
            return;
        }
        if self.extras.junctions.len() >= 10_000 {
            self.extras.junctions_truncated = true;
            return;
        }
        let decoded = native_windows::reparse_data(&child.path)
            .ok()
            .and_then(|data| crate::extras::decode_reparse(&child.path, &data));
        let (tag, target) = decoded.unwrap_or_else(|| {
            (
                if child.reparse_tag == 0xa000000c {
                    "symlink".into()
                } else {
                    "junction".into()
                },
                None,
            )
        });
        self.extras.junctions.push(Junction {
            path: child.path.clone(),
            tag,
            target,
            final_target: None,
        });
    }

    fn listing_issues(&mut self, listing: &Listing, group_id: &str) {
        for code in &listing.issues {
            self.add_issue(code, group_id);
        }
    }

    fn list(&mut self, dir: &str, group_id: &str) -> Vec<Child> {
        let listing = self.listing(dir, group_id);
        self.listing_issues(&listing, group_id);
        listing.children
    }
}

fn kind_from_attributes(attrs: u32) -> Kind {
    if attrs & REPARSE != 0 {
        Kind::Reparse
    } else if attrs & DIRECTORY != 0 {
        Kind::Dir
    } else {
        Kind::File
    }
}

fn child_from_meta(name: String, path: String, meta: &Metadata) -> Child {
    #[cfg(windows)]
    let attrs = meta.file_attributes();
    #[cfg(not(windows))]
    let attrs = if meta.is_symlink() {
        REPARSE
    } else if meta.is_dir() {
        DIRECTORY
    } else {
        0
    };
    Child {
        name,
        path,
        kind: kind_from_attributes(attrs),
        len: meta.len(),
        mtime: clamp_time(meta.modified().unwrap_or(SystemTime::UNIX_EPOCH)),
        creation: clamp_time(meta.created().unwrap_or(SystemTime::UNIX_EPOCH)),
        allocation: None,
        reparse_tag: 0,
        identity: None,
    }
}

fn classify_path(path: &str) -> Option<Child> {
    let meta = fs::symlink_metadata(path).ok()?;
    Some(child_from_meta(
        file_name(path).to_string(),
        path.to_string(),
        &meta,
    ))
}

fn category_name(category: Category) -> &'static str {
    match category {
        Category::AgentTool => "agent_tool",
        Category::Browser => "browser",
        Category::SystemTemp => "system_temp",
        Category::AppLeftover => "app_leftover",
        Category::DevCache => "dev_cache",
        Category::CrashLog => "crash_log",
        Category::GpuSystem => "gpu_system",
        Category::Custom => "custom",
        Category::Unrecognized => "unrecognized",
    }
}

fn accept_type(item_type: ItemType, kind: Kind) -> bool {
    match (item_type, kind) {
        (_, Kind::Reparse) => false,
        (ItemType::Any, _) => true,
        (ItemType::Dir, Kind::Dir) => true,
        (ItemType::File, Kind::File) => true,
        _ => false,
    }
}

fn ignored_root(path: &str) -> bool {
    path.split('\\')
        .any(|p| p.eq_ignore_ascii_case(".water-quarantine"))
}

fn odd_name(name: &str) -> bool {
    let first = name.split('.').next().unwrap_or("").to_ascii_uppercase();
    name.ends_with(['.', ' '])
        || ["CON", "PRN", "AUX", "NUL"].contains(&first.as_str())
        || (first.len() == 4
            && (first.starts_with("COM") || first.starts_with("LPT"))
            && matches!(first.as_bytes()[3], b'1'..=b'9'))
}

fn valuable(child: &Child) -> bool {
    if child.kind != Kind::File {
        return false;
    }
    let path = child.path.to_ascii_lowercase();
    let parent = path.rsplit_once('\\').map_or("", |(p, _)| p);
    if parent
        .split('\\')
        .any(|p| ["node_modules", "site-packages", "dist-packages"].contains(&p))
    {
        return false;
    }
    let name = child.name.to_ascii_lowercase();
    if ["thumbs.db", "ehthumbs.db"].contains(&name.as_str()) {
        return false;
    }
    name.starts_with(".env")
        || name.starts_with("credentials")
        || name == "google-services.json"
        || [
            "*.jks",
            "*.keystore",
            "*.p12",
            "*.pfx",
            "*.p8",
            "*.pem",
            "*.key",
            "*.mobileprovision",
            "*.db",
            "*.sqlite*",
        ]
        .iter()
        .any(|p| match_segment(p, &name))
}

fn retain_name(names: &mut Vec<String>, value: String) {
    names.push(value);
    names.sort_by_key(|s| s.to_ascii_lowercase());
    names.truncate(8);
}

fn observe_name(measured: &mut Measured, child: &Child, root: &str) {
    let relative = if path_eq(root, &child.path) {
        child.name.clone()
    } else {
        child
            .path
            .get(root.len()..)
            .unwrap_or(&child.name)
            .trim_start_matches('\\')
            .to_string()
    };
    if valuable(child) {
        measured.valuable_count += 1;
        retain_name(&mut measured.valuable_names, relative.clone());
    }
    if odd_name(&child.name) {
        measured.odd_count += 1;
        retain_name(&mut measured.odd_names, relative);
    }
}

fn accumulate(
    measured: &mut Measured,
    child: &Child,
    root: &str,
    identities: &mut HashSet<(u32, [u8; 16])>,
) {
    measured.newest = measured.newest.max(child.mtime);
    measured.oldest = measured.oldest.min(child.mtime);
    let latest = child.mtime.max(child.creation);
    measured.latest_newest = measured.latest_newest.max(latest);
    measured.latest_oldest = measured.latest_oldest.min(latest);
    if child
        .path
        .rsplit_once('\\')
        .is_some_and(|(parent, _)| path_eq(parent, root))
        && child.name.eq_ignore_ascii_case(".git")
    {
        measured.has_git = true;
    }
    observe_name(measured, child, root);
    if child.kind == Kind::File {
        measured.bytes = measured.bytes.saturating_add(child.len);
        measured.files += 1;
        if child.identity.is_none_or(|id| identities.insert(id)) {
            measured.unique_bytes = measured.unique_bytes.saturating_add(child.len);
            measured.disk_bytes = measured
                .disk_bytes
                .saturating_add(child.allocation.unwrap_or(0));
        }
    }
}

fn measure(engine: &mut Engine<'_>, path: &str, kind: Kind, group_id: &str) -> Measured {
    let Some(mut self_child) = engine.child(path) else {
        engine.add_issue("access_denied", group_id);
        return Measured::empty(SystemTime::UNIX_EPOCH, SystemTime::UNIX_EPOCH);
    };
    let mut measured = Measured::empty(self_child.mtime, self_child.creation);
    let mut identities = HashSet::new();
    if kind == Kind::File {
        if self_child.allocation.is_none() {
            self_child.allocation =
                Some(native_windows::allocation_of(path).unwrap_or_else(|_| {
                    engine.add_issue("access_denied", group_id);
                    0
                }));
        }
        accumulate(&mut measured, &self_child, path, &mut identities);
        return measured;
    }
    observe_name(&mut measured, &self_child, path);
    let mut stack = vec![path.to_string()];
    while let Some(dir) = stack.pop() {
        if engine.stopped(group_id) {
            break;
        }
        for child in engine.list(&dir, group_id) {
            accumulate(&mut measured, &child, path, &mut identities);
            match child.kind {
                Kind::File => {}
                Kind::Dir => stack.push(child.path),
                Kind::Reparse => {}
            }
        }
        engine.cache.remove(&dir.to_ascii_lowercase());
    }
    measured
}

#[derive(Clone)]
struct Measured {
    bytes: u64,
    unique_bytes: u64,
    files: u64,
    newest: SystemTime,
    oldest: SystemTime,
    has_git: bool,
    disk_bytes: u64,
    latest_newest: SystemTime,
    latest_oldest: SystemTime,
    valuable_count: u64,
    valuable_names: Vec<String>,
    odd_count: u64,
    odd_names: Vec<String>,
}

impl Measured {
    fn empty(mtime: SystemTime, creation: SystemTime) -> Self {
        Self {
            bytes: 0,
            unique_bytes: 0,
            files: 0,
            newest: mtime,
            oldest: mtime,
            has_git: false,
            disk_bytes: 0,
            latest_newest: mtime.max(creation),
            latest_oldest: mtime.max(creation),
            valuable_count: 0,
            valuable_names: vec![],
            odd_count: 0,
            odd_names: vec![],
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn push_measured_hit(
    engine: &mut Engine<'_>,
    hits: &mut Vec<Hit>,
    target: &Target,
    index: usize,
    path: &str,
    kind: Kind,
    measured: Measured,
) -> bool {
    // A stop during the walk leaves size, newest_activity and the .git check
    // incomplete: the entry is not an obtained result and is not output.
    if engine.stopped(&target.group_id) {
        return false;
    }
    let identity = if matches!(
        &target.match_spec,
        Match::Marker {
            marker: Marker::FileName { .. },
            ..
        }
    ) {
        engine.cached_child(path).and_then(|child| {
            child.identity.map(|(serial, id)| Identity {
                volume_serial: format!("{serial:08X}"),
                file_id: id.iter().map(|b| format!("{b:02x}")).collect(),
            })
        })
    } else {
        finish_identity(path).ok()
    };
    if engine.stopped(&target.group_id) {
        return false;
    }
    push_complete_hit(engine, hits, target, index, path, kind, measured, identity);
    true
}

#[allow(clippy::too_many_arguments)]
fn push_complete_hit(
    engine: &mut Engine<'_>,
    hits: &mut Vec<Hit>,
    target: &Target,
    index: usize,
    path: &str,
    kind: Kind,
    measured: Measured,
    identity: Option<Identity>,
) {
    engine.found_bytes = engine.found_bytes.saturating_add(measured.bytes);
    hits.push(Hit {
        target_index: index,
        target_id: target.target_id.clone(),
        group_id: target.group_id.clone(),
        level: target.level,
        min_age_hours: target.min_age_hours,
        keep_newest: target.keep_newest,
        path: path.to_string(),
        kind,
        total_bytes: measured.bytes,
        unique_bytes: measured.unique_bytes,
        file_count: measured.files,
        newest_activity: if target.age_basis == AgeBasis::Modified {
            measured.newest
        } else {
            measured.latest_newest
        },
        oldest_activity: if target.age_basis == AgeBasis::Modified {
            measured.oldest
        } else {
            measured.latest_oldest
        },
        has_git: measured.has_git,
        identity,
        disk_bytes: measured.disk_bytes,
        git_is_copy: target.git_is_copy,
        keep_by: target.keep_by,
        unlocks_target_ids: target.unlocks_target_ids.clone(),
        valuable_count: measured.valuable_count,
        valuable_names: measured.valuable_names,
        odd_count: measured.odd_count,
        odd_names: measured.odd_names,
    });
}

fn marker_matches(dir: &str, marker: &Marker, children: &[Child]) -> bool {
    match marker {
        Marker::DirName { names } => names
            .iter()
            .any(|want| file_name(dir).eq_ignore_ascii_case(want)),
        Marker::DirNamePattern { patterns } => {
            patterns.iter().any(|p| match_segment(p, file_name(dir)))
        }
        Marker::FileName { .. } => false,
        Marker::File {
            name,
            min_bytes,
            max_bytes,
        } => children.iter().any(|child| {
            child.kind == Kind::File
                && child.name.eq_ignore_ascii_case(name)
                && child.len >= *min_bytes
                && child.len <= *max_bytes
        }),
        Marker::ChildrenAll { names } => names.iter().all(|want| {
            children
                .iter()
                .any(|child| child.name.eq_ignore_ascii_case(want))
        }),
    }
}

struct ParentEntry {
    name: String,
    kind: Kind,
    len: u64,
}

fn conditions_match(
    dir: &str,
    conditions: &[Condition],
    parent: Option<&[ParentEntry]>,
    marker: Option<&Marker>,
    bytes: Option<u64>,
) -> bool {
    if conditions.is_empty() {
        return true;
    }
    let components: Vec<_> = dir
        .split('\\')
        .skip(1)
        .filter(|part| !part.is_empty())
        .collect();
    conditions.iter().all(|condition| match condition {
        Condition::ParentHasFile { name } => parent.is_some_and(|entries| {
            entries
                .iter()
                .any(|entry| entry.kind == Kind::File && entry.name.eq_ignore_ascii_case(name))
        }),
        Condition::ParentHasOtherEntries { except } => parent.is_some_and(|entries| {
            entries.iter().any(|entry| {
                !entry.name.eq_ignore_ascii_case(file_name(dir))
                    && !except
                        .iter()
                        .any(|name| entry.name.eq_ignore_ascii_case(name))
            })
        }),
        Condition::ParentHasOtherMatch => parent.is_some_and(|entries| {
            entries.iter().any(|entry| {
                !entry.name.eq_ignore_ascii_case(file_name(dir))
                    && match marker {
                        Some(Marker::DirName { names }) => {
                            entry.kind == Kind::Dir
                                && names.iter().any(|n| entry.name.eq_ignore_ascii_case(n))
                        }
                        Some(Marker::DirNamePattern { patterns }) => {
                            entry.kind == Kind::Dir
                                && patterns.iter().any(|p| match_segment(p, &entry.name))
                        }
                        Some(Marker::FileName { patterns }) => {
                            entry.kind == Kind::File
                                && patterns.iter().any(|p| match_segment(p, &entry.name))
                        }
                        _ => false,
                    }
            })
        }),
        Condition::ParentHasFileMatching { pattern } => parent.is_some_and(|entries| {
            entries
                .iter()
                .any(|e| e.kind == Kind::File && match_segment(pattern, &e.name))
        }),
        Condition::ParentLacksFileMatching { pattern } => parent.is_some_and(|entries| {
            !entries
                .iter()
                .any(|e| e.kind == Kind::File && match_segment(pattern, &e.name))
        }),
        Condition::SiblingWithoutSuffix { suffixes } => parent.is_some_and(|entries| {
            let name = file_name(dir);
            suffixes.iter().any(|suffix| {
                name.to_ascii_lowercase()
                    .ends_with(&suffix.to_ascii_lowercase())
                    && name
                        .get(..name.len().saturating_sub(suffix.len()))
                        .is_some_and(|plain| {
                            entries.iter().any(|e| {
                                e.kind == Kind::File
                                    && e.name.eq_ignore_ascii_case(plain)
                                    && bytes.is_none_or(|size| e.len >= size)
                            })
                        })
            })
        }),
        Condition::NoAncestorSuffix { suffixes } => components
            [..components.len().saturating_sub(1)]
            .iter()
            .all(|part| {
                !suffixes.iter().any(|suffix| {
                    part.to_ascii_lowercase()
                        .ends_with(&suffix.to_ascii_lowercase())
                })
            }),
        Condition::PathHasAny { names } => components.iter().any(|part| {
            names.iter().any(|name| {
                part.to_ascii_lowercase()
                    .contains(&name.to_ascii_lowercase())
            })
        }),
    })
}

fn merge_hits(mut hits: Vec<Hit>) -> Vec<Hit> {
    hits.sort_by(|a, b| {
        a.path
            .to_ascii_lowercase()
            .cmp(&b.path.to_ascii_lowercase())
            .then(a.target_index.cmp(&b.target_index))
    });
    let mut out = Vec::new();
    for hit in hits {
        if let Some(existing) = out
            .last_mut()
            .filter(|item: &&mut Hit| path_eq(&item.path, &hit.path))
        {
            let take = hit.level.rank() > existing.level.rank()
                || (hit.level.rank() == existing.level.rank()
                    && hit.target_index < existing.target_index);
            if take {
                *existing = hit;
            }
        } else {
            out.push(hit);
        }
    }
    out
}

fn too_recent(now: SystemTime, newest: SystemTime, min_age_hours: u64) -> bool {
    match now.duration_since(newest) {
        Ok(age) => age < Duration::from_secs(min_age_hours.saturating_mul(3600)),
        Err(_) => true,
    }
}

fn classify_reason(
    hit: &Hit,
    engine: &Engine<'_>,
    all: &[Hit],
    hard_guards: &[String],
) -> Option<String> {
    if !hit.level.cleanable() {
        return Some("level_not_cleanable".to_string());
    }
    if hard_guards
        .iter()
        .any(|guard| path_eq(&hit.path, guard) || is_proper_ancestor(&hit.path, guard))
    {
        return Some("hard_guard".to_string());
    }
    let protected: Vec<&Hit> = all
        .iter()
        .filter(|item| item.level == Level::Protected)
        .collect();
    if protected
        .iter()
        .any(|item| is_proper_ancestor(&hit.path, &item.path))
    {
        return Some("contains_protected".to_string());
    }
    if protected.iter().any(|item| {
        is_proper_ancestor(&item.path, &hit.path)
            && !hit.unlocks_target_ids.contains(&item.target_id)
    }) {
        return Some("inside_protected".to_string());
    }
    if hit.kind == Kind::Dir && hit.has_git && !hit.git_is_copy {
        return Some("repository".to_string());
    }
    if too_recent(engine.now, hit.newest_activity, hit.min_age_hours) {
        return Some("too_recent".to_string());
    }
    None
}

fn apply_keep_newest(rows: &mut [(Hit, Option<String>)]) {
    let mut groups: Vec<(usize, u64, Option<String>)> = Vec::new();
    for (hit, reason) in rows.iter() {
        let parent = (hit.keep_by == KeepBy::VersionName).then(|| {
            hit.path
                .rsplit_once('\\')
                .map_or("", |(p, _)| p)
                .to_ascii_lowercase()
        });
        if reason.is_none()
            && hit.keep_newest > 0
            && !groups
                .iter()
                .any(|(i, _, p)| *i == hit.target_index && *p == parent)
        {
            groups.push((hit.target_index, hit.keep_newest, parent));
        }
    }
    for (target_index, keep, parent) in groups {
        let mut idxs: Vec<usize> = rows
            .iter()
            .enumerate()
            .filter(|(_, (hit, reason))| {
                hit.target_index == target_index
                    && reason.is_none()
                    && parent.as_ref().is_none_or(|p| {
                        hit.path
                            .rsplit_once('\\')
                            .is_some_and(|(value, _)| value.eq_ignore_ascii_case(p))
                    })
            })
            .map(|(i, _)| i)
            .collect();
        idxs.sort_by(|a, b| {
            if parent.is_some() {
                return version_cmp(file_name(&rows[*b].0.path), file_name(&rows[*a].0.path));
            }
            rows[*b]
                .0
                .newest_activity
                .cmp(&rows[*a].0.newest_activity)
                .then(
                    rows[*a]
                        .0
                        .path
                        .to_ascii_lowercase()
                        .cmp(&rows[*b].0.path.to_ascii_lowercase()),
                )
        });
        for idx in idxs.into_iter().take(keep as usize) {
            rows[idx].1 = Some("keep_newest".to_string());
        }
    }
}

fn version_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let numbers = |name: &str| {
        name.split(|c: char| !c.is_ascii_digit())
            .filter(|p| !p.is_empty())
            .map(|p| p.trim_start_matches('0').to_string())
            .collect::<Vec<_>>()
    };
    let left = numbers(a);
    let right = numbers(b);
    for (x, y) in left.iter().zip(&right) {
        let order = x.len().cmp(&y.len()).then(x.cmp(y));
        if !order.is_eq() {
            return order;
        }
    }
    left.len()
        .cmp(&right.len())
        .then(a.to_ascii_lowercase().cmp(&b.to_ascii_lowercase()))
}

fn top_keys(items: &[&Hit]) -> Vec<TopKey> {
    let mut map: Vec<(String, u64, u64, SystemTime)> = Vec::new();
    for item in items {
        let key = normalize_key(file_name(&item.path));
        if let Some(row) = map.iter_mut().find(|(k, _, _, _)| k == &key) {
            row.1 += 1;
            row.2 = row.2.saturating_add(item.total_bytes);
            if item.newest_activity > row.3 {
                row.3 = item.newest_activity;
            }
        } else {
            map.push((key, 1, item.total_bytes, item.newest_activity));
        }
    }
    map.sort_by(|a, b| b.2.cmp(&a.2).then(a.0.cmp(&b.0)));
    map.into_iter()
        .take(10)
        .map(|(key, count, bytes, newest)| TopKey {
            key,
            count,
            bytes: format_bytes(bytes),
            newest_activity: format_rfc3339(newest),
        })
        .collect()
}

fn finish_identity(path: &str) -> Result<Identity, ScanError> {
    native_windows::identity_of(path)
}

#[allow(clippy::too_many_arguments)]
pub fn scan(
    plan: &ScanPlan,
    scan_id: &str,
    options: &ScanOptions,
    cancel: &CancelToken,
    observer: &dyn ScanObserver,
    now: SystemTime,
) -> Result<ScanResult, ScanError> {
    scan_full(
        plan,
        scan_id,
        options,
        &ExtrasOptions::default(),
        cancel,
        observer,
        now,
    )
    .map(|pair| pair.0)
}

pub fn scan_full(
    plan: &ScanPlan,
    scan_id: &str,
    options: &ScanOptions,
    extras: &ExtrasOptions,
    cancel: &CancelToken,
    observer: &dyn ScanObserver,
    now: SystemTime,
) -> Result<(ScanResult, ScanExtras), ScanError> {
    let mut engine = Engine {
        options,
        cancel,
        observer,
        now,
        started: Instant::now(),
        visited: 0,
        found_bytes: 0,
        status: "completed",
        issues: Vec::new(),
        last_progress: Instant::now() - Duration::from_millis(50),
        cache: HashMap::new(),
        extras_options: extras,
        include_quarantine: false,
        extras: ScanExtras {
            extras_version: "water.scan-extras.v1".into(),
            scan_id: scan_id.into(),
            junctions: vec![],
            junctions_truncated: false,
            declarations: vec![],
        },
    };
    let mut fallbacks = vec![None; plan.targets.len()];
    for (index, target) in plan.targets.iter().enumerate() {
        if let Match::Marker {
            fallback_for: Some(reference),
            ..
        } = &target.match_spec
            && let Some(main) = plan.targets.iter().position(|t| &t.target_id == reference)
        {
            fallbacks[main] = Some(index);
        }
    }
    let streaming::WalkResult {
        mut hits,
        searches,
        discovery_issues,
    } = streaming::walk(&mut engine, plan, &fallbacks);
    let guard_hits = hits.clone();
    let mut expanded = plan.clone();
    // Even a skipped search must pass through stopped(): it owns both the
    // partial status and the budget issue for this unfinished location.
    let clusters = if extras.leak_clusters {
        build_clusters(&mut engine, &mut hits, &mut expanded, searches)
    } else {
        BTreeMap::new()
    };
    let final_discoveries: HashSet<_> = hits
        .iter()
        .map(|hit| (hit.path.to_ascii_lowercase(), hit.target_index))
        .collect();
    for row in discovery_issues {
        if final_discoveries.contains(&(row.path, row.index)) {
            for code in row.codes {
                engine.add_issue(code, &plan.targets[row.index].group_id);
            }
        }
    }
    let plan = &expanded;
    crate::extras::resolve_junctions(&mut engine.extras);
    engine
        .extras
        .declarations
        .sort_by_key(|p| p.to_ascii_lowercase());
    engine.extras.declarations.dedup_by(|a, b| path_eq(a, b));
    engine.extras.declarations.truncate(256);
    let merged = merge_hits(hits);
    let mut guards = merged.clone();
    guards.extend(
        guard_hits
            .into_iter()
            .filter(|h| h.level == Level::Protected),
    );
    let mut rows: Vec<(Hit, Option<String>)> = merged
        .iter()
        .map(|hit| {
            let reason = classify_reason(hit, &engine, &guards, &plan.hard_guards);
            (hit.clone(), reason)
        })
        .collect();
    apply_keep_newest(&mut rows);
    let mut items = Vec::new();
    for (offset, (hit, mut reason)) in rows.into_iter().enumerate() {
        let identity = match hit.identity.clone() {
            Some(id) => Some(id),
            None => {
                if hit.level.cleanable() {
                    engine.add_issue("identity_unavailable", &hit.group_id);
                }
                if reason.is_none() {
                    reason = Some("identity_unavailable".to_string());
                }
                None
            }
        };
        if identity.is_none()
            && reason.as_deref() != Some("identity_unavailable")
            && reason.is_none()
        {
            reason = Some("identity_unavailable".to_string());
        }
        items.push((
            hit,
            Item {
                item_id: format!("i-{:06}", offset + 1),
                group_id: String::new(),
                path: String::new(),
                kind: String::new(),
                total_bytes: String::new(),
                unique_bytes: String::new(),
                file_count: 0,
                newest_activity: String::new(),
                identity,
                eligible: reason.is_none(),
                ineligible_reason: reason,
                disk_bytes: None,
                template: None,
                valuable_count: 0,
                valuable_names: vec![],
                odd_count: 0,
                odd_names: vec![],
                referenced_count: 0,
                referenced_by: vec![],
            },
        ));
    }
    items.sort_by(|a, b| {
        let ia = plan
            .targets
            .iter()
            .position(|t| t.group_id == a.0.group_id)
            .unwrap_or(usize::MAX);
        let ib = plan
            .targets
            .iter()
            .position(|t| t.group_id == b.0.group_id)
            .unwrap_or(usize::MAX);
        ia.cmp(&ib).then(
            a.0.path
                .to_ascii_lowercase()
                .cmp(&b.0.path.to_ascii_lowercase()),
        )
    });
    let mut out_items = Vec::new();
    for (seq, (hit, mut item)) in items.into_iter().enumerate() {
        item.item_id = format!("i-{:06}", seq + 1);
        item.group_id = hit.group_id.clone();
        item.path = hit.path.clone();
        item.kind = match hit.kind {
            Kind::File => "file",
            _ => "dir",
        }
        .to_string();
        item.total_bytes = format_bytes(hit.total_bytes);
        item.unique_bytes = format_bytes(hit.unique_bytes);
        item.file_count = hit.file_count;
        item.newest_activity = format_rfc3339(hit.newest_activity);
        item.disk_bytes = Some(format_bytes(hit.disk_bytes));
        item.template = name_template(file_name(&hit.path), hit.kind == Kind::File);
        item.valuable_count = hit.valuable_count;
        item.valuable_names = hit.valuable_names.clone();
        item.odd_count = hit.odd_count;
        item.odd_names = hit.odd_names.clone();
        for junction in &engine.extras.junctions {
            if is_proper_ancestor(&item.path, &junction.path) || path_eq(&item.path, &junction.path)
            {
                continue;
            }
            if junction.final_target.as_ref().is_some_and(|p| {
                path_eq(p, &item.path)
                    || is_proper_ancestor(p, &item.path)
                    || is_proper_ancestor(&item.path, p)
            }) {
                item.referenced_count += 1;
                if item.referenced_by.len() < 8 {
                    item.referenced_by.push(junction.path.clone());
                }
            }
        }
        out_items.push((hit, item));
    }
    let mut groups = Vec::new();
    let mut seen = Vec::new();
    for target in &plan.targets {
        if seen.iter().any(|id: &String| id == &target.group_id) {
            continue;
        }
        seen.push(target.group_id.clone());
        let members: Vec<&Hit> = out_items
            .iter()
            .filter(|(hit, _)| hit.group_id == target.group_id)
            .map(|(hit, _)| hit)
            .collect();
        let eligible: Vec<&Hit> = out_items
            .iter()
            .filter(|(hit, item)| hit.group_id == target.group_id && item.eligible)
            .map(|(hit, _)| hit)
            .collect();
        let total_bytes: u64 = members.iter().map(|hit| hit.total_bytes).sum();
        let eligible_bytes: u64 = eligible.iter().map(|hit| hit.total_bytes).sum();
        let file_count: u64 = members.iter().map(|hit| hit.file_count).sum();
        let oldest = members.iter().map(|hit| hit.oldest_activity).min();
        let newest = members.iter().map(|hit| hit.newest_activity).max();
        let keys = if target.discovery_group(plan) && members.len() >= 5 {
            top_keys(&members)
        } else {
            Vec::new()
        };
        groups.push(Group {
            group_id: target.group_id.clone(),
            rule_id: target.rule_id.clone(),
            level: target.level,
            category: target.category,
            item_count: members.len() as u64,
            eligible_count: eligible.len() as u64,
            total_bytes: format_bytes(total_bytes),
            eligible_bytes: format_bytes(eligible_bytes),
            unique_bytes: format_bytes(members.iter().map(|hit| hit.unique_bytes).sum()),
            eligible_unique_bytes: format_bytes(eligible.iter().map(|hit| hit.unique_bytes).sum()),
            file_count,
            oldest_activity: oldest.map(format_rfc3339),
            newest_activity: newest.map(format_rfc3339),
            in_use: target.in_use.clone(),
            top_keys: keys,
            disk_bytes: Some(format_bytes(members.iter().map(|hit| hit.disk_bytes).sum())),
            eligible_disk_bytes: Some(format_bytes(
                eligible.iter().map(|hit| hit.disk_bytes).sum(),
            )),
            cluster: clusters.get(&target.group_id).cloned(),
        });
    }
    if engine.status == "cancelled" {
        engine
            .issues
            .retain(|issue| issue.code != "budget_exhausted");
    }
    engine
        .issues
        .sort_by(|a, b| a.group_id.cmp(&b.group_id).then(a.code.cmp(&b.code)));
    Ok((
        ScanResult {
            result_version: "water.scan-result.v1".to_string(),
            scan_id: scan_id.to_string(),
            started_at: format_rfc3339(now),
            ended_at: format_rfc3339(now + engine.started.elapsed()),
            status: engine.status.to_string(),
            visited_entries: engine.visited,
            groups,
            items: out_items.into_iter().map(|(_, item)| item).collect(),
            issues: engine.issues,
        },
        engine.extras,
    ))
}

fn file_parts(name: &str) -> (&str, &str) {
    name.rfind('.')
        .filter(|i| *i > 0)
        .and_then(|i| {
            let tail = &name[i + 1..];
            ((1..=8).contains(&tail.len()) && tail.bytes().all(|b| b.is_ascii_alphanumeric()))
                .then_some((&name[..i], &name[i..]))
        })
        .unwrap_or((name, ""))
}

fn hash_extra(template: &str, name: &str) -> bool {
    let Some((prefix, extension)) = template.split_once("<h>") else {
        return false;
    };
    let (_, actual_extension) = file_parts(name);
    actual_extension.eq_ignore_ascii_case(extension)
        && match_segment(&format!("{prefix}*{extension}"), name)
}

fn claimed(paths: &HashSet<String>, path: &str) -> bool {
    let mut path = path;
    loop {
        if paths.contains(path) {
            return true;
        }
        let Some((parent, _)) = path.rsplit_once('\\') else {
            return false;
        };
        path = parent;
    }
}

fn build_clusters(
    engine: &mut Engine<'_>,
    hits: &mut Vec<Hit>,
    plan: &mut ScanPlan,
    mut searches: Vec<streaming::ClusterSearch>,
) -> BTreeMap<String, ClusterInfo> {
    use std::collections::BTreeSet;
    let Some(first_search) = searches.first() else {
        return BTreeMap::new();
    };
    let mut exact = HashSet::new();
    let mut discovery_exact = HashSet::new();
    let mut non_discovery = BTreeSet::new();
    for hit in hits.iter() {
        // This indexing serves unfinished cluster searches, not the already
        // emitted ordinary hit's group.
        if engine.stopped(&first_search.group) {
            break;
        }
        let path = hit.path.to_ascii_lowercase();
        exact.insert(path.clone());
        if matches!(
            plan.targets[hit.target_index].match_spec,
            Match::Discovery { .. }
        ) {
            discovery_exact.insert(path);
        } else {
            non_discovery.insert(path);
        }
    }
    searches.sort_by_key(|s| {
        (
            s.parent.matches('\\').count(),
            s.parent.to_ascii_lowercase(),
        )
    });
    let mut infos = BTreeMap::new();
    let mut member_paths = HashSet::new();
    let mut pending_groups = vec![];
    for search in searches {
        let streaming::ClusterSearch {
            parent,
            category,
            discovery,
            group,
            members: candidates,
        } = search;
        if engine.stopped(&group) {
            // Visit the remaining search owners too, without building them.
            continue;
        }
        if claimed(&member_paths, &parent.to_ascii_lowercase())
            || claimed(&exact, &parent.to_ascii_lowercase())
        {
            continue;
        }
        let mut templates: BTreeMap<(String, String), Vec<streaming::ClusterMember>> =
            BTreeMap::new();
        let mut available = vec![];
        for (child, measured, issues) in candidates {
            engine.emit(&group, category, false);
            if engine.stopped(&group) {
                break;
            }
            let key = child.path.to_ascii_lowercase();
            let eligible = if discovery {
                let prefix = format!("{key}\\");
                discovery_exact.contains(&key)
                    && !non_discovery.contains(&key)
                    && !non_discovery
                        .range(prefix.clone()..)
                        .next()
                        .is_some_and(|p| p.starts_with(&prefix))
            } else {
                !exact.contains(&key)
            };
            if !eligible || claimed(&member_paths, &key) {
                continue;
            }
            if let Some(template) = name_template(&child.name, child.kind == Kind::File)
                && !(child.kind == Kind::File && template.contains("<d>"))
            {
                templates
                    .entry((
                        (if child.kind == Kind::File {
                            "file"
                        } else {
                            "dir"
                        })
                        .into(),
                        template,
                    ))
                    .or_default()
                    .push((child.clone(), measured.clone(), issues.clone()));
            }
            available.push((child, measured, issues));
        }
        if engine.stopped(&group) {
            continue;
        }
        for ((kind, template), mut members) in templates {
            if engine.stopped(&group) {
                break;
            }
            members.retain(|(c, _, _)| !member_paths.contains(&c.path.to_ascii_lowercase()));
            if members.len() < CLUSTER_MIN_MEMBERS {
                continue;
            }
            let mut all_members = members.clone();
            let own: HashSet<_> = members
                .iter()
                .map(|(c, _, _)| c.path.to_ascii_lowercase())
                .collect();
            if kind == "file" && template.contains("<h>") {
                for (child, measured, issues) in &available {
                    engine.emit(&group, category, false);
                    if engine.stopped(&group) {
                        break;
                    }
                    let key = child.path.to_ascii_lowercase();
                    if child.kind == Kind::File
                        && !member_paths.contains(&key)
                        && !own.contains(&key)
                        && hash_extra(&template, &child.name)
                    {
                        all_members.push((child.clone(), measured.clone(), issues.clone()));
                    }
                }
            }
            if engine.stopped(&group) {
                break;
            }
            let mut sizes: Vec<_> = members.iter().map(|(_, m, _)| m.disk_bytes).collect();
            sizes.sort_unstable();
            let median = sizes[(sizes.len() - 1) / 2] as u128;
            let similar = sizes
                .iter()
                .filter(|size| {
                    if median == 0 {
                        **size == 0
                    } else {
                        (**size as u128) * 4 >= median && **size as u128 <= median * 4
                    }
                })
                .count()
                * 5
                >= members.len() * 4;
            let mut days = BTreeMap::<String, usize>::new();
            for (child, _, _) in &members {
                if engine.stopped(&group) {
                    break;
                }
                *days
                    .entry(format_rfc3339(child.creation)[..10].to_string())
                    .or_default() += 1;
            }
            if engine.stopped(&group) {
                break;
            }
            let burst_day = days.into_iter().find(|(_, n)| *n >= 5).map(|(day, _)| day);
            let info = ClusterInfo {
                parent: parent.clone(),
                kind: kind.clone(),
                template: template.clone(),
                member_count: members.len() as u64,
                similar_size: similar,
                burst: burst_day.is_some(),
                burst_day,
                keep_newest: if template.contains("<h>") { 1 } else { 0 },
            };
            let id = cluster_id(&parent, &kind, &template);
            let target = Target {
                target_id: id.clone(),
                group_id: id.clone(),
                rule_id: "leak-cluster".into(),
                level: if info.similar_size || info.burst {
                    Level::Confirm
                } else {
                    Level::Advisory
                },
                category,
                match_spec: Match::Discovery {
                    root: parent.clone(),
                },
                item_type: ItemType::Any,
                min_age_hours: 24,
                keep_newest: info.keep_newest,
                in_use: crate::model::InUse {
                    mode: "runs_from_or_references_item".into(),
                    processes: vec![],
                    root_levels: None,
                },
                git_is_copy: false,
                age_basis: AgeBasis::LatestCreatedOrModified,
                keep_by: KeepBy::Activity,
                unlocks_target_ids: vec![],
            };
            for (child, _, _) in &all_members {
                member_paths.insert(child.path.to_ascii_lowercase());
            }
            pending_groups.push((id, target, info, all_members));
        }
    }
    hits.retain(|hit| !claimed(&member_paths, &hit.path.to_ascii_lowercase()));
    pending_groups.sort_by(|a, b| a.0.cmp(&b.0));
    for (id, target, info, members) in pending_groups {
        let index = plan.targets.len();
        plan.targets.push(target.clone());
        for (member, measured, issues) in members {
            for code in issues {
                engine.add_issue(code, &id);
            }
            let identity = member.identity.map(|(serial, id)| Identity {
                volume_serial: format!("{serial:08X}"),
                file_id: id.iter().map(|b| format!("{b:02x}")).collect(),
            });
            push_complete_hit(
                engine,
                hits,
                &target,
                index,
                &member.path,
                member.kind,
                measured,
                identity,
            );
        }
        engine.emit(&id, target.category, true);
        infos.insert(id, info);
    }
    infos
}

fn cluster_id(parent: &str, kind: &str, template: &str) -> String {
    let text = format!("{}\n{kind}\n{template}", parent.to_ascii_lowercase());
    let mut hash = 0xcbf29ce484222325u64;
    for byte in text.bytes() {
        hash = (hash ^ u64::from(byte)).wrapping_mul(0x100000001b3);
    }
    format!("leak:{hash:016x}")
}

pub fn space_overview(
    root: &str,
    scan_id: &str,
    options: &ScanOptions,
    cancel: &CancelToken,
    observer: &dyn ScanObserver,
    now: SystemTime,
) -> Result<SpaceOverview, ScanError> {
    crate::util::validate_abs_path(root)?;
    let Some(dir) = classify_path(root) else {
        return Err(ScanError::Native);
    };
    if dir.kind != Kind::Dir {
        return Err(ScanError::Native);
    }
    let extra_options = ExtrasOptions::default();
    let mut engine = Engine {
        options,
        cancel,
        observer,
        now,
        started: Instant::now(),
        visited: 0,
        found_bytes: 0,
        status: "completed",
        issues: vec![],
        last_progress: Instant::now() - Duration::from_millis(50),
        cache: HashMap::new(),
        extras_options: &extra_options,
        include_quarantine: true,
        extras: ScanExtras {
            extras_version: "water.scan-extras.v1".into(),
            scan_id: scan_id.into(),
            junctions: vec![],
            junctions_truncated: false,
            declarations: vec![],
        },
    };
    let mut entries = Vec::new();
    for child in engine.list(root, "space_overview") {
        if engine.stopped("space_overview") {
            break;
        }
        let measured = if child.kind == Kind::Reparse {
            Measured::empty(child.mtime, child.creation)
        } else {
            measure(&mut engine, &child.path, child.kind, "space_overview")
        };
        if engine.stopped("space_overview") {
            break;
        }
        engine.found_bytes = engine.found_bytes.saturating_add(measured.bytes);
        if engine.last_progress.elapsed() >= Duration::from_millis(50) {
            observer.on_progress(&ScanProgress {
                group_id: "space_overview".into(),
                category: "space".into(),
                visited_entries: engine.visited,
                found_bytes: engine.found_bytes,
            });
            engine.last_progress = Instant::now();
        }
        entries.push(SpaceEntry {
            name: child.name,
            path: child.path,
            kind: match child.kind {
                Kind::File => "file",
                Kind::Dir => "dir",
                Kind::Reparse => "reparse",
            }
            .into(),
            disk_bytes: format_bytes(measured.disk_bytes),
            total_bytes: format_bytes(measured.bytes),
            file_count: measured.files,
            newest_activity: Some(format_rfc3339(measured.newest)),
            has_git: measured.has_git,
        });
    }
    entries.sort_by(|a, b| {
        a.disk_bytes
            .parse::<u64>()
            .unwrap_or(0)
            .cmp(&b.disk_bytes.parse().unwrap_or(0))
            .reverse()
            .then(
                a.name
                    .to_ascii_lowercase()
                    .cmp(&b.name.to_ascii_lowercase()),
            )
    });
    let total = entries
        .iter()
        .map(|e| e.total_bytes.parse::<u64>().unwrap_or(0))
        .sum::<u64>();
    let disk = entries
        .iter()
        .map(|e| e.disk_bytes.parse::<u64>().unwrap_or(0))
        .sum::<u64>();
    let files = entries.iter().map(|e| e.file_count).sum();
    let others_count = entries.len().saturating_sub(10) as u64;
    let others_disk = entries
        .iter()
        .skip(10)
        .map(|e| e.disk_bytes.parse::<u64>().unwrap_or(0))
        .sum();
    entries.truncate(10);
    observer.on_progress(&ScanProgress {
        group_id: "space_overview".into(),
        category: "space".into(),
        visited_entries: engine.visited,
        found_bytes: engine.found_bytes,
    });
    Ok(SpaceOverview {
        overview_version: "water.space-overview.v1".into(),
        scan_id: scan_id.into(),
        root: root.into(),
        started_at: format_rfc3339(now),
        ended_at: format_rfc3339(now + engine.started.elapsed()),
        status: engine.status.into(),
        visited_entries: engine.visited,
        disk_bytes: format_bytes(disk),
        total_bytes: format_bytes(total),
        file_count: files,
        top: entries,
        others_count,
        others_disk_bytes: format_bytes(others_disk),
        issues: engine.issues,
    })
}

trait DiscoveryFlag {
    fn discovery_group(&self, plan: &ScanPlan) -> bool;
}

impl DiscoveryFlag for Target {
    fn discovery_group(&self, plan: &ScanPlan) -> bool {
        plan.targets
            .iter()
            .find(|t| t.group_id == self.group_id)
            .is_some_and(|t| matches!(t.match_spec, Match::Discovery { .. }))
    }
}

pub fn result_to_json(result: &ScanResult) -> String {
    crate::model::to_json(result).unwrap_or_else(|_| "{}".to_string())
}

pub fn result_from_json(text: &str) -> Result<ScanResult, ScanError> {
    let mut value: serde_json::Value = crate::model::from_json(text)?;
    for (array, fields) in [
        ("items", &[("unique_bytes", "total_bytes")][..]),
        (
            "groups",
            &[
                ("unique_bytes", "total_bytes"),
                ("eligible_unique_bytes", "eligible_bytes"),
            ][..],
        ),
    ] {
        if let Some(rows) = value
            .get_mut(array)
            .and_then(serde_json::Value::as_array_mut)
        {
            for row in rows {
                for (field, fallback) in fields {
                    // Only absent fields receive legacy defaults; explicit null
                    // or a wrong type still fails the strict typed parser.
                    if row.get(*field).is_none()
                        && let Some(old) = row.get(*fallback).cloned()
                    {
                        row[*field] = old;
                    }
                }
            }
        }
    }
    let result: ScanResult = serde_json::from_value(value).map_err(|_| ScanError::InvalidResult)?;
    if result.result_version != "water.scan-result.v1" {
        return Err(ScanError::InvalidResult);
    }
    Ok(result)
}

pub fn identity_of(path: &str) -> Result<Identity, ScanError> {
    native_windows::identity_of(path)
}

pub fn known_folders() -> Result<crate::model::KnownFolders, ScanError> {
    native_windows::known_folders()
}
