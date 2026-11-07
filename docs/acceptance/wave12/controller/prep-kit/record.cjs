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
