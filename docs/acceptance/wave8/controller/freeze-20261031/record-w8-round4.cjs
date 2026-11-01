// Wave 8 round 4 ledger update: K4 addendum 02 VERIFIED and merged again, K6 addendum 04 READY.
// Usage (repo root): node docs/acceptance/wave8/controller/freeze-20261031/record-w8-round4.cjs <k4MergeCommit> <issuedAtISO>
const fs = require('fs');
const file = 'docs/dispatch/wave8/manifest.json';
const [merge, issuedAt] = process.argv.slice(2);
if (!/^[0-9a-f]{8,40}$/.test(merge ?? '') || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(issuedAt ?? '')) throw new Error('usage: <k4MergeCommit> <issuedAtISO>');
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
const k4 = m.tasks.find(t => t.id === 'WATER-W8-K4'), k6 = m.tasks.find(t => t.id === 'WATER-W8-K6');
const a4 = k4.addenda.find(a => a.id === 'WATER-W8-K4-ADDENDUM-02');
const a6 = k6.addenda.find(a => a.id === 'WATER-W8-K6-ADDENDUM-03');
if (a4.status !== 'DISPATCHED' || a6.status !== 'DISPATCHED') throw new Error('unexpected addendum status');

Object.assign(a4, {
  status: 'VERIFIED',
  submittedHead: 'b9c34dde82a3ad6475544ef4fbac92177ceb82a4',
  implementationCommit: 'f55d969d0d73fdbffd2377418af2f155cbdd8f0a',
  workerSelfReport: 'Codex GPT-6',
  mergeCommit: merge,
});
k4.mergeCommits = [k4.mergeCommit, merge];
k4.mergeCommit = merge;
k4.controllerReview.round4 = 'addendum 02 (f55d969d): audit 0 problems; fresh tree lock, check/real finals passed (real: recognized 68.1 GB, recommended 17.0 GB after the controller builds); controller mutations d1-d9 plus round-3 c6/c13: 9 of 11 caught, probes d7 (drive-root text-form known-folder check, canonical form still guards) and d8 (idempotent skip_add stale marking untested) survived; c13 case-insensitive projection now caught; test --final passed; several restored green runs hit the 50 ms budget on settings-writing calls under machine load (one skip_add spike 215 ms), resumed; independent review: no High or Medium';
k4.carryOverLater = [
  ...k4.carryOverLater,
  'IPC calls that write settings or records with fsync (skip_add, skip_remove, scan_start, custom_root_add, clean_prepare) exceed the 50 ms budget under disk or CPU load on this machine; tests flake, real use may see slow returns',
  'm3c_drive_roots now assumes the checkout and fixtures are on F: (fake drive hard-coded F:\\)',
  'two service tests recompile the product sources into the test crate via #[path] (white-box harness with duplicated constants)',
  'idempotent skip_add of an already skipped path marks plans stale but no test covers it (controller d8 survived)',
  'clean_prepare second-insurance skip-list check and protected_paths remain linear in items x entries; not exercised at scale',
  'case difference between an older record path and the latest record path within one session is untested (code handles it)',
];

Object.assign(a6, {
  status: 'SUBMITTED_CHANGES_REQUESTED',
  submittedHead: '9722649a59ce7097f5014ea02bad3d384a7fae65',
  implementationCommit: '8a0ed61f783136a959f0495b666c625a925a55ae',
  workerSelfReport: 'Codex GPT-6',
});
k6.addenda.push({
  id: 'WATER-W8-K6-ADDENDUM-04',
  ticket: 'docs/dispatch/tickets/WATER-W8-K6-ADDENDUM-04-20261101.md',
  status: 'READY',
  issuedAt,
  resumeFromCommit: '9722649a59ce7097f5014ea02bad3d384a7fae65',
  change: 'a fully excluded group never returns to the clean range through a re-read (drop it from the selection or keep it unselected; re-include only from the results page); later errors win over the skip-failure notice and the stale explanation stays visible; the drawer updates in place on item toggles; neutral restore wording; fake host aligned with the real service (category total_bytes unchanged by skips - the controller addendum 03 wording was wrong; not_found and distinct skip IDs); setItemSelected uses retained exclusion metadata; category switch success re-reads scan_result like skips; stronger scroll and detail-cache assertions; nc1-nc3 redone; 26 screenshots; no baseline rerun',
  dispatchedAt: null,
  submittedHead: null,
  implementationCommit: null,
  dispatchEvidence: null,
});
k6.controllerReview.round4 = 'addendum 03 (8a0ed61f): audit 0 problems; fresh tree check/browser finals passed; 11 changed screenshots reviewed (no selected <1 MB, locations period); controller mutations 18 (round-3 reds c1/c3/c5 and n1/n4/a2/a5 as regression, e1-e11 for addendum 03) all caught, test --final passed; review: no High, WYSIWYG holds after skip and restore; Medium: a fully excluded group silently returns to the clean range when a restore raises its eligible count (contradicts addendum 02 3.1) -> addendum 04 with lows; controller addendum 03 wrongly asked for category totals to drop on skip';
k6.carryOverLater = [
  ...(k6.carryOverLater ?? []),
  'a cancelled scan result is loaded without being marked stale while skips, details and clean act on the previous completed scan (clean fails safe because the new scan consumed its authority); check at integration',
];
m.status = 'FOURTH_ROUND_K6_ADDENDUM';
fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
console.log('K4', k4.status, k4.mergeCommits.join(','), k4.addenda.map(a => a.id.slice(-11) + ':' + a.status).join(' '));
console.log('K6', k6.status, k6.addenda.map(a => a.id.slice(-11) + ':' + a.status).join(' '));
