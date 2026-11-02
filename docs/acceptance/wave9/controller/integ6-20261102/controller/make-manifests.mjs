// Override manifests for the sixth main-line integration check (wave 9 merged, M3 close). Same two trees as the fifth
// check, moved to new branches at the tested commit: A (.worktrees/integ-w8a, branch controller/integ-w9a) runs D,
// process, rules, scan, service and UI; B (.worktrees/integ-w8b, branch controller/integ-w9b) runs the host.
// Task configs come from the latest ticket for each package: D from W5-H1; rules W9-L1, scan W9-L2, service W9-L3,
// process W9-L4; host K5 and UI K6 from wave 8. The base is the tested commit itself, so the gates see no change.
// Usage (repo root): node .local/w9-integ6/make-manifests.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const w5 = JSON.parse(readFileSync('docs/dispatch/wave5/manifest.json', 'utf8'));
const w8 = JSON.parse(readFileSync('docs/dispatch/wave8/manifest.json', 'utf8'));
const w9 = JSON.parse(readFileSync('docs/dispatch/wave9/manifest.json', 'utf8'));
const evRoot = 'docs/acceptance/wave9/controller/integ6-20261102/';
const task = (m, from, part, tree) => {
  const t = m.tasks.find(x => x.id === from), ev = evRoot + part + '/';
  return {...t, id: 'WATER-W9-ACCEPT-INTEG6-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/integ-w9' + tree, evidenceDir: ev,
    allowedPrefixes: [...(t.allowedPrefixes ?? []), ev], status: 'CONTROLLER_INTEGRATION'};
};
// Wave 9 had no host ticket, so its manifest does not freeze the mirror contract the host gate requires; take that
// entry from wave 8 (the gate still checks its hash).
const mirror = w8.frozenFiles.filter(f => f.path === 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json');
const out = (file, tasks, extra = []) => writeFileSync('.local/w9-integ6/' + file, JSON.stringify({...w9, wave: 'water-wave9-main-integration-6', status: 'CONTROLLER_INTEGRATION', frozenFiles: [...w9.frozenFiles, ...extra], tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task(w5, 'WATER-W5-H1', 'd', 'a'), task(w9, 'WATER-W9-L4', 'process', 'a'), task(w9, 'WATER-W9-L1', 'rules', 'a'), task(w9, 'WATER-W9-L2', 'scan', 'a'), task(w8, 'WATER-W8-K6', 'ui', 'a')]);
out('desktop-manifest.json', [task(w9, 'WATER-W9-L3', 'svc', 'a'), task(w8, 'WATER-W8-K5', 'host', 'b')], mirror);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w9-integ6/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.worktree.split('/').pop(), t.baseCommit.slice(0, 8), t.kind, 'modes', (t.allowedModes ?? []).join('/'), 'final', (t.expectedFinalModes ?? []).join('/'), 'steps', t.nativeSteps?.length ?? 0, t.nativeFixture ? 'fixture' : '');
