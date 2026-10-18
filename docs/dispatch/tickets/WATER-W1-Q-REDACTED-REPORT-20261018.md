# WATER-W1-Q：默认脱敏的逐项报告

归档状态（2026-10-18）：VERIFIED（Windows受控范围），原票不再外贴或从基线重做。以下原执行票仅作追溯，当前以manifest和[总控验收报告](../../acceptance/wave1/controller/WATER-W1-PQ-REVIEW-20261018.md)为准。

总控2026-10-18。主manifest为READY后、用户外贴给一个新执行对话才开始；与P独立，仅依赖已验收A/H和冻结报告输入。

| 项 | 唯一值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-Q-REDACTED-REPORT-20261018.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/q / worker/water-w1-q |
| 精确基线 | 34badd897b8983cffbb57e03a9df9e6af52f7b8f |
| tag | water-w1-scope-export-base-20261018 |
| 权威manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/scope-export-v1/freeze.lock.json，51条目/九旧锁198唯一文件，合计227唯一文件 |
| helper / 纪律 | scripts/scope-export-check.mjs / docs/dispatch/W1-SCOPE-EXPORT-WORKER-RULES.md |
| 回执 | F:/new/smaltalk/water/.worktrees/q/docs/dispatch/reports/WATER-W1-Q-REPORT.md |
| 证据 / 临时 | 本树docs/acceptance/wave1/q/、.local/checks/WATER-W1-Q/、.local/next-{cargo-home,target,tmp} |

必读主检出README/STATUS/AGENTS/工作流、本票、ADR-011、本批纪律、scope-export COMMON/TESTS、redacted-report SPEC/cases/inputs/PROVENANCE、真实A/H语义。执行树早于票面/登记，直接读主检出，不merge取票。首次核绝对路径/分支/精确HEAD/干净状态/227冻结和packages/redacted-report尚不存在；不符保留现场写受阻回执，不重置。

首次只运行：

```powershell
node scripts/scope-export-check.mjs --task WATER-W1-Q --mode baseline
```

总控已在本树实跑，执行者重复确认。只验证Node24/Rust1.95/MSVC、私有离线真实A/H、11份旧H报告+13份保留真实J报告共24份输入及9个原始错误/来源hash，不代表Q产品或五测试通过。无物理fixture/用户数据/浏览器权限，不运行总控prepare-scope-export-assets；.local只构建/日志。

## 实现

仅packages/redacted-report，water-redacted-report/water_redacted_report/pub mod v1。JSON入口把原raw先交真实A.parse_report，DTO入口先A.validate_report，被移除字段仍要全验证；再真实H.summarize_report。错误、私有输出、16MiB同一输出边界和严格字段按SPEC；不能先Value删除/重排掩盖重复键、复制H实现或按case_id硬编码expected。

顶层9字段；scope局部序号映射、逐finding的12字段、issues仅code+scope_ref，evidence仅code/source、references仅state/project_count；保留原枚举/保护原因/size和真实H汇总。移除全部原ID、路径/label、工具自由文本、rule_version、evidence.summary、issue.message，不能加hash或字典恢复原值。局部alias允许偶然与来源串同名，但不依赖来源；用canary和一致ID双射证实。Unknown/null不是0，来源totals不由逐项sum或筛选重算，u64串不经f64；anonymity_guaranteed固定false。

纯内存输出，无磁盘导出/保存对话框/CLI/IPC/UI/浏览器/上传/环境/HOME/扫描；Q不接P，不导出L/M完整facts，不改分类/风险或旧产品。别把“去除直接字段”说成匿名或可安全公开。

白名单仅本树：packages/redacted-report/Cargo.toml、Cargo.lock、README.md、src/内Rust文件、tests/redaction_v1.rs；docs/dispatch/reports/WATER-W1-Q-REPORT.md和docs/acceptance/wave1/q/新证据。预置证据.gitattributes冻结不改。独立workspace/锁、唯一lib/test，四固定直接依赖，无unsafe/dev/build/bin/新包。旧A–O/H、helper/冻结/根Cargo/台账/别树/上游只读。

## 五测试与有效红绿

唯一redaction_structure、redaction_source_validation、redaction_aliases_and_privacy、redaction_precision_and_status、redaction_public_wire。全部24份golden逐键逐值、9原raw错误与A精确code/field；额外手工非法DTO和A.validate_report一致。覆盖多scope交错关联、全部固定枚举、空/partial/cancelled、u64max/2^53/null、两u32max不相加、所有canary、有效来源ID/文本变化不改变输出、输入不变、实际JSON/DTO/Serialize/to_json入口。不能以反向样本替代冻结正例。

先完整五测试与可编译骨架red-behavior，P/Q各自目标：本票Q_BEHAVIOR、退出101；再实现suite五绿。稳定fmt/clippy后逐项实改真实源码：

1. red-nc1把原relative_path写进finding_ref，Q_NO_FREE_TEXT红。
2. red-nc2把全部scope_ref错误固定为scope-1，Q_SCOPE_ASSOCIATION红。
3. red-nc3把真实summary未知logical_bytes改0，Q_UNKNOWN_PRESERVED红。

每项完整五红→立即原字节恢复→suite五绿，记录三哈希；测试字节不变，源/测试改变重录。helper保存源码/完整输出并核四条当前字节恢复链。编译/缺文件/超时/测试专用开关不算红；不改helper或放宽断言。

命令统一`node scripts/scope-export-check.mjs --task WATER-W1-Q --mode <mode>`；允许baseline/lock/fmt/test/suite/clippy/metadata/bridge/red-behavior/red-nc1/2/3。私有offline/locked/jobs1，一次一个门、单子命令180秒，无全仓/watch/coverage。

实现/测试提交后同一干净SHA串行：

```powershell
node scripts/scope-export-check.mjs --task WATER-W1-Q --mode fmt --final
node scripts/scope-export-check.mjs --task WATER-W1-Q --mode test --final
node scripts/scope-export-check.mjs --task WATER-W1-Q --mode clippy --final
node scripts/scope-export-check.mjs --task WATER-W1-Q --mode metadata --final
node scripts/scope-export-check.mjs --task WATER-W1-Q --mode bridge --final
```

bridge编译冻结总控源码，实际Q/A/H并比较24完整golden、9错误及canary。归档helper全部json/log/txt原字节，不纳二进制/cache；显式文件名add，log用-f。回执绑定完整受测SHA、全部门/五测/红恢复/三哈希/失败和实际模型；写明16MiB边界/不可达SerializationFailed是否实测，未做不说通过。真实文件导出/桌面/用户scope/扫描/macOS/删除/匿名不可关联均不在本票验证范围。报告提交不夹未复测产品，不merge/push，交回后停止。

通知与报告首行：

```text
WATER-W1-Q 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/q/docs/dispatch/reports/WATER-W1-Q-REPORT.md
```
