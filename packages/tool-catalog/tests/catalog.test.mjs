import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { validateCatalog } from '../validate.mjs';

const tools = ['pip', 'uv', 'npm', 'pnpm', 'huggingface', 'ollama'];
const readJSON = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const index = readJSON('../index.json');
const entries = Object.fromEntries(tools.map((id) => [id, readJSON('../entries/' + id + '.json')]));
const clone = () => structuredClone({ index, entries });
function rejects(change, code, path, label) {
  const data = clone();
  change(data);
  const result = validateCatalog(data.index, data.entries);
  assert.equal(result.valid, false, label + ': invalid input must be rejected');
  assert(result.errors.some((error) => error.code === code && error.path === path),
    label + ': expected ' + code + ' at ' + path + ', got ' + JSON.stringify(result.errors));
  for (const error of result.errors) {
    assert.deepEqual(Object.keys(error).sort(), ['code', 'path']);
    assert(['shape', 'version', 'tool_set', 'platforms', 'source_ref', 'unsafe_capability'].includes(error.code));
  }
}

test('catalog_shape_and_tools', () => {
  assert.deepEqual(index, { catalog_version: 'water.catalog.v1', tools });
  assert.deepEqual(Object.keys(entries), tools);
  for (const id of tools) assert.equal(entries[id].tool_id, id);
  assert.deepEqual(validateCatalog(index, entries), { valid: true, errors: [] });
  rejects((d) => { delete d.entries.uv; }, 'tool_set', '/entries/uv', 'missing tool');
  rejects((d) => { d.index.tools.reverse(); }, 'tool_set', '/index/tools', 'fixed tool order');
  rejects((d) => { d.entries.pip.tool_id = 'uv'; }, 'tool_set', '/entries/pip/tool_id', 'filename identity');
});

test('catalog_platforms_and_sources', () => {
  const policy = readJSON('../../../contracts/catalog-v1/source-policy.json');
  for (const id of tools) {
    const entry = entries[id];
    assert.deepEqual(Object.keys(entry.platforms).sort(), ['macos', 'windows']);
    const pages = new Set(entry.sources.map((source) => {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.username + url.password, '');
      assert(policy.official_hosts[id].includes(url.hostname));
      return url.origin + url.pathname;
    }));
    assert(pages.size >= 2);
    const ids = new Set(entry.sources.map((source) => source.id));
    for (const platform of Object.values(entry.platforms)) {
      for (const item of [...platform.root_candidates, ...platform.protected_subpaths])
        for (const ref of item.source_ids) assert(ids.has(ref));
    }
    for (const asset of entry.assets) for (const ref of asset.source_ids) assert(ids.has(ref));
    const badURLs = ['https://' + policy.official_hosts[id][0] + '.evil.invalid/page',
      'https://evil-' + policy.official_hosts[id][0] + '/page',
      'http://' + policy.official_hosts[id][0] + '/page',
      'https://user:password@' + policy.official_hosts[id][0] + '/page',
      'not a URL'];
    for (const url of badURLs) rejects((d) => { d.entries[id].sources[0].url = url; },
      'source_ref', '/entries/' + id + '/sources/0/url', id + ' exact official source');
  }
  for (const [label, url] of [['fragment', entries.pip.sources[0].url + '#other'],
    ['query', entries.pip.sources[0].url + '?other=1']]) {
    rejects((d) => { d.entries.pip.sources = d.entries.pip.sources.slice(0, 2);
      d.entries.pip.sources[1].url = url; }, 'source_ref', '/entries/pip/sources', label + ' is not a second page');
  }
});

