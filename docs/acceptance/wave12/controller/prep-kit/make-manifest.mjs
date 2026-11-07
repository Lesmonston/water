// Builds docs/dispatch/wave12/manifest.json from the wave 11 task configs (run from the repo root).
// Usage: node .local/w12-prep/make-manifest.mjs <base commit>
// Frozen hashes come from a base worktree's checked-out bytes (line endings as the gates see them).
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const base = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(base)) throw Error('full base commit required');
const w11 = JSON.parse(readFileSync('docs/dispatch/wave11/manifest.json', 'utf8'));
const atBase = p => { assert.equal(execFileSync('git', ['-C', '.worktrees/w12-p1', 'rev-parse', 'HEAD']).toString().trim(), base); assert.equal(execFileSync('git', ['-C', '.worktrees/w12-p1', 'status', '--porcelain']).toString(), ''); return readFileSync('.worktrees/w12-p1/' + p); };
const frozen = paths => [...new Set(paths)].map(path => ({path, sha256: createHash('sha256').update(atBase(path)).digest('hex')}));
const issuedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const RULES = ['docs/dispatch/WORKER-RULES.md', 'docs/dispatch/W12-WORKER-RULES.md'];
const W12 = 'contracts/w12-v1/W12.md', RENAME = 'contracts/w11-v1/RENAME-FLICK.md';
const HISTORY = ['submittedHead', 'implementationCommit', 'mergeCommit', 'controllerReview', 'carryOverLater', 'workerSelfReport', 'dispatchEvidence', 'resume', 'addenda', 'bundle', 'holdReason', 'note', 'source', 'baselineEvidence', 'baselineStatus', 'issuedAt', 'dispatchedAt', 'startedAt', 'model', 'defaultExecutor', 'negativeControlPaths', 'preflight', 'readyOn', 'baselineStatusNote', 'mergeAfter'];
const modes = (t, ncs) => [...t.allowedModes.filter(m => !m.startsWith('red-nc')), ...Array.from({length: ncs}, (_, i) => 'red-nc' + (i + 1))];
function task(from, n, o) {
  const t = structuredClone(w11.tasks.find(x => x.id === 'WATER-W11-' + from));
  for (const k of HISTORY) delete t[k];
  const slot = 'w12-p' + n, ev = 'docs/acceptance/wave12/p' + n + '/', report = 'docs/dispatch/reports/WATER-W12-P' + n + '-REPORT.md';
  const proof = Object.fromEntries(o.proof.map((m, i) => ['nc' + (i + 1), m]));
  return {
    ...t,
    id: 'WATER-W12-P' + n, title: o.title, slot,
    worktree: 'F:/new/smaltalk/water/.worktrees/' + slot, branch: 'worker/water-' + slot,
    baseCommit: base, snapshotRef: 'refs/tags/water-' + slot + '-base-20261107',
    status: o.status ?? 'READY', readyOn: '2026-11-07', dispatchedAt: null, startedAt: null,
    model: null, modelAssignment: 'user-arranged; report actual engine/model', defaultExecutor: o.executor,
    purpose: o.purpose, report, evidenceDir: ev, allowedFiles: [report], allowedPrefixes: [t.outputRoot + '/', ev],
    gate: o.gate, ticket: o.ticket, spec: W12, proofTargets: proof,
    allowedModes: modes(t, o.proof.length), modelHint: o.hint,
    mustRead: [...RULES, W12, ...o.read],
    frozenFiles: frozen([W12, ...o.frozen]),
    outputRootExists: true,
    ...(o.extra ?? {}),
    issuedAt, baselineStatus: 'PENDING', source: 'docs/dispatch/wave12/PLAN.md',
  };
}
const T = 'docs/dispatch/tickets/';
const n1 = w11.tasks.find(x => x.id === 'WATER-W11-N1'), n2 = w11.tasks.find(x => x.id === 'WATER-W11-N2');
const steps = n2.nativeSteps.map(s => s.absent === '无法连接 Water 服务' ? {...s, absent: '无法连接 Flick 服务'} : s);
assert(!JSON.stringify(steps).includes('Water'), 'native steps still name Water');
const M35 = ['contracts/m35-v1/IPC-M35.md', 'contracts/m35-v1/SERVICE-M35.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/m3c-v1/SERVICE-M3C.md', 'contracts/m3c-v1/SERVICE-M3C-ADD-01.md'];
const tasks = [
  task('N3', 1, {title: '执行器：写日志失败时照样交回报告', executor: 'sol', gate: 'heavy', ticket: T + 'WATER-W12-P1-CLEAN-20261107.md',
    purpose: 'after an action, a journal failure stops the run and still returns the report with journal_error and JournalFailed items (execute and quarantine); first-intent failure stays Err(Journal); real smoke runs powershell by absolute path',
    hint: 'Executor: W12 section 3; tests in clean_partial_stop_journal and quarantine_move_contract; one pre-listed old assertion (result flush failure); heavy gate.',
    proof: ['CLEAN_W12_JOURNAL', 'CLEAN_W12_JOURNAL', 'CLEAN_W12_JOURNAL_FIRST'],
    read: ['contracts/m35-v1/CLEAN-M35.md', 'contracts/checkup-v1/CLEAN.md', 'packages/junk-clean/src/lib.rs', 'packages/junk-clean/src/quarantine.rs', 'packages/junk-clean/src/model.rs', 'packages/junk-clean/src/quarantine_model.rs', 'packages/junk-clean/examples/real_smoke.rs', 'packages/junk-clean/tests/clean_v1.rs'],
    frozen: ['contracts/m35-v1/CLEAN-M35.md', 'contracts/checkup-v1/CLEAN.md', 'contracts/hardening-v1/CLEAN-HARDENING.md', 'docs/decisions/ADR-019-project-declarations-and-quarantine.md', RENAME]}),
  task('N8', 2, {title: '服务：整组整行跳过、诊断信息、首页去嵌套与几处收尾', executor: 'sol', gate: 'medium', ticket: T + 'WATER-W12-P2-SERVICE-20261107.md',
    purpose: 'skip_unit_add (group, template, folder kinds; settings v4; card menu and row skip keys), diagnostics_get, conclusion plan without nested double count, drawer and plan agree on unfinished items, trends state new, clean record kept on journal failure and quarantine error, refresh order',
    hint: 'Service: W12 sections 1, 2.2, 4; executor interface already in the base; two pre-listed old assertions; medium gate.',
    proof: ['SERVICE_W12_SKIP', 'SERVICE_W12_NESTED', 'SERVICE_W12_RECORD'],
    read: [...M35, 'docs/dispatch/tickets/WATER-W11-N8-SERVICE-20261107.md'],
    frozen: [...M35, 'contracts/m35-v1/CLEAN-M35.md', 'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/MODEL.md', 'docs/decisions/ADR-019-project-declarations-and-quarantine.md', RENAME]}),
  task('N2', 3, {title: '宿主：转发跳过与诊断、关于信息、公司名', executor: 'sol', gate: 'light', ticket: T + 'WATER-W12-P3-HOST-20261107.md',
    purpose: 'forward skip_unit_add and diagnostics_get, answer app_info in the host, bundle.publisher Flick, 39 commands',
    hint: 'Host: W12 sections 1.6, 2.1, 2.2, 5; three count assertions 36 to 39; native 17 steps with .flick-quarantine.',
    proof: ['HOST_W12_FORWARD', 'HOST_W12_INFO'],
    read: ['contracts/m35-v1/HOST-M35.md', 'contracts/m3c-v1/HOST-M3C.md', 'apps/water/host/src/commands.rs', 'apps/water/host/src/lib.rs', 'apps/water/host/tauri.conf.json', 'apps/water/host/README.md', 'apps/water/host/tests/host_v1.rs'],
    frozen: ['contracts/m35-v1/HOST-M35.md', 'contracts/m35-v1/IPC-M35.md', 'contracts/m3c-v1/HOST-M3C.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/desktop-v1/HOST.md', 'contracts/checkup-v1/IPC.md', RENAME],
    extra: {expectedConfig: {...n2.expectedConfig, bundle: {...n2.expectedConfig.bundle, publisher: 'Flick'}}, nativeSteps: steps, nativeQuarantineName: '.flick-quarantine', nativeDataPrefix: '.local/w12-p3-native/'}}),
  task('N1', 4, {title: '界面：整组跳过、关于与诊断、第一次打开、几处小修', executor: 'astra', gate: 'light', ticket: T + 'WATER-W12-P4-UI-20261107.md',
    purpose: 'card and row skip by menu and skip keys, skip list display_zh, about page with version, license, homepage and copy diagnostics, first-run page once, trends new tag, heatmap and queued-click fixes, journal note on the result',
    hint: 'UI: W12 sections 1.4, 1.5, 1.7, 2, 4.3, 4.4; pre-listed old drawer and card assertions; three new required screenshots; light gate with browser NCs.',
    proof: ['UI_W12_SKIP', 'UI_W12_INTRO', 'UI_W12_FIXES'],
    read: ['contracts/m35-v1/UI-M35.md', 'contracts/m35-v1/IPC-M35.md', 'docs/design/water-ui-v3/DESIGN.md', 'docs/design/flick-brand/BRAND.md', 'docs/dispatch/tickets/WATER-W10-M6-ADDENDUM-02-20261106.md', 'apps/water/ui/app.mjs', 'apps/water/ui/ipc.mjs', 'apps/water/ui/views/detail.mjs', 'apps/water/ui/views/locations.mjs', 'apps/water/ui/views/trends.mjs', 'apps/water/ui/views/charts.mjs', 'apps/water/ui/tests/unit.test.mjs', 'apps/water/ui/tests/browser.test.mjs'],
    frozen: ['contracts/m35-v1/UI-M35.md', 'contracts/m35-v1/IPC-M35.md', 'contracts/m35-v1/ui-fixtures-m35.json', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/m3c-v1/ui-fixtures-m3c.json', 'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/ui-fixtures.json', 'contracts/checkup-v1/UI.md', 'docs/design/water-ui-v3/DESIGN.md', 'docs/design/water-ui-v3/mockup.html', 'docs/design/water-ui-v3/tokens.css', 'docs/design/flick-brand/BRAND.md', 'docs/design/flick-brand/flick-mark.svg'],
    extra: {requiredScreenshots: [...n1.requiredScreenshots, 'v3-intro-1240x820.png', 'v3-settings-about-1240x820.png', 'v3-settings-skip-1240x820.png']}}),
  task('N4', 5, {title: '规则：按 C 盘只读调查补认不出的大项', executor: 'sol', gate: 'light', ticket: T + 'WATER-W12-P5-RULES-20261107.md',
    purpose: 'eight new rules and gpu-shader-cache extended from the 11-07 read-only C: survey (VRChat cache, WeCom upgrade staging, npm global reify leftovers, WeChat xlog, Chromium component CRX cache, OneDrive logs, Copilot SDK runtimes, Claude Code installer downloads); data_version 2026-11-07.3',
    hint: 'Rules data only: section 1 table; protected-overlap conflicts are dropped and reported; two NCs edit rules/windows.json.',
    proof: ['RULES_W12_NEW', 'RULES_W12_NEW'],
    read: ['contracts/m35-v1/RULES-M35.md', 'contracts/checkup-v1/RULES.md', 'packages/junk-rules/rules/windows.json', 'packages/junk-rules/tests/rules_v1.rs', 'packages/junk-rules/README.md'],
    frozen: ['contracts/m35-v1/RULES-M35.md', 'contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/RULES-M3C.md', 'contracts/m3d-v1/RULES-M3D.md', 'contracts/m35-v1/SCAN-M35.md'],
    extra: {negativeControlPaths: ['packages/junk-rules/src', 'packages/junk-rules/rules/windows.json']}}),
];
const manifest = {
  schemaVersion: 1, wave: 'water-wave12-skip-units-release-prep', status: 'OPEN', controller: 'Claude', controllerRoot: 'F:/new/smaltalk/water', controllerBranch: 'main',
  helpers: Object.fromEntries(tasks.map(t => [t.id.slice(9), t.kind === 'host' || t.kind === 'service' ? 'scripts/desktop-wave-check.mjs' : 'scripts/checkup-wave-check.mjs'])),
  baseCommit: base, baseTag: 'water-w12-p1-base-20261107 (one tag per task, all on this commit)',
  plan: 'docs/dispatch/wave12/PLAN.md', overallPlan: 'docs/PLAN-OPEN-SOURCE-20261107.md', workerRules: 'docs/dispatch/W12-WORKER-RULES.md', commonRules: 'docs/dispatch/WORKER-RULES.md', contract: W12,
  userDecision: '2026-11-07: "不需要收费验证啊，目前我这个是规划开源项目" (M4 becomes open-source release v0.1); "先看一眼计划，把计划定稿，然后你直接建公开仓库，但是先不放代码进去" (overall plan final: wave 12 widened, lighter light gates, skip remembers the kind at the location); "开始写第十二波"',
  offlineCache: w11.offlineCache,
  frozenFiles: frozen(['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'docs/decisions/ADR-019-project-declarations-and-quarantine.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/m35-v1/IPC-M35.md', 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json', RENAME, W12, ...RULES]),
  readyReport: 'docs/dispatch/wave12/PLAN.md',
  tasks,
  mergeOrder: ['WATER-W12-P1', 'WATER-W12-P2', 'WATER-W12-P3', 'WATER-W12-P4', 'WATER-W12-P5'],
};
mkdirSync('docs/dispatch/wave12', {recursive: true});
writeFileSync('docs/dispatch/wave12/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
for (const t of tasks) console.log(t.id, t.status, t.kind, t.outputRoot, t.gate, 'modes', t.allowedModes.join('/'), 'final', t.expectedFinalModes.join('/'), 'frozen', t.frozenFiles.length, 'tests', t.expectedTests.length, t.binName ?? '', t.windowTitle ?? '');
