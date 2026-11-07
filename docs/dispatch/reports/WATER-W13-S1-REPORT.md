WATER-W13-S1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w13-s1/docs/dispatch/reports/WATER-W13-S1-REPORT.md

# 执行信息

- 实际执行者：Codex，GPT-6（会话系统未提供更细的模型版本）；未启动子代理或其它实现者。
- 工作树：`F:/new/smaltalk/water/.worktrees/w13-s1`。
- 分支：`worker/water-w13-s1`。
- 开工基线：`6b7703e84e8903d03a6c2ef0c0550187034717ac`，与 `water-w13-s1-base-20261108` 一致，开工状态干净。
- 实现提交：`cc238b6a158b29082677d9f955ded47ba16575ab`。
- 三个 final 均在该实现提交上通过，前后 HEAD 相同且工作树干净。回执与归档另作仅文档提交。
- 本回执表示执行交回，未修改台账或自行标记 VERIFIED。

按工单顺序读取两份执行者规则、W13 第 0/2 节与工单，再读 service、m35、conclusion、clean 及指定测试；同时阅读项目入口、W12 与补单 01、manifest 所列服务/IPC 背景契约。权威 manifest 从主目录读取；未将主线合入本树。

# 逐项实现

## 跳过名单与结论

`service.rs::invalidate_skips` 改为仅将已有计划登记到 `stale_plans` 并将结论序号加一，不再调用 `m35::invalidate`。其它设置的失效调用保持原样；已有的其它过期原因不会被清掉。

覆盖 `skip_add`、卡片 `skip_unit_add`、`skip_remove`：结论保持新鲜、跳过与移除立即反映、版本精确加一；路径跳过后其它卡仍可 `conclusion_decide`，当前结论可重新准备计划。路径/卡片跳过之前准备的计划均由 `clean_start` 精确返回 `stale`。计划接口不携带单独的过期原因字段；结论本身的新期望为 `stale=false`、`stale_reason_zh=null`。

## 全部成员符合跳过记录的簇

`conclusion.rs` 的公共内部判断对非空簇的每个成员调用 `Skipped::matches`，独立于其原始可清资格；卡片候选、线索、趋势页簇列表均使用该判断。没有全员命中时保持原有展示。

在原跳过单位用例中保留 12 个成员，将一个成员设为一小时内改动并断言存在不可清成员；先只跳过一个可清成员，精确核对原线索 ID 与趋势组 ID 仍在；移除该条后从卡片跳过整组，精确核对卡片 ID、线索 ID 与趋势组 ID 均消失。原有实际重扫后新成员继续被整组记录匹配的断言保留。

## 日志与隔离

`clean.rs::start_with_executor` 中某批返回 `Err(Journal)` 后，按直接删除报告里的 `Deleted/Partial` 或先前隔离报告里的 `Moved` 判断是否已做动作，零字节也算。已有动作时，该批转换为 `JournalFailed` 的停止报告，后面的批次沿用同一停止处理，结果照存；没有动作时保留原 `JOURNAL_MESSAGE` 错误。

计数合并直接删除及各隔离报告里的 `JournalFailed` 条目。N=0 时改为“清理日志没写全，这次要清的都已处理”。批次异常的组说明按契约映射为中文：InvalidPlan→清理计划无效，Native→文件操作失败，Unsupported→这台电脑不支持，Journal→日志写不进去，Overflow→数量超出范围。没有 `Moved` 条目时 `quarantined=null`；零字节但已移动的条目仍有隔离摘要。

新用例均并入 `m35_clean_split`，通过原有 `Executor` 替身接口进入 `start_with_executor`，未加产品测试开关或公开接口：

| 注入情形 | 精确断言 |
|---|---|
| 先真实删除一项（90 字节），第一隔离批次 Journal 错误，后面另有两批 | stopped；隔离调用仅 1 次；三批共 6 项为 JournalFailed；结果可读且重启后相同；quarantined=null |
| 前面只真实删除一个 0 字节项 | 同样保存、停止，N=6、释放字节为 0 |
| 第一隔离批次真实移动一项（60 字节），第二批 Journal 错误，第三批未跑 | stopped；隔离调用仅 2 次；后两批 N=2+3=5；首批移动保留；结果重启后相同 |
| 前面只真实移动一个 0 字节项 | 同样保存、停止，N=5，隔离项数仍为 1 |
| 没有任何动作，第一批 Journal 错误 | failed；原 JOURNAL_MESSAGE；无伪造完成记录 |
| InvalidPlan、Native、Unsupported、Overflow | 经 start 层分别核对精确中文原因；其它批次沿用原行为；全无移动时摘要为 null |
| 已处理完最后一项后日志失败 | 真实执行器/测试日志失败路径核对 N=0 的完整新文案 |

