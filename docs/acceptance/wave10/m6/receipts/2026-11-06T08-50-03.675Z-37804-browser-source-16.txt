import {add, el, heading, metric, card, button, row, check} from './common.mjs';
import {dial, treemap, proportions} from './charts.mjs';
import {formatBytes, percent} from '../format.mjs';
export function dedupe(s, a) {
  const page = el('section', 'screen'), v = s.dedupe;
  if (s.busy === 'deduping') {
    const p = s.dedupeProgress;
    add(page, heading('正在查重', '只在本机比对，不保存内容、不上传', p ? [metric(p.found_bytes, '发现重复体量'), metric(p.files_listed, '已列出文件', true)] : []));
    const main = card('查重进度', 'dark main-card');
    add(main, dial(p ? percent(p.bytes_hashed, p.bytes_to_hash) : 0, p ? `${percent(p.bytes_hashed, p.bytes_to_hash).toFixed(0)}%` : '…', p?.phase === 'hashing' ? '比对内容' : '列出文件'), button('停止', a.stopDedupe, 'btn primary bottom', 'dedupe-stop', s.pending)); return add(page, main);
  }
  if (!v) return add(page, heading('重复文件', '尚无查重结果'));
  add(page, heading(`找到 ${v.groups.length} 组重复`, v.location_label_zh, [metric(v.extra_bytes, '多出来的'), metric(v.chosen_bytes, '已选'), metric(v.same_name_different, '组同名不同内容', true)]));
  add(page, proportions(v.groups.map(g => ({title:g.name_zh, bytes:g.size, kind:g.included ? 'lime' : 'sky'}))));
  const content = el('div', 'dedupe-content');
  add(content, add(card('每组文件的大小'), treemap(v.groups.map(g => ({title:`${g.name_zh} · ${g.copies} 份`, bytes:g.size, kind:g.included ? 'selected' : 'sky2'})))));
  const list = card('每组留一份');
  for (const g of v.groups) add(list, add(el('div', 'dedupe-row'), check(`选择${g.name_zh}`, g.included, include => a.dedupeDecide(g.group_id, include), `dup-${g.group_id}`, !g.removable || a.busy()), row(`${g.name_zh} · ${g.copies} 份`, `留 ${g.keep.display_path} · ${g.keep.reason_zh}${g.note_zh ? ' · ' + g.note_zh : ''}`, el('span', '', formatBytes(g.size)))));
  if (v.more) add(list, button(v.more.text_zh, a.expandDedupe, 'summary-link', 'dedupe-more', a.busy()));
  add(list, el('p', 'sub', `另有 ${v.same_name_different} 组同名不同内容，没有列入`), v.skipped_zh && el('p', 'sub', v.skipped_zh)); add(content, list);
  const main = add(card('清理所选', 'dark main-card'), metric(v.chosen_bytes, '先放进隔离区'), el('p', 'sub', '每组保留建议的那一份。'));
  for (const g of v.groups) if (g.included) add(main, row(g.name_zh, `留 ${g.keep.display_path}`, el('span', '', `${g.copies} 份`)));
  add(main, add(el('div', 'bottom'), button(`清理所选 ${formatBytes(v.chosen_bytes)}`, a.prepareDedupe, 'btn primary', 'dedupe-prepare', a.busy() || BigInt(v.chosen_bytes) === 0n)));
  return add(page, add(el('div', 'with-hero'), content, main));
}
