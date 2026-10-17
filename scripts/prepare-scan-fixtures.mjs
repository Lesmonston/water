// Controller-owned creation of bounded synthetic inputs; never scans or cleans user data.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeCase } from '../tools/fs-fixture-kit/materialize.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const marker = '.water-fixture-run.json';
const allowedUnsupported = new Set(['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP']);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function validRunId(value) {
  return typeof value === 'string' && value.startsWith('run-') && value.length >= 5 && value.length <= 52
    && /^[a-z0-9]$/.test(value[4]) && [...value.slice(5)].every((c) => /^[a-z0-9-]$/.test(c));
}
function local(parts) {
  let path = root;
  for (const part of parts.split('/')) {
    assert(part && !['.', '..'].includes(part)); path = join(path, part);
    if (!existsSync(path)) mkdirSync(path);
    assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink());
    const rel = relative(realpathSync(root), realpathSync(path)); assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
  }
  return path;
}
function snapshotFile(path, runRoot) {
  const rel = relative(runRoot, path); assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
  let current = runRoot;
  for (const part of rel.split(/[\\/]/).slice(0, -1)) {
    current = join(current, part); assert(lstatSync(current).isDirectory() && !lstatSync(current).isSymbolicLink());
  }
  const stat = lstatSync(path); assert(stat.isFile() && !stat.isSymbolicLink());
  const inside = relative(realpathSync(runRoot), realpathSync(path)); assert(inside && !inside.startsWith('..') && !isAbsolute(inside));
  return { path, run_root: runRoot, sha256: sha(readFileSync(path)), bytes: stat.size };
}
function freshRoot(lab) {
  const run_id = 'run-' + randomUUID(), run_root = join(lab, run_id); assert(!existsSync(run_root));
  return { run_id, run_root };
}
function cloneMarker(source, target) {
  const data = structuredClone(source); data.run_id = target.run_id; data.run_root = target.run_root;
  for (const scope of data.scopes) scope.absolute_path = join(target.run_root, ...scope.path.split('/'));
  return data;
}
export async function prepareScanFixtures() {
  assert.equal(realpathSync(process.cwd()).toLowerCase(), realpathSync(root).toLowerCase());
  const output = local('.local/checks/WATER-W1-F'), lab = local('.local/fixture-lab');
  const active = join(output, 'active-fixtures.json');
  if (existsSync(active)) {
    assert(lstatSync(active).isFile() && !lstatSync(active).isSymbolicLink());
    assert.equal(JSON.parse(readFileSync(active, 'utf8')).index_version, 'water.scan-lab-fixtures.v1');
  }
  const definitions = JSON.parse(readFileSync(join(root, 'contracts/fixture-lab-v1/cases.json'), 'utf8'));
  const index = { index_version: 'water.scan-lab-fixtures.v1', createdAt: new Date().toISOString(), worktree: root, runs: [], negative: [], snapshots: [] };
  let bytes = 0;
  for (const definition of definitions.cases) {
    const result = await materializeCase(definition.case_id);
    index.runs.push(result);
    for (const node of definition.nodes) if (node.kind === 'file') {
      const snapshot = snapshotFile(join(result.run_root, ...node.path.split('/')), result.run_root);
      index.snapshots.push(snapshot); bytes += snapshot.bytes;
    }
  }
  const source = index.runs.find((r) => r.case_id === 'scope-prefix');
  for (const id of ['traversal_marker', 'duplicate_marker', 'oversized_marker', 'missing_marker']) {
    const item = freshRoot(lab); mkdirSync(item.run_root); let data = cloneMarker(source, item), text;
    if (id === 'traversal_marker') data.scopes[0].path = '../escape';
    if (id === 'oversized_marker') text = ' '.repeat(65537);
    else if (id !== 'missing_marker') text = JSON.stringify(data);
    if (id === 'duplicate_marker') text = text.replace('"run_id":', '"run_id":' + JSON.stringify(item.run_id) + ',"run_id":');
    if (text !== undefined) writeFileSync(join(item.run_root, marker), text, { flag: 'wx' });
    index.negative.push({ id, ...item, status: 'created', expected: 'InvalidMarker' });
  }
  const linked = freshRoot(lab);
  try { symlinkSync(source.run_root, linked.run_root, 'dir'); index.negative.push({ id: 'linked_run', ...linked, status: 'created', expected: 'UnsafeRoot' }); }
  catch (error) { if (!allowedUnsupported.has(error.code)) throw error; index.negative.push({ id: 'linked_run', ...linked, status: 'unsupported', error_code: error.code }); }
  const ancestor = freshRoot(lab); mkdirSync(ancestor.run_root);
  const target = join(ancestor.run_root, 'outside-target'); mkdirSync(target); mkdirSync(join(target, 'nested'));
  writeFileSync(join(target, 'nested/canary.txt'), 'OWNED_NEGATIVE_CANARY\n', { flag: 'wx' });
  const canary = snapshotFile(join(target, 'nested/canary.txt'), ancestor.run_root);
  bytes += canary.bytes; index.snapshots.push(canary);
  const overlap = index.runs.find((r) => r.case_id === 'overlapping-scopes');
  writeFileSync(join(ancestor.run_root, marker), JSON.stringify(cloneMarker(overlap, ancestor)), { flag: 'wx' });
  try { symlinkSync(target, join(ancestor.run_root, ...overlap.scopes[0].path.split('/')), 'dir'); index.negative.push({ id: 'linked_ancestor', ...ancestor, status: 'created', expected: 'UnsafeRoot' }); }
  catch (error) { if (!allowedUnsupported.has(error.code)) throw error; index.negative.push({ id: 'linked_ancestor', ...ancestor, status: 'unsupported', error_code: error.code }); }
  for (const item of [...index.runs, ...index.negative.filter((n) => n.id !== 'linked_run')]) {
    const path = join(item.run_root, marker);
    if (existsSync(path)) { const snapshot = snapshotFile(path, item.run_root); index.snapshots.push(snapshot); bytes += snapshot.bytes; }
  }
  assert(index.runs.length + index.negative.length <= 24 && bytes <= 1024 * 1024);
  index.content_bytes = bytes;
  const immutable = join(output, 'fixtures-' + randomUUID() + '.json');
  const text = JSON.stringify(index, null, 2) + '\n'; writeFileSync(immutable, text, { flag: 'wx' }); writeFileSync(active, text);
  return { active, immutable, index };
}
export function readActiveFixtures() {
  const path = join(root, '.local/checks/WATER-W1-F/active-fixtures.json');
  assert(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink());
  assert(lstatSync(path).size <= 1024 * 1024);
  const index = JSON.parse(readFileSync(path, 'utf8')); assert.equal(index.index_version, 'water.scan-lab-fixtures.v1');
  assert.equal(realpathSync(index.worktree).toLowerCase(), realpathSync(root).toLowerCase());
  validateIndex(index); return { active: path, index };
}
function validateIndex(index) {
  const definitions = JSON.parse(readFileSync(join(root, 'contracts/fixture-lab-v1/cases.json'), 'utf8'));
  assert.deepEqual(index.runs.map((r) => r.case_id), definitions.cases.map((c) => c.case_id));
  assert.deepEqual(index.negative.map((n) => n.id), ['traversal_marker', 'duplicate_marker', 'oversized_marker', 'missing_marker', 'linked_run', 'linked_ancestor']);
  assert(Array.isArray(index.snapshots) && index.snapshots.length <= 128);
  const lab = local('.local/fixture-lab'), owned = new Set(), expectedSnapshots = new Set();
  assert.equal(new Set([...index.runs, ...index.negative].map((r) => r.run_id)).size, 17);
  for (const run of [...index.runs, ...index.negative]) {
    assert(validRunId(run.run_id)); const expected = join(lab, run.run_id);
    assert.equal(resolve(run.run_root).toLowerCase(), expected.toLowerCase());
    if (run.id === 'linked_run') continue;
    assert(lstatSync(expected).isDirectory() && !lstatSync(expected).isSymbolicLink());
    owned.add(expected.toLowerCase());
  }
  for (let i = 0; i < index.runs.length; i++) {
    const run = index.runs[i], definition = definitions.cases[i];
    assert.deepEqual(run.nodes.map((n) => [n.path, n.kind]), definition.nodes.map((n) => [n.path, n.kind]));
    assert.deepEqual(run.scanner_plan, definition.scanner_plan);
    assert.deepEqual(run.scopes.map((s) => [s.scope_id, s.path]), definition.scopes.map((s) => [s.scope_id, s.path]));
    for (const node of run.nodes) { assert(['created', 'unsupported'].includes(node.status)); if (node.status === 'unsupported') assert(['hardlink', 'symlink_dir', 'junction_dir'].includes(node.kind)); }
    for (const node of definition.nodes.filter((n) => n.kind === 'file')) expectedSnapshots.add(join(run.run_root, ...node.path.split('/')).toLowerCase());
    expectedSnapshots.add(join(run.run_root, marker).toLowerCase());
  }
  for (const item of index.negative.filter((n) => !['missing_marker', 'linked_run'].includes(n.id))) expectedSnapshots.add(join(item.run_root, marker).toLowerCase());
  expectedSnapshots.add(join(index.negative.find((n) => n.id === 'linked_ancestor').run_root, 'outside-target/nested/canary.txt').toLowerCase());
  assert.equal(index.snapshots.length, expectedSnapshots.size);
  assert.deepEqual(new Set(index.snapshots.map((s) => resolve(s.path).toLowerCase())), expectedSnapshots);
  for (const item of index.snapshots) { assert(owned.has(resolve(item.run_root).toLowerCase())); assert(/^[a-f0-9]{64}$/.test(item.sha256)); }
}
export function verifyScanSnapshots(index) {
  validateIndex(index);
  for (const item of index.snapshots) assert.deepEqual(snapshotFile(item.path, item.run_root), item, 'Synthetic content changed');
  return index.snapshots.length;
}
export function verifyNativeFacts(actual, index) {
  const matrix = JSON.parse(readFileSync(join(root, 'contracts/scan-lab-v1/matrix.json'), 'utf8'));
  assert.equal(actual.length, index.runs.length); let entries = 0;
  for (let i = 0; i < actual.length; i++) {
    const facts = actual[i], run = index.runs[i], expected = matrix.cases.find((c) => c.case_id === run.case_id);
    assert.equal(facts.facts_version, matrix.facts_version); assert.equal(facts.run_id, run.run_id); assert.equal(facts.case_id, run.case_id);
    assert.equal(facts.scopes.length, expected.scopes.length); let visited = 0, recorded = 0;
    for (let n = 0; n < facts.scopes.length; n++) {
      const scope = facts.scopes[n], specification = expected.scopes[n];
      assert.deepEqual(Object.keys(scope).sort(), ['coverage', 'entries', 'issues', 'relative_root', 'scope_id', 'visited_entries']);
      const available = specification.native_entries.filter((e) => run.nodes.find((node) => node.path === e.run_relative_path)?.status === 'created');
      assert.equal(scope.scope_id, specification.scope_id); assert.equal(scope.relative_root, specification.relative_root);
      assert.equal(scope.coverage, specification.native_coverage); assert.deepEqual(scope.issues, specification.native_issues);
      assert.deepEqual(scope.entries.map((e) => ({ relative_path: e.relative_path, kind: e.kind, depth: e.depth, logical_bytes: e.logical_bytes })), available.map(({ run_relative_path, ...e }) => e));
      assert.equal(scope.visited_entries, available.length); visited += scope.visited_entries; recorded += scope.entries.length;
      for (const entry of scope.entries) {
        assert.deepEqual(Object.keys(entry).sort(), ['allocated_bytes', 'depth', 'identity', 'kind', 'logical_bytes', 'relative_path']);
        assert.deepEqual(Object.keys(entry.identity).sort(), ['device', 'inode', 'kind', 'link_count']);
        assert.equal(entry.allocated_bytes, null);
        if (process.platform === 'win32' || ['link', 'other'].includes(entry.kind)) assert.deepEqual(entry.identity, { kind: 'unknown', device: null, inode: null, link_count: null });
        else if (entry.identity.kind === 'unix') {
          for (const key of ['device', 'inode', 'link_count']) assert.match(entry.identity[key], /^(0|[1-9][0-9]*)$/);
          assert(BigInt(entry.identity.inode) > 0n && BigInt(entry.identity.link_count) >= 1n);
        } else assert.deepEqual(entry.identity, { kind: 'unknown', device: null, inode: null, link_count: null });
      }
    }
    assert.equal(facts.visited_entries, visited); assert.equal(facts.recorded_entries, recorded);
    assert.equal(facts.status, expected.scopes.some((s) => s.native_coverage === 'partial') ? 'partial' : 'completed'); entries += recorded;
    assert.deepEqual(Object.keys(facts).sort(), ['case_id', 'facts_version', 'recorded_entries', 'run_id', 'scopes', 'status', 'visited_entries']);
  }
  return { cases: actual.length, scopes: actual.reduce((n, f) => n + f.scopes.length, 0), entries };
}
