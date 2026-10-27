# Water 总控交接报告（2026-10-26 第 5 份）

> **已被取代**：当前入口是 [第 6 份交接报告](CONTROLLER-HANDOFF-20261027-6.md)。本份第 5 节验收步骤、第 7 节硬规矩、第 8 节的坑仍然有效。

项目根 `F:/new/smaltalk/water`。总控 Claude。因用户要压缩上下文而写；本报告取代 [第 4 份](CONTROLLER-HANDOFF-20261026-4.md) 作为当前入口。第 4 份的 F3 验收步骤已用完，其中的仓库规矩、硬规矩和第三波背景仍然有效。

## 0. 一句话现状

- **M1 体检 Alpha 已达成（22:25 JST）**：
  - F3 已 VERIFIED，合入 `206a2cf`，台账 `c986dec`。
  - 桌面应用经界面完成本机整机只读体检，清理保持关闭。
- **第四波三张 M2 前加固票已派出（22:25 JST，台账 `81b5daa`）**：
  - G1 D 加固、G2 服务加固交 grokbot；
  - G3 界面修补交 Astra；
  - 都在新对话里执行。
- **写本报告时（14:14Z）的进度**：
  - G2、G3 的执行者已在各自树里写好“任务已完成”回执，**用户还没转告**；
  - G1 刚开工，跑过 baseline 与 lock。
- **下一步**：用户转告回执后，按第 5 节逐张验收；三张都合入后做一次主线整合检查，然后出宿主收尾票，再到 M2。

## 1. 仓库与远端（同第 4 份）

| 远端 | 地址 | 说明 |
|---|---|---|
| `origin` | `https://github.com/dfan0519-tech/water` | GitHub **私有**仓库，必须保持私有、不加协作者 |
| `central` | `F:/git-central/water.git` | 本机中央裸仓库 |
| 异盘镜像 | `E:/git-central-mirror/water.git` | `git clone --mirror` |

**推送规矩**：每次台账或合入提交后，依次执行：
1. `git push origin --all`
2. `git push origin --tags`
3. `git push central --all`
4. `git push central --tags`
5. `git -C E:/git-central-mirror/water.git remote update --prune`

五步各自执行，不要用 `&&` 串起来，免得一步失败后面都没跑。

**补记（10-27）**：
- `--all` 会把在途的执行者分支也推上去备份。
- 若某个执行者改写了已推送的提交，那个分支会被拒（10-27 的 `worker/water-w4-g1` 就是这样）。处理办法：只对那一个分支用 `--force-with-lease=<分支>:<远端旧值>` 更新，其余照常。
- 自 10-27 起每张票都写明执行者不 push、不改写已有提交（见 CONTROLLER-WORKFLOW 第 5 节）。

其它约定：
- 不要运行 `F:/git-central/mirror-to-e.ps1`；
- 提交作者用 `-c user.name="Riku Toto" -c user.email=usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai`；
- 提交信息写进文件再用 `-F`。

写本报告时三处都在本报告的提交上。

## 2. 本份覆盖的提交

| 提交 | 内容 |
|---|---|
| `dda1ca5` | 第四波第一次基点：三份契约、规则、计划、两个检查入口的扩展 |
| `9f9aab05` | 修观察器：截图前恢复被最小化的窗口；观察器、检查入口、收单审计都核对截图像素尺寸 |
| `0ca42f8` | **第四波基点**，标签 `water-w4-hardening-base-20261026`（推送前从 `dda1ca5` 移过来）：按自测结果改了四处契约 |
| `206a2cf` | F3 以 `--no-ff` 合入主线 |
| `c986dec` | F3 验收台账与证据 |
| `d17ba49` | 第四波 READY：清单、三张工单、派前回执、派前证据；STATUS 与 ROADMAP 记 M1 |
| `81b5daa` | 记录第四波派出 |
| 本报告的提交 | 本交接 |

## 3. 这一段做完的事

### 3.1 并行评估与第四波设计

用户要求不要每次只派一单。三张票与 F3 并行，各改一个目录：
- G1 改 `packages/junk-clean`；
- G2 改 `packages/water-service`；
- G3 改 `apps/water/ui`；
- F3 改的是 `apps/water/host`。

