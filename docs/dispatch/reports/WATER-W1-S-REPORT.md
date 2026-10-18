WATER-W1-S 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/s/docs/dispatch/reports/WATER-W1-S-REPORT.md

# S 执行回执

交付状态：SUBMITTED，等待总控独立验收与集成。Windows x64 受控范围通过；不表示 macOS、桌面或 M1 完成。

- 权威工单：主检出 `docs/dispatch/tickets/WATER-W1-S-NATIVE-PICKER-20261018.md`；未 merge 取票。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/s`；分支 `worker/water-w1-s`。
- 精确首次基线：`3d0faefa97267a6aa57f880a315a2cde7fe06e98`，tag `water-w1-parallel-wave-base-20261018`。
- 实现及全部五 final 的同一受测提交：`ececf1ced87eb02cd75886677f330a9c8c72d7be`。
- 报告提交的完整 SHA、报告文件 SHA256 及受测 SHA 统一见证据目录的 [SUBMISSION.json](../../acceptance/wave1/s/SUBMISSION.json)。该文件在本报告提交之后仅以证据提交写入，避免在报告正文自嵌自身 commit SHA。报告和该封存提交均不改产品。
- 实际引擎：OpenAI Codex，本 API 会话；开发指令标注基于 GPT-6，更细模型/部署 ID 未暴露，未推测。未启动子代理、实现 worker、外部模型或第三方安装器。
- 运行记录使用主机 UTC 时间：本次 baseline 于 `2026-10-18T14:58:20.000Z` 开始，最后 bridge 于 `2026-10-18T15:09:01.771Z` 完成；最后一门的 Asia/Tokyo 日期为 2026-10-19。

## 改动与逐项要求

仅新增 `packages/native-picker` 的 Cargo.toml、私有 Cargo.lock、README、三个 src Rust 文件和唯一测试文件，共七文件。独立 workspace/resolver 3，edition 2024、rust-version 1.95、publish=false、四 auto=false，唯一 lib 和 picker_v1 测试目标。直接依赖恰真实 A/N/P 三个本地包，无新增外部包/dev/build 依赖。helper 离线生成锁、核对全部远端依赖版本/checksum 与根锁相同，根 Cargo 不变。

| 要求 | 实际实现和验证 |
|---|---|
| 纯构造 | PickerOptions 私有 String；new 直接调用真实 N.validate_windows_path，保留原字符串，不做 IO/COM/UI。非法、相对、盘根、UNC、父段、保留名和控制字符由五测第一项覆盖。 |
| 初始目录 | Windows x64 在 COM 前真实 N.open_directory，保留初始 lease 至该调用结束；junction 被 N 拒绝，无窗口 marker。初始目录仅用于 SetFolder。 |
| 原生选择 | 真正 CoCreateInstance(IFileOpenDialog)、Show、GetResult、IShellItem.GetDisplayName(SIGDN_FILESYSPATH)。固定 SPEC 三个 GUID、槽 2/3/9/12/17/18/20/5、选项 0x02110868、标题及 OK 标签。非 Windows x64 select_scope 直接 UnsupportedPlatform，无替代 UI。 |
| 取消 | 仅实际 Show 的 0x800704C7 映射为 Ok(None)，随后不会 GetResult 或登记，不缓存上次结果。真实取消后 registry 为空，仍可占用并 decline 唯一槽。 |
| 所选结果 | Show 成功后才读取 COM 实际结果；UTF-16 逐码元有界查 NUL（最多 32768），严格 from_utf16。结果 String 原样传 P.prepare 和 SelectedScope.root_path，未将初始路径或 fixture expected 当结果。 |
| P 登记 | 真正 P.prepare(scope_id, result_path)→confirm。prepare 错误原样包装 Source；confirm 错误先 decline 本次 pending，再返回原错。真实 full、DuplicateScope、DuplicateRoot 均不增加槽且不损坏既有能力。 |
| 公开能力 | SelectedScope 私有 RegisteredScope/String，仅两个可信 Rust getter；无任意路径构造器、Clone/Debug/Serde/Default、JSON/HTTP/IPC。实际 begin_scan/check_permit/finish/revoke、跨 registry 拒绝、过期 permit 和撤销后拒绝均覆盖。 |
| COM 所有权 | STA flags=6；S_OK/S_FALSE 各由一个非 Send guard 平衡 CoUninitialize，changed mode 不创建 guard。只对成功非空输出建立 COM owner。接口 Release、PWSTR CoTaskMemFree 均 RAII，所有提前返回按逆序释放。 |
| unsafe 与错误 | unsafe 只在 native_windows.rs；每处 FFI/指针/调用/释放均有 SAFETY/ABI/生命周期说明，其他模块和测试 forbid/deny unsafe。PickerError 恰六变体，所需 derives/Display/Error 齐备；非包装错误为 `<Variant> at /picker`，不附路径/HRESULT。 |
| 安全范围 | 产品不枚举、不读取普通内容、不修改 cwd、不写文件、删除、移动或 ACL；不调用 shell/子进程、不接 R。测试仅读取冻结 index，冻结 UI driver 只点击当前测试 PID、固定 title 的按钮。 |

COM vtable 使用 repr(C) 的固定结构，未调用的槽仅占一个 x64 指针位置；Release 使用所有接口共有的 IUnknown 前缀。COM 和任务字符串 owner 均为私有，生命周期始终短于先创建的 apartment guard；UTF-16 解码失败也释放成功分配的 PWSTR。

## 五测、先红和恢复链

所有 suite/red 均由冻结 helper 运行精确五顶层测试，单线程、--nocapture、无 skip/filter。正常 suite 每次真实 cancel 一次、select 六次，全部五绿。被测输入由本树 WATER_PICKER_INDEX 实际字段读取，再约束在本树冻结 fixture；N 身份另行真实读取核对，没有写死 file ID/volume serial。

| 顶层测试 | 覆盖 |
|---|---|
| picker_options_and_errors | 纯路径构造、错误文本/类型、真实 N 初始 junction 拒绝且无弹窗 |
| picker_native_cancel | 实际模态取消→None，无槽占用且可复用容量 |
| picker_native_confirm | 实际选择→真实 scope_id、路径和 N root identity，登记仍有效 |
| picker_registry_failures | 实际选择后的 full、duplicate ID/root；无额外槽、既有能力仍可 begin/finish |
| picker_public_lifecycle | SelectedScope→真实 P begin/check/finish/rebegin/revoke，外 registry/旧 permit/撤销后拒绝 |

首次先完整写五测和可编译骨架；骨架已运行真实 COM 窗口，但未做词法拒绝和结果登记。首次 red-behavior **0 passed / 5 failed**，每项为 S_BEHAVIOR 目标断言失败，真实 cancel 一次/select 三次，测试退出 101；没有用缺窗、编译或超时造红。随后实现并得到完整五绿。

实现后 rustfmt 改变了测试字节，故首次红不绑定最终测试哈希。按票在稳定最终版上恢复相同缺陷，再执行 red-behavior→原字节恢复→suite；这是**实现后负控重放**，不冒称首次先红。首次与重放均保留，且 final proofAudit 使用重放链。

| 阶段 / helper mode | 底层完整五测结果 | 目标 | 原始 receipt（证据 helper/ 下） |
|---|---|---|---|
| 首次 red-behavior | 0 通过 / 5 失败，退出101 | S_BEHAVIOR | `2026-10-18T15-02-02.397Z-23900-red-behavior-result.json` |
| 首次实现 suite | 5 通过 / 0 失败，退出0 | 全部 | `2026-10-18T15-02-40.088Z-33572-suite-result.json` |
| 最终字节 red-behavior 重放 | 0 通过 / 5 失败，退出101 | S_BEHAVIOR | `2026-10-18T15-04-38.868Z-20840-red-behavior-result.json` |
| 重放恢复 suite | 5 通过，退出0 | 全部 | `2026-10-18T15-04-59.121Z-28416-suite-result.json` |
| red-nc1：真实取消映射暂改 Err(DialogFailed) | 4 通过 / 1 失败，退出101 | S_CANCELLED | `2026-10-18T15-05-23.422Z-29296-red-nc1-result.json` |
| nc1 原字节恢复 suite | 5 通过，退出0 | 全部 | `2026-10-18T15-05-46.761Z-43412-suite-result.json` |
| red-nc2：真实 P.prepare 暂传错误 ID | 2 通过 / 3 失败，退出101 | S_SCOPE_ID | `2026-10-18T15-06-09.977Z-36220-red-nc2-result.json` |
| nc2 原字节恢复 suite | 5 通过，退出0 | 全部 | `2026-10-18T15-06-35.072Z-24348-suite-result.json` |
| red-nc3：返回前暂 revoke 刚确认能力 | 2 通过 / 3 失败，退出101 | S_REGISTERED | `2026-10-18T15-06-58.799Z-43892-red-nc3-result.json` |
| nc3 原字节恢复 suite | 5 通过，退出0 | 全部 | `2026-10-18T15-07-22.728Z-40484-suite-result.json` |

每个 red helper 的外层退出码为 0，表示完整失败 suite 有效并命中指定目标；底层测试退出 101 已记录。三负控都直接修改实际生产逻辑，未改测试、runner 或加测试开关。每红后立即读取原始 Buffer 恢复、验证全部六份源码/测试/manifest/lock SHA256，再跑 suite，下一负控均在恢复绿之后开始。

最终 productionHash：`30b395183d1d8d4b4769752fbe9b8fdecb90438c8558da0494a179d165238660`；testHash：`3ae00b6ffe3758de16c861782a5627dd50fb5c0786c4384b8bc0aea4b7637216`。逐文件 SHA、原/坏/恢复快照、修改说明和时间保存在 [DELIVERY-AUDIT.json](../../acceptance/wave1/s/DELIVERY-AUDIT.json)、`helper/stable-source-manifest.json`、`helper/mutation-transactions.json` 和每门 source 快照中。

## 命令、退出码与最终门

所有本票 helper 命令均在唯一 s 树中执行：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode baseline
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode lock
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode red-behavior
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode suite
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode clippy
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode red-behavior
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode suite
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode red-nc1
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode suite
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode red-nc2
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode suite
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode red-nc3
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode suite
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode fmt --final
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode test --final
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode clippy --final
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode metadata --final
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode bridge --final
```

