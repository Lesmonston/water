WATER-W10-M7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md

**当前状态（补单 06，2026-11-06）：Codex（GPT-6）从干净的 `2917e5fc` 续做。实现提交为 `db9c9185` 与最终 `d2f642a466f18f97db8cb2ad87a7f5c0668e241d`；已修复隔离根的准备期过滤与逐批执行前检查、保留编号迁移、默认体检跳过离线盘、检查失败保留隔离记录，以及还原收尾顺序。仅在指定四个测试中追加断言，原断言和计时规则未改，仍为 12 个测试。最终提交上的三条负控均命中并立即恢复绿；干净提交的 check／test／real 三个 final 通过，archive 已完成。详见文末“补单 06”。下列各补单状态为历史记录。**

**当前状态（补单 05，2026-11-06）：从 `44f22980` 续做。产品代码未改，仍为 `8b639ec450d1cc9afa941f36c14131e204fa0630`。测试 `call()` 对 11 条同步写文件命令上限 200 ms，`custom_root_add` 不计时，其余 50 ms；该测试改动已提交为 `492c9c8423eeb45ed456310971596c05bf0266fa`。官方 `check` 通过；同一字节一次完整 `test` 12/12。三条负控各红一次并立即恢复原字节再绿。干净实现提交上 `check`／`test`／`real` 三个 final 通过。`archive` 已跑。详见文末“补单 05”。**

**当前状态（补单 04，2026-11-06）：从 `9aba0889` 续做。未验收实现已提交为 `8b639ec450d1cc9afa941f36c14131e204fa0630`。后台扫描／清理／查重／永久删除收尾的磁盘读写已移出状态锁，`m35::event` 已拆成锁外写文件、短锁入列。本地量到后台持锁最长 3.05 ms。官方 `check` 通过；同一字节官方 `test` 12/12、11/12（`conclusion_decide`）、原样重跑 12/12、再 11/12（`cluster_mark_fixed`），累计两次失败，按补单停止。负控、三个 final 和真实冒烟未运行。详见文末“补单 04”。**

**当前状态（补单 03，2026-11-06）：从 `658c281a` 续做。未验收实现已提交为 `7a151dfb02c868eff81cdaece88d12176fa895aa`。`custom_root_add` 已按契约豁免 50 ms；一万项分组首次 `group_detail` 本机空闲 5 次均 4.3～5.0 ms。官方 `check` 通过；同一字节官方 `test` 12/12、11/12（`dedupe_progress`）、原样重跑 12/12、再 11/12（`skip_remove`），累计两次失败，按补单停止。负控、三个 final 和真实冒烟未运行。详见文末“补单 03”。**

**当前状态（补单 02，2026-11-06）：用户“继续”后接续 `4566dd8c` 上未提交的服务源码。未验收实现已提交为 `4d146934664a5958c4460e5a7a8a34366a151ae2`。官方 `check` 通过；同一字节连续两次官方 `test` 失败（11/12 再 10/12），按工作规则停止。负控、三个 final 和真实冒烟未运行。详见文末“补单 02”。**

**当前状态（补单 01，2026-11-06）：原形状授权缺口已解除，已提交未验收实现 `cd0e5d2186544b329cd2d3ed552edaec9a316259`。最终同字节两次 `test` 都是 11/12，通过的不是整单；旧 `service_clean_flow` 连续因 50 ms 时限失败，按工作规则停止。三条负控、三个 final 和真实冒烟均未运行。详见文末“补单 01”。以下原有各节保留为 `50fb2ab4` 时的历史记录，不代表补单后的产品仍未改动。**

日期：2026-11-06。执行者：Codex（GPT-6，未使用子代理）。这是开工审阅阶段的受阻回执，不是实现完成或验收通过回执。

## 现场与已做检查

- 权威票面：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-SERVICE-20261106.md`。票面不在首次 HEAD 的工作树内，本次直接读取权威路径，未复制、合并或修改它。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w10-m7`；分支：`worker/water-w10-m7`。
- 首次 HEAD：`b4b889a9412c47d8227c492eb76ef053fbd2b9c2`，与票面一致；开工时 `git status --short` 为空。
- 实现提交 SHA：无。产品、依赖、锁文件和测试均未修改；本次只新增此受阻回执并作单独提交。
- 已读工作规则、SERVICE-M35 全文、票面总控补充、IPC-M35 全文，以及定位冲突所需的旧 SERVICE／SERVICE-HARDENING／SERVICE-M3C／ADD-01／SERVICE-M3D、IPC 与现有测试。六包接口及服务全部源码的逐项审阅未完成；发现下述阻塞后停止，不能据此声称六包契约已全部核对。

