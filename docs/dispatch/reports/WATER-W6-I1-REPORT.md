WATER-W6-I1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w6-i1/docs/dispatch/reports/WATER-W6-I1-REPORT.md

## 上一轮受阻记录（历史，已由补单 01 解除）

以下保留提交 f0f7243a 的原回执正文；其中的未实现、未验证与受阻状态仅指上一轮，不代表本次交付状态。

日期：2026-10-28（Asia/Tokyo）。实际模型：GPT-6（Codex；会话未提供更细的型号标识）。

## 现场与范围

- 权威工单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W6-I1-RULES-AGENT-20261028.md`。
- 工作树：`F:/new/smaltalk/water/.worktrees/w6-i1`。
- 分支：`worker/water-w6-i1`。
- 首次 HEAD：`d79fb096ef0557430b7dd43634b4d60e8f2de958`，开工时干净，符合票面。
- 已按票面顺序阅读执行者规则、RULES-AGENT、RULES、MODEL、VERIFY、公开来源索引，并检查现有规则和测试。
- 无实现提交；本次只新增本受阻回执。规则、测试、校验器、解析器、依赖、契约、检查器与台账均未修改。

## 阻塞：追加规则与既有末尾断言不能同时满足

SPEC 第 2 节要求 14 条新规则全部追加在规则文件末尾，最后一条是 `other-agent-sessions`；第 4 节要求种子表加入这些规则并逐字段、逐顺序核对。

基线 `packages/junk-rules/tests/rules_v1.rs` 有以下旧断言：

| 基线位置 | 现有要求 | 按新 SPEC 追加后的结果 |
|---|---|---|
| 第 733～737 行，`rules_resolve_plan` | `plan.targets.last()` 的 target ID 必须是 `custom:beta:rust-build-dirs#1`，标记 `RULES_RUST_BUILD` | 解析器按规则和定位器顺序输出；新末尾必为 `other-agent-sessions#3`，旧断言必然失败 |
| 第 778～783 行，`rules_seed_coverage` | `expected.last()` 必须为 `rust-build-dirs`；`rules.rules().last()` 必须与它一致，标记 `RULES_RUST_BUILD` | 种子表与数据同时追加后，末尾均为 `other-agent-sessions`，旧的 seed ID 断言必然失败；若把种子表留为 Rust 末尾，则又与真实规则顺序及旧逐行核对不一致 |

这些是末尾位置语义断言，不是新增规则引起的写死数量。SPEC 第 4 节仅明确授权三处旧数值变更，并规定：

> 若还有别的写死数量因本次新增而必须改，可以改，回执逐条写出原值、新值与原因；其余原有断言与标记不变。

执行者规则第 2 节也要求只有工单与 SPEC 写明获准改动的旧断言才能修改，并要求契约冲突时写受阻回执。因此不能自行改变上述断言的对象、移走旧规则、改变解析顺序或弱化断言来使测试通过。以上为静态必然冲突，未声称已运行追加后的失败测试。

## 最小补充需求

请总控补充授权以下两组旧测试调整，保持原四个测试名及全部 `RULES_RUST_BUILD` 标记：

1. `rules_resolve_plan`：把“全计划末尾是 Rust 的 beta 目标”改成“筛选 Rust 目标后的末尾是 beta”，另加断言，固定原有目标的相对顺序不变（新增 Electron 定位器使后续目标的位置偏移一项）、Rust 的 alpha/beta 顺序不变，且 38 个新增目标接在它们之后。全计划末尾另用 `RULES_AGENT_TOOLS` 断言为 `other-agent-sessions#3`。
2. `rules_seed_coverage`：把 Rust 的种子行与规则选择从全表 `.last()` 改为按 `rust-build-dirs` 查找，保留其逐字段断言；另加断言固定它仍位于第 61 条，14 条新规则按 SPEC 顺序接在后面，并保留原全表逐行核对。

不需要扩大产品文件范围、修改校验器或解析器、增加依赖或改变四个测试名。等待明确授权后再实现；本回执本身不构成授权。

## 已执行检查与结果

