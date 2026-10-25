# WATER-W1-AC 补充单06：按精确框架身份完成静态主窗验收

当前（2026-10-25）：VERIFIED（仅Windows静态桌面基础），已隔离验收并集成；无需重贴或运行以下旧入口。[总控验收](../../acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-06-REVIEW-20261025.md)为最新结果，下列READY/命令均为历史。

当前：READY / baselineStatus=PASSED；冻结无UI预检及精确干净resume实际通过，0窗口/0构建/0依赖下载。正式派前回执已保存，可由用户外贴执行。本单只回原AC对话，05已交回且三次窗口allocation已用，不能重跑03/04/05。

2026-10-25，总控。05受阻已审计：两个完整自有根为Tauri主窗和固定Tao事件目标，旧Count2确实失败；主窗正常exit0，页面四文案未观察、冻结childClose分支未跑。[05总控复核](../../acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-05-REVIEW-20261025.md)与[06派前回执](../wave1/AC-DESKTOP-ADDENDUM-06-READY-REPORT-20261025.md)为本单依据。

| 项 | 唯一精确值 |
|---|---|
| 树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 首次与受测干净HEAD | 8a3b475918684a18be318415a9f7a54470c916b8 |
| 产品/测试/锁实现 | eb7f80178191e233068015bbc26dc9798ac8cb22，原14文件只读 |
| 新契约/来源/锁 | 主检出contracts/desktop-bootstrap-window-v1/SPEC.md、FRAMEWORK.json、freeze.lock.json |
| 唯一绝对入口 | F:/new/smaltalk/water/scripts/ac-window-check.mjs |
| 新报告 | F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-06-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ac/addendum-06/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、原desktop SPEC、新SPEC/FRAMEWORK/锁、05报告/复核及06派前回执。不能merge或复制控制提交，不reset/清理现场，不改其它票/台账。535旧约束、24继承锁与7新条目共542；旧46/189/88/51/51共425归档、全部报告/缓存/profile/reservation只读保持，不读AA排除图片。

本编号单**明确修订应用窗口的计数契约**：一个精确应用主窗，至多一个与固定tao0.37.2源码和完整属性吻合的事件目标，未知/无效根0。原始UIA数量与每行明细始终保留；不能把原Count2写成Count1、回写05通过或通用忽略Pane/offscreen/handle0。helper的PID/name/class/type/WindowPattern/HWND/RuntimeId/四个bool/bounds必须逐项匹配SPEC；宽高0–64、原点0，变化或额外根立即失败，不现场扩宽。来源校验在resume/preflight与native启动前完成，不通过就停；不重新下载依赖。声明dirty=true的Git SHA不能冒称精确发布树。

在原树先运行一次resume：

```powershell
node F:/new/smaltalk/water/scripts/ac-window-check.mjs --task WATER-W1-AC --mode resume
```

必须精确干净8a3b475且14文件与eb7f801相同。productionHash=`38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d`；testHash=`211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7`；锁SHA=`c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8`。复用03同干净82d04aa的check/test final与02先红/两负控/恢复；不重跑check/test/Clippy/负控、无UIprobe或下载。

然后仅运行一次：

```powershell
node F:/new/smaltalk/water/scripts/ac-window-check.mjs --task WATER-W1-AC --mode native --final
```

本单另增**1次静态窗allocation，产品墙钟≤30秒、0目录窗**，旧三次已用保留，累计分配4次。新目录.local/checks/WATER-W1-AC-ADDENDUM-06有唯一reservation；失败不循环、不手工开窗。总控派前0窗口/0构建/0下载，预检历史数据回放可分类不等于真实native通过。原AC对话执行，无子代理/本地worker或另实现者。

成功必须同时记录：初次与关闭前两份完整自有根快照均满足新契约，主PID/HWND/RuntimeId一致，四文案实际UIA命中，WindowPattern关闭后主进程正常exit0，实际私有profile命令行与全部捕获子进程结束查询通过。各rawRootCount/applicationWindowCount/frameworkEventTargetCount/unknown/invalid分别保存。四文案未到达就写未观察；关闭或退出错误单列，强制终止不能写正常退出。两次有限采样不冒称生产竞态全部验证。

finally仅关闭已精确绑定的本票主窗，不关闭事件目标或任意歧义窗口；原失败保留。未知/读取失败立即保存明细交回；无明确主窗时外层只能记录自己启动的根进程终止请求。原错误、cleanup错误、外层退出、wall时间、子进程/profile/reservation按实际分别报告，不能用后续timeout替代首次错误。

沿用既有Rust1.95/jobs1/私有home-target-tmp、镜像只走单命令参数、offline/locked；Cargo build≤600秒、observer≤25秒、实际产品≤30秒。禁止系统网络/代理/DNS/证书、全局或持久Cargo配置变化，禁止install/升级/下载、上游脚本、用户数据/物理fixture/AA/AD接线、截图或AA像素读取。cache/crate/依赖源码/target/binary/profile不进Git，不清理；本单不改产品、测试、锁或console/subsystem。

永久写入仅本单报告及addendum-06证据。按source/archive/bytes/SHA保存原始命令/退出/14源码快照/两份根与四文案/收尾记录，旧425项原件保持。报告绑定实际模型、受测SHA、复用证明、窗口已用、来源与未验证边界；手写/原始日志空白退出分开记录，不清洗原始失败。提交仅自己的新报告与证据，不push/merge/改主台账。通过后只记SUBMITTED，由总控验收集成；失败记BLOCKED并停测，不现场修产品或再试。

真实桌面扫描整链、真实AA→AD、用户scope/自然同意鉴真、生产竞态、macOS/M1均未验收，不因本单静态主窗通过而升级这些范围。

报告首行与回执：

```text
WATER-W1-AC 补充单06 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-06-REPORT.md
```

受阻使用同一路径，把“任务已完成”改为“任务受阻”。
