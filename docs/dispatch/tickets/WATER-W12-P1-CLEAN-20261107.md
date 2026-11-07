# WATER-W12-P1：执行器写日志失败时照样交回报告（重门）

2026-11-07，正式单，总控（Claude）。默认执行者：sol。状态以[第十二波 manifest](../wave12/manifest.json) 中本单的 `status` 为准。可以新开对话执行。

M4 的中等遗留：执行器动过一项之后日志写不进，就整次返回 `Err(Journal)`，报告丢了，服务不知道删掉或移走了什么。改成停下、照样交回报告。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W12-P1-CLEAN-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w12-p1 / worker/water-w12-p1 |
| 精确首次 HEAD | tag `water-w12-p1-base-20261107`，必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w12-v1/W12.md 第 3 节（与开头“基线里总控已落的接口”） |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W12-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w12-p1/docs/dispatch/reports/WATER-W12-P1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w12-p1/docs/acceptance/wave12/p1/ |
| 门 | 重门：3 条负控 + check、test、real 三个 final |

先读：两份规则、SPEC 第 3 节、本单全文；代码 `packages/junk-clean/src/lib.rs`（`execute`、`intent`、`journal_line`）、`src/quarantine.rs`（`quarantine`）、`src/model.rs`、`src/quarantine_model.rs`、`examples/real_smoke.rs`，测试 `tests/clean_v1.rs`。

## 1. 要做的（全部在 `packages/junk-clean/`）

1. **`execute`**：照 SPEC 第 3 节。第一条 intent 写不进时照旧 `Err(Journal)`；动过至少一项之后，intent、result 或结尾任何一行写不进：停下，这一项若还没动报 `JournalFailed`，后面的都报 `JournalFailed`，`status` 为 `Stopped`，`journal_error` 为 `Some("journal write failed")`，返回 `Ok(report)`。`freed_bytes`、`volumes` 只算真的做了的。
2. **`quarantine`**：同样的规则，`moved_bytes` 只算真的移走了的。
3. **`examples/real_smoke.rs`**：列固定盘时启动 `powershell.exe` 改用 `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`（从环境变量 `SystemRoot` 取，拿不到时用 `C:\Windows`）。
4. **不变的**：`purge`、`restore`、`inspect`、`list_quarantines`；类型定义（基线里已有 `journal_error` 与 `JournalFailed`，不要改它们的名字与序列化）。

## 2. 测试（`tests/clean_v1.rs`，11 个测试不变，新断言加在已有函数里）

| 内容 | 放在 | 标记 |
|---|---|---|
| `execute`：第一项删完后 result 行写失败 → `Ok`，第一项 `deleted`，第二项 `JournalFailed` 且文件还在，`status` Stopped，`journal_error` 有值，`freed_bytes` 只算第一项 | `clean_partial_stop_journal` | `CLEAN_W12_JOURNAL` |
| `execute`：第二项的 intent 写失败（第一项已删）→ 同上，第二项没动 | `clean_partial_stop_journal` | `CLEAN_W12_JOURNAL` |
| `quarantine`：第一项移走后日志写失败 → `Ok`，第一项 `moved`，后面的 `JournalFailed` 且原地还在，`moved_bytes` 只算第一项 | `quarantine_move_contract` | `CLEAN_W12_JOURNAL` |
| 第一条 intent 就写不进：`execute` 与 `quarantine` 都仍是 `Err(Journal)`，什么都没动 | `clean_partial_stop_journal`、`quarantine_move_contract` | `CLEAN_W12_JOURNAL_FIRST` |
| 序列化：`journal_error` 为 `None` 时报告 JSON 里没有这个键 | `clean_plan_contract` | `CLEAN_W12_JOURNAL` |

- **获准修改的旧断言**：第 793～827 行（`clean_partial_stop_journal` 里的 `ResultFailure`）：注释“A result flush failure aborts the whole run…”与 `unwrap_err()` / `Err(Journal)` → 按上表第一行改为 `Ok(report)` 的新结果；“下一项还在”这条保留。其余 `Err(CleanError::Journal)` 的断言（第 749、2461、3551 行一带）都是“第一条就写不进”，**不改**。

## 3. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `execute` 动过一项后日志失败又整次返回 `Err` | `CLEAN_W12_JOURNAL` |
| nc2 | `quarantine` 日志失败后继续移后面的项 | `CLEAN_W12_JOURNAL` |
| nc3 | 第一条 intent 写不进时不再返回 `Err`，照样去删 | `CLEAN_W12_JOURNAL_FIRST` |

只改 `packages/junk-clean/src/` 的生产代码一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W12-P1 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

## 5. 预算与边界

- 白名单：`packages/junk-clean/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）；`docs/dispatch/reports/WATER-W12-P1-REPORT.md`；`docs/acceptance/wave12/p1/` 下 `--mode archive` 生成的证据。
- 公开函数签名不变；系统函数照旧，不新增。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W12-P1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w12-p1/docs/dispatch/reports/WATER-W12-P1-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W12-P1 任务受阻”。
