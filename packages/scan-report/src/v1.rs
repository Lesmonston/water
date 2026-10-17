//! Assemble validated scan facts into a conservative report bundle.
//!
//! The context describes the report. It does not authorize path access.

use serde::de::value::MapAccessDeserializer;
use serde::de::{MapAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::HashSet;
use std::fmt;
use water_contracts::v1::{
    Activity, AggregateMethod, ByteCount, Category, Confidence, Coverage, EstimateConfidence,
    Evidence, EvidenceCode, EvidenceSource, IssueCode, OpaqueId, Platform, ProtectionReason,
    Recoverability, ReferenceState, ReferenceSummary, RelativePath, Risk, ScanIssue, ScanReport,
    ScanStatus, ScanTotals, SchemaVersion, ScopeDescriptor, ScopeOrigin, SharedState, SizeEstimate,
    SizeMethod, to_json, validate_report,
};

const MAX_JSON_BYTES: usize = 8_388_608;
const BUNDLE_VERSION: &str = "water.scan-report.v1";
const RULE_VERSION: &str = "scan-report-v1";
const EVIDENCE_SUMMARY: &str =
    "Metadata observation only; classification and ownership are unverified.";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AssemblyErrorCode {
    InvalidJson,
    InvalidFacts,
    InvalidContext,
    ReportRejected,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AssemblyError {
    pub code: AssemblyErrorCode,
    pub field: String,
}

impl AssemblyError {
    fn new(code: AssemblyErrorCode, field: &str) -> Self {
        Self {
            code,
            field: field.to_owned(),
        }
    }
}

impl fmt::Display for AssemblyError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{:?} at {}", self.code, self.field)
    }
}

impl std::error::Error for AssemblyError {}

fn invalid_json() -> AssemblyError {
    AssemblyError::new(AssemblyErrorCode::InvalidJson, "/facts")
}

fn invalid_facts() -> AssemblyError {
    AssemblyError::new(AssemblyErrorCode::InvalidFacts, "/facts")
}

fn invalid_context() -> AssemblyError {
    AssemblyError::new(AssemblyErrorCode::InvalidContext, "/context")
}

fn rejected() -> AssemblyError {
    AssemblyError::new(AssemblyErrorCode::ReportRejected, "/report")
}

#[derive(Debug, Clone, PartialEq)]
pub struct ScopeContext {
    pub scope_id: OpaqueId,
    pub label: String,
    pub origin: ScopeOrigin,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ReportContext {
    pub scan_id: OpaqueId,
    pub platform: Platform,
    pub scopes: Vec<ScopeContext>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ReportBundle {
    bundle_version: &'static str,
    report: ScanReport,
    source_facts: serde_json::Value,
}

impl ReportBundle {
    pub fn report(&self) -> &ScanReport {
        &self.report
    }

    pub fn source_facts(&self) -> &serde_json::Value {
        &self.source_facts
    }
}

fn ascii_control(character: char) -> bool {
    character <= '\u{1f}' || character == '\u{7f}'
}

fn required_nullable<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer)
}

fn deserialize_wire_string<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    String::deserialize(deserializer)
}

