WATER-W8-K6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k6/docs/dispatch/reports/WATER-W8-K6-REPORT.md

# WATER-W8-K6 执行回执

- 执行者 / 实际模型：Codex（本会话提供的模型标识为 GPT-6；不以 manifest 中用户安排的 astra 名称推断更细的运行版本）。未启动子代理。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w8-k6`；分支：`worker/water-w8-k6`。
- 初始 HEAD：`912eba100ba342c3eeb21ba555c6d589b91e6b4f`，初始工作树干净。
- 实现提交：`53f1e467910bbeb854f0c46ec3d29c4d82c5e513`。三个 final 均在该干净提交上运行。
- 交回状态：实现与本票自验完成，供总控收单；未修改 manifest/registry，未自行宣称 VERIFIED。
- 改动仅在 `apps/water/ui/`，后续提交仅含本报告和归档器生成的 `docs/acceptance/wave8/k6/`。
- Git 身份仅在提交进程中设置为 `Codex <codex@localhost>`；未修改 Git 配置、远端或历史，未 push、merge、rebase、amend、reset。

## SPEC 第 1～6 节逐条对照

| SPEC | 实现位置 | 已实现与验证 |
|---|---|---|
| 1：组内排除 | model.mjs、app.mjs、views/detail.mjs、views/results.mjs、views/confirm.mjs、ipc.mjs | 选择变为 Map<组 ID, Set<排除条目 ID>>。可清理条目默认勾选，取消会扣除其体量和项数。整组取消清空排除；整组排空不传给 clean_prepare；只从所选组的已读详情提取可清理条目的排除 ID。确认框使用宿主 excluded_count，0 时隐藏。新扫描清空旧详情与排除。 |
| 1：以后都跳过 | app.mjs、ipc.mjs、views/detail.mjs | skip_add 仅传 itemId，成功显示规定句子并重读当前组详情；提示在抽屉内也可读。只打开详情不改变分组选择，实际修改条目时才选择该组。受保护、不可清理条目没有勾选和跳过入口。 |
| 2：逐项在用 | views/detail.mjs、views/results.mjs | 条目使用 in_use.process_label_zh 的低调标签，复选框仍可操作；组行直接显示宿主新的含占用项数文案。测试核对 Codex 条目标签和组行句子。 |
| 3：按盘筛选 | model.mjs、app.mjs、views/results.mjs | 多盘提供“全部盘”及盘符/卷标；单盘隐藏筛选。组数量、组体量、分类合计、主合计和已选体量按 by_drive 投影；无条目的组隐藏，选择不变。跨盘组测试中 F 部分为 2 项 / 1.0 GB，整组总量不会混入。界面明确“筛选只影响显示，清理包含全部已选分组”。 |
| 4：位置 | views/locations.mjs、app.mjs、ipc.mjs | is_drive_root 显示“整个 F 盘”，保留上次时间和体量；说明加入“也可以选择整个非系统盘”。跳过列表显示路径、加入日期及恢复按钮，skip_remove 仅传 skipId，空列表隐藏该节。 |
| 5：首页 | views/home.mjs | 从未体检、已经 9 天没有体检、无提醒三态均覆盖；“现在体检”通过原有 scan 动作启动，提醒本身不自动触发调用。 |
| 5：趋势 | views/trends.mjs | 每盘显示宿主 basis_days / days_to_full 或 note_zh；速度不为正时不画“满”的提示。残留进程显示名称、特征、数量、可空内存、开始时间和规定说明，无按钮或结束入口；forecast 空数组 / orphans null 时隐藏新卡片。 |
| 6.1：读写顺序 | app.mjs、tests/browser.test.mjs | addRoot、toggleCategory、removeRoot、skip_add、skip_remove 均经 locationOperation 使用 locations 的 routeReads 序号；被后续读取或路由替代的成功与错误都丢弃。覆盖旧读晚于写返回、旧写晚于新页面读返回，以及旧 stale 错误不污染新页。 |
| 6.2：注释 | app.mjs | fault() 注释明确：被取代的读取在调用 fault 前丢弃；其它旧命令的 stale 仍按原规则令结果过期。 |
| 6.3：标题栏 | styles/app.css | 提示条出现时改用玻璃 token 的透明填充与 backdrop blur，取消强制 alpha=1 的窗口色。 |
| 6.4：加严测试 | tests/browser.test.mjs | UI_READ_ORDER 覆盖位置读写；UI_NOTICE_TOP 测透明 alpha、blur、命中区域及正文/提示几何间距；UI_RECOVER_ERROR 对不同错误码使用同一句文字，确保按状态决定清理/保留提示。 |
| 6.5：控制台归属 | tests/browser.test.mjs | 假宿主绑定 owner 测试名；afterEach 后迟到错误归入 lateErrors，最终 hook 单独报告原测试名，不算给下一个测试；关闭浏览器和服务器放在 finally。 |

保留原 17 个命令的调用方式，增加 skip_add / skip_remove；clean_prepare 的原单参数调用仍只构造 groupIds，新界面显式传 groupIds 与 excludeItemIds。IPC 新增唯一 ID、数组长度 5000 上限和路径拒绝断言。全部文本经 DOM textContent 构建，未新增依赖、网络或文件访问。

分盘展示遵从 IPC-M3C：by_drive 只有 item_count / eligible_bytes，没有分盘总占用或 eligible_count。因此按盘体量使用该字段，不猜算分盘总占用；分盘模式不另显示“已选项数”，全部盘模式按 eligible_count 减排除精确展示。详情仍只使用宿主最多 200 条展示数据，不能排除未展示的条目。

## 测试与旧断言

精确保留 3 个单元测试和 5 个浏览器测试名称，无新增顶层测试、过滤、ignore、skip 或放宽超时。新增标记 UI_M3C_EXCLUDE / SKIP / DRIVE / INUSE_ITEM / FORECAST / ORPHANS / DUE 和 UI_IPC_NO_PATH 均覆盖实际入口。

- ui_ipc_boundary 原命令 cases 为 17 项，现为 19 项，新增 skip_add / skip_remove 的输入和键表；原 Object.keys 清单相等、参数键和值相等断言原文保留，另加显式长度 19 断言。原 clean_prepare 单参数键仍是 groupIds。
- 按 UI-M3C §6 明示加严 UI_NOTICE_TOP 的测量：原 covered 可被任意不透明 rgb 满足，现要求命中标题栏且为 0 < alpha < 1 的 rgba 与 blur；原覆盖断言保持，并补几何断言。没有将原条件放宽。
- UI_READ_ORDER、UI_RECOVER_ERROR 为追加断言；控制台收集按 §6 改为 owner 归属与迟到错误单独报告。
- 其它原有断言、标记与清理文案均保留。旧场景继续验证原 fixture；新场景使用旧 fixture 加 M3C 同名覆盖，冻结 fixture 文件没有修改。
- 分盘测试只在假宿主内拆分一个组到 C/F，并同步推荐分盘量；提醒场景的测试时钟设为上次扫描后 9 天。没有产品测试开关。
- 浏览器验证了两种尺寸、键盘 Tab/空格/Enter、Esc、确认焦点锁、减少动画、停止失败与恢复、旧清理/记录流程。未执行真实清理。

## 检查命令与结果

全部从指定工作树根运行。命令前缀统一为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K6
```

下表每行追加对应参数；原始结果及日志见 [ARCHIVE.json](../../acceptance/wave8/k6/ARCHIVE.json) 中的 receipts。时间均为 2026-10-31 UTC，stamp 可唯一对应回执。

| stamp | 参数 | 结果 |
|---|---|---|
| 14-15-59.949Z-5988 | --mode baseline | passed，退出 0，指定 HEAD / 干净树 |
| 14-23-38.287Z-25356 | --mode check | passed，退出 0 |
| 14-23-48.817Z-11980 | --mode test | passed，3/3，退出 0 |
| 14-24-04.653Z-43988 | --mode browser | passed，5/5，退出 0，102.682 秒 |
| 14-26-59.742Z-41956 | --mode check | passed，退出 0 |
| 14-27-31.172Z-32204 | --mode test | passed，3/3，退出 0 |
| 14-27-56.801Z-32072 | --mode browser | passed，5/5，退出 0，97.010 秒 |
| 14-31-16.119Z-3840 | --mode red-nc1 | passed：浏览器按预期退出 1，仅目标断言失败 |
| 14-32-59.068Z-27668 | --mode test | 原字节恢复后 passed，3/3，退出 0 |
| 14-33-27.615Z-4732 | --mode red-nc2 | passed：浏览器按预期退出 1，仅目标断言失败 |
| 14-35-23.641Z-41280 | --mode test | 原字节恢复后 passed，3/3，退出 0 |
| 14-35-59.992Z-6188 | --mode red-nc3 | passed：浏览器按预期退出 1，仅目标断言失败 |
| 14-37-36.058Z-39712 | --mode test | 原字节恢复后 passed，3/3，退出 0 |
| 14-38-28.325Z-376 | --mode check --final | passed，退出 0，7.985 秒 |
| 14-39-05.528Z-21608 | --mode test --final | passed，3/3，退出 0，5.223 秒；三条 proofAudit 通过 |
| 14-40-05.149Z-8480 | --mode browser --final | passed，5/5，退出 0，89.191 秒 |
| 14-43-08.307Z-33916 | --mode archive | passed，退出 0，5.990 秒 |

工作树已有两份总控派前 baseline（14-09-00.251Z-24620 与 14-10-24.474Z-27996），归档器一并保留；不是本执行者重跑的结果。所有自跑普通检查均通过，无环境重试。首轮 check 的工具会话稍后才读取完成通知，其检查实际结束于 14:23:48.590Z，test 在 14:23:48.819Z 开始，未重叠执行重负载检查。

最终三个门及三次恢复 test 的生产汇总 SHA-256 均为：
`ff47a3a0be8730272dcf93d101963887fda99091e91740233ec1eab1ace94e28`。
测试汇总 SHA-256 均为：
`9aeddcff0974e46fb8136e05c31e959ccdb7a9dfcd8c9e63584efd73a96ebf64`。

## 有效负控

每次只改一个产品文件的一处，未改测试；检查器记录源快照。红后立即 `git checkout -- <该文件>`，随后运行 --mode test。原字节恢复的单文件 SHA-256 实测如下：

