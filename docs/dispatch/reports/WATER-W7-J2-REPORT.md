WATER-W7-J2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w7-j2/docs/dispatch/reports/WATER-W7-J2-REPORT.md

执行者：Codex（GPT-6，按当前运行环境所给身份记录；不是以 manifest 的 astra 排期标签代替实际模型）。完成日期：2026-10-29 JST；证据文件名使用 UTC，仍为 2026-10-28。没有子代理或分包实现者。

## 交付与范围

- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w7-j2`；分支：`worker/water-w7-j2`。
- 首次 HEAD：`282876950df40a14b7abeec6ab27677ea0adc897`，开工时干净，baseline 通过。
- 实现提交：`ef03770c5f7aeed721671e365709b17e74bae29f`，提交标题 `fix(ui): complete W7 J2 recovery and notice fixes`。
- 实现仅改五个文件：`apps/water/ui/app.mjs`、`styles/app.css`、`views/cleaning.mjs`、`views/results.mjs`、`tests/browser.test.mjs`。
- 实现后的提交只包含本回执与检查器生成的 `docs/acceptance/wave7/j2/` 证据；不修改主线、契约、工具、manifest 或其它票目录。
- 三个 final 在上述干净实现提交上通过；单测精确 3 个、浏览器测试精确 5 个，名称不变，无 skip/todo/cancelled。最终浏览器用时 82,513.3589 ms。
- 提交身份仅在提交进程环境中设置为 `Codex GPT-6 <codex-gpt-6@localhost>`；未修改 Git 配置、远端或历史，未 push、merge、rebase、amend、reset。

## SPEC 第 1～8 条

| 条 | 实现与验证 |
|---|---|
| 1. 恢复清连接类读取错误 | `fault` 同步记录 `errorCode`，所有清错入口共用 `clearError`；本地生成的扫描错误也经过 `fault`，避免留下旧 code。`readProgress` 第一次恢复成功时，只清 `unavailable`/`busy`，然后补读缺失数据。`UI_RECOVER_ERROR` 在尚未暂停的重连期切趋势页并注入读取失败，分别覆盖 unavailable、busy、not_found、stale；恢复后前两者隐藏提示且有趋势数据，后两者原句仍在。 |
| 2. 补读不阻塞进度 | 恢复分支使用 `void loadRoute(true)`，当次进度照常返回。`UI_RECOVER_NONBLOCK` 拦住趋势补读，实际清理轮询仍读到终态并调用 `clean_result`；确认页面响应尚未释放，最后放行并看到趋势数据。 |
| 3. 同页读取顺序 | `routeReads` 按页面给实际发出的读取递增编号；`isLatest` 与原路由版本、hash 检查共同保护结果、错误和渲染。旧读取错误在调用 `fault` 之前丢弃，因此不会写提示或 stale。由该次读取发起的历史详情也带当前性检查。missingOnly 没发出新页面读取时不徒增编号。`UI_READ_ORDER` 在清理记录页挂起首读，让清理结束重读先返回，再放行旧成功、not_found 或 stale；新记录和提示状态均保持。 |
| 4. 读屏区隔开 | `stop` 清空 `#announcer` 后延迟 120 ms 重写，保留 `stopFailed && inScope()` 判断；重排计时前取消旧计时器，pagehide 也取消。原 `UI_CLEAN_STOP` 清空/重写顺序断言保留，新增 MutationObserver 的 `performance.now()` 时间戳断言，重写减清空必须至少 100 ms。 |
| 5. clean_start 过期 | `clean_start` 捕获到 stale 时原样抛回，不追加重新点击后缀；其它错误仍保留原后缀。结果页按 `errorCode === 'stale'` 隐藏重复正文，连接提示覆盖、关闭错误或换页后照旧恢复说明。`UI_STALE_START` 覆盖原服务句子和另一条不同的 stale 文案、确认框关闭、按钮禁用、正文不重复及关闭提示后的恢复；原 unavailable 后缀断言保留并追加精确后缀检查。 |
| 6. 停止说明 | `views/cleaning.mjs` 原句替换为“一字不差”的 `停止后，正在删除的这一项会停在中途，已经删掉的部分无法恢复。`。`UI_CLEAN_TEXT` 同时断言新句存在与旧句不存在，cleaning 截图显示新句。 |
| 7. 提示条顶部 | 保留 sticky 的 40 px 位置。提示条显示期间，顶部 titlebar 提高层级并从 `--w-window` 提取同色不透明底，遮住滚过的文字；提示条自身使用既有强玻璃模糊 token。没有改 token、图标、布局体系或增加渐变。`UI_NOTICE_TOP` 把过滤栏滚到顶部后逐像素取样空隙中的命中元素，并验证遮罩不透明，不能只靠透明元素挡住 hit test 过关；截图再把第一张分类卡完整放在提示条下 16 px。最终 stale 图没有上方漏字或被压住的半行标题。 |
| 8. 有标记失败 | `settle` 在页面上下文中捕获表达式异常并返回 false，保留既有表达式、次数及间隔，最终由原有标记断言报告失败。控制台错误用 `splice(0)` 收集到当前测试，beforeEach 重置该测试集合，afterEach 必检，错误信息含 `UI_TEST_BOUNDS` 与测试名；reset 仍检查本测试前一个场景。一个测试的错误不会累积污染下个测试。 |

