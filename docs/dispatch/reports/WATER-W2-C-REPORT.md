WATER-W2-C 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-c/docs/dispatch/reports/WATER-W2-C-REPORT.md

# C 执行回执

交付状态：SUBMITTED，等待总控独立验收与集成。Windows x64 只读范围通过；macOS 未验证。

- 权威工单：主检出 `docs/dispatch/tickets/WATER-W2-C-PROCESS-SCAN-20261026.md`；未 merge 取票。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w2-c`；分支 `worker/water-w2-c`。
- 精确首次基线：`7ca15282e477ed4b5120ffe3c1edc3a60b75c144`，标签 `water-w2-checkup-base-20261026`。开工时干净，`packages/process-scan` 不存在。
- 实现提交（全部 final 的同一受测 SHA）：`ec0b5f23ced2e538cfb817b7592996cd72b4095d`。
- 实际引擎：xAI Grok 4.6，本会话。未启动子代理、未改主线台账、未 push/merge/rebase。
- 原生窗口 0、目录选择框 0、浏览器 0。Rust 离线、jobs 1、私有 Cargo home/target。

## 改动

仅新增 `packages/process-scan` 七个文件：`Cargo.toml`、`Cargo.lock`、`README.md`、`src/lib.rs`、`src/native_windows.rs`、`tests/process_v1.rs`、`examples/real_smoke.rs`。独立 workspace、resolver 3、edition 2024、rust-version 1.95、publish=false、四个 auto=false。直接依赖只有 `serde =1.0.229`（derive）与 `serde_json =1.0.151`。

| 文件 | SHA256（实现提交 / 恢复后） |
|---|---|
| `packages/process-scan/Cargo.toml` | `325f853fd203b2a037ef7e52247a2bcb3913f28f113d19c3806e2aa04df447a9` |
| `packages/process-scan/Cargo.lock` | `fc0cf1300b604a58e3d4104b29c7b511df028cb603763a78f8500c9118e674ef` |
| `packages/process-scan/README.md` | `69de3aafa720e5fb9a89e679efe16a52a1cc74d5ba70e649befb52c0fa241c16` |
| `packages/process-scan/src/lib.rs` | `efed8b85568947b6472a623ef589242a833426f170abbe11d3d7e0e96606c9c0` |
| `packages/process-scan/src/native_windows.rs` | `71f56826f43c4f3e43abcf2bf8ddf12b85acaf958a6b4eb31a9b10b09568cba6` |
| `packages/process-scan/tests/process_v1.rs` | `9d54372e13ab30bb5c9202b193e79863c14e804a1c8aa4582b104c921a2e6cef` |
| `packages/process-scan/examples/real_smoke.rs` | `fe421ae3c8da3ddae0f11827415c0c75b6903ac5c6a6337f48746daa79baf6bb` |

生产哈希 `ad16f702f56c217355a358668e747d365c6f211d514e670bf67749b02ae35286`；测试哈希 `1e04867186f5d104be770820d881828562ecbe8ad69e2393a50ecdc20720f865`。

## 需求对照

| 要求 | 实现与验证 |
|---|---|
| 独立 crate `water-process-scan` | 公开 API：`snapshot`、`summary`/`running`/`references_path`、`summary_to_json`、`in_use`、`orphans`、`DEFAULT_ORPHAN_PATTERNS`。 |
| FFI 仅 `src/native_windows.rs` | 允许的六个系统调用：`CreateToolhelp32Snapshot`、`Process32FirstW`、`Process32NextW`、`OpenProcess`（只 `PROCESS_QUERY_LIMITED_INFORMATION`）、`NtQueryInformationProcess`（只 class 60）、`GetProcessTimes`、`CloseHandle`。`lib.rs` `deny(unsafe_code)`，native 模块 `deny(unsafe_op_in_unsafe_fn)`。 |
| 只读 | 不结束、不挂起、不注入。测试结束只结束自己启动且命令行含本次令牌/夹具路径的进程（`taskkill /T`），并复核为空。夹具只建在 `.local/w2-c-fixtures/` 下本次随机目录，Drop 时校验父目录名与 `w2c-` 前缀后只删那一个。 |
| 命令行不出内存 | `ProcessSnapshot` 不实现 Serialize；`Debug` 不含命令行。`process_privacy` 证明 summary JSON、快照 Debug、InUseHit 与 OrphanChain 的 JSON/Debug 都不含测试令牌和夹具路径。 |
| `references_path` 边界 | 大小写与斜杠归一；前边界为空/空格/`"`/`'`/`=`；后边界为空/空格/引号/`\`。`C:\a\bc` 不命中 `C:\a\b`。 |
| `in_use` 三 mode | `none` 恒空；`process_running` 按进程名；`cmdline_references_item` 按路径引用，空 processes 表示不限。 |
| `orphans` | 父 PID 不在快照或父创建时间晚于子进程，且名为八个白名单之一，且命令行含 pattern。自制 `start "" /b` 孤儿列出，仍有父进程的 cmd 不算孤儿。`DEFAULT_ORPHAN_PATTERNS` 含 SPEC 十条。 |
| 系统进程 | 命令行取不到计入 `access_denied` 或 `exited`，进程仍列出，`snapshot()` 不失败。 |
| 真实冒烟 | `examples/real_smoke.rs` 只打印计数与孤儿的 name/matched_pattern，stdout JSON 无绝对路径。 |

