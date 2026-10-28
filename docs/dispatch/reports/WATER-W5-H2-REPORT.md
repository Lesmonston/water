WATER-W5-H2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w5-h2/docs/dispatch/reports/WATER-W5-H2-REPORT.md

# WATER-W5-H2 服务 M2 收尾 — 任务报告

- 模型：Cursor Grok 4.6
- 分支 / 工作树：`worker/water-w5-h2` / `F:/new/smaltalk/water/.worktrees/w5-h2`，起点 `3f9078972d7f958fad6bfd42e68f022dd659539e`
- **实现提交：`17cab09cdd744a893edff2c495a378a81e0a380c`**（只含 `packages/water-service/` 下已有 4 个文件）
- 报告与证据另起一个提交（本文件 + `docs/acceptance/wave5/h2/`）
- 状态：SUBMITTED。未改台账、清单、契约、检查器、`Cargo.toml`、`Cargo.lock`、其它 crate；未 push / merge / rebase。
- 时间均为 Asia/Tokyo（JST）；回执文件名里的时间是 UTC（Z），+9 小时即 JST。

## 改动文件（`git diff --stat 3f907897 17cab09c`）

| 文件 | 改动 |
|---|---|
| `src/clean.rs` | 开始清理：令牌先作废；可能失败的准备放进 `catch_unwind`，且都在 `busy=cleaning` 之前；清理线程里 `in_use` panic 后 `clean_progress` 回到空闲对象，日志不删 |
| `src/service.rs` | 扫描结束：锁内不再 `expect`；先在内存里写 `last`，再写盘，写盘失败撤回 `last`；panic 守卫只在盘上还没有这份记录时撤回；`valid_custom` 对已知文件夹同时比较文字形式与规范化形式 |
| `src/lib.rs` | `WindowsPlatform` 进程快照锁中毒后 `PoisonError::into_inner` 取出继续用 |
| `tests/service_v1.rs` | 仍是精确 6 个测试；在已有测试里补 `SERVICE_PANIC_IDLE` / `SERVICE_SCAN_RECORD` / `SERVICE_CUSTOM_ROOT` |

Cargo.toml、Cargo.lock、`native_windows.rs`、`storage.rs`、`views.rs`、`examples/service_smoke.rs` 未改。`lib.rs` 仍为 `#![deny(unsafe_code)]`，其它模块仍为 `#![forbid(unsafe_code)]`；未新增公开项、依赖、`unsafe`、进程、网络或环境变量读取。系统调用仍只在 `native_windows.rs`。

实现提交后的生产/测试哈希（final 回执 `sourceState`）：

- productionHash `5efe37f179f47e87bcf462cb9a1312790c0a6923d9e27d5cfbeecad7390d1d7f`
- testHash `9de12a3cb522358c5d205ca68b17c64098201cd83d2801501b455e7f85810aa2`

文件 SHA-256：`lib.rs` `899cbabb…1437`；`clean.rs` `4c7329b7…2f6e`；`service.rs` `9b3c84b4…fcfa`；`tests/service_v1.rs` `8a9c12cf…ecd9`。

## 逐条对照 SPEC

### §1 开始清理时不能把“忙”卡住

`clean::start`（`src/clean.rs`）：

1. 检查通过后立即 `consume_confirmation` 并写回内存里的计划（`used=true`）。失败也不恢复令牌。
2. `now()`、分配 `clean_id`、组顺序、标题（`details.get`，不再用 `[]` 取值）、写计划文件，全部放在设 `busy=cleaning` **之前**，并包在 `catch_unwind` 里。panic → `unavailable`，`busy` 仍是 `idle`。
3. 只有准备成功后才设 `cleaning` 并起线程。
4. 清理线程里占用判断 panic：内层 `catch_unwind` 认出 panic 后把 `clean_progress` 设成 `idle()`（空闲对象），`busy=idle`，停信号清空；已经建好的 `journal\<clean_id>.jsonl` 不删。
5. 外层任务体或 `spawn` 失败同样回到 `idle()`。

