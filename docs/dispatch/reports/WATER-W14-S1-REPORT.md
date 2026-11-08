WATER-W14-S1 补单 01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-s1/docs/dispatch/reports/WATER-W14-S1-REPORT.md

# WATER-W14-S1 回执（原单与补单 01）

当前结论见文末“第 5 节补充续做：第 A 段已完成”。原单和此前补单的受阻记录保留为历史。

2026-11-08。实际执行模型：Codex（GPT-6）；未使用子代理或其它执行者。

这是保存现场的 WIP，**不是完成实现，不可合入，也不应作为 H1 的完成基线**。未修改 manifest 或台账。

## 基线与提交

- 工作树：`F:/new/smaltalk/water/.worktrees/w14-s1`。
- 分支：`worker/water-w14-s1`。
- 初次 HEAD：`5f6ff198f1822c1ae3508588d239f73c12e11533`；开工时干净，与用户指定值一致。
- 现场实现提交：`78acd3b66ecb417d9fe561785313342049af63a5`。下述最后一次 test 在该提交的同一套产品与测试字节上运行；此提交没有通过测试。
- 本报告单独提交，不夹带后续产品变更。

## 阻点：服务收不到“目标已完成”的信息

工单第 1.4 节、W14 第 3.3 节要求规则阶段按**完成的目标数**计算 0～40 或 0～90 的进度。工单第 5 节又禁止修改扫描包、其它包与契约。

实际扫描接口不能让服务区分处理中途与目标完成：

1. [ScanProgress](../../../packages/junk-scan/src/scan.rs:75) 只有 `group_id`、`category`、`visited_entries`、`found_bytes`，没有目标 ID、完成标志或已完成目标数。
2. [Engine::emit](../../../packages/junk-scan/src/scan.rs:213) 的 `force` 只影响是否发送，**不进入** `ScanProgress`。
3. [处理中途的发送](../../../packages/junk-scan/src/scan/streaming.rs:251) 和第 279 行会重复发送同组进度；[未匹配时的发送](../../../packages/junk-scan/src/scan/streaming.rs:726)、[遍历结束时的发送](../../../packages/junk-scan/src/scan/streaming.rs:1008) 使用同一形状。按回调次数计数会提前完成；按 group 去重仍不能表达同组多个 target 的完成情况。
4. 服务原有 `Progress::on_progress` 把每个回调当成一个完成目标，其“每个目标边界恰好一次”的注释与当前扫描源码不符。草稿保留了这部分计数方式，因此同样有此缺陷，不能交成完成品。

已在现有 `service_scan_views` 内加入不靠睡眠的复现：测试替身在一个目标尚未完成时，重复发送当前接口允许的相同事件；通过实际源编译的 `Service::call("scan_progress")` 观察到 `percent == 40`，期望 `0`，失败标记为：

```text
SERVICE_W14_PROGRESS: repeated within-target callbacks are not completed targets
left: Number(40)
right: 0
```

替身只替换测试 crate 的扫描边界；生产 `lib.rs` 仍直接引用 `water_junk_scan`。测试在断言失败前释放全部通道、等待任务最终状态并移除替身，未留下等待中的扫描线程。

这不是行号偏差、计时失败或旧断言迁移。按[通用规则第 4 节](../WORKER-RULES.md:37)“要改白名单以外的文件”“要改公开接口”交回受阻；没有自行改扫描包、放宽断言或改契约。

### 最小补充需求

由总控先冻结扫描进度的完成语义，并给扫描包另单或明确的补充单：至少让服务收到可区分的真实 target 完成事件（含 target 身份，保证一次），或权威的累计完成数及位置归属。不能仅把现有 `force` 当作完成标志，因为当前未匹配路径也会使用 `force` 发送。

扫描包完成后，给 S1 明确的续做基线和该接口的消费约定。当前范围内只能知道 `scan_full` 返回时全阶段结束；若改成此前一直为 0 的粗粒度显示，也需总控先明确修订现有进度要求，本次未擅自采用这个解释。

## 已保存的工作与未完成项

