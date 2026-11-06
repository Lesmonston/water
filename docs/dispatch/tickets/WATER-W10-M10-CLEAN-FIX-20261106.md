# WATER-W10-M10：执行器补修，永久删除的遗留与隔离编号（重门）

2026-11-06，正式单，总控（Claude）。状态以[第十波 manifest](../wave10/manifest.json) 中本单的 `status` 为准；HOLD 表示还没派，READY 也不代表已外贴。可以新开对话执行。

本单修 M4 验收时记下的遗留（清单 `WATER-W10-M4` 的 `carryOverLater` 第 1、2、3、5、6 条），用户同意在 M3.5 发布前做。服务单 M7 合入后才派：两张单都要跑 cargo，同时跑会拖垮机器。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M10-CLEAN-FIX-20261106.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w10-m10 / worker/water-w10-m10 |
| 精确首次 HEAD | 51d85191（tag `water-w10-m10-base-20261106`），必须干净；派单时总控在 manifest 里写明完整 SHA |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/CLEAN-M35.md，加上本单第 1 节的补充 |
| 仍然有效、要读的 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M4-CLEAN-20261105.md 与补单 01、02（同目录）；F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md；F:/new/smaltalk/water/contracts/hardening-v1/CLEAN-HARDENING.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w10-m10/docs/dispatch/reports/WATER-W10-M10-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w10-m10/docs/acceptance/wave10/m10/ |
| 门 | 重门：3 条负控 + check、test、real 三个 final |

先读：
1. 规则、SPEC 全文、M4 原单与两张补单。
2. 代码：`packages/junk-clean/src/` 下全部文件，以及 `packages/junk-clean/tests/clean_v1.rs`。

下面的行号都指 `51d85191`。

## 1. 要做的（全部在 `packages/junk-clean/`）

1. **永久删除时子文件夹被占用，只留下那一个空文件夹。**
   - 现状：根目录在带 DELETE 打不开时，会改用不带 DELETE 打开，删掉里面的东西（`native_windows.rs` 第 1351～1363 行）；子文件夹没有这条退路（第 1473～1479 行），打不开就整块留下。例如有个终端停在里面，整块都删不掉。
   - 要求：照 SPEC 第 5、7 节，子文件夹也要能这样处理：先删掉里面能删的，最后只把那个被占用的空文件夹记为 `in_use` 遗留。
2. **编号目录被别的进程独占时，报根级 `in_use` 遗留，不报 `InvalidPlan`。**
   - 现状：编号目录被别的进程以共享方式 0 打开，或以 DELETE 权限打开时，第 1346 行 `open_chain` 失败，一律报 `InvalidPlan`。M4 补单 02 要的是记为根级 `in_use` 遗留，现在只有“共享读写”这一种情况测到了。
   - 要求：这几种占用都按 M4 补单 02 处理。真正的非法路径与重解析点仍报 `InvalidPlan`。
3. **隔离编号不许是 Windows 设备名（本单对 SPEC 第 3 节第 46 行的补充）。**
   - 现状：`valid_id`（`quarantine.rs` 第 10～14 行）放过了 `nul`、`con`、`com1` 这类名字。移入能建出这种目录，但复原、永久删除、查看都会被 `path::validate` 拒绝，数据就卡在里面。
   - 要求：`quarantine_id` 在原有规则之外，不能是设备名（不区分大小写）：`CON`、`PRN`、`AUX`、`NUL`、`COM1`～`COM9`、`LPT1`～`LPT9`，也不能是这些名字后接 `.` 再接任何内容。违反时 `InvalidPlan`，而且必须在建任何目录之前拒绝。服务用的 `YYYYMMDD-HHMMSS` 编号不受影响。
4. **几处小错（清单第 5 条）：**
   - 永久删除结束时的最后一次核对，不能把一次部分完成的删除变成 `Err`，也不能漏写结束日志行；照常返回报告，遗留照实列出。
   - 预检之后、打开之前条目已经不见了：记为跳过、原因 `Gone`，不记为失败。
   - 移入时条目全被跳过或全失败，就不要留下只有空骨架的编号目录（否则查看时会列成一个空的隔离批次）。只删本次新建、而且确实为空的目录，其它照 SPEC 第 3 节。
   - 改掉过时的“八个函数”注释，补上缺的 `SAFETY` 注释。
