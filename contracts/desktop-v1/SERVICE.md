# WATER-W3-F1 服务核心 SPEC（`water-service`）

2026-10-26 冻结，总控（Claude）。服务核心把已验收的 A（规则）、B（扫描）、C（进程）、D（清理）四个 crate 接成 [IPC v1](../checkup-v1/IPC.md) 的全部 17 个命令。它是纯 Rust 库，不依赖 Tauri；桌面宿主（F2）只把界面的 `invoke` 原样转给它。界面的形状以 IPC 第 3 节为准，[ui-fixtures.json](../checkup-v1/ui-fixtures.json) 是每个返回值的形状样例。

## 1. crate 形状

- 目录 `packages/water-service`，独立 workspace，包名 `water-service`，lib `water_service`；`edition = "2024"`，`rust-version = "1.95"`，`publish = false`，四个 auto 发现关闭；无 build 脚本、无 dev/build 依赖。
- 依赖**只有**：`serde =1.0.229`（derive）、`serde_json =1.0.151`，以及四个路径依赖 `water-junk-rules = { path = "../junk-rules" }`、`water-junk-scan = { path = "../junk-scan" }`、`water-process-scan = { path = "../process-scan" }`、`water-junk-clean = { path = "../junk-clean" }`。不得修改这四个 crate。
- Windows FFI 只在 `src/native_windows.rs`，写法同 SCAN 第 1 节（裸 `extern "system"`、`#![deny(unsafe_op_in_unsafe_fn)]`、每个 unsafe 块写安全说明；`lib.rs` 用 `#![deny(unsafe_code)]` 只对该模块放开，其它模块 `#![forbid(unsafe_code)]`）。允许的系统函数只有：`GetLogicalDrives`、`GetDriveTypeW`、`GetDiskFreeSpaceExW`、`SystemTimeToTzSpecificLocalTime`。
- 生产代码不启动进程、不联网、不读环境变量（真实冒烟 example 除外）。可以开线程。**只在 `ServiceConfig.data_dir` 之下写文件**；删除真实文件只能经 D 的 `execute`，并且只在 `clean_enabled` 为真时。

## 2. 公开 API

```rust
pub struct ServiceConfig {
    pub data_dir: std::path::PathBuf,        // 生产：%LOCALAPPDATA%\Water；测试：本树 .local 下新建目录
    pub app_version: String,
    pub clean_enabled: bool,                 // 本波生产为 false，见第 8 节
    pub platform: Box<dyn Platform>,
    pub picker: Box<dyn FolderPicker>,
}
pub struct IpcError { pub code: String, pub message_zh: String }   // Serialize，键名即这两个
pub struct Service;                          // Send + Sync
impl Service {
    pub fn new(config: ServiceConfig) -> Result<Service, IpcError>;
    /// command 为 IPC 第 2 节的命令名；args 为界面传来的 JSON 对象（camelCase 键，无参数时为 {}）。
    pub fn call(&self, command: &str, args: serde_json::Value) -> Result<serde_json::Value, IpcError>;
}
pub trait Platform: Send + Sync {
    fn known_folders(&self) -> Result<water_junk_rules::KnownFolders, IpcError>;
    fn drives(&self) -> Vec<DriveInfo>;                 // 只含固定磁盘，按盘符排序
    fn now(&self) -> std::time::SystemTime;
    fn local_date(&self, at: std::time::SystemTime) -> (u32, u32);   // 本地时区的（月, 日）
    /// 在用判断：给出组的在用规格与条目路径，返回占用进程名（如 "chrome.exe"）。
    fn in_use(&self, spec: &water_process_scan::InUseSpec, item_path: &str) -> Option<String>;
    fn begin_in_use_batch(&self) {}                     // 一次扫描或一次清理开始时调用一次，真实实现在此取一次进程快照
}
pub struct DriveInfo { pub root: String, pub is_system: bool, pub total_bytes: u64, pub free_bytes: u64 }
pub trait FolderPicker: Send + Sync {
    fn pick(&self) -> Result<Option<String>, IpcError>;   // None = 用户取消
}
pub struct WindowsPlatform;                    // 真实实现：B 的 known_folders()、本模块 FFI、C 的 snapshot()/in_use()
impl WindowsPlatform { pub fn new() -> Self; }
```

