# WATER-W1-AB：显式内容同意与结构证据工作台

当前收单状态（2026-10-22）：VERIFIED（Windows受控），AB补单01与真实AA→AB联合验收通过，已集成4b4d6a3，无需重贴。 [总控复验](../../acceptance/wave1/controller/WATER-W1-AB-ADDENDUM-01-REVIEW-20261022.md)。以下保留原派前要求。

2026-10-19，正式票。仅主manifest本票READY且baselineStatus=PASSED时开工；READY不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AB-PROJECT-WORKSPACE-20261019.md |
| 唯一树 / 分支 | F:/new/smaltalk/water/.worktrees/ab / worker/water-w1-ab |
| 精确首次HEAD | f3b87b7a79ff8fa51882705ecef75f1f02d8af15；必须干净、产品目录不存在 |
| tag | water-w1-project-consent-base-20261019 |
| 冻结/检查入口 | contracts/project-batch-v1/freeze.lock.json / scripts/project-wave-check.mjs |
| 报告 | F:/new/smaltalk/water/.worktrees/ab/docs/dispatch/reports/WATER-W1-AB-REPORT.md |
| 证据 | 本树docs/acceptance/wave1/ab/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-016、M1-PROJECT-CONSENT-PLAN、W1-PROJECT-WORKER-RULES、project-batch TESTS、新project-session SPEC/CASES及PROVENANCE；AB另读project-workspace SPEC与真实Y/W/Z/U协议，AA读真实S/P/R/E/H/Q/Z/X API。权威票位于主检出，直接绝对路径读；不merge/复制主线控制提交。

首次命令（从唯一树）：

```powershell
node scripts/project-wave-check.mjs --task WATER-W1-AB --mode baseline
```

baseline只检既有依赖/控制输入/工具，不代表新产品实现。无物理fixture权限，只冻结回放、loopback、单私有Chrome及实际下载。

默认不勾选且每次start复位的复选框，逐任务read_manifest绑定；真实W报告/Q与独立Z结构证据附件。startFromStreams接冻结project-host-replay的真实pipe，不等AA产品。固定launch在独立树缺AA时净化拒绝，禁止假exe/程序路径注入/生产测试开关。

先创建本目录.gitattributes，精确四行：.gitattributes text eol=lf、*.mjs text eol=lf、*.html text eol=lf、*.css text eol=lf，均LF及结尾LF，自身也固定LF。

CASES中的R/Z值真实来自可信P确认后的依赖调用，native_directory_dialog envelope是明确合成的内存声明，并非本轮S或AA执行；保留取消项基于旧S实际捕获。不得把这一点写成真正新产品整链。AA的native final另运行真实S；AB的新AA整链留总控联合验收。

唯一测试文件：prototypes/project-workspace/tests/model.test.mjs、prototypes/project-workspace/tests/browser.test.mjs；精确测试名：project_workspace_protocol、project_workspace_authority、project_workspace_consent_and_exports、project_workspace_actions_and_evidence、project_workspace_layout_and_privacy。无skip/ignore/filter/嵌套凑数。零npm/不加package.json，不改旧页面或W下载。

先可运行骨架+完整指定测试，用red-behavior命中AB_BEHAVIOR。稳定源码/测试后：nc1真实HTTP入口移除一项Origin/token拒绝，让跨origin命令写pipe→AB_ACTION_AUTH；nc2真实请求选择/结果绑定放行false+observed并使证据可服务→AB_CONSENT_BINDING。不能只改未被调用的validator。 每次负控立即原字节恢复/hash→mode test绿再下一项；不改test/helper/超时，不用编译/缺文件/超时/CDP造红。负控不运行native/Chrome。

永久白名单：

- prototypes/project-workspace/.gitattributes
- prototypes/project-workspace/index.html
- prototypes/project-workspace/styles.css
- prototypes/project-workspace/app.mjs
- prototypes/project-workspace/model.mjs
- prototypes/project-workspace/server.mjs
- prototypes/project-workspace/transport.mjs
- prototypes/project-workspace/launch.mjs
- prototypes/project-workspace/tests/model.test.mjs
- prototypes/project-workspace/tests/browser.test.mjs
- prototypes/project-workspace/README.md
- docs/dispatch/reports/WATER-W1-AB-REPORT.md
- docs/acceptance/wave1/ab/ 内本票新json/log/txt/png及ARCHIVE.json

其余只读，包括旧A–Z产品/所有锁/输入/helper/根Cargo/台账/上游与其它树。不得直接在旧X/Y/Z修实现。接口/权限冲突写受阻回执，交总控编号补单，不临时放宽。

提交干净实现/测试得到SHA，串行以下final一次：

```powershell
node scripts/project-wave-check.mjs --task WATER-W1-AB --mode check --final
node scripts/project-wave-check.mjs --task WATER-W1-AB --mode test --final
node scripts/project-wave-check.mjs --task WATER-W1-AB --mode browser --final
```

AB原生系统窗0，最多一个私有Chrome。系统鼠标切checkbox并开始，核每次复位、跨job/false拒绝，分别实际下载W/Q和Z结构证据原字节；当次三图project-workspace-1440x1000.png、900x800.png、cancel.png必须实际看图。 每子命令180秒，一树一门，Rust jobs1/private offline。通过且字节未变不机械重跑。

报告绑定实际模型/实现受测SHA/报告提交定位、逐要求与命令退出、全部失败/好坏恢复、窗口/进程、看图与未验证。原字节归档source/archive/bytes/SHA、含实际附件/截图，不纳target/cache/binary/profile/payload；日志逐路径-f，不能全树add/clean/reset。后续报告提交仅报告/证据，交回停测停改、不push/merge。完成只SUBMITTED，不能宣称VERIFIED/真实用户scope/macOS/桌面/M1。

通知和报告首行：

```text
WATER-W1-AB 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ab/docs/dispatch/reports/WATER-W1-AB-REPORT.md
```

受阻则同一路径写任务受阻，列具体冲突/最小补充需求，不让另一实现者接脏树。
