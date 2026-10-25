WATER-W1-AC 补充单06 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-06-REPORT.md

2026-10-25，执行者交回状态 **SUBMITTED**。按补单06明确修订的应用窗口计数契约，本次唯一native通过：初次与关闭前均raw2/主窗1/固定框架目标1/未知0/无效0，主窗身份不变，四文案真实UIA命中，主进程正常exit0、实际私有profile及冻结childClose通过，墙钟5510ms、无强制终止。产品未改；旧03/04/05失败保持。此报告不宣称总控VERIFIED、独立集成、真实桌面扫描、用户scope或macOS/M1通过。

## 身份、基线及复用证明

| 项 | 实际值 |
|---|---|
| 执行者/模型 | 原AC执行对话，Codex / GPT-6；会话未暴露更细模型ID |
| 工作树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 首次及本次native受测干净HEAD | **8a3b475918684a18be318415a9f7a54470c916b8** |
| 产品/测试/锁实现 | eb7f80178191e233068015bbc26dc9798ac8cb22；14文件只读，字节一致 |
| productionHash | 38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d |
| testHash | 211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7 |
| Cargo.lock SHA | c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8 |
| 复用的final check/test | 补单03同干净82d04aaeef73030f65bc0a070b99a5517fd5d6a3的两个通过记录，按06明示授权复用；不是本补在新HEAD重新运行 |
| 后加交回提交 | 仅本报告和addendum-06证据，最终worker分支HEAD定位；不夹带产品、控制或锁修改 |

新入口实际核验复用记录及source/test快照哈希，保留02有效AC_BEHAVIOR先红、nc1/AC_CAPABILITIES、nc2/AC_NAVIGATION及每次即时恢复/完整三绿引用。按票没有重跑check/test/Clippy、先红/负控、无UIprobe或下载。542约束、全部旧报告与425项归档保持。无子代理/worker、push/merge、主台账/其它树/其它票修改。

## 命令与退出

从原树先执行唯一绝对入口 `node F:/new/smaltalk/water/scripts/ac-window-check.mjs --task WATER-W1-AC --mode resume`，再执行一次同入口 `--mode native --final`。隐藏非交互本地launcher只调用该native命令并捕获实际OS退出/stdout/stderr，不改环境/断言。

| 门/命令 | 实际结果 | 原字节证据 |
|---|---|---|
| 06:21:27 resume | Node0/status passed，前后精确干净8a3b475，542约束及14文件保持；固定框架锁/包/源码及tar成员核对通过 | [resume](../../acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-27.616Z-38840-resume-result.json) |
| 06:21:48 native --final | 工具定位/版本、offline/locked build、observer、childClose全部0；外层helper/launcher0，status passed；来源pin在启动前再次通过 | [native结果](../../acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-native-result.json)、[launcher退出0](../../acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-48.007Z-launch-29784-exit.json) |
| 主窗/页面/关闭 | 两份完整自有快照通过新计数契约，四文案实际命中，WindowPattern.Close后observer exitCode0/cleanupError=null，外层nativeExit={code:0,signal:null} | [完整UIA](../../acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-uia.txt)、[observer原日志](../../acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-native-5.log) |
| 冻结childClose | 全部7个捕获子PID结束查询0，remaining=[]；这是本次冻结成功分支实际运行，不再是05的补充查询替代 | [childClose日志](../../acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-native-6.log) |
| 06:23:33补充结束核查 | 捕获主/子8个PID及本票profile/checker匹配均无残留，命令0；手动终止0、入口终止请求false | [PROCESS-END](../../acceptance/wave1/ac/addendum-06/raw/PROCESS-END.txt) |

native进程PID6856，记录墙钟5510ms（启动后至关闭/子进程收尾段），低于30秒。整门06:21:48.141Z至06:22:25.381Z含启动前来源/构建与前后冻结审计，不混称为产品存活时间。新增窗口allocation只用一次，累计03–06共4次，旧三次及reservation原样保留；0目录窗、无重试或提前手工试开。

## 两份真实快照及文案

初次06:22:19.4264088Z、关闭前06:22:22.7850136Z均为完整2行，metadataTruncated=false、readError=null；rawRootCount=2、applicationWindowCount=1、frameworkEventTargetCount=1、unclassifiedRootCount=0、invalidRootCount=0，decision.accepted=true。原始2未被改写为1。

| 字段 | 精确应用主窗 | 固定框架事件目标 |
|---|---|---|
| PID | 6856 | 6856 |
| Name / Class | Water Desktop Preview / Tauri Window | 空串 / Tao Thread Event Target |
| ControlType | ControlType.Window | ControlType.Pane |
| HWND | 61933540 | 29231650 |
| RuntimeId | [42,61933540] | [42,29231650] |
| IsOffscreen / control / content | false / true / true | false / true / true |
| WindowPattern | true | false |
| Bounds | [128,83,1268,997] | [0,0,18,18] |

两份快照的主PID/HWND/RuntimeId完全一致，finally再次核绑定后只关闭主窗，未关闭框架事件目标或未知窗口。计数按06新契约明确修订，不泛化忽略Pane/offscreen/handle0；目标完整属性、来源pin及尺寸均满足冻结条件。两次采样不证明所有瞬时窗口或生产竞态，UIA/IsOffscreen字段也不是物理像素可见性证明。

