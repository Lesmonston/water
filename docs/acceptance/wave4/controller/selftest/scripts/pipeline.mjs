// Controller self-test pipeline for one wave 4 stub tree: commit the stub, prove each negative control
// (mutate, red with its token, exact restore, green), run the finals and archive.
// Usage (repo root): node .local/w4-selftest/pipeline.mjs <g1|g2|g3>
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {appendFileSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
const ctl = 'F:/new/smaltalk/water', manifest = ctl + '/.local/w4-selftest/manifest.json';
const plans = {
  g1: {id: 'WATER-W4-SELFTEST-G1B', gate: 'checkup-wave-check.mjs', env: 'WATER_W2_SELFTEST_MANIFEST', finals: ['check', 'test'],
    commit: ['packages/junk-clean/src/lib.rs', 'packages/junk-clean/src/native_windows.rs', 'packages/junk-clean/tests/clean_v1.rs'],
    muts: [
      ['nc1', 'packages/junk-clean/src/native_windows.rs', 'reparse_tag(&current).is_none_or(|tag| tag & 0x2000_0000 == 0)', 'reparse_tag(&current).is_none_or(|tag| tag & 0x2000_0000 == 1)'],
      ['nc2', 'packages/junk-clean/src/lib.rs', '    guard_by_identity(plan, item, &snapshot)?;', '    let _ = guard_by_identity(plan, item, &snapshot);'],
      ['nc3', 'packages/junk-clean/src/native_windows.rs', '        meta.file_attributes() & REPARSE != 0 // NC2', '        meta.file_attributes() & REPARSE != 0 && false // NC2']]},
  g2: {id: 'WATER-W4-SELFTEST-G2', gate: 'desktop-wave-check.mjs', env: 'WATER_W3_OVERRIDE_MANIFEST', finals: ['check', 'test', 'real'],
    commit: ['packages/water-service/src/clean.rs', 'packages/water-service/src/service.rs', 'packages/water-service/src/storage.rs', 'packages/water-service/src/views.rs', 'packages/water-service/tests/service_v1.rs'],
    muts: [
      ['nc1', 'packages/water-service/src/service.rs', 'if task.is_err() && let Ok(mut s)=lock(&guard_core) {', 'if false && task.is_err() && let Ok(mut s)=lock(&guard_core) {'],
      ['nc2', 'packages/water-service/src/clean.rs', '    if !r.fresh {', '    if false && !r.fresh {'],
      ['nc3', 'packages/water-service/src/clean.rs', '    if r.result.status == "partial"', '    if false && r.result.status == "partial"']]},
  g3: {id: 'WATER-W4-SELFTEST-G3', gate: 'checkup-wave-check.mjs', env: 'WATER_W2_SELFTEST_MANIFEST', finals: ['check', 'test', 'browser'],
    commit: ['apps/water/ui/app.mjs', 'apps/water/ui/styles/app.css', 'apps/water/ui/tests/browser.test.mjs'],
    muts: [
      ['nc1', 'apps/water/ui/model.mjs', '  if (!canSelect(group)) { next.delete(id); return next; }', '  if (false) { next.delete(id); return next; }'],
      ['nc2', 'apps/water/ui/styles/app.css', '.side-foot p { margin: 3px 0; text-wrap: balance; }', '.side-foot p { margin: 3px 0; }'],
      ['nc3', 'apps/water/ui/app.mjs', "  if (!state.pollPaused && !state.reconnecting) state.error = '';", '']]}
};
const slot = process.argv[2], plan = plans[slot], tree = ctl + '/.worktrees/w4-selftest-' + slot, log = ctl + '/.local/w4-selftest/' + slot + '-pipeline.txt';
const say = s => { appendFileSync(log, s + '\n'); console.log(s); };
const sha = b => createHash('sha256').update(b).digest('hex');
const git = (...a) => { const r = spawnSync('git', ['-c', 'core.hooksPath=NUL', ...a], {cwd: tree, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}); if (r.status !== 0) throw new Error('git ' + a.join(' ') + ': ' + r.stderr); return r.stdout; };
const gate = (mode, fin) => { const r = spawnSync(process.execPath, [ctl + '/scripts/' + plan.gate, '--task', plan.id, '--mode', mode, ...(fin ? ['--final'] : [])], {cwd: tree, env: {...process.env, [plan.env]: manifest}, encoding: 'utf8', windowsHide: true, timeout: 1800000}); const line = (r.stdout ?? '').trim().split('\n').at(-1); say(slot + ' ' + mode + (fin ? ' --final' : '') + ' rc=' + r.status + ' ' + line); return r.status; };
// A rerun finds the stub already committed; the committed bytes (CRLF on checkout) are what the gate hashes.
if (git('status', '--porcelain', '--', ...plan.commit).trim()) {
  git('add', '--', ...plan.commit);
  git('-c', 'user.name=Riku Toto', '-c', 'user.email=usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai', 'commit', '-q', '-m', 'Self-test stub for wave 4 ' + slot + ' (controller only, never merged)');
}
say(slot + ' stub committed ' + git('rev-parse', 'HEAD').trim() + '; status "' + git('status', '--porcelain').trim() + '"');
for (const [label, file, old, neu] of plan.muts) {
  const p = join(tree, file), src = readFileSync(p, 'utf8'), before = sha(readFileSync(p)); if (src.split(old).length !== 2) { say(slot + ' ' + label + ' ANCHOR NOT UNIQUE'); process.exit(1); }
  writeFileSync(p, src.replace(old, neu));
  const red = gate('red-' + label, false);
  git('checkout', '--', file); const ok = sha(readFileSync(p)) === before;
  say(slot + ' ' + label + ' red rc=' + red + ' restored exact=' + ok);
  if (red !== 0 || !ok || gate('test', false) !== 0) process.exit(1);
}
for (const m of plan.finals) if (gate(m, true) !== 0) process.exit(1);
gate('archive', false);
say(slot + ' done; status "' + git('status', '--porcelain').trim() + '"');
