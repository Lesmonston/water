// Quarantine plan for the user's picks 1-4 of docs/maintenance/F-USAGE-20261109.md (user 11-09: "隔离1-4").
// Regenerated from `git worktree list` at execution time; every tree must still be clean (untracked files only
// under docs/acceptance, already present in main), its branch must have nothing that origin lacks, and it must not
// be one of the trees still in use. Writes plan.json for scripts/maintenance/quarantine-listed.ps1.
// Usage (repo root): node docs/acceptance/wave14/controller/cleanup-20261109/plan-worktrees.cjs
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = 'F:/new/smaltalk/water', OUT = path.join(__dirname, 'plan.json');
const KEEP = new Set(['w14-s1', 'w14-h1', 'accept-w14-s1', 'integ-w8a', 'integ-w8b']);
const git = (cwd, args) => execFileSync('git', ['-c', 'core.fsmonitor=false', ...args], {cwd, encoding: 'utf8'}).trim();
const item = name =>
  /^w(9|1[0-3])-/.test(name) ? 1 :
  /^accept-w(9|1[0-3])-/.test(name) ? 2 :
  ['w14-r1', 'w14-j1', 'w14-u1', 'w14-j2', 'accept-w14-j1', 'accept-w14-u1', 'accept-w14-j2'].includes(name) ? 3 :
  name === 'tmp-m2-old' ? 4 : 0;

const trees = git(ROOT, ['worktree', 'list', '--porcelain']).split(/\r?\n\r?\n/).map(block => {
  const t = {};
  for (const line of block.split(/\r?\n/)) {
    const [k, ...v] = line.split(' ');
    t[k] = v.join(' ') || true;
  }
  return t;
}).filter(t => t.worktree && t.worktree.replace(/\\/g, '/').startsWith(ROOT + '/.worktrees/'));

const items = {1: [], 2: [], 3: [], 4: []}, problems = [];
for (const t of trees) {
  const name = path.basename(t.worktree), n = item(name);
  if (!n || KEEP.has(name)) continue;
  const status = git(t.worktree, ['status', '--porcelain', '--untracked-files=normal']).split(/\r?\n/).filter(Boolean);
  for (const s of status) {
    const rel = s.slice(3).replace(/\/$/, '');
    if (!s.startsWith('?? ') || !rel.startsWith('docs/acceptance/')) { problems.push(`${name}: ${s}`); continue; }
    // Untracked controller evidence: every file must already exist in main with the same size.
    const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    const base = path.join(t.worktree, rel), files = fs.statSync(base).isDirectory() ? walk(base) : [base];
    for (const f of files) {
      const r = path.relative(t.worktree, f), m = path.join(ROOT, r);
      if (!fs.existsSync(m) || fs.statSync(m).size !== fs.statSync(f).size) problems.push(`${name}: evidence not in main: ${r}`);
    }
  }
  if (t.branch) {
    const br = t.branch.replace('refs/heads/', '');
    const ahead = git(ROOT, ['rev-list', '--count', `origin/${br}..${br}`]);
    if (ahead !== '0') problems.push(`${name}: ${ahead} commits not on origin/${br}`);
  } else if (name !== 'tmp-m2-old') problems.push(`${name}: detached`);
  items[n].push({path: t.worktree.replace(/\//g, '\\'), branch: t.branch ? t.branch.replace('refs/heads/', '') : null, head: t.HEAD});
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const labels = {1: 'Water waves 9-13 worker worktrees', 2: 'Water waves 9-13 acceptance worktrees', 3: 'Water wave 14 merged worker and acceptance worktrees', 4: 'tmp-m2-old detached checkout'};
const plan = {quarantine: 'F:\\_water-quarantine-20261109', choice: '用户 11-09：“隔离1-4”',
  items: Object.entries(items).map(([n, paths]) => ({n: +n, label: labels[n], paths}))};
fs.writeFileSync(OUT, JSON.stringify(plan, null, 2) + '\n');
console.log(plan.items.map(i => `${i.n} ${i.paths.length} trees`).join('\n'));
