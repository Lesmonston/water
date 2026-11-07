use serde::Serialize;
use std::fs;
use std::os::windows::fs::MetadataExt;
use std::time::{Instant, SystemTime};
use water_junk_scan::{
    CancelToken, ExtrasOptions, ScanObserver, ScanOptions, ScanPlan, ScanProgress, ScanResult,
    known_folders, result_from_json, result_to_json, scan, scan_full, space_overview,
};

struct Quiet;

impl ScanObserver for Quiet {
    fn on_progress(&self, _: &ScanProgress) {}
}

#[derive(Serialize)]
struct IssueOut {
    code: String,
    count: u64,
}

#[derive(Serialize)]
struct GroupOut {
    group_id: String,
    level: String,
    item_count: u64,
    eligible_count: u64,
    total_bytes: String,
    eligible_bytes: String,
    unique_bytes: String,
    eligible_unique_bytes: String,
    disk_bytes: Option<String>,
    eligible_disk_bytes: Option<String>,
    issues: Vec<IssueOut>,
}

#[derive(Serialize)]
struct Summary {
    status: String,
    visited_entries: u64,
    elapsed_ms: u128,
    groups: Vec<GroupOut>,
}

#[derive(Serialize)]
struct FullOut {
    summary: Summary,
    cluster_count: usize,
    confirm_cluster_count: usize,
    advisory_cluster_count: usize,
    junction_count: usize,
    hidden_system_junction_count: usize,
    junctions_truncated: bool,
    declaration_count: usize,
}

#[derive(Serialize)]
struct OverviewOut {
    status: String,
    elapsed_ms: u128,
    visited_entries: u64,
    disk_bytes: String,
    total_bytes: String,
    file_count: u64,
    top_count: usize,
    others_count: u64,
    others_disk_bytes: String,
    issues: Vec<IssueOut>,
}

#[derive(Serialize)]
struct Output {
    scan: Summary,
    full: FullOut,
    overview: OverviewOut,
}

fn main() {
    let plan_path = std::env::args().nth(1).expect("plan");
    let text = std::fs::read_to_string(&plan_path).expect("read");
    let plan = ScanPlan::from_json(&text).expect("plan");
    let options = ScanOptions::default();
    let cancel = CancelToken::new();
    let started = Instant::now();
    let result = scan(
        &plan,
        "real-smoke",
        &options,
        &cancel,
        &Quiet,
        SystemTime::now(),
    )
    .expect("scan");
    result_from_json(&result_to_json(&result)).expect("roundtrip");
    let ordinary = summarize(&result, started.elapsed().as_millis());
    drop(result);
    let started = Instant::now();
    let (result, extras) = scan_full(
        &plan,
        "real-full",
        &options,
        &ExtrasOptions {
            leak_clusters: true,
            junctions: true,
            declarations: true,
        },
        &cancel,
        &Quiet,
        SystemTime::now(),
    )
    .expect("full scan");
    let full = FullOut {
        summary: summarize(&result, started.elapsed().as_millis()),
        cluster_count: result.groups.iter().filter(|g| g.cluster.is_some()).count(),
        confirm_cluster_count: result
            .groups
            .iter()
            .filter(|g| g.cluster.is_some() && g.level == water_junk_scan::Level::Confirm)
            .count(),
        advisory_cluster_count: result
            .groups
            .iter()
            .filter(|g| g.cluster.is_some() && g.level == water_junk_scan::Level::Advisory)
            .count(),
        junction_count: extras.junctions.len(),
        hidden_system_junction_count: extras
            .junctions
            .iter()
            .filter(|junction| {
                fs::symlink_metadata(&junction.path)
                    .map(|meta| meta.file_attributes() & 0x6 == 0x6)
                    .unwrap_or(false)
            })
            .count(),
        junctions_truncated: extras.junctions_truncated,
        declaration_count: extras.declarations.len(),
    };
    drop(result);
    let folders = known_folders().expect("known folders");
    let started = Instant::now();
    let overview = space_overview(
        &folders.user_profile,
        "real-overview",
        &options,
        &cancel,
        &Quiet,
        SystemTime::now(),
    )
    .expect("overview");
    let overview = OverviewOut {
        status: overview.status,
        elapsed_ms: started.elapsed().as_millis(),
        visited_entries: overview.visited_entries,
        disk_bytes: overview.disk_bytes,
        total_bytes: overview.total_bytes,
        file_count: overview.file_count,
        top_count: overview.top.len(),
        others_count: overview.others_count,
        others_disk_bytes: overview.others_disk_bytes,
        issues: overview
            .issues
            .into_iter()
            .map(|i| IssueOut {
                code: i.code,
                count: i.count,
            })
            .collect(),
    };
    println!(
        "{}",
        serde_json::to_string(&Output {
            scan: ordinary,
            full,
            overview
        })
        .expect("json")
    );
}

fn summarize(result: &ScanResult, elapsed_ms: u128) -> Summary {
    Summary {
        status: result.status.clone(),
        visited_entries: result.visited_entries,
        elapsed_ms,
        groups: result
            .groups
            .iter()
            .map(|group| {
                let level = match group.level {
                    water_junk_scan::Level::Recommended => "recommended",
                    water_junk_scan::Level::Confirm => "confirm",
                    water_junk_scan::Level::Advisory => "advisory",
                    water_junk_scan::Level::Protected => "protected",
                };
                GroupOut {
                    group_id: group.group_id.clone(),
                    level: level.to_string(),
                    item_count: group.item_count,
                    eligible_count: group.eligible_count,
                    total_bytes: group.total_bytes.clone(),
                    eligible_bytes: group.eligible_bytes.clone(),
                    unique_bytes: group.unique_bytes.clone(),
                    eligible_unique_bytes: group.eligible_unique_bytes.clone(),
                    disk_bytes: group.disk_bytes.clone(),
                    eligible_disk_bytes: group.eligible_disk_bytes.clone(),
                    issues: result
                        .issues
                        .iter()
                        .filter(|issue| issue.group_id == group.group_id)
                        .map(|issue| IssueOut {
                            code: issue.code.clone(),
                            count: issue.count,
                        })
                        .collect(),
                }
            })
            .collect(),
    }
}
