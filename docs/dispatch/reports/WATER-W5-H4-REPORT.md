WATER-W5-H4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h4/docs/dispatch/reports/WATER-W5-H4-REPORT.md

# WATER-W5-H4 回执：界面 M2（轻门）

- 实际模型：Claude Opus 5.5（`claude-opus-5-5`，1M 上下文），通过 Claude Code / Claude Agent SDK 执行。
- 工作树 / 分支：`F:/new/smaltalk/water/.worktrees/w5-h4` / `worker/water-w5-h4`。
- 首次 HEAD：`3f9078972d7f958fad6bfd42e68f022dd659539e`，开工时干净。
- 实现提交：`8ec13f1e093ed89d5acc42c530a5b9c2eae5a61a`（`Keep late commands off the new page and resume reads after reconnect (W5-H4)`）。
- 之后只有一个回执与证据提交。没有 merge、rebase、amend、push，也没有改远端或 git 配置。
- 提交身份：本机没有配置 git 身份，规则又不许改配置。所以只用环境变量 `GIT_AUTHOR_*` / `GIT_COMMITTER_*` 给这两次提交带上本仓库已有提交的身份（Riku Toto，noreply 地址），没有写入任何配置。

## 改了哪些文件

全部在白名单内：

| 文件 | 作用 |
|---|---|
| `apps/water/ui/app.mjs` | 第 1～4 条的逻辑 |
| `apps/water/ui/views/common.mjs` | 新增 `stopNote(state)`，生成第 4 条那行说明 |
| `apps/water/ui/views/scan.mjs`、`views/cleaning.mjs` | 在停止按钮下方放这行说明 |
| `apps/water/ui/styles/app.css` | `.stop-note` 两行样式，只用 `var(--w-danger)` |
| `apps/water/ui/tests/browser.test.mjs` | 第 5～7 条 |

下面这些都没有动：
- `ipc.mjs`、`model.mjs`、`format.mjs`、`index.html`；
- `styles/tokens.css`；
- `ui-fixtures.json`；
- `unit.test.mjs`；
- 任何图标与 sprite。

没有新增 npm 文件。

## 逐条对照

### 1. 切页之后才成功的命令不改新页面

- `run()` 在发出命令时记下路由版本与 hash，并把判断函数 `inScope()` 传给命令体。原先这两个判断只用在出错分支上，现在成功分支也用同一个判断。
- `prepare`：`clean_prepare` 返回后若 `!inScope()`，直接返回。
  - 不打开永久删除确认框，也不保留这份预览。
  - 回到结果页时与没点过一样，要重新点“清理所选”，会发出新的 `clean_prepare`。
- `detail`：`group_detail` 返回后若已切页，不打开抽屉。
- 同理，`scan_start` 与 `clean_start` 成功后只在仍在原页面时 `navigate('home')`。忙碌状态与轮询照常开始，不会把用户从新页面拉回体检页。
- 测试（`ui_m1_polish`，标记 `UI_CLEAN_SCOPE`）：
  - 假宿主的 `delayedError` 现在也能“延迟成功”（`error:null`）；
  - 点“清理所选”后真实点击侧栏切到增长趋势，再放行 `clean_prepare`，断言新页面没有 `dialog[open]` 和 `dialog.confirm`；
  - 经首页“查看结果”回到结果页，断言仍没有确认框、提示条隐藏；
  - 再点一次“清理所选”才弹框，`clean_prepare` 共 2 次。
- 分组详情抽屉用同样做法断言（`UI_COMMAND_SCOPE`）。

### 2. 恢复连接后重新读取当前页

- “重新连接”（`reconnectProgress`）在恢复轮询后调用 `loadRoute(true)`。
  - `missingOnly` 模式下，只在当前页数据还没读到时（`state[route]` 为空）重新读。
  - 当前在清理记录页、且有展开中的条目时，也补读这条的详情（抽出的 `readHistoryDetail`，已有的不重复读）。
