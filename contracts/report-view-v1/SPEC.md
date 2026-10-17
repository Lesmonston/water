# Report View v1：经契约校验的内存展示投影

总控冻结协议，版本`water.report-view.v1`。它把ScanReport投影为展示数据，不扫描、不分类、不执行、不脱敏，不声明来源是实测或合成。已通过语义校验不表示文件系统事实已核验。

## 工程和唯一API

独立Rust包`packages/report-view/`，package=water-report-view，version=0.1.0，lib=water_report_view，public module=v1；edition2024、rust-version1.95、publish=false，自己包含[workspace]（resolver="3"）和独立Cargo.lock。无bin/example/bench/build脚本，autotests/autoexamples/autobenches/autobins均false，唯一显式测试`tests/view_v1.rs`。不加入或改动根workspace。

直接依赖仅water-contracts（path=`../../crates/water-contracts`）、serde `=1.0.229`（derive）和serde_json `=1.0.151`。无dev/build依赖；所有registry包版本/校验和与根Cargo.lock现有集合一致，离线生成自己的锁，不fetch或安装。

```rust
pub fn project_json(input: &str) -> Result<ReportView, water_contracts::v1::ContractError>;
pub fn project_report(report: &water_contracts::v1::ScanReport)
    -> Result<ReportView, water_contracts::v1::ContractError>;
```

project_json首先对原始input调用A的parse_report；不能先转Value/重序列化或绕过重复键检测。project_report首先调用A的validate_report，不能因DTO已构造就跳过。错误原样返回A的ContractError（code/field不改、不回显输入），不创建新错误码或修复非法报告。JSON输入8MiB限制沿用A。返回模型的Serialize不是脱敏导出接口，也不额外承诺序列化后的体积上限。

ReportView与FindingView提供Debug、Clone、PartialEq、Serialize，不要求Deserialize或Default。crate及测试禁止unsafe。生产模块不读环境/文件/网络，不创建目录、进程、CLI/IPC或缓存；仅使用传入内存。不依赖D或B的事实包，不用LLM或显示路径决定风险。

## 严格输出模型

ReportView公开字段如下；除两个固定字段外直接复用A类型并克隆来源值：

| 字段 | Rust类型 / 来源 |
|---|---|
| view_version | &'static str，恒为water.report-view.v1 |
| read_only | bool，恒为true |
| source_schema_version | SchemaVersion，report.schema_version |
| scan_id | OpaqueId，原值 |
| status | ScanStatus，原值 |
| scopes | Vec<ScopeDescriptor>，顺序和值不变 |
| findings | Vec<FindingView>，按原findings顺序一一投影 |
| issues | Vec<ScanIssue>，顺序和值不变 |
| totals | ScanTotals，原值；不是本模块的容量核验结果 |

FindingView公开字段：

| 字段 | Rust类型 / 规则 |
|---|---|
| id | OpaqueId，finding_id |
| scope_id | OpaqueId，原值 |
| title | String；非空relative_path使用完整原路径；空路径使用所属scope.label，不取basename、不加HTML |
| relative_path | RelativePath，原值，显示文本不成为操作路径 |
| tool_id | String；有tool为`tool:`加原tool_id，无tool为`no_tool` |
| tool_name | String；有tool用原name，无tool固定`Unknown tool` |
| source_tool | Option<ToolDescriptor>，保留完整tool/null，含原ID、版本和root_source |
| rule_version | String，原值 |
| category/risk/recoverability/activity/confidence | A的同名枚举类型，原值 |
| evidence | String；按原顺序用单个LF连接各summary，无前后额外LF |
| evidence_items | Vec<Evidence>，完整结构原值，不能因拼接丢code/source |
| protection_reasons | Vec<ProtectionReason>，顺序和值不变 |
| references | ReferenceSummary，完整原值 |
| logical_bytes | Option<ByteCount>，直接保留size.logical_bytes |
| size | SizeEstimate，完整原值，所有nullable字段保留null |