IPC 模块及调用参数、`ui-fixtures.json`、`styles/tokens.css`、图标 sprite、UI-POLISH 的 11 处文字、确认清理警示和按钮、清理完成/查看记录/停止文字、H4 停止失败句均保持。单位测试文件未修改。

## 获准变更的旧断言与等待

这里只改 SPEC 第 9 节授权的等待/控制台检查。原来没有对旧清理说明或 stale clean_start 后缀的专门断言，所以新增目标断言，没有替换或删弱旧业务断言。

| 位置 | 原文 | 新文/方式 | 判定 |
|---|---|---|---|
| settle 求值 | `settled = await browser.evaluate(expression);` | 在浏览器内求值 `(() => { try { return !!(表达式); } catch { return false; } })()` | 正常表达式的真值条件不变；元素暂时缺失不再抛出无标记错误；200/400/600 次界限、25 ms 间隔均不变。 |
| safeCalls 收集 | `errors.push(...await browser.evaluate('window.__waterTest.errors'));` | `errors.push(...await browser.evaluate('window.__waterTest.errors.splice(0)'));` | 每条浏览器错误只归集一次，当前测试内所有场景仍必须没有错误。 |
| safeCalls 断言信息 | `assert.deepEqual(errors, [], 'No console errors, runtime errors or unhandled rejections across any scenario');` | `assert.deepEqual(errors, [], \`UI_TEST_BOUNDS: ${currentTest}: no console errors, runtime errors or unhandled rejections in this test\`);` | 原空数组条件保持，增加标记和测试归属。 |
| suite after 的错误检查 | `try { if (browser) await safeCalls(); } finally { ...close... } assert.deepEqual(errors, []);` | `afterEach(async () => { if (browser && scenario) await safeCalls(); });`；beforeEach 清当前测试集合；suite after 只保证 Chrome/服务器关闭 | 每个测试终点都检查空数组，避免一个旧错误连带后续测试与 suite after 无标记失败；原各处 safeCalls 调用仍在。 |

原读屏区 `announcements.indexOf('') < announcements.indexOf(stopNote)` 断言原样保留，只在原 MutationObserver 旁添加时间记录与新间隔断言。原 stale 提示、禁用、返回后正文和不可用 start 重试断言原样保留。截图位置增加了第 7 条要求的滚动与完整卡头检查，没有更改旧可见性断言。

## 开发期失败与修正

