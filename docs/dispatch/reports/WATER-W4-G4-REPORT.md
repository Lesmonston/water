WATER-W4-G4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g4/docs/dispatch/reports/WATER-W4-G4-REPORT.md

# WATER-W4-G4 回执：冰山标志与“体检”导航图标

2026-10-27，执行者。

| 项 | 值 |
|---|---|
| 实际模型 | Claude Opus 5.5（`claude-opus-5-5`），Claude Code |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w4-g4 / worker/water-w4-g4 |
| 首次 HEAD | e5b90db1b9a660b97d337c8b2d8b336335f98487（干净） |
| 实现提交 | **096275c6c0a833bde18c95d0aef8ffdd9870f94e** |
| 后续提交 | 只含本回执与 `docs/acceptance/wave4/g4/` 证据 |

没有 push、merge、rebase，没有改写已有提交，没有改 git 远端或配置。

## 1. 五条逐条

### 1.1 冰山标志换掉三处水滴

- `index.html` 的 sprite 里加了 `i-berg`。它不是手抄的：用脚本从 `DESIGN.md` 截取 `<symbol id="i-berg"` 到其 `</symbol>` 的原文，替换掉原来 `i-drop` 所在的位置，逐字节相同（测试 `UI_BRAND_MARK` ① 也按同样方式从 DESIGN.md 取原文比对）。mask id `berg-facets` 在文档内只出现一次。
- 三处引用都改为 `icon('berg')`：
  - 侧栏品牌：`app.mjs` 的 `sidebar()`；
  - 关于页品牌卡：`views/about.mjs`；
  - 空状态：`views/common.mjs` 的 `empty()`，增长趋势页和清理记录页的空状态都用它。
- `styles/app.css` 改了对应的三条规则，其它规则没动：
  - `.brand > .i`：30×34、强调蓝，改为 **30×30**、`var(--w-ink)`；
  - `.about-brand > .i`：**42×42**，颜色由强调蓝改为 `var(--w-ink)`；
  - `.empty > .i`：**36×36**，颜色由强调蓝改为 `var(--w-ink)`。
- 浏览器实测三处都引用 `#i-berg`，尺寸分别为 30×30、42×42、36×36，计算颜色都是 `rgb(16, 38, 63)`。

### 1.2 “体检”导航换成脉搏线

- sprite 里加了 `i-pulse`，同样从 DESIGN.md 截取原文，逐字节相同。
- `app.mjs` 导航表里 `['home', '体检', 'drop']` 改为 `'pulse'`。
- 样式没有另加，沿用全局 `.i` 和 `.nav a.on .i`。实测图标 18×18、描边 `1.5px`、填充 `none`。选中时的颜色与“增长趋势”选中时相同，未选中时与其它四项相同。

### 1.3 水滴退役

- `i-drop` 已从 sprite 删除，界面源码里不再有 `'drop'` 图标引用。
- **票面没列出的一处**：`views/history.mjs` 第 12 行，清理记录里“体检记录”这一行也用了水滴（清理行用 `check`）。票面要求“界面里不再引用水滴”，第 10 节也写了“界面里不再有任何地方引用水滴”。如果只删 symbol 不改这里，这一行会显示空白图标，所以我改成了 `pulse`，也就是“体检”导航的同一个图标，语义一致。这是本票唯一超出票面字面列举的改动，仍在白名单 `apps/water/ui/` 内。总控若希望用别的图标，只需改这一个词。

### 1.4 宿主应用图标

- 用 `cp` 把 `docs/design/water-ui-v1/brand/water-app-icon.ico` 原样复制为 `apps/water/host/icons/icon.ico`，没有另行导出、缩放或修图。宿主的其它文件没动，也没有编译宿主。
- sha256 三处一致，都是 `a90894b1f7d7f44fe41e7c65541d650e6e04e4af911e6d37e058506e8ea268e2`：
  - 设计导出件；
  - 工作树里的 `icon.ico`；
  - 提交里的 blob（`git show HEAD:apps/water/host/icons/icon.ico | sha256sum`）。
- git 把它识别为二进制（`-text`），不会做换行转换。

### 1.5 测试原第 448 行改为带标记的断言

