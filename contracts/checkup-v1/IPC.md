# Water 桌面 IPC v1（`water.ipc.v1`）

2026-10-26 冻结。界面（WATER-W2-E）通过 Tauri `invoke` 调用下列命令；可信宿主（下一波的桌面接线票）实现它们，并在内部调用 A–D 四个 crate。界面只认这里的形状。

## 1. 通用

- 调用：`window.__TAURI__.core.invoke(command, args)`。命令名 snake_case；参数键 camelCase（Tauri 默认转换）。返回值键 snake_case。
- 字节数、可用空间一律十进制字符串；时间为 RFC 3339 UTC。
- 失败时 Promise 拒绝，值为 `{"code": <code>, "message_zh": <可直接显示的一句话>}`。code 取值：`busy`、`not_found`、`stale`、`invalid`、`unavailable`、`cancelled`。界面不得显示 code，只显示 message_zh。
- 界面绝不传路径。需要路径的操作（添加自定义文件夹）由宿主打开系统选择框。
- 进行中的任务靠轮询：扫描与清理期间每 250ms 调一次对应 progress 命令；空闲时不轮询。

## 2. 命令

| 命令 | 参数 | 返回 |
|---|---|---|
| `app_state` | 无 | AppState |
| `scan_start` | 无 | `{"scan_id"}`；忙时 busy |
| `scan_cancel` | `{scanId}` | `{}` |
| `scan_progress` | 无 | ScanProgress |
| `scan_result` | `{scanId}` | ScanResultView |
| `group_detail` | `{groupId}` | GroupDetail |
| `clean_prepare` | `{groupIds}` | CleanPreview |
| `clean_start` | `{planId, confirmToken}` | `{"clean_id"}` |
| `clean_stop` | 无 | `{}` |
| `clean_progress` | 无 | CleanProgress |
| `clean_result` | `{cleanId}` | CleanResultView |
| `trends` | 无 | Trends |
| `history_list` | 无 | `[HistoryEntry]` |
| `locations_get` | 无 | Locations |
| `locations_set_category` | `{category, enabled}` | Locations |
| `custom_root_add` | 无 | `{"added": CustomRootView}` 或 `{"cancelled": true}` |
| `custom_root_remove` | `{rootId}` | Locations |

## 3. 形状

```text
AppState = {app_version, platform:"windows", busy:"idle"|"scanning"|"cleaning",
  drives:[{root:"C:\\", label_zh:"系统盘", is_system:bool, total_bytes, free_bytes}],
  last_scan: null | {scan_id, finished_at, recommended_bytes, recommended_by_drive:[{root, bytes}], added_7d_bytes|null},
  insights:[Insight]}

ScanProgress = {scan_id|null, state:"idle"|"running"|"completed"|"partial"|"cancelled"|"failed",
  categories:[{category, title_zh, state:"waiting"|"running"|"done", found_bytes}],
  visited_entries, found_bytes, percent:0-100, elapsed_ms}

ScanResultView = {scan_id, finished_at, duration_ms, status,
  totals:{recognized_bytes, recommended_bytes, confirm_bytes, advisory_bytes, protected_bytes, unrecognized_bytes},
  recommended_by_drive:[{root, bytes}],
  insights:[Insight],
  categories:[{category, title_zh, subtitle_zh, total_bytes, groups:[GroupView]}]}

GroupView = {group_id, title_zh, owner_zh, level, category, drive_root,
  item_count, eligible_count, file_count, total_bytes, eligible_bytes, newest_activity|null,
  summary_zh,                      // 行内副标题，如“48 个目录 · 最近 10 月 25 日”
  growth: null | {bytes_delta, count_delta, since},
  in_use: null | {process_label_zh},   // 如“Chrome 正在运行，将跳过占用的项”
  selectable: bool,               // recommended/confirm 且 eligible_count>0
  default_selected: bool}         // 仅 recommended 且 selectable

Insight = {kind:"leak"|"growth", group_id, title_zh, message_zh}

GroupDetail = {group: GroupView, what_zh, why_zh, after_zh, fix_hint_zh|null,
  items:[{display_path, total_bytes, newest_activity|null, eligible:bool, reason_zh|null}],  // ≤200 条
  items_total, top_keys:[{key, count, bytes, newest_activity}]}

CleanPreview = {plan_id, confirm_token, item_count, total_bytes,
  groups:[{group_id, title_zh, level, item_count, total_bytes, in_use_note_zh|null}],
  by_drive:[{root, bytes}], irreversible:true}

CleanProgress = {clean_id|null, state:"idle"|"running"|"completed"|"stopped"|"failed",
  done_items, total_items, freed_bytes, group_index, group_count, current_group_title_zh|null}

CleanResultView = {clean_id, finished_at, estimate_bytes, freed_bytes,
  drives:[{root, free_before, free_after}],
  groups:[{group_id, title_zh, status:"done"|"partial"|"skipped"|"failed", freed_bytes,
           notes_zh:[string]}],   // 如“6 个配置正在使用，已跳过”
  journal_display_path}

Trends = {points:[{at, root, free_bytes}], growth:[{group_id, title_zh, level, bytes_delta, count_delta, bytes_per_day}],
  leaks:[{group_id, title_zh, message_zh, fix_hint_zh, active:bool}]}

HistoryEntry = {kind:"scan"|"clean", id, at, summary_zh, bytes}

Locations = {categories:[{category, title_zh, description_zh, enabled:bool, locked:bool}],
  custom_roots:[CustomRootView]}
CustomRootView = {root_id, display_path, last_scanned_at|null, found_bytes|null}
```

## 4. 约束

- `clean_prepare` 只接受当前最新扫描中 `selectable` 为真的组；否则 `invalid`。扫描之后若又开始新扫描，旧计划 `stale`。
- `clean_start` 的 confirm_token 一次有效；重复提交或与 plan_id 不配对返回 `invalid`。
- 宿主保证：清理只针对计划中的条目，并按 [CLEAN](CLEAN.md) 逐项复核；界面无法扩大范围。
- 界面在扫描或清理进行中禁用开始类按钮；收到 busy 时显示 message_zh。

## 5. 界面测试用的回放数据

[ui-fixtures.json](ui-fixtures.json) 给出每个命令在典型状态下的真实形状样例（数据取自 2026-10-26 本机只读摸底）。界面测试用它搭建测试内的假宿主，假宿主只存在于测试文件中，不进入产品代码。
