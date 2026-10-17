WATER-W1-F 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/f/docs/dispatch/reports/WATER-W1-F-REPORT.md

# WATER-W1-F 执行回执

2026-10-17。执行者提交，等待总控独立验收；本回执不宣称 VERIFIED、主线集成或 M1 完成。

## 基线、提交与范围

- 权威工单：主检出 `docs/dispatch/tickets/WATER-W1-F-SCAN-LAB-20261017.md`，无补单。
- 工作树：`F:/new/smaltalk/water/.worktrees/f`；分支：`worker/water-w1-f`。
- 初始 HEAD：`fc114eb81125cef7d374deddc95144bcd9aee748`，与 tag `water-w1-scan-lab-base-20261017` 一致，开工时干净。
- 实现及首轮证据提交、五 final 门共同受测 SHA：**`3f3acbd7cf3726c10f7a759c8fc79301f2a4069e`**。五门前后均为该 SHA、空 status。
- 后加提交仅为本回执及 final 日志/核对证据，不改产品或测试；接收 HEAD 可用本分支 `git rev-parse HEAD` 核实。
- 实际执行：Codex / GPT-6（按本会话身份；更细模型子版本未独立核验）；无子代理或外部分包。
- 开工 baseline 实际开始时间 `2026-10-17T13:17:49.695Z`。运行中总控在主 manifest 将 F 标为 RUNNING，F 分配/基线/白名单/测试清单未变。主线后续 G/H/I 规划改动不是本执行者写入或提交。

产品共九个文件：独立 Cargo.toml/Cargo.lock/README、`src/lib.rs`、`src/fixture_v1.rs`、`src/fixture_v1/{marker,native,walk}.rs` 和唯一 `tests/scan_v1.rs`。其余改动均在本票回执和 `docs/acceptance/wave1/f/`。实现提交的277个精确文件见[暂存清单](../../acceptance/wave1/f/implementation-staged-files.json)，九个产品文件哈希见[实现哈希](../../acceptance/wave1/f/implementation-hashes.json)。

未改根 Cargo、A–E、D 工厂、冻结 helper/契约/锁、.gitattributes、上游或其他工作树；未 push/merge/rebase、安装依赖或改全局配置。Git 无现成身份，提交仅用单命令 `Water Worker (external) / water-worker@localhost`，禁 hooks/签名。

## 需求逐项对照

| 要求 | 实现及证据 |
|---|---|
| 独立 workspace 与依赖 | water-scan 0.1.0 / water_scan，edition2024、Rust1.95、四auto=false，仅lib和scan_v1；本地A及精确serde/serde_json，锁来源/版本/checksum经helper核对。 |
| 受控入口 | 私有 FixtureRun/ScanNodePath，无任意root参数、环境覆盖、Deserialize/Default/绝对路径getter。完整run_id词法先于路径IO；从文件系统根逐组件检查到run/scope，不枚举祖先。 |
| 严格 marker | 最多65536字节，实际读取take(65537)；原始JSON直接反序列化，逐层拒绝重复/未知键与缺失nullable；版本、case/run、scope/node顺序、plan、状态/错误码和canary形状校验。绝对展示路径不用于IO。 |
| 真正原生装配 | scan_fixture装配NativeIo/NoopObserver。遍历事实来自symlink_metadata/read_dir；不按marker.nodes、matrix或case_id拼结果/故障/取消。冻结Rust桥接实际调用公开入口。 |
| No-follow 与身份 | Windows所有reparse先判Link；list_names独立拒绝链接目录/祖先。Windows身份全Unknown，Mac源码使用dev/ino/nlink且inode=0回退Unknown。只给File逻辑长度，allocated恒null，不去重/求回收量。 |
| 预算与排序 | encoded bytes排序、前序遍历；scope根不计entry；inspect失败和不可表达名消耗visited；批次limit+1及时停止并拒绝整批；重复名/超长批次先拒绝；全局预算在下一候选inspect前停止，刚好结束不造issue。 |
| 取消 | Arc<AtomicBool>共享、单向取消；预取消零扫描IO；每个待执行操作先查取消，优先于预算/深度；observer成功记录后触发，平面最后一项后取消仍Completed；已完成scope保留覆盖。 |
| 故障与覆盖 | PermissionDenied、NotFound/Io、DirectoryLimit及RootChanged准确映射code/origin/operation；保留已得事实、可达兄弟继续，RootChanged停止全调用并标后续scope。 |
| 只读与安全范围 | 生产唯一内容读取为有界marker；测试只读受控index/冻结输入/所选run，通过包装器委托NativeIo。没有payload读取、写入/ACL/移动/删除/清理、网络/进程入口、UI/IPC、报告组装或分类。 |
| 六测试及负控 | 精确六个顶层测试全部通过；先真实行为红，再四个有效生产逻辑负控，每次完整六测、三hash恢复及重新编译。 |

