// Read-only recon for the denglou cleanup order (11-02): what each item holds now, how old it is, and what
// must be left alone. Sizes are logical bytes, newest = latest mtime under the path. usage: node denglou-recon.cjs
const fs = require('fs');
const path = require('path');
const D = 'F:\\new\\denglou';
const G = n => (n / 1073741824).toFixed(2);
const now = Date.now();
function stat(p) {
  let bytes = 0, files = 0, newest = 0;
  (function walk(q) {
    let st; try { st = fs.lstatSync(q); } catch { return; }
    if (st.isSymbolicLink()) return;
    newest = Math.max(newest, st.mtimeMs);
    if (st.isDirectory()) { let es = []; try { es = fs.readdirSync(q); } catch { } for (const e of es) walk(path.join(q, e)); return; }
    bytes += st.size; files++;
  })(p);
  return { bytes, files, newest, ageDays: (now - newest) / 864e5 };
}
const line = (label, p, s) => console.log(`${label.padEnd(10)} ${G(s.bytes).padStart(7)} GB ${String(s.files).padStart(7)} files  newest ${new Date(s.newest).toISOString().slice(0, 16)} (${s.ageDays.toFixed(1)} d)  ${p}`);
const ls = d => { try { return fs.readdirSync(d); } catch { return []; } };

console.log('== A2 .apk.parts and their complete siblings');
(function walk(d, depth) {
  for (const e of ls(d)) {
    const p = path.join(d, e);
    let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (!st.isDirectory() || st.isSymbolicLink()) continue;
    if (/\.parts$/i.test(e)) {
      const full = p.replace(/\.parts$/i, '');
      const fs_ = fs.existsSync(full) ? fs.statSync(full).size : -1;
      const s = stat(p);
      console.log(`  ${fs_ > 0 ? 'COMPLETE' : 'NO-FILE '} sibling ${G(Math.max(fs_, 0))} GB, parts ${G(s.bytes)} GB  ${path.relative(D, p)}`);
    } else if (depth < 4) walk(p, depth + 1);
  }
})(path.join(D, '_ctl'), 0);

console.log('== A3 apk_<sha>.apk in _ctl\\*');
for (const sub of ls(path.join(D, '_ctl'))) for (const e of ls(path.join(D, '_ctl', sub))) if (/^apk_[0-9a-f]{7,}\.apk$/i.test(e)) { const p = path.join(D, '_ctl', sub, e); const st = fs.statSync(p); console.log(`  ${G(st.size)} GB ${new Date(st.mtimeMs).toISOString().slice(0, 10)} ${sub}\\${e}`); }

console.log('== A4 snapshots');
for (const avd of ls('F:\\cdisk-cache\\android-avd').filter(x => x.endsWith('.avd'))) { const p = path.join('F:\\cdisk-cache\\android-avd', avd, 'snapshots'); if (fs.existsSync(p)) line('  snap', p, stat(p)); }

console.log('== B1 detached dirs');
for (const n of ['fix-r3', 'fix-r4', 'fix-r7', 'grok2', 'grok3', 'grok4', 'ui', 'yb-release', '_dl_batchverify', 'b57f', 'fix-r2']) {
  const p = path.join(D, 'worktrees', n);
  if (!fs.existsSync(p)) { console.log('  missing', n); continue; }
  let gitdir = '(no .git)';
  const g = path.join(p, '.git');
  if (fs.existsSync(g) && fs.statSync(g).isFile()) { const t = fs.readFileSync(g, 'utf8').trim().replace(/^gitdir:\s*/, ''); gitdir = fs.existsSync(t) ? 'REGISTERED ' + t : 'detached'; }
  else if (fs.existsSync(g)) gitdir = '.git is a directory';
  line('  ' + n, gitdir, stat(p));
}

console.log('== B3 .tmp_* in executor workspaces');
for (const n of ['fix-r1', 'fix-r5', 'fix-r6', 'fix-r10', 'fix-r11', 'fix-r13']) {
  const tmps = ls(path.join(D, 'worktrees', n)).filter(e => /^\.tmp_/.test(e));
  let b = 0, old = 0, recent = 0;
  for (const t of tmps) { const s = stat(path.join(D, 'worktrees', n, t)); b += s.bytes; s.ageDays >= 2 ? old++ : recent++; }
  console.log(`  ${n}: ${tmps.length} .tmp_* ${G(b)} GB, >=2 d old ${old}, newer ${recent}`);
}

console.log('== B4 ui-v2 root .tmp_*');
{ const tmps = ls(path.join(D, 'worktrees', 'ui-v2')).filter(e => /^\.tmp_/.test(e)); let ob = 0, rb = 0, o = 0, r = 0;
  for (const t of tmps) { const s = stat(path.join(D, 'worktrees', 'ui-v2', t)); if (s.ageDays >= 2) { o++; ob += s.bytes; } else { r++; rb += s.bytes; } }
  console.log(`  ${tmps.length} .tmp_*: >=2 d old ${o} (${G(ob)} GB), newer ${r} (${G(rb)} GB)`); }

console.log('== B5 _ctl subdirs (>= 0.3 GB)');
for (const sub of ls(path.join(D, '_ctl'))) { const p = path.join(D, '_ctl', sub); if (!fs.lstatSync(p).isDirectory()) continue; const s = stat(p); if (s.bytes >= 0.3 * 1073741824) line('  ' + sub, p, s); }

console.log('== C3 _review\\zhenti children');
for (const sub of ls(path.join(D, '_review', 'zhenti'))) { const p = path.join(D, '_review', 'zhenti', sub); const s = stat(p); if (s.bytes >= 0.2 * 1073741824 || fs.lstatSync(p).isFile()) line('  ' + sub.slice(0, 8), sub, s); }

console.log('== C4 eval\\distill-w0');
line('  distill', 'eval\\distill-w0', stat(path.join(D, 'worktrees', 'ui-v2', 'eval', 'distill-w0')));
