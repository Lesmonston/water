# 第七波（M3 收尾）收单验收（2026-10-29）

总控（Claude）。四张票 10-28 晚派出，基点 `28287695`（标签 `water-w7-m3-fix-base-20261028`）；用户告知 J1、J3、J4 交给 sol，界面票 J2 交给 astra。四份回执的执行者自报都是 Codex GPT-6（J2 回执特别写明不以 astra 排期标签代替实际模型）。四张票一次交回，没有受阻；用户 10-29 凌晨说“收活”。

| 票 | 执行者自报 | 实现提交 | 交回 HEAD | 合入主线 | 结论 |
|---|---|---|---|---|---|
| [WATER-W7-J1 宿主补遗](../../../dispatch/tickets/WATER-W7-J1-HOST-FIX-20261028.md) | Codex GPT-6 | `eeea1650` | `3f5550e0` | `1019b4e3` | **VERIFIED** |
| [WATER-W7-J2 界面补遗](../../../dispatch/tickets/WATER-W7-J2-UI-FIX-20261028.md) | Codex GPT-6 | `ef03770c` | `63557973` | `0d4333c2` | **VERIFIED** |
| [WATER-W7-J3 服务补遗](../../../dispatch/tickets/WATER-W7-J3-SERVICE-FIX-20261028.md) | Codex GPT-6 | `0f3ee726` | `d552b243` | `9d0e9833` | **VERIFIED** |
| [WATER-W7-J4 规则措辞与出处](../../../dispatch/tickets/WATER-W7-J4-RULES-FIX-20261028.md) | Codex GPT-6 | `8a3cc357` | `df3aef14` | `b299b879` | **VERIFIED** |

四棵树都只在首次 HEAD 之后新增两个提交（实现、回执与证据），没有合并提交，也没有改写历史。四个合并提交之后主线的目录树（`36d76835`）与下文“合并版真窗口”所用的合并版完全相同。

## 收单审计

收单审计脚本用第七波清单（J1、J3 用 `w3-receipt-audit.mjs`，J2、J4 用 `w2-receipt-audit.mjs`）。final 都落在实现提交上，执行者负控都红绿成对，改动都在白名单内：
- J1 只改 `apps/water/host/src/lib.rs`、`tests/host_v1.rs` 与 `README.md`；
- J2 只改 `apps/water/ui/app.mjs`、`styles/app.css`、`views/cleaning.mjs`、`views/results.mjs` 与 `tests/browser.test.mjs`；
- J3 只改 `packages/water-service/src/clean.rs`、`src/service.rs` 与 `tests/service_v1.rs`；
- J4 只改 `packages/junk-rules/rules/windows.json` 与 `tests/rules_v1.rs`。

J1、J3、J4 没有问题。J2 有一条提示：三个 final 记录的 `app.css` 字节与提交不一致。查明执行者工作区里这个文件换行混用（原有行是检出时的 CRLF，新加的一行是 LF）；Git 按 `text=auto` 提交时统一成 LF，所以 `git status` 一直是干净的。去掉回车后与提交的内容逐字节相同，CSS 不受换行影响；总控在新树（按提交检出）重跑的 final 覆盖了提交内容。不算问题。

验收工具在 `.local/w7-accept/`（脚本副本 [accept-kit](accept-kit/)），验收树 `.worktrees/accept-w7-j1`～`j4` 停在各自交回 HEAD。每次运行的一行结果、审计输出与验收清单在 [accept-20261029/controller](accept-20261029/controller/)，各票验收树的原始回执在 `accept-20261029/j1`～`j4`。

## 独立审查

J1、J2 各交一个只读代理，只给代码、契约与票，不给回执与总控结论。两张都没有高级、中级问题，低级见各节与文末“遗留”。J3、J4 改动小，由总控逐行看过（J4 另用脚本对表逐字核对）。

## J1 宿主补遗

### 新树重跑与总控负控

`lock`、`check --final`、`test --final`、`native --final` 都通过。总控变异（每条只改 `lib.rs` 一处，红后按原字节恢复、立即重跑测试变绿，恢复后哈希 `d9645e39…` 与交回一致）：

