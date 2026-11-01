// Build the C-drive quarantine plan for the items the user approved on 11-01 ("先清1-21"): only the
// items marked 隔离 in the graded table. Sizes come from the deep survey where it has them.
// usage: node plan-c.cjs <deep-C.json> <out plan.json>
const fs = require('fs');
const path = require('path');
const [deepFile, out] = process.argv.slice(2);
const deep = JSON.parse(fs.readFileSync(deepFile, 'utf8'));
const has = (p, frags) => frags.every(f => p.toLowerCase().includes(f.toLowerCase()));
const junk = frags => deep.junk.filter(j => has(j.path, frags)).map(j => ({ path: j.path, bytes: j.bytes }));
const dirSize = p => { const d = deep.dirs.find(x => x.path.toLowerCase() === p.toLowerCase()); return d ? d.bytes : null; };
const children = (dir, re) => fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory() && re.test(e.name)).map(e => ({ path: path.join(dir, e.name), bytes: null }));
const U = 'C:\\Users\\37310';
const items = [
  { n: 3, label: 'Codex 插件市场升级残留', paths: children(U + '\\.codex2\\.tmp\\marketplaces\\.staging', /^marketplace-upgrade-/) },
  { n: 7, label: '微信开发者工具各分区网页缓存', paths: junk(['\\微信开发者工具\\partitions\\']) },
  { n: 8, label: 'Codex 运行时旧安装', paths: ['codex-runtime-install-FxVrqw', 'codex-runtime-install-IvmZxM', 'codex-runtime-install-GyoUZS', 'codex-runtime-install-23NjYQ', 'codex-primary-runtime.previous-c3cff618-79a8-47e0-9fcf-91cdd9053749'].map(n => ({ path: U + '\\.cache\\codex-runtimes\\' + n, bytes: null })) },
  { n: 13, label: '其它应用缓存（Steam、WeGame、QQ、MiniMax Hub、剪映）', paths: [...junk(['appdata\\local\\steam\\htmlcache']), ...junk(['tencent\\wegame']), ...junk(['roaming\\qq\\partitions']), ...junk(['\\@hilo\\']).filter(p => !/node_modules/i.test(p.path)), ...junk(['jianyingpro\\user data\\c'])] },
  { n: 14, label: '剪映旧更新包', paths: [{ path: U + '\\AppData\\Local\\JianyingPro\\User Data\\Download\\update.exe', bytes: null }] },
  { n: 15, label: 'Jest 转换缓存', paths: [{ path: 'C:\\Windows\\Temp\\jest', bytes: dirSize('C:\\Windows\\Temp\\jest') }] },
  { n: 16, label: 'npm 下载缓存（只移 _cacache）', paths: [{ path: U + '\\AppData\\Local\\npm-cache\\_cacache', bytes: null }] },
  { n: 17, label: 'Mirasim 10-09 备份', paths: [{ path: U + '\\.mirasim.bak-20261009', bytes: dirSize(U + '\\.mirasim.bak-20261009') }, { path: U + '\\AppData\\Roaming\\@mirasim\\desktop.bak-20261009', bytes: dirSize(U + '\\AppData\\Roaming\\@mirasim\\desktop.bak-20261009') }] },
  { n: 18, label: 'C:\\tmp 测试浏览器目录', paths: children('C:\\tmp', /^chrome_/) },
  { n: 21, label: 'Ubisoft 补丁暂存', paths: [{ path: 'C:\\ProgramData\\Ubisoft\\Ubisoft Game Launcher\\patch', bytes: dirSize('C:\\ProgramData\\Ubisoft\\Ubisoft Game Launcher\\patch') }] },
];
fs.writeFileSync(out, '\uFEFF' + JSON.stringify({ drive: 'C', quarantine: 'C:\\_water-quarantine-20261101', items }, null, 1));
for (const it of items) {
  const known = it.paths.reduce((s, p) => s + (p.bytes || 0), 0);
  console.log(`#${it.n} ${it.label}: ${it.paths.length} paths, surveyed ${(known / 1e9).toFixed(2)} GB`);
  for (const p of it.paths.slice(0, it.paths.length > 12 ? 6 : 12)) console.log('    ', p.path, p.bytes ? (p.bytes / 1e9).toFixed(3) : '');
  if (it.paths.length > 12) console.log('     ...');
}
