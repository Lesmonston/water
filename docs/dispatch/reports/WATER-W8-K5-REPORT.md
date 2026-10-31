WATER-W8-K5 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k5/docs/dispatch/reports/WATER-W8-K5-REPORT.md

实际模型：Codex（GPT-6；系统未提供更细的型号）。工作树 `F:/new/smaltalk/water/.worktrees/w8-k5`，分支 `worker/water-w8-k5`，首次 HEAD `912eba100ba342c3eeb21ba555c6d589b91e6b4f`，初始干净。

## 阻塞与最小补充需求

`contracts/m3c-v1/HOST-M3C.md` 第 1 节要求 Tauri `clean_prepare` 签名增加 `exclude_item_ids: Option<Vec<String>>`，前端键为 `excludeItemIds`。

旧测试 `apps/water/host/tests/host_v1.rs` 的 `HOST_COMMANDS actual Tauri camelCase parameters` 从真实命令签名解析参数键，并与 `expected_wrappers` 精确比较。基线的 `clean_prepare` 期望键只有 `["groupIds"]`；落实新签名后，真实键必然是 `["excludeItemIds", "groupIds"]`。缺省转发时仍省略排除键，不能使这条签名断言成立。

但 HOST-M3C 第 4 节限定：

> 原有断言中，命令总数 17 的期望值获准改为 19，其余不变。

`docs/dispatch/W8-M3C-WORKER-RULES.md` 第 2 节要求：

> SPEC 没想到、但因本单改动而必然要改的旧断言：先写受阻回执，不要自行改。

因此暂停：需要总控用编号补充单，明确授权将这条旧断言中 `clean_prepare` 的参数键期望从 `["groupIds"]` 增加为 `["excludeItemIds", "groupIds"]`，同步票面与 manifest；其余命令参数和旧断言保持。不能通过在解析器中忽略新键、放宽精确比较等方式变通。

## 提交与当前状态

没有完成或通过最终门的实现提交。保存现场的**草稿提交**为 `2d70999ecc4ef5eba008603594c2b4eb72e5c0e1`，不是可验收实现。只含本票宿主的四个文件。报告与证据另行提交，不夹带产品变更。

草稿初次编写时曾为 `expected_wrappers` 补入新键；复核到上述冻结限制后停止实现，先写受阻回执，等待已启动的测试自然结束，然后删去这项期望变更。当前提交中，该旧断言及其 `clean_prepare` 参数期望保持基线语义。没有通过忽略新参数或放宽比较绕过它。

**此前通过的测试不覆盖交回字节。** `test` 的归档源码含临时的新键期望；它返回后恢复了旧期望，没有再跑测试。当前真实签名与旧期望的冲突仍在，不宣称当前提交五测通过。源码草稿保留，方便总控用编号补充单明确续做基线。

## SPEC 第 1～3 节草稿对照

| 要求 | 草稿位置与实现 | 验证边界 |
|---|---|---|
| §1 排除参数 | `src/commands.rs` 的 `cmd_clean_prepare` 和 Tauri `clean_prepare` 增加 `Option<Vec<String>>`，非空才插入 `excludeItemIds`；其它情况仍构造原来的 `groupIds` 对象 | 记录后端用例覆盖 None、空、非空，包含重复/空/中文 ID，验证不在宿主校验、保序转发及成功/失败返回不变；临时测试草稿曾通过，正式参数断言授权仍受阻 |
| §2 跳过命令 | `COMMANDS` 长度 19，末尾依次 `skip_add`、`skip_remove`；新 `cmd_*` 与 Tauri 适配器；`src/lib.rs` 登记两个 handler | 新断言带 `HOST_M3C_SKIP`，检查 19 个名称/handler 和 `itemId`、`skipId` 原样转发；未做 nc2 |
| §2 README | 两处命令数 17→19，说明排除缺省兼容、跳过键及转发职责；示例命令和原生夹具路径更新为本票 | 文档变更；明确旧服务/UI 的原生检查不验证新功能 |
| §3.1 Exit 顺序 | `tests/host_v1.rs` 在实际 Exit 分支内匹配完整 `stop_cleaning_within(exit_backend.as_ref(), Duration::from_millis(200), Duration::from_secs(10),);` 词元序列，保留 `HOST_EXIT_DURING_CLEAN` 并增加 `HOST_EXIT_WIRING` | 加入参数反序词元样例的拒绝断言；未额外修改生产 Exit 调用做负控 |
| §3.2 部分时限 | 新 `PartialInitialState` 首次查询睡 300 ms、后续持续 cleaning，总限 700 ms、poll 2 s；检查总时限、发生后续查询且只停止一次 | 总时间允许 150 ms 调度余量，能区分从首次查询之后重新计满 700 ms 的错误实现；临时测试草稿曾通过 |
| §3.3 分词器 | 返回明确诊断的 `try_wiring_tokens`，识别字符、转义字符、原始字符串（多 #、字节字符串）；区分生命周期 | `host_command_registry` 内增加 `HOST_TEST_TOKENIZER` 用例；字符串/注释外非 ASCII 返回含字节位置的 Err，避免 UTF-8 切片 panic |
| §3.4 README 空行 | 在原第 31、32 行之间补空行 | 完成草稿 |
| §3.5 BackendSlot 注释 | 在 `available()`、`call()` 处说明两次锁之间被 take 只会多一次五秒未知等待，现有 teardown 顺序走不到 | 只加注释，不改逻辑 |