- 原来是 `await browser.waitFor('document.querySelector("#notice").hidden');`。
- 现在改为有限次轮询：最多 200 次 `evaluate`、每次间隔 25 ms，读 `{hidden, text}`，轮询本身不抛错。
- 之后用 `assert(recovered.hidden, 'UI_NOTICE_SCOPE: the notice hides once reconnecting recovers: …')` 判定，失败信息里带提示条当时的文字。
- nc3 证明了这一点：失败输出里是这条带标记的断言，没有 “timed out”。

### 新增断言（都放在 `ui_m1_polish` 开头，失败信息带标记）

| 标记 | 内容 |
|---|---|
| `UI_BRAND_MARK` | ① 从 DESIGN.md 取 `i-berg` 原文，`index.html` 源文件必须包含；② 首页、关于页、增长趋势空状态、清理记录空状态四处，文档里没有 `#i-drop`，也没有任何 `use` 引用它；③ 侧栏品牌、关于页品牌卡和两处空状态引用 `#i-berg`，渲染为 30×30、42×42、36×36，计算颜色为 `rgb(16, 38, 63)` |
| `UI_NAV_PULSE` | ① 从 DESIGN.md 取 `i-pulse` 原文，`index.html` 源文件必须包含；② `nav-home` 引用 `#i-pulse`，18×18，描边 `1.5px`，填充 `none`，处于选中状态；③ 首页上它的选中色与“增长趋势”页上 `nav-trends` 的选中色相同；“增长趋势”页上它的未选中色与其它四项在首页的未选中色（四项一致）相同；选中色与未选中色不同；④ 其它四项依次是 trend、history、folder、shield |
| `UI_NOTICE_SCOPE` | 见 1.5 |

### 不变项核对

- **11 处文字**：逐条比较 e5b90db1 与 HEAD 下 `apps/water/ui` 非测试文件里的出现次数，11 条全部相同：开始体检 2/2、清理所选 2/2、增长趋势 2/2、清理记录 4/4、扫描位置 3/3，其余 6 条各 1/1。实现提交的生产代码 diff 只有图标名和三条 CSS 规则。
- **IPC、ui-fixtures.json、tokens.css**：都没改。检查器的冻结文件哈希核对和 tokens 逐字节核对都通过了。
- **G3 已验收的行为**：提示条范围、折行、操作坞的断言原样保留，全部通过。
- **其它视觉**：水位瓶、水波进度环、扫描时上涨的水不变。没有加渐变、光晕或 emoji。
- **白名单外的文件**：一个都没改。

## 2. 检查命令与结果

