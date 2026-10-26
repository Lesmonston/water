# Water 总控交接报告（2026-10-26 第 2 份）

项目根 `F:/new/smaltalk/water`。总控 Claude（当天上午从 Codex 接任，上一份交接见 [CONTROLLER-HANDOFF-20261026](CONTROLLER-HANDOFF-20261026.md)）。因用户要压缩上下文而写；本报告取代上一份作为当前入口。

## 0. 一句话现状

方向已按用户五项决定改为“Windows 设备垃圾体检 + 应用内选择性清理”的一体化桌面应用（[ADR-018](decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)）。第二波五张票 **A–E 全部 READY**，baseline 通过，派单句已交给用户。截至交接时还没有执行者开工的证据，新产品代码为 0。下一步是等回执、逐票验收，然后出 F（桌面接线）。

**交接后补记（14:05 JST）**：用户已把五票全部派出。A、B 由 Cursor 执行，C 由 Grok 执行，D、E 由 Astra 执行。当时 B 已提交实现 `35c94d2`，D 已开写，E 已自跑 baseline，A、C 尚无动静。详情见 manifest 的 `model`、`startedAt`、`startEvidence` 字段。

**E 受阻（14:07 JST）**：截图位置与 final 干净要求冲突，属总控设计漏洞。处理办法：检查入口改为截图写 `WATER_W2_SHOTS_DIR`（`.local/checks` 下），archive 按回执哈希复制进证据目录；manifest 给 E 加了 `requiredScreenshots` 共 12 张。已出[补单 01](dispatch/tickets/WATER-W2-E-ADDENDUM-01-20261026.md)，E 从 `e06d24a` 续做。验收 E 时看 `docs/acceptance/wave2/e/screenshots/<stamp>/`。

**第二波收单（下午）**：结论见[验收报告](acceptance/wave2/controller/WATER-W2-AE-REVIEW-20261026.md)，五票都要补单（A-01、B-01、C-01、D-01、E-02，均在 `docs/dispatch/tickets/`）。
- 总控验收树：`.worktrees/accept-w2-a..e`，以及 D 专用的 `.local/w2-accept/d-tree/.worktrees/w2-d`（D 的测试要求树路径以 `.worktreesw2-d` 结尾）。
- 验收清单在 `.local/w2-accept/manifest.json`，任务 ID 为 `WATER-W2-ACCEPT-*`；检查入口已允许这类 ID 使用覆盖清单。
- 补单交回后用同样流程复验：`scripts/acceptance/w2-receipt-audit.mjs`、`.local/w2-accept/run.sh`、`.local/w2-accept/controls.mjs`、`scripts/acceptance/w2-d-controller-cases.rs`。
- 补单已派出（16:15 JST）：后端四张交 grokbot，界面 E-02 交 Astra，都是新开对话。
- 遗留到 M2 接线前：CLEAN 改为按句柄相对删除；云文件占位符一类的重解析点不删；8.3 短名。

## 1. 仓库与关键提交

主线 `main`，没有远程仓库（立项书约定只保留本地 Git）。交接时 HEAD 为 `81abd4d5382a2cf74c304757daa505d0e874b1f5`，工作区干净；本报告随后单独提交。

| 提交 | 内容 |
|---|---|
| `4322c95` | 真实 AA→AD 联合验收（4 窗、9.993 秒、无重试） |
| `8d1375a` | 计划重订草案（已由 ADR-018 落定） |
| `7ca1528` | **第二波后端基点**，标签 `water-w2-checkup-base-20261026`：ADR-018、checkup-v1 契约、设计稿第 1 版、检查入口、执行者规则、路线图 |
| `5de459d` | A–D 票、manifest、baseline 归档、派前回执 |
| `68cbab9` | **界面基点**，标签 `water-w2-ui-base-20261026`：白色磨砂设计第 2 版、预览图、UI SPEC、回放数据、检查入口界面模式 |
| `81abd4d` | E 票、manifest 条目、派前回执更新 |

## 2. 今天做完的事

