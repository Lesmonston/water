// Controller-hosted supplement. Invoke this absolute path from the original W tree.
// Old frozen helpers remain unchanged and still enforce the complete five tests.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const controller = resolve(dirname(fileURLToPath(import.meta.url)), '..'), root = resolve('.');
const args = process.argv.slice(2), modes = ['resume', 'regression', 'red-budget', 'suite', 'red-behavior', 'red-nc1', 'red-nc2', 'red-nc3', 'check', 'test', 'browser'];
assert.equal(args[0], '--task'); assert.equal(args[1], 'WATER-W1-W'); assert.equal(args[2], '--mode');
const mode = args[3], finalGate = args[4] === '--final';
assert(modes.includes(mode)); assert.equal(args.length, finalGate ? 5 : 4);
assert(!finalGate || ['check', 'test', 'browser'].includes(mode));
const json = p => JSON.parse(readFileSync(p, 'utf8')), hash = b => createHash('sha256').update(b).digest('hex');
const task = json(join(controller, 'docs/dispatch/wave1/manifest.json')).tasks.find(t => t.id === 'WATER-W1-W');
const addendum = task.addendum01;
assert(addendum && realpathSync(root).toLowerCase() === realpathSync(task.worktree).toLowerCase());
const lockBytes = readFileSync(join(controller, addendum.contractLock)), lock = JSON.parse(lockBytes);
assert.equal(hash(lockBytes), addendum.lockSha256);
const out = join(root, '.local/checks/WATER-W1-W-ADDENDUM-01');
mkdirSync(out, {recursive: true});
const outputRelative = relative(realpathSync(root), realpathSync(out));
assert(!outputRelative.startsWith('..') && !isAbsolute(outputRelative));
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const record = {task: task.id, addendum: '01', mode, finalGate, startedAt: new Date().toISOString(),
  systemNativeDialogsLaunched: 0, physicalFixtureAccess: false, commands: []};
