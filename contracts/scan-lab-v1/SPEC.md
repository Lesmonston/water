# Scan Lab v1：受控夹具的只读遍历事实

总控冻结协议，版本`water.scan-lab.v1`。本票不实现一般用户目录扫描器、Finding/ScanReport组装、工具识别、内容读取、空间汇总、E投影、UI/IPC或删除。

## 1. 工程与边界

独立`packages/fixture-scan/`，package=water-scan，version=0.1.0，lib=water_scan，module=fixture_v1；edition2024、rust-version1.95、publish=false、自有[workspace] resolver3和Cargo.lock。不加入root workspace。无bin/example/bench/build，auto四项均false，唯一测试目标`tests/scan_v1.rs`。

依赖仅water-contracts（path ../../crates/water-contracts）、serde =1.0.229（derive）、serde_json =1.0.151；无dev/build依赖，registry来源/版本/校验和沿用根锁。禁止unsafe、nightly、新包、网络下载、全局配置或旧产品/锁变更。

只允许本工作树`.local/fixture-lab/<run_id>`，从编译时CARGO_MANIFEST_DIR向上两级推导工作树。没有运行时环境覆盖、任意root参数、CLI或文件选择器。生产库唯一内容读取是最多65536字节的D marker；普通文件只读取元数据，不打开内容。遍历仅通过本协议IO trait。

## 2. 唯一公开入口与路径token

```rust
pub struct FixtureRun { /* private; no Deserialize/Default */ }
pub fn open_fixture_run(run_id: &str) -> Result<FixtureRun, ScanError>;
impl FixtureRun { pub fn run_id(&self) -> &str; pub fn case_id(&self) -> &str; }

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanOptions { /* private */ }
impl ScanOptions {
    pub fn new(max_depth: u32, max_entries: u32, max_dir_entries: u32)
        -> Result<Self, ScanError>;
    pub fn max_depth(&self) -> u32;
    pub fn max_entries(&self) -> u32;
    pub fn max_dir_entries(&self) -> u32;
}

#[derive(Debug, Clone)]
pub struct CancelToken { /* shared AtomicBool */ }
impl CancelToken {
    pub fn new() -> Self;
    pub fn cancel(&self);
    pub fn is_cancelled(&self) -> bool;
}

pub fn scan_fixture(run: &FixtureRun, options: &ScanOptions, cancel: &CancelToken)
    -> Result<ScanFacts, ScanError>;
pub fn scan_fixture_with_io<I: ReadOnlyIo, O: ScanObserver>(
    run: &FixtureRun, options: &ScanOptions, cancel: &CancelToken,
    io: &I, observer: &O
) -> Result<ScanFacts, ScanError>;
```

max_depth=0..64，max_entries=1..10000，max_dir_entries=1..1024，完整u32检查。非法options在扫描IO前返回InvalidOptions。CancelToken clone共享同一状态；取消单向，不能reset。无会伪造安全状态的Default。

ScanError公开code和field，实现Error/Display/Debug/Clone/PartialEq/Eq；code为InvalidRunId/UnsafeRoot/InvalidMarker/InvalidOptions/IoError/Unsupported，field只用`/run_id|/run_root|/marker|/options`。错误不含原输入、绝对路径、原生IO文本或文件内容。

run_id严格完整匹配`run-[a-z0-9][a-z0-9-]{0,47}`，含尾换行/U+2028均拒绝。先检查词法，不能触及候选路径后才拒绝。从固定编译绝对路径的文件系统根（Windows盘根）开始，逐组件只查元数据，确认到工作树的固定前缀及.local、fixture-lab、run都是普通目录且非链接/重解析点；不枚举这些祖先。候选是lab直接子目录。先no-follow、后组件包含检查；不对未检查的marker绝对路径canonicalize。NativeIo复查采用同一起点。

FixtureRun与ScanNodePath提供Debug，但仅显示run/case或相对标识，不输出私有绝对路径。其它私有字段由执行者实现，不增加公共任意路径构造器。

