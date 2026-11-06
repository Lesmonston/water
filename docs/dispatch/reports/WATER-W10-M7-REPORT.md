WATER-W10-M7 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md

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
