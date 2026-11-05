WATER-W10-M4 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m4/docs/dispatch/reports/WATER-W10-M4-REPORT.md

下面保留 `07dc6209` 的原轮受阻内容；当前续做状态见文末“补单 01”。本次仍受阻，原因已变为合成测试中的句柄相对改名返回错误 87。

2026-11-05。实际执行模型：GPT-6（Codex；未获运行时更细的型号标识）。本回执是受阻交回，不是实现完成或验收通过。

## 工作树、基线与交回范围

- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m4`。
- 分支：`worker/water-w10-m4`。
- 首次 HEAD：`f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe`，开工时干净。
- 实现提交 SHA：无。发现契约缺口后停止实现；本次交回只有本回执和检查器归档的证据，不含产品改动。
- 期间写过的未完成草稿由 `check` 保存了原字节源码快照。归档后逐个核对五个草稿文件的 SHA-256 与检查快照相等，再恢复三份原有源文件、移除两份本次新建的源文件。`git diff --exit-code -- packages/junk-clean` 通过；源码、测试、README、Cargo.toml、Cargo.lock 均与首次 HEAD 一致。
- 没有修改契约、检查器、manifest、状态台账、其它包或其它工作树；没有修改 git 配置、远端或已有提交，没有 push、merge、rebase、reset、amend。
- 遵守 C 组顺序：M4 受阻后停止；未读取 M5 工单、进入 M5 工作树或开始 M5 实现/检查。

## 阻塞：真实冒烟缺少固定盘发现能力

三处约束同时成立：

1. [工单第 64 行](../tickets/WATER-W10-M4-CLEAN-20261105.md)与 [CLEAN-M35 第 9 节](../../../contracts/m35-v1/CLEAN-M35.md)要求对**每个固定盘**的 `<盘>:\.water-quarantine` 调用 `list_quarantines`，真实输出仅有状态与编号目录个数，且必须通过 `real --final`。
2. [执行者规则第 2 节](../W10-M35-WORKER-RULES.md)明确：“系统函数只用工单列出的……只放在 `src/native_windows.rs`”；生产代码不得启动进程、联网、枚举或读取未列出的环境变量；公开接口只按 SPEC 增加。
3. [CLEAN-HARDENING 第 8 节](../../../contracts/hardening-v1/CLEAN-HARDENING.md)原有八个系统函数，加上 CLEAN-M35 第 1 节唯一新增的 `NtCreateFile`，没有驱动器枚举或固定/可移动/网络驱动器类型识别能力。现有接口及新增 SPEC 也没有向真实冒烟注入权威固定盘清单的入口；检查器的 M4 `realMode` 是 `env-only`，不会传固定盘参数。

不能把遍历 A–Z、仅查系统盘、硬编码当前机器盘符当成“每个固定盘”的证明，也不能私加 `GetLogicalDrives`、`GetDriveTypeW`，在 example 中绕开 FFI 边界或启动 PowerShell。`GetVolumeInformationByHandleW` 的卷属性、`GetDiskFreeSpaceExW` 的空间数值都不能给出驱动器类型。

规则第 2 节明确：“契约冲突或缺东西时写受阻回执，不要自行变通。”因此停止，未运行真实盘探测。此项需要总控补充契约与相应检查配置，例如明确授权只读固定盘发现接口/所需系统函数，或提供经核实的固定盘输入及其传入方式；执行者没有自行修改这些文件。

## SPEC 逐节状态

| 节 | 本次状态 |
|---|---|
| 1 原则 | 未交付产品修改；依赖和锁不变。草稿的 FFI/源码政策检查通过，不能据此认为草稿已实现契约。 |
| 2 解锁对 | 曾写 `PlanItem.unlocked_paths`、结构/文本校验与祖先身份例外草稿，未测试，已从产品工作区撤回。条目内部保护身份与硬守卫没有获准放宽。 |
| 3 移入 | 曾写报告类型与句柄链/建目录/不覆盖改名草稿，未测试，已撤回。没有实际调用移动。 |
| 4 复原 | 曾写校验、句柄改名与空骨架处理草稿，未测试，已撤回。没有实际调用复原。 |
| 5 purge | 曾写显式栈与遗留报告草稿，未测试，已撤回。没有实际调用删除。 |
| 6 查看/序列化 | 曾写类型、查看和序列化草稿，未测试，已撤回。草稿的根目录拒绝访问提示等细节尚未完成审查。 |
| 7 成因说明 | 已阅读，没有以文档内容充当运行证明。 |
| 8 测试 | 原六个测试文件字节不变；五个新测试尚未写入或运行。没有建立任何测试夹具。 |
| 9 负控/真实冒烟 | 三条负控、恢复绿测、三个 final 均未运行；真实冒烟因上述契约缺口未实现、未运行。 |

## 已运行命令与结果

下列命令均在 M4 工作树执行，检查入口为总控目录的固定绝对路径：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode baseline
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode lock
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode archive
```

