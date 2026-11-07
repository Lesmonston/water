use std::{
    fmt,
    fs::{self, Metadata, OpenOptions},
    path::{Path, PathBuf},
    time::SystemTime,
};

pub struct HostContext {
    pub data_dir: PathBuf,
    pub home_dir: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupError {
    AlreadyRunning,
    Failed,
}

impl fmt::Display for StartupError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::AlreadyRunning => "Flick 已经在运行。",
            Self::Failed => "Flick 暂时无法启动。",
        })
    }
}

impl std::error::Error for StartupError {}

/// Keeping the file open retains Windows' exclusive sharing reservation.
pub struct InstanceLock(#[allow(dead_code)] std::fs::File);

pub fn acquire_instance_lock(data_dir: &Path) -> Result<InstanceLock, StartupError> {
    let mut options = OpenOptions::new();
    options.read(true).write(true).create(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(0);
    }
    #[cfg(not(windows))]
    return Err(StartupError::Failed);

    #[cfg(windows)]
    options
        .open(data_dir.join("water.lock"))
        .map(InstanceLock)
        .map_err(|error| match error.raw_os_error() {
            Some(32) => StartupError::AlreadyRunning,
            _ => StartupError::Failed,
        })
}

/// Turn a lock attempt into either the held lock, a signal to the running instance, or the original error.
pub fn on_lock_result(
    result: Result<InstanceLock, StartupError>,
    data_dir: &Path,
) -> Result<Option<InstanceLock>, StartupError> {
    match result {
        Ok(lock) => Ok(Some(lock)),
        Err(StartupError::AlreadyRunning) => {
            signal_activation(data_dir)?;
            Ok(None)
        }
        Err(error) => Err(error),
    }
}

fn plain_signal(metadata: &Metadata) -> bool {
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return false;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return false;
        }
    }
    true
}

/// Notify the running instance without reading or following the signal file.
pub fn signal_activation(data_dir: &Path) -> Result<(), StartupError> {
    let path = data_dir.join("activate.signal");
    match fs::symlink_metadata(&path) {
        Ok(metadata) if !plain_signal(&metadata) => return Err(StartupError::Failed),
        Err(error) if error.kind() != std::io::ErrorKind::NotFound => {
            return Err(StartupError::Failed);
        }
        _ => {}
    }
    let mut options = OpenOptions::new();
    options.write(true).create(true).truncate(false);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        // FILE_FLAG_OPEN_REPARSE_POINT: check the opened object before changing it.
        options.custom_flags(0x0020_0000);
    }
    let file = options.open(path).map_err(|_| StartupError::Failed)?;
    if !plain_signal(&file.metadata().map_err(|_| StartupError::Failed)?) {
        return Err(StartupError::Failed);
    }
    // Touch the mtime only. Truncating would empty a hard link planted in a writable data directory.
    file.set_modified(SystemTime::now())
        .map_err(|_| StartupError::Failed)
}

/// Consume only a plain signal file; failed checks or removal mean no activation.
pub fn take_activation(data_dir: &Path) -> bool {
    let path = data_dir.join("activate.signal");
    match fs::symlink_metadata(&path) {
        Ok(metadata) if plain_signal(&metadata) => fs::remove_file(path).is_ok(),
        _ => false,
    }
}
