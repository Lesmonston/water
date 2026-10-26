#![forbid(unsafe_code)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use water_desktop::{UnavailableBackend, run};

fn main() {
    if run(Arc::new(UnavailableBackend)).is_err() {
        eprintln!("Water 暂时无法启动。");
        std::process::exit(1);
    }
}
