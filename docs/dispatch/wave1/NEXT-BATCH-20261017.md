# 当前安排：D补单01与E展示投影并行

总控：Codex。日期：2026-10-17。仍属water-wave1，A/B/C已VERIFIED保留；本批不重复派出或改其已验收代码。

| 工作线 | 当前依据 | 外贴内容/结果 |
|---|---|---|
| A补充单01 | 接收HEAD 5e32f51；单票及隔离集成VERIFIED | 已纳入主线；A不重复外贴 |
| D补充单01 | 接收HEAD b92d5b8；check/五测试通过，18个独立数组属性反例失败 | [D补单01](../tickets/WATER-W1-D-ADDENDUM-01-20261017.md)，拒绝非索引数组属性；原8冻结不变 |
| E展示投影 | [正式票](../tickets/WATER-W1-E-REPORT-VIEW-20261017.md)，独立e树、1fce653基线、19冻结、Node/Rust/MSVC baseline通过 | READY待外贴；纯Rust校验后投影，实际输出桥接C纯模型；产品未实现 |
| 总控 | [下一张核心草案](NEXT-CORE-DRAFT.md) | 收D/E各自回执；D验收后才冻结扫描签名/测试并完成派前检查 |

D/E互不依赖、可并行。D只修夹具纯校验，E消费已验收A/C，不读D。D使用Node仅准备测试资产，不增加Node生产扫描器；E使用独立workspace/锁，不改根Cargo，也不替换C演示数据或接页面。

分别把PASTE-D-01.txt和PASTE-E.txt外贴给两个执行对话。A/D原单和A补单不重复派出；READY不代表已外贴，模型由用户安排，总控没有自动启动实现者。证据见[A/D验收报告](../../acceptance/wave1/controller/WATER-W1-AD-REVIEW-20261017.md)与[E派前回执](REPORT-VIEW-READY-REPORT.md)。

## 本批之后

1. D补单交回：先核提交/范围/8锁与旧证据，复跑五测试和19项独立数组边界；通过后独立集成。失败继续编号补单，不让E执行者代修。
2. E交回：核独立workspace/19锁/根Cargo不变，复跑五final门与实际Rust→JSON→C纯模型桥接；通过后独立集成。E无需等待D才能验收，但不能据此宣称页面接线或扫描完成。
3. 正式Rust扫描：D修订验收后，总控冻结scope/只读IO/身份/取消/预算/fault API及测试，再准备独立F树和基线。当前只有DRAFT，无F外贴票。
4. 扫描facts稳定后，再排规则分类/报告组装与正式桌面接线；B规则事实需要对应版本复核，E只提供显示投影，C页面须单独处理正式状态与错误展示。真实macOS验证与发布继续独立放行。
