//! Trusted Rust capture. The caller owns the registered scope throughout.
use serde::Serialize;
use std::fmt;
use water_contracts::v1::{OpaqueId, ScanStatus};
use water_native_scan::v1::{CancelToken, ScanObserver, ScanOptions};
use water_root_marker::v1::{self as marker_reader, MarkerReadError};
use water_scope_registry::v1::{RegisteredScope, Registry, ScanPermit};

pub use crate::request::{FrameError, ProjectRequest, decode_request, read_request};
pub use crate::runtime::run;

pub const MAX_REQUEST_BYTES: usize = 4096;
pub const MAX_BUNDLE_BYTES: usize = 67_108_864;
pub const MAX_EVENT_BYTES: usize = 67_125_248;
pub const MAX_OBSERVATION_BYTES: usize = 8192;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MarkerChoice {
    Skip,
    ReadRootPackageJson,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProjectError {
    InvalidArguments,
    InvalidRequest,
    NativeFailure,
    SerializationFailed,
    OutputTooLarge,
}

impl fmt::Display for ProjectError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Project session unavailable.")
    }
}
impl std::error::Error for ProjectError {}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ConfirmedCapture {
    capture_version: &'static str,
    read_manifest: bool,
    snapshot: Snapshot,
    marker: Marker,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub(crate) struct Snapshot {
    source_kind: &'static str,
    view: water_report_view::v1::ReportView,
    summary: water_summary_export::v1::SummaryExport,
    redacted_json: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub(crate) struct Marker {
    status: &'static str,
    error_code: Option<&'static str>,
    observation_json: Option<String>,
}

impl Marker {
    pub(crate) fn selection_cancelled(choice: MarkerChoice) -> Self {
        match choice {
            MarkerChoice::Skip => Self::new("not_requested", None, None),
            MarkerChoice::ReadRootPackageJson => {
                Self::new("skipped", Some("selection_cancelled"), None)
            }
        }
    }

    fn new(status: &'static str, error: Option<&'static str>, json: Option<String>) -> Self {
        Self {
            status,
            error_code: error,
            observation_json: json,
        }
    }
}

impl ConfirmedCapture {
    pub(crate) fn into_parts(self) -> (Snapshot, Marker) {
        (self.snapshot, self.marker)
    }
}

/// Requires real P authority, independent of any native-dialog envelope.
#[allow(clippy::too_many_arguments)]
pub fn capture_registered<O: ScanObserver>(
    registry: &mut Registry,
    scope: &RegisteredScope,
    root_path: &str,
    job_id: &OpaqueId,
    choice: MarkerChoice,
    cancel: &CancelToken,
    observer: &O,
) -> Result<ConfirmedCapture, ProjectError> {
    let options = ScanOptions::new(8, 10000, 256).map_err(|_| ProjectError::NativeFailure)?;
    let scan = water_native_scan::v1::scan_registered_with_observer(
        registry, scope, root_path, job_id, &options, cancel, observer,
    )
    .map_err(|_| ProjectError::NativeFailure)?;
    let report = scan.report();
    water_contracts::v1::validate_report(report).map_err(|_| ProjectError::NativeFailure)?;
    let snapshot = Snapshot {
        source_kind: "native_scope_metadata",
        view: water_report_view::v1::project_report(report)
            .map_err(|_| ProjectError::NativeFailure)?,
        summary: water_summary_export::v1::summarize_report(report)
            .map_err(|_| ProjectError::NativeFailure)?,
        redacted_json: water_redacted_report::v1::to_json(
            &water_redacted_report::v1::redact_report(report)
                .map_err(|_| ProjectError::NativeFailure)?,
        )
        .map_err(|_| ProjectError::SerializationFailed)?,
    };
    // Content authority is obtained only after R has ended its own attempt.
    let marker = if choice == MarkerChoice::Skip {
        Marker::new("not_requested", None, None)
    } else if report.status == ScanStatus::Cancelled || cancel.is_cancelled() {
        Marker::new("skipped", Some("scan_cancelled"), None)
    } else {
        read_marker(registry, scope, root_path)
    };
    let captured = ConfirmedCapture {
        capture_version: "water.project-capture.v1",
        read_manifest: choice == MarkerChoice::ReadRootPackageJson,
        snapshot,
        marker,
    };
    to_json(&captured)?;
    Ok(captured)
}

// Created only after begin_scan succeeds. An unsuccessful begin must never
// acquire a cleanup guard capable of cancelling a caller's existing attempt.
struct MarkerAttempt<'a> {
    registry: &'a mut Registry,
    scope: &'a RegisteredScope,
    permit: ScanPermit,
    active: bool,
}
impl MarkerAttempt<'_> {
    fn finish(&mut self) -> Result<(), MarkerReadError> {
        self.registry
            .finish(&self.permit)
            .map_err(|_| MarkerReadError::Changed)?;
        self.active = false;
        Ok(())
    }
}
impl Drop for MarkerAttempt<'_> {
    fn drop(&mut self) {
        if self.active {
            let _ = self.registry.cancel(self.scope);
        }
    }
}

fn error_code(error: MarkerReadError) -> &'static str {
    match error {
        MarkerReadError::Source => "Source",
        MarkerReadError::InvalidPath => "InvalidPath",
        MarkerReadError::RootMismatch => "RootMismatch",
        MarkerReadError::NotRegularFile => "NotRegularFile",
        MarkerReadError::ReparsePoint => "ReparsePoint",
        MarkerReadError::MultipleLinks => "MultipleLinks",
        MarkerReadError::InputTooLarge => "InputTooLarge",
        MarkerReadError::Changed => "Changed",
        MarkerReadError::InvalidUtf8 => "InvalidUtf8",
        MarkerReadError::InvalidManifest => "InvalidManifest",
        MarkerReadError::NativeIo => "NativeIo",
        MarkerReadError::UnsupportedPlatform => "UnsupportedPlatform",
        MarkerReadError::SerializationFailed => "SerializationFailed",
    }
}

fn read_marker(registry: &mut Registry, scope: &RegisteredScope, root_path: &str) -> Marker {
    let mut read = || {
        let permit = registry
            .begin_scan(scope)
            .map_err(|_| MarkerReadError::Source)?;
        let mut attempt = MarkerAttempt {
            registry,
            scope,
            permit,
            active: true,
        };
        let result = {
            let consent = marker_reader::approve_package_json(attempt.registry, &attempt.permit)?;
            marker_reader::read_package_json(&consent, root_path)
        };
        // Finish also on a read error. If authority refresh fails, Drop cancels
        // only the attempt created above; the caller's registration survives.
        attempt.finish()?;
        result.and_then(|value| value.map(|o| marker_reader::to_json(&o)).transpose())
    };
    match read() {
        Ok(Some(json)) => Marker::new("observed", None, Some(json)),
        Ok(None) => Marker::new("missing", None, None),
        Err(error) => Marker::new("failed", Some(error_code(error)), None),
    }
}

pub fn to_json(capture: &ConfirmedCapture) -> Result<String, ProjectError> {
    validate_marker(&capture.marker)?;
    let json = serde_json::to_string(capture).map_err(|_| ProjectError::SerializationFailed)?;
    if json.len() > MAX_BUNDLE_BYTES {
        return Err(ProjectError::OutputTooLarge);
    }
    Ok(json)
}

pub(crate) fn validate_marker(marker: &Marker) -> Result<(), ProjectError> {
    if marker
        .observation_json
        .as_ref()
        .is_some_and(|s| s.len() > MAX_OBSERVATION_BYTES)
    {
        return Err(ProjectError::OutputTooLarge);
    }
    Ok(())
}
