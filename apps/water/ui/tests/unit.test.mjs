import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bytes, formatBytes, byteDelta, countDelta, count, relativeTime, elapsed, percent, middlePath} from '../format.mjs';
import * as model from '../model.mjs';
import * as ipc from '../ipc.mjs';
const fixture = JSON.parse(readFileSync(new URL('../../../../contracts/checkup-v1/ui-fixtures.json', import.meta.url), 'utf8'));
const m3c = {...fixture, ...JSON.parse(readFileSync(new URL('../../../../contracts/m3c-v1/ui-fixtures-m3c.json', import.meta.url), 'utf8'))};

test('ui_format_bytes_time', () => {
  assert.equal(formatBytes('0'), '<1 MB');
  assert.equal(formatBytes('1048575'), '<1 MB');
  assert.equal(formatBytes('1048576'), '1 MB');
  assert.equal(formatBytes('859832320'), '820 MB');
  assert.equal(formatBytes('1572864'), '2 MB');
  assert.equal(formatBytes('1073741824'), '1.0 GB');
  assert.equal(formatBytes('14602888806'), '13.6 GB');
  assert.equal(formatBytes('9007199254740993'), '8,388,608.0 GB');
  assert.equal(formatBytes('2000000000000'), '1,862.6 GB');
  assert.equal(formatBytes(String(1000n * 1024n ** 2n)), '1,000 MB');
  assert.equal(formatBytes(String(1024n ** 3n - 1n)), '1.0 GB');
  assert.equal(formatBytes(String(1024n ** 3n - 524288n)), '1.0 GB');
  assert.equal(formatBytes(String(1024n ** 3n - 524289n)), '1,023 MB');
  assert.equal(bytes('9007199254740993') + 1n, 9007199254740994n);
  assert.equal(formatBytes('-1288490189'), '−1.2 GB');
  assert.equal(byteDelta('-1288490189'), '−1.2 GB');
  assert.equal(byteDelta('1288490189'), '+1.2 GB');
  assert.equal(countDelta(-5), '−5');
  assert.equal(countDelta(5), '+5');
  assert.equal(countDelta(0), '0');
  assert.equal(count(69947), '69,947');
  assert.equal(count('9007199254740993'), '9,007,199,254,740,993');
  const now = Date.parse('2026-10-26T12:00:00Z');
  assert.equal(relativeTime('2026-10-26T10:00:00Z', now), '2 小时前');
  assert.equal(relativeTime('2026-10-26T11:58:00Z', now), '2 分钟前');
  assert.equal(relativeTime('2026-10-26T11:59:50Z', now), '刚刚');
  assert.equal(relativeTime('2026-10-25T00:00:00Z', now), '10 月 25 日');
  assert.equal(relativeTime('2024-10-25T00:00:00Z', now), '2024 年 10 月 25 日');
  const previousTZ = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(relativeTime('2026-10-24T23:30:00Z', now), '10 月 24 日');
      assert.equal(relativeTime('2024-10-24T23:30:00Z', now), '2024 年 10 月 24 日');
    }
  } finally { if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ; }
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
  for (const values of [[1, 2, 3, 4], [16, 23, 8, 67, 59], [2, 2, 2], [9, 8, 8, 0], [0, 1000, 1001]]) {
    const points = values.map((y, i) => ({x:i * 100, y}));
    const segments = model.monotoneSegments(points);
    for (const [i, {start, c1, c2, end}] of segments.entries()) {
      let previous = start.y;
      for (let step = 0; step <= 100; step++) {
        const t = step / 100, u = 1 - t, value = u ** 3 * start.y + 3 * u ** 2 * t * c1.y + 3 * u * t ** 2 * c2.y + t ** 3 * end.y;
        assert(value >= Math.min(start.y, end.y) - 1e-9 && value <= Math.max(start.y, end.y) + 1e-9, 'Curve must not overshoot its data');
        assert((value - previous) * Math.sign(end.y - start.y) >= -1e-9, 'Curve must remain monotone within each interval');
        previous = value;
      }
      if (i) assert(Math.abs((start.y - segments[i - 1].c2.y) - (c1.y - start.y)) < 1e-9, 'Shared tangent must stay smooth');
    }
  }
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
  assert.notDeepEqual(next, initial, 'manual selection must really change first');
  const refreshed = model.installResult({result, selection:next, stale:true, filter:'protected'}, structuredClone(result));
  assert.deepEqual(refreshed.selection, initial, 'new scan resets prior manual selection through the application transition');
  assert.equal(refreshed.stale, false); assert.equal(refreshed.filter, 'all');
  const order = ['recommended', 'confirm', 'advisory', 'protected', 'unrecognized'];
  for (const category of result.categories) {
    const sorted = model.sortedGroups(category.groups, 'bytes');
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      assert(order.indexOf(a.level) <= order.indexOf(b.level), 'Level precedes size');
      if (a.level === b.level) assert(bytes(a.total_bytes) >= bytes(b.total_bytes));
    }
    const growing = model.sortedGroups(category.groups, 'growth');
    for (let i = 1; i < growing.length; i++) assert(bytes(growing[i - 1].growth?.bytes_delta ?? '0') >= bytes(growing[i].growth?.bytes_delta ?? '0'));
  }
  const large = {...disabled, selectable:true, eligible_bytes:'9007199254740993'};
  assert.equal(model.selectedBytes({...extra, categories:[{groups:[large]}]}, new Set(['disabled'])), 9007199254740993n);
  const data = m3c.group_details['custom:drive-f:node-modules'], item = data.items[1], details = new Map([[data.group.group_id, data]]);
  let chosen = model.setSelected(m3c.scan_result, model.resetSelection(m3c.scan_result), data.group.group_id, true);
  const originalBytes = model.selectedBytes(m3c.scan_result, chosen, details), originalCount = model.selectedCount(m3c.scan_result, chosen, details);
  const previous = chosen;
  chosen = model.setItemSelected(m3c.scan_result, chosen, data, item.item_id, false);
  assert(chosen instanceof Map && chosen.get(data.group.group_id) instanceof Set, 'UI_M3C_EXCLUDE: selection is a group-to-exclusions map');
  assert.equal(previous.get(data.group.group_id).size, 0, 'UI_M3C_EXCLUDE: editing an item does not mutate prior selection');
  assert.equal(model.selectedBytes(m3c.scan_result, chosen, details), originalBytes - bytes(item.total_bytes), 'UI_M3C_EXCLUDE: excluded bytes leave selection');
  assert.equal(model.selectedCount(m3c.scan_result, chosen, details), originalCount - 1, 'UI_M3C_EXCLUDE: excluded item leaves count');
  assert.deepEqual(model.cleanSelection(m3c.scan_result, chosen, details).excludeItemIds, [item.item_id], 'UI_M3C_EXCLUDE: exact item exclusion');
  const unselected = model.setSelected(m3c.scan_result, chosen, data.group.group_id, false);
  for (const checked of [false, true]) assert.deepEqual(model.setItemSelected(m3c.scan_result, unselected, data, item.item_id, checked), unselected, 'UI_M3C_EXCLUDE: item changes never opt an unselected group into cleanup');
  assert.deepEqual(model.cleanSelection(m3c.scan_result, unselected, details).excludeItemIds, [], 'UI_M3C_EXCLUDE: deselecting a group clears exclusions');
  assert.equal(model.setSelected(m3c.scan_result, unselected, data.group.group_id, true).get(data.group.group_id).size, 0, 'UI_M3C_EXCLUDE: reselecting a group starts fresh');
  for (const item of data.items.filter(i => i.eligible)) chosen = model.setItemSelected(m3c.scan_result, chosen, data, item.item_id, false);
  assert(!model.cleanSelection(m3c.scan_result, chosen, details).groupIds.includes(data.group.group_id), 'UI_M3C_EXCLUDE: an emptied group never reaches the plan');
  assert.deepEqual(model.cleanSelection(m3c.scan_result, chosen, details).excludeItemIds, [], 'UI_M3C_EXCLUDE: an emptied group sends no orphan exclusions');
  assert.deepEqual(model.setItemSelected(m3c.scan_result, chosen, data, 'i-000204', true), chosen, 'UI_M3C_EXCLUDE: protected item cannot be opted in');
});