在指定工作树根目录执行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W6-I1 --mode baseline
```

退出码 0；`status: passed`，`finalGate: false`。

回执：`.local/checks/WATER-W6-I1/2026-10-28T09-45-29.754Z-36640-baseline-result.json`。

Git 只读核对：`status --short` 无输出，`branch --show-current` 为指定分支，`rev-parse HEAD` 为上述精确基线。

已尝试通过网页工具打开 electron-updater 源码、issue #8730、Kimi Data locations、OpenCode Troubleshooting、Copilot CLI configuration directory、Gemini session management。工具返回 HTTP 503：`web search is unavailable for this session right now`。未获得网页结果，未把任何网址或标题记为已核验；未下载文件。这不是本次主要阻塞，恢复执行后仍须完成来源核验。

## 未完成与未验证

- 未追加 14 条规则，未修改 `electron-app-cache`，未更新数据版本；没有可交付的新增完整 JSON。
- 未改旧断言，未新增断言。
- 未运行 `lock`、`check`、`test`、负控、三个 final 或 `archive`；没有负控修改、恢复哈希或 final 通过证据。
- 未运行真实目录冒烟或删除；未打开原生窗口、选择框或浏览器窗口。
- 未推送、合并、改写历史、修改 Git 配置或远端；未操作其他工作树及真实用户数据。
- 本票尚未完成，不能记为 SUBMITTED/VERIFIED 的完成交付。

## 补单 01

日期：2026-10-28（Asia/Tokyo）。实际模型：GPT-6（Codex；会话未暴露更细的型号标识）。

- 续做起点：f0f7243a17d6044fabcc0a999a7ed65202e9683c；开始时工作树干净，分支 worker/water-w6-i1。
- 实现提交：1ab29a238be26ed405f7b2cc034d39fd64adc857。只含规则数据与原测试文件两项改动；报告与归档随后单独提交。
- 工作树：F:/new/smaltalk/water/.worktrees/w6-i1。
- 未重跑 baseline；归档中两次 baseline 为派前及上一轮留存。未启动子代理。

### 需求对应与边界

1. 按 SPEC 顺序追加 14 条规则：7 条可清理、7 条受保护，共新增 38 个 pattern 定位器；总数 61→75。
2. electron-app-cache 在本地 Cache 与 GPUCache 之间插入 Code Cache，定位器由 6→7；其它字段不变。
3. data_version 为 2026-10-28.1；rules_version 仍为 water.junk-rules.v1。文案按四级语义说明清理后果与保护原因。
4. 新规则仅 Claude Code 旧版本使用 claude.exe 与 cmdline_references_item，保留数为 1；其余新规则均为 none、空进程列表，未新增未核实进程名。Cursor 按表保持 none。
5. 四个原测试名保持，未添加测试函数、过滤、忽略或开关；逐字段种子检查、解析目标与顺序、两个更新包段、Kimi 日志/会话同目录保护、Grok 数字账号保护均覆盖。
6. Kimi 的 logs 与 sessions/file-history 子项共存通过原校验器；合成可清理 .grok7（恰好落在受保护 .grok# 匹配的目录本身）被拒绝为 RULES_PRECEDENCE，.grokx 对照通过。没有宣称验证了任意更深子路径的扫描期保护。
7. 额外逐字段比较首 61 条规则：除获准的 Electron 插入外，字段与顺序均相同；Cargo.toml、Cargo.lock 与全部 src 文件保持原字节。未修改校验器、解析器、扫描、服务或宿主。

### 来源核对

网址由总控核对，执行者网页工具不可用。2026-10-28 本次再次尝试 Kimi、OpenCode、Kiro 页面，网页工具仍返回 HTTP 503；不把这次尝试记为执行者已打开网页。所有 official_doc 的网址与结尾斜杠按总控 source-check-20261028.md 原样使用，checked_on 均为 2026-10-28。

本机观察由总控于 2026-10-28 只读完成，执行者核对资料而未重新遍历本机用户目录。主要材料为 VERIFY.md。Cursor 编译缓存、Kiro 会话在 VERIFY 未单列，引用同一总控已拍板 M3-PLAN-20261028.md 第 1 节明确记录的约 0.14 GB、0.24 GB；Kimi 会话的 0.36 GB 以上也来自该计划。数据 ref 明示这些材料差异，没有把资料核对写成执行者实测。

| 新规则 | 本机观察内容（总控，2026-10-28） |
|---|---|
| desktop-updater-residue | 2026-10-28 总控本机只读核查：Antigravity 更新包 166 MB 与 installer.exe 159 MB，ZCode 163 MB 与 156 MB，WorkBuddy 450 MB，OpenCode 两代 126 MB 与 237 MB，合计约 1.5 GB。 |
| agent-cli-old-binaries | 2026-10-28 总控本机只读核查：.grok/bin/grok.exe.old 为 154 MB；.kimi-code/bin/kimi.exe.bak 为 152 MB，当前 kimi.exe 为 147 MB。 |
| claude-code-old-versions | 2026-10-28 总控本机只读核查：.local/share/claude 共 718 MB，versions 下有 2.1.285、2.1.287、2.1.296，各约 245 MB。 |
| cursor-compile-cache | 2026-10-28 总控本机只读核查：M3 计划第 1 节的本机只读摸底记录 cursor-compile-cache 约 0.14 GB；VERIFY 未单列此目录。 |
| qoder-workspace-temp | 2026-10-28 总控本机只读核查：.qoderworkcn/tmp 下有两个按工作区命名的临时目录，时间为 7 月。 |
| agent-tool-logs | 2026-10-28 总控本机只读核查：.workbuddy 与 .workbuddy-ai 的 logs 分别为 12 MB、9 MB；.local/share/opencode/log 为 5 MB。 |
| electron-gpu-caches | 2026-10-28 总控本机只读核查：Claude-3p 有标准 Electron 缓存；ai.opencode.desktop 的 Cache 为 261 MB，现有通用缓存规则已覆盖。 |
| grok-other-homes | 2026-10-28 总控本机只读核查：.grokbot 中有 .grok、AppData、守护进程状态、346 KB 日志与 attachment-staging，是另一个机器人家目录。 |
| antigravity-cockpit-profiles | 2026-10-28 总控本机只读核查：.antigravity_cockpit/instances 下只有 codex 实例，是独立的 Codex 配置。 |
| opencode-sessions | 2026-10-28 总控本机只读核查：.local/share/opencode 的 opencode.db 为 721 MB，snapshot 为 24 MB，数据库与快照受保护。 |
| kimi-code-sessions | 2026-10-28 总控本机只读核查：VERIFY 确认 .kimi-code/bin 中当前程序与旧备份并存；M3 计划记录会话与 file-history 占用 0.36 GB 以上。 |
| kiro-sessions | 2026-10-28 总控本机只读核查：M3 计划第 1 节的本机只读摸底记录 .kiro/sessions 约 0.24 GB；VERIFY 未单列此目录。 |
| workbuddy-memory-sessions | 2026-10-28 总控本机只读核查：.workbuddy 与 .workbuddy-ai 内有 memory、sessions、plans、plugins 等目录，日志以外的数据受保护或仅供参考。 |
| other-agent-sessions | 2026-10-28 总控本机只读核查：.dsh 共约 3 MB，内有 profiles、sessions、storages、.agent-presets 与 settings.yaml，整体受保护。 |

官方/源码的核对人与日期均为总控 Claude、2026-10-28。下表标题与内容引自总控出处核对；备选 Kiro configuration 网址未使用。

| 用于规则 | 网址与标题 | 总控核对内容 |
|---|---|
| desktop-updater-residue | https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/DownloadedUpdateHelper.ts — electron-builder/packages/electron-updater/src/DownloadedUpdateHelper.ts at master · electron-userland/electron-builder | raw 源码含 pending 目录名 |
| desktop-updater-residue | https://github.com/electron-userland/electron-builder/issues/8730 — Erase the "pending" directory after an update has been successfully installed · Issue #8730 | 安装后 pending 未删除问题 |
| agent-tool-logs、kimi-code-sessions | https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html — Data locations \| Kimi Code CLI Docs | logs 与 sessions |
| agent-tool-logs、opencode-sessions | https://opencode.ai/docs/troubleshooting/ — Troubleshooting \| OpenCode | 日志与 .local/share/opencode |
| agent-tool-logs、other-agent-sessions | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference — GitHub Copilot CLI configuration directory - GitHub Docs | logs 与 session-state |
| kiro-sessions | https://kiro.dev/docs/cli/chat/session-management/ — Session management - Chat - CLI - Docs - Kiro | 本地数据库 ~/.kiro/，具体 sessions 子路径按冻结 SPEC 与本机资料 |
| other-agent-sessions | https://geminicli.com/docs/cli/session-management/ — Session management \| Gemini CLI | ~/.gemini/tmp/<project_hash>/chats/ |

### 改动过的旧断言（全部授权范围）

除以下三处数值/版本与两组位置选择外，没有修改旧断言或旧标记。没有额外改动其它写死数量。

#### 规则总数 61→75

改动前：

```rust
assert_eq!(embedded.rules().len(), 61, "seed set must load");
```

改动后：

```rust
assert_eq!(embedded.rules().len(), 75, "seed set must load");
```


#### 两个自定义根的目标数 216→255

改动前：

```rust
assert_eq!(expected, 216);
```

改动后：

```rust
assert_eq!(expected, 255);
```


#### 规则数据版本

改动前：

```rust
assert_eq!(plan.rules_data_version, "2026-10-27.1");
```

改动后：

```rust
assert_eq!(plan.rules_data_version, "2026-10-28.1");
```


数量原因：新增 38 个定位器，加上已有 Electron 规则的 1 个定位器，216+38+1=255。

#### Rust 目标顺序断言

改动前（全计划末尾）：

```rust
    assert_eq!(
        plan.targets.last().map(|target| target.target_id.as_str()),
        Some("custom:beta:rust-build-dirs#1"),
        "RULES_RUST_BUILD: appended targets follow custom root order"
    );
