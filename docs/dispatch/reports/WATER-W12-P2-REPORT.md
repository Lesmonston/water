WATER-W12-P2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w12-p2/docs/dispatch/reports/WATER-W12-P2-REPORT.md

实际执行者：Codex（GPT-6），未使用子代理。Windows x64，2026-11-07；不代表 macOS 验证。原单和补单 01 一起交回。

工作树：F:/new/smaltalk/water/.worktrees/w12-p2；分支：worker/water-w12-p2。首次 HEAD 为 6fd29e342b76ff2ceecd74e66805300405ef1334，与 water-w12-p2-base-20261107 一致且干净；先运行原单第 4 节 baseline，通过。产品实现提交为 846ca073628eeb70e0bbd0c8b915f2152ca69210；后续测试标记修正提交为 **89b79d4f359c7a11ae6f73a17879a88217d8a6ff**，三个 final 全部绑定后者。后续报告/证据提交不含产品改动。

只改 5 个服务源文件与指定 tests/service_v1.rs。Cargo.toml、Cargo.lock、执行器与其它包、契约、检查器、manifest 和台账均未改。仅新增提交，无 push、merge、rebase、amend、reset 或 Git 配置/远端修改。提交进程身份为 Codex-GPT-6 <Codex-GPT-6@localhost>。

原单逐条对照：

| 要求 | 实现与验证 |
|---|---|
| 四类跳过 | Skipped 支持 path/group/template/folder、各自可空字段、添加时冻结的 title_zh，共用 s- 六位序列。skip_unit_add 严格核对两个参数键、版本与当前卡/行能力，busy 拒绝；合并卡每组一条，重复不写，超 64 整次不改内存或文件。路径仍从服务记录取得。 |
| 即时生效与以后匹配 | 共用 Skipped::matches；group 按组、template 按组与原模板、folder 按组与父目录 ASCII 不分大小写，path 保持完全路径匹配。只缩小原可清项资格，保留不可清理由。复用已有索引投影更新组/条目、占用、各级合计与按盘推荐量，不重写扫描事实文件；设置变化使计划过期并给结论序号加一。旧 SERVICE_M3C_SKIP 全部断言保持并通过。 |
| 卡片与行 | unfinished 卡无 skip；可清卡按实际可清成员给 skip。行输出 item/unit/null；其它 N 项、不可清行不给跳过。合并抽屉组行解析为单组。全成员跳过的泄漏簇不出卡、不出线索。重复点击已隐藏的同一单位返回原 Locations，不新写设置。 |
| 设置与 Locations | 默认/写回 v4；v1～v3 旧 path 条目补 kind 和标题，旧序号及 display_path 不变。Locations 增加 kind/display_zh，非 path 的 display_path 为 null，按 added_at/序号排序。读回校验形状、重复、条数；v4 重启保留。 |
| diagnostics_get | 参数只能为空对象；输出版本、设置计数、最近扫描/清理计数与固定状态/问题码、隔离量和存储目录计数。没有路径、名字或 ID；不读文件内容来统计 store。测试核对空状态、扫描/跳过/存储计数，并检查整段 JSON 无夹具路径、反斜线、组/条目/扫描 ID。 |
| 首页去嵌套 | 首页 plan 复用 clean::retain_outermost，路径按段/ASCII 大小写口径与准备一致；等路径时按准备入口的组排序保持相同选择。体量、直接/所选两块、项数和按盘统计只算外层，方式也取外层。真实嵌套夹具的六种原 W11 组合均补首页与确认框精确对照。 |
| 抽屉一致 | 没有决定时，推荐抽屉的 unfinished 条目不再显示 included；既有明确决定仍按 selected 集合。新增断言验证未选择 unfinished 时的推荐抽屉与卡菜单。 |
| 趋势 new | 无增长比较、未标修、非疑似时为 new；rate_zh 与首页/线索共用 recent_count/recent_text。覆盖 0、非 0、增长、停止与既有标修/疑似行为。 |
| 清理记录 | 报告带 journal_error 照存，journal_note_zh 汇总两类报告中 JournalFailed 项数；各组单独列日志原因。隔离批次错误保留直接删除结果，失败组与“没能放进隔离区：<原因>”照存；clean_result 可读，重启加载器接受新增键。真正第一条日志失败且未做任何动作时仍返回 JOURNAL_MESSAGE。 |
| 刷新顺序 | refresh_with 先过普通目录检查，再加 seen_roots；现有隔离区完整测试通过。 |

