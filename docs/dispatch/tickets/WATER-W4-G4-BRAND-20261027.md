# WATER-W4-G4：冰山标志与“体检”导航图标

2026-10-27，正式票，总控（Claude）。以 [第四波 manifest](../wave4/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**界面票：可以在新对话里执行，交给前端能力强的模型。** 本票与 G1 补单 02 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G4-BRAND-20261027.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w4-g4 / worker/water-w4-g4 |
| 精确首次 HEAD | e5b90db1b9a660b97d337c8b2d8b336335f98487，必须干净；`apps/water/ui` 是 G3 验收后的界面 |
| SPEC | 设计说明第 10 节：F:/new/smaltalk/water/docs/design/water-ui-v1/DESIGN.md |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/UI.md；F:/new/smaltalk/water/contracts/hardening-v1/UI-POLISH.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w4-g4/docs/dispatch/reports/WATER-W4-G4-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w4-g4/docs/acceptance/wave4/g4/ |
| 门 | 轻门：3 条负控 + 浏览器测试与截图 |

规则写于本票之前，其中按票划分目录的表格不含本票；本票的范围以下面的白名单为准。规则里“`apps/water/host/` 属于 F3”已过时：F3 已合入，本票只允许改宿主的一个图标文件。

先读规则与设计说明第 10 节（标志、导航图标、应用图标都在那里，含 symbol 原文与尺寸），再读：
- `apps/water/ui/index.html`：sprite；
- `app.mjs`：侧栏品牌与导航；
- `views/about.mjs`、`views/common.mjs`：关于页品牌卡、空状态；
- `styles/app.css`；
- `tests/browser.test.mjs`：假宿主、截图与等待的写法。

用户已看过真实截图并选定：标志是冰山原版，“体检”导航是脉搏线。效果参考 `docs/design/water-ui-v1/brand/preview-home-pulse-1240x820.png`。

## 要做的

1. **冰山标志换掉三处水滴**（第 10 节表格）：
   - 侧栏品牌：30×30；
   - 关于与隐私页的品牌卡：42×42；
   - 空状态：36×36。
   - 三处都用墨色 `--w-ink`，不用强调蓝。改 `styles/app.css` 里对应的三条规则。
   - sprite 里加 `i-berg`，**逐字节照抄**第 10 节代码块，用 `icon('berg')` 引用。
2. **“体检”导航换成脉搏线**：
   - sprite 里加 `i-pulse`，逐字节照抄第 10 节代码块；
   - 导航“体检”一项用 `icon('pulse')`；
   - 样式不另加，沿用全局 `.i` 与 `.nav a.on .i`，与其它四个导航一致。
3. **水滴退役**：界面里不再引用水滴，把 `i-drop` 从 sprite 删掉。
4. **宿主应用图标**：把 `docs/design/water-ui-v1/brand/water-app-icon.ico` 原样复制为 `apps/water/host/icons/icon.ico`，逐字节相同。
   - 不要另行导出、缩放或修图，也不要改宿主的任何其它文件。
   - 不需要编译宿主，总控验收时编译。
5. **测试第 448 行改为带标记的断言**：
   - 现在是 `await browser.waitFor('document.querySelector("#notice").hidden');`。若提示条恢复后不隐藏，它只会以 “Browser condition timed out” 超时，没有标记。
   - 改为有限次轮询，轮询本身不抛错，最后用带 `UI_NOTICE_SCOPE` 的 `assert` 判断提示条已隐藏。
   - 检查器认定负控时，输出里出现 “timed out” 就不算数。

**不变**：
- IPC 调用、`ui-fixtures.json`、`styles/tokens.css`（仍须与设计 tokens 逐字节相同）；
- UI-POLISH 第 1 节表格里的 11 处文字，一个字都不能改；
- G3 已验收的行为：提示条范围、折行、操作坞；
- 标志与图标的几何：只照抄，不改形、不加元素；
- 水位瓶、水波进度环、扫描时上涨的水；
- 视觉语言：白色磨砂、纯色强调、无渐变光晕、无 emoji。

**不改**：白名单之外的任何文件，包括设计说明、`brand/`、`mockup.html`、`previews/`、契约、检查器、台账。

## 白名单

- `apps/water/ui/` 下的文件（不得新增 npm 文件）
- `apps/water/host/icons/icon.ico`（只这一个文件）
- `docs/dispatch/reports/WATER-W4-G4-REPORT.md`
- `docs/acceptance/wave4/g4/` 下 `--mode archive` 生成的证据（含截图）

## 唯一测试

- `apps/water/ui/tests/unit.test.mjs`：精确 3 个，不变。
- `apps/water/ui/tests/browser.test.mjs`：精确 5 个，名字不变（`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`、`ui_m1_polish`）。新断言加在已有测试里，建议放进 `ui_m1_polish`，失败信息带标记：

| 标记 | 新增断言 |
|---|---|
| `UI_BRAND_MARK` | ① `index.html` 源文件含 `i-berg` 的原文：测试从 `DESIGN.md` 里取 `<symbol id="i-berg"` 到其 `</symbol>` 的原文比对，不要在测试里另抄一份；② 页面 sprite 里没有 `#i-drop`，首页、关于页、空状态页也没有任何 `use` 引用它；③ 侧栏品牌、关于页品牌卡、空状态三处的图标引用 `#i-berg`，渲染尺寸分别为 30×30、42×42、36×36，计算颜色等于 `--w-ink`（rgb(16, 38, 63)） |
| `UI_NAV_PULSE` | ① `index.html` 源文件含 `i-pulse` 的原文（同样从 `DESIGN.md` 取）；② `[data-key=nav-home]` 的图标引用 `#i-pulse`，18×18，描边 1.5px、无填充；③ 选中与未选中时的颜色分别等于其它导航选中、未选中时的图标颜色；④ 其它四个导航仍是 trend、history、folder、shield |
| `UI_NOTICE_SCOPE` | 上面第 5 条：重连恢复后提示条隐藏，用带标记的断言判定 |

必需截图是 G3 的 16 张，加空状态 `trends-empty-1240x820.png`，共 17 张。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G4 --mode baseline
```

1. 反复使用 `--mode check`、`--mode test` 与 `--mode browser`。
2. 三条负控，都由检查器跑浏览器测试证明。每条只改 `apps/water/ui` 生产代码里真正被调用的一处（不改测试），失败信息必须含目标标记，输出里不能有超时；然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`：

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 三处标志之一的尺寸或颜色退回原样 | `UI_BRAND_MARK` |
| nc2 | “体检”导航不再用脉搏线 | `UI_NAV_PULSE` |
| nc3 | 重连恢复后提示条不再隐藏 | `UI_NOTICE_SCOPE` |

提交干净实现后依次运行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G4 --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G4 --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G4 --mode browser --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G4 --mode archive
```

`archive` 会把通过的浏览器运行截图按哈希复制进证据目录。**逐张看图**，在回执里写每张看到了什么。重点看：首页侧栏、关于页品牌卡、空状态页，并与 `brand/preview-home-pulse-1240x820.png` 对照。

## 预算与边界

- 一个私有 headless Chrome；原生窗口 0、选择框 0。
- 不读真实位置、不联网、不下载字体或图标。
- 不 merge、不 rebase，不改主线台账。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W4-G4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g4/docs/dispatch/reports/WATER-W4-G4-REPORT.md
```

回执要写：
- 实际模型；
- 实现提交 SHA；
- 上面 5 条逐条怎么做的，确认 11 处文字没变、`icon.ico` 与设计导出件的 sha256 相同；
- 每个检查命令与结果；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 逐张截图写看到了什么；
- 没做或没验证的事。

受阻则同一路径写“WATER-W4-G4 任务受阻”，写清具体冲突与最小补充需求，不要自行变通。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
