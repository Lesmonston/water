# HOST-M2：宿主打开清理

2026-10-27，总控（Claude）。补充 [WIRING](../desktop-v1/WIRING.md)、[HOST](../desktop-v1/HOST.md) 与 [HOST-FINISHING](../m2-prep-v1/HOST-FINISHING.md)；冲突时以本文为准。只改 `apps/water/host/`。

依据：
- [M2 计划](../../docs/M2-PLAN-20261027.md) 第 2 节；
- [G6 收单验收](../../docs/acceptance/wave4/controller/WATER-W4-G5G6G7-REVIEW-20261027.md)的独立审查（中级 1 条、低级 4 条）。

## 1. 宿主自己持有后端（G6 中级）

- Tauri 2.12.5 构建时，路径插件把持有 `AppHandle` 的 `PathResolver` 放进状态管理器，形成引用环，托管的状态永远不会释放。于是 `run_return` 返回后，后端（服务）一直活到进程结束，而实例锁已经先放掉了。HOST-FINISHING 第 1 条“后端随 `App` 一起释放”实际没有做到。
- 改为托管一个转发用的后端槽：
  - 公开类型（名字固定）：
    - `pub struct BackendSlot`；
    - `pub fn new(backend: Arc<dyn Backend>) -> BackendSlot`；
    - `pub fn take(&self) -> Option<Arc<dyn Backend>>`；
    - `impl Backend for BackendSlot`。
  - 命令经槽转发。取走之后，任何命令都回 `UnavailableBackend` 的同一个失败值。
  - 转发时只在取引用的一瞬间持锁，调用后端时不持锁。
- `run_return` 返回后依次：
  1. 从槽里取走后端并丢弃，使服务在这里释放（命令此时都已结束）；
  2. 结束并 join 激活线程；
  3. 释放实例锁；
  4. 返回 `Ok(())`。

## 2. 清理进行中关窗

- 主窗口收到关闭请求时，先问后端 `app_state`：
  - `busy` 不是 `"cleaning"`（空闲或扫描中）：照常关闭。扫描只读，随进程结束即可。
  - `busy` 是 `"cleaning"`：
    1. 阻止这次关闭；
    2. 调用后端 `clean_stop`；
    3. 在后台线程里每 200 ms 查一次 `app_state`，直到 `busy` 不再是 `"cleaning"`；
    4. 然后关闭主窗口，这次不再阻止。
- 等待期间界面照常显示清理进度，用户能看到清理停下。不设超时：清理执行器每处理完一个子项就检查停止信号。
- 等待期间再次请求关闭：仍阻止，不重复调用 `clean_stop`。
- 公开函数（名字固定，供测试调用）：`pub fn stop_cleaning_and_wait(backend: &dyn Backend, poll: Duration) -> bool`。
  - 不在清理时立即返回 `false`，不调用 `clean_stop`；
  - 在清理时调用一次 `clean_stop`，等到不再清理后返回 `true`。
  - 关窗逻辑必须用它。

## 3. 打开清理

- `CLEAN_ENABLED` 改为 `true`。SERVICE 第 8 节第 1 条的开关从此为开；WIRING 中“清理保持关闭”的要求不再适用。
- 原来的 `HOST_CLEAN_DISABLED` 断言改为 `HOST_CLEAN_ENABLED`：
  - 生产配置 `clean_enabled` 为 `true`；
  - 直接构造的生产后端对 `clean_prepare` 不再返回“这一版只做体检，清理功能会在下一版开放。”。
- G6 加的 `HOST_BACKEND_DIRECT` 里“生产后端保持清理关闭”同样改为打开。

## 4. 信号文件只更新时间（G6 低级 3）

- `signal_activation` 不得截断已有文件：
  - 不存在就新建空文件；
  - 已存在且是普通文件，只更新修改时间，不写内容、不改长度；
  - 是目录、链接或带重解析属性的对象，仍然失败，原物不动。
- 原因：数据目录若被指到别人可写的位置，有人在那里放一个硬链接，截断会清空链接到的文件。

## 5. 启动接线可测（G6 低级 4）

