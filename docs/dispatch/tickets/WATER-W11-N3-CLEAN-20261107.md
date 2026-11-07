# WATER-W11-N3：执行器隔离区改名与兼容、拒绝互相包含、补测试（重门）

2026-11-07，正式单，总控（Claude）。默认执行者：sol。状态以[第十一波 manifest](../wave11/manifest.json) 中本单的 `status` 为准；READY 不代表已外贴。可以新开对话执行。

用户 11-07 把软件改名 Flick，隔离区改为 `.flick-quarantine`，旧的 `.water-quarantine` 照旧能用；同时“按计划出单”收掉执行器的两条遗留。服务单 N8 要等本单合入后才开工（它要把新隔离区交给执行器）。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W11-N3-CLEAN-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w11-n3 / worker/water-w11-n3 |
| 精确首次 HEAD | ccc584b3（tag `water-w11-n3-base-20261107`），必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w11-v1/RENAME-FLICK.md（第 2、3.1 节）与 F:/new/smaltalk/water/contracts/m35-v1/CLEAN-M35.md，加上本单第 1 节 |
| 仍然有效、要读的 | M10 原单 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M10-CLEAN-FIX-20261106.md；F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md；F:/new/smaltalk/water/contracts/hardening-v1/CLEAN-HARDENING.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W11-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w11-n3/docs/dispatch/reports/WATER-W11-N3-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w11-n3/docs/acceptance/wave11/n3/ |
| 门 | 重门：3 条负控 + check、test、real 三个 final |

先读：两份规则、SPEC、M10 原单、本单全文；代码 `packages/junk-clean/src/` 全部、`examples/real_smoke.rs`、`tests/clean_v1.rs`。下面的行号都指 `ccc584b3`。

## 1. 要做的（全部在 `packages/junk-clean/`）

### 1.1 隔离区改名与兼容（SPEC 第 3.1 节）

1. 没有给 `QuarantineTarget.base` 时，新移入的根是 `<条目所在卷>\.flick-quarantine`（`quarantine.rs` 第 109～111 行）。
2. 根的校验（`quarantine.rs` 第 17～27 行 `validate_root`，以及经由它的 `validate_dir`）：最后一段是 `.flick-quarantine` 或 `.water-quarantine` 都认，不区分 ASCII 大小写。移入、复原、永久删除、查看、列出都照常对两个名字工作。
3. 挡住（第 112～116 行）：条目路径任何一段是两个名字之一，都 `Guarded`。
4. 搜一遍 `src/` 里别的只认旧名字的地方（例如原生模块、日志、注释以外的字符串），一并按上面处理；回执列出都改了哪里。
5. `examples/real_smoke.rs`：各固定盘两个名字都查，输出每个名字的状态与编号目录个数。仍然只读。
6. `README.md` 第 15 行一带的说明写上新名字与兼容。

### 1.2 计划里一项包住另一项时拒绝（M4 遗留第 5 条）

- 现状：同一个计划里，两项路径相同，或一项包住另一项（按路径段，不区分大小写），照样执行。
- 要求：`execute` 与 `quarantine` 两个入口都在**动任何东西、写任何日志之前**返回 `InvalidPlan`。只比同一计划里各项的 `path`；路径相同也算。别的计划校验不变。
- 服务只会给出互不包含的条目（扫描保证），所以正常流程不受影响；回执写明你怎么确认这一点（例如读 `packages/junk-scan` 的重叠处理，只读）。

### 1.3 补测试（M10 遗留第 1～3 条）

M10 验收时总控变异 c12、c13、c4、c5、c7 没被抓住，因为下面几处只测了抽出来的小函数，或根本没走到：

| 位置（`ccc584b3`） | 要抓住的 | 对应变异 |
|---|---|---|
| `native_windows.rs` 约第 893 行，改名前那一刻的身份复核 | 预检之后、改名之前条目被换掉：不移入，按 CLEAN-M35 记录 | c12 |
| `quarantine.rs` 约第 119 行，第二个隔离根 | 同一次移入里第二项要进另一个根：`NotSameVolume` | c13 |
| `native_windows.rs` 约第 856 行，源链 `Missing` | 打开前条目不见了：跳过，原因 `Gone` | c4 |
| `native_windows.rs` 约第 919 行，打开或改名返回 2、3 | 同上：跳过，原因 `Gone` | c5 |
| 空骨架清理里的身份核对 | 只删本次新建、而且身份没变的空目录 | c7 |

