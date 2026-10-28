# Agent 工具落盘调研：总控本机核对（2026-10-28）

[GROK-REPORT.md](GROK-REPORT.md) 是 Grok 4（grok-4.7，grok4 槽）按 [BRIEF.md](BRIEF.md) 从公开文档整理的，每条都带网址与阅读日期，猜测处标了“own knowledge, not verified”。Grok 只写了这一份报告，没有碰本机用户目录（总控核对过它的工作目录只多了报告与日志）。

本页是总控（Claude）在本机做的只读核对：只读名字、大小、时间和是否为联接，不读任何文件内容。

## 更正与补充

| Grok 报告 | 本机实际 | 结论 |
|---|---|---|
| “Water 已把 `~\.grok\downloads` 列为受保护” | 现有规则 `grok-downloads` 是**推荐清理**、24 小时 | 报告写错，以规则为准 |
| `~\.grok\downloads` 可能混有别的文件 | 只有两个安装包：`grok-1.0.40-windows-x86_64`（09-22，154 MB）与 `grok-1.0.70-windows-x86_64`（10-26，176 MB，与当前 `bin\grok.exe` 同大小） | 全是安装包，现有规则合适 |
| Grok `bin` 不放旧版本 | `bin\grok.exe.old`（09-22，154 MB）就在旁边 | 自更新留下旧二进制，可作推荐清理 |
| Kimi `bin` 文档说只有 `rg.exe`、`fd.exe` | `kimi.exe`（09-19，147 MB）、`kimi.exe.bak`（09-08，152 MB）、`rg.exe` | 当前程序在这里；`.bak` 是旧版本 |
| `%LOCALAPPDATA%\agy` 大小可疑 | 只有 `bin`（10-28 刚更新） | 是程序本体，仅供参考 |
| `~\.antigravity-ide` 不明 | `extensions\` 与 `argv.json`，不是联接 | IDE 扩展目录，受保护 |
| Cockpit `instances` | 只有 `codex` 一个实例 | 独立的 Codex 配置，受保护 |
| `~\.grokbot` 与 Grok Build 无关 | 有 `.grok`、`AppData`、守护进程状态与 346 KB 日志、`attachment-staging` | 另一个 Grok 机器人家目录；仅供参考 |
| `~\.local\share\claude`（718 MB）不明 | `versions\2.1.285`、`2.1.287`、`2.1.296`，各约 245 MB | Claude Code 原生安装并排保留旧版本，保留最新一个即可 |
| `%LOCALAPPDATA%\grok\git` 可能有多个版本 | 只有 `2.55.0.windows.5` | 现在不用加规则 |
| `~\.codex2` | 另一个 Codex 家目录：`sessions`（61 MB）、`skills`、`auth.json`、`cache`（12 MB）、`log`、`tmp`、`.tmp` | 现有 `.codex*` 规则已覆盖其中的暂存与会话 |
| `~\.dsh` | `profiles`、`sessions`、`storages`、`.agent-presets`、`settings.yaml` | DeepSeek Harness；有会话，整体受保护，3 MB |
| `~\.qoderworkcn\tmp` | 两个按工作区命名的临时目录（7 月） | 需要确认 |
| `~\.workbuddy`、`~\.workbuddy-ai` | `app`、`binaries`、`cache`、`logs`、`memory`、`plans`、`plugins`、`sessions` 等 | `logs`（12 + 9 MB）可清；其余受保护或仅供参考；`binaries` 太大没量完 |
| `~\.local\share\opencode` | `opencode.db` 721 MB（会话库）、`snapshot` 24 MB、`log` 5 MB | 数据库与快照受保护 |
| `%APPDATA%\ai.opencode.desktop` | `Cache` 261 MB（现有 Electron 缓存规则已覆盖）、`cli` 204 MB（随附命令行） | `cli` 仅供参考 |
| `%LOCALAPPDATA%\Claude-3p` | `claude-code` 310 MB、会话与密钥目录、标准 Electron 缓存 | 缓存可清；其余受保护 |
| 各更新器目录 | Antigravity：`pending\Antigravity-x64.exe` 166 MB + `installer.exe` 159 MB（10-25）；ZCode：`pending\ZCode-3.10.2-win-x64.exe` 163 MB + `installer.exe` 156 MB（09-02）；WorkBuddy：`installer.exe` 450 MB（10-25）；OpenCode 两代：`installer.exe` 126 MB 与 237 MB（10-17） | 合计约 1.5 GB，可作推荐清理 |

## 现有通用规则已经覆盖的

- `electron-app-cache`（推荐清理）：漫游目录下 `*\Cache`、`*\Code Cache`、`*\GPUCache`、`*\DawnCache`，本地目录下 `*\Cache`、`*\GPUCache`。OpenCode 桌面版的 261 MB 缓存属于这条。
- `app-logs`（需要确认、7 天）：漫游与本地目录下 `*\logs`。WorkBuddy、Claude-3p、OpenCode 桌面版的日志属于这条。
- `squirrel-packages`、`codex-*`、`claude-*`、`cursor-chats`、`grok-*` 照旧。

## 进程名

Grok 报告第“Process names to skip”一节的进程名，一部分来自公开文档，一部分标了“own knowledge, not verified”。写进规则之前，要在这些程序运行时用进程快照核对一次（只读进程名）。
