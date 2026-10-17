import { assertReportView } from '../report-reader/model.mjs';
export { selectFindings, formatBytes } from '../report-reader/model.mjs';

const ERROR = 'Unsupported lab session.';
const CATEGORIES = ['download_cache', 'build_cache', 'environment', 'model', 'experiment', 'history', 'database', 'credential', 'source', 'temporary', 'unknown'];
const RISKS = ['low', 'review', 'high', 'protected'];
const SNAPSHOT_KEYS = ['session_version', 'data_kind', 'source_facts', 'report', 'view', 'summary'];

function requireValue(condition) {
  if (!condition) throw new Error(ERROR);
}
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exact(value, keys) {
  requireValue(object(value) && Object.keys(value).length === keys.length);
  requireValue(keys.every((key) => Object.hasOwn(value, key)));
}
function same(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i]));
  }
  return object(a) && object(b) && Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) => Object.hasOwn(b, key) && same(a[key], b[key]));
}
function equal(a, b) { requireValue(same(a, b)); }
function uint(value) {
  requireValue(Number.isInteger(value) && value >= 0 && value <= 4294967295);
}
function bytes(value) {
  requireValue(typeof value === 'string' && /^(0|[1-9][0-9]{0,19})$/.test(value) && BigInt(value) <= 18446744073709551615n);
}
function path(value) {
  requireValue(typeof value === 'string' && value.length > 0 && [...value].length <= 4096 && !/[\\:\u0000-\u001f\u007f]/.test(value));
  requireValue(value.split('/').every((segment) => segment && segment !== '.' && segment !== '..'));
}
function identity(value, entry, platform) {
  exact(value, ['kind', 'device', 'inode', 'link_count']);
  if (value.kind === 'unknown') {
    requireValue(value.device === null && value.inode === null && value.link_count === null);
  } else {
    requireValue(value.kind === 'unix' && entry.kind === 'file' && platform === 'macos');
    for (const key of ['device', 'inode', 'link_count']) bytes(value[key]);
    requireValue(BigInt(value.inode) > 0n && BigInt(value.link_count) > 0n);
  }
}

