WATER-W12-P1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w12-p1/docs/dispatch/reports/WATER-W12-P1-REPORT.md

# WATER-W12-P1 执行回执

## 身份与提交

- 实际执行模型：Codex，本会话系统标识 GPT-6；具体后端子版本未暴露。未启动子代理或其它模型 CLI。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w12-p1`；分支：`worker/water-w12-p1`。
- 初始 HEAD：`6fd29e342b76ff2ceecd74e66805300405ef1334`，与 `water-w12-p1-base-20261107` 一致，开工时干净，baseline 通过后实现。
- 实现提交：`149602577d489fe59f3aebcc0c1aa063e186ac76`；实现与测试一起提交，三个 final 均绑定此提交，前后工作树干净。回执与 archive 证据另行新增提交，不夹带产品变更。
- 提交身份仅传给 git 提交子进程：`Codex GPT-6 <codex-gpt-6@localhost>`。未改 git 配置、远端或历史，未 merge、rebase、amend、reset 或 push。

## 工单逐项对照

| 工单要求 | 实现与验证 |
|---|---|
| execute 动过一项后日志失败仍交回报告 | `src/lib.rs` 按实际 Deleted/Partial 状态记录是否已执行；intent/result 写入或 flush 失败后保留真实结果，返回 Ok，Stopped，journal_error 精确为 journal write failed，当前未动和后续项均 JournalFailed；失败后不再调用后续项的 preflight、日志或删除。 |
| freed_bytes 与 volumes 真实 | 只累计真实 bytes_freed；日志中断时 volumes 只保留发生 Deleted/Partial 的卷，仍测 free_before/free_after，不把估算计入释放。测试核对实际文件、字节、卷与剩余文件身份。 |
| quarantine 同规则 | `src/quarantine.rs` 记录是否实际 Moved；`src/native_windows.rs` 的内部 move_to_quarantine 把真实 MoveReport 与末行日志失败标志一起交回；intent 失败仍先阻止移动。错误后不再移动后续项，moved_bytes 只算已 Moved 的结果，保留 destination 与 identity。 |
| 第一次 intent 失败 | execute 的旧写入/flush 故障断言保持 Err(Journal) 语义；quarantine 对写入/flush 失败分别断言 Err、所有源字节及身份不变、新建骨架清除。另测已记录 skip 或失败移动不算“已经动过”。 |
| 真实冒烟使用绝对 PowerShell 路径 | `examples/real_smoke.rs` 从 SystemRoot 构造 System32/WindowsPowerShell/v1.0/powershell.exe，变量缺失回退 C:\Windows；CREATE_NO_WINDOW 保持；真实 final 通过。 |
| 不改其它入口与类型 | purge、restore、inspect、list_quarantines 的实现不变；model.rs、quarantine_model.rs、Cargo.toml、Cargo.lock 与初始基线逐字节相同。所有公开函数签名、类型名字与序列化不变，无新增系统函数。 |
| 11 个测试不变 | 新断言只加入 clean_plan_contract、clean_partial_stop_journal、quarantine_move_contract；共享故障 writer 只在指定测试文件。完整目标仍是原 11 个，0 ignored/filtered。 |
| 三条负控、三个 final、归档 | 均已完成，见下面逐次命令与恢复链；archive 的 281 个文件、5307218 字节均重新计算 SHA-256 与字节数核对通过。 |

故障矩阵通过两个公开入口调用生产逻辑：对写入与 flush 两种失败，覆盖第一项 result、第二项 intent/result、第三项 intent/result，以及单项计划的最后一行；核对每个结果的顺序、状态、原因、真实保留的源文件内容与身份、总字节、回调计数。隔离已移动项还核对目的地布局、内容及身份。额外覆盖零字节目录、零释放量的部分删除（外部硬链接保留）、零字节移动后的 result/下一 intent 失败。报告 journal_error 为 None 时，两个报告 JSON 都确认没有这个键；带错误的隔离报告进行严格 roundtrip。

## 每次检查命令与结果

所有命令都在指定工作树根运行。下表参数均接在这条实际前缀后：

`node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W12-P1`

“退出码”是检查器 / 内层 cargo test；红态负控按预期 cargo 101、检查器 0。check 包括 fmt --check、离线 locked clippy --all-targets -D warnings；lock 核对离线依赖，未改锁文件。

| 参数 | 退出码（检查器 / cargo test） | 结果 | 原始回执 |
|---|---|---|---|
| `--mode baseline`（开工前预存） | 0 / — | passed（非本会话运行） | [2026-11-07T12-04-45.392Z-22912-baseline-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-04-45.392Z-22912-baseline-result.json) |
| `--mode baseline` | 0 / — | passed | [2026-11-07T12-11-39.397Z-33720-baseline-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-11-39.397Z-33720-baseline-result.json) |
| `--mode lock` | 0 / — | passed | [2026-11-07T12-14-17.661Z-30936-lock-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-14-17.661Z-30936-lock-result.json) |
| `--mode test` | 1 / 101 | failed | [2026-11-07T12-14-21.109Z-33828-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-14-21.109Z-33828-test-result.json) |
| `--mode check` | 0 / — | passed | [2026-11-07T12-22-07.396Z-29580-check-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-22-07.396Z-29580-check-result.json) |
| `--mode test` | 1 / 101 | failed | [2026-11-07T12-23-39.466Z-5876-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-23-39.466Z-5876-test-result.json) |
| `--mode test` | 0 / 0 | passed | [2026-11-07T12-27-36.059Z-31956-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-27-36.059Z-31956-test-result.json) |
| `--mode real` | 0 / — | passed | [2026-11-07T12-30-07.590Z-32196-real-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-30-07.590Z-32196-real-result.json) |
| `--mode red-nc1` | 0 / 101 | passed | [2026-11-07T12-31-07.283Z-28864-red-nc1-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-31-07.283Z-28864-red-nc1-result.json) |
| `--mode test` | 0 / 0 | passed | [2026-11-07T12-31-52.771Z-26644-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-31-52.771Z-26644-test-result.json) |
| `--mode red-nc2` | 0 / 101 | passed | [2026-11-07T12-33-23.249Z-38208-red-nc2-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-33-23.249Z-38208-red-nc2-result.json) |
| `--mode test` | 0 / 0 | passed | [2026-11-07T12-34-46.021Z-32176-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-34-46.021Z-32176-test-result.json) |
| `--mode red-nc3` | 0 / 101 | passed | [2026-11-07T12-37-14.564Z-29016-red-nc3-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-37-14.564Z-29016-red-nc3-result.json) |
| `--mode test` | 0 / 0 | passed | [2026-11-07T12-37-56.523Z-22808-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-37-56.523Z-22808-test-result.json) |
| `--mode check --final` | 0 / — | passed | [2026-11-07T12-39-15.539Z-37372-check-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-39-15.539Z-37372-check-result.json) |
| `--mode test --final` | 0 / 0 | passed | [2026-11-07T12-39-23.996Z-15828-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-39-23.996Z-15828-test-result.json) |
| `--mode real --final` | 0 / — | passed | [2026-11-07T12-40-23.336Z-35408-real-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-40-23.336Z-35408-real-result.json) |
| `--mode archive` | 0 / — | passed | [ARCHIVE.json](../../acceptance/wave12/p1/ARCHIVE.json) |

第一次 test 是修复前的目标红态：9 通过、2 失败，execute 与 quarantine 都以 CLEAN_W12_JOURNAL 证明报告丢失。第二次 test 为 10 通过、1 失败：新增“已有 skip 未动作”用例的 root 局部变量遮蔽了同一函数中后面的旧夹具根，导致旧用例的 InvalidPlan；仅将新增变量改名 untouched_root，未改生产代码或降低断言。之后完整测试、每次负控恢复测试及 final 全部通过。无计时断言失败，计时重跑 0 次；所有失败日志保留。

本会话首跑 baseline 是 12:11:39 UTC 的记录；12:04:45 的 baseline 为开工前工作树中已有记录，来源未核定，检查器 archive 一并保留，不计为本会话执行。

## 负控与逐字节恢复

- nc1：只改 `src/lib.rs` 的 result 日志失败分支，使已有删除后再次返回 Err；CLEAN_W12_JOURNAL 检出报告丢失。
- nc2：只改 `src/quarantine.rs` 的“已有 journal_error 则跳过”分支，使日志失败后继续移动；CLEAN_W12_JOURNAL 检出实际 moved_bytes 为 9 而非 3，说明后面两项确实被错误移动。
- nc3：只改 `src/lib.rs` 的 intent 错误分支，使第一条 intent 失败仍进入删除；CLEAN_W12_JOURNAL_FIRST 检出。三条都只改一个生产调用处，未改测试、未加开关、未用编译错误或超时充数。
- 每条 red 后立即 `git -c core.hooksPath=NUL -c core.fsmonitor=false checkout -- <该文件>`，核 SHA-256，然后立即执行 --mode test（11/11 通过）；每条绿结束才做下一条。final test 的 proofAudit 再核三条 red/green 的精确 productionHash、testHash 和源快照。

| 负控 | 预期失败证据 | 紧接的恢复全绿证据 |
|---|---|---|
| nc1 | [2026-11-07T12-31-07.283Z-28864-red-nc1-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-31-07.283Z-28864-red-nc1-result.json) | [2026-11-07T12-31-52.771Z-26644-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-31-52.771Z-26644-test-result.json) |
| nc2 | [2026-11-07T12-33-23.249Z-38208-red-nc2-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-33-23.249Z-38208-red-nc2-result.json) | [2026-11-07T12-34-46.021Z-32176-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-34-46.021Z-32176-test-result.json) |
| nc3 | [2026-11-07T12-37-14.564Z-29016-red-nc3-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-37-14.564Z-29016-red-nc3-result.json) | [2026-11-07T12-37-56.523Z-22808-test-result.json](../../acceptance/wave12/p1/receipts/2026-11-07T12-37-56.523Z-22808-test-result.json) |

恢复字节：lib.rs SHA-256 `7cb247cb7ea32a51d7874b3e010ca90451658f0beeedf2f4a1bf6fd2b8b68e88`；quarantine.rs SHA-256 `61ad362f1e3fd7c2bf21f8ef9a8d67600a1cc8a1c5c578bf3f6f1aa7d3a49426`。

## 旧断言迁移与实现选择

1. 原 ResultFailure 用例的 unwrap_err/Journal → expect Ok(report)，精确核对 Stopped、journal_error 文本、第一项 Deleted/15 字节、第二项 JournalFailed、总计 15；“第一项已删且下一项仍在”保留。原因：本单明确改为不能丢失已完成删除的报告。
2. 同一用例原“observer 为空” → 精确两次进度 [(1,2,15,result-failure),(2,2,15,unreached)]。原因：现在返回全部项的报告，并保持每个已报告项一次 on_item；未弱化为只判断存在。
3. 第一条 intent 写不进的原 Err(Journal)、observer 为空、源内容不变的值与语义保持；只增加 CLEAN_W12_JOURNAL_FIRST 消息与带标记的 expect_err。其它旧 Err(Journal) 断言原样。
4. 选择单独布尔状态记录“实际已动作”，没有按 freed/moved > 0 判断；后者会丢失空目录、空文件或硬链接移除的结果。没有新增公开接口；只改变私有 pub(crate) 移动辅助函数的返回值，把结果与日志状态一起交回。没有给日志补新结尾行；现有最后一项结果行故障已覆盖。
5. 日志失败后的后续项保守地直接生成 JournalFailed，不重新尝试写日志、preflight 或操作；没有选择“writer 恢复后继续”。无范围扩大或权限申请。
6. 文本工具兼容：读取中文文件显式用 UTF-8；回执通过本树脚本直接用 Node UTF-8 写入并完整读回。一条 PowerShell→Node stdin 的独立首行校验把校验器内的中文常量转成了问号，报告文件本身保持正确；将该校验常量改用 ASCII Unicode 转义后重新核验，未转码报告。

## 真实冒烟与边界

最终 real：固定盘 4 个，共检查两个固定隔离根名字 8 次；.flick-quarantine：absent 4、present 0、unavailable 0、编号目录 0；.water-quarantine：absent 4、present 0、unavailable 0、编号目录 0。只读根状态与编号目录数量，原始输出无真实路径、用户或文件名；不移入、不复原、不删除真实文件。

所有破坏性测试只用本树 .local 下随机新建的合成所有者目录；沿用已有夹具的父目录/前缀/身份边界核对后，只清除本次新建的所有者目录。cargo 离线、jobs=1、tests=1，私有 CARGO_HOME、target 与 TEMP 由检查器配置。原生窗口 0、选择框 0、浏览器 0；没有常驻服务或自有后台任务。交回前核对本树 target 内测试/示例进程为 0。

未验证：macOS；真实用户数据删除/移入/复原；跨两个真实卷发生动作后的日志故障（本树夹具限定一个卷）；服务 P2 接线与桌面交互；SystemRoot 缺失分支未在真实冒烟中修改机器环境验证。以上不冒充完成。没有改主线台账；本回执仅供总控收单，不自行标记验收通过。
