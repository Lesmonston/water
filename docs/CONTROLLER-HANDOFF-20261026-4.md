# Water 总控交接报告（2026-10-26 第 4 份）

项目根 `F:/new/smaltalk/water`。总控 Claude。因用户要压缩上下文而写；本报告取代 [第 3 份](CONTROLLER-HANDOFF-20261026-3.md) 作为当前入口。第 3 份的第三波设计背景、第 2 份的方向调整与第二波背景仍然有效，按需查阅。

## 0. 一句话现状

- **第三波 F1 服务核心、F2 桌面宿主都已 VERIFIED 并合入主线**。两票各发过一张补单，都经两轮验收。
- **F3 接线与整机体检已设计、自测并派出**：交给 sol，在新对话执行（用户 20:47 JST 告知“已经贴出”）。记录时执行者树停在基点、干净，还没有开工痕迹。
- 下一步：等 F3 回执，按第 5 节验收；通过后就是 **M1 体检 Alpha**。

## 1. 仓库与远端（同第 3 份）

| 远端 | 地址 | 说明 |
|---|---|---|
| `origin` | `https://github.com/dfan0519-tech/water` | GitHub **私有**仓库，必须保持私有、不加协作者 |
| `central` | `F:/git-central/water.git` | 本机中央裸仓库 |
| 异盘镜像 | `E:/git-central-mirror/water.git` | `git clone --mirror` |

- **推送规矩**：每次台账或合入提交后，依次执行：
  1. `git push origin --all`
  2. `git push origin --tags`
  3. `git push central --all`
  4. `git push central --tags`
  5. `git -C E:/git-central-mirror/water.git remote update --prune`
- **不要运行** `F:/git-central/mirror-to-e.ps1`（会顺带推别的项目）。`F:/git-central` 里其它仓库与 README 不动。
- 提交沿用上一个提交的作者：`-c user.name="Riku Toto" -c user.email=usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai`。

## 2. 本份覆盖的关键提交

| 提交 | 内容 |
|---|---|
| `e84b620` | F2 受阻（选择框参数类型拿不到，总控契约漏洞）→ 补单 01 |
| `04a9a0e` | F2 补单派给 Astra |
| `90b397b` | 第三波第 1 轮验收：F2 VERIFIED；F1 发补单 01 |
| `7633c4e` | F2 合入主线 |
| `9e2817b` | F1 补单派给 grokbot |
| `7d8715d`、`60b52fd` | F1 复验通过、合入主线、台账 |
| `d56ebc6` | **F3 基点**，标签 `water-w3-f3-base-20261026`：WIRING 契约、检查入口扩展、整机观察器、规则第 6 节、计划 F3 一节 |
| `5ef92f6` | F3 READY：manifest、工单、派前回执、自测证据 |
| 本报告的提交 | 记录 F3 派给 sol、审计脚本支持整机检查、本交接 |

## 3. 今晚做完的事

1. **F2 受阻与补单 01**：
   - 原因：`select_scope` 要的 `Registry` 与 `OpaqueId` 两个类型 picker 没有转出，而 HOST 只许依赖 picker。属实，是总控契约漏洞，当时的桩宿主没真正调用它。
   - 补单：加两个参数依赖；`pick_folder(initial_directory)`；六种错误逐个映射。补单派出前在自测树里走通过。
