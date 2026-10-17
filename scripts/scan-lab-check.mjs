// Controller-owned focused gate; policy checks, not an OS sandbox.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { prepareScanFixtures, readActiveFixtures, verifyScanSnapshots, verifyNativeFacts } from './prepare-scan-fixtures.mjs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const finalGate = args[4] === '--final', mode = args[3];
assert.equal(args[0], '--task'); assert.equal(args[1], 'WATER-W1-F'); assert.equal(args[2], '--mode');
assert(args.length === (finalGate ? 5 : 4));
assert(['baseline', 'fixtures', 'lock', 'fmt', 'test', 'clippy', 'metadata', 'bridge'].includes(mode));
assert(!finalGate || !['baseline', 'fixtures', 'lock'].includes(mode));
assert.equal(Number(process.versions.node.split('.')[0]), 24);
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0' };
for (const key of Object.keys(env)) if (/^(?:CARGO_|RUST)/i.test(key) && key !== 'RUSTUP_AUTO_INSTALL') delete env[key];
delete env.NODE_OPTIONS; delete env.NODE_PATH;
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
let output, sequence = 0;
const commands = [];
function command(binary, argv, timeout = 30000) {
  const result = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024 });
  const entry = { binary, argv, exitCode: result.status, error: result.error?.code ?? null };
  if (output) {
    entry.log = stamp + '-' + mode + '-' + (++sequence) + '.log';
    writeFileSync(join(output, entry.log), JSON.stringify(entry) + '\n--- stdout ---\n' + (result.stdout ?? '') + '\n--- stderr ---\n' + (result.stderr ?? ''), { flag: 'wx' });
  }
  commands.push(entry);
  if (result.error || result.status !== 0) { process.stderr.write((result.stdout ?? '') + (result.stderr ?? '')); throw new Error('Focused command failed: ' + argv.join(' ')); }
  return result.stdout.trim();
}
const git = (argv) => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv]);
const controller = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
const mainManifest = JSON.parse(readFileSync(join(controller, 'docs/dispatch/wave1/manifest.json'), 'utf8'));
const task = mainManifest.tasks.find((t) => t.id === 'WATER-W1-F'); assert(task);
const same = (a, b) => realpathSync(a).toLowerCase() === realpathSync(b).toLowerCase();
assert(same(root, task.worktree) && same(root, process.cwd()));
const within = (base, path) => { const rel = relative(realpathSync(base), realpathSync(path)); assert(!rel.startsWith('..') && !isAbsolute(rel)); };
within(controller, root);
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const frozen = JSON.parse(readFileSync(join(controller, task.contractLock), 'utf8'));
function audit() {
  assert.equal(git(['branch', '--show-current']), task.branch); git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  for (const f of frozen.files) assert.equal(sha(join(root, f.path)), f.sha256, 'Frozen file changed: ' + f.path);
  for (const path of frozen.inheritedLocks ?? []) {
    const lock = JSON.parse(readFileSync(join(root, path), 'utf8'));
    for (const f of lock.files) assert.equal(sha(join(root, f.path)), f.sha256, 'Prior frozen file changed: ' + f.path);
  }
  const paths = [git(['diff', '--no-renames', '--name-only', '-z', task.baseCommit, 'HEAD']), git(['diff', '--no-renames', '--name-only', '-z', 'HEAD']), git(['ls-files', '--others', '--exclude-standard', '-z'])].flatMap((v) => v.split('\0').filter(Boolean));
  assert(paths.every((p) => task.allowedFiles.includes(p) || task.allowedPrefixes.some((prefix) => p.startsWith(prefix))), 'Out-of-scope change');
}
function local(parts) {
  let path = root;
  for (const part of parts.split('/')) {
    assert(part && !['.', '..'].includes(part)); path = join(path, part);
    if (!existsSync(path)) mkdirSync(path);
    assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink()); within(root, path);
  }
  return path;
}
audit();
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
const before = snapshot();
if (mode === 'baseline') { assert.equal(before.head, task.baseCommit); assert.equal(before.status, ''); assert(!existsSync(join(root, task.outputRoot))); }
if (finalGate) assert.equal(before.status, '', 'Final gate requires a committed clean tree');
output = local('.local/checks/WATER-W1-F');
const home = local('.local/scan-lab-cargo-home'), target = local('.local/scan-lab-target'), temp = local('.local/scan-lab-tmp');
for (let path = root;; path = dirname(path)) {
  for (const name of ['config', 'config.toml']) assert(!existsSync(join(path, '.cargo', name)), 'Unapproved ancestor Cargo configuration');
  if (dirname(path) === path) break;
}
for (const name of ['config', 'config.toml']) assert(!existsSync(join(home, name)));
const record = { task: task.id, mode, finalGate, startedAt: new Date().toISOString(), before, node: process.version, commands,
  productTestsRun: false, scannerInvocationAttempted: false, frozenFiles: frozen.files.length };
