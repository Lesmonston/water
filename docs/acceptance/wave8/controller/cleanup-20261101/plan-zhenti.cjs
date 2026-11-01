// After archive-zhenti.py: list for quarantine only the _review\zhenti subfolders whose zips all verified, and write
// the index ARCHIVED-20261102.md that stays where the folders were (the content worktree's import records cite
// these paths as provenance). usage: node plan-zhenti.cjs <archive report.json> <out plan.json> <index.md>
const fs = require('fs');
const path = require('path');
const [reportFile, out, index] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const bySub = new Map();
for (const z of r.results) {
  const sub = path.relative(r.src, z.sources[0]).split(path.sep)[0];
  (bySub.get(sub) || bySub.set(sub, []).get(sub)).push(z);
}
const ok = [...bySub].filter(([, zs]) => zs.every(z => z.ok));
const bad = [...bySub].filter(([, zs]) => !zs.every(z => z.ok)).map(([s]) => s);
fs.writeFileSync(out, '\uFEFF' + JSON.stringify({ project: 'denglou', quarantine: 'F:\\_water-quarantine-20261102-dl', items: [{ n: 23, label: 'C3 已压缩归档并核对的 _review\\zhenti 子目录', paths: ok.map(([s]) => ({ path: path.join(r.src, s) })) }] }, null, 1));
const G = n => (n / 1073741824).toFixed(2);
const rows = ok.map(([s, zs]) => `| \`${s}\` | ${zs.map(z => '`' + path.basename(z.zip) + '`').join('、')} | ${zs.reduce((a, z) => a + z.files, 0)} | ${G(zs.reduce((a, z) => a + z.src_bytes, 0))} | ${G(zs.reduce((a, z) => a + z.zip_bytes, 0))} |`);
fs.writeFileSync(index, [
  '# 已压缩归档（2026-11-02）',
  '',
  '用户 11-02 选择把 `_review\\zhenti` 压缩归档（“C3压缩归档”），由 Water 总控执行。下列子目录已打成 zip，放在 `F:\\new\\denglou\\_review\\zhenti-archive-20261102\\`；包内路径保持原样（例如 `recheck/…`），解压到 `_review\\zhenti\\` 即恢复原位置。每个 zip 都重新打开核对过文件名、大小与校验码。原目录已移到 `F:\\_water-quarantine-20261102-dl\\23\\`，由用户核对后删除。本目录顶层的台账文件没有动。',
  '',
  '`content` 工作树的导入记录（`src/data/seed/_sources/ZHENTI_IMPORT_*.json`）与 `_work/zhenti/v224/delivery/_dedup200/CROSS-DISPOSITIONS.json` 里写的 `_review/zhenti/…` 出处，都在下表的包里。',
  '',
  '| 原子目录 | 归档包 | 文件数 | 原大小 GB | 压缩后 GB |',
  '|---|---|---:|---:|---:|',
  ...rows,
  '',
].join('\n'));
console.log('subfolders verified', ok.length, 'not verified', bad.length, bad.join(', '));
