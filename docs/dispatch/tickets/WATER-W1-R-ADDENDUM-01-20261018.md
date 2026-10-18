# WATER-W1-R 补充单01：祖先保护契约冲突修订

归档状态（2026-10-19）：本票已VERIFIED并集成（Windows受控范围），不再外贴或运行首次baseline/resume。当前以manifest和[RTU总控验收](../../acceptance/wave1/controller/WATER-W1-RTU-REVIEW-20261019.md)为准，以下为原票历史。


总控2026-10-18。绑定原票 WATER-W1-R、原基线 dd09c3b8801b86a0059f3fb73fe8a250acb1d89e。原R任务CHANGES_REQUESTED；本补单是否READY以主manifest addendum01为准。由原r执行对话续做，不再派另一个执行者。

| 项 | 唯一值 |
|---|---|
| 权威补单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-R-ADDENDUM-01-20261018.md |
| 原树 / 分支 | F:/new/smaltalk/water/.worktrees/r / worker/water-w1-r |
| 原受阻报告提交 | acefcf1f5fa16ff7580a219f1a2d06baaf9fdb2e |
| 总控追加材料后首次续做HEAD | c0e20252c87b22fde8c83c4487d24e7a5ca06011，必须精确且干净 |
| 原基线 | dd09c3b8801b86a0059f3fb73fe8a250acb1d89e，保持，不重置 |
| 新契约 / 锁 | contracts/native-scan-addendum-v1/SPEC.md / freeze.lock.json |
| 新定向wrapper | scripts/native-scan-addendum-check.mjs |
| 新报告 | F:/new/smaltalk/water/.worktrees/r/docs/dispatch/reports/WATER-W1-R-ADDENDUM-01-REPORT.md |
| 新证据 | 本树 docs/acceptance/wave1/r/addendum-01/ |

先读主检出README/STATUS/AGENTS/工作流、原R票/纪律、原受阻报告及本补单、附加SPEC/锁。原票SPEC的固定两原因规则仅由本编号补单替代，其余原票要求保持。主检出票面权威，执行树已由总控追加六个新控制材料文件及独立提交；原受阻提交/报告/证据、255旧冻结、原61锁/helper/夹具与产品原字节保持。不merge获取票、不reset/重建原fixture。起点不符保留现场回受阻。

总控已用真实A.parse_report复现内存两finding报告：UnsafeClassification at /findings/0/protection_reasons；仅给dir追加第三原因后真实A/Q通过，去掉后代且恢复两原因的叶子对照也通过。完整fixture dir是findings[2]，对应冲突位置从源码与冻结顺序推得，尚无R产品或R测试执行，不把该位置推导当R实测失败。原执行者停止报告冲突符合工作流，无产品缺陷结论。

正确规则：所有finding先保留 unknown_ownership、incomplete_evidence；当且仅当同scope的实际已记录findings存在受保护后代，再按第三项追加 protected_descendant。分段前缀与真实A一致；不根据未记录磁盘/目录名/issue猜后代。完整八项dir三原因，其余两；max_depth=1缺少inner时dir两原因；partial/cancelled按实际记录集合计算并仍真实A校验，Q照旧委托。禁止修改A/Q、跳过校验/丢后代/降保护/重写旧冻结。

现有 native_report_and_redaction 测试补完整/深度1/partial/取消祖先对照，保持原五测试名、全部原断言和原 R_BEHAVIOR/R_ROOT_BINDING/R_NO_FOLLOW/R_CANCELLED 目标。仍从原任务尚未实施处开始：全部实现、原生安全/生命周期、五测试、四条完整红/恢复链和final均需交付，补单probe不是产品实现或放宽权限。

首先只运行新resume，沿用既有R fixture和原helper fixtures模式，另核本次实际A/Q内存冲突对照：

```powershell
node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode resume
```

不要再跑首次baseline（原helper要求精确原基线）。后续所有原lock/fmt/test/suite/clippy/metadata/bridge/red-behavior/red-nc1/2/3模式均通过同一新wrapper调用；wrapper原样委托原helper，bridge再追加完整/深度1保护原因公开R→A→Q校验，原helper不改。资源、依赖、unsafe/NativeIo/P guard/decoder/取消/预算和普通内容禁止读取等原要求全部保持，单子命令180秒。

原实现白名单不扩面；仅允许新增本补单报告及r/addendum-01/证据。六个总控追加控制文件已提交、只读，manifest只是允许它们存在于原基线后的diff，不授权执行者修改。原WATER-W1-R-REPORT.md和blocked-r001证据原字节保持。临时改坏真实生产逻辑留红后立即原字节恢复suite绿，最终源码/测试字节四链完整；不以编译、缺文件、native失败或超时造红。

同一干净实现SHA依次运行：

```powershell
node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode fmt --final
node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode test --final
node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode clippy --final
node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode metadata --final
node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode bridge --final
```

归档本次wrapper与原helper所有新json/log/txt原字节至addendum-01（含ARCHIVE.json）。新报告绑定受测完整SHA，逐项列新规则与原需求、实际模型/失败/红绿/五final/未验证；后加报告/证据不得夹未复测产品变更。不清理/删/移/ACL/扫描真实用户数据，不合主线或push，不启动其它实现者。总控独立验收仍另做，M1未完成。

报告首行及通知：

```text
WATER-W1-R 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/r/docs/dispatch/reports/WATER-W1-R-ADDENDUM-01-REPORT.md
```
