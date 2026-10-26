WATER-W2-E 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-e/docs/dispatch/reports/WATER-W2-E-REPORT.md

2026-10-26。执行引擎：Codex（GPT-6；会话未暴露更细子型号）。未使用子代理。交付为 SUBMITTED，待总控独立看图验收；不自行标记 VERIFIED。

## 补单 02（本次交付，优先于下方历史记录）

2026-10-26，新对话按补单 02 接手。引擎：Codex / GPT-6，会话未暴露更细子型号；未使用子代理。交付状态 **SUBMITTED，待总控验收**，未修改 manifest、台账或主线。

### 起点、范围与实现提交

- 工作树 `F:/new/smaltalk/water/.worktrees/w2-e`，分支 `worker/water-w2-e`，开工 HEAD 精确为 `8dba99fb9253551ef15c1cc6ff8fc8841552d99e`，状态干净。先读补单 02，再依次读原票、规则、补单 01、原回执并复读补单 02；另读项目必读文件、ADR、MODEL、UI、IPC、DESIGN。
- **未重跑 baseline。** 新实现提交为 `f416527ef98524bc1e9ce6ae567fbc0e22c9e0dd`，只改 15 个 `apps/water/ui/` 文件。实现后的提交只含本回执和检查器归档证据。
- 三个 final 的 before/after HEAD 均为上述实现 SHA，status 都为空，生产摘要均为 `7d5010880ca8948fcd180df007fa9c28f2d27313f8cf87784f3af03bb12e45af`，测试摘要均为 `bc5efd6102b36913e3a563fa128a264c55d57bebf0d5e4ae7f842ba80c62ae89`。
- 检查入口仍是票面主线绝对路径，收尾实读 SHA-256 为 `053e554086fbbe12ecbeada15be998396ec047126b21bcbaa7da66034cd1fb68`，本执行者未修改检查器。下方补单 01 的旧工具指纹仅作历史。
- tokens 未改：产品与**本工作树冻结设计源**都是 3,201 字节、SHA-256 `703e7b3c185bd95d79bb580cc1911736962159846832ece5a40ba5df0770cb29`。收尾发现主线设计副本是 LF（3,129 字节、`66d4a75f…`），两者只差 72 个 CR；未改任一设计源或产品 token 来消除检出换行差异，冻结检查通过。

### 逐条修正与验证