仅改 `packages/water-service/src/` 与 `tests/service_v1.rs`；新增私有 `language.rs`。

| 工单要求 | 现场情况 |
|---|---|
| IPC 双语字段、规则英文字段 | 已加入大量显式配对，规则说明使用 `Rule` / `RuleText` 英文；完整审计与验收未完成 |
| `IpcError.message_en` | 服务构造处和源编译测试边界已添加；宿主未改 |
| 新记录双语、旧记录回退 | 已加入记录读取回退、跳过标题、事件、隔离组名等草稿；缺完整兼容回归 |
| 去除指定中文判断 | 已加入 `item_note_codes`、程序目录原因代码、进度类别的结构化根映射；保留旧文本读取分支；新旧等价测试未补齐 |
| 两份大小格式化 | 已加入英文版本与数字格式化；未完成精确断言清单 |
| 整盘进度、位置名、`finishing` | 已拆开整盘字节计算，使用开始体检时的已用容量，保持名称，落盘前 95、终态 100；规则目标计数仍被上述接口阻塞 |
| 测试 | 测试函数数量仍为 12；加入递归字段配对与可控阶段测试；新回归为红，其余见下 |
| 公开前写法 | 新文字未加入私人流程引用；全目录审计未完成 |
| 三条负控、三个 final、archive | 均未完成，不声明有效证据 |

最后一次 test 的其它失败必须在续做时修完，不能当作基线失败：

- `m35_clean_split`、`service_hardening`：无选择时 `summary_en` 为空，递归配对断言正确拒绝。
- `m35_conclusion_cards`：旧精确线索对象尚未迁移到包含 `text_en`、`copy_text_en` 的精确对象。
- `m35_scope_and_plan`：旧 `referenced_count` 场景断言失败，仍需核对原因代码迁移后的展示与断言；未降低强度。
- `service_storage_safety`：旧记录占用提示的精确对象需包含回退的 `process_label_en`。
- `service_trends_locations`：预测精确对象需加入 `note_en`，目前未迁移。

另有双语覆盖、旧记录中文保留、代码兼容等测试仍待补齐；不要从已加入的字段推断全量英文已完成。

## 实际命令与结果

