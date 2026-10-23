import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Readable, Writable } from 'node:stream';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { startFromStreams } from '../transport.mjs';
import { launchProjectWorkspace } from '../launch.mjs';
import { assertMarker, WorkspaceState, EventDecoder } from '../model.mjs';
import { startServer as startReview } from '../../native-review/server.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const cases = JSON.parse(readFileSync(new URL('../../../contracts/project-session-v1/CASES.json', import.meta.url))).cases;
// Controller-owned, frozen actual-AA capture plus an explicit partial memory
// adapter. Reading these JSON inputs does not run AA, S, or a physical fixture.
const lateDefinitions = JSON.parse(readFileSync(new URL('../../../contracts/project-workspace-addendum-v1/CASES.json', import.meta.url)));
const version = 'water.project-host.v1';
const errorText = 'Project workspace unavailable.';
const frame = event => Buffer.from(JSON.stringify({ version, ...event }) + '\n');
function resultFor(id, index = 0) {
  const result = structuredClone(cases[index]);
  result.job_id = result.bundle.session_id = id;
  if (result.bundle.snapshots.length) result.bundle.snapshots[0].view.scan_id = id;
  return result;
}
function raw(url, path, { method = 'GET', headers = {}, body } = {}) {
  const base = new URL(url);
  return new Promise((ok, bad) => {
    const req = request({ hostname: '127.0.0.1', port: base.port, path, method,
      headers: { Host: base.host, ...headers }, agent: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', bad); req.end(body);
  });
}
const session = async url => JSON.parse((await raw(url, '/session.json')).body);
async function waitState(url, predicate, label = 'AB_BEHAVIOR') {
  let value;
  const until = Date.now() + 3000;
  do { value = await session(url); if (predicate(value)) return value; await delay(5); } while (Date.now() < until);
  assert.fail(label + ': state did not reach the expected transition');
}
async function bootstrap(url) {
  assert.equal((await session(url)).workspace_version, 'water.project-workspace.v1', 'AB_BEHAVIOR runnable project workspace');
  const token = /<meta name="water-action" content="([a-f0-9]{64})">/.exec((await raw(url, '/')).body.toString())?.[1];
  assert(token, 'AB_BEHAVIOR bootstrap authority');
  return token;
}
const action = (url, token, route = 'start', body = '{"read_manifest":false}', headers = {}) => raw(url, '/actions/' + route, {
  method: 'POST', headers: { Origin: url, 'X-Water-Action': token, 'Content-Type': 'application/json', ...headers }, body,
});
async function rig() {
  const input = new PassThrough({ autoDestroy: false }), commands = [], bytes = [];
  const output = new Writable({ write(chunk, encoding, done) {
    bytes.push(Buffer.from(chunk)); commands.push(JSON.parse(chunk)); done();
  } });
  const pending = startFromStreams({ input, output });
  const ready = frame({ kind: 'ready' });
  input.write(ready.subarray(0, 9)); input.write(ready.subarray(9));
  const workspace = await pending;
  return { ...workspace, input, output, commands, bytes, emit: e => input.write(frame(e)),
    async dispose() { await workspace.close(); input.destroy(); output.destroy(); } };
}
async function started(r, token, choice = false) {
  assert.equal((await action(r.url, token, 'start', JSON.stringify({ read_manifest: choice }))).status, 202, 'AB_BEHAVIOR authorized start');
  const active = (await session(r.url)).active;
  assert.match(active?.job_id ?? '', /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
  assert.equal(active.read_manifest, choice, 'AB_CONSENT_BINDING active request choice');
  assert.deepEqual(r.commands.at(-1), { command: 'start', job_id: active.job_id, read_manifest: choice });
  return active.job_id;
}
const accepted = (r, id, choice = false) => r.emit({ kind: 'accepted', job_id: id, read_manifest: choice });
async function settle(r, id) { return waitState(r.url, s => s.recent[0]?.job_id === id && !s.active); }
async function rejectedResult(change, { choice = true, index = 1, label = 'AB_CONSENT_BINDING' } = {}) {
  const r = await rig();
  try {
    const token = await bootstrap(r.url), id = await started(r, token, choice);
    accepted(r, id, choice);
    const event = resultFor(id, index); change(event); r.emit(event);
    const state = await waitState(r.url, s => s.connection === 'failed' || s.recent[0]?.job_id === id, label);
    const evidence = await raw(r.url, '/evidence/' + id + '.json');
    assert.equal(evidence.status, 404, label + ': actual evidence HTTP route must refuse the unbound result');
    assert.equal(state.connection, 'failed', label + ': invalid result disables actions');
    assert.deepEqual(state.recent, []); assert.equal(state.active, null);
    assert.equal((await action(r.url, token)).status, 503);
    assert.equal(r.commands.length, 1);
  } finally { await r.dispose(); }
}

test('project_workspace_protocol', async () => {
  const r = await rig();
  try {
    const token = await bootstrap(r.url);
    assert.deepEqual(await session(r.url), { workspace_version: 'water.project-workspace.v1', connection: 'ready', active: null, recent: [] });
    assert.equal(r.commands.length, 0, 'AB_BEHAVIOR GET is inert');
    const id = await started(r, token, true); accepted(r, id, true);
    const progress = frame({ kind: 'progress', job_id: id, visited_entries: 5, recorded_entries: 3 });
    r.input.write(progress.subarray(0, 17)); r.input.write(progress.subarray(17));
    assert.deepEqual((await waitState(r.url, s => s.active?.visited_entries === 5)).active,
      { job_id: id, read_manifest: true, phase: 'scanning', visited_entries: 5, recorded_entries: 3 });
    assert.equal((await action(r.url, token)).status, 409);
    assert.equal((await action(r.url, token, 'cancel', '{"job_id":"other-job"}')).status, 409);
    assert.equal((await action(r.url, token, 'cancel', JSON.stringify({ job_id: id }))).status, 202);
    r.emit({ kind: 'cancel_ack', job_id: id, applied: true });
    r.emit({ kind: 'progress', job_id: id, visited_entries: 6, recorded_entries: 3 });
    assert.equal((await waitState(r.url, s => s.active?.visited_entries === 6)).active.phase, 'cancelling');
    assert.equal((await action(r.url, token, 'cancel', JSON.stringify({ job_id: id }))).status, 409);
    // A late cancel can race completed content; preserve the real outcome.
    r.emit(resultFor(id, 1));
    assert.equal((await settle(r, id)).recent[0].marker.status, 'observed');
    assert.deepEqual(r.bytes.map(b => b.toString()), [JSON.stringify({ command: 'start', job_id: id, read_manifest: true }) + '\n',
      JSON.stringify({ command: 'cancel', job_id: id }) + '\n']);
    const copiedId = await started(r, token);
    const bytes = frame({ kind: 'accepted', job_id: copiedId, read_manifest: false });
    r.input.write(bytes); bytes.fill(0x78);
    r.emit({ kind: 'progress', job_id: copiedId, visited_entries: 1, recorded_entries: 0 });
    assert.equal((await waitState(r.url, s => s.active?.visited_entries === 1)).connection, 'ready', 'AB_BEHAVIOR copied input chunk');
  } finally { await r.dispose(); }

  const badFrames = [Buffer.from('\n'), frame({ kind: 'ready', extra: false }),
    Buffer.from('{"version":"' + version + '","kind":"ready","ki\\u006ed":"ready"}\n'),
    Buffer.from(' {"version":"' + version + '","kind":"ready"}\n'),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), frame({ kind: 'ready' })]),
    Buffer.from('{"kind":"\\ud800"}\n'), frame({ kind: 'unknown' }),
    frame({ kind: 'accepted', job_id: 'early', read_manifest: false }),
    Buffer.from('{"version":"wrong","kind":"ready"}\n'),
    Buffer.from('{"version":"' + version + '","kind":"ready"}\r\n'),
    Buffer.from([0xc3, 0x28, 10]), Buffer.from('{"version":"' + version + '","kind":"ready"}'),
    Buffer.alloc(67125248, 0x61)];
  for (const bytes of badFrames) {
    const input = new PassThrough({ autoDestroy: false }), output = new Writable({ write(c, e, ok) { ok(); } });
    const pending = startFromStreams({ input, output }); input.end(bytes);
    await assert.rejects(pending, { message: errorText }, 'AB_BEHAVIOR strict raw framing');
    assert.equal(input.destroyed, false); assert.equal(output.destroyed, false);
    input.destroy(); output.destroy();
  }
  const decoder = new EventDecoder();
  assert.throws(() => decoder.feed('already decoded'), { message: errorText });
  for (const input of [Readable.from(['encoded string']), new PassThrough().setEncoding('utf8')]) {
    const output = new Writable({ write(c, e, ok) { ok(); } });
    await assert.rejects(startFromStreams({ input, output }), { message: errorText }); input.destroy(); output.destroy();
  }
  const invalidEvents = [
    id => ({ kind: 'progress', job_id: 'other', visited_entries: 1, recorded_entries: 0 }),
    id => ({ kind: 'progress', job_id: id, visited_entries: 2, recorded_entries: 3 }),
    id => ({ kind: 'progress', job_id: id, visited_entries: -1, recorded_entries: 0 }),
    id => ({ kind: 'progress', job_id: id, visited_entries: 10001, recorded_entries: 0 }),
    id => ({ kind: 'progress', job_id: id, visited_entries: 1.5, recorded_entries: 0 }),
    id => ({ kind: 'progress', job_id: id, visited_entries: 2, recorded_entries: 0 }),
    id => ({ kind: 'accepted', job_id: id, read_manifest: false }), id => ({ kind: 'ready' }),
    id => ({ kind: 'cancel_ack', job_id: id, applied: true }), id => ({ kind: 'stopped' }),
    id => ({ kind: 'failure', job_id: id, code: 'private-error-canary' }),
    id => ({ kind: 'failure', job_id: null, code: 'NativeFailure' }),
  ];
  for (const make of invalidEvents) {
    const x = await rig();
    try {
      const token = await bootstrap(x.url), id = await started(x, token); accepted(x, id);
      x.emit({ kind: 'progress', job_id: id, visited_entries: 3, recorded_entries: 1 }); x.emit(make(id));
      assert.equal((await waitState(x.url, s => s.connection === 'failed')).active, null);
      assert.equal((await action(x.url, token)).status, 503); assert.equal(x.commands.length, 1);
    } finally { await x.dispose(); }
  }
  const bounded = await rig();
  try {
    const token = await bootstrap(bounded.url), seen = new Set();
    for (let i = 0; i < 32; i++) {
      const id = await started(bounded, token, true); assert(!seen.has(id)); seen.add(id);
      accepted(bounded, id, true); bounded.emit(resultFor(id, 6)); await settle(bounded, id);
    }
    assert.equal((await action(bounded.url, token)).status, 409); assert.equal(bounded.commands.length, 32);
  } finally { await bounded.dispose(); }
  for (const how of ['duplicate', 'stale', 'eof', 'partial', 'error', 'output']) {
    const x = await rig();
    try {
      const token = await bootstrap(x.url), id = await started(x, token); accepted(x, id);
      if (how === 'duplicate') { x.emit(resultFor(id)); await settle(x, id); x.emit(resultFor(id)); }
      if (how === 'stale') x.emit(resultFor('previous-job'));
      if (how === 'eof') x.input.end();
      if (how === 'partial') x.input.end(Buffer.from('{'));
      if (how === 'error') x.input.emit('error', new Error('private-error-canary'));
      if (how === 'output') x.output.end();
      const failed = await waitState(x.url, s => s.connection === 'failed');
      assert.equal(failed.recent.length, how === 'duplicate' ? 1 : 0);
      assert.equal((await action(x.url, token)).status, 503);
    } finally { await x.dispose(); }
  }
});

