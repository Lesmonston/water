// Override manifests for the third main-line integration check (wave 5 merged). Two trees at the tested commit,
// because the service and host offline caches are disjoint: A (.worktrees/integ-w5a) runs D, UI, rules and
// service; B (.worktrees/integ-w5b) runs the host, whose native check is the fixture clean loop (one window).
// Task configs come from the wave 5 manifest: D from H1, service from H2, host from H3, UI from H4, rules from H5.
// The base is the tested commit itself, so the gates see no change; frozen files stay those of wave 5.
// Usage (repo root): node .local/w5-integ3/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const m = JSON.parse(readFileSync('docs/dispatch/wave5/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave5/controller/integ3-20261028/';
const task = (from, part, tree) => {
  const t = m.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, id: 'WATER-W5-ACCEPT-INTEG3-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w5' + tree, branch: 'controller/integ-w5' + tree, evidenceDir: ev,
    allowedPrefixes: [...(t.allowedPrefixes ?? []), ev], status: 'CONTROLLER_INTEGRATION'};
};
const out = (file, tasks) => writeFileSync('.local/w5-integ3/' + file, JSON.stringify({...m, wave: 'water-wave5-main-integration-3', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task('WATER-W5-H1', 'd', 'a'), task('WATER-W5-H4', 'ui', 'a'), task('WATER-W5-H5', 'rules', 'a')]);
out('desktop-manifest.json', [task('WATER-W5-H2', 'svc', 'a'), task('WATER-W5-H3', 'host', 'b')]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w5-integ3/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'steps', t.nativeSteps?.length ?? 0, t.nativeFixture ? 'fixture' : '');
