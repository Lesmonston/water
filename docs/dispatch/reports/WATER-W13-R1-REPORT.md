WATER-W13-R1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w13-r1/docs/dispatch/reports/WATER-W13-R1-REPORT.md

## 1. 交付状态与实现

- 日期：2026-11-08，Windows x64；日志使用 UTC。
- 实际执行模型：Codex，GPT-6；运行时没有提供更细的型号标识。没有调用子代理或其它模型。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w13-r1`。
- 分支：`worker/water-w13-r1`。
- 首次 HEAD / 基线：`6b7703e84e8903d03a6c2ef0c0550187034717ac`，与 `water-w13-r1-base-20261108` 一致，开工时干净。
- 实现提交：`5e8332871a045e51597121406860eb872b8c00f4`。
- 补单 01 续做起点及本次三个 final 的受测 HEAD：`504bd856890e599b1dfa66260b64320dec79d53f`，续做开工时干净；产品文件与实现提交 `5e833287` 完全一致。
- 已按补单 01 重采两条负控及各自恢复测试，三个 final 和 archive 全部通过，原受阻已解除。本次只更新回执及归档证据；这是执行者交回完成，不代表总控验收通过。

## 2. 原受阻与修正结果

原受阻属清单遗漏：R1 的 `negativeControlPaths` 允许改规则 JSON，但缺少 `productionFiles`，规则数据未进入生产快照，导致原红、绿的 `productionHash` 相同，两次 `test --final` 报 `Missing valid negative control nc1`。总控已按补单 01 将 `Cargo.toml`、`Cargo.lock`、`README.md` 与 `rules/windows.json` 加入 R1 的 `productionFiles`；本执行者未改清单、检查器、契约或实现。本次重采证明已有规则 JSON 快照，三个 final 均通过，详见第 8 节。旧红、绿及两次失败 final 的归档原字节均保留；失败回执前缀为 `2026-11-07T16-38-31.966Z-20284`、`2026-11-07T16-39-00.192Z-31712`，原受阻报告可在提交 `504bd856` 追溯。

## 3. 按工单逐项对照

| 项目 | 实际结果 |
|---|---|
| 1.1 观察依据 | 119 条 `local_observation.ref` 全部改写，均以日期和“维护者本机只读检查”或“维护者本机清理”开头，无路径分隔符、私有文档引用、本机项目名或内部编号。 |
| 原事实 | 原有体量、个数、版本号和事件日期保留。路径中的目录改为文字；编号改为对应规则的现象，不扩展安全结论。两个“10-29 场景复现”的事件日用 `2026-10-29`，其 `checked_on` 仍为 `2026-11-01`。 |
| 来源与规则不变量 | 与基线逐层比较，除顶层 `data_version`、119 条本机观察的 `ref` 外，其余字段完全相同。118 条规则的 ID、顺序、定位、等级、在用策略和文案均未变；37 条其它来源及全部 `checked_on` 未变。 |
| 数据版本 | 改为 `2026-11-08.1`。 |
| 1.2 常量 | 顶部新增 `EXPECTED_RULE_COUNT = 118`、`EXPECTED_DATA_VERSION = "2026-11-08.1"`。原 3 处条数断言、6 处当前版本断言分别引用常量。 |
| 1.3 包说明 | README 的阶段表述改成功能说明，版本同步。整个包的文本检索未再发现工单号、私有文档路径、原本机项目名或原角色称呼。 |
| 2 测试 | 在既有 `m35_seeds` 中遍历每条规则的每个本机观察，检查 `YYYY-MM-DD` 和日期后的空格、以及无两种路径分隔符；两个断言均带 `RULES_W13_SOURCES`。仍为原名的 4 个测试，无 ignore、过滤、拆分或删测。 |
| 3 负控 | 两条均只改规则 JSON 中第一条本机观察的一处 `ref`，产品入口 `RuleSet::embedded()` 确实消费该数据；详见第 6 节。 |
| 4 门 | 按指定入口执行；补单 01 的三个 final 均绑定干净 HEAD `504bd856`，负控证明审计及产品测试全部通过，产品实现仍为 `5e833287`。 |
| 5 边界 | 产品改动仅以下三个文件；没有修改 `src/`、依赖、锁文件、系统调用、台账或其它包。无原生窗口、选择框、浏览器或删除操作。 |

产品文件：

1. `packages/junk-rules/rules/windows.json`
2. `packages/junk-rules/tests/rules_v1.rs`
3. `packages/junk-rules/README.md`

另外提交本回执和 archive 生成的 `docs/acceptance/wave13/r1/`。未增加其它产品文件。

## 4. 旧断言及测试数据迁移

下面行号均按基线；保留原来的精确比较、覆盖范围和失败标记，没有降为“存在”或“大于零”。含私有引用的原值只描述其类别，不重新披露项目名或路径；原字节可在基线对应行复核。

| 原处 | 原值 → 新值 | 原因 |
|---|---|---|
| 988，`RULES_W12_NEW` | `118` → `EXPECTED_RULE_COUNT`（118） | 条数只维护一处，精确性不变。 |
| 1105，`RULES_M35_SEEDS` | `118` → `EXPECTED_RULE_COUNT`（118） | 同上。 |
| 2485，seed set | `118` → `EXPECTED_RULE_COUNT`（118） | 同上。 |
| 1063，`RULES_M35_VERSION` | `"2026-11-07.3"` → `EXPECTED_DATA_VERSION`（`2026-11-08.1`） | 断言当前规则数据版本，版本只维护一处。 |
| 2771，`RULES_M35_VERSION` | `"2026-11-07.3"` → `EXPECTED_DATA_VERSION` | 计划携带新数据版本。 |
| 2775，`RULES_M3_WORDING` | `"2026-11-07.3"` → `EXPECTED_DATA_VERSION` | 同上。 |
| 2779，`RULES_M3C_VERSION` | `"2026-11-07.3"` → `EXPECTED_DATA_VERSION` | 同上。 |
| 3309，`RULES_M3D_VERSION` | `"2026-11-07.3"` → `EXPECTED_DATA_VERSION` | 当前内嵌数据版本更新。 |
| 3347，`RULES_M3C_VERSION` | `"2026-11-07.3"` → `EXPECTED_DATA_VERSION` | 同上。 |
| 1031，八条新增规则的来源精确比较 | `2026-11-07 总控 C 盘只读调查` → `2026-11-07 维护者本机只读检查（C 盘）` | 改公开措辞；精确比较仍覆盖八条规则。 |
| 1495，sample_rule 来源夹具 | `2026-10-26 总控本机只读摸底` → `2026-10-26 维护者本机只读检查` | 测试数据同样采用公开措辞。 |
| 1523，git_worktree_json 来源夹具 | 旧 F 盘清理记录私有引用，含“130 棵已合并的旧工作树共 56 GB” → `2026-10-29 维护者本机清理时确认：130 棵已合并的旧工作树共 56 GB。` | 与内嵌规则的完整对象比较继续一致，保留日期和数字。 |
| 1623，bundled-node-modules 完整对象期望 | 旧 10-29 场景复现私有引用，含本机程序目录名 → `2026-10-29 维护者本机只读检查：npm 全局目录、Electron 解包目录和桌面程序自带的依赖被认成项目依赖。` | 只把私有引用与项目名改成可公开的事实。 |
| 1634，browser-data-dirs 完整对象期望 | 旧 10-29 场景复现私有引用 → `2026-10-29 维护者本机只读检查：内嵌浏览器的数据目录被认成测试用浏览器配置。` | 同上，完整对象比较保留。 |
| 3506，electron-gpu-caches 来源精确比较 | `2026-10-28 总控本机只读体检：…` → `2026-10-28 维护者本机只读检查：应用的显卡着色器缓存目录共 41 个，约 45 MB，其中可清的 34 个。` | 改称呼；数量与完整比较保留。 |
| 3510，kimi-code-sessions 来源精确比较 | `2026-10-28 总控本机只读体检：…` → `2026-10-28 维护者本机只读检查：.kimi-code 的 sessions 与 file-history 共约 351 MB，受保护。` | 改称呼，保留原事实。 |
| 3514，workbuddy-memory-sessions 来源精确比较 | `2026-10-28 总控本机只读核查：…` → `2026-10-28 维护者本机只读检查：.workbuddy 与 .workbuddy-ai 内有 memory、sessions、plans、plugins 等目录，其中 memory 与 sessions 受保护。` | 同上。 |
| 3518，other-agent-sessions 来源精确比较 | `2026-10-28 总控本机只读核查：…` → `2026-10-28 维护者本机只读检查：.dsh 共约 3 MB，内有 profiles、sessions、storages 与 settings.yaml，其中 sessions 受保护。` | 同上。 |
| 3658，两个规则的来源前缀 | `2026-10-28 总控本机只读体检：` → `2026-10-28 维护者本机只读检查：` | 两种旧称呼统一；来源类型、日期及前缀比较均保留。 |
| 3659，其余规则的来源前缀 | `2026-10-28 总控本机只读核查：` → `2026-10-28 维护者本机只读检查：` | 同上，合并成同一个前缀变量，不减少覆盖的规则。 |

历史合成夹具的独立版本值（如 `2026-10-26.1`）仍用于严格格式拒收和旧计划字节回归，不是当前内嵌数据版本断言，因此保留。

## 5. 主单首次执行的检查命令与结果（历史）

均从指定工作树根执行。检查命令统一为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W13-R1 --mode <下表模式> [--final]
```

