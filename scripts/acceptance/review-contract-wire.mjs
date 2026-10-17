// Controller acceptance only: link a synthetic harness to the submitted library.
// Run all four assigned final gates before this check. This is not an OS sandbox.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv[2], '--expected-head');
assert.equal(process.argv.length, 4);
const expected = process.argv[3];
assert.match(expected, /^[a-f0-9]{40}$/);
const manifest = JSON.parse(readFileSync(join(root, 'docs/dispatch/wave1/manifest.json'), 'utf8'));
const task = manifest.tasks.find((entry) => entry.id === 'WATER-W1-A');
const worker = resolve(task.worktree);
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const record = { task: task.id, expectedHead: expected, startedAt: new Date().toISOString(), commands: [] };
const environment = { ...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0' };
for (const key of Object.keys(environment)) {
  if (/^(?:CARGO_|RUST)/i.test(key) && !['RUSTUP_AUTO_INSTALL'].includes(key.toUpperCase())) delete environment[key];
}
function command(binary, argv, cwd = root, allowed = [0]) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(binary, argv, { cwd, env: environment, shell: false, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  record.commands.push({ binary, argv, cwd, startedAt, endedAt: new Date().toISOString(),
    exitCode: result.status, signal: result.signal, error: result.error?.code ?? null,
    stdout: result.stdout ?? '', stderr: result.stderr ?? '' });
  assert(!result.error && allowed.includes(result.status), 'Command failed: ' + binary);
  return result;
}
const git = (args) => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args], worker).stdout.trim();
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
function insideDirectory(path) {
  const rel = relative(realpathSync(root), realpathSync(path));
  assert(rel && !rel.startsWith('..') && !isAbsolute(rel), 'Directory outside Water');
  assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink());
  return path;
}
function mkdirLocal(relativePath) {
  let current = root;
  for (const part of relativePath.split('/')) {
    assert(part && !['.', '..'].includes(part));
    current = join(current, part);
    if (!existsSync(current)) mkdirSync(current);
    insideDirectory(current);
  }
  return current;
}
const output = mkdirLocal('docs/acceptance/wave1/controller/w1-a-review-20261017');
const local = mkdirLocal('.local/controller/a-wire-' + stamp);
Object.assign(environment, { TEMP: local, TMP: local, TMPDIR: local });
let fault;
try {
  insideDirectory(worker);
  assert.equal(git(['rev-parse', 'HEAD']), expected);
  assert.equal(git(['branch', '--show-current']), task.branch);
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '');
  git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  const changed = git(['diff', '--no-renames', '--name-only', task.baseCommit, 'HEAD']).split(/\r?\n/).filter(Boolean);
  assert(changed.every((path) => task.allowedFiles.includes(path) || task.allowedPrefixes.some((prefix) => path.startsWith(prefix))));
  record.changedFileCount = changed.length;
  const frozen = JSON.parse(readFileSync(join(root, manifest.contractLock), 'utf8'));
  for (const file of frozen.files) assert.equal(sha(join(worker, file.path)), file.sha256);
  record.frozenFileCount = frozen.files.length;
  record.productFiles = changed.filter((path) => path.startsWith('crates/') || ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml'].includes(path))
    .map((path) => ({ path, sha256: sha(join(worker, path)) }));
  const checks = join(worker, '.local/checks/WATER-W1-A');
  const receipts = readdirSync(checks).filter((name) => name.endsWith('-result.json')).map((name) => {
    const data = JSON.parse(readFileSync(join(checks, name), 'utf8')); return { name, data };
  });
  record.gates = [];
  for (const mode of ['fmt', 'test', 'clippy', 'metadata']) {
    const candidates = receipts.filter(({ data }) => data.mode === mode && data.finalGate && data.status === 'passed'
      && data.before.head === expected && data.after.head === expected && data.before.status === '' && data.after.status === '')
      .sort((a, b) => a.name.localeCompare(b.name));
    assert(candidates.length, 'Missing passing final gate at submitted HEAD: ' + mode);
    const { name, data } = candidates.at(-1);
    if (mode === 'test') assert.equal(data.executedTests, 5);
    const logs = readdirSync(checks).filter((file) => file.startsWith(name.slice(0, -'-result.json'.length) + '-') && file.endsWith('.log'));
    const artifacts = [name, ...logs];
    for (const file of artifacts) {
      const destination = join(output, file);
      if (existsSync(destination)) assert.equal(sha(destination), sha(join(checks, file)));
      else writeFileSync(destination, readFileSync(join(checks, file)), { flag: 'wx' });
    }
    record.gates.push({ mode, receipt: name, artifacts, status: data.status });
  }
  const rustup = join(homedir(), '.cargo/bin/rustup.exe');
  const rustc = command(rustup, ['which', 'rustc', '--toolchain', '1.95.0']).stdout.trim();
  assert(isAbsolute(rustc) && existsSync(rustc));
  record.rustVersion = command(rustc, ['--version']).stdout.trim();
  assert(record.rustVersion.startsWith('rustc 1.95.0 '));
  const deps = insideDirectory(join(worker, '.local/target/debug/deps'));
  const externs = ['water_contracts', 'serde_json', 'serde'].map((name) => {
    const matches = readdirSync(deps).filter((file) => file.startsWith('lib' + name + '-') && file.endsWith('.rlib'));
    assert.equal(matches.length, 1, 'Ambiguous/missing build artifact: ' + name);
    return { name, path: join(deps, matches[0]), sha256: sha(join(deps, matches[0])) };
  });
  record.linkedArtifacts = externs;
  const source = join(root, 'scripts/acceptance/contract-wire-boundaries.rs');
  record.harnessSha256 = sha(source);
  const binary = join(local, 'contract-wire-boundaries.exe');
  command(rustc, ['--edition=2024', '--crate-name', 'controller_contract_wire', '--test', source,
    '-L', 'dependency=' + deps, ...externs.flatMap(({ name, path }) => ['--extern', name + '=' + path]), '-o', binary]);
  const test = command(binary, ['--test-threads=1', '--nocapture'], root, [0, 101]);
  assert(/running 3 tests/.test(test.stdout));
  assert(/3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out|1 passed; 2 failed; 0 ignored; 0 measured; 0 filtered out/.test(test.stdout));
  record.testExitCode = test.status;
  record.acceptanceStatus = test.status === 0 ? 'passed' : 'changes_requested';
  assert.equal(git(['rev-parse', 'HEAD']), expected);
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '');
  for (const file of record.productFiles) assert.equal(sha(join(worker, file.path)), file.sha256);
} catch (error) { fault = error; record.acceptanceStatus = 'runner_failed'; record.error = error.message; }
record.endedAt = new Date().toISOString();
const receipt = join(output, stamp + '-boundary-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ acceptanceStatus: record.acceptanceStatus, testExitCode: record.testExitCode, receipt, error: record.error ?? null }, null, 2));
if (fault || record.testExitCode !== 0) process.exitCode = 1;