```

改动后（筛选 Rust 后恰好 alpha、beta，原失败标记保留）：

```rust
    assert_eq!(
        plan.targets
            .iter()
            .filter(|target| target.rule_id == "rust-build-dirs")
            .map(|target| target.target_id.as_str())
            .collect::<Vec<_>>(),
        [
            "custom:alpha:rust-build-dirs#1",
            "custom:beta:rust-build-dirs#1"
        ],
        "RULES_RUST_BUILD: appended targets follow custom root order"
    );
```

另加 RULES_AGENT_TOOLS：beta 之后恰好 38 项；依据独立种子表逐项核对规则 ID、定位器序号、段与根；全计划最后一项为 other-agent-sessions#3。

#### Rust 种子与规则的选择

改动前：

```rust
    let rust_spec = expected.last().expect("RULES_RUST_BUILD: seed table row");
    assert_eq!(rust_spec.id, "rust-build-dirs", "RULES_RUST_BUILD: seed ID");
    let rust = rules.rules().last().expect("RULES_RUST_BUILD: last rule");
```

改动后：

```rust
    let rust_spec = expected
        .iter()
        .find(|spec| spec.id == "rust-build-dirs")
        .expect("RULES_RUST_BUILD: seed table row");
    assert_eq!(rust_spec.id, "rust-build-dirs", "RULES_RUST_BUILD: seed ID");
    let rust = rules
        .rules()
        .iter()
        .find(|rule| rule.rule_id == "rust-build-dirs")
        .expect("RULES_RUST_BUILD: last rule");
