import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setup } from './parallel-next-common.mjs';
const ctx = setup(['WATER-W1-I'], ['baseline', 'check', 'test', 'browser']);
const { root, task, mode, command, record } = ctx;
let fault;
try {
  if (mode === 'baseline') {
    const reports = JSON.parse(readFileSync(join(root, 'contracts/report-reader-v1/reports.json'), 'utf8'));
    assert.equal(reports.fixture_version, 'water.reader-fixtures.v1'); assert.equal(reports.reports.length, 4);
    command(process.execPath, ['scripts/acceptance/reader-browser-probe.mjs'], 60000);
    record.assets = { reports: 4, actualEProjectionProvenByController: true, newProductTested: false, browserBlankPageOnly: true };
  } else if (mode === 'check') {
    for (const p of task.syntaxFiles) command(process.execPath, ['--check', p]);
  } else {
    record.productTestsRun = true;
    const result = command(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', mode === 'test' ? task.testFile : task.browserTestFile], mode === 'browser' ? 120000 : 30000);
    const names = mode === 'test' ? task.expectedTests : task.expectedBrowserTests;
    assert.deepEqual([...result.matchAll(/^# Subtest: (.+)$/gm)].map((m) => m[1].replace(/\r$/, '')).sort(), [...names].sort());
    for (const [key, value] of [['tests', names.length], ['pass', names.length], ['fail', 0], ['cancelled', 0], ['skipped', 0], ['todo', 0]]) assert(new RegExp('^# ' + key + ' ' + value + '\\r?$', 'm').test(result));
    record.executedTests = names.length;
    if (mode === 'browser') {
      const folder = ctx.output; record.screenshots = [];
      for (const name of ['reader-1440x1000.png', 'reader-900x800.png', 'reader-detail.png']) {
        const source = join(root, '.local/browser-lab', name); assert(existsSync(source), 'Missing actual screenshot ' + name);
        assert(statSync(source).mtimeMs >= Date.parse(record.startedAt) - 1000, 'Stale screenshot ' + name);
        const archived = `${ctx.stamp}-${name}`; writeFileSync(join(folder, archived), readFileSync(source), { flag: 'wx' }); record.screenshots.push(archived);
      }
    }
  }
} catch (err) { fault = err; }
ctx.finish(fault);
