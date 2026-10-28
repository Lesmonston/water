# 第六波（M3 扩展第一波）计划与派单

2026-10-28，总控（Claude）。依据 [M3 计划](../../M3-PLAN-20261028.md)（用户 10-28 拍板：五条全按推荐，“可以，出单吧”）。

| 单号 | 改哪里 | 内容 | SPEC | 门 |
|---|---|---|---|---|
| [WATER-W6-I1 Agent 工具规则](../tickets/WATER-W6-I1-RULES-AGENT-20261028.md) | `packages/junk-rules` | 14 条新规则（7 条可清、7 条受保护）与 `electron-app-cache` 补一个定位器 | [RULES-AGENT](../../../contracts/m3-v1/RULES-AGENT.md) | 轻门，final 含 real |
| [WATER-W6-I2 宿主收尾](../tickets/WATER-W6-I2-HOST-M3-20261028.md) | `apps/water/host` | 关机时先停清理；查不到状态不放行关窗；测试补强 | [HOST-M3](../../../contracts/m3-v1/HOST-M3.md) | 重门，native 夹具清理闭环（1 窗） |
| [WATER-W6-I3 界面收尾](../tickets/WATER-W6-I3-UI-M3-20261028.md) | `apps/water/ui` | 测试不连锁超时；去了又回来；恢复成功后重读；清理页停止反馈；过期提示不压正文 | 票内“要做的” | 轻门，截图 21 张 |

- 基点 `d79fb096ef0557430b7dd43634b4d60e8f2de958`（标签 `water-w6-m3-base-20261028`）；工作树 `.worktrees/w6-i1`～`w6-i3`，分支 `worker/water-w6-i1`～`i3`。
- 清单：[manifest.json](manifest.json)；执行者规则：[W6-M3-WORKER-RULES](../W6-M3-WORKER-RULES.md)。
- 派前：两个检查器认第六波清单；三棵树派前 baseline 都通过（[preflight](../../acceptance/wave6/controller/preflight-20261028/)）。
- 目录互不相交，可以同时派。

## 验收要点（总控）

- I1：新规则逐条对照 SPEC；总控本机只读真实冒烟，核对每组命中的目录与体量；进程名只能是 `cursor.exe`、`claude.exe`。
- I2：重门；总控另在真窗口里试“清理进行中关窗”（大夹具、清理开始后关窗，核对等清理停下才关、日志完整）。真实的系统关机不试。
- I3：截图逐张看；总控用“正在重新连接不出现”的变异核对测试之间不再连锁超时。

## 派单句（每条单独复制给一个执行者）

后端与规则票：
- WATER-W6-I1：`你接手 Water 项目 WATER-W6-I1（Agent 工具规则，轻门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W6-I1-RULES-AGENT-20261028.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w6-i1（分支 worker/water-w6-i1）从 d79fb096 开工。`
- WATER-W6-I2：`你接手 Water 项目 WATER-W6-I2（宿主收尾，重门，final 会开 1 个窗口）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W6-I2-HOST-M3-20261028.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w6-i2（分支 worker/water-w6-i2）从 d79fb096 开工。`

界面票（交前端强的模型）：
- WATER-W6-I3：`你接手 Water 项目 WATER-W6-I3（界面收尾，轻门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W6-I3-UI-M3-20261028.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w6-i3（分支 worker/water-w6-i3）从 d79fb096 开工。`
