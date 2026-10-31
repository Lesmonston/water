import {add, el, heading, icon, catIcon, button} from './common.mjs';
import {formatBytes, relativeTime, middlePath, dateTime} from '../format.mjs';
export function locations(state, actions) {
  const page = add(el('section'), heading('扫描位置', '选择体检要看的地方。受保护的数据只统计占用，永远不会被清理。'));
  if (!state.locations) return add(page, el('p', 'sub', '正在读取扫描位置…'));
  const categories = el('div', 'glass locations');
  for (const category of state.locations.categories) {
    const toggle = button('', () => actions.toggleCategory(category.category, !category.enabled), `switch ${category.enabled ? 'on' : ''}`, `location-${category.category}`, category.locked || actions.busy());
    toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-checked', String(category.enabled)); toggle.setAttribute('aria-label', category.title_zh);
    add(categories, add(el('div', 'location-row'), add(el('div', 'cat-icon'), icon(catIcon(category.category))), add(el('div', 'grow-fill'), el('h2', '', category.title_zh), el('p', 'cap', category.description_zh), category.locked ? el('p', 'cap', '受保护的数据只扫描体量，此项不能关闭。') : null), toggle));
  }
  add(page, categories, el('h2', 'section-title', '自定义文件夹'));
  const custom = el('div', 'glass custom-roots');
  for (const root of state.locations.custom_roots) add(custom, add(el('div', 'location-row'), add(el('div', 'cat-icon'), icon('folder')), add(el('div', 'grow-fill'), el('strong', root.is_drive_root ? '' : 'path', root.is_drive_root ? `整个 ${root.display_path.slice(0, 1)} 盘` : middlePath(root.display_path), {title:root.display_path}), el('p', 'cap', `上次扫描 ${relativeTime(root.last_scanned_at)}${root.found_bytes != null ? ' · 识别到 ' + formatBytes(root.found_bytes) : ''}`)), button('移除', () => actions.removeRoot(root.root_id), 'btn btn-ghost', `remove-${root.root_id}`, actions.busy())));
  add(custom, add(el('div', 'location-row'), button('添加文件夹', actions.addRoot, 'btn btn-glass', 'add-root', actions.busy()), el('span', 'cap', '通过系统文件夹选择框添加。也可以选择整个非系统盘')));
  add(page, custom, el('p', 'glass note', '在自定义文件夹里只识别带缓存标记的构建目录、测试浏览器配置等明确的开发垃圾。'));
  if (state.locations.skipped?.length) {
    const skipped = el('div', 'glass skipped-roots');
    for (const item of state.locations.skipped) add(skipped, add(el('div', 'location-row'), add(el('div', 'grow-fill'), el('strong', 'path', middlePath(item.display_path), {title:item.display_path}), el('p', 'cap', `加入于 ${dateTime(item.added_at)}`)), button('恢复', () => actions.restoreSkip(item.skip_id), 'btn btn-ghost', `restore-${item.skip_id}`, actions.busy())));
    add(page, el('h2', 'section-title', '以后都跳过的文件夹'), skipped);
  }
  return page;
}
