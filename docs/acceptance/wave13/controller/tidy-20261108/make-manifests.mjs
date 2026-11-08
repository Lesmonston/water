// Override manifests to check the post-wave-13 wording tidy on main (docs, test data, test comments, one product
// comment, one script assertion). Same two trees as integration 11, moved to new branches at the tidy commit:
// A (.worktrees/integ-w8a, controller/tidy-a) runs the packages and the UI; B (.worktrees/integ-w8b, controller/tidy-b)
// runs the host's tests, which include the three IPC contracts. No window and no real data.
// Parts: decl (cleanup-manifest test data, W11-N6), exec (junk-clean comment, W12-P1, check only), scan (helper rename,
// W13-J1), ui (fixtures, W13-U1), svc (test comments, W13-S1, check only), host (W12-P3, check and test).
// Usage (repo root): node .local/w13-tidy/make-manifests.mjs <tidy commit>
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full commit required');
const load = w => JSON.parse(readFileSync('docs/dispatch/' + w + '/manifest.json', 'utf8'));
const w11 = load('wave11'), w12 = load('wave12'), w13 = load('wave13');
// Manifest-level frozen files stay (the host gate needs the mirror contract among them), re-hashed at the tidy commit,
// which is the base here; the tidy itself changed some of them (the IPC contracts and UI fixtures).
const refrozen = (w13.frozenFiles ?? []).map(f => ({...f, sha256: createHash('sha256').update(readFileSync(f.path)).digest('hex')}));
const evRoot = 'docs/acceptance/wave13/controller/tidy-20261108/';
const task = (src, from, part, tree) => {
  const t = src.tasks.find(x => x.id === from);
  return {...t, frozenFiles: [], id: 'WATER-W13-ACCEPT-TIDY-' + part.toUpperCase(), acceptsTask: from, acceptsHead: head, baseCommit: head,
    worktree: 'F:/new/smaltalk/water/.worktrees/integ-w8' + tree, branch: 'controller/tidy-' + tree, evidenceDir: evRoot + part + '/',
    allowedPrefixes: [...(t.allowedPrefixes ?? []), evRoot], status: 'CONTROLLER_CHECK'};
};
const out = (file, tasks) => writeFileSync('.local/w13-tidy/' + file, JSON.stringify({...w13, frozenFiles: refrozen, wave: 'water-wave13-wording-tidy', status: 'CONTROLLER_CHECK', tasks}, null, 2) + '\n');
out('checkup-manifest.json', [task(w11, 'WATER-W11-N6', 'decl', 'a'), task(w12, 'WATER-W12-P1', 'exec', 'a'), task(w13, 'WATER-W13-J1', 'scan', 'a'), task(w13, 'WATER-W13-R1', 'rules', 'a'), task(w13, 'WATER-W13-U1', 'ui', 'a')]);
out('desktop-manifest.json', [task(w13, 'WATER-W13-S1', 'svc', 'a'), task(w12, 'WATER-W12-P3', 'host', 'b')]);
for (const f of ['checkup-manifest.json', 'desktop-manifest.json']) for (const t of JSON.parse(readFileSync('.local/w13-tidy/' + f, 'utf8')).tasks)
  console.log(f, t.id, t.acceptsTask, t.outputRoot, t.baseCommit.slice(0, 8));
