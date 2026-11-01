// Wave 8 round 6: K6 addendum 05 mutations; the round-5 K6 list is kept as k6r5.
// Usage (repo root): node .local/w8-accept/add-r6-mutations.cjs [--write]
const fs = require('fs');
const path = require('path');
const ctl = 'F:/new/smaltalk/water';
const file = ctl + '/.local/w8-accept/mutations.json';
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
const prev = m.k6r5 ?? m.k6;
const keep = labels => prev.filter(e => labels.includes(e.label));

const k6 = [
  ...keep(['r3c1', 'r3c3', 'r3c5']),
  {label:'g1', mode:'browser', token:'UI_M3C_', file:'apps/water/ui/app.mjs',
   old:'filter(id => state.manualExclusions.has(id) || !data.items.some(',
   new:'filter(id => !data.items.some(',
   why:'a manual exclusion is pruned when the item is skipped again (addendum 05 item 1 reverted)'},
  {label:'g2', mode:'browser', token:'UI_M3C_', file:'apps/water/ui/app.mjs',
   old:'state.manualExclusions.add(itemId);',
   new:'state.manualExclusions.delete(itemId);',
   why:'drawer unticks are no longer recorded as manual exclusions'},
  {label:'g3', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:"      throw {...error, message_zh:state.skipFailure + (error?.code === 'stale' ? '结果已过期，请重新体检后再清理。' : '')};",
   new:'      throw error;',
   why:'an in-drawer skip failure shows the service text again'},
  {label:'g4', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/views/detail.mjs',
   old:"const target = note?.isConnected ? note : panel.querySelector('[data-key=\"detail-close\"]');",
   new:"const target = active.closest('.item')?.querySelector('button:not(:disabled)') ?? panel.querySelector('[data-key=\"detail-close\"]');",
   why:'focus lands on the skip button after an item is disabled again'},
  {label:'g5', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:'catch (error) { if (state.result && !state.stale) { state.stale = true; closeOverlay(true); } throw error; }',
   new:'catch (error) { throw error; }',
   why:'a failed settings call no longer marks the shown result stale'},
  {label:'g6', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:"    state.skipFailure = '';\n    render();\n    const {groupIds",
   new:'    const {groupIds',
   why:'starting a clean no longer clears the skip-failure notice (round-5 f7 again, now with its own assertion)'},
  {label:'g7', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:'state.error || skipFailure || state.info',
   new:'skipFailure || state.error || state.info',
   why:'the skip-failure notice hides later errors (round-5 f2 again, now with its own assertion)'},
  {label:'g8', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/views/detail.mjs',
   old:"{tabindex:'-1', role:'status'}",
   new:'{}',
   why:'probe: the selection note is neither focusable nor announced'},
  {label:'g9', mode:'browser', token:'UI_M3C_', file:'apps/water/ui/app.mjs',
   old:'      rememberDetail(refreshed, false);\n',
   new:'',
   why:'probe: a manual exclusion that became cleanable again is not re-read, so its metadata stays ineligible'},
  ...keep(['f1', 'f4', 'f5', 'e1', 'e2', 'e3', 'e10', 'r3a5']),
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
  fs.writeFileSync(file, JSON.stringify({...m, k6r5: prev, k6}, null, 2) + '\n');
  console.log('written', k6.length, 'k6 mutations');
}
