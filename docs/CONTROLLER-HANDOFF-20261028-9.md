# Water 总控交接报告（2026-10-28 第 9 份）

项目根 `F:/new/smaltalk/water`，总控 Claude。因用户要压缩上下文而写；本报告取代[第 8 份](CONTROLLER-HANDOFF-20261027-8.md)作为当前入口。

以下仍然有效：
- 第 5 份第 5 节的验收步骤、第 7 节硬规矩、第 8 节的坑；
- 第 6 份第 6、7 节；
- 第 7 份第 6、7 节；
- 第 8 份第 1 节（远端、提交身份、离线缓存 `.offline-cache/`）、第 4.1 节（收单通用流程）、第 6、7 节。

本份只写变化与补充。

## 0. 一句话现状

- **M2 的代码部分全部完成**：
  - 第五波五张全部验收合入：H5 `38d240d0`、H4 `de472412`、H2 `f58eeb2c`、H3 `a9f97325`、H1 `b3168cb7`（H1 经补单 01）。见[第五波收单验收](acceptance/wave5/controller/WATER-W5-REVIEW-20261028.md)。
  - **第三次主线整合检查通过**（主线 `77f33746`，[报告](acceptance/wave5/controller/WATER-W5-INTEGRATION3-20261028.md)）：五个包全绿；真窗口夹具清理闭环一次通过（1 窗、9 步、10.5 秒、只删合成夹具 3,145,815 字节）。
  - **打开清理的 release 版已编好**：`F:/new/smaltalk/water/.local/release/water-0.1.0-77f33746/water.exe`（sha256 `c5b72e0ea6eee143eef56403fbc398bb3891376ad6fd60fade1f417fba098778`），冒烟通过。旧版 `water-0.1.0-d64aa399` 只能体检，留着不动。
- **M2 还差自清理**：用户电脑在跑别的任务，暂时不能清理，等用户说可以（第 5 节）。之后写 M2 达成报告。
- **M3 已拍板**（10-28，“可以，出单吧”，[M3 计划](M3-PLAN-20261028.md)五条全按推荐）：
  - macOS 暂不移植，先把 Windows 测好（ROADMAP 已改）；
  - **第六波三张票 READY，写本报告时还没派出**（用户没说派给谁）：

  | 单号 | 改哪里 | SPEC | 门 | 负控标记 |
  |---|---|---|---|---|
  | WATER-W6-I1 Agent 工具规则 | `packages/junk-rules` | [RULES-AGENT](../contracts/m3-v1/RULES-AGENT.md) | 轻门，final 含 real | `RULES_AGENT_TOOLS` |
  | WATER-W6-I2 宿主收尾 | `apps/water/host` | [HOST-M3](../contracts/m3-v1/HOST-M3.md) | 重门，native 夹具清理闭环（1 窗） | `HOST_EXIT_DURING_CLEAN`、`HOST_CLOSE_UNKNOWN`、`HOST_CLOSE_DURING_CLEAN` |
  | WATER-W6-I3 界面收尾 | `apps/water/ui` | 票内“要做的” | 轻门，截图 21 张 | `UI_RETURN_SCOPE`、`UI_RECONNECT_READ`、`UI_CLEAN_STOP` |

  - 基点 `d79fb096ef0557430b7dd43634b4d60e8f2de958`（标签 `water-w6-m3-base-20261028`）；票、清单与派前 baseline 在 `58c6dad4`；
  - 票 `dispatch/tickets/WATER-W6-I*-20261028.md`；清单 [wave6/manifest.json](dispatch/wave6/manifest.json)；计划与派单句 [wave6/PLAN.md](dispatch/wave6/PLAN.md)；规则 [W6-M3-WORKER-RULES](dispatch/W6-M3-WORKER-RULES.md)；
  - 工作树 `.worktrees/w6-i1`～`w6-i3`，分支 `worker/water-w6-i1`～`i3`，写本报告时都停在基点、干净。
- **下一步**：用户派单 → 记进清单 → 回执到了按第 4 节验收；用户电脑空出来就做自清理。

## 1. 仓库与远端

同第 8 份第 1 节：五步推送各自执行，不用 `&&` 串；提交身份 `-c user.name="Riku Toto" -c user.email=usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai`，信息写进 scratchpad 文件再 `-F`。写本报告时 GitHub、中央仓库、E 盘镜像三处 `main` 一致，都在本报告的提交。

## 2. 本份覆盖的提交