上述字段全部输出，不增加未列字段。字节Serialize仍为规范十进制字符串/null，不能经f32/f64或JS Number。所有数组保序，两个函数不修改输入、结果不依赖locale/环境/时间。建议用scope_id索引避免每finding重复搜索；不得对最多100000个finding做全配对遍历。

tool_id是展示筛选键，source_tool是原元数据；无tool与真实工具all/unknown/no_tool不能碰撞。C的`all`保留为不限筛选，真实all用tool:all；真实no_tool用tool:no_tool。OpaqueId原语法不含冒号，因此编码不会与no_tool冲突。

不累加findings，不把null当0，不把redownload改写成rollback，不给unknown大小编造permission_denied，不因视图read_only产生任何操作授权。low/high/protected/review等全部原样保留；来源totals即便已填写，也不能改成逐finding求和。保护失败交A拒绝，不自动“降级修好”。

## 冻结合成材料和五测试

cases.json包含四组golden输入/完整expected、原始JSON错误样本与手工DTO变体说明。constructed_cases每项都先从golden_cases中id=base的input经A parse_report生成新DTO，再独立施加该项mutation，不能沿用前一变体或从composite起步。bridge-input.json与bridge-expected.json等于其中composite_partial组；只读，不修改。原66个报告变体与6个raw错误继续从contracts/v1/conformance-cases.json读取。

唯一测试文件精确五个顶层测试，不忽略/过滤：

- view_projection：四个golden从两个公开入口投影，序列化成Value后与完整expected逐值相等，检查固定字段、字段集合和顺序。
- view_validation：全部66个原报告变体、6个原raw及本协议raw样本走project_json，断言原预期code；四个手工DTO变体走project_report，与A的validate_report精确错误相等。canary不回显，包含对象枚举与重复键。
- view_precision_and_totals：0、2^53、2^53+1、u64::MAX与null保留；size与logical_bytes一致、回收字段null；来源totals=37不被八个有重叠可能的finding求和。
- view_preservation_and_purity：输入clone前后相等、重复调用一致；scopes/issues/totals/source_tool/evidence_items/保护/引用/枚举完整保留；scope根标题与同路径跨scope仍保留不同id；空findings也不伪造行。
- view_mapping_edges：tool=null与合法all/unknown/no_tool的筛选键互不混淆；四risk、四activity、五recoverability在合成输入中覆盖；HTML样式文本、Unicode和字面%2e%2e保持文本，不正规化/解码。

读入测试fixture是测试代码权限，生产模块没有文件读取入口。不得把expected直接当生产返回值、按scan_id硬编码结果、修改A/C、删除旧断言或补第六顶层测试。

## 实际桥接与负控

bridge模式由总控冻结的Rust小程序include合成input，调用E真实project_json后Serialize输出JSON，再由Node导入现有C model.mjs执行selectFindings/formatBytes/summarize。对完整expected、BigInt排序、tool:all/no_tool/tool:no_tool、unknown末尾、无求和摘要逐项断言。没有页面/文件选择器/server/Chrome，不接C app，不替换demo-data。不能用expected JSON代替实际Rust输出。

先用可编译骨架与真实测试留下目标AssertionError/Rust断言红，再实现。三项负控逐一临时改真正逻辑、完整五测试命中目标断言红、记录原/坏/恢复三个SHA256、按原字节恢复后五测试通过：

1. 跳过project_report的A校验，手工非法DTO必须在view_validation失败。
2. logical_bytes临时经f64再回整数，2^53+1的view_precision_and_totals必须失败。
3. 把来源未知totals.logical_bytes改成0，view_precision_and_totals或view_projection必须失败。

编译失败、缺材料、超时或测试专用开关不算负控。不做真实数据、文件写入或物理fixture负控。桥接程序的运行只限合成输入与当前树.local；无清理入口。