以下均从指定工作树根目录执行，入口为：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode <mode>
```

| mode | 退出码 / 结果 | `.local/checks/WATER-W14-S1/` 下回执 |
|---|---|---|
| baseline | 0 / passed | `2026-11-08T10-38-09.114Z-6716-baseline-result.json` |
| lock | 0 / passed | `2026-11-08T10-41-49.803Z-39028-lock-result.json` |
| check | 1 / 当时未格式化，fmt 拒绝 | `2026-11-08T10-51-05.353Z-33900-check-result.json` |
| test | 1 / 编译失败，3 个草稿变量错误 | `2026-11-08T10-52-34.531Z-28236-test-result.json` |
| test | 1 / 测试替身误用 Category::as_str | `2026-11-08T10-57-14.225Z-31736-test-result.json` |
| test | 1 / 编译成功，12 测：5 过、7 失败、0 ignored、0 filtered | `2026-11-08T10-59-04.728Z-24460-test-result.json` |

最后一次 Cargo 日志：`.local/checks/WATER-W14-S1/2026-11-08T10-59-04.728Z-24460-test-5.log`。Cargo 自身退出码 101；测试运行 45.22 秒。所有失败均非计时失败，未发生计时重跑。

最终测试前已用本机现有 Rustfmt 对白名单内实际修改的 Rust 文件格式化（`--edition 2024 --config skip_children=true`）。`git diff --check` 通过。**没有把格式化成功写成 check 门通过**。

没有运行 `real`、`red-nc1/2/3`、任何 `--final` 或 `archive`；因此没有向 `docs/acceptance/wave14/s1/` 手工写入证据。编译错误和本次红色回归均不计作工单负控。

## 已迁移的旧写法与决定

- `shape` 两边完整键集合 → 两边都过滤 `_en` 后精确比键；原有中文键与值类型仍逐层比较，三份共享样例未改。
- 测试源编译边界的两字段错误 → 增加并转发 `message_en`，与新公共错误一致。
- 等待逻辑把所有非 `running` 都当结束 → `running` 和 `finishing` 都继续等，避免落盘前提早读取结果；未放宽原时限。
- 趋势查询时钟 `NOW + 2 * 86400 + 60` → 该次扫描实际 `finished_at + 60`，避免扫描时间超过固定余量后查询抢跑；没有新增墙钟时限。
- 程序目录保护原因的中文句子 → `installed_program_directory` / `program_directory` 代码，并保存中英说明。相关旧精确断言尚待完整迁移，未宣称完成。
- 本机无 `python` 命令，使用已有 `py -3` 执行等价的本地文本编辑；没有下载或安装工具。

词汇表之外已使用的译法包括：项目所在位置 `Containing project`，应用更新残留 `update leftovers`，崩溃转储 `crash dumps`，回收站 `Recycle Bin`，文件资源管理器 `File Explorer`，安装目录 `installation folder`，保留名 `reserved name`，签名 `signatures`，密钥 `keys`，日志写入 `write the journal`，重复文件 `Duplicate files`，副本尾巴 `copy suffix`，脱离 git `Detached from git`。这是当前草稿的译法记录，完整用词审计仍未完成。

## 边界与结束状态

- 没有改宿主、扫描包、规则包、契约、共享样例、Cargo 清单或锁文件、检查器、台账。
- 没有真实数据扫描、真实清理、原生窗口、选择框或浏览器；删除仍只由已有测试回收本树 `.local` 内本次新建的合成夹具目录。
- 没有下载依赖，没有运行上游代码，没有使用子代理。
- 没有 push、修改远端或持久 Git 配置，没有 merge、rebase、reset、amend 或改写历史；提交使用进程内模型身份。
- Windows 仅完成上述非 final 检查；macOS 未验证。没有产品发布或总控验收通过的声明。
- 最后一次 test 已退出；核对时未发现剩余 Cargo、Rustc 或本票 service_v1 测试进程。没有执行额外杀进程操作。

按受阻回执交回后停止本票测试与修改，等待总控补齐扫描完成语义和续做单。

## 补单 01（第 A 段）

2026-11-08。实际模型：Codex（GPT-6）；没有使用子代理。以上保留原单历史，本节记录本次续做。

**本段受阻：服务测试已经 12/12 全绿，但 check 编译了白名单外的示例，无法在当前文件范围内通过。** 未将第 A 段标成完成或 H1 的已通过基线，未修改台账。

### 续做与提交

- 原工作树及分支不变，初次状态干净。
- 续做起点：`1587c1cc780c8680d971817f4c3ce67d5508ec86`。
- 本段现场实现提交：`a9a87ad108a9250c32826b25412bb0f435a021b3`。
- 在该提交上、工作树干净时，依次执行最后一次非 final `check` 和 `test`；报告随后单独提交，没有后续产品变更。
- 本次实际修改：服务包的 `src/clean.rs`、`src/conclusion.rs`、`src/language.rs`、`src/m35.rs`、`src/service.rs`、`src/views.rs`、`tests/service_v1.rs`、`README.md`。原单已经加入的 `IpcError` 三个字段没有再改；公开函数和类型的签名没有改。

### 新阻点与最小补充范围

原单第 5 节只允许服务包的 `src/`、`tests/service_v1.rs`、`README.md` 及报告、指定归档证据；补单 01 明确原边界照旧。检查器执行：

```text
cargo clippy --offline --locked --manifest-path packages/water-service/Cargo.toml --all-targets -- -D warnings
```

`--all-targets` 也编译 `examples/service_smoke.rs`。这份文件有原单未列出的两处 `IpcError` 字面量：

```text
examples/service_smoke.rs:27:20  missing field `message_en`
examples/service_smoke.rs:49:24  missing field `message_en`
```

另已把同文件涉及的接线一并看完：[第 45 行](../../../packages/water-service/examples/service_smoke.rs:45) 用 `state != "running"` 判断结束，会在新增的 `finishing` 阶段提前读取结果。因此最小补充不是只加两个字段，而是**明确允许修改这一份示例文件的三处**：

1. 第 27 行错误补 `message_en: "A data directory is required".into()`。
2. 第 49 行错误补 `message_en: "The checkup did not finish".into()`。
3. 第 45 行轮询改为 `running`、`finishing` 都继续等；只在最终状态退出。

这三处目前都未动。无需改契约、依赖、系统函数、检查器或其它包。没有绕过 `--all-targets`，也没有把失败写成通过。

按[通用规则第 4 节](../WORKER-RULES.md:37)“要改白名单以外的文件”交回；请总控补充该文件的明确范围及续做起点。当前受阻不是 J2 的根目录信号，也不是计时失败。

### 已完成的服务工作及验证

- 规则扫描期间不再数 `on_progress` 次数，也不据此标完成；`scan_full` 返回才进入 40/90 的阶段终点。重复回调回归保留，测试只固定重复回调不推进完成、范围与单调性，未把过渡阶段的精确 0 或所有位置同时运行写死。
- 整盘空间阶段独立累计字节，按开始体检时的已用空间计算，40～94；位置为 `space`、名字不变，空间字节不进入 `found_bytes`。`finishing` 为 95，存储结束的最终状态为 100。通道分别卡住规则、空间和落盘阶段，12 个原测试内完成验证。
- 命令返回的配对检查覆盖已有流程，英文检查扩展到现有成功调用；明确例外仅为旧提示、旧合成备注、旧合成位置名与用户填写的声明标题。规则英文在公开 `group_detail` 入口与实际 `Rule` 英文字段精确对照。
- 新增增长、预测、会话清理说明、隔离原因及错误的中英精确断言；原有中文断言保留。大小格式化覆盖英文千位分隔，日期覆盖同年日期、跨年和 24 小时时间，复制线索中的时间保留 UTC 标识。
- 新原因代码与旧中文路径均验证：卸载说明代码在中文改写后仍生效；旧记录标题英文等于原中文；脱离 git 的新代码与旧说明生成同一线索；程序目录保护的新旧记录保持相同卡片选择和线索过滤。真实存储的隔离组记录去掉英文后重启，组名英文回退等于中文。
- 旧记录兼容仍在读取端回退，新保存记录保留两种语言；已有设置、清理、隔离、历史等流程均通过递归字段配对检查。没有新增 `#[test]`、ignore 或过滤；实际测试数仍为 12。
- 清理执行路径、文件操作权限没有扩大；新增的过期原因枚举为内部类型，避免过期英文说明依赖中文句子匹配。
- 全目录公开写法检查未发现私人流程、用户名、本机绝对路径或其它本机项目引用；测试继续使用本树随机合成目录及虚构路径。`.WATER-QUARANTINE` 等旧名称作为兼容数据保留。

