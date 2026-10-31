WATER-W8-K1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k1/docs/dispatch/reports/WATER-W8-K1-REPORT.md

以下保留 2026-10-31 原受阻记录，属于历史状态；本轮实现、验证与交付见末尾“补单 01”。本报告表示执行者已提交，待总控独立验收。

2026-10-31。执行者：Codex（GPT-6；运行环境未提供更细的模型版本）。本回执仅记录派前阅读发现的契约与旧断言冲突，不表示产品已实现或验收通过。

## 起点与范围

- 工作树：`F:/new/smaltalk/water/.worktrees/w8-k1`。
- 分支：`worker/water-w8-k1`。
- 初始 HEAD：`912eba100ba342c3eeb21ba555c6d589b91e6b4f`，初始工作树干净。
- 权威工单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K1-PROCESS-20261031.md`。
- 实现提交 SHA：无；尚未修改产品源码、测试、依赖或锁文件。本次仅新增本受阻回执。

## 阻塞证据

1. `contracts/m3c-v1/PROCESS-M3C.md:10` 要求程序路径取不到时计入新的 issue `image_unavailable`，与 `access_denied` 等并列；第 5 节还要求真实冒烟输出该 issue 的计数。
2. 基线 `packages/process-scan/tests/process_v1.rs:363` 的 `process_snapshot_contract` 对摘要中每个 issue 执行原有断言：

   ```rust
   assert!(code == "access_denied" || code == "exited");
   ```

   按新 SPEC 输出 `image_unavailable` 后，此原有断言必然拒绝该 code。这是静态可确定的冲突；尚未运行改动后的测试，不声称已取得失败日志。
3. `docs/dispatch/W8-M3C-WORKER-RULES.md:44` 明确规定：

   > **旧断言**：只有 SPEC 写明“获准修改”的才能改，并在回执里逐条写出原值与新值；其余原有断言与标记不变。SPEC 没想到、但因本单改动而必然要改的旧断言：**先写受阻回执**，不要自行改。

   当前 PROCESS-M3C 没有明确授权修改上述旧断言。因此不能自行放宽断言，也不能省略新 issue 或从 summary 中隐藏它来过门。

## 最小补充需求

请总控通过正式补充单及对应冻结材料，明确授权仅将第 363 行的 issue code 白名单扩为：

```rust
assert!(code == "access_denied" || code == "exited" || code == "image_unavailable");
```

其余原有断言与标记保持。补充单需绑定本回执提交后的实际续做 HEAD，并同步必要的契约与 manifest；这些文件不在本执行者可修改范围。

## 已执行检查

在指定工作树根目录运行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K1 --mode baseline
```

- 退出码：0；`status: passed`；`offlineCache: complete`。
- 回执：`.local/checks/WATER-W8-K1/2026-10-31T14-15-00.211Z-25840-baseline-result.json`。
- 开始：`2026-10-31T14:15:00.213Z`；结束：`2026-10-31T14:15:04.194Z`。
- 检查器报告 `productTestsRun: false`、`realDataRead: false`，只证明基线、环境与输入就绪。
- 人工核对 `git rev-parse HEAD`、`git branch --show-current`、`git status --short` 与票面一致。

## 未做或未验证

- SPEC 第 1～3 节均未实现；没有新增系统调用或结构体大小断言。
- 未运行 lock、check、test、real、负控或任何 final；没有真实冒烟计数、负控恢复哈希。
- 未运行 archive：当前缺少实现、负控与 final，不能归档为完成证据。
- 未启动测试进程、窗口、选择框；未新建物理测试夹具，未执行删除。
- 未下载、安装、修改检查器、契约、台账、其它包或 Git 配置；未 merge、改写历史或 push。
- 未验证 Windows 新功能、生产竞态、真实链路或 macOS。等待总控补充单后再继续。

## 补单 01

2026-11-01（JST）。执行者：Codex（GPT-6；运行环境未提供更细的模型版本）。按权威原票、W8-M3C-WORKER-RULES、PROCESS-M3C 全文、原 PROCESS、MODEL 第 7 节、补单与历史回执的顺序阅读后续做，另读项目入口文档、ADR-018 与第八波计划。未使用子代理。

### 起点与实现提交

- 工作树 / 分支：`F:/new/smaltalk/water/.worktrees/w8-k1` / `worker/water-w8-k1`。
- 续做 HEAD：`6273d4d76e9b3339d7ef6a14c748e60fb50bb383`；开工时工作树干净、分支正确，未重跑 baseline。
- 实现提交：`7264e92bca874269f1e792d8b479f403e1db7a99`（`feat(process-scan): track executable locations and orphan working sets`）。三个 final 都在此干净提交执行；后续只提交本回执和归档证据。
- 仅改包内 `src/lib.rs`、`src/native_windows.rs`、`tests/process_v1.rs`、`examples/real_smoke.rs`、`README.md`；依赖、Cargo.toml 与 Cargo.lock 均未改。

