import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as model from '../model.mjs';
import { selectFindings as originalSelect } from '../../report-reader/model.mjs';
import { assertSessionBundle } from '../../lab-reader/model.mjs';

const source = JSON.parse(readFileSync(new URL('../../../contracts/evidence-reader-v1/sessions.json', import.meta.url), 'utf8'));
const copy = () => structuredClone(source);
const error = { name: 'Error', message: 'Unsupported evidence bundle.' };
function rejects(change) {
  const b = copy(); change(b);
  assert.throws(() => model.assertEvidenceBundle(b), error);
  assert.throws(() => model.selectSnapshot(b, 'missing'), error);
}
function frozen(v) {
  if (v && typeof v === 'object') { Object.values(v).forEach(frozen); Object.freeze(v); }
  return v;
}

test('evidence_reader_bundle', () => {
  assert.deepEqual(Object.keys(model).sort(), ['assertEvidenceBundle', 'formatLedgerBytes', 'selectFindings', 'selectSnapshot']);
  const b = copy(), before = copy();
  assert.doesNotThrow(() => model.assertEvidenceBundle(b), 'O_BEHAVIOR: complete accepted bundle must validate');
  assert.equal(model.assertEvidenceBundle(b), b);
  assert.deepEqual(b, before);
  assert.equal(b.snapshots.length, 18);
  assert.equal(b.snapshots.filter(s => s.source_kind === 'retained_j_capture').length, 13);
  assertSessionBundle({ bundle_version: 'water.lab-reader-bundle.v1', snapshots: b.snapshots.map(s => s.session) });
  assert.equal(model.assertEvidenceBundle(frozen(copy())).snapshots.length, 18);
  for (const s of b.snapshots) assert.equal(model.assertEvidenceBundle({ bundle_version: b.bundle_version, snapshots: [s] }).snapshots[0], s);
  for (const value of [undefined, null, [], {}, { ...b, extra: 1 }, { ...b, bundle_version: 'other' }, { ...b, snapshots: [] }, { ...b, snapshots: Array(33).fill(b.snapshots[0]) }]) assert.throws(() => model.assertEvidenceBundle(value), error);
  rejects(b => b.snapshots.push(b.snapshots[0]));
  rejects(b => b.snapshots[0].source_kind = 'verified_scan');
  rejects(b => b.snapshots[0].extra = true);
  rejects(b => b.snapshots[0].session.view.findings[0].risk = 'low');
  for (const name of ['project_evidence', 'size_ledger']) {
    for (const [key, value] of Object.entries({ read_only: false, scan_id: 'unrelated', source_run_id: 'unrelated', platform: 'macos', status: 'partial', source_facts: {}, source_totals: {} })) rejects(b => b.snapshots[0][name][key] = value);
    rejects(b => b.snapshots[0][name].counts.entries = -1);
    rejects(b => b.snapshots[0][name].counts.entries = 4294967296);
    rejects(b => b.snapshots[0][name].counts.extra = 0);
    rejects(b => b.snapshots[0][name].extra = 0);
    rejects(b => delete b.snapshots[0][name].read_only);
    rejects(b => b.snapshots[0][name].source_facts.scopes[0].relative_root = 'forged');
    rejects(b => b.snapshots[0][name].source_totals.logical_bytes = '0');
  }
  rejects(b => b.snapshots[0].project_evidence.evidence_version = 'v2');
  rejects(b => b.snapshots[0].project_evidence.rules_version = 'v2');
  rejects(b => b.snapshots[0].size_ledger.ledger_version = 'v2');
  const many = { bundle_version: b.bundle_version, snapshots: Array.from({length: 32}, (_, i) => {
    const s = structuredClone(b.snapshots[0]);
    s.session.report.scan_id = s.session.view.scan_id = s.project_evidence.scan_id = s.size_ledger.scan_id = `memory-${i}`;
    return s;
  }) };
  assert.equal(model.assertEvidenceBundle(many), many);
});

test('evidence_reader_selection', () => {
  const b = frozen(copy());
  assert.equal(model.selectFindings, originalSelect, 'reuse actual I filtering');
  for (const s of b.snapshots) {
    assert.equal(model.selectSnapshot(b, s.session.view.scan_id), s);
    for (const filters of [{}, {query: 'package'}, {category: 'unknown', risk: 'protected'}, {risk: 'low'}, {scope: s.session.view.scopes[0].scope_id, sort: 'name_asc'}, {sort: 'size_asc'}]) {
      assert.deepEqual(model.selectFindings(s.session.view, filters), originalSelect(s.session.view, filters));
    }
  }
  assert.equal(model.selectSnapshot(b, 'absent'), null);
  assert.equal(model.selectSnapshot(b, null), null);
  assert.deepEqual(b, source);
  const root = b.snapshots.find(s => s.session.view.scan_id === 'pipeline-8');
  assert.equal(root.session.source_facts.scopes[0].issues[0].relative_path, '');
  const empty = b.snapshots.find(s => s.session.view.scan_id === 'pipeline-11');
  assert.equal(empty.session.view.status, 'cancelled');
  assert.equal(empty.size_ledger.identity_deduplicated_logical_bytes, '0');
  assert.equal(empty.size_ledger.scope_coverage_complete, false);
});

