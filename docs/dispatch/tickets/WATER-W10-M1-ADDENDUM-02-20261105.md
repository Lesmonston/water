# WATER-W10-M1 补单 02：计划尾段的两处旧断言，以及同类断言的通则（轻门）

2026-11-05，总控（Claude）。回应 WATER-W10-M1 补单 01 之后的再次受阻（回执提交 `a62e87ce`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M1-RULES-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md`（全文），以及原票列出的仍然有效的契约；
4. 补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M1-ADDENDUM-01-20261105.md`（三处授权仍然有效）；
5. 本补单（与原票、规则、SPEC 或补单 01 冲突时以本补单为准）；
6. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md`。

## 受阻判断

受阻成立，补单 01 只授权了规则 ID 的切片，没有覆盖同一测试 `rules_resolve_plan` 里按“计划目标的尾段”写的两处。总控已只读核对：会话开关全关时，第 6 节的固定定位规则（如 `chromium-partition-cache`、`pagefile`、`minimax-hub-leftover`、`system-tmp-chrome-profiles`）照样生成目标，追加在旧 Agent 目标之后，所以这两处必然不成立。

## 获准修改

1. **`rules_v1.rs` 约第 1573～1578 行**（`RULES_AGENT_TOOLS: appended target count`）：`&plan.targets[beta_position + 7..]` 改为 `&plan.targets[beta_position + 7..beta_position + 7 + 38]`；`len() == 38` 与之后对这 38 个目标的逐项核对原样保留。
2. **约第 1616～1620 行**（`RULES_AGENT_TOOLS: final appended target`）：比较对象从 `plan.targets.last()` 改为上一条那段 38 个目标的最后一个（`appended.last()`），期望值 `other-agent-sessions#3` 与标记不变。
3. **通则**（免得再为同一类原因停工）：原有测试里，凡是**只因第 6 节在规则文件末尾追加规则、计划末尾随之多出目标**而必然不成立的断言——不设终点的切片、对这种切片或整个列表的个数、“最后一项是某个旧 ID”——一律获准改成截到原有部分的终点再比（终点用原有的个数，如 78 条规则、原有目标的个数），原有部分的内容、顺序、字段与标记一项不放松。
   - 只适用于“末尾多出新东西”这一个原因；凡是原有规则、目标的内容本身要变的，仍只认 SPEC 第 9 节与补单 01 的授权，超出就照旧写受阻回执。
   - 新增的规则与目标（含整个计划的最后一项）由 `RULES_M35_SEEDS` 核对数量、顺序与内容，不得因此删减新覆盖。
   - 回执里逐处列出按本条改的断言：位置、原文、新文。

## 其余

- 全部照原票、SPEC 与补单 01。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m1`（分支 `worker/water-w10-m1`），从 `a62e87ce` 续做。baseline 已通过，不用重跑。已提交的回执保留，不改写，只在其后新增提交。

## 命令（在工作树根目录执行）

照原票：反复用 `lock`、`check`、`test`、`real`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M1 --mode test
```

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W10-M1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md
```

原有各节保留，新增“补单 02”一节，写：实际模型、续做起点、实现提交 SHA；SPEC 第 1～8 节逐条；改过的旧断言（SPEC 第 9 节三类、补单 01 三处、本补单两处与按通则改的每一处，各写原文与新文）；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；真实冒烟结果；没做或没验证的事。

受阻则写“WATER-W10-M1 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 A 组的第一张**：交回后接着做 A 组第二张 WATER-W10-M2（原票不变）。
