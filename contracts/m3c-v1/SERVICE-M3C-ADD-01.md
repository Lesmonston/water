# SERVICE-M3C 补充 01：跳过即时生效、盘根只收 NTFS/ReFS、排除里的已跳过项，以及几处澄清（W8-K4）

2026-11-01，总控（Claude）冻结。补充 [SERVICE-M3C](SERVICE-M3C.md)，冲突时以本文为准。只改 `packages/water-service/`。

来由：
- 第八波第一批验收。K6 审查发现，按 SERVICE-M3C 第 5 节，“以后都跳过”只在下次扫描结束时生效；界面跳过后，这一项在本次扫描里仍可清理，下一次“清理所选”会把它删掉。
- K3 审查发现，扫描与清理执行器都靠信息类 19/20 列目录，非 NTFS 文件系统可能不支持。
- 派单前总控盘点了 `tests/service_v1.rs` 里必然冲突的旧断言，见第 5 节。

## 1. “以后都跳过”立即作用于最新扫描

在 SERVICE-M3C 第 5 节之外：
- `skip_add` 成功写入设置后，服务立即在**最新扫描**里，把路径（不区分大小写）与新记录完全相同的可清理项改为不可清理：原因 `user_skipped`，`reason_zh` 为“已设为以后都跳过”。
- 同时更新：
  - 该组的可清理计数与各项体量（含 `by_drive`）；
  - 各级合计与按盘推荐量；
  - 该组详情。
  
  之后的 `scan_result`、`group_detail` 都反映这一变化。这一变化随扫描记录一起保存，重启后仍然生效。
- `clean_prepare` 生成计划时，再按当前的跳过名单挡一次：路径与任一记录相同的条目不进计划，计入 `excluded_count`。这是第二道保险，正常情况下第一步已经把它们改为不可清理。
- `skip_remove` 只改设置，不把最新扫描里已标为 `user_skipped` 的项改回可清理；下次扫描才恢复。

## 2. 盘根只接受 NTFS 或 ReFS 的固定盘

在 SERVICE-M3C 第 3 节之外：
- 自选文件夹是盘根时，除原有条件外，还要求该卷的文件系统是 NTFS 或 ReFS（不区分大小写）。
- 其它文件系统（如 exFAT、FAT32）或取不到时，返回 `invalid`，`message_zh` 为“只支持 NTFS 或 ReFS 格式的盘”。
- 只有通过了其它全部检查的盘根才用这句话；系统盘根、非固定盘、包含已知文件夹的盘根仍按原来的拒绝原因与文案。

**实现约束**：
- 文件系统名经 `Platform` 的**新方法**取得，例如 `fn volume_file_system(&self, root: &str) -> Option<String>`。
  - 新方法必须带默认实现，默认返回 `None`，即“取不到”；
  - `DriveInfo` 的字段**不改**，`AppState.drives` 的形状也不变。
  - 原因：宿主测试里的 `SyntheticPlatform`、总控的验收脚本都实现了 `Platform` 或构造了 `DriveInfo`，它们不在本单白名单里。
- **本单给 `Platform` 新增的任何方法都必须带默认实现**，例如孤儿进程如果需要新方法，也一样。
- Windows 实现里，`src/native_windows.rs` **获准新增一个系统函数** `GetVolumeInformationW`，只取文件系统名，其余输出参数传空或丢弃。写法同前：裸 `extern "system"`、`unsafe` 写安全说明。这是对 SERVICE-M3C 第 11 节“不新增 unsafe”的唯一例外。

## 3. 排除列表里的已跳过项

在 IPC-M3C 第 3 节的校验之外：`excludeItemIds` 里的某个 ID 指向的条目，如果是因为 `user_skipped` 而不可清理，就接受并忽略它，不返回 `invalid`，也不计入 `excluded_count`。其它不可清理的条目仍按原规则返回 `invalid`。

来由：界面跳过后会先在本地把这一项加入排除，如果重读详情失败，下一次清理请求会带着它。

## 4. 测试

新断言加在已有测试里：
- 第 1 条：标记 `SERVICE_M3C_SKIP`。
  - 跳过后不重新扫描，`group_detail` 里该项立即为 `user_skipped`，合计已扣除；`clean_prepare` 不含它。
  - 另在设置里直接写入一条跳过记录、不改扫描（模拟第一步没生效），`clean_prepare` 仍不含该项且计入 `excluded_count`。
- 第 2 条：标记 `SERVICE_M3C_DRIVE_ROOT`。测试平台的 exFAT 固定盘根被拒，NTFS 与 ReFS 盘根通过。
- 第 3 条：标记 `SERVICE_M3C_EXCLUDE`。

