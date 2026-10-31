WATER-W8-K3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k3/docs/dispatch/reports/WATER-W8-K3-REPORT.md

执行者：Codex（GPT-6；当前会话未提供更细模型版本）。分支 worker/water-w8-k3。首次 HEAD 912eba100ba342c3eeb21ba555c6d589b91e6b4f，开工时干净；实现提交 5b4136a3836bec4fd44334bcf6610af258a79ed3。回执与证据单独新增提交。未 merge、rebase、amend、reset、push，未改 Git 配置、远端、台账、契约、检查器、其它包、Cargo.toml 或 Cargo.lock。窗口 0、选择框 0；Cargo 离线、单线程、私有 target。

SPEC 第 1 节已完成：src/plan.rs 接受 runs_from_or_references_item，processes 可以为空。扫描只把 in_use 原样带进组，不检查进程。测试验证新方式、空名单、未知方式拒绝和扫描透传。

SPEC 第 2 节已完成：src/model.rs 的 Item 增加 unique_bytes，Group 增加 unique_bytes、eligible_unique_bytes，均为十进制字符串。src/scan.rs 在每项内部按 (u32 卷序列号, 128 位文件 ID) 集合累计，pattern/discovery 和共用 marker 测量均生效。ID 不可用（含全零）时按完整长度计入，不跨项、不跨组去重；逻辑 total_bytes、file_count、newest_activity、合并、可清理判定和排序保留。非 Windows 枚举不提供 ID，unique_bytes 等于 total_bytes；未宣称 macOS 已验证。

src/native_windows.rs 按目录句柄枚举名字、属性、逻辑长度、修改时间与文件 ID，不逐个打开枚举中的文件。条目自身的 identity_of 保留原有属性句柄。重解析点不进入且计 0 字节；非法 UTF-16 名字不入清单并记 unrepresentable_name；枚举失败记 access_denied。64 KiB 缓冲区用 next offset 继续，检查固定头、名字范围和对齐；仅 ERROR_NO_MORE_FILES 是正常结束；RAII 关闭目录句柄。

result_to_json 总是写三个新字段。result_from_json 只对缺失字段补旧值：Item.unique_bytes = total_bytes；Group.unique_bytes = total_bytes，eligible_unique_bytes = eligible_bytes。显式 null、数字代替字符串及未知键仍被严格类型解析拒绝。结果版本保持 water.scan-result.v1。

SPEC 第 3 节已完成：同一 root（ASCII 大小写不敏感）的所有 marker 使用一个迭代 DFS，每个分支独立保留尚未命中的 target，各自 max_depth 生效；命中只关闭当前 target。命中项测量也在该 DFS 内累计，不重新列子树。搜索不进入 .git 或重解析点；命中项的体量仍按旧测量语义包含它自身的 .git 子项，仓库保护有效。对同一目录只物理枚举一次，但按旧逻辑列表次数向每个 target 复现 issue；visited_entries 只计算实际处理的目录项。预算/取消入口、状态和未完成项丢弃规则沿用，完成项保留。

测试仍精确五个，名字不变，未 ignore 或过滤。tests/scan_v1.rs 相对基线没有删除或替换任何旧行，旧断言修改数为 0。新增断言：

- SCAN_M3C_MODE：新方式、空名单、未知方式拒绝、组内透传。
- SCAN_M3C_UNIQUE：1 MiB 原文件加 3 个 cmd /c mklink /H 硬链接（含子目录），逻辑 4 MiB、去重 1 MiB、文件数仍为 4；普通项相等；跨项不去重；组内全部/可清理求和；advisory 可清理去重为 0；700 个不同文件覆盖多个枚举缓冲区。
- SCAN_M3C_SINGLE_WALK：同根五条 marker，与各 target 单独扫描后的合并预期逐字段比较 items、groups、issues；另独立断言四项的字节数/文件数为 (89,4)、(3,2)、(5,1)、(6,1)。覆盖保守合并、分支停止、独立深度、.git/联接不搜索、非法 Unicode 的逐组 issue 次数，以及 visited_entries ≤ 该树目录项总数 + 5。
- SCAN_M3C_COMPAT：删掉三个新字段的旧 JSON 读回并补齐；真实去重结果往返不变；显式 null 或数字字节被拒绝。

新增系统访问没有增加 FFI 函数名或依赖，只扩展现有函数的使用：

| 函数 | 新增权限或信息类 | 用途 |
|---|---|---|
| CreateFileW | FILE_LIST_DIRECTORY（0x1）；OPEN_EXISTING；全共享 7；BACKUP_SEMANTICS 和 OPEN_REPARSE_POINT | 只打开枚举目录 |
| GetFileInformationByHandleEx | FileIdExtdDirectoryRestartInfo（20）、FileIdExtdDirectoryInfo（19） | 枚举名字/属性/逻辑长度/修改时间/128 位 ID |
| GetVolumeInformationByHandleW | 只取卷序列号 | 组成去重键 |

