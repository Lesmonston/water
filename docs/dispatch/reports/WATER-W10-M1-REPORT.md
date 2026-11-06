WATER-W10-M1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md

当前交回为文末“补单 04”。原有各节保留在下，属于历史状态。

## 身份与交回范围

- 日期：2026-11-05。
- 执行者：Codex，实际模型 GPT-6；运行环境未提供更细的模型型号。
- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m1`。
- 分支：`worker/water-w10-m1`。
- 首次 HEAD：`f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe`，开工时干净，与票面精确一致。
- 实现提交 SHA：无。发现旧断言授权冲突后停止实现；本次仅提交本受阻回执。
- 状态：受阻，未完成，不代表总控验收通过。
- 只读辅助：使用一个同模型子代理审阅 M1 契约、生产代码和测试；禁止其编辑、构建、测试及开始 M2。主执行者复核了以下源文件位置。辅助已经结束，没有实现子代理或后台测试。

## 停工依据

权威 SPEC `F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md:216–223` 逐项列出可修改的旧断言，并明确：

> 上面没有覆盖、却必然要改的旧断言：先写受阻回执。

执行者规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md:40` 同样要求：

> SPEC 没想到、但因本单改动而必然要改的旧断言：先写受阻回执，不要自行改。

本次没有扩大这份授权，没有改旧断言或冻结契约。

### 1. 必须追加的新规则与原有 Agent 尾段断言冲突

`packages/junk-rules/tests/rules_v1.rs:2035–2042` 原有断言为：

```rust
assert_eq!(
    rules.rules()[64..]
        .iter()
        .map(|rule| rule.rule_id.as_str())
        .collect::<Vec<_>>(),
    AGENT_RULE_IDS,
    "RULES_AGENT_TOOLS: appended rule order"
);
```

`AGENT_RULE_IDS` 在同文件第 2901 行定义为固定 14 项，最后一项是 `other-agent-sessions`。

SPEC 第 6 节第 141 行又要求 32 条新规则追加在文件末尾、`other-agent-sessions` 之后。对工作树种子 JSON 的只读计数得到：

| 项目 | 开工值 | 按 SPEC 追加后的必然值 |
|---|---:|---:|
| 全部规则 | 78 | 110 |
| `rules()[64..]` 项数 | 14 | 46 |
| 原 `AGENT_RULE_IDS` 项数 | 14 | 14 |

因此，只要按规定追加全部规则，这条原断言就不可能通过。这是静态推导，未伪称已经运行新实现得到失败。

SPEC 第 9 节允许改规则总数、custom 数量/顺序、版本、第 5 节列出的字段、补新字段缺省值、盘根 base 断言；没有明确授权修改这条非 custom 的完整尾段 ID 断言。现有 M3D 文档关于下标移动的授权仅针对当时在下标 62、63 插入两条规则，也不能覆盖本次在末尾追加 32 条。

### 2. 旧条件校验循环只认识旧的两条规则

同测试文件第 104–119 行的 `m3d_conditions_json` 只接受 `node-modules`、`test-browser-profiles`，其它 ID 直接 `panic!("RULES_M3D_CONDITIONS: unexpected rule")`。

第 1184–1186、1230–1251 行却对计划中所有带条件的 marker 目标调用它，并按旧四类条件拼接字节顺序。SPEC 第 6 节新增的 `custom-avd-snapshots`、`embedded-browser-cache`、`app-old-versions` 等同样带条件；按要求生成计划后会进入该循环。

让这段旧测试兼容新增种子，需要扩展其期望值/条件键处理，或把旧循环限定到原有目标并对新目标独立断言。这不只是给结构字面量补缺省字段，请总控在补单中明确修改范围。

### 3. 旧兼容性夹具删除所有条件，但会留下新增兜底

同测试文件第 1264–1276 行从当前 embedded 规则构造 `legacy_rules_json`，只移除 `bundled-node-modules`、`browser-data-dirs`，随后删除所有剩余定位器的 `conditions`，并要求 `RuleSet::from_json` 成功。

SPEC 第 6 节第 17、18 条及第 189 行要求新增 `partial-downloads` / `unfinished-downloads` 成对存在，主规则每个定位器必须带条件。上述旧夹具会保留这两个新规则、删除主规则全部条件、保留兜底引用。严格实现新校验后，该夹具必然被拒。

要继续需要明确允许把这份旧兼容性夹具固定到原 78 条规则再作原变换，或允许等价的夹具调整；不能为了通过旧夹具放宽生产兜底校验。

## 最小补单建议（未实施）

1. 明确允许将原 Agent 顺序断言限定为原片段 `rules()[64..78]`，保留 14 个 ID、顺序与原标记；新增 32 条另按 `RULES_M35_SEEDS` 核对。
2. 明确旧 M3D 条件期望/键顺序循环如何覆盖新增目标，保留旧目标的原有断言与标记，新目标按 M35 独立核对。
3. 明确允许将旧兼容性夹具的输入固定为原 78 条，再移除旧两条兜底和条件，保留旧兼容性断言及标记。

请由总控冻结编号补单与受影响的授权范围；本执行者未修改票面、SPEC、检查器或台账。

## 已执行的检查与证据

所有命令均在 M1 工作树根执行。没有进入 M2 工作树运行命令。

| 命令/只读检查 | 结果 |
|---|---|
| `git rev-parse --show-toplevel` | 退出 0，指定 M1 工作树 |
| `git branch --show-current` | 退出 0，`worker/water-w10-m1` |
| `git rev-parse HEAD` | 退出 0，精确票面基线 |
| `git status --porcelain=v1` | 开工与写报告前均为空 |
| `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M1 --mode baseline` | 退出 0，`status: passed`，`finalGate: false` |
| 对票面、SPEC、测试、代码的 `Get-Content` / `rg -n` | 仅静态阅读与定位上述冲突 |
| `windows.json` 经 PowerShell `ConvertFrom-Json` 内存计数 | 78 条，原尾段 14 条，末条 `other-agent-sessions`；追加后尾段按算术为 46 条 |
| `Get-FileHash -Algorithm SHA256` | 下列三个文件哈希留档 |

baseline 回执保留于：

`.local/checks/WATER-W10-M1/2026-11-05T08-44-01.623Z-18424-baseline-result.json`

同目录日志：

- `2026-11-05T08-44-01.623Z-18424-baseline-1.log`：定位 Cargo，退出 0。
- `2026-11-05T08-44-01.623Z-18424-baseline-2.log`：定位 rustc，退出 0。
- `2026-11-05T08-44-01.623Z-18424-baseline-3.log`：rustc 版本，退出 0。

