WATER-W2-C 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-c/docs/dispatch/reports/WATER-W2-C-REPORT.md

# C 执行回执

交付状态：SUBMITTED，等待总控独立验收与集成。Windows x64 只读范围通过；macOS 未验证。

- 权威工单：主检出 `docs/dispatch/tickets/WATER-W2-C-PROCESS-SCAN-20261026.md`；未 merge 取票。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w2-c`；分支 `worker/water-w2-c`。
- 精确首次基线：`7ca15282e477ed4b5120ffe3c1edc3a60b75c144`，标签 `water-w2-checkup-base-20261026`。开工时干净，`packages/process-scan` 不存在。
- 实现提交（补单 01 后，全部 final 的同一受测 SHA）：`39539a1ee9524f06b339fd9c2ecfbbee10ec1880`。原票实现提交 `ec0b5f23ced2e538cfb817b7592996cd72b4095d`。
- 实际引擎：原票为本工作树前一会话；补单 01 由 Grok Bot 执行。未启动子代理、未改主线台账、未 push/merge/rebase。
- 原生窗口 0、目录选择框 0、浏览器 0。Rust 离线、jobs 1、私有 Cargo home/target。

## 改动

仅新增 `packages/process-scan` 七个文件：`Cargo.toml`、`Cargo.lock`、`README.md`、`src/lib.rs`、`src/native_windows.rs`、`tests/process_v1.rs`、`examples/real_smoke.rs`。独立 workspace、resolver 3、edition 2024、rust-version 1.95、publish=false、四个 auto=false。直接依赖只有 `serde =1.0.229`（derive）与 `serde_json =1.0.151`。

| 文件 | SHA256（实现提交 / 恢复后） |
|---|---|
| `packages/process-scan/Cargo.toml` | `325f853fd203b2a037ef7e52247a2bcb3913f28f113d19c3806e2aa04df447a9` |
| `packages/process-scan/Cargo.lock` | `fc0cf1300b604a58e3d4104b29c7b511df028cb603763a78f8500c9118e674ef` |
| `packages/process-scan/README.md` | `56d7185c6b6dd71f6eb9da6a2557deb5eb85c90f212ae58fa7775c706272adbe` |
| `packages/process-scan/src/lib.rs` | `db10849cac94c085615a7ef30cd3c0d7ecc5d4ccb67e645c6ab7249730f1783e` |
| `packages/process-scan/src/native_windows.rs` | `71f56826f43c4f3e43abcf2bf8ddf12b85acaf958a6b4eb31a9b10b09568cba6` |
| `packages/process-scan/tests/process_v1.rs` | `1643481769efa663a21d79cb2fd78ead860fe423abea6bdffea2d0a79ebabe0f` |
| `packages/process-scan/examples/real_smoke.rs` | `fe421ae3c8da3ddae0f11827415c0c75b6903ac5c6a6337f48746daa79baf6bb` |

生产哈希 `6a530c64497850078af6c571a657aa4ef3ba97b72c5c9ccb49b4e14f479f66de`；测试哈希 `68b1fb748b5e0c3c7825e542b3ea6c23dca56589a0e55ab7f1d4d1c3c0b219e3`（补单 01 后）。原票：生产 `ad16f702f56c217355a358668e747d365c6f211d514e670bf67749b02ae35286`，测试 `1e04867186f5d104be770820d881828562ecbe8ad69e2393a50ecdc20720f865`。

## 需求对照

| 要求 | 实现与验证 |
|---|---|
| 独立 crate `water-process-scan` | 公开 API：`snapshot`、`summary`/`running`/`references_path`、`summary_to_json`、`in_use`、`orphans`、`DEFAULT_ORPHAN_PATTERNS`。 |
| FFI 仅 `src/native_windows.rs` | 允许的六个系统调用：`CreateToolhelp32Snapshot`、`Process32FirstW`、`Process32NextW`、`OpenProcess`（只 `PROCESS_QUERY_LIMITED_INFORMATION`）、`NtQueryInformationProcess`（只 class 60）、`GetProcessTimes`、`CloseHandle`。`lib.rs` `deny(unsafe_code)`，native 模块 `deny(unsafe_op_in_unsafe_fn)`。 |
| 只读 | 不结束、不挂起、不注入。测试结束只结束命令行含本次令牌的进程：每次结束前重新快照，核对 PID 的创建时间与登记一致且令牌仍在，单 PID `taskkill /F`（无 `/T`，不按后代列表结束）；直接子进程用 `Child::kill` + `wait`；最后复核令牌进程为空（见补单 01）。夹具只建在 `.local/w2-c-fixtures/` 下本次随机目录，Drop 时校验父目录名与 `w2c-` 前缀后只删那一个。 |
| 命令行不出内存 | `ProcessSnapshot` 不实现 Serialize；`Debug` 不含命令行。`process_privacy` 证明 summary JSON、快照 Debug、InUseHit 与 OrphanChain 的 JSON/Debug 都不含测试令牌和夹具路径。 |
| `references_path` 边界 | 大小写与斜杠归一；前边界为空/空格/`"`/`'`/`=`；后边界为空/空格/引号/`\`。`C:\a\bc` 不命中 `C:\a\b`。 |
| `in_use` 三 mode | `none` 恒空；`process_running` 按进程名；`cmdline_references_item` 按路径引用，空 processes 表示不限。 |
| `orphans` | 父 PID 不在快照或父创建时间可证晚于子进程（任一时间未知视为未证明复用），且名为八个白名单之一，且命令行含 pattern。自制 `start "" /b` 孤儿列出，仍有父进程的 cmd 不算孤儿。`DEFAULT_ORPHAN_PATTERNS` 含 SPEC 十条。 |
| 系统进程 | 命令行取不到计入 `access_denied` 或 `exited`，进程仍列出，`snapshot()` 不失败。 |
| 真实冒烟 | `examples/real_smoke.rs` 只打印计数与孤儿的 name/matched_pattern，stdout JSON 无绝对路径。 |