| 提交 | 内容 |
|---|---|
| `cc24905a` | H5 补单 01（受阻：新增规则改变写死的数量） |
| `ec40c6c0` | 10-28 凌晨验收进度（用户叫停） |
| `0c303833` | H1 补单 01 与总控用例 |
| `38d240d0` / `de472412` / `f58eeb2c` / `a9f97325` | H5、H4、H2、H3 合入 |
| `487e4100`、`f2ad5357` | 验收证据与第五波收单验收报告 |
| `f35982aa` | H1 补单派出（sol） |
| `b3168cb7`、`77f33746` | H1 合入，第五波全部合入 |
| `f6f99c7d` | 第三次主线整合检查 |
| `4486766d`、`ce82689d` | M2 release 版记录 |
| `b9a81060` | ROADMAP：macOS 推迟 |
| `622ce0ec` | M3 计划草案与 Agent 工具调研 |
| `d79fb096` | 第六波基点：`contracts/m3-v1/` 两份契约、执行者规则、两个检查器认第六波 |
| `58c6dad4` | 第六波三张票、清单、派前 baseline |
| 本报告的提交 | 第 9 份交接 |

## 3. 这一段做完的事

### 3.1 第五波收单

- 工具 `.local/w5-accept/`（副本 [accept-kit](acceptance/wave5/controller/accept-kit/)）：`make-manifest.mjs`、`run.sh`、`controls.mjs`、`mutations.json`、`h1-unit.sh`、`h1-cases.sh`、`h1-deep-old.sh`。验收树 `.worktrees/accept-w5-h1`～`h5`，另有 `accept-w5-h1-cases` 专跑 H1 总控用例。
- 每票：审计、新树重跑 final、总控负控（位置都与执行者不同）、只读代理独立审查（只给代码、契约与票）。
- **H1**：总控用例三份进了仓库：
  - [w5-h1-controller-unit.rs](../scripts/acceptance/w5-h1-controller-unit.rs)：10 个“先快照、再改磁盘、再删除”的用例；
  - [w5-h1-controller-cases.rs](../scripts/acceptance/w5-h1-controller-cases.rs)：经 `execute` 的否决用例与深树残余；
  - [w5-h1-deep-unit.rs](../scripts/acceptance/w5-h1-deep-unit.rs)：4000 层深树，旧源码栈溢出崩溃。
  - 第一轮审查发现名字不是合法 UTF-16 的目录在快照里不展开、整项否决失效 → 补单 01（方案 A：整项跳过为 `changed`）→ sol（自报 Codex GPT-6）交回，验收通过。
- **H2**：总控 nc3 第一次被旧标记先抓到，换更窄位置后通过。审查的两条中级都出在总控自己的 SERVICE-M2，接受。
- **H3**：真窗口夹具清理闭环通过；关机保护缺口记下，已进第六波 I2。
- **H4**：截图看过；遗留进第六波 I3。
- **H5**：经补单 01；检查器不认只改规则数据的负控，总控改 `src/plan.rs` 做负控。

### 3.2 第三次整合检查与 release

- 两棵整合树：`.worktrees/integ-w5a`（D、界面、规则、服务）、`integ-w5b`（宿主），因为服务与宿主的离线缓存互不包含。工具 `.local/w5-integ3/`（`make-manifests.mjs`、`run.sh`、`build-release.sh`，副本在 [integ3 controller](acceptance/wave5/controller/integ3-20261028/controller/)）。
- release：在 `integ-w5b` 编，3 分 3 秒，无警告；冒烟用 [`w4-g6-second-instance.ps1`](../scripts/acceptance/w4-g6-second-instance.ps1)：第二实例 48 ms 退出，最小化窗口 372 ms 回到前台，关窗退出码 0。

### 3.3 M3 摸底与计划

- 本机只读摸底（名字、大小、时间）+ **Grok 4 公开文档调研**，存档 [agent-tools-20261028](research/agent-tools-20261028/)：`BRIEF.md`（给 Grok 的简报）、`GROK-REPORT.md`、`VERIFY.md`（总控核对与更正，以它为准）。
- 本机装有：Antigravity（agy 与 Cockpit）、Grok（`.grok`、`.grok1`～`.grok5`、`.grokbot`）、Kimi Code、ZCode、DeepSeek Harness（`.dsh`）、Kiro、Qoder、WorkBuddy/CodeBuddy、OpenCode、Copilot、Gemini CLI、Ollama、Claude Code 原生安装。原规则只覆盖 Codex、Claude、Cursor、`.grok`。
- 本机可清约 2.5 GB（更新器残留约 1.5 GB、Claude Code 旧版本 0.5 GB、自更新旧二进制 0.3 GB 等），另把约 3 GB 的会话与配置加成受保护以便看见。
- 进程名只核实了 `cursor.exe`、`claude.exe`（另见 Grok `agent.exe`、`codex.exe`）；其它工具没在运行，规则里不写它们的进程名。