覆盖边界：普通组和泄漏簇都用真实扫描后新增成员再扫描验证；模板/父目录的新成员通过本树私有测试服务注入新的合成扫描记录验证投影（未声称这两类用真实磁盘重扫测过）。合并卡/行、重复、stale、busy、精确 64 与多条原子拒绝、设置各版、四类移除均在既有测试中验证。既有 path 测试、上限、s-000001 与规模断言没有改弱；总测试数仍是 12。

补单 01：日志断后不再跑后续隔离批次

生产 clean_start 转到包内 start_with_executor，生产传 NativeExecutor，后者原样调用真实 execute/quarantine；没有新增 IPC、外部参数或系统函数。某个报告带 journal_error 后，后续批次只生成 JournalFailed 的跳过报告，不再调用执行器，不调用 save_moves，不创建隔离目录/记录。清理状态为 stopped，未运行组为 skipped，N 与组说明包含这些项，已做的直接删除字节保持。

tests/service_v1.rs 的 JournalStopsExecutor 在同一调用层替换报告：第一条直接删除真正执行，返回首项 deleted、其余 JournalFailed、Stopped 与 journal_error；随后断言隔离调用次数为 0、原文件仍在、隔离根不存在、quarantine_list 无新批次、记录可读、N 等于直接剩余项加未跑批次项数、释放量精确等于首项报告。另覆盖第一盘隔离报告带 journal_error 后第二盘不调用；第二盘是合成 X: 元数据与本树隔离目标登记，不创建或访问 X: 实际夹具。没有改执行器。直接/隔离报告汇总说明和重启读回另有精确断言。

本树执行器仍是冻结基线；P1 真实 journal_error 行为的联合验证留给总控集成验收，不能把注入报告说成已经接真 P1 测过。未额外增加负控模式。

旧断言迁移与自主选择：

1. settings migration 的预期 water.settings.v3 → water.settings.v4，并增加 v3 输入档；这是 SPEC 1.5 必然变化。
2. 旧 group_detail 形状样本为每条 rows 增加 skip:null，clean_result 样本增加 journal_note_zh:null；shape 的精确键集检查保持，具体值由 SERVICE_W12_SKIP/RECORD 新断言核对。未改冻结 fixtures 文件。
3. 旧 m35_clean_split 日志失败用例的 state failed → completed，clean_result 返回 JOURNAL_MESSAGE 错误 → 可读记录、失败隔离组及精确“没能放进隔离区：journal write failed”说明，另核直接释放量大于零。该夹具已经直接删除后才遇到隔离日志错误，W12 4.4 明确要求保存；磁盘核对不可还原卡的原断言保留。第一条日志失败未动过东西的分支保持。
4. 原 frozen menus 夹具没有 unfinished，原断言仍成立而未修改；新增真实 unfinished 用例单独核没有 skip。原 SERVICE_M3C_SKIP 断言均未修改。
5. 保留不可变扫描事实与索引投影架构，用同一匹配逻辑缩小资格，避免重写全部历史扫描或改变既有 path 测试行为。替换执行器接口只在包内，生产默认真实执行器，依补单 01 明确授权。
6. 工单建议的 m35_cluster_and_forecast 实际是已有测试里的 helper，不新增 #[test]；新断言放在那里，所属测试仍是 m35_trends_history。
7. 直接 cargo 首次找不到 PATH，换成绝对路径后因默认离线缓存版本不足退出；没有下载/自行复制依赖，后续编译和测试全部回到工单检查器的固定工具链、私有缓存/target。格式化用本包 cargo fmt。两条试探命令没有运行产品测试。

