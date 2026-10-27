WATER-W4-G5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g5/docs/dispatch/reports/WATER-W4-G5-REPORT.md

## 交付与基线

| 项 | 实际值 |
|---|---|
| 执行模型 | Codex / GPT-6（本会话模型标识）；没有调用子代理或其它实现 CLI |
| 工作树 | `F:/new/smaltalk/water/.worktrees/w4-g5` |
| 分支 | `worker/water-w4-g5` |
| 首次 HEAD | `4f35c52f5abb3dee22583cc2c86b05da2fc2be93`，开工时干净 |
| 实现提交 | `700f4e04ff36830fb6a2bde6e859566e48721a54`，父提交即首次 HEAD，只改 `packages/junk-clean/src/native_windows.rs` |
| 实现 diff | 1 文件，125 行新增、46 行删除；提交前核过完整 diff 与 `git diff --check` |
| 执行者检查 | baseline、lock、check、test、3 条负控及逐次恢复、两个 final、archive 全部通过 |
| 验收状态 | 执行者完成并交回，等待总控独立验收；不自行标记 VERIFIED 或合入主线 |

先读权威 G5 票及第四波规则，随后读 ADR-018、第四波计划、CLEAN-REPORT 全文、CLEAN-HARDENING（含第 4、5 节）、CLEAN，再读 G1 第三轮验收及补单 01、02，最后读指定实现。项目 README、STATUS、PROJECT-CHARTER、CONTROLLER-WORKFLOW 与工作树 AGENTS 已核对。按权威 manifest 的 G5 配置运行检查，没有修改票、契约、台账或检查器。

## 逐条对应 CLEAN-REPORT 与 G5 第 6 条

### 1. 删除开始前条目本身消失或被换

`DelCtx.initial_skip` 只用于条目本身（`rel.is_empty()`）。目录分支首次相对打开返回错误 2/3 时设为 `Gone`（实现第 952 行）；普通文件分支同样处理（第 1076 行）。打开成功后先从该句柄读 FileId，若条目本身的 FileId 不等于快照，设为 `Changed`（目录第 963 行、文件第 1056 行），不进入子树、不设置删除标记，也不调用 `fail`。

`delete` 第 1213 行在残余统计之前检查这个原因，直接用 `ItemReport::skipped` 返回，并把 `bytes_before` 保留为快照测量值。因此两条分支分别得到 `skipped/gone`、`skipped/changed`，`bytes_freed = "0"`、`failed_entries = 0`；返回的中断标志为 false，不把它当用户取消或停止整次运行。

子项被换仍按快照类型处理：快照项是普通目录时计一次失败并设置 `changed_stop`，立即停止本项；快照项是文件或链接时拒绝删除、计一次、继续兄弟项。没有把顶层跳过规则扩到子项。

### 2. 残余统计时原名消失或 FileId 被换

`measure_residual` 第 1142 行把第一次相对打开返回错误 2/3 改为调用原有的 `replaced(self_deleted)`，与 FileId 不同及第二次目录打开返回 2/3 共用同一规则：

- `self_deleted == true`：本次已经成功给条目本身设删除标记，返回 `(None, 0)`，残余为 0，可以报告 `deleted`。
- `self_deleted == false`：返回 `(Some(bytes_before), 0)`，保留全部残余估计，不报告 `deleted`，不额外计失败。

标志仍只在 `set_delete` 成功且相对名为空时设置；子项成功删除不会设置它。用于目录残余求和的句柄仍须核对 FileId；父目录打不开、身份/属性读取失败或求和失败等其它残余未知情形继续保留原有 `bytes_before` 与额外 1 次失败的规则。

### 3. 失败去重与“已有交代”向上级传播

新增与快照索引一一对应的 `accounted: Vec<bool>`。`fail(index)`（第 872 行）在该项尚无交代时计 1，并标记该快照项。删除失败、句柄复核不符、枚举得到的 FileId 不同、打开失败等原有计数位置均通过这个函数记录。

目录设置删除标记失败后，仍用它自己的句柄再枚举。`only_post_snapshot`（第 882 行）保持“至少一项”的要求，并通过同一个快照查找函数判断所有剩余名字：

