WATER-W4-G3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g3/docs/dispatch/reports/WATER-W4-G3-REPORT.md

## 交付信息

- 执行者：Codex，GPT-6（本会话声明的模型；未使用子代理或其它实现者）。
- 工作树：`F:/new/smaltalk/water/.worktrees/w4-g3`；分支：`worker/water-w4-g3`。
- 首次 HEAD：`0ca42f8e8038a5a7816802c5a7f175a966b0625c`，开工时干净，baseline 通过。
- 实现提交：`9d247c0448ff8e28b70620539d6fb71744dfdd73`。
- 本回执及检查器生成的证据另行提交，不夹带产品改动。
- 交付状态：SUBMITTED，待总控独立复核；不自称 VERIFIED。
- 权威票：[WATER-W4-G3](F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G3-UI-POLISH-20261026.md)；SPEC：[UI-POLISH](F:/new/smaltalk/water/contracts/hardening-v1/UI-POLISH.md)。

只改了三个实现文件：

| 文件 | 改动 |
|---|---|
| `apps/water/ui/app.mjs` | `routeChanged()` 增加一行 `state.error = '';`。不改变连接标志、过期状态或 IPC 调用。 |
| `apps/water/ui/styles/app.css` | 增加 `.side-foot p, .drive-main .sub { text-wrap: balance; }`，不改操作坞及页面留白。 |
| `apps/water/ui/tests/browser.test.mjs` | 假宿主增加长结果选项；新增且仅新增一个顶层测试 `ui_m1_polish`。原四项名称、断言及测试流程保持。 |

## SPEC 第 1～5 节核对

### 第 1 节：接口、设计与文案不变

`ipc.mjs`、`ui-fixtures.json`、`styles/tokens.css`、设计稿、契约、检查器、宿主、其它包和台账均未修改。检查器确认 UI tokens 与设计 tokens 逐字节相同；生产代码变化只有上述两行，没有文案、字体、颜色、圆角、阴影或结构调整。保持白色磨砂、纯蓝强调、无新增渐变光晕、无 emoji、零 npm。

以下 11 项均与基线一致。额外用 UTF-8 读取生产文件、与 `git show 0ca42f8:<文件>` 比较字符串出现次数，11 项全部存在且次数不变：

| # | 冻结文字 | 结果 |
|---|---|---|
| 1 | 开始体检 | 未改 |
| 2 | 清理所选 | 未改 |
| 3 | 增长趋势 | 未改 |
| 4 | 清理记录 | 未改 |
| 5 | 扫描位置 | 未改 |
| 6 | 开始一次体检 | 未改 |
| 7 | 本次体检共识别 | 未改 |
| 8 | 比较每次体检，找出一直在变大的东西。 | 未改 |
| 9 | 每一次体检与清理，都有迹可循。 | 未改 |
| 10 | 选择体检要看的地方。受保护的数据只统计占用，永远不会被清理。 | 未改 |
| 11 | 体检未能完成，请重新体检。 | 未改 |

`clean_prepare` 拒绝时的 `message_zh` 仍原样显示。新测试两次真实鼠标点击“清理所选”，分别收到并核对“这一版只做体检，清理功能会在下一版开放。”；不从前端替换这句话。

### 第 2 节：操作坞只锁回归

没有改 `views/results.mjs`、`.dock`、`#dock-slot` 或 `.page` 的 124 px 底部留白。假宿主把原 27 个分组各复制为 3 个，共 81 行，分组 ID 唯一、符合现有 IPC 字符规则、不含路径；分类及总量随之扩大。测试确认内容超过一屏、确实滚至底部、末行和操作坞在视口内，然后通过 `getBoundingClientRect()` 比较边缘。

最终浏览器日志的实际测量：

| 视口 | scrollHeight / scrollTop | 最后行 bottom | 操作坞 top | 净间距 | 要求 |
|---|---|---|---|---|---|
| 1240×820 | 7289 / 6469 | 674.375 px | 740 px | 65.625 px | ≥16 px，通过 |
| 1040×720 | 7286 / 6566 | 574 px | 640 px | 66 px | ≥16 px，通过 |

