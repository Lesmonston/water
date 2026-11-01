// Summarise a dup-files.cjs result: node sum-dup.cjs <dup.json> [top]
const r = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const GB = n => (n / 1073741824).toFixed(2);
console.log('root', r.root, 'groups', r.groups, 'extra GB', GB(r.extraBytes), 'hashed GB', GB(r.hashedBytes));
const short = p => p.replace(r.root, '').replace(/^\\/, '');
// Where the extra copies sit: count each group's copies by the second-level folder.
const where = {};
for (const g of r.list) for (const f of g.files) { const k = short(f.path).split('\\').slice(0, 2).join('\\'); where[k] = (where[k] || 0) + g.size; }
console.log('bytes in duplicate groups by folder:', Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + '=' + GB(v)).join(', '));
for (const g of r.list.slice(0, +(process.argv[3] || 25))) console.log(GB(g.size), 'x' + g.copies, '| ' + g.files.map(f => short(f.path)).join(' | '));
