//! Build a fixed summary from a report that has already passed contract A.
//!
//! Identifiers, paths, tool text, evidence, and issue messages are omitted.
//! Exact totals and count distributions can still correlate a source report.
//! This is not an anonymity claim and it is not a statement that the summary
//! is safe to publish.

use serde::Serialize;
use water_contracts::v1::{
    Category, ContractError, Risk, ScanReport, ScanStatus, ScanTotals, SchemaVersion, parse_report,
    validate_report,
};

const EXPORT_VERSION: &str = "water.summary-export.v1";

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SummaryExport {
    pub export_version: &'static str,
    pub source_schema_version: SchemaVersion,
    pub read_only: bool,
    pub status: ScanStatus,
    pub counts: ReportCounts,
    pub risk_counts: RiskCounts,
    pub category_counts: CategoryCounts,
    pub totals: ScanTotals,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ReportCounts {
    pub scopes: u32,
    pub findings: u32,
    pub issues: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RiskCounts {
    pub low: u32,
    pub review: u32,
    pub high: u32,
    pub protected: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct CategoryCounts {
    pub download_cache: u32,
    pub build_cache: u32,
    pub environment: u32,
    pub model: u32,
    pub experiment: u32,
    pub history: u32,
    pub database: u32,
    pub credential: u32,
    pub source: u32,
    pub temporary: u32,
    pub unknown: u32,
}

/// Parse the original JSON text with contract A, then summarize it.
pub fn summarize_json(input: &str) -> Result<SummaryExport, ContractError> {
    summarize_report(&parse_report(input)?)
}

/// Validate a constructed report with contract A, then summarize it.
///
/// Fields that this export drops are still validated. Callers cannot skip A
/// by leaving identifiers or free text out of the summary.
pub fn summarize_report(report: &ScanReport) -> Result<SummaryExport, ContractError> {
    validate_report(report)?;
    Ok(summarize_validated(report))
}

fn summarize_validated(report: &ScanReport) -> SummaryExport {
    let mut risk_counts = RiskCounts {
        low: 0,
        review: 0,
        high: 0,
        protected: 0,
    };
    let mut category_counts = CategoryCounts {
        download_cache: 0,
        build_cache: 0,
        environment: 0,
        model: 0,
        experiment: 0,
        history: 0,
        database: 0,
        credential: 0,
        source: 0,
        temporary: 0,
        unknown: 0,
    };
    for finding in &report.findings {
        add_risk(&mut risk_counts, finding.risk);
        add_category(&mut category_counts, finding.category);
    }
    SummaryExport {
        export_version: EXPORT_VERSION,
        source_schema_version: report.schema_version,
        read_only: true,
        status: report.status,
        counts: ReportCounts {
            scopes: fit_u32(report.scopes.len()),
            findings: fit_u32(report.findings.len()),
            issues: fit_u32(report.issues.len()),
        },
        risk_counts,
        category_counts,
        totals: report.totals.clone(),
    }
}

fn fit_u32(length: usize) -> u32 {
    u32::try_from(length).expect("validated report array length fits in u32")
}

fn add_one(bucket: &mut u32) {
    *bucket = bucket
        .checked_add(1)
        .expect("validated finding count fits in u32");
}

fn add_risk(counts: &mut RiskCounts, risk: Risk) {
    let bucket = match risk {
        Risk::Low => &mut counts.low,
        Risk::Review => &mut counts.review,
        Risk::High => &mut counts.high,
        Risk::Protected => &mut counts.protected,
    };
    add_one(bucket);
}

fn add_category(counts: &mut CategoryCounts, category: Category) {
    let bucket = match category {
        Category::DownloadCache => &mut counts.download_cache,
        Category::BuildCache => &mut counts.build_cache,
        Category::Environment => &mut counts.environment,
        Category::Model => &mut counts.model,
        Category::Experiment => &mut counts.experiment,
        Category::History => &mut counts.history,
        Category::Database => &mut counts.database,
        Category::Credential => &mut counts.credential,
        Category::Source => &mut counts.source,
        Category::Temporary => &mut counts.temporary,
        Category::Unknown => &mut counts.unknown,
    };
    add_one(bucket);
}
