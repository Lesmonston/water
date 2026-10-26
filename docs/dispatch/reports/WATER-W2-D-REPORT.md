WATER-W2-D 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-d/docs/dispatch/reports/WATER-W2-D-REPORT.md

2026-10-26；交回状态 SUBMITTED，等待总控独立复核，未自行标记 VERIFIED。

实际执行者：Codex，GPT-6（会话提供的模型身份；未提供更细的后台变体标识）。没有使用子代理或外部实现服务。

工作树 `F:/new/smaltalk/water/.worktrees/w2-d`；分支 `worker/water-w2-d`。
首次基线 `7ca15282e477ed4b5120ffe3c1edc3a60b75c144`，实际 baseline 证明首次树干净且产品目录不存在。
实现提交 **`adce53ecc4765d5aef8f7ae4ba120f086ca9c336`**，两次 final 均在此干净提交执行。
后续提交仅含本回执与检查器归档的证据，不含产品变化。没有修改主检出、契约、检查脚本、台账或其它包。

实现位于 `packages/junk-clean/`，9 个文件：Cargo.toml、Cargo.lock、README.md、src/lib.rs、src/model.rs、src/path.rs、src/time.rs、src/native_windows.rs、tests/clean_v1.rs。

| 冻结要求 | 实现与实测对照 |
|---|---|
| 独立 crate / 依赖 / API | 独立 workspace，edition 2024、Rust 1.95、publish=false、四项 auto=false。仅精确 serde 1.0.229（derive）与 serde_json 1.0.151；已通过依赖盘点、fmt、clippy -D warnings。全部指定公开入口、StopFlag 的 Clone/Send/Sync 共享停止状态、ItemGuard 与观察者已实现。 |
| FFI 边界 | lib.rs deny unsafe，其余普通模块 forbid；FFI/文件系统操作集中于 native_windows.rs。只使用 CreateFileW、GetFileInformationByHandleEx(FileIdInfo)、GetVolumeInformationByHandleW、GetDiskFreeSpaceExW、CloseHandle；句柄仅属性访问、全共享、OPEN_REPARSE_POINT。删除仅标准库 remove_file/remove_dir；只读重试仅清除只读属性。 |
| 计划整份拒绝 | 未知键（含嵌套 identity）、重复字段/ID、缺字段、非法 level/kind/identity/字节字符串、非法时间与版本、非合法绝对路径、等于根/越出根、hard_guard 祖先/相等、protected_path 三种重叠均拒绝。按完整段、ASCII 大小写不敏感比较；盘根是 MODEL 示例所需的末尾分隔符例外。 |
| 执行复核 | root 到 item 各级及 root 的祖先均检查元数据，不跟随重解析点；消失、同名重建、类型改变、新近修改、在用、保护重叠分别跳过。复核在 guard 回调与 intent flush 后重复。测试证明相应合成文件保留、释放量为 0。 |
| 保护后加 | from_json 本来就拒绝保护重叠。为覆盖执行阶段保护检查，测试对已解析的公开 Rust 计划添加 protected_paths，execute 返回 protected_overlap；没有放宽 JSON 接口。对直接修改 root/hard_guards 的 Rust 调用方也复核边界。 |
| 不跟随删除 | 迭代后序删除；内层目录联接只删链接，目标目录及文件保持。root 自身或中间级为联接时 outside_root，条目自身为联接时 reparse。负控确实触发了合成“外部”目标文件丢失断言。 |
| 失败、只读、停止 | 独占文件保留，其余文件（包括只读文件）删除，该项 partial、failed_entries≥1；单个全锁定文件 failed/0 字节。观察者停止后其余项 cancelled；intent flush 中停止则未删任何内容；512 文件夹具内在首次实际删除后停止，验证 partial 与实际残余相符。 |
| 日志 | 每项含 intent/result JSONL（跳过项也有配对）。write_all 与 flush 成功才删除；测试 writer 将 intent sync_all 落盘并在删除前读回，观察者在回调完成前再读实际日志核对顺序。intent 写/flush 失败立即终止且文件未删；result flush 失败时首项已经删除、后续项未执行、无观察者回调。 |
| 报告 / 卷 | 字节字段均为十进制字符串，计数为整数，时间为 UTC 秒级 Z。释放量逐项合计等于实际逻辑长度减少（指定报告样本 15 字节），卷含夹具所在盘根及前后可用空间；完整 JSON 键集合严格断言。空目录、空计划均覆盖。 |

