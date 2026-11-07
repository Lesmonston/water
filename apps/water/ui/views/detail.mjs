import {add, el, button, iconButton, check, menu, row, heading, card, metric, search} from './common.mjs';
import {blocks} from './charts.mjs';
import {formatBytes} from '../format.mjs';
import {itemRow} from '../model.mjs';
export function detail(s, a) {
  const d = s.drawer.data, g = d.group, page = el('dialog', 'drawer', undefined, {'aria-labelledby':'drawer-title'}), disabled = a.busy() || s.conclusion?.stale;
  add(page, add(el('div', 'card-head'), el('h2', '', g.title_zh, {id:'drawer-title'}), iconButton('关闭抽屉', 'close', a.close, 'detail-close')), el('p', 'sub', d.after_zh), el('p', 'sub', d.why_zh), metric(g.total_bytes), blocks(g.eligible_bytes, g.total_bytes, 'lime'), search('找某一项', a.searchItems, 'drawer-search', s.drawer.query ?? ''));
  if (s.drawer.error) add(page, el('p', 'warning', s.drawer.error));
  const list = el('div', 'drawer-list');
  if (s.drawer.items) {
    add(page, button('返回汇总', a.summaryRows, 'btn soft', 'drawer-summary'));
    for (const i of s.drawer.items.items) {
      const choices = ['recommended', 'confirm'].includes(g.level) ? [['以后都跳过', () => a.skipItem(i.item_id)]] : [];
      add(list, add(el('div', 'item-row', undefined, {'data-item':i.item_id}), check(`选择${i.display_path}`, i.included, include => a.decide({item:i.item_id, include}), `item-${i.item_id}`, disabled || !i.eligible), row(i.display_path, [i.reason_zh, ...i.notes_zh].filter(Boolean).join('；'), el('span', '', formatBytes(i.total_bytes)), choices.length ? menu('条目菜单', choices, `item-menu-${i.item_id}`) : null)));
    }
    add(list, el('p', 'sub', `显示 ${s.drawer.items.items.length} / ${s.drawer.items.items_total} 项`));
  } else {
    for (const r of d.rows) {
      const choices = [];
      if (itemRow(g, r) && ['recommended', 'confirm'].includes(g.level)) choices.push(['以后都跳过', () => a.skipItem(r.row_id)]);
      if (r.expandable) choices.push(['展开看每一项', () => a.expandRow(r.row_id)]);
      const item = add(el('div', 'summary-row', undefined, {'data-row':r.row_id}), check(`选择${r.label_zh}`, r.included, include => a.decide({row:r.row_id, include}), `row-${r.row_id}`, disabled || !r.selectable), row(r.label_zh, r.release_zh, el('span', '', formatBytes(r.bytes)), choices.length ? menu('汇总行菜单', choices, `row-menu-${r.row_id}`) : null));
      add(list, item);
    }
    if (d.rows_note_zh) add(list, el('p', 'sub', d.rows_note_zh));
  }
  add(page, list, add(el('footer', 'drawer-foot'), el('span', '', '本次清理计划'), metric(s.conclusion.plan.bytes)));
  return page;
}
export function details(s, a) {
  const view = s.detailsView, page = add(el('section', 'screen'), heading('全部明细', '与你的结论页使用同一份清理计划'));
  const toolbar = el('div', 'toolbar'), seg = el('div', 'seg', undefined, {'aria-label':'明细显示方式'});
  for (const [mode, title] of [['category', '按类别'], ['location', '按位置']]) {
    const b = button(title, () => a.detailsMode(mode), s.detailMode === mode ? 'on' : '', `detail-mode-${mode}`); b.setAttribute('aria-pressed', String(s.detailMode === mode)); add(seg, b);
  }
  add(page, add(toolbar, seg, search('搜索分组', a.searchDetails, 'details-search', s.detailQuery)), button('返回结论', a.showResults, 'btn soft', 'details-back'));
  if (!view) return add(page, el('p', 'sub', '正在读取明细…'));
  const layout = el('div', 'with-hero'), list = card('分组', 'detail-sections');
  for (const section of view.sections) {
    const expanded = s.openSection === section.section_id, part = el('section', 'detail-section');
    const trigger = button(`${section.title_zh} · ${section.group_count} 组 · ${formatBytes(section.bytes)}`, () => a.openSection(section.section_id), 'section-toggle', `section-${section.section_id}`); trigger.setAttribute('aria-expanded', String(expanded)); add(part, trigger);
    if (expanded) {
      const renderRow = r => {
        const line = add(el('div', 'detail-row'), r.selectable ? check(`选择${r.title_zh}`, BigInt(r.chosen_bytes) > 0n, include => a.decide({group:r.row_key, choice:include ? 'clean' : 'keep'}), `group-${r.row_key}`, a.busy() || s.conclusion.stale) : null, row(r.title_zh, `${r.location_zh}${r.is_new ? ' · 新' : ''}`, el('span', '', formatBytes(r.bytes)), button('查看', () => a.detail(r.row_key), 'btn soft', `detail-${r.row_key}`)));
        line.hidden = !!s.detailQuery && !`${r.title_zh} ${r.location_zh}`.toLocaleLowerCase().includes(s.detailQuery.toLocaleLowerCase()); return line;
      };
      add(part, section.rows.map(renderRow));
      if (section.unchanged) {
        const same = add(el('details', 'unchanged'), el('summary', '', `和上次一样的 ${section.unchanged.count} 组 · ${formatBytes(section.unchanged.bytes)}`));
        add(same, section.unchanged.rows.map(renderRow)); add(part, same);
      }
    }
    add(list, part);
  }
  const main = add(card('本次清理', 'dark main-card'), metric(view.plan_bytes), el('p', 'sub', '勾选交给 Flick 重新核对'), add(el('div', 'bottom'), button(`清理所选 ${formatBytes(view.plan_bytes)}`, a.prepare, 'btn primary', 'details-prepare', a.busy() || s.conclusion.stale || BigInt(view.plan_bytes) === 0n)));
  return add(page, add(layout, list, main));
}
