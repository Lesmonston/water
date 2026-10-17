// Controller-only, intentional freeze update. Never a worker implementation step.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const path of ['contracts/v1/scan-report.schema.json', 'contracts/v1/examples/valid-report.json', 'contracts/v1/conformance-cases.json']) {
  const target = join(root, path);
  writeFileSync(target, `${JSON.stringify(JSON.parse(readFileSync(target, 'utf8')), null, 2)}\n`);
}
const paths = [
  'contracts/v1/README.md', 'contracts/v1/SEMANTICS.md',
  'contracts/v1/scan-report.schema.json', 'contracts/v1/examples/valid-report.json',
  'contracts/v1/conformance-cases.json', 'scripts/worker-check.mjs',
  'scripts/verify-contract-assets.mjs', 'docs/decisions/ADR-002-wave1-contract-bootstrap.md',
  'docs/dispatch/W1-WORKER-RULES.md',
];
const files = paths.map((path) => ({ path, sha256: createHash('sha256').update(readFileSync(join(root, path))).digest('hex') }));
writeFileSync(join(root, 'contracts/v1/freeze.lock.json'), `${JSON.stringify({ schemaVersion: 1, contract: 'water.scan.v1', frozenOn: '2026-10-17', owner: 'controller', hashBasis: 'UTF-8 working-tree bytes; all frozen paths have LF attributes', files }, null, 2)}\n`);
console.log(`Frozen ${files.length} controller-owned files.`);
