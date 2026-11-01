// Read-only facts about the denglou worktrees for the 11-02 note to the denglou controller: size (from the
// deep survey, hard links counted once), node_modules and other heavy folders, branch, uncommitted entries,
// last commit, and position against the main branch. Only git read commands are run.
// usage: node denglou-worktrees.cjs <deep-F.json> <out.json>
const fs = require('fs');
const { execFileSync } = require('child_process');
const [deepFile, out] = process.argv.slice(2);
const deep = JSON.parse(fs.readFileSync(deepFile, 'utf8'));
const git = (cwd, ...args) => { try { return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const repo = 'F:\\new\\denglou';
const main = ['main', 'master'].find(b => git(repo, 'rev-parse', '--verify', '--quiet', b)) || 'HEAD';
const list = git(repo, 'worktree', 'list', '--porcelain').split(/\r?\n\r?\n/).map(block => Object.fromEntries(block.split(/\r?\n/).map(l => { const i = l.indexOf(' '); return i < 0 ? [l, true] : [l.slice(0, i), l.slice(i + 1)]; })));
const size = p => { const d = deep.dirs.find(x => x.path.toLowerCase() === p.toLowerCase()); return d ? d.bytes : null; };
const under = (p, f) => deep.dirs.filter(d => d.path.toLowerCase().startsWith(p.toLowerCase() + '\\') && f(d));
const rows = list.filter(w => w.worktree).map(w => {
  const p = w.worktree.replace(/\//g, '\\');
  const nm = deep.junk.filter(j => j.kind === 'node_modules' && j.path.toLowerCase().startsWith(p.toLowerCase() + '\\')).reduce((s, j) => s + j.bytes, 0);
  const heavy = under(p, d => d.bytes >= 1e9 && d.depth <= 6).filter(d => !/node_modules/i.test(d.path)).sort((a, b) => b.bytes - a.bytes).slice(0, 4).map(d => ({ path: d.path.slice(p.length + 1), bytes: d.bytes }));
  const head = git(p, 'rev-parse', 'HEAD');
  const counts = head ? git(repo, 'rev-list', '--left-right', '--count', `${main}...${head}`) : null;
  return { path: p, branch: w.branch ? w.branch.replace('refs/heads/', '') : (w.detached ? '(detached)' : null), bytes: size(p), node_modules: nm, heavy,
    dirty: (git(p, 'status', '--porcelain') || '').split(/\r?\n/).filter(Boolean).length, lastCommit: git(p, 'log', '-1', '--format=%cI'),
    behindAhead: counts, mergedIntoMain: head ? git(repo, 'merge-base', '--is-ancestor', head, main) !== null : null };
});
fs.writeFileSync(out, JSON.stringify({ repo, main, rows }, null, 1));
const GiB = n => (n == null ? '?' : (n / 1073741824).toFixed(2));
for (const r of rows.sort((a, b) => (b.bytes || 0) - (a.bytes || 0))) console.log(GiB(r.bytes).padStart(6), 'nm', GiB(r.node_modules).padStart(5), r.path.replace(repo, '~'), r.branch, 'dirty', r.dirty, 'last', (r.lastCommit || '').slice(0, 10), 'main...head', r.behindAhead, 'merged', r.mergedIntoMain, r.heavy.map(h => h.path + '=' + GiB(h.bytes)).join(' '));
