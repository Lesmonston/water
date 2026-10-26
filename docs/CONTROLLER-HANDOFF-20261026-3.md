# Water 总控交接报告（2026-10-26 第 3 份）

项目根 `F:/new/smaltalk/water`。总控 Claude。因用户要压缩上下文而写；本报告取代 [第 2 份](CONTROLLER-HANDOFF-20261026-2.md) 作为当前入口。第 2 份的方向调整、设计与第二波设计背景仍然有效，按需查阅。

## 0. 一句话现状

- **第二波 A–E 已全部 VERIFIED 并合入主线**（两轮验收，五张补单）。
- **第三波（桌面接线）已设计并派出**：F1 服务核心与 F2 桌面宿主都交给 Astra，在新对话里执行。交接时两棵工作树都停在基点、干净，还没有执行者开工的痕迹。
- 下一步：等 F1、F2 回执，按第 5 节验收，再出 F3（接线与整机验收）。

## 1. 仓库与远端

| 远端 | 地址 | 说明 |
|---|---|---|
| `origin` | `https://github.com/dfan0519-tech/water` | 用户要求建的 GitHub **私有**仓库，必须保持私有 |
| `central` | `F:/git-central/water.git` | 本机中央裸仓库（约定见 `F:/git-central/README.md`） |
| 异盘镜像 | `E:/git-central-mirror/water.git` | `git clone --mirror` 建立 |

- **推送规矩**：每次验收合入或台账提交后，依次执行：
  1. `git push origin --all`
  2. `git push origin --tags`
  3. `git push central --all`
  4. `git push central --tags`
  5. `git -C E:/git-central-mirror/water.git remote update --prune`
- **不要运行** `F:/git-central/mirror-to-e.ps1`：它会顺带把 car-op 推到异地服务器，那是别的项目的事。`F:/git-central` 里其它仓库与 README 都不动。
- 交接时 `main` 为 `4c422345`（加上本报告的提交），四处一致。仓库历史里有本机只读摸底结果与本机路径，所以 GitHub 仓库只能私有。

## 2. 本份覆盖的关键提交

| 提交 | 内容 |
|---|---|
| `ea5bf89` | 记录第二波派单（A/B Cursor、C Grok、D/E Astra） |
| `36363e2` | E 补单 01：截图改由检查入口归档（修总控设计漏洞） |
| `64c5498` | 第二波第 1 轮验收：五票都要补单（A-01、B-01、C-01、D-01、E-02） |
| `5263cbd` | 补单改为可在新对话执行（用户会归档旧对话） |
| `fb55d51` | 记录补单派出（A–D grokbot、E Astra） |
| `b162010`、`221b309` | 接入本机中央仓库与 GitHub 私有仓库 |
| `f57ab7e`…`8b33aec` | 五个执行者分支 `--no-ff` 合入主线 |
| `43f8b1b` | 第二波第 2 轮验收：五票 VERIFIED |
| `197dfda` | **第三波基点**，标签 `water-w3-desktop-base-20261026`：SERVICE、HOST 契约、W3 执行者规则、计划、检查入口、原生窗口观察器 |
| `4c42234` | 第三波 READY：manifest、两张票、派前回执、检查入口自测与证据 |

## 3. 今天下午到晚上做完的事

1. **第二波两轮验收**（[第 1 轮](acceptance/wave2/controller/WATER-W2-AE-REVIEW-20261026.md)、[第 2 轮](acceptance/wave2/controller/WATER-W2-AE-REVIEW-2-20261026.md)）。每轮都做了：
   - 收单审计（`scripts/acceptance/w2-receipt-audit.mjs`）；
   - 新私有验收树重跑；
   - 总控自己的负控；
   - 独立代码审查（五个只读审查代理，高危结论总控回到代码复核）；
   - B 的真实体量交叉核对（`scripts/acceptance/w2-b-crosscheck.ps1`，8 组相差 ≤0.03%）；
   - D 的总控合成用例（`scripts/acceptance/w2-d-controller-cases.rs`）；
   - E 逐张看图。

   第 1 轮查出的问题与对应补单：

   | 票 | 第 1 轮问题 | 补单 |
   |---|---|---|
   | A | 保护优先判定被放宽，根源是 RULES 第 3 节写错 | A-01 改 glob 判定 + 浏览器配置目录显式列出 |
   | B | discovery 排除方向反；非 ASCII 路径崩溃 | B-01 |
   | C | 测试清理可能误杀无关进程 | C-01 |
   | D | 测试绑死树名；条目内换联接的竞态 | D-01 |
   | E | 行为与四处视觉偏差 | E-02 |

   第 2 轮五票全过，已合入主线。
