// Builds docs/dispatch/wave14/manifest.json for R1, J1 and U1 from the wave 13 entries (same kinds, checkers and
// budgets). Frozen hashes are taken from the task's own worktree, the bytes the checker will read.
// S1 and H1 are added when their tickets are issued. Run from the repo root: node docs/dispatch/wave14/make-manifest.mjs
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const BASE = 'd692bd60cd8ab3fe4d0201afacd8a29fcfc8265a', DAY = '20261108', ROOT = 'F:/new/smaltalk/water';
const w13 = JSON.parse(readFileSync('docs/dispatch/wave13/manifest.json', 'utf8'));
const tree = slot => `${ROOT}/.worktrees/w14-${slot}`;
const frozen = (slot, paths) => paths.map(path => ({path, sha256: createHash('sha256').update(readFileSync(join(tree(slot), path))).digest('hex')}));
const KEEP_OUT = ['controllerReview', 'carryOverLater', 'workerSelfReport', 'dispatchEvidence', 'submittedHead', 'implementationCommit',
  'mergeCommit', 'addenda', 'blocked', 'baselineEvidence', 'dispatchReportedAt', 'startedAt', 'dispatchedAt', 'model'];
const from = id => { const t = {...w13.tasks.find(t => t.id === id)}; for (const k of KEEP_OUT) delete t[k]; return t; };
const common = slot => ({
  slot: `w14-${slot}`, worktree: tree(slot), branch: `worker/water-w14-${slot}`, baseCommit: BASE,
  snapshotRef: `refs/tags/water-w14-${slot}-base-${DAY}`, status: 'READY', spec: 'contracts/w14-v1/W14.md',
  report: `docs/dispatch/reports/WATER-W14-${slot.toUpperCase()}-REPORT.md`, evidenceDir: `docs/acceptance/wave14/${slot}/`,
  allowedFiles: [`docs/dispatch/reports/WATER-W14-${slot.toUpperCase()}-REPORT.md`], readyOn: '2026-11-08', issuedAt: new Date().toISOString(),
  dispatchedAt: null, startedAt: null, model: null, baselineStatus: null, source: 'docs/dispatch/wave14/PLAN.md',
  modelAssignment: 'user-arranged; report actual engine/model',
});
const RULES_DOCS = ['docs/dispatch/WORKER-RULES.md', 'docs/dispatch/W14-WORKER-RULES.md', 'contracts/w14-v1/W14.md'];

