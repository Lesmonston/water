# CLEAN-M2：清理执行器 M2 收尾

2026-10-27，总控（Claude）。在 [CLEAN](../checkup-v1/CLEAN.md)、[CLEAN-HARDENING](../hardening-v1/CLEAN-HARDENING.md)、[CLEAN-REPORT](../m2-prep-v1/CLEAN-REPORT.md) 之上逐条覆盖；冲突时以本文为准。只改 `packages/junk-clean/`。

依据：
- [M2 计划](../../docs/M2-PLAN-20261027.md) 第 2 节，用户 10-27 拍板第 2 条；
- [G5 收单验收](../../docs/acceptance/wave4/controller/WATER-W4-G5G6G7-REVIEW-20261027.md)的独立审查与总控用例；
- 第四波清单 G1 的 `carryOver`。

M2 打开清理之后，这个包第一次面对真实磁盘。本文要求：
- 再深的目录树也不能让线程崩溃；
- 报告里的“释放了多少”“失败几项”是 Water 真正做到的。

删除方式、句柄打开、复核、链接与重解析点规则、守卫与保护路径、停止规则一律不变。

## 1. 不用递归

- 快照遍历、删除、残余统计三处现在都是递归函数（`walk_subtree`、`node`、`measure_tree`）。目录很深时会耗尽线程栈；栈溢出会直接结束进程，服务与界面一起消失。
- 改为显式栈（或等价的循环）：
  - 三处都不得递归调用自身，也不得互相递归；
  - 深度只受内存限制。
- 每层仍按句柄相对打开，祖先目录的句柄照旧保持到其子树处理完。
- 删除顺序（先子后父）、每项复核、停止信号检查点、计数与报告，都与现在完全相同；只是不再用调用栈。

## 2. 被应用立刻重建的同名对象不算失败（用户拍板第 2 条）

- 删除过程中，记住本次**成功设置删除标记**的快照项。
- 目录设置删除标记失败后要再枚举（CLEAN-REPORT §3）。剩下的某个名字若对应一个**已被本次删除**的快照项，说明这是删除之后新建的对象，按“快照之后出现”处理，不计失败。
- CLEAN-REPORT §3 的其余规则不变：
  - 至少剩一项，且每一项都是新出现或已有交代 → 不计，本目录记为已有交代；
  - 为空或再枚举失败 → 计 1。
- 例：快照有 `cache\index.dat`。Water 删掉它后，应用马上重建一个同名文件，`cache` 因此删不掉。结果：`failed_entries` 为 0，状态按残余判 `partial`。

## 3. 上级目录在删除开始前被移走

- 删除开始时逐级打开条目的上级目录（现在的 `walk_parent`）。若某一级返回错误 2 或 3（不在原名下），本项 `skipped`，原因 `gone`，`bytes_freed` 0，`failed_entries` 0。与 CLEAN-REPORT §1 条目本身不见了的处理相同。
- 统计残余时逐级打开上级返回 2 或 3：按 CLEAN-REPORT §2 处理。
  - 本次成功删过条目本身 → 残余 0；
  - 否则 → 残余按 `bytes_before`，不报 `deleted`，不额外计失败。
- 其它错误（拒绝访问等）不变：删除前照旧，残余未知时按 `bytes_before`，计 1。

## 4. 释放字节按本次真正删掉的计

取代 CLEAN 第 8 步与 CLEAN-REPORT §5 的 `bytes_before − 残余`。

- `bytes_freed` = 本次**成功设置删除标记的普通文件**的大小之和：
  - 大小取设置删除标记之前、从同一句柄读到的文件大小（`GetFileInformationByHandleEx` 的 `FileStandardInfo`，`EndOfFile`）；
  - 该文件的链接数（`NumberOfLinks`）大于 1 时不计入：数据还被另一个名字占着；
  - 目录、链接（重解析点）本身不计。
- 本次一个都没删掉时为 0。
- 文件在快照之后变大，按删除时的大小计，所以 `bytes_freed` 可以大于 `bytes_before`。
- 残余统计照旧做，只用来判定状态：`deleted` 仍然只在残余确定为 0 时报告；`partial`、`failed` 与残余未知计 1 的规则不变。
- 汇总的 `freed_bytes` 仍是各项之和。

不新增系统函数：`GetFileInformationByHandleEx` 已在允许的 8 个之中。

## 5. 名字不是合法 UTF-16 的对象

- 现在枚举得到的名字经有损转换。含孤立代理项的名字转换后打不开，被当成“已不在”而静默略过：不删、也不计失败。
- 改为：快照记下名字是否能无损转换。删除时遇到不能无损转换的快照项：
  - 不尝试打开它，计 1 个失败并记为已有交代；
  - 它所在的目录照旧按 CLEAN-REPORT §3 处理。
- 若能按原始 UTF-16 名字相对打开并照常复核、删除，也可以；两种做法都不得静默略过。回执里写清用的是哪一种。

## 6. 测试

`tests/clean_v1.rs` 仍是精确 6 个测试，名字不变：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`、`clean_handle_hardening`。

新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `CLEAN_DEEP_TREE` | 第 1 条：夹具里建一条 4000 层的目录链（每层名为 `d`，最深处一个文件；路径用 `\\?\` 前缀创建）。在栈只有 256 KiB 的新线程里执行清理：条目被删除，状态 `deleted` |
| `CLEAN_FREED_EXACT` | 第 4 条：<br>- 条目里有一个文件，它在条目外（同一夹具内）另有一个硬链接名：清理后这个文件的数据不计入 `bytes_freed`，条目外的那个名字仍在、内容不变；<br>- 条目里其余普通文件的大小之和恰好等于 `bytes_freed` |
| `CLEAN_UNPAIRED_NAME` | 第 5 条：条目里有一个名字含孤立代理项的文件（测试用宽字符串创建）。清理后它仍在，`failed_entries` 至少为 1，状态不是 `deleted` |

原有标记与断言不变。第 2、3 条没有确定性的测试挂点，由总控用例验证（不加产品挂点）。

## 7. 不变

- 公开 API、计划/报告/日志的 JSON 字段与取值；
- 依赖与锁文件；
- 允许的 8 个系统函数；
- `unsafe` 只在 `native_windows.rs`；
- 按句柄相对打开、不跟随重解析点、目录不含删除共享、链接删除前的身份与名称代理复核、删除标记与回退、句柄关闭顺序、停止信号与 `changed_stop` 规则。
