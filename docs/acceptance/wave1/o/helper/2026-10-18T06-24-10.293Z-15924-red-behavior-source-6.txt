import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { startServer } from '../server.mjs';
import { openBrowser } from '../../../scripts/browser-lab.mjs';

const source = JSON.parse(readFileSync(new URL('../../../contracts/evidence-reader-v1/sessions.json', import.meta.url), 'utf8'));
const selector = id => `[data-testid="${id}"]`;
const element = id => `document.querySelector(${JSON.stringify(selector(id))})`;
const text = (browser, id) => browser.evaluate(`${element(id)}.textContent`);
const rowIds = 'Array.from(document.querySelectorAll("[data-finding-id]"), n => n.dataset.findingId)';
const fmt = value => value === null ? 'Unknown' : value + ' B';

// These caller memory variants preserve all source links; no scan or file input.
function callerBundle(second = false) {
  const b = structuredClone(source);
  if (second) b.snapshots = [b.snapshots[13], b.snapshots[16], b.snapshots[17]];
  const s = b.snapshots[0], id = second ? 'caller-beta' : 'caller-alpha';
  s.session.report.scan_id = s.session.view.scan_id = s.project_evidence.scan_id = s.size_ledger.scan_id = id;
  s.source_kind = 'synthetic_memory';
  const index = second ? 0 : 1;
  const path = 'literal/<img src=x onerror=literal>';
  const entry = s.session.source_facts.scopes[0].entries[index];
  entry.relative_path = path; entry.depth = 2;
  const f = s.session.view.findings[index], r = s.session.report.findings[index];
  f.relative_path = f.title = r.relative_path = path;
  f.evidence_items[0].summary = r.evidence[0].summary = '<script>literal</script>';
  f.evidence = f.evidence_items.map(e => e.summary).join('\n');
  for (const annotation of [s.project_evidence, s.size_ledger]) annotation.source_facts = structuredClone(s.session.source_facts);
  return b;
}
function raw(url, path, {method = 'GET', host} = {}) {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = request({hostname: '127.0.0.1', port: parsed.port, path, method, headers: {Host: host ?? parsed.host}}, res => {
      const chunks = []; res.on('data', b => chunks.push(b));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error', reject); req.end();
  });
}
async function choose(browser, id, value) {
  await browser.evaluate(`(() => {const n=${element(id)}; n.focus(); n.value=${JSON.stringify(value)}; n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
async function key(browser, name, code, virtualKey) {
  await browser.send('Input.dispatchKeyEvent', {type:'keyDown', key:name, code, windowsVirtualKeyCode:virtualKey});
  await browser.send('Input.dispatchKeyEvent', {type:'keyUp', key:name, code, windowsVirtualKeyCode:virtualKey});
}
async function click(browser, css) {
  const point = await browser.evaluate(`(() => {const n=document.querySelector(${JSON.stringify(css)});n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await browser.send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point});
  await browser.send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function search(browser, value) {
  await click(browser, selector('search-input'));
  await browser.evaluate(`${element('search-input')}.select()`);
  await key(browser, 'Backspace', 'Backspace', 8);
  if (value) await browser.send('Input.insertText', {text:value});
}
async function watch(browser, url) {
  const observed = {requests:[], exceptions:[], violations:[]};
  await browser.send('Network.enable'); await browser.send('Log.enable');
  browser.onEvent(event => {
    if (event.method === 'Network.requestWillBeSent') observed.requests.push(event.params.request.url);
    if (event.method === 'Runtime.exceptionThrown') observed.exceptions.push(event.params.exceptionDetails);
    if (event.method === 'Log.entryAdded' && event.params.entry.level === 'error') {
      const e = event.params.entry;
      if (!(e.url === url + '/favicon.ico' && e.text.includes('404'))) observed.violations.push(e.text);
    }
  });
  await browser.goto(url); await browser.waitFor('document.body.dataset.ready === "true"');
  return observed;
}
async function literal(browser) {
  assert.equal(await browser.evaluate('document.querySelectorAll("img,svg,iframe,object,embed,script:not([src])").length'), 0, 'O_TEXT_LITERAL: dynamic input must remain text');
  assert.equal(await browser.evaluate('typeof window.literal'), 'undefined', 'O_TEXT_LITERAL: no input execution');
}

test('evidence_reader_live_input', async () => {
  for (const second of [false, true]) {
    const input = callerBundle(second), expected = structuredClone(input);
    let server, browser;
    try {
      await assert.doesNotReject(async () => {server = await startServer({bundle:input});}, 'O_BEHAVIOR: real caller input must start');
      assert(server.server.listening);
      assert.deepEqual(input, expected);
      // Change both an object and array after startup: the service must own its bytes.
      input.snapshots[0].source_kind = 'mutated'; input.snapshots.pop();
      const captured = JSON.parse((await raw(server.url, '/evidence.json')).body);
      assert.deepEqual(captured, expected, 'O_SERVER_CAPTURE: immutable complete caller snapshots');
      browser = await openBrowser();
      const observed = await watch(browser, server.url);
      assert.deepEqual(await browser.evaluate(`Array.from(${element('session-select')}.options, n=>n.value)`), expected.snapshots.map(s => s.session.view.scan_id), 'O_SERVER_CAPTURE: every supplied snapshot reaches Chrome');
      assert.equal(await browser.evaluate(`${element('session-select')}.value`), second ? 'caller-beta' : 'caller-alpha');
      assert((await text(browser, 'status-banner')).includes(second ? 'caller-beta' : 'caller-alpha'));
      await literal(browser);
      assert((await text(browser, 'finding-list')).includes('<img src=x onerror=literal>'), 'O_TEXT_LITERAL: literal title visible');
      const trigger = `[data-finding-id="entry-${second ? 1 : 2}"] button`;
      await click(browser, trigger);
      const detail = await text(browser, 'detail-panel');
      for (const value of ['<script>literal</script>', 'unknown_ownership', 'incomplete_evidence', 'identity', 'size_ledger', 'project_evidence', 'source_kind', 'filename_only']) {
        if (value === 'filename_only' && second) continue;
        if (value === 'filename_only') continue; // This entry has no marker; candidate details checked below.
        assert(detail.includes(value), value);
      }
      await literal(browser);
      assert.equal(await browser.evaluate('document.activeElement.dataset.testid'), 'detail-close');
      await key(browser, 'Escape', 'Escape', 27);
      assert.equal(await browser.evaluate(`${element('detail-panel')}.open`), false);
      assert.equal(await browser.evaluate(`document.activeElement===document.querySelector(${JSON.stringify(trigger)})`), true);
      for (const s of expected.snapshots) {
        await choose(browser, 'session-select', s.session.view.scan_id);
        const m = s.size_ledger;
        assert((await text(browser, 'status-banner')).includes(s.session.view.scan_id));
        assert((await text(browser, 'status-banner')).includes(s.session.view.status));
        assert((await text(browser, 'source-kind')).includes(s.source_kind));
        assert.equal(await text(browser, 'summary-count'), String(s.session.view.findings.length));
        assert.equal(await text(browser, 'ledger-observed'), fmt(m.observed_file_logical_bytes));
        assert.equal(await text(browser, 'ledger-known'), fmt(m.known_identity_logical_bytes));
        assert.equal(await text(browser, 'ledger-unknown'), fmt(m.unknown_identity_observed_logical_bytes));
        assert.equal(await text(browser, 'ledger-deduplicated'), fmt(m.identity_deduplicated_logical_bytes), 'O_LEDGER_UNKNOWN: null deduplication must display Unknown');
        assert.equal(await text(browser, 'volume-unique'), 'Unknown');
        assert.equal(await text(browser, 'reclaimable'), 'Unknown');
        assert((await text(browser, 'identity-complete')).includes(String(m.observed_set_identity_complete)));
        assert((await text(browser, 'scope-complete')).includes(String(m.scope_coverage_complete)));
        assert((await text(browser, 'source-totals')).includes('unavailable'));
        assert((await text(browser, 'source-totals')).includes('Unknown'));
        assert.equal(await text(browser, 'visible-count'), `${s.session.view.findings.length} / ${s.session.view.findings.length}`);
        assert.equal((await browser.evaluate(rowIds)).length, s.session.view.findings.length);
        const groups = await text(browser, 'identity-groups');
        for (const g of m.identity_groups) {
          assert(groups.includes(g.state));
          for (const v of [...g.logical_byte_values, ...g.link_count_values]) assert(groups.includes(v));
          for (const r of g.entry_refs) assert(groups.includes(r.finding_id) && groups.includes(r.scope_id));
        }
        const candidates = await text(browser, 'annotations-candidates');
        for (const c of s.project_evidence.candidates) assert(candidates.includes(c.rule_id) && candidates.includes(c.relative_path));
        if (s.project_evidence.candidates.length) {
          assert(candidates.includes('filename_only') && candidates.includes('display_only') && candidates.includes('protected'));
          const c = s.project_evidence.candidates[0];
          await click(browser, `[data-finding-id="${c.finding_id}"] button`);
          const d = await text(browser, 'detail-panel');
          for (const k of Object.keys(c)) assert(d.includes(k), k);
          await click(browser, selector('detail-close'));
        }
        if (s.session.view.scan_id === 'pipeline-8') assert((await text(browser, 'issues-summary')).includes('scope 根'));
        if (s.session.view.scan_id === 'pipeline-11') {
          assert((await text(browser, 'issues-summary')).includes('无相对路径'));
          assert((await text(browser, 'empty-state')).includes('不表示磁盘为空'));
        }
        await literal(browser);
      }
      await choose(browser, 'session-select', expected.snapshots[0].session.view.scan_id);
      const totals = await text(browser, 'source-totals'), observedBytes = await text(browser, 'ledger-observed');
      await search(browser, 'no-match-water');
      assert.equal(await text(browser, 'visible-count'), '0 / ' + expected.snapshots[0].session.view.findings.length);
      assert.equal(await text(browser, 'source-totals'), totals);
      assert.equal(await text(browser, 'ledger-observed'), observedBytes);
      await click(browser, selector('reset-filters'));
      await choose(browser, 'risk-filter', 'low');
      assert.equal((await browser.evaluate(rowIds)).length, 0);
      await choose(browser, 'session-select', expected.snapshots[1].session.view.scan_id);
      assert.equal(await browser.evaluate(`${element('risk-filter')}.value`), 'all');
      assert.equal(await browser.evaluate(`${element('search-input')}.value`), '');
      assert.deepEqual(observed.exceptions, []); assert.deepEqual(observed.violations, []);
      assert(observed.requests.every(u => u.startsWith(server.url + '/')));
    } finally { try {await browser?.close();} finally {await server?.close();} }
    await assert.rejects(raw(server.url, '/'), {code:'ECONNREFUSED'});
  }
});

test('evidence_reader_layout_and_safety', async () => {
  const expectedError = {name:'Error', message:'Unsupported evidence bundle.'};
  async function rejectsStart(options, error) {
    let opened;
    try {await assert.rejects((async () => {opened = await startServer(options);})(), error);}
    finally {await opened?.close();}
  }
  await rejectsStart(undefined, expectedError);
  const b = callerBundle();
  for (const port of [-1, 65536, 0.5, '0', null]) await rejectsStart({bundle:b, port}, {name:'RangeError',message:'Invalid local port'});
  const bad = structuredClone(b); bad.snapshots[0].size_ledger.reclaimable_bytes = '0';
  await rejectsStart({bundle:bad}, expectedError);
  let server, browser;
  try {
    await assert.doesNotReject(async () => {server = await startServer({bundle:b});}, 'O_BEHAVIOR: valid server');
    const csp = "default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'";
    const routes = new Map([['/','text/html'],['/styles.css','text/css'],['/app.mjs','text/javascript'],['/model.mjs','text/javascript'],['/lab-reader/model.mjs','text/javascript'],['/report-reader/model.mjs','text/javascript'],['/evidence.json','application/json']]);
    for (const [path,type] of routes) {
      const r = await raw(server.url,path);
      assert.equal(r.status,200,path); assert(r.headers['content-type'].startsWith(type));
      assert.equal(r.headers['content-security-policy'],csp); assert.equal(r.headers['cache-control'],'no-store');
      assert.equal(r.headers['x-content-type-options'],'nosniff'); assert.equal(r.headers['access-control-allow-origin'],undefined);
      const h = await raw(server.url,path,{method:'HEAD'});
      assert.equal(h.status,200); assert.equal(h.body,''); assert.equal(h.headers['content-length'],r.headers['content-length']);
      for (const method of ['POST','PUT','DELETE','OPTIONS']) {const denied=await raw(server.url,path,{method});assert.equal(denied.status,405);assert.equal(denied.headers.allow,'GET, HEAD');}
      assert.equal((await raw(server.url,path,{host:'external.example'})).status,403);
      assert.equal((await raw(server.url,path+'?x=1')).status,404);
    }
    for (const name of ['lab-reader','report-reader']) assert.equal((await raw(server.url,`/${name}/model.mjs`)).body,readFileSync(new URL(`../../${name}/model.mjs`,import.meta.url),'utf8'));
    for (const host of ['localhost:'+new URL(server.url).port,'127.0.0.1:1',new URL(server.url).host+'.evil']) assert.equal((await raw(server.url,'/',{host})).status,403);
    for (const path of ['/../README.md','/%2e%2e/README.md','/%2E%2E%2fREADME.md','/%252e%252e/README.md','/..\\README.md','/%5c..%5cREADME.md','/%00','//evidence.json','/evidence.json#fragment','/contracts/evidence-reader-v1/sessions.json','/.git','/.env','/tests/','/server.mjs','/README.md','/styles.css/../server.mjs','/?path=../../README.md','/index.html','/app.mjs/','/sessions.json']) {
      const r=await raw(server.url,path);assert.equal(r.status,404,path);assert.equal(r.body,'Report resource unavailable.');assert(!r.body.includes('F:'));
    }
    for (const [width,height] of [[1440,1000],[900,800]]) {
      browser=await openBrowser({width,height});const observed=await watch(browser,server.url);
      const layout=await browser.evaluate(`(() => ({width:innerWidth,height:innerHeight,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,
        overflow:Array.from(document.querySelectorAll('body *')).filter(n=>{if(!n.getClientRects().length)return false;const r=n.getBoundingClientRect();return r.left < -1 || r.right > document.documentElement.clientWidth+1;}).map(n=>n.id||n.tagName),
        labels:Array.from(document.querySelectorAll('input,select')).every(n=>document.querySelector('label[for="'+n.id+'"]')),
        controls:Array.from(document.querySelectorAll('button')).map(n=>n.textContent.trim()),files:document.querySelectorAll('input[type=file]').length,links:document.querySelectorAll('a[href]').length,
        external:Array.from(document.querySelectorAll('[src],link[href]')).map(n=>n.src||n.href).filter(u=>!u.startsWith(location.origin+'/')),text:document.body.textContent}))()`);
      assert.equal(layout.width,width);assert.equal(layout.height,height);assert(layout.scroll<=layout.client&&layout.body<=layout.client);assert.deepEqual(layout.overflow,[]);assert(layout.labels);
      assert.equal(layout.files,0);assert.equal(layout.links,0);assert.deepEqual(layout.external,[]);
      assert(layout.controls.every(v=>!/^(清理|删除|迁移|扫描|上传|下载|执行|导入|导出|选择目录)/.test(v)));
      assert(layout.text.includes('非真实用户目录'));assert(layout.text.includes('只读'));
      await literal(browser);await browser.screenshot(`.local/browser-lab/evidence-reader-${width}x${height}.png`);
      await click(browser,'[data-finding-id="entry-2"] button');await literal(browser);
      assert.equal(await browser.evaluate(`${element('detail-panel')}.open`),true);
      assert((await text(browser,'detail-panel')).includes('<script>literal</script>'),'O_TEXT_LITERAL: detail remains literal');
      assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),true);
      if(width===1440)await browser.screenshot('.local/browser-lab/evidence-reader-detail.png');
      await key(browser,'Tab','Tab',9);
      assert.equal(await browser.evaluate(`${element('detail-panel')}.contains(document.activeElement)`),true);
      await key(browser,'Escape','Escape',27);
      await browser.evaluate('window.scrollTo(0,document.body.scrollHeight)');
      assert.equal(await browser.evaluate(`(() => {const r=${element('readonly-badge')}.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})()`),true);
      assert.deepEqual(observed.exceptions,[]);assert.deepEqual(observed.violations,[]);assert(observed.requests.every(u=>u.startsWith(server.url+'/')));
      await browser.close();browser=undefined;
    }
  } finally {try{await browser?.close();}finally{await server?.close();}}
});