- 暂停期间读取失败的错误仍被丢弃，提示条仍只显示暂停原因与“重新连接”（G7 第 2 条不变）。
- 测试（`UI_NOTICE_SCOPE`）在清理暂停期间：
  1. 第一次进入增长趋势并让 `trends` 失败，断言页面停在“正在读取趋势…”、暂停提示条原样；
  2. 按“重新连接”后，提示条隐藏，页面出现“增长最多”，不再是“正在读取…”；
  3. 再次暂停，在清理记录展开一条体检记录，让 `scan_result` 失败，断言停在“正在读取详情…”；
  4. 按“重新连接”后，详情显示“共识别…”。

### 3. 切页后返回的 `stale` 仍然记下

- `fault(error, show)` 拆成两步：
  - `code === 'stale'` 时总是记下 `state.stale = true`；
  - 只有在原页面（`show` 为真）时才写提示条与关闭浮层。
- 结果：新页面不显示提示；回到结果页时显示“结果已过期，请重新体检后再清理。”，“清理所选”与勾选框不可点，与没切页时收到 `stale` 一样（UI-POLISH 第 3 节规则不变）。
- 测试：
  - G7 的“延迟的 stale 不改页面状态”断言，按票改为“回到结果页时提示条隐藏、`.note` 为过期句、清理所选 disabled”（`UI_COMMAND_SCOPE`）；
  - “新页面不显示提示”的断言原样保留。

### 4. 暂停期间点“停止”失败要有反馈

- `stopScan` 与 `stopClean` 改走新函数 `stop()`：
  - 失败且此时进度读取已暂停、仍在原页面时，设 `state.stopFailed = true`，再照常抛出（`run()` 里暂停期间仍不写提示条）；
  - 同一句也写进已有的 `#announcer`（aria-live），方便读屏。
- `stopNote(state)` 在“停止扫描”或“停止”按钮下方显示一行 `.cap.stop-note`：“停止请求没有送达，请先重新连接再试。”
  - 颜色是 `--w-danger`；
  - 扫描页右对齐在按钮下，清理卡片里左对齐在按钮下。
- 什么时候消失：
  - `beginPolling()`（恢复连接）与 `routeChanged()`（离开该页）清掉 `stopFailed`；
  - 再次点停止时先清掉，失败了再显示。
- 不进提示条，不替换暂停原因。
- 测试（`UI_STOP_FEEDBACK`）：
  - 暂停后点“停止扫描”且 `scan_cancel` 失败，断言说明文字精确、位于停止按钮下方、不在 `#notice` 里，暂停提示条原样；
  - 切到清理记录与回到体检页后，`#page` 里没有这句；
  - 再次失败又出现；
  - 重新连接后消失。

### 11 处冻结文字

用 `git grep -c -F` 比较首次 HEAD 与实现提交上生产代码（不含 tests）的出现次数，11 处逐条相同：

| 文字 | 次数 |
|---|---|
| 开始体检 | 2 |
| 清理所选 | 2 |
| 增长趋势 | 2 |
| 清理记录 | 4 |
| 扫描位置 | 3 |
| 开始一次体检 | 1 |
| 本次体检共识别 | 1 |
| 比较每次体检，找出一直在变大的东西。 | 1 |
| 每一次体检与清理，都有迹可循。 | 1 |
| 选择体检要看的地方。受保护的数据只统计占用，永远不会被清理。 | 1 |
| 体检未能完成，请重新体检。 | 1 |

diff 里也没有删改任何一处。

新增的唯一用户可见文字就是第 4 条那句。

### 5. 剩下的无标记等待

- 新增 `settle(expression, attempts)`：有限次轮询，每次间隔 25 ms，本身不抛错。
- `noticeSettled` 改用它，最后以 `UI_NOTICE_SCOPE` 断言判定。
- 另加两个小工具：
  - `noticeText(value, label)`：等某句文字出现；
  - `pausedNotice(label)`：等“重新连接”按钮出现，600 次，覆盖 20 次失败所需约 5 s 以上。
