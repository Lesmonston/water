WATER-W14-S1 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w14-s1/docs/dispatch/reports/WATER-W14-S1-REPORT.md

# WATER-W14-S1 受阻回执

2026-11-08。实际执行模型：Codex（GPT-6）；未使用子代理或其它执行者。

这是保存现场的 WIP，**不是完成实现，不可合入，也不应作为 H1 的完成基线**。未修改 manifest 或台账。

## 基线与提交

- 工作树：`F:/new/smaltalk/water/.worktrees/w14-s1`。
- 分支：`worker/water-w14-s1`。
- 初次 HEAD：`5f6ff198f1822c1ae3508588d239f73c12e11533`；开工时干净，与用户指定值一致。
- 现场实现提交：`78acd3b66ecb417d9fe561785313342049af63a5`。下述最后一次 test 在该提交的同一套产品与测试字节上运行；此提交没有通过测试。
- 本报告单独提交，不夹带后续产品变更。

## 阻点：服务收不到“目标已完成”的信息

工单第 1.4 节、W14 第 3.3 节要求规则阶段按**完成的目标数**计算 0～40 或 0～90 的进度。工单第 5 节又禁止修改扫描包、其它包与契约。

实际扫描接口不能让服务区分处理中途与目标完成：

1. [ScanProgress](../../../packages/junk-scan/src/scan.rs:75) 只有 `group_id`、`category`、`visited_entries`、`found_bytes`，没有目标 ID、完成标志或已完成目标数。
2. [Engine::emit](../../../packages/junk-scan/src/scan.rs:213) 的 `force` 只影响是否发送，**不进入** `ScanProgress`。
3. [处理中途的发送](../../../packages/junk-scan/src/scan/streaming.rs:251) 和第 279 行会重复发送同组进度；[未匹配时的发送](../../../packages/junk-scan/src/scan/streaming.rs:726)、[遍历结束时的发送](../../../packages/junk-scan/src/scan/streaming.rs:1008) 使用同一形状。按回调次数计数会提前完成；按 group 去重仍不能表达同组多个 target 的完成情况。
4. 服务原有 `Progress::on_progress` 把每个回调当成一个完成目标，其“每个目标边界恰好一次”的注释与当前扫描源码不符。草稿保留了这部分计数方式，因此同样有此缺陷，不能交成完成品。

已在现有 `service_scan_views` 内加入不靠睡眠的复现：测试替身在一个目标尚未完成时，重复发送当前接口允许的相同事件；通过实际源编译的 `Service::call("scan_progress")` 观察到 `percent == 40`，期望 `0`，失败标记为：

```text
SERVICE_W14_PROGRESS: repeated within-target callbacks are not completed targets
left: Number(40)
right: 0
```

替身只替换测试 crate 的扫描边界；生产 `lib.rs` 仍直接引用 `water_junk_scan`。测试在断言失败前释放全部通道、等待任务最终状态并移除替身，未留下等待中的扫描线程。

这不是行号偏差、计时失败或旧断言迁移。按[通用规则第 4 节](../WORKER-RULES.md:37)“要改白名单以外的文件”“要改公开接口”交回受阻；没有自行改扫描包、放宽断言或改契约。

### 最小补充需求

由总控先冻结扫描进度的完成语义，并给扫描包另单或明确的补充单：至少让服务收到可区分的真实 target 完成事件（含 target 身份，保证一次），或权威的累计完成数及位置归属。不能仅把现有 `force` 当作完成标志，因为当前未匹配路径也会使用 `force` 发送。

扫描包完成后，给 S1 明确的续做基线和该接口的消费约定。当前范围内只能知道 `scan_full` 返回时全阶段结束；若改成此前一直为 0 的粗粒度显示，也需总控先明确修订现有进度要求，本次未擅自采用这个解释。

## 已保存的工作与未完成项

仅改 `packages/water-service/src/` 与 `tests/service_v1.rs`；新增私有 `language.rs`。

| 工单要求 | 现场情况 |
|---|---|
| IPC 双语字段、规则英文字段 | 已加入大量显式配对，规则说明使用 `Rule` / `RuleText` 英文；完整审计与验收未完成 |
| `IpcError.message_en` | 服务构造处和源编译测试边界已添加；宿主未改 |
| 新记录双语、旧记录回退 | 已加入记录读取回退、跳过标题、事件、隔离组名等草稿；缺完整兼容回归 |
| 去除指定中文判断 | 已加入 `item_note_codes`、程序目录原因代码、进度类别的结构化根映射；保留旧文本读取分支；新旧等价测试未补齐 |
| 两份大小格式化 | 已加入英文版本与数字格式化；未完成精确断言清单 |
| 整盘进度、位置名、`finishing` | 已拆开整盘字节计算，使用开始体检时的已用容量，保持名称，落盘前 95、终态 100；规则目标计数仍被上述接口阻塞 |
| 测试 | 测试函数数量仍为 12；加入递归字段配对与可控阶段测试；新回归为红，其余见下 |
| 公开前写法 | 新文字未加入私人流程引用；全目录审计未完成 |
| 三条负控、三个 final、archive | 均未完成，不声明有效证据 |

