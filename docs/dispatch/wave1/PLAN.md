# 第一轮：契约底座

**当前（2026-10-23）：A–AB及八补单保持VERIFIED（Windows受控范围），d2a1365已收口。AC桌面依赖/最小静态壳、AD同源合并项目报告、AE macOS移植研究三独立票已冻结并实际baseline通过，READY待分别外贴，无自动实现者；新产品/研究材料未交付。共同基线4b8a1d、24新冻结/18继承锁共509唯一约束，旧485及28任务/槽位保持。AC是唯一新Tauri依赖初始化者，派前仅MSVC/WebView2检查、未fetch/build Tauri；AD真实既有AB/W/Q/Z与六项late入口通过；AE仅核研究输入，不当Mac验证。派前系统窗口0；AC整票1静态桌面窗/0目录窗，AD单私有Chrome/0原生，AE无UI。真实桌面扫描须AC/AD验收后下一波，用户scope、自然同意鉴真、生产竞态、macOS与M1仍未验收。** 详[AC/AD/AE派前回执](DELIVERY-WAVE-READY-REPORT-20261023.md)，以下为派前历史。

总控：Codex。A契约底座继续，追加两张独立并行票B/C；实际状态以manifest为准。调度补充见ADR-003，A冻结不改。

2026-10-17收单：A原四门总控复跑通过，独立wire枚举边界失败，CHANGES_REQUESTED未集成；[补充单01](../tickets/WATER-W1-A-ADDENDUM-01-20261017.md)已准备，外贴句见PASTE-A-01.txt。收尾时B/C均观察到各自实现文件，记独立RUNNING，未验收；本次不改其票面或工作树。

后续B/C完成通知已收，现分别CHANGES_REQUESTED：B原门通过但构造数组跳过来源/顺序校验，见[B补充单01](../tickets/WATER-W1-B-ADDENDUM-01-20261017.md)与PASTE-B-01.txt；C原门重跑通过且截图已看，但未知容量组名称排序失败，见[C补充单01](../tickets/WATER-W1-C-ADDENDUM-01-20261017.md)与PASTE-C-01.txt。三补单互不依赖，各回原执行者续做，main没有提前集成产品代码。

最新：B/C补充单已通过单票门、六项独立边界及独立集成门，VERIFIED（当前Windows范围）；受测整合提交为`d002c0c1d91db47fb8a685a07e0115ac9ad189c9`，主线纳入两产物。[当前复验报告](../../acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)优先于上面的历史状态，A仍独立，后置扫描票未派。

下一批已准备[A补单续做+D夹具工厂](NEXT-BATCH-20261017.md)：D精确r1基线/8冻结/Node24/链接probe通过，READY等待用户外贴，不改变A/B/C原权限。下一张Rust核心仅DRAFT，不给依赖未验收A的实现票。

接手后的最新状态：A补单已通过单票及隔离集成复验，VERIFIED并纳入主线；D已收单，原五测试通过但独立数组未知属性校验失败，CHANGES_REQUESTED，[补单01](../tickets/WATER-W1-D-ADDENDUM-01-20261017.md)待外贴。上面的派前与RUNNING状态为历史；当前以[A/D验收报告](../../acceptance/wave1/controller/WATER-W1-AD-REVIEW-20261017.md)和manifest为准。

当前追加E独立报告展示投影：只依赖已验收A/C，不依赖D，独立workspace/19锁/精确e树基线通过，READY待外贴。D补单01与E可并行，详见[本批安排](NEXT-BATCH-20261017.md)与[E派前回执](REPORT-VIEW-READY-REPORT.md)。扫描票仍为DRAFT，不因E准备完成而放行。

最新收口：D补单01已通过单票与隔离集成五测试/19独立边界，VERIFIED并纳入主线，D无需再外贴。E分配/19冻结不变，继续原票。正式扫描的D前置已满足，仍需新接口/测试冻结与派前检查，尚无F正式票。见[D复验报告](../../acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)。

当前收口：E也已通过单票和隔离集成五门、实际桥接九断言及四独立边界，VERIFIED并纳入主线。A/B/C/D/E现有票均不重复派出；扫描接口/测试冻结仍未完成，F继续DRAFT。见[E复验报告](../../acceptance/wave1/controller/WATER-W1-E-REVIEW-20261017.md)。

| 票 | 内容 | 前置与边界 |
|---|---|---|
| WATER-W1-A | Rust workspace、water-contracts、固定序列化/语义校验、定向测试 | 架构基线已提交；没有扫描/删除/UI |
| WATER-W1-B | 六工具发现/保护catalog、纯Node校验及数据测试 | 独立catalog-v1协议，不依赖A实现；没有本机发现/执行权限 |
| WATER-W1-C | 虚构数据的只读交互原型与Node/真实浏览器检查 | 独立prototype-v1 fixture，不依赖A/B；没有Rust/Tauri/真实扫描/清理 |

下一轮拟拆扫描、分类与正式报告集成，但必须等A完成、总控验收并冻结其真实公开接口；本轮不提前发这些后置实现票。B/C独立交付只减少后续等待，不宣称整条链路已接通。

权威票面位于主检出的 `docs/dispatch/tickets/WATER-W1-A-CONTRACTS-20261017.md`。执行树从架构提交建立，不需要merge主线取后加的票面。完成/受阻报告在执行树，实际实现提交由总控收取；main未含worker代码时不能宣称功能已有。