下表列出每次实际执行的完整模式参数。回执都在 `docs/acceptance/wave13/r1/receipts/`，文件名共用下表时间与 PID 前缀，再加 `-<模式>-result.json`；其 JSON 列出各个子命令、退出码和 `.log` 文件名。final 不改变文件名中的模式。

| 完整模式参数 | 日志前缀（UTC） | 检查器退出码 | 结果 |
|---|---|---:|---|
| `--mode baseline` | `2026-11-07T16-29-49.725Z-9848` | 0 | 输入、基线、分支、离线环境通过。 |
| `--mode lock` | `2026-11-07T16-33-10.290Z-30760` | 0 | 锁与依赖策略通过，无锁文件变化。 |
| `--mode check` | `2026-11-07T16-33-33.258Z-34160` | 0 | fmt、clippy 全部通过。 |
| `--mode test` | `2026-11-07T16-34-29.804Z-11176` | 0 | 4 passed，0 failed，0 ignored，0 filtered out；0.82 秒。 |
| `--mode real` | `2026-11-07T16-35-15.084Z-6256` | 0 | 只读存在性冒烟通过。 |
| `--mode red-nc1` | `2026-11-07T16-36-20.765Z-38256` | 0 | 目标断言红，cargo 101，3 绿 1 红；1.64 秒。 |
| `--mode test` | `2026-11-07T16-36-51.100Z-7408` | 0 | nc1 精确恢复后 4 绿；1.03 秒。 |
| `--mode red-nc2` | `2026-11-07T16-37-10.179Z-16952` | 0 | 目标断言红，cargo 101，3 绿 1 红；1.12 秒。 |
| `--mode test` | `2026-11-07T16-37-28.102Z-7560` | 0 | nc2 精确恢复后 4 绿；1.25 秒。 |
| `--mode check --final` | `2026-11-07T16-37-50.343Z-20312` | 0 | 干净实现提交上的 fmt、clippy 通过。 |
| `--mode test --final` | `2026-11-07T16-38-31.966Z-20284` | 1 | 检查器 proofAudit 失败，未运行产品测试。 |
| `--mode test --final` | `2026-11-07T16-39-00.192Z-31712` | 1 | 原样重跑，仍在同处失败，未运行产品测试。 |
| `--mode real --final` | `2026-11-07T16-39-09.052Z-34516` | 0 | 干净实现提交上的只读冒烟通过。 |
| `--mode archive` | `2026-11-07T16-40-45.374Z-8752` | 0 | 归档 167 个来源文件，3,727,879 字节；逐项复算大小与 SHA-256 均一致。 |

