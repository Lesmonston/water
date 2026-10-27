# WATER-W5-H2：服务 M2 收尾（重门）

2026-10-27，正式票，总控（Claude）。以 [第五波 manifest](../wave5/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 H1、H3～H5 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H2-SERVICE-M2-20261027.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w5-h2 / worker/water-w5-h2 |
| 精确首次 HEAD | 3f9078972d7f958fad6bfd42e68f022dd659539e，必须干净；`packages/water-service` 是 G2 验收合入后的版本 |
| SPEC | F:/new/smaltalk/water/contracts/m2-v1/SERVICE-M2.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/desktop-v1/SERVICE.md；F:/new/smaltalk/water/contracts/hardening-v1/SERVICE-HARDENING.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W5-M2-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w5-h2/docs/dispatch/reports/WATER-W5-H2-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w5-h2/docs/acceptance/wave5/h2/ |
| 门 | 重门：3 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC SERVICE-M2 全文，再读 SERVICE（第 8 节清理）与 SERVICE-HARDENING；
2. 背景：[G2 收单验收](../../acceptance/wave4/controller/WATER-W4-G2G3-REVIEW-20261026.md)的 G2 一节，以及第四波清单 G2 的 `carryOverToFinishing`；
3. 代码：`packages/water-service/src/clean.rs` 的 `start`、`src/service.rs` 扫描结束的那一段与 `valid_custom`、`src/lib.rs` 的 `WindowsPlatform`，以及 `tests/service_v1.rs`。

## 要做的（全部在 `packages/water-service/`）

SPEC 第 1～4 节逐条实现：
1. **开始清理时不能把“忙”卡住**：可能失败的准备放在设成 `cleaning` 之前，或整段受保护、失败时回到 `idle`。
2. **扫描完成时不留下“半个”完成记录**：
   - 锁里的状态更新不得 panic；
   - 写盘与更新 `last` 要么都成，要么重启后这份记录不会成为 `last_scan`；
   - 做法写进回执。
3. **进程快照锁中毒后恢复**（`PoisonError::into_inner`）。
4. **自定义文件夹**：文字形式与规范化形式都比较，任一包含已知文件夹就拒绝。

**不变**：SPEC 第 6 节列的一切，包括 IPC、存储格式、依赖、清理开关由宿主传入。

## 白名单

- `packages/water-service/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W5-H2-REPORT.md`
- `docs/acceptance/wave5/h2/` 下 `--mode archive` 生成的证据

## 测试

`packages/water-service/tests/service_v1.rs`，仍是精确 6 个测试，名字与已有断言不变。新断言照 SPEC 第 5 节加在已有测试里，失败信息带标记：
- `SERVICE_PANIC_IDLE`（已有标记，补断言）；
- `SERVICE_SCAN_RECORD`；
- `SERVICE_CUSTOM_ROOT`。

第 3 条没有不加挂点的测试办法，回执里写清代码怎么满足，**不要**为它加产品挂点。夹具只在本树 `.local` 下按规则新建与回收。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 开始清理的准备阶段失败后不再回到 `idle` | `SERVICE_PANIC_IDLE` |
| nc2 | 扫描记录写盘失败后，重启仍把它当作 `last_scan` | `SERVICE_SCAN_RECORD` |
| nc3 | 只比较规范化形式，不再比较文字形式 | `SERVICE_CUSTOM_ROOT` |

每条只改生产代码里真正被调用的一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W5-H2 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 是只读真实冒烟：清理不执行，输出不含路径或命令行。

## 预算与边界

- cargo 离线、单线程、私有 target。
- 原生窗口 0、选择框 0。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W5-H2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h2/docs/dispatch/reports/WATER-W5-H2-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～4 节逐条：改了哪里、怎么满足；
- 每个检查命令与结果，以及真实冒烟摘要；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W5-H2 任务受阻”，写清冲突与最小补充需求，不要自行变通。
