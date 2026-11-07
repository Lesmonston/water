# Controller mutations for WATER-W13-S1 (medium gate), appended after the replayed ticket controls.
# The three the handoff planned: N = 0 wording, quarantined summary with nothing moved, English failure reason.
# Run from the repo root: PYTHONIOENCODING=utf-8 python .local/w13-accept/add-mutations-s1.py
import json
mp = '.local/w13-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(label, file, old, new, token, why):
    src = open(f'.worktrees/accept-w13-s1/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (label, n)
    m['s1'] = [x for x in m['s1'] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


C = 'packages/water-service/src/clean.rs'
add('c1', C, 'json!("清理日志没写全，这次要清的都已处理")',
    'json!(format!("清理日志没写全，后面的 {n} 项没有清"))',
    'SERVICE_W13_JOURNAL', 'the journal note for N = 0 goes back to "后面的 0 项没有清"')
add('c2', C, '    if count > 0 {\n        view["quarantined"]',
    '    if count > 0 || ids.is_empty() {\n        view["quarantined"]',
    'SERVICE_W13_JOURNAL', 'quarantined is written (item_count 0) when no batch moved anything')
add('c3', C, 'clean::CleanError::Native => "文件操作失败",',
    'clean::CleanError::Native => "filesystem operation failed",',
    'SERVICE_W13_JOURNAL', 'a native quarantine failure reason reaches the UI in English')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(x['label'] + ' ' + x['mode'] + ' ' + x['token'] + ' ' + x['file'] for x in m['s1']))
