// Wave 8 round 3: add K4 (addendum 01) mutations, re-anchor K6 for addendum 02, check every anchor is unique.
// Usage (repo root): node .local/w8-accept/add-r3-mutations.cjs [--write]
const fs = require('fs');
const path = require('path');
const ctl = 'F:/new/smaltalk/water';
const file = ctl + '/.local/w8-accept/mutations.json';
const m = JSON.parse(fs.readFileSync(file, 'utf8'));

const k4 = [
  {label:'c1', mode:'red-nc1', token:'SERVICE_M3C_EXCLUDE', file:'packages/water-service/src/clean.rs',
   old:'            if excluded\n                .iter()\n                .any(|id| id.as_str() == Some(item.item_id.as_str()))\n                || s.settings',
   new:'            if s.settings',
   why:'clean_prepare no longer drops excluded items from the plan'},
  {label:'c2', mode:'red-nc2', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/views.rs',
   old:'                adjust_bytes(&mut self.view["totals"]["recommended_bytes"], bytes, after);\n',
   new:'',
   why:'skip_add/skip_remove leave the recommended total unchanged'},
  {label:'c3', mode:'red-nc3', token:'SERVICE_M3C_DRIVE_ROOT', file:'packages/water-service/src/service.rs',
   old:'        .is_some_and(|s| s.eq_ignore_ascii_case("NTFS") || s.eq_ignore_ascii_case("ReFS"))',
   new:'        .is_some_and(|s| !s.is_empty())',
   why:'exFAT/FAT32 drive roots are accepted as custom roots'},
  {label:'c4', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/views.rs',
   old:'                count + 1\n',
   new:'                count\n',
   why:'skip_remove does not restore the group eligible count'},
  {label:'c5', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/views.rs',
   old:'                displayed["eligible"] = json!(!after);',
   new:'                displayed["eligible"] = json!(true);',
   why:'the visible detail row stays cleanable after skip_add'},
  {label:'c6', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/views.rs',
   old:'            if skipped(item, settings) {\n                p.skipped.insert(index);\n            }\n',
   new:'',
   why:'a projection built at load forgets current skips, so skip_remove after a restart cannot restore'},
  {label:'c7', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/views.rs',
   old:'                    adjust_bytes(&mut row["bytes"], bytes, after);\n',
   new:'',
   why:'per-drive recommended bytes are not updated on skip'},
  {label:'c8', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/clean.rs',
   old:'            if projection.is_skipped(index) {\n                continue;\n            }\n            if excluded\n                .iter()\n                .any(|id| id.as_str() == Some(item.item_id.as_str()))\n                || s.settings\n                    .skipped\n                    .iter()\n                    .chain(&disk_skips)\n                    .any(|v| v.path.eq_ignore_ascii_case(&item.path))\n            {',
   new:'            if excluded\n                .iter()\n                .any(|id| id.as_str() == Some(item.item_id.as_str()))\n                || (disk_skips.is_empty() && false)\n            {',
   why:'clean_prepare no longer blocks currently skipped items'},
  {label:'c9', mode:'test', token:'SERVICE_M3C_', file:'packages/water-service/src/clean.rs',
   old:'            if projection.is_skipped(index) {\n                continue;\n            }\n',
   new:'',
   why:'probe: a currently skipped item is counted in excluded_count (the settings check still keeps it out)'},
  {label:'c10', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/service.rs',
   old:'            core.platform.as_ref(),\n        );\n        let stale: Vec<_> = s.plans.keys().cloned().collect();\n        s.stale_plans.extend(stale);',
   new:'            core.platform.as_ref(),\n        );',
   why:'skip_add leaves an existing clean plan valid'},
  {label:'c11', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/service.rs',
   old:'            );\n        }\n        let stale: Vec<_> = s.plans.keys().cloned().collect();\n        s.stale_plans.extend(stale);\n        Ok(locations(&s))',
   new:'            );\n        }\n        Ok(locations(&s))',
   why:'skip_remove leaves an existing clean plan valid'},
  {label:'c12', mode:'test', token:'SERVICE_M3C_DRIVE_ROOT', file:'packages/water-service/src/service.rs',
   old:'        .is_some_and(|s| s.eq_ignore_ascii_case("NTFS") || s.eq_ignore_ascii_case("ReFS"))',
   new:'        .is_none_or(|s| s.eq_ignore_ascii_case("NTFS") || s.eq_ignore_ascii_case("ReFS"))',
   why:'a drive root whose file system cannot be established is accepted'},
  {label:'c13', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/views.rs',
   old:'            .any(|v| v.path.eq_ignore_ascii_case(&item.path))\n}\n\nfn eligible',
   new:'            .any(|v| v.path == item.path)\n}\n\nfn eligible',
   why:'probe: the skip-list match becomes case-sensitive'},
];

