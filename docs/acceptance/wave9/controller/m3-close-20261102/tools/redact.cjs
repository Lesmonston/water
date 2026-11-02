// Strip names from real-data recheck output before it goes into the repository: each item path keeps only the
// structural folder names the F1/F2 rules look at; every other segment becomes "*". Drive letters stay.
// Usage: node redact.cjs <in.json> <out.json>
const fs = require('fs');
const keep = new Set(['node_modules', 'app.asar.unpacked', 'resources', 'ebwebview', 'default', 'tdata', 'home', 'npm', 'app',
  'isolated-cli', 'pkg', 'claude', 'pi', 'codex', 'computer-use', 'chrome', 'mirasim-a', 'user data', 'ms-playwright', 'puppeteer']);
const shape = p => p.split('\\').map((s, i) => i === 0 || s === '' || keep.has(s.toLowerCase()) ? s : '*').join('\\');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (j.added) j.added.display_path = shape(j.added.display_path);
for (const w of j.watched) for (const i of w.items) i.path = shape(i.path);
fs.writeFileSync(process.argv[3], JSON.stringify(j, null, 2) + '\n');