- 改写的等待：所有等提示条出现、消失或文字变化的地方，判定条件不变。
  - 第 1 个测试：“正在重新连接”出现。
  - 第 3 个测试：“正在重新连接”出现，暂停后的“重新连接”及按钮。
  - 第 4 个测试：
    - stale、busy、“Water 服务暂时不可用”、“请重新点击‘清理所选’并确认。”的提示；
    - “体检没有开始，请重试”；
    - unavailable 的两处（含 `reset` 里的那一处）。
  - 第 5 个测试：M1 提示、出错后进入暂停前的提示、“正在重新连接”、两处等按钮出现、stale 提示。
- 没有改写的 `waitText` / `waitFor`：都是等页面切换、数据、浮层或假宿主状态，不涉及提示条。

### 6. 有记录的清理记录页要有“清理完成”行

- `ui_m1_polish` 的有记录清理记录页改用新的假宿主选项 `cleanFinished:true`，只在测试文件里。
  - 原先这里只有两条“体检记录”行；
  - 现在列表同时有“清理完成”行与“体检记录”行。
- 断言（`UI_BRAND_MARK`）：
  - 两种行都存在；
  - 每个“清理完成”行的图标 `use` 引用 `#i-check`；
  - 原有的 `noDrop`（任何 `use` 都不引用 `#i-drop`，sprite 里没有 `#i-drop`）与“体检记录行用 `#i-pulse`”保留。
- 总控 G7 的 x1（“清理完成”行改引用水滴）现在会被这两条抓到；本票没有单独跑这条变异。

### 7. 新截图

- `stop-failed-1240x820.png` 在第 4 条说明显示时拍摄，说明当时在第 5 个测试的扫描暂停段。
- 必需截图：G7 的 19 张加这 1 张，共 20 张，检查器的 `requiredScreenshots` 核对通过。

## 检查命令与结果

在工作树根目录执行，检查器为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W5-H4 --mode …`。回执都在 `.local/checks/WATER-W5-H4/`，已由 archive 复制进 `docs/acceptance/wave5/h4/receipts/`。

| 时间（UTC） | 命令 | 结果 |
|---|---|---|
| 13:42:06 | `baseline` | passed |
| 13:49:23 | `check` | passed |
| 13:49:26 | `test` | passed（单元 3/3） |
| 13:49:42 | `browser` | failed：我自己的新断言把 `.confirm` 当成确认框。结果页的“需确认”级别标签也用这个类，改为 `dialog.confirm` |
| 13:51:12 | `browser` | failed：离开该页后的断言用 `body.textContent`，读到了 `#announcer` 里的同一句。改为只看 `#page` |
| 13:52:33 | `browser` | passed（5/5，25 张图） |
| 13:54:46 | `red-nc1` | passed（见负控） |
| 13:55:33 | `test` | passed（恢复后） |
| 13:55:45 | `red-nc2` | passed |
| 13:56:49 | `test` | passed（恢复后） |
| 13:57:00 | `red-nc3` | failed：检查器拒收，“Syntax, module or timeout failures are not proof”。见负控 nc3 |
| 13:58:13 | `test` | passed（恢复后） |
| 13:59:13 | `red-nc3` | passed，原样重跑一次 |
| 14:00:25 | `test` | passed（恢复后） |
| 14:00:44 | `check --final` | passed |
| 14:00:48 | `test --final` | passed；proof audit 认 nc1、nc2、nc3 三条，各自配对恢复后的绿 |
| 14:00:51 | `browser --final` | passed：`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`、`ui_m1_polish` 全过 |
| 14:02:26 | `archive` | passed |

前两次 browser 失败都在本票新写的测试代码，产品代码当时没有问题，修的是断言本身。

## 三条负控

每条只改 `apps/water/ui/app.mjs` 里真正被调用的一处，不改测试；跑完立即 `git checkout -- apps/water/ui/app.mjs`。恢复后文件 sha256 都是 `c38b2e80bffe96b53dd5dfb15d31e9c774fa59e823e483a6f24dd9c746e38b34`，与实现提交里的字节相同，随后跑 `--mode test` 都变绿。三条的日志里 `timed out|timeout` 计数都为 0。

