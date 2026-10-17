# Summary Export v1：白名单汇总导出

冻结协议water.summary-export.v1。H只依赖已验证A，与F/G/I并行。独立packages/summary-export，package water-summary-export/lib water_summary_export/pub mod v1；自有workspace resolver3/Cargo.lock，Rust1.95/edition2024/publish=false/四auto=false，唯一tests/export_v1.rs。只依赖本地A、serde =1.0.229 derive、serde_json =1.0.151；无unsafe/dev/build/新包/bin。

```rust
pub fn summarize_json(input: &str)
    -> Result<SummaryExport, water_contracts::v1::ContractError>;
pub fn summarize_report(report: &water_contracts::v1::ScanReport)
    -> Result<SummaryExport, water_contracts::v1::ContractError>;
```

JSON入口先把原始文本交A parse_report，DTO入口先A validate_report；错误code/field原样返回，不回显原文。被移除字段也必须验证，不能因“不会导出”绕过A。输出及计数结构Debug/Clone/PartialEq/Serialize，无需Deserialize/Default。生产纯内存，无文件/路径/环境/网络/时钟/进程/缓存/日志，不写导出文件；调用方可Serialize结果。

## 严格白名单

SummaryExport公开字段且只有：export_version:&'static str="water.summary-export.v1"，source_schema_version:A SchemaVersion原值，read_only:bool=true，status:A ScanStatus原值，counts:ReportCounts，risk_counts:RiskCounts，category_counts:CategoryCounts，totals:A ScanTotals完整克隆。

ReportCounts严格scopes/findings/issues三个u32，分别为来源数组长度。RiskCounts严格low/review/high/protected四个u32。CategoryCounts严格download_cache/build_cache/environment/model/experiment/history/database/credential/source/temporary/unknown十一个u32。每条finding各进入一个风险桶和一个类别桶，零桶仍输出；字段顺序不限。使用明确结构构造，不克隆整报告Value再删字段，无动态键、样例行或原始子报告。

不能输出scan/finding/scope/project/tool ID、路径、label、工具名/版本、规则版本、evidence、references、issue.message、hash或其它自由文本。所有字符串仅固定版本、A固定枚举和来源totals字节串。counts不是totals.scanned_entries；issues不是skipped_entries，不替换或相加。A验证后数组边界保证计数<=100000（scope<=64），用整数checked/try_from处理，不用float/wrap/饱和。

totals方法、coverage_complete、两个字节及scanned_entries/skipped_entries逐值保持。未知不改0、不从finding相加、不用被过滤项重算，不把来源汇总当H核验过的磁盘容量。u64max、2^53+1字节保持字符串，两个u32max计数分别保留不相加。completed/partial/cancelled原值，不按计数重新推状态。

此接口去除直接标识和自由文本，但精确容量/分布仍可形成关联指纹，不承诺匿名不可关联；不叫“可安全公开”或“已去除一切秘密”。无逐项脱敏、上传或UI入口。

## 五测试与三负控

唯一tests/export_v1.rs，精确export_whitelist、export_validation、export_precision_and_totals、export_counts_and_status、export_invariance_and_purity。cases.json正例完整expected逐值相等，递归字段白名单；所有被剔除字段放不同canary，真实Serialize不得泄漏。A原66变体/6raw及新重复键/未知字段/对象枚举/缺nullable回归，手工非法DTO验证错误与A精确相等。

覆盖0/2^53/2^53+1/u64max/null、两个u32max不相加、来源totals37不被finding相加、四风险/十一类别/零桶、completed/partial/cancelled、空finding/issue。只改一致ID双射/文本/工具字段/数组顺序且汇总信息不变的两有效报告，导出完全相等；输入不变，重复结果确定。不得按fixture或scan_id硬编码输出。

三个有效负控：①DTO入口跳过A校验，手工非法DTO断言红；②真实SummaryExport新增scan_id并复制来源，精确键/canary断言红；③未知totals.logical_bytes改Some(0)，unknown/精度断言红。每项完整五测、目标断言失败、三hash/原字节恢复/mtime更新后完整五测绿。编译/超时不算红。最终fmt/test/clippy/metadata/bridge同一干净实现SHA，bridge实际调用H公开入口后Serialize核对，不以expected冒充运行。