1. **接手核查**：57 个旧工作树全部干净，547 条冻结约束锁哈希与交接一致，无残留进程。
2. **真实 AA→AD 联合验收通过**：真实固定 AA 宿主 → 原生目录选择 → R/Z → AB → AD 同源报告页，四场景通过，报告页鼠标下载的 Q/Z 原字节一致，淘汰与正常关闭通过。见 [验收报告](acceptance/wave1/controller/WATER-W1-AAAD-JOINT-REVIEW-20261026.md)。第一波 31 票状态不变。
3. **方向调整**：消化共享库 Skill `agent-era-disk-junk-cleanup` 与本机三次 C 盘告急记录，写出重订草案；用户当天给出五项决定，原话记在 ADR-018。
4. **本机只读摸底**（已获授权）：结果与两个坑见 [摸底汇总](acceptance/wave2/controller/survey-20261026/SUMMARY.md)。
5. **整体 UI 设计**：用户两次审稿后定为白色磨砂玻璃第 2 版。设计说明、tokens、静态稿、八张原尺寸预览图在 `docs/design/water-ui-v1/`，预览图用 `scripts/design/render-mockup-previews.mjs` 生成。
6. **第二波契约、检查入口与五张票**：见第 3 节。

## 3. 第二波（W2）

计划 [PLAN](dispatch/wave2/PLAN.md)，登记 [manifest](dispatch/wave2/manifest.json)，派前回执 [READY-REPORT](dispatch/wave2/READY-REPORT-20261026.md)。契约在 `contracts/checkup-v1/`：MODEL（五票共用 JSON 形状）、RULES、SCAN、PROCESS、CLEAN、IPC、UI、real-plan-template.json、ui-fixtures.json。

| 票 | 交付目录 | 工作树 / 分支 | 门 | 负控标记 | 真实只读 | 执行者 |
|---|---|---|---|---|---|---|
| A 规则登记表 | `packages/junk-rules` | `.worktrees/w2-a` / `worker/water-w2-a` | 轻 | RULES_PRECEDENCE | 规则路径存在性 | Cursor |
| B 扫描引擎 | `packages/junk-scan` | `.worktrees/w2-b` | 轻 | SCAN_NO_FOLLOW | 本机组级扫描 | Cursor |
| C 进程与在用 | `packages/process-scan` | `.worktrees/w2-c` | 轻 | PROC_PATH_BOUNDARY | 进程计数 | Grok |
| D 清理执行器 | `packages/junk-clean` | `.worktrees/w2-d` | **重** | CLEAN_IDENTITY、CLEAN_NO_FOLLOW、CLEAN_ROOT_BOUND | 无 | Astra |
| E 桌面界面（界面票） | `apps/water/ui` | `.worktrees/w2-e` | 轻 + 看图 | UI_LEVEL_GUARD | 无，1 个私有 Chrome | Astra |

- A–D 基点 `7ca1528`，E 基点 `68cbab9`。交接时五个工作树都停在各自基点、干净，只有 baseline 回执。
- 五票目录互不相交，只通过 MODEL 的 JSON 交接，可以同时由五个执行者做。用户已拿到派单句；是否已全部转贴未确认。
- 检查入口 `scripts/checkup-wave-check.mjs`（从各工作树根目录运行）：模式有 baseline、lock、check、test、browser、real、red-ncN、archive，final 会核对负控记录。manifest 的 `frozenFiles` 对全部票生效；E 另有任务级 `frozenFiles`（设计稿、UI SPEC、IPC、回放数据）。
- 检查入口自测树 `.worktrees/w2-selftest`（Rust 路径）与 `.worktrees/w2-selftest-ui`（界面路径）保留，自测清单在 `.local/w2-selftest/manifest.json`。自测清单只能用于 `WATER-W2-SELFTEST*` 任务，正式票不能借用。

## 4. 收单验收要点

按 PLAN“总控验收计划”执行，回执第一行格式固定为“<票号> 任务已完成，任务报告在 <路径>”。

1. 核对分支、基点祖先、提交范围（检查入口 audit 会拒绝越界）、负控记录、回执与证据原字节（各票 `docs/acceptance/wave2/<槽位>/ARCHIVE.json`）。
2. 新私有树离线重跑 check/test（E 还有 browser），总控自己按 SPEC 另做一条负控。
3. **真实交叉核对**：B 的组级体量对照摸底汇总；A 的路径存在性对照摸底；C 的进程数量级合理。
4. **D 重门**：总控在自己的合成夹具上独立做联接、占用、身份变化、根目录包含用例；任何真实用户位置都不得进入测试。
5. **E 看图**：逐张看执行者截图，与 `previews/` 对照；不符合白色磨砂第 2 版（渐变、光晕、emoji、英文眉题、换风格）就发补单。
6. 全部通过后再集成主线，然后出 F。

## 5. 下一步 F：桌面接线（尚未设计成票）

依赖 A–E 全部验收。要点：

