# WATER-W2-C：进程快照与在用判断

2026-10-26，正式票，总控（Claude）。以 [第二波 manifest](../wave2/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-C-PROCESS-SCAN-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w2-c / worker/water-w2-c |
| 精确首次 HEAD | 7ca15282e477ed4b5120ffe3c1edc3a60b75c144（标签 water-w2-checkup-base-20261026），必须干净、`packages/process-scan` 不存在 |
| SPEC | F:/new/smaltalk/water/contracts/checkup-v1/PROCESS.md |
| 共享模型 | F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W2-CHECKUP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w2-c/docs/dispatch/reports/WATER-W2-C-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w2-c/docs/acceptance/wave2/c/ |
| 门 | 轻门：一条负控 |

先读规则、[ADR-018](../../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)、共享模型与 SPEC。这些文件在你的工作树基点里也有同样内容，但以主检出绝对路径为准；不要 merge 或复制主线的后续提交。

## 本票要点

- 新 crate `packages/process-scan`；系统调用只在 `src/native_windows.rs`，允许的函数见 SPEC 第 1 节。只读：不得结束、挂起或注入任何进程。
- 命令行只在内存里使用，不得出现在任何 JSON、Debug 输出、日志、测试快照或回执里。`process_privacy` 测试必须证明这一点。
- 测试可以启动自己的 `cmd`/`ping` 子进程（命令行含本次随机令牌），结束时只结束自己启动且含令牌的进程，并复核为空。
- 真实模式：`examples/real_smoke.rs` 打印进程计数摘要（SPEC 第 4 节），不打印命令行或路径。

## 白名单

- `packages/process-scan/` 下本票新建的全部文件（含 Cargo.toml、Cargo.lock、README.md、src、tests、examples）
- `docs/dispatch/reports/WATER-W2-C-REPORT.md`
- `docs/acceptance/wave2/c/` 下由 `--mode archive` 生成的证据

其余一律只读，包括契约、检查入口、台账、其它 packages、apps、prototypes 与其它工作树。

## 唯一测试

文件 `packages/process-scan/tests/process_v1.rs`，测试目标名 `process_v1`，精确测试：`process_snapshot_contract`、`process_path_reference`、`process_in_use_and_orphans`、`process_privacy`。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode baseline
```

写好 Cargo.toml 后：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode lock
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode test
```

只读真实冒烟（开发期可以多跑几次，最后在干净提交上跑 final）：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode real
```

负控（每条：只改生产代码 → 运行 → 立即恢复原字节 → 跑一次 test）：

| 模式 | 失败信息必须含 |
|---|---|
| `--mode red-nc1` | `PROC_PATH_BOUNDARY` |

提交干净的实现后，依次运行 final，然后归档证据：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode real --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-C --mode archive
```

## 预算与边界

原生窗口 0、目录选择框 0、浏览器 0；Rust 离线、jobs 1、私有目录；不下载、不改网络与全局配置。真实读取只按 ADR-018 的只读范围。不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W2-C 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-c/docs/dispatch/reports/WATER-W2-C-REPORT.md
```

受阻则同一路径写“WATER-W2-C 任务受阻”，写清具体冲突与最小补充需求，不要让别人接手脏树。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
