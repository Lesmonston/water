import {t, serviceText} from './strings.mjs';
import {add, el, heading, metric, card, button, tag} from './common.mjs';
import {dial, treemap, progressBar, blocks} from './charts.mjs';
import { count, elapsed} from '../format.mjs';
export function scan(s, a) {
  const p = s.scanProgress, page = el('section', 'screen');
  const phase = scanPhase(p);
  add(page, heading(t(phase.title), t('stopKeepsResults'), p ? [metric(p.found_bytes, t('found')), metric(count(p.visited_entries), t('filesChecked', {n:p.visited_entries}), true), metric(elapsed(p.elapsed_ms), t('elapsed'), true)] : []));
  if (!p) return add(page, el('p', 'sub', t('preparingScan')), button(t('stop'), a.stopScan, 'btn soft', 'scan-stop', s.pending));
  add(page, progressBar(p.percent));
  const grid = el('div', 'scan-grid'), main = card(t('progress'), 'dark main-card');
  add(main, add(el('div', 'dial-slot'), dial(p.percent, `${p.percent}%`)), add(el('div', 'bottom action-stack'), button(t('stop'), a.stopScan, 'btn primary', 'scan-stop', s.pending)));
  const locations = el('div', 'scan-locations');
  const list = el('div', 'scan-location-list');
  for (const [index, loc] of p.locations.entries()) {
    const state = phase.locations[index];
    const c = card(serviceText(loc, 'label'), 'scan-location', [tag(t({waiting:'waiting', running:'scanning', space:'measuringLocation', done:'complete'}[state] ?? 'scanning'), state === 'done' ? 'lime' : '')]);
    c.dataset.location = loc.location_id;
    add(c, metric(loc.found_bytes, t('found')), add(el('div', 'bottom'), blocks(loc.found_bytes, p.found_bytes, state === 'done' ? 'lime' : 'sky'))); add(list, c);
  }
  add(locations, list, add(card(t('foundSpace'), 'scan-chart'), treemap(p.categories.map(c => ({title:serviceText(c, 'title'), bytes:c.found_bytes})), {legend:false})));
  add(grid, main, locations); return add(page, grid);
}
function scanPhase(p) {
  return {title:p?.state === 'finishing' ? 'finishing' : p?.locations.some(l => l.state === 'space') ? 'measuring' : 'checking', locations:p?.locations.map(l => l.state) ?? []};
}
