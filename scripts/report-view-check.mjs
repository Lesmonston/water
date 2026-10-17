// Controller-owned focused gate; policy checks, not an OS sandbox.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const finalGate = args[4] === '--final', mode = args[3];
assert.equal(args[0], '--task'); assert.equal(args[1], 'WATER-W1-E'); assert.equal(args[2], '--mode');
assert(args.length === (finalGate ? 5 : 4));
assert(['baseline', 'lock', 'fmt', 'test', 'clippy', 'metadata', 'bridge'].includes(mode));
assert(!finalGate || !['baseline', 'lock'].includes(mode));
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
const task = mainManifest.tasks.find((t) => t.id === 'WATER-W1-E'); assert(task);
const same = (a, b) => realpathSync(a).toLowerCase() === realpathSync(b).toLowerCase();
assert(same(root, task.worktree) && same(root, process.cwd()));
const within = (base, path) => { const rel = relative(realpathSync(base), realpathSync(path)); assert(!rel.startsWith('..') && !isAbsolute(rel)); };
within(controller, root);
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const frozen = JSON.parse(readFileSync(join(controller, task.contractLock), 'utf8'));
function audit() {
  assert.equal(git(['branch', '--show-current']), task.branch); git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  for (const f of frozen.files) assert.equal(sha(join(root, f.path)), f.sha256, 'Frozen file changed: ' + f.path);
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
output = local('.local/checks/WATER-W1-E');
const home = local('.local/report-view-cargo-home'), target = local('.local/report-view-target'), temp = local('.local/report-view-tmp');
for (let path = root;; path = dirname(path)) {
  for (const name of ['config', 'config.toml']) assert(!existsSync(join(path, '.cargo', name)), 'Unapproved ancestor Cargo configuration');
  if (dirname(path) === path) break;
}
for (const name of ['config', 'config.toml']) assert(!existsSync(join(home, name)));
const record = { task: task.id, mode, finalGate, startedAt: new Date().toISOString(), before, node: process.version, commands,
  productTestsRun: false, scannerExecuted: false, frozenFiles: frozen.files.length };
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
  if (mode === 'baseline') {
    const source = join(output, stamp + '-probe.rs'), binary = join(output, stamp + '-probe.exe');
    writeFileSync(source, 'fn main() { println!("water-report-view-probe-ok"); }\n', { flag: 'wx' });
    command(rustc, ['--edition=2024', '--crate-name', 'water_view_probe', source, '-o', binary], 180000);
    assert.equal(command(binary, []), 'water-report-view-probe-ok');
    const meta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--no-deps', '--format-version', '1']));
    assert.equal(meta.workspace_members.length, 1); assert.equal(meta.packages[0].name, 'water-contracts');
    const cases = JSON.parse(readFileSync(join(root, 'contracts/report-view-v1/cases.json'), 'utf8'));
    assert.equal(cases.golden_cases.length, 4); assert.equal(cases.raw_cases.length, 6); assert.equal(cases.constructed_cases.length, 4);
    record.assets = { goldenCases: 4, rawCases: 6, constructedCases: 4, productImplemented: false };
  } else {
    const manifest = join(root, 'packages/report-view/Cargo.toml'); assert(existsSync(manifest));
    const text = readFileSync(manifest, 'utf8'); assert(!/\[(?:patch|replace)(?:[.\]])|^\s*(?:git|registry|build|rustc-wrapper|runner)\s*=/mi.test(text));
    const cargoArgs = ['--manifest-path', manifest];
    if (mode === 'lock') { assert.equal(task.allowLockfileGeneration, true); command(cargo, ['generate-lockfile', '--offline', ...cargoArgs], 180000); }
    const meta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--format-version', '1', ...cargoArgs], 180000));
    assert.equal(meta.workspace_members.length, 1);
    const pkg = meta.packages.find((p) => p.name === 'water-report-view'); assert(pkg && pkg.version === '0.1.0');
    assert(meta.workspace_members.includes(pkg.id)); assert.equal(pkg.edition, '2024'); assert(['1.95', '1.95.0'].includes(pkg.rust_version)); assert.deepEqual(pkg.publish, []);
    assert.equal(pkg.targets.length, 2); assert(pkg.targets.some((t) => t.name === 'water_report_view' && t.kind.includes('lib')));
    assert(pkg.targets.some((t) => t.name === 'view_v1' && t.kind.includes('test'))); assert(pkg.targets.every((t) => !t.kind.includes('custom-build')));
    assert.equal(pkg.dependencies.length, 3); assert(pkg.dependencies.every((d) => d.kind === null));
    for (const [name, req] of [['serde', '=1.0.229'], ['serde_json', '=1.0.151']]) assert.equal(pkg.dependencies.find((d) => d.name === name)?.req, req);
    assert.deepEqual(pkg.dependencies.find((d) => d.name === 'serde').features, ['derive']);
    assert.deepEqual(pkg.dependencies.find((d) => d.name === 'serde_json').features, []);
    assert(pkg.dependencies.every((d) => d.optional === false && d.uses_default_features === true));
    const a = pkg.dependencies.find((d) => d.name === 'water-contracts'); assert(a && a.path && same(a.path, join(root, 'crates/water-contracts')));
    const lockEntries = (path) => readFileSync(path, 'utf8').split('[[package]]').map((block) => ({ name: /^name = "([^"]+)"/m.exec(block)?.[1], version: /^version = "([^"]+)"/m.exec(block)?.[1], source: /^source = "([^"]+)"/m.exec(block)?.[1], checksum: /^checksum = "([^"]+)"/m.exec(block)?.[1] }));
    const locked = lockEntries(join(root, 'Cargo.lock')), ownLock = lockEntries(join(root, 'packages/report-view/Cargo.lock'));
    for (const p of meta.packages.filter((p) => p.source !== null)) {
      const actual = ownLock.find((l) => l.name === p.name && l.version === p.version && l.source === p.source);
      assert(actual && locked.some((l) => l.name === actual.name && l.version === actual.version && l.source === actual.source && l.checksum === actual.checksum), 'Unapproved registry version/checksum: ' + p.name);
    }
    if (mode === 'fmt') command(cargo, ['fmt', ...cargoArgs, '--', '--check'], 180000);
    if (mode === 'test') {
      record.productTestsRun = true;
      const result = command(cargo, ['test', '--offline', '--locked', ...cargoArgs, '-p', 'water-report-view', '--test', 'view_v1', '--', '--test-threads=1', '--format', 'pretty'], 180000);
      assert.deepEqual([...result.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map((m) => m[1]).sort(), [...task.expectedTests].sort());
      assert(/5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(result)); record.executedTests = 5;
    }
    if (mode === 'clippy') command(cargo, ['clippy', '--offline', '--locked', ...cargoArgs, '-p', 'water-report-view', '--all-targets', '--', '-D', 'warnings'], 180000);
    if (mode === 'bridge') {
      record.productTestsRun = true;
      command(cargo, ['build', '--offline', '--locked', ...cargoArgs, '-p', 'water-report-view', '--lib'], 180000);
      const deps = join(target, 'debug/deps'), externs = ['water_report_view', 'serde_json'].flatMap((name) => {
        const files = readdirSync(deps).filter((p) => p.startsWith('lib' + name + '-') && p.endsWith('.rlib')); assert.equal(files.length, 1);
        return ['--extern', name + '=' + join(deps, files[0])];
      });
      const binary = join(output, stamp + '-bridge.exe');
      command(rustc, ['--edition=2024', '--crate-name', 'controller_report_view_bridge', join(root, 'scripts/acceptance/report-view-bridge.rs'), '-L', 'dependency=' + deps, ...externs, '-o', binary], 180000);
      const actual = JSON.parse(command(binary, []));
      const expected = JSON.parse(readFileSync(join(root, 'contracts/report-view-v1/bridge-expected.json'), 'utf8')); assert.deepEqual(actual, expected);
      const cases = JSON.parse(readFileSync(join(root, 'contracts/report-view-v1/cases.json'), 'utf8')).bridge;
      const { selectFindings, formatBytes, summarize } = await import(pathToFileURL(join(root, 'prototypes/readonly-dashboard/model.mjs')));
      const ids = (options) => selectFindings(actual.findings, options).map((f) => f.id);
      assert.deepEqual(ids({ sort: 'size_desc' }), cases.size_desc); assert.deepEqual(ids({ sort: 'size_asc' }), cases.size_asc);
      assert.equal(ids({ tool: 'all' }).length, 8); assert.deepEqual(ids({ tool: 'tool:all' }), cases.tool_all);
      assert.deepEqual(ids({ tool: 'no_tool' }), cases.no_tool); assert.deepEqual(ids({ tool: 'tool:no_tool' }), cases.real_no_tool);
      assert.equal(formatBytes('18446744073709551615'), cases.format_max); assert.deepEqual(summarize(actual.findings), cases.summary);
      record.bridge = { status: 'passed', actualRustProjection: true, cModelUsed: true, assertions: 9, uiConnected: false };
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