marker必须存在、是普通非链接文件、体积<=65536。读取本身也必须有界（最多limit+1），不能只信读取前的len。**直接从原始文本反序列化**严格结构，拒绝重复键/未知字段、非字符串版本/枚举、必填nullable缺失；不能先Value再from_value。marker结构遵从D SPEC：全部根字段、scope/node/canary/scanner_plan的字段集合、nullable及类型必须完整。fixture_version、run_id、case_id、节点path/kind/顺序、scope_id/path/顺序与编译嵌入的D cases精确对应；scanner_executed=false。status仅complete/partial，节点created/unsupported及error_code符合D定义；至少一unsupported才是partial，全created才complete；plan与冻结case相等，canary path列表/顺序与冻结case相同，bytes/hash只做类型/范围/64位小写hex形状检查，不读取payload验证hash。

marker的run_root和scope.absolute_path只作数据形状检查，**不用于IO或授权**；实际scope从冻结case的相对path派生。Node列表不是遍历结果，实际facts必须来自元数据。读取marker失败：NotFound/格式/超限为InvalidMarker，权限或其它IO为IoError；字段固定/marker。任何scope根及祖先非普通目录/有链接，在枚举前UnsafeRoot；非法marker scope无需访问它指称的路径。其它平台（非Windows/macOS）返回Unsupported。

## 3. IO和进度的精确接口

```rust
pub struct ScanNodePath { /* private, scanner creates only */ }
impl ScanNodePath {
    pub fn scope_id(&self) -> &water_contracts::v1::OpaqueId;
    pub fn relative_path(&self) -> &water_contracts::v1::RelativePath;
    pub fn run_relative_path(&self) -> &water_contracts::v1::RelativePath;
}
pub trait ReadOnlyIo {
    fn inspect(&self, node: &ScanNodePath) -> Result<NodeMetadata, IoFault>;
    fn list_names(&self, node: &ScanNodePath, limit: usize)
        -> Result<Vec<std::ffi::OsString>, IoFault>;
}
pub struct NativeIo;
pub trait ScanObserver { fn on_entry(&self, progress: &ScanProgress); }
pub struct NoopObserver;
```

NativeIo/NoopObserver是公开unit struct，各实现相应trait。默认scan_fixture确实装配NativeIo与NoopObserver，不按case_id预置结果。私有路径token无公开构造/Deserialize/absolute getter；IO包装器通过相对getter记调用和委托NativeIo，不接任意路径或执行命令。trait适配器是可信后端/测试驱动，不能由UI提供代码。

NodeMetadata公开`kind:EntryKind, logical_bytes:Option<ByteCount>, identity:FileIdentity`。EntryKind为File/Directory/Link/Other（Serialize小写）。FileIdentity公开`kind:IdentityKind, device:Option<ByteCount>, inode:Option<ByteCount>, link_count:Option<ByteCount>`，IdentityKind为Unknown/Unix（小写）；Unknown四字段中后三者全null，Unix后三者全Some。

IoFault公开`kind:IoFaultKind, injected:bool`，IoFaultKind为PermissionDenied/NotFound/Io/DirectoryLimit/RootChanged，提供Debug/Clone/PartialEq/Eq，不存原生错误文本。NativeIo始终injected=false，测试包装器故障为true。ScanProgress公开`scope_id:OpaqueId, relative_path:RelativePath, visited_entries:u32, recorded_entries:u32`，on_entry在成功追加事实后调用一次；计数均为整个调用累计，不因scope重新计数。

NativeIo.inspect只用symlink_metadata（逐祖先确认真实目录）取得当前对象；Windows先用稳定file_attributes的0x400判所有reparse为Link；Mac用is_symlink。不得调用会跟随链接的metadata/Path::is_dir、读取链接目标或文件内容。File的logical_bytes=metadata.len；Directory/Link/Other为null。Windows identity恒Unknown，不用不稳定file_index/volume_serial_number、不按时间/大小/路径伪造；Mac对普通file/directory用dev/ino/nlink，inode=0时Unknown，其它种类Unknown。

