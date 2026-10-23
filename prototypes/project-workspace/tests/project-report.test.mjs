import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { startFromStreams } from '../transport.mjs';
import { captureProjectReport } from '../project-report-model.mjs';

const cases = JSON.parse(readFileSync(new URL('../../../contracts/project-session-v1/CASES.json', import.meta.url))).cases;
const late = JSON.parse(readFileSync(new URL('../../../contracts/project-workspace-addendum-v1/CASES.json', import.meta.url))).accept;
const frame = e => Buffer.from(JSON.stringify({ version: 'water.project-host.v1', ...e }) + '\n');
function raw(url, path, { method = 'GET', headers = {}, body } = {}) {
  const base = new URL(url);
  return new Promise((ok, bad) => {
    const req = request({ hostname: '127.0.0.1', port: base.port, path, method, agent: false, headers: { Host: base.host, ...headers } }, res => {
      const chunks = []; res.on('data', c => chunks.push(Buffer.from(c)));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }); req.on('error', bad); req.end(body);
  });
}
const session = async r => JSON.parse((await raw(r.url, '/session.json')).body);
async function wait(r, predicate) {
  for (let i = 0; i < 400; i++) { const value = await session(r); if (predicate(value)) return value; await delay(5); }
  assert.fail('AD_BEHAVIOR result transition');
}
async function rig() {
  const input = new PassThrough({ autoDestroy: false }), commands = [];
  const output = new Writable({ write(bytes, _, done) { commands.push(JSON.parse(bytes)); done(); } });
  const pending = startFromStreams({ input, output }); input.write(frame({ kind: 'ready' }));
  const workspace = await pending;
  const token = /name="water-action" content="([a-f0-9]{64})"/.exec((await raw(workspace.url, '/')).body.toString())[1];
  return { ...workspace, input, output, token, commands, async dispose() {
    await workspace.close(); assert(!input.destroyed && !output.destroyed); input.destroy(); output.destroy();
  } };
}
function eventFor(base, id) {
  const event = structuredClone(base); event.job_id = event.bundle.session_id = id;
  if (event.bundle.snapshots.length) event.bundle.snapshots[0].view.scan_id = id;
  return event;
}
async function start(r, read) {
  const response = await raw(r.url, '/actions/start', { method: 'POST', headers: {
    Origin: r.url, 'X-Water-Action': r.token, 'Content-Type': 'application/json',
  }, body: JSON.stringify({ read_manifest: read }) });
  assert.equal(response.status, 202); const id = r.commands.at(-1).job_id;
  r.input.write(frame({ kind: 'accepted', job_id: id, read_manifest: read })); return id;
}
async function deliver(r, base, mutateChunk = false) {
  const id = await start(r, base.read_manifest), event = eventFor(base, id), expected = structuredClone(event);
  const bytes = frame(event);
  // Registered after transport's data listener: mutate after its synchronous
  // boundary copy, before any queued await, even when accepted paused the pipe.
  if (mutateChunk) r.input.once('data', () => {
    bytes.fill(0x78); event.bundle.snapshots[0].redacted_json = 'caller-mutation-canary'; event.marker.status = 'failed';
  });
  r.input.write(bytes);
  const state = await wait(r, s => s.recent[0]?.job_id === id || s.connection === 'failed');
  assert.equal(state.connection, 'ready', 'AD_BEHAVIOR valid results stay usable');
  return { id, event: expected, row: state.recent[0], path: '/reports/' + id + '/' };
}
const result = event => ({ job_id: event.job_id, read_manifest: event.read_manifest, marker: event.marker,
  selection: event.bundle.selection, status: event.bundle.snapshots[0]?.view.status ?? 'selection_cancelled', bundle: event.bundle });
