WATER-W2-B 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-b/docs/dispatch/reports/WATER-W2-B-REPORT.md

# WATER-W2-B 执行回执

交付状态：SUBMITTED（含补单 01），等待总控独立验收与集成。本回执不代表 VERIFIED，也不表示 macOS、桌面接线或清理执行已完成。

## 补单 01（2026-10-26）

依据 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-B-ADDENDUM-01-20261026.md`。由新对话接手，按补单要求依次读过原票、执行者规则、本回执和补单后续做。

- 实际模型：Grok Bot executor 子代理（单一执行者，没有再开实现子代理）。
- 续做起点：`79cd9d38234293ebdb24dd5153f1cc3e8954b10a`。开工时工作树干净，分支 `worker/water-w2-b`。**没有重跑 baseline**，也没跑 lock（依赖与 `Cargo.lock` 未改）。
- 新实现提交（产品与测试，干净树）：`e8be8512dc4fa36b6c4e75a8fa23de3bfd571228`。本节的 check/test/real final 都在这个 SHA 上通过。提交身份沿用本分支已有提交的作者信息，通过 `git -c` 单次传入，没有改 git config。
- 改动范围：`packages/junk-scan/src/{error,keys,model,plan,scan,snapshot,util}.rs`、`packages/junk-scan/tests/scan_v1.rs`，加上本回执与 `docs/acceptance/wave2/b/`。`native_windows.rs`、`lib.rs`、`Cargo.toml`、`Cargo.lock`、`examples/` 都没动。

### 先红后绿

先只换上新测试，在旧实现上跑 `test`，4 个失败（回执 `2026-10-26T07-20-41.200Z-27188-test-result.json`）：

| 测试 | 失败表现 |
|---|---|
| `scan_overlap_and_guards` | `util.rs:38` 切到多字节字符中间，panic |
| `scan_pattern_marker_discovery` | discovery 组 `item_count` 实际 7、期望 5（父目录没被排除） |
| `scan_reparse_budget_cancel` | 预算截断后含 `.git` 的目录被判为可清理 |
| `scan_snapshot_growth_keys` | 不带花括号的 GUID 被归一成 `#F#E#-…`，没得到 `{guid}` |

实现后 5/5 通过。

### 逐条修复

1. **discovery 排除方向。** `scan.rs` `run_discovery` 原来写的是 `is_proper_ancestor(path, &child.path)`，改成 `path_eq(path, &child.path) || is_proper_ancestor(&child.path, path)`：子项等于其它条目或是其它条目的祖先，就排除。受保护条目同理。
   - 测试：`disc/parent` 是 pattern 条目 `disc/parent/inner` 的父目录，`disc/guardhome` 是受保护条目 `disc/guardhome/vault` 的父目录，两者都不成为条目。discovery 组 5 项，`total_bytes` 为 `"44"`，不重复计。
   - marker 命中 `nest/node_modules` 后不再往里找：`max_depth` 设为 8，内层 `pkg/node_modules` 照样不出现，说明靠的是这条规则而不是深度限制。
   - `newest_activity` 断言具体时间：`2026-10-22T03:04:05Z` 和 `2026-10-20T01:02:03Z`。
2. **非 ASCII 路径。** `util.rs` `is_proper_ancestor` 改成在 `as_bytes()` 上做 ASCII 大小写不敏感的比较，不再切 `&str`。
   - 全 crate 自查：`validate_abs_path` 的 `path[3..]` 改为 `path.get(3..)`。`keys.rs` 的 `&work[idx + 1..]` 改为 `work.get(idx + 1..)`（`idx` 来自 ASCII 分隔符，原本也安全，按要求一并改掉）。
   - `plan.rs` 与 `keys.rs` 其余下标切的是 `&[char]`，不是 `&str`，不受影响。
   - 测试夹具用了 `临时安装文件`、`José`，覆盖受保护的祖先与包含、`hard_guard`（`JOSé\keep` 大小写折叠）这些情况。
3. **停止后的守卫。**
   - `measure` 现在顺带从条目自身目录的第一次列举里记下有没有 `.git`。
   - `push_hit` 在体量遍历结束后、取完 identity 后各检查一次 `stopped`。任一次已停止，条目就不进 hits，所以不输出，组上照常记 issue。
   - 分类阶段改用记好的 `has_git` 和 identity，停止后不再做任何列举。identity 获取失败（不是没做）时仍按原样记 `identity_unavailable`。
   - `budget_exhausted` 每组只记一次。
   - 测试：`max_entries=8` 截断时 `bud/gitrepo` 不可清理，`bud/many` 不出现；紧预算与截断两种情况下所有 `budget_exhausted` 计数都是 1；正常完成时 status 严格等于 `completed`。
4. **GUID。** 去掉首尾花括号后（花括号可有可无）整体是 GUID，就归一成 `{guid}`。大写、小写不带花括号的两例都已覆盖。
5. **日均增长。** `bytes_per_day` = `bytes_delta × 86400e9 ÷ 精确间隔纳秒`，用 i128 整数运算，四舍五入时 .5 远离零；溢出时退回 f64。
   - 显示用的 `days` 照旧四舍五入到 0.1，0 显示为 0.1；不足 1 小时不出增长。
   - 测试：间隔 1 小时、增长 44739243 字节，`bytes_per_day` 为 `"1073741832"`，`leak_suspect` 为 true。按旧算法除以四舍五入后的 0.1 天，只会得到 447392430。
6. **unsafe 声明。** `error`、`keys`、`model`、`plan`、`scan`、`snapshot`、`util` 七个模块文件开头都加了 `#![forbid(unsafe_code)]`。`native_windows.rs` 不变。

### 检查命令（补单 01）

均在工作树根执行，回执已归档到 `docs/acceptance/wave2/b/receipts/`。

