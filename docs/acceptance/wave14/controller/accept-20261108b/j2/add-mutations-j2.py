# Controller mutations for WATER-W14-J2 (medium gate), appended after the replayed ticket controls.
# Each attacks a different part of the root reporting than the ticket controls do.
# Run from the repo root: PYTHONIOENCODING=utf-8 python .local/w14-accept/add-mutations-j2.py
import json
mp = '.local/w14-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(label, file, old, new, token, why):
    src = open(f'.worktrees/accept-w14-j2/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (label, n)
    m['j2'] = [x for x in m['j2'] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


S = 'packages/junk-scan/src/scan.rs'
W = 'packages/junk-scan/src/scan/streaming.rs'
add('c1', S, '            root: root.to_string(),\n', '            root: root.to_ascii_lowercase(),\n',
    'SCAN_W14_ROOTS', 'root is reported lowercased instead of as the first target wrote it')
add('c2', S, '        if self.cancel.is_cancelled() || self.budget_exhausted() {\n            return;\n        }\n        *roots_done += 1;\n',
    '        *roots_done += 1;\n',
    'SCAN_W14_ROOTS', 'roots are still reported after cancel or an exhausted budget')
add('c3', W, '            }\n            engine.emit_root_done(root, &mut roots_done, roots_total);\n            continue;\n',
    '            }\n            continue;\n',
    'SCAN_W14_ROOTS', 'roots skipped when reached (missing, not a directory, reparse point) are never reported')
add('c4', W, '    skipped.sort_by_key(|(_, ids)| ids[0]);\n', '',
    'SCAN_W14_ROOTS', 'skipped-up-front roots are reported in key order instead of plan order (probe: may coincide in the fixture)')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(x['label'] + ' ' + x['mode'] + ' ' + x['token'] + ' ' + x['file'] for x in m['j2']))
