//! IPC v1 service. The host supplies platform capabilities and never supplies cleanup paths.
#![deny(unsafe_code)]

mod clean;
mod conclusion;
mod dedupe;
mod m35;
#[allow(unsafe_code)]
mod native_windows;
mod quarantine;
mod service;
mod storage;
mod util;
mod views;

use serde::Serialize;
pub use service::Service;
use std::{
    path::PathBuf,
    sync::{Mutex, PoisonError},
    time::SystemTime,
};
use water_junk_rules::KnownFolders;
use water_process_scan::{InUseSpec, ProcessSnapshot};

/// What `WindowsPlatform::in_use` reports when the process snapshot is unavailable.
pub(crate) const IN_USE_UNKNOWN: &str = "无法确认占用状态";

pub struct ServiceConfig {
    pub data_dir: PathBuf,
    pub app_version: String,
    pub clean_enabled: bool,
    pub platform: Box<dyn Platform>,
    pub picker: Box<dyn FolderPicker>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct IpcError {
    pub code: String,
    pub message_zh: String,
}

impl IpcError {
    pub(crate) fn new(code: &str) -> Self {
        Self {
            code: code.into(),
            message_zh: match code {
                "busy" => "正在进行另一项任务，请稍候。",
                "stale" => "结果已过期，请重新体检后再清理。",
                "invalid" => "所选内容无法清理，请重新选择。",
                "not_found" => "找不到这条记录，请重新体检。",
                "cancelled" => "已取消。",
                _ => "Water 服务暂时不可用。",
            }
            .into(),
        }
    }

    pub(crate) fn disabled() -> Self {
        Self {
            code: "unavailable".into(),
            message_zh: "这一版只做体检，清理功能会在下一版开放。".into(),
        }
    }
}

pub trait Platform: Send + Sync {
    fn known_folders(&self) -> Result<KnownFolders, IpcError>;
    fn drives(&self) -> Vec<DriveInfo>;
    fn now(&self) -> SystemTime;
    fn local_date(&self, at: SystemTime) -> (u32, u32);
    fn in_use(&self, spec: &InUseSpec, item_path: &str) -> Option<String>;
    fn begin_in_use_batch(&self) {}
    /// The fixed drive's file system, or None when it cannot be established.
    fn volume_file_system(&self, _root: &str) -> Option<String> {
        None
    }
    /// Orphan chains from the same snapshot used by this in-use batch.
    fn orphan_chains(&self) -> Vec<water_process_scan::OrphanChain> {
        Vec::new()
    }
    fn recycle_bin(&self, _root: &str) -> Option<u64> {
        None
    }
    fn installed_apps(&self) -> Option<water_installed_apps::AppList> {
        None
    }
    fn quarantine_roots(&self) -> Vec<String> {
        Vec::new()
    }
    fn quarantine_base(&self, _root: &str) -> Option<String> {
        None
    }
}

#[derive(Debug, Clone)]
pub struct DriveInfo {
    pub root: String,
    pub is_system: bool,
    pub total_bytes: u64,
    pub free_bytes: u64,
}

pub trait FolderPicker: Send + Sync {
    fn pick(&self) -> Result<Option<String>, IpcError>;
}

pub struct WindowsPlatform {
    processes: Mutex<Option<ProcessSnapshot>>,
}

impl Default for WindowsPlatform {
    fn default() -> Self {
        Self::new()
    }
}

impl WindowsPlatform {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(None),
        }
    }
}

impl Platform for WindowsPlatform {
    fn recycle_bin(&self, root: &str) -> Option<u64> {
        native_windows::recycle_bin(root)
    }
    fn installed_apps(&self) -> Option<water_installed_apps::AppList> {
        water_installed_apps::read_installed(self.now()).ok()
    }
    fn quarantine_roots(&self) -> Vec<String> {
        self.drives()
            .into_iter()
            .map(|d| format!("{}.water-quarantine", d.root))
            .collect()
    }
    fn volume_file_system(&self, root: &str) -> Option<String> {
        native_windows::volume_file_system(root)
    }

    fn orphan_chains(&self) -> Vec<water_process_scan::OrphanChain> {
        let slot = self
            .processes
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        slot.as_ref()
            .map(|snapshot| {
                water_process_scan::orphans(snapshot, water_process_scan::DEFAULT_ORPHAN_PATTERNS)
            })
            .unwrap_or_default()
    }

    fn known_folders(&self) -> Result<KnownFolders, IpcError> {
        let folders = water_junk_scan::known_folders().map_err(|_| IpcError::new("unavailable"))?;
        KnownFolders::from_json(
            &serde_json::to_string(&folders).map_err(|_| IpcError::new("unavailable"))?,
        )
        .map_err(|_| IpcError::new("unavailable"))
    }

    fn drives(&self) -> Vec<DriveInfo> {
        let system = self.known_folders().ok().map(|f| util::drive(&f.windows));
        native_windows::drives(system.as_deref())
    }

    fn now(&self) -> SystemTime {
        SystemTime::now()
    }
    fn local_date(&self, at: SystemTime) -> (u32, u32) {
        native_windows::local_date(at)
    }

    fn begin_in_use_batch(&self) {
        // Same recovery as the service state lock: a poisoned snapshot is reused, not abandoned.
        let mut slot = self
            .processes
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        *slot = water_process_scan::snapshot().ok();
    }

    fn in_use(&self, spec: &InUseSpec, item_path: &str) -> Option<String> {
        if spec.mode == water_process_scan::InUseMode::None {
            return None;
        }
        // A missing snapshot cannot establish that an item is unused. A poisoned lock is recovered.
        let slot = self
            .processes
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        match slot.as_ref() {
            Some(snapshot) => {
                water_process_scan::in_use(snapshot, spec, item_path).map(|h| h.process_name)
            }
            None => Some(IN_USE_UNKNOWN.into()),
        }
    }
}
