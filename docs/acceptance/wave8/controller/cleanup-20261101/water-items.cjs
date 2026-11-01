// List every item of chosen Water groups: node water-items.cjs <water-survey.json> <group_id>...
const fs = require('fs');
const [file, ...ids] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const GB = n => (Number(n) / 1e9).toFixed(3);
for (const id of ids) {
  const g = r.groups.find(x => x.group.group_id === id);
  if (!g) { console.log('==', id, 'not found'); continue; }
  console.log('==', id, g.title_zh, g.group.level, 'items', g.group.item_count, 'listed', g.items.length);
  for (const i of g.items) console.log('  ', GB(i.total_bytes), i.eligible ? 'Y' : 'n', i.path, i.reason_zh || '', i.in_use ? 'IN_USE' : '', (i.newest_activity || '').slice(0, 10));
}
