# WATER-W3-F3 接线与整机体检 SPEC（`water-desktop` 第 2 版）

2026-10-26 冻结，总控（Claude）。F1 服务核心与 F2 桌面宿主都已验收并合入主线。本票把它们接成能在本机运行的 Water：宿主用服务核心实现 `Backend`，用宿主的选择框实现服务的 `FolderPicker`。同时修掉两票验收移交过来的启动问题，然后用一次真实窗口完成整机体检。完成即 M1 体检 Alpha 的候选。

本 SPEC 在 [HOST](HOST.md)（含 [F2 补单 01](../../docs/dispatch/tickets/WATER-W3-F2-ADDENDUM-01-20261026.md)）之上修改宿主。凡与 HOST 冲突的，以本 SPEC 为准；没有提到的，HOST 照旧有效。服务一侧以 [SERVICE](SERVICE.md) 为准，本票**不改** `packages/` 下任何文件。

**清理保持关闭。** M1 只做体检；`clean_enabled` 固定为 false，用户点“清理所选”只会看到“这一版只做体检，清理功能会在下一版开放。”。

## 1. crate 与文件

- 仍是 `apps/water/host`，包 `water-desktop`，lib `water_desktop`，bin `water`。其余 crate 形状同 HOST 第 1 节。
- 依赖在 HOST 与 F2 补单 01 的 7 项之外，增加恰好 3 个路径依赖：
  ```toml
  water-service = { path = "../../../packages/water-service" }
  water-junk-rules = { path = "../../../packages/junk-rules" }
  water-process-scan = { path = "../../../packages/process-scan" }
  ```
  - 后两个只为在测试里写出 `water_service::Platform` 接口用到的类型（`KnownFolders`、`InUseSpec`），它们本来就在 water-service 的依赖图里。
  - registry 包仍须全部出自第一波 AC 已验收锁，不新增、不下载。
- `#![forbid(unsafe_code)]`、不写 FFI、不启动进程、不联网，同 HOST。生产代码仍只读 `WATER_DATA_DIR` 一个环境变量。
- 文件白名单同 HOST 第 2 节，`tauri.conf.json`、`capabilities/main.json`、`icons/icon.ico` 不改。`apps/water/ui/`、`packages/`、契约、检查器、台账只读。

## 2. 启动顺序（替换 HOST 第 3 节“在 setup 里创建窗口”与第 4 节 `run` 的签名）

Tauri 2.12.5 在 `setup` 回调里出错会直接 panic（`tauri/src/app.rs:1444`），`Builder::run` 拿不到错误。本票**不再使用 `setup`**，检查器会拒绝源码里出现 `.setup(`。

```rust
pub struct HostContext { pub data_dir: std::path::PathBuf, pub home_dir: String }
pub enum StartupError { AlreadyRunning, Failed }
// Display：AlreadyRunning → “Water 已经在运行。”；Failed → “Water 暂时无法启动。”

pub fn run<F>(make_backend: F) -> Result<(), StartupError>
where F: FnOnce(&HostContext) -> Result<std::sync::Arc<dyn Backend>, StartupError>;
```

`run` 依次做下面几步。前 8 步任何一步失败都返回 `Err`，不得 panic：启动路径上不用 `unwrap`、`expect`，也不用会 panic 的索引。

1. `validate_config(CONFIG)`。
2. `tauri::Builder::default()` 注册 17 个命令，然后 `.build(tauri::generate_context!())`。
3. 解析数据目录：有 `WATER_DATA_DIR` 用它，否则用 `app.path().local_data_dir()` 下的 `Water`。用 `prepare_data_directories` 准备，规则同 HOST 第 3 节，两种来源都严格：从盘根起已存在的各级都不能是重解析点。
4. 取单实例锁（第 3 节）。
5. 取 `app.path().home_dir()`，转成字符串。
6. `make_backend(&HostContext { data_dir, home_dir })`。
7. `app.manage(backend)`。
8. 用 `WebviewWindowBuilder::new(&app, "main", …)` 建窗口，各项设置与 HOST 第 3 节完全相同（尺寸、透明、Mica、系统标题栏、devtools 关、拖放关、导航与新窗口、下载、权限的拒绝），WebView 数据目录为 `<data_dir>\webview`。
9. `app.run(…)`。单实例锁要一直持有到 `run` 返回。

`main.rs`：

```rust
fn main() {
    if let Err(error) = water_desktop::run(water_desktop::service_backend) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
```

release 构建隐藏控制台的写法不变。

