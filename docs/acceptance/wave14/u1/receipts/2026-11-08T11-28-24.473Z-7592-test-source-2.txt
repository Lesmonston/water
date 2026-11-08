import {t, serviceText, errorText, readLanguage, saveLanguage, setLanguage, currentLanguage} from './views/strings.mjs';
import * as ipc from './ipc.mjs';
import {canonicalRoute, validQuery} from './model.mjs';
import {formatBytes} from './format.mjs';
import {el, add, button, icon, iconButton, row} from './views/common.mjs';
import {home} from './views/home.mjs';
import {scan} from './views/scan.mjs';
import {results} from './views/results.mjs';
import {detail, details} from './views/detail.mjs';
import {confirm} from './views/confirm.mjs';
import {cleaning} from './views/cleaning.mjs';
import {done} from './views/done.mjs';
import {quarantine} from './views/quarantine.mjs';
import {dedupe} from './views/dedupe.mjs';
import {trends} from './views/trends.mjs';
import {history as records} from './views/history.mjs';
import {locations} from './views/locations.mjs';
import {intro} from './views/intro.mjs';

const s = {app:null, locations:null, busy:'idle', pending:false, connecting:true, error:'', route:'home', mode:'home', selectedLocations:new Set(), conclusion:null, openFolds:new Set(), detailMode:'category', detailQuery:'', openSection:null, modal:null, historyDetails:new Map(), pollPaused:false, intro:false, appInfo:null, language:readLanguage(), languageReady:false, systemLanguage:null, scanCancelled:false, replanNotice:false};
const page = document.getElementById('page'), main = document.getElementById('main');
let timer, polling = false, stopped = false, routeEpoch = 0, quarantineRevision = 0, overlay, opener, checkupQueued = false;
const busy = () => s.pending || s.busy !== 'idle' || !s.app;
const checkupIsReturn = () => s.route === 'home' && s.busy === 'idle' && ['dedupe', 'done'].includes(s.mode);
function fail(error, scope) {
  if (error?.code === 'stale' && scope === 'conclusion') { markStale(); s.modal = null; s.preview = null; }
  s.error = error?.message_zh || error?.message_en ? error : {key:error?.code === 'unavailable' ? 'unavailable' : 'serviceUnavailable'};
}
async function run(task, scope) {
  if (s.pending) return; s.pending = true; s.error = ''; render();
  try { await task(); } catch (error) {
    if (scope === 'dedupe' && error?.code === 'stale') await recoverDedupe();
    else fail(error, scope);
  }
  finally {
    s.pending = false; render();
    if (checkupQueued) { checkupQueued = false; if (checkupIsReturn() && !s.modal) a.returnToCheckup(); }
  }
}
function markStale() { if (s.conclusion) s.conclusion = {...s.conclusion, stale:true}; }
function navigate(route) {
  const next = canonicalRoute(route);
  if (s.route === next) { s.modal = null; render(); void loadRoute(); return; }
  location.hash = next;
}
async function readConclusion() {
  try { s.conclusion = await ipc.conclusion_get(); }
  catch (error) { if (error?.code === 'stale') markStale(); throw error; }
}
async function returnToCheckup(fresh = false) {
  if (s.busy !== 'idle') return;
  if (fresh || !s.conclusion) {
    try { await readConclusion(); }
    catch (error) { if (error?.code !== 'not_found') throw error; s.conclusion = null; }
  }
  s.mode = s.conclusion ? 'results' : 'home'; s.dedupe = null; s.dedupeId = null; s.preview = null; s.modal = null;
  main.scrollTop = 0; navigate('home');
}
async function recoverDedupe() {
  s.preview = null; s.modal = null;
  try {
    s.dedupe = await ipc.dedupe_result(s.dedupe?.dedupe_id ?? s.dedupeId, false);
    if (s.busy === 'deduping') s.busy = 'idle';
    s.mode = 'dedupe'; s.pollPaused = false;
  } catch {
    s.dedupe = null; s.dedupeId = null; s.mode = 'home';
    if (s.busy === 'deduping') s.busy = 'idle';
    s.pollPaused = false; navigate('home'); s.error = {key:'dedupeExpired'};
  }
}
function installQuarantine(view) { quarantineRevision++; s.quarantine = view; }
async function loadRoute() {
  const epoch = ++routeEpoch, route = s.route, revision = quarantineRevision;
  try {
    const get = route === 'quarantine' ? ipc.quarantine_list : route === 'trends' ? ipc.trends : route === 'history' ? ipc.history_list : route.startsWith('settings/') ? ipc.locations_get : null;
    if (get) {
      const value = await get(); if (epoch !== routeEpoch || s.route !== route) return;
      if (route === 'quarantine' && revision !== quarantineRevision) return;
      s[route === 'history' ? 'history' : route.startsWith('settings/') ? 'locations' : route] = value;
    }
    // The host answers app_info itself; without it the about page simply leaves the three lines out.
    if (route === 'settings/about' && !s.appInfo) { try { s.appInfo = await ipc.app_info(); } catch {} }
  } catch (error) { if (epoch === routeEpoch && (route !== 'quarantine' || revision === quarantineRevision)) fail(error); }
  if (epoch === routeEpoch) render();
}
async function connect() {
  await run(async () => {
    s.connecting = true;
    try {
      try { s.appInfo = await ipc.app_info(); } catch {}
      if (!s.languageReady) { s.systemLanguage = s.appInfo?.system_language || navigator.language; s.languageReady = true; }
      s.app = await ipc.app_state(); s.busy = s.app.busy;
      s.locations = await ipc.locations_get();
      s.selectedLocations = new Set(s.locations.home.filter(l => l.default_selected).map(l => l.location_id));
      try { s.trends = await ipc.trends(); } catch { s.trends = null; }
      if (s.busy !== 'idle') schedule();
    } finally { s.connecting = false; }
  });
  await loadRoute();
}
function schedule() { clearTimeout(timer); if (!stopped && s.busy !== 'idle' && !s.pollPaused) timer = setTimeout(poll, 250); }
function resumePolling() { s.pollPaused = false; s.pollReason = ''; s.error = ''; schedule(); }
async function stopTask(request) { await request(); resumePolling(); }
async function poll() {
  if (polling || s.busy === 'idle' || s.pollPaused || stopped) return;
  polling = true;
  const kind = s.busy;
  try {
    if (kind === 'scanning') {
      const p = await ipc.scan_progress(); s.scanProgress = p; s.scanId = p.scan_id ?? s.scanId;
      if (['completed', 'partial', 'cancelled'].includes(p.state)) { await readConclusion(); s.scanCancelled = p.state === 'cancelled'; s.busy = 'idle'; s.mode = 'results'; s.app = await ipc.app_state(); }
      else if (p.state === 'failed') { s.busy = 'idle'; s.error = {key:'scanFailed'}; s.mode = 'home'; }
    } else if (kind === 'cleaning') {
      const p = await ipc.clean_progress(); s.cleanProgress = p; s.cleanId = p.clean_id ?? s.cleanId;
      if (['completed', 'stopped', 'failed'].includes(p.state)) { s.cleaned = await ipc.clean_result(s.cleanId); s.busy = 'idle'; s.mode = 'done'; markStale(); s.app = await ipc.app_state(); }
    } else if (kind === 'deduping') {
      const p = await ipc.dedupe_progress(); s.dedupeProgress = p; s.dedupeId = p.dedupe_id ?? s.dedupeId;
      if (['completed', 'cancelled'].includes(p.state)) { s.dedupe = await ipc.dedupe_result(s.dedupeId, false); s.busy = 'idle'; s.mode = 'dedupe'; }
      else if (p.state === 'failed') { s.busy = 'idle'; s.error = {key:'dedupeFailed'}; s.mode = 'home'; }
    } else if (kind === 'purging') {
      const p = await ipc.quarantine_progress(); s.quarantineProgress = p;
      if (['completed', 'stopped', 'failed'].includes(p.state)) { installQuarantine(await ipc.quarantine_list()); s.app = await ipc.app_state(); s.busy = 'idle'; }
    }
  } catch (error) {
    if (kind === 'deduping' && error?.code === 'stale') await recoverDedupe();
    else { fail(error); s.pollReason = s.error; s.pollPaused = true; }
  }
  finally { polling = false; try { render(); } finally { schedule(); } }
}
async function beginScan() {
  if (s.busy !== 'idle') return;
  const value = await ipc.scan_start([...s.selectedLocations]);
  markStale(); s.scanId = value.scan_id; s.scanProgress = null; s.scanCancelled = false; s.replanNotice = false; s.busy = 'scanning'; s.pollPaused = false; s.mode = 'scan'; s.modal = null; navigate('home'); schedule();
}
async function refreshDrawer() {
  const d = s.drawer; if (!d) return;
  d.data = await ipc.group_detail(d.data.group.group_id);
  if (d.items) d.items = await ipc.group_items(d.data.group.group_id, d.rowId, d.query);
}
async function prepare(chosenMode = 'quarantine') {
  if (s.busy !== 'idle' || s.conclusion?.stale && s.prepareSource !== 'dedupe') return;
  const epoch = routeEpoch;
  const value = await ipc.clean_prepare(s.prepareSource === 'dedupe' ? {dedupeId:s.dedupe.dedupe_id, dedupeVersion:s.dedupe.version} : {conclusionVersion:s.conclusion.version, chosenMode});
  if (epoch !== routeEpoch) return;
  s.preview = value; show('confirm'); return true;
}
function beginPrepare(source) {
  const returnFocus = document.activeElement?.dataset.key;
  return run(async () => {
    s.replanNotice = false; s.prepareSource = source;
    if (await prepare()) opener = returnFocus;
  }, source);
}
function show(kind) { if (!s.modal) opener = document.activeElement?.dataset.key; s.modal = kind; }
function close() { if (s.pending) return; s.modal = null; s.preview = null; s.replanNotice = false; render(); }
const a = {
  busy, connect, navigate, close,
  language:value => { if (!['system', 'zh', 'en'].includes(value)) return; s.language = value; saveLanguage(value); render(); },
  returnToCheckup:() => run(() => returnToCheckup(s.mode === 'done')),
  chooseLocations:() => { s.mode = 'home'; s.modal = null; main.scrollTop = 0; render(); },
  selectLocation:id => { if (busy()) return; s.selectedLocations.has(id) ? s.selectedLocations.delete(id) : s.selectedLocations.add(id); render(); },
  scan:() => run(beginScan),
  scanCommon:() => run(async () => { s.selectedLocations = new Set(['common']); await beginScan(); }),
  stopScan:() => run(() => stopTask(() => ipc.scan_cancel(s.scanId))), stopClean:() => run(() => stopTask(() => ipc.clean_stop())),
  showResults:() => run(async () => { await readConclusion(); s.mode = 'results'; main.scrollTop = 0; navigate('home'); }),
  addRoot:() => run(async () => { if (s.busy !== 'idle') return; const v = await ipc.custom_root_add(); if (!v.cancelled) { s.locations = await ipc.locations_get(); s.selectedLocations = new Set([v.added.root_id]); s.revealLocation = v.added.root_id; } }),
  removeRoot:id => run(async () => { s.locations = await ipc.custom_root_remove(id); s.selectedLocations.delete(id); }),
  decide:decision => run(async () => {
    if (s.busy !== 'idle' || !s.conclusion || s.conclusion.stale) return;
    s.conclusion = await ipc.conclusion_decide(s.conclusion.version, decision);
    if (s.mode === 'details') s.detailsView = await ipc.detail_get(s.conclusion.version, s.detailMode);
    if (s.modal === 'drawer') await refreshDrawer();
  }, 'conclusion'),
  detail:id => run(async () => { const epoch = routeEpoch, value = await ipc.group_detail(id); if (epoch !== routeEpoch) return; if (!s.conclusion) await readConclusion(); s.drawer = {data:value, query:null, rowId:null, items:null, error:''}; show('drawer'); }, 'conclusion'),
  searchItems:query => {
    if (!validQuery(query)) { s.drawer.error = {key:'invalidSearch'}; render(); return; }
    return run(async () => { s.drawer.query = query || null; s.drawer.rowId = null; s.drawer.error = ''; s.drawer.items = await ipc.group_items(s.drawer.data.group.group_id, null, s.drawer.query); }, 'conclusion');
  },
  expandRow:rowId => run(async () => { s.drawer.rowId = rowId; s.drawer.query = null; s.drawer.items = await ipc.group_items(s.drawer.data.group.group_id, rowId, null); }, 'conclusion'),
  summaryRows:() => { s.drawer.items = null; s.drawer.query = null; s.drawer.rowId = null; render(); },
  skipItem:itemId => run(async () => { if (s.conclusion?.stale) return; s.locations = await ipc.skip_add(itemId); await readConclusion(); s.modal = null; }),
  skipUnit:unitId => run(async () => { if (!s.conclusion || s.conclusion.stale) return; s.locations = await ipc.skip_unit_add(s.conclusion.version, unitId); await readConclusion(); s.modal = null; }, 'conclusion'),
  details:() => run(async () => { s.detailsView = await ipc.detail_get(s.conclusion.version, s.detailMode); s.mode = 'details'; s.modal = null; main.scrollTop = 0; }, 'conclusion'),
  detailsMode:mode => run(async () => { s.detailsView = await ipc.detail_get(s.conclusion.version, mode); s.detailMode = mode; s.openSection = null; }, 'conclusion'),
  openSection:id => { s.openSection = s.openSection === id ? null : id; render(); },
  searchDetails:query => { s.detailQuery = query; render(); },
  prepare:() => beginPrepare('conclusion'),
  prepareDedupe:() => beginPrepare('dedupe'),
  changeMode:mode => run(() => prepare(mode), s.prepareSource),
  startClean:() => run(async () => {
    const p = s.preview; if (!p || s.busy !== 'idle') return;
    const epoch = routeEpoch, returnFocus = opener;
    s.preview = null; s.modal = null; s.replanNotice = false;
    let v;
    try { v = await ipc.clean_start(p.plan_id, p.confirm_token); }
    catch (error) {
      if (error?.code !== 'stale' || s.prepareSource !== 'conclusion') throw error;
      await readConclusion(); if (epoch !== routeEpoch) return; s.mode = 'results';
      if (s.conclusion.stale) return;
      // A changed skip list invalidates the plan, not necessarily the checkup.
      // Prepare conservatively and require a new explicit confirmation.
      if (await prepare()) {
        opener = returnFocus;
        s.replanNotice = p.chosen?.mode === 'delete' && s.preview.chosen?.mode === 'quarantine' ? 'quarantine' : true;
      }
      return;
    }
    s.replanNotice = false; s.cleanId = v.clean_id; s.cleanProgress = null; s.busy = 'cleaning'; s.pollPaused = false; navigate('home'); schedule();
  }, s.prepareSource),
  finish:() => run(() => returnToCheckup(true)),
  copy:async text => { try { await navigator.clipboard.writeText(text); } catch { s.copyText = text; show('copy'); render(); } },
  copyDiagnostics:() => run(async () => { const app = await ipc.app_info(), service = await ipc.diagnostics_get(); s.appInfo = app; await a.copy(`${t('diagnostics')}\n${JSON.stringify({app, platform:navigator.userAgent, service}, null, 2)}`); }),
  startIntro:() => { try { localStorage.setItem('flick.intro.v1', '1'); } catch {} s.intro = false; navigate('home'); },
  reveal:id => run(() => ipc.quarantine_reveal(id)),
  revealRoots:() => run(async () => { const revision = quarantineRevision, view = await ipc.quarantine_list(); if (revision === quarantineRevision) s.quarantine = view; const roots = s.quarantine.roots; if (roots.length === 1) await ipc.quarantine_reveal(roots[0].target_id); else if (roots.length) show('roots'); }),
  restore:(id, beside) => run(async () => { const v = await ipc.quarantine_restore(id, beside); installQuarantine(v.view); s.app = await ipc.app_state(); if (v.conflicts.length) { s.conflict = {id, result:v}; show('conflict'); } else s.modal = null; }),
  confirmPurge:c => { if (busy()) return; s.purgeCard = c; show('purge'); render(); },
  purge:() => run(async () => { await ipc.quarantine_delete(s.purgeCard.quarantine_id); quarantineRevision++; s.modal = null; s.busy = 'purging'; s.pollPaused = false; schedule(); }),
  dedupeIntro:loc => { if (busy()) return; s.dedupeLocation = loc; show('dedupe-intro'); render(); },
  startDedupe:() => run(async () => { const v = await ipc.dedupe_start(s.dedupeLocation.location_id); s.dedupeId = v.dedupe_id; s.dedupeProgress = null; s.modal = null; s.busy = 'deduping'; s.pollPaused = false; s.mode = 'dedupe'; navigate('home'); schedule(); }, 'dedupe'),
  stopDedupe:() => run(() => stopTask(() => ipc.dedupe_cancel(s.dedupeId)), 'dedupe'),
  dedupeDecide:(groupId, include) => run(async () => { s.dedupe = await ipc.dedupe_decide(s.dedupe.dedupe_id, s.dedupe.version, groupId, include); }, 'dedupe'),
  expandDedupe:() => run(async () => { s.dedupe = await ipc.dedupe_result(s.dedupe.dedupe_id, true); }, 'dedupe'),
  category:(id, enabled) => run(async () => { s.locations = await ipc.locations_set_category(id, enabled); }),
  session:(id, enabled, days) => run(async () => { s.locations = await ipc.locations_set_session_cleanup(id, enabled, days); markStale(); }),
  trust:(id, trusted) => run(async () => { s.locations = await ipc.manifest_trust(id, trusted); markStale(); }),
  removeSkip:id => run(async () => {
    s.locations = await ipc.skip_remove(id);
    if (s.conclusion) {
      try { await readConclusion(); }
      catch (error) {
        if (error?.code !== 'not_found') throw error;
        s.conclusion = null;
        if (['results', 'details'].includes(s.mode)) s.mode = 'home';
      }
    }
  }),
  markFixed:(id, fixed) => run(async () => { s.trends = await ipc.cluster_mark_fixed(id, fixed); }),
  historyDetail:entry => run(async () => {
    if (s.historyOpen === entry.id) { s.historyOpen = null; return; } s.historyOpen = entry.id;
    if (entry.kind === 'clean') s.historyDetails.set(entry.id, await ipc.clean_result(entry.id));
    else if (entry.kind === 'scan') s.historyDetails.set(entry.id, await ipc.scan_result(entry.id));
    else if (entry.kind === 'dedupe') s.historyDetails.set(entry.id, await ipc.dedupe_result(entry.id, false));
  })
};
function top() {
  const header = document.getElementById('top');
  if (header.dataset.language !== currentLanguage()) { header.replaceChildren(); header.dataset.language = currentLanguage(); }
  if (!header.children.length) {
    add(header, add(el('div', 'brand'), icon('flick'), el('span', '', 'Flick')));
    const nav = el('nav', 'nav', undefined, {'aria-label':t('mainNav')});
    for (const [id, label, glyph] of [['home', t('checkup'), 'pulse'], ['quarantine', t('quarantine'), 'box'], ['trends', t('trends'), 'trend'], ['history', t('history'), 'history']]) {
      const link = add(el('a', '', undefined, {href:`#${id}`, 'data-route':id, 'data-key':`nav-${id}`}), icon(glyph), el('span', '', label));
      if (id === 'home') link.addEventListener('click', event => {
        if (!checkupIsReturn()) return;
        event.preventDefault(); if (s.pending) checkupQueued = true; else a.returnToCheckup();
      });
      if (id === 'quarantine') add(link, el('span', 'quarantine-size')); add(nav, link);
    }
    const gear = add(el('a', 'icon-btn', undefined, {href:'#settings', 'aria-label':t('settings'), title:t('settings'), 'data-key':'nav-settings'}), icon('settings'));
    add(header, nav, add(el('div', 'top-actions'), iconButton(t('privacyShortcut'), 'eye', () => navigate('settings/about'), 'privacy'), gear));
  }
  header.querySelectorAll('[data-route]').forEach(link => { const selected = link.dataset.route === s.route; link.classList.toggle('on', selected); selected ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current'); });
  const q = s.app?.quarantine; header.querySelector('.quarantine-size').textContent = q ? formatBytes(q.bytes) : '';
  header.querySelector('[data-key=nav-settings]').classList.toggle('on', s.route.startsWith('settings/'));
}
function simpleModal(title, content, actions) {
  return add(el('dialog', 'confirm', undefined, {'aria-labelledby':'modal-title'}), el('h2', '', title, {id:'modal-title'}), content, add(el('div', 'dialog-actions'), actions));
}
function paintOverlay(activeKey) {
  const prior = overlay;
  if (prior) { prior.close(); prior.remove(); overlay = null; }
  if (!s.modal) { if (prior && opener) document.querySelector(`[data-key="${CSS.escape(opener)}"]`)?.focus({preventScroll:true}); return; }
  if (s.modal === 'confirm') overlay = confirm(s, a);
  else if (s.modal === 'drawer') overlay = detail(s, a);
  else if (s.modal === 'copy') { const field = el('textarea', 'copy-text', s.copyText, {readonly:'', 'aria-label':t('leadText'), 'data-key':'copy-text'}); overlay = simpleModal(t('copyLeadManual'), field, [button(t('close'), close, 'btn soft', 'modal-close')]); }
  else if (s.modal === 'roots') overlay = simpleModal(t('openQuarantine'), s.quarantine.roots.map(r => row(r.display_path, formatBytes(r.bytes), button(t('openFolder'), () => a.reveal(r.target_id), 'btn soft', `root-open-${r.target_id}`))), [button(t('cancel'), close, 'btn soft', 'modal-close')]);
  else if (s.modal === 'conflict') overlay = simpleModal(t('restoreConflict'), s.conflict.result.conflicts.map(c => row(serviceText(c, 'label'), serviceText(c, 'reason'))), [button(t('abandon'), close, 'btn soft', 'restore-cancel', s.pending), button(t('restoreBeside'), () => a.restore(s.conflict.id, true), 'btn ink', 'restore-beside', s.pending)]);
  else if (s.modal === 'purge') overlay = simpleModal(t('purgeQuestion', {size:formatBytes(s.purgeCard.bytes)}), el('p', '', t('noRecovery')), [button(t('cancel'), close, 'btn soft', 'purge-cancel', s.pending), button(t('purge'), a.purge, 'btn danger-solid', 'purge-confirm', s.pending)]);
  else if (s.modal === 'dedupe-intro') overlay = simpleModal(t('findDuplicates'), el('p', '', t('dedupeConsent')), [button(t('cancel'), close, 'btn soft', 'dedupe-cancel', s.pending), button(t('startDedupe'), a.startDedupe, 'btn ink', 'dedupe-start', s.pending)]);
  if (!overlay) return;
  document.getElementById('overlays').append(overlay);
  overlay.addEventListener('cancel', e => { e.preventDefault(); close(); });
  overlay.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const all = [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,[tabindex="0"]')].filter(n => n.getClientRects().length);
    if (!all.length) { e.preventDefault(); return; }
    if (e.shiftKey && document.activeElement === all[0]) { e.preventDefault(); all.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === all.at(-1)) { e.preventDefault(); all[0].focus(); }
  });
  overlay.showModal();
  const focus = activeKey && overlay.querySelector(`[data-key="${CSS.escape(activeKey)}"]`);
  (focus ?? overlay.querySelector(s.modal === 'confirm' ? '[data-key=confirm-cancel]' : 'button, input, textarea'))?.focus({preventScroll:true});
}
function render() {
  if (!s.languageReady) return;
  const activeKey = document.activeElement?.dataset.key, scroll = main.scrollTop, drawerScroll = overlay?.querySelector('.drawer-list')?.scrollTop ?? 0;
  const scrollSelector = '.scroll-card,.fold-rows,.plan-categories,.settings-content,.location-list,.scan-location-list,.scan-chart,.result-lower>.card,.with-hero .card,.quarantine-grid,.quarantine-grid>.card';
  const cardScroll = [...page.querySelectorAll(scrollSelector)].map(n => n.scrollTop), previousPage = page.dataset.page;
  setLanguage(s.language, s.systemLanguage);
  document.documentElement.lang = currentLanguage() === 'zh' ? 'zh-CN' : 'en'; document.title = t('appTitle');
  top(); const notice = document.getElementById('notice'); notice.hidden = !s.error && !s.pollPaused; notice.replaceChildren();
  if (!notice.hidden) add(notice, el('span', '', s.error || s.pollReason ? errorText(s.error || s.pollReason) : t('paused')), s.pollPaused ? button(t('reconnect'), () => { resumePolling(); render(); }, 'btn soft', 'poll-retry', s.pending) : null);
  let view, name = s.route;
  if (s.intro) { view = intro; name = 'intro'; }
  else if (s.route === 'home') {
    name = s.busy === 'scanning' ? 'scan' : s.busy === 'cleaning' ? 'cleaning' : s.busy === 'deduping' ? 'dedupe' : s.mode;
    if (s.modal === 'drawer' && s.conclusion) name = 'results';
    view = {home, scan, cleaning, results, details, done, dedupe}[name] ?? home;
  } else view = s.route.startsWith('settings/') ? locations : {quarantine, trends, history:records}[s.route];
  page.replaceChildren(view(s, a)); page.dataset.page = name; main.scrollTop = scroll;
  if (previousPage === name) page.querySelectorAll(scrollSelector).forEach((node, i) => { node.scrollTop = cardScroll[i] ?? 0; });
  if (s.revealLocation) {
    const list = page.querySelector('.location-list'), item = page.querySelector(`[data-key="${CSS.escape('location-' + s.revealLocation)}"]`);
    if (list && item) { list.scrollTop += Math.max(0, item.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom); s.revealLocation = null; }
  }
  paintOverlay(activeKey); if (overlay?.querySelector('.drawer-list')) overlay.querySelector('.drawer-list').scrollTop = drawerScroll;
  if (!overlay && activeKey) document.querySelector(`[data-key="${CSS.escape(activeKey)}"]`)?.focus({preventScroll:true});
}
function routeChanged() {
  routeEpoch++; s.route = canonicalRoute(location.hash); if (location.hash !== `#${s.route}`) history.replaceState(null, '', `#${s.route}`);
  s.modal = null; s.error = ''; s.replanNotice = false; main.scrollTop = 0; checkupQueued = false;
  try { localStorage.setItem('water-last-page', s.route); } catch {}
  render(); void loadRoute();
}
window.addEventListener('hashchange', routeChanged);
window.addEventListener('languagechange', () => { if (s.language === 'system') render(); });
window.addEventListener('beforeunload', event => { if (['cleaning', 'purging'].includes(s.busy)) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pagehide', () => { stopped = true; clearTimeout(timer); });
if (!location.hash) { let saved; try { saved = localStorage.getItem('water-last-page'); } catch {} history.replaceState(null, '', `#${canonicalRoute(saved ?? 'home')}`); }
s.route = canonicalRoute(location.hash); if (location.hash !== `#${s.route}`) history.replaceState(null, '', `#${s.route}`);
// First run only; a storage that cannot be read never blocks the way in.
try { s.intro = localStorage.getItem('flick.intro.v1') === null; } catch {}
render(); void connect();
