WATER-W11-N3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n3/docs/dispatch/reports/WATER-W11-N3-REPORT.md

# 执行回执

- 日期：2026-11-07（JST）。实际模型：Codex / GPT-6；未调用子代理或外部执行者。
- 工作树：`F:/new/smaltalk/water/.worktrees/w11-n3`，分支 `worker/water-w11-n3`。
- 首次 HEAD 与标签 `water-w11-n3-base-20261107`：`ccc584b3894e28d1f6bb8f86748d03c143a38e5b`；开工时干净。
- 实现提交：`0743dab9dfa2d571235c8fe4fb63ea24162932c0`。三个 final 均在该提交、干净工作树上顺序通过；后续只有本回执和检查器归档证据的独立提交。
- 正式票及两份执行规则、RENAME-FLICK、CLEAN-M35、CLEAN、CLEAN-HARDENING、M10 原单和指定代码均已阅读；本次 baseline 在任何实现修改之前运行。
- 交回表示提交总控验收，不自行标记 VERIFIED。第 3 节的五处目标分支没有获得新的确定性产品入口覆盖，逐项如实列明。

## 1. 工单 1.1：改名与兼容

搜索 `packages/junk-clean/src/` 中的隔离名及 Water/Flick 字符串，生产代码中只有 `quarantine.rs` 的三处行为判断需要改动：

| 位置（实现提交行号） | 改动 |
|---|---|
| `src/quarantine.rs:17`，`validate_root` | 最后一段接受 `.flick-quarantine` 和 `.water-quarantine`，均用 ASCII 大小写无关比较。`validate_dir` 继续复用此校验，因此 restore、purge、inspect 和 list 两个名字都可用。 |
| `src/quarantine.rs:109` | 未提供 `base` 时，默认根改为条目所在卷的 `.flick-quarantine`。 |
| `src/quarantine.rs:111` | 条目路径的任意一段命中新旧两个名字，均按原行为记为 `Guarded`。包含目标隔离根的原有检查保留。 |

原生模块、`move_checks.rs` 等其它 `src/` 文件中没有需要迁移的旧隔离名判断。日志版本、JSON 字段、crate 名和内部 `water.*` 协议串不改；本包没有需要更换的用户可见 Water 产品文案。`native_windows.rs` 未改动。

`examples/real_smoke.rs` 改为查询每个固定盘的两个隔离名。固定盘清单由不加载 profile、无窗口的 PowerShell `System.IO.DriveInfo` 元数据查询取得；子进程只输出盘根供 example 内部使用，最终 JSON 只有固定盘计数、隔离名常量、匿名卷序号、状态和批次数，不输出盘符、条目名字或实际路径。未新增生产 FFI、依赖或公开接口。相较于增加新的原生盘枚举函数，选用 example 内的只读元数据查询来保持现有系统函数清单。

README 已写明新默认名、旧名兼容、两种名字的源路径守卫、真实冒烟范围及新的检查入口。

新增断言分布在原有四个 quarantine 测试中：新根和混合大小写根能移入、还原、永久删除、查看、列出；核对身份、字节、目的地、空骨架回收及 purge 日志；路径包含新名时跳过且原字节保留；其它根名在五类入口仍拒绝。新断言的失败消息均带 `CLEAN_W11_RENAME`。旧名仍由原有测试完整运行。

默认盘根的真实移入没有执行测试：按工单，测试始终显式给本树 `.local/` 下的 `base`；默认根字符串的修改经源码审阅，不能将此项写成盘根写操作实测。

## 2. 工单 1.2：重叠计划拒绝

新增私有 `CleanPlan::validate_disjoint_items`（`src/model.rs:168`）。`execute`（`src/lib.rs:176`）和 Windows `quarantine`（`src/quarantine.rs:65`）都在原有 `validate_shape` 之后立即调用它，先于保护身份解析、卷空间查询、目录创建、条目操作和日志。

