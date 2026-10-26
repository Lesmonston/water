# WATER-W2-B 体检扫描引擎 SPEC

2026-10-26 冻结。新 crate `packages/junk-scan`（`water-junk-scan`）：读取 [MODEL](MODEL.md) 第 4 节扫描计划，按定位规则找出条目，计算体量与活动时间，判定可清理性，输出第 5 节扫描结果；另提供快照、增长计算、名字归一化和系统已知目录查询。**只读**：只读目录项名字与元数据，不读任何文件内容，不写、不删、不改属性。

## 1. crate 形状

- 独立 workspace，`edition = "2024"`，`rust-version = "1.95"`，`publish = false`，auto 发现关闭；lib `water_junk_scan`。
- 依赖只允许 `serde =1.0.229`（derive）、`serde_json =1.0.151`；无 build 脚本、无 dev-dependencies、无新 registry 依赖。
- Windows FFI 沿用本项目写法：只在 `src/native_windows.rs` 内用裸 `extern "system"` 声明，`#![deny(unsafe_op_in_unsafe_fn)]`，每个 unsafe 块写安全说明；其它模块 `#![forbid(unsafe_code)]`（lib.rs 用 `#![deny(unsafe_code)]` 并只对该模块 `#[allow]`）。允许的系统函数：`SHGetKnownFolderPath`、`CoTaskMemFree`、`CreateFileW`（只用 `FILE_READ_ATTRIBUTES` 或 0 访问、`FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT`、全共享）、`GetFileInformationByHandleEx`（只 FileIdInfo）、`GetVolumeInformationByHandleW`、`CloseHandle`。

## 2. 公开 API

```rust
pub fn known_folders() -> Result<KnownFolders, ScanError>;           // Windows 已知目录；user_temp/system_temp 按 MODEL 第 2 节拼接
pub struct ScanPlan;  impl ScanPlan { pub fn from_json(s: &str) -> Result<Self, ScanError>; }
pub struct ScanOptions { pub max_entries: u64, pub max_seconds: u64 }   // 默认 20_000_000 与 900
pub struct CancelToken; // Clone + Send + Sync，cancel()/is_cancelled()
pub trait ScanObserver: Sync { fn on_progress(&self, progress: &ScanProgress); }
pub struct ScanProgress { pub group_id: String, pub category: String, pub visited_entries: u64, pub found_bytes: u64 }
pub fn scan(plan: &ScanPlan, scan_id: &str, options: &ScanOptions, cancel: &CancelToken,
            observer: &dyn ScanObserver, now: std::time::SystemTime) -> Result<ScanResult, ScanError>;
pub fn result_to_json(r: &ScanResult) -> String;
pub fn result_from_json(s: &str) -> Result<ScanResult, ScanError>;
pub fn snapshot(r: &ScanResult) -> Snapshot;
pub fn snapshot_to_json(s: &Snapshot) -> String;  pub fn snapshot_from_json(s: &str) -> Result<Snapshot, ScanError>;
pub fn growth(previous: &Snapshot, current: &Snapshot) -> Vec<Growth>;
pub fn normalize_key(name: &str) -> String;
pub fn identity_of(path: &str) -> Result<Identity, ScanError>;
```

`ScanError` 为固定枚举（InvalidPlan、InvalidResult、Native、Unsupported），Display 不含路径或系统原文。观察者回调频率不高于每 50ms 一次加每组结束一次。

## 3. 遍历规则

- **pattern**：base 必须存在、是目录、不是重解析点，否则该 target 产生 0 项，并记 issue `base_missing` 或 `base_reparse`（不报错）。逐段列目录、按段语法匹配名字；中间段只进入**不是重解析点的目录**，遇到重解析点记 issue `reparse_skipped` 并不进入（例如 `AppData\Local\Application Data`）。最后一段按 item_type 产生条目；最后一段命中的若是重解析点，不作为条目，记 `reparse_skipped`。
- **marker**：从 root 向下，最多 max_depth 层；不进入重解析点目录、名为 `.git` 的目录；某目录命中标记即成为一项，不再在其内部为同一 target 找新项。不同 target 各自独立查找。
- **discovery**：列 root 的直接子项（文件与目录，不含重解析点）。排除：与其它任一 target 的条目路径相同或为其祖先的子项、与任一受保护条目相同或为其祖先的子项。其余每个子项为一项。
- **条目体量**：从条目出发迭代遍历（用 `symlink_metadata`），不跟随任何重解析点（重解析点本身计 0 字节）；累加普通文件长度、文件个数；`newest_activity` 取条目自身与所有遍历到的后代的最大修改时间。权限不足的子目录跳过并在组上记 `access_denied`，结果 status 为 partial。
- 名字不是合法 Unicode 的子项不进入任何清单，记 `unrepresentable_name`。
- 预算：已访问目录项数超过 max_entries 或耗时超过 max_seconds 时立即停止，status 为 partial，记 `budget_exhausted`；取消时 status 为 cancelled。两者都返回已得结果。

