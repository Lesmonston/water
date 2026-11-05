# WATER-W10-M5 补单 01：命令追加与新参数带来的旧断言（重门）

2026-11-05，总控（Claude）。回应 WATER-W10-M5 的受阻回执（回执提交 `2d516c46`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M5-HOST-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/HOST-M35.md`（全文），以及原票列出的仍然有效的契约；
4. 本补单（与原票、规则或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w10-m5/docs/dispatch/reports/WATER-W10-M5-REPORT.md`。

## 受阻判断

受阻成立，是总控写 HOST-M35 第 5 节豁免时的疏漏。你指出的 `scan_start` 包装参数一处之外，总控通读 `apps/water/host/tests/host_v1.rs` 后确认，同一测试 `host_command_registry` 里还有几处会因为“17 个新命令追加在原有 19 个之后”或“`scan_start`、`clean_prepare` 多了可选参数”而必然失败。这次一并授权，免得再停。`clean_state` 的旧三态断言（第 1635～1651 行）不含 `purging`，与 SPEC 第 4 节不冲突，照旧不动。

## 获准修改（`tests/host_v1.rs`，行号按 `f93afb8e`）

1. **旧调用补 `None`**：第 198 行 `cmd_scan_start(backend)` 改为 `cmd_scan_start(backend, None)`（如有其它旧调用同样处理）；`expected` 里 `("scan_start", json!({}))` 不变，仍逐字节核对 None 时发出 `{}`。`cmd_clean_prepare` 的旧调用（第 203、1434、1823、1890 行附近）按 SPEC 第 5 节第 3 条把新增的可选参数传 `None`，旧请求 JSON 不变。
2. **第 285 行** `HOST_COMMANDS fixed registry`：改为比较 `&COMMANDS[..19]` 与 `names`（原有 19 个的名字与顺序不变）。
3. **第 286～302 行** `HOST_COMMANDS IPC table`：照 SPEC 第 5 节第 2 条，表的来源加上 `contracts/m35-v1/IPC-M35.md`；旧断言改为 `names` 与合并后表的前 19 个相同。36 个整表的核对放在新标记 `HOST_M35_COMMANDS`。
4. **第 365～385 行** `HOST_COMMANDS actual Tauri camelCase parameters`：
   - `expected_wrappers` 里 `scan_start` 的期望从 `[]` 改为 `["locationIds"]`；
   - `clean_prepare` 的期望从 `["excludeItemIds", "groupIds"]` 改为按字母排序的六个键 `["chosenMode", "conclusionVersion", "dedupeId", "dedupeVersion", "excludeItemIds", "groupIds"]`（SPEC 第 2 节、第 5 节第 3 条）；
   - 比较范围限定为原有 19 个命令的包装（`wrappers` 只取 `names` 里的键）；17 个新命令的包装参数由 `HOST_M35_COMMANDS` 对照 IPC-M35 第 1 节核对。
5. **第 399～404 行**：照 SPEC 第 5 节第 1 条，计数改为 36，`&COMMANDS[17..]` 改为 `&COMMANDS[17..19]`。第 405～408 行 `handlers == COMMANDS` 不变（两边都是 36 个）。
6. **第 439 行** `HOST_COMMANDS actual handler registration`：改为比较 `&handlers[..19]` 与 `names`。
7. **通则**：本测试文件里，凡是**只因**新命令追加在原有 19 个之后、或只因 `scan_start`、`clean_prepare` 多了可选参数（旧调用传 `None`）而必然失败的旧断言——整表比较、个数、切片、包装参数集合——一律获准截到原有 19 个、或只补上 SPEC 写明的新键再比。
   - 原有命令的名字、顺序、发给服务的请求（逐字节）、原样返回、错误映射与标记一项不放松；
   - 新增部分由 `HOST_M35_COMMANDS`、`HOST_M35_FORWARD`、`HOST_M35_REVEAL`、`HOST_M35_PURGE_EXIT` 核对，不得因此删减新覆盖；
   - 除此之外的旧断言要改，照旧写受阻回执；
   - 回执里逐处列出按本补单改的断言：位置、原文、新文。

## 其余

- 全部照原票与 SPEC：HOST-M35 第 1～6 节、两条负控、`spawnFile` 只许 `src/opener.rs` 启动 `explorer.exe`、整机检查要求不变。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m5`（分支 `worker/water-w10-m5`），从 `2d516c46` 续做。baseline 已通过，不用重跑。已提交的受阻回执与证据保留，不改写，只在其后新增提交。

## 命令（在工作树根目录执行）

照原票：反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`native --final`，再 `archive`。原生窗口照原票的预算，打开原生窗口前在回执里写明。

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M5 --mode test
```

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W10-M5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m5/docs/dispatch/reports/WATER-W10-M5-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：实际模型、续做起点、实现提交 SHA；SPEC 第 1～6 节逐条；改过的旧断言（SPEC 第 5 节三类与本补单各处，各写原文与新文）；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；整机检查结果；没做或没验证的事。

受阻则写“WATER-W10-M5 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 C 组的第二张，也是最后一张**。
