WATER-W4-G1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g1/docs/dispatch/reports/WATER-W4-G1-REPORT.md

# WATER-W4-G1 清理执行器加固（重门）验收报告

- 执行模型（actual model）：**Grok Bot**
- 工作区：`F:/new/smaltalk/water/.worktrees/w4-g1`
- 分支：`worker/water-w4-g1`
- 基线提交（base）：`0ca42f8e8038a5a7816802c5a7f175a966b0625c`
- 所有时间均为 Asia/Tokyo（UTC+9）；检查器回执里的 `...Z` 时间戳为 UTC，本报告已换算为 JST。

## 1. 最终提交

| 类型 | SHA | 说明 |
|---|---|---|
| 实现提交（当前 HEAD 的父链上游） | `bdd89bc8167607e08c5c4453b6290bad856ccf9e` | 由 `854bdeb9` 本地 amend 而来（见 §2），含 `src/lib.rs`、`src/native_windows.rs`、`tests/clean_v1.rs` 相对 base 的全部改动 |
| 文档提交（最终 HEAD） | 见本次报告提交（docs：报告 + 验收证据归档） | 仅新增 `docs/dispatch/reports/WATER-W4-G1-REPORT.md` 与 `docs/acceptance/wave4/g1/**`（均在 manifest 的 allowedFiles / allowedPrefixes 内） |

- 作者/提交者：Riku Toto `usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai`
- 实现提交时间：2026-10-27 00:10:21 JST。
- 全程**未 push、未 merge、未 rebase、未改 base 以外的发布状态**；base `0ca42f8` 始终是 HEAD 的祖先。

## 2. 实现提交的本地 amend 说明（854bdeb9 → bdd89bc8）

原实现提交 `854bdeb9` 存在两个问题，均在本地（未推送，故可安全 amend）修正：

1. **提交信息被损坏**：早先一处 `tr -d 'r'` 误用把提交信息里所有字母 `r` 删除（如 "CreateFileW"→"CeateFileW"、"reparse"→"epase"、"Cargo"→"Cago"、"native_windows.rs"→"native_windows.s"）。已用仅去除 CR（`sed -i 's/\r$//'`、绝不动字母）的 UTF-8 文件 `git commit -F` 重写为正确信息。
2. **缺少 CLEAN_NO_FOLLOW 覆盖**：`854bdeb9` 的 `tests/clean_v1.rs` 未包含用于证明"删除时只删名称代理链接本身、绝不进入目标"的子用例。amend 把该子用例并入 `clean_handle_hardening`（见 §4、§6）。

amend 仅修改**同一条未发布提交**，不涉及任何已发布历史；`src/lib.rs`、`src/native_windows.rs` 的字节内容在 amend 前后未变（见下 hash）。

## 3. 冻结文件 hash（committed，均未改动）

- `src/native_windows.rs` sha256 = `1e1364f5c7cf98bfc5a37b183cdbcdd6d822753235571d0fda50a9e600d1667e`（992 行）
- `src/lib.rs` sha256 = `388a98b3051d99e7486379e0d9556c0df85f4b1adfb7429711dc8dcfa47975f6`（243 行）
- `tests/clean_v1.rs` sha256 = `cf38cd6acc89dc8d08e7783d0d21c24a5fdc79f37741ae955164f924d479efb4`（1234 行，含 §4 的 NO_FOLLOW 子用例并经 rustfmt）
- manifest/task 列出的 contracts/ADR 冻结文件：检查器 `audit()` 逐一比对 sha256 全部通过（见 §5 check 结果）。
- `Cargo.toml` / `Cargo.lock` / `README.md`：未改动（检查器 productionHash 覆盖）。

## 4. 测试文件（tests/clean_v1.rs）

