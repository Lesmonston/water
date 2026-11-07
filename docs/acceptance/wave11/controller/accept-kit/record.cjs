// Record wave 11 batch-one acceptances in docs/dispatch/wave11/manifest.json (run from the repo root).
const fs = require('fs');
const mPath = 'docs/dispatch/wave11/manifest.json';
const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
const heads = JSON.parse(fs.readFileSync('.local/w11-accept/heads.json', 'utf8'));
const impl = {n1: '5f392089d1205c3e9b8d077c964fea84e620b2e1', n2: '490c8e02d31e37dc2a3a04ccd09075a29d0ebbdf', n3: '0743dab9dfa2d571235c8fe4fb63ea24162932c0', n4: '1c427953e9470fe98c2c64b9042e5b72190d885e', n5: '46fc5b5bfd51fb6e656cd6717430668fd1237633', n6: '533f4be64b8544de226bd4bb75b9fce74ea29309', n7: '2c234d6aaf80ce7824eb11fd0954c729506c6225'};
const merge = {n4: 'ed3b426167223f9f74f093f89e6a1766200aad0c', n5: '3223b0ece887947b83753b251ce9bc14cfb81253', n6: 'e34c3c0e3bf224d7c5cbfb2be60801d0b53f2774', n7: '4f448d17c03ed2f1dc1e8bf3bc050f93756481f1', n3: '4e4118966b98f9ce20c560ca10f89b239847686c'};
const self = {n1: 'Codex GPT-6 (took over a tree whose implementation was already committed; ran the checks and handed back)'};
const review = {
  n4: 'audit 0 problems; fresh tree lock, check, real and test finals; three ticket controls replayed and caught; independent review found no high or medium issue',
  n5: 'audit 0 problems; fresh tree lock, check, real and test finals; three ticket controls and four controller mutations all caught; independent review found no high or medium issue',
  n6: 'audit 0 problems; fresh tree lock, check, real and test finals; two ticket controls caught; independent review found no high or medium issue',
  n7: 'audit 0 problems; fresh tree lock, check, real and test finals; two ticket controls caught; independent review found no high or medium issue',
  n3: 'audit 0 problems; fresh tree lock, check, real and test finals; three ticket controls and six controller mutations at the product call sites all caught; independent review: the ticket premise (the scan never nests eligible items) was wrong, so nested selections are rejected until N8 section 1.8 lands; main is not released before N8',
  n2: 'audit 0 problems (after fixing the audit script title check); fresh tree lock, check, test and native finals (17/17 steps, window title Flick, no quarantine root left); three ticket controls and four controller mutations all caught; independent review found no high or medium issue in scope; out of scope: the picker title (fixed by the controller in f36975c9)',
  n1: 'audit 0 problems; fresh tree check, test and browser finals; three ticket controls caught; screenshots show the Flick mark, 0 MB and the brand; the remaining visible Water text is service-owned (N8)',
};
const later = {
  n3: ['default root .flick-quarantine is not caught by any test (no drive-root quarantine in tests); N8 asserts the root the service passes', 'c12, c13, c4, c5, c7 still have no product-path coverage (written reasons accepted by the independent review)', 'real_smoke starts a hidden powershell.exe by relative name to list fixed drives (accepted low deviation; use the absolute path when next touched)', 'overlap check is ASCII case only (no non-ASCII case, 8.3 names or junction aliases; identity checks back it up)'],
  n5: ['Flick-before-Water declaration order relies on the lowercase path sort, uncommented', 'the two name checks are duplicated in two places each', 'new tests reach scans through helpers that unwrap()'],
  n6: ['real_smoke zips fixed key names with FILE_NAMES order'],
  n2: ['CompanyName in the exe version resource is "water" (no bundle.publisher; config check forbids adding it)', 'an old-folder metadata error other than NotFound is treated as not a plain folder, so an empty Flick folder is created and the old data stays in place', 'untested: rename fails while the new folder now exists; rename fails and the old folder no longer passes; new folder is a junction while the old one is plain', 'running an old water.exe after the move creates a fresh Water folder (tell users at release to stop using the old program)'],
};
for (const t of m.tasks) {
  const s = t.slot.slice(4);
  if (!impl[s]) continue;
  Object.assign(t, {
    status: merge[s] ? 'VERIFIED' : 'ACCEPTED', submittedHead: heads[s], implementationCommit: impl[s], workerSelfReport: self[s] ?? 'Codex GPT-6',
    ...(merge[s] ? {mergeCommit: merge[s]} : {mergeAfter: s === 'n2' ? 'WATER-W11-N8' : 'WATER-W11-N2'}),
    controllerReview: {report: 'docs/acceptance/wave11/controller/WATER-W11-REVIEW-20261107.md', evidence: 'docs/acceptance/wave11/controller/accept-20261107/' + s + '/', summary: review[s]},
    ...(later[s] ? {carryOverLater: later[s]} : {}),
  });
  console.log(t.id, t.status, (t.mergeCommit ?? t.mergeAfter).slice(0, 12));
}
fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n');
