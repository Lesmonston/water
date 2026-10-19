// Controller-only V/W readiness and byte-preserving evidence archive. No workers.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {auditNativeCases} from './audit-native-session-cases.mjs';

const root = resolve('.');
const checkpoint = '22778e76ae7f45f9174f171794f41673b3647d0e';
const base = '30a803537602211ed2a11c106c63fd27cefb260f';
const tag = 'water-w1-native-host-base-20261019';
const mp = 'docs/dispatch/wave1/manifest.json', rp = 'docs/dispatch/registry.json';
const lockPath = 'contracts/native-host-batch-v1/freeze.lock.json';
const archiveRoot = 'docs/acceptance/wave1/controller/w1-native-host-preflight-20261019';
const readyReport = 'docs/dispatch/wave1/NATIVE-HOST-READY-REPORT.md';
const prefixes = {v: '2026-10-19T02-18-01.278Z-12416', w: '2026-10-19T02-18-01.280Z-26808'};
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = p => sha(readFileSync(p));
const slash = p => p.replaceAll('\\', '/');
function git(args, cwd = root, encoding = 'utf8') {
  const result = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args], {
    cwd, encoding, windowsHide: true, maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.status, 0, String(result.stderr));
  return encoding ? result.stdout.trim() : result.stdout;
}
function oldDocument(path) { return JSON.parse(git(['show', checkpoint + ':' + path])); }
function baselinePath(lane) {
  return '.worktrees/' + lane + '/.local/checks/WATER-W1-' + lane.toUpperCase() + '/' + prefixes[lane] + '-baseline-result.json';
}
function auditInputs(requireReady) {
  const m = json(mp), r = json(rp), lock = json(lockPath);
  assert.equal(git(['rev-parse', tag]), base);
  assert.equal(git(['branch', '--show-current']), 'main');
  assert.equal(hash(lockPath), sha(git(['show', base + ':' + lockPath], root, null)));
  assert.equal(lock.files.length, 104);
  assert.equal(lock.inheritedLocks.length, 13);
  const prior = new Map(), union = new Map();
  function add(map, f) {
    if (map.has(f.path)) assert.equal(map.get(f.path), f.sha256, f.path);
    map.set(f.path, f.sha256);
  }
  for (const p of lock.inheritedLocks) for (const f of json(p).files) add(prior, f);
  for (const [path, sha256] of prior) add(union, {path, sha256});
  for (const f of lock.files) add(union, f);
  assert.equal(prior.size, 291);
  assert.equal(union.size, 336);
  for (const tree of [root, join(root, '.worktrees/v'), join(root, '.worktrees/w')]) {
    assert.equal(hash(join(tree, lockPath)), hash(lockPath));
    for (const [p, expected] of union) assert.equal(hash(join(tree, p)), expected, tree + ':' + p);
    for (const out of ['packages/native-session', 'prototypes/native-review']) assert(!existsSync(join(tree, out)), out);
  }
  const oldM = oldDocument(mp), oldR = oldDocument(rp);
  assert.equal(oldM.tasks.length, 21);
  assert.equal(oldR.tasks.length, 21);
  assert.equal(oldR.slots.length, 21);
  assert.deepEqual(m.tasks.slice(0, 21), oldM.tasks);
  assert.deepEqual(r.tasks.slice(0, 21), oldR.tasks);
  assert.deepEqual(r.slots.slice(0, 21), oldR.slots);
  assert.equal(m.tasks.length, 23);
  assert.equal(r.tasks.length, 23);
  assert.equal(r.slots.length, 23);
  const defs = json('contracts/native-host-batch-v1/TESTS.json').tasks;
  const baselines = {};
  for (const lane of ['v', 'w']) {
    const id = 'WATER-W1-' + lane.toUpperCase(), t = m.tasks.find(t => t.id === id);
    assert.deepEqual(t, r.tasks.find(t => t.id === id));
    assert.equal(t.baseCommit, base);
    assert.equal(t.contractLock, lockPath);
    assert.equal(git(['rev-parse', 'HEAD'], t.worktree), base);
    assert.equal(git(['branch', '--show-current'], t.worktree), t.branch);
    assert.equal(git(['status', '--porcelain', '--untracked-files=all'], t.worktree), '');
    assert.deepEqual(t.expectedTests, defs[id].tests);
    assert.deepEqual(t.expectedBrowserTests, defs[id].browser_tests ?? []);
    assert.equal(t.expectedTests.length + t.expectedBrowserTests.length, 5);
    assert.deepEqual(t.expectedFinalModes, defs[id].final_modes);
    assert.deepEqual(t.proofTargets, defs[id].proof_targets);
    for (const dep of t.dependsOn) assert.equal(m.tasks.find(x => x.id === dep)?.status, 'VERIFIED', dep);
    for (const p of [t.ticket, t.helper, t.workerRules, t.spec]) assert(existsSync(p), p);
    assert(existsSync(join(t.worktree, dirname(t.report))));
    assert(existsSync(join(t.worktree, 'docs/acceptance/wave1/' + lane)));
    const ticket = readFileSync(t.ticket, 'utf8');
    for (const text of [base, t.worktree, t.branch, ...t.expectedTests, ...t.expectedBrowserTests]) assert(ticket.includes(text), text);
    assert(!/TODO|TBD|PLACEHOLDER|<具体|<待填|\{\{/.test(ticket));
    const paste = '请读取 F:/new/smaltalk/water/' + t.ticket + '，开始执行任务。\n';
    assert.equal(readFileSync('docs/dispatch/wave1/PASTE-' + lane.toUpperCase() + '.txt', 'utf8'), paste);
    assert.equal(t.dispatchedAt, null);
    assert.equal(t.startedAt, null);
    assert.equal(t.newProductTestsRun, false);
    if (requireReady) {
      assert.equal(t.status, 'READY');
      assert.equal(t.baselineStatus, 'PASSED');
      assert.equal(t.preflightEvidence, readyReport);
      assert.equal(r.slots.find(s => s.id === lane).state, 'ready-awaiting-user-paste');
    } else assert(['DRAFT', 'READY'].includes(t.status));
    const b = json(baselinePath(lane));
    assert.equal(b.task, id);
    assert.equal(b.status, 'passed');
    assert.equal(b.error, null);
    assert.equal(b.mode, 'baseline');
    assert.equal(b.finalGate, false);
    assert.equal(b.productTestsRun, false);
    assert.equal(b.newProductTested, false);
    assert.equal(b.frozenFiles, 104);
    assert.deepEqual(b.before, {head: base, status: ''});
    assert.deepEqual(b.after, b.before);
    for (const command of b.commands) { assert.equal(command.exitCode, 0); assert.equal(command.error, null); }
    assert.equal(b.baseline.audit.actualNativeCaptures, 8);
    assert.equal(b.baseline.audit.legacyAccepted, 24);
    baselines[lane] = b;
  }
  const v = m.tasks.at(-2), w = m.tasks.at(-1);
  for (const path of v.allowedFiles) assert(!w.allowedFiles.includes(path));
  for (const a of v.allowedPrefixes) for (const b of w.allowedPrefixes) assert(!a.startsWith(b) && !b.startsWith(a));
  assert.equal(hash(baselines.v.baseline.fixtureIndex), baselines.v.baseline.fixtureSha256);
  assert.equal(baselines.v.baseline.actualS_P_R_A_E_H_Q, true);
  assert.equal(baselines.v.baseline.ordinaryPayloadReadByRust, false);
  assert.equal(baselines.w.baseline.physicalFixtureAccess, false);
  const platform = baselines.w.baseline.platform;
  for (const key of ['rawChildUtf8BytesPreserved', 'nativeOriginPreserved', 'actualBrowserClick']) assert.equal(platform[key], true);
  assert.equal(platform.downloadBytes, 5096);
  const download = join(platform.directory, 'water-report-1.json');
  const cases = json('contracts/native-session-v1/cases.json');
  assert.deepEqual(readFileSync(download), Buffer.from(cases.cases[1].bundle.snapshots[0].redacted_json, 'utf8'));
  const provenance = json('contracts/native-session-v1/PROVENANCE.json');
  assert.equal(provenance.casesSha256, hash('contracts/native-session-v1/cases.json'));
  assert.equal(provenance.newVProductUsed, false);
  assert.equal(provenance.newWProductUsed, false);
  assert.equal(hash(provenance.sourceFixture.index), provenance.sourceFixture.sha256);
  for (const f of provenance.sourceHashes) assert.equal(hash(f.path), f.sha256, f.path);
  assert.equal(sha(provenance.driver.rawLog), provenance.driver.rawLogSha256);
  const metadataLog = readFileSync(dirname(baselinePath('v')) + '/' + prefixes.v + '-baseline-4.log', 'utf8');
  const metadata = JSON.parse(metadataLog.split('--- stdout ---\n')[1].split('\n--- stderr ---')[0]);
  const packages = metadata.packages.map(p => ({name: p.name, version: p.version, source: p.source ?? null}));
  packages.sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(packages, provenance.dependencyPackages);
  const actualCases = auditNativeCases(root);
  if (requireReady) {
    assert.equal(m.status, 'A_U_VERIFIED_V_W_READY');
    assert.equal(m.nativeHostPreflightStatus, 'PASSED');
    assert.equal(r.stage, 'wave1-a-u-verified-v-w-ready');
    assert(existsSync(readyReport));
  }
  return {m, r, baselines, download, actualCases, frozen: {newLockEntries: 104, inheritedLockFamilies: 13, oldUnique: 291, combinedUnique: 336}};
}
function auditDocuments() {
  const docs = ['README.md', 'AGENTS.md', 'docs/STATUS.md', 'docs/ROADMAP.md',
    'docs/CONTROLLER-WORKFLOW.md', 'docs/CONTROLLER-HANDOFF-20261017.md', 'docs/dispatch/README.md',
    'docs/dispatch/wave1/AFTER-RTU-NEXT-WAVE-PLAN-20261019.md', readyReport,
    ...json(mp).tasks.slice(-2).map(t => t.ticket)];
  let localLinks = 0;
  for (const p of docs) {
    const text = readFileSync(p, 'utf8');
    assert(!text.includes('\ufffd'), p + ': damaged UTF-8');
    for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:\/\//i.test(target)) continue;
      const absolute = resolve(dirname(p), target);
      // The one generated receipt is created after its own document audit.
      const pendingReceipt = process.argv.includes('--record') && absolute === resolve(archiveRoot, 'READINESS-AUDIT.json');
      assert(existsSync(absolute) || pendingReceipt, p + ': ' + target);
      localLinks++;
    }
  }
  return {documents: docs.length, localLinks};
}
function sources(input) {
  const entries = [];
  for (const lane of ['v', 'w']) {
    const dir = dirname(baselinePath(lane));
    for (const name of readdirSync(dir).filter(n => n.startsWith(prefixes[lane])).sort()) entries.push([join(dir, name), lane + '/' + name]);
  }
  const prep = '.local/checks/controller-native-host-prepare';
  for (const name of readdirSync(prep).sort()) {
    assert(/\.(json|log|txt)$/.test(name), name);
    entries.push([join(prep, name), 'prepare/' + name]);
  }
  entries.push([input.download, 'w/water-report-1.json']);
  return entries;
}
function writeNewOrSame(path, bytes) {
  mkdirSync(dirname(path), {recursive: true});
  if (existsSync(path)) assert.deepEqual(readFileSync(path), Buffer.from(bytes), path);
  else writeFileSync(path, bytes, {flag: 'wx'});
}
function checkArchive(input) {
  const archive = json(archiveRoot + '/ARCHIVE.json'), expected = sources(input);
  assert.equal(archive.files.length, expected.length);
  for (const [source, dest] of expected) {
    const entry = archive.files.find(e => e.destination === dest);
    assert(entry, dest);
    assert.equal(entry.source, slash(resolve(source)));
    const bytes = readFileSync(source), copy = readFileSync(join(archiveRoot, dest));
    assert.deepEqual(copy, bytes, dest);
    assert.equal(entry.bytes, bytes.length);
    assert.equal(entry.sha256, sha(bytes));
  }
  return {files: archive.files.length, bytes: archive.files.reduce((n, f) => n + f.bytes, 0)};
}

const mode = process.argv[2];
assert(['--prepare', '--check'].includes(mode), 'Use --prepare or --check');
const input = auditInputs(mode === '--check');
if (mode === '--prepare') {
  writeNewOrSame(archiveRoot + '/.gitattributes', '*.json -text\n*.log -text\n*.txt -text\n*.png -text\n');
  const files = sources(input).map(([source, destination]) => {
    const bytes = readFileSync(source);
    writeNewOrSame(join(archiveRoot, destination), bytes);
    return {source: slash(resolve(source)), destination, bytes: bytes.length, sha256: sha(bytes)};
  });
  writeNewOrSame(archiveRoot + '/ARCHIVE.json', JSON.stringify({archive_version: 'water.native-host.preflight-archive.v1', rawBytesPreserved: true, files}, null, 2) + '\n');
  for (const lane of ['v', 'w']) {
    const task = input.m.tasks.find(t => t.slot === lane);
    Object.assign(task, {status: 'READY', baselineStatus: 'PASSED', readyOn: '2026-10-19', preflightEvidence: readyReport,
      baselineEvidence: archiveRoot + '/' + lane + '/' + prefixes[lane] + '-baseline-result.json'});
    Object.assign(input.r.tasks.find(t => t.id === task.id), structuredClone(task));
    input.r.slots.find(s => s.id === lane).state = 'ready-awaiting-user-paste';
  }
  Object.assign(input.m, {status: 'A_U_VERIFIED_V_W_READY', nativeHostPreflightStatus: 'PASSED', nativeHostPreflightEvidence: readyReport});
  Object.assign(input.r, {updatedOn: '2026-10-19', stage: 'wave1-a-u-verified-v-w-ready',
    note: 'A-U/six addenda remain VERIFIED. V/W independently baselined, READY together awaiting separate user-pasted conversations; no automatic implementer. New products/tests and actual V->W launcher chain remain unimplemented/unverified; M1 incomplete.'});
  writeFileSync(mp, JSON.stringify(input.m, null, 2) + '\n');
  writeFileSync(rp, JSON.stringify(input.r, null, 2) + '\n');
}
const archived = checkArchive(input);
const documents = mode === '--check' ? auditDocuments() : null;
const result = {mode, base, tag, frozen: input.frozen, oldTasksAndSlotsPreserved: 21,
  actualCases: input.actualCases, archived, independentBaselines: ['V', 'W'],
  documents, checkerSha256: hash('scripts/acceptance/ready-native-host-dispatch.mjs'),
  newProductsImplemented: false, newProductTestsRun: false, actualFixedLauncherChainTested: false};
if (process.argv.includes('--record')) {
  assert.equal(mode, '--check');
  writeNewOrSame(archiveRoot + '/READINESS-AUDIT.json', JSON.stringify(result, null, 2) + '\n');
  auditDocuments();
}
console.log(JSON.stringify(result));