### SPEC 第 1～3 节逐条对照

1. **内存中的程序路径和工作集**：`src/native_windows.rs` 的 `enrich()` 复用原有 `PROCESS_QUERY_LIMITED_INFORMATION` 句柄。新增 `QueryFullProcessImageNameW` 声明，以 flags=0 和 32,768 个 UTF-16 单元的有界缓冲读取 Win32 路径；失败时保存空路径并计 issue，不抛系统原文。`working_set_of()` 用同一句柄执行原有 `NtQueryInformationProcess` 的新增信息类 3（`PROCESS_VM_COUNTERS`），读取 `WorkingSetSize`；失败为 `None`。信息类 60 的命令行读取保持原样，其它信息类没有引入。
   - 唯一新增系统函数为 `QueryFullProcessImageNameW`；FFI 全在 `src/native_windows.rs`，新增 unsafe 调用均有安全说明。
   - 新增 x64 `#[repr(C)] VmCounters`（基础 VM_COUNTERS）；`const _` 断言大小 88 字节、对齐 8 字节、`working_set_size` 偏移 32。原有结构体断言保留。
   - `src/lib.rs` 的私有 `ProcessRecord` 保存 `image_path` 与 `working_set`；不增加 Serialize，原自定义 Debug 不输出路径或命令行。`ProcessSummary` 及其 entry 的字段集合不变，已有 JSON 严格形状断言仍执行。
2. **新的在用方式**：`InUseMode::RunsFromOrReferencesItem` 序列化为 `runs_from_or_references_item`；`in_use()` 接到 `ProcessSnapshot::runs_from_or_references()`。名单为空允许任意进程，否则 ASCII 大小写不敏感精确匹配名字。程序路径分支复用路径归一化，要求等于条目或条目后紧接 `\\`，不把相邻目录当前缀命中；命令行分支直接复用未改动的 `command_references_path()`。空路径不命中；路径和命令行均为空也不命中。原三个 mode 的分支保持原样，InUseHit 形状不变。
3. **孤儿链内存**：`OrphanChain` 增加 `memory_bytes: Option<String>`；`orphans()` 使用原有后代列表，遍历根与全部后代，只汇总已知工作集，以 u128 累加后转十进制字符串。至少一个值已知（包括 0）则有字符串；全部未知为 null。孤儿判定、PID 复用边界与其它字段保持原样，不输出路径或命令行。

### 旧断言及计数口径

仅修改补单第 1 节授权的旧断言（原基线第 363 行，现第 430 行）：

原文：

```rust
assert!(code == "access_denied" || code == "exited");
```

新文：

```rust
assert!(code == "access_denied" || code == "exited" || code == "image_unavailable");
```

同一循环中的 `{code, count}`、`count >= 1` 以及其它旧断言、旧标记均保留，四个测试名不变。测试夹具辅助代码按新规格改到 `.local/w8-k1-fixtures/w8k1-<随机令牌>/`，增补 PING 的令牌校验与清理白名单，并将删除前的父目录和目录名检查收紧为完整预期值；未放宽旧断言。

`image_unavailable` 只在句柄已经打开、`QueryFullProcessImageNameW` 返回失败时计 1。OpenProcess 失败的行保留原 access_denied/exited 分类，`image_unavailable=false`，不为该失败重复计数。原命令行 issue 的分类逻辑保持原样。summary 依次输出非零的 `access_denied`、`exited`、`image_unavailable`；零计数不出现。

为 SPEC 第 5 节的真实冒烟新增只返回聚合计数的 `ProcessSnapshot::image_path_count()`，不暴露路径。`examples/real_smoke.rs` 在原输出上加 `image_path_count`、`image_unavailable`；后者直接读取 summary 同口径的 issue。

### 测试内容与收尾

