// Self-test manifest for the wave 5 fixture clean loop in desktop-wave-check.mjs (native mode).
// The task is G6's host config at a selftest commit that only opens the clean switch, with the clean-loop
// native config from .local/w5-prep/native-clean-loop.json and the offline cache from .offline-cache.
// Usage (repo root): node .local/w5-selftest/make-manifest.mjs <selftest commit>
import {readFileSync, writeFileSync} from 'node:fs';
const head = process.argv[2]; if (!/^[0-9a-f]{40}$/.test(head)) throw Error('full selftest commit required');
const m = JSON.parse(readFileSync('docs/dispatch/wave4/manifest.json', 'utf8'));
const loop = JSON.parse(readFileSync('.local/w5-prep/native-clean-loop.json', 'utf8'));
const g6 = m.tasks.find(t => t.id === 'WATER-W4-G6'), ev = 'docs/acceptance/wave5/controller/selftest/h3/';
const task = {...g6, ...loop, id: 'WATER-W5-SELFTEST-H3', title: 'SELFTEST fixture clean loop', slot: 'w5-selftest-h3', baseCommit: head,
  worktree: 'F:/new/smaltalk/water/.worktrees/w5-selftest-h3', branch: 'selftest/water-w5-h3', evidenceDir: ev,
  allowedPrefixes: [...(g6.allowedPrefixes ?? []), ev], cargoCacheSource: 'F:/new/smaltalk/water/.offline-cache/desktop/registry',
  allowedModes: ['lock', 'check', 'native', 'archive'], expectedFinalModes: ['check', 'native'], status: 'SELFTEST'};
writeFileSync('.local/w5-selftest/manifest.json', JSON.stringify({...m, wave: 'water-wave5-selftest', status: 'SELFTEST', tasks: [task]}, null, 2) + '\n');
console.log(task.id, task.baseCommit.slice(0, 8), task.cargoCacheSource, 'steps', task.nativeSteps.length);
