# WATER-W1-W 正式收单：CHANGES_REQUESTED

2026-10-19。接收 `b65902d8f702bf34097adffd7fbaa7daddabe934`，实际受测实现 `63db62b020efff4601a03da7dc561549dcb1f762`，原W树干净。正式报告及提交已交齐，替代上次“尚未交付”的现场状态。总控核验原证据及独立五测通过，但独立公开入口回归发现目录预算一致性缺陷，**不接受、不集成W**；[补充单01](../../../dispatch/tickets/WATER-W1-W-ADDENDUM-01-20261019.md)供原对话续做。V保持INTEGRATED，真正V→W联合链未验证，M1未完成。

## 通过的部分

- 共同基线、分支、祖先、1656交付路径及票面范围通过；实现后的提交仅报告/证据，无final后产品变化。
- [原报告快照](w1-w-review-20261019/submitted/WATER-W1-W-REPORT.md)、[原归档索引](w1-w-review-20261019/submitted/ARCHIVE.json)及RUN-AUDIT保留。1642原始文件/25872812字节与来源、归档、提交blob的长度/SHA256逐项一致；没有读取或运行被排除的额外浏览器payload。
- 三道原final均绑定同一干净受测SHA；源快照/测试与提交一致，原五测试清单、behavior及nc1/2/3四条稳定源码完整红/恢复五绿通过。七份历史失败没有被删除或当成当前绿；早期失败三图缺失按原报告保留限制，未以其它图片替代。
- 336旧冻结通过。旧T真实委托、原生独立模型、Q原字符串、strict UTF-8/64MiB、固定HTTP路由和取消区分的主要实现通过静态复核。
- 在独立 `review-w-20261019` 树、精确接收SHA，新增私有headless浏览器实际执行一次完整五测，5/5通过，无skip/filter。新增1440×1000、900×800和取消三图与原final及先前已实际查看的三图原字节相同；原生策略/计数/Unknown可读，取消没有伪造报告/下载。

这些通过项不覆盖下述新回归，不能据此放行W。

## 阻断项 W_DIR_BUDGET

最终model.mjs SHA256为 `a0948810e2a21286cce29852fdc4da8b812090a89340be3bbea31fd0d2bf78e7`，与上次预审相同。冻结完整捕获的8个finding中，根目录有7个直接子项，dir有1个直接子项。仅将policy.limits.max_dir_entries从32改成1，所有报告/Q原字节保持，总控实际观察到：

1. assertReviewInput接受；
2. readSession原字节入口接受；
3. startServer接受，真实GET /session.json返回200、max_dir_entries=1和completed报告。

这与真实R的目录上限不相容：walk.rs:178按max_dir_entries列目录，180–183在ListError::Limit时记录EntryLimit并直接返回，不能记录超过限值的同目录子项。新规范检查的是从已提供数据即可证明的下界，不是要求页面认证物理来源或重新扫描。已有全局max_entries和深度检查不能替代每目录一致性。

补单进一步冻结3个矛盾输入（完整限值1/6，partial限值1）×4公开入口（含startFromStream），原树实际resume观察12次应拒绝却接受。等于7的完整输入、选择取消无snapshot且limit=1、原8份捕获和旧24份输入作为正对照通过。所有变体明确为内存修改，不冒称新物理捕获。

修复必须对每个父目录独立计数实际已记录直接子项，在模型阶段以原固定错误拒绝；不改预算、截断结果、伪造partial或重算Q。非根分组及跨父目录合法总数也要覆盖。补单只允许永久修改model.mjs及现有model测试，原五测试/四链/三final与全部旧断言保持；另有预算guard本身的稳定生产负控。

## 本次原证据与权限范围

[总控ARCHIVE](w1-w-review-20261019/ARCHIVE.json)含46文件/1146555字节：

- [原交付证据审计](w1-w-review-20261019/controller/2026-10-19T04-14-49.459Z-34888-evidence-audit.json)
- [独立五测及实际模型/流/HTTP缺陷复现](w1-w-review-20261019/controller/2026-10-19T04-15-36.765Z-27236-controller-review.json)
- [实际矛盾输入](w1-w-review-20261019/controller/2026-10-19T04-15-36.765Z-27236-invalid-directory-budget.json)
- [原树补单resume回执](w1-w-review-20261019/resume/2026-10-19T04-22-12.748Z-31248-resume-result.json)

本次系统原生窗口0，没有创建或访问物理扫描fixture，没有构建/调用V，没有改产品、旧helper/冻结或旧W树提交。只新增控制材料、验收脚本/内存回归、隔离浏览器证据及台账。新wrapper位于主检出，原W对话从原树以绝对路径调用，保持首个续做HEAD仍为原b65902d，无需合主线取材料。

## 当前处置

原W为CHANGES_REQUESTED；补单01须以主manifest中的实际resume通过和READY状态为准。原报告、原归档及RUN-AUDIT哈希冻结保留；新增补单证据写独立addendum-01。新锁5条目/14继承锁/341唯一主线冻结文件，原336保持；主检出新控制文件只读，不授权在W树复制/改写它们。

真正V固定程序到W启动器、页面/下载及生命周期需在补单通过后由总控做有界联合验收，本次没有把回放当产品整链。真实用户scope、恶意生产竞态、macOS、桌面壳/打包/发布及M1未验收。单票原五测绿、补单待修复和整体未完成分别记录。
