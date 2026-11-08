# IPC-M35：界面接口（设计 v2）

2026-11-05 冻结（11-02 起草，11-05 修订）。补充 [IPC](../checkup-v1/IPC.md)（`water.ipc.v1`）与 [IPC-M3C](../m3c-v1/IPC-M3C.md)，冲突时以本文为准。

- 服务产出这些形状，宿主转发，界面消费。
- 依据：界面设计 v2 第 3～6 节。
- 样例 `contracts/m35-v1/ui-fixtures-m35.json` 与本文一起冻结（照 IPC-M3C 的做法，是前两份样例的增量，同名形状以新文件为准）。
- 通用约定不变：参数键 camelCase，返回键 snake_case；字节数用十进制字符串；时间用 UTC RFC 3339；错误码只有 `busy`、`not_found`、`stale`、`invalid`、`unavailable`、`cancelled`，界面只显示 `message_zh`。
- **界面永远不传路径**：参数里只有 ID、决定、开关与天数；唯一的自由文字是第 4 节的搜索词，不得含 `\`、`/`、`:`。

## 1. 命令

原 19 个命令照旧（旧形状继续可用，宿主与服务对旧界面不变），新增 17 个，共 **36** 个。新命令按下表顺序排在原有命令之后。

| 命令 | 参数 | 返回 | 节 |
|---|---|---|---|
| `conclusion_get` | 无 | ConclusionView | 3 |
| `conclusion_decide` | `{version, decision}` | ConclusionView | 3 |
| `detail_get` | `{version, mode}` | DetailView | 4 |
| `group_items` | `{groupId, rowId, query}` | GroupItems | 4 |
| `quarantine_list` | 无 | QuarantineView | 6 |
| `quarantine_restore` | `{quarantineId, beside}` | RestoreResult | 6 |
| `quarantine_delete` | `{quarantineId}` | `{}` | 6 |
| `quarantine_progress` | 无 | QuarantineProgress | 6 |
| `quarantine_reveal` | `{targetId}` | `{}` | 6（宿主实现） |
| `dedupe_start` | `{locationId}` | `{"dedupe_id"}` | 7 |
| `dedupe_progress` | 无 | DedupeProgress | 7 |
| `dedupe_cancel` | `{dedupeId}` | `{}` | 7 |
| `dedupe_result` | `{dedupeId, expand}` | DedupeView | 7 |
| `dedupe_decide` | `{dedupeId, version, groupId, include}` | DedupeView | 7 |
| `locations_set_session_cleanup` | `{tool, enabled, days}` | Locations | 8 |
| `manifest_trust` | `{manifestId, trusted}` | Locations | 8 |
| `cluster_mark_fixed` | `{groupId, fixed}` | Trends | 9 |

原有命令的变化：

| 命令 | 变化 |
|---|---|
| `scan_start` | 参数可以是 `{}`（照旧：常用位置 + 全部自选位置）或 `{locationIds}`（第 2 节） |
| `group_detail` | `groupId` 也可以是合并行的 ID（`m:` 开头，第 4 节）；返回多出 `rows` |
| `clean_prepare` | 另收两种形状：`{conclusionVersion, chosenMode}`、`{dedupeId, dedupeVersion}`（第 5 节）；三种旧形状之一照旧 |
| `clean_progress`、`clean_result` | 多出隔离的部分（第 5 节） |
| `app_state`、`locations_get`、`trends`、`history_list` | 多出字段（第 2、6、8、9 节） |

参数校验：
- ID 照 `util::id_ok`；`version`、`conclusionVersion`、`dedupeVersion` 是服务给的不透明字符串（1～64 个 `[A-Za-z0-9:._-]`）。
- `mode` 为 `category` 或 `location`；`chosenMode` 为 `quarantine` 或 `delete`；`beside`、`expand`、`enabled`、`trusted`、`fixed`、`include` 为布尔；`days` 为 7、30、90 之一；`tool` 为服务在 `Locations.sessions` 里给出的工具 ID。
- `rowId`、`query` 可以为 `null`；`query` 为 1～64 个字符，不含 `\`、`/`、`:` 与控制字符。
- 键集必须恰好是表里写的；多键、少键都是 `invalid`。

## 2. 位置与体检范围

```text
Locations += home:[HomeLocation], sessions:[SessionTool], manifests:[ManifestView]