在指定工作树根执行：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M7 --mode baseline
```

退出码 **0**，`status: passed`。检查器回执：

`F:/new/smaltalk/water/.worktrees/w10-m7/.local/checks/WATER-W10-M7/2026-11-06T06-58-48.455Z-30856-baseline-result.json`

SHA-256：`b6eba46945ea9923f6356aed159e532fbb5db5845ecb11c498a6f9de57bab163`。

其中 `realDataRead: false`、`productTestsRun: false`、`nativeWindows: 0`、`directoryDialogs: 0`，检查前后 HEAD 与干净状态一致。baseline 只证明环境及输入就绪。

## 阻塞：M35 新字段与冻结的旧形状断言不相容，未获样例迁移授权

1. `packages/water-service/tests/service_v1.rs:449` 的 `fixtures()` 只叠加 checkup-v1 与 m3c-v1 两份样例；`:490` 的 `shape()` 在对象分支严格比较全部键，不能接受额外字段。
2. 同文件 `service_ipc_contract` 的旧断言直接将 `app_state`、`scan_progress`、`clean_progress`、`group_detail`、`locations_get`、`trends`、`clean_prepare`、`clean_result` 等返回值与这些样例比较。第一处已在 `:572`；`service_trends_locations` 的 `:1268` 也严格比对旧 trends 样例。
3. IPC-M35 明确要求这些命令新增字段。最小矛盾是 `app_state {}`：第 2 节（`:64`）要求增加 `quarantine`，隔离区为空也要返回 `null`；旧 `app_state_fresh` 样例只有 `app_version, platform, busy, drives, last_scan, insights, checkup_due` 七个键。新增一个值为 null 的键，也会先在 `shape()` 对象键集合比较处失败，不会被后面的 null 分支放过。
4. 票面第 5 节（权威票面 `:83`）规定“原有断言只能改 SPEC 第 11 节获准的四类”。SERVICE-M35 `:225`～`:229` 只授权设置版本、scan_start 参数、命令名单、age() 创建时间四类，不包含形状样例或旧形状期望迁移。
5. 工作规则 `docs/dispatch/W10-M35-WORKER-RULES.md:40` 明确要求：**“SPEC 没想到、但因本单改动而必然要改的旧断言：先写受阻回执，不要自行改。”** 本次按此停止。

静态核对到的必然增量如下；这是源码与样例比较，不是已经运行产品测试的失败记录。

| 旧返回值 | IPC-M35 要求新增 | 现有严格形状比对位置（service_v1.rs） |
|---|---|---|
| AppState | `quarantine` | 572、644 |
| ScanProgress | `locations` | 576 |
| CleanProgress | `phase`、`quarantined_bytes` | 580、698 |
| GroupDetail | `rows`、`rows_note_zh` | 648 |
| Locations | `home`、`sessions`、`manifests` | 652、653、670 |
| Trends | `clusters` | 678、1268 |
| CleanPreview | `delete`、`chosen`、`expected_skip` | 691 |
| CleanResultView | `quarantined` | 702 |

只读 PowerShell 将旧两份 JSON 按 `fixtures()` 的顺序叠加后检查键集合，确认 AppState、Locations、Trends、CleanPreview 的新旧键集合均不相等。没有改测试、跑变异或伪造红灯。

另已核对 `contracts/m35-v1/ui-fixtures-m35.json:2`：其说明明确写着 **“It adds keys only (all v2_*), it overrides none.”** 所以单纯再叠加这份文件，也不会替换现有旧断言读取的 `app_state_fresh`、`locations`、`trends` 等键。需要明确的样例映射或增量期望方案，不能只靠现有叠加机制解决。

历史上相同问题在仍有效的 `contracts/m3c-v1/SERVICE-M3C-ADD-01.md` 第 5.1 节曾单独授权，且要求保留 `shape()` 的严格比较与样例非 null 断言；那份授权指定的是 m3c 样例，不能当成此次 m35 迁移授权。

## 最小补充需求

请总控为 M7 出编号补充，明确授权旧接口形状测试迁移到 IPC-M35 的新增字段，并冻结以下处理：

- `fixtures()`／旧 `shape()` 调用中旧样例键到 M35 `v2_*` 样例的具体映射，或等价的旧样例增量期望；其中应涵盖旧 `{groupIds}` 清理预览的新增字段，以及空闲进度的新增字段。
- 保留 `shape()` 的完整键集合校验、原有非 null／样例存在断言和其它旧行为断言，不通过过滤新字段、缺样例返回 null 或按调用场景隐藏新字段绕过检查。
- 将此项列为 SERVICE-M35 第 11 节四类之外额外获准的旧期望变更；其余边界、测试数量和标记保持原要求。

不需要新增产品依赖、系统函数或放宽真实数据权限。此阻塞是旧测试期望与新接口要求的授权缺口，尚不能据此认定六个依赖包有缺陷。

## 未实施与未验证

- SERVICE-M35 第 1～10 节及票面第 2 节六项总控补充：均未实施；未生成实现提交。
- 旧断言：零改动，因而没有原值／新值变更清单。
- 六个包的接口差异：未完成全量核对，不报告“全部一致”。
- `lock`、`check`、`test`、三条负控、三个 final、`archive`：均未运行。没有负控失败消息或恢复哈希。
- `real`：未运行，真实冒烟计数无；没有清理、移动或删除任何真实文件。
- 未创建删除、隔离、声明或查重夹具；未打开窗口、选择框或浏览器；未下载依赖、联网、修改契约／检查器／台账／其它包；未 push、改远端或改写历史。

受阻现场以本回执提交保留在原分支。后续应从该提交接续，先解决上述授权缺口，再继续剩余预读与实现。交回后停止本票检查。

## 补单 01

### 当前结论与续做现场

- 实际执行者：Codex（GPT-6）；未分派子代理或其它执行者。
- 按补单依次读取原单、本补单、上述历史回执；随后补完六个依赖包契约及公开接口、服务全部源码与测试的阅读。
- 续做时 HEAD 为 `50fb2ab401f8291658c7bb6f1ed52537abddf443`，分支 `worker/water-w10-m7`，工作树干净；全程仍在指定树内。
- 当前实现检查点：`cd0e5d2186544b329cd2d3ed552edaec9a316259`，提交信息明确为 **wip / blocked**。只含服务包下 16 份文件，不含此回执与证据；在 `50fb2ab4` 之后新增，未改写历史。
- 当前已完成代码接线和合成验证的若干轮，但**未完成整单、负控与 final**，不得据此合入或发布。

最后两次完整测试使用相同字节，均退出 **1**（内部 cargo test 退出 101），均为 **11 passed / 1 failed**：

| 检查回执 | 失败内容 |
|---|---|
| `2026-11-06T09-10-57.734Z-37636-test-result.json` | `service_clean_flow` 的 `SERVICE_RETURN_BUDGET: clean_prepare`；同次输出的排除规模用例耗时 36.7415 ms，这条最终失败没有单独打印耗时，因此不把它说成那个规模用例超时 |
| `2026-11-06T09-13-31.381Z-36344-test-result.json` | 原样重跑，仍是 `service_clean_flow`；`SERVICE_M3C_EXCLUDE: scale prepare 55.5931ms`，原断言上限 50 ms |

两次检查器记录的 `productionHash` 都是 `4907998981fb1cabcb341f3ce739f45225226834c2177d05ff1316d965c8edae`，`testHash` 都是 `53480d0255b9526084df0439600e9f52d7a65256a547ec9320d66a6a9a291787`。第一次失败后到原样重跑结束，没有修改产品或测试。

工作规则 `docs/dispatch/W10-M35-WORKER-RULES.md:78` 的原文：**“测试偶发超时可以原样重跑一次；连续两次失败就停下写受阻回执，不要自己调大超时。”** 本次到此停止实现和测试，随后只提交现场、运行归档器保存既有日志、写本回执。未调大时限，未过滤或跳过测试，未更换测试目标；目前没有证据证明两次失败只是宿主负载，也没有证据排除产品性能问题。

两份最终失败回执 SHA-256 分别为：

- `235a683550db3fb6b02129349d45ba19386e1e2f02eb20bf69aa347bc313a62a`
- `2a1da5edb6ac64d4dc66fe85ef05b671606ec811afaa6790bb97537309e1c3e5`

### 实现对照（均为已提交、待继续验收）

| SERVICE-M35 节 | 本次代码与验证 |
|---|---|
| 1 原则与边界 | 只改服务包；保留旧命令与原公开 API，新增 IPC-M35 服务命令及内部 locate；Cargo 仅增加三个指定 path 依赖，锁仅增加三个本地包，没有更换注册表包版本 |
| 2 Platform | `src/lib.rs` 增加四个带缺省实现的方法；Windows 只读回收站、已安装程序、固定盘隔离根；唯一新增 FFI 是 `src/native_windows.rs` 的 `SHQueryRecycleBinW`。复用原有时区函数生成本地编号，没有增加其它系统函数 |
| 3 设置 v3 | `service.rs`、`m35.rs` 支持 sessions／trusts／fixed_marks／keeps，旧版本补缺省，固定上限按时间裁剪，原子保存；旧类别、自选位置和逐项跳过仍保留 |
| 4 体检 | `m35.rs` 解析位置 ID、复用 drive ID、生成本次根；扫描线程构造 resolve_plan_with 与信任目标追加 JSON、调用三个开关都开的 scan_full，整盘后接 space_overview；扫描补声明、联接引用、贵重件、怪名、应用安装状态、git 登记与回收站／空间结果；root_levels 在体检与执行复核均上溯；Record::load 接受新增可选键及合法 leak 组，旧记录继续读回。计划和声明读取移到后台，进度回调在状态锁外计算后短锁更新 |
| 5 结论视图 | 新 `conclusion.rs` 提供规则合并单位、缺省计划、类别→单位→汇总行→条目的选择、保留记录、前 5 卡及 more_cards、线索上限、四类 folds、版本与四种过期、抽屉行与不超过 200 项的搜索、detail 两种模式和 unchanged；汇总行按规定 SHA-256 ID。卡片 menu 保留 `skip` 与 `detail`，有线索才附 copy_clue；未新增整组／整行 skip 接口 |
| 6 两块清理 | `clean.rs` 保留旧 groupIds 直接删除；结论模式先 execute 直接删除块，再按盘调用 quarantine；同日志、一次性令牌、解锁对、泄漏模板复查、未清完项年龄 0、独立隔离记录与结果；`dedupe.rs` 派生查重计划，原件身份变化排除整组、硬链接副本不可移除。两逻辑盘分批／记录用假执行器测试，**没有对 X: 等真实盘写夹具** |
| 7 隔离区 | 新 `quarantine.rs` 启动及任务结束时调用 list／inspect 核对并缓存，外来目录卡、常驻条、ID 限定 locate、不覆盖还原和旁边还原、可停止的 water-purge 线程、遗留原因与重试、日志失败后重核；purge 重试追加同一日志文件。移入、还原与永久删除实测只在本树合成夹具 |
| 8 查重 | 新 `dedupe.rs` 以位置 ID 开独占 water-dedupe 任务，声明保护前缀、取消、进度与结果、仅保留五条记录、建议保留理由与内存版本／勾选；体检不调用查重，文件内容只由依赖包在查重时读取 |
| 9 设置命令 | 会话开关、声明信任、invalid 拒绝、changed 状态与哈希绑定；Locations 始终含 home、sessions、manifests；保留既有字段 |
| 10 趋势增长 | `conclusion.rs` 输出簇三状态、已修标记、线索；`service.rs::forecast` 检测 Water 以外的大跳升后重新起算；增长基准丢失使用“与更早的一次体检相比”，since 为 null；新测试覆盖两个合格基准取较新者 |
| 11 测试 | 唯一测试文件仍是 service_v1.rs，精确 12 个入口；六新入口已补对应标记。最后两次六新入口及五旧入口通过，旧 service_clean_flow 时限未通过。历史上的 12/12 绿只属于当时字节，不能用于当前实现的最终结论 |
| 12 负控／real | 当前停止前尚未执行；example 已改成只读 common 范围、清理关闭、只输出结论与隔离卡的计数，但没有运行它 |

原单第 2 节总控补充逐条：

1. `m35::local_path` 去掉本地盘的 `\\?\` 前缀后核对；UNC／设备等非本地路径判不可清，中文原因为“路径格式无法核对项目声明”；`m35_scope_and_plan` 覆盖扩展前缀能保护与 UNC 不可清。
2. 补充检查任何发现声明的目录，不依赖信任／有效状态；包住声明目录的条目不可清，首原因是“里面有项目的声明文件，不能整块清理”，其它原因保留在 notes。对应合成用例通过。
3. 已安装程序的 collected_at 在保存到服务事实之前转换为 UTC RFC 3339；正数、负数、坏值都有断言；越出四位年份范围按 None。未对依赖包自身的字段类型作修改。
4. 名词查找之后再做显示名与规则名的小写、去空白、包含核对；假列表“腾讯QQ”配规则“QQ”被拦，整组仍不可清。没有因查不到提升扫描资格。
5. 执行器 Journal 错误返回固定 `message_zh`，不写成功结果、不重试移动；重新 inspect 磁盘。测试侧 DurableFile 包装仅在 synthetic moved／done 日志行注入失败，产品没有故障开关；m35_clean_split 和 m35_quarantine 都覆盖，最后两轮通过。
6. 没有实现 SERVICE-M35-ADD-01，没向 IPC 增加冰山数据字段。

### 补单授权的旧期望逐处变化

所有形状迁移集中在 `tests/service_v1.rs::fixtures()` 的第 540～608 行。原 `shape()` 移到第 638 行但函数比较规则未改；原有样例存在／非 null 断言未改，契约 JSON 没有修改。下表位置是检查点 `cd0e5d21` 中调用方行号，原期望键来自原单基线 `50fb2ab4`。

| 测试／位置 | 原期望 | 新期望 |
|---|---|---|
| service_ipc_contract 720、792 | app_state_fresh／app_state_after_scan 原对象 | 原对象 + v2_app_state_plain 的 quarantine，空时 null |
| service_ipc_contract 724 | scan_progress_sequence 原对象 | 原对象 + 同阶段 v2_scan_progress_sequence.locations；idle 为 [] |
| service_ipc_contract 728、846 | clean_progress_sequence 原对象 | 原对象 + 同阶段 v2_clean_progress_sequence.phase／quarantined_bytes；idle 是 delete／"0"（字节字符串） |
| service_ipc_contract 796 | group_details 各旧对象 | 每个原对象 + v2_group_detail_items.rows／rows_note_zh |
| service_ipc_contract 800、801、818 | locations 原对象 | 原对象 + v2_locations.home／sessions／manifests |
| service_ipc_contract 826；service_trends_locations 1416 | trends 原对象 | 原对象 + v2_trends.clusters |
| service_ipc_contract 839 | clean_prepare_default 原对象 | 原对象 + v2_clean_prepare_quarantine.delete／chosen／expected_skip，其中旧 groupIds 的 chosen 明确为 null |
| service_ipc_contract 850 | clean_result 原对象 | 原对象 + quarantined，旧直接删除为 null；间接使用 fixtures()["clean_result"] 构造旧清理记录的工具也因此得到该可选增量 |
| age()，原 395 行、现 475 行 | 只 set_modified | 同时 set_created，同一给定时刻；按 SERVICE-M35 第 11 节第 4 类授权 |

没有改原有行为断言的数值、措辞、50 ms 上限或样例非 null 保护；没有改为按场景隐藏新字段。新测试工具扩充了假 Platform、测试内存记录注入及日志故障包装；都仅在测试文件，不作为生产接口。

### 六包实际接口核对

- junk-rules：实际 `resolve_plan_with` 的参数次序是 `(rules, folders, custom_roots, created_at, options)`；服务按实际签名调用。声明 pattern 的条件实际保存在 `Target.pattern_conditions`，未给 MatchSpec 增加变体；服务通过 JSON 追加／读回，不自行构造新枚举成员。
- junk-scan：实际 scan_full 返回 `(ScanResult, ScanExtras)`，Group／Item 新事实字段与契约一致；Item 没有独立创建时间字段，服务只读条目 metadata.created 生成自身可选 item_created，供簇线索与标记后证据使用。
- cleanup-manifest：实际 local drive 路径边界与原单总控补充一致；按 to_targets／protects／read_git_link／read_manifest 调用，未扩大内容读取对象。
- junk-clean：按公开 execute／quarantine／restore／purge／inspect／list 使用；`CleanPlan::estimate` 是 crate 私有，不是服务可调用的接口，服务显示估算来自条目数据；没有修改依赖。执行器 Journal 失败会丢报告，按原单失败语义处理。
- dup-finder：实际 `ended_at` 取真实 `SystemTime::now()`，不是传入的假时钟。查重夹具改用真实过去的文件年龄，查重完成后把假时钟明确对齐 finished_at + 1 小时，避免未来 mtime 与刚好年龄门槛导致太新；不靠 sleep 等机器变快。
- installed-apps：实际 collected_at 是 Unix 秒字符串；name_tokens 把相邻中文／字母粘为一词。均按总控补充适配，不改依赖。

### 检查命令与原始结果

统一命令形式（在指定工作树根）：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M7 --mode <模式>
```

