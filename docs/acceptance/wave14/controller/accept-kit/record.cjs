// Record wave 13 acceptances and merges in docs/dispatch/wave14/manifest.json (run from the repo root).
// Usage: node .local/w14-accept/record.cjs j1 r1 s1 u1   (only the slots given are updated)
const fs = require('fs');
const mPath = 'docs/dispatch/wave14/manifest.json';
const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
const REVIEW = 'docs/acceptance/wave14/controller/WATER-W14-REVIEW-20261108.md';
const data = JSON.parse(fs.readFileSync('.local/w14-accept/record-data.json', 'utf8'));
for (const s of process.argv.slice(2)) {
  const d = data[s]; if (!d) throw Error('no data for ' + s);
  const t = m.tasks.find(x => x.slot === 'w14-' + s);
  Object.assign(t, {status: 'VERIFIED', submittedHead: d.head, implementationCommit: d.impl, mergeCommit: d.merge, workerSelfReport: d.self,
    controllerReview: {report: REVIEW, evidence: 'docs/acceptance/wave14/' + s + '/', summary: d.summary}, carryOverLater: d.later});
  for (const a of t.addenda ?? []) if (d.addendaStatus) a.status = d.addendaStatus;
  console.log(t.id, t.status, d.merge.slice(0, 8));
}
fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n');
