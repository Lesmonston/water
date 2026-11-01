// F-drive quarantine plan, part 1 (F4-F10) for "F1到F10" (user, 11-02). F1 is cleaned by the user in Water and
// F2/F3 (whole Water worktrees) are planned after it. F:\tmp entries count as old only when both their newest
// modification and their creation time are before the cutoff (extracted archives keep ancient mtimes).
// usage: node plan-f.cjs <out plan.json>
const fs = require('fs');
const path = require('path');
const cutoff = Date.parse('2026-10-02T00:00:00Z');
function newest(p) {
  let st; try { st = fs.lstatSync(p); } catch { return 0; }
  let t = Math.max(st.mtimeMs, st.birthtimeMs);
  if (st.isDirectory() && !st.isSymbolicLink()) {
    let entries = []; try { entries = fs.readdirSync(p); } catch { }
    for (const e of entries) t = Math.max(t, newest(path.join(p, e)));
  }
  return t;
}
const p = x => ({ path: x });
const tmp = fs.readdirSync('F:\\tmp').map(e => ({ path: 'F:\\tmp\\' + e, t: newest('F:\\tmp\\' + e) }));
const oldTmp = tmp.filter(e => e.t < cutoff);
const cTemp = 'F:\\c\\Users\\37310\\AppData\\Local\\Temp';
const items = [
  { n: 4, label: 'F4 Keeper 三棵工作树的 Rust 构建产物', paths: ['keeper-ide-b3-ui', 'keeper-ide-b3-path', 'keeper-ide-b3-contract'].map(t => p(`F:\\new\\VaultSystem\\worktrees\\${t}\\target`)) },
  { n: 5, label: 'F5 pillow 的 Rust 构建产物', paths: [p('F:\\new\\pillow\\target')] },
  { n: 6, label: 'F6 bug-arena 的 Rust 构建产物', paths: [p('F:\\new\\smaltalk\\bug-arena\\src-tauri\\target')] },
  { n: 7, label: 'F7 zbbody 的 node_modules', paths: [p('F:\\new\\zbbody\\node_modules')] },
  { n: 8, label: 'F8 F:\\tmp 里 10-02 以前的条目', paths: oldTmp.map(e => p(e.path)) },
  { n: 9, label: 'F9 F:\\c 里的 pgtest 测试临时目录', paths: fs.readdirSync(cTemp).filter(e => /^pgtest-/.test(e)).map(e => p(cTemp + '\\' + e)) },
  { n: 10, label: 'F10 英雄联盟游戏日志', paths: [p('F:\\WeGameApps\\lol\\Game\\Logs')] },
];
fs.writeFileSync(process.argv[2], '\uFEFF' + JSON.stringify({ drive: 'F', quarantine: 'F:\\_water-quarantine-20261102', items }, null, 1));
for (const it of items) console.log(it.label, it.paths.length, 'paths');
console.log('F:\\tmp entries', tmp.length, 'old', oldTmp.length, 'kept (recent):', tmp.filter(e => e.t >= cutoff).map(e => path.basename(e.path)).join(', ').slice(0, 600));
