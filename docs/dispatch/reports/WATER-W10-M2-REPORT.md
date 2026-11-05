WATER-W10-M2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m2/docs/dispatch/reports/WATER-W10-M2-REPORT.md

## 身份、基线与提交

- 日期：2026-11-05；执行者 Codex，实际模型 GPT-6（环境未提供更细型号）。
- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m2`，分支 `worker/water-w10-m2`。
- 首次 HEAD：`f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe`，开工干净，baseline 通过。
- 实现提交：**`567f0283229128ea7993acd7e2f89d84d998ac3b`**。三个 final 均在此干净提交上通过，之后只提交本回执与 archive 生成的证据。
- 用户指定顺序已遵守：M1 的产品 `99f5d3ae`、回执/证据 `23cd89da` 提交并交回、核对干净后，才读 M2 原票并进入本树开工。没有在 M2 树改 junk-rules，也没有把 M1 提交合入此树。
- 交回状态为 SUBMITTED，等待总控验收；没有自行更新台账为 VERIFIED。

## SPEC 第 1～8 节落实

| 节 | 实现与验证 |
|---|---|
| 1 计划 JSON | plan.rs 定义本包 AgeBasis/KeepBy、新 marker/条件与 Target 字段，model.rs 的 InUse 加 root_levels。缺省键省略；严格拒绝模式重复/非法段、越界 root_levels、非法条件组合、空/重复/自指/不存在/非保护的解锁目标。pattern 条件只接受 custom 的单个 sibling_without_suffix。测试覆盖新键读回、目标 JSON 往返与旧键形状不变。 |
| 2 体量与年龄 | 原生枚举同一缓冲读取 creation/allocation/reparse_tag，不逐文件打开补分配量；只在未被枚举的单文件测量需要时用 FileStandardInfo。每项 disk_bytes 与 unique_bytes 共用身份去重。Group 新增 disk/eligible_disk 和。最新创建/修改口径覆盖项及后代的最新/最早活动、年龄门槛、活动排序。 |
| 3 新字段效果 | git_is_copy 只免本目标的 repository；unlocks_target_ids 只免列出的 inside_protected 对，其它保护/硬门不变；按同父目录与名字数字段排序保留版本，数字不转定宽整数；root_levels 原样带入组，本包不判断在用。 |
| 4 新匹配 | dir_name_pattern 与普通文件 file_name、新四条件及测量后 sibling 长度比较已实现。父目录清单复用，根深度 0 的新父条件全不满足；兜底下标使用计划中的准确 target_id，拒绝后不重复测量。custom discovery、盘根 pattern 与 marker 共用目录清单。 |
| 5 模板与簇 | templates.rs 实现完整固定算法，正反真实样例逐条断言。只在搜索中的 custom marker 目录及 discovery root 找簇；10 个门槛，文件排除日期尾巴，hash 簇补充同前缀同扩展名文件。S2 按分配量、中位数下中位与精确四倍界限，S4 按成员自身创建日，附加文件不计信号。FNV-1a 64 位稳定 ID、按 ID 追加组、24h/最新创建或修改、hash 留 1 均落实。已认领成员不重复归组，已完成簇不会因之后预算耗尽丢失。每个条目始终填可用 template，不依赖开关。 |
| 6 名字/隔离/问题 | 测量时只按名字识别贵重件与怪名，完整计数、最多 8 条相对路径；下载包目录和两个缩略图文件排除。`.water-quarantine` 全深度不列/不命中/不成簇，计它自身目录项；根在其中时安静跳过。`.git` 本身不成为条目，父项测量其中内容仍保持旧口径。测量问题暂存到最终主/兜底组，预算每组去重。不可清理级别身份未知不记 identity_unavailable 问题。 |
| 7 附加结果 | scan_full、ExtrasOptions、ScanExtras/Junction 及严格 JSON 读写已导出，scan 是缺省包装。只对两种支持标签调用只读 FSCTL_GET_REPARSE_POINT，不跟进去；根重解析点也纳入。规范化目标、最多 8 次展开/环处理、10,000 上限、最多 8 条引用名单。声明只收搜索深度 0～4 的普通文件，最多 256 个，不读内容。 |
| 8 空间概览 | space_overview 独立只读遍历，每个目录列一次，统计直接子项前 10、others、总量与问题；按分配量降序/名字升序，不跟联接，隔离区照常计入。进度使用 space_overview/space，保留预算、取消语义；版本与未知键校验、JSON 往返已实现。 |

所有目录枚举按不分大小写路径缓存，跨 pattern、marker、discovery、测量共用；合成簇用独立物理目录项计数证明 visited_entries 相等。原生调用内部使用 verbatim 路径，避免设备名、结尾点/空格被 Win32 归一化成另一个对象；公开路径形状不改。

`ScanResult`、`ScanOptions` 的字段及 `scan()` 签名未变。snapshot.rs 未改，增长/快照口径仍按输出活动时间；Cargo.toml/Cargo.lock 未改。

## 测试、夹具与只读辅助

精确仍是五测：scan_plan_contract、scan_pattern_marker_discovery、scan_overlap_and_guards、scan_reparse_budget_cancel、scan_snapshot_growth_keys。新 helper 在这五测内部调用，覆盖所有指定 SCAN_M35 标记，无新增第六测、ignore 或执行过滤。

夹具使用原 Fixture 工厂，在本树 `.local/w2-b-fixtures/fx-<进程号>-<纳秒>` 新建本次目录。联接、硬链接、稀疏文件、无效 UTF-16、保留名及结尾点/空格均在该目录里；结束仍只由原 Drop 清理本次目录并先拆自身联接。时间用原属性打开方式与 FileTimesExt::set_created。稀疏文件 fsutil setflag 后 set_len 64 MiB，另有 1 MiB 文件的三个硬链接，实测总逻辑 68 MiB、唯一逻辑 65 MiB、分配量低于 8 MiB。

身份不可得的 advisory 用例使用一次同步观察者回调：先枚举本次夹具、在指定组结束时删除它自己刚建的 vanishing.bin，下一目标消费已枚举元数据、身份读取失败；不记 identity_unavailable 问题。回调有本次夹具根边界校验，无后台线程、无真实数据写入。特殊名字测试使用 verbatim 前缀建自身文件/目录，不把这些路径交给任意 shell 删除。

使用一个同模型只读辅助审阅旧断言与实现，禁止其编辑、构建、测试、扫描或派实现子代理。主执行者修正并复核了它指出的三项：已完成簇遇后续预算时保留、同父目录簇成员不重复认领、根枚举预算转到最终兜底且去重。最终针对性复核未发现新承重问题；辅助已结束。

## 旧断言修改（逐条）

唯一需要补充旧期望字段的位置是原始 `f93afb8e` 测试文件 `check_single_walk` 第 2070～2085 行的空 tag 组克隆，获准于 SPEC §9(1)/(2)：

| 位置 | 原文/原值 | 新文/新值 |
|---|---|---|
| 原 2080 行附近，empty 的大小期望 | 仅把 total_bytes、eligible_bytes、unique_bytes、eligible_unique_bytes 清零；没有分配量字段 | 在原语句后增加 `empty.disk_bytes = Some("0".into());` 与 `empty.eligible_disk_bytes = Some("0".into());` |

原来的 `combined.groups == expected_groups`、items、issues、数量、顺序、全部旧标记均原样保留。没有改旧级别、旧年龄、原有名单、旧 visited_entries 期望或问题归属断言。旧测试没有必须改动的 advisory 身份问题断言；用新增用例覆盖新行为。其余测试差异是 imports 与五个测试入口调用新 helper，文末给出原有部分精确 diff。

## 检查过程与失败记录

所有检查均在 M2 树根、离线私有 Cargo/target、单线程执行，共同前缀：

`node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M2`

下表自动列出全部回执文件及追加参数，包括开发期失败，均保留归档，不隐去：

- 10:32:58 test：4/5 通过；空 tag 组克隆没有清新 disk 字段导致旧完整组比较失败，按上述获准修改补齐。
- 10:45:07 test：4/5 通过；新稀疏夹具在建文件前取得参考 now，被正确判为 too_recent，使 eligible_disk 为 0。修正新测试的参考时间，不改生产年龄门槛。
- 10:47:44 check：Clippy 拒绝两处可折叠 if；按提示改成 let-chain，不加 allow。
- 之后普通五测、check、三条恢复绿与三个 final 均通过；未出现超时重跑、调大预算、编译错误负控或安装依赖。

实现期运行 cargo fmt（`rustup run 1.95.0 cargo fmt --manifest-path packages/junk-scan/Cargo.toml`）、git diff --check、旧测试差异清点与归档大小/哈希复核。一个 apply_patch 因格式上下文不匹配而未写入，读取当前上下文后正确应用；没有把失败补丁当成已实现。

## 三条有效负控

三条均仅改 `src/scan.rs` 一处，不改测试；检查入口退出 0，内部 Cargo 测试预期退出 101，均为 4 通过 / 1 失败。每条后立即 `git checkout -- packages/junk-scan/src/scan.rs`，再 `--mode test`，五测恢复全绿。

| 条目 | 实际生产改动 | 命中与日志 | 恢复绿 |
|---|---|---|---|
| nc1 | 成簇门槛 `members.len() < 10` 改为 `< 2` | 11:02:32.878 的 red-nc1-5.log：`SCAN_M35_CLUSTERS: verify/hash/run/discovery, nine and photos excluded`，left 5 / right 4 | 11:02:38.317 test，5/5 |
| nc2 | 解锁成员查询改为查空 ID，而非受保护目标的 target_id，实际忽略合法解锁 | 11:02:58.071 的 red-nc2-5.log：`SCAN_M35_RULES: named unlock pair` | 11:03:04.006 test，5/5 |
| nc3 | 累加分配量时从 `child.allocation.unwrap_or(0)` 改为 `child.len` | 11:03:23.820 的 red-nc3-5.log：`SCAN_M35_SIZES: sparse allocation must be far below length` | 11:03:29.840 test，5/5 |

三次恢复后的 scan.rs SHA-256 均为 **`6930a0fedf9176ff8fcb2b2d7e4068d6ee5ba173c32c59e1b0349c97319bc6a2`**，与注入前相同。三个 red 回执均 observedExpectedFailure=true，final test 已审计源码快照、测试哈希与逐次恢复。nc2 因目标 ID 不再被逻辑使用而产生普通 dead-code 警告，目标失败来自上述新断言，不是编译失败；恢复后的 Clippy 无警告。

## 最终门与真实只读冒烟

三个 final 绑定 `567f0283`、前后树干净：11:04:17.721 `check --final`，11:04:21.879 `test --final`，11:04:25.809 `real --final`，均 passed。real 仅执行这一次，其间依次运行三段，不输出路径、文件名、目录名或原始附加结果。

| 真实段 | 状态 | 用时 ms | 访问条目数 | 汇总 |
|---|---|---:|---:|---|
| 原有 scan | completed | 19,118 | 265,063 | 12 组，4,655 项 |
| 三开关 scan_full | completed | 20,803 | 265,064 | 21 组；9 个簇全部 confirm；23 个联接、未截断；0 个声明位置 |
| 用户目录 space_overview | completed | 45,797 | 651,928 | 556,090 个文件；top 10，others 227；无 issue |

概览分配量 `78423921928`、逻辑量 `78023798872` 字节，others 分配量 `7238909704`。real 门总墙钟约 88.7 秒（含编译/包装），三段扫描耗时之和约 85.7 秒。第一段与第二段访问数相差 1，推测与扫描之间现场可变有关，未逐项取证，不当作固定快照相等的证明。0 个声明是实际结果；声明深度与不读内容的行为由合成夹具验证。

真实段只读元数据/时间/身份/重解析数据；内部检查器生成的扫描计划 JSON 是例程唯一读取内容的输入，不读取任何被扫描文件内容。进程命令行未读取或输出。没有删除、移动、改属性或写入真实用户目录。

## 交付边界与未验证事项

全部产品/测试改动只在 junk-scan；回执与 archive 证据按原票白名单提交。新系统函数仅 DeviceIoControl，且唯一控制码是 FSCTL_GET_REPARSE_POINT；无新依赖或下载。原生窗口 0、选择框 0、浏览器 0。未改主线、其它工作树、规则包、契约、检查器、台账、Git 配置或远端；未 push、merge、rebase、amend、reset。

未验证 macOS、M1→M2→M7 实际服务整合、真实用户选择/清理、生产竞态、10,000 联接与 256 声明的实机极限、最大 20,000,000 条目的内存峰值。目录清单缓存随访问规模增长，真实冒烟没有作内存基准。簇与贵重件/引用仅提供事实；在用、评级调整、选择、清理授权仍由服务/执行器负责。本回执不代表整机全部位置覆盖、可发布、已释放空间或总控验收通过。

归档保留包括接手前预存 baseline 的全部检查历史，下表文件名可精确定位；本执行者首次 baseline 是 10:15:02.291，预存记录不自报为自己执行。报告与证据提交后停止本票测试和后台进程。


| Receipt (UTC) | Arguments | Gate status | Cargo test exit |
|---|---|---|---|
| 2026-11-05T08-18-39.523Z-24748-baseline-result.json | --mode baseline | passed | - |
| 2026-11-05T10-15-02.291Z-10900-baseline-result.json | --mode baseline | passed | - |
| 2026-11-05T10-32-45.695Z-23784-lock-result.json | --mode lock | passed | - |
| 2026-11-05T10-32-58.341Z-15724-test-result.json | --mode test | failed | 101 |
| 2026-11-05T10-45-07.096Z-29628-test-result.json | --mode test | failed | 101 |
| 2026-11-05T10-46-43.593Z-26520-test-result.json | --mode test | passed | 0 |
| 2026-11-05T10-47-44.039Z-13128-check-result.json | --mode check | failed | - |
| 2026-11-05T10-50-25.814Z-30328-check-result.json | --mode check | passed | - |
| 2026-11-05T10-53-42.187Z-13036-test-result.json | --mode test | passed | 0 |
| 2026-11-05T10-53-48.704Z-20064-check-result.json | --mode check | passed | - |
| 2026-11-05T10-59-22.422Z-32308-test-result.json | --mode test | passed | 0 |
| 2026-11-05T10-59-30.180Z-19604-check-result.json | --mode check | passed | - |
| 2026-11-05T11-02-32.878Z-30464-red-nc1-result.json | --mode red-nc1 | passed | 101 |
| 2026-11-05T11-02-38.317Z-31924-test-result.json | --mode test | passed | 0 |
| 2026-11-05T11-02-58.071Z-25908-red-nc2-result.json | --mode red-nc2 | passed | 101 |
| 2026-11-05T11-03-04.006Z-20820-test-result.json | --mode test | passed | 0 |
| 2026-11-05T11-03-23.820Z-21832-red-nc3-result.json | --mode red-nc3 | passed | 101 |
| 2026-11-05T11-03-29.840Z-32680-test-result.json | --mode test | passed | 0 |
| 2026-11-05T11-04-17.721Z-33168-check-result.json | --mode check --final | passed | - |
| 2026-11-05T11-04-21.879Z-32916-test-result.json | --mode test --final | passed | 0 |
| 2026-11-05T11-04-25.809Z-8112-real-result.json | --mode real --final | passed | - |
| 2026-11-05T11-06-11.778Z-31780-archive-result.json | --mode archive | passed | - |

Archive: 396 entries, 6036482 bytes. All sizes and SHA-256 verified.

### Old test diff (blank context lines omitted)

```diff
@@ -3,12 +3,13 @@ use std::ffi::OsString;
 use std::fs::{self, OpenOptions};
 use std::os::windows::ffi::OsStringExt;
