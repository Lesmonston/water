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

---

# 补单 01（Addendum 01）验收补充

- 执行模型（actual model）：**Grok Bot**
- 续做起点（continuation base）：`b593f0be97e7338bbe54c85e456ce3a8c4d0c7a0`（上一轮 docs 提交，即本报告 §1 的"最终 HEAD"）。本轮**未重跑 baseline**。
- 新实现提交（补单 01）：`2b6fb5350c19930eaee4227be4c11490459f5b41`，作者/提交者 Riku Toto `usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai`，提交时间 2026-10-27 14:18:26 JST。父提交即 `b593f0be`。
- 本轮**只在 `b593f0be` 之后新增提交**：实现提交 `2b6fb535` + 本 docs 提交；全程无 amend/reset/squash/force、无 push/merge/rebase。所有时间均为 Asia/Tokyo（UTC+9）；检查器回执 `...Z` 为 UTC，本节已换算 JST。
- 冲突时以本补单为准（precedence over 原票）。

## A-1. 本轮冻结文件 hash（committed，working-tree = LF，`.gitattributes` 内 `*.rs text eol=lf`）

- `src/native_windows.rs` sha256 = `eed60fd9dfdbeecbe42cdea199625b276bf57d4a6fca9e6b659ac794d4cf4bd6`
- `src/lib.rs` sha256 = `ad2766cb90e17e2ed6e826894f5621f2de4d22ccfb49c2d092fec47c4d5f7de0`
- `src/path.rs` sha256 = `c730a15e3914f00d950257720ed05e6884c0caa9e3f0257929c10977762c9d4b`
- `tests/clean_v1.rs` sha256 = `6c0a8e3b7953ecf02bb6fa77c6ad2077ae590c620bb7ebe27d0c7a3d0aaf3cf5`

（与 §3 的旧 hash 不同：本轮对 §3 的文件进一步加固，并新增编辑 `src/path.rs`；四个文件逐一 `git add`、`git commit -F` UTF-8 文件，提交信息字节完好，未用 `git add -A`、未用 `git stash`。）

## A-2. 补单 11 条改动（全部在 `packages/junk-clean/src/`）

| # | 级别 | 改动 | 如何满足 / 验证 |
|---|---|---|---|
| 1 | 高 | 删除前**从该项自身句柄**复检名称代理链接：仅当 `attr&REPARSE` 且 `tag&NAME_SURROGATE` 且 `file_id==快照 id` 三者同真才删链接，否则 `failed+=1` | TOCTOU 并发替换下才可达，无确定性测试钩子（见 A-5）；经代码评审 |
| 2 | 中 | 身份取自**已遍历句柄**，删除 `check_identity` 及其两处按名二次取身份的调用（`identity_of` 保留为 pub） | 由既有 `clean_revalidation_skips`(CLEAN_IDENTITY) + 本轮 nc 链共同支撑 |
| 3 | 中 | 枚举区分**正常结束**（错误码 18 `ERROR_NO_MORE_FILES`，经 `last_os_error`）与真实错误 | 代码评审 + 全测试绿 |
| 4 | 中 | 剩余项**按句柄**计数 | 代码评审；`clean_partial_stop_journal` 覆盖剩余计数路径 |
| 5 | 中 | 删除时**对象已变**（object-changed）则停止该项 | TOCTOU 并发下才可达，无测试钩子（见 A-5）；代码评审 |
| 6 | 低 | **快照后新到达**的条目不计为失败 | TOCTOU 并发下才可达，无测试钩子（见 A-5）；代码评审 |
| 7 | 低（M2） | 快照查找改**二分搜索** | 代码评审 + 全测试绿（查找结果等价） |
| 8 | 低 | 拒绝 **>255 UTF-16 单元**的路径段（`from_json` + `nt_open` 两处） | `path.rs::validate` 增 `part.encode_utf16().count() > 255`；`CLEAN_LONG_PATH` 证明合法超长路径（自身 >300 字符、每段 ≤255）仍按句柄删 |
| 9 | 低 | `FILETIME → Option<SystemTime>` 用 **checked** 转换（`is_none_or` 边界判断） | 代码评审；`clean_report_volume` 覆盖时间/容量字段 |
| 10 | 低 | unsafe 枚举加**边界/对齐检查** + `nt_open` **RAII** 句柄包装 + size 断言 | 代码评审；clippy `-D warnings` 全过 |
| 11 | 低 | **祖先身份读取失败 → Changed**，且**驱动器根纳入祖先链** | `CLEAN_GUARD_ID` 祖先别名子用例证明祖先身份比对生效；nc2 反证 |

## A-3. `clean_handle_hardening` 新增的 3 个带标记断言（仍恰好 6 个测试，既有名称/断言逐字节未改）

- **CLEAN_GUARD_ID**：保护路径为 junction 别名，解析到待删项的**父/祖先目录**（名称不重叠，文本比对落空、仅身份命中）→ 待删项 `Skipped`/`ProtectedOverlap`；别名受害目录与另一保留项存活。
- **CLEAN_LONG_PATH**：待删项**自身路径 >300 字符**（四段各 60 字符）→ 叶子被删、项 `Deleted`、`failed_entries==0`；项外同名 sibling 不受影响。
- **CLEAN_REPARSE_KIND**：待删项下**第二层空目录**经 `set_custom_reparse`（FSCTL_SET_REPARSE_POINT，自定义非链接 tag `0x00007A57`，backup 语义）打上标 → 整项 `Reparse`/`Skipped`、`freed_bytes==0`；保留项与各层存活。

