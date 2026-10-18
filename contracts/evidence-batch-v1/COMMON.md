# Evidence Batch v1：L/M共同冻结约束

总控2026-10-18冻结。L项目标记证据、M容量观察账本是独立纯内存Rust模块，不修改A–K或根Cargo，不依赖在途K补单。输入为冻结F facts JSON和G ReportContext；必须先调用真实G.assemble_json(raw, context)，不能先Value重序列化、改字段或自己模拟G校验。G错误完整包入AnalysisError::Source，不能吞掉重复键、未知字段、缺nullable、对象枚举、非法身份/路径/状态/计数。

两个crate各有pub mod v1，独立workspace members=["."]、resolver3，0.1.0/edition2024/rust-version1.95/publish=false，autotests/autoexamples/autobenches/autobins=false；唯一lib和显式tests目标。直接依赖恰为water-contracts(path ../../crates/water-contracts)、water-scan-report(path ../scan-report)、serde =1.0.229 features=[derive]、serde_json =1.0.151；无dev/build/unsafe/新包/bin或根workspace变更。各自锁仅沿用根Cargo.lock的registry版本/source/checksum，私有离线Cargo home/target/tmp、jobs1。

共同API形状：analyze_json(input:&str, context:&water_scan_report::v1::ReportContext)->Result<本模块输出,AnalysisError>；to_json(output:&本模块输出)->Result<String,AnalysisError>。名称和输出类型见各票SPEC。AnalysisError公开枚举且恰为Source(water_scan_report::v1::AssemblyError)、OutputTooLarge、SerializationFailed，Debug/Clone/PartialEq/Eq/Display/Error；Source的Display与原AssemblyError完全相同，其余分别严格OutputTooLarge at /analysis、SerializationFailed at /analysis。不得回显输入、ID、路径或serde原错。JSON源输入8MiB边界由G负责。

输出及嵌套结构Debug/Clone/PartialEq/Serialize；字段私有，无Default/Deserialize/任意值构造器或可变getter，不能用测试专用开关造输出。analyze_json返回前以本模块to_json核验可序列化且UTF-8<=33554432；to_json执行同一上限，不能截断。当前受控样本不一定达到输出超限/SerializationFailed分支，若未实测明确只作源码审阅，不私加forge入口。

两输出共有且只允许这些公共头字段：read_only=true、scan_id（G report原值）、source_run_id（facts原run_id）、platform（context平台）、status（G report原值）、source_facts（真实G完整侧车原值clone）、source_totals（G report.totals完整clone）。另外字段由各SPEC精确定义。数组保输入顺序或SPEC指定顺序；不改变输入/context、不依赖locale/环境/时钟/缓存。仅Serialize/to_json不说明匿名或可公开；完整facts含相对标识，禁止上传。

旧G/J/E/H的类别unknown、风险protected和来源totals保持；新分析是独立侧车，不回写旧报告，不产生低风险/可删判断、分配空间、回收量或真实scope权限。生产不读文件/环境/网络、不创建目录/进程/日志、无CLI/IPC/UI。测试仅固定contracts合成JSON；没有物理fixture、真实用户目录、HOME、内容/配置读取或工具执行权限。

定向检查统一scripts/evidence-batch-check.mjs，五个最终门fmt/test/clippy/metadata/bridge；test/suite和所有红模式必须完整精确五测试，offline/jobs1/单子命令180秒，不并行多个重门，不跑整仓/watch/coverage。每项红保存完整原始stdout/stderr和当时生产/测试源码快照与SHA；编译/缺文件/超时不算行为红。

先完成唯一完整测试文件和可编译骨架，red-behavior命中本票标记，然后实现。生产/测试稳定后逐项red-nc1/2/3，实改真正生产逻辑、完整五测命中本票目标；每次原字节恢复后立即suite五测绿。final核各最新红在下一有效红之前已有当前生产/测试字节恢复suite，因此不能fmt/clippy修订后沿用过时恢复证据；测试字节保持一致，若变化重录受影响链。不得改helper、减断言/skip、测试开关或坏依赖造红。

提交实现/测试后同一干净实现SHA串行跑五final门，随后只追加报告/原字节证据，不夹未复测产品；显式文件名add，log用-f，不批量整个目录。实际引擎/模型自报；Windows执行不冒充macOS实测。baseline只验证已验收依赖和输入，明确没有L/M产品或新五测试通过。