| 补单要求 | 修正与证据 |
|---|---|
| 趋势等距、平滑、标注 | 按体检序号分配横坐标；限幅切线的单调三次 Hermite 插值，极值切线为零；淡纯色面积。单测逐段采样检查无超调与单调性、接点切线连续；浏览器核等距、曲线路径和四个标注，保留可展开读数 |
| 分组排序 | 按体量先 recommended/confirm/advisory/protected/unrecognized，同级降序；增长模式仅按增量降序。单测覆盖所有分类，两种排序；浏览器对照回放的分类行顺序 |
| 重新扫描按钮 | 沿用统一 btn-glass，并将细描边统一放入次按钮共享样式，与确认框“取消”、停止、重新连接一致 |
| 水位瓶 | 共用 SVG 增加瓶口、1px 整圈白色描边、顶部内高光与左右高光；上次体检可释放层按该盘推荐量/总量计算，薄荷色半透明且跟随水面；完成页复用瓶身并保留清理前虚线 |
| 显卡图标 | 新增 24 网格、1.5px 线条的显卡图标，gpu_system 与 agent_tool 不同；浏览器断言引用不同 symbol |
| 进度失败 | scan_progress/clean_progress 的 busy/unavailable 每 250ms 串行重试，连续 20 次即暂停，成功重置计数。重试显示指定连接文案；暂停保留清理页面、任务状态和 beforeunload 保护，显示错误及重新连接按钮；按钮只恢复查询。浏览器覆盖扫描和清理各两次 busy 恢复、清理连续 20 次 unavailable 停止轮询及手动恢复，不重复 clean_start |
| 格式与时区 | GB/MB 数字都加千分位，1024 MB 舍入边界提升为 1.0 GB，仍全程 BigInt；相对日期用 UTC。单测在 UTC、东京、洛杉矶逐一验证跨日日期，恢复原 TZ；浏览器时钟固定到回放 UTC 时间 |
| 负增长 | 共用 byteDelta/countDelta，−1.2 GB、−5 项只出现一个符号；结果行负值用下降箭头。单测和浏览器负值回放覆盖详情与趋势 |
| 启动 | connecting 状态从首帧显示“正在读取…”，直到 app_state 返回；浏览器挂起首次 app_state 后验证没有失败文案，并额外留图 |
| 清理结束 | 先获取终态结果，再刷新 app_state；完成页与首页独立显示，点击体检导航回到可开始状态且有上次结果入口。记录缓存失效，若当前为记录页立即重载。浏览器分别覆盖前台完成页和留在记录页完成两条路径，核刷新调用与磁盘新读数 |
| clean_start 失败 | 提交时立即关闭确认框、丢弃预览引用；失败显示宿主提示并要求重新点“清理所选”。浏览器先注入失败并消耗令牌，再重新准备，核新令牌与旧令牌不同 |
| 确认令牌 | 只校验字符串非空、长度 ≤512、无反斜杠；允许 /+=，不套用其它 ID 的字符集。单测验证上下界、反斜杠/盘符路径拒绝，plan_id/group_id 原规则不变；整个浏览器清理流程使用含 /+= 的令牌 |
| 扫描初始 idle | 见过 running 后的 idle 才获取结果；初始 idle 继续等，20 次后提示“体检没有开始，请重试”。浏览器覆盖两次 idle 后运行、20 次未启动以及 running 后 idle 结束 |
| 隐私文案 | 按补单原文说明 Cookies、登录信息、本地存储、IndexedDB 始终保护，以及网站离线缓存仅确认后清理；未修改规则或数据契约 |
| 测试补强 | 七个名称不变；确认按钮精确核体量；页面关键数字由回放计算；真实改选后重新扫描重置；首页/扫描页均验证 reduced-motion 无运行动画。每次换场景前及结束时收集 console.error、error、unhandledrejection 到 errors 并断言为空 |

趋势标注的限制：IPC v1 的 points 只有 at/root/free_bytes，没有清理事件种类；本票按设计将最低点后首个回升点标为“清理后”。这是回升形态的 UI 标注，**不能证明该时间发生了清理**，真实清理与释放量证据仍应以清理记录为准；代码和 README 已注明。没有为此添加 IPC 字段或模拟数据。

动效核对继续使用 [ui-animation 技能](C:/Users/37310/.agents/skills/ui-animation/SKILL.md)：保持冻结 8s/13s 水波，新增玻璃几何为静态；未新增布局属性动画、transition:all 或常驻 will-change。浏览器实测首页、扫描页、浮层在 reduced-motion 下没有运行中的动画。未做真实触屏、0.1x 人工动画面板或 WebView2 60fps 验收。

### 检查命令与新负控