const env = {...process.env, GIT_OPTIONAL_LOCKS: '0'};
for (const k of Object.keys(env)) if (/^(?:NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k)) delete env[k];
let sequence = 0;
function command(binary, argv, expected = 0) {
  const x = spawnSync(binary, argv, {cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 180000, maxBuffer: 32 * 1024 * 1024});
  const item = {binary, argv, exitCode: x.status, error: x.error?.code ?? null, log: stamp + '-' + mode + '-' + (++sequence) + '.log'};
  writeFileSync(join(out, item.log), JSON.stringify(item) + '\n--- stdout ---\n' + (x.stdout ?? '') + '\n--- stderr ---\n' + (x.stderr ?? ''), {flag: 'wx'});
  record.commands.push(item);
  assert.equal(x.error, undefined, item.log); assert.equal(x.status, expected, item.log);
  return x.stdout;
}
const git = argv => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv]).trim();
const state = () => ({head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all'])});
function audit() {
  assert.equal(git(['branch', '--show-current']), task.branch);
  git(['merge-base', '--is-ancestor', addendum.resumeCommit, 'HEAD']);
  for (const p of lock.inheritedLocks) for (const f of json(join(controller, p)).files) {
    assert.equal(hash(readFileSync(join(controller, f.path))), f.sha256, f.path);
    assert.equal(hash(readFileSync(join(root, f.path))), f.sha256, f.path);
  }
  for (const f of lock.files) assert.equal(hash(readFileSync(join(controller, f.path))), f.sha256, f.path);
  for (const f of lock.preservedSubmissionFiles) assert.equal(hash(readFileSync(join(root, f.path))), f.sha256, f.path);
  const changed = [git(['diff', '--name-only', '-z', addendum.resumeCommit, 'HEAD']), git(['diff', '--name-only', '-z', 'HEAD']), git(['ls-files', '--others', '--exclude-standard', '-z'])].flatMap(t => t.split('\0').filter(Boolean));
  const allowed = ['prototypes/native-review/model.mjs', 'prototypes/native-review/tests/model.test.mjs', addendum.report];
  const temporary = {'red-behavior': 'server.mjs', 'red-nc1': 'server.mjs', 'red-nc2': 'app.mjs', 'red-nc3': 'host.mjs'}[mode];
  if (temporary) allowed.push('prototypes/native-review/' + temporary);
  for (const p of changed) assert(allowed.includes(p) || p.startsWith(addendum.evidencePrefix), 'Supplement scope: ' + p);
}
function capture() {
  const files = [...task.productionFiles, ...task.testFiles].map((path, i) => {
    const bytes = readFileSync(join(root, path)); assert(bytes.length <= 1024 * 1024);
    const snapshot = stamp + '-' + mode + '-source-' + i + '.txt';
    writeFileSync(join(out, snapshot), bytes, {flag: 'wx'});
    return {path, sha256: hash(bytes), snapshot, test: task.testFiles.includes(path)};
  });
  const digest = entries => hash(Buffer.from(JSON.stringify(entries.map(({path, sha256}) => ({path, sha256})))));
  return {files, productionHash: digest(files.filter(f => !f.test)), testHash: digest(files.filter(f => f.test))};
}
function budget(expected) {
  const stdout = command(process.execPath, [join(controller, 'scripts/acceptance/native-review-budget-probe.mjs')], expected);
  const result = JSON.parse(stdout);
  assert.equal(result.target, 'W_DIR_BUDGET');
  assert.equal(result.positiveNativeCases, 8); assert.equal(result.legacySnapshots, 24);
  assert.equal(result.positiveMutations, 2); assert.equal(result.observations.length, 12);
  if (expected === 0) assert.equal(result.failures.length, 0);
  else assert(result.failures.length > 0 && result.failures.every(f => f.startsWith('W_DIR_BUDGET:')));
  record.budgetProbe = result;
}
function budgetProof(current) {
  const all = readdirSync(out).filter(n => n.endsWith('-result.json')).map(file => ({file, data: json(join(out, file))}));
  const red = all.filter(({data:r}) => r.mode === 'red-budget' && r.status === 'passed' && r.observedExpectedFailure && r.sourceState?.testHash === current.testHash && r.sourceState.productionHash !== current.productionHash).sort((a,b) => a.file.localeCompare(b.file)).at(-1);
  assert(red, 'Missing stable W_DIR_BUDGET production negative');
  const green = all.filter(({data:r}) => ['regression', 'suite'].includes(r.mode) && r.status === 'passed' && r.budgetProbe?.failures.length === 0 && r.sourceState?.testHash === current.testHash && r.sourceState.productionHash === current.productionHash && Date.parse(r.startedAt) > Date.parse(red.data.endedAt)).sort((a,b) => a.file.localeCompare(b.file)).at(-1);
  assert(green, 'Missing current-byte budget restore');
  for (const x of [red, green]) for (const f of x.data.sourceState.files) assert.equal(hash(readFileSync(join(out, f.snapshot))), f.sha256);
  record.budgetProof = {red: red.file, restored: green.file};
}
let fault;
try {
  audit(); record.before = state(); record.sourceState = capture();
  if (mode === 'resume') {
    assert.deepEqual(record.before, {head: addendum.resumeCommit, status: ''});
    budget(1);
    assert.equal(record.budgetProbe.failures.length, 12);
    record.knownRegressionExpected = true;
    record.productPassClaimed = false;
  } else if (mode === 'red-budget') {
    budget(1); record.observedExpectedFailure = true;
  } else {
    if (finalGate) { assert.equal(record.before.status, ''); budgetProof(record.sourceState); }
    if (mode !== 'regression') command(process.execPath, [join(root, 'scripts/native-host-check.mjs'), '--task', task.id, '--mode', mode, ...(finalGate ? ['--final'] : [])]);
    if (!mode.startsWith('red-')) budget(0);
  }
} catch (e) { fault = e; }
try {
  audit(); record.after = state();
  if (record.before) assert.equal(record.after.head, record.before.head);
  if (finalGate) assert.equal(record.after.status, '');
} catch (e) { fault ??= e; }
Object.assign(record, {endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null});
const receipt = join(out, stamp + '-' + mode + '-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...record, commands: record.commands.length, receipt}));
if (fault) process.exitCode = 1;
