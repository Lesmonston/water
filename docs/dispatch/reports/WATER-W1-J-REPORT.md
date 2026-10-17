WATER-W1-J 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/j/docs/dispatch/reports/WATER-W1-J-REPORT.md

执行日期：2026-10-18（Asia/Tokyo；helper 日志使用 2026-10-17 UTC）。执行者为 Codex，模型为本会话标识 GPT-6，未提供更细模型构建号；未使用内部子代理、外部实现者或其它 IDE。未修改总控台账，未将任务标为 VERIFIED。

**结果与最小缺口**

已实现 J，完整五测试、三项真实源码负控及逐次恢复通过；同一干净实现 SHA 上 fmt/test/clippy/metadata 四个 final 门通过。第五个 bridge final 失败：冻结 helper 要求每个依赖名仅匹配一份 rlib，而独立包 baseline 和 J 依赖构建在同一指定 target 中留下了不同路径指纹的产物。失败发生在选择 `water_scan` 依赖时；本次 bridge 没有编译或运行独立比较程序，也没有调用 J bridge。因此未完成整票验收，不能声称 13 场景 bridge 或 J→K 页面接线通过。

最小补充是由总控修订冻结 helper 的产物选择方式，使其按 Cargo 实际构建图选择一致的依赖产物，而非目录内同名前缀计数或任取第一份；同步正式补单及受影响冻结材料，再续做 bridge 与必要复验。当前实现、target、夹具和证据全部保留。本执行者没有修改 helper、删除/移动旧构建产物、清缓存、更换指定 target 或自行放宽 final 门。

**基线、提交与范围**

