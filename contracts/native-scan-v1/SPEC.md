# Native Scan v1 — 许可约束的Windows只读元数据

总控2026-10-18冻结。packages/native-scan，water-native-scan/water_native_scan/pub mod v1；自有workspace members=["."]/resolver3，0.1.0/edition2024/rust-version1.95/publish=false，四auto=false，唯一lib与tests/native_scan_v1.rs。直接依赖恰water-contracts(path ../../crates/water-contracts)、water-native-root(path ../native-root)、water-scope-registry(path ../scope-registry)、water-redacted-report(path ../redacted-report)、serde =1.0.229 features=[derive]、serde_json =1.0.151；H仅Q的间接依赖。私有offline/locked/jobs1，根Cargo/旧产品不变，无dev/build/bin/新registry包。

## API与类型

```rust
pub struct ScanOptions; // 私有字段，Debug/Clone/PartialEq/Eq，无Default/Deserialize
impl ScanOptions {
 pub fn new(max_depth:u32,max_entries:u32,max_dir_entries:u32)->Result<Self,NativeScanError>;
 pub fn max_depth(&self)->u32; pub fn max_entries(&self)->u32; pub fn max_dir_entries(&self)->u32;
}
pub struct CancelToken; // 私有Arc<AtomicBool>，Debug/Clone，无Default/Deserialize
impl CancelToken { pub fn new()->Self; pub fn cancel(&self); pub fn is_cancelled(&self)->bool; }
pub struct ScanProgress { pub scan_id:OpaqueId,pub scope_id:OpaqueId,pub relative_path:RelativePath,pub visited_entries:u32,pub recorded_entries:u32 }
pub trait ScanObserver { fn on_entry(&self,progress:&ScanProgress); }
pub struct NoopObserver;
pub fn scan_registered(registry:&mut Registry,scope:&RegisteredScope,root_path:&str,
 scan_id:&OpaqueId,options:&ScanOptions,cancel:&CancelToken)->Result<NativeScan,NativeScanError>;
pub fn scan_registered_with_observer<O:ScanObserver>(registry:&mut Registry,scope:&RegisteredScope,
 root_path:&str,scan_id:&OpaqueId,options:&ScanOptions,cancel:&CancelToken,observer:&O)
 ->Result<NativeScan,NativeScanError>;
impl NativeScan { pub fn report(&self)->&water_contracts::v1::ScanReport; }
pub fn to_json(scan:&NativeScan)->Result<String,NativeScanError>;
pub fn redacted_json(scan:&NativeScan)->Result<String,NativeScanError>;
pub struct DirectoryRecord; // 私有，Debug/Clone/PartialEq/Eq；无权限/handle/绝对路径
impl DirectoryRecord { pub fn name_utf16(&self)->&[u16]; pub fn attributes(&self)->u32; }
pub fn decode_directory_buffer(buffer:&[u8])->Result<Vec<DirectoryRecord>,NativeScanError>;
pub fn validate_child_name(name:&[u16])->Result<String,NativeScanError>;
```

OpaqueId/RelativePath/Registry/RegisteredScope用真实A/P类型。options严格max_depth=0..32、max_entries=1..10000、max_dir_entries=1..256，构造非法不IO。CancelToken clone共享单向取消，不reset；其impl可仅对clippy::new_without_default作附理由的局部allow，不能借此允许Default或静默关闭其它lint。NativeScan与嵌套wire结构Debug/Clone/PartialEq/Serialize，字段私有，无Default/Deserialize/任意值构造器或可变getter；report仅不可变。capability/handle绝不输出。

NativeScanError恰Source(P RegistryError)、Root(N RootError)、Projection(A ContractError)、Redaction(Q RedactionError)、UnsupportedPlatform、InvalidOptions、RootMismatch、NativeIo、MalformedDirectoryBuffer、InvalidChildName、OutputTooLarge、SerializationFailed，Debug/Clone/PartialEq/Eq/Display/Error。四包装variant的Display等于原错误，其余恰`<Variant> at /native_scan`；不附原路径/名字/NTSTATUS/Win32/serde原错。错误和输出均不能泄漏绝对路径。非Windows x64原生入口UnsupportedPlatform，无替代path scanner/联网fallback；decoder/validator是纯内存数据校验，不授予IO权限。

