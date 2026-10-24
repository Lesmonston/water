WATER-W1-AC 补充单04 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-04-REPORT.md

2026-10-24，**BLOCKED**。resume通过、既有check/test按票复用；本补唯一一次native失败。新helper在自有PID的根层UIA计数大于1时退出，没有留下根元素明细、固定title或页面文本，随后正常退出等待超时并终止桌面进程。不能确定是额外可见产品窗口、隐藏console/其它根元素或初始化时序；没有再次开窗或修改产品/检查器。

## 身份、基线与复用

| 项 | 实际值 |
|---|---|
| 执行者/模型 | 原AC执行对话，Codex / GPT-6；会话未暴露更细模型ID |
| 树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 初始及本次受测干净HEAD | **b7dc83085a5edd9f38c12e70a53658ba6ae9cfa2** |
| 产品/测试/锁实现 | eb7f80178191e233068015bbc26dc9798ac8cb22；14文件只读且原字节一致 |
| source/test哈希 | `38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d` / `211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7` |
| Cargo.lock SHA | c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8 |
| 复用的check/test | 补单03同干净82d04aaeef73030f65bc0a070b99a5517fd5d6a3的两final通过；新入口实际核来源/快照/哈希及各两条旧生产负控引用 |
| 本补提交范围 | 仅本报告与addendum-04证据；最终worker分支HEAD定位交回提交，产品仍为eb7f801原字节 |

旧先红、nc1/AC_CAPABILITIES、nc2/AC_NAVIGATION和即时恢复/完整三绿原样保留，按补单复用，没有重复执行。旧46/189/88归档与报告、529约束保持，主检出/台账/其它票只读。无子代理、worker、push/merge或源码变更。

## 实际命令、退出和失败

从本树运行唯一绝对入口。resume命令为 `node F:/new/smaltalk/water/scripts/ac-native-check.mjs --task WATER-W1-AC --mode resume`；native命令为同入口 `--mode native --final`。本地隐藏launcher只执行该native命令一次，保留OS退出/stdout/stderr；未改环境或断言。

| 门 | 实际结果 | 原字节证据 |
|---|---|---|
| 06:08:19 resume | Node exit0/status passed；529约束与14文件哈希通过，前后精确b7dc830且干净；无产品测试/窗口 | [resume](../../acceptance/wave1/ac/addendum-04/raw/2026-10-24T06-08-19.924Z-25160-resume-result.json) |
| 06:09:24 native --final | rustup工具定位/版本命令均0；Cargo offline/locked build0；UIA helper1，原始错误 Unexpected own top-level window count。外层helper/launcher exit1 | [native结果](../../acceptance/wave1/ac/addendum-04/raw/2026-10-24T06-09-24.589Z-38388-native-result.json)、[UIA原始日志](../../acceptance/wave1/ac/addendum-04/raw/2026-10-24T06-09-24.589Z-38388-native-5.log) |
| 正常退出/收尾 | helper未识别main、closeRequested=false；外层等3秒后 Owned desktop exit timeout，记录terminationRequested=true、exit=null。非正常exit0通过 | [native进程](../../acceptance/wave1/ac/addendum-04/raw/2026-10-24T06-09-24.589Z-38388-native-process.json)、[launcher退出1](../../acceptance/wave1/ac/addendum-04/raw/2026-10-24T06-09-24.468Z-launch-37476-exit.json) |
| 追加静态取证 | 只读自己既有exe的DOS/PE头，非执行；命令exit0。随后进程查询exit0，无再次UI观察/启动 | [PE头元数据](../../acceptance/wave1/ac/addendum-04/raw/PE-HEADER-INSPECTION.json)、[进程收尾](../../acceptance/wave1/ac/addendum-04/raw/PROCESS-END.txt) |

native门从06:09:24.590Z至06:09:47.632Z，整门23.042秒。`nativeWallMs`尚未赋值，因为正常退出await抛错，因此不能声称精确桌面存活时长。额外窗口allocation已经占用；03历史1次加本补1次，共2次尝试，两个reservation均保留。目录窗/截图/像素读取0，未重试、未清profile或缓存。

## 逐需求状态和未知项

