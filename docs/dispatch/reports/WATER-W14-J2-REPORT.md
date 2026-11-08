WATER-W14-J2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-j2/docs/dispatch/reports/WATER-W14-J2-REPORT.md

实际执行者：Codex GPT-6。日期：2026-11-08（JST）。本回执交付实现与自检结果，等待总控验收。

## 基线与提交

- 工作树：`F:/new/smaltalk/water/.worktrees/w14-j2`。
- 分支：`worker/water-w14-j2`。
- 首次 HEAD：`a9a17310ffb65800e28e21710e3d5091cea180f3`，与 `water-w14-j2-base-20261108` 一致；开工时干净。
- 实现提交：`ef3d61f619a9907985dd52fab00c9cec699ec111`（`feat(scan): report completed scan roots`）。三个 final 均在此干净提交上依次通过，运行前后均干净。
- 实现与测试只改 `packages/junk-scan/README.md`、`src/lib.rs`、`src/scan.rs`、`src/scan/streaming.rs`、`tests/scan_v1.rs`。随后另交报告与检查器归档证据。
- 提交使用进程内身份 `Codex GPT-6 <codex-gpt-6@localhost>`；未改 Git 配置、远端或历史，未 push、merge、rebase、amend 或 reset。

## 工单逐条对照

1. **接口**：按 W14-ADD-01 第 1.1 节增加 `RootProgress`，四字段及六个派生完全照抄；在 `lib.rs` 导出。`ScanObserver::on_root_done` 带空默认实现，既有 `Quiet` 等观察者无需修改。`ScanProgress` 未改。
2. **根目录集合**：Pattern 取 `base`，Marker/Discovery 取 `root`；跳过兜底 Marker。沿用 ASCII 不分大小写的键，保留首次目标的原样字符串。总数在去重后、分开前置跳过项之前确定，整趟不变。
3. **回调位置**：隔离区与 `.git` 内的根目录先按首次目标的计划顺序报；不存在、非目录、重解析点与早先已遍历根目录在轮到时报；实际遍历的在 DFS 栈清空后报。编号连续，计数来自同一 `Engine.visited`。
4. **提前结束**：回调出口检查取消与预算；未走完及尚未轮到的根目录不报。保留既有停止、问题归属与结果处理；`space_overview` 不调用新回调。
5. **旧进度**：没有改动 `Engine::emit`、任何既有 `on_progress` 调用点及末尾按非兜底目标逐个发送进度的循环。
6. **README 与写法**：新增英文接口说明，覆盖去重、顺序、计数、取消、默认实现和 overview。检查过整个包以及新增内容，没有本机用户名、私人邮箱、本机项目路径或私有流程引用；保留工单要求的测试标记 `SCAN_W14_ROOTS`。
7. **范围与资源**：Cargo 配置、锁文件、依赖、其它包、契约、检查器和台账未改；未新增系统函数。检查器使用离线缓存、单构建任务、单测试线程及本树私有 target。原生窗口、选择框、浏览器各 0。

## 测试覆盖

测试名和数量保持原有 5 个，新增断言只加在 `scan_overlap_and_guards` 与 `scan_reparse_budget_cancel` 中。没有删旧断言、降低强度、过滤或忽略测试。

- 混合夹具含两个独立根目录、外层 Discovery 已走过的内层 Marker、大小写不同的共用根目录、不存在根目录、隔离区、`.git` 内根目录、普通文件根目录、联接根目录和兜底 Marker。分别经 `scan` 与 `scan_full` 验证。
- 精确断言 8 个根目录的原样字符串和完整顺序、固定 `roots_total = 8`、`roots_done = 1..8`；前两个跳过项的计数为 0。外层子树枚举 5 个条目，第二棵子树后累计 7；嵌套根与其它跳过项不再增加计数。也验证 `RootProgress` 的 JSON 往返。
- 全部根目录回调结束后，精确核对各非兜底目标的末尾 `on_progress`；不对受 50 ms 节流影响的途中次数作精确断言。兜底组仍不发进度。
- 确定性取消：第一根目录中不匹配 Pattern 的既有强制进度回调直接取消，无睡眠。只留下先前隔离区的 `(roots_done, roots_total) = (1, 3)`，取消后不再有根目录回调。
- 另验证预先取消没有任何根目录回调、条目预算耗尽不误报当前或后续根目录、`space_overview` 不发根目录回调。
- 所有夹具沿用本树 `.local/w2-b-fixtures/fx-*` 新建目录和现有边界校验回收机制；未手工清理任何其它目录，未触及真实数据删除。

