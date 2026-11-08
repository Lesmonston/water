import {t, serviceText} from './strings.mjs';
import {add, el, heading, metric, card, button, iconButton, menu, row, toggle, skipNotice} from './common.mjs';
import {treemap, proportions} from './charts.mjs';
import {formatList, formatBytes, relativeTime} from '../format.mjs';
import {viewCards, cleanLabel} from '../model.mjs';
export function results(s, a) {
  const v = s.conclusion, p = v.plan, page = el('section', 'screen conclusion');
  add(page, heading(BigInt(p.bytes) === 0n ? t('nothingSafe') : t('safeClean'), `${v.scope.only_folder ? t('folderOnly') : ''}${formatList(serviceText(v.scope, 'labels'))} · ${relativeTime(v.finished_at)}${v.status === 'partial' ? t('partialSuffix') : ''}`, [metric(p.delete_bytes, t('recommendedDelete')), metric(p.chosen_bytes, t('yourSelection')), metric(p.bytes, t('thisPlan'))]));
  if (v.stale) add(page, el('p', 'warning stale', t('stale')));
  if (s.scanCancelled || v.status === 'cancelled') add(page, el('p', 'cancelled-note', t('cancelled'), {role:'status'}));
  add(page, proportions(p.categories.map(c => ({title:serviceText(c, 'title'), bytes:c.bytes, kind:c.included ? 'sky' : 'neutral'}))));
  const grid = el('div', 'results-grid'), main = card(t('thisCleanup'), 'dark main-card', [iconButton(t('checkAgain'), 'refresh', a.chooseLocations, 'rescan')]);
  add(main, metric(p.bytes), add(el('details', 'plan-summary'), el('summary', '', t('planDetails')), el('p', 'sub summary', serviceText(p, 'summary'))), el('h3', 'sub', t('includes')));
  const categories = el('div', 'plan-categories');
  for (const c of p.categories) add(categories, row(serviceText(c, 'title'), c.is_new ? t('new') : '', el('span', 'sub', formatBytes(c.bytes)), toggle(serviceText(c, 'title'), c.included, () => a.decide({category:c.category_id, include:!c.included}), `category-${c.category_id}`, a.busy() || v.stale)));
  add(main, categories);
  add(main, add(el('div', 'bottom action-stack'), skipNotice(p.expected_skip), BigInt(p.bytes) > 0n ? button(`${cleanLabel(p)} ${formatBytes(p.bytes)}`, a.prepare, 'btn primary', 'clean-prepare', a.busy() || v.stale) : null));
  const content = el('div', 'result-content'), cards = el('section', 'judgments scroll-card');
  if (v.cards.length) cards.setAttribute('aria-label', t('worthLook'));
  for (const c of viewCards(v)) {
    const entries = [];
    if (c.menu.includes('skip')) entries.push([t('alwaysSkip'), () => a.skipUnit(c.card_id)]);
    if (c.menu.includes('detail')) entries.push([t('viewDetails'), () => a.detail(c.group_id)]);
    const clue = v.clues.find(x => x.clue_id === c.clue_id);
    if (c.menu.includes('copy_clue') && clue) entries.push([t('copyAgentLead'), () => a.copy(serviceText(clue, 'copy_text'))]);
    const node = card(serviceText(c, 'title'), `judgment ${c.decision !== 'undecided' ? 'decided' : ''}`, [menu(t('menu', {name:serviceText(c, 'title')}), entries, `card-menu-${c.group_id}`)]);
    node.dataset.card = c.card_id; node.dataset.group = c.group_id; node.tabIndex = 0;
    node.addEventListener('keydown', event => {
      if (event.target !== node || a.busy() || v.stale) return;
      if (event.key === 'Enter' || event.key === 'Delete') { event.preventDefault(); a.decide({group:c.group_id, choice:event.key === 'Enter' ? 'clean' : 'keep'}); }
    });
    if (c.decision === 'undecided') add(node, el('p', 'sub evidence', serviceText(c, 'evidence'), {title:serviceText(c, 'evidence')}), metric(c.bytes), serviceText(c, 'warning') && el('p', 'warning', serviceText(c, 'warning'), {title:serviceText(c, 'warning')}), serviceText(c, 'decided_before') && el('p', 'sub', serviceText(c, 'decided_before'), {title:serviceText(c, 'decided_before')}), add(el('div', 'bottom pair'), button(t('keep'), () => a.decide({group:c.group_id, choice:'keep'}), 'btn soft', `keep-${c.group_id}`, a.busy() || v.stale), button(t('clean'), () => a.decide({group:c.group_id, choice:'clean'}), 'btn lime', `clean-${c.group_id}`, a.busy() || v.stale)));
    else add(node, el('p', 'decided-text', c.decision === 'clean' ? t('addedClean', {size:formatBytes(c.bytes)}) : t('kept')), button(t('undo'), () => a.decide({group:c.group_id, choice:'undecided'}), 'btn soft', `undo-${c.group_id}`, a.busy() || v.stale));
    add(cards, node);
  }
  add(content, cards);
  for (const extra of [v.more_cards, v.kept_before]) if (extra) add(content, button(`${serviceText(extra, 'text')} ›`, a.details, 'summary-link', extra === v.more_cards ? 'more-cards' : 'kept-before'));
  const lower = el('div', 'result-lower');
  if (p.categories.length || v.cards.length) add(lower, add(card(t('cleanableNow'), 'treemap-card'), treemap([...p.categories.map(c => ({title:serviceText(c, 'title'), bytes:c.bytes})), ...v.cards.map(c => ({title:serviceText(c, 'title'), bytes:c.bytes, kind:c.decision === 'clean' ? 'selected' : 'look'}))], {legend:false})));
  else add(lower, add(card(t('noCleanup')), el('p', 'sub', t('protectedRemain'))));
  const clues = card(t('forAgent'), 'clues');
  for (const clue of v.clues) add(clues, row(serviceText(clue, 'text'), '', iconButton(t('copyLead'), 'copy', () => a.copy(serviceText(clue, 'copy_text')), `copy-${clue.clue_id}`)));
  if (v.more_clues) add(clues, button(t('moreLeads', {n:v.more_clues}), () => a.navigate('trends'), 'summary-link', 'more-clues'));
  if (v.clues.length || v.more_clues) add(lower, clues);
  add(content, lower); add(grid, main, content); add(page, grid);
  const folds = el('section', 'folds scroll-card');
  for (const fold of v.folds) {
    const details = el('details', 'fold'); details.open = s.openFolds.has(fold.kind);
    details.addEventListener('toggle', () => {
      if (!details.open) { s.openFolds.delete(fold.kind); return; }
      const alreadyOpen = s.openFolds.has(fold.kind); s.openFolds.add(fold.kind);
      if (!alreadyOpen) {
        const body = details.querySelector('.fold-rows');
        folds.scrollTop += Math.max(0, body.getBoundingClientRect().bottom - folds.getBoundingClientRect().bottom);
      }
    });
    add(details, el('summary', '', serviceText(fold, 'text'), {'data-key':`fold-${fold.kind}`}));
    const body = el('div', 'fold-rows');
    for (const item of fold.rows) {
      const entry = row(serviceText(item, 'title'), serviceText(item, 'note'), item.bytes !== null && el('span', '', formatBytes(item.bytes)));
      entry.querySelector('strong').title = serviceText(item, 'title');
      if (entry.querySelector('.sub')) entry.querySelector('.sub').title = serviceText(item, 'note');
      add(body, entry);
    }
    add(details, body); add(folds, details);
  }
  add(page, folds);
  add(page, button(t('allDetails'), a.details, 'summary-link', 'details-open'));
  return page;
}