`ARCHIVE.json` 和 `.gitattributes` 是归档入口另写的文件，不计入上述 167 个来源文件。archive 自己本次运行的回执留在 `.local/checks/WATER-W13-R1/`。归档还保留了开工前已有的 `2026-11-07T16-14-16.272Z-24980-baseline-result.json` 及其日志；它不是本执行者运行的检查，不据此声称工作已验证。

另外做了限定范围的结构比对与编码检查：3 个计数常量引用、6 个版本常量引用、测试数仍为 4；移除本机观察 ref 与 data_version 后，规则数据与基线逐层相同；`git diff --check` 通过。格式化使用已安装的 `rustup run 1.95.0 cargo fmt --manifest-path packages/junk-rules/Cargo.toml`。未下载或手工复制依赖。

## 6. 负控与原字节恢复

两条均选第一条规则 `codex-marketplace-staging` 的第一个来源；只改一个 `ref`，测试文件已提交且没有未提交变化。

| 负控 | 实际改动 | 观察到的产品失败 |
|---|---|---|
| nc1 | `2026-10-26 维护者本机只读检查` → `维护者本机只读检查` | `RULES_W13_SOURCES: codex-marketplace-staging observation starts with YYYY-MM-DD` |
| nc2 | 在原 ref 后追加“：目录”、一个反斜杠和“缓存”，JSON 仍合法 | `RULES_W13_SOURCES: codex-marketplace-staging observation has no path separators` |

