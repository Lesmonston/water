# Scan Report v1：保守报告组装

总控冻结协议`water.scan-report.v1`。G与F并行，只读传入内存；不依赖F crate，不做IO/分类/去重/真实授权。独立packages/scan-report，package water-scan-report/lib water_scan_report/pub mod v1；Rust1.95、edition2024、publish=false、自有workspace resolver3/锁、四auto=false，只有lib及tests/report_v1.rs。依赖仅本地A、serde =1.0.229 derive、serde_json =1.0.151；无unsafe/新包/dev/build依赖或bin。

## API

```rust
pub struct ScopeContext { pub scope_id: water_contracts::v1::OpaqueId,
    pub label: String, pub origin: water_contracts::v1::ScopeOrigin }
pub struct ReportContext { pub scan_id: water_contracts::v1::OpaqueId,
    pub platform: water_contracts::v1::Platform, pub scopes: Vec<ScopeContext> }
pub struct ReportBundle { /* private */ }
impl ReportBundle {
    pub fn report(&self) -> &water_contracts::v1::ScanReport;
    pub fn source_facts(&self) -> &serde_json::Value;
}
pub fn assemble_json(input: &str, context: &ReportContext)
    -> Result<ReportBundle, AssemblyError>;
```

Context/ScopeContext提供Debug/Clone/PartialEq；Bundle提供Debug/Clone/PartialEq/Serialize，严格输出`{bundle_version:"water.scan-report.v1",report,source_facts}`。没有公开任意路径/文件API、时钟、环境、命令、缓存或日志。source_facts只保存通过验证的完整输入语义值（含kind/depth/identity及issue来源），不可用报告投影替代；对象键顺序不限，数组保序。

AssemblyError公开code:AssemblyErrorCode、field:String，实现Error/Display/Debug/Clone/PartialEq/Eq；AssemblyErrorCode也提供Debug/Clone/PartialEq/Eq。码固定InvalidJson/InvalidFacts/InvalidContext/ReportRejected；field仅/facts、/context、/report，不回显输入/ID/路径/原生错误。输入超8MiB为InvalidFacts；先JSON语法验证，失败InvalidJson，再从**原始文本**严格反序列化私有DTO；不得Value→from_value抹去重复键。所有层级拒重复/未知/缺字段、位置数组、对象枚举、缺nullable。JSON字节/ID/路径/枚举沿用A语法。数据仍不授予任何访问权。

## 输入不变量

字段集合遵从冻结scan-lab-v1第4节：facts_version/run_id/case_id/status/visited_entries/recorded_entries/scopes，以及全部scope/entry/issue/identity字段。facts_version必须water.scan-lab.v1；run_id完整run-[a-z0-9][a-z0-9-]{0,47}，case_id为1..64字符ASCII小写字母/数字/连字符且首位字母；不要求查D case表，不把case_id作为分支或授权。

scopes为1..64，scope_id唯一，relative_root为非空A RelativePath；每scope entries路径非空、唯一、不跨scope去重，depth为路径段数1..64；前序顺序保留，不强制名称已排序。File逻辑长度必须Some；其它kind逻辑长度null；allocated_bytes始终null。Unknown身份三个nullable全null；Unix三者Some且inode>0/link_count>=1，仅File/Directory可Unix；Windows上下文的任何identity必须Unknown。所有ByteCount规范字符串，不经float。

每scope visited>=entries.len，所有visited和recorded累加用checked整数且分别等于顶层计数；全局visited<=10000、recorded<=visited，issues总数<=100000。scope/entry数量先查界再处理，不能溢出或静默截断。code为A IssueCode；origin/operation只接受F列出的枚举。completed要求全部scope complete且issues空；partial要求至少一个partial，无cancelled scope/issue；cancelled至少一个cancelled scope，cancelled scope与cancelled issue的scope集合完全相等。complete scope不得含issue；partial必须有至少一个issue；cancelled必须有cancelled issue。其它issue可以共存。context.scopes ID与顺序必须和facts完全相同，label按A标量长度1..80/无控制字符；非法为InvalidContext。上下文origin仅为调用者提供的来源声明，不是扫描权限。

## 唯一映射

report.schema_version=WaterScanV1、scan_id取context；status/coverage原样，scope label/platform/origin取对应context。按scope/entry原顺序每entry一finding，global ID严格entry-1、entry-2…（从1起，不依赖输入路径或hash）。不补造scope根项，不过滤链接/Other，不合并硬链接/重叠scope。

全部finding：tool=null、rule_version="scan-report-v1"、category=unknown、risk=protected、recoverability/activity/confidence均unknown；evidence严格一项`{code:"unknown",source:"filesystem",summary:"Metadata observation only; classification and ownership are unverified."}`。protection_reasons按顺序unknown_ownership、incomplete_evidence；同scope已记录严格祖先再追加protected_descendant。按`/`段边界处理，a不是ab祖先；使用路径排序/索引，不能O(n²)。references严格unknown/[]，shared=unknown。

仅File保留logical_bytes，size.method=logical_sum/confidence=measured（一个元数据长度，不是目录总和）；其余kind size.method=unknown/confidence=unknown/逻辑null。allocated及两个reclaimable恒null。Unix身份不推出共享/no或可回收量，完整身份仅留sidecar。

issues按scope声明顺序再按该scope原issues顺序映射；code/path原值、scope_id取所在scope。message严格`Scan lab issue; origin=<wire-origin>; operation=<wire-operation>.`，例如injected/read_dir，不插入路径/错误文本，不将注入描述为真实权限故障。totals.logical_bytes/allocated_bytes=null、method=unavailable、coverage_complete仅status==completed；scanned_entries=recorded_entries、skipped_entries=visited_entries-recorded_entries。此skipped只计已尝试未记录项，未枚举项未知，不是总遗漏数量。

返回前调用真实A validate_report及to_json保证报告关系和8MiB输出限制；失败ReportRejected，不降级修好/截断。Bundle不是脱敏导出，source_facts含相对标识，不能直接上传。G只证明合成JSON协议适配；F→G真实公开入口接线由总控后验收。

## 五测试与三负控

唯一tests/report_v1.rs，精确五顶层测试：report_strict_input、report_coverage_and_issues、report_conservative_findings、report_size_identity_and_overlap、report_public_roundtrip。cases.json每项独立input/context/expected_bundle；额外覆盖重复键/未知/缺字段/对象枚举/位置数组、非法字节/深度/身份/计数、上下文错序；错误不回显canary。测试用A真实验证及往返，E真实投影由冻结bridge核验，不给G增加E依赖。

覆盖completed/partial/cancelled、已完成scope后取消；a/ab祖先边界、伪cache/模型/凭证均未知保护；0/2^53/2^53+1/u64max、目录/链接/Other未知、Unix/Unknown身份和跨scope同路径完整保留；输入不变/确定性。raw/mutation负例统一从id=project-markers独立取新副本/context，不沿用前例。report_public_roundtrip内部另构造<=8MiB事实、<=10000条记录但组装报告超A的8MiB上限，断言ReportRejected，不能截断。不得把expected直接返回或在src嵌入case/run/path样本。

三个可编译有效负控：①严格原文解析改last-wins Value再解析，重复键断言红；②将无后代的一个File改为download_cache/low/native并移除保护，G保护断言红（编译错误或仅A拒绝不算目标证据）；③totals按文件求和并改file_identity_deduplicated，未知totals断言红。每项完整五测试、目标断言失败、原/坏/恢复逐文件三hash、原字节写回并更新mtime后完整五测试绿。最终fmt/test/clippy/metadata/bridge在同一干净实现SHA运行。