原回执列出的 6 类非进度失败均已解决，最后一次全部 12 个测试通过。另修正了一个编辑时误命中合成备注数组的问题，恢复原来的 4 条不同备注及其原有精确断言；未用放宽断言处理。

### 旧断言与假时钟迁移

| 原值 / 写法 | 新值 / 写法 | 原因与保留的约束 |
|---|---|---|
| 占用未知对象仅有 `process_label_zh`、`item_count: 2` | 精确增加 `process_label_en`，其它值不变 | 新字段必需；仍精确核对原有中文与数量 |
| 旧占用对象仅有中文旧提示和 `item_count: null` | 增加同值 `process_label_en: "旧提示"` | 核对旧数据回退，未把旧提示改成译文 |
| 四个引用合并后的线索精确对象只有中文和 `copy_text` | 同一对象精确加入 `text_en`、`copy_text_en` | 数量、大小、同组大小写合并和路径清单断言保持 |
| 预测精确对象只有 `note_zh: null` | 精确增加 `note_en: null` | 数值、天数、根与中文原值保持 |
| 程序目录的原始 `ineligible_reason` 为中文句子 | `installed_program_directory` / `program_directory` | 原中文在 `item_notes` 和说明 sidecar 中精确保留，并核英文；保护、无卡片、无线索断言保持 |
| `referenced_count` / 贵重文件 / 保留名在原因字段里查中文 | 精确代码 `junction_referenced` / `valuable_files` / `reserved_name`，并独立核中文说明 | 仍要求 `eligible == false`，不能进入清理计划；这次查清是原因字段迁移，没有降低保护强度 |
| 扩展路径、UNC、声明祖先、已安装应用在原因字段里查中文 | `declaration_protected`、`path_unverifiable`、`contains_declaration`、`app_installed` | 中文说明独立保留；声明、路径与在装匹配保护不变 |
| 规则扫描尚未返回的阶段精确断言 40/90、复现精确断言 0 | 合法范围、重复回调前后相等、不能提前达到阶段终点 | 按补单要求不冻结将被根目录计数替换的暂态值；空间、95、100 的精确值仍核对 |
| 记录回放后新扫描仍沿用固定 `NOW` | 以原记录实际完成时间加 1 秒作下一次起点 | 防止较快的新扫描时间反而早于首次较慢扫描，仍精确检查保留数与新结果 |
| 结论测试相邻扫描用固定 `NOW + 60/120` | 每次以实际 `finished_at + 60` 推进 | 与趋势测试采用同一修法，不依赖扫描耗时；无新增或放宽墙钟时限 |

