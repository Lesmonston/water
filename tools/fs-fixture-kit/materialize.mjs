import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, symlink, writeFile, link } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const worktree = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const localDir = join(worktree, '.local');
const labDir = join(localDir, 'fixture-lab');
const casesFile = join(worktree, 'contracts', 'fixture-lab-v1', 'cases.json');
const markerName = '.water-fixture-run.json';
const version = 'water.fixture.v1';
const caseIds = ['project-markers', 'mixed-assets', 'scope-prefix', 'overlapping-scopes', 'unicode-spaces', 'hardlink-pair', 'directory-links', 'depth-budget', 'entry-budget', 'permission-plan', 'cancel-plan'];
const caseFields = ['case_id', 'description', 'nodes', 'scopes', 'canaries', 'scanner_plan'];
const nodeFields = ['kind', 'path', 'content', 'target'];
const scopeFields = ['scope_id', 'path'];
const planFields = ['max_depth', 'max_entries', 'cancel_after_entries', 'faults', 'expected_issue_codes'];
const faultFields = ['operation', 'path', 'code'];
const kinds = new Set(['directory', 'file', 'hardlink', 'symlink_dir', 'junction_dir']);
const issueCodes = new Set(['depth_limit', 'entry_limit', 'permission_denied', 'cancelled']);
const unsupportedCodes = new Set(['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP']);

export class FixtureError extends Error {
  constructor(code, field) {
    super(code);
    this.name = 'FixtureError';
    this.code = code;
    this.field = field;
  }
}

function push(errors, code, path) {
  if (!errors.some((item) => item.code === code && item.path === path)) errors.push({ code, path });
}

function childPath(pointer, key) {
  return pointer === '/' ? `/${key}` : `${pointer}/${key}`;
}

function isDataObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isSafeRelative(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  const chars = [...value];
  if (chars.length > 512) return false;
  for (const char of chars) {
    const code = char.codePointAt(0);
    if (code <= 0x1f || code === 0x7f || char === '\\' || char === ':') return false;
  }
  if (value.startsWith('/') || value.endsWith('/')) return false;
  return value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..');
}

function isScopeId(value) {
  if (typeof value !== 'string') return false;
  const chars = [...value];
  if (chars.length < 1 || chars.length > 48) return false;
  if (!/^[a-z]$/.test(chars[0])) return false;
  return chars.slice(1).every((char) => /^[a-z0-9-]$/.test(char));
}

function isRunId(value) {
  if (typeof value !== 'string' || !value.startsWith('run-')) return false;
  const chars = [...value.slice(4)];
  if (chars.length < 1 || chars.length > 48) return false;
  if (!/^[a-z0-9]$/.test(chars[0])) return false;
  return chars.slice(1).every((char) => /^[a-z0-9-]$/.test(char));
}

function readDataObject(value, pointer, fields, errors) {
  if (!isDataObject(value)) {
    push(errors, 'shape', pointer);
    return null;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  let blocked = false;
  for (const key of keys) {
    if (typeof key !== 'string') {
      push(errors, 'shape', pointer);
      blocked = true;
      continue;
    }
    const desc = descriptors[key];
    if (desc.get || desc.set) {
      blocked = true;
      push(errors, 'shape', fields.includes(key) ? childPath(pointer, key) : pointer);
    } else if (!fields.includes(key)) {
      blocked = true;
      push(errors, 'shape', pointer);
    }
  }
  for (const field of fields) {
    const desc = descriptors[field];
    if (!desc || desc.get || desc.set) push(errors, 'shape', childPath(pointer, field));
  }
  if (blocked || fields.some((field) => !descriptors[field] || descriptors[field].get || descriptors[field].set)) return null;
  const out = {};
  for (const field of fields) out[field] = descriptors[field].value;
  return out;
}

function canonicalIndex(key, length) {
  if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)) return false;
  const value = Number(key);
  if (!Number.isInteger(value) || String(value) !== key) return false;
  return value >= 0 && value < 4294967295 && value < length;
}

