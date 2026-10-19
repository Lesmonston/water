// Controller review of the submitted V implementation; never executes UI tests.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {rustEnvironment} from '../next-core-runtime.mjs';

const controller = resolve('.'), root = join(controller, '.worktrees/review-v-20261019');
const implementation = '30875645f03ddc01019eb4b3cb00f9ab7d1c068d';
const out = join(controller, '.local/checks/controller-vw-receipt-20261019');
mkdirSync(out, {recursive: true});
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const record = {startedAt: new Date().toISOString(), implementation, root, nativeDialogsLaunched: 0, commands: []};
const env = {...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0'};
for (const key of Object.keys(env)) if (/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(key) && key !== 'RUSTUP_AUTO_INSTALL') delete env[key];
const hash = b => createHash('sha256').update(b).digest('hex');
const same = (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase();
const within = (base, path) => assert(resolve(path).toLowerCase().startsWith(resolve(base).toLowerCase() + '\\'));
let seq = 0;
function command(binary, argv, timeout = 30000, expected = 0, input) {
  const x = spawnSync(binary, argv, {cwd: root, env, input, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024});
  const item = {binary, argv, exitCode: x.status, error: x.error?.code ?? null, log: stamp + '-no-ui-' + (++seq) + '.log'};
  writeFileSync(join(out, item.log), JSON.stringify(item) + '\n--- stdout ---\n' + (x.stdout ?? '') + '\n--- stderr ---\n' + (x.stderr ?? ''), {flag: 'wx'});
  record.commands.push(item);
  assert.equal(x.error, undefined, item.log);
  assert.equal(x.status, expected, item.log + '\n' + (x.stderr ?? ''));
  return (x.stdout ?? '').trim();
}
const git = args => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args]);
try {
  assert.equal(git(['rev-parse', 'HEAD']), implementation);
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '');
  const task = JSON.parse(readFileSync(join(controller, 'docs/dispatch/wave1/manifest.json'))).tasks.find(t => t.id === 'WATER-W1-V');
  const local = p => { const dir = join(root, p); within(root, dir); mkdirSync(dir, {recursive: true}); return dir; };
  const ctx = {root, controller, env, command, record, task, local, same, within};
  const rust = rustEnvironment(ctx), args = ['--manifest-path', 'packages/native-session/Cargo.toml'];
  command(rust.cargo, ['fmt', ...args, '--', '--check'], 180000);
  command(rust.cargo, ['clippy', '--offline', '--locked', ...args, '--all-targets', '--', '-D', 'warnings'], 180000);
  const artifacts = rust.build('packages/native-session/Cargo.toml', 'water-native-session', ['water_native_session', 'water_contracts', 'water_scope_registry', 'water_native_picker', 'water_native_scan', 'serde_json']);
  const proofCases = [
    ['fn main() { fn traits<T: std::fmt::Debug + Clone + PartialEq>() {} traits::<SessionCapture>(); let _: fn(&SessionCapture)->Result<String,SessionError> = to_json; }', null],
    ['fn main() { fn f(c: &SessionCapture) { let _ = &c.snapshots; } }', 'E0616'],
    ['fn main() { fn f(c: &mut SessionCapture) { c.read_only = false; } }', 'E0616'],
    ['fn main() { fn f(c: &mut SessionCapture) { c.policy.ordinary_content_read = true; } }', 'E0616'],
    ['fn main() { let _ = SessionCapture {}; }', 'private'],
    ['fn main() { let _: SessionCapture = Default::default(); }', 'E0277'],
    ['fn main() { let _ = serde_json::from_str::<SessionCapture>("{}"); }', 'E0277'],
    ['fn main() { let _ = SessionCapture::new(); }', 'E0599'],
    ['fn main() { fn f(_: water_scope_registry::v1::Registry) { let _ = capture_session; } }', null],
  ];
  record.compileProofs = [];
  for (const [i, [body, error]] of proofCases.entries()) {
    const argv = ['--edition=2024', '--crate-name', 'controller_session_proof', '--emit=metadata', '-L', 'dependency=' + rust.deps,
      ...artifacts.flatMap(a => ['--extern', a.crate + '=' + a.filename]), '-o', join(rust.tmp, stamp + '-' + i + '.rmeta'), '-'];
    const src = '#![forbid(unsafe_code)]\nuse water_native_session::v1::*;\n' + body;
    command(rust.rustc, argv, 30000, error ? 1 : 0, src);
    const log = readFileSync(join(out, record.commands.at(-1).log), 'utf8');
    if (error) assert(log.includes(error), error);
    record.compileProofs.push({case: i, source: src, expectedDiagnostic: error, passed: true});
  }
  command(rust.cargo, ['build', '--offline', '--locked', ...args, '--bin', 'water-native-session'], 180000);
  const binary = join(rust.target, 'debug/water-native-session.exe');
  record.cliNoDialogCases = [];
  for (const [argv, code, stderr] of [[[], 64, 'InvalidArguments at /native_session\n'], [['private-one', 'private-two'], 64, 'InvalidArguments at /native_session\n'], [['private-relative'], 2, null]]) {
    command(binary, argv, 5000, code);
    const log = readFileSync(join(out, record.commands.at(-1).log), 'utf8');
    const actualOut = log.split('--- stdout ---\n')[1].split('\n--- stderr ---\n')[0];
    const actualError = log.split('\n--- stderr ---\n')[1];
    assert.equal(actualOut, '');
    if (stderr) assert.equal(actualError, stderr);
    else assert(!actualError.includes('private-relative') && actualError.trim().split(/\r?\n/).length === 1);
    record.cliNoDialogCases.push({argumentCount: argv.length, exitCode: code, fixedSanitizedError: true});
  }
  const lock = JSON.parse(readFileSync(join(controller, 'contracts/native-host-batch-v1/freeze.lock.json'))), frozen = new Map();
  for (const p of [...lock.inheritedLocks, 'contracts/native-host-batch-v1/freeze.lock.json']) for (const f of JSON.parse(readFileSync(join(controller, p))).files) frozen.set(f.path, f.sha256);
  for (const [p, expected] of frozen) assert.equal(hash(readFileSync(join(root, p))), expected, p);
  record.frozenFiles = frozen.size;
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '');
  record.status = 'passed';
} catch (error) {
  record.status = 'failed'; record.error = error.message; process.exitCode = 1;
} finally {
  record.endedAt = new Date().toISOString();
  const receipt = join(out, stamp + '-no-ui-result.json');
  writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...record, commands: record.commands.length, receipt}));
}