- `process_snapshot_contract`：保留严格 summary/entry/issue 形状检查，增补 issue 顺序、路径计数有界且自身可读。
- `process_path_reference`：保留全部旧边界用例；新增方式的命令行分支保持原结果。复制系统 PING 到本次夹具的 `bin/PING.EXE`，以相对程序路径从夹具父目录启动，使命令行携带本次令牌但不含绝对条目路径；先确认旧 references_path 不命中 PING，再验证条目、完整程序文件、大小写/斜杠/尾分隔符和相邻目录边界（`PROC_M3C_IMAGE`）。
- `process_in_use_and_orphans`：保留原 mode、孤儿和后代断言；新增空名单、名字过滤、旧三个 mode 行为与四个序列化名字（`PROC_M3C_ANY`）。空名单用程序文件本身作条目，避免其它自制 cmd 对夹具根的合法命中干扰首个 InUseHit。自制孤儿链的内存为十进制字符串且大于根工作集，并检查后代确实贡献内存（`PROC_M3C_MEMORY`）。根和 waitfor 子进程的独立基准由隐藏、带本次令牌且同步退出的测试用 PowerShell `Get-Process ... WorkingSet64` 取得，只接收字节数；考虑两次采样间波动，对后代贡献的独立下界取其样本一半，产品仍累加完整工作集。
- `process_privacy`：先确认复制的程序和自制孤儿存在，再检查 summary、snapshot、InUseHit、OrphanChain 的 JSON/Debug，包含新方式返回的 hit；检查原文与 JSON 转义形式都没有夹具路径、程序路径、令牌（`PROC_M3C_PRIVACY`），旧隐私断言保留。
- 所有启动的测试进程隐藏窗口；清理沿用新快照核对令牌、进程名、记录的创建时间和本次起始时间，逐 PID 结束，不按进程树结束。仅删除本次新建且父目录/名字核对通过的夹具目录。全部检查结束后，夹具父目录剩余子目录为 0；额外只读、仅输出计数的进程检查发现带该测试令牌格式的 cmd/waitfor/PING/PowerShell 剩余进程为 0，未据此结束任何进程。

### 检查命令与结果

