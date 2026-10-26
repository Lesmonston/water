WATER-W4-G2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g2/docs/dispatch/reports/WATER-W4-G2-REPORT.md

# WATER-W4-G2 服务加固 — 任务报告

- 模型：Grok Bot（kelaimao1）
- 分支 / 工作树：`worker/water-w4-g2` / `F:/new/smaltalk/water/.worktrees/w4-g2`，起点 `0ca42f8e8038a5a7816802c5a7f175a966b0625c`
- **实现提交：`a13a97f86c2b6902059f09cb6c9e0a0dcf607dfc`**（只含 `packages/water-service/` 下 6 个已有文件）
- 报告与证据另起一个提交（本文件 + `docs/acceptance/wave4/g2/`）
- 状态：SUBMITTED。未改台账、清单、契约、检查器、apps/ 及其它 crate；未 push / merge / rebase。
- 时间均为 Asia/Tokyo（JST）；回执文件名里的时间是 UTC（Z），+9 小时即 JST。

## 改动文件（`git diff --stat 0ca42f8 a13a97f`）

| 文件 | 改动 |
|---|---|
| `src/service.rs` | +284/−… 状态锁中毒取回；`call` 包 `catch_unwind`；扫描线程整体保护（`ScanJob::run`）；`local_scans`、`stale_plans`；启动整理；自定义根规范路径判断；观察者锁中毒取回 |
| `src/clean.rs` | +28 信任边界检查、第 6 节部分完成判断、清理线程整体保护 |
| `src/storage.rs` | +81 `Store::tidy`（临时文件、计划/日志各 60 上限） |
| `src/views.rs` | +32/−… 产品名对照表 |
| `examples/service_smoke.rs` | +10/−… 输出加 `in_use_labels` |
| `tests/service_v1.rs` | +443/−… 新增 `service_hardening`；`service_scan_views` 只改占用提示那一条为 “Chrome 正在运行，将跳过占用的项” |

Cargo.toml、Cargo.lock、lib.rs、README 未改。`lib.rs` 仍为 `#![deny(unsafe_code)]`，其它模块仍为 `#![forbid(unsafe_code)]`；未新增公开项（新增的 `local_scans` 是 `pub(crate) struct State` 的字段，`tidy` 在 `pub(crate) struct Store` 上，所在模块均为私有 `mod`；crate 对外导出项与签名未变）；生产代码无进程启动、无联网、无环境变量读取，系统调用仍只在 `native_windows.rs`。

## 逐条对照 SPEC

### §1 范围
- 只改 `packages/water-service/` 已有文件；依赖不变（check 回执 dep policy 通过，Cargo.lock 哈希未变）。17 个 IPC 命令、参数、返回形状、错误码未改。清理关闭时 `clean_prepare`/`clean_start` 仍最先返回 unavailable 的固定句子（real 冒烟 `clean_prepare_code: "unavailable"` 并断言了“这一版只做体检，清理功能会在下一版开放。”）。

### §2 任何 panic 都不让服务卡死
1. `Service::call` 把原命令处理移到私有 `dispatch`，外面 `catch_unwind(AssertUnwindSafe(..))`，panic → `Err(IpcError::new("unavailable"))`，句子 “Water 服务暂时不可用。”（SERVICE §3）。测试：`now()` 在 `trends` 里 panic 一次，`catch_unwind` 包住的 `call` 返回 `Ok(Err(unavailable))`，之后 `app_state` 正常。
2. 状态锁：`lock()` 改为 `unwrap_or_else(PoisonError::into_inner)`，中毒后照常使用，不再返回 unavailable。
3. 扫描线程：原线程体整体搬进 `ScanJob::run`，线程里 `catch_unwind` 包住整个 `run`（含 scan、快照、增长、视图、存盘）。panic 时：取锁（中毒取回）→ 若 `last` 已被本次写成本次 ID 则还原为扫描前的 `last` → 从 `local_scans` 去掉 → 扫描进度 `failed` → `busy` 为 `idle` → 取消令牌清空。清理线程同样整体包住：panic 时清理进度 `failed`、`busy` idle、停止信号清空，日志文件不碰（原样保留）。测试覆盖扫描线程（`drives()` 只在名为 `water-scan` 的线程里 panic）：进度 failed、busy idle、last_scan 不变，随后马上再扫一次正常完成。
4. 观察者回调里的 `reported`、`last_found` 两个锁也改为中毒取回。

