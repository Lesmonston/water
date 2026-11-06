WATER-W10-M11 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m11/docs/dispatch/reports/WATER-W10-M11-REPORT.md

# WATER-W10-M11 回执：界面小修，M6 留下的四处小毛病（轻门）

| 项 | 值 |
|---|---|
| 实际模型 | Claude Opus 5.5（`claude-opus-5-5`），经 Claude Code（Claude Agent SDK）在 mirasim 里运行 |
| 接手说明 | 本单先由一个 Codex 会话开工（rollout `01a1b189-b7fb-71a0-892e-d72e04dbdfdb`）：读了工单、规则、M6 原单与补单 03、代码，在未动的首次 HEAD 上跑过一次 baseline（`2026-11-06T15-48-50.330Z-29376`，通过），随后被用户中断，没有改任何文件。之后由本模型在同一工作树接手，读同样的材料后完成全部工作。 |
| 首次 HEAD | `32d7b642c56361ede7be9df453cba594ae2c3dd7`，接手时工作树干净、分支 `worker/water-w10-m11` |
| 实现提交 | `5b7c422d9c6afc1ce30f5f842a34f3a595632d43`（`fix(ui): finish the four M6 lows for W10-M11`） |
| 改动文件 | `apps/water/ui/app.mjs`、`apps/water/ui/views/charts.mjs`、`apps/water/ui/tests/browser.test.mjs` |
| 源码哈希（检查器） | productionHash `41b1a0754c9888a7fd080773672f66ca7febdb5fab78a620c2a953b4a30a28c7`；testHash `448f0034ecd558f7a366d7c92eacfde1cdddc8c96f62e093af46d215ec92ff88` |
| 提交身份 | 只在提交命令的进程里设 `Claude Opus 5.5 <claude-opus-5-5@localhost>`；没改 git 配置与远端，没 push，没改写已有提交 |

下面的行号指实现提交 `5b7c422d`。

## 1. 四处逐项

### 1.1 热力格子在夏令时跳过零点的时区少画最新一天

- **改在哪里**：`views/charts.mjs` 第 87～89 行。记录仍按本地零点归到各自那天，日期键仍用 `format.mjs` 的 `localDateKey()`；新增 `lastKey = localDateKey(last)`，逐天循环的条件从 `day.getTime() <= last` 改成 `localDateKey(day) <= lastKey`，并加了一行注释说明原因。
- **怎么满足**：智利 2026-09-06 的零点不存在，`setDate()` 之后 `day` 停在 01:00。现在比的是本地日期键而不是时间戳，9 月 8 日 01:00 的键 `2026-09-08` 不大于最新一天的键，最后一格照常画出；再下一天的键更大，循环结束。`setDate(+1)` 每步恰好前进一个本地日历日，中间不少一天、不重一天。起点仍是起始那周的周一；`latest` 类仍加在 `entries[0]`（最新记录）所在那天的格子上。日本时间等没有夏令时的时区，走法和结果都不变。

### 1.2 有别的请求在途时，“体检”点击被吞掉

- **改在哪里**：`app.mjs` 第 213～216 行（导航“体检”的点击）与第 33～36 行（`run()` 的 `finally`），以及第 20 行新增的模块变量 `checkupQueued`。
- **怎么满足**：
  - 点击符合拦截条件时先 `preventDefault()`；如果这时 `s.pending` 为真（有请求在途），只记下 `checkupQueued = true`，否则照旧 `a.returnToCheckup()`。连点多次只是把同一个标志再设一次，所以只算一次。
  - 在途请求结束后，`run()` 的 `finally` 先清 `pending`、重画，再看有没有记下的点击：有就先清标志，再用 `checkupIsReturn()` 按**当时**的状态判断一次。仍符合（仍在体检页、空闲、显示查重结果或完成页）就照常返回体检；状态已经变了（例如开始了清理，`busy` 不再是 `idle`；或已离开体检页；或已不在查重结果/完成页）就不做。

### 1.3 拦截“体检”不看当前在哪一页，清掉了查重结果

