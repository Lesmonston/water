// Size of each numbered item in a quarantine folder, counting hard-linked files once (by dev:ino) and not
// following links or junctions. Read-only. usage: node quarantine-size.cjs <quarantine folder>...
const fs = require('fs');
const path = require('path');
const GiB = n => (n / 1073741824).toFixed(2);
for (const q of process.argv.slice(2)) {
  if (!fs.existsSync(q)) { console.log(q, 'absent'); continue; }
  const seen = new Set();
  let all = 0;
  const rows = [];
  for (const n of fs.readdirSync(q).sort()) {
    let bytes = 0, files = 0;
    const walk = p => {
      let st; try { st = fs.lstatSync(p, { bigint: true }); } catch { return; }
      if (st.isSymbolicLink()) return;
      if (st.isDirectory()) { let es = []; try { es = fs.readdirSync(p); } catch { } for (const e of es) walk(path.join(p, e)); return; }
      const id = st.dev + ':' + st.ino;
      if (seen.has(id)) return;
      seen.add(id); bytes += Number(st.size); files++;
    };
    walk(path.join(q, n));
    all += bytes;
    rows.push(`  ${n} ${GiB(bytes)} GB (${files} files)`);
  }
  console.log(`${q} ${GiB(all)} GB`);
  for (const r of rows) console.log(r);
}