baseline 明确记录 `productTestsRun: false`、`realDataRead: false`，以及 9 个已知位置存在性布尔值均为 true（含 `system_drive`）；这不是 `real --final` 的结果，也不证明新功能可用。

| 文件 | SHA-256 |
|---|---|
| `packages/junk-rules/tests/rules_v1.rs` | `eaf64136ac8c2f5301ae58b92cb5a9551f92ac77ca03bce27b53ed51bc1dc860` |
| 权威 `contracts/m35-v1/RULES-M35.md` | `3dfc034799404b45dbd19b7e44f99dc1875584e7b87285cdcd53340af9193a17` |
| 上述 baseline JSON | `e23b173121bfe6c6ae77272686735fa0a1d78d4e760f64eb7a7358f04ed841d5` |

## SPEC 逐节状态与未验证项

| SPEC 节 | 状态 |
|---|---|
| 1 新字段 | 已读，未实现、未验证 |
| 2 `root_levels` | 已读，未实现、未验证 |
| 3 新定位 | 已读，未实现、未验证 |
| 4 解锁与会话开关 | 已读，未实现、未验证 |
| 5 既有规则调整 | 已读，未改种子或旧断言 |
| 6 32 条新规则 | 已读，追加要求与旧测试存在上述冲突，未追加 |
| 7 计划 JSON | 已读，未实现、未验证 |
| 8 数据版本 | 已读，未修改 |
| 9 测试 | 静态定位到未明确授权的必改旧测试，依规定停工；精确四测未运行 |
| 10 负控与真实冒烟 | 未运行 nc1、nc2、test 恢复、real 或任何 final |
| 11 审定说明 | 已读，无产品改动 |

旧断言修改清单：无，全部保持原字节。负控改动、失败信息与恢复哈希：不适用，未注入负控。`lock`、`check`、`test`、`real`、final、`archive` 均未运行，未生成归档证据，不将 baseline 冒充完整验收。

未创建合成夹具、未执行删除、未读真实用户文件内容，未启动原生窗口、选择框或浏览器，未下载依赖。Windows 新功能、macOS、与扫描/服务的集成均未验证。未 push、merge、rebase、改写提交、修改 Git 配置或远端。

按用户“某一张受阻就停下”的指令，WATER-W10-M2 未开始，未读其工单，未在其工作树写入或运行检查。交回本报告后停止本轮工作。

## 补单 01（2026-11-05）：续做检查后再次受阻

以上保留为上一轮 `8dab9d76` 的历史回执。本节是补单 01 的本次交回，未将历史受阻改写为完成。

### 续做身份与范围

- 实际模型：GPT-6（Codex；运行环境未提供更细型号）。
- 权威补单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M1-ADDENDUM-01-20261105.md`。
- 工作树/分支：`F:/new/smaltalk/water/.worktrees/w10-m1` / `worker/water-w10-m1`。
- 续做实际 HEAD：`8dab9d762744701c3747b507074d053d09b6daa8`，开工时干净，符合指定续做起点。
- 依次阅读原票、执行者规则、RULES-M35 全文及原票有效契约、补单 01、上一轮回执；复核生产接口及指定测试相关段落。
- baseline 沿用上节通过的记录，按补单“不用重跑”未重跑。
- 使用原只读辅助核对旧断言范围；未授予其编辑、构建、测试或 M2 权限，已结束辅助。
- 实现提交 SHA：无。本轮仍在实现前发现必须修改、但补单未明确授权的旧断言；只新增本报告提交。

### 补单已经解决的三处

补单 01 明确批准的三处与上一轮报告一致。以下记录批准的原文与新文，**本轮尚未应用**，避免误报已实现：

| 位置 | 原文/行为 | 补单批准的新文/行为 |
|---|---|---|
| `rules_v1.rs:2036` | `rules.rules()[64..]` 与固定 14 个 `AGENT_RULE_IDS` 比较 | `rules.rules()[64..78]`，保留原 ID、顺序、标记 |
| `:1169–1263` 的旧条件循环 | 所有 marker 目标进入旧条件与字节顺序校验，带条件时调用只认识旧两条规则的 helper | 循环只处理 `node-modules`、`test-browser-profiles`；旧断言、期望、标记与 helper 的 panic 分支保留；新目标独立按 M35 校验 |
| `:1264–1287` 的旧兼容夹具 | 从当前全部规则移除旧两条兜底，再删除全部条件；当前计划未排除新增规则目标 | 先截取前 78 条再作原变换；比较仅涉及原 78 条生成的目标，按 `target_id` 对齐 |

### 新发现的两处必改旧断言

补单 01 第 20 行明确“除此之外仍只有 SPEC 第 9 节获准的三类”，第 45 行明确受阻时不得自行变通；执行者规则第 2 节与 SPEC 第 9 节仍要求未覆盖的必改旧断言先交受阻回执。

以下两处是同一份指定测试 `rules_resolve_plan` 中的另一段逻辑，既不是补单批准的 `rules()[64..78]`，也不是旧条件循环或旧兼容夹具。

**A. 旧 Agent 计划目标仍被当作整个计划尾段，要求恰好 38 项。**

`packages/junk-rules/tests/rules_v1.rs:1573–1578` 原文：

```rust
let appended = &plan.targets[beta_position + 7..];
assert_eq!(
    appended.len(),
    38,
    "RULES_AGENT_TOOLS: appended target count"
);
```

SPEC 第 6 节规定在旧最后规则之后追加 32 条。即使会话开关全部关闭，新规则中的固定 pattern 目标仍必须生成，例如 `chromium-partition-cache`、`pagefile`、`minimax-hub-leftover`、`system-tmp-chrome-profiles`；它们都落在这个不设终点的尾段中，尾段必然超过原 38 项。

这里核对的是旧 Agent 全尾段，不是 custom 目标总数或 custom root 顺序；不能把 SPEC 第 9 节针对 custom 计数/顺序的授权扩展到它。补单 01 第 1 条只批准规则 ID 切片的终点，没有批准这个目标切片的终点或 38 的断言。

**B. 整个计划的最后目标仍必须来自旧最后规则。**

`packages/junk-rules/tests/rules_v1.rs:1616–1620` 原文：

```rust
assert_eq!(
    plan.targets.last().map(|target| target.target_id.as_str()),
    Some("other-agent-sessions#3"),
    "RULES_AGENT_TOOLS: final appended target"
);
```

新规则表的第 32 条是 `system-tmp-chrome-profiles`，定位为 `system_drive` 上的 `tmp/chrome_*`，不受会话开关限制。按规则顺序生成计划后，整个计划的最后目标必为 `system-tmp-chrome-profiles#1`。因此保留上述整计划末项断言不可能满足 SPEC 第 6、7 节。

