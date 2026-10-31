# WATER-W8-K2 补单 01：插入工作树规则后的数量、位置与措辞断言（轻门）

2026-11-01，总控（Claude）。回应 WATER-W8-K2 的受阻回执（回执提交 `f67309fa`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K2-RULES-20261031.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m3c-v1/RULES-M3C.md`（全文），以及原票列出的仍然有效的契约；
4. 本补单（与原票或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w8-k2/docs/dispatch/reports/WATER-W8-K2-REPORT.md`。

## 受阻判断

受阻成立，是总控 SPEC 的疏漏。SPEC 第 6 节只授权了规则总数、四条通用规则的 `in_use`、custom 规则个数与 `data_version`，没有考虑到在 `rust-build-dirs` 之后**插入**一条 marker 规则，会碰到上一波为“末尾追加 14 条 Agent 规则”写下的位置断言。总控已只读核对基线 `packages/junk-rules/tests/rules_v1.rs`，你列的三处都成立，另外还有一处你没列到：

| # | 测试 | 基线位置 | 冲突 |
|---|---|---|---|
| 1 | `rules_resolve_plan` | 第 641 行 `assert_eq!(expected, 255)` | 两个 custom root 各多一个目标，必然为 257 |
| 2 | `rules_resolve_plan` | 第 822～845 行，`custom:beta:rust-build-dirs#1` 之后的尾段 | 尾段前面多出两个 Git 目标，长度 38 → 40，逐项顺序错位 |
| 3 | `rules_seed_coverage` | 第 961～976 行，全部规则文案不得含“只列出” | SPEC 规定的 `git-worktrees.why_zh` 含“只列出” |
| 4 | `rules_seed_coverage` | 第 1079～1085 行，`rules.rules()[61..]` 等于 14 条 Agent 规则 | 第 62 条变成 `git-worktrees`，后面才是 14 条 Agent 规则（**你没列到，一并授权**） |

另外，全表逐行核对的种子表 `seed_table()` 需要为新规则加一行，这是新规则的期望数据，不算改旧断言，见下面第 5 条。

## 要做的

### 1. 授权改动的旧断言（`packages/junk-rules/tests/rules_v1.rs`）

原有失败信息里的标记原样保留，4 个测试名不变。

1. **目标总数**（`rules_resolve_plan`）：`assert_eq!(expected, 255)` 改为 `assert_eq!(expected, 257)`。
2. **Agent 尾段**（`rules_resolve_plan`）：
   - 在 `custom:beta:rust-build-dirs#1` 之后，紧接着恰好是 `custom:alpha:git-worktrees#1`、`custom:beta:git-worktrees#1` 两个目标（标记 `RULES_M3C_WORKTREE`）；
   - 原来的 `appended` 改为从这两个 Git 目标之后开始（即 `beta_position + 3`），后面原有的 38 个、逐项字段与顺序、`other-agent-sessions#3` 是最后一个目标等断言全部照旧，标记 `RULES_AGENT_TOOLS` 不变。
3. **“只列出”措辞**（`rules_seed_coverage` 的全部规则循环）：
   - 只对 `rule_id == "git-worktrees"` 跳过 `!value.contains("只列出")` 这一条；其它规则、其它字段照旧检查，标记 `RULES_M3_WORDING` 不变；
   - 同一循环里“`in_use` 为 `none` 时不得承诺跳过被占用的文件”的检查对 `git-worktrees` 照旧生效；
   - `git-worktrees` 的 `why_zh` 与公开 `why_zh` 逐字等于 SPEC 第 3 节，由 `RULES_M3C_WORKTREE` 锁定（SPEC 第 6 节本来就要求）。
4. **规则顺序**（`rules_seed_coverage`）：
   - `rust-build-dirs` 仍是第 61 条（下标 60），`RULES_RUST_BUILD` 断言不变；
   - 新增：第 62 条（下标 61）是 `git-worktrees`，标记 `RULES_M3C_WORKTREE`；
   - `rules.rules()[61..]` 改为 `rules.rules()[62..]`，仍等于 `AGENT_RULE_IDS`，标记 `RULES_AGENT_TOOLS` 不变。
5. **种子表**（`seed_table()`）：在 `rust-build-dirs` 那一行之后、`rows.extend(agent_seed_table())` 之前，加一行 `git-worktrees`：`Category::Custom`、`Level::Advisory`、`ItemType::Dir`、`min_age_hours` 0、`keep_newest` 0、`InUseMode::None`、`Growth::Slow`、定位器摘要 `marker:file:.git:1:4096:8`。四条通用规则那几行的 `in_use` 按 SPEC 第 2 节改（属于已授权的“四条通用规则的 `in_use`”）。全表逐行核对的循环本身不改。

回执逐条写出改动前后的原文（连同 SPEC 第 6 节已授权的四类）。

### 2. 其余

原票“要做的”与 SPEC 第 1～5 节照做。SPEC 第 6 节已授权的四类改动仍然有效：规则总数 75 → 76、四条通用规则的 `in_use`、custom 规则个数 5 → 6、`data_version` → `2026-10-31.1`。

## 不变

- 产品语义：新规则的位置（紧跟 `rust-build-dirs`）、逐字文案、每个 custom root 都生成目标，都照 SPEC，不能为了过旧断言改产品；
- 其余规则的全部字段与顺序；校验器、解析器、规则格式版本、依赖；不改 `Cargo.toml`、`Cargo.lock`；
- 白名单、两条负控（nc1 `RULES_M3C_IN_USE`、nc2 `RULES_M3C_DRIVE_ROOT`，只认 `packages/junk-rules/src/` 里的一处改动）、三个 final 都同原票。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w8-k2`、分支 `worker/water-w8-k2`，从回执提交 `f67309fa7d4d52b39b337fc3bab64b0c76866635` 接着做。开工时树应干净且 HEAD 为该提交。**不要重跑 baseline。**
- 命令同原票（在工作树根目录执行），例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K2 --mode test
  ```
  反复用 `lock`、`check`、`test`；负控：只改 `packages/junk-rules/src/` 下一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 提交身份照规则第 5 节：只在提交命令的进程里设作者与提交者环境变量，不写任何 git 配置，不借用人类作者身份。
- 原生窗口 0、选择框 0；cargo 离线、单线程、私有 target，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `f67309fa` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W8-K2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k2/docs/dispatch/reports/WATER-W8-K2-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：
- 实际模型、续做起点、实现提交 SHA；
- SPEC 第 1～5 节逐条：改了哪里、怎么满足；新规则的完整 JSON；
- 改过的旧断言：SPEC 第 6 节四类与本补单第 1 节五条，写改动前后的原文；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W8-K2 任务受阻”，写清冲突与最小补充需求，不要自行变通。
