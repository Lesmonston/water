WATER-W9-L2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l2/docs/dispatch/reports/WATER-W9-L2-REPORT.md

当前结论：补单 01 已完成，实现提交 `d9808f18fbfa84714f7a688ad18014f967aea566`；两个有效负控、逐次恢复五测及 check/test/real 三个 final 均通过。真实扫描结果为 partial，详见下文。以下原受阻记录保留为历史，补单 01 的完整交付记录追加在后。

日期：2026-11-02。执行者：Codex（GPT-6）。本回执记录开工检查发现的夹具约束冲突，未实现产品需求，未声称通过验收。

## 工作树与基线

- 工作树：`F:/new/smaltalk/water/.worktrees/w9-l2`。
- 分支：`worker/water-w9-l2`。
- 首次 HEAD：`57ecd7ce42a98f9932faecc69e5d82c648991669`，首次 `git status --short` 为空。
- 实现提交 SHA：无；产品、测试、依赖和锁文件均未修改。
- 已阅读权威工单、W9 执行者规则、SCAN-M3D、RULES-M3D、SCAN-M3C、SCAN 与 MODEL，以及指定扫描代码和原有测试；同时核对项目接手规则与 ADR-018。

## 阻塞原因与最小补充需求

权威工单 `docs/dispatch/tickets/WATER-W9-L2-SCAN-20261102.md:49` 要求“夹具只建普通文件与目录”；`docs/dispatch/W9-M3D-WORKER-RULES.md:48` 明确要求“L2 的夹具只建普通文件与目录，不创建联接或符号链接”。另一方面，工单要求完整运行现有精确五测，保留未获准修改的旧断言，且不得过滤测试。

基线中的 `packages/junk-scan/tests/scan_v1.rs` 包含以下不能原样运行而又遵守上述限制的用例：

| 位置（基线行号） | 原有行为 |
|---|---|
| `109–133` | `junction` 调用 `cmd /c mklink /J` 创建合成联接 |
| `914–920` | 必跑的 `scan_reparse_budget_cancel` 调用 `junction` 两次 |
| `1393` | `scan_overlap_and_guards` 调用的 `check_single_walk` 创建合成联接 |
| `1244–1279` | `scan_pattern_marker_discovery` 调用的 `check_unique_bytes` 经 `mklink /H` 创建合成硬链接，亦不属于仅普通文件与目录的夹具 |

SCAN-M3D 第 5 节只授权调整增长样例和补齐 Marker 字段，没有授权删除这些测试、移除链接或改变对应旧断言。将限制自行解释为“只约束新增夹具”需要补充说明；本回执未擅自采用该解释，也未运行这些用例。

最小补充：明确“普通文件与目录”只约束 W9-L2 新增夹具，允许原样运行既有五测中的受控链接夹具；若限制也适用于旧测试，则需总控补充不创建链接的替代验收范围与获准修改项。执行者不修改工单、契约、检查器或台账。

## 已执行检查