- **改在哪里**：`app.mjs` 第 22 行新增 `checkupIsReturn = () => s.route === 'home' && s.busy === 'idle' && ['dedupe', 'done'].includes(s.mode)`，导航点击（1.2）和请求结束后的重判都用它。
- **怎么满足**：在隔离区、趋势、记录、设置点“体检”时路由不是 `home`，不拦截，链接照常把 hash 改回 `#home`。`s.mode`、`s.dedupe`、`s.cleaned` 都没动，画出的就是离开前的查重结果或完成页；`home` 路由在 `loadRoute()` 里不发任何命令，所以不会多读 `dedupe_result` 或 `conclusion_get`。回到那一页之后路由是 `home`，再点一次“体检”才按补单 03 返回：查重结果页回结论页（没有结论回首页），完成页与“完成”相同（重读结论；`not_found` 回首页）。

### 1.4 首页“打开文件夹”偶尔没反应

- **改在哪里**：`app.mjs` 第 185 行 `revealRoots`。
- **怎么满足**：读 `quarantine_list` 期间 `quarantineRevision` 没变，才把回复装进 `s.quarantine`；变了（例如永久删除结束、`installQuarantine` 已装上更新的视图）就丢掉这份较早的回复，不盖掉更新的视图。但这次点击不再就此结束，而是接着用当前的 `s.quarantine.roots`：一个根就 `quarantine_reveal` 它；多个根就弹选择框；一个根都没有了就什么也不弹，也不报错。

样子、文案、令牌、数据、命令与其它行为都不变；`index.html`、样式、其它视图都没有改。

## 2. 新增的断言

现有断言一处未改；测试数不变（浏览器 6 个、单元 3 个，名字照旧）。假宿主只在测试文件里加了两个开关，产品代码里没有任何测试入口：

- `c.holdNext = '<命令>'`（`tests/browser.test.mjs` 第 32 行）：下一次该命令先扣住，测试调 `c.release()` 放行后照常回复；
- `c.purgeView`（第 87 行）：永久删除结束时，隔离区换成测试内存里给的视图；不设时仍是原来的 `v2_quarantine_leftover`。

样例变体都在测试内存里构造，样例文件没有改。

| 改动 | 放进的测试 | 断言与失败信息 |
|---|---|---|
| 1.1 | `ui_v2_pages_layout_a11y`（第 491～499 行） | 用 `Emulation.setTimezoneOverride` 切到 `America/Santiago`，记录用工单实测的两条（`2026-09-03T15:00:00Z`、`2026-09-08T15:00:00Z`），期望日期在页面里用产品同一个 `localDateKey()` 算，不写死。`UI_V2_PAGES: a midnight skipped by DST still leaves a latest cell for the newest day`（最新一天有格子、带 `latest` 类、标题含该条的 `summary_zh`）；`UI_V2_PAGES: heat cells cover every local day from Monday to the newest, none missing or repeated`（第一格是周一，最后一格是最新一天，相邻两格恰好差一天）。用完在 `finally` 里恢复时区，照首次 HEAD 第 423～430 行的写法。 |
| 1.2 | `ui_v2_quarantine_dedupe`（第 392～402 行） | 有结论、无结论各一次：查重结果页扣住 `dedupe_decide`，连点两次“体检”。`UI_V2_DEDUPE: 体检 clicked during a pending request waits for it`；放行后 `UI_V2_DEDUPE: queued 体检 returns once the pending request ends`（回结论页或首页）；`UI_V2_DEDUPE: repeated 体检 clicks during a request return only once`（无结论时 `conclusion_get` 只多一次）；`UI_V2_DEDUPE: queued return has no spurious error`。 |
| 1.3 查重 | `ui_v2_quarantine_dedupe`（第 403～410 行） | 查重结果页 → 隔离区 → “体检”：`UI_V2_DEDUPE: 体检 from another page shows the dedupe result left behind`；`UI_V2_DEDUPE: going back to the dedupe result rereads neither dedupe_result nor conclusion_get`；再点“体检”：`UI_V2_DEDUPE: a second 体检 click on the dedupe result then returns`。 |
| 1.3 完成 | `ui_v2_confirm_done`（第 307～315 行） | 完成页 →“去隔离区”→“体检”：`UI_V2_CONFIRM: 体检 from another page shows the done page left behind`；`UI_V2_CONFIRM: going back to the done page rereads nothing`；再点“体检”：`UI_V2_CONFIRM: a second 体检 click on the done page then finishes like 完成`。 |
| 1.4 | `ui_v2_quarantine_dedupe`（第 411～435 行） | 永久删除进行中回首页，扣住“打开文件夹”发出的 `quarantine_list`，等删除结束、新视图装上（又调了 `app_state`）后再放行。三种新视图各一次：一个根 → `UI_V2_QUARANTINE: open folder still finishes on the newer view after a purge ends mid-read`（调了 `quarantine_reveal`，参数是新视图的根）；两个根 → `UI_V2_QUARANTINE: several roots after a purge open the chooser on the newer view`、`UI_V2_QUARANTINE: chooser opens the chosen root`；没有根 → `UI_V2_QUARANTINE: no roots left means no empty chooser and no error`、`UI_V2_QUARANTINE: nothing to open once every root is gone`。 |

