import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/model.mjs', ['model.mjs', 'text/javascript; charset=utf-8']],
  ['/demo-data.json', ['demo-data.json', 'application/json; charset=utf-8']],
]);
const csp = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export async function startServer({ port = 0 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new RangeError('Invalid local port');
  const root = await realpath(directory);
  let expectedHost;
  const server = createServer(async (request, response) => {
    response.setHeader('Content-Security-Policy', csp);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    const reject = (code) => { response.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Local demo resource unavailable.'); };
    if (request.headers.host !== expectedHost) return reject(403);
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return reject(405); }
    // Exact raw-path allowlist: no URL normalization, decoded traversal or directories.
    const resource = routes.get(request.url);
    if (!resource) return reject(404);
    try {
      const candidate = join(root, resource[0]);
      if (await realpath(candidate) !== candidate) return reject(404);
      const body = await readFile(candidate);
      response.writeHead(200, { 'Content-Type': resource[1], 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { reject(404); }
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); accept(); });
  });
  expectedHost = `127.0.0.1:${server.address().port}`;
  let closing;
  return {
    url: `http://${expectedHost}`,
    close() {
      closing ??= new Promise((accept, reject) => {
        server.close((error) => error ? reject(error) : accept());
        server.closeAllConnections();
      });
      return closing;
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startServer({ port: 0 });
  console.log(`Water 示例数据 · 只读演示：${server.url}\n按 Ctrl+C 停止。`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); });
}
