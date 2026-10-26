# 第三波 F3 派前回执（2026-10-26 晚）

总控（Claude）。F3 接线与整机体检 READY，可以在新对话里执行。计划见 [PLAN](PLAN.md) 的 F3 一节，SPEC 见 [WIRING](../../../contracts/desktop-v1/WIRING.md)，登记见 [manifest](manifest.json)。

## 基点与冻结

- 基点 `d56ebc66becc02e855ffda0edbf36a2e82470c2d`，标签 `water-w3-f3-base-20261026`。内容是：
  - WIRING 契约；
  - 检查入口的扩展；
  - 整机观察器 `scripts/acceptance/w3-wired-native-observe.ps1`；
  - 规则第 6 节“F3 补充”；
  - 计划的 F3 一节。
- 冻结文件：
  - 波次级 9 个（规则文件因新增第 6 节已更新哈希）；
  - 本票另冻结 WIRING。
- 执行者工作树 `.worktrees/w3-f3`，分支 `worker/water-w3-f3`，停在基点、干净。

## 检查入口的改动

1. 构建时清掉 `TAURI_*` 变量（F2 移交第 2 条：tauri-build 会合并 `TAURI_CONFIG`）。
2. 允许输出目录已存在的任务（F3 改的是已验收宿主）：baseline 要求宿主存在、停在基点未改。
3. `forbidSetup` 的任务源码里出现 `.setup(` 即拒绝。
4. 原生窗口模式按任务参数化：
   - 带 `nativeSteps` 的任务由整机观察器逐步驱动，用 UI 自动化的 Invoke，不合成鼠标或键盘；
   - 逐步截图，最长 480 秒；
   - 关窗后核对服务数据目录：只允许列出的条目，扫描与快照各 1 个，计划、清理记录、日志都为空。
5. F2 的旧路径保持不变。

## 派前实测

| 项 | 结果 |
|---|---|
| F3 baseline（`.worktrees/w3-f3`） | 通过 |
| 自测树 `.worktrees/w3-selftest-f3` baseline | 通过 |
| 自测 lock | 通过。锁只新增本仓库 5 个路径包（water-service 与四个已验收 crate），395 个 registry 包仍与 AC 锁逐个一致 |
| 自测 check、test | 通过，5 个测试 |
| 自测负控 nc1、nc2、nc3 | 都以目标标记打红，原字节恢复后转绿 |
| 额外：源码加入 `.setup(` | check 被拒（“Tauri setup is not allowed”） |
| 自测 `check --final`、`test --final` | 通过，负控审计通过 |
| **自测 `native --final`（整机）** | **一次通过**，见下节 |

自测树里的桩接线只用来走通检查入口，不是参考实现，执行者看不到它。

## 整机窗口检查（自测，1 个窗口）

- 11 步全部通过，全程 78.6 秒，其中真实整机扫描 69.5 秒。
- 系统背景类型 2（Mica），正常退出 0，6 个 WebView 子进程全部结束，私有 WebView 目录确认。
- 数据目录核对：只有 `webview`、`water.lock` 与服务的五个子目录。`scans`、`snapshots` 各 1 个，`plans`、`cleans`、`journal` 都为空。
- 6 张截图逐张看过：
  - **首页**：读到 C 盘 250.1 GB、已用 79%，以及 D、E、F 三块盘；左下角显示 Water 0.1.0，证明服务已接上。
  - **结果页**：本次识别 43.0 GB，可放心清理 8.6 GB，用时 67 秒；分组、级别、体量正常。
  - **点“清理所选”后**：顶部提示“这一版只做体检，清理功能会在下一版开放。”。
  - **增长趋势**：只有一次体检，显示“再体检一次就能看到变化”。
  - **清理记录**：列出刚才那次体检。
  - **扫描位置**：7 个分类开关与“自定义文件夹”。
- 观察到一处界面小问题，记给以后打磨：“这一版只做体检…”提示在切换页面后仍然留着，需要点“关闭提示”。

证据在 [preflight-20261026](../../acceptance/wave3/controller/preflight-20261026/)：`baseline/`，以及 `selftest-f3/`（归档、回执、6 张截图、负控记录）。

## 外贴句

宿主票（Tauri 与 Rust，建议选熟悉 Rust 桌面开发的模型）：

```text
你接手 Water 项目 WATER-W3-F3（接线与整机体检）。先读 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F3-WIRING-20261026.md，按其中列出的顺序读规则与契约，在 F:/new/smaltalk/water/.worktrees/w3-f3（分支 worker/water-w3-f3）从 d56ebc6 开工。
```
