import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, writeFileSync, mkdirSync, realpathSync} from 'node:fs';
import {resolve, dirname, join, relative, isAbsolute, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openPrivateBrowser} from '../../../../scripts/acceptance/native-vw-private-browser.mjs';
import {formatBytes} from '../format.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const ui = join(root, 'apps/water/ui');
const fixture = JSON.parse(readFileSync(join(root, 'contracts/checkup-v1/ui-fixtures.json'), 'utf8'));
const shots = resolve(process.env.WATER_W2_SHOTS_DIR ?? join(root, '.local/ui-shots', new Date().toISOString().replaceAll(':', '-')));
const localRelative = relative(join(root, '.local'), shots);
assert(localRelative && !localRelative.startsWith('..') && !isAbsolute(localRelative), 'Screenshots must stay in this worktree .local');
mkdirSync(shots, {recursive:true});
assert(!relative(realpathSync(join(root, '.local')), realpathSync(shots)).startsWith('..'));
let server, browser, base, injection, scenario = 0;
const errors = [];

// Test-only host. Production modules have no replay branch, fixture import, or test hook.
function fakeHost(f, options) {
  const copy = value => structuredClone(value);
  const control = window.__waterTest = {scenario:options.scenario, calls:[], errors:[], scanIndex:0, cleanIndex:0, holdScan:true, holdClean:true, nextError:null, scanned:!!options.scanned, busy:options.busy ?? 'idle', locations:copy(f.locations), addCancelled:false, plan:null, consumed:false, cleanFinished:false};
  addEventListener('error', e => control.errors.push(e.message));
  addEventListener('unhandledrejection', e => control.errors.push(String(e.reason)));
  if (options.locked) control.locations.categories[0].locked = true;
  if (options.unavailable) return;
  const fail = key => { throw copy(f.errors[key] ?? {code:'not_found', message_zh:'这份记录暂时无法读取。'}); };
  window.__TAURI__ = {core:{invoke:async (command, args) => {
    control.calls.push({command, args:copy(args), at:performance.now()});
    if (Object.values(args).flat().some(v => typeof v === 'string' && (/[A-Za-z]:[\\/]|\\/.test(v) || v.startsWith('/')))) throw new Error('PATH_SENT_TO_HOST');
    if (control.nextError?.command === command) { const error = control.nextError.error; control.nextError = null; throw error; }
    switch (command) {
      case 'app_state': return {...copy(control.scanned ? f.app_state_after_scan : f.app_state_fresh), busy:control.busy};
      case 'scan_start': if (control.busy !== 'idle') fail('busy'); control.busy = 'scanning'; control.scanIndex = 0; control.consumed = false; return copy(f.scan_start);
      case 'scan_cancel': control.scanStopped = true; control.holdScan = false; return {};
      case 'scan_progress': {
        const value = copy(f.scan_progress_sequence[control.scanIndex]);
        if (control.scanStopped) value.state = 'cancelled';
        if (value.state !== 'running') { control.busy = 'idle'; control.scanned = true; }
        if (!control.holdScan) control.scanIndex = Math.min(control.scanIndex + 1, f.scan_progress_sequence.length - 1);
        return value;
      }
      case 'scan_result': return {...copy(f.scan_result), ...(control.scanStopped ? {status:'partial'} : {})};
      case 'group_detail': if (!f.group_details[args.groupId]) fail('not_found'); return copy(f.group_details[args.groupId]);
      case 'clean_prepare': {
        if (control.busy !== 'idle') fail('busy');
        const groups = f.scan_result.categories.flatMap(c => c.groups);
        const selected = args.groupIds.map(id => groups.find(g => g.group_id === id));
        if (!selected.length || selected.some(g => !g?.selectable)) fail('invalid');
        const defaultIds = f.clean_prepare_default.groups.map(g => g.group_id);
        const value = copy(f.clean_prepare_default);
        if (args.groupIds.length !== defaultIds.length || !defaultIds.every(id => args.groupIds.includes(id))) {
          value.groups = selected.map(g => ({group_id:g.group_id, title_zh:g.title_zh, level:g.level, item_count:g.eligible_count, total_bytes:g.eligible_bytes, in_use_note_zh:g.in_use?.process_label_zh ?? null}));
          value.total_bytes = selected.reduce((s, g) => s + BigInt(g.eligible_bytes), 0n).toString();
          value.item_count = selected.reduce((s, g) => s + g.eligible_count, 0);
          value.by_drive = [...new Set(selected.map(g => g.drive_root))].map(root => ({root, bytes:selected.filter(g => g.drive_root === root).reduce((s, g) => s + BigInt(g.eligible_bytes), 0n).toString()}));
        }
        control.plan = value; control.consumed = false; return copy(value);
      }
      case 'clean_start':
        if (control.busy !== 'idle') fail('busy');
        if (!control.plan || control.consumed || args.planId !== control.plan.plan_id || args.confirmToken !== control.plan.confirm_token) fail('invalid');
        control.consumed = true; control.busy = 'cleaning'; return copy(f.clean_start);
      case 'clean_stop': control.cleanStopped = true; control.holdClean = false; return {};
      case 'clean_progress': {
        const value = copy(f.clean_progress_sequence[control.cleanIndex]);
        if (control.cleanStopped) value.state = 'stopped';
        if (value.state !== 'running') { control.busy = 'idle'; control.cleanFinished = true; }
        if (!control.holdClean) control.cleanIndex = Math.min(control.cleanIndex + 1, f.clean_progress_sequence.length - 1);
        return value;
      }
      case 'clean_result': return copy(f.clean_result);
      case 'trends': return options.emptyTrends ? {points:[], growth:[], leaks:[]} : copy(f.trends);
      case 'history_list': return options.emptyHistory ? [] : copy(f.history_list);
      case 'locations_get': return copy(control.locations);
      case 'locations_set_category': {
        const category = control.locations.categories.find(c => c.category === args.category);
        if (!category || category.locked) fail('invalid'); category.enabled = args.enabled; return copy(control.locations);
      }
      case 'custom_root_add': if (control.addCancelled) return copy(f.custom_root_add_cancelled); control.locations.custom_roots.push(copy(f.custom_root_add_added.added)); return copy(f.custom_root_add_added);
      case 'custom_root_remove': control.locations.custom_roots = control.locations.custom_roots.filter(r => r.root_id !== args.rootId); return copy(control.locations);
      default: throw new Error('Unexpected command ' + command);
    }
  }}};
}

