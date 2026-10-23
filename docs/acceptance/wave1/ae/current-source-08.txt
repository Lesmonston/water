# Root Marker v1：另行同意的根package.json读取

Z packages/root-marker，water-root-marker/water_root_marker/pub mod v1，独立workspace resolver3，edition2024/rust1.95/publish=false，四auto=false；唯一lib和tests/marker_v1.rs，无bin/dev/build/新registry依赖。直接依赖恰A、N(native-root)、P(scope-registry)、U(node-manifest)、serde =1.0.229 features=[derive]、serde_json =1.0.151。lib deny unsafe；仅私有native_windows.rs可局部allow unsafe，逐处SAFETY/ABI/x64大小对齐断言；不得复制/改旧N/P/R权限表或暴露raw handle。

目录选择/扫描许可不自动授权内容读取。可信Rust调用方须额外调用approve_package_json，才产生不可构造/Clone/Default/Deserialize/Serialize的借用同意对象；不从HTTP/JSON/env获得它。类型携带对真实Registry与真实ScanPermit的借用，不能在调用方finish/revoke后持有许可。没有该对象不得进入读内容函数；constructor即调用真实P.check_permit，读前/读后再check。不是原生手势鉴真，用户交互同意另由未来宿主接线。

固定API：

    pub fn approve_package_json<'a>(registry:&'a Registry,permit:&'a ScanPermit)
      ->Result<ManifestReadConsent<'a>,MarkerReadError>;
    pub fn read_package_json(consent:&ManifestReadConsent<'_>,root_path:&str)
      ->Result<Option<MarkerObservation>,MarkerReadError>;
    pub fn to_json(observation:&MarkerObservation)->Result<String,MarkerReadError>;

root_path只供可信本机调用，不提供任意子路径/文件名参数。按N.validate_windows_path及N.open_directory观察，必须与P.check_permit身份一致；私有原生层再开拥有的目录句柄并查class9/18类型/ID，与同一注册根一致，不能只canonicalize/startsWith。只相对该目录句柄以NtCreateFile(FILE_OPEN/同步/no-follow/non-directory)打开唯一字面package.json（OBJ_CASE_INSENSITIVE），share仅FILE_SHARE_READ，access仅READ_DATA/READ_ATTRIBUTES/SYNCHRONIZE，不创建或写文件。读同一File句柄，禁止root_path.join后普通fs::read/to_string、canonicalize后重开、links fallback或目录遍历。根和file都核reparse/目录/设备，class1 NumberOfLinks必须=1，DeletePending=false；拒绝hardlink/reparse/非普通文件。查class18身份及class1 EOF在读前/后保持，根/permit后验同样一致，否则Changed/RootMismatch，失败无证据。

上限262144原始字节：已知EOF超限先拒绝，再以take(262145)/等效读取硬界限防变化，不能read_to_end无界；只严格UTF-8，BOM按U原解析结果拒绝，不替换坏字节。真实调用U.analyze_package_json(raw)并保留其真实结构证据；不得先Value化丢重复键。缺package.json返回Ok(None)；空/无效/重复/深层/错误shape映射InvalidManifest；只读取固定内容，不执行scripts/包管理器、解析引用/glob、读取其它配置或扫描HOME。无manifest不等于不是项目，格式通过不降保护/证明归属。

MarkerReadError固定枚举Source/InvalidPath/RootMismatch/NotRegularFile/ReparsePoint/MultipleLinks/InputTooLarge/Changed/InvalidUtf8/InvalidManifest/NativeIo/UnsupportedPlatform/SerializationFailed，Debug/Clone/PartialEq/Eq/Display/Error；Display只<Variant> at /root_marker，不保存/回显路径、原文、parser/OS消息。非Windows x64明确UnsupportedPlatform，不冒称macOS验证。

MarkerObservation为Debug/Clone/PartialEq/Serialize私有字段，无Deserialize/Default/任意构造器/可变getter。wire恰marker_version="water.root-marker.v1"、source_kind="native_root_package_json"、read_only=true、ordinary_content_read=true、root_binding_verified=true、native_user_gesture_authenticated=false、race_protection_verified=false、project_membership_verified=false、risk="protected"、action="display_only"、bytes_read(u32)、evidence=真实U.ManifestEvidence。nested U保持caller_supplied_text自身标签，外层另述native来源；无原文/内容hash/字段名值/路径/原生ID/错误正文。U.to_json与嵌套证据逐值等价，精确计数/长度不保证匿名。

不改V/W ordinary_content_read=false协议，不接旧报告重新分类。正式实现仅本树冻结工厂夹具验证：good/missing/invalid/exact/oversize/directory/hardlink/junction/other-root；普通payload读取仅该新factory及Z的受限API/总控probe，全部留存。旧N–W夹具/用户真实文件均不读。当前不证明恶意生产竞态、自然用户同意或真实用户scope。

API核对来源（总控2026-10-19实际读取）：[Microsoft NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile)、[FILE_STANDARD_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info)；复用本项目R已审阅ABI与RAII形状，不能改R。
