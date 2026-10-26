WATER-W3-F1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f1/docs/dispatch/reports/WATER-W3-F1-REPORT.md

2026-10-26。本回执交回 SUBMITTED，是否 VERIFIED 由总控独立复核决定；未修改主线台账。

## 交付身份与范围

- 实际执行引擎/模型：Codex，系统提供的模型标识为 GPT-6。没有启动子代理、并行实现者或外部模型。
- 工作树：`F:/new/smaltalk/water/.worktrees/w3-f1`；分支：`worker/water-w3-f1`。
- 首次 HEAD：`197dfdaecc94dc8b84e94aa8d91ee5cb1c0d965e`，首次检查为干净，`packages/water-service` 不存在。
- 最终实现提交：`cebc11f92e5419eccc3d66d7a63f8b31032b5d08`。三个 final 都在此干净提交上通过，之后仅交付本回执与归档证据。
- 实现提交序列：`230ba798`（服务实现）、`fa9fef4a`（负控重放任务完成后再回收夹具）、`dcc8d803`（有扫描结果时测试关闭清理）、`cebc11f9`（分类开关与缓存视图的可选性保持一致）。
- 产品范围只有新建的 `packages/water-service/` 共 12 个文件。A–D 四个已验收 crate、UI、宿主、契约、检查器均未修改。无 push、merge、rebase 或网络下载。

依赖与 crate 形状按 SERVICE §1：Rust 1.95 / edition 2024、独立 workspace、四个 auto 发现关闭、publish=false，只有指定版本 serde/serde_json 与四个路径依赖。仅 `src/native_windows.rs` 使用四个允许的系统函数；生产代码没有进程启动、联网、环境变量读取或递归删除。

## SERVICE §2～10 对照

| 节 | 实现与验证 |
|---|---|
| §2 公开 API | 实现 ServiceConfig、IpcError、Service::new/call、Platform、DriveInfo、FolderPicker、WindowsPlatform；Service 的 Send+Sync 在集成测试静态断言。17 个命令接通，精确校验参数键集合、类型、ID、确认令牌和七个可切换分类。扫描/清理使用后台线程。合成测试的成功 call 统一断言 50 ms 返回预算，用户选择框例外在本票用测试 picker。 |
| §3 错误 | 返回只有 code/message_zh 的对象；固定六类错误、关闭清理提示和拒绝自定义位置的提示均由服务生成。完成后的扫描不再接受取消；不存在/非当前任务返回 not_found。 |
| §4 存储 | settings、扫描记录、快照、计划、清理记录及日志只写 data_dir。JSON 使用同目录 create_new 临时文件、sync_all、rename；用 Windows 共享锁阻止 rename 的测试验证旧文件字节不变，临时文件留在同目录。损坏 JSON、无效扫描在用规格等被跳过。扫描及对应快照、清理 JSON 各保留 60；清除仅针对受控目录下符合生成 ID 格式的普通 JSON 文件。JSONL 日志不递归清理。同秒记录用文件写入时间打破排序平局，测试重启后恢复正确 last_scan。令牌只持久化 SHA-256 摘要。 |
| §5 扫描 | A embedded/resolve_plan → JSON → B ScanPlan/scan，使用 B 默认预算。关闭分类时保留 protected targets。每次扫描开始一次 begin_in_use_batch；按 B 当前实现的每 target 回调统计分类状态与百分比，按规定分类顺序及自定义根分行，结束时聚合最终体量。支持取消、完成/部分完成/失败记录、B 快照与增长；取消不替代 last_scan。新扫描消耗旧扫描的清理授权并使旧计划 stale，重启后仍不能执行旧计划。 |
| §6 视图 | 返回键集合与 IPC/回放数据逐层匹配。实现分类/分组排序、六类 totals、按盘推荐体量、七天增量、中文摘要、占用提示、三条以内 insights、明细上限 200 和原因文案。体量按设计稿处理 GB/MB、千分位、增量及小于 1 MB。分类开关变化后，缓存结果与详情的 selectable/default_selected 与后端清理检查保持一致。自定义根逐级拒绝重解析目录、盘根、包含已知目录或位于 Windows 内的位置，最多 16 个；重复添加返回已有项。 |
| §7 趋势/记录/位置 | 实现最近 30 天磁盘点、最新增长前 10、历史泄漏前 5 与 active、扫描/清理混排历史前 100。位置立即保存，任务期间返回 busy。测试两次扫描新增 25 个近期目录和另一组旧目录，得到 leak 与 growth；覆盖分类关闭后保护规则仍在、自定义根添加/重复/拒绝/取消/移除、最近扫描占用回填。 |
| §8 清理 | 开关关闭时 prepare/start 均只返回固定 unavailable 文案。开关打开时只使用最近有效扫描里的可选组和具备身份的 eligible 条目，选取包含条目的最长 target 根，传入完整 protected_paths 与 hard_guards，经 D CleanPlan::from_json 验证。一次性令牌与扫描清理授权在任务锁内一起消耗，先落盘再执行。D execute 前重新取得一批进程快照，ItemGuard 用组规格判断占用，日志每次 flush 调用 sync_all。观察者更新进度，clean_stop 设置停止标记；结果按 D 报告生成状态、实际释放量、盘前后空间和中文跳过原因。 |
| §9 五个测试 | 仅 `tests/service_v1.rs`，精确 service_ipc_contract、service_scan_views、service_clean_flow、service_trends_locations、service_storage_safety；无 ignore、过滤或额外单元测试。每次在本树 `.local/w3-f1-fixtures/service-随机名` 创建自己的目录，合成 KnownFolders/时间/磁盘/占用/picker。测试结束验证父目录及前缀后只删除该次目录。三条负控未修改测试；没有读真实用户目录或启动测试子进程。 |
| §10 真实冒烟 | `service_smoke` 从命令行取得检查器新建的 data_dir，使用 WindowsPlatform、clean_enabled=false，依次 app_state → scan_start → 250 ms 轮询 → scan_result → 拒绝 clean_prepare。仅一次真实运行，status=completed，stdout 只有聚合 JSON，无扫描条目路径或进程命令行，无真实删除。 |