## 检查命令与结果

下面所有模式均在本工作树根目录运行，命令前缀相同：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-J2 --mode <模式>
```

表中的链接是检查器归档的原始结果；各结果中的 `commands[].log` 对应同目录日志，包含实际 Cargo 参数、退出码、标准输出与标准错误。

| 模式（按实际顺序） | 检查器退出码与结果 | 归档结果 |
|---|---|---|
| `baseline` | 0，通过；首次 HEAD 和环境符合 | [12:17](../../acceptance/wave14/j2/receipts/2026-11-08T12-17-04.668Z-36780-baseline-result.json) |
| `lock` | 0，通过；已有锁文件未改 | [12:18](../../acceptance/wave14/j2/receipts/2026-11-08T12-18-02.997Z-20292-lock-result.json) |
| `test` | 1，3 通过、2 失败；新夹具用了不存在的 `review` 枚举值，修为既有 `confirm` | [12:20](../../acceptance/wave14/j2/receipts/2026-11-08T12-20-18.102Z-19308-test-result.json) |
| `test` | 1，4 通过、1 失败；新断言误把第一棵子树数为 6，按夹具五个条目修正为 5，累计由 8 修为 7 | [12:21](../../acceptance/wave14/j2/receipts/2026-11-08T12-21-57.588Z-10172-test-result.json) |
| `test` | 0，5 通过，0 忽略、0 过滤；3.93 s | [12:22](../../acceptance/wave14/j2/receipts/2026-11-08T12-22-44.380Z-34000-test-result.json) |
| `check` | 0，fmt 与 clippy（所有 targets，warnings 为错误）通过 | [12:23](../../acceptance/wave14/j2/receipts/2026-11-08T12-23-18.648Z-42244-check-result.json) |
| `red-nc1` | 0，有效预期失败；Cargo 101 | [nc1](../../acceptance/wave14/j2/receipts/2026-11-08T12-24-09.764Z-30856-red-nc1-result.json) |
| `test`（立即恢复后） | 0，5 通过；5.12 s | [nc1 恢复](../../acceptance/wave14/j2/receipts/2026-11-08T12-24-53.578Z-12732-test-result.json) |
| `red-nc2` | 0，有效预期失败；Cargo 101 | [nc2](../../acceptance/wave14/j2/receipts/2026-11-08T12-25-26.333Z-41696-red-nc2-result.json) |
| `test`（立即恢复后） | 0，5 通过；3.59 s | [nc2 恢复](../../acceptance/wave14/j2/receipts/2026-11-08T12-25-56.221Z-41220-test-result.json) |
| `red-nc3` | 0，有效预期失败；Cargo 101 | [nc3](../../acceptance/wave14/j2/receipts/2026-11-08T12-26-29.113Z-39276-red-nc3-result.json) |
| `test`（立即恢复后） | 0，5 通过；3.59 s | [nc3 恢复](../../acceptance/wave14/j2/receipts/2026-11-08T12-27-12.514Z-20156-test-result.json) |
| `check --final` | 0，通过 | [final check](../../acceptance/wave14/j2/receipts/2026-11-08T12-28-03.480Z-29156-check-result.json) |
| `test --final` | 0，5 通过；4.94 s；三条 proofAudit 均通过 | [final test](../../acceptance/wave14/j2/receipts/2026-11-08T12-28-27.553Z-32600-test-result.json) |
| `real --final` | 0，通过；总墙钟 84,214 ms | [final real](../../acceptance/wave14/j2/receipts/2026-11-08T12-28-40.504Z-22892-real-result.json) |
| `archive` | 0，通过；归档 262 文件、5,565,614 字节 | [ARCHIVE.json](../../acceptance/wave14/j2/ARCHIVE.json) |

本次 archive 按检查器规则保留目录内全部历史证据，包括开工前已有的 11:45 baseline，以及上表两次开发期失败；11:45 那份不计为本执行者运行。archive 自己的结果位于本树 `.local/checks/WATER-W14-J2/2026-11-08T12-30-34.305Z-22924-archive-result.json`，生成于该轮复制完成之后。

## 三条负控与恢复

只变异生产文件 `src/scan/streaming.rs`，测试字节保持不变；每条后立即执行 `git checkout -- packages/junk-scan/src/scan/streaming.rs`，接着跑 `test`。final test 的 `proofAudit` 已核对变异源快照、原字节恢复和恢复后测试。

| 负控 | 单一行为变异 | 指定标记检出的实际差异 |
|---|---|---|
| nc1 | 删去已在早先根目录遍历过的分支里的通知 | `SCAN_W14_ROOTS`：收到 7 个，应为 8 个 |
| nc2 | 将实际遍历根目录的通知从栈清空后移至循环开始前 | `SCAN_W14_ROOTS`：第一子树回调计数 0，应为 5；取消场景报了 2 个，应为 1 个 |
| nc3 | `roots_total` 只计可遍历根目录，排除隔离区与 `.git` | `SCAN_W14_ROOTS`：总数 6，应为 8；取消场景 `(1, 2)`，应为 `(1, 3)` |

三条都通过实际公共扫描入口触发断言，均非编译错误或超时。nc2 是移动同一个回调位置，移出与移入两处文本共同构成这一行为变异；没有额外变异。

## 真实冒烟

使用既有冻结真实计划模板与原有 `real_smoke` 示例，未扩大读取范围；真实文件只读名字和元数据，未读内容、未清理。输出只含组级汇总与计数。

| 阶段 | 状态 | visited_entries | 阶段耗时 |
|---|---|---:|---:|
| 普通扫描 | completed | 274,308 | 24,109 ms |
| 完整扫描（三类 extras） | completed | 274,300 | 11,734 ms |
| 空间概览 | completed | 676,791 | 39,625 ms |

完整扫描：7 个 cluster，10 个索引联接，隐藏且带系统属性的索引联接 0，无法复核属性的索引项 0；独立观察到兼容联接 10 个、全部 10 个未进索引；declaration 计数 0，索引未截断。不同扫描时刻的条目数如实记录，不要求活跃机器上的两趟计数相同。

## 自主决定、迁移与限制

- **旧断言迁移：无。** 开发期两次失败修正的都是本单新写的夹具与断言，不涉及既有断言；上述原值、新值及原因已全部列出。
- **计时重跑：无。** 未出现计时失败，也未加墙钟时限断言。Cargo 前均按进程名观察机器负载，未操作其它单的进程。
- 选用单个私有 `Engine::emit_root_done` 出口统一计数、取消与预算保护，没有增加 Engine 状态字段或其它公开接口。保留原有可遍历根目录排序，单独对前置跳过项按计划顺序排序；未重排实际扫描。
- 既有 Fixture 足以表达全部场景，因此复用其本树有界夹具与回收机制，没有引入另一套物理测试工具或随机睡眠。
- PATH 中没有直接可用的 Cargo/Rustc，使用工单检查器定位既有 1.95.0 工具链；格式化用同一工具链的 rustfmt，没有安装或下载。辅助查看曾遇到 PowerShell 管道语法问题，换用等价的 `ForEach-Object` 查看，不改检查器。
- 没有界面改动或截图；没有启动窗口、选择框或浏览器。收尾检查本工作树路径下运行的可执行进程数为 0，所有本票检查命令均已退出，没有启动后台服务。
- **未做/未验证**：服务 S1 对新回调的消费、整机 UI 进度及服务/宿主联合链路、macOS、真实删除、安装与发布。本单不将扫描回调自检描述为这些功能已完成。
- 没有越界申请、没有改共享状态，未把任务自行标为总控验收通过。
