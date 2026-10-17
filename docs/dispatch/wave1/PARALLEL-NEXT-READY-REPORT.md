# G/H/I并行派前回执

2026-10-17，总控Codex。用户要求一次安排多张可并行任务，已准备新增G/H/I，**三票READY待分别外贴**；F观察到原树实现/负控文件，记RUNNING但开始时间未知，原执行者继续。无自动启动实现worker，无新产品完成声明。

| 票 | 独立产物 / 工作树 | 真实派前结果 |
|---|---|---|
| G | packages/scan-report / `.worktrees/g` | Node24/Rust1.95/MSVC离线编译链接、A/E资产核对通过；[receipt](../../acceptance/wave1/controller/w1-parallel-next-preflight-20261017/g/2026-10-17T13-35-56.563Z-24600-baseline-result.json) |
| H | packages/summary-export / `.worktrees/h` | 同上；[receipt](../../acceptance/wave1/controller/w1-parallel-next-preflight-20261017/h/2026-10-17T13-35-56.563Z-9880-baseline-result.json) |
| I | prototypes/report-reader / `.worktrees/i` | Node24、已安装Chrome隔离profile的900x800空白页通过，未运行I页面；[receipt](../../acceptance/wave1/controller/w1-parallel-next-preflight-20261017/i/2026-10-17T13-35-59.345Z-4584-baseline-result.json) |

三个分支分别worker/water-w1-g/h/i，共同精确基线`045ab4f0d01edd573828fbc8cca988e1ad37efee`，tag water-w1-parallel-next-base-20261017；各baseline前后同SHA且干净。36项新冻结与五旧锁58唯一文件一致，旧冻结/helper/根Cargo/A–E产品及F基线保持。G/H/I正式报告与证据父目录均已存在，无执行占位符。

[最新合成资产校验](../../acceptance/wave1/controller/w1-parallel-next-preflight-20261017/asset-projection-r2-result.json)：17个G预期报告及11个H来源报告经真实A校验；4个I报告经真实E project_json投影，与E原golden完整相等后写入冻结reports.json；G的expected-views也由真实E投影生成。此前15/10资产校验是补齐覆盖前的历史，保留原日志。它们不是G/H/I产品输出，不冒充F扫描或macOS实测。

独立审阅补齐了：G 2raw+10结构/上下文变体的冻结bridge拒绝检查、已完成scope后取消/恰好2^53/输出超限测试约束；H scope/issue路径/message canary及6raw+6手工DTO独立bridge；git NUL文件列表保持原文、Cargo真实manifest/lib/test路径核对；I截图仅在.local复制，所有final后才入证据，避免破坏干净受测SHA。三个只读辅助没有写代码或执行产品。

并行边界：G消费冻结F JSON而不依赖F crate，生成全未知保护报告并保留完整facts sidecar；H只依赖A，明确字段构造白名单汇总，容量/分布仍可能关联；I仅冻结合成E视图，整份报告切换，无真实数据/IPC。各自独占目录，无相互覆盖文件。G/H自有Cargo home/target/tmp/锁，I自己的profile/loopback服务；每线一个检查，F/G/H各jobs1，I单Chrome。没有G/H/I物理fixture或真实用户扫描权限，不清理/删除/改ACL。

57份资产预检/三baseline原始日志及receipt按字节归档，见[清单与SHA256](../../acceptance/wave1/controller/w1-parallel-next-preflight-20261017/archive-inventory.json)；不归档二进制或Chrome profile。G/H/I生产目录尚不存在，五Rust测试/各自真实bridge、三个模型测试/两个浏览器测试/截图、三负控及final门均待外贴实现后执行。macOS IO、真实F→G/G→H/E→I接线、分类、真实用户scope安全、Tauri壳和发布均未验收。

正式票：[G](../tickets/WATER-W1-G-SCAN-REPORT-20261017.md)、[H](../tickets/WATER-W1-H-SUMMARY-EXPORT-20261017.md)、[I](../tickets/WATER-W1-I-REPORT-READER-20261017.md)。入口[PASTE-G](PASTE-G.txt)/[PASTE-H](PASTE-H.txt)/[PASTE-I](PASTE-I.txt)，用户各转贴一个独立执行者。模型由用户安排、未预填。READY不等于已经外贴；F继续原票，不重派。