所有检查均从本工作树根执行，命令公共前缀为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K1
```

下表列出本轮全部检查调用。回执文件位于 `docs/acceptance/wave8/k1/receipts/`，表中用完整文件名前缀定位，均补 `-result.json`；同前缀的 `-N.log` 为对应命令日志。

| 参数 | 回执文件名前缀（UTC） | 结果 / 门用时 |
|---|---|---|
| `--mode lock` | `2026-10-31T15-44-17.352Z-33460-lock` | 退出 0，依赖通过，7.273 s |
| `--mode check` | `2026-10-31T15-44-35.544Z-16644-check` | 退出 0，政策/fmt/clippy 通过，53.984 s |
| `--mode test` | `2026-10-31T15-45-42.667Z-32032-test` | 门退出 1，cargo 101，3 过 1 失败，47.070 s；下文说明 |
| `--mode test` | `2026-10-31T15-47-02.619Z-16416-test` | 退出 0，4/4，41.073 s |
| `--mode check` | `2026-10-31T15-48-08.249Z-13376-check` | 退出 0，政策/fmt/clippy 通过，17.648 s |
| `--mode red-nc1` | `2026-10-31T15-49-38.182Z-22932-red-nc1` | 门退出 0，cargo 101，目标红被识别，29.855 s |
| `--mode test` | `2026-10-31T15-50-14.918Z-32316-test` | nc1 原字节恢复后退出 0，4/4，30.885 s |
| `--mode red-nc2` | `2026-10-31T15-51-06.729Z-13432-red-nc2` | 门退出 0，cargo 101，目标红被识别，20.138 s |
| `--mode test` | `2026-10-31T15-51-44.343Z-32252-test` | nc2 原字节恢复后退出 0，4/4，21.302 s |
| `--mode check --final` | `2026-10-31T15-52-34.005Z-11600-check` | 干净实现提交，退出 0，7.474 s |
| `--mode test --final` | `2026-10-31T15-52-49.515Z-35272-test` | 退出 0，4/4，0 ignored/measured/filtered；两条负控/即时恢复哈希审计通过，17.001 s |
| `--mode real --final` | `2026-10-31T15-53-22.921Z-20700-real` | 干净实现提交，退出 0，只读，8.647 s |
| `--mode archive` | `2026-10-31T15-53-55.466Z-39500-archive` | 退出 0；该回执留在 `.local/checks/WATER-W8-K1/`，归档索引见下文 |

首轮 test 的失败是新增测试错误地要求空名单的第一个 hit 一定是 PING，实际先命中了同一夹具内合法引用根目录的自制 cmd（`PROC_M3C_ANY: empty or matching names allow image`）。修正新增测试的条目为程序文件本身后通过，未改产品来规避命中、未改旧断言。这次失败完整保留，不作为有效负控。另有直接运行 `rustup` 格式化时因 PATH 不含该命令而失败，随后使用本机固定 1.95.0 的绝对 rustfmt 路径完成；最终 fmt/clippy 均通过。

归档同时保留本轮开始前已有的三份 baseline：`14-08-51.106Z-40180`（失败，`Output root must not exist yet`）、`14-10-14.002Z-40004`（总控派前通过）、`14-15-00.211Z-25840`（原执行轮通过）。这些均是既有历史，本轮没有调用 baseline。

### 两条负控与恢复哈希

两条都只修改 `src/lib.rs` 中一处实际生产逻辑，不改测试或加入测试开关；每次门识别目标失败后立即执行：

```powershell
git checkout -- packages/process-scan/src/lib.rs
Get-FileHash -Algorithm SHA256 -LiteralPath packages/process-scan/src/lib.rs
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K1 --mode test
```

- **nc1**：在 `runs_from_or_references()` 的筛选谓词中，将 `image_inside_item(&p.image_path, &path_n)` 换成 `false`，只留下命令行分支。四测实际运行，1 过 3 失败，出现 `PROC_M3C_IMAGE: executable in item hits`、`PROC_M3C_IMAGE: item and exact executable match`、`PROC_M3C_IMAGE: image hit for privacy`。存在预期的未用函数 warning，但没有编译错误、超时或旧断言失败；门的 `observedExpectedFailure=true`。随后原字节恢复并 4/4。
- **nc2**：从内存汇总迭代器删除 `.chain(descendant_pids.iter().copied())`，只累计根工作集。四测实际运行，3 过 1 失败，出现 `PROC_M3C_MEMORY: root and descendant working sets must be summed`；没有编译错误或超时，门的 `observedExpectedFailure=true`。随后原字节恢复并 4/4。

两次恢复后的 `src/lib.rs` SHA-256 均为：

```text
1ff2e451e998ba0a7e6a77bd46efd8e5191f27de70eb2682c9753bde1e6f06cc
```

最终 `native_windows.rs` SHA-256：`d6ae518ac188e0c54f0853f06f1adf6416e7305bc3a94c7fd4f805946742dda0`；`tests/process_v1.rs`：`58a348c5f24d7be7ad3cb360376913284655b03408125ab06b36d01c50c7fe10`。检查器聚合 productionHash 为 `bafb59aaf011b4fd467f2e0415922a867dd2fb23bd74a2358db6f864756b9e20`，testHash 为 `7d87f94c3b3a15eea43e8039c86285391db34712d4d3bbb49a55839103cfe36c`；两次恢复绿与三个 final 均一致，final test 的 proofAudit 已逐项绑定红/绿回执与源码快照。

### 真实冒烟与归档

一次 `real --final` 的完整 stdout JSON：

```json
{"process_count":394,"access_denied":5,"exited":10,"image_path_count":381,"image_unavailable":9,"chrome.exe":27,"msedge.exe":6,"node.exe":8,"orphan_count":0,"orphans":[]}
```

`image_unavailable=9` 使用上文“已开句柄、映像查询失败”的口径，不对未开句柄者再计一次。快照只在本机当时有效；access_denied/exited 保持原命令行问题计数，不用它们推算成功打开的句柄数。未输出实际程序路径或命令行。

`--mode archive` 生成 `docs/acceptance/wave8/k1/ARCHIVE.json`，按原字节归档 149 个日志/回执/源码快照文件，共 1,569,562 字节，另有归档索引与 `.gitattributes`。本轮首个失败测试、两条有效负控、恢复绿与 final 都保留。

### 没做或没验证

- 完成本票 Windows x64 的指定四测、两条负控和三个 final；不等同于总控验收通过或整波集成完成。
- 全部 Cargo 调用由固定检查入口设置离线、单线程、私有 Cargo home/target；未下载或新增依赖。原生窗口 0、选择框 0，未运行其它包或整仓测试。
- 真实冒烟只读进程元数据；未读取真实用户文件内容、清理真实数据、结束真实用户进程。物理删除只发生于各次测试自建的有界夹具；系统 PING 的复制为工单明确要求。
- 未强制造出工作集全部未知/部分未知、系统 API 极端失败、PID 生产竞态或长时间压力；这些分支按 Option 语义与既有 PID 规则实现，未声称额外实测。
- 未验证 macOS、其它架构、真实 F→G/服务/宿主链路或新 release；未修改契约、检查器、台账、其它包、上游或共享配置。
- 未改 Git 配置或远端、未 merge/rebase/amend/reset/squash、未 push；仅以进程内作者/提交者环境变量使用 `Codex GPT-6 <codex-gpt-6@localhost>` 新增提交。交回后停止本票测试与后台进程。
