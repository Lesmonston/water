import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFile } from 'node:fs/promises';
import { startServer } from '../server.mjs';
import { openBrowser } from '../../../scripts/browser-lab.mjs';

const selector = (id) => `[data-testid="${id}"]`;
const element = (id) => `document.querySelector(${JSON.stringify(selector(id))})`;
const rowIds = 'Array.from(document.querySelectorAll(\'[data-testid="finding-row"]\'), row => row.dataset.findingId)';
const text = (browser, id) => browser.evaluate(`${element(id)}.textContent`);
const sizeAsc = ['zero', 'scope-root', 'duplicate-title', 'big-after', 'big-before', 'max', 'unknown-first', 'unknown-last'];

async function key(browser, name, code, virtualKey) {
  await browser.send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: name, code, windowsVirtualKeyCode: virtualKey,
    ...(name === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
  });
  await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: virtualKey });
}
async function click(browser, css) {
  const point = await browser.evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(css)});
    node.scrollIntoView({ block: 'center' });
    const rect = node.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function choose(browser, id, value) {
  await browser.evaluate(`(() => {
    const select = ${element(id)};
    select.focus();
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
}
async function search(browser, value) {
  await click(browser, selector('search-input'));
  await browser.evaluate(`${element('search-input')}.select()`);
  await key(browser, 'Backspace', 'Backspace', 8);
  if (value) await browser.send('Input.insertText', { text: value });
}
async function ready(browser, url) {
  await browser.goto(url);
  await browser.waitFor(`document.readyState === 'complete' && ${element('status-banner')} && !${element('status-banner')}.textContent.includes('正在载入')`);
}
function rawRequest(url, path, { method = 'GET', host } = {}) {
  const target = new URL(url);
  return new Promise((accept, reject) => {
    const req = request({
      hostname: target.hostname, port: target.port, path, method, headers: host ? { Host: host } : {},
    }, (response) => {
      const chunks = [];
      response.on('data', (part) => chunks.push(part));
      response.on('end', () => accept({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}
async function watch(browser, url) {
  const requests = [];
  const exceptions = [];
  const violations = [];
  browser.onEvent((event) => {
    if (event.method === 'Network.requestWillBeSent') requests.push(event.params.request.url);
    if (event.method === 'Runtime.exceptionThrown') exceptions.push(event.params.exceptionDetails.text);
    if (event.method === 'Log.entryAdded' && event.params.entry.source === 'security') violations.push(event.params.entry.text);
  });
  await browser.send('Network.enable');
  await browser.send('Log.enable');
  await ready(browser, url);
  return { requests, exceptions, violations };
}

test('reader_live_interactions', async () => {
  const server = await startServer({ port: 0 });
  let browser;
  try {
    browser = await openBrowser({ width: 1440, height: 1000 });
    await ready(browser, server.url);
    assert.equal(await text(browser, 'readonly-badge'), '合成报告 · 只读');
    assert.equal(await browser.evaluate(`${element('report-select')}.value`), 'composite_partial');
    assert.deepEqual(await browser.evaluate(rowIds), ['max', 'big-before', 'big-after', 'duplicate-title', 'scope-root', 'zero', 'unknown-first', 'unknown-last']);
    assert.equal(await text(browser, 'summary-count'), '8');
    assert.equal(await text(browser, 'protected-count'), '4');
    assert.match(await text(browser, 'status-banner'), /partial/);
    assert.match(await text(browser, 'source-totals'), /37/);
    assert.match(await text(browser, 'source-totals'), /file_identity_deduplicated/);
    assert.match(await text(browser, 'source-totals'), /非本页求和/);
    assert.match(await text(browser, 'coverage-summary'), /scope-1/);
    assert.match(await text(browser, 'coverage-summary'), /partial/);
    assert.match(await text(browser, 'issues-summary'), /permission_denied/);
    assert.deepEqual((await browser.evaluate('Array.from(document.querySelectorAll("[data-risk]"), node => node.dataset.risk)')).sort(), ['high', 'low', 'protected', 'protected', 'protected', 'protected', 'review', 'review']);
    assert.deepEqual([...new Set(await browser.evaluate('Array.from(document.querySelectorAll("[data-activity]"), node => node.dataset.activity)'))].sort(), ['not_observed', 'recent', 'running', 'unknown']);
    assert.deepEqual([...new Set(await browser.evaluate('Array.from(document.querySelectorAll("[data-recoverability]"), node => node.dataset.recoverability)'))].sort(), ['conditional', 'not_applicable', 'rebuild', 'redownload', 'unknown']);

    await search(browser, 'SAME');
    await choose(browser, 'scope-filter', 'scope-2');
    await choose(browser, 'tool-filter', 'tool:ruff');
    await choose(browser, 'category-filter', 'build_cache');
    await choose(browser, 'risk-filter', 'review');
    assert.deepEqual(await browser.evaluate(rowIds), ['duplicate-title']);
    assert.equal(await text(browser, 'summary-count'), '8');
    assert.match(await text(browser, 'source-totals'), /37/);
    assert.match(await text(browser, 'visible-count'), /1 \/ 8/);
    await choose(browser, 'risk-filter', 'low');
    assert.deepEqual(await browser.evaluate(rowIds), []);
    assert.equal(await browser.evaluate(`${element('empty-state')}.hidden`), false);
    await click(browser, selector('empty-reset'));
    assert.deepEqual(await browser.evaluate(rowIds), ['max', 'big-before', 'big-after', 'duplicate-title', 'scope-root', 'zero', 'unknown-first', 'unknown-last']);
    assert.equal(await browser.evaluate(`${element('search-input')}.value`), '');
    for (const id of ['scope-filter', 'tool-filter', 'category-filter', 'risk-filter']) assert.equal(await browser.evaluate(`${element(id)}.value`), 'all');

    await choose(browser, 'sort-select', 'size_asc');
    assert.deepEqual(await browser.evaluate(rowIds), sizeAsc, '2^53 must sort before 2^53+1');
    await choose(browser, 'sort-select', 'name_asc');
    assert.deepEqual((await browser.evaluate(rowIds)).slice(-2), ['unknown-last', 'unknown-first']);
    await click(browser, selector('reset-filters'));
    assert.equal(await browser.evaluate(`${element('sort-select')}.value`), 'size_desc');

    const trigger = '[data-finding-id="max"] button';
    await browser.evaluate(`document.querySelector(${JSON.stringify(trigger)}).focus()`);
    await key(browser, 'Enter', 'Enter', 13);
    assert.equal(await browser.evaluate(`${element('detail-panel')}.open`), true);
    assert.equal(await browser.evaluate('document.querySelectorAll("img").length'), 0, 'HTML literal must not create an img element');
    assert.equal(await browser.evaluate('document.querySelectorAll("script").length'), 1, 'HTML literal must not create a script element');
    assert.equal(await text(browser, 'detail-path'), 'project/模型 %2e%2e/<tag>');
    const details = await text(browser, 'detail-panel');
    for (const label of ['合成报告 · 只读', 'source_tool', 'evidence_items', '<script>literal text</script>', 'Unicode 模型 and %2e%2e stay literal', 'unique_asset', 'rule_version', '18446744073709551615']) {
      assert(details.includes(label), label);
    }
    assert.equal(await browser.evaluate('document.body.textContent.includes("<img src=x onerror=literal>")'), true);
    assert.equal(await browser.evaluate('document.activeElement.dataset.testid'), 'detail-close');
    await browser.screenshot('.local/browser-lab/reader-detail.png');
    await key(browser, 'Escape', 'Escape', 27);
    assert.equal(await browser.evaluate(`${element('detail-panel')}.open`), false);
    assert.equal(await browser.evaluate(`document.activeElement === document.querySelector(${JSON.stringify(trigger)})`), true);
    await click(browser, trigger);
    await click(browser, selector('detail-close'));
    assert.equal(await browser.evaluate(`${element('detail-panel')}.open`), false);

    await choose(browser, 'report-select', 'cancelled');
    assert.match(await text(browser, 'status-banner'), /cancelled/);
    assert.deepEqual(await browser.evaluate(rowIds), ['finding-1']);
    assert.match(await text(browser, 'issues-summary'), /Synthetic cancelled input/);
    assert.match(await text(browser, 'source-totals'), /未知/);
    assert.doesNotMatch(await text(browser, 'source-totals'), /0 B/);
    await choose(browser, 'report-select', 'empty_completed');
    assert.match(await text(browser, 'status-banner'), /completed/);
    assert.deepEqual(await browser.evaluate(rowIds), []);
    assert.equal(await text(browser, 'summary-count'), '0');
    await choose(browser, 'report-select', 'base');
    assert.deepEqual(await browser.evaluate(rowIds), ['finding-1']);
    assert.match(await text(browser, 'status-banner'), /completed/);
    assert.doesNotMatch(await text(browser, 'source-totals'), /9007199254740993/);
    await choose(browser, 'report-select', 'composite_partial');
    assert.equal((await browser.evaluate(rowIds)).length, 8);
    assert.match(await text(browser, 'source-totals'), /37/);
  } finally {
    try { await browser?.close(); } finally { await server.close(); }
  }
  await assert.rejects(rawRequest(server.url, '/'), { code: 'ECONNREFUSED' });
});

test('reader_scope_layout_and_readonly', async () => {
  const server = await startServer({ port: 0 });
  let browser;
  try {
    const html = await rawRequest(server.url, '/');
    assert.equal(html.status, 200);
    assert.equal(html.headers['content-security-policy'], "default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'");
    assert.equal(html.headers['content-security-policy'].includes('unsafe-'), false);
    assert.equal(html.headers['x-content-type-options'], 'nosniff');
    assert.equal(html.headers['access-control-allow-origin'], undefined);
    const fixture = await rawRequest(server.url, '/reports.json');
    assert.equal(fixture.body, await readFile(new URL('../../../contracts/report-reader-v1/reports.json', import.meta.url), 'utf8'));
    for (const path of [
      '/../README.md', '/../../docs/STATUS.md', '/%2e%2e/README.md', '/%2E%2E%2fREADME.md',
      '/%252e%252e/README.md', '/..\\README.md', '/%5c..%5cREADME.md', '/%00',
      '//README.md', '/contracts/report-reader-v1/reports.json', '/.git', '/.env',
      '/tests/', '/server.mjs', '/README.md', '/styles.css/../server.mjs', '/?path=../../README.md',
      '/reports.json?x=1', '/index.html', '/app.mjs/',
    ]) {
      const result = await rawRequest(server.url, path);
      assert.equal(result.status, 404, path);
      assert.equal(result.body, 'Report resource unavailable.');
    }
    assert.equal((await rawRequest(server.url, '/', { method: 'POST' })).status, 405);
    assert.equal((await rawRequest(server.url, '/reports.json', { method: 'PUT' })).status, 405);
    assert.equal((await rawRequest(server.url, '/', { host: 'external.example' })).status, 403);
    const head = await rawRequest(server.url, '/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.body, '');

    for (const [width, height] of [[1440, 1000], [900, 800]]) {
      browser = await openBrowser({ width, height });
      const observed = await watch(browser, server.url);
      assert.equal((await browser.evaluate(rowIds)).length, 8);
      const layout = await browser.evaluate(`(() => ({
        width: innerWidth,
        height: innerHeight,
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        overflow: Array.from(document.querySelectorAll('body *')).filter((node) => {
          if (!node.getClientRects().length) return false;
          const rect = node.getBoundingClientRect();
          return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
        }).map((node) => node.id || node.tagName),
        controls: Array.from(document.querySelectorAll('button, select option')).map((node) => node.textContent.trim()),
        labels: Array.from(document.querySelectorAll('input, select')).every((node) => document.querySelector('label[for="' + node.id + '"]')),
        fileInputs: document.querySelectorAll('input[type="file"]').length,
        links: document.querySelectorAll('a[href]').length,
        externalAssets: Array.from(document.querySelectorAll('[src], link[href]')).map((node) => node.src || node.href).filter((url) => !url.startsWith(location.origin + '/')),
        badgeVisible: (() => { const rect = document.querySelector('[data-testid="readonly-badge"]').getBoundingClientRect(); return rect.width > 0 && rect.top >= 0 && rect.bottom <= innerHeight; })(),
        body: document.body.textContent
      }))()`);
      assert.equal(layout.width, width);
      assert.equal(layout.height, height);
      assert(layout.documentWidth <= layout.clientWidth);
      assert(layout.bodyWidth <= layout.clientWidth);
      assert.deepEqual(layout.overflow, []);
      assert.equal(layout.labels, true);
      assert.equal(layout.fileInputs, 0);
      assert.equal(layout.links, 0);
      assert.deepEqual(layout.externalAssets, []);
      assert.equal(layout.badgeVisible, true);
      assert(layout.controls.every((label) => !/^(清理|删除|迁移|扫描|上传|下载|执行|导入)/.test(label)));
      assert.match(layout.body, /合成报告 · 只读/);
      assert.match(layout.body, /非本页求和/);
      assert.match(layout.body, /low/);
      assert.match(layout.body, /high/);
      assert.equal(/已释放\s*\d/.test(layout.body), false);
      await browser.screenshot(`.local/browser-lab/reader-${width}x${height}.png`);
      await click(browser, '[data-finding-id="max"] button');
      const detailWidth = await browser.evaluate('document.documentElement.scrollWidth');
      assert(detailWidth <= await browser.evaluate('document.documentElement.clientWidth'));
      assert.equal(await browser.evaluate('document.querySelectorAll("img, script:not([src])").length'), 0, 'HTML literal must not create img or script elements');
      assert.match(await text(browser, 'detail-panel'), /<script>literal text<\/script>/);
      await key(browser, 'Escape', 'Escape', 27);
      await browser.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      assert.equal(await browser.evaluate(`(() => { const rect = ${element('readonly-badge')}.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; })()`), true);
      assert.deepEqual(observed.exceptions, []);
      assert.deepEqual(observed.violations, []);
      assert(observed.requests.every((url) => url.startsWith(`${server.url}/`)));
      await browser.close();
      browser = undefined;
    }
  } finally {
    try { await browser?.close(); } finally { await server.close(); }
  }
});
