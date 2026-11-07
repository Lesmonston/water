// Record wave 12 acceptances and merges in docs/dispatch/wave12/manifest.json (run from the repo root).
// Usage: node .local/w12-accept/record.cjs p3 p4 p5   (only the slots given are updated)
const fs = require('fs');
const mPath = 'docs/dispatch/wave12/manifest.json';
const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
const REVIEW = 'docs/acceptance/wave12/controller/WATER-W12-REVIEW-20261107.md';
const data = {
  p1: {head: '606d5c5ebffff132a153cf451d46bb82e0da5207', impl: '149602577d489fe59f3aebcc0c1aa063e186ac76', merge: '292dcbed8e125ed5a7f48bb0973982237551aebb', self: 'Codex GPT-6',
    summary: 'heavy gate: audit 0 problems; fresh tree lock, check, real and test finals; three ticket controls replayed and caught; controller mutations c2 and c3 caught, c1 (keep every planned volume after a journal failure) survived as an equivalent mutant on single-volume fixtures; independent review found no high or medium issue in the executor and a wave-level service gap sent to P2 as addendum 01',
    later: ['volume retention after a journal failure is untested across two volumes (controller mutation c1 survived; every fixture is on one volume)',
      'execute maps any intent error after an action to JournalFailed, not only CleanError::Journal (a time-format error would read as a journal failure; quarantine matches Journal only)',
      'a result-line failure for an item that was not acted on keeps its real reason instead of JournalFailed; reasonable, untested',
      'quarantine: the current JournalFailed item keeps bytes = before.bytes while later ones show 0 (cosmetic; the service filters on moved)',
      'real_smoke: SystemRoot set but empty does not fall back to C:\Windows',
      'combined with W12-P2 the old service test SERVICE_M35_CLEAN journal failure state (quarantine closing line fails after a move) changes from failed/error to record kept; migrate it on main after P2 merges']},
  p2: {head: '67dd9f05fe738ad411a8f17b9e473211839a948c', impl: '89b79d4f359c7a11ae6f73a17879a88217d8a6ff', merge: '0b38128b0bbcedc9748011249df9dec6a6eabf36', self: 'Codex GPT-6',
    summary: 'medium gate: audit 0 problems after the controller added the missing addendum resumeFromCommit (base 6fd29e34, no worker commit existed when the addendum went out); fresh tree lock, check, real and test finals; three ticket controls replayed and caught; controller mutations c1 (keep running quarantine batches after journal_error, addendum 01), c2 (folder skips case-sensitive) and c3 (diagnostics carry the data folder) all caught at their intended assertions; independent review found no high issue and one medium carried over; implementation commits 846ca073 and 89b79d4f (finals on the latter)',
    later: ['medium: a leak cluster skipped from its card keeps its clue while any member is not cleanable (too recent, or kept as newest for <h> templates), because the clue check counts only members that were cleanable and skipped; w12_skip_rows ages every member to 20 days, so no test sees it',
      'a quarantine batch that returns Err(Journal) after earlier work becomes a failed group, not a journal stop: later batches still go to the executor, journal_note_zh stays null and diagnostics last_clean.journal_error is false (safe: the executor writes intent before acting)',
      '"nothing done yet" is judged by moved bytes: if earlier batches moved only 0-byte items, a later Err(Journal) returns JOURNAL_MESSAGE and the clean record is not saved (the quarantine records still are)',
      'a quarantine id is reserved in memory and written into the stored report for batches that never run (no folder, no save_moves)',
      'journal_note_zh can read "后面的 0 项没有清" when the failure is on the last item; with W12-P1 the m35_clean_split journal fixture produces exactly this',
      'quarantine failure notes carry English executor errors (journal write failed, filesystem operation failed) in the Chinese UI',
      'when every batch is unrun or failed the view still writes a quarantined block with item_count 0; unrun batches do not advance the progress observer',
      'skip_unit_add with no scan returns not_found rather than stale or invalid',
      'template skips dedupe case-insensitively but match the template exactly (contract wording)',
      'tests weaker than named: template and folder fixtures share one template and parent, so a unit skip that matched the whole group would pass; the journal-stop test injects a quarantine report with journal_error and nothing moved, which W12-P1 never produces; SERVICE_W12_DIAG runs only with last_clean null; the 4.2 drawer assertion passes if the row is absent']},
  p3: {head: '4e1185b9b5d05210fd11093822d96ae794595988', impl: 'ff0f9530d3a6950a88593d6265151039ee547240', merge: '385ae1756abd91acb59e72a303d772ffa2c8a7d2', self: 'Codex GPT-6',
    summary: 'light gate: audit 0 problems; check, test and native finals on the implementation commit (17/17 steps, title Flick); two ticket controls red then green; report reviewed; policy.rs gained the publisher field because the config struct denies unknown fields',
    later: ['two forwarding commands tested with a fake backend only; the joined chain with the merged service is left to the tenth integration']},
  p4: {head: 'ef7d2d7a61fec906cba4529f3019b4cbe6a319cd', impl: '5a2eccfdd120bcaa1fdebc0a90c9eebfcc573cd6', merge: '46463017b4917fd06b7d68aa22655f6c877e3516', self: 'Claude Opus 5.5 (claude-opus-5-5)',
    summary: 'light gate: audit 0 problems; check, test and browser finals on the implementation commit, 28 screenshots including the first-run page, the about page and the skip list; three ticket controls red then green (second round, the first round ran browser instead of test after each red); one timing-only browser wait rerun once; report and new screenshots reviewed',
    later: ['the about page shows the version from app_info while the settings side card still prints a fixed product version line; check both against the real host and service in the tenth integration',
      'the first-run card is a tall dark card with three short lines; consider a shorter card when the UI is next touched',
      'clipboard after an awaited IPC call in the Tauri WebView is not verified (falls back to the read-only text box)',
      'app_info or diagnostics_get failing on the about page has no dedicated test']},
  p5: {head: '23731efd0fccfcead4c857b1d94ff3eb72fd666c', impl: 'fec544ccc27349b8564cfec742f7d19fb365254e', merge: '435317be19734592acf13480b97afd4810a11499', self: 'Codex GPT-6',
    summary: 'light gate: audit 0 problems; check, test and real finals on the implementation commit; two ticket controls red then green; report reviewed; 118 rules, data version 2026-11-07.3, no candidate dropped for a protected overlap',
    later: ['chromium-component-crx-cache uses one rule-level in_use list, so any of Chrome, Edge or Brave running skips all three locations',
      'copilot-sdk-runtimes uses in_use none (no known process name); keep_newest 1 still protects the newest runtime',
      'real smoke only counts known folders; the new rules have not met the real folders in a scan yet (tenth integration recheck)']},
};
for (const s of process.argv.slice(2)) {
  const d = data[s]; if (!d) throw Error('no data for ' + s);
  const t = m.tasks.find(x => x.slot === 'w12-' + s);
  Object.assign(t, {status: 'VERIFIED', submittedHead: d.head, implementationCommit: d.impl, mergeCommit: d.merge, workerSelfReport: d.self,
    controllerReview: {report: REVIEW, evidence: 'docs/acceptance/wave12/' + s + '/', summary: d.summary}, carryOverLater: d.later});
  console.log(t.id, t.status, d.merge.slice(0, 8));
}
fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n');
