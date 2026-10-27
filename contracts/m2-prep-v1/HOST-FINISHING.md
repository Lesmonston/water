# HOST-FINISHING：宿主收尾（M2 准备）

2026-10-27，总控（Claude）。补充 [WIRING](../desktop-v1/WIRING.md) 与 [HOST](../desktop-v1/HOST.md)；冲突时以本文为准。只改 `apps/water/host/`。

来源：F3 验收的 4 条低级观察，以及 WIRING 第 7 节的已知取舍里不用 FFI、不加依赖就能做的几条。

## 1. 正常退出（F3 观察 1）

- 现在 `app.run` 不返回：tao 直接结束进程，后面的 `drop(instance_lock)` 永远不执行，服务的 `Drop` 也不运行。
- 改为 Tauri 2.12.5 的 `App::run_return`。它返回后：
  - 托管的后端（服务）随 `App` 一起释放；
  - 再释放实例锁；
  - `run` 返回 `Ok(())`，进程退出码 0。
- 窗口关闭的行为不变，整机检查要求退出码 0。

## 2. 第二个实例唤起第一个窗口（WIRING 第 7 节）

- 现在第二次启动时只打印提示、退出码 1，第一个窗口不会出现在前面。
- 改为用数据目录里的一个信号文件（不用网络、不开进程、不用 FFI）：
  - **第二个实例**拿实例锁失败（`AlreadyRunning`）时：
    - 在数据目录写一个名为 `activate.signal` 的空文件，已存在就更新；
    - 然后正常退出，退出码 0。
  - **第一个实例**：
    - 主窗口建好后，起一个后台线程，每 250～500 ms 查一次这个文件；
    - 看到就删掉它，并在主线程里对主窗口依次取消最小化、显示、设为焦点；
    - 应用退出时线程随之结束，不得阻止退出。
- 公开函数（供测试调用，名字固定）：
  - `pub fn signal_activation(data_dir: &Path) -> Result<(), StartupError>`：写信号文件。
  - `pub fn take_activation(data_dir: &Path) -> bool`：有信号就删掉并返回 `true`，否则返回 `false`。读写失败一律当作没有信号。
- 信号文件只是一个名字固定的空文件。数据目录本身的检查不变，信号文件不得是链接；是链接或目录时，当作没有信号，也不删除。

## 3. 服务起不来时也有窗口（WIRING 第 7 节“release 启动失败看不到提示”）

- release 构建没有控制台。现在服务创建失败时，进程直接退出码 1，用户什么都看不到。
- 改为：Tauri 应用已建好、数据目录与实例锁都已就绪、但**后端创建失败**时：
  - 照常打开主窗口，后端换成 `UnavailableBackend`；
  - 界面会显示已有的“无法连接 Water 服务”状态，不需要改界面。
- 公开函数（名字固定）：`pub fn backend_or_unavailable<F>(make_backend: F, ctx: &HostContext) -> Arc<dyn Backend>`。`make_backend` 失败时返回 `UnavailableBackend`。
- 数据目录或实例锁失败（第 2 条的 `AlreadyRunning` 除外）仍是退出码 1。这里不新增对话框。

## 4. 默认数据目录在联接后面（WIRING 第 7 节）

- 现在 `%LOCALAPPDATA%` 若被用户用联接搬到别的盘，数据目录逐级检查会遇到重解析点并拒绝，Water 启动不了。
- 改为：只对 Tauri 给出的**默认基目录**（`local_data_dir`）在使用前解析一次链接，得到它的真实路径：
  - 解析结果若是 `\\?\X:\...` 形式，去掉 `\\?\` 前缀；
  - 解析结果不是本地盘符路径（UNC、卷 GUID 等）→ 照旧失败。
- 真实路径之下的 `Water\`、`Water\webview\` 照旧要求是真实目录、不得是链接，规则不变。
- `WATER_DATA_DIR` 覆盖路径**不解析**，规则不变。
- 落在 `prepare_data_directories(override_dir, local_data_dir)` 内部，签名不变。

## 5. 测试的三处问题（F3 观察 2、3、4）

1. **夹具父目录竞争**：`host_data_directory` 与 `WiringFixture` 并行时争着创建同一个父目录。改为创建时容忍“已存在”，或每个测试用自己的父目录。
2. **`service_backend` 没有直接测试**：
   - 用夹具数据目录构造 `HostContext`，直接调用 `service_backend`；
   - 断言得到的后端能应答 `app_state`，并且 `clean_enabled` 为 `false`。
3. **夹具 `Drop` 里的断言**：`Drop` 里不得 `assert`/`panic`，否则会中止测试进程、掩盖第一个失败。清理失败只记录，在测试主体里显式检查。

## 6. 测试（仍是精确 5 个，名字不变）

`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `HOST_SINGLE_INSTANCE` | 第 2 条：`signal_activation` 之后 `take_activation` 返回 `true`，并且信号文件已删除；再调一次返回 `false`；信号文件是目录或链接时返回 `false` 且原物不动 |
| `HOST_STARTUP_VISIBLE` | 第 3 条：`make_backend` 失败时，`backend_or_unavailable` 返回的后端对任何命令都回 `unavailable`；成功时返回原后端 |
| `HOST_DATA_JUNCTION` | 第 4 条：夹具里用联接指向真实目录作为 `local_data_dir`，准备成功，返回的数据目录在真实路径下且不含 `\\?\`；`WATER_DATA_DIR` 覆盖路径经过联接时仍被拒绝；`Water\` 本身是联接时仍被拒绝 |
| `HOST_BACKEND_DIRECT` | 第 5 条第 2 项 |

原有标记（`HOST_CLEAN_DISABLED`、`HOST_COMMANDS` 等）与断言不变。

## 7. 仍不做（照旧记为已知取舍）

- 选择框没有父窗口：要改 `packages/native-picker` 的接口；
- WebView2 自身的环境变量覆盖：宿主不用 `unsafe` 就清除不了；
- release 启动在 Tauri 本身建不起来时没有提示（没有窗口可用，又不加 FFI）；
- 打包会带上界面的 `tests/`。

日常使用的 release 构建由总控在本票合入后做，不在本票。

## 8. 不变

- 依赖（`Cargo.toml`、`Cargo.lock`）、`tauri.conf.json`、`capabilities/main.json`；
- 命令列表、清理关闭（`CLEAN_ENABLED` 为 `false`）、导航与权限策略、CSP；
- 不新增 `unsafe`，不开进程、不联网、不读 `WATER_DATA_DIR` 以外的环境变量；
- 整机检查的 11 步与文字。
