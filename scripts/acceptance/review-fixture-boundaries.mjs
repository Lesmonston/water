// Controller-only in-memory checks; never materializes a fixture or changes a worker.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--expected-head');
const expected = process.argv[3]; assert.match(expected, /^[a-f0-9]{40}$/);
const task = JSON.parse(readFileSync(join(root, 'docs/dispatch/wave1/manifest.json'), 'utf8')).tasks.find((t) => t.id === 'WATER-W1-D');
const worker = resolve(task.worktree);
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
const git = (args) => {
  const r = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args], { cwd: worker, env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000 });
  assert.equal(r.status, 0); return r.stdout.trim();
};
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
const before = snapshot(); assert.equal(before.head, expected); assert.equal(before.status, '');
assert.equal(git(['branch', '--show-current']), task.branch);
git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
const changed = git(['diff', '--no-renames', '--name-only', task.baseCommit, 'HEAD']).split(/\r?\n/).filter(Boolean);
assert(changed.every((p) => task.allowedFiles.includes(p) || task.allowedPrefixes.some((prefix) => p.startsWith(prefix))));
const frozen = JSON.parse(readFileSync(join(root, task.contractLock), 'utf8'));
for (const f of frozen.files) assert.equal(sha(join(worker, f.path)), f.sha256);
const product = join(worker, 'tools/fs-fixture-kit/materialize.mjs');
const productHash = sha(product);
const { validateFixtureManifest } = await import(pathToFileURL(product));
const base = JSON.parse(readFileSync(join(worker, 'contracts/fixture-lab-v1/cases.json'), 'utf8'));
assert.deepEqual(validateFixtureManifest(base), { valid: true, errors: [] });
const arrays = ['/cases', '/cases/0/nodes', '/cases/0/scopes', '/cases/0/canaries', '/cases/0/scanner_plan/faults', '/cases/0/scanner_plan/expected_issue_codes'];
const at = (value, pointer) => pointer.slice(1).split('/').reduce((v, key) => v[key], value);
const checks = [];
for (const pointer of arrays) {
  for (const key of ['4294967295', '9007199254740992', '999999999999999999999999999999']) {
    const value = structuredClone(base), array = at(value, pointer);
    const length = array.length;
    Object.defineProperty(array, key, { value: 'CONTROLLER_UNKNOWN_ARRAY_DATA', enumerable: true, configurable: true });
    assert.equal(array.length, length, 'A non-index property must not change array length');
    const result = validateFixtureManifest(value);
    checks.push({ pointer, key, kind: 'non_index_data_property', expected: { code: 'shape', path: pointer }, actual: result,
      passed: result.valid === false && result.errors.some((e) => e.code === 'shape' && e.path === pointer) });
  }
}
let calls = 0;
const getterInput = structuredClone(base);
Object.defineProperty(getterInput.cases[0].nodes, '4294967295', { get() { calls++; return null; }, enumerable: true });
const getterResult = validateFixtureManifest(getterInput);
checks.push({ kind: 'unknown_accessor_not_invoked', actual: getterResult, calls, passed: calls === 0 && getterResult.valid === false });
const after = snapshot(); assert.deepEqual(after, before); assert.equal(sha(product), productHash);
let output = root;
for (const part of ['docs', 'acceptance', 'wave1', 'controller', 'w1-ad-handoff-20261017']) {
  output = join(output, part); if (!existsSync(output)) mkdirSync(output);
  assert(lstatSync(output).isDirectory() && !lstatSync(output).isSymbolicLink());
  const rel = relative(realpathSync(root), realpathSync(output)); assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
}
const failed = checks.filter((c) => !c.passed).length;
const record = { task: task.id, checkedAt: new Date().toISOString(), before, after, changedFiles: changed.length,
  frozenFiles: frozen.files.length, productSha256: productHash, checks, failed, status: failed ? 'changes_requested' : 'passed', materializationExecuted: false };
const receipt = join(output, new Date().toISOString().replaceAll(':', '-') + '-fixture-boundary-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt, status: record.status, checks: checks.length, failed }, null, 2));
if (failed) process.exitCode = 1;