| 模式 | 结果 | 回执文件（归档 `receipts/` 下） |
|---|---|---|
| baseline | passed；首次分支/HEAD/干净状态与冻结输入就绪 | `2026-11-05T08-43-00.940Z-31588-baseline-result.json` |
| lock | passed；依赖只核对，没有改锁 | `2026-11-05T08-51-24.388Z-33560-lock-result.json` |
| check | failed；metadata、源码政策、九个 FFI 白名单与 fmt 通过，clippy 返回 101 | `2026-11-05T08-53-44.396Z-28712-check-result.json` |
| archive | passed；由检查器逐字节归档先前日志/回执/源码快照并生成索引 | archive 自身回执仍在本树 `.local/checks/WATER-W10-M4/2026-11-05T08-56-07.161Z-28076-archive-result.json` |

`check` 的失败是草稿自身问题，不是环境失败或有效负控：`src/native_windows.rs:3` 的原外层导入在新增的内层导入之后成为 `unused imports`，`-D warnings` 将其作为错误。日志为 `2026-11-05T08-53-44.396Z-28712-check-6.log`。发现契约阻塞后没有继续修草稿或重跑检查。

另有一次直接调用 `cargo fmt` 因 PowerShell PATH 没有 cargo 而失败，未启动 Cargo；随后通过检查器已确定的 Rust 1.95 工具链绝对路径运行 `cargo.exe fmt --manifest-path packages/junk-clean/Cargo.toml` 成功。该命令只格式化草稿；以上 `check` 又通过了 `cargo fmt --check`。所有已运行 Cargo 构建由检查器配置离线、jobs=1、私有 Cargo home、target 与临时目录，没有下载。

## 证据与限制

- 归档索引：[ARCHIVE.json](../../acceptance/wave10/m4/ARCHIVE.json)；检查失败与草稿快照均如实保留，不删除失败记录。
- 草稿 `productionHash`：`040664718d3e372c4bc9809897447081c0308b16c86cc0d4b5caf6352f61ab32`；原测试 `testHash`：`18ead09b2fbbed1c26095cf8d839681e1492182fa94ef2e83e39efaeb509df64`。它们描述失败检查时的输入，**不是交回产品实现的哈希**。
- 改过的旧断言：无；没有原值/新值变更。
- 负控：未运行，无有效失败标记或恢复绿测可报；不得把 clippy 失败当成负控。
- 真实冒烟：未运行；没有检查任何真实隔离区，没有移动、复原或删除真实文件，也没有读取真实文件内容。
- 测试夹具：未建立、未清理；只有检查器在本树 `.local` 下产生依赖副本、构建、日志与快照。未使用 `%TEMP%` 跨盘夹具例外。
- 原生窗口、选择框、浏览器：均为 0。
- 使用了一个只读辅助审阅代理，未获实现/测试/提交权限；它只检查 M4 契约与源代码，没有修改文件或运行测试。正式实现工作未委派给内部代理。
- 停止时没有本任务在运行的检查、测试或后台进程。Windows 产品行为、生产竞态、macOS、真实应用清理流程及 M4→M7/M5 接线均未验证。

等待总控补充上述固定盘发现契约后，才能继续 M4；本次不授权继续 M5。

## 补单 01（2026-11-05）：真实冒烟入口已按补单编写，移入改名仍受阻

实际模型：GPT-6（Codex；未获更细的运行时型号标识）。续做工作树和分支不变，起点 `07dc620950f7e1b399fe4a1e6358d6dfdcbce4a4`，起点干净。按补单依次重读原票、规则、SPEC/旧契约、补单与原回执；没有重跑已通过的 baseline。

**未完成实现，不可合入或发布。** 草稿及新增测试保存在 WIP 提交 `9a689f86408eea0cc081b56abddc47c8f5285e98`，提交信息明确写了 `wip` 与错误 87；它不是通过重门的实现提交。本次只新增提交，原受阻提交和证据没有改写。

### 本轮阻塞及最小补充需求

补单消除了旧的固定盘枚举要求。本轮新建的 `examples/real_smoke.rs` 只取 `SystemDrive` 与 `env!("CARGO_MANIFEST_DIR")` 的盘符，去重后只调用 `list_quarantines`，准备输出 `checked`、三个状态计数和编号总数；已经在 Cargo.toml 登记，未新增依赖或系统函数。因下述执行器测试未通过，没有运行真实冒烟，也没有任何 final。

