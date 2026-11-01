// Add WATER-W8-K4 (service, second batch) to docs/dispatch/wave8/manifest.json from the wave 7 J3 service task.
import fs from 'node:fs';
import crypto from 'node:crypto';
const repo = 'F:/new/smaltalk/water';
const BASE = '232bc2982228f5d99f42017de6db3caa5912a8ab';
const TAG = 'refs/tags/water-w8-k4-base-20261101';
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(repo + '/' + p)).digest('hex');
const path = repo + '/docs/dispatch/wave8/manifest.json';
const m = JSON.parse(fs.readFileSync(path, 'utf8'));
const w7 = JSON.parse(fs.readFileSync(repo + '/docs/dispatch/wave7/manifest.json', 'utf8'));
const t = JSON.parse(JSON.stringify(w7.tasks.find(x => x.id === 'WATER-W7-J3')));
for (const k of ['dispatchReportedAt', 'dispatchEvidence', 'startEvidence', 'submittedHead', 'implementationCommit', 'controllerReview', 'controllerReview2',
  'addenda', 'verifiedAt', 'acceptedCommit', 'integrationCommit', 'integrationBranch', 'addendumModel', 'verificationScope', 'mergeCommit', 'carryOverLater',
  'carryOverM2', 'acceptance', 'workerSelfReport', 'relayedAt', 'relayEvidence', 'acceptanceProgress', 'acceptanceNote']) delete t[k];
const spec = 'contracts/m3c-v1/SERVICE-M3C.md';
const frozen = [spec, 'contracts/m3c-v1/SERVICE-M3C-ADD-01.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/m3c-v1/ui-fixtures-m3c.json',
  'contracts/checkup-v1/ui-fixtures.json', 'contracts/m3c-v1/PROCESS-M3C.md', 'contracts/m3c-v1/RULES-M3C.md', 'contracts/m3c-v1/SCAN-M3C.md',
  'contracts/m3-v1/SERVICE-M3-FIX.md', 'contracts/m2-v1/SERVICE-M2.md', 'contracts/hardening-v1/SERVICE-HARDENING.md', 'contracts/desktop-v1/SERVICE.md'];
Object.assign(t, {
  id: 'WATER-W8-K4', title: '服务接上 M3 收口的各项', slot: 'w8-k4', worktree: repo + '/.worktrees/w8-k4', branch: 'worker/water-w8-k4',
  baseCommit: BASE, snapshotRef: TAG, status: 'READY', readyOn: '2026-11-01', dispatchedAt: null, startedAt: null, model: null,
  modelAssignment: 'user-arranged; report actual engine/model', purpose: 'M3 close', macOS: 'unverified',
  report: 'docs/dispatch/reports/WATER-W8-K4-REPORT.md', evidenceDir: 'docs/acceptance/wave8/k4/',
  allowedFiles: ['docs/dispatch/reports/WATER-W8-K4-REPORT.md'],
  allowedPrefixes: ['packages/water-service/', 'docs/acceptance/wave8/k4/'],
  ticket: 'docs/dispatch/tickets/WATER-W8-K4-SERVICE-20261101.md', spec,
  proofTargets: { nc1: 'SERVICE_M3C_EXCLUDE', nc2: 'SERVICE_M3C_SKIP', nc3: 'SERVICE_M3C_DRIVE_ROOT' },
  modelHint: 'Rust service core that orchestrates deletion; heavy gate; final includes a read-only real checkup.',
  mustRead: ['docs/dispatch/W8-M3C-WORKER-RULES.md', spec, 'contracts/m3c-v1/SERVICE-M3C-ADD-01.md', 'contracts/m3c-v1/IPC-M3C.md',
    'contracts/m3c-v1/ui-fixtures-m3c.json', 'contracts/m3c-v1/PROCESS-M3C.md', 'contracts/m3c-v1/RULES-M3C.md', 'contracts/m3c-v1/SCAN-M3C.md',
    'docs/dispatch/wave8/PLAN.md', 'packages/water-service/src/views.rs', 'packages/water-service/src/lib.rs', 'packages/water-service/src/service.rs',
    'packages/water-service/src/clean.rs', 'packages/water-service/src/native_windows.rs', 'packages/water-service/tests/service_v1.rs'],
  frozenFiles: frozen.map(p => ({ path: p, sha256: sha(p) })),
  allowedModes: ['baseline', 'lock', 'check', 'test', 'real', 'red-nc1', 'red-nc2', 'red-nc3', 'archive'],
  expectedFinalModes: ['check', 'test', 'real'], gate: 'heavy',
  realDataPermission: 'read-only metadata per ADR-018; clean disabled in the real smoke',
  baselineStatus: null, baselineEvidence: null, outputRootExists: true
});
m.tasks = m.tasks.filter(x => x.id !== 'WATER-W8-K4');
m.tasks.splice(m.tasks.findIndex(x => x.id === 'WATER-W8-K5'), 0, t);
m.plannedTasks = (m.plannedTasks ?? []).filter(x => (x.id ?? x) !== 'WATER-W8-K4');
if (!m.plannedTasks.length) delete m.plannedTasks;
fs.writeFileSync(path, JSON.stringify(m, null, 2) + '\n');
console.log(m.tasks.map(x => x.id + ' ' + x.status + ' ' + (x.gate ?? '')).join('\n'));