### §3 信任边界
1. 内存集合 `local_scans` 只在本进程扫描完成并存好时加入；`clean_prepare` 在“已消耗”检查之后，若 `last_scan` 的 ID 不在集合里返回 `stale`（“结果已过期，请重新体检后再清理。”）。读回的记录照常用于显示、趋势、记录与 `last_scan`。
2. 启动时读回的计划记入 `stale_plans`，`clean_start` 对它返回 `stale`（沿用已有逻辑，只是来源改为启动时全部读回的计划）。
3. `clean_start` 执行的是 `prepare` 留在内存 `s.plans` 里的计划，执行前后不读回计划文件。测试：prepare 后改写磁盘计划文件加入 npm 缓存条目，start 后该“受害”文件完好，删掉的只有原计划条目。
4. “已消耗”标记照常写盘，仅作显示。

### §4 存储整理
`Service::new` 读完记录后调用 `Store::tidy()`：只看数据目录根与 `scans`、`snapshots`、`plans`、`cleans`、`journal` 五个子目录里的平铺普通文件（不递归，目录/重解析点跳过，删除失败忽略，不让启动失败）。
1. 临时文件：手写匹配 `^\.[A-Za-z0-9._-]+\.[0-9a-f]{32}\.tmp$`，其它一律不动。
2. 计划：`plans\plan-….json` 且 ID 合法（沿用 `util::record_id` 判断），按 ID 排序保留最新 60，被删 ID 同时从内存计划里去掉。
3. 日志：`journal\clean-….jsonl` 且 ID 合法，保留最新 60。
测试：3 个匹配临时文件、`.notes.tmp`、`keep.txt`、`.bad name.<32hex>.tmp`、一个按计划命名的目录，70 计划 + 70 日志；之后匹配的没了、不匹配的在、计划和日志各剩 ID 最新的 60 个，其余文件清单不变。

