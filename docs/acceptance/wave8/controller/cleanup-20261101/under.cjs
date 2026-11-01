// List surveyed directories under given prefixes: node under.cjs <deep.json> <minGB> <prefix>...
const fs = require('fs');
const [file, min, ...prefixes] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const GB = n => (n / 1e9).toFixed(2);
for (const pre of prefixes) {
  const low = pre.toLowerCase();
  console.log('==', pre);
  for (const d of r.dirs.filter(d => d.path.toLowerCase().startsWith(low) && d.bytes >= +min * 1e9).slice(0, 16))
    console.log('  ', GB(d.bytes), '7d', GB(d.recent), d.path, (d.newest || '').slice(0, 10));
  for (const c of r.clusters.filter(c => c.parent.toLowerCase().startsWith(low)).slice(0, 5))
    console.log('   cluster', GB(c.bytes), c.count, c.pattern, c.parent, (c.oldest || '').slice(0, 10), '->', (c.newest || '').slice(0, 10));
}
