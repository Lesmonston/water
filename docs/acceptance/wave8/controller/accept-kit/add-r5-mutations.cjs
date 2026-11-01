// Wave 8 round 5: K6 addendum 04 mutations; the round-4 K6 list is kept as k6r4.
// Usage (repo root): node .local/w8-accept/add-r5-mutations.cjs [--write]
const fs = require('fs');
const path = require('path');
const ctl = 'F:/new/smaltalk/water';
const file = ctl + '/.local/w8-accept/mutations.json';
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
const prev = m.k6r4 ?? m.k6;
const keep = labels => prev.filter(e => labels.includes(e.label));
const reanchor = {
  e1: {old:'    await refreshAfterSettings(scanId);\n    if (isCurrent()) { state.locations = value; if (scanId && !state.stale)',
       new:'    if (isCurrent()) { state.locations = value; if (scanId && !state.stale)'},
  e2: {old:'    await refreshAfterSettings(scanId);\n    if (isCurrent()) state.locations = value;\n    if (!sameScan() || state.stale) return;',
       new:'    if (isCurrent()) state.locations = value;\n    if (!sameScan() || state.stale) return;'},
  e10: {old:'if (!canSelect(group) || !hasSelectedItems(group, selection, details) ||',
        new:'if (!canSelect(group) || !selection.has(group.group_id) ||'},
};

const k6 = [
  ...keep(['r3c1', 'r3c3', 'r3c5']),
  {label:'f1', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/model.mjs',
   old:'  if (!hasSelectedItems(group, next, details)) next.delete(group.group_id);\n',
   new:'',
   why:'an emptied group stays in the selection, so a restore re-includes it (addendum 04 item 1 reverted)'},
  {label:'f2', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:'state.error || skipFailure || state.info',
   new:'skipFailure || state.error || state.info',
   why:'the skip-failure notice hides later errors again'},
  {label:'f3', mode:'browser', token:'UI_M3C_', file:'apps/water/ui/app.mjs',
   old:'    await refreshAfterSettings(scanId);\n    if (isCurrent()) state.locations = value;\n  }),\n  addRoot',
   new:'    if (isCurrent()) state.locations = value;\n  }),\n  addRoot',
   why:'a category switch no longer re-reads the result'},
  {label:'f4', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/app.mjs',
   old:'    if (overlay) updateDetailSelection(overlay, data, state);\n',
   new:'',
   why:'the open drawer is not updated after an item toggle'},
  {label:'f5', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/views/detail.mjs',
   old:"    checkbox.disabled = !groupSelected || state.stale || state.busy !== 'idle';",
   new:"    checkbox.disabled = state.stale || state.busy !== 'idle';",
   why:'items of an unselected or emptied group are enabled in the drawer'},
  {label:'f6', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/views/detail.mjs',
   old:"state.stale ? '结果已过期，请重新体检后再清理。' : ",
   new:'',
   why:'a stale drawer asks for result-page reselection again'},
  {label:'f7', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:"    state.skipFailure = '';\n    const {groupIds, excludeItemIds}",
   new:'    const {groupIds, excludeItemIds}',
   why:'probe: starting a clean no longer clears the skip-failure notice'},
  ...keep(['e1', 'e2', 'e3', 'e4', 'e5', 'e7', 'e8', 'e10', 'e11', 'r3a2', 'r3a5']).map(e => reanchor[e.label] ? {...e, ...reanchor[e.label]} : e),
];

let bad = 0;
for (const e of k6) {
  const src = fs.readFileSync(path.join(ctl, '.worktrees/accept-w8-k6', e.file), 'utf8');
  const n = src.split(e.old).length - 1;
  if (n !== 1) bad++;
  console.log('k6', e.label, e.mode, e.token, 'occurrences=' + n);
}
if (bad) { console.log('anchors not unique: ' + bad); process.exit(1); }
if (process.argv.includes('--write')) {
  fs.writeFileSync(file, JSON.stringify({...m, k6r4: prev, k6}, null, 2) + '\n');
  console.log('written', k6.length, 'k6 mutations');
}
