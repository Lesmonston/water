import {add, el, heading, metric, card, button, row, menu, tag} from './common.mjs';
import {dial, stems, proportions} from './charts.mjs';
import {formatBytes, percent} from '../format.mjs';
import {clusterStates} from '../model.mjs';
export function trends(s, a) {
  const data = s.trends, page = el('section', 'screen');
  if (!data) return add(page, heading('趋势', '正在读取…'));
  const system = s.app?.drives.find(d => d.is_system), f = data.forecast.find(f => f.root === system?.root), days = f?.days_to_full;
  const hasDaily = value => value && value.days_to_full !== null && BigInt(value.bytes_per_day) > 0n;
  const title = hasDaily(f) && days > 0 && days <= 90 ? `${system.root.slice(0, 1)} 盘约 ${days} 天后满` : '空间趋势';
  add(page, heading(title, '每次体检留下的空间记录', hasDaily(f) ? [metric(f.bytes_per_day, '日均空间消耗'), metric(f.basis_days, '预测依据天数', true)] : []));
  add(page, proportions(data.forecast.filter(hasDaily).map(f => ({title:`${f.root.slice(0, 1)} 盘 · 日均空间消耗`, bytes:f.bytes_per_day}))));
  for (const value of data.forecast) if (!hasDaily(value)) add(page, el('p', 'sub forecast-note', `${value.root.slice(0, 1)} 盘 · ${value.note_zh ?? '暂不预测'}`));
  const grid = el('div', 'with-hero'), left = el('div', 'trend-content');
  add(left, add(card(`${system?.root.slice(0, 1) ?? ''} 盘可用空间`), stems(data.points.filter(p => p.root === system?.root).map(p => ({bytes:p.free_bytes, label:p.at.slice(5, 10)})), '已记录的可用空间与预测', hasDaily(f) && days > 0 && days <= 90 ? days : 0), f?.note_zh && el('p', 'sub', f.note_zh)));
  const clusters = card('一直在长的');
  for (const c of data.clusters) {
    const entries = [['标记为已修', () => a.markFixed(c.group_id, true)]];
    if (c.copy_text) entries.push(['复制线索给 agent', () => a.copy(c.copy_text)]);
    add(clusters, row(c.title_zh, c.rate_zh, tag(clusterStates[c.state], c.state === 'growing' ? 'hot' : ''), menu(`${c.title_zh}菜单`, entries, `cluster-${c.group_id}`)));
  }
  add(left, clusters);
  const others = card('其它盘');
  for (const other of data.forecast.filter(f => f !== data.forecast.find(x => x.root === system?.root))) {
    const drive = s.app?.drives.find(d => d.root === other.root), prediction = other.note_zh ?? (other.days_to_full > 0 && other.days_to_full <= 90 ? `约 ${other.days_to_full} 天后满` : '稳定');
    add(others, row(`${other.root.slice(0, 1)} 盘`, prediction, drive && dial(100 - percent(drive.free_bytes, drive.total_bytes), formatBytes(drive.free_bytes), '可用', 'tiny')));
  }
  add(left, others);
  if (data.orphans) {
    const o = add(el('details', 'fold'), el('summary', '', `残留进程 · ${data.orphans.total_memory_bytes === null ? '内存未知' : formatBytes(data.orphans.total_memory_bytes)}`));
    for (const chain of data.orphans.chains) add(o, row(chain.name, `${chain.process_count} 个 · ${chain.started_at}`, el('span', '', chain.memory_bytes === null ? '—' : formatBytes(chain.memory_bytes))));
    add(left, o);
  }
  const main = card(system ? `${system.root.slice(0, 1)} 盘` : '磁盘体检', 'dark main-card');
  if (system) add(main, add(el('div', 'dial-slot'), dial(100 - percent(system.free_bytes, system.total_bytes), formatBytes(system.free_bytes), `可用 · 共 ${formatBytes(system.total_bytes)}`)));
  if (f) add(main, hasDaily(f) && row('日均空间消耗', '', el('span', '', formatBytes(f.bytes_per_day))), el('p', 'sub', f.note_zh ?? (hasDaily(f) && days > 0 && days <= 90 ? `约 ${days} 天后满` : '稳定')));
  add(main, add(el('div', 'bottom'), button('体检常用位置', a.scanCommon, 'btn primary', 'trend-scan', a.busy()))); return add(page, add(grid, left, main));
}
