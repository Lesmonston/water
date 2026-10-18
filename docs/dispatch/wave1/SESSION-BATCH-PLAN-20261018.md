# 当前后续批次：J受控会话 / K调用方供数页面

2026-10-18，总控Codex。用户要求继续安排，首先核对是否漏派：九个A–I任务全部VERIFIED，13份原票/补单均归入已验收任务，九树在接收HEAD且干净；旧未派/在途任务为0。[台账审计](../../acceptance/wave1/controller/w1-session-batch-preflight-20261018/old-task-audit.json)记录实际Git与报告。旧CHANGES_REQUESTED/待外贴文字为历史，NEXT-CORE-DRAFT已被F正式票替代，不是漏派单。

当前收单更新：J保持VERIFIED；K原门与隔离负控通过，但真实J→K服务拒绝合法entry-budget根issue空串，现CHANGES_REQUESTED，[补充单01](../tickets/WATER-W1-K-ADDENDUM-01-20261018.md)已见原执行者启动审计与精确回归输入，现记RUNNING。K产品未合主线，真实页面未验收；见[K报告](../../acceptance/wave1/controller/WATER-W1-K-REVIEW-20261018.md)。下方为原派前分工。

| 票 | 独占产物 | 本次可观察结果 | 前置 |
|---|---|---|---|
| J | packages/lab-session | 一个真实F/G/A/E/H受控会话入口，传同一取消token/observer，返回有界完整快照 | 已验收A/F/G/E/H；冻结J协议/真实D夹具 |
| K | prototypes/lab-reader | startServer接收调用方内存bundle，页面显示其会话/元数据，停止固定读contracts作产品来源 | 已验收I模型；冻结J wire及真实旧链路捕获，不等待J实现 |

新[ADR-008](../../decisions/ADR-008-controlled-session-and-supplied-reader.md)、[J协议](../../../contracts/lab-session-v1/SPEC.md)、[K协议](../../../contracts/lab-reader-v1/SPEC.md)、session-batch新冻结保持A–I/根Cargo及六旧锁83唯一文件。j/k新树和分支，不复用旧worker树或清理夹具。

J仅冻结prepare在自己.local创建一批合成文件/链接，Rust生产和测试只读。K仅内存bundle/固定静态文件和独立Chrome，没有物理fixture权限。J一条jobs1离线检查，K一条检查/最多一个Chrome。新helper保存完整五测红/恢复和源码；final要求同一干净提交及当前源码恢复链。

K资产来自已验收F/G/A/E/H的实际受控执行，只加J协议封装，不宣称J已经实现。两票收单后总控将真实J结果直接传K.startServer并验页面；不能用CDP拦截或冻结expected替代。真实用户scope、分类/工具适配、去重容量、Tauri/IPC/macOS与删除另排，M1未完成。