| 负控 | 临时改动 | 实际失败 | 恢复 SHA-256 |
|---|---|---|---|
| nc1 | app.mjs：clean_prepare(groupIds, excludeItemIds) 改为传空数组 | UI_M3C_EXCLUDE: clean_prepare sends the exact exclusion；实际 []，预期 [i-000202] | 263214fdf01c0522227826f7957d7e11885f45241c3437e4ddfa62cdfed98279 |
| nc2 | model.mjs：分盘投影 total_bytes 取 group.total_bytes | UI_M3C_DRIVE: total uses by_drive quantities；实际 76.3 GB，预期 17.4 GB | abd6cc8fa751c782d7b62465a1f3714338e49d41e5896b4617439f4ca01510fc |
| nc3 | views/trends.mjs：无天数分支显示空串，去掉 note_zh | UI_M3C_FORECAST: D:\\ shows its forecast or explanation | d29241f707df6aa9b923a4eb8528df5c7f07462d5eb6f03d298ab242ce2001a5 |

三次均为目标断言红，无语法错误、超时或无关旧标记先失败。恢复记录与 final 的生产/测试哈希一致，详见 test --final 的 proofAudit。

## 最终截图逐张检查

已逐张打开最终 browser --final 的原始 PNG，并对照设计 previews 的首页、扫描、结果、详情、确认、完成、趋势、位置页。白色玻璃、墨色数字、纯色强调与既有布局一致；图标沿用 DESIGN §10 的冰山/脉搏线，未恢复早期预览的水滴。数据与静态设计稿数字差异来自冻结 fixture。

最终截图目录：[screenshots/2026-10-31T14-40-05.149Z-8480](../../acceptance/wave8/k6/screenshots/2026-10-31T14-40-05.149Z-8480/)。

requiredScreenshots 的 26 张全部齐全，逐张观察如下。旧浏览器测试实际上还有 5 张状态图；为保持旧测试与截图语句，最终保留 31 张，额外 5 张在下一表说明，不将它们算入必需 26 张。

| 必需截图 | 实际看到的内容 |
|---|---|
| home-1240x820.png | 首次首页 59.8 GB 可用，水位瓶、三块其它盘卡、“待体检/尚未体检”和纯蓝开始按钮；两段说明无短孤行。 |
| scan-1240x820.png | 27.5 GB / 62% 水波环，分类完成/扫描中/等待三态，182,280 文件、0:29 与停止扫描。 |
| results-1240x820.png | 原回放 31.2 GB 推荐量、四级汇总、分组选择，操作坞显示 13 组 / 2,250 项。 |
| results-1040x720.png | 最小尺寸下结果、筛选、排序和操作坞可读，无横向溢出；滚动中行经过悬浮坞下方。 |
| detail-1240x820.png | Codex 分组右侧磨砂抽屉，3.6 GB、47/48、三段说明、增长及前缀；底部内容可在抽屉内滚动。 |
| confirm-1240x820.png | 居中确认框，31.2 GB / 13 组 / 2,250 项、可滚动清单、在用说明、红色永久删除风险和取消按钮。 |
| cleaning-1240x820.png | 4.2 GB 已释放水波环、3/2,250 项、停止按钮与“正在删除的这一项会停在中途”的新句子。 |
| done-1240x820.png | 30.7 GB 实际释放、C/F 前后水位及可用量；Chrome 部分完成并写明 6 个配置在用跳过。 |
| trends-1240x820.png | 原五点可用空间曲线、最低/回升/今天标注、增长榜和已停止泄漏建议，白色玻璃体系保持。 |
| history-1240x820.png | 清理完成及两次体检记录，时间、体量、跳过 6 项；清理勾与体检脉搏图标区分。 |
| locations-1240x820.png | 原七分类开关、崩溃日志关闭，自定义文件夹行在下方；版式和保护说明保持。 |
| about-1240x820.png | 冰山品牌卡、读取/不读取/本地数据/确认清理四块说明，纯文本与清晰段落。 |
| results-bottom-1240x820.png | 长列表滚到底，最后受保护行完整，操作坞与最后行有明确空隙。 |
| results-bottom-1040x720.png | 小尺寸同样完整露出最后三条受保护行与坞上方空隙，测试量测至少 16px。 |
| notice-results-1240x820.png | M1 服务提示贴顶，磨砂标题区与第一分类清晰，底部操作坞仍可见。 |
| notice-trends-1240x820.png | 切趋势后旧 M1 提示消失，图表与增长内容完整。 |
| trends-empty-1240x820.png | 冰山空态和“再体检一次就能看到变化”，未伪造趋势。 |
| paused-1240x820.png | 服务不可用提示、重新连接按钮与清理中的已处理状态同时保留。 |
| reconnecting-1240x820.png | 顶部“正在重新连接 Water 服务…”、扫描状态仍在，没有重启任务按钮。 |
| stop-failed-1240x820.png | 扫描停止失败说明位于停止按钮下，顶部保留连接失败原因；两者未混用。 |
| clean-stop-failed-1240x820.png | 清理停止失败红字在清理卡按钮下，顶部“未能确认清理状态”及重连保持。 |
| detail-exclude-1240x820.png | 第二条 950 MB 未勾选；第一条勾选且有“Codex 正在使用”；每个可清理项有“以后都跳过”，第四条已跳过无勾选。 |
| results-drive-1240x820.png | F: 数据盘选中，显示筛选不改变清理范围说明；主量/已选 15.2 GB，分盘合计 17.4 GB；跨盘 Codex 行仅 2 项 / 1.0 GB。 |
| locations-skipped-1240x820.png | “整个 F 盘”及时间体量、整个非系统盘提示；两条跳过路径、加入日期、独立恢复按钮均可见。 |
| trends-forecast-1240x820.png | C 盘 30 天基期 / 23 天后满，D/E/F 的三种 note；node 9 个 900 MB、chrome 6 个 380 MB、cmd 1 个内存“—”，各有开始时间，无操作按钮。 |
| home-due-1240x820.png | 首页卡片中的“已经 9 天没有体检”和“现在体检”；上次体检显示 10 月 26 日，与测试时钟的九天间隔一致。 |

| 保留的额外旧截图 | 实际看到的内容 |
|---|---|
| loading-1240x820.png | 冰山加载态“正在读取…”，没有误报连接失败。 |
| home-last-scan-1240x820.png | 上次扫描首页、可释放水层、增长洞察及“查看结果”。 |
| busy-1240x820.png | 顶部正在进行另一项任务的提示，首页数据与玻璃材质保持。 |
| stale-1240x820.png | 过期提示在顶，第一分类标题完整位于其下，清理禁用，没有第二份正文过期句。 |
| unavailable-1240x820.png | 无宿主时明确“无法连接 Water 服务”与重连入口，无演示结果填充。 |

## 归档、边界与未验证项

归档器生成 [ARCHIVE.json](../../acceptance/wave8/k6/ARCHIVE.json)，共 522 个索引条目、51,375,734 字节，包含完整正向/负控/恢复源快照、日志和三轮成功浏览器截图；未手工编辑证据。本报告之外的交付材料均来自 archive。

交付前只读复核：522 个归档文件的字节数/SHA-256 与索引及原始 .local 文件全部一致；final 捕获的 23 个源码/测试文件与当前字节一致；最终 31 张 PNG 已全部打开查看。按本工作树路径过滤的私有 Chrome/Edge 残留进程计数为 0（未输出任何命令行）；git diff --check 通过。

本票未运行 Tauri/Cargo、原生窗口、目录选择框、真实扫描、真实文件删除、真实进程终止、npm 安装或外网请求。浏览器测试每次仅一个工作树私有 headless Chrome，静态服务仅 loopback，关闭由冻结 helper 和测试 finally 执行。本票没有临时合成文件删除测试；没有清理其它工作树或用户数据。

尚未验证：真实 K4 服务/K5 宿主联调、原生 WebView2/Mica、生产竞态、真实 F 盘扫描与清理、macOS、滚动 60fps。fixture 验证不代表上述链路已验收。新命令须按派单顺序等服务接通后集成。


## 补单 01（2026-11-01）

本节记录补单 01 的最终交付。上文完整保留为上一轮历史；涉及“修改条目会选中组”、操作坞按盘显示及保护组分盘体量的旧行为，均由本节与补单 01 取代。此前失败与证据保留，不作为本次 final。

### 身份、起点与提交

