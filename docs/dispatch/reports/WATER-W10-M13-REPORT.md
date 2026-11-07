WATER-W10-M13 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m13/docs/dispatch/reports/WATER-W10-M13-REPORT.md

日期：2026-11-07。执行者：Codex（GPT-6；用户外贴安排为 astra，运行环境未提供更细型号），未使用子代理。

## 基线、顺序与实现提交

- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m13`；分支：`worker/water-w10-m13`。
- 首次 HEAD：`98f9678e6a49bb63b87272644dae15c721384d9c`，初始工作树干净；baseline 前后 HEAD 与空 status 一致。
- 实现提交：`0cdff543826ee37b76b5e54b9a6b0271e9df74fe`。
- 按用户要求，先完成 M12（实现 `eb2026c633041dfdafcb6025d55555df8de83f23`、回执/证据 `d16fbefba32d453a2786e23607e4d3ac86487cfe`），交回完成通知，再读取 M13 工单并开工。没有把 M12 合入本树，也没有在本树修改规则包。
- 后续提交只含本回执与 archive 生成的本单证据，不夹带产品变化。

## 工单第 1 节逐项实现

1. `src/templates.rs` 收紧 `<r6>`：正好 6 个 ASCII 字母数字，至少一个大写字母，同时至少一个数字或小写字母。公开 `name_template` 和每个 `Item.template` 共用原有调用链，均按新定义计算。其它尾巴顺序与模板算法不变。
2. 文件簇排除 `<u>`，原有 `<d>` 也不作为文件簇模板；目录五种尾巴继续可用。合法 `<h>`、`<r6>`、`<p8>` 文件仍可成簇。
3. `file_parts` 提取扩展名后按 ASCII 不分大小写排除 `.jsonl` 文件。
4. 模板按 ASCII 小写比较，含 `backup` 或 `bak` 就不参加簇。
5. 对父目录路径从右往左检查自身及四级祖先（精确五段）；任一级名称恰为 `sessions`、`subagents`、`conversations`、`chats`、`transcripts`（ASCII 不分大小写）时不参加簇。没有读祖先目录内容，也没有扩大磁盘读取范围。
6. 在 `scan.rs` 增加私有 `cluster_candidate_allowed`，`streaming.rs::potential_children` 的两轮筛选和 `scan.rs::build_clusters` 都调用它。将父目录传入 streaming 的私有函数；候选被排除后不会被同前缀哈希文件的额外成员路径重新收回。普通 marker/discovery 处理仍继续。
7. 依照工单对 SCAN-M35 的覆盖说明实现，契约未改。README 记录新边界。S2、S4、级别、FNV group_id、ClusterInfo、年龄/保留/保护资格与排序代码未变；公开类型/函数签名、系统函数清单、依赖和锁文件未改。

## 测试覆盖与旧断言

测试文件仍为 `tests/scan_v1.rs`，精确五项：`scan_plan_contract`、`scan_pattern_marker_discovery`、`scan_overlap_and_guards`、`scan_reparse_budget_cancel`、`scan_snapshot_growth_keys`。新增断言放在既有测试调用的辅助函数内，没有 ignore、过滤或新增顶层测试。

- `m35_plan_templates`：工单的六个正例、六个反例逐个测试目录和带扩展名的文件；原例子全部保留，错误带 `SCAN_M35_TEMPLATE`。
- `m35_clusters` 调用新增 `m13_cluster_exclusions`：合成目录/文件的内容仅为占位字节，覆盖工单 a～h；UUID 为确定性、互不相同的标准 UUID 形状，不读取真实会话或资源内容。
- a～f 每个条目都断言没有出现在任何 `leak:` 组中；g 的 `session-<u>`、h 的 `verify-<r6>` 均精确核对 member_count=12、item_count=12、Confirm，group_id 用独立 FNV-1a 计算期望后精确比较。原 `verify-A0000N` 夹具与全部原有断言也保留并通过。
- 增加独立大写 `.JSONL`、混合大小写 `BaK`、同前缀 hash 额外成员中的 backup/UUID 文件、Conversations/chats/TRANSCRIPTS、第四级祖先排除/第五级祖先不排除、`not-sessions` 不因子串被排除等边界。共精确核对七个应保留簇，每组 12 个成员；额外夹具的 `<h>`、`<r6>`、`<p8>` 文件均保留。
- 在被排除的目录里放 `node_modules/keep`，逐个确认普通 marker 目标仍被发现；再以 discovery 入口扫描这些排除位置，确认仍是普通条目而非簇，并核对 `Item.template`（资源文件 `icon_type_color0.png` 为 None）。
- `m35_clusters` 调用新增 `m13_installer_patterns`：直接经扫描计划的 file_name marker 使用 M12 三模式、max_depth=3、DLL 条件，逐个核对四个安装程序命中、八个工具/卸载程序不命中；旁边有 `a.dll` 的 `Tool-setup.exe` 不命中，总命中数精确为 4，标记 `SCAN_M35_RULES`。没有依赖 M12 的工作树或修改本树的规则数据。

**旧断言迁移：无。** 没有修改旧断言值、失败标记、时限或忽略策略。

夹具全部通过本树现有 `Fixture` 在 `.local/w2-b-fixtures/fx-<pid>-<nonce>` 新建。沿用其父目录/前缀校验与 Drop 清理，只清理该次新建的合成目录；没有删除真实文件或清理其它工作树。检查结束后只读核对，夹具父目录下剩余合成目录数为 0。

## 检查命令与结果

全部 gate 在 M13 工作树根运行。下表时间为 UTC；子命令与退出码、完整日志、源文件快照见对应 JSON。普通成功门 exit 0；有效负控门 exit 0、内部 cargo test exit 101。03:48:36 的 test 是修复前预期红（门 exit 1、cargo exit 101），不是最终失败。

| 回执文件 | 命令 | 结果 |
|---|---|---|
| `2026-11-07T03-03-15.661Z-9728-baseline-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode baseline` | passed |
| `2026-11-07T03-45-21.895Z-23828-baseline-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode baseline` | passed |
| `2026-11-07T03-48-09.364Z-28352-lock-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode lock` | passed |
| `2026-11-07T03-48-36.754Z-18004-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode test` | failed |
| `2026-11-07T03-50-45.236Z-21612-check-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode check` | passed |
| `2026-11-07T03-51-19.880Z-2096-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode test` | passed |
| `2026-11-07T03-53-37.687Z-28452-red-nc1-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode red-nc1` | passed |
| `2026-11-07T03-53-48.349Z-29628-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode test` | passed |
| `2026-11-07T03-53-59.096Z-20616-red-nc2-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode red-nc2` | passed |
| `2026-11-07T03-54-06.849Z-12476-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode test` | passed |
| `2026-11-07T03-54-16.273Z-34588-red-nc3-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode red-nc3` | passed |
| `2026-11-07T03-54-25.705Z-25968-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode test` | passed |
| `2026-11-07T03-54-35.955Z-28636-check-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode check --final` | passed |
| `2026-11-07T03-54-42.555Z-37584-test-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode test --final` | passed |
| `2026-11-07T03-54-50.382Z-9280-real-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode real --final` | passed |
| `2026-11-07T03-55-59.689Z-20140-archive-result.json` | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M13 --mode archive` | passed |

