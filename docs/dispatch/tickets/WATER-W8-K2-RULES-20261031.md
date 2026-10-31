# WATER-W8-K2：在用方式、工作树规则与整盘位置（轻门，final 含只读真实冒烟）

2026-10-31，正式单，总控（Claude）。以[第八波 manifest](../wave8/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与 K1、K3、K5、K6 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K2-RULES-20261031.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w8-k2 / worker/water-w8-k2 |
| 精确首次 HEAD | 912eba100ba342c3eeb21ba555c6d589b91e6b4f，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m3c-v1/RULES-M3C.md（本单的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/RULES.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md；F:/new/smaltalk/water/contracts/m3-v1/RULES-AGENT.md；F:/new/smaltalk/water/contracts/m3-v1/RULES-M3-FIX.md；新方式的语义见 F:/new/smaltalk/water/contracts/m3c-v1/PROCESS-M3C.md 第 2 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w8-k2/docs/dispatch/reports/WATER-W8-K2-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w8-k2/docs/acceptance/wave8/k2/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC RULES-M3C 全文，再读 RULES 第 2～4 节、RULES-AGENT、RULES-M3-FIX；
2. 代码：`packages/junk-rules/src/rules.rs`（`in_use` 校验，约 284～319 行）、`src/types.rs`（`InUseMode`、路径校验）、`src/plan.rs`（custom root 的路径校验与 marker 目标生成）、`rules/windows.json`；
3. `tests/rules_v1.rs`：规则总数、custom 规则个数、`data_version` 的现有断言。

## 要做的（全部在 `packages/junk-rules/`）

SPEC 第 1～5 节：
1. 新的在用方式 `runs_from_or_references_item`，名单 0～8 个；
2. 四条通用规则改用新方式；
3. 新规则 `git-worktrees`（仅供参考），字段与文案逐字照 SPEC 第 3 节；
4. custom root 可以是 `X:\` 盘根，并进入 `hard_guards`；
5. `data_version` 为 `2026-10-31.1`。

**不变**：其余规则的字段与文案、校验的其它条款、`resolve_plan` 的输出顺序、依赖。

## 白名单

- `packages/junk-rules/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W8-K2-REPORT.md`
- `docs/acceptance/wave8/k2/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-rules/tests/rules_v1.rs`，仍是精确 4 个测试，名字不变：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。

- 新断言照 SPEC 第 6 节加在已有测试里，失败信息带 `RULES_M3C_IN_USE`、`RULES_M3C_WORKTREE`、`RULES_M3C_DRIVE_ROOT`、`RULES_M3C_VERSION`。
- 旧断言只能改 SPEC 第 6 节获准的四类（规则总数、四条规则的 `in_use`、custom 规则个数、`data_version`），回执逐条写原值与新值。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 校验器对新方式也要求非空名单 | `RULES_M3C_IN_USE` |
| nc2 | `resolve_plan` 拒绝盘根 | `RULES_M3C_DRIVE_ROOT` |

只改 `packages/junk-rules/src/` 里一处（只改规则数据不算）→ `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。生产代码里不少位置已被旧断言覆盖，要找只有新断言才抓得到的位置，否则旧断言会先失败，检查器不认。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K2 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只核对本机已知目录是否存在，不读文件内容，输出不含路径。

## 预算与边界

- 原生窗口 0、选择框 0。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料（第 3 节的出处已给出）。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W8-K2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k2/docs/dispatch/reports/WATER-W8-K2-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～5 节逐条：改了哪里、怎么满足；
- 改过的旧断言：原值与新值；
- 每个检查命令与结果，`real` 的结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W8-K2 任务受阻”，写清冲突与最小补充需求，不要自行变通。
