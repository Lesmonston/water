WATER-W1-Q 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/q/docs/dispatch/reports/WATER-W1-Q-REPORT.md

# WATER-W1-Q 执行回执

2026-10-18（Asia/Tokyo）。执行完成，提交总控独立验收；本回执不代表 VERIFIED 或主线集成。

## 身份、基线与受测提交

- 工作树：F:/new/smaltalk/water/.worktrees/q；分支：worker/water-w1-q。
- 精确起点：34badd897b8983cffbb57e03a9df9e6af52f7b8f；tag：water-w1-scope-export-base-20261018。首次 HEAD 完全一致、工作树干净、packages/redacted-report 不存在。
- 实现及测试受测 SHA：d46b93d652de0ada6d4be0e18cf0d01c06080a75。五个 final 的 before/after 均绑定此完整 SHA，状态为空。
- 实际执行引擎：Codex。会话指令标识为 GPT-6，具体服务端型号未向本会话暴露，不能进一步认定某个 GPT-6 子型号。未使用子代理、外部 CLI 实现者或研究分包。
- 环境：Windows、Node v24.16.0、Rust 1.95.0/MSVC；本树私有离线 Cargo home/target/tmp、locked、jobs=1、单子命令 180 秒、检查串行。
- 后续报告/证据提交只增加本回执和原字节证据，不夹带受测后产品或测试修改。

## 实现及冻结需求对照

新增六个产品文件：Cargo.toml、Cargo.lock、README.md、src/lib.rs、src/v1.rs、tests/redaction_v1.rs。独立 workspace，包名 water-redacted-report，0.1.0 / edition 2024 / rust-version 1.95 / publish=false，四 auto=false，唯一 lib 与 redaction_v1 test。直接依赖恰为真实 A、真实 H、固定 serde 1.0.229（derive）、serde_json 1.0.151；无 unsafe/dev/build/bin 或新增外部包。metadata 门核锁中外部包版本及根锁 checksum。

| 需求 | 实现与证据 |
|---|---|
| 完整来源验证 | redact_json 把原 raw 交真实 A.parse_report，未先转 Value 或删键；DTO 入口先 A.validate_report，再真实 H.summarize_report。九原 raw 和额外非法 DTO 精确对齐 A 错误，被移除字段仍验证。 |
| 私有严格输出 | 顶层九字段、scope 四字段、finding 十二字段、issue 两字段；evidence 仅 code/source，references 仅 state/project_count。私有字段、Debug/Clone/PartialEq/Serialize，无 Deserialize/Default/公开构造器或可变 getter。私有性由源码审阅，未另建编译拒绝工程。 |
| 局部 alias 和关联 | scope/finding 按原序产生局部十进制 alias；BTreeMap 按真实 scope_id 查关联。交错多 scope finding、两个 scope 的 issue、反转 scope 序及一致 ID 双射均验证。 |
| 去除直接字段 | 不保留原 scan/finding/scope/project/tool ID、路径、label、工具文本/root_source、rule_version、evidence.summary、issue.message；无 hash、原报告、字典、facts 或反向映射。14 canary、有效字段改名及 JSON/Debug 检查覆盖。alias 偶然同名通过来源改名不变性验证。 |
| 保留来源事实 | 分类、风险、恢复/活动/置信度、保护原因原值原序；完整 SizeEstimate 的 null/u64 十进制串。24 完整 golden 加补充合法 DTO 覆盖所有导出固定枚举。 |
| 真实 H 汇总 | 完整 H 输出、来源 totals/覆盖/状态/计数原值；另核 risk/category 桶与 finding 分布。Unknown 保持 null，来源总量不由逐项和代替，两个 u32max 不相加。 |
| 错误与上限 | RedactionError 恰 Source/OutputTooLarge/SerializationFailed，所需 traits 及 Display 已测。redact 返回前调用同一个 to_json，UTF-8 <=16,777,216 字节、不截断。实测边界范围见下文。 |
| 纯内存 | 无文件、配置、环境、时钟、随机数、网络、CLI/IPC/UI、P 或扫描接线。没有文件导出/保存交互，anonymity_guaranteed 恒 false。 |

## 五项测试及定向检查

唯一五项测试全部运行，无 ignored/filtered：