2. **网站离线数据**（Service Worker 缓存）保持“需要确认、默认不选”。依据是用户定的边界“不清登录信息、避免重新登录”。用户按原文派出 E-02，即同意。
3. **Git**：接入本机中央仓库与 GitHub 私有仓库（第 1 节）。
4. **第三波设计**：[计划](dispatch/wave3/PLAN.md)、[SERVICE](../contracts/desktop-v1/SERVICE.md)、[HOST](../contracts/desktop-v1/HOST.md)、[派前回执](dispatch/wave3/READY-REPORT-20261026.md)。

## 4. 第三波（W3）

| 票 | 交付 | 工作树 / 分支 | 门 | 执行者 |
|---|---|---|---|---|
| F1 服务核心 | `packages/water-service`：把 A–D 接成 IPC 的 17 个命令；`Platform` 与 `FolderPicker` 注入；存储在 data_dir；清理带开关 | `.worktrees/w3-f1` / `worker/water-w3-f1` | 重：nc1 `SERVICE_TOKEN_ONCE`、nc2 `SERVICE_CLEAN_DISABLED`、nc3 `SERVICE_PROTECTED_PLAN`；real（清理关闭的只读整机扫描） | Astra |
| F2 桌面宿主 | `apps/water/host`（包 `water-desktop`、程序 `water`）：Tauri 2.12.5、Mica、CSP、导航守卫、17 个命令转发给 `Backend`、`WATER_DATA_DIR`、选择框接线点；本票用 `UnavailableBackend` | `.worktrees/w3-f2` / `worker/water-w3-f2` | 轻：nc1 `HOST_CONFIG`、nc2 `HOST_NAVIGATION`；`native --final` 原生窗口整票 1 次 | Astra |

- **交接后更新（18:07 JST）**：F2 交回受阻（`99766f6`），总控发了 [补单 01](dispatch/tickets/WATER-W3-F2-ADDENDUM-01-20261026.md)：
  - 宿主多两个路径依赖 `water-contracts`、`water-scope-registry`；
  - 签名改为 `pick_folder(initial_directory)`，并新增 `picker_failure`。
  - 验收 F2 时以补单为准，manifest 的依赖白名单已同步；F1 不受影响。
  - 18:10 JST 补单交 Astra（新开对话），记录时 F2 树停在 `99766f6`、干净。
- **19:20 JST 收单验收**（[报告](acceptance/wave3/controller/WATER-W3-F1F2-REVIEW-20261026.md)）：
  - F2 VERIFIED 并合入主线 `7633c4e`，6 条事项移交 F3（见报告与 manifest 的 `carryOverToF3`）。
  - F1 发 [补单 01](dispatch/tickets/WATER-W3-F1-ADDENDUM-01-20261026.md)，从 `06182d6` 续做；19:22 JST 交 grokbot（新开对话），记录时树干净。
  - 第 5 节说的 W3 收单审计已写成 `scripts/acceptance/w3-receipt-audit.mjs`，验收清单与脚本在 `.local/w3-accept/`（副本在证据目录）。
  - F1 复验时用同一套：先改 `make-manifest.mjs` 的 F1 HEAD，然后依次跑 `run.sh`、`controls.mjs f1`、`real:final`，再跑总控合成用例 `scripts/acceptance/w3-f1-controller-cases.rs`。合成用例要临时加 `[[test]]`，跑完恢复。
