import { assertReportView, selectFindings, formatBytes } from '../report-reader/model.mjs';
export { selectFindings, formatBytes };

const error = () => { throw new Error('Unsupported scan review.'); };
const risks = ['low','review','high','protected'];
const categories = ['download_cache','build_cache','environment','model','experiment','history','database','credential','source','temporary','unknown'];
const encoder = new TextEncoder();

// Public input is JSON data. Reject accessors, symbols, hidden properties, holes,
// custom prototypes and cycles before validators or JSON serialization run.
function jsonData(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || ancestors.has(value)) error();
  const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
  if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) error();
  const descriptors = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(descriptors);
  if (array && keys.length !== value.length + 1) error();
  ancestors.add(value);
  for (const key of keys) {
    if (array && key === 'length') continue;
    const d = descriptors[key];
    if (typeof key !== 'string' || !d.enumerable || !Object.hasOwn(d, 'value')) error();
    if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)) error();
    jsonData(d.value, ancestors);
  }
  ancestors.delete(value);
}
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) error();
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) error();
}
// Object order is irrelevant; array order and every key/value remain exact.
function same(actual, expected) {
  if (expected === null || typeof expected !== 'object') { if (actual !== expected) error(); return; }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) error();
    expected.forEach((v, i) => same(actual[i], v));
  } else {
    exact(actual, Object.keys(expected));
    for (const key of Object.keys(expected)) same(actual[key], expected[key]);
  }
}
function assertSnapshot(snapshot) {
  exact(snapshot, ['source_kind','view','summary','redacted_json']);
  if (!['retained_j_capture','synthetic_memory'].includes(snapshot.source_kind)) error();
  const { view, summary, redacted_json: text } = snapshot;
  assertReportView(view);
  const risk_counts = Object.fromEntries(risks.map(r => [r, 0]));
  const category_counts = Object.fromEntries(categories.map(c => [c, 0]));
  for (const f of view.findings) { risk_counts[f.risk]++; category_counts[f.category]++; }
  same(summary, {
    export_version:'water.summary-export.v1', source_schema_version:view.source_schema_version, read_only:true,
    status:view.status, counts:{scopes:view.scopes.length,findings:view.findings.length,issues:view.issues.length},
    risk_counts, category_counts, totals:view.totals,
  });
  if (typeof text !== 'string' || text.length > 16777216 || encoder.encode(text).length > 16777216) error();
  const q = JSON.parse(text);
  // This rejects whitespace, duplicate keys and alternative escape/number forms.
  if (JSON.stringify(q) !== text) error();
  const scopeRefs = new Map(view.scopes.map((s, i) => [s.scope_id, `scope-${i + 1}`]));
  // Validation projection only: never serialize this into an export. The only
  // export source is the exact caller-supplied, checked Q string below.
  same(q, {
    export_version:'water.redacted-report.v1', source_schema_version:view.source_schema_version, read_only:true,
    redaction_profile:'structural_no_paths_v1', anonymity_guaranteed:false, summary,
    scopes:view.scopes.map(s => ({scope_ref:scopeRefs.get(s.scope_id),platform:s.platform,origin:s.origin,coverage:s.coverage})),
    findings:view.findings.map((f, i) => ({
      finding_ref:`finding-${i + 1}`, scope_ref:scopeRefs.get(f.scope_id), has_tool:f.source_tool !== null,
      category:f.category, risk:f.risk, recoverability:f.recoverability, activity:f.activity, confidence:f.confidence,
      evidence:f.evidence_items.map(e => ({code:e.code,source:e.source})), protection_reasons:f.protection_reasons,
      references:{state:f.references.state,project_count:f.references.project_ids.length}, size:f.size,
    })),
    issues:view.issues.map(i => ({code:i.code,scope_ref:scopeRefs.get(i.scope_id)})),
  });
}
export function assertReviewBundle(bundle) {
  try {
    jsonData(bundle);
    exact(bundle, ['bundle_version','snapshots']);
    if (bundle.bundle_version !== 'water.scan-review-bundle.v1' || !Array.isArray(bundle.snapshots) || bundle.snapshots.length < 1 || bundle.snapshots.length > 32) error();
    const ids = new Set();
    for (const snapshot of bundle.snapshots) {
      assertSnapshot(snapshot);
      if (ids.has(snapshot.view.scan_id)) error();
      ids.add(snapshot.view.scan_id);
    }
    return bundle;
  } catch { error(); }
}
export function selectSnapshot(bundle, scanId) {
  assertReviewBundle(bundle);
  return bundle.snapshots.find(s => s.view.scan_id === scanId) ?? null;
}
export function exportText(bundle, scanId) {
  const selected = selectSnapshot(bundle, scanId);
  if (!selected) error();
  return selected.redacted_json;
}
