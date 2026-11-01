// Summarise the newest Water clean record: node check-clean.cjs <Water data dir>
const fs = require('fs');
const path = require('path');
const dir = path.join(process.argv[2], 'cleans');
const f = fs.readdirSync(dir).filter(x => x.endsWith('.json')).map(x => ({ x, t: fs.statSync(path.join(dir, x)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
const rec = JSON.parse(fs.readFileSync(path.join(dir, f.x), 'utf8'));
const rep = rec.report, view = rec.view;
console.log('file', f.x, 'keys', Object.keys(rec).join(','));
console.log('report', JSON.stringify({ status: rep.status, freed_bytes: rep.freed_bytes, items: rep.items.length, started: rep.started_at, finished: rep.finished_at }));
console.log('view', JSON.stringify({ freed_bytes: view.freed_bytes, groups: view.groups && view.groups.length, drives: view.drives, finished_at: view.finished_at }).slice(0, 600));
const GB = n => (n / 1e9).toFixed(2);
const by = {};
for (const i of rep.items) {
  const g = (by[i.group_id || '?'] ||= { n: 0, before: 0, freed: 0, st: {} });
  g.n++; g.before += Number(i.bytes_before || 0); g.freed += Number(i.bytes_freed || 0);
  const k = i.status + (i.skip_reason ? ':' + i.skip_reason : i.reason ? ':' + i.reason : '');
  g.st[k] = (g.st[k] || 0) + 1;
}
let before = 0, freed = 0;
for (const [id, g] of Object.entries(by).sort((a, b) => b[1].before - a[1].before)) { before += g.before; freed += g.freed; console.log(GB(g.before), '->', GB(g.freed), id, JSON.stringify(g.st)); }
console.log('sum before', GB(before), 'freed', GB(freed));
console.log('item keys', Object.keys(rep.items[0]).join(','));
