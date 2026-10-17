// Controller-owned acceptance. The frozen worker gate is unchanged.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
assert.equal(args.length, 4); assert.equal(args[0], '--stage'); assert.equal(args[2], '--expected-head');
const stage = args[1], expected = args[3];
assert(['review', 'integration'].includes(stage)); assert.match(expected, /^[a-f0-9]{40}$/);
assert.equal(Number(process.versions.node.split('.')[0]), 24);
const manifest = JSON.parse(readFileSync(join(sourceRoot, 'docs/dispatch/wave1/manifest.json'), 'utf8'));
const task = manifest.tasks.find(t => t.id === 'WATER-W1-F'); assert(task);
const root = stage === 'review' ? resolve(task.worktree) : sourceRoot;
assert.equal(realpathSync(sourceRoot).toLowerCase(), realpathSync(process.cwd()).toLowerCase());
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const shaBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const sha = path => shaBytes(readFileSync(path));
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
function directory(base, parts) {
  let path = base;
  for (const part of parts.split('/')) {
    assert(part && !['.', '..'].includes(part)); path = join(path, part);
    if (!existsSync(path)) mkdirSync(path);
    assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink());
    const rel = relative(realpathSync(base), realpathSync(path)); assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
  }
  return path;
}
const output = stage === 'review'
  ? directory(sourceRoot, 'docs/acceptance/wave1/controller/w1-f-review-20261017')
  : directory(root, '.local/checks/controller-f-integration');
