WATER-W14-U1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-u1/docs/dispatch/reports/WATER-W14-U1-REPORT.md

## 交付与范围

- 实际执行助手：Codex（本会话提供的模型标识为 GPT-6，未暴露更细型号后缀；不以 manifest 的分派提示代替实际标识）。没有分派子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w14-u1`；分支：`worker/water-w14-u1`。
- 开工 HEAD：`d692bd60cd8ab3fe4d0201afacd8a29fcfc8265a`，与指定 tag 一致，开工工作树干净；本次 baseline 通过。
- 实现提交：`f0915570cbc2ea1c7dee03e10fed1d5e0a97d87e`，26 个界面文件，包含实现、单元/浏览器断言及界面自己的英文假数据。
- 三个 final 均在上述干净提交通过，生产快照 SHA-256 都是 `594bcd42d091cc4662029379596038a76f9b316da4910f9c6b159250035ba89d`，测试快照 SHA-256 都是 `4cff2da2e505abfe30c9b67ef824787c01cc01a8e8b7195029b8765eaf513d78`。
- 本回执与检查器生成的证据另行提交。只新增提交；没有 push、merge、rebase、amend、reset，也没有改 Git 配置或远端。作者与提交者仅在提交进程设置为 `Codex GPT-6 <codex-gpt-6@localhost>`。

## 工单逐项对照

| 工单 | 结果与实现 |
|---|---|
| 1.1 字符串表与切换 | `views/strings.mjs` 中 312 个中英键；统一 `t()`。设置新增语言子页，三种选择即时重画，`flick.language.v1` 读写均捕获异常。首次跟随宿主 `system_language`，空值退回浏览器语言，大小写不敏感的 zh 前缀归为中文。导航、标题、对话框、空状态、可访问名称、关于页、错误和 model 小表均接入。HTML 初始只保留品牌名，启动及切换时设置实际 lang/title。 |
| 1.2 服务文字和格式 | `serviceText()` 仅在英文字段缺失时回退中文，保留明确的 null 与数组。复制线索读取对应的 `copy_text_en`，错误读取对应的 `message_en`。字节继续用 BigInt；计数有千位分隔。日期、相对时间、图表日期、热力格提示、盘名、天数与列举均本地化，日期跨年显示年份。 |
| 1.3 一屏 | 首页、体检、结论、确认、清理中、完成、隔离区、趋势、记录、设置在两种语言 × 两种窗口均通过。除规定的 document 高度检查，还检查 `#main.scrollHeight <= #main.clientHeight`，原横向检查保留。长列表在卡片区域、抽屉或详情滚动；主页面不整体缩放，正文 13px。收紧间距和图表尺寸，保留现有 token，窗口底色改为实色。 |
| 1.4 文案 | 删除图表说明与重复解释，具体逐条见下表。计划摘要移进“计划说明”折叠，全文仍保留且按服务返回更新。风险、占用、不可恢复、隔离不释放空间等实际决策信息保留。 |
| 1.5 扫描 | 直接显示服务 percent；分别展示 Checking / Measuring the whole drive / Putting the results together。位置 space 为进行中，只有 done 才显示完成。终态自动进入结果，cancelled 增加停止说明；失败沿用可重新体检的首页提示。无进度首包时也有停止按钮。分类 treemap 替代扫描 stems，面积按分类 found_bytes，天蓝四档循环，无新增 token；移除 scanSamples/sampleSecond。 |
| 1.6 stale 计划 | `clean_start` 返回 stale 后先 `conclusion_get`。结论有效则用新 version 按保守的 quarantine 默认重新准备，回确认框显示指定提示，必须再次点击确认，不自动重发 clean_start。结论真正 stale 则停用清理并显示过期。重读期间导航改变时不把确认框带到别页。 |
| 1.7 公开写法 | 新增假数据只用 alice、demo-app 等合成名称与虚构路径；新产品代码无私有文档链接、工单号、本机用户名或私人邮箱。共享样例原字节保留，样例中历史 Water 文案在中文旧数据里仍可能出现，产品界面品牌为 Flick。 |
| 第 2 节测试 | 单元仍 3 个、浏览器仍 6 个；新断言加入指定既有函数。五种新标记齐全。没有删除测试、ignore、过滤、放宽计时或降低旧断言。 |
| 第 3 节负控 | 两条只改一个生产语句，分别命中指定标记；每条之后 checkout 原文件，立即跑完整 browser，再跑 test 供检查器的恢复证明审计使用。 |
| 第 4～5 节 | 56 张规定截图全部重拍；check、test、browser 三个 final 通过，archive 通过。 |
| 第 6 节边界 | 只改界面、此回执和 archive 产物。三份共享样例、契约、tokens.css、检查器、台账、宿主和其它包均未改。没有 package.json、依赖安装或新网络访问。 |

## 验证与负控

