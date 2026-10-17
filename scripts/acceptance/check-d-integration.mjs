// Controller-only D integration gate; synthetic fixture runs stay in this worktree's .local.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--expected-head');
const expected = process.argv[3]; assert.match(expected, /^[a-f0-9]{40}$/);
assert.equal(Number(process.versions.node.split('.')[0]), 24);
assert.equal(realpathSync(root).toLowerCase(), realpathSync(process.cwd()).toLowerCase());
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
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
const output = local('.local/checks/controller-d-integration');
const record = { startedAt: new Date().toISOString(), expectedHead: expected, root, node: process.version, platform: process.platform,
  commands: [], independentBoundaries: [], scannerExecuted: false, cleanupExecuted: false };
function command(binary, argv, timeout = 30000) {
  const r = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 });
  const log = stamp + '-' + record.commands.length + '.log';
  const entry = { binary, argv, exitCode: r.status, error: r.error?.code ?? null, log }; record.commands.push(entry);
  writeFileSync(join(output, log), JSON.stringify(entry) + '\n--- stdout ---\n' + (r.stdout ?? '') + '\n--- stderr ---\n' + (r.stderr ?? ''), { flag: 'wx' });
  assert(!r.error && r.status === 0, 'Focused command failed: ' + argv.join(' '));
  return r.stdout.trim();
}
const git = (argv) => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv]);
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
const readJSON = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
let fault;
try {
  const controller = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  assert.equal(relative(realpathSync(controller), realpathSync(root)).replaceAll('\\', '/'), '.worktrees/integration-d-20261017');
  assert.equal(git(['branch', '--show-current']), 'controller/water-w1-d-20261017');
  record.before = snapshot(); assert.equal(record.before.head, expected); assert.equal(record.before.status, '');
  const manifest = readJSON('docs/dispatch/wave1/manifest.json'), task = manifest.tasks.find((t) => t.id === 'WATER-W1-D');
  assert.equal(task.status, 'ACCEPTED'); assert(task.acceptedCommit); git(['merge-base', '--is-ancestor', task.acceptedCommit, 'HEAD']);
  const acceptedTree = git(['rev-parse', task.acceptedCommit + ':' + task.outputRoot]);
  assert.equal(git(['rev-parse', 'HEAD:' + task.outputRoot]), acceptedTree);
  record.acceptedProduct = { commit: task.acceptedCommit, path: task.outputRoot, tree: acceptedTree };
  record.preservedProducts = [];
  for (const [id, path] of [['WATER-W1-A', 'crates/water-contracts'], ['WATER-W1-B', 'packages/tool-catalog'], ['WATER-W1-C', 'prototypes/readonly-dashboard']]) {
    const accepted = manifest.tasks.find((t) => t.id === id).acceptedCommit;
    const tree = git(['rev-parse', 'HEAD:' + path]); assert.equal(tree, git(['rev-parse', accepted + ':' + path]));
    record.preservedProducts.push({ id, path, tree });
  }
  const frozen = new Map();
  for (const path of ['contracts/v1/freeze.lock.json', 'contracts/parallel-v1/freeze.lock.json', 'contracts/fixture-lab-v1/freeze.lock.json', 'contracts/report-view-v1/freeze.lock.json']) {
    for (const f of readJSON(path).files) { assert.equal(sha(join(root, f.path)), f.sha256, f.path); frozen.set(f.path, f.sha256); }
  }
  record.frozenFiles = frozen.size;
  for (const path of task.syntaxFiles) command(process.execPath, ['--check', path]);
  const lab = join(root, '.local/fixture-lab');
  const beforeRuns = existsSync(lab) ? readdirSync(lab) : [];
  const tap = command(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', task.testFile], 60000);
  assert.deepEqual([...tap.matchAll(/^# Subtest: (.+)\r?$/gm)].map((m) => m[1].trim()).sort(), [...task.expectedTests].sort());
  for (const [key, value] of [['tests', 5], ['pass', 5], ['fail', 0], ['skipped', 0], ['cancelled', 0], ['todo', 0]]) assert(new RegExp('^# ' + key + ' ' + value + '\\r?$', 'm').test(tap));
  record.executedTests = 5;
  const afterRuns = readdirSync(lab); assert(beforeRuns.every((r) => afterRuns.includes(r)), 'A prior run was removed');
  record.newRuns = afterRuns.filter((r) => !beforeRuns.includes(r)); assert(record.newRuns.length <= 24);
  record.capabilities = readJSON('.local/checks/WATER-W1-D/capabilities.json');
  const { validateFixtureManifest } = await import(pathToFileURL(join(root, 'tools/fs-fixture-kit/materialize.mjs')));
  const base = readJSON('contracts/fixture-lab-v1/cases.json'); assert.deepEqual(validateFixtureManifest(base), { valid: true, errors: [] });
  const pointers = ['/cases', '/cases/0/nodes', '/cases/0/scopes', '/cases/0/canaries', '/cases/0/scanner_plan/faults', '/cases/0/scanner_plan/expected_issue_codes'];
  for (const pointer of pointers) for (const key of ['4294967295', '9007199254740992', '999999999999999999999999999999']) {
    const value = structuredClone(base), array = pointer.slice(1).split('/').reduce((v, k) => v[k], value);
    Object.defineProperty(array, key, { value: 'CONTROLLER_UNKNOWN_ARRAY_DATA', enumerable: true });
    const result = validateFixtureManifest(value);
    assert.equal(result.valid, false); assert(result.errors.some((e) => e.code === 'shape' && e.path === pointer));
    assert(!JSON.stringify(result.errors).includes(key));
    record.independentBoundaries.push({ pointer, key, passed: true });
  }
  let calls = 0; const getter = structuredClone(base);
  Object.defineProperty(getter.cases[0].nodes, '4294967295', { get() { calls++; return null; }, enumerable: true });
  assert.equal(validateFixtureManifest(getter).valid, false); assert.equal(calls, 0);
  record.independentBoundaries.push({ id: 'getter_not_invoked', passed: true, calls });
  command(process.execPath, ['scripts/verify-fixture-assets.mjs']);
} catch (error) { fault = error; }
try { record.after = snapshot(); assert.deepEqual(record.after, record.before); }
catch (error) { fault = fault ? new Error(fault.message + '; ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
const receipt = join(output, stamp + '-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: record.status, receipt, error: record.error, head: expected }, null, 2));
if (fault) process.exitCode = 1;
