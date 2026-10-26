import {formatBytes, percent} from '../format.mjs';
import {levels} from '../model.mjs';
export function el(tag, cls = '', text, attrs = {}) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}
export function add(node, ...children) { node.append(...children.filter(c => c != null)); return node; }
export function svg(tag, attrs = {}) {
  const node = document.createElementNS(document.getElementById('sprite').namespaceURI, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
export function icon(name, cls = '') { return add(svg('svg', {class:`i ${cls}`, 'aria-hidden':'true'}), svg('use', {href:`#i-${name}`})); }
export function button(text, action, cls = 'btn btn-glass', key, disabled = false) {
  const node = el('button', cls, text, {type:'button'});
  if (key) node.dataset.key = key;
  node.disabled = disabled;
  node.addEventListener('click', action);
  return node;
}
export function heading(title, subtitle) { return add(el('header', 'page-heading'), el('h1', '', title), el('p', 'sub', subtitle)); }
export function metric(value, label = '', cls = 'kpi') {
  const text = formatBytes(value), split = text.lastIndexOf(' ');
  return add(el('div', cls), el('span', '', text.slice(0, split)), el('small', '', `${text.slice(split + 1)}${label ? ' ' + label : ''}`));
}
export function level(name) { return add(el('span', `level ${name}`), el('i'), el('span', '', levels[name] ?? levels.unrecognized)); }
export function check(label, checked, change, key, mixed = false) {
  const input = el('input', 'check', undefined, {type:'checkbox', 'aria-label':label, 'data-key':key});
  input.checked = checked; input.indeterminate = mixed;
  input.addEventListener('change', () => change(input.checked));
  return input;
}
export const catIcon = c => ({agent_tool:'chip', browser:'globe', system_temp:'hourglass', app_leftover:'box', dev_cache:'code', crash_log:'warn', gpu_system:'gpu', custom:'folder', unrecognized:'info'}[c] ?? 'folder');
export function empty(title, subtitle) { return add(el('section', 'glass empty'), icon('drop'), el('h2', '', title), el('p', 'sub', subtitle)); }
export function insight(item, open) {
  return add(el('aside', 'glass insight'), icon('trend', 'growth'), add(el('div', 'grow-fill'), el('strong', '', item.title_zh), el('p', 'sub', item.message_zh)), button('查看修复建议', () => open(item.group_id), 'btn btn-ghost', `insight-${item.group_id}`));
}
let serial = 0;
export function water({used = 0, reclaim = 0, before = null, gauge = false, progress = 0} = {}) {
  const clip = `water-${++serial}`, width = gauge ? 330 : 100, height = gauge ? 330 : 170;
  const top = gauge ? 24 : 4, bottom = height - top, area = bottom - top;
  const y = bottom - area * Math.max(0, Math.min(100, used)) / 100;
  const node = svg('svg', {viewBox:`0 0 ${width} ${height}`, class:gauge ? 'water-gauge' : 'water-vial', 'aria-hidden':'true'});
  const shape = gauge ? svg('circle', {cx:165, cy:165, r:141}) : svg('rect', {x:4, y:4, width:92, height:162, rx:32});
  add(node, add(svg('defs'), add(svg('clipPath', {id:clip}), shape)));
  const liquid = svg('g', {'clip-path':`url(#${clip})`});
  add(liquid, svg('rect', {width, height, class:'vial-glass'}));
  const wave = (offset, cls) => {
    const path = svg('path', {d:`M-120 ${y + offset} q30 -9 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 V${height} H-120Z`, class:cls});
    path.style.setProperty('--wave-delay', `${-(performance.now() % (cls.includes('slow') ? 13000 : 8000))}ms`);
    return path;
  };
  if (reclaim > 0) add(liquid, wave(-3 - area * Math.min(100, reclaim) / 100, 'water-free wave'));
  add(liquid, wave(-3, 'water-back wave'), wave(3, 'water-front wave slow'));
  if (before !== null) add(liquid, svg('line', {x1:0, x2:width, y1:bottom - area * before / 100, y2:bottom - area * before / 100, class:'before-line'}));
  add(node, liquid);
  if (!gauge) {
    const edge = shape.cloneNode(); edge.setAttribute('class', 'vial-edge');
    const outline = shape.cloneNode(); outline.setAttribute('class', 'vial-outline');
    add(node, edge, outline,
      svg('ellipse', {cx:50, cy:7, rx:18, ry:3, class:'vial-mouth'}),
      svg('path', {d:'M13 32Q16 10 37 10H63Q84 10 87 32', class:'vial-top'}),
      svg('path', {d:'M12 40V129 M88 40V129', class:'vial-highlight'}));
  }
  if (gauge) add(node, svg('circle', {cx:165, cy:165, r:153, class:'gauge-track'}), svg('circle', {cx:165, cy:165, r:153, class:'gauge-progress', pathLength:100, 'stroke-dasharray':`${progress} 100`, transform:'rotate(-90 165 165)'}));
  return node;
}
export function driveWater(drive, recommended = '0', before = null) {
  return water({used:100 - percent(drive.free_bytes, drive.total_bytes), reclaim:percent(recommended, drive.total_bytes), before});
}
export function progressRing(value, title, progress, draining = false) {
  return add(el('div', 'gauge'), water({used:draining ? 100 - progress : progress, gauge:true, progress}), add(el('div', 'gauge-center'), el('p', 'cap', title), metric(value, '', 'gauge-value'), el('span', 'cap', `${Math.round(progress)}%`)));
}
export function copyButton(text, key = 'copy-hint') {
  const node = button('复制给项目维护者', async () => {
    try { await navigator.clipboard.writeText(text); node.textContent = '已复制'; }
    catch { node.textContent = '未能复制，请选择文字复制'; }
  }, 'btn btn-ghost', key);
  return node;
}