- 把“拿实例锁的结果怎么处理”提成公开函数（名字固定）：`pub fn on_lock_result(result: Result<InstanceLock, StartupError>, data_dir: &Path) -> Result<Option<InstanceLock>, StartupError>`。
  - `Ok(lock)` → `Ok(Some(lock))`；
  - `AlreadyRunning` → 写信号，`Ok(None)`；
  - 其它错误原样返回。
- `run` 必须用它，并在 `Ok(None)` 时返回 `Ok(())`。

## 6. 去掉 `\\?\` 后核对含义（G6 低级 5）

- 默认基目录解析后去掉 `\\?\` 前缀，然后再规范化一次。两次结果去掉前缀后必须相同，否则 `DataDirectoryError`。
- 这样，结尾带点或空格、保留名这类只能在前缀下表示的路径，不会被悄悄换成另一个目录。

## 7. 整机检查：夹具清理闭环

由检查器做，执行者不写这部分代码，但实现必须让它通过。仍只开 1 个窗口：
1. 检查器在本树 `.local/w5-h3-native/` 下生成合成夹具：
   - 一个带 `CACHEDIR.TAG` 的缓存目录（约 3 MB，推荐清理）；
   - 一个普通源码文件；
   - 一个测试浏览器配置（需要确认，默认不勾）；
   - 全部设成 72 小时前。
2. 数据目录里预先写好设置：七个分类全部关闭，另加这个夹具文件夹。受保护的位置照服务规则仍会统计占用（只读名字与大小），但永远不可勾选；能勾选的只有夹具里的内容。
3. 自动操作：
   1. 首页；
   2. 开始体检，进入结果页；
   3. 清理所选，出现永久删除确认框；
   4. 点“永久删除 3 MB”；
   5. 等“清理完成”；
   6. 查看清理记录。
   每一步截图。
4. 检查器核对：
   - 缓存目录已删，源码文件与浏览器配置原样还在；
   - 服务存储里体检、快照、计划、清理记录、日志各 1 份；
   - 清理记录状态 `completed`，释放字节等于夹具的确切字节数，每项 `deleted`、失败 0；
   - 日志有 intent 与 result；
   - 退出码 0。

步骤与夹具写在第五波清单 H3 的 `nativeSteps`、`nativeFixture` 里。总控已用同一份配置在自检树里跑通。

## 8. 测试（仍是精确 5 个，名字不变）

`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `HOST_BACKEND_RELEASE` | 第 1 条：用一个在 `Drop` 时记下标记的测试后端放进槽：<br>- 转发调用得到它的回答；<br>- `take` 之后转发调用回 `unavailable`；<br>- 丢弃取出的 `Arc` 后标记已记下 |
| `HOST_CLOSE_DURING_CLEAN` | 第 2 条：测试后端先报告 `cleaning` 若干次再报告 `idle`：`stop_cleaning_and_wait` 调用 `clean_stop` 恰好一次，返回 `true`；后端一直空闲时返回 `false` 且不调用 `clean_stop` |
| `HOST_CLEAN_ENABLED` | 第 3 条 |
| `HOST_SINGLE_INSTANCE`（已有，改断言） | 第 4 条：已有内容的普通信号文件，`signal_activation` 之后长度与内容不变、修改时间更新 |
| `HOST_RUN_WIRING` | 第 5 条：三种结果分别得到 `Some`、写了信号的 `None`、原样的错误 |
| `HOST_DATA_JUNCTION`（已有，补断言） | 第 6 条：两次规范化结果不同时报错（夹具能构造就测；不能构造时回执说明，并由代码审查验证） |

其余原有标记与断言不变。

## 9. 不变

- 依赖（`Cargo.toml`、`Cargo.lock`）、`tauri.conf.json`、`capabilities/main.json`、图标；
- 命令列表、导航与权限策略、CSP、私有 WebView 目录；
- 不用 Tauri 的 `.setup()`，不新增 `unsafe`，不开进程、不联网，不读 `WATER_DATA_DIR` 以外的环境变量；
- HOST-FINISHING 第 2～4 条已验收的行为。