## P生命周期与根绑定

scan_registered确实委托with_observer+NoopObserver。Windows入口先调用真实P.begin_scan(scope)；外来/过期scope、已有active均按Source原样拒绝，不改变宿主已有attempt，不访问候选root_path。成功后由私有RAII attempt guard持有本次permit及registry借用，调用P.check_permit取得原N观察。R持有可变Registry期间不能在安全Rust并行revoke；运行中取消使用同一CancelToken，结束再由宿主撤销scope。

已预取消时不打开候选root_path/不枚举，输出Cancelled/0条目和cancelled(None,control,cancel)，root_identity来自真实许可观察。其它情况：真实N.open_directory检查候选root_path，将identity与permit观察比较，不等RootMismatch且不枚举；再另开实际枚举根File，仅访问0x100081(FILE_READ_ATTRIBUTES|FILE_LIST_DIRECTORY|SYNCHRONIZE)、share7、BACKUP_SEMANTICS|OPEN_REPARSE_POINT、SECURITY_IDENTIFICATION。查询实际句柄class9拒绝reparse/非目录，再class18二次比对permit身份，之后才枚举。候选路径到此为止，不保存到输出或拼接子绝对路径。

Completed/Partial成功后调用P.finish本次permit，Cancelled用P.cancel(scope)；任意Err或observer Rust panic/unwind均由本次guard取消并使scope回confirmed。若finish的真实N刷新失败，取消本次attempt并返回Source错误；原错误不吞掉。不在begin失败时取消别人已有active。R不自动revoke注册scope，可再发起新调用；已revoke旧scope不可复活。不得实现自己的一套权限表或从观察JSON恢复permit。

## 原生边界与目录解码

仅src/native_windows.rs允许窄unsafe，声明仅NtCreateFile(ntdll)和GetFileInformationByHandleEx(kernel32)两个函数，其它Rust模块deny/forbid unsafe。每处SAFETY写活句柄借用、结构/对齐/长度、UTF-16寿命与成功初始化。标准库OpenOptions/from_raw_handle/last_os_error可用；无其它FFI、shell/进程/网络/提权/读数据/写/删/ACL。Nt结构x64 UnicodeString16/ObjectAttributes48/IoStatus16、Tag8/Identity24/Standard24字节，编译期assert size/alignment。

子项只能NtCreateFile(parent HANDLE, one validated component)，ObjectAttributes.Attributes=0（尊重实际名称大小写）、SecurityDescriptor/QoS=null，ShareAccess7、CreateDisposition=FILE_OPEN(1)、Ea=null。CreateOptions=OPEN_REPARSE_POINT(0x200000)|SYNCHRONOUS_IO_NONALERT(0x20)|按目录提示DIRECTORY_FILE(1)或NON_DIRECTORY_FILE(0x40)。目录access0x100081，非目录0x100080，普通文件不申请READ_DATA。不得请求CREATE/OPEN_IF/DELETE_ON_CLOSE/GENERIC_READ/写/备份特权；成功且新HANDLE非null/INVALID_HANDLE_VALUE才File::from_raw_handle，RAII关闭。类型提示和实际不符则记录root_changed，不能用更弱flag重开。

Nt失败STATUS_ACCESS_DENIED(0xC0000022)映射permission_denied；OBJECT_NAME_NOT_FOUND(0xC0000034)、OBJECT_PATH_NOT_FOUND(0xC000003A)、FILE_IS_A_DIRECTORY(0xC00000BA)、NOT_A_DIRECTORY(0xC0000103)映射root_changed；其它失败io_error。GetFileInformationByHandleEx失败Win32 5映射permission_denied，2/3/6映射root_changed，其它io_error。候选根打开/初次句柄绑定信息失败在枚举前返回Root或NativeIo；已遍历时的子项/目录失败按issues保留partial，不回显数值状态码。属性class9失败不能凭目录提示造entry，应跳过该项；只有实际kind已知后的身份/长度失败可记录带None的事实。

