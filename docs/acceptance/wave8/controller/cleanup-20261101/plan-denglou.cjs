// Quarantine plan for the denglou cleanup the user chose on 11-02 (docs/maintenance/DENGLOU-CLEANUP-ORDER-20261102.md):
// "A/B都清理，然后C1/C2你查一下有没有重复的，只留一份 … C3压缩归档。C4测评音频应该也没用了可以删除。C5/C6不要动。"
// Every rule re-checks its premise while the plan is built; C3 is archived separately (archive-zhenti.py).
// Directories the denglou controller is using right now (_ctl tools, w37b_device, w39w40_device, w42/w45_*, r153_final)
// are never listed. usage: node plan-denglou.cjs <dup-denglou-C1C2.json> <out plan.json>
const fs = require('fs');
const path = require('path');
const [dupFile, out] = process.argv.slice(2);
const D = 'F:\\new\\denglou', W = D + '\\worktrees', C = D + '\\_ctl';
const ls = d => { try { return fs.readdirSync(d); } catch { return []; } };
const isDir = p => { try { const s = fs.lstatSync(p); return s.isDirectory() && !s.isSymbolicLink(); } catch { return false; } };
const newest = p => { let t = 0; (function w(q) { let s; try { s = fs.lstatSync(q); } catch { return; } t = Math.max(t, s.mtimeMs); if (s.isDirectory() && !s.isSymbolicLink()) for (const e of ls(q)) w(path.join(q, e)); })(p); return t; };
const old = (p, hours = 48) => Date.now() - newest(p) >= hours * 3600e3;
const P = x => ({ path: x });
const notes = [];

// A1: only the verify-<random> leak dirs; fix-r9 and fix-r8 keep other work files in the same .tmp_w35b.
const a1 = [];
for (const t of ['fix-r9', 'audit-b57a', 'fix-r8']) for (const e of ls(`${W}\\${t}\\.tmp_w35b`)) if (/^verify-[A-Za-z0-9]{6}$/.test(e)) a1.push(P(`${W}\\${t}\\.tmp_w35b\\${e}`));

// A2: download parts whose complete file sits next to them.
const a2 = [];
(function walk(d, depth) {
  for (const e of ls(d)) {
    const p = path.join(d, e);
    if (!isDir(p)) continue;
    if (/\.parts$/i.test(e)) { const full = p.replace(/\.parts$/i, ''); if (fs.existsSync(full) && fs.statSync(full).size > 0) a2.push(P(p)); else notes.push('A2 kept (no complete file): ' + p); }
    else if (depth < 3) walk(p, depth + 1);
  }
})(C, 0);

// A3: per-commit local test packages apk_*.apk; keep the current one.
const a3 = [];
for (const sub of ls(C)) for (const e of ls(`${C}\\${sub}`)) if (/^apk_.+\.apk$/i.test(e) && !(sub === 'w45_collect' && e === 'apk_871cd852.apk')) a3.push(P(`${C}\\${sub}\\${e}`));

// A4: snapshots of the emulator that is not running (climbmao_a35 was running at plan time).
const a4 = [P('F:\\cdisk-cache\\android-avd\\climbmao_up.avd\\snapshots')];

// B1: detached worktree dirs (.git file whose gitdir is gone) and the three dirs without .git.
const b1 = [];
for (const n of ['fix-r3', 'fix-r4', 'fix-r7', 'grok2', 'grok3', 'grok4', 'ui', 'yb-release', '_dl_batchverify', 'b57f', 'fix-r2']) {
  const p = `${W}\\${n}`, g = p + '\\.git';
  if (!isDir(p)) continue;
  if (fs.existsSync(g) && fs.statSync(g).isFile()) {
    const target = fs.readFileSync(g, 'utf8').trim().replace(/^gitdir:\s*/, '');
    if (fs.existsSync(target)) { notes.push('B1 kept (still registered): ' + p); continue; }
  } else if (fs.existsSync(g)) { notes.push('B1 kept (.git is a directory): ' + p); continue; }
  b1.push(P(p));
}