-use std::os::windows::fs::{MetadataExt, OpenOptionsExt};
+use std::os::windows::fs::{FileTimesExt, MetadataExt, OpenOptionsExt};
 use std::path::{Path, PathBuf};
 use std::process::Command;
 use std::time::{Duration, SystemTime, UNIX_EPOCH};
 use water_junk_scan::{
-    CancelToken, Condition, ScanObserver, ScanOptions, ScanPlan, ScanProgress, ScanResult, growth,
-    identity_of, normalize_key, result_from_json, result_to_json, scan, snapshot,
-    snapshot_from_json, snapshot_to_json,
+    CancelToken, Condition, ExtrasOptions, ScanObserver, ScanOptions, ScanPlan, ScanProgress,
+    ScanResult, extras_from_json, extras_to_json, growth, identity_of, name_template,
+    normalize_key, overview_from_json, overview_to_json, result_from_json, result_to_json, scan,
+    scan_full, snapshot, snapshot_from_json, snapshot_to_json, space_overview,
 };
@@ -188,4 +189,5 @@ fn item<'a>(result: &'a ScanResult, suffix: &str) -> &'a water_junk_scan::Item {
 #[test]
 fn scan_plan_contract() {
+    m35_plan_templates();
     check_m3d_plan();
     let unknown = r#"{"plan_version":"water.scan-plan.v1","rules_data_version":"2026-10-26.1","created_at":"2026-10-26T04:00:00Z","targets":[],"hard_guards":[],"extra":true}"#;
@@ -330,4 +332,6 @@ fn scan_plan_contract() {
 #[test]
 fn scan_pattern_marker_discovery() {
+    m35_markers();
+    m35_clusters();
     check_m3d_conditions();
     check_unique_bytes();
@@ -656,4 +660,5 @@ fn scan_pattern_marker_discovery() {
 #[test]
 fn scan_overlap_and_guards() {
+    m35_rules_names();
     check_single_walk();
     let fx = Fixture::create();
@@ -915,4 +920,5 @@ fn scan_overlap_and_guards() {
 #[test]
 fn scan_reparse_budget_cancel() {
+    m35_junctions_overview();
     let fx = Fixture::create();
     write_file(&fx.join("elsewhere/leaf/cache/z.bin"), &[8; 200]);
@@ -1097,4 +1103,5 @@ fn scan_reparse_budget_cancel() {
 #[test]
 fn scan_snapshot_growth_keys() {
+    m35_sizes_compat();
     check_m3d_growth();
     assert_eq!(
@@ -2078,4 +2085,6 @@ fn check_single_walk() {
             empty.unique_bytes = "0".into();
             empty.eligible_unique_bytes = "0".into();
+            empty.disk_bytes = Some("0".into());
+            empty.eligible_disk_bytes = Some("0".into());
             empty.file_count = 0;
             empty.oldest_activity = None;
```
