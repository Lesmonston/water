# WATER-W3-F2 桌面宿主 SPEC（`water-desktop`）

2026-10-26 冻结，总控（Claude）。宿主是 Water 的 Windows 桌面程序。它负责：

- 打开一个带 Mica 的窗口，加载已验收的界面 `apps/water/ui/`；
- 把界面的 17 个 [IPC v1](../checkup-v1/IPC.md) 命令原样转给一个后端；
- 守住窗口的安全边界；
- 提供系统文件夹选择框。

本票的后端是“服务未接入”占位（所有命令返回 unavailable）。真正的服务核心（F1 `water-service`）在下一张接线票 F3 接上。本票做法沿用第一波 AC 已验收的静态桌面壳 `apps/desktop-preview`（离线依赖、私有 WebView 目录、导航/新窗口/下载/权限拒绝），区别是开启 JavaScript 与 IPC。

## 1. crate 形状

- 目录 `apps/water/host`，独立 workspace，包名 `water-desktop`；lib `water_desktop`（`src/lib.rs`），bin `water`（`src/main.rs`）。`edition = "2024"`，`rust-version = "1.95"`，`publish = false`，四个 auto 发现关闭。
- 依赖**只有**：
  - `tauri = { version = "=2.12.5", default-features = false, features = ["wry", "common-controls-v6"] }`
  - `serde =1.0.229`（derive）、`serde_json =1.0.151`
  - 路径依赖 `water-native-picker = { path = "../../../packages/native-picker" }`
  - build 依赖 `tauri-build = "=2.7.4"`
- `Cargo.lock` 里每个 registry 包的名字、版本与 checksum 必须在第一波 AC 已验收的 `apps/desktop-preview/Cargo.lock` 中出现。不得引入任何新的 registry 包，也不得下载。Cargo 命令一律离线，用 [镜像契约](../desktop-bootstrap-mirror-v1/MIRROR.json) 的 `cargoArguments` 指向已有缓存（检查器负责）。
- `#![forbid(unsafe_code)]`（lib 与 main）。不写 FFI；文件夹选择框只调用 `water_native_picker`。不启动进程、不联网。
- 生产代码只读一个环境变量 `WATER_DATA_DIR`（第 3 节），其余一律不读。

## 2. 文件白名单

```text
apps/water/host/Cargo.toml、Cargo.lock、build.rs、tauri.conf.json、README.md、.gitignore（只写 gen/）
apps/water/host/capabilities/main.json
apps/water/host/icons/icon.ico（自有简单图标，≤64 KiB）
apps/water/host/src/lib.rs、src/main.rs，以及 src/ 下其它 .rs
apps/water/host/tests/host_v1.rs
```

`apps/water/ui/` 只读，不得修改。

## 3. 配置与窗口

`tauri.conf.json` 必须恰好是下面的语义（键可以多写 Tauri 默认值以外的任何东西都不行）：

```json
{
  "productName": "Water",
  "version": "0.1.0",
  "identifier": "app.water.desktop",
  "build": { "frontendDist": "../ui" },
  "app": {
    "windows": [],
    "withGlobalTauri": true,
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "assetProtocol": { "enable": false },
      "capabilities": ["main"]
    }
  },
  "bundle": { "active": false },
  "plugins": {}
}
```

- `capabilities/main.json`：`{"identifier":"main","windows":["main"],"permissions":["core:window:allow-start-dragging"]}`，不得有其它权限。
- 窗口在 `setup` 里用 `WebviewWindowBuilder` 创建，label `main`，标题 `Water`：
  - 尺寸：默认 1240×820，最小 1040×720，居中。
  - 外观：`.transparent(true)`，用 Tauri 的窗口效果开启 Mica（`Effect::Mica`）。系统不支持 Mica 时界面保持原样，不报错。
  - 标题栏：保留系统标题栏（decorations 为 true）。设计稿第 3 节的“无系统标题栏”本波不做，见第 7 节。
  - 安全：`.devtools(false)`、`.disable_drag_drop_handler()`，JavaScript 开启。
  - `.on_navigation`：只放行打包页面，与 AC 的 `is_bundled_navigation` 相同（`tauri://localhost`、`http://tauri.localhost` 的 `/`、`/index.html`，片段不论）。
  - `.on_new_window` 拒绝，`.on_download` 拒绝，`.on_permission_request` 拒绝。
- **数据目录**：
  - 有 `WATER_DATA_DIR` 时用它：必须是绝对路径，从盘根到它的已存在各级都不能是重解析点。
  - 否则用 `app.path().local_data_dir()` 下的 `Water`。
  - 目录不存在就创建。WebView 的数据目录为其中的 `webview` 子目录。
  - 宿主不在别处写文件。

## 4. 命令与后端

