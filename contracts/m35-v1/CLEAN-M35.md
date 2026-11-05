# CLEAN-M35：解锁对与隔离区（W10-M4）

2026-11-05，总控（Claude）冻结（11-02 起草，11-05 按通读结果修订）。补充 [CLEAN](../v1/)、[CLEAN-HARDENING](../hardening-v1/CLEAN-HARDENING.md) 与第五波 CLEAN-M2 的执行器契约，只改 `packages/junk-clean/`。

来由：[ADR-019](../../docs/decisions/ADR-019-project-declarations-and-quarantine.md) 第 3 节（隔离区，用户 11-02 原话：“扫描出来后给用户两个选择，一个是直接清理掉，另外一个是进入隔离区……隔离区如果没有清理的话，要一直保留快捷打开隔离区的路径按钮，用户清理之后/或者手动删除才能消失”），[第十波计划](../../docs/dispatch/wave10/PLAN.md)第 2 节第 39、40、42～45、47、64、65 行，RULES-M35 第 4 节（解锁对）。

## 1. 原则

- `execute` 的行为除第 2 节外不变；CLEAN、CLEAN-HARDENING、CLEAN-M2 的全部条款继续有效。
- **不给已有枚举加成员**：`ItemStatus`、`SkipReason`、`RunStatus`、`CleanError`、`Level`、`Kind` 原样（服务对它们穷举匹配）。隔离区用自己的新类型。
- 已有结构只加一个字段：`PlanItem.unlocked_paths`（第 2 节）。历史验收脚本 `scripts/acceptance/w2-d-controller-cases.rs` 用结构字面量构造 `PlanItem`，它是第二波的存档证据，不再随新源码编译。
- 已有的 `VolumeReport` 获准加派生 `PartialEq, Eq`（`PurgeReport` 里用到它）；加派生不改任何行为。
- 仍然只用句柄操作，`src/` 里没有 `std::fs`。允许的系统调用在现有清单上**只加两处用途**：
  - `SetFileInformationByHandle` 的 `FileRenameInfo`（类 3），只在一个函数 `rename_at` 里，`ReplaceIfExists` 恒为 0；类 21、类 4（删除标志）照旧。不得传别的类。
  - `NtCreateFile`，只在一个函数 `create_dir_at` 里：单段名、相对父句柄、`CreateDisposition` 恒为 `FILE_CREATE`（2）、`CreateOptions` 含 `FILE_DIRECTORY_FILE | FILE_OPEN_REPARSE_POINT | FILE_SYNCHRONOUS_IO_NONALERT | FILE_OPEN_FOR_BACKUP_INTENT`。只建目录，名字已存在时失败，不打开已有的东西。
  - 其余照旧禁止：`DeleteFileW`、`RemoveDirectoryW`、`MoveFile*`、`CopyFile*`、`DeviceIoControl`、`NtSetInformationFile`、`FindFirstFile*`、`CreateDirectory*`、`WriteFile`。
- 检查器按名字核对：`NtCreateFile(` 与 `rename_at(` 的定义各一处；`create_dir_at` 只被第 3、4 节的建目录步骤调用；传给 `SetFileInformationByHandle` 的类只有 3、4、21。

## 2. 解锁对

```rust
pub struct PlanItem {
    // …现有字段…
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub unlocked_paths: Vec<String>,
}
```

- 0～4 个路径，每个过 `path::validate`；每个都必须**逐字**（不分大小写）出现在本计划的 `protected_paths` 里，并且严格包含这一项的 `path`。不合就是 `InvalidPlan`。
- `from_json` 与 `preflight` 的保护路径重叠检查：对这一项，`unlocked_paths` 里的路径不算重叠；别的保护路径照旧。这一项**包住**任何保护路径（包括它自己的解锁路径之外的）照旧拒收。
- `snapshot` 的身份检查：这一项的上级目录身份等于它某个解锁路径解析出的身份时不算命中；条目内部的身份检查与硬守卫一律不变。
- 硬守卫（`hard_guards`）永远不能解锁。
- 服务（M7）只在 RULES-M35 的 `unlocks_target_ids` 指定的那一对上填这个字段。

## 3. 移入隔离区

```rust
pub struct QuarantineTarget { pub base: Option<String> }
pub fn quarantine(
    plan: &CleanPlan, quarantine_id: &str, target: &QuarantineTarget,
    guard: &dyn ItemGuard, journal: &mut dyn Write, stop: &StopFlag,
    observer: &dyn CleanObserver, now: SystemTime,
) -> Result<QuarantineReport, CleanError>;
```

