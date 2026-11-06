# WATER-W10-M7 补单 03：custom_root_add 不计 50 ms，一万项分组首次打开再提速（轻门）

2026-11-06，总控（Claude）。你的受阻回执（`658c281a`）成立，停下是对的。补单 02 要的“汇总行用到才算”已经做到：执行者单独重跑时，“排除规模”用例为 27.6 ms，回到旧代码的 21.6～31.0 ms。可以新开对话执行，也可以在原对话里接着做。

开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-SERVICE-20261106.md`、补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-01-20261106.md`、补单 02 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-02-20261106.md`（都仍然有效）；
2. 本补单（与前面几份或 SPEC 冲突时以本补单为准）；
3. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md`。

## 0. 总控的核对

- **你的两次测试时机器确实忙。** 当时总控正在跑 M6 的验收与变异；另有两个总控前一天留下的无头浏览器进程一直占着 CPU，已停掉。
- **空闲时重跑，也不是全绿。** 总控在单独的验收树上（`658c281a`，产品字节与你的 `4d146934` 相同）跑了一次 lock，再连跑三次完整 `test`：
  - 第一次 12/12 通过；
  - 第二次 `m35_trends_history` 失败，`SERVICE_RETURN_BUDGET: custom_root_add`；
  - 第三次 `m35_conclusion_cards` 失败（`custom_root_add`），`service_clean_flow` 失败（`group_detail`）。
- **加上你的两次，五次完整测试里有三次是 `custom_root_add` 超时。** 原因不在产品：
  - 旧契约 `contracts/desktop-v1/SERVICE.md` 第 46 行写的是：“`call` 除 `custom_root_add`（会等用户在选择框里操作）外必须在 50 ms 内返回”；
  - 测试的 `call()`（`tests/service_v1.rs` 第 493～500 行）却对每个命令都卡 50 ms，超出了契约；
  - 新测试的 `m35_add` 每次都在刚建好的文件夹上调它，它要做 `canonicalize` 等文件系统检查，最容易超时。
- **`group_detail` 是真要再提速。** 空闲时一万项分组第一次打开也超过了一次 50 ms。旧代码同一路径只需建投影；现在还要给这一组算汇总行、算每行的视图，余量太小。
- **`skip_remove`、`cluster_mark_fixed` 只在机器忙时超过。** 但它们都会写 `settings.json`，值得确认一下没有在锁里做多余的事。

## 1. 获准修改的旧期望（第六类）

在 SPEC 第 11 节四类与补单 01 的第五类之外，再准一处：
- `call()` 只对 `custom_root_add` 一个命令不做 50 ms 断言（依据就是上面那行契约），其余命令照旧；
- 不改 50 ms 这个数，不改计时方式；
- 不给别的命令开例外，不加重试。

回执写明哪一行、原来怎样、现在怎样。

## 2. 要做的

1. **`group_detail` 一万项分组首次打开提速。**
   - 做法自定，例如每项的名字模板、父目录、排序键这类逐项计算只算一次，或者换更省的写法。
   - 输出必须逐字节不变：行 ID、顺序、标签、所含条目、`rows_note_zh`。
   - 在本机空闲时，量 5 次“一万项分组第一次 `group_detail`”的耗时写进回执，每次都要不超过 30 ms。
   - 计时只在你本地做（临时代码或临时测试），不提交，测试文件里不留计时代码。
2. **看一眼 `skip_remove` 与 `cluster_mark_fixed`。** 确认它们没有在持有状态锁时重算结论、建投影或多次写盘；有就移到锁外。回执写看到了什么、改了什么。
3. **不许做的：** 不改其它命令的时限，不改规模夹具，不改契约、样例、检查器、台账与其它包。

## 3. 验证

- **先连续三次完整 `test`，都要绿（同一字节），再做负控。** 三份回执都写进回执。
  - 中途某次失败，可以原样重跑一次；
  - 同一字节累计两次失败就停下，写受阻回执，附上失败的命令与测试名。
- 跑测试前看一眼机器上有没有别的 cargo、node 检查进程。只看进程名，不看命令行；有的话等它结束再跑，并在回执里写一句。
- 之后照原单做完：
  - 三条负控，每条恢复原字节后再绿一次；
  - 在干净的实现提交上跑 `check`、`test`、`real` 三个 final；
  - `archive`；
  - 完成回执。
- `baseline` 不用重跑。

## 其余

- 全部照原单、补单 01、02 与 SPEC：精确 12 个测试、三条负控、依赖、系统函数（只许新增 `SHQueryRecycleBinW`）、白名单都不变。
- 用户已确认补单 02 由你（Grok）续做，未验收实现 `4d146934` 记在你名下。同一工作树里不要有第二个执行者同时写。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`（分支 `worker/water-w10-m7`），从 `658c281a` 续做。已提交的内容不改写，只在其后新增提交。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W10-M7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md
```

原有各节保留，新增“补单 03”一节，按原单“交回”一节逐项写。受阻则写“WATER-W10-M7 任务受阻”，写清冲突与最小补充需求，不要自行变通。
