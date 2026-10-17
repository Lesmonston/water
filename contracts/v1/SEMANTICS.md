# scan v1 语义与公开Rust接口

状态：本轮冻结。Schema字段名与枚举是wire权威，本文件定义其余语义；冲突交总控处理。

## 1. 工程与公开API

根workspace只包含 `crates/water-contracts`。Rust edition=2024，rust-version=1.95，package publish=false，运行依赖仅精确serde=1.0.229（derive）与serde_json=1.0.151；Cargo.lock提交。锁文件、依赖或工具链变动由本环境/契约票独占，不添加Tauri或扫描依赖。

crate名`water-contracts`，import名`water_contracts`，公共模块`v1`。公开DTO/枚举与Schema `$defs`同名，字段snake_case；枚举Rust用PascalCase、wire用snake_case（SchemaVersion::WaterScanV1例外，wire严格为`water.scan.v1`）。文本字段可用String，不额外要求文本包装类型。derive/自定义实现选型不限，但必须满足以下接口和不变量。

```rust
// 所有字段结构及枚举见Schema，除下列newtype外可使用公开字段。
pub struct ByteCount(/* 私有u64 */);
impl ByteCount {
    pub fn new(value: u64) -> Self;
    pub fn get(&self) -> u64;
}
impl std::str::FromStr for ByteCount { type Err = ContractError; }

pub struct OpaqueId(/* 私有String */);
impl OpaqueId {
    pub fn new(value: impl Into<String>) -> Result<Self, ContractError>;
    pub fn as_str(&self) -> &str;
}
pub struct RelativePath(/* 私有String，空串表示scope本身 */);
impl RelativePath {
    pub fn new(value: impl Into<String>) -> Result<Self, ContractError>;
    pub fn as_str(&self) -> &str;
}

pub struct ContractError {
    pub code: ContractErrorCode,
    pub field: String, // JSON pointer或明确字段名，不回显原始输入
}
pub enum ContractErrorCode {
    InvalidJson, InvalidShape, InvalidByteCount, InvalidId,
    InvalidRelativePath, DuplicateId, UnknownScope, InconsistentReport,
    UnsafeClassification, InvalidSize,
}
impl std::fmt::Display for ContractError { /* 不回显原始JSON/内容 */ }
impl std::error::Error for ContractError {}

pub fn parse_report(input: &str) -> Result<ScanReport, ContractError>;
pub fn validate_report(report: &ScanReport) -> Result<(), ContractError>;
pub fn to_json(report: &ScanReport) -> Result<String, ContractError>;
```

`parse_report`先拒绝超过8MiB（8388608字节）的UTF-8输入（InvalidShape），再解析serde_json::Value核对完整JSON语法（失败InvalidJson），然后**从原始input再次反序列化DTO**（结构/词法失败InvalidShape），最后语义验证。不得用from_value代替第二步，因为Value会抹掉重复对象键；所有层级重复键必须拒绝，不能last-wins。单独newtype构造返回细粒度InvalidByteCount/InvalidId/InvalidRelativePath；不要求Serde反序列化错误字符串反向恢复细粒度码。`to_json`先语义验证，返回紧凑JSON，输出超过同一8MiB上限也返回InvalidShape；对象键顺序不作为契约，数组顺序和语义值必须保持。

DTO/newtype/枚举提供Debug、Clone、PartialEq、Serialize、Deserialize；需要集合的ID提供Eq+Hash。ContractError及错误码提供Debug、Clone、PartialEq、Eq。不提供会伪造安全状态的Default；禁止unsafe代码。`ByteCount`的get/new不保证其代表实际磁盘回收。

`validate_report`用于已构造DTO，必须验证Schema全部可构造的约束（包括文本长度、scope/数组数量、evidence非空、字段枚举和以下语义），不依赖“它肯定来自parse”。结构/文本/数量超限返回InvalidShape。Serde Deserialize不等于语义通过，调用方公开入口必须使用parse/validate；不把直接derive反序列化成功当授权。JSON输入/输出字节上限在parse/to_json检查，validate不为检查体积而序列化。

## 2. 基础值

- 字节串只接受ASCII十进制规范表示：`0`或非零开头数字，范围0..18446744073709551615。禁止数字JSON、负号、正号、空白、小数、指数、前导零或Unicode数字。序列化必须为JSON string，u64::MAX也不能经过f64。
- OpaqueId满足Schema的ASCII模式，长度1..64；ID不是路径，也不是用户确认或访问权限凭证。
- RelativePath是本地wire中的相对文本：空串表示scope根；非空段由单个`/`连接，保持大小写及Unicode，不做URL解码或Unicode正规化。不允许`.`、`..`段、空段、首尾斜杠、反斜杠、冒号及ASCII控制字符（0..31、127）。`%2e%2e`只作为字面文件名，不可二次解码。
- v1不编码这些被拒绝字符的合法macOS文件名；未来扫描器遇到它们要产生path_unrepresentable issue，不能损失性替换后继续操作。路径词法验证不证明存在、归属或防竞态，也不跟随链接。
- label长度1..80个Unicode标量，summary/message长度1..280个Unicode标量；均不含上述ASCII控制字符。规则版本长度1..32，非空且可打印。不要使用字节数代替Unicode标量数。
- DTO中的Option属性允许显式null，但缺少属性仍是InvalidShape；不得依Serde默认行为接受缺字段。所有对象拒绝未知属性。