2. **第三波验收**（[报告](acceptance/wave3/controller/WATER-W3-F1F2-REVIEW-20261026.md)，含第 1、2 轮）：
   - 新写 `scripts/acceptance/w3-receipt-audit.mjs`，两票审计都是 0 问题。
   - 新私有验收树重跑；总控用自己的负控，位置都与执行者不同。
   - 每票一个只读审查代理，高危结论都回到代码复核。
   - **F2**：一次通过，合入。6 条事项移交 F3，最要紧的是 Tauri `setup` 出错会 panic。
   - **F1**：
     - 第 1 轮查出 4 处问题，都会被 M1 用户碰到或违反 SERVICE：
       1. 一个自定义位置失效，整份设置就被重置；
       2. 记录清理会删掉读不进来的文件，删不掉时服务每次都起不来；
       3. 重启后占用提示拼错；
       4. 开关关闭时参数校验在前。
     - 另有一处测试缺口：去掉 eligible 筛选，五个测试仍全过。
     - 补单 01 交 grokbot，第 2 轮复验通过并合入。
     - 总控写了合成用例 [w3-f1-controller-cases.rs](../scripts/acceptance/w3-f1-controller-cases.rs)，含两个测试：
       - 清理打开时的全流程：只删计划内条目，释放字节数精确相等；
       - 重启容错：占用提示保存与复用、坏设置与坏记录的容错、开关先判断。
     - 真实冒烟按 `C:\Windows\Temp` 同口径与 `w2-b-crosscheck.ps1` 实测相差不到 0.1%。
3. **F3 设计与自测**（[派前回执](dispatch/wave3/READY-REPORT-F3-20261026.md)），见第 4 节。

## 4. F3（已派出，sol）

| 项 | 值 |
|---|---|
| SPEC | [contracts/desktop-v1/WIRING.md](../contracts/desktop-v1/WIRING.md)（冻结在本票 `frozenFiles`） |
| 工单 | [WATER-W3-F3-WIRING-20261026.md](dispatch/tickets/WATER-W3-F3-WIRING-20261026.md) |
| 工作树 / 分支 | `.worktrees/w3-f3` / `worker/water-w3-f3`，基点 `d56ebc6` |
| 门 | 轻：nc1 `HOST_CLEAN_DISABLED`、nc2 `HOST_SINGLE_INSTANCE`、nc3 `HOST_COMMANDS`；`native --final` 整票 1 次（含一次真实只读整机扫描） |
| 测试 | `host_v1.rs` 精确 5 个，新增 `host_service_wiring` |

**设计要点**：
- 宿主用 `ServiceBackend` 包服务核心，用 `HostPicker`（带防重入）包 `pick_folder`，`CLEAN_ENABLED = false`。
- **不再用 Tauri `setup`**，因为它出错会 panic（`tauri/src/app.rs:1444`）。新顺序：
  1. `Builder::build`；
  2. 准备数据目录；
  3. 单实例锁：`water.lock`，标准库 `share_mode(0)`；
  4. `make_backend` 构造服务；
  5. `app.manage`；
  6. 建窗口；
  7. `app.run`。

  失败时打印“Water 暂时无法启动。”或“Water 已经在运行。”并以 1 退出。
- 新依赖：`water-service`，以及只为测试平台写类型用的 `water-junk-rules`、`water-process-scan`，都是路径包。锁里 registry 包仍是 AC 的 395 个。

**检查入口的扩展**（`scripts/desktop-wave-check.mjs`）：
- 清掉 `TAURI_*` 变量。
- `outputRootExists`：基线要求宿主存在。
- `forbidSetup`：源码里出现 `.setup(` 即拒绝。
- 原生模式参数化；带 `nativeSteps` 的任务走整机观察器 [w3-wired-native-observe.ps1](../scripts/acceptance/w3-wired-native-observe.ps1)：
  - 纯 ASCII，步骤文字放在 manifest 里，用 UI 自动化的 Invoke，不合成鼠标或键盘；
  - 步骤：首页 → 开始体检 → 结果页 → 清理所选得到 M1 提示 → 增长趋势 → 清理记录 → 扫描位置，共 6 张图；
  - 关窗后核对数据目录：扫描与快照各 1 个，计划、清理记录、日志都为空。

**自测**：自测树 `.worktrees/w3-selftest-f3` 里放了桩接线，只在自测树里。
- baseline、lock、check、test、三条负控、`.setup(` 被拒、两个 final 都通过。
- 整机检查一次通过：11 步，真实扫描 69.5 秒，识别 43.0 GB，可放心清理 8.6 GB，6 张图逐张看过。

