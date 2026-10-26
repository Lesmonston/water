import {add, el, button, level, icon} from './common.mjs';
import {formatBytes, count} from '../format.mjs';
export function confirm(preview, cancel, start) {
  const size = formatBytes(preview.total_bytes), panel = el('dialog', 'confirm', undefined, {'aria-labelledby':'confirm-title', 'aria-describedby':'permanent-warning'});
  add(panel, el('h1', '', `永久删除 ${size}？`, {id:'confirm-title'}), el('p', 'sub', `将清理 ${count(preview.groups.length)} 组，共 ${count(preview.item_count)} 项。`));
  const list = el('div', 'confirm-list', undefined, {tabindex:'0', 'aria-label':'所选分组清单'});
  for (const g of preview.groups) add(list, add(el('div', 'confirm-row'), add(el('div', 'grow-fill'), el('span', '', g.title_zh), g.level === 'confirm' ? level(g.level) : null, g.in_use_note_zh ? el('span', 'cap', g.in_use_note_zh) : null), el('b', '', formatBytes(g.total_bytes))));
  add(panel, list, el('p', 'cap', preview.by_drive.map(d => `${d.root.slice(0, 2)} ${formatBytes(d.bytes)}`).join(' · ')), add(el('p', 'danger-note', undefined, {id:'permanent-warning'}), icon('warn'), el('span', '', '这些文件将被永久删除，不进入回收站，无法恢复。')), el('p', 'cap', '执行前会再次检查每一项；正在使用、刚有改动或已经变化的项会自动跳过。'), add(el('div', 'dialog-actions'), button('取消', cancel, 'btn btn-glass', 'confirm-cancel'), button(`永久删除 ${size}`, start, 'btn btn-danger', 'confirm-start')));
  return panel;
}
