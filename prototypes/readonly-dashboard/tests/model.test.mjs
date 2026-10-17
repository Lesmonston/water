import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectFindings, formatBytes, summarize } from '../model.mjs';

const demo = JSON.parse(readFileSync(new URL('../../../contracts/prototype-v1/demo-data.json', import.meta.url)));
const findings = demo.findings;
const ids = (rows) => rows.map((row) => row.id);
const select = (options = {}, rows = findings) => selectFindings(rows, {
  query: '', tool: 'all', category: 'all', risk: 'all', sort: 'size_desc', ...options,
});

test('prototype_bigint_order', () => {
  assert.deepEqual(ids(select({ sort: 'size_asc' })), [
    'agent-history', 'uv-build', 'pip-wheels', 'hf-qwen', 'ollama-local', 'large-b', 'large-a', 'vector-data',
  ], 'ascending boundary B must precede A by one byte');
  assert.deepEqual(ids(select()), [
    'large-a', 'large-b', 'ollama-local', 'hf-qwen', 'pip-wheels', 'uv-build', 'agent-history', 'vector-data',
  ]);
  const ties = [
    { ...findings[0], id: 'first', title: 'a', logical_bytes: '2' },
    { ...findings[0], id: 'null', title: '0', logical_bytes: null },
    { ...findings[0], id: 'second', title: 'A', logical_bytes: '2' },
    { ...findings[0], id: 'zero', title: 'Z', logical_bytes: '0' },
  ];
  assert.deepEqual(ids(select({ sort: 'size_asc' }, ties)), ['zero', 'first', 'second', 'null']);
  assert.deepEqual(ids(select({ sort: 'size_desc' }, ties)), ['first', 'second', 'zero', 'null']);
  assert.deepEqual(ids(select({ sort: 'name_asc' }, ties)), ['first', 'second', 'zero', 'null']);
  const named = select({ sort: 'name_asc' });
  assert.equal(named.at(-1).id, 'vector-data');
  for (let i = 1; i < named.length - 1; i++) {
    assert(named[i - 1].title.toLowerCase() <= named[i].title.toLowerCase());
  }
});

test('prototype_filters', () => {
  for (const tool of ['all', ...new Set(findings.map((row) => row.tool_id))]) {
    for (const category of ['all', ...new Set(findings.map((row) => row.category))]) {
      for (const risk of ['all', 'review', 'protected']) {
        for (const query of ['', 'DEMO-PROJECT', '模型', 'not-found']) {
          const expected = findings.filter((row) =>
            (tool === 'all' || row.tool_id === tool) &&
            (category === 'all' || row.category === category) &&
            (risk === 'all' || row.risk === risk) &&
            [row.title, row.relative_path].some((text) => text.toLowerCase().includes(query.toLowerCase())));
          assert.deepEqual(ids(select({ tool, category, risk, query })).sort(), ids(expected).sort(),
            JSON.stringify({ tool, category, risk, query }));
        }
      }
    }
  }
  const literal = [{ ...findings[0], title: '<img src=x> [Cache].*', relative_path: 'demo/a+b' }];
  for (const query of ['[', '.*', '<IMG', 'a+b']) assert.equal(select({ query }, literal).length, 1);
  assert.equal(select({ query: '^.*$' }, literal).length, 0, 'search input is a literal substring');
  assert.equal(select({ tool: 'PIP' }).length, 0, 'filters use exact values');
  assert.equal(select({ query: '   ' }).length, 0, 'query whitespace is literal');
});

test('prototype_format_and_unknown', () => {
  for (const [value, expected] of [
    [null, '未知'], ['0', '0 B'], ['1', '1 B'], ['1023', '1023 B'], ['1024', '1 KiB'],
    ['1536', '1.5 KiB'], ['1126', '1 KiB'], ['1127', '1.1 KiB'], ['1048576', '1 MiB'],
    ['4294967296', '4 GiB'], ['1099511627776', '1 TiB'], ['9007199254740993', '8 PiB'],
    ['1152921504606846976', '1 EiB'], ['1729382256910270464', '1.5 EiB'],
    ['11529215046068469760000', '10000 EiB'],
  ]) assert.equal(formatBytes(value), expected, `format ${value} with decimal truncation`);
});

test('prototype_no_mutation', () => {
  const mutable = structuredClone(findings);
  const before = structuredClone(mutable);
  const result = select({ sort: 'size_asc' }, mutable);
  assert.deepEqual(mutable, before, 'selectFindings must not sort or mutate input');
  assert.notEqual(result, mutable, 'always return a new array');
  const freeze = (value) => {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  const frozen = freeze(structuredClone(findings));
  for (const sort of ['size_asc', 'size_desc', 'name_asc']) select({ query: '', sort }, frozen);
  summarize(frozen);
  assert.deepEqual(frozen, findings);
  assert.notEqual(selectFindings([], {}), selectFindings([], {}));
});

test('prototype_no_false_reclaim', () => {
  assert.deepEqual(summarize(findings), {
    count: 8, protected_count: 6, unknown_size_count: 1,
    logical_total_bytes: null, reclaimable_bytes: null,
  }, 'potentially overlapping findings must not produce total or reclaimable bytes');
  assert.deepEqual(summarize([]), {
    count: 0, protected_count: 0, unknown_size_count: 0,
    logical_total_bytes: null, reclaimable_bytes: null,
  });
  assert.equal(summarize([findings[0], findings[0]]).logical_total_bytes, null);
  assert.equal(summarize([findings[0], findings[0]]).reclaimable_bytes, null);
});
