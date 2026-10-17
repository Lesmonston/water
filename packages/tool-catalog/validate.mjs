const VERSION = 'water.catalog.v1';
const TOOLS = ['pip', 'uv', 'npm', 'pnpm', 'huggingface', 'ollama'];
// Frozen source-policy.json mirrored as constants so this module performs no file reads.
const HOSTS = {
  pip: 'pip.pypa.io', uv: 'docs.astral.sh', npm: 'docs.npmjs.com',
  pnpm: 'pnpm.io', huggingface: 'huggingface.co', ollama: 'docs.ollama.com',
};
const VARIABLES = {
  pip: ['LOCALAPPDATA', 'PIP_CACHE_DIR', 'XDG_CACHE_HOME'],
  uv: ['LOCALAPPDATA', 'UV_CACHE_DIR', 'XDG_CACHE_HOME'],
  npm: ['LOCALAPPDATA', 'npm_config_cache', 'NPM_CONFIG_CACHE'],
  pnpm: ['LOCALAPPDATA', 'PNPM_HOME', 'XDG_DATA_HOME'],
  huggingface: ['HF_HOME', 'HF_HUB_CACHE', 'XDG_CACHE_HOME'],
  ollama: ['USERPROFILE', 'OLLAMA_MODELS'],
};
const UNSAFE_KEYS = new Set(['command', 'shell', 'delete_glob', 'auto_clean', 'executable']);
const text = { type: 'string' };
const date = { type: 'date' };
const fixed = (literal, code) => ({ type: 'literal', literal, code });
const enumeration = (...values) => ({ type: 'enum', values });
const list = (item, min = 1) => ({ type: 'array', item, min });
const object = (fields, code = 'shape') => ({ type: 'object', fields, code });
const refs = list(text);
const root = object({
  source: enumeration('native_query', 'environment', 'configuration', 'default_hint'),
  key: text, path_template: { type: 'template' },
  purpose: enumeration('download_cache', 'build_cache', 'shared_store', 'model_store', 'mixed_state'),
  evidence_confidence: enumeration('documented', 'version_sensitive', 'unknown'),
  version_note: text, source_ids: refs,
});
const platform = object({
  root_candidates: list(root),
  protected_subpaths: list(object({ path_hint: text, reason: text, source_ids: refs }), 0),
  notes: list(text),
});
const entryShape = object({
  catalog_version: fixed(VERSION, 'version'), tool_id: enumeration(...TOOLS), name: text,
  reviewed_on: date, runtime_verified: fixed(false, 'unsafe_capability'),
  platforms: object({ windows: platform, macos: platform }, 'platforms'),
  assets: list(object({
    kind: enumeration('cache', 'environment', 'model', 'credential', 'configuration', 'history', 'database', 'unknown'),
    description: text, default_action: fixed('display_only', 'unsafe_capability'), risk_note: text, source_ids: refs,
  })),
  sources: list(object({ id: text, url: text, supports: list(text), verified_on: date }), 2),
  constraints: object({
    discovery_only: fixed(true, 'unsafe_capability'),
    can_scan: fixed(false, 'unsafe_capability'),
    can_delete: fixed(false, 'unsafe_capability'),
  }),
});
const indexShape = object({ catalog_version: fixed(VERSION, 'version'), tools: list(text) });
const own = (obj, key) => Object.hasOwn(obj, key);
const plain = (value) => value !== null && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?![\s\S])/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= lengths[month - 1];
}

function pathHint(value, tool) {
  if (value === null) return true;
  // A deliberately small display grammar. No expansion, substitution, globs, URLs or commands.
  if (typeof value !== 'string' || !/^(?:~|%[A-Za-z_][A-Za-z_0-9]*%|\$[A-Za-z_][A-Za-z_0-9]*)(?:[\\/][\p{L}\p{N}_. -]+)*(?![\s\S])/u.test(value)) return false;
  if (value.split(/[\\/]/).some((part) => part === '.' || part === '..')) return false;
  const variable = /^(?:%([^%]+)%|\$([^/\\]+))/.exec(value);
  return !variable || VARIABLES[tool]?.includes(variable[1] ?? variable[2]);
}