async function checkReport(r, item) {
  const { event, path } = item, page = await raw(r.url, path);
  assert.equal(page.status, 200, 'AD_BEHAVIOR same-origin project report exists');
  assert(page.body.includes('project-report.mjs'));
  const response = await raw(r.url, path + 'session.json'), packet = JSON.parse(response.body);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(packet).sort(), ['report_version', 'job_id', 'read_manifest', 'bundle', 'marker'].sort());
  assert.deepEqual(packet, { report_version: 'water.project-report.v1', job_id: item.id, read_manifest: event.read_manifest, bundle: event.bundle, marker: event.marker });
  const q = await raw(r.url, path + 'metadata.json');
  assert.deepEqual(q.body, Buffer.from(event.bundle.snapshots[0].redacted_json), 'AD_BEHAVIOR Q original UTF-8 bytes');
  assert.equal(q.headers['content-type'], 'application/json;charset=utf-8');
  assert.equal(q.headers['content-disposition'], 'attachment; filename="water-report-1.json"');
  assert.equal(Number(q.headers['content-length']), q.body.length);
  const z = await raw(r.url, '/evidence/' + item.id + '.json');
  if (event.marker.status === 'observed') assert.deepEqual(z.body, Buffer.from(event.marker.observation_json));
  else assert.equal(z.status, 404, 'AD_REPORT_CONSENT unrequested or skipped structure attachment is absent');
  const w = await raw(item.row.report_url, '/session.json'); assert.deepEqual(JSON.parse(w.body), event.bundle);
  assert.deepEqual((await raw(item.row.report_url, '/exports/1.json')).body, q.body);
  for (const suffix of ['', 'session.json', 'metadata.json']) {
    const get = await raw(r.url, path + suffix), head = await raw(r.url, path + suffix, { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(head.headers['content-length'], get.headers['content-length']);
  }
}

test('project_report_capture_and_routes', async () => {
  const original = eventFor(cases[1], 'capture-owned'), input = result(original), captured = captureProjectReport(input);
  const expected = structuredClone(input), sibling = captureProjectReport(input);
  original.bundle.snapshots[0].redacted_json = 'caller-mutation-canary'; original.marker.observation_json = 'caller-mutation-canary';
  assert.deepEqual(JSON.parse(captured.session).bundle, expected.bundle);
  assert.deepEqual(captured.metadata, Buffer.from(expected.bundle.snapshots[0].redacted_json));
  assert.deepEqual(captured.evidence, Buffer.from(expected.marker.observation_json));
  captured.session.fill(0); captured.metadata.fill(0); captured.evidence.fill(0);
  assert.deepEqual(JSON.parse(sibling.session).marker, expected.marker);
  assert.deepEqual(sibling.metadata, Buffer.from(expected.bundle.snapshots[0].redacted_json));
  const invalid = [
    x => { x.job_id = 'other-job'; }, x => { x.bundle.session_id = 'other-job'; },
    x => { x.bundle.snapshots[0].view.scan_id = 'other-job'; }, x => { x.status = 'cancelled'; },
    x => { x.selection = 'cancelled'; }, x => { x.read_manifest = false; },
    x => { x.marker.extra = 'body-canary'; }, x => { x.marker.observation_json = x.marker.observation_json.replace('"risk":"protected"', '"risk":"low"'); },
    x => { x.bundle.snapshots[0].redacted_json += ' '; }, x => { x.bundle.policy.limits.max_depth = 9; },
    x => { x.marker.observation_json = x.marker.observation_json.replace('"bytes_read":', '"body":"body-canary","bytes_read":'); },
    x => { Object.defineProperty(x, 'bundle', { get() { assert.fail('getter executed'); }, enumerable: true }); },
    x => { x.bundle.snapshots[0].view.extra = 'body-canary'; },
  ];
  for (const mutate of invalid) { const x = structuredClone(expected); mutate(x); assert.throws(() => captureProjectReport(x), { message: 'Project workspace unavailable.' }); }
  assert.throws(() => captureProjectReport(result(cases[6])));
  const r = await rig();
  try {
    const item = await deliver(r, cases[1], true); await checkReport(r, item);
    for (const base of [cases[0], cases[2], cases[3], cases[4], cases[5], ...late.map(c => c.event)]) {
      await checkReport(r, await deliver(r, base, true));
    }
    const selected = await deliver(r, cases[6]); assert.equal(selected.row.report_url, null);
    assert.equal((await raw(r.url, selected.path)).status, 404);
    for (const asset of ['/project-report.css', '/project-report.mjs']) assert.equal((await raw(r.url, asset)).status, 200);
    assert.equal((await raw(r.url, '/project-report-model.mjs')).status, 404, 'Node module is private');
  } finally { await r.dispose(); }
});

test('project_report_privacy_and_eviction', async () => {
  const r = await rig(), other = await rig(); let closedPort;
  try {
    const observed = await deliver(r, cases[1]); await checkReport(r, observed);
    const noRead = await deliver(r, cases[0]); await checkReport(r, noRead);
    assert.equal((await raw(other.url, observed.path)).status, 404, 'AD_REPORT_BINDING instances do not share reports');
    const paths = [observed.path, observed.path + 'session.json', observed.path + 'metadata.json', '/evidence/' + observed.id + '.json'];
    for (const path of paths) {
      const valid = await raw(r.url, path);
      for (const [header, value] of [['cache-control', 'no-store'], ['x-content-type-options', 'nosniff'], ['referrer-policy', 'no-referrer']]) assert.equal(valid.headers[header], value);
      assert(valid.headers['content-security-policy'].includes("frame-ancestors 'none'"));
      assert.equal(valid.headers['access-control-allow-origin'], undefined); assert(!valid.body.includes(r.token));
      assert.equal((await raw(r.url, path, { headers: { Host: 'localhost:' + new URL(r.url).port } })).status, 403);
      for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) assert.equal((await raw(r.url, path, { method })).status, 405);
    }
    for (const path of ['/reports/unknown/', '/reports/unknown/session.json', '/reports/unknown/metadata.json',
      observed.path + '?x=1', observed.path + 'session.json?x=1', observed.path + 'metadata.json?x=1',
      observed.path.slice(0, -1), observed.path + '/', '/reports/%' + observed.id.charCodeAt(0).toString(16) + observed.id.slice(1) + '/',
      '/reports/../app.mjs', '/reports/' + observed.id + '/../../model.mjs', '/evidence/%' + observed.id.charCodeAt(0).toString(16) + observed.id.slice(1) + '.json',
      '/reports/' + observed.id + '/%6detadata.json', '/project-report.html', '/reports/' + observed.id + '/evidence.json']) {
      const response = await raw(r.url, path); assert.equal(response.status, 404, 'AD_REPORT_BINDING exact route ' + path);
      assert.equal(response.body.toString(), 'Project workspace unavailable.');
    }
    assert.equal((await raw(r.url, '/actions/start', { method: 'POST', headers: { Origin: other.url, 'X-Water-Action': r.token, 'Content-Type': 'application/json' }, body: '{"read_manifest":false}' })).status, 403);
    await deliver(r, late[0].event);
    for (const path of paths) assert.equal((await raw(r.url, path)).status, 404, 'AD_REPORT_BINDING evicted job has no route');
    assert.equal((await raw(r.url, noRead.path + 'session.json')).status, 200);
    await assert.rejects(raw(observed.row.report_url, '/session.json'), 'AD_REPORT_BINDING old W server closed');
    await deliver(r, cases[6]);
    assert.equal((await raw(r.url, noRead.path)).status, 404, 'AD_REPORT_BINDING selection cancellation consumes a slot');
    closedPort = r.url;
  } finally { await r.dispose(); await other.dispose(); }
  await assert.rejects(raw(closedPort, '/session.json'));
  for (const mutate of [e => { e.job_id = 'old-job'; }, e => { e.read_manifest = false; },
    e => { e.marker.observation_json = e.marker.observation_json.replace('"bytes_read":', '"body":"body-canary","bytes_read":'); }]) {
    const x = await rig();
    try {
      const id = await start(x, false), event = eventFor(cases[1], id); mutate(event); x.input.write(frame(event));
      await wait(x, s => s.connection === 'failed');
      for (const path of ['/reports/' + id + '/', '/reports/' + id + '/session.json', '/reports/' + id + '/metadata.json', '/evidence/' + id + '.json']) {
        assert.equal((await raw(x.url, path)).status, 404, 'AD_REPORT_CONSENT invalid result creates no report');
      }
      assert(!(await raw(x.url, '/session.json')).body.includes('body-canary'));
    } finally { await x.dispose(); }
  }
});
