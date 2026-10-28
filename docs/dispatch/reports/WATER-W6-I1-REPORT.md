WATER-W6-I1 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w6-i1/docs/dispatch/reports/WATER-W6-I1-REPORT.md

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