在指定工作树根目录执行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W9-L2 --mode baseline
```

退出码 `0`，`status: passed`。回执：`.local/checks/WATER-W9-L2/2026-11-02T03-49-49.157Z-9548-baseline-result.json`。其中首次与结束 HEAD 均为指定基线、状态均为空，`offlineCache: complete`，`realDataRead: false`，`productTestsRun: false`。baseline 只说明环境与冻结输入就绪。

随后执行同一入口的 `--task WATER-W9-L2 --mode archive`，退出码 `0`，`status: passed`。归档索引 `docs/acceptance/wave9/l2/ARCHIVE.json` 记录 8 个文件、9,466 字节，包含派前总控留下的 `03-43-59.952Z-37748` baseline 与本次 `03-49-49.157Z-9548` baseline；前者不是执行者本次运行的检查。归档只包含这两组 baseline 的原字节日志与回执，不代表产品测试或 final 通过。archive 自身回执在 `.local/checks/WATER-W9-L2/2026-11-02T03-52-01.127Z-12940-archive-result.json`。

## 未完成与未验证

- SCAN-M3D 第 1 节计划字段及校验、第 2 节条件判断、第 3 节兜底路由、第 4 节增长修正均未实现。
- 未修改任何旧断言，无原值/新值变更。
- 未执行 `lock`、`check`、`test`、`red-nc1`、`red-nc2` 或三个 final；无有效负控、失败标记或恢复哈希记录。
- 未运行真实扫描，因此没有真实扫描用时与访问条目数。
- 未创建本次合成夹具，未启动原生窗口、选择框、浏览器或后台服务；未读取真实文件内容，未清理真实数据。
- 未联网、下载、修改 Git 配置或远端、push、合并或改写历史。macOS 未验证。

已向用户提出上述范围澄清；未将预选项或等待时间视为答复。

## 补单 01

### 续做范围与提交

- 日期：2026-11-02；实际模型：Codex（GPT-6）。未启动子代理或其它实现者。
- 权威补单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W9-L2-ADDENDUM-01-20261102.md`，依次重读原票、执行者规则、SCAN-M3D 与原票有效契约、补单、原受阻回执。
- 续做工作树与分支仍为上列精确值；续做起点 `5431e81260ab81c4c1cd2cc75fa6c7860116564d`，启动时干净；按补单要求未重跑 baseline。
- 实现提交：`d9808f18fbfa84714f7a688ad18014f967aea566`，仅修改 `packages/junk-scan/README.md`、`src/lib.rs`、`src/plan.rs`、`src/scan.rs`、`src/snapshot.rs`、`tests/scan_v1.rs` 六个文件。
- 原受阻通过补单明确解除：限制仅适用于本单新增夹具，原有 `/J` 联接和 `/H` 硬链接夹具原样运行。新增条件夹具只建普通文件、目录，沿用本树 `.local/w2-b-fixtures/fx-<pid>-<时间戳>` 的新目录与原有边界检查/回收机制。
- 静态比对确认原 `impl Fixture` 至 `fn plan` 的夹具创建/回收/联接代码、`scan_reparse_budget_cancel` 全部正文，以及 `fn hard_link` 至文件结尾（含 `check_unique_bytes`、`check_single_walk`）均与续做基线相同。没有改动这些既有夹具或断言。
- 实现提交后源码未再变更；最终报告和归档另行提交，不夹带产品变更。

### SPEC 第 1～4 节对照

| SPEC | 实现与验证 |
|---|---|
| 1：计划 JSON | `src/plan.rs` 新增同形 `Condition`，从 crate 根导出；Marker 在 `max_depth` 后增加 `conditions`、`fallback_for`，Serde 缺省为空并在序列化时省略。显式空条件、null、未知 kind/字段、非 custom 条件、长度/字符/数组范围、ASCII 重复与重复 kind 均拒为 InvalidPlan。旧 JSON 能原样读回，旧 Marker 序列化字节不增加键。 |
| 1：兜底校验 | `validate_fallbacks` 检查引用存在且唯一解析、非自身、主目标为非空条件 Marker 且不是兜底、根路径 ASCII 不分大小写相同、marker 与 max_depth 完全相同、一主最多一兜底；兜底自身不能带条件。测试覆盖合法往返与各类拒收反例。 |
| 2：条件 | `src/scan.rs::conditions_match` 按父条目名字/类型与路径文本判断四种条件。Enter 帧只共享父目录本次既有清单的名字/类型摘要，不重新列目录；根帧无父清单，两种父条件均为假。路径按反斜杠分级、去盘符；后缀条件不含 D 自身，路径包含条件含 D；全部比较 ASCII 不分大小写。 |
| 3：归属 | `Pending.hit_index` 将条件满足的测量交主目标，失败的交兜底，或不输出。搜索在普通标记命中时就关闭，失败也不会继续在其内部找同一目标；测量仍沿原有一次 DFS 进行，无兜底丢弃项也维持相同访问数。兜底不进入 searching，不单独列目录、产生列目录 issue 或进度；根缺失/重解析分支同步为兜底记 base_missing/base_reparse，空组保留。 |
| 3：测量与资格 | 测量、去重、活动时间、`.git` 与 identity 继续走原有代码；输出 Hit 使用归属目标的 index、level、min_age_hours、keep_newest，组使用其自己的 in_use。合成对照逐项核对字节、唯一字节、文件数、最新活动与 identity；检查兜底仅供参考、自己的年龄阈值、keep_newest 与 in_use。 |
| 4：增长 | `src/snapshot.rs::growth` 间隔下限从 3,600 改为 86,400 秒；`leak_suspect` 增加 `bytes_delta > 0`。days、精确间隔四舍五入、最近活动定义与输出字段不变。覆盖 23 小时空、恰好 24 小时、体量减少/不变、19/20 个、活动 24 小时边界、1 GiB/天边界。 |