检查均从上述工作树根运行，统一前缀为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-D
```

下表参数接在此前缀之后即为实际命令。证据文件名的时间为 UTC；完整 argv、退出码、源码快照与 SHA-256 均在各 receipt/log 中。

| 实际参数 | 时间 / 结果 |
|---|---|
| `--mode baseline` | 05:03:41，exit 0；仅基线检查，非产品验收。 |
| `--mode lock` | 05:06:14，exit 0，首次离线生成锁并核依赖；之后未改依赖。 |
| `--mode check` | 05:11:00，exit 1，clippy 拒绝 set_readonly(false)。按冻结要求保留只读清除，对 Windows 专用位置增加精确 lint 注释/allow，没有改全局警告策略。 |
| `--mode check` | 05:11:51，exit 0。 |
| `--mode test` | 05:12:14，exit 1，五测均失败：测试夹具混用正斜杠，合法路径校验和 mklink 拒绝。 |
| `--mode test` | 05:13:13，exit 1，仅归一化 Cargo 清单路径仍未解决测试相对路径的分隔符；五测仍失败。 |
| `--mode test` | 05:13:46，exit 0，夹具路径统一反斜杠后五测全绿。产品路径约束未放宽。 |
| `--mode check` | 05:14:54，exit 0，最终实现字节。 |
| `--mode test` | 05:15:04，exit 0，最终实现字节，五测全绿。 |
| `--mode red-nc1` | 05:16:42，检查器 exit 0；Cargo exit 101，4 过/1 失败，命中 CLEAN_IDENTITY。 |
| `--mode test` | 05:16:53，立即 checkout 恢复后 exit 0，五测全绿。 |
| `--mode red-nc2` | 05:17:48，检查器 exit 0；Cargo exit 101，4 过/1 失败，命中 CLEAN_NO_FOLLOW。 |
| `--mode test` | 05:18:10，立即 checkout 恢复后 exit 0，五测全绿。 |
| `--mode red-nc3` | 05:18:46，检查器 exit 0；Cargo exit 101，2 过/3 失败，命中 CLEAN_ROOT_BOUND；同时拒绝性断言也变红。没有编译错误或超时。 |
| `--mode test` | 05:19:17，立即 checkout 恢复后 exit 0，五测全绿。 |
| `--mode check --final` | 05:19:50，exit 0，同干净实现 SHA；依赖、unsafe 策略、fmt、clippy 均通过。 |
| `--mode test --final` | 05:19:58，exit 0，同干净实现 SHA；五测通过，0 ignored/measured/filtered；测试执行 1.59 秒；三条 proofAudit 通过。 |
| `--mode archive` | 05:20:34，exit 0；原字节归档 243 文件 / 2,094,605 字节（索引和 .gitattributes 另计）。 |

格式化仅使用固定 1.95.0 rustfmt，设置 RUSTUP_AUTO_INSTALL=0。未运行其它 Cargo 测试目标、全仓测试或任何真实模式。
早期失败完整保留，不计入负控证明。归档还包含总控原有 04:31:10 baseline 及日志，该记录不是本执行者新跑的。

三条负控都只改一个实际调用的生产位置，未改测试或增加测试开关，完成后立即 `git -c core.hooksPath=NUL -c core.fsmonitor=false checkout -- <该文件>` 恢复，再运行完整五测。

| 负控 | 坏态修改（实现提交行号） | 命中的失败信息 | 恢复证明 |
|---|---|---|---|
| nc1 | src/lib.rs:82，`if actual != item.identity` 临时改为 `if false && actual != item.identity` | `CLEAN_IDENTITY: replacement was accepted` | lib.rs 恢复 SHA-256 为 `1bf10a15a26362d6ab1a8449c51a3767ff9e92a72268625377dbe08539e242d7`；05:16:53 五测通过。 |
| nc2 | src/native_windows.rs:306，链接分支条件临时加 `false &&`，使目录属性分支实际枚举联接目标 | `CLEAN_NO_FOLLOW: junction target was traversed` | native_windows.rs 恢复 SHA-256 为 `10ac4c64b3a24354989555932badde9832740c57d54165f7c2f2e8ad80f06a57`；05:18:10 五测通过。 |
| nc3 | src/native_windows.rs:173，`check_chain_impl(item)` 临时替换为 `Ok(())` | `CLEAN_ROOT_BOUND: intermediate junction allowed` | 同一 native_windows.rs SHA-256 原字节恢复；05:19:17 五测通过。 |

最终聚合 productionHash：`42c0fad9ddf160f0e7f6d01187410e0a54a740f6476e528a437669221a17a39f`。
最终聚合 testHash：`f7be1a6f409318172894c276aee6af38d7debfb3c2b75a9456422ccab1c61539`。
测试文件 SHA-256：`706ed9ff495b18e154ea306946cce0ab0bb65d37e1a016f5d0260f7992617420`。
三条负控、恢复绿、final 的测试聚合哈希相同；final 自动核验各负控与紧接的恢复绿源码快照。

关键证据：

- [归档索引](../../acceptance/wave2/d/ARCHIVE.json)
- [final check](../../acceptance/wave2/d/receipts/2026-10-26T05-19-50.284Z-26268-check-result.json)
- [final test 与 proofAudit](../../acceptance/wave2/d/receipts/2026-10-26T05-19-58.564Z-23820-test-result.json)
- [final 五测原始日志](../../acceptance/wave2/d/receipts/2026-10-26T05-19-58.564Z-23820-test-5.log)
- [nc1](../../acceptance/wave2/d/receipts/2026-10-26T05-16-42.064Z-41232-red-nc1-result.json)、[nc2](../../acceptance/wave2/d/receipts/2026-10-26T05-17-48.141Z-31508-red-nc2-result.json)、[nc3](../../acceptance/wave2/d/receipts/2026-10-26T05-18-46.463Z-30636-red-nc3-result.json)

边界与未验证项：

- 无真实冒烟模式；没有扫描、读取内容、改属性或删除任何真实用户文件。所有破坏性测试、同名替换、独占句柄、联接目标和日志均在本树每次新建的 `.local/w2-d-fixtures/fixture-<随机值>/` 内；每个测试结束只回收自己的该目录。没有执行通用递归删除，测试回收检查绝对父目录、随机名前缀和重解析点，不跟随链接。
- 原生窗口 0、目录选择框 0、浏览器 0。只有合成联接创建使用工单允许的 `cmd /D /C mklink /J`；删除从未通过 shell。生产代码没有启动进程、联网或读环境变量。
- 构建采用检查器私有 Cargo home/target/temp、离线、jobs 1；没有下载或修改网络/全局配置。锁定工具链和缓存沿用 baseline。没有 push、merge、rebase、主线集成或修改台账。
- `Write::flush` 的崩溃持久性取决于宿主 writer；接口不能保证任意 Write 的 flush 等于磁盘 sync。测试磁盘 writer 明确 sync_all。result 写失败可能发生在删除之后，调用方须保留此前 intent；不宣称回滚。
- 标准库路径删除存在检查与使用之间的并发窗口。已增加 guard/日志之后和条目删除过程中的复核，但没有提供句柄相对原子删除；恶意并发替换、生产竞态、真实用户同意/GUI 清理接线不在本票验收结论内。
- freed_bytes 为逻辑长度减少，未去重硬链接，不等同于实际分配空间或盘可用量变化；卷前后读数单独记录。残余无法完整重读时保守报 0 释放字节。
- 非 Unicode/不合法 Windows 名称导致该项保守跳过，不转成有损路径删除。macOS 未实现和实测；本票仅 Windows 合成范围。没有修改冻结契约，无越界申请。

提交回执后停止本票测试；所有运行命令均已结束，没有本票启动的后台服务或窗口。
