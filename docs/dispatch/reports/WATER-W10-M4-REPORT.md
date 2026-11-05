WATER-W10-M4 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m4/docs/dispatch/reports/WATER-W10-M4-REPORT.md

2026-11-05。实际执行模型：GPT-6（Codex；未获运行时更细的型号标识）。本回执是受阻交回，不是实现完成或验收通过。

## 工作树、基线与交回范围

- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m4`。
- 分支：`worker/water-w10-m4`。
- 首次 HEAD：`f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe`，开工时干净。
- 实现提交 SHA：无。发现契约缺口后停止实现；本次交回只有本回执和检查器归档的证据，不含产品改动。
- 期间写过的未完成草稿由 `check` 保存了原字节源码快照。归档后逐个核对五个草稿文件的 SHA-256 与检查快照相等，再恢复三份原有源文件、移除两份本次新建的源文件。`git diff --exit-code -- packages/junk-clean` 通过；源码、测试、README、Cargo.toml、Cargo.lock 均与首次 HEAD 一致。
- 没有修改契约、检查器、manifest、状态台账、其它包或其它工作树；没有修改 git 配置、远端或已有提交，没有 push、merge、rebase、reset、amend。
- 遵守 C 组顺序：M4 受阻后停止；未读取 M5 工单、进入 M5 工作树或开始 M5 实现/检查。

## 阻塞：真实冒烟缺少固定盘发现能力

三处约束同时成立：

1. [工单第 64 行](../tickets/WATER-W10-M4-CLEAN-20261105.md)与 [CLEAN-M35 第 9 节](../../../contracts/m35-v1/CLEAN-M35.md)要求对**每个固定盘**的 `<盘>:\.water-quarantine` 调用 `list_quarantines`，真实输出仅有状态与编号目录个数，且必须通过 `real --final`。
2. [执行者规则第 2 节](../W10-M35-WORKER-RULES.md)明确：“系统函数只用工单列出的……只放在 `src/native_windows.rs`”；生产代码不得启动进程、联网、枚举或读取未列出的环境变量；公开接口只按 SPEC 增加。
3. [CLEAN-HARDENING 第 8 节](../../../contracts/hardening-v1/CLEAN-HARDENING.md)原有八个系统函数，加上 CLEAN-M35 第 1 节唯一新增的 `NtCreateFile`，没有驱动器枚举或固定/可移动/网络驱动器类型识别能力。现有接口及新增 SPEC 也没有向真实冒烟注入权威固定盘清单的入口；检查器的 M4 `realMode` 是 `env-only`，不会传固定盘参数。

不能把遍历 A–Z、仅查系统盘、硬编码当前机器盘符当成“每个固定盘”的证明，也不能私加 `GetLogicalDrives`、`GetDriveTypeW`，在 example 中绕开 FFI 边界或启动 PowerShell。`GetVolumeInformationByHandleW` 的卷属性、`GetDiskFreeSpaceExW` 的空间数值都不能给出驱动器类型。

规则第 2 节明确：“契约冲突或缺东西时写受阻回执，不要自行变通。”因此停止，未运行真实盘探测。此项需要总控补充契约与相应检查配置，例如明确授权只读固定盘发现接口/所需系统函数，或提供经核实的固定盘输入及其传入方式；执行者没有自行修改这些文件。

## SPEC 逐节状态

| 节 | 本次状态 |
|---|---|
| 1 原则 | 未交付产品修改；依赖和锁不变。草稿的 FFI/源码政策检查通过，不能据此认为草稿已实现契约。 |
| 2 解锁对 | 曾写 `PlanItem.unlocked_paths`、结构/文本校验与祖先身份例外草稿，未测试，已从产品工作区撤回。条目内部保护身份与硬守卫没有获准放宽。 |
| 3 移入 | 曾写报告类型与句柄链/建目录/不覆盖改名草稿，未测试，已撤回。没有实际调用移动。 |
| 4 复原 | 曾写校验、句柄改名与空骨架处理草稿，未测试，已撤回。没有实际调用复原。 |
| 5 purge | 曾写显式栈与遗留报告草稿，未测试，已撤回。没有实际调用删除。 |
| 6 查看/序列化 | 曾写类型、查看和序列化草稿，未测试，已撤回。草稿的根目录拒绝访问提示等细节尚未完成审查。 |
| 7 成因说明 | 已阅读，没有以文档内容充当运行证明。 |
| 8 测试 | 原六个测试文件字节不变；五个新测试尚未写入或运行。没有建立任何测试夹具。 |
| 9 负控/真实冒烟 | 三条负控、恢复绿测、三个 final 均未运行；真实冒烟因上述契约缺口未实现、未运行。 |

## 已运行命令与结果

下列命令均在 M4 工作树执行，检查入口为总控目录的固定绝对路径：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode baseline
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode lock
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode archive
```

