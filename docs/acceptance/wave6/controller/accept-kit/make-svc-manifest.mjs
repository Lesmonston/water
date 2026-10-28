// Override manifest for the I1 service smoke: the wave 5 H2 service task config, pointed at a tree holding the I1
// submission (.worktrees/accept-w6-i1-svc). The base is the tested commit itself, so the gate sees no change.
// The desktop gate's "real" mode runs one read-only service scan of this machine with the new rules embedded.
// Usage (repo root): node .local/w6-accept/make-svc-manifest.mjs <tested commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full tested commit required');
const m = JSON.parse(readFileSync('docs/dispatch/wave5/manifest.json', 'utf8'));
const t = m.tasks.find(x => x.id === 'WATER-W5-H2'), ev = 'docs/acceptance/wave6/controller/accept-20261028/i1-svc/';
const task = {...t, id: 'WATER-W6-ACCEPT-I1-SVC', acceptsTask: 'WATER-W6-I1', acceptsHead: head, baseCommit: head,
  worktree: 'F:/new/smaltalk/water/.worktrees/accept-w6-i1-svc', branch: 'controller/accept-w6-i1-svc', evidenceDir: ev,
  allowedPrefixes: [...(t.allowedPrefixes ?? []), ev], status: 'CONTROLLER_ACCEPTANCE'};
writeFileSync('.local/w6-accept/svc-manifest.json', JSON.stringify({...m, wave: 'water-wave6-i1-service-smoke', status: 'CONTROLLER_ACCEPTANCE', tasks: [task]}, null, 2) + '\n');
console.log(task.id, task.kind, task.worktree, task.baseCommit.slice(0, 8), task.realMode, task.expectedFinalModes);
