use serde_json::{Value, json};
use water_desktop_preview::v1::{
    PREVIEW_CONFIG, PREVIEW_CSS, PREVIEW_HTML, PreviewError, is_bundled_navigation,
    validate_preview_config,
};

#[test]
fn desktop_config_boundary() {
    assert!(
        validate_preview_config(PREVIEW_CONFIG).is_ok(),
        "AC_BEHAVIOR: the frozen preview configuration must be accepted"
    );
    let base: Value = serde_json::from_str(PREVIEW_CONFIG).unwrap();
    let mut granted = base.clone();
    granted["app"]["security"]["capabilities"] = json!(["core:default"]);
    assert!(
        validate_preview_config(&granted.to_string()).is_err(),
        "AC_CAPABILITIES AC_BEHAVIOR: capability grant must fail closed"
    );
    let mutations = [
        ("/productName", json!("Other")),
        ("/version", json!("0.2.0")),
        ("/identifier", json!("dev.other")),
        ("/build/frontendDist", json!("https://example.com")),
        ("/bundle/active", json!(true)),
        ("/app/windows", json!([{"url":"https://example.com"}])),
        ("/app/withGlobalTauri", json!(true)),
        ("/app/security/assetProtocol/enable", json!(true)),
        ("/app/security/csp", json!("default-src *")),
        ("/plugins", json!({"shell":{}})),
    ];
    for (pointer, value) in mutations {
        let mut changed = base.clone();
        *changed.pointer_mut(pointer).unwrap() = value;
        assert!(
            validate_preview_config(&changed.to_string()).is_err(),
            "{pointer}"
        );
    }
    for raw in ["", "null", "{}", "[]", "{invalid}"] {
        assert!(validate_preview_config(raw).is_err());
    }
    let mut extra = base.clone();
    extra["build"]["devUrl"] = json!("http://localhost:3000");
    assert!(validate_preview_config(&extra.to_string()).is_err());
    let duplicate = PREVIEW_CONFIG.replacen(
        "\"productName\":",
        "\"productName\":\"Other\",\"productName\":",
        1,
    );
    assert!(validate_preview_config(&duplicate).is_err());
    for directive in [
        "default-src 'self'",
        "script-src 'none'",
        "style-src 'self'",
        "img-src 'self'",
        "connect-src 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
    ] {
        let changed = PREVIEW_CONFIG.replace(directive, "");
        assert!(validate_preview_config(&changed).is_err(), "{directive}");
    }
    assert_eq!(PreviewError.to_string(), "Desktop preview unavailable.");
}

#[test]
fn desktop_navigation_boundary() {
    for allowed in [
        "tauri://localhost",
        "tauri://localhost/",
        "tauri://localhost/index.html",
        "tauri://localhost/index.html#status",
        "http://tauri.localhost/",
        "http://tauri.localhost/index.html",
        "http://tauri.localhost/#status",
    ] {
        assert!(is_bundled_navigation(allowed), "AC_BEHAVIOR: {allowed}");
    }
    for denied in [
        "https://example.com",
        "http://example.com",
        "http://127.0.0.1/",
        "file:///index.html",
        "data:text/html,test",
        "javascript:alert(1)",
        "about:blank",
        "https://tauri.localhost/index.html",
        "http://tauri.localhost.evil/index.html",
        "tauri://localhost.evil/index.html",
        "tauri://user@localhost/index.html",
        "tauri://user:pass@localhost/",
        "tauri://localhost:80/index.html",
        "http://tauri.localhost:80/",
        "http://user@tauri.localhost/",
        "tauri://localhost/index.html?x=1",
        "tauri://localhost/other.html",
        "tauri://localhost//index.html",
        "tauri://localhost/%69ndex.html",
        "tauri://localhost/../index.html",
        "tauri://localhost\\index.html",
        "TAURI://LOCALHOST/index.html",
        " tauri://localhost/",
        "tauri://localhost/\n",
        "",
    ] {
        assert!(!is_bundled_navigation(denied), "AC_NAVIGATION: {denied}");
    }
}

#[test]
fn desktop_embedded_page() {
    for text in ["Water", "桌面壳已启动", "尚未接入扫描", "只读开发预览"] {
        assert!(PREVIEW_HTML.contains(text), "{text}");
    }
    let html = PREVIEW_HTML.to_lowercase();
    for forbidden in [
        "<script",
        "<iframe",
        "<form",
        "<a ",
        "http:",
        "https:",
        "file:",
        " on",
        "javascript:",
    ] {
        assert!(!html.contains(forbidden), "{forbidden}");
    }
    for forbidden in ["@import", "url(", "http:", "https:"] {
        assert!(
            !PREVIEW_CSS.to_lowercase().contains(forbidden),
            "{forbidden}"
        );
    }
    assert!(PREVIEW_HTML.contains("href=\"styles.css\""));
    assert!(!PREVIEW_CSS.is_empty());
    let main = include_str!("../src/main.rs");
    assert!(main.contains("validate_preview_config(PREVIEW_CONFIG)?"));
    assert!(main.contains(".on_navigation(|url| is_bundled_navigation(url.as_str()))"));
    assert!(main.contains(".on_new_window(|_url, _features| NewWindowResponse::Deny)"));
    assert!(main.contains(".data_directory(profile.clone())"));
    assert!(main.contains(".disable_drag_drop_handler()"));
    assert!(!main.contains(".invoke_handler("));
    assert!(validate_preview_config(PREVIEW_CONFIG).is_ok());
}
