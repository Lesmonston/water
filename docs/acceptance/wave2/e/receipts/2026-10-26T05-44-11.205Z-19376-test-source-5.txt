import {bytes} from './format.mjs';
export const levels = Object.freeze({recommended:'推荐清理', confirm:'需要确认', advisory:'仅供参考', protected:'受保护', unrecognized:'未识别'});
export const categoryOrder = ['agent_tool', 'browser', 'system_temp', 'app_leftover', 'dev_cache', 'crash_log', 'gpu_system', 'custom', 'unrecognized'];
export function groups(result) { return result?.categories.flatMap(c => c.groups) ?? []; }
export function canSelect(group) { return group?.selectable === true; }
export function resetSelection(result) {
  return new Set(groups(result).filter(g => canSelect(g) && g.default_selected).map(g => g.group_id));
}
export function setSelected(result, selection, id, checked) {
  const next = new Set(selection), group = groups(result).find(g => g.group_id === id);
  if (!canSelect(group)) { next.delete(id); return next; }
  if (checked) next.add(id); else next.delete(id);
  return next;
}
export function selectCategory(result, selection, category, checked) {
  return groups(result).filter(g => g.category === category).reduce((next, g) => setSelected(result, next, g.group_id, checked), new Set(selection));
}
export function selectedGroups(result, selection) { return groups(result).filter(g => canSelect(g) && selection.has(g.group_id)); }
export function selectedBytes(result, selection) { return selectedGroups(result, selection).reduce((sum, g) => sum + bytes(g.eligible_bytes), 0n); }
export function sortedGroups(items, sort) {
  const value = g => bytes(sort === 'growth' ? g.growth?.bytes_delta ?? '0' : g.total_bytes);
  return [...items].sort((a, b) => value(a) === value(b) ? 0 : value(a) > value(b) ? -1 : 1);
}