HomeLocation = {location_id, kind:"common"|"drive"|"folder", label_zh, display_path|null,
                default_selected:bool, free_bytes|null, total_bytes|null}
  // common：location_id "common"，label_zh "C 盘常用位置"（盘符取系统盘），default_selected 为 true
  // drive：每个非系统固定盘一枚，location_id "drive-<小写盘符>"，label_zh "D 盘"，带容量；已作为自选位置加过的盘根并进这一枚
  // folder：每个非盘根的自选位置一枚，location_id 为其 root_id，label_zh 为最后一级名字，display_path 为完整路径（悬停显示）
  // 顺序：common、drive 按盘符、folder 按 added_at

AppState.busy 取值 += "purging"、"deduping"
AppState += quarantine: null | QuarantineBar          // 第 6 节；隔离区空时为 null
ScanProgress += locations:[{location_id, label_zh, state:"waiting"|"running"|"done", found_bytes}]
```

- `scan_start {locationIds}`：1～24 个、不重复、都在当前 `Locations.home` 里，否则 `invalid`。
  - 选了 `common`：照旧扫常用位置里开着的类别与受保护类；
  - 选了 `drive-x`：这个盘根作为本次的自选位置扫（没加进列表的盘也可以，不改设置）；
  - 选了 folder：这个自选位置。
  - 没选的位置不扫。本次范围记在扫描记录里，结论页页头照它写。
- `custom_root_add` 返回的 `added` 照旧；界面据此把新文件夹单独选中（设计 v2 第 3.1 节）。

## 3. 结论视图

```text
ConclusionView = {
  version, scan_id, status, finished_at, duration_ms,
  stale: bool, stale_reason_zh|null,          // 四种来源：有了更新的体检；这次体检已被清理用掉；跳过名单变了；会话开关或项目声明的信任变了
  scope: {labels_zh:[string], only_folder: bool},
  quarantine: null | QuarantineBar,
  plan: Plan,
  cards: [Card],                               // 0～5 张，按体量降序
  more_cards: null | {count, bytes, max_bytes, text_zh},   // “还有 7 项需要判断，都小于 100 MB，共 240 MB，默认不清”
  kept_before: null | {count, bytes, text_zh},             // “你上次保留的 3 项”
  clues: [Clue], more_clues: int,              // 0～3 条，其余计数
  folds: [Fold],                               // 0～4 行，顺序 advisory、protected、space、system
  detail_pending: {count, bytes}               // 明细里还有多少项需要判断（含 more_cards）
}

Plan = {bytes, delete_bytes, chosen_bytes, item_count,
  summary_zh,                                   // “缓存 12.1 GB · 旧版本 3.3 GB · 比上次多 2.1 GB · Chrome 开着，会跳过约 0.4 GB”
  categories:[{category_id, title_zh, bytes, group_count, is_new:bool, included:bool}],   // 0～8 行，“包含什么”
  by_drive:[{root, bytes}],
  expected_skip: null | {bytes, notes_zh:[string]}}       // 按扫描时的在用情况

Card = {card_id, kind:"group"|"leak"|"session"|"declaration"|"unfinished",
  level, title_zh, evidence_zh, bytes,
  decision:"clean"|"keep"|"undecided",
  decided_before_zh|null,                       // “上次你选了保留”
  warning_zh|null,                              // 泄漏：“清了不修，会再长回来”；会话：“清掉后这些对话不能再续接或回看；可以先放进隔离区试试”
  group_id,                                     // 打开抽屉用；合并卡为 m: 开头的 ID
  menu:["skip"|"detail"|"copy_clue"],           // 依次对应 以后都跳过、查看明细、复制线索给 agent
  clue_id|null}

Clue = {clue_id, text_zh, copy_text}            // copy_text 是可直接粘给项目 agent 的多行检查清单，界面原样复制
Fold = {kind:"advisory"|"protected"|"space"|"system", text_zh, bytes|null,
        rows:[{title_zh, bytes|null, note_zh|null}]}   // rows 至多 10 行，点开就地展开