### 3.4 第六波准备

- 契约 `contracts/m3-v1/RULES-AGENT.md`、`HOST-M3.md`；I3 的 SPEC 在票里。
- 吸取第五波教训：规则数 61→75、目标数 216→255、数据版本 `2026-10-28.1` 事先写进契约授权；执行者提交用自己的名字；负控只能改产品源码。
- 清单生成 [`make-wave6.mjs`](acceptance/wave6/controller/make-wave6.mjs)（I1 取 H5、I2 取 H3（夹具前缀改 `.local/w6-i2-native/`）、I3 取 H4 的任务配置）。
- 两个检查器认 `WATER-W6-*`，覆盖清单允许 `WATER-W6-SELFTEST`、`WATER-W6-ACCEPT-` 前缀。派前 baseline 三棵树都通过（[preflight](acceptance/wave6/controller/preflight-20261028/)）。

## 4. 第六波怎么验收

### 4.1 通用

同第 8 份第 4.1 节，换成第六波：
- 审计：`WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave6/manifest.json node scripts/acceptance/w2-receipt-audit.mjs WATER-W6-I1`（其余换单号）。
- 工具：复制 `.local/w5-accept/` 为 `.local/w6-accept/`：
  - `make-manifest.mjs` 读 `docs/dispatch/wave6/manifest.json`，任务名 `WATER-W6-ACCEPT-I*`，验收树 `.worktrees/accept-w6-i*`，证据 `docs/acceptance/wave6/controller/accept-<日期>/<slot>/`；
  - `run.sh` 与 `controls.mjs`：I2 走桌面检查器，I1、I3 走 checkup；`failedRun` 只有 I3 按 `# fail`。
- 负控位置与执行者不同；被别的测试超时或旧标记先抓到时，换更窄位置。
- 独立审查：只读代理，只给代码、契约与票，不给回执与结论。
- 合入、证据（`*.log` 用 `git add -f`）、清单写 `controllerReview` 与 `carryOverLater`、STATUS。

### 4.2 各票专项

- **I1**：
  - 新规则逐条对照 RULES-AGENT；进程名只能是 `cursor.exe`、`claude.exe`；
  - 合入前在含 I1 的验收树里做一次**服务的只读真实冒烟**（覆盖清单里加一个以 H2 任务配置为底、指向该树的服务任务，跑 desktop 检查器 `real`），核对新组的命中目录与体量和 VERIFY.md 一致、受保护组不可勾选。
- **I2**：
  - 重门、独立审查；
  - **总控另在真窗口里试“清理进行中关窗”**：这个脚本还没写。做法：大夹具（几万个小文件）、七个分类关闭、开始清理后立即发关窗，核对窗口等清理停下才关、清理记录与日志完整、退出码 0。**开窗前告诉用户。**
  - 真实的系统关机不试。
- **I3**：
  - 截图逐张看，重点 `clean-stop-failed`、`stop-failed`、`stale`；
  - 用第四波 G7 nc2 那类变异（让“正在重新连接”不出现）核对：只能有带标记的失败，不能有 `Browser condition timed out`。

### 4.3 三张都合入后

第四次主线整合检查（照 `.local/w5-integ3/`，两棵树，宿主整机检查开窗先告诉用户）→ 新 release 版 → 写 M3 第一波小结。

## 5. 自清理（M2 计划第 3.2 节）

用户说电脑可以清理时：
1. 用户运行 `F:\new\smaltalk\water\.local\release\water-0.1.0-77f33746\water.exe`（打开清理的那一版）。
2. **先到“扫描位置”把七个分类开关全部关掉**（总控 10-28 加的要求：自清理只清 Water 自己的开发垃圾，开着分类会把本机别的可清位置也默认勾上）。
3. 同一页“添加文件夹”选 `F:\new\smaltalk\water\.worktrees`，回首页“开始体检”。体检完告诉总控，**先别按清理**。
4. 总控只读核对：哪些组、各多少；有没有误入证据、源码、`.git`、`.offline-cache`；然后给勾选建议。
5. **用户本人**按“清理所选”并确认。
6. 总控核对：清理记录与日志、释放量、前后可用空间；每棵工作树 `git status` 与清理前一致；证据完好；从 `.offline-cache` 新建一棵树离线跑一遍检查。
7. 写 M2 达成报告与交接。

