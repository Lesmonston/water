# WATER-W7-J3：服务补遗（轻门，final 含只读真实体检）

2026-10-28，正式票，总控（Claude）。以 [第七波 manifest](../wave7/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 J1、J2、J4 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W7-J3-SERVICE-FIX-20261028.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w7-j3 / worker/water-w7-j3 |
| 精确首次 HEAD | 282876950df40a14b7abeec6ab27677ea0adc897，必须干净；`packages/water-service` 是第五波 H2 合入后的版本 |
| SPEC | F:/new/smaltalk/water/contracts/m3-v1/SERVICE-M3-FIX.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/m2-v1/SERVICE-M2.md；F:/new/smaltalk/water/contracts/desktop-v1/SERVICE.md；F:/new/smaltalk/water/contracts/hardening-v1/SERVICE-HARDENING.md；F:/new/smaltalk/water/contracts/checkup-v1/ui-fixtures.json |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W7-M3-FIX-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w7-j3/docs/dispatch/reports/WATER-W7-J3-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w7-j3/docs/acceptance/wave7/j3/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC SERVICE-M3-FIX 全文，再读 SERVICE-M2、SERVICE 第 215 行附近（清理进度）、`ui-fixtures.json` 里清理进度的 `group_index`；
2. 代码：`packages/water-service/src/clean.rs`（清理开始时写 `clean_progress`、`Observer::on_item`、结束时的 `group_index`）、`src/service.rs`（体检结束时先写 `snapshots` 再写 `scans`、写失败的回滚）、`src/storage.rs` 的 `remove`；
3. `tests/service_v1.rs`：`service_clean_flow` 的清理进度、`SERVICE_SCAN_RECORD` 那段“在 `scans` 下用同名目录挡住写入”的做法。

## 要做的（全部在 `packages/water-service/`）

SPEC 第 1、2 节：
1. **清理进度的 `group_index` 从 1 数**：开始时（有组）为 1；处理某项时为该项所在组的位置加 1；结束时等于组数；空闲为 0。
2. **扫描记录写失败时删掉刚写的快照**：只删同一次的 `snapshots/<scan_id>.json`，经存储层现有的删除；删除失败不报错。

**不变**：SPEC 第 4 节：IPC 字段与形状、`ui-fixtures.json`、写盘顺序、依赖；不改别的包。

## 白名单

- `packages/water-service/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W7-J3-REPORT.md`
- `docs/acceptance/wave7/j3/` 下 `--mode archive` 生成的证据

## 测试

`packages/water-service/tests/service_v1.rs`，仍是精确 6 个测试，名字不变：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`、`service_hardening`。新断言照 SPEC 第 3 节加在已有测试里，失败信息带 `SERVICE_GROUP_INDEX`、`SERVICE_SNAPSHOT_ORPHAN`。旧断言只能改 SPEC 第 3 节获准的那一类。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 处理某项时 `group_index` 不加 1，或开始时仍写 0 | `SERVICE_GROUP_INDEX` |
| nc2 | 扫描记录写失败后不删快照 | `SERVICE_SNAPSHOT_ORPHAN` |

只改 `packages/water-service/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W7-J3 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 是服务对本机的一次只读体检：读文件名、大小、时间与进程列表，不读文件内容，不清理（这个模式下清理是关的），输出只有分类汇总、不含路径，约 2 分钟。

## 预算与边界

- 原生窗口 0、选择框 0。
- cargo 离线、单线程、私有 target，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W7-J3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w7-j3/docs/dispatch/reports/WATER-W7-J3-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1、2 节逐条：改了哪里、怎么满足；
- 改过的旧断言（如有）：原值与新值；
- 每个检查命令与结果，`real` 的分类汇总；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W7-J3 任务受阻”，写清冲突与最小补充需求，不要自行变通。
