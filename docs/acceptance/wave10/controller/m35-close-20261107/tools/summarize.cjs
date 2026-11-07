// Controller tool for the M3.5 close (2026-11-07): turns one local run of m35-close-observe.ps1 into a
// redacted summary that can be committed. Real paths become "<路径>"; installer items keep only their file
// name; folder names in the space overview are replaced by their tag. The raw dumps, screenshots and the
// data folder stay under .local.
// Usage: node summarize.cjs <run folder under .local/m35-close> <output json>
'use strict';
const fs = require('fs'), path = require('path');
const [run, outFile] = process.argv.slice(2);
if (!run || !outFile) throw Error('usage: summarize.cjs <run> <out>');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
const redact = s => s.replace(/[A-Za-z]:\\[^·；，]*?(?=( · |；|，|$| 里有| 引用了))/g, '<路径>').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>');
const observe = read(path.join(run, 'out', 'observe.json'));
const dump = n => read(path.join(run, 'out', 'dump-' + n + '.json')).map(r => r.name);
const scans = path.join(run, 'data', 'scans'), scanFile = fs.readdirSync(scans)[0], scan = read(path.join(scans, scanFile)), r = scan.result;
const byGroup = {}; for (const it of r.items) (byGroup[it.group_id] = byGroup[it.group_id] || []).push(it);
const levels = {}; for (const g of r.groups) levels[g.level] = (levels[g.level] || 0) + 1;
const issues = {}; for (const i of r.issues) issues[i.code] = (issues[i.code] || 0) + i.count;
// Leak clusters by where they sit; the classes are the controller's reading of the parent paths.
const leakClass = p => /\\(codex|\.codex)\\sessions\\|\\subagents(\\|$)|\\projects\\[^\\]+\\[0-9a-f-]{36}\\|\\turns(\\|$)/i.test(p) ? 'agent sessions'
  : /\\backups?\\|backup/i.test(p) ? 'backups' : /\\res\\|\\HTML Help\\|\\CEP\\extensions\\|\\appcache\\/i.test(p) ? 'program resources' : 'other';
const leaks = r.groups.filter(g => g.group_id.startsWith('leak:')).map(g => { const its = byGroup[g.group_id] || []; return {level: g.level, members: its.length, eligible: its.filter(i => i.eligible).length, linked: its.filter(i => /引用/.test(i.ineligible_reason || '')).length, bytes: Number(g.total_bytes), kind: leakClass((its[0] || {}).path || '')}; });
const leakKinds = {}; for (const l of leaks) { const k = leakKinds[l.kind] || (leakKinds[l.kind] = {groups: 0, members: 0, eligible: 0, linked: 0, bytes: 0}); k.groups++; k.members += l.members; k.eligible += l.eligible; k.linked += l.linked; k.bytes += l.bytes; }
const installerClass = n => /^unins\d*\.exe$|^uninstall/i.test(n) ? 'uninstaller of an installed program' : /setup|installer/i.test(n) && !/[\\/]/.test(n) && /\.exe$/i.test(n) && !/service/i.test(n) ? 'installer' : /\.appx$/i.test(n) ? 'app package inside a program folder' : 'program or tool executable';
// File names stay only for the misread program files (generic names); real installers and the items that
// were not clean-able are the user's own downloads, so only their extension is kept.
const installers = ['custom:drive-d:installer-files', 'custom:mirasim-a:installer-files'].flatMap(id => (byGroup[id] || []).map(it => { const base = path.win32.basename(it.path), kind = installerClass(base), show = it.eligible && kind !== 'installer';
  return {name: show ? base : '<文件名>' + path.win32.extname(base), bytes: Number(it.total_bytes), eligible: it.eligible, reason: it.ineligible_reason || null, note: (scan.item_notes[it.item_id] || []).map(redact), kind}; }));
const conclusion = dump('conclusion');
const pick = (from, re) => from.filter(t => re.test(t));
const groups = r.groups.filter(g => !g.group_id.startsWith('leak:') && g.item_count > 0).map(g => ({group_id: g.group_id, level: g.level, items: g.item_count, bytes: Number(g.total_bytes), eligible_items: g.eligible_count, eligible_bytes: Number(g.eligible_bytes || 0)}));
const summary = {
  tool: 'docs/acceptance/wave10/controller/m35-close-20261107/tools', run: path.basename(run), exe: path.basename(path.dirname(observe.exe)),
  window: {steps: observe.steps.map(s => ({index: s.index, kind: s.kind, passed: s.passed, ms: s.ms})), screenshots: observe.screenshots, exitCode: observe.exitCode, webviewLeft: observe.webviewLeft, error: observe.error},
  scan: {scope: scan.scope.map(s => s.label_zh), status: r.status, duration_ms: scan.duration_ms, visited_entries: r.visited_entries, groups: r.groups.length, items: r.items.length, levels, issues},
  store: Object.fromEntries(fs.readdirSync(path.join(run, 'data')).map(n => { const p = path.join(run, 'data', n); return [n, fs.statSync(p).isDirectory() ? fs.readdirSync(p).length : 'file']; })),
  conclusion: {
    heading: pick(conclusion, /放心清理/), scope_line: redact(conclusion.find(t => / · /.test(t) && /刚刚|分钟/.test(t)) || ''),
    cards: pick(conclusion, /^.+ · [\d.]+ [KMG]B$|同模板目录，已经|同模板目录，每天/).filter(t => !/菜单$/.test(t) && !/^\d+\. /.test(t)).map(redact),
    evidence: pick(conclusion, /^\d+ 项 · /).map(redact), more_cards: pick(conclusion, /^还有 \d+ 项需要判断/), clues_more: pick(conclusion, /^还有 \d+ 条/),
    clues_shown: pick(conclusion, /里有 \d+ 个 .*(每天新增|最近 14 天)|引用了 \d+ 项/).map(redact), folds: pick(conclusion, /只统计、不清理|^空间分布：|条系统建议/).filter((t, i, a) => a.indexOf(t) === i).map(t => /^空间分布：/.test(t) ? '空间分布：<前三个文件夹>' : t)
  },
  groups, leak_groups: leaks.length, leak_kinds: leakKinds, installers,
  detail: pick(dump('detail'), / · \d+ 组 · /), quarantine: pick(dump('quarantine'), /隔离区/)
};
fs.writeFileSync(outFile, JSON.stringify(summary, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({leak_kinds: leakKinds, installers: installers.length, cards: summary.conclusion.cards}, null, 1));
