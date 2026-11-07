// Builds docs/dispatch/wave13/manifest.json (run from the repo root). Task configs come from the last ticket of each
// package: junk-scan W11-N5, service W12-P2, rules W12-P5, UI W12-P4.
// Usage: node .local/w13-prep/make-manifest.mjs <base commit>
// Frozen hashes come from a base worktree's checked-out bytes (line endings as the gates see them).
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const base = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(base)) throw Error('full base commit required');
const w11 = JSON.parse(readFileSync('docs/dispatch/wave11/manifest.json', 'utf8'));
const w12 = JSON.parse(readFileSync('docs/dispatch/wave12/manifest.json', 'utf8'));
const atBase = p => { assert.equal(execFileSync('git', ['-C', '.worktrees/w13-j1', 'rev-parse', 'HEAD']).toString().trim(), base); assert.equal(execFileSync('git', ['-C', '.worktrees/w13-j1', 'status', '--porcelain']).toString(), ''); return readFileSync('.worktrees/w13-j1/' + p); };
const frozen = paths => [...new Set(paths)].map(path => ({path, sha256: createHash('sha256').update(atBase(path)).digest('hex')}));
const issuedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const RULES = ['docs/dispatch/WORKER-RULES.md', 'docs/dispatch/W13-WORKER-RULES.md'];
const W13 = 'contracts/w13-v1/W13.md', W12 = 'contracts/w12-v1/W12.md', RENAME = 'contracts/w11-v1/RENAME-FLICK.md';
const FIXTURES = ['contracts/checkup-v1/ui-fixtures.json', 'contracts/m3c-v1/ui-fixtures-m3c.json', 'contracts/m35-v1/ui-fixtures-m35.json'];
const HISTORY = ['submittedHead', 'implementationCommit', 'mergeCommit', 'controllerReview', 'carryOverLater', 'workerSelfReport', 'dispatchEvidence', 'resume', 'addenda', 'bundle', 'holdReason', 'note', 'source', 'baselineEvidence', 'baselineStatus', 'issuedAt', 'dispatchedAt', 'startedAt', 'model', 'defaultExecutor', 'negativeControlPaths', 'preflight', 'readyOn', 'baselineStatusNote', 'mergeAfter', 'browserProofs', 'productionFiles'];
const modes = (t, ncs) => [...t.allowedModes.filter(m => !m.startsWith('red-nc')), ...Array.from({length: ncs}, (_, i) => 'red-nc' + (i + 1))];
function task(src, x, o) {
  const t = structuredClone(src);
  for (const k of HISTORY) delete t[k];
  const slot = 'w13-' + x, X = x.toUpperCase(), ev = 'docs/acceptance/wave13/' + x + '/', report = 'docs/dispatch/reports/WATER-W13-' + X + '-REPORT.md';
  const proof = Object.fromEntries(o.proof.map((m, i) => ['nc' + (i + 1), m]));
  return {
    ...t,
    id: 'WATER-W13-' + X, title: o.title, slot,
    worktree: 'F:/new/smaltalk/water/.worktrees/' + slot, branch: 'worker/water-' + slot,
    baseCommit: base, snapshotRef: 'refs/tags/water-' + slot + '-base-20261108',
    status: 'READY', readyOn: '2026-11-08', dispatchedAt: null, startedAt: null,
    model: null, modelAssignment: 'user-arranged; report actual engine/model', defaultExecutor: o.executor,
    purpose: o.purpose, report, evidenceDir: ev, allowedFiles: [report, ...(o.files ?? [])], allowedPrefixes: [t.outputRoot + '/', ev],
    gate: o.gate, ticket: o.ticket, spec: W13, proofTargets: proof,
    allowedModes: modes(t, o.proof.length), modelHint: o.hint,
    mustRead: [...RULES, W13, ...o.read],
    frozenFiles: frozen([W13, ...o.frozen]),
    outputRootExists: true,
    ...(o.extra ?? {}),
    issuedAt, baselineStatus: 'PENDING', source: 'docs/dispatch/wave13/PLAN.md',
  };
}
const T = 'docs/dispatch/tickets/';
const from11 = id => w11.tasks.find(x => x.id === id), from12 = id => w12.tasks.find(x => x.id === id);
const M35 = ['contracts/m35-v1/IPC-M35.md', 'contracts/m35-v1/SERVICE-M35.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/m3c-v1/SERVICE-M3C.md', 'contracts/m3c-v1/SERVICE-M3C-ADD-01.md'];
const tasks = [
  task(from11('WATER-W11-N5'), 'j1', {title: '扫描：联接引用修正', executor: 'sol', gate: 'medium', ticket: T + 'WATER-W13-J1-SCAN-20261108.md',
    purpose: 'junctions with both hidden and system attributes (Windows compatibility junctions) stay out of the reference index; only junctions whose final target equals an item or lies inside it count as references; real smoke reports indexed junctions with hidden and system attributes (must be 0); public wording in tests and README',
    hint: 'Scan: W13 sections 0 and 1; tests in m35_junctions_overview; pre-listed parent-target assertions; medium gate.',
    proof: ['SCAN_W13_JUNCTIONS', 'SCAN_W13_JUNCTIONS', 'SCAN_W13_JUNCTIONS'],
    read: ['contracts/m35-v1/SCAN-M35.md', 'packages/junk-scan/src/scan.rs', 'packages/junk-scan/src/extras.rs', 'packages/junk-scan/src/native_windows.rs', 'packages/junk-scan/examples/real_smoke.rs', 'packages/junk-scan/tests/scan_v1.rs', 'packages/junk-scan/README.md'],
    frozen: ['contracts/m35-v1/SCAN-M35.md', 'contracts/checkup-v1/SCAN.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/SCAN-M3C.md', 'contracts/m3d-v1/SCAN-M3D.md', 'contracts/m3d-v1/RULES-M3D.md', 'contracts/m35-v1/RULES-M35.md', RENAME]}),
  task(from12('WATER-W12-P2'), 's1', {title: '服务：跳过不过期、跳过的簇、日志收尾', executor: 'sol', gate: 'medium', ticket: T + 'WATER-W13-S1-SERVICE-20261108.md',
    purpose: 'skips no longer make the conclusion stale (plans invalidated, version bumped); a leak cluster whose every member matches a skip shows no card, clue or trends row; a later quarantine batch returning Err(Journal) after any action stops the rest; acted judged by item status; N = 0 wording; Chinese quarantine failure reasons; quarantined null when nothing moved; trends test independent of real elapsed time',
    hint: 'Service: W13 sections 0 and 2; executor on main is post W12-P1; pre-listed skip-stale and reason assertions; medium gate.',
    proof: ['SERVICE_W13_FRESH', 'SERVICE_W13_CLUE', 'SERVICE_W13_JOURNAL'],
    read: [W12, ...M35, 'docs/dispatch/tickets/WATER-W12-P2-ADDENDUM-01-20261107.md'],
    frozen: [W12, ...M35, ...FIXTURES, 'contracts/m35-v1/CLEAN-M35.md', 'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/MODEL.md', 'docs/decisions/ADR-019-project-declarations-and-quarantine.md', RENAME]}),
  task(from12('WATER-W12-P5'), 'r1', {title: '规则：依据的写法、条数与版本一处', executor: 'sol', gate: 'light', ticket: T + 'WATER-W13-R1-RULES-20261108.md',
    purpose: 'local_observation sources start with a date, name the maintainer check, carry no path separators or private references; data_version 2026-11-08.1; rule count and data version asserted through one constant each; public wording in README',
    hint: 'Rules data and tests only: W13 sections 0 and 3; two NCs edit rules/windows.json.',
    proof: ['RULES_W13_SOURCES', 'RULES_W13_SOURCES'],
    read: ['contracts/m35-v1/RULES-M35.md', 'packages/junk-rules/rules/windows.json', 'packages/junk-rules/tests/rules_v1.rs', 'packages/junk-rules/README.md'],
    frozen: ['contracts/m35-v1/RULES-M35.md', 'contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/RULES-M3C.md', 'contracts/m3d-v1/RULES-M3D.md', 'contracts/m35-v1/SCAN-M35.md'],
    // productionFiles as in W12-P5: HISTORY drops it, and without rules/windows.json in the production snapshot an NC on the
    // rules data leaves productionHash unchanged (R1 blocked on this, 11-08; addendum 01). J1 and S1 also lost their
    // README/Cargo entries; left as dispatched, since their NCs change src/ and restoring the list mid-ticket would void their greens.
    extra: {negativeControlPaths: ['packages/junk-rules/rules/windows.json'],
      productionFiles: ['packages/junk-rules/Cargo.toml', 'packages/junk-rules/Cargo.lock', 'packages/junk-rules/README.md', 'packages/junk-rules/rules/windows.json']}}),
  task(from12('WATER-W12-P4'), 'u1', {title: '界面：样例换成虚构路径、移除跳过后重读结论', executor: 'opus', gate: 'light', ticket: T + 'WATER-W13-U1-UI-20261108.md',
    purpose: 'the three UI fixtures use made-up paths with identical keys and types; removing a skip re-reads the conclusion instead of marking it stale; browser fake returns a fresh conclusion after skips; all screenshots retaken; public wording',
    hint: 'UI: W13 sections 0, 2.1 and 4; fixtures are editable for this ticket only; two browser NCs on removeSkip; light gate.',
    proof: ['UI_W13_FRESH', 'UI_W13_FRESH'], files: FIXTURES,
    read: [...FIXTURES, 'contracts/m35-v1/UI-M35.md', 'apps/water/ui/app.mjs', 'apps/water/ui/views/locations.mjs', 'apps/water/ui/tests/unit.test.mjs', 'apps/water/ui/tests/browser.test.mjs'],
    frozen: ['contracts/m35-v1/UI-M35.md', 'contracts/m35-v1/IPC-M35.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/UI.md', W12, 'docs/design/water-ui-v3/DESIGN.md', 'docs/design/water-ui-v3/tokens.css', 'docs/design/flick-brand/BRAND.md'],
    extra: {browserProofs: ['nc1', 'nc2'], productionFiles: FIXTURES}}),
];
for (const t of tasks) for (const f of FIXTURES) if (t.id !== 'WATER-W13-U1') assert(!t.allowedFiles.includes(f));
const manifest = {
  schemaVersion: 1, wave: 'water-wave13-junctions-public-prep', status: 'OPEN', controller: 'Claude', controllerRoot: 'F:/new/smaltalk/water', controllerBranch: 'main',
  helpers: Object.fromEntries(tasks.map(t => [t.id.slice(9), t.kind === 'host' || t.kind === 'service' ? 'scripts/desktop-wave-check.mjs' : 'scripts/checkup-wave-check.mjs'])),
  baseCommit: base, baseTag: 'water-w13-j1-base-20261108 (one tag per task, all on this commit)',
  plan: 'docs/dispatch/wave13/PLAN.md', overallPlan: 'docs/PLAN-OPEN-SOURCE-20261107.md', workerRules: 'docs/dispatch/W13-WORKER-RULES.md', commonRules: 'docs/dispatch/WORKER-RULES.md', contract: W13,
  userDecision: '2026-11-08: "两条一起改" (junction references: compatibility junctions out of the index, only targets equal to or inside an item count); "照推荐定稿" (skips no longer make the conclusion stale; controller edits process-scan test data and READMEs without tickets; the W12-P2 medium goes into S1)',
  offlineCache: w12.offlineCache,
  frozenFiles: frozen(['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', 'docs/decisions/ADR-019-project-declarations-and-quarantine.md', 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/m35-v1/IPC-M35.md', 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json', RENAME, W12, W13, ...RULES]),
  readyReport: 'docs/dispatch/wave13/PLAN.md',
  tasks,
  mergeOrder: ['WATER-W13-J1', 'WATER-W13-R1', 'WATER-W13-S1', 'WATER-W13-U1'],
};
mkdirSync('docs/dispatch/wave13', {recursive: true});
writeFileSync('docs/dispatch/wave13/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
for (const t of tasks) console.log(t.id, t.status, t.kind, t.outputRoot, t.gate, 'modes', t.allowedModes.join('/'), 'final', t.expectedFinalModes.join('/'), 'frozen', t.frozenFiles.length, 'tests', t.expectedTests.length, 'files', t.allowedFiles.length);
