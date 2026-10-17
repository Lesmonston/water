# WATER-W1-J：受控扫描会话库

总控Codex，2026-10-18。当前正式状态以主检出manifest为准；没有READY前不执行。A/F/G/E/H均VERIFIED（Windows范围）。新J产品尚未实现，派前依赖实测不能当作J功能通过。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-J-LAB-SESSION-20261018.md` |
| 唯一树 / 分支 | `F:/new/smaltalk/water/.worktrees/j` / `worker/water-w1-j` |
| 精确基线 | `bc409f4af8cb2d51b2f67341ad46637cfa5e66f3` |
| tag | `water-w1-session-batch-base-20261018-r1` |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 冻结 | `contracts/session-batch-v1/freeze.lock.json`，65新项和六旧锁83唯一文件，合计132唯一文件 |
| helper / 纪律 | `scripts/session-batch-check.mjs` / `docs/dispatch/W1-SESSION-BATCH-WORKER-RULES.md` |
| 回执 | `F:/new/smaltalk/water/.worktrees/j/docs/dispatch/reports/WATER-W1-J-REPORT.md` |
| 证据 / 构建 | 本树`docs/acceptance/wave1/j/`、`.local/checks/WATER-W1-J/`、`.local/j-cargo-home`、`.local/j-target`、`.local/j-tmp` |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、本票、ADR-008、本批纪律、lab-session-v1全部材料、F/G/E/H SPEC及A SEMANTICS。执行树早于本票/登记，直接读主检出权威材料，不merge取票、不改旧文件。核绝对路径/分支/精确HEAD/初始干净和冻结，不符保存现场回受阻，不切树/重置。

首次仅运行：

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-J --mode baseline
```

baseline只构建现有A/F/G/E/H、运行原有真实链路并核Native11/12/39及两个控制场景，J目录必须尚不存在。helper只从A已验证registry复制到本树私有Cargo home，offline/jobs1，不安装/fetch/改global。J派前已准备active index，后续复用；只有冻结prepare可在本J树.local新建一批11正常+6负例，<=24run/1MiB内容，旧run/index保留。Rust生产/测试只读，不手造或改marker/ACL/移动/删除/清理，不读普通payload，不进入其它树fixture、HOME、整盘或真实用户目录。

按SPEC实现五个真实模块的会话组合、同一cancel/observer/options、有界不可变SessionSnapshot和固定错误映射。scan_id只是声明，root仍由F编译时位置限定；默认入口实际装配NativeIo/NoopObserver。不按case/run硬编码结果或注入故障，不读取expected代替计算。完整facts保留，未知保护/容量/来源不变；没有UI/IPC、任意path/shell、分类/去重回收、导出文件或真实授权。

唯一可改：packages/lab-session/Cargo.toml、Cargo.lock、README.md、src/内Rust、唯一tests/session_v1.rs；本票REPORT及docs/acceptance/wave1/j内证据（冻结.gitattributes不改）。独立workspace，明确7依赖和2目标，禁止根Cargo/旧产品/旧helper/锁/上游/台账改动；无unsafe/新包/dev/build/bin/外部分派实现者。

准备完整唯一五测试和可编译骨架，先离线生成本包锁：

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-J --mode lock
node scripts/session-batch-check.mjs --task WATER-W1-J --mode red-behavior
```

red-behavior必须实际跑完五测试、成功编译并命中`J_BEHAVIOR`消息断言，之后再实现。五测试精确session_native_composition、session_cancellation_and_progress、session_errors_and_bounds、session_identity_and_protection、session_snapshot_wire。测试只读helper指定WATER_SESSION_FIXTURE_INDEX，先核它等于本树`.local/checks/WATER-W1-F/active-fixtures.json`；生产不读该环境变量。

实现完成、格式及clippy稳定后先`--mode suite`五测绿，再按SPEC逐一真实源码变异nc1/2/3，分别跑red-nc1/red-nc2/red-nc3；每次立即原字节恢复/更新mtime后跑普通suite完整五测绿。断言消息分别含J_CANCEL_SHARED、J_FACTS_PRESERVED、J_SUMMARY_UNKNOWN。不得更改测试字节或用测试开关/编译/缺文件/超时造红。helper自动保存完整输出、生产和测试源码快照/哈希；final要求每个红在下一次有效红之前有当前源字节的完整恢复suite，行为红也须在首个负控前恢复绿。

定向门：fmt、test、suite、clippy、metadata、bridge。bridge真正构建J，13场景调用J公开入口，与独立现有F/G/A/E/H实际结果逐值比对；44快照保持。单门180秒、offline/jobs1/单测试线程，不跑整仓/watch/coverage。当前Windows执行票；macOS、不可达错误/快照超限分支未实测必须如实写，不为覆盖率改旧库或加测试专用开关。

实现/测试提交后，在同一干净实现SHA串行跑：

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-J --mode fmt --final
node scripts/session-batch-check.mjs --task WATER-W1-J --mode test --final
node scripts/session-batch-check.mjs --task WATER-W1-J --mode clippy --final
node scripts/session-batch-check.mjs --task WATER-W1-J --mode metadata --final
node scripts/session-batch-check.mjs --task WATER-W1-J --mode bridge --final
```

追加证据/报告提交只含文档与原字节证据。复制本任务helper所有json/log/txt（含行为红、三负控、每次恢复、源码快照与final），以及fixture index，不只截断错误摘要；log显式-f逐批明确文件名add，禁git add .。REPORT绑定完整受测SHA，逐项需求、所有失败/退出码、三hash与完整日志、实际引擎模型、scope权限、未验证平台/分支和剩余问题。禁止push/merge/rebase/发布或清理，完成后停止，由总控验收J→K真正页面接线。

报告首行和通知：

```text
WATER-W1-J 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/j/docs/dispatch/reports/WATER-W1-J-REPORT.md
```

受阻改“任务受阻”，保留现场列出最小缺口，不向用户要求扩大数据权限。