无选择时，中文汇总仍允许原来的空字符串，英文汇总改为非空 `Nothing selected`；缺失位置标签的英文兜底为 `Unnamed item`，修的是实现，未删除配对断言。原有 `shape` 两边过滤 `_en` 与等待 `finishing` 的迁移保持。

### 实际检查命令与结果

统一入口与原单相同，从指定工作树根执行：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode lock
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode check
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode test
```

下表文件均位于本树 `.local/checks/WATER-W14-S1/`，未复制进归档证据目录。

| 回执文件 | 退出码与结果 |
|---|---|
| `2026-11-08T12-16-49.554Z-30228-lock-result.json` | 0，passed |
| `2026-11-08T12-18-36.581Z-41244-test-result.json` | 1，9 过、3 失败；原因代码、未知占用精确对象与回放时钟，后续修复 |
| `2026-11-08T12-24-18.475Z-41692-test-result.json` | 1，9 过、3 失败；英文严格检查与剩余代码断言，后续修复 |
| `2026-11-08T12-31-43.486Z-32716-check-result.json` | 1，Clippy 要求 checked division，已按要求修正 |
| `2026-11-08T12-33-33.943Z-27568-check-result.json` | 1，示例第 27/49 行缺 `message_en`，白名单阻点 |
| `2026-11-08T12-36-30.962Z-20656-test-result.json` | 1，10 过、2 失败；合成备注数组及声明原因断言，后续修复 |
| `2026-11-08T12-39-50.107Z-33152-test-result.json` | 0，12/12 通过，0 ignored、0 filtered |
| **`2026-11-08T12-42-43.461Z-32616-check-result.json`** | **干净提交 a9a87ad1：1，fmt 通过，Clippy 编译示例时 E0063 两处失败** |
| **`2026-11-08T12-44-12.479Z-42088-test-result.json`** | **同一干净提交：0，12/12 通过，0 ignored、0 filtered** |

最后一次 check 的诊断在 `2026-11-08T12-42-43.461Z-32616-check-6.log`；最后一次 test 的 Cargo 日志在 `2026-11-08T12-44-12.479Z-42088-test-5.log`，Cargo 退出 0，测试运行 87.80 秒。check 的 Cargo 退出 101；不是计时失败。计时重跑为 0，所有旧失败如上保留，没有修改时限。

### 补单 02 仍要接的事项与边界

- 总控合入 J2 后给出续做基线；服务接 `on_root_done`，按根目录完成数计算规则阶段，兜底目标跟随其主目标，位置与类别按目标走完更新。
- 根目录阶段的生产接线、未完成和提前结束分支、相关测试，以及原单三条负控。
- 全部 final、真实只读冒烟和 `archive`。本段没有运行 `real`、负控、任何 `--final` 或 `archive`，没有向 `docs/acceptance/wave14/s1/` 写证据。
- 本段新增词汇：`Nothing selected`（未选择）、`Unnamed item`（未命名项）、`Unknown date`（未知日期）、`Session cleanup settings`（会话清理设置）、`trust in the project declaration`（项目声明的信任）、`Protected and reference only`（受保护与仅供参考）。原单回执中的其它译法沿用。

没有修改示例、宿主、扫描包、规则包、契约、检查器、依赖或锁文件；没有真实数据扫描、真实清理、窗口、选择框、浏览器或下载，没有使用子代理。只在本分支新增提交，未 push、改远端、持久 Git 配置或改写历史。最后一次 test 已退出，核对时未发现剩余 Cargo、Rustc 或本票 service_v1 进程；没有执行杀进程操作。macOS 未验证。保存本报告后停止本票修改，待总控补齐示例文件范围。

### 第 5 节补充续做：第 A 段已完成

2026-11-08。按权威补单新增的第 5 节，在原树 `worker/water-w14-s1` 从干净的 `67dffed702f98217e3a6d6785bc4c983ac34a7bb` 续做。实际模型仍为 Codex（GPT-6），没有子代理。

**第 A 段实现提交：`ce4091b073838e68a90f9646460e6ea2228de622`。在该干净提交上，check 与 test 依次全部通过。** 本报告单独提交，不夹带产品变更。

本次仅修改新增白名单文件 `packages/water-service/examples/service_smoke.rs` 的三处：

1. 缺少数据目录的错误增加 `message_en: "A data directory is required"`。
2. 体检超时的错误增加 `message_en: "The checkup did not finish"`。
3. 轮询从“非 `running` 立即退出”改为只在 `completed`、`partial`、`cancelled`、`failed` 四个既有最终状态退出；`running` 和 `finishing` 均继续等，沿用原有超时和轮询间隔。

本轮没有修改测试或迁移其它断言；前文第 A 段的旧断言迁移表仍有效。`IpcError` 的 `code`、`message_zh`、`message_en` 三个字段、公开函数和类型签名、IPC 命令名与键均保持第 A 段接口。

在工作树根执行的最后两次检查如下，均无 `--final`：

| 命令 | 结果 | 本树 `.local/checks/WATER-W14-S1/` 下回执 |
|---|---|---|
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode check` | 退出 0，passed；fmt 与 Clippy `--all-targets -- -D warnings` 通过 | `2026-11-08T12-54-57.226Z-42780-check-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode test` | 退出 0，passed；12 通过、0 失败、0 ignored、0 filtered | `2026-11-08T12-56-05.153Z-33772-test-result.json` |