const r1 = {...from('WATER-W13-R1'), ...common('r1'),
  id: 'WATER-W14-R1', title: '规则：英文字段与接口', gate: 'light', defaultExecutor: 'sol',
  ticket: 'docs/dispatch/tickets/WATER-W14-R1-RULES-20261108.md',
  purpose: 'every rule gets English fields (title/owner/what/why/after required, in_use/fix_hint/advice/retention paired with the Chinese ones), length limits, no CJK in English fields; Rule and RuleText expose them for the service; data_version 2026-11-08.2',
  modelHint: 'Rules: W14 sections 0, 2 and 7; src/rules.rs parser and struct, rules/windows.json for all 118 rules; nc1 edits rules data, nc2 edits src/rules.rs.',
  proofTargets: {nc1: 'RULES_W14_EN', nc2: 'RULES_W14_EN'},
  negativeControlPaths: ['packages/junk-rules/rules/windows.json', 'packages/junk-rules/src/rules.rs'],
  allowedPrefixes: ['packages/junk-rules/', 'docs/acceptance/wave14/r1/'],
  mustRead: [...RULES_DOCS, 'contracts/m35-v1/RULES-M35.md', 'packages/junk-rules/src/rules.rs', 'packages/junk-rules/rules/windows.json', 'packages/junk-rules/tests/rules_v1.rs'],
  frozenFiles: frozen('r1', ['contracts/w14-v1/W14.md', 'contracts/m35-v1/RULES-M35.md', 'contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md',
    'contracts/m3c-v1/RULES-M3C.md', 'contracts/m3d-v1/RULES-M3D.md', 'contracts/m35-v1/SCAN-M35.md']),
};
const j1 = {...from('WATER-W13-J1'), ...common('j1'),
  id: 'WATER-W14-J1', title: '扫描：显卡缓存的 cache.db、真实冒烟、测试措辞', gate: 'medium', defaultExecutor: 'sol',
  ticket: 'docs/dispatch/tickets/WATER-W14-J1-SCAN-20261108.md',
  purpose: 'cache.db directly inside a known GPU cache folder is not a valuable file (other *.db and other folders unchanged); the real smoke skips junctions that vanish before the attribute re-read and reports a seen-and-skipped count; two W13 junction assertions say what they check',
  modelHint: 'Scan: W14 sections 0 and 5; valuable() in src/scan.rs, examples/real_smoke.rs, tests in m35_rules_names and the SCAN_W13_JUNCTIONS block; three NCs on the exception.',
  proofTargets: {nc1: 'SCAN_W14_GPU', nc2: 'SCAN_W14_GPU', nc3: 'SCAN_W14_GPU'},
  allowedPrefixes: ['packages/junk-scan/', 'docs/acceptance/wave14/j1/'],
  mustRead: [...RULES_DOCS, 'contracts/w13-v1/W13.md', 'packages/junk-scan/src/scan.rs', 'packages/junk-scan/examples/real_smoke.rs', 'packages/junk-scan/tests/scan_v1.rs'],
  frozenFiles: frozen('j1', ['contracts/w14-v1/W14.md', 'contracts/w13-v1/W13.md', 'contracts/m35-v1/SCAN-M35.md', 'contracts/checkup-v1/SCAN.md', 'contracts/checkup-v1/MODEL.md',
    'contracts/m3c-v1/SCAN-M3C.md', 'contracts/m3d-v1/SCAN-M3D.md', 'contracts/m3d-v1/RULES-M3D.md', 'contracts/m35-v1/RULES-M35.md', 'contracts/w11-v1/RENAME-FLICK.md']),
};
const screens = (lang, size, names) => names.map(n => `v4-${lang}-${n}-${size}.png`);
const u1 = {...from('WATER-W13-U1'), ...common('u1'),
  id: 'WATER-W14-U1', title: '界面：中英切换、主页面一屏放下、体检进度与方块图', gate: 'light', defaultExecutor: 'user-assigned UI executor',
  ticket: 'docs/dispatch/tickets/WATER-W14-U1-UI-20261108.md',
  purpose: 'string table with zh and en and a language setting that follows the system first; service *_en fields, message_en and copy_text_en used in English; main pages fit 1240x820 and 1040x720 without page scrolling in both languages; filler captions removed; scan page follows running/space/finishing with a next step and shows category blocks instead of stems; a stale plan after a skip is prepared again when the conclusion is still fresh',
  modelHint: 'UI: W14 sections 0, 1, 6 and 7; own English fake data under apps/water/ui/tests; shared fixtures and tokens.css stay byte-identical; two browser NCs.',
  proofTargets: {nc1: 'UI_W14_EN', nc2: 'UI_W14_PROGRESS'}, browserProofs: ['nc1', 'nc2'],
  allowedPrefixes: ['apps/water/ui/', 'docs/acceptance/wave14/u1/'],
  requiredScreenshots: [
    ...screens('zh', '1240x820', ['home', 'home-new', 'intro', 'scan', 'scan-space', 'scan-finishing', 'results', 'results-decided', 'results-folds',
      'results-stale', 'results-empty', 'results-replanned', 'menu', 'drawer', 'drawer-big', 'details', 'confirm', 'confirm-direct', 'cleaning', 'done',
      'quarantine', 'quarantine-leftover', 'dedupe-menu', 'dedupe-intro', 'dedupe', 'trends', 'history', 'settings', 'settings-decl', 'settings-language',
      'settings-about', 'settings-skip']),
    ...screens('en', '1240x820', ['home', 'intro', 'scan', 'scan-space', 'scan-finishing', 'results', 'drawer', 'details', 'confirm', 'cleaning', 'done',
      'quarantine', 'dedupe', 'trends', 'history', 'settings', 'settings-language', 'settings-about']),
    ...screens('zh', '1040x720', ['home', 'scan', 'results']), ...screens('en', '1040x720', ['home', 'scan', 'results']),
  ],
  mustRead: [...RULES_DOCS, 'contracts/m35-v1/UI-M35.md', 'apps/water/ui/app.mjs', 'apps/water/ui/format.mjs', 'apps/water/ui/views/scan.mjs',
    'apps/water/ui/views/charts.mjs', 'apps/water/ui/views/locations.mjs', 'apps/water/ui/tests/unit.test.mjs', 'apps/water/ui/tests/browser.test.mjs',
    'docs/design/water-ui-v3/mockup.html'],
  frozenFiles: frozen('u1', ['contracts/w14-v1/W14.md', 'contracts/m35-v1/UI-M35.md', 'contracts/m35-v1/IPC-M35.md', 'contracts/m3c-v1/IPC-M3C.md',
    'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/UI.md', 'contracts/w12-v1/W12.md', 'docs/design/water-ui-v3/DESIGN.md', 'docs/design/water-ui-v3/tokens.css',
    'docs/design/flick-brand/BRAND.md', 'contracts/checkup-v1/ui-fixtures.json', 'contracts/m3c-v1/ui-fixtures-m3c.json', 'contracts/m35-v1/ui-fixtures-m35.json']),
};
delete u1.productionFiles;