| 编号 | 变异 | 结果 |
|---|---|---|
| c1 | 停止改在 `RunEvent::ExitRequested` 上做（第六波漏网的 c4） | **抓到**，`HOST_EXIT_DURING_CLEAN missing branch/function prefix` |
| c2 | “查不到”计时总从发停止时算起，中间查到“正在清理”也不重新开始（第六波漏网的 c2，换一种写法） | **抓到**（`red-nc3`），`HOST_UNKNOWN_RESET`，5.3 秒提前放弃 |
| c3 | 关窗保护的条件写成 `!= CleanState::Cleaning`（查不到也放行） | **抓到**，`HOST_CLOSE_UNKNOWN` |
| c4 | 有界停止挪到 `Exit` 分支外面，每个事件都调用 | **抓到**，`HOST_EXIT_DURING_CLEAN Exit calls bounded stop…` |
| c5 | 空的后端槽（已 `take`）算作可用 | **抓到**（`red-nc1`），`HOST_UNSTARTED_SERVICE` |
| c6 | `clean_state` 不看可用性，照样查 `app_state` | **抓到**（`red-nc1`），`HOST_UNSTARTED_SERVICE` |
| c7 | 第一次查状态后的时限判断放宽到 4 倍 | **抓到**（`red-nc2`），`HOST_EXIT_DEADLINE` |
| c8（探针） | 退出时 `poll` 与 `limit` 两个参数对调（最多只等 200 ms） | 没抓到，见审查低级 2 |
| c9（探针） | 循环的计时在第一次查状态之后重新开始 | 没抓到，见审查低级 1 |

c1～c7 每条都是 5 个测试 4 过 1 败，失败都带目标标记，没有编译失败或连带失败。c8、c9 是为确认审查指出的测试缺口而做的探针，产品代码没有这两种问题。

### 整机窗口

`native --final`：1 个窗口、0 个选择框、9 步、15.8 秒、退出码 0。只删合成夹具 3,145,815 字节，失败 0，日志 `intent`、`result` 齐全，结束后子进程全部退出。

### 独立审查

没有高级、中级问题；`ServiceBackend` 用默认实现，服务正常时关窗保护与退出的行为与第六波相同。低级：
1. `HOST_EXIT_DEADLINE` 只测了“第一次查状态就超过整个时限”，没测“第一次查状态用掉一部分时限”（总控探针 c9 没被抓到）；契约第 5 节的测试表本来也只要求前者。
2. 退出接线的源码断言只查三个词都在分支里，参数对调（c8）、换成别的后端、包进新线程都能过。
3. 关窗保护的断言没管前面 `closing` 分支里的 `prevent_close` 和 `allow_close` 判断（不在本票范围）。
4. 测试里手写的分词器遇到字符字面量 `'{'`、原始字符串、字符串外的非 ASCII 字符会解析错；现在的 `lib.rs` 没有这些写法，出错时会响亮失败，构造不出静默通过。
5. `available()` 与 `call()` 分两次加锁，中间槽被取走会多等 5 秒；现在只在 `run_return` 返回、清理线程收尾后才 `take`，到不了。
6. README 新段落前少一个空行，与下一段连成一段（只影响排版）。

### 结论

**VERIFIED**。

## J2 界面补遗

### 新树重跑与总控负控

`check --final`、`test --final`、`browser --final` 都通过（单元测试 3 个、浏览器测试 5 个）。总控变异：

| 编号 | 变异 | 结果 |
|---|---|---|
| c1 | 恢复时只清 `unavailable`，`busy` 留着 | **抓到**（`red-nc1`），`UI_RECOVER_ERROR: recovery clears busy` |
| c2 | 恢复时清掉所有错误（包括 `not_found`、`stale`） | **抓到**（`red-nc1`），`UI_RECOVER_ERROR: recovery preserves not_found` |
| c3 | 补读又改回 `await`，挡住进度 | **抓到**，`UI_RECOVER_NONBLOCK` |
| c4 | 被后发读取取代的旧读取失败时仍记下 `stale` 标志 | 没抓到：页面读取（趋势、记录、位置）实际不会返回 `stale`，界面上看不到变化，测试只查看得到的状态。这条变异选得弱，换成 c8 |
| c5 | 结果页正文那句又按固定文字判断（不同的过期句子会重复显示） | **抓到**（`red-nc3`），`UI_STALE_START` |
| c6 | 读屏区清空后 50 ms 就重写 | **抓到**，`UI_CLEAN_STOP: leave at least 100 ms…` |
| c7 | 提示条上方的底改成半透明 | **抓到**，`UI_NOTICE_TOP` |
| c8 | 旧的成功读取不再检查先后，照样写入数据 | **抓到**（`red-nc2`），`UI_READ_ORDER: an older success cannot overwrite the new history` |

