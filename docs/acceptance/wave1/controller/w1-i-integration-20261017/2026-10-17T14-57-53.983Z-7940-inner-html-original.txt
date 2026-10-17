import { assertReportView, formatBytes, selectFindings, summarizeView } from './model.mjs';

const byId = (id) => document.getElementById(id);
const reportLabels = {
  base: '基础完成',
  composite_partial: '组合部分读取',
  cancelled: '已取消',
  empty_completed: '空完成',
};
const controls = {
  query: byId('search'),
  scope: byId('scope'),
  tool: byId('tool'),
  category: byId('category'),
  risk: byId('risk'),
  sort: byId('sort'),
};
const dialog = byId('detail');
let bundle;
let current;
let returnFocus = null;

function node(tag, className, content) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (content !== undefined) result.textContent = content;
  return result;
}
function option(value, label) {
  const result = node('option', '', label);
  result.value = value;
  return result;
}
function scopeOf(view, scopeId) {
  return view.scopes.find((scope) => scope.scope_id === scopeId);
}
function resetFilters() {
  controls.query.value = '';
  controls.scope.value = 'all';
  controls.tool.value = 'all';
  controls.category.value = 'all';
  controls.risk.value = 'all';
  controls.sort.value = 'size_desc';
}
function rebuildDynamicFilters(view) {
  const tools = [];
  const seenTools = new Set();
  const categories = [];
  const seenCategories = new Set();
  for (const finding of view.findings) {
    if (!seenTools.has(finding.tool_id)) {
      seenTools.add(finding.tool_id);
      tools.push(option(finding.tool_id, `${finding.tool_name} ${finding.tool_id}`));
    }
    if (!seenCategories.has(finding.category)) {
      seenCategories.add(finding.category);
      categories.push(option(finding.category, finding.category));
    }
  }
  controls.scope.replaceChildren(
    option('all', '全部 scope'),
    ...view.scopes.map((scope) => option(scope.scope_id, `${scope.label} ${scope.scope_id}`)),
  );
  controls.tool.replaceChildren(option('all', '全部工具键'), ...tools);
  controls.category.replaceChildren(option('all', '全部类别'), ...categories);
}
function renderSummary(view, summary) {
  const totals = summary.source_totals;
  byId('summary-count').textContent = String(summary.count);
  byId('protected-count').textContent = String(summary.protected_count);
  byId('unknown-count').textContent = `${summary.unknown_size_count} 项大小未知`;
  byId('source-totals').replaceChildren(
    node('span', 'stat-label', '来源总量'),
    node('strong', 'text-value', formatBytes(totals.logical_bytes)),
    node('span', 'stat-note', `来源方法 ${totals.method}`),
    node('span', 'stat-note keep-phrase', '非本页求和'),
    node('span', 'stat-note', `精确逻辑字节 ${totals.logical_bytes === null ? '未知' : totals.logical_bytes}`),
    node('span', 'stat-note', `分配 ${totals.allocated_bytes === null ? '未知' : totals.allocated_bytes}`),
    node('span', 'stat-note', `已扫描 ${totals.scanned_entries}，跳过 ${totals.skipped_entries}`),
  );
  byId('coverage-summary').replaceChildren(
    node('span', 'stat-label', '覆盖'),
    node('strong', 'text-value', totals.coverage_complete ? '完整' : '未完整'),
    ...view.scopes.map((scope) => node('span', 'stat-note', `${scope.label} ${scope.scope_id} ${scope.coverage}`)),
  );
  const banner = byId('status-banner');
  banner.dataset.status = view.status;
  banner.replaceChildren(node('strong', '', view.status), node('span', '', view.scan_id));
  byId('issues-summary').replaceChildren(
    node('h2', '', '问题'),
    ...(view.issues.length
      ? view.issues.map((issue) => node('p', '', `${issue.code} ${issue.scope_id} ${issue.relative_path ?? ''} ${issue.message}`))
      : [node('p', '', '无问题记录')]),
  );
}
function showDetails(finding, trigger) {
  returnFocus = trigger;
  const view = current.view;
  const scope = scopeOf(view, finding.scope_id);
  const source = finding.source_tool === null
    ? '无 source_tool（筛选键 no_tool）'
    : `${finding.source_tool.name} / ${finding.source_tool.tool_id} / ${finding.source_tool.version ?? '未知'} / ${finding.source_tool.root_source}`;
  const size = finding.size;
  byId('detail-title').textContent = finding.title;
  byId('detail-subtitle').textContent = `${finding.risk} · ${finding.category} · ${finding.activity} · ${finding.recoverability}`;
  const fields = [
    ['相对路径', finding.relative_path, 'detail-path'],
    ['所属 scope', scope ? `${scope.label} / ${scope.scope_id} / ${scope.coverage} / ${scope.platform} / ${scope.origin}` : finding.scope_id],
    ['source_tool', source],
    ['筛选键', `${finding.tool_id} / ${finding.tool_name}`],
    ['大小', `逻辑 ${formatBytes(finding.logical_bytes)}；精确 ${finding.logical_bytes ?? '未知'}；分配 ${size.allocated_bytes ?? '未知'}；方法 ${size.method}；置信 ${size.confidence}；共享 ${size.shared}；可回收下界 ${size.reclaimable_lower_bytes ?? '无'}；可回收上界 ${size.reclaimable_upper_bytes ?? '无'}`],
    ['evidence_items', finding.evidence_items.map((item) => `${item.code} / ${item.source} / ${item.summary}`).join('\n')],
    ['拼接依据', finding.evidence],
    ['references', `${finding.references.state} / ${finding.references.project_ids.join(', ') || '无项目'}`],
    ['保护原因', finding.protection_reasons.join(', ') || '无'],
    ['rule_version', finding.rule_version],
    ['风险', finding.risk],
    ['类别', finding.category],
    ['活动', finding.activity],
    ['可恢复性', finding.recoverability],
    ['置信', finding.confidence],
  ];
  byId('detail-fields').replaceChildren(...fields.flatMap(([label, value, testid]) => {
    const term = node('dt', '', label);
    const description = node('dd', '', value);
    if (testid) description.dataset.testid = testid;
    return [term, description];
  }));
  dialog.showModal();
  byId('detail-close').focus();
}
function renderFindings() {
  const view = current.view;
  const rows = selectFindings(view, {
    query: controls.query.value,
    scope: controls.scope.value,
    tool: controls.tool.value,
    category: controls.category.value,
    risk: controls.risk.value,
    sort: controls.sort.value,
  });
  byId('visible-count').textContent = `${rows.length} / ${view.findings.length}`;
  byId('empty-state').hidden = rows.length !== 0;
  byId('empty-title').textContent = view.findings.length === 0 ? '这份报告没有条目' : '没有符合筛选的条目';
  byId('finding-list').replaceChildren(...rows.map((finding) => {
    const scope = scopeOf(view, finding.scope_id);
    const row = node('li', 'finding-row');
    row.dataset.testid = 'finding-row';
    row.dataset.findingId = finding.id;
    row.dataset.activity = finding.activity;
    row.dataset.recoverability = finding.recoverability;
    const main = node('div', 'finding-main');
    main.append(node('span', 'finding-title', finding.title), node('span', 'path-hint', finding.relative_path));
    const tool = node('div', 'finding-tool');
    tool.append(node('span', 'tool-name', finding.tool_name), node('span', 'scope-label', `${finding.tool_id} ${scope.scope_id}`));
    const meta = node('div', 'finding-meta');
    const risk = node('span', 'risk-label', finding.risk);
    risk.dataset.risk = finding.risk;
    meta.append(risk, node('span', '', finding.category), node('span', '', finding.activity), node('span', '', finding.recoverability));
    const size = node('span', 'finding-size', formatBytes(finding.logical_bytes));
    const button = node('button', 'detail-button', '详情');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', `查看 ${finding.title} 详情`);
    button.addEventListener('click', () => showDetails(finding, button));
    row.append(main, tool, meta, size, button);
    return row;
  }));
}
function showReport(id) {
  if (dialog.open) {
    returnFocus = null;
    dialog.close();
  }
  current = bundle.reports.find((report) => report.id === id);
  assertReportView(current.view);
  rebuildDynamicFilters(current.view);
  resetFilters();
  renderSummary(current.view, summarizeView(current.view));
  renderFindings();
}