统一入口为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode <mode> [--final]`，所有命令的工作目录均为本工单工作树根。完整逐次命令及回执索引在附录。

最终单元 3/3、浏览器 6/6，通过时 skipped/todo/cancelled 均为 0。浏览器覆盖了中英主流程、窗口尺寸、语言持久化、存储不可用、扫描中切换不重启、英文线索复制、英文错误、取消说明、英文重准备及旧中文记录例外。

| 负控 | 单处变异 | 实际失败 | 恢复 |
|---|---|---|---|
| nc1 | `serviceText()` 返回语句改为始终取中文 | `UI_W14_EN: home`，英文页出现“系统盘”；5 通过、1 失败，red-nc1 检查器 exit 0 | checkout strings.mjs，完整 browser 6/6，test 3/3 |
| nc2 | `scanPhase()` 返回语句固定 checking，并把 space 映射成 done | `UI_W14_PROGRESS: space heading` 和 `UI_W14_PROGRESS: English phase`；4 通过、2 失败，red-nc2 检查器 exit 0 | checkout scan.mjs，完整 browser 6/6，test 3/3 |

恢复后逐字节对照实现提交：strings.mjs SHA-256 为 `9f7a89e48dabf7e14b9b353a997c854f7903484457d46aab260e1e7736de5320`；scan.mjs 为 `91cc0ea23d8b1054200a34a0403f40320c5af99e8783e4e919f60e8224b2b2fa`。final test 的 proofAudit 同时接受两条证明；没有用语法错误、超时或测试变异作负控。

开发阶段保留三次失败记录：

1. 08:54 UTC：宿主不可用场景沿用了中文默认假设，实际应回退浏览器语言；普通旧流程改为明确选择中文，英文与跟随系统另有断言。该开发运行期间调整过错误文本存储，故此失败轮仅用于定位，不作为交付证明。
2. 08:56 UTC：document 高度 821、窗口 820，来源是 shell 后面的 1px 无障碍播报元素静态定位；把隐藏播报元素定位到左上角后精确通过，没有给断言加容差。
3. 08:58 UTC：新增英文页面检查表达式少了一个括号，修正测试辅助表达式后完整重跑通过。

没有纯计时失败，也没有计时重跑。临时编辑脚本的一次正则语法错误在执行修改前被拒；修正后按正式入口检查。首次 PowerShell 阅读缺少 UTF-8 参数导致显示乱码，随后以 UTF-8 重读；文件未因此转码。

真实冒烟：本票不读取真实业务数据，未执行 real/native。清理、查重和隔离的浏览器行为全部通过假宿主；真实删除 0、原生窗口 0、目录选择框 0。浏览器仅由检查器启动，每次一份私有浏览器，测试结束关闭浏览器与 loopback 服务。final 后按进程名和本工作树标识做计数检查，本票遗留测试浏览器 0；命令行未输出或归档。

## 迁移的旧断言

| 原值 | 新值 | 必要原因与强度 |
|---|---|---|
| 相对时间跨时区都期待 UTC 的 10 月 24 日（及 2024 年同日） | 东京精确期待 10 月 25 日，其它既有时区仍 24 日；跨年同样精确 | 改为本地日历，保留原三时区并新增双语日期、年份、时间等精确断言。 |
| 跳过名单“加入于 YYYY-MM-DD”，用 localDateKey 推导 | “加入于”加 dateOnly 的本地化日期；英文 Added Nov 形式 | 日期遵守本波格式；依然逐行精确比较显示名称与对应添加日期。 |
| 热力格以 title 的 ISO 前缀定位，title.slice(0,10) 取日键 | 以 data-date 精确读取同一 ISO 本地日键；title 显示本地化日期 | 展示日期本地化，同时保留不可读日期、同日多记录、午夜跨日、夏令时日序完整性的所有原断言。 |
| v3 截图名；窄屏 id 为 home-narrow | v4-语言-页面-大小；窄屏页面 id 为 home；56 张规定截图 | 对齐工单与 manifest，shot 使用真实 document.lang，仍用 wx 防止同名覆盖。 |
| 旧浏览器假宿主未控制语言；无法连接时固定等待中文 | 旧中文流程明确 zh；英文等待精确英文错误，system 流程单独验证 | 首次语言现在依宿主/浏览器，既有中文品牌与错误精确断言未移除。 |
| 只检查横向溢出 | 原检查不变，新增 document 与 #main 精确纵向检查 | 加严，覆盖中英与两种窗口的全部主页面。 |

基线没有专门依赖 scanSamples 或“每秒一根”的旧断言；原位置列表顺序、停止 ID、恢复轮询等断言保留，新增阶段、块数、颜色、体量标题、面积变化和取消后的下一步断言。旧 3 个单元/6 个浏览器测试名称完全保留。

## 文案删改清单

旧版没有英文界面，下表“原英文”为方便总控核对的对照译文，不表示旧产品曾展示英文。服务返回的解释、风险与数据字段不因压缩布局而改写。

| 位置 | 原中文 → 新中文 | 原英文 → 新英文 |
|---|---|---|
| 首页主卡 | 只读取名字、大小与时间 → 删除该重复说明；关于与隐私仍解释读取范围 | Reads only names, sizes and times → removed here; scope remains under About & privacy |
| 体检页标题小字 | 只读取名字、大小与时间 → 停下也保留已经查到的 | Reads only names, sizes and times → Stopping keeps what was found |
| 体检黑卡 | 按已检查的文件估算 → 删除 | Estimated from checked files → removed |
| 体检黑卡底部 | 停下也保留已经查到的 → 移至页头，不再重复 | Stopping keeps what was found → moved to the page caption |
| 体检圆表标签 | 已检查 → 删除该重复标签；比例条仍保留 | Checked → removed from the dial; retained in the progress bar |
| 体检图表副标题 | 每秒一根 · 本次体检 → 删除 | One stem per second · this checkup → removed |
| 体检图表可访问名称 | 本次体检发现的可清空间 → 空间分布（图卡标题仍是发现的可清空间） | Cleanable space found in this checkup → Space overview |
| 全部矩形树图可访问名称 | 面积表示体量，按服务返回顺序排列 → 空间分布 | Area represents size, in service order → Space overview |
| 明细页主卡 | 勾选交给 Flick 重新核对 → 删除 | Flick rechecks your selection → removed |
| 趋势页页头 | 每次体检留下的空间记录 → 删除 | Space recorded at each checkup → removed |
| 趋势图卡 | 重复的 forecast.note_zh → 删除图卡副本；主卡仍显示 | Repeated forecast.note_en → removed from chart; retained in the main card |
| 趋势页页头重复说明 | 盘名 · note_zh → 删除页头副本；对应盘卡仍显示 note_zh | Drive name · note_en → removed from page header; retained with the drive |
| 记录热力格 | 一格一天，同一天取最深一级；悬停查看每条记录。 → 删除 | One cell per day, using the deepest level; hover for records → removed |
| 记录热力格 | 浅蓝：体检或其它操作 · 天蓝越深：当次释放越多 → 删除 | Pale blue: checkups or other actions; darker blue: more space freed → removed |
| 结论计划摘要 | 原 summary_zh 全文 → 收入“计划说明”，全文与实时更新保留 | Full summary_en → inside Plan details, preserving the full returned text |
| 扫描阶段 | 正在体检 → 按 running / space / finishing 分别显示三种指定文字 | Checking → Checking / Measuring the whole drive / Putting the results together |
| 取消结果 | 无停止说明 → 已停止，下面是停之前查到的 | No stopped-result caption → Stopped. Here is what was found before that. |
| stale 但结论有效 | 一律标过期 → 跳过名单变了，已按新的结论重新准备 | Always marked out of date → The skip list changed, so the plan was prepared again |

其余原中文按钮、风险说明及关于页正文保留语义，新增对应英文。全部中英取值清单见附录，便于核对词汇表之外的译法。

## 自主选择与未验证事项

- 新字符串模块放在 `views/strings.mjs`，沿用既有小写模块路径约束，无依赖。没有新 IPC 命令。
- 英文选择器的中文选项显示 Chinese，中文界面显示“中文”，满足英文表及英文页面不含中文字符的测试要求；选项值始终为 zh。
- 重准备回到 quarantine 默认而不自动沿用此前 direct-delete 选择；用户重新明确确认。所有数值与选择仍来自服务，不在界面重算清理计划。
- 使用现有 treemap 和 sky token，不引入新的绘图系统或动画；正文调整到 13px，图轴与数字的既有辅助字号保留。
- 将计划说明折叠、长列表放进卡片区域，比删减服务卡片或缩放整页更保守。内部滚动位置在重画时保留；明细页仍可整体滚动。
- UI 英文假数据只在 `tests/fixtures-en.json`；假宿主合入兄弟字段。英文用例的用户文件名采用合成 ASCII 名称；实际用户的 display_path 不翻译。唯一显式允许的英文用例中文例外为“旧记录只有中文”的历史记录，测试按该完整文字列出，不以通配方式忽略中文。
- 三份共享样例、设计 tokens 和非白名单内容未改；无真实文件清理、真实目录扫描、系统函数或依赖变更。
- 未验证：后续 S1/H1 的真实服务/宿主联合接线、安装包、真实 Windows 清理与文件竞态、macOS。本票浏览器通过不代表这些项目已验收，也不自行变更台账状态。

## 证据与截图

`--mode archive` 已将 receipts、源快照、日志和成功轮次截图归档至 `docs/acceptance/wave14/u1/`。ARCHIVE.json 记录 905 个条目、30,377,877 字节，已逐项重新计算 SHA-256 一致。最后一轮 56 张截图的文件名集合和 PNG 像素尺寸均与 manifest 一致。单元、浏览器测试始终使用本树内合成数据。

人工抽看了首页/结论窄屏、扫描空间阶段、确认、完成、隔离区、趋势、记录及设置等代表图；下列逐图表列明相对 v3 的布局与状态差异。所有页面复用冻结字体、卡片、按钮和配色，设计 tokens 逐字节不变。内部列表超出卡片区域时有滚动条，所有服务条目仍可访问。

## 附录 A：最后一轮逐图差异

| 截图 | 与 v3 的差异 |
|---|---|
| [v4-zh-home-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-home-1240x820.png) | 中文；压缩标题与驱动网格；位置在黑卡内滚动，操作与上次结果留在窗口内。 |
| [v4-zh-home-new-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-home-new-1240x820.png) | 中文；新增合成文件夹单独选中，位置卡滚动揭示新增项。 |
| [v4-zh-intro-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-intro-1240x820.png) | 中文；保留三条入门说明，增加英文，按钮与原流程一致。 |
| [v4-zh-scan-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-scan-1240x820.png) | 中文；竖线图替换为分类方块；直接呈现 percent，停止按钮固定在主卡底部。 |
| [v4-zh-scan-space-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-scan-space-1240x820.png) | 中文；主标题和 F 盘状态都显示整盘空间统计，位置不误标完成。 |
| [v4-zh-scan-finishing-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-scan-finishing-1240x820.png) | 中文；95% 显示整理结论，各位置可完成，整体仍为整理阶段。 |
| [v4-zh-results-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-results-1240x820.png) | 中文；计划说明折叠，判断卡与线索在内部滚动，保护折叠改为双列，主操作固定。 |
| [v4-zh-results-decided-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-results-decided-1240x820.png) | 中文；服务决定后的判断卡收成一行，计划与类别开关更新。 |
| [v4-zh-results-folds-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-results-folds-1240x820.png) | 中文；保护折叠展开保留完整行，在底部卡片区滚动。 |
| [v4-zh-results-stale-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-results-stale-1240x820.png) | 中文；过期提醒与禁用清理保留。 |
| [v4-zh-results-empty-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-results-empty-1240x820.png) | 中文；无可清项时不显示清理主按钮，保护内容保留。 |
| [v4-zh-results-replanned-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-results-replanned-1240x820.png) | 中文；新的确认计划带跳过名单变化说明，没有过期提示。 |
| [v4-zh-menu-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-menu-1240x820.png) | 中文；原菜单操作保留并翻译；锚定判断卡。 |
| [v4-zh-drawer-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-drawer-1240x820.png) | 中文；480px 抽屉、汇总行、搜索、底部计划保留，正文与服务解释翻译。 |
| [v4-zh-drawer-big-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-drawer-big-1240x820.png) | 中文；汇总行和搜索结果在抽屉列表内滚动。 |
| [v4-zh-details-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-details-1240x820.png) | 中文；详情页保持单节展开、模式和搜索，允许详情内容滚动。 |
| [v4-zh-confirm-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-confirm-1240x820.png) | 中文；默认隔离；明细区域内部滚动，风险说明与确认动作保留。 |
| [v4-zh-confirm-direct-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-confirm-direct-1240x820.png) | 中文；直接删除保持橙红危险按钮，重新准备计划。 |
| [v4-zh-cleaning-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-cleaning-1240x820.png) | 中文；保留核对与停止语义，进度和主操作一屏显示。 |
| [v4-zh-done-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-done-1240x820.png) | 中文；驱动圆表缩紧，分组结果内部滚动，隔离与真实释放分开显示。 |
| [v4-zh-quarantine-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-quarantine-1240x820.png) | 中文；所有批次保留，批次卡内部滚动，按原盘打开和二次确认不变。 |
| [v4-zh-quarantine-leftover-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-quarantine-leftover-1240x820.png) | 中文；删不掉的条目、原因与重试动作保留在批次卡内。 |
| [v4-zh-dedupe-menu-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-dedupe-menu-1240x820.png) | 中文；位置菜单增加英文，发起查重前仍需明确同意。 |
| [v4-zh-dedupe-intro-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-dedupe-intro-1240x820.png) | 中文；内容读取说明和开始查重动作原样保留并翻译。 |
| [v4-zh-dedupe-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-dedupe-1240x820.png) | 中文；重复组列表内部滚动，保留建议副本和隔离路径不变。 |
| [v4-zh-trends-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-trends-1240x820.png) | 中文；去掉重复副标题；增长和其它盘列表内部滚动，图轴日期本地化。 |
| [v4-zh-history-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-history-1240x820.png) | 中文；删除两行图表说明；保留热力格与全部记录，日键独立于展示日期。 |
| [v4-zh-settings-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-settings-1240x820.png) | 中文；新增语言入口，设置内容区域内部滚动，隐私卡保留。 |
| [v4-zh-settings-decl-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-settings-decl-1240x820.png) | 中文；声明信任状态、错误和保护内容翻译，声明卡在设置内容区滚动。 |
| [v4-zh-settings-language-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-settings-language-1240x820.png) | 中文；新增 system/zh/en 三项；无需重启或重新体检。 |
| [v4-zh-settings-about-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-settings-about-1240x820.png) | 中文；关于与隐私正文全部翻译；版本、许可证、地址来自 app_info。 |
| [v4-zh-settings-skip-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-settings-skip-1240x820.png) | 中文；显示名称按语言取兄弟字段，添加日期本地化，移除后刷新结论。 |
| [v4-en-home-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-home-1240x820.png) | 英文；压缩标题与驱动网格；位置在黑卡内滚动，操作与上次结果留在窗口内。 |
| [v4-en-intro-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-intro-1240x820.png) | 英文；保留三条入门说明，增加英文，按钮与原流程一致。 |
| [v4-en-scan-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-scan-1240x820.png) | 英文；竖线图替换为分类方块；直接呈现 percent，停止按钮固定在主卡底部。 |
| [v4-en-scan-space-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-scan-space-1240x820.png) | 英文；主标题和 F 盘状态都显示整盘空间统计，位置不误标完成。 |
| [v4-en-scan-finishing-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-scan-finishing-1240x820.png) | 英文；95% 显示整理结论，各位置可完成，整体仍为整理阶段。 |
| [v4-en-results-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-results-1240x820.png) | 英文；计划说明折叠，判断卡与线索在内部滚动，保护折叠改为双列，主操作固定。 |
| [v4-en-drawer-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-drawer-1240x820.png) | 英文；480px 抽屉、汇总行、搜索、底部计划保留，正文与服务解释翻译。 |
| [v4-en-details-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-details-1240x820.png) | 英文；详情页保持单节展开、模式和搜索，允许详情内容滚动。 |
| [v4-en-confirm-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-confirm-1240x820.png) | 英文；默认隔离；明细区域内部滚动，风险说明与确认动作保留。 |
| [v4-en-cleaning-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-cleaning-1240x820.png) | 英文；保留核对与停止语义，进度和主操作一屏显示。 |
| [v4-en-done-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-done-1240x820.png) | 英文；驱动圆表缩紧，分组结果内部滚动，隔离与真实释放分开显示。 |
| [v4-en-quarantine-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-quarantine-1240x820.png) | 英文；所有批次保留，批次卡内部滚动，按原盘打开和二次确认不变。 |
| [v4-en-dedupe-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-dedupe-1240x820.png) | 英文；重复组列表内部滚动，保留建议副本和隔离路径不变。 |
| [v4-en-trends-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-trends-1240x820.png) | 英文；去掉重复副标题；增长和其它盘列表内部滚动，图轴日期本地化。 |
| [v4-en-history-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-history-1240x820.png) | 英文；删除两行图表说明；保留热力格与全部记录，日键独立于展示日期。 |
| [v4-en-settings-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-settings-1240x820.png) | 英文；新增语言入口，设置内容区域内部滚动，隐私卡保留。 |
| [v4-en-settings-language-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-settings-language-1240x820.png) | 英文；新增 system/zh/en 三项；无需重启或重新体检。 |
| [v4-en-settings-about-1240x820.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-settings-about-1240x820.png) | 英文；关于与隐私正文全部翻译；版本、许可证、地址来自 app_info。 |
| [v4-zh-home-1040x720.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-home-1040x720.png) | 中文；最小窗口；压缩标题与驱动网格；位置在黑卡内滚动，操作与上次结果留在窗口内。 |
| [v4-zh-scan-1040x720.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-scan-1040x720.png) | 中文；最小窗口；竖线图替换为分类方块；直接呈现 percent，停止按钮固定在主卡底部。 |
| [v4-zh-results-1040x720.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-zh-results-1040x720.png) | 中文；最小窗口；计划说明折叠，判断卡与线索在内部滚动，保护折叠改为双列，主操作固定。 |
| [v4-en-home-1040x720.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-home-1040x720.png) | 英文；最小窗口；压缩标题与驱动网格；位置在黑卡内滚动，操作与上次结果留在窗口内。 |
| [v4-en-scan-1040x720.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-scan-1040x720.png) | 英文；最小窗口；竖线图替换为分类方块；直接呈现 percent，停止按钮固定在主卡底部。 |
| [v4-en-results-1040x720.png](../../acceptance/wave14/u1/screenshots/2026-11-08T09-17-53.520Z-27792/v4-en-results-1040x720.png) | 英文；最小窗口；计划说明折叠，判断卡与线索在内部滚动，保护折叠改为双列，主操作固定。 |

## 附录 B：每次正式检查命令与结果

均在指定工作树根执行。08:28 的 baseline 是开工前已经存在的总控预检记录，随 archive 保留，不计为本执行者运行。下表通过列为检查器状态；两条 red 的子测试 exit 1 是预期，检查器 exit 0。

| UTC 开始时间 | 命令 | 状态 / 检查器 exit | 回执 |
|---|---|---|---|
| 2026-11-08T08:28:20.782Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode baseline` | passed / 0（继承） | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T08-28-20.780Z-17272-baseline-result.json) |
| 2026-11-08T08:38:56.114Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode baseline` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T08-38-56.112Z-7360-baseline-result.json) |
| 2026-11-08T08:48:00.004Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode check` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T08-48-00.002Z-22020-check-result.json) |
| 2026-11-08T08:53:50.119Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode test` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T08-53-50.117Z-3404-test-result.json) |
| 2026-11-08T08:54:05.752Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode browser` | failed / 1 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T08-54-05.750Z-12188-browser-result.json) |
| 2026-11-08T08:56:48.509Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode browser` | failed / 1 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T08-56-48.508Z-36276-browser-result.json) |
| 2026-11-08T08:58:44.786Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode browser` | failed / 1 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T08-58-44.785Z-12848-browser-result.json) |
| 2026-11-08T09:01:01.974Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode browser` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-01-01.971Z-3196-browser-result.json) |
| 2026-11-08T09:05:27.749Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode check` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-05-27.748Z-27772-check-result.json) |
| 2026-11-08T09:05:44.036Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode test` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-05-44.035Z-25440-test-result.json) |
| 2026-11-08T09:05:48.186Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode browser` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-05-48.183Z-11920-browser-result.json) |
| 2026-11-08T09:10:27.219Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode red-nc1` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-10-27.217Z-38588-red-nc1-result.json) |
| 2026-11-08T09:12:32.882Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode browser` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-12-32.881Z-10036-browser-result.json) |
| 2026-11-08T09:14:00.567Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode test` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-14-00.566Z-17632-test-result.json) |
| 2026-11-08T09:14:17.417Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode red-nc2` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-14-17.414Z-28852-red-nc2-result.json) |
| 2026-11-08T09:15:44.630Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode browser` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-15-44.629Z-2404-browser-result.json) |
| 2026-11-08T09:17:30.640Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode test` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-17-30.638Z-17920-test-result.json) |
| 2026-11-08T09:17:34.600Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode check --final` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-17-34.598Z-35412-check-result.json) |
| 2026-11-08T09:17:45.108Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode test --final` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-17-45.107Z-4684-test-result.json) |
| 2026-11-08T09:17:53.522Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode browser --final` | passed / 0 | [JSON](../../acceptance/wave14/u1/receipts/2026-11-08T09-17-53.520Z-27792-browser-result.json) |
| 2026-11-08T09:20:25.428Z | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-U1 --mode archive` | passed / 0 | archive 自身回执留在 .local；归档清单见 ARCHIVE.json |

