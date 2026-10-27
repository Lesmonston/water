# 第四波 G4 收单验收（2026-10-27）

总控（Claude）。G4 由 Opus 5.5 执行（用户 10-27 15:36 派出；回执自报 Claude Opus 5.5），回执写“任务已完成”，用户同日转来。

| 项 | 值 |
|---|---|
| 票 | [WATER-W4-G4 冰山标志与“体检”导航图标](../../../dispatch/tickets/WATER-W4-G4-BRAND-20261027.md) |
| 基点 | `e5b90db1` |
| 实现提交 | `096275c6` |
| 交回 HEAD | `8bd5e568`（之后只有回执与证据；没有改写历史） |
| 结论 | **VERIFIED**，以 `--no-ff` 合入 `bc93d567` |

## 收单审计

`w2-receipt-audit.mjs` 无问题（[audit-g4.json](accept-20261027/controller/audit-g4.json)）：
- 改动只在白名单：`apps/water/ui/` 的 7 个文件与 `apps/water/host/icons/icon.ico`，加回执与证据；
- check、test、browser 三个 final 都在实现提交上；nc1～nc3 红绿成对；
- 归档 407 个文件一致，final 浏览器运行截图 23 张（含必需的 17 张）。

回执如实写了第一次 `browser --final` 失败：私有 Chrome 在第 3 个测试中途失去响应，之后每个 CDP 调用都超时，不是断言失败。当时 G1 补单 02 在同机编译。同一字节、干净树上重跑一次通过。失败回执也已归档。

## 新树重跑

验收树 `.worktrees/accept-w4-g4`，停在 `8bd5e568`。`check --final`、`browser --final`、`test --final` 都通过。

## 总控负控

位置都与执行者不同：执行者的 nc1 改的是侧栏颜色，nc2 换了导航图标名，nc3 改的是重连时不清错误。

| 编号 | 变异 | 结果 |
|---|---|---|
| nc1 | 关于页冰山改成 40×40 | 抓到，`UI_BRAND_MARK` |
| nc2 | 脉搏线 symbol 的几何与设计说明不一致（末段 `h4.1` 改 `h4`） | 抓到，`UI_NAV_PULSE` |
| nc3 | 任务进行中切页不清旧错误，重连恢复后提示条不隐藏 | 抓到，`UI_NOTICE_SCOPE`，是新的带标记断言，输出没有超时 |
| x1 | 空状态改回引用已删除的水滴 | 抓到，`UI_BRAND_MARK` |
| x2 | 清理记录“体检记录”行改回引用水滴 | **存活**：不引用水滴的检查只看空的记录页，不看有记录的列表 |

每条变异后恢复原字节（核对哈希）并立即转绿。

## 截图

总控逐张看了首页、关于页、增长趋势空状态、清理记录：
- 侧栏、关于页品牌卡、空状态都是墨色冰山，两道切面镂空可见；
- “体检”导航是脉搏线，选中时蓝色、未选中时与其它项同为灰色；
- 清理记录的“体检记录”行也是脉搏线；
- 与设计说明的[预览](../../../design/water-ui-v1/brand/preview-home-pulse-1240x820.png)一致。

## 应用图标与宿主编译

- `apps/water/host/icons/icon.ico` 与 `brand/water-app-icon.ico` 逐字节相同（sha256 `a90894b1…`，提交里的 blob、检出文件、设计导出件三处一致）。
- 用桌面检查器在验收树里对宿主跑 `lock` 与 `check --final`。用的是验收覆盖清单 [host-manifest-g4.json](accept-20261027/controller/host-manifest-g4.json)，任务配置取自 F3，只允许 lock 与 check。
- `cargo fmt --check` 与带 `-D warnings` 的 clippy 都通过，用时 6.5 分钟，证据在 [g4host](accept-20261027/g4host/)。clippy 会运行 `tauri-build` 与生成上下文的宏，这两步都要读 `icon.ico`。
- 没有开窗口，也没有看新图标在任务栏里的实际效果，留到主线整合检查。

## 独立审查

只读审查代理只看代码、票与设计说明第 10 节、UI-POLISH 第 1 节。结论：
- 5 条都做到：两个 symbol 与设计说明逐字节相同；三处尺寸与墨色正确；导航只换了图标名；水滴不再被引用；图标逐字节相同；第 448 行改为最多约 5 秒的有限轮询加带标记的断言，轮询本身不抛错。
- 生产代码只有 8 处小改动加图标；11 处文字的出现次数不变；`index.html` 没有内联样式、脚本、事件或网址。
- 侧栏冰山高度从 34 改 30 不影响对齐（品牌行按居中排列，文字块约 49px 高）。

执行者超出票面列举的一处：`views/history.mjs` 的“体检记录”行原来用水滴，改成了脉搏线。总控认可：脉搏线现在就代表“体检”，冰山只用于三处品牌位置。

## 记录、不返工（清单 `carryOverLater`）

1. 新断言只检查 `index.html` 源文件里含有 symbol 原文，不检查渲染后的 sprite 里确实有这个 symbol；把它注释掉，图标会变空白但断言仍通过。
2. 不引用水滴的检查没覆盖有记录的清理记录列表（总控 x2 存活）。
3. 浏览器测试第 189、245 行仍是“等重连提示消失”的等待，没有标记；回归时只会超时。与原第 448 行同类。
4. 同机并行编译时私有 Chrome 曾失去响应一次，见上。

## 证据

- 执行者证据：[accept-20261027/g4](accept-20261027/g4/)，390 个文件，与验收树逐字节一致；
- 宿主编译：[g4host](accept-20261027/g4host/)；
- 总控工具与日志：[controller](accept-20261027/controller/) 的 `g4-*`、`audit-g4.json`、`accept-manifest-g4.json`、`host-manifest-g4.json`。
