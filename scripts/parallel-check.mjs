// Controller-owned Node-only focused gate for independent B/C lanes. Not an OS sandbox.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert.equal(args[0], '--task'); assert.equal(args[2], '--mode');
const taskId = args[1], mode = args[3], finalGate = args[4] === '--final';
assert(args.length === (finalGate ? 5 : 4) && ['baseline', 'check', 'test', 'browser'].includes(mode));
assert(!finalGate || mode !== 'baseline');
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
delete env.NODE_OPTIONS; delete env.NODE_PATH;
const run = (binary, argv, timeout = 30000) => {
  const result = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode: result.status, error: result.error?.code ?? null };
};
const git = (argv) => { const result = run('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=NUL', ...argv]); assert.equal(result.exitCode, 0, result.stderr); return result.stdout.trim(); };
const controllerRoot = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
const manifest = JSON.parse(readFileSync(join(controllerRoot, 'docs/dispatch/wave1/manifest.json'), 'utf8'));
const task = manifest.tasks.find((entry) => entry.id === taskId);
assert(task && ['catalog', 'prototype'].includes(task.kind), 'Unknown Node-only lane');
const norm = (path) => realpathSync(path).replaceAll('\\', '/').toLowerCase();
assert.equal(norm(root), norm(task.worktree), 'Wrong assigned worktree');
assert.equal(norm(process.cwd()), norm(root), 'Run from assigned root');
assert(mode !== 'browser' || task.kind === 'prototype');
const freeze = JSON.parse(readFileSync(join(controllerRoot, task.contractLock), 'utf8'));
function audit() {
  assert.equal(git(['branch', '--show-current']), task.branch);
  git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  for (const file of freeze.files) assert.equal(createHash('sha256').update(readFileSync(join(root, file.path))).digest('hex'), file.sha256, 'Frozen file changed: ' + file.path);
  const paths = [git(['diff', '--no-renames', '--name-only', '-z', task.baseCommit, 'HEAD']), git(['diff', '--no-renames', '--name-only', '-z', 'HEAD']), git(['ls-files', '--others', '--exclude-standard', '-z'])].flatMap((list) => list.split('\0').filter(Boolean));
  for (const path of paths) assert(task.allowedFiles.includes(path) || task.allowedPrefixes.some((prefix) => path.startsWith(prefix)), 'Out-of-scope change: ' + path);
}
function localDir() {
  let dir = root;
  for (const part of ['.local', 'checks', taskId]) {
    dir = join(dir, part); if (!existsSync(dir)) mkdirSync(dir);
    assert(lstatSync(dir).isDirectory() && !lstatSync(dir).isSymbolicLink());
    const rel = relative(realpathSync(root), realpathSync(dir)); assert(!rel.startsWith('..') && !isAbsolute(rel));
  }
  return dir;
}
audit();
const before = { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) };
if (mode === 'baseline') { assert.equal(before.head, task.baseCommit); assert.equal(before.status, ''); assert(!existsSync(join(root, task.outputRoot))); }
if (finalGate) assert.equal(before.status, '', 'Final gate requires a clean committed tree');
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use the installed Node 24');
const logDir = localDir(), stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const record = { task: taskId, mode, finalGate, startedAt: new Date().toISOString(), before, node: process.version, commands: [], focusedTestsAttempted: false, integratedProductTested: false };
let fault;
try {
  const jobs = mode === 'baseline' ? [] : mode === 'check' ? task.syntaxFiles.map((path) => ['--check', path]) :
    [['--test', '--test-concurrency=1', '--test-reporter=tap', mode === 'browser' ? task.browserTestFile : task.testFile]];
  for (let index = 0; index < jobs.length; index++) {
    if (mode === 'test' || mode === 'browser') record.focusedTestsAttempted = true;
    const startedAt = new Date().toISOString(), result = run(process.execPath, jobs[index], mode === 'browser' ? 90000 : 30000);
    localDir();
    const log = join(logDir, stamp + '-' + mode + '-' + index + '.log');
    writeFileSync(log, JSON.stringify({ argv: jobs[index], startedAt, endedAt: new Date().toISOString(), exitCode: result.exitCode, error: result.error }) + '\n--- stdout ---\n' + result.stdout + '\n--- stderr ---\n' + result.stderr, { flag: 'wx' });
    record.commands.push({ argv: jobs[index], exitCode: result.exitCode, log });
    if (result.exitCode !== 0 || result.error) { process.stderr.write(result.stdout + result.stderr); throw new Error('Focused command failed'); }
    if (mode === 'test' || mode === 'browser') {
      const expected = mode === 'browser' ? task.expectedBrowserTests : task.expectedTests;
      assert(expected.length > 0);
      const names = [...result.stdout.matchAll(/^# Subtest: (.+)$/gm)].map((match) => match[1].replace(/\r$/, ''));
      assert.deepEqual(names.sort(), [...expected].sort(), 'Test names must match the frozen list');
      for (const [name, value] of [['tests', expected.length], ['pass', expected.length], ['fail', 0], ['cancelled', 0], ['skipped', 0], ['todo', 0]])
        assert(new RegExp('^# ' + name + ' ' + value + '\\r?$', 'm').test(result.stdout), 'Unexpected TAP count: ' + name);
    }
  }
} catch (error) { fault = error; }
try {
  audit(); record.after = { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) };
  assert.equal(record.after.head, before.head, 'HEAD changed during check');
  if (finalGate) assert.equal(record.after.status, '', 'Final gate changed the worktree');
} catch (error) { fault = fault ? new Error(fault.message + '; post-check: ' + error.message) : error; }
Object.assign(record, { status: fault ? 'failed' : 'passed', error: fault?.message ?? null, endedAt: new Date().toISOString() });
const receipt = join(localDir(), stamp + '-' + mode + '-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...record, receipt }, null, 2));
if (fault) process.exitCode = 1;
