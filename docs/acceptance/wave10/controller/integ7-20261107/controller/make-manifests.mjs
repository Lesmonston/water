// Override manifests for the seventh main-line integration check (wave 10 merged, M3.5 close). Same two trees as
// the sixth check, moved to new branches at the tested commit: A (.worktrees/integ-w8a, branch controller/integ-w10a)
// runs every package and the UI; B (.worktrees/integ-w8b, branch controller/integ-w10b) runs the host.
// Task configs come from the latest ticket for each package: executor W10-M10, process W9-L4, rules W10-M1,
// scan W10-M2, declarations W10-M3, duplicates W10-M8, installed apps W10-M9, service W10-M7, UI W10-M11 (same
// config as M6), host W10-M5. The base is the tested commit itself, so the gates see no change.
// The host's native steps are rewritten for the M3.5 UI (design v3): pick only the fixture folder, check it, add the
// one "confirm" card to the clean, clean with the default "quarantine first", open the quarantine page and
// permanently delete that batch. The fixture adds an installer file (installer-files, confirm, 168 h) next to the
// old cache folder (cachedir-tagged, recommended, deleted directly); checkQuarantineFlow in the gate checks both.
// Usage (repo root): node .local/w10-integ7/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w9 = JSON.parse(readFileSync('docs/dispatch/wave9/manifest.json', 'utf8'));
const w10 = JSON.parse(readFileSync('docs/dispatch/wave10/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave10/controller/integ7-20261107/';
const task = (m, from, part, tree, extra = {}) => {
  const t = m.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, ...extra, id: 'WATER-W10-ACCEPT-INTEG7-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/integ-w10' + tree, evidenceDir: ev,
    allowedPrefixes: [...(t.allowedPrefixes ?? []), ev], status: 'CONTROLLER_INTEGRATION'};
};
const fixture = {
  flow: 'quarantine-purge', ageHours: 240,
  categoriesOff: ['agent_tool', 'browser', 'system_temp', 'app_leftover', 'dev_cache', 'crash_log', 'gpu_system'],
  files: [
    {path: 'projA/build-cache/CACHEDIR.TAG', text: 'Signature: 8a477f597d28d172789f06886806bc55\n# Water M2 native fixture: safe to delete.\n'},
    {path: 'projA/build-cache/blob-1.bin', bytes: 2097152},
    {path: 'projA/build-cache/sub/blob-2.bin', bytes: 1048576},
    {path: 'projA/src/main.rs', text: 'fn main() {}\n'},
    {path: 'setups/tool-1.2.msi', bytes: 1048576},
    {path: 'lab/profile-a/Local State', text: '{}\n'},
    {path: 'lab/profile-a/Default/Preferences', text: '{}\n'},
  ],
  gone: ['projA/build-cache', 'setups/tool-1.2.msi'],
  kept: ['projA/src/main.rs', 'lab/profile-a/Local State', 'lab/profile-a/Default/Preferences'],
  directFreedBytes: 3145815, quarantinedBytes: 1048576, purgedBytes: 1048576,
};
const steps = [
  {wait: '这次检查哪里？', absent: '无法连接 Water 服务', seconds: 45, shot: 'home'},
  {invoke: '常用位置', type: 'Button', match: 'contains'},
  {invoke: '-fixture', type: 'Button', match: 'contains'},
  {invoke: '开始体检', type: 'Button'},
  {wait: '可以放心清理', fail: '体检未能完成，请重新体检。', seconds: 120, shot: 'results'},
  {invoke: '清理', type: 'Button'},
  {wait: '已加入清理', match: 'prefix', seconds: 20},
  {invoke: '清理 ', type: 'Button', match: 'prefix'},
  {wait: '先放进隔离区', seconds: 30, shot: 'confirm'},
  {invoke: '开始清理', type: 'Button'},
  {wait: '清理完成', seconds: 90, shot: 'done'},
  {invoke: '去隔离区', type: 'Button'},
  {wait: '隔离区里有 1 批', seconds: 30, shot: 'quarantine'},
  {invoke: '永久删除', type: 'Button'},
  {wait: '不进入回收站，无法恢复。', seconds: 15},
  {invoke: '永久删除', type: 'Button', pick: 'last'},
  {wait: '隔离区是空的', seconds: 90, shot: 'purged'},
];
const store = {allowedTop: ['cleans', 'dedupes', 'events', 'journal', 'plans', 'quarantine', 'scans', 'settings.json', 'snapshots', 'water.lock', 'webview'],
  counts: {scans: 1, plans: 1, cleans: 1, quarantine: 0, dedupes: 0}};
const out = (file, tasks) => writeFileSync('.local/w10-integ7/' + file, JSON.stringify({...w10, wave: 'water-wave10-main-integration-7', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task(w10, 'WATER-W10-M10', 'exec', 'a'), task(w9, 'WATER-W9-L4', 'process', 'a'), task(w10, 'WATER-W10-M1', 'rules', 'a'),
  task(w10, 'WATER-W10-M2', 'scan', 'a'), task(w10, 'WATER-W10-M3', 'decl', 'a'), task(w10, 'WATER-W10-M8', 'dup', 'a'), task(w10, 'WATER-W10-M9', 'apps', 'a'),
  task(w10, 'WATER-W10-M11', 'ui', 'a')]);
out('desktop-manifest.json', [task(w10, 'WATER-W10-M7', 'svc', 'a'), task(w10, 'WATER-W10-M5', 'host', 'b', {nativeSteps: steps, nativeFixture: fixture, nativeStore: store, nativeMaximumSeconds: 300})]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w10-integ7/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'modes', (t.allowedModes ?? []).join('/'), 'final', (t.expectedFinalModes ?? []).join('/'), 'steps', t.nativeSteps?.length ?? 0, t.nativeFixture ? 'fixture ' + (t.nativeFixture.flow ?? 'delete') : '');