- `14-38-56.709Z-27640`：先补测试、未改生产代码，5/5 分别以 `UI_RECOVER_ERROR`、`UI_RECOVER_NONBLOCK`、`UI_CLEAN_TEXT`、`UI_STALE_START`、`UI_CLEAN_STOP` 复现；旧读屏清空至重写约 1.9 ms。它是问题复现，不冒充正式负控。
- `14-47-44.958Z-26496`：最初尝试提示条 top:0，4/5 通过，旧 busy 可见性断言失败；截图还透出滚过的文字。改回原 40 px 位置并遮住上方空间，旧断言未改。
- `14-50-59.671Z-24304`：5/5 通过；看图仍发现半透明顶部有淡字，随后改为同色不透明底并补遮罩断言、调整 stale 图取景；同时取消旧读屏计时器。
- `14-54-59.354Z-39988`：4/5 通过，新增取样表达式中的正则放进模板字符串后转义丢失，报 `Browser expression threw`；改成不需要转义的颜色字符串判断。这次错误不计作负控。
- `14-56-54.750Z-17688`：修正后 5/5 通过；此后提交实现、完成三条正式负控与全部 final，未再修改产品字节。

这些失败的日志与源码快照均由 archive 保留，没有删除失败证据。没有 Chrome 失去响应或连续两次同样的基础设施失败。

## 正式负控与逐次恢复

三条均只修改 `app.mjs` 中实际执行的一处，测试文件不变，无测试开关。每条检查器退出 0，内部五个浏览器测试退出 1（4 passed / 1 failed），证明目标负控有效；输出均无 `SyntaxError`、模块缺失、`CDP timeout` 或 `timed out`。

| 负控 | 实际变异 | 目标失败原文 | 红记录 UTC 前缀 | 随后恢复 test 记录 UTC 前缀 |
|---|---|---|---|---|
| nc1 | 恢复分支 `['unavailable', 'busy'].includes(state.errorCode)` 改成 `[].includes(state.errorCode)` | `UI_RECOVER_ERROR: recovery clears unavailable: {"hidden":false,"message":"Water 服务暂时不可用。"}` | `2026-10-28T15-01-17.254Z-35384` | `2026-10-28T15-04-33.627Z-41548` |
| nc2 | `const isLatest = () => request === routeReads.get(current);` 改成 `const isLatest = () => true;` | `UI_READ_ORDER: an older success cannot overwrite the new history` | `2026-10-28T15-05-15.159Z-16812` | `2026-10-28T15-09-16.092Z-12412` |
| nc3 | 删除 clean_start catch 内 `if (error?.code === 'stale') throw error;` | `UI_STALE_START: show only the host sentence, without the retry suffix` | `2026-10-28T15-11-57.165Z-17720` | `2026-10-28T15-15-42.215Z-31340` |

每次看到负控完成后执行 `git checkout -- apps/water/ui/app.mjs`，接着同一 shell 运行 `--mode test`，均 3/3 通过，才开始下一条。三次恢复后 app.mjs SHA-256 均为：

```text
f2d946f1276453bb1de22d1d501d3c1228f6b6c6e2d58ea05b4a7c4f3649c699
```

final test 的 `proofAudit` 认定三组红/绿有效且快照哈希匹配。最终 productionHash 为 `9343f356b697a28eb3b3fb805af9d25b48d2788ce73ad606f6446f32c788a283`；testHash 为 `e99bbfd47228c10db1aab814598ce026c035b7bd440231b9eeb68eac549c59c0`。

## 最终截图逐张检查

最终截图目录：[2026-10-28T15-16-30.065Z-41508](../../acceptance/wave7/j2/screenshots/2026-10-28T15-16-30.065Z-41508/)。已逐张打开全部 26 张，不只依赖自动断言；工单列出的 21 张和原测试额外 5 张名字保持。下表文件名省略 `.png`。