- 执行者 / 实际模型：Codex（会话提供的模型标识为 GPT-6，不能进一步核实运行版本；未按派单中的 astra 名称推断模型）。未启动子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w8-k6`；分支：`worker/water-w8-k6`。
- 续做起点：`208be441adbceb56ec36eeb1debf1cef4e113458`，首次核对 HEAD 一致、树干净。未重跑 baseline。
- 产品与测试实现提交：`41edb43cccb836db1721b1b2f4b90d46f6603699`。
- 最终实现提交（另补齐 UI README 的行为说明）：`43a650464e89a524842894fde24417ea13709709`。三个 final 全部在该干净提交运行，之后只提交本回执与 archive 生成的证据。
- 仅新增提交，身份只在提交命令进程设置为 `Codex <codex@localhost>`。未改 Git 配置、远端或历史，未 push、merge、rebase、amend、reset、squash。

### 补单第 1～4 条逐项对照

| 条目 | 实现与满足方式 | 覆盖 |
|---|---|---|
| 1 未选组条目 | `model.mjs` 的 `setItemSelected` 拒绝修改未选组，直接调用 true/false 均不增加组；`views/detail.mjs` 的未选组条目为未勾选且禁用，并在清单上方显示“先在结果页勾选这个分组，才能逐项排除。”。跳过按钮独立于组选中状态。 | `ui_selection_rules` 的 `UI_M3C_EXCLUDE: item changes never opt an unselected group into cleanup`；浏览器验证禁用、未勾选、说明、点击不改变操作坞，以及未选组的跳过操作仍可用。 |
| 2 分类全选 | `selectCategory` 接收当前盘，只操作该盘 `by_drive.item_count > 0` 的组；`views/results.mjs` 的勾选与半选状态使用同一批组。无盘筛选保持原作用范围。 | `UI_M3C_DRIVE`：F 分类全选忽略隐藏的 C 确认组；取消 F 分类后 C 已选组保持；再勾选 F 不会选入隐藏的 C 确认组。 |
| 2 操作坞 | 操作坞的组数、项数、体量始终来自全部有效已选组，与 `cleanSelection` 的清理范围一致。另列 `其中 F: …`，按 `by_drive.eligible_bytes` 扣除该盘排除项；主数字和分类已选量仍按当前盘计算。 | `UI_M3C_DRIVE`：全盘三项统计、分盘小字、F 排除后两种体量，以及带盘筛选的 `clean_prepare` 完整组 ID 与排除 ID。截图显示 13 组 / 2,250 项 / 29.7 GB、其中 F: 15.2 GB。 |
| 3 跳过同时排除本次 | `app.mjs` 在 `skip_add` 成功后、详情重读前调用选择模型排除该项。未选组不会被选中；重读后原 `rememberDetail` 保留可清理项排除、移除已不可清理项的排除。假宿主默认仍将当前扫描项设为不可清理，同时同步组、分盘可清理量；仅测试使用 `skipKeepsCurrentScan` 模拟旧服务。 | `UI_M3C_SKIP`：新服务重读后无勾选入口、请求不含已不可清理项；旧服务重读后该项未勾选且 `clean_prepare.excludeItemIds` 恰为 `["i-000202"]`。两种组选中状态都验证跳过成功。 |
| 4.1 保护/参考体量 | `driveResult` 对只有当前盘的保护、参考组使用整组 `total_bytes`；跨盘用内部空值表示未知，行显示“—”，合计只累加确定部分并加“至少”。分类合计与整体识别合计同样标明不完整，不把未知当零体量显示。 | `UI_M3C_DRIVE`：F 合计包含 56.0 GB 工作树；合成的跨盘参考、保护组均显示“—”，两级概览显示准确已知部分及“至少”。无路径访问，冻结 fixture 未改。 |
| 4.2 旧扫描详情 | `actions.detail` 发请求前捕获 `scan_id`，返回时同时检查路由、扫描 ID、未过期状态，满足后才调用 `rememberDetail`。跳过后的详情重读也检查同一扫描与未过期状态。 | `UI_READ_ORDER`：保持在结果页，分别让扫描安装不同 ID 的新结果、让清理结束使旧结果过期，再释放延迟详情；旧标题不进入结果，也不打开抽屉。 |
| 4.3 跳过后焦点 | `showOverlay` 可显式接收原返回 key；重绘同一抽屉传入原 `opener`，关闭旧抽屉后再设置新抽屉的返回焦点。 | `UI_M3C_SKIP`：未选组和已选组、两种服务行为下 Esc 均返回 `detail-custom:drive-f:node-modules`。 |
| 4.4 全部排除组 | 行与分类状态使用 `hasSelectedItems`，与预览和操作坞共用有效选择判定；排空时行未勾选且不半选，分类计为未选。显式重新选择排空组时可恢复整组。 | `UI_M3C_EXCLUDE`：排除全部 3 项后组框未勾选且 `indeterminate=false`，分类半选，预览不含该组；原单元测试继续验证不发送孤立排除 ID。 |
| 4.5 整盘字体 | `views/locations.mjs` 中整盘标签不再附加 `.path`；真实展示路径仍使用代码字体。 | `locations-skipped-1240x820.png`：整个 F 盘使用正文，旁边普通路径保留等宽字体。 |
| 4.6 预测列对齐 | `.forecast-row` 改为 grid：盘符列固定 2.5em，说明列左对齐。未改颜色、字号与 token。 | `trends-forecast-1240x820.png`：C/D/E/F 盘符后一列的预测/说明起点对齐。 |

`styles/app.css` 在样式编辑前已整份统一 LF。为满足“final 快照与提交字节一致”，还将工作区中 `.gitattributes` 与 `index.html` 的 CRLF 还原为其原提交的 LF 字节；两者没有 Git 内容变更，通过显式 `git add -- <这两个路径>` 刷新索引状态。全部 23 个 UI 文件最终工作区 / 提交 / final 快照相同。README 同步上述行为。IPC 19 命令、参数形状、路径边界、冻结数据、tokens、其它包未改。

### 改过的上一轮新增断言原文

本补单仅替换上一轮新增的以下两条断言。逐行对比本补单 diff 与 `912eba10`：单元测试删除旧断言 0 条，浏览器替换的两条均不在原基线中；其余原有断言与名字保持。仍精确 3 个单元测试、5 个浏览器测试。

1. 未选组条目状态：

改前：
```js
assert(await browser.evaluate('[...document.querySelectorAll(".items input")].every(e=>e.checked)'), 'UI_M3C_EXCLUDE: eligible items start checked, including in an unselected confirm group');
```
改后：
```js
assert(await browser.evaluate('[...document.querySelectorAll(".items input")].every(e=>!e.checked && e.disabled)'), 'UI_M3C_EXCLUDE: unselected group items are unchecked and disabled');
```

2. 筛选下操作坞体量：

改前：
```js
assert.equal(await browser.evaluate('document.querySelector(".dock b").textContent'), formatBytes(selectedF), 'UI_M3C_DRIVE: selected bytes also use F');
```
改后：
```js
assert.equal(await browser.evaluate('document.querySelector(".dock b").textContent'), formatBytes(selectedBytes(m3c.scan_result, resetSelection(m3c.scan_result))), 'UI_M3C_DRIVE: dock bytes cover all selected drives');
```

另有一条断言原文未改、期望值计算按第 4.1 条改动，完整列明：

改前：
```js
const expectedTotal = fGroups.reduce((sum, g) => sum + BigInt(g.by_drive.find(d => d.root === 'F:\\').eligible_bytes), 1073741824n);
```
改后：
```js
const expectedTotal = fGroups.reduce((sum, g) => sum + BigInt(['advisory', 'protected'].includes(g.level) ? g.total_bytes : g.by_drive.find(d => d.root === 'F:\\').eligible_bytes), 1073741824n);
```
保持的断言：
```js
assert.equal(await browser.evaluate('document.querySelector(".spectrum > .split b").textContent'), formatBytes(expectedTotal), 'UI_M3C_DRIVE: total uses by_drive quantities');
```

其余新增断言见测试文件中的原标记。本轮开发中新增选择器的字符串转义错误已修正；不是删除或放宽旧断言。

### 本轮检查命令与结果

全部在指定工作树根执行；本表每行的参数均接在同一完整前缀后：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K6
```

时间为 2026-10-31 UTC（本地 2026-11-01 JST）。日志在 [归档索引](../../acceptance/wave8/k6/ARCHIVE.json) 的 receipts 中，用 stamp 定位。

| stamp | 参数 | 结果 / 耗时 |
|---|---|---|
| 15-42-02.123Z-33736 | --mode test | 退出 1，2/3：新增未选组安全断言在修改产品前准确复现问题，5.018 秒。 |
| 15-44-27.853Z-35688 | --mode test | 退出 0，3/3，7.395 秒。 |
| 15-44-52.369Z-14508 | --mode check | 退出 0，11.338 秒。 |
| 15-45-02.259Z-26660 | --mode browser | 退出 1，3/5：两处本轮新增的浏览器求值字符串转义错误，79.652 秒；已修正。 |
| 15-47-00.374Z-22028 | --mode browser | 退出 0，5/5，127.035 秒，31 张图。 |
| 15-50-33.854Z-18372 | --mode red-nc1 | 入口退出 0，浏览器按预期退出 1，69.693 秒；README 更新前的有效记录。 |
| 15-51-56.165Z-40512 | --mode test | 恢复后退出 0，3/3，7.198 秒。 |
| 15-52-17.137Z-14824 | --mode red-nc2 | 入口退出 0，浏览器按预期退出 1，96.778 秒；README 更新前的有效记录。 |
| 15-54-32.260Z-23368 | --mode test | 恢复后退出 0，3/3，5.891 秒。 |
| 15-55-07.893Z-25172 | --mode red-nc1 | 最终字节取证，入口退出 0、浏览器预期退出 1，79.626 秒。 |
| 15-56-43.304Z-25756 | --mode test | 原字节恢复后退出 0，3/3，10.551 秒。 |
| 15-57-27.610Z-10304 | --mode red-nc2 | 最终字节取证，入口退出 0、浏览器预期退出 1，96.391 秒。 |
| 15-59-15.042Z-32832 | --mode test | 原字节恢复后退出 0，3/3，6.110 秒。 |
| 15-59-34.856Z-24984 | --mode red-nc3 | 最终字节取证，入口退出 0、浏览器预期退出 1，70.704 秒。 |
| 16-01-00.709Z-40880 | --mode test | 原字节恢复后退出 0，3/3，5.379 秒。 |
| 16-01-21.539Z-18424 | --mode check --final | 退出 0，7.959 秒，干净提交。 |
| 16-01-45.303Z-43808 | --mode test --final | 退出 0，3/3，5.755 秒；三条 proofAudit 通过。 |
| 16-02-12.243Z-38628 | --mode browser --final | 退出 0，5/5，92.193 秒，31 张图，必需 26 张齐全。 |
| 16-03-59.661Z-17564 | --mode archive | 退出 0，6.215 秒。 |

初次普通 check 返回运行会话 ID 后，过早发出了 browser，两个入口记录的时间区间重叠约 1.45 秒；没有同时运行两个浏览器。此后检查全部串行，三个 final 严格按规定顺序执行。没有环境超时重试；首轮浏览器失败系新增测试代码问题，原记录完整保留。

第一次 nc1/nc2 后发现 UI README 仍描述旧行为，补文档提交改变了生产哈希，所以在最终实现上重新执行 nc1/nc2；final 只采信后三条负控与对应恢复记录，没有把前两条冒充最终源码证明。另有只读 Node 数据展示命令曾因 PowerShell 引号失败、一次 rg 通配路径失败，均未修改文件，后续只读查询已完成。

### 最终负控、恢复与哈希

每次仅改一个实际产品文件的一处，测试文件不改；红后立即执行 `git checkout -- <该文件>`，紧接一次 `--mode test`。没有用语法错误、超时或测试开关制造负控。

| 负控 | 临时改动 | 实际失败信息 | 恢复后的单文件 SHA-256 |
|---|---|---|---|
| nc1 | `app.mjs` 中 `clean_prepare(groupIds, excludeItemIds)` 改为 `clean_prepare(groupIds, [])` | 首个失败 `UI_M3C_EXCLUDE: clean_prepare sends the exact exclusion`，实际 `[]`、预期 `["i-000202"]`；同一缺陷另被 `UI_M3C_SKIP: exclude legacy item, prune newly ineligible item` 抓住。 | `3f08a825b389084c0030930b94fdf29ca43cc21d95635700761bd9b6ecbce932` |
| nc2 | `model.mjs` 中分盘组 `total_bytes:total` 改为 `total_bytes:group.total_bytes` | `UI_M3C_DRIVE: total uses by_drive quantities`，实际 76.3 GB、预期 73.4 GB。 | `818cfbd801bccf7702e390777eacdbc45f3dabb9756976fc2fd657e4dabf091e` |
| nc3 | `views/trends.mjs` 中空预测的 `drive.note_zh ?? '可用空间没有减少'` 改为空串 | `UI_M3C_FORECAST: D:\\ shows its forecast or explanation`。 | `d29241f707df6aa9b923a4eb8528df5c7f07462d5eb6f03d298ab242ce2001a5` |

最终 proofAudit 配对：nc1 `15-55-07.893Z-25172` → `15-56-43.304Z-25756`；nc2 `15-57-27.610Z-10304` → `15-59-15.042Z-32832`；nc3 `15-59-34.856Z-24984` → `16-01-00.709Z-40880`。

