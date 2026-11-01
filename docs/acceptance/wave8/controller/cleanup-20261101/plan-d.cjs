// D-drive quarantine plan for the items the user approved on 11-02 ("D盘清理D1-D8,D10"). D9 (the old Claude
// config folder) was not chosen, so nothing under it is planned. usage: node plan-d.cjs <deep-D.json> <out plan.json>
const fs = require('fs');
const [deepFile, out] = process.argv.slice(2);
const deep = JSON.parse(fs.readFileSync(deepFile, 'utf8'));
const notD9 = p => !p.toLowerCase().startsWith('d:\\claude-config\\');
const junk = (kind, prefix = '') => deep.junk.filter(j => j.kind === kind && j.path.toLowerCase().startsWith(prefix.toLowerCase()) && notD9(j.path)).map(j => ({ path: j.path, bytes: j.bytes }));
const p = path => ({ path });
const items = [
  { n: 1, label: 'D1 Python 缓存', paths: junk('python-cache') },
  { n: 2, label: 'D2 夸克视频缓存（稀疏文件）', paths: [p('D:\\ProgramData\\Quark\\videoCache')] },
  { n: 3, label: 'D3 QQ 没装上的更新包', paths: [p('D:\\qq\\versions\\9.9.33-51802.zip')] },
  { n: 4, label: 'D4 夸克旧版本 7.1.0.949', paths: [p('D:\\quark\\7.1.0.949')] },
  { n: 5, label: 'D5 企业微信内置网页缓存', paths: junk('cache', 'D:\\11\\wecom\\') },
  { n: 6, label: 'D6 Steam 日志', paths: [p('D:\\steam\\logs')] },
  { n: 7, label: 'D7 RX 11 安装包与解压出的安装程序', paths: [p('D:\\RX11\\iZotope.RX.11.Audio.Editor.Advanced.v11.0.0-R.rar'), p('D:\\RX11\\臭氧 iZotope.RX.11.Audio.Editor.Advanced.v11.0.0-R')] },
  { n: 8, label: 'D8 Audition 2024 安装包', paths: [p('D:\\AU\\Au2024(64bit).rar'), p('D:\\AU\\products\\AUDT\\AdobeAudition24All.zip')] },
  { n: 10, label: 'D10 两份 8-20 的 Claude 备份', paths: [p('D:\\claude-full-backup-20260820'), p('D:\\claude-desktop-backup-20260820')] },
];
fs.writeFileSync(out, '\uFEFF' + JSON.stringify({ drive: 'D', quarantine: 'D:\\_water-quarantine-20261102', items }, null, 1));
for (const it of items) { console.log(it.label, it.paths.length, 'paths'); if (it.paths.length <= 5) for (const x of it.paths) console.log('    ', x.path); }
