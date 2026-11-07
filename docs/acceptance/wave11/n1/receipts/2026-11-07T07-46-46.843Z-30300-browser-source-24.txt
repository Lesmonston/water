import {add, el, heading, metric, card, button, tag} from './common.mjs';
import {dial, stems, progressBar, blocks} from './charts.mjs';
import {formatBytes, count, elapsed} from '../format.mjs';
export function scan(s, a) {
  const p = s.scanProgress, page = el('section', 'screen');
  add(page, heading('正在体检', '只读取名字、大小与时间', p ? [metric(p.found_bytes, '已发现'), metric(count(p.visited_entries), '个文件已检查', true), metric(elapsed(p.elapsed_ms), '已用时', true)] : []));
  if (!p) return add(page, el('p', 'sub', '正在准备体检…'));
  add(page, progressBar(p.percent));
  const grid = el('div', 'scan-grid'), main = card('进度', 'dark main-card');
  add(main, el('p', 'sub', '按已检查的文件估算'), add(el('div', 'dial-slot'), dial(p.percent, `${p.percent}%`, '已检查')), add(el('div', 'bottom action-stack'), el('p', 'sub', '停下也保留已经查到的'), button('停止', a.stopScan, 'btn primary', 'scan-stop', s.pending)));
  const locations = el('div', 'scan-locations');
  for (const loc of p.locations) {
    const c = card(loc.label_zh, 'scan-location', [tag({waiting:'等待', running:'扫描中', done:'完成'}[loc.state], loc.state === 'done' ? 'lime' : '')]);
    c.dataset.location = loc.location_id;
    add(c, metric(loc.found_bytes, '已发现'), add(el('div', 'bottom'), blocks(loc.found_bytes, p.found_bytes, loc.state === 'done' ? 'lime' : 'sky'))); add(locations, c);
  }
  add(locations, add(card('发现的可清空间', 'scan-chart'), el('p', 'sub', '每秒一根 · 本次体检'), stems(s.scanSamples, '本次体检发现的可清空间')));
  add(grid, main, locations); return add(page, grid);
}