以上每条外层退出码均为 0；完整底层 argv、退出码、stdout/stderr 和日志文件名逐条见 [RUNS.json](../../acceptance/wave1/s/RUNS.json) 与每个原始 result.json 的 commands 字段。RUNS 另包含原总控派前 baseline，其时间为 14:33，明确不是本执行者产品测试；本次实际复核 baseline 为 `2026-10-18T14-58-18.058Z-26528-baseline-result.json`，新产品尚不存在时复核通过。

| 最终 mode | 受测 SHA | 结果 / 原始 receipt |
|---|---|---|
| fmt | ececf1ced87eb02cd75886677f330a9c8c72d7be | 退出0；`2026-10-18T15-08-14.226Z-3056-fmt-result.json` |
| test | 同上 | 退出0；五测全绿；`2026-10-18T15-08-18.543Z-9408-test-result.json` |
| clippy | 同上 | 退出0；all-targets / -D warnings；`2026-10-18T15-08-43.057Z-43996-clippy-result.json` |
| metadata | 同上 | 退出0；workspace/依赖/版本/锁核对；`2026-10-18T15-08-48.312Z-31920-metadata-result.json` |
| bridge | 同上 | 退出0；`2026-10-18T15-08-55.799Z-36092-bridge-result.json` |

五 final 均在同一干净实现提交串行执行，before/after status 为空；各自 proofAudit 都核四条当前测试字节红与逐次当前源码恢复绿。bridge 为冻结独立 Rust 入口，经真实窗口 cancel/select/duplicate 后验证实际 S→N/P、所选路径、登记与撤销；返回 actual_S_N_P=true、actual_result_path=true、cancel_no_registration=true、duplicate_root_and_revoke=true、R_scan_tested=false。