下表每个结果文件均已归档到 `docs/acceptance/wave10/m7/receipts/`；表内省略共同后缀 `-result.json`。历史最早 06:54 是总控预检遗留，不当作本执行者运行。06:58 是原单已记载的 baseline。

| 回执文件（去共同后缀） | 模式／结果 | 说明 |
|---|---|---|
| 2026-11-06T07-44-01.135Z-6380-baseline | baseline 失败／1 | 补单明确从回执提交续做，而检查器 baseline 只接受原 b4b889a9；未为重跑重置历史，沿用原 baseline |
| 2026-11-06T08-11-23.589Z-30248-lock | lock 失败／1 | 原锁存在时检查器只核 `--locked`，三个指定 path 依赖需更新锁 |
| 2026-11-06T08-19-09.542Z-34144-lock | lock 通过／0 | 用检查器准备的私有离线 Cargo home 执行 `cargo generate-lockfile --offline --manifest-path packages/water-service/Cargo.toml` 后通过；没有下载，注册表版本与 checksum 不变 |
| 2026-11-06T08-19-12.017Z-34944-check | check 失败／1 | Clippy：布尔表达式、字段 pattern 简写 |
| 2026-11-06T08-20-26.608Z-26440-check | check 通过／0 | 当时字节 |
| 2026-11-06T08-22-05.262Z-4564-test | test 失败／1 | 初轮 1/12，暴露进度持锁、测试时间／合并假设等问题；之后修改实现 |
| 2026-11-06T08-25-15.712Z-18624-test | test 人工终止／1 | 识别清理预览重复锁；按可执行文件精确绝对前缀停止本票 test 进程 1 个，非有效负控；之后 drop(projection) 修复 |
| 2026-11-06T08-27-39.561Z-36216-test | test 失败／1 | 7/12；之后修卡片夹具、后台发布时序与性能 |
| 2026-11-06T08-35-54.739Z-35320-test | test 失败／1 | 7/12；之后修扫描计划后台构造、隔离重试日志和查重假时间 |
| 2026-11-06T08-38-59.127Z-36768-test | test 失败／1 | 9/12；之后修新测试时钟和 Locations 会话统计复杂度 |
| 2026-11-06T08-41-24.095Z-32112-check | check 失败／1 | 测试 needless_borrow |
| 2026-11-06T08-42-25.222Z-36280-test | test 失败／1 | 9/12；之后收敛首原因、调整查重假时间、优化会话最大项查询 |
| 2026-11-06T08-44-52.104Z-29260-test | test 通过／0 | 12/12，62.29 秒，属于历史字节 |
| 2026-11-06T08-51-30.371Z-11648-check | check 通过／0 | 增补选择／保护／趋势覆盖后的字节 |
| 2026-11-06T08-51-56.009Z-30004-test | test 失败／1 | 11/12，旧 group_detail 50 ms，之后优化行资格计算 |
| 2026-11-06T08-55-35.655Z-37256-check | check 失败／1 | 行资格闭包引用层级编译错误；后修 |
| 2026-11-06T08-56-00.717Z-27720-check | check 通过／0 | 当时字节 |
| 2026-11-06T08-57-49.003Z-21920-test | test 失败／1 | 9/12；新测试对目录用 set_len、原件变化后空计划预期错误，随后修新夹具；旧规模时限也失败，未改其断言 |
| 2026-11-06T09-00-35.862Z-17744-check | check 失败／1 | 新测试 cmp_owned；后修 |
| 2026-11-06T09-01-27.288Z-20272-test | test 通过／0 | 12/12，85.72 秒，属于历史字节 |
| 2026-11-06T09-04-14.458Z-21984-check | check 通过／0 | 当时字节 |
| 2026-11-06T09-05-12.178Z-17696-test | test 通过／0 | 12/12，100.23 秒，属于历史字节 |
| 2026-11-06T09-08-39.437Z-31984-check | check 通过／0 | 最后代码检查，格式与 Clippy -D warnings 通过 |
| 2026-11-06T09-10-57.734Z-37636-test | test 失败／1 | 当前字节第一次，11/12，74.49 秒 |
| 2026-11-06T09-13-31.381Z-36344-test | test 失败／1 | 原样一次重跑，11/12，71.25 秒；按规则停止 |
| 2026-11-06T09-16-54.952Z-33028-archive | archive 通过／0 | 只保存既有证据；不是 final |

另在初次离线锁生成后直接运行过一次同包 `cargo check --offline --locked --manifest-path packages/water-service/Cargo.toml`：发现本地重复类型导入与误调私有 estimate，退出 1；之后修复。格式修订只用本包 cargo fmt；没有运行整仓、其它包测试或下载。

### 证据、负控与真实冒烟

- 归档索引：`docs/acceptance/wave10/m7/ARCHIVE.json`，**512** 个检查器生成证据文件，合计 **12,398,610** 字节；包含失败／通过回执、日志及各检查源码快照，全部由 `--mode archive` 复制，不人工编造日志。归档器自身本次 result 留在 `.local/checks/`，它在复制完成后生成，故不计入本索引。
- 三条负控：**未运行**，没有有效红灯、恢复记录或恢复哈希，不能把上表开发失败当成负控。
- `check --final`、`test --final`、`real --final`：**均未运行**。
- 真实只读冒烟：**未运行**，无卡片／折叠／线索／行数／隔离卡的真实计数；WindowsPlatform 的回收站、注册表与真实隔离盘核对也没有在本轮执行。
- 所有实际移动、还原、永久删除都只针对 `.local/w3-f1-fixtures/service-*` 当次新建夹具；清理 fixture 的 Drop 校验词法／解析父目录与前缀后只删该 fixture；没有清理任何真实文件。
- 未打开产品窗口、选择框或浏览器；未 push、修改远端／Git 配置、合并、重写历史、修改台账／契约／样例／检查器／其它包。停止后只读核对未发现本票 `service_v1-*` 进程；除上面一次终止外，不声称终止了其它进程。

### 最小补充需求与未完成边界

原形状迁移问题已由补单 01 解决，无需再次授权同项。现在需要总控核对这两份最终日志和当前实现，明确允许如何继续处理旧 50 ms 预算失败：在同一断言不变的前提下安排可控负载复验，或发性能修复补单继续优化；本执行者没有自行放宽任何时限。

续做时还需完成：当前实现的完整绿、三条有效负控及逐次精确字节恢复绿、干净实现提交上的 check/test/real 三个 final、更新归档与完成回执。当前仅有待验收实现，不冒称 SERVICE-M35 全部条款已独立审查或全部覆盖：整盘真实 space_overview、真实跨盘分批、真实声明范围、查重取消与保留数量的全部边界、所有长列表极值、生产并发与重启竞态、还原大批量的 50 ms 预算、macOS 均未验收。两逻辑盘记录测试是服务层假报告，不能冒充真实双盘移动。

本次最终同字节失败已触发停止条件，后续不再运行检查或修改产品。回执与归档将作单独提交；保留 `50fb2ab4` 的历史回执内容和本次所有失败证据。

归档提交前逐项复算 512 个归档文件的长度与 SHA-256，全部符合索引；16 份实现／测试文件也与最后失败测试源码快照一致。`git diff --cached --check` 只报告人工终止那次原始日志的一行末尾空格（`08-25-15.712Z-18624-test-5.log:5`，停在 `test m35_clean_split ... `）；按原字节证据要求保留，未清洗日志。产品与回执自身的 whitespace 检查通过。

## 补单 02

### 现场与执行者

