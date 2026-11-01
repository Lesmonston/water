import {add, el, heading, progressRing, icon, button, stopNote} from './common.mjs';
import {formatBytes, count, elapsed} from '../format.mjs';
export function scan(state, actions) {
  const p = state.scanProgress;
  const page = add(el('section'), heading('正在体检', '可以切到别的页面，体检会在后台继续。'));
  if (!p) return add(page, el('p', 'sub', '正在准备体检…'));
  const steps = el('div', 'glass steps');
  for (const c of p.categories) {
    const line = el('i'); line.style.setProperty('--fill', c.state === 'done' ? '100%' : c.state === 'running' ? '45%' : '0%');
    add(steps, add(el('div', `step ${c.state}`), c.state === 'running' ? el('span', 'spin') : icon(c.state === 'done' ? 'check' : 'folder'), el('span', 'step-title', c.title_zh), add(el('div', 'bar'), line), el('span', 'cap', c.state === 'done' ? formatBytes(c.found_bytes) : c.state === 'running' ? '扫描中' : '等待')));
  }
  add(page, add(el('div', 'scan-grid'), progressRing(p.found_bytes, '已发现', p.percent), add(el('div'), steps, add(el('div', 'progress-foot'), el('span', 'cap', `已检查 ${count(p.visited_entries)} 个文件 · 用时 ${elapsed(p.elapsed_ms)}`), button('停止扫描', actions.stopScan, 'btn btn-glass', 'scan-stop', state.pending)), stopNote(state))));
  return page;
}
