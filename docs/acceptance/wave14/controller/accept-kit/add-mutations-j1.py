# Controller mutations for WATER-W14-J1 (medium gate), appended after the replayed ticket controls.
# Each attacks a different part of the GPU cache exception than the ticket controls do.
# Run from the repo root: PYTHONIOENCODING=utf-8 python .local/w14-accept/add-mutations-j1.py
import json
mp = '.local/w14-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(label, file, old, new, token, why):
    src = open(f'.worktrees/accept-w14-j1/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (label, n)
    m['j1'] = [x for x in m['j1'] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


S = 'packages/junk-scan/src/scan.rs'
add('c1', S, '            "grshadercache",\n', '',
    'SCAN_W14_GPU', 'one known GPU cache folder name is missing from the list')
add('c2', S, '        .contains(&file_name(parent))\n',
    '        .iter()\n        .any(|d| parent.split(\'\\\\\').any(|p| p == *d))\n',
    'SCAN_W14_GPU', 'any ancestor folder counts instead of the direct parent (a deeper cache.db stops being valuable)')
add('c3', S, '        .contains(&file_name(parent))\n',
    '        .contains(&file_name(&path))\n',
    'SCAN_W14_GPU', 'the file name itself is compared with the folder list, so the exception never applies')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(x['label'] + ' ' + x['mode'] + ' ' + x['token'] + ' ' + x['file'] for x in m['j1']))
