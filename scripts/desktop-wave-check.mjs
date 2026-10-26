// Controller-owned gate for wave 3 (desktop wiring). Not an OS sandbox.
// Usage from the task worktree root:
//   node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F1 --mode <mode> [--final]
// Modes: baseline | lock | check | test | real | native | red-nc1 | red-nc2 | red-nc3 | archive
// Task kinds: "service" (packages/water-service, path deps on the four verified crates) and
// "host" (apps/water/host, Tauri 2.12.5 built offline from the wave 1 AC cache through the mirror arguments).
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';

const root = resolve('.'), argv = process.argv.slice(2);
assert.equal(argv[0], '--task', 'Usage: --task <id> --mode <mode> [--final]'); assert.equal(argv[2], '--mode');
const id = argv[1], mode = argv[3], finalGate = argv[4] === '--final'; assert.equal(argv.length, finalGate ? 5 : 4, 'Unexpected arguments');
const MODES = ['baseline', 'lock', 'check', 'test', 'real', 'native', 'red-nc1', 'red-nc2', 'red-nc3', 'archive']; assert(MODES.includes(mode), 'Unknown mode');
const gitRaw = (args, cwd = root) => { const r = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args], {cwd, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 64 * 1024 * 1024}); assert(!r.error && r.status === 0, String(r.stderr)); return r.stdout.trim(); };
const controller = dirname(gitRaw(['rev-parse', '--path-format=absolute', '--git-common-dir']));
const override = process.env.WATER_W3_OVERRIDE_MANIFEST ?? null;
if (override) {
  assert(id.startsWith('WATER-W3-SELFTEST') || id.startsWith('WATER-W3-ACCEPT-'), 'Override manifest is only for controller self-test or acceptance tasks');
  const rel = relative(join(controller, '.local'), resolve(override)); assert(!rel.startsWith('..') && !isAbsolute(rel), 'Override manifest must live under controller .local');
}
const manifestPath = override ? resolve(override) : join(controller, 'docs/dispatch/wave3/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath)), task = manifest.tasks.find(t => t.id === id); assert(task, 'Unknown task');
assert.equal(realpathSync(task.worktree).toLowerCase(), realpathSync(root).toLowerCase(), 'Run from the task worktree root');
assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64'); assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Node 24 required');
assert(['service', 'host'].includes(task.kind), 'Unknown task kind');
assert((task.allowedModes ?? []).includes(mode), 'Mode not assigned to this task');
if (finalGate) assert((task.expectedFinalModes ?? []).includes(mode), 'Mode has no final gate');
if (mode === 'native') assert(finalGate && task.kind === 'host', 'Native runs only as a host final gate');