详细源码复核（含无法由测试直接证明的边界）见[SOURCE-REVIEW.md](../../acceptance/wave1/f/SOURCE-REVIEW.md)。NativeIo对read_dir创建及每个迭代Result分别处理，错误丢弃批次；目录批次注入只证明错误传播，不冒充真实OS迭代失败。

## 实际夹具结果

复用总控派前 `2026-10-17T13:02:24.698Z` 创建的索引，本轮未运行 fixtures 模式、未新增任何物理夹具、未清理既有run。索引原字节副本见[fixture-index.json](../../acceptance/wave1/f/fixture-index.json)。

- 原生：11 case、12 scope、**39 entry**；公开入口的 permission-plan/cancel-plan 均按实际可读磁盘运行，不自动应用计划。
- 测试驱动权限和取消后：**36 entry**，单独核对对应entries/coverage/issues。
- hardlink、symlink_dir、junction_dir 三种链接均实际 created；本机 unsupported=0。六个控制负例也全部 created，逐项拒绝。测试保留其他机器的unsupported能力分支，不skip整测试。
- helper检查 **44份内容/marker快照一致**。这只证明内容未变；未读payload另由IO trace与源码审阅支持。
- Windows std身份不稳定API探针按预期 E0658 拒绝；F记录Unknown，不伪造文件身份。

## 定向检查与同 SHA 五 final 门

所有产品检查均使用冻结 `node scripts/scan-lab-check.mjs --task WATER-W1-F --mode <mode>`；final追加`--final`。串行、离线、jobs=1、单测试线程、每命令180秒。源文件格式编辑使用同一1.95工具链rustfmt，仅点名本包六份Rust文件并设skip_children=true；正式格式检查仍由helper完成。没有整仓、coverage或watch检查。

以下五门全部命令退出0、helper passed，前后HEAD均为实现SHA且干净：

| Final mode | 结果 | 原始 receipt |
|---|---|---|
| fmt | 通过 | [13:47:53 fmt](../../acceptance/wave1/f/2026-10-17T13-47-53.846Z-37400-fmt-result.json) |
| test | 6 passed / 0 failed / 0 ignored，44快照一致 | [13:48:02 test](../../acceptance/wave1/f/2026-10-17T13-48-02.485Z-40576-test-result.json) |
| clippy | -D warnings通过 | [13:48:12 clippy](../../acceptance/wave1/f/2026-10-17T13-48-12.606Z-37860-clippy-result.json) |
| metadata | 目标/依赖/锁/范围通过 | [13:48:22 metadata](../../acceptance/wave1/f/2026-10-17T13-48-22.316Z-27676-metadata-result.json) |
| bridge | 真实Rust公开入口，11/12/39；44快照一致 | [13:48:32 bridge](../../acceptance/wave1/f/2026-10-17T13-48-32.613Z-31072-bridge-result.json) |

六个测试为 `scan_native_fixtures`、`scan_scope_and_links`、`scan_budgets_and_order`、`scan_faults_and_coverage`、`scan_cancellation`、`scan_identity_and_readonly`。

每门同时核22项新冻结与四份旧锁的43个唯一文件。baseline/lock/开发检查等18次记录见[prefinal-checks](../../acceptance/wave1/f/prefinal-checks.json)，五final摘要见[final-checks](../../acceptance/wave1/f/final-checks.json)。原始命令stdout/stderr及receipt均原字节复制：首轮256份、final71份；文件名、字节数和SHA256分别在[prefinal日志清单](../../acceptance/wave1/f/prefinal-log-manifest.json)与[final日志清单](../../acceptance/wave1/f/final-log-manifest.json)。