03:03 的 baseline 是派前已有记录，不是本执行者新跑的。03:45 baseline 是本次开工检查。修复前红以 `SCAN_M35_CLUSTERS` 捕获 `icon_type_color0.png` 误入簇，并以 `SCAN_M35_TEMPLATE` 捕获 `verify-color0` 被识别为 `<r6>`；3 通过、2 失败。修复后五项完整测试全部通过。

格式化仅使用已安装 Rust 1.95.0 的 rustfmt（edition 2024）；check 包含格式、依赖/源码政策、Clippy `-D warnings`。每次启动检查前按进程名查看 cargo/rustc/clippy-driver；忙时等待，未结束或改动他人进程。所有构建由指定检查器配置离线、jobs=1、私有 Cargo home 与 `junk-scan` target。没有计时失败、超时重试或时限放宽。

## 三条有效负控

每次只改一处生产逻辑，测试文件字节不变；红后立即 `git checkout -- <对应文件>` 恢复，核对 SHA-256，再跑完整五测变绿，才进行下一条。

| 负控 | 唯一变异 | 实测失败 | 红回执 → 恢复绿回执 |
|---|---|---|---|
| nc1 | templates.rs 的大写条件改为“大写或数字”，重新接受只有小写与数字的尾巴 | `SCAN_M35_CLUSTERS` 捕获 color0 误入；`SCAN_M35_TEMPLATE` 捕获 verify-color0；3 通过、2 失败 | `2026-11-07T03-53-37.687Z-28452-red-nc1-result.json` → `2026-11-07T03-53-48.349Z-29628-test-result.json` |
| nc2 | scan.rs 共用函数的文件尾巴排除中去掉 `<u>`，保留 `<d>` | `SCAN_M35_CLUSTERS` 捕获帮助目录 UUID PNG 误入；4 通过、1 失败 | `2026-11-07T03-53-59.096Z-20616-red-nc2-result.json` → `2026-11-07T03-54-06.849Z-12476-test-result.json` |
| nc3 | scan.rs 共用函数中删除父目录及四级祖先会话名检查 | `SCAN_M35_CLUSTERS` 捕获 work/sessions/x/y/run-UUID 误入；4 通过、1 失败 | `2026-11-07T03-54-16.273Z-34588-red-nc3-result.json` → `2026-11-07T03-54-25.705Z-25968-test-result.json` |

