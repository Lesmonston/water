import * as ipc from './ipc.mjs';
import {installResult as nextResult, setSelected, selectCategory, selectedGroups} from './model.mjs';
import {formatBytes} from './format.mjs';
import {el, add, icon, button} from './views/common.mjs';
import {home} from './views/home.mjs';
import {scan} from './views/scan.mjs';
import {results, dock} from './views/results.mjs';
import {detail} from './views/detail.mjs';
import {confirm} from './views/confirm.mjs';
import {cleaning} from './views/cleaning.mjs';
import {done} from './views/done.mjs';
import {trends} from './views/trends.mjs';
import {history as historyView} from './views/history.mjs';
import {locations} from './views/locations.mjs';
import {about} from './views/about.mjs';

const routes = ['home', 'results', 'trends', 'history', 'locations', 'about'];
const state = {app:null, connecting:true, busy:'idle', pending:false, error:'', result:null, selection:new Set(), filter:'all', sort:'bytes', stale:false, cleaned:null, showDone:false, progressFailures:0, reconnecting:false, pollPaused:false, historyDetails:new Map()};
let route = 'home', timer, polling = false, overlay, opener, routeVersion = 0;
const page = document.getElementById('page'), main = document.getElementById('main');
const motionObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.target.style.setProperty('--motion-state', entry.isIntersecting ? 'running' : 'paused')));
const actions = {
  busy:() => state.pending || state.busy !== 'idle' || !state.app,
  navigate, connect, reconnectProgress:() => { if (!polling) { state.error = ''; beginPolling(); render(); } },
  scan:() => run(async () => {
    if (state.busy !== 'idle') return;
    const value = await ipc.scan_start();
    state.scanId = value.scan_id; state.scanProgress = null; state.busy = 'scanning'; state.cleaned = null; state.stale = true;
    state.scanRunningSeen = false; state.scanIdleCount = 0;
    navigate('home'); beginPolling();
  }),
  stopScan:() => run(async () => { await ipc.scan_cancel(state.scanId ?? state.scanProgress?.scan_id); }),
  stopClean:() => run(async () => { await ipc.clean_stop(); }),
  detail:id => run(async () => { const value = await ipc.group_detail(id); showOverlay(detail(value, closeOverlay), 'detail-close'); }),
  select:(id, checked) => { if (actions.busy() || state.stale) return; state.selection = setSelected(state.result, state.selection, id, checked); render(); },
  selectCategory:(category, checked) => { if (actions.busy() || state.stale) return; state.selection = selectCategory(state.result, state.selection, category, checked); render(); },
  filter:value => { state.filter = value; render(); },
  sort:value => { state.sort = value; render(); },
  prepare:() => run(async () => {
    if (state.busy !== 'idle' || state.stale) return;
    const ids = selectedGroups(state.result, state.selection).map(g => g.group_id);
    if (!ids.length) return;
    let preview = await ipc.clean_prepare(ids);
    showOverlay(confirm(preview, closeOverlay, () => run(async () => {
      const {plan_id, confirm_token} = preview; preview = null;
      closeOverlay(true);
      let value;
      try { value = await ipc.clean_start(plan_id, confirm_token); }
      catch (error) { fault(error); state.error += ' 请重新点击“清理所选”并确认。'; return; }
      state.busy = 'cleaning'; state.cleanId = value.clean_id; state.cleanProgress = null; state.cleaned = null;
      navigate('home'); beginPolling();
    })), 'confirm-cancel');
  }),
  toggleCategory:(category, enabled) => run(async () => { if (state.busy === 'idle') state.locations = await ipc.locations_set_category(category, enabled); }),
  addRoot:() => run(async () => { if (state.busy !== 'idle') return; const value = await ipc.custom_root_add(); if (!value.cancelled) state.locations = await ipc.locations_get(); }),
  removeRoot:id => run(async () => { if (state.busy === 'idle') state.locations = await ipc.custom_root_remove(id); }),
  historyDetail:entry => run(async () => {
    if (state.historyOpen === entry.id) { state.historyOpen = null; return; }
    state.historyOpen = entry.id;
    if (!state.historyDetails.has(entry.id)) state.historyDetails.set(entry.id, await (entry.kind === 'clean' ? ipc.clean_result(entry.id) : ipc.scan_result(entry.id)));
  })
};
function fault(error) {
  state.error = typeof error?.message_zh === 'string' && error.message_zh ? error.message_zh : error?.code === 'unavailable' ? '无法连接 Water 服务' : 'Water 服务暂时不可用';
  if (error?.code === 'stale') { state.stale = true; closeOverlay(true); }
}
async function run(fn) {
  if (state.pending) return;
  state.pending = true; state.error = ''; render();
  overlay?.querySelectorAll('button').forEach(b => { b.disabled = true; });
  try { await fn(); } catch (error) { fault(error); }
  finally { state.pending = false; overlay?.querySelectorAll('button').forEach(b => { b.disabled = false; }); render(); }
}
function installResult(value) { Object.assign(state, nextResult(state, value)); }
async function connect() {
  state.connecting = true;
  await run(async () => {
    try {
      state.app = await ipc.app_state(); state.busy = state.app.busy;
      if (state.busy !== 'idle') { state.scanRunningSeen = false; state.scanIdleCount = 0; beginPolling(); }
      if (state.app.last_scan) installResult(await ipc.scan_result(state.app.last_scan.scan_id));
    } finally { state.connecting = false; }
  });
  await loadRoute();
}
function sidebar() {
  const side = document.getElementById('sidebar');
  if (!side.children.length) {
    add(side, add(el('div', 'brand'), icon('drop'), add(el('div'), el('b', '', 'Water'), el('small', '', '磁盘体检'))));
    const nav = el('nav', 'nav', undefined, {'aria-label':'主导航'});
    for (const [key, label, glyph] of [['home', '体检', 'drop'], ['trends', '增长趋势', 'trend'], ['history', '清理记录', 'history'], ['locations', '扫描位置', 'folder'], ['about', '关于与隐私', 'shield']]) {
      const link = el('a', '', undefined, {href:`#/${key}`, 'data-route':key, 'data-key':`nav-${key}`}); add(link, icon(glyph), el('span', '', label)); add(nav, link);
      link.addEventListener('click', event => { event.preventDefault(); navigate(key); });
    }
    add(side, nav, add(el('footer', 'side-foot'), el('b', '', '本地只读扫描'), el('p', '', '不读取文件内容，不上传任何数据'), el('span', 'version')));
  }
  side.querySelector('.version').textContent = state.app ? `Water ${state.app.app_version}` : 'Water';
  side.querySelectorAll('[data-route]').forEach(link => { const active = link.dataset.route === (route === 'results' ? 'home' : route); link.classList.toggle('on', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
}
function render() {
  const activeKey = document.activeElement?.dataset.key, scroll = main.scrollTop;
  sidebar();
  const notice = document.getElementById('notice'); notice.replaceChildren(); notice.hidden = !state.error && !state.reconnecting && !state.pollPaused;
  if (!notice.hidden) add(notice, el('span', '', state.reconnecting ? '正在重新连接 Water 服务…' : state.error || '未能读取任务进度，请重新连接。'), state.pollPaused ? button('重新连接', actions.reconnectProgress, 'btn btn-glass', 'progress-reconnect', state.pending) : state.reconnecting ? null : button('关闭提示', () => { state.error = ''; render(); }, 'btn btn-ghost', 'dismiss-error'));
  let view;
  if (route === 'home' && state.busy === 'scanning') view = scan(state, actions);
  else if (route === 'home' && state.busy === 'cleaning') view = cleaning(state, actions);
  else if (route === 'home' && state.showDone && state.cleaned) view = done(state, actions);
  else view = {home, results, trends, history:historyView, locations, about}[route](state, actions);
  page.replaceChildren(view); page.dataset.page = route === 'home' ? state.busy === 'scanning' ? 'scan' : state.busy === 'cleaning' ? 'cleaning' : state.showDone && state.cleaned ? 'done' : 'home' : route;
  motionObserver.disconnect(); page.querySelectorAll('.wave, .orb-btn').forEach(node => motionObserver.observe(node));
  const slot = document.getElementById('dock-slot'); slot.replaceChildren();
  if (route === 'results') { const bar = dock(state, actions); if (bar) slot.append(bar); }
  main.scrollTop = scroll;
  if (activeKey && !overlay) [...document.querySelectorAll('[data-key]')].find(e => e.dataset.key === activeKey)?.focus({preventScroll:true});
}
function navigate(next) {
  if (!routes.includes(next)) next = 'home';
  state.showDone = false;
  if (location.hash === `#/${next}`) { route = next; render(); return; }
  location.hash = `#/${next}`;
}
async function loadRoute() {
  const version = ++routeVersion, current = route;
  try {
    const read = {trends:ipc.trends, history:ipc.history_list, locations:ipc.locations_get}[current];
    if (read) { const value = await read(); if (version === routeVersion) state[current] = value; }
  } catch (error) { if (version === routeVersion) fault(error); }
  if (version === routeVersion) render();
}
function routeChanged() {
  closeOverlay(true); const value = location.hash.slice(2); route = routes.includes(value) ? value : 'home';
  state.error = '';
  state.showDone = false;
  try { localStorage.setItem('water-last-page', route); } catch {}
  page.classList.remove('enter'); void page.offsetWidth; page.classList.add('enter'); main.scrollTop = 0;
  render(); void loadRoute();
}
function startPolling() { clearTimeout(timer); timer = setTimeout(poll, 250); }
function beginPolling() { state.progressFailures = 0; state.reconnecting = false; state.pollPaused = false; startPolling(); }
function pauseProgress(error) { fault(error); state.reconnecting = false; state.pollPaused = true; }
async function readProgress() {
  try {
    const value = await (state.busy === 'scanning' ? ipc.scan_progress() : ipc.clean_progress());
    state.progressFailures = 0; state.reconnecting = false;
    return value;
  } catch (error) {
    if (['busy', 'unavailable'].includes(error?.code) && ++state.progressFailures < 20) state.reconnecting = true;
    else pauseProgress(error);
    return null;
  }
}
async function poll() {
  if (polling || state.busy === 'idle' || state.pollPaused) return;
  polling = true;
  try {
    const p = await readProgress();
    if (!p) return;
    if (state.busy === 'scanning') {
      state.scanProgress = p; state.scanId = p.scan_id ?? state.scanId;
      document.getElementById('announcer').textContent = `正在体检，已发现 ${formatBytes(p.found_bytes)}，${p.percent}%`;
      if (p.state === 'running') { state.scanRunningSeen = true; state.scanIdleCount = 0; }
      if (p.state === 'idle' && !state.scanRunningSeen) {
        if (++state.scanIdleCount >= 20) { state.busy = 'idle'; state.error = '体检没有开始，请重试'; }
        return;
      }
      if (p.state !== 'running') {
        if (['completed', 'partial', 'cancelled', 'idle'].includes(p.state) && state.scanId) {
          installResult(await ipc.scan_result(state.scanId));
          if (['partial', 'cancelled'].includes(p.state)) state.result = {...state.result, status:'partial'};
          state.busy = 'idle';
          if (route === 'home') navigate('results');
          try { state.app = await ipc.app_state(); } catch (error) { fault(error); }
        } else { state.busy = 'idle'; state.error = '体检未能完成，请重新体检。'; }
      }
    } else {
      state.cleanProgress = p; state.cleanId = p.clean_id ?? state.cleanId;
      document.getElementById('announcer').textContent = `正在清理，已释放 ${formatBytes(p.freed_bytes)}`;
      if (['completed', 'stopped', 'failed'].includes(p.state) && state.cleanId) {
        state.cleaned = await ipc.clean_result(state.cleanId);
        state.busy = 'idle'; state.stale = true; state.cleanTerminal = p.state; state.showDone = route === 'home';
        state.history = null; state.historyDetails.clear(); state.historyOpen = null;
        try { state.app = await ipc.app_state(); } catch (error) { fault(error); }
        if (route === 'history') await loadRoute();
      } else if (p.state !== 'running') {
        pauseProgress({message_zh:'未能确认清理状态，请重新连接。'});
      }
    }
  } catch (error) { pauseProgress(error); }
  finally { polling = false; render(); if (state.busy !== 'idle' && !state.pollPaused) startPolling(); }
}
function showOverlay(panel, focusKey) {
  opener = document.activeElement?.dataset.key;
  if (overlay) closeOverlay(true);
  overlay = panel; document.getElementById('overlays').append(panel);
  panel.addEventListener('cancel', event => { event.preventDefault(); if (!state.pending) closeOverlay(); });
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const nodes = [...panel.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
    if (!nodes.length) { event.preventDefault(); return; }
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  panel.showModal(); [...panel.querySelectorAll('[data-key]')].find(e => e.dataset.key === focusKey)?.focus();
}
function closeOverlay(immediate = false) {
  if (!overlay) return;
  const panel = overlay, key = opener; overlay = null;
  const finish = () => { panel.close(); panel.remove(); [...document.querySelectorAll('[data-key]')].find(e => e.dataset.key === key)?.focus({preventScroll:true}); };
  if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.input === 'keyboard') finish();
  else { panel.classList.add('closing'); setTimeout(finish, 220); }
}
document.addEventListener('keydown', () => { document.documentElement.dataset.input = 'keyboard'; });
document.addEventListener('pointerdown', () => { document.documentElement.dataset.input = 'pointer'; });
window.addEventListener('hashchange', routeChanged);
window.addEventListener('pagehide', () => { clearTimeout(timer); motionObserver.disconnect(); });
window.addEventListener('beforeunload', event => { if (state.busy === 'cleaning') { event.preventDefault(); event.returnValue = ''; } });
if (!location.hash) { let saved; try { saved = localStorage.getItem('water-last-page'); } catch {} history.replaceState(null, '', `#/${routes.includes(saved) ? saved : 'home'}`); }
route = routes.includes(location.hash.slice(2)) ? location.hash.slice(2) : 'home';
render(); void connect();