全部在本票工作树根执行，共同前缀 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E`。下表每行的时间/PID 对应 [归档回执与日志](../../acceptance/wave2/e/receipts/) 的 `2026-10-26T<时间>-<PID>-<mode>-result.json`。时间为 UTC。

| 时间 / PID | 参数 | 结果 |
|---|---|---|
| 07-17-45.679Z-40640 | `--mode test` | exit 1：先加回归断言，旧实现的千分位、级别排序、令牌字符集三项均失败；不是负控 |
| 07-26-59.544Z-31704 | `--mode check` | exit 0 |
| 07-27-03.858Z-23376 | `--mode test` | exit 0，3/3 |
| 07-27-26.801Z-20104 | `--mode browser` | exit 0，4/4，19 张图；逐张看图后统一次按钮描边 |
| 07-34-23.303Z-32556 | `--mode red-nc1` | 检查器 exit 0，测试按预期 exit 1，2 过 1 失败，命中 UI_LEVEL_GUARD |
| 07-34-25.744Z-42360 | `--mode test` | exit 0，立即原字节恢复后 3/3 |
| 07-35-07.958Z-39900 | `--mode check --final` | exit 0，干净实现/范围/政策/语法/冻结通过 |
| 07-35-12.766Z-9692 | `--mode test --final` | exit 0，3/3，新红绿 proofAudit 通过 |
| 07-35-15.231Z-43704 | `--mode browser --final` | exit 0，4/4，19 张真实 PNG，运行前后干净 |
| 07-37-06.857Z-24988 | `--mode archive` | exit 0，按原字节/截图哈希归档；自身回执留 .local |

负控在实现提交上只改 `model.mjs` 的 `if (!canSelect(group))` 为 `if (!group)`，没有改测试或加开关。[红回执](../../acceptance/wave2/e/receipts/2026-10-26T07-34-23.303Z-32556-red-nc1-result.json)的失败为 `UI_LEVEL_GUARD: direct selection must reject nonselectable groups`、`true !== false`。立即 `git checkout -- apps/water/ui/model.mjs` 恢复，并核 SHA-256 与改坏前相同：`2fb283b69081ec2d31db4fef2b1fb74c123c03e807761cf666ad0badb88eb278`；然后立即跑完整 test，[恢复回执](../../acceptance/wave2/e/receipts/2026-10-26T07-34-25.744Z-42360-test-result.json)通过。final test 精确引用这两条证明。

七个原测试名未增减、未 skip/filter：ui_format_bytes_time、ui_selection_rules、ui_ipc_boundary；ui_home_and_scan、ui_results_detail_confirm、ui_clean_done_and_pages、ui_layout_states_a11y。产品提交的 `git diff --check`、`git diff --cached --check` 通过。一次临时只读 Node 命令因 PowerShell 引号失败，随后用 stdin 脚本成功读取回放摘要；未作为任何产品测试或负控证据。

### 新截图逐张对照

本次用一个私有 headless Chrome 依次打开静态稿八屏并查看截图，再查看八张冻结 previews；静态稿观察图留在本树 `.local/ui-design-read-1792998961350/`。两轮通过的浏览器截图各 19 张，**共 38 张新产品图均逐张打开看过**，没有修改 gate 后的图片。最终归档目录：[2026-10-26T07-35-15.231Z-43704](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/)。通用差异仍是产品不含设计切换栏和外围样机窗口，数字使用回放而非预览写死值；“一致”指设计结构与视觉语言，不声称逐像素相同。

| 最终归档截图 | 一致 / 差异与原因 |
|---|---|
| [home-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/home-1240x820.png) | 与 home 预览一致：玻璃主卡、水位瓶、磁盘条和蓝色球钮。已补瓶口、整圈描边和顶部内高光，不再只是一块蓝色。差异：首次无历史，不画薄荷层，指标为待体检 |
| [home-last-scan-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/home-last-scan-1240x820.png) | 与 home 预览一致：水面上清楚显示半透明薄荷层。差异：C 盘回放可清 15.4 GB，顶端含回放增长洞察；时钟固定，刚完成显示“刚刚” |
| [scan-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/scan-1240x820.png) | 与 scan 预览一致：水环、分类状态、玻璃停止按钮。差异：27.5 GB、182,280 文件、0:29 来自回放，含“未识别”第九类 |
| [results-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/results-1240x820.png) | 与 results 预览一致：推荐的 Codex/Claude/grok 三行在前，确认组随后，受保护组靠后；重新扫描有明确玻璃描边并与取消同样式。差异：31.2 GB 推荐、53.5 GB 总量依回放 |
| [results-1040x720](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/results-1040x720.png) | 与结果预览同层级、同排序和玻璃操作坞。差异：窄窗压缩列距，长列表纵向滚动；无横向溢出或操作截断 |
| [detail-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/detail-1240x820.png) | 与 detail 预览一致：右抽屉、级别、三格数字和三段说明。差异：完整展示可清理/跳过、前缀分布，清单下移；23 小时前按固定回放时钟计算 |
| [confirm-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/confirm-1240x820.png) | 与 confirm 预览一致：居中玻璃、红色不可恢复提示、玻璃取消与含体量危险按钮。差异：31.2 GB/2,250 项和完整 13 组内滚动清单来自预览返回值 |
| [cleaning-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/cleaning-1240x820.png) | 与 DESIGN 5.6 一致：下降水环、当前组、停止；静态稿无独立此屏。差异：3/2,250 舍入为 0%，回放已释放 4.2 GB |
| [reconnecting-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/reconnecting-1240x820.png) | 新增要求状态图：连续失败上限后仍显示“正在清理”和最后进度，顶部错误与玻璃“重新连接”；无完成假象。静态稿无此状态，沿用同一语言 |
| [done-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/done-1240x820.png) | 与 done 预览一致：释放量、双玻璃瓶、清理前虚线、结果列表。两瓶用首页同一瓶口和描边。差异：30.7 GB，C 59.8→74.7、F 243.1→258.9 GB；完整结果向下滚动 |
| [trends-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/trends-1240x820.png) | 与 trends 预览一致：等距平滑曲线、极淡纯色面积、最低点/清理后/今天标注，近期点不再挤成竖线。差异：按补单标出真正首点 10-01 · 16.6 GB，预览标的是第二点 10-07；保留可展开读数；日均 <1 GB 用 MB |
| [history-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/history-1240x820.png) | 与 DESIGN 5.9 一致：倒序玻璃记录、释放量与摘要。静态稿无此页；记录刷新与展开已由浏览器验证 |
| [locations-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/locations-1240x820.png) | 与 locations 预览一致：细线图标、开关、玻璃行；显卡与系统缓存换为带风扇的显卡轮廓，与 AI 芯片不同。差异：回放有七类，自定义区下移可滚动 |
| [about-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/about-1240x820.png) | 与 DESIGN 5.11 同一白玻璃语言，补单隐私原文完整可读。静态稿无此页 |
| [loading-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/loading-1240x820.png) | 新增中性启动状态：正在读取，无失败闪烁；同一玻璃空态样式 |
| [busy-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/busy-1240x820.png) | 同一语言，滚动后提示固定可见；透白提示下可见轻微背景文字，沿用冻结玻璃透明度 |
| [stale-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/stale-1240x820.png) | 同一语言与新分级排序；提示可见，清理禁用，重新扫描可操作 |
| [trends-empty-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/trends-empty-1240x820.png) | 与设计指定文案一致：“再体检一次就能看到变化”，保留留白与线条水滴 |
| [unavailable-1240x820](../../acceptance/wave2/e/screenshots/2026-10-26T07-35-15.231Z-43704/unavailable-1240x820.png) | 真正无宿主时显示无法连接与玻璃重连按钮，与中性启动明确区分 |

### 归档与边界

[ARCHIVE.json](../../acceptance/wave2/e/ARCHIVE.json) 现有 **787 条、58,560,800 字节**（包括原历史），新增两轮成功浏览器图共 38 张。归档后独立逐条重算全部字节数与 SHA-256，一致；旧失败证据保留，未覆盖或删除任何旧截图。最终 19 图均从归档路径再次打开检查。原字节证据里的换行/日志空白保持，不为 Git 空白告警改证据。

本轮一次静态稿浏览、两轮产品浏览器测试，每次仅一个私有 headless Chrome；原生窗口 0，无网络访问、字体/依赖下载、真实目录扫描或真实清理。测试和 loopback 服务均正常退出；交回前仅按本树私有 profile 路径在内存过滤进程，输出计数 0，未输出任何进程命令行。无手工递归删除，无 push/merge/rebase，无其它工作树或台账修改。

未验证：可信 Tauri 宿主接线、真实扫描/清理、真实关闭确认、Mica、WebView2 60fps、macOS、触屏。页面释放量均为测试回放，不代表本机释放了空间。浏览器目录保护仍由后续可信宿主落实；本票仅按补单改隐私文案，未执行任何浏览器数据清理。提交回执和证据后停止测试与后台工作，待总控审阅。

## 补单 01 原回执（以下为历史）

以下保留原回执内容与旧证据索引，描述的是 `7f817967` 实现及 `8dba99fb` 交回时状态。涉及最新实现、行为、截图、工具指纹及累计归档量，以前面的“补单 02”为准。

### 提交与范围

- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w2-e`；分支：`worker/water-w2-e`。
- 原始基点：`68cbab9f7c35fa7e5c55e3daab3151ecec5a22c6`。
- 补单续做起点：`e06d24a94a4216d6ee53f4cae27cc0d19d9f773b`，开工干净，UI 目录不存在。
- 实现提交：`7f81796721526e308b2b3768fd44aab47cd4daba`，23 个 UI 文件。
- 三个 final 的 before/after HEAD 均为上述实现 SHA，Git status 均为空。后续提交仅含本报告与本票归档证据。
- 检查入口始终使用主线绝对路径 `F:/new/smaltalk/water/scripts/checkup-wave-check.mjs`，SHA-256：`ad0ac67c9ed696715d037408d5b14f7a24bba2039b5fef04fc64a49bfeff2378`。