`tests/scan_v1.rs` 仍是原有精确五测。新断言分别由 `check_m3d_plan`、`check_m3d_conditions`、`check_m3d_growth` 在指定测试内执行，标记为 `SCAN_M3D_PLAN`、`SCAN_M3D_CONDITIONS`、`SCAN_M3D_GROWTH`。

条件夹具覆盖真项目、npm 全局工具、仅 package/锁文件的安装包、Electron 解包、嵌套依赖、根目录本身、Playwright 配置、EBWebView 配置，以及大小写、package.json 为目录的反例。另核对无兜底时没有后代命中、仅一个主目标时仍访问相同条目数、兜底排在主目标前、父条件在根上的语义、D 自身不算旁边的其它条目、兜底无进度与缺失根问题。

### 获准修改的旧断言/输入：原文与新文

仅修改 SCAN-M3D 第 5 节第 1 类；第 2 类没有适用的旧断言（原测试均用 JSON 构造计划，没有完整构造 `Match::Marker` 的断言）。其余旧断言不变。

1. `cur19` 的时间输入，体量 `200`、item_count `20` 与原有 19 个不疑似断言均不变：

```text
原："taken_at":"2026-10-26T02:00:00Z"；"newest_activity":"2026-10-26T01:30:00Z"
新："taken_at":"2026-10-27T00:00:00Z"；"newest_activity":"2026-10-26T23:30:00Z"
```

2. `cur20` 的时间输入，体量 `200`、item_count `21` 与原有 20 个且最近活跃算疑似断言均不变：

```text
原："taken_at":"2026-10-26T02:00:00Z"；"newest_activity":"2026-10-26T01:30:00Z"
新："taken_at":"2026-10-27T00:00:00Z"；"newest_activity":"2026-10-26T23:30:00Z"
```

两组从原 2 小时间隔改为恰好 24 小时，newest_activity 均在本次 taken_at 前 30 分钟。`hour` 的 30 分钟输入及 `assert!(growth(&prev, &hour).is_empty());` 原样保留。

3. `one_hour` 的原 JSON 输入原样保留，新增断言返回空；精确间隔的旧断言移到新的 25 小时输入：

```rust
// 原
let ghour = growth(&prev, &one_hour);
assert_eq!(ghour.len(), 1);
assert_eq!(ghour[0].bytes_delta, "44739243");
assert_eq!(ghour[0].bytes_per_day, "1073741832",
    "bytes_per_day must divide by the exact interval");
assert!(ghour[0].leak_suspect);

// 新（中间新增的 twenty_five_hours 为下面列出的快照）
assert!(growth(&prev, &one_hour).is_empty(), "SCAN_M3D_GROWTH: one hour");
let ghour = growth(&prev, &twenty_five_hours);
assert_eq!(ghour.len(), 1);
assert_eq!(ghour[0].bytes_delta, "1118481075");
assert_eq!(ghour[0].bytes_per_day, "1073741832",
    "bytes_per_day must divide by the exact interval");
assert!(ghour[0].leak_suspect);
```