| 需求 | 当前状态 |
|---|---|
| 原产品与配置/导航边界 | 14文件与eb7f801一致，先红/稳定负控/恢复和03最终check/test复用；无JS/IPC/plugins/任意路径/扫描语义不变。本补未重跑产品单测或Clippy |
| 固定依赖与环境 | Rust1.95、私有home/target/tmp、jobs1、offline/locked和600秒构建上限实际使用；build0。没有下载、写Cargo配置、改代理/网络/证书或复制cache别名 |
| 一次静态窗口/根层计数 | 实际启动PID41736一次；helper在Count>1 guard失败。代码在guard之后才写systemWindows/挑选title，故保存的systemWindows/title均null，不能据此判0窗口或列出具体数量/可见性 |
| 四文案实际观察 | [原始UIA记录](../../acceptance/wave1/ac/addendum-04/raw/2026-10-24T06-09-24.589Z-38388-uia.txt)中required是正确Unicode四文案，旧中文乱码症状未出现；但names=[]、pageAccepted=false，文案检查尚未执行，**没有真实页面通过** |
| 正常关闭/子WebView/profile | closeRequested=false，exit=null；children=[]，没有运行中子进程/profile参数证据。新私有profile在代码中的指定保持，但完整实际链路未验收。后续未见残留不等于正常关闭通过 |
| 写入范围 | 仅本报告/证据及获准.local构建/日志/profile；没有改产品、检查器、旧报告/归档、主台账或其它树 |
| 其它平台/整链 | 未接AA/AD，不访问真实用户目录/物理fixture/AA旧图片。桌面扫描整链、用户scope、自然同意鉴真、生产竞态、macOS/M1未验收 |

## 可确认的故障与最小后续条件

可确认本次失败发生于**自有PID根层UIA元素计数guard**，发生在固定title识别和清理窗口对象赋值之前。其后正常退出等待超时是后续失败。保存的UIA记录没有实际根元素数量、名字、类、handle或可见性，不能重建这些事实，也不能把names空数组解释为页面空白。

静态PE取证发现调试exe是Windows CUI/subsystem3，main.rs仅在非debug_assertions时启用windows_subsystem；它是可能影响根层计数的线索，不足以证明多了可见console或证明helper把隐藏元素误计为窗口。此处既不宣称产品缺陷已确诊，也不直接放宽guard。

需要总控编号修订：先持久化有界自有根元素名称/类/handle/PID/offscreen等，再判计数；把固定title主窗口识别/安全收尾与额外窗口断言分开，保留对真实额外可见窗口的失败；根据新证据决定控制计数问题还是产品修复。如果改Rust子系统等产品字节，另发实现范围并按稳定字节证明规则处理。任何下一次native都必须有新的明示窗口allocation和精确续做基线，不能自动重置本补。详细取证缺口见 [NATIVE-BLOCKER.md](../../acceptance/wave1/ac/addendum-04/NATIVE-BLOCKER.md)。上述修订均未应用/测试，未向用户索要临时放宽。

## 进程、原字节与交回

[PROCESS-END.txt](../../acceptance/wave1/ac/addendum-04/raw/PROCESS-END.txt)在06:11:24按本票PID、直接父PID、检查器及私有profile参数查询，没有发现匹配残留；手动终止0，入口记录终止请求1。没有运行时完整父子链快照，因此不把此结束查询描述为已证明每个子WebView正常退出。所有profile、缓存和日志保留。

实际看图/截图/像素读取0；UIA没有图片证据，不描述为看图通过。[EXECUTION-NOTES.md](../../acceptance/wave1/ac/addendum-04/EXECUTION-NOTES.md)保留执行与只读取证限制，包括总控复核文档的尾部显示/旧计数问题；本角色未修改主线材料。

[ARCHIVE.json](../../acceptance/wave1/ac/addendum-04/ARCHIVE.json)逐项source/archive/bytes/SHA保留本补resume/native、好态源码快照、唯一launcher/退出、失败UIA/reservation/进程/PE元数据及限制。不纳exe本体、crate/cache/source包、target/tmp/profile内容、真实用户/物理fixture/AA图片。[HANDOFF-AUDIT.json](../../acceptance/wave1/ac/addendum-04/HANDOFF-AUDIT.json)核529与旧46/189/88原件及产品字节保持。报告/索引自身不做自引用hash；报告与原始日志空白检查分别如实记录、逐路径暂存（日志-f）。

[逐路径暂存和空白检查](../../acceptance/wave1/ac/addendum-04/raw/STAGING-CHECKS.json)：手写报告/证据exit0，原始日志exit2（native-5.log原PowerShell JSON行的CRLF），原字节保留，不清洗日志。[HANDOFF-VALIDATION.json](../../acceptance/wave1/ac/addendum-04/HANDOFF-VALIDATION.json)记录来源/归档/暂存blob及本地链接核对；验证记录随后加入索引，不做自引用hash。

本补受阻交回，停止产品与检查进程；仅报告/证据后加提交，不push/merge/改台账，不标SUBMITTED/VERIFIED。旧check/test仍为获准复用的通过记录，本次native失败、两次窗口尝试的历史和未验证范围保持。
