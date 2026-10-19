# W补充单01派前回执

2026-10-19。原W正式接收b65902d8f702bf34097adffd7fbaa7daddabe934，受测63db62b020efff4601a03da7dc561549dcb1f762，收单发现W_DIR_BUDGET，原票CHANGES_REQUESTED。本补单**READY，待原W对话续做**，没有自动实现者、没有新并行写入者；当前无其它已满足前置的新增READY票。

[正式补单](../tickets/WATER-W1-W-ADDENDUM-01-20261019.md)与[总控验收](../../acceptance/wave1/controller/WATER-W1-W-REVIEW-20261019.md)记录范围和复现。只修复模型每目录预算与已记录直接子项数的一致性，保留所有原协议和测试。不让用户补路径或挑基线。

原树F:/new/smaltalk/water/.worktrees/w，分支worker/water-w1-w，首个续做HEAD精确b65902d8f702bf34097adffd7fbaa7daddabe934且干净。新报告父目录存在，addendum-01证据目录由执行者在既有w证据目录下创建。工作树不追加控制提交，不merge取票，全部新控制文件从主检出读取；wrapper绝对路径已真实从原W树运行。

[新锁](../../../contracts/native-review-addendum-v1/freeze.lock.json)5条目、14继承锁、保留原336并合计341唯一主线冻结文件；另保持原W报告、ARCHIVE、RUN-AUDIT三个文件哈希。新SPEC/CASES/probe/wrapper已冻结，原native-host helper/锁/产品/旧证据不改。原A–V任务和槽位状态保持，V仍INTEGRATED，W不集成。

实际命令：

```powershell
node F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs --task WATER-W1-W --mode resume
```

UTC04:22:12.748–04:22:16.412，退出0，前后精确b65902d且干净：[实际回执](../../acceptance/wave1/controller/w1-w-review-20261019/resume/2026-10-19T04-22-12.748Z-31248-resume-result.json)。8原生+24旧输入、等于上限和选择取消正例通过；3矛盾输入×4公开入口12次应拒绝却接受被按预期复现。**baselineStatus=PASSED指派前已知回归复现/范围通过，修复仍未实现/未验证**。不是产品通过。

新wrapper保留原五测/四红绿/三final，追加预算guard稳定负控及四入口回归；0系统原生窗口、无物理fixture，最多一个私有headless Chrome。正常完整五测在总控隔离树已实际通过一次；没有再重复运行它来制造READY。

外贴原W对话：

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-W-ADDENDUM-01-20261019.md，继续执行 WATER-W1-W 补充单01。
```

READY不等于已转贴，补单dispatchedAt/startedAt保持null。修复交回后总控先独立复核再联合V→W；当前M1、真实用户scope、生产竞态、macOS和桌面仍未完成/未验收。
