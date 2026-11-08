# Controller mutations for WATER-W14-S1 part B (medium gate), appended after the replayed ticket controls.
# Each attacks the new root-based rules-stage progress, which the ticket controls do not touch.
# Run from the repo root: PYTHONIOENCODING=utf-8 python .local/w14-accept/add-mutations-s1.py
import json
mp = '.local/w14-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(label, file, old, new, token, why):
    src = open(f'.worktrees/accept-w14-s1/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (label, n)
    m['s1'] = [x for x in m['s1'] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


S = 'packages/water-service/src/service.rs'
T = 'SERVICE_W14_PROGRESS'
add('c1', S, '        if self.drive_ids.is_empty() { 90 } else { 40 }\n', '        90\n', T,
    'the rules stage always ends at 90, even with a whole-drive location (should be 40)')
add('c2', S, '                .find(|t| &t.target_id == id)\n', '                .find(|t| &t.target_id == id && false)\n', T,
    'a fallback Marker no longer follows the target it backs up; it uses its own root')
add('c3', S, '        rules.completed_roots.insert(root.root.to_ascii_lowercase());\n',
    '        rules.completed_roots.insert(root.root.clone());\n', T,
    'reported roots are stored with their original case, so case-insensitive lookups of targets miss them')
add('c4', S, '            s.scan_progress["percent"] = json!(\n                self.rule_end()\n                    .max(s.scan_progress["percent"].as_u64().unwrap_or(0))\n            );\n',
    '            s.scan_progress["percent"] = json!(s.scan_progress["percent"].as_u64().unwrap_or(0));\n', T,
    'after an early end (roots left unreported) the rules stage does not jump to its end when scan_full returns')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(x['label'] + ' ' + x['mode'] + ' ' + x['token'] + ' ' + x['file'] for x in m['s1']))
