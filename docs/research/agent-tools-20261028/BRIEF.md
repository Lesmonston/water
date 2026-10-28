# Research brief: where AI coding agent tools store data on Windows, and what is safe to delete

You are a research assistant for the Water project (a Windows disk-cleanup app). Answer from public documentation and your own knowledge. **Skip any Vault QUERY, Keeper boot or INGEST steps; do not read F:\new\AGENTS.md or CLAUDE.md.**

## Hard rules
- Do NOT read, list, open, modify or delete anything outside this working directory (`F:\new\smaltalk\water\.local\grok-m3`). In particular do not look inside `C:\Users\...`. Everything you need about this machine is in the folder list below.
- Do NOT run any installer, package manager, or the tools themselves.
- Write exactly one file: `REPORT-agent-tool-storage.md` in this working directory. Do not commit, do not touch git.
- Web search and reading public web pages are fine. Do not download files.

## The question
For each tool below, on Windows: which of its folders hold **regenerable data** (caches, logs, temporary files, downloaded update packages, old versions of its own binaries, crash dumps), and which hold **user data that must never be deleted** (sessions / chat history, credentials and tokens, settings, skills, memory, workspaces, models the user downloaded on purpose)?

Folders observed on this machine (top level only, sizes in MB; `~` = the user profile):

| Tool | Folders seen | Size and first-level content seen |
|---|---|---|
| Google Antigravity (CLI name `agy`) | `~\.antigravity-ide`, `~\.antigravity_cockpit`, `%LOCALAPPDATA%\agy`, `%LOCALAPPDATA%\antigravity-updater`, `%APPDATA%\Antigravity` | `.antigravity_cockpit` 1679 (subfolder `instances` 1678; also `logs`, `oauth_pending`, `kiro_accounts`, `gemini_accounts`, `codex_batch_delete_jobs`); `%LOCALAPPDATA%\agy` 357-555; `antigravity-updater` 318 (`pending` 159); `%APPDATA%\Antigravity` 104 |
| Gemini CLI | `~\.gemini` | 3 |
| xAI Grok CLI ("Grok Build") | `~\.grok`, plus extra per-account homes `~\.grok1` … `~\.grok5`, `~\.grokbot`, `%LOCALAPPDATA%\grok`, `%APPDATA%\Grok Bot` | `.grok` 1392 (`bin` 534, `sessions` 495, `downloads` 315, `marketplace-cache` 24, `bundled` 14, `vendor` 5); `.grok4` 1305 (contains its own `AppData` 691 and `.grok` 613 — it is a home directory used through USERPROFILE redirection); `.grok1`-`.grok5` 0.9-1.3 GB each |
| Kimi Code (Moonshot) | `~\.kimi-code`, `~\.kimi-work`, `~\.kimi-webbridge`, `%LOCALAPPDATA%\kimi-code` | `.kimi-code` 648 (`sessions` 356, `bin` 289, `cache` 4, `updates`, `logs`, `file-history`); `.kimi-work` 142 |
| ZCode (Zhipu) | `~\.zcode`, `%APPDATA%\ZCode`, `%LOCALAPPDATA%\@zcodedesktop-updater` | `.zcode` 147 (`cli` 136, `v2` 12, `workspace`, `plugin-workspace`); updater 312 (`pending` 156) |
| dsh | `~\.dsh` | 3 (identify what tool this is if you can; say so if unsure) |
| Kiro (AWS) | `~\.kiro`, `%APPDATA%\Kiro`, `%LOCALAPPDATA%\com.kiro.account-manager` | `.kiro` 245 (`sessions` 241, `skills`, `extensions`, `tasks`, `steering`, `settings`) |
| Qoder / QoderWork | `~\.qoder-cli`, `~\.qoderwork`, `~\.qoderworkcn`, `%APPDATA%\QoderWork CN` | `.qoderworkcn` 391 (`workspace` 146, `tmp` 129, `bin` 69, `projects` 27, `logs` 10) |
| Tencent CodeBuddy / WorkBuddy | `~\.codebuddy`, `~\.workbuddy`, `~\.workbuddy-ai`, `~\WorkBuddy`, `%LOCALAPPDATA%\WorkBuddy`, `%LOCALAPPDATA%\workbuddy-ai`, `%LOCALAPPDATA%\@genieworkbuddy-desktop-updater`, `%LOCALAPPDATA%\CodeBuddyExtension` | updater 430; `.workbuddy` and `.workbuddy-ai` very large (not measured) |
| OpenCode | `~\.local\share\opencode`, `~\.config\opencode`, `~\.cache\opencode`, `%APPDATA%\ai.opencode.desktop`, `%LOCALAPPDATA%\@opencode-aidesktop-updater`, `%LOCALAPPDATA%\@opencodedesktop-updater` | share 758, desktop 584, updaters 242 + 226 |
| GitHub Copilot CLI | `~\.copilot` | 2 |
| Ollama | `~\.ollama`, `%LOCALAPPDATA%\Ollama` | small here |
| Cursor (extra) | `%LOCALAPPDATA%\Cursor`, `%LOCALAPPDATA%\cursor-agent`, `%LOCALAPPDATA%\cursor-compile-cache`, `%APPDATA%\Cursor` | 174, 1, 143, large |
| OpenAI / Codex desktop (extra) | `%LOCALAPPDATA%\OpenAI`, `%APPDATA%\Codex`, `%LOCALAPPDATA%\Codex`, `~\.codex2` | 690, 485, 3, large |
| Claude (extra) | `%LOCALAPPDATA%\Claude-3p`, `%LOCALAPPDATA%\Claude`, `%LOCALAPPDATA%\claude-cli-nodejs`, `~\.local\share\claude` | 325, 44, 5, 718 |

Water already has rules for: Codex (`~\.codex*\.tmp\marketplaces\.staging`, `~\.cache\codex-runtimes`, sessions protected), Claude Code (`~\.claude\projects` and `file-history` protected, `%TEMP%\claude` scratchpads), Claude desktop (`%LOCALAPPDATA%\AnthropicClaude\app-*` old versions, `packages`), Cursor chats protected, Grok (`~\.grok\downloads`, `~\.grok\sessions` protected), Squirrel packages, Electron app caches, headless browser profiles in Temp.

## Also answer
1. **Electron/Tauri desktop updaters** (`%LOCALAPPDATA%\@<app>-updater\pending`, electron-updater): what is in `pending`, and is it safe to delete when the app is not updating right now? Which process names indicate an update in progress?
2. For tools that keep **their own binaries under `bin`** (Grok `bin`, Kimi `bin`, Qoder `bin`, ZCode `cli`): do they keep old versions side by side? How to tell the current version from old ones by name or layout alone (no file contents)?
3. What process names (`*.exe`) each tool runs, so Water can skip a tool's folders while it is running.

## Output format (REPORT-agent-tool-storage.md)
- One section per tool. For each folder or subfolder: path pattern, what it holds, regenerable or user data, suggested level (one of: recommended = pure cache/residue; confirm = may still be wanted; advisory = do not delete in the app; protected = user data), minimum age you would require, process names that mean "in use".
- **Every claim needs a source**: URL plus the date you read it, or "own knowledge, not verified" — never present a guess as documented. Say plainly when you do not know.
- End with a short list of open questions the controller should check on the machine (by folder names, sizes and times only).
- Keep it under about 600 lines.
