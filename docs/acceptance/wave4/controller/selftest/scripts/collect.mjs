// Copies the wave 4 pre-dispatch evidence into main: worker baseline receipts and the three self-test
// archives (each archive keeps its ARCHIVE.json index with per-file hashes). Usage (repo root): node .local/w4-selftest/collect.mjs
import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const ctl = 'F:/new/smaltalk/water', dest = ctl + '/docs/acceptance/wave4/controller/';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
mkdirSync(dest + 'preflight', {recursive: true});
for (const g of ['G1', 'G2', 'G3']) {
  const dir = `${ctl}/.worktrees/w4-${g.toLowerCase()}/.local/checks/WATER-W4-${g}`;
  for (const n of readdirSync(dir).filter(n => n.endsWith('-baseline-result.json'))) cpSync(join(dir, n), dest + 'preflight/WATER-W4-' + g + '-' + n);
}
// The strict G1 entry is expected to refuse the path-based stub; keep those check receipts as proof.
const strict = ctl + '/.worktrees/w4-selftest-g1/.local/checks/WATER-W4-SELFTEST-G1';
mkdirSync(dest + 'selftest/selftest-g1-strict', {recursive: true});
for (const n of readdirSync(strict).filter(n => /-(check|baseline)-result\.json$/.test(n))) cpSync(join(strict, n), dest + 'selftest/selftest-g1-strict/' + n);
for (const [slot, ev] of [['g1', 'selftest-g1b'], ['g2', 'selftest-g2'], ['g3', 'selftest-g3']]) {
  const from = `${ctl}/.worktrees/w4-selftest-${slot}/docs/acceptance/wave4/${ev}`;
  if (!existsSync(from)) continue;
  cpSync(from, dest + 'selftest/' + ev, {recursive: true, errorOnExist: true, force: false});
  const index = JSON.parse(readFileSync(dest + 'selftest/' + ev + '/ARCHIVE.json', 'utf8'));
  // Archive entries are relative to the self-test tree root; re-check every copied byte.
  for (const e of index.entries) { const p = dest + 'selftest/' + ev + '/' + e.archive.split(ev + '/')[1]; if (sha(p) !== e.sha256) throw new Error('hash mismatch ' + p); }
  console.log(ev, index.files, 'files', index.bytes, 'bytes');
}
