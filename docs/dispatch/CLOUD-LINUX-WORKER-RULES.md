# 云端 Linux 执行者规则（2026-10-29，草案，已暂缓）

> **暂缓**：用户 10-29 看完草案后说“那暂时不考虑先”。本文件只留作参考，不生效。AGENTS.md 里的推送例外已经撤回，所有执行者仍然不得推送。重新启用时，先更新第 1 节的判断，再把例外写回 AGENTS.md。

用户 10-29 说明：以后可能有一台云端电脑，系统是 **Linux**，“他可以连接我的远端仓库”。

本文件是派到这台机器的单子的共同规则，单子正文只写本单的范围和检查。它与各波的执行者规则（如 `W7-M3-FIX-WORKER-RULES.md`）并列，冲突时以本文件为准。本机执行者的规则不变。

## 1. 什么单子能派到云端

**判断标准**：本库和它依赖的库都能在 Linux 上编译，测试只用合成数据，检查不需要真窗口、原生对话框或本机真实数据。

下表是 10-29 静态核查的初步结论，**要等第 8 节的探针在云端实际跑过才算数**：

| 类别 | 库或内容 | 初步判断 |
|---|---|---|
| 本库和依赖都没有 Windows 专属代码 | `crates/water-contracts`；`packages/` 下的 `report-view`、`summary-export`、`redacted-report`、`scan-report`、`size-ledger`、`project-evidence`、`node-manifest`、`junk-rules` | 候选。`junk-rules` 的测试里有 Windows 路径字面量，要实测 |
| 有 Windows 代码，但写了非 Windows 分支 | `junk-clean`、`fixture-scan`、`native-root` | 可能能编译，测试未必过，要实测 |
| 依赖原生对话框、进程、扫描宿主或桌面 | `native-picker`、`native-scan`、`native-session`、`scan-host`、`project-session`、`root-marker`、`scope-registry`、`process-scan`、`junk-scan`、`water-service`、`lab-session`、`apps/water`、`apps/desktop-preview`、`tools/*` | 不派 |
| 非 Rust | 文档、规则数据、界面里不碰 WebView 和原生接口的纯逻辑 | 视单子而定 |

**一律留在本机**：
- 按 ADR-018 用本机真实数据做的只读测试；
- 真窗口、原生对话框的检查；
- 清理执行器的重门复核；
- 总控验收。

## 2. 开工

- 从 `origin`（GitHub 私有仓库）克隆。可以只检出代码部分、不检出 `docs/acceptance`，以加快速度，但单子点名的证据目录除外。
- 从单子写明的**基线提交哈希**新建分支 `cloud/<单号>`，例如 `cloud/WATER-C1-K1`。
- 单子里的路径一律是仓库内相对路径，不出现 `F:\`、`E:\` 这类本机路径。
- 工具链按仓库根目录的 `rust-toolchain.toml`：Rust 1.95.0，含 rustfmt 和 clippy，由 rustup 自动安装。

## 3. 依赖与联网

- 云端可以联网下载，**但只限两样**：Rust 工具链，以及按锁文件下载的依赖。每个库目录里都有自己的 `Cargo.lock`（仓库共 27 份），一律用 `--locked`。锁文件记着每个依赖的版本和校验和，下下来的和本机离线依赖源 `.offline-cache` 完全一致。
- **不准**改 `Cargo.lock`、加依赖、升版本，除非单子明确要求。
- 不准从网上拿代码、规则或文案来用，许可证规则同 AGENTS.md。

## 4. 写代码与数据

- 只在单子分配的文件范围内改动。
- 测试只用合成数据，夹具放在仓库约定的位置，不在仓库外留下需要总控拿回来的东西。
- 云端没有本机真实数据，也不准去造“像真实用户目录”的东西。

## 5. 检查

- 单子会写明本单在 Linux 上要跑的检查，通常是该库的 `cargo fmt --check`、`cargo clippy --locked -- -D warnings`、`cargo test --locked`，以及单子点名的负控。
- `scripts/` 下的检查门脚本里，有 105/222 个调用了 PowerShell、`.exe` 或本机盘符，**云端不跑这些**，除非单子点名并说明了 Linux 跑法。
- 负控的要求和本机相同：改坏一处，测试要红；改回来，测试要绿。逐条记录。

## 6. 收尾与交付

- **提交身份**：只在提交命令的进程里设 `GIT_AUTHOR_NAME`、`GIT_AUTHOR_EMAIL`、`GIT_COMMITTER_NAME`、`GIT_COMMITTER_EMAIL`，用执行者自己的名字，不改 git 配置。
- **回执**：写在 `docs/dispatch/reports/<单号>-REPORT.md`，和代码一起提交。内容包括：
  - 分支名、基线、头提交；
  - `uname -a`、`rustc -V`、`cargo -V` 的输出；
  - 每条检查的命令、退出码、测试数；
  - 负控红绿记录；
  - 改动文件清单。
- **推送（云端唯一例外）**：只准 `git push origin cloud/<单号>`。
  - 不准推 `main`、不准强推、不准推标签、不准删除远端分支、不准改远端或仓库设置；
  - 不准 merge、rebase、amend 或 reset 已经推出去的提交；要补改，就在同一分支上追加新提交。
- **凭据**：云端用的 GitHub 令牌只开这一个仓库的读写权限。令牌不得写进仓库、回执、日志或远端地址。
- 云端的工作树和编译产物留在云端，由用户自行清理，不传回本机。

## 7. 总控收单

1. `git fetch origin cloud/<单号>`，核对远端 `main` 没有被动过：`git ls-remote origin refs/heads/main` 应等于本机 `main`。
   - 本机**不建**名为 `cloud/…` 的本地分支，只用远端跟踪引用。这样例行的 `git push origin --all` 永远碰不到云端分支。
   - 用 `cloud/` 前缀，是为了和本机执行者的 `worker/…` 分支分开：那些分支由总控例行推送备份，本机现有 58 个。
2. 核对分支的基线等于单子的基线，`git diff --stat 基线..头` 不超出单子范围。
3. 在本机从这个头提交新建验收工作树，用离线依赖源重跑完整检查门。这些库在 Windows 上同样要通过，云端的回执只作参考。
4. 验收通过后，在本机合入 `main`，按原来的五步推送。
5. 合入后可以删掉远端分支 `cloud/<单号>`。这一步单独执行，不和推送串在一起。

## 8. 第一张建议单：Linux 可行性探针（未派）

- **目的**：把第 1 节的“初步判断”变成实测结果。
- **内容**：
  - 不改任何代码。
  - 对仓库里每个库目录逐个跑 `cargo fmt --check`、`cargo clippy --locked --all-targets -- -D warnings`、`cargo test --locked`，记下每个库的结果：通过、编译失败、测试失败，以及失败的那几行。
  - 只交回执，放在 `docs/dispatch/reports/WATER-CLOUD-P0-REPORT.md`，推到 `cloud/WATER-CLOUD-P0`。
- **用处**：
  - 按结果定稿第 1 节的表；
  - 第一次走通“云端推分支 → 总控拉回验收”的完整流程；
  - 顺带验证令牌权限和推送限制是否按预期。
