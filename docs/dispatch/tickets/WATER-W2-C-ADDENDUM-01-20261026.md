# WATER-W2-C 补单 01：测试只结束自己的进程、后代与 PID 复用

2026-10-26，总控（Claude）。依据 [第二波收单验收](../../acceptance/wave2/controller/WATER-W2-AE-REVIEW-20261026.md) C 小节。**可以新开对话执行（原对话已归档）。** 新执行者开工前依次读：原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-C-PROCESS-SCAN-20261026.md`、执行者规则 `F:/new/smaltalk/water/docs/dispatch/W2-CHECKUP-WORKER-RULES.md`、本票原回执 `F:/new/smaltalk/water/.worktrees/w2-c/docs/dispatch/reports/WATER-W2-C-REPORT.md`，最后读本补单。工作树、分支、检查入口都不变；文中的“你”指本票执行者，包括接手的新对话。

## 验收结果

隐私处理、FFI、路径边界规则、in_use 三种模式、孤儿判定都过了，总控新树重跑、总控负控与真实冒烟也通过。审查查出测试清理的安全问题和一处产品缺陷，总控已回到代码里确认。**补单修好前，总控不再运行 C 的测试。**

## 必改

1. **测试清理只结束自己启动、且命令行带本次令牌的进程（严重）。** 现在的 `stop()` 把孤儿链的全部 `descendant_pids` 也收进来，逐个 `taskkill /F /T /PID`，下手前不复核。后代里有不带令牌的 `ping.exe`；PID 一旦被 Windows 复用，`/T` 会连同整棵进程树结束别人的进程。改为：
   - 测试启动的每个进程，命令行里都带本次令牌（包括原来的 `ping` 子进程，例如把令牌放进它的参数或改用带令牌的等待命令）。
   - 清理只取“命令行含本次令牌”的进程，每结束一个之前重新取一次快照，确认同一 PID 的创建时间与当初记录的相同、命令行仍含令牌，才结束它。
   - 不用 `/T`；不按后代列表结束进程。
   - 直接 `spawn` 的子进程仍用 `Child::kill` 加 `wait`。
   - 清理后复核：快照里不再有含令牌的进程。
2. **后代没处理 PID 复用（主要）。** 找后代时只按父 PID 建子表。改为：子进程的创建时间不早于父进程的创建时间才算它的孩子，和找孤儿根时的复用判断一致。
3. **路径匹配可能在字符中间切片（中）。** `command_references_path` 匹配失败后 `from = abs + 1`，路径首字符是多字节时下一次切片会 panic，panic 信息会带出命令行片段。改为按当前匹配首字符的 UTF-8 长度前进，或改用 `match_indices`。
4. **取不到时间的进程不编造时间（低）。** 打不开的进程不要写 `1601-01-01T00:00:00Z`，写 null。本补单订正 MODEL 第 7 节：`processes[].created_at` 取不到时可以为 null。孤儿判断里创建时间未知的父进程按“不能证明被复用”处理。

## 测试（仍是原四个测试名，不加不减）

- `process_path_reference`：
  - 前边界反例：路径前面紧挨字母或数字时不命中。
  - 引号、`=`、单引号在前后各一例；后面是空格、结尾、`\` 各一例。
  - 传入的路径参数带 `/` 或末尾 `\` 也能正确归一。
  - 一例含中文的命令行与路径，不崩溃且结果正确。
  - 所有边界断言的失败信息都带 `PROC_PATH_BOUNDARY`。
- `process_in_use_and_orphans`：断言自制孤儿的 `descendant_pids` 恰好包含那个带令牌的子进程；构造一个创建时间早于父进程的记录，验证不被算作后代（可以用公开 API 能表达的方式，不加测试开关）。
- `process_privacy`：断言孤儿链非空后再检查不含令牌和路径。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w2-c`、分支 `worker/water-w2-c`，从你的回执提交 `ed224e39792fe740e517d1caad4f991973c80b73` 接着做。**不要重跑 baseline。**
- 命令与原票相同：`check`、`test`、`real`；负控 nc1 重做一次（只改生产代码，破坏后边界判断，失败信息含 `PROC_PATH_BOUNDARY`，`git checkout` 原字节恢复后立即 `test`）；提交干净实现后跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 改动范围仍只限 `packages/process-scan/`、本票回执与 `docs/acceptance/wave2/c/`。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W2-C 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-c/docs/dispatch/reports/WATER-W2-C-REPORT.md
```

新增“补单 01”一节：续做起点、新实现提交、逐条修了什么、清理逻辑怎样保证只结束自己的进程、新负控红绿回执。受阻仍写“WATER-W2-C 任务受阻”。
