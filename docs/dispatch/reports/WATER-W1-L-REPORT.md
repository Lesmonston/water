WATER-W1-L 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/l/docs/dispatch/reports/WATER-W1-L-REPORT.md

本回执提交实现供总控独立验收；不自行标记 ACCEPTED、INTEGRATED 或 VERIFIED。
实际执行引擎为 Codex，模型为 GPT-6（会话系统标识，未提供更细构建信息）；没有子代理或另一个 CLI 实现者。

工作树为 `F:/new/smaltalk/water/.worktrees/l`，分支 `worker/water-w1-l`。
起点精确为 `82e158079066bf795fb89fafa933bc2d7fc00bd5`，与票面 r1 tag 一致；首次 Git 状态干净，`packages/project-evidence` 不存在，证据目录仅有冻结的 `.gitattributes`。
受测实现提交为 **`7a545fd1a00d17116d435604233a8a4bd9d08651`**，六个新增产品文件均在白名单。随后只追加本回执和原始证据；没有产品变更。

权威票、主 manifest、ADR-009、批次纪律、COMMON、TESTS.json、L SPEC/cases、G SPEC 和 A 语义均已读取。
主检出接手时已有总控验收脚本改动和 K 验收目录，全部保留；没有修改主检出、其他树、台账、A–K、根 Cargo、helper、冻结或上游。
38 项新锁及七旧锁合计 **151 唯一文件**，baseline、各检查和归档审计均核对原 SHA256 成功。

实现交付与冻结要求逐项对应：

| 要求 | 已实现行为与证据 |
|---|---|
| 严格源验证 | `analyze_json` 首先调用真实 G `assemble_json(input, context)`，不预解析或重序列化输入；`AnalysisError::Source` 保留完整原错误、code/field 和相同 Display。 |
| 四条规则 | 仅精确、区分大小写的四个 basename；普通 file 输出候选，同名 directory/link/other 仅计排除。 |
| 顺序与路径 | 消费 G 全部 finding 的原顺序，非候选同样推进编号；保留跨 scope 重复路径、原始父路径、根空串、Unicode、a/ab 边界与 coverage。 |
| 保守含义 | 所有候选为 filename_only、display_only、protected；三个 verified/known 布尔均 false；不宣称项目存在、格式合法、工具已安装或缓存可删。 |
| 来源保留 | 完整 source_facts 和 source_totals 原值 clone；旧报告分类 unknown、风险 protected、未知容量不变。 |
| API 与输出 | `pub mod v1`，公开 analyze_json/to_json/ProjectEvidence/AnalysisError；输出及嵌套结构字段私有，Debug/Clone/PartialEq/Serialize，无 Default/Deserialize/任意值构造器或可变 getter。 |
| 输出边界 | analyze_json 返回前调用本模块 to_json；两入口拒绝 UTF-8 输出超过 33,554,432 字节，不截断。错误文本严格遵从 COMMON。 |
| 纯度与复杂度 | 生产代码只处理内存；G 后按 entry 单遍和路径字节推导，无全配对遍历；无环境、磁盘、网络、时钟、进程、日志、CLI、IPC、缓存、B 路径展开或 UI/K 接线。 |
| 工程 | 独立 workspace/锁，四个精确获准依赖，显式 lib/test，四项 auto=false，无 dev/build/bin/unsafe；锁由专用 helper 离线生成。 |

全部执行命令使用 `node scripts/evidence-batch-check.mjs --task WATER-W1-L --mode <mode>`，最终门追加 `--final`；Windows、Node v24.16.0、Rust 1.95.0/MSVC，离线、jobs=1、单子命令 180 秒，串行执行。没有安装、fetch、物理 fixture、真实目录扫描、内容读取、浏览器或清理。

本次 baseline 为 `checks/2026-10-18T04-28-26.118Z-40316-baseline-result.json`，退出 0：真实 A/G 验证 10 份 L、15 份 M 合成输入及 11 个错误，不运行新产品测试。归档内另有派前已存在的 `2026-10-18T04-07-06.175Z-43512-baseline-result.json`，不是本会话执行。

