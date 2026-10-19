// Validate submitted V bytes, actual helper evidence, and controller no-UI review.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {proofAudit} from '../scope-export-proof.mjs';

const root = resolve('.'), tree = join(root, '.worktrees/v');
const base = '30a803537602211ed2a11c106c63fd27cefb260f';
const implementation = '30875645f03ddc01019eb4b3cb00f9ab7d1c068d';
const task = JSON.parse(readFileSync('docs/dispatch/wave1/manifest.json')).tasks.find(t => t.id === 'WATER-W1-V');
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const out = join(root, '.local/checks/controller-vw-receipt-20261019');
mkdirSync(out, {recursive: true});
function git(args, cwd = tree, encoding = 'utf8') {
  const x = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args], {cwd, encoding, windowsHide: true, maxBuffer: 32 * 1024 * 1024});
  assert.equal(x.status, 0, String(x.stderr)); return encoding ? x.stdout.trim() : x.stdout;
}
const record = {startedAt: new Date().toISOString(), implementation, newNativeDialogsLaunched: 0};
try {
  assert.equal(git(['branch', '--show-current']), task.branch);
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '', 'Submission must be committed and clean');
  const submitted = git(['rev-parse', 'HEAD']);
  assert.notEqual(submitted, implementation, 'Report/evidence commit still missing');
  git(['merge-base', '--is-ancestor', base, submitted]);
  git(['merge-base', '--is-ancestor', implementation, submitted]);
  const changed = git(['diff', '--name-only', '-z', base, submitted]).split('\0').filter(Boolean);
  for (const p of changed) assert(task.allowedFiles.includes(p) || task.allowedPrefixes.some(a => p.startsWith(a)), p);
  const afterImplementation = git(['diff', '--name-only', '-z', implementation, submitted]).split('\0').filter(Boolean);
  for (const p of afterImplementation) assert(p === task.report || p.startsWith('docs/acceptance/wave1/v/'), p);
  const report = readFileSync(join(tree, task.report), 'utf8');
  assert(report.startsWith(task.id + ' 任务已完成，任务报告在 '));
  assert(report.includes(implementation));
  const archive = json(join(tree, 'docs/acceptance/wave1/v/ARCHIVE.json'));
  assert.equal(archive.testedCommit, implementation);
  assert.equal(archive.files.length, archive.fileCount);
  let archiveBytes = 0;
  for (const f of archive.files) {
    assert(f.path.startsWith('docs/acceptance/wave1/v/') && !f.path.includes('..'));
    assert(f.source.startsWith('.local/checks/WATER-W1-V/') && !f.source.includes('..'));
    const source = readFileSync(join(tree, f.source)), destination = readFileSync(join(tree, f.path));
    assert.deepEqual(destination, source, f.path);
    assert.equal(source.length, f.bytes, f.path);
    assert.equal(hash(source), f.sha256, f.path);
    assert.deepEqual(git(['show', submitted + ':' + f.path], tree, null), source, f.path + ': committed bytes');
    archiveBytes += f.bytes;
  }
  assert.equal(archiveBytes, archive.totalBytes);
  const evidence = join(tree, '.local/checks/WATER-W1-V');
  const receipts = readdirSync(evidence).filter(n => n.endsWith('-result.json')).map(file => ({file, data: json(join(evidence, file))}));
  const finals = task.expectedFinalModes.map(mode => {
    const matches = receipts.filter(({data:r}) => r.mode === mode && r.finalGate && r.status === 'passed' && r.before.head === implementation);
    assert.equal(matches.length, 1, mode);
    const f = matches[0];
    assert.deepEqual(f.data.before, {head: implementation, status: ''});
    assert.deepEqual(f.data.after, f.data.before);
    assert.equal(f.data.error, null);
    for (const s of f.data.sourceState.files) {
      const bytes = readFileSync(join(evidence, s.snapshot));
      assert.equal(hash(bytes), s.sha256, s.path);
      assert.deepEqual(bytes, git(['show', implementation + ':' + s.path], tree, null), s.path);
      assert.deepEqual(bytes, readFileSync(join(tree, s.path)), s.path);
    }
    for (const c of f.data.commands) if (c.log) assert(readFileSync(join(evidence, c.log)).length > 0);
    return f;
  });
  const bridge = finals.find(f => f.data.mode === 'bridge');
  const proofRecord = {};
  proofAudit({output: evidence, record: proofRecord}, bridge.data.sourceState);
  assert.deepEqual(proofRecord.proofAudit, bridge.data.proofAudit);
  assert.equal(bridge.data.bridge.actual_V_S_P_R_A_E_H_Q, true);
  assert.equal(bridge.data.bridge.released_own_registration, true);
  assert.equal(bridge.data.bridge.preserved_existing_host_scope, true);
  assert.equal(bridge.data.bridge.selection_cancel_and_pre_cancel_distinct, true);
  assert.equal(bridge.data.bridge.V_W_launcher_joint_tested, false);
  assert.deepEqual(bridge.data.cli.map(c => c.action), ['cancel', 'select']);
  assert(bridge.data.cli.every(c => c.actualVProgram && c.expectedWireEqual));
  const test = finals.find(f => f.data.mode === 'test');
  const logs = test.data.commands.filter(c => c.log).map(c => readFileSync(join(evidence, c.log), 'utf8')).join('\n');
  const names = [...logs.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map(m => m[1]);
  assert.deepEqual(names.sort(), [...task.expectedTests].sort());
  assert(logs.includes('5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out'));
  const ownReview = readdirSync(out).filter(n => n.endsWith('-no-ui-result.json')).map(n => ({file: n, data: json(join(out, n))})).find(r => r.data.status === 'passed');
  assert(ownReview);
  assert.equal(ownReview.data.implementation, implementation);
  assert.equal(ownReview.data.nativeDialogsLaunched, 0);
  assert.equal(ownReview.data.compileProofs.length, 9);
  assert.equal(ownReview.data.cliNoDialogCases.length, 3);
  for (const p of ['lib.rs', 'main.rs', 'v1.rs']) assert.deepEqual(readFileSync(join(tree, 'packages/native-session/src', p)), readFileSync(join(ownReview.data.root, 'packages/native-session/src', p)));
  const lock = json('contracts/native-host-batch-v1/freeze.lock.json'), frozen = new Map();
  for (const p of [...lock.inheritedLocks, task.contractLock]) for (const f of json(p).files) frozen.set(f.path, f.sha256);
  for (const dir of [root, tree, ownReview.data.root]) for (const [p, s] of frozen) assert.equal(hash(readFileSync(join(dir, p))), s, p);
  Object.assign(record, {status: 'passed', submitted, changedFiles: changed.length,
    report: task.report, archiveFiles: archive.fileCount, archiveBytes, frozenFiles: frozen.size,
    originalFinalGates: finals.map(f => ({mode: f.data.mode, receipt: f.file})), proofAudit: proofRecord.proofAudit,
    independentNoUiReceipt: ownReview.file, independentCompileProofs: 9, independentCliErrorCases: 3,
    dynamicNativeUiEvidence: 'Original exact-SHA worker recordings and snapshots audited; controller did not replay native dialogs in this review.',
    deferred: ['Actual V -> W fixed launcher -> browser/download joint acceptance', 'macOS', 'desktop', 'real-user scope', 'production races'],
    standaloneAcceptance: true, finalIntegratedVerification: false});
} catch (error) {record.status = 'failed'; record.error = error.message; process.exitCode = 1;}
record.endedAt = new Date().toISOString();
const receipt = join(out, new Date().toISOString().replaceAll(':', '-') + '-' + process.pid + '-submission-audit.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...record, receipt}));
