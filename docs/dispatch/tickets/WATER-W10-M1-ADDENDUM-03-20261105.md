# WATER-W10-M1 补单 03：`jest-cache` 定位、discovery 盘根、旧循环的覆盖面（轻门）

2026-11-05，总控（Claude）。M1 已交回完成（回执提交 `23cd89da`），总控验收时复跑、变异都通过，但独立审查查出一处功能退步，另有两处要补。这不是你的受阻，是验收不通过、要续做。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M1-RULES-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md`（全文）；
4. 补单 01、02（同目录 `WATER-W10-M1-ADDENDUM-01-20261105.md`、`WATER-W10-M1-ADDENDUM-02-20261105.md`，仍然有效，本补单第 3 条改写补单 01 第 2 条）；
5. 本补单（与原票、规则、SPEC 或前两张补单冲突时以本补单为准）；
6. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md`。

## 1. `jest-cache` 的定位（功能退步，必须改）

SPEC 第 5 节写的 `jest *`，按本契约表格的写法（反引号里的空格分段，如第 6 节第 32 条 `tmp chrome_*` 你实现成了 `["tmp", "chrome_*"]`）是**两段**：`jest`，然后 `*`。计划第 13 行的本意是“按成员拆开”：Jest 的缓存在 `%TEMP%\jest\jest-transform-cache-…`，每个成员一个条目。现在实现成单段 `"jest *"`，只匹配名字以 `jest ` 加空格开头的目录，实际一个也找不到，原来能找到的 `%TEMP%\jest` 也丢了。SPEC 那一格用顿号分隔几个名字，中间又夹空格，确实容易读错，是总控写得含糊。

- `rules/windows.json` 里 `jest-cache` 的 `system_temp`、`user_temp` 各一个 `jest *` 定位，改为 `"segments": ["jest", "*"]`；`haste-map-*`、`metro-*` 不变（定位器仍是每个 base 三个，共六个）。
- `tests/rules_v1.rs` 里 `RULES_M35_SEEDS` 对它的期望（约第 3803、3806 行的 `p("system_temp", "jest *")` 等）随之改为两段，并加一条断言：`jest-cache` 在两个 base 下生成的目标 `segments` 恰好是 `["jest", "*"]`。
- 你已核对过，规则文件里别的带空格的段（如 `User Data`、`Profile *`、`Code Cache`）都是真实目录名，不受影响；回执里写一句复核结果。

## 2. discovery 定位不许以盘根为 base

审查发现：`{"kind":"discovery","base":"system_drive"}` 能通过规则校验，但它生成的计划 JSON 被 `ScanPlan::from_json` 以盘根 discovery 拒收（`RULES_INVALID_PATH`）。SPEC 第 3.4 节只给 `pattern` 开放盘根。

- 规则解析时，`discovery` 定位的 `base` 为 `system_drive`（以及任何解析为盘根的 base）一律拒收，错误码 `RULES_INVALID_LOCATE`，指针指向该定位。
- 在 `RULES_M35_FIELDS` 里加这一条反例。现有规则数据不受影响（没有这种写法）。

## 3. 旧条件循环的覆盖面（改写补单 01 第 2 条）

补单 01 第 2 条写成“循环只处理 `node-modules`、`test-browser-profiles` 的目标”，写得太窄：那个循环体里除了条件比对，还有非 marker 目标的形状、marker 字节、兜底目标的线上 ID 与键顺序（`RULES_M3D_FALLBACK`）等检查，现在对另外 76 条旧规则都不跑了。改为：

- 循环处理**原有 78 条规则**（`rules()[..78]` 的 `rule_id`）生成的全部目标；新增 32 条照旧不进。
- 与 `m3d_conditions` / `m3d_conditions_json` 的比对仍只对 `node-modules`、`test-browser-profiles` 两条做（补单 01 的意图不变）。
- 循环体里其余检查对这 78 条规则的目标照旧执行。若某处**只因** SPEC 第 5 节改了那条规则、或 SPEC 改了兜底目标的 ID 写法而必然失败，获准把期望值改成 SPEC 规定的新值（不放松检查本身）；回执里逐处写位置、原文、新文。除此之外的失败照旧写受阻回执。

## 其余

- 全部照原票、SPEC 与前两张补单；SPEC 第 10 节两条负控照旧，提交干净实现后重新做红绿与三个 final。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m1`（分支 `worker/water-w10-m1`），从 `23cd89da` 续做。已提交的回执与证据保留，不改写，只在其后新增提交。

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

原有各节保留，新增“补单 03”一节，写：实际模型、续做起点、实现提交 SHA；本补单三条逐条；按第 3 条改的期望值（位置、原文、新文）；每个检查命令与结果；负控与恢复后的哈希；真实冒烟结果；没做或没验证的事。

受阻则写“WATER-W10-M1 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单仍是 A 组的第一张**：交回后接着做 WATER-W10-M2 补单 01（`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M2-ADDENDUM-01-20261105.md`）。
