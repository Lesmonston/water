// Controller-owned headless browser acceptance support. Never uses the user's profile.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function localDir(parts) {
  let dir = root;
  for (const part of parts.split('/')) {
    assert(part && part !== '.' && part !== '..'); dir = join(dir, part);
    if (!existsSync(dir)) mkdirSync(dir);
    const info = lstatSync(dir); assert(info.isDirectory() && !info.isSymbolicLink());
    const rel = relative(realpathSync(root), realpathSync(dir));
    assert(!rel.startsWith('..') && !isAbsolute(rel), 'Browser state outside worktree');
  }
  return dir;
}
function chromePath() {
  const paths = [process.env.WATER_CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const path = paths.find((candidate) => candidate && isAbsolute(candidate) && existsSync(candidate));
  assert(path, 'No existing trusted Chrome/Edge; do not download a browser'); return path;
}
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

export async function openBrowser({ width = 1440, height = 1000 } = {}) {
  assert(Number.isInteger(width) && width >= 320 && width <= 2560);
  assert(Number.isInteger(height) && height >= 320 && height <= 1600);
  const local = localDir('.local/browser-lab');
  const profile = mkdtempSync(join(local, 'profile-'));
  const args = ['--headless', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-extensions',
    '--disable-sync', '--disable-default-apps', '--password-store=basic', '--use-mock-keychain',
    '--window-size=' + width + ',' + height, 'about:blank'];
  const child = spawn(chromePath(), args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, TEMP: profile, TMP: profile, TMPDIR: profile } });
  let stderr = '', endpoint, ws, stopped = false, counter = 0;
  const pending = new Map(); const listeners = new Set();
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(stderr); if (match) endpoint = match[1]; });
  child.stdout.on('data', () => {});
  let childError; child.on('error', (error) => { childError = error; });
  const close = async () => {
    if (stopped) return; stopped = true;
    if (ws?.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ id: ++counter, method: 'Browser.close' })); } catch {}
      await delay(400); ws.close();
    }
    if (child.exitCode === null) { await delay(500); if (child.exitCode === null) child.kill(); }
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Browser closed')); }
    pending.clear();
    writeFileSync(join(profile, 'controller-browser-stderr.log'), stderr);
  };
  try {
    const deadline = Date.now() + 15000;
    while (!endpoint && Date.now() < deadline && !childError && child.exitCode === null) await delay(25);
    assert(endpoint && !childError, 'Headless browser startup failed');
    const parsed = new URL(endpoint); assert(['127.0.0.1', 'localhost'].includes(parsed.hostname));
    ws = new WebSocket(endpoint);
    await new Promise((ok, bad) => { ws.addEventListener('open', ok, { once: true }); ws.addEventListener('error', bad, { once: true }); });
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id); pending.delete(message.id); clearTimeout(entry.timer);
        if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result ?? {});
      } else for (const listener of listeners) listener(message);
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++counter; const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params) => send(method, params, sessionId);
    await page('Runtime.enable'); await page('Page.enable');
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    const evaluate = async (expression) => {
      const value = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      assert(!value.exceptionDetails, 'Browser expression threw'); return value.result.value;
    };
    return {
      profile, close, send: page, evaluate,
      onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      async goto(url) { const value = new URL(url); assert(value.protocol === 'http:' && value.hostname === '127.0.0.1', 'Only local test servers'); const result = await page('Page.navigate', { url }); assert(!result.errorText); },
      async waitFor(expression, timeout = 10000) { const until = Date.now() + timeout; while (Date.now() < until) { if (await evaluate(expression)) return; await delay(25); } throw new Error('Browser condition timed out'); },
      async screenshot(relativePath) {
        assert(relativePath.startsWith('docs/acceptance/wave1/c/') || relativePath.startsWith('.local/browser-lab/'));
        assert(relativePath.endsWith('.png') && !relativePath.split('/').includes('..'));
        const output = resolve(root, relativePath); localDir(relative(root, dirname(output)).replaceAll('\\', '/'));
        const result = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        writeFileSync(output, Buffer.from(result.data, 'base64')); return output;
      },
    };
  } catch (error) { await close(); throw error; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await openBrowser({ width: 900, height: 800 });
  try {
    await browser.evaluate('document.body.textContent = "water-browser-probe-ok"');
    assert.equal(await browser.evaluate('document.body.textContent'), 'water-browser-probe-ok');
    const screenshot = await browser.screenshot('.local/browser-lab/probe.png');
    console.log(JSON.stringify({ status: 'passed', probe: 'headless-isolated-profile', screenshot, productUiTested: false }, null, 2));
  } finally { await browser.close(); }
}
