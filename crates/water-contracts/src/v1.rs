//! Frozen `water.scan.v1` data types and validation entry points.
//!
//! These types carry observations. Paths, IDs and risk labels grant no access
//! to files and never authorize a scan or a cleanup operation.

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::{
    collections::{HashMap, HashSet},
    fmt,
    str::FromStr,
};

const MAX_JSON_BYTES: usize = 8_388_608;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ContractErrorCode {
    InvalidJson,
    InvalidShape,
    InvalidByteCount,
    InvalidId,
    InvalidRelativePath,
    DuplicateId,
    UnknownScope,
    InconsistentReport,
    UnsafeClassification,
    InvalidSize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContractError {
    pub code: ContractErrorCode,
    pub field: String,
}

impl ContractError {
    fn new(code: ContractErrorCode, field: &str) -> Self {
        Self {
            code,
            field: field.to_owned(),
        }
    }
}

impl fmt::Display for ContractError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{:?} at {}", self.code, self.field)
    }
}

impl std::error::Error for ContractError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ByteCount(u64);

impl ByteCount {
    pub fn new(value: u64) -> Self {
        Self(value)
    }

    pub fn get(&self) -> u64 {
        self.0
    }
}

impl FromStr for ByteCount {
    type Err = ContractError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        if value.is_empty()
            || (value.len() > 1 && value.starts_with('0'))
            || !value.bytes().all(|byte| byte.is_ascii_digit())
        {
            return Err(ContractError::new(
                ContractErrorCode::InvalidByteCount,
                "byte_count",
            ));
        }
        value
            .parse::<u64>()
            .map(Self)
            .map_err(|_| ContractError::new(ContractErrorCode::InvalidByteCount, "byte_count"))
    }
}

impl Serialize for ByteCount {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0.to_string())
    }
}

