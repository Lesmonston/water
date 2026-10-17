import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { FixtureError, materializeCase, validateFixtureManifest } from '../materialize.mjs';

const worktree = fileURLToPath(new URL('../../..', import.meta.url));
const manifestPath = fileURLToPath(new URL('../../../contracts/fixture-lab-v1/cases.json', import.meta.url));
const negativePath = fileURLToPath(new URL('../../../contracts/fixture-lab-v1/negative-cases.json', import.meta.url));
const materializePath = fileURLToPath(new URL('../materialize.mjs', import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const negatives = JSON.parse(readFileSync(negativePath, 'utf8'));
const caseIds = ['project-markers', 'mixed-assets', 'scope-prefix', 'overlapping-scopes', 'unicode-spaces', 'hardlink-pair', 'directory-links', 'depth-budget', 'entry-budget', 'permission-plan', 'cancel-plan'];
const linkErrors = new Set(['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP', 'PLATFORM_UNSUPPORTED']);
const createdRunIds = [];
let createdContentBytes = 0;

function samePath(left, right) {
  const a = resolve(left);
  const b = resolve(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function isRunId(value) {
  if (typeof value !== 'string' || !value.startsWith('run-')) return false;
  const chars = [...value.slice(4)];
  if (chars.length < 1 || chars.length > 48) return false;
  if (!/^[a-z0-9]$/.test(chars[0])) return false;
  return chars.slice(1).every((char) => /^[a-z0-9-]$/.test(char));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const key of Reflect.ownKeys(value)) {
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (desc && 'value' in desc) deepFreeze(desc.value);
  }
}

function decodePointer(path) {
  if (path === '') return [];
  assert.equal(path.startsWith('/'), true, path);
  return path.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function applyOperation(doc, operation) {
  const parts = decodePointer(operation.path);
  let parent = doc;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    parent = Array.isArray(parent) ? parent[Number(key)] : parent[key];
  }
  const key = parts[parts.length - 1];
  let value = operation.value;
  if (operation.value_generator) {
    assert.equal(operation.value_generator.kind, 'ascii_x', operation.path);
    value = 'x'.repeat(operation.value_generator.count);
  }
  if (operation.op === 'remove') {
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else delete parent[key];
    return;
  }
  if (Array.isArray(parent) && key === '-') parent.push(value);
  else if (Array.isArray(parent) && operation.op === 'add') parent.splice(Number(key), 0, value);
  else if (Array.isArray(parent)) parent[Number(key)] = value;
  else parent[key] = value;
}

function mutate(operations) {
  const copy = structuredClone(manifest);
  for (const operation of operations) applyOperation(copy, operation);
  deepFreeze(copy);
  return copy;
}

function assertErrorShape(result) {
  assert.ok(Array.isArray(result.errors));
  for (const error of result.errors) {
    assert.deepEqual(Object.keys(error).sort(), ['code', 'path']);
    assert.equal(typeof error.code, 'string');
    assert.equal(typeof error.path, 'string');
  }
}

function containsError(result, code, path) {
  return result.errors.some((error) => error.code === code && error.path === path);
}

function removeAt(pointer) {
  return mutate([{ op: 'remove', path: pointer }]);
}

function labListing() {
  const lab = join(worktree, '.local', 'fixture-lab');
  return existsSync(lab) ? readdirSync(lab).sort() : null;
}

function track(caseItem, result) {
  createdRunIds.push(result.run_id);
  for (const node of caseItem.nodes) {
    if (node.kind === 'file') createdContentBytes += Buffer.byteLength(node.content);
  }
  assert.ok(createdRunIds.length <= 24, `run budget ${createdRunIds.length}`);
  assert.ok(createdContentBytes <= 1024 * 1024, `content budget ${createdContentBytes}`);
}

function assertOwnedRun(result) {
  assert.equal(isAbsolute(result.run_root), true);
  assert.equal(isRunId(result.run_id), true, result.run_id);
  assert.ok(samePath(dirname(result.run_root), join(worktree, '.local', 'fixture-lab')), result.run_root);
  assert.equal(basename(result.run_root), result.run_id);
  const rel = relative(realpathSync(worktree), realpathSync(result.run_root));
  assert.equal(rel.startsWith('..') || isAbsolute(rel), false, rel);
}

function nodeAbs(runRoot, nodePath) {
  return join(runRoot, ...nodePath.split('/'));
}

function listTree(root) {
  const found = [];
  const walk = (dir, prefix) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const relPath = prefix ? `${prefix}/${name}` : name;
      found.push(relPath);
      const info = lstatSync(abs);
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) walk(abs, relPath);
    }
  };
  walk(root, '');
  return found.sort();
}