被抓到的每条都是 5 个浏览器测试 4 过 1 败、只有目标标记，日志里没有超时。c4 没抓到，`test --final` 起初报缺 nc2 的总控红绿对，补 c8 后通过。

### 截图

逐张看了验收树 `browser --final` 的截图：
- `stale`：提示条上方 40 px 空隙没有露字，条内只有服务那句话，正文没有重复的“结果已过期”，第一张分类卡完整，“清理所选”禁用；
- `cleaning`：新说明“停止后，正在删除的这一项会停在中途，已经删掉的部分无法恢复。”一字不差，旧句不再出现；
- `busy`、`notice-results`：提示条上方干净，条下的正文透过磨砂只剩一片模糊；白色磨砂、纯色强调、没有渐变。

### 独立审查

没有高级、中级问题；`state.error` 的每处写入都经过 `fault()` 或 `clearError()`，`errorCode` 始终同步。低级：
1. 位置页的三个操作（添加文件夹、开关分类、移除文件夹）自己重读或写入位置数据，不在“同页读取按先后”的编号里；要让进入页面时那次读取比选文件夹的对话框还慢才会出现，现实中几乎碰不到。
2. 被取代的读取不再记 `stale`（契约第 3 节要求丢弃），但 `fault` 上方注释仍写“`stale` is always recorded”，注释过时。
3. 提示条显示时顶栏是不透明的窗口色，不是磨砂；与下方差 5～6 个色阶，几乎看不出，但在 Mica 下与半透明的正文底略有差别。
4. `UI_READ_ORDER` 只覆盖两次完整的记录读取；“不重读时不增加编号”与记录详情的先后没有测试。
5. `UI_NOTICE_TOP` 把 `rgb(` 开头的颜色都当成不透明，如果浏览器把半透明相对色写成 `rgb(r g b / 0.86)` 就会漏掉（总控 c7 的 0.5 被抓到了）。
6. `UI_RECOVER_ERROR` 用的是夹具的错误句子，改成按句子而不是按错误码清除也能过。
7. 一个测试 `afterEach` 之后才到的控制台错误，会记在下一个测试头上。
8. 契约：第 1 条会连带清掉重连期间某个操作自己失败的 `unavailable`/`busy`（那时提示条显示的是“正在重新连接”，用户没看到过）；契约第 9 节写截图 21 张，实际测试一直产出 26 张（名字不变）。

### 结论

**VERIFIED**。

## J3 服务补遗

### 新树重跑与总控负控

`lock`、`check --final`、`test --final`、`real --final` 都通过；这一轮没有出现执行者遇到的 50 ms 返回时限偶发失败。总控变异：

| 编号 | 变异 | 结果 |
|---|---|---|
| c1 | 清理开始时仍写 0 | **抓到**（`red-nc1`），`SERVICE_GROUP_INDEX: first group` |
| c2 | 每一项都报第 1 组 | **抓到**（`red-nc1`），`SERVICE_GROUP_INDEX: plan order` |
| c3 | 结束时报最后一组的下标（组数减 1） | **抓到**，`SERVICE_GROUP_INDEX: stopped progress` |
| c4 | 删快照时传文件名而不是记录号（存储层按记录号校验，删不到） | **抓到**（`red-nc2`），`SERVICE_SNAPSHOT_ORPHAN: failed scan left its snapshot` |

### 只读真实体检

状态 `completed`，扫描 81.9 秒，四个盘；清理预览返回 `unavailable`（这个模式清理是关的）。分类与组数与执行者一致，总量只差机器自己的日常增减：

| 分类 | 组数 | 总量（总控） | 总量（执行者） |
|---|---:|---:|---:|
| Agent 工具 | 24 | 33.20 GB | 33.09 GB |
| 浏览器 | 14 | 10.43 GB | 10.48 GB |
| 系统临时 | 2 | 0.68 GB | 0.55 GB |
| 应用残留 | 8 | 10.61 GB | 10.33 GB |
| 开发缓存 | 13 | 5.89 GB | 5.89 GB |
| 崩溃日志 | 7 | 1.08 GB | 1.08 GB |
| 显卡与系统 | 2 | 0.66 GB | 0.66 GB |

