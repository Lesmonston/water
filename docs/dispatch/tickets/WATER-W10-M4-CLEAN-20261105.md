# WATER-W10-M4：执行器：解锁对与隔离区（重门）

2026-11-05，正式单，总控（Claude）。以[第十波 manifest](../wave10/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与第一批另外七张单同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M4-CLEAN-20261105.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w10-m4 / worker/water-w10-m4 |
| 精确首次 HEAD | f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/CLEAN-M35.md（本单的全部要求） |
| 仍然有效、要读的 | F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md；F:/new/smaltalk/water/contracts/hardening-v1/CLEAN-HARDENING.md；F:/new/smaltalk/water/docs/decisions/ADR-019-project-declarations-and-quarantine.md；解锁对的来由见 RULES-M35 第 4.1 节（只读）：F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w10-m4/docs/dispatch/reports/WATER-W10-M4-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w10-m4/docs/acceptance/wave10/m4/ |
| 门 | 重门：3 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC 全文，再读上表“仍然有效”的契约；[第十波计划](../wave10/PLAN.md)第 2 节第 39、40、42～45、47、64、65 行（来由）；
2. 代码：`packages/junk-clean/src/lib.rs`、`packages/junk-clean/src/model.rs`、`packages/junk-clean/src/native_windows.rs`、`packages/junk-clean/src/path.rs`、`packages/junk-clean/tests/clean_v1.rs`。

## 要做的（全部在 `packages/junk-clean/`）

1. SPEC 第 2 节：`unlocked_paths`；
2. 第 3 节：`quarantine`（同盘改名、从不跨盘复制）；
3. 第 4 节：`restore`（从不覆盖、可还原到旁边）；
4. 第 5 节：`purge`（链接只删链接本身、逐个报遗留）；
5. 第 6 节：`list_quarantines`、`inspect` 与序列化；
6. 新建 `examples/real_smoke.rs`（在 `Cargo.toml` 登记）；

**不变**：`execute` 除解锁对外行为不变；不给已有枚举加成员；`src/` 里没有 `std::fs`；系统函数只按 SPEC 第 1 节。

## 白名单

- `packages/junk-clean/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W10-M4-REPORT.md`
- `docs/acceptance/wave10/m4/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-clean/tests/clean_v1.rs`，精确 11 个测试：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`、`clean_handle_hardening`、`quarantine_unlock_pair`、`quarantine_move_contract`、`quarantine_restore_contract`、`quarantine_purge_contract`、`quarantine_inspect_and_list`。
- 新断言照 SPEC 的测试一节放进指定的测试，失败信息带 `CLEAN_M35_UNLOCK`、`CLEAN_M35_MOVE`、`CLEAN_M35_RESTORE`、`CLEAN_M35_PURGE`、`CLEAN_M35_INSPECT`。
- 夹具照规则第 3 节：只在本树 `.local/` 下，用完只删本次新建的那一个目录。
- 没有获准修改的旧断言。

## 负控

| 负控 | 让什么失效（SPEC 给的例子，可选更窄的一处） | 标记 |
|---|---|---|
| nc1 | `rename_at` 的 `ReplaceIfExists` 改为 1 | `CLEAN_M35_RESTORE` |
| nc2 | `purge` 打开子项时去掉不跟随重解析点 | `CLEAN_M35_PURGE` |
| nc3 | `from_json` 忽略 `unlocked_paths` | `CLEAN_M35_UNLOCK` |

只改 `packages/junk-clean/` 的生产代码一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。要找只有新断言才抓得到的位置。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只读：各固定盘 `<盘>:\.water-quarantine` 的状态与编号目录个数；**不移入、不复原、不删除任何真实文件**。

## 预算与边界

- 系统函数：在原有 8 个上新增 `NtCreateFile`（只在 `create_dir_at` 里、只许 `FILE_CREATE`）；`SetFileInformationByHandle` 只许类 3、4、21。
- 原生窗口 0、选择框 0、浏览器 0。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：不 push 到任何远端，不添加或修改 git 远端与配置；不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W10-M4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m4/docs/dispatch/reports/WATER-W10-M4-REPORT.md
```

回执要写：实际模型、实现提交 SHA；SPEC 逐节：改了哪里、怎么满足；改过的旧断言（原值与新值）；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；真实冒烟或整机检查的结果；没做或没验证的事。
