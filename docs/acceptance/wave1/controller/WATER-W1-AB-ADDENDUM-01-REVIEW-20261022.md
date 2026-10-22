# AB补充单01及真实AA→AB联合验收通过

2026-10-22。AB补单接收`2fedfeb2d6fbaf6064e6483b728b31a4242ba080`，受测实现`95fee90ff52b61b2b2891359451d2bc5262b9af3`；AA保持b3a874d/82e066c。隔离合入`2b56c9c0b7542d5a3d958266a4d5f90317372810`，总控仅适配两处测试输入URL后形成 **`4b4d6a39764d20464697c59c81733ffcca7ed34b`**，完整复测通过并快进主线。**AA、AB及补单01均VERIFIED（Windows受控合成范围）**；无需重贴原票或续做句。真实用户scope、自然同意鉴真、生产竞态、macOS、桌面与M1仍未验收。

## 收单与负控

[收单审计](w1-ab-addendum-01-review-20261022/controller/2026-10-22T08-24-18.959Z-20024-submission-audit.json)逐项核对原树分支/clean HEAD/提交父子关系/白名单。补单仅四个生产和测试文件改变，加1048个报告/证据路径，共1052差异路径。新增ARCHIVE实际1046文件/5366980字节，全部来源、归档、Git提交blob逐字节一致；原AB411文件/1902891字节及原报告/ARCHIVE哈希保持，原AA674归档也在主线保持。旧479及新增6条目/17继承锁共485唯一约束保持。

同一干净95fee90提交的check/test/browser三个wrapper final及原样委托helper均通过。稳定late负控确实恢复旧model字节（六次合法输入拒绝），与当前测试hash相同；立即恢复test及probe绿。nc1真正移除origin约束后发生管道写入，nc2真正移除同意绑定后暴露结构附件，两者目标有效红/源码坏字节/测试不变/即时原字节恢复及后续绿均独立复核。没有用初始未实现红或基础设施错误替代稳定生产负控。原6 final/4负控历史报告继续保留。

原AB报告乱码不修改；新[执行回执](../../../dispatch/reports/WATER-W1-AB-ADDENDUM-01-REPORT.md)明确补充原STAGING-AUDIT为412显式路径/索引字节一致、原始日志空白检查Git退出2、仅手写报告检查0，411归档是权威实际数。原411证据及两个冻结原文件哈希未变。

## 独立复测与取消边界

新私有树离线Rust1.95/jobs1构建AA固定程序与真实公开API探针；仅冻结工厂创建并验证524474字节合成payload。AA四测/Clippy等相同产品字节沿用[前次总控报告](WATER-W1-AAAB-REVIEW-20261022.md)，没有机械重复原生测试。[候选结果](w1-ab-addendum-01-review-20261022/controller/2026-10-22T08-25-20.574Z-10008-candidate-check.json)中AB完整五顶层5/5、无skip，六入口late回归全部通过，原7正例/3负对照保持。

新运行的真实AA.capture_registered末条observer取消输出SHA `1ac212c41080fcd7335a27f5b25f7e53419592ba5acec0c5bbf02a6fd8c61d82`，恰与冻结真实捕获一致：metadata completed、marker skipped/scan_cancelled/null；registry下一attempt与清理成功。将这次新capture置入明确合成的dialog envelope，经公开startFromStreams/HTTP保留原状态/summary/Q，真实W和Q字节一致，证据404、连接ready/active清空，下一次false可发起。partial仍是同步status/summary/Q的内存变体；未冒称真实partial生产竞态。

集成时发现新增两测试通过写死五级父目录取主检出冻结JSON，只适配了`.worktrees/<worker>`布局，在主检出会指向项目外。总控按[工作流](../../../CONTROLLER-WORKFLOW.md)允许的“判断和处理集成问题”，把两处测试URL改为仓库内三级路径；输入SHA仍 `b235a9bda03f609faffbd64c2a703247763b6e2c287bb53351039176727f9311`，全部断言/测试体/产品字节保持。[适配diff、前后快照及完整五测](w1-ab-addendum-01-review-20261022/controller/2026-10-22T08-31-10.950Z-3936-test-paths-result.json)证明再次5/5。原worker树/95fee90/final证据不变；主线测试与原worker测试区别仅这两个URL。没有为路径调整重跑原生窗。