- `quarantine_id`：1～48 个 `[0-9A-Za-z-]`，不以 `-` 开头，否则 `InvalidPlan`。服务用 `YYYYMMDD-HHMMSS`，同一秒再加 `-n`。
- 隔离根 `qroot`：`base` 为 None 时是条目所在盘的 `<盘>:\.water-quarantine`（按 `path::volume(item.root)`）；为 Some 时必须是绝对路径、过 `path::validate`、最后一段是 `.water-quarantine`（不分大小写），只供测试。
- 一个 `quarantine_id` 只对应一个隔离根：服务按盘分批调用，每个盘一个编号（SERVICE-M35 第 6.1 节）。同一次调用里条目落在不同隔离根时，第一个隔离根之外的条目一律 `failed`/`not_same_volume`，不移动。
- 目的地：`<qroot>\<quarantine_id>\<条目路径去掉盘符的部分>`，例如 `F:\new\x\cache` → `F:\.water-quarantine\20261102-153012\new\x\cache`。隔离区里的目录结构就是原路径，用户打开一看就知道是哪里来的。
- 每一项依次：
  1. 停止标志已置：这一项及后面的都 `skipped`/`cancelled`，总状态 `stopped`。
  2. 与 `execute` 完全相同的 `preflight`（含第 2 节）。跳过时 `skipped` + 对应的 `SkipReason`。
  3. 条目路径里有一段是 `.water-quarantine`，或条目包住 `qroot`：`skipped`/`guarded`。
  4. 打开 `qroot` 的上级链（从盘根逐段按句柄打开，任何一段是重解析点或不是目录：`failed`/`quarantine_unavailable`）；`qroot`、`<quarantine_id>` 与中间各级不存在就用 `create_dir_at` 建，已存在就按句柄打开并确认是普通目录、不是重解析点（否则 `quarantine_unavailable`）。
  5. `qroot` 的卷序列号与条目身份的卷序列号不同：`failed`/`not_same_volume`，不尝试改名。**从不跨盘复制。**
  6. 写日志行 `{"journal_version":"water.quarantine-journal.v1","event":"intent","quarantine_id","item_id","path","destination","at"}`。
  7. 按句柄链打开条目（以 `DELETE | FILE_READ_ATTRIBUTES` 打开、不跟随重解析点、共享读写删），身份不等于计划里的：`skipped`/`changed`。然后 `rename_at(条目句柄, 目的地上级句柄, 最后一段)`。
  8. 错误对应：17 → `not_same_volume`；80、183 → `destination_exists`；5、32、33 → `locked`；其余 → `other`；都记 `error_code`。
  9. 写日志行 `"event":"moved"` 或 `"failed"`（加 `move_error`）。
- 原位置变空的上级目录不动。移入不腾空间，报告不含卷可用空间。

```rust
pub enum MoveStatus { Moved, Skipped, Failed }   // snake_case
pub enum MoveError { NotSameVolume, DestinationExists, QuarantineUnavailable, Locked, Other }
pub struct MoveReport {
    pub item_id: String, pub status: MoveStatus,
    pub skip_reason: Option<SkipReason>, pub move_error: Option<MoveError>, pub error_code: Option<u32>,
    pub destination: Option<String>,   // 只有 moved 有
    pub identity: Option<Identity>,    // 只有 moved 有，移入后再读一次（同卷改名不变）
    pub bytes: String,                 // 快照字节数；没走到快照为 "0"
}
pub struct QuarantineReport {
    pub report_version: String,        // "water.quarantine-report.v1"
    pub quarantine_id: String, pub started_at: String, pub ended_at: String,
    pub status: RunStatus, pub moved_bytes: String, pub items: Vec<MoveReport>,
}
```

- `observer.on_item(done, total, moved_bytes, item_id)`，与 `execute` 同频。
- 隔离记录（原路径、目的地、身份、字节、时间）由服务从报告里存（M7）；本包不在隔离区里写任何文件。

## 4. 复原

```rust
pub struct RestoreRequest { pub rel: String, pub identity: Identity, pub to: Option<String> }
pub fn restore(quarantine_dir: &str, requests: &[RestoreRequest], stop: &StopFlag, now: SystemTime) -> Result<RestoreReport, CleanError>;
```

