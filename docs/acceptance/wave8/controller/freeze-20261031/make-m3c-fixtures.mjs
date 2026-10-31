// Derive contracts/m3c-v1/ui-fixtures-m3c.json from contracts/checkup-v1/ui-fixtures.json (IPC-M3C shapes).
import fs from 'node:fs';
const repo = 'F:/new/smaltalk/water';
const base = JSON.parse(fs.readFileSync(repo + '/contracts/checkup-v1/ui-fixtures.json', 'utf8'));
const clone = v => JSON.parse(JSON.stringify(v));
const big = s => BigInt(s);
const str = n => n.toString();

// Scan result: every GroupView gains logical_bytes and by_drive; byte fields are the de-duplicated values.
const scan = clone(base.scan_result);
const DEDUP = { 'custom:water:cachedir-tagged': 0.9 }; // hard links inside Cargo target dirs (10-29 measurement ~ -15%)
for (const cat of scan.categories) for (const g of cat.groups) {
  const logical = big(g.total_bytes);
  const f = DEDUP[g.group_id];
  if (f) {
    g.total_bytes = str((logical * BigInt(Math.round(f * 1000))) / 1000n);
    g.eligible_bytes = str((big(g.eligible_bytes) * BigInt(Math.round(f * 1000))) / 1000n);
  }
  g.logical_bytes = str(logical);
  g.by_drive = [{ root: g.drive_root, item_count: g.item_count, eligible_bytes: g.eligible_bytes }];
  if (g.in_use) g.in_use = { process_label_zh: 'Chrome 正在运行，将跳过 2 个占用的项', item_count: 2 };
}
// A whole-drive location on F: adds two custom groups: node_modules (one item in use) and git worktrees (advisory).
const custom = scan.categories.find(c => c.category === 'custom');
const nodeGroup = {
  group_id: 'custom:drive-f:node-modules', title_zh: 'Node 依赖目录', owner_zh: 'F:\\', level: 'confirm', category: 'custom',
  drive_root: 'F:\\', item_count: 4, eligible_count: 3, file_count: 41200, total_bytes: '2457862144', eligible_bytes: '2147483648',
  logical_bytes: '2457862144', newest_activity: '2026-10-03T13:40:00Z', summary_zh: '4 个依赖目录 · 最近 10 月 3 日', growth: null,
  in_use: { process_label_zh: 'Codex 正在运行，将跳过 1 个占用的项', item_count: 1 }, selectable: true, default_selected: false,
  by_drive: [{ root: 'F:\\', item_count: 4, eligible_bytes: '2147483648' }]
};
const wtGroup = {
  group_id: 'custom:drive-f:git-worktrees', title_zh: 'Git 工作树或子模块', owner_zh: 'F:\\', level: 'advisory', category: 'custom',
  drive_root: 'F:\\', item_count: 130, eligible_count: 0, file_count: 2210000, total_bytes: '60129542144', eligible_bytes: '0',
  logical_bytes: '60129542144', newest_activity: '2026-10-28T14:20:00Z', summary_zh: '130 个工作树 · 最近 10 月 28 日', growth: null,
  in_use: null, selectable: false, default_selected: false,
  by_drive: [{ root: 'F:\\', item_count: 130, eligible_bytes: '0' }]
};
if (custom) { custom.groups.push(nodeGroup, wtGroup); }