结构体大小 88、对齐 8、关键偏移都有 const 断言。unsafe 仅在 native_windows.rs，逐块有安全说明。只读扫描目标的名字和元数据，不读其内容、不写、不清理真实数据，也不读取进程命令行。真实冒烟程序仅读取检查器生成的计划文件，输出只有组级数据、状态、访问数与用时。

两条负控均在实现提交后，只改 src/scan.rs 一处，不改测试。每次都立即 git checkout -- packages/junk-scan/src/scan.rs 恢复，再跑完整 --mode test：

- nc1：Engine::listing 的 identity: entry.identity 改为 identity: None，实际遍历失去去重键。scan_pattern_marker_discovery 报 assertion left == right failed: SCAN_M3C_UNIQUE: per-item IDs，4194304 ≠ 1048576。其它四测通过，测试退出 101，检查器认定有效。
- nc2：result_from_json 首个 Value 解析改为先严格解析 ScanResult 再转 Value，从而要求新字段存在。scan_snapshot_growth_keys 报 SCAN_M3C_COMPAT: absent fields default: InvalidResult。其它四测通过，测试退出 101，检查器认定有效。
- 两次恢复的 src/scan.rs SHA-256 均为 764711ee298ed1259fc9c7cb90aa60bf5fd55104f5134f8dfaf2512b09db8afc。恢复绿色 test 的 productionHash 均为 c6f613301853d850974f29eeaa22b8a30db3e9eb0abe48445d91e685ae3b0bfa。final test 的 proofAudit 已检查两条红、立即恢复绿及快照字节。

以下命令都在指定工作树根执行，失败历史完整保留。前两条 baseline 是接手之前已有的控制器派前记录，未冒称为本次执行者所跑。

