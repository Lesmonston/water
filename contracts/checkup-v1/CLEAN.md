# WATER-W2-D 清理执行器 SPEC（重门）

2026-10-26 冻结。新 crate `packages/junk-clean`（`water-junk-clean`）：执行 [MODEL](MODEL.md) 第 8 节清理计划。逐项重新核对后永久删除，写操作日志，输出报告。这是 Water 第一段会删除文件的代码，验收按重门执行。

**执行者的所有删除测试只能作用于本树 `.local/w2-d-fixtures/` 下本次新建的合成夹具。任何真实用户位置都不得出现在测试计划里。** 本票没有真实冒烟模式。

## 1. crate 形状

- 独立 workspace，edition 2024，rust 1.95，publish false，auto 发现关闭；lib `water_junk_clean`。
- 依赖只允许 `serde =1.0.229`（derive）、`serde_json =1.0.151`。
- FFI 只在 `src/native_windows.rs`，写法同 SCAN 第 1 节。允许：`CreateFileW`（只读属性，`FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT`）、`GetFileInformationByHandleEx`（只 FileIdInfo）、`GetVolumeInformationByHandleW`、`GetDiskFreeSpaceExW`、`CloseHandle`。删除本身只用标准库：`remove_file`、`remove_dir`、`set_permissions`（仅清除只读属性）。**不得使用 `remove_dir_all`**，因为需要逐项控制不跟随与失败计数。

## 2. 公开 API

```rust
pub struct CleanPlan; impl CleanPlan { pub fn from_json(s: &str) -> Result<Self, CleanError>; }
pub trait ItemGuard { fn in_use(&self, item: &PlanItem) -> Option<String>; }   // 返回占用进程名
pub struct NoGuard; impl ItemGuard for NoGuard { ... }                          // 恒为 None
pub struct StopFlag; // Clone + Send + Sync，stop()/is_stopped()
pub trait CleanObserver: Sync { fn on_item(&self, done: usize, total: usize, freed_bytes: u64, item_id: &str); }
pub fn execute(plan: &CleanPlan, guard: &dyn ItemGuard, journal: &mut dyn std::io::Write,
               stop: &StopFlag, observer: &dyn CleanObserver, now: std::time::SystemTime)
    -> Result<CleanReport, CleanError>;
pub fn report_to_json(r: &CleanReport) -> String;
pub fn identity_of(path: &str) -> Result<Identity, CleanError>;
pub fn volume_free_bytes(path: &str) -> Result<u64, CleanError>;
```

## 3. 计划校验（from_json，整份计划不合格即拒绝）

- 未知键、重复 item_id、level 不是 recommended/confirm、kind 不是 dir/file、identity 缺失、total_bytes 非十进制字符串都拒绝。
- path 与 root 必须是 MODEL 第 1 节合法绝对路径；path 必须严格位于 root 之内（按段比较，不等于 root）。
- path 不得等于或是任一 hard_guard 的祖先；不得等于、是祖先或位于任一 protected_path 之内。

## 4. 每项执行顺序（任何一步不通过即跳过该项，记录原因，继续下一项）

1. 已收到停止信号 → `cancelled`（之后所有项都是 cancelled）。
2. 从 root 到 path 的每一级（含 root）用 `symlink_metadata` 检查：存在、是目录（最后一级按 kind）、**不是重解析点**。root 或中间级是重解析点 → `outside_root`；条目本身是重解析点 → `reparse`；条目不存在 → `gone`；类型不符 → `changed`。
3. `identity_of(path)` 与计划中的 identity 不同 → `changed`。
4. `guard.in_use(item)` 返回 Some → `in_use`。
5. 重新遍历条目（不跟随重解析点），求 bytes_before 与最新修改时间；now − 最新修改时间 < min_age_hours → `too_recent`。遍历中发现任一 protected_path 在其内 → `protected_overlap`。
6. 向日志写 intent 行并 flush；写失败则整个执行中止并返回错误（不得在没有 intent 记录时删除）。
7. 删除，后序、不跟随：
   - 遇到重解析点（目录联接或符号链接）：只删除这个链接本身（目录型用 `remove_dir`，文件型用 `remove_file`），绝不进入。
   - 普通文件：`remove_file`；因只读失败时清除只读属性后重试一次；仍失败计入 failed_entries，继续。
   - 目录：子项处理完后 `remove_dir`；非空则保留并继续。
   - 每处理完一个子项检查停止信号；收到则停在当前位置，该项计为 partial（若已删除部分）或 cancelled（若尚未删除任何内容）。
8. 重新遍历残余，bytes_freed = bytes_before − 残余字节。条目已不存在 → `deleted`；有残余且删除过东西 → `partial`；什么都没删掉 → `failed`。
9. 写 result 行并 flush；回调 observer。

报告中 volumes 为计划涉及的每个盘根在执行前、后的可用空间；status 为 completed 或 stopped。

## 5. 测试与检查

唯一测试文件 `packages/junk-clean/tests/clean_v1.rs`，精确五个测试：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`。

- 每个测试在 `.local/w2-d-fixtures/` 下新建随机名目录作为本次夹具，计划中的 root 一律在该目录之内；测试结束只删除本次新建的夹具目录。联接用 `cmd /c mklink /J` 创建。
- plan contract：第 3 节每条拒绝规则；合法计划读回。
- revalidation：条目消失、删后同名重建（identity 变）、文件换成目录、刚刚改动、guard 报占用、条目内含 protected_path，均被跳过且**一个字节都没删**。
- no follow：条目内的目录联接指向夹具中“外部”目录，清理后外部目录及其文件完好、联接本身已删除；root 到条目之间有一级是联接时整项 `outside_root`，联接目标完好。
- partial/stop/journal：测试用独占方式打开条目内一个文件，清理后该项 partial、其余文件已删、failed_entries ≥ 1；只读文件被删除；停止信号后剩余项 cancelled；日志每项 intent 先于 result，且 intent 行在删除前已落盘（测试在 observer 回调前读取日志文件核对）。
- report/volume：freed_bytes 等于各项之和且等于实际减少；volumes 包含夹具所在盘根；报告 JSON 形状严格符合 MODEL。

三条有效负控，每条真实修改被调用的生产分支，立即原字节恢复并全绿后再做下一条：

| 标签 | 坏态 | 失败信息必须含 |
|---|---|---|
| nc1 | 跳过第 4 节第 3 步身份比对 | `CLEAN_IDENTITY` |
| nc2 | 删除时进入重解析点而非只删链接 | `CLEAN_NO_FOLLOW` |
| nc3 | 跳过 root 到条目的逐级重解析与包含检查 | `CLEAN_ROOT_BOUND` |
