# WATER-W6-I2：宿主收尾（重门，含 1 个窗口）

2026-10-28，正式票，总控（Claude）。以 [第六波 manifest](../wave6/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。可以新开对话执行。本票与 I1、I3 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W6-I2-HOST-M3-20261028.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w6-i2 / worker/water-w6-i2 |
| 精确首次 HEAD | d79fb096ef0557430b7dd43634b4d60e8f2de958，必须干净；`apps/water/host` 是第五波 H3 合入后的版本（已打开清理） |
| SPEC | F:/new/smaltalk/water/contracts/m3-v1/HOST-M3.md（本票的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/m2-v1/HOST-M2.md；F:/new/smaltalk/water/contracts/m2-prep-v1/HOST-FINISHING.md；F:/new/smaltalk/water/contracts/desktop-v1/WIRING.md；F:/new/smaltalk/water/contracts/desktop-v1/HOST.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W6-M3-WORKER-RULES.md；宿主的写法沿用 F:/new/smaltalk/water/docs/dispatch/W3-DESKTOP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w6-i2/docs/dispatch/reports/WATER-W6-I2-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w6-i2/docs/acceptance/wave6/i2/ |
| 门 | 重门：3 条负控 + check、test、native 三个 final |

先读：
1. 规则与 SPEC HOST-M3 全文，再读 HOST-M2（特别是第 1、2 条）、HOST-FINISHING、WIRING、HOST；
2. 背景：[第五波收单验收](../../acceptance/wave5/controller/WATER-W5-REVIEW-20261028.md)的 H3 一节（独立审查的中级与低级各条）；
3. 代码：`apps/water/host/src/lib.rs`（`run`、`BackendSlot`、`stop_cleaning_and_wait`、关窗保护）、`data.rs`，以及 `tests/host_v1.rs`。

## 要做的（全部在 `apps/water/host/`）

SPEC 第 1～3 节逐条实现：
1. **系统关机或注销时先停清理**：新增 `stop_cleaning_within` 与 `CleanStop`；`run_return` 的回调在 `RunEvent::Exit` 时用它（200 ms、10 秒）。
2. **查不到状态时按“可能在清理”处理**：新增 `clean_state` 与 `CleanState`；关窗与两个等待函数都用三态，`Unknown` 连续 5 秒才放弃等待。
3. **测试补强**：脚本后端只在收到 `clean_stop` 后才倒数；`\\?\` 断言真正走到两次结果的比较。

整机检查仍是第五波 H3 的夹具清理闭环，由检查器完成；本票不改界面。

**不变**：SPEC 第 4 节列的一切，包括：
- 依赖、配置、权限文件、图标；
- `stop_cleaning_and_wait` 的签名；
- 不新增 `unsafe`，不开进程、不联网，不读别的环境变量；
- 不用 Tauri 的 `.setup()`，检查器会拒绝。

## 白名单

- `apps/water/host/` 下的文件（不得改 `Cargo.toml`、`Cargo.lock`、`tauri.conf.json`、`capabilities/main.json`、`icons/`）
- `docs/dispatch/reports/WATER-W6-I2-REPORT.md`
- `docs/acceptance/wave6/i2/` 下 `--mode archive` 生成的证据（含整机截图）

## 测试

`apps/water/host/tests/host_v1.rs`，仍是精确 5 个测试，名字不变。新断言照 SPEC 第 5 节加在已有测试里，失败信息带标记：
- `HOST_EXIT_DURING_CLEAN`
- `HOST_CLOSE_UNKNOWN`
- 已有的 `HOST_CLOSE_DURING_CLEAN`、`HOST_DATA_JUNCTION` 按 SPEC 改脚本后端或补断言。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | `stop_cleaning_within` 不调用 `clean_stop` 或不等到停下就返回 | `HOST_EXIT_DURING_CLEAN` |
| nc2 | `clean_state` 把出错当成“没在清理” | `HOST_CLOSE_UNKNOWN` |
| nc3 | 等待函数在调用 `clean_stop` 之前就开始等空闲（先等后停） | `HOST_CLOSE_DURING_CLEAN` |

只改 `apps/water/host/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W6-I2 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`native --final`，再 `archive`。

**`native --final` 会在本机弹出 1 个 Water 窗口**：
- 检查器在本树 `.local/w6-i2-native/` 下生成合成夹具，并预置设置：七个分类全部关闭，另加这个夹具文件夹。受保护的位置仍会被统计占用，但不可勾选；
- 自动走：首页 → 开始体检 → 结果 → 清理所选 → 确认框 → “永久删除 3 MB” → 清理完成 → 清理记录，每步截图；
- 最后检查器核对夹具删留、服务存储与清理记录，关窗并要求退出码 0；
- 只有 1 次预算，检查器会记录；运行时不要操作那个窗口。失败就写受阻回执，不要再开窗。

## 预算与边界

- 原生窗口 1（只给 `native --final`），选择框 0。
- cargo 离线、单线程、私有 target，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W6-I2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w6-i2/docs/dispatch/reports/WATER-W6-I2-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～3 节逐条：改了哪里、怎么满足（第 1 条写清 `RunEvent::Exit` 分支里做了什么；第 2 条写清三态在关窗与等待里怎么用）；
- 每个检查命令与结果；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 整机检查的步骤、用时、退出码与截图；
- 没做或没验证的事（例如真实的系统关机没有试）。

受阻则同一路径写“WATER-W6-I2 任务受阻”，写清冲突与最小补充需求，不要自行变通。
