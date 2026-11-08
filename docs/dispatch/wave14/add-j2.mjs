// Adds WATER-W14-J2 to docs/dispatch/wave14/manifest.json, cloned from WATER-W14-J1 (same kind, checker, tests and
// budgets), and records the S1 blocked hand-back plus addendum 01. Frozen hashes come from the J2 worktree.
// Usage from the repo root: node docs/dispatch/wave14/add-j2.mjs <full base sha>
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const BASE = process.argv[2], ROOT = 'F:/new/smaltalk/water', TREE = `${ROOT}/.worktrees/w14-j2`;
if (!/^[0-9a-f]{40}$/.test(BASE ?? '')) throw Error('need the full base sha');
const p = 'docs/dispatch/wave14/manifest.json', m = JSON.parse(readFileSync(p, 'utf8'));
const j1 = m.tasks.find(t => t.id === 'WATER-W14-J1');
const t = structuredClone(j1);
for (const k of ['controllerReview', 'carryOverLater', 'workerSelfReport', 'dispatchEvidence', 'submittedHead', 'implementationCommit', 'mergeCommit',
  'addenda', 'blocked', 'baselineEvidence', 'dispatchReportedAt', 'startedAt', 'dispatchedAt', 'model', 'dispatchedExecutor', 'controllerDecisions']) delete t[k];
const frozen = paths => paths.map(path => ({path, sha256: createHash('sha256').update(readFileSync(join(TREE, path))).digest('hex')}));
Object.assign(t, {
  id: 'WATER-W14-J2', title: '扫描：报“根目录走完”', slot: 'w14-j2', worktree: TREE, branch: 'worker/water-w14-j2', baseCommit: BASE,
  snapshotRef: 'refs/tags/water-w14-j2-base-20261108', status: 'READY', gate: 'medium', defaultExecutor: 'sol',
  ticket: 'docs/dispatch/tickets/WATER-W14-J2-SCAN-20261108.md', spec: 'contracts/w14-v1/W14-ADD-01.md',
  report: 'docs/dispatch/reports/WATER-W14-J2-REPORT.md', evidenceDir: 'docs/acceptance/wave14/j2/',
  allowedFiles: ['docs/dispatch/reports/WATER-W14-J2-REPORT.md'], allowedPrefixes: ['packages/junk-scan/', 'docs/acceptance/wave14/j2/'],
  proofTargets: {nc1: 'SCAN_W14_ROOTS', nc2: 'SCAN_W14_ROOTS', nc3: 'SCAN_W14_ROOTS'},
  purpose: 'ScanObserver gets on_root_done(&RootProgress) with an empty default; every distinct root of a non-fallback target is reported exactly once (skipped-up-front roots first, skipped roots when reached, walked roots after their subtree), roots_done counts 1..roots_total, nothing after cancel or an early end, space_overview never reports; on_progress unchanged',
  modelHint: 'Scan: W14-ADD-01 section 1; interface copied verbatim; roots_total must include ignored and inside-git roots; tests in existing functions with SCAN_W14_ROOTS; three NCs (nested root not reported, walked root reported at start, roots_total without skipped-up-front roots).',
  mustRead: ['docs/dispatch/WORKER-RULES.md', 'docs/dispatch/W14-WORKER-RULES.md', 'contracts/w14-v1/W14-ADD-01.md', 'contracts/w14-v1/W14.md',
    'packages/junk-scan/src/scan.rs', 'packages/junk-scan/src/scan/streaming.rs', 'packages/junk-scan/src/lib.rs', 'packages/junk-scan/tests/scan_v1.rs'],
  frozenFiles: frozen([...j1.frozenFiles.map(f => f.path), 'contracts/w14-v1/W14-ADD-01.md']),
  readyOn: '2026-11-08', issuedAt: new Date().toISOString(), dispatchedAt: null, startedAt: null, model: null, baselineStatus: null,
  source: 'docs/dispatch/wave14/PLAN.md', modelAssignment: 'user-arranged; report actual engine/model',
});
m.tasks = [...m.tasks.filter(x => x.id !== t.id), t];

const s1 = m.tasks.find(x => x.id === 'WATER-W14-S1');
s1.blocked = {
  submittedHead: '1587c1cc780c8680d971817f4c3ce67d5508ec86', wipCommit: '78acd3b66ecb417d9fe561785313342049af63a5',
  earlierBlockedReport: '414d42bf (the stopped duplicate session: concurrent writer)',
  reason: 'ScanProgress cannot tell when a target is done (throttled within-group emits, forced emits on unmatched directories, one final emit per target), so W14 3.3 "percent by completed targets" is not computable inside the service whitelist',
  controllerVerdict: 'confirmed by reading packages/junk-scan/src/scan.rs and scan/streaming.rs; fixed by contract W14-ADD-01 (scanner on_root_done, J2) and a two-part S1 continuation',
};
s1.addenda = [{
  id: 'WATER-W14-S1-ADDENDUM-01', ticket: 'docs/dispatch/tickets/WATER-W14-S1-ADDENDUM-01-20261108.md', issuedAt: new Date().toISOString(),
  resumeFrom: '1587c1cc780c8680d971817f4c3ce67d5508ec86', part: 'A',
  why: 'everything except the rules-stage count (W14-ADD-01 section 2): bilingual fields, old records, codes instead of Chinese sentences, six failing tests, space stage; interim rules stage (0 until scan_full returns); check and test green, no NCs, finals or archive; the hand-back head becomes the H1 base',
}];
s1.status = 'ADDENDUM_01_ISSUED';
m.status = 'R1_J1_VERIFIED_U1_ADDENDUM_S1_PART_A_J2_READY';
writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
console.log('added', t.id, 'frozen', t.frozenFiles.length, 'tests', t.expectedTests.length, '; S1', s1.status);