Journal 作为批次中断/首 intent 错误处理，不会再作为“失败组后继续执行”的说明出现；其中文原因映射另有精确断言。错误批次为得到 Err 必须调用一次；测试证明它没有移动，且之后的批次没有执行器调用。先前批次的动作来自本树合成夹具的真实执行器。

构造逻辑 X/Y 盘输入仅验证服务分批与计数：隔离根都映射到本次夹具内，替身不将这些虚构盘上的路径交给 NativeExecutor。失败及未跑批次无隔离目录、无恢复记录；diagnostics 中的 journal_error 为 true。

## 测试计时与公开文字

`service_trends_locations` 在查询趋势之前，将假时钟设为第二次扫描起点之后 60 秒，避免真实扫描耗时使第二个点落在“现在”之后。原“2 个点”精确断言保留，产品趋势代码与墙钟时限均未改。

公开文字清理修改两个文件：

- `README.md`：移除旧工单号、派单检查命令、本机路径与执行流程文字；改为通用构建、12 测试运行、只读示例说明；同步 settings v4 与日志中断后的实际行为。
- `tests/service_v1.rs`：旧集成说明改为描述日志在移动之后失败的行为，移除总控/补单等私有流程引用。

扫描本包未发现其它真实用户名、私人邮箱、本机工作目录或私有文档引用。保留测试所需的虚构盘符、旧隔离目录兼容测试及冻结要求的断言标记。

# 迁移的旧断言

| 原值/原断言 | 新值/新断言 | 原因 |
|---|---|---|
| SERVICE_M35_CONCLUSION: skip stale，stale_reason_zh=跳过名单变了 | SERVICE_W13_FRESH：stale=false、原因=null、版本精确+1 | 跳过只影响选择和已准备计划，不使体检结论过期 |
| 跳过后用结论 clean_prepare 返回 stale | 跳过前已准备计划 clean_start 返回 stale；新结论仍可决定、准备新计划 | 将精确失效断言放回计划层 |
| SERVICE_W12_SKIP: version increments 仅比较不相等 | 原断言保留，另精确核对结论序号+1与不过期，移除后条目恢复 | 验证整组跳过的新鲜语义，没有降低强度 |
| 整簇跳过后的卡片/线索消失（全部成员较旧） | 保留精确 ID 检查，加入太新成员、部分命中对照及趋势簇检查 | 全员判断应包含原本不可清的成员 |
| SERVICE_W12_RECORD 批次原因仅 starts_with 没能放进隔离区： | 精确包含“没能放进隔离区：清理计划无效”，并覆盖其余错误的中文映射 | 消除执行器英文原因，断言更严格 |
| 移动后 journal_note_zh 仅检查“清理日志没写全”前缀 | 精确等于“清理日志没写全，这次要清的都已处理” | 此用例没有未处理条目，N=0 |
| 全无移动时仍可形成空 quarantined 对象的旧行为 | 失败/全部跳过的执行链精确断言 quarantined=null | 隔离摘要按实际移动项数生成；其它成功移动断言保持 |
| service_trends_locations 立即按扫描起点的假“现在”取趋势 | 查询前将假时钟后拨 60 秒；点数仍精确为 2 | 解除假时钟与真实耗时的测试竞态 |

其余旧断言、12 个测试名与数量保持；没有 ignore、测试过滤、测试删除或时限放宽。

# 负控及恢复

三条仅在已提交实现的生产源码中各改一处，测试字节不变；执行 red 模式后立即 `git checkout -- <该文件>` 并运行完整 test。

