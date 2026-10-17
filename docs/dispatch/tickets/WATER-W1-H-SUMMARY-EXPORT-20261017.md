# WATER-W1-H：白名单汇总导出

总控Codex，2026-10-17。仅依赖VERIFIED的A，与F/G/I独立并行；状态以主检出manifest为准。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-H-SUMMARY-EXPORT-20261017.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/h` / `worker/water-w1-h` |
| 精确基线 / tag | `045ab4f0d01edd573828fbc8cca988e1ad37efee` / `water-w1-parallel-next-base-20261017` |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 协议 / 锁 | `contracts/summary-export-v1/` / `contracts/parallel-next-v1/freeze.lock.json`（36项新冻结，并核五旧锁58唯一文件） |
| helper | `scripts/parallel-next-rust-check.mjs` |
| 回执 | `F:/new/smaltalk/water/.worktrees/h/docs/dispatch/reports/WATER-W1-H-REPORT.md` |
| 证据 / 私有目录 | `docs/acceptance/wave1/h/` / `.local/checks/WATER-W1-H`、`.local/h-cargo-home`、`.local/h-target`、`.local/h-tmp` |

先读主检出README/STATUS/AGENTS/工作流、本票、ADR-007、W1-PARALLEL-NEXT-WORKER-RULES、H SPEC/cases及A SEMANTICS。执行树基线早于票面/登记，读取主检出权威材料，不merge取票。核路径/分支/精确HEAD/干净/冻结，不符保留现场交受阻回执，不重置/切树。

首次仅运行：

```powershell
node scripts/parallel-next-rust-check.mjs --task WATER-W1-H --mode baseline
```

baseline只核工具链/锁/实际已验收A/E合成资产，不是H或F行为测试。只读A树`.local/cargo-home/registry`为缓存源，复制至H私有目录，不安装/fetch/改全局或读其它凭证文件。11个正例已过真实A校验，涵盖所有类别/风险、完整标识/文本canary、来源37、u64max/u32max/null。

按SPEC实现summarize_json和summarize_report，先走真实A校验，再用明确结构构造固定白名单计数/来源totals。禁止复制原Value后删字段、动态键/样例行/路径/ID/工具/证据/引用/message/hash。总量原样保留，不求和、不null→0。去除直接标识/文本不等于匿名不可关联，不承诺可安全公开。生产仅内存，不写文件/环境/网络/进程，不做上传/UI。

唯一允许改：packages/summary-export/Cargo.toml、Cargo.lock、README.md、src/内Rust、唯一tests/export_v1.rs；本票REPORT和docs/acceptance/wave1/h内证据，冻结.gitattributes不改。自有workspace/锁、仅A和固定serde/serde_json，无unsafe/dev/build/bin，不改根Cargo/A–G/I/旧helper/锁/上游/登记。

可编译骨架和五测试准备后依次运行：

```powershell
node scripts/parallel-next-rust-check.mjs --task WATER-W1-H --mode lock
node scripts/parallel-next-rust-check.mjs --task WATER-W1-H --mode fmt
node scripts/parallel-next-rust-check.mjs --task WATER-W1-H --mode test
node scripts/parallel-next-rust-check.mjs --task WATER-W1-H --mode clippy
node scripts/parallel-next-rust-check.mjs --task WATER-W1-H --mode metadata
node scripts/parallel-next-rust-check.mjs --task WATER-W1-H --mode bridge
```

精确五测试：export_whitelist、export_validation、export_precision_and_totals、export_counts_and_status、export_invariance_and_purity。包含A原66/6raw、手工非法DTO、完整白名单/canary、精度/来源容量/零桶与状态、文本/一致ID双射/顺序变化不影响输出。bridge调用H两入口核11正例与6raw+6DTO的错误和A完全相等，不能用expected代替实际序列化。

先真实可编译行为红，三个有效负控：跳过DTO A验证、真实SummaryExport泄漏scan_id、未知总量改0。各完整五测试命中目标断言，记原/坏/恢复三hash，原字节恢复/mtime更新后完整五测绿；编译/缺文件/超时不算，禁改测试造红或清理。

每线一个检查、jobs1/离线/每命令180秒；F/G/H可各一条，不跑整仓/watch/coverage。实现/测试干净提交后，在同一受测SHA将fmt/test/clippy/metadata/bridge各加`--final`串行执行。后加报告仅证据/文档，不夹未复测产品。

回执写受测SHA、需求逐项、全部失败、五final receipt/11正例12拒绝、白名单canary、三负控及恢复、实际模型/未验证平台。原始日志点名add（.log需-f），禁批量add/push/merge/rebase/发布；只读辅助记回执，不再分派实现。受阻保存现场列最小补充需求；完成提交本分支后停止。报告第一行和通知：

```text
WATER-W1-H 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/h/docs/dispatch/reports/WATER-W1-H-REPORT.md
```
