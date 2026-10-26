// Controller tool: writes docs/dispatch/wave3/manifest.json for wave 3 (desktop wiring).
// Run from the controller checkout root: node scripts/dispatch/make-wave3-manifest.mjs
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';

const base = execFileSync('git', ['rev-parse', 'water-w3-desktop-base-20261026']).toString().trim();
const blob = path => execFileSync('git', ['show', base + ':' + path], {maxBuffer: 64 * 1024 * 1024});
const frozen = paths => paths.map(path => ({path, sha256: createHash('sha256').update(blob(path)).digest('hex')}));
const R = 'F:/new/smaltalk/water/';
const dep = (name, req, extra = {}) => ({name, req, kind: null, optional: false, path: null, defaults: true, features: [], ...extra});
const common = {
  status: 'READY', baseCommit: base, snapshotRef: 'refs/tags/water-w3-desktop-base-20261026',
  dispatchedAt: null, startedAt: null, model: null, modelAssignment: 'user-arranged; report actual engine/model', macOS: 'unverified', readyOn: '2026-10-26',
};
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const tasks = [
  {
    id: 'WATER-W3-F1', title: '服务核心', slot: 'w3-f1', kind: 'service', gate: 'heavy', ...common,
    worktree: R + '.worktrees/w3-f1', branch: 'worker/water-w3-f1',
    ticket: 'docs/dispatch/tickets/WATER-W3-F1-WATER-SERVICE-20261026.md', report: 'docs/dispatch/reports/WATER-W3-F1-REPORT.md',
    spec: 'contracts/desktop-v1/SERVICE.md', outputRoot: 'packages/water-service', packageName: 'water-service',
    testTarget: 'service_v1', testFiles: ['packages/water-service/tests/service_v1.rs'],
    expectedTests: ['service_ipc_contract', 'service_scan_views', 'service_clean_flow', 'service_trends_locations', 'service_storage_safety'],
    proofTargets: {nc1: 'SERVICE_TOKEN_ONCE', nc2: 'SERVICE_CLEAN_DISABLED', nc3: 'SERVICE_PROTECTED_PLAN'},
    productionFiles: ['packages/water-service/Cargo.toml', 'packages/water-service/Cargo.lock', 'packages/water-service/README.md', 'packages/water-service/examples/service_smoke.rs'],
    allowedFiles: ['docs/dispatch/reports/WATER-W3-F1-REPORT.md'], allowedPrefixes: ['packages/water-service/', 'docs/acceptance/wave3/f1/'], evidenceDir: 'docs/acceptance/wave3/f1/',
    allowedModes: ['baseline', 'lock', 'check', 'test', 'real', 'red-nc1', 'red-nc2', 'red-nc3', 'archive'], expectedFinalModes: ['check', 'test', 'real'],
    mustRead: ['docs/dispatch/W3-DESKTOP-WORKER-RULES.md', 'docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'contracts/desktop-v1/SERVICE.md', 'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/ui-fixtures.json', 'packages/junk-rules/Cargo.toml', 'packages/junk-scan/Cargo.toml', 'packages/process-scan/Cargo.toml', 'packages/junk-clean/Cargo.toml'],
    cargoCacheSource: R + '.worktrees/a/.local/cargo-home/registry', realMode: 'service-smoke', nativeModule: 'native_windows.rs', allowedEnv: [],
    expectedDependencies: [
      dep('serde', '=1.0.229', {features: ['derive']}), dep('serde_json', '=1.0.151'),
      dep('water-junk-clean', '*', {path: 'packages/junk-clean'}), dep('water-junk-rules', '*', {path: 'packages/junk-rules'}),
      dep('water-junk-scan', '*', {path: 'packages/junk-scan'}), dep('water-process-scan', '*', {path: 'packages/process-scan'}),
    ],
    nativeWindowBudget: 0, nativeDirectoryDialogBudget: 0, browserBudget: 0,
    realDataPermission: 'read-only metadata per ADR-018; clean disabled in the real smoke',
  },
  {
    id: 'WATER-W3-F2', title: '桌面宿主', slot: 'w3-f2', kind: 'host', gate: 'light', ...common,
    worktree: R + '.worktrees/w3-f2', branch: 'worker/water-w3-f2',
    ticket: 'docs/dispatch/tickets/WATER-W3-F2-DESKTOP-HOST-20261026.md', report: 'docs/dispatch/reports/WATER-W3-F2-REPORT.md',
    spec: 'contracts/desktop-v1/HOST.md', outputRoot: 'apps/water/host', packageName: 'water-desktop',
    testTarget: 'host_v1', testFiles: ['apps/water/host/tests/host_v1.rs'],
    expectedTests: ['host_config_boundary', 'host_navigation_boundary', 'host_command_registry', 'host_data_directory'],
    proofTargets: {nc1: 'HOST_CONFIG', nc2: 'HOST_NAVIGATION'},
    productionFiles: ['apps/water/host/Cargo.toml', 'apps/water/host/Cargo.lock', 'apps/water/host/build.rs', 'apps/water/host/tauri.conf.json', 'apps/water/host/capabilities/main.json', 'apps/water/host/README.md'],
    allowedFiles: ['docs/dispatch/reports/WATER-W3-F2-REPORT.md'], allowedPrefixes: ['apps/water/host/', 'docs/acceptance/wave3/f2/'], evidenceDir: 'docs/acceptance/wave3/f2/',
    allowedModes: ['baseline', 'lock', 'check', 'test', 'native', 'red-nc1', 'red-nc2', 'archive'], expectedFinalModes: ['check', 'test', 'native'],
    mustRead: ['docs/dispatch/W3-DESKTOP-WORKER-RULES.md', 'docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'contracts/desktop-v1/HOST.md', 'contracts/checkup-v1/IPC.md', 'apps/desktop-preview/src/main.rs', 'apps/desktop-preview/src/v1.rs', 'apps/water/ui/index.html', 'packages/native-picker/src/v1.rs'],
    cargoCacheSource: R + '.worktrees/ac/.local/desktop-cargo-home/registry', realMode: null, nativeModule: null, allowedEnv: ['"WATER_DATA_DIR"'],
    referenceLock: 'apps/desktop-preview/Cargo.lock', binName: 'water', windowTitle: 'Water',
    expectedDependencies: [
      dep('serde', '=1.0.229', {features: ['derive']}), dep('serde_json', '=1.0.151'),
      dep('tauri', '=2.12.5', {defaults: false, features: ['common-controls-v6', 'wry']}),
      dep('tauri-build', '=2.7.4', {kind: 'build'}),
      dep('water-native-picker', '*', {path: 'packages/native-picker'}),
    ],
    expectedConfig: {
      productName: 'Water', version: '0.1.0', identifier: 'app.water.desktop', build: {frontendDist: '../ui'},
      app: {windows: [], withGlobalTauri: true, security: {csp, assetProtocol: {enable: false}, capabilities: ['main']}},
      bundle: {active: false}, plugins: {},
    },
    expectedCapability: {identifier: 'main', windows: ['main'], permissions: ['core:window:allow-start-dragging']},
    nativeWindowBudget: 1, nativeDirectoryDialogBudget: 0, browserBudget: 0, realDataPermission: 'none',
  },
];
const manifest = {
  schemaVersion: 1, wave: 'water-wave3-desktop', status: 'F1_F2_READY', controller: 'Claude', controllerRoot: 'F:/new/smaltalk/water', controllerBranch: 'main',
  helper: 'scripts/desktop-wave-check.mjs', nativeObserver: 'scripts/acceptance/w3-host-native-observe.ps1', baseCommit: base, plan: 'docs/dispatch/wave3/PLAN.md',
  frozenFiles: frozen([
    'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/ui-fixtures.json',
    'contracts/desktop-v1/SERVICE.md', 'contracts/desktop-v1/HOST.md', 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json',
    'apps/desktop-preview/Cargo.lock', 'docs/dispatch/W3-DESKTOP-WORKER-RULES.md', 'docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md',
  ]),
  tasks,
};
writeFileSync(process.argv[2] ?? 'docs/dispatch/wave3/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('base', base, 'frozen', manifest.frozenFiles.length, 'tasks', tasks.map(t => t.id).join(','));