| 模式 | 结果 | 回执 |
|---|---|---|
| test（先红） | failed，符合预期（4/5 红） | `2026-10-26T07-20-41.200Z-27188-test-result.json` |
| test | passed（5/5） | `2026-10-26T07-23-17.290Z-35424-test-result.json` |
| check | failed（只有 rustfmt 差异），`cargo fmt` 后 passed | `2026-10-26T07-23-34.397Z-5468-check-result.json` / `2026-10-26T07-24-06.950Z-32248-check-result.json` |
| test（fmt 后） | passed | `2026-10-26T07-24-22.413Z-5036-test-result.json` |
| red-nc1 | passed（底层测试失败，信息含 `SCAN_NO_FOLLOW`） | `2026-10-26T07-25-10.889Z-39360-red-nc1-result.json` |
| test（恢复后） | passed | `2026-10-26T07-25-26.132Z-18940-test-result.json` |
| check --final | passed | `2026-10-26T07-25-41.679Z-39764-check-result.json` |
| test --final | passed；proofAudit 把 nc1 红与恢复绿绑定在一起 | `2026-10-26T07-25-46.163Z-8180-test-result.json` |
| real --final | passed；`partial`，visited 233476，约 42.3s | `2026-10-26T07-25-56.679Z-39324-real-result.json` |
| archive | passed；459 文件 / 4,026,841 字节 | `docs/acceptance/wave2/b/ARCHIVE.json` |

`check --final` 之前在 `e8be8512` 上没有单独跑非 final 的 `real`，real 只跑了 `--final` 一次。每次提交前都跑过 `git diff --check`。

### 负控 nc1（重做）

只改 `packages/junk-scan/src/scan.rs` 第 326 行（`measure` 体量遍历），把 `Kind::Reparse => {}` 改为 `Kind::Reparse => stack.push(child.path),`，让体量遍历进入联接。测试不动。

- `red-nc1` 中 `scan_reparse_budget_cancel` 失败，信息为 `SCAN_NO_FOLLOW: junction target bytes must not be counted, got 50100`，其余 4 个测试通过。
- 随后立即 `git checkout -- packages/junk-scan/src/scan.rs`，git blob 从 `deb6ba38…` 回到 `c4a66a956405cbc6c85882f16814f70a63611340`，与提交一致。紧接着跑 `test`，全绿。

| 状态 | `scan.rs` SHA-256 | productionHash |
|---|---|---|
| 红 | `6e402dff72c3eec164c2242adba77953a284119e53829241b73a1909d9447ca9` | `647872ea79e04df15a354dbcb88b91e8aaf26f238e044fb00064372da30e317f` |
| 恢复 | `49f7a41565c3e4abeb7d7bad0a55c056f073a2e89a5f22b9493ab961d83683c6` | `0eb278fbb9e32baa994525b0e21aedd3ecb2ca41175397ee6884b999d8cc397c` |

新 testHash 始终为 `8c763b7b644255511941c974387f965d6729e6eae5763e0b6013eda697434a31`。

### 真实冒烟组级变化

两次都是 real --final，口径相同。原来是 `2026-10-26T05:06:59Z`，跑在 `35c94d2b` 上；现在是 `2026-10-26T07:25:56Z`，跑在 `e8be8512` 上。

| 组 | 级别 | 原 条目/可清 · 字节 | 补单后 条目/可清 · 字节 |
|---|---|---|---|
| system-temp-old | recommended | 3341/22 · 2,783,197,361 | 3562/36 · 2,342,309,416 |
| claude-code-scratchpad | confirm | 22/0 · 1,183,008,977 | 23/0 · 1,188,155,193 |
| chrome-cache | recommended | 8/8 | 8/8 |
| chrome-login-and-site-data | protected | 9/0 | 9/0 |
| npm-cache | recommended | 1/1 · 2,334,717,871 | 1/0 · 2,373,979,091 |
| user-temp-old | recommended | 19/2 | 19/2 |
| 其余 6 组 | — | 条目/可清数不变 | 同左 |

- **system-temp-old 与 claude-code-scratchpad 不再重叠。** scratchpad 的规则是 `C:\Windows\Temp` 下的 pattern `claude\*\*`，system-temp-old 是同一根目录下的 discovery。
  - 修复前，`C:\Windows\Temp\claude` 被当作 system-temp-old 的一项，推荐级、7 天，与确认级的 scratchpad 条目重复计量。
  - 修复后，它是 scratchpad 条目的祖先，被 discovery 排除。
  - 回执外另用元数据核对：`C:\Windows\Temp\claude` 现约 1,188,185,631 字节（8312 个文件），与 scratchpad 组字节基本吻合。system-temp-old 字节比原来少约 441 MB。冒烟输出只有组级字段，所以“不重叠”的依据是代码与 `scan_pattern_marker_discovery` 的同构用例，再加上这些数字上的一致性，不是逐条列出的条目清单。
  - system-temp-old 条目数增加，是两次运行之间相隔约 2 小时、系统临时目录本身有变动（当前根下有 3575 个子项）。
- npm-cache 可清数从 1 变 0：两次之间该目录增长约 39 MB，推断为最近有活动，触发了 `too_recent`。冒烟输出不含逐项原因，这一点没有核实。
- 状态 `partial` 来自 system-temp-old 的 `access_denied` 2 次和 `identity_unavailable` 7 次（原来分别是 1 次和 6 次）。stdout 只有组级字段，没有绝对路径。全程没有读文件内容，也没有改动或删除真实文件。

### 补单 01 未做或未验证

- 真实冒烟没有逐条目验证“不重叠”，见上。
- 本节新提交没有跑非 final 的 `real`，只跑了 `real --final`。
- 上文“未做或未验证”各条仍然适用。

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
