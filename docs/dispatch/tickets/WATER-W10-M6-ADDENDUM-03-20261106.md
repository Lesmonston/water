# WATER-W10-M6 补单 03：两处卡死、七处小错与回执补写（中门）

2026-11-06，总控（Claude）。补单 02 的交回（`3d5e01a7`，实现 `8c9f4c11`）总控已验收：三个 final 在验收树上重跑都通过，三条负控加四条总控变异全部抓住，“以后都跳过”只给真实条目这一条做对了。独立审查没有高危，但有两处会让界面卡住，另有七处小错；回执“补单 02”一节的中文写入时全变成了问号。这一轮记为返工，按本补单续做。可以新开对话执行。

开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M6-UI-20261106.md`、补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M6-ADDENDUM-01-20261106.md`、补单 02 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M6-ADDENDUM-02-20261106.md`（都仍然有效）；
2. 本补单（与前面几份或 SPEC 冲突时以本补单为准）；
3. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m6/docs/dispatch/reports/WATER-W10-M6-REPORT.md`；
4. 总控验收记录 `F:/new/smaltalk/water/docs/acceptance/wave10/controller/WATER-W10-REVIEW-20261105.md` 第 12 节。

下面的行号都指实现提交 `8c9f4c11`。

## 1. 中等：两处卡住，必须修

**1.1 轮询出错后界面卡死。**
- 现状：轮询失败时 `fail()` 写错误信息，`pollPaused` 置真（`app.mjs` 第 85 行）。唯一的恢复按钮“重新连接”只在 `s.error` 非空时画出来（第 214 行）。而 `run()`（第 27 行）与切页（第 231 行）都会先清空 `s.error`。
- 后果：体检中某次 `scan_progress` 失败，用户再点“停止”，按钮随错误信息消失；`scan_cancel` 成功了，`pollPaused` 却还是真，`busy` 停在 `scanning`，所有控件都不可点，只能重载窗口。清理中、永久删除中点导航也一样。
- 要求：
  - 只要轮询停着，就一直有办法恢复：“重新连接”跟着 `pollPaused` 显示，不跟着错误信息消失。
  - 停止类命令（`scan_cancel`、`clean_stop`、`dedupe_cancel`）成功后恢复轮询，让界面能读到结束状态。
  - 任务还在进行时，不允许出现“控件全禁用、又没有恢复入口”的状态。

**1.2 查重结果页与完成页走不出去。**
- 现状：查重结束后 `s.mode` 是 `dedupe`（第 79 行），只有结论页的刷新按钮会把它改回 `home`（第 109 行）。`views/dedupe.mjs` 里没有离开的操作；点顶部“体检”在同一路由上只是重画（第 34 行），画出来的还是查重页（第 217 行）。没有体检结论时，清理完点“完成”，`conclusion_get` 返回 `not_found`，也停在完成页（第 143 行）。
- 要求：
  - 查重结果页给一个次要按钮“返回”。有体检结论时回结论页，没有时回首页选位置。
  - 空闲时停在查重结果页或完成页，点顶部“体检”的效果与“返回”相同。
  - 完成页点“完成”：读到结论就去结论页；`not_found` 时回首页，不报错。
  - 查重的勾选在服务内存里，离开再回来不要求保留。

## 2. 低：七处小错，一并修

1. **只有结论自己的命令才把结论标成过期。** 现在 `fail()` 遇到任何 `stale` 都标结论过期（第 23 行），包括 `dedupe_decide` 与查重的 `clean_prepare`。改为：
   - 查重命令收到 `stale` 时，重读 `dedupe_result(dedupe_id, false)`，不碰结论；
   - 重读也失败（如服务重启后 `not_found`），回首页，提示“查重结果已失效，请重新查重”。
2. **切类别开关不把结论标成过期。** IPC-M35 第 3 节的四种过期来源是：有了更新的体检；这次体检已被清理用掉；跳过名单变了；会话开关或项目声明的信任变了。类别开关不在其中，设置页自己也写着“改了下次体检生效”。去掉第 155 行的 `markStale()`。会话、信任与跳过名单那几处保持不变。
3. **查重标题不用截断后的列表算组数。** `expand` 为 false 时服务至多给 8 组，现在“找到 ${groups.length} 组重复”在有 `more` 时少算（`views/dedupe.mjs` 第 13 行）。改为：
   - `more` 为 null 时照旧显示组数；
   - `more` 不为 null 时，标题不写组数（例如“找到重复文件”），并在页上显示服务给的 `more.text_zh`；
   - 不把 `groups.length` 与 `more.count` 相加。
