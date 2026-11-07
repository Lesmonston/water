// Override manifests for the eighth main-line integration check (M12-M14 merged, before the M3.5 close). Same two trees
// as the seventh check, moved to new branches at the tested commit: A (.worktrees/integ-w8a, branch controller/integ8-a)
// runs the changed packages; B (.worktrees/integ-w8b, branch controller/integ8-b) runs the host.
// Only rules (W10-M12), scan (W10-M13), service (W10-M14) and the host (W10-M5, it builds the service) changed since the
// seventh check's commit c1dd420c; executor, process, declarations, duplicates, installed apps and UI are byte-identical
// there, so the seventh check stands for them. Native steps and fixture are the seventh check's.
// Usage (repo root): node .local/w10-integ8/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w9 = JSON.parse(readFileSync('docs/dispatch/wave9/manifest.json', 'utf8'));
const w10 = JSON.parse(readFileSync('docs/dispatch/wave10/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave10/controller/integ8-20261107/';
const task = (m, from, part, tree, extra = {}) => {
  const t = m.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, ...extra, id: 'WATER-W10-ACCEPT-INTEG8-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/integ8-' + tree, evidenceDir: ev,
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
const out = (file, tasks) => writeFileSync('.local/w10-integ8/' + file, JSON.stringify({...w10, wave: 'water-wave10-main-integration-8', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task(w10, 'WATER-W10-M12', 'rules', 'a'), task(w10, 'WATER-W10-M13', 'scan', 'a')]);
out('desktop-manifest.json', [task(w10, 'WATER-W10-M14', 'svc', 'a'), task(w10, 'WATER-W10-M5', 'host', 'b', {nativeSteps: steps, nativeFixture: fixture, nativeStore: store, nativeMaximumSeconds: 300})]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w10-integ8/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'modes', (t.allowedModes ?? []).join('/'), 'final', (t.expectedFinalModes ?? []).join('/'), 'steps', t.nativeSteps?.length ?? 0, t.nativeFixture ? 'fixture ' + (t.nativeFixture.flow ?? 'delete') : '');
