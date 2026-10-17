# 第一轮：契约底座

总控：Codex。当前先准备一张WATER-W1-A，实际状态以manifest为准。

| 票 | 内容 | 前置与边界 |
|---|---|---|
| WATER-W1-A | Rust workspace、water-contracts、固定序列化/语义校验、定向测试 | 架构基线已提交；没有扫描/删除/UI |

下一轮拟拆扫描、分类与报告，但必须等A完成、总控验收并冻结其真实公开接口；本轮不提前发后置实现票。

权威票面位于主检出的 `docs/dispatch/tickets/WATER-W1-A-CONTRACTS-20261017.md`。执行树从架构提交建立，不需要merge主线取后加的票面。完成/受阻报告在执行树，实际实现提交由总控收取；main未含worker代码时不能宣称功能已有。
