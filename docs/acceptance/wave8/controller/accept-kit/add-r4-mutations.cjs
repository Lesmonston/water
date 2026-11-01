// Wave 8 round 4: K4 addendum 02 and K6 addendum 03 mutations; previous lists kept as k4r3/k6r3.
// Usage (repo root): node .local/w8-accept/add-r4-mutations.cjs [--write]
const fs = require('fs');
const path = require('path');
const ctl = 'F:/new/smaltalk/water';
const file = ctl + '/.local/w8-accept/mutations.json';
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
const prev = {k4: m.k4r3 ?? m.k4, k6: m.k6r3 ?? m.k6};
const keep = (slot, labels) => prev[slot].filter(e => labels.includes(e.label));

const k4 = [
  {label:'d1', mode:'red-nc1', token:'SERVICE_M3C_EXCLUDE', file:'packages/water-service/src/clean.rs',
   old:'            if excluded.contains(item.item_id.as_str())\n                || s.settings',
   new:'            if s.settings',
   why:'clean_prepare no longer drops excluded items from the plan (set lookup removed)'},
  {label:'d2', mode:'red-nc2', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/service.rs',
   old:'        for record in &s.records {\n            record.projection().refresh_path(\n                record,\n                &removed.path,',
   new:'        for record in s.records.iter().rev().take(1) {\n            record.projection().refresh_path(\n                record,\n                &removed.path,',
   why:'skip_remove refreshes only one record, older records stay skipped'},
  ...keep('k4', ['c3']).map(e => ({...e, label:'d3', why:e.why + ' (round 3 c3 on the new bytes)'})),
  {label:'d4', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/views.rs',
   old:'by_drive.into_iter().filter(|(_, n)| *n > 0).map(',
   new:'by_drive.into_iter().map(',
   why:'build keeps zero-byte recommended_by_drive rows again'},
  {label:'d5', mode:'test', token:'SERVICE_M3C_FORECAST', file:'packages/water-service/src/service.rs',
   old:'if rounded == 0.0 {"0".to_owned()} else {format!("{rounded:.0}")}',
   new:'format!("{rounded:.0}")',
   why:'forecast prints -0 again'},
  {label:'d6', mode:'test', token:'SERVICE_M3C_EXCLUDE', file:'packages/water-service/src/clean.rs',
   old:'            || (!item.eligible && item.ineligible_reason.as_deref() != Some("user_skipped"))',
   new:'            || false',
   why:'probe: an exclusion naming a scan-time ineligible item is accepted'},
  {label:'d7', mode:'test', token:'SERVICE_M3C_DRIVE_ROOT', file:'packages/water-service/src/service.rs',
   old:'                util::contains(path, p)\n                    || util::contains(path, &canonical(p).unwrap_or_else(|| p.to_owned()))\n            });\n    }',
   new:'                util::contains(path, &canonical(p).unwrap_or_else(|| p.to_owned()))\n            });\n    }',
   why:'probe: the text-form known-folder check for drive roots is dropped (canonical form kept)'},
  {label:'d8', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/service.rs',
   old:'            let stale: Vec<_> = s.plans.keys().cloned().collect();\n            s.stale_plans.extend(stale);\n            return Ok(locations(&s));',
   new:'            return Ok(locations(&s));',
   why:'probe: an idempotent skip_add of an already skipped path leaves old plans valid'},
  {label:'d9', mode:'test', token:'SERVICE_M3C_SKIP', file:'packages/water-service/src/service.rs',
   old:'        for record in &s.records {\n            record.projection().refresh_path(\n                record,\n                &item.path,',
   new:'        for record in s.records.iter().rev().take(1) {\n            record.projection().refresh_path(\n                record,\n                &item.path,',
   why:'skip_add refreshes only one record'},
  ...keep('k4', ['c6', 'c13']).map(e => ({...e, label:e.label.replace('c', 'r3c')})),
];