最后一次 test 的其它失败必须在续做时修完，不能当作基线失败：

- `m35_clean_split`、`service_hardening`：无选择时 `summary_en` 为空，递归配对断言正确拒绝。
- `m35_conclusion_cards`：旧精确线索对象尚未迁移到包含 `text_en`、`copy_text_en` 的精确对象。
- `m35_scope_and_plan`：旧 `referenced_count` 场景断言失败，仍需核对原因代码迁移后的展示与断言；未降低强度。
- `service_storage_safety`：旧记录占用提示的精确对象需包含回退的 `process_label_en`。
- `service_trends_locations`：预测精确对象需加入 `note_en`，目前未迁移。

另有双语覆盖、旧记录中文保留、代码兼容等测试仍待补齐；不要从已加入的字段推断全量英文已完成。

## 实际命令与结果

以下均从指定工作树根目录执行，入口为：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-S1 --mode <mode>
```

| mode | 退出码 / 结果 | `.local/checks/WATER-W14-S1/` 下回执 |
|---|---|---|
| baseline | 0 / passed | `2026-11-08T10-38-09.114Z-6716-baseline-result.json` |
| lock | 0 / passed | `2026-11-08T10-41-49.803Z-39028-lock-result.json` |
| check | 1 / 当时未格式化，fmt 拒绝 | `2026-11-08T10-51-05.353Z-33900-check-result.json` |
| test | 1 / 编译失败，3 个草稿变量错误 | `2026-11-08T10-52-34.531Z-28236-test-result.json` |
| test | 1 / 测试替身误用 Category::as_str | `2026-11-08T10-57-14.225Z-31736-test-result.json` |
| test | 1 / 编译成功，12 测：5 过、7 失败、0 ignored、0 filtered | `2026-11-08T10-59-04.728Z-24460-test-result.json` |

最后一次 Cargo 日志：`.local/checks/WATER-W14-S1/2026-11-08T10-59-04.728Z-24460-test-5.log`。Cargo 自身退出码 101；测试运行 45.22 秒。所有失败均非计时失败，未发生计时重跑。

最终测试前已用本机现有 Rustfmt 对白名单内实际修改的 Rust 文件格式化（`--edition 2024 --config skip_children=true`）。`git diff --check` 通过。**没有把格式化成功写成 check 门通过**。

没有运行 `real`、`red-nc1/2/3`、任何 `--final` 或 `archive`；因此没有向 `docs/acceptance/wave14/s1/` 手工写入证据。编译错误和本次红色回归均不计作工单负控。

## 已迁移的旧写法与决定

- `shape` 两边完整键集合 → 两边都过滤 `_en` 后精确比键；原有中文键与值类型仍逐层比较，三份共享样例未改。
- 测试源编译边界的两字段错误 → 增加并转发 `message_en`，与新公共错误一致。
- 等待逻辑把所有非 `running` 都当结束 → `running` 和 `finishing` 都继续等，避免落盘前提早读取结果；未放宽原时限。
- 趋势查询时钟 `NOW + 2 * 86400 + 60` → 该次扫描实际 `finished_at + 60`，避免扫描时间超过固定余量后查询抢跑；没有新增墙钟时限。
- 程序目录保护原因的中文句子 → `installed_program_directory` / `program_directory` 代码，并保存中英说明。相关旧精确断言尚待完整迁移，未宣称完成。
- 本机无 `python` 命令，使用已有 `py -3` 执行等价的本地文本编辑；没有下载或安装工具。

词汇表之外已使用的译法包括：项目所在位置 `Containing project`，应用更新残留 `update leftovers`，崩溃转储 `crash dumps`，回收站 `Recycle Bin`，文件资源管理器 `File Explorer`，安装目录 `installation folder`，保留名 `reserved name`，签名 `signatures`，密钥 `keys`，日志写入 `write the journal`，重复文件 `Duplicate files`，副本尾巴 `copy suffix`，脱离 git `Detached from git`。这是当前草稿的译法记录，完整用词审计仍未完成。

## 边界与结束状态

- 没有改宿主、扫描包、规则包、契约、共享样例、Cargo 清单或锁文件、检查器、台账。
- 没有真实数据扫描、真实清理、原生窗口、选择框或浏览器；删除仍只由已有测试回收本树 `.local` 内本次新建的合成夹具目录。
- 没有下载依赖，没有运行上游代码，没有使用子代理。
- 没有 push、修改远端或持久 Git 配置，没有 merge、rebase、reset、amend 或改写历史；提交使用进程内模型身份。
- Windows 仅完成上述非 final 检查；macOS 未验证。没有产品发布或总控验收通过的声明。
- 最后一次 test 已退出；核对时未发现剩余 Cargo、Rustc 或本票 service_v1 测试进程。没有执行额外杀进程操作。

按受阻回执交回后停止本票测试与修改，等待总控补齐扫描完成语义和续做单。
