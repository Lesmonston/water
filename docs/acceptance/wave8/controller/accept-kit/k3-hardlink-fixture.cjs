// Controller fixture for W8-K3 acceptance: hard links inside one item, links across items,
// a marker-measured item with links, and two marker targets on the same root.
// Creates only under <scratch>/k3-fx-<stamp>; prints the plan path. Never touches anything else.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const scratch = 'C:\\Windows\\TEMP\\claude\\F--new-smaltalk-water\\2248d207-077d-44a9-b861-1bc97e6231f3\\scratchpad';
const root = path.join(scratch, 'k3-fx-' + Date.now());
const mk = p => fs.mkdirSync(p, { recursive: true });
const write = (p, n) => { mk(path.dirname(p)); fs.writeFileSync(p, crypto.randomBytes(n), { flag: 'wx' }); };
const link = (from, to) => { mk(path.dirname(to)); fs.linkSync(from, to); };
const MiB = 1024 * 1024;
// pattern group "fx-pattern": items hard, plain, crossA, crossB
write(path.join(root, 'pat', 'hard', 'a.bin'), MiB);
link(path.join(root, 'pat', 'hard', 'a.bin'), path.join(root, 'pat', 'hard', 'l1.bin'));
link(path.join(root, 'pat', 'hard', 'a.bin'), path.join(root, 'pat', 'hard', 'sub', 'l2.bin'));
link(path.join(root, 'pat', 'hard', 'a.bin'), path.join(root, 'pat', 'hard', 'sub', 'deep', 'l3.bin'));
write(path.join(root, 'pat', 'plain', 'b.bin'), 300000);
write(path.join(root, 'pat', 'crossA', 'c.bin'), 200000);
link(path.join(root, 'pat', 'crossA', 'c.bin'), path.join(root, 'pat', 'crossB', 'c.bin'));
// marker groups on one root: "fx-mk-file" (marker file .fxmark) and "fx-mk-dir" (dir name cachex)
mk(path.join(root, 'mkr', 'proj', 'build'));
fs.writeFileSync(path.join(root, 'mkr', 'proj', 'build', '.fxmark'), 'fx', { flag: 'wx' });
write(path.join(root, 'mkr', 'proj', 'build', 'x.bin'), 500000);
link(path.join(root, 'mkr', 'proj', 'build', 'x.bin'), path.join(root, 'mkr', 'proj', 'build', 'inner', 'y.bin'));
write(path.join(root, 'mkr', 'proj', 'build', 'inner', 'cachex', 'z.bin'), 70000);
write(path.join(root, 'mkr', 'other', 'cachex', 'w.bin'), 40000);
link(path.join(root, 'mkr', 'other', 'cachex', 'w.bin'), path.join(root, 'mkr', 'other', 'cachex', 'w2.bin'));
const target = (id, match) => ({
  target_id: id + '#1', group_id: id, rule_id: id, level: 'recommended', category: 'custom',
  match, item_type: 'dir', min_age_hours: 0, keep_newest: 0,
  in_use: { mode: 'runs_from_or_references_item', processes: [] },
});
const plan = {
  plan_version: 'water.scan-plan.v1',
  rules_data_version: '2026-10-31.1',
  created_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  targets: [
    target('fx-pattern', { kind: 'pattern', base: path.join(root, 'pat'), segments: ['*'] }),
    target('fx-mk-file', { kind: 'marker', root: path.join(root, 'mkr'), marker: { kind: 'file', name: '.fxmark', min_bytes: 1, max_bytes: 64 }, max_depth: 4 }),
    target('fx-mk-dir', { kind: 'marker', root: path.join(root, 'mkr'), marker: { kind: 'dir_name', names: ['cachex'] }, max_depth: 6 }),
  ],
  hard_guards: [root, path.join(root, 'pat'), path.join(root, 'mkr'), 'C:\\'],
};
const planPath = root + '-plan.json';
fs.writeFileSync(planPath, JSON.stringify(plan, null, 1), { flag: 'wx' });
console.log(JSON.stringify({ root, planPath }));