| 项 | 实际值 |
|---|---|
| 权威工单 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-J-LAB-SESSION-20261018.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/j` / `worker/water-w1-j` |
| 初始精确 HEAD / 基线 | `bc409f4af8cb2d51b2f67341ad46637cfa5e66f3`，初始干净 |
| tag | `water-w1-session-batch-base-20261018-r1` |
| 实现与测试提交 / 五 final 受测 SHA | `b6fd1fe6566ad79dbcca6c420988c9bb40c47d80` |
| 实现提交文件 | 仅 `packages/lab-session/` 下 Cargo.toml、Cargo.lock、README.md、src/lib.rs、src/v1.rs、tests/session_v1.rs，共 6 个新增文件 |
| 后续提交范围 | 本回执和 `docs/acceptance/wave1/j/` 内证据；实现/测试字节不再改动 |
| 冻结复核 | 新锁 65 项，六旧锁 83 唯一文件，去重合计 132 唯一文件，全部哈希一致 |
| 构建状态 | 本树 `.local/j-cargo-home`、`.local/j-target`、`.local/j-tmp`；Node 24.16.0、Rust 1.95.0、Windows MSVC；offline、jobs=1、单测试线程 |

所有项目材料均在 Water 范围内；只读主检出权威票/manifest，没有 merge 取票。根 Cargo、A–I 产品、所有旧 helper/锁、新冻结文件、上游和其它工作树未改动。没有 push、merge、rebase、发布、安装依赖、修改全局配置或运行上游。

**需求逐项对照**

生产实现见 [v1.rs](../../../packages/lab-session/src/v1.rs)（快照 17 行、错误 45/56 行、默认入口 85 行、组合入口 94 行、序列化 148 行）。唯一测试文件见 [session_v1.rs](../../../packages/lab-session/tests/session_v1.rs)。

| 需求 | 实现与验证 |
|---|---|
| 独立 workspace、7 依赖、2 目标 | 明确五个本树 path 依赖及两个精确 serde 依赖；显式 lib/test；四 auto=false，无 dev/build/bin/unsafe；lock 离线生成，metadata final 核验通过 |
| 默认真实装配 | 默认入口直接传 NativeIo/NoopObserver 至同一组合入口；五测试实际比较默认与 with_io 结果 |
| 五库真实调用 | F.open_fixture_run → F.scan_fixture_with_io → 序列化 facts → G.assemble_json → A.to_json/parse_report → E.project_report/H.summarize_report，未读取 expected 充当结果 |
| 同一取消/observer/options | 原引用传入 F；覆盖 clone 预取消、首项取消、目录递归前取消优先、平面末项取消仍 completed、跨 scope 取消和累计 progress；nc1 可检出 fresh token 缺陷 |
| 11 原生 case / 12 scope / 39 entry | session_native_composition 逐场景使用默认入口，与另一次 F/G/A/E/H 实际结果及冻结矩阵比较；本机所有链接支持，无 unsupported entry 扣减 |
| 完整 facts 与来源 | 直接保留 G.source_facts 的完整克隆；比较 kind/depth/identity、issue origin/operation、scope/entry 顺序；nc2 检出 facts 丢失 |
| 报告上下文 | scan_id 仅声明；平台来自编译目标；scope ID/顺序与 facts 一致，label 严格 Synthetic + 空格 + ID，origin 为合成 UserSelected 声明 |
| 部分结果不丢失 | 真实预算 partial、共享取消 cancelled、注入 PermissionDenied/RootChanged/NotFound 均为成功快照，并与直接链路逐值相等；保留已得事实 |
| scope/前缀/链接边界 | Trace 委托 NativeIo；scope-prefix 只触及 scope 内元数据；Link 不进入 list_names；六个冻结物理负例和全部非法 run_id 均映射 OpenRejected，未使用外部 root |
| 未知身份和保护 | Windows 每项 identity 为 Unknown 且三个身份字段 null；仅 File 有长度，硬链接两路径、重叠 scope 保留；全部 unknown/protected，无回收估值，逻辑/分配总量 null；nc3 检出未知变 0 |
| 固定错误与无泄露 | OpenRejected /open、可信非法 File 长度导致 AssemblyRejected /assembly 已走实际入口；其余固定码/field/Display/Error 类型契约检查及源码审阅，未冒称分支实测；错误不携原错误或输入 |
| 私有不可变快照 | 六字段私有，四个只读 getter，Debug/Clone/PartialEq/Serialize，无 Default/Deserialize/公开构造器或 mutable getter；wire 精确六字段并完整逐值相等 |
| 大小上限与纯度 | inspect 返回前调用同一 to_json；to_json 序列化后按 UTF-8 字节检查 <=16777216，不截断；普通输出、重复调用、输入 ID/options/token 不变已测；超限分支未实测 |
| 外部 bridge | final 已尝试但被冻结工具的重复 rlib 选择断言阻断，未执行 13 场景比较；不能以本包五测试替代此门 |

**检查命令、退出码与完整证据**

所有产品检查都走票面 helper。下表“模式”统一对应 `node scripts/session-batch-check.mjs --task WATER-W1-J --mode <模式>`；final 行追加 `--final`。红模式内部 `cargo test` 退出 101、helper 退出 0 表示成功观察到完整五测目标断言失败，不是测试全绿。

证据根为 [j](../../acceptance/wave1/j/)，[worker-audit.json](../../acceptance/wave1/j/worker-audit.json) 保存全部 21 份 receipt 的完整 argv、子进程退出码、来源 SHA、proofAudit 和 bridge 缺口。[artifact-manifest.json](../../acceptance/wave1/j/artifact-manifest.json) 列出每份原字节来源、长度和 SHA256。receipt 中的 `commands[].log` 指向本目录完整 stdout/stderr，`sourceState.files[].snapshot` 指向当时完整源码。

| 模式/阶段 | helper / 核心子进程退出码 | 结果和 receipt（文件均在证据根） |
|---|---|---|
| baseline | 0 / 0 | 11 case/12 scope/39 entry + 两控制场景、44 快照；`2026-10-17T16-35-15.271Z-33908-baseline-result.json` |
| lock | 0 / 0 | 离线锁/metadata 通过；`2026-10-17T16-40-20.171Z-43988-lock-result.json` |
| 初次 red-behavior | 0 / 101 | 编译成功、0 passed/5 failed，命中 J_BEHAVIOR；`2026-10-17T16-40-44.106Z-20696-red-behavior-result.json` |
| fmt | 0 / 0 | `2026-10-17T16-41-49.191Z-23524-fmt-result.json` |
| 首次 clippy | 1 / 101 | 测试中 cfg 常量断言触发 assertions_on_constants；`2026-10-17T16-42-00.977Z-8928-clippy-result.json` |
| 重录 red-behavior | 0 / 101 | 最终测试字节 + 原骨架，0 passed/5 failed；`2026-10-17T16-43-04.610Z-25072-red-behavior-result.json` |
| clippy 修复后 | 0 / 0 | `2026-10-17T16-43-34.256Z-26208-clippy-result.json` |
| suite / 行为红后恢复 | 0 / 0 | 5 passed；`2026-10-17T16-43-47.077Z-2132-suite-result.json` |
| red-nc1 | 0 / 101 | 4 passed/1 failed，J_CANCEL_SHARED；`2026-10-17T16-44-17.853Z-37004-red-nc1-result.json` |
| nc1 恢复 suite | 0 / 0 | 5 passed；`2026-10-17T16-44-35.038Z-28632-suite-result.json` |
| red-nc2 | 0 / 101 | 0 passed/5 failed，J_FACTS_PRESERVED；`2026-10-17T16-44-47.120Z-26260-red-nc2-result.json` |
| nc2 恢复 suite | 0 / 0 | 5 passed；`2026-10-17T16-45-06.851Z-11716-suite-result.json` |
| red-nc3 | 0 / 101 | 0 passed/5 failed，J_SUMMARY_UNKNOWN；`2026-10-17T16-45-32.977Z-33272-red-nc3-result.json` |
| nc3 恢复 suite | 0 / 0 | 5 passed；`2026-10-17T16-46-02.086Z-12764-suite-result.json` |
| fmt --final | 0 / 0 | `2026-10-17T16-47-04.799Z-2200-fmt-result.json` |
| test --final | 0 / 0 | 完整 5 passed/0 failed/0 ignored/0 filtered；`2026-10-17T16-47-40.103Z-29428-test-result.json` |
| clippy --final | 0 / 0 | -D warnings；`2026-10-17T16-48-20.976Z-26948-clippy-result.json` |
| metadata --final | 0 / 0 | `2026-10-17T16-49-00.145Z-13012-metadata-result.json` |
| bridge --final | 1 / build=0，后续程序未启动 | rlib 选择断言 `water_scan / 2 !== 1`；`2026-10-17T16-49-09.736Z-42532-bridge-result.json` |

另外原样保留了执行前已存在的两份总控 baseline 及其日志（16-02-42、16-07-56），不冒认为本执行者新运行。全部 341 份 helper json/log/txt（263 log、54 源码 txt、24 json）原字节归档，另附 active fixture index 和 8 份构建指纹，共 350 份原字节证据；再加两份生成的审计/清单，共 352 份新增证据文件。冻结 `.gitattributes` 保持 `* -text`，不改证据换行。

完整五测试名称及代码位置为 session_native_composition（279 行）、session_cancellation_and_progress（392 行）、session_errors_and_bounds（514 行）、session_identity_and_protection（719 行）、session_snapshot_wire（905 行）；每次红/恢复/最终 test 都运行全部五项，无 skip、过滤、超时、缺文件或编译错误造红。

**行为红的真实时间顺序与测试字节**

最初骨架在 16:40:45–16:41:01 UTC 成功编译并完整运行五测试，先于首版实现，命中 J_BEHAVIOR。之后首次 clippy 发现测试平台选择函数中的常量断言；只把该选择改为 `std::env::consts::OS` 的 windows/macos match，保留其它平台拒绝，未删除任何行为断言。修复前后的测试 SHA256 分别为 `fa9f8d654d0cbf9fe35588c0170382b542bc46c952e6cf6ac55f05bed543a0d2`、`f8bab5c0f72cdcf694b2016a09cf476a74a657af810492aadec5a1bcc2dc422d`。

为满足最终测试字节证据，用原字节骨架重录了 16:43:05–16:43:15 的行为红，再原字节恢复实现，clippy 和完整 suite 绿后才启动三项负控。必须区分：初次先红使用较早测试字节；最终测试字节的行为红是在 lint 修复后补录，不能声称它早于首次编写实现。全部历史源码、失败日志和两次行为红均保留；final proofAudit 使用后一份与最终测试字节一致的红。

从重录行为红起至全部 final 门，测试文件 SHA256 始终为 `f8bab5c0f72cdcf694b2016a09cf476a74a657af810492aadec5a1bcc2dc422d`，helper 聚合 testHash 为 `bd8ac0891023a9929c13d9ab8e273289fa12b812673b2a1f0b44a1ede3cee89a`。未在负控阶段修改测试。

**三个源码负控与原/坏/恢复哈希**

三项均只改真正生产文件 `packages/lab-session/src/v1.rs`。每次红结束后从 helper 保存的原始源码按字节写回并显式更新时间，立即完整 suite 绿，然后才进入下一项。生产聚合原/恢复 hash 均为 `383366d38209bd20b1066ec0ac9975317a85f0b89beec6cdde66ba9003320d6f`。

| 负控 | 原文件 SHA256 | 坏文件 SHA256 | 恢复文件 SHA256 |
|---|---|---|---|
| nc1：F 扫描使用 fresh CancelToken | `5e8d815dc39542eafa3add169837b1a0e42cbabd374c159276f9662311d4cc12` | `1641482e162c4609fb289f8a55b4f2584ee3595e8ce22820a7a21eb4d872bebb` | `5e8d815dc39542eafa3add169837b1a0e42cbabd374c159276f9662311d4cc12` |
| nc2：返回的 source_facts 改为空对象 | `5e8d815dc39542eafa3add169837b1a0e42cbabd374c159276f9662311d4cc12` | `eef8d21f47ca05af91581e5da42adedaec3b01c3a36ce6c787d6f62bdb6e05da` | `5e8d815dc39542eafa3add169837b1a0e42cbabd374c159276f9662311d4cc12` |
| nc3：summary 未知 logical_bytes 改为 Some(0) | `5e8d815dc39542eafa3add169837b1a0e42cbabd374c159276f9662311d4cc12` | `3e4fa8bbfbc6929ff9315b22a12ba4d92964e5be98b216837efa5ea908cec084` | `5e8d815dc39542eafa3add169837b1a0e42cbabd374c159276f9662311d4cc12` |

完整红日志分别为 [nc1](../../acceptance/wave1/j/2026-10-17T16-44-17.853Z-37004-red-nc1-expected-red.log)、[nc2](../../acceptance/wave1/j/2026-10-17T16-44-47.120Z-26260-red-nc2-expected-red.log)、[nc3](../../acceptance/wave1/j/2026-10-17T16-45-32.977Z-33272-red-nc3-expected-red.log)。每项原/坏/恢复的完整源码快照、逐文件哈希、时间和恢复 suite 日志列表见 worker-audit.json 的 proofAudit。nc1 的坏态产生未使用 cancel 的编译 warning，但编译成功，实际五测试命中共享取消断言；该 warning 不是造红原因。

**bridge 受阻现场**

冻结 [session-batch-check.mjs](../../../scripts/session-batch-check.mjs) 第 94 行在 `debug/deps` 按 `lib<name>-*.rlib` 匹配后执行 `assert.equal(list.length,1,name)`；第 96 行 knownPipeline 在启动 rustc 前调用该选择器。bridge 的 J `cargo build --lib` 已成功，随后选择 `water_scan` 时失败，因此没有 knownPipeline/J-bridge 编译执行日志，也没有 13 快照比较结果。

| 依赖 | baseline 留存产物 | J 依赖构建产物 |
|---|---|---|
| water_scan | `libwater_scan-68ef1203b54365ff.rlib` | `libwater_scan-6175956180c46223.rlib` |
| water_scan_report | `libwater_scan_report-1e18e55450c023a8.rlib` | `libwater_scan_report-812b63a677380b99.rlib` |
| water_report_view | `libwater_report_view-bc978809457c1096.rlib` | `libwater_report_view-d5c44213b86c7371.rlib` |
| water_summary_export | `libwater_summary_export-5d7cc4aa0e43fe1b.rlib` | `libwater_summary_export-6f364859c1f7a713.rlib` |

对 water_scan 的两份原始 fingerprint，rustc/profile/deps/features/rustflags 等值相同，path 指纹分别为 `10763286916239946207` 和 `9320430806962458371`，dep_info 指向各自构建目录；八份原始 fingerprint 已归档。结合产物时间和本次构建顺序，判断是独立 workspace 根构建与 J path 依赖构建产生了不同产物指纹；这不是通过删文件即可合规解决的产品失败。此判断仍以原始指纹和 helper 失败 receipt 为证据，未改 Cargo 或依赖以迎合选择器。

本机没有尝试任何清理或改名 workaround，没有另建检查器冒充冻结 bridge。前四门以及五测试的真实组合结果只能支持其各自范围。

**scope 权限、未验证项和其它失败**

复用派前 active index（归档 SHA256 `fa4480250bcfe18dd264a58fe628e1508f2a777f7e7faa0bc21eec4f9f00cb69`）：11 正常 + 6 负例、81057 内容字节，没有新建第二批；仅冻结 prepare 在原派前创建夹具。本执行者生产和 Rust 测试只读，没有手造或改 marker/ACL/链接，没有移动/删除/清理 fixture。末次通过的 test final 验证 44 份快照一致。测试只在核实 WATER_SESSION_FIXTURE_INDEX 等于本树固定 active index 后读取；生产不读该环境变量。

物理范围仅 F 编译时约束的本 J 树 `.local/fixture-lab/run-*`。普通文件只取元数据，不打开 payload；NativeIo 的 marker/根检查仍有 IO，预取消只保证随后的扫描 IO 为零。未进入其它树 fixture、HOME、整盘或真实用户目录。无任意路径/shell、分类、去重容量、回收、UI/IPC、上传或导出文件；合成 UserSelected 和 scan_id 不授真实权限。

当前仅 Windows 验证；macOS、真实 ACL/ReadDir 迭代故障、恶意并发/真实 scope、J→K 页面、桌面和删除未验证。ScanRejected 在不可伪造的合法 ScanOptions/当前 F 链路下未实测；A 往返拒绝、ProjectionRejected、SummaryRejected、SerializationFailed 和 SnapshotTooLarge 的实际分支也未实测。只核其源码映射/类型/普通输出限额，没有为了覆盖率改旧库或加测试开关。M1 仍未完成。

除上表两次失败门外，材料定位阶段曾使用不存在的 `docs/adr`、`contracts/fixture-scan-v1` 路径，随后改用 `docs/decisions`、`contracts/scan-lab-v1`；一次 Node `-e` 读取 manifest 因 PowerShell 引号失败（SyntaxError），改用 PowerShell JSON 读取；一次只读 receipt 表格命令的 foreach 管道语法失败（ParserError），改用 Node stdin。归档核对的一次只读 Node stdin 脚本因 Windows PowerShell 管道将中文断言字面量转为问号而退出 1，改用 Unicode 转义重跑；归档文件字节未受影响。它们没有产品/fixture 副作用，也不计为产品测试或负控；早期组合探查中子命令的退出码未逐项归档，未虚构完整终端证据。所有 helper 门的失败、退出码与完整原始输出均按上表及原字节归档保留。

按票面“唯一可改”与“禁止改旧 helper/锁；受阻保存现场列最小缺口”的边界，回执后停止实现修改，等待总控正式修订工具及续做安排。
