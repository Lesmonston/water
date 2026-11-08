import {t, serviceText, errorText, notesText} from './strings.mjs';
import {add, el, button, iconButton, check, menu, row, heading, card, metric, search} from './common.mjs';
import {blocks} from './charts.mjs';
import {formatBytes} from '../format.mjs';
export function detail(s, a) {
  const d = s.drawer.data, g = d.group, page = el('dialog', 'drawer', undefined, {'aria-labelledby':'drawer-title'}), disabled = a.busy() || s.conclusion?.stale;
  add(page, add(el('div', 'card-head'), el('h2', '', serviceText(g, 'title'), {id:'drawer-title'}), iconButton(t('closeDrawer'), 'close', a.close, 'detail-close')), el('p', 'sub', serviceText(d, 'after')), el('p', 'sub', serviceText(d, 'why')), metric(g.total_bytes), blocks(g.eligible_bytes, g.total_bytes, 'lime'), search(t('findItem'), a.searchItems, 'drawer-search', s.drawer.query ?? ''));
  if (s.drawer.error) add(page, el('p', 'warning', errorText(s.drawer.error)));
  const list = el('div', 'drawer-list');
  if (s.drawer.items) {
    add(page, button(t('backSummary'), a.summaryRows, 'btn soft', 'drawer-summary'));
    for (const i of s.drawer.items.items) {
      const choices = ['recommended', 'confirm'].includes(g.level) ? [[t('alwaysSkip'), () => a.skipItem(i.item_id)]] : [];
      add(list, add(el('div', 'item-row', undefined, {'data-item':i.item_id}), check(t('select', {name:i.display_path}), i.included, include => a.decide({item:i.item_id, include}), `item-${i.item_id}`, disabled || !i.eligible), row(i.display_path, notesText([serviceText(i, 'reason'), ...serviceText(i, 'notes')].filter(Boolean)), el('span', '', formatBytes(i.total_bytes)), choices.length ? menu(t('itemMenu'), choices, `item-menu-${i.item_id}`) : null)));
    }
    add(list, el('p', 'sub', t('itemCountShown', {shown:s.drawer.items.items.length, total:s.drawer.items.items_total})));
  } else {
    for (const r of d.rows) {
      const choices = [];
      if (r.skip === 'item') choices.push([t('alwaysSkip'), () => a.skipItem(r.row_id)]);
      else if (r.skip === 'unit') choices.push([t('alwaysSkip'), () => a.skipUnit(r.row_id)]);
      if (r.expandable) choices.push([t('expandItems'), () => a.expandRow(r.row_id)]);
      const item = add(el('div', 'summary-row', undefined, {'data-row':r.row_id}), check(t('select', {name:serviceText(r, 'label')}), r.included, include => a.decide({row:r.row_id, include}), `row-${r.row_id}`, disabled || !r.selectable), row(serviceText(r, 'label'), serviceText(r, 'release'), el('span', '', formatBytes(r.bytes)), choices.length ? menu(t('summaryMenu'), choices, `row-menu-${r.row_id}`) : null));
      add(list, item);
    }
    if (serviceText(d, 'rows_note')) add(list, el('p', 'sub', serviceText(d, 'rows_note')));
  }
  add(page, list, add(el('footer', 'drawer-foot'), el('span', '', t('cleanupPlan')), metric(s.conclusion.plan.bytes)));
  return page;
}
export function details(s, a) {
  const view = s.detailsView, page = add(el('section', 'screen'), heading(t('detailsTitle'), t('sharedPlan')));
  const toolbar = el('div', 'toolbar'), seg = el('div', 'seg', undefined, {'aria-label':t('detailsMode')});
  for (const [mode, title] of [['category', t('byCategory')], ['location', t('byLocation')]]) {
    const b = button(title, () => a.detailsMode(mode), s.detailMode === mode ? 'on' : '', `detail-mode-${mode}`); b.setAttribute('aria-pressed', String(s.detailMode === mode)); add(seg, b);
  }
  add(page, add(toolbar, seg, search(t('searchGroups'), a.searchDetails, 'details-search', s.detailQuery)), button(t('backResults'), a.showResults, 'btn soft', 'details-back'));
  if (!view) return add(page, el('p', 'sub', t('loadingDetails')));
  const layout = el('div', 'with-hero'), list = card(t('groups'), 'detail-sections');
  for (const section of view.sections) {
    const expanded = s.openSection === section.section_id, part = el('section', 'detail-section');
    const trigger = button(t('sectionSummary', {title:serviceText(section, 'title'), n:section.group_count, size:formatBytes(section.bytes)}), () => a.openSection(section.section_id), 'section-toggle', `section-${section.section_id}`); trigger.setAttribute('aria-expanded', String(expanded)); add(part, trigger);
    if (expanded) {
      const renderRow = r => {
        const line = add(el('div', 'detail-row'), r.selectable ? check(t('select', {name:serviceText(r, 'title')}), BigInt(r.chosen_bytes) > 0n, include => a.decide({group:r.row_key, choice:include ? 'clean' : 'keep'}), `group-${r.row_key}`, a.busy() || s.conclusion.stale) : null, row(serviceText(r, 'title'), `${serviceText(r, 'location')}${r.is_new ? t('newSuffix') : ''}`, el('span', '', formatBytes(r.bytes)), button(t('view'), () => a.detail(r.row_key), 'btn soft', `detail-${r.row_key}`)));
        line.hidden = !!s.detailQuery && !`${serviceText(r, 'title')} ${serviceText(r, 'location')}`.toLocaleLowerCase().includes(s.detailQuery.toLocaleLowerCase()); return line;
      };
      add(part, section.rows.map(renderRow));
      if (section.unchanged) {
        const same = add(el('details', 'unchanged'), el('summary', '', t('unchanged', {n:section.unchanged.count, size:formatBytes(section.unchanged.bytes)})));
        add(same, section.unchanged.rows.map(renderRow)); add(part, same);
      }
    }
    add(list, part);
  }
  const main = add(card(t('thisCleanup'), 'dark main-card'), metric(view.plan_bytes), add(el('div', 'bottom'), button(t('cleanSelection', {size:formatBytes(view.plan_bytes)}), a.prepare, 'btn primary', 'details-prepare', a.busy() || s.conclusion.stale || BigInt(view.plan_bytes) === 0n)));
  return add(page, add(layout, list, main));
}