- 恰好 6 个测试，与 manifest `expectedTests` 完全一致：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`、`clean_handle_hardening`。
- 原有 5 个测试**逐字节未改**（名称与断言全部保留，满足 SPEC §9 第 151 行"原有 5 个测试里的标记全部保留"）。
- 仅 `clean_handle_hardening`（本任务需新写、SPEC §9 "至少覆盖" 的测试）新增一个 **CLEAN_NO_FOLLOW 子用例**，置于该测试最前：构造"仅含一个 junction 链接"的待删项，断言（a）外部 junction 目标及其文件完好、（b）junction 链接被按句柄删除（`symlink_metadata` 为 err）、（c）该项状态为 `Deleted`。真实实现下三条断言全过；在 nc3（删除 OPEN_REPARSE_POINT）下，删除步骤会跟随链接打开目标、line-773 复检落空 → 链接未删 → 断言(b)/(c)失败并打印 `CLEAN_NO_FOLLOW`。此举是对"需自写的 `clean_handle_hardening`"的正常用例设计，**未改动 5 个既有测试、未改动检查器**。

## 5. 检查器命令与结果（node scripts/checkup-wave-check.mjs --task WATER-W4-G1 ...）

检查器为只读，自行调用 rustup 1.95.0 工具链、`cargo metadata`、`cargo test`，离线、jobs=1、私有 target；本执行方仅调用检查器，未改动检查器/契约/ledger/其它包或工作区。

| mode | finalGate | status | JST 时间 |
|---|---|---|---|
| `red-nc1` | false | passed | 2026-10-27 00:49:38 |
| `test`（nc1 后复绿） | false | passed | 2026-10-27 00:49:42 |
| `red-nc2` | false | passed | 2026-10-27 00:49:59 |
| `test`（nc2 后复绿） | false | passed | 2026-10-27 00:50:07 |
| `red-nc3` | false | passed | 2026-10-27 00:50:33 |
| `test`（nc3 后复绿） | false | passed | 2026-10-27 00:50:37 |
| `check --final` | true | **passed** | 2026-10-27 00:52:25 |
| `test --final`（proofAudit） | true | **passed** | 2026-10-27 00:52:30 |
| `archive` | false | passed | 2026-10-27 00:52:33 |

- `check --final`、`test --final` 均在**干净的已提交树**上运行（before.status 为空），HEAD 全程不变，收尾树干净。
- `test --final` 的 proofAudit 校验了回执链顺序 red-nc1 → 绿 test → red-nc2 → 绿 test → red-nc3 → 绿 test，并逐一复核各快照 sha256，全部通过。
- `archive` 把回执归档至 `docs/acceptance/wave4/g1/receipts/`（267 份）并写入 `ARCHIVE.json`、`.gitattributes`。

## 6. 三个负控制（每条仅改 src 中真正被调用的一处）

| 控制 | src 编辑位置 | 编辑 | 触发失败的断言 | 失败信息（标记）| red 退出 | 还原后 native hash |
|---|---|---|---|---|---|---|
| nc1 | `native_windows.rs:678`（快照遍历，非名称代理重解析点 → 毒化整项） | `if raw.tag & NAME_SURROGATE == 0 {` → `if false {` | `clean_handle_hardening` @ `clean_v1.rs:988` | `CLEAN_REPARSE_KIND: a custom reparse tag was not treated as an unknown reparse point`（5 passed, 1 failed）| exit 101 | 回 `1e1364f5…` ✓ |
| nc2 | `native_windows.rs:670`（按身份比对保护路径） | `if protected_ids.contains(&id) {` → `if false {` | `clean_handle_hardening` @ `clean_v1.rs:1054` | `CLEAN_GUARD_ID: an aliased protected path was not enforced`（5 passed, 1 failed）| exit 101 | 回 `1e1364f5…` ✓ |
| nc3 | `native_windows.rs:50`（全局 nt_open 选项 OPTS） | `OPTS = OPEN_REPARSE_POINT | ... ` 去掉 `OPEN_REPARSE_POINT |` | `clean_handle_hardening` @ `clean_v1.rs:961`（另 `clean_no_follow` @ 447 亦失败，无标记）| `CLEAN_NO_FOLLOW: the junction link was not removed by handle`（4 passed, 2 failed）| exit 101 | 回 `1e1364f5…` ✓ |

- 每条 red 运行：检查器确认 `git diff HEAD -- src` 非空且 `git diff HEAD -- tests` 为空、无 `could not compile / error[Exxxx] / panicked ... timeout`、输出含对应 proofTarget 标记，置 observedExpectedFailure。
- 每条 red 后立即 `git checkout -- native_windows.rs`，sha256 均还原为 `1e1364f5c7cf98bfc5a37b183cdbcdd6d822753235571d0fda50a9e600d1667e`，`git status --porcelain` 为空，随后 `--mode test` 复绿（6 passed）。
- **关于 nc3 与 "单处 src 编辑触发 CLEAN_NO_FOLLOW"**：已用单处 src 编辑（line 50 去 OPEN_REPARSE_POINT）成功触发标记，无需改测试或检查器。需说明的实现事实：基线测试 `clean_no_follow` 的外部 junction 目标为非空目录，若删除步骤"跟随"链接会打开目标而非链接、且 line-773 复检使其转为 `failed`（链接未删），因此在该最小编辑下 `clean_no_follow` 先在其无标记断言（447 行）处 panic；带标记 `CLEAN_NO_FOLLOW` 的证明由 `clean_handle_hardening` 的 NO_FOLLOW 子用例（961 行"链接未被按句柄删除"）给出。两者同时失败，与"实现拒绝跟随、故在 nc3 下无法删除链接"的因果一致。

## 7. 声明的 8 个系统函数（allowedFfi，`extern "system"`）

与 manifest `allowedFfi` 完全一致，`src/` 中无其它 FFI 声明：
`CloseHandle`、`CreateFileW`、`GetDiskFreeSpaceExW`、`GetFileInformationByHandleEx`、`GetVolumeInformationByHandleW`、`NtOpenFile`、`RtlNtStatusToDosError`、`SetFileInformationByHandle`。

## 8. SPEC §3–§10 符合性

- **§3 句柄化删除**：`src/` 无 `std::fs` / `fs::` / `Path` / `PathBuf` / `remove_file|remove_dir|read_dir|symlink_metadata|set_permissions|OpenOptions`（检查器 forbidPatterns 仅扫描 `outputRoot/src`，全过）；所有打开/枚举/删除经 NtOpenFile + SetFileInformationByHandle 句柄完成。
- **§4 名称代理识别**：仅名称代理位（`0x2000_0000`）被当作链接；其它重解析点毒化整项（nc1 证明）。
- **§5 按身份守卫/保护路径**：硬守卫与保护路径均按文件 Id 身份比对（含经 junction 别名改写的路径），nc2 证明保护路径身份比对真实生效。
- **§6 结构化不跟随**：全局 OPTS 含 `OPEN_REPARSE_POINT | SYNCHRONOUS_IO_NONALERT | OPEN_FOR_BACKUP_INTENT`，nt_open 结构化不跟随；nc3 证明去掉该位会"跟随"从而删链接失败。
- **§7 删除处置**：目录/文件分支在打开后复检"非重解析点 + FileId == 快照"后才 set_delete；名称代理链接分支打开链接本身并删除、绝不进入目标（实现另在 773 行加了一次额外复检，属比 spec 更严，不违背）；采用 POSIX + ignore-readonly 处置并带回退（CLEAN_READONLY 用例覆盖）。
- **§8 剩余路径打开用 `\\?\` 前缀**：已施加于剩余按路径的打开点。
- **§8 仅声明 8 个系统函数**：见 §7，检查器 unsafePolicy 通过。
- **§9 `clean_handle_hardening` 至少覆盖**：CLEAN_REPARSE_KIND、CLEAN_GUARD_ID、CLEAN_LONG_PATH、CLEAN_READONLY（另加 CLEAN_NO_FOLLOW 子用例）；原 5 测试标记全部保留。
- **§10 负控制表**：nc1→CLEAN_REPARSE_KIND、nc2→CLEAN_GUARD_ID、nc3→CLEAN_NO_FOLLOW，每条单处真正被调用的 src 编辑，全部红→还原→复绿（见 §6）。
- 公共 API、plan 校验、report/log 格式、Cargo 依赖与 Cargo.lock 均未变。

## 9. 仅代码评审（未在本机运行时验证）的部分

- `\\?\` 长路径前缀在"真实超长路径"上的逐字节行为由 `CLEAN_LONG_PATH` 用例覆盖（>300 字符路径删除为 Deleted）；对超过 `\\?\` 32767 上限或跨卷的极端路径未另做压力测试（SPEC 未要求）。
- `GetDiskFreeSpaceExW` / `GetVolumeInformationByHandleW` 的卷信息用于 report 的容量字段，由 `clean_report_volume` 用例覆盖；未在多种文件系统（ReFS/网络卷）上实测。
- 773 行对名称代理链接分支的"额外复检"是比 SPEC §7 更严的实现选择；逻辑经评审，未针对该额外分支单列专门测试。

## 10. 未完成 / 偏差 / 约束遵守

- 无阻塞项；全部计划步骤完成。
- 偏差：实现提交由 854bdeb9 本地 amend 为 bdd89bc8（见 §2），纯本地、未推送。
- CLEAN_NO_FOLLOW 的标记证明落在 `clean_handle_hardening` 的 NO_FOLLOW 子用例而非基线 `clean_no_follow`（原因见 §6），仍为单处 src 编辑触发、未改既有测试/检查器。
- 全程遵守硬性禁令：未 push/merge/rebase；未下载/联网/改全局 git 配置；未安装/升级依赖；cargo 离线 jobs=1 私有 target；未触发原生窗口/对话框/浏览器；未触碰任何真实用户位置；未用 git stash；未改契约/检查器/ledger/其它包或其它工作区。
- 收尾：本机所有由本执行方启动的进程均已退出，工作区树干净。

## 11. 代表性回执路径（.local/checks 为 gitignore，已由 archive 归档）

- red-nc1: `.local/checks/WATER-W4-G1/2026-10-26T15-49-38.062Z-19848-red-nc1-result.json`
- red-nc2: `.local/checks/WATER-W4-G1/2026-10-26T15-49-59.830Z-13468-red-nc2-result.json`
- red-nc3: `.local/checks/WATER-W4-G1/2026-10-26T15-50-33.205Z-7348-red-nc3-result.json`
- check --final: `.local/checks/WATER-W4-G1/2026-10-26T15-52-25.380Z-19720-check-result.json`
- test --final: `.local/checks/WATER-W4-G1/2026-10-26T15-52-30.733Z-38020-test-result.json`
- archive: `docs/acceptance/wave4/g1/ARCHIVE.json`（+ `receipts/` 267 份）
