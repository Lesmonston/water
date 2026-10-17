import { selectFindings, formatBytes, summarize } from './model.mjs';

const byId = (id) => document.getElementById(id);
const categoryLabels = {
  download_cache: '下载缓存', build_cache: '编译缓存', model: '模型资产',
  history: '会话历史', database: '向量数据库', unknown: '未知用途',
};
const purposes = {
  download_cache: '存放包下载内容；后续安装可能依赖这些本地缓存。',
  build_cache: '复用构建产物，减少重复编译；重建可能需要额外工具与时间。',
  model: '供本地推理或开发使用的模型资产，可能包含独有版本或共享数据。',
  history: '保留 AI 编程会话及恢复上下文，属于独有工作记录。',
  database: '保存本地知识库与索引，可能包含独有内容和恢复所需数据。',
  unknown: '用途与归属尚不明确；此处为虚构的大整数精度边界示例。',
};
const activities = {
  unknown: '未知（unknown）；不能据此判断是否仍在使用。',
  not_observed: '未观察到活跃使用（not_observed）；不等于未使用。',
  recent: '近期活跃（recent）；需要保留并核对依赖。',
};
const recoveries = {
  redownload: '重新下载依赖网络、版本可获得性与访问权限；这些前提尚未验证。重新下载不等于回滚。',
  rebuild: '重建依赖原始输入、兼容工具链与构建环境；可能耗费时间，成功条件尚未验证。',
  conditional: '仅在相同版本仍可获得、访问权限与共享引用均核对后，才可能恢复；未验证。',
  unknown: '未知。尚未确认有效备份或完整恢复方法，默认保护。',
};
const protectionLabels = {
  unique_asset: '可能为独有资产', incomplete_evidence: '证据不完整', unknown_ownership: '归属未知',
};
const controls = {
  query: byId('search'), tool: byId('tool'), category: byId('category'), risk: byId('risk'), sort: byId('sort'),
};
const dialog = byId('detail');
let returnFocus;

function node(tag, className, content) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (content !== undefined) result.textContent = content;
  return result;
}
function option(value, label) {
  const result = node('option', '', label); result.value = value; return result;
}
function showDetails(finding, trigger) {
  returnFocus = trigger;
  byId('detail-title').textContent = finding.title;
  byId('detail-subtitle').textContent = `${finding.tool_name} · ${categoryLabels[finding.category] ?? finding.category} · ${finding.risk === 'protected' ? '默认保护' : '需要复核'}`;
  const fields = [
    ['用途', purposes[finding.category] ?? '用途未知，默认保护。'],
    ['相对路径（虚构）', finding.relative_path, 'detail-path'],
    ['工具', `${finding.tool_name}（${finding.tool_id}）`],
    ['逻辑大小', `${formatBytes(finding.logical_bytes)}${finding.logical_bytes === null ? '；权限不足，容量未读取。' : `（精确值 ${finding.logical_bytes} B）`}`],
    ['容量口径', '展示单项逻辑字节；未去重，不代表分配空间或可释放空间。共享数据可能重叠。'],
    ['识别依据', finding.evidence],
    ['活跃状态', activities[finding.activity] ?? '未知'],
    ['恢复前提', recoveries[finding.recoverability] ?? recoveries.unknown],
    ['保护原因', finding.protection_reasons.length
      ? finding.protection_reasons.map((reason) => `${protectionLabels[reason] ?? '待复核'}（${reason}）`).join('；')
      : '未列出特定保护原因；仍需核对工具版本、引用及活跃状态，不能据此判定可删除。'],
  ];
  byId('detail-fields').replaceChildren(...fields.flatMap(([label, value, testid]) => {
    const term = node('dt', '', label), description = node('dd', '', value);
    if (testid) description.dataset.testid = testid;
    return [term, description];
  }));
  dialog.showModal();
  byId('detail-close').focus();
}
byId('detail-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', (event) => { event.preventDefault(); dialog.close(); });
dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); });

