// Required capability privacy evidence. Compile metadata only, using the final bridge graph.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const evidence = 'docs/acceptance/wave1/p/';
const receipt = '.local/checks/WATER-W1-P/2026-10-18T10-29-29.120Z-43240-bridge-result.json';
const bridge = JSON.parse(readFileSync(receipt, 'utf8'));
assert(bridge.finalGate && bridge.mode === 'bridge' && bridge.status === 'passed');
const rustc = bridge.commands.find(c => c.binary.endsWith('rustc.exe')).binary;
const artifacts = bridge.cargoGraphs[0];
const deps = dirname(artifacts.find(a => a.crate === 'water_contracts').filename);
const tmp = resolve('.local/next-tmp');
const env = { ...process.env };
for (const key of Object.keys(env)) if (/^(?:CARGO_|RUST|WATER_)/i.test(key)) delete env[key];
Object.assign(env, { RUSTUP_AUTO_INSTALL: '0', TEMP: tmp, TMP: tmp, TMPDIR: tmp });
const hash = b => createHash('sha256').update(b).digest('hex');
const results = [];

function probe(name, body, expectedDiagnostic) {
  const source = '#![forbid(unsafe_code)]\nuse water_scope_registry::v1::*;\n' + body + '\n';
  const sourcePath = evidence + name + '.txt';
  writeFileSync(sourcePath, source, { flag: 'wx' });
  const argv = ['-', '--edition=2024', '--crate-name', name, '--crate-type', 'lib',
    '--emit=metadata', '--error-format=json', '-L', 'dependency=' + deps,
    ...artifacts.flatMap(a => ['--extern', a.crate + '=' + a.filename]),
    '-o', join(tmp, name + '.rmeta')];
  const r = spawnSync(rustc, argv, {
    input: source, env, encoding: 'utf8', windowsHide: true, shell: false,
    timeout: 180000, maxBuffer: 8 * 1024 * 1024,
  });
  const log = evidence + name + '.log';
  writeFileSync(log, JSON.stringify({ binary: rustc, argv, exitCode: r.status, error: r.error?.code ?? null })
    + '\n--- stdout ---\n' + (r.stdout ?? '') + '\n--- stderr ---\n' + (r.stderr ?? ''), { flag: 'wx' });
  assert(!r.error);
  const diagnostics = (r.stderr ?? '').split('\n').filter(Boolean).map(line => JSON.parse(line));
  if (expectedDiagnostic) {
    assert.equal(r.status, 1);
    assert(diagnostics.some(d => d.level === 'error' && expectedDiagnostic.test(JSON.stringify(d))));
    assert(!/E046[03]|E0514|couldn't read/.test(r.stderr));
  } else {
    assert.equal(r.status, 0, r.stderr);
  }
  results.push({ name, expectedCompileRejection: Boolean(expectedDiagnostic), exitCode: r.status,
    source: sourcePath, sourceSha256: hash(Buffer.from(source)), log,
    errors: diagnostics.filter(d => d.level === 'error').map(d => ({ code: d.code?.code ?? null, message: d.message })) });
}

probe('privacy_positive', `pub fn check(r: &Registry, p: &PendingSelection, s: &RegisteredScope, permit: &ScanPermit) {
    let _ = Registry::new(1);
    let _ = (r.len(), r.is_empty(), p.scope_id(), s.scope_id(), permit.scope_id());
    let _ = serde_json::to_string(&1u64);
    let _ = serde_json::from_str::<u64>("1");
}`, null);

for (const type of ['Registry', 'PendingSelection', 'RegisteredScope', 'ScanPermit']) {
  const prefix = 'privacy_' + type.toLowerCase();
  probe(prefix + '_clone', `fn bound<T: Clone>() {} pub fn check() { bound::<${type}>(); }`, /E0277/);
  probe(prefix + '_debug', `fn bound<T: std::fmt::Debug>() {} pub fn check() { bound::<${type}>(); }`, /E0277/);
  probe(prefix + '_default', `pub fn check() { let _: ${type} = Default::default(); }`, /E0277/);
  probe(prefix + '_serialize', `pub fn check(value: ${type}) { let _ = serde_json::to_string(&value); }`, /E0277/);
  probe(prefix + '_deserialize', `pub fn check() { let _ = serde_json::from_str::<${type}>("{}"); }`, /E0277/);
  probe(prefix + '_constructor', `pub fn check() { let _ = ${type} {}; }`, /private/);
  const field = type === 'Registry' ? 'owner' : 'binding';
  probe(prefix + '_field', `pub fn check(value: ${type}) { let _ = value.${field}; }`, /E0616/);
}
probe('privacy_scanpermit_attempt', 'pub fn check(value: ScanPermit) { let _ = value.attempt; }', /E0616/);

const report = {
  testedCommit: bridge.before.head, finalBridgeReceipt: receipt,
  productionHash: bridge.sourceState.productionHash, testHash: bridge.sourceState.testHash,
  rustc, positiveControls: 1, expectedRejections: 29, results,
};
assert.equal(results.length, 30);
writeFileSync(evidence + 'PRIVACY-COMPILE.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ testedCommit: report.testedCommit, positiveControls: 1, expectedRejections: 29, passed: true }));