三次最终恢复与三个 final 的生产汇总 SHA-256：
`e324852ea8c68f4102e747f44589f00ce6029a0f3abc26de017f4c5c8b116166`。
测试汇总 SHA-256：
`5f4158e6473c8a8211f01fae51a31fc0cc18aee7cee540330110c6aa39ffc8e3`。

### 最终截图逐张复看

已重新逐张打开 final 原始 PNG，而非复用上一轮观察；同时复看设计 previews 的首页、扫描、结果、详情、确认、完成、趋势、位置。沿用白色磨砂、纯色强调、细线图标；冰山与脉搏标志遵从 DESIGN 第 10 节。静态稿数据与冻结 fixture 的数值差异照旧。

本轮最终目录：[screenshots/2026-10-31T16-02-12.243Z-38628](../../acceptance/wave8/k6/screenshots/2026-10-31T16-02-12.243Z-38628/)。26 张必需图如下；额外 5 张是旧测试原有截图，未删除，不计入必需数。

| 必需截图 | 本次实际看到的内容 |
|---|---|
| home-1240x820.png | 首次首页 59.8 GB 可用、水位瓶、D/E/F 三盘条、待体检与尚未体检，蓝色开始按钮；说明分行完整。 |
| scan-1240x820.png | 水波环 27.5 GB / 62%，三类已完成、应用更新扫描中、其余等待；182,280 文件、0:29 和停止扫描。 |
| results-1240x820.png | 原回放推荐 31.2 GB、识别 53.5 GB，分类半选与需要确认组未选；操作坞 13 组 / 2,250 项 / 31.2 GB。 |
| results-1040x720.png | 小窗口的主数字、四级概览与行内文字可读，操作坞完整，无横向溢出；滚动途中部分行位于浮坞后方。 |
| detail-1240x820.png | 右侧 Codex 抽屉，3.6 GB、47/48、69,947 文件、三段说明、增长和前缀；右侧内部滚动条。 |
| confirm-1240x820.png | 31.2 GB 永久删除确认，13 组 / 2,250 项、可滚动清单和占用说明；红色不可恢复提示、取消与带体量的红按钮。 |
| cleaning-1240x820.png | 4.2 GB 已释放环、3/2,250 项与当前 Claude 旧版本；停止按钮旁为中途停止、已删部分无法恢复的新句。 |
| done-1240x820.png | 30.7 GB 已释放，C/F 水位前后虚线、59.8→74.7 / 243.1→258.9 GB；Chrome 部分完成并列明 6 个配置在用跳过。 |
| trends-1240x820.png | 五次 C 盘可用空间曲线，最低 8.1 GB、清理后 67.1 GB、今天 59.8 GB；增长榜、受保护标记与已停止泄漏说明。 |
| history-1240x820.png | 一条清理完成 30.7 GB、两次体检 31.2/14.2 GB；日期、13 组、跳过 6 项及箭头完整。 |
| locations-1240x820.png | 七分类开关，崩溃日志关闭，其余开启；自定义文件夹段在下方，保护说明保持。 |
| about-1240x820.png | 冰山品牌 0.1.0；读取什么、不读取什么、数据留本机、清理由你确认四块说明，无新操作入口。 |
| results-bottom-1240x820.png | 长列表底端三个受保护条目完整，最后一行与操作坞间有明显空隙；坞显示合成的 39 组 / 6,750 项。 |
| results-bottom-1040x720.png | 最小尺寸同样露出最后保护行与留白，悬浮坞未盖住列表末行；间距测试通过。 |
| notice-results-1240x820.png | M1 服务提示位于贴顶玻璃区域，AI 分类标题与正文在其下，操作坞仍可用；顶部无露出的半行字。 |
| notice-trends-1240x820.png | 切到趋势后 M1 提示消失，标题、曲线、增长与泄漏卡正常。 |
| trends-empty-1240x820.png | 冰山空态“再体检一次就能看到变化”，无伪造曲线。 |
| paused-1240x820.png | 顶部 Water 服务暂时不可用与重新连接，清理页仍保留 4.2 GB、已处理项数和停止说明。 |
| reconnecting-1240x820.png | 正在重新连接 Water 服务，扫描保持 8% 与当前分类，停止扫描仍在，没有重复启动按钮。 |
| stop-failed-1240x820.png | 扫描卡下“停止请求没有送达，请先重新连接再试”红字；顶部保留服务断连与重连按钮。 |
| clean-stop-failed-1240x820.png | 清理卡下停止失败红字，顶部“未能确认清理状态，请重新连接”，当前已处理状态保持。 |
| detail-exclude-1240x820.png | 已选 Node 组的第二条 950 MB 未勾选；第一、三条勾选，第一条有“Codex 正在使用”；第四条已跳过无勾选框。 |
| results-drive-1240x820.png | F: 数据盘选中；顶部 15.2 GB、识别 73.4 GB、参考 56.0 GB；跨盘 Codex 仅 2 项 / 1.0 GB。坞明确全盘 13 组 / 2,250 项 / 29.7 GB，下一行“其中 F: 15.2 GB”。 |
| locations-skipped-1240x820.png | “整个 F 盘”为正文；普通目录路径保持等宽；两条以后都跳过路径、加入日期、恢复按钮完整。 |
| trends-forecast-1240x820.png | C/D/E/F 盘符列定宽，后方说明同列左对齐；C 为最近 30 天 / 23 天后满，其余三种说明齐全。下方 node/chrome/cmd 只读卡含进程数、900/380 MB 与“—”、开始时间，无结束按钮。 |
| home-due-1240x820.png | 首页“已经 9 天没有体检”和“现在体检”按钮同在卡内；上次体检 10 月 26 日，与测试时钟九天相符。 |

| 保留的额外旧截图 | 本次实际看到的内容 |
|---|---|
| loading-1240x820.png | 冰山与“正在读取…”加载态，未误报断连。 |
| home-last-scan-1240x820.png | 上次结果、水位可释放层、增长洞察与查看结果入口。 |
| busy-1240x820.png | 顶部另一项任务进行中提示，原首页数据保持。 |
| stale-1240x820.png | 一份过期提示、玻璃贴顶区、第一分类完整；清理所选禁用，无第二份过期正文。 |
| unavailable-1240x820.png | 无宿主时显示无法连接 Water 服务和重连入口，无模拟数据补位。 |

### 归档、范围与未验证项

归档索引现含 **1,069 个文件、88,676,689 字节**（包括原轮历史）。本轮只读复算全部 1,069 项：归档字节数、SHA-256 与索引相符，并逐字节等于对应 `.local` 源文件。三个 final 各 23 个源码快照均逐字节等于最终实现提交和当前工作区，包含统一 LF 的 app.css；`git diff --check` 通过。最终 31 张 PNG 已全部打开复看。按本工作树路径过滤的私有 Chrome/Edge 残留计数为 0，进程命令行没有输出或写入证据。归档器自身本次 archive 回执按工具原行为留在 `.local`，索引未手工改写。

本轮只有 UI/假宿主回放验证；原生窗口 0、选择框 0，无 Tauri/Cargo/npm、无下载或外网请求、无真实扫描或真实清理。未改台账、冻结契约、检查器、fixture、其它包或其它工作树。浏览器每次一个本树私有 headless Chrome，静态服务仅 loopback，由测试 finally 关闭。

仍未验证真实 K4 服务 / K5 宿主联调、真实 WebView2/Mica、生产竞态、真实整盘扫描/清理、macOS、滚动 60fps。本次对旧/新服务行为的证明来自测试假宿主，不宣称服务端补丁已实现；任务完成只供总控收单，不自行标 VERIFIED 或合入主线。

补充交付核对：回执与证据首次提交为 `59eb157079a95ac8fad652171a7141864cb7a40d`。完整证据的暂存区 `git diff --cached --check` 会对原始日志中的空白行、源快照中保留的 CRLF（含冻结 tokens）报告空白问题；全部位于 `docs/acceptance/wave8/k6/receipts/`，未为消除提示而修改原始证据。产品与报告单独的 `git diff --check 208be441 HEAD -- apps/water/ui docs/dispatch/reports/WATER-W8-K6-REPORT.md` 退出 0。本轮“diff --check 通过”指实现 / 报告及未暂存改动检查，不宣称原始证据全文没有空白告警。

## 补单 02（2026-11-01）

本节记录补单 02 的交付，上文原文保留为历史。过期详情的读取、分类全选的筛选范围及排除修剪行为由本节取代上一轮描述；本轮完成表示供总控收单，未自行标为 VERIFIED 或合入主线。

### 身份、起点与实现提交

