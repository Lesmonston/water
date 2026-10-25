WATER-W1-AC 补充单05 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-05-REPORT.md

2026-10-24，**BLOCKED**。本次已保存完整真实根快照：一个Tauri主窗加一个`Tao Thread Event Target` Pane；严格Count2仍拒绝，没有忽略额外根。唯一已确认主窗由WindowPattern安全关闭、进程exit0，无强制终止；四文案检查未到达，native未通过。没有重试、改产品或改冻结判定。

## 身份、基线与复用证明

| 项 | 实际值 |
|---|---|
| 执行者/模型 | 原AC对话，Codex / GPT-6；会话未暴露更细模型ID |
| 工作树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 本次初始及受测干净HEAD | **a3334875139a3d6b03e1e71aecb6baad7c1c6711** |
| 产品/测试/锁实现 | eb7f80178191e233068015bbc26dc9798ac8cb22；14文件只读且字节一致 |
| productionHash | 38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d |
| testHash | 211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7 |
| 锁SHA | c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8 |
| 复用的check/test | 补单03同干净82d04aaeef73030f65bc0a070b99a5517fd5d6a3的两个final；新入口逐字节核对来源/快照/哈希及两条旧proof引用 |
| 后加交回提交 | 仅本报告/addendum-05证据；最终worker分支HEAD定位提交，产品仍为eb7f801 |

旧AC_BEHAVIOR先红、nc1/AC_CAPABILITIES、nc2/AC_NAVIGATION及即时恢复/完整三绿按票复用，不重跑。535约束与旧46/189/88/51（共374项）报告/归档保持。无子代理/worker、主线/台账/其它票修改、push/merge、依赖下载或持久网络/Cargo配置变化。

## 命令、退出与预算

只从原树调用唯一绝对入口 `node F:/new/smaltalk/water/scripts/ac-native-diagnostic-check.mjs --task WATER-W1-AC --mode resume`，再一次同入口 `--mode native --final`。隐藏非交互本地launcher只调用该冻结命令并保存实际OS退出，不改环境/断言。

| 门/命令 | 实际退出与结果 | 原字节证据 |
|---|---|---|
| 08:44:24 resume | Node0/status passed；前后精确干净a333487，535约束与14源码哈希通过；无产品测试/UI | [resume](../../acceptance/wave1/ac/addendum-05/raw/2026-10-24T08-44-24.238Z-9848-resume-result.json) |
| 08:45:11 native --final | 工具定位/版本与offline/locked Cargo build均0；observer1、外层helper/launcher1。原始错误保留为Unexpected own top-level window count | [native结果](../../acceptance/wave1/ac/addendum-05/raw/2026-10-24T08-45-11.554Z-32552-native-result.json)、[observer原日志](../../acceptance/wave1/ac/addendum-05/raw/2026-10-24T08-45-11.554Z-32552-native-5.log) |
| 自有主窗关闭 | 已核PID/title/非零handle/WindowPattern主窗在finally重新核绑定后请求关闭，cleanupError=null，helper exitCode0；外层nativeExit={code:0,signal:null}，nativeWallMs=2176，无退出超时/终止请求 | [完整真实UIA](../../acceptance/wave1/ac/addendum-05/raw/2026-10-24T08-45-11.554Z-32552-uia.txt)、[native进程](../../acceptance/wave1/ac/addendum-05/raw/2026-10-24T08-45-11.554Z-32552-native-process.json) |
| 08:47:12补充收尾查询 | 只读捕获的主/子8个PID与本票profile/checker匹配，命令0；均不存在。非冻结childClose分支通过记录 | [PROCESS-END](../../acceptance/wave1/ac/addendum-05/raw/PROCESS-END.txt) |
| 固定依赖源码取证 | 首次可选`.cargo-checksum.json`读取ENOENT/exit1；随后既有crate归档SHA与锁一致，内存tar成员与当前源码逐字节一致，命令0。只读，不运行上游/产品、不下载/落地解包 | [源码来源/失败与验证](../../acceptance/wave1/ac/addendum-05/raw/FRAMEWORK-SOURCE-INSPECTION.json) |

补单05只启动PID43004一次，新增allocation已用；03/04的两次尝试与reservation保持，累计3次。实际产品墙钟2176ms，小于30秒；整门08:45:11.554Z至08:45:41.699Z含审计/构建，不混称为产品存活时长。目录窗、截图、像素读取及实际看图0。无再次UIA/窗口启动、check/test/Clippy/先红/负控或下载。

## 两个真实根元素

同一自有PID43004，1次CacheRequest快照，reported/captured=2/2；rootMetadataTruncated=false、两个readError均null，control/content均true。

| 字段 | 根0 | 根1 |
|---|---|---|
| Name | Water Desktop Preview | 空串 |
| ClassName | Tauri Window | Tao Thread Event Target |
| ControlType | ControlType.Window | ControlType.Pane |
| HWND | 27788410 | 38930730 |
| IsOffscreen | false | false |
| WindowPattern available | true | false |
| Bounds | [224,83,1268,997] | [0,0,18,18] |
| RuntimeId | [42,27788410] | [42,38930730] |

共享policy返回mainCount1/mainIndex0/accepted=false；主窗仅用于失败清理，未用于绕过Count2。`systemWindows=2`来自两个UIA根，不擅自改成1，也不将它描述为经像素确认的两个用户可见窗口。IsOffscreen=false和非零handle均原样保留，没有隐藏根/handle0例外。