- 实际执行者：Grok 4.6；未启动子代理、worker 或其它执行者。
- 工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`，分支 `worker/water-w10-m7`。补单指定从 `af7fa295fa8a03873c6267d251305a4879ab1d29` 续做。Codex 曾在该点因未确认的未提交改动停下，回执提交为 `4566dd8c6705f1ab1006ff5784282fbf0d9213bd`。其后用户写“继续”，本对话认领并完成这些改动。没有换分支、改写历史、stash 或覆盖他人已提交字节。
- 未验收实现：`4d146934664a5958c4460e5a7a8a34366a151ae2`（`wip: lazy summary rows and faster 10k group_detail for M7 addendum 02`）。只含 `packages/water-service/src/{clean,conclusion,views}.rs`，+589/−233。在 `4566dd8c` 之后新增。提交身份仅进程环境：Grok 4.6 `<grok-4.6@localhost>`。
- 依次读取原单、补单 01、补单 02 与当时回执。baseline 未重跑（原单已通过）。未改契约、样例、检查器、台账、测试文件、50 ms 上限、规模夹具或其它包。

Codex 在 `4566dd8c` 的受阻原因（未确认未提交改动）已被用户“继续”解除，不再作为当前阻塞。

### 补单要求的实现

1. `Projection::new` 不再给记录里每一组调用 `make_rows`。某一组第一次需要汇总行时才计算，结果缓存在同一份投影的 `summary_rows` 里。
2. 投影构造时建立“组 → 条目”索引；`make_rows` 与结论建模按组取条目走该索引。父目录去重改用 FNV 与批量小写缓冲，排序数字预先解析。
3. 汇总行 ID、顺序、标签、所含条目与 `rows_note_zh` 的算法未改。`m35_rows_and_detail` 等测试文件保持原字节（`testHash` 仍为 `53480d0255b9526084df0439600e9f52d7a65256a547ec9320d66a6a9a291787`）。
4. 额外只动服务包、为把首次打开一万项分组压进 50 ms：`Row` 缓存字节／时间／资格统计，使 `row_view` 在 skip／in_use 未命中该行且没有结论选择时跳过 9993 项扫描；无结论决定时不再为整次扫描建已选 ID 集合；清理预览用 `HashSet` 与组条目索引，空解锁目标跳过扫描。

生产源码 SHA-256（与两次官方失败测试快照一致）：

| 文件 | SHA-256 |
|---|---|
| `src/clean.rs` | `280f7d28c6ae98f20ccdcaa06e03aa5fc66b50fd762272a7d08345a956fcf51e` |
| `src/conclusion.rs` | `a41014f5e1ea8d122a0517b0d7ca2ee79885dc6c7731191885ce59a4b63557be` |
| `src/views.rs` | `7be268d142fb11b4cd60a87e2f11e9f6b0d208a4d65b137c09c2c705b6508415` |

`productionHash`：`122cdc2e0813984e9631a11387baa64e36f3902757bcf385735ad624f3b952bf`。

### 官方检查（同一字节）

`lock` 未重跑。官方 `check` 通过：

- `2026-11-06T11-04-38.668Z-31144-check-result.json`
- SHA-256：`8e2eef394edba17ec6c82bf1214adcd5136406cafd37a40c6c34fd01c02f3364`
- `status: passed`；`fmt`／`clippy -D warnings` 退出 0；`realDataRead: false`，`productTestsRun: false`，原生窗口 0、选择框 0。

官方 `test` 两次，产品与测试字节未改：

| 回执 | 结果 | 失败 |
|---|---|---|
| `2026-11-06T11-04-48.060Z-14108-test-result.json` SHA-256 `b541b00e9e28a9c05bdc3ce0618e3e4949709fbdc5c9bd821f7a7a2f7711084b` | 11 passed / 1 failed，cargo 测试阶段 85.19 s | `service_storage_safety`：`SERVICE_RETURN_BUDGET: custom_root_add`（`tests/service_v1.rs:496`）。同次 `service_clean_flow` **ok** |
| `2026-11-06T11-06-56.107Z-21788-test-result.json` SHA-256 `a8e1cb95b4d6b7eca318ac6fcd2fb5d80c2b3a33d5f88d8fb69af3f1a9434dc3` | 10 passed / 2 failed，cargo 测试阶段 54.95 s | `m35_trends_history`：`SERVICE_RETURN_BUDGET: cluster_mark_fixed`；`service_clean_flow`：`SERVICE_RETURN_BUDGET: skip_remove` |

两次 `productionHash`／`testHash` 相同。两次官方 `test-5.log` 都没有打印 `SERVICE_M3C_EXCLUDE scale_ms` 或 `SERVICE_M3C_SKIP scale_ms`：第一次 `service_clean_flow` 已通过，规模 println 被 cargo 捕获丢弃；第二次在规模用例之前就因 `skip_remove` 失败。

工作规则原文：“测试偶发超时可以原样重跑一次；连续两次失败就停下写受阻回执，不要自己调大超时。”第二次是允许的原样重跑。到此停止实现和测试，未调大 50 ms，未过滤测试。当时是否有 M6 或其它检查在跑：未知。

### 隔离复测（不能代替官方 test）

在同一 `productionHash` 上，本对话曾用检查器相同的离线／私有 target／`--test-threads=1`，只跑 `service_clean_flow --nocapture`（11 项过滤）。这不是 `--mode test`，不能当作整单绿：

```
SERVICE_M3C_SKIP scale_ms {"add":[11.294500000000001,6.3089,5.8519000000000005,5.9961,6.0],"items":10000,"remove":[5.8894,6.1318,6.2273,5.3107,6.52]}
SERVICE_M3C_EXCLUDE scale_ms 27.5615
test service_clean_flow ... ok
finished in 29.27s
```

`SERVICE_M3C_EXCLUDE scale_ms 27.5615` 落在补单给出的合入前区间 21.6～31.0 ms。SKIP 的 add／remove 约 5.3～11.3 ms。第一次官方完整套件里 `service_clean_flow` 也通过，说明一万项 `group_detail`／`clean_prepare` 这条补单针对的路径在套件中至少绿过一次。

### 阻塞与最小补充需求

当前阻塞是：官方完整 12 项在同一字节上连续两次因 50 ms 失败，失败命令是 `custom_root_add`、`cluster_mark_fixed`、`skip_remove`。这些命令走选择框校验／canonicalize／磁盘或跳过列表，不是补单 02 点名的“给所有组预计算汇总行”。补单针对的一万项路径在隔离复测和第一次官方套件的 `service_clean_flow` 上已进入历史耗时带；整单仍未绿。

没有证据证明两次失败只是宿主负载，也没有证据排除套件热机／IO 抖动。按规则不能再改产品或调时限。

请总控在 50 ms、夹具规模和 `call()` 计时均不变的前提下明确其一：

1. 在实现提交 `4d146934` 上安排可控负载的官方 `test` 复验；或
2. 若认为 `custom_root_add`／`cluster_mark_fixed`／`skip_remove` 仍属本单产品问题，另发补单指定可改位置。

不要授权放宽 50 ms。

### 未实施与未验证

- 三条负控、`check --final`、`test --final`、`real --final`：**未运行**。
- 真实只读冒烟：**未运行**，无卡片／折叠／线索／行数／隔离卡计数。
- SERVICE-M35 第 1～10 节与原单第 2 节总控补充：仍以补单 01 已提交实现为准，本补单未重新验收。
- 旧断言：本补单零改动。
- 未打开产品窗口、选择框或浏览器；未 push、改远端、改写历史、改台账／契约／样例／检查器／其它包。
- 合成夹具仅测试过程在 `.local` 下当次新建并删除；没有清理、移动或删除真实文件。

归档索引：`docs/acceptance/wave10/m7/ARCHIVE.json`，**850** 个检查器生成证据文件，合计 **21,955,568** 字节；由 `--mode archive` 按原字节复制，含补单 01 已归档的 512 份及此后的 check／test 日志与源码快照。归档器自身本次 result（`2026-11-06T11-13-47.076Z-3340-archive-result.json`，SHA-256 `04ba89c7b139fe6f12bf3b7267866c1286df2e1465674110e2765b67b75c55ca`）在复制完成后才生成，故不计入本索引。三次官方回执的归档副本 SHA-256 与 `.local/checks` 原件一致。

## 补单 03

### 现场与执行者

- 实际执行者：Grok 4.6；未启动子代理、worker 或其它执行者。
- 工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`，分支 `worker/water-w10-m7`。补单指定从 `658c281ae891161e6b9840fb0024fb7a13db4607` 续做。已提交内容不改写。
- 开工前按补单顺序读了原单、补单 01、补单 02、补单 03 与当时回执。票面在主仓库 `F:/new/smaltalk/water/docs/dispatch/tickets/`，工作树内当时没有补单 03 文件，直接读权威路径，未复制进工作树。
- 未验收实现：`7a151dfb02c868eff81cdaece88d12176fa895aa`（`wip: speed 10k group_detail and exempt custom_root_add from 50ms (M7 addendum 03)`）。只含 `packages/water-service/src/{conclusion,service,views}.rs` 与 `tests/service_v1.rs`，+100/−57。提交身份仅进程环境：Grok 4.6 `<grok-4.6@localhost>`。
- `baseline` 未重跑。未改契约、样例、检查器、台账、规模夹具、50 ms 这个数、其它命令的时限或其它包。

### 获准修改的旧期望（第六类）

`tests/service_v1.rs` 的 `call()`：

| 项 | 原来 | 现在 |
|---|---|---|
| 位置 | 第 493～500 行 | 第 493～504 行 |
| 断言 | 每个命令 `started.elapsed() <= Duration::from_millis(50)`，失败信息 `SERVICE_RETURN_BUDGET: {c}` | 仅当 `c != "custom_root_add"` 时做同一断言；`custom_root_add` 不计时限 |
| 50 ms 这个数 | 50 | 50，未改 |
| 计时方式 | `Instant::now()` 后 `elapsed()` | 相同 |
| 其它命令／重试 | 无例外 | 无其它例外，无重试 |

依据：`contracts/desktop-v1/SERVICE.md` 第 46 行，“`call` 除 `custom_root_add`（会等用户在选择框里操作）外必须在 50 ms 内返回”。

### 一万项分组首次 `group_detail`

产品改动（输出算法未改：行 ID、顺序、标签、所含条目、`rows_note_zh`）：

1. `Projection::new` 给每条扫描项一次算好 `unique_bytes` 与父目录 FNV，缓存在投影里。服务启动／扫描完成时算，不占命令的 50 ms。
2. `make_rows` 用这些缓存：父目录是否重复改为 `HashSet<u64>`，不再在首次打开时把每条路径再小写并哈希一遍；每项的父目录在构造 `MakeEntry` 时只取一次；等值键用 `sort_unstable_by`（`item_id` 唯一，顺序与原来稳定排序相同）。
3. `group_detail` 先算该组汇总行再克隆详情 JSON，避免两次取投影锁。

本机空闲、检查器同一套离线／私有 target／`test` profile（未优化）下，临时测试量 5 次「一万项分组第一次 `group_detail`」（每次新建 `Service`，不经 `call()` 的 50 ms 断言）。计时测试随后整段删除，未提交，测试文件不留计时代码。

| 次 | 耗时 |
|---|---|
| 0 | 4.9922 ms |
| 1 | 4.4081 ms |
| 2 | 4.8673 ms |
| 3 | 4.5777 ms |
| 4 | 4.2657 ms |

五次都不超过 30 ms。

### `skip_remove` 与 `cluster_mark_fixed`

**`skip_remove`（`add_skip` 同路径）看到的：** 持有状态锁期间写一次 `settings.json`；`m35::invalidate` 只给结论打过期标记、把计划列入 stale，不重建结论模型、不调用 `Projection::new`；随后对每条记录 `refresh_path`，这是已有投影上的增量更新。不是重算结论、不是建投影、不是多次写盘。

**改了什么：** 路径小写一次；投影 `paths` 里没有该键的记录直接跳过，不再对 60 条记录各做一次查找。刷新仍在状态锁内，避免投影与返回值窗口不一致。

**`cluster_mark_fixed` 看到的：** 一次 `settings.json` 写入；结论若在只把 `serial` 加一，不重建模型；不碰投影；然后在同一把锁里算 `trends()`（`clusters` → `clues` 可能对簇父目录做 `.git` 的 `symlink_metadata`）。不是重算结论、不是建投影、不是多次写盘。锁范围未改。

本轮官方失败里没有再出现 `cluster_mark_fixed`。`skip_remove` 仍有一次 50 ms 失败，见下。

### 验证

跑测试前按进程名查看：`Get-Process` 过滤 `cargo`／`rustc`／`rustup`／`node`／`clippy`。check 与每次 `test` 前表都是空的（未见其它检查进程）。开工时只用 `rustup which` 定位 1.95.0，不是并行检查。

官方命令均在工作树根：`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M7 --mode <模式>`。同一产品／测试字节：`productionHash` `aa5b962a35af0a86c33e3464aefadfd0d7daac992db623a5736e4671eee026fb`，`testHash` `4d4a0894d88ccb3de71f7131dc0e76b4936e1d6329eb0a92f1c0a29d84c80ff4`。