负控：

| 最终采信 | 变异与失败 | 原字节恢复后的绿 |
|---|---|---|
| nc1 13:45:02.719 / 31900 | 扫描结束构造投影时临时漏掉 group 跳过；实际重扫后普通组新成员和泄漏簇新成员以 SERVICE_W12_SKIP 失败。 | 13:51:13.923 / 10260，12 过；前两次恢复测试仅计时失败。 |
| nc2 13:53:28.175 / 28848 | 只取消首页 view 的 retain_outermost 调用；SERVICE_W12_NESTED 精确比较失败，首页 29、确认框 18。 | 13:56:09.215 / 12024，12 过。 |
| nc3 13:58:30.813 / 33720 | 非日志类隔离错误临时整体返回；SERVICE_W12_RECORD 核完成状态失败（failed / completed），不算编译失败。 | 14:00:38.583 / 13996，12 过。 |

每次只改一处生产逻辑，随后 git checkout -- 指定文件并立即 test。13:35 的首轮 nc3 虽抓到 clean_result 错误，但落在无目标标记的 helper，负控门拒绝；未计为有效。新增 89b79d4f 只把该用例改为先核完成状态、再带标记读取结果，三条负控全部在新测试字节下重做。早先 846ca073 的 nc1/nc2 证据留作历史，不作为 final 的证明。

最终门：

| 命令模式 | UTC 回执前缀 | 结果 |
|---|---|---|
| baseline | 12:11:39.233 / 35308 | 通过；12:04 的既有总控预检证据保留，未冒充本次执行。 |
| lock | 12:26:19.726 / 37176 | 通过，锁和依赖无变化。 |
| check --final | 14:03:18.116 / 5116 | 通过：格式、clippy -D warnings、范围与冻结文件。 |
| test --final | 14:09:52.427 / 36616 | 通过，12 passed、0 failed/ignored/filtered，耗时 122.17 s；三条负控与相同字节恢复审计通过。 |
| real --final | 14:12:17.392 / 38948 | 通过，只读体检、清理关闭，输出仅计数。 |
| archive | 14:14:42.818 / 38160 | 通过，ARCHIVE.json 857 条、28,162,774 字节；随后逐条独立核字节与 SHA256。 |

所有检查从本工作树根执行：node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P2 --mode <模式> [--final]。检查入口通过退出 0；负控的 cargo 预期退出 101。三个成功 final 的 HEAD 均为 89b79d4f359c7a11ae6f73a17879a88217d8a6ff，生产哈希 9a01db21705ffd44cbbb9f7ca554ebcd8114bdc9bff09a5cdd6be2b42cc04972，测试哈希 abe6fa2f3d2b801d5176fa85761b65bf1efcbff7c71db176f14ff4dd5cfb51ba。

计时重跑：出现多次 SERVICE_RETURN_BUDGET，仅原样重跑，没有调大/删断言，也没有新增墙钟限制。12:56 的 scan_progress/skip_remove → 13:01 绿；13:06、13:11 在后续补边界/补单前只有 scan_progress 超限；13:37 的 clean_prepare → 13:40 绿；13:46 的 scan_progress/group_detail、13:49 的 scan_progress → 13:51 绿；最终 14:03 的 conclusion_decide/group_detail、14:06 的 scan_progress/quarantine_restore/clean_start → 14:09 绿。通用 helper 失败只记录命令名，不含实际毫秒数，无法补报精确 N ms；原始日志与规模测试输出全部保留。计时之外的开发期失败分别为未完成接线/格式/clippy、形状迁移、加载器遗漏新键、合成 rule ID 写错、补单第二盘缺扫描目标，均在本单范围修正后全测变绿。所有检查回执逐条见下表及归档原日志，不隐藏失败。

