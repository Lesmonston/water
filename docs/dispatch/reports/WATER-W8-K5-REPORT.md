WATER-W8-K5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k5/docs/dispatch/reports/WATER-W8-K5-REPORT.md

> 当前结果见文末“补单 01”：实现 `802ca7eb3cf6a3476d798ff79b732a720892cd4d` 的两条负控、两次恢复五测及三个 final 全部通过。下面原轮次的受阻原因与未运行记录保留为历史，不代表本次结果。

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

## 补单 01

2026-11-01 JST。实际模型：Codex（GPT-6；系统未提供更细的型号）。本轮为用户外贴的执行者，没有启动子代理。

- 续做起点：`ba3a39b9f43e3dcab6a8e6f68c942d7c008720f6`，开工实际 HEAD 与分支 `worker/water-w8-k5` 均相符，工作树干净。
- 完成实现提交：`802ca7eb3cf6a3476d798ff79b732a720892cd4d`。它在原草稿 `2d70999ecc4ef5eba008603594c2b4eb72e5c0e1`、受阻回执 `ba3a39b9` 后追加；本轮仅补 `expected_wrappers` 的授权期望，沿用并复核原草稿其余实现。
- 三个 final 均在此干净实现提交上按 `check`、`test`、`native` 顺序通过。之后仅生成证据、修改本回执，没有再改产品或测试。
- 不重跑 baseline；历史临时草稿的绿测不计入本轮验证。所有 Cargo 调用均由指定检查器执行：1.95.0、离线、jobs=1、本树私有 Cargo home/target，无下载。

### SPEC 第 1～3 节逐项结果

| 要求 | 交付与验证 |
|---|---|
| §1 排除参数 | `src/commands.rs` 的公开 `cmd_clean_prepare` 与实际 Tauri `clean_prepare` 均增加 `exclude_item_ids: Option<Vec<String>>`；只在非空时插入 `excludeItemIds`。`host_service_wiring` 的 `HOST_M3C_EXCLUDE` 用记录后端检查 None、空数组、非空数组的精确对象和序列化字节，并核对成功/失败返回原样通过。非空样本含重复、中文和空 ID，顺序与内容保留，宿主不作 ID 校验。nc1 证明漏转发会失败。 |
| §2 两条新命令 | `COMMANDS` 的原 17 个命令顺序不动，末尾依次追加 `skip_add`、`skip_remove`，长度 19。公开 `cmd_*`、Tauri 包装函数、`src/lib.rs` 的 `generate_handler!` 全部登记；分别转发 `itemId`、`skipId`，不解释返回值。测试精确检查全部名称、顺序、签名键、handler、成功/失败返回与调用序列。nc2 证明错键会失败。 |
| §2 README | 两处命令数均为 19；说明排除列表缺省兼容及跳过命令的转发职责。 |
| §3.1 Exit 接线 | `host_service_wiring` 从真实 Exit 分支提取词元，整段有序匹配 `stop_cleaning_within`、200 ms poll、10 s limit；保留旧标记 `HOST_EXIT_DURING_CLEAN`，增加 `HOST_EXIT_WIRING`，并检查参数反序样本不能匹配。生产退出调用未改。 |
| §3.2 部分时限 | 新增 `PartialInitialState`：首次查询耗时 300 ms，总限 700 ms，poll 2 s。断言总等待为 700～850 ms、发生后续查询且只发送一次停止，验证首次查询耗时从总时限扣除。原有超限首次查询断言保留。 |
| §3.3 分词器 | `try_wiring_tokens` 识别字符、转义字符、Unicode 字符、原始字符串（无 #、多 #、字节原始字符串），跳过嵌套注释，区分生命周期。字符串/注释外的非 ASCII 返回含字节位置的明确错误，不在 UTF-8 中间切片。`HOST_TEST_TOKENIZER` 用例位于原 `host_command_registry` 内。 |
| §3.4 README 空行 | 在原第 31、32 行之间补空行。 |
| §3.5 BackendSlot | 在 `available()`、`call()` 两处加注释：两次锁之间被 take 只会增加一次五秒未知等待，现有 teardown 路径走不到；仅注释变化，逻辑不变。 |

