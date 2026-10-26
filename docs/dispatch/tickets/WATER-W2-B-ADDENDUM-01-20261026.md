# WATER-W2-B 补单 01：discovery 排除、非 ASCII 路径与停止后的守卫

2026-10-26，总控（Claude）。依据 [第二波收单验收](../../acceptance/wave2/controller/WATER-W2-AE-REVIEW-20261026.md) B 小节。**贴回原 B 对话续做，不新开执行者。**

## 验收结果

重解析点处理、名字归一化样例、组级体量都过了：与摸底同口径的 4 处相差都在 0.3% 以内，总控新树重跑与总控负控也通过。但代码审查查出下面几处，前两处是必须修的高危缺陷，总控已逐条回到代码里确认。

## 必改

1. **discovery 排除方向写反（高）。** SCAN 第 3 节：排除“与其它任一 target 的条目路径相同**或为其祖先**的子项、与任一受保护条目相同或为其祖先的子项”。`scan.rs` 现在用 `is_proper_ancestor(path, &child.path)`，判断的是“子项在别的条目之内”，方向反了。
   - 后果：`C:\Windows\Temp\claude` 里装着需要确认级（72 小时）的 Claude Code 临时目录，却被当成 system-temp-old 的一项（推荐级、7 天）。满 7 天后会按推荐级被清，绕过确认级；同一批字节还被重复计数。
   - 改为：子项等于其它条目，或是其它条目的祖先，就排除；对受保护条目同理。
2. **非 ASCII 路径崩溃（高）。** `util.rs` 的 `is_proper_ancestor` 用 `descendant[..prefix.len()]` 按字节下标切 `&str`，切在多字节字符中间就 panic，整次扫描中止。
   - 改为按字节比较（`as_bytes()`，ASCII 大小写不敏感），或用 `str::get` 并把 `None` 当作不匹配。
   - 全 crate 自查同类写法：凡是对路径或名字按字节下标切 `&str` 的地方都要改。
3. **停止后守卫失效（中高）。** 预算用尽或取消后，`engine.list` 返回空，`dir_has_git` 跟着返回 false，partial 结果里含 `.git` 的目录可能被判为可清理。条目遍历被截断时，`newest_activity` 也不完整。
   - 覆盖 SCAN 第 3 节“两者都返回已得结果”的含义：只有体量遍历、`newest_activity`、`.git` 检查与 identity 都在停止前完成的条目，才算“已得结果”并写进 items。其余条目不输出，组上照常记 issue。
   - `budget_exhausted` 每组只记一次，不要每次调用 `stopped()` 都累加。
4. **不带花括号的 GUID（中）。** SCAN 第 5 节是“去掉首尾花括号后整体是 GUID → `{guid}`”，花括号可有可无。现在只认带花括号的。
5. **日均增长（低，订正契约含义）。** `bytes_per_day` = `bytes_delta` ÷（两次快照的精确间隔秒数 ÷ 86400），不要用四舍五入后的天数做除数。显示用的天数照旧四舍五入；不足 1 小时的规则不变。
6. **模块级 unsafe 声明。** 按 SCAN 第 1 节，除 `native_windows.rs` 外每个模块文件开头写 `#![forbid(unsafe_code)]`。

## 测试（仍是原五个测试名，不加不减）

- `scan_pattern_marker_discovery`：discovery 的根下一个子项是另一个 target 条目的父目录，这个子项不得成为条目，体量不重复计；一个子项是受保护条目的父目录，同样不得成为条目。补 marker“命中后不再往里找”的用例，由这条规则排除，而不是靠 `max_depth`。`newest_activity` 断言具体时间，不只断言非空。
- `scan_overlap_and_guards`：夹具里放中文名与带重音字母的目录（例如 `临时安装文件`、`José`），与其它条目做祖先和包含比较，不崩溃且结果正确。补同级别重叠的取舍与 hard_guard 等于条目路径各一例。
- `scan_reparse_budget_cancel`：
  - 所有不跟随的断言（中间段联接不产生条目、记 issue、外部目标不计体量）失败信息都带 `SCAN_NO_FOLLOW`。
  - 预算用尽时，含 `.git` 的目录不出现在可清理条目里；`budget_exhausted` 每组计数为 1。
  - 正常完成时 status 断言为 `completed`，不接受 partial。
- `scan_snapshot_growth_keys`：补不带花括号的 GUID；补 1 小时间隔的日均增长换算。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w2-b`、分支 `worker/water-w2-b`，从你的回执提交 `79cd9d38234293ebdb24dd5153f1cc3e8954b10a` 接着做。**不要重跑 baseline。**
- 命令与原票相同：`check`、`test`、`real`；负控 nc1 重做一次（只改生产代码，让体量遍历或分类进入联接，失败信息含 `SCAN_NO_FOLLOW`，`git checkout` 原字节恢复后立即 `test`）；提交干净实现后跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 改动范围仍只限 `packages/junk-scan/`、本票回执与 `docs/acceptance/wave2/b/`。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W2-B 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-b/docs/dispatch/reports/WATER-W2-B-REPORT.md
```

新增“补单 01”一节：续做起点、新实现提交、逐条修了什么、新负控红绿回执、真实冒烟组级数字的变化（尤其 system-temp-old 与 claude-code-scratchpad 不再重叠）。受阻仍写“WATER-W2-B 任务受阻”。
