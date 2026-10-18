# WATER-W1-M：容量观察账本

归档状态（2026-10-18）：本票已VERIFIED（Windows受控内存范围），不再外贴或从r1重做；以下原票面为历史，当前以manifest及[总控验收报告](../../acceptance/wave1/controller/WATER-W1-LM-REVIEW-20261018.md)为准。

总控Codex，2026-10-18。正式状态以主manifest为准，只有READY后执行。与L及K补单独立，无L输出或K页面依赖。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-M-SIZE-LEDGER-20261018.md` |
| 唯一工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/m` / `worker/water-w1-m` |
| 精确基线 | `82e158079066bf795fb89fafa933bc2d7fc00bd5` |
| tag | `water-w1-evidence-batch-base-20261018-r1` |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 冻结 | `contracts/evidence-batch-v1/freeze.lock.json`，38项/继承七旧锁132唯一文件，合计151唯一文件 |
| helper / 纪律 | `scripts/evidence-batch-check.mjs` / `docs/dispatch/W1-EVIDENCE-BATCH-WORKER-RULES.md` |
| 回执 | `F:/new/smaltalk/water/.worktrees/m/docs/dispatch/reports/WATER-W1-M-REPORT.md` |
| 证据 / 临时 | 本树`docs/acceptance/wave1/m/`、`.local/checks/WATER-W1-M/`、私有`.local/evidence-{cargo-home,target,tmp}` |

先读主检出README/STATUS/AGENTS/工作流、本票、ADR-009、本批纪律、evidence-batch-v1 COMMON/TESTS、size-ledger-v1 SPEC/cases、G SPEC及A语义。权威票面/登记在主检出，直接读，不merge取票。首次核精确路径/分支/HEAD/干净/151冻结与输出尚不存在；不符保留现场受阻，不重置或切树。

首次仅运行：

```powershell
node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode baseline
```

baseline只核已验收A/G、Node24/Rust1.95/MSVC及25份合成输入/11个错误，不测试不存在的M/L。禁止安装、fetch、运行prepare-evidence-assets或总控runner。

## 实现目标

独立packages/size-ledger，water-size-ledger / water_size_ledger / pub mod v1，analyze_json/to_json与SizeLedger按共同约束。原始JSON先交真实G.assemble_json，严格保留G错误；不能先重序列化去掉重复键。

仅已记录File参与大小与身份分组；字节用u128 checked整数累加后输出规范十进制字符串，允许两个u64最大值之和36893488147419103230。不经浮点、u64回绕/饱和或A ByteCount收窄。Directory/Link/Other逻辑未知不当0B文件，Directory Unix身份也不参加File分组。

在同一次输入的可信身份域中按(device,inode)分组：首次遇到顺序、entry_refs原序、字节/link_count去重后数值升序。长度或link_count冲突时整组conflicting/null，不能取任意代表值。Unknown File保持逐条记录，不按同名/同长度/相对路径/重叠scope合并。Windows事实身份Unknown，人工Unix样本只证明算法，不声称macOS身份IO实测。

严格实现观察和、已知组和、Unknown观察和、条件成立才有的identity_deduplicated_logical_bytes及两种complete布尔，空观察集合与scope完整性分开。source_facts/source_totals原样clone；volume_unique_allocated_bytes/reclaimable_bytes恒null。身份去重的观察逻辑长度不是卷唯一空间或可释放量，不改旧报告或接L/K。

## 范围、五测试与负控

仅改本树packages/size-ledger/Cargo.toml、Cargo.lock、README.md、src/内Rust文件、tests/ledger_v1.rs；新报告docs/dispatch/reports/WATER-W1-M-REPORT.md和docs/acceptance/wave1/m/新证据（已有.gitattributes冻结不改）。COMMON四依赖、自有workspace/锁、无unsafe/dev/build/bin；不改根Cargo、A–K、helper/冻结/台账/上游或别树。

唯一五顶层：ledger_observed_sizes、ledger_identity_groups、ledger_unknown_and_coverage、ledger_validation、ledger_public_wire_and_purity。精确比较15份golden全部字段与11个source_errors；公开入口实际调用G，原code/field相等。额外内存变体覆盖跨调用run隔离、输入/context不变与无缓存；不能拿golden直接返回或按ID分支。

关键目标断言含M_BEHAVIOR、M_UNKNOWN_IDENTITY、M_INTEGER_PRECISION、M_CONFLICT_UNKNOWN。先完整五测试和可编译骨架，red-behavior有效行为红/完整五测/退出101，再实现、suite五测绿。先完成fmt/clippy使字节稳定，然后依次真实源码负控：

1. red-nc1：将Unknown当可去重/把null去重值提升为观察和，M_UNKNOWN_IDENTITY断言红。
2. red-nc2：真实累加经f64或u64回绕/饱和，M_INTEGER_PRECISION断言红。
3. red-nc3：让冲突组仍提供精确去重值，M_CONFLICT_UNKNOWN断言红。

每次完整五测试，立即原字节恢复后普通suite五测绿，留三hash和全部原始日志/源码快照。测试保持最终同字节，不改helper/skip/减断言/测试开关或坏依赖造红；后续变更需重录受影响恢复链。所有检查走`node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode <mode>`，可用lock/fmt/test/suite/clippy/metadata/bridge/red-behavior/red-nc1/2/3。

提交实现/测试后，同一干净完整SHA串行：

```powershell
node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode fmt --final
node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode test --final
node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode clippy --final
node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode metadata --final
node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode bridge --final
```

offline/jobs1/每子命令180秒，一次一门，无整仓/watch/coverage。baseline不创建物理fixture，本票全程没有真实用户目录、普通内容、文件身份IO、浏览器或扫描/清理权限；.local仅构建/日志，全部缓存/证据保留。

最终归档本票helper所有json/log/txt原字节（不含编译二进制），显式文件名add，日志-f，不批量整目录。新回执写完整受测SHA、15正例/11错误、五测试和五final、全部红/恢复/三hash/失败、数值精度/冲突/Unknown与容量含义、32MiB及不可达错误覆盖限制、实际模型和macOS未验证。后加证据不得夹未复测产品，无push/merge/rebase/发布，交回后停止。

通知及报告首行：

```text
WATER-W1-M 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/m/docs/dispatch/reports/WATER-W1-M-REPORT.md
```