| 重枚举结果 | 处理 |
|---|---|
| 非空，且每项都没有快照匹配，或匹配的快照项已 `accounted` | 不增加失败；本目录也标记 `accounted` |
| 包含任意尚未 `accounted` 的快照项 | 本目录 `fail(index)`，增加 1 并标记 |
| 为空，或重枚举失败 | 本目录 `fail(index)`，增加 1 并标记 |

因此 `a\b\new.txt` 是快照后新项时，`b` 删除失败但不计数、标记已有交代；`a` 再枚举只见已有交代的 `b`，也不计数并标记；条目本身同样处理，整条上级链增加 0。若快照文件 `a\x.bin` 被替换，其快照索引先计 1 并标记；上级目录仅因这个已交代的残留而删不掉时不再加数。若快照子目录被换，仍先计 1 然后停止本项，停止后的上级不尝试删除，也不重复计数。状态继续由原有残余、`removed` 与用户停止规则判定。

### 4. 精确匹配优先，之后按 Unicode 简单大写匹配

`expected_index`（第 858 行）先在原有、按相对名排序的快照上二分查找。仅精确匹配失败时才调用 `uppercase_key`，再在新增的 `folded` 排序索引上二分查找，最终返回原快照索引。删除子项识别、打开后复核及目录失败后的再枚举全部使用这个函数，计数也绑定同一个快照索引。

`folded` 在 `delete` 第 1191 行一次构建并排序。构建遍历一次快照，排序为 O(n log n) 次键比较；之后每次名字查找仍为 O(log n) 次比较，没有逐子项线性扫描快照。附加存储为大写名字与索引，以及逐项布尔标记。

