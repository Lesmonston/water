# WATER-W9-L3：增长的对比基准与历史文案（轻门，final 含只读真实体检）

2026-11-02，正式单，总控（Claude）。以[第九波 manifest](../wave9/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与 L1、L2、L4 同时进行，各改各的目录；编译时只用它们现有的类型。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W9-L3-SERVICE-20261102.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w9-l3 / worker/water-w9-l3 |
| 精确首次 HEAD | 57ecd7ce42a98f9932faecc69e5d82c648991669，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m3d-v1/SERVICE-M3D.md（本单的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C.md；F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C-ADD-01.md；F:/new/smaltalk/water/contracts/m3c-v1/IPC-M3C.md；F:/new/smaltalk/water/contracts/checkup-v1/IPC.md；增长的新规则见 F:/new/smaltalk/water/contracts/m3d-v1/SCAN-M3D.md 第 4 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W9-M3D-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w9-l3/docs/dispatch/reports/WATER-W9-L3-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w9-l3/docs/acceptance/wave9/l3/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final（不碰清理计划） |

先读：
1. 规则与 SPEC SERVICE-M3D 全文，再读 SERVICE-M3C、IPC 第 2、3 节里 `history_list` 与增长相关的形状；
2. 代码：
   - `packages/water-service/src/service.rs`：
     - 体检开始时取上一条记录，约 520～530 行；
     - 体检结束时算增长并保存记录，约 830～855 行；
     - 重新载入时的 `previous_at`，约 250～258 行；
     - `history`，约 1312～1323 行；
   - `src/views.rs`：组详情的增长，约 509 行；洞察的日期与文案，约 575～610 行；
   - `src/clean.rs`：清理结果视图里每组的 `status`，约 348～370 行；
3. `tests/service_v1.rs`：`service_trends_locations`、`service_clean_flow` 与假时钟 `f.fake.now`。

## 要做的（全部在 `packages/water-service/`）

SPEC 第 1～3 节：
1. 增长的对比基准：比本次开始早至少 24 小时结束的、最近一次完成的体检；保存 `growth_base_scan_id`；`previous_at` 改为基准的时间，旧记录照旧；
2. 停下的体检在历史里显示 `已停止，识别 N 类位置`；
3. 清理摘要只数真删了东西的组，有失败时写出失败数。

**不变**：IPC 的形状、清理计划、`previous_scan_id` 与 `consumed`、趋势与预测的其余算法、依赖。

## 白名单

- `packages/water-service/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W9-L3-REPORT.md`
- `docs/acceptance/wave9/l3/` 下 `--mode archive` 生成的证据

## 测试

`packages/water-service/tests/service_v1.rs`，仍是精确 6 个测试，名字不变：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`、`service_hardening`。

- 新断言照 SPEC 第 4 节加在指定的测试里，失败信息带 `SERVICE_M3D_GROWTH_BASE`、`SERVICE_M3D_HISTORY`、`SERVICE_M3D_CLEAN_SUMMARY`。
- 预计不需要改原有断言；若必然要改，先写受阻回执。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 增长基准改回“上一条记录” | `SERVICE_M3D_GROWTH_BASE` |
| nc2 | 清理摘要的组数改回视图里的全部组数 | `SERVICE_M3D_CLEAN_SUMMARY` |

只改 `packages/water-service/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。要找只有新断言才抓得到的位置。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W9-L3 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 是一次只读真实体检，清理关闭，与第八波 K4 相同。

## 预算与边界

- 原生窗口 0、选择框 0、浏览器 0；不新增系统函数。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W9-L3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l3/docs/dispatch/reports/WATER-W9-L3-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～3 节逐条：改了哪里、怎么满足；
- 每个检查命令与结果，`real` 的结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W9-L3 任务受阻”，写清冲突与最小补充需求，不要自行变通。
