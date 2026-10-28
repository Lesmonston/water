# SERVICE-M3-FIX：服务收尾补遗（清理进度的组序号、孤立快照）

2026-10-28，总控（Claude）。补充 [SERVICE-M2](../m2-v1/SERVICE-M2.md)、[SERVICE](../desktop-v1/SERVICE.md) 与 [SERVICE-HARDENING](../hardening-v1/SERVICE-HARDENING.md)；冲突时以本文为准。只改 `packages/water-service/`。

依据：第六波 I2 验收时总控真窗口检查看到清理页显示“第 0 / 1 组”（[收单验收](../../docs/acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md) I2 一节）；第五波 H2 遗留“扫描记录写失败时快照文件成了孤儿”。用户 10-28 同意做 M3 收尾。

## 1. 清理进度的 `group_index` 从 1 数

- 现在：清理进行中，`clean_progress.group_index` 是当前组在计划里的下标（从 0 数），结束时设成组数。界面照 [ui-fixtures.json](../checkup-v1/ui-fixtures.json)（`1`、`6`、`13`，共 13 组）按“第几组”显示，真实清理第一组时就显示“第 0 / 1 组”。
- 改为“第几组”，从 1 数：
  - 清理开始、计划里有组时：`group_index` 为 `1`（第一组），`current_group_title_zh` 照旧；
  - 处理某一项时：该项所在组在计划里的位置加 1；
  - 结束（`completed` 或 `stopped`）：等于 `group_count`（不变）；
  - 空闲：`0`（不变）。
- SERVICE 第 215 行“按计划中组的顺序给出”就是这个意思，本文明确为从 1 数。

## 2. 扫描记录写失败时删掉刚写的快照

- 现在：体检结束时先写 `snapshots/<scan_id>.json`，再写 `scans/<scan_id>.json`；后者失败时内存里回滚了，但快照文件留在磁盘上，成了没有记录对应的孤儿。
- 改为：`scans` 写失败时，删掉同一次刚写的 `snapshots/<scan_id>.json`（经存储层现有的删除，只删这一个文件）。删除失败不改变体检结果为 `failed` 的处理，也不报错给界面。
- 先写快照、再写记录的顺序不变。

## 3. 测试（仍是精确 6 个，名字不变）

`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`、`service_hardening`。新断言加在已有测试里：

| 标记 | 内容 |
|---|---|
| `SERVICE_GROUP_INDEX` | 第 1 条：清理进行中读到的 `group_index` 都在 `1..=group_count` 之间，第一组是 1；多组计划里后面的组序号更大；结束时等于 `group_count`；空闲时为 0 |
| `SERVICE_SNAPSHOT_ORPHAN` | 第 2 条：沿用现有“扫描记录写失败”的做法（在 `scans` 下用同名目录挡住写入），失败后 `snapshots/<scan_id>.json` 不存在；正常写成功时快照仍在 |

获准改动的旧断言：断言清理进行中 `group_index` 为 0 起数的地方（如有），改成从 1 数，回执逐条写出原值与新值。其余原有断言与标记不变。

## 4. 不变

- IPC 字段与形状（`group_index` 仍是整数）；`ui-fixtures.json`；
- 清理执行、停止与记录的其余行为；扫描与写盘顺序；存储层的删除只限它管的目录；
- 依赖、`Cargo.toml`、`Cargo.lock`；不改 `packages/junk-*`、宿主与界面。
