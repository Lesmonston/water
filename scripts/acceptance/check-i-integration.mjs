// Controller-owned I integration and independent complete-suite negative controls.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.cwd().toLowerCase(), root.toLowerCase());
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--expected-head');
const expected = process.argv[3]; assert.match(expected, /^[a-f0-9]{40}$/);
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
function local(parts) {
  let dir = root;
  for (const part of parts.split('/')) {
    assert(part && !['.', '..'].includes(part)); dir = join(dir, part);
    if (!existsSync(dir)) mkdirSync(dir);
    assert(lstatSync(dir).isDirectory() && !lstatSync(dir).isSymbolicLink());
    const rel = relative(root, dir); assert(rel && !rel.startsWith('..') && !isAbsolute(rel));
  }
  return dir;
}
const out = local('.local/checks/controller-i-integration');
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
delete env.NODE_OPTIONS; delete env.NODE_PATH;
for (const name of Object.keys(env)) if (/^WATER_/.test(name)) delete env[name];
const record = { task: 'WATER-W1-I', root, expectedHead: expected, startedAt: new Date().toISOString(), commands: [], negativeControls: [] };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = path => sha(readFileSync(join(root, path)));
function invoke(binary, argv, timeout = 30000, allowFailure = false) {
  const r = spawnSync(binary, argv, { cwd: root, env, encoding: 'utf8', timeout, windowsHide: true, shell: false, maxBuffer: 16 * 1024 * 1024 });
  const log = stamp + '-' + record.commands.length + '.log';
  const entry = { binary, argv, exitCode: r.status, error: r.error?.code ?? null, log }; record.commands.push(entry);
  writeFileSync(join(out, log), JSON.stringify(entry) + '\n--- stdout ---\n' + (r.stdout ?? '') + '\n--- stderr ---\n' + (r.stderr ?? ''), { flag: 'wx' });
  assert(!r.error && r.status !== null, 'Command timed out or could not start');
  if (!allowFailure) assert.equal(r.status, 0, 'Command failed: ' + argv.join(' '));
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, log };
}
const git = args => invoke('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args]).stdout.trim();
const snapshot = () => ({ head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain=v1', '--untracked-files=all']) });
const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
let task;
function suites(allowFailure = false) {
  return [['model', task.testFile, task.expectedTests, 30000], ['browser', task.browserTestFile, task.expectedBrowserTests, 120000]].map(([name, file, names, timeout]) => {
    const result = invoke(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', file], timeout, allowFailure);
    assert.deepEqual([...result.stdout.matchAll(/^# Subtest: (.+)$/gm)].map(m => m[1].replace(/\r$/, '')).sort(), [...names].sort());
    for (const [key, value] of [['tests', names.length], ['cancelled', 0], ['skipped', 0], ['todo', 0]]) assert(new RegExp('^# ' + key + ' ' + value + '\\r?$', 'm').test(result.stdout));
    if (!allowFailure) assert(new RegExp('^# pass ' + names.length + '\\r?$', 'm').test(result.stdout));
    assert(!/SyntaxError|ERR_MODULE_NOT_FOUND|ERR_TEST_FAILURE.*cancelled/.test(result.stdout + result.stderr));
    return { ...result, name };
  });
}
let fault;
try {
  record.before = snapshot(); assert.equal(record.before.head, expected); assert.equal(record.before.status, '');
  assert.equal(git(['branch', '--show-current']), 'controller/water-w1-i-20261017');
  const controller = dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  assert.equal(relative(controller, root).replaceAll('\\', '/'), '.worktrees/integration-i-20261017');
  task = json('docs/dispatch/wave1/manifest.json').tasks.find(t => t.id === 'WATER-W1-I');
  assert.equal(task.status, 'ACCEPTED'); git(['merge-base', '--is-ancestor', task.acceptedCommit, 'HEAD']);
  record.productTree = git(['rev-parse', 'HEAD:' + task.outputRoot]);
  assert.equal(record.productTree, git(['rev-parse', task.acceptedCommit + ':' + task.outputRoot]));
  record.preservedProducts = [];
  for (const path of ['crates/water-contracts', 'packages/tool-catalog', 'prototypes/readonly-dashboard', 'tools/fs-fixture-kit', 'packages/report-view', 'packages/fixture-scan']) {
    const tree = git(['rev-parse', 'HEAD:' + path]); assert.equal(tree, git(['rev-parse', '6907566ea973deb62ba162a5acf2cb81abd5a1ed:' + path])); record.preservedProducts.push({ path, tree });
  }
  const frozen = new Map();
  for (const name of ['v1', 'parallel-v1', 'fixture-lab-v1', 'report-view-v1', 'scan-lab-v1', 'parallel-next-v1']) for (const f of json('contracts/' + name + '/freeze.lock.json').files) { assert.equal(hash(f.path), f.sha256); frozen.set(f.path, f.sha256); }
  record.frozenFiles = frozen.size;
  for (const path of task.syntaxFiles) invoke(process.execPath, ['--check', path]);
  suites(); record.initialModelTests = 3; record.initialBrowserTests = 2;
  const mutationDefinitions = [
    { name: 'number-sort', file: 'model.mjs', from: '    const left = BigInt(a.logical_bytes);\n    const right = BigInt(b.logical_bytes);', to: '    const left = Number(a.logical_bytes);\n    const right = Number(b.logical_bytes);', expected: 'ac7402da7cc09867a96985b645d5bb74750675422c72354d6b156b0efd3c95b3', target: '2^53 must sort before 2^53+1' },
    { name: 'source-total-sum-or-zero', file: 'model.mjs',
      from: "  let protectedCount = 0;\n  let unknownSizeCount = 0;\n  for (const finding of view.findings) {\n    if (finding.risk === 'protected') protectedCount += 1;\n    if (finding.logical_bytes === null) unknownSizeCount += 1;\n  }\n  return {\n    count: view.findings.length,\n    protected_count: protectedCount,\n    unknown_size_count: unknownSizeCount,\n    source_totals: {\n      logical_bytes: view.totals.logical_bytes,",
      to: "  let protectedCount = 0;\n  let summed = 0n;\n  for (const finding of view.findings) {\n    if (finding.risk === 'protected') protectedCount += 1;\n    summed += finding.logical_bytes === null ? 0n : BigInt(finding.logical_bytes);\n  }\n  return {\n    count: view.findings.length,\n    protected_count: protectedCount,\n    unknown_size_count: 0,\n    source_totals: {\n      logical_bytes: view.totals.logical_bytes === null || summed > 18446744073709551615n ? '0' : summed.toString(),",
      expected: 'd1017161306d7cf8110408b13bc851c5fbb518a4141dd7fcbff9cd987803d44e', target: 'reader_totals_and_unknown' },
    { name: 'inner-html', file: 'app.mjs', from: '  if (content !== undefined) result.textContent = content;', to: '  if (content !== undefined) result.innerHTML = content;', expected: 'e97354332c7a6c031a5f6841c07856ad046e221d5605f1b5f310f4dcc86b201e', target: 'HTML literal must not create an img element' },
  ];
  const testHashes = [task.testFile, task.browserTestFile].map(path => ({ path, sha256: hash(path) }));
  for (const definition of mutationDefinitions) {
    const path = join(root, task.outputRoot, definition.file), original = readFileSync(path);
    const text = original.toString('utf8'); assert(text.includes(definition.from));
    const bad = Buffer.from(text.replace(definition.from, definition.to)); assert.equal(sha(bad), definition.expected);
    const item = { name: definition.name, file: definition.file, originalSha256: sha(original), mutatedSha256: sha(bad) };
    writeFileSync(join(out, stamp + '-' + definition.name + '-original.txt'), original, { flag: 'wx' });
    writeFileSync(join(out, stamp + '-' + definition.name + '-mutated.txt'), bad, { flag: 'wx' });
    try {
      writeFileSync(path, bad);
      const red = suites(true); assert(red.some(r => r.status === 1));
      assert(red.map(r => r.stdout).join('\n').includes(definition.target));
      if (definition.name === 'number-sort' || definition.name === 'source-total-sum-or-zero') assert(red.every(r => r.status === 1));
      else { assert.equal(red[0].status, 0); assert.equal(red[1].status, 1); }
      item.red = red.map(({ name, status, log }) => ({ name, status, log }));
    } finally { writeFileSync(path, original); }
    item.restoredSha256 = hash(task.outputRoot + '/' + definition.file); assert.equal(item.restoredSha256, item.originalSha256);
    for (const t of testHashes) assert.equal(hash(t.path), t.sha256);
    item.green = suites().map(({ name, status, log }) => ({ name, status, log }));
    record.negativeControls.push(item);
    console.log(JSON.stringify({ negativeControl: definition.name, targetRed: true, restorationPassed: true }));
  }
  // Final gates run only after all mutations have been restored, without testing flags.
  for (const path of task.syntaxFiles) invoke(process.execPath, ['--check', path]);
  suites(); record.finalModelTests = 3; record.finalBrowserTests = 2;
  record.screenshots = [];
  for (const name of ['reader-1440x1000.png', 'reader-900x800.png', 'reader-detail.png']) {
    const bytes = readFileSync(join(root, '.local/browser-lab', name)), file = stamp + '-' + name;
    writeFileSync(join(out, file), bytes, { flag: 'wx' }); record.screenshots.push({ file, bytes: bytes.length, sha256: sha(bytes) });
  }
  const boundary = invoke(process.execPath, ['scripts/acceptance/review-reader-boundaries.mjs', '--expected-head', expected, '--integration']);
  const result = JSON.parse(boundary.stdout); assert.equal(result.status, 'passed'); assert.equal(result.passed, 87); record.independentChecks = 87;
  for (const [path, expected] of frozen) assert.equal(hash(path), expected);
} catch (error) { fault = error; }
try { record.after = snapshot(); assert.deepEqual(record.after, record.before); }
catch (error) { fault = fault ? new Error(fault.message + '; post-check: ' + error.message) : error; }
Object.assign(record, { endedAt: new Date().toISOString(), status: fault ? 'failed' : 'passed', error: fault?.message ?? null });
const receipt = join(out, stamp + '-result.json'); writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: record.status, receipt, error: record.error, negativeControls: record.negativeControls.length }, null, 2));
if (fault) process.exitCode = 1;
