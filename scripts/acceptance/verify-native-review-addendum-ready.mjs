// Controller readiness audit; does not execute product tests or start workers.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

const root = resolve('.'), worker = join(root, '.worktrees/w');
const json = p => JSON.parse(readFileSync(p, 'utf8')), hash = b => createHash('sha256').update(b).digest('hex');
function git(args, cwd = root) {
  const r = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args], {cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024});
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
}
const mp = 'docs/dispatch/wave1/manifest.json', rp = 'docs/dispatch/registry.json', m = json(mp), r = json(rp);
for (const [p, value] of [[mp, m], [rp, r]]) {
  const old = JSON.parse(git(['show', '06d24b0b538b53492ecdfd771e4415d929e4282f:' + p]));
  assert.deepEqual(value.tasks.slice(0, 22), old.tasks.slice(0, 22));
  if (value.slots) assert.deepEqual(value.slots.slice(0, 22), old.slots.slice(0, 22));
}
const w = m.tasks.find(t => t.id === 'WATER-W1-W'), a = w.addendum01;
assert.deepEqual(w, r.tasks.find(t => t.id === w.id));
assert.equal(w.status, 'CHANGES_REQUESTED'); assert.equal(w.revisionDispatchStatus, 'READY');
assert.equal(a.status, 'READY'); assert.equal(a.baselineStatus, 'PASSED');
assert.equal(a.dispatchedAt, null); assert.equal(a.startedAt, null);
assert.equal(a.systemNativeDialogBudget, 0); assert.equal(a.physicalFixturePermission, false);
assert.equal(git(['rev-parse', 'HEAD'], worker), a.resumeCommit);
assert.equal(git(['branch', '--show-current'], worker), w.branch);
assert.equal(git(['status', '--porcelain', '--untracked-files=all'], worker), '');
assert(existsSync(join(worker, dirname(a.report))));
assert(existsSync(join(worker, dirname(a.evidencePrefix.slice(0, -1)))));
const lockBytes = readFileSync(a.contractLock), lock = JSON.parse(lockBytes), inherited = new Map();
assert.equal(hash(lockBytes), a.lockSha256);
assert.equal(lock.files.length, 5); assert.equal(lock.inheritedLocks.length, 14);
for (const p of lock.inheritedLocks) for (const f of json(p).files) {
  if (inherited.has(f.path)) assert.equal(inherited.get(f.path), f.sha256);
  inherited.set(f.path, f.sha256);
  for (const dir of [root, worker, join(root, '.worktrees/review-w-20261019')]) assert.equal(hash(readFileSync(join(dir, f.path))), f.sha256, f.path);
}
assert.equal(inherited.size, 336);
const combined = new Map(inherited);
for (const f of lock.files) { assert.equal(hash(readFileSync(f.path)), f.sha256, f.path); combined.set(f.path, f.sha256); }
assert.equal(combined.size, 341);
for (const f of lock.preservedSubmissionFiles) assert.equal(hash(readFileSync(join(worker, f.path))), f.sha256, f.path);
assert.equal(lock.preservedSubmissionFiles.length, 3);
const receipt = json(a.baselineEvidence);
assert.equal(receipt.status, 'passed'); assert.equal(receipt.knownRegressionExpected, true);
assert.equal(receipt.productPassClaimed, false); assert.equal(receipt.budgetProbe.failures.length, 12);
assert.deepEqual(receipt.before, {head: a.resumeCommit, status: ''}); assert.deepEqual(receipt.after, receipt.before);
for (const f of receipt.sourceState.files) assert.equal(hash(readFileSync(join(worker, f.path))), f.sha256, f.path);
const archiveRoot = 'docs/acceptance/wave1/controller/w1-w-review-20261019', archive = json(archiveRoot + '/ARCHIVE.json');
let archivedBytes = 0;
for (const f of archive.files) {
  const bytes = readFileSync(join(archiveRoot, f.destination));
  assert.equal(bytes.length, f.bytes); assert.equal(hash(bytes), f.sha256);
  assert.deepEqual(bytes, readFileSync(f.source)); archivedBytes += bytes.length;
}
assert.equal(archive.files.length, 46); assert.equal(archivedBytes, 1146555);
const paste = '请读取 F:/new/smaltalk/water/' + a.ticket + '，继续执行 WATER-W1-W 补充单01。\n';
assert.equal(readFileSync('docs/dispatch/wave1/PASTE-W-ADDENDUM-01.txt', 'utf8'), paste);
const ticket = readFileSync(a.ticket, 'utf8');
for (const text of [a.resumeCommit, w.worktree, w.branch, 'F:/new/smaltalk/water/' + a.helper, a.report, 'red-budget', 'W_DIR_BUDGET']) assert(ticket.includes(text), text);
assert(!/TODO|TBD|PLACEHOLDER|<待填|\{\{/.test(ticket));
const docs = ['README.md', 'AGENTS.md', 'docs/STATUS.md', 'docs/ROADMAP.md', 'docs/CONTROLLER-WORKFLOW.md',
  'docs/CONTROLLER-HANDOFF-20261017.md', 'docs/dispatch/README.md',
  'docs/dispatch/wave1/AFTER-RTU-NEXT-WAVE-PLAN-20261019.md',
  'docs/dispatch/tickets/WATER-W1-W-NATIVE-REVIEW-20261019.md', a.ticket, a.preflightEvidence,
  w.controllerReview, 'contracts/native-review-addendum-v1/SPEC.md'];
let links = 0;
for (const p of docs) {
  const text = readFileSync(p, 'utf8'); assert(!text.includes('\ufffd'), p);
  for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:\/\//i.test(target)) continue;
    assert(existsSync(resolve(dirname(p), target)), p + ':' + target); links++;
  }
}
const result = {status: 'passed', checkedAt: new Date().toISOString(), oldTasksAndSlotsPreserved: 22,
  inheritedFrozen: 336, controllerFrozen: 341, preservedWorkerReceiptFiles: 3,
  archivedFiles: archive.files.length, archivedBytes, documents: docs.length, localLinks: links,
  W: 'CHANGES_REQUESTED', addendum01: 'READY', originalWorkerClean: true,
  systemNativeDialogs: 0, newProductFixImplemented: false, nativeLauncherJointTested: false};
if (process.argv.includes('--record')) writeFileSync(archiveRoot + '/READY-AUDIT.json', JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(result));
