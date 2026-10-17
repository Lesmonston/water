//! Project a validated scan report into display data.
//!
//! The result is a read-only view. It does not measure disks, change protection,
//! or authorize a cleanup.

use std::collections::HashMap;

use serde::Serialize;
use water_contracts::v1::{
    Activity, Category, Confidence, ContractError, Evidence, Finding, OpaqueId, ProtectionReason,
    Recoverability, ReferenceSummary, RelativePath, Risk, ScanIssue, ScanReport, ScanStatus,
    ScanTotals, SchemaVersion, ScopeDescriptor, SizeEstimate, ToolDescriptor, parse_report,
    validate_report,
};

const VIEW_VERSION: &str = "water.report-view.v1";

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ReportView {
    pub view_version: &'static str,
    pub read_only: bool,
    pub source_schema_version: SchemaVersion,
    pub scan_id: OpaqueId,
    pub status: ScanStatus,
    pub scopes: Vec<ScopeDescriptor>,
    pub findings: Vec<FindingView>,
    pub issues: Vec<ScanIssue>,
    pub totals: ScanTotals,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct FindingView {
    pub id: OpaqueId,
    pub scope_id: OpaqueId,
    pub title: String,
    pub relative_path: RelativePath,
    pub tool_id: String,
    pub tool_name: String,
    pub source_tool: Option<ToolDescriptor>,
    pub rule_version: String,
    pub category: Category,
    pub risk: Risk,
    pub recoverability: Recoverability,
    pub activity: Activity,
    pub confidence: Confidence,
    pub evidence: String,
    pub evidence_items: Vec<Evidence>,
    pub protection_reasons: Vec<ProtectionReason>,
    pub references: ReferenceSummary,
    pub logical_bytes: Option<water_contracts::v1::ByteCount>,
    pub size: SizeEstimate,
}

/// Parse the original JSON text, then project the validated report.
pub fn project_json(input: &str) -> Result<ReportView, ContractError> {
    project_report(&parse_report(input)?)
}

/// Validate a constructed report, then project it without changing the input.
pub fn project_report(report: &ScanReport) -> Result<ReportView, ContractError> {
    validate_report(report)?;
    Ok(project_in_memory(report))
}

fn project_in_memory(report: &ScanReport) -> ReportView {
    let labels: HashMap<&str, &str> = report
        .scopes
        .iter()
        .map(|scope| (scope.scope_id.as_str(), scope.label.as_str()))
        .collect();
    let findings = report
        .findings
        .iter()
        .map(|finding| project_finding(finding, &labels))
        .collect();
    ReportView {
        view_version: VIEW_VERSION,
        read_only: true,
        source_schema_version: report.schema_version,
        scan_id: report.scan_id.clone(),
        status: report.status,
        scopes: report.scopes.clone(),
        findings,
        issues: report.issues.clone(),
        totals: report.totals.clone(),
    }
}

fn project_finding(finding: &Finding, labels: &HashMap<&str, &str>) -> FindingView {
    let path = finding.relative_path.as_str();
    let title = if path.is_empty() {
        (*labels
            .get(finding.scope_id.as_str())
            .expect("validated report contains the finding scope"))
        .to_owned()
    } else {
        path.to_owned()
    };
    let (tool_id, tool_name) = match &finding.tool {
        Some(tool) => (format!("tool:{}", tool.tool_id.as_str()), tool.name.clone()),
        None => ("no_tool".to_owned(), "Unknown tool".to_owned()),
    };
    let evidence = finding
        .evidence
        .iter()
        .map(|item| item.summary.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    FindingView {
        id: finding.finding_id.clone(),
        scope_id: finding.scope_id.clone(),
        title,
        relative_path: finding.relative_path.clone(),
        tool_id,
        tool_name,
        source_tool: finding.tool.clone(),
        rule_version: finding.rule_version.clone(),
        category: finding.category,
        risk: finding.risk,
        recoverability: finding.recoverability,
        activity: finding.activity,
        confidence: finding.confidence,
        evidence,
        evidence_items: finding.evidence.clone(),
        protection_reasons: finding.protection_reasons.clone(),
        references: finding.references.clone(),
        logical_bytes: finding.size.logical_bytes,
        size: finding.size.clone(),
    }
}
