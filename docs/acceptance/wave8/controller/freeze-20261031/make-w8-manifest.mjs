// Build docs/dispatch/wave8/manifest.json (first batch: K1, K2, K3, K5, K6) from earlier task entries.
import fs from 'node:fs';
import crypto from 'node:crypto';
const repo = 'F:/new/smaltalk/water';
const BASE = '912eba100ba342c3eeb21ba555c6d589b91e6b4f';
const TAG = 'refs/tags/water-w8-m3c-base-20261031';
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(repo + '/' + p)).digest('hex');
const frozen = paths => paths.map(path => ({ path, sha256: sha(path) }));
const clone = v => JSON.parse(JSON.stringify(v));
const w2 = JSON.parse(fs.readFileSync(repo + '/docs/dispatch/wave2/manifest.json', 'utf8'));
const w7 = JSON.parse(fs.readFileSync('C:/Windows/TEMP/claude/F--new-smaltalk-water/2248d207-077d-44a9-b861-1bc97e6231f3/scratchpad/w7-manifest-ready.json', 'utf8'));
const pick = (m, id) => clone(m.tasks.find(t => t.id === id));
const DROP = ['dispatchReportedAt', 'dispatchEvidence', 'startEvidence', 'submittedHead', 'implementationCommit', 'controllerReview', 'controllerReview2',
  'addenda', 'verifiedAt', 'acceptedCommit', 'integrationCommit', 'integrationBranch', 'addendumModel', 'verificationScope', 'mergeCommit', 'carryOverLater', 'carryOverM2', 'acceptance'];
