// Controller-only intentional freeze update; does not alter the A contract lock.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = ['contracts/catalog-v1/SPEC.md', 'contracts/catalog-v1/entry.schema.json',
  'contracts/catalog-v1/source-policy.json', 'contracts/prototype-v1/SPEC.md',
  'contracts/prototype-v1/demo-data.json', 'docs/decisions/ADR-003-independent-parallel-lanes.md',
  'docs/dispatch/PARALLEL-WORKER-RULES.md', 'scripts/parallel-check.mjs', 'scripts/browser-lab.mjs'];
mkdirSync(join(root, 'contracts/parallel-v1'), { recursive: true });
const files = paths.map((path) => ({ path, sha256: createHash('sha256').update(readFileSync(join(root, path))).digest('hex') }));
writeFileSync(join(root, 'contracts/parallel-v1/freeze.lock.json'), JSON.stringify({ schemaVersion: 1, contract: 'water.parallel.v1', frozenOn: '2026-10-17', owner: 'controller', files }, null, 2) + '\n');
console.log(`Frozen ${files.length} B/C files; A freeze unchanged.`);
