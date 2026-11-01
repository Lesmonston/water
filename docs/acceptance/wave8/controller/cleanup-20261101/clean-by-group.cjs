// Join the newest Water clean report with its plan to get per-group results: node clean-by-group.cjs <data dir>
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const newest = d => fs.readdirSync(path.join(root, d)).filter(x => x.endsWith('.json')).map(x => ({ x, t: fs.statSync(path.join(root, d, x)).mtimeMs })).sort((a, b) => b.t - a.t)[0].x;
const rec = JSON.parse(fs.readFileSync(path.join(root, 'cleans', newest('cleans')), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(root, 'plans', rec.plan_id + '.json'), 'utf8')).plan;
const info = new Map(plan.items.map(i => [i.item_id, i]));
const GB = n => (n / 1e9).toFixed(2);
const by = {};
for (const r of rec.report.items) {
  const i = info.get(r.item_id) || {};
  const g = (by[i.group_id] ||= { planned: 0, freed: 0, deleted: 0, inuse: 0, changed: 0, failed: 0, other: 0 });
  g.planned += Number(i.total_bytes || 0); g.freed += Number(r.bytes_freed || 0);
  if (r.status === 'deleted') g.deleted++; else if (r.skip_reason === 'in_use') g.inuse++; else if (r.skip_reason === 'changed') g.changed++; else if (r.status === 'failed') g.failed++; else g.other++;
  if (r.status !== 'deleted' && r.skip_reason !== 'in_use') console.log('  NOTE', r.status, r.skip_reason || '', 'failed_entries', r.failed_entries, 'freed', r.bytes_freed, i.group_id, i.path);
}
let p = 0, f = 0;
for (const [id, g] of Object.entries(by).sort((a, b) => b[1].planned - a[1].planned)) { p += g.planned; f += g.freed; console.log(GB(g.planned).padStart(6), '->', GB(g.freed).padStart(6), id, `deleted ${g.deleted} in_use ${g.inuse} changed ${g.changed} failed ${g.failed}`); }
console.log('planned', GB(p), 'freed', GB(f), '(GiB', (f / 2 ** 30).toFixed(2) + ')');