byId('detail-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  dialog.close();
});
dialog.addEventListener('close', () => {
  if (returnFocus?.isConnected) returnFocus.focus();
});

try {
  const response = await fetch('/reports.json', { cache: 'no-store', credentials: 'omit', redirect: 'error' });
  if (!response.ok) throw new Error('Unsupported report view.');
  bundle = await response.json();
  const ids = Array.isArray(bundle?.reports) ? bundle.reports.map((report) => report.id) : [];
  if (bundle?.fixture_version !== 'water.reader-fixtures.v1' || ids.join(',') !== 'base,composite_partial,cancelled,empty_completed') {
    throw new Error('Unsupported report view.');
  }
  for (const report of bundle.reports) assertReportView(report.view);
  const picker = byId('report');
  picker.replaceChildren(...bundle.reports.map((report) => option(report.id, `${reportLabels[report.id]} ${report.id}`)));
  picker.value = 'composite_partial';
  picker.addEventListener('change', () => showReport(picker.value));
  controls.query.addEventListener('input', renderFindings);
  for (const key of ['scope', 'tool', 'category', 'risk', 'sort']) controls[key].addEventListener('change', renderFindings);
  const reset = () => {
    resetFilters();
    renderFindings();
  };
  byId('reset-filters').addEventListener('click', reset);
  byId('empty-reset').addEventListener('click', () => {
    reset();
    controls.query.focus();
  });
  showReport('composite_partial');
} catch {
  byId('status-banner').textContent = '合成报告载入失败。未读取本机目录。';
}