const topFrozen = w13.frozenFiles.map(f => f.path).map(p => p === 'docs/dispatch/W13-WORKER-RULES.md' ? 'docs/dispatch/W14-WORKER-RULES.md' : p);
topFrozen.push('contracts/w14-v1/W14.md');
const manifest = {
  schemaVersion: 1, wave: 'water-wave14-english-progress-onescreen', status: 'READY_R1_J1_U1', controller: 'Claude',
  controllerRoot: ROOT, controllerBranch: 'main',
  helpers: {'-R1': 'scripts/checkup-wave-check.mjs', '-J1': 'scripts/checkup-wave-check.mjs', '-U1': 'scripts/checkup-wave-check.mjs',
    '-S1': 'scripts/desktop-wave-check.mjs', '-H1': 'scripts/desktop-wave-check.mjs'},
  baseCommit: BASE, baseTag: `water-w14-r1-base-${DAY} (one tag per task, all on this commit)`,
  plan: 'docs/dispatch/wave14/PLAN.md', overallPlan: 'docs/PLAN-OPEN-SOURCE-20261107.md', workerRules: 'docs/dispatch/W14-WORKER-RULES.md',
  commonRules: 'docs/dispatch/WORKER-RULES.md', contract: 'contracts/w14-v1/W14.md',
  userDecision: '2026-11-08: leftovers "全部出第十四波工单"; "这一轮还需要做英文界面，做语言切换。做完了再提交"; language follows the system on first run, English covers everything, agent copy text follows the UI language, UI changes dispatched directly; after looking at the installed beta: main pages on one screen, real scan progress with a next step, no filler captions, coloured blocks instead of stems',
  offlineCache: w13.offlineCache,
  frozenFiles: frozen('r1', topFrozen),
  readyReport: 'docs/dispatch/wave14/PLAN.md',
  tasks: [r1, j1, u1],
  mergeOrder: ['WATER-W14-R1', 'WATER-W14-J1', 'WATER-W14-U1', 'WATER-W14-S1', 'WATER-W14-H1'],
};
writeFileSync('docs/dispatch/wave14/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote manifest:', manifest.tasks.map(t => `${t.id} ${t.gate} frozen ${t.frozenFiles.length}`).join('; '), '| top frozen', manifest.frozenFiles.length);