为了不打扰正在跑的 F3：
- **第三波冻结的文件一个字没改**，修改都写成 `contracts/hardening-v1/` 下的新契约，逐条覆盖原契约。
- **第四波有自己的清单** `docs/dispatch/wave4/manifest.json`。两个检查入口按票号前缀 `WATER-W4-` 读它。

派前做了两件事：
- **系统接口实测**：用一个子代理在本机实测了 G1 要用的全部 NT 系统调用（按句柄相对打开、按句柄枚举、按句柄删除、读重解析标签），结构体布局与两处坑写进 CLEAN-HARDENING 第 11 节。
- **自测**：三棵自测树 `.worktrees/w4-selftest-g1..g3` 用桩走完全部流程，见[派前回执](dispatch/wave4/READY-REPORT-20261026.md)。自测改了四处契约：
  1. 现有 D 处理不了超过 260 个字符的路径；
  2. G2 的一条旧断言随产品名改；
  3. “操作坞盖住最后一行”实测不成立，改为回归锁定；
  4. 短孤行用 `text-wrap: balance`（`pretty` 对中文无效）。

### 3.2 F3 受阻与验收

见 [F3 验收报告](acceptance/wave3/controller/WATER-W3-F3-REVIEW-20261026.md)。

- **sol 的回执**：写“受阻”。实现、测试、负控、final 都通过，只是 6 张整机截图里后 5 张是最小化窗口的标题栏。
- **原因**：总控观察器的缺口，修于 `9f9aab05`。不发补单。
- **总控验收**：验收树 `.worktrees/accept2-w3-f3`：
  - 重跑全部 final；
  - 5 条总控负控都打红；
  - 用总控自己的那 1 次窗口补拍五页，过程中脚本主动最小化一次，观察器恢复了 3 次；
  - 只读审查代理没有发现高、中级问题，4 条低级观察移交宿主收尾票。
- **窗口被最小化的对照实验**：现象是间歇性的，Water 没有任何把窗口最小化的途径。记录与脚本在 [f3-window-probes](acceptance/wave3/controller/accept2-20261026/controller/f3-window-probes/RESULTS.md)。

## 4. 第四波（已派出）

| 票 | 执行者 | 工作树 / 分支 | SPEC | 检查入口 | 测试 | 负控（检查器只认这 3 条） | final |
|---|---|---|---|---|---|---|---|
| G1 D 加固（重门，特殊票） | grokbot | `.worktrees/w4-g1` / `worker/water-w4-g1` | [CLEAN-HARDENING](../contracts/hardening-v1/CLEAN-HARDENING.md) | `checkup-wave-check.mjs` | `clean_v1` 精确 6 个（原 5 + `clean_handle_hardening`） | `CLEAN_REPARSE_KIND`、`CLEAN_GUARD_ID`、`CLEAN_NO_FOLLOW` | check、test |
| G2 服务加固 | grokbot | `.worktrees/w4-g2` / `worker/water-w4-g2` | [SERVICE-HARDENING](../contracts/hardening-v1/SERVICE-HARDENING.md) | `desktop-wave-check.mjs` | `service_v1` 精确 6 个（原 5 + `service_hardening`） | `SERVICE_PANIC_IDLE`、`SERVICE_TRUST_BOUNDARY`、`SERVICE_PARTIAL_SOURCE` | check、test、real |
| G3 界面修补（界面票） | Astra | `.worktrees/w4-g3` / `worker/water-w4-g3` | [UI-POLISH](../contracts/hardening-v1/UI-POLISH.md) | `checkup-wave-check.mjs` | 单元 3 个；浏览器精确 5 个（原 4 + `ui_m1_polish`） | `UI_LEVEL_GUARD`、`UI_FOOTER_WRAP`、`UI_NOTICE_SCOPE`（后两条跑浏览器测试） | check、test、browser |

- 基点都是 `0ca42f8`。
- 规则：[W4-HARDENING-WORKER-RULES.md](dispatch/W4-HARDENING-WORKER-RULES.md)。计划：[wave4/PLAN.md](dispatch/wave4/PLAN.md)。
- 回执路径：`<工作树>/docs/dispatch/reports/WATER-W4-Gn-REPORT.md`。

