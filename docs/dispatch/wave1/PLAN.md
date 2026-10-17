# 第一轮：契约底座

总控：Codex。A契约底座继续，追加两张独立并行票B/C；实际状态以manifest为准。调度补充见ADR-003，A冻结不改。

2026-10-17收单：A原四门总控复跑通过，独立wire枚举边界失败，CHANGES_REQUESTED未集成；[补充单01](../tickets/WATER-W1-A-ADDENDUM-01-20261017.md)已准备，外贴句见PASTE-A-01.txt。收尾时B/C均观察到各自实现文件，记独立RUNNING，未验收；本次不改其票面或工作树。

后续B/C完成通知已收，现分别CHANGES_REQUESTED：B原门通过但构造数组跳过来源/顺序校验，见[B补充单01](../tickets/WATER-W1-B-ADDENDUM-01-20261017.md)与PASTE-B-01.txt；C原门重跑通过且截图已看，但未知容量组名称排序失败，见[C补充单01](../tickets/WATER-W1-C-ADDENDUM-01-20261017.md)与PASTE-C-01.txt。三补单互不依赖，各回原执行者续做，main没有提前集成产品代码。

最新：B/C补充单已交回，所有单票门和六项独立反例复验通过，ACCEPTED；总控在独立集成树继续验证，再决定推进main。[当前复验报告](../../acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)优先于上面的历史状态，A仍独立。

| 票 | 内容 | 前置与边界 |
|---|---|---|
| WATER-W1-A | Rust workspace、water-contracts、固定序列化/语义校验、定向测试 | 架构基线已提交；没有扫描/删除/UI |
| WATER-W1-B | 六工具发现/保护catalog、纯Node校验及数据测试 | 独立catalog-v1协议，不依赖A实现；没有本机发现/执行权限 |
| WATER-W1-C | 虚构数据的只读交互原型与Node/真实浏览器检查 | 独立prototype-v1 fixture，不依赖A/B；没有Rust/Tauri/真实扫描/清理 |

下一轮拟拆扫描、分类与正式报告集成，但必须等A完成、总控验收并冻结其真实公开接口；本轮不提前发这些后置实现票。B/C独立交付只减少后续等待，不宣称整条链路已接通。

权威票面位于主检出的 `docs/dispatch/tickets/WATER-W1-A-CONTRACTS-20261017.md`。执行树从架构提交建立，不需要merge主线取后加的票面。完成/受阻报告在执行树，实际实现提交由总控收取；main未含worker代码时不能宣称功能已有。