macro_rules! dto {
    ($name:ident { $($(#[$attribute:meta])* $field:ident: $ty:ty),* $(,)? }) => {
        #[derive(Debug, Clone, PartialEq, Serialize)]
        struct $name {
            $($field: $ty),*
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
                #[derive(Deserialize)]
                #[serde(deny_unknown_fields)]
                struct Fields {
                    $($(#[$attribute])* $field: $ty),*
                }

                struct MapVisitor;
                impl<'de> Visitor<'de> for MapVisitor {
                    type Value = $name;

                    fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                        formatter.write_str(concat!("a ", stringify!($name), " object"))
                    }

                    fn visit_map<A: MapAccess<'de>>(self, map: A) -> Result<Self::Value, A::Error> {
                        let fields =
                            Fields::deserialize(MapAccessDeserializer::new(map))?;
                        Ok($name { $($field: fields.$field),* })
                    }
                }
                deserializer.deserialize_map(MapVisitor)
            }
        }
    };
}

macro_rules! wire_enum {
    ($name:ident { $($variant:ident = $wire:literal),* $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
        enum $name {
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

        impl $name {
            #[allow(dead_code)]
            fn wire(self) -> &'static str {
                match self {
                    $(Self::$variant => $wire),*
                }
            }
        }
    };
}

wire_enum!(EntryKind {
    File = "file",
    Directory = "directory",
    Link = "link",
    Other = "other",
});
wire_enum!(IdentityKind {
    Unknown = "unknown",
    Unix = "unix",
});
wire_enum!(IssueOrigin {
    Native = "native",
    Injected = "injected",
    Control = "control",
    Policy = "policy",
});
wire_enum!(IssueOperation {
    Inspect = "inspect",
    ReadDir = "read_dir",
    Budget = "budget",
    Cancel = "cancel",
    RootGuard = "root_guard",
});

dto!(FileIdentity {
    kind: IdentityKind,
    #[serde(deserialize_with = "required_nullable")]
    device: Option<ByteCount>,
    #[serde(deserialize_with = "required_nullable")]
    inode: Option<ByteCount>,
    #[serde(deserialize_with = "required_nullable")]
    link_count: Option<ByteCount>,
});

dto!(EntryFact {
    relative_path: RelativePath,
    depth: u32,
    kind: EntryKind,
    #[serde(deserialize_with = "required_nullable")]
    logical_bytes: Option<ByteCount>,
    #[serde(deserialize_with = "required_nullable")]
    allocated_bytes: Option<ByteCount>,
    identity: FileIdentity,
});

dto!(FactIssue {
    code: IssueCode,
    #[serde(deserialize_with = "required_nullable")]
    relative_path: Option<RelativePath>,
    origin: IssueOrigin,
    operation: IssueOperation,
});

dto!(ScopeFacts {
    scope_id: OpaqueId,
    relative_root: RelativePath,
    coverage: Coverage,
    visited_entries: u32,
    entries: Vec<EntryFact>,
    issues: Vec<FactIssue>,
});

dto!(ScanFacts {
    facts_version: String,
    run_id: String,
    case_id: String,
    status: ScanStatus,
    visited_entries: u32,
    recorded_entries: u32,
    scopes: Vec<ScopeFacts>,
});

fn parse_facts(input: &str) -> Result<ScanFacts, AssemblyError> {
    if input.len() > MAX_JSON_BYTES {
        return Err(invalid_facts());
    }
    // Syntax is checked first. The DTO is then read from the original text so
    // duplicate keys survive and are rejected instead of collapsing.
    serde_json::from_str::<serde_json::Value>(input).map_err(|_| invalid_json())?;
    serde_json::from_str(input).map_err(|_| invalid_facts())
}

fn valid_run_id(value: &str) -> bool {
    let Some(rest) = value.strip_prefix("run-") else {
        return false;
    };
    let bytes = rest.as_bytes();
    if bytes.is_empty() || bytes.len() > 48 {
        return false;
    }
    (bytes[0].is_ascii_lowercase() || bytes[0].is_ascii_digit())
        && bytes[1..]
            .iter()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || *byte == b'-')
}

fn valid_case_id(value: &str) -> bool {
    let bytes = value.as_bytes();
    !bytes.is_empty()
        && bytes.len() <= 64
        && bytes[0].is_ascii_lowercase()
        && bytes[1..]
            .iter()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || *byte == b'-')
}

fn valid_label(value: &str) -> bool {
    let length = value.chars().count();
    (1..=80).contains(&length) && !value.chars().any(ascii_control)
}

fn validate_identity(
    identity: &FileIdentity,
    kind: EntryKind,
    platform: Platform,
) -> Result<(), AssemblyError> {
    if platform == Platform::Windows && identity.kind != IdentityKind::Unknown {
        return Err(invalid_facts());
    }
    match identity.kind {
        IdentityKind::Unknown => {
            if identity.device.is_some()
                || identity.inode.is_some()
                || identity.link_count.is_some()
            {
                return Err(invalid_facts());
            }
        }
        IdentityKind::Unix => {
            if !matches!(kind, EntryKind::File | EntryKind::Directory) {
                return Err(invalid_facts());
            }
            let (Some(inode), Some(link_count)) =
                (identity.inode.as_ref(), identity.link_count.as_ref())
            else {
                return Err(invalid_facts());
            };
            if identity.device.is_none() || inode.get() == 0 || link_count.get() < 1 {
                return Err(invalid_facts());
            }
        }
    }
    Ok(())
}

fn validate_entry(entry: &EntryFact, platform: Platform) -> Result<(), AssemblyError> {
    let path = entry.relative_path.as_str();
    let segments = path.split('/').count();
    if path.is_empty() || entry.depth == 0 || entry.depth > 64 || segments != entry.depth as usize {
        return Err(invalid_facts());
    }
    let logical_ok = match entry.kind {
        EntryKind::File => entry.logical_bytes.is_some(),
        EntryKind::Directory | EntryKind::Link | EntryKind::Other => entry.logical_bytes.is_none(),
    };
    if !logical_ok || entry.allocated_bytes.is_some() {
        return Err(invalid_facts());
    }
    validate_identity(&entry.identity, entry.kind, platform)
}

fn validate_coverage(facts: &ScanFacts) -> Result<(), AssemblyError> {
    let mut cancelled_scopes = HashSet::new();
    let mut cancelled_issue_scopes = HashSet::new();
    let mut partial_scopes = 0usize;
    for scope in &facts.scopes {
        let mut has_cancelled_issue = false;
        for issue in &scope.issues {
            if issue.code == IssueCode::Cancelled {
                has_cancelled_issue = true;
                cancelled_issue_scopes.insert(scope.scope_id.as_str());
            }
        }
        match scope.coverage {
            Coverage::Complete => {
                if !scope.issues.is_empty() {
                    return Err(invalid_facts());
                }
            }
            Coverage::Partial => {
                partial_scopes += 1;
                if scope.issues.is_empty() {
                    return Err(invalid_facts());
                }
            }
            Coverage::Cancelled => {
                cancelled_scopes.insert(scope.scope_id.as_str());
                if !has_cancelled_issue {
                    return Err(invalid_facts());
                }
            }
        }
    }
    let consistent = match facts.status {
        ScanStatus::Completed => {
            partial_scopes == 0 && cancelled_scopes.is_empty() && cancelled_issue_scopes.is_empty()
        }
        ScanStatus::Partial => {
            partial_scopes > 0 && cancelled_scopes.is_empty() && cancelled_issue_scopes.is_empty()
        }
        ScanStatus::Cancelled => {
            !cancelled_scopes.is_empty() && cancelled_scopes == cancelled_issue_scopes
        }
    };
    if consistent {
        Ok(())
    } else {
        Err(invalid_facts())
    }
}

fn validate_facts(facts: &ScanFacts, context: &ReportContext) -> Result<(), AssemblyError> {
    if facts.facts_version != "water.scan-lab.v1"
        || !valid_run_id(&facts.run_id)
        || !valid_case_id(&facts.case_id)
        || facts.scopes.is_empty()
        || facts.scopes.len() > 64
    {
        return Err(invalid_facts());
    }

    let mut scope_ids = HashSet::new();
    let mut visited_sum = 0u32;
    let mut recorded_sum = 0u32;
    let mut issue_sum = 0u32;
    for scope in &facts.scopes {
        if !scope_ids.insert(scope.scope_id.as_str()) || scope.relative_root.as_str().is_empty() {
            return Err(invalid_facts());
        }
        if scope.entries.len() > 10_000 || scope.issues.len() > 100_000 {
            return Err(invalid_facts());
        }
        let recorded = u32::try_from(scope.entries.len()).map_err(|_| invalid_facts())?;
        let issues = u32::try_from(scope.issues.len()).map_err(|_| invalid_facts())?;
        if scope.visited_entries < recorded {
            return Err(invalid_facts());
        }
        visited_sum = visited_sum
            .checked_add(scope.visited_entries)
            .ok_or_else(invalid_facts)?;
        recorded_sum = recorded_sum
            .checked_add(recorded)
            .ok_or_else(invalid_facts)?;
        issue_sum = issue_sum.checked_add(issues).ok_or_else(invalid_facts)?;
        if issue_sum > 100_000 {
            return Err(invalid_facts());
        }
    }
    if visited_sum != facts.visited_entries
        || recorded_sum != facts.recorded_entries
        || facts.visited_entries > 10_000
        || facts.recorded_entries > facts.visited_entries
    {
        return Err(invalid_facts());
    }

    for scope in &facts.scopes {
        let mut paths = HashSet::new();
        for entry in &scope.entries {
            if !paths.insert(entry.relative_path.as_str()) {
                return Err(invalid_facts());
            }
            validate_entry(entry, context.platform)?;
        }
    }
    validate_coverage(facts)?;

    if context.scopes.len() != facts.scopes.len() {
        return Err(invalid_context());
    }
    for (scope, declared) in facts.scopes.iter().zip(&context.scopes) {
        if scope.scope_id != declared.scope_id || !valid_label(&declared.label) {
            return Err(invalid_context());
        }
    }
    Ok(())
}

fn recorded_descendant(paths: &[&str], path: &str) -> bool {
    let mut prefix = String::with_capacity(path.len() + 1);
    prefix.push_str(path);
    prefix.push('/');
    let index = paths.partition_point(|candidate| *candidate < prefix.as_str());
    paths
        .get(index)
        .is_some_and(|candidate| candidate.starts_with(&prefix))
}

fn finding_size(entry: &EntryFact) -> SizeEstimate {
    if entry.kind == EntryKind::File {
        SizeEstimate {
            logical_bytes: entry.logical_bytes,
            allocated_bytes: None,
            reclaimable_lower_bytes: None,
            reclaimable_upper_bytes: None,
            method: SizeMethod::LogicalSum,
            confidence: EstimateConfidence::Measured,
            shared: SharedState::Unknown,
        }
    } else {
        SizeEstimate {
            logical_bytes: None,
            allocated_bytes: None,
            reclaimable_lower_bytes: None,
            reclaimable_upper_bytes: None,
            method: SizeMethod::Unknown,
            confidence: EstimateConfidence::Unknown,
            shared: SharedState::Unknown,
        }
    }
}

fn build_report(facts: &ScanFacts, context: &ReportContext) -> Result<ScanReport, AssemblyError> {
    let mut findings = Vec::new();
    let mut issues = Vec::new();
    let mut next_id = 1u32;
    for scope in &facts.scopes {
        let mut paths: Vec<&str> = scope
            .entries
            .iter()
            .map(|entry| entry.relative_path.as_str())
            .collect();
        paths.sort_unstable();
        for entry in &scope.entries {
            let mut protection_reasons = vec![
                ProtectionReason::UnknownOwnership,
                ProtectionReason::IncompleteEvidence,
            ];
            if recorded_descendant(&paths, entry.relative_path.as_str()) {
                protection_reasons.push(ProtectionReason::ProtectedDescendant);
            }
            let category = Category::Unknown;
            let risk = Risk::Protected;
            let confidence = Confidence::Unknown;
            findings.push(water_contracts::v1::Finding {
                finding_id: OpaqueId::new(format!("entry-{next_id}")).map_err(|_| rejected())?,
                scope_id: scope.scope_id.clone(),
                relative_path: entry.relative_path.clone(),
                tool: None,
                rule_version: RULE_VERSION.to_owned(),
                category,
                risk,
                recoverability: Recoverability::Unknown,
                activity: Activity::Unknown,
                confidence,
                evidence: vec![Evidence {
                    code: EvidenceCode::Unknown,
                    source: EvidenceSource::Filesystem,
                    summary: EVIDENCE_SUMMARY.to_owned(),
                }],
                protection_reasons,
                references: ReferenceSummary {
                    state: ReferenceState::Unknown,
                    project_ids: Vec::new(),
                },
                size: finding_size(entry),
            });
            next_id = next_id.checked_add(1).ok_or_else(rejected)?;
        }
        for issue in &scope.issues {
            issues.push(ScanIssue {
                code: issue.code,
                scope_id: scope.scope_id.clone(),
                relative_path: issue.relative_path.clone(),
                message: format!(
                    "Scan lab issue; origin={}; operation={}.",
                    issue.origin.wire(),
                    issue.operation.wire()
                ),
            });
        }
    }

    let scopes = facts
        .scopes
        .iter()
        .zip(&context.scopes)
        .map(|(scope, declared)| ScopeDescriptor {
            scope_id: scope.scope_id.clone(),
            label: declared.label.clone(),
            platform: context.platform,
            origin: declared.origin,
            coverage: scope.coverage,
        })
        .collect();

    Ok(ScanReport {
        schema_version: SchemaVersion::WaterScanV1,
        scan_id: context.scan_id.clone(),
        status: facts.status,
        scopes,
        findings,
        issues,
        totals: ScanTotals {
            logical_bytes: None,
            allocated_bytes: None,
            method: AggregateMethod::Unavailable,
            coverage_complete: facts.status == ScanStatus::Completed,
            scanned_entries: facts.recorded_entries,
            skipped_entries: facts.visited_entries - facts.recorded_entries,
        },
    })
}

/// Parse original fact JSON and assemble a protected report plus source facts.
pub fn assemble_json(input: &str, context: &ReportContext) -> Result<ReportBundle, AssemblyError> {
    let facts = parse_facts(input)?;
    validate_facts(&facts, context)?;
    let report = build_report(&facts, context)?;
    validate_report(&report).map_err(|_| rejected())?;
    to_json(&report).map_err(|_| rejected())?;
    let source_facts = serde_json::to_value(&facts).map_err(|_| invalid_facts())?;
    Ok(ReportBundle {
        bundle_version: BUNDLE_VERSION,
        report,
        source_facts,
    })
}