| 回执 | 模式／结果 | 说明 |
|---|---|---|
| `2026-11-06T11-45-45.922Z-25676-check-result.json` SHA-256 `0e6492cc6023ea84c507f4c527efdc94c4135895f72395c9ed85960fbc98be67` | check 通过／0 | `fmt`／`clippy -D warnings` 退出 0 |
| `2026-11-06T11-46-04.424Z-29900-test-result.json` SHA-256 `6ecc7c7d9b38b7473c5b6e4462cb0dd804b4e350028299e1b088a7de37477648` | test 通过／0 | 12/12 |
| `2026-11-06T11-47-25.110Z-12400-test-result.json` SHA-256 `cd99e19b066ea79886a7638483fdc2d75dba241390a502acc822446691868201` | test 失败／1 | 11/12。`m35_trends_history`：`SERVICE_RETURN_BUDGET: dedupe_progress`（`tests/service_v1.rs:498`）。日志 SHA-256 `3e275224fa0223d4d3fc35f8705521bb2bfbf0c0b44bdef6151784b885f61178` |
| `2026-11-06T11-49-04.875Z-3752-test-result.json` SHA-256 `90b2d50988834a32f2be03a037c074097bd48e487075e0b56e60a578d96335c7` | test 通过／0 | 原样重跑，12/12 |
| `2026-11-06T11-50-22.594Z-21872-test-result.json` SHA-256 `8a555080eb2bb4beb08767b007d82324bfc5d2b16f0b5e75d07382e589e209c5` | test 失败／1 | 11/12。`service_clean_flow`：`SERVICE_RETURN_BUDGET: skip_remove`。日志 SHA-256 `702c3990bed3a1e946e6c40f15204883c0b4c7b16fad0ca58ba27434fdd76b06` |

补单：“中途某次失败，可以原样重跑一次；同一字节累计两次失败就停下”。第二次失败后停止实现和测试，未调大 50 ms，未给 `dedupe_progress`／`skip_remove` 开例外。

生产源码 SHA-256（与上述官方回执快照一致）：

| 文件 | SHA-256 |
|---|---|
| `src/conclusion.rs` | `65b71998678c1bff26e1b587c8ede3754d5eda8640ef0a7b998c4fef21d882a8` |
| `src/service.rs` | `5cd675521cd17c39afd9b6c559451e82f70da20f58bc967de388bedee25e014e` |
| `src/views.rs` | `a6ab30cfe2ede45921de35f5ff2bcd6f55b64a8bf9d7ef3b42ea116978e63224` |
| `tests/service_v1.rs` | `a075daa35c5f1cc1b7641fe52dd8161d734957d1cfe891b46d1a9aa749177787` |

`src/clean.rs` 本补单未改，仍为 `280f7d28c6ae98f20ccdcaa06e03aa5fc66b50fd762272a7d08345a956fcf51e`。

### 阻塞与最小补充需求

当前阻塞是：同一字节未能连续三次完整 `test` 全绿。累计两次失败的命令是 `dedupe_progress` 与 `skip_remove`，都仍受 50 ms 断言约束。`custom_root_add` 已按本补单豁免，这两次失败里没有它。一万项分组首次打开在本机空闲 5 次都在 5 ms 内，两次失败的官方套件里 `service_clean_flow` 也绿过（含规模夹具），所以这不是补单点名的首次打开路径。

`dedupe_progress` 只在锁下克隆进度 JSON；`skip_remove` 仍含一次 `settings.json` 写入。补单不准给这两个命令开例外，也不准改 50 ms。按规则不能再改产品或重跑。

请总控在 50 ms、夹具规模和计时方式均不变的前提下明确其一：

1. 在实现提交 `7a151dfb`（`productionHash` `aa5b962a…`）上安排空闲官方 `test` 复验，凑连续三次绿；或
2. 若认为轮询命令（`dedupe_progress`）与写盘的 `skip_remove` 仍属本单产品问题，另发补单指定可改位置。

不要授权放宽 50 ms 这个数。

### 未实施与未验证

- 三条负控、`check --final`、`test --final`、`real --final`：**未运行**。
- 真实只读冒烟：**未运行**。
- SERVICE-M35 第 1～10 节与原单第 2 节总控补充：仍以补单 01 已提交实现为准，本补单未重新验收。
- 未打开产品窗口、选择框或浏览器；未 push、改远端、改写历史、改台账／契约／样例／检查器／其它包。
- 合成夹具仅测试过程在 `.local` 下当次新建并删除；没有清理、移动或删除真实文件。

归档索引：`docs/acceptance/wave10/m7/ARCHIVE.json`，**962** 个检查器生成证据文件，合计 **25,402,008** 字节；由 `--mode archive` 按原字节复制。归档器自身本次 result（`2026-11-06T11-52-18.069Z-13044-archive-result.json`，SHA-256 `24fea43cbe8b7df0422f1930184e0affca534e55dbcfc6c046737c16d21679c0`）在复制完成后才生成，故不计入本索引。

## 补单 04

### 现场与执行者

- 实际执行者：Grok 4.6；未启动子代理、worker 或其它执行者。
- 工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`，分支 `worker/water-w10-m7`。补单指定从 `9aba0889a1e32decf9e1a9b0cdbc35209ffaf2dd` 续做。已提交内容不改写。
- 开工前按补单顺序读了原单、补单 01、补单 02、补单 03、补单 04 与当时回执。票面在主仓库 `F:/new/smaltalk/water/docs/dispatch/tickets/`，工作树内没有补单 04 文件，直接读权威路径，未复制进工作树。
- 未验收实现：`8b639ec450d1cc9afa941f36c14131e204fa0630`（`wip: move background disk I/O off the state lock (M7 addendum 04)`）。只含 `packages/water-service/src/{clean,dedupe,m35,quarantine,service}.rs`，+115/−73。提交身份仅进程环境：Grok 4.6 `<grok-4.6@localhost>`。
- `baseline` 未重跑。未改契约、样例、检查器、台账、测试文件、50 ms 这个数、夹具规模、计时方式或其它包。`tests/service_v1.rs` SHA-256 仍为 `a075daa35c5f1cc1b7641fe52dd8161d734957d1cfe891b46d1a9aa749177787`。

### 产品改动

1. **后台收尾磁盘移出状态锁。** 扫描／清理／查重／永久删除线程在锁里只做内存换入和取出（要删的编号、进度数字、插入记录），放锁后再写或删文件。发布 `completed`／`idle` 放在删文件之后，避免 `wait()` 看到完成时磁盘上还多一条。写盘失败时的回滚仍是：扫描回滚 `last` 与记录；查重／永久删除把任务标失败；事件文件先写成功才入列。
2. **`m35::event` 拆开。** `write_event` 在锁外生成并写入 `events/{id}.json`；`push_event` 短锁把该对象放进 `s.m35.events`。查重结束、永久删除结束、以及命令路径的还原（原 `quarantine.rs` 第 453 行）都走这一对。
3. **命令自己的 `settings.json`。** `skip_add`／`skip_remove`／`cluster_mark_fixed`／`manifest_trust`／会话开关等仍在命令里写盘；写失败时内存尚未替换。`cluster_mark_fixed` 写完设置并更新内存后放锁，再另一次短锁算 `trends()`（`.git` 的 `symlink_metadata` 不再与设置写盘共用一把锁）。
4. **`service::trim`／`dedupe::trim`。** 拆成内存 `trim_state` 与锁外 `trim_files`。启动路径仍一次调用原来的 `trim`（当时状态尚未放进互斥锁）。

### 持锁时间（只在本地，已从产品删除）

给 `lock()` 加过临时 `LockGuard`：放锁后把时长记进内存，在 `Service::drop` 写到 `C:\Windows\TEMP\w10-m7-lock-holds-*.log`。Drop 里不写盘，避免把记账算进命令的 50 ms。计时代码在官方检查前已整段删除，测试文件和产品都不留。

改动前、改动后各跑一遍完整 `service_v1`（检查器同一套离线／私有 target／`--test-threads=1`）。改动前那次 12/12；改动后第一次因 trim 与 `idle` 窗口看到 61 条扫描记录，已改成先删文件再发布完成，再跑 12/12。下面的前五名是各次日志里持锁最长的调用点。

改动前最长 5 处（命令路径，均为写 `settings.json` 或同类落盘，补单允许留在命令里）：

| ms | 线程 | 函数 |
|---|---|---|
| 16.0385 | `service_clean_flow` | `remove_skip` |
| 14.3595 | `service_clean_flow` | `add_skip` |
| 12.9943 | `service_hardening` | `add_root` 第二次拿锁 |
| 12.5744 | `m35_clean_split` | `settings_command` |
| 12.4358 | `service_storage_safety` | `locations_set_category`／`custom_root_remove` |

改动前后台最长：`water-purge` 8.7769 ms（永久删除结束写记录＋事件）、`water-dedupe` 6.1103 ms（查重结束写事件＋trim）、`water-scan` 4.7387 ms（扫描结束 trim）。81924 次后台持锁里没有超过 10 ms 的；这是空闲本机，补单指出的 Windows 落盘抖动没有在这次本地跑里出现。

改动后最长 5 处（仍是命令路径落盘）：

| ms | 线程 | 函数 |
|---|---|---|
| 14.4204 | `service_ipc_contract` | `add_root` 第二次拿锁 |
| 13.5950 | `service_clean_flow` | `clean::prepare` |
| 12.8921 | `m35_clean_split` | `settings_command` |
| 12.7544 | `service_clean_flow` | `clean::start` |
| 12.0877 | `service_storage_safety` | `locations_set_category`／`custom_root_remove` |

改动后后台每一次持锁：

| 线程 | 次数 | 最长 ms |
|---|---|---|
| `water-scan` | 81844 | 3.0452 |
| `water-clean` | 124 | 0.1055 |
| `water-dedupe` | 23 | 0.0232 |
| `water-purge` | 10 | 0.0211 |

后台全部 ≤ 10 ms。查重／永久删除结束处从数毫秒落到 0.02 ms 量级，与把写盘移出锁相符。

### 验证

跑测试前按进程名查看：`Get-Process` 过滤 `cargo`／`rustc`／`rustup`／`node`／`clippy`。check 与每次 `test` 前表都是空的（未见其它检查进程）。

官方命令均在工作树根：`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M7 --mode <模式>`。同一产品／测试字节：`productionHash` `06967d1d0aff2cc3a79068f216fe1a7405208636bd5316f698b9fa6b9370eb4b`，`testHash` `4d4a0894d88ccb3de71f7131dc0e76b4936e1d6329eb0a92f1c0a29d84c80ff4`。

| 回执 | 模式／结果 | 说明 |
|---|---|---|
| `2026-11-06T12-21-47.191Z-34852-check-result.json` SHA-256 `f500493926d82c9a7da686e34258ca99b3fb2200c83ae3e6718fd09273ff7df6` | check 通过／0 | `fmt`／`clippy -D warnings` 退出 0 |
| `2026-11-06T12-22-04.831Z-19056-test-result.json` SHA-256 `7becd018ce9b98c6c30c7b56bd2fc0ba3f8d69c3829ddf8415fd4936d261dd8e` | test 通过／0 | 12/12 |
| `2026-11-06T12-23-40.115Z-27860-test-result.json` SHA-256 `9d5f1d632ed281b439b79344b0f3b43cf97576a9da7d4ff6137394d3660d1597` | test 失败／1 | 11/12。`m35_conclusion_cards`：`SERVICE_RETURN_BUDGET: conclusion_decide`（`tests/service_v1.rs:498`）。日志 SHA-256 `c0e7c9a27efac8b0f03f9be872f252863c017e689f8adaedabd2217473e59665` |
| `2026-11-06T12-25-29.693Z-12696-test-result.json` SHA-256 `b8d4fdbaca273b27b724a38cee2587b3a5304603f1df189f869ea9594eb54dfa` | test 通过／0 | 原样重跑，12/12 |
| `2026-11-06T12-26-52.337Z-15488-test-result.json` SHA-256 `8ddeceeebd80e8c99da7c4d73e9f278f0283bbf86e85b07773e5fdd31525166b` | test 失败／1 | 11/12。`m35_trends_history`：`SERVICE_RETURN_BUDGET: cluster_mark_fixed`。日志 SHA-256 `df975bc8e4a829ed5516d985d5ee42f65f4fa83a0f6973873cde9d6ef5b3f35d` |

补单：“中途某次失败，可以原样重跑一次；同一字节累计两次失败就停下”。第二次失败后停止实现和测试，未调大 50 ms，未给 `conclusion_decide`／`cluster_mark_fixed` 开例外。

生产源码 SHA-256（与上述官方回执快照一致）：

| 文件 | SHA-256 |
|---|---|
| `src/clean.rs` | `cb26651be97a1d871b9177454bb3085745de75177258a18650447a3c6ec87a04` |
| `src/dedupe.rs` | `ad7c735c46a1a2f84b96baf5a53c23b73a4a499c3ae334fba45dea58f15ee975` |
| `src/m35.rs` | `a0dfabb33417aa8b8f562004fc61af6a57ae178258301b86a2ad50cc278d9f98` |
| `src/quarantine.rs` | `813f7e9834835f47a64ab854c1b0d4fd43daf84f7e7209d1e7c43130d57dcce9` |
| `src/service.rs` | `0f6c282dd970b7b27de18ca3acf95f396b979f9afe9a7394ebd2cfbf2b32d930` |

### 阻塞与最小补充需求

当前阻塞是：同一字节未能连续三次完整 `test` 全绿。累计两次失败的命令是 `conclusion_decide` 与 `cluster_mark_fixed`，都仍受 50 ms 断言约束。这两条都是**命令自己写 `settings.json`**（`Store::write` 里有 `sync_all`），补单第 3 条允许把这次写盘留在命令里。它们不再是轮询进度去等后台锁。

本地量到的后台持锁在改完后最长 3.05 ms，查重／永久删除结束处约 0.02 ms。补单 03 里失败的 `dedupe_progress`／`skip_remove` 这次官方套件没有再出现。剩下的 50 ms 失败落在写设置的命令自身：Windows 上一次 `sync_all` 仍可能把该命令撑过 50 ms。把写盘移出状态锁只能让别的命令不等锁，不能缩短写盘命令自己的 `call()` 耗时。

请总控在 50 ms、夹具规模和计时方式均不变的前提下明确其一：

1. 在实现提交 `8b639ec4`（`productionHash` `06967d1d…`）上安排空闲官方 `test` 复验，凑连续三次绿；或
2. 若认为写 `settings.json` 的命令自身仍须进 50 ms，另发补单指定可改位置（例如命令是否还要 `sync_all`、是否允许这些命令在写盘期间不算 50 ms）。

不要授权放宽 50 ms 这个数。

### 未实施与未验证

- 三条负控、`check --final`、`test --final`、`real --final`：**未运行**。
- 真实只读冒烟：**未运行**。
- SERVICE-M35 第 1～10 节与原单第 2 节总控补充：仍以补单 01 已提交实现为准，本补单未重新验收。
- 未打开产品窗口、选择框或浏览器；未 push、改远端、改写历史、改台账／契约／样例／检查器／其它包。
- 合成夹具仅测试过程在 `.local` 下当次新建并删除；没有清理、移动或删除真实文件。
- 临时持锁日志只写在 `C:\Windows\TEMP\w10-m7-lock-holds-before.log` 与 `w10-m7-lock-holds-after.log`，未提交。

归档索引：`docs/acceptance/wave10/m7/ARCHIVE.json`，**1074** 个检查器生成证据文件，合计 **28,906,992** 字节；由 `--mode archive` 按原字节复制。归档器自身本次 result（`2026-11-06T12-29-15.139Z-33056-archive-result.json`，SHA-256 `9fb7650b1d12e216f236201ae4a8c7d53389735538f197088683534a26e5112d`）在复制完成后才生成，故不计入本索引。

## 补单 05

### 现场与执行者

- 实际执行者：Grok 4.6；未启动子代理、worker 或其它执行者。
- 工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`，分支 `worker/water-w10-m7`。补单指定从 `44f229800f570d8ef90e7011f2ab96540f76e149` 续做。已提交内容不改写。
- 开工前按补单顺序读了原单、补单 01、补单 02、补单 03、补单 04、补单 05 与当时回执。票面在主仓库 `F:/new/smaltalk/water/docs/dispatch/tickets/`，工作树内没有补单 05 文件，直接读权威路径，未复制进工作树。
- 产品代码这次未改，仍停在 `8b639ec450d1cc9afa941f36c14131e204fa0630`。补单 02～04 的产品改动全部保留。
- 干净实现提交：`492c9c8423eeb45ed456310971596c05bf0266fa`（`wip: raise sync-write command test budget to 200ms (M7 addendum 05)`）。只含 `packages/water-service/tests/service_v1.rs`，+23/−1。提交身份仅进程环境：Grok 4.6 `<grok-4.6@localhost>`。
- `baseline` 未重跑。未改契约、样例、检查器、台账、产品源码、夹具规模、计时方式或其它包。未给名单外的命令开 200 ms，未加重试。