```

- `conclusion_get` 给最新一次体检的结论；还没有体检时 `not_found`。
- `conclusion_decide {version, decision}`：`version` 不是当前版本时 `stale`。`decision` 恰好是下面之一：
  - `{"group": id, "choice": "clean"|"keep"|"undecided"}`：卡片、明细里的组与合并行（`m:` 开头）都用它；`undecided` 回到缺省（推荐的组算清，其余不清）；
  - `{"category": id, "include": bool}`：“包含什么”里的开关；
  - `{"row": rowId, "include": bool}`：抽屉里的汇总行；
  - `{"item": itemId, "include": bool}`：展开后的单项。
- 每次决定返回新的 ConclusionView（新 `version`）；明细与抽屉同一份计划（设计 v2 第 5 节第 2 条）。
- 只能决定可清的东西：仅供参考、受保护、不可清的条目与组，决定它们是 `invalid`。

## 4. 明细与抽屉

```text
DetailView = {version, mode, plan_bytes,
  sections:[{section_id, title_zh, group_count, bytes, chosen_bytes, rows:[DetailRow],
             unchanged: null | {count, bytes, rows:[DetailRow]}}]}   // 0～9 节；受保护与仅供参考在最后一节
  // mode=category：一节一个类别；mode=location：一节一个位置
DetailRow = {row_key, title_zh, location_zh, level, bytes, chosen_bytes,
  selectable:bool, choice:"clean"|"keep"|"undecided", is_new:bool}
  // row_key 为组 ID，或同一规则多个位置合成的 m:<rule_id>（location_zh 写“3 个位置”）

GroupDetail += rows:[SummaryRow], rows_note_zh|null     // 不超过 8 行；组里不超过 8 项时逐项一行
SummaryRow = {row_id, label_zh, count, bytes, oldest|null, newest|null,
  included:bool, selectable:bool, release_zh|null,      // 在用时写解除条件，如“关掉 Chrome 后可清”
  expandable:bool}
  // 合并行（m:）的抽屉：一行一个位置，row_id 就是那个位置上的组 ID；对它发 {row, include} 等于对这个组发 {group, choice:"clean"/"keep"}

GroupItems = {items:[GroupItem], items_total}           // 至多 200 项
GroupItem = {item_id, display_path, total_bytes, newest_activity|null,
  eligible:bool, included:bool, reason_zh|null, notes_zh:[string]}
  // notes_zh 例：“被 F:\a\b 引用，改指别处后可清”“含签名文件 release.jks”“名字是系统保留名 nul”“已脱离 git”
```

- `group_items {groupId, rowId, query}`：`rowId` 为 null 时是整组；`query` 为 null 时不过滤，否则按显示名不分大小写包含。
- 明细里的复选框、抽屉的复选框都发 `conclusion_decide`。

## 5. 清理

- `clean_prepare {conclusionVersion, chosenMode}`：按这一版结论出计划；版本不对 `stale`；计划为空 `invalid`。
- `clean_prepare {dedupeId, dedupeVersion}`：按查重结果里勾上的组出计划，全部进隔离区。
- 旧形状 `{groupIds}`、`{groupIds, excludeItemIds}` 照旧，全部直接删除（旧界面不变）。

```text
CleanPreview += delete: {bytes, categories:[{title_zh, bytes}]},
                chosen: null | {bytes, items:[{title_zh, bytes}], mode:"quarantine"|"delete", note_zh|null},
                expected_skip: null | {bytes, notes_zh:[string]}   // clean_prepare 时重取进程快照算
  // irreversible 改为：chosen 为 null 或 mode 为 delete 时 true
CleanProgress += phase:"delete"|"quarantine", quarantined_bytes
CleanResultView += quarantined: null | {quarantine_ids:[string], bytes, item_count, notes_zh:[string]}
  // 每个盘一个编号（SERVICE-M35 第 6.1 节），quarantine_ids 按盘符排序
CleanResultView.groups[].status 取值 += "quarantined"
```

- `clean_start`、`clean_stop` 不变。计划先删“直接删除”的部分，再移“你选的”部分。

## 6. 隔离区

```text
QuarantineBar = {bytes, oldest_days, leftover_count, leftover_bytes, text_zh}
  // “隔离区还有 4.8 GB · 最早的放了 7 天”；只剩删不掉的时“还剩 3 个文件删不掉”
QuarantineView = {bytes, roots:[{target_id, display_path, bytes}], cards:[QuarantineCard]}
  // roots[].target_id 为 qroot-<盘符小写>；quarantine_id 形如 20261105-163012-f，每个盘一个编号、一张卡
