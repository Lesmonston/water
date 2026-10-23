import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ActionError, exactObject, parseObject, validId, unavailable } from './model.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const csp = "default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'";
function singleHeader(req, name) {
  let count = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) if (req.rawHeaders[i].toLowerCase() === name) count++;
  return count === 1;
}
function readBody(req) {
  const length = req.headers['content-length'];
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > 1024)) throw new ActionError(413);
  return new Promise((ok, bad) => {
    const chunks = []; let size = 0, settled = false;
    const reject = () => { if (!settled) { settled = true; bad(new ActionError(400)); } };
    req.on('data', chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > 1024) { settled = true; bad(new ActionError(413)); return; }
      chunks.push(Buffer.from(chunk));
    });
    req.once('aborted', reject); req.once('error', reject);
    req.once('end', () => { if (!settled) { settled = true; ok(Buffer.concat(chunks, size)); } });
  });
}
export async function createWorkspaceServer({ state, act, evidence, projectReports, port }) {
  const token = randomBytes(32).toString('hex'), tokenBytes = Buffer.from(token);
  const assets = new Map();
  try {
    if (await realpath(here) !== here) throw new Error();
    for (const [path, file, type] of [['/', 'index.html', 'text/html'], ['/styles.css', 'styles.css', 'text/css'], ['/app.mjs', 'app.mjs', 'text/javascript'],
      ['/project-report.css', 'project-report.css', 'text/css'], ['/project-report.mjs', 'project-report.mjs', 'text/javascript'],
      ['project-report-page', 'project-report.html', 'text/html']]) {
      const fixed = join(here, file), canonical = await realpath(fixed), rel = relative(here, canonical);
      if (canonical !== fixed || rel.startsWith('..') || isAbsolute(rel) || !(await stat(canonical)).isFile()) throw new Error();
      let body = await readFile(canonical);
      if (path === '/') {
        const html = body.toString('utf8');
        if (html.split('__WATER_ACTION__').length !== 2) throw new Error();
        body = Buffer.from(html.replace('__WATER_ACTION__', token));
      }
      assets.set(path, { body, type: type + ';charset=utf-8' });
    }
  } catch { throw new Error(unavailable); }
  const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) &&
    timingSafeEqual(Buffer.from(value), tokenBytes);
  let expectedHost, origin;
  const server = createServer(async (req, res) => {
    res.setHeader('Connection', 'close');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, body, type = 'application/json;charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type, 'Content-Length': body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    const fail = status => send(status, Buffer.from(unavailable), 'text/plain;charset=utf-8');
    try {
      if (!singleHeader(req, 'host') || req.headers.host !== expectedHost) return fail(403);
      const action = req.url === '/actions/start' ? 'start' : req.url === '/actions/cancel' ? 'cancel' : null;
      const asset = req.url.startsWith('/') ? assets.get(req.url) : null, isSession = req.url === '/session.json';
      const reportRoute = /^\/reports\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})\/(session\.json|metadata\.json)?$/.exec(req.url);
      const projectReport = reportRoute ? projectReports.get(reportRoute[1]) : null;
      const evidenceId = /^\/evidence\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})\.json$/.exec(req.url)?.[1];
      const attachment = evidenceId ? projectReports.get(evidenceId)?.evidence : null;
      if (!action && !asset && !isSession && !attachment && !projectReport) return fail(404);
      if (action) {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return fail(405); }
        if (!singleHeader(req, 'origin') || !singleHeader(req, 'x-water-action')) return fail(403);
        if (req.headers.origin !== origin) return fail(403);
        if (!validToken(req.headers['x-water-action'])) return fail(403);
        if (!singleHeader(req, 'content-type') || req.headers['content-type'] !== 'application/json') return fail(400);
        let body;
        try {
          body = parseObject(await readBody(req));
          exactObject(body, action === 'start' ? ['read_manifest'] : ['job_id']);
          if (action === 'start' && typeof body.read_manifest !== 'boolean') throw new Error();
          if (action === 'cancel' && !validId(body.job_id)) throw new Error();
        } catch (error) { return fail(error instanceof ActionError ? error.status : 400); }
        await act(action, body);
        return send(202, Buffer.from(JSON.stringify(state.view())));
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return fail(405); }
      if (projectReport) {
        if (reportRoute[2] === 'session.json') return send(200, projectReport.session);
        if (reportRoute[2] === 'metadata.json') {
          res.setHeader('Content-Disposition', 'attachment; filename="water-report-1.json"');
          return send(200, projectReport.metadata);
        }
        const page = assets.get('project-report-page');
        return send(200, page.body, page.type);
      }
      if (attachment) {
        res.setHeader('Content-Disposition', 'attachment; filename="water-project-evidence.json"');
        return send(200, attachment);
      }
      return isSession ? send(200, Buffer.from(JSON.stringify(state.view()))) : send(200, asset.body, asset.type);
    } catch (error) { fail(error instanceof ActionError ? error.status : 503); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.on('clientError', (error, socket) => {
    if (socket.writable) socket.end(`HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Type: text/plain;charset=utf-8\r\nContent-Length: ${Buffer.byteLength(unavailable)}\r\n\r\n${unavailable}`);
  });
  await new Promise((ok, bad) => {
    server.once('error', bad);
    server.listen(port, '127.0.0.1', () => {
      expectedHost = `127.0.0.1:${server.address().port}`; origin = `http://${expectedHost}`;
      server.off('error', bad); ok();
    });
  }).catch(() => { throw new Error(unavailable); });
  let closing;
  return { url: origin, close() {
    closing ??= new Promise((ok, bad) => { server.close(error => error ? bad(new Error(unavailable)) : ok()); server.closeAllConnections(); });
    return closing;
  } };
}
