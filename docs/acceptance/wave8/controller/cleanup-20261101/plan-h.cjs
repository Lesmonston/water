// Quarantine plan for the agent-session items the user approved on 11-02 ("H4可以清理掉。H5可以清理掉。H6可以清理掉，
// H8可以清理掉"). Session folders go one by one so a folder a running tool holds is skipped, not forced.
// usage: node plan-h.cjs <out plan.json>
const fs = require('fs');
const path = require('path');
const U = 'C:\\Users\\37310';
const subdirs = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => ({ path: path.join(dir, e.name) })) : [];
const items = [
  { n: 4, label: 'H4 Cursor 聊天', paths: subdirs(U + '\\.cursor\\chats') },
  { n: 5, label: 'H5 Grok 各账号目录里的 npm 缓存', paths: [2, 3, 4, 5].map(k => ({ path: `${U}\\.grok${k}\\AppData\\Local\\npm-cache` })).filter(p => fs.existsSync(p.path)) },
  { n: 6, label: 'H6 Grok 会话', paths: ['', 2, 3, 4, 5].flatMap(k => subdirs(k === '' ? U + '\\.grok\\sessions' : `${U}\\.grok${k}\\.grok\\sessions`)) },
  { n: 8, label: 'H8 MiniMax Hub 留下的数据', paths: [{ path: U + '\\AppData\\Roaming\\@hilo' }] },
];
fs.writeFileSync(process.argv[2], '\uFEFF' + JSON.stringify({ drive: 'C', quarantine: 'C:\\_water-quarantine-20261102', items }, null, 1));
for (const it of items) console.log(it.label, it.paths.length, 'paths');
