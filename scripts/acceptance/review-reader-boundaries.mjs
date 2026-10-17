// Controller-owned public-API acceptance. Does not modify worker code or data.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const integration = process.argv[4] === '--integration';
assert.equal(process.argv.length, integration ? 5 : 4); assert.equal(process.argv[2], '--expected-head');
const expected = process.argv[3]; assert.match(expected, /^[a-f0-9]{40}$/);
const worker = integration ? root : join(root, '.worktrees/i');
const output = integration ? join(root, '.local/checks/controller-i-integration') : join(root, 'docs/acceptance/wave1/controller/w1-i-review-20261017');
if (!existsSync(output)) mkdirSync(output);
const stamp = new Date().toISOString().replaceAll(':', '-') + '-' + process.pid;
const git = args => {
  const r = spawnSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'core.fsmonitor=false', ...args], { cwd: worker, encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
const before = { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain=v1', '--untracked-files=all']) };
assert.equal(before.head, expected); assert.equal(before.status, '');
const { assertReportView, formatBytes, selectFindings, summarizeView } = await import(pathToFileURL(join(worker, 'prototypes/report-reader/model.mjs')));
const { startServer } = await import(pathToFileURL(join(worker, 'prototypes/report-reader/server.mjs')));
const bundle = JSON.parse(readFileSync(join(worker, 'contracts/report-reader-v1/reports.json'), 'utf8'));
const composite = bundle.reports.find(r => r.id === 'composite_partial').view;
const record = { task: 'WATER-W1-I', startedAt: new Date().toISOString(), before, cases: [], commands: [] };
function check(id, f) {
  try { f(); record.cases.push({ id, status: 'passed' }); }
  catch (e) { record.cases.push({ id, status: 'failed', message: e.message }); }
}
const fixed = { name: 'Error', message: 'Unsupported report view.' };
for (const report of bundle.reports) check('valid-report:' + report.id, () => {
  const before = structuredClone(report.view);
  assert.equal(assertReportView(report.view), undefined);
  selectFindings(report.view); summarizeView(report.view); assert.deepEqual(report.view, before);
});
const terminators = [['LF', '\n'], ['CR', '\r'], ['LS', '\u2028'], ['PS', '\u2029'], ['CRLF', '\r\n']];
for (const [label, suffix] of terminators) {
  for (const base of ['0', '37', '18446744073709551615']) {
    check(`canonical-formatBytes:${base}:${label}`, () => assert.throws(() => formatBytes(base + suffix), fixed));
  }
  for (const [name, mutate] of [
    ['totals.logical_bytes', v => { v.totals.logical_bytes = '37' + suffix; }],
    ['totals.allocated_bytes', v => { v.totals.allocated_bytes = '37' + suffix; }],
    ['finding.logical_bytes+size.logical_bytes', v => { v.findings[0].logical_bytes = '37' + suffix; v.findings[0].size.logical_bytes = '37' + suffix; }],
    ['finding.size.allocated_bytes', v => { v.findings[0].size.allocated_bytes = '37' + suffix; }],
  ]) {
    const view = structuredClone(composite); mutate(view);
    check(`canonical-view-bytes:${name}:${label}`, () => assert.throws(() => assertReportView(view), fixed));
  }
  for (const [name, mutate] of [
    ['scan_id', v => { v.scan_id = 'scan' + suffix; }],
    ['finding.id', v => { v.findings[0].id = 'finding' + suffix; }],
    ['scope.scope_id', v => {
      const old = v.scopes[0].scope_id, next = 'scope' + suffix;
      v.scopes[0].scope_id = next;
      for (const f of v.findings) if (f.scope_id === old) f.scope_id = next;
      for (const i of v.issues) if (i.scope_id === old) i.scope_id = next;
    }],
    ['source_tool.tool_id', v => {
      const f = v.findings.find(f => f.source_tool !== null);
      f.source_tool.tool_id = 'tool' + suffix; f.tool_id = 'tool:' + f.source_tool.tool_id;
    }],
    ['references.project_ids', v => { v.findings[0].references = { state: 'known', project_ids: ['project' + suffix] }; }],
  ]) {
    const view = structuredClone(composite); mutate(view);
    check(`canonical-view-id:${name}:${label}`, () => assert.throws(() => assertReportView(view), fixed));
  }
}
// Independent non-golden valid data, exact code-point ordering and copied totals.
check('non-golden-valid-order-and-purity', () => {
  const v = structuredClone(composite), prototype = v.findings[0];
  v.findings = [['one', '\u{10000}', '9007199254740993'], ['two', '\ue000', '9007199254740992'], ['three', 'Z', null], ['four', 'a', null]].map(([id, path, bytes]) => {
    const f = structuredClone(prototype); f.id = id; f.title = path; f.relative_path = path; f.logical_bytes = bytes;
    f.size = { logical_bytes: bytes, allocated_bytes: null, reclaimable_lower_bytes: null, reclaimable_upper_bytes: null, method: bytes === null ? 'unknown' : 'logical_sum', confidence: bytes === null ? 'unknown' : 'measured', shared: 'unknown' };
    return f;
  });
  const before = structuredClone(v);
  assert.equal(assertReportView(v), undefined);
  assert.deepEqual(selectFindings(v, { sort: 'name_asc' }).map(f => f.id), ['two', 'one', 'four', 'three']);
  assert.deepEqual(selectFindings(v, { sort: 'size_asc' }).map(f => f.id), ['two', 'one', 'three', 'four']);
  assert.deepEqual(selectFindings(v, { query: '[*]' }), []);
  const summary = summarizeView(v); summary.source_totals.logical_bytes = '99';
  assert.equal(v.totals.logical_bytes, '37'); assert.deepEqual(v, before);
});
const server = await startServer();
async function raw(path, method = 'GET', host) {
  const url = new URL(server.url);
  return new Promise((accept, reject) => {
    const req = request({ hostname: '127.0.0.1', port: url.port, path, method, headers: host ? { Host: host } : {} }, res => {
      const chunks = []; res.on('data', b => chunks.push(b));
      res.on('end', () => accept({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    }); req.on('error', reject); req.end();
  });
}
try {
  for (const path of ['/', '/styles.css', '/app.mjs', '/model.mjs', '/reports.json']) {
    const get = await raw(path), head = await raw(path, 'HEAD');
    check('http-allowlist-and-head:' + path, () => {
      assert.equal(get.status, 200); assert.equal(head.status, 200); assert.equal(head.body, '');
      assert.equal(head.headers['content-length'], get.headers['content-length']);
      assert.equal(get.headers['access-control-allow-origin'], undefined); assert.equal(get.headers['x-content-type-options'], 'nosniff');
    });
  }
  for (const path of ['/reports.json?', '/reports.json#x', '/./', '///', '/%2f', '/styles.css%00', '/app.mjs?x', '/.local/', '/contracts/', '/a/../']) {
    const get = await raw(path);
    check('http-raw-path-denied:' + path, () => { assert.equal(get.status, 404); assert.equal(get.body, 'Report resource unavailable.'); });
  }
  for (const host of ['localhost:' + new URL(server.url).port, '127.0.0.1', new URL(server.url).host + '.example']) {
    const get = await raw('/', 'GET', host);
    check('http-host-denied:' + host, () => assert.equal(get.status, 403));
  }
  for (const method of ['POST', 'PATCH', 'DELETE', 'OPTIONS']) {
    const get = await raw('/', method);
    check('http-method-denied:' + method, () => assert.equal(get.status, 405));
  }
} finally { await server.close(); }
record.after = { head: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain=v1', '--untracked-files=all']) };
assert.deepEqual(record.after, before);
record.failed = record.cases.filter(c => c.status === 'failed').length;
record.passed = record.cases.length - record.failed; record.status = record.failed ? 'failed' : 'passed'; record.endedAt = new Date().toISOString();
record.productSha256 = createHash('sha256').update(readFileSync(join(worker, 'prototypes/report-reader/model.mjs'))).digest('hex');
const receipt = join(output, stamp + '-boundaries-result.json');
writeFileSync(receipt, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: record.status, passed: record.passed, failed: record.failed, receipt, failures: record.cases.filter(c => c.status === 'failed').map(c => c.id) }, null, 2));
if (record.failed) process.exitCode = 1;