## 4. 合并与可清理判定

1. 同一路径被多个 target 命中：保留级别最保守者，并列时取计划中靠前者。
2. 依次判定不可清理原因，命中第一条即停：`level_not_cleanable`（advisory/protected）→ `hard_guard`（条目等于或是任一 hard_guard 的祖先）→ `contains_protected`（是任一受保护条目的祖先）→ `inside_protected`（在任一受保护条目之内）→ `repository`（条目是目录且直接含名为 `.git` 的子项）→ `too_recent`（now − newest_activity < min_age_hours）→ `keep_newest`（同一 target 内按 newest_activity 降序，前 keep_newest 个其余条件都满足的条目保留）。
3. 组统计：total 为全部条目之和；eligible 只算 eligible=true 的条目。
4. `identity`：对每个条目用 `identity_of` 取得；失败时 identity 为 null，eligible 置 false，ineligible_reason 为 `identity_unavailable`，并在组上记同名 issue。**没有身份的条目不能进入清理计划。**
5. 输出排序确定：groups 按计划中首次出现顺序；items 按 group 顺序再按路径（大小写不敏感）排序；item_id 为 `i-` 加 6 位序号。

## 5. 名字归一化（top_keys 用）

依次：

1. 去掉首尾花括号后整体是 GUID（8-4-4-4-12 位十六进制）→ `{guid}`。
2. 若含分隔符 `-`、`_`、`.`：取最后一个分隔符后的部分，若长度 ≥ 6、全为 ASCII 字母数字、且含数字或同时含大小写字母，替换为 `*`。
3. 若不含分隔符：长度 ≥ 12、全为 ASCII 字母数字且含数字 → `*`。
4. 对结果中 `*` 与 `{guid}` 以外的每段连续 ASCII 数字替换为 `#`。

必须满足：`marketplace-upgrade-k2Hq9x`→`marketplace-upgrade-*`；`rb123-x-chrome-AbC123`→`rb#-x-chrome-*`；`claude`→`claude`；`{3F2504E0-4F89-11D3-9A0C-0305E82C3301}`→`{guid}`；`vscode-stable-system-x64-a1b2c3`→`vscode-stable-system-x#-*`；`tmp`→`tmp`；`7f3a9c2e1b4d`→`*`。

## 6. 快照与增长

按 MODEL 第 6 节。growth 只比较两边都有的 group；间隔不足 1 小时返回空；`days` 保留一位小数；字节差与每日字节为十进制字符串，可带 `-`。

## 7. 测试与检查

唯一测试文件 `packages/junk-scan/tests/scan_v1.rs`，精确五个测试：`scan_plan_contract`、`scan_pattern_marker_discovery`、`scan_overlap_and_guards`、`scan_reparse_budget_cancel`、`scan_snapshot_growth_keys`。

- 测试在本树 `.local/w2-b-fixtures/` 下用随机名新建本次夹具目录，结束时**只删除本次新建的那一个目录**（校验父目录与名字前缀）。联接用 `cmd /c mklink /J`（无需管理员）创建，不创建符号链接。
- plan contract：未知键、相对路径、`..`、非法段语法、空段、超过 8 段、max_depth 越界都被拒绝；合法计划可读回。
- pattern/marker/discovery：多层通配、`#` 段、大小写不敏感、文件与目录类型、keep_newest、marker 三种、discovery 排除被其它 target 覆盖的子项、条目体量与 newest_activity 正确。
- overlap/guards：同路径多 target 取保守级别；包含 / 位于受保护条目、hard_guard 祖先、含 `.git` 的目录、年龄未到都正确判为不可清理并给出对应原因。
- reparse/budget/cancel：中间段联接不进入且记 issue；条目内部联接指向的外部目录不计入体量；预算用尽返回 partial；取消返回 cancelled；identity 对同一目录稳定、对删后重建的目录不同。
- snapshot/growth/keys：第 5 节全部样例；增长阈值边界（19/20 个、1 GiB/天、不足 1 小时）。

有效负控 nc1：真实让体量遍历跟随重解析点，使 reparse 测试失败，失败信息含 `SCAN_NO_FOLLOW`；立即原字节恢复后全绿。

真实只读冒烟（`--mode real`）：`examples/real_smoke.rs` 读入检查器按 [real-plan-template.json](real-plan-template.json) 生成的真实计划，对本机执行一次扫描，**只输出组级汇总**（group_id、级别、条目数、可清理数、total_bytes、eligible_bytes、issues），不输出条目路径。用时与访问条目数写入回执。
