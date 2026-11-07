# Controller mutations for wave 11 acceptance (N2, N3, N5), appended after the replayed ticket controls.
# Each anchor must occur exactly once in the submitted tree; mode "test" means the real tests must fail with the token.
import json
B = chr(92)
mp = '.local/w11-accept/mutations.json'
m = json.load(open(mp, encoding='utf-8'))


def add(slot, label, file, old, new, token, why):
    src = open(f'.worktrees/w11-{slot}/{file}', encoding='utf-8', newline='').read()
    n = src.count(old)
    assert n == 1, (slot, label, n)
    m[slot] = [x for x in m[slot] if x['label'] != label] + [
        {'label': label, 'mode': 'test', 'token': token, 'file': file, 'old': old, 'new': new, 'why': why}]


S = 'packages/junk-scan/src/scan.rs'
ST = 'packages/junk-scan/src/scan/streaming.rs'
add('n5', 'c1', S, '|| c.name.eq_ignore_ascii_case(".flick-quarantine")))', '|| c.name == ".flick-quarantine"))',
    'SCAN_W11_RENAME', 'listing filter compares the new quarantine name case-sensitively')
add('n5', 'c2', S, '|| p.eq_ignore_ascii_case(".flick-quarantine")', '|| p == ".flick-quarantine"',
    'SCAN_W11_RENAME', 'ignored_root compares the new quarantine name case-sensitively')
add('n5', 'c3', ST, '                                || c.name.eq_ignore_ascii_case(".flick-cleanup.json"))\n                    });',
    '                                )\n                    });',
    'SCAN_W11_RENAME', 'declared (cluster protection) ignores the new declaration name; location report kept')
add('n5', 'c4', ST, '                                    || c.name.eq_ignore_ascii_case(".flick-cleanup.json"))',
    '                                    || c.name == ".flick-cleanup.json")',
    'SCAN_W11_RENAME', 'declaration location report compares the new name case-sensitively')

L = 'packages/junk-clean/src/lib.rs'
Q = 'packages/junk-clean/src/quarantine.rs'
M = 'packages/junk-clean/src/model.rs'
add('n3', 'c1', L, '    plan.validate_disjoint_items()?;\n', '', 'CLEAN_W11_NESTED',
    'execute call site skips the overlap check (quarantine keeps it)')
add('n3', 'c2', Q, '        plan.validate_disjoint_items()?;\n', '', 'CLEAN_W11_NESTED',
    'quarantine call site skips the overlap check (execute keeps it)')
add('n3', 'c3', M, '"{}' + B + B + '",', '"{}",', 'CLEAN_W11_NESTED',
    'overlap check compares raw string prefixes without the separator (cache vs cache-x)')
add('n3', 'c4', M, "item.path.trim_end_matches('" + B + B + "').to_ascii_lowercase()",
    "item.path.trim_end_matches('" + B + B + "').to_string()", 'CLEAN_W11_NESTED',
    'overlap check becomes case-sensitive')
add('n3', 'c5', Q, '                            p.eq_ignore_ascii_case(".flick-quarantine")\n',
    '                            p == ".flick-quarantine"\n', 'CLEAN_W11_RENAME',
    'source-path guard compares the new quarantine name case-sensitively')
add('n3', 'c6', Q, '        p.eq_ignore_ascii_case(".flick-quarantine") || p.eq_ignore_ascii_case(".water-quarantine")',
    '        p == ".flick-quarantine" || p.eq_ignore_ascii_case(".water-quarantine")', 'CLEAN_W11_RENAME',
    'validate_root compares the new quarantine name case-sensitively')

D = 'apps/water/host/src/data.rs'
O = 'apps/water/host/src/opener.rs'
P = 'apps/water/host/src/policy.rs'
add('n2', 'c1', D, 'if fs::rename(&old, &new).is_ok() || check_directory(&new).is_ok() {',
    'if false || check_directory(&new).is_ok() {', 'HOST_W11_DATA_MOVE',
    'the one-time rename never happens (old directory used every time)')
add('n2', 'c2', D, 'NotFound && check_directory(&old).is_ok() =>', 'NotFound && fs::symlink_metadata(&old).is_ok() =>',
    'HOST_W11_DATA_MOVE', 'an old directory that is a junction counts as plain and is renamed')
add('n2', 'c3', O, '        name.eq_ignore_ascii_case(".flick-quarantine")\n', '        name == ".flick-quarantine"\n',
    'HOST_W11_REVEAL', 'reveal compares the new quarantine name case-sensitively')
add('n2', 'c4', P, 'if config.product_name != "Flick"\n',
    'if (config.product_name != "Flick" && config.product_name != "Water")\n', 'HOST_W11_RENAME',
    'config check also accepts productName Water')
json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for s in ['n4', 'n6', 'n7', 'n5', 'n3', 'n2']:
    print(s, [x['label'] + ':' + x['mode'] for x in m[s]])
