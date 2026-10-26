import {add, el, heading, empty, svg, level, copyButton, button} from './common.mjs';
import {formatBytes, percent, bytes, count, dateTime} from '../format.mjs';
export function trends(state, actions) {
  const page = add(el('section'), heading('增长趋势', '比较每次体检，找出一直在变大的东西。')), data = state.trends;
  if (!data) return add(page, el('p', 'sub', '正在读取趋势…'));
  const root = state.app?.drives.find(d => d.is_system)?.root ?? data.points[0]?.root;
  const all = data.points.filter(p => p.root === root).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latest = all.length ? Date.parse(all.at(-1).at) : 0;
  const points = all.filter(p => Date.parse(p.at) >= latest - 30 * 86400000);
  if (points.length < 2) return add(page, empty('再体检一次就能看到变化', 'Water 会在本机记录体量变化，帮助你发现持续增长的分组。'));
  const chart = add(el('section', 'glass chart'), add(el('div', 'split'), el('h2', '', `${root?.slice(0, 2) ?? ''} 盘可用空间 · 最近 30 天`), el('span', 'cap', `${points.length} 次体检`)));
  const drawing = svg('svg', {viewBox:'0 0 880 230', role:'img', 'aria-label':'每次体检时的可用空间折线图；下方提供文字明细'});
  const maximum = points.reduce((m, p) => bytes(p.free_bytes) > m ? bytes(p.free_bytes) : m, 1n);
  const start = Date.parse(points[0].at), duration = Math.max(1, latest - start);
  const coords = points.map(p => ({x:20 + (Date.parse(p.at) - start) / duration * 840, y:190 - percent(p.free_bytes, maximum) * 1.5, p}));
  for (const y of [40, 115, 190]) add(drawing, svg('line', {x1:20, x2:860, y1:y, y2:y, class:'chart-grid'}));
  add(drawing, svg('polyline', {points:coords.map(p => `${p.x},${p.y}`).join(' '), class:'chart-line'}));
  for (const [i, point] of coords.entries()) {
    add(drawing, add(svg('circle', {cx:point.x, cy:point.y, r:4, class:'chart-point'}), add(svg('title'), document.createTextNode(`${dateTime(point.p.at)} · ${formatBytes(point.p.free_bytes)}`))));
    if (i === 0 || i === coords.length - 1) add(drawing, add(svg('text', {x:point.x, y:point.y - 14, 'text-anchor':i ? 'end' : 'start', class:'chart-label'}), document.createTextNode(`${dateTime(point.p.at)} · ${formatBytes(point.p.free_bytes)}`)));
  }
  const values = el('details', 'chart-values'); add(values, el('summary', 'cap', '查看每次体检的空间记录'));
  points.forEach(p => add(values, el('p', 'cap', `${dateTime(p.at)} · ${formatBytes(p.free_bytes)}`)));
  add(chart, drawing, values); add(page, chart);
  const growth = add(el('div', 'glass growth-list'), add(el('div', 'growth-row cap'), el('span', '', '增长最多'), el('span', '', '与上次相比'), el('span', '', '日均')));
  for (const g of data.growth) add(growth, add(el('div', 'growth-row'), add(el('div'), button(g.title_zh, () => actions.detail(g.group_id), 'text-link', `growth-${g.group_id}`), g.level === 'protected' ? level(g.level) : null), el('span', 'growth', `+${formatBytes(g.bytes_delta)}${g.count_delta ? ' · +' + count(g.count_delta) + ' 个' : ''}`), el('span', '', formatBytes(g.bytes_per_day))));
  const leaks = el('div', 'leaks');
  for (const leak of data.leaks) add(leaks, add(el('section', 'glass leak'), el('p', 'growth', `疑似泄漏 · ${leak.active ? '持续增长' : '已停止'}`), el('h2', '', leak.title_zh), el('p', 'sub', leak.message_zh), el('p', 'fix', leak.fix_hint_zh), copyButton(leak.fix_hint_zh, `copy-${leak.group_id}`), button('查看详情', () => actions.detail(leak.group_id), 'btn btn-ghost', `leak-${leak.group_id}`)));
  add(page, add(el('div', 'two'), growth, leaks)); return page;
}
