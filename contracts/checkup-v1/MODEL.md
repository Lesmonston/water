# Checkup v1 共享数据模型

2026-10-26，总控冻结。WATER-W2-A～E 五票共用本文定义的 JSON 形状；各 crate 自己定义 Rust 类型，但序列化结果必须与本文一致，跨票只通过这些 JSON 交接。决定依据见 [ADR-018](../../docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)。

## 1. 通用约定

- JSON 一律 UTF-8，对象键用 snake_case，未知键在解析时拒绝（`deny_unknown_fields`）。
- **字节数用十进制字符串**（如 `"3565158400"`），不用 JSON number，避免前端精度问题。计数（文件数、项数）用 JSON 整数，上限 2^53−1。
- 时间用 RFC 3339、UTC、`Z` 结尾，精确到秒：`"2026-10-26T04:05:00Z"`。
- 路径是 Windows 绝对路径字符串，反斜杠分隔，形如 `C:\Users\...`；不接受 `\\?\`、UNC、相对路径、`.`/`..` 段、结尾分隔符。名字不是合法 Unicode 的文件或目录不进入任何清单，只计入 issue `unrepresentable_name`。
- 比较路径时按 ASCII 大小写不敏感、按完整段比较（`C:\a\bc` 不是 `C:\a\b` 的后代）。

## 2. 枚举

| 名称 | 取值 |
|---|---|
| level | `recommended`（推荐清理）、`confirm`（需要确认）、`advisory`（仅供参考）、`protected`（受保护） |
| category | `agent_tool`、`browser`、`system_temp`、`app_leftover`、`dev_cache`、`crash_log`、`gpu_system`、`custom`、`unrecognized` |
| item_type | `dir`、`file`、`any` |
| known_folder | `user_profile`、`local_app_data`、`roaming_app_data`、`user_temp`、`system_temp`、`windows`、`program_data`、`downloads` |
| in_use.mode | `none`、`process_running`、`cmdline_references_item` |
| ineligible reason | `level_not_cleanable`、`hard_guard`、`contains_protected`、`inside_protected`、`repository`、`too_recent`、`keep_newest`、`identity_unavailable` |
| clean status | `deleted`、`partial`、`skipped`、`failed` |
| skip reason | `gone`、`changed`、`reparse`、`outside_root`、`guarded`、`protected_overlap`、`in_use`、`too_recent`、`cancelled` |

`user_temp` 固定为 `local_app_data\Temp`，`system_temp` 固定为 `windows\Temp`；不使用 `TEMP`/`TMP` 环境变量（开发环境里它们常被工具改写）。

## 3. KnownFolders（`water.known-folders.v1`）

```json
{"known_folders_version":"water.known-folders.v1","user_profile":"C:\\Users\\u","local_app_data":"C:\\Users\\u\\AppData\\Local","roaming_app_data":"C:\\Users\\u\\AppData\\Roaming","user_temp":"C:\\Users\\u\\AppData\\Local\\Temp","system_temp":"C:\\Windows\\Temp","windows":"C:\\Windows","program_data":"C:\\ProgramData","downloads":"C:\\Users\\u\\Downloads"}
```

生产环境由 WATER-W2-B 的 `known_folders()` 经系统已知目录 API 取得；测试可传入指向本树 `.local` 合成目录的值。

## 4. 扫描计划（`water.scan-plan.v1`，A 产出，B 消费）

```json
{
  "plan_version": "water.scan-plan.v1",
  "rules_data_version": "2026-10-26.1",
  "created_at": "2026-10-26T04:00:00Z",
  "targets": [ Target, ... ],
  "hard_guards": [ "C:\\Users\\u", "C:\\Windows", "C:\\" ]
}
```

Target：

```json
{
  "target_id": "chrome-cache",
  "group_id": "chrome-cache",
  "rule_id": "chrome-cache",
  "level": "recommended",
  "category": "browser",
  "match": Match,
  "item_type": "dir",
  "min_age_hours": 0,
  "keep_newest": 0,
  "in_use": {"mode": "process_running", "processes": ["chrome.exe"]}
}
```

Match 三选一：

| kind | 字段 | 含义 |
|---|---|---|
| `pattern` | `base`（绝对路径）、`segments`（字符串数组，1～8 段） | 从 base 逐段匹配，最后一段命中的条目即为一项 |
| `marker` | `root`、`marker`、`max_depth`（1～16） | 在 root 下找含标记的目录，该目录即为一项，命中后不再往里找新项 |
| `discovery` | `root` | root 的直接子项中，没有被任何其它 target 命中的，各为一项 |

段语法：字面字符按 ASCII 大小写不敏感比较；`*` 匹配零个或多个字符；`?` 匹配一个字符；`#` 匹配一个或多个 ASCII 数字。段不能为空、`.`、`..`，不能含 `\`、`/`、`:`。

marker 两种：`{"kind":"file","name":"CACHEDIR.TAG","min_bytes":43,"max_bytes":1024}`（目录下有该名字、大小在范围内的普通文件；只看元数据，不读内容）；`{"kind":"children_all","names":["Local State","Default"]}`（目录下同时有这些名字的子项）。

`hard_guards`：这些路径本身及其所有祖先永远不可清理（A 至少放入每个 known folder、每个盘根、`windows`）。

## 5. 扫描结果（`water.scan-result.v1`，B 产出）