检查入口的新能力（都在 `checkup-wave-check.mjs`）：
- `outputRootExists`：baseline 要求已验收的目录存在且未改；
- `forbidPatterns`：G1 的 `src/` 不得出现 `std::fs`、`fs::`、`Path`、`PathBuf` 与路径式文件操作；
- `allowedFfi`：逐个核对原生模块声明的系统函数，回执记在 `ffi`；
- `browserProofs`：G3 的 nc2、nc3 跑浏览器测试。

## 5. 第四波怎么验收（每张票）

1. **收单审计**：
   - **G2**：直接用 `WATER_W3_AUDIT_MANIFEST=docs/dispatch/wave4/manifest.json node scripts/acceptance/w3-receipt-audit.mjs WATER-W4-G2`。检查入口相同，回执格式相同。
   - **G1、G3**：`scripts/acceptance/w2-receipt-audit.mjs` 把第二波清单写死了。先照 w3 的写法给它加一个清单覆盖变量，再审。
2. **新私有验收树**：照 `.local/w3-accept2/` 另起一套 `.local/w4-accept/`（`make-manifest.mjs`、`run.sh`、`controls.mjs`、`mutations.json`）：
   - 任务 ID 为 `WATER-W4-ACCEPT-G1..G3`，树为 `.worktrees/accept-w4-gN`，停在交回 HEAD，证据目录 `docs/acceptance/wave4/controller/accept-20261026/gN/`；
   - G1、G3 用 `WATER_W2_SELFTEST_MANIFEST` 覆盖清单，G2 用 `WATER_W3_OVERRIDE_MANIFEST`（两个检查入口都已放开 `WATER-W4-ACCEPT-` 前缀）；
   - `run.sh` 要按票选检查入口。
   - 可参考 `.local/w4-selftest/pipeline.mjs`，它已按票区分检查入口与环境变量。
3. **总控负控**，位置要与执行者不同：
   - **G1**：
     - 去掉目录 FileId 复核；
     - 目录句柄改成含删除共享；
     - 去掉祖先的保护身份判断；
     - 退回普通删除标记而不忽略只读；
     - 把 `Path`/`std::fs` 加回来（应被 check 拒绝）。
   - **G2**：
     - 去掉存储整理里的临时文件模式判断；
     - 规范路径改回文本比较；
     - 去掉产品名映射；
     - 让读回的计划可执行；
     - 只保护 `scan` 调用本身。
   - **G3**：
     - 去掉页面底部留白（`UI_DOCK_CLEARANCE` 应抓到）；
     - 连接类提示也在切换页面时清掉；
     - 只修侧栏、不修首页说明。
