WATER-W10-M2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m2/docs/dispatch/reports/WATER-W10-M2-REPORT.md

当前交回为文末“补单 02”；原有实现与检查记录保留，属于历史状态。

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

## 补单 01（2026-11-05）：完成，交回 SUBMITTED

### 身份、顺序与提交

- 实际模型：GPT-6（Codex，运行环境未提供更细型号）。使用继承同模型的只读辅助审阅遍历、缓存与兼容边界；辅助未编辑、构建、测试或扫描，现已结束。
- 先完成 M1 补单 03：实现 `72ac1178cd30adce9c4d27df988e2057eabfdbcb`、回执证据 `2fd789d84177398f97cef2128c1326d4725697a8`，提交并交回、确认干净后才读本补单并进入 M2。
- 本树 / 分支：`F:/new/smaltalk/water/.worktrees/w10-m2` / `worker/water-w10-m2`；续做起点 `f50da2642dc055d8425b474e30759b6ce22cdc0f`，开工干净。
- 已按顺序读原票、执行者规则、SCAN-M35 全文、本补单与原回执，并复核有效契约、ADR 与相关代码。baseline 沿用原回执已通过记录，本次未重跑。
- 实现提交：**`337f41ace967620ecbefecde82c0cf2e17c8fb77`**。三个 final 均绑定该干净提交，后续仅回执与 archive 证据提交；没有改写历史。

### 本补单五项

1. `scan.rs:1248` 起按模板规定的末点、1～8 个 ASCII 字母数字提取扩展名；`hash_extra` 精确核对扩展名（ASCII 不分大小写），无扩展名模板只接受同样无扩展名的额外成员。保留同前缀补充成员的原语义。
2. 目录候选进入自己的清单时记录是否直接有普通 `.water-cleanup.json`；这类目录不进入候选、不计 S1，且不依赖 declarations 开关。发现的声明路径不因簇认领成员而删除，仍按深度 0～4、路径顺序、最终最多 256 条交给服务。对嵌套 custom root，深度按各个 root 分别判断。
3. 原 marker 在名字命中后照旧关闭自己的后代匹配，保持 SCAN-M3D 与所有旧断言；附加搜索状态独立。只有实际命中或兜底命中才抑制簇和声明搜索；条件失败且无兜底时仍搜索这些附加结果。长度条件的归属在测量后确定，先保留必要的附加搜索结果，再只按实际 marker 命中排除；簇不会排除已发现声明。
4. 新私有模块 `src/scan/streaming.rs` 把 pattern、marker、discovery 的重叠位置合为一次物理 DFS；嵌套根在同一次遍历激活，盘根严格排在后代前面，目标根的父条件仍为深度 0。目录清单建小写名字到下标的 HashMap，`cached_child` 不再线性搜索。目标、候选的测量共用该次枚举；逐条累计并保持每个测量根独立的文件身份去重，不能把兄弟目录的 unique/disk 简单相加。
   - 清单在 Enter 的 `Engine::listing` 放入缓存；当前目录及其祖先使用期间保留；Exit 完成本目录测量和候选收集后立即移除。取消/预算退出时清空剩余清单。概览所用 `measure` 也在每个目录处理完后释放清单。
   - 候选目录自身测量完成时立即释放其身份 HashSet 和父清单 Arc；父目录只暂存 Child、Measured、直接声明标记和问题。没有潜在十成员模板的搜索目录不保留候选清单；后续只保留待判定的候选测量记录与实际命中，不保留全部已扫描目录的清单或 visited 路径集合。`visited_roots` 仅记录计划内有限的根。
   - 候选模板用 HashSet 查询；同扩展名 hash 前缀按名字逐字符归一化查询，避免每个子项遍历所有模板。命中用精确路径集合及 BTreeSet 后代范围查询，已认领成员用 HashSet 逐级查祖先。候选计数、判断、补成员、索引与测量相关循环检查取消/预算；进度限流时间在回调前更新，慢观察者不推迟下一次合法进度。
