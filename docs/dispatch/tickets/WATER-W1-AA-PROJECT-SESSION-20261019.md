# WATER-W1-AA：同次原生选择的可选项目清单宿主

2026-10-19，正式票。仅主manifest本票READY且baselineStatus=PASSED时开工；READY不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AA-PROJECT-SESSION-20261019.md |
| 唯一树 / 分支 | F:/new/smaltalk/water/.worktrees/aa / worker/water-w1-aa |
| 精确首次HEAD | f3b87b7a79ff8fa51882705ecef75f1f02d8af15；必须干净、产品目录不存在 |
| tag | water-w1-project-consent-base-20261019 |
| 冻结/检查入口 | contracts/project-batch-v1/freeze.lock.json / scripts/project-wave-check.mjs |
| 报告 | F:/new/smaltalk/water/.worktrees/aa/docs/dispatch/reports/WATER-W1-AA-REPORT.md |
| 证据 | 本树docs/acceptance/wave1/aa/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-016、M1-PROJECT-CONSENT-PLAN、W1-PROJECT-WORKER-RULES、project-batch TESTS、新project-session SPEC/CASES及PROVENANCE；AB另读project-workspace SPEC与真实Y/W/Z/U协议，AA读真实S/P/R/E/H/Q/Z/X API。权威票位于主检出，直接绝对路径读；不merge/复制主线控制提交。

首次命令（从唯一树）：

```powershell
node scripts/project-wave-check.mjs --task WATER-W1-AA --mode baseline
```

baseline只检既有依赖/控制输入/工具，不代表新产品实现。只由冻结adapter复用本树Z原factory（524474字面合成payload），内容读取只Z及有界factory/probe；不访问旧树或真实用户数据。

真实S→本线程持有SelectedScope→真实R/E/H/Q→本次选择true且未取消才短暂P permit→真实Z approve/read。复用X真实HostState/NativeJob；固定CLI不用旧V先释放的scope，不按initialDirectory直接扫描。capture_registered公开API必须真实P/R/Z可独立无UI验证，不能造内部假能力或以测试闭包替代生产路径。


CASES中的R/Z值真实来自可信P确认后的依赖调用，native_directory_dialog envelope是明确合成的内存声明，并非本轮S或AA执行；保留取消项基于旧S实际捕获。不得把这一点写成真正新产品整链。AA的native final另运行真实S；AB的新AA整链留总控联合验收。

唯一测试文件：packages/project-session/tests/project_v1.rs；精确测试名：project_request_boundary、project_consent_state、project_capture_and_marker、project_wire_and_cleanup。无skip/ignore/filter/嵌套凑数。lib/bin全部forbid unsafe，锁只mode lock离线生成；无新registry/dev/build/target。

先可运行骨架+完整指定测试，用red-behavior命中AA_BEHAVIOR。稳定源码/测试后：nc1真正忽略Skip并调用Z产生observed→AA_NO_CONTENT_CONSENT；nc2真正绕过取消前置而让已取消报告仍进入Z读取并产生observed→AA_CANCEL_NO_READ。不能只改状态字符串或断言，必须让真实内容读取分支出错。 每次负控立即原字节恢复/hash→mode test绿再下一项；不改test/helper/超时，不用编译/缺文件/超时/CDP造红。负控不运行native/Chrome。

永久白名单：

- packages/project-session/Cargo.toml
- packages/project-session/Cargo.lock
- packages/project-session/README.md
- packages/project-session/tests/project_v1.rs
- docs/dispatch/reports/WATER-W1-AA-REPORT.md
- packages/project-session/src/ 内本票Rust文件
- docs/acceptance/wave1/aa/ 内本票新json/log/txt/png及ARCHIVE.json

其余只读，包括旧A–Z产品/所有锁/输入/helper/根Cargo/台账/上游与其它树。不得直接在旧X/Y/Z修实现。接口/权限冲突写受阻回执，交总控编号补单，不临时放宽。

提交干净实现/测试得到SHA，串行以下final一次：

```powershell
node scripts/project-wave-check.mjs --task WATER-W1-AA --mode check --final
node scripts/project-wave-check.mjs --task WATER-W1-AA --mode test --final
node scripts/project-wave-check.mjs --task WATER-W1-AA --mode native --final
```

AA正常native final恰4窗（默认false确认、true确认、true选择取消、true先cancel再确认），整单最多8窗，只允许一次有依据的失败后完整恢复，不循环弹窗；其它模式0窗。 每子命令180秒，一树一门，Rust jobs1/private offline。通过且字节未变不机械重跑。

报告绑定实际模型/实现受测SHA/报告提交定位、逐要求与命令退出、全部失败/好坏恢复、窗口/进程、看图与未验证。原字节归档source/archive/bytes/SHA、含实际附件/截图，不纳target/cache/binary/profile/payload；日志逐路径-f，不能全树add/clean/reset。后续报告提交仅报告/证据，交回停测停改、不push/merge。完成只SUBMITTED，不能宣称VERIFIED/真实用户scope/macOS/桌面/M1。

通知和报告首行：

```text
WATER-W1-AA 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/aa/docs/dispatch/reports/WATER-W1-AA-REPORT.md
```

受阻则同一路径写任务受阻，列具体冲突/最小补充需求，不让另一实现者接脏树。
