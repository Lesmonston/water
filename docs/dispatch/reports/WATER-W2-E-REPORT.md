WATER-W2-E 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-e/docs/dispatch/reports/WATER-W2-E-REPORT.md

2026-10-26。执行引擎：Codex（GPT-6；会话未暴露更细子型号）。未使用子代理。交付为 SUBMITTED，待总控独立看图验收；不自行标记 VERIFIED。

## 提交与范围

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
