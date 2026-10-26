# 第二波：设备垃圾体检内核（W2）

2026-10-26，总控（Claude）。依据 [ADR-018](../../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md) 与用户同日五项决定。登记见 [manifest](manifest.json)。

## 目标

做出 Water 新主线的四个独立内核，加一张界面票：

| 票 | 交付 | 目录 | SPEC | 门 | 真实数据 |
|---|---|---|---|---|---|
| WATER-W2-A | 规则登记表：约 55 条种子规则、校验、解析成扫描计划 | `packages/junk-rules` | [RULES](../../../contracts/checkup-v1/RULES.md) | 轻，1 条负控 | 只读：核对规则路径在本机存在 |
| WATER-W2-B | 扫描引擎：定位、体量、可清理判定、快照与增长 | `packages/junk-scan` | [SCAN](../../../contracts/checkup-v1/SCAN.md) | 轻，1 条负控 | 只读：对本机执行一次组级扫描 |
| WATER-W2-C | 进程快照、在用判断、孤儿进程 | `packages/process-scan` | [PROCESS](../../../contracts/checkup-v1/PROCESS.md) | 轻，1 条负控 | 只读：本机进程计数 |
| WATER-W2-D | 清理执行器：逐项复核、不跟随删除、日志与报告 | `packages/junk-clean` | [CLEAN](../../../contracts/checkup-v1/CLEAN.md) | **重，3 条负控** | 无；只删本树合成夹具 |
| WATER-W2-E | 桌面界面（磨砂玻璃设计） | `apps/water/ui` | [设计](../../design/water-ui-v1/DESIGN.md)、[IPC](../../../contracts/checkup-v1/IPC.md) | 轻 | 无 |

## 依赖与冲突

- A、B、C、D 之间只通过 [共享模型](../../../contracts/checkup-v1/MODEL.md) 的 JSON 交接，互不依赖实现；各自独占一个新目录，文件不相交，可以同时外贴。
- E 只依赖 IPC 契约与设计稿，与 A–D 不相交。**E 等用户确认磨砂玻璃设计稿后再放行**，目前为草案。
- 下一波 F（桌面接线）依赖 A–E 全部验收：新建 `apps/water` 的 Tauri 宿主，实现 IPC、调用四个 crate、开启 Mica、带 JS 的安全设置，并做本机整机验收。

## 预算与边界

- A–D 原生窗口 0、目录选择框 0、浏览器 0。E 最多一个私有 headless Chrome。
- Rust 全部离线、jobs 1、私有 Cargo home/target/tmp；不下载、不改网络与全局配置。
- 真实只读范围按 ADR-018：只读名字、大小、时间、属性与进程列表；不读内容、不写不删。输出与证据不得含命令行；B 的真实冒烟只出组级汇总。
- 唯一检查入口 `scripts/checkup-wave-check.mjs`，已在自测树 `.worktrees/w2-selftest` 走通 baseline、lock、check、test、负控、final、real、archive 与七条拦截路径。

## 总控验收计划

1. 收单核对：分支、基点、提交范围、负控记录、回执与证据原字节。
2. 新私有树离线重跑 check/test；总控自己按 SPEC 另做一条负控。
3. 真实只读交叉核对：B 的组级体量与总控 PowerShell 摸底（2026-10-26）对同一位置的数相差不超过 2%；A 的规则路径存在性与摸底一致；C 的进程数量级合理。
4. D 额外在总控夹具上做联接、占用、身份变化的独立用例。
5. 全部通过后集成进主线，再出 F 与（用户确认后的）E。

## 里程碑对应

M1 体检 Alpha = A、B、C、E、F 验收且整机能扫描、展示。M2 清理 Beta = D 接入、应用内清理闭环，并完成**自清理里程碑**：用户在 Water 里把 Water 自身开发产生的构建产物和测试配置清掉，总控准备计划并核对结果。