新增 25 小时快照的 `taken_at` 为 `2026-10-27T01:00:00Z`，`total_bytes` 为 `1118481175`，item_count 为 1，newest_activity 仍为 `2026-10-20T00:00:00Z`。相对原 prev 的 100 字节，按 `1,118,481,075 × 86,400 / 90,000` 重算日均为 `1,073,741,832`，恰好保留旧期望值；若错用展示的 days=1.0，会得到不同值，原测试意图保留。原 1 小时快照现在仅验证返回空。

### 检查命令与结果

以下均在指定工作树根运行；检查器统一前缀为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W9-L2 --mode <下表 mode> [--final]
```

表中回执文件均在 `docs/acceptance/wave9/l2/receipts/`，archive 自身回执例外，留在 `.local/checks/WATER-W9-L2/`。

| mode / 附加参数 | 检查器退出码与结果 | 回执文件 |
|---|---|---|
| lock | 0，passed；依赖与锁保持 | `2026-11-02T04-02-44.324Z-39292-lock-result.json` |
| test（先写新测试，旧实现） | 1，预期先红；Rust 101，五测完整运行，2 过/3 失败；新计划、条件计划解析、23 小时间隔暴露旧行为。此项不是有效负控证据 | `2026-11-02T04-02-56.876Z-36076-test-result.json` |
| test（首次实现） | 0，passed，5/5 | `2026-11-02T04-04-50.645Z-41492-test-result.json` |
| check | 0，passed；fmt、clippy -D warnings、依赖与源码政策 | `2026-11-02T04-07-03.105Z-21404-check-result.json` |
| test（补齐边界断言） | 0，passed，5/5 | `2026-11-02T04-07-40.437Z-37104-test-result.json` |
| red-nc1 | 0，passed，正确观察到 Rust 101、4 过/1 失败，目标标记命中 | `2026-11-02T04-09-17.805Z-14372-red-nc1-result.json` |
| test（nc1 原字节恢复后立即运行） | 0，passed，5/5 | `2026-11-02T04-09-51.922Z-27096-test-result.json` |
| red-nc2 | 0，passed，正确观察到 Rust 101、4 过/1 失败，目标标记命中 | `2026-11-02T04-10-14.756Z-30896-red-nc2-result.json` |
| test（nc2 原字节恢复后立即运行） | 0，passed，5/5 | `2026-11-02T04-10-29.669Z-34364-test-result.json` |
| check --final | 0，passed，干净实现提交 | `2026-11-02T04-10-48.838Z-29656-check-result.json` |
| test --final | 0，passed，5/5，0 ignored/measured/filtered；两条负控及恢复哈希审计通过 | `2026-11-02T04-10-58.846Z-15152-test-result.json` |
| real --final | 0，passed；扫描本身为 partial，见下节 | `2026-11-02T04-11-07.972Z-6648-real-result.json` |
| archive | 0，passed；225 文件、2,599,721 字节写入归档索引 | `2026-11-02T04-12-24.093Z-5216-archive-result.json`（仅 .local） |

本次为格式化分别执行 `C:/Users/37310/.rustup/toolchains/1.95.0-x86_64-pc-windows-msvc/bin/rustfmt.exe --edition 2024`：测试文件两次（初写及补边界后），`src/plan.rs src/scan.rs src/lib.rs src/snapshot.rs` 一次，均退出 0。`git diff --check`、实现暂存 diff 检查、既有测试段落只读比对均通过。Cargo 全部由检查器以离线、锁定、jobs=1、私有 `.local/w2-cargo-home` 和 `.local/w2-target` 执行。

### 有效负控与恢复

1. **nc1**：仅将 `src/scan.rs::conditions_match` 中的 `conditions.iter().all(...)` 改成 `.any(...)`。这是命中时实际调用的条件判断，无测试开关；未改测试。`scan_pattern_marker_discovery` 独自失败：

```text
assertion `left == right` failed: SCAN_M3D_CONDITIONS: owner for npmglobal/node_modules
  left: "node-main"
 right: "node-fallback"
