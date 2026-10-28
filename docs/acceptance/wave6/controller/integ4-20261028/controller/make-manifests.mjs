// Override manifests for the fourth main-line integration check (wave 6 merged). Two trees at the tested commit,
// because the service and host offline caches are disjoint: A (.worktrees/integ-w6a) runs D, UI, rules and
// service; B (.worktrees/integ-w6b) runs the host, whose native check is the fixture clean loop (one window).
// Task configs come from the latest ticket for each package: rules from W6-I1, host from W6-I2, UI from W6-I3,
// D from W5-H1, service from W5-H2. The base is the tested commit itself, so the gates see no change.
// Usage (repo root): node .local/w6-integ4/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w5 = JSON.parse(readFileSync('docs/dispatch/wave5/manifest.json', 'utf8'));
const w6 = JSON.parse(readFileSync('docs/dispatch/wave6/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave6/controller/integ4-20261028/';
const task = (m, from, part, tree) => {
  const t = m.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, id: 'WATER-W6-ACCEPT-INTEG4-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w6' + tree, branch: 'controller/integ-w6' + tree, evidenceDir: ev,
    allowedPrefixes: [...(t.allowedPrefixes ?? []), ev], status: 'CONTROLLER_INTEGRATION'};
};
const out = (file, tasks) => writeFileSync('.local/w6-integ4/' + file, JSON.stringify({...w6, wave: 'water-wave6-main-integration-4', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task(w5, 'WATER-W5-H1', 'd', 'a'), task(w6, 'WATER-W6-I3', 'ui', 'a'), task(w6, 'WATER-W6-I1', 'rules', 'a')]);
out('desktop-manifest.json', [task(w5, 'WATER-W5-H2', 'svc', 'a'), task(w6, 'WATER-W6-I2', 'host', 'b')]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w6-integ4/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'steps', t.nativeSteps?.length ?? 0, t.nativeFixture ? 'fixture' : '');
