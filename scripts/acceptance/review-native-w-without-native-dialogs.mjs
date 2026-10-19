// Controller checks W exactly once; headless Chrome only, no V/native process.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Readable} from 'node:stream';

const controller = resolve('.'), tree = join(controller, '.worktrees/review-w-20261019');
const implementation = '63db62b020efff4601a03da7dc561549dcb1f762';
const submitted = 'b65902d8f702bf34097adffd7fbaa7daddabe934';
const out = join(controller, '.local/checks/controller-w-receipt-20261019');
mkdirSync(out, {recursive: true});
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const env = {...process.env};
for (const k of Object.keys(env)) if (/^(?:NODE_OPTIONS|NODE_PATH|WATER_)/i.test(k)) delete env[k];
const hash = b => createHash('sha256').update(b).digest('hex');
const result = {startedAt: new Date().toISOString(), implementation, submitted, tree,
  systemNativeDialogsLaunched: 0, physicalFixtureAccess: false, commands: []};
let sequence = 0;
function command(binary, argv, timeout = 30000) {
  const x = spawnSync(binary, argv, {cwd: tree, env, encoding: 'utf8', shell: false, windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024});
  const item = {binary, argv, exitCode: x.status, error: x.error?.code ?? null, log: stamp + '-' + (++sequence) + '.log'};
  writeFileSync(join(out, item.log), JSON.stringify(item) + '\n--- stdout ---\n' + (x.stdout ?? '') + '\n--- stderr ---\n' + (x.stderr ?? ''), {flag: 'wx'});
  result.commands.push(item);
  assert.equal(x.error, undefined, item.log); assert.equal(x.status, 0, item.log);
  return x.stdout;
}
const git = args => command('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args]).trim();
try {
  assert.equal(git(['rev-parse', 'HEAD']), submitted);
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '');
  const files = ['app.mjs', 'model.mjs', 'server.mjs', 'host.mjs', 'launch.mjs', 'tests/model.test.mjs', 'tests/browser.test.mjs'];
  for (const f of files) command(process.execPath, ['--check', 'prototypes/native-review/' + f]);
  const suite = command(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', 'prototypes/native-review/tests/model.test.mjs', 'prototypes/native-review/tests/browser.test.mjs'], 180000);
  const task = JSON.parse(readFileSync(join(controller, 'docs/dispatch/wave1/manifest.json'))).tasks.find(t => t.id === 'WATER-W1-W');
  const names = [...suite.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m => m[1]);
  assert.deepEqual(names.sort(), [...task.expectedTests, ...task.expectedBrowserTests].sort());
  for (const line of ['# tests 5', '# pass 5', '# fail 0', '# skipped 0', '# cancelled 0']) assert(suite.includes(line));
  result.originalFiveTests = 'passed';
  result.headlessScreenshots = ['native-review-1440x1000.png', 'native-review-900x800.png', 'native-review-cancel.png'].map(name => {
    const source = join(tree, '.local/browser-lab', name), bytes = readFileSync(source), copy = stamp + '-' + name;
    writeFileSync(join(out, copy), bytes, {flag: 'wx'});
    return {source, copy, bytes: bytes.length, sha256: hash(bytes)};
  });
  const {assertReviewInput} = await import(pathToFileURL(join(tree, 'prototypes/native-review/model.mjs')));
  const {readSession} = await import(pathToFileURL(join(tree, 'prototypes/native-review/host.mjs')));
  const {startServer} = await import(pathToFileURL(join(tree, 'prototypes/native-review/server.mjs')));
  const cases = JSON.parse(readFileSync(join(tree, 'contracts/native-session-v1/cases.json'))).cases;
  for (const c of cases) assert.equal(assertReviewInput(c.bundle), c.bundle);
  result.positiveNativeCases = cases.length;
  const cancelled = structuredClone(cases[0].bundle);
  cancelled.policy.limits.max_dir_entries = 1;
  assertReviewInput(cancelled);
  const complete = structuredClone(cases[1].bundle), counts = new Map();
  for (const f of complete.snapshots[0].view.findings) {
    const parent = f.relative_path.includes('/') ? f.relative_path.slice(0, f.relative_path.lastIndexOf('/')) : '';
    counts.set(parent, (counts.get(parent) ?? 0) + 1);
  }
  const minimum = Math.max(...counts.values());
  const exact = structuredClone(complete); exact.policy.limits.max_dir_entries = minimum;
  assertReviewInput(exact);
  result.positivePerDirectoryBudget = {minimumObservedDirectChildren: minimum, sameLimitAccepted: true, selectionCancelledLimitOneAccepted: true};
  const failures = [];
  const invalid = structuredClone(complete); invalid.policy.limits.max_dir_entries = 1;
  const payload = Buffer.from(JSON.stringify(invalid));
  const inputFile = stamp + '-invalid-directory-budget.json';
  writeFileSync(join(out, inputFile), payload, {flag: 'wx'});
  let modelAccepted = true;
  try { assertReviewInput(invalid); } catch (e) { modelAccepted = false; assert.equal(e.message, 'Unsupported native review.'); }
  if (modelAccepted) failures.push('W_DIR_BUDGET: model accepted more same-directory findings than max_dir_entries');
  let streamAccepted = true;
  try { await readSession(Readable.from([payload])); } catch (e) { streamAccepted = false; assert.equal(e.message, 'Unsupported native review.'); }
  if (streamAccepted) failures.push('W_DIR_BUDGET: public native stream accepted the inconsistent policy/report');
  let serverAccepted = false, response;
  let server;
  try {
    server = await startServer({bundle: invalid}); serverAccepted = true;
    const r = await fetch(server.url + '/session.json');
    response = await r.json();
    assert.equal(r.status, 200);
    assert.equal(response.policy.limits.max_dir_entries, 1);
    assert.equal(response.snapshots[0].view.status, 'completed');
  } catch (e) {
    if (serverAccepted) throw e;
    assert.equal(e.message, 'Unsupported native review.');
  } finally { await server?.close(); }
  if (serverAccepted) failures.push('W_DIR_BUDGET: HTTP session exposed completed report under contradictory directory limit');
  result.directoryBudget = {inputFile, inputSha256: hash(payload), modelSha256: hash(readFileSync(join(tree, 'prototypes/native-review/model.mjs'))),
    observedDirectChildren: Object.fromEntries(counts), declaredLimit: 1, modelAccepted, streamAccepted, serverAccepted,
    servedCompleted: response?.snapshots[0].view.status === 'completed'};
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), '');
  result.failures = failures;
  result.status = failures.length ? 'failed' : 'passed';
  if (failures.length) process.exitCode = 1;
} catch (error) { result.status = 'failed'; result.error = error.message; process.exitCode = 1; }
result.endedAt = new Date().toISOString();
const receipt = join(out, stamp + '-controller-review.json');
writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...result, commands: result.commands.length, receipt}));
