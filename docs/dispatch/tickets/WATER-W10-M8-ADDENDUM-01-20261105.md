# WATER-W10-M8 补单 01：同一句柄复查修改时间用 FileBasicInfo（中门）

2026-11-05，总控（Claude）。回应 WATER-W10-M8 的受阻回执（回执提交 `67975926`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M8-DUP-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/DUP-M35.md`（全文），以及原票列出的仍然有效的契约；
4. 本补单（与原票、规则或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w10-m8/docs/dispatch/reports/WATER-W10-M8-REPORT.md`。

## 受阻判断

受阻成立，是总控写 SPEC 第 1 节时的疏漏：第 3 节第 6 步要求“读完从同一句柄再读一次大小与修改时间”，而第 1 节允许的信息类（1、9、18）都没有修改时间，又没允许对已打开的 `File` 取 `metadata()`。按路径复查或只比大小都不能代替，你没有这样做，正确。

## 改动（补充 DUP-M35 第 1 节与第 3 节第 6 步）

- `GetFileInformationByHandleEx` 另许**类 0 FileBasicInfo，只查询**（取 `CreationTime`、`LastWriteTime`），仍只在 `src/native_windows.rs`。不加新的系统函数；系统函数名单仍是原票的两个。
- 第 3 节第 6 步的“读之前记下大小与修改时间”与“读完再读一次”，都从**同一个已打开的句柄**用类 1（`EndOfFile`）与类 0（`LastWriteTime`）取；任一变了就把这个文件移出结果、记 `changed`。
- `DupCopy.created`、`mtime` 可以照旧取目录列表里的值，也可以取打开时类 0 的值，二者择一、全程一致，回执写明用的哪个。
- 不许对已打开的 `File` 调 `metadata()`（保持只走白名单的句柄信息类）。

## 其余

- 全部照原票与 SPEC：DUP-M35 第 1～5 节（含 `same_name_different`、`link_count`、`found_bytes` 与执行器口径的身份），第 6 节精确 4 个测试，第 7 节三条负控与真实冒烟；没有新的获准修改项（新包，没有旧断言）。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m8`（分支 `worker/water-w10-m8`），从 `67975926` 续做。baseline 已通过，不用重跑。已提交的受阻回执与证据保留，不改写，只在其后新增提交。

## 命令（在工作树根目录执行）

照原票：新包先写 `Cargo.toml` 再 `--mode lock`；反复用 `check`、`test`、`real`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M8 --mode lock
```

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W10-M8 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m8/docs/dispatch/reports/WATER-W10-M8-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：实际模型、续做起点、实现提交 SHA；SPEC 第 1～5 节逐条（含类 0 用在哪里）；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；真实冒烟的输出；没做或没验证的事。

受阻则写“WATER-W10-M8 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 B 组的最后一张**（M9、M3 已交回）。
