# WATER-W6-I1 补单 01：追加规则后的末尾断言与官方出处（轻门）

2026-10-28，总控（Claude）。回应 WATER-W6-I1 的受阻回执（回执提交 `f0f7243a`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W6-I1-RULES-AGENT-20261028.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W6-M3-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m3-v1/RULES-AGENT.md`（全文），以及仍然有效的 `F:/new/smaltalk/water/contracts/checkup-v1/RULES.md`、`F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md`；
4. 本补单（与原票或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w6-i1/docs/dispatch/reports/WATER-W6-I1-REPORT.md`；
6. 总控的出处核对 `F:/new/smaltalk/water/docs/acceptance/wave6/controller/source-check-20261028.md`。

## 受阻判断

受阻成立，是总控 SPEC 的疏漏。SPEC 第 4 节只授权了三处数量，没有考虑到 `rules_v1.rs` 里两处“最后一条是 Rust 规则”的位置断言。总控已只读核对：
- `resolve_plan`（`src/plan.rs`）按规则顺序、每条规则内按定位器顺序生成目标，marker 定位器的自定义文件夹目标就地生成，不挪到末尾。所以追加 14 条规则后，全计划最后一个目标是 `other-agent-sessions#3`（该规则 3 个定位器）。
- 受影响的旧断言只有两处：`rules_resolve_plan` 的 `plan.targets.last()`（基线第 733～737 行）与 `rules_seed_coverage` 的 `expected.last()`、`rules.rules().last()`（基线第 778～783 行）。
- 其它位置断言不受影响：首个目标仍是 `codex-marketplace-staging#1`；三条登录与网站数据规则各 32 个、连续；`cachedir-tagged` 仍是 2 个；全表逐行核对（第 816 行起）随种子表一起追加即可。

执行者的最小补充需求合理，按下面授权。

## 要做的

### 1. 授权改动的两组旧断言（`packages/junk-rules/tests/rules_v1.rs`）

原有失败信息里的 `RULES_RUST_BUILD` 原样保留，4 个测试名不变。

**`rules_resolve_plan`**：把

```rust
plan.targets.last().map(|target| target.target_id.as_str()) == Some("custom:beta:rust-build-dirs#1")
```

改为“筛出 `rule_id == "rust-build-dirs"` 的目标，按顺序恰好是 `custom:alpha:rust-build-dirs#1`、`custom:beta:rust-build-dirs#1`”，标记 `RULES_RUST_BUILD`。原意“追加的目标按自定义文件夹顺序”保持。

另加（标记 `RULES_AGENT_TOOLS`）：
- `custom:beta:rust-build-dirs#1` 之后恰好还有 38 个目标，依次属于 SPEC 第 2.1、2.2 节表中顺序的 14 条新规则，每条规则内按定位器顺序；
- 全计划最后一个目标是 `other-agent-sessions#3`。

**`rules_seed_coverage`**：
- 把 `expected.last()` 改为在种子表里按 `id == "rust-build-dirs"` 查找，把 `rules.rules().last()` 改为按 `rule_id == "rust-build-dirs"` 查找；后面的逐字段断言与 `RULES_RUST_BUILD` 标记不变；
- 另加：`rust-build-dirs` 是第 61 条（下标 60，标记 `RULES_RUST_BUILD`）；第 62～75 条的规则 ID 依次与 SPEC 表中顺序一致（标记 `RULES_AGENT_TOOLS`）；
- 全表逐行核对照旧。

你提出的“固定原有目标的相对顺序不变”不强制。想加可以加，标记 `RULES_AGENT_TOOLS`，但不得写死新的大列表。

### 2. 官方出处

你的网页工具打不开时，不算受阻：
- 总控已在 2026-10-28 只读核对了 SPEC 第 2.5 节要求的出处，网址与标题见上面第 6 项文件。`official_doc` 的 `ref` 用其中的网址，原样照抄（含结尾的 `/`）。
- 你能打开网页就自己再核一遍，`checked_on` 写你核对的日期；打不开就写 `2026-10-28`，并在回执里写明“网址由总控核对，执行者网页工具不可用”。
- 不要用这份文件以外的网址，除非你自己打开核对过。

### 3. 其余

原票“要做的”第 1～6 条与 SPEC 第 2～4 节照做。SPEC 第 4 节的三处获准改动（61→75、216→255、`2026-10-27.1`→`2026-10-28.1`）仍然有效。

## 不变

- SPEC 第 5 节：其余规则的全部字段与顺序；校验器、解析器、规则格式版本、依赖；
- 不改 `packages/junk-scan`、服务与宿主，不改 `Cargo.toml`、`Cargo.lock`；
- 白名单、负控 nc1（只改 `packages/junk-rules/src/` 一处，标记 `RULES_AGENT_TOOLS`）、三个 final 都同原票。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w6-i1`、分支 `worker/water-w6-i1`，从回执提交 `f0f7243a` 接着做。开工时树应干净且 HEAD 为该提交。**不要重跑 baseline。**
- 命令同原票（在工作树根目录执行），例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W6-I1 --mode test
  ```
  反复用 `lock`、`check`、`test`；负控：只改 `packages/junk-rules/src/` 下一处 → `--mode red-nc1` → `git checkout` 恢复原字节 → 立即 `--mode test`。提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 提交身份照规则第 5 节：只在提交命令的进程里设作者与提交者环境变量，不写任何 git 配置，不借用人类作者身份。
- 原生窗口 0、选择框 0。核对网页只读，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `f0f7243a` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W6-I1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w6-i1/docs/dispatch/reports/WATER-W6-I1-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：
- 实际模型、续做起点、实现提交 SHA；
- 14 条新规则与 `electron-app-cache` 改动后的完整 JSON；每条来源核对了什么、哪天、谁核对的；
- 改过的旧断言：SPEC 第 4 节三处与本补单第 1 节两组，写改动前后的原文；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W6-I1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
