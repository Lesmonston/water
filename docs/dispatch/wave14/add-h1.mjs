// Adds WATER-W14-H1 to docs/dispatch/wave14/manifest.json. The host config is cloned from the eleventh integration's
// host entry (W12-P3 plus the first-run page and the wave 13 skip round, passed on the same UI the H1 base carries),
// with bundle.copyright added (release prep 7968f03c). Frozen hashes come from the H1 worktree.
// Usage from the repo root: node docs/dispatch/wave14/add-h1.mjs <full base sha>
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const BASE = process.argv[2], ROOT = 'F:/new/smaltalk/water', TREE = `${ROOT}/.worktrees/w14-h1`;
if (!/^[0-9a-f]{40}$/.test(BASE ?? '')) throw Error('need the full base sha');
const p = 'docs/dispatch/wave14/manifest.json', m = JSON.parse(readFileSync(p, 'utf8'));
const integ = JSON.parse(readFileSync('docs/acceptance/wave13/controller/integ11-20261108/controller/desktop-manifest.json', 'utf8'))
  .tasks.find(t => t.kind === 'host');
const t = structuredClone(integ);
for (const k of ['controllerReview', 'carryOverLater', 'workerSelfReport', 'dispatchEvidence', 'submittedHead', 'implementationCommit', 'mergeCommit',
  'addenda', 'blocked', 'baselineEvidence', 'dispatchReportedAt', 'startedAt', 'dispatchedAt', 'model', 'acceptsTask', 'acceptsHead']) delete t[k];
const frozen = paths => paths.map(path => ({path, sha256: createHash('sha256').update(readFileSync(join(TREE, path))).digest('hex')}));
t.expectedConfig.bundle = {...t.expectedConfig.bundle, copyright: 'Copyright (c) 2026 Flick contributors'};
Object.assign(t, {
  id: 'WATER-W14-H1', title: '宿主与安装包：英文错误、中英安装包', slot: 'w14-h1', worktree: TREE, branch: 'worker/water-w14-h1', baseCommit: BASE,
  snapshotRef: 'refs/tags/water-w14-h1-base-20261108', status: 'READY', gate: 'light', defaultExecutor: 'sol',
  ticket: 'docs/dispatch/tickets/WATER-W14-H1-HOST-20261108.md', spec: 'contracts/w14-v1/W14.md',
  report: 'docs/dispatch/reports/WATER-W14-H1-REPORT.md', evidenceDir: 'docs/acceptance/wave14/h1/',
  allowedFiles: ['docs/dispatch/reports/WATER-W14-H1-REPORT.md'],
  allowedPrefixes: ['apps/water/host/', 'packaging/windows/', 'docs/acceptance/wave14/h1/'],
  productionFiles: [...t.productionFiles, 'packaging/windows/flick.nsi'],
  proofTargets: {nc1: 'HOST_W14_EN', nc2: 'HOST_W14_EN'},
  nativeDataPrefix: '.local/w14-h1-native/',
  purpose: 'IpcFailure gets message_en; the host\'s own errors have English; service errors pass message_en through; HostPicker::pick builds IpcError with message_en; app_info unchanged (W14-ADD-02: no system_language); flick.nsi in English and Simplified Chinese, picked from the system language without a language dialog',
  modelHint: 'Host: W14 4.2 and 4.3 as amended by W14-ADD-02; the base (S1 part A) does not compile the host until IpcError literals get message_en; tests in existing functions with HOST_W14_EN; two NCs (service message_en dropped, a host error without English); installer compiled once as a -Test build into .local, never run.',
  mustRead: ['docs/dispatch/WORKER-RULES.md', 'docs/dispatch/W14-WORKER-RULES.md', 'contracts/w14-v1/W14.md', 'contracts/m35-v1/HOST-M35.md',
    'apps/water/host/src/lib.rs', 'apps/water/host/src/commands.rs', 'apps/water/host/src/picker.rs', 'apps/water/host/src/service.rs',
    'apps/water/host/tests/host_v1.rs', 'packaging/windows/flick.nsi', 'packaging/windows/build.ps1'],
  frozenFiles: frozen(['contracts/w14-v1/W14.md', 'contracts/w12-v1/W12.md', 'contracts/m35-v1/HOST-M35.md', 'contracts/m35-v1/IPC-M35.md',
    'contracts/m3c-v1/HOST-M3C.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/desktop-v1/HOST.md', 'contracts/checkup-v1/IPC.md',
    'contracts/w11-v1/RENAME-FLICK.md']),
  readyOn: '2026-11-08', issuedAt: new Date().toISOString(), dispatchedAt: null, startedAt: null, model: null, baselineStatus: null,
  source: 'docs/dispatch/wave14/PLAN.md', modelAssignment: 'user-arranged; report actual engine/model',
});
m.tasks = [...m.tasks.filter(x => x.id !== t.id), t];
writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
console.log('added', t.id, 'steps', t.nativeSteps.length, 'frozen', t.frozenFiles.length, 'tests', t.expectedTests.length);
