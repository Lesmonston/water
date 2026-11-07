// Override manifests for the tenth main-line integration check (wave 12 merged: skip units, about and diagnostics,
// executor journal reports, service wrap-up, rules from the C: survey). Same two trees as the ninth check, moved to new
// branches at the tested commit: A (.worktrees/integ-w8a, controller/integ10-a) runs the changed packages and the UI;
// B (.worktrees/integ-w8b, controller/integ10-b) runs the host.
// Task configs come from the wave 12 tickets: executor P1, service P2, host P3, UI P4, rules P5. Scan, declarations,
// duplicates, process and installed apps are byte-identical since the ninth check's commit 3d8bec11 (make sure with
// git diff before running), so it stands for them.
// The host's native steps are P3's (N2's loop with the Flick text and .flick-quarantine), plus EXTRA_STEPS below once
// the skip-from-the-card step is written against the merged UI.
// Usage (repo root): node .local/w12-integ10/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w12 = JSON.parse(readFileSync('docs/dispatch/wave12/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave12/controller/integ10-20261108/';
const EXTRA_STEPS = [];
const task = (from, part, tree, extra = {}) => {
  const t = w12.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, ...extra, id: 'WATER-W12-ACCEPT-INTEG10-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/integ10-' + tree, evidenceDir: ev,
    // All parts share tree A, so each part's archive must tolerate the evidence the others already archived there.
    allowedPrefixes: [...(t.allowedPrefixes ?? []), evRoot], status: 'CONTROLLER_INTEGRATION'};
};
const p3 = w12.tasks.find(x => x.id === 'WATER-W12-P3');
const out = (file, tasks) => writeFileSync('.local/w12-integ10/' + file, JSON.stringify({...w12, wave: 'water-wave12-main-integration-10', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task('WATER-W12-P1', 'exec', 'a'), task('WATER-W12-P5', 'rules', 'a'), task('WATER-W12-P4', 'ui', 'a')]);
out('desktop-manifest.json', [task('WATER-W12-P2', 'svc', 'a'),
  task('WATER-W12-P3', 'host', 'b', {nativeSteps: [...p3.nativeSteps, ...EXTRA_STEPS], nativeDataPrefix: '.local/w12-integ10-native/'})]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w12-integ10/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'final', (t.expectedFinalModes ?? []).join('/'), 'steps', t.nativeSteps?.length ?? 0, t.nativeQuarantineName ?? '');