唯一完整测试目标 `tests/evidence_v1.rs` 包含且只包含：

- evidence_candidates：全部 10 份 golden 完整键值、四规则与同名非文件排除；
- evidence_validation：全部 11 个冻结 raw/context 错误逐项与真实 G 比较，canary 不泄漏，额外测试 >8 MiB 源输入、context 缺 scope/错序，以及合法 facts 触发 G 的 ReportRejected；
- evidence_coverage_and_paths：partial/cancelled/空快照/根 issue 空串、跨 scope、Unicode/原样父路径、顺序，并使用独立 run/case/scan ID、反转 entry 和合成 macos context 验证不按样本 ID 分支；
- evidence_preservation_and_purity：原始输入/context 不变、来源 facts/totals 完整保留、旧分类/容量不变、clone/重复调用/交替输入确定性；
- evidence_public_wire：真实公开 API、Serialize/to_json 一致、全部 wire 字段与 golden 比较、filename_only/未验证布尔、错误枚举/Display/Error。

11 个冻结错误是 g-duplicate-key、g-syntax、unknown-field、missing-nullable、object-enum、counter、empty-entry-path、windows-unix、context-id、context-label、duplicate-top-key，均保持原 G code/field。

实现前已写完整五测试与可编译骨架。首次行为红在 `2026-10-18T04-31-16.494Z-29520-red-behavior-result.json`：Rust 101，1 通过/4 失败，含 L_BEHAVIOR；其中额外 G 输出超限样本当时路径过短，G 接受了该样本，validation 意外失败。已在实现前将合成路径加长 400 字符，并把源错误样本意外成功的 panic 改为固定文本，避免打印整份大 bundle；没有减断言。完整重录为 `2026-10-18T04-32-11.141Z-34424-red-behavior-result.json`：Rust 101，2 通过/3 失败，validation 通过，L_BEHAVIOR 命中。此后测试文件字节未变。

实现首次完整 suite 在 `2026-10-18T04-32-59.012Z-31816-suite-result.json` 五测全绿。格式/clippy 修订后，最终稳定源码先跑 `2026-10-18T04-34-58.716Z-632-suite-result.json` 五测绿，再依次执行下列真实生产负控：

| 负控 | 实际修改与命中 | 完整红回执 | 原字节恢复后完整五测绿 |
|---|---|---|---|
| nc1 | 删除非 file 分支的 continue，让非文件也进入候选；L_FILE_ONLY，Rust 101，3 通过/2 失败 | 2026-10-18T04-35-22.692Z-2092-red-nc1-result.json | 2026-10-18T04-35-36.009Z-12304-suite-result.json |
| nc2 | 生产 format_verified 改 true；L_FILENAME_ONLY，Rust 101，2 通过/3 失败 | 2026-10-18T04-35-52.521Z-40860-red-nc2-result.json | 2026-10-18T04-36-13.380Z-26584-suite-result.json |
| nc3 | 克隆后将输出 source_totals.logical_bytes 改 Some(0)；L_SOURCE_TOTALS，Rust 101，1 通过/4 失败 | 2026-10-18T04-36-31.639Z-34464-red-nc3-result.json | 2026-10-18T04-36-47.641Z-28188-suite-result.json |

每项红均实际执行精确完整五测试，无缺文件、编译失败、超时或测试开关；随后立即从 helper 保存的稳定源码快照按原字节写回，更新 mtime、核 SHA256，再 suite 全绿，才开始下一项。final 的 proofAudit 核对完整恢复次序和当前生产/测试字节。

三次负控 `src/v1.rs` 的原值与恢复值均为 `d59c3b78288580f802ef450244dd24832cae9fa52d981c971a1f9314eab44f57`。坏值分别为：

| nc1 | nc2 | nc3 |
|---|---|---|
| 1e7bab9094576b4128f340f06cf29efab1af80c28d4a5e899dc8fca343ba6be9 | d6a0de2fbf9657b580f2784ce2280a44d36c630e84c49de1d50ee2ae3de92c03 | f97d618497309de64f1cf4ada4ed375e89fb6959db78bb7aa8a68f1254e09d9a |

