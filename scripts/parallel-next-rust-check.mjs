import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { setup, copyCache } from './parallel-next-common.mjs';
const ctx = setup(['WATER-W1-G', 'WATER-W1-H'], ['baseline', 'lock', 'fmt', 'test', 'clippy', 'metadata', 'bridge']);
const { root, task, mode, env, local, output, stamp, command, record } = ctx;
let fault;
try {
  const home = local(`.local/${task.slot}-cargo-home`), target = local(`.local/${task.slot}-target`), temp = local(`.local/${task.slot}-tmp`);
  for (let dir = root;; dir = dirname(dir)) { for (const name of ['config', 'config.toml']) assert(!existsSync(join(dir, '.cargo', name))); if (dirname(dir) === dir) break; }
  for (const name of ['config', 'config.toml']) assert(!existsSync(join(home, name)));
  copyCache(ctx, home);
  const rustup = join(homedir(), '.cargo/bin/rustup.exe');
  const rustc = command(rustup, ['which', 'rustc', '--toolchain', '1.95.0']), cargo = command(rustup, ['which', 'cargo', '--toolchain', '1.95.0']);
  assert(isAbsolute(rustc) && isAbsolute(cargo));
  record.rustVersion = command(rustc, ['--version']); record.cargoVersion = command(cargo, ['--version']);
  assert(record.rustVersion.startsWith('rustc 1.95.0 ') && record.cargoVersion.startsWith('cargo 1.95.0 '));
  Object.assign(env, { RUSTC: rustc, RUSTDOC: join(dirname(rustc), 'rustdoc.exe'), RUSTUP_TOOLCHAIN: '1.95.0', CARGO_HOME: home, CARGO_TARGET_DIR: target, CARGO_BUILD_JOBS: '1', CARGO_NET_OFFLINE: 'true', CARGO_TERM_COLOR: 'never', TEMP: temp, TMP: temp, TMPDIR: temp });
  const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'PATH'; env[pathKey] = dirname(rustc) + ';' + (env[pathKey] ?? '');
  const externs = (names) => names.flatMap((name) => { const files = readdirSync(join(target, 'debug/deps')).filter((p) => p.startsWith('lib' + name + '-') && p.endsWith('.rlib')); assert.equal(files.length, 1, 'Ambiguous dependency ' + name); return ['--extern', name + '=' + join(target, 'debug/deps', files[0])]; });
  const eBuild = () => command(cargo, ['build', '--manifest-path', join(root, 'packages/report-view/Cargo.toml'), '--offline', '--locked', '--lib'], 180000);
  if (mode === 'baseline') {
    const source = join(output, stamp + '-probe.rs'), binary = join(output, stamp + '-probe.exe');
    writeFileSync(source, 'fn main() { println!("parallel-next-link-ok"); }\n', { flag: 'wx' });
    command(rustc, ['--edition=2024', '--crate-name', 'parallel_next_probe', source, '-o', binary], 180000); assert.equal(command(binary, []), 'parallel-next-link-ok');
    const meta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--no-deps', '--format-version', '1'])); assert.equal(meta.workspace_members.length, 1); assert.equal(meta.packages[0].name, 'water-contracts');
    eBuild(); const assetBinary = join(output, stamp + '-assets.exe');
    command(rustc, ['--edition=2024', '--crate-name', 'parallel_next_assets', join(root, 'scripts/acceptance/parallel-next-assets.rs'), '-L', 'dependency=' + join(target, 'debug/deps'), ...externs(['water_contracts', 'water_report_view', 'serde_json']), '-o', assetBinary], 180000);
    const actual = JSON.parse(command(assetBinary, []));
    assert.deepEqual(actual.reader, JSON.parse(readFileSync(join(root, 'contracts/report-reader-v1/reports.json'), 'utf8')));
    assert.deepEqual(actual.g_views, JSON.parse(readFileSync(join(root, 'contracts/scan-report-v1/expected-views.json'), 'utf8')));
    assert.equal(actual.new_products_tested, false); record.assets = { gReports: actual.g_valid_reports, hReports: actual.h_valid_reports, actualEViews: actual.reader.reports.length, newProductsTested: false };
  } else {
    const manifest = join(root, task.outputRoot, 'Cargo.toml'), text = readFileSync(manifest, 'utf8');
    assert(!/\[(?:patch|replace)(?:[.\]])|^\s*(?:git|registry|build|rustc-wrapper|runner)\s*=/mi.test(text));
    const args = ['--manifest-path', manifest];
    if (mode === 'lock') { assert.equal(task.allowLockfileGeneration, true); command(cargo, ['generate-lockfile', '--offline', ...args], 180000); }
    const meta = JSON.parse(command(cargo, ['metadata', '--offline', '--locked', '--format-version', '1', ...args], 180000));
    const pkg = meta.packages.find((p) => p.name === task.packageName); assert(pkg && pkg.version === '0.1.0' && pkg.edition === '2024' && ['1.95', '1.95.0'].includes(pkg.rust_version)); assert.deepEqual(pkg.publish, []); assert(ctx.same(pkg.manifest_path, manifest));
    assert.equal(meta.workspace_members.length, 1); assert(meta.workspace_members.includes(pkg.id)); assert.equal(pkg.targets.length, 2);
    assert(pkg.targets.some((t) => t.name === task.crateName && t.kind.includes('lib'))); assert(pkg.targets.some((t) => t.name === task.testTarget && t.kind.includes('test')));
    const lib = pkg.targets.find((t) => t.name === task.crateName), test = pkg.targets.find((t) => t.name === task.testTarget);
    assert(ctx.same(lib.src_path, join(root, task.outputRoot, 'src/lib.rs'))); assert.deepEqual(lib.crate_types, ['lib']);
    assert(ctx.same(test.src_path, join(root, task.testFile))); assert.deepEqual(test.crate_types, ['bin']);
    assert(pkg.targets.every((t) => !t.kind.includes('custom-build'))); assert.equal(pkg.dependencies.length, 3);
    assert(pkg.dependencies.every((d) => d.kind === null && !d.optional && d.uses_default_features));
    for (const [name, req, features] of [['serde', '=1.0.229', ['derive']], ['serde_json', '=1.0.151', []]]) { const d = pkg.dependencies.find((d) => d.name === name); assert(d && d.req === req && !d.path && d.source === 'registry+https://github.com/rust-lang/crates.io-index'); assert.deepEqual(d.features, features); }
    const a = pkg.dependencies.find((d) => d.name === 'water-contracts'); assert(a && a.source === null && a.path && ctx.same(a.path, join(root, 'crates/water-contracts')));
    assert.deepEqual(meta.packages.filter((p) => p.source === null).map((p) => p.name).sort(), ['water-contracts', task.packageName].sort());
    const entries = (p) => readFileSync(p, 'utf8').split('[[package]]').map((b) => ({ name: /^name = "([^"]+)"/m.exec(b)?.[1], version: /^version = "([^"]+)"/m.exec(b)?.[1], source: /^source = "([^"]+)"/m.exec(b)?.[1], checksum: /^checksum = "([^"]+)"/m.exec(b)?.[1] }));
    const approved = entries(join(root, 'Cargo.lock')), own = entries(join(root, task.outputRoot, 'Cargo.lock'));
    for (const p of meta.packages.filter((p) => p.source !== null)) { const f = own.find((l) => l.name === p.name && l.version === p.version && l.source === p.source); assert(f && approved.some((l) => l.name === f.name && l.version === f.version && l.source === f.source && l.checksum === f.checksum)); }
    if (mode === 'fmt') command(cargo, ['fmt', ...args, '--', '--check'], 180000);
    if (mode === 'clippy') command(cargo, ['clippy', '--offline', '--locked', ...args, '-p', task.packageName, '--all-targets', '--', '-D', 'warnings'], 180000);
    if (mode === 'test') { record.productTestsRun = true; const result = command(cargo, ['test', '--offline', '--locked', ...args, '-p', task.packageName, '--test', task.testTarget, '--', '--test-threads=1', '--format', 'pretty'], 180000); assert.deepEqual([...result.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map((m) => m[1]).sort(), [...task.expectedTests].sort()); assert(/5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out/.test(result)); record.executedTests = 5; }
    if (mode === 'bridge') {
      record.productTestsRun = true; command(cargo, ['build', '--offline', '--locked', ...args, '-p', task.packageName, '--lib'], 180000);
      if (task.id === 'WATER-W1-G') eBuild();
      const names = [task.crateName, 'water_contracts', 'serde_json', ...(task.id === 'WATER-W1-G' ? ['water_report_view'] : [])], binary = join(output, stamp + '-bridge.exe');
      command(rustc, ['--edition=2024', '--crate-name', 'parallel_next_bridge', join(root, task.bridgeSource), '-L', 'dependency=' + join(target, 'debug/deps'), ...externs(names), '-o', binary], 180000);
      const bridgeResult = JSON.parse(command(binary, [])), definitions = JSON.parse(readFileSync(join(root, task.caseFile), 'utf8')), cases = definitions.golden_cases, actual = bridgeResult.cases;
      assert.equal(bridgeResult.raw_rejections, definitions.raw_cases.length);
      if (task.id === 'WATER-W1-G') assert.equal(bridgeResult.mutation_rejections, definitions.mutation_cases.length);
      else assert.equal(bridgeResult.dto_rejections, 6);
      assert.equal(actual.length, cases.length);
      const views = task.id === 'WATER-W1-G' ? JSON.parse(readFileSync(join(root, 'contracts/scan-report-v1/expected-views.json'), 'utf8')) : null;
      for (let i = 0; i < actual.length; i++) { assert.equal(actual[i].id, cases[i].id); if (views) { assert.deepEqual(actual[i].bundle, cases[i].expected_bundle); assert.deepEqual(actual[i].view, views[i].view); } else assert.deepEqual(actual[i].summary, cases[i].expected); }
      record.bridge = { status: 'passed', actualPublicEntry: true, cases: actual.length, rawRejections: bridgeResult.raw_rejections, constructedRejections: bridgeResult.mutation_rejections ?? bridgeResult.dto_rejections, actualEProjection: task.id === 'WATER-W1-G', actualFScanner: false, filesystemScanned: false };
    }
  }
} catch (err) { fault = err; }
ctx.finish(fault);