未执行额外的底部留白负控；SPEC 将其安排给总控。截图中滚动途中行从浮动坞后方经过的现象保留，不能据此声称最后一行被挡住。

### 第 3 节：提示条归属

hash 路由变化时清空 `state.error`，不触碰 `state.reconnecting`、`state.pollPaused`、`state.stale`。新增测试通过了：

- 结果页显示 M1 服务原句；进入增长趋势后 `#notice.hidden` 为真，整页不再包含旧句。
- 经首页“查看结果”回到结果页，旧句不复现；再次点击清理按钮再次显示服务原句。
- 从结果页进入清理记录、再直接改变 hash 回结果页，旧句均不复现。
- 临时进度读取失败时，“正在重新连接 Water 服务…”跨页保留；服务恢复后隐藏。
- 暂停进度读取时，“未能读取任务进度，请重新连接。”和可用的“重新连接”按钮跨清理记录、体检页面保留；点击重连后恢复。
- stale 错误的提示条随路由消失，但返回结果页仍有正文“结果已过期，请重新体检后再清理。”，清理按钮保持禁用。

轮询间隔、次数预算、忙碌状态和 IPC 参数未改，原四个浏览器测试仍验证它们。

### 第 4 节：两段说明折行

文字、字号、颜色不变，仅使用一条共享的 `text-wrap: balance` 规则。Range 按 Unicode 字符逐个测量 `getClientRects()`，按同一行的 top 归组；空白不计入字符数，因此不会用空格凑够四字。

| 视口 | 侧栏修前 | 侧栏修后 | 首页说明修前 | 首页说明修后 |
|---|---|---|---|---|
| 1240×820 | 14＋1 | 8＋7 | 26＋3 | 16＋13 |
| 1040×720 | 14＋1 | 8＋7 | 24＋5 | 16＋13 |

新测试明确测的是尚未体检的首页说明。侧栏现在按“不读取文件内容，”和“不上传任何数据”分两行。首页平衡折行使“体检”在两行边界分开，但不再有“空间。”的短孤行，满足冻结要求，没有修改文案或插入硬换行。

参考了 [web-typography 技能](C:/Users/37310/.agents/skills/web-typography/SKILL.md) 的实际尺寸、真实文本和孤行检查方法。仅对本票的两段说明及两个指定尺寸评分：修前 6/10，修后 10/10；这是折行子项的评估，不代表整套产品或其它缩放条件的评分。

### 第 5 节：测试与截图

- 单元测试文件不变，精确 3 个：`ui_format_bytes_time`、`ui_selection_rules`、`ui_ipc_boundary`。
- 浏览器精确 5 个：原四个 `ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`，加 `ui_m1_polish`。
- 无 skipped、todo、cancelled 或过滤；最终浏览器 5/5，约 44.4 秒；控制台错误、运行时错误、未处理拒绝均为空。
- 两套通过运行各保存 23 张：原 12 张必需图、原测试已有的 7 张状态图、新增 4 张。46 张都逐张查看，下面记录每一种截图在两套中的观察。

## 检查命令与完整执行记录

