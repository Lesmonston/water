WATER-W7-J3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w7-j3/docs/dispatch/reports/WATER-W7-J3-REPORT.md

# WATER-W7-J3 服务补遗回执

2026-10-29（Asia/Tokyo；检查回执的 UTC 日期为 2026-10-28）。交回实现与证据，待总控验收；未修改任务状态台账。

- 执行者：Codex GPT-6（用户分派标签为 sol；当前会话未暴露更细模型 ID）。未使用子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w7-j3`。
- 分支：`worker/water-w7-j3`。
- 首次 HEAD：`282876950df40a14b7abeec6ab27677ea0adc897`，开工时干净。
- 实现提交：`0f3ee7261ba0583bbc5dad172627a3e79cb71342`。
- 三个最终通过的 final 均绑定此实现提交，运行前后工作树干净。后续提交只含本回执与归档器生成的证据。
- 权威工单、W7 规则、ADR-018、M3 计划、第六波验收、SERVICE-M3-FIX 及其原契约均已读取；代码与测试按票面顺序核对。

## SPEC 逐项对照

### 第 1 节：清理进度的组序号

- `packages/water-service/src/clean.rs:176`：开始清理时，非空分组写入 `group_index = 1`；没有组则为 0。使用 `usize::from(!group_ids.is_empty())`，不改变分组标题、分组顺序及数量的来源。
- `Observer::on_item`：把当前条目所在组在计划中的位置加 1 后写入进度。IPC 字段仍为整数。
- 结束时原有的 `group_index = group_ids.len()` 保持，适用于 `completed` 和 `stopped`；`idle()` 的 0 保持。
- 在原 `service_clean_flow` 内调用新增的测试辅助函数 `clean_group_progress`：用三组、五项合成计划，经真实 `clean_prepare` → `clean_start` → `clean_progress` 入口检查空闲 0、开始 1、处理中序号始终在 `1..=3` 且依计划顺序确实观察到 1、2、3，以及完成时等于组数。另在原停止流程后增加停止态序号断言。
- 同步只在测试平台中实现：开始时暂停批次，每个路径首次进入占用守卫时用通道暂停；下一项守卫暂停后读取上一项回调后的进度。先恢复并排空清理任务，再核对采样，避免负控失败时与夹具回收竞争。未新增生产测试开关或公开接口。

### 第 2 节：记录写失败后回收本次快照

- `packages/water-service/src/service.rs:756`：仅在快照已写成功、后续 `scans/<scan_id>.json` 写失败时，经 `inspect_err` 调用既有 `Store::remove("snapshots", std::slice::from_ref(&worker_id))`。
- 删除列表只有本次 ID，不扫描或递归清理其他文件；存储层原有的目录、普通文件、重解析点与合法 ID 检查继续生效。
- 忽略 `remove` 的返回值，因此删除失败仍沿用原写入错误处理：本次扫描为 `failed`，内存回滚，不增加界面错误。
- 先写快照、再写扫描记录的顺序不变，原有内存回滚逻辑不变。
- 在 `service_hardening` 调用的原 `hardening_scan_record` 中增加 `SERVICE_SNAPSHOT_ORPHAN` 断言：正常扫描的快照存在；沿用 `scans` 下同名目录阻挡写入的夹具，失败后本次快照不存在、上次成功扫描的快照仍在。原 `SERVICE_SCAN_RECORD` 的重启及内存回滚断言全部保留。

### 第 3、4 节及范围

- 仍精确六个测试：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`、`service_hardening`。未改名、拆分、过滤或忽略测试。
- **改过的旧断言：无。** 测试文件相对基线只有新增 169 行，删除 0 行；没有原来断言从 0 起数而需要改值的地方。
- 实现提交仅改 `src/clean.rs`、`src/service.rs`、`tests/service_v1.rs`。未修改 `Cargo.toml`、`Cargo.lock`、IPC、`ui-fixtures.json`、契约、检查器、其他包、宿主或界面。
- 所有删除测试均在本树 `.local/w3-f1-fixtures/` 下每次随机新建的合成目录中进行，沿用原夹具对父目录及前缀的校验与单目录回收。

## 检查命令与结果