没有编译错误、超时或测试开关。两条分别在红门完成后执行 `git -c core.hooksPath=NUL checkout -- packages/junk-rules/rules/windows.json`，立即核对原哈希并运行恢复 test。

规则 JSON 的 SHA-256：

| 状态 | SHA-256 |
|---|---|
| 实现原字节、nc1 恢复、nc2 恢复 | `e1966f126de76acf23fb46977bd9576284b1b0f234c9fc48e45ad5c144db4236` |
| nc1 变异 | `7419fe973b2ddcf4cdcfb428f27a5e2f3a5413bb0aba5d656ed394afcee8568e` |
| nc2 变异 | `4b84e50df7fb9980ad0943e2c344125f142a8e52964f1e76dd2570c8921fc459` |

这些数据哈希与检查器 `productionHash` 含义不同。主单首次执行时未采集变异 JSON 快照，不能作为新清单下的证明；该历史缺口已在补单 01 重采时补齐，两条变异及恢复的 JSON 快照均已归档，final 采信情况见第 8 节。

## 7. 真实冒烟、选择与未验证项

常规 real 和 real final 的结果相同：

```json
{"base_present_count":95,"literal_prefix_present_count":78,"rule_count":118,"system_drive_exists":true}
```

仅查已知目录与字面路径前缀是否存在，不枚举目录、不读内容、不清理真实数据，输出只有计数与布尔值。没有执行完整设备扫描、应用清理或 macOS 验证。

自行处理的事项与限制：

- 采用保守改动：现有测试名称、断言标记、规则字段和虚构路径夹具保留；没有另建测试函数或修改接口。对只有编号的依据，用规则已有的现象说明补全，不把本次编辑说成新做了真实清理。
- 同一事实中的通用目录名允许保留，路径则改用文字；保留原有数值和“后续核验未单列”等证据限制，没有扩写成经过独立复验的事实。
- 初次 PowerShell 文件读取默认编码不正确，改用显式 UTF-8；`node -e` 的内嵌引号被 Windows PowerShell 去掉后，改用 UTF-8 标准输入脚本。均为等价工具处理，未改配置、依赖或白名单。
- 没有计时失败或计时重跑；test final 的一次原样重跑是检查器非计时故障确认。
- 第二次 test final 与随后 real final 的检查器进程有约 4.6 秒重叠：前者在 metadata 后、进入 cargo test 前就因 proofAudit 退出；没有并行运行两个产品测试或重型构建。随后均已退出，不再启动测试。
- 所有 Cargo 构建与测试由指定检查器设为离线、单线程及本树私有 target。原生窗口 0、选择框 0、浏览器 0。未创建物理清理夹具，未删除任何数据。
- 交回前只读核对工具进程及本树归属，运行中的本单工具进程为 0；没有终止其它任务的进程，未输出进程命令行。
- 提交使用进程内 `GPT-6 <gpt-6@localhost>` 身份；不改 git 配置、远端或历史，没有 push、merge、rebase、reset、amend 或提交他人文件。
- 首次执行曾因清单遗漏交受阻回执；补单 01 已完成重采和三个 final，当前交回状态为任务已完成。

## 8. 补单 01

按 `WATER-W13-R1-ADDENDUM-01-20261108.md` 从干净的 `504bd856890e599b1dfa66260b64320dec79d53f` 续做，没有修改产品文件。未重复首次 baseline、lock 或其它检查；只按补单顺序执行以下 8 个命令，检查入口及工作目录同第 5 节。

### 8.1 命令与结果