只改票面白名单，未修改冻结设计、契约、检查工具、主线台账或其它树；无 push、merge、rebase。结构和运行说明见 [UI README](../../../apps/water/ui/README.md)。

## 受阻与补单 01

首次执行在实现前发现“每次浏览器运行新增截图”与 final 前后 Git 干净的冲突，提交受阻回执 `e06d24a`。总控补单 01 明确改为测试写 `.local`、archive 核对哈希后复制。此次从 `e06d24a` 续做，**未重跑 baseline**。原受阻回执保留在 Git 历史，原 baseline 证据也保留。

测试读取 `WATER_W2_SHOTS_DIR`；无变量时写本树 `.local/ui-shots/<时间戳>/`。PNG 全部平铺，测试不写 `docs/`。final 前后 Git 干净，截图在 gate 结束后归档，原冲突没有复发。

## 逐项需求对照

| 需求 | 实现与验证 |
|---|---|
| 首页、扫描、结果、详情、确认、清理、完成 | 各自 `views/*.mjs`；系统盘水位瓶、进度环、分类卡、级别图例、操作坞；真实鼠标点击走完整 IPC 回放流程 |
| 趋势、记录、位置、隐私 | 六个 hash 路由；空间图/增长榜/泄漏建议；记录展开分组与日志位置；分类开关、添加取消/成功、移除、锁定开关；隐私说明 |
| 冻结视觉与 token | 近白底、白玻璃、纯蓝按钮、细线图标、200 字重数字、小圆点级别；无渐变、emoji 或英文装饰标题。tokens 原字节 SHA-256：`703e7b3c185bd95d79bb580cc1911736962159846832ece5a40ba5df0770cb29`，与设计源一致 |
| 零 npm / 安全 DOM | 无框架、依赖或打包器；index 仅两个 CSS、一个模块脚本；文本通过 textContent 构建，检查器静态政策通过 |
| IPC | 17 个导出命令函数，仅 ipc.mjs 接触宿主；显式组装参数，只发 ID、布尔、ID 数组。直接传路径被单测拒绝，浏览器假宿主也检查全部参数 |
| BigInt / 格式 | 字节解析、合计、四舍五入均用 BigInt；GB 一位小数、MB 整数、<1 MB、千分位、相对时间、超过 2^53 的输入通过单测；只把有界百分比转为 Number |
| 选择 | 默认来自 default_selected；selectable=false 在默认、直接修改、分类全选和合计均受保护；已选体量按 eligible_bytes，新扫描结果重置选择 |
| 任务生命周期 | 250ms 串行进度轮询，切换导航继续，结束即停；忙碌时禁用开始操作；停止扫描显示部分结果；清理后旧结果失效，重新扫描前不能再次清理 |
| 确认与错误 | clean_prepare 后才弹确认；红色不可恢复提示及含体量按钮；提交时锁住按钮；显示 message_zh，未知错误回退；滚动后的错误提示保持可见 |
| 键盘与动效 | Tab 到达全部可操作控件，空格选择、Enter 详情、Esc 关闭；确认框焦点锁定与返回触发控件；aria-live 进度。减少动画下无运行中的动画 |
| 截图 | 最终 12 张必需图 + 5 张状态图齐全，逐张查看并与冻结预览对照，见下文 |