**M1 已知限制**（WIRING 第 7 节，本票不做）：
- release 构建启动失败时用户看不到提示；
- 第二个实例不激活第一个窗口；
- 默认数据目录不能在联接后面；
- 占用提示显示进程名（`chrome`、`msedge`）；
- WebView2 环境变量覆盖宿主控制不了；
- 选择框没有父窗口。

## 5. F3 收单验收怎么做

1. **收单审计**：`node scripts/acceptance/w3-receipt-audit.mjs WATER-W3-F3`。
   - 本份已让审计认得整机检查：多张截图的哈希、步骤全过、真实读取已记录、数据目录计数。
   - 可用 `WATER_W3_AUDIT_MANIFEST` 指向别的清单；已在 F3 自测回执上试过。
   - 现在对 F2 跑会报“规则文件冻结哈希变了”。那是因为规则加了 F3 一节，F2 早已验收，忽略即可。
2. **新私有验收树**：`.local/w3-accept2/` 的整套脚本可以直接复用。
   - 运行 `node .local/w3-accept2/make-manifest.mjs '{"f3":"<交回 HEAD>"}'`，会生成 `WATER-W3-ACCEPT-F3`，树为 `.worktrees/accept2-w3-f3`，证据目录为 `docs/acceptance/wave3/controller/accept2-20261026/f3/`。也可以照它另起一套 `accept3`。
   - 建树：`git worktree add -b controller/accept2-w3-f3 .worktrees/accept2-w3-f3 <HEAD>`。
   - 跑 `bash .local/w3-accept2/run.sh f3 check:final test`。
3. **总控负控**：在 `.local/w3-accept2/mutations.json` 加 `f3` 一组，位置要与执行者不同，然后运行 `node .local/w3-accept2/controls.mjs f3`（最后自动跑 `test --final`）。可选的方向：
   - `service_config` 里 `clean_enabled` 直接写 true，而不是改常量；
   - 共享冲突（错误码 32）不再映射成 AlreadyRunning；
   - 从 handler 列表去掉另一个命令；
   - 额外负控：去掉 `HostPicker` 的防重入；`ServiceBackend` 改写 message_zh。
4. **整机检查**：`bash .local/w3-accept2/run.sh f3 native:final`。验收树单独 1 个窗口，又一次真实只读扫描，约 1～2 分钟。**开跑前先告诉用户会弹窗**。逐张看 6 张图。
5. **代码审查**：开一个只读审查代理，只给代码与 WIRING、HOST、SERVICE，不给结论。重点：
   - 启动路径上不能有 panic，比如 `unwrap`、`expect`、索引；
   - 单实例锁一直持有到 `run` 返回；
   - `HostPicker` 守卫在出错时也会释放；
   - `ServiceBackend` 原样透传；
   - 窗口设置与 F2 完全一致；
   - 测试不读真实位置、不弹框。
6. **专项**：
   - 锁与 AC 锁一致；
   - `tauri.conf.json`、`capabilities` 与图标不变；
   - 源码里没有 `.setup(`；
   - `main.rs` 的退出码与固定文案。
7. **收尾**：`--no-ff` 合入主线，推送，然后宣布 M1。M1 之前可以问用户要不要亲手试用：用户自己启动 debug 版 `water.exe`，数据写到 `%LOCALAPPDATA%\Water`，这是用户本人的操作，可以试“添加文件夹”的真实选择框。

## 6. 之后

- **M1 体检 Alpha**：F3 验收通过即可宣布。
- **界面打磨票**（M1 之后，可选）：
  - 占用提示用产品名（Chrome、Edge）；
  - “这一版只做体检…”提示切换页面后仍留着；
  - 结果页底部操作坞会盖住列表最后一行。
- **D 加固**（M2 前提）：
  - 按句柄相对删除；
  - 不删云文件占位符等非链接型重解析点；
  - 拒绝 8.3 短名或执行期用 FileId 比对；
  - 用户用联接搬过配置目录时的处理。
