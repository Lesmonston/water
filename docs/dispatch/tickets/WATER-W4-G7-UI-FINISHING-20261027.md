# WATER-W4-G7：界面收尾（提示条范围与测试缺口）

2026-10-27，正式票，总控（Claude）。以 [第四波 manifest](../wave4/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**界面票：可以在新对话里执行，交给前端能力强的模型。** 本票与 G5（D）、G6（宿主）同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G7-UI-FINISHING-20261027.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w4-g7 / worker/water-w4-g7 |
| 精确首次 HEAD | 4f35c52f5abb3dee22583cc2c86b05da2fc2be93，必须干净；`apps/water/ui` 是 G4 验收合入后的界面 |
| SPEC | 本票“要做的”一节；仍然有效的是 F:/new/smaltalk/water/contracts/hardening-v1/UI-POLISH.md、F:/new/smaltalk/water/contracts/checkup-v1/UI.md、F:/new/smaltalk/water/docs/design/water-ui-v1/DESIGN.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w4-g7/docs/dispatch/reports/WATER-W4-G7-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w4-g7/docs/acceptance/wave4/g7/ |
| 门 | 轻门：3 条负控 + 浏览器测试与截图 |

规则写于本票之前，按票划分目录的表格不含本票；本票的范围以白名单为准，其余同 G3、G4 的界面条目。

背景：G3、G4 验收留下的几条，见清单里两票的 `carryOverLater`：
- [G3 收单验收](../../acceptance/wave4/controller/WATER-W4-G2G3-REVIEW-20261026.md)；
- [G4 收单验收](../../acceptance/wave4/controller/WATER-W4-G4-REVIEW-20261027.md)。

M2 要打开清理，清理过程中的提示条必须准确，所以一起收掉。

先读规则、UI-POLISH 第 1、3 节、设计说明第 10 节，再读：
- `apps/water/ui/app.mjs`：路由、提示条、`fault`、轮询与暂停；
- `tests/browser.test.mjs`：假宿主、`waitFor` 的用法，以及 G4 加的 `UI_BRAND_MARK`、`UI_NAV_PULSE`、`UI_NOTICE_SCOPE` 断言。

## 要做的

### 产品（`apps/water/ui` 生产代码）

1. **旧页面发出的命令，错误不落到新页面**：
   - 现在若一个命令在切页之前发出、在切页之后才失败（一次 IPC 往返之内），它的错误会出现在新页面的提示条上。
   - 改为：切页之后，之前发出的命令返回的错误不再写进提示条，也不改新页面的状态。
   - 连接类提示（“正在重新连接…”、暂停与“重新连接”按钮）不受影响，照旧跨页保留。
2. **暂停期间的命令错误不覆盖暂停原因**：
   - 现在暂停（显示“重新连接”按钮）期间若某个命令出错，它的错误会替换暂停原因，并且切页后仍留着。
   - 改为：暂停期间提示条始终显示暂停原因与“重新连接”按钮，命令错误不替换它，也不在恢复或切页后冒出来。

### 测试（`apps/water/ui/tests/browser.test.mjs`）

3. **渲染后的 sprite 里确实有这两个图标**：
   - 现在只检查 `index.html` 源文件含 `i-berg`、`i-pulse` 的原文；把 symbol 注释掉或移出 `#sprite`，图标会变空白，测试却通过。
   - 补断言：页面里 `#sprite symbol#i-berg` 与 `#sprite symbol#i-pulse` 都存在。
4. **有记录的清理记录列表**：
   - 在有记录的清理记录页上也检查没有任何 `use` 引用 `#i-drop`；
   - 断言“体检记录”行的图标引用 `#i-pulse`。
5. **四处只会超时、没有标记的等待**：等“正在重新连接 Water 服务…”消失或提示条隐藏的 `browser.waitFor`。
   - 在当前文件里大约是第 189、245、518、529 行，以内容为准。
   - 都改为有限次轮询，轮询本身不抛错，最后用带 `UI_NOTICE_SCOPE` 的断言判定，做法同 G4 改的那一处。
6. **“正在重新连接”的断言不依赖时序**：
   - 现在靠预置 12 次失败、在约 3 秒内用完之前完成断言。
   - 改为由假宿主控制：在测试明确放开之前一直返回失败，但不得超过让界面进入暂停的次数。
   - 假宿主只在测试文件里，生产代码不加测试开关。
7. **截图名字对上内容**：
   - 现在名为 `reconnecting-1240x820` 的截图拍的是暂停状态。改名为 `paused-1240x820`；
   - 另在“正在重新连接”提示出现时拍一张 `reconnecting-1240x820`。

新断言加在已有测试里，失败信息带标记：
- 第 1、2 条用新标记 `UI_COMMAND_SCOPE`，各至少一条断言，在真实页面切换下验证；
- 第 3、4 条用 `UI_BRAND_MARK`；
- 第 5、6 条用 `UI_NOTICE_SCOPE`。

**不变**：
- IPC 调用、`ui-fixtures.json`、`styles/tokens.css`；
- UI-POLISH 第 1 节的 11 处文字；
- G3、G4 已验收的行为与断言（可以改写第 5 条那几处等待，但判定条件不变）；
- 视觉。本票不改任何样式与图标。

## 白名单

- `apps/water/ui/` 下的文件（不得新增 npm 文件）
- `docs/dispatch/reports/WATER-W4-G7-REPORT.md`
- `docs/acceptance/wave4/g7/` 下 `--mode archive` 生成的证据（含截图）

## 唯一测试

- `unit.test.mjs`：精确 3 个，不变。
- `browser.test.mjs`：精确 5 个，名字不变（`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`、`ui_m1_polish`）。

必需截图：G4 的 17 张，加 `paused-1240x820.png` 与新的 `reconnecting-1240x820.png`，共 19 张。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G7 --mode baseline
```

1. 反复使用 `--mode check`、`--mode test` 与 `--mode browser`。
2. 三条负控，都由检查器跑浏览器测试证明。每条只改 `apps/water/ui` 生产代码里真正被调用的一处（不改测试），失败信息含目标标记、输出里不能有超时；然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`：

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 旧页面命令的错误又能落到新页面（第 1 条） | `UI_COMMAND_SCOPE` |
| nc2 | 重连恢复后提示条不再隐藏（第 5 条覆盖的路径之一） | `UI_NOTICE_SCOPE` |
| nc3 | “体检记录”行改回引用水滴（第 4 条） | `UI_BRAND_MARK` |

提交干净实现后依次运行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G7 --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G7 --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G7 --mode browser --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G7 --mode archive
```

`archive` 会把通过的浏览器运行截图复制进证据目录。逐张看图，回执里重点写 `paused`、`reconnecting`、`notice-*` 与清理记录。

## 预算与边界

- 一个私有 headless Chrome；原生窗口 0、选择框 0。
- 不读真实位置、不联网、不下载。
- 不 merge、不 rebase，不改主线台账。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W4-G7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g7/docs/dispatch/reports/WATER-W4-G7-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- 上面 7 条逐条怎么做的，确认 11 处文字没变；
- 每个检查命令与结果；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 逐张截图写看到了什么；
- 没做或没验证的事。

受阻则同一路径写“WATER-W4-G7 任务受阻”，写清具体冲突与最小补充需求，不要自行变通。
