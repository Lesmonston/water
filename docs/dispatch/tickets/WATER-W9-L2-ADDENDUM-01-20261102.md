# WATER-W9-L2 补单 01：既有测试里的联接与硬链接夹具照旧运行（轻门）

2026-11-02，总控（Claude）。回应 WATER-W9-L2 的受阻回执（回执提交 `5431e812`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W9-L2-SCAN-20261102.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W9-M3D-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m3d-v1/SCAN-M3D.md`（全文），以及原票列出的仍然有效的契约；
4. 本补单（与原票、规则或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w9-l2/docs/dispatch/reports/WATER-W9-L2-REPORT.md`。

## 受阻判断

受阻成立，是总控写单时的疏漏。原票“测试”一节与规则第 3 节写了“L2 的夹具只建普通文件与目录，不创建联接或符号链接”，本意只管**本单新增**的夹具。但基线 `packages/junk-scan/tests/scan_v1.rs` 里原有的测试本来就会建两种受控的链接夹具。总控已只读核对基线，你列的几处都成立：

| 夹具 | 基线位置 | 用在 |
|---|---|---|
| 联接：第 109 行起的 `junction`，经 `cmd /c mklink /J` 建 | 第 109 行起 | `scan_reparse_budget_cancel`（第 917、920 行）；`scan_overlap_and_guards` 调用的 `check_single_walk`（第 1393 行） |
| 硬链接：第 1244 行起的 `hard_link`，经 `cmd /c mklink /H` 建 | 第 1244 行起 | `scan_pattern_marker_discovery` 调用的 `check_unique_bytes` |

另外两处 `fs::symlink_metadata` 只是读属性，不建任何链接。

## 要做的

1. **澄清**：“只建普通文件与目录”只约束本单新增的夹具，也就是 SCAN-M3D 第 5 节 `SCAN_M3D_CONDITIONS` 那张表。上表两种既有夹具在精确五个测试里**原样运行**，与第八波 K3 相同。仍然：
   - 不创建符号链接（不带 `/J`、`/H` 的 `mklink`，以及 `mklink /D`）；
   - 所有夹具只建在本树 `.local/` 下，用完只删本次新建的那一个目录；
   - 不改这些既有夹具与它们的断言。
2. 其余全部照原票与 SPEC：SCAN-M3D 第 1～4 节，第 5 节的测试与获准修改的两类旧断言，第 6 节的两条负控与真实冒烟。没有新的获准修改项。
3. **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w9-l2`（分支 `worker/water-w9-l2`），从 `5431e81260ab81c4c1cd2cc75fa6c7860116564d` 续做。baseline 已通过两次，不用重跑。已提交的受阻回执与证据保留，不改写，只在其后新增提交。

## 命令（在工作树根目录执行）

照原票：反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W9-L2 --mode test
```

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W9-L2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l2/docs/dispatch/reports/WATER-W9-L2-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：
- 实际模型、续做起点、实现提交 SHA；
- SPEC 第 1～4 节逐条：改了哪里、怎么满足；
- 改过的旧断言：SPEC 第 5 节的两类，写改动前后的原文；
- 每个检查命令与结果，`real` 的用时与访问条目数；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W9-L2 任务受阻”，写清冲突与最小补充需求，不要自行变通。
