// Add WATER-W3-F3 (wiring and whole-machine checkup) to the wave 3 manifest, built from the verified
// F2 host entry, and mirror it as WATER-W3-SELFTEST-F3 in the controller self-test manifest.
// Usage (repo root): node scripts/dispatch/make-wave3-f3.mjs <baseCommit>
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
const base = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(base ?? '')) throw new Error('base commit required');
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const p = 'docs/dispatch/wave3/manifest.json', m = JSON.parse(readFileSync(p, 'utf8'));
if (m.tasks.some(t => t.id === 'WATER-W3-F3')) throw new Error('F3 already present');
for (const f of m.frozenFiles) f.sha256 = hash(f.path);   // the worker rules gained an F3 section
const f2 = m.tasks.find(t => t.id === 'WATER-W3-F2');
const dep = (name, path) => ({name, req: '*', kind: null, optional: false, path, defaults: true, features: []});
const steps = [
  {wait: '开始一次体检', absent: '无法连接 Water 服务', seconds: 45, shot: 'home'},
  {invoke: '开始体检', type: 'Button'},
  {wait: '本次体检共识别', fail: '体检未能完成，请重新体检。', seconds: 300, shot: 'results'},
  {invoke: '清理所选', type: 'Button'},
  {wait: '这一版只做体检，清理功能会在下一版开放。', seconds: 20, shot: 'clean-disabled'},
  {invoke: '增长趋势', type: 'Hyperlink'},
  {wait: '比较每次体检，找出一直在变大的东西。', seconds: 20, shot: 'trends'},
  {invoke: '清理记录', type: 'Hyperlink'},
  {wait: '每一次体检与清理，都有迹可循。', seconds: 20, shot: 'history'},
  {invoke: '扫描位置', type: 'Hyperlink'},
  {wait: '选择体检要看的地方。受保护的数据只统计占用，永远不会被清理。', seconds: 20, shot: 'locations'}
];
const keep = ['kind', 'outputRoot', 'packageName', 'binName', 'windowTitle', 'testTarget', 'testFiles', 'productionFiles', 'allowedEnv', 'expectedConfig', 'expectedCapability', 'cargoCacheSource', 'referenceLock', 'macOS'];
const f3 = Object.fromEntries(keep.filter(k => k in f2).map(k => [k, f2[k]]));
Object.assign(f3, {
  id: 'WATER-W3-F3', title: '接线与整机体检', slot: 'w3-f3', gate: 'light', status: 'READY',
  baseCommit: base, snapshotRef: 'refs/tags/water-w3-f3-base-20261026', readyOn: '2026-10-26',
  dispatchedAt: null, startedAt: null, model: null, modelAssignment: 'user-arranged; report actual engine/model',
  worktree: 'F:/new/smaltalk/water/.worktrees/w3-f3', branch: 'worker/water-w3-f3',
  ticket: 'docs/dispatch/tickets/WATER-W3-F3-WIRING-20261026.md', report: 'docs/dispatch/reports/WATER-W3-F3-REPORT.md',
  spec: 'contracts/desktop-v1/WIRING.md', outputRootExists: true, forbidSetup: true,
  expectedTests: ['host_config_boundary', 'host_navigation_boundary', 'host_command_registry', 'host_data_directory', 'host_service_wiring'],
  proofTargets: {nc1: 'HOST_CLEAN_DISABLED', nc2: 'HOST_SINGLE_INSTANCE', nc3: 'HOST_COMMANDS'},
  expectedDependencies: [...f2.expectedDependencies, dep('water-service', 'packages/water-service'), dep('water-junk-rules', 'packages/junk-rules'), dep('water-process-scan', 'packages/process-scan')],
  allowedFiles: ['docs/dispatch/reports/WATER-W3-F3-REPORT.md'],
  allowedPrefixes: ['apps/water/host/', 'docs/acceptance/wave3/f3/'],
  evidenceDir: 'docs/acceptance/wave3/f3/',
  allowedModes: ['baseline', 'lock', 'check', 'test', 'native', 'red-nc1', 'red-nc2', 'red-nc3', 'archive'],
  expectedFinalModes: ['check', 'test', 'native'],
  mustRead: ['docs/dispatch/W3-DESKTOP-WORKER-RULES.md', 'contracts/desktop-v1/WIRING.md', 'contracts/desktop-v1/HOST.md', 'docs/dispatch/tickets/WATER-W3-F2-ADDENDUM-01-20261026.md', 'contracts/desktop-v1/SERVICE.md', 'contracts/checkup-v1/IPC.md', 'apps/water/host/src/lib.rs', 'apps/water/host/tests/host_v1.rs', 'packages/water-service/src/lib.rs', 'packages/water-service/tests/service_v1.rs'],
  frozenFiles: [{path: 'contracts/desktop-v1/WIRING.md', sha256: hash('contracts/desktop-v1/WIRING.md')}],
  realMode: null, nativeModule: null,
  nativeWindowBudget: 1, nativeDirectoryDialogBudget: 0, browserBudget: 0,
  realDataPermission: 'read-only: one whole-machine scan through the app inside native --final; clean stays disabled',
  nativeObserver: 'scripts/acceptance/w3-wired-native-observe.ps1', nativeDataPrefix: '.local/w3-f3-native/', nativeMaximumSeconds: 480, nativeRealData: true,
  nativeSteps: steps,
  nativeStore: {allowedTop: ['cleans', 'journal', 'plans', 'scans', 'settings.json', 'snapshots', 'water.lock', 'webview'], counts: {scans: 1, snapshots: 1, plans: 0, cleans: 0, journal: 0}}
});
m.tasks.push(f3); m.status = 'F1_F2_VERIFIED_F3_READY';
writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
const sp = '.local/w3-selftest/manifest.json', s = JSON.parse(readFileSync(sp, 'utf8'));
s.frozenFiles = m.frozenFiles;
s.tasks = s.tasks.filter(t => t.id !== 'WATER-W3-SELFTEST-F3');
s.tasks.push({...f3, id: 'WATER-W3-SELFTEST-F3', status: 'SELFTEST', worktree: 'F:/new/smaltalk/water/.worktrees/w3-selftest-f3', branch: 'selftest/water-w3-f3', evidenceDir: 'docs/acceptance/wave3/selftest-f3/', allowedPrefixes: ['apps/water/host/', 'docs/acceptance/wave3/selftest-f3/'], allowedFiles: []});
writeFileSync(sp, JSON.stringify(s, null, 2) + '\n');
console.log('F3 added; deps', f3.expectedDependencies.map(d => d.name).join(','));
