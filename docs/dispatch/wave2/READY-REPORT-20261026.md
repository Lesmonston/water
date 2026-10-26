# 第二波派前回执（2026-10-26）

总控（Claude）。A、B、C、D、E 五票 READY，可以同时外贴。E 是界面票，按用户第二次审稿（白色磨砂、纯色、少渐变）定稿后出票。READY 只表示准备就绪，不表示已外贴或有人开工。

## 已完成的准备

- 决定与契约：[ADR-018](../../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)、[共享模型](../../../contracts/checkup-v1/MODEL.md)、四份 SPEC、[IPC](../../../contracts/checkup-v1/IPC.md)、[真实计划模板](../../../contracts/checkup-v1/real-plan-template.json)，均在基点提交 `7ca15282e477ed4b5120ffe3c1edc3a60b75c144`（标签 `water-w2-checkup-base-20261026`）。manifest 记录 9 个冻结文件哈希，检查器每次都核对。
- 检查入口 `scripts/checkup-wave-check.mjs` 已在自测树 `.worktrees/w2-selftest` 走通 baseline、lock、check、test、负控、final、real、archive；并验证会拒绝越界文件、不改源码的负控、测试仍通过的负控、编译错误冒充负控、改测试的负控、非原生模块里的 unsafe、额外依赖。
- 四个独立工作树建于同一基点，baseline 全部通过（工作树干净、产品目录不存在、Rust 1.95.0、离线缓存含白名单 11 个 crate、真实只读所需的系统目录存在）。回执原字节见 [preflight 归档](../../acceptance/wave2/controller/preflight-20261026/ARCHIVE.json)。

| 票 | 工作树 | 门 | 真实只读 | 负控 |
|---|---|---|---|---|
| WATER-W2-A 规则登记表 | `.worktrees/w2-a` | 轻 | 规则路径存在性 | RULES_PRECEDENCE |
| WATER-W2-B 体检扫描引擎 | `.worktrees/w2-b` | 轻 | 本机组级扫描 | SCAN_NO_FOLLOW |
| WATER-W2-C 进程快照与在用判断 | `.worktrees/w2-c` | 轻 | 进程计数 | PROC_PATH_BOUNDARY |
| WATER-W2-D 清理执行器 | `.worktrees/w2-d` | 重 | 无 | CLEAN_IDENTITY、CLEAN_NO_FOLLOW、CLEAN_ROOT_BOUND |

四票目录互不相交，只通过共享模型的 JSON 交接，可以交给四个不同的执行者同时做。

## 外贴句（每张票一行，分别发给不同执行者）

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-A-JUNK-RULES-20261026.md，开始执行任务。
```

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-B-JUNK-SCAN-20261026.md，开始执行任务。
```

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-C-PROCESS-SCAN-20261026.md，开始执行任务。
```

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-D-JUNK-CLEAN-20261026.md，开始执行任务。
```

## 补充：界面票 E（同日）

用户审稿意见“磨砂的白感更重一点，渐变稍显花哨，界面更清爽高级”已落实到设计稿第 2 版（白色玻璃、纯色强调蓝、去掉渐变字与光晕、去掉英文眉题），预览图见 `docs/design/water-ui-v1/previews/`。界面基点 `68cbab9f7c35fa7e5c55e3daab3151ecec5a22c6`（标签 `water-w2-ui-base-20261026`）另含 [UI SPEC](../../../contracts/checkup-v1/UI.md)、[回放数据](../../../contracts/checkup-v1/ui-fixtures.json) 与检查入口的界面模式；界面模式在 `.worktrees/w2-selftest-ui` 自测通过，并验证会拒绝内联脚本、innerHTML、`__TAURI__` 越界、改动 tokens、package.json 与网络地址。A–D 用到的 Rust 路径未改，回归通过。

| 票 | 工作树 | 门 | 浏览器 | 负控 |
|---|---|---|---|---|
| WATER-W2-E 桌面界面 | `.worktrees/w2-e` | 轻 + 逐屏看图 | 1 个私有 headless Chrome | UI_LEVEL_GUARD |

E 的 baseline 已通过，回执并入同一 preflight 归档。E 与 A–D 目录不相交，可同时外贴；建议交给前端与视觉能力强的模型。

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-E-DESKTOP-UI-20261026.md，开始执行任务。
```

## 未做与待定

- 新产品代码一行都还没有；baseline 不代表任何产品测试。
- 下一波 F（桌面接线、Mica、整机验收）要等 A–E 全部验收。
- A–D 原生窗口与浏览器为 0，E 最多一个私有 headless Chrome；均无下载，没有改网络或全局配置。
