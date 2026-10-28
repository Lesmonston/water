import {add, el, heading, metric, driveWater, button, insight, empty} from './common.mjs';
import {formatBytes, byteDelta, percent, relativeTime, dateTime} from '../format.mjs';
export function home(state, actions) {
  const page = add(el('section'), heading('这台电脑的空间，去了哪里', '只读取文件名、大小与时间，判断哪些是可以放心清掉的缓存和残留。'));
  if (!state.app && state.connecting) return add(page, empty('正在读取…', '正在读取这台电脑的空间信息。'));
  if (!state.app) return add(page, empty('无法连接 Water 服务', '请确认 Water 服务已启动。'), button('重新连接', actions.connect, 'btn btn-glass', 'reconnect', state.pending));
  const app = state.app, last = app.last_scan;
  app.insights.forEach(i => add(page, insight(i, actions.detail)));
  const system = app.drives.find(d => d.is_system) ?? app.drives[0];
  if (system) {
    const recommendation = last?.recommended_by_drive.find(d => d.root === system.root)?.bytes ?? '0';
    const stats = el('div', 'meta-row');
    for (const [name, value] of [['可放心清理', last ? formatBytes(recommendation) : '待体检'], ['近 7 天新增', last?.added_7d_bytes != null ? byteDelta(last.added_7d_bytes) : '暂无对比'], ['上次体检', last ? relativeTime(last.finished_at) : '尚未体检']]) add(stats, add(el('div'), el('span', 'cap', name), el('b', '', value)));
    const main = add(el('div', 'glass drive-main'), driveWater(system, recommendation), add(el('div', 'grow-fill'), el('p', 'cap', `${system.label_zh} ${system.root.slice(0, 2)}`), metric(system.free_bytes, '可用', 'drive-number'), el('p', 'sub', `共 ${formatBytes(system.total_bytes)}，已用 ${Math.round(100 - percent(system.free_bytes, system.total_bytes))}%。${last ? '浅绿一层是上次体检找到的可释放空间。' : '体检后可查看能够清理的空间。'}`), stats));
    const others = el('div', 'drives-mini');
    for (const drive of app.drives.filter(d => d !== system)) {
      const bar = el('i', percent(drive.free_bytes, drive.total_bytes) < 10 ? 'warn' : '');
      bar.style.setProperty('--fill', `${100 - percent(drive.free_bytes, drive.total_bytes)}%`);
      add(others, add(el('div', 'glass mini'), el('b', '', drive.root.slice(0, 2)), add(el('div', 'bar'), bar), el('span', 'cap', `${formatBytes(drive.free_bytes)} 可用`)));
    }
    add(page, add(el('div', 'home-hero'), main, others));
  }
  add(page, add(el('div', 'glass cta'), button('开始体检', actions.scan, 'orb-btn', 'scan-start', actions.busy()), add(el('div'), el('h2', '', '开始一次体检'), el('p', 'sub', '检查 AI 编程工具、浏览器、系统临时文件、应用更新残留、开发缓存等位置。'))));
  if (last) add(page, add(el('div', 'glass last'), add(el('div'), el('p', 'cap', `上次体检 · ${dateTime(last.finished_at)}`), el('span', '', `可放心清理 ${formatBytes(last.recommended_bytes)}`)), button('查看结果', () => actions.navigate('results'), 'btn btn-glass', 'view-results')));
  else add(page, el('p', 'cap first-scan', '尚未体检。先了解空间占用，再决定是否清理。'));
  return page;
}