function readArray(value, pointer, errors) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    push(errors, 'shape', pointer);
    return null;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  const lengthDesc = descriptors.length;
  const length = lengthDesc && !lengthDesc.get && !lengthDesc.set && typeof lengthDesc.value === 'number' && Number.isInteger(lengthDesc.value) && lengthDesc.value >= 0
    ? lengthDesc.value
    : null;
  let blocked = false;
  for (const key of keys) {
    if (typeof key !== 'string') {
      push(errors, 'shape', pointer);
      blocked = true;
      continue;
    }
    if (key === 'length') {
      if (descriptors[key].get || descriptors[key].set) {
        push(errors, 'shape', pointer);
        blocked = true;
      }
      continue;
    }
    if (length === null || !canonicalIndex(key, length)) {
      push(errors, 'shape', pointer);
      blocked = true;
      continue;
    }
    if (descriptors[key].get || descriptors[key].set) {
      push(errors, 'shape', childPath(pointer, key));
      blocked = true;
    }
  }
  if (length === null) {
    push(errors, 'shape', pointer);
    return null;
  }
  if (blocked) return null;
  const items = [];
  for (let index = 0; index < lengthDesc.value; index += 1) {
    const desc = descriptors[String(index)];
    if (!desc || desc.get || desc.set) {
      push(errors, 'shape', childPath(pointer, String(index)));
      items.push(undefined);
    } else items.push(desc.value);
  }
  return items;
}

function integerRange(value, min, max, pointer, errors) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    push(errors, 'shape', pointer);
    return;
  }
  if (value < min || value > max) push(errors, 'limit', pointer);
}