| 完整模式参数 | 日志前缀（UTC） | 检查器退出码 | 结果 |
|---|---|---:|---|
| `--mode red-nc1` | `2026-11-07T17-41-11.993Z-18208` | 0 | cargo 101；3 绿 1 红，唯一失败为 `rules_seed_coverage`，标记 `RULES_W13_SOURCES`；1.19 秒。 |
| `--mode test` | `2026-11-07T17-41-27.043Z-8852` | 0 | nc1 恢复原字节后立即测试，4 绿；1.18 秒。 |
| `--mode red-nc2` | `2026-11-07T17-41-57.424Z-34692` | 0 | cargo 101；3 绿 1 红，唯一失败为 `rules_seed_coverage`，标记 `RULES_W13_SOURCES`；0.92 秒。 |
| `--mode test` | `2026-11-07T17-42-06.263Z-38892` | 0 | nc2 恢复原字节后立即测试，4 绿；1.54 秒。 |
| `--mode check --final` | `2026-11-07T17-42-35.963Z-2004` | 0 | fmt、clippy 通过。 |
| `--mode test --final` | `2026-11-07T17-42-42.254Z-28092` | 0 | proofAudit 通过；4 passed，0 failed，0 ignored，0 measured，0 filtered out；1.92 秒。 |
| `--mode real --final` | `2026-11-07T17-42-49.688Z-35640` | 0 | 只读存在性冒烟通过，结果同第 7 节。 |
| `--mode archive` | `2026-11-07T17-43-19.269Z-35644` | 0 | 累计 295 个来源文件、7,571,506 字节，本次新增 128 个来源文件。 |

每次红门后第一步均为恢复 `rules/windows.json`，核对 SHA-256 为 `e1966f126de76acf23fb46977bd9576284b1b0f234c9fc48e45ad5c144db4236`，然后立即运行 test。两条红之间只有该恢复绿，没有插入其它红门。三个 final 串行运行，前后工作树均干净，所有受测 HEAD 都是 `504bd856`。没有超时或其它计时失败，没有重跑。

### 8.2 新快照与生产哈希

四份红、绿回执的 `sourceState.files` 均包含 `packages/junk-rules/rules/windows.json`，其快照为各自前缀后的 `-<模式>-source-3.txt`，已归档并逐项复算哈希。

| 回执 | `productionHash` |
|---|---|
| nc1 红 | `2a33a0bb46f94c7880823eeee04c0a4c538a37d43e4093b881427e4544f38fd5` |
| nc1 恢复绿 | `da7221563a147668255d6e2d33e165c2d3f446458df61eb806facacb31bfee53` |
| nc2 红 | `31c7e3f0edd3b1dd38dfb84a7790aa0baafc6d880de1fe96b28a6ce248c6da99` |
| nc2 恢复绿 | `da7221563a147668255d6e2d33e165c2d3f446458df61eb806facacb31bfee53` |

两组的红、绿生产哈希各自不同，两个恢复绿与三个 final 的生产哈希一致；四份回执的 `testHash` 均为 `163719a52eeda428b6c40755f1f99835f324980687dddc69960854da5f3b81f3`，测试文件没有变化。规则 JSON 快照的哈希分别为第 6 节列出的 nc1 变异值、nc2 变异值和恢复原值，均逐字节一致。

### 8.3 final 实际采信的证明

`2026-11-07T17-42-42.254Z-28092-test-result.json` 的 `proofAudit` 原值如下；均为本次重采回执：

```json
[
  {
    "label": "nc1",
    "red": "2026-11-07T17-41-11.993Z-18208-red-nc1-result.json",
    "restored": "2026-11-07T17-41-27.043Z-8852-test-result.json"
  },
  {
    "label": "nc2",
    "red": "2026-11-07T17-41-57.424Z-34692-red-nc2-result.json",
    "restored": "2026-11-07T17-42-06.263Z-38892-test-result.json"
  }
]
```

### 8.4 证据保留与交回边界

原归档的 167 个来源文件及索引条目逐项与 `504bd856` 比对，全部保留、原字节不变，包括旧红、绿及两次失败 final。当前 295 个来源文件全部按 `ARCHIVE.json` 复算大小与 SHA-256 通过。本次 128 个新增来源文件包含此前留在 `.local` 的首次 archive 回执；本次 archive 自己的回执仍在 `.local/checks/WATER-W13-R1/`，没有手工添加或修改证据。索引与 `.gitattributes` 不计入来源文件数。

本次只提交回执、更新后的归档索引和 archive 生成的新证据；产品文件与 `5e833287` 保持一致，旧证据不删不改。沿用 GPT-6 进程内提交身份，不改配置、远端、历史；不 merge、rebase 或 push。构建与测试均离线、单线程、使用本树私有 target；原生窗口 0、选择框 0、浏览器 0，没有删除操作。真实读取仅为已知目录与字面前缀的存在性检查；macOS 与完整设备扫描仍未验证。补单的两条负控和三个 final 已全部满足，没有剩余受阻项；交回后不继续测试。