恢复后 SHA-256：

- `src/templates.rs`：`5e66a75886b877e3816ba509ebe5b69dbb22c0855aa64e120abc9c15fc3fb72c`。
- `src/scan.rs`（nc2、nc3 相同）：`d6c961228ad76cf85d19d0d341d7ed00c4b054d4f0f0c6976ee641c6090775bc`。

nc3 删除检查后使 parent 参数暂时未用，cargo test 有 unused-variable 警告，但编译成功，失败确由上述产品行为断言产生；恢复后的最终 Clippy 无警告。

三个 final 都在干净的 `0cdff543826ee37b76b5e54b9a6b0271e9df74fe` 上运行，前后 HEAD 不变，productionHash 为 `e35ac3434bd9a9e812886a2a1e2efeeab1bac6a62ddcdf3555968481b2c6b9e9`，testHash 为 `c7deed944e4102cdbe6977f72244cc5921f1973a88c5e65918a9f03b79e6d08a`。test final 的 proofAudit 精确绑定以上三组红/绿，五项测试全部通过，0 ignored、0 filtered out。

## 真实冒烟与证据

`real --final` 一次通过，普通 scan、含三种 extras 的 scan_full 和用户目录空间概览均为 completed。输出只有组级统计与计数，没有真实路径、文件名或进程命令行，没有读取真实文件内容。

| 步骤 | 实际结果 |
|---|---|
| 普通 scan | 271,543 个访问条目，12 组，10,596 ms |
| scan_full | 271,543 个访问条目，19 组，10,120 ms；7 个簇均 Confirm，0 Advisory；23 个联接引用，0 声明位置 |
| 两种扫描的 issue | 各有 reparse_skipped 两组计数 1、3；不跟随重解析点 |
| 空间概览 | 670,861 个访问条目，573,668 个文件，43,128 ms；disk_bytes=107936160504，total_bytes=107521333195；top_count=10、others_count=229、others_disk_bytes=7401005952；issues 为空 |

这些数字仅代表检查器冻结计划的本次只读冒烟；没有重跑收口报告里 D 盘/工具目录的 58 簇复验，不能拿 7 与 58 直接比较，也不能据此声称全设备误判已清零。此次不执行真实清理。

`archive` 通过，索引 `docs/acceptance/wave10/m13/ARCHIVE.json` 收录 279 个证据文件，共 4,881,337 字节。逐文件核对 SHA-256，保留修复前红、全部负控、恢复与 final。archive 自身回执在 `.local/checks/WATER-W10-M13/2026-11-07T03-55-59.689Z-20140-archive-result.json`，因运行结束才写出，不为收录自身再次归档。回执以 UTF-8 写入并完整读回检查。

## 未做与未验证

- macOS、M12/M13/M14 主线整合和真实应用清理未验证；本树从原基线独立实现，不合入其它执行者代码。
- 没有新增系统调用、依赖或公开接口，没有修改规则包、服务包、执行器、契约、检查器或台账。
- 没有网络访问、依赖下载、窗口、浏览器或选择框，没有真实删除；没有 push、merge、rebase、reset、amend 或修改 Git 配置/远端。
- 完成仅为交回，等待总控验收；未自行记为 VERIFIED。回执/证据提交后停止本票测试及自有后台进程。