只比较当前计划各项的 `path`，以 ASCII 大小写无关的完整路径段为边界。为路径附加结尾分隔符后排序，相邻前缀命中即 `InvalidPlan`，相等也拒绝；复杂度 O(n log n)。`cache-sibling` 不会被当作 `cache` 的后代，也不会在排序时遮住 `cache` 与 `cache\\data` 的包含关系。没有按 root、身份或其它计划作额外比较。

选择只在执行入口增加拒绝，保留 `from_json` 的原有行为，避免扩大本票要求之外的解析契约。所有公开类型、字段、枚举成员和函数签名未变。

`clean_plan_contract` 与 `quarantine_move_contract` 分别跑 8 种组合：相同路径/父子路径 × 原大小写/混合大小写 × 正序/逆序；每份还夹入一个不重叠的连字符兄弟项，覆盖字符串排序遮挡的问题。用公开字段构造计划，确保检查确实发生在执行入口。两个入口都断言精确的 `InvalidPlan`、空日志、零 observer 回调、原文件及兄弟文件逐字节不变、隔离根未创建。另有可执行的不重叠相邻名字正例。标记为 `CLEAN_W11_NESTED`。

对正常服务输入的静态核对（只读，均为本票基线代码）：

- `packages/junk-scan/src/scan.rs:811` 的 `merge_hits` 将同路径 target 合并为一个保守结果。
- `packages/junk-scan/src/scan/streaming.rs:948` 起的 discovery 处理，在已覆盖同路径或已有子项时不再发出包含它们的 discovery 项；marker 命中后的搜索抑制也保留。
- `packages/junk-scan/src/scan.rs:1551` 的聚簇处理移除被聚簇成员认领的原命中，再输出成员，避免同时选择聚簇与其内部项。
- `packages/water-service/src/clean.rs:112` 起只将扫描结果中的 eligible、带身份的原路径放入计划，不在本票增添父目录项。

因此，按票面规定的“服务提供互不包含项”输入不变量，新检查放行正常计划；本包的不重叠正例也已通过。本次只静态核读其它包，未运行扫描/服务链路，不能将任意真实 scope 或所有规则组合的非重叠性写成端到端实测结论。

## 3. 工单 1.3：逐处覆盖边界

以下行号按票面基线 `ccc584b3`。这些目标没有可靠的现有回调可以确定性插入竞态；没有为测试加入产品开关、入口或系统函数，也没有用概率线程竞速冒充目标覆盖。

| 目标 | 本次是否击中该产品检查 | 调用链依据与未到达原因 |
|---|---|---|
| c12：`native_windows.rs:893` 改名前最终身份复核 | 未新增覆盖 | `quarantine()` 外层 preflight 后，native 在 intent flush 后再次执行完整 preflight；其内部 `ItemGuard::in_use` 回调之后还有 `check_chain` 和 snapshot 的身份检查。在 journal/guard 回调换源，会被这些前置检查拦住，走不到最终 `source_matches` 的不等分支。最终 snapshot 与源句柄打开/身份判断之间没有回调。现有 intent 换源用例与单测小函数断言保留，但不算 c12 产品调用处覆盖。 |
| c13：`quarantine.rs:119` 第二个隔离根 | 未覆盖 | 一次调用只有一个 `QuarantineTarget.base`；给 Some 时两项根相同。不给 base 时不同根来自不同盘符，但第一项会尝试在盘根创建默认隔离根。工单禁止测试在任何盘根建根、禁止 subst，故不走该路径。保留原有 `second_root` 小函数断言，不把它算成产品覆盖。 |
| c4：`native_windows.rs:856` 源上级链 Missing | 未新增覆盖 | 此次 `open_chain(source_parent)` 在 native intent 回调之前；外层 preflight 已验证完整源链，之后的建目标链步骤没有回调。若在外层 guard 中移除源链，会先被外层 preflight 的后续检查拦下；在 intent 回调才移除则源链已经打开。没有确定性插入到目标位置的时机。 |
| c5：`native_windows.rs:919` 最终打开/改名返回 2、3 | 未新增覆盖 | 最后一次 preflight 完成后到源 `nt_open`/`rename_at` 没有外部回调；提前在 intent/guard 中移除源，会由 preflight 的 Gone 分支返回。现有 GoneAtIntent 用例只证明这种前置路径，不能宣称命中这里的错误码映射。 |
| c7：空骨架清理的身份不等 | 未新增覆盖 | 新建身份记录发生在 `directory_chain_tracked`。journal/guard 回调运行时，目标链句柄仍不共享删除，无法在回调中替换这些目录；链句柄关闭之后至 `MoveSkeleton::drop` 身份比较之间没有外部回调。现有测试验证新建空骨架被回收、预先存在的空批次保留，但没有构造“本次新建目录已被替换”的身份不等场景。 |