- **服务的 M2 前事项**（F1 审查记录，见验收报告）：
  - 任务线程 panic 后 busy 卡住或锁中毒；
  - 计划文件以 data_dir 为信任边界；
  - 旧扫描“已消耗”标记异步写；
  - 残留 `.tmp` 文件，plans 与 journal 没有上限；
  - 路径只按文本比较；
  - **部分完成（partial）的扫描能否作为清理来源**：预算耗尽时没扫到的受保护位置不会进 protected_paths。
- **M2**：打开 `clean_enabled`，做自清理里程碑。用户在 Water 里清掉 Water 自己的开发垃圾，清理按钮由用户本人按。
- **日常使用的 release 构建**：目前只有检查器构建的 debug 版，M1 之后再定。

## 7. 硬规矩（用户已定，不要再劝）

- ADR-018 的五项决定。
- 开发期只读本机，命令行不得进入任何输出或证据；真实删除只经 Water 应用，**由用户本人按清理按钮**；总控与执行者都不代删真实文件。
- 浏览器只清缓存，Cookies、登录数据、本地存储、IndexedDB 受保护。
- 总控负责整体 UI 设计：白色磨砂、纯色强调、无渐变光晕、无 emoji；改设计先给用户看真实截图。
- 派单句每张票单独一个代码块；界面票或需要特定能力的票单独列出、提示选模型。**补单与派单句都要能在新对话里直接执行**，用户会归档旧对话。
- 实现由用户外贴给执行者；总控不写产品代码，不自动启动实现者。自测用的桩只在自测树里。
- Water 的 AGENTS.md 规定不自动修改共享 Vault。
- Git：
  - 只按显式路径暂存，提交前看 `git diff --cached --name-status`；
  - 不用 `git add -A`、裸 `git stash`、clean、reset --hard；
  - 提交信息写进文件再用 `-F`；
  - 证据里的 `.log` 要 `git add -f`。
- GitHub 仓库保持私有。
- **会弹出真实窗口的检查（`native`）开跑前先告诉用户。**

## 8. 今天新踩的坑

- **自测桩必须真正调用契约要求的每个接口**。F2 受阻就是因为桩宿主只写了 `pub use`。
- **负控脚本遇到存活变异时要先恢复再退出**（`controls.mjs` 已修）。第一次漏了，验收树里留下过变异文件，已手动恢复。
- **一行负控必须能编译**。改函数参数名会连带函数体，所以 F3 的 nc3 改成了“从 handler 列表去掉一行”。
- **Tauri 2.12.5 的 `setup` 出错会 panic**，`Builder::run` 拿不到。
- **Tauri 同步命令跑在主线程**，选择框也在主线程（STA，标志 6），没有父窗口。
- **F1 的 50 ms 返回预算**在磁盘繁忙时超过一次，整机验收留意。
- **证据体量**：宿主类票每次检查都有一份 1.3 MB 的 `cargo metadata` 日志，一张票的证据在 20 MB 上下。归档索引按哈希登记了它们，不要删单个文件。
- 沿用第 3 份的坑：
  - Bash heredoc 会吃反斜杠，含反斜杠的文件用 Write 工具写；
  - 不能用 `-ExecutionPolicy Bypass`，本地脚本直接 `-File` 或交给 PowerShell 工具；
  - Tauri 离线构建要 `--filter-platform`，镜像参数放在 `clippy` 之后；
  - 隐藏的 `Tao Thread Event Target` 窗口。

## 9. 待办

1. 等 F3 回执（sol），按第 5 节验收、合入，宣布 M1。
2. 视用户意愿出界面打磨票；出 D 加固票；处理服务的 M2 前事项；然后 M2 与自清理里程碑。
3. 第一波遗留未验收项保持原状：真实用户 scope 的自然同意鉴真、生产竞态、macOS。
4. **工作树越来越多**：各波执行者树、验收树（`accept-w3-*`、`accept2-w3-f1`）、自测树（`w3-selftest-*`）。它们都是自清理里程碑的素材，现在不要删。
5. 共享 Vault 还没有 Water 项目页；按项目规则由 Keeper 从交接报告与 ADR 摄入。

## 10. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261026-4.md）：读交接报告，准备接手 Water 总控。
```