try {
  const response = await fetch('./demo-data.json', { cache: 'no-store', credentials: 'omit', redirect: 'error' });
  if (!response.ok) throw new Error('Demo resource unavailable');
  const demo = await response.json();
  if (demo.demo_version !== 'water.prototype.v1' || demo.data_origin !== 'synthetic') throw new Error('Unexpected demo format');
  const summary = summarize(demo.findings);
  byId('summary-count').textContent = String(summary.count);
  byId('protected-count').textContent = String(summary.protected_count);
  byId('unknown-count').textContent = `${summary.unknown_size_count} 项容量未知 · 全部为虚构数据`;
  const tools = new Map(demo.findings.map((finding) => [finding.tool_id, finding.tool_name]));
  for (const [id, name] of tools) controls.tool.append(option(id, name));
  for (const category of new Set(demo.findings.map((finding) => finding.category))) {
    controls.category.append(option(category, categoryLabels[category] ?? category));
  }
  const scenarioSelect = byId('scenario');
  scenarioSelect.replaceChildren(...demo.scenarios.map((scenario) => option(scenario.id, scenario.label)));
  scenarioSelect.value = demo.default_scenario;
  function renderScenario() {
    const scenario = demo.scenarios.find((item) => item.id === scenarioSelect.value);
    const banner = byId('status-banner');
    banner.dataset.status = scenario.status;
    banner.replaceChildren(
      node('strong', '', `${scenario.status === 'partial' ? '部分读取' : '已取消'} · ${scenario.status}`),
      node('span', '', `${scenario.message} ${scenario.issues.includes('permission_denied') ? '权限不足（permission_denied），未知不按 0 B 计。' : '仅切换示例状态，不代表本机扫描。'}`),
    );
  }
  function renderFindings() {
    const options = Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value]));
    const rows = selectFindings(demo.findings, options);
    byId('visible-count').textContent = `${rows.length} / ${demo.findings.length}`;
    byId('empty-state').hidden = rows.length !== 0;
    byId('finding-list').replaceChildren(...rows.map((finding) => {
      const row = node('li', 'finding-row');
      row.dataset.testid = 'finding-row'; row.dataset.findingId = finding.id;
      const main = node('div', 'finding-main');
      main.append(node('span', 'finding-title', finding.title), node('div', 'path-hint', finding.relative_path));
      const tool = node('div', 'finding-tool');
      tool.append(node('span', 'tool-name', finding.tool_name), node('span', 'category-label', categoryLabels[finding.category] ?? finding.category));
      const size = node('span', 'finding-size', formatBytes(finding.logical_bytes));
      size.title = finding.logical_bytes === null ? '逻辑大小未知' : `逻辑大小：${finding.logical_bytes} B`;
      const risk = node('span', 'risk-label', finding.risk === 'protected' ? '默认保护' : '需要复核');
      risk.dataset.risk = finding.risk;
      const button = node('button', 'detail-button', '查看详情');
      button.type = 'button'; button.setAttribute('aria-label', `查看${finding.title}详情`);
      button.setAttribute('aria-haspopup', 'dialog');
      button.addEventListener('click', () => showDetails(finding, button));
      row.append(main, tool, size, risk, button);
      return row;
    }));
  }
  function reset() {
    controls.query.value = '';
    for (const key of ['tool', 'category', 'risk']) controls[key].value = 'all';
    controls.sort.value = 'size_desc';
    renderFindings();
    controls.query.focus();
  }
  controls.query.addEventListener('input', renderFindings);
  for (const key of ['tool', 'category', 'risk', 'sort']) controls[key].addEventListener('change', renderFindings);
  scenarioSelect.addEventListener('change', renderScenario);
  byId('reset').addEventListener('click', reset);
  byId('empty-reset').addEventListener('click', reset);
  renderFindings(); renderScenario();
} catch {
  byId('status-banner').textContent = '示例数据载入失败。请检查本地演示资源；未执行扫描。';
}
