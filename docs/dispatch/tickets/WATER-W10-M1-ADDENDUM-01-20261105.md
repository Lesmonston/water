# WATER-W10-M1 补单 01：追加规则后必然要改的三处旧测试（轻门）

2026-11-05，总控（Claude）。回应 WATER-W10-M1 的受阻回执（回执提交 `8dab9d76`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M1-RULES-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md`（全文），以及原票列出的仍然有效的契约；
4. 本补单（与原票、规则或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md`。

## 受阻判断

受阻成立，是总控写 SPEC 第 9 节时的疏漏：第 6 节在规则文件末尾追加 32 条，原有测试里有三处按“规则就是原来那 78 条”写的断言，追加后必然不成立，而第 9 节没有授权。总控已只读核对基线 `packages/junk-rules/tests/rules_v1.rs`，你列的三处都成立。

## 获准修改（在 SPEC 第 9 节三类之外再加三处）

1. **Agent 规则的尾段**（约第 2035～2042 行，`RULES_AGENT_TOOLS: appended rule order`）：`rules()[64..]` 改为 `rules()[64..78]`，仍与原 `AGENT_RULE_IDS` 的 14 个 ID 与顺序逐个相等，标记不变。第 6 节追加的 32 条按 `RULES_M35_SEEDS` 另行核对顺序与内容。
2. **旧条件校验循环**（`m3d_conditions_json` / `m3d_conditions` 与调用它们的循环，约第 104～119、1184～1186、1230～1251 行）：循环只处理 `rule_id` 为 `node-modules`、`test-browser-profiles` 的目标，旧断言、旧期望值与旧标记 `RULES_M3D_CONDITIONS` 原样保留；其它带条件的目标（第 5、6 节新增或改动的）不进这个循环，改由 `RULES_M35_FIELDS`、`RULES_M35_SEEDS` 按 SPEC 核对。不得删掉 `panic!` 的那一支，只是不再把新规则送进来。
3. **旧兼容夹具**（约第 1264～1280 行，`legacy_rules_json`）：输入改为当前规则文件的**前 78 条**（第 6 节追加之前的部分，顺序不变），再照原样去掉 `bundled-node-modules`、`browser-data-dirs` 两条并删除全部 `conditions`；与当前计划的逐个比较只比这 78 条规则生成的目标，按 `target_id` 对齐（不再按位置 zip）。断言与标记不变。**不得**为了让旧夹具通过而放宽生产代码里兜底规则的校验。

回执里逐条写这三处的原文与新文。除此之外仍只有 SPEC 第 9 节获准的三类。

## 其余

- 全部照原票与 SPEC：RULES-M35 第 1～8 节，第 9 节的测试，第 10 节的两条负控与真实冒烟。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m1`（分支 `worker/water-w10-m1`），从 `8dab9d76` 续做。baseline 已通过，不用重跑。已提交的受阻回执保留，不改写，只在其后新增提交。

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

原有的受阻一节保留，新增“补单 01”一节，写：实际模型、续做起点、实现提交 SHA；SPEC 第 1～8 节逐条；改过的旧断言（SPEC 第 9 节三类与本补单三处，各写原文与新文）；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；真实冒烟结果；没做或没验证的事。

受阻则写“WATER-W10-M1 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 A 组的第一张**：交回后接着做 A 组第二张 WATER-W10-M2（原派单句与原票不变）。
