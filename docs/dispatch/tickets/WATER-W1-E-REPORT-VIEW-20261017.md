# WATER-W1-E：独立报告展示投影

总控：Codex。日期：2026-10-17。正式状态看主检出manifest。E与D补单01独立并行，仅依赖已验收A/C；不实现扫描器或桌面接线。

当前更新：E已通过单票及隔离集成复验，接收HEAD `b285a0e15f6e514b0e90e793ab83f63f85db05d9`，VERIFIED（Windows范围）。见[总控验收报告](../../acceptance/wave1/controller/WATER-W1-E-REVIEW-20261017.md)。以下为历史执行票面，不再外贴重做。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-E-REPORT-VIEW-20261017.md` |
| 唯一工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/e` / `worker/water-w1-e` |
| 精确基线 | `1fce65323daf79c9f74ff84d86883692e4cb1b3e`，tag water-w1-report-view-base-20261017 |
| 冻结协议 | `contracts/report-view-v1/`，19项freeze.lock.json；A/C等旧锁不变 |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| helper / 纪律 | `scripts/report-view-check.mjs` / `docs/dispatch/W1-REPORT-VIEW-WORKER-RULES.md` |
| 回执 | `F:/new/smaltalk/water/.worktrees/e/docs/dispatch/reports/WATER-W1-E-REPORT.md` |
| 证据 | 本树`docs/acceptance/wave1/e/`，原始日志`.local/checks/WATER-W1-E/` |
| Cargo状态 / 输出 | 本树`.local/report-view-cargo-home`、`.local/report-view-target`、`.local/report-view-tmp` |

## 开工

先读主检出README/STATUS/AGENTS/工作流、本票、E纪律、ADR-005、report-view-v1全部冻结材料、A的SEMANTICS及C的SPEC/model。工作树来自架构基线，票面/登记随后才加到主检出；旧STATUS不是派单实况，不merge主线取票，不改旧文档。

核对绝对路径、分支、精确HEAD、初始干净及19冻结；不符保存现场交受阻回执，不切树/重置/覆盖。首次只运行：

```powershell
node scripts/report-view-check.mjs --task WATER-W1-E --mode baseline
```

baseline只核对分配/冻结、已装Node24/Rust1.95/MSVC、链接探针与根A metadata；包尚不存在，不是五产品测试通过。helper只从已验收A树的`.local/cargo-home/registry`复制已锁定依赖缓存至E自己的.local；这是总控指定的项目内只读缓存源，不授权读取其他文件或凭证。没有fetch/安装/全局配置变更权限。

## 实现与文件范围

按SPEC实现water_report_view::v1的project_json、project_report、ReportView和FindingView。原始JSON调用A parse_report，DTO调用A validate_report；来源状态/证据/保护/容量原样保留。新view版本与C demo版本不同，tool筛选键遵守不碰撞编码。

唯一可新建/修改：

- `packages/report-view/Cargo.toml`、`Cargo.lock`、`README.md`。
- `packages/report-view/src/`内Rust实现。
- `packages/report-view/tests/view_v1.rs`，精确五个顶层测试。
- 本票REPORT及`docs/acceptance/wave1/e/`内文本/JSON证据；冻结.gitattributes不可改。

独立[workspace]、version0.1.0、resolver3、edition2024、Rust1.95、publish=false。只有lib和view_v1测试目标，无CLI/build/example/bench。只用本地A、固定serde/serde_json与根锁已有registry版本；不改根Cargo/锁或旧产品。serde/serde_json不得用本地同名包或其他来源替换。

不建扫描器/分类器/导出器/IPC，不改C app或demo-data，不读文件/环境/网络作为生产逻辑。src中不能硬编码fixture或按scan_id返回expected。测试可读本包与冻结合成材料，但没有D物理fixture权限、真实用户数据权限或清理入口。

## 定向测试和命令

先准备可编译骨架、manifest和唯一测试文件，再离线生成自己的锁：

```powershell
node scripts/report-view-check.mjs --task WATER-W1-E --mode lock
node scripts/report-view-check.mjs --task WATER-W1-E --mode fmt
node scripts/report-view-check.mjs --task WATER-W1-E --mode test
node scripts/report-view-check.mjs --task WATER-W1-E --mode clippy
node scripts/report-view-check.mjs --task WATER-W1-E --mode metadata
node scripts/report-view-check.mjs --task WATER-W1-E --mode bridge
```

严格五测试：view_projection、view_validation、view_precision_and_totals、view_preservation_and_purity、view_mapping_edges。覆盖四golden、66原报告、原6raw/新增6raw、四个从base独立生成的手工DTO及SPEC边界；不能忽略/过滤或新增第六测试。

bridge会构建真实E库，运行冻结Rust程序投影合成报告并Serialize，再调用现有C纯模型。不能把expected JSON替代真实输出；无需浏览器，不是UI接线。全部门一次一个检查，Cargo jobs=1、每Cargo命令180秒，禁止全仓/coverage/watch或放宽门槛。helper不是OS沙箱。

## 先红、负控与交付

先用真实目标断言留下编译成功后的行为红；缺文件/编译失败不算。按SPEC完成三项真实负控：跳过DTO校验、字节经f64丢精度、未知总量改0；分别完整test命中目标断言失败，记录原/坏/恢复三哈希及日志。逐文件原字节恢复后完整test通过，不改测试或fixture造红，不清理.local掩盖现场。

实现、测试和必要首轮证据提交后，在同一干净实现SHA串行执行：

```powershell
node scripts/report-view-check.mjs --task WATER-W1-E --mode fmt --final
node scripts/report-view-check.mjs --task WATER-W1-E --mode test --final
node scripts/report-view-check.mjs --task WATER-W1-E --mode clippy --final
node scripts/report-view-check.mjs --task WATER-W1-E --mode metadata --final
node scripts/report-view-check.mjs --task WATER-W1-E --mode bridge --final
```

后加报告/日志提交只含证据，不夹带产品或测试变化。报告写完整受测SHA、逐项需求、五final receipt、实际Rust→JSON→C链路、先红/三负控/恢复、全部失败、越界申请和实际模型。没有macOS实测就写未验证。日志原字节复制，.log显式git add -f指定文件；不用批量add。

如缺Git身份，仅用单命令Water Worker (external)/water-worker@localhost，禁hooks/签名，不改global。无push/merge/rebase/发布权限。内部辅助若使用只读且记回执，不再分派实现。

完成通知与报告第一行：

```text
WATER-W1-E 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/e/docs/dispatch/reports/WATER-W1-E-REPORT.md
```

受阻改“任务受阻”，保存现场并列最小补充需求。交回后停止，由总控收单复测；视图投影通过不等于真实扫描、脱敏导出或桌面应用完成。
