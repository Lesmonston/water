use serde::Serialize;
use water_process_scan::{DEFAULT_ORPHAN_PATTERNS, orphans, snapshot};

#[derive(Serialize)]
struct RealSmoke {
    process_count: u64,
    access_denied: u64,
    exited: u64,
    image_path_count: u64,
    image_unavailable: u64,
    #[serde(rename = "chrome.exe")]
    chrome_exe: u64,
    #[serde(rename = "msedge.exe")]
    msedge_exe: u64,
    #[serde(rename = "node.exe")]
    node_exe: u64,
    orphan_count: u64,
    orphans: Vec<RealOrphan>,
}

#[derive(Serialize)]
struct RealOrphan {
    name: String,
    matched_pattern: String,
}

fn main() {
    match run() {
        Ok(()) => {}
        Err(code) => {
            eprintln!("{code}");
            std::process::exit(1);
        }
    }
}

fn run() -> Result<(), water_process_scan::ProcError> {
    let snap = snapshot()?;
    let summary = snap.summary();
    let issue = |code: &str| {
        summary
            .issues
            .iter()
            .find(|i| i.code == code)
            .map(|i| i.count)
            .unwrap_or(0)
    };
    let chains = orphans(&snap, DEFAULT_ORPHAN_PATTERNS);
    let out = RealSmoke {
        process_count: summary.process_count,
        access_denied: issue("access_denied"),
        exited: issue("exited"),
        image_path_count: snap.image_path_count(),
        image_unavailable: issue("image_unavailable"),
        chrome_exe: snap.running(&["chrome.exe"]).len() as u64,
        msedge_exe: snap.running(&["msedge.exe"]).len() as u64,
        node_exe: snap.running(&["node.exe"]).len() as u64,
        orphan_count: chains.len() as u64,
        orphans: chains
            .into_iter()
            .map(|c| RealOrphan {
                name: c.name,
                matched_pattern: c.matched_pattern,
            })
            .collect(),
    };
    println!("{}", serde_json::to_string(&out).expect("real smoke json"));
    Ok(())
}
