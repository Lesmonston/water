import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const csp = "default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'";
const unavailable = 'Report resource unavailable.';

export async function startServer({ port = 0 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new RangeError('Invalid local port');
  const packageDir = await realpath(here);
  const repoRoot = await realpath(resolve(here, '..', '..'));
  const routes = new Map([
    ['/', [join(packageDir, 'index.html'), 'text/html; charset=utf-8']],
    ['/styles.css', [join(packageDir, 'styles.css'), 'text/css; charset=utf-8']],
    ['/app.mjs', [join(packageDir, 'app.mjs'), 'text/javascript; charset=utf-8']],
    ['/model.mjs', [join(packageDir, 'model.mjs'), 'text/javascript; charset=utf-8']],
    ['/reports.json', [join(repoRoot, 'contracts', 'report-reader-v1', 'reports.json'), 'application/json; charset=utf-8']],
  ]);
  for (const [file] of routes.values()) {
    const canonical = await realpath(file);
    const fromRoot = relative(repoRoot, canonical);
    if (canonical !== file || fromRoot.startsWith('..') || isAbsolute(fromRoot)) throw new Error(unavailable);
  }

  let expectedHost;
  const server = createServer(async (request, response) => {
    response.setHeader('Content-Security-Policy', csp);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    const fail = (code) => {
      if (code === 405) response.setHeader('Allow', 'GET, HEAD');
      const body = request.method === 'HEAD' ? undefined : unavailable;
      response.writeHead(code, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...(body === undefined ? {} : { 'Content-Length': Buffer.byteLength(body) }),
      });
      response.end(body);
    };
    if (request.headers.host !== expectedHost) return fail(403);
    if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405);
    const route = routes.get(request.url);
    if (!route) return fail(404);
    try {
      const canonical = await realpath(route[0]);
      if (canonical !== route[0]) return fail(404);
      const body = await readFile(canonical);
      response.writeHead(200, { 'Content-Type': route[1], 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      fail(404);
    }
  });

  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      expectedHost = `127.0.0.1:${address.port}`;
      server.off('error', reject);
      accept();
    });
  });

  let closing;
  return {
    url: `http://${expectedHost}`,
    async close() {
      closing ??= new Promise((accept, reject) => {
        server.close((error) => (error ? reject(error) : accept()));
        server.closeAllConnections();
      });
      return closing;
    },
  };
}
