# WATER-W3-F1：服务核心（`water-service`）

2026-10-26，正式票，总控（Claude）。以 [第三波 manifest](../wave3/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**本票驱动删除，按重门验收（3 条负控）。可以在新对话里执行。**

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F1-WATER-SERVICE-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w3-f1 / worker/water-w3-f1 |
| 精确首次 HEAD | 197dfdaecc94dc8b84e94aa8d91ee5cb1c0d965e（标签 water-w3-desktop-base-20261026），必须干净、`packages/water-service` 不存在 |
| SPEC | F:/new/smaltalk/water/contracts/desktop-v1/SERVICE.md |
| 依据 | F:/new/smaltalk/water/contracts/checkup-v1/IPC.md、MODEL.md、ui-fixtures.json；已验收的 `packages/junk-rules`、`junk-scan`、`process-scan`、`junk-clean`（只读） |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W3-DESKTOP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w3-f1/docs/dispatch/reports/WATER-W3-F1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w3-f1/docs/acceptance/wave3/f1/ |
| 门 | 重门：3 条负控 + 真实只读冒烟 |

先读规则、[第三波计划](../wave3/PLAN.md)、SPEC、IPC、MODEL 与回放数据，再读四个已验收 crate 的公开 API（各自的 `src/lib.rs` 与 SPEC：`contracts/checkup-v1/RULES.md`、`SCAN.md`、`PROCESS.md`、`CLEAN.md`）。

## 本票要点

- 新建独立 crate `packages/water-service`。它把 A（规则）、B（扫描）、C（进程）、D（清理）接成 IPC v1 的 17 个命令，对外只有 `Service::call(command, args)`。宿主（F2）会把界面的调用原样转进来。
- 依赖只有 serde、serde_json 与四个已验收 crate 的路径依赖。不依赖 Tauri。这四个 crate 不得修改；发现它们的 API 不够用，写受阻回执。
- 平台相关的东西都经 `Platform` 注入：已知目录、磁盘、时间、本地日期、在用判断。测试用合成平台，**测试里不读任何真实用户位置、不启动进程**。
- 存储只在 `data_dir` 之下，写入先写临时文件再改名；坏文件跳过不崩。
- **清理有开关。** `clean_enabled` 为 false 时两条清理命令只返回固定的提示句，什么都不做；为 true 时完整走 D 的执行器。两种情况都要测。真实冒烟必须在关闭状态下跑。
- 视图的文案与格式按 SPEC 第 6、7、8 节的规则生成。回放数据里个别手写的副标题不要求逐字相同，**形状（键集合）必须与回放数据逐层一致**。

## 白名单

- `packages/water-service/` 下本票新建的全部文件（`Cargo.toml`、`Cargo.lock`、`README.md`、`src/`、`tests/service_v1.rs`、`examples/service_smoke.rs`）
- `docs/dispatch/reports/WATER-W3-F1-REPORT.md`
- `docs/acceptance/wave3/f1/` 下 `--mode archive` 生成的证据

其余一律只读。

## 唯一测试

`packages/water-service/tests/service_v1.rs` 精确五个：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`，内容按 SPEC 第 9 节。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F1 --mode baseline
```

写好 `Cargo.toml` 后跑一次 `--mode lock`。开发中反复使用 `--mode check`、`--mode test`、`--mode real`。

三条负控，每条只改 `src/` 下真正被调用的一行，失败信息必须含目标标记，然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`：

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 确认令牌可以重复使用 | `SERVICE_TOKEN_ONCE` |
| nc2 | 清理关闭时仍能 prepare | `SERVICE_CLEAN_DISABLED` |
| nc3 | 计划漏掉 protected_paths，或把 protected 条目放进计划 | `SERVICE_PROTECTED_PLAN` |

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F1 --mode red-nc1
```

提交干净实现后依次运行 final 并归档：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F1 --mode check --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F1 --mode test --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F1 --mode real --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F1 --mode archive
```

## 预算与边界

- 原生窗口 0、选择框 0、浏览器 0。
- 删除只发生在本树 `.local/w3-f1-fixtures/` 里本次新建的目录内。
- 真实冒烟只读、清理关闭、输出不含路径。
- 不联网、不下载。不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W3-F1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f1/docs/dispatch/reports/WATER-W3-F1-REPORT.md
```

回执要写：
- 实际模型；
- 实现提交 SHA；
- 逐条对照 SPEC 第 2～10 节；
- 每个检查命令与结果；
- 三条负控（改了哪一行、失败信息、恢复后的哈希）；
- 真实冒烟的摘要；
- 没做或没验证的事。

受阻则同一路径写“WATER-W3-F1 任务受阻”，写清具体冲突与最小补充需求。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
