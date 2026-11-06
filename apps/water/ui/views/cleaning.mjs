import {add, el, heading, metric, card, button} from './common.mjs';
import {dial} from './charts.mjs';
import {formatBytes} from '../format.mjs';
export function cleaning(s, a) {
  const p = s.cleanProgress, page = add(el('section', 'screen'), heading('正在清理', '每一项都会再次核对'));
  if (!p) return add(page, el('p', 'sub', '正在准备清理…'));
  const main = add(card(p.phase === 'quarantine' ? '放进隔离区' : '直接删除', 'dark main-card'), dial(p.total_items ? p.done_items / p.total_items * 100 : 0, `${p.done_items} / ${p.total_items}`, '已处理'), el('p', '', p.current_group_title_zh ?? '正在核对结果'), add(el('div', 'bottom action-stack'), el('p', 'sub', '停止后已经删掉的部分无法恢复。'), button('停止', a.stopClean, 'btn primary', 'clean-stop', s.pending)));
  return add(page, add(el('div', 'with-hero'), add(card('本次进度'), metric(p.freed_bytes, '已腾出'), metric(p.quarantined_bytes, '放进隔离区'), el('p', 'sub', `第 ${p.group_index} / ${p.group_count} 组`)), main));
}