### §5 规范路径
1. 添加与读回设置都经 `valid_custom`：先 `std::fs::canonicalize`，去 `\\?\` 前缀；求不出或与给出路径（ASCII 大小写不敏感）不同则按不合格拒绝（SERVICE §6 句子）。
2. 已知目录、Windows 目录各自能求规范路径就用规范路径，求不出用原文；比较规则仍是按段、ASCII 大小写不敏感。
3. 其它规则（普通目录、重解析点、盘根、16 个上限、重复返回已有项、root_id）未动。
测试：夹具 `Kf-Ä\profile`，测试平台的 user_profile 写成 `…\kf-ä\profile`；picker 返回 `…\Kf-Ä` 与 `…\kf-ä` 都被拒（`TOO_BROAD` 句子），picker 返回普通项目目录仍被接受。

### §6 部分完成的扫描
`last_scan.status == "partial"` 时，issues 里有 `budget_exhausted`，或任一 issue 落在 protected 组上，`clean_prepare` 返回 `stale`、“这次体检没有完整完成，请重新体检后再清理。”；`completed` 不受影响。
测试：`.claude/projects` 下用 `from_wide` 建含未配对代理项的文件 → partial，issue 在 `claude-code-sessions`（protected）→ prepare stale + 指定句子，夹具不变；再把同样的文件放进 Chrome `Default\Cache`（推荐组）→ partial 但 issue 只在 `chrome-cache` → prepare 正常。

### §7 产品名
`views.rs` 增加 6 项对照表（ASCII 大小写不敏感、含 `.exe`）；其它仍是去掉 `.exe` 的原名；完整句子与“暂时无法确认…”未变；旧记录不改写。测试：`msedge.exe`→“Edge 正在运行，将跳过占用的项”、`Chrome.exe`→“Chrome …”、`CHROME-HEADLESS-SHELL.EXE`→“Chrome 无头浏览器 …”、`other.exe`→“other …”。

### §8 测试
`tests/service_v1.rs` 精确 6 个测试：`service_clean_flow`、`service_hardening`、`service_ipc_contract`、`service_scan_views`、`service_storage_safety`、`service_trends_locations`；0 ignored。原 5 个只改了 §8 允许的那一条占用提示。`service_hardening` 覆盖 6 个标记：`SERVICE_PANIC_IDLE`、`SERVICE_TRUST_BOUNDARY`、`SERVICE_STORE_TIDY`、`SERVICE_CANONICAL_ROOT`、`SERVICE_PARTIAL_SOURCE`、`SERVICE_PRODUCT_NAME`。夹具只用本树 `.local/w3-f1-fixtures/` 下随机目录与测试自己的 Platform，不读真实位置、不启动进程，只删自己建的目录（先核父目录与前缀）。

### §10 真实只读冒烟
`examples/service_smoke.rs` 只加 `in_use_labels`（所有组 `process_label_zh` 去重、字典序，没有则为空数组），其它不变，输出不含路径（检查器断言通过）。

## 检查命令与结果

全部命令：`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G2 --mode <m> [--final]`，在工作树根运行。回执在 `.local/checks/WATER-W4-G2/`，已归档到 `docs/acceptance/wave4/g2/receipts/`。

| 时间（JST） | 模式 | HEAD | 结果 | 回执 |
|---|---|---|---|---|
| 22:00 | baseline | 0ca42f8 | passed | `2026-10-26T13-00-14.798Z-24224-baseline-result.json` |
| 22:27 | baseline | 0ca42f8 | passed | `2026-10-26T13-27-06.388Z-24388-baseline-result.json` |
| 22:27 | lock | 0ca42f8 | passed | `2026-10-26T13-27-18.900Z-35796-lock-result.json` |
| 22:38 | check | 0ca42f8 + 未提交实现 | passed | `2026-10-26T13-38-12.063Z-37516-check-result.json` |
| 22:38 | test | 0ca42f8 + 未提交实现 | passed（6 passed, 0 ignored） | `2026-10-26T13-38-23.375Z-8660-test-result.json` |
| 22:41 | red-nc1 | a13a97f | passed（预期失败已观察到） | `2026-10-26T13-41-34.453Z-43360-red-nc1-result.json` |
| 22:42 | test | a13a97f | passed | `2026-10-26T13-42-12.675Z-9484-test-result.json` |
| 22:42 | red-nc2 | a13a97f | passed（预期失败已观察到） | `2026-10-26T13-42-41.692Z-23128-red-nc2-result.json` |
| 22:43 | test | a13a97f | passed | `2026-10-26T13-43-01.249Z-40592-test-result.json` |
| 22:43 | red-nc3 | a13a97f | passed（预期失败已观察到） | `2026-10-26T13-43-29.257Z-3220-red-nc3-result.json` |
| 22:43 | test | a13a97f | passed | `2026-10-26T13-43-48.714Z-10968-test-result.json` |
| 22:44 | check --final | a13a97f（干净） | passed | `2026-10-26T13-44-20.265Z-35012-check-result.json` |
| 22:44 | test --final | a13a97f（干净） | passed；6 passed / 0 failed / 0 ignored，14.13 s；proofAudit nc1/nc2/nc3 全部通过 | `2026-10-26T13-44-32.388Z-36680-test-result.json` |
| 22:45 | real --final | a13a97f（干净） | passed | `2026-10-26T13-45-01.319Z-36856-real-result.json` |
| 22:46 | archive | a13a97f | passed | `2026-10-26T13-46-46.817Z-31684-archive-result.json` |

所有通过的 check/test/final 回执里 productionHash 均为 `ddc2cc9bc796…`、testHash 均为 `b76cc1a967a2…`（即实现提交的字节）；final 跑在干净的实现提交上，之后产品字节未变，未重跑。

50 ms 预算：全程没有出现磁盘繁忙超时，未触发重跑规则。

另外在迭代时，用与检查器相同的工具链与环境（1.95.0、`.local/w3-cargo-home`、`.local/w3-target`、offline、jobs=1）直接跑过：`cargo fmt --manifest-path packages/water-service/Cargo.toml`（格式化）和 `cargo clippy --offline --locked --all-targets -- -D warnings`（通过）。这两次不是检查器回执。

## 负控记录

每条都在实现提交 `a13a97f` 之上只改 src 里一行真正被调用的生产代码，不改测试、不加开关；跑 `--mode red-ncN` 后立即 `git checkout -- <file>`、记哈希、跑 `--mode test` 转绿。三条红都不是编译错误、超时或改测试造成的（检查器已断言）。

### nc1 → `SERVICE_PANIC_IDLE`
- 改动：`src/service.rs` 第 503 行
  - 原：`let guarded = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| job.run()));`
  - 改：`let guarded: std::thread::Result<()> = Ok(job.run());`（去掉后台任务的整体保护）
- 失败信息：`thread 'service_hardening' panicked at tests\service_v1.rs:1315:9: SERVICE_PANIC_IDLE: scan_progress is still running and the service stays busy`；`test result: FAILED. 5 passed; 1 failed`
- 还原后 `sha256(packages/water-service/src/service.rs)` = `34061a22f0487e33b2c0e3f5e99c14df24aa35ee284dbea09b2821ca81b564db`
- 转绿：`2026-10-26T13-42-12.675Z-9484-test-result.json` passed

### nc2 → `SERVICE_TRUST_BOUNDARY`
- 改动：`src/clean.rs` 第 26 行
  - 原：`if !s.local_scans.contains(&r.result.scan_id) {`
  - 改：`if false {`（允许对启动时读回的扫描 prepare）
- 失败信息：`thread 'service_hardening' panicked at tests\service_v1.rs:1469:10: SERVICE_TRUST_BOUNDARY: a scan read from disk became a cleaning source: Object {"by_drive": …, "plan_id": String("plan-20270115T080000Z-ebbd"), …}`；`5 passed; 1 failed`
- 还原后 `sha256(packages/water-service/src/clean.rs)` = `672ae34e0d688b12d442a31b5710581e949cf8816f1c9637d60a96e9ea0dff20`
- 转绿：`2026-10-26T13-43-01.249Z-40592-test-result.json` passed

### nc3 → `SERVICE_PARTIAL_SOURCE`
- 改动：`src/clean.rs` 第 30 行
  - 原：`if r.result.status == "partial"`
  - 改：`if false`（去掉第 6 节的部分完成判断）
- 失败信息：`thread 'service_hardening' panicked at tests\service_v1.rs:1642:10: SERVICE_PARTIAL_SOURCE: a partial scan with an unclear protected group became a source: Object {… "plan_id": String("plan-20270115T080000Z-3275") …}`；`5 passed; 1 failed`
- 还原后 `sha256(packages/water-service/src/clean.rs)` = `672ae34e0d688b12d442a31b5710581e949cf8816f1c9637d60a96e9ea0dff20`
- 转绿：`2026-10-26T13-43-48.714Z-10968-test-result.json` passed

test --final 的 proofAudit：nc1 → 9484 转绿，nc2 → 40592 转绿，nc3 → 10968 转绿，均通过。

## 真实只读冒烟（real --final）

- status `completed`，duration_ms 48288，drives 4，insights 0
- totals：recognized 46,480,448,772 B；recommended 9,655,223,043；confirm 8,673,117,224；advisory 6,415,101,197；protected 11,854,821,128；unrecognized 0
- 分类：agent_tool 12 组 / 21,920,049,547 B；browser 14 / 9,856,402,421；system_temp 2 / 320,348,981；app_leftover 6 / 7,844,981,759；dev_cache 13 / 4,821,269,907；crash_log 7 / 1,061,640,723；gpu_system 2 / 655,755,434
- clean_prepare_code：`unavailable`（清理关闭的固定句子，符合预期）
- **in_use_labels：`["Chrome 正在运行，将跳过占用的项", "Edge 正在运行，将跳过占用的项"]`**
- 输出不含绝对路径（检查器断言通过）。数据目录为检查器自建的 `.local/w3-f1-real/<stamp>`。

## 偏差与需要总控裁定的点

1. **实现先提交、再做负控**（交代顺序是“负控 → 干净实现提交”）。原因：检查器 red 模式要求 `git diff HEAD -- tests` 为空，且负控后要 `git checkout -- <file>` 还原，两者都只有在实现已提交时才成立；proofAudit 按文件哈希判断，与顺序无关。final 跑在同一实现提交上。
2. **提交身份**：机器上没有 git 身份，规则禁止改全局配置，所以用 `git -c user.name="Grok Bot (kelaimao1)" -c user.email="kelaimao1@grokbot.invalid" commit`，没有写入任何配置。
3. **§6 的保守处理**：issue 的 `group_id` 在 groups 里找不到时，按“落在受保护组上”处理（拒绝 prepare）。
4. **`lib.rs` 未改**：`WindowsPlatform` 的进程快照锁在中毒时走原有的降级分支（不是状态锁，不影响 §2.2）。
5. **扫描失败时 `last` 的还原**：若 panic 发生在本次扫描已写入 `last` 之后，会还原为扫描前的值，保证“失败的扫描不成为 last_scan”；已经写盘的那份扫描记录文件不删除（只是不作为 last，也不进入 `local_scans`）。
6. **规范路径**：Windows 目录同样用规范路径比较，求不出用原文；SPEC §5 只点名已知目录与 Windows 目录，按此实现。

## 没做或没验证的

- 清理线程 panic 的整体保护已实现，但 `service_hardening` 没有对清理线程注入 panic（SPEC §8 未要求），因此“清理中 panic → failed/idle/日志保留”只经代码审阅，没有测试证明。
- 观察者回调锁中毒取回、状态锁中毒后继续使用，没有专门的注入测试（SPEC §8 未要求）。
- 8.3 短名与联接别名没有测试（SPEC 说明由总控验收时补），只测了非 ASCII 大小写别名。
- 未对 §4、§5、§7 做负控（检查器只认 nc1–nc3；SPEC §9 说总控另做变异）。
- archive 回执本身（`…-31684-archive-result.json`）在归档复制之后才写出，因此不在 `ARCHIVE.json` 里。

## 遗留的临时目录

- `C:/Users/37310/water_g2_stage/`：我自己的脚本与日志暂存目录（不在仓库里）。
- 工作树 `.local/`（已被忽略）：检查器回执 `.local/checks/WATER-W4-G2/`、真实冒烟数据目录 `.local/w3-f1-real/<stamp>`、`.local/w3-target`、`.local/w3-cargo-home`、`.local/w3-tmp`；测试夹具目录由测试自己删除。
