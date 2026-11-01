// denglou C1/C2 (user, 11-02: "C1/C2你查一下有没有重复的，只留一份"): find byte-identical files across several
// roots (same size first, then full SHA-256) and pick one copy to keep per group. Roots are given in priority
// order: the copy under the earliest root wins; inside one root, a name without a "-<12 hex>" export suffix
// wins, then the shorter path, then the older file. Also reports, per root, how much of it would remain.
// Read-only. usage: node dup-keep-one.cjs <out.json> <root1> <root2> ...
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const [out, ...roots] = process.argv.slice(2);
const files = [];
for (const [ri, root] of roots.entries()) {
  (function walk(dir) {
    let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { walk(p); continue; }
      let st; try { st = fs.lstatSync(p); } catch { continue; }
      if (st.size > 0) files.push({ path: p, root: ri, size: st.size, mtime: st.mtimeMs });
    }
  })(root);
}
const hash = f => new Promise((ok, bad) => { const h = crypto.createHash('sha256'); fs.createReadStream(f, { highWaterMark: 4 << 20 }).on('data', d => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', bad); });
const suffixed = p => /-[0-9a-f]{12}(\.[^.\\]+)$/i.test(path.basename(p)) ? 1 : 0;
const rank = (a, b) => a.root - b.root || suffixed(a.path) - suffixed(b.path) || a.path.length - b.path.length || a.mtime - b.mtime;
(async () => {
  const bySize = new Map();
  for (const f of files) (bySize.get(f.size) || bySize.set(f.size, []).get(f.size)).push(f);
  const groups = []; let hashed = 0;
  for (const [size, fs_] of bySize) {
    if (fs_.length < 2) continue;
    const byHash = new Map();
    for (const f of fs_) { try { f.sha = await hash(f.path); hashed += size; } catch { continue; } (byHash.get(f.sha) || byHash.set(f.sha, []).get(f.sha)).push(f); }
    for (const [sha, g] of byHash) if (g.length > 1) { g.sort(rank); groups.push({ sha, size, keep: g[0].path, remove: g.slice(1).map(x => x.path) }); }
  }
  const per = roots.map((r, i) => ({ root: r, files: 0, bytes: 0, removeFiles: 0, removeBytes: 0 }));
  for (const f of files) { per[f.root].files++; per[f.root].bytes += f.size; }
  const rootOf = p => files.find(f => f.path === p).root;
  const idx = new Map(files.map(f => [f.path, f]));
  for (const g of groups) for (const p of g.remove) { const f = idx.get(p); per[f.root].removeFiles++; per[f.root].removeBytes += f.size; }
  const G = n => (n / 1073741824).toFixed(2);
  fs.writeFileSync(out, JSON.stringify({ roots, hashedBytes: hashed, per, groups }, null, 1));
  console.log('files', files.length, 'hashed', G(hashed), 'GB, identical groups', groups.length);
  for (const r of per) console.log(`${r.root}: ${r.files} files ${G(r.bytes)} GB; duplicates to remove ${r.removeFiles} files ${G(r.removeBytes)} GB; remaining ${G(r.bytes - r.removeBytes)} GB`);
})();
