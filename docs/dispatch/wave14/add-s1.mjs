// Adds WATER-W14-S1 to docs/dispatch/wave14/manifest.json, cloned from WATER-W13-S1 (same kind, checker, tests,
// dependencies and budgets). Frozen hashes come from the S1 worktree. Run from the repo root.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const BASE = '5f6ff198f1822c1ae3508588d239f73c12e11533', ROOT = 'F:/new/smaltalk/water', TREE = `${ROOT}/.worktrees/w14-s1`;
const p = 'docs/dispatch/wave14/manifest.json', m = JSON.parse(readFileSync(p, 'utf8'));
const w13 = JSON.parse(readFileSync('docs/dispatch/wave13/manifest.json', 'utf8')).tasks.find(t => t.id === 'WATER-W13-S1');
const t = {...w13};
for (const k of ['controllerReview', 'carryOverLater', 'workerSelfReport', 'dispatchEvidence', 'submittedHead', 'implementationCommit', 'mergeCommit',
  'addenda', 'blocked', 'baselineEvidence', 'dispatchReportedAt', 'startedAt', 'dispatchedAt', 'model']) delete t[k];
const frozen = paths => paths.map(path => ({path, sha256: createHash('sha256').update(readFileSync(join(TREE, path))).digest('hex')}));
Object.assign(t, {
  id: 'WATER-W14-S1', title: '服务：英文、错误与真实体检进度', slot: 'w14-s1', worktree: TREE, branch: 'worker/water-w14-s1', baseCommit: BASE,
  snapshotRef: 'refs/tags/water-w14-s1-base-20261108', status: 'READY', gate: 'medium', defaultExecutor: 'sol',
  ticket: 'docs/dispatch/tickets/WATER-W14-S1-SERVICE-20261108.md', spec: 'contracts/w14-v1/W14.md',
  report: 'docs/dispatch/reports/WATER-W14-S1-REPORT.md', evidenceDir: 'docs/acceptance/wave14/s1/',
  allowedFiles: ['docs/dispatch/reports/WATER-W14-S1-REPORT.md'], allowedPrefixes: ['packages/water-service/', 'docs/acceptance/wave14/s1/'],
  productionFiles: ['packages/water-service/Cargo.toml', 'packages/water-service/Cargo.lock', 'packages/water-service/README.md',
    'packages/water-service/examples/service_smoke.rs'],
  proofTargets: {nc1: 'SERVICE_W14_EN', nc2: 'SERVICE_W14_PROGRESS', nc3: 'SERVICE_W14_PROGRESS'},
  purpose: 'every IPC *_zh has an *_en sibling (copy_text_en, message_en on IpcError), rule texts from the R1 fields, runtime sentences in English, new records store both languages, old records read with _en = _zh; logic no longer keyed on Chinese sentences; scan progress gets finishing and per-location space states, unchanged labels, found_bytes without space bytes, a monotonic percent with the W14 3.3 weights; trends test independent of real scan time',
  modelHint: 'Service: W14 sections 0, 1, 2.2, 3 and 7; host keeps two IpcError literals until H1; shape() ignores *_en on both sides; three NCs (one _en, space bytes in found_bytes, drive done before space).',
  mustRead: ['docs/dispatch/WORKER-RULES.md', 'docs/dispatch/W14-WORKER-RULES.md', 'contracts/w14-v1/W14.md', 'packages/water-service/src/lib.rs',
    'packages/water-service/src/service.rs', 'packages/water-service/src/views.rs', 'packages/water-service/src/conclusion.rs', 'packages/water-service/src/m35.rs',
    'packages/junk-rules/src/rules.rs', 'packages/water-service/tests/service_v1.rs'],
  frozenFiles: frozen(['contracts/w14-v1/W14.md', 'contracts/w12-v1/W12.md', 'contracts/m35-v1/IPC-M35.md', 'contracts/m35-v1/SERVICE-M35.md',
    'contracts/m3c-v1/IPC-M3C.md', 'contracts/m3c-v1/SERVICE-M3C.md', 'contracts/m3c-v1/SERVICE-M3C-ADD-01.md', 'contracts/checkup-v1/ui-fixtures.json',
    'contracts/m3c-v1/ui-fixtures-m3c.json', 'contracts/m35-v1/ui-fixtures-m35.json', 'contracts/m35-v1/CLEAN-M35.md', 'contracts/checkup-v1/IPC.md',
    'contracts/checkup-v1/MODEL.md', 'docs/decisions/ADR-019-project-declarations-and-quarantine.md', 'contracts/w11-v1/RENAME-FLICK.md']),
  readyOn: '2026-11-08', issuedAt: new Date().toISOString(), dispatchedAt: null, startedAt: null, model: null, baselineStatus: null,
  source: 'docs/dispatch/wave14/PLAN.md', modelAssignment: 'user-arranged; report actual engine/model',
});
m.tasks = [...m.tasks.filter(x => x.id !== t.id), t];
m.status = 'R1_J1_VERIFIED_U1_ADDENDUM_S1_READY';
writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
console.log('added', t.id, 'frozen', t.frozenFiles.length, 'tests', t.expectedTests.length);
