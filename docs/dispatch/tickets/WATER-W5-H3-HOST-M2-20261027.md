# WATER-W5-H3：宿主打开清理（重门，含 1 个窗口）

2026-10-27，正式票，总控（Claude）。以 [第五波 manifest](../wave5/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 H1、H2、H4、H5 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W5-H3-HOST-M2-20261027.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w5-h3 / worker/water-w5-h3 |
| 精确首次 HEAD | 3f9078972d7f958fad6bfd42e68f022dd659539e，必须干净；`apps/water/host` 是 G6 验收合入后的版本 |
| SPEC | F:/new/smaltalk/water/contracts/m2-v1/HOST-M2.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/m2-prep-v1/HOST-FINISHING.md；F:/new/smaltalk/water/contracts/desktop-v1/WIRING.md；F:/new/smaltalk/water/contracts/desktop-v1/HOST.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W5-M2-WORKER-RULES.md；宿主的写法沿用 F:/new/smaltalk/water/docs/dispatch/W3-DESKTOP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w5-h3/docs/dispatch/reports/WATER-W5-H3-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w5-h3/docs/acceptance/wave5/h3/ |
| 门 | 重门：3 条负控 + check、test、native 三个 final |

先读：
1. 规则与 SPEC HOST-M2 全文，再读 HOST-FINISHING、WIRING、HOST；
2. 背景：[G6 收单验收](../../acceptance/wave4/controller/WATER-W4-G5G6G7-REVIEW-20261027.md)的 G6 一节（独立审查的中级 1 条、低级 4 条）；
3. 代码：`apps/water/host/src/lib.rs`（`run`）、`commands.rs`、`service.rs`、`startup.rs`、`data.rs`，以及 `tests/host_v1.rs`。

## 要做的（全部在 `apps/water/host/`）

SPEC 第 1～6 节逐条实现：
1. **宿主自己持有后端**：
   - 托管 `BackendSlot`，命令经它转发；
   - `run_return` 返回后先取走并丢弃后端，再 join 激活线程，再释放实例锁。
2. **清理进行中关窗**：
   - 阻止关闭，用 `stop_cleaning_and_wait` 停清理并等它停下，再关窗；
   - 不在清理时照常关。
3. **打开清理**：`CLEAN_ENABLED = true`；原 `HOST_CLEAN_DISABLED` 断言改为 `HOST_CLEAN_ENABLED`。
4. **信号文件只更新时间**，不截断。
5. **启动接线可测**：`on_lock_result`，`run` 必须用它。
6. **去掉 `\\?\` 后核对含义**。

第 7 节的夹具清理闭环由检查器完成：
- 你不写这部分代码，但实现必须让它通过；
- 它用的界面就是本树 `apps/water/ui` 现有的界面，本票不改界面。

**不变**：SPEC 第 9 节列的一切，包括：
- 依赖、配置、权限文件、图标；
- 不新增 `unsafe`，不开进程、不联网，不读别的环境变量；
- 不用 Tauri 的 `.setup()`，检查器会拒绝。

## 白名单

- `apps/water/host/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`、`tauri.conf.json`、`capabilities/main.json`、`icons/`）
- `docs/dispatch/reports/WATER-W5-H3-REPORT.md`
- `docs/acceptance/wave5/h3/` 下 `--mode archive` 生成的证据（含整机截图）

## 测试

`apps/water/host/tests/host_v1.rs`，仍是精确 5 个测试，名字不变。新断言照 SPEC 第 8 节加在已有测试里，失败信息带标记：
- `HOST_BACKEND_RELEASE`
- `HOST_CLOSE_DURING_CLEAN`
- `HOST_CLEAN_ENABLED`
- `HOST_RUN_WIRING`
- 已有的 `HOST_SINGLE_INSTANCE`、`HOST_DATA_JUNCTION` 按 SPEC 改断言或补断言。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | `take` 之后转发仍交给原后端，或 `take` 不取出 | `HOST_BACKEND_RELEASE` |
| nc2 | 清理中不调用 `clean_stop` 就返回 | `HOST_CLOSE_DURING_CLEAN` |
| nc3 | 清理开关改回 `false` | `HOST_CLEAN_ENABLED` |

→ `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W5-H3 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`native --final`，再 `archive`。

**`native --final` 会在本机弹出 1 个 Water 窗口**：
- 检查器在本树 `.local/w5-h3-native/` 下生成合成夹具，并预置设置：七个分类全部关闭，另加这个夹具文件夹。受保护的位置仍会被统计占用，但不可勾选；能勾选、能清理的只有夹具；
- 自动走：首页 → 开始体检 → 结果 → 清理所选 → 确认框 → “永久删除 3 MB” → 清理完成 → 清理记录，每步截图；
- 最后检查器核对夹具删留、服务存储与清理记录，关窗并要求退出码 0；
- 只有 1 次预算，检查器会记录；运行时不要操作那个窗口。失败就写受阻回执，不要再开窗。

## 预算与边界

- 原生窗口 1（只给 `native --final`），选择框 0。
- cargo 离线、单线程、私有 target，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W5-H3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h3/docs/dispatch/reports/WATER-W5-H3-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～6 节逐条怎么做的；
- 每个检查命令与结果；
- `native --final` 的步骤、用时、退出码、截图各看到了什么，以及检查器核对的夹具与清理记录结果；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。特别是：清理进行中关窗有没有在真窗口里试过（预算只有 1 个窗口，没试就写明）。

受阻则同一路径写“WATER-W5-H3 任务受阻”，写清冲突与最小补充需求，不要自行变通。