- 执行者 / 实际模型：Codex（本会话提供的模型标识为 GPT-6，未提供可核实的更细运行版本；不按派单里的 sol 名称推断）。未启动子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w8-k6`；分支：`worker/water-w8-k6`。
- 续做起点：`4746478bdf58cef3122d171eab75032b7af8b70f`。首次核对 HEAD、分支一致且树干净，未重跑 baseline。
- 实现提交：`182dbf14db38567895213b8ff233e4293c765ef2`，含产品、测试与 UI README。三个 final 全部在此干净提交运行，之后只追加本报告与归档器生成的证据。
- 提交身份仅在提交命令进程里设置为 `Codex <codex@localhost>`。未修改 Git 配置、远端或已有历史；未 push、merge、rebase、amend、reset、squash。

### 补单第 1～4 条逐项对照

| 条目 | 实现与满足方式 | 断言覆盖 |
|---|---|---|
| 1 过期详情 | `app.mjs` 的 `actions.detail` 同时捕获请求发出时的 `scan_id` 与 `stale`；回应仍检查原路由，扫描 ID 或过期状态变化时丢弃。发出时已经过期、返回时状态一致的回应可以打开详情，保留现有的过期勾选 / 跳过禁用。 | `ui_results_detail_confirm` 的 `UI_READ_ORDER`：原先“新扫描替代 / 清理终态使结果过期后再释放旧详情”两种断言保留；新增 `already-stale results still open group details`、`stale insight still opens read-only details`，实际点开分组和洞察，并检查所有条目勾选 / 跳过禁用。 |
| 2 可见分类全选 | `model.mjs` 的 `selectCategory` 增加可选级别参数，默认 `all`，与盘条件同时过滤；`app.mjs` 传当前级别；`views/results.mjs` 从已经按级别和盘投影的 `rows` 计算勾选、半选。无筛选的旧行为与参数调用保持。 | `ui_selection_rules` 的 `UI_M3C_DRIVE` 检查清除推荐组仍保留隐藏的已选确认组、选择推荐组不会选入隐藏确认组。浏览器分别在全部盘及 F 盘叠加“推荐清理”，核对可见 3 / 1 组、全选状态、清除与重新选择后的完整选择集合，以及隐藏的 `codex-runtimes` 仍未选。 |
| 3.1 排空组详情 | `views/detail.mjs` 使用 `hasSelectedItems(g, state.selection, state.details)`，与结果行共用有效选择判断。重新打开排空组时显示既有提示，条目未勾选且禁用；重新勾选结果页的组后，既有模型清空排除。 | `UI_M3C_EXCLUDE: reopening an emptied group explains how to reselect it`、`emptied group items are unchecked and disabled`；保留排空组不进预览断言，新增结果页重新选择后 3 个可清理条目全选且可操作、提示消失。 |
| 3.2 切页后跳过保险 | `app.mjs` 在 `skip_add` 成功后的第一步，只要仍是同一扫描就调用 `setItemSelected(..., false)`。随后才检查 `isCurrent()`；位置数据回写、详情重读、抽屉重绘仍受原路由 / 扫描 / 未过期条件约束。 | `ui_clean_done_and_pages` 的 `UI_M3C_SKIP`：旧服务开关保持当前项可清理；用既有延迟宿主机制拦住 `skip_add`，先切到关于页再释放成功，回结果页后没有重读 / 重开抽屉，实际 `clean_prepare.excludeItemIds` 仍为 `["i-000202"]`。 |
| 3.3 列表变化保留排除 | `rememberDetail` 只移除刷新回应里明确 `eligible === false` 的排除 ID。详情缓存额外保留暂时未返回的已排除项的已知元数据，使项数、体量与 `cleanSelection` 仍能扣除 / 发送它；抽屉只渲染最新回应，不补回旧行。新扫描继续整体重置选择与详情缓存。 | `UI_M3C_EXCLUDE`：手动排除一项，再令假宿主的详情显示列表不含该项；检查抽屉没有旧行、体量 / 项数仍扣除、实际预览请求仍带该 ID，宿主显示“已排除 1 项”；随后让它重新出现，仍为未勾选。已有新服务跳过测试仍确认明确不可清理时排除被修剪。 |
| 3.4 可选 by_drive | `model.mjs` 的 `group.by_drive.length` 改为 `group.by_drive?.length`，与紧邻的可选链读取一致。 | `ui_selection_rules` 新增 `UI_M3C_DRIVE: missing by_drive does not throw during projection`，对缺该字段的保护 / 参考组实际调用分盘投影。 |
| 4 标签失败标记 | 逐项标签读取先经可选链检查元素，缺失时得到 `null`，由带标记的相等断言失败，不再由浏览器表达式抛错。 | 保留 `UI_M3C_INUSE_ITEM: per-item label matches host` 的期望文案与标记，正常用例仍核对宿主标签。 |

假宿主的唯一新增显示开关 `omitDetailItem` 只在 `tests/browser.test.mjs`，只裁掉 `group_detail` 返回列表中的指定项，宿主完整条目仍供预览核验。没有修改冻结回放数据，也没有在产品中加入测试开关。UI README 已同步本轮行为。IPC 仍为 19 命令、只传 ID；未改 `ipc.mjs`、样式或设计 tokens，`app.css` 保持 LF。

### 改过的断言原文

本轮只改了前两轮新增的一条断言，已核对它不在原基线 `912eba10` 中。其余都是新增断言；原基线断言及精确 3 个单元 / 5 个浏览器测试名称均保持。原票授权的 17 → 19 命令清单沿用，不在本轮再次修改。

改前：

```js
assert.equal(await browser.evaluate('document.querySelector(".in-use-item").textContent'), 'Codex 正在使用', 'UI_M3C_INUSE_ITEM: per-item label matches host');
```

改后：

```js
assert.equal(await browser.evaluate('document.querySelector(".in-use-item")?.textContent ?? null'), 'Codex 正在使用', 'UI_M3C_INUSE_ITEM: per-item label matches host');
```

没有删旧断言、过滤测试、放宽超时或改变其它期望值。假宿主的 `group_detail` 分支由单行改为等价返回加测试内可选裁剪，不属于断言修改。

### 本轮检查命令与结果

全部在本工作树根执行，保持串行。每行参数接在下面同一个完整前缀后；stamp 为 2026-11-01 UTC，本地为同日 JST。日志和源快照见 [归档索引](../../acceptance/wave8/k6/ARCHIVE.json)。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K6
```

| stamp | 参数 | 结果 / 用时 |
|---|---|---|
| 02-29-01.745Z-31692 | --mode test | 修复前复现：退出 1，2/3；`UI_M3C_DRIVE: clearing recommended groups preserves a hidden selected confirm group`，5.138 秒。 |
| 02-29-15.319Z-19696 | --mode browser | 修复前复现：退出 1，3/5；`UI_M3C_EXCLUDE` 抓到排空组缺少提示，`UI_M3C_SKIP` 抓到切页后排除为空，64.691 秒。 |
| 02-31-21.393Z-7764 | --mode test | 退出 0，3/3，3.309 秒。 |
| 02-31-34.719Z-26540 | --mode check | 退出 0，语法与界面政策通过，10.423 秒。 |
| 02-31-57.446Z-19472 | --mode browser | 退出 0，5/5，31 张图，96.681 秒。 |
| 02-35-42.776Z-41500 | --mode red-nc1 | 入口退出 0，浏览器预期退出 1，命中 `UI_M3C_EXCLUDE`，61.246 秒。 |
| 02-37-26.498Z-23464 | --mode test | nc1 原字节恢复后退出 0，3/3，7.335 秒。 |
| 02-38-06.858Z-32312 | --mode red-nc2 | 入口退出 0，浏览器预期退出 1，命中 `UI_M3C_DRIVE`，89.226 秒。 |
| 02-40-09.359Z-41268 | --mode test | nc2 原字节恢复后退出 0，3/3，7.043 秒。 |
| 02-41-26.079Z-20376 | --mode red-nc3 | 入口退出 0，浏览器预期退出 1，命中 `UI_M3C_FORECAST`，73.654 秒。 |
| 02-43-19.648Z-30424 | --mode test | nc3 原字节恢复后退出 0，3/3，4.995 秒。 |
| 02-43-42.714Z-7984 | --mode check --final | 干净实现提交，退出 0，7.281 秒。 |
| 02-44-09.806Z-8736 | --mode test --final | 退出 0，3/3，三条 proofAudit 配对通过，4.509 秒。 |
| 02-44-34.021Z-43884 | --mode browser --final | 退出 0，5/5，必需 26 张齐全，保留旧测试另 5 张，90.728 秒。 |
| 02-46-37.995Z-40216 | --mode archive | 退出 0，6.200 秒。 |

前两条失败为产品修改之前的有效复现，原始失败证据保留；修复后各普通检查一次通过，没有环境重试。没有重跑 baseline，也没有在三个 final 之后修改产品或测试。

补充只读核对时，一次经 Windows PowerShell 管道传给 Node 的脚本把中文比较常量转成了问号，导致首行比较失败；未修改文件。随后直接与 Git 中原回执的字节和首行比较，核对通过，旧内容逐字节保留，补单 02 的 26 条截图观察齐全。此项不是产品检查失败或 final 重跑。

### 负控、原字节恢复与哈希

每条仅临时改一个真正被调用的产品文件的一处，测试不改。入口返回有效红后，下一条执行命令即 `git checkout -- <文件>`，紧接 `--mode test`；没有以语法错误、超时或测试开关造红。

| 负控 | 临时改动 | 实际失败信息 | 恢复后的单文件 SHA-256 |
|---|---|---|---|
| nc1 | `app.mjs` 的 `clean_prepare(groupIds, excludeItemIds)` 改为 `clean_prepare(groupIds, [])` | 首个 `UI_M3C_EXCLUDE: clean_prepare sends the exact exclusion`，实际 `[]`，预期 `["i-000202"]`；另被已有的 `UI_M3C_SKIP: exclude legacy item, prune newly ineligible item` 捕获。 | `c0b54279fc5bd3164d28a7f0cb73fca85627da25aa73290c64093ba57bde5056` |
| nc2 | `model.mjs` 的分盘组投影 `total_bytes:total` 改为 `total_bytes:group.total_bytes` | `UI_M3C_DRIVE: total uses by_drive quantities`，实际 `76.3 GB`，预期 `73.4 GB`。 | `82f188bbb0001343697cd35ead402e2d50dea7dc5f07e974a56640412c1f340b` |
| nc3 | `views/trends.mjs` 的无天数分支 `drive.note_zh ?? '可用空间没有减少'` 改为空串 | `UI_M3C_FORECAST: D:\\ shows its forecast or explanation`。 | `d29241f707df6aa9b923a4eb8528df5c7f07462d5eb6f03d298ab242ce2001a5` |

`test --final` 的 proofAudit 配对为：nc1 `02-35-42.776Z-41500` → `02-37-26.498Z-23464`；nc2 `02-38-06.858Z-32312` → `02-40-09.359Z-41268`；nc3 `02-41-26.079Z-20376` → `02-43-19.648Z-30424`。三次恢复与三个 final 的生产汇总 SHA-256 均为 `b9d0fa39554cd84970df45c17f41ba3a9876f7f228bd838aa5be27718dec2cf6`，测试汇总 SHA-256 均为 `0c0fd796842697ed0b4813ccb436b3e9e82db9f9d1de8cc755b1f90fcd422eda`。

### 最终截图逐张复看

本轮重新逐张打开最终 31 张原始 PNG，并复看设计 previews 的首页、扫描、结果、详情、确认、完成、趋势、位置共 8 张。整体保留白色磨砂、墨色大数字、纯色强调；品牌冰山与脉搏线以 DESIGN 第 10 节为准。静态稿数据与回放不同，旧回放详情未提供条目时显示“前 0 / 48”，不伪造数据。本轮没有修改视觉样式。

本次最终目录：[screenshots/2026-11-01T02-44-34.021Z-43884](../../acceptance/wave8/k6/screenshots/2026-11-01T02-44-34.021Z-43884/)。必需的 26 张文件名不变，逐张观察如下。

