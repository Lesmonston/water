# IPC-M3C：界面接口增量（M3 收口）

2026-10-31，总控（Claude）冻结。补充 [IPC](../checkup-v1/IPC.md)（`water.ipc.v1`），冲突时以本文为准。依据：[第八波计划](../../docs/dispatch/wave8/PLAN.md)（已拍板）。

- 服务（W8-K4）产出这些形状，宿主（W8-K5）转发，界面（W8-K6）消费。
- 样例见 [ui-fixtures-m3c.json](ui-fixtures-m3c.json)，它是 `checkup-v1/ui-fixtures.json` 的增量：同名形状以新文件为准，没写到的照旧。
- 通用约定不变：
  - 参数键 camelCase，返回键 snake_case；
  - 字节数用十进制字符串；
  - 界面**永远不传路径**。

## 1. 命令

原 17 个命令照旧，另有两处变化：

| 命令 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `clean_prepare` | `{groupIds, excludeItemIds}` | CleanPreview | `excludeItemIds` 为字符串数组，界面可以传空数组。宿主只在非空时把它转给服务，否则只转 `{groupIds}`。服务两种形状都接受 |
| `skip_add` | `{itemId}` | Locations | 新增：把最新扫描里这一项的路径记为“以后都跳过” |
| `skip_remove` | `{skipId}` | Locations | 新增：取消一条“以后都跳过” |

命令总数为 19。

## 2. 形状增量

```text
AppState += checkup_due: null | {days_since_last: int|null}
  // 没有完成过体检，或上次完成距今满 7×24 小时：非 null；从没体检过时 days_since_last 为 null

GroupView:
  total_bytes, eligible_bytes        // 改为按文件去重后的体量（每项内同一文件只算一次）
  += logical_bytes                    // 去重前的逻辑字节之和（原 total_bytes 的口径）
  += by_drive:[{root, item_count, eligible_bytes}]   // 按条目所在盘拆分，按 root 排序；eligible_bytes 为去重后
  in_use: null | {process_label_zh, item_count}      // 新增 item_count：扫描时判为在用的可清理项个数

GroupDetail.items[] += item_id, in_use: null | {process_label_zh}
  // item_id 为扫描结果里的 i-000123；total_bytes 改为去重后
  // 用户设为以后都跳过的项：eligible 为 false，reason_zh 为“已设为以后都跳过”

ScanResultView.totals / recommended_by_drive / AppState.last_scan.recommended_*  // 一律改为去重后的体量

CleanPreview += excluded_count       // 本次被排除、未进入计划的条目数
  // item_count、total_bytes、groups[].item_count / total_bytes、by_drive 都是排除之后、去重后的数

Locations += skipped:[{skip_id, display_path, added_at}]   // 至多 64 条，按 added_at 升序
CustomRootView += is_drive_root: bool                      // display_path 可以是 "F:\\"

Trends += forecast:[{root, days_to_full: int|null, bytes_per_day, basis_days, note_zh|null}]
Trends += orphans: null | {scan_id, at, total_memory_bytes|null,
                           chains:[{name, matched_pattern, process_count, memory_bytes|null, started_at}]}
```

## 3. 约束

### 排除条目

- `excludeItemIds` 至多 5000 个、不得重复。每个都必须同时满足：
  - 是最新一次本地扫描里的条目；
  - 属于所选的某个组；
  - 是可清理的。
  任一不满足就返回 `invalid`。
- 排除只能缩小范围。某组因排除而一项不剩时，从计划中去掉该组；所有组都空了，返回 `invalid`。

### 以后都跳过

- `skip_add` 的 `itemId` 必须属于最新扫描，且所在组的级别是 `recommended` 或 `confirm`，否则返回 `invalid`。
- 服务按条目解析出路径并写进设置；同一路径（不区分大小写）已存在时，原样返回 Locations。已满 64 条时返回 `invalid`。
- 以后每次扫描，路径与某条记录**完全相同**的条目，判为不可清理，原因 `user_skipped`。只认这条路径本身，不连带它的上级或下级。

### 整盘

- 自选文件夹可以是**非系统盘**的盘根（如 `F:\`）。系统盘根仍然拒绝。
- 选择框返回盘根时，宿主照常交给服务判断，界面不需要特别处理。

### 其它

- `checkup_due`、`forecast`、`orphans` 都是只读的展示数据，不触发任何动作。孤儿进程只列出，**不提供结束进程的入口**。
