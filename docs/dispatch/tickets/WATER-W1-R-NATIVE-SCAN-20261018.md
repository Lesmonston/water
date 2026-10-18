# WATER-W1-R：许可约束的原生遍历与默认脱敏报告

**最新（2026-10-19）：原票及补单01已VERIFIED并集成（Windows受控范围），不再外贴、首次baseline或resume。R-001已通过补单修订与实际验收关闭；原受阻报告/基线/冻结保留。当前以manifest和[RTU总控验收](../../acceptance/wave1/controller/WATER-W1-RTU-REVIEW-20261019.md)为准。下文为原票历史。**


总控2026-10-18。主manifest为READY后，用户外贴给一个新执行对话才开始。本票纵向接P→真实原生元数据→A→Q；不等待或实现原生选择器。

| 项 | 唯一值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-R-NATIVE-SCAN-20261018.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/r / worker/water-w1-r |
| 精确基线 | dd09c3b8801b86a0059f3fb73fe8a250acb1d89e |
| tag | water-w1-native-scan-base-20261018 |
| 权威manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/native-scan-v1/freeze.lock.json，61条目/十旧锁227唯一文件，合计255唯一冻结 |
| helper / 纪律 | scripts/native-scan-check.mjs / docs/dispatch/W1-NATIVE-SCAN-WORKER-RULES.md |
| 回执 | F:/new/smaltalk/water/.worktrees/r/docs/dispatch/reports/WATER-W1-R-REPORT.md |
| 证据 / 临时 | 本树docs/acceptance/wave1/r/、.local/checks/WATER-W1-R/、.local/next-{cargo-home,target,tmp} |

必读主检出README/STATUS/AGENTS/工作流、本票、ADR-012、本批纪律、native-scan SPEC/TESTS/SOURCES/decoder-cases、真实N/P/Q API和A/H语义。执行树早于正式票/登记，直接读主检出权威材料，不merge取票。首次核绝对路径、分支、精确HEAD、干净状态、255冻结与packages/native-scan尚不存在；不符保留现场写受阻回执，不重置。

首次只运行：

```powershell
node scripts/native-scan-check.mjs --task WATER-W1-R --mode baseline
```

只有本票manifest登记实际baseline通过才READY，执行者开工重复确认。baseline仅验证Windows x64/Node24/Rust1.95/MSVC、私有离线P/N/A、固定一层NT ABI能力及已验收Q/A/H的24报告/9错误；新R、递归遍历和五测试未运行。不得把能力探针说成R已实现。

仅冻结prepare在本树.local/native-walk-fixtures创建/复用一个batch：4个子目录、6个普通文件名条目含1硬链接、1junction，payload字面60字节/含硬链接逻辑74字节；固定root内部应观察8条目、文件长度和为58，但来源总量保持未知。工具有界核固定结构/哈希，Rust只读index及原生元数据，不读普通payload、不写fixture。所有夹具/缓存/日志保留，不改旧N/P等树，不清理/重造。负控可能进入的trap只准本batch。

## 实现目标与安全边界

只实现packages/native-scan，water-native-scan/water_native_scan/pub mod v1，API/私有类型/完整状态/错误/wire以SPEC为准。六直接依赖是A/N/P/Q及固定serde/serde_json；H仅Q间接依赖。自有workspace/锁、唯一lib/test，无dev/build/bin/新包或根Cargo修改。锁只经helper lock离线生成。

真实P.begin_scan取得本次permit并check；私有RAII guard保证Completed/Partial finish、Cancelled cancel、Err或observer unwind清理本次attempt，不取消宿主已存在的其它attempt。真实N检查候选根，许可与候选ID、实际枚举句柄ID双门验证一致后才枚举。子项只用父活句柄+单组件NtCreateFile(FILE_OPEN/OPEN_REPARSE_POINT)，禁止拼绝对路径/read_dir回退。只查属性/ID/逻辑长度、无普通READ_DATA/写/删除/ACL/备份提权。

unsafe仅src/native_windows.rs两固定声明NtCreateFile/GetFileInformationByHandleEx，x64结构大小/对齐和每处SAFETY必须明确，其余模块deny/forbid。用File RAII，失败/未初始化HANDLE不接管；目录可变长buffer按边界解析，不能直接cast尾数组。公开decoder/validator只有未授权内存名称数据，不造handle或permission。默认扫描无模拟IO/环境开关/按fixture名返回expected。

