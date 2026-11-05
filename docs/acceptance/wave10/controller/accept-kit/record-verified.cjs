// Record wave 10 acceptances in docs/dispatch/wave10/manifest.json. usage: node record-verified.cjs '{"m9":"<merge>",...}'
const fs = require('fs');
const repo = 'F:/new/smaltalk/water/';
const mPath = repo + 'docs/dispatch/wave10/manifest.json';
const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
const merges = JSON.parse(process.argv[2]);
const heads = JSON.parse(fs.readFileSync(repo + '.local/w10-accept/heads.json', 'utf8'));
const impl = { m9: '9bf847f725d863f5c9914e4767025022fe27cce9', m3: 'ec0ed5fd9a3911baec20b8a2c56f5f4510524a6e' };
const self = { m9: 'Codex GPT-6', m3: 'Codex GPT-6' };
const review = {
  m9: 'audit 0 problems; fresh tree lock, check, real and test finals passed; controller mutations c1-c6 all caught (case-sensitive sort, user scope skipped, reversed prefix direction, digit-only names, setup not a stop word, % accepted); independent review found no high-severity issue',
  m3: 'audit 0 problems; fresh tree lock, check, real and test finals passed; controller mutations c1-c5 all caught (.git segment, 366 days, keepNewest 9, directory not lowercased before hashing, case-sensitive directory in protects); independent review found no high-severity issue',
};
const later = {
  m9: [
    'name_tokens keeps a CJK run glued to Latin letters or digits (installed "腾讯QQ" is one token, so find(name_tokens("QQ")) is empty); follows the literal APPS-M35 section 4 split rule; M7 must not call such a program uninstalled on this basis alone',
    'collected_at is Unix seconds as a string ("-N" before the epoch); APPS-M35 is silent, M7/IPC must convert to the RFC 3339 form used elsewhere',
    'values longer than the 2050-unit native buffer are dropped before trimming (a DisplayName padded with thousands of spaces loses the entry)',
    'the 5000 cap truncates in enumeration order before sorting, and unreadable_keys stops counting at the cap',
    'a drive-root InstallLocation (D:\\) becomes D: and is treated as missing (literal contract reading)',
    'weak tests: the registry kind to RegValue::Other mapping, the 5000 cap, truncated and unreadable_keys are not exercised; nc1 relies on the machine having WOW6432Node entries',
  ],
  m3: [
    'parse reports unknown keys in alphabetical order (serde_json map without preserve_order) and fields in schema order, not in the manifest document order MANIFEST-M35 section 7 asks for; only matters when one manifest has several problems',
    'protects returns None for \\\\?\\, UNC or ADS-style paths because absolute_parts accepts only X:\\ forms; M7 must pass X:\\ forms (strip \\\\?\\) before calling protects, and read_git_link with a \\\\?\\ worktree_dir reports invalid',
    'protects returns None when path is an ancestor of dir (contract says so); M7 must still keep a declared project directory out of any plan item that contains it (for example by adding its protected paths to the clean plan protected_paths)',
    'examples/real_smoke.rs finds the repository root with ancestors().nth(4), which only works under .worktrees/<name>/; run from the main checkout it panics; fix when the crate is next touched',
    'control characters in a path pattern are reported as MANIFEST_FIELD rather than MANIFEST_PATH',
    'to_targets trusts its input: a Manifest built without parse() can panic (sibling-complete-file-exists without a suffix) or map an unknown when to 0 hours',
    'weak tests: the >1 KB .git case also lacks gitdir:, the 8-segment, 255 and 512 limits are tested only on the reject side, MANIFEST_UNREADABLE is not covered',
  ],
};
for (const t of m.tasks) {
  const s = t.slot.slice(4);
  if (!merges[s]) continue;
  Object.assign(t, {
    status: 'VERIFIED', submittedHead: heads[s], implementationCommit: impl[s], workerSelfReport: self[s], mergeCommit: merges[s],
    controllerReview: { report: 'docs/acceptance/wave10/controller/WATER-W10-REVIEW-20261105.md', evidence: 'docs/acceptance/wave10/controller/accept-20261105/' + s + '/', summary: review[s] },
    carryOverLater: later[s],
  });
  console.log(t.id, t.status, t.mergeCommit);
}
fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n');