目录枚举用GetFileInformationByHandleEx class11首批、class10后续，初始化并8对齐的16384字节buffer；ERROR_NO_MORE_FILES(18)正常结束，其它错误映射permission_denied/io_error/root_changed，不返回取决于OS顺序的半批名单。每目录完整名单在任何子open前获取；过滤`.`/`..`后超过max_dir_entries即丢弃该目录整名单、entry_limit，不能只取前N个。调用次数上限2*max_dir_entries+4，重复非dot名字/异常无进展或malformed buffer均整批io_error；不无界循环。

decode_directory_buffer不IO，输入104..65536字节。每记录头最少104字节，NameLength在offset60、attrs在56，名称从104开始、长度正偶数且全部在buffer内；NextEntryOffset为0结束，否则须8对齐、>=104+当前NameLength且下条完整头在界内，全部checked索引/加法。原始UTF-16码元保留，不用to_string_lossy、不cast尾数组；允许结构上有效的坏UTF-16留给名称validator，parser只返回未授权数据。decoder-cases.json逐值测试。

validate_child_name纯内存：1..255 UTF-16单元、严格String::from_utf16；拒绝空/`.`/`..`、`/\\:`、ASCII控制/DEL、`<>\"|?*`、尾点/空格、DOS保留stem（同N，包括stem末空格与COM/LPT上标¹²³）。不解码%、不Unicode正规化/locale/环境展开；随后真实A.RelativePath::new验证单组件。公开decoder/validator不能创建私有native File/路径token或绕过根许可。

每个实际子句柄先class9：reparse一律Link、绝不枚举，大小/identity为空；DEVICE属性一律Other、不读内容。正常File/Directory用class18取真实volume_serial+128位ID，不使用目录buffer的64位提示ID；File再class1读取非负EndOfFile（BOOLEAN布局），其它种类logical_bytes=null。身份/长度失败分别保留None并记录native io_error；未知身份目录不得深入。已知volume不同于许可根则outside_scope并跳过。每次list前重查该活目录句柄的kind/ID；失败/变化不枚举，不靠路径重新打开。竞态失败保留partial，但不保证恶意并发重命名下的永久包含或一致快照。

## 遍历、预算和取消

单根按原UTF-16码元字典序、前序遍历；根depth0不作entry。每个待处理非dot名称在validator/open前计visited，失败也消耗预算，成功追加entry才recorded。组合相对路径必须过A（最多4096字符），不可表示的名称不open，path_unrepresentable(parent,policy,open_child)，继续兄弟；不回显坏名字。

取消在每个待执行目录/候选/递归操作前优先检查，再检查预算/深度。已记录目录depth==max_depth保留entry但不list，发depth_limit(该目录,policy,budget)；max_depth0根不list并发根空串issue。总visited预算只有存在下一项时触发entry_limit(当前父目录,policy,budget)并停止；刚好用尽且无下一项不造issue。单目录名单超限发entry_limit(该目录,policy,enumerate)，不open任何该批子项。observer在成功追加entry后调用一次，可以取消同一真实token；最后entry之后无后续操作则仍Completed。

Cancelled保留已得事实，发cancelled(当前待操作父路径或None,control,cancel)；无取消且有任一issue为Partial，否则Completed。遇到Link本身不制造link_skipped issue，complete仅代表本no-follow策略内覆盖；目录深度/预算/不可表示名/IO错误都使覆盖不完整。无文件观察不表示磁盘为空。无需按fixture名、case_id、root路径匹配预置结果。

## 严格wire与A/Q真实接线

