// Override manifests for the tenth main-line integration check (wave 12 merged: skip units, about and diagnostics,
// executor journal reports, service wrap-up, rules from the C: survey). Same two trees as the ninth check, moved to new
// branches at the tested commit: A (.worktrees/integ-w8a, controller/integ10-a) runs the changed packages and the UI;
// B (.worktrees/integ-w8b, controller/integ10-b) runs the host.
// Task configs come from the wave 12 tickets: executor P1, service P2, host P3, UI P4, rules P5. Scan, declarations,
// duplicates, process and installed apps are byte-identical since the ninth check's commit 3d8bec11 (make sure with
// git diff before running), so it stands for them.
// The host's native steps are P3's (N2's loop with the Flick text and .flick-quarantine) with SKIP_STEPS put in after the
// first conclusion: one more fixture folder (an old app backup, a confirm card of its own, smaller than the installer so
// the installer stays the first card) is skipped from the card's menu, the card must go, the skip list must show it,
// removing it marks the conclusion stale, and a new checkup brings the card back. Then P3's clean loop runs unchanged
// (the backup is never chosen, so cleaned, quarantined and purged bytes stay P3's). Texts are the merged UI's (W12 P4):
// card menu button "<title>菜单" (aria-haspopup, so the observer expands it), item "以后都跳过", settings link "设置",
// tab "跳过名单", "移除", "跳过名单为空". The observer's "gone" step and menu expand were added for this check.
// Second checkup: scans 2; plans stay 1 (a plan is written at prepare).
// Usage (repo root): node .local/w12-integ10/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w12 = JSON.parse(readFileSync('docs/dispatch/wave12/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave12/controller/integ10-20261108/';
const BACKUP = '程序留下的旧备份', BACKUP_FILE = 'old/tool.bak-20250101/data.bin';
const SKIP_STEPS = [
  {wait: BACKUP + '菜单', seconds: 15},
  {invoke: BACKUP + '菜单'},
  {invoke: '以后都跳过'},
  {gone: BACKUP + '菜单', seconds: 20, shot: 'skipped'},
  {invoke: '设置'},
  {invoke: '跳过名单', type: 'Button'},
  {wait: BACKUP, match: 'contains', seconds: 15, shot: 'skip-list'},
  {invoke: '移除', type: 'Button'},
  {wait: '跳过名单为空', seconds: 15},
  {invoke: '体检'},
  {wait: '结果已过期 · 重新体检', seconds: 15},
  {invoke: '重新体检'},
  {wait: '这次检查哪里？', seconds: 15},
  {invoke: '开始体检', type: 'Button'},
  {wait: '可以放心清理', fail: '体检未能完成，请重新体检。', seconds: 120},
  {wait: BACKUP + '菜单', seconds: 15, shot: 'restored'},
];
const task = (from, part, tree, extra = {}) => {
  const t = w12.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, ...extra, id: 'WATER-W12-ACCEPT-INTEG10-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/integ10-' + tree, evidenceDir: ev,
    // All parts share tree A, so each part's archive must tolerate the evidence the others already archived there.
    allowedPrefixes: [...(t.allowedPrefixes ?? []), evRoot], status: 'CONTROLLER_INTEGRATION'};
};
const p3 = w12.tasks.find(x => x.id === 'WATER-W12-P3');
if (p3.nativeSteps[4].wait !== '可以放心清理' || p3.nativeSteps[5].invoke !== '清理') throw Error('P3 steps changed: place SKIP_STEPS again');
if (p3.nativeStore.counts.scans !== 1 || p3.nativeStore.counts.plans !== 1) throw Error('P3 store counts changed');
const out = (file, tasks) => writeFileSync('.local/w12-integ10/' + file, JSON.stringify({...w12, wave: 'water-wave12-main-integration-10', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task('WATER-W12-P1', 'exec', 'a'), task('WATER-W12-P5', 'rules', 'a'), task('WATER-W12-P4', 'ui', 'a')]);
out('desktop-manifest.json', [task('WATER-W12-P2', 'svc', 'a'),
  task('WATER-W12-P3', 'host', 'b', {nativeSteps: [...p3.nativeSteps.slice(0, 5), ...SKIP_STEPS, ...p3.nativeSteps.slice(5)],
    nativeFixture: {...p3.nativeFixture, files: [...p3.nativeFixture.files, {path: BACKUP_FILE, bytes: 524288}], kept: [...p3.nativeFixture.kept, BACKUP_FILE]},
    nativeStore: {...p3.nativeStore, counts: {...p3.nativeStore.counts, scans: 2}}, nativeMaximumSeconds: 480, nativeDataPrefix: '.local/w12-integ10-native/'})]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w12-integ10/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'final', (t.expectedFinalModes ?? []).join('/'), 'steps', t.nativeSteps?.length ?? 0, t.nativeQuarantineName ?? '');
