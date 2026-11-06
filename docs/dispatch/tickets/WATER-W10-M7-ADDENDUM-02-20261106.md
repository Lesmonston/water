# WATER-W10-M7 补单 02：汇总行改为用到才算（轻门）

2026-11-06，总控（Claude）。你的受阻回执（`af7fa295`）成立，停下是对的：同一字节的两次完整测试，旧断言 `SERVICE_RETURN_BUDGET: clean_prepare` 与 `SERVICE_M3C_EXCLUDE: scale prepare 55.5931ms` 先后超过 50 ms。可以新开对话执行。

开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-SERVICE-20261106.md`、补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-01-20261106.md`（都仍然有效）；
2. 本补单（与原单、补单 01 或 SPEC 冲突时以本补单为准）；
3. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md`。

## 0. 总控的核对

- **这是本单引入的变慢，不是机器忙。** “排除规模”这个旧用例在合入前的代码上留有 7 次记录（`SERVICE_M3C_EXCLUDE scale_ms`，第八波 K4 与第九波 L3 的验收日志），在 21.6～31.0 ms 之间；你这两次是 36.7 ms 与 55.6 ms。
- **原因在 `src/views.rs` 的 `Projection::new`（检查点 `cd0e5d21` 第 265～270 行）。** 它给记录里的每一组都调用一次 `conclusion::make_rows`。`make_rows`（`src/conclusion.rs` 第 773 行起）每组都把全部条目扫一遍，再排序、合模板、算行 ID。
- 规模夹具有一万项，于是冷启动后第一次需要投影的命令（`clean_prepare`、`group_detail` 等）都要替所有组先算好汇总行。
- `summary_rows` 只在 `src/conclusion.rs` 第 1104 行用到一次：没有结论模型时，`group_detail` 给某一组取汇总行。
- 50 ms 是 IPC 契约对每个命令的返回时限，不放宽。

## 1. 要做的

1. `Projection::new` 不再计算汇总行。改为某一组第一次需要时才算，算完缓存在同一份投影里。记录不会变，缓存可以一直用。不需要汇总行的命令一行都不算。
2. 建议（做法自定）：`make_rows` 与结论建模（`src/conclusion.rs` 第 144 行）按组取条目时，用一次建好的“组 → 条目”索引，不要每组扫一遍全部条目；排序用预先解析好的数字。前提是输出逐字节不变。
3. 汇总行的 ID、顺序、标签、所含条目与 `rows_note_zh` 都不变。`m35_rows_and_detail` 等现有断言一处不改。

## 2. 不许做的

- 不改任何 50 ms 上限，不改规模夹具的大小，不改 `call()` 的计时方式；不跳过、不过滤、不换测试目标，不加 sleep 或重试。
- 不改契约、样例、检查器、台账与其它包。

## 3. 验证

- `test` 通过后，在回执里写出最后一次 `test` 日志里的 `SERVICE_M3C_EXCLUDE scale_ms` 与 `SERVICE_M3C_SKIP scale_ms`，与上面的旧值（21.6～31.0 ms）对照。
- 停止规则照旧：同一字节连续两次失败就停下，写受阻回执，附上两次的耗时。M6 界面单与本单同时在这台机器上跑，你能看到当时有别的检查在跑就写上，看不到就写“未知”。
- 之后照原单完成剩下的部分：完整的绿；三条负控，每条恢复原字节后再绿一次；干净实现提交上的 `check`、`test`、`real` 三个 final；`archive`；完成回执。`baseline` 不用重跑，原单的 baseline 已通过。

## 其余

- 全部照原单、补单 01 与 SPEC：精确 12 个测试、三条负控、依赖、系统函数（只许新增 `SHQueryRecycleBinW`）、白名单都不变。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`（分支 `worker/water-w10-m7`），从 `af7fa295` 续做。已提交的检查点 `cd0e5d21`、回执与证据保留，不改写，只在其后新增提交。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W10-M7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md
```

原有各节保留，新增“补单 02”一节，按原单“交回”一节逐项写。受阻则写“WATER-W10-M7 任务受阻”，写清冲突与最小补充需求，不要自行变通。
