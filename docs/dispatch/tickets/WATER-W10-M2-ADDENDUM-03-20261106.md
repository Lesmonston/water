# WATER-W10-M2 补单 03：遍历之后丢掉的组也要带预算问题（中门）

2026-11-06，总控（Claude）。M2 补单 02 已交回（回执提交 `c4a02875`，实现 `cd088483`）。补单 02 的第 1、3、4、5 条都做到了：审计 0 问题，新树重跑 lock、check、real、test 四个 final 通过，总控变异十一条全部抓住（含上一轮漏掉的 c5、c7），独立审查确认 `.git` 内已不出任何条目。但第 2 条只做到一半，而且有一种情况比 `68f90263` 退步了：**遍历结束之后才丢掉条目的组，`budget_exhausted` 被删掉了**。这不是你的受阻，是验收不通过、要续做。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M2-SCAN-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/SCAN-M35.md`（全文，重点第 6.4 节），以及仍然有效的 `contracts/checkup-v1/SCAN.md` 第 3 节、`contracts/m3c-v1/SCAN-M3C.md` 第 3 节；
4. 补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M2-ADDENDUM-01-20261105.md`、补单 02 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M2-ADDENDUM-02-20261106.md`（都仍然有效）；
5. 本补单（与原票、规则、SPEC、补单 01 或 02 冲突时以本补单为准）；
6. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m2/docs/dispatch/reports/WATER-W10-M2-REPORT.md`。

行号按 `cd088483`。

**耗时仍不用管**，本补单不要求性能改动；总控验收时会自己再做一次新旧对比计时。

## 1. 每个因预算没出全的组都带 `budget_exhausted`（必须改）

现在 `src/scan/streaming.rs` 第 997～1007 行先删掉全部 `budget_exhausted`，再只给 `budget_groups` 重记。`budget_groups`（第 915～929 行）只收了 `remaining` 里没做完的搜索和仍在 `pending` 里的行。已经离开 `pending` 之后才丢掉的，都漏了。已确认的四种情况：

1. **延后的 discovery 行**：第 959 行 `engine.stopped(...)` 为真就 `break`，后面所有 `deferred` 行连同触发停下的这一行都丢了。`stopped()` 刚给它记上的问题被第 1000～1002 行删掉，这些组不在 `budget_groups` 里。确定可复现：discovery 目标 D 的 root 较浅、先走到，它的搜索做完、行进入 `deferred`；之后测量另一个 pattern 目标 P 的命中时条目预算用完。结果 D 组 0 个条目、没有任何问题，只有总状态是 `partial`。`68f90263` 时 D 组还带着 `budget_exhausted`。
2. **在 Exit 帧上按时间预算丢掉的命中**：`finish`（第 221 行附近）或 `scan.rs` 的 `push_measured_hit`（第 612、631 行附近）丢掉了一个已经离开 `pending` 的命中，它的组不在 `budget_groups` 里，问题同样被删。
3. **自选位置的簇搜索被跳过**：`scan.rs` 第 1058～1063 行在 `engine.budget_exhausted()` 为真时整段跳过 `build_clusters`。这些搜索所属的组没有任何问题；`68f90263` 时第一个搜索的组还会记上。
4. **强制收尾 emit 期间时间用完**（第 986～996 行）：之后没有任何 `stopped()` 调用，状态停在 `completed`、没有问题，而第 1059 行的判断又悄悄跳过了簇。结果是“完成”但少了组。

改为（做法自定，下面是要达到的结果）：
- 停下之后，凡是**本该出条目却因预算没出全**的组，都在它**最终归属**的组上记一次 `budget_exhausted`（同一组只记一次）。上面四种都算：没解析完的 `deferred` 行（含触发停下的那一行）的组；离开 `pending` 后才被丢掉的命中的组；没建的簇搜索所属的组（与 `68f90263` 的归属一致）。
- 补单 02 第 2 条的三句照旧：正在测量的命中记到最终归属组；搜索没做完的目标记到它自己的组；已经完整做完、条目已出的组不记。
- 只要因为预算跳过了任何工作（包括第 1059 行跳过簇），总状态必须是 `partial`，不能是 `completed`。最好让这一处判断也走 `stopped()`。
- 取消时照旧，状态 `cancelled`，不记 `budget_exhausted`。

## 2. 测试（必须加，只能新增）

在 `SCAN_M35_CLUSTERS` 或原票的预算测试里加：
- **情况 1 的确定例子**：如上，D 的 root 先走到、行进入 `deferred`，测量 P 的命中时条目预算用完。断言 D 组带 `budget_exhausted`、P 组也带，状态 `partial`。把你给 `deferred` 组补记的那一处去掉时，这一例必须失败（在 `c4a02875` 上它就应当失败）。
- **情况 3**：开着自选位置簇搜索，预算在遍历中用完。断言簇搜索所属的组带 `budget_exhausted`，状态 `partial`。
- **情况 4**，能做到确定就加：遍历结束后、建簇前时间用完，状态是 `partial` 而不是 `completed`。若要靠睡眠才做得到而不稳定，就不加，在回执里说明原因。
- 情况 2 能顺手覆盖就加，不强求。

## 3. 顺手补的（低）

- 补单 02 的 `.git` 测试里，marker、`file_name` 和内层 discovery 目标的 root 都放在了 `.git` 里面，所以拦住它们的是 root 过滤（第 347 行），而不是每个目录的 `search_allowed`。补一例：这三种目标的 root 都在 `.git` **外面**，外层有测量在进行，遍历进入 root 下的 `.git` 时那里不出任何条目、声明和簇。去掉 `search_allowed` 对这三种的限制时，这一例要失败。
- 第 347 行的 root 过滤从“root 就叫 `.git`”放宽成了“root 有任何一段是 `.git`”，自选位置在 `.git` 里面时现在不出东西、也不报 `base_missing`。这一点保留，但在回执里写明。

## 不要求（记入总控遗留，不在本单做）

- 补单 02 列出的三条照旧不做：discovery 子项先测后判覆盖、停下时丢掉已测完的 discovery 条目、`row.issues` 累积与逐字符分配。
- `search_indices`（第 894～899 行）每个子帧重复做目标匹配、`remaining` 按帧存路径带来的 CPU 开销。

## 其余

- 全部照原票、SPEC、补单 01 与 02：精确的测试名单（五测）、三条负控照旧；**原有断言一处不改**（补单 01、02 新加的断言也不改，只能新增）。提交干净实现后重新做三条红绿与三个 final。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m2`（分支 `worker/water-w10-m2`），从 `c4a02875` 续做。已提交的回执与证据保留，不改写，只在其后新增提交。

## 命令（在工作树根目录执行）

照原票：反复用 `lock`、`check`、`test`、`real`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M2 --mode test
```

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W10-M2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m2/docs/dispatch/reports/WATER-W10-M2-REPORT.md
```

原有各节保留，新增“补单 03”一节，写：实际模型、续做起点、实现提交 SHA；第 1 条的四种情况各自怎样处理；第 2、3 条新增的测试例；每个检查命令与结果；三条负控与恢复后的哈希；真实冒烟结果；没做或没验证的事。

受阻则写“WATER-W10-M2 任务受阻”，写清冲突与最小补充需求，不要自行变通。

本单不依赖别的单，交回 HEAD 之后即可开工。
