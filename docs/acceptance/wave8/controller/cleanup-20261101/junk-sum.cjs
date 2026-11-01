// Sum deep-survey junk entries whose path contains every given fragment (case-insensitive):
// node junk-sum.cjs <deep.json> <label> <fragment>[,<fragment>...] ...   (label=fragments pairs)
const fs = require('fs');
const [file, ...pairs] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const GB = n => (n / 1e9).toFixed(2);
for (let i = 0; i < pairs.length; i += 2) {
  const frags = pairs[i + 1].toLowerCase().split(',');
  const rows = r.junk.filter(j => frags.every(f => j.path.toLowerCase().includes(f)));
  console.log(pairs[i], rows.length, 'dirs', GB(rows.reduce((s, j) => s + j.bytes, 0)), 'GB', 'newest', rows.map(j => j.newest || '').sort().pop()?.slice(0, 10));
}
