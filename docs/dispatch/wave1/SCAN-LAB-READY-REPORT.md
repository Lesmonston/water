# WATER-W1-F派前回执

2026-10-17，总控Codex。F **READY，待用户外贴**，未确认DISPATCHED/RUNNING。没有启动实现worker，产品尚不存在。本次只完成架构、冻结协议、验收控制工具、独立树及真实预检。

| 项 | 实际结果 |
|---|---|
| 前置 | A/D VERIFIED；A–E旧产品/基线/helper/锁保持 |
| 基线 | `fc114eb81125cef7d374deddc95144bcd9aee748` |
| 工作树 / 分支 / tag | `F:/new/smaltalk/water/.worktrees/f` / `worker/water-w1-f` / `water-w1-scan-lab-base-20261017` |
| 冻结 | scan-lab-v1的22文件SHA256一致；同时核四旧锁43唯一文件，旧锁不改 |
| 工具链 | Node v24.16.0 / rustc 1.95.0 (59807616e) / cargo 1.95.0，实际MSVC编译链接及执行探针通过 |
| baseline | [原始receipt](../../acceptance/wave1/controller/w1-f-preflight-20261017/2026-10-17T13-01-59.231Z-22844-baseline-result.json)，exit0，前后HEAD相同、树干净 |
| fixtures | [原始receipt](../../acceptance/wave1/controller/w1-f-preflight-20261017/2026-10-17T13-02-21.212Z-18332-fixtures-result.json)，exit0；前后HEAD相同、树干净 |
| 本次合成资产 | 11正常run、6控制负例，本机均创建；81057内容字节，44普通文件/marker快照逐项一致，无清理 |
| 原生std探针 | 两个硬链接路径为普通文件、长度均8；symbolic-outside/junction-outside均reparse，末端不跟随元数据 |
| Windows身份 | 稳定std的file_index/volume_serial_number按预期编译失败E0658/windows_by_handle；协议固定Unknown，这不是F产品负控 |
| 实现/产品检查 | `packages/fixture-scan`不存在；六产品测试、五final门、实际F扫描bridge、四负控均未运行 |

Node两脚本语法检查、冻结哈希核对通过。两个只读辅助复核接口可实现性、平台与夹具矩阵；冻结前修正linked_ancestor指向未声明outer、重复键样本混入错误run_id、marker字节重复计数，以及取消coverage/批次故障证据表述。linked_ancestor现为声明scope的链接；duplicate_marker两键均为同一个合法run_id，不再由错误值掩盖重复键问题。派前另核这两物理样本及snapshot字节之和=81057。

预检只运行`scan-lab-check --mode baseline`及`--mode fixtures`；没有运行F生产扫描或冒充行为红。11case/12scope/39条native预期及受控故障/取消36条为冻结验收预期，尚非F实测结果；不以D成功造目录证明F扫描安全。unsupported须按未来实际能力如实记录，本批六负例及三种D链接能力均可用。

F自有workspace/锁，不改根Cargo/旧产品。只有prepare工具可新建本树.local合成文件/链接；Rust生产只读元数据及最多65536字节marker，Rust测试只读控制index/材料/run。没有普通payload读取、ACL修改、移动/删除、真实目录授权、UI/IPC、分类/报告/E接线。祖先逐组件复查限定无恶意并发修改的实验室，Windows未知身份不支持生产对象替换保证。macOS、真实权限失败、真实ReadDir迭代故障与生产竞态均未验证。

原始日志/receipt、active及不可变历史index共32个文件原字节归档，另有[归档清单与SHA256](../../acceptance/wave1/controller/w1-f-preflight-20261017/archive-inventory.json)，不归档二进制。活跃指针仅在f树.local，旧run不改不清。平台研究是官方接口静态证据，见[固定commit行号核对](../../../research/platform/SCAN-STD-20261017.md)；Rust对应文件采用[MIT OR Apache-2.0的library许可规则](https://github.com/rust-lang/rust/blob/59807616e1fa2540724bfbac14d7976d7e4a3860/REUSE.toml#L15-L56)，本轮无代码复用，不决定Water发布许可证。

正式执行范围/命令/回执要求见[F票](../tickets/WATER-W1-F-SCAN-LAB-20261017.md)。权威票在主检出，执行者读取即可；不merge主线取票。实际模型由用户安排，未预填。旧A–E状态与基线保持。
