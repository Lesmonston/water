# SERVICE-M3C：服务接上 M3 收口的各项（W8-K4）

2026-10-31，总控（Claude）冻结。补充 [SERVICE](../desktop-v1/SERVICE.md)、[SERVICE-HARDENING](../hardening-v1/SERVICE-HARDENING.md)、[SERVICE-M2](../m2-v1/SERVICE-M2.md) 与 [SERVICE-M3-FIX](../m3-v1/SERVICE-M3-FIX.md)，冲突时以本文为准。只改 `packages/water-service/`。

**本单在 W8-K1（进程）、W8-K2（规则）、W8-K3（扫描）验收合入之后才派**：服务在编译时直接用到它们的新类型与新字段。工单会给出合入后的首次 HEAD。

产出的形状见 [IPC-M3C](IPC-M3C.md) 与 [ui-fixtures-m3c.json](ui-fixtures-m3c.json)。

## 1. 用去重后的体量

- 界面上的一切字节数都改用去重后的值：条目、组、各级合计、按盘、清理预览。条目取扫描结果的 `unique_bytes`，组取 `unique_bytes` / `eligible_unique_bytes`。
- `GroupView.logical_bytes` 给出去重前的逻辑字节之和。
- 清理计划里每项的 `total_bytes` 照旧写逻辑字节（清理执行器的口径不变）；预览与确认显示去重后的数。
- 读旧扫描记录时，按 SCAN-M3C 的兼容规则补齐，不报错。

## 2. 逐项标出在用

- 扫描结束时，对 `in_use.mode` 不为 `none` 的组，逐个判断它的每一个可清理项，不再找到第一个就停。
- 结果以可选键存进扫描记录（与已有的 `in_use` 可选键同样处理旧记录）。
- 展示：
  - `GroupView.in_use = {process_label_zh, item_count}`。文案为“<产品名> 正在运行，将跳过 N 个占用的项”，产品名照现有对照表；名字未知时去掉 `.exe`；
  - `GroupDetail.items[].in_use = {process_label_zh}`，文案为“<产品名> 正在使用”。
- `runs_from_or_references_item` 与另外两种方式一样，经 `process-scan` 的 `in_use` 判断。规则里的方式字符串原样映射到 `InUseMode`，**未知方式按“无法确认”处理**，不得当成 `none`。
- 清理时的复核（Guard）不变：仍在清理开始时重新取快照、逐项判断、命中就跳过。

## 3. 整盘位置

