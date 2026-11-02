// Build docs/dispatch/wave9/manifest.json (L1 rules, L2 scan, L3 service, L4 process) from the wave 8 task entries.
import fs from 'node:fs';
import crypto from 'node:crypto';
const repo = 'F:/new/smaltalk/water';
const BASE = '57ecd7ce42a98f9932faecc69e5d82c648991669';
const TAG = 'refs/tags/water-w9-m3d-base-20261102';
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(repo + '/' + p)).digest('hex');
const frozen = paths => paths.map(path => ({ path, sha256: sha(path) }));
const clone = v => JSON.parse(JSON.stringify(v));
const w8 = JSON.parse(fs.readFileSync(repo + '/docs/dispatch/wave8/manifest.json', 'utf8'));
const pick = id => clone(w8.tasks.find(t => t.id === id));
const DROP = ['dispatchReportedAt', 'dispatchEvidence', 'startEvidence', 'submittedHead', 'implementationCommit', 'controllerReview', 'controllerReview2',
  'addenda', 'verifiedAt', 'acceptedCommit', 'integrationCommit', 'integrationBranch', 'addendumModel', 'verificationScope', 'mergeCommit', 'mergeCommits',
  'carryOverLater', 'carryOverM2', 'acceptance', 'blockedAt', 'blockedCommit', 'blockedReason', 'workerSelfReport', 'preflightEvidence'];
