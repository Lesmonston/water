import { Readable, Writable } from 'node:stream';
import { startServer as startReviewServer } from '../native-review/server.mjs';
import { ActionError, EventDecoder, WorkspaceState, unavailable } from './model.mjs';
import { createWorkspaceServer } from './server.mjs';

export async function startFromStreams(options = {}) {
  let input, output, port;
  try {
    if (!options || Object.getPrototypeOf(options) !== Object.prototype) throw new Error();
    for (const key of Reflect.ownKeys(options)) {
      const d = Object.getOwnPropertyDescriptor(options, key);
      if (!['input', 'output', 'port'].includes(key) || !d.enumerable || !Object.hasOwn(d, 'value')) throw new Error();
    }
    ({ input, output, port = 0 } = options);
    if (!(input instanceof Readable) || input.readableEncoding !== null || input.destroyed || input.readableEnded ||
        !(output instanceof Writable) || output.destroyed || output.writableEnded || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error();
  } catch { throw new Error(unavailable); }
  const state = new WorkspaceState(), decoder = new EventDecoder(), reports = new Map();
  const originalFlow = input.readableFlowing;
  let server, closing, disposed = false, tail = Promise.resolve(), readyTimer, resolveReady, rejectReady;
  const ready = new Promise((ok, bad) => { resolveReady = ok; rejectReady = bad; });
  const failure = () => { if (!disposed) { state.fail(); rejectReady(new Error(unavailable)); } };
  // Events and HTTP actions share one queue, including asynchronous W creation.
  // A result cannot release the active job before its own W server is captured.
  function enqueue(operation) {
    const next = tail.then(operation);
    tail = next.catch(() => {});
    return next;
  }
  async function receive(event) {
    if (disposed || state.view().connection === 'failed') return;
    let report;
    try {
      const result = state.receive(event);
      if (event.kind === 'ready') resolveReady();
      if (!result) return;
      if (result.selection === 'confirmed') report = await startReviewServer({ bundle: result.bundle });
      if (disposed || !state.available()) { await report?.close(); return; }
      const removed = state.finish(result, report?.url ?? null);
      if (report) reports.set(result.job_id, report);
      if (removed) { await reports.get(removed.job_id)?.close(); reports.delete(removed.job_id); }
    } catch { await report?.close(); failure(); }
  }
  function data(chunk) {
    if (disposed) return;
    input.pause();
    if (!(chunk instanceof Uint8Array)) { failure(); return; }
    // Copy synchronously at the stream boundary, before any queued await.
    const owned = Buffer.from(chunk);
    enqueue(async () => {
      if (disposed || state.view().connection === 'failed') return;
      try { for (const event of decoder.feed(owned)) await receive(event); } catch { failure(); }
    }).finally(() => { if (!disposed && !input.readableEnded) input.resume(); });
  }
  const end = () => {
    enqueue(() => {
      if (disposed) return;
      try { decoder.end(); state.end(); } catch { failure(); }
      if (!state.available()) rejectReady(new Error(unavailable));
    });
  };
  const inputClose = () => { if (!input.readableEnded) failure(); };
  const outputClose = () => { if (state.view().connection !== 'closed') failure(); };
  const detach = () => {
    input.off('data', data); input.off('end', end); input.off('error', failure); input.off('close', inputClose);
    output.off('error', failure); output.off('close', outputClose); output.off('finish', outputClose);
    if (originalFlow === true || input.listenerCount('data') > 0) input.resume(); else input.pause();
  };
  const close = () => {
    if (closing) return closing;
    disposed = true; clearTimeout(readyTimer); detach(); state.end();
    closing = (async () => {
      await server?.close(); await tail;
      await Promise.all([...reports.values()].map(report => report.close())); reports.clear();
    })();
    return closing;
  };
  input.on('data', data); input.once('end', end); input.on('error', failure); input.on('close', inputClose);
  output.on('error', failure); output.on('close', outputClose); output.on('finish', outputClose);
  readyTimer = setTimeout(failure, 10000);
  try {
    await ready; clearTimeout(readyTimer);
    if (!state.available()) throw new Error();
    const act = (action, id) => enqueue(async () => {
      if (disposed) throw new ActionError(503);
      const command = action === 'start' ? state.start() : state.cancel(id);
      try {
        const raw = Buffer.from(JSON.stringify(command) + '\n');
        await new Promise((ok, bad) => output.write(raw, error => error ? bad(error) : ok()));
      } catch { failure(); throw new ActionError(503); }
    });
    server = await createWorkspaceServer({ state, act, port });
    return { url: server.url, close };
  } catch { await close(); throw new Error(unavailable); }
}