function validateCase(entry, index, errors) {
  const base = `/cases/${index}`;
  const data = readDataObject(entry, base, caseFields, errors);
  if (!data) return;
  if (typeof data.case_id !== 'string' || data.case_id !== caseIds[index]) push(errors, 'shape', `${base}/case_id`);
  if (typeof data.description !== 'string' || data.description.length === 0) push(errors, 'shape', `${base}/description`);
  const nodes = readArray(data.nodes, `${base}/nodes`, errors);
  const stored = [];
  let bytes = 0;
  if (nodes && nodes.length === 0) push(errors, 'shape', `${base}/nodes`);
  if (nodes && nodes.length > 64) push(errors, 'limit', `${base}/nodes`);
  if (nodes) {
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const nodeBase = `${base}/nodes/${nodeIndex}`;
      const node = readDataObject(nodes[nodeIndex], nodeBase, nodeFields, errors);
      if (!node) {
        stored.push(null);
        continue;
      }
      const knownKind = typeof node.kind === 'string' && kinds.has(node.kind);
      if (!knownKind) push(errors, 'shape', `${nodeBase}/kind`);
      const pathOk = typeof node.path === 'string' && isSafeRelative(node.path) && node.path !== markerName;
      if (!pathOk) push(errors, 'unsafe_path', `${nodeBase}/path`);
      if (knownKind && node.kind === 'directory') {
        if (node.content !== null) push(errors, 'shape', `${nodeBase}/content`);
        if (node.target !== null) push(errors, 'shape', `${nodeBase}/target`);
      } else if (knownKind && node.kind === 'file') {
        if (typeof node.content !== 'string') push(errors, 'shape', `${nodeBase}/content`);
        else bytes += Buffer.byteLength(node.content);
        if (node.target !== null) push(errors, 'shape', `${nodeBase}/target`);
      } else if (knownKind) {
        if (node.content !== null) push(errors, 'shape', `${nodeBase}/content`);
        if (typeof node.target !== 'string') push(errors, 'shape', `${nodeBase}/target`);
        else if (!isSafeRelative(node.target)) push(errors, 'unsafe_path', `${nodeBase}/target`);
      }
      stored.push({ index: nodeIndex, base: nodeBase, kind: node.kind, path: node.path, target: node.target, pathOk, knownKind });
    }
    if (bytes > 65536) push(errors, 'limit', `${base}/nodes`);
  }
  const first = new Map();
  for (const node of stored) {
    if (!node || !node.pathOk) continue;
    if (first.has(node.path)) push(errors, 'reference', `${node.base}/path`);
    else first.set(node.path, node);
  }
  for (const node of stored) {
    if (!node || !node.pathOk) continue;
    const slash = node.path.lastIndexOf('/');
    if (slash > 0) {
      const parent = first.get(node.path.slice(0, slash));
      if (!parent || parent.kind !== 'directory') push(errors, 'reference', `${node.base}/path`);
    }
    for (const other of stored) {
      if (!other || other.index === node.index || !other.pathOk || !other.knownKind) continue;
      if (other.kind !== 'hardlink' && other.kind !== 'symlink_dir' && other.kind !== 'junction_dir') continue;
      if (node.path.startsWith(`${other.path}/`)) {
        push(errors, 'reference', `${node.base}/path`);
        break;
      }
    }
    if (!node.knownKind || node.kind === 'directory' || node.kind === 'file') continue;
    if (typeof node.target !== 'string' || !isSafeRelative(node.target)) continue;
    const target = first.get(node.target);
    if (node.kind === 'hardlink') {
      if (!target || target.kind !== 'file') push(errors, 'reference', `${node.base}/target`);
    } else if (!target || target.kind !== 'directory') push(errors, 'reference', `${node.base}/target`);
  }
  const scopes = readArray(data.scopes, `${base}/scopes`, errors);
  if (scopes && scopes.length === 0) push(errors, 'shape', `${base}/scopes`);
  const scopeIds = new Set();
  if (scopes) {
    for (let scopeIndex = 0; scopeIndex < scopes.length; scopeIndex += 1) {
      const scopeBase = `${base}/scopes/${scopeIndex}`;
      const scope = readDataObject(scopes[scopeIndex], scopeBase, scopeFields, errors);
      if (!scope) continue;
      if (!isScopeId(scope.scope_id)) push(errors, 'shape', `${scopeBase}/scope_id`);
      else if (scopeIds.has(scope.scope_id)) push(errors, 'reference', `${scopeBase}/scope_id`);
      else scopeIds.add(scope.scope_id);
      if (typeof scope.path !== 'string' || !isSafeRelative(scope.path)) push(errors, typeof scope.path === 'string' ? 'unsafe_path' : 'shape', `${scopeBase}/path`);
      else {
        const target = first.get(scope.path);
        if (!target || target.kind !== 'directory') push(errors, 'reference', `${scopeBase}/path`);
      }
    }
  }
  const canaries = readArray(data.canaries, `${base}/canaries`, errors);
  const seenCanaries = new Set();
  if (canaries) {
    for (let canaryIndex = 0; canaryIndex < canaries.length; canaryIndex += 1) {
      const canary = canaries[canaryIndex];
      const canaryBase = `${base}/canaries/${canaryIndex}`;
      if (typeof canary !== 'string') push(errors, 'shape', canaryBase);
      else if (!isSafeRelative(canary)) push(errors, 'unsafe_path', canaryBase);
      else if (seenCanaries.has(canary)) push(errors, 'reference', canaryBase);
      else {
        seenCanaries.add(canary);
        const target = first.get(canary);
        if (!target || target.kind !== 'file') push(errors, 'reference', canaryBase);
      }
    }
  }
  const plan = readDataObject(data.scanner_plan, `${base}/scanner_plan`, planFields, errors);
  if (!plan) return;
  const planBase = `${base}/scanner_plan`;
  integerRange(plan.max_depth, 0, 64, `${planBase}/max_depth`, errors);
  integerRange(plan.max_entries, 1, 10000, `${planBase}/max_entries`, errors);
  if (plan.cancel_after_entries !== null) integerRange(plan.cancel_after_entries, 0, 10000, `${planBase}/cancel_after_entries`, errors);
  const faults = readArray(plan.faults, `${planBase}/faults`, errors);
  if (faults) {
    for (let faultIndex = 0; faultIndex < faults.length; faultIndex += 1) {
      const faultBase = `${planBase}/faults/${faultIndex}`;
      const fault = readDataObject(faults[faultIndex], faultBase, faultFields, errors);
      if (!fault) continue;
      if (fault.operation !== 'read_dir') push(errors, 'shape', `${faultBase}/operation`);
      if (fault.code !== 'permission_denied') push(errors, 'shape', `${faultBase}/code`);
      if (typeof fault.path !== 'string' || !isSafeRelative(fault.path)) push(errors, typeof fault.path === 'string' ? 'unsafe_path' : 'shape', `${faultBase}/path`);
      else {
        const target = first.get(fault.path);
        if (!target || target.kind !== 'directory') push(errors, 'reference', `${faultBase}/path`);
      }
    }
  }
  const codes = readArray(plan.expected_issue_codes, `${planBase}/expected_issue_codes`, errors);
  const seenCodes = new Set();
  if (!codes) return;
  for (let codeIndex = 0; codeIndex < codes.length; codeIndex += 1) {
    const code = codes[codeIndex];
    const codeBase = `${planBase}/expected_issue_codes/${codeIndex}`;
    if (typeof code !== 'string' || !issueCodes.has(code)) push(errors, 'shape', codeBase);
    else if (seenCodes.has(code)) push(errors, 'reference', codeBase);
    else seenCodes.add(code);
  }
}

