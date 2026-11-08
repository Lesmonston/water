import {t, serviceText} from './strings.mjs';
import {add, el, heading, metric, card, button, icon, menu, row, empty} from './common.mjs';
import {dial, stems, spaceBar} from './charts.mjs';
import {formatBytes, percent, relativeTime, byteDelta, dateOnly} from '../format.mjs';
export function home(s, a) {
  const app = s.app, page = el('section', 'screen home-screen');
  if (!app) return add(page, heading(t('where'), t('diskCheckup')), empty(s.connecting ? t('loading') : t('unavailable')), button(t('reconnect'), a.connect, 'btn soft', 'reconnect', s.pending));
  const system = app.drives.find(d => d.is_system), last = app.last_scan;
  add(page, heading(t('where'), t('diskCheckup'), [system && metric(system.free_bytes, t('driveFree', {drive:t('drive', {letter:system.root.slice(0, 1)})})), last && metric(last.recommended_bytes, t('lastCleanable')), app.quarantine && metric(app.quarantine.bytes, t('quarantine'))]));
  if (system) add(page, spaceBar(system));
  const grid = el('div', 'home-grid'), drives = el('div', 'drive-grid');
  for (const d of app.drives) {
    const forecast = s.trends?.forecast?.find(f => f.root === d.root);
    const c = card(t('drive', {letter:d.root.slice(0, 1)}), d.is_system ? 'system-drive' : 'small-drive');
    add(c, el('p', 'sub', serviceText(d, 'label')), add(el('div', 'dial-slot'), dial(100 - percent(d.free_bytes, d.total_bytes), formatBytes(d.free_bytes), t('freeTotal', {size:formatBytes(d.total_bytes)}), d.is_system ? '' : 'small')),
      el('p', 'sub bottom', forecast?.days_to_full && forecast.days_to_full <= 90 ? t('fullIn', {n:forecast.days_to_full}) : serviceText(forecast, 'note') ?? ''));
    add(drives, c);
  }
  const chart = card(t('freeSpaceHistory'), 'home-chart');
  add(chart, stems((s.trends?.points ?? []).filter(p => p.root === system?.root).map(p => ({bytes:p.free_bytes, label:dateOnly(p.at)}))));
  add(drives, chart); add(grid, drives);
  const main = card(t('thisCheckup'), 'dark main-card');
  const locationList = el('div', 'location-list');
  for (const loc of s.locations?.home ?? []) {
    const selected = s.selectedLocations.has(loc.location_id);
    const b = button('', () => a.selectLocation(loc.location_id), 'location-select', `location-${loc.location_id}`, a.busy());
    b.setAttribute('aria-pressed', String(selected)); b.title = loc.display_path ?? serviceText(loc, 'label');
    add(b, icon(loc.kind === 'folder' ? 'folder' : 'drive'), add(el('span', 'grow'), el('strong', '', serviceText(loc, 'label')), el('small', 'sub', loc.kind === 'folder' ? t('folder') : loc.kind === 'drive' ? t('wholeDrive') : t('commonLocations'))), el('span', `selection-mark ${selected ? 'on' : ''}`, selected ? '✓' : ''));
    const entries = [[t('findDuplicates'), () => a.dedupeIntro(loc)]];
    if (loc.kind === 'folder') entries.push([t('removeLocation'), () => a.removeRoot(loc.location_id)]);
    add(locationList, add(el('div', 'location-row'), b, loc.kind !== 'common' ? menu(t('menu', {name:serviceText(loc, 'label')}), entries, `location-menu-${loc.location_id}`) : null));
  }
  add(main, locationList, add(el('div', 'bottom action-stack'), button(t('addFolder'), a.addRoot, 'btn ghost', 'add-root', a.busy()), button(t('startCheckup'), a.scan, 'btn primary', 'scan-start', a.busy() || !s.selectedLocations.size)));
  add(grid, main); add(page, grid);
  if (app.quarantine) add(page, row(serviceText(app.quarantine, 'text'), '', button(t('openFolder'), a.revealRoots, 'btn soft', 'home-reveal'), button(t('goQuarantine'), () => a.navigate('quarantine'), 'btn soft', 'home-quarantine')));
  if (last) add(page, row(t('lastCheckup', {time:relativeTime(last.finished_at)}), last.added_7d_bytes !== null ? t('moreThanWeek', {size:byteDelta(last.added_7d_bytes)}) : '', button(t('viewResults'), a.showResults, 'btn soft', 'view-results', a.busy())));
  if (app.checkup_due) add(page, el('p', 'sub reminder', app.checkup_due.days_since_last === null ? t('neverChecked') : t('daysSince', {n:app.checkup_due.days_since_last})));
  return page;
}
