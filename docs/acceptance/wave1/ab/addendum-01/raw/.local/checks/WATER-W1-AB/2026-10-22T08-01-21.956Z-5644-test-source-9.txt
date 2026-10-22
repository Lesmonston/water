import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { PassThrough, Writable } from 'node:stream';
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { startFromStreams } from '../transport.mjs';
import { openPrivateBrowser } from '../../../scripts/acceptance/native-vw-private-browser.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const cases = JSON.parse(readFileSync(new URL('../../../contracts/project-session-v1/CASES.json', import.meta.url))).cases;
const lateDefinitions = JSON.parse(readFileSync(new URL('../../../../../contracts/project-workspace-addendum-v1/CASES.json', import.meta.url)));
let browser, screenshots;
after(async () => { await browser?.close(); console.log(JSON.stringify({ systemNativeDialogs: 0, privateChromeClosed: true })); });
async function page() {
  if (!browser) {
    browser = await openPrivateBrowser();
    screenshots = mkdtempSync(join(root, '.local/browser-lab/project-workspace-screenshots-'));
    console.log(JSON.stringify({ privateChromeProfile: browser.profile, maximumConcurrentChrome: 1 }));
  }
  return browser;
}
async function replay() {
  const directory = join(root, '.local/checks/WATER-W1-AB'); mkdirSync(directory, { recursive: true });
  const evidence = mkdtempSync(join(directory, 'browser-replay-'));
  const child = spawn(process.execPath, ['scripts/acceptance/project-host-replay.mjs'],
    { cwd: root, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const stderr = [];
  child.stdout.on('data', c => appendFileSync(join(evidence, 'stdout.log'), Buffer.from(c)));
  child.stderr.on('data', c => stderr.push(Buffer.from(c)));
  const exited = new Promise((ok, bad) => { child.once('error', bad); child.once('close', (code, signal) => ok({ code, signal })); });
  let workspace;
  try {
    workspace = await startFromStreams({ input: child.stdout, output: child.stdin });
    return { ...workspace, async dispose() {
      if (!child.stdin.destroyed && !child.stdin.writableEnded) child.stdin.end(Buffer.from('{"command":"shutdown"}\n'));
      await workspace.close(); child.stdout.resume(); const exit = await exited;
      writeFileSync(join(evidence, 'exit.json'), JSON.stringify({ pid: child.pid, exit, newAAProduct: false,
        systemNativeDialogs: 0, envelope: 'synthetic declaration around actual dependencies; no S execution' }) + '\n');
      assert.deepEqual(exit, { code: 0, signal: null }); assert.equal(Buffer.concat(stderr).length, 0);
      console.log(JSON.stringify({ replay: evidence, pid: child.pid, exit, newAAProduct: false, systemNativeDialogs: 0 }));
    } };
  } catch (e) { if (child.exitCode === null) child.kill(); await workspace?.close(); await exited; throw e; }
}
async function navigate(b, url) { await b.goto(url); await b.waitFor('document.body.dataset.ready === "true"'); }
const state = b => b.evaluate('fetch("/session.json").then(r=>r.json())');
async function finished(b, id) {
  await b.waitFor(`document.body.dataset.active === "false" && !document.getElementById('start').disabled && document.querySelectorAll('.recent-entry').length > 0`);
  const current = await state(b); if (id) assert.equal(current.recent[0].job_id, id); return current;
}
async function start(b, choice) {
  assert.equal(await b.evaluate('document.getElementById("read-manifest").checked'), false, 'AB_BEHAVIOR every start begins unchecked');
  if (choice) await b.click('#read-manifest');
  assert.equal(await b.evaluate('document.getElementById("read-manifest").checked'), choice);
  await b.click('#start');
  assert.equal(await b.evaluate('document.getElementById("read-manifest").checked'), false, 'AB_BEHAVIOR consent resets immediately');
  assert.equal(await b.evaluate('document.getElementById("read-manifest").disabled'), true, 'AB_BEHAVIOR consent locked during active job');
  const active = (await state(b)).active; assert(active); assert.equal(active.read_manifest, choice); return active.job_id;
}
async function actualDownload(b, selector, filename, expected) {
  const directory = mkdtempSync(join(root, '.local/browser-lab/project-workspace-download-'));
  await b.downloadDirectory(directory); await b.click(selector);
  const until = Date.now() + 8000; let files;
  do { files = readdirSync(directory); if (files.length && files.every(n => !n.endsWith('.crdownload'))) break; await delay(25); } while (Date.now() < until);
  assert.deepEqual(files, [filename], 'AB_BEHAVIOR actual mouse attachment download');
  const source = join(directory, filename), bytes = readFileSync(source); assert.deepEqual(bytes, Buffer.from(expected));
  const receipt = { source, filename, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    actualMouseClick: true, originalBytesEqual: true };
  writeFileSync(join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n'); console.log(JSON.stringify(receipt));
}
async function screenshot(b, name) {
  const data = await b.screenshot(); writeFileSync(join(root, '.local/browser-lab', name), data);
  writeFileSync(join(screenshots, name), data, { flag: 'wx' }); console.log(JSON.stringify({ screenshot: join(screenshots, name), bytes: data.length }));
}
async function key(b, key, code, windowsVirtualKeyCode) {
  await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode,
    ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
  await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
}
async function memoryReplay() {
  const directory = join(root, '.local/checks/WATER-W1-AB-ADDENDUM-01'); mkdirSync(directory, { recursive: true });
  const evidence = mkdtempSync(join(directory, 'browser-memory-'));
  const input = new PassThrough(), commands = [];
  const output = new Writable({ write(bytes, encoding, done) {
    const owned = Buffer.from(bytes); appendFileSync(join(evidence, 'commands.log'), owned);
    commands.push(JSON.parse(owned)); done();
  } });
  const emit = event => {
    const bytes = Buffer.from(JSON.stringify({ version: 'water.project-host.v1', ...event }) + '\n');
    appendFileSync(join(evidence, 'events.log'), bytes); input.write(bytes);
  };
  const pending = startFromStreams({ input, output }); emit({ kind: 'ready' }); const workspace = await pending;
  return { ...workspace, commands, emit, async dispose() {
    await workspace.close(); assert.equal(input.destroyed, false); assert.equal(output.destroyed, false);
    input.destroy(); output.destroy();
    writeFileSync(join(evidence, 'close.json'), JSON.stringify({ url: workspace.url, borrowedStreamsPreserved: true,
      newAAExecuted: false, nativeSelectorExecuted: false, systemNativeDialogs: 0,
      source: 'Frozen actual AA public capture with synthetic dialog envelope; partial is an explicit synchronized memory variant.' }) + '\n');
  } };
}

test('project_workspace_actions_and_evidence', async () => {
  const b = await page(), r = await replay();
  try {
    await b.size(1440, 1000); await navigate(b, r.url);
    assert.equal((await state(b)).active, null);
    let id = await start(b, false), current = (await finished(b, id)).recent[0];
    assert.equal(current.marker.status, 'not_requested'); assert.equal(current.evidence_url, null);
    assert((await b.evaluate('document.querySelector(".marker-status").textContent')).includes('未请求读取'));
    const link = await b.evaluate('({href:document.querySelector(".report-link").href,target:document.querySelector(".report-link").target,rel:document.querySelector(".report-link").rel})');
    assert.equal(link.href, current.report_url + '/'); assert.equal(link.target, '_blank'); assert(link.rel.includes('noopener'));
    await navigate(b, current.report_url);
    assert.equal(await b.evaluate('document.getElementById("export-preview").textContent'), cases[0].bundle.snapshots[0].redacted_json);
    await actualDownload(b, '#download', 'water-report-1.json', cases[0].bundle.snapshots[0].redacted_json);
    await navigate(b, r.url);
    id = await start(b, true); current = (await finished(b, id)).recent[0];
    assert.equal(current.marker.status, 'observed'); assert(current.evidence_url);
    assert.equal(await b.evaluate('document.querySelector(".evidence-preview").textContent'), cases[1].marker.observation_json);
    assert((await b.evaluate('document.querySelector(".evidence-panel").textContent')).includes('归属和版本未知'));
    await actualDownload(b, '.evidence-link', 'water-project-evidence.json', cases[1].marker.observation_json);
    await navigate(b, current.report_url);
    assert((await b.evaluate('document.getElementById("source-kind").textContent')).includes('native_scope_metadata'));
    await actualDownload(b, '#download', 'water-report-1.json', cases[1].bundle.snapshots[0].redacted_json);
    await navigate(b, r.url);
    id = await start(b, false); current = (await finished(b, id)).recent[0];
    assert.equal(current.selection, 'cancelled'); assert.equal(current.marker.status, 'not_requested');
    assert.equal(current.report_url, null); assert.equal(current.evidence_url, null);
    assert.equal(await b.evaluate('document.querySelector(".recent-entry").querySelectorAll("a").length'), 0);
    id = await start(b, true); await b.waitFor('!document.getElementById("cancel").disabled'); await b.click('#cancel');
    current = (await finished(b, id)).recent[0]; assert.equal(current.status, 'cancelled');
    assert.equal(current.marker.error_code, 'scan_cancelled'); assert.equal(current.evidence_url, null);
    await navigate(b, current.report_url); await actualDownload(b, '#download', 'water-report-1.json', cases[2].bundle.snapshots[0].redacted_json);
    await navigate(b, r.url);
    const body = await b.evaluate('document.body.innerText');
    assert(!/X-Water-Action|\.exe|[a-f0-9]{64}|raw-content-canary/.test(body));
    assert.equal(await b.evaluate('document.querySelectorAll("iframe,input[type=file]").length'), 0);
  } finally { await r.dispose(); }

  for (const attack of ['false-observed', 'old-job', 'raw-content']) {
    const input = new PassThrough(), commands = [];
    const output = new Writable({ write(chunk, encoding, done) { commands.push(JSON.parse(chunk)); done(); } });
    const emit = e => input.write(Buffer.from(JSON.stringify({ version: 'water.project-host.v1', ...e }) + '\n'));
    const pending = startFromStreams({ input, output }); emit({ kind: 'ready' }); const x = await pending;
    try {
      await navigate(b, x.url); const id = await start(b, false);
      emit({ kind: 'accepted', job_id: id, read_manifest: false });
      const e = structuredClone(cases[1]); e.job_id = e.bundle.session_id = id; e.bundle.snapshots[0].view.scan_id = id;
      e.read_manifest = false;
      if (attack === 'old-job') e.job_id = 'previous-job';
      if (attack === 'raw-content') { const o = JSON.parse(e.marker.observation_json); o.name = 'raw-content-canary'; e.marker.observation_json = JSON.stringify(o); }
      emit(e); await b.waitFor('document.body.dataset.connection === "failed"');
      assert.equal(await b.evaluate('document.getElementById("start").disabled && document.getElementById("read-manifest").disabled'), true);
      assert.equal(await b.evaluate('document.querySelectorAll(".evidence-link").length'), 0);
      assert(!(await b.evaluate('document.body.innerText')).includes('raw-content-canary'));
      assert.equal(commands.length, 1);
    } finally { await x.close(); input.destroy(); output.destroy(); }
  }
});

test('project_workspace_layout_and_privacy', async () => {
  const b = await page(), r = await replay();
  try {
    await navigate(b, r.url); await start(b, false); await finished(b);
    await start(b, true); await finished(b);
    for (const [width, height] of [[1440, 1000], [900, 800]]) {
      await b.size(width, height); await b.evaluate('window.scrollTo(0,0)');
      const layout = await b.evaluate(`({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        heading:document.querySelectorAll('h1').length,live:document.querySelector('[role=status]')!==null,
        label:document.querySelector('label[for="read-manifest"]').textContent,text:document.body.innerText})`);
      assert.equal(layout.width, width); assert.equal(layout.height, height); assert.equal(layout.overflow, false);
      assert.equal(layout.heading, 1); assert(layout.live);
      for (const text of ['package.json', '256 KiB', '结构统计', '不读取其它文件正文']) assert(layout.label.includes(text));
      for (const text of ['只读', '最近两份报告', '未知', '不证明可删']) assert(layout.text.includes(text));
      await screenshot(b, `project-workspace-${width}x${height}.png`);
      await b.evaluate('document.getElementById("read-manifest").focus()'); await key(b, 'Tab', 'Tab', 9);
      assert.equal(await b.evaluate('document.activeElement.id'), 'start', 'AB_BEHAVIOR keyboard start after consent');
      assert.equal(await b.evaluate('getComputedStyle(document.activeElement).outlineStyle !== "none"'), true);
    }
    // Third replay is the retained S cancellation; this request explicitly opts in.
    await start(b, true); const cancelled = (await finished(b)).recent[0];
    assert.equal(cancelled.marker.error_code, 'selection_cancelled'); assert.equal(cancelled.evidence_url, null);
    await b.size(900, 800); await b.evaluate('window.scrollTo(0,0)'); await screenshot(b, 'project-workspace-cancel.png');
    assert((await b.evaluate('document.getElementById("status-text").textContent')).includes('目录选择已取消'));
    await b.evaluate('document.getElementById("read-manifest").focus()'); await key(b, ' ', 'Space', 32);
    assert.equal(await b.evaluate('document.getElementById("read-manifest").checked'), true);
    await key(b, 'Tab', 'Tab', 9); await key(b, 'Enter', 'Enter', 13);
    await b.waitFor('!document.getElementById("cancel").disabled');
    await b.evaluate('document.getElementById("cancel").focus()'); await key(b, 'Enter', 'Enter', 13);
    assert.equal((await finished(b)).recent[0].status, 'cancelled');
    const resources = await b.evaluate('performance.getEntriesByType("resource").map(e=>e.name)');
    assert(resources.every(url => url.startsWith(r.url + '/')));
    await r.close(); await b.waitFor('document.body.dataset.connection === "failed"');
    assert.equal(await b.evaluate('document.getElementById("start").disabled && document.getElementById("cancel").disabled'), true);
  } finally { await r.dispose(); }

  // Extend the same top-level layout test. These are frozen memory inputs,
  // not a new AA process, selector, or physical fixture scan.
  for (const example of lateDefinitions.accept) {
    const memory = await memoryReplay();
    try {
      await navigate(b, memory.url); const id = await start(b, true);
      memory.emit({ kind: 'accepted', job_id: id, read_manifest: true });
      const event = structuredClone(example.event), status = event.bundle.snapshots[0].view.status;
      event.job_id = event.bundle.session_id = id; event.bundle.snapshots[0].view.scan_id = id;
      memory.emit(event); const current = (await finished(b, id)).recent[0];
      assert.equal((await state(b)).connection, 'ready', 'AB_LATE_CANCELLED_CONTENT browser remains usable');
      assert.equal(current.status, status); assert.deepEqual(current.marker, example.event.marker);
      assert(current.report_url); assert.equal(current.evidence_url, null);
      for (const [width, height] of [[1440, 1000], [900, 800]]) {
        await b.size(width, height);
        const copy = await b.evaluate(`({title:document.getElementById('status-text').textContent,
          marker:document.querySelector('.recent-entry .marker-status').textContent,
          row:document.querySelector('.recent-entry').textContent,
          reports:document.querySelectorAll('.recent-entry .report-link').length,
          evidence:document.querySelectorAll('.evidence-link,.evidence-panel,.evidence-preview').length,
          overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
          checked:document.getElementById('read-manifest').checked})`);
        assert.equal(copy.title, status === 'completed' ? '扫描完成' : '保留部分结果');
        assert(copy.marker.includes('已取消内容读取')); assert(copy.marker.includes('未读取清单'));
        assert(!copy.row.includes('扫描已取消') && !copy.marker.includes('扫描取消'));
        assert.equal(copy.reports, 1); assert.equal(copy.evidence, 0); assert.equal(copy.overflow, false); assert.equal(copy.checked, false);
        const response = await b.evaluate(`fetch('/evidence/${id}.json').then(r=>r.status)`);
        assert.equal(response, 404, 'AB_LATE_CANCELLED_CONTENT no current or stale evidence attachment');
        if (status === 'completed' && width === 1440 || status === 'partial' && width === 900) {
          // Show the metadata outcome and the independent content cancellation
          // together, without altering the established viewport screenshots.
          await b.evaluate('document.querySelector(".recent-section").scrollIntoView({block:"end"})');
          await screenshot(b, `project-workspace-late-${status}-${width}x${height}.png`);
        }
      }
      await navigate(b, current.report_url);
      assert.equal(await b.evaluate('document.getElementById("export-preview").textContent'), event.bundle.snapshots[0].redacted_json);
      await actualDownload(b, '#download', 'water-report-1.json', event.bundle.snapshots[0].redacted_json);
      await navigate(b, memory.url);
      const nextId = await start(b, false);
      assert.equal(memory.commands.at(-1).read_manifest, false, 'AB_LATE_CANCELLED_CONTENT next UI job defaults to no content read');
      memory.emit({ kind: 'accepted', job_id: nextId, read_manifest: false });
      const next = structuredClone(cases[0]); next.job_id = next.bundle.session_id = nextId;
      next.bundle.snapshots[0].view.scan_id = nextId; memory.emit(next);
      assert.equal((await finished(b, nextId)).recent[0].marker.status, 'not_requested');
      console.log(JSON.stringify({ lateCancelBrowser: example.name, status, source: example.source ?? lateDefinitions.actualCapture.source_kind,
        envelope: lateDefinitions.envelopeOrigin, newAAExecuted: false, nativeSelectorExecuted: false }));
    } finally { await memory.dispose(); }
  }
});