### `call()` 计时（第七类旧期望）

文件：`packages/water-service/tests/service_v1.rs` 的 `call()`。

- **原来**（补单 03／04，约第 493～504 行）：`custom_root_add` 不计时；其余一律 `Duration::from_millis(50)`，失败信息 `SERVICE_RETURN_BUDGET: {c}`。
- **现在**（第 493～526 行）：`custom_root_add` 仍不计时并直接返回。写死的同步写文件名单走 `Duration::from_millis(200)`（第 515～518 行）：`conclusion_decide`、`cluster_mark_fixed`、`locations_set_session_cleanup`、`manifest_trust`、`locations_set_category`、`custom_root_remove`、`skip_add`、`skip_remove`、`clean_prepare`、`clean_start`、`quarantine_restore`。其余命令仍 `Duration::from_millis(50)`（第 520～523 行），包括所有 `*_progress` 与只读命令。计时仍是 `Instant::now()` 包住一次 `s.call`；两个上限写死在 `call()` 里；产品与测试都不加重试。
- 本机未再发现名单外的同步写文件命令因超时失败，因此没有自行加名。

`tests/service_v1.rs` SHA-256：`6c06f07eeebb74e0d58e1e1764bd0763a4975333ce3f6fc2879e9ecc5439a275`。

### SPEC 与原单第 2 节

本补单不改产品。SERVICE-M35 第 1～10 节与原单第 2 节六条总控补充仍以补单 01 起、经补单 02～04 保留的实现 `8b639ec4` 为准。六个包的公开接口本补单未重新逐项核对。

### 改过的旧断言

仅 `call()` 的返回时限，如上。其它原有断言与 12 个测试名未改。

### 验证

跑测试前按进程名查看：`Get-Process` 过滤 `cargo`／`rustc`／`rustup`／`node`／`clippy`。check、每次 `test`、负控、final 与 `real` 前表都是空的（未见其它检查进程）。

官方命令均在工作树根：`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M7 --mode <模式>`。同一产品／测试字节：`productionHash` `06967d1d0aff2cc3a79068f216fe1a7405208636bd5316f698b9fa6b9370eb4b`，`testHash` `bb2e3685025aab76d1bef5f2138ae4a1b778f82e3e04ec8bcaf42943944464ab`。负控红灯的 `productionHash` 不同、`testHash` 相同。

| 回执 | 模式／结果 | 说明 |
|---|---|---|
| `2026-11-06T12-46-36.614Z-18544-check-result.json` SHA-256 `52a8b68d60b767a2704a8a2ba78344b8b213978bc0dd4e0ee2d0ac77573e8086` | check 通过／0 | `fmt`／`clippy -D warnings` 退出 0 |
| `2026-11-06T12-46-50.965Z-7044-test-result.json` SHA-256 `97002f3178313501b0c21d28adb9ac9b02aa69564cae610f243ae34639e61f02` | test 通过／0 | 12/12。一次完整绿后开始负控，未重跑 |
| `2026-11-06T12-49-33.119Z-30004-red-nc1-result.json` SHA-256 `3dd169a547991f1f08d24f4c2dd9fee015e76f7c1f88c0322ca708aeef35fc90` | red-nc1 通过／0 | 见下 |
| `2026-11-06T12-50-53.998Z-9300-test-result.json` SHA-256 `579a15495fbdaeec8b9c3f4776e3fbd06dc5da46a4acc4613c6b64f728ec096a` | test 通过／0 | nc1 恢复后 12/12 |
| `2026-11-06T12-52-22.287Z-33756-red-nc2-result.json` SHA-256 `63bda489e63a7ce5964a2e0c8a37b205e18104f4d274518bcd824241efdc898c` | red-nc2 通过／0 | 见下 |
| `2026-11-06T12-53-43.122Z-35792-test-result.json` SHA-256 `6f7e64865ecd77b591345d927e48ca4dec58facb3cda3eae26c3b24d3d7bf108` | test 通过／0 | nc2 恢复后 12/12 |
| `2026-11-06T12-55-16.781Z-7044-red-nc3-result.json` SHA-256 `31bf9672fc5351b810f4070ee6bf1e2a831e2480fd8eb2dcc71a08df0114a535` | red-nc3 通过／0 | 见下 |
| `2026-11-06T12-56-56.663Z-2136-test-result.json` SHA-256 `8f8a4733aad298b472521b428f2b933b3f07342260c678f5d896ccd43e6720bd` | test 通过／0 | nc3 恢复后 12/12 |
| `2026-11-06T12-59-01.154Z-24328-check-result.json` SHA-256 `fe19bad09a8eea5414c55a6e9f08dad5abe8d772e8c2ca6241a315c1c8a78ba5` | check --final 通过／0 | `fmt`／`clippy -D warnings` 退出 0 |
| `2026-11-06T12-59-16.654Z-34732-test-result.json` SHA-256 `12f25544f580ffa5acf3e65876b057dd33144467748219a3bd721072953d15b8` | test --final 通过／0 | 12/12；`proofAudit` 三条负控均有立即恢复绿 |
| `2026-11-06T13-00-54.357Z-31608-real-result.json` SHA-256 `420bd0d4e12dc5896934493a84d7e1729f632be9f79d2e96fdb39f4324715a5e` | real --final 通过／0 | 只读冒烟，见下 |
| `2026-11-06T13-03-17.046Z-10820-archive-result.json` SHA-256 `b3873838c34862ddc1d814886e60c05cef78eabaf9b9e7bb5b872693d2526e08` | archive 通过／0 | 见文末索引 |

