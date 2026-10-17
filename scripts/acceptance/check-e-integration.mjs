// Controller-owned E integration: offline standalone workspace and real synthetic Rust/JS bridge.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--expected-head');
const expected = process.argv[3]; assert.match(expected, /^[a-f0-9]{40}$/);
assert.equal(realpathSync(root).toLowerCase(), realpathSync(process.cwd()).toLowerCase());
assert.equal(Number(process.versions.node.split('.')[0]), 24);
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0' };
for (const k of Object.keys(env)) if (/^(?:CARGO_|RUST)/i.test(k) && k !== 'RUSTUP_AUTO_INSTALL') delete env[k];
delete env.NODE_OPTIONS; delete env.NODE_PATH;
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
const output = local('.local/checks/controller-e-integration'), stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const record = { expectedHead: expected, root, startedAt: new Date().toISOString(), commands: [], scannerExecuted: false, uiConnected: false };
function command(binary, argv, timeout = 30000) {
  const r = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024 });
  const log = stamp + '-' + record.commands.length + '.log', entry = { binary, argv, exitCode: r.status, error: r.error?.code ?? null, log };
  record.commands.push(entry); writeFileSync(join(output, log), JSON.stringify(entry) + '\n--- stdout ---\n' + (r.stdout ?? '') + '\n--- stderr ---\n' + (r.stderr ?? ''), { flag: 'wx' });
  assert(!r.error && r.status === 0, 'Integration command failed: ' + argv.join(' ')); return r.stdout.trim();
}
const git = (argv) => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv]);
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
const readJSON = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
let fault;
try {
  const controller = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  assert.equal(relative(realpathSync(controller), realpathSync(root)).replaceAll('\\', '/'), '.worktrees/integration-e-20261017');
  assert.equal(git(['branch', '--show-current']), 'controller/water-w1-e-20261017');
  record.before = snapshot(); assert.equal(record.before.head, expected); assert.equal(record.before.status, '');
  const manifest = readJSON('docs/dispatch/wave1/manifest.json'), task = manifest.tasks.find((t) => t.id === 'WATER-W1-E');
  assert.equal(task.status, 'ACCEPTED'); assert(task.acceptedCommit); git(['merge-base', '--is-ancestor', task.acceptedCommit, 'HEAD']);
  const tree = git(['rev-parse', 'HEAD:' + task.outputRoot]); assert.equal(tree, git(['rev-parse', task.acceptedCommit + ':' + task.outputRoot]));
  record.acceptedProduct = { path: task.outputRoot, commit: task.acceptedCommit, tree };
  record.preservedProducts = [];
  for (const [id, path] of [['WATER-W1-A', 'crates/water-contracts'], ['WATER-W1-B', 'packages/tool-catalog'], ['WATER-W1-C', 'prototypes/readonly-dashboard'], ['WATER-W1-D', 'tools/fs-fixture-kit']]) {
    const accepted = manifest.tasks.find((t) => t.id === id).acceptedCommit;
    const actual = git(['rev-parse', 'HEAD:' + path]); assert.equal(actual, git(['rev-parse', accepted + ':' + path])); record.preservedProducts.push({ id, path, tree: actual });
  }
  const frozen = new Map();
  for (const path of ['contracts/v1/freeze.lock.json', 'contracts/parallel-v1/freeze.lock.json', 'contracts/fixture-lab-v1/freeze.lock.json', 'contracts/report-view-v1/freeze.lock.json']) for (const f of readJSON(path).files) { assert.equal(sha(join(root, f.path)), f.sha256, f.path); frozen.set(f.path, f.sha256); }
  record.frozenFiles = frozen.size;
  for (let path = root;; path = dirname(path)) {
    for (const name of ['config', 'config.toml']) assert(!existsSync(join(path, '.cargo', name)), 'Unapproved Cargo ancestor config');
    if (dirname(path) === path) break;
  }
  const home = local('.local/report-view-cargo-home'), target = local('.local/report-view-target'), temp = local('.local/report-view-tmp');
  for (const name of ['config', 'config.toml']) assert(!existsSync(join(home, name)));
  const source = join(task.worktree, '.local/report-view-cargo-home/registry');
  const rel = relative(realpathSync(controller), realpathSync(source)); assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
  assert(lstatSync(source).isDirectory() && !lstatSync(source).isSymbolicLink());
  if (!existsSync(join(home, 'registry'))) cpSync(source, join(home, 'registry'), { recursive: true, force: false, errorOnExist: true });
  record.cacheSource = source; record.offline = true;
  const rustup = process.env.WATER_RUSTUP ?? join(homedir(), '.cargo/bin/rustup.exe');
  const rustc = command(rustup, ['which', 'rustc', '--toolchain', '1.95.0']), cargo = command(rustup, ['which', 'cargo', '--toolchain', '1.95.0']);
  assert(command(rustc, ['--version']).startsWith('rustc 1.95.0 ')); assert(command(cargo, ['--version']).startsWith('cargo 1.95.0 '));
  Object.assign(env, { RUSTUP_TOOLCHAIN: '1.95.0', RUSTC: rustc, RUSTDOC: join(dirname(rustc), 'rustdoc.exe'), CARGO_HOME: home,
    CARGO_TARGET_DIR: target, CARGO_BUILD_JOBS: '1', CARGO_NET_OFFLINE: 'true', CARGO_TERM_COLOR: 'never', TEMP: temp, TMP: temp, TMPDIR: temp });
  const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'PATH'; env[pathKey] = dirname(rustc) + ';' + (env[pathKey] ?? '');
  const args = ['--manifest-path', 'packages/report-view/Cargo.toml'];
  const meta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--format-version', '1', ...args], 180000));
  assert.equal(meta.workspace_members.length, 1); const pkg = meta.packages.find((p) => p.name === 'water-report-view');
  assert(pkg && meta.workspace_members.includes(pkg.id)); assert.equal(pkg.dependencies.length, 3); assert.equal(pkg.targets.length, 2); assert.deepEqual(pkg.publish, []);
  assert.deepEqual(meta.packages.filter((p) => p.source === null).map((p) => p.name).sort(), ['water-contracts', 'water-report-view']);
  command(cargo, ['fmt', ...args, '--', '--check'], 180000);
  const tests = command(cargo, ['test', '--offline', '--locked', ...args, '-p', 'water-report-view', '--test', 'view_v1', '--', '--test-threads=1', '--format', 'pretty'], 180000);
  assert.deepEqual([...tests.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map((m) => m[1]).sort(), [...task.expectedTests].sort());
  assert(/5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(tests)); record.executedTests = 5;
  command(cargo, ['clippy', '--offline', '--locked', ...args, '-p', 'water-report-view', '--all-targets', '--', '-D', 'warnings'], 180000);
  command(cargo, ['build', '--offline', '--locked', ...args, '-p', 'water-report-view', '--lib'], 180000);
  const deps = join(target, 'debug/deps');
  const externs = ['water_report_view', 'water_contracts', 'serde_json'].flatMap((name) => {
    const files = readdirSync(deps).filter((p) => p.startsWith('lib' + name + '-') && p.endsWith('.rlib')); assert.equal(files.length, 1); return ['--extern', name + '=' + join(deps, files[0])];
  });
  const bridge = join(output, stamp + '-bridge.exe');
  command(rustc, ['--edition=2024', '--crate-name', 'controller_e_bridge', join(root, 'scripts/acceptance/report-view-bridge.rs'), '-L', 'dependency=' + deps, ...externs, '-o', bridge], 180000);
  const actual = JSON.parse(command(bridge, [])); assert.deepEqual(actual, readJSON('contracts/report-view-v1/bridge-expected.json'));
  const cases = readJSON('contracts/report-view-v1/cases.json').bridge;
  const { selectFindings, formatBytes, summarize } = await import(pathToFileURL(join(root, 'prototypes/readonly-dashboard/model.mjs')));
  const ids = (opts) => selectFindings(actual.findings, opts).map((f) => f.id);
  assert.deepEqual(ids({ sort: 'size_desc' }), cases.size_desc); assert.deepEqual(ids({ sort: 'size_asc' }), cases.size_asc);
  assert.equal(ids({ tool: 'all' }).length, 8); assert.deepEqual(ids({ tool: 'tool:all' }), cases.tool_all);
  assert.deepEqual(ids({ tool: 'no_tool' }), cases.no_tool); assert.deepEqual(ids({ tool: 'tool:no_tool' }), cases.real_no_tool);
  assert.equal(formatBytes('18446744073709551615'), cases.format_max); assert.deepEqual(summarize(actual.findings), cases.summary); record.bridgeAssertions = 9;
  const harness = join(output, stamp + '-boundaries.exe');
  command(rustc, ['--edition=2024', '--crate-name', 'controller_e_boundaries', '--test', join(root, 'scripts/acceptance/report-view-boundaries.rs'), '-L', 'dependency=' + deps, ...externs, '-o', harness], 180000);
  const independent = command(harness, ['--test-threads=1', '--nocapture']); assert(/4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(independent)); record.independentTests = 4;
} catch (error) { fault = error; }
try { record.after = snapshot(); assert.deepEqual(record.after, record.before); }
catch (error) { fault = fault ? new Error(fault.message + '; ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
const receipt = join(output, stamp + '-result.json'); writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: record.status, receipt, error: record.error, head: expected }, null, 2));
if (fault) process.exitCode = 1;
