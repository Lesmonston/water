# Controller mutations for WATER-W12-P2 (medium gate), appended after the replayed ticket controls.
# c1 is the addendum 01 check the ticket promised; c2 and c3 sit at call sites the ticket controls do not touch.
# Run from the repo root: PYTHONIOENCODING=utf-8 python .local/w12-accept/add-mutations-p2.py
import json
mp = '.local/w12-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(label, file, old, new, token, why):
    src = open(f'.worktrees/accept-w12-p2/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (label, n)
    m['p2'] = [x for x in m['p2'] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


C = 'packages/water-service/src/clean.rs'
S = 'packages/water-service/src/service.rs'
add('c1', C, '                            if report.journal_error.is_some()\n                                || reports.iter().any(|r| r.journal_error.is_some())\n                            {',
    '                            if (report.journal_error.is_some()\n                                || reports.iter().any(|r| r.journal_error.is_some())) && false\n                            {',
    'SERVICE_W12_RECORD', 'clean_start keeps running the remaining quarantine batches after a report with journal_error (addendum 01)')
add('c2', S, '.is_some_and(|p| m35::parent(&item.path).eq_ignore_ascii_case(p))',
    '.is_some_and(|p| m35::parent(&item.path) == p)',
    'SERVICE_W12_SKIP', 'folder skips compare the parent folder case-sensitively')
add('c3', S, 'json!({"diagnostics_version":"flick.diagnostics.v1",',
    'json!({"store_root":core.store.root.display().to_string(),"diagnostics_version":"flick.diagnostics.v1",',
    'SERVICE_W12_DIAG', 'diagnostics_get carries the data folder path')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(x['label'] + ' ' + x['mode'] + ' ' + x['token'] + ' ' + x['file'] for x in m['p2']))
