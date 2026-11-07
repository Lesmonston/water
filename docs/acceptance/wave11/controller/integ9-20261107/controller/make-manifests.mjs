// Override manifests for the ninth main-line integration check (wave 11 merged: rename to Flick and the small fixes).
// Same two trees as the eighth check, moved to new branches at the tested commit: A (.worktrees/integ-w8a, branch
// controller/integ9-a) runs the changed packages and the UI; B (.worktrees/integ-w8b, branch controller/integ9-b) runs the host.
// Task configs come from the wave 11 tickets: executor N3, rules N4, scan N5, declarations N6, duplicates N7, UI N1,
// service N8, host N2. Process and installed apps are byte-identical since the eighth check's commit 63a500ae, so it
// stands for them. The base is the tested commit itself, so the gates see no change.
// The host's native steps are N2's (the M3.5 loop: check the fixture, clean with "quarantine first", purge the batch);
// the "cannot connect" text is now Flick's, and the quarantine root the gate checks is .flick-quarantine (N8 moves
// new batches there; the gate also checks that no .water-quarantine appears).
// Usage (repo root): node .local/w11-integ9/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w11 = JSON.parse(readFileSync('docs/dispatch/wave11/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave11/controller/integ9-20261107/';
const task = (from, part, tree, extra = {}) => {
  const t = w11.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, ...extra, id: 'WATER-W11-ACCEPT-INTEG9-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/integ9-' + tree, evidenceDir: ev,
    // All parts share tree A, so each part's archive must tolerate the evidence the others already archived there.
    allowedPrefixes: [...(t.allowedPrefixes ?? []), evRoot], status: 'CONTROLLER_INTEGRATION'};
};
const n2 = w11.tasks.find(x => x.id === 'WATER-W11-N2');
const steps = n2.nativeSteps.map(s => s.absent === '无法连接 Water 服务' ? {...s, absent: '无法连接 Flick 服务'} : s);
if (JSON.stringify(steps).includes('Water')) throw Error('native steps still name Water');
const out = (file, tasks) => writeFileSync('.local/w11-integ9/' + file, JSON.stringify({...w11, wave: 'water-wave11-main-integration-9', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task('WATER-W11-N3', 'exec', 'a'), task('WATER-W11-N4', 'rules', 'a'), task('WATER-W11-N5', 'scan', 'a'),
  task('WATER-W11-N6', 'decl', 'a'), task('WATER-W11-N7', 'dup', 'a'), task('WATER-W11-N1', 'ui', 'a')]);
out('desktop-manifest.json', [task('WATER-W11-N8', 'svc', 'a'),
  task('WATER-W11-N2', 'host', 'b', {nativeSteps: steps, nativeQuarantineName: '.flick-quarantine', nativeDataPrefix: '.local/w11-integ9-native/'})]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w11-integ9/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'modes', (t.allowedModes ?? []).join('/'), 'final', (t.expectedFinalModes ?? []).join('/'), 'steps', t.nativeSteps?.length ?? 0, t.nativeFixture ? 'fixture ' + (t.nativeFixture.flow ?? 'delete') + ' ' + (t.nativeQuarantineName ?? '.water-quarantine') : '', t.binName ?? '', t.windowTitle ?? '');
