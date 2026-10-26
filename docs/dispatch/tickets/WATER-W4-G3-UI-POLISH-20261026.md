# WATER-W4-G3：界面修补（`apps/water/ui` 第 2 版）

2026-10-26，正式票，总控（Claude）。以 [第四波 manifest](../wave4/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**界面票：可以在新对话里执行，建议交给前端布局能力强的模型。** 本票与 F3、G1、G2 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G3-UI-POLISH-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w4-g3 / worker/water-w4-g3 |
| 精确首次 HEAD | 0ca42f8e8038a5a7816802c5a7f175a966b0625c（标签 water-w4-hardening-base-20261026），必须干净；`apps/water/ui` 是已验收的第二波界面 |
| SPEC | F:/new/smaltalk/water/contracts/hardening-v1/UI-POLISH.md |
| 被覆盖的原契约 | F:/new/smaltalk/water/contracts/checkup-v1/UI.md；设计说明 F:/new/smaltalk/water/docs/design/water-ui-v1/DESIGN.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md |
| 计划 | F:/new/smaltalk/water/docs/dispatch/wave4/PLAN.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w4-g3/docs/dispatch/reports/WATER-W4-G3-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w4-g3/docs/acceptance/wave4/g3/ |
| 门 | 轻门：3 条负控 + 浏览器测试与截图 |

先读规则、计划、SPEC，再读 UI 契约与设计说明，然后读已验收的代码：
- `apps/water/ui/app.mjs`：路由与提示条；
- `views/results.mjs`：结果页与操作坞；
- `styles/app.css`；
- `tests/browser.test.mjs`：假宿主与截图写法都在这里。

## 本票要点

SPEC 第 2～4 节：
1. **错误提示只属于当前页面**（第 3 节）：
   - 路由切换时清掉错误提示，回到结果页也不重新出现；
   - “正在重新连接…”与“未能读取任务进度…”这类连接提示照旧保留。
2. **两段说明不留短孤行**（第 4 节）：侧栏底部说明与首页系统盘说明，两种尺寸下每行至少 4 个字符，文字内容不变。总控实测 `text-wrap: balance` 可行，`pretty` 对中文无效。
3. **操作坞间距只做回归锁定**（第 2 节）：现状已满足，不要改操作坞；测试量出滚到底时最后一行与操作坞至少隔 16 px。

**不变**：
- IPC 调用、`ui-fixtures.json`、`styles/tokens.css`（仍须与设计 tokens 逐字节相同）；
- 视觉语言：白色磨砂、纯色强调、无渐变光晕、无 emoji；
- **SPEC 第 1 节表格里的 11 处文字**：F3 的整机检查按它们找控件，一个字都不能改。

**不改**：`apps/water/ui/` 之外的任何文件，包括 `scripts/acceptance/native-vw-private-browser.mjs`、契约、检查器、台账。

## 白名单

- `apps/water/ui/` 下的文件（不得新增 npm 文件）
- `docs/dispatch/reports/WATER-W4-G3-REPORT.md`
- `docs/acceptance/wave4/g3/` 下 `--mode archive` 生成的证据（含截图）

## 唯一测试

- `apps/water/ui/tests/unit.test.mjs`：精确 3 个，不变。
- `apps/water/ui/tests/browser.test.mjs`：精确 5 个：
  - 原有 4 个：`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`；
  - 新增：`ui_m1_polish`，内容按 SPEC 第 5 节。

必需截图为原有 12 张，加 SPEC 第 5 节的 4 张：`results-bottom-1240x820.png`、`results-bottom-1040x720.png`、`notice-results-1240x820.png`、`notice-trends-1240x820.png`。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G3 --mode baseline
```

1. 反复使用 `--mode check`、`--mode test` 与 `--mode browser`。
2. 三条负控，每条只改生产代码里真正被调用的一处，失败信息必须含目标标记；然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`：

| 负控 | 让什么失效 | 标记 | 检查器跑哪组测试 |
|---|---|---|---|
| nc1 | 去掉 `model.mjs` 中“不可选组不能选中”的判断 | `UI_LEVEL_GUARD` | 单元测试 |
| nc2 | 去掉第 4 节的折行修复 | `UI_FOOTER_WRAP` | 浏览器测试 |
| nc3 | 路由切换时不再清掉错误提示 | `UI_NOTICE_SCOPE` | 浏览器测试 |

提交干净实现后依次运行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G3 --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G3 --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G3 --mode browser --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G3 --mode archive
```

`archive` 会把通过的浏览器运行截图按哈希复制进证据目录。**逐张看图**，在回执里写每张看到了什么，并与 F3 自测时的问题对照（操作坞、提示条、侧栏底部）。

## 预算与边界

- 一个私有 headless Chrome；原生窗口 0、选择框 0。
- 不读真实位置、不联网、不下载字体或图标。
- 不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W4-G3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g3/docs/dispatch/reports/WATER-W4-G3-REPORT.md
```

回执要写：
- 实际模型；
- 实现提交 SHA；
- 逐条对照 SPEC 第 1～5 节，特别确认第 1 节的 11 处文字没变；
- 每个检查命令与结果；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 逐张截图写看到了什么；
- 没做或没验证的事。

受阻则同一路径写“WATER-W4-G3 任务受阻”，写清具体冲突与最小补充需求，不要自行变通。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