async function reset(options = {}, route = 'home') {
  options = {...options, scenario:++scenario};
  if (injection) await browser.send('Page.removeScriptToEvaluateOnNewDocument', {identifier:injection});
  injection = (await browser.send('Page.addScriptToEvaluateOnNewDocument', {source:`(${fakeHost.toString()})(${JSON.stringify(fixture)}, ${JSON.stringify(options)});`})).identifier;
  await browser.goto(`${base}/index.html?scenario=${scenario}#/${route}`);
  await browser.waitFor(`window.__waterTest?.scenario === ${scenario} && document.querySelector("#page").children.length > 0`);
  await browser.waitFor(options.unavailable ? 'document.body.textContent.includes("无法连接 Water 服务")' : 'document.querySelector(".version")?.textContent.includes("0.1.0")');
}
const q = key => `[data-key="${key}"]`;
const click = key => browser.click(q(key));
const text = () => browser.evaluate('document.body.textContent');
const pageIs = name => browser.waitFor(`document.querySelector('#page').dataset.page === ${JSON.stringify(name)}`);
const waitText = value => browser.waitFor(`document.body.textContent.includes(${JSON.stringify(value)})`);
const control = code => browser.evaluate(`(()=>{${code}})()`);
async function key(value, shift = false) {
  const code = value === ' ' ? 'Space' : value;
  const vk = {Tab:9, Escape:27, Enter:13, ' ':32}[value];
  await browser.send('Input.dispatchKeyEvent', {type:'keyDown', key:value, code, windowsVirtualKeyCode:vk, modifiers:shift ? 8 : 0, ...(value === 'Enter' ? {text:'\r'} : {})});
  await browser.send('Input.dispatchKeyEvent', {type:'keyUp', key:value, code, windowsVirtualKeyCode:vk, modifiers:shift ? 8 : 0});
}
async function shot(name) {
  await browser.send('Animation.setPlaybackRate', {playbackRate:1});
  await new Promise(ok => setTimeout(ok, 450));
  writeFileSync(join(shots, `${name}.png`), await browser.screenshot(), {flag:'wx'});
  await noOverflow();
  if (name.endsWith('1240x820')) { await browser.size(1040, 720); await noOverflow(); await browser.size(1240, 820); }
}
async function safeCalls() {
  const values = await browser.evaluate('window.__waterTest.calls');
  for (const {args} of values) for (const value of Object.values(args).flat()) if (typeof value === 'string') assert(!/[A-Za-z]:[\\/]|\\/.test(value), 'IPC must contain IDs, never paths');
  assert.deepEqual(await browser.evaluate('window.__waterTest.errors'), []);
}
async function noOverflow() {
  assert(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth && document.querySelector("#main").scrollWidth <= document.querySelector("#main").clientWidth'), 'No horizontal overflow');
}

before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname.slice(1) || 'index.html';
    if (!/^(?:index\.html|(?:app|ipc|model|format)\.mjs|views\/[a-z]+\.mjs|styles\/[a-z]+\.css)$/.test(path)) { res.writeHead(404).end(); return; }
    try {
      const data = readFileSync(join(ui, path));
      res.writeHead(200, {'content-type':{'.html':'text/html; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8'}[extname(path)], 'cache-control':'no-store', 'content-security-policy':"default-src 'self'; connect-src 'none'; img-src 'self'; object-src 'none'; base-uri 'none'"}).end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok)); base = `http://127.0.0.1:${server.address().port}`;
  browser = await openPrivateBrowser(); await browser.size(1240, 820);
  await browser.send('Animation.enable');
});
after(async () => { if (browser) await browser.close(); if (server) await new Promise(ok => server.close(ok)); assert.deepEqual(errors, []); });

