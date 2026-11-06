# WATER-W10-M7 补单 05：同步写文件的命令测试上限 200 ms，计时失败可多重跑（轻门）

2026-11-06，总控（Claude）。你的受阻回执（`44f22980`）成立，停下是对的。补单 04 做到了：后台线程收尾时不再持锁读写磁盘，本地量到后台每次持锁最长 3.05 ms，查重进度查询也没再超时。剩下的两次失败（`conclusion_decide`、`cluster_mark_fixed`）都是命令自己当场写 `settings.json`，`Store::write` 里的 `sync_all` 在 Windows 上偶尔超过 50 ms。产品照旧当场可靠保存是对的，改的是测试的计时方法。**用户已决定：这类命令在测试里放宽到 200 ms。** 可以新开对话执行，也可以在原对话里接着做。

开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-SERVICE-20261106.md`，补单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-01-20261106.md`、`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-02-20261106.md`、`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-03-20261106.md`、`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-04-20261106.md`（都仍然有效）；
2. 本补单（与前面几份或 SPEC 冲突时以本补单为准）；
3. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md`。

## 1. 获准修改的旧期望（第七类）

`tests/service_v1.rs` 的 `call()` 用一份**写死的命令名单**，名单里的命令上限是 200 ms，其余照旧。名单是在自己的调用里同步写文件的命令，总控按 `8b639ec4` 的代码列出：

| 命令 | 写什么（`8b639ec4` 的位置） |
|---|---|
| `conclusion_decide` | `settings.json`（`conclusion.rs` 第 540 行，整组决定时） |
| `cluster_mark_fixed` | `settings.json`（`m35.rs` 第 659 行） |
| `locations_set_session_cleanup`、`manifest_trust` | `settings.json`（`m35.rs` 第 795 行） |
| `locations_set_category`、`custom_root_remove` | `settings.json`（`service.rs` 第 553 行） |
| `skip_add`、`skip_remove` | `settings.json`（`service.rs` 第 771、794 行） |
| `clean_prepare` | 计划文件（`clean.rs` 第 229 行；查重来源的预览同一命令） |
| `clean_start` | 计划文件（`clean.rs` 第 352 行，起线程之前） |
| `quarantine_restore` | 隔离记录与事件（`quarantine.rs` 第 449、454 行） |

- `custom_root_add` 照补单 03 不计时。
- 其余命令照旧 50 ms，包括所有 `*_progress` 与只读命令（`app_state`、`scan_result`、`group_detail`、`conclusion_get`、`detail_get`、`group_items`、`trends`、`history_list`、`locations_get`、`quarantine_list`、`dedupe_result` 等）。
- 名单只能是上表这些命令。如果你在代码里发现还有命令在自己的调用里同步写文件、也因此超时，先写受阻回执说明（文件与行），不要自己加进名单。
- 计时方式不变；50 ms 与 200 ms 两个数写死在 `call()` 里；不加重试。
- 回执写明哪一行、原来怎样、现在怎样。

## 2. 计时失败的处理放宽

- 完整 `test` 如果**只**因为 `SERVICE_RETURN_BUDGET` 失败，可以原样重跑，同一字节累计最多 3 次。其它任何失败照旧：同一字节累计两次就停下。
- 补单 03、04 的“连续三次完整测试全绿”取消。有一次完整绿，就可以开始负控。
- 每次失败都在回执里列出命令与测试名。

## 3. 其余照做

- 产品代码这次不需要改。补单 02～04 的改动全部保留。
- 之后照原单做完：
  - 三条负控，每条恢复原字节后再绿一次；
  - 在干净的实现提交上跑 `check`、`test`、`real` 三个 final；
  - `archive`；
  - 完成回执。
- 跑测试前按进程名看一眼，没有别的 cargo、node 检查进程。
- 全部照原单、补单 01～04 与 SPEC：精确 12 个测试、三条负控、依赖、系统函数（只许新增 `SHQueryRecycleBinW`）、白名单都不变。
- 用户已确认本单由你（Grok）续做。同一工作树里不要有第二个执行者同时写。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`（分支 `worker/water-w10-m7`），从 `44f22980` 续做。已提交的内容不改写，只在其后新增提交。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W10-M7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md
```

原有各节保留，新增“补单 05”一节，按原单“交回”一节逐项写。受阻则写“WATER-W10-M7 任务受阻”，写清冲突与最小补充需求，不要自行变通。
