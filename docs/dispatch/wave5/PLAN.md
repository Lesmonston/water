# 第五波计划：M2 清理 Beta

2026-10-27，总控（Claude）。依据已拍板的 [M2 计划](../../M2-PLAN-20261027.md)：用户 10-27 四条都按推荐。本页只写本波的票与顺序，理由见 M2 计划。

## 票

五张票，目录互不相交，同时派出：

| 单号 | 改哪里 | SPEC | 门 |
|---|---|---|---|
| WATER-W5-H1 清理执行器收尾 | `packages/junk-clean` | [CLEAN-M2](../../../contracts/m2-v1/CLEAN-M2.md) | 重门 |
| WATER-W5-H2 服务收尾 | `packages/water-service` | [SERVICE-M2](../../../contracts/m2-v1/SERVICE-M2.md) | 重门 |
| WATER-W5-H3 宿主打开清理 | `apps/water/host` | [HOST-M2](../../../contracts/m2-v1/HOST-M2.md) | 重门，含夹具清理闭环（1 个窗口） |
| WATER-W5-H4 界面 M2 | `apps/water/ui` | 票内“要做的” | 轻门，截图 |
| WATER-W5-H5 Rust 构建目录规则 | `packages/junk-rules` | [RULES-M2](../../../contracts/m2-v1/RULES-M2.md) | 轻门 |

执行者规则：[W5-M2-WORKER-RULES](../W5-M2-WORKER-RULES.md)。

## 派前准备（总控已做）

1. **两个检查器认第五波清单**：`WATER-W5-*` 读 `docs/dispatch/wave5/manifest.json`。
2. **离线依赖源**：两份复制到 `F:\new\smaltalk\water\.offline-cache\`（逐字节一致），本波清单从那里取。旧波次清单不改。
3. **夹具清理闭环**：
   - 桌面检查器的 native 模式新增：生成合成夹具、预置设置（七个分类关闭，另加夹具文件夹；受保护位置仍只读统计、不可勾选）、结束后核对夹具删留与清理记录；
   - 总控在自检树（只把清理开关打开）里用同一份配置跑通（10-27）：1 个窗口，17 秒，夹具缓存目录 3,145,815 字节删除、失败 0，源码文件与浏览器配置原样，日志有 intent 与 result，退出码 0。证据在 `docs/acceptance/wave5/controller/selftest/h3/`。

## 合入后

1. 五票各自验收：
   - H1～H3 走重门：新树 final、总控负控、独立审查；
   - H1 另跑总控快照与竞态用例；
   - H3 在真窗口里清夹具，开窗前告诉用户。
2. 第三次主线整合检查，含夹具清理闭环。
3. 新的 release 版。
4. M2 计划第 3 节的自清理：用户本人按清理按钮。
5. M2 达成报告与交接。

## 派单句（每条单独复制给一个执行者）

后端与规则票：
- WATER-W5-H1：`你接手 Water 项目 WATER-W5-H1（清理执行器 M2 收尾，重门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H1-CLEAN-M2-20261027.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w5-h1（分支 worker/water-w5-h1）从 3f907897 开工。`
- WATER-W5-H2：`你接手 Water 项目 WATER-W5-H2（服务 M2 收尾，重门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H2-SERVICE-M2-20261027.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w5-h2（分支 worker/water-w5-h2）从 3f907897 开工。`
- WATER-W5-H3：`你接手 Water 项目 WATER-W5-H3（宿主打开清理，重门，final 会开 1 个窗口）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H3-HOST-M2-20261027.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w5-h3（分支 worker/water-w5-h3）从 3f907897 开工。`
- WATER-W5-H5：`你接手 Water 项目 WATER-W5-H5（Rust 构建目录规则，轻门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H5-RULES-M2-20261027.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w5-h5（分支 worker/water-w5-h5）从 3f907897 开工。`

界面票（交前端强的模型）：
- WATER-W5-H4：`你接手 Water 项目 WATER-W5-H4（界面 M2，轻门）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H4-UI-M2-20261027.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w5-h4（分支 worker/water-w5-h4）从 3f907897 开工。`

## 补单

- **WATER-W5-H5 补单 01**（10-27）：执行者受阻，原票“原有断言不变”没考虑新增规则带来的数量变化。补单只授权改三处旧字面值（规则数 60→61、目标数 214→216、数据版本 `2026-10-26.2`→`2026-10-27.1`），并把 `windows.json` 的数据版本加一。从回执提交 `d6c83ea9` 续做，不重跑 baseline。
  - WATER-W5-H5 补单 01：`你继续 Water 项目 WATER-W5-H5（Rust 构建目录规则，轻门）补单 01。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H5-ADDENDUM-01-20261027.md，按其中列出的顺序读原票、规则、契约与上一轮回执，在 F:/new/smaltalk/water/.worktrees/w5-h5（分支 worker/water-w5-h5）从 d6c83ea92996b148a585a3d6719c6a9e8babf25c 续做。`
