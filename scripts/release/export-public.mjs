// Export the public Flick tree (dfan0519-tech/flick) from one commit of the private working repository, then scan it.
// Usage (repo root): node scripts/release/export-public.mjs [--commit <rev>] [--out <new dir>]
// The output goes to .local/public-export/<sha8>-<stamp>/ unless --out names another new directory: tree/ (the files to
// publish), report.json and report.md. Nothing is pushed; the first public commit is made by hand after the user agrees.
// What goes in:
//   - the desktop app and every crate it builds from (path dependencies of apps/water/host, followed from Cargo.toml),
//     plus the crates CI checks;
//   - the UI, the Windows packaging, the CI workflow, rust-toolchain.toml and .gitattributes;
//   - files those sources read at build or test time (include_str!/include_bytes!, new URL(..., import.meta.url),
//     relative imports, repo-root paths such as "contracts/..."), pulled in and listed in the report;
//   - packaging/public/root/, copied over the tree root (README, licences, contributing and security notes, .gitignore).
// The scan fails the export on the machine's user name, private folders, identities, emails, the old local service
// address and secret-looking strings, in file names and contents (binary files too); it warns on references to the
// private process (acceptance, dispatch, handoffs, ticket ids) so they can be reviewed before the first push.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, posix} from 'node:path';

const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const git = (...a) => execFileSync('git', a, {encoding: 'utf8', maxBuffer: 256 << 20}).trim();
const sha = git('rev-parse', '--verify', (opt('--commit') ?? 'HEAD') + '^{commit}');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const out = opt('--out') ?? join('.local', 'public-export', sha.slice(0, 8) + '-' + stamp);
if (existsSync(out)) throw Error('Output exists: ' + out);
const treeDir = join(out, 'tree');

// Every file in the commit, with its blob id.
const blobs = new Map();
for (const line of git('ls-tree', '-r', '-z', sha).split('\0').filter(Boolean)) {
  const [meta, path] = line.split('\t'), [, type, oid] = meta.split(' ');
  if (type === 'blob') blobs.set(path, oid);
}
const cache = new Map();
const read = path => {
  const oid = blobs.get(path); if (!oid) throw Error('Not in commit: ' + path);
  if (!cache.has(path)) cache.set(path, execFileSync('git', ['cat-file', 'blob', oid], {maxBuffer: 256 << 20}));
  return cache.get(path);
};
const under = dir => [...blobs.keys()].filter(p => p.startsWith(dir + '/'));

// Crates: the app and CI's list, then their path dependencies.
const CI_CRATES = ['apps/water/host', 'packages/junk-rules', 'packages/junk-scan', 'packages/junk-clean', 'packages/cleanup-manifest', 'packages/dup-finder',
  'packages/installed-apps', 'packages/process-scan', 'packages/native-root', 'packages/scope-registry', 'packages/water-service', 'packages/native-picker'];
const crates = new Set(), queue = [...CI_CRATES];
while (queue.length) {
  const dir = queue.shift(); if (crates.has(dir)) continue; crates.add(dir);
  for (const m of read(dir + '/Cargo.toml').toString('utf8').matchAll(/^[\w-]+\s*=\s*\{[^}\n]*\bpath\s*=\s*"([^"]+)"/gm)) queue.push(posix.normalize(dir + '/' + m[1]));
}
const ROOTS = [...crates, 'apps/water/ui', 'packaging/windows', 'scripts/ci'];
const FILES = ['.github/workflows/ci.yml', 'rust-toolchain.toml', '.gitattributes'];
const selected = new Set([...ROOTS.flatMap(under), ...FILES.filter(f => blobs.has(f))]);
for (const f of FILES) if (!blobs.has(f)) throw Error('Missing ' + f);