| 必需截图 | 本次实际看到的内容 |
|---|---|
| home-1240x820.png | 系统盘 59.8 GB 可用、水位瓶和 D/E/F 三盘条；待体检、暂无对比、尚未体检及蓝色“开始体检”完整，侧栏说明无短孤字。 |
| scan-1240x820.png | 水波环 27.5 GB / 62%；AI、浏览器、系统临时已完成，应用更新扫描中，其余等待；182,280 文件、0:29 与停止扫描在右下。 |
| results-1240x820.png | 推荐 31.2 GB、识别 53.5 GB；AI 分类半选，三个推荐组选中，确认 / 保护组保持未选；坞显示 13 组、2,250 项、31.2 GB。 |
| results-1040x720.png | 最小尺寸主数字、四级概览、过滤与排序都可读，无横向溢出；悬浮坞完整，滚动途中的 grok 行部分位于坞下。 |
| detail-1240x820.png | 右侧 Codex 磨砂抽屉，3.6 GB、47/48、69,947 文件；三段说明、可清理与跳过、增长和前缀完整，底端“前 0 / 48”来自原回放，内部可滚动。 |
| confirm-1240x820.png | 31.2 GB 永久删除确认，13 组 / 2,250 项；浅底清单有独立滚动条及 Chrome 占用说明，红色不可恢复提示和取消 / 带体量红按钮完整。 |
| cleaning-1240x820.png | 4.2 GB 已释放水环，第 1/13 组、Claude 旧版本、3/2,250 项；停止旁保留“中途停止，已经删掉的部分无法恢复”的句子。 |
| done-1240x820.png | 30.7 GB 已释放，预计 31.2 GB；C/F 水位前后虚线及 59.8→74.7、243.1→258.9 GB；Chrome 部分完成并写明 6 个配置在用跳过。 |
| trends-1240x820.png | 5 次 C 盘曲线，最低 8.1 GB、清理后 67.1 GB、今天 59.8 GB；下方增长榜含受保护标记，疑似泄漏卡标“已停止”。 |
| history-1240x820.png | 一条清理完成 30.7 GB 和两次体检 31.2 / 14.2 GB；日期、清理 13 组 / 跳过 6 项及各行箭头完整。 |
| locations-1240x820.png | 七分类开关，崩溃与日志关闭，其余开启；保护说明保留，自定义文件夹标题和第一行出现在下方。 |
| about-1240x820.png | 冰山 Water 0.1.0 卡及读取什么、不读取什么、本机保存、用户确认四块说明；登录态保护与不可恢复文案清晰。 |
| results-bottom-1240x820.png | 合成三倍长列表底端的三条未知保护行全部可见，与坞之间有明显空隙；坞为 39 组 / 6,750 项 / 93.7 GB。 |
| results-bottom-1040x720.png | 最小尺寸仍完整露出最后三条保护行及底部留白，悬浮坞未盖住末行，无横向溢出。 |
| notice-results-1240x820.png | M1 提示贴在玻璃顶部，AI 分类标题在其下，保护行与浏览器分类正常；标题区没有露出的半行文字。 |
| notice-trends-1240x820.png | 切到趋势后旧 M1 提示消失，五点曲线、增长榜和泄漏卡正常。 |
| trends-empty-1240x820.png | 冰山空态“再体检一次就能看到变化”及本机记录说明，没有曲线或伪造数据。 |
| paused-1240x820.png | 顶部 Water 服务暂时不可用与重新连接；清理仍显示 4.2 GB、当前 Claude 旧版本、3/2,250 项和停止说明。 |
| reconnecting-1240x820.png | 顶部“正在重新连接 Water 服务…”；扫描保持 8%、已检查 23,520 文件和当前 AI 分类，停止扫描仍在。 |
| stop-failed-1240x820.png | 顶部连接失败与重连入口保留；扫描停止按钮下有红色“停止请求没有送达，请先重新连接再试。”，当前进度保持。 |
| clean-stop-failed-1240x820.png | 顶部“未能确认清理状态，请重新连接。”；清理 4.2 GB 和已处理项保持，停止按钮下独立显示红色失败说明。 |
| detail-exclude-1240x820.png | Node 组第二项 950 MB 未勾选，第一 / 三项勾选；第一项有“Codex 正在使用”标签，每个可清理项有跳过操作，第四项已设为跳过而无勾选框。 |
| results-drive-1240x820.png | F: 数据盘选中；顶部 15.2 GB、识别 73.4 GB、参考 56.0 GB；跨盘 Codex 仅 2 项 / 1.0 GB，分类框为全选；坞为全盘 13 组 / 2,250 项 / 29.7 GB，另有“其中 F: 15.2 GB”。 |
| locations-skipped-1240x820.png | 普通路径用等宽字体，“整个 F 盘”用正文字体；58.0 GB 上次识别、可选非系统盘说明，以及两条跳过路径 / 加入时间 / 恢复按钮均完整。 |
| trends-forecast-1240x820.png | C/D/E/F 固定盘符列与同起点说明，C 为最近 30 天 / 约 23 天后满，其余三种解释齐全；残留 node/chrome/cmd 行显示 9/6/1 进程、900/380 MB/“—”及开始时间，无结束入口。 |
| home-due-1240x820.png | 首页“已经 9 天没有体检”和“现在体检”在卡片下方同一行；上次体检 10 月 26 日，瓶上浅绿可释放层、增长洞察与三个其它盘均正常。 |

| 保留的额外旧截图 | 本次实际看到的内容 |
|---|---|
| loading-1240x820.png | 冰山“正在读取…”和正在读取空间信息的说明，无连接失败或演示结果。 |
| home-last-scan-1240x820.png | 59.8 GB、浅绿可释放层、15.4 GB 推荐 / +4.6 GB 增长、上次结果 31.2 GB 和查看结果按钮。 |
| busy-1240x820.png | 顶部正在进行另一项任务提示，首页水位、洞察、体检入口与上次结果仍在。 |
| stale-1240x820.png | 顶部一份过期提示，AI 分类完整位于其下；复选框和清理所选变淡禁用，底部坞仍显示原选择。 |
| unavailable-1240x820.png | 无宿主时顶部和空态均说明无法连接 Water 服务，重连入口可见，没有模拟数字补位。 |

### 归档、范围与未验证项

[ARCHIVE.json](../../acceptance/wave8/k6/ARCHIVE.json) 共 **1,516 个文件、125,713,145 字节**（含此前历史）。本轮只读复算全部索引条目的字节数与 SHA-256，并逐字节比对各自 `.local` 来源，全部一致。三个 final 各 23 份源快照逐字节等于 `182dbf14` 提交和当前工作区；三次恢复的汇总哈希一致。26 张必需截图和额外 5 张旧图已全部打开复看，未修改原始证据或冻结文件。

按本树绝对路径在内存中过滤 Chrome / Edge 进程，残留计数为 **0**；未输出或写入任何进程命令行。测试与 loopback 静态服务已随测试 finally 退出，未额外启动后台进程。实现提交前 `git diff --check` 通过；证据保留原字节，完整证据的空白告警不通过编辑日志或快照来消除。

本次交回暂存共 449 个文件：447 个新归档条目、归档索引和本回执，均在白名单。完整证据的 `git diff --cached --check` 退出 2，共 2,032 行告警输出，全部属于 `docs/acceptance/wave8/k6/receipts/` 的原始快照 / 日志（如冻结 tokens 的 CRLF）；证据外空白问题为 0。`git diff --check 4746478b -- apps/water/ui docs/dispatch/reports/WATER-W8-K6-REPORT.md`、回执单独的暂存区检查和普通 `git diff --check` 均退出 0。

本轮仅为 Windows 私有 headless Chrome 的 UI / 假宿主验证，原生窗口 0、选择框 0；未运行 Tauri / Cargo / npm、安装依赖、下载、外网访问、真实扫描、真实清理或终止真实进程。修改只在 UI 白名单、本回执及 archive 输出；未改主线台账、契约、检查器、回放数据、其它包或工作树。

未验证真实 K4 服务 / K5 宿主联调、WebView2 / Mica、真实用户目录 / 整盘、生产竞态、macOS、滚动 60fps；对旧服务与条目显示窗口变化的证明来自假宿主。标签缺失的标记修复由安全求值与现有正常断言覆盖，本轮没有另跑第四条负控。本票自验通过仍须总控独立收单与集成。

## 补单 03（2026-11-01）

以上原报告及补单 01、02 回执完整保留为历史。跳过 / 恢复后的刷新、切页后跳过失败的提示、条目变化后的抽屉行为以本节为准。本轮完成表示交总控收单，未自行标记 VERIFIED、合入主线或推送。

### 身份、起点与提交

- 执行者 / 实际模型：Codex（本会话提供的模型标识为 GPT-6，未提供可核实的更细运行版本；不从票面 sol 名称推断）。未启动子代理或外部执行者。
- 工作树：`F:/new/smaltalk/water/.worktrees/w8-k6`；分支：`worker/water-w8-k6`。
- 续做起点：`1c2e91e60262103a24f228389447bf1549065af0`；首次实际核对 HEAD、分支一致且树干净。未重跑 baseline。
- 主体实现提交：`c63e5e248812f1940c0f9a875f8c5aa3ac69b484`。
- 最终实现提交：`8a0ed61f783136a959f0495b666c625a925a55ae`。另补条目重绘时保持抽屉滚动、仍可操作条目的焦点及对应断言。最终三条负控、恢复配对和三个 final 全部绑定此版本；之后产品与测试字节未变。
- 两次实现提交仅含 `apps/water/ui/`；后续仅提交本回执和 archive 生成的证据。身份只在提交进程中设为 `Codex <codex@localhost>`，未写 Git 配置，未改远端、已有历史，未 push、merge、rebase、amend、reset、squash。

### 第 1 条：跳过、恢复后重读结果

| 要求 | 实现与满足方式 | 实际断言覆盖 |
|---|---|---|
| 成功后完整重读 | `app.mjs` 的 `refreshAfterSkip` 共用于跳过、恢复。操作前捕获当前未过期结果的 `scan_id`；成功后读取 `scan_result(scanId)`，前后核对当前结果 ID / 过期状态、回应 ID，然后替换完整结果，不调用新扫描的 `installResult`。 | `ui_clean_done_and_pages` / `UI_M3C_SKIP`：新服务下主数字、图例、分类合计取刷新回应；重读请求使用原扫描 ID。 |
| 保留选择、清空详情 | `model.refreshResult` 保留选择 Map 和级别 / 盘筛选，将 `details` 变为新空 Map。`excludedDetails` 仅保留现有排除 ID 的计数元数据，不用作详情缓存；`selectionDetails` 供合计共用。`cleanSelection` 直接从有效已选组的排除集合取 ID。 | `ui_selection_rules` 检查缓存为 0、选择引用和筛选保留、排除体量 / 项数保留、没有详情缓存仍传排除 ID。浏览器另排除 Node `i-000202`，跳过 / 恢复 Codex 项后仍准确扣除它。 |
| 本地保险及明确不可清理时修剪 | 跳过成功且仍同一扫描时先本地排除；整体结果刷新后重读该组详情，核对冗余排除，即使切页也完成此核对，避免新服务已扣除跳过项、本地保险又扣一次。只有原路由仍有效才重绘抽屉、写成功提示和位置数据。 | 原 `UI_M3C_SKIP: exclude legacy item, prune newly ineligible item` 原文 / 期望值不变；旧服务传 `i-000202`，明确不可清理时不传。补单 02 的排除项暂不在列表、排除和请求仍保留的断言也未改、通过。 |
| 首页数字同步 | 仅在 `app.last_scan.scan_id` 相同时更新其 `recommended_bytes`、`recommended_by_drive`。 | `UI_M3C_SKIP: home last checkup uses the refreshed total`：实际跳过后去首页检查上次体检数字。 |
| 等待读取时禁止清理 | 结果重读和必要的详情核对始终处于现有 `run.pending` 内，切页也不能解除。 | 跳过 / 恢复分别覆盖成功、读取失败、返回错误扫描 ID 三种延迟情况；期间回结果页按钮禁用，实际点击没有发出 `clean_prepare`。 |
| 失败或扫描不一致时过期 | 读取失败、当前扫描 / 过期状态变化、回应扫描 ID 不一致，使用现有 `fault` 置为过期、提示重新体检，不安装错误回应。跳过后的详情核对失败同样保守处理。 | 两种操作的延迟失败 / 错误 ID 均检查过期提示和清理禁用；正常回应则启用。当前扫描被生产环境另一方并发替换未联调，不将错误回应 ID 的回放描述成真实生产竞态验收。 |
| 恢复后的可见范围与预览一致 | 各处消费刷新结果，恢复时不清空用户选择；重新打开详情必须读取新数据。恢复文案：“已恢复，这一项重新算进可清理的范围。” | 会话内先跳过再恢复：组副行、操作坞体量 / 项数恢复，重开详情可清理且已勾选，请求只留独立手动排除，宿主预览体量 / 项数与坞相等。另测扫描前已有跳过记录的默认推荐组：恢复后不再点组框，直接核对数字、详情勾选、默认组 ID 请求和预览一致。 |