| 测试 | 覆盖 |
|---|---|
| redaction_structure | inputs 与 24 golden 输入逐值核对，全部输出键/值精确相等；严格嵌套键集；多 scope 交错关联；补齐 evidence/source/protection/issue 枚举与原序。 |
| redaction_source_validation | 九原 raw 与 A 的精确 code/field/display；额外被剔除字段重复键；18 手工非法 DTO 与 A.validate_report 相同错误；8 MiB 输入超限；错误无 canary。 |
| redaction_aliases_and_privacy | 14 canary、JSON/Debug 无自由文本；scope/finding/project/tool ID 一致双射；有效路径/label/工具/说明变化不改变输出；alias 偶然同名；重复稳定、输入不变。 |
| redaction_precision_and_status | 0、2^53-1、2^53、2^53+1、u64max 精确串/null；全部 size 方法/置信度/shared；两个 u32max 独立；来源 totals 不等于逐项和；空/partial/cancelled；10,000 项目计数。 |
| redaction_public_wire | JSON/DTO/Serialize/to_json 与 24 完整 golden 一致；输出/错误 traits、固定文案；合法超大 DTO 真实输出超限拒绝。 |

执行者重跑 [baseline](../../acceptance/wave1/q/raw/2026-10-18T10-18-46.808Z-40912-baseline-result.json) 通过：真实 A/H、11 H + 13 保留 J 报告、9 原 raw 及来源 hash。此项不是 Q 产品五测。离线 lock、稳定后 fmt/clippy 和四次 suite（首次实现及三次恢复）均退出 0；suite 各为 5 passed / 0 failed。

统一 final 命令：node scripts/scope-export-check.mjs --task WATER-W1-Q --mode <mode> --final。五门均在同一干净受测 SHA 串行通过：

| mode | 退出码 / 结果 | 原始回执 |
|---|---|---|
| fmt | 0 / passed | [fmt](../../acceptance/wave1/q/raw/2026-10-18T10-29-53.277Z-29132-fmt-result.json) |
| test | 0 / 5 passed、0 failed、0 ignored、0 filtered | [test](../../acceptance/wave1/q/raw/2026-10-18T10-30-04.215Z-26748-test-result.json) |
| clippy | 0 / passed，-D warnings | [clippy](../../acceptance/wave1/q/raw/2026-10-18T10-30-15.940Z-39068-clippy-result.json) |
| metadata | 0 / passed | [metadata](../../acceptance/wave1/q/raw/2026-10-18T10-30-33.834Z-22720-metadata-result.json) |
| bridge | 0 / passed | [bridge](../../acceptance/wave1/q/raw/2026-10-18T10-30-41.644Z-28008-bridge-result.json) |

bridge 编译未改动的冻结总控源码，实调 Q/A/H，逐值比较 24 完整 golden、9 原 raw 及 canary；actual_Q_A_H=true、filesystem_scanned=false、export_file_written=false。每个 final 均通过 helper 对四条当前字节红/恢复链的审计。

输出上限实测：常规合法输出经 DTO/JSON/to_json 成功；合法超大 DTO 先过 A.validate_report，随后 redact_report 调用共享 to_json 返回 OutputTooLarge。未构造恰好 16,777,216 / 16,777,217 字节成对输入，不声称精确临界两点实测；未伪造私有输出单独触发 to_json 超限。SerializationFailed 的错误值/traits/Display 已测；生产序列化失败分支未强制触发，仅源码审阅，不声称该分支实测。

## 行为红、真实源码负控及恢复

先完整五测试和可编译骨架，再行为红。测试格式化后重录行为红，final 审计使用后一次。所有红均五项完整运行、Rust 真实退出 101，没有编译/缺文件/超时/测试后门造红；“完整五测红”指整套五项执行且 suite 失败，不是五项均失败。

| 项 / 目标 | 红测汇总 | 原始红回执 | 恢复后的完整五绿回执 |
|---|---|---|---|
| behavior / Q_BEHAVIOR | 1 passed、4 failed；101 | [behavior](../../acceptance/wave1/q/raw/2026-10-18T10-24-37.149Z-43248-red-behavior-result.json) | [suite](../../acceptance/wave1/q/raw/2026-10-18T10-25-47.160Z-24076-suite-result.json) |
| nc1 / Q_NO_FREE_TEXT | 1 passed、4 failed；101 | [nc1](../../acceptance/wave1/q/raw/2026-10-18T10-27-16.378Z-11244-red-nc1-result.json) | [suite](../../acceptance/wave1/q/raw/2026-10-18T10-27-38.490Z-4252-suite-result.json) |
| nc2 / Q_SCOPE_ASSOCIATION | 2 passed、3 failed；101 | [nc2](../../acceptance/wave1/q/raw/2026-10-18T10-28-06.079Z-4080-red-nc2-result.json) | [suite](../../acceptance/wave1/q/raw/2026-10-18T10-28-18.896Z-39676-suite-result.json) |
| nc3 / Q_UNKNOWN_PRESERVED | 2 passed、3 failed；101 | [nc3](../../acceptance/wave1/q/raw/2026-10-18T10-28-37.331Z-40500-red-nc3-result.json) | [suite](../../acceptance/wave1/q/raw/2026-10-18T10-28-49.446Z-21900-suite-result.json) |

