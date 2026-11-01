// Second pre-move check for F3 (11-02): the selftest trees' untracked evidence was archived into main under
// other paths (wave*/controller/preflight-*), so look each file up by SHA-256 anywhere under main's
// docs/acceptance. Prints, per tree, how many files have a byte-identical copy in main and where they landed.
// Read-only. usage: node check-trees-anywhere.cjs <repo root> <tree name>...
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const [repo, ...names] = process.argv.slice(2);
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const walk = (p, out = []) => {
  if (!fs.statSync(p).isDirectory()) { out.push(p); return out; }
  for (const e of fs.readdirSync(p, { withFileTypes: true })) walk(path.join(p, e.name), out);
  return out;
};
const inMain = new Map();
for (const f of walk(path.join(repo, 'docs', 'acceptance'))) {
  const h = hash(f);
  if (!inMain.has(h)) inMain.set(h, path.relative(repo, f));
}
console.log('main docs/acceptance files hashed:', inMain.size, 'distinct');
for (const n of names) {
  const tree = path.join(repo, '.worktrees', n);
  const st = execFileSync('git', ['-C', tree, 'status', '--porcelain'], { encoding: 'utf8' }).split(/\r?\n/).filter(l => l.startsWith('??'));
  let total = 0, found = 0, bytesMissing = 0;
  const where = {}, missing = [];
  for (const l of st) {
    for (const f of walk(path.join(tree, l.slice(3).replace(/\/$/, '')))) {
      total++;
      const hit = inMain.get(hash(f));
      if (hit) { found++; const d = path.dirname(hit).split(path.sep).slice(0, 5).join('/'); where[d] = (where[d] || 0) + 1; }
      else { missing.push(path.relative(tree, f)); bytesMissing += fs.statSync(f).size; }
    }
  }
  console.log(`${n}: ${total} files, identical copy in main ${found}, none ${missing.length} (${(bytesMissing / 1048576).toFixed(1)} MB)`);
  for (const [d, c] of Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 4)) console.log('     in ' + d + ' : ' + c);
  for (const m of missing.slice(0, 6)) console.log('     no copy: ' + m);
}
