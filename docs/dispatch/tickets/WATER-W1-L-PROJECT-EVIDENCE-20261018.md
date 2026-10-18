# WATER-W1-L：项目标记证据侧车

归档状态（2026-10-18）：本票已VERIFIED（Windows受控内存范围），不再外贴或从r1重做；以下原票面为历史，当前以manifest及[总控验收报告](../../acceptance/wave1/controller/WATER-W1-LM-REVIEW-20261018.md)为准。

总控Codex，2026-10-18。正式状态以主manifest为准，只有READY后才执行。与M和K补单独立；不等待K实现、不修改旧报告。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-L-PROJECT-EVIDENCE-20261018.md` |
| 唯一工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/l` / `worker/water-w1-l` |
| 精确基线 | `82e158079066bf795fb89fafa933bc2d7fc00bd5` |
| tag | `water-w1-evidence-batch-base-20261018-r1` |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 冻结 | `contracts/evidence-batch-v1/freeze.lock.json`，38项/继承七旧锁132唯一文件，合计151唯一文件 |
| helper / 纪律 | `scripts/evidence-batch-check.mjs` / `docs/dispatch/W1-EVIDENCE-BATCH-WORKER-RULES.md` |
| 新回执 | `F:/new/smaltalk/water/.worktrees/l/docs/dispatch/reports/WATER-W1-L-REPORT.md` |
| 证据 / 临时 | 本树`docs/acceptance/wave1/l/`、`.local/checks/WATER-W1-L/`、私有`.local/evidence-{cargo-home,target,tmp}` |

先读主检出README/STATUS/AGENTS/工作流、本票、ADR-009、本批纪律、evidence-batch-v1 COMMON/TESTS、project-evidence-v1 SPEC/cases、G SPEC及A语义。执行树早于票面和登记，权威材料直接读主检出，不merge取票。首次核绝对路径、分支、精确HEAD、干净状态、151冻结与输出目录尚不存在；不符则保留现场交受阻回执，不重置/切树。

首次只运行：

```powershell
node scripts/evidence-batch-check.mjs --task WATER-W1-L --mode baseline
```

baseline只验证Node24/Rust1.95/MSVC、离线A/G构建、全部25份合成输入和11个原始/语义错误，不测试尚不存在的L/M。无安装、网络或物理fixture；不得运行prepare-evidence-assets或总控验收runner。

## 实现目标

独立packages/project-evidence：water-project-evidence / water_project_evidence / pub mod v1。analyze_json先真实G.assemble_json(raw,context)，错误按COMMON保留原G code/field；输出ProjectEvidence及to_json，字段集合/私有性/错误/32MiB限制按冻结SPEC。不得按case_id/scan_id硬编码expected或先Value重序列化抹去重复键。

仅四种精确、区分大小写的basename规则：package.json、package-lock.json、pyproject.toml、requirements.txt；只有普通File进入候选。同名directory/link/other只计排除数量。finding_id沿全部entry平铺，不按候选重新编号；父路径根空串、Unicode、a与ab、跨scope同路径及coverage完整保留。filename_only、三个未验证布尔、display_only/protected保持，不证明内容格式、工具安装/版本、项目归属或缓存可删。

输出完整source_facts与source_totals原值，无旧G/J/E/H类别/风险/容量变更，无B默认路径展开或真实目录读取。生产纯内存、无环境/磁盘/网络/时钟/日志/进程/CLI/IPC/缓存；不新增UI或接K。

## 文件、测试与红绿

只允许本树：

- packages/project-evidence/Cargo.toml、Cargo.lock、README.md、src/内Rust文件、tests/evidence_v1.rs；
- docs/dispatch/reports/WATER-W1-L-REPORT.md及docs/acceptance/wave1/l/新证据，已有.gitattributes冻结不改。

其余A–K产品、旧/新helper与冻结、根Cargo、台账、上游及其他树只读。Cargo只有显式lib/test及COMMON四依赖，无新包/dev/build/bin/unsafe；锁由`--mode lock`离线生成，不fetch。

唯一五顶层：evidence_candidates、evidence_validation、evidence_coverage_and_paths、evidence_preservation_and_purity、evidence_public_wire。完整比较10份golden全部键值，全部11个source_errors与真实G一致；额外内存变体不代替冻结正例。关键断言要带L_BEHAVIOR、L_FILE_ONLY、L_FILENAME_ONLY、L_SOURCE_TOTALS，使对应有效红可定位；至少一条走真实公开analyze_json/to_json及真实G。

先写完整五测试与可编译骨架，执行red-behavior，完整五测必须真正行为失败、含L_BEHAVIOR、Rust退出101；缺文件/编译/超时不算。再实现、suite五测绿，先完成fmt/clippy调整使字节稳定，然后逐项真实生产负控：

1. red-nc1：把同名非File也输出候选，L_FILE_ONLY断言红。
2. red-nc2：将filename_only升级或format_verified改true，L_FILENAME_ONLY断言红。
3. red-nc3：将输出source_totals.logical_bytes的未知改0，L_SOURCE_TOTALS断言红。

每次只改真逻辑，完整五测试执行，立即原字节恢复后`--mode suite`五测绿；记录原/坏/恢复哈希。测试字节保持一致；后续生产/测试变动须重录相应完整红/恢复链，不修改helper。所有检查均`node scripts/evidence-batch-check.mjs --task WATER-W1-L --mode <mode>`；模式为lock/fmt/test/suite/clippy/metadata/bridge/red-behavior/red-nc1/2/3，不跑全仓或并行多个门。

实现/测试提交后同一干净完整SHA串行：

```powershell
node scripts/evidence-batch-check.mjs --task WATER-W1-L --mode fmt --final
node scripts/evidence-batch-check.mjs --task WATER-W1-L --mode test --final
node scripts/evidence-batch-check.mjs --task WATER-W1-L --mode clippy --final
node scripts/evidence-batch-check.mjs --task WATER-W1-L --mode metadata --final
node scripts/evidence-batch-check.mjs --task WATER-W1-L --mode bridge --final
```

每门offline/jobs1，每子命令180秒；final核完整证据字节与恢复链，bridge真实调用本库和G再比较完整golden。无物理fixture/真实用户目录/内容读取/浏览器权限，.local仅构建与日志，不清理缓存或目录。

最后把本树helper全部json/log/txt原字节归档本票证据目录（不含编译二进制），显式文件名add，log用-f，不批量整个目录。提交回执/证据不夹未复测产品；报告写受测完整SHA、10正例/11错误、五测试/五final、完整红/恢复及三hash、全部失败、32MiB超限/不可达错误实际覆盖限制、实际引擎与模型、macOS/真实scope/页面未验证。Windows通过不代表macOS或M1完成。

无push/merge/rebase或发布权限，不修改其他树；完成后停止，交总控验收。通知及报告首行：

```text
WATER-W1-L 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/l/docs/dispatch/reports/WATER-W1-L-REPORT.md
```