| 截图 | 看到的内容 |
|---|---|
| home-1240x820 | 未体检首页，59.8 GB 可用、水位瓶、其它盘条、蓝色开始体检按钮；冰山标志和脉搏导航保持。 |
| scan-1240x820 | 27.5 GB / 62% 水波进度，右侧分类状态与停止扫描，文件数和时间完整。 |
| results-1240x820 | 推荐 31.2 GB、识别 53.5 GB、四级比例、过滤栏、分类卡及悬浮操作坞；未换风格。 |
| results-1040x720 | 同一结果压到最小尺寸，过滤/排序及操作坞保持在窗口内，无横向溢出。 |
| detail-1240x820 | 右侧白色磨砂抽屉、69,947 文件、3.6 GB、47/48 和三段说明，背景模糊，长详情内部滚动。 |
| confirm-1240x820 | 永久删除 31.2 GB、13 组 2,250 项、滚动分组清单、完整不可恢复红色警示、取消与带体量的危险按钮。 |
| cleaning-1240x820 | 4.2 GB 已释放、第 1/13 组、3/2,250 项，新停止说明完整显示在停止按钮上方，旧承诺不再出现。 |
| done-1240x820 | 30.7 GB 已释放、预计/实际差额、两只磁盘水位瓶、跳过 6 个在用配置及查看清理记录。 |
| trends-1240x820 | 五次体检曲线、增长列表、疑似泄漏建议卡，浅蓝与棕橙语义色保持。 |
| history-1240x820 | 最新清理 30.7 GB 与两条体检记录，清理勾号、体检脉搏图标，时间倒序。 |
| locations-1240x820 | 七类系统位置的开关及自定义文件夹开头可见；真实系统选择框没有打开。 |
| about-1240x820 | 冰山品牌卡、读取/不读取/本地数据/确认清理四块说明，受保护数据文案原样。 |
| results-bottom-1240x820 | 长结果滚到底，未识别三行完整，末行至操作坞实测 65.625 px；默认仍不勾选未知项。 |
| results-bottom-1040x720 | 最小窗口的同一长结果底部，末行至操作坞实测 66 px；两者均大于 16 px。 |
| notice-results-1240x820 | 假宿主 M1 句子原样在结果页提示条；顶部 40 px 同色底没有漏字，原滚动浮层布局保留。 |
| notice-trends-1240x820 | 切趋势页后上一个命令提示消失，正常趋势数据完整。 |
| trends-empty-1240x820 | 冰山空态、“再体检一次就能看到变化”，没有伪造曲线。 |
| paused-1240x820 | 清理仍显示 4.2 GB 和停止按钮；顶条保留宿主不可用原因与重新连接按钮，不把未知进度当完成。 |
| reconnecting-1240x820 | 扫描继续保留，顶条只显示正在重新连接 Water 服务，暂停按钮尚未出现。 |
| stop-failed-1240x820 | 扫描停止失败的红色原句在停止扫描按钮下，暂停原因仍留在顶部。 |
| clean-stop-failed-1240x820 | 清理卡内停止按钮下有“停止请求没有送达，请先重新连接再试。”，顶条仍是未能确认清理状态；新停止说明也完整。 |
| stale-1240x820 | 已滚动结果页，提示条上方同色空间无过滤栏/正文透字；条内只有服务句子，首张分类卡标题完整、间隔 16 px，清理所选禁用，无重复正文过期行。 |
| loading-1240x820 | 冰山与中性正在读取状态，没有提前显示连接失败。 |
| home-last-scan-1240x820 | 上次结果、增长提示和水位瓶薄荷色可清层仍在。 |
| busy-1240x820 | 顶条“正在进行另一项任务，请稍候。”、关闭提示与首页数据；标题在滚动中位于条后，顶条本体仍为磨砂材质，上方空隙不漏字。 |
| unavailable-1240x820 | 顶条和空态明确无法连接 Water 服务，重新连接按钮可见，没有模拟数据冒充在线结果。 |

