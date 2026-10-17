// Controller-owned gates for G/H/I. Contract checks, not an OS sandbox.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export function setup(allowedIds, modes) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
  assert.equal(args[0], '--task'); assert.equal(args[2], '--mode');
  const id = args[1], mode = args[3], finalGate = args[4] === '--final';
  assert(allowedIds.includes(id) && modes.includes(mode));
  assert.equal(args.length, finalGate ? 5 : 4); assert(!finalGate || !['baseline', 'lock'].includes(mode));
  assert.equal(Number(process.versions.node.split('.')[0]), 24);
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', RUSTUP_AUTO_INSTALL: '0' };
  for (const key of Object.keys(env)) if (/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(key) && key !== 'RUSTUP_AUTO_INSTALL') delete env[key];
  const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid, commands = [];
  let output, seq = 0;
  const command = (binary, argv, timeout = 30000) => {
    const r = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024 });
    const item = { binary, argv, exitCode: r.status, error: r.error?.code ?? null };
    if (output) { item.log = `${stamp}-${mode}-${++seq}.log`; writeFileSync(join(output, item.log), JSON.stringify(item) + '\n--- stdout ---\n' + (r.stdout ?? '') + '\n--- stderr ---\n' + (r.stderr ?? ''), { flag: 'wx' }); }
    commands.push(item);
    if (r.error || r.status !== 0) { process.stderr.write((r.stdout ?? '') + (r.stderr ?? '')); throw new Error('Focused command failed: ' + argv.join(' ')); }
    return binary === 'git' && argv.includes('-z') ? (r.stdout ?? '') : (r.stdout ?? '').trim();
  };
  const git = (argv) => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv]);
  const controller = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  const manifest = JSON.parse(readFileSync(join(controller, 'docs/dispatch/wave1/manifest.json'), 'utf8'));
  const task = manifest.tasks.find((t) => t.id === id); assert(task);
  const same = (a, b) => realpathSync(a).toLowerCase() === realpathSync(b).toLowerCase();
  assert(same(root, task.worktree) && same(root, process.cwd()));
  const within = (base, path) => { const r = relative(realpathSync(base), realpathSync(path)); assert(!r.startsWith('..') && !isAbsolute(r)); };
  within(controller, root);
  const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  const freeze = JSON.parse(readFileSync(join(controller, task.contractLock), 'utf8'));
  const audit = () => {
    assert.equal(git(['branch', '--show-current']), task.branch); git(['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
    for (const f of freeze.files) assert.equal(hash(join(root, f.path)), f.sha256, 'Frozen file changed: ' + f.path);
    for (const p of freeze.inheritedLocks) for (const f of JSON.parse(readFileSync(join(root, p), 'utf8')).files)
      assert.equal(hash(join(root, f.path)), f.sha256, 'Prior frozen file changed: ' + f.path);
    const changed = [git(['diff', '--no-renames', '--name-only', '-z', task.baseCommit, 'HEAD']), git(['diff', '--no-renames', '--name-only', '-z', 'HEAD']), git(['ls-files', '--others', '--exclude-standard', '-z'])].flatMap((v) => v.split('\0').filter(Boolean));
    for (const p of changed) assert(task.allowedFiles.includes(p) || task.allowedPrefixes.some((prefix) => p.startsWith(prefix)), 'Out-of-scope change: ' + p);
  };
  const local = (parts) => {
    let dir = root;
    for (const part of parts.split('/')) { assert(part && !['.', '..'].includes(part)); dir = join(dir, part); if (!existsSync(dir)) mkdirSync(dir); assert(lstatSync(dir).isDirectory() && !lstatSync(dir).isSymbolicLink()); within(root, dir); }
    return dir;
  };
  audit(); const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
  const before = snapshot();
  if (mode === 'baseline') { assert.equal(before.head, task.baseCommit); assert.equal(before.status, ''); assert(!existsSync(join(root, task.outputRoot))); }
  if (finalGate) assert.equal(before.status, '', 'Final gate requires a clean implementation commit');
  output = local('.local/checks/' + id);
  const record = { task: id, mode, finalGate, startedAt: new Date().toISOString(), before, node: process.version, productTestsRun: false, frozenFiles: freeze.files.length, commands };
  const finish = (fault) => {
    try { audit(); record.after = snapshot(); assert.equal(record.after.head, before.head); if (finalGate) assert.equal(record.after.status, ''); }
    catch (err) { fault = fault ? new Error(fault.message + '; post-check: ' + err.message) : err; }
    Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
    const receipt = join(output, `${stamp}-${mode}-result.json`); writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ ...record, commands: commands.length, receipt }, null, 2)); if (fault) process.exitCode = 1;
  };
  return { root, controller, task, mode, finalGate, env, output, stamp, record, command, git, local, same, within, finish };
}
export function copyCache(ctx, home) {
  if (!existsSync(join(home, 'registry'))) {
    const source = resolve(ctx.task.cargoCacheSource); ctx.within(ctx.controller, source);
    assert(lstatSync(source).isDirectory() && !lstatSync(source).isSymbolicLink());
    cpSync(source, join(home, 'registry'), { recursive: true, force: false, errorOnExist: true }); ctx.record.cacheCopiedFrom = source;
  }
}
