# Water 总控交接报告（2026-10-27 第 6 份）

项目根 `F:/new/smaltalk/water`。总控 Claude。因用户要压缩上下文而写；本报告取代 [第 5 份](CONTROLLER-HANDOFF-20261026-5.md) 作为当前入口。第 5 份第 5 节的验收步骤、第 7 节硬规矩、第 8 节的坑仍然有效，本份只写变化与补充。

> **10-27 下午更新**：G1 补单 01 已做第二轮复核，结论是发[补单 02](dispatch/tickets/WATER-W4-G1-ADDENDUM-02-20261027.md)，见 [G1 收单验收](acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)“第二轮”与 [STATUS](STATUS.md)。下面第 0、4、8 节里“G1 待验收”的说法以此为准。补单 02 交回后照第 4 节同一套工具复核，验收树 `.worktrees/accept2-w4-g1` 要先改到新的交回 HEAD（或新建 `accept3-w4-g1`）；总控竞态用例在 `scripts/acceptance/w4-g1-controller-cases.rs`，运行与证明脚本是 `.local/w4-accept2/g1-cases.sh`、`g1-case-proofs.sh`。同日用户选定“体检”导航为脉搏线，标志小票 [WATER-W4-G4](dispatch/tickets/WATER-W4-G4-BRAND-20261027.md) 已 READY（第 5 节第 2 条的截图一步已完成）；验收时另编译宿主，并核对 `icon.ico` 与 `brand/water-app-icon.ico` 的哈希。

## 0. 一句话现状

- **M1 体检 Alpha 已达成**，见第 5 份。
- **第四波**：
  - **G2 服务加固**：VERIFIED，合入 `7f01d71f`。
  - **G3 界面修补**：补单 01 之后 VERIFIED，合入 `aeb49ed3`。
  - **G1 D 加固**：第一轮发了补单 01。**执行者已在工作树里交回**（实现 `2b6fb535`，回执 `23a6434d`，回执第一行写“任务已完成”），但写本报告时用户还没转告，总控也还没验收。
- **标志**：用户选定黑白方案里的“冰山”原版，取代水滴，已写进[设计说明第 10 节](design/water-ui-v1/DESIGN.md)。界面改动等出标志小票。
- **新规矩**：执行者不 push、不改写已有提交，每张票都要写明（见第 5 节）。
- **下一步**：
  1. 用户转告 G1 回执后做第二轮验收（第 4 节），合入；
  2. 主线整合检查（会弹窗，先告诉用户）；
  3. 标志小票（先给用户看导航图标候选的真实截图）；
  4. 宿主收尾票；
  5. M2。

## 1. 仓库与远端

同第 5 份第 1 节，有两处补充：
- **五步推送各自执行**，不要用 `&&` 串起来，一步失败后面照常跑。
- `--all` 会把在途的执行者分支也推上去备份。若某个分支因历史被改写而被拒：
  - 只对那一个分支用 `--force-with-lease=<分支>:<远端旧值>` 更新。
  - **自动模式的安全检查会拦下总控做这一步**，要把命令给用户自己跑。
  - 命令里的完整提交号必须先用 `git rev-parse` / `git ls-remote` 查出来，不要凭缩写补全。10-27 第一次就因为补错了被 `stale info` 拒绝。

写本报告前三处（GitHub、中央仓库、E 盘镜像）一致：`main` 在 `1ec85de6`，`worker/water-w4-g1` 在 `b593f0be`。之后执行者又在本地加了两个提交，下次 `push --all` 会作为正常的快进推上去。

## 2. 本份覆盖的提交

| 提交 | 内容 |
|---|---|
| `7f01d71f` | G2 以 `--no-ff` 合入 |
| `24151a5a` | G2 验收台账；G3 补单 01；两个收单审计脚本的修改 |
| `1613c4b3` | 记录 G3 补单 01 派出 |
| `fb5efa29` | 冰山标志写进设计说明第 10 节与 `brand/` |
| `aeb49ed3` | G3 以 `--no-ff` 合入 |
| `d8bf60a8` | G3 第二轮验收台账，STATUS 写明天的待办 |
| `ce3eec5d` | 标志与导航图标预览脚本存进 `scripts/design/` |
| `466b7051` | G1 收单验收与补单 01 |
| `1ec85de6` | 执行者不 push、不改写提交的规则 |
| 本报告的提交 | 本交接，并记录 G1 补单已交回、未转告 |

## 3. 这一段做完的事

### 3.1 G2、G3 验收（详见[收单验收](acceptance/wave4/controller/WATER-W4-G2G3-REVIEW-20261026.md)）

- **收单审计脚本**：
  - `w2-receipt-audit.mjs` 加了清单覆盖变量 `WATER_W2_AUDIT_MANIFEST`；
  - 两个审计脚本比较源码时，接受提交里的原始 blob 或其检出形式（本仓库 `core.autocrlf=true`，执行者树是 CRLF）。
- **G2**：
  - 新树三个 final 都通过；总控 10 条变异抓到 9 条，存活的是 SPEC 没要求测的预算用尽分支；
  - 联接合成用例 `scripts/acceptance/w4-g2-controller-cases.rs` 通过；
  - 真实冒烟的占用提示显示 Chrome、Edge；
  - 审查只有低级观察，记在清单 `carryOverToFinishing`。