- 两票基点都是 `197dfda`，只通过 JSON 层对接：`Backend::call(command, args)` 对应 `Service::call(command, args)`。
- **两个产品取舍**（已写进计划与契约）：
  1. 这一版只做体检，`clean_enabled = false`；
  2. 窗口保留 Win11 系统标题栏加 Mica。设计稿要求自绘标题栏，但界面没有窗口按钮。
- **检查入口** `scripts/desktop-wave-check.mjs`：
  - 任务类型 service 与 host；
  - host 的锁先复制 AC 已验收锁（`apps/desktop-preview/Cargo.lock`），每个 registry 包都与它逐个比对；
  - 构建用 `contracts/desktop-bootstrap-mirror-v1/MIRROR.json` 的镜像参数与 AC 缓存（`.worktrees/ac/.local/desktop-cargo-home/registry`），全程离线；
  - `tauri.conf.json` 与 `capabilities/main.json` 逐字比对；
  - 原生窗口模式调用 `scripts/acceptance/w3-host-native-observe.ps1`。
- 检查入口已在两棵自测树 `.worktrees/w3-selftest-f1`、`w3-selftest-f2` 用桩 crate 走通全部路径（见派前回执），其中真实窗口开过两次（第一次因 Tao 隐藏窗口误判，已修）。自测清单在 `.local/w3-selftest/manifest.json`，覆盖变量为 `WATER_W3_OVERRIDE_MANIFEST`，只限 `WATER-W3-SELFTEST*` 与 `WATER-W3-ACCEPT-*`。

## 5. 收单验收怎么做（照第二波的流程）

1. **收单审计**：`w2-receipt-audit.mjs` 只读第二波 manifest，需要复制一份改成读 `docs/dispatch/wave3/manifest.json`。核对内容：
   - 分支、基点祖先、范围、冻结指纹；
   - final 回执源码与实现提交逐字节一致，实现提交之后只有回执与证据；
   - 负控红绿、`ARCHIVE.json` 字节与哈希；
   - F2 还要核对截图已归档。
2. **新私有验收树**：照 `.local/w2-accept2/make-manifest.mjs` 写一份 W3 版，任务 ID `WATER-W3-ACCEPT-F1/F2`，用 `WATER_W3_OVERRIDE_MANIFEST` 指过去。在新树里跑：
   - `check --final`、`test`；
   - 总控自己的负控，然后 `test --final`；
   - F1 跑 `real --final`；F2 跑 `native --final`（验收树单独有 1 次窗口预算，先告诉用户会弹窗）。
3. **代码审查**：可再开只读审查代理，只给代码与契约，不给结论；高危结论回到代码复核。F1 重点：
   - 清理开关；
   - 计划只含 eligible 且有 identity 的条目，protected_paths 完整；
   - 令牌一次有效；
   - 只写 data_dir；
   - 测试不读真实位置、不启动进程。
4. **F1 专项**：
   - 总控写自己的合成平台与夹具，在清理打开时独立跑一遍扫描、计划、清理，核对只删计划内条目；
   - 真实冒烟的分类体量与第二波 B 的真实结果同量级（参考 `docs/acceptance/wave2/controller/accept2-20261026/controller/b-crosscheck.json`）。
5. **F2 专项**：
   - 逐张看原生窗口截图，确认 Mica、界面完整、标题栏图标换成了 Water 自己的；
   - 锁与 AC 锁一致；
   - CSP 与权限逐字一致。
6. **收尾**：两票都过后 `--no-ff` 合入主线、推送，再出 F3。

## 6. 之后

- **F3 接线与整机验收**：
  - 宿主用 `water_service::Service` 实现 `Backend`，用宿主的 `pick_folder` 实现服务的 `FolderPicker`，`clean_enabled` 仍为 false；
  - 然后本机整机体检（真实只读）。窗口预算到时冻结计划再跑（参考第一波 AA→AD 联合验收）。
  - 完成即 M1 体检 Alpha。
