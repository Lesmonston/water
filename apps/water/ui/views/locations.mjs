import {add, el, heading, card, button, row, toggle, tag} from './common.mjs';
import {formatBytes} from '../format.mjs';
import {about} from './about.mjs';
export function locations(s, a) {
  const current = s.route.split('/')[1], titles = {content:'扫描内容', skip:'跳过名单', decl:'项目声明', about:'关于与隐私'}, page = add(el('section', 'screen'), heading(titles[current], '设置 · 改了下次体检生效'));
  const grid = el('div', 'settings-grid'), nav = card('', 'settings-nav');
  for (const [key, title] of Object.entries(titles)) {
    const b = button(title, () => a.navigate(`settings/${key}`), key === current ? 'settings-link on' : 'settings-link', `settings-${key}`); if (key === current) b.setAttribute('aria-current', 'page'); add(nav, b);
  }
  add(grid, nav); const body = el('div', 'settings-content'), value = s.locations;
  if (!value) add(body, el('p', 'sub', '正在读取设置…'));
  else if (current === 'content') {
    const categories = card('常用位置查哪些');
    for (const c of value.categories) add(categories, row(c.title_zh, c.description_zh, toggle(c.title_zh, c.enabled, () => a.category(c.category, !c.enabled), `setting-${c.category}`, c.locked || a.busy())));
    const sessions = card('会话记录');
    add(sessions, el('p', 'sub', '清掉后这些对话不能再续接或回看。默认不清理。'));
    for (const t of value.sessions) {
      const days = el('select', 'days-select', undefined, {'aria-label':`${t.title_zh}保留天数`, 'data-key':`days-${t.tool}`});
      for (const day of [7, 30, 90]) { const option = el('option', '', `${day} 天`, {value:day}); option.selected = t.days === day; add(days, option); }
      days.disabled = !t.enabled || a.busy(); days.addEventListener('change', () => a.session(t.tool, t.enabled, Number(days.value)));
      add(sessions, row(t.title_zh, [t.retention_zh, t.largest_bytes !== null ? `最大一条 ${formatBytes(t.largest_bytes)}` : ''].filter(Boolean).join(' · '), t.bytes !== null && el('span', '', formatBytes(t.bytes)), days, toggle(`允许清理${t.title_zh} ${t.days} 天前的会话`, t.enabled, () => a.session(t.tool, !t.enabled, t.days), `session-${t.tool}`, a.busy())));
    }
    add(body, categories, sessions);
  } else if (current === 'skip') {
    const list = card('以后都跳过');
    for (const item of value.skipped) add(list, row(item.display_path, item.added_at, button('移除', () => a.removeSkip(item.skip_id), 'btn soft', `skip-remove-${item.skip_id}`, a.busy())));
    if (!value.skipped.length) add(list, el('p', 'sub', '跳过名单为空')); add(body, list);
  } else if (current === 'decl') {
    for (const m of value.manifests) {
      const node = card(m.project_zh ?? '项目声明', '', [tag({trusted:'已信任', untrusted:'未信任', changed:'已变化', invalid:'有错误'}[m.state], m.state === 'trusted' ? 'lime' : 'hot')]);
      add(node, el('code', 'path', m.display_path), el('p', 'sub', `保护 ${m.protected_count} 项 · 工作树 ${m.worktree_count} 棵`));
      for (const d of m.disposable) add(node, row(d.title_zh, `${d.kind} · ${d.paths_count} 条${d.ask ? ' · 需要确认' : ''}`));
      if (m.error_zh) add(node, el('p', 'warning', m.error_zh));
      add(node, button(m.state === 'trusted' ? '不信任' : '信任', () => a.trust(m.manifest_id, m.state !== 'trusted'), 'btn soft', `trust-${m.manifest_id}`, m.state === 'invalid' || a.busy())); add(body, node);
    }
    if (!value.manifests.length) add(body, card('尚未发现项目声明'));
  } else add(body, about(s));
  const privacy = add(card('隐私', 'dark main-card'), row('本地体检', '一般体检只读名字、大小、时间和属性'), row('不联网', '不上传任何数据'), row('清理由你确认', '隔离不会释放空间；永久删除不能恢复'), row('项目声明优先', '声明保护的内容不会清理'), el('p', 'sub bottom', `Water ${s.app?.app_version ?? ''} · 记录只存在这台电脑上`));
  return add(page, add(grid, body, privacy));
}