// B2: registered worktrees, moved whole; `git worktree prune` afterwards drops their registrations.
const b2 = ['b58', 'cursor1', 'zhenti-close180', 'up140'].map(n => P(`${W}\\${n}`));

// B3, B4: .tmp_* untouched for two days in the executor workspaces and in ui-v2's root.
const tmpOld = dir => ls(dir).filter(e => /^\.tmp_/.test(e)).map(e => `${dir}\\${e}`).filter(p => old(p)).map(P);
const b3 = ['fix-r1', 'fix-r5', 'fix-r6', 'fix-r10', 'fix-r11', 'fix-r13'].flatMap(n => tmpOld(`${W}\\${n}`));
const b4 = tmpOld(`${W}\\ui-v2`);

// B5: in past drill dirs, the APKs (one store package kept per shipped version) and Expo export outputs.
const keep = new Set([`${C}\\release_152\\climbmao-1.5.2-vc25-store.apk`, `${C}\\ota_rehearsal_151\\app-151-eas-72b8d5b6-vc19.apk`].map(x => x.toLowerCase()));
const b5 = [];
for (const sub of ['ota_rehearsal_151', 'release_152', 'p1_integ', 'w27_integ', 'w28_drill', 'w29b_drill', 'w31_integ', 'w34fix_collect', 'w35_collect']) {
  const d = `${C}\\${sub}`;
  if (!old(d)) { notes.push('B5 skipped (changed within 2 days): ' + d); continue; }
  for (const e of ls(d)) {
    const p = `${d}\\${e}`;
    if (/\.apk$/i.test(e) && !isDir(p) && !keep.has(p.toLowerCase())) b5.push(P(p));
    if (/^(U\d+-(dist|out)|export\d*)$/i.test(e) && isDir(p)) b5.push(P(p));
  }
}

// C1/C2: byte-identical duplicates; F:\new\登楼知识库 is read by denglou's scripts and never loses a copy.
const dup = JSON.parse(fs.readFileSync(dupFile, 'utf8'));
const protectedRoot = dup.roots[0].toLowerCase() + '\\';
const c12 = dup.groups.flatMap(g => g.remove).filter(p => !p.toLowerCase().startsWith(protectedRoot)).map(P);

// C4: the evaluation audio only; transcripts, results and scripts in the same folder stay.
const c4 = [];
(function walk(d) { for (const e of ls(d)) { const p = `${d}\\${e}`; if (isDir(p)) walk(p); else if (/\.(m4a|wav)$/i.test(e)) c4.push(P(p)); } })(`${W}\\ui-v2\\eval\\distill-w0`);

const items = [
  { n: 1, label: 'A1 .tmp_w35b 里的 verify-*', paths: a1 },
  { n: 2, label: 'A2 有完整文件的下载分段', paths: a2 },
  { n: 3, label: 'A3 本机测试包（留 apk_871cd852）', paths: a3 },
  { n: 4, label: 'A4 climbmao_up 的模拟器快照', paths: a4 },
  { n: 11, label: 'B1 已脱离 git 的目录', paths: b1 },
  { n: 12, label: 'B2 已合入的工作树（移后 prune）', paths: b2 },
  { n: 13, label: 'B3 执行方工作区里两天没动的 .tmp_*', paths: b3 },
  { n: 14, label: 'B4 ui-v2 根目录两天没动的 .tmp_*', paths: b4 },
  { n: 15, label: 'B5 往期演练的 APK 与导出产物', paths: b5 },
  { n: 21, label: 'C1/C2 逐字节重复的资料', paths: c12 },
  { n: 24, label: 'C4 评测音频', paths: c4 },
];
fs.writeFileSync(out, '\uFEFF' + JSON.stringify({ project: 'denglou', quarantine: 'F:\\_water-quarantine-20261102-dl', items }, null, 1));
for (const it of items) console.log(String(it.n).padStart(2), it.label, it.paths.length, 'paths');
for (const n of notes) console.log('  note: ' + n);