- 测试要走 `quarantine()` 这个产品入口，打到上面的产品调用处（通用规则第 6 节）。可以利用产品已有的回调时机（例如在用检查的守卫被调用时改动夹具）；**不许**为测试在产品代码里加开关或入口。
- 第二个隔离根：不给 `base` 时根在盘根，而测试**不得**在任何盘根建隔离区，也不许用 `subst` 之类改系统盘符。如果在这些限制下走不到，照通用规则第 6 节在回执里写明原因，不要写成“已覆盖”。别的几处同理。

## 2. 测试

- `packages/junk-clean/tests/clean_v1.rs`，精确 11 个测试，与 M10 相同：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`、`clean_handle_hardening`、`quarantine_unlock_pair`、`quarantine_move_contract`、`quarantine_restore_contract`、`quarantine_purge_contract`、`quarantine_inspect_and_list`。
- **新断言**：

  | 改动 | 放进的测试 | 标记 |
  |---|---|---|
  | 1.1 以 `.flick-quarantine` 为根（`base` 指到本树 `.local/` 下）能移入、复原、永久删除、查看、列出；大小写混写也认；路径里带 `.flick-quarantine` 的条目 `Guarded`；别的名字的根仍 `InvalidPlan` | `quarantine_move_contract`、`quarantine_restore_contract`、`quarantine_purge_contract`、`quarantine_inspect_and_list` 各放一部分 | `CLEAN_W11_RENAME` |
  | 1.2 相同路径、父子路径（含大小写不同）两种计划，`execute` 与 `quarantine` 都 `InvalidPlan`，而且夹具字节不变、没有日志、没有建隔离区目录 | `clean_plan_contract`、`quarantine_move_contract` | `CLEAN_W11_NESTED` |
  | 1.3 各条 | 对应的移入测试 | `CLEAN_M35_MOVE` |

  新断言的失败信息要写上标记。
- **旧断言**：旧测试显式用 `.water-quarantine` 当根，兼容后仍然成立，预计**没有**必须改的。真有因本单必然要变的，照通用规则第 3 节第 1 条迁移，回执逐条写。
- 夹具照通用规则第 5 节：只在本树 `.local/` 下，用完只删本次新建的那一个目录。M4 原有的跨盘一项（`%TEMP%\water-w10-q-<进程号>`）照旧。

## 3. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `validate_root` 又只认 `.water-quarantine` | `CLEAN_W11_RENAME` |
| nc2 | 条目路径里有 `.flick-quarantine` 时不再 `Guarded` | `CLEAN_W11_RENAME` |
| nc3 | 去掉 1.2 的拒绝 | `CLEAN_W11_NESTED` |

只改 `packages/junk-clean/src/` 的生产代码一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N3 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只读：各固定盘两个名字的状态与编号目录个数。**不移入、不复原、不删除任何真实文件。**

## 5. 预算与边界

- 白名单：`packages/junk-clean/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）；`docs/dispatch/reports/WATER-W11-N3-REPORT.md`；`docs/acceptance/wave11/n3/` 下 `--mode archive` 生成的证据。
- 公开接口不变：不改函数签名、类型与字段，不给枚举加成员。`src/` 里没有 `std::fs`；系统函数只用原来那些。测试里不加墙钟时限断言。
- 原生窗口 0、选择框 0、浏览器 0。cargo 离线、单线程、私有 target。跑 cargo 前按进程名看一眼。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W11-N3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n3/docs/dispatch/reports/WATER-W11-N3-REPORT.md
```

回执照通用规则第 7 节第 4 条写，另外写：1.1 第 4 条搜到的地方；1.2 怎么确认服务不受影响；1.3 每一处是走到了还是走不到、为什么。受阻则写“WATER-W11-N3 任务受阻”。