test('catalog_protection_boundaries', () => {
  for (const id of tools) {
    assert.equal(entries[id].runtime_verified, false);
    assert.deepEqual(entries[id].constraints, { discovery_only: true, can_scan: false, can_delete: false });
    for (const asset of entries[id].assets) assert.equal(asset.default_action, 'display_only');
    rejects((d) => { d.entries[id].runtime_verified = true; }, 'unsafe_capability', '/entries/' + id + '/runtime_verified', id + ' runtime claim');
    for (const [field, value] of [['can_scan', true], ['can_delete', true], ['discovery_only', false]])
      rejects((d) => { d.entries[id].constraints[field] = value; }, 'unsafe_capability',
        '/entries/' + id + '/constraints/' + field, id + ' ' + field);
  }
  for (const platform of ['windows', 'macos']) {
    const hf = entries.huggingface.platforms[platform];
    assert(hf.root_candidates.some((r) => r.key === 'HF_HOME' && r.purpose === 'mixed_state'));
    assert.match(JSON.stringify(hf.protected_subpaths), /token/);
    assert.match(JSON.stringify(hf.notes), /revision|commit/);
    assert.match(JSON.stringify(hf.notes), /共享/);
    assert.match(JSON.stringify(entries.pip.platforms[platform].notes), /非稳定接口/);
    assert.match(JSON.stringify(entries.uv.platforms[platform].notes), /禁止直接修改/);
    assert.match(JSON.stringify(entries.uv.platforms[platform].notes), /集中项目环境/);
    assert.match(JSON.stringify(entries.pnpm.platforms[platform].notes), /跨项目共享/);
    assert.match(JSON.stringify(entries.pnpm.platforms[platform].notes), /v11\/v12/);
    assert.match(JSON.stringify(entries.ollama.platforms[platform].protected_subpaths), /唯一资产/);
  }
  assert(entries.huggingface.assets.some((a) => a.kind === 'model'));
  assert(entries.ollama.assets.some((a) => a.kind === 'model'));
  rejects((d) => { d.entries.uv.assets[0].default_action = 'delete'; }, 'unsafe_capability', '/entries/uv/assets/0/default_action', 'asset action');
});

test('catalog_mutation_rejections', (t) => {
  const cases = [
    ['missing_platform', (d) => { delete d.entries.pip.platforms.macos; }, 'platforms', '/entries/pip/platforms/macos'],
    ['missing_tool', (d) => { delete d.entries.uv; }, 'tool_set', '/entries/uv'],
    ['duplicate_tool', (d) => { d.index.tools[1] = 'pip'; }, 'tool_set', '/index/tools'],
    ['index_version', (d) => { d.index.catalog_version = 'wrong'; }, 'version', '/index/catalog_version'],
    ['entry_version', (d) => { d.entries.pip.catalog_version = 'wrong'; }, 'version', '/entries/pip/catalog_version'],
    ['unknown_field', (d) => { d.entries.pip.extra = 'private-value'; }, 'shape', '/entries/pip'],
    ['missing_explicit_null', (d) => { delete d.entries.pip.platforms.windows.root_candidates[0].path_template; }, 'shape', '/entries/pip/platforms/windows/root_candidates/0/path_template'],
    ['dangling_source', (d) => { d.entries.pip.assets[0].source_ids = ['missing']; }, 'source_ref', '/entries/pip/assets/0/source_ids/0'],
    ['duplicate_source_ref', (d) => { d.entries.pip.assets[0].source_ids = ['caching', 'caching']; }, 'source_ref', '/entries/pip/assets/0/source_ids/1'],
    ['duplicate_source_id', (d) => { d.entries.pip.sources[1].id = 'caching'; }, 'source_ref', '/entries/pip/sources/1/id'],
    ['runtime_claim', (d) => { d.entries.pip.runtime_verified = true; }, 'unsafe_capability', '/entries/pip/runtime_verified'],
    ['delete_capability', (d) => { d.entries.pip.constraints.can_delete = true; }, 'unsafe_capability', '/entries/pip/constraints/can_delete'],
    ['executable_field', (d) => { d.entries.pip.shell = 'do-not-execute'; }, 'unsafe_capability', '/entries/pip'],
    ['asset_action', (d) => { d.entries.pip.assets[0].default_action = 'delete'; }, 'unsafe_capability', '/entries/pip/assets/0/default_action'],
    ['empty_root_list', (d) => { d.entries.pip.platforms.windows.root_candidates = []; }, 'shape', '/entries/pip/platforms/windows/root_candidates'],
    ['bad_date', (d) => { d.entries.pip.reviewed_on = '2026-02-30'; }, 'shape', '/entries/pip/reviewed_on'],
    ['root_command', (d) => { d.entries.pip.platforms.windows.root_candidates[0].path_template = 'pip cache purge'; }, 'unsafe_capability', '/entries/pip/platforms/windows/root_candidates/0/path_template'],
    ['shell_substitution', (d) => { d.entries.pip.platforms.windows.root_candidates[0].path_template = '$(do-not-execute)'; }, 'unsafe_capability', '/entries/pip/platforms/windows/root_candidates/0/path_template'],
    ['undefined_variable', (d) => { d.entries.pip.platforms.windows.root_candidates[0].path_template = '$UNDEFINED/cache'; }, 'unsafe_capability', '/entries/pip/platforms/windows/root_candidates/0/path_template'],
    ['extra_platform', (d) => { d.entries.pip.platforms.linux = {}; }, 'platforms', '/entries/pip/platforms'],
    ['wrong_type', (d) => { d.entries.pip.assets = null; }, 'shape', '/entries/pip/assets'],
    ['missing_constraint', (d) => { delete d.entries.pip.constraints.can_scan; }, 'shape', '/entries/pip/constraints/can_scan'],
    ['no_sources', (d) => { d.entries.pip.sources = []; }, 'shape', '/entries/pip/sources'],
    ['prototype_object', (d) => { d.entries.pip = new Date(0); }, 'shape', '/entries/pip'],
  ];
  for (const [label, change, code, path] of cases) {
    rejects(change, code, path, label);
    t.diagnostic('mutation rejected: ' + label);
  }
  // Unknown/missing keys must be checked at every object boundary, not just the entry root.
  const objects = [
    [(d) => d.index, '/index', 'catalog_version'],
    [(d) => d.entries.pip, '/entries/pip', 'name'],
    [(d) => d.entries.pip.platforms.windows, '/entries/pip/platforms/windows', 'notes'],
    [(d) => d.entries.pip.platforms.windows.root_candidates[0], '/entries/pip/platforms/windows/root_candidates/0', 'key'],
    [(d) => d.entries.pip.platforms.windows.protected_subpaths[0], '/entries/pip/platforms/windows/protected_subpaths/0', 'reason'],
    [(d) => d.entries.pip.assets[0], '/entries/pip/assets/0', 'description'],
    [(d) => d.entries.pip.sources[0], '/entries/pip/sources/0', 'supports'],
    [(d) => d.entries.pip.constraints, '/entries/pip/constraints', 'can_scan'],
  ];
  for (const [get, path, field] of objects) {
    rejects((d) => { get(d)['sensitive/unknown-key'] = 'sensitive-value'; }, 'shape', path, 'unknown at ' + path);
    rejects((d) => { delete get(d)[field]; }, 'shape', path + '/' + field, 'missing at ' + path);
  }
  for (const key of ['command', 'shell', 'delete_glob', 'auto_clean', 'executable'])
    rejects((d) => { d.entries.uv.assets[0][key] = true; }, 'unsafe_capability', '/entries/uv/assets/0', key);
  for (const value of [null, [], 5, 'private-value']) {
    assert.equal(validateCatalog(value, entries).valid, false);
    assert.equal(validateCatalog(index, value).valid, false);
  }
  rejects((d) => { Object.defineProperty(d.entries.pip, 'name', { get() { throw new Error('getter must not run'); } }); },
    'shape', '/entries/pip/name', 'accessor not JSON data');
  const data = clone();
  data.entries.pip['private-field-name'] = 'private-field-value';
  const errors = JSON.stringify(validateCatalog(data.index, data.entries).errors);
  assert.doesNotMatch(errors, /private-field/);
});

