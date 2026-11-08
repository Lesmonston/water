// Every file in the public first commit must be byte-identical to its source blob in the private commit
// (packaging/public/root/<path> first, as the export overlays it, then <path>).
import {execFileSync} from 'node:child_process';

const [pubRepo, privRev] = process.argv.slice(2);
const tree = (args, cwd) => new Map(execFileSync('git', args, {cwd, encoding: 'utf8', maxBuffer: 64 << 20}).split('\0').filter(Boolean)
  .map(l => { const [meta, path] = l.split('\t'); return [path, meta.split(' ')]; }));
const pub = tree(['ls-tree', '-r', '-z', 'HEAD'], pubRepo);
const priv = tree(['ls-tree', '-r', '-z', privRev], process.cwd());
let ok = 0; const bad = [];
for (const [path, [mode, , oid]] of pub) {
  const src = priv.get('packaging/public/root/' + path) ?? priv.get(path);
  if (src && src[2] === oid && src[0] === mode) ok++; else bad.push(`${path}: public ${mode} ${oid}, private ${src ? src.join(' ') : 'missing'}`);
}
console.log(`identical ${ok}/${pub.size}`);
for (const b of bad) console.log('  DIFF ' + b);
process.exit(bad.length ? 1 : 0);
