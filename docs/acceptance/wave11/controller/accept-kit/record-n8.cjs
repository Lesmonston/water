// Record the WATER-W11-N8 acceptance and the N8 -> N2 -> N1 merges in docs/dispatch/wave11/manifest.json (run from the repo root).
const fs = require('fs');
const mPath = 'docs/dispatch/wave11/manifest.json';
const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
const merge = {n8: 'e4c88c2a0e6d94c0ebc20b455ab9aa1fcac8588e', n2: '6b4bea5113a667d503a76347885e5888e5fd1cc3', n1: '520d7a0920efdf9da2c0eec9b342aad4ea2841ad'};
for (const t of m.tasks) {
  const s = t.slot.slice(4);
  if (!merge[s]) continue;
  if (s === 'n8') {
    Object.assign(t, {
      status: 'VERIFIED', submittedHead: '1cd5b42152e4e06d98827afa892cf7b8503a445b', implementationCommit: 'f7cb9a965cc2cd189bcdc3fbb399640b64f3d1d3', workerSelfReport: 'Codex GPT-6', mergeCommit: merge[s],
      controllerReview: {report: 'docs/acceptance/wave11/controller/WATER-W11-REVIEW-20261107.md', evidence: 'docs/acceptance/wave11/controller/accept-20261107/n8/',
        summary: 'audit 0 problems; fresh tree lock, check, real and test finals; three ticket controls replayed and caught; six controller mutations all caught (c1 first written so it did not compile, rewritten and rerun); independent review found no high issue and one medium gap outside the ticket text: the conclusion page still sums nested selected items twice (carry-over)'},
      carryOverLater: [
        'conclusion page (conclusion.rs view: plan bytes, chosen bytes, item count, by drive) still sums nested selected items twice; the plan and the confirm dialog are right (ticket 1.8 named only the plan and the confirm dialog)',
        'equal paths in two groups keep the first in request order, so direct delete can win over quarantine (rare: the scan gives a directory one primary group)',
        'an inner delete item under an outer item whose drive has no quarantine is dropped without being counted in the not-cleaned note; if nothing else is selected the user gets invalid instead of the note',
        'quarantine refresh pushes a root to seen_roots before the plain_directory check, so a root that lists but then fails that check would lose its recovery records (list_quarantines already rejects such roots)',
        'records whose root the user deleted by hand are no longer cleaned up (the root is not listed any more)',
        'a settings.json write failure while revoking a shadowed consent marks the whole scan failed',
        'default quarantine availability only needs the drive to be listed; a file or junction named .flick-quarantine fails in the executor (same as the old name; ties to 1.9)',
        'the qroot-x-legacy id branch and the WindowsPlatform root filter are not covered by tests (fixture roots are never drive roots)',
        'out of scope: the trends page still marks never-compared clusters as stopped (same wording problem as 1.5); the 1.6 summary amount is the whole category while the brackets name selected groups only',
        'section 1.9 stays open: a quarantine error after a finished direct delete loses the clean record',
      ],
    });
    delete t.baselineStatusNote;
  } else {
    t.status = 'VERIFIED';
    t.mergeCommit = merge[s];
    delete t.mergeAfter;
  }
  console.log(t.id, t.status, t.mergeCommit.slice(0, 12));
}
fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n');
