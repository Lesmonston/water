# SERVICE-M3D：增长的对比基准与历史文案（W9-L3）

2026-11-02，总控（Claude）冻结。补充 [SERVICE-M3C](../m3c-v1/SERVICE-M3C.md) 与 [SERVICE-M3C-ADD-01](../m3c-v1/SERVICE-M3C-ADD-01.md)，冲突时以本文为准。只改 `packages/water-service/`。不碰清理计划，IPC 的形状不变。

本单与 W9-L1（规则）、L2（扫描）、L4（进程）同时进行，编译时只依赖它们现有的类型。L2 把增长的间隔下限提到 24 小时（[SCAN-M3D](SCAN-M3D.md) 第 4 节），本单相应地给增长找一个够早的对比基准，否则一天体检几次就永远看不到增长。

## 1. 增长的对比基准

1. 体检开始时，在已有记录里选**增长基准**：
   - 状态为 `completed` 或 `partial`；
   - `ended_at` 不晚于本次开始时间减 24 小时；
   - 符合的有多条时，取 `ended_at` 最晚的一条。
2. 本次完成（`completed` 或 `partial`）且有基准时，增长按基准计算：`growth(基准的显示快照, 本次快照)`。没有基准或本次没完成时，增长为空。
3. 保存的记录在 `previous_scan_id` 之后新增 `growth_base_scan_id`：基准的 `scan_id`，没有基准时为 `null`。
4. 记录的 `previous_at` 只用于增长的展示（洞察里“与 X 月 Y 日相比”的日期、组详情里增长的 `since`），改为**基准的 `ended_at`**。
   - 重新载入时：记录里有 `growth_base_scan_id` 这个键，就按它找；值为 `null` 时没有。
   - 没有这个键的旧记录，照原来按 `previous_scan_id` 找。
5. 不变：
   - `previous_scan_id` 仍是开始时的上一条记录；
   - `consumed` 的处理照旧；
   - 趋势、预测、洞察的其余算法照旧；
   - IPC 字段与形状照旧。

## 2. 历史：停下的体检

`history_list` 里体检那一行：
- 记录状态为 `cancelled` 的，`summary_zh` 为 `已停止，识别 N 类位置`，其中 N 的算法不变；
- 其余状态的文案不变；
- `bytes` 不变。

## 3. 历史：清理摘要

`history_list` 里清理那一行的 `summary_zh`：
- **N**：清理结果视图里 `status` 为 `done` 或 `partial` 的组数，也就是真删了东西的组。原来是视图里的全部组数。
- **M**：报告里 `status` 为 `skipped` 的项数（不变）。
- **F**：报告里 `status` 为 `failed` 的项数。
- 文案：F 为 0 时是 `清理 N 组，跳过 M 项`；F 大于 0 时是 `清理 N 组，跳过 M 项，失败 F 项`。

已保存的旧清理记录同样按这个规则显示，都在读取时计算。

## 4. 测试

`tests/service_v1.rs` 仍是精确六个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 放在 | 内容 |
|---|---|---|
| `SERVICE_M3D_GROWTH_BASE` | `service_trends_locations` | 用假时钟依次体检 A（时刻 T）、B（T + 2 小时）、C（T + 25 小时）。断言：<br>• B 的增长为空，`growth_base_scan_id` 为 `null`；<br>• C 的 `growth_base_scan_id` 为 A，增长按 A 计算；<br>• C 的洞察日期、组详情的 `since` 都是 A 的时间；<br>• 重启服务重新载入后，C 的这些值不变；<br>• 去掉 `growth_base_scan_id` 键的旧记录，照旧按 `previous_scan_id` 取时间 |
| `SERVICE_M3D_HISTORY` | `service_trends_locations` | 一次中途停止的体检，历史行为 `已停止，识别 N 类位置`；完成的那次文案不变 |
| `SERVICE_M3D_CLEAN_SUMMARY` | `service_clean_flow` | 一次清理里有真删了的组、整组跳过的组和失败项，摘要只数真删了的组并写出失败数；没有失败时不出现“失败” |

本文预计不需要改任何原有断言。若有必然要改的，先写受阻回执。

## 5. 负控与真实冒烟

- **nc1**：增长基准改回“上一条记录”，测试以 `SERVICE_M3D_GROWTH_BASE` 失败。
- **nc2**：清理摘要的组数改回视图里的全部组数，测试以 `SERVICE_M3D_CLEAN_SUMMARY` 失败。
- 负控只认 `src/` 里的改动。
- **真实冒烟**（`--mode real`）与第八波 K4 相同：一次只读真实体检，关闭清理。
