import {add, el, heading, metric, card, button, row, empty} from './common.mjs';
import {heatmap, blocks, proportions} from './charts.mjs';
import {formatBytes, dateTime} from '../format.mjs';
import {resultList} from './done.mjs';
export function history(s, a) {
  const list = s.history, page = add(el('section', 'screen'), heading('每一次，都记得', '每一次体检与清理，都有迹可循。'));
  if (!list) return add(page, el('p', 'sub', '正在读取记录…'));
  if (!list.length) return add(page, empty('还没有记录'));
  add(page, proportions(list.map(e => ({title:dateTime(e.at), bytes:e.bytes, kind:e.kind === 'clean' ? 'lime' : 'sky'}))));
  const left = el('div', 'history-content'), heat = card('每天');
  add(heat, el('p', 'sub', '一格一天，同一天取最深一级；悬停查看每条记录。'), heatmap(list), el('p', 'sub', '浅蓝：体检或其它操作 · 天蓝越深：当次释放越多'));
  add(left, heat);
  const rows = card('体检与清理记录');
  for (const e of list) {
    const b = button('', () => a.historyDetail(e), 'history-row', `history-${e.id}`); b.setAttribute('aria-expanded', String(s.historyOpen === e.id));
    add(b, row(e.summary_zh, dateTime(e.at), el('span', '', formatBytes(e.bytes)))); add(rows, b);
    if (s.historyOpen === e.id) {
      const detail = s.historyDetails.get(e.id);
      if (detail?.groups) add(rows, resultList(detail));
      else if (detail?.totals) add(rows, el('p', 'sub', `识别到 ${formatBytes(detail.totals.recognized_bytes)}`));
      else if (detail?.groups === undefined && detail?.extra_bytes) add(rows, el('p', 'sub', `多出来 ${formatBytes(detail.extra_bytes)}`));
      else add(rows, el('p', 'sub', e.summary_zh));
    }
  }
  add(left, rows);
  const main = card('最近几次清理', 'dark main-card');
  for (const e of list) if (['clean', 'purge'].includes(e.kind)) add(main, row(dateTime(e.at), e.summary_zh, el('span', '', formatBytes(e.bytes))));
  add(main, add(el('div', 'bottom'), button('查看上次结果', a.showResults, 'btn primary', 'history-last', a.busy())));
  return add(page, add(el('div', 'with-hero'), left, main));
}