5. 簇尚未成立时，取消与预算检查使用父位置组；只有成功簇才生成 `leak:` 目标，因此不会给不存在的 leak 组留下 budget_exhausted。候选测量问题保留到成功簇并归该组；最终被普通命中排除的 discovery 不记它不该测量的子树问题。新增独立 FNV-1a 64 位计算，与实际 `group_id` 逐字比对。

原公开接口、ScanResult/ScanOptions 字段、计划与结果版本、原生调用与依赖不变。目录只枚举一次的原断言及新增重叠根断言全部通过。

### 新增测试与旧断言

在指定 `scan_pattern_marker_discovery` 内调用新增 helper `m35_clusters_addendum`，仍精确五测。新增覆盖：

- 有扩展名、无扩展名两种 hash 簇，拒绝其它扩展名；同扩展名非模板文件仍加入。
- 十个同模板目录中一个直接带声明，剩九个不成簇；该声明仍返回。
- 成簇成员内部更深处已经发现的声明仍保留。
- 名字命中但条件失败无兜底的目录内，十二个子目录成簇，直接声明返回。
- 独立按小写父路径、换行、dir、换行、模板计算 FNV ID。
- 2,048 个候选文件的目录内，候选判断的进度回调取消，结果 cancelled 且无簇；预算放弃的簇问题均属于实际位置组。
- 嵌套 marker root 的深度 0 父条件不满足；嵌套位置的声明按各自 root 深度发现。
- 普通 marker 与 discovery 同时覆盖目录时，普通条目正确归属，visited_entries 精确等于实际三项；被排除 discovery 没有该子树的测量问题。
- 成功簇保留成员清单里的 unrepresentable_name 问题。

**旧断言修改：无。** 测试 diff 只增加 helper 和调用；全部旧期望、标记、测试名单、fixture 清理边界保持原样。新夹具沿用本树 `.local/w2-b-fixtures/fx-<进程>-<纳秒>` 工厂，仅清理本次目录；未增第六测、ignore 或过滤。

### 检查命令与完整结果

