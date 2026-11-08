import {t, serviceText} from './strings.mjs';
import {add, el, heading, metric, card, button, row, menu, tag} from './common.mjs';
import {dial, stems, proportions} from './charts.mjs';
import {approximate, formatDays, driveName, formatBytes, percent, dateOnly, dateTime} from '../format.mjs';
import {clusterStates} from '../model.mjs';
export function trends(s, a) {
  const data = s.trends, page = el('section', 'screen');
  if (!data) return add(page, heading(t('trends'), t('loading')));
  const system = s.app?.drives.find(d => d.is_system), f = data.forecast.find(f => f.root === system?.root), days = f?.days_to_full;
  const hasDaily = value => value && value.days_to_full !== null && BigInt(value.bytes_per_day) > 0n;
  const title = hasDaily(f) && days > 0 && days <= 90 ? t('driveFullIn', {drive:driveName(system.root), duration:approximate(formatDays(days))}) : t('spaceTrends');
  add(page, heading(title, '', hasDaily(f) ? [metric(f.bytes_per_day, t('dailyUse')), metric(f.basis_days, t('basisDays', {n:f.basis_days}), true)] : []));
  add(page, proportions(data.forecast.filter(hasDaily).map(f => ({title:t('driveDaily', {drive:driveName(f.root)}), bytes:f.bytes_per_day}))));
  const grid = el('div', 'with-hero'), left = el('div', 'trend-content');
  add(left, add(card(t('driveAvailableSpace', {drive:driveName(system?.root)})), stems(data.points.filter(p => p.root === system?.root).map(p => ({bytes:p.free_bytes, label:dateOnly(p.at)})), t('recordedForecast'), hasDaily(f) && days > 0 && days <= 90 ? days : 0)));
  const clusters = card(t('keepsGrowing'));
  for (const c of data.clusters) {
    const entries = [[t('markFixed'), () => a.markFixed(c.group_id, true)]];
    if (serviceText(c, 'copy_text')) entries.push([t('copyAgentLead'), () => a.copy(serviceText(c, 'copy_text'))]);
    add(clusters, row(serviceText(c, 'title'), serviceText(c, 'rate'), tag(clusterStates[c.state], c.state === 'growing' ? 'hot' : ''), menu(t('menu', {name:serviceText(c, 'title')}), entries, `cluster-${c.group_id}`)));
  }
  add(left, clusters);
  const others = card(t('otherDrives'));
  for (const other of data.forecast.filter(f => f !== data.forecast.find(x => x.root === system?.root))) {
    const drive = s.app?.drives.find(d => d.root === other.root), prediction = serviceText(other, 'note') ?? (other.days_to_full > 0 && other.days_to_full <= 90 ? t('fullIn', {duration:approximate(formatDays(other.days_to_full))}) : t('stable'));
    add(others, row(driveName(other.root), prediction, drive && dial(100 - percent(drive.free_bytes, drive.total_bytes), formatBytes(drive.free_bytes), t('available'), 'tiny')));
  }
  add(left, others);
  if (data.orphans) {
    const o = add(el('details', 'fold'), el('summary', '', t('orphanProcesses', {size:data.orphans.total_memory_bytes === null ? t('unknownMemory') : formatBytes(data.orphans.total_memory_bytes)})));
    for (const chain of data.orphans.chains) add(o, row(chain.name, t('processCount', {n:chain.process_count, time:dateTime(chain.started_at)}), el('span', '', chain.memory_bytes === null ? '—' : formatBytes(chain.memory_bytes))));
    add(left, o);
  }
  const main = card(system ? driveName(system.root) : t('diskCheckup'), 'dark main-card');
  if (system) add(main, add(el('div', 'dial-slot'), dial(100 - percent(system.free_bytes, system.total_bytes), formatBytes(system.free_bytes), t('freeTotal', {size:formatBytes(system.total_bytes)}))));
  if (f) add(main, hasDaily(f) && row(t('dailyUse'), '', el('span', '', formatBytes(f.bytes_per_day))), el('p', 'sub', serviceText(f, 'note') ?? (hasDaily(f) && days > 0 && days <= 90 ? t('fullIn', {duration:approximate(formatDays(days))}) : t('stable'))));
  add(main, add(el('div', 'bottom'), button(t('checkCommon'), a.scanCommon, 'btn primary', 'trend-scan', a.busy()))); return add(page, add(grid, left, main));
}
