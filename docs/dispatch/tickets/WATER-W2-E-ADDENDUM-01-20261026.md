# WATER-W2-E 补单 01：截图改由检查入口归档

2026-10-26，总控（Claude）。回应执行者的[受阻回执](../../../.worktrees/w2-e/docs/dispatch/reports/WATER-W2-E-REPORT.md)（提交 `e06d24a`）。**贴回原 E 对话续做，不新开执行者。**

## 冲突与裁定

执行者指出的冲突属实，是总控设计时漏掉的：UI SPEC 第 4 节要求浏览器测试把截图写进 `docs/acceptance/wave2/e/screenshots/`，而 `--final` 要求运行前后工作树都干净，新写的 PNG 必然让 final 失败。总控已在自测树复现：旧写法下 final 失败，树里多出未跟踪的 PNG。执行者在实现前停下交回，做法正确。

裁定：final 的干净要求不放宽，截图改走和回执相同的路，先写进被忽略的 `.local`，再由 `--mode archive` 按哈希复制进证据目录。

## 本补单只改两处，其余一律照原票与 UI SPEC

UI SPEC（`contracts/checkup-v1/UI.md`）保持冻结不动。本补单只替换 UI SPEC 第 4 节截图那一条和原票“截图”那一条里的**存放位置**，逐张看图、逐屏对照 `previews/` 并写差异的要求不变。

1. **截图写到哪里**：`tests/browser.test.mjs` 从环境变量 `WATER_W2_SHOTS_DIR` 取目录，所有截图平铺写进去（不建子目录）。这个目录由检查入口在每次 `--mode browser` 时新建，位于 `.local/checks/WATER-W2-E/<stamp>-browser-shots/`。变量缺失时（你直接用 node 跑测试）写到本树 `.local/ui-shots/<时间戳>/`。**测试不得向 `docs/` 写任何文件。**
2. **截图文件名**：小写字母、数字、`-`、`_`，扩展名 `.png`，内容是真实 PNG。以下 12 张必须有，缺一张检查入口就判失败：

| 文件名 | 内容 |
|---|---|
| `home-1240x820.png` | 体检首页 |
| `scan-1240x820.png` | 扫描中 |
| `results-1240x820.png` | 体检结果 |
| `results-1040x720.png` | 体检结果，小窗口 |
| `detail-1240x820.png` | 分组详情抽屉 |
| `confirm-1240x820.png` | 确认清理对话框 |
| `cleaning-1240x820.png` | 清理中 |
| `done-1240x820.png` | 清理完成 |
| `trends-1240x820.png` | 增长趋势 |
| `history-1240x820.png` | 清理记录 |
| `locations-1240x820.png` | 扫描位置 |
| `about-1240x820.png` | 关于与隐私 |

可以按同样命名规则多截（例如空态、无法连接），检查入口照收。

## 检查入口的变化（已改好、已自测）

`F:/new/smaltalk/water/scripts/checkup-wave-check.mjs` 现在的 SHA-256 为 `ad0ac67c9ed696715d037408d5b14f7a24bba2039b5fef04fc64a49bfeff2378`（你回执里记的旧值 `bf1065b7…` 已作废）。

- `--mode browser`：建好截图目录并通过 `WATER_W2_SHOTS_DIR` 传给测试；测试通过后核对目录里只有 PNG、名字合规、上表 12 张齐全，把每张的字节数与 SHA-256 写进本次回执。
- `--mode archive`：除原有回执外，把**通过的** browser 运行的截图复制到 `docs/acceptance/wave2/e/screenshots/<stamp>/`，逐张核对与回执里的哈希一致，并登记进 `ARCHIVE.json`。截图在 gate 之后被改动会被拒绝。
- `--final` 的干净要求、HEAD 不变、范围审计都不变。

总控自测（`.worktrees/w2-selftest-ui`）：旧写法 final 被拒且树变脏；新写法 final 通过、树干净；缺图被拒；archive 只归档通过的运行、复制件逐字节一致；截图在 gate 后被改动时 archive 被拒，恢复原字节后通过；Rust 票的 archive 不受影响。

## 续做基线

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w2-e`、同一分支 `worker/water-w2-e`，从你的受阻回执提交 `e06d24a94a4216d6ee53f4cae27cc0d19d9f773b` 接着做。
- **不要再跑 baseline**（baseline 只认原始基点，已经通过）；检查入口的范围审计只要求原基点是祖先。
- 续做时 `apps/water/ui/` 仍应不存在、工作树干净。
- 其余命令顺序、负控、final、archive、预算与边界都照原票。

## 交回

完成后把同一份回执改写为完成回执，第一行与原票一致。保留一小节“受阻与补单 01”，写明本次续做从哪个提交开始。回执里逐屏写“一致 / 差异与原因”时，引用的是归档后 `docs/acceptance/wave2/e/screenshots/<stamp>/` 里的图。

再受阻仍写“WATER-W2-E 任务受阻”，并写清具体冲突。
