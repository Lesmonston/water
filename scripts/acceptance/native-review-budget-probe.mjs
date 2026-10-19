// Frozen controller regression, memory/loopback only. Never launches a browser/V.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';

export async function budgetProbe(tree) {
  const controller = resolve(fileURLToPath(new URL('../../', import.meta.url)));
  const definitions = JSON.parse(readFileSync(join(controller, 'contracts/native-review-addendum-v1/CASES.json')));
  const bytes = readFileSync(join(tree, definitions.source));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), definitions.sourceSha256);
  const cases = JSON.parse(bytes).cases;
  const {assertReviewInput} = await import(pathToFileURL(join(tree, 'prototypes/native-review/model.mjs')));
  const {readSession, startFromStream} = await import(pathToFileURL(join(tree, 'prototypes/native-review/host.mjs')));
  const {startServer} = await import(pathToFileURL(join(tree, 'prototypes/native-review/server.mjs')));
  for (const c of cases) assert.equal(assertReviewInput(c.bundle), c.bundle);
  const legacy = JSON.parse(readFileSync(join(tree, definitions.legacySource)));
  assert.equal(legacy.snapshots.length, definitions.legacySnapshots);
  assert.equal(assertReviewInput(legacy), legacy);
  for (const d of definitions.accept) {
    const b = structuredClone(cases[d.caseIndex].bundle);
    b.policy.limits.max_dir_entries = d.max_dir_entries;
    assert.equal(assertReviewInput(b), b);
    assert.deepEqual(await readSession(Readable.from([Buffer.from(JSON.stringify(b))])), b);
  }
  const observations = [], failures = [];
  for (const d of definitions.reject) {
    const b = structuredClone(cases[d.caseIndex].bundle);
    b.policy.limits.max_dir_entries = d.max_dir_entries;
    const bytes = Buffer.from(JSON.stringify(b));
    for (const entry of ['model', 'stream', 'server', 'startFromStream']) {
      let accepted = false, server;
      try {
        if (entry === 'model') assertReviewInput(b);
        else if (entry === 'stream') await readSession(Readable.from([bytes]));
        else if (entry === 'server') server = await startServer({bundle: b});
        else server = await startFromStream({stream: Readable.from([bytes])});
        accepted = true;
      } catch (e) { assert.equal(e.message, definitions.error, 'Wrong rejection at ' + entry); }
      finally { await server?.close(); }
      observations.push({...d, entry, accepted});
      if (accepted) failures.push(definitions.target + ': ' + entry + ' accepted case ' + d.caseIndex + ' limit ' + d.max_dir_entries);
    }
  }
  return {target: definitions.target, positiveNativeCases: cases.length, legacySnapshots: legacy.snapshots.length,
    positiveMutations: definitions.accept.length, observations, failures,
    systemNativeDialogs: 0, physicalFixtureAccess: false};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await budgetProbe(resolve('.'));
  console.log(JSON.stringify(result));
  if (result.failures.length) process.exitCode = 1;
}