## 检查命令（原票）

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

## 负控 nc1（原票）

只改 `packages/process-scan/src/lib.rs` 的 `next_boundary_ok`：去掉后边界检查，改为恒 `true`。测试未改。

- 失败信息含 `PROC_PATH_BOUNDARY: C:\a\bc must not match C:\a\b`
- 变异中 `lib.rs` SHA256 `30984c146e67159e8453deb77282b1e5e23344b5484036ada508424cda8ea7f4`，productionHash `9cec75ce44ef5e3a03dbae52e23e812060a67fdd03e81e6149a021df42a5b415`
- 立即 `git checkout -- packages/process-scan/src/lib.rs`，`lib.rs` 回到 `efed8b85568947b6472a623ef589242a833426f170abbe11d3d7e0e96606c9c0`
- 随后 `--mode test` 四绿；final proofAudit：`red=2026-10-26T05-28-00.930Z-27192-red-nc1-result.json`，`restored=2026-10-26T05-28-54.390Z-29060-test-result.json`

## 真实冒烟摘要（原票）

`--mode real --final` 本机只读快照（不含命令行、不含绝对路径）：

- process_count：384
- access_denied：5
- exited：7
- chrome.exe：14
- msedge.exe：12
- node.exe：5
- orphan_count：0（默认 pattern）

## 补单 01

- 工单：主检出 `docs/dispatch/tickets/WATER-W2-C-ADDENDUM-01-20261026.md`。
- 起点：`ed224e39`（原票归档提交），同一工作树与分支；未重跑 baseline。
- 新实现提交：`39539a1ee9524f06b339fd9c2ecfbbee10ec1880`（`src/lib.rs`、`tests/process_v1.rs`、`README.md`）。`native_windows.rs`、`real_smoke.rs`、`Cargo.toml`、`Cargo.lock` 未改。

### 逐项修复

| 补单要求 | 修复 |
|---|---|
| 1. 清理只结束带令牌进程 | 测试夹具全部用 `cmd.exe /d /c "waitfor /t 60 <令牌>s<n> … & rem <令牌> --user-data-dir=…"` 启动（`CREATE_NO_WINDOW`）；令牌为纯字母数字 `w2c<pid>t<纳秒hex>`，每次 spawn 用独立 signal，命令行全程带令牌。每个令牌 PID 首次观察即登记 `created_at`。结束前 `kill_verified` 重新快照，要求：PID 仍出现在令牌/signal 引用集中、名为 `cmd.exe`/`waitfor.exe`、`created_at` 已知且等于登记值、且不早于会话开始时间；全部满足才 `taskkill /F /PID <pid>`，无 `/T`，不从后代列表取 PID。直接子进程先 `Child::kill` + `wait`。候选数超过登记期望数即拒绝清理并判失败。最后断言快照中令牌进程与令牌孤儿均为空。 |
| 2. 后代要求子创建时间不早于父 | `child_map` 只在父 PID 存在于快照、PID≠父、且未证明复用时连边；`proven_reused(parent, child)` 仅当两者时间都已知且父晚于子才为真。孤儿根判断与后代判断共用同一谓词。新增公开 `ProcessSummary::descendant_pids(root_pid)` 走同一规则。 |
| 3. `command_references_path` 按 UTF-8 推进 | 前一字符用 `haystack[..abs].chars().next_back()`；下一次查找起点 `abs + 首字符.len_utf8()`，中文路径不再在字符中间切片。 |
| 4. 未知 `created_at` 为 null | `created_at: Option<String>`；FILETIME 为 0 或早于 1970 时为 `None`，JSON 输出 `null`，不再出现 1601。父时间未知时视为未证明复用。 |

