import {t, serviceText, notesText} from './strings.mjs';
import {add, el, heading, metric, card, button, row} from './common.mjs';
import {dial, blocks, proportions} from './charts.mjs';
import {formatBytes, percent, dateTime} from '../format.mjs';
export function resultList(r) {
  const list = el('div', 'result-list'), labels = {done:t('cleaned'), partial:t('partial'), skipped:t('skipped'), failed:t('failed'), quarantined:t('quarantined')};
  const max = r.groups.reduce((m, g) => BigInt(g.freed_bytes) > m ? BigInt(g.freed_bytes) : m, 1n);
  for (const g of r.groups) add(list, row(serviceText(g, 'title'), `${labels[g.status]}${serviceText(g, 'notes').length ? ' · ' + notesText(serviceText(g, 'notes')) : ''}`, blocks(g.freed_bytes, max), el('span', '', formatBytes(g.freed_bytes)))); return list;
}
export function done(s, a) {
  const r = s.cleaned, page = add(el('section', 'screen'), heading(t('cleanDone'), dateTime(r.finished_at), [metric(r.freed_bytes, t('freed')), r.quarantined && metric(r.quarantined.bytes, t('quarantined')), metric(r.estimate_bytes, t('estimatedRelease'))]));
  add(page, proportions([{title:t('freed'), bytes:r.freed_bytes, kind:'lime'}, ...(r.quarantined ? [{title:t('quarantine'), bytes:r.quarantined.bytes}] : [])]));
  const grid = el('div', 'with-hero'), content = el('div', 'done-content'), drives = el('div', 'done-drives');
  for (const d of r.drives) { const source = s.app.drives.find(x => x.root === d.root); add(drives, add(card(t('drive', {letter:d.root.slice(0, 1)})), dial(source ? 100 - percent(d.free_after, source.total_bytes) : 0, formatBytes(d.free_after), t('freeBefore', {size:formatBytes(d.free_before)}), '', source ? [100 - percent(d.free_after, source.total_bytes), 100 - percent(d.free_before, source.total_bytes)] : null))); }
  add(content, drives, add(card(t('groupResults')), resultList(r)));
  const main = add(card(t('thisCleanup'), 'dark main-card'), metric(r.freed_bytes, t('freed')), el('p', 'sub', t('estimated', {size:formatBytes(r.estimate_bytes)})));
  if (r.quarantined) add(main, el('p', '', t('moreQuarantined', {size:formatBytes(r.quarantined.bytes)})), serviceText(r.quarantined, 'notes').map(n => el('p', 'sub', n)));
  if (r.groups.some(g => ['partial', 'skipped', 'failed'].includes(g.status))) add(main, el('p', 'warning', t('partialResults')));
  if (serviceText(r, 'journal_note')) add(main, el('p', 'warning', serviceText(r, 'journal_note')));
  add(main, add(el('div', 'bottom action-stack'), r.quarantined && button(t('goQuarantine'), () => a.navigate('quarantine'), 'btn ghost', 'done-quarantine'), button(t('complete'), a.finish, 'btn primary', 'done-finish')));
  return add(page, add(grid, content, main));
}
