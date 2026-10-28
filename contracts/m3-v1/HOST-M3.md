# HOST-M3：宿主收尾（退出保护与关窗判断）

2026-10-28，总控（Claude）。补充 [HOST-M2](../m2-v1/HOST-M2.md)、[HOST-FINISHING](../m2-prep-v1/HOST-FINISHING.md)、[WIRING](../desktop-v1/WIRING.md) 与 [HOST](../desktop-v1/HOST.md)；冲突时以本文为准。只改 `apps/water/host/`。

依据：
- [M3 计划](../../docs/M3-PLAN-20261028.md)第 2 节，用户 10-28 拍板；
- [第五波收单验收](../../docs/acceptance/wave5/controller/WATER-W5-REVIEW-20261028.md) H3 一节的独立审查（中级 1 条、低级 4 条）。

## 1. 系统关机或注销时先停清理（H3 中级）

- 现在：系统关机、注销或重启管理器（`WM_ENDSESSION`）时，tao 先发出 `RunEvent::Exit`，随即 `std::process::exit(0)`，绕过了第 2 条的关窗保护。正在进行的清理被中途杀掉，清理记录不写，日志只有 intent。
- 改为：`run_return` 的事件回调收到 `RunEvent::Exit` 时，在回调里同步调用：

  ```rust
  pub fn stop_cleaning_within(backend: &dyn Backend, poll: Duration, limit: Duration) -> CleanStop;
  pub enum CleanStop { Idle, Stopped, TimedOut }
  ```

  - 不在清理（`app_state` 成功且 `busy` 不是 `"cleaning"`）：立即返回 `Idle`，不调用 `clean_stop`；
  - 在清理或状态未知（见第 2 条）：调用一次 `clean_stop`，每 `poll` 查一次，直到确认不再清理返回 `Stopped`，或累计等待超过 `limit` 返回 `TimedOut`；
  - `run` 里 `poll` 为 200 ms，`limit` 为 **10 秒**：系统关机时不能无限拖延；停止后执行器会做完当前一项并写记录，绝大多数情况 10 秒内完成。
- `RunEvent::Exit` 也会在正常关窗退出时到来。那时第 2 条已经等清理停下，这里会立即得到 `Idle`。
- 回调里不能调用会等待事件循环的东西（如关窗、`run_on_main_thread`）；只调用后端。

## 2. 查不到状态时按“可能在清理”处理（H3 低级）

- 现在：`app_state` 出错就当成“没在清理”，放行关窗，等待循环也提前结束。
- 改为三态：

  ```rust
  pub enum CleanState { Cleaning, NotCleaning, Unknown }
  pub fn clean_state(backend: &dyn Backend) -> CleanState;
  ```

  - `app_state` 成功且 `busy` 为 `"cleaning"` → `Cleaning`；成功且不是 → `NotCleaning`；出错 → `Unknown`。
- 主窗口关闭请求：
  - `NotCleaning` → 照常关闭；
  - `Cleaning` 或 `Unknown` → 阻止这次关闭，按 HOST-M2 第 2 条在后台线程停清理并等待，然后关窗。
- 等待中的判定（`stop_cleaning_and_wait` 与 `stop_cleaning_within` 共用）：
  - `NotCleaning` → 结束等待；
  - `Cleaning` → 继续等；
  - `Unknown` 连续累计 **5 秒** → 结束等待（服务已无法回答，再等也没有意义），其间每次都不重复调用 `clean_stop`。
- `stop_cleaning_and_wait(backend, poll) -> bool` 的签名与“确认在清理时返回 `true`、确认不在清理时返回 `false`”不变；起始状态为 `Unknown` 时调用一次 `clean_stop` 并按上面等待，返回 `true`。

## 3. 测试补强（H3 低级）

- 关窗测试用的脚本后端改为：**只有收到 `clean_stop` 之后**才开始倒数到空闲。这样“先等它自己停、最后才发停止”的错误实现过不了。
- `\\?\` 那条断言要真正走到“两次结果比较”：夹具里同时建 `weird-name.`（经 `\\?\`）与 `weird-name`，断言准备数据目录返回错误，并且没有在 `weird-name\` 下面建出 `Water`。

## 4. 不变

- HOST-M2 第 1、3～7 条与已验收行为；`stop_cleaning_and_wait` 的签名；
- 依赖（`Cargo.toml`、`Cargo.lock`）、`tauri.conf.json`、`capabilities/main.json`、图标；
- 命令列表、导航与权限策略、CSP、私有 WebView 目录；
- 不用 Tauri 的 `.setup()`，不新增 `unsafe`，不开进程、不联网，不读 `WATER_DATA_DIR` 以外的环境变量；
- 整机检查仍是 H3 的夹具清理闭环（9 步）。

## 5. 测试（仍是精确 5 个，名字不变）

`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `HOST_EXIT_DURING_CLEAN` | 第 1 条：脚本后端收到停止后才倒数：`stop_cleaning_within` 调一次 `clean_stop`，返回 `Stopped`；空闲时返回 `Idle` 且不调用；一直清理（收到停止也不变）时在 `limit` 后返回 `TimedOut`，且只调用一次 `clean_stop`；`run` 的源码在 `RunEvent::Exit` 分支调用它（与 `HOST_RUN_WIRING` 同样的源码检查即可） |
| `HOST_CLOSE_UNKNOWN` | 第 2 条：`clean_state` 三种结果；`app_state` 一直出错时 `stop_cleaning_and_wait` 调一次 `clean_stop`，约 5 秒后结束（测试里可用更短的 `poll`，累计上限仍按 5 秒） |
| `HOST_CLOSE_DURING_CLEAN`（已有，改脚本后端） | 第 3 条第一点：没收到 `clean_stop` 时永远报告 `cleaning` |
| `HOST_DATA_JUNCTION`（已有，补断言） | 第 3 条第二点 |

其余原有标记与断言不变。