```

后续 Rust 字段断言、原全表逐行核对与 RULES_RUST_BUILD 标记不变。另加 Rust 仍在下标 60、追加 14 条 ID 顺序的断言；新增种子逐字段失败信息带 RULES_AGENT_TOOLS。

### 检查命令与结果

全部检查在指定工作树根目录执行，离线、单线程、私有 target。下表 mode 接在命令前缀后执行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W6-I1 --mode <mode> [--final]
```

| 开始时间 UTC / 回执文件 | mode | 检查器退出码与状态 | 说明 |
|---|---|---|---|
| 2026-10-28T09-31-26.850Z-26164-baseline-result.json | baseline | 0 / passed | 派前既有证据，不是本次运行 |
| 2026-10-28T09-45-29.754Z-36640-baseline-result.json | baseline | 0 / passed | 上一轮 baseline，本次未重跑 |
| 2026-10-28T10-35-12.576Z-17620-lock-result.json | lock | 0 / passed | 锁文件与依赖核对通过 |
| 2026-10-28T10-35-19.862Z-14964-test-result.json | test | 1 / failed | 测试先于数据：1 过、3 失败；旧 61/216 与缺少追加规则触发预期红 |
| 2026-10-28T10-36-55.386Z-34472-test-result.json | test | 1 / failed | 3 过、1 失败；PowerShell 到 Node 的默认管道编码损坏新增中文；显式 UTF-8 重写后修复 |
| 2026-10-28T10-37-49.817Z-28264-test-result.json | test | 0 / passed | 四测全绿 |
| 2026-10-28T10-38-03.762Z-30296-check-result.json | check | 0 / passed | 依赖/源码政策、fmt --check、clippy -D warnings 通过 |
| 2026-10-28T10-38-59.815Z-14976-red-nc1-result.json | red-nc1 | 0 / passed | 有效负控：cargo 101，3 过、1 失败，命中 RULES_AGENT_TOOLS |
| 2026-10-28T10-39-10.147Z-14512-test-result.json | test | 0 / passed | git checkout 原字节恢复后立即四测全绿 |
| 2026-10-28T10-39-21.298Z-40992-check-result.json | check --final | 0 / passed | 干净实现提交上的 final，通过 |
| 2026-10-28T10-39-30.101Z-7276-test-result.json | test --final | 0 / passed | 干净实现提交上的 final，四测全绿，负控/恢复哈希审计通过 |
| 2026-10-28T10-39-41.017Z-23000-real-result.json | real --final | 0 / passed | 干净实现提交上的 final，只读目录前缀存在性，通过 |
| 2026-10-28T10-39-52.863Z-35824-archive-result.json | archive | 0 / passed | 工具生成归档和 ARCHIVE.json，通过 |