本次真实names中包含 `Water`、`只读开发预览`、`桌面壳已启动`、`尚未接入扫描`，pageAccepted=true；同时保留标题、Web content及静态说明的原文本。四文案来自真实主窗后代UIA枚举，不是旧05回放或合成字符串。实际看图、截图、像素读取均0，不把UIA描述为看图或截图通过。

## 私有profile、子进程及来源

真实有界父PID/创建时间链保存conhost20424、WebView32584及42840/39540/41044/40880/15888；实际WebView `--user-data-dir` 为本树 `.local/desktop-webview/preview-6856-1792909338074288100/EBWebView`。冻结childClose.remaining=[]，补充结束查询也无主/子残留；无退出超时、cleanup错误、强制终止或手动终止。所有profile/cache/日志保持，不读profile内容或清理，不纳Git其内容。

固定来源使用 [FRAMEWORK.json原字节](../../acceptance/wave1/ac/addendum-06/controller-contract/FRAMEWORK.json) 和 [本补freeze副本](../../acceptance/wave1/ac/addendum-06/controller-contract/freeze.lock.json)；resume、启动前及结束审计实际核锁内tao0.37.2、包SHA `d5777b06fe6435126ae8d816eba269e050e1e10d302cf5461e9c49eccabc3548`、发布包内event_loop.rs SHA `bfe777ba15f00b9ca2a1fdd5093b2b02102dbafb5d23eca9f002d1f0c40eaf8a` 和唯一tar成员与现有源码字节一致。只读既有缓存，未新下载/解包落盘/运行上游。Apache-2.0、仓库https://github.com/tauri-apps/tao；包声明Git SHA2d9b2ba15247879787878ae565e350bcc1b9f622且dirty=true，不冒称精确远程发布树或新增独立官方比较。原其他Windows依赖来源/许可证仍沿用此前完整清单，本补不重跑metadata或发布许可证审查。

## 逐需求交回

| 要求 | 结果 |
|---|---|
| 产品/测试/锁14文件只读 | 原实现字节保持；公开配置/导航策略、无JS/IPC/plugins/扫描、纯静态资产语义不变；旧check/test和生产负控按授权复用 |
| 框架pin与新计数 | 启动前pin通过；两次完整快照raw2/main1/helper1/unknown0/invalid0，身份/属性满足冻结契约 |
| 四文案 | 本次真实UIA均命中、pageAccepted=true |
| 正常退出/子进程 | 主进程exit0/signal null，cleanupError=null；冻结childClose实际运行并无残留，追加结束查询一致 |
| 环境/预算 | Rust1.95/jobs1/私有home-target-tmp/offline-locked，build0；产品段5510ms、仅一次新allocation、目录窗0；无下载/网络/代理/证书/持久Cargo配置变化 |
| 交付状态 | 仅SUBMITTED，等待总控独立验收与集成；未自行改主台账或宣称VERIFIED |

## 全部失败与原字节

本补resume/native及全部子命令均成功，没有新的产品门失败或未完成native尝试。旧官方registry、Clippy、编码、严格Count失败与原425项证据保持，不追认为通过。

归档作者工具有一次失败：`Get-Content -Raw -Encoding UTF8 .../archive-evidence.txt | node`经Windows PowerShell默认us-ascii管道，导致脚本文案字面量转码、派生归档断言exit1；当时尚未创建索引。直接 `node .../archive-evidence.txt` 读取原UTF-8脚本后全部核对通过、exit0，不修改系统编码或脚本，不重跑产品/UI。[ARCHIVE-OPERATION.json](../../acceptance/wave1/ac/addendum-06/raw/ARCHIVE-OPERATION.json)为事件记录，不伪造缺失的原始stderr文件；[执行记录](../../acceptance/wave1/ac/addendum-06/EXECUTION-NOTES.md)保留经过。这不是产品失败或有效负控。

[ARCHIVE.json](../../acceptance/wave1/ac/addendum-06/ARCHIVE.json)逐项source/archive/bytes/SHA保存本次resume/native、14文件快照、两份真实根/页面文本、子进程/profile参数/退出、唯一reservation及控制来源副本；排除cache/crate/依赖源码、target/binary/tmp/profile、用户/物理fixture/AA图片，旧425项就地核验不覆盖。报告及索引自身不做自引用hash。[HANDOFF-AUDIT](../../acceptance/wave1/ac/addendum-06/HANDOFF-AUDIT.json)再次核542约束、旧原件与产品字节及本次成功事实。报告/原始日志空白退出分别如实记录，全部逐路径暂存、日志-f，不清洗原始字节。

[逐路径暂存/空白记录](../../acceptance/wave1/ac/addendum-06/raw/STAGING-CHECKS.json)：手写报告/证据exit0，原始日志exit2，原始PowerShell输出中的CRLF保留。该作者检查与native成功退出分别记录，不将原始日志清洗为绿。[HANDOFF-VALIDATION](../../acceptance/wave1/ac/addendum-06/HANDOFF-VALIDATION.json)记录source/archive/暂存blob、报告链接和产品不变复核；验证记录随后加入索引，不做自引用hash。

交回后停测停改/无自有后台进程，不push/merge/改主台账。静态Windows native本补成功不等于独立产品验收、发布、真实桌面→AA/AD扫描整链、真实AA→AD、用户scope/自然同意鉴真、生产竞态、macOS或M1完成。