仍精确五个测试：`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。没有 ignore、过滤、改名、拆分或删旧标记。

### 获准改动的旧断言原文

以下“前”均指原单基线 `912eba100ba342c3eeb21ba555c6d589b91e6b4f`；“后”指 `802ca7eb`。补单续做起点中已存在的修改也列出，避免只报本轮六行 diff。

1. **SPEC §4 的 17 → 19。** 原 `expected` 的最后两项及结尾为：

```rust
        ("custom_root_add", json!({})),
        ("custom_root_remove", json!({"rootId": "root-1"})),
    ];
```

改后为：

```rust
        ("custom_root_add", json!({})),
        ("custom_root_remove", json!({"rootId": "root-1"})),
        ("skip_add", json!({"itemId": "i-甲"})),
        ("skip_remove", json!({"skipId": "skip-乙"})),
    ];
```

前 17 项逐字不变。旧断言 `assert_eq!(COMMANDS.as_slice(), names, "HOST_COMMANDS fixed registry");` 和 `assert_eq!(handlers, names, "HOST_COMMANDS actual handler registration");` 原文均未改，期望集合由 17 扩为 19。生产声明原文 `pub const COMMANDS: [&str; 17] = [` 改为 `pub const COMMANDS: [&str; 19] = [`。新加的 `assert_eq!(COMMANDS.len(), 19, "HOST_M3C_SKIP command count");` 是新增断言。

2. **补单 §1.1 的 Tauri 参数键。** 原推导的声明为：

```rust
    let expected_wrappers: std::collections::BTreeMap<_, _> = expected
```

改后声明为：

```rust
    let mut expected_wrappers: std::collections::BTreeMap<_, _> = expected
```

其后的 `.iter().map(...).collect()` 推导原文不变。原推导后直接进入下面的精确比较；现在只在比较前插入：

```rust
    expected_wrappers.insert(
        "clean_prepare".to_owned(),
        vec!["excludeItemIds".to_owned(), "groupIds".to_owned()],
    );
```

`clean_prepare` 的签名键原期望为 `["groupIds"]`，新期望为排序后的 `["excludeItemIds", "groupIds"]`。其余 18 个命令仍由原列表精确推导。比较的原文前后完全相同：

```rust
    assert_eq!(
        wrappers, expected_wrappers,
        "HOST_COMMANDS actual Tauri camelCase parameters"
    );
```

3. **补单 §1.2 的调用序列。** 下列期望原文前后相同，没有添加排除键：

```rust
        ("clean_prepare", json!({"groupIds": ["g1", "g2"]})),
```

`HOST_COMMANDS exact call sequence and camelCase arguments` 的比较原文不变，只随第 1 项追加两个新命令。`exercise()` 中 clean_prepare 的调用由：

```rust
        cmd_clean_prepare(backend, vec!["g1".into(), "g2".into()]),
```

变为：

```rust
        cmd_clean_prepare(backend, vec!["g1".into(), "g2".into()], None),
```

4. **补单 §1.3 的契约表。** 原 `contract_names` 在读取 `contracts/checkup-v1/IPC.md`、执行下列解析后直接 `.collect()`：

```rust
        .filter_map(|line| {
            line.strip_prefix("| `")
                .and_then(|tail| tail.split_once('`').map(|(name, _)| name))
        })
        .collect();
```

改后在原解析和 `.collect()` 之间追加如下原文：

```rust
        .chain(
            include_str!("../../../../contracts/m3c-v1/IPC-M3C.md")
                .lines()
                .filter_map(|line| {
                    line.strip_prefix("| `")
                        .and_then(|tail| tail.split_once('`').map(|(name, _)| name))
                })
                .filter(|name| matches!(*name, "skip_add" | "skip_remove")),
        )
```

旧比较 `assert_eq!(names, contract_names, "HOST_COMMANDS IPC table");` 原文不变。仍精确比较 17 个原表命令后接增量表的 skip_add、skip_remove，顺序和个数都保留约束。

5. **补单 §1.4 的另两处签名适配。** 原调用子表达式及新调用子表达式逐字如下；外层的原成功/失败断言、期望值与标记均未改变（仅 rustfmt 折行）：

```rust
// 前
cmd_clean_prepare(direct.as_ref(), vec!["g1".into()]).unwrap_err()
cmd_clean_prepare(&backend, vec!["g1".into()]).unwrap_err()
// 后
cmd_clean_prepare(direct.as_ref(), vec!["g1".into()], None).unwrap_err()
cmd_clean_prepare(&backend, vec!["g1".into()], None).unwrap_err()
```

6. **SPEC §3.1 的 Exit 接线旧断言。** 原文：

```rust
    assert!(
        exit.windows(2).any(|w| w == ["stop_cleaning_within", "("])
            && exit
                .windows(6)
                .any(|w| w == ["Duration", ":", ":", "from_millis", "(", "200"])
            && exit
                .windows(6)
                .any(|w| w == ["Duration", ":", ":", "from_secs", "(", "10"]),
        "HOST_EXIT_DURING_CLEAN Exit calls bounded stop at 200 ms / 10 s"
    );
```

加强后原文：

```rust
    let exit_call = wiring_tokens(
        "stop_cleaning_within(exit_backend.as_ref(), Duration::from_millis(200), Duration::from_secs(10),);",
    );
    assert!(
        exit.windows(exit_call.len())
            .any(|window| window == exit_call),
        "HOST_EXIT_DURING_CLEAN HOST_EXIT_WIRING Exit calls bounded stop at 200 ms / 10 s in parameter order"
    );
    let swapped = wiring_tokens(
        "stop_cleaning_within(exit_backend.as_ref(), Duration::from_secs(10), Duration::from_millis(200),);",
    );
    assert!(
        !swapped
            .windows(exit_call.len())
            .any(|window| window == exit_call),
        "HOST_EXIT_WIRING rejects reversed poll and deadline"
    );
```

原 `HOST_EXIT_DEADLINE` 用例保留，新增部分时限用例；分词器增加能力与新用例，没有削弱其它旧断言。

### 本轮全部检查命令与结果

全部在指定工作树根目录执行，命令前缀均为 `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K5`，下表每行按顺序在前缀后加“参数”即为完整实际命令。前缀没有额外环境开关或测试过滤。时间由检查器的 startedAt/endedAt 计算，回执前缀为 UTC。

| 参数 | 检查器退出码 / 结果 | 秒 | 回执前缀 |
|---|---|---:|---|
| `--mode lock` | 0 / passed，依赖锁核对，无锁变更 | 13.191 | `2026-10-31T15-40-57.785Z-42832` |
| `--mode check` | 0 / passed，政策、依赖、fmt、Clippy | 16.932 | `2026-10-31T15-41-27.270Z-9456` |
| `--mode test` | 0 / passed，5/5 | 29.128 | `2026-10-31T15-42-02.932Z-43932` |
| `--mode red-nc1` | 0 / 有效红；Cargo 101，4 绿 1 红，目标 HOST_M3C_EXCLUDE | 21.033 | `2026-10-31T15-43-18.432Z-30660` |
| `--mode test` | 0 / nc1 原字节恢复后 5/5 | 34.852 | `2026-10-31T15-43-47.014Z-19728` |
| `--mode red-nc2` | 0 / 有效红；Cargo 101，4 绿 1 红，目标 HOST_M3C_SKIP | 39.164 | `2026-10-31T15-44-32.085Z-9896` |
| `--mode test` | 0 / nc2 原字节恢复后 5/5 | 42.219 | `2026-10-31T15-45-25.595Z-1904` |
| `--mode check --final` | 0 / passed，干净实现提交 | 16.239 | `2026-10-31T15-46-28.781Z-9152` |
| `--mode test --final` | 0 / passed，5/5，proofAudit 两条完整红→恢复链 | 26.220 | `2026-10-31T15-46-53.824Z-38460` |
| `--mode native --final` | 0 / passed，唯一真窗口、九步通过、应用 exit 0 | 79.351 | `2026-10-31T15-47-47.118Z-18460` |
| `--mode archive` | 0 / passed，累计 266 文件 / 25,772,487 字节 | 6.211 | `2026-10-31T15-50-18.308Z-30172` |

每次完整测试均 0 ignored、0 measured、0 filtered out。检查器回执与源文件快照位于 `docs/acceptance/wave8/k5/receipts/`，文件名为表中前缀加模式后缀；archive 自己的 result 在复制结束后生成，留在同名 `.local/checks/WATER-W8-K5/`，归档索引记录本次复制结果。未为补单再运行 baseline。

### 负控、原字节恢复与哈希

两次均只改 `apps/water/host/src/commands.rs` 中一个真正调用的生产语句，测试不改；红后立即执行 `git -c core.hooksPath=NUL -c core.fsmonitor=false checkout -- apps/water/host/src/commands.rs`，核对 SHA-256 后立刻运行完整 `--mode test`。没有用编译错误、超时或开关造红。

nc1 的单处变更：

```rust
// 原文
        args["excludeItemIds"] = json!(ids);
// 临时改坏：不再发送 excludeItemIds（错误地写入 groupIds）
        args["groupIds"] = json!(ids);
```

失败位于 `host_service_wiring`，原文：

```text
assertion `left == right` failed: HOST_M3C_EXCLUDE exact payload, preserving list order and values
```

实际参数缺少 excludeItemIds，groupIds 被错误覆盖，断言直接拒绝。Cargo 101；其余四测通过。

nc2 的单处变更：

```rust
// 原文
    backend.call("skip_remove", json!({"skipId": skip_id}))
// 临时改坏
    backend.call("skip_remove", json!({"itemId": skip_id}))
```

失败位于 `host_command_registry`，原文：

```text
assertion `left == right` failed: HOST_M3C_SKIP exact command names, keys and values
```

Cargo 101；其余四测通过。

- 两次恢复后 `src/commands.rs` 的独立 SHA-256 都为 `80a4c9fddc6b791709fb8e257a0344bfae08e72cce15a47d782705840b380f0a`，与变异前一致。
- 本轮 `tests/host_v1.rs` 独立 SHA-256 为 `9bfe297550fafcab4f2441af5687f75f5c7f55f83057830f237d351da7688ec5`，两条红及全部绿门均未再改测试。
- 正常生产聚合摘要为 `18cc6cc5e242d02dfaba6c41f77e05e1a8b13fd7f030c89e97bd14089c8c4fae`；测试聚合摘要为 `c08889d53c2bde1027f463f747369807277767b5991e8a77efad80889aad5077`。两个恢复五测和三个 final 均与之相同。
- nc1 生产聚合摘要 `6667432cc1c38041476cf9f3922cd24504bc67d315d336689b2e14815bce0b10`；nc2 为 `3ca8e150365855c29f4b1c413dc9fee8712df9cd332c85fa53e1be39215359d5`。这些聚合摘要与上面的独立文件哈希是不同口径。
- `test --final` 的 `proofAudit` 逐条绑定本表两份 red 回执及紧接的恢复 test 回执，并核对其源快照哈希。

### 唯一原生窗口：九步、记录和截图

native final 只运行一次，应用 PID 25188；窗口预算 1/1，目录选择框 0。gate 总耗时 79.351 秒；从启动应用至退出的 `nativeWallMs` 为 **62,683 ms**。应用正常 exit 0、signal null，观察器 exit 0；没有终止应用。Mica backdropType=2；实际主窗口 1，rawWindows=2 / eventTargets=1 为检查器接受的窗口根记录。results 截图时恢复同一窗口一次，没有新开窗口。

夹具为检查器本轮新建的 `.local/w8-k5-native/2026-10-31T15-47-47.118Z-18460-fixture/`，合计 6 个文件，年龄 72 小时。七个分类全部关闭，只能选中夹具缓存。真实受保护位置仍按原服务规则只读统计名字、大小等元数据，回执 `realDataRead=true`；没有读取其内容或将其纳入清理。

| 步骤 | 实际操作/等待 | 通过 | 观察器耗时 ms |
|---|---|---|---:|
| 1 | 等首页“开始一次体检”，无服务连接错误；home 截图 | 是 | 1799 |
| 2 | 调用“开始体检” | 是 | 131 |
| 3 | 等“本次体检共识别”；results 截图 | 是 | 51454 |
| 4 | 调用“清理所选” | 是 | 78 |
| 5 | 等永久删除告知；confirm 截图 | 是 | 1246 |
| 6 | 调用“永久删除 3 MB” | 是 | 74 |
| 7 | 等“清理完成”；done 截图 | 是 | 1332 |
| 8 | 调用“查看清理记录” | 是 | 71 |
| 9 | 等记录页文案；history 截图 | 是 | 940 |

夹具核对：`projA/build-cache` 已删除；`projA/src/main.rs`、`lab/profile-a/Local State`、`lab/profile-a/Default/Preferences` 保留且长度正确。仅一项 planned item，状态 deleted，failed_entries=0；clean 状态 completed，精确释放 **3,145,815 字节**。scans、snapshots、plans、cleans、journal 各一份；日志同时有 intent 与 result。私有 WebView 目录已观察到，六个 WebView 子进程退出后 remaining=[]。

五张截图均为 1568×1072，已逐张查看；以下链接均指向归档原字节：

- [home](../../acceptance/wave8/k5/receipts/2026-10-31T15-47-47.118Z-18460-home.png)：首页与“开始体检”。
- [results](../../acceptance/wave8/k5/receipts/2026-10-31T15-47-47.118Z-18460-results.png)：推荐清理 3 MB、已选 1 组 3 MB，真实保护项不可选。
- [confirm](../../acceptance/wave8/k5/receipts/2026-10-31T15-47-47.118Z-18460-confirm.png)：只列带缓存标记的目录、1 组 1 项 3 MB，永久删除告知及确认按钮。
- [done](../../acceptance/wave8/k5/receipts/2026-10-31T15-47-47.118Z-18460-done.png)：清理完成、3 MB 已释放、该缓存组已清理。
- [history](../../acceptance/wave8/k5/receipts/2026-10-31T15-47-47.118Z-18460-history.png)：一条清理完成记录与一条体检记录。

原始 UIA 回执为 `receipts/2026-10-31T15-47-47.118Z-18460-uia.json`；gate 回执为相同前缀的 `native-result.json`。截图各自 SHA-256 在 gate 回执和 ARCHIVE.json 中，归档后已复核全部 266 项大小与 SHA-256，均一致。归档含历史回执，不把历史临时草稿测试当本轮绿门。

### 边界与未验证项

- 没有改 capabilities、CSP、导航、窗口安全、依赖、Cargo.lock、其它包、UI、契约、检查器或主线台账。BackendSlot 只加注释；关窗、退出和服务生产逻辑保持。
- 排除/跳过的新命令已通过真实宿主适配器与记录后端验证；本次 native 使用基线 UI/服务，不验证 M3C 整合链路。真实排除/持久跳过仍待总控合入后整合检查。
- macOS、真实系统关机、真实目录选择框、生产竞态、清理中关窗、第二实例、失败后端 UI 和 release 打包均未在本轮原生窗口验证。
- 未删除任何真实用户垃圾；应用清理只发生在本轮合成夹具缓存。其余夹具、日志、构建缓存和私有 profile 保留，没有手工清理目录。
- 没有 push、merge、rebase、amend、reset、squash、强制操作或远端/配置修改。实现提交与交付提交的身份只在各次提交进程里设为 `Codex GPT-6 <codex-gpt-6@localhost>`。
- 一个辅助元数据日志的尾读命令耗时过长，已仅终止本轮自有的该读取进程 PID 15992；不是测试失败，也不是终止 Water。所有检查已结束，没有保留本轮自有后台进程，不再运行测试。
- 交付暂存时，默认 `git diff --cached --check` 返回 2：native 原始 UIA JSON 及 native-6/native-7 两份日志保留了 PowerShell 的 CRLF，在归档 `-text` 属性下被 Git 报为行尾空白。没有改动这些证据字节或哈希；产品/回执的定向 whitespace 检查为 0，另以仅本次进程的 `git -c core.whitespace=cr-at-eol diff --cached --check` 正确认识 CRLF 后核对全部交付。该检查不是产品门，不改变仓库配置或三个 final 的结果。

本回执交回表示执行者完成，仍由总控独立验收与集成。
