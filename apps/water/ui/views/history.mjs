import {t, serviceText} from './strings.mjs';
import {add, el, heading, card, button, row, empty} from './common.mjs';
import {heatmap, proportions} from './charts.mjs';
import {formatBytes, dateTime} from '../format.mjs';
import {resultList} from './done.mjs';
export function history(s, a) {
  const list = s.history, page = add(el('section', 'screen'), heading(t('historyTitle'), t('historySubtitle')));
  if (!list) return add(page, el('p', 'sub', t('loadingHistory')));
  if (!list.length) return add(page, empty(t('noHistory')));
  add(page, proportions(list.map(e => ({title:dateTime(e.at), bytes:e.bytes, kind:e.kind === 'clean' ? 'lime' : 'sky'}))));
  const left = el('div', 'history-content'), heat = card(t('daily'));
  add(heat, heatmap(list));
  add(left, heat);
  const rows = card(t('historyRecords'));
  for (const e of list) {
    const b = button('', () => a.historyDetail(e), 'history-row', `history-${e.id}`); b.setAttribute('aria-expanded', String(s.historyOpen === e.id));
    add(b, row(serviceText(e, 'summary'), dateTime(e.at), el('span', '', formatBytes(e.bytes)))); add(rows, b);
    if (s.historyOpen === e.id) {
      const detail = s.historyDetails.get(e.id);
      if (detail?.groups) add(rows, resultList(detail));
      else if (detail?.totals) add(rows, el('p', 'sub', t('recognized', {size:formatBytes(detail.totals.recognized_bytes)})));
      else if (detail?.groups === undefined && detail?.extra_bytes) add(rows, el('p', 'sub', t('extraSize', {size:formatBytes(detail.extra_bytes)})));
      else add(rows, el('p', 'sub', serviceText(e, 'summary')));
    }
  }
  add(left, rows);
  const main = card(t('recentCleanups'), 'dark main-card');
  for (const e of list) if (['clean', 'purge'].includes(e.kind)) add(main, row(dateTime(e.at), serviceText(e, 'summary'), el('span', '', formatBytes(e.bytes))));
  add(main, add(el('div', 'bottom'), button(t('lastResults'), a.showResults, 'btn primary', 'history-last', a.busy())));
  return add(page, add(el('div', 'with-hero'), left, main));
}