| 来源 | 命令 | 结果 | 回执 |
|---|---|---|---|
| 继承的派前记录 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode baseline` | 失败：早期 outputRootExists 配置 | [2026-10-31T14-08-55.289Z-13412-baseline-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-08-55.289Z-13412-baseline-result.json) |
| 继承的派前记录 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode baseline` | 通过 | [2026-10-31T14-10-18.972Z-12044-baseline-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-10-18.972Z-12044-baseline-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode baseline` | 通过 | [2026-10-31T14-15-06.602Z-39980-baseline-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-15-06.602Z-39980-baseline-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode lock` | 通过 | [2026-10-31T14-16-42.189Z-38880-lock-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-16-42.189Z-38880-lock-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode real` | 通过 | [2026-10-31T14-17-24.356Z-38708-real-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-17-24.356Z-38708-real-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode check` | 失败：clippy collapsible_if，后已修复 | [2026-10-31T14-21-38.998Z-25896-check-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-21-38.998Z-25896-check-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode test` | 通过 | [2026-10-31T14-22-35.724Z-13724-test-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-22-35.724Z-13724-test-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode check` | 通过 | [2026-10-31T14-23-51.496Z-40356-check-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-23-51.496Z-40356-check-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode test` | 通过 | [2026-10-31T14-24-33.553Z-18720-test-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-24-33.553Z-18720-test-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode red-nc1` | 有效负控：测试退出 101，4 绿 / 1 指定红 | [2026-10-31T14-25-57.064Z-33536-red-nc1-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-25-57.064Z-33536-red-nc1-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode test` | 通过 | [2026-10-31T14-26-23.971Z-23888-test-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-26-23.971Z-23888-test-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode red-nc2` | 有效负控：测试退出 101，4 绿 / 1 指定红 | [2026-10-31T14-27-06.231Z-376-red-nc2-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-27-06.231Z-376-red-nc2-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode test` | 通过 | [2026-10-31T14-27-46.760Z-3404-test-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-27-46.760Z-3404-test-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode check --final` | 通过 | [2026-10-31T14-28-05.549Z-18696-check-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-28-05.549Z-18696-check-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode test --final` | 通过 | [2026-10-31T14-28-49.043Z-41344-test-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-28-49.043Z-41344-test-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode real --final` | 通过 | [2026-10-31T14-29-03.860Z-10672-real-result.json](../../acceptance/wave8/k3/receipts/2026-10-31T14-29-03.860Z-10672-real-result.json) |
| 本次 | `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode archive` | 通过 | [2026-10-31T14-29-47.318Z-23264-archive-result.json](../../../.local/checks/WATER-W8-K3/2026-10-31T14-29-47.318Z-23264-archive-result.json) |

首个 check 仅因 clippy collapsible_if 失败，改为 let-chain 后通过，未放宽 lint。额外检查 git diff --check 通过；测试文件无移除行，Cargo.toml/Cargo.lock 相对基线无差异。测试的随机 fx-* 夹具仅在本树 .local/w2-b-fixtures/，清理只针对各次新建目录及内部联接；交付前该父目录没有剩余子目录。没有未结束的测试或扫描进程。

真实只读基线：2026-10-31T14-17-24.356Z-38708-real-result.json；final：2026-10-31T14-29-03.860Z-10672-real-result.json，两次均 completed。基线访问 418537 项，final 访问 422200 项，增加 3663 项。旧例子没有独立扫描用时：基线整个 real 门 157301 ms，其中编译日志为 37.85 s，不能将相减结果精确当作扫描时间。新例子测得扫描 29203 ms，final 整门 35591 ms。前后编译缓存、并发磁盘负载、真实文件都不同，不宣称严格性能倍数。冻结真实计划只有 pattern/discovery；marker 一次遍历由合成夹具证明，未用真实整盘作性能验证。

下面是 final 的全部 12 组汇总，字节均为十进制字符串。基线总量列用于对比；旧程序没有去重字段。

| group_id | level | 项数 | 可清理项数 | 基线 total_bytes | final total_bytes | final eligible_bytes | final unique_bytes | final eligible_unique_bytes | issues |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| codex-marketplace-staging | recommended | 229 | 1 | 7772421997 | 7772421997 | 0 | 7772421997 | 0 | reparse_skipped:1 |
| claude-desktop-old-versions | recommended | 3 | 2 | 1323182888 | 1323182888 | 661371350 | 1323182888 | 661371350 | 无 |
| claude-code-sessions | protected | 1 | 0 | 7828140920 | 7828140920 | 0 | 7828140920 | 0 | 无 |
| claude-code-scratchpad | confirm | 39 | 1 | 1360748713 | 1360748713 | 1326 | 1360748713 | 1326 | 无 |
| chrome-cache | recommended | 8 | 8 | 2279915064 | 2279242476 | 2279242476 | 2279242476 | 2279242476 | 无 |
| chrome-login-and-site-data | protected | 9 | 0 | 11539791 | 11539274 | 0 | 11539274 | 0 | 无 |
| electron-app-cache | recommended | 15 | 14 | 231300674 | 231300674 | 227958755 | 231300674 | 227958755 | reparse_skipped:3 |
| installer-unpack-temp | recommended | 9 | 9 | 2039147346 | 2039147346 | 2039147346 | 2039147346 | 2039147346 | 无 |
| npm-cache | recommended | 1 | 0 | 3483207403 | 3483206351 | 0 | 3483206351 | 0 | 无 |
| crash-dumps | recommended | 10 | 10 | 209524765 | 209524765 | 209524765 | 209524765 | 209524765 | 无 |
| system-temp-old | recommended | 10163 | 535 | 5864119092 | 5955707420 | 154779433 | 5955677748 | 154779433 | 无 |
| user-temp-old | recommended | 20 | 9 | 19199341 | 19199341 | 32149 | 19199341 | 32149 | 无 |

两次真实扫描之间有以下旧字段变化，其余组的这几项一致。真实数据未冻结，活动时间和年龄判定也可能变化；没有导出逐项路径或结果作额外诊断，不据此宣称逐项结果相等：

- chrome-cache：eligible_count: 7 → 8；total_bytes: 2279915064 → 2279242476；eligible_bytes: 1885391615 → 2279242476。
- chrome-login-and-site-data：total_bytes: 11539791 → 11539274。
- npm-cache：total_bytes: 3483207403 → 3483206351。
- system-temp-old：item_count: 10168 → 10163；eligible_count: 534 → 535；total_bytes: 5864119092 → 5955707420；eligible_bytes: 154740003 → 154779433。

final 的 system-temp-old 逻辑与去重相差 29672 字节；其它组本次两者相等。两次 issues 相同：codex-marketplace-staging 的 reparse_skipped 为 1，electron-app-cache 为 3，其余无 issue。去重体量不等于可释放空间承诺。

归档器复制 245 个文件、2429477 字节到 docs/acceptance/wave8/k3/。ARCHIVE.json 的每项 SHA-256 与字节数已逐项复算，全部一致；归档 .gitattributes 保持原字节。archive 自己的当次 receipt 按检查器时序在 .local/checks/WATER-W8-K3/，其余索引内检查回执、日志及源快照已归档。

未做或未验证：macOS/Linux 编译与运行、非 NTFS 文件系统实际 ID 不可用情况、真实权限拒绝目录、生产竞态、真实整盘、K1/K2/K4/K5/K6 跨包集成、桌面 UI、真实删除或释放空间。未运行项目外脚本、下载依赖、创建符号链接或自动启动子代理。本次结论限于本票 Windows 实现、合成测试与一次 final 真实只读扫描通过，等待总控独立验收。
