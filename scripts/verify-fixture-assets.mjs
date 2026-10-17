// Controller fixture-data verification only; no materializer/scanner implementation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const fixtureCaseIds = ['project-markers', 'mixed-assets', 'scope-prefix', 'overlapping-scopes',
  'unicode-spaces', 'hardlink-pair', 'directory-links', 'depth-budget', 'entry-budget', 'permission-plan', 'cancel-plan'];
const keys = (value, fields) => assert.deepEqual(Object.keys(value).sort(), [...fields].sort());
const pathValid = (value) => typeof value === 'string' && value.length > 0 && [...value].length <= 512 &&
  !/[\\:\x00-\x1f\x7f]/.test(value) && value.split('/').every((part) => part && part !== '.' && part !== '..');
const int = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

export function verifyFixtureAssets(root) {
  const data = JSON.parse(readFileSync(join(root, 'contracts/fixture-lab-v1/cases.json'), 'utf8'));
  keys(data, ['fixture_version', 'cases']); assert.equal(data.fixture_version, 'water.fixture.v1');
  assert.deepEqual(data.cases.map((item) => item.case_id), fixtureCaseIds);
  let nodes = 0, contentBytes = 0;
  for (const item of data.cases) {
    keys(item, ['case_id', 'description', 'nodes', 'scopes', 'canaries', 'scanner_plan']);
    assert(item.description.length > 0 && int(item.nodes.length, 1, 64));
    const map = new Map(); let bytes = 0;
    for (const node of item.nodes) {
      keys(node, ['kind', 'path', 'content', 'target']); assert(pathValid(node.path));
      assert(!map.has(node.path) && node.path !== '.water-fixture-run.json'); map.set(node.path, node);
      assert(['directory', 'file', 'hardlink', 'symlink_dir', 'junction_dir'].includes(node.kind));
      if (node.kind === 'file') { assert.equal(typeof node.content, 'string'); assert.equal(node.target, null); bytes += Buffer.byteLength(node.content); }
      else { assert.equal(node.content, null); if (node.kind === 'directory') assert.equal(node.target, null); else assert(pathValid(node.target)); }
    }
    assert(bytes <= 65536);
    for (const node of item.nodes) {
      const parent = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : '';
      if (parent) assert.equal(map.get(parent)?.kind, 'directory', 'Explicit ordinary parent required');
      if (node.kind === 'hardlink') assert.equal(map.get(node.target)?.kind, 'file');
      if (['symlink_dir', 'junction_dir'].includes(node.kind)) assert.equal(map.get(node.target)?.kind, 'directory');
    }
    assert(item.scopes.length > 0); const ids = new Set();
    for (const scope of item.scopes) {
      keys(scope, ['scope_id', 'path']); assert(/^[a-z][a-z0-9-]{0,47}(?![\s\S])/.test(scope.scope_id)); assert(!ids.has(scope.scope_id)); ids.add(scope.scope_id);
      assert.equal(map.get(scope.path)?.kind, 'directory');
    }
    assert.equal(new Set(item.canaries).size, item.canaries.length);
    for (const path of item.canaries) assert.equal(map.get(path)?.kind, 'file');
    const plan = item.scanner_plan;
    keys(plan, ['max_depth', 'max_entries', 'cancel_after_entries', 'faults', 'expected_issue_codes']);
    assert(int(plan.max_depth, 0, 64) && int(plan.max_entries, 1, 10000));
    assert(plan.cancel_after_entries === null || int(plan.cancel_after_entries, 0, 10000));
    for (const fault of plan.faults) {
      keys(fault, ['operation', 'path', 'code']); assert.equal(fault.operation, 'read_dir'); assert.equal(fault.code, 'permission_denied'); assert.equal(map.get(fault.path)?.kind, 'directory');
    }
    assert.equal(new Set(plan.expected_issue_codes).size, plan.expected_issue_codes.length);
    assert(plan.expected_issue_codes.every((value) => ['depth_limit', 'entry_limit', 'permission_denied', 'cancelled'].includes(value)));
    nodes += item.nodes.length; contentBytes += bytes;
  }
  const negatives = JSON.parse(readFileSync(join(root, 'contracts/fixture-lab-v1/negative-cases.json'), 'utf8'));
  assert.equal(negatives.fixture_version, data.fixture_version); assert.equal(negatives.mutations.length, 18);
  assert(negatives.invalid_run_ids.includes('run-UPPER') && negatives.invalid_run_ids.includes('run-safe\n'));
  assert.equal(new Set(negatives.mutations.map((item) => item.id)).size, 18);
  for (const item of negatives.mutations) { assert(item.operations.length > 0); assert(['shape', 'unsafe_path', 'reference', 'limit'].includes(item.expected.code)); assert(item.expected.path.startsWith('/')); }
  return { status: 'passed', cases: data.cases.length, nodes, contentBytes, negativeCases: 18, productTestsRun: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(verifyFixtureAssets(resolve(dirname(fileURLToPath(import.meta.url)), '..')), null, 2));
