const el = id => document.getElementById(id);
const node = (tag, text, className) => {
  const n = document.createElement(tag); n.textContent = String(text);
  if (className) n.className = className;
  return n;
};
const bytes = value => value === null ? '未知' : String(value) + ' B';
const errors = { Source: '读取许可不可用', InvalidPath: '目录信息不受支持', RootMismatch: '目录身份不一致',
  NotRegularFile: '根清单不是普通文件', ReparsePoint: '根清单是重解析对象', MultipleLinks: '根清单存在多个链接',
  InputTooLarge: '根清单超过256 KiB', Changed: '读取期间对象发生变化', InvalidUtf8: '根清单不是有效UTF-8',
  InvalidManifest: '根清单格式无效', NativeIo: '无法读取根清单', UnsupportedPlatform: '当前平台不支持读取', SerializationFailed: '无法生成结构证据' };
function list(target, pairs) {
  for (const [label, value] of pairs) {
    const item = document.createElement('div'); item.append(node('dt', label), node('dd', value)); target.append(item);
  }
}
async function load() {
  try {
    const path = /^\/reports\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})\/$/.exec(location.pathname);
    if (!path) throw new Error();
    const response = await fetch(location.pathname + 'session.json', { cache: 'no-store', credentials: 'omit', redirect: 'error' });
    if (!response.ok) throw new Error();
    const p = await response.json();
    if (p.report_version !== 'water.project-report.v1' || p.job_id !== path[1] ||
        p.bundle.selection !== 'confirmed' || p.bundle.session_id !== p.job_id || p.bundle.snapshots.length !== 1) throw new Error();
    const s = p.bundle.snapshots[0], v = s.view, m = p.marker;
    if (v.scan_id !== p.job_id || !['completed', 'partial', 'cancelled'].includes(v.status)) throw new Error();
    el('report-title').textContent = { completed: '扫描完成', partial: '保留部分结果', cancelled: '扫描已取消' }[v.status];
    el('report-description').textContent = '元数据与本次可选结构证据，按各自实际结果展示。';
    el('source-kind').textContent = '来源：' + s.source_kind + ' · 汇总：' + s.summary.export_version + ' · 只读';
    list(el('report-metrics'), [['记录条目', s.summary.counts.findings], ['覆盖问题', s.summary.counts.issues],
      ['分配空间', bytes(v.totals.allocated_bytes)], ['可回收空间', '未知']]);
    const limits = p.bundle.policy.limits;
    el('coverage').textContent = '状态：' + v.status + ' · 覆盖完整：' + v.totals.coverage_complete +
      ' · 已扫描 ' + v.totals.scanned_entries + ' · 已跳过 ' + v.totals.skipped_entries +
      ' · 声明策略深度 ' + limits.max_depth + ' / 总条目 ' + limits.max_entries + ' / 每目录 ' + limits.max_dir_entries +
      '。仅元数据观察；用户手势来源与生产竞态保护未验证。';
    for (const issue of v.issues) el('issues').append(node('li', issue.code + ' · ' + (issue.relative_path ?? '范围未知') + ' · ' + issue.message));
    if (!v.issues.length) el('issues').append(node('li', '本次未报告覆盖问题；不扩大声明的扫描范围。'));
    for (const f of v.findings) {
      const row = document.createElement('article'); row.className = 'finding';
      row.append(node('h4', f.relative_path), node('p', '风险：' + f.risk + ' · 分类：' + f.category),
        node('p', '保护原因：' + f.protection_reasons.join(' · '), 'protection'),
        node('p', '逻辑长度：' + bytes(f.logical_bytes) + ' · 分配空间：' + bytes(f.size.allocated_bytes) +
          ' · 可回收下限：' + bytes(f.size.reclaimable_lower_bytes) + ' · 上限：' + bytes(f.size.reclaimable_upper_bytes)),
        node('p', '来源：' + f.rule_version + ' · ' + f.evidence));
      el('findings').append(row);
    }
    if (!v.findings.length) el('findings').append(node('p', '本次没有记录条目，不表示目录为空或没有受保护数据。', 'report-copy'));
    el('metadata-preview').textContent = s.redacted_json;
    el('download-metadata').href = location.pathname + 'metadata.json';
    let label;
    if (m.status === 'not_requested') label = '未请求读取 · 本次未读取清单';
    else if (m.status === 'skipped') label = m.error_code === 'selection_cancelled' ? '选择取消未读' :
      v.status === 'cancelled' ? '扫描取消未读 · 未读取清单' : '已取消内容读取 · 未读取清单';
    else if (m.status === 'missing') label = '未发现根清单';
    else if (m.status === 'failed') label = '读取失败 · ' + errors[m.error_code];
    else if (m.status === 'observed' && p.read_manifest && v.status !== 'cancelled') {
      const o = JSON.parse(m.observation_json), e = o.evidence;
      label = '已读取根清单 · 仅保留结构统计';
      list(el('structure-counts'), [['读取字节', o.bytes_read + ' B'], ['名称字段', e.has_name ? '存在' : '未提供'],
        ['版本字段', e.has_version ? '存在' : '未提供'], ['private 声明', e.declared_private === null ? '未提供 (null)' : String(e.declared_private)],
        ['已提供字段', e.recognized_field_count + ' / 9'], ['脚本数', e.counts.scripts], ['依赖数', e.counts.dependencies],
        ['开发依赖数', e.counts.dev_dependencies], ['同伴依赖数', e.counts.peer_dependencies],
        ['可选依赖数', e.counts.optional_dependencies], ['工作区模式数', e.counts.workspace_patterns]]);
      el('evidence-preview').textContent = m.observation_json;
      el('download-evidence').href = '/evidence/' + p.job_id + '.json';
      el('structure-panel').hidden = false;
    } else throw new Error();
    el('marker-status').textContent = label;
    el('report-content').hidden = false; document.body.dataset.ready = 'true';
  } catch {
    el('report-content').hidden = true; el('report-title').textContent = '报告不可用';
    el('report-description').textContent = '此结果可能已淘汰，请回到工作台查看最近结果。'; document.body.dataset.ready = 'true';
  }
}
load();
