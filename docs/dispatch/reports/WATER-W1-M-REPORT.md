WATER-W1-M 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/m/docs/dispatch/reports/WATER-W1-M-REPORT.md

# M 容量观察账本交回报告

2026-10-18。执行者交回状态为 SUBMITTED，等待总控独立验收；未自行标为 VERIFIED。

## 分配、提交与环境

- 权威票：主检出 `docs/dispatch/tickets/WATER-W1-M-SIZE-LEDGER-20261018.md`；已实际读取主 manifest，M 为 READY 后开始。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/m`；分支：`worker/water-w1-m`。
- 精确起点：`82e158079066bf795fb89fafa933bc2d7fc00bd5`；tag：`water-w1-evidence-batch-base-20261018-r1`。初始 HEAD 精确相同、状态干净，产品目录与本报告不存在。
- 实现及最终受测完整 SHA：`03f60aec13facf0e2b2c4c14e2b560608cc9fe72`。实现提交包含六个产品/测试文件与启动审计。此后只补本报告和原始证据；未再变更产品、测试或锁。
- 实际执行者：Codex，GPT-6（本会话暴露的模型家族；精确后端变体未暴露）。无子代理、无其他 CLI 实现者。
- Windows；Node 24.16.0、Rust 1.95.0/MSVC，离线、jobs=1，每个子命令 180 秒，一次一个 helper 门。私有 `.local/evidence-cargo-home`、`evidence-target`、`evidence-tmp`。
- 所有产品检查均经冻结 `scripts/evidence-batch-check.mjs`。rustfmt 仅作为源文件格式编辑器使用，检查仍由 helper fmt 执行。没有安装、fetch、prepare-evidence-assets、总控 runner、浏览器、物理夹具或真实用户目录操作。

## 实现与契约逐项对应

`packages/size-ledger` 为独立 workspace，package/lib 分别为 water-size-ledger / water_size_ledger，公开 `v1::analyze_json`、`v1::to_json`、私有字段的 SizeLedger 及 AnalysisError。恰有 COMMON 指定的四项直接依赖、自有 Cargo.lock、唯一 lib 与显式五测试目标；无 dev/build/bin/unsafe。锁内 registry 版本、source、checksum 由 helper 对照根锁。

原始 JSON 直接传真实 G `assemble_json(input, context)`，没有先 Value 重序列化输入。任何 G 错误以 Source 原样包装，code/field、Display 与原值相同；Error::source 可取原错误。输出在返回前经过本模块 to_json，两个公开输出路径均执行 33,554,432 UTF-8 字节上限检查。

逻辑字节仅来自已记录 File。全部观察和、Unknown 观察和、已知组和通过同一个 checked u128 整数累加函数；序列化为规范十进制字符串。实测两份 u64::MAX 得到 36893488147419103230，2^53 相邻值和为 18014398509481985，独立已知组之和也可超过 u64::MAX。没有浮点、u64 饱和/回绕或 A ByteCount 收窄。

同一次调用内，Unix File 按 (device, inode) 分组。HashMap 只用于索引，不用于输出迭代；Vec 保留组首次出现顺序和 entry_refs 原序；BTreeSet<u64> 将长度与 link_count 分别数值排序并去重。长度或 link_count 冲突时该组 logical_bytes=null、state=conflicting；任一冲突令 known_identity_logical_bytes=null。Unknown File 各自保留，即使名称、长度、相对路径或 scope 重叠也不合并。Directory/Link/Other 不计 File 字节或 File 身份组，目录 Unix 身份被排除。算法为期望 O(n log n)，无全配对。

observed_file_logical_bytes 是全部 File 观察逐条之和；unknown_identity_observed_logical_bytes 是 Unknown File 观察和。observed_set_identity_complete 仅在无 Unknown File 且无冲突时为真，identity_deduplicated_logical_bytes 也仅此时有值。无 File 时是空观察集合的 true / "0"；不代表磁盘或 scope 为空。scope_coverage_complete 独立取来源 status==completed；partial/cancelled 保持不完整。

公共头、完整 source_facts 及 source_totals 均从真实 G 结果 clone。来源 totals 中的未知 logical/allocated、unavailable 与覆盖语义保持不变。volume_unique_allocated_bytes 和 reclaimable_bytes 恒 null。新指标只描述观察集合逻辑长度，不代表卷唯一分配空间、APFS 共享块、全部硬链接覆盖或删除可释放量。没有回写 G/J/E/H 报告、降低保护或接 L/K。

生产只有内存解析、组装、分组和序列化，无文件/环境/网络/时钟/进程/缓存/CLI/IPC。完整 facts 含相对标识，不是脱敏导出。Windows 身份保持 Unknown；人工 Unix 输入只证明算法。

## 测试与五 final

唯一测试文件 `packages/size-ledger/tests/ledger_v1.rs` 从初次行为红到最终受测保持完全相同字节。五顶层精确为：

1. ledger_observed_sizes：0、2^53 邻值、超过 u64 的观察/已知组和。
2. ledger_identity_groups：同身份硬链接、跨 scope、不同 device、长度/link_count 冲突、非 File 排除、首次组顺序、额外数值排序/去重变体。
3. ledger_unknown_and_coverage：Unknown 逐条保留、跨 scope 同路径 Unknown、混合身份、partial、cancelled 空集合与覆盖分离。
4. ledger_validation：全部 11 source_errors 的 G 原 code/field/Display、嵌套重复键原文、超 8 MiB 输入、context 错序、Error 特征与固定错误文本。
5. ledger_public_wire_and_purity：15 份 golden 所有键和值精确相等，真实 G facts/totals、Serialize/to_json 一致、输入/context 不变、重复调用确定性、改 run/scan/path/label 后独立分析、跨调用无身份缓存。

行为红和每次负控均真实完整运行五测试，0 ignored / 0 filtered。suite 绿均为 5 passed / 0 failed。bridge 通过真实公开入口和真实 G 验证 15 份完整 golden、11 个来源拒绝；不是读取 expected 后直接返回。

全部命令前缀为：

```powershell
node scripts/evidence-batch-check.mjs --task WATER-W1-M --mode
```

启动 baseline（04:30:11.700Z-2552）退出 0，38 新冻结/七继承锁共 151 唯一文件一致，真实 G/A 验证 10 L + 15 M 输入与 11 错误；没有 M 产品测试或扫描。lock（04:32:25.905Z-32544）退出 0。既有总控派前 baseline（04:07:06.183Z-30108）也原样归档，未冒充本执行者的新检查。

下列五门均加 `--final`、退出 0，在同一完整 SHA `03f60aec13facf0e2b2c4c14e2b560608cc9fe72` 的干净状态串行执行。证据文件名均位于下文 helper/ 目录：

| 门 | result.json 文件名 | 结果 |
|---|---|---|
| fmt | 2026-10-18T04-39-02.953Z-32844-fmt-result.json | 格式通过 |
| test | 2026-10-18T04-39-05.991Z-14148-test-result.json | 完整五测通过 |
| clippy | 2026-10-18T04-39-09.416Z-23912-clippy-result.json | all-targets，-D warnings，通过 |
| metadata | 2026-10-18T04-39-14.234Z-38116-metadata-result.json | workspace/依赖/锁/目标通过 |
| bridge | 2026-10-18T04-39-16.819Z-31384-bridge-result.json | 实际公开入口，15 正例/11 拒绝通过 |

五 final 各自再次核验冻结、范围及最新四项红→当前字节恢复 suite，`proofAudit` 全部通过。

## 先红、源码负控与恢复证据

初次 `red-behavior`：`2026-10-18T04-32-46.832Z-12564-red-behavior-result.json`。完整可编译骨架保留真实 G 校验，但账本尚未实现；Rust 退出 101，1 passed / 4 failed，目标 M_BEHAVIOR 命中。此时尚未写算法。实现后 `04:34:26.405Z-3360-suite` 首次五绿；修正 clippy 后以最终源码字节 `04:35:55.056Z-4712-suite` 再次五绿。初次行为红是先红后实现，不是恢复一个既存正确版本。

三个负控都改真正生产逻辑，测试未变；Rust 退出 101，helper 认可有效目标红。每次均用最终源码快照原字节写回并刷新 mtime，再完整 suite 五绿：

| 负控 | 实际改坏 | 有效 red result / 恢复 suite result |
|---|---|---|
| nc1 / M_UNKNOWN_IDENTITY | 将 null 的身份去重值提升为 observed_sum | 2026-10-18T04-37-27.013Z-8932-red-nc1-result.json / 2026-10-18T04-37-34.726Z-3348-suite-result.json |
| nc2 / M_INTEGER_PRECISION | 真正求和函数改为 u64 saturating_add 再转 u128 | 2026-10-18T04-37-56.645Z-32764-red-nc2-result.json / 2026-10-18T04-38-03.163Z-31996-suite-result.json |
| nc3 / M_CONFLICT_UNKNOWN | 冲突组任取最小长度并计组和，错误允许精确身份去重值 | 2026-10-18T04-38-23.860Z-41252-red-nc3-result.json / 2026-10-18T04-38-29.872Z-15884-suite-result.json |

生产聚合 SHA-256 三 hash 如下；每项 original/restored 均为最终源码聚合值。逐文件 hash、mtime 和源码快照文件名见 EVIDENCE-AUDIT.json 及各原始 result：

| 项 | original | bad | restored |
|---|---|---|---|
| nc1 | 47fec1af3aaa3e2fd19e0059debc18b7d5438c0528b2ce973037ada0fe2682da | f93af7bd323d27712af37acc294d2c85f5ac2866fa62d8a25cce94260f00019a | 47fec1af3aaa3e2fd19e0059debc18b7d5438c0528b2ce973037ada0fe2682da |
| nc2 | 47fec1af3aaa3e2fd19e0059debc18b7d5438c0528b2ce973037ada0fe2682da | a196a2dd2434201cab74fb0073e5611ecd6e67cebbfb4e309dd50faf7a2effcb | 47fec1af3aaa3e2fd19e0059debc18b7d5438c0528b2ce973037ada0fe2682da |
| nc3 | 47fec1af3aaa3e2fd19e0059debc18b7d5438c0528b2ce973037ada0fe2682da | 2d703b94696329fbee6ce4a96e3ef080b16d79a16e328bce8de84a3ddfd5f210 | 47fec1af3aaa3e2fd19e0059debc18b7d5438c0528b2ce973037ada0fe2682da |

最终逐文件 SHA-256：

| 文件 | SHA-256 |
|---|---|
| src/lib.rs | c583415cf510e1438a6c3dfacd6fe64c6ca7ef4d6e520628f96c3a545975f0c4 |
| src/v1.rs | bf6a9243a2f00d84bb867311b0cee51f3b7ad19f9701fc6efd8bf01b53fbe13f |
| tests/ledger_v1.rs | b7b5dae77e1d49d519623005d53a8d321d66a7d0e72733e4aa6a8d6ffcb8e468 |

测试聚合 hash 始终为 `e6fb6aaaf68d567327f93f4e34c0a7023d5b8d1fba0457516e5e6dd13701c165`。骨架行为红生产聚合 hash 为 `47cd07982cb342ce016acd03bf1965ff7b8ce30b830c94aa5189a74e53e1c4dd`。没有编译失败、缺文件、坏依赖、超时、skip、测试开关或降低断言充当有效红。

## 所有失败与处理

1. `2026-10-18T04-35-10.068Z-20920-clippy-result.json` 失败：Platform 与 ScanStatus 是 Copy，两个多余 clone 触发 -D warnings。只移除这两个 clone，测试字节未改；clippy/fmt/最终字节 suite 均重新通过，随后才开始三负控。此失败没有当作负控。
2. 最初 nc1：`2026-10-18T04-36-20.351Z-8068-red-nc1-result.json` 有效目标红；但恢复用了 Copy-Item，源文件哈希已恢复而 mtime 被保留。随后 `2026-10-18T04-36-31.632Z-9004-suite-result.json` 失败，Cargo 日志仅 0.11 秒且未重编，仍执行坏态产物；源码快照已是最终字节。改用 File.WriteAllBytes 写回完全相同字节并更新时间，`2026-10-18T04-36-53.886Z-37848-suite-result.json` 五绿。为形成紧邻的干净恢复链，再次完整执行 nc1 红与 `04:37:34.726Z-3348` 恢复五绿；五 final 选用这条最新链。没有删除缓存或掩盖初次恢复失败。
3. 前期只读定位曾查询不存在的 docs/adr、TESTS.md（实际为 docs/decisions、TESTS.json），以及一次 PowerShell 的 node -e 引号传递失败；纠正定位/参数后正常读取。它们没有修改文件或运行产品，不属于 helper 产品检查；无其他未记录的产品检查失败。
4. 归档阶段首次 commit 在显式文件暂存进程尚未结束时被提前调用，遇到 index.lock 并退出；未删除锁或重置索引。等待原暂存进程正常完成（384 文件 hash 核对、六产品文件与受测提交一致、387 路径暂存完成）后再提交。此为交回操作次序错误，无产品或测试变化。

## 归档、范围与限制

`docs/acceptance/wave1/m/helper/` 收录本票 helper 目录全部 384 份 json/log/txt 原字节：24 个 result JSON、294 个完整命令日志、66 个源码/测试快照，合计 2,592,832 字节，包括总控既有派前 baseline、两次失败和被后续链替代的证据。没有归档编译二进制。ARCHIVE-INDEX.json 列出每个文件名、字节数及 SHA-256，复制后全部逐字节 hash 相等；EVIDENCE-AUDIT.json 索引所有检查、最新红/恢复、逐文件三 hash 和五 final。原 .local 缓存及证据全部保留。

新增产品仅限 Cargo.toml、Cargo.lock、README.md、src/lib.rs、src/v1.rs、tests/ledger_v1.rs。新增证据/回执均在 M 白名单。未改根 Cargo、A–K、L、helper、契约/冻结锁、台账、上游、其他工作树或已有 .gitattributes。未 push/merge/rebase/发布。

32 MiB 输出超限与 SerializationFailed 分支没有运行触达，只做源码审阅；输出类型不可任意构造，没有为覆盖率增加 forge 接口。合法输入至多 10,000 份 u64 长度，u128 checked 溢出分支不可由该契约输入触达。11 个冻结来源错误及额外错误已实测，但本票未额外构造 G 的 ReportRejected 超报告上限输入；该错误的透传由直接 map_err(Source) 源码核对。没有将未触达分支说成运行验证通过。

没有真实用户 scope、普通文件内容、身份 IO、真实容量、macOS、桌面/UI、L/K 接线或删除验收；Windows 结果不代表 macOS。M1 未完成。交回后停止本票修改，由总控另行独立验收和集成。
