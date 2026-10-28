import {add, el, metric, button, level, check, icon, catIcon, insight, empty} from './common.mjs';
import {formatBytes, bytes, percent, dateTime, count} from '../format.mjs';
import {levels, canSelect, selectedGroups, selectedBytes, sortedGroups, categoryOrder} from '../model.mjs';
export function results(state, actions) {
  const r = state.result, page = el('section');
  if (!r) return add(page, empty('尚未体检', '完成一次体检后，这里会显示按类别整理的结果。'), button('开始体检', actions.scan, 'btn btn-primary', 'scan-start', actions.busy()));
  const summary = add(el('div', 'glass spectrum'), add(el('div', 'split'), el('span', 'cap', '本次体检共识别'), el('b', '', formatBytes(r.totals.recognized_bytes))));
  const bar = el('div', 'spec-bar'), legend = el('div', 'legend');
  for (const key of ['recommended', 'confirm', 'advisory', 'protected']) {
    const segment = el('i', key); segment.style.setProperty('--fill', String(percent(r.totals[`${key}_bytes`], r.totals.recognized_bytes))); add(bar, segment);
    const b = button('', () => actions.filter(key), 'legend-item', `legend-${key}`); add(b, level(key), el('b', '', formatBytes(r.totals[`${key}_bytes`]))); add(legend, b);
  }
  add(summary, bar, legend);
  add(page, add(el('div', 'res-hero'), add(el('div'), el('p', 'cap', '可放心清理'), metric(r.totals.recommended_bytes), el('p', 'cap result-meta', `${r.recommended_by_drive.map(d => `${d.root.slice(0, 2)} ${formatBytes(d.bytes)}`).join(' · ')}　扫描于 ${dateTime(r.finished_at)}，用时 ${Math.round(r.duration_ms / 1000)} 秒`), r.status !== 'completed' ? el('p', 'growth', '部分结果') : null), summary));
  r.insights.forEach(i => add(page, insight(i, actions.detail)));
  if (state.stale && (state.error !== '结果已过期，请重新体检后再清理。' || state.reconnecting || state.pollPaused)) add(page, el('p', 'glass note', '结果已过期，请重新体检后再清理。'));
  const filters = el('div', 'seg', undefined, {'aria-label':'按级别过滤'});
  for (const [key, label] of [['all', '全部'], ...Object.entries(levels).filter(([key]) => key !== 'unrecognized')]) add(filters, button(label, () => actions.filter(key), `segment ${state.filter === key ? 'on' : ''}`, `filter-${key}`));
  const sort = el('div', 'seg', undefined, {'aria-label':'排序'});
  for (const [key, label] of [['bytes', '按体量'], ['growth', '按增长']]) add(sort, button(label, () => actions.sort(key), `segment ${state.sort === key ? 'on' : ''}`, `sort-${key}`));
  add(page, add(el('div', 'toolbar'), filters, sort));
  let visible = 0;
  for (const category of [...r.categories].sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category))) {
    const rows = sortedGroups(category.groups.filter(g => state.filter === 'all' || g.level === state.filter), state.sort);
    if (!rows.length) continue;
    visible += rows.length;
    const selectable = category.groups.filter(canSelect), selected = selectable.filter(g => state.selection.has(g.group_id));
    const selectedTotal = selected.reduce((n, g) => n + bytes(g.eligible_bytes), 0n);
    const checkbox = check(`全选${category.title_zh}`, !!selectable.length && selected.length === selectable.length, value => actions.selectCategory(category.category, value), `category-${category.category}`, selected.length > 0 && selected.length < selectable.length);
    checkbox.disabled = !selectable.length || actions.busy() || state.stale;
    const sheet = add(el('section', 'glass sheet'), add(el('div', 'sheet-head'), checkbox, add(el('div', 'cat-icon'), icon(catIcon(category.category))), add(el('div', 'grow-fill'), el('h2', '', category.title_zh), el('span', 'cap', category.subtitle_zh)), add(el('div', 'category-total'), el('b', '', formatBytes(category.total_bytes)), el('span', 'cap', `已选 ${formatBytes(selectedTotal)}`))));
    for (const g of rows) {
      let control;
      if (canSelect(g)) { control = check(`选择${g.title_zh}`, state.selection.has(g.group_id), value => actions.select(g.group_id, value), `select-${g.group_id}`); control.disabled = actions.busy() || state.stale; }
      else control = icon(g.level === 'protected' ? 'lock' : 'info', g.level);
      const text = add(el('span', 'group-text'), el('strong', '', g.title_zh), add(el('span', 'group-meta'), el('span', '', g.summary_zh), g.growth ? add(el('span', 'growth'), icon(bytes(g.growth.bytes_delta) < 0n ? 'down' : 'up'), document.createTextNode(formatBytes(g.growth.bytes_delta))) : null), g.in_use ? el('span', 'cap', g.in_use.process_label_zh) : null);
      const detail = button('', () => actions.detail(g.group_id), 'group-open', `detail-${g.group_id}`);
      detail.setAttribute('aria-label', `查看${g.title_zh}详情`);
      add(detail, text, level(g.level), el('span', 'group-size', formatBytes(g.total_bytes)), icon('chev', 'chevron'));
      add(sheet, add(el('div', `group-row ${canSelect(g) ? '' : 'muted'}`), control, detail));
    }
    add(page, sheet);
  }
  if (!visible) add(page, empty('没有符合条件的分组', '试试切换到“全部”。'));
  return page;
}
export function dock(state, actions) {
  if (!state.result) return null;
  const selected = selectedGroups(state.result, state.selection);
  return add(el('div', 'dock'), el('span', 'cap', `已选 ${count(selected.length)} 组`), el('b', '', formatBytes(selectedBytes(state.result, state.selection))), button('重新扫描', actions.scan, 'btn btn-glass', 'rescan', actions.busy()), button('清理所选', actions.prepare, 'btn btn-primary', 'clean-prepare', actions.busy() || !selected.length || state.stale));
}
