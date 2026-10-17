import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertReportView, formatBytes, selectFindings, summarizeView } from '../model.mjs';

const bundle = JSON.parse(readFileSync(new URL('../../../contracts/report-reader-v1/reports.json', import.meta.url), 'utf8'));
const reports = Object.fromEntries(bundle.reports.map((report) => [report.id, report.view]));
const composite = reports.composite_partial;
const ids = (rows) => rows.map((row) => row.id);
const clone = (value) => structuredClone(value);

function rejection(mutate) {
  const view = clone(composite);
  mutate(view);
  assert.throws(() => assertReportView(view), { name: 'Error', message: 'Unsupported report view.' });
}

test('reader_input_and_preservation', () => {
  assert.deepEqual(bundle.reports.map((report) => report.id), ['base', 'composite_partial', 'cancelled', 'empty_completed']);
  for (const view of Object.values(reports)) {
    const before = clone(view);
    assert.equal(assertReportView(view), undefined);
    selectFindings(view);
    summarizeView(view);
    assert.deepEqual(view, before);
  }
  const selected = selectFindings(composite, { query: 'same/path' });
  assert.notEqual(selected, composite.findings);
  assert.deepEqual(ids(selected), ['big-before', 'duplicate-title']);
  assert.deepEqual(ids(selectFindings(composite, { query: 'same/path', scope: 'scope-1' })), ['big-before']);
  assert.deepEqual(ids(selectFindings(composite, { query: 'same/path', scope: 'scope-2' })), ['duplicate-title']);
  assert.equal(reports.cancelled.findings.length, 1);
  assert.equal(reports.empty_completed.findings.length, 0);
  selected.pop();
  assert.equal(composite.findings.length, 8);

  rejection((view) => { view.view_version = 'water.prototype.v1'; });
  rejection((view) => { view.read_only = false; });
  rejection((view) => { view.source_schema_version = 'water.scan.v0'; });
  rejection((view) => { view.status = 'running'; });
  rejection((view) => { view.extra = true; });
  rejection((view) => { delete view.totals.logical_bytes; });
  rejection((view) => { view.findings[0].logical_bytes = '01'; });
  rejection((view) => { view.findings[0].logical_bytes = '18446744073709551616'; view.findings[0].size.logical_bytes = '18446744073709551616'; });
  rejection((view) => { view.findings[0].logical_bytes = 37; view.findings[0].size.logical_bytes = 37; });
  rejection((view) => { view.findings[0].risk = 'medium'; });
  rejection((view) => { view.scan_id = '../scan'; });
  rejection((view) => { view.findings[1].relative_path = '../secret'; view.findings[1].title = '../secret'; });
  rejection((view) => { view.findings[0].tool_id = 'all'; });
  rejection((view) => { delete view.findings[0].size.allocated_bytes; });
  assert.throws(() => formatBytes('01'), { message: 'Unsupported report view.' });
  assert.throws(() => formatBytes(9007199254740993), { message: 'Unsupported report view.' });
});