## 检查命令

均在工作树根目录执行。

| 模式 | 结果 | 回执 |
|---|---|---|
| `--mode baseline` | passed | `2026-10-26T05-09-59.264Z-42984-baseline-result.json` |
| `--mode lock` | passed | `2026-10-26T05-19-26.090Z-14820-lock-result.json` |
| `--mode check` | passed（此前 fmt/clippy 迭代后） | `2026-10-26T05-22-08.622Z-20004-check-result.json` |
| `--mode test` | passed（4/4；此前孤儿 `start` 标题写法失败一次后已修正并纳入实现提交） | `2026-10-26T05-25-26.213Z-16028-test-result.json` |
| `--mode real` | passed | `2026-10-26T05-26-12.480Z-12896-real-result.json` |
| `--mode red-nc1` | passed（底层测试 exit 101，命中 `PROC_PATH_BOUNDARY`） | `2026-10-26T05-28-00.930Z-27192-red-nc1-result.json` |
| `--mode test`（恢复后） | passed | `2026-10-26T05-28-54.390Z-29060-test-result.json` |
| `--mode check --final` | passed | `2026-10-26T05-29-42.250Z-10984-check-result.json` |
| `--mode test --final` | passed，proofAudit nc1 绑定 | `2026-10-26T05-29-59.247Z-40548-test-result.json` |
| `--mode real --final` | passed | `2026-10-26T05-30-38.299Z-35340-real-result.json` |
| `--mode archive` | passed，175 份 / 1,485,523 字节 | `docs/acceptance/wave2/c/ARCHIVE.json` |

四测试名与工单完全一致：`process_snapshot_contract`、`process_path_reference`、`process_in_use_and_orphans`、`process_privacy`。0 ignored / 0 filtered。

## 负控 nc1

只改 `packages/process-scan/src/lib.rs` 的 `next_boundary_ok`：去掉后边界检查，改为恒 `true`。测试未改。

- 失败信息含 `PROC_PATH_BOUNDARY: C:\a\bc must not match C:\a\b`
- 变异中 `lib.rs` SHA256 `30984c146e67159e8453deb77282b1e5e23344b5484036ada508424cda8ea7f4`，productionHash `9cec75ce44ef5e3a03dbae52e23e812060a67fdd03e81e6149a021df42a5b415`
- 立即 `git checkout -- packages/process-scan/src/lib.rs`，`lib.rs` 回到 `efed8b85568947b6472a623ef589242a833426f170abbe11d3d7e0e96606c9c0`
- 随后 `--mode test` 四绿；final proofAudit：`red=2026-10-26T05-28-00.930Z-27192-red-nc1-result.json`，`restored=2026-10-26T05-28-54.390Z-29060-test-result.json`

## 真实冒烟摘要

`--mode real --final` 本机只读快照（不含命令行、不含绝对路径）：

- process_count：384
- access_denied：5
- exited：7
- chrome.exe：14
- msedge.exe：12
- node.exe：5
- orphan_count：0（默认 pattern）

## 未做 / 未验证

- macOS / 非 x64 Windows
- 生产竞态（快照与查询之间进程退出的完整分类精度）
- 与 WATER-W2-A/B/D/E 的接线；IPC 层 `item_id` 包装
- 真实删除或结束他人进程
- 主线集成与总控交叉核对
