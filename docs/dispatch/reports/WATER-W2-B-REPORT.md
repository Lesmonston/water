WATER-W2-B 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-b/docs/dispatch/reports/WATER-W2-B-REPORT.md

# WATER-W2-B 执行回执

交付状态：SUBMITTED，等待总控独立验收与集成。本回执不代表 VERIFIED，也不表示 macOS、桌面接线或清理执行已完成。

## 执行身份与基线

- 实际模型：Cursor Grok 4.6（Cursor 会话内实现；未另开实现子代理或外部模型）。
- 权威工单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-B-JUNK-SCAN-20261026.md`。
- 唯一工作树 / 分支：`F:/new/smaltalk/water/.worktrees/w2-b` / `worker/water-w2-b`。
- 精确首次 HEAD：`7ca15282e477ed4b5120ffe3c1edc3a60b75c144`（`water-w2-checkup-base-20261026`），开工时干净且 `packages/junk-scan` 不存在。
- 实现提交（产品与测试，干净树）：`35c94d2b22c914656470a4b64e5c1e6170dea0dd`。final check/test/real 均在此 SHA 上通过。
- Keeper worker boot 返回 `worker claims require parentSessionId`，未建立 bridge 会话；未改共享 Vault 规则。
- 窗口/目录框/浏览器预算：0。Rust 离线、jobs 1、私有 Cargo home/target/tmp。未 push、未 merge、未改主线台账。

## 交付

新独立 workspace `packages/junk-scan`（`water-junk-scan`）：edition 2024、rust 1.95、`publish = false`、四个 auto 关闭；直接依赖仅 `serde =1.0.229`（derive）与 `serde_json =1.0.151`。系统调用只在 `src/native_windows.rs`：`SHGetKnownFolderPath`、`CoTaskMemFree`、`CreateFileW`（`FILE_READ_ATTRIBUTES`、全共享、`FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT`）、`GetFileInformationByHandleEx`（FileIdInfo）、`GetVolumeInformationByHandleW`、`CloseHandle`。生产代码只读名字与元数据，不读文件内容，不写、不删、不改属性，不启动进程、不联网。

| 要求 | 实现与验证 |
|---|---|
| 计划契约 | 未知键、相对路径、`..`、非法/空段、超过 8 段、`max_depth` 0/17 均 `InvalidPlan`；合法计划可读。`scan_plan_contract`。 |
| pattern / marker / discovery | 多层通配、`#`、大小写不敏感、文件与目录、`keep_newest`、三种 marker（`file` / `children_all` / `dir_name`）、discovery 排除被其它 target 覆盖的子项、体量与 `newest_activity`。`scan_pattern_marker_discovery`。 |
| 重叠与守卫 | 同路径取更保守级别；`contains_protected` / `inside_protected` / `hard_guard` / `.git` / `too_recent`。`scan_overlap_and_guards`。 |
| 联接 / 预算 / 取消 / 身份 | 中间段联接不进入；条目内联接不计入体量；预算 `partial`；取消 `cancelled`；同一目录身份稳定、删后重建不同。`scan_reparse_budget_cancel`。 |
| 归一化 / 快照 / 增长 | SPEC 第 5 节全部样例；19/20 项、1 GiB/天、不足 1 小时。`scan_snapshot_growth_keys`。 |
| 真实冒烟 | `examples/real_smoke.rs` 只打印组级汇总 JSON，stdout 无绝对路径。 |

## 检查命令

均在工作树根执行：`node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-B --mode <mode>`。

| 模式 | 结果 | 回执 |
|---|---|---|
| baseline | passed | `2026-10-26T04-55-52.618Z-38396-baseline-result.json` |
| lock | passed | `2026-10-26T05-00-04.681Z-42772-lock-result.json` |
| check | passed | `2026-10-26T05-02-26.532Z-38872-check-result.json` |
| test | passed（5/5） | `2026-10-26T05-02-43.655Z-31300-test-result.json` |
| red-nc1 | passed（底层测试失败且含 `SCAN_NO_FOLLOW`） | `2026-10-26T05-04-51.398Z-13680-red-nc1-result.json` |
| test（恢复后） | passed | `2026-10-26T05-05-09.853Z-24020-test-result.json` |
| real | passed；`completed`，visited 234767，约 41s | `2026-10-26T05-05-28.752Z-17660-real-result.json` |
| check --final | passed | `2026-10-26T05-06-28.035Z-37228-check-result.json` |
| test --final | passed；proofAudit nc1 绑定恢复绿 | `2026-10-26T05-06-45.132Z-23328-test-result.json` |
| real --final | passed；`partial`，visited 234806，约 28.5s | `2026-10-26T05-06-59.905Z-37892-real-result.json` |
| archive | passed；247 文件 / 1,975,852 字节 | `docs/acceptance/wave2/b/ARCHIVE.json` |

## 负控 nc1

只改 `packages/junk-scan/src/scan.rs` 体量遍历中的一行：将 `Kind::Reparse => {}`（约第 301 行）改为 `Kind::Reparse => stack.push(child.path),`，使体量遍历进入联接。未改测试。`red-nc1` 失败信息含 `SCAN_NO_FOLLOW`。立即 `git checkout -- packages/junk-scan/src/scan.rs` 恢复原字节后 `test` 全绿。

| 状态 | `scan.rs` SHA-256 | productionHash |
|---|---|---|
| 红 | `b43b839fe4da9d7eb983094bc18037ed97911936d78fd4d3a79c405c853def2b` | `7992fcca1c07dacf840e6d87f89de95ac5623ecb17017040a7214936113307ee` |
| 恢复 | `ba8d06c8e021435f5e93ff4b25cb32f9557f1511132126aee01ec9e0b4dde14c` | `7069e3f0642d9acdee59770daea1dc66a3ab8aa4db51d622181fd4cecb62ae5d` |

testHash 始终 `82404ab5acdd84a43f3ae3a12505627c166f72a6c95a5d4347f3910c993f79c1`。

## 真实只读冒烟摘要

检查器按冻结 `real-plan-template.json` 填入本机 known folders。输出仅组级字段。final 一次：`status=partial`（`system-temp-old` 上 `access_denied` 1、`identity_unavailable` 6），`visited_entries=234806`，开始 `2026-10-26T05:06:59.907Z`，结束 `2026-10-26T05:07:28.386Z`。组级：chrome-cache 8/8、chrome-login 9/0（受保护）、npm-cache 1/1、system-temp-old 3341/22、user-temp-old 19/2。开发期另一次 real 为 `completed` / 234767。两次 stdout 均无 `C:\` 绝对路径。未读文件内容，未改未删真实文件。

## 未做或未验证

- 未验收 macOS / 非本机 Windows。
- 未接桌面 UI、IPC、Tauri；未做 A→B 真实规则产物联测（本票只消费冻结 JSON 形状）。
- 进程在用判断属 WATER-W2-C；本票只透传计划中的 `in_use`。
- 未执行任何真实删除；清理属 WATER-W2-D。
- 生产竞态、用户 scope/自然同意、本机全部垃圾覆盖率未声称。
- 交回后停止测试与后台进程。