const RULES = 'docs/dispatch/W8-M3C-WORKER-RULES.md';
function task(template, o) {
  const t = template;
  for (const k of DROP) delete t[k];
  const n = o.n, slot = 'w8-' + n;
  Object.assign(t, {
    id: 'WATER-W8-' + n.toUpperCase(), title: o.title, slot, worktree: repo + '/.worktrees/' + slot, branch: 'worker/water-w8-' + n,
    baseCommit: BASE, snapshotRef: TAG, status: 'READY', readyOn: '2026-10-31', dispatchedAt: null, startedAt: null, model: null,
    modelAssignment: 'user-arranged; report actual engine/model', purpose: 'M3 close', macOS: 'unverified',
    report: 'docs/dispatch/reports/WATER-W8-' + n.toUpperCase() + '-REPORT.md', evidenceDir: 'docs/acceptance/wave8/' + n + '/',
    allowedFiles: ['docs/dispatch/reports/WATER-W8-' + n.toUpperCase() + '-REPORT.md'],
    allowedPrefixes: [o.root + '/', 'docs/acceptance/wave8/' + n + '/'],
    ticket: o.ticket, spec: o.spec, proofTargets: o.proofs, modelHint: o.hint, mustRead: [RULES, o.spec, ...o.read],
    frozenFiles: frozen([o.spec, ...o.frozen]), baselineStatus: null, baselineEvidence: null, outputRootExists: true
  }, o.extra ?? {});
  return t;
}
const tasks = [];
tasks.push(task(pick(w2, 'WATER-W2-C'), {
  n: 'k1', title: '进程快照补程序路径与内存', root: 'packages/process-scan',
  ticket: 'docs/dispatch/tickets/WATER-W8-K1-PROCESS-20261031.md', spec: 'contracts/m3c-v1/PROCESS-M3C.md',
  proofs: { nc1: 'PROC_M3C_IMAGE', nc2: 'PROC_M3C_MEMORY' },
  hint: 'Rust + Windows FFI (QueryFullProcessImageNameW, NtQueryInformationProcess class 3); spawns its own test processes; light gate with real process counts.',
  read: ['contracts/checkup-v1/PROCESS.md', 'contracts/checkup-v1/MODEL.md', 'docs/dispatch/wave8/PLAN.md', 'packages/process-scan/src/lib.rs', 'packages/process-scan/src/native_windows.rs', 'packages/process-scan/tests/process_v1.rs'],
  frozen: ['contracts/checkup-v1/PROCESS.md', 'contracts/checkup-v1/MODEL.md'],
  extra: { cargoCacheSource: repo + '/.offline-cache/core/registry', allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'real', 'red-nc1', 'red-nc2'], expectedFinalModes: ['check', 'test', 'real'],
    allowedFfi: ['CloseHandle', 'CreateToolhelp32Snapshot', 'GetProcessTimes', 'NtQueryInformationProcess', 'OpenProcess', 'Process32FirstW', 'Process32NextW', 'QueryFullProcessImageNameW'],
    gate: 'light', realDataPermission: 'read-only process list per ADR-018; counts only' }
}));
tasks.push(task(pick(w7, 'WATER-W7-J4'), {
  n: 'k2', title: '在用方式、工作树规则与整盘位置', root: 'packages/junk-rules',
  ticket: 'docs/dispatch/tickets/WATER-W8-K2-RULES-20261031.md', spec: 'contracts/m3c-v1/RULES-M3C.md',
  proofs: { nc1: 'RULES_M3C_IN_USE', nc2: 'RULES_M3C_DRIVE_ROOT' },
  hint: 'Rules data and validator; light gate; no web access needed.',
  read: ['contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3-v1/RULES-AGENT.md', 'contracts/m3-v1/RULES-M3-FIX.md', 'contracts/m3c-v1/PROCESS-M3C.md', 'docs/maintenance/F-CLEANUP-20261029.md', 'packages/junk-rules/src/rules.rs', 'packages/junk-rules/src/plan.rs', 'packages/junk-rules/tests/rules_v1.rs'],
  frozen: ['contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3-v1/RULES-AGENT.md', 'contracts/m3-v1/RULES-M3-FIX.md', 'contracts/m3c-v1/PROCESS-M3C.md'],
  extra: { cargoCacheSource: repo + '/.offline-cache/core/registry', allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'real', 'red-nc1', 'red-nc2'], expectedFinalModes: ['check', 'test', 'real'], gate: 'light' }
}));
tasks.push(task(pick(w2, 'WATER-W2-B'), {
  n: 'k3', title: '去重体量、一次遍历与新在用方式', root: 'packages/junk-scan',
  ticket: 'docs/dispatch/tickets/WATER-W8-K3-SCAN-20261031.md', spec: 'contracts/m3c-v1/SCAN-M3C.md',
  proofs: { nc1: 'SCAN_M3C_UNIQUE', nc2: 'SCAN_M3C_COMPAT' },
  hint: 'Rust scan engine + Windows FFI (directory enumeration with file IDs); hard-link fixtures; light gate with a read-only real scan.',
  read: ['contracts/checkup-v1/SCAN.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/PROCESS-M3C.md', 'packages/junk-scan/src/scan.rs', 'packages/junk-scan/src/plan.rs', 'packages/junk-scan/src/native_windows.rs', 'packages/junk-scan/tests/scan_v1.rs', 'packages/junk-clean/src/native_windows.rs'],
  frozen: ['contracts/checkup-v1/SCAN.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/PROCESS-M3C.md', 'contracts/checkup-v1/real-plan-template.json'],
  extra: { cargoCacheSource: repo + '/.offline-cache/core/registry', allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'real', 'red-nc1', 'red-nc2'], expectedFinalModes: ['check', 'test', 'real'],
    allowedFfi: ['CloseHandle', 'CoTaskMemFree', 'CreateFileW', 'GetFileInformationByHandleEx', 'GetVolumeInformationByHandleW', 'SHGetKnownFolderPath'],
    gate: 'light', realDataPermission: 'read-only metadata per ADR-018; group-level output only' }
}));
const k5 = task(pick(w7, 'WATER-W7-J1'), {
  n: 'k5', title: '宿主转发排除与以后都跳过', root: 'apps/water/host',
  ticket: 'docs/dispatch/tickets/WATER-W8-K5-HOST-20261031.md', spec: 'contracts/m3c-v1/HOST-M3C.md',
  proofs: { nc1: 'HOST_M3C_EXCLUDE', nc2: 'HOST_M3C_SKIP' },
  hint: 'Tauri host thin adapters and host tests; one native window in the final.',
  read: ['contracts/m3c-v1/IPC-M3C.md', 'contracts/m3-v1/HOST-M3-FIX.md', 'contracts/m3-v1/HOST-M3.md', 'contracts/m2-v1/HOST-M2.md', 'contracts/desktop-v1/HOST.md', 'apps/water/host/src/commands.rs', 'apps/water/host/src/lib.rs', 'apps/water/host/tests/host_v1.rs'],
  frozen: ['contracts/m3c-v1/IPC-M3C.md', 'contracts/m3-v1/HOST-M3-FIX.md', 'contracts/m3-v1/HOST-M3.md', 'contracts/m2-v1/HOST-M2.md', 'contracts/desktop-v1/HOST.md'],
  extra: { allowedModes: ['baseline', 'lock', 'check', 'test', 'native', 'red-nc1', 'red-nc2', 'archive'], expectedFinalModes: ['check', 'test', 'native'], nativeDataPrefix: '.local/w8-k5-native/' }
});
tasks.push(k5);
const k6 = task(pick(w7, 'WATER-W7-J2'), {
  n: 'k6', title: '界面接上 M3 收口的各项', root: 'apps/water/ui',
  ticket: 'docs/dispatch/tickets/WATER-W8-K6-UI-20261031.md', spec: 'contracts/m3c-v1/UI-M3C.md',
  proofs: { nc1: 'UI_M3C_EXCLUDE', nc2: 'UI_M3C_DRIVE', nc3: 'UI_M3C_FORECAST' },
  hint: 'UI ticket (frosted white glass design); browser tests with screenshots; light gate.',
  read: ['contracts/m3c-v1/IPC-M3C.md', 'contracts/m3c-v1/ui-fixtures-m3c.json', 'contracts/m3-v1/UI-M3-FIX.md', 'contracts/hardening-v1/UI-POLISH.md', 'contracts/checkup-v1/UI.md', 'contracts/checkup-v1/IPC.md', 'docs/design/water-ui-v1/DESIGN.md', 'apps/water/ui/app.mjs', 'apps/water/ui/model.mjs', 'apps/water/ui/tests/browser.test.mjs'],
  frozen: ['contracts/m3c-v1/IPC-M3C.md', 'contracts/m3c-v1/ui-fixtures-m3c.json', 'contracts/m3-v1/UI-M3-FIX.md', 'contracts/hardening-v1/UI-POLISH.md', 'contracts/checkup-v1/UI.md', 'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/ui-fixtures.json', 'docs/design/water-ui-v1/DESIGN.md'],
  extra: { allowedModes: ['baseline', 'check', 'test', 'browser', 'red-nc1', 'red-nc2', 'red-nc3', 'archive'], expectedFinalModes: ['check', 'test', 'browser'], browserProofs: ['nc1', 'nc2', 'nc3'] }
});
k6.requiredScreenshots = [...k6.requiredScreenshots, 'detail-exclude-1240x820.png', 'results-drive-1240x820.png', 'locations-skipped-1240x820.png', 'trends-forecast-1240x820.png', 'home-due-1240x820.png'];
tasks.push(k6);
const manifest = {
  schemaVersion: 1, wave: 'water-wave8-m3-close', status: 'READY_FIRST_BATCH', controller: 'Claude', controllerRoot: repo, controllerBranch: 'main',
  helpers: { K1: 'scripts/checkup-wave-check.mjs', K2: 'scripts/checkup-wave-check.mjs', K3: 'scripts/checkup-wave-check.mjs', K4: 'scripts/desktop-wave-check.mjs', K5: 'scripts/desktop-wave-check.mjs', K6: 'scripts/checkup-wave-check.mjs' },
  baseCommit: BASE, baseTag: 'water-w8-m3c-base-20261031', plan: 'docs/dispatch/wave8/PLAN.md', m3Plan: 'docs/M3-PLAN-20261028.md', workerRules: RULES,
  userDecision: '2026-10-31: "把实战问题融入M3，解决完算M3彻底收口"; plan section 4 approved as recommended ("全部按推荐"). K4 (service) compiles against K1 and K3 and is dispatched after they merge.',
  offlineCache: clone(w7.offlineCache),
  frozenFiles: frozen(['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', RULES, 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json', 'contracts/m3c-v1/IPC-M3C.md']),
  readyReport: 'docs/dispatch/wave8/PLAN.md',
  plannedTasks: [{ id: 'WATER-W8-K4', title: '服务接上 M3 收口的各项', spec: 'contracts/m3c-v1/SERVICE-M3C.md', root: 'packages/water-service', gate: 'heavy', status: 'PLANNED', dispatchAfter: ['WATER-W8-K1', 'WATER-W8-K2', 'WATER-W8-K3'], note: 'base is main after K1-K3 merge' }],
  tasks
};
fs.writeFileSync(repo + '/docs/dispatch/wave8/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
for (const t of tasks) console.log(t.id, t.kind, t.gate, t.outputRoot, JSON.stringify(t.proofTargets), t.allowedModes.join(','), (t.allowedFfi ?? []).length);