QuarantineCard = {quarantine_id, created_at, days, bytes, item_count,
  state:"present"|"leftover"|"purging",
  restorable:bool,                        // 没有隔离记录的编号目录（别处来的、记录丢了）为 false，只能永久删除或打开文件夹
  reminder_zh|null,                       // 放满 7 天：“已经放了 7 天，确认没问题可以永久删除”
  rows:[{label_zh, count, bytes}],        // 至多 8 行汇总
  leftovers:[{display_name, bytes, reason_zh, retry:bool}], more_leftovers:int}   // 至多 20 条
RestoreResult = {restored_count, restored_bytes, conflicts:[{label_zh, reason_zh}], view: QuarantineView}
QuarantineProgress = {quarantine_id|null, state:"idle"|"running"|"completed"|"stopped"|"failed",
  removed_entries, freed_bytes}
HistoryEntry.kind 取值 += "restore"、"purge"、"dedupe"
```

- `quarantine_restore {quarantineId, beside}`：整张卡还原；`beside` 为 false 时原位置已有同名的项不动、记进 `conflicts`；再以 `beside: true` 调用时，这些项还原到原位置旁边（“<原名>（还原 n）”）。
- `quarantine_delete {quarantineId}`：开始永久删除，忙时 `busy`；进度看 `quarantine_progress`；结束后 `quarantine_list` 里这张卡消失，或变成 `leftover`。对 `leftover` 的卡再调一次即“再试一次”。
- `quarantine_reveal {targetId}`：`targetId` 是隔离编号或 `roots[].target_id`；宿主用资源管理器打开对应文件夹（HOST-M35 第 3 节）。不存在时 `not_found`。

## 7. 查重

```text
DedupeProgress = {dedupe_id|null, state:"idle"|"running"|"completed"|"cancelled"|"failed",
  phase:"listing"|"hashing"|null, files_listed, candidate_files, bytes_to_hash, bytes_hashed, found_bytes}
DedupeView = {dedupe_id, version, location_label_zh, finished_at, status,
  extra_bytes, chosen_bytes,
  groups:[{group_id, name_zh, copies, size, keep:{display_path, reason_zh}, others:[display_path],
           included:bool, removable:bool, note_zh|null}],     // expand 为 false 时至多 8 组，为 true 时至多 200 组
  more: null | {count, bytes, text_zh},
  same_name_different: int,               // “另有 3 组同名不同内容，没有列入”
  skipped_zh|null}                        // “3 个云端文件没有读取”等
```

- `dedupe_start {locationId}`：`locationId` 为 `drive-x` 或 folder（不能是 `common`）；体检或清理进行中 `busy`。
- `dedupe_decide`：版本不对 `stale`；`removable` 为 false 的组不能勾（`invalid`）。

## 8. 设置：会话与项目声明

```text
SessionTool = {tool, title_zh, retention_zh|null, enabled:bool, days:7|30|90,
               bytes|null, largest_bytes|null}           // 体量取最近一次体检
ManifestView = {manifest_id, display_path, project_zh|null,
  state:"untrusted"|"trusted"|"changed"|"invalid",       // changed：信任后文件改过，要重新信任
  error_zh|null, disposable:[{title_zh, kind, paths_count, ask:bool}], protected_count, worktree_count}
```

- `locations_set_session_cleanup {tool, enabled, days}`：下一次体检起生效；返回 Locations。
- `manifest_trust {manifestId, trusted}`：`invalid` 状态的声明不能信任；返回 Locations。不信任的声明，它的 `protected` 照样生效。

## 9. 趋势

```text
Trends += clusters:[{group_id, title_zh, rate_zh, state:"growing"|"stopped"|"suspected",
                     fixed_at|null, clue_id|null, copy_text|null}]
Trends.forecast[].note_zh 新增一种：“Water 以外的清理之后重新起算”
GroupView.growth.since 可以为 null：增长基准的记录已被裁掉（计划第 63 行），这时洞察写“与更早的一次体检相比”
```

- `cluster_mark_fixed {groupId, fixed}`：只对 `clusters` 里的 `group_id`；返回 Trends。

## 10. 不变

- 原 19 个命令的旧形状与语义；`clean_start` 的一次性令牌；扫描、清理、隔离、查重同一时刻只能有一个在进行。
- 界面只显示服务给的文案与数字，不合并、不排序、不推算选择状态（设计 v2 第 1 节第 5 条、第 3.12 节第 8 条）。
