//! Configuration and navigation policy used by the running host.
use serde::Deserialize;
use serde_json::Value;
use std::{collections::BTreeMap, fmt};

pub const CONFIG: &str = include_str!("../tauri.conf.json");
pub const CAPABILITY: &str = include_str!("../capabilities/main.json");
pub const CSP: &str = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConfigError;

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("HOST_CONFIG：桌面配置不符合安全约定。")
    }
}

impl std::error::Error for ConfigError {}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Config {
    product_name: String,
    version: String,
    identifier: String,
    build: Build,
    app: App,
    bundle: Bundle,
    plugins: BTreeMap<String, Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Build {
    frontend_dist: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct App {
    windows: Vec<Value>,
    with_global_tauri: bool,
    security: Security,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Security {
    csp: String,
    asset_protocol: AssetProtocol,
    capabilities: Vec<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct AssetProtocol {
    enable: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Bundle {
    active: bool,
    publisher: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Capability {
    identifier: String,
    windows: Vec<String>,
    permissions: Vec<String>,
}

/// Check the embedded capability as well as the supplied Tauri configuration.
/// Typed objects reject duplicate, missing and unknown fields before comparison.
pub fn validate_config(raw: &str) -> Result<(), ConfigError> {
    if raw.len() > 16_384 {
        return Err(ConfigError);
    }
    let config: Config = serde_json::from_str(raw).map_err(|_| ConfigError)?;
    if config.product_name != "Flick"
        || config.version != "0.1.0"
        || config.identifier != "app.water.desktop"
        || config.build.frontend_dist != "../ui"
        || !config.app.windows.is_empty()
        || !config.app.with_global_tauri
        || config.app.security.csp != CSP
        || config.app.security.asset_protocol.enable
        || config.app.security.capabilities != ["main"]
        || config.bundle.active
        || config.bundle.publisher != "Flick"
        || !config.plugins.is_empty()
    {
        return Err(ConfigError);
    }
    validate_capability(CAPABILITY)
}

pub fn validate_capability(raw: &str) -> Result<(), ConfigError> {
    if raw.len() > 4_096 {
        return Err(ConfigError);
    }
    let capability: Capability = serde_json::from_str(raw).map_err(|_| ConfigError)?;
    if capability.identifier != "main" || capability.windows != ["main"] {
        return Err(ConfigError);
    }
    if capability.permissions != ["core:window:allow-start-dragging"] {
        return Err(ConfigError);
    }
    Ok(())
}

/// Same canonical URL allowlist as the accepted AC desktop shell.
pub fn is_bundled_navigation(url: &str) -> bool {
    if url.len() > 8_192 || url.chars().any(|c| c.is_control() || c.is_whitespace()) {
        return false;
    }
    let base = url.split_once('#').map_or(url, |(base, _fragment)| base);
    let path = base
        .strip_prefix("tauri://localhost")
        .or_else(|| base.strip_prefix("http://tauri.localhost"));
    matches!(path, Some("" | "/" | "/index.html"))
}
