# AC addendum 02 execution notes

2026-10-24, original AC conversation, Codex / GPT-6 (no finer model identifier is exposed).
No agents, implementation workers, merge, push or ledger changes.

Authoritative supplement and mirror controls are read from the controller checkout; original AC source/base and reports are retained in this assigned worktree.
Resume at ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c passed at 03:34 UTC: exactly the prepared untracked Cargo.lock, SHA c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8; original 13 source files, report/archive/46 evidence and 519 constraints unchanged.
No environment/dependencies/download command was repeated. Product gates use the absolute ac-mirror-check entry, offline/locked and existing USTC cache, jobs1, original 600-second Cargo bound.

The evidence-only gate-runner.txt launches only the frozen checker, captures stdout/stderr and its OS exit code, and never changes its environment, source, assertions or timeout. It runs via Start-Process -WindowStyle Hidden, one gate at a time, to retain a result across conversation steering. The native window can only be launched by the frozen native gate.

Initial read-only inspection issues: an overbroad filename listing produced truncated tool output; focused reads replaced it. A guessed desktop-bootstrap-resume-v1/SPEC.md path did not exist; actual addendum01 material desktop-bootstrap-addendum-v1/SPEC.md and freeze were read. Windows rg did not expand a registry-directory wildcard; exact private cache path was located and used. A guessed tauri-codegen version path did not exist; the actual locked source was located as 2.7.4. These are inspection errors, never product failures or negative-control evidence.

Tauri API and asset-generation behavior were checked against the exact downloaded tauri 2.12.5 and tauri-codegen 2.7.4 source in this private dependency cache, read-only. No third-party application code was copied and no upstream research code was run.

Original receipt ac/ARCHIVE.json and 46 entries remain read-only, including the earlier blocked network history. New records below this supplement's directory describe only the resumed work and do not retroactively mark earlier attempts as product passes.

Implementation proof before the final submission SHA:

- 03:35:08 red-behavior: offline metadata and cold compilation succeeded; Cargo test exit 101 was a real three-test behavior failure, with AC_BEHAVIOR observed. Frozen helper exit 0/status passed means expected-red evidence, not green product tests. Cold test build finished in 5m29s, within 600 seconds.
- Implemented typed config parsing (required fields, deny unknown/duplicate fields, fixed permission-free values and strict eight-directive CSP), canonical bundled navigation, and Windows reparse-parent rejection for the private WebView profile. Main calls the same public validators; framework APIs compiled successfully. Strengthened boundary cases remain inside exactly the original three top-level tests; none removed/skipped/filtered.
- 03:42:03 test: complete three tests passed, Cargo/helper exit 0. The source/test/README/lock bytes then remained stable except for the two intended mutations below.
- 03:43:19 red-nc1: removed the actual production capability rejection. desktop_config_boundary failed at AC_CAPABILITIES, other two passed; Cargo exit 101/helper exit 0. The temporary unused-field warning is archived, not a compiler failure. Exact original bytes/SHA were immediately restored, then 03:43:57 complete three tests passed.
- 03:44:35 red-nc2: allowed external HTTPS in the real navigation validator. desktop_navigation_boundary failed at AC_NAVIGATION: https://example.com, other two passed; Cargo exit 101/helper exit 0. Exact original bytes/SHA were immediately restored, then 03:45:13 complete three tests passed.
- No extra behavior gate, dependency/download retry, manual executable launch or system window occurred during these steps. The next step is a clean implementation commit and the three serial final modes.
