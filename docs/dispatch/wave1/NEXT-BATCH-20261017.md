# 当前安排：F执行中，G/H/I并行READY

2026-10-17最新：用户要求多张并行任务，新增G/H/I已分别完成独立树、精确基线、36新锁/五旧锁58唯一文件与实际baseline。三票READY待分别外贴，见[四线计划](PARALLEL-NEXT-PLAN-20261017.md)及[派前回执](PARALLEL-NEXT-READY-REPORT.md)，入口[PASTE-G](PASTE-G.txt)、[PASTE-H](PASTE-H.txt)、[PASTE-I](PASTE-I.txt)。F已观察到原树实现/负控文件，RUNNING未收单，原执行者继续，不重复派票。下面F READY及后续串行安排为历史，G/H/I不等待F实现。

## F原派前记录（历史）

总控当前更新（2026-10-17）：A/B/C/D/E均VERIFIED，旧票不重复外贴。F已冻结22项新材料并通过实际Windows baseline/fixtures预检，独立f树精确基线`fc114eb81125cef7d374deddc95144bcd9aee748`，READY待用户外贴，未记DISPATCHED/RUNNING。见[F正式票](../tickets/WATER-W1-F-SCAN-LAB-20261017.md)及[派前回执](SCAN-LAB-READY-REPORT.md)。

唯一当前外贴句见[PASTE-F.txt](PASTE-F.txt)：

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-F-SCAN-LAB-20261017.md，开始执行任务。
```

F用独立workspace/锁/helper，仅冻结prepare工具可在f树.local新建有界合成文件/链接；Rust生产和测试只读。11正常run/6负例、81057内容字节、44快照及Windows原生链接探针通过，F产品尚不存在，六产品测试和真实桥接待实现后运行。E不获物理fixture权限，macOS未验证。没有自动启动实现者。

F交回后，总控核回执/实现SHA/diff/白名单/新旧锁，复跑六测试与五final门及独立边界，在隔离集成树验收。实质修复发编号补单。F通过后再冻结分类/报告组装与版本化规则接入，随后正式桌面；真实用户scope/竞态安全、脱敏导出、macOS实机和发布另行放行。M1尚未完成。

以下安排为历史，旧PASTE入口不重复执行。

## 原扫描接口准备（历史）

总控：Codex。日期：2026-10-17。仍属water-wave1，A/B/C/D/E已VERIFIED保留；现有票不重复派出或改其已验收代码。M1目标尚未完成。

| 工作线 | 当前依据 | 外贴内容/结果 |
|---|---|---|
| A补充单01 | 接收HEAD 5e32f51；单票及隔离集成VERIFIED | 已纳入主线；A不重复外贴 |
| D补充单01 | 接收HEAD 711c38c；单票与隔离集成check/五测试/19边界全部通过，VERIFIED | 已纳入主线，无需继续外贴；[复验记录](../../acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md) |
| E展示投影 | 接收b285a0e，单票及隔离集成五门/真实桥接九断言/四独立边界全部通过 | VERIFIED并纳入主线；[复验报告](../../acceptance/wave1/controller/WATER-W1-E-REVIEW-20261017.md)，不重复外贴 |
| 总控 | [下一张核心草案](NEXT-CORE-DRAFT.md) | D前置已满足；继续冻结扫描签名/测试及准备独立派前检查，当前无可外贴F票 |

D/E原本独立并行，现均已验收。E消费已验收A/C，不读D。D使用Node仅准备测试资产，不增加Node生产扫描器；E使用独立workspace/锁，不改根Cargo，也不替换C演示数据或接页面。

当前没有新的可外贴实现票，旧PASTE入口保留历史，不重复执行。下一张F只读扫描票须完成新接口/测试冻结、独立树、基线与派前检查；总控没有自动启动实现者。证据见[D复验/集成报告](../../acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)与[E复验/集成报告](../../acceptance/wave1/controller/WATER-W1-E-REVIEW-20261017.md)。

## 本批之后

1. D补单已收单、独立复验并集成，VERIFIED；原基线/8锁/历史证据保留，没有由总控或E执行者代修。
2. E已收单、独立复验并集成，五final门及实际Rust→JSON→C纯模型桥接通过，VERIFIED；不据此宣称页面接线、扫描或脱敏导出完成。
3. 正式Rust扫描：D前置已完成；总控仍须冻结scope/只读IO/身份/取消/预算/fault API及测试，再准备独立F树和基线。当前只有DRAFT，无F外贴票。
4. 扫描facts稳定后，再排规则分类/报告组装与正式桌面接线；B规则事实需要对应版本复核，E只提供显示投影，C页面须单独处理正式状态与错误展示。真实macOS验证与发布继续独立放行。