4. **趋势不改服务给的数。** 现在把负的 `bytes_per_day` 换成 `'0'`，于是显示成“<1 MB”（`views/trends.mjs` 第 10 行）。改为：`days_to_full` 为 null 或 `bytes_per_day` 不大于 0 的盘，不画日均消耗那一格，改显示该盘的 `note_zh`（样例 `v2_trends` 的 F 盘就是这种）。
5. **复制线索不复制空串。** 卡片有 `copy_clue`，但线索不在 `clues`（至多 3 条）里时，现在复制空串（`views/results.mjs` 第 19 行）。改为：只有在 `clues` 里找得到这条线索时才显示“复制线索给 agent”。
6. **热力格子按本地日期分天。** 现在按 UTC 日期分（`views/charts.mjs` 第 78 行），旁边列表用本地时间，日本时间 0～9 点的记录会落到前一天的格子。改为与 `dateTime()` 一样按本地日期分天。
7. **迟到的隔离区列表不盖掉更新的结果。** 再次进入隔离区时，列表请求还在路上，用户点了还原或永久删除；列表回复晚到，会把 `v.view` 盖回操作前的样子（`app.mjs` 第 43～44、147 行）。改为：隔离区上的操作返回的视图之后，较早发出的列表回复一律丢弃。

## 3. 看图时发现的三处样子

1. 隔离区页顶上每个盘一个“打开文件夹”，现在看不出是哪个盘。按钮写成“打开 C 盘隔离区”这类（盘符取 `roots[].display_path` 或 `target_id`）。
2. 查重的矩形树图有一格太窄，没显示名字。格子放不下名字时，名字仍要看得到（截断加省略号，或标在格子外），不能只剩悬停提示。
3. 窄窗口（1040×720）首页右侧黑卡里，位置列表露出系统默认的滚动条。改成与 v3 一致的细滚动条，或让列表随页面滚动。

## 4. 测试（只能新增断言，放进指定的测试）

现有断言一处不改；测试数不变（浏览器 6 个、单元 3 个）。

| 改动 | 放进的测试 | 失败信息带的标记 |
|---|---|---|
| 1.1 轮询出错后点“停止”，界面仍能恢复并离开体检页 | `ui_v2_home_scan` | `UI_V2_HOME` |
| 1.2 查重结果页的“返回”、“体检”导航；完成页 `not_found` 回首页 | `ui_v2_quarantine_dedupe`、`ui_v2_confirm_done` | `UI_V2_DEDUPE`、`UI_V2_CONFIRM` |
| 2.1 查重 `stale` 不标结论过期，并重读查重结果 | `ui_v2_quarantine_dedupe` | `UI_V2_DEDUPE` |
| 2.2 切类别开关后，结论的清理按钮仍可用 | `ui_v2_pages_layout_a11y` | `UI_V2_PAGES` |
| 2.3 `v2_dedupe_result_more` 的标题不含“8 组”，并显示 `more.text_zh` | `ui_v2_quarantine_dedupe` | `UI_V2_DEDUPE` |
| 2.4 F 盘不显示日均消耗字节数，显示 `note_zh` | `ui_v2_pages_layout_a11y` | `UI_V2_PAGES` |
| 2.5 线索不在 `clues` 里的卡片，菜单没有“复制线索给 agent” | `ui_v2_conclusion` | `UI_V2_CONCLUSION` |
| 2.6 一条 UTC 前一天、本地当天的记录，落在本地日期那一格 | `ui_v2_pages_layout_a11y` | `UI_V2_PAGES` |
| 2.7 迟到的 `quarantine_list` 回复不盖掉还原结果 | `ui_v2_quarantine_dedupe` | `UI_V2_QUARANTINE` |
| 3.1 每个隔离区按钮写明盘符 | `ui_v2_quarantine_dedupe` | `UI_V2_QUARANTINE` |

- 测试里的假宿主可以加开关，例如“下一次某命令失败”“某命令的回复晚到”。开关只放在测试文件里，产品代码里不留任何测试入口。
- 样例变体在测试内存里构造（像现有的 `reverseCards`），不改样例文件。
- 2.6 的断言不能依赖运行机器的时区：期望值在页面里用产品同一个本地日期函数算，不要写死日期。

## 5. 回执补写（必须）

- 回执里“补单 02”一节的中文写入时全变成了问号（文件里存的就是 `0x3F`）。原单要求的逐屏数字来源、25 张截图逐张差异、旧断言改动，现在都看不到。
- 用 UTF-8 重写这一节，内容照你当时的结论；另新增“补单 03”一节，按原单“交回”一节逐项写。
- 写文件请用能明确指定 UTF-8 的方式（例如 Node 的 `writeFileSync(..., 'utf8')`）。不要经过会按系统代码页转码的管道或重定向。
- 提交前读回整份回执，确认没有连续的问号，也没有替换字符 `U+FFFD`。在回执里写一句你是怎么核对的。
- 逐张截图差异按这次新生成的 25 张来写。

## 其余

- 全部照原单、补单 01、02 与 SPEC：令牌、只画服务给的数、25 张截图、三条负控、白名单、预算都不变。
- 上次 `apps/water/ui/index.html` 与 `styles/app.css` 在你的工作树里行尾混用（有的行 CRLF、有的行 LF），审计因此报“final 源码与提交不一致”。跑 final 之前确认 `git status` 干净，并把这两个文件重新检出一次（`git checkout -- <文件>`），让工作树字节与仓库一致。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m6`（分支 `worker/water-w10-m6`），从 `3d5e01a7` 续做。已提交的回执与证据保留，不改写历史，只在其后新增提交。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W10-M6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m6/docs/dispatch/reports/WATER-W10-M6-REPORT.md
```

受阻则写“WATER-W10-M6 任务受阻”，写清冲突与最小补充需求，不要自行变通。
