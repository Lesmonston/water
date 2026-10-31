# WATER-W8-K1：进程快照补程序路径与内存（轻门，final 含只读真实冒烟）

2026-10-31，正式单，总控（Claude）。以[第八波 manifest](../wave8/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与 K2、K3、K5、K6 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K1-PROCESS-20261031.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w8-k1 / worker/water-w8-k1 |
| 精确首次 HEAD | 912eba100ba342c3eeb21ba555c6d589b91e6b4f，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m3c-v1/PROCESS-M3C.md（本单的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/PROCESS.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md 第 7 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w8-k1/docs/dispatch/reports/WATER-W8-K1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w8-k1/docs/acceptance/wave8/k1/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC PROCESS-M3C 全文，再读原 PROCESS 全文与 MODEL 第 7 节；
2. 代码：`packages/process-scan/src/lib.rs`（`in_use`、`references_path` 的边界规则、`orphans`）、`src/native_windows.rs`（`enrich()` 已用 `PROCESS_QUERY_LIMITED_INFORMATION` 打开句柄、命令行的取法）；
3. `tests/process_v1.rs`：现有的自建子进程、令牌与收尾写法。

## 要做的（全部在 `packages/process-scan/`）

SPEC 第 1～3 节：
1. 快照在内存里多记程序完整路径（`QueryFullProcessImageNameW`）与工作集（`NtQueryInformationProcess` 信息类 3）；取不到时计 issue `image_unavailable`；
2. 新的在用方式 `runs_from_or_references_item` 与 `runs_from_or_references`，名单为空表示任何进程；
3. `OrphanChain.memory_bytes`。

真实冒烟加两个计数（SPEC 第 5 节）。

**不变**：`ProcessSummary` 的形状、原有三种方式的行为、隐私约束（程序路径与命令行永不进入 JSON、Debug、日志）、依赖。

## 白名单

- `packages/process-scan/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W8-K1-REPORT.md`
- `docs/acceptance/wave8/k1/` 下 `--mode archive` 生成的证据

## 测试

`packages/process-scan/tests/process_v1.rs`，仍是精确 4 个测试，名字不变：`process_snapshot_contract`、`process_path_reference`、`process_in_use_and_orphans`、`process_privacy`。新断言照 SPEC 第 4 节加在已有测试里，失败信息带 `PROC_M3C_IMAGE`、`PROC_M3C_ANY`、`PROC_M3C_MEMORY`、`PROC_M3C_PRIVACY`。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 新方式里去掉“程序在条目里”的判断 | `PROC_M3C_IMAGE` |
| nc2 | 孤儿链的内存只取根进程、不加后代 | `PROC_M3C_MEMORY` |

只改 `packages/process-scan/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K1 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 取一次本机进程快照，只输出计数，不输出命令行与程序路径。

## 预算与边界

- 原生窗口 0、选择框 0。
- cargo 离线、单线程、私有 target，不下载。
- 测试只结束自己启动、命令行含本次令牌的进程；只删除本次新建的夹具目录。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W8-K1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k1/docs/dispatch/reports/WATER-W8-K1-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～3 节逐条：改了哪里、怎么满足；新增的系统调用与结构体大小断言；
- 每个检查命令与结果，`real` 的计数；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W8-K1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
