// The picker tests' fixed empty-directory fixture, same layout and index as scripts/prepare-picker-fixtures.mjs
// (which only serves the wave 1 task), made in the current tree's .local/picker-fixtures. Kept if already there.
// Usage: node F:/new/smaltalk/water/.local/w11-integ9/picker-fixtures.mjs   (cwd = the tree)
import assert from 'node:assert/strict';
import {existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
const tree = resolve('.'), parent = join(tree, '.local', 'picker-fixtures'), base = join(parent, 'batch-v1'), indexPath = join(parent, 'index.json');
if (!existsSync(indexPath)) {
  assert(!existsSync(base), 'Partial batch retained');
  mkdirSync(base, {recursive: true});
  for (const p of ['root', 'root/nested', 'other', 'trap']) mkdirSync(join(base, p));
  symlinkSync(join(base, 'trap'), join(base, 'junction'), 'junction');
  writeFileSync(indexPath, JSON.stringify({fixture_version: 'water.picker-fixtures.v1', base, root: join(base, 'root'), other: join(base, 'other'), junction: join(base, 'junction'), ordinary_file_count: 0, content_bytes: 0}, null, 2) + '\n', {flag: 'wx'});
}
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
assert.equal(index.base, base);
for (const [p, names] of [[base, ['junction', 'other', 'root', 'trap']], [index.root, ['nested']], [index.other, []]]) assert.deepEqual(readdirSync(p).sort(), names);
assert(lstatSync(index.junction).isSymbolicLink());
assert.equal(realpathSync(index.junction).toLowerCase(), realpathSync(join(base, 'trap')).toLowerCase());
console.log(indexPath);
