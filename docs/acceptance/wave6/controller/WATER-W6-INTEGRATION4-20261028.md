# 第六波主线整合检查（第四次，2026-10-28）

总控（Claude）。第六波三张票全部合入后，在主线上把五个包的检查与测试全部重跑，再在真窗口里走一遍应用内清理。用户 10-28 晚同意开跑（“Start integration”）。上一次见[第三次整合检查](../../wave5/controller/WATER-W5-INTEGRATION3-20261028.md)。

| 项 | 值 |
|---|---|
| 受测提交 | 主线 `b62f9c5c`。比上次新增第六波 I1～I3（合入 `db3a73cd`、`3fc27f31`、`9841eb5e`）与第六波验收证据 |
| 整合树 | A：`.worktrees/integ-w6a`（分支 `controller/integ-w6a`），跑 D、界面、规则、服务；B：`.worktrees/integ-w6b`（分支 `controller/integ-w6b`），跑宿主。两棵都停在受测提交，全程干净 |
| 结论 | **通过**。五个包检查与测试全绿；真窗口夹具清理闭环一次通过，只删了合成夹具；新 release 版编好并冒烟通过 |

## 做法

沿用各包原来的检查入口，用覆盖清单把任务指到整合树（[controller/](integ4-20261028/controller/)，由 `make-manifests.mjs` 生成）。任务配置取各包最近一张票：

| 部分 | 检查入口 | 任务配置来源 | 树 | 跑了什么 |
|---|---|---|---|---|
| D（`packages/junk-clean`） | `checkup-wave-check.mjs` | 第五波 H1 | A | lock、check、test |
| 规则（`packages/junk-rules`） | `checkup-wave-check.mjs` | 第六波 I1 | A | lock、check、test、real --final |
| 服务（`packages/water-service`） | `desktop-wave-check.mjs` | 第五波 H2 | A | lock、check、test、real --final |
| 界面（`apps/water/ui`） | `checkup-wave-check.mjs` | 第六波 I3 | A | check、test、browser |
| 宿主（`apps/water/host`） | `desktop-wave-check.mjs` | 第六波 I2 | B | lock、check、test、native --final |

- 基点设为受测提交本身，没有改动；冻结文件沿用第六波清单。
- 服务与宿主的离线缓存互不包含，照旧分两棵树。树 A 与树 B 的编译同时进行，浏览器测试与整机检查等编译结束后单独运行。

## 结果

| 部分 | 结果 |
|---|---|
| D | lock、check（fmt、clippy `-D warnings`）通过；测试 6/6（134.2 秒，含 4000 层深树） |
| 规则 | lock、check 通过；测试 4/4（75 条规则）；真实冒烟只核对已知目录是否存在，不读文件内容 |
| 服务 | lock、check 通过；测试 6/6；真实只读体检完成，120 秒，4 个盘，7 类，识别 61.6 GB（上次 47.1 GB，多出的主要是第六波新规则认出的 Agent 工具目录），其中推荐 11.9 GB、受保护 20.7 GB；清理在这个模式下关闭（`clean_prepare` 为 `unavailable`），Edge 正在运行 |
| 界面 | 语法与界面政策通过；单元 3/3；浏览器 5/5（64 秒），截图 26 张 |
| 宿主 | lock、check（fmt、clippy，带 Tauri 镜像参数）通过；测试 5/5 |

## 真窗口：夹具清理闭环

宿主 `native --final`，用第六波 I2 的 9 步（与第五波 H3 相同）：数据目录里预先写好设置，七个分类全部关闭，只加一个整合树 `.local` 下的合成夹具文件夹；受保护的位置照服务规则只读统计、不可勾选。

| 项 | 值 |
|---|---|
| 窗口 | 1 个，选择框 0 |
| 步骤 | 9/9 通过：首页 → 开始体检 → 结果 → 清理所选 → 确认 → “永久删除 3 MB” → 清理完成 → 查看清理记录 → 清理记录页 |
| 用时 | 全程 28.6 秒；中途窗口被最小化 1 次，观察器不抢焦点地恢复后继续 |
| 退出 | 由检查器关窗，退出码 0 |
| 清理 | 记录 `completed`，释放 3,145,815 字节；该项 `deleted`，失败 0 |
| 核对 | 夹具里该删的已删，守卫文件与浏览器配置样本都在；存储五类记录各 1 份；日志有 intent 与 result |

“清理进行中关窗”已在第六波 I2 验收时用总控脚本在真窗口里试过（[收单验收](WATER-W6-REVIEW-20261028.md) I2 一节），这次没有重跑。

## 没有覆盖的

- 真实的系统关机、注销时的清理保护（宿主只用脚本后端与源码接线验证）；
- 默认数据目录（不设 `WATER_DATA_DIR`）没在真窗口里跑过；
- 真实数据上的应用内清理：留给自清理，由用户本人按清理；
- macOS。

## 证据

- 各部分的检查器回执与日志：[d](integ4-20261028/d/)、[rules](integ4-20261028/rules/)、[svc](integ4-20261028/svc/)、[ui](integ4-20261028/ui/)、[host](integ4-20261028/host/)（宿主目录里有整机检查的截图与步骤记录）。
- 覆盖清单、运行脚本与一行结果：[controller](integ4-20261028/controller/)。树 A 是共用的，每部分 `archive` 后先把证据移出树再归档下一部分，否则下一次归档会把上一部分的证据当成越界文件。

## release 版

- **位置**：`F:/new/smaltalk/water/.local/release/water-0.1.0-b62f9c5c/water.exe`，sha256 `3f4a19c4a2af55cca1f481c1744acda9fa7d2766f3201effc31235dc137fe332`，10,625,024 字节（本地构建，`.local` 不进仓库）。
- 这一版在上一版 `water-0.1.0-77f33746`（打开清理的 M2 版）之上加了第六波：Agent 工具新规则、关机与“查不到状态”时的清理保护、界面收尾。两个旧版留着不动。
- 做法：在整合树 B 用同一工具链、离线缓存与镜像参数编译 `--release --locked`，4 个并行任务，3 分 16 秒，没有警告，构建前后树都干净。
- 冒烟（夹具数据目录 `.local/release/smoke-20261028T114450Z`，[记录](integ4-20261028/controller/release-20261028T114450Z-second-instance.json)）：首页正常；第二个实例 39 毫秒退出、退出码 0，最小化的窗口 124 毫秒内回到前台；正常关窗退出码 0。两张截图按窗口矩形截的，左边 48 像素是桌面上别的窗口，提交前裁掉了（记录里写的宽度 1254 是裁前的）。
- 构建脚本与日志：[build-release.sh](integ4-20261028/controller/build-release.sh)、[release-build.txt](integ4-20261028/controller/release-build.txt)。

## 下一步

- 自清理（M2 计划第 3.2 节）等用户电脑空出来，可以直接用这一版。
- 第六波遗留合成一张“M3 收尾”票（见[收单验收](WATER-W6-REVIEW-20261028.md)“遗留”）。
- M3 后续：应用内“距上次体检 N 天”与“几天后满”的提示；第七波孤儿进程（只列不结束）。