- 新建 `apps/water` Tauri 宿主（沿用 AC 已验收的 Tauri 2.12.5 依赖与离线镜像缓存、导航校验、私有 WebView 目录、拒绝新窗口/下载/权限），开启 JavaScript 与 `withGlobalTauri`，CSP `script-src 'self'`，前端为 E 的 `apps/water/ui`。
- 窗口开启 Windows 11 Mica，透明窗口，退化时界面不变。
- 实现 IPC.md 全部命令：用 B 的 `known_folders()` 与 A 的 `resolve_plan` 生成计划，B 扫描，C 做在用判断，`clean_prepare` 生成绑定计划摘要的一次性确认令牌，D 执行；快照、日志与历史存在 `%LOCALAPPDATA%\Water`。
- 自定义文件夹用第一波已验收的原生选择器 S（`packages/native-picker`）由宿主打开。
- 整机验收需要原生窗口预算，先冻结计划再跑（参考 AA→AD 联合验收的做法）。

之后是 M2 的**自清理里程碑**：用户在 Water 里清掉 Water 自身开发垃圾（各工作树 `.local` 下带 CACHEDIR.TAG 的 Rust target、测试浏览器 profile 等，`.worktrees` 在新建第二波工作树之前已约 22 GB），总控准备计划并核对结果，清理按钮由用户本人按。

## 6. 硬规矩（用户已定，不要再劝）

- 产品方向、真实数据授权、应用内清理、扩展扫描范围、自清理里程碑：见 ADR-018 原话。
- 开发期只读本机：规则位置的名字、大小、时间、属性，以及进程列表；不读内容；**命令行不得进入任何输出或证据**。
- 真实删除只经 Water 应用自身流程，**由用户本人按下清理按钮**；总控与执行者都不代删真实文件。执行者删除测试只针对本树 `.local` 下本次新建的合成目录，结束只删自己建的那一个。
- 浏览器只清缓存，Cookies、登录数据、网站存储一律受保护。
- 总控负责整体 UI 设计；界面必须是白色磨砂、纯色强调、无渐变光晕、无 emoji。改设计先给用户看真实截图。
- 派单句**每张票单独一个代码块**，界面票单独列出并提示用户选视觉能力强的模型。
- 实现由用户外贴给执行者；总控不写产品代码，不自动启动实现者。
- Water 的 AGENTS.md 规定不自动修改共享 Vault；总结留在项目里，由 Keeper 摄入。
- Git：仓库没配提交身份，沿用上一个提交的作者（`-c user.name/-c user.email`）；只按显式路径暂存，提交前看 `git diff --cached --name-status`；不用 `git add -A`、裸 `git stash`、clean、reset --hard；提交信息写文件再 `-F`。

## 7. 今天踩到的坑

- **Bash heredoc 会吃反斜杠**（Python/JS 里的 `'\\'` 被改坏）。含反斜杠的脚本一律用 Write 写文件再执行。
- **我误删过一次**：自测时 `rm -r contracts` 删掉了自测树里整个已跟踪的 `contracts/`，当场 `git checkout` 原样恢复，主检出与正式工作树无影响。删除只写精确路径。
- 本会话环境的 `TEMP` 被改写到会话临时目录，所以契约规定用户临时目录取 `%LOCALAPPDATA%\Temp`，不读 `TEMP`/`TMP`。
- `%LOCALAPPDATA%\Application Data` 是指回自身的联接，只在终点判断联接会重复计数。
- 预览窗格会把宽页面按比例缩小，看质感要用私有 Chrome 按原尺寸截图（`scripts/design/render-mockup-previews.mjs`）。
- `.md/.json/.mjs` 按 LF 存，`.html/.css` 走 text=auto，检出可能是 CRLF。E 票要求 `styles/tokens.css` 与同一工作树里的设计 tokens 逐字节相同，两者检出规则一致，不受影响。

## 8. 待办（不急的也列）

1. 等 A–E 回执，逐票验收（第 4 节）。
2. 验收后设计并出 F 票（第 5 节），再做整机验收。
3. M2：D 接入、应用内清理闭环、自清理里程碑。
4. 第一波遗留未验收项保持原状：真实用户 scope 的自然同意鉴真、生产竞态、macOS（AE 只有研究）。
5. 自测树 `w2-selftest`、`w2-selftest-ui` 与全部工作树（git 登记含主检出共 65 个）都保留，将来作为自清理里程碑的真实素材。
6. 共享 Vault 尚无 Water 项目页，按项目规则由 Keeper 从本报告与 ADR-018 摄入。

## 9. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261026-2.md）：读交接报告，准备接手 Water 总控。
```
