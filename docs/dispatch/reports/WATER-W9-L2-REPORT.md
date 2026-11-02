WATER-W9-L2 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l2/docs/dispatch/reports/WATER-W9-L2-REPORT.md

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
