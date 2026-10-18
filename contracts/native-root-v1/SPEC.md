# Native Root v1 — Windows目录观察，非授权

总控2026-10-18冻结。packages/native-root独立workspace members=["."]、resolver="3"；package water-native-root 0.1.0、edition2024、rust-version="1.95"、publish=false；禁自动targets，仅lib water_native_root和显式tests/native_root_v1.rs。直接依赖恰为water-contracts(path ../../crates/water-contracts)、serde =1.0.229 features=[derive]、serde_json =1.0.151；无dev/build/新registry包/bin。Cargo.lock仅使用根锁已有registry版本/source/checksum，私有离线target/home/tmp，jobs1。旧产品/根Cargo不改。

## 公共API（pub mod v1）

```rust
pub fn validate_windows_path(path: &str) -> Result<(), RootError>;
pub fn open_directory(scope_id: &water_contracts::v1::OpaqueId, path: &str)
    -> Result<DirectoryLease, RootError>;
impl DirectoryLease {
    pub fn observation(&self) -> &RootObservation;
    pub fn refresh(&self) -> Result<RootObservation, RootError>;
}
pub fn to_json(observation: &RootObservation) -> Result<String, RootError>;
```

DirectoryLease私有字段，拥有std::fs::File，不Clone/Serialize/Deserialize/Default/Debug，不暴露路径、原始handle、File或任意构造器。RootObservation及嵌套类型Debug/Clone/PartialEq/Eq/Serialize，字段私有，只有不可变getter或to_json可读；无Deserialize/Default/任意构造器。scope_id先合法OpaqueId，输出照抄。重复open同一目录身份相同；refresh只查询原File句柄，不重开path。File RAII关闭句柄，不写自制CloseHandle。

RootError公开枚举恰为InvalidPath、UnsupportedPlatform、UnsupportedVolume、ReparsePoint、NotDirectory、MetadataUnavailable、OpenFailed、IdentityUnavailable、SerializationFailed，Debug/Clone/PartialEq/Eq/Display/Error，Display严格为枚举名，无路径/ID/OS/serde原错/句柄泄漏。不为测试伪造输出。

wire严格键：root_version="water.native-root.v1"、scope_id、platform="windows"、object_kind="directory"、read_only=true、identity={kind:"windows_file_id_128",volume_serial:规范u64十进制字符串,file_id:32位小写十六进制字符串}、reparse_point=false、authorization_granted=false、traversal_allowed=false、race_protection_verified=false。不得把身份塞入旧F/G Unix协议。

## 路径与IO顺序

validate_windows_path是纯词法、所有平台可用：非空UTF-8、最多240个UTF-16单元，形如ASCII盘符加冒号和/或\\分隔的绝对非根路径。拒绝盘根、相对、UNC、设备/extended namespace、NUL/控制字符U+0000–001F/DEL、第二个冒号/ADS、空段/双分隔、dot/parent段、末尾分隔符/点/空格；所有段拒绝Windows保留字符<>\"|?*及保留DOS名的点前stem（ASCII大小写不敏感）：CON/PRN/AUX/NUL/CONIN$/CONOUT$、COM1–9/LPT1–9和COM/LPT加¹²³。点前stem先trim末尾空格，避免CON .txt。混合/与\\允许，不做expand/canonicalize/环境/HOME/locale读取。Unicode普通段保留，不正规化。

open_directory先词法校验；合法路径在非Windows直接UnsupportedPlatform且无IO。在Windows先GetDriveTypeW(盘根带结尾\\和NUL)，仅DRIVE_FIXED=3；其余UnsupportedVolume。只对该路径的既有祖先及终项用非跟随metadata检查FILE_ATTRIBUTE_REPARSE_POINT(0x400)，不只判断is_symlink；发现任意reparse即ReparsePoint，非目录祖先/终项NotDirectory，metadata失败MetadataUnavailable。不得枚举目录/读普通内容。目录打开使用OpenOptionsExt.access_mode(0x80 FILE_READ_ATTRIBUTES)、share_mode(7)、custom_flags(0x02000000 BACKUP_SEMANTICS | 0x00200000 OPEN_REPARSE_POINT)、security_qos_flags(0x10000 SECURITY_IDENTIFICATION)，禁止请求LIST_DIRECTORY/READ_DATA/写/删除权限。失败OpenFailed。

对打开的自有句柄调用GetFileInformationByHandleEx class9 FileAttributeTagInfo，失败MetadataUnavailable，检查directory位0x10且无reparse位；再class18 FileIdInfo，失败IdentityUnavailable，不以路径/时间/大小/随机数替代ID。refresh重做两次句柄查询和这些属性检查；不读保存路径或创建新句柄。身份比较仅观察时有效，不宣称永远唯一。

所有unsafe只允许src/native_windows.rs中上述两FFI函数（GetDriveTypeW、GetFileInformationByHandleEx），repr(C)两DWORD结构8字节、u64+[u8;16]结构24字节/8对齐，逐处SAFETY说明指针、缓冲长度、句柄借用寿命和成功初始化条件；其余Rust模块#![deny(unsafe_code)]，测试无unsafe。不得引入其他FFI、进程、shell、网络、全局状态或提权。窄unsafe不修改A–M原约束。

词法和祖先预检不是TOCTOU保证，路径可能并发替换；输出三个authority/race标记始终false。N不扫描、不授予授权、不发token、不枚举、不读配置、不接UI。未来选择授权/句柄相对遍历另票验收。

## 定向验证

固定五测试root_path_validation、root_native_identity、root_reparse_boundaries、root_observation_wire、root_lifetime_and_errors，单线程。物理操作仅冻结prepare创建的本树.local/native-root-fixtures/batch-v1及index，Rust只读元数据/句柄；测试不创建/改名/写文件/删除/ACL。纯词法可测试任意字符串；IO只允许index指定正常A/B、嵌套目录、普通文件、不存在项、终项junction和祖先junction路径，以及必要固定祖先metadata；不扫描HOME/盘根/真实目录。

五测试覆盖词法拒绝先于IO、相同/不同目录ID、refresh同句柄、错误净化、公开JSON精确字段/字符串精度、反复open/drop不积累lease（源码审阅RAII，不冒称并发替换实测）、两种reparse拒绝。至少一条走公开open_directory→observation/refresh→to_json。字节级源快照/完整红绿纪律见next-core-v1/COMMON.md。负控实改reparse拒绝（保留OPEN_REPARSE_POINT）→N_REPARSE_ROOT；真实ID改常量→N_IDENTITY_HANDLE；authority任一false改true→N_NO_AUTHORITY。行为红N_BEHAVIOR。macOS/生产竞态/真实用户scope未验证。
