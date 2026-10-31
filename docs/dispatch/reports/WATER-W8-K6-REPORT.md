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