let fault;
try {
  if (!existsSync(join(home, 'registry'))) {
    const source = resolve(task.cargoCacheSource); within(controller, source);
    assert(lstatSync(source).isDirectory() && !lstatSync(source).isSymbolicLink());
    cpSync(source, join(home, 'registry'), { recursive: true, force: false, errorOnExist: true });
    record.cacheCopiedFrom = source;
  }
  const rustup = process.env.WATER_RUSTUP ?? join(homedir(), '.cargo/bin/rustup.exe');
  const rustc = command(rustup, ['which', 'rustc', '--toolchain', '1.95.0']), cargo = command(rustup, ['which', 'cargo', '--toolchain', '1.95.0']);
  assert(isAbsolute(rustc) && isAbsolute(cargo));
  record.rustVersion = command(rustc, ['--version']); record.cargoVersion = command(cargo, ['--version']);
  assert(record.rustVersion.startsWith('rustc 1.95.0 ') && record.cargoVersion.startsWith('cargo 1.95.0 '));
  Object.assign(env, { RUSTC: rustc, RUSTDOC: join(dirname(rustc), 'rustdoc.exe'), RUSTUP_TOOLCHAIN: '1.95.0', CARGO_HOME: home,
    CARGO_TARGET_DIR: target, CARGO_BUILD_JOBS: '1', CARGO_NET_OFFLINE: 'true', CARGO_TERM_COLOR: 'never', TEMP: temp, TMP: temp, TMPDIR: temp });
  const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'PATH'; env[pathKey] = dirname(rustc) + ';' + (env[pathKey] ?? '');
  const fixtureState = async (force = false) => {
    const path = join(root, '.local/checks/WATER-W1-F/active-fixtures.json');
    const state = force || !existsSync(path) ? await prepareScanFixtures() : readActiveFixtures();
    env.WATER_SCAN_FIXTURE_INDEX = state.active; return state;
  };
  for (const key of Object.keys(env)) if (key.startsWith('WATER_SCAN_')) delete env[key];
  if (mode === 'baseline' || mode === 'fixtures') {
    if (mode === 'baseline') {
      const source = join(output, stamp + '-probe.rs'), binary = join(output, stamp + '-probe.exe');
      writeFileSync(source, 'fn main() { println!("water-scan-lab-probe-ok"); }\n', { flag: 'wx' });
      command(rustc, ['--edition=2024', '--crate-name', 'water_scan_probe', source, '-o', binary], 180000);
      assert.equal(command(binary, []), 'water-scan-lab-probe-ok');
      const meta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--no-deps', '--format-version', '1']));
      assert.equal(meta.workspace_members.length, 1); assert.equal(meta.packages[0].name, 'water-contracts');
      const matrix = JSON.parse(readFileSync(join(root, 'contracts/scan-lab-v1/matrix.json'), 'utf8'));
      assert.equal(matrix.cases.length, 11); record.assets = { cases: 11, scopes: 12, productImplemented: false };
      if (process.platform === 'win32') {
        const source = join(output, stamp + '-unstable-identity.rs');
        writeFileSync(source, 'use std::os::windows::fs::MetadataExt; fn probe(m: &std::fs::Metadata) { let _ = m.file_index(); let _ = m.volume_serial_number(); } fn main() {}\n', { flag: 'wx' });
        const argv = ['--edition=2024', '--crate-name', 'identity_capability_probe', source, '-o', join(output, stamp + '-unstable.exe')];
        const probe = spawnSync(rustc, argv, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000 });
        assert.equal(probe.status, 1); assert(probe.stderr.includes('windows_by_handle') && probe.stderr.includes('E0658'));
        const log = stamp + '-unstable-identity.log'; writeFileSync(join(output, log), probe.stdout + probe.stderr, { flag: 'wx' });
        record.identityCapability = { kind: 'unknown', expectedCompileRejection: true, exitCode: probe.status, log };
      }
    } else {
      const state = await fixtureState(true), binary = join(output, stamp + '-std-probe.exe');
      command(rustc, ['--edition=2024', '--crate-name', 'scan_std_probe', join(root, 'scripts/acceptance/scan-std-probe.rs'), '-o', binary], 180000);
      const hard = state.index.runs.find((r) => r.case_id === 'hardlink-pair'), links = state.index.runs.find((r) => r.case_id === 'directory-links');
      const node = (run, path) => run.nodes.find((n) => n.path === path)?.status === 'created' ? join(run.run_root, ...path.split('/')) : 'UNSUPPORTED';
      const probePaths = [node(hard, 'scope/original.bin'), node(hard, 'scope/alias.bin'), node(links, 'scope/symbolic-outside'), node(links, 'scope/junction-outside')];
      const native = command(binary, probePaths).split(/\r?\n/).map((line) => JSON.parse(line)); assert.equal(native.length, 4);
      for (let i = 0; i < native.length; i++) {
        assert.equal(native[i].supported, probePaths[i] !== 'UNSUPPORTED');
        if (native[i].supported) { if (i < 2) { assert.equal(native[i].file, true); assert.equal(native[i].length, '8'); } else assert.equal(native[i].reparse, true); }
      }
      record.fixtures = { runs: state.index.runs.length, negatives: state.index.negative.length, contentBytes: state.index.content_bytes, active: state.active };
      record.stdProbe = native; record.snapshotFiles = verifyScanSnapshots(state.index); record.productTestsRun = false;
    }
  } else {
    const manifest = join(root, 'packages/fixture-scan/Cargo.toml'); assert(existsSync(manifest));
    const text = readFileSync(manifest, 'utf8'); assert(!/\[(?:patch|replace)(?:[.\]])|^\s*(?:git|registry|build|rustc-wrapper|runner)\s*=/mi.test(text));
    const cargoArgs = ['--manifest-path', manifest];
    if (mode === 'lock') { assert.equal(task.allowLockfileGeneration, true); command(cargo, ['generate-lockfile', '--offline', ...cargoArgs], 180000); }
    const meta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--format-version', '1', ...cargoArgs], 180000));
    assert.equal(meta.workspace_members.length, 1);
    const pkg = meta.packages.find((p) => p.name === 'water-scan'); assert(pkg && pkg.version === '0.1.0');
    assert(meta.workspace_members.includes(pkg.id)); assert.equal(pkg.edition, '2024'); assert(['1.95', '1.95.0'].includes(pkg.rust_version)); assert.deepEqual(pkg.publish, []);
    assert.equal(pkg.targets.length, 2); assert(pkg.targets.some((t) => t.name === 'water_scan' && t.kind.includes('lib')));
    assert(pkg.targets.some((t) => t.name === 'scan_v1' && t.kind.includes('test'))); assert(pkg.targets.every((t) => !t.kind.includes('custom-build')));
    assert.equal(pkg.dependencies.length, 3); assert(pkg.dependencies.every((d) => d.kind === null));
    for (const [name, req] of [['serde', '=1.0.229'], ['serde_json', '=1.0.151']]) assert.equal(pkg.dependencies.find((d) => d.name === name)?.req, req);
    for (const name of ['serde', 'serde_json']) {
      const dependency = pkg.dependencies.find((d) => d.name === name);
      assert(!dependency.path && dependency.source === 'registry+https://github.com/rust-lang/crates.io-index', 'Registry dependency replaced by a local/source override');
    }
    assert.deepEqual(pkg.dependencies.find((d) => d.name === 'serde').features, ['derive']);
    assert.deepEqual(pkg.dependencies.find((d) => d.name === 'serde_json').features, []);
    assert(pkg.dependencies.every((d) => d.optional === false && d.uses_default_features === true));
    const a = pkg.dependencies.find((d) => d.name === 'water-contracts'); assert(a && a.source === null && a.path && same(a.path, join(root, 'crates/water-contracts')));
    const localPackages = meta.packages.filter((p) => p.source === null);
    assert.deepEqual(localPackages.map((p) => p.name).sort(), ['water-contracts', 'water-scan']);
    assert(same(localPackages.find((p) => p.name === 'water-contracts').manifest_path, join(root, 'crates/water-contracts/Cargo.toml')));
    const lockEntries = (path) => readFileSync(path, 'utf8').split('[[package]]').map((block) => ({ name: /^name = "([^"]+)"/m.exec(block)?.[1], version: /^version = "([^"]+)"/m.exec(block)?.[1], source: /^source = "([^"]+)"/m.exec(block)?.[1], checksum: /^checksum = "([^"]+)"/m.exec(block)?.[1] }));
    const locked = lockEntries(join(root, 'Cargo.lock')), ownLock = lockEntries(join(root, 'packages/fixture-scan/Cargo.lock'));
    for (const p of meta.packages.filter((p) => p.source !== null)) {
      const actual = ownLock.find((l) => l.name === p.name && l.version === p.version && l.source === p.source);
      assert(actual && locked.some((l) => l.name === actual.name && l.version === actual.version && l.source === actual.source && l.checksum === actual.checksum), 'Unapproved registry version/checksum: ' + p.name);
    }
    if (mode === 'fmt') command(cargo, ['fmt', ...cargoArgs, '--', '--check'], 180000);
    if (mode === 'test') {
      record.productTestsRun = true; record.scannerInvocationAttempted = true;
      const fixtures = await fixtureState();
      const result = command(cargo, ['test', '--offline', '--locked', ...cargoArgs, '-p', 'water-scan', '--test', 'scan_v1', '--', '--test-threads=1', '--format', 'pretty'], 180000);
      assert.deepEqual([...result.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map((m) => m[1]).sort(), [...task.expectedTests].sort());
      assert(/6 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(result)); record.executedTests = 6; record.snapshotFiles = verifyScanSnapshots(fixtures.index);
    }
    if (mode === 'clippy') command(cargo, ['clippy', '--offline', '--locked', ...cargoArgs, '-p', 'water-scan', '--all-targets', '--', '-D', 'warnings'], 180000);
    if (mode === 'bridge') {
      record.productTestsRun = true; record.scannerInvocationAttempted = true;
      const fixtures = await fixtureState();
      command(cargo, ['build', '--offline', '--locked', ...cargoArgs, '-p', 'water-scan', '--lib'], 180000);
      const deps = join(target, 'debug/deps'), externs = ['water_scan', 'serde_json'].flatMap((name) => {
        const files = readdirSync(deps).filter((p) => p.startsWith('lib' + name + '-') && p.endsWith('.rlib')); assert.equal(files.length, 1);
        return ['--extern', name + '=' + join(deps, files[0])];
      });
      const binary = join(output, stamp + '-bridge.exe');
      command(rustc, ['--edition=2024', '--crate-name', 'controller_scan_lab_bridge', join(root, 'scripts/acceptance/scan-lab-bridge.rs'), '-L', 'dependency=' + deps, ...externs, '-o', binary], 180000);
      const actual = JSON.parse(command(binary, [fixtures.active]));
      record.bridge = { status: 'passed', actualRustPublicEntry: true, ...verifyNativeFacts(actual, fixtures.index), uiConnected: false };
      record.snapshotFiles = verifyScanSnapshots(fixtures.index);

    }
  }
} catch (error) { fault = error; }
try { audit(); record.after = snapshot(); assert.equal(record.after.head, before.head); if (finalGate) assert.equal(record.after.status, ''); }
catch (error) { fault = fault ? new Error(fault.message + '; post-check: ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
const receipt = join(output, stamp + '-' + mode + '-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...record, commands: commands.length, receipt }, null, 2));
if (fault) process.exitCode = 1;
