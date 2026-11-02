# WATER-W9-L2：附加条件、兜底目标与增长提示（轻门，final 含只读真实扫描）

2026-11-02，正式单，总控（Claude）。以[第九波 manifest](../wave9/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与 L1、L3、L4 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W9-L2-SCAN-20261102.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w9-l2 / worker/water-w9-l2 |
| 精确首次 HEAD | 57ecd7ce42a98f9932faecc69e5d82c648991669，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m3d-v1/SCAN-M3D.md（本单的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/SCAN.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md；F:/new/smaltalk/water/contracts/m3c-v1/SCAN-M3C.md；条件与兜底的 JSON 定义见 F:/new/smaltalk/water/contracts/m3d-v1/RULES-M3D.md 第 1、3、4 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W9-M3D-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w9-l2/docs/dispatch/reports/WATER-W9-L2-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w9-l2/docs/acceptance/wave9/l2/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC SCAN-M3D 全文，再读 RULES-M3D 第 1、3、4 节、SCAN-M3C；
2. 代码：
   - `packages/junk-scan/src/plan.rs`：`Marker`、`Match`、`Target` 与校验，约 1～172 行；
   - `src/scan.rs`：
     - `marker_matches`，约 465～486 行；
     - 一次遍历 `walk_markers`，约 505～685 行：父目录的子项清单在压栈时已有，不要为条件再列目录；
   - `src/snapshot.rs`：`growth`，约 42～94 行；
3. `tests/scan_v1.rs`：`scan_snapshot_growth_keys` 里 `cur19`、`cur20`、`hour`、`one_hour` 几组样例。

## 要做的（全部在 `packages/junk-scan/`）

SPEC 第 1～4 节：
1. 计划 JSON 的 `conditions` 与 `fallback_for`，校验；旧计划不变；
2. 条件的判断（父目录用已有的清单，路径用拼出的文本）；
3. 命中归主目标或兜底目标，兜底目标不单独搜索，`visited_entries` 不变；
4. 增长：间隔不足 24 小时为空，疑似泄漏要求体量增加。

**不变**：标记原有的语义、一次遍历的结构、测量方式、结果 JSON 的形状、依赖。

## 白名单

- `packages/junk-scan/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W9-L2-REPORT.md`
- `docs/acceptance/wave9/l2/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-scan/tests/scan_v1.rs`，仍是精确 5 个测试，名字不变：`scan_plan_contract`、`scan_pattern_marker_discovery`、`scan_overlap_and_guards`、`scan_reparse_budget_cancel`、`scan_snapshot_growth_keys`。

- 新断言照 SPEC 第 5 节加在指定的测试里，失败信息带 `SCAN_M3D_PLAN`、`SCAN_M3D_CONDITIONS`、`SCAN_M3D_GROWTH`。
- 夹具只建普通文件与目录，只在本树 `.local/` 下，用完只删本次新建的那一个目录。
- 旧断言只能改 SPEC 第 5 节获准的两类，回执逐条写原值与新值。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 不满足条件的命中仍算主目标 | `SCAN_M3D_CONDITIONS` |
| nc2 | 增长的间隔下限改回 1 小时 | `SCAN_M3D_GROWTH` |

只改 `packages/junk-scan/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。要找只有新断言才抓得到的位置。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W9-L2 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 是一次只读真实扫描，只输出组级汇总，不含路径；回执里写出用时与访问条目数。

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
WATER-W9-L2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l2/docs/dispatch/reports/WATER-W9-L2-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～4 节逐条：改了哪里、怎么满足；
- 改过的旧断言：原值与新值；
- 每个检查命令与结果，`real` 的用时与访问条目数；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W9-L2 任务受阻”，写清冲突与最小补充需求，不要自行变通。
