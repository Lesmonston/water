# WATER-W1-A 派前验收与交接

日期：2026-10-17。总控：Codex。结论：READY，等待用户外贴；尚未启动实现者。

## 已准备

- 架构基线提交：`a1e68364d47e137f8b66543eb95d35bb04424c78`，tag `water-w1-base-20261017`。
- 工作树：`F:/new/smaltalk/water/.worktrees/a`，分支 `worker/water-w1-a`，HEAD等于基线，tracked/untracked均干净（.local仅工具状态）。
- 正式票面、manifest、执行纪律、回执父目录及证据目录已存在。worker读主检出的权威票，不merge主线。
- 9个契约/验收文件冻结哈希与工作树匹配；Schema、语义和原始输入材料已由总控检查及只读辅助复核。

## 实际执行的派前检查

1. `node scripts/worker-check.mjs --preflight`：主检出Rust/Cargo 1.95.0、MSVC链接运行探针成功。
2. 在分配工作树执行 `node scripts/worker-check.mjs --task WATER-W1-A --mode baseline`：分支、精确基线、洁净状态、9项冻结哈希和工具链探针通过，前后同一SHA且状态干净。证据见 `docs/acceptance/wave1/controller/w1-a-initial-baseline.json`。
3. 两树的`node scripts/verify-contract-assets.mjs`通过：66组报告输入（16正向、27结构拒绝、23语义输入），6组raw JSON、6组手工DTO、2组资源边界材料；仅资产/结构检查，不是Rust实现行为通过。
4. 在错误的主检出请求本票test模式，helper以exit 1拒绝“Wrong assigned worktree”，没有进入Cargo。
5. 文档链接、JSON、源码研究固定来源和diff空白检查通过。实际Rust Cargo模式、5个合同测试及负控等待执行者实现后运行，不能写已通过。

## 分工与下一步

只发WATER-W1-A：Rust workspace与water-contracts、序列化/验证和定向测试；不含扫描、删除、UI或真实用户数据。

用户使用PASTE.txt中的一行指令安排执行者。用户告知已贴或出现启动证据后才能将状态改DISPATCHED/RUNNING。回执回来后总控核实SHA、diff、范围和有效测试，再复跑、抽查独立输入与集成；未验收前不发依赖它的扫描/分类/报告任务。

没有改变全局PATH、默认Rust工具链或其他项目，没有安装依赖、运行上游程序或真实清理。macOS未验证。当前只有架构与验收材料，Water产品Rust代码尚未提交。
