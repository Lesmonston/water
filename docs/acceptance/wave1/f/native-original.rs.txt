use super::*;
use std::ffi::OsString;
use std::fs::{self, Metadata};
use std::path::{Component, Path};

pub struct NativeIo;

pub(super) fn fault(error: std::io::Error) -> IoFault {
    let kind = match error.kind() {
        std::io::ErrorKind::PermissionDenied => IoFaultKind::PermissionDenied,
        std::io::ErrorKind::NotFound => IoFaultKind::NotFound,
        _ => IoFaultKind::Io,
    };
    IoFault {
        kind,
        injected: false,
    }
}
fn changed() -> IoFault {
    IoFault {
        kind: IoFaultKind::RootChanged,
        injected: false,
    }
}

pub(super) fn is_link(metadata: &Metadata) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::MetadataExt;
        metadata.file_attributes() & 0x400 != 0
    }
    #[cfg(not(target_os = "windows"))]
    {
        metadata.file_type().is_symlink()
    }
}

pub(super) fn identity(metadata: &Metadata) -> FileIdentity {
    #[cfg(target_os = "macos")]
    {
        use std::os::unix::fs::MetadataExt;
        if !is_link(metadata) && (metadata.is_file() || metadata.is_dir()) && metadata.ino() != 0 {
            return FileIdentity {
                kind: IdentityKind::Unix,
                device: Some(ByteCount::new(metadata.dev())),
                inode: Some(ByteCount::new(metadata.ino())),
                link_count: Some(ByteCount::new(metadata.nlink())),
            };
        }
    }
    #[cfg(not(target_os = "macos"))]
    let _ = metadata;
    FileIdentity::unknown()
}

// Start at the filesystem root, never at an unchecked descendant. No enumeration,
// canonicalization, link-target read, or prefix-string containment is involved.
pub(super) fn directories(path: &Path) -> Result<Vec<Guard>, IoFault> {
    if !path.is_absolute() {
        return Err(changed());
    }
    let mut current = PathBuf::new();
    let mut guards = Vec::new();
    for component in path.components() {
        match component {
            Component::Prefix(prefix) => {
                current.push(prefix.as_os_str());
                continue;
            }
            Component::RootDir | Component::Normal(_) => current.push(component.as_os_str()),
            _ => return Err(changed()),
        }
        let metadata = fs::symlink_metadata(&current).map_err(|error| {
            let mapped = fault(error);
            if mapped.kind == IoFaultKind::NotFound {
                changed()
            } else {
                mapped
            }
        })?;
        if is_link(&metadata) || !metadata.is_dir() {
            return Err(changed());
        }
        guards.push(Guard {
            path: current.clone(),
            identity: identity(&metadata),
        });
    }
    Ok(guards)
}

fn recheck(node: &ScanNodePath, include_leaf: bool) -> Result<(), IoFault> {
    let path = if include_leaf {
        node.absolute.as_path()
    } else {
        node.absolute.parent().ok_or_else(changed)?
    };
    let observed = directories(path)?;
    for expected in node.guards.iter() {
        // A scope root inspected as the terminal object still needs the saved guard.
        let actual = if let Some(actual) = observed.iter().find(|g| g.path == expected.path) {
            actual.identity.clone()
        } else if expected.path == node.absolute {
            let metadata = fs::symlink_metadata(&expected.path).map_err(|error| {
                let mapped = fault(error);
                if mapped.kind == IoFaultKind::NotFound {
                    changed()
                } else {
                    mapped
                }
            })?;
            if is_link(&metadata) || !metadata.is_dir() {
                return Err(changed());
            }
            identity(&metadata)
        } else {
            return Err(changed());
        };
        if expected.identity.kind == IdentityKind::Unix
            && (actual.kind != IdentityKind::Unix
                || actual.device != expected.identity.device
                || actual.inode != expected.identity.inode)
        {
            return Err(changed());
        }
    }
    Ok(())
}

impl ReadOnlyIo for NativeIo {
    fn inspect(&self, node: &ScanNodePath) -> Result<NodeMetadata, IoFault> {
        recheck(node, false)?;
        let metadata = fs::symlink_metadata(&node.absolute).map_err(fault)?;
        let kind = if is_link(&metadata) {
            EntryKind::Link
        } else if metadata.is_file() {
            EntryKind::File
        } else if metadata.is_dir() {
            EntryKind::Directory
        } else {
            EntryKind::Other
        };
        Ok(NodeMetadata {
            logical_bytes: (kind == EntryKind::File).then(|| ByteCount::new(metadata.len())),
            identity: identity(&metadata),
            kind,
        })
    }

    fn list_names(&self, node: &ScanNodePath, limit: usize) -> Result<Vec<OsString>, IoFault> {
        // Independent from inspect's classification, including during negative controls.
        recheck(node, true)?;
        let mut names = Vec::new();
        for result in fs::read_dir(&node.absolute).map_err(fault)? {
            let entry = result.map_err(fault)?; // Never flatten away an iteration error.
            names.push(entry.file_name());
            if names.len() > limit {
                return Err(IoFault {
                    kind: IoFaultKind::DirectoryLimit,
                    injected: false,
                });
            }
        }
        Ok(names)
    }
}
