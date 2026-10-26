//! Self-test stub for the wave 3 gate; not product code.
#![forbid(unsafe_code)]

use std::path::PathBuf;
use tauri::{
    Manager, WebviewUrl, WebviewWindowBuilder,
    webview::{NewWindowResponse, PermissionResponse},
    window::{Effect, EffectsBuilder},
};

pub use water_native_picker as picker;

pub fn config_ok(raw: &str) -> bool {
    raw.contains("\"withGlobalTauri\": true")
}

pub fn nav_ok(url: &str) -> bool {
    matches!(
        url.strip_prefix("tauri://localhost")
            .or_else(|| url.strip_prefix("http://tauri.localhost")),
        Some("" | "/" | "/index.html")
    )
}

pub fn run() -> Result<(), String> {
    tauri::Builder::default()
        .setup(|app| {
            let base = match std::env::var("WATER_DATA_DIR") {
                Ok(dir) => PathBuf::from(dir),
                Err(_) => app.path().local_data_dir()?.join("Water"),
            };
            let webview = base.join("webview");
            std::fs::create_dir_all(&webview)?;
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Water")
                .inner_size(1240.0, 820.0)
                .min_inner_size(1040.0, 720.0)
                .center()
                .transparent(true)
                .effects(EffectsBuilder::new().effect(Effect::Mica).build())
                .data_directory(webview)
                .devtools(false)
                .disable_drag_drop_handler()
                .on_navigation(|url| nav_ok(url.as_str()))
                .on_new_window(|_url, _features| NewWindowResponse::Deny)
                .on_download(|_webview, _event| false)
                .on_permission_request(|_webview, _kind| PermissionResponse::Deny)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .map_err(|error| error.to_string())
}
