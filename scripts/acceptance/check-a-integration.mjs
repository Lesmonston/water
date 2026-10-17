// Controller integration gate: fixed Cargo inputs, offline cache, synthetic contracts only.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--expected-head');
const expected = process.argv[3]; assert.match(expected, /^[a-f0-9]{40}$/);
assert.equal(realpathSync(process.cwd()).toLowerCase(), realpathSync(root).toLowerCase());
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0' };
for (const key of Object.keys(env)) {
  if (/^(?:CARGO_|RUST)/i.test(key) && key !== 'RUSTUP_AUTO_INSTALL') delete env[key];
}
delete env.NODE_OPTIONS; delete env.NODE_PATH;
function local(parts) {
  let current = root;
  for (const part of parts.split('/')) {
    assert(part && !['.', '..'].includes(part)); current = join(current, part);
    if (!existsSync(current)) mkdirSync(current);
    assert(lstatSync(current).isDirectory() && !lstatSync(current).isSymbolicLink());
    const rel = relative(realpathSync(root), realpathSync(current)); assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
  }
  return current;
}
const output = local('.local/checks/controller-a-integration');
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const record = { startedAt: new Date().toISOString(), expectedHead: expected, root, commands: [] };
function command(binary, args, timeout = 30000, allowed = [0]) {
  const result = spawnSync(binary, args, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024 });
  const log = stamp + '-' + record.commands.length + '.log';
  const entry = { binary, args, exitCode: result.status, error: result.error?.code ?? null, log };
  record.commands.push(entry);
  writeFileSync(join(output, log), JSON.stringify(entry) + '\n--- stdout ---\n' + (result.stdout ?? '') + '\n--- stderr ---\n' + (result.stderr ?? ''), { flag: 'wx' });
  assert(!result.error && allowed.includes(result.status), 'Command failed: ' + args.join(' '));
  return result.stdout.trim();
}
const git = (args) => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args]);
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
const readJSON = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
let fault;
try {
  const controllerRoot = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  assert.equal(relative(realpathSync(controllerRoot), realpathSync(root)).replaceAll('\\', '/'), '.worktrees/integration-a-20261017');
  assert.equal(git(['branch', '--show-current']), 'controller/water-w1-a-20261017');
  record.before = snapshot(); assert.equal(record.before.head, expected); assert.equal(record.before.status, '');
  const manifest = readJSON('docs/dispatch/wave1/manifest.json');
  const task = manifest.tasks.find((t) => t.id === 'WATER-W1-A'); assert.equal(task.status, 'ACCEPTED');
  assert(task.acceptedCommit); git(['merge-base', '--is-ancestor', task.acceptedCommit, 'HEAD']);
  record.productTrees = [];
  for (const path of ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'crates/water-contracts']) {
    const accepted = git(['rev-parse', task.acceptedCommit + ':' + path]), actual = git(['rev-parse', 'HEAD:' + path]);
    assert.equal(actual, accepted); record.productTrees.push({ path, tree: actual });
  }
  record.bcTrees = [];
  for (const [id, path] of [['WATER-W1-B', 'packages/tool-catalog'], ['WATER-W1-C', 'prototypes/readonly-dashboard']]) {
    const accepted = manifest.tasks.find((t) => t.id === id).acceptedCommit;
    const tree = git(['rev-parse', 'HEAD:' + path]); assert.equal(tree, git(['rev-parse', accepted + ':' + path]));
    record.bcTrees.push({ id, path, tree });
  }
  assert.equal(git(['ls-tree', 'HEAD', '--', 'tools/fs-fixture-kit']), '', 'Unaccepted D product must not be integrated');
  const frozen = new Map();
  for (const path of ['contracts/v1/freeze.lock.json', 'contracts/parallel-v1/freeze.lock.json', 'contracts/fixture-lab-v1/freeze.lock.json']) {
    for (const f of readJSON(path).files) { assert.equal(sha(join(root, f.path)), f.sha256); frozen.set(f.path, f.sha256); }
  }
  record.frozenFiles = frozen.size;
  for (let current = root;; current = dirname(current)) {
    for (const name of ['config', 'config.toml']) assert(!existsSync(join(current, '.cargo', name)), 'Unapproved Cargo ancestor configuration');
    if (dirname(current) === current) break;
  }
  const cargoHome = local('.local/cargo-home'), target = local('.local/target'), temp = local('.local/tmp');
  for (const name of ['config', 'config.toml']) assert(!existsSync(join(cargoHome, name)));
  const source = join(task.worktree, '.local/cargo-home/registry');
  const sourceRel = relative(realpathSync(controllerRoot), realpathSync(source));
  assert(sourceRel && !sourceRel.startsWith('..') && !isAbsolute(sourceRel));
  assert(lstatSync(source).isDirectory() && !lstatSync(source).isSymbolicLink());
  if (!existsSync(join(cargoHome, 'registry'))) cpSync(source, join(cargoHome, 'registry'), { recursive: true, force: false, errorOnExist: true });
  record.cacheSource = source; record.offline = true;
  const rustup = process.env.WATER_RUSTUP ?? join(homedir(), '.cargo/bin/rustup.exe');
  const rustc = command(rustup, ['which', 'rustc', '--toolchain', '1.95.0']);
  const cargo = command(rustup, ['which', 'cargo', '--toolchain', '1.95.0']);
  assert(isAbsolute(rustc) && isAbsolute(cargo));
  assert(command(rustc, ['--version']).startsWith('rustc 1.95.0 '));
  assert(command(cargo, ['--version']).startsWith('cargo 1.95.0 '));
  Object.assign(env, { RUSTUP_TOOLCHAIN: '1.95.0', RUSTC: rustc, RUSTDOC: join(dirname(rustc), 'rustdoc.exe'),
    CARGO_HOME: cargoHome, CARGO_TARGET_DIR: target, CARGO_BUILD_JOBS: '1', CARGO_TERM_COLOR: 'never', CARGO_NET_OFFLINE: 'true', TEMP: temp, TMP: temp, TMPDIR: temp });
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  env[pathKey] = dirname(rustc) + ';' + (env[pathKey] ?? '');
  const metadata = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--no-deps', '--format-version', '1']));
  assert.equal(metadata.packages.length, 1); assert.equal(metadata.workspace_members.length, 1);
  const pkg = metadata.packages[0]; assert.equal(pkg.name, 'water-contracts'); assert.equal(pkg.edition, '2024');
  assert.deepEqual(pkg.publish, []); assert.equal(pkg.targets.length, 2); assert.equal(pkg.dependencies.length, 2);
  assert(pkg.targets.every((t) => !t.kind.includes('custom-build')));
  assert.deepEqual(pkg.dependencies.map((d) => [d.name, d.req]).sort(), [['serde', '=1.0.229'], ['serde_json', '=1.0.151']]);
  command(cargo, ['fmt', '--manifest-path', 'crates/water-contracts/Cargo.toml', '--', '--check']);
  const tests = command(cargo, ['test', '--offline', '--locked', '-p', 'water-contracts', '--test', 'contract_v1', '--', '--test-threads=1', '--format', 'pretty'], 180000);
  assert(/5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(tests));
  for (const name of task.expectedTests) assert(tests.includes('test ' + name + ' ... ok'));
  record.contractTests = 5;
  command(cargo, ['clippy', '--offline', '--locked', '-p', 'water-contracts', '--all-targets', '--', '-D', 'warnings'], 180000);
  const deps = join(target, 'debug/deps');
  const externs = ['water_contracts', 'serde', 'serde_json'].flatMap((name) => {
    const files = readdirSync(deps).filter((p) => p.startsWith('lib' + name + '-') && p.endsWith('.rlib')); assert.equal(files.length, 1);
    return ['--extern', name + '=' + join(deps, files[0])];
  });
  const binary = join(output, stamp + '-wire.exe');
  command(rustc, ['--edition=2024', '--crate-name', 'controller_integrated_wire', '--test', join(root, 'scripts/acceptance/contract-wire-boundaries.rs'), '-L', 'dependency=' + deps, ...externs, '-o', binary], 180000);
  const wire = command(binary, ['--test-threads=1', '--nocapture']);
  assert(/3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(wire)); record.wireTests = 3;
} catch (error) { fault = error; }
try { record.after = snapshot(); assert.deepEqual(record.after, record.before); }
catch (error) { fault = fault ? new Error(fault.message + '; ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
const receipt = join(output, stamp + '-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt, status: record.status, error: record.error, head: expected }, null, 2));
if (fault) process.exitCode = 1;
