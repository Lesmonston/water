# AC补单04 READY：编码歧义消除，原对话只补native验收

最新：补单04已受阻，新增[补单05有界取证](AC-DESKTOP-ADDENDUM-05-READY-REPORT-20261024.md)，只回原AC对话，不重贴旧票或重跑04。

2026-10-24。AC03接收b7dc830，产品eb7f801未改；check/test已通过，native失败且原1次静态窗已用。**补单04 READY / baselineStatus=PASSED，尚未外贴，不等于产品验收。**

新ASCII-only文案policy/observer在Windows PowerShell5.1实际无UI预检通过：三脚本Parser0、完整四文案通过、逐项缺失均拒绝，旧模式错码复现；干净原树resume通过，529约束及46/189/88原件保持。总控本轮0窗口/0下载/产品未改/网络未改。

只把下句贴回原AC执行对话：

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AC-ADDENDUM-04-20261024.md，继续执行 WATER-W1-AC 补充单04。
```

仍为 F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac，首次和受测HEAD必须精确干净b7dc83085a5edd9f38c12e70a53658ba6ae9cfa2。绝对入口 F:/new/smaltalk/water/scripts/ac-native-check.mjs，先resume再一次native --final；复用已有check/test/先红/负控，不重复下载或试开产品。

本编号单另增1次静态窗/30秒、0目录窗，旧1次保持已用历史，新reservation独立且失败不循环。产品文件只读，只交本补报告/证据；旧冻结/报告/归档不改，不新开执行者，不merge/reset/清cache或改网络。当前没有自动实现者，不能把READY记为RUNNING。

[总控收单与预检](../../acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-03-REVIEW-20261024.md)、[正式票](../tickets/WATER-W1-AC-ADDENDUM-04-20261024.md)、[依赖安排](AFTER-AC-NATIVE-PLAN-20261024.md)。真实页面文本/正常关闭、新桌面扫描/用户scope/macOS/M1仍未验收。
