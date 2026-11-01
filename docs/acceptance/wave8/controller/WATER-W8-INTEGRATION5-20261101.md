# 第八波主线整合检查（第五次，2026-11-01）

总控（Claude）。第八波六张单全部合入后，在主线上把七个部分的检查与测试全部重跑，再在真窗口里走一遍应用内清理。这是 M3 收口的第一步（用户 11-01 约 21:30 JST：“现在开始”）。上一次见[第四次整合检查](../../wave6/controller/WATER-W6-INTEGRATION4-20261028.md)。

| 项 | 值 |
|---|---|
| 受测提交 | 主线 `bcc0e984`。比上次（`b62f9c5c`）新增第七波 J1～J4（合入 `1019b4e3`、`0d4333c2`、`9d0e9833`、`b299b879`）与第八波 K1～K6（合入 `e8976a52`、`3b79242e`、`2d2f54d7`、`311f3a9b`、`0bb1cf80`、`2a946b30`、`1b79d861`） |
| 整合树 | A：`.worktrees/integ-w8a`（分支 `controller/integ-w8a`），跑 D、进程、规则、扫描、服务、界面；B：`.worktrees/integ-w8b`（分支 `controller/integ-w8b`），跑宿主与 release 构建。两棵都停在受测提交，全程干净 |
| 结论 | **通过**。七个部分检查与测试全绿（界面浏览器测试第一次有 1 项因点击时机失败，原样重跑通过，见“遗留”）；四个真实只读冒烟都过；真窗口夹具清理闭环一次通过，只删了合成夹具；release 版编好并冒烟通过（冒烟脚本的截图方式顺带修了，见“release 版”） |

## 做法

沿用各包原来的检查入口，用覆盖清单把任务指到整合树（[controller/](integ5-20261101/controller/)，由 `make-manifests.mjs` 生成）。任务配置取各包最近一张单：

| 部分 | 检查入口 | 任务配置来源 | 树 | 跑了什么 |
|---|---|---|---|---|
| D（`packages/junk-clean`） | `checkup-wave-check.mjs` | 第五波 H1 | A | lock、check、test |
| 进程（`packages/junk-process`） | `checkup-wave-check.mjs` | 第八波 K1 | A | lock、check、test、real --final |
| 规则（`packages/junk-rules`） | `checkup-wave-check.mjs` | 第八波 K2 | A | lock、check、test、real --final |
| 扫描（`packages/junk-scan`） | `checkup-wave-check.mjs` | 第八波 K3 | A | lock、check、test、real --final |
| 服务（`packages/water-service`） | `desktop-wave-check.mjs` | 第八波 K4 | A | lock、check、test、real --final |
| 界面（`apps/water/ui`） | `checkup-wave-check.mjs` | 第八波 K6 | A | check、test、browser |
| 宿主（`apps/water/host`） | `desktop-wave-check.mjs` | 第八波 K5 | B | lock、check、test、native --final |

- 基点设为受测提交本身，没有改动；冻结文件沿用第八波清单。
- 树 A 的 D、进程、规则、扫描与树 B 的宿主 lock、check、test 同时跑；界面接着跑；服务带 50 ms 计时断言，等两棵树都停了再单独跑；整机检查最后单独跑。
- 本机同时有别的项目（`denglou` 的 jest）在跑，D 的测试因此比上次慢（见下表）。

## 结果

| 部分 | 结果 |
|---|---|
| D | lock、check（fmt、clippy `-D warnings`）通过；测试 6/6（461.8 秒，上次 134.2 秒，含 4000 层深树；慢在与宿主编译、别的项目并行） |
| 进程 | lock、check 通过；测试 4/4（20.8 秒）；真实只读冒烟：441 个进程，取到映像路径 437 个（3 个取不到、1 个途中退出）；孤儿 0 |
| 规则 | lock、check 通过；测试 4/4；真实冒烟 76 条规则（上次 75），基础目录存在 70 条、字面前缀存在 60 条，只核对目录是否存在，不读文件内容 |
| 扫描 | lock、check 通过；测试 5/5；真实只读冒烟遍历 472,526 项，134.8 秒，12 个组；`claude-code-scratchpad`、`system-temp-old` 两组的去重体量小于累加体量（硬链接只算一次） |
| 服务 | lock、check 通过；测试 6/6（61.4 秒，一次通过，没有计时类偶发）；真实只读体检见下 |
| 界面 | 语法与界面政策通过；单元 3/3；浏览器第一次 4/5，重跑 5/5（143.5 秒），截图 31 张 |
| 宿主 | lock、check（fmt、clippy，带 Tauri 镜像参数）通过；测试 5/5 |

