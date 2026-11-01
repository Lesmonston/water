// denglou C1/C2 (user, 11-02: "如果有我曾经的压缩文档也可以删除"): for each .zip under the given roots, list its
// entries (`unzip -l`, sizes only, since entry names may be in a legacy code page) and count how many entries have
// a file of the same size anywhere under the roots outside archives. An archive counts as already extracted only
// when every entry is found. Read-only. usage: node zip-extracted.cjs <root>...
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const roots = process.argv.slice(2);
const sizes = new Set(), zips = [];
for (const root of roots) {
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { walk(p); continue; }
      if (/\.zip$/i.test(e.name)) zips.push(p); else sizes.add(fs.statSync(p).size);
    }
  })(root);
}
let extracted = 0, extractedBytes = 0, kept = 0, keptBytes = 0;
for (const z of zips) {
  const out = execFileSync('unzip', ['-l', z], { encoding: 'latin1', maxBuffer: 1 << 26 });
  const ent = out.split(/\r?\n/).map(l => l.match(/^\s*(\d+)\s+\S+\s+\S+\s+(.+)$/)).filter(m => m && +m[1] > 0).map(m => +m[1]);
  const found = ent.filter(s => sizes.has(s)).length;
  const zb = fs.statSync(z).size;
  const all = ent.length > 0 && found === ent.length;
  if (all) { extracted++; extractedBytes += zb; } else { kept++; keptBytes += zb; }
  console.log(`${all ? 'EXTRACTED' : 'ONLY-IN-ZIP'} ${found}/${ent.length} ${(zb / 1048576).toFixed(1)} MB ${path.relative(roots[0], z)}`);
}
console.log(`zips ${zips.length}: fully extracted ${extracted} (${(extractedBytes / 1048576).toFixed(1)} MB), not ${kept} (${(keptBytes / 1048576).toFixed(1)} MB)`);