新增假宿主开关 `liveSkips`、`preScanSkip` 仅在 `tests/browser.test.mjs`。以冻结数据的内存副本建立扫描快照，再按当前名单投影 `scan_result` / `group_detail`：跳过扣除可清理数量、体量和相关合计，恢复从快照还原；`preScanSkip` 在首次视图返回前加入合成跳过记录。原 `skipKeepsCurrentScan` 和旧默认行为保留，旧断言照跑。

假宿主 `clean_prepare` 接受所选组内已设为跳过项的排除 ID 并忽略扣除，新增 `UI_M3C_SKIP: host ignores exclusions belonging to currently skipped items` 实际调用该边界。未改冻结 JSON、未加入产品测试开关；这里只证明 UI 回放行为，不宣称 K4 / K5 已联调。

### 第 2 条：七项修正

| 条目 | 实现与满足方式 | 断言 / 截图 |
|---|---|---|
| 2.1 切页后跳过失败 | 单独保存“跳过没有成功，这一项保留原来的勾选状态。”，返回结果页时在提示条显示，跨路由保留，可关闭；失败前不改选择。其它位置旧回应仍按读取序号丢弃。 | `UI_M3C_SKIP` 延迟失败：先去关于页，再释放失败、回结果页，检查提示、原操作坞数字、重新打开后原勾选。 |
| 2.2 打开中的抽屉 | 条目变化立即重绘；排空后框未选且禁用，显示先去结果页重选的提示。模型也拒绝经条目事件重选排空组。保留返回焦点、滚动及仍可操作条目的焦点，避免长列表跳回顶部。 | `UI_M3C_EXCLUDE: emptied drawer immediately disables items and explains result-page reselection`；直接派发 change 不能重选；单元测试直接调用模型也拒绝。另有滚动、焦点保持断言。 |
| 2.3 分类已选按可见组 | 分类已选合计只传当前 `rows`，与全选框相同的级别 / 盘交集；分盘仍取该盘。 | `UI_M3C_DRIVE: category selected bytes use the same level and drive intersection`，先选隐藏确认组，全部盘和 F 盘分别切推荐级别核对。 |
| 2.4 无选择不显示已选 | 没有可见已选组时不创建该行。 | `UI_M3C_DRIVE` 清除可见组后该行不存在，全保护筛选下所有分类均不显示；两张底部图的未识别分类无“已选 <1 MB”。 |
| 2.5 过期抽屉 | 用“结果已过期，请重新体检后再清理。”替代先去结果页勾选的指引。 | `UI_M3C_EXCLUDE: stale drawer requests a new scan instead of unavailable reselection`；原过期可查看、操作禁用和旧回应丢弃断言也通过。 |
| 2.6 位置页句号 | 说明为“通过系统文件夹选择框添加。也可以选择整个非系统盘。”。 | `locations-skipped-1240x820.png` 逐字看到末尾句号。 |
| 2.7 标记与真实事件 | `.disabled` 读取用可选链、缺失返回 null，由原标记断言失败；禁用框测试显式派发 change，模型单测和浏览器实际事件均核对不选中组。 | 保留 `UI_M3C_INUSE_ITEM: occupied items remain selectable`；`UI_M3C_EXCLUDE` 真实事件及未选 / 排空模型断言。不再以禁用框原生点击充当逻辑保护证明。 |

### 改过的前三轮新增断言原文

仅替换以下三条此前新增断言，其余是追加。逐行核对 `912eba10` 两个测试文件，以 assert 开头的基线原断言行全部完整保留；本轮未再改命令清单长度。仍精确 3 个单元、5 个浏览器测试，名字不变，无过滤、skip、超时放宽。

1. 元素缺失时保留标记，改前：

```js
assert.equal(await browser.evaluate('document.querySelector("[data-key=item-i-000201]").disabled'), false, 'UI_M3C_INUSE_ITEM: occupied items remain selectable');
```

改后：

```js
assert.equal(await browser.evaluate('document.querySelector("[data-key=item-i-000201]")?.disabled ?? null'), false, 'UI_M3C_INUSE_ITEM: occupied items remain selectable');
```

2. 禁用条目实际派发事件，改前的操作与断言：

```js
await click('item-i-000202');
assert.equal(await browser.evaluate('document.querySelector(".dock").textContent'), beforeItemClick, 'UI_M3C_EXCLUDE: clicking a disabled item cannot select its siblings');
```

改后：

```js
await control('const box=document.querySelector("[data-key=item-i-000202]");box.checked=true;box.dispatchEvent(new Event("change",{bubbles:true}))');
assert.equal(await browser.evaluate('document.querySelector(".dock").textContent'), beforeItemClick, 'UI_M3C_EXCLUDE: dispatching change on a disabled item cannot select its siblings');
```

3. 切页成功也需新详情核对排除，避免重复扣除；不重开抽屉。改前：

```js
assert(await browser.evaluate('!document.querySelector("dialog[open]") && window.__waterTest.calls.filter(c=>c.command==="group_detail").length === 1'), 'UI_M3C_SKIP: route-changed success neither rereads details nor reopens the drawer');
```

改后：

```js
assert(await browser.evaluate('!document.querySelector("dialog[open]") && window.__waterTest.calls.filter(c=>c.command==="group_detail").length === 2'), 'UI_M3C_SKIP: route-changed success reconciles exclusions without reopening the drawer');
```

补单 02 的明确不可清理时修剪排除断言未改：

```js
assert.deepEqual(await browser.evaluate('window.__waterTest.calls.findLast(c=>c.command==="clean_prepare").args.excludeItemIds'), skipKeepsCurrentScan ? ['i-000202'] : [], 'UI_M3C_SKIP: exclude legacy item, prune newly ineligible item');
```

### 本轮检查命令与结果

