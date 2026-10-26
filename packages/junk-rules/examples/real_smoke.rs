use std::env;
use std::fs;
use water_junk_rules::{KnownFolder, Locator, RuleSet};

fn main() {
    let rules = RuleSet::embedded();
    let folders = folders_from_env();
    let mut rows = Vec::new();
    for rule in rules.rules() {
        let mut base_exists = false;
        let mut literal_prefix_exists = false;
        for locator in &rule.locate {
            match locator {
                Locator::Pattern { base, segments } => {
                    let base_path = folder(&folders, *base);
                    if path_exists(base_path) {
                        base_exists = true;
                    }
                    if path_exists(&literal_prefix(base_path, segments)) {
                        literal_prefix_exists = true;
                    }
                }
                Locator::Discovery { base } => {
                    let base_path = folder(&folders, *base);
                    if path_exists(base_path) {
                        base_exists = true;
                        literal_prefix_exists = true;
                    }
                }
                Locator::Marker { .. } => {}
            }
        }
        rows.push(serde_json::json!({
            "rule_id": rule.rule_id,
            "base_exists": base_exists,
            "literal_prefix_exists": literal_prefix_exists,
        }));
    }
    println!("{}", serde_json::to_string(&rows).expect("json"));
}

struct EnvFolders {
    user_profile: String,
    local_app_data: String,
    roaming_app_data: String,
    user_temp: String,
    system_temp: String,
    windows: String,
    program_data: String,
    downloads: String,
}

fn folders_from_env() -> EnvFolders {
    let user_profile = env_path("USERPROFILE");
    let local_app_data = env_path("LOCALAPPDATA");
    let roaming_app_data = env_path("APPDATA");
    let windows = env_path("SystemRoot");
    let program_data = env_path("ProgramData");
    EnvFolders {
        user_temp: format!("{local_app_data}\\Temp"),
        system_temp: format!("{windows}\\Temp"),
        downloads: format!("{user_profile}\\Downloads"),
        user_profile,
        local_app_data,
        roaming_app_data,
        windows,
        program_data,
    }
}

fn folder(folders: &EnvFolders, known: KnownFolder) -> &str {
    match known {
        KnownFolder::UserProfile => &folders.user_profile,
        KnownFolder::LocalAppData => &folders.local_app_data,
        KnownFolder::RoamingAppData => &folders.roaming_app_data,
        KnownFolder::UserTemp => &folders.user_temp,
        KnownFolder::SystemTemp => &folders.system_temp,
        KnownFolder::Windows => &folders.windows,
        KnownFolder::ProgramData => &folders.program_data,
        KnownFolder::Downloads => &folders.downloads,
    }
}

fn env_path(name: &str) -> String {
    let mut value = env::var(name).unwrap_or_else(|_| panic!("missing {name}"));
    while value.ends_with(['\\', '/']) {
        value.pop();
    }
    value
}

fn path_exists(path: &str) -> bool {
    fs::metadata(path).is_ok()
}

fn literal_prefix(base: &str, segments: &[String]) -> String {
    let mut path = base.to_string();
    for segment in segments {
        if segment
            .bytes()
            .any(|byte| matches!(byte, b'*' | b'?' | b'#'))
        {
            break;
        }
        path.push('\\');
        path.push_str(segment);
    }
    path
}
