# WATER-W12-P2：服务的整组、整行跳过，诊断信息与几处收尾（中门）

2026-11-07，正式单，总控（Claude）。默认执行者：sol。状态以[第十二波 manifest](../wave12/manifest.json) 中本单的 `status` 为准。可以新开对话执行。

用户 11-07 定了到开源发布的整体计划。第十二波把“以后都跳过”做到整张卡和抽屉的整行，修首页重复计嵌套条目等几处收尾，并给“关于”页的诊断信息出数。执行器“日志失败照样交回报告”的新字段总控已写进基线，本单不必等 P1。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W12-P2-SERVICE-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w12-p2 / worker/water-w12-p2 |
| 精确首次 HEAD | tag `water-w12-p2-base-20261107`，必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w12-v1/W12.md 第 1、2.2、4 节，加上开头“基线里总控已落的接口” |
| 仍然有效、要读的 | IPC-M35、SERVICE-M35（第 5、6、10 节）、IPC-M3C 与 SERVICE-M3C 第 5 节、SERVICE-M3C-ADD-01；第十一波 N8 工单第 1.5、1.8、1.9 节（`docs/dispatch/tickets/WATER-W11-N8-SERVICE-20261107.md`） |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W12-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w12-p2/docs/dispatch/reports/WATER-W12-P2-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w12-p2/docs/acceptance/wave12/p2/ |
| 门 | 中门：3 条负控 + check、test、real 三个 final |

先读：两份规则、SPEC、本单全文；代码 `packages/water-service/src/` 全部与 `tests/service_v1.rs`。重点：`service.rs` 的 `add_skip`、`remove_skip`、命令表（第 452、1139 行一带）与 `locations`；`conclusion.rs` 的 `view`、`card`、抽屉行（`Row`、`row_id`）、`clusters`、`recent_count`；`clean.rs` 的 `retain_outermost`、`clean_start` 里执行器与隔离那段（第 470～500 行一带）、组说明的计数（第 674 行一带）；`quarantine.rs` 的 `refresh_with`；设置的读写与版本迁移。

## 1. 要做的（全部在 `packages/water-service/`）

1. **整组、整行跳过**（SPEC 第 1.1～1.5 节）：
   - 新命令 `skip_unit_add {conclusionVersion, unitId}`，加进命令表与参数键表；
   - 四种 `kind` 的设置条目、设置 v4 与旧版本迁移、`title_zh`；
   - 体检结束时按第 1.3 节认；添加后立刻作用于最新体检；
   - 卡片 `menu` 的 `skip` 与抽屉行的新键 `skip`（第 1.4 节）；
   - `Locations.skipped` 的新形状（第 1.5 节）；
   - 成员全被跳过的泄漏簇不出卡片、不出线索。
2. **`diagnostics_get {}`**（SPEC 第 2.2 节）：加进命令表；只出计数、状态与码，不含路径、名字与 ID。
3. **首页去嵌套**（第 4.1 节）：`view` 用与 `clean_prepare` 相同的“只留最外层”。可以把 `clean.rs` 的 `retain_outermost` 抽成两边共用的函数。
4. **抽屉与计划一致**（第 4.2 节）。
5. **趋势 `new`**（第 4.3 节）：与首页卡片共用 `recent_count` / `recent_text`。
6. **清理记录**（第 4.4 节）：
   - 报告带 `journal_error` 时照存，`CleanResultView.journal_note_zh`；
   - `JournalFailed` 在组说明里单独一条（替换基线里并进“因停止未处理”的临时做法）；
   - 直接删除完成后隔离批次出错：照存记录，出错批次的组为 `failed`，说明“没能放进隔离区：<原因>”。
7. **刷新顺序**（第 4.5 节）。

## 2. 测试（`tests/service_v1.rs`，12 个测试不变，新断言加在已有函数里）

| 内容 | 建议放在 | 标记 |
|---|---|---|
| 四种跳过的添加、立刻生效、重扫后认新成员（加一个同组新条目再扫）、64 条原子、重复不记、`stale`、`busy`、卡片 `menu` 与行 `skip` 的取值、`unfinished` 卡没有 `skip`、`Locations` 新形状、设置 v1～v3 读入与写回 v4、`skip_remove` 对四种都有效 | `m35_conclusion_cards`、`m35_rows_and_detail`、`service_hardening` | `SERVICE_W12_SKIP` |
| 嵌套两组都选：首页 `plan` 的体量、两块、项数、按盘统计都与 `clean_prepare` 的确认框一致 | `m35_clean_split` | `SERVICE_W12_NESTED` |
| 没比较过的簇为 `new`，`rate_zh` 与首页卡片同一说法；有更早体检时照旧 | `m35_cluster_and_forecast` | `SERVICE_W12_TRENDS` |
| 隔离批次出错：记录照存、组 `failed` 与说明、`clean_result` 可读；报告带 `journal_error`：记录照存、`journal_note_zh` 与组说明 | `m35_clean_split` | `SERVICE_W12_RECORD` |
| 诊断信息的形状与计数；整段 JSON 不含夹具根路径、`\`、组 ID 与条目 ID | `service_hardening` | `SERVICE_W12_DIAG` |

- 让执行器返回带 `journal_error` 的报告、或让隔离批次出错时，用测试里现有的办法（假平台、夹具、`fail_journal` 一类开关，或在隔离目的地放一个同名文件），**不改执行器**。
- **获准修改的旧断言**（按基线行号）：
  1. 第 7318 行 `"water.settings.v3"` → `"water.settings.v4"`（`SERVICE_M35_TRENDS: settings migration`）；同函数里迁移循环如需多测 v3 一档，可以加。
  2. 第 5440～5446 行（`SERVICE_M35_CONCLUSION: frozen menus`，“每张卡的 `menu` 都有 `skip`”）：改为按 SPEC 第 1.4 节逐张判断；夹具里没有 `unfinished` 卡时结果不变。
  3. 其余 `SERVICE_M3C_SKIP`（单条跳过）的断言**不改**：`skip_add` 的规则、64 条上限、`display_path`、`s-000001` 序号都不变。

## 3. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `group` 跳过只认添加时已有的条目，重扫后新成员又可清 | `SERVICE_W12_SKIP` |
| nc2 | 首页 `plan` 又把嵌套的里层算进去 | `SERVICE_W12_NESTED` |
| nc3 | 隔离批次出错时又整次返回错误、不存记录 | `SERVICE_W12_RECORD` |

只改 `packages/water-service/src/` 的生产代码一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P2 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 是一次只读真实体检，清理关闭。

## 5. 预算与边界

- 白名单：`packages/water-service/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）；`docs/dispatch/reports/WATER-W12-P2-REPORT.md`；`docs/acceptance/wave12/p2/` 下 `--mode archive` 生成的证据。
- 已有 IPC 命令名、字段名与错误码不变；只新增 SPEC 列出的。系统函数照旧，不新增。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。服务测试带计时断言，跑测试时机器上不跑别的重活。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包（包括执行器）。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W12-P2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w12-p2/docs/dispatch/reports/WATER-W12-P2-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W12-P2 任务受阻”。