宿主之外的包、UI、capabilities、CSP、配置、导航、窗口安全、依赖、关窗与退出的生产行为未改。

## 旧断言与输入变动

- 命令清单期望从原 17 个扩为原 17 个加 `skip_add`、`skip_remove`；旧 IPC 表加上 M3C 增量表里的两个新命令，仍精确比较，不删除旧命令。
- 现有三个 `cmd_clean_prepare` 调用补 `None`，保留原有成功/失败行为的断言；没有改原值。
- Exit 原来的“三段词元分别存在”断言按 SPEC §3.1 加强为整段有序匹配，原 `HOST_EXIT_DURING_CLEAN` 标记保留，新增 `HOST_EXIT_WIRING`。
- `HOST_COMMANDS actual Tauri camelCase parameters` 原 `clean_prepare` 期望 `["groupIds"]`，当前仍为 `["groupIds"]`。**拟议的新值** `["excludeItemIds", "groupIds"]` 已从草稿中撤回，等待编号补充单明确授权。
- 其余旧断言保持；仍精确五个 `#[test]`，名称不变，无 ignore、过滤或拆分。

## 检查命令与实际结果

下列命令均在指定工作树根执行。完整子命令、退出码、源码快照在归档回执与日志中。所有 Cargo 由指定检查器管理，离线、jobs=1、私有 Cargo home/target，无下载。

| 实际命令 | 结果与用时 | 回执前缀（UTC） |
|---|---|---|
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K5 --mode baseline` | exit 0，passed，8.416 s，首次 HEAD 与干净状态一致 | `2026-10-31T14-16-09.988Z-27120` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K5 --mode lock` | exit 0，passed，19.481 s | `2026-10-31T14-17-06.147Z-7900` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K5 --mode check` | exit 0，passed，387.007 s；政策、依赖、fmt、Clippy | `2026-10-31T14-20-04.477Z-30056` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K5 --mode test` | exit 0，passed，367.159 s；五测 5/5、0 ignored、0 filtered；**仅临时参数期望草稿，非交回字节** | `2026-10-31T14-27-16.923Z-40864` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K5 --mode archive` | exit 0，passed；57 个源文件/日志/回执按原字节归档，共 5,633,491 字节（不含索引和 .gitattributes） | `2026-10-31T14-34-08.546Z-14456` |

格式整理使用 rustup `1.95.0` 对应的 `rustfmt --edition 2024`，仅作用于本单三个 Rust 文件。`git diff --check`、`git diff --cached --check` 均为 exit 0。

归档索引：`docs/acceptance/wave8/k5/ARCHIVE.json`；回执与日志：`docs/acceptance/wave8/k5/receipts/`。目录内还包含总控预先存在的 `2026-10-31T14-10-28.120Z-29844-baseline-result.json` 及其日志，不将该次算作本执行者运行。

临时测试的 productionHash 为 `18cc6cc5e242d02dfaba6c41f77e05e1a8b13fd7f030c89e97bd14089c8c4fae`、testHash 为 `e357be2d076ab690251873a531d2fe962afbac5a67ae3bb33964ef06e92f78c7`（检查器聚合摘要）。恢复旧参数期望后的 `tests/host_v1.rs` 文件 SHA-256 为 `d19b3d482df8c971e4e8c8757a3d133198a86eda6e1f16b8b0d15deeb1d1b9ca`。两者是不同口径，不能直接比较；归档保存各源文件的独立 SHA-256 与原字节。

## 未运行与未验证

- nc1、nc2 均未运行，没有负控失败信息或负控恢复证明，不冒称重门通过。
- `check --final`、`test --final`、`native --final` 均未运行，恢复旧参数期望后的草稿没有重新测试。
- 原生窗口使用 **0/1**，目录选择框 **0**；整机九步骤未开始，用时/退出码/截图均无。没有创建 native-window reservation，没有消耗真窗口预算。
- 排除/跳过与真实服务、真实 UI 的整合链路，以及 macOS、真实系统关机、真实目录选择框、生产竞态未验证。
- 没有开展真实用户垃圾扫描或删除；仅已有五测的合成夹具行为。`.local` 的缓存、构建产物与日志保留，未手工清理。
- 没有改契约、检查器、台账、依赖或安全配置，没有 merge、push、修改远端/配置、改写历史，也未启动子代理。提交身份只在提交命令的进程里设置为 `Codex GPT-6 <codex-gpt-6@localhost>`。
- 已启动的检查自然结束；本执行者没有手工启动应用、选择框或常驻后台进程。
