# 第二波派前回执（2026-10-26）

总控（Claude）。A、B、C、D 四票 READY，可以同时外贴；E（界面）等用户确认磨砂玻璃设计稿后再出票。READY 只表示准备就绪，不表示已外贴或有人开工。

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
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-B-JUNK-SCAN-20261026.md，开始执行任务。
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-C-PROCESS-SCAN-20261026.md，开始执行任务。
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-D-JUNK-CLEAN-20261026.md，开始执行任务。
```

## 未做与待定

- 新产品代码一行都还没有；baseline 不代表任何产品测试。
- E 界面票、界面回放数据 `ui-fixtures.json` 与 `apps/water/ui` 工作树，等用户确认设计稿后准备。
- 下一波 F（桌面接线、Mica、整机验收）要等 A–E 全部验收。
- 原生窗口、浏览器、下载均为 0；没有改网络或全局配置。
