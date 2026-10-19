// Controller evidence audit only. No browser, native executable or fixture use.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {proofAudit} from '../scope-export-proof.mjs';

const root = resolve('.'), tree = join(root, '.worktrees/w');
const implementation = '63db62b020efff4601a03da7dc561549dcb1f762';
const submitted = 'b65902d8f702bf34097adffd7fbaa7daddabe934';
const task = JSON.parse(readFileSync('docs/dispatch/wave1/manifest.json')).tasks.find(t => t.id === 'WATER-W1-W');
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = b => createHash('sha256').update(b).digest('hex');
const output = join(root, '.local/checks/controller-w-receipt-20261019');
mkdirSync(output, {recursive: true});
function git(args, encoding = 'utf8', input) {
  const r = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args], {cwd: tree, encoding, input, windowsHide: true, maxBuffer: 64 * 1024 * 1024});
  assert.equal(r.status, 0, String(r.stderr)); return encoding ? r.stdout.trim() : r.stdout;
}
const result = {startedAt: new Date().toISOString(), implementation, submitted, nativeDialogsLaunched: 0};
try {
  assert.equal(git(['rev-parse', 'HEAD']), submitted);
  assert.equal(git(['branch', '--show-current']), task.branch);
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '');
  git(['merge-base', '--is-ancestor', task.baseCommit, submitted]);
  git(['merge-base', '--is-ancestor', implementation, submitted]);
  const changed = git(['diff', '--name-only', '-z', task.baseCommit, submitted]).split('\0').filter(Boolean);
  for (const p of changed) assert(task.allowedFiles.includes(p) || task.allowedPrefixes.some(a => p.startsWith(a)), p);
  const post = git(['diff', '--name-only', '-z', implementation, submitted]).split('\0').filter(Boolean);
  for (const p of post) assert(p === task.report || p.startsWith('docs/acceptance/wave1/w/'), p);
  const a = json(join(tree, 'docs/acceptance/wave1/w/ARCHIVE.json'));
  assert.equal(a.totalFiles, a.entries.length);
  let bytes = 0;
  const batch = git(['cat-file', '--batch'], null, a.entries.map(f => submitted + ':' + f.archive + '\n').join(''));
  let cursor = 0;
  for (const f of a.entries) {
    assert(f.archive.startsWith('docs/acceptance/wave1/w/') && !f.archive.includes('..'));
    assert((f.source.startsWith('.local/checks/WATER-W1-W/') || f.source.startsWith('.local/browser-lab/')) && !f.source.includes('..'));
    const source = readFileSync(join(tree, f.source)), saved = readFileSync(join(tree, f.archive));
    assert.deepEqual(saved, source, f.archive);
    assert.equal(source.length, f.bytes, f.archive);
    assert.equal(hash(source), f.sha256, f.archive);
    const end = batch.indexOf(10, cursor), size = Number(batch.subarray(cursor, end).toString().split(' ')[2]);
    assert(Number.isInteger(size));
    assert.deepEqual(batch.subarray(end + 1, end + 1 + size), source, f.archive + ': committed bytes');
    cursor = end + 2 + size; bytes += size;
  }
  assert.equal(cursor, batch.length);
  assert.equal(bytes, a.totalBytes);
  const evidence = join(tree, '.local/checks/WATER-W1-W');
  const receipts = readdirSync(evidence).filter(n => n.endsWith('-result.json')).map(file => ({file, data: json(join(evidence, file))}));
  const finals = [];
  for (const mode of task.expectedFinalModes) {
    const matches = receipts.filter(({data:r}) => r.finalGate && r.mode === mode && r.status === 'passed' && r.before.head === implementation);
    assert.equal(matches.length, 1, mode); const f = matches[0];
    assert.deepEqual(f.data.before, {head: implementation, status: ''});
    assert.deepEqual(f.data.after, f.data.before);
    assert.equal(f.data.error, null);
    for (const s of f.data.sourceState.files) {
      const snapshot = readFileSync(join(evidence, s.snapshot));
      assert.equal(hash(snapshot), s.sha256, s.path);
      assert.deepEqual(snapshot, readFileSync(join(tree, s.path)), s.path);
      assert.deepEqual(snapshot, git(['show', implementation + ':' + s.path], null), s.path);
    }
    for (const c of f.data.commands) if (c.log) assert(readFileSync(join(evidence, c.log)).length > 0);
    const p = {};
    proofAudit({output: evidence, record: p}, f.data.sourceState);
    assert.deepEqual(p.proofAudit, f.data.proofAudit);
    finals.push(f);
  }
  const test = finals.find(f => f.data.mode === 'test'), browser = finals.find(f => f.data.mode === 'browser');
  for (const [f, names] of [[test, task.expectedTests], [browser, task.expectedBrowserTests]]) {
    const text = f.data.commands.filter(c => c.log).map(c => readFileSync(join(evidence, c.log), 'utf8')).join('\n');
    assert.deepEqual([...text.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m => m[1]).sort(), [...names].sort());
    assert(new RegExp('^# pass ' + names.length + '\\r?$', 'm').test(text));
    assert(/^# skipped 0\r?$/m.test(text));
  }
  assert.equal(browser.data.screenshots.length, 3);
  const screenshots = browser.data.screenshots.map(name => ({name, sha256: hash(readFileSync(join(evidence, name)))}));
  const lock = json('contracts/native-host-batch-v1/freeze.lock.json'), frozen = new Map();
  for (const p of [...lock.inheritedLocks, task.contractLock]) for (const f of json(p).files) frozen.set(f.path, f.sha256);
  for (const dir of [root, tree]) for (const [p, expected] of frozen) assert.equal(hash(readFileSync(join(dir, p))), expected, p);
  Object.assign(result, {status: 'passed', changedFiles: changed.length, archiveFiles: a.totalFiles, archiveBytes: bytes,
    archiveIndexSha256: hash(readFileSync(join(tree, 'docs/acceptance/wave1/w/ARCHIVE.json'))), frozenFiles: frozen.size,
    originalFinals: finals.map(f => ({mode: f.data.mode, file: f.file})),
    proofAudit: browser.data.proofAudit, screenshots,
    historicalFailures: receipts.filter(({data:r}) => r.status === 'failed').map(({file}) => file),
    evidenceAuditOnly: true, productAcceptance: false, nativeLauncherJointTested: false});
} catch (error) { result.status = 'failed'; result.error = error.message; process.exitCode = 1; }
result.endedAt = new Date().toISOString();
const receipt = join(output, new Date().toISOString().replaceAll(':', '-') + '-' + process.pid + '-evidence-audit.json');
writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...result, receipt}));
