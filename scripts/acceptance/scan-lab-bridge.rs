// Controller bridge, not a product CLI. The helper supplies only its owned fixture index.
use water_scan::fixture_v1::{CancelToken, ScanOptions, open_fixture_run, scan_fixture};
fn main() {
    let path = std::env::args().nth(1).expect("controlled fixture index");
    let text = std::fs::read_to_string(path).expect("controller index");
    let index: serde_json::Value = serde_json::from_str(&text).expect("index JSON");
    let mut results = Vec::new();
    for run in index["runs"].as_array().expect("runs") {
        let fixture = open_fixture_run(run["run_id"].as_str().unwrap()).expect("owned D fixture");
        let plan = &run["scanner_plan"];
        let options = ScanOptions::new(plan["max_depth"].as_u64().unwrap() as u32,
            plan["max_entries"].as_u64().unwrap() as u32, 1024).unwrap();
        results.push(scan_fixture(&fixture, &options, &CancelToken::new()).expect("scan facts"));
    }
    println!("{}", serde_json::to_string(&results).expect("serialize actual facts"));
}