- **G3**：
  - 第一轮发补单 01：暂停时的连接提示切换页面后退回兜底句，而测试注入的正是兜底句，所以没测出来。
  - 第二轮通过。总控首版 nc3 与 x2 只被第 448 行的等待超时挡住，没有带标记的断言，检查器不认，换了一条带标记的 nc3 才过。第 448 行改成带标记的断言，留给标志小票。

### 3.2 标志

- 用户说水滴“像交水电费”。先后看了彩色方案（水波 W、涟漪等），又试了黑白，用户选了黑白方案里的“冰山”原版。
- 总控之后做的改稿（水下改圆润、放进圆框里用深色水与白冰）用户不要，**以原版为准**。
- 已写进设计说明第 10 节，内容包括：
  - 几何以 `brand/water-mark.svg` 为准，界面里只用墨色；
  - 两道切面是真正的镂空；
  - 用在侧栏 30px、关于页 42px、空状态 36px；
  - 应用图标见 `brand/water-app-icon.svg`；
  - 雪碧图代码；
  - “体检”导航的水滴也要换成细线图标，先给用户看截图。
- `brand/` 里有真实首页预览与 3 倍放大图。

### 3.3 G1 第一轮验收（详见[收单验收](acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)）

- **通过的部分**：机械检查、两个 final、总控负控都通过。总控合成用例 `scripts/acceptance/w4-g1-controller-cases.rs` 6 项通过：
  - 祖先别名保护；
  - 组合删除（长路径、只读、联接出入、硬链接）；
  - 深层自定义标签；
  - 经祖先联接的路径；
  - 长条目路径；
  - 目录符号链接。
- **审查经总控核实的问题**：
  - **高级**：删除链接前不复核 FileId 与标签；
  - **中级**：
    - 身份不从条目句柄比对；
    - 枚举把错误当结束（会误报已删除）；
    - 残余按 ASCII 名字找；
    - 目录变了不停止本项；
  - **低级**：其中快照查找是平方复杂度，M2 清十万级文件的 `target` 会卡住。
- **补单**：[补单 01](dispatch/tickets/WATER-W4-G1-ADDENDUM-01-20261027.md) 共 11 条，另加 3 项断言。它放宽了 SPEC 第 4 节第 2 步第 5 条：允许每步从盘根重新逐级打开，但每步都要从自己的条目句柄核对 FileId。

### 3.4 推送问题与新规矩

- **起因**：10-26 夜里的 `push --all` 把 G1 执行者当时的提交 `854bdeb9` 推了上去；执行者之后在本地 amend 成 `bdd89bc8`，两个远端都拒收这个分支。
- **用户的决定**：“后续的单让 worker 不能推远端仓库，其他的你自己定吧。”
- **总控的处理**：
  - `CONTROLLER-WORKFLOW` 第 5 节写明：不 push 任何远端、不添加或修改远端与 git 配置、不 amend、rebase、reset、squash，只新增提交；
  - 第 3 节加了第 9 条：每张票（含补单）的边界一节都要写这条；
  - AGENTS.md、第 5 份交接、G1 补单 01 都已补上；
  - 远端分支由用户用 `--force-with-lease` 修好。

## 4. G1 补单 01 怎么验收（第二轮）

验收工具已备好，在 `.local/w4-accept2/`，在主检出根目录执行：

1. **审计**：
   ```bash
   WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave4/manifest.json node scripts/acceptance/w2-receipt-audit.mjs WATER-W4-G1
   ```
   另外核对：`b593f0be` 是祖先（没有改写历史），实现之后只有回执与证据。
2. **建树**：
   ```bash
   git worktree add -b controller/accept2-w4-g1 .worktrees/accept2-w4-g1 <交回 HEAD>
   ```
   ```bash
   node .local/w4-accept2/make-manifest.mjs '{"g1":"<交回 HEAD>"}'
   ```
   `make-manifest` 会与已有的 g3 条目合并。
3. **重跑**：`.local/w4-accept2/run.sh g1 check:final`；`test --final` 在负控之后由 `controls.mjs` 自己跑。
4. **总控负控**：
   - `.local/w4-accept2/mutations.json` 里的 `g1` 是第一轮的清单。补单改了代码，**锚点要逐条重核**（`controls.mjs` 遇到不唯一的锚点会停）。
   - nc1～nc3 的位置要与执行者这一轮的不同；可以新增针对补单第 1、3、4、5、7 条的变异。
   - `controls.mjs` 已支持 `check` 模式（用于“把 `std::fs` 加回来”），Rust 失败判定对 g1、g2 都生效。
5. **合成用例**：
   - `bash .local/w4-accept2/g1-cases.sh <日志名>` 跑总控用例，用完自动恢复 `Cargo.toml`；
   - `g1-cases-mutated.sh` 用于在某个变异下证明用例有效；
   - **另加一个十万文件的计时用例**（补单第 7 条），确认删除不再是平方复杂度。