| 负控 | 改了哪一处 | 失败信息 |
|---|---|---|
| nc1 | 删掉 `prepare` 里 `clean_prepare` 返回后的 `if (!inScope()) return;` | 只有第 5 个测试失败：`UI_CLEAN_SCOPE: a clean_prepare that succeeds after leaving results opens no confirmation on the new page` |
| nc2 | `reconnectProgress` 去掉 `void loadRoute(true);` | 只有第 5 个测试失败：`UI_NOTICE_SCOPE: trends is read again after reconnect and shows its data` |
| nc3 | `stop()` 去掉 `state.stopFailed = true;`（`#announcer` 那句保留） | 只有第 5 个测试失败：`UI_STOP_FEEDBACK: a stop that fails while paused shows the line under the stop button, outside the notice` |

关于 nc3：
- 第一次运行（13:57:00），第 5 个测试照样带 `UI_STOP_FEEDBACK` 失败。但第 4 个测试 `ui_layout_states_a11y` 在第 333 行出现 `Browser condition timed out`，检查器因此拒收。
  - 那一行是“重新扫描 → 停止扫描 → 等结果页‘部分结果’”，不经过暂停，`stopFailed` 在那里永远为假。
  - 所以判断是机器忙（同机有其它票在编译）造成的偶发，不是这条变异引起的。
- 按规则第 4 节，原字节恢复、跑绿 `test` 后，同一处变异原样重跑一次（13:59:13）：只有第 5 个测试带标记失败，没有超时，检查器通过。
- 这次偶发我没有另外复现；final 的 browser 与之前的绿色 browser 都没有出现。

## 截图逐张

证据目录 `docs/acceptance/wave5/h4/screenshots/` 下有两次通过的 browser 运行：
- `2026-10-27T13-52-33.939Z-13792/`：开发时的绿色运行；
- `2026-10-27T14-00-51.240Z-43104/`：`browser --final`。

以下按 final 组逐张描述，每张都打开看过。另外与总控 G7 验收组（`accept-20261027/g7/screenshots/2026-10-27T11-15-07.023Z-36704/`）做了逐字节比较：

| 与 G7 验收组相比 | 截图 |
|---|---|
| 字节相同（16 张） | about、busy、confirm、detail、home-last-scan、loading、locations、notice-results、notice-trends、reconnecting、results-1040x720、results-bottom 两张、stale、trends-empty、unavailable |
| 不同（8 张） | cleaning、done、history、home、paused、results-1240x820、scan、trends，另加新的 stop-failed |

8 张不同的里，除 history（清理完成行）与 paused 之外，差别只来自水波动画与进度时刻。

重点几张：
- **stop-failed**：
  - 体检进行中（AI 编程工具扫描中，8%）；
  - 顶部提示条只有宿主原因“Water 服务暂时不可用。”与“重新连接”按钮；
  - “停止扫描”按钮正下方、右对齐一行红色小字“停止请求没有送达，请先重新连接再试。”；
  - 提示条里没有这句，暂停原因没被替换。
- **confirm**：
  - 永久删除确认框，标题“永久删除 31.2 GB?”，“将清理 13 组，共 2,250 项”；
  - 下方是分组列表与红色提示“这些文件将被永久删除，不进入回收站，无法恢复。”；
  - 按钮“取消”与红色“永久删除 31.2 GB”；
  - 背景是模糊的结果页。与 G7 字节相同。
- **paused**：
  - 清理进行中（第 1 / 13 组，Claude 桌面版旧版本，已释放 4.2 GB）；
  - 顶部是宿主原因“Water 服务暂时不可用。”与“重新连接”按钮；
  - 停止按钮下没有说明，因为这里没有点过停止。
- **reconnecting**：体检进行中，顶部只有“正在重新连接 Water 服务…”，没有按钮。与 G7 字节相同。
- **stale**：
  - 结果页滚动后，顶部提示条“结果已过期，请重新体检后再清理。”与“关闭提示”；
  - 提示条下方隐约透出正文里的同一句过期说明（`.note`，被固定的提示条盖住一半）；
  - 底部操作坞里“清理所选”为灰色不可点。
  - 与 G7 验收组字节相同，所以这个重叠不是本票带来的。
