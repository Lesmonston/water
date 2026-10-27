# WATER-W4-G5：清理结果报告修正（重门）

2026-10-27，正式票，总控（Claude）。以 [第四波 manifest](../wave4/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**这是删除路径上的特殊票，可以新开对话执行。** 本票与 G6（宿主）、G7（界面）同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G5-CLEAN-REPORT-20261027.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w4-g5 / worker/water-w4-g5 |
| 精确首次 HEAD | 4f35c52f5abb3dee22583cc2c86b05da2fc2be93，必须干净；`packages/junk-clean` 是 G1 验收合入后的版本 |
| SPEC | F:/new/smaltalk/water/contracts/m2-prep-v1/CLEAN-REPORT.md（本票的全部要求） |
| 被修正的契约 | F:/new/smaltalk/water/contracts/hardening-v1/CLEAN-HARDENING.md；F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w4-g5/docs/dispatch/reports/WATER-W4-G5-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w4-g5/docs/acceptance/wave4/g5/ |
| 门 | 重门：3 条负控 + check、test 两个 final |

规则写于本票之前，按票划分目录的表格不含本票；本票的范围以白名单为准。规则对 G1 的要求（系统函数、`src/` 不用路径、Rust 写法）对本票同样适用。

先读：
1. 规则；
2. SPEC CLEAN-REPORT 全文，以及它修正的 CLEAN-HARDENING 第 4、5 节和 CLEAN；
3. 背景：[G1 收单验收](../../acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)的第三轮，以及 G1 的补单 01、02（同目录 `WATER-W4-G1-ADDENDUM-0*.md`）；
4. 代码：`packages/junk-clean/src/native_windows.rs` 中的 `DelCtx`、`delete`、`measure_residual`、`only_post_snapshot`。

## 要做的（全部在 `packages/junk-clean/src/`）

SPEC 第 1～5 节逐条实现：
1. **删除开始时条目本身不在或被换** → `skipped`，原因分别是 `gone`、`changed`；`bytes_freed` 0，`failed_entries` 0。
2. **统计残余时原名下没有条目**（错误 2、3）：照补单 02 第 4 条“换成别的对象”的规则处理，即只有本次成功给条目本身设了删除标记才算残余 0，否则残余按 `bytes_before` 计。
3. **每个留下的对象只计一次失败**：上级目录因为它删不掉时不再计。目录删不掉时，按 SPEC 第 3 节的表判断是否计数，并维护“已有交代”的快照项。
4. **快照查找**先精确匹配，找不到再忽略大小写匹配。
   - 要求：不能退回线性扫描。十万个文件时总控会再计时，当前是 23 秒。
   - 做法不限，例如另建一份按大写键排序的索引。
5. **`bytes_freed`**：本次一个都没删掉时为 0。
6. **补回三行注释末尾被截掉的字母**：G1 补单 02 时编辑工具把行尾的 `r` 截掉了。
   - `Every othe` 改回 `Every other`；
   - `any othe` 改回 `any other`；
   - `expected rathe` 改回 `expected rather`。
   - 提交前用 `git diff` 确认没有别的行被意外改动。

**不变**：SPEC 第 6 节列的一切，包括公开 API、允许的 8 个系统函数、`forbidPatterns`、删除方式与停止规则。

## 白名单

- `packages/junk-clean/` 下的文件（只应改到 `src/native_windows.rs`，如需改别处在回执里说明）
- `docs/dispatch/reports/WATER-W4-G5-REPORT.md`
- `docs/acceptance/wave4/g5/` 下 `--mode archive` 生成的证据

## 测试

- 仍是 `packages/junk-clean/tests/clean_v1.rs` 的精确 6 个测试，名字与已有断言不变。
- **本票不要求新增断言。** 第 1～4 条都只在删除过程中被并发改动时才走到，不要为此在生产代码里加测试开关。
- 总控会用自己的竞态用例验收：先让条目里一个几千文件的目录被删，删除开始后由另一个线程改动后面的对象。
  - 用例在主检出的 `F:/new/smaltalk/water/scripts/acceptance/w4-g1-controller-cases.rs`，你可以读，但**不要**把它加进本树的 `Cargo.toml` 或测试目录。
  - 现有用例里，“子目录被换成文件”的失败数等计数会按 SPEC 第 3 节变化，总控会相应调整用例。
- 回执里第 1～5 条逐条写清代码怎么满足、计数怎么走。

## 负控

源码要改，三条负控按新源码重做，标记与原票相同：
- nc1 `CLEAN_REPARSE_KIND`
- nc2 `CLEAN_GUARD_ID`
- nc3 `CLEAN_NO_FOLLOW`

每条只改 `src/` 里真正被调用的一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G5 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`，再 `archive`。

## 预算与边界

- cargo 离线、单线程、私有 target；原生窗口 0；不读真实位置，夹具只在本树 `.local` 下。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W4-G5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g5/docs/dispatch/reports/WATER-W4-G5-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～5 节与上面第 6 条逐条：改了哪里、怎么满足；
- 每个检查命令与结果；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W4-G5 任务受阻”，写清冲突与最小补充需求，不要自行变通。