// Group details: item_id on every item, one item in use, one user-skipped item.
const details = {};
for (const [id, d0] of Object.entries(base.group_details)) {
  const d = clone(d0);
  const g = scan.categories.flatMap(c => c.groups).find(x => x.group_id === id);
  if (g) d.group = clone(g);
  const f = DEDUP[id];
  d.items = d.items.map((it, i) => ({ item_id: 'i-' + String(100 + i).padStart(6, '0'), ...it,
    total_bytes: f ? str((big(it.total_bytes) * BigInt(Math.round(f * 1000))) / 1000n) : it.total_bytes, in_use: null }));
  details[id] = d;
}
details['custom:drive-f:node-modules'] = {
  group: clone(nodeGroup),
  what_zh: '在你添加的位置里，名为 node_modules 的依赖目录。', why_zh: '依赖可以按项目的锁文件重新安装；正在运行的程序所在的目录会被跳过。',
  after_zh: '下次运行项目前需要重新安装依赖。', fix_hint_zh: null,
  items: [
    { item_id: 'i-000201', display_path: 'F:\\Mirasim-C\\isolated-cli\\pkg\\codex\\node_modules', total_bytes: '450635299', newest_activity: '2026-10-03T13:40:00Z', eligible: true, reason_zh: null, in_use: { process_label_zh: 'Codex 正在使用' } },
    { item_id: 'i-000202', display_path: 'F:\\tmp\\demo-app\\node_modules', total_bytes: '996147200', newest_activity: '2026-09-20T02:00:00Z', eligible: true, reason_zh: null, in_use: null },
    { item_id: 'i-000203', display_path: 'F:\\new\\smaltalk\\water\\.offline-cache\\ui\\node_modules', total_bytes: '700701149', newest_activity: '2026-10-01T08:00:00Z', eligible: true, reason_zh: null, in_use: null },
    { item_id: 'i-000204', display_path: 'F:\\new\\zbbody\\node_modules', total_bytes: '310378496', newest_activity: '2026-09-28T08:00:00Z', eligible: false, reason_zh: '已设为以后都跳过', in_use: null }
  ],
  items_total: 4, top_keys: []
};
details['custom:drive-f:git-worktrees'] = {
  group: clone(wtGroup),
  what_zh: '目录里的 .git 是一个小文件而不是文件夹，通常是 git worktree 建出的工作树，也可能是子模块。',
  why_zh: '里面可能有还没提交的改动，Water 不读文件内容，无法确认，所以只列出、不提供清理。',
  after_zh: '确认不再需要后，在主仓库里用 git worktree remove 删除，主仓库的登记会一并清掉。', fix_hint_zh: null,
  items: [
    { item_id: 'i-000301', display_path: 'F:\\new\\smaltalk\\water\\.worktrees\\w5-h4', total_bytes: '1610612736', newest_activity: '2026-10-27T10:00:00Z', eligible: false, reason_zh: '仅供参考', in_use: null },
    { item_id: 'i-000302', display_path: 'F:\\new\\smaltalk\\water\\.worktrees\\w6-i2', total_bytes: '1288490188', newest_activity: '2026-10-28T14:20:00Z', eligible: false, reason_zh: '仅供参考', in_use: null }
  ],
  items_total: 130, top_keys: []
};

// Totals and per-drive figures recomputed from the GroupViews (de-duplicated).
const groups = scan.categories.flatMap(c => c.groups);
const sum = (f, xs) => xs.reduce((t, g) => t + big(f(g)), 0n);
const dedupCut = Object.keys(DEDUP).reduce((t, id) => { const g = groups.find(x => x.group_id === id); return t + big(g.logical_bytes) - big(g.total_bytes); }, 0n);
scan.totals.recognized_bytes = str(big(scan.totals.recognized_bytes) - dedupCut + big(nodeGroup.total_bytes) + big(wtGroup.total_bytes));
scan.totals.recommended_bytes = str(sum(g => g.eligible_bytes, groups.filter(g => g.level === 'recommended')));
scan.totals.confirm_bytes = str(sum(g => g.eligible_bytes, groups.filter(g => g.level === 'confirm')));
scan.totals.advisory_bytes = str(sum(g => g.total_bytes, groups.filter(g => g.level === 'advisory')));
const byDrive = {};
for (const g of groups.filter(g => g.level === 'recommended')) for (const d of g.by_drive) byDrive[d.root] = (byDrive[d.root] ?? 0n) + big(d.eligible_bytes);
scan.recommended_by_drive = Object.keys(byDrive).sort().map(root => ({ root, bytes: str(byDrive[root]) }));
custom.total_bytes = str(sum(g => g.total_bytes, custom.groups));

const appAfter = clone(base.app_state_after_scan);
appAfter.last_scan.recommended_bytes = scan.totals.recommended_bytes;
appAfter.last_scan.recommended_by_drive = scan.recommended_by_drive;
appAfter.checkup_due = null;
const appDue = clone(appAfter); appDue.checkup_due = { days_since_last: 9 };
const appFresh = clone(base.app_state_fresh); appFresh.checkup_due = { days_since_last: null };