- 自选文件夹校验 `valid_custom` 另外接受**非系统盘**的盘根 `X:\`，条件是同时满足：
  - 它是 `Platform::drives` 列出的固定盘；
  - 不是系统盘；
  - 文字形式与规范化形式都不包含任何已知文件夹。
- 盘根的 `root_id` 为 `drive-<小写盘符>`（如 `drive-f`），`display_path` 为 `F:\`，`is_drive_root` 为真。其它规则与上限（16 个）不变。
- 预算不变（2000 万项、900 秒）。超出时照旧以 `partial` 完成，并在结果里如实标出。

## 4. 按盘拆分

- `GroupView.by_drive`：按条目路径的盘根分组，给出各盘的条目数与去重后的可清理体量，按 root 排序。
- `drive_root` 保持原义：最大一项所在的盘。

## 5. 排除条目与“以后都跳过”

- `clean_prepare` 接受 `{groupIds}` 与 `{groupIds, excludeItemIds}` 两种形状，键必须恰好是其一。校验与缩小范围的规则见 IPC-M3C 第 3 节。
- `CleanPreview.excluded_count` 为实际排除的条目数，预览的各项数字都是排除之后的。
- **设置增加 `skipped`**：每条为 `{skip_id, path, added_at}`，至多 64 条，`skip_id` 形如 `s-` 加 6 位序号。
  - `settings_version` 加一，读旧设置时补空数组；
  - 未知键仍按原规则处理。
- `skip_add` / `skip_remove` 按 IPC-M3C 处理：
  - 路径只由服务从最新扫描结果里取，**界面永远不传路径**；
  - 返回 Locations，其中 `skipped` 按 `added_at` 升序。
- 扫描结束、生成视图之前：路径（不区分大小写）与某条记录完全相同的可清理项，改为不可清理，原因 `user_skipped`，`reason_zh` 为“已设为以后都跳过”，并从可清理合计中扣除。

## 6. 孤儿进程（只列）

- 扫描时，在取进程快照的同一批次里调用 `orphans(snapshot, DEFAULT_ORPHAN_PATTERNS)`，按可选键 `orphans` 存进扫描记录。每条记录：
  - `name`、`matched_pattern`；
  - `process_count`：根进程加后代；
  - `memory_bytes`：可为 `null`；
  - `started_at`：根进程的创建时间。
- 至多 50 条，按 `memory_bytes` 降序，`null` 排在最后。
- `Trends.orphans` 取最近一次带此键的完成扫描，没有时为 `null`；`total_memory_bytes` 为各条之和，全部为 `null` 时也为 `null`。
- 只读，不结束、不挂起任何进程。

## 7. 体检提醒与“几天后满”

**`AppState.checkup_due`**：
- 没有完成过的扫描：`{days_since_last: null}`；
- 最近一次完成距今满 7×24 小时：`{days_since_last: 整天数}`；
- 否则为 `null`。

**`Trends.forecast`**：对每个有扫描点的固定盘逐个计算。

1. 取最近 30 天的扫描点。不足 3 个、或首末相隔不足 3 天：`days_to_full` 为 `null`，`note_zh` 为“至少需要 3 天内 3 次体检才能估算”。
2. 用同一时段内的清理记录扣掉清理造成的跳变：对每个点，减去它之前、首点之后在该盘上各次清理释放的空间之和。每次释放量为 `max(0, free_after − free_before)`。
3. 计算速度：`rate =（首点调整后可用 − 末点调整后可用）/ 相隔天数`。
   - `bytes_per_day` 为 rate 取整后的十进制字符串，可带 `-`；
   - `basis_days` 为相隔天数，保留一位小数。
4. 判定：
   - rate ≤ 0：`days_to_full` 为 `null`，`note_zh` 为“最近 30 天可用空间没有减少”；
   - 否则 `days_to_full = floor(末点实际可用 / rate)`；
   - 结果大于 3650：改为 `null`，`note_zh` 为“按现在的速度，十年内不会满”。

## 8. 第七波遗留（J3）

“扫描记录写失败后删除孤儿快照”这一步里的删除失败路径要补测试，**不加产品挂点**：
- 测试在删除前用不带 `FILE_SHARE_DELETE` 的方式打开该快照文件并保持打开，让删除失败；
- 断言服务不报错、状态回到 `idle`、`last_scan` 不是这次扫描。

## 9. 测试

`tests/service_v1.rs` 仍是精确 6 个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 |
|---|---|
| `SERVICE_M3C_UNIQUE` | 硬链接夹具：组与合计显示去重后的数，`logical_bytes` 为逻辑字节；计划里的 `total_bytes` 仍是逻辑字节 |
| `SERVICE_M3C_INUSE_ITEM` | 测试平台让同组两项中的一项在用：`GroupView.in_use.item_count` 为 1，详情里只有那一项带 `in_use`；未知方式按“无法确认”处理 |
| `SERVICE_M3C_DRIVE_ROOT` | 测试平台的非系统固定盘根可加入，`root_id` 为 `drive-x`；系统盘根、非固定盘、包含已知文件夹的盘根被拒 |
| `SERVICE_M3C_BY_DRIVE` | 跨两个盘的组，`by_drive` 数字正确且按 root 排序 |
| `SERVICE_M3C_EXCLUDE` | 排除一项后预览数字正确、`excluded_count` 正确、计划不含该项；排除不存在、属于别组、不可清理的项，或有重复，都返回 `invalid`；整组被排空时去掉该组；旧形状 `{groupIds}` 照旧可用 |
| `SERVICE_M3C_SKIP` | `skip_add` 后再扫描，该项为 `user_skipped`、不进入合计；`skip_remove` 后恢复；第 65 条返回 `invalid`；旧设置文件能读入并补空数组 |
| `SERVICE_M3C_ORPHANS` | 测试平台给出孤儿链：扫描记录与 `Trends.orphans` 形状、排序、合计正确 |
| `SERVICE_M3C_FORECAST` | 构造扫描点与清理记录：跳变被扣除、速度与天数和手算一致；不足 3 点、没有减少、超过十年三种情况的 `note_zh` 正确 |
| `SERVICE_M3C_DUE` | 没扫描过、6 天、7 天三种情况的 `checkup_due` 正确 |
| `SERVICE_SNAPSHOT_REMOVE_FAIL` | 第 8 节 |

旧断言里，因字节口径改为去重而必然变化的期望值**获准修改**（硬链接只出现在新夹具里，旧夹具的数值应当不变）。回执逐条写出原值与新值；其余原有标记与断言不变。

## 10. 负控（重门）

- **nc1**：排除校验不检查条目是否属于所选组，测试以 `SERVICE_M3C_EXCLUDE` 失败。
- **nc2**：扫描视图不应用“以后都跳过”，测试以 `SERVICE_M3C_SKIP` 失败。
- **nc3**：`valid_custom` 不排除系统盘根，测试以 `SERVICE_M3C_DRIVE_ROOT` 失败。

每条只改 `src/` 里一处，红了之后原字节恢复再变绿。

## 11. 不变

- 原有 IPC 命令的语义、错误码与清理流程；
- 存储布局（只新增可选键与设置字段）；
- 依赖与锁文件；
- 不新增 `unsafe`、进程启动、网络与环境变量读取。
