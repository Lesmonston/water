# UI-M3C：界面接上 M3 收口的各项（W8-K6，界面单）

2026-10-31，总控（Claude）冻结。补充 [UI](../checkup-v1/UI.md)、[UI-POLISH](../hardening-v1/UI-POLISH.md) 与 [UI-M3-FIX](../m3-v1/UI-M3-FIX.md)，冲突时以本文为准。只改 `apps/water/ui/`。

- **形状**：按 [IPC-M3C](IPC-M3C.md)。测试用的假宿主数据取 `checkup-v1/ui-fixtures.json`，再叠加 [ui-fixtures-m3c.json](ui-fixtures-m3c.json) 的增量。
- **视觉**：按 [设计说明](../../docs/design/water-ui-v1/DESIGN.md)，白色磨砂玻璃、实色强调色、不用渐变堆叠、不用 emoji、文案说人话。
- **调用**：界面仍然只经 `ipc.mjs` 调用宿主，永远不传路径。

## 1. 组内排除与“以后都跳过”（分组详情 `views/detail.mjs`）

- 可勾选的组，详情里每个**可清理**条目前面有一个勾选框，默认勾上。取消勾选就是本次排除。
  - 选择模型（`model.mjs`）从“组 ID 集合”改为“组 ID → 排除的条目 ID 集合”。
  - 整组取消勾选时，清空该组的排除集合。
- 每个可清理条目有“以后都跳过”操作：
  - 调用 `skip_add({itemId})`；
  - 成功后提示“以后体检会跳过这个文件夹，可以在‘位置’里恢复”，并重新读取当前扫描的详情。
- 结果页的已选体量、已选项数（`views/results.mjs`）扣掉排除项。
- 确认框（`views/confirm.mjs`）显示“已排除 N 项”，N 取 `CleanPreview.excluded_count`，为 0 时不显示。
- `clean_prepare` 传 `{groupIds, excludeItemIds}`：
  - 排除列表只含所选组的条目；
  - 被整组排空的组不传。

## 2. 逐项“在用”

- **详情**：条目带 `in_use` 时，显示一个低调的标签，文字取 `process_label_zh`（如“Codex 正在使用”）。勾选框仍可操作；清理时服务会再查一次，占用的照样跳过。
- **结果页**：组行的在用提示改用新文案，例如“Codex 正在运行，将跳过 2 个占用的项”。

## 3. 按盘分组与筛选（`views/results.mjs`）

- 有不止一个盘出现在结果里时，结果页顶部出现盘筛选：全部盘，以及各盘（显示盘符和卷标）。
- 选中某个盘时：
  - 每组只显示该盘的条目数与体量，取自 `by_drive`；
  - 该盘没有条目的组隐藏；
  - 合计与已选体量也按该盘计算。
- 只有一个盘时不显示筛选。
- 筛选不改变选择：切换筛选不会勾上或取消任何组。

## 4. 位置页（`views/locations.mjs`）

- 自选文件夹列表里，`is_drive_root` 的项显示为“整个 F 盘”，副标题照旧显示上次扫描时间与体量。
- 新增“以后都跳过的文件夹”一节，列出 `skipped`（显示路径与加入日期），每条有“恢复”，调用 `skip_remove({skipId})`。列表为空时不显示这一节。
- “添加文件夹”的说明加一句：“也可以选择整个非系统盘”。

## 5. 首页提醒与趋势页（`views/home.mjs`、`views/trends.mjs`）

- **首页**：`checkup_due` 非 null 时，在首页卡片里显示一行提醒，旁边是“现在体检”按钮。
  - `days_since_last` 为 null：“还没有体检过”；
  - 否则：“已经 N 天没有体检”。
- **趋势页“几天后满”**：每个盘一行。
  - `days_to_full` 有值：“按最近 B 天的速度，约 N 天后满”，B 取 `basis_days`；
  - `days_to_full` 为 null：显示 `note_zh`。
  - 速度为负或为 0 时不画“满”的提示。
