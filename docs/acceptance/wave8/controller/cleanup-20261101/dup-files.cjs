// Read-only duplicate finder for the user's 11-02 drive E report: files of at least <minMB> under a root are
// grouped by size, and only same-size files are hashed in full (SHA-256), so every reported group is
// byte-for-byte identical. No links are followed; nothing is changed. usage: node dup-files.cjs <root> <out.json> [minMB]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const [root, out, minMB = '50'] = process.argv.slice(2);
const min = +minMB * 1048576;
const bySize = new Map();
(function walk(dir) {
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) { walk(p); continue; }
    let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (st.size < min) continue;
    if (!bySize.has(st.size)) bySize.set(st.size, []);
    bySize.get(st.size).push({ path: p, mtime: st.mtime.toISOString() });
  }
})(root);
const hash = file => new Promise((ok, bad) => { const h = crypto.createHash('sha256'); fs.createReadStream(file, { highWaterMark: 4 << 20 }).on('data', d => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', bad); });
(async () => {
  const groups = []; let hashedBytes = 0;
  for (const [size, files] of [...bySize].filter(([, f]) => f.length > 1).sort((a, b) => b[0] - a[0])) {
    const byHash = new Map();
    for (const f of files) { try { const h = await hash(f.path); hashedBytes += size; if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(f); } catch { } }
    for (const [h, same] of byHash) if (same.length > 1) groups.push({ size, sha256: h, copies: same.length, extraBytes: size * (same.length - 1), files: same });
  }
  groups.sort((a, b) => b.extraBytes - a.extraBytes);
  const extra = groups.reduce((s, g) => s + g.extraBytes, 0);
  fs.writeFileSync(out, JSON.stringify({ root, minMB: +minMB, hashedBytes, groups: groups.length, extraBytes: extra, list: groups }, null, 1));
  console.log('groups', groups.length, 'extra GB', (extra / 1073741824).toFixed(2), 'hashed GB', (hashedBytes / 1073741824).toFixed(1));
})();
