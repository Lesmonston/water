// Gates before a quarantine move, and the check before a quarantine is handed to the user (11-02 denglou receipt §3,
// insights 32, 34-36). Read-only: names, attributes and link targets only, no file is opened.
//   node precheck-plan.cjs --plan <plan.json> --roots <dir>[,<dir>...]
//     IN    a link outside the candidates whose target lies inside one (grok2 case), with the final target to repoint to
//     KEEP  names inside a candidate that look like keys, certificates, secrets or local databases (yb-release case)
//     NAME  reserved device names, or names ending in a dot or space, inside a candidate (deleting needs \\?\)
//     LINK  links inside a candidate; they move along and must be removed inside the quarantine before handover
//   node precheck-plan.cjs --handover <quarantine dir>
//     LINK and NAME inside the quarantine, then the delete command for the user
// Real node_modules and .git directories are not entered when scanning --roots or for KEEP (links in them are missed).
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ns = p => path.toNamespacedPath(p);
const plain = p => p.replace(/^\\\\\?\\/, '');
const key = p => plain(p).replace(/[\\/]+$/, '').toLowerCase();
const within = (p, c) => { const a = key(p), b = key(c); return a === b || a.startsWith(b + '\\'); };

const KEEP = /\.(jks|keystore|p12|pfx|p8|pem|key|mobileprovision|db|sqlite|sqlite3)$|^\.env($|\.)|^credentials|^google-services\.json$|^GoogleService-Info\.plist$/i;
const DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const badName = n => DEVICE.test(n.split('.')[0]) || /[. ]$/.test(n);

function list(d) { try { return fs.readdirSync(ns(d), { withFileTypes: true }); } catch { return null; } }
function target(p) { try { return path.resolve(path.dirname(p), plain(fs.readlinkSync(ns(p)))); } catch { return ''; } }
function finalOf(p) { try { return plain(fs.realpathSync.native(ns(p))); } catch { return '(does not resolve)'; } }

// Walk one candidate or quarantine tree without following links.
function inspect(root, { enterDeps, onLink, onKeep, onName }) {
  (function walk(d) {
    const es = list(d);
    if (!es) return;
    for (const e of es) {
      const p = path.join(d, e.name);
      if (badName(e.name)) onName(p);
      if (e.isSymbolicLink()) { onLink(p, target(p)); continue; }
      if (e.isDirectory()) { if (enterDeps || (e.name !== 'node_modules' && e.name !== '.git')) walk(p); continue; }
      if (KEEP.test(e.name)) onKeep(p);
    }
  })(root);
}

const handover = opt('--handover');
if (handover) {
  let links = 0, names = 0;
  inspect(handover, {
    enterDeps: true,
    onLink: (p, t) => { links++; console.log('LINK', p, '->', t); },
    onKeep: () => { },
    onName: p => { names++; console.log('NAME', p); },
  });
  console.log(`links ${links}, reserved or trailing names ${names}`);
  if (links) console.log('Remove the links first (non-recursive delete of each link itself), then hand over.');
  else console.log(`Delete command for the user: cmd /c 'rd /s /q "\\\\?\\${plain(path.resolve(handover))}"'`);
  process.exit(0);
}

const planFile = opt('--plan');
const roots = (opt('--roots') || '').split(',').filter(Boolean);
if (!planFile || !roots.length) { console.error('usage: --plan <plan.json> --roots <dir>[,<dir>...] | --handover <dir>'); process.exit(2); }
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8').replace(/^\uFEFF/, ''));
const cands = plan.items.flatMap(it => it.paths.map(x => ({ n: it.n, path: x.path })))
  .filter(c => fs.existsSync(ns(c.path)));
const owner = p => cands.find(c => within(p, c.path));
const count = { IN: 0, KEEP: 0, NAME: 0, LINK: 0 };

for (const c of cands) {
  let st; try { st = fs.lstatSync(ns(c.path)); } catch { continue; }
  if (!st.isDirectory() || st.isSymbolicLink()) {
    if (badName(path.basename(c.path))) { count.NAME++; console.log('NAME', `[${c.n}]`, c.path); }
    if (!st.isDirectory() && KEEP.test(path.basename(c.path))) { count.KEEP++; console.log('KEEP', `[${c.n}]`, c.path); }
    continue;
  }
  inspect(c.path, {
    enterDeps: false,
    onLink: (p, t) => { count.LINK++; console.log('LINK', `[${c.n}]`, p, '->', t); },
    onKeep: p => { count.KEEP++; console.log('KEEP', `[${c.n}]`, p); },
    onName: p => { count.NAME++; console.log('NAME', `[${c.n}]`, p); },
  });
}

let seen = 0;
for (const root of roots) (function walk(d) {
  if (owner(d)) return; // links inside candidates are reported as LINK above
  const es = list(d);
  if (!es) return;
  for (const e of es) {
    const p = path.join(d, e.name);
    if (e.isSymbolicLink()) {
      seen++;
      if (owner(p)) continue;
      const t = target(p);
      const c = t && owner(t);
      if (!c) continue;
      const f = finalOf(p);
      count.IN++;
      console.log('IN', `[${c.n}]`, p, '->', t, '| final', f, owner(f) ? '| final target is also a candidate: moving breaks it' : '| repoint to the final target before moving');
      continue;
    }
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') walk(p);
  }
})(root);

console.log(`candidates ${cands.length}, links seen under roots ${seen};`, Object.entries(count).map(([k, v]) => `${k} ${v}`).join(', '));
