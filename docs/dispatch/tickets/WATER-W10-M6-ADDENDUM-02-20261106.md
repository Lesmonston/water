# WATER-W10-M6 补单 02：“以后都跳过”这一波只给单个条目（轻门）

2026-11-06，总控（Claude）。你的受阻回执（`e63161cf`）成立，是总控契约的缺口。设计 v2 与 UI-M35 让判断卡、抽屉汇总行都有“以后都跳过”，但接口只有按单个条目跳过的 `skip_add {itemId}`。卡片只给 `group_id`，汇总行只给 `r:` 开头的行 ID，`group_items` 至多 200 项，跳过名单至多 64 条，拼不出“整组、整行永久跳过”。可以新开对话执行。

开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M6-UI-20261106.md`、补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M6-ADDENDUM-01-20261106.md`（都仍然有效）；
2. 本补单（与原单、补单 01、SPEC、设计 v2 冲突时以本补单为准）；
3. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m6/docs/dispatch/reports/WATER-W10-M6-REPORT.md`。

## 1. 总控的决定：选你回执里的第一种

这一波**整组、整行的“以后都跳过”不做**，只在已经拿到真实条目 ID 的地方提供：

- **判断卡的“⋯”**：只显示 `查看明细`，有线索时再加 `复制线索给 agent`。卡片 `menu` 里的 `skip` 一律忽略（服务照 IPC-M35 照写，界面不显示）。
- **抽屉的汇总行**：
  - 合并出来的行（`row_id` 以 `r:` 开头），以及合并单位（组 ID 以 `m:` 开头）抽屉里的行，“⋯”只有 `展开看每一项`，没有“以后都跳过”；
  - 组里不超过 8 项时一项一行，这时 `row_id` 就是条目 ID（SERVICE-M35 第 5.7 节），“⋯”可以有“以后都跳过”，发 `skip_add {itemId: row_id}`。
- **展开后的单项**（`group_items` 返回的每一项）：可以有“以后都跳过”，发 `skip_add {itemId: item_id}`。
- 发出的 `itemId` 只能是上面两种真实条目 ID。不得把 `group_id`、`r:` 行 ID、`m:` 单位 ID 当条目 ID 发，不得为了凑整组而循环逐项跳过，也不得从显示路径推出父目录。
- 设计 v2 第 3.3、3.4、3.12 节里卡片与汇总行的“以后都跳过”，这一波由本补单取代。整组、整行跳过需要另定接口（版本绑定、上限、原子失败、新成员算不算），总控记为后续事项，不在本单做。

## 2. 测试（只能新增断言，放进指定的测试）

- `ui_v2_conclusion`，失败信息带 `UI_V2_CONCLUSION`：样例 `v2_conclusion_typical` 的五张卡，`menu` 里都有 `skip`，但卡片菜单里都没有“以后都跳过”。
- `ui_v2_drawer_details`，失败信息带 `UI_V2_DRAWER`：
  - `v2_group_detail_rows` 的 `r:` 行没有“以后都跳过”；
  - `v2_group_detail_items` 的逐项行有，点了发出的 `skip_add` 参数恰好是 `{itemId: <该行 row_id>}`；
  - 展开后的单项点“以后都跳过”，发出的是该项的 `item_id`；
  - 任何一次 `skip_add` 的 `itemId` 都不以 `r:` 或 `m:` 开头，也不等于组 ID。
- `ui_ipc_boundary` 的命令数不变（36 个）。

## 其余

- 全部照原单、补单 01 与 SPEC：令牌、只画服务给的数、25 张截图、三条负控、白名单、预算都不变。截图 `menu`、`drawer`、`drawer-big` 按本补单的菜单项画。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m6`（分支 `worker/water-w10-m6`），从 `e63161cf` 续做。已提交的回执与证据保留，不改写，只在其后新增提交。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W10-M6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m6/docs/dispatch/reports/WATER-W10-M6-REPORT.md
```

原有各节保留，新增“补单 02”一节，按原单“交回”一节逐项写。受阻则写“WATER-W10-M6 任务受阻”，写清冲突与最小补充需求，不要自行变通。