export function validateFixtureManifest(value) {
  const errors = [];
  const root = readDataObject(value, '/', ['fixture_version', 'cases'], errors);
  if (!root) return { valid: false, errors };
  if (root.fixture_version !== version) push(errors, 'shape', '/fixture_version');
  const cases = readArray(root.cases, '/cases', errors);
  if (!cases) return { valid: false, errors };
  if (cases.length > 16) push(errors, 'limit', '/cases');
  if (cases.length !== caseIds.length) push(errors, 'shape', '/cases');
  for (let index = 0; index < cases.length; index += 1) validateCase(cases[index], index, errors);
  return { valid: errors.length === 0, errors };
}

function acceptRunId(options) {
  if (options === undefined) return `run-${randomUUID()}`;
  if (!isDataObject(options)) throw new FixtureError('invalid_run_id', '/options');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  const keys = Reflect.ownKeys(options);
  for (const key of keys) {
    if (typeof key !== 'string' || descriptors[key].get || descriptors[key].set) throw new FixtureError('invalid_run_id', '/options');
  }
  if (keys.length === 0) return `run-${randomUUID()}`;
  if (keys.length !== 1 || keys[0] !== 'run_id') throw new FixtureError('invalid_run_id', '/options');
  if (!isRunId(descriptors.run_id.value)) throw new FixtureError('invalid_run_id', '/options/run_id');
  return descriptors.run_id.value;
}

async function loadManifest() {
  let text;
  try {
    text = await readFile(casesFile, 'utf8');
  } catch {
    throw new FixtureError('invalid_manifest', '/');
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new FixtureError('invalid_manifest', '/');
  }
  const checked = validateFixtureManifest(value);
  if (!checked.valid) throw new FixtureError('invalid_manifest', checked.errors[0] ? checked.errors[0].path : '/');
  return value;
}

async function assertInsideWorktree(dir) {
  let info;
  try {
    info = await lstat(dir);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') throw new FixtureError('io_error', '/run_root');
    try {
      await mkdir(dir);
    } catch {
      throw new FixtureError('io_error', '/run_root');
    }
    info = await lstat(dir);
  }
  if (!info.isDirectory() || info.isSymbolicLink()) throw new FixtureError('unsafe_root', '/run_root');
  const rootReal = await realpath(worktree);
  const dirReal = await realpath(dir);
  const rel = relative(rootReal, dirReal);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw new FixtureError('unsafe_root', '/run_root');
  return dirReal;
}

function locate(runReal, relPath) {
  const abs = resolve(runReal, ...String(relPath).split('/'));
  const rel = relative(runReal, abs);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw new FixtureError('unsafe_root', '/run_root');
  return abs;
}

