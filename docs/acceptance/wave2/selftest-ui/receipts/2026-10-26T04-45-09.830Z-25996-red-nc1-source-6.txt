import assert from 'node:assert/strict';
import test from 'node:test';
import { canSelect } from '../model.mjs';
import { appState } from '../ipc.mjs';

test('ui_alpha', async () => {
  await assert.rejects(appState(), e => e.code === 'unavailable');
});

test('ui_guard', () => {
  assert.equal(canSelect({ selectable: false }), false, 'UI_SELFTEST_GUARD');
  assert.equal(canSelect({ selectable: true }), true);
});
