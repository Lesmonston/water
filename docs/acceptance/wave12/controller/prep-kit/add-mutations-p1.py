# Controller mutations for WATER-W12-P1 (heavy gate), appended after the replayed ticket controls.
# Each is at a product call site the ticket controls do not touch.
# Run from the repo root: PYTHONIOENCODING=utf-8 python .local/w12-accept/add-mutations-p1.py
import json
mp = '.local/w12-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(label, file, old, new, token, why):
    src = open(f'.worktrees/accept-w12-p1/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (label, n)
    m['p1'] = [x for x in m['p1'] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


L = 'packages/junk-clean/src/lib.rs'
Q = 'packages/junk-clean/src/quarantine.rs'
add('c1', L, '    if report.journal_error.is_some() {\n        // On an interrupted journal',
    '    if report.journal_error.is_some() && false {\n        // On an interrupted journal',
    'CLEAN_W12_JOURNAL', 'execute keeps every planned volume after a journal failure, not only volumes where an action ran')
add('c2', Q, '                report.status = RunStatus::Stopped;\n                report.journal_error = Some(CleanError::Journal.to_string());',
    '                report.journal_error = Some(CleanError::Journal.to_string());',
    'CLEAN_W12_JOURNAL', 'quarantine leaves the status Completed after a journal failure')
add('c3', Q, '                if !acted {\n                    return Err(CleanError::Journal);',
    '                if false {\n                    return Err(CleanError::Journal);',
    'CLEAN_W12_JOURNAL', 'quarantine treats a result-line failure after a failed (not moved) first item as already acted')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(x['label'] + ' ' + x['mode'] + ' ' + x['file'] for x in m['p1']))
