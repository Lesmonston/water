# 第九波主线整合检查（第六次，2026-11-02）

总控（Claude）。第九波四张单全部合入后，在主线上把七个部分的检查与测试全部重跑，在真窗口里走一遍应用内清理，再编 release 版。这是 M3 收口的第一步（[第九波计划](../../../dispatch/wave9/PLAN.md) 2.3 节；用户 11-02 约 16:20 JST：“开始收口”）。上一次见[第五次整合检查](../../wave8/controller/WATER-W8-INTEGRATION5-20261101.md)。

| 项 | 值 |
|---|---|
| 受测提交 | 主线 `bb92c87e`。比上次（`bcc0e984`）新增第九波 L1～L4（合入 `28736089`、`37fa96f1`、`b39bfcdf`、`bc433e6c`），其余提交只改文档与记录 |
| 整合树 | 沿用上次的两棵，切到新分支：A `.worktrees/integ-w8a`（分支 `controller/integ-w9a`），跑 D、进程、规则、扫描、服务、界面；B `.worktrees/integ-w8b`（分支 `controller/integ-w9b`），跑宿主与 release 构建。两棵都停在受测提交，全程干净 |
| 结论 | **通过**。七个部分检查与测试全绿，一次通过；四个真实只读冒烟都过；真窗口夹具清理闭环一次通过，只删了合成夹具；release 版编好并冒烟通过 |

## 做法

沿用各包原来的检查入口，用覆盖清单把任务指到整合树（[controller/](integ6-20261102/controller/)，由 `make-manifests.mjs` 生成）。任务配置取各包最近一张单：

| 部分 | 检查入口 | 任务配置来源 | 树 | 跑了什么 |
|---|---|---|---|---|
| D（`packages/junk-clean`） | `checkup-wave-check.mjs` | 第五波 H1 | A | lock、check、test |
| 进程（`packages/process-scan`） | `checkup-wave-check.mjs` | 第九波 L4 | A | lock、check、test、real --final |
| 规则（`packages/junk-rules`） | `checkup-wave-check.mjs` | 第九波 L1 | A | lock、check、test、real --final |
| 扫描（`packages/junk-scan`） | `checkup-wave-check.mjs` | 第九波 L2 | A | lock、check、test、real --final |
| 服务（`packages/water-service`） | `desktop-wave-check.mjs` | 第九波 L3 | A | lock、check、test、real --final |
| 界面（`apps/water/ui`） | `checkup-wave-check.mjs` | 第八波 K6 | A | check、test、browser |
| 宿主（`apps/water/host`） | `desktop-wave-check.mjs` | 第八波 K5 | B | lock、check、test、native --final |

- 基点设为受测提交本身，没有改动；冻结文件沿用第九波清单。
- **宿主第一次没跑起来**：第九波没有宿主单，清单顶层的冻结文件里没有镜像契约 `contracts/desktop-bootstrap-mirror-v1/MIRROR.json`，宿主检查器开头就拒收（“Mirror contract must be frozen”）。总控在生成脚本里从第八波清单补上这一项（检查器照样核对哈希），重跑通过。日志里前三行宿主失败就是这次，见 [integ.txt](integ6-20261102/controller/integ.txt) 第 6 行的说明。
- **顺序**（第九波验收时四棵树同时跑出过进程中止，这次分开跑）：
  1. 树 A 逐个部分顺序跑（[seq-a.sh](integ6-20261102/controller/seq-a.sh)），同时树 B 跑宿主 lock、check、test；
  2. 两棵都停后，服务单独跑（它带 50 ms 计时断言）；
  3. 整机检查最后单独跑。

## 结果

| 部分 | 结果 |
|---|---|
| D | lock、check（fmt、clippy `-D warnings`）通过；测试 6/6（144.5 秒，上次 461.8 秒，这次没有与宿主编译、别的项目抢机器） |
| 进程 | lock、check 通过；测试 4/4（11.7 秒）；真实只读冒烟：387 个进程，取到映像路径 365 个（拒绝访问 5 个、途中退出 19 个、取不到 4 个）；孤儿 0 |
| 规则 | lock、check 通过；测试 4/4；真实冒烟 78 条规则（上次 76，L1 加了两条兜底规则），基础目录存在 70 条、字面前缀存在 54 条，只核对目录是否存在，不读文件内容 |
| 扫描 | lock、check 通过；测试 5/5；真实只读冒烟遍历 182,087 项，19.5 秒，12 个组，状态 `partial`（`claude-code-scratchpad` 有 2 项拒绝访问），与第九波 L2 验收时一致；`claude-code-scratchpad`、`system-temp-old` 两组的去重体量仍小于累加体量 |
| 服务 | lock、check 通过；测试 6/6（36.9 秒，一次通过，没有计时类偶发）；真实只读体检见下 |
| 界面 | 语法与界面政策通过；单元 3/3；浏览器 5/5（104.9 秒，一次通过），截图 31 张 |
| 宿主 | lock、check（fmt、clippy，带 Tauri 镜像参数）通过；测试 5/5 |

扫描遍历的项数比上次（472,526 项）少很多，是因为 11-02 四个盘刚清理过（[清理记录](../../../maintenance/CLEANUP-20261101.md)），不是漏扫。

### 服务真实只读体检

25.9 秒（上次 90.3 秒），4 个盘，7 类，状态 `partial`（同上，个别项拒绝访问）。以下按 1024 进制：

| 项 | 本次 | 第五次（换算） |
|---|---|---|
| 识别 | 32.10 GB | 63.76 GB |
| 推荐 | 4.75 GB | 12.45 GB |
| 需确认 | 4.71 GB | 8.66 GB |
| 仅供参考 | 6.31 GB | 6.21 GB |
| 受保护 | 13.79 GB | 19.76 GB |
| 未识别 | 0 | 0 |