```rust
pub struct IpcFailure { pub code: String, pub message_zh: String }   // Serialize 成 {"code","message_zh"}
pub trait Backend: Send + Sync + 'static {
    fn call(&self, command: &str, args: serde_json::Value) -> Result<serde_json::Value, IpcFailure>;
}
pub struct UnavailableBackend;   // 每个命令都返回 {"code":"unavailable","message_zh":"Water 服务暂时不可用。"}
pub const COMMANDS: [&str; 17];  // IPC 第 2 节的 17 个命令名，顺序同表
pub fn pick_folder() -> Result<Option<String>, IpcFailure>;   // 用 water_native_picker 打开系统文件夹选择框；初始目录为用户主目录
pub fn run(backend: std::sync::Arc<dyn Backend>) -> Result<(), String>;
```

- 每个 IPC 命令对应一个 `#[tauri::command]` 同步函数，名字与 IPC 完全相同。它只把 Tauri 解出的参数重新组成 IPC 的 camelCase 对象（例如 `scan_cancel` 组成 `{"scanId": scan_id}`，`clean_prepare` 组成 `{"groupIds": [...]}`，无参数的命令组成 `{}`），然后调用 `Backend::call` 并原样返回。
- 宿主不解释、不缓存、不改写结果。为了能测试，这部分写成 `pub fn` 形式，例如 `pub fn cmd_scan_cancel(backend: &dyn Backend, scan_id: String) -> Result<Value, IpcFailure>`；Tauri 命令函数只是取出状态后调用它们。
- `main.rs`：本票调用 `run(Arc::new(UnavailableBackend))`。release 构建隐藏控制台窗口；`run` 出错时打印一句固定的中文错误并以 1 退出。
- `pick_folder` 本票不接到任何命令上（`custom_root_add` 由后端处理），只作为 F3 的接线点存在，并在测试里检查它的错误映射（非 Windows 或 COM 不可用时返回 unavailable）。本票不得在测试里打开选择框。

## 5. 测试（唯一测试文件 `tests/host_v1.rs`，精确四个测试）

- `host_config_boundary`：解析仓库里的 `tauri.conf.json` 与 `capabilities/main.json`，逐项等于第 3 节，CSP 字符串完全相同；lib 里提供 `validate_config(raw) -> Result<(), …>`，`run` 启动前也调用它。改动任一项（加权限、放宽 CSP、关闭 withGlobalTauri、换 frontendDist）都被拒，失败信息含 `HOST_CONFIG`。
- `host_navigation_boundary`：
  - 放行：`tauri://localhost`、`http://tauri.localhost/`、`/index.html`、带片段的 `#/results`。
  - 拒绝：外部 http/https、`file:`、`data:`、`javascript:`、带用户名或端口、`tauri.localhost.evil`、编码过的路径、`..`、其它页面。
  - 失败信息含 `HOST_NAVIGATION`。
- `host_command_registry`：
  - `COMMANDS` 与 IPC 表完全一致；
  - 用记录调用的测试后端逐个调用 17 个 `cmd_*`，核对传给后端的命令名、参数键与值；
  - 后端返回的成功值与失败值原样回到调用方；
  - `UnavailableBackend` 对 17 个命令都返回指定 unavailable；
  - 失败信息含 `HOST_COMMANDS`。
- `host_data_directory`：在本树 `.local/w3-f2-fixtures/` 的随机目录里检验数据目录解析。合格情形：覆盖值为绝对路径时采用它、目录不存在时创建、webview 子目录正确。拒绝情形：相对路径、祖先是联接（用 `mklink /J` 造）。测试结束只删本次的随机目录。

有效负控：
- nc1 `HOST_CONFIG`：让配置校验放过多出的权限；
- nc2 `HOST_NAVIGATION`：让导航校验放行外部地址。

## 6. 原生窗口检查（`--mode native --final`，只在提交干净后跑一次）

检查器离线构建 debug 版 `water.exe`，把 `WATER_DATA_DIR` 设为本树 `.local/w3-f2-native/<时间戳>`，启动一次，然后用 UI 自动化做以下检查：
1. 30 秒内找到本进程标题为 `Water` 的主窗口；
2. 页面文字含“磁盘体检”与“无法连接 Water 服务”（占位后端下界面的应有表现）；
3. 读取窗口的系统背景类型，期望为 Mica（`DWMWA_SYSTEMBACKDROP_TYPE` = 2），记录在回执里；
4. 用 `PrintWindow` 截取本窗口一张图作为证据，只截本窗口，不截桌面；
5. 关闭窗口，确认进程以 0 退出、WebView 子进程全部结束、WebView 数据目录落在指定的私有目录下。

窗口预算：本票整个周期只 1 次；失败不自动重跑，写受阻回执。目录选择框 0 次。

## 7. 已知取舍（本波不做）

- 设计稿第 3 节要求无系统标题栏、在内容上叠 40 px 透明标题区与窗口按钮。已验收的界面没有画窗口按钮，IPC v1 也没有窗口命令。本波保留 Windows 11 系统标题栏，配合 Mica。界面里的 `data-tauri-drag-region` 标题区仍可拖动窗口（为此只开 `core:window:allow-start-dragging` 一个权限）。改成自绘标题栏要另出界面补单。
- `frontendDist` 指向整个 `apps/water/ui`，会把界面的 `tests/` 一并打包。界面不会加载它们，导航校验也只放行 `index.html`。正式发布前再处理打包清单。