测试（`SERVICE_PANIC_IDLE`）：测试平台在 `water-clean` 线程的 `in_use` 里 panic → 进度空闲、服务空闲、日志在、可以再扫一次；`now()` 在开始清理的准备阶段 panic → `call` 返回 unavailable，busy 与 `clean_progress` 都是 idle。

### §2 扫描完成时不留下“半个”完成记录

做法（回执要求写清）：

1. **锁里不得 panic。** 进度分类的 `found_bytes` 用 `as_array_mut` / `filter`，取不到就跳过；计划 JSON 用 `unwrap_or(Null)`，不再 `expect`。
2. **先内存、后写盘、失败撤回。** 在锁里先更新进度数字并把 `last` / `local_scans` / `records` 写成这次扫描，然后放下锁写 `snapshots` + `scans`（避免写盘挡住 50 ms 进度查询）。写盘成功再把进度 `state` 写成 completed/partial 并 `trim`；写盘失败则把 `last` 撤回扫描前的值，从 `local_scans` 和 `records` 去掉这次，进度 `failed`。
3. **线程整体 panic。** 若盘上还没有 `scans\<id>.json`，撤回 `last` 并标 failed；若文件已经在，两边都算成功，不再撤回（避免“盘上有完成记录、内存却退回”的半份）。

重启只从盘上的扫描记录重建 `last`。写盘失败时文件不在，重启后的 `last_scan` 不是这次。

测试（`SERVICE_SCAN_RECORD`）：成功扫描后换一个 Service，`last_scan` 就是这次；夹具在 `scans\<id>.json` 放一个同名目录让写盘失败，本进程和重启后的 `last_scan` 都仍是上一次成功的扫描。

### §3 进程快照锁中毒后恢复

`WindowsPlatform::begin_in_use_batch` 与 `in_use`（`src/lib.rs`）对 `processes` 锁使用 `unwrap_or_else(PoisonError::into_inner)`，与状态锁相同。快照本身取不到时仍返回“无法确认占用状态”。没有产品挂点，只靠代码审查。

### §4 自定义文件夹：文字形式与规范化形式都比较

`valid_custom`：对每个已知文件夹，`util::contains(path, 原文)` 或 `util::contains(path, 规范化形式)` 任一成立就拒绝。Windows 目录仍按原规则用规范化形式判断“是否在 Windows 里面”。

测试（`SERVICE_CUSTOM_ROOT`）：夹具 `home\AppData` 联接（或目录符号链接）到别处，测试平台的 `local_app_data` 写成 `home\AppData\Local`，选择框返回 `home` 时拒绝，句子仍是“这个位置太大或包含系统目录，请选择具体的项目文件夹。”

联接夹具：测试里先试 `std::os::windows::fs::symlink_dir`（不启进程）；失败再用与 junk-scan / junk-clean 测试相同的 `cmd /D /C mklink /J`。只出现在测试文件，生产代码没有 `Command`。

### §5 测试 / §6 不变