| 模式 | 结果 | 回执文件（归档 `receipts/` 下） |
|---|---|---|
| baseline | passed；首次分支/HEAD/干净状态与冻结输入就绪 | `2026-11-05T08-43-00.940Z-31588-baseline-result.json` |
| lock | passed；依赖只核对，没有改锁 | `2026-11-05T08-51-24.388Z-33560-lock-result.json` |
| check | failed；metadata、源码政策、九个 FFI 白名单与 fmt 通过，clippy 返回 101 | `2026-11-05T08-53-44.396Z-28712-check-result.json` |
| archive | passed；由检查器逐字节归档先前日志/回执/源码快照并生成索引 | archive 自身回执仍在本树 `.local/checks/WATER-W10-M4/2026-11-05T08-56-07.161Z-28076-archive-result.json` |

`check` 的失败是草稿自身问题，不是环境失败或有效负控：`src/native_windows.rs:3` 的原外层导入在新增的内层导入之后成为 `unused imports`，`-D warnings` 将其作为错误。日志为 `2026-11-05T08-53-44.396Z-28712-check-6.log`。发现契约阻塞后没有继续修草稿或重跑检查。

另有一次直接调用 `cargo fmt` 因 PowerShell PATH 没有 cargo 而失败，未启动 Cargo；随后通过检查器已确定的 Rust 1.95 工具链绝对路径运行 `cargo.exe fmt --manifest-path packages/junk-clean/Cargo.toml` 成功。该命令只格式化草稿；以上 `check` 又通过了 `cargo fmt --check`。所有已运行 Cargo 构建由检查器配置离线、jobs=1、私有 Cargo home、target 与临时目录，没有下载。

## 证据与限制

- 归档索引：[ARCHIVE.json](../../acceptance/wave10/m4/ARCHIVE.json)；检查失败与草稿快照均如实保留，不删除失败记录。
- 草稿 `productionHash`：`040664718d3e372c4bc9809897447081c0308b16c86cc0d4b5caf6352f61ab32`；原测试 `testHash`：`18ead09b2fbbed1c26095cf8d839681e1492182fa94ef2e83e39efaeb509df64`。它们描述失败检查时的输入，**不是交回产品实现的哈希**。
- 改过的旧断言：无；没有原值/新值变更。
- 负控：未运行，无有效失败标记或恢复绿测可报；不得把 clippy 失败当成负控。
- 真实冒烟：未运行；没有检查任何真实隔离区，没有移动、复原或删除真实文件，也没有读取真实文件内容。
- 测试夹具：未建立、未清理；只有检查器在本树 `.local` 下产生依赖副本、构建、日志与快照。未使用 `%TEMP%` 跨盘夹具例外。
- 原生窗口、选择框、浏览器：均为 0。
- 使用了一个只读辅助审阅代理，未获实现/测试/提交权限；它只检查 M4 契约与源代码，没有修改文件或运行测试。正式实现工作未委派给内部代理。
- 停止时没有本任务在运行的检查、测试或后台进程。Windows 产品行为、生产竞态、macOS、真实应用清理流程及 M4→M7/M5 接线均未验证。

等待总控补充上述固定盘发现契约后，才能继续 M4；本次不授权继续 M5。