## 真正固定程序联合链

先冻结[4窗/180秒计划](WATER-W1-AAAB-JOINT-PLAN-20261022.md)，实际[联合结果](w1-ab-addendum-01-review-20261022/controller/2026-10-22T08-28-22.672Z-35584-joint-result.json)在约12秒内完成4次窗口，无重试。一个真实AB.launchProjectWorkspace固定启动一个AA宿主PID31548，四场景复用该进程，一个私有headless Chrome，不使用回放替代AA：

1. 默认false确认受控good目录：completed、一条protected元数据、not_requested，无结构证据。
2. 实际鼠标勾选true并确认同目录：真实Z观察140字节，只暴露结构统计；独立W保留当次元数据，Q与默认false完全相同，结构附件实际鼠标下载844字节。
3. true后系统选择取消：selection_cancelled，无snapshot报告/内容；前两份保留策略淘汰默认W，旧端口关闭。
4. true后在系统选择确认前请求合作取消，再确认：metadata cancelled、skipped/scan_cancelled，空findings及902字节真实Q，无结构附件；淘汰旧observed证据404、其W端口关闭。

每次选择默认unchecked，发起后立即重置、活动期间禁用；跨源和缺token各403且不启动任务。4次独立UIA日志绑定父子PID、固定程序路径、窗口title及动作，不读取桌面像素。普通UI合作取消与末条observer的精确late边界分别记录，没有互相冒充。

| 实际鼠标附件 | 字节 | SHA-256 |
|---|---:|---|
| 默认/明确同意后的Q，各一份 | 1387 | `688326559e719a0d9099dca6a580d94aaef518d40a4c54872a2b5c7f6ad58550` |
| 明确同意后的Z结构证据 | 844 | `3d5ab3ad3916ad49dfe1621ff4e7bbc99dc4103b2ab052884f5571c0bb9b9350` |
| 扫描取消Q | 902 | `e08ba3bc1e83afc94c7dd5d48e6c31c34e7a1b4f5a662c2b5225106b93ac5c57` |

附件逐一与当次真实bundle/marker原字符串比较；fetch只作HTTP/权限/淘汰检查，没有冒充下载。实际浏览器截图包括1440×1000和900×800；总控view_image查看联合四图及补单late完成/partial两图，取消文案/报告链接/结构统计可读，无横向溢出。结构面板图为滚动后的视口，不冒称整页截图。AA原四张无关背景截图继续排除，未读取/查看/复制其像素。

公开close发送正常shutdown；独立Process句柄观察AA退出code0，runner也code0。W、AB端口均关闭，私有Chrome close返回，[进程复核](w1-ab-addendum-01-review-20261022/controller/PROCESS-CLOSE.json)无候选树/指定profile所属残留，实际手动终止0。浏览器helper是否进入其内部兜底分支未另记录，不作无证据声明。原profile/下载/fixture/现场保留，无cleanup/删除/ACL/真实用户目录扫描。

## 归档与状态

[总控索引](w1-ab-addendum-01-review-20261022/ARCHIVE.json)归档171文件/2707614字节，含本轮成功/失败审计、完整测试日志、受测源码/适配前后字节、新实际AA捕获、真实联合状态/原生动作日志、受控浏览器截图和实际下载。缓存/二进制/profile/fixture payload/AA排除截图均不归档。[控制器说明](w1-ab-addendum-01-review-20261022/controller/CONTROLLER-NOTES.json)保留首次JSON解析假设失败与纠正。

[最终审计](w1-ab-addendum-01-review-20261022/FINAL-AUDIT.json)记录AA685与AB1472交付路径：除两处测试URL适配，全部与接收提交原blob一致，候选与主线一致。旧A–Z 26任务对象及槽位原样，AA/AB及补单状态/正式票/入口同步，旧返修报告与READY句仅作历史。当前完成的是Windows受控开发预览；自然用户来源/同意鉴真、真实用户scope、生产竞态、macOS、正式桌面和M1保持未验证。