impl<'de> Deserialize<'de> for ByteCount {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        value.parse().map_err(serde::de::Error::custom)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct OpaqueId(String);

impl OpaqueId {
    pub fn new(value: impl Into<String>) -> Result<Self, ContractError> {
        let value = value.into();
        let bytes = value.as_bytes();
        if bytes.is_empty()
            || bytes.len() > 64
            || !bytes[0].is_ascii_alphanumeric()
            || !bytes
                .iter()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        {
            return Err(ContractError::new(
                ContractErrorCode::InvalidId,
                "opaque_id",
            ));
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Serialize for OpaqueId {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for OpaqueId {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Self::new(String::deserialize(deserializer)?).map_err(serde::de::Error::custom)
    }
}

fn ascii_control(character: char) -> bool {
    character <= '\u{1f}' || character == '\u{7f}'
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct RelativePath(String);

impl RelativePath {
    pub fn new(value: impl Into<String>) -> Result<Self, ContractError> {
        let value = value.into();
        if value.chars().count() > 4096
            || value
                .chars()
                .any(|character| ascii_control(character) || matches!(character, '\\' | ':'))
            || (!value.is_empty()
                && value
                    .split('/')
                    .any(|segment| matches!(segment, "" | "." | "..")))
        {
            return Err(ContractError::new(
                ContractErrorCode::InvalidRelativePath,
                "relative_path",
            ));
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Serialize for RelativePath {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for RelativePath {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Self::new(String::deserialize(deserializer)?).map_err(serde::de::Error::custom)
    }
}

// A custom deserializer makes a nullable property required. An absent field
// must not take Serde's usual missing-Option shortcut.
fn required_nullable<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer)
}

// Deserialize maps only: derive alone also accepts positional JSON arrays for
// structs, which would violate the object-only wire schema. The inner derive
// rejects unknown and duplicate fields, including duplicate explicit nulls.
macro_rules! dto {
    ($name:ident { $($(#[$attribute:meta])* $field:ident: $ty:ty),* $(,)? }) => {
        #[derive(Debug, Clone, PartialEq, Serialize)]
        pub struct $name {
            $(pub $field: $ty),*
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
                #[derive(Deserialize)]
                #[serde(deny_unknown_fields)]
                struct Fields {
                    $($(#[$attribute])* $field: $ty),*
                }

                struct MapVisitor;
                impl<'de> serde::de::Visitor<'de> for MapVisitor {
                    type Value = $name;

                    fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                        formatter.write_str(concat!("a ", stringify!($name), " object"))
                    }

                    fn visit_map<A: serde::de::MapAccess<'de>>(
                        self,
                        map: A,
                    ) -> Result<Self::Value, A::Error> {
                        let fields = Fields::deserialize(serde::de::value::MapAccessDeserializer::new(map))?;
                        Ok($name { $($field: fields.$field),* })
                    }
                }
                deserializer.deserialize_map(MapVisitor)
            }
        }
    };
}

// JSON Schema requires a string. Derived Serde also accepts the externally
// tagged unit object {"variant": null}; read the string before matching it.
fn deserialize_wire_string<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    String::deserialize(deserializer)
}

macro_rules! wire_enum {
    ($name:ident { $($variant:ident = $wire:literal),* $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
        pub enum $name {
            $(
                #[serde(rename = $wire)]
                $variant
            ),*
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
                let value = deserialize_wire_string(deserializer)?;
                match value.as_str() {
                    $($wire => Ok(Self::$variant),)*
                    _ => Err(serde::de::Error::custom("expected a schema string")),
                }
            }
        }
    };
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
pub enum SchemaVersion {
    #[serde(rename = "water.scan.v1")]
    WaterScanV1,
}

impl<'de> Deserialize<'de> for SchemaVersion {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = deserialize_wire_string(deserializer)?;
        match value.as_str() {
            "water.scan.v1" => Ok(Self::WaterScanV1),
            _ => Err(serde::de::Error::custom("expected a schema string")),
        }
    }
}

wire_enum!(Platform {
    Windows = "windows",
    Macos = "macos",
});
wire_enum!(ScopeOrigin {
    UserSelected = "user_selected",
    ConfigDiscovered = "config_discovered",
});
wire_enum!(Coverage {
    Complete = "complete",
    Partial = "partial",
    Cancelled = "cancelled",
});
wire_enum!(ScanStatus {
    Completed = "completed",
    Partial = "partial",
    Cancelled = "cancelled",
});
wire_enum!(LocationSource {
    Config = "config",
    Native = "native",
    Marker = "marker",
    DefaultPath = "default_path",
    Unknown = "unknown",
});
wire_enum!(Category {
    DownloadCache = "download_cache",
    BuildCache = "build_cache",
    Environment = "environment",
    Model = "model",
    Experiment = "experiment",
    History = "history",
    Database = "database",
    Credential = "credential",
    Source = "source",
    Temporary = "temporary",
    Unknown = "unknown",
});
wire_enum!(Risk {
    Low = "low",
    Review = "review",
    High = "high",
    Protected = "protected",
});
wire_enum!(Recoverability {
    Rebuild = "rebuild",
    Redownload = "redownload",
    Conditional = "conditional",
    Unknown = "unknown",
    NotApplicable = "not_applicable",
});
wire_enum!(Activity {
    Running = "running",
    Recent = "recent",
    NotObserved = "not_observed",
    Unknown = "unknown",
});
wire_enum!(Confidence {
    Native = "native",
    VerifiedStructure = "verified_structure",
    PathOnly = "path_only",
    Unknown = "unknown",
});
wire_enum!(ProtectionReason {
    Credential = "credential",
    UniqueAsset = "unique_asset",
    Active = "active",
    UnknownOwnership = "unknown_ownership",
    IncompleteEvidence = "incomplete_evidence",
    SourceRoot = "source_root",
    SystemRoot = "system_root",
    UserHome = "user_home",
    ProtectedDescendant = "protected_descendant",
    UserPinned = "user_pinned",
});
wire_enum!(EvidenceCode {
    NativeInventory = "native_inventory",
    StructureMatch = "structure_match",
    ConfiguredLocation = "configured_location",
    Marker = "marker",
    TimestampHint = "timestamp_hint",
    Reference = "reference",
    IncompleteScan = "incomplete_scan",
    Unknown = "unknown",
});
wire_enum!(EvidenceSource {
    NativeTool = "native_tool",
    Config = "config",
    Filesystem = "filesystem",
    Rule = "rule",
    Heuristic = "heuristic",
});
wire_enum!(SizeMethod {
    Unknown = "unknown",
    LogicalSum = "logical_sum",
    FileIdentityAllocated = "file_identity_allocated",
    ToolReport = "tool_report",
});
wire_enum!(EstimateConfidence {
    Unknown = "unknown",
    Estimated = "estimated",
    Measured = "measured",
});
wire_enum!(SharedState {
    Yes = "yes",
    No = "no",
    Unknown = "unknown",
});
wire_enum!(ReferenceState {
    Known = "known",
    Partial = "partial",
    Unknown = "unknown",
});
wire_enum!(AggregateMethod {
    Unavailable = "unavailable",
    FileIdentityDeduplicated = "file_identity_deduplicated",
    ToolReport = "tool_report",
});
wire_enum!(IssueCode {
    PermissionDenied = "permission_denied",
    IoError = "io_error",
    LinkSkipped = "link_skipped",
    OutsideScope = "outside_scope",
    PathUnrepresentable = "path_unrepresentable",
    DepthLimit = "depth_limit",
    EntryLimit = "entry_limit",
    Cancelled = "cancelled",
    RootChanged = "root_changed",
    Unsupported = "unsupported",
});

dto!(ScopeDescriptor {
    scope_id: OpaqueId,
    label: String,
    platform: Platform,
    origin: ScopeOrigin,
    coverage: Coverage,
});

dto!(ToolDescriptor {
    tool_id: OpaqueId,
    name: String,
    #[serde(deserialize_with = "required_nullable")]
    version: Option<String>,
    root_source: LocationSource,
});

dto!(Evidence {
    code: EvidenceCode,
    source: EvidenceSource,
    summary: String,
});

dto!(ReferenceSummary {
    state: ReferenceState,
    project_ids: Vec<OpaqueId>,
});

dto!(SizeEstimate {
    #[serde(deserialize_with = "required_nullable")]
    logical_bytes: Option<ByteCount>,
    #[serde(deserialize_with = "required_nullable")]
    allocated_bytes: Option<ByteCount>,
    #[serde(deserialize_with = "required_nullable")]
    reclaimable_lower_bytes: Option<ByteCount>,
    #[serde(deserialize_with = "required_nullable")]
    reclaimable_upper_bytes: Option<ByteCount>,
    method: SizeMethod,
    confidence: EstimateConfidence,
    shared: SharedState,
});

dto!(Finding {
    finding_id: OpaqueId,
    scope_id: OpaqueId,
    relative_path: RelativePath,
    #[serde(deserialize_with = "required_nullable")]
    tool: Option<ToolDescriptor>,
    rule_version: String,
    category: Category,
    risk: Risk,
    recoverability: Recoverability,
    activity: Activity,
    confidence: Confidence,
    evidence: Vec<Evidence>,
    protection_reasons: Vec<ProtectionReason>,
    references: ReferenceSummary,
    size: SizeEstimate,
});

dto!(ScanIssue {
    code: IssueCode,
    scope_id: OpaqueId,
    #[serde(deserialize_with = "required_nullable")]
    relative_path: Option<RelativePath>,
    message: String,
});

dto!(ScanTotals {
    #[serde(deserialize_with = "required_nullable")]
    logical_bytes: Option<ByteCount>,
    #[serde(deserialize_with = "required_nullable")]
    allocated_bytes: Option<ByteCount>,
    method: AggregateMethod,
    coverage_complete: bool,
    scanned_entries: u32,
    skipped_entries: u32,
});

dto!(ScanReport {
    schema_version: SchemaVersion,
    scan_id: OpaqueId,
    status: ScanStatus,
    scopes: Vec<ScopeDescriptor>,
    findings: Vec<Finding>,
    issues: Vec<ScanIssue>,
    totals: ScanTotals,
});

/// Parse syntax first, then deserialize the original input without losing keys.
pub fn parse_report(input: &str) -> Result<ScanReport, ContractError> {
    if input.len() > MAX_JSON_BYTES {
        return Err(ContractError::new(ContractErrorCode::InvalidShape, "/"));
    }
    serde_json::from_str::<serde_json::Value>(input)
        .map_err(|_| ContractError::new(ContractErrorCode::InvalidJson, "/"))?;
    let report = serde_json::from_str(input)
        .map_err(|_| ContractError::new(ContractErrorCode::InvalidShape, "/"))?;
    validate_report(&report)?;
    Ok(report)
}

/// Validate a directly constructed DTO before it crosses a public boundary.
pub fn validate_report(report: &ScanReport) -> Result<(), ContractError> {
    validate_shape(report)?;

    let mut scope_ids = HashSet::new();
    for (index, scope) in report.scopes.iter().enumerate() {
        if !scope_ids.insert(&scope.scope_id) {
            return Err(ContractError::new(
                ContractErrorCode::DuplicateId,
                &format!("/scopes/{index}/scope_id"),
            ));
        }
    }
    let mut finding_ids = HashSet::new();
    for (index, finding) in report.findings.iter().enumerate() {
        if !finding_ids.insert(&finding.finding_id) {
            return Err(ContractError::new(
                ContractErrorCode::DuplicateId,
                &format!("/findings/{index}/finding_id"),
            ));
        }
        let mut project_ids = HashSet::new();
        for project_id in &finding.references.project_ids {
            if !project_ids.insert(project_id) {
                return Err(ContractError::new(
                    ContractErrorCode::DuplicateId,
                    &format!("/findings/{index}/references/project_ids"),
                ));
            }
        }
    }

    for (index, finding) in report.findings.iter().enumerate() {
        if !scope_ids.contains(&finding.scope_id) {
            return Err(ContractError::new(
                ContractErrorCode::UnknownScope,
                &format!("/findings/{index}/scope_id"),
            ));
        }
    }
    for (index, issue) in report.issues.iter().enumerate() {
        if !scope_ids.contains(&issue.scope_id) {
            return Err(ContractError::new(
                ContractErrorCode::UnknownScope,
                &format!("/issues/{index}/scope_id"),
            ));
        }
    }

    validate_coverage(report)?;
    for (index, finding) in report.findings.iter().enumerate() {
        if finding.references.state == ReferenceState::Unknown
            && !finding.references.project_ids.is_empty()
        {
            return Err(ContractError::new(
                ContractErrorCode::InconsistentReport,
                &format!("/findings/{index}/references"),
            ));
        }
    }
    validate_sizes(report)?;
    validate_classification(report)?;
    validate_ancestor_protection(report)?;
    Ok(())
}

fn text(value: &str, maximum: usize, field: &str) -> Result<(), ContractError> {
    let length = value.chars().count();
    if length == 0 || length > maximum || value.chars().any(ascii_control) {
        return Err(ContractError::new(ContractErrorCode::InvalidShape, field));
    }
    Ok(())
}

fn count(length: usize, minimum: usize, maximum: usize, field: &str) -> Result<(), ContractError> {
    if !(minimum..=maximum).contains(&length) {
        return Err(ContractError::new(ContractErrorCode::InvalidShape, field));
    }
    Ok(())
}

fn validate_shape(report: &ScanReport) -> Result<(), ContractError> {
    count(report.scopes.len(), 1, 64, "/scopes")?;
    count(report.findings.len(), 0, 100_000, "/findings")?;
    count(report.issues.len(), 0, 100_000, "/issues")?;
    for (index, scope) in report.scopes.iter().enumerate() {
        text(&scope.label, 80, &format!("/scopes/{index}/label"))?;
    }
    for (index, finding) in report.findings.iter().enumerate() {
        let field = format!("/findings/{index}");
        text(&finding.rule_version, 32, &format!("{field}/rule_version"))?;
        if let Some(tool) = &finding.tool {
            text(&tool.name, 80, &format!("{field}/tool/name"))?;
            if let Some(version) = &tool.version {
                text(version, 64, &format!("{field}/tool/version"))?;
            }
        }
        count(finding.evidence.len(), 1, 64, &format!("{field}/evidence"))?;
        count(
            finding.protection_reasons.len(),
            0,
            64,
            &format!("{field}/protection_reasons"),
        )?;
        count(
            finding.references.project_ids.len(),
            0,
            10_000,
            &format!("{field}/references/project_ids"),
        )?;
        for (evidence_index, evidence) in finding.evidence.iter().enumerate() {
            text(
                &evidence.summary,
                280,
                &format!("{field}/evidence/{evidence_index}/summary"),
            )?;
        }
    }
    for (index, issue) in report.issues.iter().enumerate() {
        text(&issue.message, 280, &format!("/issues/{index}/message"))?;
    }
    Ok(())
}

fn validate_coverage(report: &ScanReport) -> Result<(), ContractError> {
    let cancelled_scopes: HashSet<_> = report
        .scopes
        .iter()
        .filter(|scope| scope.coverage == Coverage::Cancelled)
        .map(|scope| &scope.scope_id)
        .collect();
    let cancelled_issues: HashSet<_> = report
        .issues
        .iter()
        .filter(|issue| issue.code == IssueCode::Cancelled)
        .map(|issue| &issue.scope_id)
        .collect();
    let all_complete = report
        .scopes
        .iter()
        .all(|scope| scope.coverage == Coverage::Complete);
    let consistent = match report.status {
        ScanStatus::Completed => {
            all_complete && report.issues.is_empty() && report.totals.coverage_complete
        }
        ScanStatus::Partial => {
            !report.totals.coverage_complete
                && (!all_complete || !report.issues.is_empty())
                && cancelled_scopes.is_empty()
                && cancelled_issues.is_empty()
        }
        ScanStatus::Cancelled => {
            !report.totals.coverage_complete
                && !cancelled_scopes.is_empty()
                && cancelled_scopes == cancelled_issues
        }
    };
    if !consistent {
        return Err(ContractError::new(
            ContractErrorCode::InconsistentReport,
            "/status",
        ));
    }
    Ok(())
}

fn validate_sizes(report: &ScanReport) -> Result<(), ContractError> {
    for (index, finding) in report.findings.iter().enumerate() {
        let size = &finding.size;
        let has_measurement = size.logical_bytes.is_some() || size.allocated_bytes.is_some();
        let consistent = if size.method == SizeMethod::Unknown {
            !has_measurement && size.confidence == EstimateConfidence::Unknown
        } else {
            has_measurement && size.confidence != EstimateConfidence::Unknown
        };
        if !consistent
            || size.reclaimable_lower_bytes.is_some()
            || size.reclaimable_upper_bytes.is_some()
        {
            return Err(ContractError::new(
                ContractErrorCode::InvalidSize,
                &format!("/findings/{index}/size"),
            ));
        }
    }
    let totals = &report.totals;
    let has_measurement = totals.logical_bytes.is_some() || totals.allocated_bytes.is_some();
    if (totals.method == AggregateMethod::Unavailable) == has_measurement {
        return Err(ContractError::new(
            ContractErrorCode::InvalidSize,
            "/totals",
        ));
    }
    Ok(())
}

fn validate_classification(report: &ScanReport) -> Result<(), ContractError> {
    for (index, finding) in report.findings.iter().enumerate() {
        let protected = finding.risk == Risk::Protected;
        let sensitive_category = matches!(
            finding.category,
            Category::Model
                | Category::Experiment
                | Category::History
                | Category::Database
                | Category::Credential
                | Category::Source
                | Category::Unknown
        );
        let must_protect = sensitive_category
            || matches!(
                finding.confidence,
                Confidence::PathOnly | Confidence::Unknown
            )
            || finding.activity == Activity::Running
            || finding.references.state == ReferenceState::Partial;
        let root_protected = protected
            && finding.protection_reasons.iter().any(|reason| {
                matches!(
                    reason,
                    ProtectionReason::SourceRoot
                        | ProtectionReason::SystemRoot
                        | ProtectionReason::UserHome
                        | ProtectionReason::ProtectedDescendant
                )
            });
        if protected == finding.protection_reasons.is_empty()
            || (must_protect && !protected)
            || (finding.relative_path.as_str().is_empty() && !root_protected)
        {
            return Err(ContractError::new(
                ContractErrorCode::UnsafeClassification,
                &format!("/findings/{index}/risk"),
            ));
        }
    }
    Ok(())
}

fn validate_ancestor_protection(report: &ScanReport) -> Result<(), ContractError> {
    // Index protected paths by scope. Each ancestor query uses binary search;
    // repeated paths and roots do not cause quadratic pair comparisons.
    let mut protected_paths: HashMap<&OpaqueId, Vec<&str>> = HashMap::new();
    for finding in &report.findings {
        if finding.risk == Risk::Protected {
            protected_paths
                .entry(&finding.scope_id)
                .or_default()
                .push(finding.relative_path.as_str());
        }
    }
    for paths in protected_paths.values_mut() {
        paths.sort_unstable();
    }
    for (index, finding) in report.findings.iter().enumerate() {
        let Some(paths) = protected_paths.get(&finding.scope_id) else {
            continue;
        };
        let path = finding.relative_path.as_str();
        let has_protected_descendant = if path.is_empty() {
            paths.partition_point(|candidate| candidate.is_empty()) < paths.len()
        } else {
            let prefix = format!("{path}/");
            let successor = paths.partition_point(|candidate| *candidate < prefix.as_str());
            paths
                .get(successor)
                .is_some_and(|candidate| candidate.starts_with(&prefix))
        };
        if has_protected_descendant
            && (finding.risk != Risk::Protected
                || !finding
                    .protection_reasons
                    .contains(&ProtectionReason::ProtectedDescendant))
        {
            return Err(ContractError::new(
                ContractErrorCode::UnsafeClassification,
                &format!("/findings/{index}/protection_reasons"),
            ));
        }
    }
    Ok(())
}

/// Produce compact JSON only after validating the entire report.
pub fn to_json(report: &ScanReport) -> Result<String, ContractError> {
    validate_report(report)?;
    let output = serde_json::to_string(report)
        .map_err(|_| ContractError::new(ContractErrorCode::InvalidShape, "/"))?;
    if output.len() > MAX_JSON_BYTES {
        return Err(ContractError::new(ContractErrorCode::InvalidShape, "/"));
    }
    Ok(output)
}
