import {t, serviceText} from './strings.mjs';
import {add, el, svg} from './common.mjs';
import {formatDays, driveName, bytes, formatBytes, percent, localDateKey, dateOnly} from '../format.mjs';
// Geometry only: charts never derive new displayed byte quantities.
export function dial(value, text, caption = '', size = '', gain = null) {
  const box = el('div', `dial ${size}`), drawing = svg('svg', {viewBox:'0 0 220 220', 'aria-hidden':'true'});
  for (let i = 0; i < 60; i++) {
    const angle = i * Math.PI / 30 - Math.PI / 2, c = Math.cos(angle), s = Math.sin(angle);
    const tick = i / 60 * 100;
    add(drawing, svg('line', {x1:110 + c * 93, y1:110 + s * 93, x2:110 + c * 107, y2:110 + s * 107, class:gain && tick >= gain[0] && tick < gain[1] ? 'tick gain' : tick < value ? 'tick on' : 'tick'}));
  }
  return add(box, drawing, add(el('div', 'dial-center'), el('span', 'dial-value', text), el('span', 'sub', caption)));
}
export function blocks(value, total, kind = 'sky', n = 40) {
  const box = el('div', 'blocks', undefined, {'aria-hidden':'true'}), p = percent(value, total);
  for (let i = 0; i < n; i++) add(box, el('i', i / n * 100 < p ? kind : '')); return box;
}
export function daysBlocks(days, large = false) {
  const box = el('div', `blocks days ${large ? 'large' : ''}`, undefined, {'aria-hidden':'true'});
  for (let i = 0; i < 14; i++) add(box, el('i', i < days ? i < 7 ? 'ink' : 'hot' : '')); return box;
}
export function proportions(parts) {
  const node = el('div', 'proportions'), total = parts.reduce((n, p) => n + bytes(p.bytes), 0n);
  for (const part of parts) {
    const p = percent(part.bytes, total), item = el('div', 'proportion'); item.style.setProperty('--weight', String(Math.max(.1, p)));
    add(node, add(item, el('span', 'sub', part.title, {title:part.title}), el('div', `segment-fill ${part.kind ?? 'sky'}`, formatBytes(part.bytes))));
  }
  return node;
}
export function spaceBar(drive) {
  const free = percent(drive.free_bytes, drive.total_bytes), node = el('div', 'proportions');
  for (const [title, value, kind] of [[t('used'), 100 - free, 'ink'], [t('available'), free, 'sky']]) {
    const part = el('div', 'proportion'); part.style.setProperty('--weight', String(Math.max(.1, value)));
    add(node, add(part, el('span', 'sub', `${driveName(drive.root)} · ${title}`), el('div', `segment-fill ${kind}`, `${value.toFixed(0)}%`)));
  }
  return node;
}
export function progressBar(value) {
  const node = el('div', 'proportions');
  for (const [label, p, cls] of [[t('checked'), value, 'ink'], [t('remaining'), 100 - value, 'neutral']]) {
    const part = el('div', 'proportion'); part.style.setProperty('--weight', String(Math.max(.1, p)));
    add(node, add(part, el('span', 'sub', label), el('div', `segment-fill ${cls}`, `${p}%`)));
  }
  return node;
}
export function stems(points, label = t('spaceHistory'), projectedDays = 0) {
  const wrap = el('div', 'chart'), graph = svg('svg', {viewBox:'0 0 720 180', role:'img', 'aria-label':label});
  const max = points.reduce((m, p) => bytes(p.bytes) > m ? bytes(p.bytes) : m, 1n), total = points.length + projectedDays;
  for (const [i, p] of points.entries()) {
    const x = 12 + (i + .5) / Math.max(1, total) * 696, y = 154 - percent(p.bytes, max) * 1.3;
    add(graph, svg('line', {x1:x, y1:154, x2:x, y2:y, class:`stem ${p.kind ?? ''}`}), add(svg('circle', {cx:x, cy:y, r:3.5, class:`dot ${p.kind ?? ''}`}), add(svg('title'), document.createTextNode(`${p.label} · ${formatBytes(p.bytes)}`))));
  }
  const last = points.at(-1);
  for (let i = 1; i <= projectedDays; i++) {
    const x = 12 + (points.length + i - .5) / total * 696, y = 154 - (last ? percent(last.bytes, max) : 0) * 1.3 * (1 - i / projectedDays);
    add(graph, svg('line', {x1:x, y1:154, x2:x, y2:y, class:'stem projected'}), svg('circle', {cx:x, cy:y, r:2.5, class:'dot projected'}));
  }
  return add(wrap, graph, add(el('div', 'axis'), el('span', '', points[0]?.label ?? t('noRecords')), el('span', '', projectedDays ? t('predictedFull', {days:formatDays(projectedDays)}) : last?.label ?? '')));
}
export function treemap(items, {legend = true} = {}) {
  items = items.filter(item => bytes(item.bytes) > 0n);
  const root = el('div', 'treemap'), graph = svg('svg', {viewBox:'0 0 720 220', role:'img', 'aria-label':t('treeLabel')});
  const labels = el('div', 'tile-labels');
  const total = items.reduce((n, i) => n + bytes(i.bytes), 0n);
  let x = 0, y = 0, w = 720, h = 220, remaining = 100;
  for (const [i, item] of items.entries()) {
    const area = percent(item.bytes, total), fraction = remaining ? area / remaining : 0;
    const wide = w >= h, rw = wide ? w * fraction : w, rh = wide ? h : h * fraction;
    const g = svg('g', {class:`tile ${item.kind ?? `sky${i % 4 + 1}`}`});
    add(g, add(svg('title'), document.createTextNode(`${item.title} · ${formatBytes(item.bytes)}`)), svg('rect', {x:x + 2, y:y + 2, width:Math.max(0, rw - 4), height:Math.max(0, rh - 4), rx:3}));
    // Use a conservative glyph width; small tiles keep their complete label in the tooltip.
    if (rw > formatBytes(item.bytes).length * 13 + 20 && rh > 32) add(g, add(svg('text', {x:x + rw - 9, y:y + rh - 11, 'text-anchor':'end'}), document.createTextNode(formatBytes(item.bytes))));
    if (rw > item.title.length * 13 + 20 && rh > 65) add(g, add(svg('text', {x:x + 10, y:y + 20, class:'tile-label'}), document.createTextNode(item.title)));
    else if (legend) {
      if (rw > 20 && rh > 24) add(g, add(svg('text', {x:x + 8, y:y + 17, class:'tile-label'}), document.createTextNode(String(i + 1))));
      add(labels, el('span', 'tile-key', `${i + 1}. ${item.title}`));
    }
    add(graph, g); if (wide) { x += rw; w -= rw; } else { y += rh; h -= rh; } remaining = Math.max(0, remaining - area);
  }
  return add(root, graph, labels.children.length ? labels : null);
}
export function heatmap(entries) {
  const root = el('div', 'heatmap'); if (!entries.length) return root;
  const days = new Map(); let first = Infinity, last = 0, latest = null;
  for (const entry of entries) {
    const date = new Date(entry.at); date.setHours(0, 0, 0, 0);
    // An unreadable time has no day: skip it, or the walk below starts and ends at NaN and never stops.
    if (Number.isNaN(date.getTime())) continue;
    latest ??= entry;
    const key = localDateKey(date); first = Math.min(first, date.getTime()); last = Math.max(last, date.getTime());
    const existing = days.get(key) ?? []; existing.push(entry); days.set(key, existing);
  }
  if (!days.size) return root;
  const start = new Date(first), lastKey = localDateKey(last); start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  // Compare local calendar days, not timestamps: where DST skips midnight the walk lands on 01:00 and would miss the last day.
  for (const day = new Date(start); localDateKey(day) <= lastKey; day.setDate(day.getDate() + 1)) {
    const key = localDateKey(day);
    const records = days.get(key) ?? [], grade = e => ['clean', 'purge'].includes(e.kind) ? bytes(e.bytes) >= 8n * 1024n ** 3n ? 4 : bytes(e.bytes) >= 2n * 1024n ** 3n ? 3 : 2 : 1;
    const depth = records.reduce((m, e) => Math.max(m, grade(e)), 0);
    const cell = el('button', `heat depth-${depth}`, '', {type:'button', 'data-date':key, title:`${dateOnly(day)}${records.map(e => `\n${serviceText(e, 'summary')} · ${formatBytes(e.bytes)}`).join('')}`});
    if (records.includes(latest)) cell.classList.add('latest');
    cell.setAttribute('aria-label', cell.title); add(root, cell);
  }
  return root;
}