以上是从冻结测试与 SPEC 推出的必然冲突；未运行新实现，不将推导描述为已执行的失败测试。不能通过漏生成新目标、改变顺序或删除旧断言来避开。

### 最小补充需求（未实施）

建议后续编号补单明确允许这两处共同保留旧 Agent 测试的原有语义，例如：

```rust
let appended = &plan.targets[beta_position + 7..beta_position + 7 + 38];
// 原 appended.len() == 38 及逐个字段核对原样保留。
assert_eq!(
    appended.last().map(|target| target.target_id.as_str()),
    Some("other-agent-sessions#3"),
    "RULES_AGENT_TOOLS: final appended target"
);
```

另以 `RULES_M35_SEEDS` 核对全部新增目标的顺序、数量和整计划末项，不删减新覆盖。此处只是具体可审阅的补单建议，未改测试、生产代码或冻结文件。

### 本轮命令、证据与未完成事项

| 命令/检查 | 结果 |
|---|---|
| `git rev-parse --show-toplevel` | 退出 0，指定 M1 树 |
| `git branch --show-current` | 退出 0，`worker/water-w10-m1` |
| `git rev-parse HEAD` | 退出 0，`8dab9d762744701c3747b507074d053d09b6daa8` |
| `git status --porcelain=v1` | 开工与写本节前均为空 |
| `git diff --name-only 8dab9d762744701c3747b507074d053d09b6daa8 HEAD` | 写本节前为空，未新增实现提交 |
| `Get-Content -Encoding UTF8`、`rg -n` | 只读必读材料、代码和上述断言位置 |
| `Get-FileHash -Algorithm SHA256` | 测试文件仍为 `eaf64136ac8c2f5301ae58b92cb5a9551f92ac77ca03bce27b53ed51bc1dc860`；补单 01 为 `21f86b8fddd19b8ba542359f741389b21a82df6a293d0b8818215b3495ddebb0` |

本轮 SPEC 第 1～8 节均未实现：新字段、`root_levels`、定位、会话与解锁、旧规则调整、32 条新规则、计划 JSON、数据版本全部保持基线。SPEC 第 9 节及补单批准的旧测试尚未修改，实际旧断言修改清单仍为空。

本轮没有运行 `lock`、`check`、`test`、`real`、nc1/nc2、任何 final 或 `archive`；没有负控失败记录或恢复哈希，没有真实冒烟结果，没有新归档证据。没有创建夹具、删除、启动窗口/选择框/浏览器、下载或扫描真实数据。没有修改依赖、锁、其它包、契约、检查器、台账、Git 配置或远端，没有 push 或改写提交。

Windows 新功能、macOS 和集成均未验证。按用户顺序约束，M1 补单 01 受阻后停止，M2 未开始，未读其工单、未进入其工作树执行命令。本轮只提交该受阻回执，交回后停止工作。


## 补单 02（2026-11-05）：实现完成，交回 SUBMITTED

实际模型：GPT-6（Codex；环境未提供更细型号）。工作树 `F:/new/smaltalk/water/.worktrees/w10-m1`，分支 `worker/water-w10-m1`。续做起点 `a62e87ce9a21ba3a7ab2b45b0f9f2d5a785a7a80`，开工干净；原始产品基线仍为 `f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe`。核心实现 `fe14dfb95380ac62d66b8af27c8d23f528ebf209`，最终实现提交 **`99f5d3aeec17e6833eddc65c25edaf06386bc591`**（后者仅校正五条新增会话规则的说明）。回执/证据另行提交，不夹带产品变更，不自报总控验收通过。

已读材料沿用前两轮读过的全文，核对原票/执行者规则/SPEC/补单 01 的哈希未变，并阅读补单 02 与上一轮回执。baseline 按补单不重跑。

### SPEC 第 1～8 节落实

| 节 | 实现与验证 |
|---|---|
| 1 新字段 | Rule 增加全部规定字段，AgeBasis/KeepBy 从 crate 根导出。m35.rs 校验类型、范围、级别、分类与 installed_names 的大小写去重（含 Unicode）；规则显式默认字段也受出现条件限制。文案与安装名称不进计划。 |
| 2 root_levels | InUse 增加 Option<u8>，只接受 runs_from_or_references_item 的 1～6；规则与计划共用解析器，None 省略。测两端、越界、类型与其它模式拒收。 |
| 3 定位 | 两种 marker、四种条件及白名单、custom_discovery、SystemDrive 已实现。KNOWN_FOLDER_ORDER、KnownFolders 字段/JSON 不变。tmp、Temp 命中，Templates 不命中；盘根来自 windows，含异盘测试；原 MatchSpec 变体和字段保持。 |
| 4 解锁/会话 | 严格核对清理级别、同分类受保护规则、全部定位器严格位于其内；计划携带对应全部目标 ID。五种工具默认关，resolve_plan_with 校验工具、重复、1～365 天与固定错误路径；会话目标按规则顺序追加，普通目标逐个不变，天数转小时。 |
| 5 既有规则 | 只改表内字段。headless 8→12 个定位器；jest 两个 base 各三个模式、any/168h/Node 引用检测及指定说明；浏览器解除条件、建议与保留规则逐字测试。test-browser-profiles 的 path_has_any 未扩展。 |
| 6 新种子 | 精确追加 32 条，前 78 条顺序保留，合计 110。独立冻结表逐项核对 ID、标题、分类、级别、类型、年龄、保留、在用/根层数、定位及条件；核对文案、来源、会话/解锁对、双定位兜底下标。两个普通 custom root 总目标 323，新增尾段 54 个，末项 system-tmp-chrome-profiles#1。 |
| 7 JSON | plan_version 不变；新增键按顺序、缺省省略。固定旧 JSON 字符串逐字节比较及全部新字段往返。项目声明 pattern 条件保存在 Target.pattern_conditions，序列化进 match.conditions，仅 custom 的单一 sibling_without_suffix 可读；MatchSpec 不加变体或字段。 |
| 8 版本 | data_version 为 2026-11-02.2，嵌入规则与计划同步，新 RULES_M35_VERSION 及旧版本断言通过。 |

只读辅助审阅生产代码与种子，未编辑、构建或测试。采纳并复核：规则显式默认字段的出现条件、安装名称 Unicode 大小写去重、会话文案按年龄与路径引用描述实际检测。辅助已结束，无内部实现子代理。

### 旧断言修改清单

位置用原始 `f93afb8e` 的 `tests/rules_v1.rs`。文末附原有部分的完整统一 diff，逐处给出原文/新文，所有旧标记不变。

