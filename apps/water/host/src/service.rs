use crate::{Backend, HostContext, IpcFailure, StartupError, pick_folder};
use serde_json::Value;
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};
use water_service::{FolderPicker, IpcError, Service, ServiceConfig, WindowsPlatform};

pub const CLEAN_ENABLED: bool = false;

pub struct ServiceBackend(pub Service);

impl Backend for ServiceBackend {
    fn call(&self, command: &str, args: Value) -> Result<Value, IpcFailure> {
        self.0.call(command, args).map_err(|error| IpcFailure {
            code: error.code,
            message_zh: error.message_zh,
        })
    }
}

pub struct HostPicker {
    initial_directory: String,
    picking: Arc<AtomicBool>,
}

pub struct PickGuard(Arc<AtomicBool>);

impl Drop for PickGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}

impl HostPicker {
    pub fn new(initial_directory: String) -> Self {
        Self {
            initial_directory,
            picking: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn begin(&self) -> Option<PickGuard> {
        self.picking
            .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
            .ok()
            .map(|_| PickGuard(Arc::clone(&self.picking)))
    }
}

impl FolderPicker for HostPicker {
    fn pick(&self) -> Result<Option<String>, IpcError> {
        let _guard = self.begin().ok_or_else(|| IpcError {
            code: "busy".into(),
            message_zh: "正在进行另一项任务，请稍候。".into(),
        })?;
        pick_folder(&self.initial_directory).map_err(|error| IpcError {
            code: error.code,
            message_zh: error.message_zh,
        })
    }
}

pub fn service_config(ctx: &HostContext) -> ServiceConfig {
    ServiceConfig {
        data_dir: ctx.data_dir.clone(),
        app_version: env!("CARGO_PKG_VERSION").into(),
        clean_enabled: CLEAN_ENABLED,
        platform: Box::new(WindowsPlatform::new()),
        picker: Box::new(HostPicker::new(ctx.home_dir.clone())),
    }
}

pub fn service_backend(ctx: &HostContext) -> Result<Arc<dyn Backend>, StartupError> {
    let service = Service::new(service_config(ctx)).map_err(|_| StartupError::Failed)?;
    Ok(Arc::new(ServiceBackend(service)))
}
