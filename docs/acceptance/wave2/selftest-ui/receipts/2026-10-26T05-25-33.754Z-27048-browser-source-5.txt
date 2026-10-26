import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPrivateBrowser } from '../../../scripts/acceptance/native-vw-private-browser.mjs';

const ui = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css' };

test('ui_page', async () => {
  const server = createServer((req, res) => {
    const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '') || 'index.html';
    let body;
    try { body = readFileSync(join(ui, rel)); } catch { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[rel.slice(rel.lastIndexOf('.'))] ?? 'application/octet-stream' }).end(body);
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const browser = await openPrivateBrowser();
  try {
    await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__TAURI__={core:{invoke:async()=>({app_version:"9.9"})}};' });
    await browser.goto('http://127.0.0.1:' + server.address().port + '/index.html');
    await browser.waitFor('document.getElementById("out").textContent === "version 9.9"');
    const dir = process.env.WATER_W2_SHOTS_DIR ?? join(ui, '../../.local/ui-shots', new Date().toISOString().replaceAll(':', '-'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'page-1240x820.png'), await browser.screenshot());
  } finally { await browser.close(); server.close(); }
});