`tests/service_v1.rs` 仍是精确 6 个名字：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`、`service_hardening`。原有标记与断言未改。IPC、存储格式、依赖、清理开关由宿主传入，均未动。

## 检查命令与结果

全部命令：`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W5-H2 --mode <m> [--final]`，在工作树根运行。回执在 `.local/checks/WATER-W5-H2/`，已归档到 `docs/acceptance/wave5/h2/receipts/`。

| 时间（JST） | 模式 | HEAD | 结果 | 回执 |
|---|---|---|---|---|
| 22:11 | baseline | 3f907897 | passed（总控预飞，本树已有） | `2026-10-27T13-11-13.459Z-43720-baseline-result.json` |
| 22:37 | baseline | 3f907897 | passed | `2026-10-27T13-37-25.495Z-30000-baseline-result.json` |
| 22:46 | lock | 3f907897 | passed | `2026-10-27T13-46-08.198Z-23452-lock-result.json` |
| 22:46 | check | 未提交实现 | failed（`cargo fmt --check`，已按 rustfmt 改完） | `2026-10-27T13-46-21.221Z-19068-check-result.json` |
| 23:04 | check | 未提交实现 | passed | `2026-10-27T14-04-17.303Z-23276-check-result.json` |
| 23:05 | test | 未提交实现 | passed（6 passed, 0 ignored） | `2026-10-27T14-05-02.157Z-28292-test-result.json` |
| 23:07 | 实现提交 | **17cab09c** | — | — |
| 23:07 | red-nc1 | 17cab09c + 一处生产改动 | passed（预期失败已观察到） | `2026-10-27T14-07-51.889Z-26172-red-nc1-result.json` |
| 23:08 | test | 17cab09c | passed | `2026-10-27T14-08-28.708Z-39536-test-result.json` |
| 23:09 | red-nc2 | 17cab09c + 一处生产改动 | passed（预期失败已观察到） | `2026-10-27T14-09-11.313Z-13124-red-nc2-result.json` |
| 23:09 | test | 17cab09c | passed | `2026-10-27T14-09-48.881Z-42948-test-result.json` |
| 23:10 | red-nc3 | 17cab09c + 一处生产改动 | passed（预期失败已观察到） | `2026-10-27T14-10-29.089Z-38352-red-nc3-result.json` |
| 23:11 | test | 17cab09c | passed | `2026-10-27T14-11-09.696Z-24876-test-result.json` |
| 23:11 | check --final | 17cab09c（干净） | passed | `2026-10-27T14-11-48.034Z-6300-check-result.json` |
| 23:12 | test --final | 17cab09c（干净） | failed：`SERVICE_RETURN_BUDGET: locations_set_category`（并行机器忙，规则允许原样重跑一次） | `2026-10-27T14-12-02.892Z-24828-test-result.json` |
| 23:12 | test --final | 17cab09c（干净） | passed；6 passed / 0 failed / 0 ignored，22.06 s；proofAudit nc1/nc2/nc3 全部通过 | `2026-10-27T14-12-41.389Z-34704-test-result.json` |
| 23:13 | real --final | 17cab09c（干净） | passed | `2026-10-27T14-13-17.517Z-3856-real-result.json` |
| 23:22 | archive | 17cab09c | passed；339 个文件、4,594,069 字节 | `2026-10-27T14-22-37.018Z-28424-archive-result.json` |

`test --final` 的 proofAudit：nc1 → `39536` 转绿，nc2 → `42948` 转绿，nc3 → `24876` 转绿。

第一次 `test --final` 红在 `service_trends_locations` 的 `locations_set_category` 50 ms 返回预算，与第五波规则写的“磁盘忙可原样重跑一次”相符；紧接着同命令、同提交、产品字节未变的第二次通过。没有连续两次失败。

`real --final` 在第一次通过之后，同提交上又留下了 5 份同样通过的 real 回执（`23684` / `26320` / `15560` / `19260` / `27348`）。产品字节未变，本不应再跑；以第一份 `3856` 为准，其余只归档不另作结论。

## 负控记录

每条都在实现提交 `17cab09c` 之上只改生产代码里真正被调用的一处，不改测试、不加开关；跑 `--mode red-ncN` 后立即 `git checkout -- <文件>`、记哈希、跑 `--mode test` 转绿。三条红都不是编译错误、超时或改测试造成的（检查器已断言）。

### nc1 → `SERVICE_PANIC_IDLE`

- 改动：`src/clean.rs`，在 `consume_confirmation` 之后、准备阶段 `catch_unwind` 之前插入 `s.busy = "cleaning";`
- 效果：准备阶段 `now()` panic 时 busy 停在 `cleaning`，不再回到 idle
- 失败信息：`assertion left == right failed: SERVICE_PANIC_IDLE: busy after a clean start prep failure`；`left: String("cleaning")` / `right: "idle"`；`test result: FAILED. 5 passed; 1 failed`
- 还原后 `sha256(packages/water-service/src/clean.rs)` = `4c7329b797ebc0ae21f6bff8e5db6b2cac4fd567bf2e28b5ca83d99827a02f6e`
- 转绿：`2026-10-27T14-08-28.708Z-39536-test-result.json` passed

### nc2 → `SERVICE_SCAN_RECORD`

- 改动：`src/service.rs` 扫描写盘失败分支，删掉把 `last` 撤回到 `previous_last` 的三行
- 效果：写盘失败后内存里的 `last` 仍指向这次扫描；`last_scan` 不再是上一份成功记录
- 失败信息：`assertion left == right failed: SERVICE_SCAN_RECORD: in-process last_scan after a failed write`；`left: Null` / `right: String("scan-20270115T080000Z-aa08")`；`5 passed; 1 failed`
- 还原后 `sha256(packages/water-service/src/service.rs)` = `9b3c84b43fffb61414002ee7195a3dc1ee23a9dde15de03c8cd5e7144b96fcfa`
- 转绿：`2026-10-27T14-09-48.881Z-42948-test-result.json` passed

### nc3 → `SERVICE_CUSTOM_ROOT`

- 改动：`src/service.rs` `valid_custom`，把 `util::contains(path, p) || util::contains(path, &canon)` 改成只比较规范化形式
- 效果：`home\AppData` 指向别处时，选择 `home` 被放行
- 失败信息：`SERVICE_CUSTOM_ROOT: home that contains a known folder via a junction was added: Object {"added": … "root_id": String("home") …}`；`5 passed; 1 failed`
- 还原后 `sha256(packages/water-service/src/service.rs)` = `9b3c84b43fffb61414002ee7195a3dc1ee23a9dde15de03c8cd5e7144b96fcfa`
- 转绿：`2026-10-27T14-11-09.696Z-24876-test-result.json` passed

## 真实只读冒烟（real --final，第一份 `3856`）

- status `completed`，duration_ms 108555，drives 4，insights 0
- totals：recognized 47,251,892,607 B；recommended 10,555,306,431；confirm 8,855,026,626；advisory 5,651,481,018；protected 12,041,011,896；unrecognized 0
- 分类：agent_tool 12 组 / 22,150,571,006 B；browser 14 / 10,101,270,562；system_temp 2 / 488,205,798；app_leftover 6 / 7,593,574,163；dev_cache 13 / 5,218,794,145；crash_log 7 / 1,041,516,594；gpu_system 2 / 657,960,339
- clean_prepare_code：`unavailable`（清理关闭，符合 `--mode real` 不执行清理）
- in_use_labels：`["Edge 正在运行，将跳过占用的项"]`
- 输出不含绝对路径（检查器断言通过）。数据目录为检查器自建的 `.local/w3-f1-real/<stamp>`。

## 没做或没验证的

- §3 进程快照锁恢复没有不加挂点的测试，只经代码审查（SPEC 第 5 节允许）。
- 未对 macOS、真实用户 scope、生产竞态、打开清理后的真机删除做验收。
- 未改宿主清理开关；real 冒烟里清理仍关闭。
- 未 push、未合主线、未改台账。
- archive 回执本身（`…-28424-archive-result.json`）在归档复制之后才写出，因此不在 `ARCHIVE.json` 里。

## 遗留的临时目录

工作树 `.local/`（已被忽略）：检查器回执 `.local/checks/WATER-W5-H2/`、真实冒烟数据目录 `.local/w3-f1-real/<stamp>`、`.local/w3-target`、`.local/w3-cargo-home`、`.local/w3-tmp`；测试夹具由测试自己删除。
