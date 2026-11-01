import {add, el, metric, driveWater, button, icon} from './common.mjs';
import {formatBytes, percent} from '../format.mjs';
export function resultList(result) {
  const list = el('div', 'glass result-list');
  const labels = {done:'已清理', partial:'部分完成', skipped:'已跳过', failed:'失败'};
  for (const group of result.groups) add(list, add(el('div', 'clean-row'), icon(group.status === 'done' ? 'check' : 'warn', group.status === 'done' ? 'success' : 'growth'), add(el('div', 'grow-fill'), el('span', '', group.title_zh), el('span', 'cap', ` · ${labels[group.status]}${group.notes_zh.length ? ' · ' + group.notes_zh.join('；') : ''}`)), el('b', '', formatBytes(group.freed_bytes))));
  return list;
}
export function done(state, actions) {
  const r = state.cleaned, page = el('section'), vials = el('div', 'vials');
  for (const drive of r.drives) {
    const original = state.app?.drives.find(d => d.root === drive.root);
    add(vials, add(el('div', 'vial-caption'), original ? driveWater({...original, free_bytes:drive.free_after}, '0', 100 - percent(drive.free_before, original.total_bytes)) : null, el('b', '', drive.root.slice(0, 2)), el('span', 'cap', `${formatBytes(drive.free_before)} → ${formatBytes(drive.free_after)}`)));
  }
  add(page, add(el('div', 'glass done-hero'), add(el('div', 'grow-fill'), el('p', 'cap', state.cleanTerminal === 'stopped' ? '清理已停止' : state.cleanTerminal === 'failed' ? '清理已结束，请查看结果' : '清理完成'), metric(r.freed_bytes, '已释放'), el('p', 'sub', `预计 ${formatBytes(r.estimate_bytes)}，实际 ${formatBytes(r.freed_bytes)}；差额来自跳过或未完成的项。`), add(el('div', 'actions'), button('回到结果', () => actions.navigate('results'), 'btn btn-primary', 'back-results'), button('查看清理记录', () => actions.navigate('history'), 'btn btn-glass', 'view-history'))), vials), resultList(r));
  return page;
}