- `call` 除 `custom_root_add`（会等用户在选择框里操作）外必须在 50 ms 内返回；扫描与清理在后台线程里跑。
- 参数校验：键集合必须与 IPC 完全一致（多键、少键、类型不对都是 `invalid`）；ID 只接受 `^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$`；`confirmToken` 只接受 1～512 个字符且不含 `\`；`category` 只接受第 6 节可切换的 7 个分类。
- 未知命令返回 `invalid`。

## 3. 错误

失败值为 `IpcError`。code 与 message_zh 固定如下（前四条与回放数据一致）：

| code | message_zh |
|---|---|
| `busy` | 正在进行另一项任务，请稍候。 |
| `stale` | 结果已过期，请重新体检后再清理。 |
| `invalid` | 所选内容无法清理，请重新选择。 |
| `unavailable` | Water 服务暂时不可用。 |
| `not_found` | 找不到这条记录，请重新体检。 |
| `cancelled` | 已取消。 |

清理关闭时（第 8 节）`clean_prepare` 与 `clean_start` 返回 code `unavailable`、message_zh “这一版只做体检，清理功能会在下一版开放。”。自定义文件夹不合格时返回 `invalid`，message_zh 用第 6 节的句子。

## 4. 存储（全部在 data_dir 之下）

| 路径 | 内容 |
|---|---|
| `settings.json` | `{"settings_version":"water.settings.v1","categories":{"<category>":bool},"custom_roots":[{"root_id","path","added_at"}]}` |
| `scans\<scan_id>.json` | `{"record_version":"water.scan-record.v1","scan_id","started_at","finished_at","duration_ms","drives":[DriveInfo 的十进制字符串形式],"plan":<A 的计划 JSON>,"result":<B 的 ScanResult JSON>,"growth":[B 的 Growth],"previous_scan_id"|null,"consumed":bool}` |
| `snapshots\<scan_id>.json` | B 的快照 JSON |
| `plans\<plan_id>.json` | `{"plan":<D 的计划 JSON>,"scan_id","token_digest","used":bool}` |
| `cleans\<clean_id>.json` | `{"clean_id","plan_id","scan_id","report":<D 的报告 JSON>,"view":CleanResultView}` |
| `journal\<clean_id>.jsonl` | D 的日志；写入器的 `flush` 必须调用 `File::sync_all` |

- 所有 JSON 写入先写同目录临时文件再改名替换，避免半截文件；读取遇到损坏文件时跳过该文件并继续，不让整个服务失败。
- 只保留最近 60 次扫描（含快照）与最近 60 次清理；更早的记录文件由服务删除。删除只针对这几个目录下、文件名与 ID 格式匹配的 `.json`，不递归。
- ID：`scan-YYYYMMDDTHHMMSSZ-xxxx`、`plan-…`、`clean-…`，`xxxx` 为 4 位小写十六进制随机数；时间取 `Platform::now()` 的 UTC。确认令牌为 32 位十六进制随机串，只存它的摘要，不存原文。

## 5. 扫描

1. `scan_start`：有任务在跑返回 `busy`。用 A 的嵌入规则与 `Platform::known_folders()`、已启用分类与自定义根生成计划（A 的 `resolve_plan`），转成 JSON 交给 B。
   - 被关闭的分类：去掉该分类中 recommended、confirm、advisory 规则的 target。**protected 规则的 target 永远保留**，保证保护判断完整。
2. 后台线程调用 B 的 `scan`，选项用 B 的默认值，带取消令牌与观察者。开始前调用一次 `Platform::begin_in_use_batch()`。
3. `scan_progress`：
   - 分类顺序固定为 `agent_tool, browser, system_temp, app_leftover, dev_cache, crash_log, gpu_system, custom, unrecognized`，只列出计划里有 target 的分类；每个自定义根单独一行，category 为 `custom`，title_zh 为 “自定义 · <路径>”。
   - 一个分类的全部 target 都已回报即为 done，有回报但未全部回报为 running，其余 waiting。
   - percent = 已回报的 target 数 × 100 ÷ target 总数（向下取整），结束时为 100。
   - 空闲时返回 `{"scan_id": null, "state": "idle", "categories": [], "visited_entries": 0, "found_bytes": "0", "percent": 0, "elapsed_ms": 0}`。
4. `scan_cancel`：取消当前扫描。scanId 不是当前扫描时返回 `not_found`。
5. 扫描结束后：
   - 存扫描记录与快照；与上一次快照算增长（B 的 `growth`）。
   - `last_scan` 指向它；之前的所有清理计划作废，再用会返回 `stale`。
   - 取消或失败的扫描也存记录（状态照实），但不作为 `last_scan`，也不参与趋势。

## 6. 视图规则

**AppState**：
- `drives` 取 `Platform::drives()`；label_zh 系统盘为“系统盘”，其余为“本地磁盘”。
- `last_scan` 为最近一次完成或部分完成的扫描。其中 `added_7d_bytes` 的算法：
  1. 参照快照取“时间在 7 天以内、且早于本次至少 1 小时”的最早一次快照。
  2. 按组累加正的 total_bytes 增量。
  3. 没有参照快照时为 null。
- `insights` 与扫描结果相同。

**分类**：

| category | title_zh | subtitle_zh | description_zh（位置页） |
|---|---|---|---|
| agent_tool | AI 编程工具 | Codex · Claude · Cursor · grok | Claude Code、Codex、Cursor、grok 等的临时目录、升级残留与旧版本 |
| browser | 浏览器 | Chrome · Edge · 只清缓存，不动登录信息 | Chrome、Edge、Brave、Firefox 的缓存；从不清理登录信息与网站数据 |
| system_temp | 系统临时文件 | Windows 与用户临时目录 | Windows 与用户临时目录中 7 天前的文件 |
| app_leftover | 应用更新与安装包 | 安装程序、更新残留与应用缓存 | 下载文件夹里的安装程序、应用更新残留 |
| dev_cache | 开发缓存 | npm · Cargo · Playwright 等 | npm、pip、Cargo、Gradle、Playwright 等 |
| crash_log | 崩溃与日志 | 崩溃转储与错误报告 | 崩溃转储、错误报告、应用日志 |
| gpu_system | 显卡与系统缓存 | 着色器缓存与缩略图 | 显卡着色器缓存与系统缩略图 |
| custom | 自定义 · <路径> | 只识别带缓存标记的构建目录与测试配置 | — |
| unrecognized | 未识别 | 只显示占用，不可清理 | — |

- 位置页列出前 7 个分类，默认全部启用，`locked` 都为 false。
- 自定义文件夹不合格时拒绝，message_zh 为“这个位置太大或包含系统目录，请选择具体的项目文件夹。”。不合格的情形：
  - 不是存在的普通目录，或从盘根到它有任一级是重解析点；
  - 是盘根；
  - 等于或包含任何已知目录，或位于 Windows 目录之内；
  - 已有 16 个自定义根。
- 重复添加返回已有的那一项。
- root_id 取文件夹名中的 ASCII 字母数字（转小写，至多 24 个），为空时用 `root`；与已有重复时加 `-2`、`-3`。

**GroupView**（每个 B 的组一个）：
- title_zh、owner_zh 取 A 的规则文案；自定义组的 group_id 为 `custom:<root_id>:<rule_id>`。
- drive_root：该组体量最大的条目所在盘。
- selectable：level 为 recommended 或 confirm、eligible_count > 0，且所属分类启用。default_selected：level 为 recommended 且 selectable。
- summary_zh：
  - 0 项时为“未发现”。
  - 否则为“<item_count> 个<单位> · 最近 <M> 月 <D> 日”。单位按规则的 item_type：dir 为“目录”，file 为“文件”，any 为“项”。日期用 `Platform::local_date`。
  - 有不可清理的项时再加“ · 跳过 <n> 个”。
  - protected 与 advisory 组在末尾加“ · 只统计占用”。
- growth：本次增长里有该组时为 `{bytes_delta, count_delta, since: 上次快照时间}`，否则 null。
- in_use：
  - 组的在用规格不是 none 时，对组里每个可清理条目调用 `Platform::in_use`，有命中就为 `{"process_label_zh": "<进程名去掉 .exe> 正在运行，将跳过占用的项"}`；
  - 否则为 null。

**ScanResultView**：
- categories 按上面的顺序，只含有组的分类。组按 level（recommended、confirm、advisory、protected）再按 total_bytes 降序排列。
- totals 的各项：

| 字段 | 计算 |
|---|---|
| recommended_bytes | 各 recommended 组的 eligible_bytes 之和 |
| confirm_bytes | 各 confirm 组的 total_bytes 之和 |
| advisory_bytes | 各 advisory 组的 total_bytes 之和 |
| protected_bytes | 各 protected 组的 total_bytes 之和 |
| unrecognized_bytes | unrecognized 分类的 total_bytes 之和 |
| recognized_bytes | 除 unrecognized 外所有组的 total_bytes 之和 |

- recommended_by_drive：按条目所在盘累加 recommended 组中 eligible 条目的 total_bytes。

**Insight**（至多 3 条，leak 在前）：
- 本次增长中 `leak_suspect` 为真的组：kind 为 leak。
  - title_zh：“<组名> 疑似泄漏”
  - message_zh：“与 <M> 月 <D> 日相比多了 <count_delta> 个（<体量>），每天约 <日均体量>。”
- 其余 bytes_delta ≥ 1 GiB 或 count_delta ≥ 20 的组：kind 为 growth。
  - title_zh：“<组名>在持续累积”
  - message_zh：“与 <M> 月 <D> 日相比多了 <count_delta> 个<单位>（<体量>）。”
- 体量格式同 DESIGN 第 7 节：GB 保留 1 位小数，MB 取整，带千分位，增量前加 “+”。

**GroupDetail**：
- items 按 total_bytes 降序，至多 200 条；display_path 为完整路径。
- top_keys 取 B 的结果。what_zh、why_zh、after_zh、fix_hint_zh 取 A 的规则文案。
- reason_zh 按不可清理原因：

| 原因 | reason_zh |
|---|---|
| level_not_cleanable | 这一类只统计占用，不清理 |
| hard_guard | 这是系统或用户的关键目录 |
| contains_protected | 里面有受保护的数据 |
| inside_protected | 位于受保护的数据之内 |
| repository | 这是代码仓库 |
| too_recent | 最近 <min_age_hours> 小时内有改动 |
| keep_newest | 按规则保留最新的 <keep_newest> 个 |
| identity_unavailable | 无法确认这一项的身份 |

- groupId 不在最近扫描里时返回 `not_found`。

## 7. 趋势、记录与位置

- **Trends**：
  - points：最近 30 天每次完成扫描时记下的每个盘的可用空间 `{at, root, free_bytes}`，按时间升序。
  - growth：最近一次增长按 bytes_delta 降序取前 10，带 title_zh 与 level。
  - leaks：最近 30 天内任一次增长出现过 leak_suspect 的组，至多 5 个。active 表示最近一次增长中仍为真。message_zh 与 Insight 相同，fix_hint_zh 取规则文案（无则空串）。
- **HistoryEntry**：扫描与清理混排，按时间倒序，至多 100 条。
  - 扫描：summary_zh 为“识别 <n> 类位置”（n 为有条目的分类数），bytes 为 recommended_bytes。
  - 清理：summary_zh 为“清理 <组数> 组，跳过 <跳过项数> 项”，bytes 为 freed_bytes。
- **Locations**：
  - `locations_set_category` 立即写 settings，影响下一次扫描。
  - `custom_root_add` 调用 `FolderPicker::pick`，取消时返回 `{"cancelled": true}`，成功时返回 `{"added": CustomRootView}`。
  - `custom_root_remove` 的 rootId 不存在时返回 `not_found`。
  - CustomRootView 的 last_scanned_at 与 found_bytes 取最近一次含该根的完成扫描，没有时为 null。
  - 任务进行中修改位置返回 `busy`。

## 8. 清理

1. **清理开关**：`clean_enabled` 为 false 时，`clean_prepare` 与 `clean_start` 都返回第 3 节的 unavailable 句子，什么都不做。本波（M1）宿主以 false 启动；D 加固并验收后（M2）再打开。测试必须覆盖开与关两种情况。
2. **`clean_prepare`**（groupIds 非空、无重复）：
   1. 每个组都必须是 `last_scan` 中 selectable 的组，否则返回 `invalid`；`last_scan` 已被清理消耗，或已有更新的扫描，返回 `stale`。
   2. 计划条目为这些组里 eligible 且 identity 不为 null 的全部条目。
   3. root 取产生该条目的 target 的 base（pattern）或 root（marker/discovery）：在该组的 target 中选包含该路径的那个，有多个时取最长者。
   4. protected_paths 为该次扫描中所有 protected 组条目的路径；hard_guards 为计划的 hard_guards。
   5. 计划先过 D 的 `CleanPlan::from_json`，过不了返回 `invalid`。
   6. 生成一次性确认令牌，存计划，返回 CleanPreview。in_use_note_zh：组的 in_use 不为 null 时为“运行中，占用的项会跳过”。
3. **`clean_start`**：
   - planId 不存在返回 `not_found`；令牌摘要不符或已用过返回 `invalid`；计划所属扫描已不是未消耗的 `last_scan` 返回 `stale`；有任务在跑返回 `busy`。
   - 检查通过后令牌立即作废，扫描标记为已消耗。
   - 后台线程调用 D 的 `execute`：先调用一次 `Platform::begin_in_use_batch()`；ItemGuard 对每个条目用该组的在用规格调 `Platform::in_use`；日志写入 `journal\<clean_id>.jsonl`；观察者更新进度；`clean_stop` 设置停止信号。
4. **CleanProgress**：done_items 与 freed_bytes 来自观察者；group_index、group_count 与 current_group_title_zh 按计划中组的顺序给出。空闲时 state 为 idle，其余字段为 0 或 null。
5. **CleanResultView**：
   - drives 取 D 报告的 volumes。
   - 组的 status：全部删除为 done；有删除也有未删除为 partial；一个都没删且只有跳过为 skipped；一个都没删且有失败为 failed。
   - notes_zh 按原因计数，0 不写：

| 原因 | notes_zh |
|---|---|
| in_use | <n> 项正在使用，已跳过 |
| changed、gone | <n> 项已经变化，已跳过 |
| too_recent | <n> 项刚有改动，已跳过 |
| reparse、outside_root、guarded、protected_overlap | <n> 项未通过安全复核，已跳过 |
| cancelled | <n> 项因停止未处理 |
| failed_entries 合计 | <n> 个文件无法删除 |

   - journal_display_path 为日志的完整路径。

## 9. 测试（唯一测试文件 `tests/service_v1.rs`，精确五个测试）

每个测试在本树 `.local/w3-f1-fixtures/` 下新建随机名目录。目录内放：
- 一套合成的已知目录（user_profile、local_app_data、roaming_app_data、user_temp、system_temp、windows、program_data、downloads 各一个子目录，按种子规则的布局放文件）；
- data_dir。

测试用自己写的 `Platform`：已知目录指向夹具，固定的盘与时间，`local_date` 固定按 UTC+8，`in_use` 按测试配置返回。测试结束只删本次新建的那一个目录。**测试不得读取任何真实用户位置，不启动进程。**

- `service_ipc_contract`：
  - 17 个命令都能调用；
  - 未知命令、多键、少键、类型错误、坏 ID、像路径的令牌都返回 `invalid`；
  - 错误值只有 code 与 message_zh；
  - 每个命令的返回值键集合与 ui-fixtures.json 对应样例的键集合逐层相同（数组看第一个元素）。
- `service_scan_views`：
  - 合成夹具上完整扫描一次，progress 依次经过 running 到 completed、percent 单调不减；
  - 结果页的分类顺序、组排序、totals、selectable 与 default_selected 符合第 6 节；
  - protected 组不可选；
  - group_detail 的 reason_zh 与条目上限；
  - 取消扫描得到 cancelled；
  - 重新创建 Service 后 last_scan 仍在。
- `service_clean_flow`：
  - clean_enabled 为 false 时两条清理命令返回指定 unavailable 句子，夹具一个字节都没删，失败信息含 `SERVICE_CLEAN_DISABLED`；
  - 为 true 时 prepare → start → progress → result 完整走通，被删的只有计划内条目；
  - protected 条目与在用条目完好（失败信息含 `SERVICE_PROTECTED_PLAN`）；
  - 令牌第二次使用返回 invalid（失败信息含 `SERVICE_TOKEN_ONCE`）；
  - 新扫描后旧计划返回 stale；
  - 日志文件存在且每项 intent 在 result 之前。
- `service_trends_locations`：
  - 两次扫描之间在夹具里加 25 个目录，得到 leak 与 growth 的 insight、trends 与 history；
  - 关闭一个分类后下一次扫描不再含它的可清理组，但该分类的 protected 组仍在；
  - 自定义根：用测试 picker 添加、重复添加、拒绝盘根与包含已知目录的路径、取消、删除。
- `service_storage_safety`：
  - 所有写入都在 data_dir 之内（运行前后对夹具做文件清单比较）；
  - 损坏的 settings 与扫描记录被跳过而不是让 `Service::new` 失败；
  - 超过 60 条的旧记录被裁剪；
  - 写入采用临时文件改名。

有效负控（只改生产代码真正被调用的一行）：
- nc1 `SERVICE_TOKEN_ONCE`：让令牌可重复使用；
- nc2 `SERVICE_CLEAN_DISABLED`：让关闭时也能 prepare；
- nc3 `SERVICE_PROTECTED_PLAN`：计划漏掉 protected_paths 或把 protected 条目放进计划。

## 10. 真实只读冒烟（`--mode real`）

`examples/service_smoke.rs` 接收一个参数：data_dir（检查器在本树 `.local/w3-f1-real/` 下新建）。它用 `WindowsPlatform` 与 `clean_enabled = false` 创建服务，依次做五件事：
1. 调用 app_state；
2. scan_start；
3. 每 250 ms 轮询一次 scan_progress，直到结束；
4. 取 scan_result；
5. 断言 clean_prepare 返回指定的 unavailable 句子。

stdout 只打印一个 JSON：status、duration_ms、visited 之外的 totals、每个分类的 `{category, group_count, total_bytes}`、insights 条数、drives 数，以及 clean_prepare 的 code。**不得打印路径或命令行**；不删除任何东西。