// Files the selected sources read: resolve, pull in when present in the commit, report the rest as dangling.
const TEXT = /\.(rs|mjs|js|json|toml|md|html|css|ps1|nsi|yml|yaml|txt|svg)$/i;
const REPO_PREFIX = /^(contracts|docs|scripts|packaging|packages|apps|crates)\//;
const pulled = new Map(), dangling = [];
const refs = (path, text) => {
  const found = [], dir = posix.dirname(path);
  const rel = r => posix.normalize(posix.join(dir, r));
  for (const m of text.matchAll(/include_(?:str|bytes)!\(\s*"([^"]+)"/g)) found.push(rel(m[1]));
  for (const m of text.matchAll(/new URL\(\s*'([^']+)'\s*,\s*import\.meta\.url\)/g)) found.push(rel(m[1]));
  for (const m of text.matchAll(/(?:from\s+|import\()\s*'(\.{1,2}\/[^']+)'/g)) found.push(rel(m[1]));
  // Repo-root paths in Rust and JS sources (tests join them onto the tree root); globs and runtime fixture dirs are skipped.
  if (/\.(rs|mjs|js)$/.test(path)) for (const m of text.matchAll(/"((?:contracts|docs|scripts|packaging|packages|apps|crates)\/[^"*?]+\.[A-Za-z0-9]+)"/g)) found.push(m[1]);
  return found.filter(r => !r.startsWith('..'));
};
const pending = [...selected];
while (pending.length) {
  const path = pending.pop(); if (!TEXT.test(path)) continue;
  for (const r of refs(path, read(path).toString('utf8'))) {
    if (selected.has(r)) continue;
    if (blobs.has(r)) { selected.add(r); pulled.set(r, path); pending.push(r); }
    else if (REPO_PREFIX.test(r) || r.includes('/')) dangling.push({from: path, ref: r});
  }
}

// Overlay: packaging/public/root/<path> becomes <path> at the tree root.
const OVERLAY = 'packaging/public/root';
const overlay = under(OVERLAY);
if (!overlay.length) console.warn('No overlay at ' + OVERLAY + ' in ' + sha.slice(0, 8));

const written = [];
const put = (dest, data) => { const p = join(treeDir, dest); mkdirSync(dirname(p), {recursive: true}); writeFileSync(p, data, {flag: 'wx'}); written.push({path: dest, bytes: data.length, data}); };
mkdirSync(treeDir, {recursive: true});
const overlayDest = new Set(overlay.map(p => p.slice(OVERLAY.length + 1)));
for (const p of [...selected].sort()) if (!overlayDest.has(p)) put(p, read(p));
for (const p of overlay) put(p.slice(OVERLAY.length + 1), read(p));

// Scan.
const ERRORS = [
  ['user-name', /37310/],
  ['mirasim', /mirasim/i],
  ['private-folder', /smaltalk|VaultSystem|git-central|[A-Za-z]:[\\/]+new[\\/]/i],
  // The maintainer's other project folders; only names distinctive enough not to be ordinary words.
  ['private-project', /denglou|登楼|zbbody|climbmao|grok2|audit-b57a|feishu-bot|wechtmini|podcut|pi-studio|heybox/i],
  ['identity', /Riku Toto|xiluotaka|usr_40dd3b2f/i],
  ['old-local-service', /127\.0\.0\.1:7890/],
  ['secret', /ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g],
];
// Placeholder hosts in tests and docs are not addresses of anyone.
const EMAIL_OK = /@(?:[\w-]+\.)*(?:localhost|example\.(?:com|org|net)|invalid|test)$/i;
// THIRD-PARTY-LICENSES.md is cargo-about output: the licences' own copyright notices (some with their authors' emails)
// must be kept as written. Every other rule still applies to it.
const EMAIL_OK_FILES = new Set(['THIRD-PARTY-LICENSES.md']);
const WARNINGS = [
  ['private-process', /docs\/(?:acceptance|dispatch|maintenance|STATUS|CONTROLLER)|CONTROLLER-HANDOFF|总控|派单|工单|收单|交接/],
  ['ticket-id', /WATER-(?:W|M|N|P)\d+[-A-Z0-9]*/],
  ['worktrees', /\.worktrees/],
  ['home-path', /[A-Za-z]:[\\/]+Users[\\/]+(?!(?:Public|Default|All Users|<|%|\$|\{|someone|user|name|alice)\b)[^\\/\s"'`]+/i],
  ['local-time-zone', /JST/],
];
const hits = [], size = {warn: 1 << 20, error: 20 << 20};
const scanText = (path, text, binary) => {
  const lines = text.split(/\r?\n/);
  const check = (level, kind, re) => lines.forEach((line, i) => {
    for (const m of line.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) {
      if (kind === 'email' && (EMAIL_OK.test(m[0]) || EMAIL_OK_FILES.has(path))) continue;
      hits.push({level, kind, path, line: binary ? null : i + 1, text: binary ? '(binary)' : line.trim().slice(0, 200)}); break;
    }
  });
  for (const [kind, re] of ERRORS) check('error', kind, re);
  for (const [kind, re] of WARNINGS) check('warn', kind, re);
};
for (const f of written) {
  scanText(f.path, f.path, false);
  const binary = f.data.includes(0);
  scanText(f.path, f.data.toString(binary ? 'latin1' : 'utf8'), binary);
  if (f.bytes > size.error) hits.push({level: 'error', kind: 'size', path: f.path, line: null, text: f.bytes + ' bytes'});
  else if (f.bytes > size.warn) hits.push({level: 'warn', kind: 'size', path: f.path, line: null, text: f.bytes + ' bytes'});
}
for (const d of dangling) hits.push({level: 'error', kind: 'dangling', path: d.from, line: null, text: d.ref});

// Name hits in file names apart from content hits (scanText was called with the path as text; line 1 means the name).
const errors = hits.filter(h => h.level === 'error'), warnings = hits.filter(h => h.level === 'warn');
const count = list => Object.entries(list.reduce((a, h) => (a[h.kind] = (a[h.kind] ?? 0) + 1, a), {})).map(([k, n]) => k + ' ' + n).join(', ') || 'none';
const report = {commit: sha, stamp, tree: treeDir.split('\\').join('/'), crates: [...crates].sort(), files: written.length,
  bytes: written.reduce((a, f) => a + f.bytes, 0), overlay: [...overlayDest].sort(), pulledIn: Object.fromEntries([...pulled].sort()),
  errors: errors.length, warnings: warnings.length, hits: hits.map(({level, kind, path, line, text}) => ({level, kind, path, line, text}))};
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
const md = ['# Public export ' + sha.slice(0, 8) + ' (' + stamp + ')', '',
  `- files ${report.files}, ${(report.bytes / 1048576).toFixed(1)} MB; crates ${report.crates.length}; overlay ${report.overlay.length}`,
  `- errors ${errors.length}: ${count(errors)}`, `- warnings ${warnings.length}: ${count(warnings)}`, '',
  '## Pulled in by reference', '', ...[...pulled].sort().map(([p, from]) => `- ${p} (from ${from})`), '',
  '## Errors', '', ...errors.map(h => `- [${h.kind}] ${h.path}${h.line ? ':' + h.line : ''} ${h.text}`), '',
  '## Warnings', '', ...warnings.map(h => `- [${h.kind}] ${h.path}${h.line ? ':' + h.line : ''} ${h.text}`), ''];
writeFileSync(join(out, 'report.md'), md.join('\n'), {flag: 'wx'});
console.log(`export ${sha.slice(0, 8)} -> ${out}: ${report.files} files, errors ${errors.length} (${count(errors)}), warnings ${warnings.length} (${count(warnings)})`);
process.exitCode = errors.length ? 1 : 0;
