// Wave 8 round 6 ledger update: K6 addendum 05 VERIFIED, K6 merged last; wave 8 complete.
// Usage (repo root): node docs/acceptance/wave8/controller/freeze-20261031/record-w8-round6.cjs <k6MergeCommit> <recordedAtISO>
const fs = require('fs');
const file = 'docs/dispatch/wave8/manifest.json';
const [merge, at] = process.argv.slice(2);
if (!/^[0-9a-f]{8,40}$/.test(merge ?? '') || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(at ?? '')) throw new Error('usage: <k6MergeCommit> <recordedAtISO>');
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
const k6 = m.tasks.find(t => t.id === 'WATER-W8-K6');
const a5 = k6.addenda.find(a => a.id === 'WATER-W8-K6-ADDENDUM-05');
if (a5.status !== 'READY') throw new Error('unexpected addendum 05 status ' + a5.status);
Object.assign(a5, {
  status: 'VERIFIED',
  submittedHead: '1da3e3d0beb51ee39bc499db457997035de91fd6',
  implementationCommit: '57fe374d30b96d8534a6bc29f093d479df30a868',
  workerSelfReport: 'Codex GPT-6',
  dispatchEvidence: 'not reported by the user before collection; the user said "收活" at ~20:43 JST 2026-11-01 and the worker tree held the delivered head; dispatch target to be confirmed',
  model: null,
  dispatchReportedAt: null,
});
Object.assign(k6, {
  status: 'VERIFIED',
  mergeCommit: merge,
  verifiedAt: at,
});
k6.controllerReview = {
  ...k6.controllerReview,
  evidence: 'docs/acceptance/wave8/controller/accept-20261101/k6/ (rounds 1-6, controller tree accept-w8-k6) and docs/acceptance/wave8/controller/accept-20261101/controller/',
  round6: 'addendum 05 (57fe374d): audit 0 problems; fresh tree check/browser finals passed; screenshots: only the 6 animated views changed by hash, the other 25 byte-identical to round 5; controller mutations 20: 17 marked kills plus g5 (caught at UI_M3C_SKIP through a settle assertion) and e3 (caught at UI_M3C_EXCLUDE); r3a5 is equivalent under the manual-exclusion rule; test --final passed; independent review: no High or Medium, manual and insurance exclusions handled on every path, WYSIWYG holds against the real service; VERIFIED and merged last',
};
k6.carryOverLater = [
  ...(k6.carryOverLater ?? []),
  'a group row can show mixed while every remaining cleanable item will be cleaned (a manual exclusion of a now-skipped item still sits in the set); display only',
  'when a settings write fails after the host applied it, the skip-failure text says it did not happen and the locations list is not re-read until the page is reopened; a full skip list (64) also marks the result stale without saying the list is full',
  'no assertion covers re-checking a group clearing the manual-exclusion source; the prepare-clears-notice branch is only reachable in the white-box test',
  'focus moving to the selection note can scroll a long drawer list to the note',
];
m.status = 'ALL_VERIFIED_MERGED';
m.completedAt = at;
fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
console.log(m.tasks.map(t => t.id.slice(-2) + ':' + t.status + ':' + (t.mergeCommit ?? '-')).join(' '), m.status);
