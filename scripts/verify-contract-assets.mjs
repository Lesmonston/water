// Controller acceptance tooling: checks frozen inputs, not Rust implementation behavior.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'contracts/v1');
const load = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
const schema = load('scan-report.schema.json');
const suite = load('conformance-cases.json');
const base = load(suite.base);
assert.equal(schema.$id, 'urn:water:scan:v1');
assert.equal(suite.contract, 'water.scan.v1');

function shape(value, rule, path = '') {
  if (rule.$ref) {
    const name = rule.$ref.replace('#/$defs/', '');
    assert(schema.$defs[name], `Unknown schema ref ${rule.$ref}`);
    const result = shape(value, schema.$defs[name], path);
    // u64 range is an explicitly documented primitive semantic beyond JSON Schema.
    if (name === 'ByteCount' && result.length === 0 && BigInt(value) > 18446744073709551615n) return [`${path}: u64 overflow`];
    return result;
  }
  if (rule.anyOf) return rule.anyOf.some((item) => shape(value, item, path).length === 0) ? [] : [`${path}: no union match`];
  if ('const' in rule && value !== rule.const) return [`${path}: const`];
  if (rule.enum && !rule.enum.includes(value)) return [`${path}: enum`];
  if (rule.type === 'null') return value === null ? [] : [`${path}: null`];
  if (rule.type === 'boolean') return typeof value === 'boolean' ? [] : [`${path}: boolean`];
  if (rule.type === 'integer') return Number.isInteger(value) && value >= rule.minimum && value <= rule.maximum ? [] : [`${path}: integer range`];
  if (rule.type === 'string') {
    if (typeof value !== 'string') return [`${path}: string`];
    const length = [...value].length;
    if (length < (rule.minLength ?? 0) || length > (rule.maxLength ?? Infinity)) return [`${path}: text length`];
    return rule.pattern && !new RegExp(rule.pattern, 'u').test(value) ? [`${path}: pattern`] : [];
  }
  if (rule.type === 'array') {
    if (!Array.isArray(value)) return [`${path}: array`];
    if (value.length < (rule.minItems ?? 0) || value.length > (rule.maxItems ?? Infinity)) return [`${path}: item count`];
    return value.flatMap((entry, index) => shape(entry, rule.items, `${path}/${index}`));
  }
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${path}: object`];
    const missing = rule.required.filter((key) => !Object.hasOwn(value, key));
    if (missing.length) return [`${path}: missing ${missing.join(',')}`];
    if (rule.additionalProperties === false && Object.keys(value).some((key) => !Object.hasOwn(rule.properties, key))) return [`${path}: unknown field`];
    return Object.entries(rule.properties).flatMap(([key, item]) => shape(value[key], item, `${path}/${key}`));
  }
  throw new Error(`Unsupported controller schema rule at ${path}`);
}

function patched(operations) {
  const value = structuredClone(base);
  for (const operation of operations) {
    assert(['add', 'replace', 'remove'].includes(operation.op));
    const parts = operation.path.split('/').slice(1).map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
    assert(parts.length && !parts.some((part) => ['__proto__', 'constructor', 'prototype'].includes(part)));
    let parent = value;
    for (const key of parts.slice(0, -1)) { assert(Object.hasOwn(parent, key)); parent = parent[key]; }
    const key = parts.at(-1);
    if (operation.op === 'replace') { assert(Object.hasOwn(parent, key)); parent[key] = structuredClone(operation.value); }
    else if (operation.op === 'remove') { assert(Object.hasOwn(parent, key)); if (Array.isArray(parent)) parent.splice(Number(key), 1); else delete parent[key]; }
    else if (Array.isArray(parent)) parent.splice(key === '-' ? parent.length : Number(key), 0, structuredClone(operation.value));
    else parent[key] = structuredClone(operation.value);
  }
  return value;
}

assert.deepEqual(shape(base, schema), [], 'Base report must satisfy the structural contract');
const ids = new Set();
let good = 0;
let badShape = 0;
let semanticOnly = 0;
const outcomes = new Set(['ok', 'InvalidShape', 'DuplicateId', 'UnknownScope', 'InconsistentReport', 'InvalidSize', 'UnsafeClassification']);
for (const test of suite.cases) {
  assert(!ids.has(test.id), `Duplicate case ${test.id}`); ids.add(test.id);
  assert(outcomes.has(test.expected));
  const errors = shape(patched(test.operations), schema);
  if (test.expected === 'InvalidShape') { assert(errors.length > 0, `Expected structural rejection: ${test.id}`); badShape++; }
  else { assert.deepEqual(errors, [], `Case ${test.id} must reach semantic validation`); if (test.expected === 'ok') good++; else semanticOnly++; }
}
for (const [kind, name] of [['byte_count', 'ByteCount'], ['opaque_id', 'OpaqueId'], ['relative_path', 'RelativePath']]) {
  for (const value of suite.primitiveCases[kind].valid) assert.deepEqual(shape(value, { $ref: `#/$defs/${name}` }), [], `${kind}: expected valid`);
  for (const value of suite.primitiveCases[kind].invalid) assert(shape(value, { $ref: `#/$defs/${name}` }).length > 0, `${kind}: expected invalid`);
}
for (const test of suite.rawJsonCases) {
  let parsed;
  try { parsed = JSON.parse(test.input); } catch { assert.equal(test.expected, 'InvalidJson'); continue; }
  assert.equal(test.expected, 'InvalidShape');
  // JSON.parse also erases duplicate object keys: the Rust raw-input rejection remains unverified here.
  assert(test.reason === 'duplicate-object-key' || shape(parsed, schema).length > 0);
}
assert.equal(suite.constructedCases.length, 6);
assert.equal(suite.resourceCases.length, 2);
console.log(JSON.stringify({ status: 'passed', reportCases: suite.cases.length, positiveInputs: good, structuralRejections: badShape, semanticInputsPrepared: semanticOnly, rawJsonCases: suite.rawJsonCases.length, constructedCases: suite.constructedCases.length, resourceCasesPrepared: suite.resourceCases.length, productTestsRun: false, boundary: 'Validates controller assets and primitive structure/u64 range. Cross-report semantics and all Rust entry points remain the worker and controller acceptance target.' }, null, 2));
