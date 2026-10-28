# 第七波（M3 收尾）计划与派单

2026-10-28，总控（Claude）。用户 10-28 晚：“先做M3的收尾吧”。把[第六波收单验收](../../acceptance/wave6/controller/WATER-W6-REVIEW-20261028.md)记下的遗留（中级 3 条与低级若干）收成四张小票，各改各的目录；原排在第七波的孤儿进程顺延到第八波（[M3 计划](../../M3-PLAN-20261028.md)开头的补记）。

| 单号 | 改哪里 | 内容 | SPEC | 门 |
|---|---|---|---|---|
| [WATER-W7-J1 宿主补遗](../tickets/WATER-W7-J1-HOST-FIX-20261028.md) | `apps/water/host` | 服务没起来时关窗与退出都不等；退出时限包括第一次查状态；补“查不到计时重置”的测试；补强两条源码断言 | [HOST-M3-FIX](../../../contracts/m3-v1/HOST-M3-FIX.md) | 重门，native 夹具清理闭环（1 窗） |
| [WATER-W7-J2 界面补遗](../tickets/WATER-W7-J2-UI-FIX-20261028.md) | `apps/water/ui` | 恢复后清掉连接类错误；补读不挡进度；同页读取按先后；读屏隔 100 ms；过期不加后缀；清理页停止说明改成实际行为；提示条上方不露正文；测试失败都带标记 | [UI-M3-FIX](../../../contracts/m3-v1/UI-M3-FIX.md) | 轻门，截图 21 张 |
| [WATER-W7-J3 服务补遗](../tickets/WATER-W7-J3-SERVICE-FIX-20261028.md) | `packages/water-service` | 清理进度的组序号从 1 数（修“第 0 / 1 组”）；扫描记录写失败时删掉孤立快照 | [SERVICE-M3-FIX](../../../contracts/m3-v1/SERVICE-M3-FIX.md) | 轻门，final 含只读真实体检 |
| [WATER-W7-J4 规则措辞与出处](../tickets/WATER-W7-J4-RULES-FIX-20261028.md) | `packages/junk-rules` | 六处说明改成实际行为；`opencode.db*` 带上数据库旁文件；四条本机观察出处改正；数据版本 `2026-10-28.2` | [RULES-M3-FIX](../../../contracts/m3-v1/RULES-M3-FIX.md) | 轻门，final 含 real |

- 基点 `282876950df40a14b7abeec6ab27677ea0adc897`（标签 `water-w7-m3-fix-base-20261028`）；工作树 `.worktrees/w7-j1`～`w7-j4`，分支 `worker/water-w7-j1`～`j4`。
- 清单：[manifest.json](manifest.json)（由 [make-wave7.mjs](../../acceptance/wave7/controller/make-wave7.mjs) 生成）；执行者规则：[W7-M3-FIX-WORKER-RULES](../W7-M3-FIX-WORKER-RULES.md)。
- 派前：两个检查器认第七波清单；四棵树派前 baseline 都通过（[preflight](../../acceptance/wave7/controller/preflight-20261028/)）。
- 目录互不相交，可以同时派。

## 这一波不做的遗留

- 清理执行器（`packages/junk-clean`）的几条低级：大小写不同的名字改名竞态少算一个、帧间裸指针、刚建好的深目录第一次常被判“已变化”跳过。都偏保守（少删、少算），没有误删风险；改执行器要过重门，留到 M4 前统一处理。
- 第四波 G5 记下的几条释放量统计细节（都偏保守）。
- 校验器不拒“受保护家目录里更深的可清规则”：设计如此，由扫描期保护。

## 验收要点（总控）

- J1：重门、独立审查；总控变异要包括第六波没抓到的两种（`ExitRequested`、累计计时）；可以复用 [w6-i2-close-during-clean.mjs](../../../scripts/acceptance/w6-i2-close-during-clean.mjs) 再试一次真窗口“清理进行中关窗”。
- J2：截图逐张看，重点 `cleaning`（新句子）与 `stale`（上方不露正文）；独立审查。
- J3：总控在真窗口里清理多组夹具时看“第 1 / N 组”（或用服务测试的进度记录核对）。
- J4：逐字核对六处文字与四条出处；规则数、目标数不变。

## 派单句（每条单独复制给一个执行者）

后端与规则票：
- WATER-W7-J1：`你接手 Water 项目 WATER-W7-J1（宿主补遗，重门，final 会开 1 个窗口）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W7-J1-HOST-FIX-20261028.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w7-j1（分支 worker/water-w7-j1）从 28287695 开工。`
- WATER-W7-J3：`你接手 Water 项目 WATER-W7-J3（服务补遗，轻门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W7-J3-SERVICE-FIX-20261028.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w7-j3（分支 worker/water-w7-j3）从 28287695 开工。`
- WATER-W7-J4：`你接手 Water 项目 WATER-W7-J4（规则措辞与出处，轻门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W7-J4-RULES-FIX-20261028.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w7-j4（分支 worker/water-w7-j4）从 28287695 开工。`

界面票（交前端强的模型）：
- WATER-W7-J2：`你接手 Water 项目 WATER-W7-J2（界面补遗，轻门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W7-J2-UI-FIX-20261028.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w7-j2（分支 worker/water-w7-j2）从 28287695 开工。`
