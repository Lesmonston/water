// Creates the small fixture trees that the native-root and scope-registry tests read, under <repo>/.local/:
// empty folders, two short text files and a few junctions. Each tree is written once; a later run checks the index and
// reuses it. Prints the two index variables and, in GitHub Actions, appends them to $GITHUB_ENV.
// Usage (repository root, Windows): node scripts/ci/prepare-test-fixtures.mjs
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFileSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

assert.equal(process.platform, 'win32', 'The fixtures use Windows junctions');
const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
assert(existsSync(join(root, 'packages', 'native-root', 'Cargo.toml')), 'Run from a Flick checkout');
const hash = b => createHash('sha256').update(b).digest('hex');
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});

function nativeRoot() {
  const parent = join(root, '.local', 'native-root-fixtures'), base = join(parent, 'batch-v1'), indexPath = join(parent, 'index.json');
  if (!existsSync(indexPath)) {
    assert(!existsSync(base), 'A partial native-root fixture exists; remove ' + base + ' and run again');
    mkdirSync(base, {recursive: true});
    for (const p of ['normal-a', 'normal-a/nested', 'normal-b', 'trap-target']) mkdirSync(join(base, p));
    const files = [['normal-a/nested/leaf.txt', 'WATER-N leaf\n'], ['trap-target/sentinel.txt', 'WATER-N trap retained\n']];
    for (const [p, text] of files) writeFileSync(join(base, p), text, {flag: 'wx'});
    symlinkSync(join(base, 'trap-target'), join(base, 'final-junction'), 'junction');
    symlinkSync(join(base, 'trap-target'), join(base, 'normal-a/ancestor-junction'), 'junction');
    write(indexPath, {
      fixture_version: 'water.native-root-fixtures.v1', base,
      normal_a: join(base, 'normal-a'), normal_b: join(base, 'normal-b'), nested: join(base, 'normal-a/nested'),
      file: join(base, 'normal-a/nested/leaf.txt'), missing: join(base, 'normal-a/not-created'),
      final_reparse: join(base, 'final-junction'), ancestor_reparse: join(base, 'normal-a/ancestor-junction'),
      ancestor_child: join(base, 'normal-a/ancestor-junction/sentinel.txt'), trap: join(base, 'trap-target'),
      files: files.map(([p, text]) => ({path: join(base, p), sha256: hash(Buffer.from(text)), bytes: Buffer.byteLength(text)})),
      content_bytes: files.reduce((n, [, t]) => n + Buffer.byteLength(t), 0),
    });
  }
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  assert.equal(index.fixture_version, 'water.native-root-fixtures.v1'); assert.equal(index.base, base);
  return indexPath;
}

function scope() {
  const parent = join(root, '.local', 'scope-fixtures'), base = join(parent, 'batch-v1'), indexPath = join(parent, 'index.json');
  if (!existsSync(indexPath)) {
    assert(!existsSync(base), 'A partial scope fixture exists; remove ' + base + ' and run again');
    mkdirSync(base, {recursive: true});
    for (const p of ['root-a', 'root-a/nested', 'root-b', 'outside-trap']) mkdirSync(join(base, p));
    symlinkSync(join(base, 'outside-trap'), join(base, 'root-junction'), 'junction');
    write(indexPath, {
      fixture_version: 'water.scope-fixtures.v1', base,
      normal_a: join(base, 'root-a'), normal_b: join(base, 'root-b'), nested: join(base, 'root-a/nested'),
      alias: join(base, 'root-a').replaceAll('\\', '/'), reparse: join(base, 'root-junction'), trap: join(base, 'outside-trap'),
      ordinary_file_count: 0, content_bytes: 0,
    });
  }
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  assert.equal(index.fixture_version, 'water.scope-fixtures.v1'); assert.equal(index.base, base);
  return indexPath;
}

const lines = [`WATER_NATIVE_ROOT_FIXTURE_INDEX=${nativeRoot()}`, `WATER_SCOPE_FIXTURE_INDEX=${scope()}`];
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, lines.join('\n') + '\n');
console.log(lines.join('\n'));
