# WATER-W2-D：清理执行器（重门）

2026-10-26，正式票，总控（Claude）。以 [第二波 manifest](../wave2/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-D-JUNK-CLEAN-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w2-d / worker/water-w2-d |
| 精确首次 HEAD | 7ca15282e477ed4b5120ffe3c1edc3a60b75c144（标签 water-w2-checkup-base-20261026），必须干净、`packages/junk-clean` 不存在 |
| SPEC | F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md |
| 共享模型 | F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W2-CHECKUP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w2-d/docs/dispatch/reports/WATER-W2-D-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w2-d/docs/acceptance/wave2/d/ |
| 门 | 重门：三条负控 + 总控独立复核 |

先读规则、[ADR-018](../../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)、共享模型与 SPEC。这些文件在你的工作树基点里也有同样内容，但以主检出绝对路径为准；不要 merge 或复制主线的后续提交。

## 本票要点（重门）

- 新 crate `packages/junk-clean`；系统调用只在 `src/native_windows.rs`。删除只用标准库 `remove_file`、`remove_dir`、`set_permissions`（仅清除只读）；**禁止 `remove_dir_all`**，检查器会拒绝。
- **本票没有真实模式。** 测试计划里的 root 一律位于本树 `.local/w2-d-fixtures/` 下本次新建的随机目录之内；任何真实用户位置都不得出现在测试代码里。
- 三条负控都要做（SPEC 第 5 节表格），每条只改 `src/` 里真正被调用的那一处，红了立即 `git checkout` 恢复并跑一次 test 变绿，再做下一条。
- 日志必须在删除前落盘：intent 行写入并 flush 后才能删除；写失败则中止整个执行。

## 白名单

- `packages/junk-clean/` 下本票新建的全部文件（含 Cargo.toml、Cargo.lock、README.md、src、tests）
- `docs/dispatch/reports/WATER-W2-D-REPORT.md`
- `docs/acceptance/wave2/d/` 下由 `--mode archive` 生成的证据

其余一律只读，包括契约、检查入口、台账、其它 packages、apps、prototypes 与其它工作树。

## 唯一测试

文件 `packages/junk-clean/tests/clean_v1.rs`，测试目标名 `clean_v1`，精确测试：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode baseline
```

写好 Cargo.toml 后：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode lock
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode test
```

负控（每条：只改生产代码 → 运行 → 立即恢复原字节 → 跑一次 test）：

| 模式 | 失败信息必须含 |
|---|---|
| `--mode red-nc1` | `CLEAN_IDENTITY` |
| `--mode red-nc2` | `CLEAN_NO_FOLLOW` |
| `--mode red-nc3` | `CLEAN_ROOT_BOUND` |

提交干净的实现后，依次运行 final，然后归档证据：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D --mode archive
```

## 预算与边界

原生窗口 0、目录选择框 0、浏览器 0；Rust 离线、jobs 1、私有目录；不下载、不改网络与全局配置。不读取任何真实用户位置。不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W2-D 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-d/docs/dispatch/reports/WATER-W2-D-REPORT.md
```

受阻则同一路径写“WATER-W2-D 任务受阻”，写清具体冲突与最小补充需求，不要让别人接手脏树。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
