# WATER-W8-K1 补单 01：放行新的 issue code `image_unavailable`（轻门）

2026-11-01，总控（Claude）。回应 WATER-W8-K1 的受阻回执（回执提交 `6273d4d7`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K1-PROCESS-20261031.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m3c-v1/PROCESS-M3C.md`（全文），以及仍然有效的 `F:/new/smaltalk/water/contracts/checkup-v1/PROCESS.md`、`F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md` 第 7 节；
4. 本补单（与原票或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w8-k1/docs/dispatch/reports/WATER-W8-K1-REPORT.md`。

## 受阻判断

受阻成立，是总控 SPEC 的疏漏。SPEC 第 1 节新增了 issue `image_unavailable`，但第 4 节没有授权改 `process_snapshot_contract` 里只认 `access_denied`、`exited` 的旧断言（基线 `packages/process-scan/tests/process_v1.rs` 第 363 行）。总控已只读核对：测试文件里只有这一处列举 issue code。本机快照很可能有句柄能打开、却取不到程序路径的进程（如 `System`、`Registry` 这类没有映像文件的进程），新 code 一出现，这条旧断言就失败。

你的最小补充需求合理，按下面授权。

## 要做的

### 1. 授权改动的旧断言（`packages/process-scan/tests/process_v1.rs`）

`process_snapshot_contract` 第 363 行：

```rust
assert!(code == "access_denied" || code == "exited");
```

改为：

```rust
assert!(code == "access_denied" || code == "exited" || code == "image_unavailable");
```

只改这一行。同一循环里 `object_keys(issue)` 为 `{code, count}`、`count >= 1` 等其余断言不变；4 个测试名不变。回执写出原文与新文。

### 2. 计数口径（澄清，不是新要求）

- `image_unavailable` 只计“句柄已经打开、但 `QueryFullProcessImageNameW` 失败”的进程。句柄没打开、已经计入 `access_denied` 或 `exited` 的进程，不再重复计 `image_unavailable`。
- summary 里 issue 的顺序为 `access_denied`、`exited`、`image_unavailable`，计数为 0 的不出现（与原有两项相同）。
- 回执写明你的实现采用的口径；`real --final` 输出的 `image_unavailable` 数就是按这个口径的计数。

### 3. 其余

原票“要做的”与 SPEC 第 1～5 节照做。

## 不变

- `ProcessSummary` 的形状、原有三种在用方式的行为、隐私约束（程序路径与命令行永不进入 JSON、`Debug`、日志）、依赖；
- 白名单、两条负控（nc1 `PROC_M3C_IMAGE`、nc2 `PROC_M3C_MEMORY`，只改 `packages/process-scan/src/` 一处）、三个 final 都同原票。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w8-k1`、分支 `worker/water-w8-k1`，从回执提交 `6273d4d76e9b3339d7ef6a14c748e60fb50bb383` 接着做。开工时树应干净且 HEAD 为该提交。**不要重跑 baseline。**
- 命令同原票（在工作树根目录执行），例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K1 --mode test
  ```
  反复用 `lock`、`check`、`test`；负控：只改 `packages/process-scan/src/` 下一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 提交身份照规则第 5 节：只在提交命令的进程里设作者与提交者环境变量，不写任何 git 配置，不借用人类作者身份。
- 原生窗口 0、选择框 0；cargo 离线、单线程、私有 target，不下载。
- 测试只结束自己启动、命令行含本次令牌的进程；只删除本次新建的夹具目录。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `6273d4d7` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W8-K1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k1/docs/dispatch/reports/WATER-W8-K1-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：
- 实际模型、续做起点、实现提交 SHA；
- SPEC 第 1～3 节逐条：改了哪里、怎么满足；新增的系统调用与结构体大小断言；
- 改过的旧断言：本补单第 1 节，写改动前后的原文；`image_unavailable` 的计数口径；
- 每个检查命令与结果，`real` 的计数；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W8-K1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