nc1 实改 finding_ref 为原 relative_path；nc2 实改 scope alias 生成为恒 scope-1，影响 scope/finding/issue；nc3 在真实 H 返回后把未知 summary.logical_bytes 改 ByteCount(0)，未修改 H。每次 red 之后在 finally 立即按内存保留原字节恢复 src/v1.rs，核测试字节不变，再跑完整 suite 五绿。

三个负控 src/v1.rs 原/恢复 SHA-256 相同：1e3df1ed2b9b80ca3a42ba3eb888d7c4afdffbc03df45073cfb847e90286043f。变异 SHA 及三哈希回执：

| 项 | 变异 SHA-256 | 原/变异/恢复及测试哈希 |
|---|---|---|
| nc1 | f731fd1bcad54b95342ca76df5216f993a129caf5bffbc93ab147861932de72f | [恢复回执](../../acceptance/wave1/q/nc1-restoration.json) |
| nc2 | fc093c9b44e5da68fe646d8083ca81389a7627056a9b4631150251bf619ae994 | [恢复回执](../../acceptance/wave1/q/nc2-restoration.json) |
| nc3 | 5aca4bdbf5ce78a1fedb1570bd256f2f55368edb9595f54aedd247f22010b221 | [恢复回执](../../acceptance/wave1/q/nc3-restoration.json) |

最终生产集合 hash：1d0fea26accb0563a34284ca92ff37f5f64c0162da83c1a4d1344868b18fb150；测试集合 hash：2bfd3741af8e74e05c7ee0be9d4bb770c081a49d2a0e3c2ef8133edfee9af0ac。测试文件 SHA-256：0daacf967810a32e86cbffe51e1b7c2ca327d472416e394da47b48b7fd6fe553。当前行为红、三个负控至所有 final 的测试字节相同。格式化前旧行为红仍归档，其旧测试 hash 不用于 final 证明；helper 保存全部源码/测试原字节快照。

## 归档、失败记录与范围

[证据索引](../../acceptance/wave1/q/evidence-index.json)包含 338 份原始 json/log/txt、2,324,651 字节、逐文件 SHA-256，全部从本树 .local/checks/WATER-W1-Q 原字节复制。一份派前总控 baseline 标为 preexistingControllerBaseline，其余 18 份回执来自本会话。未纳二进制/cache/物理 fixture/真实用户数据，预置 .gitattributes 未改，日志以 -text 保存。[机器可读汇总](../../acceptance/wave1/q/verification-summary.json)绑定完整受测 SHA、五门、四条红/恢复链与限制。

所有 helper 按期望退出 0；预期 red 的 Rust 子命令退出 101。无未解决的产品编译/测试/Clippy 失败。首条 behavior 后格式化测试，随后重录当前字节证明，保留两次原日志。辅助操作出现过文本读取和环境失败：初次 PowerShell 文本读取显式改 UTF-8；曾误定位 TESTS.md、SPEC/ADR 和一个日志文件名，随后改读实际位置；一次 rustup 不在 PATH，随后使用已安装绝对路径的 Rust 1.95.0 rustfmt，仅格式化本票源/测试；回执首次经 PowerShell 管道写入时中文变问号，交付前改用文件编辑工具修正并核验 UTF-8。这些没有作为有效红或通过证据。

交付前复核 51 新冻结条目、九旧锁/198 唯一旧文件，共 227 唯一冻结文件全部 SHA-256 一致。主线、登记、旧 A–O/H 产品/工作树/helper/根 Cargo/上游保持；本票仅改白名单文件。无安装/fetch/联网拉依赖、prepare-scope-export-assets、物理 fixture、新扫描、真实用户数据、清理/删除/移动/ACL、merge/rebase/push 或自行集成。无越界申请、接口或冻结契约变更。

本票仅交付纯内存 JSON。真实文件导出/保存对话框/桌面、真实用户 scope 或扫描、macOS 执行、删除、匿名/不可关联均未验证。精确数量、容量、顺序、关联仍可能形成指纹。报告/证据提交后停止修改，交由总控独立验收。
