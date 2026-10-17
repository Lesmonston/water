// Controller-owned acceptance runner; checks policy, not an OS sandbox.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const preflight = args.length === 1 && args[0] === '--preflight';
const finalGate = !preflight && args[4] === '--final';
const taskId = preflight ? null : args[1];
const mode = preflight ? 'preflight' : args[3];
const modes = new Set(['baseline', 'lock', 'fetch', 'fmt', 'test', 'clippy', 'metadata']);
if (!preflight) {
  assert.equal(args[0], '--task'); assert.equal(args[2], '--mode');
  assert(args.length === (finalGate ? 5 : 4) && modes.has(mode));
  if (finalGate) assert(['fmt', 'test', 'clippy', 'metadata'].includes(mode));
}
const pathText = (p) => realpathSync(p).replaceAll('\\', '/');
const samePath = (a, b) => process.platform === 'win32'
  ? pathText(a).toLowerCase() === pathText(b).toLowerCase() : pathText(a) === pathText(b);
assert(samePath(process.cwd(), root), 'Run from this script worktree root');
const childEnv = { ...process.env };
for (const key of Object.keys(childEnv)) {
  const upper = key.toUpperCase();
  if (upper.startsWith('CARGO_') || ['RUSTC', 'RUSTDOC', 'RUSTC_WRAPPER', 'RUSTC_WORKSPACE_WRAPPER',
      'RUSTFLAGS', 'RUSTDOCFLAGS', 'CARGO_ENCODED_RUSTFLAGS', 'CARGO_ENCODED_RUSTDOCFLAGS'].includes(upper)) delete childEnv[key];
}
Object.assign(childEnv, { GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0' });
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
let logDir;
let sequence = 0;
function command(binary, argv, { env = childEnv, timeout = 30000, log = false } = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', shell: false, timeout, maxBuffer: 32 * 1024 * 1024 });
  const endedAt = new Date().toISOString();
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  if (log && logDir) writeFileSync(join(logDir, stamp + '-' + mode + '-' + (++sequence) + '.log'),
    JSON.stringify({ binary, argv, cwd: root, startedAt, endedAt, exitCode: result.status, signal: result.signal, error: result.error?.code ?? null }) +
    '\n--- stdout ---\n' + (result.stdout ?? '') + '\n--- stderr ---\n' + (result.stderr ?? ''), { flag: 'wx' });
  if (result.error || result.status !== 0) {
    if (output) process.stderr.write(output);
    throw new Error('Command failed: ' + binary + ' (exit ' + (result.status ?? 'unknown') + ', ' + (result.error?.code ?? result.signal ?? 'no signal') + ')');
  }
  // Machine-readable stdout must never be contaminated by stderr diagnostics.
  return (result.stdout ?? '').trim();
}
const git = (argv) => command('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=NUL', ...argv]);
const commonGit = git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
const controllerRoot = dirname(commonGit);
const scopeRelative = relative(controllerRoot, root);
assert(!scopeRelative.startsWith('..') && !isAbsolute(scopeRelative), 'Worktree must live inside Water');
let manifest, task, frozen;
if (!preflight) {
  manifest = JSON.parse(readFileSync(join(controllerRoot, 'docs/dispatch/wave1/manifest.json'), 'utf8'));
  task = manifest.tasks.find((entry) => entry.id === taskId);
  assert(manifest.wave === 'water-wave1' && task, 'Task absent from the controller manifest');
  assert(samePath(root, task.worktree), 'Wrong assigned worktree');
  frozen = JSON.parse(readFileSync(join(controllerRoot, manifest.contractLock), 'utf8'));
}
function auditAssignment() {
  if (preflight) return;
  assert.equal(git(['branch', '--show-current']), task.branch, 'Wrong assigned branch');
  git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  for (const file of frozen.files) {
    const dest = resolve(root, file.path), rel = relative(root, dest);
    assert(!rel.startsWith('..') && !isAbsolute(rel));
    assert.equal(createHash('sha256').update(readFileSync(dest)).digest('hex'), file.sha256, 'Frozen file changed: ' + file.path);
  }
  const changed = [
    git(['diff', '--no-renames', '--name-only', '-z', task.baseCommit, 'HEAD']),
    git(['diff', '--no-renames', '--name-only', '-z', 'HEAD']),
    git(['ls-files', '--others', '--exclude-standard', '-z']),
  ].flatMap((value) => value.split('\0').filter(Boolean));
  for (const path of changed) assert(task.allowedFiles.includes(path) ||
    task.allowedPrefixes.some((prefix) => path.startsWith(prefix)), 'Out-of-scope change: ' + path);
}
function ensureLocal(relativeDir) {
  let current = root;
  for (const part of relativeDir.split('/')) {
    assert(part && part !== '.' && part !== '..');
    current = join(current, part);
    if (existsSync(current)) {
      const stat = lstatSync(current);
      assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Refusing linked/non-directory local state');
    } else mkdirSync(current);
    const rel = relative(realpathSync(root), realpathSync(current));
    assert(!rel.startsWith('..') && !isAbsolute(rel), 'Local state resolves outside worktree');
  }
  return current;
}
function rejectCargoOverrides() {
  // CARGO_HOME does not prevent Cargo reading .cargo config in cwd/ancestors.
  for (let current = root;; current = dirname(current)) {
    for (const name of ['config', 'config.toml'])
      assert(!existsSync(join(current, '.cargo', name)), 'Unapproved ancestor Cargo configuration: ' + join(current, '.cargo', name));
    if (dirname(current) === current) break;
  }
  for (const name of ['config', 'config.toml'])
    assert(!existsSync(join(root, '.local/cargo-home', name)), 'Unapproved local Cargo configuration');
}
auditAssignment();
if (!preflight && mode === 'baseline') {
  assert.equal(git(['rev-parse', 'HEAD']), task.baseCommit);
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '', 'Initial baseline must be clean');
}
if (!preflight && finalGate) assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '', 'Final gate requires a committed clean tree');
if (!preflight && mode === 'lock') assert.equal(task.allowLockfileGeneration, true);
logDir = ensureLocal('.local/checks/' + (preflight ? 'preflight' : taskId));
const cargoHome = ensureLocal('.local/cargo-home');
const targetDir = ensureLocal('.local/target');
const tempDir = ensureLocal('.local/tmp');
rejectCargoOverrides();
const before = { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) };
const record = { task: taskId, mode, finalGate, startedAt: new Date().toISOString(), before, productTestsRun: false };
let fault;
try {
  const rustup = process.env.WATER_RUSTUP ?? join(homedir(), '.cargo/bin', process.platform === 'win32' ? 'rustup.exe' : 'rustup');
  assert(isAbsolute(rustup) && existsSync(rustup), 'Set WATER_RUSTUP to a trusted installed rustup absolute path');
  const rustc = command(rustup, ['which', 'rustc', '--toolchain', '1.95.0'], { log: true });
  const cargo = command(rustup, ['which', 'cargo', '--toolchain', '1.95.0'], { log: true });
  assert(isAbsolute(rustc) && existsSync(rustc) && isAbsolute(cargo) && existsSync(cargo));
  record.rustVersion = command(rustc, ['--version'], { log: true });
  record.cargoVersion = command(cargo, ['--version'], { log: true });
  assert(record.rustVersion.startsWith('rustc 1.95.0 ') && record.cargoVersion.startsWith('cargo 1.95.0 '));
  const env = { ...childEnv, RUSTUP_TOOLCHAIN: '1.95.0', RUSTC: rustc,
    RUSTDOC: join(dirname(rustc), process.platform === 'win32' ? 'rustdoc.exe' : 'rustdoc'),
    CARGO_HOME: cargoHome, CARGO_TARGET_DIR: targetDir, CARGO_BUILD_JOBS: '1', CARGO_TERM_COLOR: 'never',
    TEMP: tempDir, TMP: tempDir, TMPDIR: tempDir };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  env[pathKey] = dirname(rustc) + (process.platform === 'win32' ? ';' : ':') + (env[pathKey] ?? '');
  if (preflight || mode === 'baseline') {
    const source = join(logDir, stamp + '-toolchain-probe.rs');
    const executable = join(logDir, stamp + (process.platform === 'win32' ? '-toolchain-probe.exe' : '-toolchain-probe'));
    writeFileSync(source, 'fn main() { println!("water-toolchain-probe-ok"); }\n', { flag: 'wx' });
    assert(!existsSync(executable), 'Probe output already exists');
    command(rustc, ['--edition=2024', '--crate-name', 'water_toolchain_probe', source, '-o', executable], { env, log: true });
    record.probeOutput = command(executable, [], { env, log: true });
    assert.equal(record.probeOutput, 'water-toolchain-probe-ok');
    if (!preflight) assert(!existsSync(join(root, 'Cargo.toml')), 'Bootstrap baseline unexpectedly has a workspace');
  } else {
    assert(existsSync(join(root, 'Cargo.toml')), 'Implement the assigned workspace first');
    // Guard against project-level overrides before Cargo reads any manifest.
    for (const path of ['Cargo.toml', 'crates/water-contracts/Cargo.toml']) {
      const text = readFileSync(join(root, path), 'utf8');
      assert(!/\[(?:patch|replace)(?:[.\]])|^\s*(?:git|registry|build|rustc-wrapper|runner)\s*=/mi.test(text), 'Unapproved manifest execution/source override');
    }
    const cargoArgs = {
      lock: ['generate-lockfile'], fetch: ['fetch', '--locked'],
      fmt: ['fmt', '--manifest-path', 'crates/water-contracts/Cargo.toml', '--', '--check'],
      test: ['test', '--locked', '-p', 'water-contracts', '--test', 'contract_v1', '--', '--test-threads=1', '--format', 'pretty'],
      clippy: ['clippy', '--locked', '-p', 'water-contracts', '--all-targets', '--', '-D', 'warnings'],
      metadata: ['metadata', '--locked', '--no-deps', '--format-version', '1'],
    };
    const checkMetadata = () => {
      const data = JSON.parse(command(cargo, ['metadata', '--locked', '--no-deps', '--format-version', '1'], { env, log: true }));
      assert.equal(data.workspace_members.length, 1);
      assert.equal(data.packages.length, 1);
      const pkg = data.packages[0];
      assert.equal(pkg.name, 'water-contracts');
      assert.equal(pkg.edition, '2024');
      assert(['1.95', '1.95.0'].includes(pkg.rust_version));
      assert(Array.isArray(pkg.publish) && pkg.publish.length === 0, 'Package must not be publishable');
      assert(pkg.targets.every((target) => !target.kind.includes('custom-build')), 'Build scripts are not allowed');
      assert.equal(pkg.targets.length, 2, 'Only the library and contract_v1 integration target are allowed');
      assert(pkg.targets.some((target) => target.name === 'water_contracts' && target.kind.includes('lib')));
      assert(pkg.targets.some((target) => target.name === 'contract_v1' && target.kind.includes('test')));
      assert.equal(pkg.dependencies.length, 2);
      for (const dep of pkg.dependencies) {
        assert.equal(dep.source, 'registry+https://github.com/rust-lang/crates.io-index');
        assert.equal(dep.kind, null);
        assert.equal(dep.req, dep.name === 'serde' ? '=1.0.229' : dep.name === 'serde_json' ? '=1.0.151' : 'unapproved');
      }
      const lockText = readFileSync(join(root, 'Cargo.lock'), 'utf8');
      for (const match of lockText.matchAll(/^source\s*=\s*"([^"]+)"/gm))
        assert.equal(match[1], 'registry+https://github.com/rust-lang/crates.io-index', 'Unapproved lockfile dependency source');
    };
    if (mode !== 'lock') checkMetadata();
    if (mode === 'test') {
      const listOutput = command(cargo, ['test', '--locked', '-p', 'water-contracts', '--test', 'contract_v1', '--', '--list', '--format', 'terse'], { env, timeout: 180000, log: true });
      const names = [...listOutput.matchAll(/^([^\r\n]+): test$/gm)].map((match) => match[1]);
      assert.deepEqual(names.sort(), [...task.expectedTests].sort(), 'Focused test names must match the frozen nonempty list');
    }
    record.productTestsRun = mode === 'test';
    const output = command(cargo, cargoArgs[mode], { env, timeout: 180000, log: true });
    if (mode === 'lock') checkMetadata();
    if (mode === 'test') {
      const summary = /test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out/.exec(output);
      assert(summary && Number(summary[1]) === task.expectedTests.length && Number(summary[1]) > 0 &&
        summary.slice(2).every((value) => Number(value) === 0), 'Zero/ignored/filtered tests are not accepted');
      record.executedTests = Number(summary[1]);
    }
    if (output) console.log(output);
  }
} catch (error) { fault = error; }
try {
  auditAssignment();
  ensureLocal('.local/checks/' + (preflight ? 'preflight' : taskId));
  ensureLocal('.local/cargo-home'); ensureLocal('.local/target'); ensureLocal('.local/tmp');
  rejectCargoOverrides();
  record.after = { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) };
  assert.equal(record.after.head, record.before.head, 'HEAD changed during the gate');
  if (finalGate) assert.equal(record.after.status, '', 'Final gate dirtied the worktree');
} catch (error) { fault = fault ? new Error(fault.message + '; post-check: ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
let receipt = null;
try {
  ensureLocal('.local/checks/' + (preflight ? 'preflight' : taskId));
  receipt = join(logDir, stamp + '-' + mode + '-result.json');
  writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
} catch (error) {
  receipt = null;
  fault = fault ? new Error(fault.message + '; receipt: ' + error.message) : error;
  record.status = 'failed'; record.error = fault.message;
}
console.log(JSON.stringify({ ...record, receipt }, null, 2));
if (fault) process.exitCode = 1;
