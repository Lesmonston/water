// Record the wave 9 acceptance in docs/dispatch/wave9/manifest.json. usage: node record-verified.cjs '{"l1":"<merge>",...}'
const fs = require('fs');
const repo = 'F:/new/smaltalk/water/';
const mPath = repo + 'docs/dispatch/wave9/manifest.json';
const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
const merges = JSON.parse(process.argv[2]);
const heads = JSON.parse(fs.readFileSync(repo + '.local/w9-accept/heads.json', 'utf8'));
const impl = { l1: 'c27b88c84fd3a7000580c126148f7740f8f6d927', l2: 'd9808f18fbfa84714f7a688ad18014f967aea566', l3: '297a5dbd43f2a948c8342a9465b00e20dd57962f', l4: '3967b1ebfd3103457245c558d8fab37501796751' };
const self = { l1: 'Codex (GPT-6)', l2: 'Codex (GPT-6)', l3: 'Grok 4.6 (xAI)', l4: 'Codex (GPT-6)' };
const review = {
  l1: 'audit 0 problems; fresh tree lock, check, real and test finals passed; controller mutations c1-c4 all caught (c2 first written without keeping `seen` used and failed to compile, rewritten); independent review found no bug or spec deviation; old assertions changed only within RULES-M3D section 6',
  l2: 'audit 0 problems; addendum 01 resolved the fixture-wording block; fresh tree lock, check, real (partial, 185275 entries, 17.8 s) and test finals passed; controller mutations c1-c5 all caught; independent review found no bug or spec deviation; junction and hard-link fixtures untouched',
  l3: 'audit 0 problems; fresh tree lock, check, real and test finals passed; controller mutations: c1, c3, c4, c5 caught, c2 (oldest instead of latest base) survives because no test has two qualifying bases; the first-round c1/c2 runs aborted with 0xC0000409 while four trees built at once and passed on a quiet rerun; independent review found no bug or spec deviation',
  l4: 'audit 0 problems; fresh tree lock, check, real and test finals passed; controller mutations c1-c3 all caught (c3 added to give the final an nc2 proof); independent review found no bug or spec deviation; real smoke now prints counts only (orphan names removed per the ticket), superseding checkup-v1/PROCESS.md line 49 via PROCESS-M3D section 3',
};
const later = {
  l1: ['rejection cases for "fallback rule must be custom", "main must be custom" and "main must be a marker" also break other rules, so deleting those checks fails no test (the checks are redundant with others)'],
  l2: ['listing problems and budget_exhausted inside a folder routed to a fallback are recorded on the primary group only (SCAN-M3D section 3 literal reading); decide in wave 10 whether they belong on the fallback group',
    'the "fallback group appears with 0 items" assertion passes vacuously if the group is missing; the self-pointing and fallback-of-fallback counterexamples also break other rules'],
  l3: ['no test has two qualifying growth bases, so "latest wins" is unverified (controller mutation c2 survives)',
    'when the growth base is trimmed from storage, records that used it show since null and "与 0 月 0 日相比" after a restart; growth_base_scan_id type is not validated on load'],
  l4: ['no MSYS case with non-ASCII characters; the README does not describe the MSYS rule'],
};
for (const t of m.tasks) {
  const s = t.slot.slice(3);
  if (!merges[s]) continue;
  Object.assign(t, {
    status: 'VERIFIED', submittedHead: heads[s], implementationCommit: impl[s], workerSelfReport: self[s], mergeCommit: merges[s],
    controllerReview: { report: 'docs/acceptance/wave9/controller/WATER-W9-REVIEW-20261102.md', evidence: 'docs/acceptance/wave9/controller/accept-20261102/' + s + '/', summary: review[s] },
    carryOverLater: later[s],
  });
  if (t.addenda) for (const a of t.addenda) Object.assign(a, { status: 'VERIFIED', submittedHead: heads[s], implementationCommit: impl[s] });
  console.log(t.id, t.status, t.mergeCommit);
}
if (m.tasks.every(t => t.status === 'VERIFIED')) m.status = 'ALL_VERIFIED_MERGED', m.completedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n');
console.log('manifest', m.status);
