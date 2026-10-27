# WATER-W5-H1：清理执行器 M2 收尾（重门）

2026-10-27，正式票，总控（Claude）。以 [第五波 manifest](../wave5/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**删除路径上的票，可以新开对话执行。** 本票与 H2～H5 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H1-CLEAN-M2-20261027.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w5-h1 / worker/water-w5-h1 |
| 精确首次 HEAD | 3f9078972d7f958fad6bfd42e68f022dd659539e，必须干净；`packages/junk-clean` 是 G5 验收合入后的版本 |
| SPEC | F:/new/smaltalk/water/contracts/m2-v1/CLEAN-M2.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/m2-prep-v1/CLEAN-REPORT.md；F:/new/smaltalk/water/contracts/hardening-v1/CLEAN-HARDENING.md；F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W5-M2-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w5-h1/docs/dispatch/reports/WATER-W5-H1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w5-h1/docs/acceptance/wave5/h1/ |
| 门 | 重门：3 条负控 + check、test 两个 final |

先读：
1. 规则与 SPEC CLEAN-M2 全文，再读它覆盖的三份契约；
2. 背景：[M2 计划](../../M2-PLAN-20261027.md)第 2 节；[G5 收单验收](../../acceptance/wave4/controller/WATER-W4-G5G6G7-REVIEW-20261027.md)的 G5 一节；
3. 代码：`packages/junk-clean/src/native_windows.rs` 里的 `walk_subtree`、`DelCtx`（`node`、`only_post_snapshot`、`fail`）、`walk_parent`、`delete`、`measure_residual`、`measure_tree`。

## 要做的（全部在 `packages/junk-clean/src/`）

SPEC 第 1～5 节逐条实现：
1. **不用递归**：快照遍历、删除、残余统计都改成显式栈或循环。删除顺序、复核、停止检查点、计数与报告完全不变。
2. **被应用立刻重建的同名对象不算失败**：记住本次成功删除的快照项。目录删不掉后再枚举时，名字对应已删快照项的，当作新出现。
3. **上级目录在删除前被移走**：逐级打开上级返回 2 或 3 时报 `skipped/gone`；统计残余时按 CLEAN-REPORT §2。
4. **释放字节按本次真正删掉的计**：
   - 累加成功设置删除标记的普通文件在删除前的大小（同一句柄的 `FileStandardInfo`）；
   - 链接数大于 1 的不计；
   - 残余只用来判定状态。
5. **名字不是合法 UTF-16 的对象**：不得静默略过。计 1 个失败并记为已有交代，或者按原始 UTF-16 名字相对打开并照常处理；回执写清用了哪种。

**不变**：SPEC 第 7 节列的一切，包括公开 API、报告字段、允许的 8 个系统函数、`forbidPatterns`、删除方式与停止规则。

## 白名单

- `packages/junk-clean/` 下的文件。应只改到 `src/native_windows.rs` 与 `tests/clean_v1.rs`；如需改别处，在回执里说明。
- `docs/dispatch/reports/WATER-W5-H1-REPORT.md`
- `docs/acceptance/wave5/h1/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-clean/tests/clean_v1.rs`，仍是精确 6 个测试，名字与已有断言不变。新断言照 SPEC 第 6 节加在已有测试里，失败信息带标记：
- `CLEAN_DEEP_TREE`：4000 层目录链，在 256 KiB 栈的线程里清理成功；
- `CLEAN_FREED_EXACT`：硬链接文件不计入，其余文件大小之和恰好等于 `bytes_freed`；
- `CLEAN_UNPAIRED_NAME`：含孤立代理项名字的文件不被静默略过。

夹具只在本树 `.local/w2-d-fixtures/` 下按规则新建与回收。深目录链的回收也要经过同样的父目录与前缀校验。

第 2、3 条没有确定性的测试挂点，**不要**为它们在生产代码里加测试开关。总控验收时会用自己的用例覆盖，你可以读、但不要加进本树：
- `F:/new/smaltalk/water/scripts/acceptance/w4-g5-controller-unit.rs`（先快照、再改磁盘、再删除）；
- `F:/new/smaltalk/water/scripts/acceptance/w4-g1-controller-cases.rs`（删除开始后由另一个线程改动后面的对象）。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 链接数大于 1 的文件也计入释放量 | `CLEAN_FREED_EXACT` |
| nc2 | 名字不能无损转换的对象又被静默略过 | `CLEAN_UNPAIRED_NAME` |
| nc3 | 超过某个深度的目录不再入栈处理 | `CLEAN_DEEP_TREE` |

每条只改 `src/` 里真正被调用的一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H1 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`，再 `archive`。

## 预算与边界

- cargo 离线、单线程、私有 target。
- 原生窗口 0；不读真实位置，夹具只在本树 `.local` 下。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W5-H1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h1/docs/dispatch/reports/WATER-W5-H1-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～5 节逐条：改了哪里、怎么满足；第 1 条写清三处各用什么结构代替递归；
- 每个检查命令与结果；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W5-H1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
