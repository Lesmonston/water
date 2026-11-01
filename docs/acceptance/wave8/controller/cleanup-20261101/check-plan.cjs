// Check the newest Water clean plan against the groups the user chose for drive C on 11-01 (items 1, 2, 4,
// 5, 6, 9, 10, 11, 12, 19). Read-only. usage: node check-plan.cjs <Water data dir>
const fs = require('fs');
const path = require('path');
const dir = path.join(process.argv[2], 'plans');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
if (!files.length) { console.log('NO PLAN YET'); process.exit(1); }
const stored = JSON.parse(fs.readFileSync(path.join(dir, files[0].f), 'utf8'));
const expected = {
  'installer-unpack-temp': 1, 'desktop-updater-residue': 2,
  'claude-desktop-old-versions': 4, 'claude-code-old-versions': 4, 'grok-downloads': 4, 'agent-cli-old-binaries': 4, 'claude-desktop-packages': 4,
  'crash-dumps': 5, 'gpu-shader-cache': 5, 'cursor-compile-cache': 5, 'electron-gpu-caches': 5, 'edge-crash-reports': 5, 'chrome-crash-reports': 5, 'agent-tool-logs': 5,
  'electron-app-cache': 6, 'cargo-registry-cache': 9, 'app-logs': 10, 'playwright-browsers': 11, 'downloads-installers': 12,
  'chrome-cache': 19, 'chrome-code-gpu-cache': 19, 'chrome-service-worker-cache': 19, 'edge-cache': 19, 'edge-code-gpu-cache': 19, 'edge-service-worker-cache': 19,
};
const groups = {};
for (const i of stored.plan.items) { const g = (groups[i.group_id] ||= { n: 0, bytes: 0 }); g.n++; g.bytes += Number(i.total_bytes); }
console.log('plan', stored.plan.plan_id, 'created', stored.plan.created_at, 'used', stored.used, 'items', stored.plan.items.length);
for (const [id, g] of Object.entries(groups).sort()) console.log(expected[id] ? 'OK   ' : 'EXTRA', String(expected[id] ?? '-').padStart(2), id, g.n, 'items', (g.bytes / 1e9).toFixed(2), 'GB');
const missing = Object.keys(expected).filter(id => !groups[id]);
console.log(missing.length ? 'MISSING ' + missing.join(', ') : 'nothing missing');
const forbidden = ['codex-runtimes', 'claude-code-scratchpad', 'squirrel-packages', 'qoder-workspace-temp', 'system-temp-old', 'user-temp-old'];
const bad = forbidden.filter(id => groups[id]);
console.log(bad.length ? 'MUST UNTICK ' + bad.join(', ') : 'no unwanted group');
