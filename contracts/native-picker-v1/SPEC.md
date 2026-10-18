# Native Picker v1 — Windows单目录原生选择到真实P

packages/native-picker，water-native-picker/water_native_picker/pub mod v1；独立workspace members=["."]/resolver3，0.1.0/edition2024/rust-version1.95/publish=false，四auto=false，唯一lib/tests/picker_v1.rs。直接依赖恰water-contracts(path ../../crates/water-contracts)、water-native-root(path ../native-root)、water-scope-registry(path ../scope-registry)。无serde/dev/build/新包/bin，离线私有锁/home/target/tmp，jobs1。

```rust
pub struct PickerOptions; // 私有String，无Clone/Debug/Serde/Default
impl PickerOptions { pub fn new(initial_directory:&str)->Result<Self,PickerError>; }
pub struct SelectedScope; // 私有RegisteredScope和String，无Clone/Debug/Serde/Default
impl SelectedScope { pub fn scope(&self)->&RegisteredScope; pub fn root_path(&self)->&str; }
pub fn select_scope(registry:&mut Registry,scope_id:&OpaqueId,options:&PickerOptions)
 ->Result<Option<SelectedScope>,PickerError>;
```

真实A/N/P类型；new只真实N.validate_windows_path并保留原字符串，先纯词法不IO。select_scope非Windows x64直接UnsupportedPlatform，不弹替代UI/读环境。Windows先真实N.open_directory验证initial_directory，以此IShellItem SetFolder固定起始目录；不读最近目录或默认展开HOME。initial只控制起始位置，不能替代GetResult所选实际路径。

仅src/native_windows.rs允许窄unsafe，声明恰CoInitializeEx、CoUninitialize、CoCreateInstance、CoTaskMemFree（ole32）和SHCreateItemFromParsingName（shell32）；COM vtable调用只指定已核接口槽位，逐处SAFETY/ABI/指针/生命周期，不运行shell/PowerShell/子进程或安装库。每调用初始化STA COINIT_APARTMENTTHREADED|COINIT_DISABLE_OLE1DDE=6；S_OK/S_FALSE都恰一次CoUninitialize，RPC_E_CHANGED_MODE返回ApartmentUnavailable，不破坏宿主已有apartment。COM接口Release和CoTaskMemFree用私有RAII处理所有成功/错误/取消路径，释放前不重复use，不把失败输出转拥有对象。

CLSID_FileOpenDialog={DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7}，IID_IFileOpenDialog={D57C7288-D4AD-4768-BE02-9D969532D960}，IID_IShellItem={43826D1E-E718-42EE-BC55-A1E261C37BFE}。IUnknown Release槽2、Show槽3、SetOptions9、SetFolder12、SetTitle17、SetOkButtonLabel18、GetResult20；IShellItem GetDisplayName5，SIGDN_FILESYSPATH=0x80058000。opaque对象和vtable指针布局按x64核，禁止GetResults多选/自定义任意COM CLSID。

SetOptions精确0x02110868（PICKFOLDERS0x20|FORCEFILESYSTEM0x40|PATHMUSTEXIST0x800|NOCHANGEDIR0x8|NOTESTFILECREATE0x10000|NODEREFERENCELINKS0x100000|DONTADDTORECENT0x2000000）。不ALLOWMULTISELECT/CREATEPROMPT/NO_VALIDATE。固定Title=`Water - Select a read-only directory`，OK标签=`Use this directory`；Show(owner=null)真实原生模态对话框，import/构造options不自启。Show HRESULT_FROM_WIN32(ERROR_CANCELLED)=0x800704C7严格Ok(None)，不能GetResult/注册/缓存上次结果。其它失败DialogFailed。不声称该UI可防同进程恶意代码/OS自动化或外部用户冒充；这是实际原生选择交互，不是加密身份认证。

Show成功才GetResult和GetDisplayName文件系统路径；UTF-16必须NUL终止且有界最多32768码元，严格String::from_utf16，最终真实N/P会执行240单元保守路径规则。成功分配的PWSTR无论验证结果都CoTaskMemFree。先P.prepare(scope_id,实际所选路径)，再P.confirm；confirm失败要P.decline本次pending（保留原错误），不能遗留槽/能力。prepare失败不登记，现有registry/其它scope不变。SelectedScope仅实际confirmed对象，root_path精确保留最终路径，只有可信Rust宿主getter可读；可接后续R但本票不依赖R，不提供JSON/IPC/HTTP/任意路径构造SelectedScope。

PickerError恰Root(N RootError)、Source(P RegistryError)、UnsupportedPlatform、ApartmentUnavailable、DialogFailed、InvalidSelection，Debug/Clone/PartialEq/Eq/Display/Error；包装Display等原错，其余恰`<Variant> at /picker`，不含路径/COM HRESULT/用户文本。函数不枚举/读内容/扫描/写文件/改cwd/最近文档/删除/ACL，OS对话框内部显示仅限测试受控起始目录与UI行为，不冒充产品扫描。

唯一五测试picker_options_and_errors、picker_native_cancel、picker_native_confirm、picker_registry_failures、picker_public_lifecycle。真实N初始junction/非法词法失败不显示；GUI测试用冻结driver、每个对话框前stderr输出`WATER_PICKER_CASE cancel`或`WATER_PICKER_CASE select`，单线程--nocapture。driver仅以UIAutomation定位本次测试PID的固定title窗口，随后GetDlgItem取系统按钮IDCANCEL=2/IDOK=1，复核按钮PID，再向该按钮PostMessage(BM_CLICK)，不操纵其他窗口；选择当前受控root。不得将windowsHide=true传给实际GUI测试进程，避免系统隐藏首次模态窗口；后台驱动仍隐藏。取消不占槽、返回实际scope ID和root身份、容量full/duplicate在实际选后仍无泄漏、P.begin/finish/revoke实际链路。不要mock COM/返回预设路径冒充Show；真实选择不等于R扫描。OS窗口内部的导航展示/缓存未逐项审计，不代表产品主动读取了那些目录。

行为S_BEHAVIOR；nc1取消映射改成Err→S_CANCELLED；nc2注册使用错误scope ID→S_SCOPE_ID；nc3返回前revoke刚确认scope→S_REGISTERED。每项完整五红→原字节恢复→完整五绿，不把UIA超时/缺窗口/编译算行为红。固定最大180秒单子命令；全部原生测试日志/窗口动作/源码保存。未触发COM分配失败/apartment冲突按审阅记录。仅本树4空目录/1junction/0普通内容；原生GUI可见短暂出现为本票实际验收所需，测试禁止浏览真实用户目录。