都在工作树根目录运行 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G4 --mode …`。

| 模式 | 时间（receipt 前缀） | 结果 |
|---|---|---|
| baseline | 2026-10-27T06-33-21.212Z-8100 | passed |
| check | 06-38-54.570Z-39208 | passed |
| test | 06-39-07.496Z-19940 | passed（3/3） |
| browser | 06-39-15.018Z-13504 | passed（5/5） |
| red-nc1 → test | 06-41-59.390Z-40248 → 06-42-52.039Z-41904 | 目标红 → passed |
| red-nc2 → test | 06-43-14.821Z-6604 → 06-44-21.611Z-20824 | 目标红 → passed |
| red-nc3 → test | 06-44-47.489Z-12252 → 06-46-02.732Z-16656 | 目标红 → passed |
| check --final | 06-47-38.220Z-18308 | passed |
| test --final | 06-47-49.324Z-17572 | passed（3/3；proofAudit 认可 nc1–nc3 的红与恢复） |
| browser --final | 06-47-57.497Z-38760 | **failed，见下** |
| browser --final（重跑一次） | 06-49-49.567Z-10220 | passed（5/5，截图 23 张，含必需的 17 张） |
| archive | 06-51-20.238Z-11000 | passed（407 个文件，26,115,141 字节） |

**第一次 browser --final 失败，如实说明**：
- 前两个测试通过。第 3 个 `ui_clean_done_and_pages` 在第 243 行（G3 以前就有的 `waitText('正在重新连接 Water 服务…')`）报 `Browser condition timed out`，之后第 4、5 个测试和 after 钩子的每次 CDP 调用（`Page.navigate`、`Emulation.setEmulatedMedia`、`Runtime.evaluate`）都在 10 秒后超时。也就是说，私有 Chrome 在那一刻失去了响应，不是哪条断言失败。
- 同一份字节此前已经完整通过 1 次 browser，3 次负控里前 4 个测试也都通过。失败点不在本票改动的代码路径上。
- 失败后我确认没有残留的 headless Chrome 进程（当时 CPU 34%），在同一提交、干净树上原样重跑了一次，通过。没有再重跑。
- 当时 G1 补单 02 在同机并行，推测是机器繁忙导致浏览器卡住，但没有进一步证实。
- 失败的回执与日志一并归档，在 `receipts/2026-10-27T06-47-57.497Z-38760-*`。

另外，`.local/checks/WATER-W4-G4/` 里原有一份总控 preflight 的 baseline 回执（06-23-49.855Z-36372），archive 把它也复制进了证据目录，我没有删。

## 3. 三条负控

每条只改了 `apps/water/ui` 生产代码里真正被调用的一处，没改测试。改动用 node 精确替换完成，保留原换行。跑完立即 `git checkout -- <文件>`，再跑 `--mode test` 变绿。三条的失败输出里都没有 “timed out”（日志里 `grep -ci 'timed out'` 为 0），结果都是 pass 4 / fail 1，失败的只有 `ui_m1_polish`。

| 负控 | 改了哪一处 | 失败信息 | 恢复后 |
|---|---|---|---|
| nc1 `UI_BRAND_MARK` | `styles/app.css` 中 `.brand > .i` 的颜色由 `var(--w-ink)` 退回 `var(--w-accent)` | `UI_BRAND_MARK: sidebar brand is the ink iceberg at 30x30`（actual `color: 'rgb(31, 111, 209)'`，expected `'rgb(16, 38, 63)'`） | `git checkout`；app.css sha256 `ba80a567193148c2c89e4da3f3a68d57bd4a618d83b0af56505ccdfa8c1c0dcc`；test passed |
| nc2 `UI_NAV_PULSE` | `app.mjs` 导航表 `['home', '体检', 'pulse']` 改为 `'trend'` | `UI_NAV_PULSE: the checkup nav uses the 18x18 pulse line with a 1.5px stroke and no fill`（actual `href: '#i-trend'`，expected `'#i-pulse'`） | `git checkout`；app.mjs sha256 `275f155c97c318bc43e0532e1f762e806037152a100f796a0e6d48fd3c536ce3`；test passed |
| nc3 `UI_NOTICE_SCOPE` | `app.mjs` 的 `routeChanged()` 中 `if (!state.pollPaused) state.error = '';` 改为 `if (!state.pollPaused && !state.reconnecting) state.error = '';`：重连期间切页不再清掉旧命令错误，恢复后提示条仍显示 | `UI_NOTICE_SCOPE: the notice hides once reconnecting recovers: {"hidden":false,"text":"所选内容无法清理，请重新选择。关闭提示"}` | `git checkout`；app.mjs sha256 `275f155c…36ce3`（同上）；test passed |

几个哈希（检查器 `sourceState`）：
- 恢复后的生产代码哈希：`ec0a4443fdfd66613f824e1a66215d8974ec5f3e734711502608b7c643a74f37`；
- 三条负控的生产代码哈希：`cc1ac945…`、`4bcb1a99…`、`2a9db965…`，都与恢复后的不同；
- 测试哈希始终是 `f028b5aa33089889abb7b18f1146427a935a6ae8bf90e019f63041882fb8a9a3`。

nc2 选择改成 `trend`，没有退回 `drop`，原因是：退回 `drop` 会先被 `UI_BRAND_MARK` ② 的“不得引用 `#i-drop`”拦下，失败标记就不是目标标记了。

## 4. 逐张截图

证据目录：`docs/acceptance/wave4/g4/screenshots/2026-10-27T06-49-49.567Z-10220/`（final 通过的那次）。我逐张看过。另一组 `06-39-15.018Z-13504` 是同一份字节的非 final 运行，内容相同。

1. **home-1240x820**：
   - 侧栏左上是墨色冰山：水面以上一个小尖，一道横贯的水线，水下一大块，块内两道切面镂空透出底色；右侧“Water / 磁盘体检”不变。
   - 冰山比原来的水滴略矮，与两行字垂直居中。
   - “体检”导航是蓝色脉搏线，选中块是白色小玻璃；其余四项为灰色细线图标。
   - 与 `brand/preview-home-pulse-1240x820.png` 对照：侧栏、标志、导航、系统盘卡、三条小盘、“开始体检”球形按钮、底部文字的位置和观感一致。
2. **scan-1240x820**：
   - 侧栏冰山与脉搏线同上；
   - 中间是水波进度环（62%、27.5 GB，浅蓝水面）；
   - 右侧步骤列表，“停止扫描”按钮。
   - 水的视觉不变。