## 3. 报告关系（必须顺序可预测）

验证次序：基础/文本与数量 → 重复ID → scope引用 →状态/覆盖 → size →分类。单个用例只制造一种错误；多错误对象可按该顺序返回首错。

- schema_version严格为`water.scan.v1`；scopes数量1..64。
- scope_id在scopes中唯一；finding_id在findings中唯一；二者各自命名空间。重复返回DuplicateId，ID值不进入错误文本。
- finding与issue的scope_id必须存在，未知返回UnknownScope。references.project_ids在各finding内无重复（DuplicateId）；仅表示已观察的项目ID，不证明所有项目均扫描。
- completed要求所有scope.coverage=complete、issues为空、totals.coverage_complete=true。
- partial要求totals.coverage_complete=false，且至少有一个issue或一个非complete scope；不允许cancelled scope/issue（有取消必须报告cancelled）。
- cancelled要求totals.coverage_complete=false，至少一个cancelled scope。所有coverage=cancelled的scope_id组成的集合，必须与全部code=cancelled issue的scope_id集合完全相同；不允许取消issue指向complete/partial scope，也不允许取消scope没有对应issue。其他scope可complete或partial。
- 状态不满足返回InconsistentReport。取消和部分读取不允许报告成completed。

## 4. 容量

- Finding.size.method=unknown时logical_bytes、allocated_bytes都必须null且confidence=unknown；其余method至少一个测量非null，confidence不能unknown，反之返回InvalidSize。
- v1 M1没有回收计划，任何Finding的reclaimable_lower_bytes/upper_bytes均必须null；不允许从逻辑长度估一个可删除量。
- totals.method=unavailable要求logical_bytes/allocated_bytes均null；file_identity_deduplicated或tool_report至少一个非null。totals不是逐finding累加：父子目录、硬链接和共享blob必须由后续计量器证明去重后才能填值。
- allocated与logical不强制大小关系：压缩、稀疏、目录元数据等可导致不同方向。shared=unknown不能伪装成no。v1不验证实际物理块，这是扫描器/平台适配器验收。

## 5. 分类保护

- 风险等级不是操作许可。本轮无任何执行接口。
- category属于model/experiment/history/database/credential/source/unknown时，risk必须protected并至少一个protection_reason。
- confidence为path_only/unknown，或activity=running，或references.state=partial时，同样必须protected且至少一个reason。
- relative_path为空（scope本身）的finding必须protected且含source_root/system_root/user_home/protected_descendant之一；普通清理不能操作根及资产祖先。
- 任何有protection_reasons的finding必须risk=protected；protected也不能没有reason。违反返回UnsafeClassification。
- 同scope内如果finding A的relative_path是protected finding B的严格祖先（按`/`段边界；空串是所有非空路径的祖先，`a`不是`ab`的祖先），A也必须protected且含protected_descendant reason。不能只保护空路径；验证器拒绝未传播的输入，不自动更改它。跨scope不凭字符串推导父子，实际路径/身份关系由后续扫描器负责。实现不得对最多100000个finding做朴素全配对平方遍历，建议按scope和路径排序/索引。
- references.state=unknown要求project_ids为空；否则InconsistentReport。state=known只说明扫描覆盖内的已知引用，不说明全局无人使用。
- 不根据mtime/atime、后缀、目录名或“可下载”给出自动删除许可。证据必须有明确code/source/summary；摘要是解释，不执行代码、不包含凭证或原始对话。该内容隐私需调用者和后续导出层把关，语法验证不能自动识别所有秘密。

## 6. 第一轮之后的模块边界（本轮不实现）

- water-scan：内部持有PathBuf与平台身份/范围授权，产出只读facts，不调用外部命令或删除。
- water-classify：接收facts与规则证据，产出Finding；保护优先，不能扩大扫描范围。
- water-report：按身份/覆盖汇总，做独立脱敏导出，不通过展示路径发起操作。
- water-cli：显式scope入口，调用上述模块，没有默认HOME/全盘，也没有clean子命令。
- Tauri、原生工具清理执行、授权/支付与自动化均在后续阶段。

本轮只实现water-contracts，其他crate及rootworkspace成员清单须由后续票分配，不提前建空壳或并行改入口。
