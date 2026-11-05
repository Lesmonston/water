WATER-W10-M1 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m1/docs/dispatch/reports/WATER-W10-M1-REPORT.md

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