动效采用本地 [ui-animation 技能](C:/Users/37310/.agents/skills/ui-animation/SKILL.md)，以项目冻结时长为准。水波使用时间相位，避免进度重绘重启动画；不可见水波暂停。普通列表卡不逐行加模糊，浮层/遮罩/操作坞最多三层。未声称实测原生 WebView2 60fps。

## 检查命令与历史

全部在本票工作树根目录运行，共同命令前缀：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E
```

下表参数接在此前缀之后。时间均为 UTC；每行时间/PID 对应 [receipts](../../acceptance/wave2/e/receipts/) 内的 `2026-10-26T<时间>-<PID>-<mode>-result.json` 及原始日志。保留全部失败记录。

| 时间 / PID | 参数 | 结果 |
|---|---|---|
| 05-03-29.899Z-23872（前次） | `--mode baseline` | exit 0，只证明环境输入就绪 |
| 05-05-16.887Z-38764（前次） | `--mode archive` | exit 0，原受阻证据 |
| 05-42-00.649Z-41136 | `--mode test` | exit 1，browser.test.mjs 尚未写完，capture 报 ENOENT；未运行产品测试，不作负控 |
| 05-44-11.205Z-19376 | `--mode test` | exit 0，3/3 |
| 05-44-41.651Z-38556 | `--mode check` | exit 0 |
| 05-44-46.366Z-39416 | `--mode browser` | exit 1，结果横向溢出；确认框选择器误作用于同名级别标记，已限定为 dialog.confirm |
| 05-46-27.697Z-41824 | `--mode browser` | exit 1，测试表达式引号错误；场景重置也改用唯一查询参数建立新文档 |
| 05-48-39.542Z-15892 | `--mode browser` | exit 1，3/4；CDP Enter 缺少字符文本，等待详情超时；补足键盘事件后通过 |
| 05-51-49.471Z-42688 | `--mode browser` | exit 0，4/4、17 图；后续继续按看图与动效检查修订 |
| 05-54-03.605Z-19980 | `--mode check` | exit 0 |
| 05-54-12.473Z-18448 | `--mode browser` | exit 0，4/4、17 图；全部截图页面均检查两尺寸横向溢出 |
| 05-59-25.326Z-41392 | `--mode browser` | exit 0，4/4、17 图；修复滚动后错误不可见并增加断言 |
| 06-02-07.007Z-28348 | `--mode red-nc1` | 检查器 exit 0，捕获预期测试 exit 1；2 过 1 失败，命中 UI_LEVEL_GUARD |
| 06-02-11.258Z-40652 | `--mode test` | exit 0，立即恢复后的 3/3 |
| 06-02-56.837Z-42120 | `--mode check --final` | exit 0，政策、语法、范围、冻结指纹通过 |
| 06-03-02.294Z-4184 | `--mode test --final` | exit 0，3/3，负控/精确恢复证明通过 |
| 06-03-06.630Z-39516 | `--mode browser --final` | exit 0，4/4、17 图齐全，无 skip/todo/cancelled |
| 06-04-45.296Z-4868 | `--mode archive` | exit 0，按原字节与截图哈希归档；该命令自身回执留在 .local，不递归归档自身 |

精确测试名：`ui_format_bytes_time`、`ui_selection_rules`、`ui_ipc_boundary`；`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`。每轮完整运行，没有过滤、跳过或降低断言。

另运行 `git diff --cached --check`。初次原字节 tokens 的 CRLF 被 Git 视作行尾空白；仅在自有 `.gitattributes` 为该文件声明 `-text whitespace=cr-at-eol`，token 字节不变，检查通过。

## 有效负控

在实现提交上仅将 `model.mjs:10` 的 `if (!canSelect(group))` 临时改为 `if (!group)`，去掉不可选组判断；未改测试、未加开关。`ui_selection_rules` 直接调用 setSelected 失败：

```text
UI_LEVEL_GUARD: direct selection must reject nonselectable groups
true !== false
```

立即 `git checkout -- apps/water/ui/model.mjs`，恢复 SHA-256 `ff54d0fdd5bfd6131e7a345d99d757ab6e453bde0933be4a73ba5ec010220765`，与改坏前相同，完整三测变绿。

最终生产摘要哈希 `293370f24db77da2e0ed57059c071c7d807d0349e7dd1527771c4300df725c1c`；测试摘要哈希 `82b2282cabbdae20c66db5b5e1ac2b223ccdb48d6229e2dde057f73050a08750`。三个 final 相同；final test 的 proofAudit 精确引用上述 red 与恢复 test。

## 逐屏看图

已在一个私有无头 Chrome 中依次打开静态稿八屏，并查看其浏览器截图和八张冻结预览 PNG。最终图位于 [2026-10-26T06-03-06.630Z-39516](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/)，下列每张都已实际打开。

通用一致：232px 导航、40px 顶部预留、白玻璃层级、深墨文字、纯蓝按钮、细大数字、细线图标、胶囊坞。通用差异：冻结预览带设计稿切换栏及外围窗口，产品截图只有应用；原生窗口按钮留待宿主接线，不绘制无效控件。水面遵照票面用两种纯色，未复制静态稿 SVG 渐变；品牌用同套线条水滴。“一致”指结构与视觉语言，不声称逐像素相同。

| 最终归档图 | 一致 / 差异与原因 |
|---|---|
| [首页](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/home-1240x820.png) | 一致：系统盘主卡、右侧磁盘条、球形按钮。差异：首次未体检，指标显示待体检/暂无对比，无虚构上次结果；E 盘剩余未低于 10%，按实际数据保持蓝色 |
| [扫描](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/scan-1240x820.png) | 一致：左水环、右分类、停止操作。差异：回放 27.5 GB、182,280 文件、0:29；含第九类“未识别” |
| [结果 1240](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/results-1240x820.png) | 一致：大数字/右比例卡、洞察、过滤、分类、坞。差异：推荐 31.2 GB、识别 53.5 GB；按体量排序使较大的受保护分组靠前；行内 total_bytes 与已选 eligible_bytes 区分 |
| [结果 1040](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/results-1040x720.png) | 一致：保留全部操作与层级。差异：收紧边距/列宽，更多行纵向滚动；无横向溢出或按钮截断 |
| [详情](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/detail-1240x820.png) | 一致：500px 右抽屉、级别、三格数据、三段说明。差异：可清理/跳过及前缀分布完整展示后清单下移，可滚动访问最多 200 项和复制建议；背景保留点击前滚动位置 |
| [确认](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/confirm-1240x820.png) | 一致：520px 居中玻璃、红色风险与含体量按钮。差异：31.2 GB / 2,250 项来自 CleanPreview；13 组逐个列在内嵌滚动清单，不用“另有 8 组”代替 |
| [清理中](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/cleaning-1240x820.png) | 与 DESIGN 5.6 一致：水环、已释放、当前组、停止。静态稿无独立此屏；首帧 3/2,250 项四舍五入为 0%，水位接近满，4.2 GB 来自回放 |
| [完成](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/done-1240x820.png) | 一致：释放数字、双瓶、结果列表。差异：回放 30.7 GB，C 59.8→74.7、F 243.1→258.9 GB；13 组完整展示，长列表滚动，保留占用跳过说明 |
| [趋势](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/trends-1240x820.png) | 一致：上方空间图、下方增长榜/建议。差异：按真实时间间隔绘制直线，10 月 23 日相隔 3 小时的点形成陡转折；无装饰性平滑曲线/渐变面积，另提供可展开文字读数 |
| [记录](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/history-1240x820.png) | 同一视觉语言的倒序玻璃列表，时间/组数/跳过摘要/释放量清楚，点击展开分组与日志。静态稿无此页，依 DESIGN 5.9 实现 |
| [位置](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/locations-1240x820.png) | 一致：分类图标、说明、开关、自定义文件夹。差异：回放有七类，含显卡与系统缓存，添加按钮位于下方滚动区；测试实际完成取消、添加、移除和锁定检查 |
| [关于与隐私](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/about-1240x820.png) | 同一视觉语言的版本与四段说明；无网络请求/外链。静态稿无此页，依 DESIGN 5.11 实现 |

附加五图也已查看：[上次结果首页](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/home-last-scan-1240x820.png)（按回放增加增长洞察）、[busy](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/busy-1240x820.png)（提示始终可见）、[stale](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/stale-1240x820.png)（滚动中提示可见，清理禁用）、[趋势空态](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/trends-empty-1240x820.png)、[无法连接](../../acceptance/wave2/e/screenshots/2026-10-26T06-03-06.630Z-39516/unavailable-1240x820.png)。保持同一白玻璃和文字层级。

## 归档

[ARCHIVE.json](../../acceptance/wave2/e/ARCHIVE.json) 登记 489 个条目、36,941,297 字节，含四次通过的浏览器运行共 68 张图。失败日志与源码快照保留，失败截图不由 archive 复制；未删除 .local 原始现场。

归档包含开工前既有的 04:48 baseline 预检，不冒称本次执行。另对全部 489 条目的字节数与 SHA-256 独立复算一致，报告 22 个链接均可解析。归档阶段的通用 Git 空白检查会把原始 tokens 快照及日志中的 CRLF/空白提示为告警；这些是检查器按原字节生成的证据，保持原样，不为清除告警修改证据内容。产品提交的空白检查与三个正式 final 均已通过。

最终 17 图和 05:54 的 17 图逐张打开；其它成功历史图按 SHA-256 与已查看图去重，相同字节复用审阅，其余 10 个不同字节的历史图也逐一打开。旧图保留中间状态（含旧错误提示未置顶），不能代替最终图。没有修改 gate 后的原始截图。

## 真实冒烟、边界与未验证事项

- 本票无 real 模式，未扫描或删除真实数据。全部 IPC 是测试内回放，“已释放”是回放值，不表示本机释放了空间。
- 一次静态稿浏览加七轮产品浏览器测试，始终一个私有无头 Chrome；原生窗口 0、原生文件夹对话框 0。测试退出关闭浏览器与 loopback 服务；交回前本树私有 profile 关联浏览器进程数为 0，未输出进程命令行。
- 未安装或下载字体/依赖、未读取真实用户目录/文件内容、未手工递归删除或清理其他现场。
- 未验证或实现：Tauri 宿主接线、真实扫描/清理、Mica、原生窗口控件与关闭事件、WebView2 60fps、macOS、真实触屏。原生关闭中文确认需下一波宿主拦截；IPC v1 没有窗口控制命令。本票仅有顶部预留/拖动标记与浏览器标准 beforeunload 清理中保护，不能冒充原生关闭验收。
- 浏览器目录保护由可信宿主规则/执行器落实，前端只消费 selectable，不按名字臆测分类。冻结回放的 `chrome-service-worker-cache`（“网站离线数据”）为 confirm/selectable=true，而 `chrome-login-and-site-data` 为 protected/false；前者与项目“网站存储始终保护”的总体边界需要总控在真实接线前核对。本票未改冻结回放，也未把该组纳入默认清理；本次 UI 验收不能作为网站存储可删的依据。
- 剪贴板只在用户点击复制建议时写入；未验证所有原生 WebView 权限配置，失败时提示选择文字复制，未读取剪贴板。

报告与证据提交后停止本票测试和后台进程，等待总控审阅。