const RULES = 'docs/dispatch/W9-M3D-WORKER-RULES.md';
const PLAN = 'docs/dispatch/wave9/PLAN.md';
function task(template, o) {
  const t = template;
  for (const k of DROP) delete t[k];
  const n = o.n, slot = 'w9-' + n, id = 'WATER-W9-' + n.toUpperCase();
  Object.assign(t, {
    id, title: o.title, slot, worktree: repo + '/.worktrees/' + slot, branch: 'worker/water-w9-' + n,
    baseCommit: BASE, snapshotRef: TAG, status: 'READY', readyOn: '2026-11-02', dispatchedAt: null, startedAt: null, model: null,
    modelAssignment: 'user-arranged; report actual engine/model', purpose: 'M3 close fixes', macOS: 'unverified',
    report: 'docs/dispatch/reports/' + id + '-REPORT.md', evidenceDir: 'docs/acceptance/wave9/' + n + '/',
    allowedFiles: ['docs/dispatch/reports/' + id + '-REPORT.md'],
    allowedPrefixes: [o.root + '/', 'docs/acceptance/wave9/' + n + '/'],
    ticket: o.ticket, spec: o.spec, proofTargets: o.proofs, modelHint: o.hint, mustRead: [RULES, o.spec, ...o.read],
    frozenFiles: frozen([o.spec, ...o.frozen]), gate: 'light', baselineStatus: null, baselineEvidence: null, outputRootExists: true
  }, o.extra ?? {});
  return t;
}
const tasks = [
  task(pick('WATER-W8-K2'), {
    n: 'l1', title: '标记的附加条件与兜底规则', root: 'packages/junk-rules',
    ticket: 'docs/dispatch/tickets/WATER-W9-L1-RULES-20261102.md', spec: 'contracts/m3d-v1/RULES-M3D.md',
    proofs: { nc1: 'RULES_M3D_FALLBACK', nc2: 'RULES_M3D_CONDITIONS' },
    hint: 'Rules data, validator and plan JSON; light gate; no web access needed.',
    read: ['contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/RULES-M3C.md', 'contracts/m3d-v1/SCAN-M3D.md', PLAN,
      'docs/acceptance/wave8/controller/WATER-M3-REPLAY-20261101.md', 'packages/junk-rules/src/rules.rs', 'packages/junk-rules/src/types.rs', 'packages/junk-rules/src/plan.rs', 'packages/junk-rules/tests/rules_v1.rs'],
    frozen: ['contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/RULES-M3C.md', 'contracts/m3d-v1/SCAN-M3D.md'],
  }),
  task(pick('WATER-W8-K3'), {
    n: 'l2', title: '附加条件、兜底目标与增长提示', root: 'packages/junk-scan',
    ticket: 'docs/dispatch/tickets/WATER-W9-L2-SCAN-20261102.md', spec: 'contracts/m3d-v1/SCAN-M3D.md',
    proofs: { nc1: 'SCAN_M3D_CONDITIONS', nc2: 'SCAN_M3D_GROWTH' },
    hint: 'Rust scan engine: plan JSON, one-walk marker routing, growth; light gate with a read-only real scan.',
    read: ['contracts/checkup-v1/SCAN.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/SCAN-M3C.md', 'contracts/m3d-v1/RULES-M3D.md', PLAN,
      'packages/junk-scan/src/plan.rs', 'packages/junk-scan/src/scan.rs', 'packages/junk-scan/src/snapshot.rs', 'packages/junk-scan/tests/scan_v1.rs'],
    frozen: ['contracts/checkup-v1/SCAN.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/SCAN-M3C.md', 'contracts/m3d-v1/RULES-M3D.md', 'contracts/checkup-v1/real-plan-template.json'],
  }),
  task(pick('WATER-W8-K4'), {
    n: 'l3', title: '增长的对比基准与历史文案', root: 'packages/water-service',
    ticket: 'docs/dispatch/tickets/WATER-W9-L3-SERVICE-20261102.md', spec: 'contracts/m3d-v1/SERVICE-M3D.md',
    proofs: { nc1: 'SERVICE_M3D_GROWTH_BASE', nc2: 'SERVICE_M3D_CLEAN_SUMMARY' },
    hint: 'Rust service core; growth baseline and history text only, does not touch the clean plan; light gate with a read-only real checkup.',
    read: ['contracts/m3c-v1/SERVICE-M3C.md', 'contracts/m3c-v1/SERVICE-M3C-ADD-01.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/checkup-v1/IPC.md', 'contracts/m3d-v1/SCAN-M3D.md', PLAN,
      'packages/water-service/src/service.rs', 'packages/water-service/src/views.rs', 'packages/water-service/src/clean.rs', 'packages/water-service/tests/service_v1.rs'],
    frozen: ['contracts/m3c-v1/SERVICE-M3C.md', 'contracts/m3c-v1/SERVICE-M3C-ADD-01.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/checkup-v1/IPC.md', 'contracts/m3d-v1/SCAN-M3D.md'],
    extra: { allowedModes: ['baseline', 'lock', 'check', 'test', 'real', 'red-nc1', 'red-nc2', 'archive'] }
  }),
  task(pick('WATER-W8-K1'), {
    n: 'l4', title: '命令行里的 Git Bash 写法', root: 'packages/process-scan',
    ticket: 'docs/dispatch/tickets/WATER-W9-L4-PROCESS-20261102.md', spec: 'contracts/m3d-v1/PROCESS-M3D.md',
    proofs: { nc1: 'PROCESS_M3D_MSYS', nc2: 'PROCESS_M3D_MSYS' },
    hint: 'Rust command-line path matching only; light gate with real process counts.',
    read: ['contracts/checkup-v1/PROCESS.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/PROCESS-M3C.md', PLAN, 'packages/process-scan/src/lib.rs', 'packages/process-scan/tests/process_v1.rs'],
    frozen: ['contracts/checkup-v1/PROCESS.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/PROCESS-M3C.md'],
  }),
];
const manifest = {
  schemaVersion: 1, wave: 'water-wave9-m3-close-fixes', status: 'READY', controller: 'Claude', controllerRoot: repo, controllerBranch: 'main',
  helpers: { L1: 'scripts/checkup-wave-check.mjs', L2: 'scripts/checkup-wave-check.mjs', L3: 'scripts/desktop-wave-check.mjs', L4: 'scripts/checkup-wave-check.mjs' },
  baseCommit: BASE, baseTag: 'water-w9-m3d-base-20261102', plan: PLAN, workerRules: RULES,
  userDecision: '2026-11-02: plan section 7 approved as recommended ("全部按推荐"). L1-L4 are dispatched together; L1 and L2 share the plan JSON and merge together; L3 and L4 merge any time.',
  offlineCache: clone(w8.offlineCache),
  frozenFiles: frozen(['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', RULES]),
  readyReport: PLAN,
  tasks
};
fs.writeFileSync(repo + '/docs/dispatch/wave9/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
for (const t of tasks) console.log(t.id, t.kind, t.gate, t.outputRoot, JSON.stringify(t.proofTargets), t.allowedModes.join(','), (t.allowedFfi ?? []).length, t.frozenFiles.length);