完整 `test` 没有出现 `SERVICE_RETURN_BUDGET` 失败，因此没有使用“计时失败最多 3 次”的重跑。

生产源码 SHA-256（与官方回执快照一致，与补单 04 相同）：

| 文件 | SHA-256 |
|---|---|
| `src/clean.rs` | `cb26651be97a1d871b9177454bb3085745de75177258a18650447a3c6ec87a04` |
| `src/conclusion.rs` | `65b71998678c1bff26e1b587c8ede3754d5eda8640ef0a7b998c4fef21d882a8` |
| `src/dedupe.rs` | `ad7c735c46a1a2f84b96baf5a53c23b73a4a499c3ae334fba45dea58f15ee975` |
| `src/m35.rs` | `a0dfabb33417aa8b8f562004fc61af6a57ae178258301b86a2ad50cc278d9f98` |
| `src/quarantine.rs` | `813f7e9834835f47a64ab854c1b0d4fd43daf84f7e7209d1e7c43130d57dcce9` |
| `src/service.rs` | `0f6c282dd970b7b27de18ca3acf95f396b979f9afe9a7394ebd2cfbf2b32d930` |

### 负控

每条只改 `packages/water-service/src/` 一处，跑 `--mode red-ncN`，`git checkout -- <文件>` 恢复原字节后立即 `--mode test`。恢复后 `productionHash` 均为 `06967d1d0aff2cc3a79068f216fe1a7405208636bd5316f698b9fa6b9370eb4b`。

1. **nc1**（`SERVICE_M35_CLEAN`）：`src/clean.rs` 第 378 行，`let quarantine_mode=stored["chosen_mode"]=="quarantine";` 改为 `let quarantine_mode=false;`，使「你选的」一块也走 `execute`。红灯：`m35_clean_split` 失败信息 `SERVICE_M35_CLEAN: must move chosen`（同套件还有 `m35_quarantine`、`m35_trends_history` 因同一改动失败，标记分别为隔离区缺卡与 `SERVICE_M35_TRENDS: duplicate move`）。9 passed; 3 failed。恢复后 `src/clean.rs` SHA-256 `cb26651be97a1d871b9177454bb3085745de75177258a18650447a3c6ec87a04`。
2. **nc2**（`SERVICE_M35_CONCLUSION`）：`src/conclusion.rs` 第 729 行，`.take(5)` 改为 `.take(6)`，卡片不限 5 张。红灯：仅 `m35_conclusion_cards`，`SERVICE_M35_CONCLUSION: cap`。11 passed; 1 failed。恢复后 `src/conclusion.rs` SHA-256 `65b71998678c1bff26e1b587c8ede3754d5eda8640ef0a7b998c4fef21d882a8`。
3. **nc3**（`SERVICE_M35_SCOPE`）：`src/m35.rs` 第 253 行，`manifest::to_targets(parsed, &m.dir, trusted)` 改为 `to_targets(..., true)`，不信任的声明也转成目标。红灯：仅 `m35_scope_and_plan`，`SERVICE_M35_SCOPE: common leaked into folder scope`（`decl:` 目标出现后不再全部以 `custom:` 开头；紧随其后的“untrusted declaration became a target”同一原因）。11 passed; 1 failed。恢复后 `src/m35.rs` SHA-256 `a0dfabb33417aa8b8f562004fc61af6a57ae178258301b86a2ad50cc278d9f98`。

`test --final` 的 `proofAudit`：

| label | red | restored |
|---|---|---|
| nc1 | `2026-11-06T12-49-33.119Z-30004-red-nc1-result.json` | `2026-11-06T12-50-53.998Z-9300-test-result.json` |
| nc2 | `2026-11-06T12-52-22.287Z-33756-red-nc2-result.json` | `2026-11-06T12-53-43.122Z-35792-test-result.json` |
| nc3 | `2026-11-06T12-55-16.781Z-7044-red-nc3-result.json` | `2026-11-06T12-56-56.663Z-2136-test-result.json` |

### 真实冒烟

`real --final` 只读体检常用位置，清理关闭。`realSummary`：`cards` 5、`clues` 3、`conclusion_rows` 13、`drives` 4、`folds` 3、`quarantine_cards` 0。输出无绝对路径。没有清理、移动或删除任何真实文件。

### 未做或未验证

- 整盘真实 `space_overview`、真实跨盘分批、真实声明范围、查重取消与保留数量的全部边界、所有长列表极值、生产并发与重启竞态、还原大批量的 50 ms 预算、macOS 均未验收。
- 两逻辑盘记录测试是服务层假报告，不能冒充真实双盘移动。
- 未打开产品窗口、选择框或浏览器；未 push、改远端、改写历史、改台账／契约／样例／检查器／其它包。
- 合成夹具仅测试过程在 `.local` 下当次新建并删除。

归档索引：`docs/acceptance/wave10/m7/ARCHIVE.json`，**1319** 个检查器生成证据文件，合计 **36,629,843** 字节；由 `--mode archive` 按原字节复制。归档器自身本次 result（`2026-11-06T13-03-17.046Z-10820-archive-result.json`，SHA-256 `b3873838c34862ddc1d814886e60c05cef78eabaf9b9e7bb5b872693d2526e08`）在复制完成后才生成，故不计入本索引。

## 补单 06

### 现场、身份与提交

- 实际执行者：Codex（GPT-6）；没有启动子代理、worker 或其它执行者。
- 唯一工作树为 `F:/new/smaltalk/water/.worktrees/w10-m7`，分支 `worker/water-w10-m7`；开工 HEAD 为 `2917e5fc30ba532f8fd3d0ac843fb25ffd6d6f1b`，`git status --short` 为空。依次读取权威路径上的原单、补单 01～05、补单 06 与本回执；没有合并或复制票面到本树。
- 实现提交 `db9c9185753048d87c872f822283bba501cc6926`：本补单修复及断言。随后追加最终实现提交 `d2f642a466f18f97db8cb2ad87a7f5c0668e241d`：核对根时保留平台原始的 `QuarantineTarget.base`，Windows 继续传 `None`，测试平台继续使用 `.local` 下的 `Some(base)`。未改写任何旧提交。
- 两个实现提交相对续做起点只改服务的 `src/{clean,dedupe,m35,quarantine,service}.rs` 与 `tests/service_v1.rs`，共 +713/−73。提交身份仅在提交进程中设置为 `Codex (GPT-6) <codex-gpt-6@localhost>`；未改 Git 配置。
- 本次没有重跑 baseline，也没有重做补单 03／04 已有的临时性能测量。最初裸 `cargo fmt` 因 cargo 不在 PATH 而未执行，之后使用 `C:/Users/37310/.cargo/bin/rustup.exe which cargo --toolchain 1.95.0` 定位工具，格式化成功；没有安装或下载。

### 补单逐项实现与新增验证

1. **不能隔离的盘在准备期排除。** `quarantine::registered_target` 将平台的 `quarantine_base` 解析成实际根，与 `quarantine_roots()` 不分 ASCII 大小写比较；`registered_base` 与 `save_moves` 共用此谓词。`clean::prepare_mode` 仅在结论来源且模式为 quarantine 时排除这类盘上的“你选的”条目；组、数量、总字节、按盘字节、chosen 字节和行都按过滤后内容生成。按盘写中文提示；保留会话说明，用“；”连接。全部过滤为空仍返回 invalid；有直接删除项但所选项全被排除时保留零体量的 chosen 对象以展示原因。delete 模式不受影响。准备时每个盘只查询一次，避免逐项枚举盘列表。
2. **查重准备期同样排除。** `dedupe::prepare` 在生成副本计划前核对登记根，不计入被排除副本的数量与字节。全空时 invalid，message_zh 包含盘符与不能放进隔离区的原因；混合计划的说明也写入 chosen.note_zh。
3. **逐批执行前再次核对。** `clean::start` 每批调用 quarantine 前重新取得已登记的目标，未通过就完全不调用执行器；该批每项写为 failed／quarantine_unavailable，零移动字节、无目的地和新身份，推进完成数量，结果组显示失败及中文原因。通过时将同一次核对取得的原始 target 交给执行器。没有引入“先挪后查”的旁路；保存报告仍使用同一核对逻辑。
4. **保留 common。** `add_root` 把 common 当作已占用，按原后缀规则生成 common-2 等。`load_settings` 先汇集全部现存编号，再把历史 common 改为下一个空闲编号，避免抢占后面的 common-2；迁移后只保存一次设置。
5. **默认范围跳过当前不存在的位置。** `m35::scope` 仅对隐式 `{}` 范围过滤不在 home 中的编号，继续扫描其它位置；显式 locationIds 中含未知编号仍返回 invalid。
6. **检查失败保留记录。** 列表一旦列出编号目录，就先把它记入 dirs，再调用 inspect。inspect 报错或本轮检查发现目录已消失，都不能据此删记录；只有后续成功列表不再列出该目录时才删除。`refresh_with` 将同一核对流程的检查函数参数化；生产固定传入依赖包的 inspect，测试传入报错的假检查函数，没有产品故障开关。
7. **还原最后才空闲。** `quarantine::restore` 在记录改写／删除、事件保存、隔离区刷新全部完成后才设置 idle 并清空 stop。整个收尾在 catch_unwind 内，错误／panic 也会释放忙碌状态；磁盘操作始终不持有状态锁。没有额外新增还原并发测试，既有冲突／旁边还原测试全部通过。

新增断言都在票面指定的原测试函数内，使用对应标记：

| 测试 | 新增覆盖 |
|---|---|
| m35_clean_split / SERVICE_M35_CLEAN | 不可隔离盘准备期过滤、chosen／total／count／by_drive 不多计、会话提示连接、全空 invalid、delete 模式仍执行；准备后根不再登记时逐项失败、原因与进度；查重同样拒绝或逐批失败；原文件存在且大小不变、隔离目录未创建、执行器的 guard 没收到被拒绝批次 |
| m35_scope_and_plan / SERVICE_M35_SCOPE | common 新编号、home 编号唯一、该文件夹确实产生扫描组；历史 common 与已占用 common-2 迁移成 common-3 并落盘、仍可扫描；默认范围跳过已存但不在 home 的 drive-z、保留其它位置，显式传入仍 invalid；没有声明保护时带扩展前缀的条目仍可清 |
| m35_quarantine / SERVICE_M35_QUARANTINE | 已列出目录的 inspect 假错误后，磁盘记录逐字节不变、缓存保留；下次正常检查仍是可还原卡；从列表移除该合成目录后才删记录 |
| m35_conclusion_cards / SERVICE_M35_CONCLUSION | 合成扫描记录含四个被引用条目产生四条线索，结论恰好展示三条，more_clues 为 1 |

