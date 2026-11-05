// Copy each wave 10 baseline receipt and its logs into the controller preflight folder and record the result in the manifest.
// M6 (UI) is held for the visualization redesign the user asked for on 2026-11-05.
import fs from 'node:fs';
const repo = 'F:/new/smaltalk/water';
const mp = repo + '/docs/dispatch/wave10/manifest.json';
const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
const out = repo + '/docs/acceptance/wave10/controller/preflight-20261105/';
for (const t of m.tasks) {
  const n = t.slot.replace('w10-', ''), src = t.worktree + '/.local/checks/' + t.id + '/';
  const files = fs.readdirSync(src).filter(f => f.includes('-baseline-'));
  const result = files.find(f => f.endsWith('-baseline-result.json'));
  const rec = JSON.parse(fs.readFileSync(src + result, 'utf8'));
  fs.mkdirSync(out + n, { recursive: true });
  for (const f of files) fs.copyFileSync(src + f, out + n + '/' + f);
  t.baselineStatus = rec.status === 'passed' ? 'PASSED' : 'FAILED';
  t.baselineEvidence = 'docs/acceptance/wave10/controller/preflight-20261105/' + n + '/' + result;
  if (t.id === 'WATER-W10-M6') {
    t.status = 'HOLD';
    t.holdReason = '2026-11-05 user: "UI整体要做可视化的优化，整体的可视化方案你要想一下用什么替代目前的主要面板。" The UI ticket waits for the visualization scheme (docs/design/water-ui-v2/viz-proposal.html); UI-M35 and the fixtures are revised after the user decides. Baseline also failed on the frozen-file hash of docs/design/water-ui-v2/mockup.html (worktree and controller copies differ, likely line endings); fix when the ticket is reissued.';
  }
  console.log(t.id, t.status, t.baselineStatus, files.length);
}
fs.writeFileSync(mp, JSON.stringify(m, null, 2) + '\n');