- `quarantine_dir` 是 `<qroot>\<quarantine_id>`：过 `path::validate`，上级的最后一段是 `.water-quarantine`，否则 `InvalidPlan`。
- 每个 `rel` 是条目在 `quarantine_dir` 下的相对路径（即原路径去掉盘符），原路径 = `quarantine_dir` 的盘符 + `:\` + `rel`，要过 `path::validate`。
- `to` 为 Some 时还原到这个路径而不是原路径（第十波计划第 45 行“还原到旁边”）：必须过 `path::validate`、与原路径同盘；服务给的是原路径旁边的 `<原名>（还原 n）`。下面第 3、4 步对它照样适用，同样从不覆盖。
- 每一项：
  1. 停止已置：`skipped`/`cancelled`。
  2. 从 `quarantine_dir` 按句柄链打开条目（中间不跨重解析点），不存在 → `gone`；身份不等于请求里的 → `changed`。
  3. 从盘根逐段打开原路径的上级：一段是重解析点 → `parent_reparse`（不跟过去）；一段是文件 → `other`；不存在的段用 `create_dir_at` 建。
  4. `rename_at` 回原位，**从不覆盖**：已有同名 → `destination_exists`，两边都不动。其余错误对应同第 3 节（`locked`、`not_same_volume`、`other`）。
  5. 成功后，从条目原来的上级起往上直到 `quarantine_dir`，再到 `.water-quarantine`，变空的目录逐个删掉（删除标志，目录不空就停）。这些只是第 3 节建的骨架。

```rust
pub enum RestoreStatus { Restored, Skipped, Failed }
pub enum RestoreError { Gone, Changed, ParentReparse, DestinationExists, Locked, NotSameVolume, Cancelled, Other }
pub struct RestoreItem { pub rel: String, pub status: RestoreStatus, pub reason: Option<RestoreError>, pub error_code: Option<u32> }
pub struct RestoreReport {
    pub report_version: String,        // "water.restore-report.v1"
    pub quarantine_dir: String, pub started_at: String, pub ended_at: String,
    pub status: RunStatus, pub items: Vec<RestoreItem>, pub dir_removed: bool, pub root_removed: bool,
}
```

## 5. 彻底删除

```rust
pub trait PurgeObserver: Sync { fn on_progress(&self, removed_entries: u64, freed_bytes: u64); }
pub fn purge(quarantine_dir: &str, journal: &mut dyn Write, stop: &StopFlag, observer: &dyn PurgeObserver, now: SystemTime) -> Result<PurgeReport, CleanError>;
```

- 入口检查同第 4 节；另外从盘根到 `quarantine_dir`（含）逐段按句柄打开，任何一段是重解析点：`InvalidPlan`，什么都不删。
- 开始前写 `{"journal_version":"water.purge-journal.v1","event":"intent","quarantine_dir","at"}`，结束写 `"event":"done"` 加计数。
- **后序**遍历，按句柄、相对父目录打开每一项（`DELETE`、不跟随重解析点、共享读写删），用现有的 `set_delete`（POSIX 语义 + 忽略只读）删除：
  - 名字从目录列表取，按句柄相对打开，所以保留名（`nul`、`con.txt`、`aux`）、结尾是点或空格的名字、超过 260 字符的深路径都能删。这正是资源管理器删不掉、导致“删了还剩”的几类（第 7 节）。
  - 名称代理重解析点（联接、符号链接，`0x20000000` 位）当链接本身删，**不进去**；目标原封不动。
  - 其他重解析点（如云文件占位、去重）不动，记遗留 `reparse`：删它可能删掉云端的东西。
  - 目录在子项都删掉后再删；有子项删不掉，这个目录不单独记遗留（只记根因）。
- 遗留原因：32、33 → `in_use`；5 → `access_denied`；非名称代理重解析点 → `reparse`；其余 → `other`（记 `error_code`）。
- 最后：`quarantine_dir` 删空就删掉它（`dir_removed`）；`.water-quarantine` 随之变空也删掉（`root_removed`）。
- `freed_bytes` 口径与 `execute` 的 `bytes_freed` 相同；另报卷可用空间前后（`VolumeReport`）。
- 停止：在两项之间检查，总状态 `stopped`，已删的不回滚，剩下的照常计入 `remaining_*`。
- `observer.on_progress` 每删 256 项与结束时各调一次。

```rust
pub enum LeftoverReason { InUse, AccessDenied, Reparse, Other }
pub struct Leftover { pub rel: String, pub kind: Kind, pub bytes: String, pub reason: LeftoverReason, pub error_code: Option<u32> }
pub struct PurgeReport {
    pub report_version: String,        // "water.purge-report.v1"
    pub quarantine_dir: String, pub started_at: String, pub ended_at: String, pub status: RunStatus,
    pub volume: VolumeReport, pub freed_bytes: String, pub removed_entries: u64,
    pub remaining_entries: u64, pub remaining_bytes: String,
    pub leftovers: Vec<Leftover>,      // 最多 200 条，按 rel 排序
    pub leftovers_truncated: bool, pub dir_removed: bool, pub root_removed: bool,
}
```

## 6. 查看

```rust
pub struct QuarantineSummary { pub dir: String, pub quarantine_id: String, pub created_at: Option<String> }
pub struct QuarantineList {
    pub list_version: String,          // "water.quarantine-list.v1"
    pub root: String,
    pub state: String,                 // "absent"、"present"、"unavailable"（是重解析点、是文件或打不开）
    pub quarantines: Vec<QuarantineSummary>, // 按 quarantine_id 排序
    pub stray_entries: u64,            // 根下不是合法编号目录的东西
}
pub fn list_quarantines(root: &str) -> Result<QuarantineList, CleanError>;