均在本树根执行，共同前缀 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M2`。时间为 UTC，表中对应的 result.json、日志和源码快照已 archive；普通及 final test 均运行完整五测。

| Receipt 时间 / PID | 后缀参数 | 结果 |
|---|---|---|
| 12-25-18.783Z-10340 | `--mode real` | 改前只读对照通过 |
| 12-28-36.042Z-27876 | `--mode test` | 新用例先红，4/5；额外成员扩展名不符 |
| 12-37-10.196Z-19352 | `--mode test` | 开发期 3/5；旧逻辑问题计数、root 预算最终归属失败，修生产代码，未改断言 |
| 12-39-38.927Z-14112 | `--mode test` | 开发期 4/5；新增候选取消用例发现状态未及时更新，修正进度/取消接线 |
| 12-45-31.187Z-7968 | `--mode test` | 5/5 通过 |
| 12-47-18.116Z-27988 | `--mode check` | Clippy type_complexity 失败；提取 ClusterMember 类型别名，未加 allow |
| 12-50-04.003Z-30988 | `--mode test` | 补齐嵌套 root、discovery、问题归属用例后 5/5 通过 |
| 12-52-17.085Z-21676 | `--mode lock` | 通过，依赖与锁不变 |
| 12-52-25.487Z-33996 | `--mode check` | 政策、fmt、clippy -D warnings 通过 |
| 12-53-35.369Z-23240 | `--mode red-nc1` | 有效负控，检查器通过 |
| 12-54-03.094Z-7752 | `--mode test` | 原字节恢复后 5/5 |
| 12-55-19.131Z-19420 | `--mode red-nc2` | 有效负控，检查器通过 |
| 12-55-52.563Z-27876 | `--mode test` | 原字节恢复后 5/5 |
| 12-56-44.162Z-3688 | `--mode red-nc3` | 有效负控，检查器通过 |
| 12-57-15.360Z-30068 | `--mode test` | 原字节恢复后 5/5 |
| 12-58-13.235Z-10700 | `--mode check --final` | 干净实现提交通过 |
| 12-58-40.423Z-23744 | `--mode test --final` | 5/5，三组 proofAudit 通过 |
| 12-59-14.671Z-34064 | `--mode real --final` | 三段真实只读冒烟 completed，通过 |
| 13-02-09.175Z-27792 | `--mode archive` | 通过；777 条 / 12,883,101 字节，逐条大小与 SHA-256 核对通过 |

实现期用绝对工具链路径执行 `cargo.exe fmt --manifest-path packages/junk-scan/Cargo.toml`；`git diff --check` 通过。一处补丁上下文未匹配，未写入，读取上下文后重新应用。没有下载、改超时或用编译错误造负控。

### 三条负控与恢复

三条均只改 `src/scan.rs` 的真实生产逻辑一处；每次等 red 完成后立即 `git checkout -- packages/junk-scan/src/scan.rs`，再完整 test。内部 Cargo 均预期 101、4 通过 / 1 失败，外层检查器均通过。

| 负控 | 注入 | 目标失败 |
|---|---|---|
| nc1 | 共用的 `CLUSTER_MIN_MEMBERS` 从 10 改为 2，前置候选与最终判断同时使用该承重常量 | `SCAN_M35_CLUSTERS: verify/hash/run/discovery, nine and photos excluded` |
| nc2 | inside_protected 的解锁查询改查空 ID，忽略实际合法解锁目标 | `SCAN_M35_RULES: named unlock pair` |
| nc3 | accumulate 的分配量累加从 `child.allocation.unwrap_or(0)` 改为 `child.len` | `SCAN_M35_SIZES: sparse allocation must be far below length` |

三次恢复的 scan.rs SHA-256 均为 `6c1a28ba8757c560672f2e69c828ef15be1fecf7b57aff56ae4c8c58304bbfb2`，与注入前一致。未改动的 streaming.rs SHA-256 为 `cb353fd849fca3714ce6a979590b6d54d9493f377dc11145acf98f5b24025364`。最终 test 的 proofAudit 逐组采用上表对应红绿记录，并验证源码快照及测试哈希；没有红绿重叠执行。

### 真实冒烟前后对照

改前为本轮在 `f50da264` 上的 12:25:18 记录；改后为 `337f41ac` 上的最终 real。两次均只读，三段都 completed；输出仅组级汇总和计数，不输出真实路径、文件名、命令行。

| 段 | 改前 ms / visited_entries | 改后 ms / visited_entries |
|---|---:|---:|
| 普通 scan | 21,663 / 284,679 | 50,037 / 283,982 |
| 三开关 scan_full | 31,020 / 284,679 | 27,964 / 283,982 |
| 用户目录 space_overview | 42,874 / 653,681 | 76,262 / 654,206 |

实测 full 减少 3,056 ms；普通 scan 与概览本次反而更慢，不能宣称整体加速。两次不是冻结数据，条目数与体量也变化，未测同时运行的其它任务负载，不能把耗时差单独归因于实现。内存边界来自缓存生命周期与代码复核，本次未测进程峰值内存或做同一冻结大目录的性能基准。

改后普通扫描 12 组 / 4,652 项；full 仍为 9 个簇、全部 confirm，23 个联接，0 个声明。概览 top 10、others 227、558,199 个文件，分配量 `90495496368` 字节；只读存在性与占用结果不代表这些内容能清或已清理。改前概览为 557,838 个文件、分配量 `78665294688` 字节。数据现场变化未逐文件取证。

### 边界与未验证项

未改其它包、规则数据、冻结契约、检查器、台账、Cargo.toml/Cargo.lock、原生 FFI、Git 配置或远端；未 push、merge、rebase、amend、reset。没有窗口、选择框、浏览器、联网下载；真实文件只读元数据、身份、时间及重解析点数据，没有读被扫描文件内容或修改真实数据。

未验证 macOS、M1/M2/M7 实际集成、真实清理、极端并发变化、2,000 万条目下的内存峰值。候选与实际输出自身仍随候选/输出数量占内存；声明路径仍按既有语义在最终排序后截到 256，未做百万浅层声明的内存基准。没有把目录清单释放等同于固定的总内存上限。

已完成本票全部授权修改、指定五测、三条红绿及三个 final。回执和证据提交并核对干净后停止本树所有测试、扫描与自有后台进程；状态为 SUBMITTED，等待总控验收。

## 补单 02（2026-11-06）：完成，交回 SUBMITTED

- 实际模型：GPT-6（Codex，运行环境未提供更细型号）；未使用子代理。
- 先交回 M1 补单 04：实现 `2d1c71b7d7d988a70f209753a571f964f30be6e5`，回执与证据 `02bcbfab2d71f4dd306738573a20ddb09069da09`，确认工作树干净后才开始本单。
- 本树 / 分支：`F:/new/smaltalk/water/.worktrees/w10-m2` / `worker/water-w10-m2`。
- 续做起点：`68f902639b68f942e5556aa2063bfe363bbdaaac`，开工干净。已读指定原票、规则、SCAN-M35、有效旧契约、补单 01、补单 02 与历史回执。baseline 沿用已通过记录，未重跑。
- 实现提交：`cd08848363844da83e50a187b15a1eee8d8fc94c`；只改 `src/scan.rs`、`src/scan/streaming.rs` 和指定 `tests/scan_v1.rs`。后续仅回执和归档证据提交。

### 五项交付

1. **`.git` 内只测量**：`streaming.rs` 的共用 `outside_git` 按完整路径段、不分 ASCII 大小写检查 `.git`。计划根在其中时不启动搜索；DFS 进入这些目录测量时，两个目标激活循环共用 `search_allowed`，同时关闭 pattern、目录 marker、file_name、discovery；没有 custom/discovery 搜索上下文，所以簇候选与声明也不搜索。重解析点的目标搜索分支使用同一门。已有测量仍累加所有普通文件，因此包含项的字节不丢。未只补 pattern 一处。
2. **预算归属**：独立维护每个目标尚未完成的搜索目录集合，与尚在测量的记录分开。根尚未抵达时仍在集合；搜索一个目录完成后换成需要搜索的子目录，marker 命中关闭自己分支的搜索。停止后汇总尚未完成的搜索目标组和每个测量记录经 `owner` 得出的最终归属组，用组集合去重，替换局部停止检查的临时 budget 记录，每组只记一次。已完成搜索且无未完测量的组不受影响；原兜底预算归属断言仍通过。walk 已因预算/取消结束时不再启动构簇，避免给已完成普通组补记问题。
3. **簇不在最终条目内**：`build_clusters` 用普通和 discovery 最终命中的路径集合检查簇父目录；父目录等于或位于任一命中之内时直接丢弃整个 proposal，不创建组、簇或候选问题。已认领簇成员的后代排除照旧。声明不使用这份新增排除；pattern/discovery 条目内已经找到的声明仍返回，marker 原有搜索边界保持。
4. **增强漏检测试**：同一父目录下同时造三个同前缀 hash 文件簇（无扩展名、`.apk`、`.txt`），每种十个模板文件加一个同前缀非模板文件，逐组精确为十一项且扩展名一致。构簇取消测试用第二个未命中 marker 的最终进度作 sentinel，等合法进度间隔后，只在 `build_clusters` 的候选循环回调取消；另断言该回调确实发生、结果 cancelled、无簇。没有改原取消用例或原断言。
5. **discovery 问题只记一次**：延后的 discovery 收尾暂存测量问题；构簇后，仍属于 discovery 的实际条目才把问题记回原组。变成簇成员的记录只由候选问题路径记到 leak 组；不再两组重复计数。

保留现有单次物理 DFS、清单缓存生命周期及名字索引；没有为性能重写遍历。补单列为遗留的 discovery 预先测量、停止时丢弃已测完的延后 discovery 条目、问题逐条暂存及名字前缀分配方式，均未另行修复。不把本次用时与上次冷缓存结果作性能结论。

### 新增用例与旧断言

在原 `scan_pattern_marker_discovery` 中调用 `m35_clusters_addendum02`，仍精确五测。相对续做起点，测试 diff 为 **447 行新增、0 行删除**，补单 01 新增断言也全部保留。

- discovery root 与三段 pattern 共 base，中间段 `*`，子项 `.GiT` 内含 objects、refs、普通文件、十二个模板目录及声明；另测第一段 `*`、base 内 `.git`、外层 discovery 正在测量的情况。两例都没有 `.git` 本身或其后代条目/声明/簇，包含项仍有完整 24 字节。计划还显式包含 `.git` 内的 marker、file_name、discovery 根。
- 测量 discovery 子项中的 pattern 命中时耗尽预算：pattern、discovery、尚未走到根的目标各有一条 budget_exhausted；此前已完成的组、同 root 已完成的文件目标都没有预算问题，已出条目保留。
- pattern、discovery、兜底三种包含项内部各有十二个模板子目录：仅有原项，无内部簇或 leak 问题；pattern/discovery 内已找到声明保留。
- 同前缀、跨扩展名的三种文件簇，以及只在构簇候选循环中触发的取消，见上。
- discovery 下十个簇成员，其中一个含无法表示的文件名：只有 leak 组的一条 unrepresentable_name，count 为 1，discovery 不重复记。

### 检查命令与结果

全部在本树根执行。共同前缀：`node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M2`。Receipt 省略 `2026-11-06T` 与 `-result.json`；完整原始日志和源码快照均已归档。

| Receipt | 参数 | 结果 |
|---|---|---|
| 04-20-53.975Z-15548-test | `--mode test` | 新用例先红，退出 1，4/5；编译成功，精确复现 middle wildcard 在 git 内出条目 |
| 04-22-13.588Z-32428-test | `--mode test` | 修复后退出 0，5/5 |
| 04-23-11.618Z-30212-lock | `--mode lock` | 退出 0，依赖与锁不变 |
| 04-23-29.415Z-27864-check | `--mode check` | 退出 0，源码政策、fmt、clippy -D warnings 通过 |
| 04-24-35.091Z-33556-test | `--mode test` | 增加同 root 已完成目标的预算反例后退出 0，5/5；随后提交实现 |
| 04-25-30.998Z-6560-test | `--mode test` | c5 额外变异，退出 1，目标断言红：无扩展名簇错收 33 而非 11 项 |
| 04-25-52.842Z-30976-test | `--mode test` | 恢复原字节后退出 0，5/5 |
| 04-26-26.286Z-27992-test | `--mode test` | c7 额外变异，退出 1，未发生构簇候选回调的新断言红 |
| 04-26-46.769Z-5852-test | `--mode test` | 恢复原字节后退出 0，5/5 |
| 04-27-15.898Z-33368-test | `--mode test` | 禁用 git 排除的额外变异，退出 1，middle wildcard 新断言红 |
| 04-27-48.422Z-16476-test | `--mode test` | 恢复原字节后退出 0，5/5 |
| 04-28-16.621Z-21900-red-nc1 | `--mode red-nc1` | 退出 0，有效目标红，内部 Cargo 101 |
| 04-28-41.917Z-19236-test | `--mode test` | nc1 恢复后退出 0，5/5 |
| 04-29-08.323Z-35348-red-nc2 | `--mode red-nc2` | 退出 0，有效目标红，内部 Cargo 101 |
| 04-29-26.093Z-13064-test | `--mode test` | nc2 恢复后退出 0，5/5 |
| 04-29-48.654Z-12628-red-nc3 | `--mode red-nc3` | 退出 0，有效目标红，内部 Cargo 101 |
| 04-30-13.245Z-35480-test | `--mode test` | nc3 恢复后退出 0，5/5 |
| 04-30-44.312Z-2456-check | `--mode check --final` | 退出 0，干净实现提交上通过 |
| 04-31-15.800Z-23400-test | `--mode test --final` | 退出 0，5/5，proofAudit 采用本轮三组规定红绿 |
| 04-31-33.833Z-9476-real | `--mode real --final` | 退出 0，三段真实只读冒烟 completed |
| 04-34-38.503Z-24140-archive | `--mode archive` | 退出 0，累计 1,203 条、21,655,319 字节；全部归档与源文件的长度/SHA-256 核对通过 |

三个 final 均绑定干净实现提交 `cd08848363844da83e50a187b15a1eee8d8fc94c`。另用绝对工具链路径运行 `cargo.exe fmt --manifest-path packages/junk-scan/Cargo.toml`，`git diff --check` 通过。一处新增用例补丁上下文未匹配，未写入，读取上下文后重新应用。无编译错误、超时或改测试造红。

### 变异、三条负控与恢复哈希

额外变异也仅改生产逻辑：c5 将扩展名判断放宽为“相等或实际扩展名非空”；c7 删除 `build_clusters` 候选循环的 emit 与 stopped 检查；git 变异仅把共用排除比较的名字从 `.git` 改为 `.git-disabled`。三者均由新增 `SCAN_M35_CLUSTERS` 断言抓住，退出后立即 checkout 该单文件并完整五测恢复。

| 规定负控 | 唯一生产改动 | 失败标记 |
|---|---|---|
| nc1 | `CLUSTER_MIN_MEMBERS`：10 → 2 | `SCAN_M35_CLUSTERS: verify/hash/run/discovery, nine and photos excluded` |
| nc2 | 解锁查询改查空 ID，忽略实际 unlocks_target_ids | `SCAN_M35_RULES: named unlock pair` |
| nc3 | 分配大小累加由 allocation 改成逻辑长度 child.len | `SCAN_M35_SIZES: sparse allocation must be far below length` |

每次均严格等待 red/test 退出后，立即 `git checkout -- packages/junk-scan/src/scan.rs`（git 额外变异恢复 `src/scan/streaming.rs`），再运行完整 test；没有红绿重叠。恢复哈希与实现提交一致：

- `src/scan.rs`：`76676c9c1e80bf60f4fe0f56ebca3db494eca148ded64f4ffbad34b19c7e82b4`，c5/c7 与三条规定负控恢复后均相同。
- `src/scan/streaming.rs`：`3f49fb5d53922a26f4681b981efe470a3793c0dd907330014c76e41db310f757`。
- `tests/scan_v1.rs`：`90aac8a72ec080b5f581ad3a18e3cc3158cd80c264306f8d9e387e2fb3de0b9c`，所有变异期间不变。

### 真实冒烟与未验证项

| 段 | 状态 | 用时 ms | visited_entries |
|---|---|---:|---:|
| 普通 scan | completed | 51,769 | 275,905 |
| 三开关 scan_full | completed | 28,207 | 275,902 |
| 用户目录 space_overview | completed | 76,023 | 665,510 |

普通扫描 12 组、4,163 项；full 为 8 个簇、全为 confirm，23 个联接、0 个声明。空间概览 top 10、others 227、568,396 个文件，分配量 `106130833376` 字节，无问题。只输出汇总和计数，不含真实路径、文件名或进程命令行；没有读取被扫描文件内容、修改或清理真实数据。

没有窗口、选择框、浏览器、联网下载、新系统函数或原生 FFI 改动；依赖、Cargo.toml/Cargo.lock、其它包、规则数据、冻结契约、检查器、台账、Git 配置与远端不变。未 push、合主线或改写历史。新增夹具仅由现有 Fixture 在本树 `.local/w2-b-fixtures/fx-<进程>-<纳秒>` 创建并按原边界清理各自一个目录。

未验证 macOS、M1/M2/M7 实际集成、真实清理、生产竞态、百万条目性能或峰值内存；不把只读冒烟称为清理验收。完成回执与证据提交并确认工作树干净后，停止本树测试、扫描与自有后台进程，等待总控复验。
