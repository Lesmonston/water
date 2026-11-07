# Controller mutations for WATER-W13-J1 (medium gate), appended after the replayed ticket controls.
# c1 and c2 are the ones the handoff planned; c3 hits the scan-root path, which the ticket controls do not touch.
# Run from the repo root: PYTHONIOENCODING=utf-8 python .local/w13-accept/add-mutations-j1.py
import json
mp = '.local/w13-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(label, file, old, new, token, why):
    src = open(f'.worktrees/accept-w13-j1/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (label, n)
    m['j1'] = [x for x in m['j1'] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


S = 'packages/junk-scan/src/scan.rs'
add('c1', S, '            || child.attributes & (HIDDEN | SYSTEM) == (HIDDEN | SYSTEM)',
    '            || child.attributes & HIDDEN == HIDDEN',
    'SCAN_W13_JUNCTIONS', 'only the hidden attribute is checked, not system (a hidden-only junction drops out of the index)')
add('c2', S, '.is_some_and(|p| path_eq(p, &item.path) || is_proper_ancestor(&item.path, p))',
    '.is_some_and(|p| path_eq(p, &item.path))',
    'SCAN_W13_JUNCTIONS', 'referenced_by misses junctions whose target lies inside the item')
add('c3', S, '        attributes: attrs,\n',
    '        attributes: 0,\n',
    'SCAN_W13_JUNCTIONS', 'the scan root loses its attributes, so a hidden-system root junction is no longer recognised')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(x['label'] + ' ' + x['mode'] + ' ' + x['token'] + ' ' + x['file'] for x in m['j1']))
