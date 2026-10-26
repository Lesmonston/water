# WATER-W4-G3 补单 01：暂停时的连接提示切换页面后逐字保留

2026-10-26，总控（Claude）。依据 [第四波 G2、G3 收单验收](../../acceptance/wave4/controller/WATER-W4-G2G3-REVIEW-20261026.md) 的 G3 小节。**这是界面票，可以新开对话执行。** 新执行者开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G3-UI-POLISH-20261026.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/hardening-v1/UI-POLISH.md`，重点第 3 节；
4. 本补单；
5. 你自己（或上一位执行者）的回执 `F:/new/smaltalk/water/.worktrees/w4-g3/docs/dispatch/reports/WATER-W4-G3-REPORT.md`。

## 验收结果

下面这些已经通过，不要改：
- 改动范围只有 `app.mjs`、`styles/app.css`、`tests/browser.test.mjs` 三个文件；
- 第 1 节 11 处文字与 tokens 未变；
- 侧栏底部与首页说明的折行（`text-wrap: balance`）；
- 操作坞间距的回归锁定；
- 非连接类的命令错误在切换页面时清掉，回到结果页也不重现，再点“清理所选”照常显示服务返回的句子；
- 总控新树重跑三个 final，总控另做的 4 条负控全部被测试抓到，23 张截图逐张看过。

只有一处与 SPEC 第 3 节不符。

## 要改的一处

**现象**：
- 进度查询暂停（`state.pollPaused`）时，提示条显示的是服务返回的原因，旁边是“重新连接”按钮。例如：
  - 扫描中 `scan_progress` 连续 20 次 `unavailable`，提示为“Water 服务暂时不可用。”；
  - 清理中进度返回非 running 的非终态，提示为“未能确认清理状态，请重新连接。”（`app.mjs` 里 `pauseProgress` 的那一处）。
- 现在 `routeChanged()` 无条件执行 `state.error = ''`，切换页面后这句原因被清掉，提示条退回兜底句“未能读取任务进度，请重新连接。”。
- SPEC 第 3 节要求连接类提示“不受影响”。按钮还在，但文字变了，清理中的情形还丢掉了“未能确认清理状态”这层意思。

**要求**：
1. 暂停期间切换页面，提示条的文字与“重新连接”按钮在切换前后逐字相同，直到用户点“重新连接”或状态恢复。
2. 非暂停时，命令错误照旧在切换页面时清掉；“正在重新连接 Water 服务…”照旧保留。重新连接中切换页面时仍要清掉旧的命令错误，免得恢复后它在新页面上重新出现。
3. 做法不限，只改 `app.mjs`。例如只在 `!state.pollPaused` 时清 `state.error`，或者把暂停原因放进单独的字段。不要改提示条的结构、文案或样式。

## 测试（仍是精确 5 个浏览器测试、3 个单元测试，不加不减）

改 `ui_m1_polish` 里暂停的那一段，标记仍为 `UI_NOTICE_SCOPE`：
- **注入的宿主句子不能等于界面的兜底句**。现在测试用 `{code:'invalid', message_zh:'未能读取任务进度，请重新连接。'}` 进入暂停，切换前后的文字天然相同，测不出问题。
- 改为在扫描中让 `scan_progress` 连续 20 次返回 `fixture.errors.unavailable`（或该夹具中任何 `message_zh` 与兜底句不同的错误）：
  1. 先断言提示条文字等于这句宿主原因，按钮可用；
  2. 依次切到清理记录、首页，每次都断言文字与切换前逐字相同、按钮可用；
  3. 最后点“重新连接”，提示条消失。
- 可选：若假宿主能让 `clean_progress` 返回非 running 的非终态（只在测试文件里加），对“未能确认清理状态，请重新连接。”做同样的断言；做不到就在回执里说明。
- 其余断言与截图不变。

## 负控

测试文件变了，检查器要求三条负控都按新的测试字节重做：
- **nc1**（`UI_LEVEL_GUARD`）、**nc2**（`UI_FOOTER_WRAP`）照原票做法重做；
- **nc3**（`UI_NOTICE_SCOPE`）改为“暂停时也清掉错误提示”：例如去掉你新加的暂停判断，让切换页面无条件清 `state.error`。它必须被新的暂停断言抓到。

每条都是：改一处生产代码 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w4-g3`、分支 `worker/water-w4-g3`，从回执提交 `27f44862664f92f1d6c9de270857ad603b3e1d6b` 接着做。**不要重跑 baseline。** 开工时树应干净且 HEAD 为该提交。
- 检查入口与命令同原票：
  ```powershell
  node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G3 --mode test
  ```
  另有 `check`、`browser`、`red-nc1..3`。提交干净实现后依次跑 `check --final`、`test --final`、`browser --final`，再 `archive`。
- 改动范围仍只限 `apps/water/ui/`、本票回执与 `docs/acceptance/wave4/g3/`。
- 不 push、不 merge、不 rebase，不改台账、契约、检查器。

## 不在本补单内

审查还看到：在旧页面发出的命令若在切换页面之后才失败，错误会出现在新页面上（窗口只有一次 IPC 往返）。这一条不要求本补单处理，总控记入后续。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W4-G3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g3/docs/dispatch/reports/WATER-W4-G3-REPORT.md
```

新增“补单 01”一节，写：
- 实际模型；
- 续做起点与新实现提交 SHA；
- 改了什么；
- 新的暂停断言用的宿主句子；
- 三条负控的改动、失败信息、恢复后的哈希；
- 三个 final 与 archive 的回执；
- `notice-*` 两张截图与其它截图是否有变化。

受阻则写“WATER-W4-G3 任务受阻”，写清冲突与最小补充需求。
