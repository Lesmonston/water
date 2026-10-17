// Controller-owned independent checks. Synthetic input only; submitted product files stay unchanged.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openBrowser } from '../browser-lab.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
assert.equal(args.length, 4); assert.equal(args[0], '--b-head'); assert.equal(args[2], '--c-head');
const heads = { b: args[1], c: args[3] };
for (const head of Object.values(heads)) assert.match(head, /^[a-f0-9]{40}$/);
const manifest = JSON.parse(readFileSync(join(root, 'docs/dispatch/wave1/manifest.json'), 'utf8'));
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
const output = localDirectory('docs/acceptance/wave1/controller/w1-bc-review-20261017');
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const record = { startedAt: new Date().toISOString(), heads, node: process.version,
  runnerSha256: sha(fileURLToPath(import.meta.url)), lanes: {}, checks: [] };
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
function git(cwd, args) {
  const result = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args],
    { cwd, env, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30000 });
  assert.equal(result.status, 0, 'Read-only git check failed'); return result.stdout.trim();
}
for (const lane of ['b', 'c']) {
  const task = manifest.tasks.find((entry) => entry.id === 'WATER-W1-' + lane.toUpperCase());
  const cwd = task.worktree;
  assert.equal(git(cwd, ['rev-parse', 'HEAD']), heads[lane]);
  assert.equal(git(cwd, ['status', '--porcelain', '--untracked-files=all']), '');
  assert.equal(git(cwd, ['branch', '--show-current']), task.branch);
  git(cwd, ['merge-base', '--is-ancestor', task.baseCommit, 'HEAD']);
  const changed = git(cwd, ['diff', '--no-renames', '--name-only', task.baseCommit, 'HEAD']).split(/\r?\n/).filter(Boolean);
  assert(changed.every((path) => task.allowedFiles.includes(path) || task.allowedPrefixes.some((prefix) => path.startsWith(prefix))));
  const lock = JSON.parse(readFileSync(join(root, task.contractLock), 'utf8'));
  for (const file of lock.files) assert.equal(sha(join(cwd, file.path)), file.sha256);
  const files = changed.filter((path) => path.startsWith(task.outputRoot + '/')).map((path) => ({ path, sha256: sha(join(cwd, path)) }));
  record.lanes[lane] = { cwd, changedFileCount: changed.length, frozenFileCount: lock.files.length, files, gates: [] };
  const checks = join(cwd, '.local/checks', task.id);
  for (const mode of lane === 'b' ? ['check', 'test'] : ['check', 'test', 'browser']) {
    const receipts = readdirSync(checks).filter((name) => name.endsWith('-result.json')).map((name) =>
      ({ name, data: JSON.parse(readFileSync(join(checks, name), 'utf8')) }))
      .filter(({ data }) => data.mode === mode && data.status === 'passed' && data.finalGate && data.before.head === heads[lane]
        && data.after.head === heads[lane] && data.before.status === '' && data.after.status === '')
      .sort((a, b) => a.name.localeCompare(b.name));
    assert(receipts.length, 'Missing final gate on submitted HEAD: ' + task.id + ' ' + mode);
    const { name, data } = receipts.at(-1);
    const artifacts = [join(checks, name), ...data.commands.map((command) => command.log)];
    const archived = [];
    for (const source of artifacts) {
      const destinationName = lane + '-' + source.replaceAll('\\', '/').split('/').at(-1);
      const destination = join(output, destinationName);
      if (existsSync(destination)) assert.equal(sha(destination), sha(source));
      else copyFileSync(source, destination);
      archived.push({ file: destinationName, sha256: sha(destination) });
    }
    record.lanes[lane].gates.push({ mode, artifacts: archived });
  }
}
async function check(id, callback) {
  const item = { id, startedAt: new Date().toISOString() }; record.checks.push(item);
  try { await callback(item); item.status = 'passed'; }
  catch (error) { item.status = 'failed'; item.error = error.message; }
  item.endedAt = new Date().toISOString();
}
const readJSON = (path) => JSON.parse(readFileSync(path, 'utf8'));
const bRoot = record.lanes.b.cwd, cRoot = record.lanes.c.cwd;
const { validateCatalog } = await import(pathToFileURL(join(bRoot, 'packages/tool-catalog/validate.mjs')));
const tools = ['pip', 'uv', 'npm', 'pnpm', 'huggingface', 'ollama'];
const catalog = { index: readJSON(join(bRoot, 'packages/tool-catalog/index.json')),
  entries: Object.fromEntries(tools.map((tool) => [tool, readJSON(join(bRoot, 'packages/tool-catalog/entries', tool + '.json'))])) };