测试仍只有四个：`process_path_reference` 新增前边界字母/数字反例、`"…"`、`'…'`、`=` 前正例与 `=` 后反例、斜杠与结尾 `\` 归一化（`c:/A/b/`、`C:\a\b\`、`C:/a/b`、`c:\A\B\\` 命中集相同）、中文绝对与相对路径正反例，所有边界断言信息以 `PROC_PATH_BOUNDARY:` 开头；`process_in_use_and_orphans` 断言令牌孤儿的后代恰为其 `waitfor` 子进程、并与 `descendant_pids` 一致，另用构造的 `ProcessSummary` 证明同秒子进程计入、早于父的复用 PID 不计入、时间未知计入；`process_privacy` 先断言令牌孤儿链与 jest-worker 链非空再查泄漏；`process_snapshot_contract` 允许 `created_at` 为 null 并断言不含 `1601-01-01`。

### 补单 01 检查命令

| 模式 | 结果 | 回执 |
|---|---|---|
| `--mode check` | passed | `2026-10-26T07-24-01.513Z-6320-check-result.json` |
| `--mode test` | passed（4/4，首跑即绿） | `2026-10-26T07-24-17.483Z-39240-test-result.json` |
| `--mode real` | passed | `2026-10-26T07-24-59.347Z-35868-real-result.json` |
| `--mode red-nc1` | passed（底层测试 exit 101，命中 `PROC_PATH_BOUNDARY`） | `2026-10-26T07-26-23.744Z-40632-red-nc1-result.json` |
| `--mode test`（恢复后） | passed | `2026-10-26T07-26-43.660Z-3940-test-result.json` |
| `--mode check --final` | passed | `2026-10-26T07-27-04.441Z-25964-check-result.json` |
| `--mode test --final` | passed，proofAudit nc1 绑定 red/restored 如下 | `2026-10-26T07-27-08.700Z-25488-test-result.json` |
| `--mode real --final` | passed | `2026-10-26T07-27-16.484Z-35692-real-result.json` |
| `--mode archive` | passed，274 份 / 2,578,831 字节 | `docs/acceptance/wave2/c/ARCHIVE.json` |

每次 test 后复核：本机无命令行含 `w2c<数字>t<hex>` 令牌的进程，`.local/w2-c-fixtures/` 为空。

### 补单 01 负控 nc1

在已提交的 `39539a1e` 上只改 `src/lib.rs` 的 `next_boundary_ok`：函数体改为 `let _ = next; true`（去掉后边界检查）。测试未改（testHash 红绿相同 `68b1fb748b5e0c3c7825e542b3ea6c23dca56589a0e55ab7f1d4d1c3c0b219e3`）。

- 红：`process_path_reference` FAILED，3 passed / 1 failed，exit 101；信息 `PROC_PATH_BOUNDARY: = after the path must not match`
- 变异中 `lib.rs` SHA256 `474c417f811c293bdb8c91b8e5709ca709f78bb4a5c00ef3879f070a360a33a6`，productionHash `af9daf6df67a11a2fec151aec00d585b68f3d7ba0331b938e79cd4a89f32e809`
- 立即 `git checkout -- packages/process-scan/src/lib.rs`，`lib.rs` 回到 `db10849cac94c085615a7ef30cd3c0d7ecc5d4ccb67e645c6ab7249730f1783e`，productionHash `6a530c64497850078af6c571a657aa4ef3ba97b72c5c9ccb49b4e14f479f66de`
- 绿：随后 `--mode test` 四绿；final proofAudit：`red=2026-10-26T07-26-23.744Z-40632-red-nc1-result.json`，`restored=2026-10-26T07-26-43.660Z-3940-test-result.json`

### 补单 01 真实冒烟摘要

`--mode real --final`：process_count 358，access_denied 5，exited 1，chrome.exe 13，msedge.exe 6，node.exe 5，orphan_count 0（默认 pattern）。

### 补单 01 假设

- `taskkill.exe` 是清理工具自身，不带令牌，不属夹具进程；`CREATE_NO_WINDOW` 下系统为控制台创建的 `conhost.exe` 不触碰，随宿主退出。
- 复核快照与 `taskkill` 之间仍有极小竞态；创建时间 + 令牌双重核对把 PID 复用误杀降到需在毫秒级窗口内复用同 PID 且命令行恰含本次随机令牌。
- 为在不加测试开关的前提下经公开 API 验证 PID 复用规则，新增 `ProcessSummary::descendant_pids`。
- 路径后紧跟 `=` 按 SPEC 后边界集合视为不命中。
## 未做 / 未验证

- macOS / 非 x64 Windows
- 生产竞态（快照与查询之间进程退出的完整分类精度）
- 与 WATER-W2-A/B/D/E 的接线；IPC 层 `item_id` 包装
- 真实删除或结束他人进程
- 主线集成与总控交叉核对
