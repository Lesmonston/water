// Build the wave 4 manifest (G1 D hardening, G2 service hardening, G3 UI polish) from the verified wave 2 D/E
// and wave 3 F1 entries, and mirror it as WATER-W4-SELFTEST-G1..G3 in the controller self-test manifest.
// Usage (repo root): node scripts/dispatch/make-wave4.mjs <baseCommit>
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
const base = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(base ?? '')) throw new Error('base commit required');
// Frozen files are checked inside the worker trees, whose checkouts get CRLF (core.autocrlf), so hash them there.
const tree = '.worktrees/w4-g1/';
const hash = p => createHash('sha256').update(readFileSync(tree + p)).digest('hex');
const frozen = p => ({path: p, sha256: hash(p)});
const w2 = JSON.parse(readFileSync('docs/dispatch/wave2/manifest.json', 'utf8')), w3 = JSON.parse(readFileSync('docs/dispatch/wave3/manifest.json', 'utf8'));
const d = w2.tasks.find(t => t.id === 'WATER-W2-D'), e = w2.tasks.find(t => t.id === 'WATER-W2-E'), f1 = w3.tasks.find(t => t.id === 'WATER-W3-F1');
const pick = (t, keys) => Object.fromEntries(keys.filter(k => k in t).map(k => [k, structuredClone(t[k])]));
const common = {status: 'READY', baseCommit: base, snapshotRef: 'refs/tags/water-w4-hardening-base-20261026', readyOn: '2026-10-26', dispatchedAt: null, startedAt: null, model: null, modelAssignment: 'user-arranged; report actual engine/model', macOS: 'unverified', outputRootExists: true, nativeWindowBudget: 0, nativeDirectoryDialogBudget: 0};
const rules = 'docs/dispatch/W4-HARDENING-WORKER-RULES.md', plan = 'docs/dispatch/wave4/PLAN.md';

