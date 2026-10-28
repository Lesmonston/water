# HOST-M3-FIX：宿主收尾补遗（服务没起来时不等、时限与测试）

2026-10-28，总控（Claude）。补充 [HOST-M3](HOST-M3.md)，冲突时以本文为准；HOST-M3 未被本文改动的部分全部仍然有效。只改 `apps/water/host/`。

依据：[第六波收单验收](../../docs/acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md) I2 一节（独立审查中级 1 条、低级 3 条，总控变异 c2、c4 没被抓到）。用户 10-28 同意做 M3 收尾（“先做M3的收尾吧”）。

## 1. 服务没起来时，关窗与退出都不等（审查中级）

- 现在：服务初始化失败时，`backend_or_unavailable` 装入 `UnavailableBackend`，`app_state` 永远出错，`clean_state` 永远是 `Unknown`。于是关窗时关窗保护先等 5 秒（点关闭没有反应），窗口关掉后 `RunEvent::Exit` 又等 5 秒；第二个 5 秒里实例锁和激活线程还在，用户这时再打开 Water，这次打开会丢失；系统关机也白等。
- 服务没起来就不可能有清理在进行。改为：
  - `Backend` trait 增加一个带默认实现的方法：

    ```rust
    fn available(&self) -> bool { true }
    ```

  - `UnavailableBackend` 返回 `false`；`BackendSlot` 在里面没有后端（已 `take`）时返回 `false`，有后端时返回里面那个后端的 `available()`；
  - `clean_state`：`available()` 为 `false` 时**直接返回 `NotCleaning`，不调用 `app_state`**；其余照 HOST-M3 第 2 条；
  - 因此 `stop_cleaning_within`、`stop_cleaning_and_wait` 与关窗保护在服务没起来时立即放行：返回 `Idle` / `false`，不调用 `clean_stop`。
- 服务起来了、但 `app_state` 出错的情形不变：仍是 `Unknown`，照 HOST-M3 第 2 条处理。
- 真实服务（`service.rs` 里的后端）用默认实现，不改。

## 2. 退出时限包括第一次查状态（审查低级）

- 现在：`stop_cleaning` 的计时从第一次 `clean_state` 返回之后才开始；查状态本身（服务要查各盘剩余空间）不计入 10 秒。
- 改为：`stop_cleaning_within` 的 `limit` 从**进入函数时**开始算，包括第一次查状态。
- 第一次查状态返回时如果已经超过 `limit`，而状态是 `Cleaning` 或 `Unknown`：仍然调用**一次** `clean_stop`，然后立即返回 `TimedOut`，不再查状态。
- 不设 `limit` 的 `stop_cleaning_and_wait` 行为不变。

## 3. “查不到”的计时只算连续的（测试补强）

HOST-M3 第 2 条“`Unknown` 连续累计 5 秒”的意思是：中间只要有一次查到 `Cleaning`，计时就重新开始。现在的实现是对的，但没有测试（总控变异 c2 没被抓到）。补测试，见第 5 节。

## 4. 源码接线断言补强（测试补强）

- `RunEvent::Exit` 接线的源码断言现在只找 `tauri::RunEvent::Exit` 这串字；换成 `RunEvent::ExitRequested`（以它开头）也能通过（总控变异 c4 没被抓到）。改为能区分 `Exit` 与 `ExitRequested`，并且确认 `stop_cleaning_within` 的调用在这个分支**里面**。
- 关窗保护的源码断言现在只匹配一行原文。改为能抓到“`Unknown` 也放行关窗”的写法（例如把条件写成 `!= CleanState::Cleaning`）。
- 这两条是旧断言，获准改写；失败信息仍带原标记 `HOST_EXIT_DURING_CLEAN`、`HOST_CLOSE_UNKNOWN`。

## 5. 测试（仍是精确 5 个，名字不变）

`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。新断言加在已有测试里：

| 标记 | 内容 |
|---|---|
| `HOST_UNSTARTED_SERVICE` | 第 1 条：`clean_state(&UnavailableBackend)` 为 `NotCleaning`；对 `UnavailableBackend`、装着 `UnavailableBackend` 的 `BackendSlot`、已 `take` 的 `BackendSlot`，`stop_cleaning_within` 立即返回 `Idle`（远小于 1 秒）、`stop_cleaning_and_wait` 返回 `false`；一个 `available()` 为 `true` 但调用总出错的脚本后端仍是 `Unknown`（HOST-M3 行为不变） |
| `HOST_EXIT_DEADLINE` | 第 2 条：脚本后端第一次 `app_state` 用时明显超过 `limit`（例如睡 80 ms、`limit` 40 ms）并回答 `cleaning`：返回 `TimedOut`，`app_state` 只被调用 1 次，`clean_stop` 恰好 1 次 |
| `HOST_UNKNOWN_RESET` | 第 3 条：收到停止后依次回答“查不到”约 3 秒、“正在清理”一次、“查不到”约 3 秒、最后“没在清理”：`stop_cleaning_and_wait` 等到最后的“没在清理”才返回（累计算法会在 5 秒时提前放弃） |
| `HOST_EXIT_DURING_CLEAN`、`HOST_CLOSE_UNKNOWN`（已有） | 第 4 条的两条源码断言 |

其余原有标记与断言不变。第 3 条的测试会多用约 6 秒，可以接受。

## 6. 不做

- “关窗保护已经因连续查不到而放弃后，退出时不再等”：第 1 条去掉了这种情形的现实来源（服务没起来），剩下的“服务起来了但一直查不到”极少见，不再加接线。
- 真实的系统关机仍不试。

## 7. 不变

- HOST-M3 第 4 节的一切：依赖、`tauri.conf.json`、权限、图标、命令列表、导航与 CSP、私有 WebView 目录；不用 `.setup()`，不新增 `unsafe`，不开进程、不联网，不读 `WATER_DATA_DIR` 以外的环境变量；
- `stop_cleaning_and_wait`、`stop_cleaning_within`、`clean_state` 的签名与 `CleanStop`、`CleanState` 的成员；
- 整机检查仍是 9 步夹具清理闭环。
