import { Readable } from 'node:stream';
import { assertReviewInput } from './model.mjs';
import { startServer } from './server.mjs';

const fail = () => { throw new Error('Unsupported native review.'); };

// Validate compact syntax and decoded object keys, including escaped duplicates.
// JSON.parse subsequently validates scalar syntax/escapes; no data is evaluated.
function compactObject(text) {
  let at = 0;
  function string() {
    const start = at++;
    while (at < text.length) {
      const c = text[at++];
      if (c === '"') return JSON.parse(text.slice(start, at));
      if (c === '\\') at++;
    }
    fail();
  }
  function value() {
    const c = text[at];
    if (c === '"') { string(); return; }
    if (c === '{' || c === '[') {
      const object = c === '{', end = object ? '}' : ']', keys = new Set();
      at++;
      if (text[at] === end) { at++; return; }
      while (at < text.length) {
        if (object) {
          if (text[at] !== '"') fail();
          const key = string();
          if (keys.has(key)) fail();
          keys.add(key);
          if (text[at++] !== ':') fail();
        }
        value();
        if (text[at] === end) { at++; return; }
        if (text[at++] !== ',') fail();
      }
      fail();
    }
    const token = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(at));
    if (!token) fail();
    at += token[0].length;
  }
  if (text[0] !== '{') fail();
  value();
  if (at !== text.length) fail();
  return JSON.parse(text);
}
export async function readSession(stream) {
  try {
    if (!(stream instanceof Readable) || stream.readableEncoding !== null) fail();
    let length = 0;
    const chunks = [];
    for await (const chunk of stream) {
      if (!(chunk instanceof Uint8Array)) fail();
      length += chunk.byteLength;
      if (length > 67108865) fail();
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks, length);
    const end = bytes.at(-1) === 10 ? length - 1 : length;
    if (end > 67108864 || bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail();
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, end));
    const input = compactObject(text);
    if (input.bundle_version !== 'water.native-session-bundle.v1') fail();
    return assertReviewInput(input);
  } catch { fail(); }
}
export async function startFromStream({ stream, port = 0 } = {}) {
  return startServer({ bundle: await readSession(stream), port });
}