工作目录均为本票工作树根。下表参数的共同命令前缀为：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W7-J3
```

回执文件均在 [归档 receipts](../../acceptance/wave7/j3/receipts/) 下。下表时间为 UTC，日期均为 2026-10-28；“工具退出码”指上述 Node 检查入口，负控期望的 Cargo 退出码另列。

| 参数 | 时间 / PID（对应回执文件前缀） | 工具退出码 | 结果 |
|---|---|---:|---|
| `--mode baseline` | `14-35-47.270Z-15864` | 0 | 干净精确基线、离线输入通过 |
| `--mode lock` | `14-36-42.507Z-4680` | 0 | 依赖与现有锁核对通过，无下载或锁变更 |
| `--mode test` | `14-37-49.476Z-34076` | 1 | 初版新增测试夹具同步错误；4 过、2 败，详见下文，不计负控 |
| `--mode test` | `14-39-52.958Z-29380` | 1 | 纠正测试同步后，旧产品被两项新断言抓到；4 过、2 败，Cargo 101 |
| `--mode check` | `14-40-41.453Z-34040` | 0 | 修复后的政策、依赖、fmt、Clippy `-D warnings` 通过 |
| `--mode test` | `14-41-32.703Z-19128` | 0 | 修复后六测全过，Cargo 0 |
| `--mode red-nc1` | `14-48-28.936Z-15184` | 0 | 有效目标失败，5 过、1 败，Cargo 101 |
| `--mode test` | `14-49-05.668Z-32284` | 0 | nc1 原字节恢复后立即六测全过 |
| `--mode red-nc2` | `14-49-42.184Z-17264` | 0 | 有效目标失败，5 过、1 败，Cargo 101 |
| `--mode test` | `14-50-19.269Z-23080` | 0 | nc2 原字节恢复后立即六测全过 |
| `--mode check --final` | `14-51-03.160Z-9172` | 0 | 干净实现提交上通过 |
| `--mode test --final` | `14-51-13.489Z-30552` | 1 | 5 过、1 败：旧 `SERVICE_RETURN_BUDGET: custom_root_add` |
| `--mode test --final` | `14-52-53.342Z-14396` | 1 | 4 过、2 败：旧 `SERVICE_RETURN_BUDGET: scan_start`、`scan_progress` |
| `--mode test --final` | `14-55-03.890Z-25028` | 0 | 同一源码、同一实现提交；六测全过，26.21 秒，0 ignored / measured / filtered；两条负控及对应恢复审计通过 |
| `--mode real --final` | `14-55-46.403Z-31524` | 0 | 真实只读体检通过，汇总见下文 |
| `--mode archive` | `14-58-02.367Z-43420` | 0 | 归档成功；本次 archive 自身回执留在 `.local/checks/WATER-W7-J3/`，索引见下文 |

归档文件名形式为 `2026-10-28T<时间-PID>-<mode>-result.json`，命令日志为相同前缀的 `-<序号>.log`。

另运行定向格式化（退出码 0）：

```powershell
& 'C:/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/rustfmt.exe' --edition 2024 packages/water-service/src/clean.rs packages/water-service/src/service.rs packages/water-service/tests/service_v1.rs
```

首次新增测试把同一条目两次安全复核都当成新条目，导致测试通道等待超时及随后锁中毒；已在测试平台按路径去重，并在等待前释放平台锁。此轮日志完整保留，**不作为有效负控或产品回归证据**。修正后的第二轮在未改产品时分别报 `SERVICE_GROUP_INDEX: first group`（实际 0，期望 1）及 `SERVICE_SNAPSHOT_ORPHAN: failed scan left its snapshot`，没有超时。

两次 final 失败都发生于原有 50 ms 返回预算断言，且失败调用不同；没有放宽预算、改断言、跳过测试或调整检查器。等待后在相同源码上最终通过。实际调度或存储延迟来源未定位，不能据本次通过宣称稳定满足所有负载下的 50 ms 预算。未重复运行已通过的 final。

归档中还包含开工前已有的总控 baseline 回执 `2026-10-28T14-17-51.465Z-23076-baseline-result.json` 及其日志，不计作本执行者运行。

## 有效负控与恢复

负控均在实现提交之后，每次只改一个生产逻辑位置，测试字节不变；未使用编译失败、超时或测试开关制造失败。

| 负控 | 唯一变异 | 实际失败 | 恢复 |
|---|---|---|---|
| nc1 | `clean.rs` 的当前组位置映射由 `.map(|index| index + 1)` 临时改为 `.map(|index| index)` | `service_clean_flow` 报 `SERVICE_GROUP_INDEX: running index 0`，其余五测通过 | 立即 `git checkout -- packages/water-service/src/clean.rs`，随后 `--mode test` 六测全过 |
| nc2 | `service.rs` 的快照删除 ID 列表临时改为空切片 `&[]` | `service_hardening` 报 `SERVICE_SNAPSHOT_ORPHAN: failed scan left its snapshot`，其余五测通过 | 立即 `git checkout -- packages/water-service/src/service.rs`，随后 `--mode test` 六测全过 |

恢复后的 SHA-256（实际文件字节；两条负控的恢复绿回执和最终源码快照一致）：

| 文件 | SHA-256 |
|---|---|
| `src/clean.rs` | `b144b732de7fe2d2d478e8e515d3b1f48680414fb6622da57aba296703c0c712` |
| `src/service.rs` | `12fa3e664a9cfc7d1d0501a5f927edda2a7b2ec4569649c9a7b5ec6144181b3c` |
| `tests/service_v1.rs` | `ceeb9042fccc0869b22378c2621917751f41a1951093eb1b2386155a389b2718` |

检查器聚合哈希：

- 恢复后及最终 `productionHash`：`17cff1726d4c187c18fd421b5a7987872ba4f08445fb4be6249e586fa3f31ce3`。
- nc1 变异 `productionHash`：`a73bd3b344f6c700632fcb145769f4d082a3ecf6a2de3ec6a1b764aa40ecd549`。
- nc2 变异 `productionHash`：`820c6463baaf6004267c9c3b6ef6ff9aabd2c194b2f797515dab265d3070ba59`。
- 两条负控、两次恢复及所有 final 的 `testHash`：`8c15f4ebd16cdab88b82f11d5cb0d6761270fafab7e3d43ae79e06d0a0af548f`。

最终 test 回执的 `proofAudit` 分别绑定 nc1 → `14-49-05.668Z-32284-test`、nc2 → `14-50-19.269Z-23080-test`。

## 真实只读体检

`real --final`：状态 `completed`，扫描 `duration_ms = 112993`；整个检查入口从 14:55:46.404 到 14:57:46.685 UTC，约 120.3 秒。四个盘，清理预览返回 `unavailable`，没有清理真实数据。原生窗口 0，选择框 0。

分类汇总仅列类别、组数和十进制字节，不含真实文件路径或进程命令行：

| 类别 | 组数 | 总字节 |
|---|---:|---:|
| `agent_tool` | 24 | 33086442327 |
| `browser` | 14 | 10479118116 |
| `system_temp` | 2 | 551086205 |
| `app_leftover` | 8 | 10331510854 |
| `dev_cache` | 13 | 5887168152 |
| `crash_log` | 7 | 1080235669 |
| `gpu_system` | 2 | 656002283 |

服务原始 totals：

| 字段 | 字节 |
|---|---:|
| `recognized_bytes` | 62071563606 |
| `recommended_bytes` | 11721742490 |
| `confirm_bytes` | 8930696025 |
| `advisory_bytes` | 5659026320 |
| `protected_bytes` | 20766261143 |
| `unrecognized_bytes` | 0 |

类别总量与各级可清量的统计口径不同，以上按服务返回原样记录，没有解释为可实际释放的空间。`insights = 0`；在用提示为“Chrome 正在运行，将跳过占用的项”和“Edge 正在运行，将跳过占用的项”。真实体检仅按规则读取名字、大小、时间、属性与进程元信息，没有读取真实文件内容。

## 归档与未验证事项

- [ARCHIVE.json](../../acceptance/wave7/j3/ARCHIVE.json)：249 个原字节归档文件，3,412,347 字节；生成时间 `2026-10-28T14:58:03.785Z`。索引和归档器生成的 `.gitattributes` 另计。
- 完整日志保留了所有先红、同步夹具错误、两次预算失败、有效负控、恢复绿与最终通过；没有删改失败记录。
- Windows 本机验证；未验证 macOS、M1、实际 GUI 展示、宿主整合或真实用户清理。
- 未单独注入“存储层 remove 自身失败”；忽略删除失败的行为通过既有 `Store::remove` 与调用点静态核对。本票没有扩展存储层或清理执行器。
- 未定位上述 50 ms 预算的间歇失败来源，后续总控复核应保留这一限制。
- 没有下载依赖、联网、开原生窗口、弹选择框、推送、合并、重写历史、修改 git 配置或改主线台账；提交身份只在提交进程内设置为执行者自身身份。
- 报告与证据提交后停止本票检查，不保留本票启动的后台任务。