测试文件相对 `2917e5fc` 的 diff 为 **+535/−0**；没有删除或改动原断言，没有新增测试函数，`#[test]` 仍为精确 12 个。call() 的计时方式及 11 条同步写文件命令的 200 ms 名单逐字保留，custom_root_add 不计时，其余原时限不变。查重夹具按实际结束时间对齐假时钟，再留足一小时；没有新增依赖机器速度的等待或重试。

所有新物理夹具都由既有 Fixture 在本树 `.local/w3-f1-fixtures/service-<随机值>` 内新建并按既有边界校验回收。即使模拟根不可用，也保留显式的合成 base，回归时不会写真实盘根；inspect 错误用假函数产生，不改 ACL、不造文件系统竞态。Z 盘仅是内存中的离线编号，默认扫描不会访问它。

### SERVICE-M35 与原单补充对照

| SPEC 节 | 本次状态 |
|---|---|
| 1～2 边界与 Platform | 公开接口、依赖、FFI 不变；只有服务内部增加根核对与 inspect 参数化函数；Windows base=None 保留 |
| 3 设置 | 修复保留编号迁移；旧 v1/v2→v3 行为仍由原测试覆盖 |
| 4 体检 | 默认范围容忍离线的已存位置；显式范围严格校验；补扩展路径无声明的反面断言 |
| 5 结论 | 生产结论算法未改，补四条线索验证上限与剩余数 |
| 6 清理 | 增加准备过滤及逐批执行前核对；原两块划分、令牌、解锁与记录格式不变 |
| 7 隔离区 | inspect 失败不删记录，restore 收尾先保存／刷新再 idle；既有还原／永久删除回归通过 |
| 8 查重 | 准备期过滤不可隔离盘副本，清理复用同一逐批检查 |
| 9～10 设置、趋势 | 本补单未改业务行为，完整套件回归通过 |
| 11～12 测试、负控、real | 精确 12 个测试、三条新提交负控及恢复、三个 final、一次清理关闭的 real 全部完成 |

原单第 2 节六条补充继续保留：路径统一与非本地保护、声明目录上级保护、collected_at 的 RFC 3339 转换、安装程序宽松核对、日志失败不报成功及重新核对、未实现 SERVICE-M35-ADD-01。它们的原有断言随完整 12 测试通过；本次仅为第一条补了“扩展前缀但无声明时仍可清”的断言。

六个依赖包未修改；本补单新使用的 QuarantineTarget、MoveReport、MoveError::QuarantineUnavailable、QuarantineReport 与 inspect 均已有，实际签名可直接满足本次调用，没有发现新的签名／契约冲突。原有接口差异仍见补单 01，并未把本次有限核对说成重新审阅全部六包。

### 检查命令与结果

以下都在唯一工作树根执行，命令前缀为 `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M7`，模式和 final 标志如下。每次测试／负控／final 前按进程名检查 cargo、rustc、rustup、node、clippy，均未见其它检查进程；没有读取或输出命令行。所有检查器退出码均为 0；负控内部 cargo test 以 101 退出并命中目标，是预期的红灯。

所有下表文件均在归档的 `docs/acceptance/wave10/m7/receipts/`；本次 archive-result 在复制之后才生成，保留在 `.local/checks/WATER-W10-M7/`，不冒充已在本次索引内。

| 回执文件 | 模式与结果 |
|---|---|
| 2026-11-06T14-04-12.537Z-22792-lock-result.json | lock 通过 |
| 2026-11-06T14-04-20.616Z-32684-check-result.json | 初版 check 通过，fmt／clippy -D warnings |
| 2026-11-06T14-04-38.135Z-14236-test-result.json | 初版完整 test 12/12 |
| 2026-11-06T14-06-25.904Z-24020-check-result.json | 加每盘准备缓存后 check 通过 |
| 2026-11-06T14-06-47.836Z-31840-test-result.json | 同上 test 12/12，随后提交 db9c9185 |
| 2026-11-06T14-08-35.996Z-16308-red-nc1-result.json | db9c9185 的 nc1 目标命中，9 passed／3 failed；仅历史证据 |
| 2026-11-06T14-10-04.225Z-35240-test-result.json | 上条立即恢复后的 test 12/12 |
| 2026-11-06T14-12-13.045Z-31556-check-result.json | 保留原始 target 后 check 通过 |
| 2026-11-06T14-12-33.685Z-20696-test-result.json | 最终字节完整 test 12/12，随后提交 d2f642a4 |
| 2026-11-06T14-14-43.732Z-18136-red-nc1-result.json | 最终提交 nc1 命中，8 passed／4 failed，详见下文 |
| 2026-11-06T14-16-12.662Z-4768-test-result.json | nc1 立即恢复后 test 12/12 |
| 2026-11-06T14-18-26.379Z-35392-red-nc2-result.json | 最终提交 nc2 命中，11 passed／1 failed |
| 2026-11-06T14-20-11.298Z-35744-test-result.json | nc2 立即恢复后 test 12/12 |
| 2026-11-06T14-22-10.135Z-36200-red-nc3-result.json | 最终提交 nc3 命中，11 passed／1 failed |
| 2026-11-06T14-23-24.063Z-29956-test-result.json | nc3 立即恢复后 test 12/12 |
| 2026-11-06T14-24-51.329Z-35232-check-result.json | 干净 d2f642a4，check --final 通过 |
| 2026-11-06T14-24-57.393Z-21432-test-result.json | 同一干净提交，test --final 12/12，proofAudit 三条全部通过 |
| 2026-11-06T14-26-09.320Z-11272-real-result.json | 同一干净提交，real --final 通过 |
| 2026-11-06T14-27-57.012Z-23272-archive-result.json | archive 通过 |

没有非负控的完整测试失败，没有使用补单 05 的计时失败重跑额度。最终三个 final 前后 HEAD 都是 d2f642a4，工作树都干净；其间没有修改产品或测试。

最终稳定 `productionHash`：`ccdb5318ca85cb14f87245ff3e0f7a805a1a286c252844869f59ad5267fb1f91`；`testHash`：`96691219061abc0bfe29bbb221bf403c20a0f0c6a092e56190693137b4002a6b`。三次恢复绿及三个 final 均为这份字节。最终文件 SHA-256：

| 文件 | SHA-256 |
|---|---|
| src/clean.rs | 2081b6d6af14f4d1c93552ec274c353ed782e426ba866451b241599d36735dc9 |
| src/dedupe.rs | 88d102b0df6c8adf8f57c5568d47908a72361050251f11b0a1a968feeb04c3c3 |
| src/m35.rs | 2e4a5d8d7738acbca1ae515cc1345dc48f4845e622138b7946593a855f7df73c |
| src/quarantine.rs | d812cbc22c27b7832eda9aacbfe3a9dbf68566a641fe69a1f403aa9cb957181d |
| src/service.rs | 412665a7c970d8d8aba56ff02ebd2ee874b251695a1cfa26b9c14ae8ea0f315a |
| tests/service_v1.rs | 43934baddfc153560d979c5d98400d976f63f57511247b92e70828258771c4f4 |

关键回执 SHA-256：check final `b9c0b3e9c65ab5bef882783526ca140294c8a9de00584d7cdfb922625ff32491`；test final `decd521bd96f2395008096a0df0fbcf0460670ed4c09e365e8b34f43758fa393`；real final `62667f069b16442c7cebf09de632c47d68ab3007e4e633cc87e86800791caeda`。

### 最终提交上的三条负控

每条只改一个生产位置，测试未改；完成后立即 `git checkout -- <该文件>`，记录恢复后的 SHA-256，再跑完整 test。最终 test --final 的 proofAudit 精确引用下列三对。

1. **nc1 / SERVICE_M35_CLEAN**：`src/clean.rs` 的 `let quarantine_mode=stored["chosen_mode"]=="quarantine";` 改成 false，让“你选的”也走 execute。首个失败为 m35_clean_split 的 `SERVICE_M35_CLEAN: must move chosen`。另有 m35_quarantine、m35_trends_history 受同一故障影响；同轮更靠后的旧 service_clean_flow 还因 `SERVICE_M3C_SKIP: add "i-000051" took 123.8253ms` 失败，这个计时失败不当作负控证据，也没有修改其旧断言。立即恢复后的完整测试和后续 final 都为 12/12。恢复 clean.rs 的 SHA-256 为上表 2081b6d6…。
2. **nc2 / SERVICE_M35_CONCLUSION**：`src/conclusion.rs` 的卡片 `.take(5)` 改成 `.take(6)`。仅 m35_conclusion_cards 的 `SERVICE_M35_CONCLUSION: cap` 失败。恢复 SHA-256 `65b71998678c1bff26e1b587c8ede3754d5eda8640ef0a7b998c4fef21d882a8`，立即完整 12/12。
3. **nc3 / SERVICE_M35_SCOPE**：`src/m35.rs` 的 `manifest::to_targets(parsed, &m.dir, trusted)` 改成最后参数 true。仅 m35_scope_and_plan 的 `SERVICE_M35_SCOPE: common leaked into folder scope` 失败。恢复 m35.rs 的 SHA-256 为上表 2e4a5d8d…，立即完整 12/12。

proofAudit 的 red→restored 分别是：14:14:43→14:16:12、14:18:26→14:20:11、14:22:10→14:23:24（完整文件名见上表）。较早在 db9c9185 上做的 nc1 不用于最终字节的证明。

### 真实冒烟、遗留与未验证

- 本次只运行一次 real --final：cards 5、clues 3、conclusion_rows 13、drives 4、folds 3、quarantine_cards 0。清理开关关闭，只读常用位置，输出只有计数；没有真实清理、移动、还原或永久删除。
- 补单第 7 节四条遗留均未改：抽屉“上次没清完”的勾选与计划不一致；只有泄漏卡能复制且线索可能不在前三条；conclusion_decide 写设置锁内仍找 .git；标记已修后的卡片证据仍按全部成员计数。
- 不可隔离盘与准备后离线由假平台在同一物理盘的合成夹具中模拟，不能冒充真实 U 盘／映射盘／拔插验收。没有实测执行器运行中拔盘、生产并发、断电重启竞态，也没有新增还原写盘窗口的并发测试。
- 原有真实双盘移动、真实声明范围、长列表极值、所有查重取消／保留数量边界与 macOS 等未验证项继续保留，未因本次 12/12 而宣称已完成。
- 契约、样例、检查器、台账、其它包、Cargo.toml、Cargo.lock、系统函数与白名单均未改。未开窗口、选择框、浏览器，未联网或下载，未 push、改远端、合主线或改写提交。

归档索引 `docs/acceptance/wave10/m7/ARCHIVE.json`：**1703** 个检查器生成证据文件、**49,554,811** 字节；历史证据保留，本次由 archive 原字节复制。当前 archive-result 的 SHA-256 为 `0869f09231f14a8a6e23a3184fda595e79c6c756de42249ccffc8389512cacf1`，在复制后生成，因此不计入这 1703 个文件。交回提交仅包含本回执与检查器生成的证据。
