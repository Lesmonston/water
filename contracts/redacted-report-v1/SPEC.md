# Redacted Report v1 — 默认去除路径与自由文本的逐项报告

packages/redacted-report，water-redacted-report/water_redacted_report/pub mod v1；独立workspace members=["."]/resolver3，0.1.0/edition2024/rust-version1.95/publish=false，四auto=false，唯一lib/tests/redaction_v1.rs。直接依赖恰为water-contracts(path ../../crates/water-contracts)、water-summary-export(path ../summary-export)、serde =1.0.229 features=[derive]、serde_json =1.0.151；无unsafe/dev/build/新包/bin。私有离线Cargo锁/home/target/tmp，jobs1，根Cargo不变。

```rust
pub fn redact_json(raw: &str) -> Result<RedactedReport, RedactionError>;
pub fn redact_report(report: &water_contracts::v1::ScanReport)
    -> Result<RedactedReport, RedactionError>;
pub fn to_json(report: &RedactedReport) -> Result<String, RedactionError>;
```

redact_json必须把原raw先交真实A.parse_report，不先Value重排/删字段；DTO入口先真实A.validate_report。被剔除字段仍全部验证；再调用真实H.summarize_report，不能复制H实现。RedactionError恰Source(A ContractError)、OutputTooLarge、SerializationFailed，Debug/Clone/PartialEq/Eq/Display/Error；Source Display与A原错相同，其余分别严格OutputTooLarge at /export、SerializationFailed at /export。错误不含原文/ID/路径/serde原错。输出及嵌套结构Debug/Clone/PartialEq/Serialize，字段私有，无Deserialize/Default/任意构造器/可变getter。

## 严格wire白名单

顶层恰export_version="water.redacted-report.v1"、source_schema_version=A原值、read_only=true、redaction_profile="structural_no_paths_v1"、anonymity_guaranteed=false、summary=真实H完整输出、scopes、findings、issues。没有source_facts/原报告/scan_id或自由文本附件。输入/context不变、不依赖环境/时钟/随机数/外部字典，重复相同输入字节稳定；输出UTF-8<=16777216，redact返回前与to_json执行同一上限、不截断。输入8MiB限制由A负责。

- scopes按原序，每项恰scope_ref="scope-1"起的局部十进制序号、platform/origin/coverage原A枚举。映射key为来源scope_id，不能按finding位置猜scope。
- findings按原序，每项恰finding_ref="finding-1"起的局部序号、scope_ref、has_tool(bool)、category、risk、recoverability、activity、confidence、evidence、protection_reasons、references、size。分类/风险/恢复/活动/置信度及protection_reasons原值原序；size完整A SizeEstimate clone，null和规范u64字符串原样。
- evidence按原序，每项仅code/source两个A固定枚举，不保留summary。
- references仅state原A枚举、project_count=project_ids.len()的u32；不输出项目ID、hash或恢复映射。
- issues按原序，每项仅code原A枚举、scope_ref映射；不输出relative_path/message或其片段。
- summary恰真实H输出全部字段/原容量/覆盖/状态/计数，不能用逐项sum、过滤后重算或Unknown→0替换。H风险/类别桶与逐项分布应一致。

局部alias不是全局/跨报告稳定伪名，也不哈希原值。源字符串偶然等于固定alias不代表保留其来源；需用独立canary/一致ID双射验证。所有String只来自固定版本/profile、局部序号、A固定枚举和字节串；不得携带任何原scan/finding/scope/project/tool ID、relative_path/label、工具name/version、rule_version、evidence.summary、issue.message、native文件ID或路径片段。用明确类型白名单构造，不clone整Value后删键。精确数量、大小/顺序/关联仍可形成指纹，不承诺匿名、秘密全清或适合公开上传。

生产只做内存变换和JSON，禁止读文件/配置/HOME/环境/网络、写导出文件、CLI/IPC/UI/浏览器/上传/保存对话框。不接P、不扫描、不重新分类，不改A–O或H。后续由桌面调用方处理用户保存交互。L/M完整facts不是本票输出，保持移除。

## 五测试与独立golden

唯一redaction_structure、redaction_source_validation、redaction_aliases_and_privacy、redaction_precision_and_status、redaction_public_wire。cases.json由11份既有H报告和13份保留J实际报告形成24份冻结golden；来源经真实A/H复核。raw_errors保留原raw和A code/field，不因不导出字段而跳校验。正例全部键/值精确相等，公开JSON/DTO/Serialize/to_json往返一致；不能按case/scan_id匹配expected。

覆盖全部A风险/类别/证据/保护枚举、双scope交错finding与issue、空/partial/cancelled、u64max/2^53邻值/null、H两个u32max不相加、canary在所有自由字段、scope/finding/项目ID双射不改变输出、路径/label/工具/说明字段有效变化不改变输出、来源totals不等于逐项sum、输入不变。额外手工非法DTO与真实A.validate_report的code/field一致；原raw重复键/未知字段/对象枚举/缺nullable均拒绝。输出超限/SerializationFailed若未实测如实标源码审阅，不为测分支开forge入口。

行为红Q_BEHAVIOR；实源码负控nc1把原relative_path写进finding_ref→Q_NO_FREE_TEXT；nc2所有scope_ref错误固定scope-1→Q_SCOPE_ASSOCIATION；nc3来源summary未知logical_bytes改0→Q_UNKNOWN_PRESERVED。完整五红/原字节恢复五绿按COMMON；不修改helper或测试、无编译/超时造红。
