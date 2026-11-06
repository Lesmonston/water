# WATER-W10-M7 补单 01：旧形状测试迁到 IPC-M35 的新字段（中门）

2026-11-06，总控（Claude）。你的受阻回执（`50fb2ab4`）成立。IPC-M35 给八种旧返回值加了字段，而 `tests/service_v1.rs` 的 `shape()` 严格比较全部键，旧期望读的又是 checkup-v1、m3c-v1 两份旧样例。SPEC 第 11 节没有授权迁移这些旧形状期望。这与 SERVICE-M3C-ADD-01 第 5.1 节当年的情况相同，是总控漏写。可以新开对话执行。

开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-SERVICE-20261106.md`（仍然有效）；
2. 本补单（与原单或 SPEC 冲突时以本补单为准）；
3. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md`。

## 1. 获准修改的旧期望（SPEC 第 11 节四类之外的第五类）

凡是用旧样例做形状比较的地方（`service_ipc_contract`、`service_trends_locations` 等），这八种返回值的期望改为**“旧样例对象，加上 IPC-M35 新增的键”**。新增键的样例值从 `contracts/m35-v1/ui-fixtures-m35.json` 的对应条目里取：

| 旧返回值 | IPC-M35 新增的键 | 取值来源（m35 样例） |
|---|---|---|
| AppState | `quarantine` | 隔离区空时取 `v2_app_state_plain.quarantine`（null），有东西时取 `v2_app_state_quarantine.quarantine` |
| ScanProgress | `locations` | `v2_scan_progress_sequence` 里同阶段的那一条；空闲时为 `[]` |
| CleanProgress | `phase`、`quarantined_bytes` | `v2_clean_progress_sequence` 里同阶段的那一条；空闲时 `phase` 为 `"delete"`、`quarantined_bytes` 为 0 |
| GroupDetail | `rows`、`rows_note_zh` | `v2_group_detail_items` |
| Locations | `home`、`sessions`、`manifests` | `v2_locations` |
| Trends | `clusters` | `v2_trends` |
| CleanPreview | `delete`、`chosen`、`expected_skip` | `v2_clean_prepare_quarantine`。旧形状 `{groupIds}` 的预览全部直接删除，所以 `chosen` 为 null，`delete` 照计划写，`expected_skip` 按进程快照算，没有就为 null |
| CleanResultView | `quarantined` | `v2_clean_result`；旧形状清理没有隔离的部分，所以为 null |

做法自定（比如测试里写一个小函数，把旧样例对象与这几个键合起来再交给 `shape()`），但必须：
- **`shape()` 的键集合比较照旧严格**：不过滤新字段，不在缺样例时返回 null 放行，不按调用场景隐藏新字段；
- 新键**总是出现**（值可以是 null 或空列表），与 IPC-M35 一致；
- 原有的非 null 断言、样例存在断言和其它行为断言一处不改；
- 不改任何样例文件（契约目录里的 JSON 都是冻结的）。

回执逐处写：哪个测试、哪一行、原期望、新期望。

## 2. 卡片菜单里的 `skip`

IPC-M35 与 SPEC 第 5.3 节要求卡片的 `menu` 都带 `skip`，冻结样例里也是这样。**服务照写，不要改**。界面单 M6 另有补单：这一波卡片与汇总行不提供“以后都跳过”，因为接口里只有按单个条目跳过的 `skip_add {itemId}`。整组、整行跳过要另定接口，不在本单做。

## 其余

- 全部照原单与 SPEC：精确 12 个测试、三条负控、依赖、系统函数、白名单都不变。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m7`（分支 `worker/water-w10-m7`），从 `50fb2ab4` 续做。已提交的回执保留，不改写，只在其后新增提交。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W10-M7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md
```

原有各节保留，新增“补单 01”一节，按原单“交回”一节逐项写。受阻则写“WATER-W10-M7 任务受阻”，写清冲突与最小补充需求，不要自行变通。
