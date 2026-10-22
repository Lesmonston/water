const el = id => document.getElementById(id);
const meta = document.querySelector('meta[name="water-action"]');
const token = meta?.content;
meta?.remove();
let state, pending = false, timer, revision = 0, running = true, recentKey;
const descriptions = {
  completed: ['扫描完成', '完整', '已确认目录。本次策略范围内的扫描已完成。'],
  partial: ['保留部分结果', '部分', '扫描存在覆盖限制，请在报告中查看具体原因。'],
  cancelled: ['扫描已取消', '已取消', '保留已观察的实际结果，可打开报告查看。'],
  selection_cancelled: ['目录选择已取消', '未扫描', '未确认目录，未开始扫描，也未生成报告。'],
  failed: ['扫描未完成', '未完成', '未生成可供查看的报告。'],
};
const markerErrors = {
  Source: '读取许可不可用', InvalidPath: '目录信息不受支持', RootMismatch: '目录身份不一致',
  NotRegularFile: '根清单不是普通文件', ReparsePoint: '根清单是重解析对象', MultipleLinks: '根清单存在多个链接',
  InputTooLarge: '根清单超过256 KiB', Changed: '读取期间对象发生变化', InvalidUtf8: '根清单不是有效UTF-8',
  InvalidManifest: '根清单格式无效', NativeIo: '无法读取根清单', UnsupportedPlatform: '当前平台不支持读取',
  SerializationFailed: '无法生成结构证据',
};
function markerLabel(marker, status) {
  if (marker.status === 'not_requested') return '未请求读取';
  if (marker.status === 'skipped') {
    if (marker.error_code === 'selection_cancelled') return '选择取消未读';
    return status === 'cancelled' ? '扫描取消未读' : '已取消内容读取 · 未读取清单';
  }
  if (marker.status === 'missing') return '未发现根清单';
  if (marker.status === 'observed') return '结构证据';
  return '读取失败 · ' + markerErrors[marker.error_code];
}
function textNode(tag, text, className) {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className;
  return node;
}
function evidencePanel(row, latest) {
  const o = JSON.parse(row.marker.observation_json), e = o.evidence;
  const panel = document.createElement('details'); panel.className = 'evidence-panel'; panel.open = latest;
  panel.append(textNode('summary', '结构证据 · 已读取 ' + o.bytes_read.toLocaleString('zh-CN') + ' B'));
  panel.append(textNode('p', '仅结构统计；归属和版本未知，不证明可删。格式通过不代表已经安装 Node 或包管理器。', 'evidence-caution'));
  const list = document.createElement('dl'); list.className = 'structure-counts';
  const values = [['名称字段', e.has_name ? '存在' : '未提供'], ['版本字段', e.has_version ? '存在' : '未提供'],
    ['private 声明', e.declared_private === null ? '未提供' : String(e.declared_private)], ['已提供字段', e.recognized_field_count + ' / 9'],
    ['脚本数', e.counts.scripts], ['依赖数', e.counts.dependencies], ['开发依赖数', e.counts.dev_dependencies],
    ['同伴依赖数', e.counts.peer_dependencies], ['可选依赖数', e.counts.optional_dependencies], ['工作区模式数', e.counts.workspace_patterns]];
  for (const [name, value] of values) {
    const item = document.createElement('div'); item.append(textNode('dt', name), textNode('dd', String(value))); list.append(item);
  }
  panel.append(list);
  const link = textNode('a', '下载结构证据 JSON', 'evidence-link'); link.href = row.evidence_url; panel.append(link);
  const preview = document.createElement('details'); preview.className = 'json-preview';
  preview.append(textNode('summary', '预览结构 JSON'), textNode('pre', row.marker.observation_json, 'evidence-preview'));
  panel.append(preview); return panel;
}
function assertState(value) {
  if (value?.workspace_version !== 'water.project-workspace.v1' || !['ready', 'closed', 'failed'].includes(value.connection) ||
      !Array.isArray(value.recent) || value.recent.length > 2) throw new Error();
  if (value.active) {
    const a = value.active;
    if (typeof a.read_manifest !== 'boolean' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(a.job_id) || !['selecting', 'scanning', 'cancelling'].includes(a.phase) ||
        !Number.isInteger(a.visited_entries) || !Number.isInteger(a.recorded_entries) ||
        a.visited_entries < 0 || a.visited_entries > 10000 || a.recorded_entries < 0 || a.recorded_entries > a.visited_entries) throw new Error();
  }
  for (const row of value.recent) {
    if (!Object.hasOwn(descriptions, row.status) || !['confirmed', 'cancelled'].includes(row.selection) ||
        typeof row.read_manifest !== 'boolean' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(row.job_id) ||
        !['not_requested', 'skipped', 'missing', 'observed', 'failed'].includes(row.marker?.status)) throw new Error();
    if (row.marker.status === 'failed' && !Object.hasOwn(markerErrors, row.marker.error_code)) throw new Error();
    if (row.marker.status === 'observed') {
      if (!row.read_manifest || row.selection !== 'confirmed' || row.status === 'cancelled' ||
          row.evidence_url !== '/evidence/' + row.job_id + '.json') throw new Error();
    } else if (row.evidence_url !== null) throw new Error();
    if (row.report_url !== null) {
      const u = new URL(row.report_url);
      if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || !u.port || u.username || u.password ||
          u.pathname !== '/' || u.search || u.hash) throw new Error();
    }
  }
  return value;
}
function render() {
  if (!state) return;
  const a = state.active, ready = state.connection === 'ready';
  document.body.dataset.connection = state.connection;
  document.body.dataset.active = String(Boolean(a));
  el('connection-label').textContent = ready ? '连接就绪' : state.connection === 'closed' ? '连接已关闭' : '连接不可用';
  el('start').disabled = pending || !ready || a !== null;
  el('cancel').disabled = pending || !ready || !a || a.phase === 'cancelling';
  el('read-manifest').disabled = pending || !ready || a !== null;
  el('visited').textContent = a ? String(a.visited_entries) : '—';
  el('recorded').textContent = a ? String(a.recorded_entries) : '—';
  let title, detail;
  if (!ready) {
    title = state.connection === 'closed' ? '扫描连接已关闭' : '扫描连接不可用';
    detail = '扫描操作已停用。已有报告按实际结果保留。';
  } else if (a) {
    [title, detail] = {
      selecting: ['请选择目录', '请在系统目录选择窗口中确认或取消本次选择。'],
      scanning: ['正在观察目录', '当前进度仅显示条目计数，结果会在扫描结束后生成。'],
      cancelling: ['已请求取消', '如果目录选择窗口仍打开，请确认或取消选择。结束后保留实际结果。'],
    }[a.phase];
  } else if (state.recent.length) {
    title = descriptions[state.recent[0].status][0]; detail = descriptions[state.recent[0].status][2];
    if (state.recent[0].status === 'selection_cancelled') detail = '未开始扫描。可以重新选择一个目录。';
  } else { title = '准备就绪'; detail = '选择一个目录开始扫描。确认前不会访问该目录。'; }
  el('status-text').textContent = title; el('status-detail').textContent = detail;
  const nextKey = JSON.stringify(state.recent);
  if (nextKey !== recentKey) {
    recentKey = nextKey;
    el('empty-state').hidden = state.recent.length > 0;
    const rows = state.recent.map((row, i) => {
      const li = document.createElement('li'); li.className = 'recent-entry'; li.dataset.status = row.status;
      const order = document.createElement('span'); order.className = 'entry-order'; order.textContent = i === 0 ? '最近一次' : '上一次';
      const copy = document.createElement('div'), heading = document.createElement('p'); heading.className = 'entry-title';
      heading.append(document.createTextNode(descriptions[row.status][0]));
      const tag = document.createElement('span'); tag.className = 'entry-tag'; tag.textContent = descriptions[row.status][1]; heading.append(tag);
      const description = document.createElement('p'); description.className = 'entry-description'; description.textContent = descriptions[row.status][2];
      copy.append(heading, description, textNode('p', markerLabel(row.marker, row.status), 'marker-status')); li.append(order, copy);
      if (row.report_url) {
        const link = document.createElement('a'); link.className = 'report-link'; link.textContent = '打开报告';
        link.href = row.report_url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', (i === 0 ? '最近一次' : '上一次') + descriptions[row.status][0] + '，打开报告'); li.append(link);
      }
      if (row.marker.status === 'observed') li.append(evidencePanel(row, i === 0));
      return li;
    });
    el('recent-list').replaceChildren(...rows);
  }
}
function disconnected() {
  state = { workspace_version: 'water.project-workspace.v1', connection: 'failed', active: null, recent: state?.recent ?? [] };
  pending = false; render(); document.body.dataset.ready = 'true';
}
async function poll() {
  const stamp = revision;
  try {
    const response = await fetch('/session.json', { cache: 'no-store', credentials: 'omit', redirect: 'error' });
    if (!response.ok) throw new Error();
    const next = assertState(await response.json());
    if (stamp === revision) { state = next; render(); document.body.dataset.ready = 'true'; }
  } catch { if (stamp === revision) disconnected(); }
  finally { if (running) timer = setTimeout(poll, 60); }
}
async function act(command) {
  if (pending || state?.connection !== 'ready' || command === 'start' && state.active || command === 'cancel' && !state.active) return;
  const body = command === 'start' ? { read_manifest: el('read-manifest').checked } : { job_id: state.active.job_id };
  if (command === 'start') el('read-manifest').checked = false;
  revision++; pending = true; render();
  try {
    const response = await fetch('/actions/' + command, { method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error',
      headers: { 'Content-Type': 'application/json', 'X-Water-Action': token }, body: JSON.stringify(body) });
    if (response.status === 409) return;
    if (!response.ok) throw new Error();
    state = assertState(await response.json());
  } catch { disconnected(); }
  finally { revision++; pending = false; render(); }
}
el('start').addEventListener('click', () => act('start'));
el('cancel').addEventListener('click', () => act('cancel'));
el('read-manifest').checked = false;
window.addEventListener('pageshow', event => {
  el('read-manifest').checked = false;
  if (event.persisted) { running = true; poll(); }
});
window.addEventListener('pagehide', () => { running = false; clearTimeout(timer); }, { once: true });
if (/^[a-f0-9]{64}$/.test(token ?? '')) poll(); else disconnected();