| 负控 | 变异 | 观察到的失败 | 恢复 |
|---|---|---|---|
| nc1 | invalidate_skips 恢复 m35::invalidate | m35_conclusion_cards 与 service_hardening 均为 SERVICE_W13_FRESH；10 过、2 预期失败 | 恢复 service.rs，随后 12/12 通过 |
| nc2 | all_members_skipped 恢复 views::skipped 的“原本可清”判断 | m35_rows_and_detail，SERVICE_W13_CLUE；11 过、1 预期失败 | 恢复 conclusion.rs；首轮仅计时失败，原样重跑 12/12 通过 |
| nc3 | Journal 中断分支仅处理尚无隔离报告的情形，让已有隔离动作后的错误走失败组并继续 | m35_clean_split，SERVICE_W13_JOURNAL: later journal error stops；11 过、1 预期失败 | 恢复 clean.rs；首轮仅计时失败，原样重跑 12/12 通过 |

三条 red 模式的测试进程均退出 101，检查器将目标功能失败识别为预期证据并退出 0；没有混入编译、超时或其它断言失败。

恢复后原字节 SHA-256 与实现提交逐个相同：

- service.rs：`374db6881da3d5d2f4e533b8ba0d78b8d0f4371d331f62d97b95f7933382bee9`
- conclusion.rs：`c67127ea9ecee28de58888d15916ef2599ff7c3e19ef7b50108564e928cc2b6a`
- clean.rs：`0988f8156abba1e61d3b2df5c8fb513a30b0eb344900c041f5b1495af917f7e1`

# 检查命令与结果

