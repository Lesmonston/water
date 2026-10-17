// Water-owned tooling. Reads Git metadata; never executes upstream project code.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specs = [
  { id: 'jharu', repository: 'https://github.com/riponcm/Jharu', license: 'Apache-2.0', review: 'research/reviews/JHARU.md' },
  { id: 'dev-machine-cleaner', repository: 'https://github.com/Maks417/DevMachineCleaner', license: 'MIT', review: 'research/reviews/DEV-MACHINE-CLEANER.md' },
  { id: 'mole', repository: 'https://github.com/tw93/Mole', license: 'GPL-3.0', review: 'research/reviews/MOLE.md' },
  { id: 'kondo', repository: 'https://github.com/tbillington/kondo', license: 'MIT', review: 'research/reviews/KONDO-AND-NPKILL.md' },
  { id: 'npkill', repository: 'https://github.com/voidcosmos/npkill', license: 'MIT', review: 'research/reviews/KONDO-AND-NPKILL.md' },
];
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
function git(cwd, args, binary = false) {
  return execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', cwd, ...args], {
    env, encoding: binary ? undefined : 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const upstreams = specs.map((spec) => {
  const path = `research/upstream/${spec.id}`;
  const cwd = resolve(root, path);
  // Read the configured URL, before any machine-wide transport/proxy rewrite.
  const origin = git(cwd, ['config', '--get', 'remote.origin.url']).trim();
  if (origin !== `${spec.repository}.git`) throw new Error(`Unexpected origin for ${spec.id}`);
  const status = git(cwd, ['status', '--porcelain', '--untracked-files=all']).trim();
  if (status) throw new Error(`Refusing to record dirty checkout: ${spec.id}`);
  const commit = git(cwd, ['rev-parse', 'HEAD']).trim();
  const licenseBytes = git(cwd, ['show', `${commit}:LICENSE`], true);
  return {
    ...spec, path, origin, originBasis: 'remote.origin.url before transport rewrites', commit,
    commitDate: git(cwd, ['show', '-s', '--format=%cI', 'HEAD']).trim(),
    commitSubject: git(cwd, ['show', '-s', '--format=%s', 'HEAD']).trim(),
    licensePath: 'LICENSE',
    licenseBlob: git(cwd, ['rev-parse', `${commit}:LICENSE`]).trim(),
    licenseSha256: createHash('sha256').update(licenseBytes).digest('hex'),
    licenseHashBasis: 'Git blob bytes, before working-tree line-ending conversion',
    usage: 'static-research-only',
    runtimeVerified: false,
  };
});
const manifest = {
  schemaVersion: 1,
  project: 'water',
  recordedAt: new Date().toISOString(),
  cloneMode: 'depth=1; no tags; no submodules; no upstream scripts executed',
  productCodeReused: false,
  note: 'License labels summarize the reviewed root LICENSE, not a dependency or redistribution clearance.',
  upstreams,
};
writeFileSync(resolve(root, 'research/upstreams.lock.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Recorded ${upstreams.length} clean upstream snapshots.`);
