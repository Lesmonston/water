# WATER-W1-AE：macOS原生移植差异与实机验收准备

2026-10-23，正式票。只有主manifest本票status=READY且baselineStatus=PASSED才开工，READY不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AE-MACOS-READINESS-20261023.md |
| 唯一工作树/分支 | F:/new/smaltalk/water/.worktrees/ae / worker/water-w1-ae |
| 精确首次HEAD | 4b8a1de2ad49664546547256cd3d55def7c31a49，必须干净 |
| tag | water-w1-delivery-base-20261023 |
| SPEC | contracts/macos-readiness-v1/SPEC.md |
| 冻结/执行器 | contracts/delivery-batch-v1/freeze.lock.json / scripts/delivery-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/ae/docs/dispatch/reports/WATER-W1-AE-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ae/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-017、M1-DELIVERY-WAVE-PLAN-20261023、本票SPEC与delivery-batch TESTS/SOURCES/锁、W1-DELIVERY-WORKER-RULES。材料在base中可读；正式票/后置READY回执以主检出绝对路径为准，不merge/复制主线控制提交。首次不存在的本票新文件由执行者实现，不修改其它票/上游。

本票只研究/设计Mac差异，四份材料+来源索引/矩阵/未来实机计划；不能改现有产品或冻契约、安装SDK/依赖、远程连接Mac/读取用户数据。至少6条确实读到内容的一手来源，JS空页/归档man边界如实说明；源码用固定行号与SHA支持，不捏造SDK ABI或实机结果。

首先从唯一树执行：

```powershell
node scripts/delivery-wave-check.mjs --task WATER-W1-AE --mode baseline
```

baseline只实测既有依赖/输入/工具，不是新产品测试。所有新产品/研究交付本次尚未完成。

测试/文档检查清单：macos-source-index、macos-gap-matrix、macos-acceptance-plan。本票三项是文档检查，不能写作产品测试。

实现材料后直接check； AE文档一致性检查不强造行为红或生产负控。 所有失败与源码好坏/恢复必须归档。

永久白名单（精确文件，无其它产品前缀）：

- docs/research/macos-port-20261023/SOURCES.json
- docs/research/macos-port-20261023/GAP-MATRIX.json
- docs/research/macos-port-20261023/DESIGN.md
- docs/research/macos-port-20261023/ACCEPTANCE-PLAN.md
- docs/dispatch/reports/WATER-W1-AE-REPORT.md
- docs/acceptance/wave1/ae/内本票新json/log/txt/png/md、ARCHIVE.json（不覆写别票证据）

其它只读：旧485/新增控制冻结、A–AB所有非分配文件、根Cargo/锁、既有helper/CASE、台账、其他树/旧fixture/AA排除截图/真实用户目录。

完整实现/材料先提交为干净SHA，再串行以下final各一次：

```powershell
node scripts/delivery-wave-check.mjs --task WATER-W1-AE --mode check --final
```

系统原生窗口0；无Chrome/远程机器/SDK安装，Mac系统能力保持未实现/未验证。 一树一门、jobs1；普通命令180秒，AC冷构建/依赖上限600秒，禁止watch/整仓/coverage。通过且字节未变不机械重跑。

回执必须记录实际模型/实现与受测SHA、逐需求、命令退出/所有失败、负控恢复或文档检查、窗口/进程/原字节证据/实际看图/未知平台；source/archive/bytes/SHA逐项索引，排除cache/target/binary/profile/payload。报告/原始日志分别检查空白并如实记退出，逐个显式文件暂存（日志-f），禁止整树add/reset/clean。

后续提交仅报告/证据；交回后停止产品改动/测试与自有后台进程，不push/merge/自行改主台账。完成只SUBMITTED，不宣称VERIFIED、真实用户scope、macOS、桌面整链或M1完成。受阻同路径写任务受阻/具体冲突与最小需求，不向用户索取临时放宽、不让另一个实现者接脏树。

报告第一行与完成通知必须是：

```text
WATER-W1-AE 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ae/docs/dispatch/reports/WATER-W1-AE-REPORT.md
```