test('evidence_reader_annotations', () => {
  assert.doesNotThrow(() => model.assertEvidenceBundle(source), 'O_BEHAVIOR: annotations valid');
  const four = source.snapshots.at(-1).project_evidence.candidates;
  assert.deepEqual(four.map(c => c.rule_id), ['node-package-json', 'node-package-lock', 'python-pyproject', 'python-requirements']);
  for (const c of four) { assert.equal(c.parent_relative_path, ''); assert.equal(c.evidence_strength, 'filename_only'); assert.equal(c.risk, 'protected'); }
  for (const [key, value] of Object.entries({ finding_id: 'entry-1', scope_id: 'absent', relative_path: 'package.json.bak', parent_relative_path: 'forged', rule_id: 'python-pyproject', ecosystem: 'python', evidence_strength: 'verified', format_verified: true, tool_version_known: true, project_membership_verified: true, scope_coverage: 'partial', action: 'delete', risk: 'low' })) rejects(b => b.snapshots[0].project_evidence.candidates[0][key] = value);
  rejects(b => b.snapshots[0].project_evidence.candidates.pop());
  rejects(b => b.snapshots[0].project_evidence.candidates.reverse());
  rejects(b => b.snapshots[0].project_evidence.counts.non_file_marker_names++);
  rejects(b => b.snapshots[0].size_ledger.identity_deduplicated_logical_bytes = '0');
  rejects(b => b.snapshots[0].size_ledger.unknown_identity_entries.pop());
  rejects(b => b.snapshots[0].size_ledger.unknown_identity_entries.push(b.snapshots[0].size_ledger.unknown_identity_entries[0]));
  rejects(b => b.snapshots[0].size_ledger.unknown_identity_entries[0].finding_id = 'entry-1');
  rejects(b => b.snapshots[0].size_ledger.unknown_identity_entries[0].scope_id = 'absent');
  for (const field of ['observed_file_logical_bytes', 'known_identity_logical_bytes', 'unknown_identity_observed_logical_bytes', 'identity_deduplicated_logical_bytes', 'volume_unique_allocated_bytes', 'reclaimable_bytes', 'observed_set_identity_complete', 'scope_coverage_complete']) rejects(b => b.snapshots[0].size_ledger[field] = field.endsWith('complete') ? !b.snapshots[0].size_ledger[field] : '999');
  for (const i of [13, 14, 15]) {
    for (const [key, value] of Object.entries({ device: '2', inode: '99', state: i === 13 ? 'conflicting' : 'consistent', logical_bytes: '0', logical_byte_values: ['10', '10'], link_count_values: ['3', '2'], entry_refs: [] })) {
      rejects(b => b.snapshots[i].size_ledger.identity_groups[0][key] = value);
    }
    rejects(b => b.snapshots[i].size_ledger.identity_groups.push(b.snapshots[i].size_ledger.identity_groups[0]));
    rejects(b => b.snapshots[i].size_ledger.identity_groups[0].entry_refs[0].scope_id = 'absent');
    rejects(b => b.snapshots[i].size_ledger.identity_groups[0].entry_refs[1] = b.snapshots[i].size_ledger.identity_groups[0].entry_refs[0]);
    rejects(b => b.snapshots[i].size_ledger.unknown_identity_entries.push({finding_id:'entry-1', scope_id:'scope-1'}));
  }
  assert.equal(model.formatLedgerBytes(null), 'Unknown');
  for (const v of ['0', '9007199254740993', '18446744073709551615', '36893488147419103230', '340282366920938463463374607431768211455']) assert.equal(model.formatLedgerBytes(v), v + ' B');
  for (const v of [0, 0n, undefined, '', '-1', '+1', '01', '1.0', '1e3', ' 1', '1\n', '340282366920938463463374607431768211456', '9'.repeat(100)]) assert.throws(() => model.formatLedgerBytes(v), error);
  assert.equal(source.snapshots[16].size_ledger.observed_file_logical_bytes, '36893488147419103230');
  assert.equal(source.snapshots[14].size_ledger.identity_groups[0].state, 'conflicting');
  assert.equal(source.snapshots[15].size_ledger.identity_groups[0].state, 'conflicting');
});