## 行为红、四负控与全部失败

首轮骨架成功编译后运行六测试，0 passed / 6 failed，均为真实行为断言失败，非编译/缺文件/超时：[行为红receipt](../../acceptance/wave1/f/2026-10-17T13-24-58.037Z-25020-test-result.json)。当时walker和逐文件hash已保留；[首次实现绿](../../acceptance/wave1/f/2026-10-17T13-27-35.183Z-26872-test-result.json)为六测全过。

| 负控 | 真实逻辑修改与目标失败 | 恢复六测 |
|---|---|---|
| NC1 | NativeIo将Link误标Directory；保留list_names独立拒绝。native directory-links事实及scope覆盖断言失败，3 passed / 3 failed。 | [13:35:42恢复](../../acceptance/wave1/f/2026-10-17T13-35-42.710Z-25156-test-result.json) |
| NC2 | 全局条目预算允许多一项；“第三项inspect必须为零”断言失败，3 passed / 3 failed。 | [13:38:04恢复](../../acceptance/wave1/f/2026-10-17T13-38-04.484Z-15204-test-result.json) |
| NC3 | 真实CancelToken读取atomic但忽略状态；clone共享取消与受控结果断言失败，4 passed / 2 failed。 | [13:39:32恢复](../../acceptance/wave1/f/2026-10-17T13-39-32.741Z-18028-test-result.json) |
| NC4 | 将PermissionDenied批次当空目录成功；应Partial却Completed断言失败，5 passed / 1 failed。 | [13:40:46恢复](../../acceptance/wave1/f/2026-10-17T13-40-46.239Z-38576-test-result.json) |

每项仅改对应真实生产文件，测试hash保持不变；坏版本均成功编译并完整运行六测试。恢复逐文件原字节、显式更新mtime，原hash=恢复hash且不同于坏hash；每次恢复日志均出现`Compiling water-scan`，六测全绿。完整三hash/时间/红绿receipt见[negative-controls.json](../../acceptance/wave1/f/negative-controls.json)，三份原源码备份保留在同目录。

此外有两次Clippy失败：[13:29](../../acceptance/wave1/f/2026-10-17T13-29-42.868Z-19080-clippy-result.json)发现两个clone_on_copy；[13:30](../../acceptance/wave1/f/2026-10-17T13-30-56.405Z-19348-clippy-result.json)发现两处needless_borrows。按建议修正，没有降警告标准，后续开发门和final门均通过。以上共7次失败helper记录，全部保留；无尚未修复的测试失败或超时。

辅助命令另有失败，未计为有效行为红或产品门：早期压缩显示JSON的node -e因PowerShell引号解析失败，随后用只读PowerShell解析；初次暂存diff检查将自生成清单的CRLF判为尾空白，已仅将自生成清单改LF，原始日志未改；初次暂存清单的日志名展开为空，意外对F证据目录调用一次add，清单比对在提交前发现。核查索引仅包含本票新文件，随后重建277个精确文件清单、逐文件add（日志显式-f）、严格核对一致且diff检查通过。没有提交其他人的改动，也未重置/清除现场。

## 未验证项、假设与交接

- macOS未编译或运行；不把Windows验证当双平台验收。
- 真实ACL权限拒绝、真实ReadDir迭代错误、恶意并发替换/TOCTOU、真实用户scope授权未验证。Windows未知身份不能可靠检测全部同路径替换。
- 严格marker全部字段规则经源码审阅；现有六个物理负例不等于每一种嵌套非法JSON都有独立运行样本。
- 未接正式桌面、UI取消、E、报告组装、分类、导出或真实删除；无真实用户目录、HOME、整盘扫描。
- 越界申请：无。未请求新增依赖/权限/冻结修改；所有夹具和日志保留。主线台账与验收由总控处理。

提交后停止修改，供总控先核SHA/diff/范围、复测和独立验收。