## 来源线索与判定边界

额外类名可与**已锁定tao0.37.2发布包**的Windows `src/platform_impl/windows/event_loop.rs`第629行对应；第628行函数`create_event_target_window`、第188行调用、第650–672行创建及680–687行样式更新给出事件循环来源线索。仓库URL为https://github.com/tauri-apps/tao，许可证Apache-2.0；包内声明Git SHA为`2d9b2ba15247879787878ae565e350bcc1b9f622`且dirty=true，未声称远程该commit与发布树完全相同。

实际依据是锁内归档SHA `d5777b06fe6435126ae8d816eba269e050e1e10d302cf5461e9c49eccabc3548`及源码文件SHA `bfe777ba15f00b9ca2a1fdd5093b2b02102dbafb5d23eca9f002d1f0c40eaf8a`；已对既有压缩包校验并比较对应tar成员。没有独立远程Git比较，未复制第三方应用代码或运行上游脚本。源码的layered事件目标非显示意图属于静态实现说明，**不是本次像素可见性证明，也不是当前合同允许忽略该根的依据**。[完整出处及边界](../../acceptance/wave1/ac/addendum-05/raw/FRAMEWORK-SOURCE-INSPECTION.json)保留精确路径/版本/行号/哈希及缺文件检查失败。

本次已消除04“不知道额外根是什么”的证据缺口，但仍须总控据真实快照和固定依赖来源决定精确的应用窗口计数契约或产品修复。不能现场提高Count、泛化忽略Pane/offscreen/类名或改Rust子系统；任何后续窗口需新的编号allocation和精确续做基线。建议见 [NATIVE-FINDINGS.md](../../acceptance/wave1/ac/addendum-05/NATIVE-FINDINGS.md)，未应用/测试任何修订。

此前CUI/console只是静态候选线索；本次实际额外根是上述Tao Pane，不能继续把它直接称为console窗口。捕获到conhost子进程与根元素身份是两类事实，分别保留。

## 逐需求结果、进程和未验证范围

| 要求 | 实际状态 |
|---|---|
| 14产品与环境 | 源码/配置/导航/静态资产/锁不变，旧check/test与先红/负控复用；Rust1.95/jobs1/私有home-target-tmp/offline-locked保持，build0，无网络/Cargo设置改动 |
| 严格根唯一 | 真实2根，完整保存后按原policy失败；未降低断言，未将取证完成记为native通过 |
| 四文案实际观察 | required四文案是正确Unicode；Count guard先失败，names=[]/pageAccepted=false，尚未枚举主窗后代文本，不能说页面空白或文案通过 |
| 主窗绑定/关闭 | 唯一精确主窗绑定复核、WindowPattern关闭、进程正常exit0，cleanupError=null，强制终止0 |
| 子进程/私有profile | 保存1个conhost和6个WebView进程的有界父PID/创建时间链；实际`--user-data-dir`位于本树.local/desktop-webview/preview-43004-1792831536931784100/EBWebView。未读profile内容，原目录保留 |
| 子进程结束 | 严格失败后冻结childClose分支未执行，不能记该门通过；另行只读结束查询已确认主窗及全部7个捕获子PID不存在。没有持续跟踪每个子进程的正常退出过程 |
| 其它范围 | 不接AA/AD/扫描，不读真实用户/物理fixture/AA图片；真实桌面整链、用户scope/自然同意/生产竞态、macOS/M1仍未验收 |

[PROCESS-END](../../acceptance/wave1/ac/addendum-05/raw/PROCESS-END.txt)记录捕获的子PID25316/31276/33004/13708/43584/24036/32712以及主PID43004均无残留，额外本票profile/checker匹配0；手动终止0、入口终止请求false。UIA是结构取证，实际看图/截图/像素读取仍0。

## 原字节与交回

[ARCHIVE.json](../../acceptance/wave1/ac/addendum-05/ARCHIVE.json)逐项source/archive/bytes/SHA保存新resume/native/14源码快照、真实根/清理/子进程/退出/唯一reservation、源码出处与检查失败。只保留源码取证元数据，不进Git依赖源码包/cache/crate/target/binary/tmp/profile；旧374项原件就地核验，不覆盖。[HANDOFF-AUDIT](../../acceptance/wave1/ac/addendum-05/HANDOFF-AUDIT.json)核535冻结、产品哈希、两真实根、严格失败及实际主窗exit0。报告/索引自身不做自引用hash，手写与原始日志空白检查分别记真实退出，逐路径暂存（日志-f）。

[逐路径暂存/空白检查](../../acceptance/wave1/ac/addendum-05/raw/STAGING-CHECKS.json)：手写报告/证据exit0，原始日志exit2（native-5.log原PowerShell JSON行CRLF），原字节保留而不清洗。[HANDOFF-VALIDATION](../../acceptance/wave1/ac/addendum-05/HANDOFF-VALIDATION.json)记录source/archive/暂存blob、链接及产品不变核对；验证记录随后加入索引，不做自引用hash。

交回后停止产品/检查进程，后加提交仅报告/证据，不push/merge/自行改主台账。本次诊断已获得完整新明细并安全收尾，但按票仍**任务受阻**，不标SUBMITTED/VERIFIED；旧失败和全部三次窗口历史不抹除。
