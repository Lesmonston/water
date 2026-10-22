# AB补单01 READY：回原AB对话续做

当前状态（2026-10-22）：已收口VERIFIED（Windows受控），集成4b4d6a3。无需执行下方历史外贴句。 [总控复验](../../acceptance/wave1/controller/WATER-W1-AB-ADDENDUM-01-REVIEW-20261022.md)。以下为原执行/派前记录。

2026-10-22。AA单票已集成0f1e5d7，AB原票CHANGES_REQUESTED，补单01已冻结并在原精确干净7b5bdec上实际resume通过；没有启动新实现者。原报告/411归档保持。

仅把下面一句贴回原AB执行对话：

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AB-ADDENDUM-01-20261022.md，继续执行 WATER-W1-AB 补充单01。
```

新wrapper为主检出绝对路径 `F:/new/smaltalk/water/scripts/project-workspace-addendum-check.mjs`；原树不用merge/复制控制提交。首次续做精确HEAD `7b5bdec2fd1af1bf988443d22eb91f504e5bba55`、worker/water-w1-ab且干净，旧f3b87b7基线保持。

[总控收单及缺陷](../../acceptance/wave1/controller/WATER-W1-AAAB-REVIEW-20261022.md)：真正AA.capture_registered末条observer取消仍保留completed元数据、marker skipped/scan_cancelled；AB模型/状态/公开streams HTTP拒绝。原AA四测/AB五测绿不覆盖此边界。新增probe原7正例/3负对照通过、late complete/partial×3入口6次失败按预期复现。

[实际resume](../../acceptance/wave1/controller/w1-aaab-review-20261022/resume/2026-10-22T07-47-13.226Z-2004-resume-result.json)的PASSED只代表已知回归复现，不表示产品修好。新6锁条目/17继承锁/485唯一约束，旧479保持；锁冻结原报告/ARCHIVE，原证据不改。原树已有一次较早resume保留为加锁准备历史，最终以本回执所链07:47:13为准。

补单范围仅model/app/现有两测试、新回执和独立addendum-01证据。先修有效状态接收/文案，再稳定late回归负控→原字节恢复test、原nc1/nc2→逐次恢复test，同一干净SHA三个final。系统原生窗口0、无物理fixture/新AA构建/运行，最多一个私有headless Chrome；真正原生联合链由总控补单收齐后验。

AA INTEGRATED、AB CHANGES_REQUESTED、补单READY、完整联合链未验收分别记录，AA/AB不记VERIFIED。真实用户scope/macOS/桌面/M1仍未放行。
