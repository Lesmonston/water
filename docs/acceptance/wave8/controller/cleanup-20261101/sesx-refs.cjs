// Which duplicate copies are referenced by Audition sessions (.sesx, XML) under the root. Read-only; prints
// only file names and session names. usage: node sesx-refs.cjs <dup.json>
const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sessions = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.sesx$/i.test(e.name)) sessions.push(p); } })(r.root);
const texts = sessions.map(s => ({ s, t: fs.readFileSync(s, 'utf8').replace(/\\\\/g, '\\').toLowerCase() }));
console.log('sessions', sessions.map(s => s.replace(r.root + '\\', '')).join(' | '));
for (const g of r.list) {
  console.log('group', (g.size / 1073741824).toFixed(2), 'GB');
  for (const f of g.files) {
    const full = f.path.toLowerCase(), name = path.basename(f.path).toLowerCase();
    const byPath = texts.filter(x => x.t.includes(full)).map(x => path.basename(x.s));
    const byName = texts.filter(x => x.t.includes(name)).map(x => path.basename(x.s));
    console.log('   ', f.path.replace(r.root + '\\', ''), '| full path in:', byPath.join(',') || '-', '| name in:', byName.join(',') || '-');
  }
}