pub enum LeftoverHint { OddName, LongPath, ReadOnly, Reparse, AccessDenied }
pub struct HintEntry { pub rel: String, pub kind: Kind, pub bytes: String, pub hints: Vec<LeftoverHint> }
pub struct QuarantineInfo {
    pub info_version: String,          // "water.quarantine-info.v1"
    pub dir: String, pub quarantine_id: String, pub exists: bool,
    pub total_bytes: String, pub disk_bytes: String, pub file_count: u64, pub dir_count: u64,
    pub hard_entries: Vec<HintEntry>,  // 最多 200 条
    pub hard_truncated: bool,
}
pub fn inspect(quarantine_dir: &str, stop: &StopFlag) -> Result<QuarantineInfo, CleanError>;
```

- `list_quarantines`：`root` 是隔离根本身（`F:\.water-quarantine`，或测试用的同名目录），过 `path::validate`、最后一段是 `.water-quarantine`，否则 `InvalidPlan`；从盘根逐段按句柄打开，中间有重解析点时 `state` 为 `unavailable`；只列它的直接子项，不进去；`created_at` 取目录列表里的创建时间。常驻隔离栏（UI-M35）就靠它：有任何编号目录，就显示“打开隔离区”。
- `inspect`：入口检查同第 4 节，不跟随重解析点地走一遍，只读。`hard_entries` 列出资源管理器通常删不掉的东西：
  - `odd_name`：保留名（含带扩展名的）或结尾是点、空格；
  - `long_path`：完整路径超过 259 个 UTF-16 单元；
  - `read_only`：带只读属性；
  - `reparse`：非名称代理的重解析点（名称代理的链接本身照常算一项，不进去）；
  - `access_denied`：打不开或列不出。
- 用户手动删了一部分以后，服务（M7）用 `inspect` 说明剩下的是什么、为什么手动删不掉，并给“让 Water 删掉剩下的”（即 `purge`）。

### 6.1 导出与序列化

- 第 3～6 节的类型都从 crate 根导出，派生 `Debug, Clone, PartialEq, Eq, Serialize, Deserialize`，结构带 `deny_unknown_fields`，枚举 `snake_case`。
- 另给 `quarantine_report_to_json`、`restore_report_to_json`、`purge_report_to_json`、`quarantine_list_to_json`、`quarantine_info_to_json`，与 `report_to_json` 同样写法。
- 非 Windows 下这些函数都返回 `Unsupported`，与现有桩一致。

## 7. “删了还剩”的成因与对应

用户 11-02 指出：手动清理后总有一些文件删不掉，隔离区目录因此一直在。上一轮四盘清理里遇到的成因与本契约的对应：

| 成因 | 资源管理器的表现 | 本契约 |
|---|---|---|
| 文件被占用（进程还开着） | “操作无法完成，因为文件已在另一程序中打开” | `purge` 记 `in_use`，关掉程序后再删即可；服务给出“关掉后重试” |
| 打开的终端停在这个文件夹里 | 最后一个空文件夹删不掉 | 也是 `in_use`（`kind` 为 `dir`）；服务写“有程序正占着这个文件夹（可能是打开的终端）”。查别的进程的当前目录要读进程内存，不做 |
| 保留名（`nul`、`con`、`aux.txt`），结尾是点或空格 | 删除无反应或提示找不到 | 按句柄相对打开，能删；`inspect` 标 `odd_name` |
| 路径超过 260 字符 | 提示路径太长 | 按句柄逐段打开，能删；`inspect` 标 `long_path` |
| 只读文件（如 `.git\objects`） | 要逐个确认 | `set_delete` 忽略只读 |
| 联接或符号链接 | 有时进到目标里删 | 只删链接本身 |
| 云文件占位等其他重解析点 | 可能触发下载或删云端 | 不动，记 `reparse`，请用户在对应程序里处理 |
| 权限不足 | 需要管理员 | 记 `access_denied`，不提权 |

## 8. 测试

`tests/clean_v1.rs` 现有的六个测试与断言不变；在同一个文件里**新增**下面五个测试，共精确 11 个（检查器每张单只跑一个测试目标）：

| 测试 | 标记 | 内容 |
|---|---|---|
| `quarantine_unlock_pair` | `CLEAN_M35_UNLOCK` | 解锁路径不在 `protected_paths`、不严格包含、超过 4 个都 `InvalidPlan`；解锁对能被 `execute` 删除；同一保护路径下没有解锁的兄弟项仍被拒；另一条保护路径仍生效；硬守卫写进 `unlocked_paths` 无效；通过联接指向解锁路径的别名仍按身份拦下 |
| `quarantine_move_contract` | `CLEAN_M35_MOVE` | 目录与文件各一项移入，目的地布局与身份不变、字节对；日志三种行；太新、占用（guard）、身份变了各跳过；路径里有 `.water-quarantine` 判 `guarded`；条目被不带共享删除地打开 → `locked`；目的地预先存在 → `destination_exists`；`.water-quarantine` 是联接 → `quarantine_unavailable` 且联接目标里什么都没多；停止 |
| `quarantine_restore_contract` | `CLEAN_M35_RESTORE` | 移入再复原，逐字节、修改时间都相同；原上级被删后能重建；原位置已有同名 → `destination_exists`，两边都不动；身份不符 → `changed`；原上级换成联接 → `parent_reparse`，联接目标里什么都没多；骨架目录与空的 `.water-quarantine` 被删掉；`to` 还原到旁边的一例，`to` 已存在时同样 `destination_exists` |
| `quarantine_purge_contract` | `CLEAN_M35_PURGE` | 隔离目录里放 `nul`、`con.txt`、`aux`、`a.`、`b `（用 `\\?\` 前缀建）、只读文件、深度超过 300 字符的路径、指向外部夹具的联接，全部删净，外部夹具逐字节完好；同样一组怪名放进普通计划项，`execute` 也删净（第 39 行补测试）；一个文件被不带共享删除地打开 → 遗留 `in_use`、目录还在；一个子目录被不带共享删除地打开（模拟终端的当前目录，第 40 行）→ 遗留 `in_use`、`kind` 为 `dir`；都关掉后再 `purge` → 删净、`dir_removed` 与 `root_removed` 为真；上级不叫 `.water-quarantine` → `InvalidPlan`；`<编号>` 本身是联接 → `InvalidPlan` 且目标完好 |
| `quarantine_inspect_and_list` | `CLEAN_M35_INSPECT` | `list_quarantines` 的三种状态、排序、`stray_entries`、`created_at`；`inspect` 对上一行那几类各标出对应提示，计数与字节对 |

- 所有夹具都在本树 `.local/` 下，测试用的隔离根是 `.local/<测试名>-<进程号>/.water-quarantine`（`base` 为 Some）。
- 跨盘一项：本树所在卷与 `%TEMP%` 不同卷时，在 `%TEMP%\water-w10-q-<进程号>\.water-quarantine` 建隔离根，断言 `not_same_volume` 且没有任何复制，测试结束删掉这个临时目录；同卷时日志写 `CLEAN_M35_CROSS_VOLUME n/a`。验收在 F: 上跑，应当适用。

## 9. 负控与真实冒烟

- **nc1**：`rename_at` 的 `ReplaceIfExists` 改为 1，测试以 `CLEAN_M35_RESTORE` 失败。
- **nc2**：`purge` 打开子项时去掉不跟随重解析点，测试以 `CLEAN_M35_PURGE` 失败（外部夹具被删）。
- **nc3**：`from_json` 忽略 `unlocked_paths`，测试以 `CLEAN_M35_UNLOCK` 失败。
- （检查器每单最多三条负控；“上级名必须是 `.water-quarantine`”的检查由 `CLEAN_M35_PURGE` 的反例断言覆盖，不单列负控。）
- 负控只认 `src/` 里的改动。
- **真实冒烟**（只读）：对每个固定盘的 `<盘>:\.water-quarantine` 调用 `list_quarantines`，只输出状态与编号目录个数。**不移入、不复原、不删除任何真实文件。**
