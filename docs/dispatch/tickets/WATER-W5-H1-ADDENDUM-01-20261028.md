# WATER-W5-H1 补单 01：名字不是合法 UTF-16 的目录不能让整项否决失效（重门）

2026-10-28，总控（Claude）。依据 [第五波验收进度](../../acceptance/wave5/controller/WATER-W5-ACCEPT-PROGRESS-20261028.md)第 4.1 节与总控用例。**这是删除路径上的票，可以新开对话执行。** 开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H1-CLEAN-M2-20261027.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W5-M2-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m2-v1/CLEAN-M2.md`（全文），以及仍然有效的 `contracts/m2-prep-v1/CLEAN-REPORT.md`、`contracts/hardening-v1/CLEAN-HARDENING.md`、`contracts/checkup-v1/CLEAN.md`（都在 `F:/new/smaltalk/water/` 下）；
4. 本补单（与前面冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w5-h1/docs/dispatch/reports/WATER-W5-H1-REPORT.md`。

## 验收结果

下面这些通过，不要改：
- 机械检查、两个 final、三条执行者负控；总控另做的三条负控（位置与执行者不同）也都被抓到。
- 第 1～4 条与第 5 条的文件部分。总控用例（先快照、再改磁盘、再删除）在本票源码上全部通过，在第五波以前的源码上失败：
  - 上级或祖父目录在删除前被移走 → `skipped/gone`；上级被换成同名新条目 → `skipped/changed`，两边都不动；
  - 硬链接在条目外不计；两个链接名都在条目里，数据只计一次；
  - 文件在快照后变大或变小，按删除时的大小计；
  - 应用立刻重建同名文件 → 失败 0、`partial`。
- 第四波的 7 个与 12 个总控用例计数不变；十万个文件 15.5 秒；4000 层深树在 256 KiB 栈上删除与残余统计都完成。

要改的只有下面一条，**全部在 `packages/junk-clean/src/native_windows.rs`**，测试在 `tests/clean_v1.rs`。

## 要改的

### 1. 快照遇到名字不能无损转换的目录（中级）

- **现在**：快照登记一个对象时（`consider_entry` 的目录分支），返回 `Ok(raw.name_ok)`。名字不能无损转换的非重解析目录因此**不展开**，它里面的东西不进快照。
- **后果**：整项的否决看不到它里面：
  - 非链接的重解析点（应整项 `reparse`，什么都不删）；
  - `min_age_hours`（应整项 `too_recent`）；
  - 守卫与受保护身份。
  条目里其它对象照删，这个目录计 1 个失败。
- **总控用例已在真实磁盘上复现**：条目里有 `ok.bin`（两天前）和一个目录，目录下 `sub\new.bin` 是刚写的，条目最小年龄 1 小时：
  - 目录名普通 → 整项 `skipped/too_recent`，什么都不删；
  - 目录名含孤立代理项 → `ok.bin` 被删，`partial`，失败 2。
  - 第五波以前的源码用有损名字打开它得到错误 2，整项 `changed`，什么都不删。
- CLEAN-M2 开头写的是“链接与重解析点规则、守卫与保护路径……一律不变”。第 5 条讲的是删除时怎样处理这种快照项，没有允许快照不完整。
- **改为**（二选一，回执写清用哪一种）：
  - **A（推荐）**：快照遇到名字不能无损转换的**非重解析目录**，整项 `skipped`，原因 `changed`，什么都不删。与第五波以前的结果相同。
  - **B**：按原始 UTF-16 名字相对打开它，照常展开；整棵子树照常参与所有否决与复核。删除与残余统计也按原始名字打开，照常复核后删除。
- 名字不能无损转换的**文件**和**链接**不变：快照记下，删除时不打开，计 1 个失败。它们的否决所需信息（属性、重解析标记、FileId、时间）都来自枚举，快照是完整的。

## 测试

- 仍是精确 6 个测试，名字与已有断言都不变。
- 在已有的 `CLEAN_UNPAIRED_NAME` 断言旁边加目录的情形，失败信息用同一标记 `CLEAN_UNPAIRED_NAME`：
  - 选 A：条目里有一个普通文件和一个名字含孤立代理项的目录（目录里有一个文件）。清理后整项 `skipped`，原因 `changed`；普通文件、那个目录和它里面的文件都还在；`bytes_freed` 为 0。
  - 选 B：同样的条目，目录里再放一个最近写入的文件，条目的 `min_age_hours` 为 1，其余对象调成两天前。清理后整项 `skipped`，原因 `too_recent`，什么都不删；另外断言不带最近文件时这个目录与其中文件被删除。
- 不要为此在生产代码里加测试开关。

## 负控

源码变了，三条负控按新源码重做，标记与原票相同：
- nc1 `CLEAN_FREED_EXACT`
- nc2 `CLEAN_UNPAIRED_NAME`：这次请改第 1 条新逻辑里真正被调用的一处，例如让这种目录重新被当成叶子；
- nc3 `CLEAN_DEEP_TREE`

每条只改 `src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w5-h1`、分支 `worker/water-w5-h1`，从回执提交 `9f49e8b9215f4fab0fb555314d356b40f4676ad1` 接着做。**不要重跑 baseline。** 开工时树应干净且 HEAD 为该提交。
- 检查入口与命令同原票，例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H1 --mode test
  ```
  另有 `lock`、`check`、`red-nc1..3`。提交干净实现后依次跑 `check --final`、`test --final`，再 `archive`。
- 范围不变：只改 `src/native_windows.rs` 与 `tests/clean_v1.rs`；公开 API、JSON 字段、依赖、锁文件、允许的 8 个系统函数都不变。
- 夹具只在本树 `.local` 下；不碰任何真实用户位置。原生窗口 0。
- 提交身份：只在提交命令的进程里设作者与提交者环境变量，用执行者自己的名字，不写任何 git 配置，不借用人类作者身份。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `9f49e8b9` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W5-H1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h1/docs/dispatch/reports/WATER-W5-H1-REPORT.md
```

新增“补单 01”一节，写：
- 实际模型、续做起点、新实现提交 SHA；
- 选了 A 还是 B，改了哪里，判断依据；
- 新断言写了什么；
- 三条负控的改动、失败信息、恢复后的哈希；
- 两个 final 与 archive 的回执。

受阻则写“WATER-W5-H1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
