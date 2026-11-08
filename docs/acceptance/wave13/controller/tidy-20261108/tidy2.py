# Second pass of the post-wave-13 wording tidy: what the export scan's patterns do not catch (wave and milestone tags,
# links to contracts that are not published, the host README's acceptance-process paragraph).
import sys

README = 'apps/water/host/README.md'
NEW_NATIVE = (
    "The maintainers' native end-to-end check opens one window and drives 17 steps through the UI: checkup,\n"
    "preview, confirmation, cleanup, quarantine and permanent purge, on a synthetic fixture folder only (the seven\n"
    "categories are off; protected locations are measured read-only). It verifies the fixture deletion and the\n"
    "retained guard files, the stored scan, snapshot, plan and clean, the clean and purge journals, a private\n"
    "WebView profile and that child processes exit. Registry packages build offline from the locked versions.\n"
    "macOS, release packaging and the real picker UI are not covered by it. Foreground activation and\n"
    "backend-failure UI are covered by code and unit tests; the check does not launch a second instance, inject\n"
    "startup failure, request a real system shutdown or close the window during an active cleanup.\n"
    "Tests use a recording Opener, including an owned junction rejection fixture;\n"
    "neither tests nor the native check click “打开文件夹” or launch Explorer.\n"
    "The fixture enters `.flick-quarantine` before permanent purge. Exclusions and persistent skips are not\n"
    "exercised by this flow.")

EDITS = {
    'contracts/m3c-v1/IPC-M3C.md': [('# IPC-M3C：界面接口增量（M3 收口）', '# IPC-M3C：界面接口增量', 1)],
    README: [('The three W12 commands follow those additions in both registries:', 'The three newest commands follow those additions in both registries:', 1)],
    'packages/junk-clean/src/model.rs': [
        ('    /// W12: set when the journal failed after an action ran; the report is still returned (contracts/w12-v1/W12.md section 3).\n',
         '    /// Set when the journal failed after an action ran; the report is still returned.\n', 1)],
    'packages/junk-clean/src/quarantine_model.rs': [
        ('    /// W12: set when the journal failed after a move ran; the report is still returned (contracts/w12-v1/W12.md section 3).\n',
         '    /// Set when the journal failed after a move ran; the report is still returned.\n', 1)],
    'packages/junk-clean/tests/clean_v1.rs': [
        ("// W10 fixtures have their own randomly-created owner directly under this tree's .local.\n",
         "// These fixtures have their own randomly-created owner directly under this tree's .local.\n", 1)],
    'packages/junk-rules/src/m35.rs': [
        ('//! Optional M3.5 fields and validation shared by rule and plan readers.\n',
         '//! Optional rule fields and their validation, shared by rule and plan readers.\n', 1)],
}

out = {}
for path, edits in EDITS.items():
    raw = open(path, 'rb').read()
    crlf = b'\r\n' in raw
    text = raw.decode('utf-8').replace('\r\n', '\n')
    for old, new, n in edits:
        if text.count(old) != n:
            sys.exit(f'{path}: expected {n} of {old[:60]!r}, found {text.count(old)}')
        text = text.replace(old, new)
    if path == README:
        start = text.index('The native final gate has a ticket-wide one-window budget.')
        end_marker = 'Exclusions and persistent skips are not exercised by this flow.'
        end = text.index(end_marker, start) + len(end_marker)
        if text.count('The native final gate has a ticket-wide') != 1:
            sys.exit('README paragraph start not unique')
        text = text[:start] + NEW_NATIVE + text[end:]
    out[path] = text.replace('\n', '\r\n') if crlf else text
for path, text in out.items():
    open(path, 'wb').write(text.encode('utf-8'))
    print('edited', path)