NativeIo.list_names必须先确认当前目录及祖先非链接，每个read_dir迭代Result都处理；最多收集limit+1项。超限返回DirectoryLimit，任何迭代错误返回对应IoFault，丢弃该批次，不返回取决于OS顺序的部分名单。对末端Link不调用read_dir。扫描器仍检查返回批次长度与重复名称，错误批次在子项inspect前以entry_limit/Policy或io_error/Policy拒绝。

运行中再次检查run/scope祖先：消失、变链接、种类变化、已知Unix身份变化为RootChanged。Windows身份未知时不能证明同名目录未被替换；这只是**静止合成夹具、无恶意并发修改**的实验室复查，不是生产TOCTOU保证。确定性RootChanged失败路径用IO故障注入验证，不移动/删除真实fixture来造替换。

## 4. 严格事实结构

以下类型提供Debug/Clone/PartialEq/Serialize；枚举另Eq，可按需Copy，不要求Deserialize。使用A的OpaqueId、RelativePath、ByteCount、ScanStatus、Coverage、IssueCode原类型。

```text
ScanFacts { facts_version:&'static str="water.scan-lab.v1",
  run_id:String, case_id:String, status:ScanStatus,
  visited_entries:u32, recorded_entries:u32, scopes:Vec<ScopeFacts> }
ScopeFacts { scope_id:OpaqueId, relative_root:RelativePath, coverage:Coverage,
  visited_entries:u32, entries:Vec<EntryFact>, issues:Vec<FactIssue> }
EntryFact { relative_path:RelativePath, depth:u32, kind:EntryKind,
  logical_bytes:Option<ByteCount>, allocated_bytes:Option<ByteCount>, identity:FileIdentity }
FactIssue { code:IssueCode, relative_path:Option<RelativePath>,
  origin:IssueOrigin, operation:IssueOperation }
IssueOrigin = Native|Injected|Control|Policy
IssueOperation = Inspect|ReadDir|Budget|Cancel|RootGuard
```

自身枚举Serialize snake_case。无未列字段、绝对路径、任意错误文本、风险/分类/回收字段或总字节。allocated_bytes恒null。重叠scope分别保留，硬链接保留两个路径；身份可用也不去重求和，unknown不伪装已知。目录/链接/其它对象大小不填0。policy本来就不跟链接，Link事实本身不产生link_skipped issue，complete仅代表本票no-follow策略内覆盖完成。

## 5. 排序、深度、预算与取消

scope按D声明顺序；目录名单按OsStr::as_encoded_bytes字节排序（正常UTF-8名称即UTF-8字节顺序），前序遍历。每个名称必须是单个Normal组件，且拼接后的A RelativePath可表达；不正规化、不解码%、不用to_string_lossy。不可表达名称不构造IO token、不inspect，计一次visited，发path_unrepresentable（父目录相对path，Policy/Inspect）并继续；不回显坏名称。

scope根depth=0，不作为entry、不计visited。子项**在inspect前**计一次visited；inspect失败也消耗预算但不造EntryFact。recorded是追加事实数。根/祖先复查不是entry。最大条目预算跨scope累计。

目录depth==max_depth仍保留该目录事实，不list_names，发depth_limit（该目录、Policy/Budget）并继续兄弟。max_depth=0时不枚举根，发同类根issue。目录批次超限不访问任何子项，发entry_limit（目录、Policy/ReadDir）。全局条目预算在存在下一候选项且visited==max_entries时触发：不inspect该项，当前scope和所有后续scopePartial，分别发entry_limit（当前父目录/后续None、Policy/Budget），停止整个调用。刚好用尽且没有下一项，不制造issue。

取消检查在每个待执行scope/目录操作/候选项之前进行，**优先于该步的预算/深度检查**；不在完成全部工作后再把结果改成取消。预取消不做扫描IO，每scope为Cancelled、entries空、cancelled(None,Control/Cancel)。运行中取消保留已得事实，当前和后续scope均Cancelled，分别发cancelled（当前目录相对path/后续None）。已结束scope保持原coverage。全局status优先Cancelled，其次有Partial则Partial，否则Completed。