所有入口在本树根执行，统一前缀：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W13-S1
```

下表按实际运行顺序列出后续参数。每项链接是原始 JSON 回执；对应 cargo 命令、退出码与源快照见该回执引用的日志。负控行“通过”指预期失败证据被接受。

| 参数 | 结果 | 启动时间 | 证据 |
|---|---|---|---|
| `--mode baseline` | 通过（检查器 exit 0） | 16:29:45.800 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-29-45.800Z-19716-baseline-result.json) |
| `--mode lock` | 通过（检查器 exit 0） | 16:37:51.250 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-37-51.250Z-32712-lock-result.json) |
| `--mode test` | 通过（检查器 exit 0）；ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 152.03s | 16:38:20.784 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-38-20.784Z-33592-test-result.json) |
| `--mode check` | 通过（检查器 exit 0） | 16:44:42.240 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-44-42.240Z-30544-check-result.json) |
| `--mode test` | 通过（检查器 exit 0）；ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 131.84s | 16:45:51.431 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-45-51.431Z-35272-test-result.json) |
| `--mode red-nc1` | 通过（检查器 exit 0）；FAILED. 10 passed; 2 failed; 0 ignored; 0 measured; 0 filtered out; finished in 103.45s | 16:48:43.379 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-48-43.379Z-33424-red-nc1-result.json) |
| `--mode test` | 通过（检查器 exit 0）；ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 108.73s | 16:50:59.763 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-50-59.763Z-37128-test-result.json) |
| `--mode red-nc2` | 通过（检查器 exit 0）；FAILED. 11 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 109.11s | 16:53:17.042 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-53-17.042Z-19948-red-nc2-result.json) |
| `--mode test` | 仅原有计时失败（检查器 exit 1）；FAILED. 9 passed; 3 failed; 0 ignored; 0 measured; 0 filtered out; finished in 122.05s | 16:55:24.427 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-55-24.427Z-31180-test-result.json) |
| `--mode test` | 通过（检查器 exit 0）；ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 132.45s | 16:58:05.297 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T16-58-05.297Z-34144-test-result.json) |
| `--mode red-nc3` | 通过（检查器 exit 0）；FAILED. 11 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 134.57s | 17:00:38.741 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T17-00-38.741Z-19452-red-nc3-result.json) |
| `--mode test` | 仅原有计时失败（检查器 exit 1）；FAILED. 8 passed; 4 failed; 0 ignored; 0 measured; 0 filtered out; finished in 214.01s | 17:03:48.288 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T17-03-48.288Z-39696-test-result.json) |
| `--mode test` | 通过（检查器 exit 0）；ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 209.32s | 17:10:11.860 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T17-10-11.860Z-30320-test-result.json) |
| `--mode check --final` | 通过（检查器 exit 0） | 17:14:04.183 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T17-14-04.183Z-13256-check-result.json) |
| `--mode test --final` | 通过（检查器 exit 0）；ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 125.28s | 17:14:32.093 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T17-14-32.093Z-31700-test-result.json) |
| `--mode real --final` | 通过（检查器 exit 0） | 17:16:54.956 UTC | [JSON](../../acceptance/wave13/s1/receipts/2026-11-07T17-16-54.956Z-25140-real-result.json) |
| `--mode archive` | 通过（检查器 exit 0） | 17:19:22.135 UTC | [ARCHIVE.json](../../acceptance/wave13/s1/ARCHIVE.json) |

附加检查：用 Rust 1.95.0 的 cargo 执行 `fmt --manifest-path packages/water-service/Cargo.toml` 格式化；检查器中的 fmt --check、离线 locked Clippy -D warnings 均通过。`git diff --check` 通过。未手工复制或下载依赖，cargo 使用检查器配置的私有 home/target 与单线程测试。

## 计时重跑

- nc2 恢复后的首轮（16:55:24 UTC）只有 SERVICE_RETURN_BUDGET 三处失败：service_hardening 的 skip_unit_add、service_scan_views 与 service_storage_safety 的 scan_progress，均为原 50 ms 预算。测试总时长 122.05 s。代码/测试原样重跑一次（16:58:05 UTC）即 12/12，通过，测试总时长 132.45 s。
- nc3 恢复后的首轮（17:03:48 UTC）只有 SERVICE_RETURN_BUDGET 四处失败：m35_quarantine 的 quarantine_restore、m35_scope_and_plan 的 locations_set_session_cleanup、service_clean_flow 的 skip_add 为原 200 ms 预算；m35_rows_and_detail 的 scan_progress 为原 50 ms 预算。测试总时长 214.01 s。代码/测试原样重跑一次（17:10:11 UTC）即 12/12，通过，测试总时长 209.32 s。
- 原断言未输出逐次调用的实际毫秒数，因此只记录其超出的原预算及整套耗时，不伪造毫秒读数。两次失败及重跑日志均保留；未改任何时限。
- 最终 test --final：12 passed，0 failed，0 ignored，0 filtered，测试总时长 125.28 s。

## 真实冒烟与归档

本次只执行一次 `real --final`，清理关闭，仅输出计数：

```json
{"cards":5,"clues":3,"conclusion_rows":13,"drives":4,"folds":3,"quarantine_cards":0}
```

没有真实删除、移动、清空、窗口、选择框或浏览器操作；输出与证据不包含进程命令行、真实扫描路径或文件名。内部真实扫描记录仅保存在检查器的私有 .local 数据目录，未复制进归档。

[ARCHIVE.json](../../acceptance/wave13/s1/ARCHIVE.json) 登记 267 个文件、10,671,921 字节；归档后逐个核对源/归档字节、长度、SHA-256 与总数均一致。既有 16:14:11 UTC 的派前 baseline 也由检查器保留在归档内，不计为本次执行；本次 baseline 是 16:29:45 UTC。archive 本轮生成的结果回执保存在 .local/checks/WATER-W13-S1/2026-11-07T17-19-22.135Z-16860-archive-result.json，归档索引包含该命令执行前的所有输入与检查结果。

# 自主选择与边界

- 仅修改 service.rs、conclusion.rs、clean.rs、tests/service_v1.rs、README.md；未改 Cargo.toml、Cargo.lock、三份界面夹具、IPC 命令/键、执行器、其它包、契约、检查器或台账。
- 簇的记录匹配判断仅集中在 conclusion 内复用，保留其它视图“只改变原本可清条目”的保护语义；未扩大 views::skipped 的作用范围。
- 日志失败批次复用内部报告转换，未给执行器加新接口，未在 WebView/IPC 中增加路径或 shell 输入。
- 保留既有 Executor 测试替身注入口；五个错误原因映射为 crate 内部函数，未改变包的公开 API。
- 按通用规则直接原样重跑两次计时失败，没有以此受阻；未降低旧断言、未新增墙钟时限。
- 合成夹具沿用每次随机创建及父目录/前缀校验，只回收本次夹具自己的目录。虚构额外盘只注入报告，未对真实盘根建隔离目录。
- 原生窗口 0、目录选择框 0、浏览器 0；未运行上游代码或安装/构建脚本；未改任何 git 配置或远端，没有 push、merge、rebase、amend、reset。
- 未验证 macOS、宿主/UI 联合接线、真实用户清理与生产竞态；本单不作公开发布或总控验收结论。
- 交回时检查器及本次测试/真实冒烟子进程均已退出，无自有后台进程继续运行。

回执用 Node UTF-8 写入并读回核对，无 U+FFFD 或连续问号。实现提交使用进程内 Codex-GPT-6 / codex-gpt-6@localhost 身份，未借用仓库的人类身份。