注意：
- 清理时不要同时编译；最近一小时内动过的构建目录会按年龄规则跳过。
- 现在 `.worktrees` 里多了验收与整合树（`accept-w5-*`、`accept-w5-h1-cases`、`integ-w5a/b`）与第六波工作树；它们的构建目录也会被认出来。第六波的树若正在被执行者编译，会因为太新被跳过；最好在第六波交回之后再做自清理，或者提醒用户只勾已经不用的。
- `.worktrees/w5-selftest-h3`（分支 `selftest/water-w5-h3`）是证据，**永不合入**；它的构建目录可以清。

## 6. 本段新确认的事实与规矩

- **用户决定**：
  - macOS 暂不移植，先把 Windows 测好（记忆 `water-macos-deferred`）；
  - 用户问“开新对话可以吗”时指的是执行者；总控要不要换对话由用户明确说（记忆 `water-controller-session-continuity`）；
  - `.grok1`～`.grok3`（已退订或停用）与其它 Grok 家目录按受保护处理；
  - **Grok 可以当总控的内部下属做常规任务**（记忆 `water-grok-subordinate`）。
- **Grok 用法**（权威手册 `F:\new\denglou\worktrees\ui-v2\docs\agents\GROK-USAGE.md`，只有 grok4 槽可用）：
  ```bash
  AGENT_REPO=<git 仓库> AGENT_PIDFILE=<绝对路径>.pid bash F:/new/denglou/worktrees/ui-v2/scripts/agents/grok4_run.sh --effort high --prompt-file <绝对路径简报> > <日志> 2>&1; exit $?
  ```
  - `AGENT_REPO` 必须是 git 仓库；Water 的调研用 `F:\new\smaltalk\water\.local\grok-m3`（已初始化的空仓库）；
  - 它带 `--always-approve` 运行，简报里要写清只能在哪写、不能碰什么；跳过 Vault 与 Keeper；
  - 看产物不看退出码；单槽，不能并行；结果要在本机核实后再用（这次它把 `.grok\downloads` 的现有级别写错了）。
- **清理执行器**：`execute` 前后两次预检，刚建好的深目录树第一次常被判 `changed` 跳过，两秒后再跑就正常；第五波以前就这样，方向安全。
- **H1 的第二道防线**：绕开“名字异常的目录整项跳过”的检查，快照仍会因为用私有键打不开而报 `changed`。
- **检查器**：checkup 检查器的负控必须改 `packages/<包>/src/` 下的文件，只改规则数据不认。
- **整合检查**：服务与宿主分两棵树，不再改名换缓存目录。
- **第二实例冒烟脚本**要求 `-DataDir` 事先不存在。

## 7. 这一段新踩的坑

- **Bash 工具会吞掉命令里的反斜杠**：heredoc 或内联 python 里写 `\\?\`、`F:\new\...` 会变成 `\?\`、`F:` 加换行（`\n`）。Windows 路径与含反斜杠的源码一律用 Write/Edit 工具写；一次 heredoc 还被截断过。
- **负控被旧标记先抓到**（H2 nc3 的 `||` 改 `&&` 先撞上 `SERVICE_CANONICAL_ROOT`）：换只影响新逻辑的位置。
- **`du` 对 `.workbuddy\binaries`、`.codex2\.tmp`、Grok 各家目录很慢**：摸底只量需要的子目录，或放后台并给每个目录设时限。
- Bash 的 `cd` 仍会保留到后续命令：命令以 `cd /f/new/smaltalk/water &&` 开头。

## 8. 待办

1. 用户派第六波后：清单写 `model`（用户告知的执行者）、`dispatchReportedAt`、`dispatchEvidence`，状态改 `DISPATCHED`，更新 STATUS。
2. 回执到了按第 4 节验收、合入；I2 的真窗口关窗测试要先写脚本，开窗前告诉用户。
3. 用户电脑空出来就做第 5 节的自清理，然后写 M2 达成报告。
4. 第六波合入后：第四次整合检查 → 新 release 版。M3 后面还有：应用内“距上次体检 N 天”与“几天后满”的提示（拍板第 4 条），第七波孤儿进程（只列不结束）。
5. 共享 Vault 仍没有 Water 项目页；按项目规则由 Keeper 从交接报告与 ADR 摄入，总控不写共享 Vault。

## 9. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261028-9.md）：读交接报告，准备接手 Water 总控。
```
