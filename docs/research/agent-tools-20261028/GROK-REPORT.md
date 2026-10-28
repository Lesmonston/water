# Agent tool storage on Windows — what Water can delete

Read 2026-10-28. Sources are public pages opened that day, plus a few points marked **own knowledge, not verified**. Nothing on this machine was opened. Sizes and first-level names are only those in the brief. “~” is the user profile.

Levels:

| Level | Meaning for Water |
|---|---|
| recommended | Pure cache, logs, crash dumps, or leftover update packages. |
| confirm | Regenerable, but the user may still want it (staged update not yet applied, undo snapshots, command history). |
| advisory | Do not offer deletion. Mixed, unknown, or the live program. |
| protected | Sessions, credentials, settings, skills, memory, workspaces, or models the user downloaded. |

Age is the minimum last-write age before a delete, and only when no in-use process is running (see the process list on each tool). “0” means “as soon as nothing has the folder open.”

Water already covers Codex staging and runtime caches, Claude Code `projects` and `file-history`, Claude desktop Squirrel `app-*` / `packages`, Cursor chats, Grok `downloads` and `sessions`, generic Squirrel packages, generic Electron caches, and headless-browser profiles in Temp. This report does not repeat those rules except where a new folder needs the same treatment.

---

## 1. Electron-updater `pending` (applies to every `*-updater` folder below)