const k6 = [
  ...keep('k6', ['c1', 'c3', 'c5']).map(e => ({...e, label:'r3' + e.label})),
  {label:'e1', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:'    await refreshAfterSkip(scanId);\n    if (isCurrent()) { state.locations = value; if (scanId && !state.stale)',
   new:'    if (isCurrent()) { state.locations = value; if (scanId && !state.stale)',
   why:'restore no longer re-reads the result (the addendum 03 High reverted)'},
  {label:'e2', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:'    await refreshAfterSkip(scanId);\n    if (isCurrent()) state.locations = value;',
   new:'    if (isCurrent()) state.locations = value;',
   why:'skip_add no longer re-reads the result'},
  {label:'e3', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:"  } catch {\n    fault({code:'stale', message_zh:'结果已过期，请重新体检后再清理。'});\n  }\n}\nfunction rememberDetail",
   new:"  } catch {\n  }\n}\nfunction rememberDetail",
   why:'a failed re-read leaves the old numbers cleanable instead of stale'},
  {label:'e4', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:"|| state.stale || value.scan_id !== scanId) throw new Error('scan changed');",
   new:"|| state.stale) throw new Error('scan changed');",
   why:'a re-read reply for another scan is installed'},
  {label:'e5', mode:'test', token:'UI_M3C_', file:'apps/water/ui/model.mjs',
   old:'return {...state, result, details:new Map(), excludedDetails};',
   new:'return {...state, result, selection:resetSelection(result), details:new Map(), excludedDetails};',
   why:'the re-read resets the selection like a new scan'},
  {label:'e6', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/app.mjs',
   old:"    const panel = detail(data, closeOverlay, state, actions);\n    showOverlay(panel, 'detail-close', opener); panel.scrollTop = scroll;",
   new:"    const panel = document.createElement('div');",
   why:'the open drawer is not re-rendered after an item toggle'},
  {label:'e7', mode:'browser', token:'UI_M3C_DRIVE', file:'apps/water/ui/views/results.mjs',
   old:"selected.length ? el('span', 'cap', `已选 ${formatBytes(selectedTotal)}`) : null",
   new:"el('span', 'cap', `已选 ${formatBytes(selectedTotal)}`)",
   why:'categories with nothing selected show 已选 <1 MB again'},
  {label:'e8', mode:'browser', token:'UI_M3C_SKIP', file:'apps/water/ui/app.mjs',
   old:"catch (error) { state.skipFailure = '跳过没有成功，这一项保留原来的勾选状态。'; throw error; }",
   new:'catch (error) { throw error; }',
   why:'a skip that fails after leaving the page is not reported'},
  {label:'e9', mode:'browser', token:'UI_M3C_EXCLUDE', file:'apps/water/ui/views/detail.mjs',
   old:"  if (state.stale) add(panel, el('p', 'cap item-selection-note', '结果已过期，请重新体检后再清理。'));\n  else if",
   new:'  if',
   why:'a stale drawer asks for result-page reselection again'},
  {label:'e10', mode:'test', token:'UI_M3C_', file:'apps/water/ui/model.mjs',
   old:'!hasSelectedItems(group, selection, new Map([[group.group_id, data]]))',
   new:'!selection.has(group.group_id)',
   why:'an item toggle can re-include an emptied group'},
  {label:'e11', mode:'browser', token:'UI_M3C_DRIVE', file:'apps/water/ui/views/results.mjs',
   old:'categories:[{...category, groups:rows}]',
   new:'categories:state.result.categories.filter(c => c.category === category.category)',
   why:'the category 已选 caption counts groups hidden by the level filter'},
  ...keep('k6', ['n1', 'n4', 'a2', 'a5']).map(e => ({...e, label:'r3' + e.label})),
];

let bad = 0;
for (const [slot, list] of [['k4', k4], ['k6', k6]]) {
  for (const e of list) {
    const src = fs.readFileSync(path.join(ctl, '.worktrees/accept-w8-' + slot, e.file), 'utf8');
    const n = src.split(e.old).length - 1;
    if (n !== 1) bad++;
    console.log(slot, e.label, e.mode, e.token, 'occurrences=' + n);
  }
}
if (bad) { console.log('anchors not unique: ' + bad); process.exit(1); }
if (process.argv.includes('--write')) {
  fs.writeFileSync(file, JSON.stringify({...m, k4r3: prev.k4, k6r3: prev.k6, k4, k6}, null, 2) + '\n');
  console.log('written', k4.length, 'k4 and', k6.length, 'k6 mutations');
}