本节按工单 1.3 与通用规则第 6 节的“确实走不到就解释，不写成已覆盖”交回。这五处遗留的目标变异覆盖仍未验证，供总控审阅；本次没有把原有小函数测试或前置分支重新命名为新增产品覆盖。

## 4. 检查、负控与证据

所有检查均在指定工作树根执行，入口为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N3 --mode <模式> [--final]
```

下表的 receipt 均在 `docs/acceptance/wave11/n3/receipts/` 归档；`.log` 与源码快照由检查器生成。模式栏给出每次实际参数。

| 模式 | 结果 / 检查器退出码 | Receipt 文件 |
|---|---|---|
| `baseline` | passed / 0，干净精确基线，离线缓存完整 | `2026-11-07T06-51-42.449Z-30856-baseline-result.json` |
| `lock` | passed / 0，未修改依赖或锁文件 | `2026-11-07T06-52-55.786Z-19396-lock-result.json` |
| `test`（先加回归断言，生产代码仍为旧实现） | 预期红 / 1；cargo 101，6 通过、5 失败，检出新名拒绝和 execute 重叠执行 | `2026-11-07T06-54-53.213Z-25368-test-result.json` |
| `check` | passed / 0，fmt 与 clippy `-D warnings` | `2026-11-07T07-01-35.077Z-14000-check-result.json` |
| `test` | passed / 0，11/11 | `2026-11-07T07-02-03.846Z-30828-test-result.json` |
| `real` | passed / 0，只读，4 固定盘、8 根 | `2026-11-07T07-02-54.662Z-25352-real-result.json` |
| `red-nc1` | passed / 0，cargo 101，7 通过、4 个新名测试失败 | `2026-11-07T07-03-44.735Z-11048-red-nc1-result.json` |
| `test`（立即恢复 nc1） | passed / 0，11/11 | `2026-11-07T07-06-50.216Z-35228-test-result.json` |
| `red-nc2` | passed / 0，cargo 101，10 通过、1 失败 | `2026-11-07T07-10-31.467Z-37672-red-nc2-result.json` |
| `test`（立即恢复 nc2） | passed / 0，11/11 | `2026-11-07T07-13-24.248Z-33268-test-result.json` |
| `red-nc3` | passed / 0，cargo 101，9 通过、2 失败 | `2026-11-07T07-16-15.538Z-33776-red-nc3-result.json` |
| `test`（立即恢复 nc3） | passed / 0，11/11 | `2026-11-07T07-17-29.449Z-32680-test-result.json` |
| `check --final` | passed / 0，干净实现提交 | `2026-11-07T07-19-31.732Z-28632-check-result.json` |
| `test --final` | passed / 0，11/11，0 ignored、0 filtered；proofAudit 三条通过 | `2026-11-07T07-20-08.310Z-31544-test-result.json` |
| `real --final` | passed / 0，干净实现提交，只读 | `2026-11-07T07-23-00.173Z-28472-real-result.json` |

随后运行 `--mode archive`，passed / 0；`ARCHIVE.json` 记录 266 条、4,610,422 字节（另外有索引文件及 `.gitattributes`）。archive 自身回执在 `.local/checks/WATER-W11-N3/2026-11-07T07-23-20.367Z-11104-archive-result.json`。检查器目录原有的两份总控出票前 baseline（06:42:21、06:43:51 UTC）原样保留并由 archive 收入，不是本执行者运行的结果。

三个负控只临时改生产代码一处，测试文件不动；每次完成后立即用 `git checkout -- <该文件>` 恢复，`git diff --exit-code` 核对后再完整运行 `test`：

| 负控 | 临时改坏的位置 | 实际检出 |
|---|---|---|
| nc1 | `validate_root` 只认旧名 | `CLEAN_W11_RENAME: list absent new root: InvalidPlan`；另外移入、还原、purge 的新名用例也失败。 |
| nc2 | 条目路径守卫移除新名，仅保留旧名 | `CLEAN_W11_RENAME: recursive source moved`，精确为 Moved 而非 Skipped。目标根显式在本树 `.local` 中。 |
| nc3 | 共享重叠拒绝条件临时置为恒假 | execute 与 quarantine 两处均以 `CLEAN_W11_NESTED` 失败。 |

nc1、nc2 恢复后的 `quarantine.rs` SHA-256 都是 `32303971f56b0969e30f9c5f1539d579b6396b0025a358696171ee18d79a9864`；nc3 恢复后的 `model.rs` 为 `132e28e2e8b40e2ed453f6c6db6cfed0583c538690e5f2d140e79e2dc2e31070`。

final test 的源码快照摘要：productionHash `3ecfd4c9bd5ccc35eddf0ae1b4b390bfa4bcc74467eac81d2383629f33bfaaa0`，testHash `06a29fdc517364c11791223c0f3cdea2740125a5e784a2a2781db2bdbfa45d42`。检查器 proofAudit 已逐条确认每个负控后，在下一个负控开始前有完全恢复该生产摘要和测试摘要的绿测。

旧断言迁移：无。`tests/clean_v1.rs` 相对基线仅新增 423 行、删除 0 行，仍为精确 11 个原测试；未改测试名、忽略、过滤、计时阈值或原断言强度。没有发生计时断言失败或因此重跑；初次旧实现预期红和三次有效负控不属于环境失败。

## 5. 真实冒烟、安全边界和未验证项

final real 观测 4 个固定盘；每盘两个名字，共 8 根。结果：

| 隔离名 | absent | present | unavailable | 编号目录数 |
|---|---:|---:|---:|---:|
| `.flick-quarantine` | 4 | 0 | 0 | 0 |
| `.water-quarantine` | 4 | 0 | 0 | 0 |

各匿名卷序号 1～4 的两种根状态均为 absent、编号目录数均为 0。前一次 real 与 final real 一致。整个真实冒烟只调用元数据查询和 `list_quarantines`，没有真实移入、还原、删除或文件内容读取。

所有写入/删除测试仍使用原有 Fixture/QFixture 的随机所有权目录与边界检查，仅回收本次新建目录；未在盘根建隔离区，未用 subst，未改系统盘符。原有跨盘 TEMP 测试保留，本机检查器的 TEMP 在本树同卷，日志为 `CLEAN_M35_CROSS_VOLUME n/a`，不声称跨卷实测。

cargo 全程由冻结检查器离线、单线程、私有 target 驱动，运行前查看进程名；机器上其它票的进程未终止。没有下载、原生产品窗口、选择框或浏览器。`src/` 没有新增 `std::fs` 或系统函数。未改其它包、契约、检查器、manifest、主线台账、git 配置、远端或已有历史；未 merge、rebase、amend、reset 或 push。

未验证：第 3 节五个精确竞态目标、默认盘根真实移入、多盘第二根路径、真实用户清理、真实生产竞态、扫描到服务再到执行器的完整集成、macOS。以上按工单允许的限制交回，等待总控重门验收；不把静态审阅或局部测试称为这些项目已通过。

回执使用 UTF-8；提交前读回全文，核对无连续问号及 U+FFFD。报告及证据独立提交，未夹带 final 之后的产品修改。所有本票测试和冒烟进程在交回前已自然结束，没有保留本票后台进程。
