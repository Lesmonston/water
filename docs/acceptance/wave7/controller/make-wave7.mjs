// Write docs/dispatch/wave7/manifest.json for the four M3 fix tickets (run from the repo root).
// Task configs come from the accepted tasks that last touched each package (W6-I2 host, W6-I3 UI, W5-H2 service,
// W6-I1 rules), stripped of their history and given wave 7 IDs, trees, SPECs and markers. The host keeps the
// fixture clean loop with its own data prefix. Frozen-file hashes are taken from a fresh worker tree (its checkout
// line endings are what the gates hash).
// Usage: node docs/acceptance/wave7/controller/make-wave7.mjs <base commit> <fresh worker tree>
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
const [base, tree] = process.argv.slice(2); if (!/^[0-9a-f]{40}$/.test(base) || !tree) throw Error('usage: <base commit> <fresh worker tree>');
const w5 = JSON.parse(readFileSync('docs/dispatch/wave5/manifest.json', 'utf8'));
const w6 = JSON.parse(readFileSync('docs/dispatch/wave6/manifest.json', 'utf8'));
const frozen = paths => paths.map(path => ({path, sha256: createHash('sha256').update(readFileSync(join(tree, path))).digest('hex')}));
const HISTORY = ['status', 'baseCommit', 'snapshotRef', 'readyOn', 'dispatchedAt', 'startedAt', 'model', 'modelAssignment', 'id', 'title', 'slot', 'worktree', 'branch', 'ticket', 'report', 'spec', 'evidenceDir', 'allowedFiles', 'allowedPrefixes', 'mustRead', 'frozenFiles', 'proofTargets', 'baselineStatus', 'baselineEvidence', 'dispatchReportedAt', 'dispatchEvidence', 'startEvidence', 'submittedHead', 'implementationCommit', 'submittedAs', 'controllerReview', 'controllerReview2', 'controllerReview3', 'addenda', 'carryOverLater', 'carryOver', 'carryOverBeforeM2', 'carryOverToFinishing', 'carryOverM2', 'verifiedAt', 'acceptedCommit', 'integrationBranch', 'mergeCommit', 'purpose', 'userDecision', 'controllerAcceptanceExtra', 'modelHint', 'gate', 'integrationCommit', 'addendumModel', 'verificationScope', 'workerSelfReport', 'relayedAt', 'relayEvidence', 'acceptanceProgress', 'acceptanceNote', 'blockedAt', 'blockedCommit', 'blockedReason', 'nativeDataPrefix'];
const from = (m, id) => { const t = {...m.tasks.find(x => x.id === id)}; for (const k of HISTORY) delete t[k]; return t; };
const RULES = 'docs/dispatch/W7-M3-FIX-WORKER-RULES.md', REVIEW = 'docs/acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md';
const task = (slot, title, src, extra) => {
  const id = 'WATER-W7-' + slot.toUpperCase(), ev = 'docs/acceptance/wave7/' + slot + '/', report = 'docs/dispatch/reports/' + id + '-REPORT.md';
  const t = {...src, id, title, slot: 'w7-' + slot, worktree: 'F:/new/smaltalk/water/.worktrees/w7-' + slot, branch: 'worker/water-w7-' + slot,
    baseCommit: base, snapshotRef: 'refs/tags/water-w7-m3-fix-base-20261028', status: 'READY', readyOn: '2026-10-28', dispatchedAt: null, startedAt: null,
    model: null, modelAssignment: 'user-arranged; report actual engine/model', purpose: 'M3 fixes', report, evidenceDir: ev, allowedFiles: [report], ...extra};
  t.allowedPrefixes = [t.outputRoot + '/', ev];
  return t;
};
const i3 = w6.tasks.find(x => x.id === 'WATER-W6-I3');
const h2 = from(w5, 'WATER-W5-H2');
const tasks = [
  task('j1', '宿主补遗', from(w6, 'WATER-W6-I2'), {
    gate: 'heavy-native', ticket: 'docs/dispatch/tickets/WATER-W7-J1-HOST-FIX-20261028.md', spec: 'contracts/m3-v1/HOST-M3-FIX.md',
    nativeDataPrefix: '.local/w7-j1-native/',
    proofTargets: {nc1: 'HOST_UNSTARTED_SERVICE', nc2: 'HOST_EXIT_DEADLINE', nc3: 'HOST_UNKNOWN_RESET'},
    modelHint: 'Rust/Tauri desktop host; one native window at the final gate (fixture clean loop).',
    mustRead: [RULES, 'contracts/m3-v1/HOST-M3-FIX.md', 'contracts/m3-v1/HOST-M3.md', 'contracts/m2-v1/HOST-M2.md', REVIEW, 'apps/water/host/src/lib.rs', 'apps/water/host/src/service.rs', 'apps/water/host/tests/host_v1.rs'],
    frozenFiles: frozen(['contracts/m3-v1/HOST-M3-FIX.md', 'contracts/m3-v1/HOST-M3.md', 'contracts/m2-v1/HOST-M2.md', 'contracts/m2-prep-v1/HOST-FINISHING.md', 'contracts/desktop-v1/WIRING.md', 'contracts/desktop-v1/HOST.md'])}),
  task('j2', '界面补遗', from(w6, 'WATER-W6-I3'), {
    gate: 'light', ticket: 'docs/dispatch/tickets/WATER-W7-J2-UI-FIX-20261028.md', spec: 'contracts/m3-v1/UI-M3-FIX.md',
    proofTargets: {nc1: 'UI_RECOVER_ERROR', nc2: 'UI_READ_ORDER', nc3: 'UI_STALE_START'},
    requiredScreenshots: [...i3.requiredScreenshots],
    modelHint: 'UI ticket: strong front-end ability; judged against real screenshots.',
    mustRead: [RULES, 'contracts/m3-v1/UI-M3-FIX.md', 'docs/dispatch/tickets/WATER-W6-I3-UI-M3-20261028.md', 'contracts/hardening-v1/UI-POLISH.md', 'contracts/checkup-v1/UI.md', 'docs/design/water-ui-v1/DESIGN.md', REVIEW, 'apps/water/ui/app.mjs', 'apps/water/ui/tests/browser.test.mjs'],
    frozenFiles: frozen(['contracts/m3-v1/UI-M3-FIX.md', ...i3.frozenFiles.map(f => f.path)])}),
  task('j3', '服务补遗', h2, {
    gate: 'light-real', ticket: 'docs/dispatch/tickets/WATER-W7-J3-SERVICE-FIX-20261028.md', spec: 'contracts/m3-v1/SERVICE-M3-FIX.md',
    allowedModes: h2.allowedModes.filter(m => m !== 'red-nc3'),
    proofTargets: {nc1: 'SERVICE_GROUP_INDEX', nc2: 'SERVICE_SNAPSHOT_ORPHAN'},
    modelHint: 'Rust service; small fixes with tests; final includes a read-only real checkup.',
    mustRead: [RULES, 'contracts/m3-v1/SERVICE-M3-FIX.md', 'contracts/m2-v1/SERVICE-M2.md', 'contracts/desktop-v1/SERVICE.md', 'contracts/checkup-v1/ui-fixtures.json', 'packages/water-service/src/clean.rs', 'packages/water-service/src/service.rs', 'packages/water-service/tests/service_v1.rs'],
    frozenFiles: frozen(['contracts/m3-v1/SERVICE-M3-FIX.md', 'contracts/m2-v1/SERVICE-M2.md', 'contracts/desktop-v1/SERVICE.md', 'contracts/hardening-v1/SERVICE-HARDENING.md', 'contracts/checkup-v1/ui-fixtures.json'])}),
  task('j4', '规则措辞与出处', from(w6, 'WATER-W6-I1'), {
    gate: 'light', ticket: 'docs/dispatch/tickets/WATER-W7-J4-RULES-FIX-20261028.md', spec: 'contracts/m3-v1/RULES-M3-FIX.md',
    proofTargets: {nc1: 'RULES_M3_WORDING'},
    modelHint: 'Rules data wording and tests; light gate; no web access needed.',
    mustRead: [RULES, 'contracts/m3-v1/RULES-M3-FIX.md', 'contracts/m3-v1/RULES-AGENT.md', 'contracts/checkup-v1/RULES.md', REVIEW, 'packages/junk-rules/rules/windows.json', 'packages/junk-rules/tests/rules_v1.rs'],
    frozenFiles: frozen(['contracts/m3-v1/RULES-M3-FIX.md', 'contracts/m3-v1/RULES-AGENT.md', 'contracts/checkup-v1/RULES.md'])})
];
const manifest = {
  schemaVersion: w6.schemaVersion, wave: 'water-wave7-m3-fixes', status: 'READY', controller: w6.controller, controllerRoot: w6.controllerRoot, controllerBranch: 'main',
  helpers: {J1: 'scripts/desktop-wave-check.mjs', J2: 'scripts/checkup-wave-check.mjs', J3: 'scripts/desktop-wave-check.mjs', J4: 'scripts/checkup-wave-check.mjs'},
  baseCommit: base, baseTag: 'water-w7-m3-fix-base-20261028', plan: 'docs/dispatch/wave7/PLAN.md', m3Plan: 'docs/M3-PLAN-20261028.md', workerRules: RULES,
  userDecision: '2026-10-28: "先做M3的收尾吧" (finish M3 loose ends first); wave 6 carry-overs become four tickets, orphan processes move to wave 8',
  offlineCache: w6.offlineCache,
  frozenFiles: frozen(['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', RULES, 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json']),
  readyReport: null, tasks
};
mkdirSync('docs/dispatch/wave7', {recursive: true});
writeFileSync('docs/dispatch/wave7/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
for (const t of tasks) console.log(t.id, t.kind, t.gate, t.cargoCacheSource ?? '-', JSON.stringify(t.proofTargets), 'frozen', t.frozenFiles.length, 'modes', t.allowedModes.join('/'), 'final', t.expectedFinalModes.join('/'), t.nativeDataPrefix ?? '', t.requiredScreenshots?.length ?? '');
