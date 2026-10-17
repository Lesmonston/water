# 当前并行批次：F/G/H/I

2026-10-17，总控Codex。用户要求一次安排更多可并行任务。F已观察到在原f树实现，保持原票/接口/基线；新增G/H/I由用户分别外贴给三个独立执行者。任务是否READY以manifest及[派前回执](PARALLEL-NEXT-READY-REPORT.md)为准，不以文档存在推断已开工。

| 线 | 独占产物 | 运行依赖 | 可并行原因 |
|---|---|---|---|
| F | packages/fixture-scan | 已验收A/D | 原票只做合成夹具真实元数据遍历 |
| G | packages/scan-report | 已验收A；bridge使用已验收E | 只消费冻结F JSON协议/合成输入，不链接F crate |
| H | packages/summary-export | 已验收A | 纯内存白名单汇总，不等扫描或G |
| I | prototypes/report-reader | 已验收E输出 | 冻结真实E投影合成报告，不等F/G/H |

G/H各独立workspace/锁/Cargo home/target/tmp；I零依赖Node、单独profile/loopback服务，所有目录位于各自树.local。共享新冻结只由总控写，执行者没有重叠产品文件。F原22锁及A–E锁/helper/基线不变。每线一个定向检查，F/G/H可各jobs1构建，I最多一个Chrome；不整仓/watch/coverage。

G把身份/条目种类/深度/issue来源保留在sidecar，报告全未知保护、总量未知；H去除直接标识和文本但不承诺不可关联；I区分来源状态/覆盖/容量与筛选结果，常驻合成只读标记。合成输入/空白浏览器预检不是新产品功能完成，macOS IO及正式桌面壳未验证。

外贴入口：[G](PASTE-G.txt)、[H](PASTE-H.txt)、[I](PASTE-I.txt)。F原执行者继续，不重发。每个入口只交一个执行对话，用户安排实际模型，总控不自动启动实现代理。

收单后总控分别核SHA/diff/锁/日志/负控并复测，通过后在独立集成树接线。F→G真实桥接、G报告→H/E→I跨模块链路在依赖验收后验证；不由执行者互相改代码/合主线。不提前开放真实用户scope、分类可删判断、去重回收、清理、Tauri或发布。实质修复发编号补单。