移入隔离区的目录、文件和复原测试的准备项，在 `rename_at` 内实际调用 `SetFileInformationByHandle`（类 3）时均返回 0，紧接着取到 Windows 错误 **87（参数无效）**。最后一轮日志包含：

```text
CLEAN_M35_RENAME_NATIVE error=87 size=34 units=5
CLEAN_M35_RENAME_NATIVE error=87 size=32 units=4
```

报告对应 `Failed / Other / error_code=87`，`moved_bytes="0"`，源对象没有移走。诊断仅输出错误码、缓冲区字节数与名字 UTF-16 长度，不输出路径或名字。

已检查/修订的调用细节：x64 缓冲区中替换标志偏移 0 且为 0、父句柄偏移 8、名称字节数偏移 16、UTF-16 名称偏移 20；缓冲区由 8 字节对齐的 `Vec<u64>` 提供；后来扩大为 `24 + 名称字节数` 并保留零终结。源句柄含 `DELETE | FILE_READ_ATTRIBUTES | SYNCHRONIZE`，不跟随重解析点，共享读写删；目标父句柄链保留，后续又加入 `FILE_TRAVERSE`。这些修订没有消除错误 87。

Microsoft 当前 [FILE_RENAME_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_rename_info) 文档描述了相对名配合目录句柄的用法；[SetFileInformationByHandle](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfileinformationbyhandle) 文档列出了类 3。只读辅助审阅也没有找到确定的布局错误。**本回执不据此断言 Windows 不支持该接口，也不把尚未定位的问题冒称为已证明的契约不可能。** 事实是：本机按当前获准形式重复失败，无法交付通过重门的移动/复原实现。

规则第 4 节要求连续失败时停止，且不能用契约外 API 自行变通；因此停止本票，不开始 M5。需要总控提供或核实一份在当前机器可行的“源句柄 + 目的父句柄 + 单段名”的类 3 调用基准，确认当前调用缺少什么；若最终需要不同原语或信息类，则先补充契约、FFI 白名单和检查配置。没有尝试 `NtSetInformationFile`、类 22、`MoveFile*`、按路径改名或跨盘复制来绕过限制。

### SPEC 第 1～8 节逐条状态

| 节 | 草稿改动与实际验证 |
|---|---|
| 1 原则 | `src` 无路径式文件 API；仍为九个获准 FFI；没有扩展既有枚举。原结构只新增 `PlanItem.unlocked_paths`，VolumeReport 只加 Eq/PartialEq。依赖和 Cargo.lock 未变。首次本轮 check 的政策/fmt/clippy 通过；最新草稿只证明测试编译成功，未补跑 clippy。 |
| 2 解锁对 | 结构形状、0～4 项、逐字匹配保护路径、严格包含验证；文本重叠按单项豁免。祖先保护身份按“未逐字解锁的保护路径”单独保留，条目内部仍用完整保护身份集合；硬守卫不随解锁。新增 `quarantine_unlock_pair` 四轮均通过，含未解锁保护别名与兄弟项拒绝。没有把同身份的其它保护别名一起删掉。 |
| 3 移入 | 草稿有根/编号校验、同卷核对、仅 FILE_CREATE 建目录、句柄链、日志、身份复核与错误报告。初始目录和文件移入在改名处失败，后面的年龄/guard/冲突/停止/跨盘断言未执行到，不能称覆盖完成。没有成功移入的证据。 |
| 4 复原 | 草稿有请求校验、身份复核、同盘旁边还原、无覆盖改名、上级重解析点拒绝和空骨架处理。该测试的准备移入失败，复原断言均未执行到；未验证成功复原、修改时间不变或骨架清理。 |
| 5 purge | 显式栈后序，子项按句柄共享读写删，不跟随联接；普通文件按同一句柄的大小/链接数计释放；保留未知重解析点并报告遗留，最多 200 条、按相对名排序。`quarantine_purge_contract` 四轮通过：怪名/只读/深路径、外部联接目标字节完好、同样怪名经 execute 删净、占用文件和子目录报告 in_use、关闭后重试、非法父目录/编号联接拒绝、预先停止。256 项回调及截断尚未实测。 |
| 6 查看/序列化 | 新类型均导出并带规定派生/serde 属性；list/inspect 只读，新增 JSON helper。`quarantine_inspect_and_list` 四轮通过：根 absent/present/unavailable、排序、创建时间、stray、怪名/长路径/只读提示、逻辑字节/分配字节和不跟随联接。非名称代理重解析点、拒绝访问、200 条截断与非 Windows 桩未完成专项验证。 |
| 7 成因 | 已对照规范；没有把日志或文档描述算作产品完成。 |
| 8 测试 | 同一个测试文件精确 11 测，原六测断言没有修改；每轮均为 9 通过、2 失败、0 ignored/filtered。失败为 move 和 restore。所有删除仅在本次新建的 `.local` 随机夹具内；没有使用真实盘隔离区或真实数据。 |