已对照设计目录八张静态预览：白色磨砂、墨色大数字、纯蓝按钮和水形状、白色抽屉与确认框等语言保持。预览仍有退役水滴、较早的静态体量和浏览器设计稿外框，产品继续使用已验收冰山/脉搏与 IPC 夹具的实际数字；例如推荐 31.2 GB / 实际 30.7 GB，而非旧稿 31.7 / 31.2。详情与列表长度取决于夹具。J2 的视觉改动仅为顶条上方遮挡与条内磨砂；没有按旧预览倒退图标或改冻结颜色。

归档还保留两个开发期通过批次的 52 张截图。第一个批次的上方半透明底并非最终方案；最终验收以本节目录为准。所有图、日志、源码快照均由 archive 按原字节生成，没有手工编辑图片。

## 边界与未验证

- 只运行本票检查器的 baseline/check/test/browser/red-nc1～3/archive；没有 Cargo、Tauri 构建、原生窗口、系统选择框、下载或外网访问。浏览器只访问 127.0.0.1 的测试服务器。
- 扫描、清理、磁盘数字全部来自冻结 IPC 假宿主；未读真实用户位置、未清理真实数据、未执行应用内真实删除。结束时检查本树 browser-lab 对应 Chrome 进程，匹配数为 0；命令行只用于本地筛选，未输出或归档。
- 只验证 Windows 私有 headless Chrome；未验证原生 WebView2/Mica、macOS、实际屏幕阅读器发声、60 fps、真实宿主及生产并发。读屏验收限 DOM 清空/重写与时间间隔。
- 保持 sticky 提示条和操作坞的原有滚动遮挡语义；本票消除的是提示条上方 40 px 漏字、过期说明重复以及指定截图半行问题，不将其描述成所有滚动位置正文永不经过浮层。
- 没有擅自宣布主线 VERIFIED；等待总控收单和独立验收。

## 检查命令与证据

