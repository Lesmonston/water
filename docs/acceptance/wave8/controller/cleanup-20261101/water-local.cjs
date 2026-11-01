// Split each Water worktree's size into its .local children (build targets, cargo homes, browser labs, ...)
// and the rest (the checkout), from the F deep survey. usage: node water-local.cjs <deep-F.json>
const r = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const base = 'f:\\new\\smaltalk\\water\\.worktrees\\';
const trees = r.dirs.filter(d => d.path.toLowerCase().startsWith(base) && !d.path.slice(base.length).includes('\\'));
const GiB = n => (n / 1073741824).toFixed(2);
const kinds = {}; let localAll = 0, treeAll = 0;
for (const t of trees) {
  const pre = t.path.toLowerCase() + '\\.local\\';
  const kids = r.dirs.filter(d => d.path.toLowerCase().startsWith(pre) && !d.path.slice(pre.length).includes('\\'));
  const local = kids.reduce((s, d) => s + d.bytes, 0);
  for (const k of kids) { const name = k.path.split('\\').pop().replace(/^w\d+-/, 'wN-'); kinds[name] = (kinds[name] || 0) + k.bytes; }
  localAll += local; treeAll += t.bytes;
  console.log(GiB(t.bytes).padStart(6), 'local', GiB(local).padStart(6), t.path.split('\\').pop(), kids.map(k => k.path.split('\\').pop() + '=' + GiB(k.bytes)).join(' '));
}
console.log('all trees', GiB(treeAll), '.local', GiB(localAll), 'by kind', Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + GiB(v)).join(' '));
