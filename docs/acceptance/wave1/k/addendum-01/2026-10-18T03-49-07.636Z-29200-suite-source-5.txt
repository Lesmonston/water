import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assertSessionBundle, selectSnapshot, summarizeSnapshot, selectFindings, formatBytes } from '../model.mjs';
import * as original from '../../report-reader/model.mjs';

const source = JSON.parse(readFileSync(new URL('../../../contracts/lab-reader-v1/sessions.json', import.meta.url), 'utf8'));
const cases = JSON.parse(readFileSync(new URL('../../../contracts/lab-reader-v1/cases.json', import.meta.url), 'utf8'));
const actualBytes = readFileSync(new URL('../../../docs/acceptance/wave1/k/addendum-01/actual-j-regression-bundle.json', import.meta.url));
assert.equal(actualBytes.length, 169500);
assert.equal(createHash('sha256').update(actualBytes).digest('hex'), 'd7ba80c113ef357b3ba675a9f51bacd8dc151734a458e6e5b6bdc450e15f9b62');
const actualJ = JSON.parse(actualBytes);
const clone = (value) => structuredClone(value);
const rejected = { name: 'Error', message: 'Unsupported lab session.' };

// Authorized synthetic memory variant, never a physical F capture.
function variant() {
  const bundle = clone(source);
  const s = bundle.snapshots[0];
  s.report.scan_id = s.view.scan_id = 'caller-alpha';
  const entries = s.source_facts.scopes[0].entries;
  const files = entries.map((entry, index) => entry.kind === 'file' ? index : -1).filter((index) => index >= 0);
  const sizes = [cases.memory_variants.bigint_values[1], cases.memory_variants.bigint_values[0], cases.memory_variants.bigint_values[2], cases.memory_variants.bigint_values[0]];
  files.forEach((index, n) => {
    const entry = entries[index];
    if (n === 0) entry.relative_path = cases.memory_variants.html_relative_path;
    if (n === 1) entry.relative_path = 'unicode/模型-' + '长'.repeat(160) + '/<script>literal</script>';
    entry.depth = entry.relative_path.split('/').length;
    entry.logical_bytes = sizes[n];
    s.report.findings[index].relative_path = entry.relative_path;
    s.report.findings[index].size.logical_bytes = sizes[n];
    Object.assign(s.view.findings[index], { relative_path: entry.relative_path, title: entry.relative_path, logical_bytes: sizes[n] });
    s.view.findings[index].size.logical_bytes = sizes[n];
  });
  return bundle;
}

