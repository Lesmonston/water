import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { startFromStreams } from '../transport.mjs';
import { openPrivateBrowser } from '../../../scripts/acceptance/native-vw-private-browser.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const cases = JSON.parse(readFileSync(new URL('../../../contracts/project-session-v1/CASES.json', import.meta.url))).cases;
const late = JSON.parse(readFileSync(new URL('../../../contracts/project-workspace-addendum-v1/CASES.json', import.meta.url))).accept;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('project_report_layout_and_downloads', async () => {
  const lab = join(root, '.local/browser-lab'); mkdirSync(lab, { recursive: true });
  const directory = mkdtempSync(join(lab, 'project-report-')), receipts = [], ports = [];
  let browser;
  try {
    browser = await openPrivateBrowser();
    console.log(JSON.stringify({ directory, privateChromeProfile: browser.profile, maximumConcurrentChrome: 1, systemNativeDialogs: 0,
      envelope: 'Frozen real P/R/E/H/Q/Z and AA late capture with synthetic dialog envelope; partial is a memory variant.', newAAExecuted: false, physicalFixtureAccess: false }));
    const examples = [
      ['default', cases[0]], ['observed', cases[1]], ['late-completed', late[0].event], ['late-partial', late[1].event],
      ['cancelled', cases[2]], ['missing', cases[3]], ['failed', cases[4]], ['selection-cancelled', cases[6]],
    ];
    for (const [name, base] of examples) {
      const input = new PassThrough({ autoDestroy: false }), commands = [];
      const output = new Writable({ write(bytes, _, done) { commands.push(JSON.parse(bytes)); done(); } });
      const emit = e => input.write(Buffer.from(JSON.stringify({ version: 'water.project-host.v1', ...e }) + '\n'));
      const pending = startFromStreams({ input, output }); emit({ kind: 'ready' }); const workspace = await pending;
      ports.push(new URL(workspace.url).port);
      try {
        await browser.size(1440, 1000); await browser.goto(workspace.url);
        await browser.waitFor('document.body.dataset.ready === "true"');
        assert.equal(await browser.evaluate('document.getElementById("read-manifest").checked'), false);
        if (base.read_manifest) await browser.click('#read-manifest');
        await browser.click('#start');
        await browser.waitFor('document.body.dataset.active === "true"');
        assert.equal(await browser.evaluate('document.getElementById("read-manifest").disabled && !document.getElementById("read-manifest").checked'), true);
        const id = commands[0].job_id, event = structuredClone(base);
        event.job_id = event.bundle.session_id = id;
        if (event.bundle.snapshots.length) event.bundle.snapshots[0].view.scan_id = id;
        emit({ kind: 'accepted', job_id: id, read_manifest: base.read_manifest });
        if (name === 'cancelled' || name.startsWith('late-')) {
          await browser.waitFor('!document.getElementById("cancel").disabled');
          await browser.click('#cancel');
          await browser.waitFor('fetch("/session.json").then(r=>r.json()).then(s=>s.active?.phase === "cancelling")');
          assert.equal(commands.at(-1).command, 'cancel'); emit({ kind: 'cancel_ack', job_id: id, applied: true });
        }
        emit(event);
        await browser.waitFor('document.body.dataset.active === "false" && document.querySelectorAll(".recent-entry").length === 1');
        assert.equal(await browser.evaluate('document.getElementById("read-manifest").checked'), false);
        if (name === 'selection-cancelled') {
          assert.equal(await browser.evaluate('document.querySelectorAll(".recent-entry a").length'), 0);
          assert.equal(await browser.evaluate(`fetch('/reports/${id}/session.json').then(r=>r.status)`), 404);
          continue;
        }
        assert.equal(await browser.evaluate('document.querySelector(".project-report-link").getAttribute("href")'), '/reports/' + id + '/');
        await browser.click('.project-report-link');
        await browser.waitFor(`location.pathname === '/reports/${id}/' && document.body.dataset.ready === 'true'`);
        assert.equal(await browser.evaluate('document.getElementById("metadata-preview").textContent'), event.bundle.snapshots[0].redacted_json);
        const expectedTitle = { completed: '扫描完成', partial: '保留部分结果', cancelled: '扫描已取消' }[event.bundle.snapshots[0].view.status];
        assert.equal(await browser.evaluate('document.getElementById("report-title").textContent'), expectedTitle);
        const observed = event.marker.status === 'observed';
        assert.equal(await browser.evaluate('!document.getElementById("structure-panel").hidden'), observed);
        if (!observed) assert.equal(await browser.evaluate('document.getElementById("download-evidence").hasAttribute("href")'), false);
        const content = await browser.evaluate('document.getElementById("marker-status").textContent');
        if (name.startsWith('late-')) { assert(content.includes('已取消内容读取 · 未读取清单')); assert(!content.includes('扫描取消')); }
        if (name === 'cancelled') assert(content.includes('扫描取消未读'));
        if (name === 'default') assert(content.includes('未请求读取'));
        if (name === 'missing') assert(content.includes('未发现根清单'));
        if (name === 'failed') assert(content.includes('读取失败'));
        if (observed) {
          assert.equal(await browser.evaluate('document.getElementById("evidence-preview").textContent'), event.marker.observation_json);
          const o = JSON.parse(event.marker.observation_json);
          const structure = await browser.evaluate('document.getElementById("structure-panel").innerText');
          assert(structure.includes(o.bytes_read + ' B') && structure.includes('仅结构统计；归属和版本未知，不证明可删'));
          const counts = await browser.evaluate('Array.from(document.querySelectorAll("#structure-counts dd"), e=>e.textContent)');
          assert.deepEqual(counts.slice(5), Object.values(o.evidence.counts).map(String));
        }
        for (const [width, height] of [[1440, 1000], [900, 800]]) {
          await browser.size(width, height); await browser.evaluate('window.scrollTo(0,0)');
          const layout = await browser.evaluate(`({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
            width:innerWidth,height:innerHeight,text:document.body.innerText,frames:document.querySelectorAll('iframe,input[type=file],button').length})`);
          assert.equal(layout.width, width); assert.equal(layout.height, height); assert.equal(layout.overflow, false); assert.equal(layout.frames, 0);
          for (const text of ['分配空间', '可回收空间', '未知', '覆盖边界', 'native_scope_metadata', '不保证匿名']) assert(layout.text.includes(text));
          assert(!/body-canary|X-Water-Action|\.exe/.test(layout.text));
          const path = join(directory, name + '-' + width + 'x' + height + '.png');
          writeFileSync(path, await browser.screenshot(), { flag: 'wx' }); console.log(JSON.stringify({ screenshot: path }));
          await browser.evaluate('document.getElementById("marker-status").scrollIntoView({block:"center"})');
          const detailPath = join(directory, name + '-content-' + width + 'x' + height + '.png');
          writeFileSync(detailPath, await browser.screenshot(), { flag: 'wx' }); console.log(JSON.stringify({ screenshot: detailPath }));
        }
        for (const [selector, filename, original] of [
          ['#download-metadata', 'water-report-1.json', event.bundle.snapshots[0].redacted_json],
          ...(observed ? [['#download-evidence', 'water-project-evidence.json', event.marker.observation_json]] : []),
        ]) {
          const download = mkdtempSync(join(directory, name + '-download-'));
          await browser.downloadDirectory(download); await browser.click(selector);
          for (let i = 0; i < 320; i++) { const names = readdirSync(download); if (names.length && names.every(n => !n.endsWith('.crdownload'))) break; await delay(25); }
          assert.deepEqual(readdirSync(download), [filename], 'AD_BEHAVIOR actual mouse attachment download');
          const path = join(download, filename), bytes = readFileSync(path); assert.deepEqual(bytes, Buffer.from(original));
          const receipt = { name, job_id: id, source: path, filename, bytes: bytes.length, sha256: digest(bytes), actualMouseClick: true, originalBytesEqual: true };
          receipts.push(receipt); writeFileSync(join(download, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n'); console.log(JSON.stringify(receipt));
        }
        const resources = await browser.evaluate('performance.getEntriesByType("resource").map(e=>e.name)');
        assert(resources.every(u => u.startsWith(workspace.url + '/')));
        assert.equal(await browser.evaluate('document.querySelector(".back-link").getAttribute("href")'), '/');
        await browser.click('.back-link'); await browser.waitFor('location.pathname === "/" && document.body.dataset.ready === "true"');
      } finally {
        await workspace.close(); assert(!input.destroyed && !output.destroyed); input.destroy(); output.destroy();
        await assert.rejects(fetch(workspace.url));
      }
    }
  } finally {
    await browser?.close();
    const close = { ports, portsClosed: true, privateChromeClosed: true, systemNativeDialogs: 0, forcedWorkspaceTerminations: 0, downloads: receipts };
    writeFileSync(join(directory, 'close.json'), JSON.stringify(close, null, 2) + '\n'); console.log(JSON.stringify({ close: join(directory, 'close.json'), ...close }));
  }
});