| 授权/位置 | 原值或原文 | 新值或新文 |
|---|---|---|
| SPEC §9，1033 | embedded.rules().len() == 78 | == 110 |
| SPEC §9，1292 | expected == 261 | == 323；已有定位器增 8、新增默认目标增 54 |
| SPEC §9，1295、1299、1749、1787 | 2026-11-02.1 | 2026-11-02.2，四处原标记不变 |
| SPEC §9，1796 | custom 规则数 8 | 23 |
| SPEC §9，1681、1696 后 | drive marker 数 8、原 8 个顺序 | 数 25，原 8 个之后按新规则顺序追加 17 个；逐个 ID 见 diff |
| SPEC §5/9，四个 seed 期望 | codex-runtimes/electron-app-cache/agent-tool-logs/electron-gpu-caches 的 InUseMode::None | RunsFromOrReferencesItem；其余旧字段原样 |
| SPEC §5/9，headless seed 期望 | 原 8 个定位器 | 原 8 个后加 system_temp:scoped_dir*、system_temp:*chrome_profile*、user_temp:scoped_dir*、user_temp:*chrome_profile* |
| SPEC §5/9，jest seed/进程期望 | Dir、1h、None、空进程、两个 jest 字面定位 | Any、168h、CmdlineReferencesItem、[node.exe]、两个 base 各 jest * / haste-map-* / metro-* |
| SPEC 新类型相应，计数/摘要/旧 marker 序列化 match | 原枚举分支 | 补新定位/marker 分支；计数排除默认关闭会话，原 alpha/beta 不产生 custom_discovery（名称过滤另有新断言） |
| 补单 01 §1，2036 | rules.rules()[64..] | rules.rules()[64..78]；14 ID 与顺序不变 |
| 补单 01 §2，1167 起 | 所有计划目标进入旧条件循环 | 同 zip 后只选 node-modules、test-browser-profiles；旧断言、期望、标记、helper panic 分支原样 |
| 补单 01 §3，1266、1280 | 全部当前规则去旧兜底/条件；比较未排除新增规则目标 | 先 truncate(78) 再作原变换；只比原 78 条目标，按 target_id 查旧目标，不按相邻位置对齐 |
| 补单 02 §1，1573 | &plan.targets[beta_position + 7..] | &plan.targets[beta_position + 7..beta_position + 7 + 38]；38 及逐项字段核对原样 |
| 补单 02 §2，1617 | plan.targets.last() | appended.last()；other-agent-sessions#3 与标记不变 |
| 补单 02 §3 通则，2143 | rules.rules().len() == expected.len()（旧表 78 条） | rules.rules()[..78].len() == expected.len()；原 78 条逐字段比较保留，新 32 条另核 |

仍为精确四测：rules_schema_strict、rules_protection_precedence、rules_resolve_plan、rules_seed_coverage。新增 m35_schema/m35_resolve/m35_seeds 是四测内的 helper。无 ignore、过滤、删测、改超时或降低旧标记。

### 负控与恢复

两条均只改 `src/plan.rs` 一处，不改测试、不加测试开关；每条后立即 `git checkout -- packages/junk-rules/src/plan.rs`，再跑 `--mode test`。

1. nc1：默认包装调用的 `&PlanOptions::default()` 改为开启 claude-code/30 天的 PlanOptions。日志命中 **RULES_M35_SESSIONS: default off**；Cargo 101，2 通过、2 失败，另一个失败也是新种子计数断言。恢复后 4/4 绿。
2. nc2：名称判定 `name.eq_ignore_ascii_case(allowed)` 改成 `name.eq_ignore_ascii_case(allowed) || !allowed.is_empty()`，任意自选根均命中。日志命中 **RULES_M35_FIELDS: discovery name filter**，left 3 / right 2；Cargo 101，2 通过、2 失败，另一个失败也是新种子计数断言。恢复后 4/4 绿。

首次负控对应 10:00:57 / 10:01:32 UTC；会话文案校正后在最终实现提交重做，最终采用 **10:09:28.745 / 10:09:56.219 UTC** 的负控及紧随其后的 **10:09:38.479 / 10:10:01.545** 全绿记录。恢复后 plan.rs SHA-256 均为 **46ddd142207a916ae45fadaa1ba5d966f31ee357ba26a8ab76b4405a41d1f4cb**，与注入前相同。final test 已审计两条 observedExpectedFailure=true 与逐次恢复源快照；不是编译失败或超时。

### 真实冒烟、证据与限制

最终 `real --final` 输出只有 `base_present_count:87`、`literal_prefix_present_count:70`、`rule_count:110`、`system_drive_exists:true`。只用五个获准环境变量构造已知位置并检查存在性；没有列目录、读文件内容或输出实际路径/名字。存在性不代表新规则已找到可清理文件。

实现提交 `fe14dfb9` 上第一次三门全过后，校正了五条新增会话说明，新增 `99f5d3ae` 提交；没有改写历史。此前归档暂存于本树 .local，最终三门后恢复并用 archive 追加，保留早期检查历史。最终权威门为 **10:10:13.936 check --final、10:10:17.939 test --final、10:10:21.138 real --final**，均绑定 `99f5d3ae`。

修正回执编码时发现 PowerShell 向 Node 标准输入传中文会损坏字符；未提交损坏报告，改由 UTF-8 文件读写生成本节。一次 Python 辅助命令因本机无 python 而失败、未写文件；改用本树 Node 辅助。一次 rg 通配路径形式在 Windows 失败，改用 -g/--no-ignore 成功。没有改环境或下载依赖。

无物理夹具、删除、窗口、选择框、浏览器、联网下载或新系统函数。MatchSpec/InUseMode 无新增变体，KnownFolders 字段/JSON、Cargo.toml/Cargo.lock 不变。未改其它包、契约、检查器、台账、Git 配置/远端，未 push/merge/rebase/amend/reset。产品与测试仅改 junk-rules。

未验证实际扫描、新规则本机命中/可清理性、服务在用检测/安装应用匹配、真实会话清理、M1→M2→M7 集成、Windows 删除链或 macOS。root_levels/解锁服务接线仍待 M7，不称可发布。原始开发先红未单独留档，承重逻辑由本次生产负控证明。