async function assertOrdinaryParent(runReal, abs) {
  const info = await lstat(dirname(abs));
  if (!info.isDirectory() || info.isSymbolicLink()) throw new FixtureError('io_error', '/nodes');
  const parentReal = await realpath(dirname(abs));
  const rel = relative(runReal, parentReal);
  if (rel.startsWith('..') || isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw new FixtureError('unsafe_root', '/run_root');
}

async function createRun(runId) {
  await assertInsideWorktree(localDir);
  const labReal = await assertInsideWorktree(labDir);
  const candidate = resolve(labReal, runId);
  const rel = relative(labReal, candidate);
  if (rel !== runId || rel.includes('/') || rel.includes('\\')) throw new FixtureError('unsafe_root', '/run_root');
  let exists = false;
  try {
    await lstat(candidate);
    exists = true;
  } catch (error) {
    if (!error || error.code !== 'ENOENT') throw new FixtureError('io_error', '/run_root');
  }
  if (exists) throw new FixtureError('collision', '/run_id');
  try {
    await mkdir(candidate);
  } catch (error) {
    if (error && error.code === 'EEXIST') throw new FixtureError('collision', '/run_id');
    throw new FixtureError('io_error', '/run_root');
  }
  const runReal = await realpath(candidate);
  if (relative(labReal, runReal) !== runId) throw new FixtureError('unsafe_root', '/run_root');
  return runReal;
}

async function createLink(runReal, node) {
  const abs = locate(runReal, node.path);
  const target = locate(runReal, node.target);
  await assertOrdinaryParent(runReal, abs);
  if (node.kind === 'junction_dir' && process.platform !== 'win32') return { status: 'unsupported', error_code: 'PLATFORM_UNSUPPORTED' };
  try {
    if (node.kind === 'hardlink') await link(target, abs);
    else if (node.kind === 'junction_dir') await symlink(target, abs, 'junction');
    else await symlink(target, abs, 'dir');
    return { status: 'created', error_code: null };
  } catch (error) {
    if (error instanceof FixtureError) throw error;
    if (unsupportedCodes.has(error.code)) return { status: 'unsupported', error_code: error.code };
    throw new FixtureError('io_error', '/nodes');
  }
}

async function writeRun(item, runId) {
  const runReal = await createRun(runId);
  const statuses = new Map();
  const directories = [];
  for (const node of item.nodes) if (node.kind === 'directory') directories.push(node);
  directories.sort((left, right) => left.path.split('/').length - right.path.split('/').length);
  for (const node of directories) {
    const abs = locate(runReal, node.path);
    await assertOrdinaryParent(runReal, abs);
    try {
      await mkdir(abs);
    } catch (error) {
      if (error instanceof FixtureError) throw error;
      throw new FixtureError('io_error', '/nodes');
    }
    statuses.set(node.path, { status: 'created', error_code: null });
  }
  for (const node of item.nodes) {
    if (node.kind !== 'file') continue;
    const abs = locate(runReal, node.path);
    await assertOrdinaryParent(runReal, abs);
    try {
      await writeFile(abs, node.content, { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
      if (error instanceof FixtureError) throw error;
      throw new FixtureError('io_error', '/nodes');
    }
    statuses.set(node.path, { status: 'created', error_code: null });
  }
  for (const node of item.nodes) {
    if (node.kind !== 'hardlink' && node.kind !== 'symlink_dir' && node.kind !== 'junction_dir') continue;
    statuses.set(node.path, await createLink(runReal, node));
  }
  const nodes = [];
  for (const node of item.nodes) {
    const got = statuses.get(node.path);
    if (!got) throw new FixtureError('io_error', '/nodes');
    nodes.push({ path: node.path, kind: node.kind, status: got.status, error_code: got.error_code });
  }
  const scopes = [];
  for (const scope of item.scopes) {
    scopes.push({ scope_id: scope.scope_id, path: scope.path, absolute_path: locate(runReal, scope.path) });
  }
  const canaries = [];
  for (const canaryPath of item.canaries) {
    const bytes = await readFile(locate(runReal, canaryPath));
    canaries.push({ path: canaryPath, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const scanner_plan = structuredClone(item.scanner_plan);
  const result = {
    fixture_version: version,
    case_id: item.case_id,
    run_id: runId,
    run_root: runReal,
    status: nodes.some((node) => node.status === 'unsupported') ? 'partial' : 'complete',
    scopes,
    nodes,
    canaries,
    scanner_plan,
    scanner_executed: false,
  };
  try {
    await writeFile(join(runReal, markerName), `${JSON.stringify(result)}\n`, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error instanceof FixtureError) throw error;
    throw new FixtureError('io_error', '/nodes');
  }
  return result;
}

export async function materializeCase(caseId, options) {
  if (typeof caseId !== 'string') throw new FixtureError('invalid_case', '/case_id');
  const runId = acceptRunId(options);
  const manifest = await loadManifest();
  let item = null;
  for (const entry of manifest.cases) if (entry.case_id === caseId) item = entry;
  if (!item) throw new FixtureError('invalid_case', '/case_id');
  return writeRun(item, runId);
}