`uppercase_key`（第 822 行）逐 Unicode 字符做一对一大写映射。标准库大写结果只有一个字符时直接使用；会展开成多个字符的映射保留原字符，同时补上希腊 iota-subscript 字母存在的一对一大写映射，避免把简单映射错误实现成完整大写展开。映射语义核对了 Unicode 官方的 [UnicodeData 17.0.0](https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt) 与 [SpecialCasing 17.0.0](https://www.unicode.org/Public/17.0.0/ucd/SpecialCasing.txt)。未下载或增加运行时数据/依赖。

大小写变化后匹配到相同 FileId 时仍照常走原有句柄复核和删除；不同 FileId 时按快照项类型拒绝或停止，不能当成快照后新项。区分大小写目录中的精确名字仍优先。

### 5. 本次没有删除对象时释放字节为 0

`delete` 第 1230 行以 `ctx.removed == 0` 为直接条件返回 0。只要本次没有成功设置过任何对象的删除标记，即使其它程序让残余变小，也不归入 Water 的释放量。本次至少删除一个对象时，继续用 `before.bytes.saturating_sub(residual.unwrap_or(0))`，即 `max(0, bytes_before − 残余)`。取消且未删除的项自然也为 0。

### 6. 三行注释末尾字母

第 374 行恢复 `Every other`，第 750 行恢复 `any other`，第 879 行恢复 `expected rather`（后续注释同步解释已有交代的目录规则）。完整 diff 已检查，没有其它行尾字母截断或范围外改动。

## 保持不变

公开 API、计划/报告/日志字段、依赖及锁文件、6 个测试的名字与断言均未修改。仍仅声明以下 8 个系统函数：`CreateFileW`、`GetFileInformationByHandleEx`、`SetFileInformationByHandle`、`GetVolumeInformationByHandleW`、`GetDiskFreeSpaceExW`、`CloseHandle`、`NtOpenFile`、`RtlNtStatusToDosError`。

按句柄相对打开、不跟随重解析点、目录不含删除共享、链接删除前的身份与名称代理复核、删除标记与回退、句柄关闭顺序、停止信号与 `changed_stop` 规则均保留。`check --final` 对源码政策、`forbidPatterns`、FFI 白名单、依赖、格式与 clippy 的检查全部通过。

文件 SHA-256：

```text
src/native_windows.rs
988641a07387e6ba55919fafd06904a14bcbc1c7cd955016e4bffd8036fbfe27
tests/clean_v1.rs（与基线相同）
6c0a8e3b7953ecf02bb6fa77c6ad2077ae590c620bb7ebe27d0c7a3d0aaf3cf5
检查器 productionHash
a36851e198dd5844baea33b2ff9d61098d79809e28a3dd4087d6a09c13ef8202
检查器 testHash
22fa84c0e91722cf7850b2cd2077b9efa3f6a2cf3555827bdae77022e49ae80f
```

## 命令、结果与证据

全部在工作树根执行，命令前缀统一为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G5
```

下表每行的命令后缀接在该前缀之后。检查器退出码均为 0；负控的内部 cargo test 预期退出 101，检查器确认实际断言失败后才记为通过。所有 cargo 检查离线、jobs=1、测试线程=1，使用本树私有 Cargo home、target 与 TEMP。

| 命令后缀 | 结果 | 回执（归档文件名） |
|---|---|---|
| `--mode baseline` | passed；精确基点、分支、干净树与离线输入就绪，未跑产品测试 | `2026-10-27T09-54-39.268Z-20956-baseline-result.json` |
| `--mode lock` | passed；只核对既有依赖，未更改 Cargo.lock | `2026-10-27T09-56-16.811Z-26872-lock-result.json` |
| `--mode check` | passed；政策、fmt、clippy | `2026-10-27T10-00-44.249Z-32904-check-result.json` |
| `--mode test` | passed；6/6 | `2026-10-27T10-02-34.802Z-41480-test-result.json` |
| `--mode red-nc1` | passed；目标红，cargo 101，5 过/1 失败 | `2026-10-27T10-05-25.292Z-15056-red-nc1-result.json` |
| `--mode test`（nc1 恢复后） | passed；6/6 | `2026-10-27T10-05-57.448Z-17164-test-result.json` |
| `--mode red-nc2` | passed；目标红，cargo 101，5 过/1 失败 | `2026-10-27T10-06-52.046Z-22932-red-nc2-result.json` |
| `--mode test`（nc2 恢复后） | passed；6/6 | `2026-10-27T10-07-41.084Z-12444-test-result.json` |
| `--mode red-nc3` | passed；目标红，cargo 101，4 过/2 失败 | `2026-10-27T10-08-13.387Z-33892-red-nc3-result.json` |
| `--mode test`（nc3 恢复后） | passed；6/6 | `2026-10-27T10-08-37.797Z-37964-test-result.json` |
| `--mode check --final` | passed；干净实现提交，内部 metadata/fmt/clippy 均为 0 | [check final](../../acceptance/wave4/g5/receipts/2026-10-27T10-09-05.691Z-16876-check-result.json) |
| `--mode test --final` | passed；干净实现提交，6/6，proofAudit 逐项核对红/恢复次序与源码快照 | [test final](../../acceptance/wave4/g5/receipts/2026-10-27T10-09-22.664Z-36564-test-result.json) |
| `--mode archive` | passed；165 个索引条目，1,964,539 字节 | [ARCHIVE.json](../../acceptance/wave4/g5/ARCHIVE.json) |

前四次检查时 HEAD 仍为首次基点，check/test 测的是随后提交的实现字节。三个负控、逐次恢复和两个 final 的 HEAD 均为 `700f4e04ff36830fb6a2bde6e859566e48721a54`。两个 final 的 before/after 状态均干净，生产与测试摘要一致。

实际运行的精确 6 个测试：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`、`clean_handle_hardening`；没有 ignore、过滤、拆分或新增断言。最终 6 过、0 失败、0 ignored、0 measured、0 filtered out。

归档由检查器 `archive` 生成，包含原始日志、源码快照与回执，并保留开工前已有的总控派前 baseline `2026-10-27T08-25-53.402Z-29636-baseline-result.json`。它不是本执行者运行的 baseline；本次使用 09:54:39Z 的回执。归档命令自身结束回执为 `.local/checks/WATER-W4-G5/2026-10-27T10-10-03.626Z-38344-archive-result.json`，按检查器写入顺序在归档之后生成，未计入上述 165 条。

收尾补充核对通过：165 条归档与各自 `.local` 原文件逐项大小/哈希一致，索引总字节数一致；证据实际为 167 个文件（另含索引与 `.gitattributes`），没有额外文件；报告第一行匹配通知，产品相对 final 提交无差异。辅助命令有两处勘误：一次 `node -e` 哈希探针受 PowerShell 引号解析影响而语法失败，改用 `Get-FileHash`；首次目录清单核对因 PowerShell 数组拼接缺少括号而误报，修正核对表达式后 167/167 一致。两次都没有改动产品或证据，也没有作为负控或测试通过的证明。

## 三条有效负控与恢复

每条仅临时修改已提交 `src/native_windows.rs` 中一行真实调用逻辑，diff 均为该文件 +1/-1；不改测试。每次目标红之后立即执行：

```powershell
git checkout -- packages/junk-clean/src/native_windows.rs
```

随后核对文件 SHA-256，再运行表中紧接的 `--mode test`。三次恢复后的文件哈希均为 `988641a07387e6ba55919fafd06904a14bcbc1c7cd955016e4bffd8036fbfe27`，生产摘要均回到 `a36851e198dd5844baea33b2ff9d61098d79809e28a3dd4087d6a09c13ef8202`；全部 6/6 复绿后才开始下一条。

| 负控 | 单处生产修改 | 真实失败信息 | 坏态 native SHA-256 |
|---|---|---|---|
| nc1 | `walk_subtree` 第 752 行：`if raw.tag & NAME_SURROGATE == 0 {` → `if false {`，去掉非名称代理阻断 | `CLEAN_REPARSE_KIND: a custom reparse tag was not treated as an unknown reparse point`；`clean_handle_hardening` 第 988 行失败 | `a359c35387de1e61a868c00cd5374e3b1fc5d7ad6082c7ab529c007f8b113f53` |
| nc2 | `walk_subtree` 第 743 行：`if protected_ids.contains(&id) {` → `if false {`，去掉子项的保护身份比对 | `CLEAN_GUARD_ID: an aliased protected path was not enforced`；`clean_handle_hardening` 第 1054 行失败 | `ee311b32c63a6436d8c595d1fc1f8cfb59de8c4116ada827722c34056211c89c` |
| nc3 | 第 50 行 `OPTS` 去掉 `OPEN_REPARSE_POINT \| ` | `CLEAN_NO_FOLLOW: the junction link was not removed by handle`；`clean_handle_hardening` 第 961 行失败，另 `clean_no_follow` 第 447 行的链接应消失断言失败 | `4953e239135332a17f0200bef5b9460ad92b416c5b6e285f77d5698084d6ab53` |

日志分别为归档 `receipts/` 下的 `2026-10-27T10-05-25.292Z-15056-red-nc1-5.log`、`2026-10-27T10-06-52.046Z-22932-red-nc2-5.log`、`2026-10-27T10-08-13.387Z-33892-red-nc3-5.log`。红态均为实际断言失败，没有用编译错误或超时作证明。final test 的 `proofAudit` 已逐一绑定上述红态与恢复回执。

## 未做与验证边界

- G5 第 1～4 节的并发窗口按工单仅交代码实现与逐条说明；没有添加生产测试开关。未运行总控竞态用例，也没有把 `w4-g1-controller-cases.rs` 加进本树 Cargo.toml 或测试目录。
- 未运行十万个文件的计时，没有把此前 23 秒作为本实现的新实测结果；索引复杂度已说明，计时留给总控。
- 只运行指定 6 测试及三条负控，未做全仓测试、服务/宿主/界面集成、真实用户目录扫描或清理、macOS 或其它文件系统验证。
- 所有删除测试只作用于指定测试在本树 `.local/w2-d-fixtures/` 下本次新建的随机合成夹具，沿用测试自带边界校验回收；没有手工递归删除、清缓存或清理其它目录。
- 原生窗口、目录选择框、浏览器均为 0。没有启动常驻服务或后台作业；本次检查命令已全部退出。
- 未 push、merge、rebase、amend、reset、squash、stash 或改写历史，未更改 git 远端/配置。只在分支末端新增提交，源码与回执/归档分开提交。
- 未改依赖、Cargo.lock、其它包、主线台账、契约、检查器或第三方 checkout。Unicode 官方资料只用于只读核对映射语义；cargo 全程离线，生产代码没有新增网络、进程或环境变量读取。
