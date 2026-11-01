// Summarise a deep survey: node sum-deep.cjs <deep-X.json> [maxDepth] [minGB]
const fs = require('fs');
const [file, maxDepth = '3', minGB = '1'] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const GB = n => (n / 1e9).toFixed(2);
console.log('ROOT', r.root, GB(r.bytes), 'GB', r.files, 'files', 'recent7d', GB(r.recent), 'errors', r.errors, 'links', r.links, (r.ms / 1000).toFixed(0) + 's');
console.log('== DIRS (depth <=', maxDepth, ', >=', minGB, 'GB)');
for (const d of r.dirs.filter(d => d.depth <= +maxDepth && d.bytes >= +minGB * 1e9)) console.log(`${'  '.repeat(d.depth - 1)}${GB(d.bytes)} (7d ${GB(d.recent)}) ${d.path} newest ${(d.newest || '').slice(0, 10)}`);
console.log('== BIG FILES');
for (const b of r.big.slice(0, 40)) console.log(GB(b.bytes), b.path, (b.mtime || '').slice(0, 10));
console.log('== JUNK by kind');
const kinds = {};
for (const j of r.junk) { const k = (kinds[j.kind] ||= { n: 0, bytes: 0 }); k.n++; k.bytes += j.bytes; }
for (const [k, v] of Object.entries(kinds).sort((a, b) => b[1].bytes - a[1].bytes)) console.log(k, v.n, GB(v.bytes));
console.log('== JUNK top');
for (const j of r.junk.filter(j => j.bytes >= 0.2e9).slice(0, 60)) console.log(GB(j.bytes), j.kind, j.path, (j.newest || '').slice(0, 10));
console.log('== GIT top');
for (const g of r.git.filter(g => g.bytes >= 0.3e9).slice(0, 30)) console.log(GB(g.bytes), g.kind, g.path, (g.newest || '').slice(0, 10));
console.log('== CLUSTERS');
for (const c of r.clusters.slice(0, 30)) console.log(GB(c.bytes), c.count, c.pattern, c.parent, (c.oldest || '').slice(0, 10), '->', (c.newest || '').slice(0, 10), '7d', GB(c.recent));
