// Run the pre-dispatch baseline for every wave 10 first-batch task at once, each from its own worktree.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const repo = 'F:/new/smaltalk/water';
const m = JSON.parse(fs.readFileSync(repo + '/docs/dispatch/wave10/manifest.json', 'utf8'));
const runs = m.tasks.map(t => new Promise(done => {
  const gate = repo + '/' + m.helpers[t.id.split('-').pop()];
  const p = spawn(process.execPath, [gate, '--task', t.id, '--mode', 'baseline'], { cwd: t.worktree, windowsHide: true });
  let out = '';
  p.stdout.on('data', d => { out += d; });
  p.stderr.on('data', d => { out += d; });
  p.on('close', code => done({ id: t.id, code, last: out.trim().split('\n').pop() }));
}));
for (const r of await Promise.all(runs)) console.log(r.id, r.code, r.last);