- **D 加固**（M2 前提，第二波验收遗留）：
  - CLEAN 改为按句柄相对删除；
  - 读重解析标记，云文件占位符等非链接型重解析点不删；
  - 拒绝 8.3 短名或执行期用 FileId 比对保护路径；
  - 用户把配置目录用联接搬家时的说明。
- **M2**：D 加固验收后打开 `clean_enabled`，做**自清理里程碑**：用户在 Water 里清掉 Water 自身开发垃圾，总控准备计划并核对，清理按钮由用户本人按。
  - 素材是各工作树 `.local` 下的 Rust target、Cargo home、WebView 目录、验收树等，体量已相当大。

## 7. 硬规矩（用户已定，不要再劝）

- ADR-018 的五项决定。
- 开发期只读本机，命令行不得进入任何输出或证据；真实删除只经 Water 应用流程，**由用户本人按清理按钮**；总控与执行者都不代删真实文件。
- 浏览器只清缓存，Cookies、登录数据、本地存储、IndexedDB 受保护。
- 总控负责整体 UI 设计；界面是白色磨砂、纯色强调、无渐变光晕、无 emoji；改设计先给用户看真实截图。
- 派单句每张票单独一个代码块，界面票（或需要特定能力的票）单独列出并提示选模型。**补单与派单句都要能在新对话里直接执行**：用户会归档旧对话。
- 实现由用户外贴给执行者；总控不写产品代码，不自动启动实现者。自测用的桩 crate 只在自测树里，不是产品代码。
- Water 的 AGENTS.md 规定不自动修改共享 Vault。
- Git：
  - 沿用上一个提交的作者（`-c user.name/-c user.email`）；
  - 只按显式路径暂存，提交前看 `git diff --cached --name-status`；
  - 不用 `git add -A`、裸 `git stash`、clean、reset --hard；
  - 提交信息写文件再 `-F`；
  - 证据里的 `.log` 被忽略，要 `git add -f`。
- GitHub 仓库保持私有，不加协作者。

## 8. 今天踩到的坑

- **Bash heredoc 会吃反斜杠**，连 `'EOF'` 也出过问题。含反斜杠的脚本或文档一律用 Write 工具写文件。
- **自动模式会拒绝 `-ExecutionPolicy Bypass`**。本机当前用户策略是 RemoteSigned，本地脚本直接用 `-File` 即可；要内联执行就把脚本内容交给 PowerShell 工具。
- **Tauri 离线构建**：
  - `cargo metadata` 要加 `--filter-platform x86_64-pc-windows-msvc`，否则会去要其它平台的包；
  - 镜像参数必须放在 `clippy` 之后（外部子命令），同第一波 `scripts/ac-clippy-arguments.mjs`；
  - Tauri 在 Windows 上总有一个隐藏的 `Tao Thread Event Target` 窗口。
- **第二波 D 的测试原本绑死树名 `.worktrees\w2-d`**，所以第 1 轮验收不得不在 `.local/w2-accept/d-tree/.worktrees/w2-d` 重跑。补单后已不依赖。
- **负控变异被新防线拦住时，失败可能不带标记**（D 第 2 轮的 nc2）。这说明产品多了一层保护，要换一个能绕过所有层的变异再证明。
- **执行者遇到契约冲突可能自行变通而不交回受阻**（A 第 1 轮）。验收时要专门对照契约原文。

## 9. 待办

1. 等 F1、F2 回执（Astra），按第 5 节验收，合入主线。
2. 出 F3 并整机验收（M1）。
3. 出 D 加固票；之后 M2 打开清理与自清理里程碑。
4. 第一波遗留未验收项保持原状：真实用户 scope 的自然同意鉴真、生产竞态、macOS。
5. **工作树越来越多**：第二波 5 棵、两轮验收 11 棵、第三波 2 棵、自测 4 棵，加上第一波的。它们都是自清理里程碑的素材，现在不要删。
6. 共享 Vault 尚无 Water 项目页，按项目规则由 Keeper 从交接报告与 ADR 摄入。

## 10. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261026-3.md）：读交接报告，准备接手 Water 总控。
```
