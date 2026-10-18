import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFileSync, readdirSync, mkdtempSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server.mjs';
import { openBrowser } from '../../../scripts/browser-lab.mjs';

const source = JSON.parse(readFileSync(new URL('../../../contracts/scan-review-v1/bundle.json', import.meta.url), 'utf8'));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const el = id => `document.getElementById(${JSON.stringify(id)})`;
const delay = ms => new Promise(r => setTimeout(r, ms));
function checks() {
  const failures = [];
  return { async run(label, fn) { try { await fn(); } catch (e) { failures.push(`${label}: ${e.message}`); } },
    done() { assert.equal(failures.length, 0, failures.join('\n')); } };
}
function caller(second = false) {
  const b = structuredClone(source);
  if (second) b.snapshots = [b.snapshots[8], b.snapshots[1], b.snapshots[9], b.snapshots[22]];
  b.snapshots[0].view.scan_id = second ? 'caller-beta' : 'caller-alpha';
  const f = b.snapshots[0].view.findings[0];
  f.title = f.relative_path = 'literal/<img src=x onerror=literal>';
  f.evidence_items[0].summary = 'EVIDENCE_CANARY_<script>literal</script>';
  f.evidence = f.evidence_items.map(e => e.summary).join('\n');
  return b;
}
function raw(url, path, {method = 'GET', host} = {}) {
  const parsed = new URL(url);
  return new Promise((ok, bad) => {
    const req = request({hostname:'127.0.0.1',port:parsed.port,path,method,headers:{Host:host ?? parsed.host}}, res => {
      const chunks = []; res.on('data', b => chunks.push(b));
      res.on('end', () => ok({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    }); req.on('error', bad); req.end();
  });
}
async function choose(b, id, value) {
  await b.evaluate(`(() => {const n=${el(id)};n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
async function click(b, selector) {
  const p = await b.evaluate(`(() => {const n=document.querySelector(${JSON.stringify(selector)});n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await b.send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...p});
  await b.send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...p});
}
async function key(b, key, code, windowsVirtualKeyCode) {
  await b.send('Input.dispatchKeyEvent', {type:'keyDown',key,code,windowsVirtualKeyCode,
    ...(key === 'Enter' ? {text:'\r',unmodifiedText:'\r'} : {})});
  await b.send('Input.dispatchKeyEvent', {type:'keyUp',key,code,windowsVirtualKeyCode});
}
async function download(b, ordinal) {
  const base = resolve(root, '.local/browser-lab');
  assert(lstatSync(base).isDirectory() && !lstatSync(base).isSymbolicLink());
  const dir = mkdtempSync(join(base, 'review-download-'));
  const rel = relative(realpathSync(root), realpathSync(dir)); assert(!rel.startsWith('..') && !isAbsolute(rel));
  await b.send('Page.setDownloadBehavior', {behavior:'allow',downloadPath:dir});
  await click(b, '#download');
  const until = Date.now() + 8000;
  let files;
  while (Date.now() < until) {
    files = readdirSync(dir);
    if (files.length && files.every(n => !n.endsWith('.crdownload'))) break;
    await delay(40);
  }
  if (!files?.length || files.some(n => n.endsWith('.crdownload'))) throw new Error('download timed out');
  // Actual attachment file, not fetch: keep each new private download directory.
  const data = readFileSync(join(dir, files[0]));
  console.log(JSON.stringify({actual_click:true,directory:dir,filename:files[0],bytes:data.length,expected_ordinal:ordinal}));
  return {files,data};
}
async function observe(b, url) {
  const seen = {requests:[],exceptions:[],errors:[]};
  await b.send('Network.enable'); await b.send('Log.enable');
  b.onEvent(e => {
    if (e.method === 'Network.requestWillBeSent') seen.requests.push(e.params.request.url);
    if (e.method === 'Runtime.exceptionThrown') seen.exceptions.push(e.params.exceptionDetails);
    if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
      const n = e.params.entry; if (!(n.url === url + '/favicon.ico' && n.text.includes('404'))) seen.errors.push(n.text);
    }
  });
  await b.goto(url); await b.waitFor('document.body.dataset.ready === "true"'); return seen;
}

test('review_live_input_and_download', async () => {
  const c = checks();
  for (const second of [false,true]) {
    const input = caller(second), expected = structuredClone(input);
    let server, b;
    try {
      server = await startServer({bundle:input});
      await c.run('T_BEHAVIOR startServer', () => { assert(server.server.listening); assert.deepEqual(input, expected); });
      input.snapshots[0].redacted_json = 'mutated'; input.snapshots[0].view.scan_id = 'mutated'; input.snapshots.pop();
      await c.run('T_BEHAVIOR immutable complete capture', async () => assert.deepEqual(JSON.parse((await raw(server.url,'/reports.json')).body), expected));
      b = await openBrowser(); const seen = await observe(b, server.url);
      await c.run('T_BEHAVIOR all caller snapshots', async () => assert.deepEqual(await b.evaluate(`Array.from(${el('snapshot')}.options,n=>n.value)`), expected.snapshots.map(s=>s.view.scan_id)));
      for (let i = 0; i < expected.snapshots.length; i++) {
        const s = expected.snapshots[i], ordinal = i + 1;
        await choose(b,'snapshot',s.view.scan_id);
        await c.run('T_BEHAVIOR complete current preview', async () => assert.equal(await b.evaluate(`${el('export-preview')}.textContent`), s.redacted_json));
        await c.run('T_BEHAVIOR status scopes and issues', async () => {
          const value = await b.evaluate(`({status:${el('status-banner')}.textContent,scopes:${el('coverage-summary')}.textContent,issues:${el('issues-summary')}.textContent})`);
          assert(value.status.includes(s.view.status) && value.status.includes(s.view.scan_id));
          for (const scope of s.view.scopes) assert(value.scopes.includes(scope.label) && value.scopes.includes(scope.coverage));
          for (const issue of s.view.issues) assert(value.issues.includes(issue.code) && value.issues.includes(issue.message));
          if (!s.view.findings.length) assert.equal(await b.evaluate(`${el('empty-state')}.hidden`),false);
        });
        const total = await b.evaluate(`${el('source-totals')}.textContent`);
        for (const [id,value] of [['search','no-match-literal'],['risk','protected'],['sort','name_asc']]) {
          await choose(b,id,value);
          await c.run('T_BEHAVIOR filters retain totals and Q', async () => {
            assert.equal(await b.evaluate(`${el('source-totals')}.textContent`),total);
            assert.equal(await b.evaluate(`${el('export-preview')}.textContent`),s.redacted_json);
          });
        }
        const saved = await download(b,ordinal);
        await c.run('T_SELECTED_EXPORT T_BEHAVIOR selected attachment', () => {
          assert.deepEqual(saved.files,[`water-report-${ordinal}.json`]);
          assert.deepEqual(saved.data,Buffer.from(s.redacted_json));
        });
        await c.run('T_REDACTED_ONLY T_BEHAVIOR no source data in actual download', () => {
          const q = JSON.parse(saved.data); assert.equal(q.export_version,'water.redacted-report.v1');
          for (const token of [s.view.scan_id,'EVIDENCE_CANARY','literal/<img','H_SCAN_CANARY','project/.cache/ruff']) assert(!saved.data.toString().includes(token));
        });
        await c.run('T_REDACTED_ONLY exact headers GET HEAD', async () => {
          for (const method of ['GET','HEAD']) {
            const res = await raw(server.url,`/exports/${ordinal}.json`,{method});
            assert.equal(res.status,200); assert.equal(res.headers['content-type'],'application/json;charset=utf-8');
            assert.equal(res.headers['content-disposition'],`attachment; filename="water-report-${ordinal}.json"`);
            assert.equal(res.headers['content-length'],String(Buffer.byteLength(s.redacted_json)));
            assert.deepEqual(res.body,method === 'HEAD' ? Buffer.alloc(0) : Buffer.from(s.redacted_json));
          }
        });
      }
      await c.run('T_BEHAVIOR no external requests or script errors', () => {
        assert.deepEqual(seen.exceptions,[]); assert.deepEqual(seen.errors,[]); assert(seen.requests.every(u=>u.startsWith(server.url+'/')));
      });
    } finally { try { await b?.close(); } finally { await server?.close(); } }
  }
  c.done();
});

test('review_layout_and_safety', async () => {
  const c = checks(), expected = caller(), server = await startServer({bundle:expected});
  let b;
  try {
    for (const path of ['/exports/0.json','/exports/01.json','/exports/25.json','/exports/1.json?x=1','/exports/1.json#x',
      '/exports/%31.json','/exports//1.json','//exports/1.json','/exports/../reports.json','/%2e%2e/README.md','/exports/1.json/extra',
      '/exports/1.json;raw','/exports/1.json%00','/exports\\1.json','/reports.json?x','/README.md','/../README.md','/styles.css?x']) {
      await c.run('T_BEHAVIOR raw route rejection '+path, async () => { const r = await raw(server.url,path); assert.equal(r.status,404); assert.equal(r.body.toString(),'Report resource unavailable.'); assert(!r.body.toString().includes(root)); });
    }
    for (const [options,status] of [[{method:'POST'},405],[{host:'localhost:'+new URL(server.url).port},403],[{host:'evil.invalid'},403]]) {
      await c.run('T_BEHAVIOR methods and Host', async () => assert.equal((await raw(server.url,'/exports/1.json',options)).status,status));
    }
    for (const path of ['/','/styles.css','/app.mjs','/model.mjs','/report-reader/model.mjs','/reports.json','/exports/1.json']) {
      await c.run('T_BEHAVIOR fixed resources security headers', async () => {
        const r = await raw(server.url,path), h = await raw(server.url,path,{method:'HEAD'});
        assert.equal(r.status,200); assert.equal(h.status,200); assert.equal(h.body.length,0); assert.equal(r.headers['content-length'],h.headers['content-length']);
        assert.equal(r.headers['cache-control'],'no-store'); assert.equal(r.headers['x-content-type-options'],'nosniff'); assert.equal(r.headers['referrer-policy'],'no-referrer');
        assert.equal(r.headers['access-control-allow-origin'],undefined);
        assert.equal(r.headers['content-security-policy'],"default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'");
      });
    }
    b = await openBrowser(); const seen = await observe(b,server.url);
    for (const [width,height] of [[1440,1000],[900,800]]) {
      await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await choose(b,'snapshot',expected.snapshots[0].view.scan_id);
      await b.evaluate('window.scrollTo(0,0)');
      await c.run('T_BEHAVIOR layout and allowed controls', async () => {
        const layout = await b.evaluate(`({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,labels:Array.from(document.querySelectorAll('input,select')).every(n=>document.querySelector('label[for="'+n.id+'"]')),files:document.querySelectorAll('input[type=file]').length,buttons:Array.from(document.querySelectorAll('button,a')).map(n=>n.textContent.trim()),text:document.body.textContent})`);
        assert.equal(layout.width,width); assert.equal(layout.height,height); assert(!layout.overflow); assert(layout.labels); assert.equal(layout.files,0);
        assert(layout.buttons.every(t=>!/^(删除|清理|迁移|扫描|上传|执行|导入|导出原始|选择目录)/.test(t)));
        assert(layout.text.includes('只读') && layout.text.includes('非真实用户目录') && layout.text.includes('不保证匿名'));
        assert.equal(await b.evaluate(`${el('download')}.textContent`),'下载脱敏报告');
      });
      await c.run('T_UNKNOWN_PRESERVED T_BEHAVIOR unknown source stays unknown', async () => assert((await b.evaluate(`${el('source-totals')}.textContent`)).includes('未知')));
      await c.run('T_BEHAVIOR HTML remains literal', async () => {
        assert.equal(await b.evaluate('document.querySelectorAll("img,svg,iframe,object,embed,script:not([src])").length'),0);
        assert((await b.evaluate(`${el('finding-list')}.textContent`)).includes('<img src=x onerror=literal>'));
        assert.equal(await b.evaluate('typeof window.literal'),'undefined');
      });
      await b.screenshot(`.local/browser-lab/scan-review-${width}x${height}.png`);
      // Enter and Escape exercise native dialog behavior and return to the same trigger.
      await b.evaluate(`document.querySelector('.detail-button').focus()`); await key(b,'Enter','Enter',13);
      await c.run('T_BEHAVIOR accessible complete E detail', async () => {
        assert.equal(await b.evaluate(`${el('detail')}.open`),true);
        const values = await b.evaluate(`Array.from(${el('detail-fields')}.querySelectorAll('dd'),n=>n.textContent)`);
        const finding = expected.snapshots[0].view.findings[0];
        assert.deepEqual(values,Object.values(finding).map(v=>typeof v==='string'?v:JSON.stringify(v,null,2)));
        assert.equal(await b.evaluate('document.querySelectorAll("img,script:not([src])").length'),0);
        assert.equal(await b.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),true);
      });
      await key(b,'Tab','Tab',9);
      await c.run('T_BEHAVIOR dialog traps focus', async () => assert.equal(await b.evaluate(`${el('detail')}.contains(document.activeElement)`),true));
      await key(b,'Escape','Escape',27);
      await c.run('T_BEHAVIOR Escape returns focus', async () => {
        assert.equal(await b.evaluate(`${el('detail')}.open`),false);
        assert.equal(await b.evaluate(`document.activeElement.classList.contains('detail-button')`),true);
      });
      await choose(b,'snapshot',expected.snapshots[8].view.scan_id);
      await c.run('T_BEHAVIOR full u64 decimal', async () => assert((await b.evaluate(`${el('source-totals')}.textContent`)).includes('18446744073709551615')));
      await choose(b,'snapshot',expected.snapshots[9].view.scan_id);
      await c.run('T_UNKNOWN_PRESERVED unknown total after selection', async () => assert((await b.evaluate(`${el('source-totals')}.textContent`)).includes('未知')));
      await choose(b,'snapshot',expected.snapshots[1].view.scan_id);
      for (const id of ['scope','tool','category','risk','sort']) {
        const values = await b.evaluate(`Array.from(${el(id)}.options,n=>n.value)`);
        await choose(b,id,values.at(-1));
        await c.run('T_BEHAVIOR every filter preserves full export', async () => assert.equal(await b.evaluate(`${el('export-preview')}.textContent`),expected.snapshots[1].redacted_json));
      }
      await click(b,'#reset-filters');
      await c.run('T_BEHAVIOR reset restores all findings', async () => assert.equal(await b.evaluate(`${el('visible-count')}.textContent`),'8 / 8'));
      await b.evaluate('window.scrollTo(0,document.body.scrollHeight)');
      await c.run('T_BEHAVIOR persistent readonly notice', async () => assert.equal(await b.evaluate(`(() => {const r=${el('readonly-badge')}.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})()`),true));
    }
    await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await b.evaluate(`${el('export-title')}.scrollIntoView({block:'start'})`);
    await b.screenshot('.local/browser-lab/scan-review-export.png');
    await c.run('T_BEHAVIOR no browser errors or external traffic', () => { assert.deepEqual(seen.exceptions,[]); assert.deepEqual(seen.errors,[]); assert(seen.requests.every(u=>u.startsWith(server.url+'/'))); });
  } finally { try { await b?.close(); } finally { await server.close(); } }
  c.done();
});
