WATER-W1-A 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/a/docs/dispatch/reports/WATER-W1-A-REPORT.md

## 交付定位

- 票号：WATER-W1-A；无补充单、无越界申请、无阻塞。
- 权威票面：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-A-CONTRACTS-20261017.md`。
- 工作树：`F:/new/smaltalk/water/.worktrees/a`；分支：`worker/water-w1-a`。
- 精确基线：`a1e68364d47e137f8b66543eb95d35bb04424c78`。
- 实际受测实现提交：`149109f3e835cec96efb3a8b99419ccff2a18713`。四项最终门均在该提交上开始和结束，前后工作树干净。
- 后续收尾提交仅含本报告及证据；产品文件哈希记录于 [implementation-files.json](../../acceptance/wave1/a/implementation-files.json)。
- 执行引擎：Codex / GPT-6（本会话系统标识，未获得更细模型ID）。本轮由单一执行者实现，未启动子代理。
- 本报告表示执行者交付，等待总控独立验收；未合入main，未修改主线manifest/registry，未push或发布。

## 逐项结果

票面没有单列INV编号，以下INV-1至INV-6仅按票面第1节六项建立回执索引，不改变冻结契约。

| 项 | 结果与证据 |
|---|---|
| INV-1 工程底座 | 完成。workspace仅含water-contracts；edition 2024、rust-version 1.95、publish=false；精确工具链1.95.0，包含rustfmt/clippy。metadata核对仅lib及contract_v1两个目标，无自建CLI/example/bench/build脚本。 |
| INV-2 固定依赖 | 完成。仅运行依赖serde `=1.0.229`（derive）和serde_json `=1.0.151`；无dev/build依赖；Cargo.lock已提交。所有锁定依赖来源均为官方crates.io registry。Cargo状态、target和临时目录均由helper隔离到本树.local，jobs=1。 |
| INV-3 公开API | 完成。`water_contracts::v1`提供全部Schema DTO/枚举、三个私有内部newtype、错误类型及parse_report/validate_report/to_json。具备规定的derive能力，ID支持Eq/Hash；无安全状态Default；crate级forbid(unsafe_code)。 |
| INV-4 wire与基础值 | 完成。对象仅接受map；拒绝未知字段、未知枚举、重复键和缺失nullable字段。先用Value检查JSON语法，再从原始input反序列化，未使用from_value。ByteCount全程使用u64和ASCII十进制字符串，无f64中转；相对路径保持Unicode及百分号字面值，文本按Unicode标量计数并允许U+2028/U+2029。 |
| INV-5 报告语义 | 完成。顺序为结构/文本/数量、重复ID、scope引用、状态/覆盖、容量、分类。验证逐scope取消集合一致性、未知引用不冒充已知、M1回收量必须null、未知测量不能当0，以及未知/独有/活跃对象和资产祖先保护。手工DTO的validate/to_json同样校验。祖先检查按scope建立受保护路径索引，排序后逐finding二分查找，未做全配对平方遍历。 |
| INV-6 资源与边界 | 完成。parse输入和to_json输出上限均为8388608字节，to_json先validate再生成紧凑JSON；错误Display仅含错误码和固定字段位置。产品代码仅处理内存，不访问文件系统、用户目录、进程或网络，无扫描授权/清理接口。该结论基于源码审阅与定向测试，不是文件系统安全或真实磁盘行为验收。 |

实现入口见 [v1.rs](../../../crates/water-contracts/src/v1.rs)，调用边界见 [crate README](../../../crates/water-contracts/README.md)。冻结材料、总控脚本、架构和其他工作树均未修改。

本机实际版本：`rustc 1.95.0 (59807616e 2026-04-14)`、`cargo 1.95.0 (f2d3ce0bd 2026-03-21)`，Windows x86_64 MSVC。锁定传递依赖：itoa 1.0.18、memchr 2.8.3、proc-macro2 1.0.107、quote 1.0.47、serde_core 1.0.229、serde_derive 1.0.229、syn 3.0.9、unicode-ident 1.0.27、zmij 1.0.23。Water发布许可证仍未决定；未宣称已完成发布许可审查。

## 测试覆盖与先红

唯一集成测试文件为 [contract_v1.rs](../../../crates/water-contracts/tests/contract_v1.rs)，恰好五个顶层测试，均实际执行，无ignored/filtered。覆盖统计见 [coverage.json](../../acceptance/wave1/a/coverage.json)。

| 测试 | 实际覆盖 |
|---|---|
| conformance_reports | 全部66项；按JSON pointer执行add/replace/remove；断言精确错误码，断言诊断带case id。16项成功输入均执行to_json后再parse并比较完整DTO。 |
| byte_count_round_trip | 0、2^53+1及u64::MAX的new/get/FromStr和Serde字符串无损往返；明确拒绝数字JSON。 |
| primitive_validation | 全部45项：ByteCount有效4/无效13、OpaqueId有效3/无效7、RelativePath有效8/无效10；精确构造错误码。包含末尾换行、Unicode分隔字符、百分号字面值；另加ID 64字符及路径4096/4097个Unicode标量边界。 |
| constructed_report_validation | 全部6项冻结手工DTO变异，分别验证validate_report和to_json拒绝；另加7项文本、版本、证据、reason数量和project ID数量/重复约束。 |
| raw_json_and_resource_limits | 全部6项raw JSON、2项资源用例：8388609字节输入及20000个唯一ID合法finding导致输出超限。验证分类canary不回显；另加恰好8388608字节有效输入和8个对象位置拒绝数组。 |

先红发生于真正执行五项测试后：`conformance_reports`在`control_in_text`断言失败；`constructed_report_validation`在`constructed_empty_evidence: validate`断言失败。此时validate_report尚未执行结构或语义校验，编译成功，汇总为3 passed、2 failed；helper退出1、Cargo退出101。补齐验证后五项全部通过。

先红证据见 [initial-red.json](../../acceptance/wave1/a/initial-red.json)及其receipt和日志；当时生产源码保留为只读证据文本`initial-red-v1-source.txt`，原始LF字节SHA256为`4dcb3a81bc1b9d6ad78faf4ca30200ae5a8c64a4bd3185af41049b197a24aa07`。该文本不是产品源码目标。工程中两次fmt检查失败后按其格式差异修正，原失败记录保留，未把格式失败当行为先红。

## 六项有效负控

全部改动作用于真实生产文件`crates/water-contracts/src/v1.rs`。每项均单独施刀、运行本票完整test、按原字节恢复、核对哈希，再运行本票完整test。未改测试断言、fixture或检查helper。

| 负控 | 文件行与实际改坏 | 指定测试/断言 | 坏态结果 | 恢复结果 |
|---|---|---|---|---|
| [NC-01](../../acceptance/wave1/a/NC-01.json) | 87：ByteCount序列化改为JSON数字 | byte_count_round_trip：must be a decimal string | 3 passed / 2 failed | 5 passed |
| [NC-02](../../acceptance/wave1/a/NC-02.json) | 70：移除前导零拒绝条件 | primitive_validation：byte_count: "01" | 3 passed / 2 failed | 5 passed |
| [NC-03](../../acceptance/wave1/a/NC-03.json) | 502：移除finding的scope引用检查 | conformance_reports：unknown_scope | 3 passed / 2 failed | 5 passed |
| [NC-04](../../acceptance/wave1/a/NC-04.json) | 532：移除祖先保护校验调用 | conformance_reports：protected_descendant_missing_propagation | 4 passed / 1 failed | 5 passed |
| [NC-05](../../acceptance/wave1/a/NC-05.json) | 399：allocated_bytes允许缺字段默认null | conformance_reports：missing_nullable_field | 4 passed / 1 failed | 5 passed |
| [NC-06](../../acceptance/wave1/a/NC-06.json) | 755：to_json移除validate_report调用 | constructed_report_validation：constructed_empty_evidence: to_json | 4 passed / 1 failed | 5 passed |

六次坏态均为目标断言失败，helper退出1、Cargo退出101；不是编译失败、缺fixture或超时。六次恢复完整test均退出0，5 passed、0 failed/ignored/measured/filtered。每项JSON记录精确原文/替换文本、行号、目标断言、命令、日志、receipt以及修改前/坏态/恢复后三个完整SHA256。六项修改前与恢复后生产文件SHA256统一为`f39ea8d8619f05030a0c6cc33e85ba17142061f9352552199ac832596a9bfa72`；与最终受测实现相同。

## 命令、最终门与证据

全部产品检查通过票面helper串行执行。日志首行记录真实binary/argv、cwd、时间和退出码，其后保留stdout/stderr；receipt记录SHA和工作树状态。27次helper执行的完整索引在 [check-index.json](../../acceptance/wave1/a/check-index.json)。唯一含diff尾空格的初次fmt日志使用`.log.json`无损封装保留原文及原始哈希，其原始日志仍在.local。

```powershell
node scripts/worker-check.mjs --task WATER-W1-A --mode baseline
node scripts/verify-contract-assets.mjs
node scripts/worker-check.mjs --task WATER-W1-A --mode lock
node scripts/worker-check.mjs --task WATER-W1-A --mode fetch
node scripts/worker-check.mjs --task WATER-W1-A --mode fmt
node scripts/worker-check.mjs --task WATER-W1-A --mode test
node scripts/worker-check.mjs --task WATER-W1-A --mode clippy
node scripts/worker-check.mjs --task WATER-W1-A --mode metadata
```

baseline、lock、fetch、最终开发态fmt/test/clippy/metadata均退出0。baseline只验证基线、冻结哈希和工具链探针，不是产品测试。`verify-contract-assets.mjs`开工与收尾均运行通过，收尾原始结果见 [contract-assets-verification.json](../../acceptance/wave1/a/contract-assets-verification.json)。开发中的行为红、六次坏态和两次fmt失败均在索引中如实保留。

以下最终命令均在实现提交`149109f3e835cec96efb3a8b99419ccff2a18713`上执行，前后均为同一干净提交；receipt集合见 [final-gates.json](../../acceptance/wave1/a/final-gates.json)。

| 原始命令 | 退出码与结果 | receipt |
|---|---|---|
| `node scripts/worker-check.mjs --task WATER-W1-A --mode fmt --final` | 0，通过 | [fmt](../../acceptance/wave1/a/checks/2026-10-17T05-59-06.433Z-3728-fmt-result.json) |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode test --final` | 0，5 passed，0 failed/ignored/measured/filtered | [test](../../acceptance/wave1/a/checks/2026-10-17T05-59-14.480Z-14744-test-result.json) |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode clippy --final` | 0，warnings作为错误 | [clippy](../../acceptance/wave1/a/checks/2026-10-17T05-59-30.253Z-44020-clippy-result.json) |
| `node scripts/worker-check.mjs --task WATER-W1-A --mode metadata --final` | 0，工程目标/依赖/来源检查通过 | [metadata](../../acceptance/wave1/a/checks/2026-10-17T05-59-34.243Z-31300-metadata-result.json) |

证据归档时修正过一次日志索引生成代码将receipt误选为日志的问题；随后重新生成并校核，未修改产品、测试或helper。提交使用单命令中性身份`Water Worker (external) <water-worker@localhost>`，禁用hooks及提交签名，未改全局Git配置。显式暂存票面文件，并核对范围及`git diff --cached --check`。

## 未验证与交接

macOS未实测；没有交叉编译、应用打包、签名或发布。真实用户目录、文件身份/链接/权限、实际磁盘容量、回收空间和恢复能力均未测试，本票也未实现这些能力。没有运行上游安装/构建/清理脚本、扫描HOME或整盘，未读取凭证。

本票范围内无已知未完成实现或失败检查。后续由总控收取上述实现SHA、复查diff/范围/证据并独立复测；扫描器、分类器、导出器和清理执行器仍属后续工单。本次报告与证据提交后停止修改。
