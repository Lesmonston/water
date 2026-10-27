// Write docs/dispatch/wave5/manifest.json for the five M2 tickets (run from the repo root).
// Task configs come from the accepted tasks that last touched each package (G5, G2, G6, G7 in wave 4; A in wave 2),
// stripped of their history and given wave 5 IDs, trees, SPECs, markers and the .offline-cache sources.
// Frozen-file hashes are taken from a fresh worker tree (its checkout line endings are what the gates hash).
// Usage: node .local/w5-prep/make-wave5.mjs <base commit> <fresh worker tree>
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
const [base, tree] = process.argv.slice(2); if (!/^[0-9a-f]{40}$/.test(base) || !tree) throw Error('usage: <base commit> <fresh worker tree>');
const w4 = JSON.parse(readFileSync('docs/dispatch/wave4/manifest.json', 'utf8')), w2 = JSON.parse(readFileSync('docs/dispatch/wave2/manifest.json', 'utf8'));
const loop = JSON.parse(readFileSync('.local/w5-prep/native-clean-loop.json', 'utf8'));
const frozen = paths => paths.map(path => ({path, sha256: createHash('sha256').update(readFileSync(join(tree, path))).digest('hex')}));
const HISTORY = ['status', 'baseCommit', 'snapshotRef', 'readyOn', 'dispatchedAt', 'startedAt', 'model', 'modelAssignment', 'id', 'title', 'slot', 'worktree', 'branch', 'ticket', 'report', 'spec', 'evidenceDir', 'allowedFiles', 'allowedPrefixes', 'mustRead', 'frozenFiles', 'proofTargets', 'baselineStatus', 'baselineEvidence', 'dispatchReportedAt', 'dispatchEvidence', 'startEvidence', 'submittedHead', 'implementationCommit', 'submittedAs', 'controllerReview', 'controllerReview2', 'controllerReview3', 'addenda', 'carryOverLater', 'carryOver', 'carryOverBeforeM2', 'carryOverToFinishing', 'carryOverM2', 'verifiedAt', 'acceptedCommit', 'integrationBranch', 'mergeCommit', 'purpose', 'userDecision', 'controllerAcceptanceExtra', 'modelHint', 'gate', 'integrationCommit', 'addendumModel', 'verificationScope'];
const from = (m, id) => { const t = {...m.tasks.find(x => x.id === id)}; for (const k of HISTORY) delete t[k]; return t; };
const CORE = 'F:/new/smaltalk/water/.offline-cache/core/registry', DESKTOP = 'F:/new/smaltalk/water/.offline-cache/desktop/registry';
const RULES = 'docs/dispatch/W5-M2-WORKER-RULES.md';
const task = (slot, title, src, extra) => {
  const id = 'WATER-W5-' + slot.toUpperCase(), ev = 'docs/acceptance/wave5/' + slot + '/', report = 'docs/dispatch/reports/' + id + '-REPORT.md';
  const t = {...src, id, title, slot: 'w5-' + slot, worktree: 'F:/new/smaltalk/water/.worktrees/w5-' + slot, branch: 'worker/water-w5-' + slot,
    baseCommit: base, snapshotRef: 'refs/tags/water-w5-m2-base-20261027', status: 'READY', readyOn: '2026-10-27', dispatchedAt: null, startedAt: null,
    model: null, modelAssignment: 'user-arranged; report actual engine/model', purpose: 'M2', report, evidenceDir: ev, allowedFiles: [report], ...extra};
  t.allowedPrefixes = [t.outputRoot + '/', ev];
  return t;
};
const tasks = [
  task('h1', '清理执行器 M2 收尾', from(w4, 'WATER-W4-G5'), {
    gate: 'heavy', ticket: 'docs/dispatch/tickets/WATER-W5-H1-CLEAN-M2-20261027.md', spec: 'contracts/m2-v1/CLEAN-M2.md', cargoCacheSource: CORE,
    proofTargets: {nc1: 'CLEAN_FREED_EXACT', nc2: 'CLEAN_UNPAIRED_NAME', nc3: 'CLEAN_DEEP_TREE'},
    modelHint: 'Deletion-path ticket: strong Rust and Windows file-system reasoning.',
    mustRead: [RULES, 'contracts/m2-v1/CLEAN-M2.md', 'contracts/m2-prep-v1/CLEAN-REPORT.md', 'contracts/hardening-v1/CLEAN-HARDENING.md', 'contracts/checkup-v1/CLEAN.md', 'packages/junk-clean/src/native_windows.rs', 'packages/junk-clean/tests/clean_v1.rs'],
    frozenFiles: frozen(['contracts/m2-v1/CLEAN-M2.md', 'contracts/m2-prep-v1/CLEAN-REPORT.md', 'contracts/hardening-v1/CLEAN-HARDENING.md', 'contracts/checkup-v1/CLEAN.md'])}),
  task('h2', '服务 M2 收尾', from(w4, 'WATER-W4-G2'), {
    gate: 'heavy', ticket: 'docs/dispatch/tickets/WATER-W5-H2-SERVICE-M2-20261027.md', spec: 'contracts/m2-v1/SERVICE-M2.md', cargoCacheSource: CORE,
    proofTargets: {nc1: 'SERVICE_PANIC_IDLE', nc2: 'SERVICE_SCAN_RECORD', nc3: 'SERVICE_CUSTOM_ROOT'},
    modelHint: 'Rust service core that orchestrates deletion.',
    mustRead: [RULES, 'contracts/m2-v1/SERVICE-M2.md', 'contracts/desktop-v1/SERVICE.md', 'contracts/hardening-v1/SERVICE-HARDENING.md', 'packages/water-service/src/clean.rs', 'packages/water-service/src/service.rs', 'packages/water-service/src/lib.rs', 'packages/water-service/tests/service_v1.rs'],
    frozenFiles: frozen(['contracts/m2-v1/SERVICE-M2.md', 'contracts/desktop-v1/SERVICE.md', 'contracts/hardening-v1/SERVICE-HARDENING.md'])}),
  task('h3', '宿主打开清理', from(w4, 'WATER-W4-G6'), {
    ...loop, gate: 'heavy-native', ticket: 'docs/dispatch/tickets/WATER-W5-H3-HOST-M2-20261027.md', spec: 'contracts/m2-v1/HOST-M2.md', cargoCacheSource: DESKTOP,
    proofTargets: {nc1: 'HOST_BACKEND_RELEASE', nc2: 'HOST_CLOSE_DURING_CLEAN', nc3: 'HOST_CLEAN_ENABLED'},
    realDataPermission: 'native --final only: fixture clean loop; categories off, only the synthetic fixture is selectable; protected locations are measured read-only; process list read for in-use',
    modelHint: 'Rust/Tauri desktop host; one native window at the final gate (fixture clean loop).',
    mustRead: [RULES, 'docs/dispatch/W3-DESKTOP-WORKER-RULES.md', 'contracts/m2-v1/HOST-M2.md', 'contracts/m2-prep-v1/HOST-FINISHING.md', 'contracts/desktop-v1/WIRING.md', 'contracts/desktop-v1/HOST.md', 'apps/water/host/src/lib.rs', 'apps/water/host/src/commands.rs', 'apps/water/host/src/service.rs', 'apps/water/host/src/startup.rs', 'apps/water/host/src/data.rs', 'apps/water/host/tests/host_v1.rs'],
    frozenFiles: frozen(['contracts/m2-v1/HOST-M2.md', 'contracts/m2-prep-v1/HOST-FINISHING.md', 'contracts/desktop-v1/WIRING.md', 'contracts/desktop-v1/HOST.md'])}),
  task('h4', '界面 M2', from(w4, 'WATER-W4-G7'), {
    gate: 'light', ticket: 'docs/dispatch/tickets/WATER-W5-H4-UI-M2-20261027.md', spec: 'docs/dispatch/tickets/WATER-W5-H4-UI-M2-20261027.md',
    proofTargets: {nc1: 'UI_CLEAN_SCOPE', nc2: 'UI_NOTICE_SCOPE', nc3: 'UI_STOP_FEEDBACK'},
    requiredScreenshots: [...w4.tasks.find(x => x.id === 'WATER-W4-G7').requiredScreenshots, 'stop-failed-1240x820.png'],
    modelHint: 'UI ticket: strong front-end ability; judged against real screenshots.',
    mustRead: [RULES, 'contracts/hardening-v1/UI-POLISH.md', 'contracts/checkup-v1/UI.md', 'docs/design/water-ui-v1/DESIGN.md', 'apps/water/ui/app.mjs', 'apps/water/ui/tests/browser.test.mjs'],
    frozenFiles: w4.tasks.find(x => x.id === 'WATER-W4-G7').frozenFiles.map(f => f.path).reduce((a, p) => a.concat(frozen([p])), [])}),
  task('h5', 'Rust 构建目录规则', from(w2, 'WATER-W2-A'), {
    gate: 'light', ticket: 'docs/dispatch/tickets/WATER-W5-H5-RULES-M2-20261027.md', spec: 'contracts/m2-v1/RULES-M2.md', cargoCacheSource: CORE,
    proofTargets: {nc1: 'RULES_RUST_BUILD'}, outputRootExists: true, nativeWindowBudget: 0, nativeDirectoryDialogBudget: 0, macOS: 'unverified',
    modelHint: 'Rules data plus validator tests; light gate.',
    mustRead: [RULES, 'contracts/m2-v1/RULES-M2.md', 'contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'packages/junk-rules/rules/windows.json', 'packages/junk-rules/tests/rules_v1.rs'],
    frozenFiles: frozen(['contracts/m2-v1/RULES-M2.md', 'contracts/checkup-v1/RULES.md'])})
];
const manifest = {
  schemaVersion: w4.schemaVersion, wave: 'water-wave5-m2', status: 'READY', controller: w4.controller, controllerRoot: w4.controllerRoot, controllerBranch: 'main',
  helpers: {H1: 'scripts/checkup-wave-check.mjs', H2: 'scripts/desktop-wave-check.mjs', H3: 'scripts/desktop-wave-check.mjs', H4: 'scripts/checkup-wave-check.mjs', H5: 'scripts/checkup-wave-check.mjs'},
  baseCommit: base, baseTag: 'water-w5-m2-base-20261027', plan: 'docs/dispatch/wave5/PLAN.md', m2Plan: 'docs/M2-PLAN-20261027.md', workerRules: RULES,
  userDecision: '2026-10-27: all four M2 decisions approved as recommended ("Approve all four decisions as recommended and prepare the wave 5 tickets.")',
  offlineCache: {core: CORE, desktop: DESKTOP, copiedFrom: ['F:/new/smaltalk/water/.worktrees/a/.local/cargo-home/registry', 'F:/new/smaltalk/water/.worktrees/ac/.local/desktop-cargo-home/registry'], check: 'diff -rq byte-identical, 11159 files'},
  frozenFiles: frozen(['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', RULES, 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json']),
  gateSelfTest: 'docs/acceptance/wave5/controller/selftest/',
  selfTest: {trees: ['.worktrees/w5-selftest-h3'], ids: ['WATER-W5-SELFTEST-H3'], result: 'fixture clean loop passed at selftest commit d33c7923 (clean switch opened only): 1 window, 17 s, 3,145,815 bytes deleted, kept files intact, journal intent+result, exit 0', evidence: 'docs/acceptance/wave5/controller/selftest/'},
  readyReport: null, tasks
};
mkdirSync('docs/dispatch/wave5', {recursive: true});
writeFileSync('docs/dispatch/wave5/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
for (const t of tasks) console.log(t.id, t.kind, t.gate, t.cargoCacheSource ?? '-', JSON.stringify(t.proofTargets), 'frozen', t.frozenFiles.length, 'modes', t.allowedModes.join('/'), 'final', t.expectedFinalModes.join('/'));
