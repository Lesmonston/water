#![forbid(unsafe_code)]

use serde_json::json;
use std::{
    path::PathBuf,
    time::{Duration, Instant},
};
use water_service::{FolderPicker, IpcError, Service, ServiceConfig, WindowsPlatform};

struct NoPicker;
impl FolderPicker for NoPicker {
    fn pick(&self) -> Result<Option<String>, IpcError> {
        Ok(None)
    }
}

fn main() {
    if run().is_err() {
        eprintln!("service smoke failed");
        std::process::exit(1);
    }
}

fn run() -> Result<(), IpcError> {
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    if args.len() != 1 {
        return Err(IpcError {
            code: "invalid".into(),
            message_zh: "需要数据目录".into(),
        });
    }
    let service = Service::new(ServiceConfig {
        data_dir: PathBuf::from(&args[0]),
        app_version: env!("CARGO_PKG_VERSION").into(),
        clean_enabled: false,
        platform: Box::new(WindowsPlatform::new()),
        picker: Box::new(NoPicker),
    })?;
    let app = service.call("app_state", json!({}))?;
    let started = Instant::now();
    let scan = service.call("scan_start", json!({}))?;
    loop {
        std::thread::sleep(Duration::from_millis(250));
        let p = service.call("scan_progress", json!({}))?;
        if p["state"] != "running" {
            break;
        }
        if started.elapsed() > Duration::from_secs(1000) {
            return Err(IpcError {
                code: "unavailable".into(),
                message_zh: "体检未结束".into(),
            });
        }
    }
    let result = service.call("scan_result", json!({"scanId":scan["scan_id"]}))?;
    assert!(
        result["status"] == "completed" || result["status"] == "partial",
        "service smoke scan failed"
    );
    let error = service
        .call("clean_prepare", json!({"groupIds":["chrome-cache"]}))
        .expect_err("clean must be disabled");
    assert_eq!(error.message_zh, "这一版只做体检，清理功能会在下一版开放。");
    let categories:Vec<_>=result["categories"].as_array().expect("categories").iter().map(|c|json!({"category":c["category"],"group_count":c["groups"].as_array().expect("groups").len(),"total_bytes":c["total_bytes"]})).collect();
    // Distinct in-use notes over all groups, sorted (SERVICE-HARDENING §10).
    let in_use_labels: std::collections::BTreeSet<_> = result["categories"]
        .as_array()
        .expect("categories")
        .iter()
        .flat_map(|c| c["groups"].as_array().expect("groups"))
        .filter_map(|g| g["in_use"]["process_label_zh"].as_str())
        .collect();
    println!(
        "{}",
        json!({"status":result["status"],"duration_ms":result["duration_ms"],"totals":result["totals"],"categories":categories,"insights":result["insights"].as_array().expect("insights").len(),"drives":app["drives"].as_array().expect("drives").len(),"clean_prepare_code":error.code,"in_use_labels":in_use_labels})
    );
    Ok(())
}
