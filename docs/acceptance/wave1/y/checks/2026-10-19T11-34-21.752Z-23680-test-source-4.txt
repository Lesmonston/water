import { randomBytes } from 'node:crypto';
import { assertReviewInput } from '../native-review/model.mjs';

export const workspaceVersion = 'water.live-workspace.v1';
export const unavailable = 'Workspace unavailable.';
export const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
const fail = () => { throw new Error(unavailable); };
export class ActionError extends Error {
  constructor(status) { super(unavailable); this.status = status; }
}
export function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) fail();
}

// Scan decoded keys before JSON.parse can erase duplicates, including escaped
// duplicates at any nesting depth. Wire events additionally forbid whitespace.
export function parseObject(bytes, compact = false) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  let at = 0;
  const space = () => { if (!compact) while (/[ \t\r\n]/.test(text[at] ?? '') && at < text.length) at++; };
  function string() {
    const start = at++;
    while (at < text.length) {
      const c = text[at++];
      if (c === '"') {
        const decoded = JSON.parse(text.slice(start, at));
        if (!decoded.isWellFormed()) fail();
        return decoded;
      }
      if (c === '\\') at++;
    }
    fail();
  }
  function value(depth) {
    if (depth > 128) fail();
    space();
    const c = text[at];
    if (c === '"') { string(); return; }
    if (c === '{' || c === '[') {
      const object = c === '{', end = object ? '}' : ']', keys = new Set();
      at++; space();
      if (text[at] === end) { at++; return; }
      while (at < text.length) {
        space();
        if (object) {
          if (text[at] !== '"') fail();
          const key = string();
          if (keys.has(key)) fail();
          keys.add(key); space();
          if (text[at++] !== ':') fail();
        }
        value(depth + 1); space();
        if (text[at] === end) { at++; return; }
        if (text[at++] !== ',') fail();
      }
      fail();
    }
    const token = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(at));
    if (!token) fail();
    at += token[0].length;
  }
  space(); if (text[at] !== '{') fail();
  value(0); space();
  if (at !== text.length) fail();
  return JSON.parse(text);
}

