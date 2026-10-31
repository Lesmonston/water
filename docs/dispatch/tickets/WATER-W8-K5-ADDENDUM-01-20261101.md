# WATER-W8-K5 补单 01：`clean_prepare` 新参数的签名断言（重门）

2026-11-01，总控（Claude）。回应 WATER-W8-K5 的受阻回执（回执提交 `ba3a39b9`，草稿提交 `2d70999e`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K5-HOST-20261031.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m3c-v1/HOST-M3C.md`（全文）与 `F:/new/smaltalk/water/contracts/m3c-v1/IPC-M3C.md`，以及原票列出的仍然有效的契约；
4. 本补单（与原票或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w8-k5/docs/dispatch/reports/WATER-W8-K5-REPORT.md`。

## 受阻判断

受阻成立，是总控 SPEC 的疏漏。总控已只读核对基线 `apps/water/host/tests/host_v1.rs` 的 `host_command_registry`：
- `expected` 列表同时用作“调用序列里转发的参数”和“Tauri 包装函数的参数键”（`expected_wrappers` 由它推导）；
- 测试通过 `exercise()` 调 `cmd_clean_prepare(..., None)`，转发的参数应当仍是 `{"groupIds": [...]}`（SPEC 第 1 节要求不排除时逐字节不变）；
- 但 Tauri `clean_prepare` 的真实参数键必然变成 `excludeItemIds`、`groupIds` 两个。

两件事不能同时用一张表表达，SPEC 第 4 节只授权了“命令总数 17 → 19”，所以需要补单。你没有用忽略新键、放宽比较等方式变通，做法正确。

你的草稿里还把 `HOST_COMMANDS IPC table` 的对照来源接上了 IPC-M3C 表中的两个新命令。这是 17 → 19 的必然结果，本补单一并明确授权，免得有歧义。

## 要做的

### 1. 授权改动的旧断言（`apps/water/host/tests/host_v1.rs`，`host_command_registry`）

原有失败信息里的 `HOST_COMMANDS` 标记原样保留，5 个测试名不变。

1. **Tauri 参数键**（`HOST_COMMANDS actual Tauri camelCase parameters`）：`expected_wrappers` 仍从 `expected` 推导，只有 `clean_prepare` 一项的期望键改为 `["excludeItemIds", "groupIds"]`（排序后）。其余 18 个命令的期望键照旧由 `expected` 推导，仍精确比较整张表。
2. **调用序列**（`HOST_COMMANDS exact call sequence and camelCase arguments`）：`expected` 里 `clean_prepare` 的参数仍是 `{"groupIds": ["g1", "g2"]}`，对应 `exercise()` 里传 `None` 的调用，不改。两条新命令按 17 → 19 追加在最后。
3. **契约表**（`HOST_COMMANDS IPC table`）：对照名单为 `contracts/checkup-v1/IPC.md` 表中的 17 个命令名，后面依次接 `contracts/m3c-v1/IPC-M3C.md` 表中的 `skip_add`、`skip_remove`（照你草稿的做法）。仍精确比较顺序与个数。
4. 现有对 `cmd_clean_prepare` 的调用补上第三个参数 `None`，原有的成功与失败断言不改。这是签名变化的适配，不算改断言，回执里列出。

回执逐条写出改动前后的原文（连同 SPEC 第 4 节已授权的 17 → 19）。

### 2. 其余

原票“要做的”与 SPEC 第 1～3 节照做。你草稿里已做的部分可以沿用，但必须以本补单后的字节重新跑全部检查；草稿时期的 `test` 结果不算数。

## 不变

- SPEC 第 1 节：没传或空数组时只转发 `{"groupIds": [...]}`，与原来逐字节相同；非空才带 `excludeItemIds`；宿主不校验 ID 内容；
- 其余命令、capabilities、CSP、导航与窗口安全、关窗与退出的生产行为、依赖；
- 白名单、两条负控（nc1 `HOST_M3C_EXCLUDE`、nc2 `HOST_M3C_SKIP`，只改 `apps/water/host/src/` 一处）、三个 final（含 `native --final` 的 1 个真窗口）都同原票。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w8-k5`、分支 `worker/water-w8-k5`，从回执提交 `ba3a39b9f43e3dcab6a8e6f68c942d7c008720f6` 接着做。开工时树应干净且 HEAD 为该提交。**不要重跑 baseline。**
- 命令同原票（在工作树根目录执行），例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K5 --mode test
  ```
  反复用 `lock`、`check`、`test`；负控：只改 `apps/water/host/src/` 下一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。提交干净实现后依次跑 `check --final`、`test --final`、`native --final`，再 `archive`。
- `native --final` 与原票相同：检查器在本树 `.local/w8-k5-native/` 下生成夹具，七个分类全部关闭，只清理夹具；原生窗口 1 个（只在 `native --final`），选择框 0 个。
- 提交身份照规则第 5 节：只在提交命令的进程里设作者与提交者环境变量，不写任何 git 配置，不借用人类作者身份。
- cargo 离线、单线程、私有 target，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `ba3a39b9` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W8-K5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k5/docs/dispatch/reports/WATER-W8-K5-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：
- 实际模型、续做起点、实现提交 SHA；
- SPEC 第 1～3 节逐条：改了哪里、怎么满足；
- 改过的旧断言：SPEC 第 4 节的 17 → 19 与本补单第 1 节，写改动前后的原文；
- 每个检查命令与结果；`native --final` 的步骤、用时、退出码与截图；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W8-K5 任务受阻”，写清冲突与最小补充需求，不要自行变通。
