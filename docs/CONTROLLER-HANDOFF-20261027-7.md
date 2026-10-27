# Water 总控交接报告（2026-10-27 第 7 份）

项目根 `F:/new/smaltalk/water`。总控 Claude。因用户要压缩上下文而写；本报告取代 [第 6 份](CONTROLLER-HANDOFF-20261027-6.md) 作为当前入口。第 5 份第 5 节的验收步骤、第 7 节硬规矩、第 8 节的坑，以及第 6 份第 6、7 节，仍然有效。本份只写变化与补充。

## 0. 一句话现状

- **M1 体检 Alpha 已达成**（见第 5 份）。
- **第四波 G1～G4 全部验收合入**：

  | 票 | 内容 | 合入 |
  |---|---|---|
  | G1 | D 加固（按句柄删除），三轮、两张补单 | `0cd9db7e` |
  | G2 | 服务加固 | `7f01d71f` |
  | G3 | 界面修补 | `aeb49ed3` |
  | G4 | 冰山标志与脉搏线导航 | `bc93d567` |

- **主线整合检查通过**（`8af6229c`，[整合报告](acceptance/wave4/controller/WATER-W4-INTEGRATION-20261027.md)）：
  - 四个包的检查与测试全绿；
  - 整机窗口只读体检 11 步全过，标题栏是新图标，没有删除任何东西。
- **M2 准备三票已派出**（10-27 约 18:50 用户告知），基点都是 `4f35c52f`：
  - **WATER-W4-G5** 清理结果报告修正：sol；
  - **WATER-W4-G6** 宿主收尾：sol；
  - **WATER-W4-G7** 界面收尾：astra。
- **记录这份交接时**三棵工作树都还停在基点，只有总控的 preflight 回执。
- **下一步**：
  1. 用户转告回执后逐张验收（第 4 节）；
  2. 三张合入后再做一次主线整合检查；
  3. 总控做日常使用的 release 构建；
  4. M2。

## 1. 仓库与远端

同第 5、6 份：
- 五步推送各自执行，不用 `&&` 串；
- 强制更新只给用户命令，完整提交号先查出来。

写本报告时 GitHub、中央仓库、E 盘镜像三处 `main` 一致，都在本报告的提交。

## 2. 本份覆盖的提交

| 提交 | 内容 |
|---|---|
| `188db373` | G1 第二轮验收，发补单 02；总控竞态用例 |
| `e5b90db1` | 用户选定脉搏线；设计说明第 10 节；应用图标导出件 `brand/water-app-icon.ico` |
| `b65adae2` | G4 票、清单、工作树 |
| `0cd9db7e` / `487edf38` | G1 第三轮通过，合入，台账 |
| `bc93d567` / `8af6229c` | G4 通过，合入，台账（含宿主编译证据） |
| `ef77e96e` | 主线整合检查报告与证据 |
| `4f35c52f` | M2 准备契约：`contracts/m2-prep-v1/CLEAN-REPORT.md`、`HOST-FINISHING.md`（三张新票的基点） |
| `a491515d` | G5、G6、G7 票、清单、preflight |
| `da03060c` | 记录派出：G5、G6 交 sol，G7 交 astra |
| 本报告的提交 | 第 7 份交接 |

## 3. 这一段做完的事

### 3.1 G1 第二、三轮（[收单验收](acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)）

- **第二轮**（补单 01）：
  - 高级与中级 1～3 解决；
  - 中级 4 没做全：计划里的目录被换成文件时，按当前对象判断，没有停止本项；
  - 另有几处结果报告不准；
  - 于是发补单 02。
- **第三轮**（补单 02）：全部做到，VERIFIED，合入。剩下的只是竞态下的报告准确性，记在清单 G1 的 `carryOverBeforeM2`，现由 G5 处理。
- **总控竞态用例**（`scripts/acceptance/w4-g1-controller-cases.rs`，共 12 项）：
  - **不需要产品挂点**：条目里放 5000 个文件的 `aaa` 最先被删；另一个线程等 `aaa\f00000.bin` 消失，就去改后面的对象。
  - **能区分新旧代码**：第一轮源码会删掉被改成非链接标签的重解析点，也会把还剩文件的条目报成“已删除”。
  - **十万文件**删除用时 23 秒，第一轮源码是 155 秒。
  - 运行脚本：`.local/w4-accept3/g1-cases.sh`，与 `g1-case-proofs.sh`（在第一轮源码或变异下跑）；用 `--skip` 可以跳过某些用例。

### 3.2 G4 标志与导航图标（[收单验收](acceptance/wave4/controller/WATER-W4-G4-REVIEW-20261027.md)）

