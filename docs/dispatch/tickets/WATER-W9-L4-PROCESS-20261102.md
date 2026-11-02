# WATER-W9-L4：命令行里的 Git Bash 写法（轻门，final 含只读进程计数）

2026-11-02，正式单，总控（Claude）。以[第九波 manifest](../wave9/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与 L1、L2、L3 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W9-L4-PROCESS-20261102.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w9-l4 / worker/water-w9-l4 |
| 精确首次 HEAD | 57ecd7ce42a98f9932faecc69e5d82c648991669，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m3d-v1/PROCESS-M3D.md（本单的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/PROCESS.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md；F:/new/smaltalk/water/contracts/m3c-v1/PROCESS-M3C.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W9-M3D-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w9-l4/docs/dispatch/reports/WATER-W9-L4-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w9-l4/docs/acceptance/wave9/l4/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC PROCESS-M3D 全文，再读 PROCESS-M3C 第 2 节；
2. 代码：`packages/process-scan/src/lib.rs` 的 `normalize_path`、`command_references_path`、`prev_boundary_ok`、`next_boundary_ok`，约 464～500 行；
3. `tests/process_v1.rs` 的 `process_path_reference`。

## 要做的（全部在 `packages/process-scan/`）

SPEC 第 1 节：比对命令行时，对 `<盘符>:\<其余>` 形式的路径，再找 `\<盘符>\<其余>`。前后边界的规则不变，盘根不找。

**不变**：原有写法的结果、按程序路径的判断、进程快照、隐私约束、依赖。

## 白名单

- `packages/process-scan/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W9-L4-REPORT.md`
- `docs/acceptance/wave9/l4/` 下 `--mode archive` 生成的证据

## 测试

`packages/process-scan/tests/process_v1.rs`，仍是精确 4 个测试，名字不变：`process_snapshot_contract`、`process_path_reference`、`process_in_use_and_orphans`、`process_privacy`。

- 新断言照 SPEC 第 2 节的表加在 `process_path_reference` 里，失败信息带 `PROCESS_M3D_MSYS`。
- 预计不需要改原有断言；若必然要改，先写受阻回执。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 不找 `\<盘符>\<其余>` 这种写法 | `PROCESS_M3D_MSYS` |
| nc2 | 这种写法不检查前边界 | `PROCESS_M3D_MSYS` |

只改 `packages/process-scan/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W9-L4 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只读本机进程列表，输出只有计数。

## 预算与边界

- 原生窗口 0、选择框 0、浏览器 0；不新增系统函数。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W9-L4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l4/docs/dispatch/reports/WATER-W9-L4-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1 节：改了哪里、怎么满足；
- 每个检查命令与结果，`real` 的结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W9-L4 任务受阻”，写清冲突与最小补充需求，不要自行变通。
