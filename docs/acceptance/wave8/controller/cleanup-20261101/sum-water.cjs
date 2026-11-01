// Summarise the Water survey per drive: node sum-water.cjs <water-survey.json> <drive letter>
const fs = require('fs');
const [file, letter] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const GB = n => (Number(n) / 1e9).toFixed(2);
console.log('scan', JSON.stringify(r.scan), 'added', JSON.stringify(r.added.map(a => a.root_id || a.error)));
const want = letter.toUpperCase() + ':\\';
const rows = [];
for (const g of r.groups) {
  const items = g.items.filter(i => (i.path || '').toUpperCase().startsWith(want));
  if (!items.length) continue;
  const sum = items.reduce((s, i) => s + Number(i.total_bytes), 0);
  const elig = items.filter(i => i.eligible).reduce((s, i) => s + Number(i.total_bytes), 0);
  rows.push({ id: g.group.group_id, title: g.title_zh, level: g.group.level, n: items.length, listed_of: g.group.item_count, sum, elig, in_use: g.group.in_use && g.group.in_use.process_label_zh, items });
}
rows.sort((a, b) => b.sum - a.sum);
for (const x of rows) {
  console.log(`${GB(x.sum)} GB | elig ${GB(x.elig)} | ${x.level} | ${x.id} | ${x.title} | items ${x.n}/${x.listed_of}${x.in_use ? ' | ' + x.in_use : ''}`);
  for (const i of x.items.sort((a, b) => b.total_bytes - a.total_bytes).slice(0, 4)) console.log(`      ${GB(i.total_bytes)} ${i.eligible ? 'Y' : 'n'} ${i.path} ${i.reason_zh || ''} ${i.in_use ? JSON.stringify(i.in_use) : ''}`);
}
console.log('total listed', GB(rows.reduce((s, x) => s + x.sum, 0)), 'eligible', GB(rows.reduce((s, x) => s + x.elig, 0)));
