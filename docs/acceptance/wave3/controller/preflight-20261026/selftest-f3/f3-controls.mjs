// Self-test negative controls for the F3 gate path: mutate one line, gate red, exact restore, green.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, appendFileSync} from 'node:fs';
import {join} from 'node:path';
const ctl = 'F:/new/smaltalk/water', tree = ctl + '/.worktrees/w3-selftest-f3', id = 'WATER-W3-SELFTEST-F3', log = ctl + '/.local/w3-selftest/f3-controls.txt';
const env = {...process.env, WATER_W3_OVERRIDE_MANIFEST: ctl + '/.local/w3-selftest/manifest.json'};
const say = s => { appendFileSync(log, s + '\n'); console.log(s); };
const sha = b => createHash('sha256').update(b).digest('hex');
const gate = mode => { const r = spawnSync(process.execPath, [ctl + '/scripts/desktop-wave-check.mjs', '--task', id, '--mode', mode], {cwd: tree, env, encoding: 'utf8', windowsHide: true, timeout: 1800000}); const line = r.stdout.trim().split('\n').at(-1); say(mode + ' rc=' + r.status + ' ' + line.slice(0, 260)); return r.status; };
const muts = [
  {mode: 'red-nc1', file: 'apps/water/host/src/wiring.rs', old: 'pub const CLEAN_ENABLED: bool = false;', new: 'pub const CLEAN_ENABLED: bool = true;'},
  {mode: 'red-nc2', file: 'apps/water/host/src/wiring.rs', old: '        .share_mode(0)', new: '        .share_mode(3)'},
  {mode: 'red-nc3', file: 'apps/water/host/src/lib.rs', old: '            commands::trends,\n', new: ''},
  {mode: 'check', expectFail: 'Tauri setup is not allowed', file: 'apps/water/host/src/lib.rs', old: '    let app = tauri::Builder::default()\n', new: '    let app = tauri::Builder::default()\n        .setup(|_| Ok(()))\n'}
];
for (const m of muts) {
  const p = join(tree, m.file), src = readFileSync(p, 'utf8'); if (src.split(m.old).length !== 2) { say('ANCHOR ' + m.mode); process.exit(1); }
  const before = sha(Buffer.from(src)); writeFileSync(p, src.replace(m.old, m.new));
  const rc = gate(m.mode);
  if (m.expectFail) { const last = readFileSync(log, 'utf8').trim().split('\n').at(-1); say('expected failure seen=' + (rc !== 0 && last.includes(m.expectFail))); }
  spawnSync('git', ['-c', 'core.hooksPath=NUL', 'checkout', '--', m.file], {cwd: tree});
  const after = sha(readFileSync(p)); say(m.mode + ' restored=' + (after === before));
  if (after !== before) process.exit(1);
  if (gate('test') !== 0) process.exit(1);
}