补充命令：直接执行 cargo fmt 初次因工具链 bin 未在该进程 PATH 中而返回 101（no such command: fmt）；只在当前进程补入已安装的 1.95.0 工具链 bin，并设置本树私有 CARGO_HOME/CARGO_TARGET_DIR、离线标记后，同一 fmt 命令退出 0。未安装或下载工具，未修改系统或 Git 配置。随后正式 check 与 final 的 fmt --check 均通过。

Git 差异/字段核对：git diff --check 通过；额外只读 Node 比较首 61 条规则与清单/锁字节通过。检查结果与源码快照已按工具归档；未手工改动归档。

### nc1：真实逻辑、失败、恢复

- 位置：packages/junk-rules/src/plan.rs 的 make_target（基线第 205 行）。只临时改这一处生产代码，不改测试或数据。
- 原文：keep_newest: rule.keep_newest,；临时改为：keep_newest: 0,。这使真实 resolve_plan 丢失保留数。
- red-nc1 检查器退出 0，表示按预期观察到 cargo 退出 101；四个测试全部执行，仅 rules_resolve_plan 失败：

```text
assertion `left == right` failed: RULES_AGENT_TOOLS: keep newest version
  left: 0
 right: 1
```

- 紧接着执行 git checkout -- packages/junk-rules/src/plan.rs，再立即运行 --mode test，四测全绿。
- 恢复后的 plan.rs SHA-256：0c9837f5caf71f7c3c82201902d278c21e7cddeaba3451c19ac87f82dda9f715，与负控前相同。
- 恢复后的生产集合哈希：5352ff0c9f58c97379a8577d0496af5df1c616e2fb2cd1c3da46285160562126。
- 负控、恢复及最终测试使用相同测试集合哈希：734ad9095b1c8fcda17f1c47d37f43a47d6688c4735ce00b990b3939b18ef96a。
- 三个 final 与恢复测试的生产集合哈希一致；final test 的 proofAudit 指向本次红与紧随的恢复绿。源码临时改动未进入实现提交。

### 真实冒烟与限制

工具输出 75 条规则的存在性摘要；14 条新规则的 base_exists 与 literal_prefix_exists 均为 true。它只核对 base 和通配符前的字面前缀，不遍历匹配结果、不读文件内容，因此不代表全部具体目标目录存在、命中数量或占用大小已经实测。没有生成清理计划或执行删除。

新增规则结果：

```json
[
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "desktop-updater-residue"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "agent-cli-old-binaries"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "claude-code-old-versions"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "cursor-compile-cache"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "qoder-workspace-temp"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "agent-tool-logs"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "electron-gpu-caches"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "grok-other-homes"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "antigravity-cockpit-profiles"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "opencode-sessions"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "kimi-code-sessions"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "kiro-sessions"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "workbuddy-memory-sessions"
  },
  {
    "base_exists": true,
    "literal_prefix_exists": true,
    "rule_id": "other-agent-sessions"
  }
]
```

### 归档与交付

