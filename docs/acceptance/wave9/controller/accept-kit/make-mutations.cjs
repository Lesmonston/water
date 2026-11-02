// Controller mutations for the wave 9 acceptance trees; each anchor must occur exactly once in its file.
const fs = require('fs');
const tree = s => 'F:/new/smaltalk/water/.worktrees/accept-w9-' + s + '/';
const m = (label, mode, token, file, old, nu, why) => ({ label, mode, token, file, old, new: nu, why });
const out = {
  l1: [
    m('c1', 'red-nc1', 'RULES_M3D_FALLBACK', 'packages/junk-rules/src/rules.rs', '                || max_depth != main_depth', '                || false', 'a fallback with a different max_depth is accepted'),
    m('c2', 'red-nc1', 'RULES_M3D_FALLBACK', 'packages/junk-rules/src/rules.rs', '                || !seen.insert(id)', '                || (!seen.insert(id) && id.is_empty())', 'two fallbacks for one primary are accepted (seen stays used)'),
    m('c3', 'red-nc2', 'RULES_M3D_CONDITIONS', 'packages/junk-rules/src/types.rs', '        if !seen.insert(kind) {', '        if false && !seen.insert(kind) {', 'a repeated condition kind is accepted'),
    m('c4', 'red-nc1', 'RULES_M3D_FALLBACK', 'packages/junk-rules/src/plan.rs', '.map(|id| format!("custom:{}:{id}#1", root.root_id)),', '.map(|id| format!("custom:{}:{id}#2", root.root_id)),', 'fallback targets point at a non-existent primary target'),
  ],
  l2: [
    m('c1', 'red-nc1', 'SCAN_M3D_CONDITIONS', 'packages/junk-scan/src/scan.rs', '            [..components.len().saturating_sub(1)]', '            [..components.len().saturating_sub(2)]', 'no_ancestor_suffix also skips the parent of D'),
    m('c2', 'red-nc1', 'SCAN_M3D_CONDITIONS', 'packages/junk-scan/src/scan.rs', '        Condition::PathHasAny { names } => components.iter().any(|part| {', '        Condition::PathHasAny { names } => components[..components.len().saturating_sub(1)].iter().any(|part| {', 'path_has_any ignores D itself'),
    m('c3', 'red-nc2', 'SCAN_M3D_GROWTH', 'packages/junk-scan/src/snapshot.rs', 'bytes_delta > 0 && (', 'bytes_delta >= 0 && (', 'an unchanged size still counts as a leak'),
    m('c4', 'red-nc1', 'SCAN_M3D_CONDITIONS', 'packages/junk-scan/src/scan.rs', '                    let target = &plan.targets[index];\n                    push_measured_hit(', '                    let target = &plan.targets[row.index];\n                    push_measured_hit(', 'routed hits take the primary target group, level and age'),
    m('c5', 'red-nc1', 'SCAN_M3D_CONDITIONS', 'packages/junk-scan/src/scan.rs', '                                fallbacks[index]\n', '                                fallbacks[index].or(Some(index))\n', 'without a fallback, a failed hit still goes to the primary'),
  ],
  l3: [
    m('c1', 'red-nc1', 'SERVICE_M3D_GROWTH_BASE', 'packages/water-service/src/service.rs', 'at.checked_sub(Duration::from_secs(86_400))?', 'at.checked_sub(Duration::from_secs(3_600))?', 'the growth base needs only one hour'),
    m('c2', 'red-nc1', 'SERVICE_M3D_GROWTH_BASE', 'packages/water-service/src/service.rs', '.max_by_key(|(ended, _)| *ended)', '.min_by_key(|(ended, _)| *ended)', 'the oldest qualifying scan becomes the base (probe: latest-wins coverage)'),
    m('c3', 'red-nc1', 'SERVICE_M3D_GROWTH_BASE', 'packages/water-service/src/service.rs', 'r.previous_at = if r.saved.get("growth_base_scan_id").is_some() {', 'r.previous_at = if false {', 'reload ignores growth_base_scan_id (probe: reload coverage)'),
    m('c4', 'test', 'SERVICE_M3D_HISTORY', 'packages/water-service/src/service.rs', 'if r.result.status == "cancelled" {', 'if r.result.status == "canceled" {', 'stopped scans lose the 已停止 text'),
    m('c5', 'red-nc2', 'SERVICE_M3D_CLEAN_SUMMARY', 'packages/water-service/src/service.rs', '.filter(|g| g["status"] == "done" || g["status"] == "partial")', '.filter(|g| g["status"] == "done")', 'partial groups are not counted (probe: partial coverage)'),
  ],
  l4: [
    m('c1', 'red-nc1', 'PROCESS_M3D_MSYS', 'packages/process-scan/src/lib.rs', 'return contains_bounded_path(&haystack, &msys_path);', 'return haystack.contains(&msys_path);', 'the MSYS spelling skips both boundary checks'),
    m('c2', 'red-nc1', 'PROCESS_M3D_MSYS', 'packages/process-scan/src/lib.rs', 'format!("\\\\{}{}", char::from(path[0]), &path_norm[2..])', 'format!("\\\\{}{}", char::from(path[0]).to_ascii_uppercase(), &path_norm[2..])', 'the MSYS drive letter is upper-cased against a lower-cased command line'),
    m('c3', 'red-nc2', 'PROCESS_M3D_MSYS', 'packages/process-scan/src/lib.rs', 'if path.len() > 3 && path[0].is_ascii_alphabetic()', 'if path.len() > 30 && path[0].is_ascii_alphabetic()', 'paths shorter than 30 bytes get no MSYS spelling'),
  ],
};
for (const [slot, list] of Object.entries(out)) for (const x of list) {
  const n = fs.readFileSync(tree(slot) + x.file, 'utf8').split(x.old).length - 1;
  if (n !== 1) throw new Error(`${slot} ${x.label}: anchor hits ${n}`);
}
fs.writeFileSync('F:/new/smaltalk/water/.local/w9-accept/mutations.json', JSON.stringify(out, null, 1) + '\n');
console.log(Object.entries(out).map(([k, v]) => k + ':' + v.length).join(' '));
