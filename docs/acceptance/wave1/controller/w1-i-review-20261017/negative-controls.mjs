import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = 'F:/new/smaltalk/water/.worktrees/i';
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const cases = [
  {
    name: 'number-sort',
    file: 'prototypes/report-reader/model.mjs',
    from: '    const left = BigInt(a.logical_bytes);\n    const right = BigInt(b.logical_bytes);',
    to: '    const left = Number(a.logical_bytes);\n    const right = Number(b.logical_bytes);',
    needles: ['2^53', 'reader_bigint_filters', 'reader_live_interactions'],
  },
  {
    name: 'source-total-sum-or-zero',
    file: 'prototypes/report-reader/model.mjs',
    from: `  let protectedCount = 0;
  let unknownSizeCount = 0;
  for (const finding of view.findings) {
    if (finding.risk === 'protected') protectedCount += 1;
    if (finding.logical_bytes === null) unknownSizeCount += 1;
  }
  return {
    count: view.findings.length,
    protected_count: protectedCount,
    unknown_size_count: unknownSizeCount,
    source_totals: {
      logical_bytes: view.totals.logical_bytes,`,
    to: `  let protectedCount = 0;
  let summed = 0n;
  for (const finding of view.findings) {
    if (finding.risk === 'protected') protectedCount += 1;
    summed += finding.logical_bytes === null ? 0n : BigInt(finding.logical_bytes);
  }
  return {
    count: view.findings.length,
    protected_count: protectedCount,
    unknown_size_count: 0,
    source_totals: {
      logical_bytes: view.totals.logical_bytes === null || summed > 18446744073709551615n ? '0' : summed.toString(),`,
    needles: ['37', 'unknown_size_count', 'reader_totals_and_unknown', 'reader_live_interactions'],
  },
  {
    name: 'inner-html',
    file: 'prototypes/report-reader/app.mjs',
    from: '  if (content !== undefined) result.textContent = content;',
    to: '  if (content !== undefined) result.innerHTML = content;',
    needles: ['img', 'script', 'reader_live_interactions', 'reader_scope_layout_and_readonly'],
  },
];

function runSuite() {
  const specs = [
    ['model', 'prototypes/report-reader/tests/model.test.mjs', 30000],
    ['browser', 'prototypes/report-reader/tests/browser.test.mjs', 120000],
  ];
  return specs.map(([name, file, timeout]) => {
    const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', file], {
      cwd: root, encoding: 'utf8', timeout,
    });
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    const failed = [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map((match) => match[1].replace(/\r$/, ''));
    const messages = output.split(/\r?\n/).filter((line) => /AssertionError|2\^53|来源|37|img element|script element|ERR_|timed out|not ok/.test(line)).slice(0, 40);
    return { name, status: result.status, error: result.error?.code ?? null, failed, messages };
  });
}

const report = [];
for (const item of cases) {
  const path = join(root, item.file);
  const original = readFileSync(path);
  const before = sha(original);
  if (!original.toString('utf8').includes(item.from)) throw new Error(`Pattern missing for ${item.name}`);
  let restored = false;
  try {
    const badText = original.toString('utf8').replace(item.from, item.to);
    if (badText === original.toString('utf8')) throw new Error(`Replace failed for ${item.name}`);
    writeFileSync(path, badText);
    const during = sha(readFileSync(path));
    const red = runSuite();
    const redText = JSON.stringify(red);
    if (!item.needles.some((needle) => redText.includes(needle))) throw new Error(`Target assertion not observed for ${item.name}`);
    if (red.every((entry) => entry.status === 0)) throw new Error(`Expected red tests for ${item.name}`);
    writeFileSync(path, original);
    restored = true;
    const after = sha(readFileSync(path));
    if (after !== before) throw new Error(`Hash mismatch after restore for ${item.name}`);
    const green = runSuite();
    if (green.some((entry) => entry.status !== 0)) throw new Error(`Restore was not green for ${item.name}: ${JSON.stringify(green)}`);
    report.push({ name: item.name, file: item.file, before, during, after, red, green: green.map((entry) => entry.status) });
  } finally {
    if (!restored) writeFileSync(path, original);
  }
}
writeFileSync(join(root, '.local/checks/WATER-W1-I/negative-controls.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map((item) => ({
  name: item.name,
  hashes: [item.before, item.during, item.after],
  restored: item.before === item.after,
  red: item.red.map((entry) => ({ name: entry.name, status: entry.status, error: entry.error, failed: entry.failed })),
  green: item.green,
})), null, 2));