3. **results-1240x820**：
   - 可放心清理 31.2 GB，右侧谱条卡，橙色泄漏提示；
   - 筛选与排序，AI 编程工具分组；
   - 底部悬浮操作坞（已选 13 组 / 31.2 GB / 重新扫描 / 清理所选）。
   - 侧栏标志、导航正常。
4. **results-1040x720**：
   - 同上的窄窗版，无横向溢出；
   - 侧栏冰山与脉搏线清晰，底部说明正常折行。
5. **detail-1240x820**：
   - 右侧详情抽屉“Codex 插件市场升级残留”；
   - 背景（含侧栏冰山）被磨砂模糊，正常。
6. **confirm-1240x820**：
   - 居中确认框“永久删除 31.2 GB?”，红色危险提示与按钮；
   - 背景模糊。
7. **cleaning-1240x820**：
   - “正在清理”，水满的进度环（4.2 GB 已释放），右侧当前组卡与“停止”；
   - 侧栏“体检”仍选中，脉搏线为蓝色。
8. **done-1240x820**：
   - 30.7 GB 已释放，C:/F: 两个水位瓶带虚线前水位；
   - 下方为逐组结果，Chrome 一行是橙色部分完成。
9. **trends-1240x820**：
   - “增长趋势”选中，图标变蓝；“体检”的脉搏线变为与其它未选中项相同的灰色。
   - 曲线图、增长最多、疑似泄漏卡正常。
10. **history-1240x820**：
    - 三行：清理完成（勾）、两行体检记录。
    - 体检记录现在用脉搏线图标（见 1.3），与导航一致、墨色细线，没有空白图标。
11. **locations-1240x820**：
    - 七个分类开关（“崩溃与日志”关闭），自定义文件夹 `F:\new\smaltalk\water`；
    - 侧栏正常。
12. **about-1240x820**：
    - 品牌卡左侧是 42×42 墨色冰山，两道切面镂空清晰，右侧“Water / 版本 0.1.0”；
    - 下面是四张隐私卡；
    - “关于与隐私”选中（盾牌变蓝），“体检”的脉搏线为灰色。
13. **results-bottom-1240x820**：
    - 长结果滚到底，最后一行“未识别的临时目录”与操作坞之间有明显空隙；
    - 操作坞显示已选 39 组 / 93.7 GB。
14. **results-bottom-1040x720**：同上的窄窗版，最后一行与操作坞之间仍有空隙。
15. **notice-results-1240x820**：
    - 结果页顶部提示条“这一版只做体检，清理功能会在下一版开放。”与“关闭提示”；
    - 提示条悬浮在筛选栏上方，可见。
16. **notice-trends-1240x820**：
    - 切到增长趋势后没有提示条，旧提示已清掉；
    - 页面与 trends-1240x820 一致。
17. **trends-empty-1240x820**：
    - 空状态卡居中是 36×36 墨色冰山，切面镂空可见；
    - 下方“再体检一次就能看到变化”和说明。
    - 原来这里是蓝色水滴，现在与标题同为墨色。

其余非必需截图也看过，侧栏都是冰山和脉搏线，没有异常：
- loading、unavailable：这两种状态也走 `empty()`，卡片中央同样是 36×36 墨色冰山（“正在读取…”/“无法连接 Water 服务”）；
- home-last-scan、busy：首页带上次体检，薄荷色可释放层的水位瓶不变；
- stale：结果页提示条“结果已过期…”，“清理所选”置灰；
- reconnecting：清理中暂停，提示条带“重新连接”按钮。

## 5. 没做或没验证的事

- **没有编译宿主**，也没在真实 Tauri 窗口里看过新的 `icon.ico` 效果，按票面留给总控验收时编译。
- **没有在 WebView2 里实测**：只在私有 headless Chrome 中渲染过。mask 镂空在 Chrome 里正常；WebView2 用的是同一个 Chromium 内核，但没有实测。
- **第一次 browser --final 失败的根因**没有深究，只在同字节、干净树上重跑了一次并通过（见第 2 节）。
- **`history.mjs` 体检记录行的图标**选了脉搏线，这是票面没写明的地方，需要总控确认（见 1.3）。
- 我的断言只覆盖 DESIGN 第 10 节点名的位置。冰山与脉搏线的几何是照抄的，我没有对图形本身做像素比对，只用了源文件逐字节包含 DESIGN 原文这一条。
