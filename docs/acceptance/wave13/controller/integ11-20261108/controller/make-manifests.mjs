// Override manifests for the eleventh main-line integration check (wave 13 merged: compatibility junctions out of the
// scan's reference index, dated public rule sources, skips keep the conclusion fresh, made-up UI fixtures). Same two
// trees as the tenth check, moved to new branches at the tested commit: A (.worktrees/integ-w8a, controller/integ11-a)
// runs the changed packages and the UI; B (.worktrees/integ-w8b, controller/integ11-b) runs the host.
// Task configs: scan J1, rules R1, service S1, UI U1 from the wave 13 manifest; the host is W12-P3 again (the host did
// not change, but it builds every changed package in). Executor, picker and the other packages changed only in
// README.md (and process-scan's test data, tested 4/4 when it changed), so the tenth check stands for them; all.sh
// checks that with git diff before running.
// The host's native steps: the first-run page, P3's first checkup, then the skip round with the wave 13 behaviour:
// skipping the backup card from its menu removes the card and the conclusion stays fresh (no "结果已过期"); the skip
// list shows it; removing it and going back to 体检 shows the card again at once, still fresh, with no new checkup.
// Then P3's clean loop runs unchanged (the backup is never chosen), so the store counts are P3's: one scan, one plan.
// Frozen files are cleared: the tested commit is the base (scope is empty), and later tickets legitimately changed
// files that earlier tickets froze (U1 changed the UI fixtures S1 froze).
// Usage (repo root): node .local/w13-integ11/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w12 = JSON.parse(readFileSync('docs/dispatch/wave12/manifest.json', 'utf8'));
const w13 = JSON.parse(readFileSync('docs/dispatch/wave13/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave13/controller/integ11-20261108/';
const INTRO_STEPS = [
  {wait: 'Flick 怎么用', absent: '无法连接 Flick 服务', seconds: 45, shot: 'intro'},
  {invoke: '开始', type: 'Button'},
];
// Card titles are "<group title> · <amount>"; the 512 KiB backup reads "<1 MB". The skip list shows the group title.
const BACKUP = '程序留下的旧备份', BACKUP_MENU = BACKUP + ' · <1 MB菜单', BACKUP_FILE = 'old/tool.bak-20250101/data.bin';
const STALE = '结果已过期 · 重新体检';
const SKIP_STEPS = [
  {wait: BACKUP_MENU, seconds: 15},
  {invoke: BACKUP_MENU, then: '以后都跳过'},
  {gone: BACKUP_MENU, seconds: 20, shot: 'skipped'},
  // W13 2.1: the conclusion stays fresh after a skip.
  {wait: '可以放心清理', absent: STALE, seconds: 15, shot: 'fresh-after-skip'},
  {invoke: '设置', until: '跳过名单'},
  {invoke: '跳过名单', type: 'Button', until: '以后都跳过'},
  {wait: '以后都跳过', seconds: 15, shot: 'skip-page'},
  {wait: BACKUP, match: 'contains', seconds: 15, shot: 'skip-list'},
  {invoke: '移除', type: 'Button', until: '跳过名单为空'},
  {wait: '跳过名单为空', seconds: 15},
  // W13 2.1 and 4: removing re-reads the conclusion; the card is back without a new checkup and nothing is stale.
  {invoke: '体检', until: BACKUP_MENU},
  {wait: BACKUP_MENU, absent: STALE, seconds: 15, shot: 'restored'},
];
const clean = t => ({...t, frozenFiles: []});
const task = (src, from, part, tree, extra = {}) => {
  const t = src.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return clean({...t, ...extra, id: 'WATER-W13-ACCEPT-INTEG11-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/integ11-' + tree, evidenceDir: ev,
    // All parts share tree A, so each part's archive must tolerate the evidence the others already archived there.
    allowedPrefixes: [...(t.allowedPrefixes ?? []), evRoot], status: 'CONTROLLER_INTEGRATION'});
};
const p3 = w12.tasks.find(x => x.id === 'WATER-W12-P3');
if (p3.nativeSteps[4].wait !== '可以放心清理' || p3.nativeSteps[5].invoke !== '清理') throw Error('P3 steps changed: place SKIP_STEPS again');
if (p3.nativeStore.counts.scans !== 1 || p3.nativeStore.counts.plans !== 1) throw Error('P3 store counts changed');
const out = (file, tasks) => writeFileSync('.local/w13-integ11/' + file, JSON.stringify({...w13, wave: 'water-wave13-main-integration-11', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task(w13, 'WATER-W13-J1', 'scan', 'a'), task(w13, 'WATER-W13-R1', 'rules', 'a'), task(w13, 'WATER-W13-U1', 'ui', 'a')]);
// A native retry gets its own part (host2, ...): the gate allows one window per task id. INTEG11_HOST_PARTS lists every
// host part to keep in the manifest (default host).
const hostParts = (process.env.INTEG11_HOST_PARTS ?? 'host').split(',');
out('desktop-manifest.json', [task(w13, 'WATER-W13-S1', 'svc', 'a'), ...hostParts.map(part =>
  task(w12, 'WATER-W12-P3', part, 'b', {nativeSteps: [...INTRO_STEPS, ...p3.nativeSteps.slice(0, 5), ...SKIP_STEPS, ...p3.nativeSteps.slice(5)],
    nativeFixture: {...p3.nativeFixture, files: [...p3.nativeFixture.files, {path: BACKUP_FILE, bytes: 524288}], kept: [...p3.nativeFixture.kept, BACKUP_FILE]},
    nativeMaximumSeconds: 480, nativeDataPrefix: '.local/w13-integ11-native/'}))]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w13-integ11/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'final', (t.expectedFinalModes ?? []).join('/'), 'steps', t.nativeSteps?.length ?? 0, 'scans', t.nativeStore?.counts?.scans ?? '');
