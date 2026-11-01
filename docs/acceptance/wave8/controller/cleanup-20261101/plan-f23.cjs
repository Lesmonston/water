// F-drive quarantine plan, part 2 (F2/F3) for "F1到F10" (user, 11-02): whole Water worktrees whose branches
// are on origin and whose untracked evidence has byte-identical copies in main (check-trees.cjs,
// check-trees-anywhere.cjs). After the move, `git worktree prune` drops their registrations; branches stay.
// usage: node plan-f23.cjs <out plan.json>
const fs = require('fs');
const wt = n => ({ path: `F:\\new\\smaltalk\\water\\.worktrees\\${n}` });
const k = [1, 2, 3, 4, 5, 6];
const items = [
  { n: 2, label: 'F2 第八波执行树与验收树', paths: [...k.map(i => wt(`w8-k${i}`)), ...k.map(i => wt(`accept-w8-k${i}`))] },
  { n: 3, label: 'F3 第二至四波自检树', paths: ['w2-selftest', 'w3-selftest-f1', 'w3-selftest-f2', 'w3-selftest-f3', 'w4-selftest-g1', 'w4-selftest-g2', 'w4-selftest-g3'].map(wt) },
];
fs.writeFileSync(process.argv[2], '\uFEFF' + JSON.stringify({ drive: 'F', quarantine: 'F:\\_water-quarantine-20261102', items }, null, 1));
for (const it of items) console.log(it.label, it.paths.length, 'paths');
