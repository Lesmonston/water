use serde::Serialize;
use std::time::SystemTime;
use water_junk_scan::{
    CancelToken, ScanObserver, ScanOptions, ScanPlan, ScanProgress, result_from_json,
    result_to_json, scan,
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
    issues: Vec<IssueOut>,
}

#[derive(Serialize)]
struct Summary {
    status: String,
    visited_entries: u64,
    groups: Vec<GroupOut>,
}

fn main() {
    let plan_path = std::env::args().nth(1).expect("plan");
    let text = std::fs::read_to_string(&plan_path).expect("read");
    let plan = ScanPlan::from_json(&text).expect("plan");
    let options = ScanOptions::default();
    let cancel = CancelToken::new();
    let result = scan(
        &plan,
        "real-smoke",
        &options,
        &cancel,
        &Quiet,
        SystemTime::now(),
    )
    .expect("scan");
    let _ = result_from_json(&result_to_json(&result));
    let summary = Summary {
        status: result.status.clone(),
        visited_entries: result.visited_entries,
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
    };
    println!("{}", serde_json::to_string(&summary).expect("json"));
}