负控仍按 SERVICE-M3C 第 10 节。nc2 改为“`skip_add` 不改最新扫描”或“扫描视图不应用跳过”均可，测试都要以 `SERVICE_M3C_SKIP` 失败。

## 5. 澄清与获准修改的旧断言

### 5.1 形状样本改为叠加 m3c 增量

`tests/service_v1.rs` 的 `fixtures()` 读 `contracts/checkup-v1/ui-fixtures.json`，`shape()` 要求键集合完全相同。服务按 IPC-M3C 新增的键（`checkup_due`、组的 `logical_bytes`/`by_drive`/新 `in_use`、条目的 `item_id`/`in_use`、`skipped`、`forecast`/`orphans`、`excluded_count`、`is_drive_root`）必然让这些比对失败。**获准**这样改：

- `fixtures()` 先读 checkup-v1，再把 `contracts/m3c-v1/ui-fixtures-m3c.json` 的**顶层条目**整条覆盖上去（m3c 里的同名条目优先，IPC-M3C 开头的约定）。
  - m3c 的 `group_details` 包含 checkup-v1 的全部分组，不会丢样本；
  - 加一条断言（标记 `SERVICE_M3C_UNIQUE` 以外的新断言都可以，用 `SERVICE_M3C_SHAPE`）：覆盖后每个被比对的样本都存在且不是 `null`，避免样本缺失时 `shape()` 放过一切。
- `custom_root_add` 的比对样本从 `custom_root_add_added` 改为 m3c 的 `custom_root_add_drive`（键集合相同）。
- 受影响的比对：`service_ipc_contract` 里 `app_state`（两处）、`scan_result`、`group_detail`、`locations_get`、`locations_set_category`、`custom_root_add`、`custom_root_remove`、`trends`、`clean_prepare`；`service_trends_locations` 里的 `trends`。比对本身（`shape()` 的规则）不改。

### 5.2 在用文案

SERVICE-M3C 第 2 节把组的在用文案改为“<产品名> 正在运行，将跳过 N 个占用的项”。**获准**把下面这些旧期望改为新文案，N 按测试平台实际在用的项数：
- `service_scan_views` 的 `SERVICE_IN_USE_SAVED`：原“Chrome 正在运行，将跳过占用的项”；
- `service_hardening` 的 `SERVICE_PRODUCT_NAME`：edge-cache、chrome-cache、headless-browser-profiles、brave-cache 四条。

回执逐条写出原文、新文与 N 的来由。

### 5.3 在用的其它情况

- **快照取不到**（“无法确认”）：组的 `process_label_zh` 仍是原文“暂时无法确认是否在运行，清理时会再次检查”，`item_count` 为该组可清理项数；详情里每个可清理项的 `in_use.process_label_zh` 为同一句。
- **K4 之前保存的扫描记录**只有组级 `{process_label_zh}`：读出时 `item_count` 为 `null`，条目不带 `in_use`。IPC-M3C 里的 `item_count` 因此可为 `null`；界面不读它。
- **未知在用方式**：
  - 规则解析器已拒绝未知方式，服务拿到的方式只可能是四种之一。服务对四种方式穷举映射，不写兜底分支；
  - 扫描记录里出现未知方式时，记录仍按原规则不可读并保留（`service_storage_safety` 第 1332 行起的旧断言不变）；
  - 因此 SERVICE-M3C 第 2 节“未知方式按无法确认处理”与第 9 节 `SERVICE_M3C_INUSE_ITEM` 里“未知方式”一条**取消**。

### 5.4 旧记录与读取

`Record::load` 现在按精确键集合读记录。新增的可选键（逐项在用、`orphans`、跳过后的变化）必须**各自独立可缺**：
- 只缺其中任何一个的记录都要能读；
- `service_storage_safety` 里只删掉 `"in_use"` 的旧格式记录用例必须照旧通过。

这是实现约束，不改旧断言。

### 5.5 测试平台的盘

- 测试平台的盘列表改为可按测试注入，**默认列表不变**，仍是只有一个系统盘 `F:\`。所以 `service_trends_locations` 的 `points.len() == 2` 与“`F:\` 被拒、文案为‘这个位置太大或包含系统目录’”不变。
- 盘根的存在性与归属由 `Platform::drives` 证明，不再对盘根做目录检查与规范化：
  - 盘根必须在 `drives()` 里、是固定盘、不是系统盘、文件系统合格；
  - 再用文字比较确认没有任何已知文件夹以它开头。
  
  这样测试可以注入一个不存在的 `X:\`，`root_id` 为 `drive-x`。普通文件夹的校验不变。
