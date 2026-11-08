// Eleventh integration (wave 13): checks one common-locations recheck run against W13 section 1 and compares it with the
// tenth check's run. Read-only: it reads the two runs' scan records and asks Windows for the attributes of every
// junction that still references an item (Get-Item -Force, no follow, no write).
// Usage: node common-check.cjs <run folder> <tenth check's run folder> <output json>
// Output has no real paths: the user profile becomes %USERPROFILE%, other folders only appear as counts.
'use strict';
const fs = require('fs'), path = require('path'), {execFileSync} = require('child_process');
const [run, base, outFile] = process.argv.slice(2);
if (!run || !base || !outFile) throw Error('usage: common-check.cjs <run> <base run> <out>');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
const scanOf = dir => { const d = path.join(dir, 'data', 'scans'); return read(path.join(d, fs.readdirSync(d)[0])); };
const now = scanOf(run), then = scanOf(base);
const home = process.env.USERPROFILE ?? '';
const SEP = String.fromCharCode(92);
const redact = s => home && s.toLowerCase().startsWith(home.toLowerCase()) ? '%USERPROFILE%' + s.slice(home.length) : s.split(SEP).length <= 2 ? s : s.slice(0, 3) + '…' + s.slice(s.lastIndexOf(SEP));
const reasonKind = r => !r ? null : /引用/.test(r) ? (/Documents and Settings|Application Data|Local Settings|My Documents/i.test(r) ? 'referenced by a compatibility junction' : 'referenced by another junction') : r;
const hist = items => items.filter(i => !i.eligible).reduce((m, i) => { const k = reasonKind(i.ineligible_reason); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const sum = (items, f) => items.reduce((n, i) => n + Number(f(i) ?? 0), 0);
const totals = s => {
  const items = s.result.items, eligible = items.filter(i => i.eligible);
  return {status: s.result.status, duration_ms: s.duration_ms, visited_entries: s.result.visited_entries, groups: s.result.groups.length, items: items.length,
    eligible_items: eligible.length, eligible_bytes: sum(eligible, i => i.total_bytes), referenced_items: items.filter(i => i.referenced_count > 0).length,
    ineligible: hist(items), issues: s.result.issues.reduce((m, i) => (m[i.code] = (m[i.code] ?? 0) + i.count, m), {})};
};
// Every junction that still references an item: its own attributes, read without following it.
const refs = [...new Set(now.result.items.flatMap(i => i.referenced_by ?? []))];
let attrs = {};
if (refs.length) {
  const list = path.join(path.dirname(outFile), 'common-check-refs.tmp.json');
  fs.writeFileSync(list, JSON.stringify(refs));
  const ps = "$l = Get-Content -Raw -LiteralPath '" + list + "' | ConvertFrom-Json; $o = @{}; foreach ($p in $l) { try { $o[$p] = [int](Get-Item -Force -LiteralPath $p).Attributes } catch { $o[$p] = -1 } }; $o | ConvertTo-Json -Compress";
  attrs = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], {encoding: 'utf8'}) || '{}');
  fs.unlinkSync(list);
}
const HS = 0x2 | 0x4;
const hsRefs = refs.filter(p => attrs[p] >= 0 && (attrs[p] & HS) === HS);
const hsItems = now.result.items.filter(i => (i.referenced_by ?? []).some(p => hsRefs.includes(p)));
const byGroup = s => { const m = {}; for (const i of s.result.items) { const g = m[i.group_id] ??= {items: 0, bytes: 0, eligible_items: 0, eligible_bytes: 0, reasons: {}};
  g.items++; g.bytes += Number(i.total_bytes); if (i.eligible) { g.eligible_items++; g.eligible_bytes += Number(i.total_bytes); } else { const k = reasonKind(i.ineligible_reason); g.reasons[k] = (g.reasons[k] ?? 0) + 1; } } return m; };
const gNow = byGroup(now), gThen = byGroup(then);
const rules = [...new Set([...Object.keys(gNow), ...Object.keys(gThen)])].filter(id => !id.startsWith('leak:')).sort()
  .map(id => ({rule: id, before: gThen[id] ?? null, after: gNow[id] ?? null}))
  .filter(r => JSON.stringify(r.before && {e: r.before.eligible_items, b: r.before.eligible_bytes}) !== JSON.stringify(r.after && {e: r.after.eligible_items, b: r.after.eligible_bytes}) || /vrchat|wecom|npm-global-reify|wechat-xlog|crx-cache|onedrive-logs|copilot-sdk|claude-code-installer|gpu-shader/.test(r.rule));
const result = {
  run: path.basename(run), base: path.basename(base), scope: now.scope.map(s => s.label_zh),
  totals: {before: totals(then), after: totals(now)},
  junctions: {referencing_junctions: refs.length, unreadable: refs.filter(p => attrs[p] === -1).length,
    hidden_system_referencing: hsRefs.map(redact), items_referenced_by_hidden_system: hsItems.length,
    referencing_attributes: refs.map(p => ({path: redact(p), attributes: attrs[p]}))},
  rules,
};
fs.writeFileSync(outFile, JSON.stringify(result, null, 1) + '\n');
console.log(`items referenced by hidden+system junctions: ${hsItems.length}; referencing junctions ${refs.length}; eligible ${result.totals.before.eligible_items} -> ${result.totals.after.eligible_items} items, ${(result.totals.before.eligible_bytes / 2 ** 30).toFixed(2)} -> ${(result.totals.after.eligible_bytes / 2 ** 30).toFixed(2)} GiB`);