test('reader_session_contract', () => {
  const before = clone(source);
  assert.equal(assertSessionBundle(source), undefined, 'K_BEHAVIOR: accept the four actual pipeline snapshots');
  assert.deepEqual(source, before);
  assert.equal(selectFindings, original.selectFindings, 'Reuse the actual I function');
  assert.equal(formatBytes, original.formatBytes);
  for (const item of cases.snapshots) {
    const s = source.snapshots.find((value) => value.view.scan_id === item.scan_id);
    assert.equal(s.source_facts.case_id, item.case_id);
    assert.equal(s.view.status, item.status);
  }
  const mutations = [
    (b) => { delete b.snapshots[0].session_version; },
    (b) => { b.snapshots[0].data_kind = 'real-user-data'; },
    (b) => { delete b.snapshots[0].view.findings[0].size.allocated_bytes; },
    (b) => { b.snapshots[0].view.scan_id = 'mismatch'; },
    (b) => { b.snapshots[0].source_facts.status = 'partial'; },
    (b) => { b.snapshots[0].summary.counts.findings++; },
    (b) => { b.snapshots[0].report.findings[0].relative_path = 'different'; },
    (b) => { b.snapshots[0].summary.totals.logical_bytes = '0'; },
    (b) => { b.snapshots.push(clone(b.snapshots[0])); },
    (b) => { b.extra = 'private'; },
    (b) => { b.bundle_version = 'future'; },
    (b) => { b.snapshots = []; },
    (b) => { b.snapshots[0].extra = 'private'; },
    (b) => { b.snapshots[0].summary.risk_counts.low = 1; },
    (b) => { delete b.snapshots[0].summary.category_counts.model; },
    (b) => { b.snapshots[0].summary.category_counts.extra = 0; },
    (b) => { b.snapshots[0].summary.read_only = false; },
    (b) => { b.snapshots[0].summary.status = 'partial'; },
    (b) => { b.snapshots[0].report.totals.scanned_entries++; },
    (b) => { b.snapshots[0].source_facts.recorded_entries++; },
    (b) => { b.snapshots[0].source_facts.visited_entries++; },
    (b) => { b.snapshots[0].source_facts.scopes[0].scope_id = 'different'; },
    (b) => { b.snapshots[2].source_facts.scopes.reverse(); },
    (b) => { b.snapshots[0].source_facts.scopes[0].entries[1].logical_bytes = '1'; },
    (b) => { b.snapshots[0].source_facts.scopes[0].entries[1].depth++; },
    (b) => { delete b.snapshots[0].source_facts.scopes[0].entries[0].identity.device; },
    (b) => { b.snapshots[0].source_facts.scopes[0].relative_root = '../secret'; },
    (b) => { b.snapshots[0].source_facts.scopes[0].entries.reverse(); },
    (b) => { b.snapshots[0].report.findings[0].finding_id = 'not-entry-1'; },
    (b) => { b.snapshots[0].report.findings[0].evidence[0].summary = 'different'; },
    (b) => { b.snapshots[0].view.findings[0].category = b.snapshots[0].report.findings[0].category = 'source'; },
    (b) => { b.snapshots[0].report.schema_version = 'future'; },
    (b) => { b.snapshots[3].source_facts.scopes[0].issues[0].origin = 'native'; },
    (b) => { b.snapshots[3].view.issues[0].message = 'different'; },
    (b) => { b.snapshots[0].source_facts.scopes[0].entries[1].logical_bytes = '18446744073709551616'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const bad = clone(source);
    mutate(bad);
    assert.throws(() => assertSessionBundle(bad), rejected, `K_BEHAVIOR: reject inconsistent bundle mutation ${index}`);
  }
  for (const bad of [null, [], {}, 'private-input', { ...source, snapshots: new Array(65).fill(source.snapshots[0]) }]) {
    assert.throws(() => assertSessionBundle(bad), rejected);
  }
  const maximum = clone(source);
  maximum.snapshots = Array.from({ length: 64 }, (_, i) => {
    const s = clone(source.snapshots[0]);
    s.report.scan_id = s.view.scan_id = `caller-${i}`;
    return s;
  });
  assert.equal(assertSessionBundle(maximum), undefined);

  const actualBefore = clone(actualJ);
  const rootMarker = 'K_BEHAVIOR K_ROOT_ISSUE_PATH: accept the actual J bundle with a scope-root issue';
  assert.doesNotThrow(() => assertSessionBundle(actualJ), rootMarker);
  assert.equal(actualJ.snapshots.length, 13);
  for (const snapshot of actualJ.snapshots) {
    assert.doesNotThrow(() => assertSessionBundle({ bundle_version: actualJ.bundle_version, snapshots: [snapshot] }), rootMarker);
    assert.deepEqual(selectSnapshot(actualJ, snapshot.view.scan_id), snapshot);
  }
  const root = selectSnapshot(actualJ, 'pipeline-8');
  for (const issue of [root.source_facts.scopes[0].issues[0], root.report.issues[0], root.view.issues[0]]) assert.equal(issue.relative_path, '');
  assert.deepEqual(summarizeSnapshot(root), {
    finding_count: 2, protected_count: 2, unknown_size_count: 0, issue_count: 1,
    source_totals: clone(root.view.totals),
  });
  // Synchronized memory variants only; these are not new physical J/F captures.
  const issueVariant = (relativePath) => {
    const snapshot = clone(root);
    for (const issue of [snapshot.source_facts.scopes[0].issues[0], snapshot.report.issues[0], snapshot.view.issues[0]]) issue.relative_path = relativePath;
    return { bundle_version: actualJ.bundle_version, snapshots: [snapshot] };
  };
  for (const relativePath of ['', null, 'parent/文件.txt', 'literal/<img src=x onerror=literal>']) {
    const bundle = issueVariant(relativePath), before = clone(bundle);
    assert.doesNotThrow(() => assertSessionBundle(bundle), rootMarker);
    for (const issue of [bundle.snapshots[0].source_facts.scopes[0].issues[0], bundle.snapshots[0].report.issues[0], bundle.snapshots[0].view.issues[0]]) assert.equal(issue.relative_path, relativePath);
    assert.deepEqual(bundle, before);
  }
  for (const relativePath of ['/absolute', 'C:/absolute', 'C:\\absolute', 'a\\b', '.', '..', './child', 'a/../b', 'a/./b', 'a//b', 'a/', '\u0000', 'a\nb', 'a\u007fb']) {
    assert.throws(() => assertSessionBundle(issueVariant(relativePath)), rejected, `Reject invalid issue path ${JSON.stringify(relativePath)}`);
  }
  {
    const snapshot = clone(root);
    snapshot.source_facts.scopes[0].relative_root = '';
    assert.throws(() => assertSessionBundle({ bundle_version: actualJ.bundle_version, snapshots: [snapshot] }), rejected, 'scope.relative_root remains nonempty');
  }
  const emptyEntry = clone(root);
  const entry = emptyEntry.source_facts.scopes[0].entries[0];
  entry.relative_path = '';
  emptyEntry.report.findings[0].relative_path = '';
  emptyEntry.view.findings[0].relative_path = '';
  emptyEntry.view.findings[0].title = emptyEntry.view.scopes[0].label;
  emptyEntry.report.findings[0].protection_reasons.push('source_root');
  emptyEntry.view.findings[0].protection_reasons.push('source_root');
  assert.equal(original.assertReportView(emptyEntry.view), undefined);
  assert.throws(() => assertSessionBundle({ bundle_version: actualJ.bundle_version, snapshots: [emptyEntry] }), rejected, 'entry.relative_path remains nonempty even with a valid E root view');
  for (const relativePath of ['/absolute', 'C:/absolute', 'a\\b', '.', '..', 'a/../b', 'a/./b', 'a//b', 'a/', 'a\nb']) {
    const badRoot = clone(root);
    badRoot.source_facts.scopes[0].relative_root = relativePath;
    assert.throws(() => assertSessionBundle({ bundle_version: actualJ.bundle_version, snapshots: [badRoot] }), rejected);
    const badEntry = clone(root);
    badEntry.source_facts.scopes[0].entries[0].relative_path = relativePath;
    badEntry.report.findings[0].relative_path = relativePath;
    badEntry.view.findings[0].relative_path = badEntry.view.findings[0].title = relativePath;
    assert.throws(() => assertSessionBundle({ bundle_version: actualJ.bundle_version, snapshots: [badEntry] }), rejected);
  }
  assert.deepEqual(actualJ, actualBefore, 'Preserve every field of the actual 13-snapshot J capture');
});

test('reader_session_selection', () => {
  const a = variant();
  const b = { bundle_version: source.bundle_version, snapshots: [clone(source.snapshots[2]), clone(a.snapshots[0])] };
  b.snapshots[1].report.scan_id = b.snapshots[1].view.scan_id = 'arbitrary-beta';
  for (const bundle of [a, b]) {
    const before = clone(bundle);
    assert.equal(assertSessionBundle(bundle), undefined);
    for (const s of bundle.snapshots) assert.deepEqual(selectSnapshot(bundle, s.view.scan_id), s, 'K_BEHAVIOR: select any supplied scan_id');
    for (const id of ['absent', undefined, null, '../secret']) assert.throws(() => selectSnapshot(bundle, id), rejected);
    assert.deepEqual(bundle, before);
  }
  const view = a.snapshots[0].view;
  const before = clone(view);
  assert.deepEqual(selectFindings(view).map((f) => f.id), ['entry-4', 'entry-2', 'entry-3', 'entry-6', 'entry-1', 'entry-5']);
  assert.deepEqual(selectFindings(view, { sort: 'size_asc' }).map((f) => f.id), ['entry-3', 'entry-6', 'entry-2', 'entry-4', 'entry-1', 'entry-5']);
  assert.deepEqual(selectFindings(view, { query: 'HTML/<IMG', scope: 'scope-1', tool: 'no_tool', category: 'unknown', risk: 'protected', sort: 'name_asc' }).map((f) => f.id), ['entry-2']);
  assert.deepEqual(selectFindings(view, { tool: 'tool:missing' }), []);
  assert.deepEqual(selectFindings(view, { scope: 'different' }), []);
  assert.deepEqual(selectFindings(view, { category: 'source' }), []);
  assert.deepEqual(selectFindings(view, { risk: 'low' }), []);
  assert.deepEqual(selectFindings(view, { query: '.*' }), []);
  assert.deepEqual(selectFindings(view, { sort: 'name_asc' }).slice(-2).map((f) => f.id), ['entry-1', 'entry-5']);
  assert.equal(formatBytes(null), '未知');
  assert.equal(formatBytes('18446744073709551615'), '15.9 EiB');
  assert.equal(formatBytes('9007199254740993'), '8 PiB');
  assert.deepEqual(view, before);
});

test('reader_session_summary', () => {
  for (const s of [...source.snapshots, variant().snapshots[0]]) {
    const before = clone(s);
    const summary = summarizeSnapshot(s);
    assert.deepEqual(summary, {
      finding_count: s.view.findings.length,
      protected_count: s.view.findings.length,
      unknown_size_count: s.view.findings.filter((f) => f.logical_bytes === null).length,
      issue_count: s.summary.counts.issues,
      source_totals: clone(s.view.totals),
    }, 'K_BEHAVIOR: summarize the whole snapshot');
    assert.equal(summary.source_totals.logical_bytes, null, 'K_TOTAL_UNKNOWN: source unknown must remain null');
    assert.equal(summary.source_totals.allocated_bytes, null, 'K_TOTAL_UNKNOWN: allocated unknown must remain null');
    summary.source_totals.scanned_entries = 999;
    assert.deepEqual(s, before, 'Source totals must be a separate copy');
    selectFindings(s.view, { query: 'absent' });
    assert.equal(summarizeSnapshot(s).finding_count, s.view.findings.length);
  }
  assert.throws(() => summarizeSnapshot({}), rejected);
});