## 3. 单实例

```rust
pub struct InstanceLock(std::fs::File);
pub fn acquire_instance_lock(data_dir: &std::path::Path) -> Result<InstanceLock, StartupError>;
```

- 在 `<data_dir>\water.lock` 用 `OpenOptions` 打开（读写、不存在就创建），并用 `std::os::windows::fs::OpenOptionsExt::share_mode(0)` 独占。这是标准库接口，不需要 unsafe。
- 打开时遇到共享冲突（`raw_os_error() == Some(32)`）返回 `AlreadyRunning`，其它错误返回 `Failed`。
- 锁文件不写内容，退出时不删除。
- 第二个实例只打印“Water 已经在运行。”并以 1 退出，本版不去激活第一个窗口。

## 4. 服务接线

```rust
pub const CLEAN_ENABLED: bool = false;

pub struct ServiceBackend(pub water_service::Service);
impl Backend for ServiceBackend { … }        // call 原样转发；IpcError 的 code、message_zh 原样变成 IpcFailure

pub struct HostPicker { … }
impl HostPicker {
    pub fn new(initial_directory: String) -> Self;
    pub fn begin(&self) -> Option<PickGuard>;  // 已在选择中返回 None；PickGuard 释放时清除标记
}
impl water_service::FolderPicker for HostPicker { … }

pub fn service_config(ctx: &HostContext) -> water_service::ServiceConfig;
pub fn service_backend(ctx: &HostContext) -> Result<std::sync::Arc<dyn Backend>, StartupError>;
```

- **`ServiceBackend`** 不解释、不缓存、不改写结果。
- **`HostPicker::pick`**：
  1. 先 `begin()`。拿不到时返回 `IpcError { code: "busy", message_zh: "正在进行另一项任务，请稍候。" }`，防止连点打开两个选择框。
  2. 拿到后调用 `pick_folder(&initial_directory)`。`IpcFailure` 原样变成 `IpcError`。
  3. 结束时（包括出错）标记随 `PickGuard` 一起清除。

  选择框跑在调用它的线程上。Tauri 的同步命令在主线程执行，与 F2 补单 01 的 STA 选择框一致。
- **`service_config`**：
  - `data_dir` = `ctx.data_dir`，即服务数据与 `webview`、`water.lock` 同在一个目录，与 SERVICE 第 2 节“生产：%LOCALAPPDATA%\Water”一致；
  - `app_version` = `env!("CARGO_PKG_VERSION")`；
  - `clean_enabled` = `CLEAN_ENABLED`；
  - `platform` = `WindowsPlatform::new()`；
  - `picker` = `HostPicker::new(ctx.home_dir.clone())`。
- **`service_backend`**：`Service::new(service_config(ctx))`。失败时返回 `StartupError::Failed`。

## 5. 测试（唯一测试文件 `tests/host_v1.rs`，精确五个）

前四个沿用 HOST 第 5 节与 F2 补单 01 的内容，并按下面补充；新增第五个。测试中不打开窗口与选择框，不读真实用户位置，除 `mklink /J` 外不启动进程。

1. **`host_config_boundary`**：不变。
2. **`host_navigation_boundary`**：不变。
3. **`host_command_registry`**：原有内容不变，另加两项核对，失败信息含 `HOST_COMMANDS`。
   - 读 `src/` 的源码文本，核对 17 个 `#[tauri::command]` 函数都在，并且每个函数除 `backend` 之外的参数名，按 Tauri 默认规则转成 camelCase 后，与 IPC 第 2 节该命令的参数键完全一致。例如 `scan_id` → `scanId`，`group_ids` → `groupIds`。
   - `generate_handler!` 里恰好列出这 17 个命令。
4. **`host_data_directory`**：原有内容不变，另加单实例核对，失败信息含 `HOST_SINGLE_INSTANCE`。
   - 在本次随机目录里，第一次 `acquire_instance_lock` 成功，持有期间第二次返回 `AlreadyRunning`；
   - 释放后再次获取成功。
