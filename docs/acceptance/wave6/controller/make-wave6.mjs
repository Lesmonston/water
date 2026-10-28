// Write docs/dispatch/wave6/manifest.json for the three M3 tickets (run from the repo root).
// Task configs come from the accepted wave 5 tasks that last touched each package (H5 rules, H3 host, H4 UI),
// stripped of their history and given wave 6 IDs, trees, SPECs and markers. The host keeps H3's fixture clean
// loop with its own data prefix. Frozen-file hashes are taken from a fresh worker tree (its checkout line endings
// are what the gates hash).
// Usage: node .local/w6-prep/make-wave6.mjs <base commit> <fresh worker tree>
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
const [base, tree] = process.argv.slice(2); if (!/^[0-9a-f]{40}$/.test(base) || !tree) throw Error('usage: <base commit> <fresh worker tree>');
const w5 = JSON.parse(readFileSync('docs/dispatch/wave5/manifest.json', 'utf8'));
const frozen = paths => paths.map(path => ({path, sha256: createHash('sha256').update(readFileSync(join(tree, path))).digest('hex')}));
const HISTORY = ['status', 'baseCommit', 'snapshotRef', 'readyOn', 'dispatchedAt', 'startedAt', 'model', 'modelAssignment', 'id', 'title', 'slot', 'worktree', 'branch', 'ticket', 'report', 'spec', 'evidenceDir', 'allowedFiles', 'allowedPrefixes', 'mustRead', 'frozenFiles', 'proofTargets', 'baselineStatus', 'baselineEvidence', 'dispatchReportedAt', 'dispatchEvidence', 'startEvidence', 'submittedHead', 'implementationCommit', 'submittedAs', 'controllerReview', 'controllerReview2', 'controllerReview3', 'addenda', 'carryOverLater', 'carryOver', 'carryOverBeforeM2', 'carryOverToFinishing', 'carryOverM2', 'verifiedAt', 'acceptedCommit', 'integrationBranch', 'mergeCommit', 'purpose', 'userDecision', 'controllerAcceptanceExtra', 'modelHint', 'gate', 'integrationCommit', 'addendumModel', 'verificationScope', 'workerSelfReport', 'relayedAt', 'relayEvidence', 'acceptanceProgress', 'acceptanceNote', 'blockedAt', 'blockedCommit', 'blockedReason'];
const from = id => { const t = {...w5.tasks.find(x => x.id === id)}; for (const k of HISTORY) delete t[k]; return t; };
const RULES = 'docs/dispatch/W6-M3-WORKER-RULES.md';
const task = (slot, title, src, extra) => {
  const id = 'WATER-W6-' + slot.toUpperCase(), ev = 'docs/acceptance/wave6/' + slot + '/', report = 'docs/dispatch/reports/' + id + '-REPORT.md';
  const t = {...src, id, title, slot: 'w6-' + slot, worktree: 'F:/new/smaltalk/water/.worktrees/w6-' + slot, branch: 'worker/water-w6-' + slot,
    baseCommit: base, snapshotRef: 'refs/tags/water-w6-m3-base-20261028', status: 'READY', readyOn: '2026-10-28', dispatchedAt: null, startedAt: null,
    model: null, modelAssignment: 'user-arranged; report actual engine/model', purpose: 'M3', report, evidenceDir: ev, allowedFiles: [report], ...extra};
  t.allowedPrefixes = [t.outputRoot + '/', ev];
  return t;
};
const h4 = w5.tasks.find(x => x.id === 'WATER-W5-H4');
const tasks = [
  task('i1', 'Agent 工具规则', from('WATER-W5-H5'), {
    gate: 'light', ticket: 'docs/dispatch/tickets/WATER-W6-I1-RULES-AGENT-20261028.md', spec: 'contracts/m3-v1/RULES-AGENT.md',
    proofTargets: {nc1: 'RULES_AGENT_TOOLS'},
    modelHint: 'Rules data plus validator tests; light gate; reads public docs to confirm sources.',
    mustRead: [RULES, 'contracts/m3-v1/RULES-AGENT.md', 'contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'docs/research/agent-tools-20261028/VERIFY.md', 'docs/research/agent-tools-20261028/GROK-REPORT.md', 'packages/junk-rules/rules/windows.json', 'packages/junk-rules/tests/rules_v1.rs'],
    frozenFiles: frozen(['contracts/m3-v1/RULES-AGENT.md', 'contracts/checkup-v1/RULES.md', 'docs/research/agent-tools-20261028/VERIFY.md'])}),
  task('i2', '宿主收尾', from('WATER-W5-H3'), {
    gate: 'heavy-native', ticket: 'docs/dispatch/tickets/WATER-W6-I2-HOST-M3-20261028.md', spec: 'contracts/m3-v1/HOST-M3.md',
    nativeDataPrefix: '.local/w6-i2-native/',
    proofTargets: {nc1: 'HOST_EXIT_DURING_CLEAN', nc2: 'HOST_CLOSE_UNKNOWN', nc3: 'HOST_CLOSE_DURING_CLEAN'},
    modelHint: 'Rust/Tauri desktop host; one native window at the final gate (fixture clean loop).',
    mustRead: [RULES, 'docs/dispatch/W3-DESKTOP-WORKER-RULES.md', 'contracts/m3-v1/HOST-M3.md', 'contracts/m2-v1/HOST-M2.md', 'contracts/m2-prep-v1/HOST-FINISHING.md', 'contracts/desktop-v1/WIRING.md', 'contracts/desktop-v1/HOST.md', 'apps/water/host/src/lib.rs', 'apps/water/host/src/data.rs', 'apps/water/host/tests/host_v1.rs'],
    frozenFiles: frozen(['contracts/m3-v1/HOST-M3.md', 'contracts/m2-v1/HOST-M2.md', 'contracts/m2-prep-v1/HOST-FINISHING.md', 'contracts/desktop-v1/WIRING.md', 'contracts/desktop-v1/HOST.md'])}),
  task('i3', '界面收尾', from('WATER-W5-H4'), {
    gate: 'light', ticket: 'docs/dispatch/tickets/WATER-W6-I3-UI-M3-20261028.md', spec: 'docs/dispatch/tickets/WATER-W6-I3-UI-M3-20261028.md',
    proofTargets: {nc1: 'UI_RETURN_SCOPE', nc2: 'UI_RECONNECT_READ', nc3: 'UI_CLEAN_STOP'},
    requiredScreenshots: [...h4.requiredScreenshots, 'clean-stop-failed-1240x820.png'],
    modelHint: 'UI ticket: strong front-end ability; judged against real screenshots.',
    mustRead: [RULES, 'contracts/hardening-v1/UI-POLISH.md', 'contracts/checkup-v1/UI.md', 'docs/design/water-ui-v1/DESIGN.md', 'apps/water/ui/app.mjs', 'apps/water/ui/tests/browser.test.mjs'],
    frozenFiles: h4.frozenFiles.map(f => f.path).reduce((a, p) => a.concat(frozen([p])), [])})
];
const manifest = {
  schemaVersion: w5.schemaVersion, wave: 'water-wave6-m3', status: 'READY', controller: w5.controller, controllerRoot: w5.controllerRoot, controllerBranch: 'main',
  helpers: {I1: 'scripts/checkup-wave-check.mjs', I2: 'scripts/desktop-wave-check.mjs', I3: 'scripts/checkup-wave-check.mjs'},
  baseCommit: base, baseTag: 'water-w6-m3-base-20261028', plan: 'docs/dispatch/wave6/PLAN.md', m3Plan: 'docs/M3-PLAN-20261028.md', workerRules: RULES,
  userDecision: '2026-10-28: all five M3 decisions approved as recommended ("可以，出单吧")',
  offlineCache: w5.offlineCache,
  frozenFiles: frozen(['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', RULES, 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json']),
  readyReport: null, tasks
};
mkdirSync('docs/dispatch/wave6', {recursive: true});
writeFileSync('docs/dispatch/wave6/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
for (const t of tasks) console.log(t.id, t.kind, t.gate, t.cargoCacheSource ?? '-', JSON.stringify(t.proofTargets), 'frozen', t.frozenFiles.length, 'modes', t.allowedModes.join('/'), 'final', t.expectedFinalModes.join('/'), t.nativeDataPrefix ?? '');