全部在本工作树根目录执行。每行命令的共同前缀是：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G3
```

下表附加参数与此前缀组成实际完整命令。时间是回执文件名中的 UTC 时间，日期均为 2026-10-26。每次负控检查器自身退出 0 表示成功捕获预期失败，内部测试退出 1；不能把负控说成产品测试全绿。

| 时间 / PID | 附加参数 | 检查器退出码 / 结果 |
|---|---|---|
| 13:24:34.183 / 33368 | `--mode baseline` | 0，通过，精确基线且干净 |
| 13:27:11.938 / 18120 | `--mode browser` | 1，原四测通过；新测复现 `UI_FOOTER_WRAP`，侧栏 14＋1 字 |
| 13:28:12.554 / 11324 | `--mode browser` | 1，折行已通过；新测的 ID 格式校验误拒带冒号的合法 fixture ID |
| 13:30:06.537 / 20092 | `--mode browser` | 1，修正测试 ID 校验后，间距通过，复现 `UI_NOTICE_SCOPE` |
| 13:31:33.652 / 42988 | `--mode check` | 0，语法及 UI 政策通过 |
| 13:31:38.443 / 27364 | `--mode test` | 0，3/3 |
| 13:31:43.178 / 2112 | `--mode browser` | 0，5/5，23 张截图 |
| 13:33:23.076 / 35684 | `--mode red-nc1` | 0，内部 2 过 1 败，`UI_LEVEL_GUARD` |
| 13:33:29.034 / 37516 | `--mode test` | 0，nc1 立即恢复后 3/3 |
| 13:33:46.429 / 32064 | `--mode red-nc2` | 0，内部 4 过 1 败，`UI_FOOTER_WRAP` |
| 13:34:57.513 / 37372 | `--mode test` | 0，nc2 立即恢复后 3/3 |
| 13:35:01.529 / 38572 | `--mode red-nc3` | 0，内部 4 过 1 败，`UI_NOTICE_SCOPE` |
| 13:36:25.394 / 11848 | `--mode test` | 0，nc3 立即恢复后 3/3 |
| 13:36:30.862 / 9968 | `--mode check --final` | 0，干净实现提交上通过 |
| 13:36:36.680 / 29192 | `--mode test --final` | 0，3/3，三条负控及精确恢复链核验通过 |
| 13:36:41.617 / 38016 | `--mode browser --final` | 0，5/5，23 张截图，退出后树仍干净 |
| 13:38:29.197 / 33756 | `--mode archive` | 0，归档完成 |

完整日志、源码快照、回执在 [receipts](../../acceptance/wave4/g3/receipts/)，命名为 `2026-10-26T<表中时间以短横线替代冒号>Z-<PID>-<mode>-result.json`，日志对应 `-1.log`（check 为逐模块多个日志）。[最终浏览器日志](../../acceptance/wave4/g3/receipts/2026-10-26T13-36-41.617Z-38016-browser-1.log) 含两种尺寸的原始测量。archive 自身回执在本树 `.local/checks/WATER-W4-G3/2026-10-26T13-38-29.197Z-33756-archive-result.json`，由于检查器在复制结束后才写自身回执，未再次归档以生成循环回执。

归档还包含开工前已有的总控 `13:00:11.132 / 34808` baseline 回执，它不是本执行者运行的检查。三个开发期失败都保留，没有改写为通过。第二次失败是新增测试自身把 ID 误限定为不含冒号；修正为现有 `ipc.mjs` 的合法字符规则及拒绝盘符条件，原四项断言没有改动。

附加只读核对：`git diff --check` 无空白错误；实现 diff 只有指定三文件；11 项文案出现次数核对通过；归档 457 项全部按源文件与索引重算大小/SHA-256 相同；当前全部 UI 文件与最终浏览器回执记录的源码哈希相同。手工文案核对最初受 PowerShell 管道默认编码影响报失败，指定该进程的 UTF-8 输出编码后通过；没有产品文案差异。

## 三条有效负控与原字节恢复

每条均只改真正被调用的一处生产逻辑，不改测试、不加测试开关；负控结束后先 `git checkout -- <该文件>`，随后运行普通 `--mode test`，再进行下一条。

| 负控 | 临时改动 | 真实失败信息 | 恢复命令 |
|---|---|---|---|
| nc1 | 删除 `model.mjs` 的 `if (!canSelect(group)) { next.delete(id); return next; }` | `UI_LEVEL_GUARD: direct selection must reject nonselectable groups` | `git checkout -- apps/water/ui/model.mjs` |
| nc2 | 删除新增的共享 `text-wrap: balance` 规则 | `UI_FOOTER_WRAP: 1240x820 .side-foot p`，14 字与 1 字两行 | `git checkout -- apps/water/ui/styles/app.css` |
| nc3 | 删除 `routeChanged()` 新增的 `state.error = '';` | `UI_NOTICE_SCOPE: old command error must disappear after navigation` | `git checkout -- apps/water/ui/app.mjs` |

恢复后的原始文件 SHA-256：

| 文件 | SHA-256 |
|---|---|
| `model.mjs` | `2fb283b69081ec2d31db4fef2b1fb74c123c03e807761cf666ad0badb88eb278` |
| `styles/app.css` | `cc89e27105273b64e6d15e0deb73cbb6c639cc82ad821742503ed1d07671f55c` |
| `app.mjs` | `3cffec206576c51f9430394b94deeb22d9c1c7f62cc7480cc313470c9480ea61` |

CSS 在正式检查前保持工作树的 CRLF，MJS 保持仓库指定的 LF；没有用换行差异冒充逻辑负控。[最终单元回执](../../acceptance/wave4/g3/receipts/2026-10-26T13-36-36.680Z-29192-test-result.json) 的 `proofAudit` 已绑定三条 red 及各自恢复绿。最终聚合哈希：

- productionHash：`cf4a28acfe9f871c242d6123adac60960b96ea944dbe163b59b3cc6782732e8a`。
- testHash：`e50ccc37eb60dc691f561b1e43c25a58ad267b4a701f189d3e06c021d15f01f8`。

## 逐张截图观察

两套均逐张打开查看，不仅检查文件存在：

- A：[普通通过运行](../../acceptance/wave4/g3/screenshots/2026-10-26T13-31-43.178Z-2112/)，23 张；先看 `.local` 源图，归档后通过 SHA-256 确认原字节复制。
- B：[最终通过运行](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/)，23 张；直接查看归档图。

下面每行观察同时适用于 A、B 的同名文件。两套版式、文案、状态一致；非 reduced-motion 页面存在水面动画相位差，不属于布局差异。已对照设计预览的 home/results/scan/detail/confirm/done/trends/locations 八屏；实际窗口是 1240×820 或 1040×720，设计预览是含设计导航的 1300×900，数值按固定 fixture，因此不把示例数字或画布不同视为实现缺陷。

| 截图文件（B 链接） | A、B 逐图观察与设计/F3 问题对照 |
|---|---|
| [home-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/home-1240x820.png) | 59.8 GB 系统盘水位瓶、三个其它磁盘条、开始体检球形按钮和首次提示完整。两行系统盘说明均有足够字数；侧栏底部不再单留“据”。保留原白色玻璃与纯蓝按钮。 |
| [scan-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/scan-1240x820.png) | 27.5 GB、62% 进度环，右侧完成/扫描/等待清单，停止扫描按钮完整；侧栏说明两行平衡。数值为 fixture，不照抄设计稿的 19.4。 |
| [results-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/results-1240x820.png) | 31.2 GB 主数字、53.5 GB 总识别、级别比例、洞察、过滤与分组表可读。浮动坞在底部，当前是列表顶部视图，行经过坞背后是既有行为。 |
| [results-1040x720.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/results-1040x720.png) | 最小视口下摘要、过滤和坞保持横向容纳；侧栏无单字孤行。坞覆盖的是未滚到底时经过它下面的行，未更改布局。 |
| [detail-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/detail-1240x820.png) | 右侧白色抽屉、关闭入口、3.6 GB/最近活动/47÷48 三格指标及三段说明清晰；后景模糊。内容长，抽屉滚动条显示后面还有条目，保持既有设计。 |
| [confirm-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/confirm-1240x820.png) | 中央 31.2 GB 确认框、内部滚动清单、红色不可恢复提示、取消和带体量的红色按钮均完整。假宿主画面，不发生删除。 |
| [cleaning-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/cleaning-1240x820.png) | 4.2 GB 圆环、当前组、3/2250 项和停止按钮可见。只有模拟进度；侧栏折行仍正常。 |
| [done-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/done-1240x820.png) | 30.7 GB 已释放、C/F 水位前后虚线、回到结果/查看记录，以及 Chrome 部分完成说明清晰。条目继续向下滚动，未挤压首屏。 |
| [trends-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/trends-1240x820.png) | 蓝色平滑曲线、四个标注、增长榜和棕橙泄漏说明；没有多余错误提示条。布局保持设计方向。 |
| [history-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/history-1240x820.png) | 三条记录、时间与清理/体检体量对齐，顶部说明完整；选中导航与侧栏折行正常。设计无专门静态屏，沿用玻璃列表。 |
| [locations-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/locations-1240x820.png) | 各分类线框图标、说明和开关按行对齐，自定义文件夹在底部继续；固定说明文案保持。图中的路径来自 fixture，没有读取该真实位置。 |
| [about-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/about-1240x820.png) | 品牌、读取/不读取、数据留本机、清理确认说明各自清晰；原有隐私文案不改。 |
| [results-bottom-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/results-bottom-1240x820.png) | 合成长列表底部，三个未识别受保护行全部展示；末行到坞有明显空白，实测 65.625 px。坞显示合成选择 39 组/93.7 GB。 |
| [results-bottom-1040x720.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/results-bottom-1040x720.png) | 最小视口下末行、锁图标、体量和坞完整，实测 66 px 空白，直接排除“滚到底末行被遮”的回归。 |
| [notice-results-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/notice-results-1240x820.png) | 点击清理后顶部黏性提示条完整显示 M1 原句和关闭提示；底部仍是结果页操作坞。点击引起视口滚动，符合原测试助手鼠标点击方式。 |
| [notice-trends-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/notice-trends-1240x820.png) | 切入增长趋势后没有 M1 句子或残留提示条，标题回到正常位置；曲线、增长列表、泄漏卡均完整。对应 F3 的跨页残留问题已修复。 |
| [loading-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/loading-1240x820.png) | 中性“正在读取…”空态，无连接失败误报，侧栏底部仍平衡。 |
| [reconnecting-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/reconnecting-1240x820.png) | 原测试的进度重试耗尽画面，提示“Water 服务暂时不可用。”与重连按钮，清理进度仍展示。不是清理已失败或已结束。新增测试另验证指定暂停句子的跨页保留。 |
| [stale-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/stale-1240x820.png) | 过期提示可见，复选框与清理按钮变淡禁用，重新扫描仍可用；保持既有过期保护。 |
| [home-last-scan-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/home-last-scan-1240x820.png) | 有上次体检时水位瓶带浅绿层、洞察和查看结果卡完整；“浅绿一层…”说明也保持平衡，没有修改其文字。 |
| [busy-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/busy-1240x820.png) | 顶部黏性 busy 提示与关闭按钮可读，下方首页仍在；这是当前页面的合法错误提示。 |
| [trends-empty-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/trends-empty-1240x820.png) | “再体检一次就能看到变化”空态居中，没有伪造曲线；导航和侧栏说明清楚。 |
| [unavailable-1240x820.png](../../acceptance/wave4/g3/screenshots/2026-10-26T13-36-41.617Z-38016/unavailable-1240x820.png) | 启动无宿主时显示连接失败空态、页内重新连接按钮及当前错误提示；未崩溃，字号与配色延续原设计。 |

F3 问题的核对依据是本票 SPEC 与第四波 PLAN 对真实窗口观察的记录，以及本票假宿主截图和测量；本执行者未重跑或冒充 F3 的真实 native 验证。

## 证据、资源与未验证事项

[ARCHIVE.json](../../acceptance/wave4/g3/ARCHIVE.json) 收录 457 个原始日志/源码快照/回执/截图条目，共 26,338,224 字节，其中 46 张截图。加上检查器生成的索引和 `.gitattributes`，证据目录共 459 个文件；本回执是另一个白名单文件。全部证据由 `--mode archive` 生成，没有手工改动证据。

七次浏览器运行均串行，每次只用冻结助手启动一个工作树内私有 headless Chrome。浏览器测试的 `after` 关闭浏览器和 loopback 静态服务；全部命令已退出。额外只读核对了 Chrome 中匹配本树 `.local/browser-lab/` 的进程数，结果为 0；没有输出命令行，没有终止其它进程，没有手工删除 profile。

- 原生窗口 0、系统选择框 0；没有真实扫描、真实删除或清理按钮的宿主执行。旧测试的清理画面全部由假宿主返回。
- 没有联网、下载字体/图标、安装依赖、跑 Cargo/Tauri、操作上游或其它工作树。
- 没有 push、merge、rebase，没有修改主线台账或共享配置。
- 未验证 macOS、真实 WebView2/native 窗口、真实服务接线、真实用户数据、生产删除竞态、其它 DPI/缩放/尺寸或旧版浏览器。只确认当前 Windows 私有 Chrome 的两个冻结视口。
- 任务要求已完成；后续总控验收、集成和 F3 整机回归不属于本次执行。
