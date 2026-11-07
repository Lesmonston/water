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
    let scan = service.call("scan_start", json!({"locationIds":["common"]}))?;
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
    let c = service.call("conclusion_get", json!({}))?;
    let q = service.call("quarantine_list", json!({}))?;
    let cards = c["cards"].as_array().expect("cards").len();
    let folds = c["folds"].as_array().expect("folds").len();
    let clues = c["clues"].as_array().expect("clues").len();
    let rows = 1
        + cards
        + folds
        + clues
        + usize::from(!c["more_cards"].is_null())
        + usize::from(!c["kept_before"].is_null());
    println!(
        "{}",
        json!({"cards":cards,"folds":folds,"clues":clues,"conclusion_rows":rows,"quarantine_cards":q["cards"].as_array().expect("quarantine cards").len(),"drives":app["drives"].as_array().expect("drives").len()})
    );
    Ok(())
}