test('ui_home_and_scan', async () => {
  await reset(); await waitText('尚未体检');
  assert((await text()).includes('59.8')); await noOverflow(); await shot('home-1240x820');
  const before = await browser.evaluate('window.__waterTest.calls.length');
  await new Promise(ok => setTimeout(ok, 550));
  assert.equal(await browser.evaluate('window.__waterTest.calls.length'), before, 'Idle must not poll');
  await click('scan-start'); await pageIs('scan');
  await control('window.__waterTest.scanIndex=2'); await waitText('182,280');
  assert((await text()).includes(formatBytes(fixture.scan_progress_sequence[2].found_bytes).split(' ')[0]));
  await shot('scan-1240x820');
  await click('nav-locations'); await waitText('自定义文件夹');
  assert(await browser.evaluate(`document.querySelector(${JSON.stringify(q('add-root'))}).disabled`), 'Cannot start location changes during scan');
  await click('nav-home'); await pageIs('scan');
  await control('window.__waterTest.holdScan=false'); await pageIs('results'); await waitText('已选 13 组');
  const times = await browser.evaluate('window.__waterTest.calls.filter(c=>c.command==="scan_progress").map(c=>c.at)');
  for (let i = 1; i < times.length; i++) assert(times[i] - times[i - 1] >= 230, 'No excessive polling');
  await safeCalls();
});