清理合成测试完整经过 prepare → start → progress → result；验证只减少计划内文件，保护条目和占用条目保持完整，真实 journal 的每项 intent 在 result 之前，令牌重放 invalid、旧计划 stale，重启后消耗状态保持。还覆盖停止后报告 stopped、释放 0 字节及“因停止未处理”原因。成功清理样本实际减少 190 字节，其余在用缓存保留。

## 检查命令和结果

以下命令均在本工作树根运行，统一前缀为：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F1 --mode <模式>
```

表内模式后带 `--final` 时，完整命令即上面前缀加该单元格内容。原始日志在对应回执的 commands/log 字段中；检查器退出码与内部 Cargo 退出码分开记录。

| 模式（按执行顺序） | 结果 | 回执 |
|---|---|---|
| `baseline` | PASS（退出 0） | [2026-10-26T08-51-49.727Z-26716-baseline-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T08-51-49.727Z-26716-baseline-result.json) |
| `lock` | PASS（退出 0） | [2026-10-26T08-53-51.656Z-41340-lock-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T08-53-51.656Z-41340-lock-result.json) |
| `test` | FAIL（测试退出 101；已修正） | [2026-10-26T09-11-07.058Z-14540-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-11-07.058Z-14540-test-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-12-24.941Z-3128-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-12-24.941Z-3128-test-result.json) |
| `check` | PASS（退出 0） | [2026-10-26T09-13-11.163Z-5816-check-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-13-11.163Z-5816-check-result.json) |
| `test` | FAIL（测试退出 101；已修正） | [2026-10-26T09-20-34.809Z-40308-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-20-34.809Z-40308-test-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-25-06.960Z-37504-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-25-06.960Z-37504-test-result.json) |
| `check` | PASS（退出 0） | [2026-10-26T09-27-59.989Z-42776-check-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-27-59.989Z-42776-check-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-28-15.401Z-43488-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-28-15.401Z-43488-test-result.json) |
| `check` | PASS（退出 0） | [2026-10-26T09-31-47.173Z-40228-check-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-31-47.173Z-40228-check-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-31-59.808Z-10260-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-31-59.808Z-10260-test-result.json) |
| `red-nc1` | PASS（测试退出 101，命中指定标记） | [2026-10-26T09-34-39.035Z-32052-red-nc1-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-34-39.035Z-32052-red-nc1-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-35-06.034Z-32124-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-35-06.034Z-32124-test-result.json) |
| `red-nc2` | PASS（测试退出 101，命中指定标记） | [2026-10-26T09-35-39.427Z-36688-red-nc2-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-35-39.427Z-36688-red-nc2-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-36-36.984Z-22472-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-36-36.984Z-22472-test-result.json) |
| `red-nc1` | PASS（测试退出 101，命中指定标记） | [2026-10-26T09-38-11.204Z-31088-red-nc1-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-38-11.204Z-31088-red-nc1-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-38-50.663Z-28880-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-38-50.663Z-28880-test-result.json) |
| `check` | PASS（退出 0） | [2026-10-26T09-41-33.433Z-41396-check-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-41-33.433Z-41396-check-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-41-49.872Z-39072-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-41-49.872Z-39072-test-result.json) |
| `red-nc1` | PASS（测试退出 101，命中指定标记） | [2026-10-26T09-44-11.400Z-32816-red-nc1-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-44-11.400Z-32816-red-nc1-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-45-08.281Z-10848-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-45-08.281Z-10848-test-result.json) |
| `red-nc2` | PASS（测试退出 101，命中指定标记） | [2026-10-26T09-45-34.851Z-28396-red-nc2-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-45-34.851Z-28396-red-nc2-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-45-54.739Z-42696-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-45-54.739Z-42696-test-result.json) |
| `red-nc3` | PASS（测试退出 101，命中指定标记） | [2026-10-26T09-46-31.174Z-37892-red-nc3-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-46-31.174Z-37892-red-nc3-result.json) |
| `test` | PASS（退出 0） | [2026-10-26T09-47-20.300Z-34244-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-47-20.300Z-34244-test-result.json) |
| `check --final` | PASS（退出 0） | [2026-10-26T09-48-06.646Z-17260-check-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-48-06.646Z-17260-check-result.json) |
| `test --final` | PASS（退出 0） | [2026-10-26T09-48-20.825Z-25184-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-48-20.825Z-25184-test-result.json) |
| `real --final` | PASS（退出 0） | [2026-10-26T09-48-43.331Z-21412-real-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-48-43.331Z-21412-real-result.json) |
| `archive` | PASS（退出 0） | 归档索引及下述逐字节复核 |

归档还包含一份接手前已存在的总控派前 baseline：`2026-10-26T08-31-15.269Z-32544-baseline-result.json`，不计为本执行者运行。

两次开发期失败如实保留：09:11 的 test 为三个 MutexGuard 引用的 E0308 编译错误；09:20 的 test 为新增保留上限夹具漏写两份对应快照，实际 58、断言 60。均已修复，没有降低断言。早期负控也完整保留，但测试与视图完善后重新做了最终三条；最终验收只采用下一节绑定当前字节的记录。

最终测试摘要：`test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 8.48s`。三个 final 的 HEAD 均为上述最终实现提交；源码不变后未重复 final 或真实冒烟。

## 三条有效负控与原字节恢复

每条只修改实际生产路径的一行。比较归档的红/绿源码快照，三次均只有表内那个文件、那一行改变；测试哈希相同。每次红后立即执行 `git -c core.hooksPath=NUL checkout -- <该文件>` 恢复，再完整五测为绿，然后才进入下一条。

| 负控 | 实际修改位置 | 目标失败信息 | 红回执 | 立即恢复后的绿回执 |
|---|---|---|---|---|
| nc1 | `packages/water-service/src/clean.rs:130` | `SERVICE_TOKEN_ONCE` | [2026-10-26T09-44-11.400Z-32816-red-nc1-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-44-11.400Z-32816-red-nc1-result.json) | [2026-10-26T09-45-08.281Z-10848-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-45-08.281Z-10848-test-result.json) |
| nc2 | `packages/water-service/src/service.rs:314` | `SERVICE_CLEAN_DISABLED` | [2026-10-26T09-45-34.851Z-28396-red-nc2-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-45-34.851Z-28396-red-nc2-result.json) | [2026-10-26T09-45-54.739Z-42696-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-45-54.739Z-42696-test-result.json) |
| nc3 | `packages/water-service/src/clean.rs:89` | `SERVICE_PROTECTED_PLAN` | [2026-10-26T09-46-31.174Z-37892-red-nc3-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-46-31.174Z-37892-red-nc3-result.json) | [2026-10-26T09-47-20.300Z-34244-test-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-47-20.300Z-34244-test-result.json) |

- nc1：注释一次调用 `consume_confirmation(&mut stored, &mut s, &r.result.scan_id)`，同时不消耗令牌与扫描授权。第二次 clean_start 实际成功启动了另一项合成清理，测试等待它结束后断言失败，信息为 `SERVICE_TOKEN_ONCE: Ok(Object ... clean_id ...)`。没有把测试退出与夹具回收竞态当作负控。
- nc2：在关闭开关的拒绝条件中排除 `clean_prepare`。已有完成扫描时，关闭状态仍返回了有效预览，断言为 `SERVICE_CLEAN_DISABLED: Ok(Object ...)`。
- nc3：计划序列化时把 `protected_paths` 改成空数组，断言为 `SERVICE_PROTECTED_PLAN: missing protected paths`。
- 三次 Cargo 测试均退出 101，检查器确认目标断言后退出 0；不是编译错误、超时或修改测试产生的红。

| 文件 | 恢复后 SHA-256 |
|---|---|
| packages/water-service/src/clean.rs（nc1/nc3） | `19bcea9f543a6c9799fd3aad3d68da647f02b0f133e5616cabace24af5874daa` |
| packages/water-service/src/service.rs（nc2） | `37b21cdf48b3251d85e8332e4503908195563b956a931ba9ff26a68765e3ab30` |

最终检查器集合哈希：productionHash=`6d1c1abadffdbcaf85888d4389aa50351b8b7a72700a4f323ccf4bea95bc818d`；testHash=`7c35fba4e6f6c6328b200da021c501423da85119862ed6cc4291e8862c18255c`。final test 的 proofAudit 已核对当前测试哈希、红态不同生产字节、立即恢复的相同生产字节以及完整五测通过。

## 真实只读冒烟摘要

[2026-10-26T09-48-43.331Z-21412-real-result.json](../../acceptance/wave3/f1/receipts/2026-10-26T09-48-43.331Z-21412-real-result.json)：completed；duration_ms=65721；drives=4；insights=0；clean_prepare_code=unavailable。默认没有自定义根，未打开选择框。统计为逻辑字节，不是实际回收量，也不是整盘全部文件的盘点。

| 分类 | 组数 | total_bytes |
|---|---:|---:|
| agent_tool | 12 | 21281912467 |
| browser | 14 | 9882302033 |
| system_temp | 2 | 296651070 |
| app_leftover | 6 | 7841482292 |
| dev_cache | 13 | 4584049730 |
| crash_log | 7 | 1062177383 |
| gpu_system | 2 | 655752962 |

| totals 字段 | 字节 |
|---|---:|
| advisory_bytes | 6413723426 |
| confirm_bytes | 8134218960 |
| protected_bytes | 11803964213 |
| recognized_bytes | 45604327937 |
| recommended_bytes | 9629999126 |
| unrecognized_bytes | 0 |

真实扫描只读种子规则位置的名字及元数据，并通过 C 在内存中使用进程快照；不读真实文件内容，命令行未进入任何输出或证据。冒烟数据留在本树检查器分配的 `.local/w3-f1-real/` 之下，没有清除它。

## 归档、边界与未验证项

[ARCHIVE.json](../../acceptance/wave3/f1/ARCHIVE.json) 登记 487 个原始文件、5,345,288 字节。归档后另外逐一对照 source 与 archive 的原字节、长度和 SHA-256，487/487 一致。该数量不含索引本身与证据目录的 .gitattributes；archive 本次运行的回执在 .local 中生成于复制结束之后，归档动作的完成结果和逐字节复核在本回执记录。

本票没有原生窗口、系统选择框或浏览器；测试所需读取、改时间、删除均限于每个测试新建的合成目录。真实清理仍未开放，未借此绕过 D 尚待后续票完成的加固。没有修改已验收 crate、契约、工具、网络配置或任何别的工作树。

未做/未验证：F2/F3 宿主与实际界面接线、真实文件夹选择、用户本人点击后的真实删除、macOS、并发多宿主共享同一 data_dir、操作系统级崩溃/断电与恶意文件系统竞态。50 ms 返回预算在合成测试成功调用上断言通过，没有声称对任意磁盘延迟作硬实时保证。令牌熵使用允许依赖范围内的标准库 RandomState，摘要实现为 SHA-256；未做独立密码学审计。清理占用状态依赖注入 Platform；Windows 快照不可得时保守视为在用。

交付回执和证据后停止本票所有测试；所有运行过的检查命令已退出，没有本票启动的自有后台子进程待处理。
