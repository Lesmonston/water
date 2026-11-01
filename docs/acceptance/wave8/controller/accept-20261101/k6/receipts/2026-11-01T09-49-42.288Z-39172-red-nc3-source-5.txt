const invalid = () => ({code:'invalid', message_zh:'所选内容无法清理，请重新选择。'});
function id(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$/.test(value) || /^[A-Za-z]:/.test(value)) throw invalid();
  return value;
}
function token(value) {
  if (typeof value !== 'string' || !value.length || value.length > 512 || value.includes('\\')) throw invalid();
  return value;
}
async function invoke(command, build = () => ({})) {
  const host = (globalThis.window ?? globalThis).__TAURI__;
  if (typeof host?.core?.invoke !== 'function') throw {code:'unavailable'};
  return host.core.invoke(command, build());
}
export const app_state = () => invoke('app_state');
export const scan_start = () => invoke('scan_start');
export const scan_cancel = scanId => invoke('scan_cancel', () => ({scanId:id(scanId)}));
export const scan_progress = () => invoke('scan_progress');
export const scan_result = scanId => invoke('scan_result', () => ({scanId:id(scanId)}));
export const group_detail = groupId => invoke('group_detail', () => ({groupId:id(groupId)}));
export const clean_prepare = (groupIds, excludeItemIds) => invoke('clean_prepare', () => {
  if (!Array.isArray(groupIds) || !groupIds.length) throw invalid();
  if (excludeItemIds === undefined) return {groupIds:groupIds.map(id)};
  if (!Array.isArray(excludeItemIds) || excludeItemIds.length > 5000 || new Set(excludeItemIds).size !== excludeItemIds.length) throw invalid();
  return {groupIds:groupIds.map(id), excludeItemIds:excludeItemIds.map(id)};
});
export const clean_start = (planId, confirmToken) => invoke('clean_start', () => ({planId:id(planId), confirmToken:token(confirmToken)}));
export const clean_stop = () => invoke('clean_stop');
export const clean_progress = () => invoke('clean_progress');
export const clean_result = cleanId => invoke('clean_result', () => ({cleanId:id(cleanId)}));
export const trends = () => invoke('trends');
export const history_list = () => invoke('history_list');
export const locations_get = () => invoke('locations_get');
export const locations_set_category = (category, enabled) => invoke('locations_set_category', () => {
  if (typeof enabled !== 'boolean') throw invalid();
  return {category:id(category), enabled};
});
export const custom_root_add = () => invoke('custom_root_add');
export const custom_root_remove = rootId => invoke('custom_root_remove', () => ({rootId:id(rootId)}));
export const skip_add = itemId => invoke('skip_add', () => ({itemId:id(itemId)}));
export const skip_remove = skipId => invoke('skip_remove', () => ({skipId:id(skipId)}));
