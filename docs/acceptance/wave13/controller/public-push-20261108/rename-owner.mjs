// 11-08: the GitHub account dfan0519-tech was renamed Lesmonston. Replace the old owner in sources and current docs.
// Each edit states how many times its old text must occur; run from the repo root.
import {readFileSync, writeFileSync} from 'node:fs';

const OLD = 'https://github.com/dfan0519-tech/flick', NEW = 'https://github.com/Lesmonston/flick';
const EDITS = {
  'apps/water/host/src/commands.rs': [[OLD, NEW, 1]],
  'apps/water/host/tests/host_v1.rs': [[OLD, NEW, 1]],
  'contracts/w12-v1/W12.md': [[OLD, NEW, 1]],
  'packaging/public/root/.github/ISSUE_TEMPLATE/config.yml': [[OLD, NEW, 1]],
  'packaging/public/root/README.md': [[OLD, NEW, 1]],
  'packaging/public/root/README.en.md': [[OLD, NEW, 1]],
  'packaging/windows/flick.nsi': [[OLD, NEW, 1]],
  'scripts/release/export-public.mjs': [['(dfan0519-tech/flick)', '(Lesmonston/flick)', 1]],
  '.github/workflows/ci.yml': [
    ['# Runs only in the public repository (dfan0519-tech/flick); in the private working repository every job is skipped.\n',
     '# Runs only in public repositories (Lesmonston/flick and its forks); in the private working repository every job is\n'
     + '# skipped. The condition reads the repository\'s visibility, not its owner, so an account rename does not turn CI off.\n', 1],
    ["    if: github.repository == 'dfan0519-tech/flick'\n", '    if: ${{ !github.event.repository.private }}\n', 3],
  ],
  'AGENTS.md': [['dfan0519-tech/water', 'Lesmonston/water', 1]],
  'README.md': [['dfan0519-tech/water', 'Lesmonston/water', 1]],
  'docs/PROJECT-CHARTER.md': [['dfan0519-tech/water', 'Lesmonston/water', 1]],
};
for (const [path, edits] of Object.entries(EDITS)) {
  const raw = readFileSync(path), crlf = raw.includes('\r\n');
  let text = raw.toString('utf8').replaceAll('\r\n', '\n');
  for (const [from, to, n] of edits) {
    const found = text.split(from).length - 1;
    if (found !== n) throw Error(`${path}: expected ${n} of ${JSON.stringify(from.slice(0, 60))}, found ${found}`);
    text = text.replaceAll(from, to);
  }
  writeFileSync(path, crlf ? text.replaceAll('\n', '\r\n') : text);
  console.log('edited', path);
}
