//! Read-only facts from the frozen, stationary synthetic fixture laboratory.
//! This is not a real-user root authorization or a concurrent filesystem sandbox.

mod marker;
mod native;
mod walk;

use serde::Serialize;
use std::fmt;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use water_contracts::v1::{ByteCount, Coverage, IssueCode, OpaqueId, RelativePath, ScanStatus};

pub use marker::open_fixture_run;
pub use native::NativeIo;
pub use walk::scan_fixture_with_io;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScanErrorCode {
    InvalidRunId,
    UnsafeRoot,
    InvalidMarker,
    InvalidOptions,
    IoError,
    Unsupported,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanError {
    pub code: ScanErrorCode,
    pub field: &'static str,
}

impl fmt::Display for ScanError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?} at {}", self.code, self.field)
    }
}
impl std::error::Error for ScanError {}

#[derive(Clone)]
struct Guard {
    path: PathBuf,
    identity: FileIdentity,
}

struct Scope {
    id: OpaqueId,
    relative: RelativePath,
    guards: Arc<Vec<Guard>>,
}

pub struct FixtureRun {
    run_id: String,
    case_id: String,
    root: PathBuf,
    scopes: Vec<Scope>,
}

impl FixtureRun {
    pub fn run_id(&self) -> &str {
        &self.run_id
    }
    pub fn case_id(&self) -> &str {
        &self.case_id
    }
}
impl fmt::Debug for FixtureRun {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("FixtureRun")
            .field("run_id", &self.run_id)
            .field("case_id", &self.case_id)
            .finish_non_exhaustive()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanOptions {
    max_depth: u32,
    max_entries: u32,
    max_dir_entries: u32,
}
impl ScanOptions {
    pub fn new(max_depth: u32, max_entries: u32, max_dir_entries: u32) -> Result<Self, ScanError> {
        if max_depth > 64
            || !(1..=10000).contains(&max_entries)
            || !(1..=1024).contains(&max_dir_entries)
        {
            return Err(ScanError {
                code: ScanErrorCode::InvalidOptions,
                field: "/options",
            });
        }
        Ok(Self {
            max_depth,
            max_entries,
            max_dir_entries,
        })
    }
    pub fn max_depth(&self) -> u32 {
        self.max_depth
    }
    pub fn max_entries(&self) -> u32 {
        self.max_entries
    }
    pub fn max_dir_entries(&self) -> u32 {
        self.max_dir_entries
    }
}

#[derive(Debug, Clone)]
pub struct CancelToken {
    cancelled: Arc<AtomicBool>,
}
impl CancelToken {
    #[allow(clippy::new_without_default)] // The frozen interface deliberately excludes Default.
    pub fn new() -> Self {
        Self {
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }
}

pub struct ScanNodePath {
    absolute: PathBuf,
    scope_id: OpaqueId,
    relative: RelativePath,
    run_relative: RelativePath,
    guards: Arc<Vec<Guard>>,
}
impl ScanNodePath {
    pub fn scope_id(&self) -> &OpaqueId {
        &self.scope_id
    }
    pub fn relative_path(&self) -> &RelativePath {
        &self.relative
    }
    pub fn run_relative_path(&self) -> &RelativePath {
        &self.run_relative
    }
}
impl fmt::Debug for ScanNodePath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ScanNodePath")
            .field("scope_id", &self.scope_id)
            .field("relative_path", &self.relative)
            .field("run_relative_path", &self.run_relative)
            .finish_non_exhaustive()
    }
}

pub trait ReadOnlyIo {
    fn inspect(&self, node: &ScanNodePath) -> Result<NodeMetadata, IoFault>;
    fn list_names(
        &self,
        node: &ScanNodePath,
        limit: usize,
    ) -> Result<Vec<std::ffi::OsString>, IoFault>;
}
pub trait ScanObserver {
    fn on_entry(&self, progress: &ScanProgress);
}
pub struct NoopObserver;
impl ScanObserver for NoopObserver {
    fn on_entry(&self, _: &ScanProgress) {}
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EntryKind {
    File,
    Directory,
    Link,
    Other,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum IdentityKind {
    Unknown,
    Unix,
}
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct FileIdentity {
    pub kind: IdentityKind,
    pub device: Option<ByteCount>,
    pub inode: Option<ByteCount>,
    pub link_count: Option<ByteCount>,
}
impl FileIdentity {
    fn unknown() -> Self {
        Self {
            kind: IdentityKind::Unknown,
            device: None,
            inode: None,
            link_count: None,
        }
    }
}
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct NodeMetadata {
    pub kind: EntryKind,
    pub logical_bytes: Option<ByteCount>,
    pub identity: FileIdentity,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IoFaultKind {
    PermissionDenied,
    NotFound,
    Io,
    DirectoryLimit,
    RootChanged,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IoFault {
    pub kind: IoFaultKind,
    pub injected: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ScanProgress {
    pub scope_id: OpaqueId,
    pub relative_path: RelativePath,
    pub visited_entries: u32,
    pub recorded_entries: u32,
}
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ScanFacts {
    pub facts_version: &'static str,
    pub run_id: String,
    pub case_id: String,
    pub status: ScanStatus,
    pub visited_entries: u32,
    pub recorded_entries: u32,
    pub scopes: Vec<ScopeFacts>,
}
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ScopeFacts {
    pub scope_id: OpaqueId,
    pub relative_root: RelativePath,
    pub coverage: Coverage,
    pub visited_entries: u32,
    pub entries: Vec<EntryFact>,
    pub issues: Vec<FactIssue>,
}
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct EntryFact {
    pub relative_path: RelativePath,
    pub depth: u32,
    pub kind: EntryKind,
    pub logical_bytes: Option<ByteCount>,
    pub allocated_bytes: Option<ByteCount>,
    pub identity: FileIdentity,
}
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct FactIssue {
    pub code: IssueCode,
    pub relative_path: Option<RelativePath>,
    pub origin: IssueOrigin,
    pub operation: IssueOperation,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum IssueOrigin {
    Native,
    Injected,
    Control,
    Policy,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum IssueOperation {
    Inspect,
    ReadDir,
    Budget,
    Cancel,
    RootGuard,
}

pub fn scan_fixture(
    run: &FixtureRun,
    options: &ScanOptions,
    cancel: &CancelToken,
) -> Result<ScanFacts, ScanError> {
    scan_fixture_with_io(run, options, cancel, &NativeIo, &NoopObserver)
}
