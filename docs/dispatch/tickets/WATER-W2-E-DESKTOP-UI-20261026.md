# WATER-W2-E：桌面界面（白色磨砂玻璃）

2026-10-26，正式票，总控（Claude）。以 [第二波 manifest](../wave2/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**这是界面票，评判标准是与设计稿和预览图一致，建议交给前端与视觉能力强的模型。**

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-E-DESKTOP-UI-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w2-e / worker/water-w2-e |
| 精确首次 HEAD | 68cbab9f7c35fa7e5c55e3daab3151ecec5a22c6（标签 water-w2-ui-base-20261026），必须干净、`apps/water/ui` 不存在 |
| SPEC | F:/new/smaltalk/water/contracts/checkup-v1/UI.md |
| 设计 | F:/new/smaltalk/water/docs/design/water-ui-v1/DESIGN.md、tokens.css、mockup.html、previews/*.png |
| IPC 与回放数据 | F:/new/smaltalk/water/contracts/checkup-v1/IPC.md、ui-fixtures.json |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W2-CHECKUP-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w2-e/docs/dispatch/reports/WATER-W2-E-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w2-e/docs/acceptance/wave2/e/ |
| 门 | 轻门：一条负控 + 逐屏看图对照 |

先读规则、[ADR-018](../../decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)、UI SPEC、IPC、设计说明，并在浏览器里打开静态稿逐屏看一遍，再看 `previews/` 下八张预览图。

## 本票要点

- 交付 `apps/water/ui/` 下的完整前端：首页、扫描中、体检结果、分组详情抽屉、确认清理、清理中、清理完成、增长趋势、清理记录、扫描位置、关于与隐私。结构与约束见 SPEC 第 1、2 节。
- 视觉是白色磨砂玻璃第 2 版：近白底、白色玻璃、纯色强调蓝、超细大号数字、细线图标、级别用小圆点。**不准加渐变、光晕、emoji、英文装饰标题，也不准换成别的风格。** 静态稿里没有画的两页（清理记录、关于与隐私）按同一语言做。
- `styles/tokens.css` 直接复制 `docs/design/water-ui-v1/tokens.css`，逐字节相同；组件样式只引用变量。
- 只有 `ipc.mjs` 能碰 `window.__TAURI__`；界面不发送任何路径；体量用 BigInt。
- 假宿主只写在测试文件里，按 `ui-fixtures.json` 回放；产品代码里不得有任何模拟数据。
- 截图：每个页面与浮层 1240×820，结果页另加 1040×720，存进 `docs/acceptance/wave2/e/screenshots/<时间戳>/`。**你必须逐张看图**，与 `previews/` 对照，在回执里逐屏写“一致 / 差异与原因”。

## 白名单

- `apps/water/ui/` 下本票新建的全部文件
- `docs/dispatch/reports/WATER-W2-E-REPORT.md`
- `docs/acceptance/wave2/e/` 下的截图与 `--mode archive` 生成的证据

其余一律只读，包括设计稿、契约、检查入口、`scripts/`、台账与其它工作树。

## 唯一测试

`apps/water/ui/tests/unit.test.mjs` 精确：`ui_format_bytes_time`、`ui_selection_rules`、`ui_ipc_boundary`。
`apps/water/ui/tests/browser.test.mjs` 精确：`ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode baseline
```

开发中反复使用：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode check
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode test
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode browser
```

负控：只改 `model.mjs` 里“不可选组不能选中”的判断，运行下面命令，失败信息必须含 `UI_LEVEL_GUARD`；立即 `git checkout` 恢复原字节，再跑一次 `--mode test`。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode red-nc1
```

提交干净实现后依次运行 final 并归档：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode browser --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-E --mode archive
```

## 预算与边界

同一时间最多一个私有 headless Chrome；原生窗口 0；不联网、不下载字体或依赖、不读取任何真实用户位置。不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W2-E 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w2-e/docs/dispatch/reports/WATER-W2-E-REPORT.md
```

受阻则同一路径写“WATER-W2-E 任务受阻”，写清具体冲突与最小补充需求。完成只进入 SUBMITTED，由总控看图复核后才算 VERIFIED。
