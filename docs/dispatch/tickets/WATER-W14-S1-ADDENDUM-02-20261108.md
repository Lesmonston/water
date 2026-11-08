# WATER-W14-S1 补单 02：第 B 段，规则阶段按根目录计数、负控与 final（中门）

2026-11-08，总控（Claude）。在原单 [WATER-W14-S1](WATER-W14-S1-SERVICE-20261108.md) 与[补单 01](WATER-W14-S1-ADDENDUM-01-20261108.md) 的基础上续做，原单的规则、边界、门照旧，本补单只写增量。可以新开对话执行。

第 A 段已交回（实现 `ce4091b0`、回执 `f91a982a`）：总控核对了改动范围、冻结文件，以及干净提交上的 `check` 与 `test`（12/12），收下。扫描单 J2 已验收合入主线：扫描包有了 `ScanObserver::on_root_done`。总控已把主线合进你的分支（合并提交 `dd7ac13a`），本段在它上面做。

| 项 | 精确值 |
|---|---|
| 权威补单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-S1-ADDENDUM-02-20261108.md |
| 原单、补单 01 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-S1-SERVICE-20261108.md、F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-S1-ADDENDUM-01-20261108.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w14-s1 / worker/water-w14-s1（原树，不新建） |
| 续做起点 | tag `water-w14-s1-b-base-20261108` = `dd7ac13a`（总控的合并提交），必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/w14-v1/W14-ADD-01.md 第 1、2 节（接口与服务怎么算）；W14 第 3.3、3.4 节其余照旧 |
| 检查入口、回执 | 同原单；回执接在“补单 01（第 A 段）”后面，加一节“补单 02（第 B 段）” |
| 门 | 中门：3 条负控 + check、test、real 三个 final，再 `archive` |

**先读**：本补单全文、W14-ADD-01 全文、`packages/junk-scan/src/scan.rs` 里的 `RootProgress` 与 `ScanObserver`、`packages/junk-scan/README.md` 里 `on_root_done` 那一段、你的 `Progress`（`src/service.rs` 第 1481 行一带）与测试替身（`tests/service_v1.rs` 第 46 行起）。

## 0. 清单的变化

- 清单里本单的 `baseCommit` 已改成 `dd7ac13a`，检查器只审计这之后的改动；第 A 段的改动在交回时已审计过。
- 白名单照原单第 5 节加补单 01 第 5 节（`examples/service_smoke.rs`）。合并带进来的扫描包、界面、文档都不要动。
- `baseline` 照旧要在 `dd7ac13a` 上、干净时跑一次。

## 1. 要做的（全部在 `packages/water-service/`）

### 1.1 接上 `on_root_done`（W14-ADD-01 第 2 节）

- `Progress` 实现 `on_root_done`。把规则阶段的过渡做法换掉：
  - `percent` = `roots_done × 阶段终点 ÷ roots_total`，向下取整；阶段终点没有整盘位置时 90，有时 40；
  - `roots_total` 为 0 或扫描提前结束（还有根目录没报）时，`scan_full` 返回就到阶段终点；
  - 只增不减照旧。
- **目标走完**：目标的根目录（`Pattern` 的 `base`，`Marker` / `Discovery` 的 `root`）不分大小写地与报来的 `root` 相同。兜底 `Marker` 跟着它兜底的那个目标。
- **位置**：目标都走完 → `done`（整盘位置进 `space`，空间统计结束才 `done`）；有目标走完了、或它的组出现在 `on_progress` 里但还没走完 → `running`；其余 `waiting`。
- **类别**：完成情况同样按目标走完算。
- `on_progress` 只更新已找到的字节、看过的条目数、`running` 的判断，不算任何“完成”。

### 1.2 测试替身

替身在发 `on_progress` 之外，按 W14-ADD-01 第 1.2 节的样子发 `on_root_done`（`roots_done` 从 1 数到 `roots_total`）。保持不靠睡眠的节奏控制。

## 2. 测试（测试个数仍是 12，新断言加在已有函数里）

| 内容 | 放在 | 标记 |
|---|---|---|
| 替身有 3 个根目录、规则位置分属两个位置：<br>- 报第 k 个根目录后 `percent` 精确等于 `k × 90 ÷ 3` 向下取整（再做一组有整盘位置的，用 40）；<br>- 第一个位置的根目录都报完后它是 `done`，另一个位置还在 `running` 或 `waiting`；<br>- 同一组重复的、强制的 `on_progress` 不推进 `percent`，也不让位置变 `done`；<br>- 提前结束（替身只报一部分就返回）时，返回后到阶段终点，随后照旧进 `space` / `finishing`；<br>- 一个兜底 `Marker` 跟着主目标走完 | `service_scan_views` | `SERVICE_W14_PROGRESS` |
| 原单第 2 节其余各条（第 A 段已做的保留） | 原处 | 原标记 |

- **获准修改的旧断言**：第 A 段为过渡做法写的规则阶段断言（例如只断言范围、不能提前到阶段终点那几条）。改成上面的精确值，回执逐条写原值 → 新值 → 为什么。

## 3. 负控（改 `src/`，照原单第 3 节，三条不变）

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 任挑一处卡片或线索，去掉它的 `title_en`（或对应的 `_en`） | `SERVICE_W14_EN` |
| nc2 | 空间统计报来的字节又计入 `found_bytes` | `SERVICE_W14_PROGRESS` |
| nc3 | 整盘位置在规则目标都走完时就标 `done`（不等空间统计） | `SERVICE_W14_PROGRESS` |

每条只改一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode baseline
```

- 之后反复用 `lock`、`check`、`test`、`real`，做完负控。
- 提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- `real` 是一次只读真实体检（清理关闭，跑 `examples/service_smoke.rs`），输出只有计数。

## 5. 交回

- 回执第一行与通知完全一致：

  ```text
  WATER-W14-S1 补单 02 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-s1/docs/dispatch/reports/WATER-W14-S1-REPORT.md
  ```

- 回执里写：第 B 段的实现提交、三个 final 与负控的回执、迁移的旧断言、`real` 的结果（只写计数，不写路径）。
- 受阻则写“WATER-W14-S1 补单 02 任务受阻”。
