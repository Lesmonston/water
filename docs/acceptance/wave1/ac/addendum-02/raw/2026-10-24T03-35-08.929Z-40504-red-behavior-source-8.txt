#![forbid(unsafe_code)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::PathBuf, time::SystemTime};
use tauri::{
    WebviewUrl, WebviewWindowBuilder,
    webview::{NewWindowResponse, PermissionResponse},
};
use water_desktop_preview::v1::{
    PREVIEW_CONFIG, PreviewError, is_bundled_navigation, validate_preview_config,
};

fn private_webview_directory() -> Result<PathBuf, PreviewError> {
    let tree = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|apps| apps.parent())
        .ok_or(PreviewError)?
        .to_path_buf();
    let local = tree.join(".local");
    let profiles = local.join("desktop-webview");
    for directory in [&local, &profiles] {
        if !directory.exists() {
            fs::create_dir(directory).map_err(|_| PreviewError)?;
        }
        let meta = fs::symlink_metadata(directory).map_err(|_| PreviewError)?;
        if !meta.is_dir() || meta.file_type().is_symlink() {
            return Err(PreviewError);
        }
    }
    let nonce = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|_| PreviewError)?
        .as_nanos();
    let profile = profiles.join(format!("preview-{}-{nonce}", std::process::id()));
    fs::create_dir(&profile).map_err(|_| PreviewError)?;
    Ok(profile)
}

fn run() -> Result<(), PreviewError> {
    validate_preview_config(PREVIEW_CONFIG)?;
    let profile = private_webview_directory()?;
    tauri::Builder::default()
        .setup(move |app| {
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Water Desktop Preview")
                .inner_size(1000.0, 760.0)
                .data_directory(profile.clone())
                .disable_drag_drop_handler()
                .disable_javascript()
                .devtools(false)
                .on_navigation(|url| is_bundled_navigation(url.as_str()))
                .on_new_window(|_url, _features| NewWindowResponse::Deny)
                .on_download(|_webview, _event| false)
                .on_permission_request(|_webview, _kind| PermissionResponse::Deny)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .map_err(|_| PreviewError)
}

fn main() {
    if run().is_err() {
        eprintln!("{PreviewError}");
        std::process::exit(1);
    }
}