另外执行一次受限格式化（退出0）：`rustup.exe run 1.95.0 rustfmt --edition 2024`，仅传入本票 lib.rs、v1.rs、native_windows.rs、picker_v1.rs 四个明确路径。临时修改/恢复及归档用项目内 Node fs/crypto，未运行产品 shell、第三方脚本或安装命令。Git 只显式 add 本票七文件、报告和各证据文件，并禁用 hooks/fsmonitor；`git diff --cached --check` 退出0，实现提交退出0。报告/封存提交同样只含白名单文档和证据。

## 证据与范围审计

原字节归档共 **372 份 / 2,370,233 字节** helper json/log/txt，无转码或换行归一化；每份源绝对路径、目标路径、长度及 SHA256 见 [ARCHIVE.json](../../acceptance/wave1/s/ARCHIVE.json)。该数量包含保留的先前总控 baseline 和本次全部输出，包含所有预期失败日志及 source 快照，不含 target/cache/profile/二进制/下载或 fixture。

[DELIVERY-AUDIT.json](../../acceptance/wave1/s/DELIVERY-AUDIT.json) 独立复核 94 新冻结条目、12 继承锁、291 唯一冻结文件全部原哈希保持；本分支与精确基线 diff 仅本票七个产品文件，最终源字节与稳定快照一致。根 Cargo、旧产品、所有冻结 SPEC/输入/helper/锁、台账、其它工作树和上游未改。本树 fixture index SHA256 保持 `0b4fdbbbc4c42ec917d54e2d13d8b632284bf7b698768a3d1473a3688f87bd69`。

