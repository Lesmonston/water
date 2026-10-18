import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as model from '../model.mjs';
import * as reader from '../../report-reader/model.mjs';

const source = JSON.parse(readFileSync(new URL('../../../contracts/scan-review-v1/bundle.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(source);
const fixed = { name: 'Error', message: 'Unsupported scan review.' };
function invalid(edit) { const b = clone(); edit(b); assert.throws(() => model.assertReviewBundle(b), fixed, 'T_BEHAVIOR: reject inconsistent or extra fields'); }
function qedit(b, edit) { const s = b.snapshots[1], q = JSON.parse(s.redacted_json); edit(q); s.redacted_json = JSON.stringify(q); }
function freeze(value) { if (value && typeof value === 'object') { for (const v of Object.values(value)) freeze(v); Object.freeze(value); } return value; }

test('review_bundle_validation', () => {
  const b = freeze(clone()), before = JSON.stringify(b);
  assert.strictEqual(model.assertReviewBundle(b), b, 'T_BEHAVIOR: successful validation preserves identity');
  assert.equal(JSON.stringify(b), before);
  for (const s of b.snapshots) assert.strictEqual(model.assertReviewBundle({bundle_version:b.bundle_version,snapshots:[s]}).snapshots[0], s);
  for (const value of [undefined, null, [], {}, {bundle_version:b.bundle_version,snapshots:[]}]) assert.throws(() => model.assertReviewBundle(value), fixed, 'T_BEHAVIOR: reject malformed bundle');
  for (const edit of [
    x => { x.extra = true; }, x => { x.bundle_version = 'future'; }, x => { x.snapshots = Array(33).fill(x.snapshots[0]); },
    x => { x.snapshots[1].view.scan_id = x.snapshots[0].view.scan_id; }, x => { x.snapshots[0].source_kind = 'real_user'; },
    x => { x.snapshots[0].extra = 'path'; }, x => { delete x.snapshots[0].summary; },
    x => { x.snapshots[0].view.read_only = false; }, x => { x.snapshots[0].view.findings[0].size.logical_bytes = '18446744073709551616'; },
    x => { x.snapshots[0].summary.counts.findings++; }, x => { x.snapshots[0].summary.risk_counts.review--; },
    x => { x.snapshots[0].summary.category_counts.build_cache--; }, x => { x.snapshots[0].summary.extra = 0; },
    x => { x.snapshots[0].summary.counts.extra = 0; }, x => { x.snapshots[0].summary.status = 'partial'; },
    x => { x.snapshots[0].summary.totals.logical_bytes = '0'; }, x => { x.snapshots[0].summary.read_only = false; },
    x => { x.snapshots[0].redacted_json += ' '; }, x => { x.snapshots[0].redacted_json = '{'; },
    x => { x.snapshots[0].redacted_json = x.snapshots[0].redacted_json.replace('{', '{"export_version":"duplicate",'); },
    x => { x.snapshots[0].redacted_json = x.snapshots[0].redacted_json.replace('water.scan.v1', 'water.scan.v\\u0031'); },
    x => qedit(x, q => { q.extra = 'leak'; }), x => qedit(x, q => { q.anonymity_guaranteed = true; }),
    x => qedit(x, q => { q.redaction_profile = 'raw'; }), x => qedit(x, q => { q.read_only = false; }),
    x => qedit(x, q => { q.summary.totals.logical_bytes = '0'; }), x => qedit(x, q => { q.summary.risk_counts.low++; }),
    x => qedit(x, q => { q.scopes[0].path = 'secret'; }), x => qedit(x, q => { q.scopes[0].scope_ref = 'scope-2'; }),
    x => qedit(x, q => { q.scopes.reverse(); }), x => qedit(x, q => { q.findings[0].finding_ref = 'original-id'; }),
    x => qedit(x, q => { q.findings[0].scope_ref = 'scope-2'; }), x => qedit(x, q => { q.findings[0].has_tool = !q.findings[0].has_tool; }),
    x => qedit(x, q => { q.findings[0].evidence[0].summary = 'leak'; }), x => qedit(x, q => { q.findings[0].evidence[0].code = 'unknown'; }),
    x => qedit(x, q => { q.findings[0].references.project_count++; }), x => qedit(x, q => { q.findings[0].size.logical_bytes = '0'; }),
    x => qedit(x, q => { q.findings[0].protection_reasons.push('user_pinned'); }), x => qedit(x, q => { q.findings[0].activity = 'running'; }),
    x => qedit(x, q => { q.issues[0].message = 'leak'; }), x => qedit(x, q => { q.issues[0].scope_ref = 'scope-99'; }),
    x => { x.snapshots[0].redacted_json = ' '.repeat(16777217); },
  ]) invalid(edit);
  assert.equal(JSON.stringify(b), before, 'T_BEHAVIOR: all source bytes preserved');
});

test('review_selection_and_privacy', () => {
  const b = freeze(clone()), before = JSON.stringify(b);
  assert.deepEqual(Object.keys(model).sort(), ['assertReviewBundle','selectSnapshot','exportText','selectFindings','formatBytes'].sort());
  assert.strictEqual(model.selectFindings, reader.selectFindings); assert.strictEqual(model.formatBytes, reader.formatBytes);
  for (const s of b.snapshots) {
    assert.strictEqual(model.selectSnapshot(b, s.view.scan_id), s, 'T_BEHAVIOR: select actual current snapshot');
    for (const filters of [{}, {query:'<'}, {risk:'protected'}, {sort:'size_asc'}, {sort:'name_asc'}]) {
      assert.deepEqual(model.selectFindings(s.view, filters), reader.selectFindings(s.view, filters));
      assert.equal(model.exportText(b, s.view.scan_id), s.redacted_json, 'T_BEHAVIOR: filters preserve full Q export');
    }
  }
  assert.equal(model.selectSnapshot(b, 'missing'), null);
  assert.throws(() => model.exportText(b, 'missing'), fixed);
  const renamed = clone(); renamed.snapshots[0].view.scan_id = 'caller-renamed';
  assert.strictEqual(model.selectSnapshot(renamed, 'caller-renamed'), renamed.snapshots[0]);
  assert.equal(model.exportText(renamed, 'caller-renamed'), b.snapshots[0].redacted_json);
  for (const fn of [model.selectSnapshot, model.exportText]) {
    const bad = clone(); bad.snapshots.at(-1).summary.counts.issues++;
    assert.throws(() => fn(bad, bad.snapshots[0].view.scan_id), fixed, 'T_BEHAVIOR: validate entire bundle before selection');
  }
  assert.equal(model.formatBytes(null), '未知', 'T_UNKNOWN_PRESERVED: I format preserves null');
  assert.equal(model.formatBytes('18446744073709551615'), reader.formatBytes('18446744073709551615'));
  assert.equal(JSON.stringify(b), before);
});

test('review_export_bytes', () => {
  const b = freeze(clone());
  for (const s of b.snapshots) {
    const output = model.exportText(b, s.view.scan_id);
    assert.equal(output, s.redacted_json, 'T_BEHAVIOR T_REDACTED_ONLY: return original complete Q text');
    assert.deepEqual(Buffer.from(output), Buffer.from(s.redacted_json));
    const q = JSON.parse(output);
    assert.equal(JSON.stringify(q), output);
    assert.deepEqual(q.summary, s.summary); assert.equal(q.anonymity_guaranteed, false);
    for (const token of ['H_SCAN_CANARY', 'H_SCOPE_CANARY', 'H_FINDING_CANARY', 'CANARY', 'Fictional fixture', 'project/.cache/ruff']) assert(!output.includes(token));
  }
  assert.equal(JSON.parse(model.exportText(b, b.snapshots[8].view.scan_id)).summary.totals.logical_bytes, '18446744073709551615');
  assert.equal(JSON.parse(model.exportText(b, b.snapshots[9].view.scan_id)).summary.totals.logical_bytes, null, 'T_UNKNOWN_PRESERVED: no null to zero');
  const reordered = clone(); reordered.snapshots.reverse();
  for (const s of reordered.snapshots) assert.equal(model.exportText(reordered, s.view.scan_id), s.redacted_json, 'T_SELECTED_EXPORT: ID lookup independent of position');
  invalid(x => { x.snapshots[1].redacted_json = x.snapshots[0].redacted_json; });
});