5. **`host_service_wiring`**（新增）：在本树 `.local/w3-f3-fixtures/` 的随机目录里，用测试自己的 `Platform` 构造真实的 `water_service::Service`。这个平台的已知文件夹都在该随机目录下，盘、时间、占用都是合成的。
   - 用 `ServiceBackend` 包起来，`clean_enabled` 取 `CLEAN_ENABLED`。
   - 失败信息分别含 `HOST_CLEAN_DISABLED` 与 `HOST_WIRING`。核对：
     - `app_state` 成功，且 `busy` 为 `"idle"`；
     - `clean_prepare` 返回的失败值序列化后**恰好是** `{"code":"unavailable","message_zh":"这一版只做体检，清理功能会在下一版开放。"}`（`HOST_CLEAN_DISABLED`）；
     - 未知命令的 `invalid` 原样透传（`HOST_WIRING`）；
     - `service_config` 生成的配置 `clean_enabled` 为 false（`HOST_CLEAN_DISABLED`），`data_dir` 等于传入的目录（`HOST_WIRING`）。
   - `HostPicker`（初始目录用相对路径，保证不会打开选择框）：持有 `begin()` 的守卫时，`pick` 返回 busy；释放后 `pick` 返回 invalid。失败信息含 `HOST_PICKER`。

**有效负控**（每条只改 `src/` 下真正被调用的一行）：
- nc1 `HOST_CLEAN_DISABLED`：让清理开关为真；
- nc2 `HOST_SINGLE_INSTANCE`：让锁文件不再独占；
- nc3 `HOST_COMMANDS`：从 `generate_handler!` 里去掉一个命令（`generate_handler!` 的每个命令各占一行，rustfmt 默认如此）。

## 6. 整机窗口检查（`--mode native --final`，提交干净后跑一次）

检查器离线构建 debug 版 `water.exe`，把 `WATER_DATA_DIR` 设为本树 `.local/w3-f3-native/<时间戳>`，启动一次。然后由整机观察器 `scripts/acceptance/w3-wired-native-observe.ps1` 按 manifest 里的步骤，用 UI 自动化驱动界面。只调用按钮与链接的 Invoke，不合成鼠标或键盘输入。步骤如下：

1. 首页出现“开始一次体检”，并且没有“无法连接 Water 服务”。这证明服务已接上。截图 `home`。
2. 点“开始体检”，等结果页出现“本次体检共识别”，最多 300 秒；出现“体检未能完成，请重新体检。”即失败。这是**一次真实的整机只读扫描**。截图 `results`。
3. 点“清理所选”，必须出现“这一版只做体检，清理功能会在下一版开放。”。截图 `clean-disabled`。
4. 依次打开“增长趋势”“清理记录”“扫描位置”，各自等到页面副标题后截图，分别为 `trends`、`history`、`locations`。
5. 关闭窗口。

检查器另外核对：
- 标题 Water、系统背景类型 2（Mica）、正常退出 0、WebView 子进程全部结束、WebView 数据在私有目录。
- 数据目录里只有 `webview`、`water.lock`、`settings.json`（可无）与服务的五个子目录。
- `scans` 与 `snapshots` 各恰好 1 个文件，`plans`、`cleans`、`journal` 都为空。也就是说，整个过程只留下了这一次体检，没有产生任何清理计划或清理记录。

**预算**：原生窗口整票 1 次，选择框 0 次。失败不重跑，写受阻回执。观察器只比较页面文字，不把页面内容写进证据；截图里会有本机的分类体量，但没有文件路径（不打开详情抽屉）。

## 7. 已知取舍（M1 限制，本票不做）

- **release 构建启动失败时用户看不到提示**：没有控制台，也没有不经 FFI 或新插件就能弹的对话框。只有退出码 1。
- **第二个实例**只打印提示并退出，不激活第一个窗口。
- **默认数据目录不能在联接后面**：比如用户用联接搬过 AppData，宿主与服务存储都会拒绝，Water 启动不了。待 D 加固或 M2 时一起重新评估。
- **占用提示显示进程名**（`chrome`、`msedge`），不是产品名，界面打磨时再改。
- **WebView2 自身的环境变量覆盖**（如 `WEBVIEW2_USER_DATA_FOLDER`）宿主控制不了。
- 选择框没有父窗口，可能出现在 Water 窗口后面；防重入已由 `HostPicker` 保证。
- 打包会带上界面的 `tests/`，同 HOST 第 7 节。

## 8. M1 验收（总控，本票验收之后）

- 总控在私有验收树重跑本 SPEC 第 6 节的整机检查（验收树单独 1 次窗口，又一次真实只读扫描），并逐张看截图。
- 之后是否请用户亲手打开 Water 试用（包括“添加文件夹”的真实选择框），由用户决定。用户自己启动时数据会写到 `%LOCALAPPDATA%\Water`，这是用户本人的操作。
- 两项都满足即宣布 M1 体检 Alpha。