全部从指定工作树根目录执行，统一完整前缀：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W7-J2
```

下表附加参数与前缀组成每次实际命令。检查器内部的每条 node --check、node --test 命令、退出码、源码快照和哈希见各 result 的 `commands`/`sourceState` 与同前缀 `.log`。final check 含 18 条语法检查；test 为 3/3，browser 为 5/5。archive 共复制 581 个索引条目、43,921,439 字节，另生成 ARCHIVE.json 与 .gitattributes。

| 参数 | 检查器结果 / 退出码 | 原始 result |
|---|---|---|
| `--mode baseline`（已有派前结果，非本执行运行） | passed / 0 | [2026-10-28T14-17-20.307Z-32236-baseline](../../acceptance/wave7/j2/receipts/2026-10-28T14-17-20.307Z-32236-baseline-result.json) |
| `--mode baseline` | passed / 0 | [2026-10-28T14-34-53.207Z-17272-baseline](../../acceptance/wave7/j2/receipts/2026-10-28T14-34-53.207Z-17272-baseline-result.json) |
| `--mode browser` | failed / 1；内部测试/检查 1 | [2026-10-28T14-38-56.709Z-27640-browser](../../acceptance/wave7/j2/receipts/2026-10-28T14-38-56.709Z-27640-browser-result.json) |
| `--mode check` | passed / 0；内部测试/检查 0 | [2026-10-28T14-47-39.298Z-29968-check](../../acceptance/wave7/j2/receipts/2026-10-28T14-47-39.298Z-29968-check-result.json) |
| `--mode test` | passed / 0；内部测试/检查 0 | [2026-10-28T14-47-42.664Z-43448-test](../../acceptance/wave7/j2/receipts/2026-10-28T14-47-42.664Z-43448-test-result.json) |
| `--mode browser` | failed / 1；内部测试/检查 1 | [2026-10-28T14-47-44.958Z-26496-browser](../../acceptance/wave7/j2/receipts/2026-10-28T14-47-44.958Z-26496-browser-result.json) |
| `--mode browser` | passed / 0；内部测试/检查 0 | [2026-10-28T14-50-59.671Z-24304-browser](../../acceptance/wave7/j2/receipts/2026-10-28T14-50-59.671Z-24304-browser-result.json) |
| `--mode check` | passed / 0；内部测试/检查 0 | [2026-10-28T14-54-51.887Z-19824-check](../../acceptance/wave7/j2/receipts/2026-10-28T14-54-51.887Z-19824-check-result.json) |
| `--mode test` | passed / 0；内部测试/检查 0 | [2026-10-28T14-54-56.454Z-11392-test](../../acceptance/wave7/j2/receipts/2026-10-28T14-54-56.454Z-11392-test-result.json) |
| `--mode browser` | failed / 1；内部测试/检查 1 | [2026-10-28T14-54-59.354Z-39988-browser](../../acceptance/wave7/j2/receipts/2026-10-28T14-54-59.354Z-39988-browser-result.json) |
| `--mode browser` | passed / 0；内部测试/检查 0 | [2026-10-28T14-56-54.750Z-17688-browser](../../acceptance/wave7/j2/receipts/2026-10-28T14-56-54.750Z-17688-browser-result.json) |
| `--mode red-nc1` | passed / 0；内部测试/检查 1 | [2026-10-28T15-01-17.254Z-35384-red-nc1](../../acceptance/wave7/j2/receipts/2026-10-28T15-01-17.254Z-35384-red-nc1-result.json) |
| `--mode test` | passed / 0；内部测试/检查 0 | [2026-10-28T15-04-33.627Z-41548-test](../../acceptance/wave7/j2/receipts/2026-10-28T15-04-33.627Z-41548-test-result.json) |
| `--mode red-nc2` | passed / 0；内部测试/检查 1 | [2026-10-28T15-05-15.159Z-16812-red-nc2](../../acceptance/wave7/j2/receipts/2026-10-28T15-05-15.159Z-16812-red-nc2-result.json) |
| `--mode test` | passed / 0；内部测试/检查 0 | [2026-10-28T15-09-16.092Z-12412-test](../../acceptance/wave7/j2/receipts/2026-10-28T15-09-16.092Z-12412-test-result.json) |
| `--mode red-nc3` | passed / 0；内部测试/检查 1 | [2026-10-28T15-11-57.165Z-17720-red-nc3](../../acceptance/wave7/j2/receipts/2026-10-28T15-11-57.165Z-17720-red-nc3-result.json) |
| `--mode test` | passed / 0；内部测试/检查 0 | [2026-10-28T15-15-42.215Z-31340-test](../../acceptance/wave7/j2/receipts/2026-10-28T15-15-42.215Z-31340-test-result.json) |
| `--mode check --final` | passed / 0；内部测试/检查 0 | [2026-10-28T15-16-24.519Z-35120-check](../../acceptance/wave7/j2/receipts/2026-10-28T15-16-24.519Z-35120-check-result.json) |
| `--mode test --final` | passed / 0；内部测试/检查 0 | [2026-10-28T15-16-27.822Z-17720-test](../../acceptance/wave7/j2/receipts/2026-10-28T15-16-27.822Z-17720-test-result.json) |
| `--mode browser --final` | passed / 0；内部测试/检查 0 | [2026-10-28T15-16-30.065Z-41508-browser](../../acceptance/wave7/j2/receipts/2026-10-28T15-16-30.065Z-41508-browser-result.json) |
| `--mode archive` | passed / 0 | [2026-10-28T15-18-53.864Z-34488-archive](../../../.local/checks/WATER-W7-J2/2026-10-28T15-18-53.864Z-34488-archive-result.json) |

archive 自身的 result 在复制结束后才生成，所以该行链接到本树 .local 原始回执；归档完整性以 [ARCHIVE.json](../../acceptance/wave7/j2/ARCHIVE.json) 为准。

辅助复核：逐项重算归档 581 个条目的长度与 SHA-256，全部匹配；报告所有相对链接存在。通用 `git diff --cached --check` 会把原字节证据中的 CRLF 与 TAP 日志空白行报为 trailing whitespace，因此该次返回 1；未为消除提示改动证据字节。产品 diff 与单独回执的空白检查通过。