`src/lib.rs` 始终为 `f794758eb4e2826334133088b76b6520320dc5cd359525cb379a714cc46af8c4`，最终测试文件始终为 `336d33c8fb2e937ee9a78902235008cc277f5b78c6813eae3dcee4427a7225e3`。
最终生产集合哈希为 `669fee774df737fda9c5e0c0c2d2aacac393af4eea59aca2b817b7c9c8003da8`；测试集合哈希为 `d31429ce401f0bafefd46dfbc76cb809f407da7b6ab69a15f6cee9a512767118`。
逐文件原/坏/恢复三哈希、源码快照文件名和完整链条在 [validation-summary.json](../../acceptance/wave1/l/validation-summary.json) 的 proofs 内。

以下五 final 均在同一干净完整实现 SHA 上串行运行，helper 和所有子命令退出 0：

| final 模式 | 原始回执文件名（本票 checks/ 内） | 结果 |
|---|---|---|
| fmt | 2026-10-18T04-37-14.914Z-9344-fmt-result.json | 通过 |
| test | 2026-10-18T04-37-23.011Z-9560-test-result.json | 5 passed，0 failed/ignored/measured/filtered |
| clippy | 2026-10-18T04-37-46.863Z-15356-clippy-result.json | 全目标 -D warnings 通过 |
| metadata | 2026-10-18T04-37-57.095Z-35188-metadata-result.json | workspace、目标、依赖和锁校验通过 |
| bridge | 2026-10-18T04-38-03.856Z-42356-bridge-result.json | 实际本库 analyze_json/to_json 与真实 G，10 完整 golden/11 来源错误通过 |

所有 helper 失败原样保留：

- `2026-10-18T04-30-47.992Z-29828-fmt-result.json`：测试排版，helper/子命令退出 1；在首次 red 前按 diff 调整。
- `2026-10-18T04-33-23.553Z-8988-fmt-result.json`：生产 for 链排版，helper/子命令退出 1；在负控前修正。
- `2026-10-18T04-33-41.445Z-39884-clippy-result.json`：Coverage/Platform/ScanStatus 为 Copy 而调用 clone，helper 退出 1、Cargo 退出 101；在负控前移除三个多余 clone，未放宽 warnings。
- 两次行为红及三个负控红的 Rust 101 是预期失败；上文说明首次额外 validation 的非预期失败，未把该分支当超限通过。

非产品的只读材料查询曾遇到默认文本编码乱码、误读不存在的 TESTS.md（实际为 TESTS.json）、查询尚不存在产品目录、以及 PowerShell 传给 node -e 的引号丢失；均改用 UTF-8/实际文件/标准输入完成读取，没有因此修改材料、环境或权限。

[evidence-archive.json](../../acceptance/wave1/l/evidence-archive.json) 清点本树 helper 全部 **368 份 json/log/txt，12,436,836 字节**，含派前已有 baseline、所有失败、完整 stdout/stderr 和当时源码快照。它们从 `.local/checks/WATER-W1-L/` 原字节复制到 `docs/acceptance/wave1/l/checks/`，逐份校验 SHA256；不含构建二进制。未清理任何目录或缓存，新增文件以显式文件名暂存，日志使用 -f。

32 MiB 上限两入口实现已作源码审阅，但本轮未实际触发 L 的 OutputTooLarge；SerializationFailed 的转换逻辑已审阅，未通过实际输出触发。测试只验证这两种公开错误的 trait 和固定文本，不冒充覆盖产生分支，也没有私加输出伪造入口。G 的 >8 MiB 输入拒绝和 ReportRejected 已实际测试。

全部数据为固定或内存派生合成样本。合成 macos context 只验证序列化/推导，不是 macOS 采集实测；真实用户 scope、物理 fixture、真实文件内容、项目归属、分类提升、页面/桌面/K 接线、卷唯一空间、可回收量、macOS 和删除均未验证。M1 未完成。
无越界申请、待修已知产品失败或额外依赖需求；无 push、merge、rebase、发布或主线集成。实现和回执提交后停止，交总控独立验收。