## 附录 C：全部界面中英译法

下表包含冻结词表以外的所有界面译法，供总控统一。占位符由格式化结果填入。服务假数据的额外译文完整存于 `apps/water/ui/tests/fixtures-en.json`，仅供假宿主测试，不作为 S1 已实现英文的证据。

| 键 | 中文 | English |
|---|---|---|
| appTitle | Flick · 磁盘体检 | Flick · Disk checkup |
| checkup | 体检 | Checkup |
| quarantine | 隔离区 | Quarantine |
| trends | 趋势 | Trends |
| history | 记录 | History |
| settings | 设置 | Settings |
| mainNav | 主导航 | Main navigation |
| privacyShortcut | 本地只读扫描 | Local, read-only checkup |
| unavailable | 无法连接 Flick 服务 | Cannot connect to Flick |
| serviceUnavailable | Flick 服务暂时不可用 | Flick is temporarily unavailable |
| dedupeExpired | 查重结果已失效，请重新查重 | Duplicate results are out of date. Find duplicates again |
| scanFailed | 体检未能完成，请重新体检。 | The checkup could not finish. Check again. |
| dedupeFailed | 查重未能完成，请重试。 | The duplicate search could not finish. Try again. |
| invalidSearch | 搜索词不能含有 \、/ 或 :。 | Search cannot contain \, / or :. |
| invalidSelection | 所选内容无法清理，请重新选择。 | This selection cannot be cleaned. Select again. |
| diagnostics | Flick 诊断信息 | Flick diagnostics |
| leadText | 线索全文 | Full lead |
| copyLeadManual | 选中文字复制线索 | Select the text to copy the lead |
| close | 关闭 | Close |
| cancel | 取消 | Cancel |
| openQuarantine | 打开隔离区文件夹 | Open quarantine folder |
| openFolder | 打开文件夹 | Open folder |
| restoreConflict | 原位置已有内容 | The original location is occupied |
| abandon | 放弃 | Cancel restore |
| restoreBeside | 还原到旁边 | Restore beside the original |
| purgeQuestion | 永久删除 {size}？ | Permanently delete {size}? |
| noRecovery | 不进入回收站，无法恢复。 | Bypasses the Recycle Bin and cannot be restored. |
| purge | 永久删除 | Delete permanently |
| findDuplicates | 查重复文件 | Find duplicates |
| dedupeConsent | 查重要读文件内容来比对，只在这台电脑上算，不保存内容、不上传。只比大小相同的文件，可能要几分钟。 | Finding duplicates reads file contents locally, without saving or uploading them. Only files of the same size are compared. This may take a few minutes. |
| startDedupe | 开始查重 | Find duplicates |
| paused | 进度读取已暂停，请重新连接。 | Progress updates paused. Reconnect to continue. |
| reconnect | 重新连接 | Reconnect |
| search | 搜索 | Search |
| used | 已用 | Used |
| available | 可用 | Available |
| checked | 已检查 | Checked |
| remaining | 剩余 | Remaining |
| spaceHistory | 空间记录 | Space history |
| noRecords | 尚无记录 | No records yet |
| unknownTime | 时间未知 | Unknown time |
| justNow | 刚刚 | just now |
| minutesAgo | {n} 分钟前 | {n} min ago |
| hoursAgo | {n} 小时前 | {n} h ago |
| monthDay | {month} 月 {day} 日 | {month} {day} |
| yearDate | {year} 年 {date} | {date}, {year} |
| timeDate | {date} {time} | {date}, {time} |
| about | 约 {value} | about {value} |
| days | {n} 天 | {n} days |
| drive | {letter} 盘 | Drive {letter}: |
| menu | {name}菜单 | {name} menu |
| select | 选择{name} | Select {name} |
| predictedFull | 预测 · {n} 天后满 | Forecast · full in {n} days |
| treeLabel | 空间分布 | Space overview |
| checking | 正在体检 | Checking |
| measuring | 正在统计整盘空间 | Measuring the whole drive |
| finishing | 正在整理结论 | Putting the results together |
| metadataOnly | 只读取名字、大小与时间 | Reads only names, sizes and times |
| found | 已发现 | Found |
| filesChecked | 个文件已检查 | Files checked |
| elapsed | 已用时 | Elapsed |
| preparingScan | 正在准备体检… | Preparing checkup… |
| progress | 进度 | Progress |
| stopKeepsResults | 停下也保留已经查到的 | Stopping keeps what was found |
| stop | 停止 | Stop |
| waiting | 等待 | Waiting |
| scanning | 扫描中 | Checking |
| measuringLocation | 统计整盘空间 | Measuring the whole drive |
| complete | 完成 | Done |
| foundSpace | 发现的可清空间 | Cleanable space found |
| cancelled | 已停止，下面是停之前查到的 | Stopped. Here is what was found before that. |
| replanned | 跳过名单变了，已按新的结论重新准备 | The skip list changed, so the plan was prepared again |
| planDetails | 计划说明 | Plan details |
| scanContent | 扫描内容 | Checkup contents |
| skipList | 跳过名单 | Skip list |
| declaration | 项目声明 | Project declaration |
| aboutPrivacy | 关于与隐私 | About & privacy |
| settingsSkipNote | 设置 · 移除后立即生效 | Settings · removing a skip takes effect immediately |
| settingsNextNote | 设置 · 改了下次体检生效 | Settings · changes apply to the next checkup |
| loadingSettings | 正在读取设置… | Loading settings… |
| commonContents | 常用位置查哪些 | What to check in common locations |
| sessions | 会话记录 | Session history |
| sessionWarning | 清掉后这些对话不能再续接或回看。默认不清理。 | Cleaned conversations cannot be resumed or reviewed. Off by default. |
| retentionDays | {name}保留天数 | Days to keep {name} |
| largestSession | 最大一条 {size} | Largest: {size} |
| allowSessions | 允许清理{name} {n} 天前的会话 | Allow cleaning {name} sessions older than {n} days |
| alwaysSkip | 以后都跳过 | Always skip |
| addedAt | 加入于 {date} | Added {date} |
| remove | 移除 | Remove |
| skipEmpty | 跳过名单为空 | The skip list is empty |
| trusted | 已信任 | Trusted |
| untrusted | 未信任 | Not trusted |
| changed | 已变化 | Changed |
| hasErrors | 有错误 | Has errors |
| declarationCounts | 保护 {protected} 项 · 工作树 {trees} 棵 | {protected} protected items · {trees} worktrees |
| pathCount | {kind} · {n} 条{ask} | {kind} · {n} paths{ask} |
| askSuffix |  · 需要确认 |  · confirmation required |
| distrust | 不信任 | Do not trust |
| trust | 信任 | Trust |
| noDeclarations | 尚未发现项目声明 | No project declarations found |
| privacy | 隐私 | Privacy |
| localCheckup | 本地体检 | Local checkup |
| metadataAttributes | 一般体检只读名字、大小、时间和属性 | A regular checkup reads only names, sizes, times and attributes |
| offline | 不联网 | Offline |
| noUpload | 不上传任何数据 | No data is uploaded |
| cleanupConsent | 清理由你确认 | You confirm cleanup |
| quarantineSafety | 隔离不会释放空间；永久删除不能恢复 | Quarantine does not free space; permanent deletion cannot be undone |
| declarationPriority | 项目声明优先 | Project declarations take priority |
| protectedDeclarations | 声明保护的内容不会清理 | Declared protected content is left alone |
| localRecords | Flick {version} · 记录只存在这台电脑上 | Flick {version} · records stay on this computer |
| license | 许可证 {value} | License: {value} |
| homepage | 项目地址 {value} | Project website: {value} |
| copy | 复制 | Copy |
| copyDiagnostics | 复制诊断信息 | Copy diagnostics |
| readsTitle | Flick 读取什么 | What Flick reads |
| readsBody | 一般体检读取名字、大小、时间与属性，以及进程信息。项目声明、工作树指向和你单独发起的查重有明确的内容读取范围。 | A regular checkup reads names, sizes, times, attributes and process information. Content reads are limited to project declarations, worktree references and duplicate searches you start. |
| protectsTitle | 保护你的数据 | Protecting your data |
| protectsBody | 浏览器登录信息、Cookies、网站存储、源码与未知数据库受到保护。会话记录只有在设置中明确允许后，才会列出旧会话供你决定。 | Browser sign-ins, cookies, site storage, source code and unknown databases are protected. Old sessions are offered for review only after you explicitly allow it in Settings. |
| staysLocalTitle | 数据留在本机 | Your data stays local |
| staysLocalBody | 不上传。体检结果和清理记录保存在这台电脑上。 | Nothing is uploaded. Checkup results and cleanup records stay on this computer. |
| yourChoiceTitle | 清理由你决定 | You decide what to clean |
| yourChoiceBody | 可再生缓存直接删除。你选的部分默认先放进同盘隔离区，可以还原；隔离区永久删除后才释放空间。直接删除与永久删除无法恢复。可重新下载不等于可回滚。 | Regenerable caches are deleted directly. Your selections go to quarantine on the same drive by default and can be restored. Quarantine frees space only after permanent deletion. Direct and permanent deletion cannot be undone. Downloading again is not a rollback. |
| language | 语言 / Language | Language |
| followSystem | 跟随系统 | Follow system |
| chinese | 中文 | Chinese |
| english | English | English |
| languageNote | 立即生效，不影响本次体检 | Takes effect immediately without changing this checkup |
| where | 这次检查哪里？ | Where should we check? |
| diskCheckup | 磁盘体检 | Disk checkup |
| loading | 正在读取… | Loading… |
| driveFree | {drive}可用 | {drive} available |
| lastCleanable | 上次可清 | Last cleanable space |
| freeTotal | 可用 · 共 {size} | Available · {size} total |
| fullIn | 约 {n} 天后满 | Full in about {n} days |
| freeSpaceHistory | 可用空间记录 | Available space history |
| thisCheckup | 本次体检 | This checkup |
| folder | 文件夹 | Folder |
| wholeDrive | 整盘 | Whole drive |
| commonLocations | 常用位置 | Common locations |
| removeLocation | 从列表移除 | Remove from list |
| addFolder | 加文件夹 | Add folder |
| startCheckup | 开始体检 | Start checkup |
| goQuarantine | 去隔离区 | Go to quarantine |
| lastCheckup | 上次体检 · {time} | Last checkup · {time} |
| moreThanWeek | 比 7 天前多了 {size} | {size} compared with 7 days ago |
| viewResults | 查看结果 | View results |
| neverChecked | 还没有体检过 | No checkup yet |
| daysSince | 已经 {n} 天没有体检 | Last checked {n} days ago |
| nothingSafe | 没有可以放心清理的东西 | Nothing to clean safely |
| safeClean | 可以放心清理 | Safe to clean |
| folderOnly | 这次只看了这个文件夹 ·  | Only this folder was checked ·  |
| partialSuffix |  · 部分完成：有的位置没有权限，或时间到了 |  · Partly completed: some locations were inaccessible or timed out |
| recommendedDelete | 推荐直接清理 | Recommended for direct cleanup |
| yourSelection | 你选的 | Your selection |
| thisPlan | 本次计划 | This plan |
| stale | 结果已过期 · 重新体检 | Results are out of date · Check again |
| thisCleanup | 这次清理 | This cleanup |
| checkAgain | 重新体检 | Check again |
| includes | 包含什么 | Includes |
| new | 新 | New |
| worthLook | 需要你看一眼 | Worth a look |
| viewDetails | 查看明细 | View details |
| copyAgentLead | 复制线索给 agent | Copy lead for an agent |
| keep | 保留 | Keep |
| clean | 清理 | Clean up |
| addedClean | 已加入清理 · {size} | Added to cleanup · {size} |
| kept | 已保留 | Kept |
| undo | 撤销 | Undo |
| cleanableNow | 这次能清什么 | What can be cleaned |
| noCleanup | 这次不用清理 | No cleanup needed |
| protectedRemain | 受保护的数据仍然保留，可以展开下方清单查看。 | Protected data stays in place. Expand the lists below to review it. |
| forAgent | 交给 agent | For an agent |
| copyLead | 复制线索 | Copy lead |
| moreLeads | 还有 {n} 条 › | {n} more › |
| allDetails | 查看全部明细 | View all details |
| closeDrawer | 关闭抽屉 | Close details |
| findItem | 找某一项 | Find an item |
| backSummary | 返回汇总 | Back to summary |
| itemCountShown | 显示 {shown} / {total} 项 | Showing {shown} / {total} items |
| itemMenu | 条目菜单 | Item menu |
| expandItems | 展开看每一项 | Expand items |
| summaryMenu | 汇总行菜单 | Summary menu |
| cleanupPlan | 本次清理计划 | Cleanup plan |
| detailsTitle | 全部明细 | All details |
| sharedPlan | 与你的结论页使用同一份清理计划 | Uses the same cleanup plan as your results |
| detailsMode | 明细显示方式 | Details view |
| byCategory | 按类别 | By category |
| byLocation | 按位置 | By location |
| searchGroups | 搜索分组 | Search groups |
| backResults | 返回结论 | Back to results |
| loadingDetails | 正在读取明细… | Loading details… |
| groups | 分组 | Groups |
| sectionSummary | {title} · {n} 组 · {size} | {title} · {n} groups · {size} |
| newSuffix |  · 新 |  · new |
| view | 查看 | View |
| unchanged | 和上次一样的 {n} 组 · {size} | {n} unchanged groups · {size} |
| recheckSelection | 勾选交给 Flick 重新核对 | Flick rechecks your selection |
| cleanSelection | 清理所选 {size} | Clean up selected {size} |
| cleanQuestion | 清理 {size}？ | Clean up {size}? |
| items | {n} 项 | {n} items |
| directDelete | 直接删除 | Delete directly |
| regenerates | 直接删除 · 会自动重新生成 | Delete directly · regenerates automatically |
| selectedHandling | 你选的部分怎么处理 | How to handle your selection |
| quarantineFirst | 先放进隔离区 | Move to quarantine first |
| sameDriveRestore | 仍在原来的盘上，可以还原 | Stays on the same drive and can be restored |
| immediateIrreversible | 马上腾出，不能恢复 | Frees space now; cannot be restored |
| duplicatesQuarantine | 重复文件先放进隔离区 | Duplicates go to quarantine first |
| quarantineRelease | 隔离的部分要等你永久删除后才腾出空间。 | Quarantined items free space only after permanent deletion. |
| directIrreversible | 直接删除的部分不进入回收站，无法恢复。 | Directly deleted items bypass the Recycle Bin and cannot be restored. |
| deleteSize | 删除 {size} | Delete {size} |
| startClean | 开始清理 | Start cleanup |
| cleaning | 正在清理 | Cleaning |
| recheckEach | 每一项都会再次核对 | Each item is checked again |
| preparingClean | 正在准备清理… | Preparing cleanup… |
| moveQuarantine | 放进隔离区 | Move to quarantine |
| processed | 已处理 | Processed |
| verifying | 正在核对结果 | Verifying results |
| stopIrreversible | 停止后已经删掉的部分无法恢复。 | Stopping cannot restore items already deleted. |
| thisProgress | 本次进度 | Progress |
| freed | 已腾出 | Freed |
| groupProgress | 第 {index} / {total} 组 | Group {index} / {total} |
| cleaned | 已清理 | Cleaned |
| partial | 部分完成 | Partly completed |
| skipped | 已跳过 | Skipped |
| failed | 失败 | Failed |
| quarantined | 进隔离区 | Quarantined |
| cleanDone | 清理完成 | Cleanup complete |
| estimatedRelease | 原预计释放 | Estimated space to free |
| freeBefore | 可用 · 清理前 {size} | Available · {size} before cleanup |
| groupResults | 各组结果 | Results by group |
| estimated | 预计 {size} | Estimated {size} |
| moreQuarantined | 另有 {size} 在隔离区，确认没问题后再永久删除 | Another {size} is in quarantine. Delete it permanently once you are sure it is safe |
| partialResults | 部分完成，请查看各组结果。 | Partly completed. Review the results by group. |
| quarantineBatches | 隔离区里有 {n} 批 | {n} batches in quarantine |
| quarantineSubtitle | 仍在原来的盘上，永久删除后才腾出空间 | Stays on the same drive until permanently deleted |
| total | 一共 | Total |
| loadingQuarantine | 正在读取隔离区… | Loading quarantine… |
| quarantineEmpty | 隔离区是空的 | Quarantine is empty |
| nothingPending | 没有等待处理的内容。 | Nothing is waiting for review. |
| openDriveQuarantine | 打开 {drive}隔离区 | Open quarantine on {drive} |
| quarantineMenu | 隔离区菜单 | Quarantine menu |
| daysStored | 放了几天 | Days in quarantine |
| cannotDeleteCount | 还剩 {n} 个删不掉 | {n} items could not be deleted |
| otherItems | 另有 {n} 项 | {n} other items |
| purgingProgress | 正在永久删除 · 已腾出 {size} | Deleting permanently · {size} freed |
| restore | 还原 | Restore |
| retry | 再试一次 | Try again |
| findingDuplicates | 正在查重 | Finding duplicates |
| localCompare | 只在本机比对，不保存内容、不上传 | Compared locally without saving or uploading contents |
| duplicateSize | 发现重复体量 | Duplicate space found |
| filesListed | 已列出文件 | Files listed |
| dedupeProgress | 查重进度 | Duplicate search progress |
| comparing | 比对内容 | Comparing contents |
| listing | 列出文件 | Listing files |
| duplicates | 重复文件 | Duplicate files |
| noDuplicatesYet | 尚无查重结果 | No duplicate results yet |
| duplicatesFound | 找到重复文件 | Duplicates found |
| duplicateGroups | 找到 {n} 组重复 | {n} duplicate groups found |
| extra | 多出来的 | Extra space |
| selected | 已选 | Selected |
| differentContents | 组同名不同内容 | Groups with different contents |
| back | 返回 | Back |
| groupSizes | 每组文件的大小 | File sizes by group |
| copies | {name} · {n} 份 | {name} · {n} copies |
| keepOne | 每组留一份 | Keep one from each group |
| keepPath | 留 {path} | Keep {path} |
| copiesCount | {n} 份 | {n} copies |
| excludedDifferent | 另有 {n} 组同名不同内容，没有列入 | {n} groups with the same name but different contents are excluded |
| cleanSelected | 清理所选 | Clean up selection |
| keepRecommended | 每组保留建议的那一份。 | Keep the recommended copy in each group. |
| driveFullIn | {drive}约 {n} 天后满 | {drive} full in about {n} days |
| spaceTrends | 空间趋势 | Space trends |
| checkupRecords | 每次体检留下的空间记录 | Space recorded at each checkup |
| dailyUse | 日均空间消耗 | Daily space use |
| basisDays | 预测依据天数 | Days in forecast |
| driveDaily | {drive} · 日均空间消耗 | {drive} · daily space use |
| noForecast | 暂不预测 | No forecast yet |
| driveAvailableSpace | {drive}可用空间 | {drive} available space |
| recordedForecast | 已记录的可用空间与预测 | Recorded available space and forecast |
| keepsGrowing | 一直在长的 | Keeps growing |
| markFixed | 标记为已修 | Mark as fixed |
| otherDrives | 其它盘 | Other drives |
| stable | 稳定 | Stable |
| orphanProcesses | 残留进程 · {size} | Leftover processes · {size} |
| unknownMemory | 内存未知 | Memory unknown |
| processCount | {n} 个 · {time} | {n} processes · {time} |
| checkCommon | 体检常用位置 | Check common locations |
| historyTitle | 每一次，都记得 | Every checkup, remembered |
| historySubtitle | 每一次体检与清理，都有迹可循。 | Every checkup and cleanup has a record. |
| loadingHistory | 正在读取记录… | Loading history… |
| noHistory | 还没有记录 | No history yet |
| daily | 每天 | Daily |
| historyRecords | 体检与清理记录 | Checkup and cleanup history |
| recognized | 识别到 {size} | Recognized {size} |
| extraSize | 多出来 {size} | Extra space: {size} |
| recentCleanups | 最近几次清理 | Recent cleanups |
| lastResults | 查看上次结果 | View last results |
| introRead | 体检只读：只看名字、大小和时间，不读文件内容。 | Checkups read names, sizes and times, without reading file contents. |
| introClean | 清什么由你点：推荐的直接清，要确认的先放进隔离区。 | You choose what to clean: recommended items are deleted directly; items needing review go to quarantine first. |
| introRestore | 隔离区里的随时能还原，永久删除前会再问一次。 | Quarantined items can be restored. Permanent deletion asks for confirmation. |
| start | 开始 | Start |
| howFlickWorks | Flick 怎么用 | How Flick works |
| levelSafe | 放心清 | Safe to clean |
| levelReview | 要你看 | Worth a look |
| levelStats | 只统计 | Measure only |
| levelProtected | 受保护 | Protected |
| levelUnknown | 未识别 | Unrecognized |
| clusterGrowing | 仍在长 | Keeps growing |
| clusterStopped | 已止住 | Stopped growing |
| clusterSuspected | 疑似 | Suspected |
| clusterNew | 新发现 | Newly found |
| cleanRecommended | 清理推荐项 | Clean up recommended items |