> items 1/5/6 仅在并发替换下可达，按禁令**不在生产代码加测试开关**，故无对应测试用例，改以代码评审 + A-5 的复检顺序/计数说明交付。

## A-4. 三个负控制（red-nc1 → test → red-nc2 → test → red-nc3 → test；每条仅改 src 中真正被调用的一处）

| 控制 | src 编辑位置 | 编辑 | 失败标记（信息）| 结果 | red 退出 | 还原后 native hash |
|---|---|---|---|---|---|---|
| nc1 | `native_windows.rs:749`（walk_subtree：非名称代理重解析点 → 毒化整项） | `if raw.tag & NAME_SURROGATE == 0 {` → `if false {` | `CLEAN_REPARSE_KIND: a custom reparse tag was not treated as an unknown reparse point` | 5 passed, 1 failed | 101（observedExpectedFailure） | `eed60fd9…` ✓ |
| nc2 | `native_windows.rs:740`（walk_subtree：按身份比对保护路径） | `if protected_ids.contains(&id) {` → `if false {` | `CLEAN_GUARD_ID: an aliased protected path was not enforced` | 5 passed, 1 failed | 101 | `eed60fd9…` ✓ |
| nc3 | `native_windows.rs:50`（全局 nt_open 选项 OPTS） | 去掉 `OPEN_REPARSE_POINT \| ` | `CLEAN_NO_FOLLOW: the junction link was not removed by handle` | 4 passed, 2 failed | 101 | `eed60fd9…` ✓ |

- 每条 red：检查器确认 `git diff HEAD -- src` 非空且 `git diff HEAD -- tests` 为空、无 `could not compile / error[Exxxx] / panicked / timeout`、输出含对应 proofTarget 标记。
- 每条 red 后立即 `git checkout -- packages/junk-clean/src/native_windows.rs`，sha256 均还原为 `eed60fd9dfdbeecbe42cdea199625b276bf57d4a6fca9e6b659ac794d4cf4bd6`，`git status --porcelain` 为空，随后 `--mode test` 复绿（6 passed）。

## A-5. items 1/5/6 的复检顺序与计数（无测试钩子的原因）

这三条只在"快照与删除之间被并发替换/改写对象"（TOCTOU）时才触发。实现的删除阶段对**每一待删项**执行固定顺序复检：(a) 用该项**自身**句柄重新打开；(b) 读取其身份与重解析信息；(c) 与快照 `file_id` 及 `NAME_SURROGATE` 标位比对；(d) **三者同真才** `set_delete`。任一不符即**停止该项并 `failed_entries += 1`**（计为失败，而非静默跳过）；快照后新到达的子项在删除时被枚举到会使目录删除判为对象已变（item 5/6），同样停止该项、不把"规划项"误计为清理失败。要在确定性测试里复现，必须在同进程内于快照与删除之间注入并发 rename/replace——这需要在**生产代码**里加测试开关，被禁令明确禁止，故仅以代码评审交付。

## A-6. 门禁结果（本轮，JST）

| mode | finalGate | status | JST |
|---|---|---|---|
| `red-nc1` | false | passed | 2026-10-27 14:20:18 |
| `test`（nc1 后复绿） | false | passed | 2026-10-27 14:20:29 |
| `red-nc2` | false | passed | 2026-10-27 14:20:58 |
| `test`（nc2 后复绿） | false | passed | 2026-10-27 14:21:10 |
| `red-nc3` | false | passed | 2026-10-27 14:21:34 |
| `test`（nc3 后复绿） | false | passed | 2026-10-27 14:21:45 |
| `check --final`（fmt+clippy -D warnings+build） | true | **passed** | 2026-10-27 14:22:25 |
| `test --final`（proofAudit 校验红/绿链顺序） | true | **passed** | 2026-10-27 14:22:33 |
| `archive` | false | passed | 2026-10-27 14:22:42 |

- `check --final`、`test --final` 均在**干净的已提交树**（HEAD=`2b6fb535`）上运行；`test --final` 的 proofAudit 复核 red-nc1→绿→red-nc2→绿→red-nc3→绿 的链顺序与各快照 sha256，全部通过。
- `archive` 新增 151 份回执至 `docs/acceptance/wave4/g1/receipts/`（目录现 498 份）并更新 `ARCHIVE.json`。

## A-7. 约束遵守与收尾

- 未 push/merge/rebase；**无 amend/reset/squash/force**（仅在 `b593f0be` 之后 ADD 提交）；未改主线 ledger/契约/检查器/其它包；未下载、未联网、未改全局/网络 git 配置（提交身份经 `git -c user.name/email` 单次注入，未写入任何 config 文件）；cargo 离线 jobs=1 私有 target；原生窗口/对话框/浏览器 0；未触碰真实用户位置；未用 `git stash`；四文件逐一 `git add`、提交信息经 UTF-8 文件 `git commit -F` 并校验字节完好。
- 负控制均单处 src 编辑、`git checkout` 字节级还原并校验 hash。
- 收尾：本机所有由本执行方启动的进程均已退出，临时文件已清理，工作区树干净。