- 用户看了四个候选的真实截图（[对比](design/water-ui-v1/brand/nav-candidates-board.png)），**选了 A 脉搏线**（总控推荐的是扫描框）。
- 应用图标由 `scripts/design/export-app-icon.cjs` 导出：
  - 本机 headless Chrome 栅格化，16～256 各尺寸都以 PNG 存入 ICO；
  - 重复运行字节相同；
  - 宿主的 `icons/icon.ico` 与它逐字节相同。
- Opus 5.5 执行，一次通过。
  - 执行者另把清理记录“体检记录”行的水滴也换成脉搏线，总控认可。
  - 宿主编译用桌面检查器加验收覆盖清单 `host-manifest-g4.json`，只跑 lock 与 check，不开窗。
- 测试小缺口记在 G4 的 `carryOverLater`，现由 G7 处理。

### 3.3 主线整合检查

- **整合树与工具**：整合树 `.worktrees/integ-w4`，工具 `.local/w4-integ/`。
  - 运行脚本：`run.sh <d|ui|svc|host> <mode>[:final]`；
  - 每个检查器各一份覆盖清单，任务配置分别取自 G1、G4、G2、F3。
- **测试数**：D 6/6，服务 6/6（G2 的清理测试在新 D 上通过），界面 3/3 与 5/5，宿主 5/5。
- **整机窗口检查**：
  - 只开 1 个窗口，用时 101 秒，窗口没被最小化过；
  - 识别 44.0 GB，可放心清理 9.9 GB；
  - 计划与清理都是 0，没有删除任何东西。

### 3.4 M2 准备三票（10-27 派出）

| 单号 | 执行者 | 改哪里 | 契约 | 门 | 负控标记 |
|---|---|---|---|---|---|
| WATER-W4-G5 清理结果报告修正 | sol | `packages/junk-clean` | [CLEAN-REPORT](../contracts/m2-prep-v1/CLEAN-REPORT.md) | 重门，final：check、test | 沿用 `CLEAN_REPARSE_KIND`、`CLEAN_GUARD_ID`、`CLEAN_NO_FOLLOW` |
| WATER-W4-G6 宿主收尾 | sol | `apps/water/host` | [HOST-FINISHING](../contracts/m2-prep-v1/HOST-FINISHING.md) | final：check、test、native（会弹 1 窗） | `HOST_SINGLE_INSTANCE`、`HOST_STARTUP_VISIBLE`、`HOST_DATA_JUNCTION` |
| WATER-W4-G7 界面收尾 | astra | `apps/water/ui` | 票内“要做的” | 轻门，final：check、test、browser；必需截图 19 张 | `UI_COMMAND_SCOPE`、`UI_NOTICE_SCOPE`、`UI_BRAND_MARK` |

- 票在 `dispatch/tickets/WATER-W4-G5-CLEAN-REPORT-20261027.md`、`…G6-HOST-FINISHING-…`、`…G7-UI-FINISHING-…`。
- 工作树 `.worktrees/w4-g5|g6|g7`，分支 `worker/water-w4-g5|g6|g7`。
- **编号**：为了不改检查器，仍用第四波编号。两个检查器只认 `WATER-W4-*`（读第四波清单）与旧波次。
- **冻结**：第四波清单的总冻结加了 `contracts/desktop-bootstrap-mirror-v1/MIRROR.json`，宿主类任务的检查器要求它在总冻结里。

## 4. 三张票怎么验收

通用流程同第 5 份第 5 节：
1. **审计**：
   ```bash
   WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave4/manifest.json node scripts/acceptance/w2-receipt-audit.mjs WATER-W4-G5
   ```
   G6、G7 同理换单号。另外核对首次 HEAD `4f35c52f` 是祖先、没有改写历史。
2. **验收树**：从已有工具复制一套，用 `sed` 换路径。
   - G5 可从 `.local/w4-accept3` 复制（检查器 checkup），换成 `accept-w4-g5`；
   - G7 从 `.local/w4-accept-g4` 复制；
   - G6 用桌面检查器，参照 `.local/w3-accept2`（F3 验收）。
   - **注意** `controls.mjs` 里的 `failedRun`：界面票要按 `# fail` 判断，Rust 与宿主按 `test result: FAILED` 判断。复制后检查这一行，G4 时改成了 `!['g3','g4'].includes(slot)`。