新增的等待（`wait()`）都显式传了本条的标记，超时时的失败信息同样以 `UI_V2_…:` 开头（nc3 就停在这样的等待上，见第 4 节）。

## 3. 检查命令与结果

都在工作树根目录 `F:/new/smaltalk/water/.worktrees/w10-m11` 执行 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M11 --mode <模式> [--final]`。每次跑之前按进程名看过，没有别的 node 检查进程。回执在 `.local/checks/WATER-W10-M11/`，已归档到 `docs/acceptance/wave10/m11/receipts/`。

| 模式 | 回执时间戳 | 结果 |
|---|---|---|
| baseline | `2026-11-06T15-48-50.330Z-29376`（前一会话，在未动的 `32d7b642` 上）；另有总控预检 `2026-11-06T15-43-40.947Z-25636` | passed |
| check | `2026-11-06T16-03-09.993Z-20088` | passed |
| test | `2026-11-06T16-03-26.222Z-19272` | passed（单元 3 个） |
| browser | `2026-11-06T16-03-37.361Z-19204` | passed（浏览器 6 个，25 张截图） |
| red-nc1 | `2026-11-06T16-05-23.027Z-34232` | passed（按预期以 `UI_V2_PAGES` 失败） |
| browser / test | `2026-11-06T16-06-13.681Z-38484` / `2026-11-06T16-07-14.536Z-9644` | passed / passed |
| red-nc2 | `2026-11-06T16-07-40.807Z-24108` | passed（按预期以 `UI_V2_DEDUPE` 失败） |
| browser / test | `2026-11-06T16-08-40.567Z-3096` / `2026-11-06T16-09-24.708Z-36096` | passed / passed |
| red-nc3 | `2026-11-06T16-09-41.423Z-33748` | passed（按预期以 `UI_V2_QUARANTINE` 失败） |
| browser / test | `2026-11-06T16-10-45.890Z-23540` / `2026-11-06T16-11-30.364Z-24748` | passed / passed |
| check --final | `2026-11-06T16-11-47.475Z-37712` | passed；HEAD `5b7c422d`，`git status` 干净 |
| test --final | `2026-11-06T16-11-53.525Z-4764` | passed；负控审计 nc1→`16-07-14.536Z`、nc2→`16-09-24.708Z`、nc3→`16-11-30.364Z` |
| browser --final | `2026-11-06T16-11-58.207Z-26572` | passed；25 张截图按名字核对通过 |
| archive | `2026-11-06T16-13-13.548Z-38176` | passed |

- 最早的 check、test、browser 是在提交前对同样的字节跑的，源码哈希与 final 完全相同（productionHash `41b1a075…`、testHash `448f0034…`）。
- 所有浏览器运行都一次通过，没有超时，也没有重跑。

## 4. 负控

做法：每条只改 `apps/water/ui/` 生产代码里真正被调用的一处，不改测试；跑 `--mode red-ncN`；用 `git checkout -- <文件>` 恢复原字节，立即跑 `--mode browser`，再跑 `--mode test`（检查器的负控审计要找红之后的绿色 `test`，与 M6 的顺序相同），之后才做下一条。三次红跑里都没有语法、模块或超时错误。

| 负控 | 改了哪一处 | 失败信息 | 恢复后 |
|---|---|---|---|
| nc1 | `views/charts.mjs` 第 89 行循环条件 `localDateKey(day) <= lastKey` 改回 `day.getTime() <= last`（1.1 的旧写法） | 5 过 1 败。`ui_v2_pages_layout_a11y`：`UI_V2_PAGES: a midnight skipped by DST still leaves a latest cell for the newest day` | `charts.mjs` sha256 `2e14b1a734f930e13e1ed2d59a91f0661c16a63c4e0ebe6495e49ab2e12fa8ac`（与提交一致）；browser、test 变绿 |
| nc2 | `app.mjs` 第 22 行去掉 `s.route === 'home' &&`（1.3 的旧写法） | 4 过 2 败。`ui_v2_quarantine_dedupe`：`UI_V2_DEDUPE: 体检 from another page shows the dedupe result left behind`；`ui_v2_confirm_done` 也停在本单新增的 1.3 断言上：`UI_V2_CONFIRM: 体检 from another page shows the done page left behind`（`'results' !== 'done'`）。两条都是新增断言，没有旧断言失败。 | `app.mjs` sha256 `cd9799226c42d876f9ad29a75a9293123aaccd3c3d8b45f4cd2364a4fc95d560`（与提交一致）；browser、test 变绿 |
| nc3 | `app.mjs` 第 185 行 `if (revision === quarantineRevision) s.quarantine = view;` 改回 `if (revision !== quarantineRevision) return; s.quarantine = view;`（1.4 的旧写法） | 5 过 1 败。`ui_v2_quarantine_dedupe`：`UI_V2_QUARANTINE: window.__waterTest.calls.filter(x=>x.command==="quarantine_reveal").length>0`（这次点击始终没有调 `quarantine_reveal`） | `app.mjs` sha256 `cd9799226c42d876f9ad29a75a9293123aaccd3c3d8b45f4cd2364a4fc95d560`；browser、test 变绿 |

## 5. 截图与 M6 交回时比较

`browser --final` 生成 25 张，检查器按名字核对通过，归档在 `docs/acceptance/wave10/m11/screenshots/2026-11-06T16-11-58.207Z-26572/`。与 M6 交回时的 `docs/acceptance/wave10/m6/screenshots/2026-11-06T10-37-31.290Z-35664/` 逐张比 sha256：**25 张字节完全相同**，没有看得出的差别（连像素差别也没有），与本单预期一致。本单的四处改动都不在这 25 个画面的路径上：夏令时、在途点击、跨页返回、删除途中打开文件夹，都只在新增的断言里出现。其余四次 `browser` 的截图也由归档器一并归档。

## 6. 行尾与编码

- 三个改动文件在索引与工作树里都是 LF（`git ls-files --eol`：`i/lf w/lf`），没有混用。
- `apps/water/ui/index.html`、`styles/app.css`、`apps/water/ui/.gitattributes` 在本工作树里是整份 CRLF（`core.autocrlf=true` 加 `text=auto` 检出的结果，不是混用）。本单没有改它们，也没有改 git 配置；final 记下的这三份字节哈希与 M6 已验收的 final（`10-37-31.290Z-35664`）完全相同。跑 final 前 `git status` 干净。
- 本回执用文件写入工具直接以 UTF-8 写入，没有经过会按系统代码页转码的管道或重定向。提交前用 Node 按 UTF-8 读回整份，检查没有连续的问号，也没有替换字符 `U+FFFD`。

## 7. 没做或没验证的事

- 1.2 没有专门的负控（本单只要求三条）。旧代码在请求在途时直接丢掉点击，页面停在查重结果页，1.2 的新断言在旧代码上会失败；这一点是按代码推断的，没有单独跑红。
- nc2 同时让 `ui_v2_confirm_done` 失败（同为本单新增的 1.3 断言）。检查器只要求目标标记出现，这次红跑仍然有效。
- 只在智利时区下测了 1.1。循环按本地日期键比较，对任何零点被跳过或重复的时区都成立；整天被跳过的极端情况（如 2011 年萨摩亚）没有处理，也不在本单要求内。
- 没有在真实 Tauri 窗口或真实服务上试；全部用样例与测试里的假宿主（本单没有真实数据权限）。macOS 未验证。
- baseline 是前一个会话在同一工作树、同一未动的首次 HEAD 上跑的。我接手时核对了 HEAD 为 `32d7b642`、工作树干净，没有再跑一次。
- 另外发现但没有改（不在本单四处之内）：完成页的“完成”按钮在有请求在途时同样会被 `run()` 丢掉（`a.finish` 走的是同一个 `run()`），但完成页上通常没有别的请求在途。
- 没有 merge、rebase、push，没有改台账、契约、样例、设计稿、检查器和其它包。
