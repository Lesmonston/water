use serde::Serialize;
use std::fmt;
use water_node_manifest::v1::ManifestEvidence;
use water_scope_registry::v1::{Registry, ScanPermit};

/// Additional trusted-host declaration, borrowing the actual live P capabilities.
pub struct ManifestReadConsent<'a> {
    registry: &'a Registry,
    permit: &'a ScanPermit,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MarkerReadError {
    Source,
    InvalidPath,
    RootMismatch,
    NotRegularFile,
    ReparsePoint,
    MultipleLinks,
    InputTooLarge,
    Changed,
    InvalidUtf8,
    InvalidManifest,
    NativeIo,
    UnsupportedPlatform,
    SerializationFailed,
}

impl fmt::Display for MarkerReadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{self:?} at /root_marker")
    }
}

impl std::error::Error for MarkerReadError {}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct MarkerObservation {
    marker_version: &'static str,
    source_kind: &'static str,
    read_only: bool,
    ordinary_content_read: bool,
    root_binding_verified: bool,
    native_user_gesture_authenticated: bool,
    race_protection_verified: bool,
    project_membership_verified: bool,
    risk: &'static str,
    action: &'static str,
    bytes_read: u32,
    evidence: ManifestEvidence,
}

pub fn approve_package_json<'a>(
    registry: &'a Registry,
    permit: &'a ScanPermit,
) -> Result<ManifestReadConsent<'a>, MarkerReadError> {
    if !cfg!(all(windows, target_arch = "x86_64")) {
        return Err(MarkerReadError::UnsupportedPlatform);
    }
    registry
        .check_permit(permit)
        .map_err(|_| MarkerReadError::Source)?;
    Ok(ManifestReadConsent { registry, permit })
}

pub fn read_package_json(
    consent: &ManifestReadConsent<'_>,
    root_path: &str,
) -> Result<Option<MarkerObservation>, MarkerReadError> {
    #[cfg(all(windows, target_arch = "x86_64"))]
    {
        read_windows(consent, root_path)
    }
    #[cfg(not(all(windows, target_arch = "x86_64")))]
    {
        let _ = (consent.registry, consent.permit, root_path);
        Err(MarkerReadError::UnsupportedPlatform)
    }
}

pub fn to_json(observation: &MarkerObservation) -> Result<String, MarkerReadError> {
    serde_json::to_string(observation).map_err(|_| MarkerReadError::SerializationFailed)
}

#[cfg(all(windows, target_arch = "x86_64"))]
fn verify_binding(
    observed: &water_native_root::v1::RootIdentity,
    registered: &water_native_root::v1::RootIdentity,
) -> Result<(), MarkerReadError> {
    if observed != registered {
        return Err(MarkerReadError::RootMismatch);
    }
    Ok(())
}

#[cfg(all(windows, target_arch = "x86_64"))]
fn read_windows(
    consent: &ManifestReadConsent<'_>,
    root_path: &str,
) -> Result<Option<MarkerObservation>, MarkerReadError> {
    use water_native_root::v1::{self as native, RootError};

    let registered = consent
        .registry
        .check_permit(consent.permit)
        .map_err(|_| MarkerReadError::Source)?;
    native::validate_windows_path(root_path).map_err(|_| MarkerReadError::InvalidPath)?;
    let lease =
        native::open_directory(registered.scope_id(), root_path).map_err(|error| match error {
            RootError::InvalidPath => MarkerReadError::InvalidPath,
            RootError::ReparsePoint => MarkerReadError::ReparsePoint,
            RootError::NotDirectory => MarkerReadError::NotRegularFile,
            RootError::UnsupportedPlatform => MarkerReadError::UnsupportedPlatform,
            _ => MarkerReadError::NativeIo,
        })?;
    verify_binding(lease.observation().identity(), registered.identity())?;

    // A new owned native root is independently bound to P's identity. Only its
    // handle, never a joined child path, can reach the fixed-name file opener.
    let bytes = crate::native_windows::read(root_path, registered.identity())?;

    let after = consent
        .registry
        .check_permit(consent.permit)
        .map_err(|_| MarkerReadError::Changed)?;
    verify_binding(after.identity(), registered.identity())?;
    let refreshed = lease.refresh().map_err(|_| MarkerReadError::Changed)?;
    verify_binding(refreshed.identity(), registered.identity())?;

    let Some(bytes) = bytes else {
        return Ok(None);
    };
    let raw = std::str::from_utf8(&bytes).map_err(|_| MarkerReadError::InvalidUtf8)?;
    // Pass the original UTF-8 directly to U. A Value round trip here would lose
    // duplicate keys and invalidate U's raw-document validation guarantees.
    let evidence = water_node_manifest::v1::analyze_package_json(raw)
        .map_err(|_| MarkerReadError::InvalidManifest)?;
    Ok(Some(MarkerObservation {
        marker_version: "water.root-marker.v1",
        source_kind: "native_root_package_json",
        read_only: true,
        ordinary_content_read: true,
        root_binding_verified: true,
        native_user_gesture_authenticated: false,
        race_protection_verified: false,
        project_membership_verified: false,
        risk: "protected",
        action: "display_only",
        bytes_read: bytes.len() as u32,
        evidence,
    }))
}
