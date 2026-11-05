# WATER-W10-M1：规则：新字段、新定位、会话开关与新规则（轻门）

2026-11-05，正式单，总控（Claude）。以[第十波 manifest](../wave10/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与第一批另外七张单同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M1-RULES-20261105.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w10-m1 / worker/water-w10-m1 |
| 精确首次 HEAD | f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md（本单的全部要求） |
| 仍然有效、要读的 | F:/new/smaltalk/water/contracts/checkup-v1/RULES.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md；F:/new/smaltalk/water/contracts/m3c-v1/RULES-M3C.md；F:/new/smaltalk/water/contracts/m3d-v1/RULES-M3D.md；计划 JSON 的新键也要被扫描读回，见 SCAN-M35 第 1 节（只读，扫描由 M2 实现）：F:/new/smaltalk/water/contracts/m35-v1/SCAN-M35.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w10-m1/docs/acceptance/wave10/m1/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC 全文，再读上表“仍然有效”的契约；[第十波计划](../wave10/PLAN.md)第 2 节第 4～20、36、38、53、55、56 行与第 9 行（卸载残留）（来由）；
2. 代码：`packages/junk-rules/src/types.rs`、`packages/junk-rules/src/rules.rs`、`packages/junk-rules/src/plan.rs`、`packages/junk-rules/src/folders.rs`、`packages/junk-rules/rules/windows.json`、`packages/junk-rules/tests/rules_v1.rs`。

## 要做的（全部在 `packages/junk-rules/`）

1. SPEC 第 1 节：规则的新字段与校验（含 `installed_names`）；
2. 第 2 节：`root_levels`；
3. 第 3 节：两种新 marker、四个新条件、`custom_discovery`、`system_drive`；
4. 第 4 节：`unlocks` 与会话开关 `resolve_plan_with`；
5. 第 5、6 节：改动的已有规则与 32 条新规则；
6. 第 7、8 节：计划 JSON 的键顺序与数据版本；

**不变**：不给 `MatchSpec`、`InUseMode` 加成员；不用新字段时计划 JSON 与改动前逐字节相同；`KnownFolders` 的字段与 JSON 不变。

## 白名单

- `packages/junk-rules/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W10-M1-REPORT.md`
- `docs/acceptance/wave10/m1/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-rules/tests/rules_v1.rs`，精确 4 个测试：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。
- 新断言照 SPEC 的测试一节放进指定的测试，失败信息带 `RULES_M35_FIELDS`、`RULES_M35_SEEDS`、`RULES_M35_SESSIONS`、`RULES_M35_VERSION`。
- 夹具照规则第 3 节：只在本树 `.local/` 下，用完只删本次新建的那一个目录。
- 旧断言只能改SPEC 第 9 节获准的三类，回执逐条写原值与新值。

## 负控

| 负控 | 让什么失效（SPEC 给的例子，可选更窄的一处） | 标记 |
|---|---|---|
| nc1 | `resolve_plan` 也为带 `session_tool` 的规则生成目标 | `RULES_M35_SESSIONS` |
| nc2 | `custom_discovery` 对任何 custom root 都生成目标 | `RULES_M35_FIELDS` |

只改 `packages/junk-rules/` 的生产代码一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。要找只有新断言才抓得到的位置。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M1 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只读已知目录是否存在，输出只有计数。

## 预算与边界

- 系统函数：不新增系统函数。
- 原生窗口 0、选择框 0、浏览器 0。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：不 push 到任何远端，不添加或修改 git 远端与配置；不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W10-M1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md
```

回执要写：实际模型、实现提交 SHA；SPEC 逐节：改了哪里、怎么满足；改过的旧断言（原值与新值）；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；真实冒烟或整机检查的结果；没做或没验证的事。
