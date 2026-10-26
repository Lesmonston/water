# WATER-W4-G2：服务加固（`water-service` 第 2 版）

2026-10-26，正式票，总控（Claude）。以 [第四波 manifest](../wave4/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**可以在新对话里执行。** 本票与 F3、G1、G3 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G2-SERVICE-HARDENING-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w4-g2 / worker/water-w4-g2 |
| 精确首次 HEAD | 0ca42f8e8038a5a7816802c5a7f175a966b0625c（标签 water-w4-hardening-base-20261026），必须干净；`packages/water-service` 是已验收的 F1 服务核心 |
| SPEC | F:/new/smaltalk/water/contracts/hardening-v1/SERVICE-HARDENING.md |
| 被覆盖的原契约 | F:/new/smaltalk/water/contracts/desktop-v1/SERVICE.md 与 F1 补单 01：F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F1-ADDENDUM-01-20261026.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md |
| 计划 | F:/new/smaltalk/water/docs/dispatch/wave4/PLAN.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w4-g2/docs/dispatch/reports/WATER-W4-G2-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w4-g2/docs/acceptance/wave4/g2/ |
| 门 | 轻门：3 条负控 + 只读真实冒烟 |

先读规则、计划、SPEC，再读 SERVICE 与 F1 补单 01，然后读已验收的代码：`packages/water-service/src/`（特别是 `service.rs`、`clean.rs`、`storage.rs`、`views.rs`）与 `tests/service_v1.rs`。测试里现成的 `Fake` 平台与夹具可以直接扩展。

## 本票要点

SPEC 第 2～7 节共 6 件事：
1. **panic 不卡死**：`call` 不向外 panic；状态锁中毒照常用；扫描、清理线程整个任务体受保护，出事后回到空闲、进度为 failed。
2. **信任边界**：
   - 只有本进程内完成的扫描才能 prepare，启动时读回的扫描返回 stale；
   - 启动时读回的计划不能执行；
   - 执行只用内存里的计划，不读回计划文件。
3. **存储整理**：
   - 启动时删掉本服务自己留下的 `.<名>.<32 位十六进制>.tmp`；
   - 计划与日志各留 ID 最新的 60 个；
   - 只删平铺普通文件，不递归。
4. **自定义文件夹按规范路径判断**：用 `std::fs::canonicalize`，规范路径与给出的不同就拒绝；包含判断与已知目录的规范路径比较。
5. **部分完成的扫描**：有 `budget_exhausted` 或受保护组上有 issue 时，prepare 返回 stale 与“这次体检没有完整完成，请重新体检后再清理。”。
6. **占用提示用产品名**：按 SPEC 第 7 节对照表。

**不变**：
- 公开 API 与 SERVICE 第 2 节完全相同；
- IPC 的命令、参数、返回形状与错误码不变；
- 依赖与允许的系统函数不变；
- 清理开关关闭时最先返回 unavailable。

**不改**：`packages/` 下其它 crate、`apps/`、契约、检查器、台账。

## 白名单

- `packages/water-service/` 下已有的文件（`Cargo.toml` 的依赖不改；`Cargo.lock` 不应变化）
- `docs/dispatch/reports/WATER-W4-G2-REPORT.md`
- `docs/acceptance/wave4/g2/` 下 `--mode archive` 生成的证据

## 唯一测试

`packages/water-service/tests/service_v1.rs` 精确 6 个：
- 原有 5 个：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`；
- 新增：`service_hardening`，内容按 SPEC 第 8 节。

测试只用本树 `.local/w3-f1-fixtures/` 下的随机目录与测试自己的平台，**不读真实位置、不启动进程**。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G2 --mode baseline
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G2 --mode lock
```

1. 反复使用 `--mode check` 与 `--mode test`。
2. 三条负控，每条只改 `src/` 下真正被调用的一处，失败信息必须含目标标记；然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`：

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 去掉后台任务的整体保护 | `SERVICE_PANIC_IDLE` |
| nc2 | 允许对启动时读回的扫描 prepare | `SERVICE_TRUST_BOUNDARY` |
| nc3 | 去掉部分完成扫描的判断 | `SERVICE_PARTIAL_SOURCE` |

提交干净实现后依次运行：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G2 --mode check --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G2 --mode test --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G2 --mode real --final
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G2 --mode archive
```

`real --final` 做一次本机只读整机扫描，约 1～3 分钟，清理保持关闭；输出只有 JSON 摘要，新增的 `in_use_labels` 应显示产品名。

## 预算与边界

- 原生窗口 0、选择框 0、浏览器 0。
- 真实数据：只有 `real --final` 的只读冒烟。
- 不联网、不下载、不改网络与全局配置。
- 不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W4-G2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g2/docs/dispatch/reports/WATER-W4-G2-REPORT.md
```

回执要写：
- 实际模型；
- 实现提交 SHA；
- 逐条对照 SPEC 第 2～8、10 节；
- 每个检查命令与结果；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 真实冒烟摘要（含 `in_use_labels`）；
- 没做或没验证的事。

受阻则同一路径写“WATER-W4-G2 任务受阻”，写清具体冲突与最小补充需求，不要自行变通。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
