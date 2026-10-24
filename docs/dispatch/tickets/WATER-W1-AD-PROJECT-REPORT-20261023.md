# WATER-W1-AD：同源合并项目报告与原字节附件

当前（2026-10-24）：VERIFIED，Windows受控回放及同源报告通过。无需重贴；[总控验收](../../acceptance/wave1/controller/WATER-W1-ADAE-REVIEW-20261024.md)记录集成与限制。以下保留原工单。

2026-10-23，正式票。只有主manifest本票status=READY且baselineStatus=PASSED才开工，READY不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AD-PROJECT-REPORT-20261023.md |
| 唯一工作树/分支 | F:/new/smaltalk/water/.worktrees/ad / worker/water-w1-ad |
| 精确首次HEAD | 4b8a1de2ad49664546547256cd3d55def7c31a49，必须干净 |
| tag | water-w1-delivery-base-20261023 |
| SPEC | contracts/project-report-v1/SPEC.md |
| 冻结/执行器 | contracts/delivery-batch-v1/freeze.lock.json / scripts/delivery-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/ad/docs/dispatch/reports/WATER-W1-AD-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ad/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-017、M1-DELIVERY-WAVE-PLAN-20261023、本票SPEC与delivery-batch TESTS/SOURCES/锁、W1-DELIVERY-WORKER-RULES。材料在base中可读；正式票/后置READY回执以主检出绝对路径为准，不merge/复制主线控制提交。首次不存在的本票新文件由执行者实现，不修改其它票/上游。

本票修改现有AB的app/styles/server/transport/README并新增同源project-report资产/两测试，生产真实调用同步captureProjectReport，保持旧workspace精确API/五测试和W/Q/Z原字节。原model.mjs/launch.mjs/旧两测试冻结，不能写它们以造负控；新增测试必须通过公开streams/新路由及真实鼠标下载。

首先从唯一树执行：

```powershell
node scripts/delivery-wave-check.mjs --task WATER-W1-AD --mode baseline
```

baseline只实测既有依赖/输入/工具，不是新产品测试。所有新产品/研究交付本次尚未完成。

测试/文档检查清单：project_workspace_protocol、project_workspace_authority、project_workspace_consent_and_exports、project_report_capture_and_routes、project_report_privacy_and_eviction；browser：project_workspace_actions_and_evidence、project_workspace_layout_and_privacy、project_report_layout_and_downloads。test模式旧3+新2=5，browser旧2+新1=3；旧5原断言/文件完整冻结，零npm。

先完整可运行骨架/指定测试red-behavior，命中AD_BEHAVIOR；不能用缺文件/编译/timeout造红。 稳定nc1真实新路由job绑定/淘汰错误→AD_REPORT_BINDING，恢复原字节/hash→test五绿；nc2真实新结构附件授权错误→AD_REPORT_CONSENT，恢复→test五绿，旧model与旧测试不改。 所有失败与源码好坏/恢复必须归档。

永久白名单（精确文件，无其它产品前缀）：

- prototypes/project-workspace/app.mjs
- prototypes/project-workspace/styles.css
- prototypes/project-workspace/server.mjs
- prototypes/project-workspace/transport.mjs
- prototypes/project-workspace/README.md
- prototypes/project-workspace/project-report.html
- prototypes/project-workspace/project-report.css
- prototypes/project-workspace/project-report.mjs
- prototypes/project-workspace/project-report-model.mjs
- prototypes/project-workspace/tests/project-report.test.mjs
- prototypes/project-workspace/tests/project-report-browser.test.mjs
- docs/dispatch/reports/WATER-W1-AD-REPORT.md
- docs/acceptance/wave1/ad/内本票新json/log/txt/png/md、ARCHIVE.json（不覆写别票证据）

其它只读：旧485/新增控制冻结、A–AB所有非分配文件、根Cargo/锁、既有helper/CASE、台账、其他树/旧fixture/AA排除截图/真实用户目录。

完整实现/材料先提交为干净SHA，再串行以下final各一次：

```powershell
node scripts/delivery-wave-check.mjs --task WATER-W1-AD --mode check --final
node scripts/delivery-wave-check.mjs --task WATER-W1-AD --mode test --final
node scripts/delivery-wave-check.mjs --task WATER-W1-AD --mode browser --final
```

系统原生窗口0；最多同时一个私有headless Chrome，实际系统鼠标点击新报告/下载；两尺寸及late状态新截图必须实际view_image查看。 一树一门、jobs1；普通命令180秒，AC冷构建/依赖上限600秒，禁止watch/整仓/coverage。通过且字节未变不机械重跑。

回执必须记录实际模型/实现与受测SHA、逐需求、命令退出/所有失败、负控恢复或文档检查、窗口/进程/原字节证据/实际看图/未知平台；source/archive/bytes/SHA逐项索引，排除cache/target/binary/profile/payload。报告/原始日志分别检查空白并如实记退出，逐个显式文件暂存（日志-f），禁止整树add/reset/clean。

后续提交仅报告/证据；交回后停止产品改动/测试与自有后台进程，不push/merge/自行改主台账。完成只SUBMITTED，不宣称VERIFIED、真实用户scope、macOS、桌面整链或M1完成。受阻同路径写任务受阻/具体冲突与最小需求，不向用户索取临时放宽、不让另一个实现者接脏树。

报告第一行与完成通知必须是：

```text
WATER-W1-AD 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ad/docs/dispatch/reports/WATER-W1-AD-REPORT.md
```
