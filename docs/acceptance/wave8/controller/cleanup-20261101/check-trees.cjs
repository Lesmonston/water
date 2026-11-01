// Pre-move check for F2/F3 (11-02): for each named Water worktree, report tracked changes, whether every
// untracked file also exists byte-identical in the main checkout, whether the branch equals its origin copy,
// and whether git has the worktree locked. Read-only (git status / rev-parse / worktree list only).
// usage: node check-trees.cjs <repo root> <tree name>...
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const [repo, ...names] = process.argv.slice(2);
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const listed = git(repo, 'worktree', 'list', '--porcelain').split(/\r?\n\r?\n/);
const files = d => {
  const out = [];
  const walk = p => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); e.isDirectory() ? walk(q) : out.push(q); } };
  fs.statSync(d).isDirectory() ? walk(d) : out.push(d);
  return out;
};
let allOk = true;
for (const n of names) {
  const tree = path.join(repo, '.worktrees', n);
  const block = listed.find(b => b.split(/\r?\n/)[0].replace(/\//g, '\\').toLowerCase() === ('worktree ' + tree).toLowerCase()) || '';
  const locked = /^locked/m.test(block);
  const branch = git(tree, 'rev-parse', '--abbrev-ref', 'HEAD').trim();
  const head = git(tree, 'rev-parse', 'HEAD').trim();
  let origin = null;
  try { origin = git(tree, 'rev-parse', 'refs/remotes/origin/' + branch).trim(); } catch { }
  const st = git(tree, 'status', '--porcelain', '--untracked-files=normal').split(/\r?\n/).filter(Boolean);
  const tracked = st.filter(l => !l.startsWith('??'));
  let untracked = 0, missing = [], differ = [];
  for (const l of st.filter(l => l.startsWith('??'))) {
    const rel = l.slice(3).replace(/^"|"$/g, '').replace(/\/$/, '');
    for (const f of files(path.join(tree, rel))) {
      untracked++;
      const r = path.relative(tree, f);
      const m = path.join(repo, r);
      if (!fs.existsSync(m)) missing.push(r); else if (hash(f) !== hash(m)) differ.push(r);
    }
  }
  const ok = !locked && tracked.length === 0 && origin === head && missing.length === 0 && differ.length === 0;
  allOk &&= ok;
  console.log(`${ok ? 'OK ' : 'NO '} ${n}: branch ${branch} ${head.slice(0, 8)} origin ${origin ? origin.slice(0, 8) : 'none'}${locked ? ' LOCKED' : ''}; tracked changes ${tracked.length}; untracked files ${untracked}, missing in main ${missing.length}, different ${differ.length}`);
  for (const x of [...tracked.slice(0, 5), ...missing.slice(0, 5).map(x => 'missing ' + x), ...differ.slice(0, 5).map(x => 'differs ' + x)]) console.log('     ' + x);
}
console.log(allOk ? 'all trees can move' : 'SOME TREES NEED A LOOK');
