#![forbid(unsafe_code)]

use serde_json::{Value, json};
use water_desktop_preview::v1::{
    PREVIEW_CONFIG, PREVIEW_CSS, PREVIEW_HTML, PreviewError, is_bundled_navigation,
    validate_preview_config,
};

fn main() {
    let original: Value = serde_json::from_str(PREVIEW_CONFIG).unwrap();
    assert!(validate_preview_config(PREVIEW_CONFIG).is_ok());
    let mut config_rejected = 0;
    let values = [
        Value::Null, json!(true), json!(false), json!(0), json!(1), json!(-1),
        json!(""), json!("unknown"), json!([]), json!([null]), json!({}),
        json!({"unexpected": true}),
    ];
    for path in [
        "/productName", "/version", "/identifier", "/build/frontendDist",
        "/app/windows", "/app/withGlobalTauri", "/app/security/capabilities",
        "/app/security/assetProtocol/enable", "/app/security/csp", "/plugins",
        "/bundle/active",
    ] {
        for value in &values {
            if original.pointer(path).unwrap() == value { continue; }
            let mut changed = original.clone();
            *changed.pointer_mut(path).unwrap() = value.clone();
            assert!(validate_preview_config(&changed.to_string()).is_err(), "config {path} {value}");
            config_rejected += 1;
        }
    }
    for (key, token) in [("productName", "\"Water Desktop Preview\""), ("windows", "[]"), ("capabilities", "[]"), ("enable", "false"), ("active", "false")] {
        let marker = format!("\"{key}\":");
        let duplicate = PREVIEW_CONFIG.replacen(&marker, &format!("{marker}{token},{marker}"), 1);
        assert_ne!(duplicate, PREVIEW_CONFIG);
        assert!(validate_preview_config(&duplicate).is_err(), "duplicate {key}");
        config_rejected += 1;
    }
    for suffix in [" null", "{}", "[]", "true", "\"text\""] {
        assert!(validate_preview_config(&format!("{PREVIEW_CONFIG}{suffix}")).is_err());
        config_rejected += 1;
    }
    assert!(validate_preview_config(&format!("{}{PREVIEW_CONFIG}", " ".repeat(16385))).is_err());
    config_rejected += 1;
    let directives = original["app"]["security"]["csp"].as_str().unwrap();
    let mut reordered = original.clone();
    reordered["app"]["security"]["csp"] = json!(format!(" ; {} ; ;", directives.split(';').rev().collect::<Vec<_>>().join(" ; ")));
    assert!(validate_preview_config(&reordered.to_string()).is_ok());
    let mut navigation_rejected = 0;
    let mut navigation_accepted = 0;
    for origin in ["tauri://localhost", "http://tauri.localhost"] {
        for path in ["", "/", "/index.html"] {
            for fragment in ["", "#status", "#只读", "#https://invalid.example/?fragment-only"] {
                assert!(is_bundled_navigation(&format!("{origin}{path}{fragment}")));
                navigation_accepted += 1;
            }
        }
        for path in [
            "/other.html", "/INDEX.HTML", "//index.html", "/index.html/", "/./index.html",
            "/../index.html", "/a/../index.html", "/%69ndex.html", "/%2e/index.html",
            "/%2Findex.html", "/index.html?", "/?x=1", "/index.html?x=1#ok",
            "\\index.html", ":0/index.html", ":80/", ":443/", ".evil/index.html",
            "./index.html", "@invalid.example/index.html", "/index.html\0",
        ] {
            assert!(!is_bundled_navigation(&format!("{origin}{path}")), "path {origin}{path}");
            navigation_rejected += 1;
        }
        for bad in [' ', '\t', '\r', '\n', '\0', '\u{2003}', '\u{00a0}'] {
            assert!(!is_bundled_navigation(&format!("{origin}/index.html#{bad}")));
            navigation_rejected += 1;
        }
    }
    for url in [
        "https://tauri.localhost/index.html", "https://invalid.example/", "http://127.0.0.1/",
        "http://localhost/", "tauri://user@localhost/", "tauri://user:pass@localhost/",
        "http://user@tauri.localhost/", "tauri://%6cocalhost/", "TAURI://LOCALHOST/",
        "tauri://localhost.localdomain/", "file:///index.html", "data:text/html,Water",
        "javascript:void(0)", "about:blank", "", "//tauri.localhost/index.html",
    ] {
        assert!(!is_bundled_navigation(url), "origin {url}");
        navigation_rejected += 1;
    }
    assert!(!is_bundled_navigation(&format!("tauri://localhost/#{}", "x".repeat(8192))));
    navigation_rejected += 1;
    for text in ["Water", "桌面壳已启动", "尚未接入扫描", "只读开发预览"] { assert!(PREVIEW_HTML.contains(text)); }
    for token in ["<script", "<iframe", "<form", "<a ", "javascript:", "https:", "http:", "file:"] { assert!(!PREVIEW_HTML.to_lowercase().contains(token)); }
    for token in ["@import", "url(", "http:", "https:"] { assert!(!PREVIEW_CSS.to_lowercase().contains(token)); }
    assert_eq!(PreviewError.to_string(), "Desktop preview unavailable.");
    println!("{}", json!({"status":"passed", "configRejected":config_rejected, "configAccepted":2, "navigationRejected":navigation_rejected, "navigationAccepted":navigation_accepted, "actualEmbeddedAssetsVerified":true, "systemWindows":0}));
}