- **history**（清理记录）：
  - 三行：第一行“清理完成”，勾号图标，10 月 26 日 13:09，30.7 GB 已释放；
  - 另两行“体检记录”，脉搏线图标；
  - 没有水滴。

其余：
- **home**：
  - 首次未体检的首页：系统盘 C: 59.8 GB 可用、水位瓶；
  - 说明折成“共 250.1 GB，已用 76%。体 / 检后可查看能够清理的空间。”，末行 13 字；
  - D/E/F 三块小卡；“开始体检”圆钮与“开始一次体检”。
- **loading**：首页“正在读取…”空态（冰山图标），没有“无法连接”，侧栏版本只写“Water”。
- **scan**：体检 62%，已发现 27.5 GB；前三类已完成，应用更新与安装包扫描中；“停止扫描”下没有说明。
- **results-1240x820**：
  - 可放心清理 31.2 GB，右侧识别 53.5 GB 的四色条；
  - Codex 洞察卡；AI 编程工具分组；
  - 底部操作坞“已选 13 组 31.2 GB / 重新扫描 / 清理所选”。
- **results-1040x720**：同一页面窄尺寸，无横向溢出。
- **results-bottom-1240x820 / 1040x720**：
  - 长结果滚到底，最后是“未识别”分类的三行；
  - 与操作坞之间有明显空隙（测量 gap 65.6 px 与 66 px）。
- **detail**：Codex 插件市场升级残留抽屉：3.6 GB、23 小时前、47/48 等，背景模糊。
- **cleaning**：清理进行中，已释放 4.2 GB，第 1 / 13 组，“停止”按钮，没有提示条。
- **done**：
  - 30.7 GB 已释放，C:、F: 两个水位瓶与前后对比；
  - 逐组清单，Chrome 网页缓存为黄色警示“部分完成 · 6 个配置正在使用，已跳过”。
- **trends**：C: 盘可用空间折线（5 次体检，标注 10-01、10-23、清理后、今天），增长最多列表与疑似泄漏卡。
- **trends-empty**：冰山空态“再体检一次就能看到变化”。
- **locations**：七个分类开关（崩溃与日志关闭）与自定义文件夹 `F:\new\smaltalk\water`。
- **about**：品牌卡（墨色冰山，版本 0.1.0）与四段隐私说明。
- **notice-results**：结果页顶部 M1 原文“这一版只做体检，清理功能会在下一版开放。”与“关闭提示”。
- **notice-trends**：切到增长趋势后没有旧提示。
- **busy**：上次体检后的首页，顶部“正在进行另一项任务，请稍候。”与“关闭提示”。
- **home-last-scan**：有上次体检的首页，浅绿一层可释放空间、“查看结果”。
- **unavailable**：顶部“无法连接 Water 服务”，冰山空态与“重新连接”按钮。

## 没做或没验证的事

- 没有在真实 Tauri 窗口里看；只在检查器的私有 headless Chrome 里用假宿主验证。
- G7 审查第 3 条（低）没有改：清理在“清理记录”页结束时会重新读列表，进行中的详情读取失败的错误被静默丢掉。它不在本票的 7 条里。
- 第 2 条的重新读取只在按“重新连接”时触发，没有加“页面数据仍缺时自动重读”的其它路径。票里要的是前者。
- 第 1 条的测试覆盖了 `clean_prepare` 与 `group_detail` 的延迟成功。`scan_start` 与 `clean_start` 成功后不再跨页 `navigate('home')` 这一处没有专门的测试。
- 总控 G7 的 x2（`run()` 去掉暂停期间不写错误的判断）与 x1（清理完成行改引用水滴）这两条变异，本票没有重跑。按设计，x1 现在应被第 6 条的断言抓到。
- 后台进程：交回前确认检查器与 Chrome 都已退出，没有留下本票启动的后台进程。
