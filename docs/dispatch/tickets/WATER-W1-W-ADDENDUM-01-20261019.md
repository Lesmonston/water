# WATER-W1-W 补充单01：拒绝目录预算与报告矛盾

当前状态（2026-10-19）：VERIFIED（Windows受控范围），接收df9255b/受测020cd89，集成e38b81c及真实V→W两窗联合验收通过。详[总控验收](../../acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)。无需重贴或继续实现；以下保留原补单派前要求。

派前历史：2026-10-19。原W票CHANGES_REQUESTED，本补单仅在主manifest.addendum01.status=READY、baselineStatus=PASSED时执行。交给原W对话续做，不新开实现者，不重贴原票。

| 项 | 精确值 |
|---|---|
| 权威补单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-W-ADDENDUM-01-20261019.md |
| 原树 / 分支 | F:/new/smaltalk/water/.worktrees/w / worker/water-w1-w |
| 首次续做HEAD | b65902d8f702bf34097adffd7fbaa7daddabe934，必须精确且干净 |
| 原受测实现 | 63db62b020efff4601a03da7dc561549dcb1f762 |
| 原基线 | 30a803537602211ed2a11c106c63fd27cefb260f，保持，不reset |
| 新SPEC / 定向数据 | 主检出contracts/native-review-addendum-v1/SPEC.md / CASES.json |
| 新锁 | 主检出contracts/native-review-addendum-v1/freeze.lock.json |
| 新wrapper（只读主检出） | F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs |
| 新报告 | F:/new/smaltalk/water/.worktrees/w/docs/dispatch/reports/WATER-W1-W-ADDENDUM-01-REPORT.md |
| 新交付证据 | 本树docs/acceptance/wave1/w/addendum-01/ |

先读主检出README/STATUS/AGENTS/工作流、本补、原W票/报告、新SPEC/CASES/锁及总控W收单报告。主检出新控制材料权威，**直接用上表绝对wrapper路径从W树执行**；执行树不追加控制材料，不merge/复制主线取helper，不改旧冻结工具。新wrapper读取主检出附加锁并原样委托W树现有helper；锁内注明原报告/ARCHIVE/RUN-AUDIT保持。

总控已核原1656交付路径、1642文件/25872812字节原归档、三final/四稳定红绿、336冻结。在独立W树新私有headless浏览器，一次完整五测通过，三图与原final原字节相等；随后纯内存独立回归真实观察：原完整捕获根有7直接子项，把max_dir_entries改为1，模型、readSession、startServer都仍接受，并HTTP返回completed。普通原五测未覆盖该问题；这是真正代码缺陷，不是原报告缺失或继续使用旧失败状态。本次总控原生系统窗口0。

修复严格按附加SPEC：对每个已确认原生snapshot，按relative_path最后一个斜线分父目录，实际已记录直接子项数<=max_dir_entries。根为""；不同父目录独立，不把孙辈重复算入根；completed/partial/cancelled都适用；选择取消无snapshot只保留原预算范围验证。不得改caller预算/截断条目/改partial后接受/重算Q/换legacy标签。拒绝仍为原固定Unsupported native review.，公开流/服务不能接入此类矛盾。原生来源不认证仍保留，不能用这点豁免数据内部可证明的一致性。

**永久修改只限：**

- prototypes/native-review/model.mjs
- prototypes/native-review/tests/model.test.mjs（在现有顶层中追加，恰五顶层不变，全部原断言保留）
- docs/dispatch/reports/WATER-W1-W-ADDENDUM-01-REPORT.md
- docs/acceptance/wave1/w/addendum-01/内本补新json/log/txt/png及ARCHIVE.json

原W报告、全部原w证据、其余9产品/测试文件、旧A–V、原根Cargo/契约/输入/helper及336冻结不变。原behavior/nc1允许临时改server，nc2临时改app，nc3临时改host，仍按原冻结定义留红后立即原字节恢复，不得提交这些文件的永久变化；新red-budget只临时禁用实际新增guard。无新依赖、生产测试开关、任意程序路径或权限扩展。

首先在W树运行：

```powershell
node F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs --task WATER-W1-W --mode resume
node F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs --task WATER-W1-W --mode red-budget
```

resume已由总控实际通过：核精确干净HEAD/原范围/新旧锁，确认8原生+24旧输入及等于上限/选择取消正例通过，并观察3矛盾输入×4公开入口共12次W_DIR_BUDGET。resume的PASSED仅指**已知回归按预期复现**，不表示修复已完成。不要再跑原首次baseline，它要求原30a8035且产品不存在。

在现有测试追加完整/partial超限、非根分组、等于上限、跨父目录合法总数和取消无snapshot对照，明确新变体为内存合成，保持原64MiB/UTF-8/实际下载/所有语义断言；修复后运行wrapper suite（原完整五绿+新四入口回归通过）。只用冻结输入/Node内存/loopback及私有headless Chrome，不建物理扫描fixture，不构建/调用V，不触发系统目录对话框。

源码/测试稳定后实际禁用预算guard运行red-budget，确认W_DIR_BUDGET有效红；立即原字节恢复并suite完整五绿。若修复前red使用的测试字节不同，不能拿它当稳定版证明。然后按原定义完成behavior、nc1、nc2、nc3四条当前字节的完整五红→原字节恢复完整五绿。所有模式均用本补绝对wrapper，模式名保持；wrapper原样委托原helper，不替换/放宽其proofAudit。保留全部失败和恢复快照，不用编译/CDP/超时造红。

一树一次一门、最多一个私有headless Chrome、每子命令180秒；当前各门通过且字节不变不重复整套，不留watch/后台循环。提交干净实现后串行：

```powershell
node F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs --task WATER-W1-W --mode check --final
node F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs --task WATER-W1-W --mode test --final
node F:/new/smaltalk/water/scripts/native-review-addendum-check.mjs --task WATER-W1-W --mode browser --final
```

final同时核新稳定预算红/恢复链、原四链和当前回归。新wrapper日志在.local/checks/WATER-W1-W-ADDENDUM-01；原委托helper仍写.local/checks/WATER-W1-W。两者本补产生的全部新原字节日志/快照/三图/实际Q下载及ARCHIVE来源/长度/SHA保存至addendum-01，不覆盖原w交付文件或改变原ARCHIVE。公共截图名可按原工具更新，逐次新文件与原profile/下载保留，无清理。

报告绑定实际受测SHA/报告提交定位、实际模型、逐需求/命令退出/全部失败、新预算红绿和原四链/final、原字节恢复、实际看图及未验证项。后续报告提交仅报告/证据，无产品改动。交回后停测停改；不push/merge/reset/clean、不代总控更新台账。总控收本补后另做真正V→W有界联合验收，当前Windows受控不等于真实用户scope/macOS/桌面/M1完成。

报告首行及通知：

```text
WATER-W1-W 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w/docs/dispatch/reports/WATER-W1-W-ADDENDUM-01-REPORT.md
```

受阻保留现场并用同一路径写“任务受阻”，列最小补充需求；不向用户索取临时放宽，不改冻结或接管别票。