```json
{
  "result_version": "water.scan-result.v1",
  "scan_id": "scan-20261026T040000Z-1a2b",
  "started_at": "...", "ended_at": "...",
  "status": "completed",
  "visited_entries": 182340,
  "groups": [ Group, ... ],
  "items": [ Item, ... ],
  "issues": [ {"code": "access_denied", "group_id": "system-temp-old", "count": 3} ]
}
```

status：`completed`、`partial`（有 issue 导致覆盖不全，或预算用尽）、`cancelled`。

Group：

```json
{"group_id":"chrome-cache","rule_id":"chrome-cache","level":"recommended","category":"browser",
 "item_count":8,"eligible_count":8,"total_bytes":"1825361100","eligible_bytes":"1825361100",
 "file_count":10988,"oldest_activity":"...","newest_activity":"...",
 "in_use":{"mode":"process_running","processes":["chrome.exe"]},
 "top_keys":[{"key":"marketplace-upgrade-*","count":48,"bytes":"3565158400","newest_activity":"..."}]}
```

`top_keys` 至多 10 条，按 bytes 降序；只对 discovery 与 item_count ≥ 5 的组给出，其余为空数组。空组（0 项）也要输出，便于界面显示“未发现”。

Item：

```json
{"item_id":"i-000123","group_id":"chrome-cache","path":"C:\\Users\\u\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache",
 "kind":"dir","total_bytes":"382000000","file_count":2242,"newest_activity":"...",
 "identity":{"volume_serial":"0A1B2C3D","file_id":"00000000000000000001000000001a2b"},
 "eligible":true,"ineligible_reason":null}
```

- `total_bytes`：逻辑字节，等于遍历到的普通文件长度之和；不跟随联接，不做硬链接去重，不估算分配空间。
- `newest_activity`：该项自身及所有遍历到的后代中最新的修改时间。
- `identity`：用句柄查询得到的卷序列号（8 位大写十六进制）与 128 位文件 ID（32 位小写十六进制）；打开时不跟随重解析点。取不到时为 null，该项不可清理。
- 一个路径只属于一个组。多个 target 命中同一路径时取 level 最保守者（protected > advisory > confirm > recommended），并列时取 targets 数组中靠前者。

## 6. 快照与增长（`water.scan-snapshot.v1`，B 产出）

快照只保留组级数据：`{"snapshot_version":"water.scan-snapshot.v1","scan_id":"...","taken_at":"...","groups":{"<group_id>":{"total_bytes":"...","item_count":12,"newest_activity":"...","top_keys":[...]}}}`。

增长：`{"group_id":"...","bytes_delta":"-1200","count_delta":21,"days":2.9,"bytes_per_day":"441000000","leak_suspect":true}`。`bytes_delta`、`bytes_per_day` 可为负，字符串前加 `-`。`leak_suspect` 为真当且仅当：count_delta ≥ 20 且当前 newest_activity 距 taken_at 不超过 24 小时；或 bytes_per_day ≥ 1073741824。两次快照间隔不足 1 小时不计算增长。

## 7. 进程摘要（`water.process-summary.v1`，C 产出）

```json
{"summary_version":"water.process-summary.v1","taken_at":"...","process_count":312,
 "processes":[{"pid":1234,"parent_pid":880,"name":"chrome.exe","created_at":"..."}],
 "issues":[{"code":"access_denied","count":14}]}
```

**命令行只在内存里使用，永远不进入任何 JSON、日志或证据。**

在用判断结果：`{"item_id":"i-000123","in_use":true,"process_name":"chrome.exe","pid":1234}`。

## 8. 清理计划与报告（D 消费 / 产出）

计划 `water.clean-plan.v1`：

```json
{"plan_version":"water.clean-plan.v1","plan_id":"plan-...","created_at":"...",
 "items":[{"item_id":"i-000123","group_id":"chrome-cache","rule_id":"chrome-cache","level":"recommended",
           "path":"...","root":"C:\\Users\\u\\AppData\\Local\\Google\\Chrome\\User Data","kind":"dir",
           "identity":{...},"total_bytes":"382000000","min_age_hours":0}],
 "protected_paths":["..."],"hard_guards":["..."]}
```

`root`：该项所属 target 的 `base`（pattern）或 `root`（marker/discovery）。只有 level 为 `recommended` 或 `confirm` 的项可以进入计划。

报告 `water.clean-report.v1`：

```json
{"report_version":"water.clean-report.v1","plan_id":"plan-...","started_at":"...","ended_at":"...",
 "status":"completed","freed_bytes":"...","estimate_bytes":"...",
 "volumes":[{"root":"C:\\","free_before":"...","free_after":"..."}],
 "items":[{"item_id":"i-000123","status":"deleted","skip_reason":null,"bytes_before":"382000000","bytes_freed":"382000000","failed_entries":0}]}
```

`status`：`completed` 或 `stopped`（中途停止）。`freed_bytes` 是各项 `bytes_freed` 之和，而 `bytes_freed` = 删除前重新遍历的字节 − 删除后残余字节。

日志 `water.clean-journal.v1`：JSON Lines，每项先写 `{"journal_version":"water.clean-journal.v1","event":"intent","plan_id":...,"item_id":...,"path":...,"at":...}` 并刷新，执行后写 `{"event":"result","item_id":...,"status":...,"skip_reason":...,"bytes_freed":...,"at":...}`。