const hash = b => createHash('sha256').update(b).digest('hex'), json = p => JSON.parse(readFileSync(p));
const env = {...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0'};
// TAURI_* is cleared too: tauri-build merges TAURI_CONFIG into the compiled configuration.
for (const k of Object.keys(env)) if (/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_|WEBVIEW2_|TAURI_)/i.test(k) && k !== 'RUSTUP_AUTO_INSTALL') delete env[k];
function local(p) { const d = join(root, p); const rel = relative(root, d); assert(!rel.startsWith('..') && !isAbsolute(rel)); mkdirSync(d, {recursive: true}); assert(lstatSync(d).isDirectory() && !lstatSync(d).isSymbolicLink()); return d; }
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid, out = local('.local/checks/' + id);
const record = {task: id, kind: task.kind, mode, finalGate, manifest: relative(controller, manifestPath).split(sep).join('/'), startedAt: new Date().toISOString(), realDataRead: false, productTestsRun: false, nativeWindows: 0, directoryDialogs: 0, commands: []}; let seq = 0;
function git(args) { const r = gitRaw(args); record.commands.push({binary: 'git', argv: args, exitCode: 0}); return r; }
function command(binary, args, {timeout = 600000, expected = 0, cwd = root, extraEnv = {}} = {}) {
  const r = spawnSync(binary, args, {cwd, env: {...env, ...extraEnv}, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 256 * 1024 * 1024});
  const log = stamp + '-' + mode + '-' + (++seq) + '.log';
  writeFileSync(join(out, log), JSON.stringify({binary, args, exitCode: r.status, error: r.error?.code ?? null}) + '\n--- stdout ---\n' + (r.stdout ?? '') + '\n--- stderr ---\n' + (r.stderr ?? ''), {flag: 'wx'});
  record.commands.push({binary, argv: args, exitCode: r.status, error: r.error?.code ?? null, log});
  assert(!r.error, 'Command error ' + log); if (expected !== null) assert.equal(r.status, expected, 'Unexpected exit, see ' + log);
  return {status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', text: (r.stdout ?? '') + '\n' + (r.stderr ?? ''), log};
}
const state = () => ({head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all'])});

function audit() {
  assert.equal(git(['branch', '--show-current']), task.branch, 'Wrong branch');
  git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  const changes = [git(['diff', '--no-renames', '--name-only', '-z', task.baseCommit, 'HEAD']), git(['diff', '--no-renames', '--name-only', '-z', 'HEAD']), git(['ls-files', '--others', '--exclude-standard', '-z'])].flatMap(s => s.split('\0').filter(Boolean));
  for (const p of new Set(changes)) assert(task.allowedFiles.includes(p) || task.allowedPrefixes.some(q => p.startsWith(q)), 'Out of scope: ' + p);
  for (const f of [...(manifest.frozenFiles ?? []), ...(task.frozenFiles ?? [])]) assert.equal(hash(readFileSync(join(root, f.path))), f.sha256, 'Frozen file changed: ' + f.path);
  record.changedPaths = [...new Set(changes)].sort();
}

// ---- Rust environment -------------------------------------------------------------------------
const host = task.kind === 'host';
const mirror = host ? json(join(controller, 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json')) : null;
if (host) { const frozen = (manifest.frozenFiles ?? []).find(f => f.path === 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json'); assert(frozen, 'Mirror contract must be frozen'); assert.equal(hash(readFileSync(join(controller, frozen.path))), frozen.sha256, 'Mirror contract changed'); }
// External subcommands (clippy) only receive arguments after their name; same fix as wave 1 scripts/ac-clippy-arguments.mjs.
const cargoArgs = args => !host ? args : args[0] === 'clippy' ? [args[0], ...mirror.cargoArguments, ...args.slice(1)] : [...mirror.cargoArguments, ...args];
const cargoTimeout = host ? 1800000 : 600000;
// cargo metadata would otherwise want every platform's crates; the AC cache holds only what a Windows build fetches.
const platformFilter = host ? ['--filter-platform', 'x86_64-pc-windows-msvc'] : [];
function rustEnv() {
  const rustup = join(homedir(), '.cargo/bin/rustup.exe');
  const cargo = command(rustup, ['which', 'cargo', '--toolchain', '1.95.0']).stdout.trim(), rustc = command(rustup, ['which', 'rustc', '--toolchain', '1.95.0']).stdout.trim();
  assert(isAbsolute(cargo) && isAbsolute(rustc)); assert(command(rustc, ['--version']).stdout.startsWith('rustc 1.95.0 '));
  for (let p = root; ; p = dirname(p)) { for (const n of ['config', 'config.toml']) assert(!existsSync(join(p, '.cargo', n)), 'Unexpected cargo config at ' + p); if (dirname(p) === p) break; }
  const home = local('.local/w3-cargo-home'), target = local('.local/w3-target'), tmp = local('.local/w3-tmp');
  for (const n of ['config', 'config.toml']) assert(!existsSync(join(home, n)));
  if (!existsSync(join(home, 'registry'))) { const src = resolve(task.cargoCacheSource); const rel = relative(controller, src); assert(!rel.startsWith('..') && !isAbsolute(rel)); cpSync(src, join(home, 'registry'), {recursive: true, force: false, errorOnExist: true}); record.cacheCopiedFrom = src; }
  Object.assign(env, {RUSTUP_TOOLCHAIN: '1.95.0', RUSTC: rustc, RUSTDOC: join(dirname(rustc), 'rustdoc.exe'), CARGO_HOME: home, CARGO_TARGET_DIR: target, CARGO_BUILD_JOBS: '1', CARGO_NET_OFFLINE: 'true', CARGO_TERM_COLOR: 'never', TEMP: tmp, TMP: tmp, TMPDIR: tmp});
  const k = Object.keys(env).find(k => k.toLowerCase() === 'path') ?? 'PATH'; env[k] = dirname(rustc) + ';' + (env[k] ?? '');
  return {cargo, rustc, home, target, tmp, manifestArgs: ['--manifest-path', task.outputRoot + '/Cargo.toml']};
}
const ALLOWED_REGISTRY = {itoa: '1.0.18', memchr: '2.8.3', 'proc-macro2': '1.0.107', quote: '1.0.47', serde: '1.0.229', serde_core: '1.0.229', serde_derive: '1.0.229', serde_json: '1.0.151', syn: '3.0.9', 'unicode-ident': '1.0.27', zmij: '1.0.23'};
function lockPackages(path) {
  const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  return text.split('\n[[package]]\n').slice(1).map(block => { const get = k => (block.match(new RegExp('^' + k + ' = "([^"]*)"', 'm')) ?? [])[1] ?? null; return {name: get('name'), version: get('version'), source: get('source'), checksum: get('checksum')}; });
}
function dependencyPolicy(rust) {
  const m = JSON.parse(command(rust.cargo, cargoArgs(['metadata', '--offline', '--locked', '--format-version', '1', ...platformFilter, ...rust.manifestArgs]), {timeout: cargoTimeout}).stdout);
  const p = m.packages.find(p => p.name === task.packageName); assert(p, 'Package name must be ' + task.packageName);
  assert.deepEqual(m.workspace_members, [p.id], 'Workspace must contain only this package');
  assert.equal(p.edition, '2024'); assert(['1.95', '1.95.0'].includes(p.rust_version)); assert.deepEqual(p.publish, []);
  const deps = p.dependencies.map(d => ({name: d.name, req: d.req, kind: d.kind, optional: d.optional, path: d.path ? relative(root, d.path).split(sep).join('/') : null, defaults: d.uses_default_features, features: [...d.features].sort()}));
  assert.deepEqual(deps.sort((a, b) => a.name.localeCompare(b.name)), [...task.expectedDependencies].sort((a, b) => a.name.localeCompare(b.name)), 'Dependencies must match the SPEC exactly');
  for (const q of m.packages.filter(q => !q.source)) { const rel = relative(root, q.manifest_path); assert(!rel.startsWith('..') && !isAbsolute(rel), 'Path package outside the tree: ' + q.name); }
  if (host) {
    const ac = new Map(lockPackages(join(controller, task.referenceLock)).filter(q => q.source).map(q => [q.name + '@' + q.version, q.checksum]));
    const own = lockPackages(join(root, task.outputRoot, 'Cargo.lock')).filter(q => q.source);
    for (const q of own) { assert.equal(q.source, 'registry+https://github.com/rust-lang/crates.io-index', 'Registry source ' + q.name); assert(ac.has(q.name + '@' + q.version), 'Registry package not in the accepted AC lock: ' + q.name + ' ' + q.version); assert.equal(q.checksum, ac.get(q.name + '@' + q.version), 'Checksum differs from the accepted AC lock: ' + q.name); }
    record.registryPackages = own.length;
  } else {
    for (const q of m.packages.filter(q => q.source)) { assert.equal(q.source, 'registry+https://github.com/rust-lang/crates.io-index'); assert.equal(ALLOWED_REGISTRY[q.name], q.version, 'Registry package not allowed: ' + q.name + ' ' + q.version); }
    record.registryPackages = m.packages.filter(q => q.source).length;
  }
  const toml = readFileSync(join(root, task.outputRoot, 'Cargo.toml'), 'utf8');
  for (const n of ['autobins', 'autotests', 'autoexamples', 'autobenches']) assert(new RegExp('^' + n + '\\s*=\\s*false\\s*$', 'm').test(toml), n + ' = false required');
  assert(!/\[dev-dependencies\]/.test(toml), 'No dev-dependencies');
  if (host) assert(existsSync(join(root, task.outputRoot, 'build.rs')), 'Host needs the tauri-build script');
  else { assert(!/^\s*build\s*=/m.test(toml) && !existsSync(join(root, task.outputRoot, 'build.rs')), 'No build script'); assert(!/\[build-dependencies\]/.test(toml), 'No build-dependencies'); }
}
function walkFiles(d) { if (!existsSync(d)) return []; const r = []; for (const n of readdirSync(d)) { const p = join(d, n), s = lstatSync(p); assert(!s.isSymbolicLink()); if (s.isDirectory()) r.push(...walkFiles(p)); else r.push(p); } return r.sort(); }
function sourcePolicy() {
  const src = join(root, task.outputRoot, 'src'), files = walkFiles(src).filter(f => f.endsWith('.rs'));
  const lib = readFileSync(join(src, 'lib.rs'), 'utf8'), native = task.nativeModule ? join(src, task.nativeModule) : null;
  if (native) { assert(existsSync(native), 'Native module missing: ' + task.nativeModule); assert(/#!\[deny\(unsafe_code\)\]/.test(lib), 'lib.rs must deny(unsafe_code)'); assert(/#!\[deny\(unsafe_op_in_unsafe_fn\)\]/.test(readFileSync(native, 'utf8')), 'native module must deny(unsafe_op_in_unsafe_fn)'); }
  else for (const f of [join(src, 'lib.rs'), join(src, 'main.rs')].filter(existsSync)) assert(/#!\[forbid\(unsafe_code\)\]/.test(readFileSync(f, 'utf8')), relative(root, f) + ' must forbid(unsafe_code)');
  for (const f of files) {
    const t = readFileSync(f, 'utf8'), code = t.replace(/\/\/.*$/gm, ''), rel = relative(root, f);
    if (!native || resolve(f) !== resolve(native)) { if (f !== join(src, 'lib.rs')) assert(!/\bunsafe\b/.test(code), 'unsafe outside native module: ' + rel); else assert(!/\bunsafe\s*(\{|fn|impl|extern)/.test(code), 'unsafe code in lib.rs'); }
    assert(!/remove_dir_all/.test(t), 'remove_dir_all is not allowed: ' + rel);
    // Tauri panics on a setup error instead of returning it; wired hosts start up without setup.
    if (task.forbidSetup) assert(!/\.setup\s*\(/.test(code), 'Tauri setup is not allowed: ' + rel);
    assert(!/std::process::Command|Command::new/.test(t), 'Production code must not spawn processes: ' + rel);
    assert(!/std::net|TcpStream|UdpSocket|reqwest|ureq/.test(t), 'No networking: ' + rel);
    assert(!/\bvars(?:_os)?\s*\(/.test(code), 'Environment enumeration not allowed: ' + rel);
    for (const m of code.matchAll(/\bvar(?:_os)?\s*\(\s*([^)]*)\)/g)) assert(task.allowedEnv.includes(m[1].trim()), 'Environment read not allowed: ' + m[1].trim() + ' in ' + rel);
  }
  if (host) {
    const conf = json(join(root, task.outputRoot, 'tauri.conf.json')), cap = json(join(root, task.outputRoot, 'capabilities/main.json'));
    assert.deepEqual(conf, task.expectedConfig, 'tauri.conf.json must equal the SPEC');
    assert.deepEqual(cap, task.expectedCapability, 'capabilities/main.json must equal the SPEC');
  }
}
function capture() {
  const files = [...(task.productionFiles ?? []).filter(p => existsSync(join(root, p))), ...walkFiles(join(root, task.outputRoot, 'src')).map(p => relative(root, p).split(sep).join('/')), ...task.testFiles].filter((v, i, a) => a.indexOf(v) === i).map((path, i) => {
    const b = readFileSync(join(root, path)); const snapshot = stamp + '-' + mode + '-source-' + i + '.txt'; writeFileSync(join(out, snapshot), b, {flag: 'wx'}); return {path, snapshot, sha256: hash(b), test: task.testFiles.includes(path)};
  });
  const digest = xs => hash(Buffer.from(JSON.stringify(xs.map(({path, sha256}) => ({path, sha256})))));
  return {files, productionHash: digest(files.filter(f => !f.test)), testHash: digest(files.filter(f => f.test))};
}
function exactTests(text, names, passed) {
  const found = [...text.matchAll(/^test ([a-z0-9_]+) \.\.\. (?:ok|FAILED)\r?$/gm)].map(m => m[1]);
  assert.deepEqual(found.sort(), [...names].sort(), 'Test names must match exactly');
  assert(text.includes('0 ignored; 0 measured; 0 filtered out'), 'No ignored or filtered tests');
  if (passed) assert(text.includes('test result: ok. ' + names.length + ' passed; 0 failed;'), 'All tests must pass');
}
function proofAudit(current) {
  const all = readdirSync(out).filter(n => n.endsWith('-result.json')).map(file => ({file, data: json(join(out, file))})); record.proofAudit = [];
  for (const label of Object.keys(task.proofTargets ?? {})) {
    const reds = all.filter(({data: r}) => r.mode === 'red-' + label && r.status === 'passed' && r.observedExpectedFailure && r.sourceState?.testHash === current.testHash && r.sourceState.productionHash !== current.productionHash).sort((a, b) => a.file.localeCompare(b.file));
    const red = reds.at(-1); assert(red, 'Missing valid negative control ' + label);
    const next = all.filter(({data: r}) => r.mode.startsWith('red-') && Date.parse(r.startedAt) > Date.parse(red.data.endedAt)).sort((a, b) => a.file.localeCompare(b.file))[0];
    const green = all.filter(({data: r}) => r.mode === 'test' && r.status === 'passed' && r.sourceState?.productionHash === current.productionHash && r.sourceState.testHash === current.testHash && Date.parse(r.startedAt) > Date.parse(red.data.endedAt) && (!next || Date.parse(r.endedAt) < Date.parse(next.data.startedAt))).sort((a, b) => a.file.localeCompare(b.file)).at(-1);
    assert(green, 'Missing immediate exact-byte restore and green test after ' + label);
    for (const x of [red, green]) for (const f of x.data.sourceState.files) assert.equal(hash(readFileSync(join(out, f.snapshot))), f.sha256);
    record.proofAudit.push({label, red: red.file, restored: green.file});
  }
}
function archive() {
  const dest = local(task.evidenceDir + 'receipts'), index = join(root, task.evidenceDir, 'ARCHIVE.json');
  const prior = existsSync(index) ? json(index) : {archive_version: 'water.worker-archive.v1', entries: []}; const known = new Set(prior.entries.map(e => e.archive));
  for (const n of readdirSync(out).sort()) { const from = join(out, n), to = join(dest, n), rel = relative(root, to).split(sep).join('/'); if (known.has(rel)) continue; if (lstatSync(from).isDirectory()) continue; copyFileSync(from, to); const b = readFileSync(to); assert.equal(hash(b), hash(readFileSync(from))); prior.entries.push({source: relative(root, from).split(sep).join('/'), archive: rel, bytes: b.length, sha256: hash(b)}); }
  prior.updatedAt = new Date().toISOString(); prior.files = prior.entries.length; prior.bytes = prior.entries.reduce((n, e) => n + e.bytes, 0); writeFileSync(index, JSON.stringify(prior, null, 2) + '\n');
  const ga = join(root, task.evidenceDir, '.gitattributes'); if (!existsSync(ga)) writeFileSync(ga, '* -text\n.gitattributes text eol=lf\n'); record.archived = {files: prior.files, bytes: prior.bytes};
}
// One owned window per task. Hosts with nativeSteps (wired, F3) are driven through the steps by the
// wired observer and may read real data through the app; afterwards the service store is checked.
async function native(rust) {
  const wired = Array.isArray(task.nativeSteps) && task.nativeSteps.length > 0, maxSeconds = task.nativeMaximumSeconds ?? 60;
  const reservation = join(out, 'native-window-reservation.json'); assert(!existsSync(reservation), 'The one native window for this task is already spent');
  writeFileSync(reservation, JSON.stringify({stamp, windows: 1, directoryDialogs: 0, maximumSeconds: maxSeconds}) + '\n', {flag: 'wx'});
  command(rust.cargo, cargoArgs(['build', '--offline', '--locked', ...rust.manifestArgs, '--bin', task.binName]), {timeout: cargoTimeout});
  const exe = join(rust.target, 'debug', task.binName + '.exe'); assert(existsSync(exe), 'Built executable missing');
  const dataDir = local((task.nativeDataPrefix ?? '.local/w3-f2-native/') + stamp), evidence = join(out, stamp + '-uia.json'), shot = join(out, stamp + '-window.png');
  const steps = join(out, stamp + '-steps.json'); if (wired) writeFileSync(steps, JSON.stringify(task.nativeSteps, null, 2) + '\n', {flag: 'wx'});
  const started = Date.now(), child = spawn(exe, [], {cwd: root, env: {...env, WATER_DATA_DIR: dataDir}, windowsHide: false, stdio: ['ignore', 'pipe', 'pipe']});
  record.nativeWindows = 1; record.nativePid = child.pid; if (task.nativeRealData) record.realDataRead = true;
  let stdout = '', stderr = ''; child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
  const ended = new Promise(ok => child.once('close', (code, signal) => ok({code, signal})));
  try {
    const args = wired
      ? ['-NoProfile', '-NonInteractive', '-File', join(controller, task.nativeObserver), '-TestProcessId', String(child.pid), '-EvidencePath', evidence, '-ShotPrefix', join(out, stamp), '-StepsPath', steps, '-ExpectedExe', exe, '-DataDir', dataDir, '-EvidenceRoot', out, '-Title', task.windowTitle, '-MaximumSeconds', String(maxSeconds)]
      : ['-NoProfile', '-NonInteractive', '-File', join(controller, 'scripts/acceptance/w3-host-native-observe.ps1'), '-TestProcessId', String(child.pid), '-EvidencePath', evidence, '-ScreenshotPath', shot, '-ExpectedExe', exe, '-DataDir', dataDir, '-EvidenceRoot', out, '-Title', task.windowTitle];
    const r = command('powershell.exe', args, {timeout: wired ? (maxSeconds + 60) * 1000 : 90000, expected: null});
    if (existsSync(evidence)) record.native = json(evidence);
    let timer; try { record.nativeExit = await Promise.race([ended, new Promise((_, bad) => { timer = setTimeout(() => bad(Error('Owned desktop exit timeout')), 20000); })]); } finally { clearTimeout(timer); }
    record.nativeWallMs = Date.now() - started;
    assert.equal(r.status, 0, 'Native observer failed; evidence retained');
    assert.deepEqual(record.nativeExit, {code: 0, signal: null}); assert(record.nativeWallMs <= (wired ? (maxSeconds + 90) * 1000 : 120000));
    assert.equal(record.native.systemWindows, 1); assert.equal(record.native.pageAccepted, true); assert.equal(record.native.exitCode, 0);
    assert.equal(record.native.backdropType, 2, 'Mica system backdrop not observed');
    if (wired) {
      assert.equal(record.native.steps.length, task.nativeSteps.length, 'Not every native step ran'); assert(record.native.steps.every(s => s.passed), 'A native step failed');
      assert.deepEqual(record.native.screenshots.map(s => s.name), task.nativeSteps.filter(s => s.shot).map(s => s.shot), 'Native screenshots differ from the steps');
      record.screenshots = record.native.screenshots.map(s => { assert.equal(s.file, stamp + '-' + s.name + '.png'); const f = join(out, s.file); assert(existsSync(f), 'Screenshot missing ' + s.name); return {name: s.name, file: s.file, sha256: hash(readFileSync(f))}; });
    } else { assert(record.native.screenshot && existsSync(shot), 'Own window image missing'); record.screenshotSha256 = hash(readFileSync(shot)); }
    assert.equal(record.native.privateWebviewObserved, true, 'Private WebView data directory not observed');
    assert(existsSync(join(dataDir, 'webview')), 'WebView data directory not under WATER_DATA_DIR');
    const ids = record.native.children.map(p => p.processId); assert(ids.length > 0 && ids.every(n => Number.isInteger(n) && n > 0));
    const filter = ids.map(n => 'ProcessId=' + n).join(' OR ');
    const ps = '$ErrorActionPreference="Stop"; $e=[DateTime]::UtcNow.AddSeconds(5); do { $r=@(Get-CimInstance Win32_Process -Filter "' + filter + '"); if($r.Count -eq 0){break}; Start-Sleep -Milliseconds 100 } while([DateTime]::UtcNow -lt $e); [ordered]@{remaining=@($r | Select-Object ProcessId,Name)} | ConvertTo-Json -Depth 4 -Compress';
    record.childClose = JSON.parse(command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {timeout: 20000}).stdout.trim()); assert.equal(record.childClose.remaining.length, 0, 'WebView child processes still running');
    if (task.nativeStore) {
      // The read-only checkup leaves exactly its scan record and snapshot: no plan, clean record or journal.
      const top = readdirSync(dataDir).sort(); for (const n of top) assert(task.nativeStore.allowedTop.includes(n), 'Unexpected entry in the data directory: ' + n);
      record.nativeStore = {top, counts: {}};
      for (const [dir, n] of Object.entries(task.nativeStore.counts)) { const d = join(dataDir, dir), count = existsSync(d) ? readdirSync(d).length : 0; record.nativeStore.counts[dir] = count; assert.equal(count, n, 'Service store ' + dir + ' holds ' + count + ' entries, expected ' + n); }
    }
  } finally {
    if (child.exitCode === null) record.ownedTerminationRequested = child.kill();
    writeFileSync(join(out, stamp + '-native-process.json'), JSON.stringify({pid: child.pid, stdout, stderr, exit: record.nativeExit ?? null, terminationRequested: record.ownedTerminationRequested ?? false}) + '\n', {flag: 'wx'});
  }
}

let fault;
try {
  audit(); record.before = state(); if (finalGate) assert.equal(record.before.status, '', 'Final gates need a clean committed tree');
  if (mode === 'baseline') {
    assert.deepEqual(record.before, {head: task.baseCommit, status: ''}, 'Baseline runs on the untouched base commit');
    if (task.outputRootExists) assert(existsSync(join(root, task.outputRoot, 'Cargo.lock')), 'Verified output root missing');
    else assert(!existsSync(join(root, task.outputRoot)), 'Output root must not exist yet');
    for (const f of task.mustRead) assert(existsSync(join(root, f)), 'Missing required reading ' + f);
    const rust = rustEnv(); const cacheRoot = join(rust.home, 'registry', 'cache'); const cache = new Set(readdirSync(cacheRoot).flatMap(d => readdirSync(join(cacheRoot, d))));
    // The AC lock also lists other-platform crates that a Windows build never fetches; the offline build in lock/check is the full proof.
    const reference = host ? lockPackages(join(controller, task.referenceLock)).filter(q => q.source).map(q => q.name + '-' + q.version + '.crate') : [];
    const needed = host ? ['tauri-2.12.5', 'tauri-build-2.7.4', 'tauri-runtime-wry', 'wry', 'webview2-com', 'window-vibrancy-0.8.1', 'serde-1.0.229', 'serde_json-1.0.151'].map(k => reference.find(c => c.startsWith(k + (k.match(/-\d/) ? '' : '-')))) : Object.entries(ALLOWED_REGISTRY).map(([n, v]) => n + '-' + v + '.crate');
    for (const c of needed) assert(c && cache.has(c), 'Offline cache lacks ' + c);
    record.offlineCache = {required: needed.length, referencePresent: reference.filter(c => cache.has(c)).length, referenceTotal: reference.length};
    if (host) { assert(existsSync(join(root, 'apps/water/ui/index.html')), 'Verified UI missing'); record.nativeHelper = existsSync(join(controller, task.nativeObserver ?? "scripts/acceptance/w3-host-native-observe.ps1")); }
    record.meaning = task.outputRootExists ? 'Environment and verified inputs only; no change made yet' : 'Environment and inputs only; no product exists yet';
  } else if (mode === 'archive') { archive(); }
  else {
    const rust = rustEnv();
    if (mode === 'lock') {
      assert(!finalGate); assert(existsSync(join(root, task.outputRoot, 'Cargo.toml')));
      const lock = join(root, task.outputRoot, 'Cargo.lock');
      if (host) {
        // Seed from the accepted AC lock so every registry version stays identical; cargo then only adds this package and its path crates.
        if (!existsSync(lock)) { copyFileSync(join(controller, task.referenceLock), lock); record.lockSeededFrom = task.referenceLock; }
        command(rust.cargo, cargoArgs(['metadata', '--offline', '--format-version', '1', ...platformFilter, ...rust.manifestArgs]), {timeout: cargoTimeout});
      } else if (!existsSync(lock)) command(rust.cargo, cargoArgs(['generate-lockfile', '--offline', ...rust.manifestArgs]), {timeout: cargoTimeout});
      dependencyPolicy(rust);
    }
    else {
      record.sourceState = capture(); dependencyPolicy(rust); sourcePolicy();
      if (mode === 'check') { command(rust.cargo, ['fmt', ...rust.manifestArgs, '--', '--check']); command(rust.cargo, cargoArgs(['clippy', '--offline', '--locked', ...rust.manifestArgs, '--all-targets', '--', '-D', 'warnings']), {timeout: cargoTimeout}); }
      else if (mode === 'test' || mode.startsWith('red-')) {
        const red = mode.startsWith('red-');
        if (red) { assert(!finalGate); assert(task.proofTargets?.[mode.slice(4)], 'No such negative control'); assert.notEqual(git(['diff', '--name-only', 'HEAD', '--', task.outputRoot + '/src']), '', 'A negative control needs an uncommitted change under ' + task.outputRoot + '/src'); assert.equal(git(['diff', '--name-only', 'HEAD', '--', ...task.testFiles]), '', 'Negative controls must not edit tests'); }
        if (finalGate) proofAudit(record.sourceState);
        const r = command(rust.cargo, cargoArgs(['test', '--offline', '--locked', ...rust.manifestArgs, '--test', task.testTarget, '--', '--test-threads=1']), {expected: red ? 101 : 0, timeout: cargoTimeout});
        exactTests(r.text, task.expectedTests, !red); record.productTestsRun = true;
        if (red) { assert(!/could not compile|error\[E\d+\]|panicked at .*(timeout|timed out)/i.test(r.text), 'Compilation or timeout failures are not proof'); const target = task.proofTargets[mode.slice(4)]; assert(r.text.includes(target), 'Missing failure token ' + target); record.observedExpectedFailure = true; record.expectation = {target}; }
      } else if (mode === 'real') {
        assert.equal(task.realMode, 'service-smoke', 'This task has no real mode');
        const dataDir = local('.local/w3-f1-real/' + stamp);
        const r = command(rust.cargo, cargoArgs(['run', '--offline', '--locked', ...rust.manifestArgs, '--example', 'service_smoke', '--', dataDir]), {timeout: 1800000});
        assert(!/[A-Za-z]:\\\\/.test(r.stdout) && !/[A-Za-z]:\\[^"\\]/.test(r.stdout), 'Real smoke output must not contain absolute paths');
        record.realDataRead = true; record.realSummary = JSON.parse(r.stdout.trim().split('\n').at(-1));
      } else if (mode === 'native') { await native(rust); }
    }
  }
} catch (e) { fault = e; }
try { audit(); record.after = state(); if (record.before && mode !== 'archive') assert.equal(record.after.head, record.before.head, 'HEAD changed during the gate'); if (finalGate) assert.equal(record.after.status, '', 'Gate left the tree dirty'); } catch (e) { fault ??= e; }
record.status = fault ? 'failed' : 'passed'; record.error = fault?.stack ?? null; record.endedAt = new Date().toISOString();
const receipt = join(out, stamp + '-' + mode + '-result.json'); writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({task: id, mode, finalGate, status: record.status, error: record.error?.split('\n')[0] ?? null, receipt})); if (fault) process.exitCode = 1;