test('ui_results_detail_confirm', async () => {
  await pageIs('results');
  assert((await text()).includes('31.2'), 'Hero must use fixture bytes, not mockup numbers');
  await noOverflow(); await shot('results-1240x820');
  await browser.size(1040, 720); await noOverflow(); await shot('results-1040x720'); await browser.size(1240, 820);
  await click('detail-codex-marketplace-staging'); await waitText('这是什么'); await shot('detail-1240x820');
  assert((await text()).includes('69,947')); await key('Escape'); await browser.waitFor('!document.querySelector("dialog[open]")');
  assert.equal(await browser.evaluate('document.activeElement.dataset.key'), 'detail-codex-marketplace-staging');
  await click('select-codex-marketplace-staging'); await waitText('已选 12 组');
  await click('select-codex-marketplace-staging'); await waitText('已选 13 组');
  await click('category-agent_tool'); await waitText('已选 14 组');
  assert.equal(await browser.evaluate('document.querySelectorAll(".group-row input:checked").length'), 14);
  assert.equal(await browser.evaluate(`document.querySelector(${JSON.stringify(q('select-claude-code-sessions'))})`), null);
  await click('select-codex-runtimes'); await waitText('已选 13 组');
  await click('filter-protected');
  assert.equal(await browser.evaluate('document.querySelectorAll(".group-row input").length'), 0);
  await click('detail-claude-code-sessions'); await waitText('Water 不会清理此类数据。'); await key('Escape');
  await click('filter-all'); await click('clean-prepare'); await browser.waitFor('!!document.querySelector(".confirm[open]")');
  assert((await text()).includes('不进入回收站，无法恢复'));
  assert((await text()).includes('2,250'));
  assert.equal(await browser.evaluate('document.activeElement.dataset.key'), 'confirm-cancel');
  await key('Tab'); assert.equal(await browser.evaluate('document.activeElement.dataset.key'), 'confirm-start');
  await key('Tab'); assert(await browser.evaluate('document.activeElement.classList.contains("confirm-list")'));
  await key('Tab', true); assert.equal(await browser.evaluate('document.activeElement.dataset.key'), 'confirm-start');
  await key('Escape'); await browser.waitFor('!document.querySelector("dialog[open]")');
  assert.equal(await browser.evaluate('window.__waterTest.calls.filter(c=>c.command==="clean_start").length'), 0);
  await click('clean-prepare'); await browser.waitFor('!!document.querySelector(".confirm[open]")'); await shot('confirm-1240x820');
  await click('confirm-start'); await pageIs('cleaning'); await waitText('已释放');
  assert.equal(await browser.evaluate('window.__waterTest.calls.filter(c=>c.command==="clean_start").length'), 1);
  await safeCalls();
});

test('ui_clean_done_and_pages', async () => {
  await pageIs('cleaning'); await shot('cleaning-1240x820');
  await control('window.__waterTest.holdClean=false'); await pageIs('done');
  assert((await text()).includes('30.7'), 'Actual freed bytes must come from clean_result');
  assert((await text()).includes('6 个配置正在使用，已跳过')); await noOverflow(); await shot('done-1240x820');
  const calls = await browser.evaluate('window.__waterTest.calls.length'); await new Promise(ok => setTimeout(ok, 550));
  assert.equal(await browser.evaluate('window.__waterTest.calls.length'), calls, 'Completed cleanup stops polling');
  await click('nav-trends'); await waitText('增长最多'); await noOverflow(); await shot('trends-1240x820');
  await click('nav-history'); await waitText('清理 13 组'); await shot('history-1240x820');
  await click(`history-${fixture.history_list[0].id}`); await waitText('清理日志位置');
  assert((await text()).includes('6 个配置正在使用，已跳过'));
  await click('nav-locations'); await waitText('自定义文件夹'); await shot('locations-1240x820');
  await click('location-browser'); await browser.waitFor(`document.querySelector(${JSON.stringify(q('location-browser'))}).getAttribute('aria-checked') === 'false'`);
  await control('window.__waterTest.addCancelled=true'); await click('add-root');
  assert.equal(await browser.evaluate('window.__waterTest.locations.custom_roots.length'), 1);
  await control('window.__waterTest.addCancelled=false'); await click('add-root'); await waitText('D:\\projects');
  await click('remove-projects'); await browser.waitFor('window.__waterTest.locations.custom_roots.length === 1');
  await click('nav-about'); await waitText('Water 读取什么'); await shot('about-1240x820'); await noOverflow(); await safeCalls();
});