observer在成功记录一个目录后可能触发取消；随后目录递归也是待执行操作，先查token再查深度。平面三个文件、在第三项后才取消且无后续scope时仍Completed。D cancel_after_entries由测试observer调用**同一真实token.cancel**，不是库按case模拟取消；它证明控制路径，不证明UI取消接线。

## 6. IO失败和覆盖

普通Inspect/List错误：PermissionDenied→permission_denied，NotFound/Io→io_error，relative_path为对应node（根用空串），operation相应；injected=true则origin Injected，否则Native。保留此前事实、scope标Partial，继续可达兄弟。DirectoryLimit如上为Policy（注入时Injected）。RootChanged为root_changed/RootGuard并停止整个调用，当前及后续scopePartial；已完成scope保留，origin取故障来源。不可表达名称、批次重复/超限是Policy，不冒充OS失败。

permission-plan的blocked实际可读。只允许测试包装器在指定list_names返回Injected PermissionDenied，并委托其它调用；另一次NativeIo必须读到其中普通文件且无错误。RootChanged、目录批次错误、NotFound同样区分注入/Native。list_names包装器只模拟目录批次故障传播；NativeIo逐项处理ReadDir Result由源码审阅核对，真实OS迭代错误及真实权限失败保持未实测。生产库不按marker.scanner_plan.faults或cancel_after自动制造错误/取消；这些是测试驱动输入，不是磁盘事实。

## 7. 六测试、真实桥接与负控

唯一tests/scan_v1.rs精确六个顶层测试：

- scan_native_fixtures：使用helper生成的11个D run和默认NativeIo公开入口；按matrix的native部分验证每scope顺序、kind、depth、逻辑长度、issue与计数。权限/取消两个case此时不得假造计划故障。
- scan_scope_and_links：非法run_id、marker重复/超限/缺失/非法scope、链接run/祖先根；prefix兄弟与链接target的IO调用数0，Link不递归，canary未变。unsupported负例能力如实记录，不skip整测试。
- scan_budgets_and_order：depth=0/2、条目恰好耗尽/下一项才触发、跨重叠scope预算、目录批次上限与反序IO名单仍排序。assert未对超预算子项inspect，不先无界收集再检查。
- scan_faults_and_coverage：委托NativeIo的PermissionDenied/NotFound/目录批次错误/RootChanged包装器，精确code/origin/operation/partial保留；另跑无注入permission-plan；不可表达名称不触及其IO。
- scan_cancellation：共享token预取消、observer首项取消、平面最后一项才取消、跨scope剩余取消；正确保留事实和source，非UI测试。
- scan_identity_and_readonly：仅普通文件有长度、无allocated/回收/汇总；硬链接两路径保留，Windows全Unknown，Mac如实dev/ino/nlink；生产代码不读payload，仅marker；与D canary快照/IO trace及源码静态审阅一起证明边界，不把hash未变当“从未读取”。

helper fixtures仅在本树.local新建11个D run与六个控制负例，不清理，记录active-fixtures.json及不可变历史index；每批<=24run、<=1MiB内容。已有本工具索引时test/bridge复用只读run，无索引才先prepare；显式fixtures可新增一批、只更新本工具控制指针，不改旧run。helper向测试设置固定WATER_SCAN_FIXTURE_INDEX（清除外部覆盖），测试只读该受控路径；生产库不读取此环境变量。Rust测试不造物理fixture、不改marker/ACL，只读index、控制材料与所选run；所有故障包装器只放唯一测试文件。

bridge用冻结控制Rust程序读取index、调用真实open/scan_fixture并Serialize；Node核对实际11case native结果、顺序/种类/长度/issue/计数/平台identity；不以matrix替代扫描。它不接A报告、E或页面。

四个有效负控：①仅让NativeIo把链接误标目录，保留独立read_dir祖先/链接拒绝防线，scope/link目标断言红；②全局预算多访问一项，budget断言红；③真实CancelToken忽略取消，cancellation断言红；④把PermissionDenied当空目录成功，faults/partial断言红。完整六测试、目标断言失败、三hash、逐文件原字节写回并确保mtime更新后完整六测试通过；编译/缺文件/超时不是有效红。不删除/rename/清理run，不改测试造红。
