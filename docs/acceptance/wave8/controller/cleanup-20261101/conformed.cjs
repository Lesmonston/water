// For each Audition project folder: list Conformed Files, whether the main session (not Backup) references
// them, and whether a source with the same base name (without " 48000 N") exists anywhere under E:\Podcast.
// Also prints the duplicate pairs with their modification times. Read-only.
// usage: node conformed.cjs <dup.json>
const fs = require('fs');
const path = require('path');
const root = 'E:\\Podcast';
const all = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else all.push(p); } })(root);
for (const proj of ['E:\\Podcast\\团2\\未命名混音项目 1', 'E:\\Podcast\\团三\\未命名混音项目 2']) {
  const sesx = fs.readFileSync(path.join(proj, path.basename(proj) + '.sesx'), 'utf8').toLowerCase();
  const backups = fs.readdirSync(path.join(proj, 'Backup')).filter(f => f.endsWith('.sesx')).map(f => fs.readFileSync(path.join(proj, 'Backup', f), 'utf8').toLowerCase());
  console.log('==', proj);
  for (const f of fs.readdirSync(path.join(proj, 'Conformed Files'))) {
    const p = path.join(proj, 'Conformed Files', f), size = fs.statSync(p).size;
    const base = f.replace(/ \d+ \d+\.wav$/i, '').toLowerCase();
    const sources = all.filter(a => path.basename(a).toLowerCase().startsWith(base) && !a.includes('Conformed Files'));
    console.log(`   ${(size / 1073741824).toFixed(2)} GB ${f} | main session: ${sesx.includes(f.toLowerCase()) ? 'YES' : 'no'} | backups: ${backups.filter(b => b.includes(f.toLowerCase())).length}/${backups.length} | sources: ${sources.map(s => s.replace(root + '\\', '')).join(', ') || 'NONE'}`);
  }
}
const dup = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const g of dup.list) console.log('dup', (g.size / 1073741824).toFixed(2), g.files.map(f => f.path.replace(root + '\\', '') + ' @' + f.mtime.slice(0, 16)).join('  ||  '));