NativeScan顶层恰native_scan_version="water.native-scan.v1"、source_kind="native_scope_metadata"、read_only=true、scan_id、scope_id、platform="windows"、confirmation_source="trusted_in_process_declaration"、native_user_gesture_authenticated=false、race_protection_verified=false、root_identity、status、visited_entries、recorded_entries、entries、issues、report。root_identity恰{volume_serial:规范u64串,file_id:32小写hex}，来自许可，不是原路径或指针。

每entry恰finding_id（沿recorded从entry-1）、relative_path、depth、kind(file/directory/link/other)、logical_bytes（规范u64串或null）、allocated_bytes=null、native_identity（同root identity结构或null）。每issue恰code:A IssueCode、relative_path:Option<String>（scope根允许Some空串）、origin(native/policy/control)、operation(open_root/open_child/enumerate/metadata/root_guard/decode/budget/cancel)，无OS自由文本。除File外logical_bytes=null；Link/Other identity=null。

report为真实A ScanReport：单scope ID取RegisteredScope，label固定`Selected directory`、platform Windows、origin UserSelected（宿主声明）、coverage由status映射；scan_id参数原值。每entry一个finding，scope/ref/path/ID一致，tool=None、rule_version=`native-scan-v1`、category/risk/recoverability/activity/confidence分别unknown/protected/unknown/unknown/unknown；evidence仅{code:unknown,source:filesystem,summary:`Native metadata observation only; classification and ownership are unverified.`}，protection_reasons固定[unknown_ownership,incomplete_evidence]、references unknown/[]。size.logical取entry，allocated/reclaimable上下限null，method为已知File逻辑长度时logical_sum否则unknown，confidence对应measured/unknown，shared unknown。issues逐项映射code/scope/path，message固定`Native metadata issue.`；不丢根空串或取消None。

report.totals logical/allocated=null、method=unavailable、coverage_complete=status completed、scanned_entries=recorded、skipped_entries=visited-recorded；不从条目和替换来源总量或声称卷唯一。返回前真实A.validate_report；to_json纯Serialize完整NativeScan、UTF-8<=33554432，否则OutputTooLarge，不截断；scan返回前执行同一上限。report只读getter，redacted_json必须真实Q.redact_report(report)+Q.to_json，精度/Unknown/去路径/alias按原Q，不复制Q算法。无默认写文件、UI、上传或旧lab协议转换。

## 五测试与三个源码负控

唯一native_scope_and_identity、native_directory_decoding、native_metadata_no_follow、native_budgets_and_cancellation、native_report_and_redaction。全部native操作只允许冻结index中root/trap/empty/dir/已列文件/junction及必要祖先；每次使用真实P/N/NT，Rust不创建/读普通内容/改fixture。decoder/名称反向用例纯内存。源hash/硬链接/根ID均取实际观察，不硬编码inode或把旧N身份当路径授权。

覆盖外来/撤销/重建scope、宿主已有active不被取消、错误候选根/空根/完整8条目、硬链接ID相同/每路径保留、junction为Link且无TRAP_OUTSIDE后代、Unicode/零长度、root/child预算与取消优先、observer取消与panic清attempt、失败后可再次begin、A完整逐值/JSON及真实Q输出没有原路径/NativeID/绝对路径，所有保守标记不变。I/O拒绝/不支持字段/真正并发替换若未触发按源码审阅，不造假native handle或新增测试后门。

行为红R_BEHAVIOR。nc1关闭许可根与候选/实际根句柄ID门→R_ROOT_BINDING；nc2把真实reparse对象当Directory并允许进入→R_NO_FOLLOW（仍保留OPEN_REPARSE_POINT，负控只允许访问本batch的trap）；nc3关闭真实取消检查→R_CANCELLED。每项完整五红→原字节恢复→完整五绿，不能编译/缺文件/超时造红。全部原始stdout/stderr、生产/测试源码与当前字节恢复链由新helper保存；同一干净实现SHA五final。