6. **独立审查**：一个只读审查代理，只给代码、SPEC 与补单，不给结论。逐条核对补单 1～11，重点：
   - 链接删除前从句柄复核标签与 FileId；
   - 身份从句柄比对；
   - 枚举只认错误 18 为结束，其它错误按补单第 3 条处理；
   - 残余按句柄统计，残余未知绝不报 `deleted`；
   - 目录变了停止本项；
   - 新出现的项不计失败；
   - unsafe 的边界检查。
7. **通过后**：
   - 以 `--no-ff` 合入；
   - 台账写进清单 `controllerReview2`，并在 G1 收单验收报告后追加“第二轮”一节；
   - 证据归档到 `docs/acceptance/wave4/controller/accept2-20261027/g1/`（`run.sh g1 archive` 后复制并逐字节比对），被忽略的日志要 `git add -f`。

## 5. 之后

1. **主线整合检查**（G1 合入后）：
   - 四个包的测试全跑一遍：D、服务、宿主、界面单元与浏览器；
   - G2 的清理测试要在新 D 上再跑一次；
   - 然后做一次整机窗口检查。**会弹窗，开跑前先告诉用户。**
2. **标志小票**（界面票，单独列出，提示选模型）：
   - 先给用户看“体检”导航四个候选的真实截图：脉搏、扫描框、仪表、放大镜。
     - 用 `node scripts/design/preview-brand-nav.cjs <总控树> <候选>` 改总控树，再在那棵树里用 `WATER_W2_SHOTS_DIR=<树>/.local/<目录>` 跑浏览器测试，最后 `git checkout -- apps/water/ui`。
     - 截图目录必须在该树的 `.local` 里，测试会检查。
   - 用户选定后写票，内容：
     - 侧栏、关于页、空状态三处换冰山（照设计说明第 10 节的雪碧图代码）；
     - “体检”导航图标；
     - 宿主应用图标：由 `brand/water-app-icon.svg` 导出 16、24、32、48、256 多尺寸，生成 `icon.ico`；
     - 把 `browser.test.mjs` 第 448 行的等待改成带 `UI_NOTICE_SCOPE` 标记的断言；
     - 票面写明不 push、不改写提交。
   - 它会同时动 `apps/water/ui` 与 `apps/water/host/icons`，与宿主收尾票的文件要错开，或者串行。
3. **宿主收尾票**：F3 的 4 条低级观察、WIRING 第 7 节的已知限制、日常用的 release 构建（见第 5 份第 6 节）。
4. **M2**：打开清理开关，做自清理里程碑，清理按钮由用户本人按。

## 6. 硬规矩（在第 5 份第 7 节之外新增）

- 每张票（含补单）的边界一节写明：执行者不 push、不改写已有提交（不 amend、rebase、reset、squash）。
- 标志以设计说明第 10 节为准。总控若有改稿，只能作为选项放在用户的选择旁边，不得替换用户的选择。
- 给用户的命令里，提交号一律先查出完整值。

## 7. 这一段新踩的坑

- **Bash 的 `cd` 会保留**：一旦 `cd` 进执行者树，会话的工作目录就变成那里。每条命令以 `cd /f/new/smaltalk/water &&` 开头，或者用子 shell。
- **bash 里没有 `rustup`**：用 `"$(cygpath "$USERPROFILE")/.cargo/bin/rustup.exe"`。检查入口用的是 `.local/w2-*`（checkup 入口）或 `.local/w3-*`（desktop 入口）下的 cargo home 与 target。
- **浏览器检查不要和 cargo 测试同时跑**：服务测试的 50 ms 返回预算断言会抖。
- **只被等待超时挡住的变异不算负控证据**：要选会被带标记的断言抓到的变异。
- **内置浏览器不能截本地文件**：设计稿截图用 headless Chrome，例如 `chrome.exe --headless=new --user-data-dir=<草稿目录> --screenshot=<png> file:///...`，再用 Read 看图。
- **界面预览**：在总控验收树里临时改，浏览器测试 5 个都过、截图在树的 `.local` 里，然后 `git checkout -- apps/water/ui` 恢复。不要在执行者树或主检出里改。
- **`&&` 链里前一步失败时，后面的 `git checkout -- <目录>` 会在当前目录（可能是主检出）执行**：恢复命令要放在 `( cd <树> && ... )` 子 shell 里。
- **强制推送会被自动模式拦下**：把带完整提交号的命令给用户自己跑。

## 8. 待办

1. 用户转告 G1 回执后按第 4 节验收、合入（回执已在执行者树里）。
2. 主线整合检查（会弹窗，先告诉用户）。
3. 标志小票：先给截图，再写票。
4. 宿主收尾票；然后 M2。
5. 第一波遗留未验收项保持原状：真实用户 scope 的自然同意鉴真、生产竞态、macOS。
6. 共享 Vault 还没有 Water 项目页；按项目规则由 Keeper 从交接报告与 ADR 摄入。

## 9. 接手粘贴语

```text
交接里写了（F:/new/smaltalk/water/docs/CONTROLLER-HANDOFF-20261027-6.md）：读交接报告，准备接手 Water 总控。
```