/** Pure validation of supplied JSON-shaped values; error paths contain only fixed field names/indices. */
export function validateCatalog(index, entries) {
  const errors = [];
  const fail = (code, path) => errors.push({ code, path });

  function walk(value, schema, path, tool) {
    if (schema.type === 'object') {
      if (!plain(value)) { fail(schema.code, path); return; }
      const descriptors = Object.getOwnPropertyDescriptors(value);
      for (const key of Reflect.ownKeys(descriptors)) {
        // Do not echo unknown input keys, URLs, values or filesystem hints into errors.
        if (!own(schema.fields, key)) fail(UNSAFE_KEYS.has(key) ? 'unsafe_capability' : schema.code, path);
      }
      for (const [key, child] of Object.entries(schema.fields)) {
        if (!own(descriptors, key)) fail(schema.code, path + '/' + key);
        else if (!own(descriptors[key], 'value') || !descriptors[key].enumerable) fail('shape', path + '/' + key);
        else walk(descriptors[key].value, child, path + '/' + key, tool);
      }
    } else if (schema.type === 'array') {
      // Reject custom/null prototypes before semantic checks can observe inherited behavior.
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) { fail('shape', path); return; }
      if (value.length < schema.min) fail('shape', path);
      const descriptors = Object.getOwnPropertyDescriptors(value);
      for (const key of Reflect.ownKeys(descriptors)) {
        if (key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) fail('shape', path);
      }
      for (let i = 0; i < value.length; i++) {
        const descriptor = descriptors[i];
        if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) fail('shape', path + '/' + i);
        else walk(descriptor.value, schema.item, path + '/' + i, tool);
      }
    } else if (schema.type === 'literal') {
      if (value !== schema.literal) fail(schema.code, path);
    } else if (schema.type === 'enum') {
      if (!schema.values.includes(value)) fail('shape', path);
    } else if (schema.type === 'date') {
      if (!calendarDate(value)) fail('shape', path);
    } else if (schema.type === 'template') {
      if (!pathHint(value, tool)) fail('unsafe_capability', path);
    } else if (typeof value !== 'string' || value.trim().length === 0) fail('shape', path);
  }

  walk(index, indexShape, '/index');
  if (!plain(entries)) fail('shape', '/entries');
  else {
    const descriptors = Object.getOwnPropertyDescriptors(entries);
    if (Reflect.ownKeys(descriptors).some((key) => !TOOLS.includes(key))) fail('tool_set', '/entries');
    for (const tool of TOOLS) {
      if (!own(descriptors, tool)) fail('tool_set', '/entries/' + tool);
      else if (!own(descriptors[tool], 'value') || !descriptors[tool].enumerable) fail('shape', '/entries/' + tool);
      else walk(descriptors[tool].value, entryShape, '/entries/' + tool, tool);
    }
  }
  // Cross-field semantics only run after JSON structure is safe to read.
  if (errors.length) return { valid: false, errors };
  if (index.tools.length !== TOOLS.length || index.tools.some((tool, i) => tool !== TOOLS[i])) fail('tool_set', '/index/tools');

  for (const tool of TOOLS) {
    const entry = entries[tool], path = '/entries/' + tool;
    if (entry.tool_id !== tool) fail('tool_set', path + '/tool_id');
    const ids = new Set(), pages = new Set();
    entry.sources.forEach((source, i) => {
      if (ids.has(source.id)) fail('source_ref', path + '/sources/' + i + '/id');
      ids.add(source.id);
      try {
        const url = new URL(source.url);
        if (url.protocol !== 'https:' || url.username || url.password || url.hostname !== HOSTS[tool]) {
          fail('source_ref', path + '/sources/' + i + '/url');
        } else {
          // Fragments and query strings cannot manufacture a second documentation page.
          pages.add(url.origin + url.pathname);
        }
      } catch { fail('source_ref', path + '/sources/' + i + '/url'); }
    });
    if (pages.size < 2) fail('source_ref', path + '/sources');
    function sourceRefs(item, itemPath) {
      const seen = new Set();
      item.source_ids.forEach((id, i) => {
        if (!ids.has(id) || seen.has(id)) fail('source_ref', itemPath + '/source_ids/' + i);
        seen.add(id);
      });
    }
    for (const name of ['windows', 'macos']) {
      for (const field of ['root_candidates', 'protected_subpaths'])
        entry.platforms[name][field].forEach((item, i) => sourceRefs(item, path + '/platforms/' + name + '/' + field + '/' + i));
    }
    entry.assets.forEach((item, i) => sourceRefs(item, path + '/assets/' + i));
  }
  return { valid: errors.length === 0, errors };
}