### 服务真实只读体检

90.3 秒，4 个盘，7 类：

| 项 | 本次 | 第四次 |
|---|---|---|
| 识别 | 68.5 GB | 61.6 GB |
| 推荐 | 13.4 GB | 11.9 GB |
| 需确认 | 9.3 GB | — |
| 仅供参考 | 6.7 GB | — |
| 受保护 | 21.2 GB | 20.7 GB |
| 未识别 | 0 | — |

- 分类：Agent 工具 34.8 GB（24 组）、浏览器 11.2 GB（14 组）、应用残留 11.0 GB（8 组）、开发缓存 8.5 GB（13 组）、系统临时 1.4 GB（2 组）、崩溃日志 0.9 GB（7 组）、GPU 与系统 0.7 GB（2 组）。
- 与第八波 K4 第三、四轮的真实体检一致（识别约 68 GB；推荐 13.4～17 GB，随 cargo 构建产物变化）。
- 在用检测：Chrome 与 Edge 都在运行，结果里有 6 条“正在运行，将跳过 N 个占用的项”的标签（Chrome 15、35、7 项，Edge 1、2、8 项）。
- 清理在这个模式下关闭（`clean_prepare` 为 `unavailable`）。

## 真窗口：夹具清理闭环

宿主 `native --final`，用第八波 K5 的 9 步：数据目录里预先写好设置，七个分类全部关闭，只加一个整合树 `.local` 下的合成夹具文件夹（6 个文件，时间改到 10-29）；受保护的位置照服务规则只读统计、不可勾选。开窗前告诉了用户。

| 项 | 值 |
|---|---|
| 窗口 | 1 个，选择框 0 |
| 步骤 | 9/9 通过：首页 → 开始体检 → 结果 → 清理所选 → 确认 → 永久删除 → 清理完成 → 查看清理记录 → 清理记录页 |
| 用时 | 窗口内 15.6 秒；截图前发现窗口被最小化 2 次（结果、确认两张），观察器不抢焦点地恢复后继续 |
| 退出 | 由检查器关窗，退出码 0；WebView 子进程全部退出（检查器记录剩余 0；总控另查：没有 `water.exe`，`msedgewebview2` 回到开窗前的 12 个，都属于别的应用） |
| 清理 | 记录 `completed`，释放 3,145,815 字节；该项 `deleted`，失败 0 |
| 核对 | 夹具里该删的 `projA/build-cache` 已删；源码文件 `projA/src/main.rs` 与两个浏览器配置样本（`Local State`、`Preferences`）都在、大小不变；存储五类记录各 1 份；日志有 intent 与 result |

## 遗留

1. **界面浏览器测试点击时机**：第一次运行 `ui_clean_done_and_pages` 失败在 `UI_M3C_EXCLUDE: only manual exclusions retain currently skipped IDs`（手工取消那一轮，期望 `excludeItemIds` 为 `['i-000202']`，实际为空）。原样重跑 5/5 通过；K6 第六轮验收时也是绿的。测试的点击是“滚到视野中央后按坐标发鼠标事件”，当时本机在编译宿主、别的项目也在跑测试，抽屉打开时坐标还在变，手工取消那一下没点中。属于测试稳定性，不是界面行为。以后动界面测试时，点击前先等抽屉稳定（例如等目标元素的矩形连续两次不变）。两次运行的回执都在 [ui/receipts](integ5-20261101/ui/receipts/)。
2. 交接第 12 份第 4.4 节列的整合核对项，本次覆盖情况：
   - 写盘类调用超出 50 ms 预算：服务测试这次一次通过，没有出现；
   - marker 规则在真实数据上的一次遍历（K3 遗留 6）：扫描真实冒烟通过，472,526 项一次遍历完成；
   - 中途停止的扫描、非系统盘根的整盘扫描：留给 10-29 场景复现（M3 收口报告）。