test('fixture_manifest_and_cases', async () => {
  const source = readFileSync(materializePath, 'utf8');
  assert.equal(source.includes('verify-fixture-assets'), false);
  assert.equal(source.includes('verifyFixtureAssets'), false);
  for (const token of ['child_process', 'chmod', 'unlink', 'rmdir', 'renameSync', 'rmSync', 'cpSync']) {
    assert.equal(source.includes(token), false, token);
  }

  const beforeImport = labListing();
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(materializePath).href)})`], {
    cwd: worktree,
    encoding: 'utf8',
  });
  assert.equal(imported.status, 0, imported.stderr);
  assert.deepEqual(labListing(), beforeImport);

  assert.deepEqual(manifest.cases.map((item) => item.case_id), caseIds);
  assert.equal(negatives.mutations.length, 18);
  const snapshot = structuredClone(manifest);
  const frozen = structuredClone(manifest);
  deepFreeze(frozen);
  const previousRoot = process.env.WATER_FIXTURE_ROOT;
  process.env.WATER_FIXTURE_ROOT = 'SENTINEL_SHOULD_NOT_BE_READ';
  let valid;
  try {
    valid = validateFixtureManifest(frozen);
  } finally {
    if (previousRoot === undefined) delete process.env.WATER_FIXTURE_ROOT;
    else process.env.WATER_FIXTURE_ROOT = previousRoot;
  }
  assert.equal(valid instanceof Promise, false);
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(frozen, snapshot);
  assert.deepEqual(manifest, snapshot);

  for (const item of negatives.mutations) {
    const result = validateFixtureManifest(mutate(item.operations));
    assert.equal(result.valid, false, item.id);
    assertErrorShape(result);
    assert.equal(containsError(result, item.expected.code, item.expected.path), true, `${item.id} ${JSON.stringify(result.errors)}`);
    const blob = JSON.stringify(result.errors);
    for (const operation of item.operations) {
      if (typeof operation.value === 'string') assert.equal(blob.includes(operation.value), false, item.id);
      if (operation.value_generator) assert.equal(blob.includes('x'.repeat(32)), false, item.id);
      if (operation.value && typeof operation.value === 'object') {
        assert.equal(blob.includes('NEVER_EXECUTE'), false, item.id);
      }
    }
  }

  const missing = [
    '/fixture_version', '/cases', '/cases/0/case_id', '/cases/0/description', '/cases/0/nodes', '/cases/0/scopes',
    '/cases/0/canaries', '/cases/0/scanner_plan', '/cases/0/nodes/0/kind', '/cases/0/nodes/0/path',
    '/cases/0/nodes/0/content', '/cases/0/nodes/0/target', '/cases/0/scopes/0/scope_id', '/cases/0/scopes/0/path',
    '/cases/0/scanner_plan/max_depth', '/cases/0/scanner_plan/max_entries', '/cases/0/scanner_plan/cancel_after_entries',
    '/cases/0/scanner_plan/faults', '/cases/0/scanner_plan/expected_issue_codes',
    '/cases/9/scanner_plan/faults/0/operation', '/cases/9/scanner_plan/faults/0/path', '/cases/9/scanner_plan/faults/0/code',
  ];
  for (const pointer of missing) {
    const result = validateFixtureManifest(removeAt(pointer));
    assert.equal(result.valid, false, pointer);
    assert.equal(containsError(result, 'shape', pointer), true, `${pointer} ${JSON.stringify(result.errors)}`);
  }

  const unknownAt = ['/', '/cases/0', '/cases/0/nodes/0', '/cases/0/scopes/0', '/cases/0/scanner_plan', '/cases/9/scanner_plan/faults/0'];
  for (const pointer of unknownAt) {
    const key = `LEAKED_UNKNOWN_${randomUUID()}`;
    const copy = structuredClone(manifest);
    const parts = pointer === '/' ? [] : decodePointer(pointer);
    let target = copy;
    for (const part of parts) target = Array.isArray(target) ? target[Number(part)] : target[part];
    target[key] = 'SENTINEL_UNKNOWN_VALUE';
    deepFreeze(copy);
    const result = validateFixtureManifest(copy);
    assert.equal(result.valid, false, pointer);
    assert.equal(containsError(result, 'shape', pointer), true, `${pointer} ${JSON.stringify(result.errors)}`);
    const blob = JSON.stringify(result.errors);
    assert.equal(blob.includes(key), false, pointer);
    assert.equal(blob.includes('SENTINEL_UNKNOWN_VALUE'), false, pointer);
  }

  const arrayPointers = ['/cases', '/cases/0/nodes', '/cases/0/scopes', '/cases/0/canaries', '/cases/0/scanner_plan/faults', '/cases/0/scanner_plan/expected_issue_codes'];
  const nonIndexKeys = ['4294967295', '9007199254740992', '999999999999999999999999999999'];
  for (const pointer of arrayPointers) {
    for (const key of nonIndexKeys) {
      const copy = structuredClone(manifest);
      let target = copy;
      for (const part of decodePointer(pointer)) target = Array.isArray(target) ? target[Number(part)] : target[part];
      const lengthBefore = target.length;
      Object.defineProperty(target, key, { value: 'CONTROLLER_UNKNOWN_ARRAY_DATA', enumerable: true, configurable: true });
      assert.equal(target.length, lengthBefore, `${pointer} ${key}`);
      deepFreeze(copy);
      const result = validateFixtureManifest(copy);
      assert.equal(result.valid, false, `${pointer} ${key}`);
      assertErrorShape(result);
      assert.equal(containsError(result, 'shape', pointer), true, `${pointer} ${key} ${JSON.stringify(result.errors)}`);
      const blob = JSON.stringify(result.errors);
      assert.equal(blob.includes(key), false, `${pointer} ${key}`);
      assert.equal(blob.includes('CONTROLLER_UNKNOWN_ARRAY_DATA'), false, pointer);
    }
  }

  let accessorHits = 0;
  const accessor = structuredClone(manifest);
  Object.defineProperty(accessor.cases[0], 'description', {
    get() { accessorHits += 1; return 'executed'; },
    enumerable: true,
  });
  const accessorResult = validateFixtureManifest(accessor);
  assert.equal(accessorHits, 0);
  assert.equal(accessorResult.valid, false);
  assert.equal(containsError(accessorResult, 'shape', '/cases/0/description'), true);

  let arrayHits = 0;
  const customArray = structuredClone(manifest);
  const proto = Object.create(Array.prototype);
  Object.defineProperty(proto, 'map', { value() { arrayHits += 1; return []; } });
  Object.setPrototypeOf(customArray.cases, proto);
  const arrayResult = validateFixtureManifest(customArray);
  assert.equal(arrayHits, 0);
  assert.equal(arrayResult.valid, false);
  assert.equal(containsError(arrayResult, 'shape', '/cases'), true);

  for (const value of [null, undefined, 0, 'water.fixture.v1', true, new Date(), new Map()]) {
    const result = validateFixtureManifest(value);
    assert.equal(result.valid, false);
    assert.equal(containsError(result, 'shape', '/'), true, String(value));
  }

  const newlineScope = structuredClone(manifest);
  newlineScope.cases[0].scopes[0].scope_id = 'scope-1\n';
  const newlineResult = validateFixtureManifest(newlineScope);
  assert.equal(containsError(newlineResult, 'shape', '/cases/0/scopes/0/scope_id'), true);

  const reserved = structuredClone(manifest);
  reserved.cases[0].nodes[0].path = '.water-fixture-run.json';
  assert.equal(containsError(validateFixtureManifest(reserved), 'unsafe_path', '/cases/0/nodes/0/path'), true);

  const slashed = structuredClone(manifest);
  slashed.cases[0].nodes[1].path = 'scope\\src';
  assert.equal(containsError(validateFixtureManifest(slashed), 'unsafe_path', '/cases/0/nodes/1/path'), true);

  const zeroEntries = structuredClone(manifest);
  zeroEntries.cases[0].scanner_plan.max_entries = 0;
  assert.equal(containsError(validateFixtureManifest(zeroEntries), 'limit', '/cases/0/scanner_plan/max_entries'), true);

  const emptyDescription = structuredClone(manifest);
  emptyDescription.cases[0].description = '';
  assert.equal(containsError(validateFixtureManifest(emptyDescription), 'shape', '/cases/0/description'), true);
});

test('fixture_materialization', async () => {
  const local = [];
  for (const item of manifest.cases) {
    const result = await materializeCase(item.case_id);
    assert.equal(result.scanner_executed, false, item.case_id);
    assert.deepEqual(Object.keys(result), ['fixture_version', 'case_id', 'run_id', 'run_root', 'status', 'scopes', 'nodes', 'canaries', 'scanner_plan', 'scanner_executed']);
    assert.equal(result.fixture_version, manifest.fixture_version);
    assert.equal(result.case_id, item.case_id);
    assert.ok(result.status === 'complete' || result.status === 'partial', item.case_id);
    assertOwnedRun(result);
    assert.equal(result.nodes.length, item.nodes.length, item.case_id);
    const hasLink = item.nodes.some((node) => node.kind === 'hardlink' || node.kind === 'symlink_dir' || node.kind === 'junction_dir');
    if (!hasLink) {
      assert.equal(result.status, 'complete', item.case_id);
      assert.ok(result.nodes.every((node) => node.status === 'created' && node.error_code === null), item.case_id);
    }
    assert.equal(result.status, result.nodes.some((node) => node.status === 'unsupported') ? 'partial' : 'complete', item.case_id);
    const expected = ['.water-fixture-run.json'];
    for (let i = 0; i < item.nodes.length; i += 1) {
      const declared = item.nodes[i];
      const got = result.nodes[i];
      assert.deepEqual(Object.keys(got), ['path', 'kind', 'status', 'error_code']);
      assert.equal(got.path, declared.path, item.case_id);
      assert.equal(got.kind, declared.kind, declared.path);
      const abs = nodeAbs(result.run_root, declared.path);
      if (got.status === 'created') {
        assert.equal(got.error_code, null, declared.path);
        expected.push(declared.path);
        const info = lstatSync(abs);
        if (declared.kind === 'directory') {
          assert.equal(info.isDirectory(), true, declared.path);
          assert.equal(info.isSymbolicLink(), false, declared.path);
        } else if (declared.kind === 'file' || declared.kind === 'hardlink') {
          assert.equal(info.isFile(), true, declared.path);
          if (declared.kind === 'file') assert.equal(readFileSync(abs, 'utf8'), declared.content, declared.path);
        } else {
          assert.equal(info.isSymbolicLink(), true, declared.path);
        }
      } else {
        assert.equal(got.status, 'unsupported', declared.path);
        assert.ok(linkErrors.has(got.error_code), `${declared.path} ${got.error_code}`);
        assert.equal(existsSync(abs), false, declared.path);
      }
    }
    assert.deepEqual(listTree(result.run_root), expected.sort(), item.case_id);
    assert.equal(result.scopes.length, item.scopes.length);
    for (let i = 0; i < item.scopes.length; i += 1) {
      assert.deepEqual(Object.keys(result.scopes[i]), ['scope_id', 'path', 'absolute_path']);
      assert.equal(result.scopes[i].scope_id, item.scopes[i].scope_id);
      assert.equal(result.scopes[i].path, item.scopes[i].path);
      assert.equal(isAbsolute(result.scopes[i].absolute_path), true);
      assert.ok(samePath(result.scopes[i].absolute_path, nodeAbs(result.run_root, item.scopes[i].path)));
      assert.equal(lstatSync(result.scopes[i].absolute_path).isDirectory(), true);
    }
    assert.equal(result.canaries.length, item.canaries.length);
    for (let i = 0; i < item.canaries.length; i += 1) {
      const canary = result.canaries[i];
      assert.deepEqual(Object.keys(canary), ['path', 'bytes', 'sha256']);
      assert.equal(canary.path, item.canaries[i]);
      const bytes = readFileSync(nodeAbs(result.run_root, canary.path));
      assert.equal(canary.bytes, bytes.length);
      assert.equal(canary.sha256, createHash('sha256').update(bytes).digest('hex'));
    }
    const markerPath = join(result.run_root, '.water-fixture-run.json');
    assert.equal(lstatSync(markerPath).isFile(), true);
    assert.deepEqual(JSON.parse(readFileSync(markerPath, 'utf8')), result);
    local.push(result.run_id);
    track(item, result);
  }
  assert.equal(local.length, 11);
});

test('fixture_paths_and_collisions', async () => {
  const escapePaths = [
    join(worktree, 'escape'),
    join(worktree, '.local', 'escape'),
    join(worktree, '.local', 'fixture-lab', 'escape'),
    resolve('/tmp/escape'),
    'C:\\escape',
  ];
  for (const runId of negatives.invalid_run_ids) {
    const before = labListing();
    await assert.rejects(
      () => materializeCase('project-markers', { run_id: runId }),
      (error) => {
        assert.ok(error instanceof FixtureError, JSON.stringify(runId));
        assert.equal(error.code, 'invalid_run_id', JSON.stringify(runId));
        assert.equal(error.field, '/options/run_id', JSON.stringify(runId));
        if (runId.length > 0) {
          assert.equal(error.message.includes(runId), false, JSON.stringify(runId));
          assert.equal(String(error.stack).split(/\r?\n/, 1)[0].includes(runId), false, JSON.stringify(runId));
          assert.equal(error.field.includes(runId), false, JSON.stringify(runId));
        }
        return true;
      },
    );
    assert.deepEqual(labListing(), before, JSON.stringify(runId));
    for (const escapePath of escapePaths) assert.equal(existsSync(escapePath), false, escapePath);
  }

  const beforeUnknown = labListing();
  await assert.rejects(() => materializeCase('not-a-frozen-case'), (error) => {
    assert.ok(error instanceof FixtureError);
    assert.equal(error.code, 'invalid_case');
    assert.equal(error.field, '/case_id');
    assert.equal(error.message.includes('not-a-frozen-case'), false);
    return true;
  });
  let caseHits = 0;
  const caseObject = {};
  Object.defineProperty(caseObject, 'toString', { value() { caseHits += 1; return 'project-markers'; } });
  Object.defineProperty(caseObject, 'valueOf', { value() { caseHits += 1; return 'project-markers'; } });
  await assert.rejects(() => materializeCase(caseObject), (error) => {
    assert.equal(error.code, 'invalid_case');
    assert.equal(error.field, '/case_id');
    return true;
  });
  assert.equal(caseHits, 0);
  await assert.rejects(() => materializeCase('project-markers', null), (error) => {
    assert.equal(error.code, 'invalid_run_id');
    assert.equal(error.field, '/options');
    return true;
  });
  await assert.rejects(() => materializeCase('project-markers', ['run-not-an-object']), (error) => {
    assert.equal(error.code, 'invalid_run_id');
    assert.equal(error.field, '/options');
    return true;
  });
  let optionHits = 0;
  const options = {};
  Object.defineProperty(options, 'run_id', {
    get() { optionHits += 1; return 'run-should-not-execute'; },
    enumerable: true,
  });
  await assert.rejects(() => materializeCase('project-markers', options), (error) => {
    assert.equal(error.code, 'invalid_run_id');
    assert.equal(error.field, '/options');
    assert.equal(error.message.includes('run-should-not-execute'), false);
    return true;
  });
  assert.equal(optionHits, 0);
  await assert.rejects(() => materializeCase('project-markers', { run_id: 'run-paths-owned-1', WATER_UNKNOWN_ROOT: 'SENTINEL_ROOT' }), (error) => {
    assert.equal(error.code, 'invalid_run_id');
    assert.equal(error.field, '/options');
    assert.equal(error.field.includes('WATER_UNKNOWN_ROOT'), false);
    assert.equal(error.message.includes('SENTINEL_ROOT'), false);
    return true;
  });
  assert.deepEqual(labListing(), beforeUnknown);

  const local = [];
  const ownedId = `run-paths-${randomUUID()}`;
  const owned = await materializeCase('scope-prefix', { run_id: ownedId });
  assertOwnedRun(owned);
  assert.equal(owned.run_id, ownedId);
  const canaryPath = nodeAbs(owned.run_root, 'scope-other/canary.txt');
  const canaryBefore = readFileSync(canaryPath);
  const namesBefore = readdirSync(owned.run_root);
  await assert.rejects(() => materializeCase('scope-prefix', { run_id: ownedId }), (error) => {
    assert.ok(error instanceof FixtureError);
    assert.equal(error.code, 'collision');
    return true;
  });
  assert.deepEqual(readFileSync(canaryPath), canaryBefore);
  assert.deepEqual(readdirSync(owned.run_root), namesBefore);
  assert.deepEqual(JSON.parse(readFileSync(join(owned.run_root, '.water-fixture-run.json'), 'utf8')), owned);
  local.push(owned.run_id);
  track(manifest.cases.find((item) => item.case_id === 'scope-prefix'), owned);

  const generated = await materializeCase('overlapping-scopes', {});
  assertOwnedRun(generated);
  assert.equal(generated.run_id === ownedId, false);
  local.push(generated.run_id);
  track(manifest.cases.find((item) => item.case_id === 'overlapping-scopes'), generated);

  const previousRoot = process.env.WATER_FIXTURE_ROOT;
  process.env.WATER_FIXTURE_ROOT = join(worktree, '.local', 'decoy-root');
  let envRun;
  try {
    envRun = await materializeCase('unicode-spaces', { run_id: `run-env-${randomUUID()}` });
  } finally {
    if (previousRoot === undefined) delete process.env.WATER_FIXTURE_ROOT;
    else process.env.WATER_FIXTURE_ROOT = previousRoot;
  }
  assertOwnedRun(envRun);
  assert.equal(envRun.run_root.includes('decoy-root'), false);
  local.push(envRun.run_id);
  track(manifest.cases.find((item) => item.case_id === 'unicode-spaces'), envRun);
  assert.equal(local.length, 3);
});

test('fixture_link_capabilities', async () => {
  const hardItem = manifest.cases.find((item) => item.case_id === 'hardlink-pair');
  const dirItem = manifest.cases.find((item) => item.case_id === 'directory-links');
  const hard = await materializeCase(hardItem.case_id);
  const dirs = await materializeCase(dirItem.case_id);
  const hardNode = hard.nodes.find((node) => node.kind === 'hardlink');
  const symlinkNode = dirs.nodes.find((node) => node.kind === 'symlink_dir');
  const junctionNode = dirs.nodes.find((node) => node.kind === 'junction_dir');
  assert.ok(hardNode && symlinkNode && junctionNode);
  const capabilities = { platform: process.platform, node: process.version };

  const original = hardItem.nodes.find((node) => node.kind === 'file');
  if (hardNode.status === 'created') {
    const left = statSync(nodeAbs(hard.run_root, original.path), { bigint: true });
    const right = statSync(nodeAbs(hard.run_root, hardNode.path), { bigint: true });
    assert.equal(left.dev, right.dev);
    assert.equal(left.ino, right.ino);
    assert.ok(left.nlink >= 2n);
    assert.equal(readFileSync(nodeAbs(hard.run_root, hardNode.path), 'utf8'), original.content);
    capabilities.hardlink = {
      status: 'supported', error_code: null, nlink: left.nlink.toString(), dev_equal: true, ino_equal: true, identity_nonzero: left.ino !== 0n,
    };
  } else {
    assert.ok(linkErrors.has(hardNode.error_code));
    assert.equal(existsSync(nodeAbs(hard.run_root, hardNode.path)), false);
    capabilities.hardlink = { status: 'unsupported', error_code: hardNode.error_code };
  }

  const canary = dirItem.nodes.find((node) => node.path === 'outside-target/canary.txt');
  const canaryBytes = readFileSync(nodeAbs(dirs.run_root, canary.path));
  assert.equal(canaryBytes.toString('utf8'), canary.content);
  for (const [node, key] of [[symlinkNode, 'symlink_dir'], [junctionNode, 'junction_dir']]) {
    const declared = dirItem.nodes.find((item) => item.path === node.path);
    if (node.status === 'created') {
      const linkPath = nodeAbs(dirs.run_root, node.path);
      const targetPath = nodeAbs(dirs.run_root, declared.target);
      assert.equal(lstatSync(linkPath).isSymbolicLink(), true, node.path);
      const left = realpathSync(linkPath);
      const right = realpathSync(targetPath);
      assert.equal(process.platform === 'win32' ? left.toLowerCase() : left, process.platform === 'win32' ? right.toLowerCase() : right);
      assert.equal(readFileSync(join(linkPath, 'canary.txt'), 'utf8'), canary.content);
      capabilities[key] = { status: 'supported', error_code: null, target_realpath_equal: true };
    } else {
      assert.ok(linkErrors.has(node.error_code), node.error_code);
      assert.equal(existsSync(nodeAbs(dirs.run_root, node.path)), false, node.path);
      if (node.kind === 'junction_dir' && process.platform !== 'win32') assert.equal(node.error_code, 'PLATFORM_UNSUPPORTED');
      capabilities[key] = { status: 'unsupported', error_code: node.error_code };
    }
  }
  assert.equal(readFileSync(nodeAbs(dirs.run_root, canary.path)).equals(canaryBytes), true);

  const capDir = join(worktree, '.local', 'checks', 'WATER-W1-D');
  mkdirSync(capDir, { recursive: true });
  writeFileSync(join(capDir, 'capabilities.json'), `${JSON.stringify(capabilities, null, 2)}\n`);
  track(hardItem, hard);
  track(dirItem, dirs);
});

test('fixture_declarative_faults', async () => {
  const ids = ['depth-budget', 'entry-budget', 'permission-plan', 'cancel-plan'];
  const local = [];
  for (const id of ids) {
    const item = manifest.cases.find((entry) => entry.case_id === id);
    const result = await materializeCase(id);
    assert.equal(result.scanner_executed, false, id);
    assert.deepEqual(result.scanner_plan, item.scanner_plan, id);
    assert.deepEqual(result.scanner_plan.faults, item.scanner_plan.faults, id);
    assert.equal(result.scanner_plan.cancel_after_entries, item.scanner_plan.cancel_after_entries, id);
    assert.deepEqual(result.scanner_plan.expected_issue_codes, item.scanner_plan.expected_issue_codes, id);
    assert.equal(result.scanner_plan.max_depth, item.scanner_plan.max_depth, id);
    assert.equal(result.scanner_plan.max_entries, item.scanner_plan.max_entries, id);
    assert.equal(existsSync(join(result.run_root, 'ScanReport.json')), false, id);
    if (id === 'permission-plan') {
      const blocked = nodeAbs(result.run_root, 'scope/blocked');
      const file = nodeAbs(result.run_root, 'scope/blocked/synthetic.txt');
      accessSync(blocked, constants.R_OK);
      accessSync(file, constants.R_OK);
      assert.ok(readdirSync(blocked).includes('synthetic.txt'));
      const declared = item.nodes.find((node) => node.path === 'scope/blocked/synthetic.txt');
      assert.equal(readFileSync(file, 'utf8'), declared.content);
    }
    local.push(result.run_id);
    track(item, result);
  }
  assert.equal(local.length, 4);
  assert.ok(createdRunIds.length <= 24, String(createdRunIds.length));
  assert.ok(createdContentBytes <= 1024 * 1024, String(createdContentBytes));
});
