// Wave 8 round 3 ledger update: K4 addendum 01 VERIFIED and merged, K4 addendum 02 and K6 addendum 03 READY.
// Usage (repo root): node docs/acceptance/wave8/controller/freeze-20261031/record-w8-round3.cjs <k4MergeCommit> <issuedAtISO>
const fs = require('fs');
const file = 'docs/dispatch/wave8/manifest.json';
const [merge, issuedAt] = process.argv.slice(2);
if (!/^[0-9a-f]{8,40}$/.test(merge ?? '') || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(issuedAt ?? '')) throw new Error('usage: <k4MergeCommit> <issuedAtISO>');
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
const k4 = m.tasks.find(t => t.id === 'WATER-W8-K4'), k6 = m.tasks.find(t => t.id === 'WATER-W8-K6');
const review = 'docs/acceptance/wave8/controller/WATER-W8-REVIEW-20261101.md';

Object.assign(k4.addenda[0], {
  status: 'VERIFIED',
  submittedHead: 'fc36140dc9abd8329c3c77a1625789b8dfccf68f',
  implementationCommit: '9f7b6efe07392fc36f0820dab431ed327bb61005',
  workerSelfReport: 'Codex GPT-6',
});
k4.addenda.push({
  id: 'WATER-W8-K4-ADDENDUM-02',
  ticket: 'docs/dispatch/tickets/WATER-W8-K4-ADDENDUM-02-20261101.md',
  status: 'READY',
  issuedAt,
  resumeFromCommit: 'fc36140dc9abd8329c3c77a1625789b8dfccf68f',
  change: 'follow-up after VERIFIED merge: every loaded record projection follows the current skip list (history bytes and older scan_result consistent before and after restart); clean_prepare exclusion lookup via the item index and a set (5,000 IDs on 10k items within 50 ms); plans marked stale right after the settings write; recommended_by_drive zero-row rule consistent between build and refresh; forecast never prints -0; SERVICE_M3C_DUE and SERVICE_SNAPSHOT_REMOVE_FAIL made load-independent without changing expectations; new tests: known-folder non-system drive root rejected, scan-time-ineligible item stays ineligible after skip/restore, case-different skip path; nc1-nc3 redone; no baseline rerun',
  dispatchedAt: null,
  submittedHead: null,
  implementationCommit: null,
  dispatchEvidence: null,
});
Object.assign(k4, {
  status: 'VERIFIED',
  mergeCommit: merge,
  controllerReview: {
    report: review,
    evidence: 'docs/acceptance/wave8/controller/accept-20261101/k4/',
    summary: 'addendum 01 round: audit 0 problems (38 receipts, three red/green pairs); fresh tree lock, check/real finals passed (real: 4 fixed drives, recognized 67.4 GB, recommended 13.4 GB; J3 10-28 62.1/11.7 GB); FFI only GetVolumeInformationW, DriveInfo unchanged, Platform methods defaulted, ADD-01 section 5 assertions only; controller mutations c1-c13 run alone (a first parallel attempt aborted on timing under load); independent review: no High, no path lets skipped/excluded/protected/non-NTFS-ReFS-root items into a plan; three Medium (older records do not follow skips until restart; known-folder drive root untested; clean_prepare exclusions scale with exclusions x items) -> addendum 02 in parallel with K6 addendum 03',
  },
  carryOverLater: [
    'a malformed skip entry resets the whole settings file to defaults; the next settings write makes the loss permanent (corrupted or hand-edited file only)',
    'skip_id reuses the lowest free number',
    'case-insensitive matching is ASCII-only',
    'an unavailable process snapshot shows as no orphans rather than unknown',
    'clean result estimate_bytes loops plan items x scan items (clean thread, not an IPC call)',
    'a group whose eligible items are all skipped is dropped silently from clean_prepare instead of invalid (never enters a plan)',
  ],
});

k6.addenda[0].status = 'SUBMITTED_CHANGES_REQUESTED';
Object.assign(k6.addenda[1], {
  status: 'SUBMITTED_CHANGES_REQUESTED',
  submittedHead: '1c2e91e60262103a24f228389447bf1549065af0',
  implementationCommit: '182dbf14db38567895213b8ff233e4293c765ef2',
  workerSelfReport: 'Codex GPT-6',
});
k6.addenda.push({
  id: 'WATER-W8-K6-ADDENDUM-03',
  ticket: 'docs/dispatch/tickets/WATER-W8-K6-ADDENDUM-03-20261101.md',
  status: 'READY',
  issuedAt,
  resumeFromCommit: '1c2e91e60262103a24f228389447bf1549065af0',
  change: 'after skip_add or skip_remove success on the same non-stale scan, re-read scan_result with the same scan_id, keep the selection, drop the detail cache, disable clean until the re-read lands, mark the result stale on failure; a restored item counts in its selected group and the dock (controller gap: K4 addendum 01 made skip_remove restore at once without updating the UI ticket); fake host switch modelling the new service, clean_prepare accepts and ignores user_skipped exclusions; lows: failed skip after leaving the page is reported, open drawer re-renders after item toggles, category selected caption follows the visible groups, no selected caption when nothing is selected, stale drawer hint, locations sentence period, marker-safe item-i-000201 assertion; nc1-nc3 redone; 26 screenshots; no baseline rerun',
  dispatchedAt: null,
  submittedHead: null,
  implementationCommit: null,
  dispatchEvidence: null,
});
k6.controllerReview = {
  ...k6.controllerReview,
  round3: 'addendum 02 (182dbf14): audit 0 problems; fresh tree check/browser finals passed; 26 screenshots reviewed (low: all-protected category shows selected <1 MB); controller mutations 21 (round-2 n6/n9 re-anchored, a1-a7 new) all caught, test --final passed; review confirmed every addendum 02 and 01 item; High: skip_remove now restores at once in the service (K4 addendum 01) but the UI does not re-read, so a restored item enters the plan without showing as selected -> addendum 03',
};
m.status = 'THIRD_ROUND_ADDENDA';
fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
console.log('K4', k4.status, k4.mergeCommit, k4.addenda.map(a => a.id + ':' + a.status).join(' '));
console.log('K6', k6.status, k6.addenda.map(a => a.id + ':' + a.status).join(' '));