- **趋势页“残留进程”只读卡**：`orphans` 非 null 时显示。
  - 每条显示进程名、命中的特征、进程数、内存（`memory_bytes` 为 null 时显示“—”）、开始时间；
  - 卡片说明：“这些进程在启动它的程序退出后还留着，Water 只列出、不会结束它们。”
  - **不提供结束进程的按钮。**

## 6. 第七波遗留（J2）

1. **位置页的三个操作**（`addRoot`、`toggleCategory`、`removeRoot`），以及新增的 `skip_add` / `skip_remove`，读写位置时纳入页面读取编号（`routeReads`），过期的回应不覆盖新数据。
2. `fault()` 上方的注释改为与现行行为一致：被新读取取代的旧回应会被丢弃。
3. 提示条出现时，标题栏保持磨砂玻璃，不变成不透明的窗口色。
4. 加严三个测试：
   - `UI_READ_ORDER` 覆盖位置页的读写；
   - `UI_NOTICE_TOP` 真正检查提示条与正文不重叠、标题栏的背景是磨砂而不是任意 `rgb(`；
   - `UI_RECOVER_ERROR` 按状态判断，不按文字判断。
5. `afterEach` 之后才到达的控制台错误，记到产生它的那个测试上，或单独报告，不算给下一个测试。

`UI-M3-FIX.md` 第 66 行写 21 张截图，实际是 26 张。以本单清单里的 `requiredScreenshots` 为准；冻结文件不改。

## 7. 测试

- **单元测试**仍是精确三个：`ui_format_bytes_time`、`ui_selection_rules`、`ui_ipc_boundary`。
- **浏览器测试**仍是精确五个：`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`、`ui_m1_polish`。
- 新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `UI_M3C_EXCLUDE` | 取消勾选一项后：已选体量扣除；传给 `clean_prepare` 的 `excludeItemIds` 恰好是该项；确认框显示“已排除 1 项”；整组取消后不再带它的排除项 |
| `UI_M3C_SKIP` | “以后都跳过”调用 `skip_add` 且只传 `itemId`；位置页列出并能“恢复”，调用 `skip_remove` |
| `UI_M3C_DRIVE` | 两个盘的结果出现盘筛选；选 F 盘后合计与组数字取自 `by_drive`；只有一个盘时不出现；切换不改变选择 |
| `UI_M3C_INUSE_ITEM` | 带 `in_use` 的条目显示标签；组行显示新文案 |
| `UI_M3C_FORECAST` | 有天数、`note_zh`、不画提示三种情况 |
| `UI_M3C_ORPHANS` | 卡片内容与 fixtures 一致；没有任何“结束”按钮 |
| `UI_M3C_DUE` | 从未体检、N 天、不提醒三种情况 |
| `UI_IPC_NO_PATH`（已有，补断言） | 新命令的参数里没有任何路径 |

原有断言里，`ui_ipc_boundary` 中命令清单长度（17 → 19）**获准修改**，其余不变。

## 8. 截图

在原有 21 张之外新增 5 张：
- `detail-exclude-1240x820.png`：详情里取消一项、带一个“在用”标签；
- `results-drive-1240x820.png`：选中 F 盘；
- `locations-skipped-1240x820.png`：有整盘位置和两条“以后都跳过”；
- `trends-forecast-1240x820.png`：有“几天后满”与残留进程卡；
- `home-due-1240x820.png`：“已经 9 天没有体检”。

回执逐张写看到了什么。

## 9. 负控

- **nc1**：`clean_prepare` 的参数里不带排除，测试以 `UI_M3C_EXCLUDE` 失败。
- **nc2**：盘筛选时组数字仍取总数，测试以 `UI_M3C_DRIVE` 失败。
- **nc3**：`days_to_full` 为 null 时不显示 `note_zh`，测试以 `UI_M3C_FORECAST` 失败。
