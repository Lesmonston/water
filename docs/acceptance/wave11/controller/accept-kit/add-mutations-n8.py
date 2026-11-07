# Controller mutations for WATER-W11-N8 (medium gate), appended after the replayed ticket controls.
# The 1.5 wording item is no longer a ticket control (nc3 became the nested plan), so c1 covers it here.
# Run from the repo root: PYTHONIOENCODING=utf-8 python .local/w11-accept/add-mutations-n8.py
import json
B = chr(92)
mp = '.local/w11-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(label, file, old, new, token, why):
    src = open(f'.worktrees/accept-w11-n8/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (label, n)
    m['n8'] = [x for x in m['n8'] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


S = 'packages/water-service/src/'
# c1 first used '"已经不长了".into()', which does not compile (E0283: every branch then needs inference);
# that run is a controller error, not a kill or a survivor, and c1 was rerun with String::from.
add('c1', S + 'conclusion.rs', 'recent_text(recent_count(r, &first_group.group_id))', 'String::from("已经不长了")',
    'SERVICE_W11_WORDING', 'cluster card without an earlier checkup says "已经不长了" again (clue keeps the recent count)')
add('c2', S + 'quarantine.rs', 'if !crate::storage::plain_directory(std::path::Path::new(root)) {',
    'if false && !crate::storage::plain_directory(std::path::Path::new(root)) {',
    'SERVICE_W11_QUARANTINE', 'service refresh lists registered quarantine roots that do not exist')
add('c3', S + 'clean.rs', ".trim_end_matches('" + B + B + "')\n                        .to_ascii_lowercase()",
    ".trim_end_matches('" + B + B + "')\n                        .to_string()",
    'SERVICE_W11_NESTED', 'nested dedupe compares paths case-sensitively (ASCII aliases survive)')
add('c4', S + 'clean.rs', '"{}' + B + B + '",', '"{}",',
    'SERVICE_W11_NESTED', 'nested dedupe compares raw prefixes without the separator (node_modules-extra dropped)')
add('c5', S + 'quarantine.rs', 'base: Some(root.clone()),', 'base,',
    'SERVICE_W11_QUARANTINE', 'default new move passes no root, leaving the executor default to decide')
add('c6', S + 'service.rs', '.is_some_and(|e| e.code == "MANIFEST_SHADOWED")', '.is_some_and(|e| e.code == "MANIFEST_SHADOWED_NOT")',
    'SERVICE_W11_DECL', 'a shadowed old declaration keeps its old consent')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(x['label'] + ' ' + x['mode'] + ' ' + x['file'] for x in m['n8']))