test('project_workspace_authority', async () => {
  const r = await rig(), other = await rig();
  try {
    const token = await bootstrap(r.url), otherToken = await bootstrap(other.url);
    assert.notEqual(token, otherToken, 'AB_ACTION_AUTH independent instance tokens');
    const correct = { Origin: r.url, 'X-Water-Action': token, 'Content-Type': 'application/json' };
    const invalid = [
      { ...correct, Host: 'localhost:' + new URL(r.url).port },
      { ...correct, Origin: 'https://untrusted.invalid' },
      { 'X-Water-Action': token, 'Content-Type': 'application/json' },
      { Origin: r.url, 'Content-Type': 'application/json' },
      { ...correct, 'X-Water-Action': '0'.repeat(64) }, { ...correct, 'X-Water-Action': otherToken },
      { ...correct, Origin: [r.url, r.url] }, { ...correct, 'X-Water-Action': [token, token] },
    ];
    for (const headers of invalid) {
      const before = r.commands.length;
      const reply = await raw(r.url, '/actions/start', { method: 'POST', headers, body: '{"read_manifest":false}' });
      assert.equal(r.commands.length, before, 'AB_ACTION_AUTH unauthorized HTTP must not write an actual pipe command');
      assert.equal(reply.status, 403, 'AB_ACTION_AUTH exact origin/token/host');
      assert.equal(reply.body.toString(), errorText); assert(!reply.body.includes(token));
    }
    for (const [path, method, status] of [['/actions/start', 'GET', 405], ['/actions/cancel', 'HEAD', 405],
      ['/session.json', 'POST', 405], ['/', 'PUT', 405], ['/session.json?x=1', 'GET', 404],
      ['/../model.mjs', 'GET', 404], ['/launch.mjs', 'GET', 404], ['/?x=1', 'GET', 404],
      ['/evidence/../job.json', 'GET', 404], ['/evidence/%6aob.json', 'GET', 404]]) {
      const response = await raw(r.url, path, { method }); assert.equal(response.status, status);
      assert.equal(response.headers['cache-control'], 'no-store'); assert.equal(response.headers['x-content-type-options'], 'nosniff');
      assert.equal(response.headers['referrer-policy'], 'no-referrer');
      assert(response.headers['content-security-policy'].includes("default-src 'none'"));
      assert.equal(response.headers['access-control-allow-origin'], undefined);
      if (method === 'HEAD') assert.equal(response.body.length, 0);
    }
    for (const body of ['', '{}', 'null', '[]', 'true', '{"read_manifest":null}', '{"read_manifest":0}',
      '{"read_manifest":"true"}', '{"read_manifest":false,"extra":0}', '{"job_id":"caller"}',
      '{"read_manifest":false,"read_\\u006danifest":true}', '{"read_manifest":true,"read_manifest":false}',
      '{}{}', '\ufeff{"read_manifest":false}', Buffer.from([0xc3, 0x28]), '{"__proto__":{}}']) {
      assert.equal((await action(r.url, token, 'start', body)).status, 400, 'AB_ACTION_AUTH strict start body');
    }
    for (const body of ['{}', '{"job_id":null}', '{"job_id":"a/b"}', '{"job_id":"a","read_manifest":true}',
      '{"job_id":"a","job_\\u0069d":"b"}']) assert.equal((await action(r.url, token, 'cancel', body)).status, 400);
    assert.equal((await action(r.url, token, 'start', '{"read_manifest":false}', { 'Content-Type': 'text/plain' })).status, 400);
    const large = ' '.repeat(1025);
    assert.equal((await action(r.url, token, 'start', large)).status, 413);
    assert.equal((await action(r.url, token, 'start', large, { 'Transfer-Encoding': 'chunked' })).status, 413);
    assert.equal((await action(r.url, token, 'start', '{}', { 'Content-Length': '1025' })).status, 413);
    assert.equal(r.commands.length, 0);
    for (const path of ['/session.json', '/app.mjs', '/styles.css']) {
      const reply = await raw(r.url, path), head = await raw(r.url, path, { method: 'HEAD' });
      assert.equal(reply.status, 200); assert(!reply.body.includes(token)); assert.equal(head.body.length, 0);
      assert.equal(head.headers['content-length'], reply.headers['content-length']);
    }
    const exact = '{"read_manifest":false}'.padStart(1024, ' ');
    assert.equal((await action(r.url, token, 'start', exact)).status, 202, 'AB_ACTION_AUTH exact byte budget');
    const id = (await session(r.url)).active.job_id; accepted(r, id);
    const before = r.commands.length;
    assert.equal((await action(r.url, token, 'cancel', JSON.stringify({ job_id: id }), { Origin: 'null' })).status, 403);
    assert.equal(r.commands.length, before, 'AB_ACTION_AUTH cancel is also authorized');
    assert(!JSON.stringify(await session(r.url)).includes(token));
  } finally { await r.dispose(); await other.dispose(); }
});

