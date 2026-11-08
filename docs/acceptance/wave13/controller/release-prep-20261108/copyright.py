# Release prep (11-08): the exe's version resource gets a copyright line (tauri-build sets LegalCopyright from
# bundle.copyright), the host's config check knows the field, and the installer uses the same words.
import sys
C = 'Copyright (c) 2026 Flick contributors'
EDITS = {
    'apps/water/host/tauri.conf.json': [
        ('"bundle": { "active": false, "publisher": "Flick" },', '"bundle": { "active": false, "publisher": "Flick", "copyright": "' + C + '" },', 1)],
    'apps/water/host/src/policy.rs': [
        ('struct Bundle {\n    active: bool,\n    publisher: String,\n}', 'struct Bundle {\n    active: bool,\n    publisher: String,\n    copyright: String,\n}', 1),
        ('        || config.bundle.publisher != "Flick"\n', '        || config.bundle.publisher != "Flick"\n        || config.bundle.copyright != "' + C + '"\n', 1)],
    'apps/water/host/tests/host_v1.rs': [
        ('        json!({"active": false, "publisher": "Flick"}),\n        "HOST_W12_INFO exact bundle publisher and disabled bundling"',
         '        json!({"active": false, "publisher": "Flick", "copyright": "' + C + '"}),\n        "HOST_W12_INFO exact bundle publisher, copyright and disabled bundling"', 1),
        ('}}, "bundle": {"active": false, "publisher": "Flick"}, "plugins": {}',
         '}}, "bundle": {"active": false, "publisher": "Flick", "copyright": "' + C + '"}, "plugins": {}', 1),
        ('        ("/bundle/publisher", json!("Other")),\n', '        ("/bundle/publisher", json!("Other")),\n        ("/bundle/copyright", json!("Other")),\n', 1),
        ('    let mut missing_publisher = config.clone();\n',
         '    let mut missing_copyright = config.clone();\n'
         '    missing_copyright["bundle"]\n'
         '        .as_object_mut()\n'
         '        .unwrap()\n'
         '        .remove("copyright");\n'
         '    assert!(\n'
         '        validate_config(&missing_copyright.to_string()).is_err(),\n'
         '        "HOST_W12_INFO missing copyright rejected"\n'
         '    );\n'
         '    let mut missing_publisher = config.clone();\n', 1)],
    'packaging/windows/flick.nsi': [
        ('"LegalCopyright" "Flick contributors"', '"LegalCopyright" "' + C + '"', 1)],
}
out = {}
for path, edits in EDITS.items():
    raw = open(path, 'rb').read()
    crlf = b'\r\n' in raw
    text = raw.decode('utf-8').replace('\r\n', '\n')
    for old, new, n in edits:
        if text.count(old) != n:
            sys.exit(f'{path}: expected {n} of {old[:70]!r}, found {text.count(old)}')
        text = text.replace(old, new)
    out[path] = text.replace('\n', '\r\n') if crlf else text
for path, text in out.items():
    open(path, 'wb').write(text.encode('utf-8'))
    print('edited', path)
