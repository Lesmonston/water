// Runs the public CI (.github/workflows/ci.yml) locally on an exported tree before a public push.
// Put the tree on a drive other than the working repository's (GitHub's runner checks out on D:), so tests that quietly
// depend on where the working repository lives fail here first; the first public push (11-08) failed CI that way.
// Usage (repo root): node scripts/release/ci-local.mjs <tree> [--only <crate,...>] [--log <dir>]
// Steps follow the workflow, but every step runs even after a failure so one pass finds everything: the test fixtures
// once, then for each matrix crate fmt --check, clippy -D warnings and cargo test --locked; native-picker builds its
// tests only; the UI runs its unit tests. Each step's output goes to <log>/<n>-<crate>-<step>.log (default: the tree's
// sibling folder ci-local-logs); prints a summary, writes summary.json there and exits 1 when any step failed.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const tree = resolve(args[0] ?? '.');
const workflowPath = join(tree, '.github', 'workflows', 'ci.yml');
if (!existsSync(workflowPath)) throw Error('Not an exported tree: ' + tree);
const logDir = resolve(opt('--log') ?? join(tree, '..', 'ci-local-logs'));
mkdirSync(logDir, {recursive: true});
const workflow = readFileSync(workflowPath, 'utf8');
const matrix = [...workflow.matchAll(/^\s+- ((?:packages|apps)\/[\w/-]+)\s*$/gm)].map(m => m[1]);
const toolchain = workflow.match(/RUST_TOOLCHAIN:\s*"([^"]+)"/)?.[1];
if (!matrix.length || !toolchain) throw Error('Could not read the matrix or toolchain from ci.yml');
for (const needed of ['packages/native-picker', 'apps/water/ui/tests/unit.test.mjs'])
  if (!workflow.includes(needed)) throw Error('ci.yml no longer mentions ' + needed + '; update this script');
const only = opt('--only')?.split(',');
const want = crate => !only || only.includes(crate);

const env = {...process.env, CARGO_TERM_COLOR: 'never', RUSTUP_TOOLCHAIN: toolchain};
const results = [];
let n = 0;
const run = (crate, step, cmd, cmdArgs) => {
  const started = Date.now();
  const r = spawnSync(cmd, cmdArgs, {cwd: tree, env, encoding: 'utf8', maxBuffer: 512 << 20, shell: false});
  const output = (r.stdout ?? '') + (r.stderr ?? '') + (r.error ? '\n' + r.error.message : '');
  const log = join(logDir, `${String(++n).padStart(2, '0')}-${crate.replaceAll('/', '_')}-${step}.log`);
  writeFileSync(log, `$ ${cmd} ${cmdArgs.join(' ')}\n\n${output}`);
  const ok = r.status === 0;
  const panics = [...output.matchAll(/^thread '([^']+)'.*panicked at ([^\n]+)\n([^\n]*)/gm)].map(m => `${m[1]} @ ${m[2]} ${m[3]}`.slice(0, 300));
  const errors = ok ? [] : output.split('\n').filter(l => /^error(\[|:)/.test(l)).slice(0, 5);
  results.push({crate, step, ok, seconds: Math.round((Date.now() - started) / 1000), log, panics, errors});
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${crate} ${step} (${results.at(-1).seconds}s)`);
  for (const line of [...panics, ...errors]) console.log('       ' + line);
  return output;
};

// Test fixtures: the script prints the index variables that the native-root and scope-registry tests read.
const fixtures = run('ci', 'fixtures', process.execPath, ['scripts/ci/prepare-test-fixtures.mjs']);
for (const m of fixtures.matchAll(/^(WATER_[A-Z_]+_INDEX)=(.+)$/gm)) env[m[1]] = m[2].trim();

const manifest = crate => ['--manifest-path', crate + '/Cargo.toml'];
for (const crate of matrix.filter(want)) {
  run(crate, 'fmt', 'cargo', ['fmt', ...manifest(crate), '--', '--check']);
  run(crate, 'clippy', 'cargo', ['clippy', '--locked', ...manifest(crate), '--all-targets', '--', '-D', 'warnings']);
  run(crate, 'test', 'cargo', ['test', '--locked', ...manifest(crate)]);
}
if (want('packages/native-picker')) {
  const crate = 'packages/native-picker';
  run(crate, 'fmt', 'cargo', ['fmt', ...manifest(crate), '--', '--check']);
  run(crate, 'clippy', 'cargo', ['clippy', '--locked', ...manifest(crate), '--all-targets', '--', '-D', 'warnings']);
  run(crate, 'test-build', 'cargo', ['test', '--locked', ...manifest(crate), '--no-run']);
}
if (want('ui')) run('ui', 'unit', process.execPath, ['--test', 'apps/water/ui/tests/unit.test.mjs']);

const failed = results.filter(r => !r.ok);
writeFileSync(join(logDir, 'summary.json'), JSON.stringify({tree, toolchain, steps: results.length, failed: failed.length, results}, null, 2) + '\n');
console.log(`\n${results.length - failed.length}/${results.length} steps passed; logs in ${logDir}`);
process.exit(failed.length ? 1 : 0);