两份回执的前后 HEAD 都是 `ce4091b073838e68a90f9646460e6ea2228de622`，检查后的工作树状态均为空。最后一次 Clippy 日志为 `2026-11-08T12-54-57.226Z-42780-check-6.log`，最后一次 Cargo 测试日志为 `2026-11-08T12-56-05.153Z-33772-test-5.log`；测试运行 99.20 秒。无计时失败或重跑。

补单 02 仍需在总控合入 J2 后接 `on_root_done`，按根目录完成数计算规则阶段，处理兜底目标及提前结束，更新位置和类别的完成状态，完成原单三条负控、全部 final、真实只读冒烟与 `archive`。本段沿用获准的阶段终点过渡做法。

本轮未运行 `real`、负控、任何 final 或 archive，未向归档证据目录写文件。真实机器冒烟及 macOS 保持未验证；示例通过全目标编译，其真实运行留待后续验证。没有改宿主、扫描包、规则包、契约、依赖、锁文件或检查器，没有开窗口、对话框、浏览器或下载，没有真实清理。只新增本分支提交，未推送或改写历史。测试已正常退出，结束核对未发现剩余 Cargo、Rustc 或本票 service_v1 进程。第 A 段执行完成，提交本报告后停止本票修改，等待总控收单及补单 02。