- 证据目录：docs/acceptance/wave6/i1/。工具索引：ARCHIVE.json。
- 索引记录 168 个文件、2963439 字节；已逐一复核 source/archive 字节相同、长度与 SHA-256 一致。另有工具生成的 ARCHIVE.json 与 .gitattributes。
- 本次 archive 命令的回执由工具在复制结束后写入 .local/checks/WATER-W6-I1/；既有 final、负控、恢复、失败历史回执均在归档索引中。
- 后续仅提交本报告与工具生成的证据；不 push、不 merge、不改写历史、不修改远端或配置。

### 没做或没验证的事

- 未验证 macOS、桌面 UI/宿主接线、真实递归扫描命中与大小、进程占用或生产竞态、实际清理及释放空间。
- 未打开原生窗口、选择框或浏览器窗口，未建立物理合成夹具，未对真实用户数据执行删除或读文件内容。
- 未自行核验网页正文，依据补单使用总控核对；GitHub 源码 URL 按冻结表保留 master，未声称执行者锁定或审阅了一个新的上游 commit。
- 交付为执行者完成待总控验收，不自行标记 VERIFIED。

### 完整 JSON：14 条新规则与修改后的 electron-app-cache

以下直接取自实现提交对应规则文件，不省略字段；数组先列 14 条新增，再列已有 Electron 规则的完整修改结果。