- 分类：Agent 工具 16.16 GB（24 组）、浏览器 10.44 GB（14 组）、应用残留 2.55 GB（8 组）、开发缓存 1.36 GB（13 组）、系统临时 1.03 GB（2 组）、GPU 与系统 0.31 GB（2 组）、崩溃日志 0.25 GB（7 组）。
- 识别量减半，主要因为 11-02 的四盘清理与 M2 自清理；仅供参考略增。
- 在用检测：Chrome 与 Edge 都在运行，结果里有 6 条“正在运行，将跳过 N 个占用的项”（Chrome 15、36、8 项，Edge 1、2、8 项）。
- 清理在这个模式下关闭（`clean_prepare` 为 `unavailable`）。

## 真窗口：夹具清理闭环

宿主 `native --final`，用第八波 K5 的 9 步：数据目录里预先写好设置，七个分类全部关闭，只加一个整合树 `.local` 下的合成夹具文件夹（6 个文件，时间改到 10-30）。开窗前告诉了用户。

| 项 | 值 |
|---|---|
| 窗口 | 1 个，选择框 0 |
| 步骤 | 9/9 通过：首页 → 开始体检 → 结果 → 清理所选 → 确认 → 永久删除 → 清理完成 → 查看清理记录 → 清理记录页 |
| 用时 | 窗口内 16.0 秒；截图前发现窗口被最小化 3 次（首页、结果、完成三张），观察器不抢焦点地恢复后继续 |
| 退出 | 由检查器关窗，退出码 0；WebView 子进程全部退出（检查器记录剩余 0；总控另查：没有 `water.exe`，`msedgewebview2` 是开窗前的 12 个，都属于别的应用） |
| 清理 | 记录 `completed`，释放 3,145,815 字节；该项 `deleted`，失败 0 |
| 核对 | 夹具里该删的 `projA/build-cache` 已删；源码文件 `projA/src/main.rs` 与两个浏览器配置样本（`Local State`、`Preferences`）都在、大小不变；存储五类记录各 1 份；日志有 intent 与 result |

## release 版

- **位置**：`F:/new/smaltalk/water/.local/release/water-0.1.0-bb92c87e/water.exe`，sha256 `ddc0644cdff7f74e32c715bd1c57c9fefedad7b38889f16ccde4fb90ece02f3c`，11,274,752 字节（本地构建，`.local` 不进仓库）。
- 这一版在上一版 `water-0.1.0-bcc0e984` 之上加了第九波：F1、F2 的修法（`node_modules` 看结构、浏览器配置看测试工具名，不符合的单独成组、仅供参考）、增长提示的基准与门槛、历史里的“已停止”、清理摘要的组数，以及在用检测认得 Git Bash 写法的路径。旧版都留着不动。
- 做法：在整合树 B 用同一工具链、离线缓存与镜像参数编译 `--release --locked`，4 个并行任务，3 分 36 秒，没有警告，构建前后树都干净（[build-release.sh](integ6-20261102/controller/build-release.sh)、[release-build.txt](integ6-20261102/controller/release-build.txt)）。
- 冒烟（夹具数据目录，[记录](integ6-20261102/controller/release-20261102T074226Z-second-instance.json)）一次通过：

  | 项 | 值 |
  |---|---|
  | 第二个实例 | 51 毫秒退出，退出码 0 |
  | 最小化的窗口回到前台 | 123 毫秒 |
  | 正常关窗 | 退出码 0 |

- 两张截图都用 `PrintWindow`，只有 Water 自己的窗口。**截图右侧少一截**：冒烟脚本不是 DPI 感知的，`GetWindowRect` 拿到缩放前的 1254×858，而窗口实际是 1568×1072（整机检查的截图就是这个尺寸），所以只画了左边约 80%。上次的截图也是这样。这是取证脚本的问题，不是界面问题，记为遗留。

## 遗留

1. 冒烟脚本 [w4-g6-second-instance.ps1](../../../../scripts/acceptance/w4-g6-second-instance.ps1) 截图尺寸按缩放前的窗口矩形取，截不全（见上）。以后动这个脚本时先设 DPI 感知（或用 `DwmGetWindowAttribute` 取实际边界）。
2. 第九波的清单只冻结了第九波碰到的文件。以后整合时，宿主的覆盖清单要从最近一份有宿主单的清单带上镜像契约（本次已写进 `make-manifests.mjs`）。

## 没有覆盖的

- 真实的系统关机、注销时的清理保护（宿主只用脚本后端与源码接线验证）；
- 默认数据目录（不设 `WATER_DATA_DIR`）没在真窗口里跑过（用户本人 11-01 用默认目录自清理过，见 [M3 收口报告](WATER-M3-CLOSE-20261102.md)“几天后满”一节）；
- 真实数据上的应用内清理：由用户本人按清理；
- macOS。

## 证据

- 各部分的检查器回执与日志：[d](integ6-20261102/d/)、[process](integ6-20261102/process/)、[rules](integ6-20261102/rules/)、[scan](integ6-20261102/scan/)、[svc](integ6-20261102/svc/)、[ui](integ6-20261102/ui/)、[host](integ6-20261102/host/)（宿主目录里有整机检查的 5 张截图与步骤记录）。
- 覆盖清单、运行脚本、一行结果与 release 冒烟：[controller](integ6-20261102/controller/)。树 A 是共用的，每部分 `archive` 后先把证据移出树再归档下一部分。
