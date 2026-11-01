// Structural composition of a Claude Code session transcript (.jsonl), for the 11-02 note to the denglou
// controller. Streams line by line and never prints message text: only record types, tool names, byte counts,
// image counts, repeated tool results (by hash), the largest records and compaction markers.
// usage: node session-composition.cjs <session.jsonl> [out.json]
const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');
const [file, out] = process.argv.slice(2);
const add = (m, k, n = 1) => { m[k] = (m[k] || 0) + n; };
const s = { file, lines: 0, bytes: 0, badLines: 0, byType: {}, bytesByType: {}, bytesByTopKey: {}, toolCalls: {}, toolInputBytes: {},
  toolResultBytes: {}, toolUseResultBytes: {}, imageBlocks: 0, imageBytes: 0, imagesByTool: {}, textBytes: { user: 0, assistant: 0 },
  thinkingBytes: 0, compactions: 0, summaries: 0, sidechainBytes: 0, usage: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
  firstAt: null, lastAt: null, bytesByDay: {}, largest: [], repeats: {} };
const toolName = new Map(), seen = new Map();
const keep = (row) => { s.largest.push(row); s.largest.sort((a, b) => b.bytes - a.bytes); if (s.largest.length > 25) s.largest.pop(); };
const size = v => (v === undefined ? 0 : Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v)));
function blockBytes(block, owner) {
  if (!block || typeof block !== 'object') return;
  if (block.type === 'image') { const b = size(block.source && block.source.data); s.imageBlocks++; s.imageBytes += b; add(s.imagesByTool, owner || 'user-pasted', b); }
  if (Array.isArray(block.content)) for (const c of block.content) blockBytes(c, owner);
}
const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
rl.on('line', line => {
  const bytes = Buffer.byteLength(line) + 1;
  s.lines++; s.bytes += bytes;
  let r; try { r = JSON.parse(line); } catch { s.badLines++; return; }
  const type = r.type + (r.subtype ? ':' + r.subtype : '');
  add(s.byType, type); add(s.bytesByType, type, bytes);
  for (const k of Object.keys(r)) add(s.bytesByTopKey, k, size(r[k]));
  if (r.isSidechain) s.sidechainBytes += bytes;
  if (r.subtype === 'compact_boundary' || r.isCompactSummary) s.compactions++;
  if (r.type === 'summary') s.summaries++;
  if (r.timestamp) { s.firstAt ||= r.timestamp; s.lastAt = r.timestamp; add(s.bytesByDay, r.timestamp.slice(0, 10), bytes); }
  const msg = r.message;
  let label = type;
  if (msg && Array.isArray(msg.content)) {
    for (const b of msg.content) {
      if (b.type === 'tool_use') { toolName.set(b.id, b.name); add(s.toolCalls, b.name); add(s.toolInputBytes, b.name, size(b.input)); label = 'tool_use:' + b.name; }
      else if (b.type === 'tool_result') {
        const name = toolName.get(b.tool_use_id) || '?';
        const n = size(b.content); add(s.toolResultBytes, name, n); label = 'tool_result:' + name;
        blockBytes(b, name);
        const h = crypto.createHash('sha1').update(typeof b.content === 'string' ? b.content : JSON.stringify(b.content || '')).digest('hex');
        const prev = seen.get(h);
        if (prev && n >= 4096) { const k = name; const rep = (s.repeats[k] ||= { count: 0, bytes: 0 }); rep.count++; rep.bytes += n; }
        else if (!prev) seen.set(h, 1);
      } else if (b.type === 'text') s.textBytes[msg.role === 'assistant' ? 'assistant' : 'user'] += size(b.text);
      else if (b.type === 'thinking') s.thinkingBytes += size(b.thinking);
      else blockBytes(b, null);
    }
  } else if (msg && typeof msg.content === 'string') s.textBytes[msg.role === 'assistant' ? 'assistant' : 'user'] += size(msg.content);
  if (r.toolUseResult !== undefined) add(s.toolUseResultBytes, label.startsWith('tool_result:') ? label.slice(12) : '?', size(r.toolUseResult));
  const u = msg && msg.usage;
  if (u) { s.usage.input += u.input_tokens || 0; s.usage.output += u.output_tokens || 0; s.usage.cacheRead += u.cache_read_input_tokens || 0; s.usage.cacheCreate += u.cache_creation_input_tokens || 0; }
  if (bytes >= 1e6) keep({ line: s.lines, bytes, label, at: r.timestamp || null });
});
rl.on('close', () => {
  const sorted = m => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
  for (const k of ['byType', 'bytesByType', 'bytesByTopKey', 'toolCalls', 'toolInputBytes', 'toolResultBytes', 'toolUseResultBytes', 'imagesByTool']) s[k] = sorted(s[k]);
  s.repeats = Object.fromEntries(Object.entries(s.repeats).sort((a, b) => b[1].bytes - a[1].bytes));
  const text = JSON.stringify(s, null, 1);
  if (out) fs.writeFileSync(out, text); else console.log(text);
});
