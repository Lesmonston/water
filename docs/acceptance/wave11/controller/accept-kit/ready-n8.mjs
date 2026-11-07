// Turns WATER-W11-N8 from HOLD to READY in docs/dispatch/wave11/manifest.json, touching only that task.
// Usage (repo root): node .local/w11-prep/ready-n8.mjs <full base commit>
// The base is main after N3, N5 and N6 merged; .worktrees/w11-n8 must sit clean on it (frozen hashes use its checked-out bytes).
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(base)) throw Error('full base commit required');
const tree = '.worktrees/w11-n8';
assert.equal(execFileSync('git', ['-C', tree, 'rev-parse', 'HEAD']).toString().trim(), base);
assert.equal(execFileSync('git', ['-C', tree, 'status', '--porcelain']).toString(), '');
const frozen = paths => paths.map(path => ({path, sha256: createHash('sha256').update(readFileSync(tree + '/' + path)).digest('hex')}));
const path = 'docs/dispatch/wave11/manifest.json', m = JSON.parse(readFileSync(path, 'utf8'));
const t = m.tasks.find(x => x.id === 'WATER-W11-N8'); assert.equal(t.status, 'HOLD');
const w10 = JSON.parse(readFileSync('docs/dispatch/wave10/manifest.json', 'utf8')).tasks.find(x => x.id === 'WATER-W10-M14');
Object.assign(t, {
  worktree: 'F:/new/smaltalk/water/' + tree, baseCommit: base, snapshotRef: 'refs/tags/water-w11-n8-base-20261107',
  status: 'READY', readyOn: '2026-11-07', issuedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), baselineStatus: 'PENDING',
  purpose: t.purpose + '; nested plan items dropped (keep the outermost) because the executor now rejects nested plans (added 11-07 after the N3 review)',
  hint: 'Service, batch 2 on main after N3, N5, N6; section 1.8 nested-item dedupe is nc3; line numbers rechecked on this base.',
  proofTargets: {nc1: 'SERVICE_W11_QUARANTINE', nc2: 'SERVICE_W11_DECL', nc3: 'SERVICE_W11_NESTED'},
  mustRead: [...new Set([...t.mustRead, 'docs/dispatch/tickets/WATER-W10-M14-SERVICE-FIX-20261107.md', 'packages/cleanup-manifest/src/lib.rs', 'packages/junk-clean/src/model.rs', 'packages/junk-clean/src/lib.rs', 'packages/junk-scan/src/lib.rs', 'packages/water-service/src/', 'packages/water-service/tests/service_v1.rs', 'packages/water-service/README.md'])],
  frozenFiles: frozen([t.spec, ...w10.frozenFiles.map(f => f.path)]),
});
delete t.holdReason;
writeFileSync(path, JSON.stringify(m, null, 2) + '\n');
console.log(t.id, t.status, t.baseCommit.slice(0, 8), 'frozen', t.frozenFiles.length, 'proof', JSON.stringify(t.proofTargets), 'modes', t.allowedModes.join('/'));