全部在本工作树根串行执行；表中参数接在此完整前缀后，stamp 均为 2026-11-01 UTC：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K6
```

| stamp | 参数 | 结果 / 秒 |
|---|---|---|
| 06-47-36.528Z-13136 | --mode test | 退出 0，3/3，4.062。 |
| 06-47-51.947Z-39100 | --mode check | 退出 0，语法 / 政策通过，5.816。 |
| 06-48-06.134Z-12696 | --mode browser | 退出 0，5/5，31 图，97.631。 |
| 06-51-47.044Z-9528 | --mode browser | 增加恢复延迟三态后退出 0，5/5，31 图，101.390。 |
| 06-53-49.921Z-31432 | --mode test | 原实现重放新增断言：预期退出 1，2/3，7.423；命中排空组不能经条目重选的 UI_M3C_EXCLUDE。 |
| 06-53-58.814Z-33952 | --mode browser | 原实现重放：预期退出 1，3/5，97.824；命中抽屉及时禁用的 UI_M3C_EXCLUDE、切页后详情核对的 UI_M3C_SKIP。 |
| 06-55-36.818Z-17856 | --mode test | 候选产品原字节恢复后退出 0，3/3，5.652。 |
| 06-56-44.421Z-9752 | --mode red-nc1 | 首版候选有效红，入口 0 / 浏览器 1，63.261；后补滚动 / 焦点后不计入最终配对。 |
| 06-58-08.750Z-30100 | --mode test | 首次 nc1 恢复，退出 0，3/3，5.578。 |
| 06-58-26.301Z-19312 | --mode red-nc2 | 首版候选有效红，入口 0 / 浏览器 1，99.951；不计入最终配对。 |
| 07-01-03.024Z-21728 | --mode test | 首次 nc2 恢复，退出 0，3/3，8.448。 |
| 07-01-55.957Z-28440 | --mode browser | 加入滚动 / 焦点保留后退出 0，5/5，31 图，103.026。 |
| 07-03-54.248Z-18000 | --mode red-nc1 | 最终代码有效红，入口 0 / 浏览器 1，64.661。 |
| 07-05-30.230Z-2940 | --mode test | nc1 立即恢复后退出 0，3/3，7.187。 |
| 07-06-07.936Z-37828 | --mode red-nc2 | 最终代码有效红，入口 0 / 浏览器 1，96.039。 |
| 07-08-16.201Z-30900 | --mode test | nc2 立即恢复后退出 0，3/3，5.194。 |
| 07-09-09.483Z-6912 | --mode red-nc3 | 最终代码有效红，入口 0 / 浏览器 1，80.237。 |
| 07-10-52.701Z-37236 | --mode test | nc3 立即恢复后退出 0，3/3，4.387。 |
| 07-11-31.924Z-34840 | --mode check --final | 干净 8a0ed61f，退出 0，12.822。 |
| 07-11-44.945Z-20988 | --mode test --final | 退出 0，3/3，三条最终 proofAudit 配对通过，7.364。 |
| 07-11-52.559Z-8500 | --mode browser --final | 退出 0，5/5，必需 26 图及保留 5 图齐全，108.237。 |
| 07-13-40.989Z-2092 | --mode archive | 退出 0，9.057。 |

原实现重放是在候选实现及新断言已形成后，将六个已改产品文件临时恢复成 `1c2e91e6` 字节做的回归核对，再在 finally 逐字节恢复候选并立即跑 test；不是 baseline，也不冒称开发时间上先红。备份仅留在本树 `.local/k6-add03-old-product-223b1585-7649-4e86-9d6f-c6316a3c98f0/`。未改测试造失败。候选实现的普通浏览器门均通过，没有环境重试。

### 最终三条负控、恢复与哈希

每条只改一个真正被调用的产品文件中的一处，不改测试。有效红后下一条执行命令即 `git checkout -- <该文件>`，紧接 `--mode test`。没有以语法错误、缺模块或超时造红。

| 负控 | 临时改动 | 实际失败信息 | 恢复后的单文件 SHA-256 |
|---|---|---|---|
| nc1 | app.mjs 将 clean_prepare(groupIds, excludeItemIds) 改为 clean_prepare(groupIds, [])。 | `UI_M3C_EXCLUDE: clean_prepare sends the exact exclusion`，实际 []、预期 ["i-000202"]；另命中原新旧服务排除断言。 | `1a0d772b98428a3f7e723f97f047d826b9994500fea8df3661e96b0a5879e633` |
| nc2 | model.mjs 分盘投影 total_bytes:total 改为 total_bytes:group.total_bytes。 | `UI_M3C_DRIVE: total uses by_drive quantities`，实际 76.3 GB、预期 73.4 GB。 | `be40c072e2717cb6e494ca9f01ff7a9894b39e8812175d87b14f01884f2de6ba` |
| nc3 | views/trends.mjs 的无天数分支从 drive.note_zh ?? '可用空间没有减少' 改为空串。 | `UI_M3C_FORECAST: D:\\ shows its forecast or explanation`。 | `d29241f707df6aa9b923a4eb8528df5c7f07462d5eb6f03d298ab242ce2001a5` |

test --final 的配对：nc1 `07-03-54.248Z-18000` → `07-05-30.230Z-2940`；nc2 `07-06-07.936Z-37828` → `07-08-16.201Z-30900`；nc3 `07-09-09.483Z-6912` → `07-10-52.701Z-37236`。三次最终恢复及三个 final 的生产汇总 SHA-256 都是 `2dbfad20b2a7f134a3c2ad3c76f111fdf63737edf65da6f1699c43df3fb112cd`，测试汇总都是 `4de7b8ab86df17c9114597e2cff7b1a98fe140286ea79dd9debd00d93237830a`。

### 最终截图逐张复看

重新逐张打开最终全部 31 张原始 PNG，并打开设计 previews 的首页、扫描、结果、详情、确认、完成、趋势、位置共 8 张作对照。白色磨砂、墨色大数字、实色强调、既有布局保持；冰山 / 脉搏线按 DESIGN 第 10 节，不恢复早期稿的水滴。回放数字不同于静态稿，未改冻结数据凑数。

最终目录：[screenshots/2026-11-01T07-11-52.559Z-8500](../../acceptance/wave8/k6/screenshots/2026-11-01T07-11-52.559Z-8500/)。26 张必需图文件名不变：

| 必需截图 | 本次实际看到的内容 |
|---|---|
| home-1240x820.png | 首次首页 59.8 GB 可用、水位瓶、D/E/F 三盘条；待体检 / 暂无对比 / 尚未体检及蓝色开始按钮完整，两段说明无短孤字。 |
| scan-1240x820.png | 水环 27.5 GB、62%；AI / 浏览器 / 系统临时完成、应用更新扫描中，其余等待；182,280 文件、0:29 与停止扫描可见。 |
| results-1240x820.png | 推荐 31.2 GB、识别 53.5 GB；AI 分类半选，三条推荐组已选，确认 / 保护组未选；坞为 13 组 / 2,250 项 / 31.2 GB。 |
| results-1040x720.png | 最小尺寸仍容纳主数字、图例、过滤、排序和坞，无横向溢出；滚动途中的 grok 行部分经过悬浮坞下方。 |
| detail-1240x820.png | Codex 右侧磨砂抽屉，3.6 GB、69,947 文件、47/48；三段说明、可清理与跳过、增长、前缀完整；原回放未给条目，照实显示“前 0 / 48”。 |
| confirm-1240x820.png | 31.2 GB 永久删除确认，13 组 / 2,250 项；独立滚动清单及 Chrome 在用说明、红色不可恢复提示、取消与带体量红按钮齐全。 |
| cleaning-1240x820.png | 4.2 GB 已释放水环，第 1/13 组、Claude 桌面版旧版本、3/2,250 项；停止旁保留正在删除项会停在中途的实际说明。 |
| done-1240x820.png | 30.7 GB 已释放，预计 31.2 GB；C/F 前后水位虚线与 59.8→74.7、243.1→258.9 GB；Chrome 部分完成、6 个配置在用跳过。 |
| trends-1240x820.png | C 盘五点曲线，最低 8.1 GB、回升后 67.1 GB、今天 59.8 GB；增长榜含受保护会话组，疑似泄漏卡标“已停止”。 |
| history-1240x820.png | 清理完成 30.7 GB 及两次体检 31.2 / 14.2 GB；日期、13 组 / 跳过 6 项和箭头完整，体检与清理图标可区分。 |
| locations-1240x820.png | 七分类开关，崩溃与日志关闭，其余开启；登录数据保护说明保留，自定义文件夹标题和首行位于下方。 |
| about-1240x820.png | 冰山 Water 0.1.0 卡与读取 / 不读取 / 本机保存 / 用户确认四块说明；Cookies、登录信息、本地存储、IndexedDB 保护与不可恢复文案清楚。 |
| results-bottom-1240x820.png | 长列表末尾三条未知保护行完整；未识别分类只显示 952 MB，没有“已选 <1 MB”；坞 39 组 / 6,750 项 / 93.7 GB，与末行有空隙。 |
| results-bottom-1040x720.png | 最小尺寸同样没有未识别分类“已选”行，三条保护行及底部留白完整，坞没有挡住末行。 |
| notice-results-1240x820.png | M1 提示位于玻璃顶部，AI 分类标题在其下；组行与下一浏览器分类清楚，标题区没有露出半行字。 |
| notice-trends-1240x820.png | 切到趋势后旧 M1 提示消失；五点曲线、增长榜、已停止泄漏卡正常。 |
| trends-empty-1240x820.png | 冰山空态“再体检一次就能看到变化”及本机记录说明，没有曲线或伪造数据。 |
| paused-1240x820.png | 顶部服务暂时不可用与重新连接；清理保持 4.2 GB、当前组、3/2,250 项和停止说明。 |
| reconnecting-1240x820.png | 顶部正在重连；扫描保持 8%、23,520 文件、0:03 和当前 AI 分类，停止扫描入口仍在。 |
| stop-failed-1240x820.png | 顶部不可用 / 重连提示；停止扫描按钮下独立红字“停止请求没有送达，请先重新连接再试。”，原进度保留。 |
| clean-stop-failed-1240x820.png | 顶部未能确认清理状态与重连；4.2 GB、当前组和已处理项保持，停止按钮下独立红色失败说明。 |
| detail-exclude-1240x820.png | Node 详情第二项 950 MB 未勾，第一 / 三项勾上；第一项有“Codex 正在使用”，可清理项有跳过操作，第四项已跳过且无框。 |
| results-drive-1240x820.png | F: 数据盘选中；顶部 15.2 GB、识别 73.4 GB、参考 56.0 GB；跨盘 Codex 只有 2 项 / 1.0 GB；坞全盘 13 组 / 2,250 项 / 29.7 GB，并有“其中 F: 15.2 GB”。 |
| locations-skipped-1240x820.png | 整个 F 盘用正文、路径用等宽；58.0 GB 上次识别与非系统盘说明末尾句号清楚；两条跳过记录、加入时间、恢复按钮完整。 |
| trends-forecast-1240x820.png | C/D/E/F 盘符定宽，说明起点对齐；C 最近 30 天 / 约 23 天后满，其余三种解释齐全；node/chrome/cmd 为 9/6/1 进程、900/380 MB/“—”，有开始时间、无结束入口。 |
| home-due-1240x820.png | “已经 9 天没有体检”和“现在体检”在卡片下方一行；上次体检 10 月 26 日、浅绿可释放层、增长洞察及其它三盘正常。 |

| 保留的额外旧截图 | 本次实际看到的内容 |
|---|---|
| loading-1240x820.png | 冰山、正在读取及空间信息说明，没有连接失败或演示数字。 |
| home-last-scan-1240x820.png | 59.8 GB、浅绿可释放层、推荐 15.4 GB / 增长 +4.6 GB；上次结果 31.2 GB 和查看结果按钮。 |
| busy-1240x820.png | 顶部正在进行另一项任务的提示；首页水位、洞察、体检入口及上次结果仍在。 |
| stale-1240x820.png | 顶部仅一份过期说明；AI 标题完整在其下，组框与清理所选变淡禁用，坞保留原选择。 |
| unavailable-1240x820.png | 顶部和冰山空态都说明无法连接服务，重连可见，没有模拟数字补位。 |

### 归档、范围与未验证项

[ARCHIVE.json](../../acceptance/wave8/k6/ARCHIVE.json) 共 **2,200 个文件、198,504,252 字节**（含历史），本轮增加 684 个索引条目、72,791,107 字节。已只读复算全部 2,200 条的字节数 / SHA-256，逐字节比较各自 `.local` 来源，全部一致。三个 final 各 23 份源码快照均逐字节等于 `8a0ed61f` 和当前工作区。归档器自己的本次 archive 回执按既有机制留在 `.local`，未手工加入索引。

产品与测试改动共 8 个 UI 文件；未改 `ipc.mjs`、`styles/app.css`、tokens、冻结回放、契约、检查器、台账、其它包或工作树。app.css 保持 LF，已核对与提交字节相同。实现提交前 git diff --check 干净；原始证据中的空白告警保留，不编辑日志 / 源快照消除。

最后只在内存按本树绝对路径过滤 Chrome / Edge，残留计数 **0**；没有输出或记录进程命令行。测试的 loopback 服务和私有浏览器由 finally 关闭，未额外启动服务；全部检查串行，每次最多一个本树私有 headless Chrome。

本轮仅 Windows UI / 假宿主回放，原生窗口 0、选择框 0；无 Tauri、Cargo、npm、安装依赖、下载、外网访问、真实目录扫描、真实清理或结束真实进程。未验证真实 K4 / K5 联调、原生 WebView2 / Mica、生产并发、真实用户目录 / 整盘扫描与删除、macOS 或滚动 60fps。任务完成只供总控独立收单。

交回暂存区共 686 个文件：684 个新增归档条目、归档索引及本回执，全部在白名单。完整证据的 `git diff --cached --check` 退出 2，共 1,526 个原始证据空白告警条目，全部位于 `docs/acceptance/wave8/k6/receipts/`，证据外为 0；保留原字节，没有为消除告警修改原始日志或快照。`git diff --check 1c2e91e6 -- apps/water/ui docs/dispatch/reports/WATER-W8-K6-REPORT.md` 退出 0。旧回执全文字节前缀已与 `1c2e91e6` 比对一致，本节包含最终 31 张图的逐张观察。
