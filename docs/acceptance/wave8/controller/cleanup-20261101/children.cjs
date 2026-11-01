// Direct children (one level below a parent) from a deep survey, >= 100 MB: node children.cjs <deep.json> <parent>...
const fs = require('fs');
const [file, ...parents] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const p of parents) {
  const pre = p.replace(/[\\/]+$/, '').toLowerCase() + '\\';
  console.log('==', p);
  for (const d of r.dirs.filter(d => d.path.toLowerCase().startsWith(pre) && !d.path.slice(pre.length).includes('\\')))
    console.log('  ', (d.bytes / 1e9).toFixed(2), d.path, (d.newest || '').slice(0, 10));
}