只复用已由冻结 prepare 建立的四空目录/一 junction，普通内容 0 字节；未手工创建、清理或导航真实用户目录。每门冻结工具对既有 fixture 作有限校验，未获得真实 HOME/盘根扫描授权。真实系统窗口短暂可见；驱动后台隐藏，仅当前测试 PID、固定 title、复核 PID 的系统按钮点击，日志含 WATER_UI_WINDOW/WATER_UI_ACTION。

## 全部失败与未验证

产品编译、原生驱动和 final 没有非预期失败。预期失败是首次行为红、一次最终字节行为重放和三项生产负控，完整五测结果如上。开头读取中文文档曾因 PowerShell 默认编码显示乱码，之后显式 UTF-8 重读；只读定位曾尝试不存在的 `tools/parallel-wave-probe/src/picker_windows.rs`，随后从文件清单定位并读取真实 `picker.rs`。这些均非产品红、未修改或创建错误路径，不影响测试证据。

证据暂存过程尚未结束时，执行者提前发起报告提交，Git 因 `.git/worktrees/s/index.lock` 正由该暂存任务使用而拒绝，提交退出1。随后等待原暂存任务正常完成（退出0，376文件原字节核对通过）再重试；未删除锁、reset 或改变产品。该失败及更正另记 [MANUAL-OPERATIONS.json](../../acceptance/wave1/s/MANUAL-OPERATIONS.json)。

COM 分配/创建失败、RPC_E_CHANGED_MODE、非终止/非法 UTF-16 系统输出及 P.confirm 失败未做故障注入，只完成错误映射与所有权源码审阅。固定 driver 只确认当前受控目录，没有验证选择到与初始目录不同位置的人工导航；实际生产代码仍只使用 GetResult 返回值。不能把该未覆盖场景说成已运行。

未验证非 Windows x64、macOS、真实用户 scope、恶意生产竞态或自然用户手势鉴真；OS 对话框内部导航展示/缓存未逐项审计。N/P 原有身份与授权边界保持，不因 picker UI 声称加密鉴真或遍历安全。本票没有 R 扫描、HTTP/IPC、桌面壳、文件保存、删除或 M1 完整闭环。无范围/权限扩张请求，交回后停止产品修改，由总控独立验收与集成。