test('ui_layout_states_a11y', async () => {
  await reset({scanned:true}, 'results'); await waitText('已选 13 组');
  for (const dimensions of [[1240, 820], [1040, 720]]) { await browser.size(...dimensions); await noOverflow(); }
  await browser.size(1240, 820);
  await browser.send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion', value:'reduce'}]});
  await click('detail-codex-marketplace-staging'); await waitText('这是什么');
  assert(await browser.evaluate('document.getAnimations().every(a=>a.playState!=="running")'), 'Reduced motion must disable every animation');
  await key('Escape'); await browser.waitFor('!document.querySelector("dialog[open]")');
  // Walk the real keyboard order and visit every enabled control, including offscreen rows.
  await browser.evaluate('document.activeElement.blur(); document.querySelector("#main").scrollTop=0');
  const expected = await browser.evaluate('[...document.querySelectorAll("a[href], button:not(:disabled), input:not(:disabled), [tabindex]")].filter(e=>e.tabIndex>=0 && e.getClientRects().length).map(e=>e.dataset.key).filter(Boolean)');
  const reached = new Set();
  for (let i = 0; i < expected.length + 8; i++) { await key('Tab'); reached.add(await browser.evaluate('document.activeElement.dataset.key')); }
  assert(expected.every(k => reached.has(k)), 'Tab must reach every visible enabled control');
  await browser.evaluate(`document.querySelector(${JSON.stringify(q('select-codex-marketplace-staging'))}).focus()`);
  await key(' '); await waitText('已选 12 组'); await key(' '); await waitText('已选 13 组');
  await browser.evaluate(`document.querySelector(${JSON.stringify(q('detail-codex-marketplace-staging'))}).focus()`);
  await key('Enter'); await waitText('这是什么'); await key('Escape');
  await control(`window.__waterTest.nextError={command:'clean_prepare',error:${JSON.stringify(fixture.errors.stale)}}`);
  await click('clean-prepare'); await waitText(fixture.errors.stale.message_zh);
  assert(await browser.evaluate('document.querySelector("#notice").getBoundingClientRect().top >= 0 && document.querySelector("#notice").getBoundingClientRect().bottom <= innerHeight'), 'Error remains visible while results are scrolled');
  assert(await browser.evaluate(`document.querySelector(${JSON.stringify(q('clean-prepare'))}).disabled`)); await shot('stale-1240x820');
  await click('rescan'); await pageIs('scan'); await browser.waitFor(`!!document.querySelector(${JSON.stringify(q('scan-stop'))})`); await click('scan-stop');
  await pageIs('results'); await waitText('部分结果'); await waitText('已选 13 组'); await safeCalls();
  await reset({scanned:true}); await shot('home-last-scan-1240x820');
  await control(`window.__waterTest.nextError={command:'scan_start',error:${JSON.stringify(fixture.errors.busy)}}`);
  await click('scan-start'); await waitText(fixture.errors.busy.message_zh); await shot('busy-1240x820');
  assert(await browser.evaluate('document.querySelector("#notice").getBoundingClientRect().top >= 0 && document.querySelector("#notice").getBoundingClientRect().bottom <= innerHeight'));
  await control("window.__waterTest.nextError={command:'scan_start',error:{unexpected:true}}");
  await click('scan-start'); await waitText('Water 服务暂时不可用');
  await reset({locked:true}, 'locations'); await waitText('自定义文件夹');
  assert(await browser.evaluate(`document.querySelector(${JSON.stringify(q('location-agent_tool'))}).disabled`));
  await reset({emptyTrends:true}, 'trends'); await waitText('再体检一次就能看到变化'); await shot('trends-empty-1240x820');
  await reset({emptyHistory:true}, 'history'); await waitText('还没有记录');
  await reset({busy:'scanning'}); await pageIs('scan'); await waitText('停止扫描');
  await click('nav-locations'); await waitText('自定义文件夹');
  assert(await browser.evaluate(`document.querySelector(${JSON.stringify(q('add-root'))}).disabled`));
  await reset({unavailable:true}); await waitText('无法连接 Water 服务'); await shot('unavailable-1240x820');
  await noOverflow(); await safeCalls();
});
