WATER-W6-I2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w6-i2/docs/dispatch/reports/WATER-W6-I2-REPORT.md

## 交付身份与范围

- 日期：2026-10-28；执行者：Codex，GPT-6（系统提供的模型系列标识，未提供更细子型号）。没有启动子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w6-i2`；分支：`worker/water-w6-i2`。
- 首次 HEAD：`d79fb096ef0557430b7dd43634b4d60e8f2de958`，首次核对干净，baseline 通过。
- 实现提交：`cf272e34e7c38c94f50ca752c8ddaecdfe358fd0`。三个 final 全部绑定此提交，运行前后均干净。
- 产品提交只含 `apps/water/host/src/lib.rs`、`apps/water/host/tests/host_v1.rs`、`apps/water/host/README.md`。后续提交仅含本回执和检查器生成的归档。
- 提交身份为 `Codex GPT-6 <codex-gpt6@localhost>`，只在提交命令进程内设置四个 Git 身份环境变量；没有改 Git 配置、远端或已有历史，没有 push、merge、rebase、amend、reset。

## HOST-M3 逐项落实

### 1. 退出时限时停止清理

`src/lib.rs` 新增公开 `CleanStop { Idle, Stopped, TimedOut }` 和指定签名的 `stop_cleaning_within`。

- 初始状态确认不在清理时立即返回 `Idle`，不发送停止。
- 初始状态为清理中或未知时只发送一次 `clean_stop`，随后轮询。确认不在清理后返回 `Stopped`；总体等待到限或连续未知达到五秒时返回 `TimedOut`。
- `run` 在进入事件循环前克隆转发槽；`app.run_return` 的回调通过 `if let tauri::RunEvent::Exit = event` 分支，同步调用 `stop_cleaning_within(exit_backend.as_ref(), Duration::from_millis(200), Duration::from_secs(10))`。分支只调用后端，没有关窗、投递主线程任务或等待事件循环。
- 原来的关窗线程 join、`slot.take()` 后释放服务、停止并 join 激活线程、最后释放实例锁的顺序保留。

新增 `HOST_EXIT_DURING_CLEAN` 断言：收到停止后才倒数的后端返回 `Stopped`、剩余计数归零、停止恰好一次；空闲返回 `Idle` 且不停止；始终清理在 40 ms 上限后返回 `TimedOut` 且只停止一次；源码断言核对退出回调中的实际接线和两个时长。

### 2. 三态判断与连续未知等待

新增公开 `CleanState { Cleaning, NotCleaning, Unknown }` 和 `clean_state`：成功且 `busy == "cleaning"` 为 `Cleaning`，其它成功响应为 `NotCleaning`，调用失败为 `Unknown`。

- 主窗口关闭保护只在 `NotCleaning` 时直接放行。`Cleaning`、`Unknown` 都阻止本次关闭，在原后台线程调用 `stop_cleaning_and_wait`，结束后再次请求关闭。等待期间的重复关闭仍被阻止，不启动第二次停止。
- 两个公开等待函数共用私有 `stop_cleaning`。它使用 `Instant` 计时；`Cleaning` 清空连续未知的起点，`Unknown` 连续满五秒才放弃，`NotCleaning` 结束等待。轮询睡眠同时受 `poll`、剩余总体时限和剩余未知时限约束。
- `stop_cleaning_and_wait(backend, poll) -> bool` 签名不变：初始确认空闲返回 `false`；初始清理或未知发送停止后返回 `true`，包括未知等待最终耗尽的情形。其内部的 `TimedOut` 不表示已确认停止。

新增 `HOST_CLOSE_UNKNOWN` 断言覆盖 cleaning、idle、scanning、失败四种输入；持续查询失败时停止恰好一次、等待至少五秒且不到十秒；限时退出遇到未知也停止一次，并且将一秒的轮询间隔裁到 40 ms 总时限。另核对关窗保护实际使用三态和原公开等待函数。

### 3. 测试补强

- `ScriptedClean` 在收到 `clean_stop` 以前不减少剩余计数。新增直接轮询两次仍保持计数的断言；原 `HOST_CLOSE_DURING_CLEAN` 的返回值、停止次数、到达空闲和空闲不停止断言保留。
- 后端若在停止前被错误地持续轮询，会在第九次查询以 `HOST_CLOSE_DURING_CLEAN must send stop before waiting for idle` 失败。这是对错误调用顺序的有界断言，不依靠测试超时。
- `HOST_DATA_JUNCTION` 夹具同时创建经 `\\?\` 表达的 `weird-name.` 与普通 `weird-name`。先显式断言两次规范化均成功、结果不同，再调用生产目录准备函数并断言返回错误，且普通目录下没有 `Water`。
- 获准修改的旧断言只有上述夹具的“未创建普通目录”：原 `!root.join("weird-name").exists()` 改为 `!ordinary.join("Water").exists()`，因为普通目录现在由测试主动创建。旧的拒绝错误、原带点目录仍在等断言保留；`data.rs` 无改动。
- 测试仍为原来的精确五个：`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。无新增测试入口，无 ignore、过滤或改名。
- README 同步说明清理已开启、槽持有与释放、三态等待和退出时限、两次目录规范化、本票检查命令及夹具闭环。