const local = directory(root, '.local/controller-f-' + stage);
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0' };
for (const key of Object.keys(env)) if (/^(?:CARGO_|RUST|WATER_SCAN_)/i.test(key) && key !== 'RUSTUP_AUTO_INSTALL') delete env[key];
delete env.NODE_OPTIONS; delete env.NODE_PATH;
Object.assign(env, { TEMP: local, TMP: local, TMPDIR: local });
const record = { task: task.id, stage, expectedHead: expected, root, startedAt: new Date().toISOString(), commands: [] };
function command(binary, argv, cwd = root, timeout = 30000) {
  const result = spawnSync(binary, argv, { cwd, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024 });
  const log = stamp + '-' + record.commands.length + '.log';
  const entry = { binary, argv, cwd, exitCode: result.status, error: result.error?.code ?? null, log };
  record.commands.push(entry);
  writeFileSync(join(output, log), JSON.stringify(entry) + '\n--- stdout ---\n' + (result.stdout ?? '') + '\n--- stderr ---\n' + (result.stderr ?? ''), { flag: 'wx' });
  assert(!result.error && result.status === 0, 'Controller command failed: ' + argv.join(' ')); return result.stdout.trim();
}
const git = argv => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv]);
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
function archive(source, name) {
  const destination = join(output, name);
  if (existsSync(destination)) assert.equal(sha(destination), sha(source));
  else writeFileSync(destination, readFileSync(source), { flag: 'wx' });
}
let failure;
try {
  record.before = snapshot(); assert.equal(record.before.head, expected); assert.equal(record.before.status, '');
  const controller = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  const rel = relative(realpathSync(controller), realpathSync(root)).replaceAll('\\', '/');
  assert.equal(rel, stage === 'review' ? '.worktrees/f' : '.worktrees/integration-f-20261017');
  assert.equal(git(['branch', '--show-current']), stage === 'review' ? task.branch : 'controller/water-w1-f-20261017');
  git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  const frozen = new Map(); record.locks = [];
  for (const path of ['contracts/v1/freeze.lock.json', 'contracts/parallel-v1/freeze.lock.json', 'contracts/fixture-lab-v1/freeze.lock.json', 'contracts/report-view-v1/freeze.lock.json', 'contracts/scan-lab-v1/freeze.lock.json', ...(stage === 'integration' ? ['contracts/parallel-next-v1/freeze.lock.json'] : [])]) {
    const lock = readJSON(join(root, path));
    for (const f of lock.files) { assert.equal(sha(join(root, f.path)), f.sha256, f.path); frozen.set(f.path, f.sha256); }
    record.locks.push({ path, entries: lock.files.length, uniqueSoFar: frozen.size });
  }
  record.frozenFiles = frozen.size;
  record.preservedProducts = [];
  for (const path of ['crates/water-contracts', 'packages/tool-catalog', 'prototypes/readonly-dashboard', 'tools/fs-fixture-kit', 'packages/report-view']) {
    const tree = git(['rev-parse', 'HEAD:' + path]);
    assert.equal(tree, git(['rev-parse', (stage === 'review' ? task.baseCommit : '01edb5880e8f2f520ad47fce93ba4d62b2e85f27') + ':' + path]));
    record.preservedProducts.push({ path, tree });
  }
  const product = 'packages/fixture-scan';
  const accepted = stage === 'review' ? expected : task.acceptedCommit;
  assert(accepted); git(['merge-base', '--is-ancestor', accepted, 'HEAD']);
  record.productTree = git(['rev-parse', 'HEAD:' + product]);
  assert.equal(record.productTree, git(['rev-parse', accepted + ':' + product]));
  if (stage === 'review') {
    const changed = git(['diff', '--name-only', '--no-renames', task.baseCommit, 'HEAD']).split(/\r?\n/).filter(Boolean);
    assert(changed.every(p => task.allowedFiles.includes(p) || task.allowedPrefixes.some(prefix => p.startsWith(prefix))));
    record.changedFiles = changed.length;
    record.products = changed.filter(p => p.startsWith(product + '/')).map(path => ({ path, sha256: sha(join(root, path)) }));
    assert.equal(record.products.length, 9);
    const implementation = '3f3acbd7cf3726c10f7a759c8fc79301f2a4069e';
    const later = git(['diff', '--name-only', implementation, expected]).split(/\r?\n/).filter(Boolean);
    assert(later.every(p => p.startsWith('docs/acceptance/wave1/f/') || p === task.report));
    record.postImplementationFiles = later.length;
    const evidence = join(root, 'docs/acceptance/wave1/f');
    const archived = new Set();
    for (const name of ['prefinal-log-manifest.json', 'final-log-manifest.json']) {
      for (const item of readJSON(join(evidence, name))) {
        assert.equal(sha(join(evidence, item.file)), item.sha256);
        assert.equal(readFileSync(join(evidence, item.file)).length, item.bytes);
        assert.equal(sha(join(root, '.local/checks/WATER-W1-F', item.file)), item.sha256);
        archived.add(item.file);
      }
    }
    record.workerRawFilesVerified = archived.size;
    record.negativeControls = [];
    for (const nc of readJSON(join(evidence, 'negative-controls.json'))) {
      assert.equal(nc.originalSha256, nc.restoredSha256); assert.notEqual(nc.originalSha256, nc.mutatedSha256);
      assert.equal(sha(join(root, nc.path)), nc.originalSha256); assert.equal(sha(join(evidence, nc.backup)), nc.originalSha256);
      assert.equal(sha(join(root, 'packages/fixture-scan/tests/scan_v1.rs')), nc.testsSha256);
      const red = readJSON(join(evidence, nc.redReceipt)), green = readJSON(join(evidence, nc.greenReceipt));
      assert.equal(red.status, 'failed'); assert.equal(green.status, 'passed'); assert.equal(green.executedTests, 6);
      const testLog = receipt => {
        const cmd = receipt.commands.find(c => c.argv.includes('test') && c.argv.includes('scan_v1')); assert(cmd);
        return readFileSync(join(evidence, cmd.log), 'utf8');
      };
      const redText = testLog(red), greenText = testLog(green);
      assert(/test result: FAILED/.test(redText)); assert(!/could not compile|error\[E\d+\]/.test(redText));
      assert(/Compiling water-scan/.test(greenText)); assert(/6 passed; 0 failed/.test(greenText));
      const target = { NC1: 'native entries for directory-links', NC2: 'global budget stops BEFORE third inspect', NC3: 'scan_cancellation', NC4: 'permission denial must mark partial coverage' }[nc.id];
      assert(redText.includes(target), 'Missing target failure: ' + nc.id);
      record.negativeControls.push({ id: nc.id, red: nc.redReceipt, green: nc.greenReceipt, hashesAndTargetVerified: true });
    }
    const checks = join(root, '.local/checks/WATER-W1-F'); record.finalGates = [];
    for (const mode of task.expectedFinalModes) {
      const match = readdirSync(checks).filter(n => n.endsWith('-result.json')).map(name => ({ name, data: readJSON(join(checks, name)) })).filter(({ data: d }) => d.mode === mode && d.finalGate && d.status === 'passed' && d.before.head === expected && d.after.head === expected && !d.before.status && !d.after.status).sort((a, b) => a.name.localeCompare(b.name)).at(-1);
      assert(match, 'Missing current final gate: ' + mode);
      if (mode === 'test') assert.equal(match.data.executedTests, 6);
      if (mode === 'bridge') assert.deepEqual(match.data.bridge, { status: 'passed', actualRustPublicEntry: true, cases: 11, scopes: 12, entries: 39, uiConnected: false });
      record.finalGates.push({ mode, receipt: match.name });
      archive(join(checks, match.name), match.name);
      for (const cmd of match.data.commands) if (cmd.log) archive(join(checks, cmd.log), cmd.log);
    }
  } else {
    assert.equal(task.status, 'ACCEPTED');
  }
  for (let path = root;; path = dirname(path)) {
    for (const name of ['config', 'config.toml']) assert(!existsSync(join(path, '.cargo', name)));
    if (dirname(path) === path) break;
  }
  const home = directory(root, '.local/scan-lab-cargo-home'), target = directory(root, '.local/scan-lab-target');
  for (const name of ['config', 'config.toml']) assert(!existsSync(join(home, name)));
  if (stage === 'integration') {
    const cache = join(task.worktree, '.local/scan-lab-cargo-home/registry');
    assert(lstatSync(cache).isDirectory() && !lstatSync(cache).isSymbolicLink());
    const inside = relative(realpathSync(controller), realpathSync(cache)); assert(inside && !inside.startsWith('..') && !isAbsolute(inside));
    if (!existsSync(join(home, 'registry'))) cpSync(cache, join(home, 'registry'), { recursive: true, force: false, errorOnExist: true });
    record.cacheSource = cache;
  }
  const rustup = process.env.WATER_RUSTUP ?? join(homedir(), '.cargo/bin/rustup.exe');
  const rustc = command(rustup, ['which', 'rustc', '--toolchain', '1.95.0']);
  const cargo = command(rustup, ['which', 'cargo', '--toolchain', '1.95.0']);
  assert(command(rustc, ['--version']).startsWith('rustc 1.95.0 ')); assert(command(cargo, ['--version']).startsWith('cargo 1.95.0 '));
  Object.assign(env, { RUSTUP_TOOLCHAIN: '1.95.0', RUSTC: rustc, RUSTDOC: join(dirname(rustc), 'rustdoc.exe'), CARGO_HOME: home,
    CARGO_TARGET_DIR: target, CARGO_BUILD_JOBS: '1', CARGO_NET_OFFLINE: 'true', CARGO_TERM_COLOR: 'never' });
  const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') ?? 'PATH'; env[pathKey] = dirname(rustc) + ';' + (env[pathKey] ?? '');
  const prepare = await import(pathToFileURL(join(root, 'scripts/prepare-scan-fixtures.mjs')));
  const fixture = stage === 'integration' && !existsSync(join(root, '.local/checks/WATER-W1-F/active-fixtures.json'))
    ? await prepare.prepareScanFixtures() : prepare.readActiveFixtures();
  record.fixtures = { active: fixture.active, runs: fixture.index.runs.length, negatives: fixture.index.negative.length, contentBytes: fixture.index.content_bytes };
  env.WATER_SCAN_FIXTURE_INDEX = fixture.active;
  const cargoArgs = ['--manifest-path', 'packages/fixture-scan/Cargo.toml'];
  if (stage === 'integration') {
    const meta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--format-version', '1', ...cargoArgs], root, 180000));
    const pkg = meta.packages.find(p => p.name === 'water-scan'); assert(pkg);
    assert.equal(meta.workspace_members.length, 1); assert.equal(pkg.targets.length, 2); assert.equal(pkg.dependencies.length, 3);
    assert.deepEqual(meta.packages.filter(p => p.source === null).map(p => p.name).sort(), ['water-contracts', 'water-scan']);
    assert.deepEqual(pkg.publish, []); assert.equal(pkg.edition, '2024');
    command(cargo, ['fmt', ...cargoArgs, '--', '--check'], root, 180000);
    const tests = command(cargo, ['test', '--offline', '--locked', ...cargoArgs, '-p', 'water-scan', '--test', 'scan_v1', '--', '--test-threads=1', '--format', 'pretty'], root, 180000);
    assert.deepEqual([...tests.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map(m => m[1]).sort(), [...task.expectedTests].sort());
    assert(/6 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(tests)); record.executedTests = 6;
    command(cargo, ['clippy', '--offline', '--locked', ...cargoArgs, '-p', 'water-scan', '--all-targets', '--', '-D', 'warnings'], root, 180000);
    const rootMeta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--no-deps', '--format-version', '1'], root, 180000));
    assert.equal(rootMeta.workspace_members.length, 1); assert.equal(rootMeta.packages[0].name, 'water-contracts');
  }
  command(cargo, ['build', '--offline', '--locked', ...cargoArgs, '-p', 'water-scan', '--lib'], root, 180000);
  const deps = join(target, 'debug/deps');
  const externs = ['water_scan', 'water_contracts', 'serde_json'].flatMap(name => {
    const files = readdirSync(deps).filter(p => p.startsWith('lib' + name + '-') && p.endsWith('.rlib')); assert.equal(files.length, 1);
    const path = join(deps, files[0]); (record.linkedArtifacts ??= []).push({ path, sha256: sha(path) });
    return ['--extern', name + '=' + path];
  });
  if (stage === 'integration') {
    const bridge = join(local, stamp + '-bridge.exe');
    command(rustc, ['--edition=2024', '--crate-name', 'controller_scan_lab_bridge', join(root, 'scripts/acceptance/scan-lab-bridge.rs'), '-L', 'dependency=' + deps, ...externs, '-o', bridge], root, 180000);
    const actual = JSON.parse(command(bridge, [fixture.active]));
    record.bridge = { actualRustPublicEntry: true, ...prepare.verifyNativeFacts(actual, fixture.index) };
  }
  const binary = join(local, stamp + '-boundaries.exe');
  command(rustc, ['--edition=2024', '--crate-name', 'controller_scan_boundaries', '--test', join(sourceRoot, 'scripts/acceptance/scan-lab-boundaries.rs'), '-L', 'dependency=' + deps, ...externs, '-o', binary], root, 180000);
  const tests = command(binary, ['--test-threads=1', '--nocapture']);
  assert(/5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(tests)); record.independentTests = 5;
  record.snapshotFiles = prepare.verifyScanSnapshots(fixture.index);
} catch (error) { failure = error; }
try { record.after = snapshot(); assert.deepEqual(record.after, record.before); for (const p of record.products ?? []) assert.equal(sha(join(root, p.path)), p.sha256); }
catch (error) { failure = failure ? new Error(failure.message + '; post-check: ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: failure ? 'failed' : 'passed', error: failure?.message ?? null });
const receipt = join(output, stamp + '-result.json'); writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: record.status, stage, independentTests: record.independentTests, receipt, error: record.error }, null, 2));
if (failure) process.exitCode = 1;
