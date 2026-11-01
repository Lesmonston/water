// After a quarantine move: find links (junctions, symlinks) left outside the quarantine whose target lies inside a
// moved path, i.e. what the move broke (11-02: audit-b57a\server\node_modules pointed into grok2). Real node_modules
// and .git directories are not entered. Read-only. usage: node links-into-moved.cjs <quarantine log.jsonl> <root>...
const fs = require('fs');
const path = require('path');
const [logFile, ...roots] = process.argv.slice(2);
const moved = fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l.replace(/^﻿/, '')))
  .filter(r => r.status === 'moved' && fs.existsSync(r.dest)).map(r => r.path.toLowerCase());
const inside = t => { const x = t.toLowerCase(); return moved.find(m => x === m || x.startsWith(m + '\\')); };
let links = 0, hits = 0;
for (const root of roots) (function walk(d) {
  let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of es) {
    const p = path.join(d, e.name);
    if (e.isSymbolicLink()) {
      links++;
      let t = ''; try { t = path.resolve(path.dirname(p), fs.readlinkSync(p)); } catch { }
      const m = t && inside(t);
      if (m) { hits++; console.log('BROKEN', p, '->', t); }
      continue;
    }
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') walk(p);
  }
})(root);
console.log('moved paths', moved.length, 'links seen', links, 'pointing into moved paths', hits);
