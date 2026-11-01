// Deep read-only survey of one drive for the user's 11-01 per-drive cleanup (controller tool, independent of
// Water). No links or junctions are followed; each hard-linked file counts once (volume + file ID). Records:
// directories to depth 8 of at least 100 MB; files of at least 500 MB; the outermost directory of each known
// dev/cache/temp/log kind; Git repositories and worktrees; clusters of 20+ sibling directories whose names
// differ only by digits or random codes (leak pattern); bytes changed in the last 7 days.
// Reads names, sizes and times only. usage: node deep-survey.cjs <out.json> <root>
const fs = require('fs');
const path = require('path');
const [out, root] = process.argv.slice(2);
const MB = 1024 * 1024, WEEK = Date.now() - 7 * 86400000;
const KINDS = new Map(Object.entries({
  node_modules: 'node_modules', __pycache__: 'python-cache', '.pytest_cache': 'python-cache', '.mypy_cache': 'python-cache',
  '.ruff_cache': 'python-cache', '.venv': 'python-venv', venv: 'python-venv', '.gradle': 'gradle', '.next': 'web-build-cache',
  '.nuxt': 'web-build-cache', '.turbo': 'web-build-cache', '.parcel-cache': 'web-build-cache', '.cache': 'cache', cache: 'cache',
  caches: 'cache', 'code cache': 'cache', gpucache: 'cache', cacheddata: 'cache', 'cache_data': 'cache', temp: 'temp', tmp: 'temp',
  logs: 'logs', crashdumps: 'crash-dumps', crashpad: 'crash-dumps', 'crash reports': 'crash-dumps', '.tmp': 'temp',
}));
let active = 0; const waiting = [];
const gate = async f => { if (active >= 48) await new Promise(r => waiting.push(r)); active++; try { return await f(); } finally { active--; const n = waiting.shift(); if (n) n(); } };
const norm = n => n.toLowerCase().replace(/[0-9a-f]{8,}/g, '#').replace(/\d+/g, '#').replace(/[a-z0-9]{6,}$/i, m => /\d/.test(m) ? '#' : m);
// Empty folders have no time, and some files carry dates JavaScript cannot represent: both become null.
const iso = t => (Number.isFinite(t) && t > 0 && t < 8.64e15 ? new Date(t).toISOString() : null);
const most = (list, f) => list.reduce((m, k) => Math.max(m, f(k)), 0);
const least = (list, f) => list.reduce((m, k) => (f(k) > 0 ? Math.min(m, f(k)) : m), Infinity);
const seen = new Set(), dirs = [], big = [], junk = [], git = [], clusters = [];
let errors = 0, files = 0, links = 0;
async function walk(dir, depth, inJunk) {
  let entries;
  try { entries = await gate(() => fs.promises.readdir(dir, { withFileTypes: true })); } catch { errors++; return { bytes: 0, recent: 0, files: 0, newest: 0 }; }
  const names = new Set(entries.map(e => e.name.toLowerCase()));
  const gitEntry = entries.find(e => e.name === '.git');
  let kind = KINDS.get(path.basename(dir).toLowerCase()) ?? null;
  if (!kind && names.has('cachedir.tag')) kind = 'cachedir-tagged';
  if (!kind && path.basename(dir).toLowerCase() === 'target' && names.has('.rustc_info.json')) kind = 'rust-target';
  const recordJunk = kind && !inJunk && depth > 0;
  let bytes = 0, recent = 0, count = 0, newest = 0; const kids = [];
  await Promise.all(entries.map(async e => {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) { links++; return; }
    if (e.isDirectory()) { const r = await walk(p, depth + 1, inJunk || !!kind); kids.push({ name: e.name, ...r }); bytes += r.bytes; recent += r.recent; count += r.files; newest = Math.max(newest, r.newest); return; }
    let st; try { st = await gate(() => fs.promises.lstat(p, { bigint: true })); } catch { errors++; return; }
    if (st.isSymbolicLink()) { links++; return; }
    if (st.nlink > 1n) { const k = st.dev + ':' + st.ino; if (seen.has(k)) return; seen.add(k); }
    const size = Number(st.size), m = Number(st.mtimeMs);
    bytes += size; count++; files++; newest = Math.max(newest, m); if (m >= WEEK) recent += size;
    if (size >= 500 * MB) big.push({ path: p, bytes: size, mtime: iso(m) });
  }));
  const row = { path: dir, depth, bytes, recent, files: count, newest: iso(newest) };
  if (depth >= 1 && depth <= 8 && bytes >= 100 * MB) dirs.push(row);
  if (recordJunk) junk.push({ kind, ...row });
  if (gitEntry && !inJunk) git.push({ kind: gitEntry.isDirectory() ? 'repo' : 'worktree-or-submodule', ...row });
  const byKey = new Map();
  for (const k of kids) { const key = norm(k.name); if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(k); }
  for (const [key, list] of byKey) if (list.length >= 20) clusters.push({ parent: dir, pattern: key, count: list.length, bytes: list.reduce((s, k) => s + k.bytes, 0), recent: list.reduce((s, k) => s + k.recent, 0), newest: iso(most(list, k => k.newest)), oldest: iso(least(list, k => k.newest)) });
  return { bytes, recent, files: count, newest };
}
(async () => {
  const t = Date.now(), started = new Date().toISOString();
  const top = await walk(root, 0, false);
  const by = (a, b) => b.bytes - a.bytes;
  fs.writeFileSync(out, JSON.stringify({ root, started, ended: new Date().toISOString(), ms: Date.now() - t, bytes: top.bytes, recent: top.recent, files, links, errors,
    dirs: dirs.sort(by), big: big.sort(by), junk: junk.sort(by), git: git.sort(by), clusters: clusters.filter(c => c.bytes >= 20 * MB || c.count >= 100).sort(by) }));
  console.log(root, (top.bytes / 1e9).toFixed(1) + ' GB', files, 'files', errors, 'errors', ((Date.now() - t) / 1000).toFixed(0) + ' s');
})();
