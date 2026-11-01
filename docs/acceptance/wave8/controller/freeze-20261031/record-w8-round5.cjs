// Wave 8 round 5 ledger update: K6 addendum 04 reviewed, K6 addendum 05 READY.
// Usage (repo root): node docs/acceptance/wave8/controller/freeze-20261031/record-w8-round5.cjs <issuedAtISO>
const fs = require('fs');
const file = 'docs/dispatch/wave8/manifest.json';
const [issuedAt] = process.argv.slice(2);
if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(issuedAt ?? '')) throw new Error('usage: <issuedAtISO>');
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
const k6 = m.tasks.find(t => t.id === 'WATER-W8-K6');
const a4 = k6.addenda.find(a => a.id === 'WATER-W8-K6-ADDENDUM-04');
if (a4.status !== 'DISPATCHED') throw new Error('unexpected addendum 04 status ' + a4.status);
Object.assign(a4, {
  status: 'SUBMITTED_CHANGES_REQUESTED',
  submittedHead: '166609e8e775800736fb93ef2f4d8ee632f45ad6',
  implementationCommit: 'e69ff68b056db6e20a39d07b12734ad843e0b982',
  workerSelfReport: 'Codex GPT-6',
});
k6.addenda.push({
  id: 'WATER-W8-K6-ADDENDUM-05',
  ticket: 'docs/dispatch/tickets/WATER-W8-K6-ADDENDUM-05-20261101.md',
  status: 'READY',
  issuedAt,
  resumeFromCommit: '166609e8e775800736fb93ef2f4d8ee632f45ad6',
  change: 'a manual exclusion survives skip then restore (prune only skip-insurance exclusions of items listed ineligible; controller gap in addendum 02 3.3); in-drawer skip failure shows the skip-specific text; focus after an item is disabled goes to a role=status note or the close button, never to the skip button; a failed skip_add/skip_remove/locations_set_category marks a shown result stale; fake host reuses the lowest free skip ID like the service; README brought up to date; separate assertions for the two addendum 04 2.1 fixes and for passing retained exclusion metadata; nc1-nc3 redone; 26 screenshots; no baseline rerun',
  dispatchedAt: null,
  submittedHead: null,
  implementationCommit: null,
  dispatchEvidence: null,
});
k6.controllerReview.round5 = 'addendum 04 (e69ff68b): audit 0 problems; fresh tree check/browser finals passed; 8 changed screenshots reviewed (animation frames only); controller mutations 21: 19 caught (e1 caught at UI_M3C_EXCLUDE, token too narrow), f2/f7 survived as a redundant pair; test --final passed; review: no High, emptied groups stay out on every path, WYSIWYG holds against the real service; Medium: a manual exclusion is pruned when the item is skipped and so returns after restore (controller gap in addendum 02 3.3) -> addendum 05 with lows (focus lands on the skip button, in-drawer skip failure text, unknown-outcome settings calls)';
m.status = 'FIFTH_ROUND_K6_ADDENDUM';
fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
console.log('K6', k6.status, k6.addenda.map(a => a.id.slice(-11) + ':' + a.status).join(' '));
