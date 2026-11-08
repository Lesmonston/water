# Flick

A disk junk checkup and cleaner for Windows. It scans read-only first, then gives you one conclusion: what is safe to clean, what needs a look from you, and what will never be touched.

[中文](README.md)

## What it does

- **Read-only checkup** of common locations, a whole drive or folders you add. Checkup and cleaning both run on your machine; no data is uploaded.
- **Conclusion first**: recommended items can be cleaned directly; items that need your judgement (installers, old backups, session logs and so on) get one card and one decision each; protected data is listed but never selectable.
- **Quarantine before delete**: items you choose are moved to `.flick-quarantine` on the same drive, where you can restore them or delete them for good. Recommended items are deleted directly.
- **Journal before action**: every file operation is written to a journal first; if the journal cannot be written, the run stops and records exactly what was done.
- **Skip from now on**: one location, a whole group, items of one template or one folder can go on the skip list; remove them any time under Settings → Skip list.
- **Readable rules**: every rule says what the location is, why it is safe to clean, what happens afterwards, and where that knowledge comes from. Covered today: caches and logs of AI coding tools, browser and embedded browser caches, developer tool caches, crash dumps, GPU shader caches, installers and more.
- **Hand it to an agent**: folders that keep growing come with a clue you can copy to a coding agent to find the root cause.

The interface is Chinese only for now.

## Install

- Windows 10 or 11 (x64) with the Microsoft Edge WebView2 Runtime (built into Windows 11).
- From [Releases](https://github.com/Lesmonston/flick/releases):
  - `Flick-Setup-<version>.exe` installs for the current user, needs no administrator rights and adds a Start menu shortcut;
  - `flick-<version>-windows-x64.zip` is portable: unzip and run `flick.exe`;
  - `SHA256SUMS.txt` holds the checksums of both.
- 0.1 is not code-signed yet, so SmartScreen may warn about an unknown publisher on first run.
- Settings, checkup records and cleaning journals live in `%LOCALAPPDATA%\Flick`. Uninstalling leaves that folder in place.

## Build from source

Rust 1.95.0 (picked up from `rust-toolchain.toml`). The interface is static files; there is no Node build step.

```powershell
cargo build --release --locked --manifest-path apps/water/host/Cargo.toml --bin flick
```

The program is written to `apps/water/host/target/release/flick.exe`.

Tests, as CI (`.github/workflows/ci.yml`) runs them:

```powershell
cargo test --locked --manifest-path packages/junk-rules/Cargo.toml   # each package on its own
node --test apps/water/ui/tests/unit.test.mjs                         # interface unit tests
```

The installer needs [NSIS](https://nsis.sourceforge.io/) 3:

```powershell
powershell -NoProfile -File packaging/windows/build.ps1 -Exe <flick.exe> -Version 0.1.0 -OutDir <new folder>
```

## Layout

| Path | Contents |
|---|---|
| `apps/water/host` | Desktop program (Tauri 2) |
| `apps/water/ui` | Interface |
| `packages/water-service` | Conclusions, cleaning plans, quarantine and records |
| `packages/junk-rules` | Rules; the data is `rules/windows.json` |
| `packages/junk-scan`, `packages/junk-clean` | Scanning and execution (journal before action) |
| `packages/process-scan`, `packages/installed-apps` | Whether a file is in use, and which installed program it belongs to |
| `packages/cleanup-manifest` | Folders a project declares as disposable (`.flick-cleanup.json`) |
| `packages/dup-finder` | Duplicate finder |
| `packages/native-picker`, `packages/native-root`, `packages/scope-registry` | Folder picking and checkup scope |
| `contracts` | Interface notes and test fixtures between the interface and the service |
| `packaging/windows` | Installer scripts |

Crate and folder names still say `water`, the project's earlier name; the product is Flick.

## Contributing

Questions, rules and code are all welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Rules help most: which folder keeps growing on your machine, which program leaves it there, and whether it is safe to delete.

## Security

If Flick deleted or moved something it should not have, please report it privately as described in [SECURITY.md](SECURITY.md).

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