尚未完成的已知草稿问题也保留供后续处理：`purge` 对编号目录本身被占用时的入口错误仍需改为根目录 `in_use` 遗留；最后一个编号目录删除后的进度回调若置 stop，空隔离根清理还需再次检查 stop。当前测试只验证占用子目录和预先 stop，不能覆盖这两点。发现改名阻塞后没有继续修这些分支。

### 命令、结果和证据

命令均在 M4 工作树，通过原票的绝对检查入口执行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode lock
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode test
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode archive
```

| 模式/时间（UTC） | 结果/回执前缀 |
|---|---|
| lock 09:25:27 | passed；`2026-11-05T09-25-27.126Z-12692` |
| check 09:25:30 | passed；`2026-11-05T09-25-30.548Z-16764`；修复上一轮的 unused imports，政策、fmt、clippy 通过。 |
| test 09:25:51 | failed，9/11；`2026-11-05T09-25-51.491Z-23356`；初始移入失败。 |
| test 09:27:27 | failed，9/11；`2026-11-05T09-27-27.798Z-18664`；只给失败断言增加完整报告，定位 error_code 87。 |
| test 09:30:05 | failed，9/11；`2026-11-05T09-30-05.232Z-31008`；扩大/终结改名缓冲区后仍 87。 |
| test 09:33:42 | failed，9/11；`2026-11-05T09-33-42.975Z-5624`；加目标目录遍历权限及无路径诊断，确认 87 来自 rename_at 的类 3 调用。 |
| archive 09:36:57 | passed；`2026-11-05T09-36-57.903Z-7044`；索引与本轮先前回执/日志/源码快照已归档，archive 自身回执保留于 `.local/checks/WATER-W10-M4/`。 |

此外三次通过已定位的 Rust 1.95 绝对路径运行 `cargo.exe fmt --manifest-path packages/junk-clean/Cargo.toml`，均成功；它们只格式化本票源码/测试，没有启动产品或改变依赖。所有实际 Cargo 编译/测试均由检查器配置 offline、jobs=1、私有 home/target/temp，没有下载或扩大超时。没有用单测过滤、忽略或拆分改变数量。

修订稿在测试前增加的诊断属于新断言的失败消息；原六测与旧标记不变。负控 nc1/nc2/nc3 均未运行，无恢复绿测或负控哈希；不能拿这几次普通开发失败当负控。三个 final、真实冒烟、整机检查均未运行。

已运行测试没有超时；回执如实保留了定位 87 的各轮失败，而不是把它们算作两次环境超时重试。后续不再继续尝试或运行测试。

最后一轮的 `productionHash` 为 `2b662fa2434c68246fe4b0646e8ce6d54c79bacc988364c6d22b67b655737b87`，`testHash` 为 `2dc4bf97acc83e6af1b0fc12ac2f912813c8d42db2c28b30414986fcf646bb26`；这些是失败输入的哈希，不是通过门的证明。归档目前含 128 个索引条目、1,877,819 字节，包含上轮原有条目。

### 范围与交回

- 原固定盘发现缺口以补单为准已经解除，文首原受阻段落仅为历史；当前阻塞是上述合成测试中的改名失败。
- WIP 代码和回执/归档分开提交；代码不是验收通过产物。原有证据保留，新增证据均来自 `archive`，索引重新核对原字节 SHA-256。
- 所有夹具均在本树 `.local/w10-m4-<测试标签>-<pid>-<随机数>/` 或旧测试原有的本树 `.local/w2-d-fixtures/` 本次新建目录内，Drop 校验绝对父目录、前缀和祖先非重解析点后只删自己的目录；本轮测试结束，前者残留目录计数为 0。跨盘测试分支未执行到，没有在系统 TEMP 或任何盘根新建隔离根。
- 为核对原生参数，读取了上述 Microsoft 官方公开 API 文档；Web 搜索工具不可用后使用 PowerShell 的只读 HTTPS 请求。没有运行外部代码、安装依赖或读取真实用户文件内容。
- 有一个只读辅助审阅代理，仅审契约/源码，没有实现、测试、提交权限；正式代码仍由本执行者独自修改。
- 没有修改主线、契约、检查器、台账、其它包/工作树或 git 配置/远端；没有 push、merge、rebase、reset、amend。
- 未开始 M5；交回时没有本任务测试或后台进程。真实用户清理、生产竞态、其它服务接线与 macOS 均未验证。
