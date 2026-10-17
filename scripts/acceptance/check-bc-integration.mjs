// Controller-owned local integration gate; no installer, cleanup or real user scan.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--expected-head');
const expected = process.argv[3]; assert.match(expected, /^[a-f0-9]{40}$/);
assert.equal(Number(process.versions.node.split('.')[0]), 24);
assert.equal(realpathSync(process.cwd()).toLowerCase(), realpathSync(root).toLowerCase());
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
function localDirectory(path) {
  let current = root;
  for (const part of path.split('/')) {
    assert(part && !['.', '..'].includes(part)); current = join(current, part);
    if (!existsSync(current)) mkdirSync(current);
    assert(lstatSync(current).isDirectory() && !lstatSync(current).isSymbolicLink());
    const rel = relative(realpathSync(root), realpathSync(current));
    assert(!rel.startsWith('..') && !isAbsolute(rel));
  }
  return current;
}
const output = localDirectory('.local/checks/controller-bc-integration');
const record = { startedAt: new Date().toISOString(), root, expectedHead: expected, node: process.version,
  commands: [], productTrees: [], independentBoundaries: [] };
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
function command(binary, argv, timeout = 30000) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 });
  const entry = { binary, argv, cwd: root, startedAt, endedAt: new Date().toISOString(),
    exitCode: result.status, error: result.error?.code ?? null, signal: result.signal };
  const log = stamp + '-' + record.commands.length + '.log'; entry.log = log;
  writeFileSync(join(output, log), JSON.stringify(entry) + '\n--- stdout ---\n' + (result.stdout ?? '') + '\n--- stderr ---\n' + (result.stderr ?? ''), { flag: 'wx' });
  record.commands.push(entry);
  if (result.error || result.status !== 0) throw new Error('Command failed: ' + argv.join(' ') + ' (exit ' + result.status + ')');
  return result.stdout;
}
const git = (argv) => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...argv]).trim();
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain', '--untracked-files=all']) });
const readJSON = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const manifest = readJSON('docs/dispatch/wave1/manifest.json');
const tasks = ['B', 'C'].map((lane) => manifest.tasks.find((task) => task.id === 'WATER-W1-' + lane));
let fault;
try {
  assert(git(['branch', '--show-current']).startsWith('controller/water-w1-bc-'));
  const controllerRoot = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  const rel = relative(realpathSync(controllerRoot), realpathSync(root));
  assert(rel && !rel.startsWith('..') && !isAbsolute(rel), 'Integration worktree must be inside Water');
  record.before = snapshot(); assert.equal(record.before.head, expected); assert.equal(record.before.status, '');
  for (const task of tasks) {
    assert(task.acceptedCommit && task.status === 'ACCEPTED');
    git(['merge-base', '--is-ancestor', task.acceptedCommit, 'HEAD']);
    const acceptedTree = git(['rev-parse', task.acceptedCommit + ':' + task.outputRoot]);
    const integratedTree = git(['rev-parse', 'HEAD:' + task.outputRoot]);
    assert.equal(integratedTree, acceptedTree, 'Product differs from accepted submission');
    record.productTrees.push({ task: task.id, acceptedCommit: task.acceptedCommit, path: task.outputRoot, tree: integratedTree });
  }
  const frozen = new Map();
  for (const path of [manifest.contractLock, ...tasks.map((task) => task.contractLock)])
    for (const file of readJSON(path).files) { assert.equal(sha(join(root, file.path)), file.sha256); frozen.set(file.path, file.sha256); }
  record.frozenFileCount = frozen.size;
  for (const task of tasks) for (const path of task.syntaxFiles) command(process.execPath, ['--check', path]);
  for (const [task, file, names] of [
    [tasks[0], tasks[0].testFile, tasks[0].expectedTests],
    [tasks[1], tasks[1].testFile, tasks[1].expectedTests],
    [tasks[1], tasks[1].browserTestFile, tasks[1].expectedBrowserTests],
  ]) {
    const text = command(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', file], file === tasks[1].browserTestFile ? 90000 : 30000);
    const actual = [...text.matchAll(/^# Subtest: (.+)\r?$/gm)].map((match) => match[1].trim()).sort();
    assert.deepEqual(actual, [...names].sort());
    for (const [key, value] of [['tests', names.length], ['pass', names.length], ['fail', 0], ['skipped', 0], ['todo', 0], ['cancelled', 0]])
      assert(new RegExp('^# ' + key + ' ' + value + '\\r?$', 'm').test(text), task.id + ': unexpected ' + key);
  }
  const { validateCatalog } = await import(pathToFileURL(join(root, 'packages/tool-catalog/validate.mjs')));
  const index = readJSON('packages/tool-catalog/index.json');
  const entries = Object.fromEntries(index.tools.map((tool) => [tool, readJSON('packages/tool-catalog/entries/' + tool + '.json')]));
  assert.deepEqual(validateCatalog(index, entries), { valid: true, errors: [] });
  record.independentBoundaries.push({ id: 'valid_catalog', passed: true });
  for (const kind of ['source_refs', 'fixed_tool_order']) {
    const data = structuredClone({ index, entries }); let calls = 0;
    if (kind === 'source_refs') {
      data.entries.pip.assets[0].source_ids = ['missing-controller-source'];
      Object.setPrototypeOf(data.entries.pip.assets[0].source_ids,
        Object.create(Array.prototype, { forEach: { value() { calls++; } } }));
    } else {
      data.index.tools.reverse();
      Object.setPrototypeOf(data.index.tools,
        Object.create(Array.prototype, { some: { value() { calls++; return false; } } }));
    }
    const result = validateCatalog(data.index, data.entries); assert.equal(result.valid, false); assert.equal(calls, 0);
    record.independentBoundaries.push({ id: kind, passed: true, result, inheritedMethodCalls: calls });
  }
  const { selectFindings } = await import(pathToFileURL(join(root, 'prototypes/readonly-dashboard/model.mjs')));
  const sample = readJSON('contracts/prototype-v1/demo-data.json').findings[0];
  const result = selectFindings([{ ...sample, id: 'z', title: 'z', logical_bytes: null },
    { ...sample, id: 'a', title: 'a', logical_bytes: null }, { ...sample, id: 'm', title: 'm', logical_bytes: '1' }], { sort: 'name_asc' }).map((finding) => finding.id);
  assert.deepEqual(result, ['m', 'a', 'z']); record.independentBoundaries.push({ id: 'unknown_name_order', passed: true, actual: result });
  command(process.execPath, ['scripts/verify-contract-assets.mjs']);
  command(process.execPath, ['scripts/verify-project.mjs']);
} catch (error) { fault = error; }
try {
  record.after = snapshot(); assert.equal(record.after.head, expected); assert.equal(record.after.status, '');
  for (const product of record.productTrees) assert.equal(git(['rev-parse', 'HEAD:' + product.path]), product.tree);
} catch (error) { fault = fault ? new Error(fault.message + '; post-check: ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
const receipt = join(output, stamp + '-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt, status: record.status, error: record.error, head: expected }, null, 2));
if (fault) process.exitCode = 1;
