# RULES-AGENT：Agent 工具与桌面更新器规则

2026-10-28，总控（Claude）。在规则包 `packages/junk-rules/rules/windows.json` 上新增 14 条规则，并给 `electron-app-cache` 加一个定位器；其余规则、校验器、规则格式版本与依赖不变。只改 `packages/junk-rules/`。

依据：
- [M3 计划](../../docs/M3-PLAN-20261028.md)第 1 节，用户 10-28 拍板（“可以，出单吧”）；
- [Agent 工具落盘调研](../../docs/research/agent-tools-20261028/)：Grok 4 的公开文档调研（每条有网址与阅读日期）与总控 10-28 本机只读核对（只读名字、大小、时间）。

规则格式、校验与解析照 [RULES](../checkup-v1/RULES.md) 与 [MODEL](../checkup-v1/MODEL.md)。段语法：`*` 匹配零个或多个字符，`#` 匹配一个或多个 ASCII 数字，大小写不敏感。

## 1. 进程名

只写总控 10-28 在本机进程快照里核实过的进程名：`cursor.exe`（Cursor）、`claude.exe`（Claude）。

其它工具（Kimi、ZCode、WorkBuddy、OpenCode、Qoder 等）的进程名没有核实，**不写进规则**。这些规则的在用设置一律为 `{"mode":"none","processes":[]}`，安全靠两点：
- 年龄阈值；
- 清理执行器按句柄删除，被占用的文件删不掉，计失败、整项报部分完成。

## 2. 新增规则

全部追加在规则文件**末尾**，按下表顺序。`keep_newest` 未写的为 0；`fix_hint_zh` 一律为 `null`。

### 2.1 可清理

| # | rule_id | title_zh | owner_zh | category | level | 定位（base: segments） | item_type | 年龄 h | 保留 | 在用 | growth |
|---|---|---|---|---|---|---|---|---:|---:|---|---|
| 1 | `desktop-updater-residue` | 桌面应用更新包残留 | Electron 应用 | app_leftover | recommended | local_app_data: `*-updater` `pending`；local_app_data: `*-updater` `installer.exe` | any | 24 | 0 | none | slow |
| 2 | `agent-cli-old-binaries` | 命令行工具旧版本备份 | Grok、Kimi Code | agent_tool | recommended | user_profile: `.grok` `bin` `*.old`；user_profile: `.kimi-code` `bin` `*.bak` | file | 24 | 0 | none | one_off |
| 3 | `claude-code-old-versions` | Claude Code 旧版本 | Claude Code | agent_tool | recommended | user_profile: `.local` `share` `claude` `versions` `*` | any | 24 | 1 | cmdline_references_item: `claude.exe` | slow |
| 4 | `cursor-compile-cache` | Cursor 编译缓存 | Cursor | agent_tool | recommended | local_app_data: `cursor-compile-cache` | dir | 168 | 0 | none | slow |
| 5 | `qoder-workspace-temp` | QoderWork 临时文件 | QoderWork | agent_tool | confirm | user_profile: `.qoderworkcn` `tmp` `*`；user_profile: `.qoderwork` `tmp` `*` | dir | 24 | 0 | none | slow |
| 6 | `agent-tool-logs` | Agent 工具日志 | 多个 Agent 工具 | agent_tool | recommended | user_profile 下 7 个：`.kimi-code` `logs` `*`；`.local` `share` `opencode` `log` `*`；`.copilot` `logs` `*`；`.workbuddy*` `logs` `*`；`.qoderwork*` `logs` `*`；`.antigravity_cockpit` `logs` `*`；`.codebuddy` `logs` `*` | any | 168 | 0 | none | slow |
| 7 | `electron-gpu-caches` | 应用的显卡着色器缓存 | Electron 应用 | app_leftover | recommended | roaming_app_data: `*` `DawnGraphiteCache`、`*` `DawnWebGPUCache`、`*` `GrShaderCache`、`*` `GPUPersistentCache`；local_app_data: 同样 4 个（共 8 个定位器，先 roaming 后 local，各按此顺序） | dir | 1 | 0 | none | slow |

### 2.2 受保护（只显示占用，永远不可勾选）

| # | rule_id | title_zh | owner_zh | 定位（base: segments） | item_type |
|---|---|---|---|---|---|
| 8 | `grok-other-homes` | Grok 其它账号目录 | Grok | user_profile: `.grok#`；user_profile: `.grokbot` | dir |
| 9 | `antigravity-cockpit-profiles` | Antigravity 独立配置 | Antigravity Cockpit | user_profile: `.antigravity_cockpit` `instances` | dir |
| 10 | `opencode-sessions` | OpenCode 会话与快照 | OpenCode | user_profile: `.local` `share` `opencode` `opencode.db`；user_profile: `.local` `share` `opencode` `snapshot` | any |
| 11 | `kimi-code-sessions` | Kimi Code 会话 | Kimi Code | user_profile: `.kimi-code` `sessions`；user_profile: `.kimi-code` `file-history` | dir |
| 12 | `kiro-sessions` | Kiro 会话 | Kiro | user_profile: `.kiro` `sessions` | dir |
| 13 | `workbuddy-memory-sessions` | WorkBuddy 记忆与会话 | WorkBuddy、CodeBuddy | user_profile: `.workbuddy*` `memory`；`.workbuddy*` `sessions`；`.codebuddy` `sessions`；`.codebuddy` `file-history` | dir |
| 14 | `other-agent-sessions` | 其它 Agent 工具会话 | Gemini、Copilot、dsh | user_profile: `.gemini` `tmp` `*` `chats`；`.copilot` `session-state`；`.dsh` `sessions` | dir |

