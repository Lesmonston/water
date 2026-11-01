// Check the newest Water clean plan for item F1 (11-02): every item must sit inside a Water worktree's .local
// folder under F:\new\smaltalk\water\.worktrees and belong to the custom root's cache-tagged or test-browser
// groups. Read-only. usage: node check-plan-f1.cjs <Water data dir>
const fs = require('fs');
const path = require('path');
const dir = path.join(process.argv[2], 'plans');
const f = fs.readdirSync(dir).filter(x => x.endsWith('.json')).map(x => ({ x, t: fs.statSync(path.join(dir, x)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
const stored = JSON.parse(fs.readFileSync(path.join(dir, f.x), 'utf8'));
const items = stored.plan.items;
const base = 'f:\\new\\smaltalk\\water\\.worktrees\\';
const okGroup = id => /^custom:[^:]+:(cachedir-tagged|test-browser-profiles|rust-build-dirs|python-tool-caches)$/.test(id);
const groups = {}, bad = [];
for (const i of items) {
  const g = (groups[i.group_id] ||= { n: 0, bytes: 0 }); g.n++; g.bytes += Number(i.total_bytes);
  const p = i.path.toLowerCase();
  const rest = p.startsWith(base) ? p.slice(base.length).split('\\') : null;
  if (!okGroup(i.group_id) || !rest || rest[1] !== '.local' || rest.length < 3) bad.push(i.group_id + ' ' + i.path);
}
console.log('plan', stored.plan.plan_id, 'created', stored.plan.created_at, 'items', items.length, 'used', stored.used);
for (const [id, g] of Object.entries(groups)) console.log('  ', id, g.n, 'items', (g.bytes / 1073741824).toFixed(2), 'GB');
const byTree = {};
for (const i of items) { const t = i.path.toLowerCase().startsWith(base) ? i.path.slice(base.length).split('\\')[0] : '(outside)'; byTree[t] = (byTree[t] || 0) + 1; }
console.log('by tree', JSON.stringify(byTree));
console.log(bad.length ? 'PROBLEMS:\n  ' + bad.slice(0, 20).join('\n  ') : 'all items are inside a worktree .local folder in an allowed group');
