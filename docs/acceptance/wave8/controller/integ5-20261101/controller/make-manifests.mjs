// Override manifests for the fifth main-line integration check (wave 8 merged, M3 close). Two trees at the tested
// commit, because the service and host offline caches are disjoint: A (.worktrees/integ-w8a) runs D, process, rules,
// scan, service and UI; B (.worktrees/integ-w8b) runs the host, whose native check is the fixture clean loop (one window).
// Task configs come from the latest ticket for each package: D from W5-H1; process K1, rules K2, scan K3, service K4,
// host K5, UI K6 from wave 8. The base is the tested commit itself, so the gates see no change.
// Usage (repo root): node .local/w8-integ5/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w5 = JSON.parse(readFileSync('docs/dispatch/wave5/manifest.json', 'utf8'));
const w8 = JSON.parse(readFileSync('docs/dispatch/wave8/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave8/controller/integ5-20261101/';
const task = (m, from, part, tree) => {
  const t = m.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, id: 'WATER-W8-ACCEPT-INTEG5-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/integ-w8' + tree, evidenceDir: ev,
    allowedPrefixes: [...(t.allowedPrefixes ?? []), ev], status: 'CONTROLLER_INTEGRATION'};
};
const out = (file, tasks) => writeFileSync('.local/w8-integ5/' + file, JSON.stringify({...w8, wave: 'water-wave8-main-integration-5', status: 'CONTROLLER_INTEGRATION', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task(w5, 'WATER-W5-H1', 'd', 'a'), task(w8, 'WATER-W8-K1', 'process', 'a'), task(w8, 'WATER-W8-K2', 'rules', 'a'), task(w8, 'WATER-W8-K3', 'scan', 'a'), task(w8, 'WATER-W8-K6', 'ui', 'a')]);
out('desktop-manifest.json', [task(w8, 'WATER-W8-K4', 'svc', 'a'), task(w8, 'WATER-W8-K5', 'host', 'b')]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w8-integ5/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'steps', t.nativeSteps?.length ?? 0, t.nativeFixture ? 'fixture' : '');
