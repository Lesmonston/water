// Bytes by file extension (and newest time) under each given folder, read-only, links not followed.
// usage: node by-ext.cjs <out.json> <folder>...
const fs = require('fs');
const path = require('path');
const [out, ...roots] = process.argv.slice(2);
const res = {};
for (const root of roots) {
  const ext = {}; let files = 0, bytes = 0, newest = 0; const top = {};
  (function walk(d, first) {
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { walk(p, first || e.name); continue; }
      let st; try { st = fs.lstatSync(p); } catch { continue; }
      const x = (path.extname(e.name) || '(none)').toLowerCase();
      (ext[x] ||= { n: 0, bytes: 0 }); ext[x].n++; ext[x].bytes += st.size;
      const t = first || '(files)'; top[t] = (top[t] || 0) + st.size;
      files++; bytes += st.size; newest = Math.max(newest, st.mtimeMs);
    }
  })(root, null);
  res[root] = { files, bytes, newest: new Date(newest).toISOString(), ext: Object.fromEntries(Object.entries(ext).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 8)), top: Object.fromEntries(Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 8)) };
  const GiB = n => (n / 1073741824).toFixed(2);
  console.log('==', root, files, 'files', GiB(bytes), 'GiB newest', res[root].newest.slice(0, 10));
  console.log('   ext:', Object.entries(res[root].ext).map(([k, v]) => `${k} ${v.n} ${GiB(v.bytes)}`).join(' | '));
  console.log('   top:', Object.entries(res[root].top).map(([k, v]) => `${k} ${GiB(v)}`).join(' | '));
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
