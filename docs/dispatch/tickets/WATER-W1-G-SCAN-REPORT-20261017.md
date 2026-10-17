# WATER-W1-G：保守扫描报告组装

总控Codex，2026-10-17。与F/H/I并行，依赖已VERIFIED的A/E及冻结F JSON协议，不等待F产品、不改F。状态以主检出manifest为准。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-G-SCAN-REPORT-20261017.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/g` / `worker/water-w1-g` |
| 精确基线 | `045ab4f0d01edd573828fbc8cca988e1ad37efee` |
| tag | `water-w1-parallel-next-base-20261017` |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 协议 / 锁 | `contracts/scan-report-v1/` / `contracts/parallel-next-v1/freeze.lock.json`（36项新冻结，并核五旧锁的58唯一文件） |
| helper | `scripts/parallel-next-rust-check.mjs` |
| 回执 | `F:/new/smaltalk/water/.worktrees/g/docs/dispatch/reports/WATER-W1-G-REPORT.md` |
| 证据 / 私有构建 | `docs/acceptance/wave1/g/` / `.local/checks/WATER-W1-G`、`.local/g-cargo-home`、`.local/g-target`、`.local/g-tmp` |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、本票、ADR-007、W1-PARALLEL-NEXT-WORKER-RULES、G全部契约及A SEMANTICS、F SPEC第4节和E SPEC。执行树早于票面/登记，读主检出权威票即可，不merge取票、不改历史文档。核路径/分支/精确HEAD/初始干净/冻结，不符保留现场交受阻回执，不重置/切树。

开工只先运行：

```powershell
node scripts/parallel-next-rust-check.mjs --task WATER-W1-G --mode baseline
```

baseline核Node24/Rust1.95/MSVC及真实A/E合成资产投影，不是G/F产品测试。只从已验收A树`.local/cargo-home/registry`复制锁定缓存到自己的Cargo home，不安装/fetch/读其它凭证文件或改全局。总控已准备17个G合成golden及2raw/10变体、实际E expected视图；合成macos字段不等于macOS IO实测。

按SPEC实现纯内存assemble_json和私有ReportBundle。完整source_facts sidecar保留身份/kind/depth及issue来源，报告全unknown/protected，按段传播保护祖先，总容量未知；显式context仅为报告声明，不授权路径访问。不读文件/环境/网络/时钟，不依赖F crate、不分类、不求和/去重回收、不做E/页面/IPC生产接线。

唯一允许改：packages/scan-report/Cargo.toml、Cargo.lock、README.md、src/内Rust、唯一tests/report_v1.rs；本票REPORT及docs/acceptance/wave1/g内原字节证据（冻结.gitattributes不改）。独立workspace、固定三依赖、无unsafe/dev/build/bin；不改根Cargo、A–F、H/I、旧helper/冻结/上游或主线登记。

准备可编译骨架及唯一五测试后依次运行：

```powershell
node scripts/parallel-next-rust-check.mjs --task WATER-W1-G --mode lock
node scripts/parallel-next-rust-check.mjs --task WATER-W1-G --mode fmt
node scripts/parallel-next-rust-check.mjs --task WATER-W1-G --mode test
node scripts/parallel-next-rust-check.mjs --task WATER-W1-G --mode clippy
node scripts/parallel-next-rust-check.mjs --task WATER-W1-G --mode metadata
node scripts/parallel-next-rust-check.mjs --task WATER-W1-G --mode bridge
```

精确五测试：report_strict_input、report_coverage_and_issues、report_conservative_findings、report_size_identity_and_overlap、report_public_roundtrip。覆盖原始严格解析/计数/上下文、覆盖/取消/注入来源、保守保护及祖先边界、字节精度/完整sidecar/重叠scope、输出体积超限与输入不变。bridge实际G→A JSON往返→E投影核17正例，并独立检查2raw+10变体；不调用F，不用expected冒充输出。

先留下可编译的目标行为红，再完成SPEC三个有效负控：last-wins解析、无后代叶项错误降为cache/low/native无保护、totals错误逐文件求和。每项完整五测试必须命中目标断言，三hash/原字节恢复/mtime更新后五测绿，编译/缺文件/超时不算。不得改测试造红或清理现场。

每线一次一个门，Cargo jobs1/离线、每命令180秒。与F/H并行构建可各一条，禁止整仓/watch/coverage或修改helper。实现/测试提交干净后，在同一SHA将上述fmt/test/clippy/metadata/bridge各加`--final`再串行执行；lock无final。后加报告/日志只含证据，不夹未复测产品。

REPORT写受测SHA、需求/实际差异、全部失败、五final receipt、真实桥接数量/12拒绝、三负控/恢复、原始快照hash、实际模型及未验证平台。日志显式点名git add -f；禁止批量add、push/merge/rebase/发布。只读辅助可用并记回执，不再分派实现者。受阻保存现场，最小需求交总控。完成后提交本分支并停止修改；报告第一行和通知：

```text
WATER-W1-G 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/g/docs/dispatch/reports/WATER-W1-G-REPORT.md
```