```

随后立即 `git checkout -- packages/junk-scan/src/scan.rs`，恢复文件 SHA-256 为 `ad876459dd7ff3a1a2d54380b56855bc081b78d423512c88211abaf1eb820d08`，与改坏前相同；立即五测全绿后才做 nc2。

2. **nc2**：仅将 `src/snapshot.rs::growth` 的 `delta < Duration::from_secs(86_400)` 改成 `delta < Duration::from_secs(3600)`。`scan_snapshot_growth_keys` 独自失败：

```text
SCAN_M3D_GROWTH: 23 hours is too short
```

随后立即 `git checkout -- packages/junk-scan/src/snapshot.rs`，恢复文件 SHA-256 为 `82077cf485e362953e117f1d15a6cf7f613b0b4efd1c7ae7f3ed9e2c722f029c`，与改坏前相同；立即五测全绿。

两次红均不是编译错误、超时或旧标记失败，均完整运行五个测试。final test 的 proofAudit 分别绑定上述 red 与紧接的恢复 test；生产集合摘要为 `2dc69298f6b731031f6f8cd770e3d01777b844fa31178f7681b540028ab39061`，测试集合摘要为 `c1c468bcb11f9e7dfbcd588158478c37c656970b690cf285f0977d4ece8a1974`。最终测试文件自身 SHA-256 为 `0908e6fac7dbe926ed34a32fd17158333e3283480b95675821fb08beb783bac1`。

### 真实只读扫描

- `elapsed_ms = 11915`（11.915 秒），`visited_entries = 184283`。
- 扫描状态 `partial`：`claude-code-scratchpad` 组有 2 次 `access_denied`；`codex-marketplace-staging`、`electron-app-cache` 组分别有 1、3 次 `reparse_skipped`。检查器 final 正常通过，不将 partial 写成完整覆盖。
- 仅输出 12 个组的级别、条目/可清理数、逻辑/唯一字节与 issue 计数；未输出条目路径或命令行，未读真实文件内容，未执行清理。
- real 使用冻结的既有 `real-plan-template.json`。M3D 条件与兜底的真实文件系统行为由本票合成计划验证，不把这次旧模板冒烟当作 L1 新规则、服务或桌面的联合接线验收。

### 归档与未验证事项

`docs/acceptance/wave9/l2/ARCHIVE.json` 记录 225 个归档文件、2,599,721 字节，包含原两份 baseline、先前 archive 回执、本轮先红、绿、两条负控、恢复、三个 final 的日志/回执和检查器捕获的源码快照；此前已提交的原证据保持。由 archive 原字节复制并核对哈希，归档器的 `.gitattributes` 保持原值。本次 archive 在写自身回执前完成复制，故其新回执只在 .local，不另冒称已归档。

未修改 Cargo.toml、Cargo.lock、native_windows.rs、结果 JSON 模型、其它包、契约、检查器、台账或远端。未下载、联网、创建符号链接、清理真实数据、启动原生窗口/选择框/浏览器，未 push、merge、rebase、amend 或改写历史；身份只在提交命令进程设置为 Codex GPT-6。既有链接夹具仅在其原有五测内执行；新增条件夹具无链接。

macOS、跨 L1/L3 的整合、桌面、F1/F2 真实目录复验、真实删除与生产竞态不属于本票已验证结论；没有新增重解析根的夹具，`base_reparse` 兜底同步分支只作代码核对。报告提交后本单停止测试；执行者完成只表示交回，不自行标总控验收通过。