4. **代码审查**：每张票一个只读审查代理，只给代码与对应 SPEC、原契约，不给结论。
   - **G1** 重点：
     - 删除路径上是否还有任何按路径的操作；
     - 句柄是否在删除父目录前全部关闭；
     - 名称代理位判断；
     - 快照之后新出现的项不删；
     - 长路径的 `\\?\` 前缀；
     - unsafe 块的安全说明。
   - **G2** 重点：
     - `call` 与后台线程的 panic 保护是否覆盖整段；
     - 锁中毒恢复；
     - 读回记录与计划的授权；
     - 整理只删允许的文件；
     - 规范路径比较。
   - **G3** 重点：
     - 11 处整机检查文字是否一字未改；
     - tokens 是否逐字节相同；
     - 是否引入新视觉。
5. **专项**：
   - **G1**：用总控合成用例在验收树里再跑一组联接、云标签、别名、长路径、只读的组合。可参考 `scripts/acceptance/w3-f1-controller-cases.rs` 的做法：临时加 `[[test]]`，用完恢复。
   - **G2**：`real --final` 的 `in_use_labels` 应显示 Chrome、Edge 等产品名。
   - **G3**：**逐张看截图**，改设计的地方要先给用户看真实截图。
6. **合入**：每张通过后以 `--no-ff` 合入主线并推送。三张互不重叠，合入顺序不限。
7. **整合检查**（三张都合入后，在主线上）：
   - 四个包的测试全跑一遍：D、服务、宿主、界面单元与浏览器。G1 改了 D 的内部，G2 的清理测试要在新 D 上再跑一次；
   - 再做一次整机窗口检查。**会弹窗，开跑前先告诉用户。**

## 6. 之后

- **宿主收尾票**（F3 已合入，现在可以设计）：
  - F3 审查的 4 条低级观察：
    1. `app.run` 不返回，后面的代码永不执行，服务的 `Drop` 不运行；
    2. 测试并行时夹具父目录竞争；
    3. `service_backend` 没有直接测试；
    4. 夹具清理里的断言；
  - WIRING 第 7 节的已知限制：
    1. release 启动失败的提示；
    2. 第二个实例激活窗口；
    3. 选择框父窗口；
    4. WebView2 环境变量；
    5. 默认数据目录不能在联接后面；
  - 日常使用的 release 构建。
- **M2**：第四波三票与整合检查都通过后，打开清理开关，做自清理里程碑：用户在 Water 里清掉 Water 自己的开发垃圾，清理按钮由用户本人按。
- **用户试用 M1**：可以直接运行 `F:\new\smaltalk\water\.worktrees\accept2-w3-f3\.local\w3-target\debug\water.exe`，数据写到 `%LOCALAPPDATA%\Water`。若用户看到窗口自己缩小，再查。

## 7. 硬规矩（用户已定，不要再劝）

- ADR-018 的五项决定。
- 开发期只读本机，命令行不得进入任何输出或证据；真实删除只经 Water 应用，**由用户本人按清理按钮**；总控与执行者都不代删真实文件。
- 浏览器只清缓存，Cookies、登录数据、本地存储、IndexedDB 受保护。
- 总控负责整体 UI 设计：白色磨砂、纯色强调、无渐变光晕、无 emoji；改设计先给用户看真实截图。
- 派单：
  - 派单句每张票单独一个代码块；
  - 界面票或需要特定能力的票单独列出，提示选模型；
  - **补单与派单句都要能在新对话里直接执行**，用户会归档旧对话；
  - **用户希望多张票同时在跑**，见记忆 `water-parallel-dispatch`。
- 实现由用户外贴给执行者；总控不写产品代码，不自动启动实现者。自测用的桩只在自测树里。
- Water 的 AGENTS.md 规定不自动修改共享 Vault。
- Git：
  - 只按显式路径暂存，提交前看 `git diff --cached --name-status`；
  - 不用 `git add -A`、裸 `git stash`、clean、reset --hard；
  - 证据里被忽略的文件要 `git add -f`。
- GitHub 仓库保持私有。
- 会弹出真实窗口的检查开跑前先告诉用户。

## 8. 这一段新踩的坑

- **冻结哈希要在执行者工作树里算**：
  - 本仓库 `core.autocrlf=true`，新工作树里的文本是 CRLF，主检出里是 LF；
  - 第一次按主检出算，G3 自测 baseline 报 tokens.css 不符；
  - `scripts/dispatch/make-wave4.mjs` 已改为从 `.worktrees/w4-g1/` 读文件算哈希。
- **桩文件不要混换行**：用脚本往 CRLF 文件里插 LF 行，提交时 Git 会统一换行，恢复后的字节就与变异前不同，负控审计对不上。
- **断言要带标记**：`unwrap_err()` 在变异后 panic 的消息里没有标记，负控被判无效。验收自己的合成用例也一样。
- **Bash heredoc 会吃反斜杠**（再次踩到）：含反斜杠或正则的补丁一律用 Write 或 Edit 工具。
- **原生窗口会被最小化**：观察器已能恢复，但截图前后都要看 `restores` 与每张图的尺寸。
- **`desktop-wave-check.mjs` 是从主检出按绝对路径执行的**：执行者树里那份副本不起作用，改主检出的那份会立刻影响正在跑的票。改之前确认没有人在跑，或者保证对已有票号完全向后兼容。
- **验收树归档后审计会报 “worker tree dirty”**：那是归档刚生成、还没提交的证据，属预期。
- 验收树与自测树越来越多（`accept2-w3-f3`、`w4-selftest-*` 等），都是自清理里程碑的素材，现在不要删。

## 9. 待办

1. 用户转告 G2、G3（以及之后 G1）回执后，按第 5 节逐张验收、合入。
2. 三张合入后做主线整合检查（会弹窗，先告诉用户）。
3. 设计宿主收尾票；然后 M2 与自清理里程碑。
4. 第一波遗留未验收项保持原状：真实用户 scope 的自然同意鉴真、生产竞态、macOS。
5. 共享 Vault 还没有 Water 项目页；按项目规则由 Keeper 从交接报告与 ADR 摄入。

## 10. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261026-5.md）：读交接报告，准备接手 Water 总控。
```
