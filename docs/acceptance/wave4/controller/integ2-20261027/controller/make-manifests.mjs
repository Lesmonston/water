// Override manifests for the main-line integration check after G5-G7 (tree .worktrees/integ-w4b at the tested commit).
// Usage (repo root): node .local/w4-integ2/make-manifests.mjs <tested commit>
// Task configs come from the wave 4 manifest: D from G5, UI from G7, service from G2, host from G6 (with its 11 native steps).
// The base is the tested commit itself, so the gates see no change; frozen files stay those of wave 4.
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const m = JSON.parse(readFileSync('docs/dispatch/wave4/manifest.json', 'utf8'));
const tree = 'F:/new/smaltalk/water/.worktrees/integ-w4b', branch = 'controller/integ-w4b', evRoot = 'docs/acceptance/wave4/controller/integ2-20261027/';
const task = (from, part) => {
  const t = m.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, id: 'WATER-W4-ACCEPT-INTEG2-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: tree, branch, evidenceDir: ev, allowedPrefixes: [...(t.allowedPrefixes ?? []), ev], status: 'CONTROLLER_INTEGRATION'};
};
const out = (file, tasks) => writeFileSync('.local/w4-integ2/' + file, JSON.stringify({...m, wave: 'water-wave4-main-integration-2', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task('WATER-W4-G5', 'd'), task('WATER-W4-G7', 'ui')]);
out('desktop-manifest.json', [task('WATER-W4-G2', 'svc'), task('WATER-W4-G6', 'host')]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w4-integ2/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.baseCommit.slice(0, 8), t.kind, 'steps', t.nativeSteps?.length ?? 0, t.nativeDataPrefix ?? '');
