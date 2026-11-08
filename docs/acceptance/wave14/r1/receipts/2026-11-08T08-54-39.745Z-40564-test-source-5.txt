use crate::error::RulesError;
use crate::types::{
    KNOWN_FOLDER_ORDER, KnownFolder, as_str, drive_root_of, expect_keys, field, is_drive_root,
    object, valid_abs_path,
};
use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KnownFolders {
    pub user_profile: String,
    pub local_app_data: String,
    pub roaming_app_data: String,
    pub user_temp: String,
    pub system_temp: String,
    pub windows: String,
    pub program_data: String,
    pub downloads: String,
}

impl KnownFolders {
    pub fn from_json(input: &str) -> Result<Self, RulesError> {
        let value: Value =
            serde_json::from_str(input).map_err(|_| RulesError::new("RULES_INVALID_JSON", "/"))?;
        Self::from_value(&value)
    }

    pub(crate) fn from_value(value: &Value) -> Result<Self, RulesError> {
        let map = object(value, "/")?;
        expect_keys(
            map,
            &[
                "known_folders_version",
                "user_profile",
                "local_app_data",
                "roaming_app_data",
                "user_temp",
                "system_temp",
                "windows",
                "program_data",
                "downloads",
            ],
            "/",
        )?;
        if as_str(
            field(map, "known_folders_version", "/")?,
            "/known_folders_version",
        )? != "water.known-folders.v1"
        {
            return Err(RulesError::new(
                "RULES_INVALID_VERSION",
                "/known_folders_version",
            ));
        }
        let read = |key: &str| -> Result<String, RulesError> {
            let path = format!("/{key}");
            let text = as_str(field(map, key, "/")?, &path)?.to_string();
            if !valid_abs_path(&text, false) {
                return Err(RulesError::new("RULES_INVALID_PATH", path));
            }
            Ok(text)
        };
        let folders = Self {
            user_profile: read("user_profile")?,
            local_app_data: read("local_app_data")?,
            roaming_app_data: read("roaming_app_data")?,
            user_temp: read("user_temp")?,
            system_temp: read("system_temp")?,
            windows: read("windows")?,
            program_data: read("program_data")?,
            downloads: read("downloads")?,
        };
        if !folders
            .user_temp
            .eq_ignore_ascii_case(&format!("{}\\Temp", folders.local_app_data))
        {
            return Err(RulesError::new("RULES_INVALID_FOLDERS", "/user_temp"));
        }
        if !folders
            .system_temp
            .eq_ignore_ascii_case(&format!("{}\\Temp", folders.windows))
        {
            return Err(RulesError::new("RULES_INVALID_FOLDERS", "/system_temp"));
        }
        Ok(folders)
    }

    pub fn get(&self, folder: KnownFolder) -> &str {
        match folder {
            KnownFolder::UserProfile => &self.user_profile,
            KnownFolder::LocalAppData => &self.local_app_data,
            KnownFolder::RoamingAppData => &self.roaming_app_data,
            KnownFolder::UserTemp => &self.user_temp,
            KnownFolder::SystemTemp => &self.system_temp,
            KnownFolder::Windows => &self.windows,
            KnownFolder::ProgramData => &self.program_data,
            KnownFolder::Downloads => &self.downloads,
            KnownFolder::SystemDrive => &self.windows[..3],
        }
    }

    pub fn values(&self) -> impl Iterator<Item = &str> {
        KNOWN_FOLDER_ORDER
            .into_iter()
            .map(|folder| self.get(folder))
    }

    pub fn drive_roots(&self) -> Vec<String> {
        let mut roots = Vec::new();
        for path in self.values() {
            if let Some(root) = drive_root_of(path)
                && !roots
                    .iter()
                    .any(|seen: &String| seen.eq_ignore_ascii_case(&root))
            {
                roots.push(root);
            }
        }
        roots
    }
}

pub(crate) fn validate_guard_path(path: &str, field_path: &str) -> Result<(), RulesError> {
    if is_drive_root(path) || valid_abs_path(path, false) {
        Ok(())
    } else {
        Err(RulesError::new("RULES_INVALID_PATH", field_path))
    }
}
