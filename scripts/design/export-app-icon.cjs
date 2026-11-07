// Export an app icon SVG to a multi-size ICO next to it.
// Usage (repo root): node scripts/design/export-app-icon.cjs [<brand folder> <name>]
// Defaults to the Water icon (water-ui-v1 DESIGN §10); Flick (2026-11-07): docs/design/flick-brand flick-app-icon.
// Local headless Chrome rasterises the SVG on a transparent canvas at each size (no network, no
// downloads); the PNGs are packed into one ICO with PNG-compressed entries, smallest first.
const fs = require('fs'), path = require('path'), {spawnSync} = require('child_process');
const brand = process.argv[2] ?? 'docs/design/water-ui-v1/brand', name = process.argv[3] ?? 'water-app-icon';
const sizes = [16, 24, 32, 48, 256];
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
if (!chrome) throw new Error('no local Chrome or Edge');
const tmp = path.resolve('.local/design-icon-export');
fs.mkdirSync(tmp, {recursive: true});
const svg = fs.readFileSync(path.join(brand, name + '.svg'));
const page = `<!doctype html><meta charset="utf-8"><pre id="out"></pre><script>
const img = new Image();
img.onload = () => {
  const out = [];
  for (const s of ${JSON.stringify(sizes)}) {
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    c.getContext('2d').drawImage(img, 0, 0, s, s);
    out.push(s + ':' + c.toDataURL('image/png').split(',')[1]);
  }
  document.getElementById('out').textContent = 'ICONS\\n' + out.join('\\n') + '\\nEND';
};
img.src = 'data:image/svg+xml;base64,${svg.toString('base64')}';
</script>`;
fs.writeFileSync(path.join(tmp, 'export.html'), page);
const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--user-data-dir=' + path.join(tmp, 'profile'), '--virtual-time-budget=5000', '--dump-dom', 'file:///' + path.join(tmp, 'export.html').replaceAll('\\', '/')], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000});
const m = /ICONS\r?\n([\s\S]*?)\r?\nEND/.exec(r.stdout ?? '');
if (!m) throw new Error('Chrome produced no icons: ' + (r.stderr ?? '').slice(0, 400));
const pngs = m[1].split(/\r?\n/).map(l => { const [s, b] = l.split(':'); return {size: Number(s), data: Buffer.from(b, 'base64')}; });
for (const p of pngs) fs.writeFileSync(path.join(tmp, `icon-${p.size}.png`), p.data);
// ICONDIR (6 bytes) + one ICONDIRENTRY (16 bytes) per image + PNG payloads. Width/height 0 means 256.
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
let offset = head.length;
pngs.forEach((p, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(p.size >= 256 ? 0 : p.size, e); head.writeUInt8(p.size >= 256 ? 0 : p.size, e + 1);
  head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(p.data.length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += p.data.length;
});
const ico = Buffer.concat([head, ...pngs.map(p => p.data)]);
fs.writeFileSync(path.join(brand, name + '.ico'), ico);
console.log(`${name}.ico:${pngs.map(p => p.size + 'px ' + p.data.length + 'B').join(', ')}; ${ico.length} bytes; PNGs in ${tmp}`);