test('catalog_purity', () => {
  const freeze = (value) => {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  const data = freeze(clone()), before = JSON.stringify(data);
  const first = validateCatalog(data.index, data.entries);
  for (let i = 0; i < 3; i++) assert.deepEqual(validateCatalog(data.index, data.entries), first);
  assert.deepEqual(first, { valid: true, errors: [] });
  assert.equal(JSON.stringify(data), before);
  const source = readFileSync(new URL('../validate.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|eval)\s*(?:\(|[{*'"])/);
  // Execute the same implementation in an isolated realm: no ambient Node, filesystem or network.
  // This test VM is not part of the validator or a product sandbox.
  const blocked = () => { throw new Error('ambient access forbidden'); };
  const sandbox = { URL };
  for (const name of ['process', 'fetch', 'WebSocket', 'XMLHttpRequest', 'require'])
    Object.defineProperty(sandbox, name, { get: blocked });
  const program = source.replace('export function validateCatalog', 'function validateCatalog') +
    '\nconst input = JSON.parse(' + JSON.stringify(before) + ');\n' +
    '(function freeze(v) { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } })(input);\n' +
    'const before = JSON.stringify(input);\n' +
    'const results = [validateCatalog(input.index, input.entries), validateCatalog(input.index, input.entries)];\n' +
    'if (JSON.stringify(input) !== before) throw new Error("mutation");\nJSON.stringify(results);';
  assert.deepEqual(JSON.parse(runInNewContext(program, sandbox, { timeout: 2000 })), [first, first]);
});
