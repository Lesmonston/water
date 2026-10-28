import {add, el, heading, progressRing, button, stopNote} from './common.mjs';
import {count} from '../format.mjs';
export function cleaning(state, actions) {
  const p = state.cleanProgress, page = add(el('section'), heading('正在清理', '每一项都会再次核对；正在使用或已经变化的文件会自动跳过。'));
  if (!p) return add(page, el('p', 'sub', '正在准备清理…'));
  const progress = p.total_items ? p.done_items / p.total_items * 100 : 0;
  return add(page, add(el('div', 'cleaning-grid'), progressRing(p.freed_bytes, '已释放', progress, true), add(el('div', 'glass cleaning-status'), el('p', 'cap', `第 ${p.group_index} / ${p.group_count} 组`), el('h2', '', p.current_group_title_zh ?? '正在核对清理结果'), el('p', 'sub', `已处理 ${count(p.done_items)} / ${count(p.total_items)} 项`), el('p', 'cap', '停止后，正在删除的这一项会停在中途，已经删掉的部分无法恢复。'), button('停止', actions.stopClean, 'btn btn-glass', 'clean-stop', state.pending), stopNote(state))));
}
