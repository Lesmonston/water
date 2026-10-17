// Controller-owned D gate and synthetic capability probe. Policy checks, not an OS sandbox.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, linkSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFixtureAssets } from './verify-fixture-assets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const preflight = args.length === 1 && args[0] === '--preflight';
const finalGate = !preflight && args[4] === '--final', mode = preflight ? 'probe' : args[3];
if (!preflight) {
  assert.equal(args[0], '--task'); assert.equal(args[1], 'WATER-W1-D'); assert.equal(args[2], '--mode');
  assert(args.length === (finalGate ? 5 : 4) && ['baseline', 'probe', 'check', 'test'].includes(mode));
  assert(!finalGate || ['check', 'test'].includes(mode));
}
assert.equal(realpathSync(root).toLowerCase(), realpathSync(process.cwd()).toLowerCase());
assert.equal(Number(process.versions.node.split('.')[0]), 24);
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
const run = (argv, timeout = 30000, binary = process.execPath) => {
  const result = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode: result.status, error: result.error?.code ?? null };
};
const git = (argv) => { const result = run(['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv], 30000, 'git'); assert.equal(result.exitCode, 0); return result.stdout.trim(); };
const controllerRoot = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
const inside = relative(realpathSync(controllerRoot), realpathSync(root)); assert(!inside.startsWith('..') && !isAbsolute(inside));
const task = preflight ? null : JSON.parse(readFileSync(join(controllerRoot, 'docs/dispatch/wave1/manifest.json'), 'utf8')).tasks.find((entry) => entry.id === 'WATER-W1-D');
if (!preflight) { assert(task); assert.equal(realpathSync(task.worktree).toLowerCase(), realpathSync(root).toLowerCase()); }
function audit() {
  if (preflight) return;
  assert.equal(git(['branch', '--show-current']), task.branch); git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  const lock = JSON.parse(readFileSync(join(controllerRoot, task.contractLock), 'utf8'));
  for (const file of lock.files) assert.equal(createHash('sha256').update(readFileSync(join(root, file.path))).digest('hex'), file.sha256, 'Frozen file changed: ' + file.path);
  const paths = [git(['diff', '--no-renames', '--name-only', '-z', task.baseCommit, 'HEAD']),
    git(['diff', '--no-renames', '--name-only', '-z', 'HEAD']), git(['ls-files', '--others', '--exclude-standard', '-z'])]
    .flatMap((value) => value.split('\0').filter(Boolean));
  assert(paths.every((path) => task.allowedFiles.includes(path) || task.allowedPrefixes.some((prefix) => path.startsWith(prefix))), 'Out-of-scope file change');
}
function local(parts) {
  let path = root;
  for (const part of parts.split('/')) {
    assert(part && part !== '.' && part !== '..'); path = join(path, part);
    if (!existsSync(path)) mkdirSync(path);
    assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink());
    const rel = relative(realpathSync(root), realpathSync(path)); assert(!rel.startsWith('..') && !isAbsolute(rel));
  }
  return path;
}
audit();
const before = { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) };
if (!preflight && mode === 'baseline') { assert.equal(before.head, task.baseCommit); assert.equal(before.status, ''); assert(!existsSync(join(root, task.outputRoot))); }
if (finalGate) assert.equal(before.status, '');
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const logs = local('.local/checks/' + (preflight ? 'fixture-preflight' : 'WATER-W1-D'));
const record = { task: preflight ? null : task.id, mode, finalGate, startedAt: new Date().toISOString(), before, node: process.version, platform: process.platform, commands: [], productTestsRun: false };
let fault;
try {
  record.assets = verifyFixtureAssets(root);
  if (mode === 'probe') {
    const base = local('.local/fixture-probe'), directory = join(base, 'run-' + randomUUID()); mkdirSync(directory);
    const payload = join(directory, 'payload.txt'), target = join(directory, 'target');
    writeFileSync(payload, 'WATER_SYNTHETIC_PROBE\n', { flag: 'wx' }); mkdirSync(target);
    writeFileSync(join(target, 'canary.txt'), 'OWNED_SYNTHETIC_CANARY\n', { flag: 'wx' });
    record.probeRoot = directory; record.capabilities = {};
    for (const kind of ['hardlink', 'symlink_dir', 'junction_dir']) {
      if (kind === 'junction_dir' && process.platform !== 'win32') { record.capabilities[kind] = { status: 'unsupported', error_code: 'PLATFORM_UNSUPPORTED' }; continue; }
      try {
        const path = join(directory, kind);
        if (kind === 'hardlink') {
          linkSync(payload, path); const a = statSync(payload, { bigint: true }), b = statSync(path, { bigint: true });
          assert(a.nlink >= 2n && a.dev === b.dev && a.ino === b.ino); assert(readFileSync(payload).equals(readFileSync(path)));
          record.capabilities[kind] = { status: 'supported', error_code: null, nlink: a.nlink.toString(), identity_nonzero: a.ino !== 0n };
        } else {
          symlinkSync(target, path, kind === 'junction_dir' ? 'junction' : 'dir');
          assert(lstatSync(path).isSymbolicLink()); assert.equal(realpathSync(path).toLowerCase(), realpathSync(target).toLowerCase());
          record.capabilities[kind] = { status: 'supported', error_code: null };
        }
      } catch (error) {
        if (!['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP'].includes(error.code)) throw error;
        record.capabilities[kind] = { status: 'unsupported', error_code: error.code };
      }
    }
  } else if (mode !== 'baseline') {
    const jobs = mode === 'check' ? task.syntaxFiles.map((file) => ['--check', file]) :
      [['--test', '--test-concurrency=1', '--test-reporter=tap', task.testFile]];
    record.focusedTestsAttempted = mode === 'test';
    if (mode === 'test') record.productTestsRun = true;
    for (let i = 0; i < jobs.length; i++) {
      const result = run(jobs[i], mode === 'test' ? 60000 : 30000), name = stamp + '-' + mode + '-' + i + '.log';
      writeFileSync(join(logs, name), JSON.stringify({ argv: jobs[i], exitCode: result.exitCode, error: result.error }) + '\n--- stdout ---\n' + result.stdout + '\n--- stderr ---\n' + result.stderr, { flag: 'wx' });
      record.commands.push({ argv: jobs[i], exitCode: result.exitCode, log: name });
      if (result.exitCode !== 0 || result.error) { process.stderr.write(result.stdout + result.stderr); throw new Error('Focused command failed'); }
      if (mode === 'test') {
        assert.deepEqual([...result.stdout.matchAll(/^# Subtest: (.+)\r?$/gm)].map((match) => match[1].trim()).sort(), [...task.expectedTests].sort());
        for (const [key, count] of [['tests', 5], ['pass', 5], ['fail', 0], ['skipped', 0], ['cancelled', 0], ['todo', 0]])
          assert(new RegExp('^# ' + key + ' ' + count + '\\r?$', 'm').test(result.stdout), 'Unexpected TAP count: ' + key);
      }
    }
  }
} catch (error) { fault = error; }
try {
  audit(); record.after = { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) };
  assert.equal(record.after.head, before.head); if (finalGate) assert.equal(record.after.status, '');
} catch (error) { fault = fault ? new Error(fault.message + '; post-check: ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
const receipt = join(logs, stamp + '-' + mode + '-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...record, receipt }, null, 2)); if (fault) process.exitCode = 1;
