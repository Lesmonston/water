import {add, el, button, metric, row, skipNotice} from './common.mjs';
import {proportions} from './charts.mjs';
import {formatBytes} from '../format.mjs';
export function confirm(s, a) {
  const p = s.preview, panel = el('dialog', 'confirm', undefined, {'aria-labelledby':'confirm-title'});
  add(panel, el('h2', '', `清理 ${formatBytes(p.total_bytes)}？`, {id:'confirm-title'}), el('p', 'sub', `${p.item_count} 项 · ${p.by_drive.map(d => `${d.root.slice(0, 1)} 盘 ${formatBytes(d.bytes)}`).join('、')}`), proportions([{title:'直接删除', bytes:p.delete.bytes, kind:'lime'}, ...(p.chosen ? [{title:'你选的', bytes:p.chosen.bytes, kind:'sky'}] : [])]));
  const direct = el('section', 'preview-delete');
  add(direct, el('h3', '', '直接删除 · 会自动重新生成'));
  for (const c of p.delete.categories) add(direct, row(c.title_zh, '', el('span', '', formatBytes(c.bytes)))); add(panel, direct);
  if (p.chosen) {
    const chosen = add(el('section', 'preview-chosen'), el('h3', '', '你选的'));
    for (const item of p.chosen.items) add(chosen, row(item.title_zh, '', el('span', '', formatBytes(item.bytes))));
    if (p.chosen.note_zh) add(chosen, el('p', 'warning', p.chosen.note_zh));
    const modes = el('div', 'choice-modes', undefined, {role:'radiogroup', 'aria-label':'你选的部分怎么处理'});
    for (const [mode, label, note] of [['quarantine', '先放进隔离区', '仍在原来的盘上，可以还原'], ['delete', '直接删除', '马上腾出，不能恢复']]) {
      const input = el('input', '', undefined, {type:'radio', name:'chosen-mode', value:mode, 'data-key':`mode-${mode}`}); input.checked = p.chosen.mode === mode; input.disabled = s.pending;
      input.addEventListener('change', () => { if (input.checked) a.changeMode(mode); });
      add(modes, add(el('label', `mode-option ${input.checked ? 'on' : ''}`), input, add(el('div'), el('strong', '', label), el('p', 'sub', note))));
    }
    add(chosen, s.prepareSource === 'dedupe' ? el('p', '', '重复文件先放进隔离区') : modes, el('p', 'sub', '隔离的部分要等你永久删除后才腾出空间。')); add(panel, chosen);
  }
  const dangerous = p.chosen?.mode === 'delete';
  add(panel, skipNotice(p.expected_skip), el('p', 'sub', '直接删除的部分不进入回收站，无法恢复。'), add(el('div', 'dialog-actions'), button('取消', a.close, 'btn soft', 'confirm-cancel', s.pending), button(dangerous ? `删除 ${formatBytes(p.total_bytes)}` : '开始清理', a.startClean, `btn ${dangerous ? 'danger-solid' : 'ink'}`, 'confirm-start', s.pending)));
  return panel;
}