test('ui_ipc_boundary', async () => {
  const calls = [], original = globalThis.__TAURI__;
  const cases = {
    app_state:[], scan_start:[], scan_cancel:['scan-a'], scan_progress:[], scan_result:['scan-a'], group_detail:['custom:water:cachedir-tagged'], clean_prepare:[['group-a', 'custom:water:cachedir-tagged']], clean_start:['plan-a', 'token-a'], clean_stop:[], clean_progress:[], clean_result:['clean-a'], trends:[], history_list:[], locations_get:[], locations_set_category:['agent_tool', false], custom_root_add:[], custom_root_remove:['root-a'], skip_add:['i-000201'], skip_remove:['s-000001']
  };
  const keys = {scan_cancel:['scanId'], scan_result:['scanId'], group_detail:['groupId'], clean_prepare:['groupIds'], clean_start:['planId', 'confirmToken'], clean_result:['cleanId'], locations_set_category:['category', 'enabled'], custom_root_remove:['rootId'], skip_add:['itemId'], skip_remove:['skipId']};
  assert.deepEqual(Object.keys(ipc).sort(), Object.keys(cases).sort());
  try {
    globalThis.__TAURI__ = {core:{invoke:async (command, args) => { calls.push({command, args}); return {ok:true}; }}};
    for (const [name, args] of Object.entries(cases)) {
      await ipc[name](...args);
      const call = calls.at(-1); assert.equal(call.command, name); assert.deepEqual(Object.keys(call.args), keys[name] ?? []);
      assert.deepEqual(Object.values(call.args), args);
      for (const value of Object.values(call.args).flat()) { assert(['string', 'boolean'].includes(typeof value)); if (typeof value === 'string') assert(!/[A-Za-z]:[\\/]|\\/.test(value)); }
    }
    for (const token of ['abc/def+=', '/+=', 'a'.repeat(512)]) {
      await ipc.clean_start('plan-a', token);
      assert.equal(calls.at(-1).args.confirmToken, token);
    }
    assert.equal(Object.keys(ipc).length, 19, 'UI_IPC_NO_PATH: 19 commands, original positional calls retained');
    await ipc.clean_prepare(['group-a'], ['i-000201']);
    assert.deepEqual(calls.at(-1), {command:'clean_prepare', args:{groupIds:['group-a'], excludeItemIds:['i-000201']}}, 'UI_M3C_EXCLUDE: item IDs reach clean_prepare');
    await ipc.clean_prepare(['group-a'], []);
    assert.deepEqual(calls.at(-1).args, {groupIds:['group-a'], excludeItemIds:[]}, 'UI_M3C_EXCLUDE: explicit empty exclusion list accepted');
    const size = calls.length;
    for (const bad of ['C:\\private', 'F:/private', '/tmp/private', '\\\\server\\share', '', null]) {
      await assert.rejects(ipc.skip_add(bad), e => e.code === 'invalid', 'UI_IPC_NO_PATH: skip_add rejects paths');
      await assert.rejects(ipc.skip_remove(bad), e => e.code === 'invalid', 'UI_IPC_NO_PATH: skip_remove rejects paths');
      await assert.rejects(ipc.clean_prepare(['group-a'], [bad]), e => e.code === 'invalid', 'UI_IPC_NO_PATH: exclusions reject paths');
    }
    for (const bad of [null, 'i-1', ['i-1', 'i-1'], Array.from({length:5001}, (_, i) => `i-${i}`)]) await assert.rejects(ipc.clean_prepare(['group-a'], bad), e => e.code === 'invalid', 'UI_M3C_EXCLUDE: exclusions are bounded unique ID arrays');
    for (const bad of ['', 'a'.repeat(513), 'C:\\private', '\\\\server\\share', 'abc\\def', null, 3]) await assert.rejects(ipc.clean_start('plan-a', bad), e => e.code === 'invalid');
    for (const bad of ['plan/a', 'plan+=', 'C:\\private']) await assert.rejects(ipc.clean_start(bad, 'abc/def+='), e => e.code === 'invalid');
    for (const bad of ['C:\\Users\\private', 'C:/Users/private', '/tmp/private', '..', '', 12, null]) await assert.rejects(ipc.group_detail(bad), e => e.code === 'invalid');
    await assert.rejects(ipc.clean_prepare(['safe', 'D:\\private']), e => e.code === 'invalid');
    await assert.rejects(ipc.locations_set_category('browser', 'yes'), e => e.code === 'invalid');
    assert.equal(calls.length, size, 'invalid inputs must never reach host');
    delete globalThis.__TAURI__;
    for (const [name, args] of Object.entries(cases)) await assert.rejects(ipc[name](...args), e => e.code === 'unavailable');
  } finally { if (original === undefined) delete globalThis.__TAURI__; else globalThis.__TAURI__ = original; }
});