export class EventDecoder {
  #chunks = [];
  #length = 0;
  feed(bytes) {
    if (!(bytes instanceof Uint8Array)) fail();
    const events = [];
    let from = 0;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== 10) continue;
      const end = bytes.subarray(from, i);
      this.#length += end.length;
      if (!this.#length || this.#length + 1 > 67109888) fail();
      this.#chunks.push(Buffer.from(end));
      events.push(parseObject(Buffer.concat(this.#chunks, this.#length), true));
      this.#chunks = []; this.#length = 0; from = i + 1;
    }
    if (from < bytes.length) {
      const tail = bytes.subarray(from);
      this.#length += tail.length;
      if (this.#length > 67109888) fail();
      this.#chunks.push(Buffer.from(tail));
    }
    return events;
  }
  end() { if (this.#length) fail(); }
}

const eventKeys = {
  ready: [], accepted: ['job_id'], progress: ['job_id', 'visited_entries', 'recorded_entries'],
  cancel_ack: ['job_id', 'applied'], result: ['job_id', 'bundle'], failure: ['job_id', 'code'], stopped: [],
};
const failures = new Set(['InvalidRequest', 'Busy', 'ReusedJobId', 'UnknownJob', 'JobLimit', 'NativeFailure']);
export class WorkspaceState {
  #ready = false;
  #connection = 'closed';
  #active = null;
  #recent = [];
  #used = new Set();
  #pendingCancel = new Set();
  available() { return this.#ready && this.#connection === 'ready'; }
  view() {
    const a = this.#active;
    return { workspace_version: workspaceVersion, connection: this.#connection,
      active: a ? { job_id: a.job_id, phase: a.phase, visited_entries: a.visited_entries, recorded_entries: a.recorded_entries } : null,
      recent: this.#recent.map(r => ({ ...r })) };
  }
  fail() { this.#connection = 'failed'; this.#active = null; }
  end() {
    if (this.#connection === 'failed') return;
    if (!this.#ready || this.#active) this.fail();
    else this.#connection = 'closed';
  }
  start() {
    if (!this.available()) throw new ActionError(503);
    if (this.#active || this.#used.size >= 32) throw new ActionError(409);
    let id;
    do { id = 'job-' + randomBytes(16).toString('hex'); } while (this.#used.has(id));
    this.#used.add(id);
    this.#active = { job_id: id, phase: 'selecting', visited_entries: 0, recorded_entries: 0,
      accepted: false, cancelling: false, settling: false };
    return { command: 'start', job_id: id };
  }
  cancel(id) {
    if (!this.available()) throw new ActionError(503);
    const a = this.#active;
    if (!a || a.job_id !== id || a.cancelling || a.settling) throw new ActionError(409);
    a.cancelling = true; a.phase = 'cancelling'; this.#pendingCancel.add(id);
    return { command: 'cancel', job_id: id };
  }
  receive(event) {
    const fields = eventKeys[event.kind];
    if (!fields || event.version !== 'water.interactive-host.v1') fail();
    exactObject(event, ['version', 'kind', ...fields]);
    if (event.kind === 'ready') {
      if (this.#ready || this.#connection === 'failed') fail();
      this.#ready = true; this.#connection = 'ready'; return null;
    }
    if (!this.available()) fail();
    if (event.kind === 'stopped') {
      if (this.#active) fail();
      this.#connection = 'closed'; return null;
    }
    if (!validId(event.job_id) && !(event.kind === 'failure' && event.job_id === null)) fail();
    const a = this.#active;
    if (event.kind === 'failure') {
      if (!failures.has(event.code)) fail();
      // A cancel racing a genuine terminal may receive UnknownJob afterwards.
      // It is a request rejection, and never a second terminal or a new report.
      if (event.code === 'UnknownJob' && this.#pendingCancel.has(event.job_id) && !a) {
        this.#pendingCancel.delete(event.job_id); return null;
      }
      if (!a || a.job_id !== event.job_id) fail();
      if (event.code === 'NativeFailure' && !a.accepted) fail();
      // The declared failure has no validated bundle. Keep existing reports and
      // disable this connection without inventing a selection or scan result.
      this.fail(); return null;
    }
    if (event.kind === 'result') {
      if (!a || !a.accepted || a.settling || event.job_id !== a.job_id) fail();
      const bundle = event.bundle;
      assertReviewInput(bundle);
      if (bundle.bundle_version !== 'water.native-session-bundle.v1' || bundle.session_id !== event.job_id) fail();
      const limits = bundle.policy.limits;
      if (limits.max_depth !== 8 || limits.max_entries !== 10000 || limits.max_dir_entries !== 256) fail();
      const status = bundle.selection === 'cancelled' ? 'selection_cancelled' : bundle.snapshots[0].view.status;
      if (!['selection_cancelled', 'completed', 'partial', 'cancelled'].includes(status)) fail();
      a.settling = true;
      return { job_id: event.job_id, selection: bundle.selection, status, bundle };
    }
    if (!a || a.job_id !== event.job_id || a.settling) fail();
    if (event.kind === 'accepted') {
      if (a.accepted) fail();
      a.accepted = true; return null;
    }
    if (!a.accepted) fail();
    if (event.kind === 'progress') {
      const v = event.visited_entries, r = event.recorded_entries;
      if (!Number.isInteger(v) || !Number.isInteger(r) || v < 0 || v > 10000 || r < 0 || r > v ||
          v < a.visited_entries || r < a.recorded_entries) fail();
      a.visited_entries = v; a.recorded_entries = r;
      if (!a.cancelling) a.phase = 'scanning';
      return null;
    }
    if (event.kind === 'cancel_ack') {
      if (typeof event.applied !== 'boolean' || !this.#pendingCancel.delete(event.job_id)) fail();
      return null;
    }
    fail();
  }
  finish(result, reportUrl) {
    if (!this.available() || !this.#active?.settling || this.#active.job_id !== result.job_id) fail();
    this.#recent.unshift({ job_id: result.job_id, selection: result.selection, status: result.status, report_url: reportUrl });
    this.#active = null;
    return this.#recent.length > 2 ? this.#recent.pop() : null;
  }
}
