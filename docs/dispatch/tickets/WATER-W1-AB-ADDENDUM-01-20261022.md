# WATER-W1-AB 补充单01：保留内容前取消的元数据

2026-10-22。原AB提交已收单，AB_LATE_CANCELLED_CONTENT回归失败，原票CHANGES_REQUESTED。本补单仅主manifest.addendum01.status=READY且baselineStatus=PASSED时执行，交回**原AB对话**，不重贴原票、不新开实现者。AA单票合格可先集成，真实AA→AB联合链待本补通过后另验。

| 项 | 精确值 |
|---|---|
| 权威补单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AB-ADDENDUM-01-20261022.md |
| 原树/分支 | F:/new/smaltalk/water/.worktrees/ab / worker/water-w1-ab |
| 首次续做HEAD | 7b5bdec2fd1af1bf988443d22eb91f504e5bba55，必须精确且干净 |
| 原受测实现 | fa71a82696f123fd33c3514d99ef0b5c681c5780 |
| 原共同基线 | f3b87b7a79ff8fa51882705ecef75f1f02d8af15，保持，不reset |
| 主检出新控制 | contracts/project-workspace-addendum-v1/SPEC.md、CASES.json、actual-AA-late-cancel.json、freeze.lock.json |
| 唯一新wrapper（主检出只读） | F:/new/smaltalk/water/scripts/project-workspace-addendum-check.mjs |
| 新报告 | 本树docs/dispatch/reports/WATER-W1-AB-ADDENDUM-01-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ab/addendum-01/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、正式AB票/原报告、本补单/新SPEC/CASES/锁和总控AA/AB收单报告。新材料位于主检出，**从原AB树直接调用上表绝对wrapper**；不merge/复制主线控制提交，不改旧helper/锁/CASE或其它树。

总控已核两票1109交付路径/1085原归档5162781字节、原6 final/4稳定生产负控及479约束。独立私有树AA无窗口四测、AB原完整五测均通过；但真实AA.capture_registered末条observer调用cancel后，R仍completed、marker为skipped/scan_cancelled。原AB在assertMarker、WorkspaceState及真正startFromStreams→HTTP全部拒绝，连接failed，合法元数据不可查看。partial是同步status/summary/Q的明确内存变体，也被三入口拒绝。共6次真实失败，本轮原生窗口0，不是原报告未提交或旧失败状态。

原规范已要求“R cancelled **或**内容前token cancelled”跳过读取。按新SPEC接收合法confirmed+read_manifest=true+completed/partial+skipped/scan_cancelled/null；保持metadata/Q状态及原字符串、真实W报告/连接ready/可再扫，无结构证据/附件。默认false、选择取消、真扫描取消、原正文/额外键/错误job/选择绑定拒绝都保持。页面不得将completed/partial元数据说成扫描取消，应明确“已取消内容读取/未读取清单”。不得修改AA或R/旧协议来迎合消费者。

永久修改白名单仅：

- prototypes/project-workspace/model.mjs
- prototypes/project-workspace/app.mjs
- prototypes/project-workspace/tests/model.test.mjs
- prototypes/project-workspace/tests/browser.test.mjs
- docs/dispatch/reports/WATER-W1-AB-ADDENDUM-01-REPORT.md
- docs/acceptance/wave1/ab/addendum-01/ 内本补新json/log/txt/png及ARCHIVE.json

其它产品/测试/README/原报告/原411证据/ARCHIVE保持。原nc1允许临时改server.mjs，红后立即按原字节恢复，不得永久提交；nc2仍真实改选择绑定路径。新red-late-cancel只临时撤去本补新增接收分支以重现旧拒绝，不改测试/probe/原始输入，不生产开关/任意程序路径/权限扩张。

首先运行：

```powershell
node F:/new/smaltalk/water/scripts/project-workspace-addendum-check.mjs --task WATER-W1-AB --mode resume
node F:/new/smaltalk/water/scripts/project-workspace-addendum-check.mjs --task WATER-W1-AB --mode red-late-cancel
```

resume核精确clean HEAD/范围/新旧锁/原报告归档hash，并按预期观察6次合法late输入被拒绝。其PASSED仅表示已知回归复现，不是修好。不要跑原首次baseline（要求原产品不存在）。在现有顶层追加late completed/partial通过、默认false/选择取消/错误code等拒绝、真实W/Q/证据404/连接继续和下一次默认false、页面正确文案/下载及两尺寸；原恰五顶层/全部断言不删不skip。

修复后wrapper test、browser。源码/测试稳定后实际移除late接受分支→red-late-cancel目标有效红；立即原字节恢复/hash→test完整三绿+probe绿。再原定义red-nc1→立即恢复/test绿、red-nc2→立即恢复/test绿。wrapper原样委托旧helper（无替换/放宽proofAudit）；原初行为红保留，新稳定字节只须本补late与原两个生产负控证明，不重造旧实现骨架。

提交干净实现后，同一SHA串行：

```powershell
node F:/new/smaltalk/water/scripts/project-workspace-addendum-check.mjs --task WATER-W1-AB --mode check --final
node F:/new/smaltalk/water/scripts/project-workspace-addendum-check.mjs --task WATER-W1-AB --mode test --final
node F:/new/smaltalk/water/scripts/project-workspace-addendum-check.mjs --task WATER-W1-AB --mode browser --final
```

test/browser通过且字节不变不机械重跑。系统原生窗口0，不构建/调用AA，不访问/创建物理fixture，只冻结输入/内存/loopback/最多一个私有headless Chrome。每子命令180秒，一树一门。新wrapper日志.local/checks/WATER-W1-AB-ADDENDUM-01，旧委托仍.local/checks/WATER-W1-AB；本补所有新来源/日志/失败/源码好坏恢复/三图/实际Q附件归档addendum-01，不覆盖原证据或更新原ARCHIVE。profile/下载原位保留，不清理。

实际看本次三图，completed/partial应保留报告且无结构附件；取消页面文字正确。原AB报告末尾问号乱码不改写，新报告补充解释原STAGING-AUDIT的真实Git空白检查退出2、保留原证据字节/限定手写文件检查成功，明确是补充澄清，不拿乱码当完整回执文字。

报告绑定实际模型、受测SHA、报告提交定位、逐要求/命令退出/全部失败、三条负控原字节恢复、实际看图与未验证；报告后提交仅报告/证据，交回停测停改，不push/merge/reset/clean/改主线台账。完成只SUBMITTED；真实AA→AB/自然内容同意/用户scope/macOS/桌面/M1仍未验收。

报告第一行和通知：

```text
WATER-W1-AB 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ab/docs/dispatch/reports/WATER-W1-AB-ADDENDUM-01-REPORT.md
```

受阻同路径写任务受阻和最小补充需求，保留现场，不问用户临时放宽或让另一实现者接脏树。