const k6new = [
  {label:'a1', mode:'browser', token:'UI_READ_ORDER', file:'apps/water/ui/app.mjs',
   old:'state.result?.scan_id === scanId && state.stale === stale) { rememberDetail(value);',
   new:'state.result?.scan_id === scanId && !state.stale) { rememberDetail(value);',
   why:'details on already-stale results do not open (addendum 02 item 1 reverted)'},
  {label:'a2', mode:'browser', token:'UI_M3C_DRIVE', file:'apps/water/ui/model.mjs',
   old:"(filter === 'all' || g.level === filter) && ",
   new:'',
   why:'category select-all under a level filter selects hidden groups'},
  {label:'a3', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/views/detail.mjs',
   old:'const groupSelected = hasSelectedItems(g, state.selection, state.details);',
   new:'const groupSelected = state.selection.has(g.group_id);',
   why:'a fully excluded group is shown as selected in the drawer'},
  {label:'a4', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:'    if (sameScan()) state.selection = setItemSelected(state.result, state.selection, data, itemId, false);\n    if (!isCurrent()) return;',
   new:'    if (!isCurrent()) return;\n    if (sameScan()) state.selection = setItemSelected(state.result, state.selection, data, itemId, false);',
   why:'leaving the page before skip_add returns keeps the skipped item selected'},
  {label:'a5', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/app.mjs',
   old:'!data.items.some(item => item.item_id === id && item.eligible === false)',
   new:'data.items.some(item => item.item_id === id && item.eligible)',
   why:'an exclusion is dropped when the refreshed list no longer shows the item'},
  {label:'a6', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/app.mjs',
   old:'items:[...data.items, ...retained]',
   new:'items:[...data.items]',
   why:'an excluded item outside the refreshed list loses its metadata, so counts and bytes stop deducting it'},
  {label:'a7', mode:'browser', token:'UI_M3C_DRIVE', file:'apps/water/ui/views/results.mjs',
   old:'const selectable = rows.filter(canSelect)',
   new:'const selectable = category.groups.filter(canSelect)',
   why:'the category checkbox state counts groups hidden by the level filter'},
];

const reanchor = {
  n6:{old:'if (inScope() && state.result?.scan_id === scanId && state.stale === stale) { rememberDetail(value);'},
  n9:{old:"const total = ['advisory', 'protected'].includes(group.level) ? (group.by_drive?.length === 1 ? group.total_bytes : null) : part?.eligible_bytes;"},
};

const k6 = m.k6.map(e => reanchor[e.label] ? {...e, ...reanchor[e.label]} : e).concat(k6new.filter(n => !m.k6.some(e => e.label === n.label)));
let bad = 0;
for (const [slot, list] of [['k4', k4], ['k6', k6]]) {
  for (const e of list) {
    const src = fs.readFileSync(path.join(ctl, '.worktrees/accept-w8-' + slot, e.file), 'utf8');
    const n = src.split(e.old).length - 1;
    if (n !== 1) bad++;
    console.log(slot, e.label, e.mode, e.token, 'occurrences=' + n, src.includes('\r\n') ? 'CRLF' : 'LF');
  }
}
if (bad) { console.log('anchors not unique: ' + bad); process.exit(1); }
if (process.argv.includes('--write')) {
  fs.writeFileSync(file + '.r2.bak', JSON.stringify(m, null, 2) + '\n');
  fs.writeFileSync(file, JSON.stringify({...m, k4, k6}, null, 2) + '\n');
  console.log('written', k4.length, 'k4 and', k6.length, 'k6 mutations');
}
