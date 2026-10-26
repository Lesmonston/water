#![forbid(unsafe_code)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(error) = water_desktop::run() {
        eprintln!("Water failed to start: {error}");
        std::process::exit(1);
    }
}