下表自动列出全部检查记录与精确命令；08:18:39.503 baseline 是接手前预存记录，08:44:01.623 是本执行者上一轮 baseline，补单未重跑。其余为本轮执行。共同前缀为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M1`，表中列追加参数；检查入口全部退出 0（负控内 Cargo 预期 101）。普通 test 均 4/4，check 均 fmt/clippy 通过。`cargo fmt` 在实现期运行两次；`git diff --check` 与归档逐条大小/哈希也已核对。

M1 报告/证据提交并核对干净后按顺序开始 M2；M1 不再运行测试或后台进程。


| Receipt (UTC) | Arguments | Status |
|---|---|---|
| 2026-11-05T08-18-39.503Z-26060-baseline-result.json | --mode baseline | passed |
| 2026-11-05T08-44-01.623Z-18424-baseline-result.json | --mode baseline | passed |
| 2026-11-05T09-48-54.384Z-20988-lock-result.json | --mode lock | passed |
| 2026-11-05T09-56-35.507Z-19052-test-result.json | --mode test | passed |
| 2026-11-05T09-57-33.634Z-30856-check-result.json | --mode check | passed |
| 2026-11-05T09-59-15.610Z-24712-test-result.json | --mode test | passed |
| 2026-11-05T09-59-43.598Z-19728-check-result.json | --mode check | passed |
| 2026-11-05T10-00-57.205Z-31812-red-nc1-result.json | --mode red-nc1 | passed |
| 2026-11-05T10-01-11.579Z-22728-test-result.json | --mode test | passed |
| 2026-11-05T10-01-32.814Z-10616-red-nc2-result.json | --mode red-nc2 | passed |
| 2026-11-05T10-01-45.782Z-12208-test-result.json | --mode test | passed |
| 2026-11-05T10-02-16.076Z-30412-check-result.json | --mode check --final | passed |
| 2026-11-05T10-02-27.082Z-21944-test-result.json | --mode test --final | passed |
| 2026-11-05T10-02-40.203Z-12208-real-result.json | --mode real --final | passed |
| 2026-11-05T10-02-55.589Z-30200-archive-result.json | --mode archive | passed |
| 2026-11-05T10-09-28.745Z-9612-red-nc1-result.json | --mode red-nc1 | passed |
| 2026-11-05T10-09-38.479Z-7160-test-result.json | --mode test | passed |
| 2026-11-05T10-09-56.219Z-28512-red-nc2-result.json | --mode red-nc2 | passed |
| 2026-11-05T10-10-01.545Z-29648-test-result.json | --mode test | passed |
| 2026-11-05T10-10-13.936Z-5664-check-result.json | --mode check --final | passed |
| 2026-11-05T10-10-17.939Z-32008-test-result.json | --mode test --final | passed |
| 2026-11-05T10-10-21.138Z-28728-real-result.json | --mode real --final | passed |
| 2026-11-05T10-10-38.331Z-11872-archive-result.json | --mode archive | passed |

Archive: 342 entries, 9063332 bytes. All sizes/SHA-256 verified.

### Old test diff (blank context lines omitted)

```diff
@@ -270,4 +1300,5 @@ fn m3d_plan_targets(plan: &ScanPlan, roots: &[CustomRoot]) {
 #[test]
 fn rules_schema_strict() {
+    m35_schema();
     // Each rule in RULES-M3D sections 1 and 3 has an isolated rejection case.
     let pair = m3d_pair();
@@ -1031,5 +2062,5 @@ fn rules_protection_precedence() {
     assert_eq!(subset_set.rules().len(), 6);
     let embedded = RuleSet::embedded();
-    assert_eq!(embedded.rules().len(), 78, "seed set must load");
+    assert_eq!(embedded.rules().len(), 110, "seed set must load");
     let agent_rules: Value = serde_json::from_str(include_str!("../rules/windows.json"))
@@ -1075,4 +2106,5 @@ fn rules_protection_precedence() {
 #[test]
 fn rules_resolve_plan() {
+    m35_resolve();
     let rules = RuleSet::embedded();
     let folders = KnownFolders::from_json(&folders_json()).expect("folders");
@@ -1165,5 +2197,12 @@ fn rules_resolve_plan() {
     ScanPlan::from_json(&case_insensitive_root.to_string())
         .expect("RULES_M3D_FALLBACK: ASCII case insensitive root");
-    for (target, value) in plan.targets.iter().zip(wire["targets"].as_array().unwrap()) {
+    for (target, value) in plan
+        .targets
+        .iter()
+        .zip(wire["targets"].as_array().unwrap())
+        .filter(|(target, _)| {
+            ["node-modules", "test-browser-profiles"].contains(&target.rule_id.as_str())
+        })
+    {
         let match_json = &value["match"];
         match &target.match_spec {
@@ -1214,4 +2253,12 @@ fn rules_resolve_plan() {
                         format!("{{\"kind\":\"dir_name\",\"names\":{}}}", json!(names))
                     }
+                    Marker::DirNamePattern { patterns } => format!(
+                        "{{\"kind\":\"dir_name_pattern\",\"patterns\":{}}}",
+                        json!(patterns)
+                    ),
+                    Marker::FileName { patterns } => format!(
+                        "{{\"kind\":\"file_name\",\"patterns\":{}}}",
+                        json!(patterns)
+                    ),
                 };
                 let legacy = format!(
@@ -1265,4 +2312,5 @@ fn rules_resolve_plan() {
         serde_json::from_str(include_str!("../rules/windows.json")).unwrap();
     let old_rules = legacy_rules_json["rules"].as_array_mut().unwrap();
+    old_rules.truncate(78);
     old_rules.retain(|r| {
         !["bundled-node-modules", "browser-data-dirs"].contains(&r["rule_id"].as_str().unwrap())
@@ -1278,5 +2326,5 @@ fn rules_resolve_plan() {
         .expect("RULES_M3D_CONDITIONS: old plan");
     let legacy_wire: Value = serde_json::from_str(&plan_to_json(&legacy_plan)).unwrap();
-    for (target, value) in plan.targets.iter().zip(wire["targets"].as_array().unwrap()).filter(|(t, _)| !matches!(&t.match_spec, MatchSpec::Marker { conditions, fallback_for, .. } if !conditions.is_empty() || fallback_for.is_some())) {
+    for (target, value) in plan.targets.iter().zip(wire["targets"].as_array().unwrap()).filter(|(t, _)| rules.rules()[..78].iter().any(|r| r.rule_id == t.rule_id) && !matches!(&t.match_spec, MatchSpec::Marker { conditions, fallback_for, .. } if !conditions.is_empty() || fallback_for.is_some())) {
         let old = legacy_wire["targets"].as_array().unwrap().iter().find(|v| v["target_id"] == target.target_id).expect("RULES_M3D_CONDITIONS: legacy target");
         assert_eq!(value, old, "RULES_M3D_CONDITIONS: unchanged target fields");
@@ -1290,12 +2338,12 @@ fn rules_resolve_plan() {
     let expected = expected_target_count(&rules, custom.len());
     assert_eq!(plan.targets.len(), expected);
-    assert_eq!(expected, 261);
+    assert_eq!(expected, 323);
     assert_eq!(plan.plan_version, "water.scan-plan.v1");
     assert_eq!(
-        plan.rules_data_version, "2026-11-02.1",
+        plan.rules_data_version, "2026-11-02.2",
         "RULES_M3_WORDING: plan data version"
     );
     assert_eq!(
-        plan.rules_data_version, "2026-11-02.1",
+        plan.rules_data_version, "2026-11-02.2",
         "RULES_M3C_VERSION: plan data version"
     );
@@ -1571,5 +2619,5 @@ fn rules_resolve_plan() {
         );
     }
-    let appended = &plan.targets[beta_position + 7..];
+    let appended = &plan.targets[beta_position + 7..beta_position + 7 + 38];
     assert_eq!(
         appended.len(),
@@ -1615,5 +2663,5 @@ fn rules_resolve_plan() {
     }
     assert_eq!(
-        plan.targets.last().map(|target| target.target_id.as_str()),
+        appended.last().map(|target| target.target_id.as_str()),
         Some("other-agent-sessions#3"),
         "RULES_AGENT_TOOLS: final appended target"
@@ -1679,5 +2727,5 @@ fn rules_resolve_plan() {
     assert_eq!(
         markers.len(),
-        8,
+        25,
         "RULES_M3C_DRIVE_ROOT: all eight marker targets"
     );
@@ -1696,4 +2744,21 @@ fn rules_resolve_plan() {
             "custom:drive-f:bundled-node-modules#1",
             "custom:drive-f:browser-data-dirs#1",
+            "custom:drive-f:custom-app-backups#1",
+            "custom:drive-f:custom-avd-snapshots#1",
+            "custom:drive-f:embedded-browser-cache#1",
+            "custom:drive-f:quark-video-cache#1",
+            "custom:drive-f:app-old-versions#1",
+            "custom:drive-f:app-update-archives#1",
+            "custom:drive-f:game-logs#1",
+            "custom:drive-f:steam-logs#1",
+            "custom:drive-f:partial-downloads#1",
+            "custom:drive-f:partial-downloads#2",
+            "custom:drive-f:unfinished-downloads#1",
+            "custom:drive-f:unfinished-downloads#2",
+            "custom:drive-f:installer-files#1",
+            "custom:drive-f:installer-files#2",
+            "custom:drive-f:audition-peak-files#1",
+            "custom:drive-f:audition-conformed#1",
+            "custom:drive-f:media-render-caches#1",
         ],
         "RULES_M3C_DRIVE_ROOT: rule and root ID order"
@@ -1745,7 +2810,8 @@ fn rules_resolve_plan() {
 #[test]
 fn rules_seed_coverage() {
+    m35_seeds();
     let rules = RuleSet::embedded();
     assert_eq!(
-        rules.data_version, "2026-11-02.1",
+        rules.data_version, "2026-11-02.2",
         "RULES_M3D_VERSION: embedded version"
     );
@@ -1785,5 +2851,5 @@ fn rules_seed_coverage() {
     }
     assert_eq!(
-        rules.data_version, "2026-11-02.1",
+        rules.data_version, "2026-11-02.2",
         "RULES_M3C_VERSION: embedded version"
     );
@@ -1794,5 +2860,5 @@ fn rules_seed_coverage() {
             .filter(|rule| rule.category == Category::Custom)
             .count(),
-        8,
+        23,
         "RULES_M3C_WORKTREE: eight custom rules"
     );
@@ -2034,5 +3100,5 @@ fn rules_seed_coverage() {
     );
     assert_eq!(
-        rules.rules()[64..]
+        rules.rules()[64..78]
             .iter()
             .map(|rule| rule.rule_id.as_str())
@@ -2141,5 +3207,5 @@ fn rules_seed_coverage() {
         }
     }
-    assert_eq!(rules.rules().len(), expected.len());
+    assert_eq!(rules.rules()[..78].len(), expected.len());
     for (index, spec) in expected.iter().enumerate() {
         let rule = &rules.rules()[index];
@@ -2171,4 +3237,5 @@ fn expected_target_count(rules: &RuleSet, custom_roots: usize) -> usize {
         .rules()
         .iter()
+        .filter(|rule| rule.session_tool.is_none())
         .map(|rule| {
             rule.locate
@@ -2176,4 +3243,5 @@ fn expected_target_count(rules: &RuleSet, custom_roots: usize) -> usize {
                 .map(|locator| match locator {
                     Locator::Marker { .. } => custom_roots,
+                    Locator::CustomDiscovery { .. } => 0,
                     _ => 1,
                 })
@@ -2191,4 +3259,7 @@ fn locator_summary(rule: &water_junk_rules::Rule) -> Vec<String> {
             }
             Locator::Discovery { base } => format!("discovery:{}", base.as_str()),
+            Locator::CustomDiscovery { root_names } => {
+                format!("custom_discovery:{}", root_names.join(","))
+            }
             Locator::Marker {
                 marker, max_depth, ..
@@ -2205,4 +3276,10 @@ fn locator_summary(rule: &water_junk_rules::Rule) -> Vec<String> {
                     format!("marker:dir_name:{}:{max_depth}", names.join(","))
                 }
+                Marker::DirNamePattern { patterns } => {
+                    format!("marker:dir_name_pattern:{}:{max_depth}", patterns.join(","))
+                }
+                Marker::FileName { patterns } => {
+                    format!("marker:file_name:{}:{max_depth}", patterns.join(","))
+                }
             },
         })
@@ -2250,4 +3327,5 @@ fn processes_for(id: &str) -> Vec<&'static str> {
         }
         "firefox-cache" => vec!["firefox.exe"],
+        "jest-cache" => vec!["node.exe"],
         "test-browser-profiles" => vec!["chrome.exe", "msedge.exe"],
         _ => {
@@ -2318,5 +3396,5 @@ fn seed_table() -> Vec<SeedSpec> {
             24,
             1,
-            InUseMode::None,
+            InUseMode::RunsFromOrReferencesItem,
             Growth::Slow,
             vec![p("user_profile", ".cache/codex-runtimes/*")],
@@ -2384,4 +3462,8 @@ fn seed_table() -> Vec<SeedSpec> {
                 p("user_temp", "playwright_chromiumdev_profile-*"),
                 p("user_temp", "puppeteer_dev_profile-*"),
+                p("system_temp", "scoped_dir*"),
+                p("system_temp", "*chrome_profile*"),
+                p("user_temp", "scoped_dir*"),
+                p("user_temp", "*chrome_profile*"),
             ],
         ),
@@ -2475,5 +3557,5 @@ fn seed_table() -> Vec<SeedSpec> {
         1,
         0,
-        InUseMode::None,
+        InUseMode::RunsFromOrReferencesItem,
         Growth::Slow,
         vec![
@@ -2713,10 +3795,17 @@ fn seed_table() -> Vec<SeedSpec> {
         Category::DevCache,
         Level::Recommended,
-        ItemType::Dir,
-        1,
+        ItemType::Any,
+        168,
         0,
-        InUseMode::None,
+        InUseMode::CmdlineReferencesItem,
         Growth::Slow,
-        vec![p("system_temp", "jest"), p("user_temp", "jest")],
+        vec![
+            p("system_temp", "jest *"),
+            p("system_temp", "haste-map-*"),
+            p("system_temp", "metro-*"),
+            p("user_temp", "jest *"),
+            p("user_temp", "haste-map-*"),
+            p("user_temp", "metro-*"),
+        ],
     ));
     rows.push(seed(
@@ -2989,5 +4078,5 @@ fn agent_seed_table() -> Vec<SeedSpec> {
             168,
             0,
-            InUseMode::None,
+            InUseMode::RunsFromOrReferencesItem,
             Growth::Slow,
             vec![
@@ -3008,5 +4097,5 @@ fn agent_seed_table() -> Vec<SeedSpec> {
             1,
             0,
-            InUseMode::None,
+            InUseMode::RunsFromOrReferencesItem,
             Growth::Slow,
             vec![
```

## 补单 03（2026-11-05）：完成，交回 SUBMITTED

- 实际模型：GPT-6（Codex，运行环境未提供更细型号）。只读辅助为继承的同模型，负责校验入口和旧循环审阅，未编辑、构建、测试或开始 M2，现已结束。
- 工作树 / 分支：`F:/new/smaltalk/water/.worktrees/w10-m1` / `worker/water-w10-m1`。
- 续做起点：`23cd89da24cd46bea0ec511aebb15039eac6a2c0`，开工干净。按补单顺序读原票、规则、RULES-M35 全文、前两张补单、本补单与历史回执；复核原票有效契约和 ADR。
- 实现提交：`72ac1178cd30adce9c4d27df988e2057eabfdbcb`。后续仅回执与归档证据提交；原提交和证据保留。

### 三项交付与旧断言改动

1. `windows.json` 的 `jest-cache` 两个 temp base 下首个定位改成 `["jest", "*"]`；`haste-map-*`、`metro-*` 不变，合计六个定位。`rules_v1.rs:3854`、`:3857` 的 `p("system_temp", "jest *")` / `p("user_temp", "jest *")` 分别改成 `p("system_temp", "jest/*")` / `p("user_temp", "jest/*")`（p 的斜线分段）。`:882` 起新增断言，精确核对 `jest-cache#1` / `jest-cache#4` 的 base 与两段 segments。复核所有其余含空格的段，`User Data`、`Profile *`、`Code Cache`、`CEF Cache` 等均为真实目录名，无需拆段。
2. `rules.rs:449` 在 discovery 解析时拒绝 `KnownFolder::SystemDrive`，返回 `RULES_INVALID_LOCATE`，指向 `/rules/<下标>/locate/<下标>`。其余八个 KnownFolder 经 JSON 解析时本来不接受盘根；`plan.rs:212` 另防御公开 KnownFolders 字段被手工构造为盘根，解析计划前同样拒绝并指回定位。`rules_v1.rs:238` 起新增两个 `RULES_M35_FIELDS` 反例，分别精确核对规则解析与手构 downloads 盘根的错误码、指针。没有放宽计划解析。
3. `rules_v1.rs:2243` 起的旧循环由只过滤两条 ID，改为原 `rules.rules()[..78]` 的全部 rule_id 成员。两处 `m3d_conditions_json` 调用显式限制在 `node-modules`、`test-browser-profiles`；旧 helper 的 panic 分支保留。其它 76 条的非 marker 形状、marker 字节、兜底线上 target ID、键顺序检查恢复执行，新增 32 条仍由 M35 核对。

按补单第 3 条修改的旧期望值：**无**。恢复整个旧循环后原期望全绿，兜底 ID 已使用完整 target ID，无需修订。原循环过滤器与两处 helper 调用范围的改动如上；没有删除、降低或改写旧标记。

### 检查命令与结果

所有检查在本树根目录执行。共同前缀：`node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M1`。下表时间为 UTC，完整原始 receipt / log / source snapshot 已 archive。

| Receipt 时间 / PID | 后缀参数 | 结果 |
|---|---|---|
| 12-14-01.475Z-29972 | `--mode test` | 新测试先红：2 通过、2 失败；精确复现 drive root discovery rejected 与 jest members in each temp base，编译成功 |
| 12-15-19.701Z-21404 | `--mode lock` | 通过，依赖与锁不变 |
| 12-15-23.620Z-17388 | `--mode test` | 通过，精确四测全绿 |
| 12-15-44.893Z-1164 | `--mode check` | fmt / clippy -D warnings / 政策通过 |
| 12-16-17.181Z-20272 | `--mode red-nc1` | 预期红，检查器通过；恢复测试时序不合格，未用于最终证据 |
| 12-16-25.837Z-27864 | `--mode test` | 四测通过；启动早于上一负控 receipt 完成，弃用该配对 |
| 12-16-56.612Z-2628 | `--mode red-nc2` | 有效负控，命中新字段标记，检查器通过 |
| 12-17-10.124Z-22048 | `--mode test` | 原字节恢复后四测通过 |
| 12-17-32.577Z-24016 | `--mode red-nc1` | 严格串行重做有效负控，检查器通过 |
| 12-17-39.771Z-5108 | `--mode test` | 原字节恢复后四测通过 |
| 12-17-56.158Z-7828 | `--mode check --final` | 通过，干净实现提交 |
| 12-18-07.553Z-23392 | `--mode test --final` | 四测通过，proofAudit 采用上面两组有效红绿 |
| 12-18-14.551Z-23036 | `--mode real --final` | 只读存在性冒烟通过 |
| 12-18-20.062Z-22584 | `--mode archive` | 通过；566 条 / 15,598,413 字节，逐条大小与 SHA-256 复核通过 |

另执行 `git diff --check` 通过。`cargo fmt` 首次因 cargo 不在 PATH 未执行，随后用检查器定位的 `C:/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/cargo.exe fmt --manifest-path packages/junk-rules/Cargo.toml` 成功。一次 rg Windows 通配路径与一次 Node -e 引号解析失败，均未改文件；改用 rg -g 与 PowerShell 完成取证与哈希复核。未下载或改环境。

### 负控、恢复与真实冒烟

- nc1 仅把 `src/plan.rs` 默认调用的空 PlanOptions 改成 claude-code / 30 天，真实默认计划错误产生会话目标。Cargo 101，命中 `RULES_M35_SESSIONS: default off`，另一个失败为新 `RULES_M35_SEEDS: whole plan count`。最终有效组为 12:17:32.578–12:17:39.196 红，12:17:39.774–12:17:49.578 绿。首次组有重叠，已保留并明确弃用。
- nc2 仅把 custom_discovery 名字比较改成 `name.eq_ignore_ascii_case(allowed) || !allowed.is_empty()`。Cargo 101，命中 `RULES_M35_FIELDS: discovery name filter` 与新种子计数标记。红在 12:17:03.985 完成，立即 checkout 恢复后 12:17:10.125 开始四测全绿。
- 每次恢复只运行 `git checkout -- packages/junk-rules/src/plan.rs`，恢复后的 SHA-256 均为 `66e2ea0ed0c0b0429d1081ee85d129edbe1c429a17035b7451d8e0b46aa17d1f`，与干净实现提交一致。未改测试造红、无编译失败或超时。
- final 均绑定 `72ac1178cd30adce9c4d27df988e2057eabfdbcb`。最终冒烟输出仅 `base_present_count:87`、`literal_prefix_present_count:70`、`rule_count:110`、`system_drive_exists:true`。

### 边界与未验证项

未建物理夹具、删除真实数据、列出或读取真实文件内容；无窗口、选择框、浏览器、联网下载或新系统函数。依赖、Cargo.lock、其它包、契约、检查器、台账、Git 配置与远端均未改；未 push、merge 或改写历史。

未验证本机 Jest 实际缓存命中、实际扫描/清理、M1/M2/M7 集成或 macOS。本单交回 SUBMITTED，验收由总控完成。报告与证据提交并核对干净后，才开始 M2 补单 01；本树不再启动测试或后台进程。

## 补单 04（2026-11-06）：完成，交回 SUBMITTED

- 实际模型：GPT-6（Codex，运行环境未提供更细型号）；未使用子代理。
- 工作树 / 分支：`F:/new/smaltalk/water/.worktrees/w10-m1` / `worker/water-w10-m1`。
- 续做起点：`2fd789d84177398f97cef2128c1326d4725697a8`，开工干净；按指定顺序读原票、规则、契约、补单 01～03、补单 04 与历史回执。原票 baseline 已通过，本次不重跑。
- 实现提交：`2d1c71b7d7d988a70f209753a571f964f30be6e5`。仅两处指定改动；原有提交与证据保留，后续提交仅含回执与归档。

### 两处改动

1. `packages/junk-rules/rules/windows.json:5210`：`jianying-cache` 第二个定位从 `["JianyingPro", "User Data", "CEF Cache"]` 改为 `["JianyingPro", "User Data", "CEF", "Cache"]`；第一个定位与全部其它规则不变。
2. `packages/junk-rules/tests/rules_v1.rs:708`：种子表第二个定位从 `JianyingPro/User Data/CEF Cache` 改为 `JianyingPro/User Data/CEF/Cache`。没有修改其它期望或测试。

补单 03 中将 `CEF Cache` 当作真实单段名字的历史判断由本补单纠正；其它含空格段照补单保留。冻结 SPEC 未改。

### 检查命令与结果

全部在 M1 工作树根执行，共同前缀为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M1`。下表 receipt 名省略 `2026-11-06T` 与 `-result.json`；完整命令、时间与日志已归档。

| Receipt | 参数 | 结果 |
|---|---|---|
| 04-07-55.945Z-3544-test | `--mode test` | 先改期望：退出 1，四测 3 过 1 失败；编译成功，`RULES_M35_SEEDS: locator` 精确指出旧单段与新两段不一致 |
| 04-08-25.343Z-15448-lock | `--mode lock` | 退出 0，依赖与锁不变 |
| 04-08-37.405Z-15908-test | `--mode test` | 修正规则后退出 0，精确四测通过 |
| 04-09-10.442Z-28996-red-nc1 | `--mode red-nc1` | 退出 0，有效目标红，Cargo 101 |
| 04-09-45.335Z-32400-test | `--mode test` | nc1 恢复后退出 0，四测通过 |
| 04-10-06.912Z-14956-red-nc2 | `--mode red-nc2` | 退出 0，有效目标红，Cargo 101 |
| 04-10-28.856Z-9528-test | `--mode test` | nc2 恢复后退出 0，四测通过 |
| 04-10-48.972Z-27732-check | `--mode check --final` | 退出 0，源码政策、fmt、clippy -D warnings 通过 |
| 04-11-13.461Z-22740-test | `--mode test --final` | 退出 0，四测通过；proofAudit 选用本轮上述两组严格串行红绿 |
| 04-11-45.328Z-18620-real | `--mode real --final` | 退出 0，只读存在性冒烟通过 |
| 04-12-11.380Z-33196-archive | `--mode archive` | 退出 0；累计 735 个条目、20,742,313 字节；逐条长度与 SHA-256 复核通过 |

三个 final 均绑定干净实现提交 `2d1c71b7d7d988a70f209753a571f964f30be6e5`。`git diff --check` 通过。只读查找不存在的 `index.json` 曾失败，实际归档索引为 `ARCHIVE.json`，已据此完成复核；无产品影响。

### 负控与恢复哈希

- nc1 只在 `src/plan.rs` 默认入口把 `PlanOptions::default()` 换为 claude-code / 30 天开关，让默认计划产生会话目标；命中 `RULES_M35_SESSIONS: default off`（另有新种子总数标记），非编译错误或超时。
- nc2 只把 custom_discovery 的名字过滤改为 `name.eq_ignore_ascii_case(allowed) || !allowed.is_empty()`；命中 `RULES_M35_FIELDS: discovery name filter`（另有新种子总数标记）。未修改测试造红。
- 每条负控退出后立即 `git checkout -- packages/junk-rules/src/plan.rs`，再独立运行 `--mode test`；两次恢复 SHA-256 均为 `66e2ea0ed0c0b0429d1081ee85d129edbe1c429a17035b7451d8e0b46aa17d1f`，与干净实现一致。
- 最终 `windows.json` SHA-256：`3ee42a081ab6e8b746321ee4e05be8ddb66aef8e8aa9495eb4671e219393fa6e`；`rules_v1.rs`：`3fc4de7e59caf2702c10f6020924e6a597fde9d8ab35b7d4cccf1817ae0a9b09`。

### 真实冒烟、边界与未验证项

冒烟只输出计数与布尔值：`base_present_count: 87`、`literal_prefix_present_count: 70`、`rule_count: 110`、`system_drive_exists: true`。它不证明本机剪映缓存实际命中；未列真实目录或读真实文件内容。

未建物理夹具、删除真实数据、打开窗口/选择框/浏览器、下载依赖、添加系统函数；未改契约、检查器、台账、其它包、Git 配置或远端，未 push、合主线或改写历史。未验证真实清理、M1/M2/M7 集成或 macOS。回执与证据提交并核实干净后交回本单，再开始 M2 补单 02；M1 不再运行测试或后台进程。
