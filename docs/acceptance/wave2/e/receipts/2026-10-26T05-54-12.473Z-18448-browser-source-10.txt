import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bytes, formatBytes, count, relativeTime, elapsed, percent, middlePath} from '../format.mjs';
import * as model from '../model.mjs';
import * as ipc from '../ipc.mjs';
const fixture = JSON.parse(readFileSync(new URL('../../../../contracts/checkup-v1/ui-fixtures.json', import.meta.url), 'utf8'));

test('ui_format_bytes_time', () => {
  assert.equal(formatBytes('0'), '<1 MB');
  assert.equal(formatBytes('1048575'), '<1 MB');
  assert.equal(formatBytes('1048576'), '1 MB');
  assert.equal(formatBytes('859832320'), '820 MB');
  assert.equal(formatBytes('1572864'), '2 MB');
  assert.equal(formatBytes('1073741824'), '1.0 GB');
  assert.equal(formatBytes('14602888806'), '13.6 GB');
  assert.equal(formatBytes('9007199254740993'), '8388608.0 GB');
  assert.equal(bytes('9007199254740993') + 1n, 9007199254740994n);
  assert.equal(formatBytes('-1288490189'), '−1.2 GB');
  assert.equal(count(69947), '69,947');
  assert.equal(count('9007199254740993'), '9,007,199,254,740,993');
  const now = Date.parse('2026-10-26T12:00:00Z');
  assert.equal(relativeTime('2026-10-26T10:00:00Z', now), '2 小时前');
  assert.equal(relativeTime('2026-10-26T11:58:00Z', now), '2 分钟前');
  assert.equal(relativeTime('2026-10-26T11:59:50Z', now), '刚刚');
  assert.equal(relativeTime('2026-10-25T00:00:00Z', now), '10 月 25 日');
  assert.equal(relativeTime('2024-10-25T00:00:00Z', now), '2024 年 10 月 25 日');
  assert.equal(relativeTime(null, now), '尚无记录');
  assert.equal(elapsed(36000), '0:36');
  assert.equal(elapsed(120000), '2:00');
  assert.equal(percent('9007199254740993', '18014398509481986'), 50);
  assert.equal(percent('4', '0'), 0);
  assert.equal(percent('20', '10'), 100);
  assert.throws(() => bytes(9007199254740993));
  assert.throws(() => bytes('1.2'));
  assert.equal(middlePath('short'), 'short');
  assert.equal(middlePath('a'.repeat(100)).length, 56);
});

test('ui_selection_rules', () => {
  const result = structuredClone(fixture.scan_result);
  const initial = model.resetSelection(result);
  assert.equal(initial.size, 13);
  assert.equal(model.selectedBytes(result, initial), 33535104647n);
  for (const group of model.groups(result).filter(g => !g.selectable)) {
    assert.equal(model.setSelected(result, initial, group.group_id, true).has(group.group_id), false, 'UI_LEVEL_GUARD: direct selection must reject nonselectable groups');
    assert.equal(model.canSelect(group), false, 'UI_LEVEL_GUARD: nonselectable must remain false');
  }
  const disabled = {...model.groups(result)[0], group_id:'disabled', selectable:false, default_selected:true};
  const extra = {...result, categories:[{category:'test', groups:[disabled]}]};
  assert.equal(model.resetSelection(extra).size, 0, 'UI_LEVEL_GUARD: inconsistent defaults cannot select protected data');
  assert.equal(model.selectedBytes(extra, new Set(['disabled'])), 0n, 'UI_LEVEL_GUARD: forged selection cannot affect totals');
  assert.equal(model.setSelected(result, initial, 'missing', true).has('missing'), false);
  let next = model.setSelected(result, initial, 'codex-marketplace-staging', false);
  assert.equal(initial.has('codex-marketplace-staging'), true, 'model must not mutate previous state');
  assert.equal(model.selectedBytes(result, next), 29755533427n);
  next = model.selectCategory(result, next, 'agent_tool', true);
  assert.equal(next.has('codex-runtimes'), true);
  assert.equal(next.has('claude-code-sessions'), false, 'UI_LEVEL_GUARD: category selection must not select protected groups');
  next = model.selectCategory(result, next, 'agent_tool', false);
  assert.equal(model.selectedGroups(result, next).some(g => g.category === 'agent_tool'), false);
  assert.deepEqual(model.resetSelection(result), initial, 'new scan resets prior manual selection');
  const large = {...disabled, selectable:true, eligible_bytes:'9007199254740993'};
  assert.equal(model.selectedBytes({...extra, categories:[{groups:[large]}]}, new Set(['disabled'])), 9007199254740993n);
});

test('ui_ipc_boundary', async () => {
  const calls = [], original = globalThis.__TAURI__;
  const cases = {
    app_state:[], scan_start:[], scan_cancel:['scan-a'], scan_progress:[], scan_result:['scan-a'], group_detail:['custom:water:cachedir-tagged'], clean_prepare:[['group-a', 'custom:water:cachedir-tagged']], clean_start:['plan-a', 'token-a'], clean_stop:[], clean_progress:[], clean_result:['clean-a'], trends:[], history_list:[], locations_get:[], locations_set_category:['agent_tool', false], custom_root_add:[], custom_root_remove:['root-a']
  };
  const keys = {scan_cancel:['scanId'], scan_result:['scanId'], group_detail:['groupId'], clean_prepare:['groupIds'], clean_start:['planId', 'confirmToken'], clean_result:['cleanId'], locations_set_category:['category', 'enabled'], custom_root_remove:['rootId']};
  assert.deepEqual(Object.keys(ipc).sort(), Object.keys(cases).sort());
  try {
    globalThis.__TAURI__ = {core:{invoke:async (command, args) => { calls.push({command, args}); return {ok:true}; }}};
    for (const [name, args] of Object.entries(cases)) {
      await ipc[name](...args);
      const call = calls.at(-1); assert.equal(call.command, name); assert.deepEqual(Object.keys(call.args), keys[name] ?? []);
      assert.deepEqual(Object.values(call.args), args);
      for (const value of Object.values(call.args).flat()) { assert(['string', 'boolean'].includes(typeof value)); if (typeof value === 'string') assert(!/[A-Za-z]:[\\/]|\\/.test(value)); }
    }
    const size = calls.length;
    for (const bad of ['C:\\Users\\private', 'C:/Users/private', '/tmp/private', '..', '', 12, null]) await assert.rejects(ipc.group_detail(bad), e => e.code === 'invalid');
    await assert.rejects(ipc.clean_prepare(['safe', 'D:\\private']), e => e.code === 'invalid');
    await assert.rejects(ipc.locations_set_category('browser', 'yes'), e => e.code === 'invalid');
    assert.equal(calls.length, size, 'invalid inputs must never reach host');
    delete globalThis.__TAURI__;
    for (const [name, args] of Object.entries(cases)) await assert.rejects(ipc[name](...args), e => e.code === 'unavailable');
  } finally { if (original === undefined) delete globalThis.__TAURI__; else globalThis.__TAURI__ = original; }
});
