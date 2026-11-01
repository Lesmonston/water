// Item 26 a1 (user 11-02: "a1 不要 Expo 插件"): drop the claude-plugins-official marketplace, the Expo plugin
// from it and that plugin's hook trust entry from .codex2\config.toml. Backs up first; every other line,
// including the line endings, stays byte for byte.
const fs = require('fs');
const file = 'C:\\Users\\37310\\.codex2\\config.toml';
const backup = file + '.bak-20261102';
const text = fs.readFileSync(file, 'utf8');
fs.writeFileSync(backup, text, { flag: 'wx' });
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(eol);
const drop = new Set([
  '[marketplaces.claude-plugins-official]',
  '[plugins."expo@claude-plugins-official"]',
  '[hooks.state."expo@claude-plugins-official:hooks/hooks.json:post_tool_use:0:0"]',
]);
const out = []; let skipping = false; const removed = [];
for (const line of lines) {
  const header = /^\s*\[/.test(line);
  if (header) skipping = drop.has(line.trim());
  if (skipping) { removed.push(line); continue; }
  out.push(line);
}
fs.writeFileSync(file, out.join(eol));
console.log('removed', removed.length, 'lines:'); for (const l of removed) console.log('  -', l.startsWith('trusted_hash') ? 'trusted_hash = <hash>' : l);
console.log('left references:', out.filter(l => l.includes('claude-plugins-official')).length, 'lines', lines.length, '->', out.length);
