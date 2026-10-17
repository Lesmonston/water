// Controller-only independent checks against the submitted E library.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--expected-head');
const expected = process.argv[3]; assert.match(expected, /^[a-f0-9]{40}$/);
const task = JSON.parse(readFileSync(join(root, 'docs/dispatch/wave1/manifest.json'), 'utf8')).tasks.find((t) => t.id === 'WATER-W1-E');
const worker = resolve(task.worktree), stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0' }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
const record = { task: task.id, expectedHead: expected, startedAt: new Date().toISOString(), commands: [], finalGates: [] };
function directory(parts) {
  let path = root;
  for (const part of parts.split('/')) {
    assert(part && !['.', '..'].includes(part)); path = join(path, part);
    if (!existsSync(path)) mkdirSync(path);
    assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink());
    const rel = relative(realpathSync(root), realpathSync(path)); assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
  }
  return path;
}
const output = directory('docs/acceptance/wave1/controller/w1-e-review-20261017');
const local = directory('.local/controller/e-view-' + stamp); Object.assign(env, { TEMP: local, TMP: local, TMPDIR: local });
function command(binary, argv, cwd = root, timeout = 30000) {
  const r = spawnSync(binary, argv, { cwd, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 });
  const log = stamp + '-' + record.commands.length + '.log';
  const entry = { binary, argv, cwd, exitCode: r.status, error: r.error?.code ?? null, log }; record.commands.push(entry);
  writeFileSync(join(output, log), JSON.stringify(entry) + '\n--- stdout ---\n' + (r.stdout ?? '') + '\n--- stderr ---\n' + (r.stderr ?? ''), { flag: 'wx' });
  assert(!r.error && r.status === 0, 'Independent command failed: ' + argv.join(' ')); return r.stdout.trim();
}
const git = (argv) => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv], worker);
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
let fault;
try {
  record.before = snapshot(); assert.equal(record.before.head, expected); assert.equal(record.before.status, '');
  assert.equal(git(['branch', '--show-current']), task.branch); git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  const changed = git(['diff', '--name-only', task.baseCommit, 'HEAD']).split(/\r?\n/).filter(Boolean);
  assert(changed.every((p) => task.allowedFiles.includes(p) || task.allowedPrefixes.some((prefix) => p.startsWith(prefix))));
  record.changedFiles = changed.length;
  const lock = JSON.parse(readFileSync(join(root, task.contractLock), 'utf8'));
  for (const f of lock.files) assert.equal(sha(join(worker, f.path)), f.sha256); record.frozenFiles = lock.files.length;
  record.products = changed.filter((p) => p.startsWith('packages/report-view/')).map((path) => ({ path, sha256: sha(join(worker, path)) }));
  const checks = join(worker, '.local/checks/WATER-W1-E');
  const receipts = readdirSync(checks).filter((n) => n.endsWith('-result.json')).map((name) => ({ name, data: JSON.parse(readFileSync(join(checks, name), 'utf8')) }));
  for (const mode of task.expectedFinalModes) {
    const matches = receipts.filter(({ data: d }) => d.mode === mode && d.finalGate && d.status === 'passed' && d.before.head === expected && d.after.head === expected && d.before.status === '' && d.after.status === '').sort((a, b) => a.name.localeCompare(b.name));
    assert(matches.length, 'Missing current passing final gate: ' + mode); const { name, data } = matches.at(-1);
    if (mode === 'test') assert.equal(data.executedTests, 5);
    if (mode === 'bridge') assert(data.bridge.actualRustProjection && data.bridge.cModelUsed && data.bridge.assertions === 9);
    record.finalGates.push({ mode, receipt: name, status: data.status });
    const prefix = name.slice(0, -'-result.json'.length);
    for (const item of readdirSync(checks).filter((n) => n === name || (n.startsWith(prefix + '-') && n.endsWith('.log')))) {
      const dest = join(output, item), source = join(checks, item);
      if (existsSync(dest)) assert.equal(sha(dest), sha(source)); else writeFileSync(dest, readFileSync(source), { flag: 'wx' });
    }
  }
  const rustc = command(join(homedir(), '.cargo/bin/rustup.exe'), ['which', 'rustc', '--toolchain', '1.95.0']);
  const deps = join(worker, '.local/report-view-target/debug/deps');
  const externs = ['water_report_view', 'water_contracts', 'serde_json'].flatMap((name) => {
    const files = readdirSync(deps).filter((p) => p.startsWith('lib' + name + '-') && p.endsWith('.rlib')); assert.equal(files.length, 1);
    const path = join(deps, files[0]); (record.linkedArtifacts ??= []).push({ path, sha256: sha(path) }); return ['--extern', name + '=' + path];
  });
  const binary = join(local, 'view-boundaries.exe');
  command(rustc, ['--edition=2024', '--crate-name', 'controller_view_boundaries', '--test', join(root, 'scripts/acceptance/report-view-boundaries.rs'), '-L', 'dependency=' + deps, ...externs, '-o', binary], root, 180000);
  const text = command(binary, ['--test-threads=1', '--nocapture']);
  assert(/4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(text)); record.independentTests = 4;
} catch (error) { fault = error; }
try { record.after = snapshot(); assert.deepEqual(record.after, record.before); for (const p of record.products ?? []) assert.equal(sha(join(worker, p.path)), p.sha256); }
catch (error) { fault = fault ? new Error(fault.message + '; ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
const receipt = join(output, stamp + '-result.json'); writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: record.status, independentTests: record.independentTests, receipt, error: record.error }, null, 2));
if (fault) process.exitCode = 1;
