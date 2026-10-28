# 第五波主线整合检查（第三次，2026-10-28）

总控（Claude）。第五波五张票全部合入后，在主线上把五个包的检查与测试全部重跑，再在真窗口里走一遍应用内清理。用户 10-28 同意开跑（“Start it”，问题里写明会开窗口）。上一次见[第二次整合检查](../../wave4/controller/WATER-W4-INTEGRATION2-20261027.md)。

| 项 | 值 |
|---|---|
| 受测提交 | 主线 `77f33746`。比上次新增第五波 H1～H5（合入 `b3168cb7`、`f58eeb2c`、`a9f97325`、`de472412`、`38d240d0`） |
| 整合树 | A：`.worktrees/integ-w5a`（分支 `controller/integ-w5a`），跑 D、界面、规则、服务；B：`.worktrees/integ-w5b`（分支 `controller/integ-w5b`），跑宿主。两棵都停在受测提交，全程干净 |
| 结论 | **通过**。五个包检查与测试全绿；真窗口夹具清理闭环一次通过，只删了合成夹具 |

## 做法

沿用各包原来的检查入口，用覆盖清单把任务指到整合树（[controller/](integ3-20261028/controller/)，由 `make-manifests.mjs` 从第五波清单生成）。任务配置都取第五波的票：

| 部分 | 检查入口 | 任务配置来源 | 树 | 跑了什么 |
|---|---|---|---|---|
| D（`packages/junk-clean`） | `checkup-wave-check.mjs` | H1 | A | lock、check、test |
| 规则（`packages/junk-rules`） | `checkup-wave-check.mjs` | H5 | A | lock、check、test、real --final |
| 服务（`packages/water-service`） | `desktop-wave-check.mjs` | H2 | A | lock、check、test、real --final |
| 界面（`apps/water/ui`） | `checkup-wave-check.mjs` | H4 | A | check、test、browser |
| 宿主（`apps/water/host`） | `desktop-wave-check.mjs` | H3 | B | lock、check、test、native --final |

- 基点设为受测提交本身，没有改动；冻结文件沿用第五波清单。
- 服务与宿主的离线缓存互不包含（第 8 份交接第 7 节），这次直接分两棵树，不再改名换目录。
- 树 A 与树 B 的编译同时进行；浏览器测试与整机检查都等编译结束后单独运行。

## 结果

| 部分 | 结果 |
|---|---|
| D | lock、check（fmt、clippy `-D warnings`）通过；测试 6/6（140.7 秒，含 4000 层深树） |
| 规则 | lock、check 通过；测试 4/4；真实冒烟只核对已知目录是否存在，不读文件内容 |
| 服务 | lock、check 通过；测试 6/6；真实只读体检完成，62 秒，4 个盘，7 类，识别 47.1 GB；清理在这个模式下关闭（`clean_prepare` 为 `unavailable`），Chrome、Edge 正在运行 |
| 界面 | 语法与界面政策通过；单元 3/3；浏览器 5/5，截图 25 张 |
| 宿主 | lock、check（fmt、clippy，带 Tauri 镜像参数）通过；测试 5/5 |

主线上的 `native_windows.rs` 与 H1 补单验收时的字节相同（sha256 `7ca9d9b5…`）。

## 真窗口：夹具清理闭环

宿主 `native --final`，用 H3 的 9 步：数据目录里预先写好设置，七个分类全部关闭，只加一个整合树 `.local` 下的合成夹具文件夹；受保护的位置照服务规则只读统计、不可勾选。

| 项 | 值 |
|---|---|
| 窗口 | 1 个，选择框 0 |
| 步骤 | 9/9 通过：首页 → 开始体检 → 结果 → 清理所选 → 确认 → “永久删除 3 MB” → 清理完成 → 查看清理记录 → 清理记录页 |
| 用时 | 全程 10.5 秒 |
| 退出 | 由检查器关窗，退出码 0；被最小化后恢复 0 次 |
| 清理 | 记录 `completed`，释放 3,145,815 字节；该项 `deleted`，失败 0 |
| 核对 | 夹具里该删的已删，守卫文件与浏览器配置样本都在；存储五类记录各 1 份；日志有 intent 与 result |

## 没有覆盖的

- 真窗口里“清理进行中关窗”还没试过（宿主只用脚本后端验证）；默认数据目录（不设 `WATER_DATA_DIR`）也没在真窗口里跑过。
- 系统关机时的清理保护（H3 审查记下，留到以后）。
- 真实数据上的应用内清理：留给 M2 计划第 3 节的自清理，由用户本人按清理。
- macOS。

## 证据

- 各部分的检查器回执与日志：[d](integ3-20261028/d/)、[rules](integ3-20261028/rules/)、[svc](integ3-20261028/svc/)、[ui](integ3-20261028/ui/)、[host](integ3-20261028/host/)（宿主目录里有整机检查的截图与步骤记录）。
- 覆盖清单、运行脚本与一行结果：[controller](integ3-20261028/controller/)。

## 下一步

新的 release 版（打开了清理）→ 自清理（M2 计划第 3.2 节：用户添加 `.worktrees`、体检，总控核对后给勾选建议，用户按清理，总控核对）→ M2 达成报告。
