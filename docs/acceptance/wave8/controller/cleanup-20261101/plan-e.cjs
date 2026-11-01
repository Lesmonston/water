// E-drive quarantine plan for "E1-E5都清理" (user, 11-02). E1 is narrowed to what the Audition sessions do not
// use: conformed copies referenced by no session (main or Backup) and all .pkf peak files; the five conformed
// copies the main sessions use stay. E4 moves one copy of each byte-identical pair (see the rule below).
// usage: node plan-e.cjs <out plan.json>
const fs = require('fs');
const path = require('path');
const P = 'E:\\Podcast';
const p = x => ({ path: x });
const pkf = dir => fs.readdirSync(dir).filter(f => /\.pkf$/i.test(f)).map(f => p(path.join(dir, f)));
const c1 = P + '\\团2\\未命名混音项目 1\\Conformed Files', c2 = P + '\\团三\\未命名混音项目 2\\Conformed Files';
const nf = 'E:\\新建文件夹';
const items = [
  { n: 1, label: 'E1 Audition 未被工程引用的转换副本与波形缓存', paths: [p(c2 + '\\clyde02 48000 1.wav'), p(c2 + '\\clyde02 48000 2.wav'), ...pkf(c1), ...pkf(c2)] },
  { n: 2, label: 'E2 新建文件夹里的旧安装包与没下完的 .temp', paths: [
    ...['WorkBuddy-win32-x64-user-5.1.0.30796966-e4d0d850.exe', 'CC-Switch-v3.16.4-Windows.msi', 'CC-Switch-v3.16.4-Windows-arm64.msi', 'marvis_e22b6312c22eaa9d.exe', 'marvis_e22b6312c22eaa9d (1).exe'].map(f => p(nf + '\\' + f)),
    ...fs.readdirSync(nf).filter(f => /\.temp$/i.test(f)).map(f => p(nf + '\\' + f))] },
  { n: 3, label: 'E3 10 月初的恢复材料', paths: [p('E:\\recover')] },
  // Keep: the copy a session imported under the same name, else the older original, else the raw recording
  // in the 团 folder; move the other copy.
  { n: 4, label: 'E4 逐字节相同的音频副本（每组移一份）', paths: [
    p(P + '\\团2\\小崔.wav'),
    p(P + '\\团2\\降噪\\公路物语EP03.wav\\公路物语EP03.wav'),
    p(P + '\\团2\\降噪\\EP02.wav\\EP02.wav'),
    p(P + '\\团2\\降噪\\水枪靶场跑团01-剧情2.wav'),
    p(P + '\\团4\\小明4.m4a'),
    p(P + '\\团4\\小明3.m4a')] },
  { n: 5, label: 'E5 两个工程打包 zip', paths: [p(P + '\\团三\\tyx_version.zip'), p(P + '\\团三\\未命名混音项目 2.zip')] },
];
fs.writeFileSync(process.argv[2], '\uFEFF' + JSON.stringify({ drive: 'E', quarantine: 'E:\\_water-quarantine-20261102', items }, null, 1));
for (const it of items) { console.log(it.label, it.paths.length); for (const x of it.paths) console.log('    ', x.path, fs.existsSync(x.path) ? '' : 'MISSING'); }
