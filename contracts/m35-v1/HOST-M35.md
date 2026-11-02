# HOST-M35：宿主转发第十波命令，并能打开隔离区文件夹（W10-M5）

**草案，未冻结**（2026-11-02，总控 Claude 起草；与 m35-v1 其它契约一起冻结）。补充 [HOST](../desktop-v1/HOST.md)、HOST-M2、[HOST-M3](../m3-v1/HOST-M3.md)、[HOST-M3-FIX](../m3-v1/HOST-M3-FIX.md) 与 [HOST-M3C](../m3c-v1/HOST-M3C.md)，冲突时以本文为准。只改 `apps/water/host/`。

宿主仍只做薄转发，不解释服务的返回值（`commands.rs` 第 1 行的原则不变）。唯一的新能力是第 3 节：用资源管理器打开隔离区文件夹。命令形状见 [IPC-M35](IPC-M35.md)。

**派单时机**：契约冻结后即可派（第一批），按假后端做；服务（M7）此时还没有新命令，真后端对新命令回 `invalid`，不影响本单的检查。

## 1. 命令表

- `COMMANDS` 长度 19 → 36：原 19 个顺序不变，后面按 IPC-M35 第 1 节表格的顺序接上 17 个新命令。
- 每个新命令一个 `cmd_*(backend: &dyn Backend, …)` 与一个 `#[tauri::command]` 包装，加进 `generate_handler!`。参数名转成 camelCase 后恰好是 IPC-M35 表里的键。
- README 里的命令数改为 36。
- 不改 capabilities、CSP、导航、新窗口、下载、权限请求的拒绝设置；`plugins` 仍为空；不加依赖。

## 2. 转发规则

| 命令 | 宿主收到 | 发给服务 |
|---|---|---|
| `scan_start` | `location_ids: Option<Vec<String>>` | None 时恰好是 `{}`（与原来逐字节相同）；Some 时 `{"locationIds": [...]}`，原样转发（空数组也转，由服务判 `invalid`） |
| `clean_prepare` | `group_ids`、`exclude_item_ids`、`conclusion_version`、`chosen_mode`、`dedupe_id`、`dedupe_version`，都为 `Option` | 只放收到的键：`groupIds` 有值时照 HOST-M3C 第 1 节（`excludeItemIds` 非空才放）；`conclusionVersion`、`chosenMode`、`dedupeId`、`dedupeVersion` 有值就放。宿主不判组合对不对，服务判 |
| `group_items` | `group_id`、`row_id: Option`、`query: Option` | `{"groupId", "rowId", "query"}`，None 转成 `null` |
| 其余新命令 | 照 IPC-M35 表 | 照表，键与值原样 |

- 原有命令的转发不变；`clean_prepare` 只传 `group_ids`（与可选的排除）时，发出的 JSON 与原来逐字节相同。
- 宿主不校验 ID 与取值，校验在服务里。

## 3. `quarantine_reveal`：打开隔离区文件夹

```rust
pub trait Opener: Send + Sync { fn open_folder(&self, path: &str) -> Result<(), ()>; }
pub fn cmd_quarantine_reveal(backend: &dyn Backend, opener: &dyn Opener, target_id: String) -> Result<Value, IpcFailure>;
```

1. 调 `backend.call("quarantine_locate", {"targetId": target_id})`（服务的内部命令，SERVICE-M35 第 7 节）。服务的失败原样返回。
2. 取返回的 `path`，宿主自己再核一遍，任何一条不满足就返回 `invalid`，不打开：
   - 是字符串，形如 `X:\…`，不含 `/`、`..` 段、控制字符、`"`、`,`、`%`、`;`；
   - 最后一段是 `.water-quarantine`，或倒数第二段是 `.water-quarantine` 且最后一段是 1～48 个 `[0-9A-Za-z-]`（都不分大小写）；
   - `std::fs::symlink_metadata` 是目录，且不带重解析点属性（0x400）。
3. `opener.open_folder(path)`；失败返回 `unavailable`。成功返回 `{}`。
- 真实的 `Opener`：`<SystemRoot>\explorer.exe` 加这一个路径参数，`spawn` 后不等待；`SystemRoot` 取 `GetWindowsDirectoryW`（宿主新增的唯一系统函数，检查器的 `allowedFfi` 为宿主加它），取不到就失败。不经 shell，不拼命令行字符串。
- `quarantine_locate` **不**在 `COMMANDS` 里，也没有 `#[tauri::command]` 包装：界面拿不到任何路径。

## 4. 退出与关闭

- `clean_state`：`app_state.busy` 为 `"cleaning"` **或 `"purging"`** 时都算正在清理（永久删除也是删东西，退出前同样要停）；`"deduping"` 只读，不算。
- 其余不变：关窗与退出照旧调 `stop_cleaning_within`，它发的 `clean_stop` 在服务里同时停永久删除（SERVICE-M35 第 7 节）。
- 测试：`HOST_EXIT_WIRING` 所在的测试里加一例，假后端先报 `purging`、收到 `clean_stop` 后报 `idle`，`stop_cleaning_within` 返回 `Stopped`（标记 `HOST_M35_PURGE_EXIT`）。

## 5. 测试

`tests/host_v1.rs` 仍是精确五个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 放在 | 内容 |
|---|---|---|
| `HOST_M35_COMMANDS` | `host_command_registry` | `COMMANDS` 恰好 36 个、顺序对；新名字与 IPC-M35 第 1 节表格逐个相同；`generate_handler!` 与 `COMMANDS` 相同；包装函数参数转 camelCase 后与表一致；`quarantine_locate` 不出现在 `COMMANDS`、`generate_handler!` 与任何 `#[tauri::command]` 里 |
| `HOST_M35_FORWARD` | `host_service_wiring` | 假后端收到的参数：`scan_start` 两种；`clean_prepare` 的旧两种逐字节不变，`{conclusionVersion, chosenMode}`、`{dedupeId, dedupeVersion}` 原样；`group_items` 的 null；其余 15 个新命令各一例 |
| `HOST_M35_REVEAL` | `host_service_wiring` | 用假 `Opener`：合法的隔离根与编号目录各打开一次、路径逐字相同；服务回 `not_found` 时原样返回、不打开；路径不含 `.water-quarantine`、含 `..`、含逗号、是 UNC、是文件、是联接（在本树 `.local/` 下用 `mklink /J` 建）各判 `invalid`、不打开；`Opener` 失败回 `unavailable` |

原有断言中，以下几处与本文必然冲突，**获准修改**，其余不变：
1. 命令总数 19 → 36（`HOST_M3C_SKIP` 的计数断言，以及“`skip_*` 排在最后”改为“`skip_*` 排在原有 19 个的最后”）；
2. 命令名与 IPC 表的比对，表的来源加上 `contracts/m35-v1/IPC-M35.md`；
3. `cmd_clean_prepare` 的 `group_ids` 改为 `Option`，相应的参数断言。

## 6. 负控与整机检查

- **nc1**：`quarantine_reveal` 不做第 3 节第 2 步的核对，测试以 `HOST_M35_REVEAL` 失败。
- **nc2**：`scan_start` 在没有位置时发 `{"locationIds": null}`，测试以 `HOST_M35_FORWARD` 失败。
- 负控只认 `src/` 里的改动。
- **整机检查**（`native --final`）同第八波 K5：夹具在本树 `.local/w10-m5-native/` 下，七个分类全部关闭，只清理夹具；原生窗口 1 个，选择框 0 个；界面仍是基线版本，整机步骤沿用 UI-POLISH 第 1 节的 11 处文字。**整机检查不点“打开文件夹”**（不在检查里弹资源管理器窗口）。