await check('B_valid_catalog', () => assert.deepEqual(validateCatalog(catalog.index, catalog.entries), { valid: true, errors: [] }));
await check('B_array_prototype_must_not_skip_source_refs_or_run_methods', (item) => {
  const data = structuredClone(catalog); let calls = 0;
  const refs = ['missing-controller-source'];
  Object.setPrototypeOf(refs, Object.create(Array.prototype, { forEach: { value() { calls++; } } }));
  data.entries.pip.assets[0].source_ids = refs;
  item.actual = validateCatalog(data.index, data.entries); item.inheritedMethodCalls = calls;
  assert.equal(item.actual.valid, false, 'dangling source must be rejected even on a constructed array');
  assert.equal(calls, 0, 'validator must not invoke input-provided inherited methods');
});
await check('B_array_prototype_must_not_skip_fixed_tool_order', (item) => {
  const data = structuredClone(catalog); let calls = 0; data.index.tools.reverse();
  Object.setPrototypeOf(data.index.tools, Object.create(Array.prototype, { some: { value() { calls++; return false; } } }));
  item.actual = validateCatalog(data.index, data.entries); item.inheritedMethodCalls = calls;
  assert.equal(item.actual.valid, false, 'reversed tool order must be rejected');
  assert.equal(calls, 0, 'validator must not invoke input-provided inherited methods');
});
const { selectFindings } = await import(pathToFileURL(join(cRoot, 'prototypes/readonly-dashboard/model.mjs')));
const demo = readJSON(join(cRoot, 'prototypes/readonly-dashboard/demo-data.json'));
await check('C_name_order_inside_unknown_size_group', (item) => {
  const sample = demo.findings[0];
  const rows = [{ ...sample, id: 'unknown-z', title: 'z', logical_bytes: null },
    { ...sample, id: 'unknown-a', title: 'a', logical_bytes: null },
    { ...sample, id: 'known', title: 'm', logical_bytes: '1' }];
  item.actualIds = selectFindings(rows, { sort: 'name_asc' }).map((row) => row.id);
  assert.deepEqual(item.actualIds, ['known', 'unknown-a', 'unknown-z']);
});
const { startServer } = await import(pathToFileURL(join(cRoot, 'prototypes/readonly-dashboard/server.mjs')));
await check('C_demo_label_visible_while_detail_scrolled', async (item) => {
  const server = await startServer({ port: 0 }); let browser;
  try {
    browser = await openBrowser({ width: 900, height: 800 });
    await browser.goto(server.url);
    await browser.waitFor('document.querySelectorAll("[data-testid=finding-row]").length === 8');
    await browser.evaluate('document.querySelector("[data-finding-id=vector-data] button").click()');
    await browser.waitFor('document.querySelector("dialog").open');
    await browser.evaluate('(async () => { const dialog=document.querySelector("dialog"); dialog.scrollTop=dialog.scrollHeight; await new Promise(requestAnimationFrame); })()');
    item.observed = await browser.evaluate(`(() => {
      const dialog=document.querySelector('dialog');
      const visible=(element) => {
        const r=element.getBoundingClientRect();
        if (r.top<0 || r.bottom>innerHeight || r.width<=0 || r.height<=0) return false;
        const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return !!hit && (hit===element || element.contains(hit));
      };
      return {scrollTop:dialog.scrollTop,scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight,
        labels:[...document.querySelectorAll('[data-testid=demo-badge],.detail-demo')].map((element)=>({text:element.textContent,visible:visible(element),rect:element.getBoundingClientRect().toJSON()}))};
    })()`);
    const screenshot = await browser.screenshot('.local/browser-lab/controller-c-detail-scrolled-' + stamp + '.png');
    item.screenshot = 'c-detail-scrolled-' + stamp + '.png'; copyFileSync(screenshot, join(output, item.screenshot));
    assert(item.observed.labels.some((label) => label.visible && label.text.includes('示例数据 · 只读演示')),
      'read-only demo label must remain visible while the detail dialog scrolls');
  } finally { try { await browser?.close(); } finally { await server.close(); } }
});
await check('C_demo_label_visible_for_every_fixture_detail_at_900', async (item) => {
  const server = await startServer({ port: 0 }); let browser;
  try {
    browser = await openBrowser({ width: 900, height: 800 });
    await browser.goto(server.url);
    await browser.waitFor('document.querySelectorAll("[data-testid=finding-row]").length === 8');
    item.observations = [];
    for (const finding of demo.findings) {
      const selector = '[data-finding-id="' + finding.id + '"] button';
      await browser.evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()');
      await browser.waitFor('document.querySelector("dialog").open');
      await browser.evaluate('(async () => { const dialog=document.querySelector("dialog"); dialog.scrollTop=dialog.scrollHeight; await new Promise(requestAnimationFrame); })()');
      const observed = await browser.evaluate(`(() => {
        const dialog=document.querySelector('dialog'), badge=document.querySelector('.detail-demo');
        const box=badge.getBoundingClientRect(), range=document.createRange(); range.selectNodeContents(badge);
        const r=range.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return {scrollTop:dialog.scrollTop,scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight,
          badgeBoxTop:box.top,badgeTextTop:r.top,badgeTextBottom:r.bottom,visible:r.top>=0 && r.bottom<=innerHeight && !!hit && (hit===badge || badge.contains(hit))};
      })()`);
      item.observations.push({ id: finding.id, ...observed });
      if (!observed.visible) {
        const screenshot = await browser.screenshot('.local/browser-lab/controller-c-detail-' + finding.id + '-' + stamp + '.png');
        const name = 'c-detail-' + finding.id + '-' + stamp + '.png'; copyFileSync(screenshot, join(output, name));
        item.observations.at(-1).screenshot = name;
      }
      await browser.evaluate('document.querySelector("dialog").close()');
    }
    assert(item.observations.every((value) => value.visible), 'demo label must remain fully legible in every fixed finding detail');
  } finally { try { await browser?.close(); } finally { await server.close(); } }
});
record.cBrowserArtifacts = [];
for (const name of ['dashboard-1440x1000.png', 'dashboard-900x800.png', 'detail-1440x1000.png', 'live-dom.json', 'layout-dom.json']) {
  const source = join(cRoot, '.local/browser-lab', name), destination = join(output, 'c-' + name);
  if (existsSync(destination)) assert.equal(sha(destination), sha(source));
  else copyFileSync(source, destination);
  record.cBrowserArtifacts.push({ file: 'c-' + name, sha256: sha(destination) });
}
for (const lane of ['b', 'c']) {
  const data = record.lanes[lane];
  assert.equal(git(data.cwd, ['rev-parse', 'HEAD']), heads[lane]);
  assert.equal(git(data.cwd, ['status', '--porcelain', '--untracked-files=all']), '');
  for (const file of data.files) assert.equal(sha(join(data.cwd, file.path)), file.sha256);
}
record.endedAt = new Date().toISOString();
record.status = record.checks.some((check) => check.status === 'failed') ? 'changes_requested' : 'passed';
const receipt = join(output, stamp + '-boundary-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ receipt, status: record.status, checks: record.checks }, null, 2));
if (record.status !== 'passed') process.exitCode = 1;
