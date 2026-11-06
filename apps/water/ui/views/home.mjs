import {add, el, heading, metric, card, button, icon, menu, row, empty} from './common.mjs';
import {dial, stems, spaceBar} from './charts.mjs';
import {formatBytes, percent, relativeTime, byteDelta} from '../format.mjs';
export function home(s, a) {
  const app = s.app, page = el('section', 'screen home-screen');
  if (!app) return add(page, heading('这次检查哪里？', '磁盘体检'), empty(s.connecting ? '正在读取…' : '无法连接 Water 服务'), button('重新连接', a.connect, 'btn soft', 'reconnect', s.pending));
  const system = app.drives.find(d => d.is_system), last = app.last_scan;
  add(page, heading('这次检查哪里？', '磁盘体检', [system && metric(system.free_bytes, `${system.root.slice(0, 1)} 盘可用`), last && metric(last.recommended_bytes, '上次可清'), app.quarantine && metric(app.quarantine.bytes, '隔离区')]));
  if (system) add(page, spaceBar(system));
  const grid = el('div', 'home-grid'), drives = el('div', 'drive-grid');
  for (const d of app.drives) {
    const forecast = s.trends?.forecast?.find(f => f.root === d.root);
    const c = card(`${d.root.slice(0, 1)} 盘`, d.is_system ? 'system-drive' : 'small-drive');
    add(c, el('p', 'sub', d.label_zh), add(el('div', 'dial-slot'), dial(100 - percent(d.free_bytes, d.total_bytes), formatBytes(d.free_bytes), `可用 · 共 ${formatBytes(d.total_bytes)}`, d.is_system ? '' : 'small')),
      el('p', 'sub bottom', forecast?.days_to_full && forecast.days_to_full <= 90 ? `约 ${forecast.days_to_full} 天后满` : forecast?.note_zh ?? ''));
    add(drives, c);
  }
  const chart = card('可用空间记录', 'home-chart');
  add(chart, stems((s.trends?.points ?? []).filter(p => p.root === system?.root).map(p => ({bytes:p.free_bytes, label:p.at.slice(5, 10)}))));
  add(drives, chart); add(grid, drives);
  const main = card('本次体检', 'dark main-card');
  add(main, el('p', 'sub', '只读取名字、大小与时间'));
  const locationList = el('div', 'location-list');
  for (const loc of s.locations?.home ?? []) {
    const selected = s.selectedLocations.has(loc.location_id);
    const b = button('', () => a.selectLocation(loc.location_id), 'location-select', `location-${loc.location_id}`, a.busy());
    b.setAttribute('aria-pressed', String(selected)); b.title = loc.display_path ?? loc.label_zh;
    add(b, icon(loc.kind === 'folder' ? 'folder' : 'drive'), add(el('span', 'grow'), el('strong', '', loc.label_zh), el('small', 'sub', loc.kind === 'folder' ? '文件夹' : loc.kind === 'drive' ? '整盘' : '常用位置')), el('span', `selection-mark ${selected ? 'on' : ''}`, selected ? '✓' : ''));
    const entries = [['查重复文件', () => a.dedupeIntro(loc)]];
    if (loc.kind === 'folder') entries.push(['从列表移除', () => a.removeRoot(loc.location_id)]);
    add(locationList, add(el('div', 'location-row'), b, loc.kind !== 'common' ? menu(`${loc.label_zh}菜单`, entries, `location-menu-${loc.location_id}`) : null));
  }
  add(main, locationList, add(el('div', 'bottom action-stack'), button('加文件夹', a.addRoot, 'btn ghost', 'add-root', a.busy()), button('开始体检', a.scan, 'btn primary', 'scan-start', a.busy() || !s.selectedLocations.size)));
  add(grid, main); add(page, grid);
  if (app.quarantine) add(page, row(app.quarantine.text_zh, '', button('打开文件夹', a.revealRoots, 'btn soft', 'home-reveal'), button('去隔离区', () => a.navigate('quarantine'), 'btn soft', 'home-quarantine')));
  if (last) add(page, row(`上次体检 · ${relativeTime(last.finished_at)}`, last.added_7d_bytes !== null ? `比 7 天前多了 ${byteDelta(last.added_7d_bytes)}` : '', button('查看结果', a.showResults, 'btn soft', 'view-results', a.busy())));
  if (app.checkup_due) add(page, el('p', 'sub reminder', app.checkup_due.days_since_last === null ? '还没有体检过' : `已经 ${app.checkup_due.days_since_last} 天没有体检`));
  return page;
}