3. **重跑 final**；总控负控，位置与执行者的不同；**逐张看截图**（G6 的 6 张整机截图、G7 的 19 张）。
4. **独立审查**：只读代理，只给代码、契约与票，不给回执与结论。
5. **专项**：
   - **G5**：
     - 把 `scripts/acceptance/w4-g1-controller-cases.rs` 的失败计数按 CLEAN-REPORT 第 3 节改，例如替换文件加快照后新出现文件的用例从 2 变成 1；
     - 新增竞态用例：条目在删除开始前被改名移走（应报 `skipped`/`gone`）、只差大小写的替换、`removed` 为 0 时释放 0；
     - 十万文件重新计时，确认忽略大小写的查找不是线性的；
     - 用第三轮的源码 `24e36fb4` 跑新用例，确认它们会失败。
   - **G6**：
     - 宿主在验收树里跑 `native --final` 要先告诉用户（会弹窗）；
     - 第二个实例唤起窗口要在真窗口里试一次，这要另开第二个窗口，先问用户；
     - 联接数据目录的测试只在夹具里。
   - **G7**：看 `paused`、`reconnecting`、`notice-*` 截图；确认 11 处文字没变。
6. **合入**：`--no-ff`；证据复制进 `docs/acceptance/wave4/controller/accept-…/`，`*.log` 用 `git add -f`；清单写 `controllerReview`；STATUS 更新。
7. **三张都合入后**：
   - 在主线新建整合树，重跑第 3.3 节的整合检查（会弹窗，先告诉用户）；
   - 然后总控做 release 构建（`cargo build --release`，带镜像参数与离线缓存，参照桌面检查器的环境），把 exe 路径给用户。

## 5. 之后

1. **M2**：打开清理开关，自清理里程碑：用户在 Water 里清掉 Water 自己的开发垃圾，清理按钮由用户本人按。M2 开工前先出计划给用户看。
2. **仍记着、没排票**：
   - 宿主：选择框父窗口、WebView2 环境变量（要 FFI 或改 `native-picker`）；
   - D：递归深度、含孤立代理项的名字（低级）；
   - 第一波遗留：真实用户 scope 的自然同意鉴真、生产竞态、macOS。

## 6. 硬规矩（在第 5 份第 7 节、第 6 份第 6 节之外新增）

- **派单必须标出单号**：每条粘贴语上方写单号，并列出本次派出的全部单号，方便用户核对。用户 10-27 的要求，已记进记忆。
- 用户选定的设计（冰山原版、脉搏线）以设计说明第 10 节为准；总控的推荐只是选项。

## 7. 这一段新踩的坑

- **同一棵树里先跑服务、再跑宿主会找不到依赖**：
  - 两者共用 `.local/w3-cargo-home`，检查器只在目录不存在时才复制离线缓存。
  - ~~先跑宿主~~：**更正**（10-27 第二次整合检查）：两份缓存互不包含，宿主先跑时服务又缺 `unicode-ident`，哪个顺序都不行。分两棵树，或在两者之间把 `w3-cargo-home` 改名换用（见[第二次整合报告](acceptance/wave4/controller/WATER-W4-INTEGRATION2-20261027.md)）。
  - 已发生时把目录改名，不要删。
- **主检出是 LF，新工作树是 CRLF**：冻结文件的哈希要从新工作树的检出里取（检查器在执行者树里算哈希）。
- **执行者编辑工具会截掉行尾的字母 `r`**：G1 补单 02 有三行注释变成 “othe”“rathe”。验收时 `grep -nE "(othe|rathe)$"` 一类检查，G5 票里已要求补回。
- **Chrome 截图 `--dump-dom` 的输出是 CRLF**：解析时用 `\r?\n`。
- **同机并行编译时私有 headless Chrome 可能失去响应**：G4 执行者遇到一次，重跑通过。总控的浏览器检查不要与 cargo 编译同时跑。
- **`bash` 的 `cd` 会保留**：工作目录被带进别的树。命令以 `cd /f/new/smaltalk/water &&` 开头，或用子 shell。
- **带 `"error":null` 的输出不能用 `grep error` 判断失败**：等待循环要按模式行数判断。
- **`*.log` 被 `.gitignore` 忽略**：证据目录要 `git add -f`，提交后用 `git ls-files | wc -l` 对数。

## 8. 待办

1. 用户转告 G5、G6、G7 回执后按第 4 节验收、合入。
2. 三张合入后做主线整合检查（会弹窗，先告诉用户），然后 release 构建。
3. M2 计划给用户看。
4. 共享 Vault 还没有 Water 项目页；按项目规则由 Keeper 从交接报告与 ADR 摄入，总控不写共享 Vault。

## 9. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261027-7.md）：读交接报告，准备接手 Water 总控。
```