## 没有覆盖的

- 真实的系统关机、注销时的清理保护（宿主只用脚本后端与源码接线验证）；
- 默认数据目录（不设 `WATER_DATA_DIR`）没在真窗口里跑过；
- 真实数据上的应用内清理：留给自清理，由用户本人按清理；
- macOS。

## 证据

- 各部分的检查器回执与日志：[d](integ5-20261101/d/)、[process](integ5-20261101/process/)、[rules](integ5-20261101/rules/)、[scan](integ5-20261101/scan/)、[svc](integ5-20261101/svc/)、[ui](integ5-20261101/ui/)、[host](integ5-20261101/host/)（宿主目录里有整机检查的 5 张截图与步骤记录）。
- 覆盖清单、运行脚本与一行结果：[controller](integ5-20261101/controller/)。树 A 是共用的，每部分 `archive` 后先把证据移出树再归档下一部分。

## release 版

- **位置**：`F:/new/smaltalk/water/.local/release/water-0.1.0-bcc0e984/water.exe`，sha256 `712b1291edf8c910354fbd09ccdeccce1e10395b585053cf884e358d3e173f3d`，11,162,112 字节（本地构建，`.local` 不进仓库）。
- 这一版在上一版 `water-0.1.0-b62f9c5c` 之上加了第七波 M3 收尾小修与第八波 M3 收口：在用检测与“正在运行，将跳过”的标签、硬链接去重、按盘分组、组内排除、以后都跳过、Git 工作树识别、孤儿进程只列、体检提醒与“几天后满”。旧版 `water-0.1.0-b62f9c5c`、`77f33746` 留着不动。
- 做法：在整合树 B 用同一工具链、离线缓存与镜像参数编译 `--release --locked`，4 个并行任务，4 分 39 秒，没有警告，构建前后树都干净。
- 冒烟（夹具数据目录，[记录一](integ5-20261101/controller/release-20261101T131251Z-second-instance.json)、[记录二](integ5-20261101/controller/release-20261101T131425Z-second-instance.json)）跑了两次，两次都通过：

  | 项 | 第一次 | 第二次 |
  |---|---|---|
  | 第二个实例 | 55 毫秒退出，退出码 0 | 100 毫秒退出，退出码 0 |
  | 最小化的窗口回到前台 | 391 毫秒 | 420 毫秒 |
  | 正常关窗 | 退出码 0 | 退出码 0 |

- **第一次冒烟的截图截到了别的应用**：冒烟脚本 [w4-g6-second-instance.ps1](../../../../scripts/acceptance/w4-g6-second-instance.ps1) 原来按窗口矩形复制屏幕。第一张截图（`first`）时 Water 窗口被用户正在用的浏览器挡住，截下来的是那个浏览器页面，里面有个人内容。总控当场删掉这张图（没有进仓库，记录一里的 `firstShot` 文件名因此没有对应文件），`after` 一张左边 15 像素是后面的窗口，裁掉了（记录里写的宽度 1254 是裁前的）。随后把脚本改成 `PrintWindow`，只画 Water 自己的窗口，与整机检查的观察器一样；用改后的脚本跑了第二次，两张截图都只有 Water。整机检查的观察器本来就用 `PrintWindow`（只取 Water 窗口自身），5 张截图不会截到别的窗口；抽看了最小化后恢复过的 `confirm` 一张，确是 Water。
- 构建脚本与日志：[build-release.sh](integ5-20261101/controller/build-release.sh)、[release-build.txt](integ5-20261101/controller/release-build.txt)。

## 下一步

- 复现 10-29 场景（第 12 份交接第 4.3 节），结果写进 M3 收口报告。
- 自清理：用户本人在这一版里清这一波新攒的开发垃圾，补上 M2。
- M3 收口报告。