5. **补测试（清单第 6 条）**，各用新断言抓住：
   - NT 冲突码 183 的映射（总控变异 c1 当时没被抓住）；
   - 不包含条目的解锁路径（c4 当时没被抓住）；
   - 不是解锁对的受保护上级；
   - 改名前那一刻的身份复核；
   - 条目包住隔离根、第二个隔离根、目录被锁住时移入；
   - 永久删除被占用的子文件夹里有东西（对应第 1 条）；
   - 根目录被以共享方式 0 占用（对应第 2 条）；
   - 硬链接时 `freed_bytes` 的算法。

**不变**：
- 公开接口不变：不改函数签名、类型与字段，不给已有枚举加成员。服务单 M7 照现在的接口编译，本单不能影响它。
- 写日志失败时整份报告丢失（清单第 4 条）这次不改。要改得动返回类型，留到以后；M7 在服务端已经兜底：写日志失败按失败报，并从磁盘重新核对隔离区。
- 计划里“一项包住另一项”这次也不拒绝，留到以后。
- `src/` 里没有 `std::fs`；系统函数只用原来那 10 个。
- 测试里不加墙钟时限断言。

## 2. 白名单

- `packages/junk-clean/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）
- `docs/dispatch/reports/WATER-W10-M10-REPORT.md`
- `docs/acceptance/wave10/m10/` 下 `--mode archive` 生成的证据

## 3. 测试

- `packages/junk-clean/tests/clean_v1.rs`，精确 11 个测试，与 M4 相同：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`、`clean_handle_hardening`、`quarantine_unlock_pair`、`quarantine_move_contract`、`quarantine_restore_contract`、`quarantine_purge_contract`、`quarantine_inspect_and_list`。
- 新断言放进对应的测试，失败信息带 `CLEAN_M35_UNLOCK`、`CLEAN_M35_MOVE`、`CLEAN_M35_RESTORE`、`CLEAN_M35_PURGE`、`CLEAN_M35_INSPECT`。
- 夹具照规则第 3 节：只在本树 `.local/` 下，用完只删本次新建的那一个目录。占用文件或文件夹，用测试进程自己打开的句柄来做。
- 没有获准修改的旧断言。如果第 1～4 条的改动必然要改某条旧断言，先写受阻回执，不要自己改。

## 4. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 永久删除时子文件夹带 DELETE 打不开，就不再退回不带 DELETE 打开（第 1 条） | `CLEAN_M35_PURGE` |
| nc2 | 编号目录被占用时又报 `InvalidPlan`（第 2 条） | `CLEAN_M35_PURGE` |
| nc3 | `valid_id` 又放过设备名（第 3 条） | `CLEAN_M35_MOVE` |

只改 `packages/junk-clean/` 的生产代码一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 5. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M10 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只读：各固定盘 `<盘>:\.water-quarantine` 的状态与编号目录个数。**不移入、不复原、不删除任何真实文件。**

## 6. 预算与边界

- 系统函数照 M4，不新增。
- 原生窗口 0、选择框 0、浏览器 0。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。
- 跑测试前按进程名看一眼，没有别的 cargo、node 检查进程。只因偶发超时失败的，可以原样重跑；其它失败连续两次就停下写受阻回执。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：不 push 到任何远端，不添加或修改 git 远端与配置；不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；提交信息写错就在回执里说明，不要改写。

## 7. 交回

回执第一行与通知完全一致：

```text
WATER-W10-M10 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m10/docs/dispatch/reports/WATER-W10-M10-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- 第 1 节逐条：改了哪里、怎么满足；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 真实冒烟的结果；
- 没做或没验证的事。

受阻则写“WATER-W10-M10 任务受阻”，写清冲突与最小补充需求，不要自行变通。