// These are display consistency checks on trusted J/A JSON, not scope authorization.
function validateSnapshot(snapshot) {
  exact(snapshot, SNAPSHOT_KEYS);
  requireValue(snapshot.session_version === 'water.lab-session.v1' && snapshot.data_kind === 'controlled_fixture_metadata');
  const { source_facts: facts, report, view, summary } = snapshot;
  assertReportView(view);
  exact(report, ['schema_version', 'scan_id', 'status', 'scopes', 'findings', 'issues', 'totals']);
  exact(facts, ['facts_version', 'run_id', 'case_id', 'status', 'visited_entries', 'recorded_entries', 'scopes']);
  requireValue(facts.facts_version === 'water.scan-lab.v1');
  requireValue(typeof facts.run_id === 'string' && /^run-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(facts.run_id));
  requireValue(typeof facts.case_id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(facts.case_id));
  requireValue(report.schema_version === view.source_schema_version && report.scan_id === view.scan_id);
  requireValue(report.status === view.status && facts.status === view.status);
  equal(report.scopes, view.scopes);
  equal(report.issues, view.issues);
  equal(report.totals, view.totals);
  requireValue(Array.isArray(report.findings) && report.findings.length === view.findings.length);
  requireValue(Array.isArray(facts.scopes) && facts.scopes.length === view.scopes.length);
  uint(facts.visited_entries); uint(facts.recorded_entries);
  requireValue(facts.visited_entries <= 10000 && facts.recorded_entries <= facts.visited_entries);

  let findingIndex = 0, visited = 0;
  const issues = [];
  const platform = view.scopes[0].platform;
  facts.scopes.forEach((scope, scopeIndex) => {
    exact(scope, ['scope_id', 'relative_root', 'coverage', 'visited_entries', 'entries', 'issues']);
    const displayed = view.scopes[scopeIndex];
    requireValue(scope.scope_id === displayed.scope_id && scope.coverage === displayed.coverage);
    requireValue(displayed.platform === platform && displayed.origin === 'user_selected' && displayed.label === 'Synthetic ' + scope.scope_id);
    path(scope.relative_root);
    requireValue(Array.isArray(scope.entries) && scope.entries.length <= 10000 && Array.isArray(scope.issues) && scope.issues.length <= 100000);
    uint(scope.visited_entries);
    requireValue(scope.visited_entries >= scope.entries.length);
    visited += scope.visited_entries;
    const paths = new Set();
    for (const entry of scope.entries) {
      exact(entry, ['relative_path', 'depth', 'kind', 'logical_bytes', 'allocated_bytes', 'identity']);
      path(entry.relative_path);
      requireValue(!paths.has(entry.relative_path)); paths.add(entry.relative_path);
      requireValue(Number.isInteger(entry.depth) && entry.depth >= 1 && entry.depth <= 64 && entry.depth === entry.relative_path.split('/').length);
      requireValue(['file', 'directory', 'link', 'other'].includes(entry.kind) && entry.allocated_bytes === null);
      if (entry.kind === 'file') bytes(entry.logical_bytes); else requireValue(entry.logical_bytes === null);
      identity(entry.identity, entry, platform);
      const f = view.findings[findingIndex];
      requireValue(f && f.id === `entry-${findingIndex + 1}` && f.scope_id === scope.scope_id && f.relative_path === entry.relative_path && f.logical_bytes === entry.logical_bytes);
      requireValue(f.category === 'unknown' && f.risk === 'protected' && f.activity === 'unknown' && f.confidence === 'unknown' && f.recoverability === 'unknown');
      requireValue(f.source_tool === null && f.rule_version === 'scan-report-v1');
      requireValue(f.protection_reasons.includes('unknown_ownership') && f.protection_reasons.includes('incomplete_evidence'));
      equal(f.references, { state: 'unknown', project_ids: [] });
      equal(f.size, {
        logical_bytes: entry.logical_bytes, allocated_bytes: null,
        reclaimable_lower_bytes: null, reclaimable_upper_bytes: null,
        method: entry.kind === 'file' ? 'logical_sum' : 'unknown',
        confidence: entry.kind === 'file' ? 'measured' : 'unknown', shared: 'unknown',
      });
      equal(report.findings[findingIndex], {
        finding_id: f.id, scope_id: f.scope_id, relative_path: f.relative_path,
        tool: f.source_tool, rule_version: f.rule_version, category: f.category, risk: f.risk,
        recoverability: f.recoverability, activity: f.activity, confidence: f.confidence,
        evidence: f.evidence_items, protection_reasons: f.protection_reasons,
        references: f.references, size: f.size,
      });
      findingIndex++;
    }
    if (scope.coverage === 'complete') requireValue(scope.issues.length === 0);
    if (scope.coverage === 'partial') requireValue(scope.issues.length > 0);
    for (const issue of scope.issues) {
      exact(issue, ['code', 'relative_path', 'origin', 'operation']);
      requireValue(['native', 'injected', 'control', 'policy'].includes(issue.origin));
      requireValue(['inspect', 'read_dir', 'budget', 'cancel', 'root_guard'].includes(issue.operation));
      if (issue.relative_path !== null) path(issue.relative_path);
      issues.push({ code: issue.code, scope_id: scope.scope_id, relative_path: issue.relative_path, message: `Scan lab issue; origin=${issue.origin}; operation=${issue.operation}.` });
    }
  });
  requireValue(findingIndex === view.findings.length && findingIndex === facts.recorded_entries && visited === facts.visited_entries);
  equal(view.issues, issues);
  equal(view.totals, { logical_bytes: null, allocated_bytes: null, method: 'unavailable', coverage_complete: view.status === 'completed', scanned_entries: facts.recorded_entries, skipped_entries: facts.visited_entries - facts.recorded_entries });

  exact(summary, ['export_version', 'source_schema_version', 'read_only', 'status', 'counts', 'risk_counts', 'category_counts', 'totals']);
  requireValue(summary.export_version === 'water.summary-export.v1' && summary.source_schema_version === report.schema_version && summary.read_only === true && summary.status === view.status);
  equal(summary.counts, { scopes: view.scopes.length, findings: view.findings.length, issues: issues.length });
  equal(summary.risk_counts, Object.fromEntries(RISKS.map((risk) => [risk, risk === 'protected' ? findingIndex : 0])));
  equal(summary.category_counts, Object.fromEntries(CATEGORIES.map((category) => [category, category === 'unknown' ? findingIndex : 0])));
  equal(summary.totals, view.totals);
}

export function assertSessionBundle(bundle) {
  try {
    exact(bundle, ['bundle_version', 'snapshots']);
    requireValue(bundle.bundle_version === 'water.lab-reader-bundle.v1' && Array.isArray(bundle.snapshots) && bundle.snapshots.length >= 1 && bundle.snapshots.length <= 64);
    const ids = new Set();
    for (const snapshot of bundle.snapshots) {
      validateSnapshot(snapshot);
      requireValue(!ids.has(snapshot.view.scan_id));
      ids.add(snapshot.view.scan_id);
    }
  } catch { throw new Error(ERROR); }
}

export function selectSnapshot(bundle, scanId) {
  assertSessionBundle(bundle);
  const snapshot = bundle.snapshots.find((s) => s.view.scan_id === scanId);
  requireValue(snapshot !== undefined);
  return snapshot;
}

export function summarizeSnapshot(snapshot) {
  assertSessionBundle({ bundle_version: 'water.lab-reader-bundle.v1', snapshots: [snapshot] });
  return {
    finding_count: snapshot.view.findings.length,
    protected_count: snapshot.view.findings.filter((f) => f.risk === 'protected').length,
    unknown_size_count: snapshot.view.findings.filter((f) => f.logical_bytes === null).length,
    issue_count: snapshot.summary.counts.issues,
    source_totals: JSON.parse(JSON.stringify(snapshot.view.totals)),
  };
}