真实冒烟：cards=5、clues=3、conclusion_rows=13、drives=4、folds=3、quarantine_cards=0。原生窗口/选择框/浏览器均 0；没有真实清理、隔离、复原或永久删除。删除/移动测试仅用本树 .local 新建合成夹具及既有边界回收机制。没有运行其它工作树任务、上游脚本、网络调用或下载。收尾未发现 cargo/rustc/service_v1/service_smoke 进程残留；未终止他人进程。

未验证：macOS、真实用户删除/隔离、生产竞态、宿主/UI 接线、P1 合入后的真实日志失败联合链。界面和发布不属于本单。本回执表示交回待总控验收，不自行更新 VERIFIED。

全部检查记录（检查器原始 UTC 文件名前缀；失败原因详见同名日志）：

| 回执前缀 | 模式 | 结果 |
|---|---|---|

| 2026-11-07T12-04-50.991Z-30140-baseline | baseline | passed |
| 2026-11-07T12-11-39.233Z-35308-baseline | baseline | passed |
| 2026-11-07T12-26-19.726Z-37176-lock | lock | passed |
| 2026-11-07T12-26-45.088Z-24600-check | check | failed |
| 2026-11-07T12-27-51.503Z-25972-check | check | failed |
| 2026-11-07T12-37-56.254Z-31820-check | check | failed |
| 2026-11-07T12-39-21.777Z-38936-check | check | passed |
| 2026-11-07T12-42-32.583Z-32072-test | test | failed |
| 2026-11-07T12-48-25.155Z-20180-test | test | failed |
| 2026-11-07T12-50-47.768Z-31824-test | test | passed |
| 2026-11-07T12-54-38.690Z-5056-check | check | passed |
| 2026-11-07T12-56-32.266Z-28556-test | test | failed |
| 2026-11-07T13-01-18.095Z-39160-test | test | passed |
| 2026-11-07T13-05-27.018Z-4204-check | check | passed |
| 2026-11-07T13-06-30.781Z-7116-test | test | failed |
| 2026-11-07T13-11-15.055Z-3152-test | test | failed |
| 2026-11-07T13-15-27.439Z-28920-check | check | passed |
| 2026-11-07T13-15-55.218Z-5144-test | test | failed |
| 2026-11-07T13-19-31.297Z-37948-test | test | passed |
| 2026-11-07T13-22-16.705Z-3052-check | check | passed |
| 2026-11-07T13-23-42.204Z-30312-red-nc1 | red-nc1 | passed |
| 2026-11-07T13-28-20.686Z-36756-test | test | passed |
| 2026-11-07T13-31-00.024Z-22428-red-nc2 | red-nc2 | passed |
| 2026-11-07T13-33-04.413Z-19000-test | test | passed |
| 2026-11-07T13-35-43.244Z-26528-red-nc3 | red-nc3 | failed |
| 2026-11-07T13-37-44.032Z-34444-test | test | failed |
| 2026-11-07T13-40-09.915Z-36004-test | test | passed |
| 2026-11-07T13-42-24.721Z-34812-test | test | passed |
| 2026-11-07T13-45-02.719Z-31900-red-nc1 | red-nc1 | passed |
| 2026-11-07T13-46-55.787Z-34196-test | test | failed |
| 2026-11-07T13-49-23.168Z-38940-test | test | failed |
| 2026-11-07T13-51-13.923Z-10260-test | test | passed |
| 2026-11-07T13-53-28.175Z-28848-red-nc2 | red-nc2 | passed |
| 2026-11-07T13-56-09.215Z-12024-test | test | passed |
| 2026-11-07T13-58-30.813Z-33720-red-nc3 | red-nc3 | passed |
| 2026-11-07T14-00-38.583Z-13996-test | test | passed |
| 2026-11-07T14-03-18.116Z-5116-check | check --final | passed |
| 2026-11-07T14-03-58.957Z-39504-test | test --final | failed |
| 2026-11-07T14-06-24.275Z-25328-test | test --final | failed |
| 2026-11-07T14-09-52.427Z-36616-test | test --final | passed |
| 2026-11-07T14-12-17.392Z-38948-real | real --final | passed |
| 2026-11-07T14-14-42.818Z-38160-archive | archive | passed |
