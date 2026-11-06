# WATER-W10-M7 补单 04：后台线程不在状态锁里读写磁盘（中门）

2026-11-06，总控（Claude）。你的受阻回执（`9aba0889`）成立，停下是对的。补单 03 的两项都做到了：
- `call()` 只对 `custom_root_add` 不计时；
- 一万项分组首次 `group_detail` 量到 4～5 ms。

完整测试仍不稳，这次失败的是 `dedupe_progress` 与 `skip_remove`。总控看了代码，原因在产品，需要再改一处。可以新开对话执行，也可以在原对话里接着做。

开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-SERVICE-20261106.md`，补单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-01-20261106.md`、`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-02-20261106.md`、`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-ADDENDUM-03-20261106.md`（都仍然有效）；
2. 本补单（与前面几份或 SPEC 冲突时以本补单为准）；
3. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md`。

下面的行号都指 `7a151dfb`。

## 0. 总控的核对

- `dedupe_progress` 只是拿锁复制一份进度。它超过 50 ms，只能是在等锁：有别的线程持锁做了慢事。
- 后台线程在持有状态锁时读写磁盘，有这几处：
  - **查重结束**（`dedupe.rs` 第 163～201 行）：锁里调 `m35::event`，它会写事件文件（`m35.rs` 第 821 行起，签名就要求传入正持有的 `&mut State`）；锁里还调 `trim`，它会删旧的查重文件（`dedupe.rs` 第 44～58 行）。
  - **永久删除结束**（`quarantine.rs` 第 513～521 行）：锁里写或删隔离区记录（`store.write`／`store.remove`），再调 `m35::event` 写事件文件。
  - **清理结束**（`clean.rs` 第 420 行）与**扫描结束**（`service.rs` 第 1087 行）：锁里调 `service::trim`，超过 60 条时会删扫描和快照文件。
- 扫描线程的收尾第一轮已经改成先在内存发布、再在锁外写盘（`service.rs` 第 1062～1063 行的注释）。其余几处要照这个做法。
- Windows 上一次落盘偶尔要几十毫秒（杀毒软件扫描、刷盘）。这时 UI 来轮询进度或调任何命令都要等，于是每次失败的命令都不一样：`scan_progress`、`dedupe_progress`、`skip_remove`、`cluster_mark_fixed`。
- 这正是 50 ms 要防的情况：真实使用中，一次落盘就会让界面卡一下。

## 1. 要做的

1. **后台线程（扫描、清理、查重、永久删除）收尾时，所有磁盘读写都在锁外做。** 包括写记录、写事件、删旧文件、核对隔离区。锁里只做内存里的换入和取出，例如“锁里算出要删哪些编号 → 放锁 → 删文件”。
2. **`m35::event` 拆开。** 在锁外生成并写入事件文件，再短暂拿锁把它放进 `s.m35.events`。命令处理里的调用（如 `quarantine.rs` 第 453 行）也一样，能放到锁外的都放出去。
3. **命令自己必须落盘的设置**（`skip_add`、`skip_remove`、`cluster_mark_fixed`、`manifest_trust`、会话开关等写 `settings.json`）**可以保留在命令里。** 但不要在这同一把锁里再做别的磁盘读写。持锁期间算好新设置，写盘的顺序与失败回滚照原有语义：写失败时内存不能已经变了。
4. **顺序与一致性不变。** 别的命令在后台线程“已发布、还没写盘”这段窗口里看到的状态，与 SPEC 一致（扫描线程已有做法可参照）；写盘失败时的回滚、报错与原来一致。
5. 不改测试文件；不改任何时限、夹具规模、计时方式；不改契约、样例、检查器、台账与其它包。

## 2. 量一下持锁时间（只在本地，不提交）

- 在本地临时给状态锁加计时：记下每次持锁的时长与所在函数。跑一遍完整测试，回执列出改动前、改动后持锁最长的 5 处与时长。
- 改完后，后台线程的每一次持锁都要不超过 10 ms。
- 计时代码用完删掉，测试文件和产品里都不留。

## 3. 验证

- 跑测试前按进程名看一眼，没有别的 cargo、node 检查进程（只看进程名，不看命令行），回执写一句。
- 连续三次完整 `test`（同一字节）都要绿，再做负控。中途某次失败可以原样重跑一次；同一字节累计两次失败就停下，写受阻回执，附上失败的命令、测试名，以及第 2 节量到的持锁数据。总控据此再定计时的办法。
- 之后照原单做完：
  - 三条负控，每条恢复原字节后再绿一次；
  - 在干净的实现提交上跑 `check`、`test`、`real` 三个 final；
  - `archive`；
  - 完成回执。

## 其余

- 全部照原单、补单 01～03 与 SPEC：精确 12 个测试、三条负控、依赖、系统函数（只许新增 `SHQueryRecycleBinW`）、白名单都不变。
- 用户已确认本单由你（Grok）续做。同一工作树里不要有第二个执行者同时写。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`（分支 `worker/water-w10-m7`），从 `9aba0889` 续做。已提交的内容不改写，只在其后新增提交。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W10-M7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md
```

原有各节保留，新增“补单 04”一节，按原单“交回”一节逐项写。受阻则写“WATER-W10-M7 任务受阻”，写清冲突与最小补充需求，不要自行变通。