依赖、锁文件、Tauri 配置、权限、图标、命令列表、导航/CSP、私有 WebView 规则均未修改。未新增 unsafe、进程启动、网络或环境读取。没有使用 `.setup()`。

## 检查命令与结果

下表每行的完整命令均为：`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W6-I2` 加该行参数，执行目录均为本工作树根。时间与回执文件名前缀使用 UTC。表中“退出码”是检查器退出码；有效负控内部 Cargo 为 101。

| 参数 | 退出码与结果 | 回执文件（证据 receipts 目录） |
|---|---|---|
| `--mode baseline` | 0，通过，干净指定基线 | `2026-10-28T09-45-57.744Z-29164-baseline-result.json` |
| `--mode lock` | 0，离线依赖与原锁核对通过，无锁变化 | `2026-10-28T09-47-04.117Z-33048-lock-result.json` |
| `--mode test`，先加回归断言、未改生产代码 | 1，预期红；Cargo 101，4 过 1 败，`HOST_CLOSE_UNKNOWN unknown state still requests stop`；首次构建 7 分 39 秒 | `2026-10-28T09-48-10.525Z-30800-test-result.json` |
| `--mode test`，修复后 | 0，5/5 | `2026-10-28T09-56-43.366Z-28632-test-result.json` |
| `--mode check` | 0，源码/依赖政策、fmt、Clippy `-D warnings` 通过 | `2026-10-28T09-57-42.779Z-40808-check-result.json` |
| `--mode red-nc1` | 0，有效目标失败；Cargo 101，4 过 1 败 | `2026-10-28T10-00-42.386Z-38280-red-nc1-result.json` |
| `--mode test`，nc1 恢复后 | 0，5/5 | `2026-10-28T10-01-05.962Z-22960-test-result.json` |
| `--mode red-nc2` | 0，有效目标失败；Cargo 101，4 过 1 败 | `2026-10-28T10-01-27.947Z-32956-red-nc2-result.json` |
| `--mode test`，nc2 恢复后 | 0，5/5 | `2026-10-28T10-01-44.270Z-2960-test-result.json` |
| `--mode red-nc3` | 0，有效目标失败；Cargo 101，4 过 1 败 | `2026-10-28T10-02-09.410Z-35624-red-nc3-result.json` |
| `--mode test`，nc3 恢复后 | 0，5/5 | `2026-10-28T10-02-32.642Z-14500-test-result.json` |
| `--mode check --final` | 0，通过，4.739 秒 | `2026-10-28T10-02-59.684Z-26932-check-result.json` |
| `--mode test --final` | 0，5/5，零忽略/过滤；proofAudit 核对三组红绿记录通过；测试运行 5.37 秒，整门 8.320 秒 | `2026-10-28T10-03-12.106Z-39540-test-result.json` |
| `--mode native --final` | 0，通过，单次窗口预算已使用 | `2026-10-28T10-03-27.915Z-42876-native-result.json` |
| `--mode archive` | 0，原字节归档 279 个文件，24,404,499 字节，另有 ARCHIVE 索引及归档器生成的 `.gitattributes` | 本地 `2026-10-28T10-03-57.927Z-31812-archive-result.json`；归档清单见下 |

检查器复制离线缓存，Cargo 全程 1.95.0、offline、locked、单 job，测试 `--test-threads=1`；没有下载或手工复制依赖。另运行指定工具链的 `rustfmt --edition 2024 apps/water/host/src/lib.rs apps/water/host/tests/host_v1.rs` 格式化，以及 Git diff/范围/状态/哈希只读核对。

归档中的 `09-31-32.132Z-15084-baseline` 是开工前已有的总控派前记录，不计作本执行者运行。最早一次 `test` 的失败是先加回归断言的取证，未作为三条有效负控之一。

## 三条负控与原字节恢复

三条都只临时改 `apps/water/host/src/lib.rs` 的一个位置，不改测试、不加测试开关；每条被检查器认定有效后，立即执行 `git checkout -- apps/water/host/src/lib.rs`，核对 SHA-256，再运行上表对应的完整五测。

| 负控 | 真正执行的变异 | 实际失败信息 |
|---|---|---|
| nc1 | `stop_cleaning_within` 发送停止后直接返回 `Stopped`，跳过等待 | `HOST_EXIT_DURING_CLEAN waits until idle`，剩余 3，预期 0 |
| nc2 | `clean_state` 的 `Err(_)` 分支从 `Unknown` 改为 `NotCleaning` | `HOST_CLOSE_UNKNOWN unknown state still requests stop` |
| nc3 | 共用等待函数在发送 `clean_stop` 前先循环等到 `NotCleaning` | `HOST_CLOSE_DURING_CLEAN must send stop before waiting for idle` |

三次恢复后的 `src/lib.rs` SHA-256 均为：

`ad89ab11e5af67c87889c78befe58fb63fc47b3457b45780fa57a42e79c0412c`

最终测试文件 SHA-256：`a0f456a4da55e6794a663550c4e3eeab555107c70e5b855525ed14246a3373cb`。

