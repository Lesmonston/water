# WATER-W10-M1 补单 04：剪映 `CEF Cache` 拆成两段（轻门）

2026-11-06，总控（Claude）。M1 补单 03 已交回（回执提交 `2fd789d8`），总控验收**通过**：审计 0 问题，新树重跑 lock、check、real、test 四个 final 通过，总控变异十条全被抓住，独立审查没有高危。审查查出一处与 `jest *` 同类的写法问题，责任在总控：SPEC 第 6 节第 4 条写的 `JianyingPro User Data CEF Cache`，`User Data` 是一个目录名，`CEF Cache` 却是两级目录（真实路径是 `%LOCALAPPDATA%\JianyingPro\User Data\CEF\Cache`，总控 11-01 清理记录里也是这样）。现在实现成单段 `"CEF Cache"`，一个也匹配不到，只是少清一处缓存，不会删错。M1 还要等 M2 一起合入，趁这时一并改掉。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M1-RULES-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md`（第 6 节第 4 条以本补单为准，SPEC 文件本身是冻结文件，不要改）；
4. 补单 01～03（同目录，仍然有效）；
5. 本补单；
6. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md`。

## 1. 改什么（只这两处）

- `packages/junk-rules/rules/windows.json` 里 `jianying-cache` 的第二个定位（约第 5205～5212 行，`local_app_data` 下 `["JianyingPro", "User Data", "CEF Cache"]`）改为 `["JianyingPro", "User Data", "CEF", "Cache"]`。第一个定位 `["JianyingPro", "User Data", "Cache"]` 不变。
- `packages/junk-rules/tests/rules_v1.rs` 约第 708 行 `RULES_M35_SEEDS` 种子表里这一条的第二个定位，`JianyingPro/User Data/CEF Cache` 改为 `JianyingPro/User Data/CEF/Cache`。

这是 SPEC 改动带来的期望值修订，获准；别的期望一处不改。

总控审查已逐条核过规则文件里其余带空格的段，都是真实目录名，不用动：`User Data`、`Profile *`、`Guest Profile`、`System Profile`、`Code Cache`、`Media Cache`、`Service Worker`、`Login Data`、`Local Storage`、`Session Storage`、`Web Data`、`Local State`、`Ubisoft Game Launcher`、`Conformed Files`，以及分区下的 `Code Cache`。

## 其余

- 全部照原票、SPEC 与前三张补单；SPEC 第 10 节两条负控照旧，提交干净实现后重新做红绿与三个 final。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m1`（分支 `worker/water-w10-m1`），从 `2fd789d8` 续做。已提交的回执与证据保留，不改写，只在其后新增提交。

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

原有各节保留，新增“补单 04”一节，写：实际模型、续做起点、实现提交 SHA；两处改动（位置、原文、新文）；每个检查命令与结果；负控与恢复后的哈希；真实冒烟结果；没做或没验证的事。

受阻则写“WATER-W10-M1 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 A 组的第一张**：交回后接着做 WATER-W10-M2 补单 02（`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M2-ADDENDUM-02-20261106.md`）。