```json
[
  {
    "rule_id": "desktop-updater-residue",
    "title_zh": "桌面应用更新包残留",
    "owner_zh": "Electron 应用",
    "category": "app_leftover",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*-updater",
          "pending"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*-updater",
          "installer.exe"
        ]
      }
    ],
    "item_type": "any",
    "min_age_hours": 24,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "桌面应用自动更新时下载的安装包，安装完成后常留在原处。",
    "why_zh": "只清超过一天的更新包残留，正在安装或被占用的文件会跳过。",
    "after_zh": "应用仍可使用；以后需要这些安装包时，会重新下载。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：Antigravity 更新包 166 MB 与 installer.exe 159 MB，ZCode 163 MB 与 156 MB，WorkBuddy 450 MB，OpenCode 两代 126 MB 与 237 MB，合计约 1.5 GB。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/DownloadedUpdateHelper.ts",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://github.com/electron-userland/electron-builder/issues/8730",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "agent-cli-old-binaries",
    "title_zh": "命令行工具旧版本备份",
    "owner_zh": "Grok、Kimi Code",
    "category": "agent_tool",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".grok",
          "bin",
          "*.old"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kimi-code",
          "bin",
          "*.bak"
        ]
      }
    ],
    "item_type": "file",
    "min_age_hours": 24,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "one_off",
    "what_zh": "命令行工具自更新后留下的旧程序备份，文件名以 .old 或 .bak 结尾。",
    "why_zh": "只清超过一天的备份，当前在用的程序不动，被占用的文件会跳过。",
    "after_zh": "当前程序仍可运行；若要回到旧版本，需要重新安装。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.grok/bin/grok.exe.old 为 154 MB；.kimi-code/bin/kimi.exe.bak 为 152 MB，当前 kimi.exe 为 147 MB。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "claude-code-old-versions",
    "title_zh": "Claude Code 旧版本",
    "owner_zh": "Claude Code",
    "category": "agent_tool",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".local",
          "share",
          "claude",
          "versions",
          "*"
        ]
      }
    ],
    "item_type": "any",
    "min_age_hours": 24,
    "keep_newest": 1,
    "in_use": {
      "mode": "cmdline_references_item",
      "processes": [
        "claude.exe"
      ]
    },
    "growth": "slow",
    "what_zh": "Claude Code 原生安装目录里并排保留的旧版本程序。",
    "why_zh": "保留最新一个版本，正在运行的版本不动，只清超过一天的旧版本。",
    "after_zh": "当前版本仍可使用；被清掉的旧版本需要重新安装才能使用。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.local/share/claude 共 718 MB，versions 下有 2.1.285、2.1.287、2.1.296，各约 245 MB。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "cursor-compile-cache",
    "title_zh": "Cursor 编译缓存",
    "owner_zh": "Cursor",
    "category": "agent_tool",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "cursor-compile-cache"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 168,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "Cursor 在运行时生成的编译缓存，帮助后续启动更快。",
    "why_zh": "只清一周以前的缓存；这些内容可以由程序重新生成。",
    "after_zh": "下次启动会重新生成缓存，首次启动可能稍慢。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：M3 计划第 1 节的本机只读摸底记录 cursor-compile-cache 约 0.14 GB；VERIFY 未单列此目录。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "qoder-workspace-temp",
    "title_zh": "QoderWork 临时文件",
    "owner_zh": "QoderWork",
    "category": "agent_tool",
    "level": "confirm",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".qoderworkcn",
          "tmp",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".qoderwork",
          "tmp",
          "*"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 24,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "QoderWork 按工作区留下的临时目录。",
    "why_zh": "无法确定这些临时文件是否还要使用，需要你确认，只列出超过一天的目录。",
    "after_zh": "清理后临时文件无法找回；确认工作区已不再需要它们后再清理。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.qoderworkcn/tmp 下有两个按工作区命名的临时目录，时间为 7 月。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "agent-tool-logs",
    "title_zh": "Agent 工具日志",
    "owner_zh": "多个 Agent 工具",
    "category": "agent_tool",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kimi-code",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".local",
          "share",
          "opencode",
          "log",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".copilot",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".workbuddy*",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".qoderwork*",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".antigravity_cockpit",
          "logs",
          "*"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".codebuddy",
          "logs",
          "*"
        ]
      }
    ],
    "item_type": "any",
    "min_age_hours": 168,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "各个 Agent 工具自己的运行日志，只列出一周以前的内容。",
    "why_zh": "旧日志通常可以清理，但排查过去的问题时可能用得上。",
    "after_zh": "工具会继续写新日志；被清理的旧日志无法找回。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.workbuddy 与 .workbuddy-ai 的 logs 分别为 12 MB、9 MB；.local/share/opencode/log 为 5 MB。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://opencode.ai/docs/troubleshooting/",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "electron-gpu-caches",
    "title_zh": "应用的显卡着色器缓存",
    "owner_zh": "Electron 应用",
    "category": "app_leftover",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "DawnGraphiteCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "DawnWebGPUCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "GrShaderCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "GPUPersistentCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "DawnGraphiteCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "DawnWebGPUCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "GrShaderCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "GPUPersistentCache"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 1,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "桌面应用网页引擎生成的显卡着色器缓存，用来加快画面显示。",
    "why_zh": "这些内容可以自动重建，只清超过一小时的缓存目录。",
    "after_zh": "应用会重新生成缓存，首次显示部分画面时可能稍慢。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：Claude-3p 有标准 Electron 缓存；ai.opencode.desktop 的 Cache 为 261 MB，现有通用缓存规则已覆盖。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "grok-other-homes",
    "title_zh": "Grok 其它账号目录",
    "owner_zh": "Grok",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".grok#"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".grokbot"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "Grok 其它账号的独立目录，可能保存会话、账号配置与登录信息。",
    "why_zh": "这些内容用于续接对话和登录，停用账号也不代表可以删除。",
    "after_zh": "只统计占用，不提供清理，原有会话与账号数据会保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.grokbot 中有 .grok、AppData、守护进程状态、346 KB 日志与 attachment-staging，是另一个机器人家目录。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "antigravity-cockpit-profiles",
    "title_zh": "Antigravity 独立配置",
    "owner_zh": "Antigravity Cockpit",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".antigravity_cockpit",
          "instances"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "Antigravity Cockpit 为工具保存的独立配置，包含会话和账号登录信息。",
    "why_zh": "删除独立配置可能丢失对话或登录状态，需要完整保留。",
    "after_zh": "只统计占用，不提供清理，独立配置保持原样。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.antigravity_cockpit/instances 下只有 codex 实例，是独立的 Codex 配置。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "opencode-sessions",
    "title_zh": "OpenCode 会话与快照",
    "owner_zh": "OpenCode",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".local",
          "share",
          "opencode",
          "opencode.db"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".local",
          "share",
          "opencode",
          "snapshot"
        ]
      }
    ],
    "item_type": "any",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "OpenCode 保存对话的数据库和用于找回改动的快照。",
    "why_zh": "这些内容用于续接会话与恢复改动，不能当作缓存清理。",
    "after_zh": "只统计占用，不提供清理，会话数据库和快照都会保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.local/share/opencode 的 opencode.db 为 721 MB，snapshot 为 24 MB，数据库与快照受保护。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://opencode.ai/docs/troubleshooting/",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "kimi-code-sessions",
    "title_zh": "Kimi Code 会话",
    "owner_zh": "Kimi Code",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kimi-code",
          "sessions"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kimi-code",
          "file-history"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "Kimi Code 的对话记录与编辑文件的历史副本。",
    "why_zh": "这些记录用于续接对话和找回改动，不能作为运行日志清理。",
    "after_zh": "只统计占用，不提供清理，会话与文件历史继续保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：VERIFY 确认 .kimi-code/bin 中当前程序与旧备份并存；M3 计划记录会话与 file-history 占用 0.36 GB 以上。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "kiro-sessions",
    "title_zh": "Kiro 会话",
    "owner_zh": "Kiro",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".kiro",
          "sessions"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "Kiro 保存的对话会话记录。",
    "why_zh": "续接先前的对话需要这些记录，不能因为时间久就清理。",
    "after_zh": "只统计占用，不提供清理，已有对话记录会保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：M3 计划第 1 节的本机只读摸底记录 .kiro/sessions 约 0.24 GB；VERIFY 未单列此目录。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://kiro.dev/docs/cli/chat/session-management/",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "workbuddy-memory-sessions",
    "title_zh": "WorkBuddy 记忆与会话",
    "owner_zh": "WorkBuddy、CodeBuddy",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".workbuddy*",
          "memory"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".workbuddy*",
          "sessions"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".codebuddy",
          "sessions"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".codebuddy",
          "file-history"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "WorkBuddy 的长期记忆、对话，以及 CodeBuddy 的会话与文件历史。",
    "why_zh": "这些内容用于保留工具记忆、续接对话和找回改动，需要保护。",
    "after_zh": "只统计占用，不提供清理，记忆、会话和文件历史都会保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.workbuddy 与 .workbuddy-ai 内有 memory、sessions、plans、plugins 等目录，日志以外的数据受保护或仅供参考。",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "other-agent-sessions",
    "title_zh": "其它 Agent 工具会话",
    "owner_zh": "Gemini、Copilot、dsh",
    "category": "agent_tool",
    "level": "protected",
    "locate": [
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".gemini",
          "tmp",
          "*",
          "chats"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".copilot",
          "session-state"
        ]
      },
      {
        "kind": "pattern",
        "base": "user_profile",
        "segments": [
          ".dsh",
          "sessions"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 0,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "Gemini、Copilot 和 DeepSeek Harness 保存的对话会话记录。",
    "why_zh": "这些记录用于续接对话，临时目录里的会话也不能当作缓存清理。",
    "after_zh": "只统计占用，不提供清理，已有会话记录会保留。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-28 总控本机只读核查：.dsh 共约 3 MB，内有 profiles、sessions、storages、.agent-presets 与 settings.yaml，整体受保护。",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://geminicli.com/docs/cli/session-management/",
        "checked_on": "2026-10-28"
      },
      {
        "kind": "official_doc",
        "ref": "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference",
        "checked_on": "2026-10-28"
      }
    ]
  },
  {
    "rule_id": "electron-app-cache",
    "title_zh": "桌面应用网页缓存",
    "owner_zh": "桌面应用",
    "category": "app_leftover",
    "level": "recommended",
    "locate": [
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "Cache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "Code Cache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "GPUCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "roaming_app_data",
        "segments": [
          "*",
          "DawnCache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "Cache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "Code Cache"
        ]
      },
      {
        "kind": "pattern",
        "base": "local_app_data",
        "segments": [
          "*",
          "GPUCache"
        ]
      }
    ],
    "item_type": "dir",
    "min_age_hours": 1,
    "keep_newest": 0,
    "in_use": {
      "mode": "none",
      "processes": []
    },
    "growth": "slow",
    "what_zh": "许多桌面应用内嵌的网页引擎留下的缓存目录。",
    "why_zh": "只针对缓存目录名。账号数据和系统联接不在清理范围内，扫描时会跳过联接。",
    "after_zh": "应用还能打开。首次进入部分页面可能稍慢。",
    "fix_hint_zh": null,
    "sources": [
      {
        "kind": "local_observation",
        "ref": "2026-10-26 总控本机只读摸底",
        "checked_on": "2026-10-26"
      }
    ]
  }
]
```
