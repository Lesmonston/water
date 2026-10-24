# AC补单03收单与native控制编码修订

2026-10-24，总控。接收 **b7dc83085a5edd9f38c12e70a53658ba6ae9cfa2**，产品/测试/锁实现eb7f801不变，AC仍BLOCKED未集成。已确认03同干净82d04aa的final check/test通过，native失败且1次静态窗口已用；本轮修总控控制入口并无UI实测，补单04 READY，只回原AC对话。

## 收单结果

[成功收单审计](w1-ac-native-20261024/controller/2026-10-24T05-46-37.830Z-submission-audit.json)核分支、父提交、精确干净HEAD及产品14文件与eb7f801一致；原46/189及新88项归档分别77278/10666362/4518684字节，source/archive/提交blob与SHA一致。旧历史产品快照按原ef0b7c4核对，不能拿后来合法修改的README冒充旧source。首版审计误比当前README导致的失败记录保留；修正的是总控审计逻辑，不是产品修复或负控。

03 final check：metadata/策略/fmt/clippy通过；test：指定三测通过；两门与native均同干净82d04aa，source/test哈希分别`38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d`/`211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7`。原先红/两生产负控/即时恢复三绿的复用链保留，没有重跑已绿字节。

native：build0，UIA helper1，原窗口已找到但文案断言失败，外层记录强制终止PID41836，正常exit=null；不得记为成功关闭。原88项完整归档在[worker索引](w1-ac-native-20261024/worker/ARCHIVE.json)，[原报告](w1-ac-native-20261024/worker/ORIGINAL-REPORT.txt)保留失败、未保存实际UIA文本和进程观察时间限制。原`systemNativeDialogs=0`只是失败前未赋成功计数，不能当未开窗，实际1次预算已占用。

## 控制修订与实际无UI验证

原PS1无UTF-8 BOM，Windows PowerShell5.1/1252把中文正则解析为乱码；静态Parser值及正确中文不能匹配两乱码模式的内存证据已复核。真实WebView文本当时没有留存，不能反推页面正常。

新增ASCII-only共享文案policy、observer和无UIprobe，绝不改原PS1、ac-final-check、Clippy参数模块或旧freeze。新observer与probe调用同一文案函数，按原产品SPEC观察全部四文案，持久化失败前有界自有UIA文本；关闭自有窗口、记录正常/失败退出及子进程。只看自有PID/title，不截像素、不读取无关窗口。四文案比旧helper只核两中文项更严格，已在SPEC明示；不会删断言消除失败。

[实际preflight](w1-ac-native-20261024/preflight/2026-10-24T05-50-02.628Z-27916-preflight-result.json)：同干净b7dc830，529约束/原件/产品哈希通过；三PS1 ASCII/Parser0，真实未改HTML包含四文案，完整文本通过，逐项缺失的4项负向检查全部拒绝，旧两模式仍无法匹配。runtime确调用同一policy。**没有运行产品、UIA或native，0窗口/0下载**，不称本次native通过。

[实际resume](w1-ac-native-20261024/preflight/2026-10-24T05-52-16.278Z-38460-resume-result.json)再次核精确干净b7dc830/14文件和529约束，并读03实际check/test原字节证明；没有产品测试/编译或新窗口。[控制审计](w1-ac-native-20261024/controller/CONTROL-AUDIT.json)分清已实测纯文案/解析与尚未实测的真实窗口和退出路径。

## 下一步与预算

[补单04](../../../dispatch/tickets/WATER-W1-AC-ADDENDUM-04-20261024.md)和[READY指令](../../../dispatch/wave1/AC-DESKTOP-ADDENDUM-04-READY-REPORT-20261024.md)：原对话只做新native验收，产品只读，复用check/test和旧先红/负控。该编号单新增1次静态窗/30秒、0目录窗；原已用1次保留，累计分配2次，不删旧reservation或自动恢复预算。总控没有提前用窗，也没有自动启动实现者。

产品如果实际仍失败，按失败原因另派，不能放宽文案/正常退出断言或借验收改产品。桌面→AA/AD整链依赖AC验收，未READY；AA→AD真实报告是独立总控验收准备，现有内存回放不冒称真实链路；Mac实机等其余前置详见[推进安排](../../../dispatch/wave1/AFTER-AC-NATIVE-PLAN-20261024.md)。当前唯一满足外贴前置的是原AC04，AD/AE不用重贴。

[进程收尾](w1-ac-native-20261024/controller/PROCESS-CLOSE.json)：未见AC自有检查器/桌面/WebView残留，手动终止0。本轮系统窗/目录窗/截图0；未改网络/代理/证书/global Cargo或产品字节，profile/cache/旧日志保留。

[归档](w1-ac-native-20261024/ARCHIVE.json) 135项/4894544字节，source/archive/bytes/SHA含成功及失败审计、控制源码、无UI门/原14快照和完整03交回，排除cache/crate/target/binary/profile/AA图片。旧523保持，六新条目/22继承锁共529，其余30任务和槽位对象保持。[最终审计](w1-ac-native-20261024/FINAL-AUDIT.json)明确AC未验收、新native未运行和原失败保持。报告/原始日志空白及暂存字节另按真实退出记录，不改洗失败。

[??????????](w1-ac-native-20261024/controller/STAGING-CHECKS.json)?????exit0?????exit2???PowerShell CRLF??native?????????????[??????????](w1-ac-native-20261024/VALIDATION.json)?????????blob?529/??30??????????native???