推荐清理 12.18 GB，受保护 20.79 GB，未识别 0。

### 结论

**VERIFIED**。真窗口里的“第 1 / 1 组”见下文。

## J4 规则措辞与出处

### 对表核对

总控脚本把基点与交回的 `windows.json` 逐个标量比较：只变了 12 处（数据版本 1、说明文字 6、定位段 1、出处 4），契约第 1、3 节表里 10 行的“现在”“改为”都逐字相符；`opencode-sessions#1` 的段是 `.local/share/opencode/opencode.db*`；75 条规则的 ID 与顺序不变；所有说明里不再有“只列出”，在用设置为 none 的规则不再有“被占用的文件会跳过”。

### 新树重跑与总控负控

`lock`、`check --final`、`test --final`、`real --final` 都通过。总控变异：

| 编号 | 变异 | 结果 |
|---|---|---|
| c1 | 公开文案的“这是什么”给成“为什么可以清”（执行者 nc1 是反过来） | **抓到**（`red-nc1`），`RULES_M3_WORDING` |
| c2 | 计划里的数据版本写死成旧的 `2026-10-28.1` | **抓到**（`red-nc1`），`RULES_M3_WORDING` |

只读真实冒烟与执行者一致：75 条规则中 70 条至少有一个基础目录存在，60 条字面前缀存在。

### 结论

**VERIFIED**。

## 合并版真窗口：清理进行中关窗

在整合树 B 上把四张票合进 `34ec997c`（目录树与合入后的主线相同），用整合检查的发布编译参数编出 `water.exe`（增量 102 秒），再跑 [w6-i2-close-during-clean.mjs](../../../../scripts/acceptance/w6-i2-close-during-clean.mjs)：160 个带缓存标记的文件夹、64,000 个 2 KB 文件、另 2 个不该删的文件，七个分类全关、只加这个夹具。证据在 [close](accept-20261029/close/)。

| 时刻（UTC） | 事件 |
|---|---|
| 16:25:23 | 清理开始（125 MB） |
| 16:25:24.352 | 清理页截图：第 1 / 1 组，已处理 11 / 160 项，新的停止说明 |
| 16:25:24.357 | 请求关窗（没有点“停止”） |
| 16:25:24 | 清理结束，状态 `stopped` |
| 16:25:24.814 | 窗口消失（关窗请求后 457 ms） |
| 16:25:24.881 | 进程退出，退出码 0 |

- 结果 `stopped`：17 项删完、1 项删到一半（`partial`）、142 项因停止未处理（`skipped`）。只有关窗保护会发停止，说明关窗请求先停了清理；
- 日志 160 条 `intent` 都有对应的 `result`；剩 57,114 个缓存文件；2 个不该删的文件原样；
- 清理页显示“第 1 / 1 组”（第六波同一检查是“第 0 / 1 组”），说明文字是 J2 的新句子；
- 窗口在清理结束之后才消失，进程正常退出。第六波同一检查：451 ms，15 / 1 / 144 项。

## 遗留

都是低级，下一波或 M4 前统一处理：
- J1：退出接线断言查不出参数对调、换后端、包进新线程；`HOST_EXIT_DEADLINE` 没覆盖“第一次查状态用掉一部分时限”；测试分词器不认字符字面量与原始字符串；README 两段连在一起；
- J2：位置页三个操作的重读不在编号里；`fault` 上方的注释过时；提示条显示时顶栏是不透明窗口色而非磨砂；`UI_READ_ORDER`、`UI_NOTICE_TOP`、`UI_RECOVER_ERROR` 的覆盖缺口（见 J2 审查 4～6）；迟到的控制台错误记到下一个测试；契约第 1 条会连带清掉重连期间被遮住的操作错误；契约写 21 张截图、实际 26 张；
- J3：执行者两次遇到旧的 50 ms 返回时限偶发失败（`custom_root_add`、`scan_start`/`scan_progress`），总控这一轮没遇到，继续观察；没有注入“存储层删除自身失败”；
- 第七波计划里留下的：清理执行器的几条低级、第四波 G5 的释放量统计细节、校验器不拒受保护家目录里更深的可清规则（设计如此）。