取消、深度、全局visited与每目录完整名单上限、UTF-16原序和坏名/重复/异常buffer按SPEC。所有对象unknown/protected、分配与回收量null，Windows真实128位ID保留在新native侧车；不冒充旧F/G/J/K/O的lab输入、Unix身份、稳定快照或全竞态验证。report必须真实A.validate，redacted_json必须真实Q入口；完整native JSON仍含相对标识，不作为默认公开导出。无真实用户目录、原生picker/UI/CLI/HTTP/WebView、桌面保存或上传。

## 白名单和五测试

仅本树packages/native-scan/Cargo.toml、Cargo.lock、README.md、src/内Rust文件、tests/native_scan_v1.rs；docs/dispatch/reports/WATER-W1-R-REPORT.md和docs/acceptance/wave1/r/新证据。预置证据.gitattributes冻结不改；旧A–Q/根Cargo/helper/锁/台账/上游/其它树只读。

唯一五顶层native_scope_and_identity、native_directory_decoding、native_metadata_no_follow、native_budgets_and_cancellation、native_report_and_redaction，完整执行不skip/filter。涵盖SPEC全部要求，包括5 decoder正例/10反例、9合法/22非法名称、真实P根绑定/旧scope/宿主active保持、完整8项原生元数据/硬链接/junction/Unicode/零文件、depth0/1、总预算刚好/超出、目录名单超限不取半批、预取消/observer取消与panic guard、A逐值/Q去标识和无绝对路径泄漏。

测试只使用helper提供并已校验的WATER_NATIVE_WALK_INDEX及冻结内存case；生产不得读这个env或fixture索引。至少完整公开P.prepare/confirm→R.scan_registered→A报告→R.redacted_json/Q链路，检查每次完成/错误/取消后可重新begin、revoke后旧scope拒绝。无原生故障物理权限时如实保留源码审阅，不伪造native handle、减断言或开测试后门。

先完整五测试与可编译骨架red-behavior，命中R_BEHAVIOR/真实Rust101；再实现、suite五绿。稳定fmt/clippy后逐个实改真实生产逻辑：

1. red-nc1关闭候选/实际根与permit的ID门，使错误trap根可被扫描，命中R_ROOT_BINDING。
2. red-nc2把真实reparse当Directory并允许进入，保留OPEN_REPARSE_POINT，命中R_NO_FOLLOW；只允许本batch trap。
3. red-nc3关闭真实取消检查，命中R_CANCELLED；不是改输入或用超时造红。

每项完整五红→立即原字节恢复→suite完整五绿，记录原/坏/恢复SHA。helper保存生产/测试原字节及完整stdout/stderr；四条当前字节红/恢复链final核验。编译/缺文件/超时不算红，源或测试改变须重录相应链，不改helper。

统一命令`node scripts/native-scan-check.mjs --task WATER-W1-R --mode <mode>`，允许baseline/fixtures/lock/fmt/test/suite/clippy/metadata/bridge/red-behavior/red-nc1/2/3；offline/locked/jobs1，单子命令180秒，一次一个门，无全仓/watch/coverage。实现/测试提交后同一干净SHA串行：

```powershell
node scripts/native-scan-check.mjs --task WATER-W1-R --mode fmt --final
node scripts/native-scan-check.mjs --task WATER-W1-R --mode test --final
node scripts/native-scan-check.mjs --task WATER-W1-R --mode clippy --final
node scripts/native-scan-check.mjs --task WATER-W1-R --mode metadata --final
node scripts/native-scan-check.mjs --task WATER-W1-R --mode bridge --final
```

bridge编译冻结总控源码，实际P/R/A/Q、8条目、错误根/cleanup/预取消/撤销和decoder全case，不以expected伪装运行。全部helper json/log/txt原字节归档本票证据，不纳binary/cache/payload；显式文件名add，log用-f。报告绑定完整受测SHA、实际模型、逐需求/门/五测/红恢复/三哈希、窄unsafe审阅、所有失败/未触发分支和限制：原生用户确认/选择器、真实用户scope、其它Windows/文件系统、生产竞态、重命名后永恒包含、macOS、桌面/删除仍未验收，M1未完成。

报告/证据提交不夹未复测产品，不merge/push，交回后停止。通知与报告首行：

```text
WATER-W1-R 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/r/docs/dispatch/reports/WATER-W1-R-REPORT.md
```