受保护规则一律：category `agent_tool`，年龄 0，保留 0，在用 none，growth `slow`。

### 2.3 修改现有规则

`electron-app-cache`：在 local_app_data `*` `Cache` 与 local_app_data `*` `GPUCache` 之间插入 local_app_data `*` `Code Cache`（变成 7 个定位器）。其它字段不变。

### 2.4 文案

`what_zh`、`why_zh`、`after_zh` 由执行者写，照 RULES 第 2 节的长度与语气（说人话，不出现规则 ID、英文枚举或“垃圾”一词），并符合下面的要点：

| # | 要点 |
|---|---|
| 1 | 桌面应用自动更新时下载的安装包，装完常留在原处；删了需要时会重新下载；正在安装的会被跳过 |
| 2 | 命令行工具自更新时留下的旧程序备份（`.old`、`.bak`）；当前在用的程序不动 |
| 3 | Claude Code 安装目录里并排保留的旧版本；保留最新一个；正在运行的版本不动 |
| 4 | Cursor 运行时生成的编译缓存，删了下次启动会重新生成，可能稍慢 |
| 5 | QoderWork 按工作区留下的临时文件；不确定是否还要用，所以需要确认 |
| 6 | 各 Agent 工具自己的运行日志，一周以前的；排查问题时可能用得上 |
| 7 | 应用的显卡着色器缓存，删了会自动重建 |
| 8～14 | 写清这是谁的什么（会话、记忆、账号配置、独立配置），为什么不清（续接对话、找回改动、登录信息），只统计占用 |

### 2.5 来源

每条规则至少一条 `local_observation`，`ref` 写“2026-10-28 总控本机只读核查：……”，内容取自 [VERIFY.md](../../docs/research/agent-tools-20261028/VERIFY.md) 对应行（目录名与体量，不写用户名）。有公开文档的再加 `official_doc`（https 网址，`checked_on` 写执行者核对的日期），从 [GROK-REPORT.md](../../docs/research/agent-tools-20261028/GROK-REPORT.md) 里选，执行者要打开核对网址与标题，只读网页，不下载。至少这几条要有官方或源码出处：

| 规则 | 出处 |
|---|---|
| `desktop-updater-residue` | electron-updater 源码 `DownloadedUpdateHelper.ts`、electron-builder issue #8730 |
| `agent-tool-logs` | Kimi Code “Data locations”、OpenCode “Troubleshooting”、GitHub Copilot CLI 配置目录参考 |
| `kimi-code-sessions` | Kimi Code “Data locations” |
| `kiro-sessions` | Kiro “configuration” 或 “session management” |
| `opencode-sessions` | OpenCode “Troubleshooting” |
| `other-agent-sessions` | Gemini CLI “session management”、GitHub Copilot CLI 配置目录参考 |

## 3. 校验

现有校验器不改。新规则必须全部通过它，尤其是 RULES 第 3 节第 1 条：可清理定位器不得可能包含或等于受保护定位器。本节的组合已按这条核对过（例如 `.workbuddy*` `logs` `*` 与 `.workbuddy*` `memory` 不冲突）；执行者若发现校验器拒绝，写受阻回执，不要改校验器或改动定位器绕过。

## 4. 测试

`tests/rules_v1.rs` 仍是精确 4 个测试，名字不变。新断言加在已有测试里，失败信息带标记 `RULES_AGENT_TOOLS`：
- 种子表加上 14 条新规则，`rules_seed_coverage` 逐字段核对（级别、类型、年龄、保留、在用、增长、定位摘要）；`electron-app-cache` 的种子行按 2.3 改；
- `rules_resolve_plan`：解析计划里出现新规则的目标，`claude-code-old-versions` 的保留数为 1、在用为 `claude.exe`；`desktop-updater-residue` 的两个目标段与本表一致；
- `rules_protection_precedence`：至少断言一组“新可清理规则与新受保护规则同在一个工具目录下而不冲突”（如 Kimi 的 `logs` 与 `sessions`），以及构造一条落进 `.grok#` 下面的可清理测试规则会被校验器拒绝或在计划里被标为受保护内部（按现有行为择一，回执说明）。

**获准改动的旧断言**（新增规则必然改变的数量，吸取第五波 H5 的教训，事先授权）：

| 测试 | 原值 | 新值 |
|---|---|---|
| `rules_protection_precedence` 的 `embedded.rules().len()` | 61 | 75 |
| `rules_resolve_plan` 的 `expected`（两个自定义文件夹） | 216 | 255（新增 38 个 pattern 定位器，加 `electron-app-cache` 的 1 个） |
| `rules_resolve_plan` 的 `plan.rules_data_version` | `2026-10-27.1` | `2026-10-28.1` |

`windows.json` 的 `data_version` 改为 `2026-10-28.1`，`rules_version` 不变。

若还有别的写死数量因本次新增而必须改，可以改，回执逐条写出原值、新值与原因；其余原有断言与标记不变。

## 5. 不变

- 其余 60 条规则（`electron-app-cache` 除 2.3 外）的全部字段与顺序；
- 校验器、解析器、规则格式版本、依赖、`Cargo.toml`、`Cargo.lock`；
- 不改 `packages/junk-scan`、服务与宿主。