**What `pending` is.** electron-updater stores the downloaded update under `%LOCALAPPDATA%\<appName>-updater\pending`. After the first successful download it writes `pending\update-info.json` (file name, sha512, version, admin-rights flag) next to the package (NSIS `.exe`, or the nsis-web package). The helper’s pending directory is `cacheDir/pending`. A newer updater build deletes the package from `pending` only after a later launch is actually running that version; a failed or not-yet-installed update is kept. Source: [DownloadedUpdateHelper.ts](https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/DownloadedUpdateHelper.ts) and [v27 runtime notes](https://www.electron.build/docs/migration/v27-runtime-changes), read 2026-10-28. The Windows cache path `%LOCALAPPDATA%\[appName]-updater\pending` is described in a Tencent Cloud write-up of the same library: [线上 Electron 应用具备哪些特征](https://cloud.tencent.com/developer/article/2164989), read 2026-10-28. A scoped npm name becomes a folder like `@opencode-aidesktop-updater` because the updater directory name is the app name plus `-updater` (own knowledge of electron-builder’s `updaterCacheDirName`; the `@` folders on this machine match that pattern, and the two OpenCode updater names match the two desktop package generations below).

**Leftover after install.** The `pending` directory is often not removed after a successful install. That is an upstream bug, not a second copy of user data: [electron-builder#8730](https://github.com/electron-userland/electron-builder/issues/8730), read 2026-10-28. Deleting it when no update is in progress only forces the next check to download again. The same directory also holds an update the user has downloaded and not installed yet (`quitAndInstall({ waitUntilNextLaunch: true })` / install-on-next-launch). Deleting that one discards a finished download. It is still regenerable. Level: **recommended**, age **1 day**, and only when the tests below say nothing is updating.

**Also in the updater directory, beside `pending`.** Stack Overflow shows `installer.exe` plus `pending\<App>-<version>.exe` and `pending\update-info.json`: [Electron updater keeps new updates at user level](https://stackoverflow.com/questions/78044571/electron-updater-keeps-new-updates-at-user-level), read 2026-10-28. `installer.exe` is the same kind of residue. Level: **recommended**, same age and same lock.

**When an update is in progress.** There is no single exe name.

- Any process whose executable path sits under that `*-updater` directory (the cached installer, `installer.exe`, or a setup exe launched from `pending`).
- The app’s own exe, for the whole time it is running. electron-updater downloads and verifies inside the app process, then spawns the NSIS installer. The spawn name is the downloaded file’s name, not a fixed `Update.exe`. `Update.exe` / `Squirrel.exe` belong to Squirrel.Windows, which Water already handles, and they are not this `pending` folder.
- Per-machine NSIS can also spawn `elevate.exe` (electron-builder v27 notes, same URL as above). `elevate.exe` is used by other installers too. Treat it as “in progress” only when its path is under the updater directory.

Skip the whole updater folder if the parent app exe in the process table below is running. A background download has no separate process.

**Not this mechanism.** Tauri NSIS updaters (older OpenCode Desktop) do not use `@…-updater\pending`. They kill by process name. See OpenCode.

---

## 2. `bin` / self-updated CLIs — old versions side by side?

| Tool | Side-by-side old versions? | How to tell current from old by name only |
|---|---|---|
| Grok `~\.grok\bin` | Not in `bin`. The installer writes fixed names `grok.exe` and `agent.exe`, and on Windows also `grove.exe`, `grove-fsmonitor.exe`, `grove-credential.exe` beside them. It overwrites. Old **MinGit** copies are side by side under `%LOCALAPPDATA%\grok\git\<version>\`. The script says the newest usable version wins and older version directories are left in place. Installer payloads go to `~\.grok\downloads`. Source: [install.ps1](https://storage.googleapis.com/grok-build-public-artifacts/cli/install.ps1), fetched as text 2026-10-28 (script dated in the search index 2026-09-26). | In `git\`, a single directory is current. If several directories are named like versions, the highest version **and** the newest write time should both be kept when they differ, because the script says “usable,” which a name cannot prove. Do not delete `bin` itself: those exes are the program. |
| Kimi `~\.kimi-code\bin` | The published tree is only managed `rg.exe` and `fd.exe`, re-downloaded if `bin` is deleted. Source: [Data locations](https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html), read 2026-10-28. | Not versioned. **This machine’s `bin` is 289 MB.** That does not match ripgrep plus fd. Do not delete `bin` until its children are listed (open question). |
| Qoder `~\.qoderworkcn\bin` | No public layout. 69 MB is in the range of one current runtime, not a stack of old versions. | Unknown. Advisory until listed. |
| ZCode `~\.zcode\cli` | Official CLI **runtime** installs as one tree at `~\.zcode\runtime` (override `ZCODE_DIST_HOME`), not as side-by-side versions. A new install does not remove old Lite directories. Source: [zai-org/ZCode README](https://github.com/zai-org/ZCode/blob/main/README.en.md), read 2026-10-28. The 136 MB `cli` folder is also where settings live (`setting.json` / `config.json`). Source: [zcode-cli CONFIGURATION](https://github.com/kingsword09/zcode-cli/blob/main/docs/CONFIGURATION.md), read 2026-10-28. | No documented pointer file. Do not delete `cli` or `runtime` as a whole. If the controller later sees several semver-named directories, there is still no documented “current” name. Leave them. |

`%LOCALAPPDATA%\agy` (357–555 MB) is the Antigravity CLI install dir, documented as `...\agy\bin` holding `agy`. Source: [Install](https://antigravity.google/docs/cli/install) and [troubleshooting](https://antigravity.google/docs/cli/troubleshooting), read 2026-10-28. The docs describe one `bin`, not version folders. The size is too big for one small exe. Same rule: list children before deleting anything inside it (open question). The updater lock the docs tell you to remove is `~\.gemini\antigravity-cli\updater\update.lock`, not a second copy of the binary.

---

## 3. Google Antigravity (`agy`) and Antigravity Cockpit

These are two products that share a name.

**Google CLI and IDE**

| Path | Holds | Class | Level | Age | In use |
|---|---|---|---|---|---|
| `%LOCALAPPDATA%\agy\bin` | Current `agy` binary. Docs: install page above. | Program, not cache | advisory | — | `agy.exe` |
| `%LOCALAPPDATA%\agy` (rest) | Undocumented at this size. | Unknown | advisory | — | `agy.exe` |
| `~\.gemini\antigravity-cli\` | CLI brain, conversations, OAuth token file, logs, cache, crashes. Third-party binary review, not Google’s docs: [doubleagent antigravity](https://seanthegeek.net/doubleagent/research/antigravity.html), read 2026-10-28. Token path also stated by Cockpit’s account docs: `<home>/.gemini/antigravity-cli/antigravity-oauth-token` ([AGI Cockpit accounts](https://agi-labo.com/en/tools/cockpit/docs/cockpit-cli/reference/accounts), read 2026-10-28). | User data. `crashes\` and `log\` are the regenerable part | protected for the tree; recommended for `crashes\` and `log\` | 7d for those two | `agy.exe` |
| `~\.gemini\antigravity-cli\updater\` | Update lock and updater state. Docs tell you to delete `update.lock` when an update is stuck. | Residue | recommended for `update.lock` only | 1d | `agy.exe` |
| `~\.gemini\antigravity\` and `~\.gemini\antigravity-ide\` | Separate “brain” trees for the 2.0 manager and the IDE. Forum report: [discuss.ai.google.dev/t/167445](https://discuss.ai.google.dev/t/antigravity-2-0-and-ide-cli-too-shared-brain/167445), read 2026-10-28. | User data | protected | — | `agy.exe`, `Antigravity.exe`, `Antigravity IDE.exe` |
| `~\.antigravity-ide` | **Not the path in those pages** (they use `~\.gemini\antigravity-ide`). On this machine it is a top-level folder. May be a junction, an older build, or something else. | Unknown | advisory | — | same IDE names |
| `%LOCALAPPDATA%\antigravity-updater\` including `pending` (159 MB of 318) | electron-updater cache. Section 1. | Regenerable | recommended | 1d | any process under that directory; also `Antigravity.exe` and `Antigravity IDE.exe` |
| `%APPDATA%\Antigravity\` (104 MB) | Electron / VS Code-fork user data. Doubleagent saw `logs\` here. IDE chat/state is the usual `User\globalStorage\state.vscdb` pattern; doubleagent cites `Antigravity IDE` as the fork name, which may be a different folder than `Antigravity`. | Mixed | advisory for the root. recommended for `logs`, `Cache`, `Code Cache`, `GPUCache`, `CachedData`, `Crashpad` if those children exist | 7d logs and dumps; 1d caches | IDE exes above |

IDE exe names: doubleagent quotes the installer path `Programs\Antigravity IDE\Antigravity IDE.exe`. `Antigravity.exe` is the older product name (own knowledge, not verified against a current installer). Skip on either name.

**Cockpit Tools (third-party account manager), `~\.antigravity_cockpit` (1679 MB)**

Not Google. [cockpit-tools README](https://github.com/jlcodes99/cockpit-tools/blob/main/README.en.md), read 2026-10-28: accounts, settings, logs, backups, instance settings. Existing installs are junctioned so `~\.antigravity_cockpit` and `~\.cockpit_tools` are the same data. `COCKPIT_TOOLS_DATA_DIR` moves it. DeepWiki’s reading of the source puts per-instance user-data dirs under `instances\<product>` ([deepwiki storage](https://deepwiki.com/jlcodes99/cockpit-tools), read 2026-10-28). That matches this machine: `instances` is 1678 of 1679 MB.

| Path | Holds | Class | Level | Age | In use |
|---|---|---|---|---|---|
| `~\.antigravity_cockpit\instances\` | Full isolated profiles (sessions and logins for Antigravity, Kiro, and the other IDEs Cockpit launches). | User data | protected | — | Any IDE exe Cockpit launched; also a Cockpit / Tauri host. Exe name of the host was not in the README. |
| `kiro_accounts\`, `gemini_accounts\` | Account records. Names match the product. Tokens live in this tree (README: data stays on the machine). | Credentials | protected | — | Cockpit host |
| `oauth_pending\` | In-flight OAuth. May contain tokens. | Credentials or residue | advisory | — | Cockpit host |
| `codex_batch_delete_jobs\` | Job state for bulk deletes. May name sessions or accounts. | Unknown, risky | advisory | — | Cockpit host |
| `logs\` at the Cockpit root only | App logs. | Regenerable | recommended | 7d | Cockpit host |
| `accounts\`, `accounts.json`, `account-token.key` (DeepWiki) | Account index and encrypted tokens. | Credentials | protected | — | Cockpit host |

Do not walk into `instances` to clean logs. A log there belongs to a live second profile.

---

## 4. Gemini CLI — `~\.gemini` (3 MB here)

Home is `~\.gemini\settings.json` for user settings, and `~\.gemini\.env` for keys. Source: [configuration](https://geminicli.com/docs/reference/configuration/), [authentication](https://geminicli.com/docs/get-started/authentication/), read 2026-10-28. OAuth file is `~\.gemini\oauth_creds.json` (long-standing path; [gemini-cli#5474](https://github.com/google-gemini/gemini-cli/issues/5474), read 2026-10-28). Extensions, including per-extension `.env` secrets, load from `~\.gemini\extensions\`. Source: [extensions reference](https://geminicli.com/docs/extensions/reference/), read 2026-10-28.

Sessions are `~\.gemini\tmp\<project_hash>\chats\`. Same tree holds `plans\`, `tasks\`, `outputs\`, `logs\`. Source: [session management](https://geminicli.com/docs/cli/session-management), read 2026-10-28. Automatic retention exists and the master switch’s documented default is **off**, so Water must not assume the CLI will have expired old chats.

| Path | Class | Level | Age | In use |
|---|---|---|---|---|
| `settings.json`, `.env`, `oauth_creds.json`, `extensions\`, `google_accounts.json`, trusted-folder and installation-id files | User data / secrets | protected | — | `gemini.exe` (native install) or `node.exe` hosting the CLI. `node.exe` alone is too broad to lock on; lock if the executable path is inside `~\.gemini` or `%LOCALAPPDATA%\agy` |
| `tmp\<hash>\chats\`, `plans\`, `tasks\` | Sessions and plan files | protected | — | same |
| `tmp\<hash>\outputs\` | Tool output | confirm | 7d | same |
| `tmp\<hash>\logs\` | Logs | recommended | 7d | same |
| `antigravity*` children | See section 3 | protected | — | `agy.exe` and the IDE exes |

The whole folder is 3 MB on this machine. There is almost nothing to reclaim. Do not delete the root.

A 2026 PR proposes XDG paths (`gemini-cli` under config/cache) while still honoring an existing `~\.gemini`. Source: [gemini-cli#23992](https://github.com/google-gemini/gemini-cli/pull/23992), read 2026-10-28. Not confirmed shipped. If `%APPDATA%\gemini-cli` or `%LOCALAPPDATA%\gemini-cli` appears later, treat it as the same classes, not as a cache.

---

## 5. xAI Grok Build — `~\.grok`, `~\.grok1`…`~\.grok5`, `~\.grokbot`

Config: `~\.grok\config.toml`. Binary dir: `~\.grok\bin` (override `GROK_BIN_DIR`). Home override: `GROK_HOME`. Sources: [install.ps1](https://storage.googleapis.com/grok-build-public-artifacts/cli/install.ps1); [PackyAPI Grok Build](https://docs.packyapi.com/docs/cli/6-grok-build.html); [codeagentswarm guide](https://www.codeagentswarm.com/en/guides/how-to-use-grok-build), read 2026-10-28. Sessions: `~\.grok\sessions\<encoded-cwd>\<session-id>\` with `summary.json`, `updates.jsonl`, `chat_history.jsonl`, rewind points, and `session_search.sqlite`. Source: [wakatime-cli#1516](https://github.com/wakatime/wakatime-cli/issues/1516) citing docs.x.ai, read 2026-10-28. Skills: `~\.grok\skills\` (codeagentswarm). `~\.grok\version.json` is named as the version file in that same issue.

Water already protects `~\.grok\downloads` and `~\.grok\sessions`. Keep that. The installer **also** uses `downloads` as its payload directory (install.ps1). Those zip/exe payloads are regenerable, but the folder is not documented as installer-only, so a blanket delete stays wrong. Open question: name patterns inside `downloads`.

| Path | Holds | Class | Level | Age | In use |
|---|---|---|---|---|---|
| `~\.grok\sessions\` | Chats, rewind snapshots, search index | User data | protected | — | `grok.exe`, `agent.exe` |
| `~\.grok\config.toml`, `user-settings.json`, `skills\`, `GROK.md` | Settings, skills, instructions. `user-settings.json` / `GROK.md`: [Quartermaster](https://quartermaster.cloud/docs/tools/grok/), read 2026-10-28 (that page describes 0.x and 1.x; layout has churned) | User data | protected | — | `grok.exe` |
| `~\.grok\bin\` | Live `grok.exe`, `agent.exe`, grove hook exes | Program | advisory | — | those exes |
| `%LOCALAPPDATA%\grok\git\<version>\` | Bundled MinGit, old versions kept | Old versions regenerable; one current required | confirm: delete only version dirs that are neither the highest version name nor the newest write | 14d | `grove.exe`, `grove-fsmonitor.exe`, `grove-credential.exe`, `git.exe` whose path is under that tree |
| `~\.grok\downloads\` | Installer payloads, and possibly other files | Mixed | protected (existing Water rule). Individual installer archives are confirm only after the name question | — | `grok.exe` |
| `~\.grok\marketplace-cache\` (24 MB) | Name is a marketplace cache. No public page in this pass describes it. Own knowledge, not verified: plugin packages re-download. | Regenerable if that knowledge holds | confirm | 7d | `grok.exe` |
| `~\.grok\bundled\` (14 MB) | Own knowledge, not verified: skills shipped inside the CLI. Replaced on update. Deleting early removes bundled skills until the next install. | Regenerable but user-visible | confirm | — | `grok.exe` |
| `~\.grok\vendor\` (5 MB) | Not in the pages above. | Unknown | advisory | — | `grok.exe` |

**`~\.grok1` … `~\.grok5`.** The brief says `.grok4` contains its own `AppData` and `.grok` and is a home used by `USERPROFILE` redirection. Cockpit Tools launches extra Grok homes the same way (section 3; AGI Cockpit sets `HOME` / `USERPROFILE` per profile). Each of these trees is another profile, about 1 GB. Level: **protected** for the root and for `<root>\AppData`. The same relative rules may be applied **inside** `<root>\.grok\` (`sessions` protected, `git` old versions confirm, updater-style caches recommended). Never delete the home root.

**`~\.grokbot` and `%APPDATA%\Grok Bot`.** Not Grok Build. No public layout was found in this pass. Level: **advisory**. Do not reuse the `.grok` rules. Process name was not verified.

---

## 6. Kimi Code (Moonshot)

Authoritative tree: [Data locations](https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html), read 2026-10-28. Default root `~\.kimi-code` (`KIMI_CODE_HOME`). Command `kimi`. An older tree under `~\.kimi\` is a previous product line: [kimi-cli data locations](https://moonshotai.github.io/kimi-cli/en/configuration/data-locations.html), read 2026-10-28. This machine’s folder is `.kimi-code`, so use the new page.

Desktop shares `~\.kimi-code` for config, credentials, sessions, and logs. UI state is `%APPDATA%\kimi-code-app`. Update cache is `%LOCALAPPDATA%\kimi-code-app-updater`. Source: [Kimi Code desktop settings](https://www.kimi.com/code/docs/en/kimi-code-desktop/settings-and-extensions.html), read 2026-10-28. The brief’s `%LOCALAPPDATA%\kimi-code` is **not** that updater path. Do not treat it as `pending`.

| Path | Holds | Class | Level | Age | In use |
|---|---|---|---|---|---|
| `sessions\`, `session_index.jsonl` | Chats (`state.json`, `agents\*\wire.jsonl`, plans, cron). Docs say hand-editing breaks resume. | User data | protected | — | `kimi.exe` |
| `credentials\`, `config.toml`, `tui.toml`, `AGENTS.md`, `mcp.json`, `skills\`, `plugins\` | Secrets, settings, skills, plugins | User data | protected | — | `kimi.exe` |
| `user-history\` | Prompt history (arrow keys) | Wanted | confirm | 30d | `kimi.exe` |
| `logs\` | `kimi-code.log`. Docs: safe to delete. | Regenerable | recommended | 7d | `kimi.exe` |
| `updates\` | `latest.json`, `install.json`, `install.lock`, `rollout.log`. Metadata, not a big package. Docs: deleting `latest.json` resets update state. | Residue | recommended for `rollout.log`; confirm for the json. If `install.lock` is younger than 1 day, skip | 1d | `kimi.exe` |
| `locks\` | Live session locks | Not data | advisory | — | `kimi.exe` |
| `bin\` | Documented: `rg.exe`, `fd.exe` only, safe to delete, re-downloaded. **Observed 289 MB, which contradicts that.** | Do not apply the doc blindly | advisory until listed. If the only exes are `rg.exe` and `fd.exe`, recommended, age 0 | — | `kimi.exe` |
| `cache\` (4 MB) | Not in the published tree. | Unknown | confirm | 7d | `kimi.exe` |
| `file-history\` | Not in the published tree. The same name in CodeBuddy and Claude Code is rewind snapshots (user undo). | Treat as undo data | protected | — | `kimi.exe` |
| `~\.kimi-work` (142 MB), `~\.kimi-webbridge` | Not in the CLI page. Separate products. | Unknown | advisory | — | unknown |
| `%LOCALAPPDATA%\kimi-code` | Not the documented updater dir. | Unknown | advisory | — | `kimi.exe` |
| `%LOCALAPPDATA%\kimi-code-app-updater\pending` if it appears later | Section 1 | Regenerable | recommended | 1d | `kimi.exe` and any installer path under it |
| `%APPDATA%\kimi-code-app` if it appears | Desktop UI state | Mixed | advisory; Electron cache children recommended (section 1’s cache list: `Cache`, `Code Cache`, `GPUCache`, `Crashpad`, `logs`) | 1d / 7d | desktop exe, name not in the docs |

Desktop process name was not on the settings page. Lock `kimi.exe` plus any process under `%LOCALAPPDATA%\kimi-code` or `%APPDATA%\kimi-code-app`.

---

## 7. ZCode (Zhipu / Z.ai)

| Path | Holds | Class | Level | Age | In use |
|---|---|---|---|---|---|
| `~\.zcode\v2\` (12 MB) | `credentials.json`, `provider_config.json`, `setting.json` (language and memory). Shared with the desktop app. Sources: [CONFIGURATION.md](https://github.com/kingsword09/zcode-cli/blob/main/docs/CONFIGURATION.md); [zcode-helper README](https://github.com/chenrensong/zcode-helper), read 2026-10-28. | Credentials and settings | protected | — | `zcode.exe`, `ZCode.exe` |
| `~\.zcode\cli\` (136 MB) | Settings and plugins **and** most of the bytes. Runtime package is documented at `~\.zcode\runtime`, not here (ZCode README). This folder is too large to be JSON only, and too important to delete: `setting.json` / `config.json` live in it. | Mixed | advisory for the root. Do not delete `*.json` | — | `zcode.exe` |
| `~\.zcode\workspace\`, `plugin-workspace\` | Names are workspaces | User data | protected | — | `zcode.exe`, `ZCode.exe` |
| `~\.zcode\runtime\` if present | One current CLI runtime. Old Lite dirs are not removed by a new install (README). | Program, plus possible old trees | advisory. No documented “current” pointer | — | `zcode.exe` |
| `%APPDATA%\ZCode\` | Electron user data for the desktop app. No file map in the install doc: [Install](https://zcode.z.ai/en/docs/install), read 2026-10-28. The app can keep running scheduled tasks from the tray. | Mixed | advisory. recommended only for `Cache`, `Code Cache`, `GPUCache`, `Crashpad`, `logs` | 1d caches, 7d logs | `ZCode.exe` |
| `%LOCALAPPDATA%\@zcodedesktop-updater\pending` (156 of 312) | Section 1 | Regenerable | recommended | 1d | `ZCode.exe`; any process under the updater dir |

`zcode.exe` as the Windows process name is stated for the standalone Rust CLI `@mbearo/zcode`: [npm @mbearo/zcode](https://www.npmjs.com/package/@mbearo/zcode), read 2026-10-28. The official desktop app’s exe name was not written out on the install page; `ZCode.exe` matches the product name and is own knowledge, not verified. Skip both.

---

## 8. dsh — DeepSeek Harness

**Identified, with a leftover doubt.** `dsh` is DeepSeek Harness. `DSH_HOME` defaults to `~\.dsh`. Sources: [dsh-win32 README](https://github.com/sjh9714/dsh-win32/blob/master/README.md) (`$DSH_HOME/dsh-win32/preset-backups` or `~\.dsh\dsh-win32\preset-backups`); [@nicremo/dsh-cli](https://www.npmjs.com/package/@nicremo/dsh-cli) (“`DSH_HOME` (dsh home, default `~/.dsh`)”); [DeepSeek Harness Windows tutorial](https://deepseekdsh.com/tutorials/windows), all read 2026-10-28. A third-party desktop wrapper uses `%APPDATA%\DSH Desktop\` instead, unless `DSH_HOME` is set ([dsh_desktop](https://github.com/myYangyunfan/dsh_desktop), read 2026-10-28). Another project, dsh-code, uses `~\.dsh-code`, not `~\.dsh`.

No official page in this pass lists the children of `~\.dsh`. At 3 MB the folder is config, plugins, presets, and possibly credentials. Level: **protected** for the whole directory. Cleanup value is negligible. Do not scrape it for logs.

In use: a `dsh.exe` if the native/desktop build is running, otherwise `node.exe` executing `@deepseek-ai/dsh` (too broad to lock on by image name). The Windows installer download is `dsh-latest-windows-x64.exe` (deepseekdsh.com); the installed process name was not stated. Also skip while a process path is under `~\.dsh`.

---

## 9. Kiro (AWS)

Global dir `~\.kiro`, override `KIRO_HOME`. Documented children: `settings\mcp.json`, `settings\permissions.yaml`, `settings\sandbox.json`, `settings\cli.json`, `agents\`, `steering\`, `skills\`, `hooks\`, `powers\`, `workflows\`. Source: [Kiro configuration](https://kiro.dev/docs/configuration.md), read 2026-10-28. Sessions are also under `~\.kiro`: official CLI page says a SQLite store in `~\.kiro` ([session management](https://kiro.dev/docs/cli/chat/session-management/), read 2026-10-28). On disk, current engines use `~\.kiro\sessions\` (V3 `sessions\<workspace>\sess_*\`, older CLI `sessions\cli\<id>.jsonl`). Sources: [SkyWalking Kiro adapter](https://skywalking.apache.org/docs/skywalking-ai-sessionizer/latest/en/adapters/kiro/), read 2026-10-28; [Kiro#7141](https://github.com/kirodotdev/Kiro/issues/7141), read 2026-10-28. This machine’s `sessions` is 241 of 245 MB. That is the chat store.

IDE state is also `%APPDATA%\Kiro\User\globalStorage\kiro.kiroagent\` (community schema, [codeburn kiro.md](https://github.com/getagentseal/codeburn/blob/main/docs/providers/kiro.md), read 2026-10-28). Treat all of `%APPDATA%\Kiro\User` as settings plus chats.

| Path | Class | Level | Age | In use |
|---|---|---|---|---|
| `~\.kiro\sessions\` | Chats | protected | — | `kiro-cli.exe`, `Kiro.exe` |
| `~\.kiro\skills\`, `steering\`, `settings\`, `extensions\`, `tasks\` | Skills, instructions, settings, tasks. `tasks` is named in the brief and is not in the config table; spec/task files are user work in the project `.kiro`, and a home-level `tasks` is the same kind of data until listed | protected | — | same |
| `%APPDATA%\Kiro\` | IDE profile, including globalStorage chats | protected for `User\`. recommended for `logs`, `Cache`, `CachedData`, `Code Cache`, `GPUCache`, `Crashpad` if present | 7d / 1d | `Kiro.exe` |
| `%LOCALAPPDATA%\com.kiro.account-manager` | Account manager. Name says credentials. No file map found. | Credentials | protected | unknown; skip if any process path is under this folder |

CLI logs from an older command reference: macOS `$TMPDIR/kiro-log`, Linux `/tmp/kiro-log`. The Windows line was not in the excerpt ([CLI commands](https://kiro.dev/docs/cli/reference/cli-commands/), read 2026-10-28). If `%TEMP%\kiro-log` exists, recommended, age 7d.

Exe names `kiro-cli.exe` and `Kiro.exe` match the documented commands `kiro-cli` and the IDE product. Own knowledge that the Windows images use those names; not copied from a process list.

---

## 10. Qoder / QoderWork

CLI settings are `~\.qoder\settings.json`, override `QODER_CONFIG_DIR`. Memory: `~\.qoder\AGENTS.md`. Command is `qodercli`. Source: [配置文件](https://docs.qoder.com/zh/cli/settings) and [using the CLI](https://docs.qoder.com/en/cli/using-cli), read 2026-10-28. Uninstall of QoderWork tells you to delete `~\.qoderwork` **only if you mean to wipe config**. Source: [Windows install](https://docs.qoder.com/qoderwork/install-windows), read 2026-10-28. CN data root is `~\.qoderworkcn` (tasks, workspace files, skills, memory). Source: [Qoder forum 11455](https://forum.qoder.com/t/qoderwork/11455), read 2026-10-28. Working folders are real user directories the user picked, not an app cache: [file management](https://docs.qoder.com/qoderwork/file-management), read 2026-10-28.

| Path | Holds | Class | Level | Age | In use |
|---|---|---|---|---|---|
| `~\.qoderworkcn\workspace\`, `projects\` | Workspaces and projects (146 + 27 MB) | User data | protected | — | `QoderWork.exe` (CN build; exe name own knowledge, not verified) |
| `~\.qoderworkcn\tmp\` (129 MB) | Name says temp. Not documented. | Likely regenerable | confirm | 1d | QoderWork |
| `~\.qoderworkcn\logs\` (10 MB) | Logs | Regenerable | recommended | 7d | QoderWork |
| `~\.qoderworkcn\bin\` (69 MB) | Unknown runtime. One tree, not a version stack (section 2) | Program or cache | advisory | — | QoderWork |
| `~\.qoderwork\` | International edition data. Uninstall deletes it on purpose. | User data | protected | — | QoderWork |
| `~\.qoder-cli\` | Not the documented CLI home (`~\.qoder`). | Unknown | advisory | — | `qodercli.exe` |
| `%APPDATA%\QoderWork CN\` | Electron profile for the CN app | Mixed | advisory root; recommended for `Cache`, `Code Cache`, `GPUCache`, `Crashpad`, `logs` | 1d / 7d | QoderWork |

Skip also on `qodercli.exe` and `Qoder.exe`. The CLI doc shows the command `qodercli`; the `.exe` suffix is the Windows form of that command (own knowledge, not verified).

---

## 11. Tencent CodeBuddy / WorkBuddy

**CodeBuddy Code, `~\.codebuddy\`.** Official tree: [Directory structure of .codebuddy](https://www.tencentcloud.com/document/product/1316/84431), last updated 2026-09-30, read 2026-10-28.

| Path | Holds | Level | Age |
|---|---|---|---|
| `settings.json`, `settings.local.json`, `CODEBUDDY.md`, `mcp.json`, `agents\`, `rules\`, `skills\`, `projects\`, `sessions\`, `plans\`, `history.jsonl`, `blobs\` | Settings, memory, skills, sessions, images in chats | protected | — |
| `file-history\` | Per-session file snapshots for `/rewind`. Same role Water already protects for Claude Code | protected | — |
| `logs\`, `traces\` | Logs and OpenTelemetry traces | recommended | 7d |
| `tasks\` | Listed on that page as runtime data. The excerpt does not say it is disposable. | advisory | — |

**WorkBuddy.**

| Path | Holds | Level | Age | Source |
|---|---|---|---|---|
| `~\.workbuddy\`, `~\.workbuddy-ai\` | CN vs international user homes: skills, settings, and (community write-ups) memory files `SOUL.md` / `IDENTITY.md` / `USER.md`. Both are “very large” here. Roots stay protected. A child named `logs` or `logs\update` is recommended, age 7d. | protected root | — | [掘金: two WorkBuddy clients](https://juejin.cn/post/7697162867455688719), read 2026-10-28. That post names `WorkBuddy.exe` (CN, 5.8.3) and `WorkBuddyAI.exe` (international, 5.8.4), and says update logs are `~\.workbuddy\logs\update\` vs `~\.workbuddy-ai\logs\update\`. |
| `~\WorkBuddy\` | The workspace folder users reopen to find old work. Official FAQ: `C:/Users/<user>/WorkBuddy`. | protected | — | [WorkBuddy 常见问题](https://intl.cloud.tencent.com/zh/document/product/1316/84555), read 2026-10-28 |
| `%LOCALAPPDATA%\CodeBuddyExtension\` | Login and memories. The juejin post puts memories at `Data\Public\.memories\` and says not to delete the tree while separating the two clients. Tencent’s FAQ uses `%APPDATA%\CodeBuddyExtension\Data\Public\auth` (Roaming, not Local) for the ACL check. Either path is credentials. | protected. `Cache` and `Logs` children only: recommended, 1d / 7d | — | juejin post; Tencent FAQ above |
| `%LOCALAPPDATA%\WorkBuddy\`, `%LOCALAPPDATA%\workbuddy-ai\` | Not the documented install dir. The FAQ’s install example is `%LOCALAPPDATA%\Programs\WorkBuddy`. These two may be local app data or a cache. | advisory root; Electron cache children recommended | 1d | FAQ above |
| `%LOCALAPPDATA%\@genieworkbuddy-desktop-updater\` (430 MB) | electron-updater. “genie” is the name used for the WorkBuddy backend in the juejin post. Section 1. | recommended for `pending` and `installer.exe` | 1d | section 1 |

In use: `WorkBuddy.exe`, `WorkBuddyAI.exe`. A CodeBuddy CLI exe was not named in the directory doc. Also skip when a process path is under the folder being cleaned.

---

## 12. OpenCode

CLI data, all platforms including Windows, under the XDG layout even on Windows. Source: [Troubleshooting](https://opencode.ai/docs/troubleshooting/), read 2026-10-28.

| Path | Holds | Level | Age | In use |
|---|---|---|---|---|
| `~\.local\share\opencode\auth.json`, `mcp-auth.json` | API keys and OAuth. [developersdigest file list](https://www.developersdigest.tech/reference/opencode/config-files), read 2026-10-28, agrees | protected | — | `opencode.exe` |
| `~\.local\share\opencode\opencode.db` (and any `OPENCODE_DB` filename) | Projects, sessions, messages | protected | — | `opencode.exe` |
| `~\.local\share\opencode\snapshot\` | Undo snapshots | protected | — | `opencode.exe` |
| `~\.local\share\opencode\log\` | Logs. Docs: most recent 10 kept. Safe to delete | recommended | 7d | `opencode.exe` |
| `~\.config\opencode\` | `opencode.json` / `opencode.jsonc`, `plugins\`, `AGENTS.md` | protected | — | `opencode.exe` |
| `~\.cache\opencode\` | Provider packages and npm plugins. Official fix is to delete this folder and restart | recommended | 0 | `opencode.exe`, `OpenCode.exe` |
| `%APPDATA%\ai.opencode.desktop\` (584 MB) | Desktop profile. `opencode.settings`, `opencode.global.dat`, `opencode.workspace.*.dat` are UI state (reset is “last resort”). `logs\` under this directory is the desktop log. Beta/dev use `ai.opencode.desktop.beta` and `.dev` | advisory for `opencode.settings` and `*.dat`. recommended for `logs`, `Cache`, `Code Cache`, `GPUCache`, `Crashpad` | 7d / 1d | `OpenCode.exe` |
| `%LOCALAPPDATA%\@opencode-aidesktop-updater\`, `%LOCALAPPDATA%\@opencodedesktop-updater\` (242 + 226 MB) | Two generations of electron-updater cache (current package `@opencode-ai/desktop`, plus an older `@opencodedesktop` name). Section 1. Both `pending` trees are recommended | recommended | 1d | `OpenCode.exe` and any process under either updater dir |

Process names, from a Windows bug: desktop `OpenCode.exe`, CLI `opencode.exe`. NSIS’s process kill is case-insensitive, so an in-app update kills both. Source: [opencode#24248](https://github.com/anomalyco/opencode/issues/24248), read 2026-10-28. A user also reported `opencode-cli.exe` ([#29305](https://github.com/anomalyco/opencode/issues/29305), read 2026-10-28). Skip all three. The April 2026 desktop was Tauri NSIS; later desktop is Electron (`packages/desktop-electron` uses electron-updater, [commit 6531cfc](https://github.com/anomalyco/opencode/commit/6531cfc521f069ad86eb22990fc42924d161d0d9), read 2026-10-28). The `@…-updater` folders are the Electron ones. A Tauri update still has no `pending` folder; it is “in progress” whenever `OpenCode.exe` is running an installer, which you cannot see separately. Skipping whenever `OpenCode.exe` is running is the safe rule.

`~\.local\share\opencode` at 758 MB is mostly the database and snapshots, not logs. Do not delete the root.

---

## 13. GitHub Copilot CLI — `~\.copilot` (2 MB here)

Entire directory: [CLI configuration directory](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference), read 2026-10-28. Override `COPILOT_HOME`. Cache is **not** in this folder: `%LOCALAPPDATA%\copilot` (override `COPILOT_CACHE_HOME`), for marketplace caches and auto-update packages. It was not in the brief. If it shows up, **recommended**, age 1d, skip while `copilot.exe` is running.

Official “what you can safely delete” table, mapped to Water levels:

| Path | Docs’ verdict | Level |
|---|---|---|
| `logs\` | Yes, recreated each session | recommended, 7d |
| `plugin-data\` | Yes, recreated as needed | recommended, 0 |
| `session-state\` | Caution: local session history (`events.jsonl`, checkpoints, files). Resume breaks | protected (Water should not offer this; the user can `/session delete`) |
| `session-store.db` | Caution: cross-session index, recreated, but search/chronicle breaks until reindex | confirm |
| `command-history-state\` | Caution: Ctrl+R history | confirm, 30d |
| `config.json` | Caution: includes authentication | protected |
| `settings.json`, `skills\`, `agents\`, `hooks\`, `instructions\`, `copilot-instructions.md`, `mcp-config.json`, `lsp-config.json`, `providers.json`, `extensions\`, `installed-plugins\` | Not recommended | protected |
| `mcp-oauth-config\`, `mcp-secrets\`, `permissions-config.json` | Caution: must sign in or re-approve | protected |

At 2 MB, skip the folder in the UI except `logs\`. In use: `copilot.exe`.

---

## 14. Ollama

Official Windows locations: [docs.ollama.com/windows](https://docs.ollama.com/windows), read 2026-10-28.

| Path | Holds | Level | Age | In use |
|---|---|---|---|---|
| `~\.ollama\models\` (`blobs\` weights, `manifests\`) | Models the user pulled. Override `OLLAMA_MODELS` can point elsewhere. Uninstall does not delete a custom folder | protected | — | `ollama.exe` |
| `~\.ollama\` rest (config, keys, `id` file) | Account/config. Own knowledge that `id_ed25519` and config live beside models; the docs say this folder “contains models and configuration” | protected | — | `ollama.exe` |
| `%LOCALAPPDATA%\Ollama\` | `app.log`, `server.log`, `upgrade.log`, and downloaded updates | recommended for `*.log`; confirm for update packages sitting beside the logs | 7d logs; 1d update files | `ollama.exe`, `Ollama.exe` |
| `%LOCALAPPDATA%\Programs\Ollama\` | The installed binaries. Not in the brief, do not add a delete rule | advisory | — | `ollama.exe` |
| `%TEMP%\ollama*` | Temporary executables | recommended | 0 | `ollama.exe` |

This machine’s copy is small (models were not stored here, or `OLLAMA_MODELS` points away). Do not delete `~\.ollama` on the chance it is empty of models; check for `models\manifests` by name only.

---

## 15. Cursor (extra)

Chats are already protected by Water. Where they sit: `%APPDATA%\Cursor\User\globalStorage\state.vscdb`, table `cursorDiskKV` (`composerData:`, `bubbleId:`, `checkpointId:`, `agentKv:`). Sources: [deja-vu guide](https://vshulcz.github.io/deja-vu/guide/cursor-state-vscdb-too-large.html); Cursor staff on the forum, [thread 167293](https://forum.cursor.com/t/had-to-code-a-windows-app-to-deal-with-cursor-chats-temp-files/167293) and [thread 169927](https://forum.cursor.com/t/how-can-i-reduce-the-size-of-the-state-vscdb-file-without-deleting-chats/169927), read 2026-10-28. Staff: `state.vscdb.backup` is a leftover copy Cursor no longer updates. Deleting the live `state.vscdb` wipes chat history. Transcripts may also exist under `~\.cursor\projects\` (forum staff). `~\.cursor\chats\` is described by a third-party blog ([vibe-replay](https://vibe-replay.com/blog/cursor-local-storage/), read 2026-10-28), not by Cursor. If `~\.cursor` exists, treat `chats\`, `projects\`, `skills\`, `mcp.json`, and rules as protected even though the brief did not list the folder.

| Path | Holds | Level | Age | In use |
|---|---|---|---|---|
| `%APPDATA%\Cursor\User\globalStorage\state.vscdb` (+ `-wal`, `-shm`) | Chats and editor state | protected | — | `Cursor.exe` |
| `state.vscdb.backup` | Stale copy of that DB. Staff say it can go. It is still a chat backup | confirm | 14d | `Cursor.exe` must be quit |
| `%APPDATA%\Cursor\snapshots\` | Checkpoint packs. Third-party cleaner, not Cursor docs: [codex-cursor-cleaner](https://github.com/Aiweline/codex-cursor-cleaner), read 2026-10-28 | confirm | 14d | `Cursor.exe` |
| `%APPDATA%\Cursor\` `Cache`, `CachedData`, `Code Cache`, `GPUCache`, `logs`, `Crashpad`, `CachedExtensionVSIXs` | Electron / VS Code caches | recommended | 1d; logs and dumps 7d | `Cursor.exe` |
| `%APPDATA%\Cursor\User\` settings, snippets, keybindings, `workspaceStorage`, `globalStorage` other than the backup file | Settings and workspace state | protected | — | `Cursor.exe` |
| `%LOCALAPPDATA%\Cursor\` (174 MB) | Usually the Local counterpart: GPUCache, Code Cache, CachedData, logs. No Cursor doc enumerates it. | advisory root; recommended for the cache names above if present | 1d / 7d | `Cursor.exe` |
| `%LOCALAPPDATA%\cursor-compile-cache\` (143 MB) | Name is a compile cache. No official page found. | recommended | 7d | `Cursor.exe` |
| `%LOCALAPPDATA%\cursor-agent\` (1 MB) | Unknown. Likely the CLI agent’s small state | advisory | — | `cursor-agent.exe` if that image exists (name not verified) |

In use: `Cursor.exe`. Quit means no `Cursor.exe` in the process list. Helper renderers share that image name.

---

## 16. OpenAI / Codex desktop (extra)

Water’s existing Codex rules still apply inside every `~\.codex*` home: `~\.codex*\.tmp\marketplaces\.staging` and `~\.cache\codex-runtimes` are the regenerable parts; session directories stay protected. **`~\.codex2` is another such home** (same shape as Grok’s redirected homes, but the brief only says it is large). Apply those rules inside it. Do not delete the root.

No official page in this pass maps the three AppData folders:

| Path | Size | Level | Notes |
|---|---|---|---|
| `%LOCALAPPDATA%\OpenAI\` | 690 MB | advisory root; recommended for `Cache`, `Code Cache`, `GPUCache`, `Crashpad`, `logs` | Likely the ChatGPT / Codex desktop cache plus other local data. Do not delete `User`, `blob_storage`, `Local Storage`, `IndexedDB`, or anything named `session`. |
| `%APPDATA%\Codex\` | 485 MB | advisory (treat as user data) | Large enough to be sessions or an Electron profile. Same cache-child exception. |
| `%LOCALAPPDATA%\Codex\` | 3 MB | advisory | Too small to chase. |

In use: `Codex.exe` and `codex.exe` (desktop vs CLI; own knowledge of the image names, not verified here). Also `ChatGPT.exe` if the OpenAI folder belongs to the ChatGPT app. Skip all three before touching `%LOCALAPPDATA%\OpenAI`.

---

## 17. Claude desktop extras

Claude Code’s `~\.claude\projects` and `file-history`, and `%TEMP%\claude`, stay as Water has them. Squirrel leftovers under `%LOCALAPPDATA%\AnthropicClaude\app-*` and `packages` stay as they are. These four paths are additional.

| Path | What the docs say | Level | Age | In use |
|---|---|---|---|---|
| `%LOCALAPPDATA%\Claude-3p\` (325 MB) | Third-party (3P) Claude Desktop, separate from the consumer app. Holds device id, `configLibrary\` (local policy), UI storage (`IndexedDB`, `Local Storage`, `Session Storage`), and logs in the same tree. Conversations are not in the OS vault. Earlier builds used `%APPDATA%\Claude-3p` and migrate to Local. Source: [Claude Desktop on 3P data storage](https://claude.com/docs/third-party/claude-desktop/data-storage), read 2026-10-28. User-visible artifacts go to `~\Claude\` or `~\Documents\Claude\`, which this report does not touch. | protected for `configLibrary`, `ant-did`, and any session/conversation child. confirm for `IndexedDB`, `Local Storage`, `Session Storage`. recommended for a `logs` child and `*.log` | 7d logs | `Claude.exe` |
| `%LOCALAPPDATA%\Claude\` (44 MB) | A forensic note found `logs\` here while the MSIX profile lived under `Packages\Claude_…`. Source: [Medium, Claude Desktop forensics](https://medium.com/@seiferboado101/claude-desktop-forensics-on-windows-key-artifacts-and-their-forensic-value-44b3b573aa4e), read 2026-10-28. A 2026 GitHub report says current MSIX data moved to `%LOCALAPPDATA%\Claude-Data\claude_pzs8sxrjxfjjc\` ([claude-code#103860](https://github.com/anthropics/claude-code/issues/103860), read 2026-10-28). | advisory root. recommended if the only child is `logs` | 7d | `Claude.exe` |
| `%LOCALAPPDATA%\claude-cli-nodejs\` (5 MB) | Not in the pages above. | advisory (may be the CLI install, not a cache) | — | `claude.exe`, `node.exe` only if its path is inside this folder |
| `~\.local\share\claude\` (718 MB) | Not in the pages above. Large enough to be a VM disk, a session store, or versioned binaries. | advisory until children are listed | — | `claude.exe`, `Claude.exe` |

Consumer chat config `claude_desktop_config.json` is `%APPDATA%\Claude\` or the MSIX LocalCache redirect. Source: [baalda path note](https://baalda.com/blog/claude-desktop-config-file-location), read 2026-10-28. Not in the brief. If seen: protected.

In use: `Claude.exe` (desktop) and `claude.exe` (CLI). Own knowledge of those image names; the 3P docs do not print them.

---

## Process names to skip (summary)

Lock the tool’s folders while any of these images are running, **or** while any process’s executable path is inside the folder (covers `node.exe`, installers, and unknown hosts).

| Tool | Images |
|---|---|
| Antigravity CLI | `agy.exe` |
| Antigravity IDE | `Antigravity.exe`, `Antigravity IDE.exe` |
| Cockpit | path under `~\.antigravity_cockpit`; host exe name not documented |
| Gemini CLI | `gemini.exe`; else path-under-folder |
| Grok Build | `grok.exe`, `agent.exe`; grove exes only lock `%LOCALAPPDATA%\grok\git` |
| Kimi Code | `kimi.exe` |
| ZCode | `zcode.exe`, `ZCode.exe` |
| dsh | `dsh.exe`; else path under `~\.dsh` |
| Kiro | `Kiro.exe`, `kiro-cli.exe` |
| Qoder | `qodercli.exe`, `Qoder.exe`, `QoderWork.exe` |
| WorkBuddy | `WorkBuddy.exe`, `WorkBuddyAI.exe` |
| OpenCode | `opencode.exe`, `OpenCode.exe`, `opencode-cli.exe` |
| Copilot CLI | `copilot.exe` |
| Ollama | `ollama.exe`, `Ollama.exe` |
| Cursor | `Cursor.exe` |
| Codex / OpenAI | `codex.exe`, `Codex.exe`, `ChatGPT.exe` |
| Claude | `claude.exe`, `Claude.exe` |
| Any `*-updater` | the app image above, plus any image path under that updater directory. Not `Update.exe` unless the path is actually under the updater dir |

---

## Open questions (names, sizes, and times only)

1. `%LOCALAPPDATA%\agy`: children. One `bin\agy.exe`, or several version-named directories? Record names and write times. Do not open files.
2. `~\.antigravity-ide`: is it a junction/reparse point, and if not, what are its first-level names? Compare with `~\.gemini\antigravity-ide`.
3. `~\.antigravity_cockpit\instances`: first-level names only (which products). Confirms which exes must lock the tree.
4. `~\.grok\bin` and `~\.grok\downloads`: first-level names. Downloads should show whether the 315 MB is installer archives (`grok-*-windows-*` or similar) or other files. `bin` should show whether anything other than `grok.exe`, `agent.exe`, and `grove*.exe` is present. `%LOCALAPPDATA%\grok\git`: version-like directory names and write times.
5. `~\.grok1`…`~\.grok5` and `~\.grokbot`: confirm each is a directory (not a junction back to `~\.grok`). For the numbered homes, note whether `<home>\.grok\sessions` and `<home>\AppData` exist. Do not descend into AppData.
6. `~\.kimi-code\bin`: names. If the only executables are `rg.exe` and `fd.exe`, the 289 MB figure is wrong or there are large non-exe files — record the largest child names. Also list `file-history`, `cache`, `%LOCALAPPDATA%\kimi-code`, `~\.kimi-work`, `~\.kimi-webbridge` at one level.
7. `~\.zcode\cli` vs `~\.zcode\runtime`: which exists, and whether `cli`’s large children are named like `node_modules`, a version, or `setting.json`.
8. `~\.dsh`: one-level names, to confirm DeepSeek Harness (look for `dsh-win32`, `profiles`, `plugins`) rather than an unrelated tool.
9. `~\.qoder-cli` and `~\.qoderworkcn\bin` and `tmp`: one-level names. `tmp` is confirm-deletable only if the names look like caches (hashes, `*.log`, old session scratch) and not like projects.
10. `~\.workbuddy` and `~\.workbuddy-ai`: one-level names and sizes. The roots stay protected; this only finds a `logs` child and shows whether the bulk is `sessions`, `skills`, or a cache-like name.
11. `%LOCALAPPDATA%\WorkBuddy` and `%LOCALAPPDATA%\workbuddy-ai`: one-level names, to see if they are Electron caches or the program.
12. `~\.local\share\opencode`: one-level sizes (`opencode.db` and `snapshot` expected to dominate). `%APPDATA%\ai.opencode.desktop`: whether `Cache` / `logs` are the bulk of the 584 MB.
13. `%LOCALAPPDATA%\Cursor` and `%LOCALAPPDATA%\cursor-agent`: one-level names.
14. `%LOCALAPPDATA%\OpenAI`, `%APPDATA%\Codex`, `~\.codex2`: one-level names. For `.codex2`, only check whether `.tmp\marketplaces\.staging` and a `sessions` child exist so the existing Codex rules can be pointed at it.
15. `%LOCALAPPDATA%\Claude-3p`, `%LOCALAPPDATA%\Claude`, `~\.local\share\claude`: one-level names. The 718 MB share folder is the one most likely to be either a protected VM/session store or a deletable version cache, and the name list is the whole decision.
16. Updater folders (`antigravity-updater`, `@zcodedesktop-updater`, `@genieworkbuddy-desktop-updater`, both OpenCode updaters): confirm a child named `pending` and whether `installer.exe` sits beside it. Record `pending`’s write time. If it is under a day old, leave it even though the class is recommended.
