import * as ipc from './ipc.mjs';
import {installResult as nextResult, setSelected, selectCategory, setItemSelected, cleanSelection} from './model.mjs';
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
const state = {app:null, connecting:true, busy:'idle', pending:false, error:'', errorCode:null, info:'', result:null, selection:new Map(), details:new Map(), drive:null, filter:'all', sort:'bytes', stale:false, cleaned:null, showDone:false, progressFailures:0, reconnecting:false, recoveryPending:false, pollPaused:false, pauseReason:'', stopFailed:false, historyDetails:new Map()};
let route = 'home', timer, stopAnnouncement, polling = false, overlay, opener, routeVersion = 0;
const routeReads = new Map();
const page = document.getElementById('page'), main = document.getElementById('main');
const motionObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.target.style.setProperty('--motion-state', entry.isIntersecting ? 'running' : 'paused')));
const actions = {
  busy:() => state.pending || state.busy !== 'idle' || !state.app,
  navigate, connect, reconnectProgress:() => { if (!polling) { clearError(); beginPolling(); render(); } },
  scan:() => run(async inScope => {
    if (state.busy !== 'idle') return;
    const value = await ipc.scan_start();
    state.scanId = value.scan_id; state.scanProgress = null; state.busy = 'scanning'; state.cleaned = null; state.stale = true;
    state.scanRunningSeen = false; state.scanIdleCount = 0;
    if (inScope()) navigate('home');
    beginPolling();
  }),
  stopScan:() => run(inScope => stop(() => ipc.scan_cancel(state.scanId ?? state.scanProgress?.scan_id), inScope), true),
  stopClean:() => run(inScope => stop(() => ipc.clean_stop(), inScope), true),
  detail:id => run(async inScope => { const value = await ipc.group_detail(id); if (inScope()) { rememberDetail(value); showOverlay(detail(value, closeOverlay, state, actions), 'detail-close'); } }),
  selectItem:(data, itemId, checked) => {
    if (actions.busy() || state.stale) return;
    state.selection = setItemSelected(state.result, state.selection, data, itemId, checked); render();
  },
  skipItem:(data, itemId) => locationOperation(async isCurrent => {
    if (state.stale) return;
    const value = await ipc.skip_add(itemId);
    if (!isCurrent()) return;
    state.locations = value;
    state.info = '以后体检会跳过这个文件夹，可以在‘位置’里恢复';
    const refreshed = await ipc.group_detail(data.group.group_id);
    if (isCurrent()) { rememberDetail(refreshed); showOverlay(detail(refreshed, closeOverlay, state, actions), 'detail-close'); }
  }),
  select:(id, checked) => { if (actions.busy() || state.stale) return; state.selection = setSelected(state.result, state.selection, id, checked); render(); },
  selectCategory:(category, checked) => { if (actions.busy() || state.stale) return; state.selection = selectCategory(state.result, state.selection, category, checked); render(); },
  filter:value => { state.filter = value; render(); },
  drive:value => { state.drive = value; render(); },
  sort:value => { state.sort = value; render(); },
  prepare:() => run(async inScope => {
    if (state.busy !== 'idle' || state.stale) return;
    const {groupIds, excludeItemIds} = cleanSelection(state.result, state.selection, state.details);
    if (!groupIds.length) return;
    let preview = await ipc.clean_prepare(groupIds, excludeItemIds);
    // A preview that arrives after the user left the results page is dropped; returning needs a new click.
    if (!inScope()) return;
    showOverlay(confirm(preview, closeOverlay, () => run(async inScope => {
      const {plan_id, confirm_token} = preview; preview = null;
      closeOverlay(true);
      let value;
      try { value = await ipc.clean_start(plan_id, confirm_token); }
      catch (error) {
        if (error?.code === 'stale') throw error;
        throw {...error, message_zh:(error?.message_zh || (error?.code === 'unavailable' ? '无法连接 Water 服务' : 'Water 服务暂时不可用')) + ' 请重新点击“清理所选”并确认。'};
      }
      state.busy = 'cleaning'; state.cleanId = value.clean_id; state.cleanProgress = null; state.cleaned = null;
      if (inScope()) navigate('home');
      beginPolling();
    })), 'confirm-cancel');
  }),
  toggleCategory:(category, enabled) => locationOperation(async isCurrent => { const value = await ipc.locations_set_category(category, enabled); if (isCurrent()) state.locations = value; }),
  addRoot:() => locationOperation(async isCurrent => {
    const value = await ipc.custom_root_add();
    if (!value.cancelled && isCurrent()) { const locations = await ipc.locations_get(); if (isCurrent()) state.locations = locations; }
  }),
  removeRoot:id => locationOperation(async isCurrent => { const value = await ipc.custom_root_remove(id); if (isCurrent()) state.locations = value; }),
  restoreSkip:id => locationOperation(async isCurrent => { const value = await ipc.skip_remove(id); if (isCurrent()) state.locations = value; }),
  historyDetail:entry => run(async () => {
    if (state.historyOpen === entry.id) { state.historyOpen = null; return; }
    state.historyOpen = entry.id;
    await readHistoryDetail(entry);
  })
};
function rememberDetail(data) {
  state.details.set(data.group.group_id, data);
  if (!state.result) return;
  state.result = {...state.result, categories:state.result.categories.map(c => ({...c, groups:c.groups.map(g => g.group_id === data.group.group_id ? data.group : g)}))};
  const excluded = state.selection.get(data.group.group_id);
  if (excluded) state.selection.set(data.group.group_id, new Set([...excluded].filter(id => data.items.some(item => item.item_id === id && item.eligible))));
}
function nextRouteRead(key) {
  const request = (routeReads.get(key) ?? 0) + 1;
  routeReads.set(key, request);
  return () => routeReads.get(key) === request;
}
function locationOperation(operation) {
  return run(async inScope => {
    if (state.busy !== 'idle') return;
    const isLatest = nextRouteRead('locations'), isCurrent = () => isLatest() && inScope();
    try { await operation(isCurrent); }
    catch (error) { if (isCurrent()) throw error; }
  });
}
async function readHistoryDetail(entry, isCurrent = () => true) {
  if (!state.historyDetails.has(entry.id)) {
    const value = await (entry.kind === 'clean' ? ipc.clean_result(entry.id) : ipc.scan_result(entry.id));
    if (isCurrent()) state.historyDetails.set(entry.id, value);
  }
}
// A stop that fails while progress is paused cannot use the notice, which keeps the pause reason.
async function stop(request, inScope) {
  try { await request(); }
  catch (error) {
    if (inScope() && state.pollPaused) {
      state.stopFailed = true;
      clearTimeout(stopAnnouncement);
      const announcer = document.getElementById('announcer'); announcer.textContent = '';
      stopAnnouncement = setTimeout(() => { if (state.stopFailed && inScope()) announcer.textContent = '停止请求没有送达，请先重新连接再试。'; }, 120);
    }
    throw error;
  }
}
function clearError() { state.error = ''; state.errorCode = null; state.info = ''; }
// Superseded reads are discarded before fault(); other stale commands still invalidate results.
// The notice and overlay belong only to the page that issued the current command.
function fault(error, show = true) {
  if (error?.code === 'stale') state.stale = true;
  if (!show) return;
  state.error = typeof error?.message_zh === 'string' && error.message_zh ? error.message_zh : error?.code === 'unavailable' ? '无法连接 Water 服务' : 'Water 服务暂时不可用';
  state.errorCode = error?.code ?? null;
  if (error?.code === 'stale') closeOverlay(true);
}
async function run(fn, clearStop = false) {
  if (state.pending) return;
  const version = routeVersion, origin = location.hash, paused = state.pollPaused;
  const inScope = () => version === routeVersion && origin === location.hash;
  state.pending = true; clearError(); if (clearStop) state.stopFailed = false; render();
  const controls = [...(overlay?.querySelectorAll('button, input') ?? [])].map(node => [node, node.disabled]);
  controls.forEach(([node]) => { node.disabled = true; });
  try { await fn(inScope); } catch (error) { fault(error, inScope() && !paused && !state.pollPaused); }
  finally { state.pending = false; controls.forEach(([node, disabled]) => { node.disabled = disabled; }); render(); }
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
    add(side, add(el('div', 'brand'), icon('berg'), add(el('div'), el('b', '', 'Water'), el('small', '', '磁盘体检'))));
    const nav = el('nav', 'nav', undefined, {'aria-label':'主导航'});
    for (const [key, label, glyph] of [['home', '体检', 'pulse'], ['trends', '增长趋势', 'trend'], ['history', '清理记录', 'history'], ['locations', '扫描位置', 'folder'], ['about', '关于与隐私', 'shield']]) {
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
  const notice = document.getElementById('notice'); notice.replaceChildren(); notice.hidden = !state.error && !state.info && !state.reconnecting && !state.pollPaused;
  if (!notice.hidden) add(notice, el('span', '', state.pollPaused ? state.pauseReason : state.reconnecting ? '正在重新连接 Water 服务…' : state.error || state.info), state.pollPaused ? button('重新连接', actions.reconnectProgress, 'btn btn-glass', 'progress-reconnect', state.pending) : state.reconnecting ? null : button('关闭提示', () => { clearError(); render(); }, 'btn btn-ghost', 'dismiss-error'));
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
// missingOnly: after reconnecting, re-read only what a paused read left missing, including an expanded history entry.
async function loadRoute(missingOnly = false) {
  const version = routeVersion, current = route, origin = location.hash, paused = state.pollPaused;
  const read = {trends:ipc.trends, history:ipc.history_list, locations:ipc.locations_get}[current];
  const shouldRead = read && !(missingOnly && state[current]);
  const request = (routeReads.get(current) ?? 0) + (shouldRead ? 1 : 0);
  routeReads.set(current, request);
  const isLatest = () => request === routeReads.get(current);
  const inScope = () => version === routeVersion && origin === location.hash && isLatest();
  try {
    if (shouldRead) { const value = await read(); if (inScope()) state[current] = value; }
    const open = !state.pollPaused && current === 'history' && inScope() && state.history?.find(entry => entry.id === state.historyOpen);
    if (open) await readHistoryDetail(open, inScope);
  } catch (error) { if (isLatest()) fault(error, inScope() && !paused && !state.pollPaused); }
  if (inScope()) render();
}
function routeChanged() {
  routeVersion++;
  closeOverlay(true); const value = location.hash.slice(2); route = routes.includes(value) ? value : 'home';
  clearError(); state.stopFailed = false;
  state.showDone = false;
  try { localStorage.setItem('water-last-page', route); } catch {}
  page.classList.remove('enter'); void page.offsetWidth; page.classList.add('enter'); main.scrollTop = 0;
  render(); void loadRoute();
}
function startPolling() { clearTimeout(timer); timer = setTimeout(poll, 250); }
function beginPolling() { state.progressFailures = 0; state.reconnecting = false; state.pollPaused = false; state.stopFailed = false; startPolling(); }
function pauseProgress(error) { fault(error); state.pauseReason = state.error; clearError(); state.reconnecting = false; state.recoveryPending = true; state.pollPaused = true; }
async function readProgress() {
  try {
    const value = await (state.busy === 'scanning' ? ipc.scan_progress() : ipc.clean_progress());
    state.progressFailures = 0; state.reconnecting = false;
    if (state.recoveryPending) {
      state.recoveryPending = false;
      if (['unavailable', 'busy'].includes(state.errorCode)) clearError();
      void loadRoute(true);
    }
    return value;
  } catch (error) {
    state.recoveryPending = true;
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
        if (++state.scanIdleCount >= 20) { state.busy = 'idle'; fault({message_zh:'体检没有开始，请重试'}); }
        return;
      }
      if (p.state !== 'running') {
        if (['completed', 'partial', 'cancelled', 'idle'].includes(p.state) && state.scanId) {
          installResult(await ipc.scan_result(state.scanId));
          if (['partial', 'cancelled'].includes(p.state)) state.result = {...state.result, status:'partial'};
          state.busy = 'idle';
          if (route === 'home') navigate('results');
          try { state.app = await ipc.app_state(); } catch (error) { fault(error); }
        } else { state.busy = 'idle'; fault({message_zh:'体检未能完成，请重新体检。'}); }
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
    const nodes = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
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
window.addEventListener('pagehide', () => { clearTimeout(timer); clearTimeout(stopAnnouncement); motionObserver.disconnect(); });
window.addEventListener('beforeunload', event => { if (state.busy === 'cleaning') { event.preventDefault(); event.returnValue = ''; } });
if (!location.hash) { let saved; try { saved = localStorage.getItem('water-last-page'); } catch {} history.replaceState(null, '', `#/${routes.includes(saved) ? saved : 'home'}`); }
route = routes.includes(location.hash.slice(2)) ? location.hash.slice(2) : 'home';
render(); void connect();