const prep = clone(base.clean_prepare_default);
prep.excluded_count = 0;
const prepEx = clone(prep);
const cg = prepEx.groups.find(g => g.group_id === 'custom:water:cachedir-tagged');
const ded = scan.categories.flatMap(c => c.groups).find(g => g.group_id === 'custom:water:cachedir-tagged');
const exBytes = big(details['custom:water:cachedir-tagged'].items[1].total_bytes);
cg.item_count -= 1; cg.total_bytes = str(big(ded.eligible_bytes) - exBytes);
prepEx.item_count -= 1; prepEx.excluded_count = 1;
prepEx.by_drive = prepEx.by_drive.map(d => d.root === 'F:\\' ? { root: d.root, bytes: cg.total_bytes } : d);
prepEx.total_bytes = str(prepEx.by_drive.reduce((t, d) => t + big(d.bytes), 0n));
prep.groups.find(g => g.group_id === 'custom:water:cachedir-tagged').total_bytes = ded.eligible_bytes;
prep.by_drive = prep.by_drive.map(d => d.root === 'F:\\' ? { root: d.root, bytes: ded.eligible_bytes } : d);
prep.total_bytes = str(prep.by_drive.reduce((t, d) => t + big(d.bytes), 0n));

const locations = clone(base.locations);
locations.custom_roots = locations.custom_roots.map(r => ({ ...r, is_drive_root: false }));
locations.custom_roots.push({ root_id: 'drive-f', display_path: 'F:\\', last_scanned_at: '2026-10-31T02:10:00Z', found_bytes: '62277025792', is_drive_root: true });
locations.skipped = [
  { skip_id: 's-000001', display_path: 'F:\\new\\zbbody\\node_modules', added_at: '2026-10-31T02:12:00Z' },
  { skip_id: 's-000002', display_path: 'F:\\new\\smaltalk\\water\\.offline-cache\\ui\\node_modules', added_at: '2026-10-31T02:13:00Z' }
];
const locationsAfterRemove = clone(locations); locationsAfterRemove.skipped = locationsAfterRemove.skipped.slice(1);
const addDrive = { added: { root_id: 'drive-f', display_path: 'F:\\', last_scanned_at: null, found_bytes: null, is_drive_root: true } };

const trends = clone(base.trends);
trends.forecast = [
  { root: 'C:\\', days_to_full: 23, bytes_per_day: '2791728742', basis_days: 30.0, note_zh: null },
  { root: 'D:\\', days_to_full: null, bytes_per_day: '-104857600', basis_days: 12.5, note_zh: '最近 30 天可用空间没有减少' },
  { root: 'E:\\', days_to_full: null, bytes_per_day: '0', basis_days: 1.2, note_zh: '至少需要 3 天内 3 次体检才能估算' },
  { root: 'F:\\', days_to_full: null, bytes_per_day: '52428800', basis_days: 9.0, note_zh: '按现在的速度，十年内不会满' }
];
trends.orphans = {
  scan_id: scan.scan_id, at: scan.finished_at, total_memory_bytes: '1342177280',
  chains: [
    { name: 'node.exe', matched_pattern: 'jest-worker', process_count: 9, memory_bytes: '943718400', started_at: '2026-10-30T22:41:00Z' },
    { name: 'chrome.exe', matched_pattern: '--headless', process_count: 6, memory_bytes: '398458880', started_at: '2026-10-30T21:05:00Z' },
    { name: 'cmd.exe', matched_pattern: 'codex', process_count: 1, memory_bytes: null, started_at: '2026-10-29T03:00:00Z' }
  ]
};
const trendsEmpty = clone(base.trends); trendsEmpty.forecast = []; trendsEmpty.orphans = null;

const out = {
  fixtures_version: 'water.ui-fixtures-m3c.v1',
  note: 'Increment to checkup-v1/ui-fixtures.json for IPC-M3C (wave 8). Same-named shapes here win; byte fields are de-duplicated. Paths are illustrative. Test-only; never shipped.',
  app_state_fresh: appFresh, app_state_after_scan: appAfter, app_state_due: appDue,
  scan_result: scan, group_details: details,
  clean_prepare_default: prep, clean_prepare_excluded: prepEx,
  locations, locations_after_skip_remove: locationsAfterRemove, custom_root_add_drive: addDrive,
  trends, trends_empty: trendsEmpty
};
fs.writeFileSync(repo + '/contracts/m3c-v1/ui-fixtures-m3c.json', JSON.stringify(out, null, 2) + '\n');
console.log('groups', groups.length, 'recommended', scan.totals.recommended_bytes, 'by_drive', JSON.stringify(scan.recommended_by_drive), 'prep', prep.total_bytes, 'prepEx', prepEx.total_bytes, prepEx.item_count, prepEx.excluded_count);