const g1 = {
  ...pick(d, ['kind', 'outputRoot', 'packageName', 'testTarget', 'testFiles', 'productionFiles', 'cargoCacheSource', 'nativeModule']), ...common,
  id: 'WATER-W4-G1', title: '清理执行器加固（重门）', slot: 'w4-g1', gate: 'heavy',
  worktree: 'F:/new/smaltalk/water/.worktrees/w4-g1', branch: 'worker/water-w4-g1',
  ticket: 'docs/dispatch/tickets/WATER-W4-G1-CLEAN-HARDENING-20261026.md', report: 'docs/dispatch/reports/WATER-W4-G1-REPORT.md',
  spec: 'contracts/hardening-v1/CLEAN-HARDENING.md',
  expectedTests: [...d.expectedTests, 'clean_handle_hardening'],
  proofTargets: {nc1: 'CLEAN_REPARSE_KIND', nc2: 'CLEAN_GUARD_ID', nc3: 'CLEAN_NO_FOLLOW'},
  allowedFiles: ['docs/dispatch/reports/WATER-W4-G1-REPORT.md'], allowedPrefixes: ['packages/junk-clean/', 'docs/acceptance/wave4/g1/'], evidenceDir: 'docs/acceptance/wave4/g1/',
  allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'red-nc1', 'red-nc2', 'red-nc3'], expectedFinalModes: ['check', 'test'],
  // Path-based file access must not exist anywhere in src; the native module may only declare the listed system functions.
  forbidPatterns: [
    ['\\bstd::fs\\b', 'Path-based file access (std::fs) is not allowed'],
    ['\\bfs::', 'Path-based file access (fs::) is not allowed'],
    ['\\bPath(?:Buf)?\\b', 'Path objects are not allowed; file access goes through handles'],
    ['\\b(?:remove_file|remove_dir|read_dir|symlink_metadata|set_permissions|OpenOptions)\\b', 'Path-based file operation is not allowed']
  ],
  allowedFfi: ['CreateFileW', 'GetFileInformationByHandleEx', 'SetFileInformationByHandle', 'GetVolumeInformationByHandleW', 'GetDiskFreeSpaceExW', 'CloseHandle', 'NtOpenFile', 'RtlNtStatusToDosError'],
  realMode: null, browserBudget: 0, realDataPermission: 'none; synthetic fixtures under own .local only',
  mustRead: [rules, plan, 'contracts/hardening-v1/CLEAN-HARDENING.md', 'contracts/checkup-v1/CLEAN.md', 'docs/dispatch/tickets/WATER-W2-D-ADDENDUM-01-20261026.md', 'contracts/checkup-v1/MODEL.md', 'packages/junk-clean/src/native_windows.rs', 'packages/junk-clean/tests/clean_v1.rs'],
  frozenFiles: [frozen('contracts/hardening-v1/CLEAN-HARDENING.md'), frozen('contracts/checkup-v1/CLEAN.md')]
};
const g2 = {
  ...pick(f1, ['kind', 'outputRoot', 'packageName', 'testTarget', 'testFiles', 'productionFiles', 'cargoCacheSource', 'realMode', 'nativeModule', 'allowedEnv', 'expectedDependencies']), ...common,
  id: 'WATER-W4-G2', title: '服务加固', slot: 'w4-g2', gate: 'light',
  worktree: 'F:/new/smaltalk/water/.worktrees/w4-g2', branch: 'worker/water-w4-g2',
  ticket: 'docs/dispatch/tickets/WATER-W4-G2-SERVICE-HARDENING-20261026.md', report: 'docs/dispatch/reports/WATER-W4-G2-REPORT.md',
  spec: 'contracts/hardening-v1/SERVICE-HARDENING.md',
  expectedTests: [...f1.expectedTests, 'service_hardening'],
  proofTargets: {nc1: 'SERVICE_PANIC_IDLE', nc2: 'SERVICE_TRUST_BOUNDARY', nc3: 'SERVICE_PARTIAL_SOURCE'},
  allowedFiles: ['docs/dispatch/reports/WATER-W4-G2-REPORT.md'], allowedPrefixes: ['packages/water-service/', 'docs/acceptance/wave4/g2/'], evidenceDir: 'docs/acceptance/wave4/g2/',
  allowedModes: ['baseline', 'lock', 'check', 'test', 'real', 'red-nc1', 'red-nc2', 'red-nc3', 'archive'], expectedFinalModes: ['check', 'test', 'real'],
  browserBudget: 0, realDataPermission: 'read-only metadata per ADR-018; clean disabled in the real smoke',
  mustRead: [rules, plan, 'contracts/hardening-v1/SERVICE-HARDENING.md', 'contracts/desktop-v1/SERVICE.md', 'docs/dispatch/tickets/WATER-W3-F1-ADDENDUM-01-20261026.md', 'contracts/checkup-v1/IPC.md', 'packages/water-service/src/service.rs', 'packages/water-service/tests/service_v1.rs'],
  frozenFiles: [frozen('contracts/hardening-v1/SERVICE-HARDENING.md'), frozen('contracts/desktop-v1/SERVICE.md')]
};
const g3 = {
  ...pick(e, ['kind', 'outputRoot', 'testFiles', 'unitTestFiles', 'browserTestFiles', 'expectedTests', 'tokensSource', 'fixtures', 'browserHelper', 'screenshotDirEnv']), ...common,
  id: 'WATER-W4-G3', title: '界面修补', slot: 'w4-g3', gate: 'light',
  worktree: 'F:/new/smaltalk/water/.worktrees/w4-g3', branch: 'worker/water-w4-g3',
  ticket: 'docs/dispatch/tickets/WATER-W4-G3-UI-POLISH-20261026.md', report: 'docs/dispatch/reports/WATER-W4-G3-REPORT.md',
  spec: 'contracts/hardening-v1/UI-POLISH.md',
  expectedBrowserTests: [...e.expectedBrowserTests, 'ui_m1_polish'],
  requiredScreenshots: [...e.requiredScreenshots, 'results-bottom-1240x820.png', 'results-bottom-1040x720.png', 'notice-results-1240x820.png', 'notice-trends-1240x820.png'],
  proofTargets: {nc1: 'UI_LEVEL_GUARD', nc2: 'UI_FOOTER_WRAP', nc3: 'UI_NOTICE_SCOPE'}, browserProofs: ['nc2', 'nc3'],
  allowedFiles: ['docs/dispatch/reports/WATER-W4-G3-REPORT.md'], allowedPrefixes: ['apps/water/ui/', 'docs/acceptance/wave4/g3/'], evidenceDir: 'docs/acceptance/wave4/g3/',
  allowedModes: ['baseline', 'check', 'test', 'browser', 'red-nc1', 'red-nc2', 'red-nc3', 'archive'], expectedFinalModes: ['check', 'test', 'browser'],
  realMode: null, browserBudget: 1, realDataPermission: 'none; IPC fixtures only',
  modelHint: 'UI ticket: pick a model with strong front-end layout ability; judged against real screenshots.',
  mustRead: [rules, plan, 'contracts/hardening-v1/UI-POLISH.md', 'contracts/checkup-v1/UI.md', 'docs/design/water-ui-v1/DESIGN.md', 'apps/water/ui/app.mjs', 'apps/water/ui/views/results.mjs', 'apps/water/ui/styles/app.css', 'apps/water/ui/tests/browser.test.mjs'],
  frozenFiles: [frozen('contracts/hardening-v1/UI-POLISH.md'), ...e.frozenFiles.map(f => frozen(f.path))]
};
const manifest = {
  schemaVersion: 1, wave: 'water-wave4-hardening', status: 'G1_G2_G3_READY', controller: 'Claude', controllerRoot: 'F:/new/smaltalk/water', controllerBranch: 'main',
  helpers: {G1: 'scripts/checkup-wave-check.mjs', G2: 'scripts/desktop-wave-check.mjs', G3: 'scripts/checkup-wave-check.mjs'},
  baseCommit: base, baseTag: 'water-w4-hardening-base-20261026', plan, workerRules: rules,
  parallelWith: 'WATER-W3-F3 (apps/water/host, dispatched to sol); no shared files',
  frozenFiles: ['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', rules].map(frozen),
  gateSelfTest: 'docs/acceptance/wave4/controller/selftest/', readyReport: 'docs/dispatch/wave4/READY-REPORT-20261026.md',
  tasks: [g1, g2, g3]
};
mkdirSync('docs/dispatch/wave4', {recursive: true});
writeFileSync('docs/dispatch/wave4/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
const sp = '.local/w4-selftest/manifest.json'; mkdirSync('.local/w4-selftest', {recursive: true});
const self = t => ({...t, id: t.id.replace('WATER-W4-', 'WATER-W4-SELFTEST-'), status: 'SELFTEST', worktree: t.worktree.replace('/w4-', '/w4-selftest-'), branch: t.branch.replace('worker/water-', 'selftest/water-'),
  evidenceDir: t.evidenceDir.replace(/(g\d)\/$/, 'selftest-$1/'), allowedPrefixes: [t.allowedPrefixes[0], t.evidenceDir.replace(/(g\d)\/$/, 'selftest-$1/')], allowedFiles: []});
// G1B shares the G1 self-test tree: the stub keeps the verified path-based deletion code, so it runs every
// mode except the "no path-based file access" rule, which G1 itself is expected to fail on that stub.
const g1b = {...self(g1), id: 'WATER-W4-SELFTEST-G1B', forbidPatterns: [], evidenceDir: 'docs/acceptance/wave4/selftest-g1b/', allowedPrefixes: ['packages/junk-clean/', 'docs/acceptance/wave4/selftest-g1b/']};
writeFileSync(sp, JSON.stringify({...manifest, status: 'SELFTEST', tasks: [...manifest.tasks.map(self), g1b]}, null, 2) + '\n');
console.log('wave 4 manifest written;', manifest.tasks.map(t => t.id + ':' + t.expectedTests.length + (t.expectedBrowserTests ? '+' + t.expectedBrowserTests.length : '')).join(' '), existsSync(sp));