三次恢复绿与 final 的检查器 productionHash 均为 `2b80692755f49712575d71ae43471c29fcb14fcc4bb6ee2d0465a2b016a4bbac`，testHash 均为 `b1aea8035c4ac7de8687e2631fef7b227479e240ea4a276064eb59fecd5ec848`。三条红的 productionHash 都不同，testHash 不变；源快照和日志均在归档中。

## 原生检查与截图

只有一次 `native --final`，没有手动启动应用、选择框或额外窗口。观察器记录 Water 主窗口 1，固定 Tao 事件目标 1（rawWindows 为 2），选择框 0，恢复窗口 0；Mica backdropType 为 2。

检查器在 `.local/w6-i2-native/2026-10-28T10-03-27.915Z-42876-fixture` 创建六个合成文件并设为 72 小时前，预置七类开关全部关闭、只添加这个夹具。受保护位置按现有规则只读统计，不可勾选；没有真实用户文件进入清理计划。

| 步骤 | 观察器动作与结果 | 耗时 |
|---|---|---|
| 1 | 等首页，“开始一次体检”出现且无服务连接错误，截图 home | 1211 ms |
| 2 | Invoke“开始体检” | 52 ms |
| 3 | 等“本次体检共识别”，截图 results | 5605 ms |
| 4 | Invoke“清理所选” | 29 ms |
| 5 | 等永久删除警示，截图 confirm | 1105 ms |
| 6 | Invoke“永久删除 3 MB” | 31 ms |
| 7 | 等“清理完成”，截图 done | 1419 ms |
| 8 | Invoke“查看清理记录” | 25 ms |
| 9 | 等记录页副标题，截图 history | 857 ms |

应用运行墙钟 `nativeWallMs = 12596`（12.596 秒）；整个 native 检查 16.796 秒。应用正常退出码 0，私有 WebView 目录已观察到，`childClose.remaining = []`，没有遗留的本票 WebView 子进程。

检查器核对缓存目录已删，源码文件与两份浏览器配置样本保留；`scans`、`snapshots`、`plans`、`cleans`、`journal` 各 1 份，顶层只有规定的八种条目。清理报告 `completed`，唯一条目 `deleted`，释放精确 `3,145,815` 字节，失败 0；日志事件为 `intent`、`result`。

已逐张查看以下五张原始截图，均为 1568×1072：

- [home](../../acceptance/wave6/i2/receipts/2026-10-28T10-03-27.915Z-42876-home.png)：白色磨砂首页，系统盘空间和“开始体检”入口可见，没有连接错误。
- [results](../../acceptance/wave6/i2/receipts/2026-10-28T10-03-27.915Z-42876-results.png)：推荐 3 MB，已选 1 组；真实受保护的会话记录显示锁标记，不能勾选。
- [confirm](../../acceptance/wave6/i2/receipts/2026-10-28T10-03-27.915Z-42876-confirm.png)：只清理 1 组 1 项“带缓存标记的目录”，3 MB，明确“不进入回收站，无法恢复”。
- [done](../../acceptance/wave6/i2/receipts/2026-10-28T10-03-27.915Z-42876-done.png)：“3 MB 已释放”，预计与实际均 3 MB，缓存标记目录显示已清理。
- [history](../../acceptance/wave6/i2/receipts/2026-10-28T10-03-27.915Z-42876-history.png)：一条清理完成、一条体检记录，释放 3 MB，跳过 0 项。

归档索引：[ARCHIVE.json](../../acceptance/wave6/i2/ARCHIVE.json)。final 证据：[check](../../acceptance/wave6/i2/receipts/2026-10-28T10-02-59.684Z-26932-check-result.json)、[test](../../acceptance/wave6/i2/receipts/2026-10-28T10-03-12.106Z-39540-test-result.json)、[native](../../acceptance/wave6/i2/receipts/2026-10-28T10-03-27.915Z-42876-native-result.json)。归档日志和源码快照按检查器原字节保留，包含最早的预期红记录，没有删除失败历史。

归档与回执先提交为 `556aec55ad829bd319566a1a8786f48b3f84643d`。随后只读状态核对发现归档器另生成的 `.gitattributes` 未入库，故以新增文档提交补上该文件及本说明；没有改写提交、改变产品或测试字节，也没有重跑 final。该属性文件让证据保持原字节，避免换行转换。

## 未验证与保留边界

- 未实际执行系统关机、注销或重启管理器事件；退出分支由源码接线断言与公开函数脚本后端验证。
- 未在真实窗口清理进行中请求关闭；本票唯一窗口走的是契约指定的完整夹具闭环，关窗保护由脚本后端与源码接线断言覆盖。
- 未测试 macOS、默认真实数据目录、真实选择框、第二实例、故障注入窗口或 release 打包，没有删真实用户数据。
- 十秒和五秒约束针对返回可用的同步后端调用之间的轮询等待；不能抢占一个自身永久阻塞的 `Backend::call`。
- 原生预算 1/1 已用，选择框 0/0；未重跑任何 final。交回后不继续测试或启动后台任务。完成是执行者提交状态，最终验收与合入仍由总控负责。
