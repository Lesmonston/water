import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { startServer } from '../server.mjs';
import { openBrowser } from '../../../scripts/browser-lab.mjs';

const selector = (id) => `[data-testid="${id}"]`;
const element = (id) => `document.querySelector(${JSON.stringify(selector(id))})`;
const rowIds = 'Array.from(document.querySelectorAll(\'[data-testid="finding-row"]\'), row => row.dataset.findingId)';
const text = (browser, id) => browser.evaluate(`${element(id)}.textContent`);
async function key(browser, key, code, virtualKey) {
  await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKey,
    ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
  await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey });
}
async function click(browser, css) {
  const point = await browser.evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(css)}); node.scrollIntoView({block:'center'});
    const rect = node.getBoundingClientRect(); return {x:rect.x + rect.width/2, y:rect.y + rect.height/2};
  })()`);
  await browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function search(browser, value) {
  await click(browser, selector('search-input'));
  await browser.evaluate(`${element('search-input')}.select()`);
  await key(browser, 'Backspace', 'Backspace', 8);
  if (value) await browser.send('Input.insertText', { text: value });
}
async function choose(browser, id, value) {
  // Exercise the real select's normal DOM change event and application listener.
  await browser.evaluate(`(() => { const select = ${element(id)};
    select.focus(); select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', {bubbles:true})); })()`);
}
async function ready(browser, url) {
  await browser.goto(url);
  await browser.waitFor(`document.readyState === 'complete' && ${element('status-banner')} && !${element('status-banner')}.textContent.includes('正在载入')`);
}
function rawRequest(url, path, { method = 'GET', host } = {}) {
  const target = new URL(url);
  return new Promise((accept, reject) => {
    const req = request({ hostname: target.hostname, port: target.port, path, method,
      headers: host ? { Host: host } : {} }, (response) => {
      let body = '';
      response.setEncoding('utf8'); response.on('data', (part) => { body += part; });
      response.on('end', () => accept({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject); req.end();
  });
}

test('prototype_live_interactions', async () => {
  const server = await startServer({ port: 0 });
  let browser;
  try {
    browser = await openBrowser({ width: 1440, height: 1000 });
    await ready(browser, server.url);
    assert.equal((await browser.evaluate(rowIds)).length, 8, 'the public page must render all eight findings');
    assert.equal(await text(browser, 'summary-count'), '8');
    assert.equal(await text(browser, 'demo-badge'), '示例数据 · 只读演示');
    assert.match(await text(browser, 'status-banner'), /partial/);
    assert.match(await text(browser, 'status-banner'), /permission_denied/);
    await search(browser, 'QWEN');
    assert.deepEqual(await browser.evaluate(rowIds), ['hf-qwen']);
    await choose(browser, 'tool-filter', 'huggingface');
    await choose(browser, 'category-filter', 'model');
    await choose(browser, 'risk-filter', 'protected');
    assert.deepEqual(await browser.evaluate(rowIds), ['hf-qwen'], 'search and all three exact filters combine');
    await choose(browser, 'risk-filter', 'review');
    assert.deepEqual(await browser.evaluate(rowIds), []);
    assert.equal(await browser.evaluate(`${element('empty-state')}.hidden`), false);
    await click(browser, '#empty-reset');
    assert.equal((await browser.evaluate(rowIds)).length, 8);
    assert.equal(await browser.evaluate(`${element('search-input')}.value`), '');
    for (const id of ['tool-filter', 'category-filter', 'risk-filter']) assert.equal(await browser.evaluate(`${element(id)}.value`), 'all');
    await choose(browser, 'sort-select', 'size_asc');
    const ascending = await browser.evaluate(rowIds);
    assert.deepEqual(ascending, ['agent-history', 'uv-build', 'pip-wheels', 'hf-qwen', 'ollama-local', 'large-b', 'large-a', 'vector-data']);
    await choose(browser, 'sort-select', 'size_desc');
    const descending = await browser.evaluate(rowIds);
    assert.deepEqual(descending, ['large-a', 'large-b', 'ollama-local', 'hf-qwen', 'pip-wheels', 'uv-build', 'agent-history', 'vector-data']);
    await choose(browser, 'sort-select', 'name_asc');
    assert.equal((await browser.evaluate(rowIds)).at(-1), 'vector-data');
    await search(browser, 'DEMO-PROJECT/HISTORY');
    assert.deepEqual(await browser.evaluate(rowIds), ['agent-history']);
    const trigger = '[data-finding-id="agent-history"] button';
    await browser.evaluate(`document.querySelector(${JSON.stringify(trigger)}).focus()`);
    await key(browser, 'Enter', 'Enter', 13);
    assert.equal(await browser.evaluate(`${element('detail-panel')}.open`), true, 'keyboard opens the real dialog');
    assert.equal(await text(browser, 'detail-path'), 'demo-project/history');
    const details = await text(browser, 'detail-panel');
    for (const label of ['示例数据 · 只读演示', '用途', '工具', '识别依据', '活跃状态', '恢复前提', '保护原因', '容量口径', '268435456 B']) assert(details.includes(label), label);
    assert.equal(await browser.evaluate('document.activeElement.dataset.testid'), 'detail-close');
    await key(browser, 'Escape', 'Escape', 27);
    assert.equal(await browser.evaluate(`${element('detail-panel')}.open`), false);
    const focusReturned = await browser.evaluate(`document.activeElement === document.querySelector(${JSON.stringify(trigger)})`);
    assert.equal(focusReturned, true, 'Esc returns focus to the original detail button');
    await click(browser, trigger);
    await click(browser, selector('detail-close'));
    assert.equal(await browser.evaluate(`${element('detail-panel')}.open`), false);
    for (const literal of ['[', '^.*$', '<img src=x onerror=alert(1)>']) {
      await search(browser, literal);
      assert.deepEqual(await browser.evaluate(rowIds), [], 'literal search does not become regex or HTML');
      assert.equal(await browser.evaluate('document.querySelectorAll("img").length'), 0);
    }
    await click(browser, selector('reset-filters'));
    assert.equal((await browser.evaluate(rowIds)).length, 8);
    assert.equal(await browser.evaluate(`${element('sort-select')}.value`), 'size_desc');
    await choose(browser, 'scenario-select', 'cancelled');
    const cancelled = await text(browser, 'status-banner');
    assert.match(cancelled, /cancelled/); assert.match(cancelled, /结果不完整/);
    assert.equal((await browser.evaluate(rowIds)).length, 8, 'changing scenario does not fabricate a new scan');
    await choose(browser, 'scenario-select', 'partial');
    assert.match(await text(browser, 'status-banner'), /permission_denied/);
    await search(browser, 'knowledge');
    assert.deepEqual(await browser.evaluate(rowIds), ['vector-data']);
    assert.match(await text(browser, 'finding-list'), /未知/);
    await writeFile(new URL('../../../.local/browser-lab/live-dom.json', import.meta.url), JSON.stringify({
      ascending, descending, details, focusReturned, cancelled,
      unknownRow: await text(browser, 'finding-list'), badge: await text(browser, 'demo-badge'),
      status: await text(browser, 'status-banner'),
    }, null, 2));
  } finally {
    try { await browser?.close(); } finally { await server.close(); }
  }
  await assert.rejects(rawRequest(server.url, '/'), { code: 'ECONNREFUSED' }, 'the temporary server was closed');
});

test('prototype_scope_and_layout', async () => {
  const server = await startServer({ port: 0 });
  let browser;
  const layouts = [], boundary = [];
  try {
    const html = await rawRequest(server.url, '/');
    assert.equal(html.status, 200);
    assert.match(html.headers['content-security-policy'], /default-src 'none'/);
    for (const directive of ["script-src 'self'", "style-src 'self'", "connect-src 'self'", "form-action 'none'", "frame-ancestors 'none'"]) assert(html.headers['content-security-policy'].includes(directive));
    assert(!html.headers['content-security-policy'].includes('unsafe-'));
    assert.equal(html.headers['x-content-type-options'], 'nosniff');
    assert.equal(html.headers['access-control-allow-origin'], undefined);
    const fixture = await rawRequest(server.url, '/demo-data.json');
    assert.deepEqual(JSON.parse(fixture.body), JSON.parse(await readFile(new URL('../../../contracts/prototype-v1/demo-data.json', import.meta.url))));
    for (const path of [
      '/../README.md', '/../../docs/STATUS.md', '/%2e%2e/README.md', '/%2E%2E%2fREADME.md',
      '/%252e%252e/README.md', '/..\\README.md', '/%5c..%5cREADME.md', '/%00',
      '//README.md', '/contracts/prototype-v1/demo-data.json', '/.git', '/.env',
      '/tests/', '/server.mjs', '/README', '/styles.css/../server.mjs', '/?path=../../README.md',
    ]) {
      const result = await rawRequest(server.url, path);
      boundary.push({ path, status: result.status });
      assert.equal(result.status, 404, `raw request must not expose ${path}`);
      assert.equal(result.body, 'Local demo resource unavailable.');
    }
    assert.equal((await rawRequest(server.url, '/', { method: 'POST' })).status, 405);
    assert.equal((await rawRequest(server.url, '/', { host: 'external.example' })).status, 403);
    const head = await rawRequest(server.url, '/', { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(head.body, '');
    for (const [width, height] of [[1440, 1000], [900, 800]]) {
      browser = await openBrowser({ width, height });
      const requests = [], exceptions = [], violations = [];
      browser.onEvent((event) => {
        if (event.method === 'Network.requestWillBeSent') requests.push(event.params.request.url);
        if (event.method === 'Runtime.exceptionThrown') exceptions.push(event.params.exceptionDetails.text);
        if (event.method === 'Log.entryAdded' && event.params.entry.source === 'security') violations.push(event.params.entry.text);
      });
      await browser.send('Network.enable'); await browser.send('Log.enable');
      await ready(browser, server.url);
      assert.equal((await browser.evaluate(rowIds)).length, 8);
      const layout = await browser.evaluate(`(() => ({
        width:innerWidth, height:innerHeight, clientWidth:document.documentElement.clientWidth, documentWidth:document.documentElement.scrollWidth,
        bodyWidth:document.body.scrollWidth,
        overflow:Array.from(document.querySelectorAll('body *')).filter(node => {
          if (!node.getClientRects().length) return false;
          const r=node.getBoundingClientRect(); return r.left < -1 || r.right > document.documentElement.clientWidth+1;
        }).map(node => node.id || node.tagName),
        controls:Array.from(document.querySelectorAll('button')).map(node => node.textContent.trim()),
        labels:Array.from(document.querySelectorAll('input, select')).every(node => document.querySelector('label[for="'+node.id+'"]')),
        fileInputs:document.querySelectorAll('input[type="file"]').length,
        externalAssets:Array.from(document.querySelectorAll('[src], link[href]')).map(node => node.src || node.href).filter(url => !url.startsWith(location.origin + '/')),
        badgeVisible:(() => {const r=document.querySelector('[data-testid="demo-badge"]').getBoundingClientRect(); return r.width>0 && r.top>=0 && r.bottom<=innerHeight;})(),
        body:document.body.textContent
      }))()`);
      assert.equal(layout.width, width); assert.equal(layout.height, height);
      assert(layout.documentWidth <= layout.clientWidth); assert(layout.bodyWidth <= layout.clientWidth);
      assert.deepEqual(layout.overflow, [], 'no element extends beyond viewport');
      assert.equal(layout.labels, true); assert.equal(layout.fileInputs, 0);
      assert.deepEqual(layout.externalAssets, []); assert.equal(layout.badgeVisible, true);
      assert(layout.controls.every((label) => !/^(清理|删除|迁移|扫描|上传|下载|执行)/.test(label)));
      assert.match(layout.body, /待去重/); assert.match(layout.body, /未估算/);
      assert(!/已释放\s*\d/.test(layout.body));
      await browser.screenshot(`.local/browser-lab/dashboard-${width}x${height}.png`);
      await click(browser, '[data-finding-id="vector-data"] button');
      assert.match(await text(browser, 'detail-panel'), /incomplete_evidence/);
      const detailWidth = await browser.evaluate('document.documentElement.scrollWidth');
      assert(detailWidth <= await browser.evaluate('document.documentElement.clientWidth'));
      if (width === 1440) await browser.screenshot('.local/browser-lab/detail-1440x1000.png');
      await key(browser, 'Escape', 'Escape', 27);
      await browser.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      assert.equal(await browser.evaluate(`(() => { const r=${element('demo-badge')}.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight; })()`), true, 'the read-only badge remains visible when scrolling');
      assert.deepEqual(exceptions, []); assert.deepEqual(violations, []);
      assert(requests.every((url) => url.startsWith(server.url + '/')), 'page requests stay on the local origin');
      const { body, ...observed } = layout;
      layouts.push({ ...observed, requests, exceptions, violations, detailWidth });
      await browser.close(); browser = undefined;
    }
    await writeFile(new URL('../../../.local/browser-lab/layout-dom.json', import.meta.url), JSON.stringify({ layouts, boundary }, null, 2));
  } finally {
    try { await browser?.close(); } finally { await server.close(); }
  }
  await assert.rejects(rawRequest(server.url, '/'), { code: 'ECONNREFUSED' });
});