test('project_workspace_consent_and_exports', async () => {
  const first = await rig(); try { await bootstrap(first.url); } finally { await first.dispose(); }
  for (const options of [undefined, null, {}, { initialDirectory: '.' }, { initialDirectory: '.', binaryPath: 'other.exe' },
    { initialDirectory: '.', env: {} }, { initialDirectory: '.', port: -1 }, { initialDirectory: '\ud800' },
    { get initialDirectory() { throw new Error('getter-canary'); } }]) {
    await assert.rejects(launchProjectWorkspace(options), { message: errorText });
  }
  // The first case attacks the actual false-request -> result -> evidence route.
  await rejectedResult(e => { e.read_manifest = false; }, { choice: false });
  await rejectedResult(e => { e.read_manifest = false; });
  await rejectedResult(e => { e.job_id = 'other-job'; });
  await rejectedResult(e => { e.bundle.session_id = 'other-job'; });
  await rejectedResult(e => { e.bundle.policy.limits.max_dir_entries = 1; });
  await rejectedResult(e => { e.marker.extra = 'raw-content-canary'; });
  await rejectedResult(e => { e.marker.error_code = 'raw-error-canary'; }, { index: 4 });
  await rejectedResult(e => { e.marker.status = 'missing'; e.marker.observation_json = null; }, { index: 2 });
  await rejectedResult(e => { e.marker = structuredClone(cases[1].marker); }, { index: 6 });
  await rejectedResult(e => { e.marker = structuredClone(cases[1].marker); }, { index: 2 });
  const mutations = [
    o => { o.project_membership_verified = true; }, o => { o.ordinary_content_read = false; },
    o => { o.native_user_gesture_authenticated = true; }, o => { o.race_protection_verified = true; },
    o => { o.root_binding_verified = false; }, o => { o.risk = 'low'; }, o => { o.action = 'delete'; },
    o => { o.bytes_read = 262145; }, o => { o.bytes_read = -1; }, o => { o.bytes_read = 1.5; },
    o => { o.name = 'raw-content-canary'; }, o => { o.evidence.scripts = 'raw-content-canary'; },
    o => { o.evidence.declared_private = 'false'; }, o => { o.evidence.has_name = null; },
    o => { o.evidence.source_kind = 'native_root_package_json'; }, o => { o.evidence.format_verified = false; },
    o => { o.evidence.tool_version_known = true; }, o => { o.evidence.project_membership_verified = true; },
    o => { o.evidence.recognized_field_count = 2; }, o => { o.evidence.recognized_field_count = 10; },
    o => { o.evidence.counts.scripts = 129; }, o => { o.evidence.counts.dependencies = 4097; },
    o => { o.evidence.counts.workspace_patterns = 129; }, o => { o.evidence.counts.extra = 0; },
    o => { delete o.evidence.counts.peer_dependencies; }, o => { o.evidence.counts.dependencies = null; },
  ];
  for (const mutate of mutations) await rejectedResult(e => {
    const o = JSON.parse(e.marker.observation_json); mutate(o); e.marker.observation_json = JSON.stringify(o);
  });
  const golden = JSON.parse(cases[1].marker.observation_json);
  for (const layer of [[], ['evidence'], ['evidence', 'counts']]) {
    let original = golden; for (const key of layer) original = original[key];
    for (const key of Object.keys(original)) await rejectedResult(e => {
      const o = JSON.parse(e.marker.observation_json); let part = o; for (const name of layer) part = part[name];
      delete part[key]; e.marker.observation_json = JSON.stringify(o);
    });
  }
  for (const [key, max] of Object.entries({ scripts: 128, dependencies: 4096, dev_dependencies: 4096,
    peer_dependencies: 4096, optional_dependencies: 4096, workspace_patterns: 128 })) {
    for (const wrong of [-1, 0.5, max + 1, '1']) await rejectedResult(e => {
      const o = JSON.parse(e.marker.observation_json); o.evidence.counts[key] = wrong;
      e.marker.observation_json = JSON.stringify(o);
    });
  }
  for (const rawText of [' ' + cases[1].marker.observation_json,
    cases[1].marker.observation_json.replace('"read_only":true', '"read_only":true,"read_\\u006fnly":true'),
    cases[1].marker.observation_json.replace('"bytes_read":140', '"bytes_read":140,"bytes_read":140'),
    '{"private":"\\ud800"}', '{"padding":"' + 'x'.repeat(8192) + '"}']) {
    await rejectedResult(e => { e.marker.observation_json = rawText; });
  }
  const mismatch = await rig();
  try {
    const token = await bootstrap(mismatch.url), id = await started(mismatch, token);
    accepted(mismatch, id, true);
    assert.equal((await waitState(mismatch.url, s => s.connection === 'failed')).recent.length, 0, 'AB_CONSENT_BINDING accepted choice');
  } finally { await mismatch.dispose(); }

  const r = await rig(), reports = [];
  try {
    const token = await bootstrap(r.url), oldEvidence = [];
    for (const index of [1, 0, 6, 2, 3, 4, 5]) {
      const choice = cases[index].read_manifest, id = await started(r, token, choice);
      accepted(r, id, choice); const event = resultFor(id, index); r.emit(event);
      const state = await settle(r, id), current = state.recent[0];
      assert.equal(current.read_manifest, choice); assert.deepEqual(current.marker, event.marker);
      assert.equal(state.recent.length, Math.min(reports.length + oldEvidence.length + 1, 2));
      const path = '/evidence/' + id + '.json', attachment = await raw(r.url, path);
      if (index === 1) {
        oldEvidence.push(path); assert.equal(current.evidence_url, path); assert.equal(attachment.status, 200);
        assert.deepEqual(attachment.body, Buffer.from(event.marker.observation_json));
        assert.equal(attachment.headers['content-type'], 'application/json;charset=utf-8');
        assert.equal(attachment.headers['content-disposition'], 'attachment; filename="water-project-evidence.json"');
        assert.equal(+attachment.headers['content-length'], attachment.body.length);
        const head = await raw(r.url, path, { method: 'HEAD' }); assert.equal(head.body.length, 0);
        assert.equal(head.headers['content-length'], attachment.headers['content-length']);
        assert.equal((await raw(r.url, path, { method: 'POST' })).status, 405);
      } else { assert.equal(current.evidence_url, null); assert.equal(attachment.status, 404); }
      if (current.selection === 'cancelled') assert.equal(current.report_url, null);
      else {
        assert(current.report_url.startsWith('http://127.0.0.1:')); reports.push(current.report_url);
        const actual = JSON.parse((await raw(current.report_url, '/session.json')).body);
        assert.equal(actual.policy.ordinary_content_read, false);
        assert.equal(actual.snapshots[0].source_kind, 'native_scope_metadata');
        assert.deepEqual((await raw(current.report_url, '/exports/1.json')).body, Buffer.from(event.bundle.snapshots[0].redacted_json));
      }
      if (index === 6) {
        assert.equal((await raw(r.url, oldEvidence[0])).status, 404, 'AB_CONSENT_BINDING evicted evidence revoked');
        await assert.rejects(raw(reports[0], '/session.json'), 'AB_BEHAVIOR evicted owned W server closed');
      }
    }
  } finally { await r.dispose(); }
  for (const url of reports) await assert.rejects(raw(url, '/session.json'));

  // Zero counts cannot reveal whether empty object/array fields were provided.
  const empty = await rig();
  try {
    const token = await bootstrap(empty.url), id = await started(empty, token, true); accepted(empty, id, true);
    const e = resultFor(id, 1), o = JSON.parse(e.marker.observation_json);
    o.bytes_read = 0; o.evidence.has_name = o.evidence.has_version = false; o.evidence.declared_private = false;
    o.evidence.recognized_field_count = 7;
    for (const key of Object.keys(o.evidence.counts)) o.evidence.counts[key] = 0;
    e.marker.observation_json = JSON.stringify(o); empty.emit(e); await settle(empty, id);
    assert.deepEqual((await raw(empty.url, '/evidence/' + id + '.json')).body, Buffer.from(e.marker.observation_json),
      'AB_BEHAVIOR explicit false and zero fields retained without inferred presence');
    const next = await started(empty, token, true); accepted(empty, next, true);
    const zero = resultFor(next, 1); o.evidence.declared_private = null; o.evidence.recognized_field_count = 0;
    zero.marker.observation_json = JSON.stringify(o); empty.emit(zero); await settle(empty, next);
    assert.deepEqual((await raw(empty.url, '/evidence/' + next + '.json')).body, Buffer.from(zero.marker.observation_json),
      'AB_BEHAVIOR null and entirely absent recognized fields retained');
  } finally { await empty.dispose(); }

  const directory = join(root, '.local/checks/WATER-W1-AB'); mkdirSync(directory, { recursive: true });
  const evidence = mkdtempSync(join(directory, 'model-replay-'));
  const child = spawn(process.execPath, ['scripts/acceptance/project-host-replay.mjs'],
    { cwd: root, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => appendFileSync(join(evidence, 'stdout.log'), Buffer.from(chunk)));
  const stderr = []; child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)));
  const exited = new Promise((ok, bad) => { child.once('error', bad); child.once('close', (code, signal) => ok({ code, signal })); });
  let live;
  try {
    live = await startFromStreams({ input: child.stdout, output: child.stdin }); const token = await bootstrap(live.url);
    for (const [ordinal, choice] of [false, true, true, true].entries()) {
      assert.equal((await action(live.url, token, 'start', JSON.stringify({ read_manifest: choice }))).status, 202);
      const id = (await session(live.url)).active.job_id;
      if (ordinal === 3) assert.equal((await action(live.url, token, 'cancel', JSON.stringify({ job_id: id }))).status, 202);
      const s = await settle(live, id);
      assert.equal(s.recent[0].marker.status, ['not_requested', 'observed', 'skipped', 'skipped'][ordinal]);
    }
  } finally {
    if (!child.stdin.destroyed && !child.stdin.writableEnded) child.stdin.end(Buffer.from('{"command":"shutdown"}\n'));
    await live?.close(); child.stdout.resume(); const exit = await exited;
    writeFileSync(join(evidence, 'exit.json'), JSON.stringify({ pid: child.pid, exit, systemNativeDialogs: 0,
      newAAProduct: false, envelope: 'synthetic declaration around actual dependencies; no S execution' }) + '\n');
    assert.deepEqual(exit, { code: 0, signal: null }); assert.equal(Buffer.concat(stderr).length, 0);
    console.log(JSON.stringify({ replay: evidence, pid: child.pid, exit, newAAProduct: false, systemNativeDialogs: 0 }));
  }
  const outside = await startReview({ bundle: resultFor('outside-owner').bundle }), borrowed = await rig();
  try {
    await Promise.all([borrowed.close(), borrowed.close()]);
    assert.equal(borrowed.input.destroyed, false); assert.equal(borrowed.output.destroyed, false);
    assert.equal((await raw(outside.url, '/session.json')).status, 200);
  } finally { await borrowed.dispose(); await outside.close(); }

  for (const example of lateDefinitions.accept) {
    const original = JSON.stringify(example), status = example.event.bundle.snapshots[0].view.status;
    assertMarker(example.event.marker, true, 'confirmed', status);
    const model = new WorkspaceState(); model.receive({ version, kind: 'ready' });
    const command = model.start(true), event = structuredClone(example.event);
    event.job_id = event.bundle.session_id = command.job_id; event.bundle.snapshots[0].view.scan_id = command.job_id;
    model.receive({ version, kind: 'accepted', job_id: command.job_id, read_manifest: true });
    const result = model.receive(event); assert.deepEqual(result.bundle, event.bundle);
    model.finish(result, 'http://127.0.0.1:1', null);
    assert.equal(model.view().connection, 'ready'); assert.equal(model.view().active, null);
    assert.equal(model.view().recent[0].status, status); assert.equal(model.view().recent[0].evidence_url, null);
    assert.equal(model.start(false).read_manifest, false, 'AB_LATE_CANCELLED_CONTENT next model request has independent choice');

    const late = await rig();
    try {
      const token = await bootstrap(late.url), id = await started(late, token, true); accepted(late, id, true);
      event.job_id = event.bundle.session_id = id; event.bundle.snapshots[0].view.scan_id = id; late.emit(event);
      const state = await settle(late, id), current = state.recent[0];
      assert.equal(state.connection, 'ready', 'AB_LATE_CANCELLED_CONTENT metadata survives content cancellation');
      assert.equal(state.active, null); assert.equal(current.status, status); assert.equal(current.read_manifest, true);
      assert.deepEqual(current.marker, example.event.marker); assert.equal(current.evidence_url, null); assert(current.report_url);
      const served = JSON.parse((await raw(current.report_url, '/session.json')).body);
      assert.deepEqual(served, event.bundle, 'AB_LATE_CANCELLED_CONTENT real W preserves metadata/status/summary/Q');
      assert.deepEqual((await raw(current.report_url, '/exports/1.json')).body, Buffer.from(example.event.bundle.snapshots[0].redacted_json));
      for (const method of ['GET', 'HEAD']) assert.equal((await raw(late.url, '/evidence/' + id + '.json', { method })).status, 404);
      const next = await started(late, token); accepted(late, next); late.emit(resultFor(next)); await settle(late, next);
      assert.equal(late.commands.at(-1).read_manifest, false);
      assert.equal((await session(late.url)).recent[0].marker.status, 'not_requested');
      assert.equal((await raw(late.url, '/evidence/' + next + '.json')).status, 404);
    } finally { await late.dispose(); }
    assert.equal(JSON.stringify(example), original, 'AB_LATE_CANCELLED_CONTENT frozen input is unchanged');

    const lateVariant = (e, mutate) => {
      const variant = structuredClone(example.event);
      variant.job_id = variant.bundle.session_id = e.job_id; variant.bundle.snapshots[0].view.scan_id = e.job_id;
      Object.assign(e, variant); mutate(e);
    };
    for (const mutate of [
      e => { e.marker.error_code = 'selection_cancelled'; }, e => { e.marker.error_code = 'InvalidManifest'; },
      e => { e.marker.error_code = null; }, e => { e.marker.observation_json = cases[1].marker.observation_json; },
      e => { e.marker.extra = 'raw-content-canary'; }, e => { e.job_id = 'previous-job'; },
      e => { e.read_manifest = false; },
    ]) await rejectedResult(e => lateVariant(e, mutate), { label: 'AB_LATE_CANCELLED_CONTENT' });
    await rejectedResult(e => lateVariant(e, e => { e.read_manifest = false; }), { choice: false, label: 'AB_LATE_CANCELLED_CONTENT' });
  }
  await rejectedResult(e => { e.marker = structuredClone(lateDefinitions.accept[0].event.marker); },
    { index: 6, label: 'AB_LATE_CANCELLED_CONTENT' });
  console.log(JSON.stringify({ lateCancelSources: lateDefinitions.accept.map(c => ({ name: c.name,
    source: c.source ?? lateDefinitions.actualCapture.source_kind })), newAAExecuted: false, nativeSelectorExecuted: false }));
});