test('reader_bigint_filters', () => {
  assert.deepEqual(ids(selectFindings(composite, { sort: 'size_desc' })), [
    'max', 'big-before', 'big-after', 'duplicate-title', 'scope-root', 'zero', 'unknown-first', 'unknown-last',
  ]);
  assert.deepEqual(ids(selectFindings(composite, { sort: 'size_asc' })), [
    'zero', 'scope-root', 'duplicate-title', 'big-after', 'big-before', 'max', 'unknown-first', 'unknown-last',
  ], '2^53 must sort before 2^53+1; Number comparison collapses the pair');
  assert.deepEqual(ids(selectFindings(composite, { sort: 'name_asc' })), [
    'scope-root', 'big-after', 'max', 'big-before', 'duplicate-title', 'zero', 'unknown-last', 'unknown-first',
  ], 'unknown-size titles sort by lowercase code points and equal titles keep original order');
  const filtered = selectFindings(composite, {
    query: 'SAME', scope: 'scope-2', tool: 'tool:ruff', category: 'build_cache', risk: 'review', sort: 'size_asc',
  });
  assert.deepEqual(ids(filtered), ['duplicate-title']);
  assert.deepEqual(ids(selectFindings(composite, { tool: 'tool:all' })), ['big-before']);
  assert.deepEqual(ids(selectFindings(composite, { tool: 'no_tool', sort: 'name_asc' })), ['zero', 'unknown-first']);
  assert.deepEqual(ids(selectFindings(composite, { tool: 'tool:no_tool' })), ['max']);
  assert.deepEqual(ids(selectFindings(composite, { risk: 'low' })), ['zero']);
  assert.deepEqual(ids(selectFindings(composite, { risk: 'high' })), ['big-after']);
  assert.deepEqual(ids(selectFindings(composite, { risk: 'review', sort: 'size_asc' })), ['duplicate-title', 'big-before']);
  assert.deepEqual(ids(selectFindings(composite, { query: '<script>' })), []);
  assert.deepEqual(ids(selectFindings(composite, { query: '%2e%2e' })), ['max']);
  const before = clone(composite);
  selectFindings(composite, { sort: 'size_asc', query: '模型' });
  assert.deepEqual(composite, before);
});

test('reader_totals_and_unknown', () => {
  const summary = summarizeView(composite);
  const summed = composite.findings.reduce((total, finding) => total + (finding.logical_bytes === null ? 0n : BigInt(finding.logical_bytes)), 0n);
  assert.deepEqual(Object.keys(summary), ['count', 'protected_count', 'unknown_size_count', 'source_totals']);
  assert.equal(summary.count, 8);
  assert.equal(summary.protected_count, 4);
  assert.equal(summary.unknown_size_count, 2);
  assert.equal(summary.source_totals.logical_bytes, '37');
  assert.equal(summary.source_totals.method, 'file_identity_deduplicated');
  assert.equal(summary.source_totals.allocated_bytes, null);
  assert.notEqual(summary.source_totals.logical_bytes, '0');
  assert.notEqual(summary.source_totals.logical_bytes, summed.toString());
  summary.source_totals.logical_bytes = '0';
  assert.equal(composite.totals.logical_bytes, '37');
  assert.equal(summarizeView(reports.base).source_totals.logical_bytes, null);
  assert.equal(summarizeView(reports.cancelled).source_totals.logical_bytes, null);
  assert.equal(summarizeView(reports.cancelled).unknown_size_count, 1);
  assert.equal(summarizeView(reports.cancelled).count, 1);
  assert.deepEqual(summarizeView(reports.empty_completed), {
    count: 0, protected_count: 0, unknown_size_count: 0,
    source_totals: reports.empty_completed.totals,
  });
  assert.equal(formatBytes(null), '未知');
  assert.equal(formatBytes('0'), '0 B');
  assert.equal(formatBytes('37'), '37 B');
  assert.equal(formatBytes('1126'), '1 KiB');
  assert.equal(formatBytes('1127'), '1.1 KiB');
  assert.equal(formatBytes('9007199254740992'), '8 PiB');
  assert.equal(formatBytes('9007199254740993'), '8 PiB');
  assert.equal(formatBytes('18446744073709551615'), '15.9 EiB');
  const risks = new Set(composite.findings.map((finding) => finding.risk));
  const activities = new Set(composite.findings.map((finding) => finding.activity));
  const recoveries = new Set(composite.findings.map((finding) => finding.recoverability));
  assert.deepEqual([...risks].sort(), ['high', 'low', 'protected', 'review']);
  assert.deepEqual([...activities].sort(), ['not_observed', 'recent', 'running', 'unknown']);
  assert.deepEqual([...recoveries].sort(), ['conditional', 'not_applicable', 'rebuild', 'redownload', 'unknown']);
});
