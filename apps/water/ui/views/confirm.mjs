import {t, serviceText} from './strings.mjs';
import {add, el, button, row, skipNotice} from './common.mjs';
import {proportions} from './charts.mjs';
import {formatList, driveName, formatBytes} from '../format.mjs';
export function confirm(s, a) {
  const p = s.preview, panel = el('dialog', 'confirm', undefined, {'aria-labelledby':'confirm-title'});
  add(panel, el('h2', '', t('cleanQuestion', {size:formatBytes(p.total_bytes)}), {id:'confirm-title'}), s.replanNotice && add(el('p', 'replan-note', t('replanned'), {role:'status'}), s.replanNotice === 'quarantine' && el('span', 'replan-mode', t('replannedQuarantine'))), el('p', 'sub', `${t('items', {n:p.item_count})} · ${formatList(p.by_drive.map(d => `${driveName(d.root)} ${formatBytes(d.bytes)}`))}`), proportions([{title:t('directDelete'), bytes:p.delete.bytes, kind:'lime'}, ...(p.chosen ? [{title:t('yourSelection'), bytes:p.chosen.bytes, kind:'sky'}] : [])]));
  const direct = el('section', 'preview-delete');
  add(direct, el('h3', '', t('regenerates')));
  for (const c of p.delete.categories) add(direct, row(serviceText(c, 'title'), '', el('span', '', formatBytes(c.bytes)))); add(panel, direct);
  if (p.chosen) {
    const chosen = add(el('section', 'preview-chosen'), el('h3', '', t('yourSelection')));
    for (const item of p.chosen.items) add(chosen, row(serviceText(item, 'title'), '', el('span', '', formatBytes(item.bytes))));
    if (serviceText(p.chosen, 'note')) add(chosen, el('p', 'warning', serviceText(p.chosen, 'note')));
    const modes = el('div', 'choice-modes', undefined, {role:'radiogroup', 'aria-label':t('selectedHandling')});
    for (const [mode, label, note] of [['quarantine', t('quarantineFirst'), t('sameDriveRestore')], ['delete', t('directDelete'), t('immediateIrreversible')]]) {
      const input = el('input', '', undefined, {type:'radio', name:'chosen-mode', value:mode, 'data-key':`mode-${mode}`}); input.checked = p.chosen.mode === mode; input.disabled = s.pending;
      input.addEventListener('change', () => { if (input.checked) a.changeMode(mode); });
      add(modes, add(el('label', `mode-option ${input.checked ? 'on' : ''}`), input, add(el('div'), el('strong', '', label), el('p', 'sub', note))));
    }
    add(chosen, s.prepareSource === 'dedupe' ? el('p', '', t('duplicatesQuarantine')) : modes, el('p', 'sub', t('quarantineRelease'))); add(panel, chosen);
  }
  const dangerous = p.chosen?.mode === 'delete';
  add(panel, skipNotice(p.expected_skip), el('p', 'sub', t('directIrreversible')), add(el('div', 'dialog-actions'), button(t('cancel'), a.close, 'btn soft', 'confirm-cancel', s.pending), button(dangerous ? t('deleteSize', {size:formatBytes(p.total_bytes)}) : t('startClean'), a.startClean, `btn ${dangerous ? 'danger-solid' : 'ink'}`, 'confirm-start', s.pending)));
  return panel;
}
