# WATER-W7-J2：界面补遗（轻门，界面票）

2026-10-28，正式票，总控（Claude）。以 [第七波 manifest](../wave7/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 J1、J3、J4 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W7-J2-UI-FIX-20261028.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w7-j2 / worker/water-w7-j2 |
| 精确首次 HEAD | 282876950df40a14b7abeec6ab27677ea0adc897，必须干净；`apps/water/ui` 是第六波 I3 合入后的界面 |
| SPEC | F:/new/smaltalk/water/contracts/m3-v1/UI-M3-FIX.md（本票的全部要求）；仍然有效的是 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W6-I3-UI-M3-20261028.md 的“要做的”、F:/new/smaltalk/water/contracts/hardening-v1/UI-POLISH.md、F:/new/smaltalk/water/contracts/checkup-v1/UI.md、F:/new/smaltalk/water/docs/design/water-ui-v1/DESIGN.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W7-M3-FIX-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w7-j2/docs/dispatch/reports/WATER-W7-J2-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w7-j2/docs/acceptance/wave7/j2/ |
| 门 | 轻门：3 条负控 + 浏览器测试与截图 |

先读：
1. 规则、SPEC UI-M3-FIX 全文、第六波 I3 票“要做的”、UI-POLISH 第 1、3 节、设计说明第 10 节；
2. 背景：[第六波收单验收](../../acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md) I3 一节（独立审查的两条中级）；
3. `apps/water/ui/app.mjs`：`fault`、`run`、`stop`、`loadRoute`、`readProgress`、`pauseProgress`、`render` 的提示条、`prepare` 里的 `clean_start` 错误；`views/results.mjs` 的过期说明；`views/cleaning.mjs`；`styles/app.css` 的 `.notice`；
4. `tests/browser.test.mjs`：假宿主（`offline`、`holdProgress`、`delayedError` 等）、`settle`、`waitFor`、`noticeSettled`、`reset`、控制台错误的收集。

## 要做的

SPEC 第 1～8 节逐条实现：
1. 恢复成功时清掉断开期间留下的连接类读取错误，再补读；
2. 恢复时的补读不挡住进度；
3. 同一页的读取按发出先后生效；
4. 读屏区清空后至少隔 100 ms 再写同一句；
5. `clean_start` 返回过期时不加“请重新点击”后缀；正文过期说明按错误码判断；
6. 清理页的停止说明改成：**停止后，正在删除的这一项会停在中途，已经删掉的部分无法恢复。**（一字不差）
7. 提示条贴顶时，上方空隙不露出滚过的正文；
8. 测试失败都带标记：`settle` 表达式不抛错；控制台错误按测试检查。

| 条 | 标记 |
|---|---|
| 1 | `UI_RECOVER_ERROR` |
| 2 | `UI_RECOVER_NONBLOCK` |
| 3 | `UI_READ_ORDER` |
| 4 | `UI_CLEAN_STOP`（已有） |
| 5 | `UI_STALE_START` |
| 6 | `UI_CLEAN_TEXT` |
| 7 | `UI_NOTICE_TOP` |
| 8 | 各测试已有标记或 `UI_TEST_BOUNDS` |

**不变**（SPEC 第 10 节）：IPC 调用、`ui-fixtures.json`、`styles/tokens.css`；UI-POLISH 第 1 节的 11 处文字；整机观察器依赖的文字（“这些文件将被永久删除，不进入回收站，无法恢复。”、“永久删除 …”、“清理完成”、“查看清理记录”、“停止”）；第五波 H4 的停止失败说明；视觉与图标；已验收的行为与断言（SPEC 第 9 节获准改动的除外）。

## 白名单

- `apps/water/ui/` 下的文件（不得新增 npm 文件）
- `docs/dispatch/reports/WATER-W7-J2-REPORT.md`
- `docs/acceptance/wave7/j2/` 下 `--mode archive` 生成的证据（含截图）

## 唯一测试

- `unit.test.mjs`：精确 3 个，不变。
- `browser.test.mjs`：精确 5 个，名字不变（`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`、`ui_m1_polish`）。

必需截图：第六波 I3 的 21 张，名字不变。`cleaning-1240x820` 里应是新句子；`stale-1240x820` 按 SPEC 第 7 条。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W7-J2 --mode baseline
```

1. 反复使用 `--mode check`、`--mode test` 与 `--mode browser`。
2. 三条负控，都由检查器跑浏览器测试证明。
   - 每条只改 `apps/water/ui` 生产代码里真正被调用的一处，不改测试；
   - 失败信息含目标标记，输出里不能有超时；
   - 然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`。

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 恢复时不清连接类错误 | `UI_RECOVER_ERROR` |
| nc2 | 同一页的旧读取后返回时照样生效 | `UI_READ_ORDER` |
| nc3 | `clean_start` 过期时照旧加后缀 | `UI_STALE_START` |

提交干净实现后依次运行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W7-J2 --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W7-J2 --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W7-J2 --mode browser --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W7-J2 --mode archive
```

`archive` 会把通过的浏览器运行截图复制进证据目录。逐张看图，回执里重点写 `cleaning`、`stale`、`paused`、`reconnecting`、`clean-stop-failed`。

## 预算与边界

- 一个私有 headless Chrome；原生窗口 0、选择框 0。
- 不读真实位置、不联网、不下载。
- 不 merge、不 rebase，不改主线台账。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W7-J2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w7-j2/docs/dispatch/reports/WATER-W7-J2-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～8 条逐条：改了哪里、怎么满足；
- 改过的旧断言：原文与新文；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希，以及输出里没有超时；
- 截图逐张写看到了什么；
- 没做或没验证的事。

受阻则同一路径写“WATER-W7-J2 任务受阻”，写清冲突与最小补充需求，不要自行变通。
